import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { ArrowRight, Search, Plus, Receipt, Printer, Share2, CheckCircle2, Clock, DollarSign, TrendingUp, Phone, Store } from "lucide-react";
export const Route = createFileRoute('/sales-invoices')({ component: ProtectedSalesInvoicesPage });
interface SalesInvoice { id: string; invoiceNo: string; date: string; clientName: string; clientPhone: string; city: string; trackingCode: string; storeSource: "SHEIN" | "AliExpress" | "Trendyol" | "Amazon" | "Alibaba"; productCost: number; shippingCost: number; customsFee: number; commissionFee: number; localDeliveryFee: number; totalUSD: number; exchangeRateYER: number; totalYER: number; paymentType: "مدفوع مقدماً" | "دفع عند الاستلام (COD)" | "سداد جزئي"; status: "مسدد بالكامل" | "بانتظار التحصيل عند التسليم" | "قيد المراجعة"; }
type SalesInvoiceDbRow = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  client_name: string;
  client_phone: string;
  city: string | null;
  tracking_code: string | null;
  store_source: string;
  product_cost: number | string;
  shipping_cost: number | string;
  customs_fee: number | string;
  commission_fee: number | string;
  local_delivery_fee: number | string;
  total_usd: number | string;
  exchange_rate_yer: number | string;
  total_yer: number | string;
  payment_type: string;
  status: string;
};

const salesTable = () => (supabase as any).from("sales_invoices");

function mapSalesInvoice(row: SalesInvoiceDbRow): SalesInvoice {
  return {
    id: String(row.id),
    invoiceNo: row.invoice_no,
    date: row.invoice_date,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    city: row.city ?? "",
    trackingCode: row.tracking_code ?? "",
    storeSource: row.store_source as SalesInvoice["storeSource"],
    productCost: Number(row.product_cost ?? 0),
    shippingCost: Number(row.shipping_cost ?? 0),
    customsFee: Number(row.customs_fee ?? 0),
    commissionFee: Number(row.commission_fee ?? 0),
    localDeliveryFee: Number(row.local_delivery_fee ?? 0),
    totalUSD: Number(row.total_usd ?? 0),
    exchangeRateYER: Number(row.exchange_rate_yer ?? 0),
    totalYER: Number(row.total_yer ?? 0),
    paymentType: row.payment_type as SalesInvoice["paymentType"],
    status: row.status as SalesInvoice["status"],
  };
}

function newSalesInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `INV-${date}-${suffix}`;
}

