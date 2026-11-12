import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { usePermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client-daily")({
  component: () => (
    <AdminRouteGuard allowStaff redirectTo="/client-daily">
      <ClientDailyPage />
    </AdminRouteGuard>
  ),
});

type Currency = "YER" | "SAR" | "USD";
type EntryKind = "قبض" | "صرف";
type DailyEntry = {
  id: string;
  customer_name: string;
  kind: EntryKind;
  amount: number | string;
  currency: Currency;
  entry_date: string;
  note: string;
  created_at: string;
};

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "YER", label: "ريال يمني" },
  { value: "SAR", label: "ريال سعودي" },
  { value: "USD", label: "دولار أمريكي" },
];

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: number): string {
  return value.toLocaleString("ar", { maximumFractionDigits: 2 });
}

function ClientDailyPage() {
  const navigate = useNavigate();
  const viewPermission = usePermission("finance", "view");
  const managePermission = usePermission("finance", "manage");
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    kind: "قبض" as EntryKind,
    amount: "",
    currency: "YER" as Currency,
    entryDate: localDate(),
    note: "",
  });

  const db = supabase as any;
  const canViewEntries = viewPermission.allowed || managePermission.allowed;

  const loadEntries = async () => {
    setLoading(true);
    setError("");
    try {
      const pageSize = 500;
      const all: DailyEntry[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error: queryError } = await db
          .from("client_daily_entries")
          .select("id,customer_name,kind,amount,currency,entry_date,note,created_at")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (queryError) throw queryError;
        const page = (data ?? []) as DailyEntry[];
        all.push(...page);
        if (page.length < pageSize) break;
      }
      setEntries(all);
    } catch (cause) {
      console.error("تعذر تحميل يوميات العملاء:", cause);
      setError("تعذّر تحميل القيود. تأكد من تطبيق ملف SQL على قاعدة Supabase المستخدمة في Vercel ومن صلاحية عرض المالية.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!viewPermission.loading && !managePermission.loading && canViewEntries) void loadEntries();
  }, [viewPermission.loading, viewPermission.allowed, managePermission.loading, managePermission.allowed]);

  const totalsByCurrency = useMemo(() => {
    const totals: Record<Currency, { receipt: number; payment: number }> = {
      YER: { receipt: 0, payment: 0 },
      SAR: { receipt: 0, payment: 0 },
      USD: { receipt: 0, payment: 0 },
    };
    for (const entry of entries) {
      const amount = Number(entry.amount) || 0;
      if (entry.kind === "قبض") totals[entry.currency].receipt += amount;
      else totals[entry.currency].payment += amount;
    }
    return totals;
  }, [entries]);

  const addEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const customerName = form.customerName.trim();
    const amount = Number(form.amount);
    const note = form.note.trim();
    if (!customerName || customerName.length > 200) {
      setError("اكتب اسم العميل، وبحد أقصى 200 حرف.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    if (!form.entryDate || Number.isNaN(Date.parse(`${form.entryDate}T00:00:00`))) {
      setError("اختر تاريخ القيد.");
      return;
    }
    if (note.length > 1000) {
      setError("الملاحظة طويلة؛ الحد الأقصى 1000 حرف.");
      return;
    }
    if (!managePermission.allowed) {
      setError("حسابك لا يملك صلاحية إدارة القيود المالية.");
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");

      const { error: insertError } = await db.from("client_daily_entries").insert({
        customer_name: customerName,
        kind: form.kind,
        amount: Math.round(amount * 100) / 100,
        currency: form.currency,
        entry_date: form.entryDate,
        note: note || "بدون وصف",
        created_by: authData.user.id,
      });
      if (insertError) throw insertError;

      setNotice("تم حفظ القيد في قاعدة بيانات الموقع.");
      setForm({ customerName: "", kind: "قبض", amount: "", currency: "YER", entryDate: localDate(), note: "" });
      await loadEntries();
    } catch (cause) {
      console.error("تعذر حفظ قيد يومية العميل:", cause);
      setError("تعذّر حفظ القيد. تحقق من اتصال Supabase وصلاحية finance/manage ثم حاول مرة واحدة بعد تحديث الصفحة.");
    } finally {
      setSaving(false);
    }
  };

  if (viewPermission.loading || managePermission.loading) {
    return <div dir="rtl" className="grid min-h-[50vh] place-items-center text-slate-600">جارٍ التحقق من الصلاحية…</div>;
  }

  if ((!canViewEntries) && (viewPermission.error || managePermission.error || !viewPermission.allowed)) {
    return (
      <main dir="rtl" className="mx-auto max-w-2xl p-6">
        <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h1 className="font-extrabold">ما عندك صلاحية عرض يوميات العملاء</h1>
          <p className="mt-2 text-sm">تحتاج صلاحية finance/view. إذا كانت عندك الصلاحية فعلًا، راجع إعداد دالة التحقق في قاعدة الموقع.</p>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-[100dvh] bg-slate-50 px-4 py-6 text-slate-900 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">📒 يوميات العملاء</h1>
            <p className="mt-1 text-sm text-slate-600">قيود القبض والصرف محفوظة في قاعدة بيانات الموقع، ومنفصلة عن دفعات الفواتير.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadEntries()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold disabled:opacity-50">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث
            </button>
            <button type="button" onClick={() => navigate({ to: "/admin" })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white">
              <ArrowRight size={16} /> رجوع للإدارة
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          القيود القديمة المحفوظة في `localStorage` ما تنتقلش تلقائيًا؛ بقيت كما هي في المتصفح القديم، وهذه الصفحة تبدأ قراءة القيود الجديدة من قاعدة الموقع.
        </div>

        {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</div>}

        <section aria-label="ملخص حسب العملة" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CURRENCIES.map(({ value, label }) => {
            const totals = totalsByCurrency[value];
            return (
              <article key={value} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-extrabold">{label}</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50 p-2"><div className="text-xs font-bold text-emerald-700">القبض</div><div className="mt-1 font-black text-emerald-900">{money(totals.receipt)}</div></div>
                  <div className="rounded-xl bg-rose-50 p-2"><div className="text-xs font-bold text-rose-700">الصرف</div><div className="mt-1 font-black text-rose-900">{money(totals.payment)}</div></div>
                  <div className="rounded-xl bg-slate-100 p-2"><div className="text-xs font-bold text-slate-600">الصافي</div><div className="mt-1 font-black text-slate-900">{money(totals.receipt - totals.payment)}</div></div>
                </div>
              </article>
            );
          })}
        </section>

        {managePermission.allowed && (
          <form onSubmit={addEntry} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold"><Plus size={18} /> قيد جديد</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-sm font-bold">اسم العميل
                <input required maxLength={200} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="اكتب اسم العميل" />
              </label>
              <label className="space-y-1 text-sm font-bold">نوع القيد
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EntryKind })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"><option value="قبض">قبض</option><option value="صرف">صرف</option></select>
              </label>
              <label className="space-y-1 text-sm font-bold">المبلغ
                <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="0.00" />
              </label>
              <label className="space-y-1 text-sm font-bold">العملة
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{CURRENCIES.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}</select>
              </label>
              <label className="space-y-1 text-sm font-bold">تاريخ القيد
                <input required type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
              </label>
              <label className="space-y-1 text-sm font-bold">ملاحظة (اختياري)
                <input maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="تفاصيل مختصرة" />
              </label>
            </div>
            <button type="submit" disabled={saving} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 font-extrabold text-white disabled:opacity-60">
              {saving && <LoaderCircle size={17} className="animate-spin" />}{saving ? "جارٍ الحفظ…" : "حفظ القيد"}
            </button>
          </form>
        )}

        {!managePermission.loading && !managePermission.allowed && (
          <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">صلاحيتك تسمح بعرض القيود فقط، ولا تسمح بإضافة قيود.</p>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-extrabold">سجل القيود</h2>{loading && <span className="text-sm text-slate-500">جارٍ التحميل…</span>}</div>
          {entries.map((entry) => (
            <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-bold">
                  <span>{entry.customer_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${entry.kind === "قبض" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{entry.kind}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{entry.entry_date}{entry.note ? ` · ${entry.note}` : ""}</div>
              </div>
              <div className="text-left font-black"><span className={entry.kind === "قبض" ? "text-emerald-700" : "text-rose-700"}>{money(Number(entry.amount) || 0)}</span><span className="mr-1 text-xs text-slate-500">{entry.currency}</span></div>
            </article>
          ))}
          {!loading && entries.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">ما فيش قيود محفوظة في قاعدة الموقع حتى الآن.</p>}
        </section>
      </div>
    </main>
  );
}
