import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  RotateCcw, AlertTriangle, CheckCircle2, Clock, Search, Filter, Plus,
  ArrowRight, Eye, FileText, DollarSign, MessageSquare, X,
} from "lucide-react";

export const Route = createFileRoute("/purchase-returns")({
  head: () => ({
    meta: [
      { title: "المرتجعات ونزاعات المتاجر — السوق الشامل" },
      { name: "description", content: "متابعة نزاعات الاسترداد مع المتاجر العالمية وتعويضات العملاء." },
      { property: "og:title", content: "المرتجعات ونزاعات المتاجر — السوق الشامل" },
      { property: "og:description", content: "متابعة نزاعات الاسترداد مع المتاجر العالمية وتعويضات العملاء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PurchaseReturnsPage,
});

type Store = "AliExpress" | "SHEIN" | "Amazon" | "Trendyol" | "TEMU";
type Reason = "تالف ومكسور" | "مقاس/لون غير مطابق" | "لم يصل/مفقود" | "إلغاء قبل الشحن" | "بضاعة مقلدة";
type Settlement = "إيداع بمحفظة العميل" | "استرداد نقدي كاش" | "إعادة طلب بديل" | "قيد الرصيد بالبطاقة";
type StoreStatus = "قيد فتح النزاع" | "بانتظار رد المتجر" | "تم قبول الاسترداد" | "نزاع مرفوض";
type CustStatus = "بانتظار تسوية المتجر" | "تم تعويض العميل" | "قيد الفحص والمطابقة";

interface ReturnClaim {
  id: string; claimNumber: string; trackingCode: string; customerName: string; customerPhone: string;
  storeName: Store; externalOrderNumber: string; productTitle: string; reason: Reason;
  claimAmountUSD: number; refundAmountUSD: number; compensationYER: number;
  settlementMethod: Settlement; storeDisputeStatus: StoreStatus; customerStatus: CustStatus;
  date: string; notes: string;
}

const RATE = 1610;
const STORAGE_KEY = "shamel_claims_data";

const INITIAL_CLAIMS: ReturnClaim[] = [
  { id: "CLM-001", claimNumber: "DISP-2026-031", trackingCode: "SQ-800816", customerName: "محمد الأصبحي", customerPhone: "777123456", storeName: "AliExpress", externalOrderNumber: "AE-9821401", productTitle: "شاشة لابتوب بديلة 15.6 بوصة FHD", reason: "تالف ومكسور", claimAmountUSD: 68.5, refundAmountUSD: 68.5, compensationYER: 110285, settlementMethod: "إيداع بمحفظة العميل", storeDisputeStatus: "تم قبول الاسترداد", customerStatus: "تم تعويض العميل", date: "2026-09-28", notes: "تم إرفاق فيديو فتح الطرد وصور الكسر وقبل المتجر الاسترجاع كاملاً." },
  { id: "CLM-002", claimNumber: "DISP-2026-032", trackingCode: "SQ-800822", customerName: "سارة القاسمي", customerPhone: "771987654", storeName: "SHEIN", externalOrderNumber: "SH-4412093", productTitle: "طقم فستان سهرة - مقاس غير مطابق", reason: "مقاس/لون غير مطابق", claimAmountUSD: 42, refundAmountUSD: 0, compensationYER: 0, settlementMethod: "إيداع بمحفظة العميل", storeDisputeStatus: "بانتظار رد المتجر", customerStatus: "بانتظار تسوية المتجر", date: "2026-10-01", notes: "المتجر طلب صور علامة القياس، تم إرسالها وبانتظار الرد خلال 48 ساعة." },
  { id: "CLM-003", claimNumber: "DISP-2026-033", trackingCode: "SQ-800799", customerName: "مؤسسة الأفق للتجارة", customerPhone: "733445566", storeName: "Trendyol", externalOrderNumber: "TY-781920", productTitle: "شحنة أحذية رياضية جملة (ناقص 4 قطع)", reason: "لم يصل/مفقود", claimAmountUSD: 145, refundAmountUSD: 145, compensationYER: 233450, settlementMethod: "استرداد نقدي كاش", storeDisputeStatus: "تم قبول الاسترداد", customerStatus: "قيد الفحص والمطابقة", date: "2026-09-25", notes: "المتجر رد المبلغ، بانتظار صرف السند للتاجر نقداً." },
  { id: "CLM-004", claimNumber: "DISP-2026-034", trackingCode: "SQ-800845", customerName: "مروان الصلوي", customerPhone: "770112233", storeName: "Amazon", externalOrderNumber: "AMZ-112-99812", productTitle: "ساعة ذكية - توقف الشاحن", reason: "تالف ومكسور", claimAmountUSD: 89.99, refundAmountUSD: 89.99, compensationYER: 144883, settlementMethod: "إعادة طلب بديل", storeDisputeStatus: "تم قبول الاسترداد", customerStatus: "تم تعويض العميل", date: "2026-09-20", notes: "تمت الموافقة دون إعادة الشحنة، وعُمل طلب بديل للعميل." },
];

const STORES: Store[] = ["AliExpress", "SHEIN", "Amazon", "Trendyol", "TEMU"];
const REASONS: Reason[] = ["تالف ومكسور", "مقاس/لون غير مطابق", "لم يصل/مفقود", "إلغاء قبل الشحن", "بضاعة مقلدة"];
const SETTLEMENTS: Settlement[] = ["إيداع بمحفظة العميل", "استرداد نقدي كاش", "إعادة طلب بديل", "قيد الرصيد بالبطاقة"];
const STORE_STATUSES: StoreStatus[] = ["قيد فتح النزاع", "بانتظار رد المتجر", "تم قبول الاسترداد", "نزاع مرفوض"];
const CUST_STATUSES: CustStatus[] = ["بانتظار تسوية المتجر", "قيد الفحص والمطابقة", "تم تعويض العميل"];

const emptyForm = {
  trackingCode: "", customerName: "", customerPhone: "", storeName: "AliExpress" as Store,
  externalOrderNumber: "", productTitle: "", reason: "تالف ومكسور" as Reason, claimAmountUSD: 0,
  settlementMethod: "إيداع بمحفظة العميل" as Settlement, notes: "",
};

function openWhatsApp(phone: string, text: string) {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (!clean.startsWith("967")) clean = "967" + clean;
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
}

function PurchaseReturnsPage() {
  const [claims, setClaims] = useState<ReturnClaim[]>(INITIAL_CLAIMS);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "store_disputes" | "customer_refunds">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [viewClaim, setViewClaim] = useState<ReturnClaim | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setClaims(JSON.parse(saved) as ReturnClaim[]);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  }, [claims, loaded]);

  const stats = useMemo(() => ({
    total: claims.length,
    openDisputes: claims.filter((c) => c.storeDisputeStatus === "بانتظار رد المتجر" || c.storeDisputeStatus === "قيد فتح النزاع").length,
    refundedUSD: claims.reduce((s, c) => s + c.refundAmountUSD, 0),
    compensatedYER: claims.filter((c) => c.customerStatus === "تم تعويض العميل").reduce((s, c) => s + c.compensationYER, 0),
  }), [claims]);

  const filtered = useMemo(() => claims.filter((c) => {
    if (activeTab === "store_disputes" && c.storeDisputeStatus === "تم قبول الاسترداد") return false;
    if (activeTab === "customer_refunds" && c.customerStatus !== "تم تعويض العميل") return false;
    if (selectedStore !== "ALL" && c.storeName !== selectedStore) return false;
    if (selectedStatus !== "ALL" && c.storeDisputeStatus !== selectedStatus) return false;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return [c.claimNumber, c.trackingCode, c.customerName, c.externalOrderNumber, c.productTitle, c.customerPhone]
        .some((v) => v.toLowerCase().includes(q));
    }
    return true;
  }), [claims, activeTab, selectedStore, selectedStatus, searchQuery]);

  const updateClaim = (id: string, patch: Partial<ReturnClaim>) => {
    setClaims((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch };
      if (patch.storeDisputeStatus === "تم قبول الاسترداد" && next.refundAmountUSD === 0) next.refundAmountUSD = next.claimAmountUSD;
      return next;
    }));
    setViewClaim((v) => (v && v.id === id ? { ...v, ...patch } : v));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.claimAmountUSD) || 0;
    const newClaim: ReturnClaim = {
      ...formData,
      id: `CLM-${Date.now()}`,
      claimNumber: `DISP-2026-${Math.floor(100 + Math.random() * 900)}`,
      externalOrderNumber: formData.externalOrderNumber || `EXT-${Date.now().toString().slice(-6)}`,
      claimAmountUSD: amount,
      refundAmountUSD: 0,
      compensationYER: Math.round(amount * RATE),
      storeDisputeStatus: "بانتظار رد المتجر",
      customerStatus: "بانتظار تسوية المتجر",
      date: new Date().toISOString().slice(0, 10),
    };
    setClaims((prev) => [newClaim, ...prev]);
    setIsNewModalOpen(false);
    setFormData(emptyForm);
  };

  const inputCls = "w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white";

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F0F7FF] to-[#FFF9F5] text-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/90 p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600" title="العودة للإدارة">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#0A2540]">إدارة المرتجعات ومطالبات النزاع</h1>
              <p className="text-sm text-slate-500">قضايا الاسترداد مع المتاجر العالمية وتعويضات العملاء</p>
            </div>
          </div>
          <button onClick={() => setIsNewModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-bold text-sm shadow-md">
            <Plus className="w-4 h-4" /> فتح مطالبة جديدة
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="إجمالي النزاعات" value={String(stats.total)} sub="مطالبات داخلية وخارجية" icon={<FileText className="w-4 h-4" />} tone="text-[#0F4C81]" />
          <Kpi label="قيد المتابعة" value={String(stats.openDisputes)} sub="بانتظار رد المتجر" icon={<Clock className="w-4 h-4" />} tone="text-amber-600" />
          <Kpi label="مستردات المتاجر" value={`$${stats.refundedUSD.toFixed(2)}`} sub="مبالغ استرجعت لبطاقاتنا" icon={<DollarSign className="w-4 h-4" />} tone="text-emerald-600" />
          <Kpi label="تعويضات العملاء" value={`${stats.compensatedYER.toLocaleString()} ر.ي`} sub="نقداً أو عبر المحفظة" icon={<CheckCircle2 className="w-4 h-4" />} tone="text-[#0284C7]" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap gap-2">
              {([["all", `جميع المطالبات (${claims.length})`], ["store_disputes", "نزاعات نشطة مع المتاجر"], ["customer_refunds", "تم تعويض العميل"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === k ? "bg-[#0F4C81] text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
              ))}
            </div>
            <span className="text-xs text-slate-400">النتائج: {filtered.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم المطالبة، الشحنة، العميل، الهاتف..." className={`${inputCls} pr-9`} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className={inputCls}>
                <option value="ALL">جميع المتاجر</option>
                {STORES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={inputCls}>
              <option value="ALL">جميع حالات النزاع</option>
              {STORE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-l from-[#F0F7FF] to-white text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">المطالبة والشحنة</th><th className="p-4">العميل</th><th className="p-4">المتجر والمنتج</th>
                  <th className="p-4">السبب</th><th className="p-4">المبلغ</th><th className="p-4">حالة المتجر</th>
                  <th className="p-4">حالة العميل</th><th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">لا توجد مطالبات مطابقة.</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30">
                    <td className="p-4">
                      <div className="font-mono font-bold text-[#0F4C81]">{c.claimNumber}</div>
                      <div className="font-mono text-[11px] text-slate-500">📦 {c.trackingCode}</div>
                      <div className="text-[10px] text-slate-400">{c.date}</div>
                    </td>
                    <td className="p-4"><div className="font-bold">{c.customerName}</div><div className="font-mono text-slate-500 text-[11px]">{c.customerPhone}</div></td>
                    <td className="p-4 max-w-[200px]">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 mb-1">{c.storeName}</span>
                      <div className="truncate" title={c.productTitle}>{c.productTitle}</div>
                      <div className="font-mono text-[10px] text-slate-400">{c.externalOrderNumber}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${c.reason === "تالف ومكسور" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                        <AlertTriangle className="w-3 h-3" />{c.reason}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold font-mono">${c.claimAmountUSD.toFixed(2)}</div>
                      <div className="text-[11px] font-mono text-emerald-600">≈ {c.compensationYER.toLocaleString()} ر.ي</div>
                      <div className="text-[10px] text-slate-400">{c.settlementMethod}</div>
                    </td>
                    <td className="p-4">
                      <select value={c.storeDisputeStatus} onChange={(e) => updateClaim(c.id, { storeDisputeStatus: e.target.value as StoreStatus })}
                        className={`rounded-full px-2 py-1 text-[11px] font-bold border-0 ${c.storeDisputeStatus === "تم قبول الاسترداد" ? "bg-emerald-100 text-emerald-800" : c.storeDisputeStatus === "نزاع مرفوض" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                        {STORE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <select value={c.customerStatus} onChange={(e) => updateClaim(c.id, { customerStatus: e.target.value as CustStatus })}
                        className={`rounded-full px-2 py-1 text-[11px] font-bold border-0 ${c.customerStatus === "تم تعويض العميل" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                        {CUST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setViewClaim(c)} title="التفاصيل" className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600"><Eye className="w-3.5 h-3.5" /></button>
                        <button title="واتساب" className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                          onClick={() => openWhatsApp(c.customerPhone, `مرحباً ${c.customerName}، مستجدات مطالبتكم (${c.claimNumber}) لشحنة (${c.trackingCode}): حالة المتجر: ${c.storeDisputeStatus}. حالة التعويض: ${c.customerStatus}. السوق الشامل في خدمتكم.`)}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewClaim(null)}>
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <div><h3 className="text-lg font-black">تفاصيل المطالبة: {viewClaim.claimNumber}</h3><p className="text-xs text-slate-400">شحنة: {viewClaim.trackingCode}</p></div>
              <button onClick={() => setViewClaim(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Info label="العميل" value={`${viewClaim.customerName} (${viewClaim.customerPhone})`} />
              <Info label="المتجر" value={`${viewClaim.storeName} - ${viewClaim.externalOrderNumber}`} />
              <Info label="قيمة المطالبة" value={`$${viewClaim.claimAmountUSD} (${viewClaim.compensationYER.toLocaleString()} ر.ي)`} />
              <Info label="طريقة التسوية" value={viewClaim.settlementMethod} />
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900">
              <span className="font-bold block mb-1">ملاحظات وقرار الفحص:</span>{viewClaim.notes || "لا توجد ملاحظات."}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { if (window.confirm("حذف المطالبة نهائياً؟")) { setClaims((p) => p.filter((x) => x.id !== viewClaim.id)); setViewClaim(null); } }} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs">حذف</button>
              <button onClick={() => setViewClaim(null)} className="px-5 py-2 rounded-xl bg-slate-100 font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black">فتح مطالبة نزاع / إرجاع جديدة</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Field label="كود الشحنة *"><input required placeholder="SQ-800816" value={formData.trackingCode} onChange={(e) => setFormData({ ...formData, trackingCode: e.target.value })} className={inputCls} /></Field>
                <Field label="اسم العميل *"><input required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className={inputCls} /></Field>
                <Field label="هاتف العميل"><input placeholder="77XXXXXXX" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className={inputCls} /></Field>
                <Field label="المتجر"><select value={formData.storeName} onChange={(e) => setFormData({ ...formData, storeName: e.target.value as Store })} className={inputCls}>{STORES.map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="رقم طلب المتجر"><input value={formData.externalOrderNumber} onChange={(e) => setFormData({ ...formData, externalOrderNumber: e.target.value })} className={inputCls} /></Field>
                <Field label="سبب المطالبة"><select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value as Reason })} className={inputCls}>{REASONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
              </div>
              <Field label="وصف المنتج"><input value={formData.productTitle} onChange={(e) => setFormData({ ...formData, productTitle: e.target.value })} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="قيمة المطالبة ($)"><input type="number" step="0.01" value={formData.claimAmountUSD || ""} onChange={(e) => setFormData({ ...formData, claimAmountUSD: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
                <Field label="طريقة التسوية"><select value={formData.settlementMethod} onChange={(e) => setFormData({ ...formData, settlementMethod: e.target.value as Settlement })} className={inputCls}>{SETTLEMENTS.map((s) => <option key={s}>{s}</option>)}</select></Field>
              </div>
              <Field label="ملاحظات وأدلة (صور/فيديو)"><textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={inputCls} /></Field>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold">تسجيل المطالبة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-400">{label}</span><span className={tone}>{icon}</span></div>
      <div className={`text-xl md:text-2xl font-black ${tone}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block mb-1">{label}:</span><span className="font-bold">{value}</span></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block font-bold text-slate-700 mb-1">{label}</span>{children}</label>;
}