function SalesInvoicesPage() {
const navigate = useNavigate();
const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [pageError, setPageError] = useState("");
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("الكل");
const [showAddModal, setShowAddModal] = useState(false);
const [formData, setFormData] = useState({ clientName: "", clientPhone: "", city: "صنعاء", trackingCode: "", storeSource: "SHEIN" as SalesInvoice["storeSource"], productCost: "", shippingCost: "", customsFee: "", commissionFee: "10", localDeliveryFee: "3000", exchangeRateYER: "1610", paymentType: "دفع عند الاستلام (COD)" as SalesInvoice["paymentType"] });
useEffect(() => {
let active = true;
const loadInvoices = async () => {
setLoading(true);
setPageError("");
const { data, error } = await salesTable().select("*").order("created_at", { ascending: false });
if (!active) return;
if (error) {
setPageError("تعذر تحميل فواتير المبيعات. تحقق من جدول sales_invoices وسياسات RLS في قاعدة البيانات.");
setLoading(false);
return;
}
setInvoices(((data ?? []) as SalesInvoiceDbRow[]).map(mapSalesInvoice));
setLoading(false);
};
void loadInvoices();
return () => { active = false; };
}, []);
const filteredInvoices = useMemo(() => { const s = search?? ""; return invoices.filter(inv => { const matchSearch = inv.invoiceNo.toLowerCase().includes(s.toLowerCase()) || inv.trackingCode.toLowerCase().includes(s.toLowerCase()) || inv.clientName.includes(s) || inv.clientPhone.includes(s) || inv.city.includes(s); const matchStatus = statusFilter === "الكل" || inv.status === statusFilter; return matchSearch && matchStatus; }); }, [invoices, search, statusFilter]);
const stats = useMemo(() => { const totalSalesUSD = invoices.reduce((s, i) => s + i.totalUSD, 0); const pendingCOD_USD = invoices.filter(i => i.status === "بانتظار التحصيل عند التسليم").reduce((s, i) => s + i.totalUSD, 0); const paidUSD = invoices.filter(i => i.status === "مسدد بالكامل").reduce((s, i) => s + i.totalUSD, 0); const totalCommissionsUSD = invoices.reduce((s, i) => s + i.commissionFee, 0); return { totalSalesUSD, pendingCOD_USD, paidUSD, totalCommissionsUSD }; }, [invoices]);
const shareWhatsApp = (inv: SalesInvoice) => { const text = `مرحباً أخي الكريم ${inv.clientName}،\nفاتورة طلبك رقم: *${inv.invoiceNo}*\nكود الشحنة: *${inv.trackingCode}*\nالمصدر: *${inv.storeSource}*\n------------------\n- قيمة السلع: $${inv.productCost}\n- الشحن الدولي: $${inv.shippingCost}\n- الجمارك والرسوم: $${inv.customsFee}\n- عمولة الوسيط: $${inv.commissionFee}\n- توصيل داخلي: ${inv.localDeliveryFee.toLocaleString()} ر.ي\n------------------\n*الإجمالي المطلوب: $${inv.totalUSD}* (ما يعادل: ${inv.totalYER.toLocaleString()} ر.ي)\nحالة الدفع: *${inv.paymentType}*\n\nشكراً لاختيارك السوق الشامل!`; const cleanPhone = inv.clientPhone.startsWith("967")? inv.clientPhone : `967${inv.clientPhone.replace(/^0+/, "")}`; window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank"); };
const handleSaveInvoice = async (e: FormEvent<HTMLFormElement>) => {
e.preventDefault();
setPageError("");
if (!formData.clientName.trim() || !formData.clientPhone.trim() || !formData.productCost) {
setPageError("أدخل اسم العميل ورقم الهاتف وقيمة السلع.");
return;
}
const pCost = Number(formData.productCost);
const sCost = Number(formData.shippingCost || 0);
const cFee = Number(formData.customsFee || 0);
const commFee = Number(formData.commissionFee || 0);
const delFee = Number(formData.localDeliveryFee || 0);
const rate = Number(formData.exchangeRateYER);
const numbers = [pCost, sCost, cFee, commFee, delFee, rate];
if (numbers.some(value => !Number.isFinite(value) || value < 0) || rate <= 0) {
setPageError("تحقق من مبالغ الفاتورة وسعر الصرف؛ يجب أن تكون أرقامًا صحيحة غير سالبة وسعر الصرف أكبر من صفر.");
return;
}
const totalUSD = pCost + sCost + cFee + commFee;
const totalYER = Math.round(totalUSD * rate + delFee);
const paymentType = formData.paymentType;
const status: SalesInvoice["status"] = paymentType === "مدفوع مقدماً" ? "مسدد بالكامل" : "بانتظار التحصيل عند التسليم";
const invoiceDate = new Date().toISOString().slice(0, 10);
const payload = {
invoice_no: newSalesInvoiceNumber(),
invoice_date: invoiceDate,
client_name: formData.clientName.trim(),
client_phone: formData.clientPhone.trim(),
city: formData.city.trim() || null,
tracking_code: formData.trackingCode.trim() || null,
store_source: formData.storeSource,
product_cost: pCost,
shipping_cost: sCost,
customs_fee: cFee,
commission_fee: commFee,
local_delivery_fee: delFee,
total_usd: totalUSD,
exchange_rate_yer: rate,
total_yer: totalYER,
payment_type: paymentType,
status,
};
setSaving(true);
try {
const { data: authData, error: authError } = await supabase.auth.getUser();
if (authError || !authData.user) {
setPageError("انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.");
return;
}
const { data, error } = await salesTable().insert({ ...payload, created_by: authData.user.id }).select("*").single();
if (error) {
setPageError(error.code === "23505" ? "تعذر حفظ الفاتورة بسبب رقم مكرر. حاول إصدارها مرة أخرى." : "تعذر حفظ فاتورة المبيعات. تحقق من صلاحية المدير وسياسات RLS وأسماء أعمدة الجدول.");
return;
}
setInvoices(current => [mapSalesInvoice(data as SalesInvoiceDbRow), ...current]);
setShowAddModal(false);
setFormData({ clientName: "", clientPhone: "", city: "صنعاء", trackingCode: "", storeSource: "SHEIN", productCost: "", shippingCost: "", customsFee: "", commissionFee: "10", localDeliveryFee: "3000", exchangeRateYER: "1610", paymentType: "دفع عند الاستلام (COD)" });
} catch {
setPageError("حدث خطأ غير متوقع أثناء حفظ الفاتورة. بقي النموذج مفتوحًا؛ حاول مجددًا.");
} finally {
setSaving(false);
}
};
return (
<div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 md:p-8 font-['Cairo',sans-serif]"><div className="max-w-7xl mx-auto space-y-6">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-sky-100"><div className="flex items-center gap-3"><button onClick={() => navigate({ to: "/admin" })} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"><ArrowRight className="w-5 h-5" /></button><div><h1 className="text-xl md:text-2xl font-black text-[#0F4C81] flex items-center gap-2"><Receipt className="w-6 h-6 text-[#F97316]" />فواتير مبيعات وخدمات الوساطة</h1><p className="text-xs md:text-sm text-slate-500 font-medium">إصدار ومتابعة فواتير الشراء والشحن والعمولات للعملاء</p></div></div><div className="flex items-center gap-2"><button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-sm shadow-md transition"><Plus className="w-4 h-4" />إصدار فاتورة جديدة</button><button onClick={() => window.print()} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition" title="طباعة"><Printer className="w-5 h-5" /></button></div></div>
{pageError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{pageError}</div>}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm"><div className="flex items-center justify-between text-[#0F4C81] mb-2"><span className="text-xs font-bold">إجمالي المبيعات والخدمات</span><DollarSign className="w-5 h-5 bg-sky-50 p-1 rounded-lg" /></div><div className="text-2xl font-black text-slate-900">${stats.totalSalesUSD.toLocaleString()}</div><p className="text-[11px] text-slate-400 mt-1">{invoices.length} فواتير صادرة</p></div><div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm"><div className="flex items-center justify-between text-amber-600 mb-2"><span className="text-xs font-bold">مطلوب تحصيلها عند التسليم (COD)</span><Clock className="w-5 h-5 bg-amber-50 p-1 rounded-lg" /></div><div className="text-2xl font-black text-amber-600">${stats.pendingCOD_USD.toLocaleString()}</div><p className="text-[11px] text-slate-400 mt-1">مع سائقي التوصيل والنقاط</p></div><div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm"><div className="flex items-center justify-between text-emerald-600 mb-2"><span className="text-xs font-bold">مسدد ومحصل في الصناديق</span><CheckCircle2 className="w-5 h-5 bg-emerald-50 p-1 rounded-lg" /></div><div className="text-2xl font-black text-emerald-700">${stats.paidUSD.toLocaleString()}</div><p className="text-[11px] text-slate-400 mt-1">مدفوعات مؤكدة</p></div><div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm"><div className="flex items-center justify-between text-[#F97316] mb-2"><span className="text-xs font-bold">صافي عمولات الوساطة</span><TrendingUp className="w-5 h-5 bg-orange-50 p-1 rounded-lg" /></div><div className="text-2xl font-black text-[#F97316]">${stats.totalCommissionsUSD.toLocaleString()}</div><p className="text-[11px] text-slate-400 mt-1">أرباح الوساطة المقدرة</p></div></div>
<div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3"><div className="flex-1 relative"><Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" /><input type="text" placeholder="ابحث برقم الفاتورة، كود الشحنة (SQ-...)، اسم العميل، الهاتف، أو المدينة..." value={search?? ""} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pr-12 pl-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0F4C81] outline-none text-xs md:text-sm font-medium transition" /></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500 whitespace-nowrap">الحالة:</span>{["الكل", "مسدد بالكامل", "بانتظار التحصيل عند التسليم"].map((st) => (<button key={st} onClick={() => setStatusFilter(st)} className={`text-xs font-bold px-3 py-2 rounded-xl transition ${statusFilter === st? "bg-[#0F4C81] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{st}</button>))}</div></div>
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-right text-xs md:text-sm"><thead className="bg-[#0F4C81]/5 text-[#0F4C81] text-xs font-bold border-b border-sky-100"><tr><th className="py-3 px-4">رقم الفاتورة</th><th className="py-3 px-4">العميل والتواصل</th><th className="py-3 px-4">الشحنة والمصدر</th><th className="py-3 px-4 text-center">تفصيل التكلفة ($)</th><th className="py-3 px-4 text-center">الإجمالي ($ / ر.ي)</th><th className="py-3 px-4 text-center">طريقة الدفع والحالة</th><th className="py-3 px-4 text-center">الإجراءات</th></tr></thead><tbody className="divide-y divide-slate-100 font-medium">{loading ? <tr><td colSpan={7} className="py-10 text-center text-slate-500">جارٍ تحميل الفواتير…</td></tr> : filteredInvoices.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-slate-500">لا توجد فواتير مطابقة.</td></tr> : filteredInvoices.map((inv) => (<tr key={inv.id} className="hover:bg-slate-50/80 transition"><td className="py-3.5 px-4"><div className="font-mono font-bold text-[#0F4C81]">{inv.invoiceNo}</div><div className="text-[11px] text-slate-400 mt-0.5">{inv.date}</div></td><td className="py-3.5 px-4"><div className="font-bold text-slate-900">{inv.clientName}</div><div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-slate-400" />{inv.clientPhone} • {inv.city}</div></td><td className="py-3.5 px-4"><div className="font-mono font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded inline-block text-xs">{inv.trackingCode}</div><div className="text-[11px] text-[#F97316] font-bold mt-1 flex items-center gap-1"><Store className="w-3 h-3" />{inv.storeSource}</div></td><td className="py-3.5 px-4 text-center text-[11px] text-slate-600"><div>سلع: ${inv.productCost}</div><div>شحن: ${inv.shippingCost} | جمارك: ${inv.customsFee}</div><div className="text-[#F97316] font-bold">عمولة: ${inv.commissionFee}</div></td><td className="py-3.5 px-4 text-center"><div className="font-black text-slate-900 text-sm">${inv.totalUSD}</div><div className="text-[11px] font-bold text-emerald-700 mt-0.5">{inv.totalYER.toLocaleString()} ر.ي</div></td><td className="py-3.5 px-4 text-center"><div className="text-[11px] font-bold text-slate-700 mb-1">{inv.paymentType}</div><span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${inv.status === 'مسدد بالكامل'? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{inv.status}</span></td><td className="py-3.5 px-4 text-center"><div className="flex items-center justify-center gap-1.5"><button onClick={() => shareWhatsApp(inv)} title="مشاركة الفاتورة بالواتساب" className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"><Share2 className="w-4 h-4" /></button><button onClick={() => window.print()} title="طباعة الفاتورة" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"><Printer className="w-4 h-4" /></button></div></td></tr>))}</tbody></table></div></div>
{showAddModal && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between pb-3 border-b border-slate-100"><h3 className="font-black text-lg text-[#0F4C81] flex items-center gap-2"><Receipt className="w-5 h-5 text-[#F97316]" />إصدار فاتورة مبيعات جديدة للعميل</h3><button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold">✕</button></div>{pageError && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800">{pageError}</div>}<form onSubmit={handleSaveInvoice} className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-600 block mb-1">اسم العميل</label><input required placeholder="محمد عبد الله..." value={formData.clientName?? ""} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0F4C81]" /></div><div><label className="text-xs font-bold text-slate-600 block mb-1">رقم الهاتف</label><input required placeholder="77..." value={formData.clientPhone?? ""} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]" /></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-bold text-slate-600 block mb-1">المدينة / الفرع</label><input value={formData.city?? ""} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0F4C81]" /></div><div><label className="text-xs font-bold text-slate-600 block mb-1">كود الشحنة (اختياري)</label><input placeholder="SQ-800..." value={formData.trackingCode?? ""} onChange={e => setFormData({...formData, trackingCode: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]" /></div><div><label className="text-xs font-bold text-slate-600 block mb-1">المتجر المصدر</label><select value={formData.storeSource?? "SHEIN"} onChange={e => setFormData({...formData, storeSource: e.target.value as any})} className="w-full h-10 px-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none"><option value="SHEIN">SHEIN</option><option value="AliExpress">AliExpress</option><option value="Trendyol">Trendyol</option><option value="Amazon">Amazon</option><option value="Alibaba">Alibaba</option></select></div></div><div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100 space-y-3"><h4 className="text-xs font-black text-[#0F4C81]">تفصيل بنود التكلفة والعمولة:</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2"><div><label className="text-[11px] font-bold text-slate-600 block mb-1">قيمة السلع ($)</label><input required type="number" step="0.1" placeholder="100" value={formData.productCost?? ""} onChange={e => setFormData({...formData, productCost: e.target.value})} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono bg-white" /></div><div><label className="text-[11px] font-bold text-slate-600 block mb-1">الشحن الدولي ($)</label><input type="number" step="0.1" placeholder="25" value={formData.shippingCost?? ""} onChange={e => setFormData({...formData, shippingCost: e.target.value})} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono bg-white" /></div><div><label className="text-[11px] font-bold text-slate-600 block mb-1">الجمارك والرسوم ($)</label><input type="number" step="0.1" placeholder="10" value={formData.customsFee?? ""} onChange={e => setFormData({...formData, customsFee: e.target.value})} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono bg-white" /></div><div><label className="text-[11px] font-bold text-slate-600 block mb-1">عمولة الوسيط ($)</label><input type="number" step="0.1" value={formData.commissionFee?? ""} onChange={e => setFormData({...formData, commissionFee: e.target.value})} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono bg-white" /></div></div><div className="grid grid-cols-2 gap-2 pt-1"><div><label className="text-[11px] font-bold text-slate-600 block mb-1">توصيل داخلي (ر.ي)</label><input type="number" value={formData.localDeliveryFee?? ""} onChange={e => setFormData({...formData, localDeliveryFee: e.target.value})} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono bg-white" /></div><div><label className="text-[11px] font-bold text-slate-600 block mb-1">سعر الصرف (ر.ي/$)</label><input type="number" value={formData.exchangeRateYER?? ""} onChange={e => setFormData({...formData, exchangeRateYER: e.target.value})} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono bg-white" /></div></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-600 block mb-1">طريقة الدفع</label><select value={formData.paymentType?? "دفع عند الاستلام (COD)"} onChange={e => setFormData({...formData, paymentType: e.target.value as any})} className="w-full h-10 px-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none"><option value="دفع عند الاستلام (COD)">دفع عند الاستلام (COD)</option><option value="مدفوع مقدماً">مدفوع مقدماً</option><option value="سداد جزئي">سداد جزئي</option></select></div></div><div className="pt-3 flex gap-2"><button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] disabled:opacity-60 text-white font-bold text-sm shadow-md transition">{saving ? "جارٍ الحفظ…" : "حفظ وإصدار الفاتورة"}</button><button type="button" onClick={() => setShowAddModal(false)} className="px-4 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition">إلغاء</button></div></form></div></div>)}
</div></div>
);
}

function ProtectedSalesInvoicesPage() {
return <AdminRouteGuard><SalesInvoicesPage /></AdminRouteGuard>;
}
