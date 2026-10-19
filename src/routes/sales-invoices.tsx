import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Wallet,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sales-invoices")({ component: GuardedSalesInvoicesPage });

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client: string | null;
  tracking_code: string | null;
  total: number | string | null;
  total_yer: number | string | null;
  deposit_due_yer: number | string | null;
  created_at: string | null;
  order_id: string | null;
  user_id: string | null;
  created_by: string | null;
};
type InvoiceForm = {
  client: string;
  trackingCode: string;
  total: string;
  totalYer: string;
  depositDueYer: string;
  customerUserId: string;
  orderId: string;
};
const COLUMNS =
  "id, invoice_number, client, tracking_code, total, total_yer, deposit_due_yer, created_at, order_id, user_id, created_by";
const EMPTY_FORM: InvoiceForm = {
  client: "",
  trackingCode: "",
  total: "",
  totalYer: "",
  depositDueYer: "",
  customerUserId: "",
  orderId: "",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const amount = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const money = (value: number | string | null | undefined, digits = 2) =>
  amount(value).toLocaleString("en-US", { maximumFractionDigits: digits });
const dateLabel = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("ar-YE");
};

function GuardedSalesInvoicesPage() {
  return (
    <AdminRouteGuard>
      <SalesInvoicesPage />
    </AdminRouteGuard>
  );
}

