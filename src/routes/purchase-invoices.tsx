import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import {
  ArrowRight,
  Search,
  Plus,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  Clock,
  DollarSign,
  Printer,
  Store,
  Receipt,
} from "lucide-react";
export const Route = createFileRoute("/purchase-invoices")({
  component: ProtectedPurchaseInvoicesPage,
});
interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  storeName: "SHEIN" | "AliExpress" | "Trendyol" | "Alibaba" | "Amazon" | "مورد محلي / تخليص";
  externalOrderId: string;
  trackingCode: string;
  clientName: string;
  itemsSummary: string;
  costAmount: number;
  currency: "USD" | "RMB" | "SAR";
  paymentMethod: "بطاقة فيزا 4012" | "محفظة باي بال" | "تحويل بنكي" | "نقدي";
  status: "تم الشراء والدفع" | "مشحون إلى مستودعنا" | "وصل لمستودع التجميع" | "ملغي ومسترد";
}
type PurchaseInvoiceDbRow = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  store_name: string;
  external_order_id: string;
  tracking_code: string | null;
  client_name: string | null;
  items_summary: string | null;
  cost_amount: number | string;
  currency: string;
  payment_method: string;
  status: string;
};

const purchaseTable = () => (supabase as any).from("purchase_invoices");

function mapPurchaseInvoice(row: PurchaseInvoiceDbRow): PurchaseInvoice {
  return {
    id: String(row.id),
    invoiceNo: row.invoice_no,
    date: row.invoice_date,
    storeName: row.store_name as PurchaseInvoice["storeName"],
    externalOrderId: row.external_order_id,
    trackingCode: row.tracking_code ?? "",
    clientName: row.client_name ?? "",
    itemsSummary: row.items_summary ?? "",
    costAmount: Number(row.cost_amount ?? 0),
    currency: row.currency as PurchaseInvoice["currency"],
    paymentMethod: row.payment_method as PurchaseInvoice["paymentMethod"],
    status: row.status as PurchaseInvoice["status"],
  };
}

function newPurchaseInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PI-${date}-${suffix}`;
}

function PurchaseInvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("الكل");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    storeName: "SHEIN" as PurchaseInvoice["storeName"],
    externalOrderId: "",
    trackingCode: "",
    clientName: "",
    itemsSummary: "",
    costAmount: "",
    currency: "USD" as PurchaseInvoice["currency"],
    paymentMethod: "بطاقة فيزا 4012" as PurchaseInvoice["paymentMethod"],
  });
  useEffect(() => {
    let active = true;
    const loadInvoices = async () => {
      setLoading(true);
      setPageError("");
      const { data, error } = await purchaseTable()
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setPageError(
          "تعذر تحميل فواتير المشتريات. تحقق من جدول purchase_invoices وسياسات RLS في قاعدة البيانات.",
        );
        setLoading(false);
        return;
      }
      setInvoices(((data ?? []) as PurchaseInvoiceDbRow[]).map(mapPurchaseInvoice));
      setLoading(false);
    };
    void loadInvoices();
    return () => {
      active = false;
    };
  }, []);
  const filteredInvoices = useMemo(() => {
    const s = search ?? "";
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNo.toLowerCase().includes(s.toLowerCase()) ||
        inv.externalOrderId.toLowerCase().includes(s.toLowerCase()) ||
        inv.trackingCode.toLowerCase().includes(s.toLowerCase()) ||
        inv.clientName.includes(s) ||
        inv.itemsSummary.includes(s);
      const matchStore = selectedStore === "الكل" || inv.storeName === selectedStore;
      return matchSearch && matchStore;
    });
  }, [invoices, search, selectedStore]);
  const stats = useMemo(() => {
    const totalUSD = invoices.reduce(
      (sum, inv) => sum + (inv.currency === "USD" ? inv.costAmount : 0),
      0,
    );
    const count = invoices.length;
    const inTransit = invoices.filter((i) => i.status === "مشحون إلى مستودعنا").length;
    const arrived = invoices.filter((i) => i.status === "وصل لمستودع التجميع").length;
    return { totalUSD, count, inTransit, arrived };
  }, [invoices]);
  const handleAddInvoice = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPageError("");
    const amount = Number(newInvoice.costAmount);
    if (!newInvoice.externalOrderId.trim() || !newInvoice.costAmount) {
      setPageError("أدخل رقم الطلب الخارجي والتكلفة.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setPageError("أدخل تكلفة صحيحة غير سالبة.");
      return;
    }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setPageError("انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.");
        return;
      }
      const payload = {
        invoice_no: newPurchaseInvoiceNumber(),
        invoice_date: new Date().toISOString().slice(0, 10),
        store_name: newInvoice.storeName,
        external_order_id: newInvoice.externalOrderId.trim(),
        tracking_code: newInvoice.trackingCode.trim() || null,
        client_name: newInvoice.clientName.trim() || "طلب مجمع",
        items_summary: newInvoice.itemsSummary.trim() || "شراء بضاعة",
        cost_amount: amount,
        currency: newInvoice.currency,
        payment_method: newInvoice.paymentMethod,
        status: "تم الشراء والدفع",
        created_by: authData.user.id,
      };
      const { data, error } = await purchaseTable().insert(payload).select("*").single();
      if (error) {
        setPageError(
          error.code === "23505"
            ? "رقم الفاتورة مستخدم مسبقًا. تحقق من السجل ثم أعد المحاولة."
            : "تعذر حفظ فاتورة المشتريات. تحقق من صلاحية المدير وسياسات RLS وأسماء أعمدة الجدول.",
        );
        return;
      }
      setInvoices((current) => [mapPurchaseInvoice(data as PurchaseInvoiceDbRow), ...current]);
      setShowAddModal(false);
      setNewInvoice({
        storeName: "SHEIN",
        externalOrderId: "",
        trackingCode: "",
        clientName: "",
        itemsSummary: "",
        costAmount: "",
        currency: "USD",
        paymentMethod: "بطاقة فيزا 4012",
      });
    } catch {
      setPageError("حدث خطأ غير متوقع أثناء حفظ الفاتورة. بقي النموذج مفتوحًا؛ حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 md:p-8 font-['Cairo',sans-serif]"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#0F4C81] flex items-center gap-2">
                <Receipt className="w-6 h-6 text-[#F97316]" />
                فواتير مشتريات المتاجر والموردين
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                توثيق تكلفة الشراء من SHEIN و AliExpress و Trendyol وحسابات التخليص
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-sm shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              تسجيل فاتورة شراء
            </button>
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="طباعة التقرير"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
        {pageError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"
          >
            {pageError}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
            <div className="flex items-center justify-between text-[#0F4C81] mb-2">
              <span className="text-xs font-bold">إجمالي المشتريات (USD)</span>
              <DollarSign className="w-5 h-5 bg-sky-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              ${stats.totalUSD.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats.count} فاتورة صادرة</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold">قيد الشحن للمستودع</span>
              <Clock className="w-5 h-5 bg-amber-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.inTransit} شحنة</div>
            <p className="text-[11px] text-slate-400 mt-1">في الطريق للمستودع الصيني أو التركي</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold">وصلت لمستودع التجميع</span>
              <CheckCircle2 className="w-5 h-5 bg-emerald-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{stats.arrived} طلب</div>
            <p className="text-[11px] text-slate-400 mt-1">جاهزة للتغليف والشحن الدولي</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between text-purple-600 mb-2">
              <span className="text-xs font-bold">وسائل الدفع المستخدمة</span>
              <CreditCard className="w-5 h-5 bg-purple-50 p-1 rounded-lg" />
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">فيزا كارد + باي بال</div>
            <p className="text-[11px] text-slate-400 mt-1">خصم مباشر من الصناديق</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-500 ml-2">المتجر / المصدر:</span>
            {[
              "الكل",
              "SHEIN",
              "AliExpress",
              "Trendyol",
              "Alibaba",
              "Amazon",
              "مورد محلي / تخليص",
            ].map((store) => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${selectedStore === store ? "bg-[#0F4C81] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {store}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، كود التتبع (SQ-...)، رقم طلب المتجر، أو اسم العميل..."
              value={search ?? ""}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pr-12 pl-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0F4C81] outline-none text-xs md:text-sm font-medium transition"
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-[#0F4C81]/5 text-[#0F4C81] text-xs font-bold border-b border-sky-100">
                <tr>
                  <th className="py-3 px-4">رقم الفاتورة والتاريخ</th>
                  <th className="py-3 px-4">المتجر ورقم الطلب الخارجي</th>
                  <th className="py-3 px-4">الشحنة والعميل المربوط</th>
                  <th className="py-3 px-4">بيان السلع</th>
                  <th className="py-3 px-4 text-center">المبلغ والعملة</th>
                  <th className="py-3 px-4 text-center">وسيلة السداد</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      جارٍ تحميل الفواتير…
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      لا توجد فواتير مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-[#0F4C81]">{inv.invoiceNo}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{inv.date}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#F97316]" />
                          {inv.storeName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          كود: {inv.externalOrderId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded inline-block text-xs">
                          {inv.trackingCode}
                        </div>
                        <div className="text-xs text-slate-600 mt-1 font-bold">
                          {inv.clientName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                        {inv.itemsSummary}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-slate-900 text-sm">
                        ${inv.costAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${inv.status === "وصل لمستودع التجميع" ? "bg-emerald-100 text-emerald-800" : inv.status === "مشحون إلى مستودعنا" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-lg text-[#0F4C81] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#F97316]" />
                  تسجيل فاتورة شراء من متجر خارجي
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>
              {pageError && (
                <div
                  role="alert"
                  className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800"
                >
                  {pageError}
                </div>
              )}
              <form onSubmit={handleAddInvoice} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      المتجر / المورد
                    </label>
                    <select
                      value={newInvoice.storeName ?? "SHEIN"}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, storeName: e.target.value as any })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="SHEIN">SHEIN</option>
                      <option value="AliExpress">AliExpress</option>
                      <option value="Trendyol">Trendyol</option>
                      <option value="Alibaba">Alibaba</option>
                      <option value="Amazon">Amazon</option>
                      <option value="مورد محلي / تخليص">مورد محلي / تخليص</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      رقم الطلب في المتجر
                    </label>
                    <input
                      required
                      placeholder="GSHN..."
                      value={newInvoice.externalOrderId ?? ""}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, externalOrderId: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      كود الشحنة المربوطة
                    </label>
                    <input
                      placeholder="SQ-800..."
                      value={newInvoice.trackingCode ?? ""}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, trackingCode: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      اسم العميل
                    </label>
                    <input
                      placeholder="اسم صاحب الطلب..."
                      value={newInvoice.clientName ?? ""}
                      onChange={(e) => setNewInvoice({ ...newInvoice, clientName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    بيان الأصناف المشتراة
                  </label>
                  <input
                    placeholder="مثال: فساتين، أحذية، ملحقات جوال..."
                    value={newInvoice.itemsSummary ?? ""}
                    onChange={(e) => setNewInvoice({ ...newInvoice, itemsSummary: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0F4C81]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      التكلفة الإجمالية ($)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="50.00"
                      value={newInvoice.costAmount ?? ""}
                      onChange={(e) => setNewInvoice({ ...newInvoice, costAmount: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      وسيلة الدفع المستخدمة
                    </label>
                    <select
                      value={newInvoice.paymentMethod ?? "بطاقة فيزا 4012"}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, paymentMethod: e.target.value as any })
                      }
                      className="w-full h-10 px-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="بطاقة فيزا 4012">بطاقة فيزا 4012</option>
                      <option value="محفظة باي بال">محفظة باي بال</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="نقدي">نقدي</option>
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-11 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] disabled:opacity-60 text-white font-bold text-sm shadow-md transition"
                  >
                    {saving ? "جارٍ الحفظ…" : "حفظ فاتورة الشراء"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition"
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

function ProtectedPurchaseInvoicesPage() {
  return (
    <AdminRouteGuard>
      <PurchaseInvoicesPage />
    </AdminRouteGuard>
  );
}
