import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Payment = {
  id: string;
  amount: number;
  requested_amount: number | null;
  received_amount: number | null;
  remaining_amount: number | null;
  created_at: string;
  customer_name: string | null;
  receipt_image: string | null;
  reviewed_at: string | null;
  status: string;
  tracking_code: string;
  updated_at: string;
  user_id: string | null;
  wallet: string;
  currency: string;
};

type PaymentFilter = "pending" | "approved" | "rejected" | "all";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { name: "description", content: "مراجعة دفعات العملاء وتسجيل المبالغ المقبوضة." },
      { property: "og:title", content: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (value: number) => Math.round(value).toLocaleString("en-US");

const STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: "بانتظار المراجعة", classes: "bg-amber-100 text-amber-800" },
  "بانتظار التأكيد": { label: "بانتظار التأكيد", classes: "bg-amber-100 text-amber-800" },
  approved: { label: "معتمد ✓", classes: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "مرفوض", classes: "bg-red-100 text-red-700" },
};

function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [receivedInputs, setReceivedInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`تعذر التحقق من جلسة الدخول: ${authError.message}`);
      if (!authData.user) throw new Error("سجّل الدخول بحساب الإدارة ثم أعد تحميل الصفحة.");

      const [adminRole, staffRole] = await Promise.all([
        supabase.rpc("has_role", { _user_id: authData.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: authData.user.id, _role: "staff" }),
      ]);
      if (adminRole.error || staffRole.error) {
        throw new Error(`تعذر فحص دور الحساب: ${(adminRole.error ?? staffRole.error)?.message ?? "خطأ غير معروف"}`);
      }
      if (!adminRole.data && !staffRole.data) {
        throw new Error("الحساب لا يحمل دور admin أو staff في جدول user_roles.");
      }

      // الأعمدة الجزئية تُضاف في ترحيل SQL أعلاه.
      const { data, error } = await (supabase.from("payments") as any)
        .select("id,amount,requested_amount,received_amount,remaining_amount,created_at,customer_name,receipt_image,reviewed_at,status,tracking_code,updated_at,user_id,wallet")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`تعذر تحميل طلبات الدفع: ${error.message}${error.code ? ` (${error.code})` : ""}`);

      const nextRows: Payment[] = (data ?? []).map((row: any) => ({
        ...row,
        amount: Number(row.amount),
        requested_amount: row.requested_amount == null ? null : Number(row.requested_amount),
        received_amount: row.received_amount == null ? null : Number(row.received_amount),
        remaining_amount: row.remaining_amount == null ? null : Number(row.remaining_amount),
        currency: "ر.ي",
      }));
      setRows(nextRows);
      setReceivedInputs((previous) => {
        const next = { ...previous };
        for (const payment of nextRows) {
          if (next[payment.id] === undefined) {
            next[payment.id] = String(payment.requested_amount ?? payment.amount ?? "");
          }
        }
        return next;
      });
    } catch (cause) {
      console.error("تعذر تحميل طلبات الدفع:", cause);
      setErr(cause instanceof Error ? cause.message : "تعذر تحميل طلبات الدفع.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("payments_live_partial_approval")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const approve = async (payment: Payment) => {
    setErr("");
    const received = Number(receivedInputs[payment.id]);
    const requested = Number(payment.requested_amount ?? payment.amount);
    if (!Number.isSafeInteger(received) || received <= 0) {
      setErr(`أدخل مبلغًا مقبوضًا صحيحًا أكبر من صفر للطلب ${payment.tracking_code}.`);
      return;
    }
    if (received > requested) {
      setErr(`المبلغ المقبوض لا يمكن أن يتجاوز المطلوب (${fmt(requested)} ر.ي) للطلب ${payment.tracking_code}.`);
      return;
    }
    if (!window.confirm(`سيُعتمد ${fmt(received)} ر.ي للطلب ${payment.tracking_code}.\nالمتبقي عند التسليم: ${fmt(requested - received)} ر.ي.\nسيُرسل إشعار للعميل. متابعة؟`)) return;

    setBusy(payment.id);
    try {
      const { error } = await (supabase as any).rpc("approve_payment_received", {
        _payment_id: payment.id,
        _received_amount: received,
      });
      if (error) throw new Error(error.message || "تعذر اعتماد الدفعة الجزئية.");
      await load();
    } catch (cause) {
      console.error("تعذر اعتماد الدفعة:", cause);
      setErr(cause instanceof Error ? cause.message : "تعذر اعتماد الدفعة. لم يُعرض نجاح الاعتماد.");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (payment: Payment) => {
    if (!window.confirm(`هل تريد رفض سند الدفع للطلب ${payment.tracking_code}؟`)) return;
    setErr("");
    setBusy(payment.id);
    try {
      const { error } = await supabase.from("payments").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      }).eq("id", payment.id).in("status", ["pending", "بانتظار التأكيد"]);
      if (error) throw new Error(`تعذر رفض الدفعة: ${error.message}`);

      const warnings: string[] = [];
      if (payment.user_id) {
        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: payment.user_id,
          title: `لم يتم قبول سند الدفع للطلب ${payment.tracking_code}`,
          body: "يرجى مراجعة السند أو التواصل مع خدمة العملاء لإعادة تقديمه.",
          kind: "payment",
          href: "/account/wallet",
          is_active: true,
        });
        if (notificationError) warnings.push(`تعذر إرسال إشعار الرفض: ${notificationError.message}`);
      }
      if (warnings.length) setErr(warnings.join(" • "));
      await load();
    } catch (cause) {
      console.error("تعذر رفض الدفعة:", cause);
      setErr(cause instanceof Error ? cause.message : "تعذر رفض الدفعة.");
    } finally {
      setBusy(null);
    }
  };

  const shown = filter === "all" ? rows : rows.filter((payment) => {
    if (filter === "pending") return payment.status === "pending" || payment.status === "بانتظار التأكيد";
    return payment.status === filter;
  });

  const ledger = useMemo(() => {
    const totals: Record<string, number> = {};
    rows.filter((payment) => payment.status === "approved").forEach((payment) => {
      totals[payment.wallet] = (totals[payment.wallet] ?? 0) + Number(payment.received_amount ?? payment.amount);
    });
    return totals;
  }, [rows]);
  const totalApproved = Object.values(ledger).reduce((sum, value) => sum + value, 0);
  const pendingSum = rows.filter((payment) => payment.status === "pending" || payment.status === "بانتظار التأكيد")
    .reduce((sum, payment) => sum + Number(payment.requested_amount ?? payment.amount), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 font-[Cairo] sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow">
          <div>
            <h1 className="text-xl font-black">طلبات الدفع والمحاسبة</h1>
            <p className="mt-1 text-xs text-sky-200">اعتماد المقبوض الفعلي وتسجيل المتبقي عند التسليم</p>
          </div>
          <Link to="/admin" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25">← لوحة الإدارة</Link>
        </header>

        {err && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-black">تعذر تنفيذ العملية</p><p className="mt-1 break-words">{err}</p>
          <button type="button" onClick={() => void load()} className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 font-bold">إعادة تحميل البيانات</button>
        </div>}

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="بانتظار الاعتماد" value={rows.filter((p) => p.status === "pending" || p.status === "بانتظار التأكيد").length} sub={`${fmt(pendingSum)} ر.ي مطلوب`} color="text-amber-600" />
          <Kpi label="المقبوض المعتمد" value={fmt(totalApproved)} sub="ر.ي" color="text-emerald-600" />
          <Kpi label="دفعات معتمدة" value={rows.filter((p) => p.status === "approved").length} sub="عملية" color="text-[#0F4C81]" />
          <Kpi label="مرفوضة" value={rows.filter((p) => p.status === "rejected").length} sub="عملية" color="text-red-600" />
        </div>

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-black text-[#0A2540]">إجمالي المقبوض في الصناديق (من الدفعات المعتمدة)</h2>
          {Object.keys(ledger).length === 0 ? <p className="text-xs text-slate-500">لا توجد مقبوضات معتمدة.</p> :
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(ledger).map(([wallet, value]) => <div key={wallet} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="text-xs font-bold text-slate-600">{wallet}</div><div className="mt-1 text-lg font-black text-emerald-700">{fmt(value)}</div><div className="text-[10px] text-slate-500">ر.ي</div>
              </div>)}
            </div>}
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${filter === item ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-200 bg-white text-slate-600"}`}>
            {item === "all" ? "الكل" : STATUS[item]?.label}
          </button>)}
        </div>

        <div className="mt-3 space-y-3">
          {loading && <p className="text-sm text-slate-500">جارٍ التحميل...</p>}
          {!loading && shown.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">لا توجد طلبات في هذا القسم.</p>}
          {shown.map((payment) => {
            const requested = Number(payment.requested_amount ?? payment.amount);
            const entered = Number(receivedInputs[payment.id] ?? requested);
            const remainingPreview = Number.isFinite(entered) ? Math.max(0, requested - entered) : requested;
            const isPending = payment.status === "pending" || payment.status === "بانتظار التأكيد";
            const actualReceived = Number(payment.received_amount ?? payment.amount);
            return <article key={payment.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
              {payment.receipt_image ? <button type="button" onClick={() => setPreview(payment.receipt_image)} className="shrink-0" aria-label="معاينة سند الدفع">
                <img src={payment.receipt_image} alt="سند الدفع" className="h-24 w-24 rounded-xl border object-cover" />
              </button> : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-dashed text-xs text-slate-400">بدون سند</div>}
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="font-black text-[#0A2540]">{payment.customer_name || "عميل"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[payment.status]?.classes ?? "bg-slate-100 text-slate-700"}`}>{STATUS[payment.status]?.label ?? payment.status}</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">الطلب <b dir="ltr">{payment.tracking_code}</b> • عبر <b>{payment.wallet}</b> • {new Date(payment.created_at).toLocaleString("ar")}</div>
                {isPending ? <>
                  <div className="mt-3 text-sm font-bold">المبلغ المطلوب: {fmt(requested)} {payment.currency}</div>
                  <label className="mt-2 block max-w-xs text-xs font-bold text-slate-700">المبلغ المقبوض فعليًا
                    <div className="mt-1 flex items-center gap-2"><input type="number" min="1" max={requested} step="1" inputMode="numeric" value={receivedInputs[payment.id] ?? String(requested)} onChange={(event) => setReceivedInputs((prev) => ({ ...prev, [payment.id]: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base font-black" /> <span>ر.ي</span></div>
                  </label>
                  <p className="mt-2 text-xs font-bold text-amber-700">المتبقي على العميل عند التسليم: {fmt(remainingPreview)} ر.ي</p>
                  <p className="mt-1 text-[11px] text-slate-500">تأكد من السند. الاعتماد يسجل المقبوض الفعلي في الصندوق ويرسل للعميل إشعارًا داخل التطبيق.</p>
                </> : <div className="mt-3 space-y-1 text-sm">
                  <p>المطلوب: {fmt(Number(payment.requested_amount ?? payment.amount))} {payment.currency}</p>
                  <p className="font-black text-emerald-700">المقبوض والمضاف: {fmt(actualReceived)} {payment.currency}</p>
                  <p className="font-bold text-amber-700">المتبقي عند التسليم: {fmt(Number(payment.remaining_amount ?? 0))} {payment.currency}</p>
                </div>}
              </div>
              {isPending && <div className="flex shrink-0 flex-col gap-2 sm:w-48">
                <button type="button" disabled={busy === payment.id} onClick={() => void approve(payment)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy === payment.id ? "جارٍ الاعتماد…" : "اعتماد المقبوض وإشعار العميل ✓"}</button>
                <button type="button" disabled={busy === payment.id} onClick={() => void reject(payment)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">رفض السند</button>
              </div>}
            </article>;
          })}
        </div>
      </div>

      {preview && <div role="presentation" onClick={() => setPreview(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
        <button type="button" onClick={() => setPreview(null)} className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 font-bold">إغلاق</button>
        <img src={preview} alt="سند الدفع" className="max-h-[90vh] max-w-full rounded-xl" />
      </div>}
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return <div className="rounded-2xl border border-sky-100 bg-white p-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className={`mt-1 text-2xl font-black ${color}`}>{value}</div><div className="text-[11px] text-slate-400">{sub}</div></div>;
}