function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    // The generated local Supabase types do not yet contain sales_invoices.
    const db = supabase as any;
    const { data, error } = await db
      .from("sales_invoices")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Failed to load sales invoices:", error);
      setInvoices([]);
      setErrorMessage(
        "تعذر تحميل فواتير المبيعات. تحقق من اتصال Supabase وصلاحية المدير وسياسات RLS.",
      );
    } else setInvoices((data ?? []) as InvoiceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return invoices;
    return invoices.filter((row) =>
      [row.invoice_number, row.client, row.tracking_code]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(term)),
    );
  }, [invoices, search]);

  const totals = useMemo(
    () =>
      invoices.reduce(
        (acc, row) => ({
          usd: acc.usd + amount(row.total),
          yer: acc.yer + amount(row.total_yer),
          deposits: acc.deposits + amount(row.deposit_due_yer),
        }),
        { usd: 0, yer: 0, deposits: 0 },
      ),
    [invoices],
  );
  const updateForm = (key: keyof InvoiceForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSaveInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    const client = form.client.trim();
    const total = Number(form.total);
    const totalYer = Number(form.totalYer);
    const depositDueYer = form.depositDueYer.trim() === "" ? null : Number(form.depositDueYer);
    const customerUserId = form.customerUserId.trim() || null;
    const orderId = form.orderId.trim() || null;
    if (!client) {
      setErrorMessage("أدخل اسم العميل.");
      return;
    }
    if (!Number.isFinite(total) || total < 0 || !Number.isFinite(totalYer) || totalYer < 0) {
      setErrorMessage("أدخل إجماليًا صحيحًا غير سالب بالدولار والريال.");
      return;
    }
    if (depositDueYer !== null && (!Number.isFinite(depositDueYer) || depositDueYer < 0)) {
      setErrorMessage("أدخل مبلغ الدفعة المقدمة بالريال كرقم صحيح غير سالب.");
      return;
    }
    if (customerUserId && !UUID_RE.test(customerUserId)) {
      setErrorMessage("معرّف حساب العميل يجب أن يكون UUID صحيحًا، أو اتركه فارغًا.");
      return;
    }
    if (orderId && !UUID_RE.test(orderId)) {
      setErrorMessage("معرّف الطلب يجب أن يكون UUID صحيحًا، أو اتركه فارغًا.");
      return;
    }
    setSaving(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      console.error("Could not identify signed-in admin:", authError);
      setSaving(false);
      setErrorMessage("انتهت جلسة الدخول أو تعذر التحقق منها. سجّل الدخول مجددًا.");
      return;
    }
    const db = supabase as any;
    const values = {
      client,
      tracking_code: form.trackingCode.trim() || null,
      total,
      total_yer: totalYer,
      deposit_due_yer: depositDueYer,
      user_id: customerUserId,
      order_id: orderId,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await db.from("sales_invoices").update(values).eq("id", editingId)
      : await db.from("sales_invoices").insert({ ...values, created_by: authData.user.id });
    setSaving(false);
    if (result.error) {
      console.error("Failed to save sales invoice:", result.error);
      setErrorMessage(
        "لم تُحفظ الفاتورة. تأكد من الأعمدة وسياسات RLS وأن حسابك يحمل دور المدير، ثم أعد المحاولة.",
      );
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAddModal(false);
    setSuccessMessage(
      editingId ? "تم تحديث الفاتورة في قاعدة البيانات." : "تم حفظ الفاتورة في قاعدة البيانات.",
    );
    await loadInvoices();
  };

  const startEditing = (row: InvoiceRow) => {
    setEditingId(row.id);
    setForm({
      client: row.client ?? "",
      trackingCode: row.tracking_code ?? "",
      total: row.total == null ? "" : String(row.total),
      totalYer: row.total_yer == null ? "" : String(row.total_yer),
      depositDueYer: row.deposit_due_yer == null ? "" : String(row.deposit_due_yer),
      customerUserId: row.user_id ?? "",
      orderId: row.order_id ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setShowAddModal(true);
  };

  const deleteInvoice = async (row: InvoiceRow) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الفاتورة ${row.invoice_number}؟ لا يمكن التراجع عن الحذف.`,
      )
    )
      return;
    setErrorMessage("");
    setSuccessMessage("");
    const db = supabase as any;
    const { error } = await db.from("sales_invoices").delete().eq("id", row.id);
    if (error) {
      console.error("Failed to delete sales invoice:", error);
      setErrorMessage("تعذر حذف الفاتورة. تحقق من صلاحية المدير وسياسة RLS.");
      return;
    }
    setSuccessMessage("تم حذف الفاتورة.");
    await loadInvoices();
  };

  const shareInvoice = (row: InvoiceRow) => {
    const text = [
      `فاتورة مبيعات: ${row.invoice_number}`,
      row.client ? `العميل: ${row.client}` : "",
      row.tracking_code ? `كود الشحنة: ${row.tracking_code}` : "",
      `الإجمالي: $${money(row.total)} (${money(row.total_yer, 0)} ر.ي)`,
      row.deposit_due_yer != null
        ? `الدفعة المقدمة المطلوبة: ${money(row.deposit_due_yer, 0)} ر.ي`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 font-['Cairo',sans-serif] md:p-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="رجوع"
              className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            >
              <ArrowRight className="size-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-black text-[#0F4C81] md:text-2xl">
                <Receipt className="size-6 text-[#F97316]" /> فواتير المبيعات
              </h1>
              <p className="text-xs font-medium text-slate-500 md:text-sm">
                الفواتير المحفوظة في Supabase، مع صلاحية الإدارة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadInvoices()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> تحديث
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setErrorMessage("");
                setSuccessMessage("");
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-[#0F4C81] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0c3c66]"
            >
              <Plus className="size-4" /> إصدار فاتورة
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="طباعة"
              className="rounded-xl bg-slate-100 p-2.5 text-slate-700 transition hover:bg-slate-200"
            >
              <Printer className="size-5" />
            </button>
          </div>
        </header>
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="إغلاق"
              className="font-black"
            >
              ×
            </button>
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          >
            {successMessage}
          </div>
        )}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[#0F4C81]">
              <span className="text-xs font-bold">إجمالي الفواتير</span>
              <DollarSign className="size-5 rounded-lg bg-sky-50 p-1" />
            </div>
            <div className="text-2xl font-black text-slate-900">${money(totals.usd)}</div>
            <p className="mt-1 text-[11px] text-slate-400">{invoices.length} فاتورة محمّلة</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold">الإجمالي بالريال اليمني</span>
              <Wallet className="size-5 rounded-lg bg-emerald-50 p-1" />
            </div>
            <div className="text-2xl font-black text-emerald-800">{money(totals.yer, 0)} ر.ي</div>
            <p className="mt-1 text-[11px] text-slate-400">مجموع عمود total_yer</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold">الدفعات المقدمة المطلوبة</span>
              <Clock className="size-5 rounded-lg bg-amber-50 p-1" />
            </div>
            <div className="text-2xl font-black text-amber-700">
              {money(totals.deposits, 0)} ر.ي
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              مجموع deposit_due_yer، وليس رصيدًا محصلًا
            </p>
          </div>
        </section>
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ابحث برقم الفاتورة أو كود الشحنة أو اسم العميل..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-medium outline-none transition focus:border-[#0F4C81] focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FileText className="size-4" /> يعرض أحدث 200 فاتورة
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="border-b border-sky-100 bg-[#0F4C81]/5 text-xs font-bold text-[#0F4C81]">
                <tr>
                  <th className="px-4 py-3">رقم الفاتورة</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">كود الشحنة</th>
                  <th className="px-4 py-3 text-center">الإجمالي</th>
                  <th className="px-4 py-3 text-center">الريال اليمني</th>
                  <th className="px-4 py-3 text-center">الدفعة المقدمة</th>
                  <th className="px-4 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> جارٍ تحميل الفواتير...
                      </span>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {invoices.length
                        ? "لا توجد نتائج مطابقة للبحث."
                        : "لا توجد فواتير محفوظة في قاعدة البيانات."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-[#0F4C81]">
                          {row.invoice_number}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {dateLabel(row.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{row.client || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded bg-sky-50 px-2 py-0.5 font-mono text-xs font-bold text-[#0F4C81]">
                          {row.tracking_code || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-black text-slate-900">
                        ${money(row.total)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                        {money(row.total_yer, 0)} ر.ي
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700">
                        {row.deposit_due_yer == null ? "—" : `${money(row.deposit_due_yer, 0)} ر.ي`}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditing(row)}
                            title="تعديل الفاتورة"
                            className="rounded-lg bg-sky-50 p-1.5 text-sky-700 transition hover:bg-sky-100"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteInvoice(row)}
                            title="حذف الفاتورة"
                            className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => shareInvoice(row)}
                            title="مشاركة على واتساب"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Share2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            title="طباعة"
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-700 transition hover:bg-slate-200"
                          >
                            <Printer className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="invoice-dialog-title"
              className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2
                  id="invoice-dialog-title"
                  className="flex items-center gap-2 text-lg font-black text-[#0F4C81]"
                >
                  <Receipt className="size-5 text-[#F97316]" />{" "}
                  {editingId ? "تعديل فاتورة المبيعات" : "إصدار فاتورة مبيعات"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  aria-label="إغلاق"
                  className="flex size-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSaveInvoice} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    اسم العميل
                    <input
                      required
                      maxLength={200}
                      value={form.client}
                      onChange={(e) => updateForm("client", e.target.value)}
                      placeholder="اسم العميل"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    كود الشحنة (اختياري)
                    <input
                      maxLength={100}
                      value={form.trackingCode}
                      onChange={(e) => updateForm("trackingCode", e.target.value)}
                      placeholder="SQ-..."
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    الإجمالي بالدولار
                    <input
                      required
                      min="0"
                      step="0.01"
                      type="number"
                      value={form.total}
                      onChange={(e) => updateForm("total", e.target.value)}
                      placeholder="0.00"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    الإجمالي بالريال اليمني
                    <input
                      required
                      min="0"
                      step="1"
                      type="number"
                      value={form.totalYer}
                      onChange={(e) => updateForm("totalYer", e.target.value)}
                      placeholder="0"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                    الدفعة المقدمة المطلوبة بالريال (اختياري)
                    <input
                      min="0"
                      step="1"
                      type="number"
                      value={form.depositDueYer}
                      onChange={(e) => updateForm("depositDueYer", e.target.value)}
                      placeholder="0"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                </div>
                <details className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-slate-600">
                    ربط الفاتورة بحساب عميل أو طلب (اختياري)
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">
                      معرّف حساب العميل (UUID)
                      <input
                        value={form.customerUserId}
                        onChange={(e) => updateForm("customerUserId", e.target.value)}
                        placeholder="اتركه فارغًا إن لم يتوفر"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none focus:border-[#0F4C81]"
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      معرّف الطلب (UUID)
                      <input
                        value={form.orderId}
                        onChange={(e) => updateForm("orderId", e.target.value)}
                        placeholder="اتركه فارغًا إن لم يتوفر"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none focus:border-[#0F4C81]"
                      />
                    </label>
                  </div>
                </details>
                <p className="text-[11px] leading-5 text-slate-500">
                  رقم الفاتورة ووقت الإنشاء ينشئهما الجدول تلقائيًا. الحفظ يمر عبر جلسة المستخدم
                  وسياسات RLS، وليس عبر service_role.
                </p>
                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-800"
                  >
                    {errorMessage}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0F4C81] text-sm font-bold text-white shadow-md transition hover:bg-[#0c3c66] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> جارٍ الحفظ...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />{" "}
                        {editingId ? "حفظ التعديلات" : "حفظ وإصدار الفاتورة"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowAddModal(false)}
                    className="h-11 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuardedSalesInvoicesPage;
