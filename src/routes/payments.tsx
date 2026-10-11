import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Payment = {
  id: string;
  amount: number;
  created_at: string;
  currency: string;
  customer_name: string | null;
  phone: string | null;
  receipt_image: string | null;
  reviewed_at: string | null;
  status: string;
  tracking_code: string;
  updated_at: string;
  user_id: string | null;
  wallet: string;
};

type PaymentDraft = {
  amount: string;
  currency: string;
  customer_name: string;
  phone: string;
  receipt_image: string;
  tracking_code: string;
  wallet: string;
};

type AuditEntry = {
  id: string;
  payment_id: string;
  action: "updated" | "archived" | "restored";
  actor_id: string | null;
  actor_label: string;
  occurred_at: string;
  changed_fields: Record<string, { before: unknown; after: unknown }> | null;
  details: Record<string, unknown> | null;
};

type PaymentFilter = "pending" | "approved" | "rejected" | "all";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { name: "description", content: "مراجعة وتعديل وأرشفة طلبات الدفع." },
      { property: "og:title", content: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (value: number) => Math.round(Number(value || 0)).toLocaleString("en-US");
const PENDING_STATUSES = ["pending", "بانتظار التأكيد"];
const STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: "بانتظار المراجعة", classes: "bg-amber-100 text-amber-800" },
  "بانتظار التأكيد": { label: "بانتظار التأكيد", classes: "bg-amber-100 text-amber-800" },
  approved: { label: "معتمد ✓", classes: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "مرفوض", classes: "bg-red-100 text-red-700" },
};
const AUDIT_ACTION: Record<AuditEntry["action"], string> = {
  updated: "تعديل بيانات",
  archived: "أرشفة",
  restored: "استعادة من الأرشيف",
};
const FIELD_LABELS: Record<string, string> = {
  amount: "المبلغ", currency: "العملة", customer_name: "اسم العميل", phone: "الهاتف",
  receipt_image: "رابط السند", tracking_code: "رمز الطلب", wallet: "وسيلة الدفع",
  status: "الحالة", reviewed_at: "وقت المراجعة", updated_at: "وقت تحديث السجل",
  user_id: "معرف العميل", archived_at: "وقت الأرشفة", archived_by: "من أرشف",
};

const toDraft = (p: Payment): PaymentDraft => ({
  amount: String(p.amount ?? ""),
  currency: p.currency ?? "ر.ي",
  customer_name: p.customer_name ?? "",
  phone: p.phone ?? "",
  receipt_image: p.receipt_image ?? "",
  tracking_code: p.tracking_code ?? "",
  wallet: p.wallet ?? "",
});

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [auditFor, setAuditFor] = useState<Payment | null>(null);
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`تعذر التحقق من جلسة الدخول: ${authError.message}`);
      if (!authData.user) throw new Error("سجّل الدخول بحساب الإدارة ثم أعد تحميل الصفحة.");
      const [adminRole, staffRole] = await Promise.all([
        supabase.rpc("has_role", { _user_id: authData.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: authData.user.id, _role: "staff" }),
      ]);
      if (adminRole.error || staffRole.error) throw new Error(`تعذر فحص دور الحساب: ${(adminRole.error ?? staffRole.error)?.message ?? "خطأ غير معروف"}`);
      if (!adminRole.data && !staffRole.data) throw new Error("الحساب لا يحمل دور admin أو staff.");

      const [paymentsResult, archivesResult] = await Promise.all([
        supabase.from("payments").select("id,amount,created_at,currency,customer_name,phone,receipt_image,reviewed_at,status,tracking_code,updated_at,user_id,wallet").order("created_at", { ascending: false }),
        (supabase as any).from("payment_archives").select("payment_id"),
      ]);
      if (paymentsResult.error) throw new Error(`تعذر تحميل طلبات الدفع: ${paymentsResult.error.message} (${paymentsResult.error.code ?? "بدون رمز"})`);
      if (archivesResult.error) throw new Error(`تعذر تحميل الأرشيف. نفّذ SQL المرفق وتحقق من RLS: ${archivesResult.error.message}`);
      setRows((paymentsResult.data ?? []) as Payment[]);
      setArchivedIds(new Set((archivesResult.data ?? []).map((r: { payment_id: string }) => r.payment_id)));
    } catch (cause) {
      console.error("تعذر تحميل طلبات الدفع:", cause);
      setErr(cause instanceof Error ? cause.message : "تعذر تحميل طلبات الدفع.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const paymentsChannel = supabase.channel("payments_live_admin").on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void load()).subscribe();
    const archivesChannel = supabase.channel("payment_archives_live_admin").on("postgres_changes", { event: "*", schema: "public", table: "payment_archives" }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(paymentsChannel); void supabase.removeChannel(archivesChannel); };
  }, [load]);

  const openAudit = async (payment: Payment) => {
    setAuditFor(payment); setAuditRows([]); setAuditError(""); setAuditLoading(true);
    const { data, error } = await (supabase as any).from("payment_audit_log")
      .select("id,payment_id,action,actor_id,actor_label,occurred_at,changed_fields,details")
      .eq("payment_id", payment.id).order("occurred_at", { ascending: false }).limit(200);
    if (error) setAuditError(`تعذر تحميل سجل التدقيق: ${error.message}`);
    else setAuditRows((data ?? []) as AuditEntry[]);
    setAuditLoading(false);
  };

  const approve = async (payment: Payment) => {
    setErr(""); setNotice("");
    const amount = Number(payment.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) { setErr(`لا يمكن اعتماد الطلب ${payment.tracking_code}: المبلغ يجب أن يكون عددًا صحيحًا أكبر من صفر.`); return; }
    if (!window.confirm(`اعتماد مبلغ ${fmt(amount)} ${payment.currency || "ر.ي"} للطلب ${payment.tracking_code}؟`)) return;
    setBusy(payment.id);
    try {
      const { data, error } = await supabase.from("payments").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", payment.id).in("status", PENDING_STATUSES).select("id").maybeSingle();
      if (error) throw new Error(`تعذر اعتماد الدفعة: ${error.message}`);
      if (!data) throw new Error("لم يتغير الطلب. ربما تمت مراجعته مسبقًا؛ أعد تحميل البيانات.");
      let warning = "";
      if (payment.user_id) {
        const { error: noticeError } = await supabase.from("notifications").insert({ user_id: payment.user_id, title: `تم اعتماد دفعتك للطلب ${payment.tracking_code}`, body: `تم اعتماد مبلغ ${fmt(amount)} ${payment.currency || "ر.ي"}.` });
        if (noticeError) warning = " تم الاعتماد لكن تعذر إنشاء إشعار العميل.";
      }
      setNotice(`تم اعتماد مبلغ ${fmt(amount)} للطلب ${payment.tracking_code}.${warning}`); await load();
    } catch (cause) { setErr(cause instanceof Error ? cause.message : "تعذر اعتماد الدفعة."); }
    finally { setBusy(null); }
  };

  const reject = async (payment: Payment) => {
    if (!window.confirm(`هل تريد رفض سند الدفع للطلب ${payment.tracking_code}؟`)) return;
    setErr(""); setNotice(""); setBusy(payment.id);
    try {
      const { data, error } = await supabase.from("payments").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", payment.id).in("status", PENDING_STATUSES).select("id").maybeSingle();
      if (error) throw new Error(`تعذر رفض الدفعة: ${error.message}`);
      if (!data) throw new Error("لم يتغير الطلب. ربما تمت مراجعته مسبقًا؛ أعد تحميل البيانات.");
      let warning = "";
      if (payment.user_id) {
        const { error: noticeError } = await supabase.from("notifications").insert({ user_id: payment.user_id, title: `لم يتم قبول سند الدفع للطلب ${payment.tracking_code}`, body: "يرجى مراجعة السند أو التواصل مع خدمة العملاء." });
        if (noticeError) warning = " تعذر إنشاء إشعار العميل.";
      }
      setNotice(`تم رفض سند الطلب ${payment.tracking_code}.${warning}`); await load();
    } catch (cause) { setErr(cause instanceof Error ? cause.message : "تعذر رفض الدفعة."); }
    finally { setBusy(null); }
  };

  const saveEdit = async () => {
    if (!editing || !draft) return;
    setErr(""); setNotice("");
    const amount = Number(draft.amount);
    if (!Number.isSafeInteger(amount) || amount < 0) { setErr("المبلغ يجب أن يكون عددًا صحيحًا موجبًا أو صفرًا."); return; }
    if (!draft.tracking_code.trim() || !draft.wallet.trim() || !draft.currency.trim()) { setErr("أكمل رمز الطلب ووسيلة الدفع والعملة."); return; }
    const approved = editing.status === "approved";
    if (approved && (amount !== Number(editing.amount) || draft.currency !== editing.currency || draft.wallet !== editing.wallet || draft.tracking_code !== editing.tracking_code)) {
      setErr("للحفاظ على تطابق القيود المالية، لا يمكن تغيير المبلغ أو العملة أو وسيلة الدفع أو رمز الطلب لدفعة معتمدة. يمكن تعديل اسم العميل والهاتف ورابط السند."); return;
    }
    if (!window.confirm("حفظ التعديلات؟ لن تتغير حالة الدفعة، وسيُسجل التعديل في سجل التدقيق.")) return;
    setBusy(editing.id);
    try {
      const update: Record<string, unknown> = { customer_name: draft.customer_name.trim() || null, phone: draft.phone.trim() || null, receipt_image: draft.receipt_image.trim() || null, updated_at: new Date().toISOString() };
      if (!approved) { update.amount = amount; update.currency = draft.currency.trim(); update.wallet = draft.wallet.trim(); update.tracking_code = draft.tracking_code.trim(); }
      const { data, error } = await (supabase.from("payments") as any).update(update).eq("id", editing.id).select("id").maybeSingle();
      if (error) throw new Error(`تعذر حفظ التعديلات: ${error.message}`);
      if (!data) throw new Error("لم يُحفظ التعديل؛ تحقق من صلاحيات التحديث وسياسات RLS.");
      setNotice("تم حفظ البيانات وتسجيل المنفذ والوقت في سجل التدقيق."); setEditing(null); setDraft(null); await load();
    } catch (cause) { setErr(cause instanceof Error ? cause.message : "تعذر حفظ التعديلات."); }
    finally { setBusy(null); }
  };

  const archive = async (payment: Payment) => {
    if (!window.confirm(`أرشفة الطلب ${payment.tracking_code}؟ سيبقى سجله المالي محفوظًا وسيُسجل المنفذ والوقت.`)) return;
    setErr(""); setNotice(""); setBusy(payment.id);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("تعذر تحديد حساب المستخدم الحالي.");
      const { error } = await (supabase as any).from("payment_archives").insert({ payment_id: payment.id, archived_by: authData.user.id });
      if (error && error.code !== "23505") throw new Error(`تعذرت الأرشفة: ${error.message}`);
      setNotice(`تمت أرشفة الطلب ${payment.tracking_code} وتسجيل الإجراء في سجل التدقيق.`); await load();
    } catch (cause) { setErr(cause instanceof Error ? cause.message : "تعذرت أرشفة الطلب."); }
    finally { setBusy(null); }
  };

  const restore = async (payment: Payment) => {
    if (!window.confirm(`إعادة الطلب ${payment.tracking_code} إلى القائمة الرئيسية؟ سيُسجل المنفذ والوقت.`)) return;
    setErr(""); setNotice(""); setBusy(payment.id);
    try {
      const { data, error } = await (supabase as any).from("payment_archives").delete().eq("payment_id", payment.id).select("payment_id").maybeSingle();
      if (error) throw new Error(`تعذرت الاستعادة: ${error.message}`);
      if (!data) throw new Error("لم يُعثر على سجل الأرشفة لاستعادته.");
      setNotice(`تمت استعادة الطلب ${payment.tracking_code} وتسجيل الإجراء في سجل التدقيق.`); await load();
    } catch (cause) { setErr(cause instanceof Error ? cause.message : "تعذرت استعادة الطلب."); }
    finally { setBusy(null); }
  };

  const shown = useMemo(() => rows.filter((payment) => {
    if (archivedIds.has(payment.id) !== showArchived) return false;
    if (filter === "all") return true;
    if (filter === "pending") return PENDING_STATUSES.includes(payment.status);
    return payment.status === filter;
  }), [rows, archivedIds, showArchived, filter]);

  // الأرقام تتضمن المعتمدة المؤرشفة أيضًا.
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    rows.filter((p) => p.status === "approved").forEach((p) => { result[p.wallet] = (result[p.wallet] ?? 0) + Number(p.amount || 0); });
    return result;
  }, [rows]);
  const totalApproved = Object.values(totals).reduce((a, b) => a + b, 0);
  const pendingSum = rows.filter((p) => PENDING_STATUSES.includes(p.status)).reduce((a, p) => a + Number(p.amount || 0), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 font-[Cairo] sm:p-6"><div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow"><div><h1 className="text-xl font-black">طلبات الدفع والمحاسبة</h1><p className="mt-1 text-xs text-sky-200">مراجعة وتعديل وأرشفة مع سجل تدقيق</p></div><Link to="/admin" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold">← لوحة الإدارة</Link></header>
      {err && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>تعذر تنفيذ العملية</b><p className="mt-1 break-words">{err}</p><button type="button" onClick={() => void load()} className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 font-bold">إعادة تحميل البيانات</button></div>}
      {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="بانتظار الاعتماد" value={rows.filter((p) => PENDING_STATUSES.includes(p.status)).length} sub={`${fmt(pendingSum)} ر.ي مطلوب`} color="text-amber-600"/><Kpi label="المقبوض المعتمد" value={fmt(totalApproved)} sub="ر.ي، يشمل المؤرشف" color="text-emerald-600"/><Kpi label="دفعات معتمدة" value={rows.filter((p) => p.status === "approved").length} sub="عملية" color="text-[#0F4C81]"/><Kpi label="مرفوضة" value={rows.filter((p) => p.status === "rejected").length} sub="عملية" color="text-red-600"/></div>
      <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4"><h2 className="mb-3 text-sm font-black text-[#0A2540]">إجمالي المقبوض المعتمد حسب وسيلة الدفع</h2>{Object.keys(totals).length === 0 ? <p className="text-xs text-slate-500">لا توجد دفعات معتمدة.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(totals).map(([wallet, value]) => <div key={wallet} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"><div className="text-xs font-bold">{wallet}</div><div className="mt-1 text-lg font-black text-emerald-700">{fmt(value)}</div><div className="text-[10px]">ر.ي</div></div>)}</div>}</section>
      <div className="mt-4 flex flex-wrap items-center gap-2">{(["pending", "approved", "rejected", "all"] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${filter === item ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{item === "all" ? "الكل" : STATUS[item]?.label}</button>)}<button type="button" onClick={() => setShowArchived(false)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${!showArchived ? "bg-slate-700 text-white" : "bg-white"}`}>القائمة الرئيسية</button><button type="button" onClick={() => setShowArchived(true)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${showArchived ? "bg-slate-700 text-white" : "bg-white"}`}>الأرشيف ({archivedIds.size})</button></div>
      <div className="mt-3 space-y-3">{loading && <p className="text-sm text-slate-500">جارٍ التحميل...</p>}{!loading && shown.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">لا توجد طلبات في هذا القسم.</p>}
        {shown.map((payment) => {const isPending = PENDING_STATUSES.includes(payment.status); const isArchived = archivedIds.has(payment.id); return <article key={payment.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
          {payment.receipt_image ? <button type="button" onClick={() => setPreview(payment.receipt_image)} aria-label="معاينة سند الدفع"><img src={payment.receipt_image} alt="سند الدفع" className="h-24 w-24 rounded-xl border object-cover"/></button> : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-dashed text-xs text-slate-400">بدون سند</div>}
          <div className="min-w-0 flex-1 text-sm"><div className="flex flex-wrap items-center gap-2"><b className="text-[#0A2540]">{payment.customer_name || "عميل"}</b><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[payment.status]?.classes ?? "bg-slate-100"}`}>{STATUS[payment.status]?.label ?? payment.status}</span>{isArchived && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px]">مؤرشف</span>}</div><div className="mt-1 text-xs text-slate-600">الطلب <b dir="ltr">{payment.tracking_code}</b> • عبر <b>{payment.wallet}</b> • {new Date(payment.created_at).toLocaleString("ar")}</div>{payment.phone && <div className="mt-1 text-xs">الهاتف: <b dir="ltr">{payment.phone}</b></div>}<p className="mt-3 font-bold">المبلغ: {fmt(Number(payment.amount))} {payment.currency || "ر.ي"}</p>{payment.reviewed_at && <p className="mt-1 text-xs text-slate-500">تاريخ المراجعة: {new Date(payment.reviewed_at).toLocaleString("ar")}</p>}</div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:w-52 sm:flex-col"><button type="button" onClick={() => {setEditing(payment);setDraft(toDraft(payment));}} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">تعديل البيانات</button><button type="button" onClick={() => void openAudit(payment)} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">سجل التدقيق</button>{isArchived ? <button type="button" disabled={busy === payment.id} onClick={() => void restore(payment)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold">استعادة</button> : <button type="button" disabled={busy === payment.id} onClick={() => void archive(payment)} className="rounded-xl border bg-slate-100 px-3 py-2 text-xs font-bold">أرشفة</button>}{!isArchived && isPending && <><button type="button" disabled={busy === payment.id} onClick={() => void approve(payment)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">اعتماد الدفعة ✓</button><button type="button" disabled={busy === payment.id} onClick={() => void reject(payment)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">رفض السند</button></>}</div>
        </article>;})}</div>
      </div>

      {editing && draft && <Modal title="تعديل بيانات الدفعة" onClose={() => {setEditing(null);setDraft(null);}}><p className="mb-3 text-xs text-slate-500">حالة الطلب: {STATUS[editing.status]?.label ?? editing.status}. لن تتغير الحالة. التعديل يسجل تلقائيًا.</p>{editing.status === "approved" && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">للدفعة المعتمدة: تعديل اسم العميل والهاتف ورابط السند فقط، حمايةً للقيود المالية.</p>}<div className="grid gap-3 sm:grid-cols-2"><Field label="المبلغ"><input className="input" type="number" min="0" step="1" disabled={editing.status === "approved"} value={draft.amount} onChange={(e) => setDraft({...draft,amount:e.target.value})}/></Field><Field label="العملة"><input className="input" disabled={editing.status === "approved"} value={draft.currency} onChange={(e) => setDraft({...draft,currency:e.target.value})}/></Field><Field label="اسم العميل"><input className="input" value={draft.customer_name} onChange={(e) => setDraft({...draft,customer_name:e.target.value})}/></Field><Field label="الهاتف"><input className="input" dir="ltr" value={draft.phone} onChange={(e) => setDraft({...draft,phone:e.target.value})}/></Field><Field label="رمز الطلب"><input className="input" dir="ltr" disabled={editing.status === "approved"} value={draft.tracking_code} onChange={(e) => setDraft({...draft,tracking_code:e.target.value})}/></Field><Field label="وسيلة الدفع"><input className="input" disabled={editing.status === "approved"} value={draft.wallet} onChange={(e) => setDraft({...draft,wallet:e.target.value})}/></Field><div className="sm:col-span-2"><Field label="رابط السند"><input className="input" dir="ltr" type="url" value={draft.receipt_image} onChange={(e) => setDraft({...draft,receipt_image:e.target.value})}/></Field></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => {setEditing(null);setDraft(null);}} className="rounded-xl border px-4 py-2">إلغاء</button><button type="button" disabled={busy === editing.id} onClick={() => void saveEdit()} className="rounded-xl bg-[#0F4C81] px-4 py-2 font-bold text-white">{busy === editing.id ? "جارٍ الحفظ…" : "حفظ التعديلات"}</button></div></Modal>}

      {auditFor && <Modal title={`سجل التدقيق — ${auditFor.tracking_code}`} onClose={() => setAuditFor(null)}><p className="mb-3 text-xs text-slate-600">يسجل النظام تعديل بيانات الدفع والأرشفة والاستعادة. تشمل السجلات التي ينشئها مشغّل قاعدة البيانات.</p>{auditLoading && <p>جارٍ تحميل السجل…</p>}{auditError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{auditError}</p>}{!auditLoading && !auditError && auditRows.length === 0 && <p className="text-sm text-slate-500">لا توجد إجراءات مسجلة لهذا الطلب بعد تنفيذ SQL.</p>}<div className="max-h-[60vh] space-y-3 overflow-y-auto">{auditRows.map((entry) => <article key={entry.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap justify-between gap-2"><b>{AUDIT_ACTION[entry.action] ?? entry.action}</b><time className="text-xs text-slate-500">{new Date(entry.occurred_at).toLocaleString("ar")}</time></div><p className="mt-1 break-all text-xs text-slate-600">المنفذ: <b>{entry.actor_label || "غير معروف"}</b>{entry.actor_id ? <span> • UID: <bdi>{entry.actor_id}</bdi></span> : null}</p>{entry.changed_fields && Object.keys(entry.changed_fields).length > 0 && <div className="mt-2 space-y-1">{Object.entries(entry.changed_fields).map(([key, value]) => <p key={key} className="break-all rounded bg-slate-50 p-2 text-xs"><b>{FIELD_LABELS[key] ?? key}:</b> <span className="text-red-700">{formatAuditValue(value.before)}</span> ← <span className="text-emerald-700">{formatAuditValue(value.after)}</span></p>)}</div>}</article>)}</div></Modal>}

      {preview && <div role="presentation" onClick={() => setPreview(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><button type="button" onClick={() => setPreview(null)} className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 font-bold">إغلاق</button><img src={preview} alt="سند الدفع" className="max-h-[90vh] max-w-full rounded-xl"/></div>}
      <style>{`.input{width:100%;margin-top:.35rem;border:1px solid #cbd5e1;border-radius:.75rem;padding:.65rem .8rem;font-size:.9rem}.input:disabled{background:#f1f5f9;color:#64748b}`}</style>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}><section className="my-6 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black">{title}</h2><button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold">إغلاق</button></div>{children}</section></div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-bold text-slate-700">{label}{children}</label>; }
function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) { return <div className="rounded-2xl border border-sky-100 bg-white p-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className={`mt-1 text-2xl font-black ${color}`}>{value}</div><div className="text-[11px] text-slate-400">{sub}</div></div>; }
