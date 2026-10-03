import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Bell,
  Send,
  Clock,
  Copy,
  Check,
  FolderTree,
  Home,
  MapPin,
  Package,
  PlusCircle,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedLogo } from "@/components/admin/Logo";
import { AccountsTreeModal } from "@/components/admin/AccountsTreeModal";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AddShipmentModal } from "@/components/admin/AddShipmentModal";
import { QuickScanModal } from "@/components/admin/QuickScanModal";
import { PrintReceiptModal } from "@/components/admin/PrintReceiptModal";
import { INITIAL_SEED_ORDERS } from "@/components/admin/seed-data";
import type { OrderItem, OrderStatus } from "@/components/admin/types";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
let supabaseClientInstance: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try { supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch {}
}

function AdminNotificationComposer() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('shipment');
  const [href, setHref] = useState('/track');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const sendNotification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() ||!body.trim()) return;
    setSending(true);
    setMessage('');
    const { error } = await supabase.from('notifications').insert({
      title: title.trim(),
      body: body.trim(),
      kind,
      href: href || null,
      is_active: true,
    });
    setSending(false);
    if (error) {
      setMessage('تعذر إرسال الإشعار. تأكد من صلاحية حساب الإدارة.');
      return;
    }
    setTitle('');
    setBody('');
    setMessage('تم إرسال الإشعار للعملاء فوراً.');
  };

  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm" dir="rtl">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-700"><Bell className="size-4" /></span>
        <div><h2 className="text-sm font-black text-[#0A2540]">إرسال إشعار للعملاء</h2><p className="text-[11px] text-slate-500">سيظهر في الجرس والشريط العلوي عند الإرسال فقط.</p></div>
      </div>
      <form onSubmit={sendNotification} className="grid gap-2.5 lg:grid-cols-[1.1fr_1.5fr_180px_150px_auto]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان الإشعار" required maxLength={120} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-[#0A2540] outline-none focus:border-orange-400" />
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="نص الإشعار" required maxLength={300} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-[#0A2540] outline-none focus:border-orange-400" />
        <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-[#0A2540] outline-none">
          <option value="shipment">تحديث شحنة</option><option value="purchase">تأكيد شراء</option><option value="offer">عرض</option><option value="support">خدمة العملاء</option><option value="system">عام</option>
        </select>
        <select value={href} onChange={(event) => setHref(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-[#0A2540] outline-none">
          <option value="/track">تتبع الشحنة</option><option value="/my-account">الحساب</option><option value="/new-order">طلب جديد</option><option value="/notifications">كل الإشعارات</option>
        </select>
        <button disabled={sending} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"><Send className="size-3.5" />{sending? 'جارٍ الإرسال' : 'إرسال'}</button>
      </form>
      {message && <p className={`mt-2 text-[11px] font-bold ${message.startsWith('تم')? 'text-emerald-600' : 'text-rose-600'}`}>{message}</p>}
    </section>
  );
}

function AdminOperationsDashboard() {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_shipments_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SEED_ORDERS;
  });

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);

  const navigateTo = (path: string) => {
    if (typeof window!== "undefined") window.location.href = path;
  };

  useEffect(() => {
    try { localStorage.setItem("alsouk_admin_shipments_v1", JSON.stringify(orders)); } catch {}
  }, [orders]);

  const fetchOrders = async () => {
    setLoading(true);
    if (supabaseClientInstance) {
      try {
        const { data, error } = await supabaseClientInstance.from("orders").select("*").order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          setOrders(data.map((item: any) => ({
            id: String(item.id),
            orderNumber: item.order_number || item.orderNumber || `SQ-${item.id}`,
            customerName: item.customer_name || item.customerName || "عميل بدون اسم",
            customerPhone: item.customer_phone || item.customerPhone || "770000000",
            customerCity: item.customer_city || item.customerCity || "صنعاء",
            productTitle: item.product_title || item.productTitle || "شحنة دولية",
            storeName: item.store_name || item.storeName || "SHEIN",
            status: (item.status as OrderStatus) || "new",
            originalPrice: Number(item.original_price || item.originalPrice || 0),
            intlTrackingNumber: item.intl_tracking_number || item.intlTrackingNumber || `SQ-${item.id}`,
            createdAt: item.created_at || new Date().toISOString(),
          })));
        }
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId? {...o, status: newStatus, updatedAt: new Date().toISOString() } : o)));
    if (supabaseClientInstance) { try { await (supabaseClientInstance as any).from("orders").update({ status: newStatus }).eq("id", orderId); } catch {} }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشحنة (${orderNumber}) نهائياً؟`)) return;
    setOrders((prev) => prev.filter((o) => o.id!== orderId));
    if (supabaseClientInstance) { try { await (supabaseClientInstance as any).from("orders").delete().eq("id", orderId); } catch {} }
  };

  const copyTracking = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedTracking(id);
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  const handleExportCSV = () => {
    const headers = ["رقم الطلب", "العميل", "الهاتف", "المدينة", "المتجر", "الحالة", "السعر", "رقم التتبع", "التاريخ"];
    const rows = orders.map((o) => [o.orderNumber, `"${o.customerName}"`, o.customerPhone, `"${o.customerCity || "صنعاء"}"`, o.storeName, o.status, o.originalPrice, o.intlTrackingNumber || o.orderNumber, o.createdAt.split("T")[0]]);
    const csv = "\uFEFF" + [headers.join(","),...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `alsouk_shipments_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueCities = useMemo(() => {
    const c = new Set<string>();
    orders.forEach((o) => { if (o.customerCity) c.add(o.customerCity); });
    return Array.from(c);
  }, [orders]);

  const filteredOrders = useMemo(() => orders.filter((o) => {
    if (statusFilter!== "all" && o.status!== statusFilter) return false;
    if (cityFilter!== "all" && o.customerCity!== cityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q))) return false;
    }
    return true;
  }), [orders, statusFilter, cityFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "new" || o.status === "reviewing").length;
    const shipped = orders.filter((o) => o.status === "shipped" || o.status === "international_ship" || o.status === "warehouse_china").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const totalCOD = orders.filter((o) => o.status!== "cancelled").reduce((sum, o) => sum + (o.originalPrice || 0), 0);
    return {
      total, pending, shipped, delivered, cancelled, totalCOD,
      pendingPercent: total > 0? Math.round((pending / total) * 100) : 0,
      shippedPercent: total > 0? Math.round((shipped / total) * 100) : 0,
      deliveredPercent: total > 0? Math.round((delivered / total) * 100) : 0,
      deliverySuccessRate: total > 0? Math.round((delivered / (total - pending || 1)) * 100) : 100,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans selection:bg-[#0284C7] selection:text-white pb-20" dir="rtl">
      <div className="bg-gradient-to-r from-[#0B2545] via-[#0F4C81] to-[#0284C7] text-white px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-md border-b border-[#134074]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold">نظام السوق الشامل - النسخة الحية</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 w-full sm:w-auto justify-start sm:justify-end">
          <button onClick={() => setIsAccountsTreeOpen(true)} className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95">
            <FolderTree className="w-3.5 h-3.5 text-amber-300" /><span>شجرة الحسابات</span>
          </button>
          <button onClick={() => navigateTo("/admin-clients")} className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95">
            <User className="w-3.5 h-3.5 text-sky-200" /><span>إدارة العملاء</span>
          </button>
          <button onClick={() => navigateTo("/new-order")} className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95">
            <Zap className="w-3.5 h-3.5 text-white" /><span>اطلب الآن</span>
          </button>
          <button onClick={() => navigateTo("/track")} className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95">
            <Search className="w-3.5 h-3.5 text-orange-300" /><span className="hidden sm:inline">تتبع الشحنة</span><span className="sm:hidden">تتبع</span>
          </button>
          <button onClick={() => navigateTo("/")} className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95">
            <Home className="w-3.5 h-3.5 text-sky-200" /><span className="hidden md:inline">المتجر</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        <header className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full lg:w-auto">
            <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col justify-center items-center gap-1 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] hover:from-[#0A2540] hover:to-[#0F4C81] border border-sky-300/40 shadow-md cursor-pointer transition active:scale-95 group shrink-0">
              <span className="w-5 sm:w-6 h-0.5 sm:h-1 rounded-full bg-white group-hover:bg-orange-300 transition-all"></span>
              <span className="w-5 sm:w-6 h-0.5 sm:h-1 rounded-full bg-orange-400 group-hover:bg-white transition-all"></span>
              <span className="w-5 sm:w-6 h-0.5 sm:h-1 rounded-full bg-white group-hover:bg-orange-300 transition-all"></span>
            </button>
            <EmbeddedLogo size="sm" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>لوحة العمليات</span>
            </div>
          </div>

          <div className="relative w-full lg:w-72 xl:w-80">
            <input type="text" placeholder="ابحث برقم التتبع (مثل: SQ-892411)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs text-[#0A2540] placeholder-slate-400 outline-none focus:border-[#0284C7] focus:bg-white transition font-mono" />
            <Search className="w-4 h-4 text-sky-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between sm:justify-end">
            <button onClick={() => { setIsQuickScanOpen(true); }} className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[#0F4C81] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
              <ScanLine className="w-3.5 h-3.5 text-[#0284C7]" /><span>فحص سريع</span>
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] text-white text-xs font-black shadow-md shadow-orange-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95">
              <PlusCircle className="w-4 h-4" /><span>+ شحنة جديدة</span>
            </button>
            <button onClick={fetchOrders} disabled={loading} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer" title="تحديث">
              <RefreshCw className={`w-3.5 h-3.5 ${loading? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>
        </header>

        <AdminNotificationComposer />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
              <h1 className="text-xl sm:text-2xl font-black text-[#0A2540] tracking-tight">لوحة عمليات الشحن والتوزيع</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">متابعة الشحنات، تحديث الحالات، إدارة بوليصات الشحن والتحصيل الفوري</p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-sky-200 text-[#0F4C81] text-xs font-mono font-bold flex items-center gap-2 shadow-xs self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-orange-500" /><span>اليوم: {new Date().toISOString().split("T")[0]}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { to: "/prices", label: "الأسعار والشحن", icon: "🧮" },
            { to: "/employees", label: "الموظفين", icon: "👥" },
            { to: "/merchant-reports", label: "التجار والجملة", icon: "🏪" },
            { to: "/client-reports", label: "كشوفات العملاء", icon: "📊" },
            { to: "/inventory", label: "المخزون", icon: "📦" },
            { to: "/purchase-invoices", label: "فواتير المشتريات", icon: "🧾" },
            { to: "/sales-invoices", label: "فواتير المبيعات", icon: "💵" },
            { to: "/purchase-returns", label: "المرتجعات", icon: "↩️" },
          ].map((s) => (
            <button
              key={s.to}
              onClick={() => navigateTo(s.to)}
              className="bg-white border border-blue-100 rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm hover:border-orange-300 hover:shadow-md transition active:scale-95 cursor-pointer"
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-[11px] font-black text-[#0A2540]">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {[
            { label: "إجمالي الطلبات", value: stats.total, percent: "100%", icon: Package, color: "from-[#0F4C81] to-[#0284C7]", iconColor: "text-orange-300", filter: "all", activeColor: "border-orange-500 ring-orange-200", borderColor: "border-sky-200/90" },
            { label: "قيد الانتظار", value: stats.pending, percent: `${stats.pendingPercent}%`, icon: Clock, color: "bg-amber-500", iconColor: "", filter: "new", activeColor: "border-amber-500 ring-amber-200", borderColor: "border-amber-200/80" },
            { label: "تم الشحن", value: stats.shipped, percent: `${stats.shippedPercent}%`, icon: Truck, color: "bg-[#0284C7]", iconColor: "", filter: "shipped", activeColor: "border-[#0284C7] ring-sky-200", borderColor: "border-sky-200/80" },
            { label: "تم التوصيل", value: stats.delivered, percent: `${stats.deliveredPercent}%`, icon: CheckCircle2, color: "bg-emerald-600", iconColor: "", filter: "delivered", activeColor: "border-emerald-500 ring-emerald-200", borderColor: "border-emerald-200/80" },
          ].map((card) => {
            const Icon = card.icon;
            const isActive = statusFilter === card.filter;
            return (
              <div key={card.label} onClick={() => setStatusFilter(card.filter)} className={`rounded-2xl p-3.5 sm:p-5 cursor-pointer transition relative overflow-hidden bg-white shadow-sm ${isActive? `border-2 ${card.activeColor} shadow-md ring-2` : `border ${card.borderColor} hover:border-orange-400`}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] sm:text-xs font-bold">{card.percent}</span>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-xs`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#0A2540] font-mono mb-0.5">{card.value}</div>
                <div className="text-xs sm:text-sm font-black text-slate-800">{card.label}</div>
                <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-orange-500">{isActive? "تصفية مفعلة" : "انقر للتصفية"}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold">$</div>
              <span className="text-slate-600">إجمالي التحصيل (COD):</span>
              <span className="text-[#0A2540] font-black font-mono text-sm">{stats.totalCOD.toLocaleString()} ر.س</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-rose-600"><span>ملغاة:</span><span className="font-mono font-black">{stats.cancelled} طلب</span></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-left md:text-right">
              <div className="text-xs text-slate-500 font-bold">معدل الإنجاز والتسليم</div>
              <div className="text-emerald-600 font-mono font-black text-sm flex items-center gap-1"><span>{stats.deliverySuccessRate}%</span><span>نسبة تسليم ناجحة</span></div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-1 w-full lg:w-auto">
            <span className="text-slate-600 font-bold ml-1 shrink-0">الحالة:</span>
            {[
              { v: "all", label: `الكل (${stats.total})`, active: "bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white" },
              { v: "new", label: `انتظار (${stats.pending})`, active: "bg-amber-500 text-white" },
              { v: "shipped", label: `شحن (${stats.shipped})`, active: "bg-[#0284C7] text-white" },
              { v: "delivered", label: `تم التوصيل (${stats.delivered})`, active: "bg-emerald-600 text-white" },
            ].map((f) => (
              <button key={f.v} onClick={() => setStatusFilter(f.v)} className={`px-3 py-1.5 rounded-full transition font-bold cursor-pointer shrink-0 ${statusFilter === f.v? f.active : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full appearance-none pr-8 pl-6 py-2 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs font-bold text-[#0A2540] outline-none cursor-pointer">
                <option value="all">كل المدن</option>
                {uniqueCities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <MapPin className="w-3.5 h-3.5 text-orange-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {statusFilter!== "all" && <button onClick={() => setStatusFilter("all")} className="text-xs text-orange-500 hover:underline font-bold">إعادة ضبط</button>}
          </div>
        </div>

        <div className="block sm:hidden space-y-3">
          {filteredOrders.length === 0? (
            <div className="bg-white border border-sky-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-sm">لا توجد شحنات مطابقة لمعايير البحث.</div>
          ) : filteredOrders.map((ord) => {
            const trackingNo = ord.intlTrackingNumber || ord.orderNumber;
            return (
              <div key={ord.id} className="bg-white border border-sky-200/90 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-sm text-[#0F4C81] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">{ord.orderNumber}</span>
                  <select value={ord.status} onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)} className={`text-[11px] font-black rounded-full px-2.5 py-1 border outline-none cursor-pointer ${ord.status === "delivered"? "bg-emerald-50 text-emerald-700 border-emerald-300" : ord.status === "shipped" || ord.status === "international_ship"? "bg-sky-50 text-[#0284C7] border-sky-300" : ord.status === "cancelled"? "bg-rose-50 text-rose-700 border-rose-300" : "bg-amber-50 text-amber-700 border-amber-300"}`}>
                    <option value="new">استلام الطلب والاعتماد</option><option value="purchased">الشراء من المتجر الدولي</option><option value="international_ship">وصول المستودع الدولي</option><option value="shipped">الشحن الدولي</option><option value="local_warehouse">الوصول لليمن والفرز المحلي</option><option value="out_for_delivery">خروج مع المندوب للتوصيل</option><option value="delivered">تم التسليم بنجاح</option><option value="cancelled">ملغي</option>
                  </select>
                </div>
                <div className="text-xs text-slate-800 font-bold leading-relaxed">{ord.productTitle}</div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="font-bold text-[#0A2540]">{ord.customerName}</span>
                  <span className="text-slate-600 flex items-center gap-1 font-bold"><MapPin className="w-3 h-3 text-orange-500" />{ord.customerCity || "صنعاء"}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-mono text-slate-800 font-bold">{ord.customerPhone}</span>
                  <div className="flex items-center gap-2 font-bold">
                    <a href={`tel:${ord.customerPhone.replace(/\D/g, "")}`} className="px-2 py-0.5 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200 text-[11px]">اتصال</a>
                    <a href={`https://wa.me/${ord.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px]">واتساب</a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0F4C81] font-mono text-xs font-bold">
                    <span>{trackingNo}</span>
                    <button onClick={() => copyTracking(trackingNo, ord.id)} className="text-orange-500 hover:text-orange-600 transition">
                      {copiedTracking === ord.id? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">{ord.createdAt.split("T")[0]}</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)} className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /><span>حذف</span></button>
                  <button onClick={() => setPrintingOrder(ord)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5 text-orange-500" /><span>سند</span></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block bg-white border border-sky-200/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-r from-[#F0F7FF] to-[#E0F2FE] border-b border-sky-200 text-[#0F4C81] font-black">
                <tr>
                  <th className="py-4 px-4">رقم الطلب</th><th className="py-4 px-4">العميل والمدينة</th><th className="py-4 px-4">رقم الهاتف</th><th className="py-4 px-4">رقم التتبع</th><th className="py-4 px-4 text-center">حالة الشحنة</th><th className="py-4 px-4">التاريخ</th><th className="py-4 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0A2540]">
                {filteredOrders.length === 0? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">لا توجد شحنات مطابقة.</td></tr>
                ) : filteredOrders.map((ord) => {
                  const trackingNo = ord.intlTrackingNumber || ord.orderNumber;
                  return (
                    <tr key={ord.id} className="hover:bg-sky-50/60 transition group">
                      <td className="py-4 px-4">
                        <div className="font-mono font-black text-sm text-[#0F4C81]">{ord.orderNumber}</div>
                        <div className="text-[11px] text-slate-500 max-w-[200px] truncate mt-0.5">{ord.productTitle}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-[#0A2540] text-sm">{ord.customerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-orange-500" /><span>{ord.customerCity || "صنعاء"}</span></div>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        <div className="text-slate-700 text-xs font-bold">{ord.customerPhone}</div>
                        <div className="text-[10px] text-sky-700 flex items-center gap-2 mt-0.5 font-bold">
                          <a href={`tel:${ord.customerPhone.replace(/\D/g, "")}`} className="hover:underline">اتصال</a><span className="opacity-40">|</span>
                          <a href={`https://wa.me/${ord.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">واتساب</a>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0F4C81] font-mono text-xs font-bold">
                          <span>{trackingNo}</span>
                          <button onClick={() => copyTracking(trackingNo, ord.id)} className="text-orange-500 hover:text-orange-600 cursor-pointer">
                            {copiedTracking === ord.id? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <select value={ord.status} onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)} className={`text-xs font-black rounded-full px-3 py-1 border transition cursor-pointer text-center outline-none ${ord.status === "delivered"? "bg-emerald-50 text-emerald-700 border-emerald-300" : ord.status === "shipped" || ord.status === "international_ship"? "bg-sky-50 text-[#0284C7] border-sky-300" : ord.status === "cancelled"? "bg-rose-50 text-rose-700 border-rose-300" : "bg-amber-50 text-amber-700 border-amber-300"}`}>
                          <option value="new">استلام الطلب والاعتماد</option><option value="purchased">الشراء من المتجر الدولي</option><option value="international_ship">وصول المستودع الدولي</option><option value="shipped">الشحن الدولي</option><option value="local_warehouse">الوصول لليمن والفرز المحلي</option><option value="out_for_delivery">خروج مع المندوب للتوصيل</option><option value="delivered">تم التسليم بنجاح</option><option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-orange-500" /><span>{ord.createdAt.split("T")[0]}</span></div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setPrintingOrder(ord)} className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"><Printer className="w-3.5 h-3.5 text-orange-500" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

     <AdminSidebar
  isOpen={isSidebarOpen}
  onClose={() => setIsSidebarOpen(false)}
  onOpenAccountsTree={() => setIsAccountsTreeOpen(true)}
  onOpenQuickScan={() => setIsQuickScanOpen(true)}
/>
      {isAccountsTreeOpen && <AccountsTreeModal onClose={() => setIsAccountsTreeOpen(false)} />}
      {isAddModalOpen && (
        <AddShipmentModal
          onCreate={(order: OrderItem) => { setOrders((prev) => [order,...prev]); setIsAddModalOpen(false); }}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
      {isQuickScanOpen && <QuickScanModal orders={orders} onClose={() => setIsQuickScanOpen(false)} />}
      {printingOrder && <PrintReceiptModal order={printingOrder} onClose={() => setPrintingOrder(null)} />}
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة العمليات والإدارة | السوق الشامل AL SHAMEL" },
      { name: "description", content: "لوحة عمليات الشحن والفرز وإدارة الطلبات والعملاء لمنظومة السوق الشامل." },
    ],
  }),
  component: AdminOperationsDashboard,
});

export default AdminOperationsDashboard;
