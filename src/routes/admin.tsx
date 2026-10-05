import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Home,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plane,
  PlusCircle,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
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

export const Route = createFileRoute("/admin")({
  component: AdminOperationsPage,
});

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
let supabaseClientInstance: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {}
}

// كادر الموظفين المعتمد
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  status: "online" | "busy" | "offline";
  tasksCompleted: number;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "1", name: "زين مطيع", role: "المدير العام ومسؤول النظام (Super Admin)", department: "الإدارة العليا", phone: "772399745", status: "online", tasksCompleted: 142 },
  { id: "2", name: "أحمد المهندس", role: "مسؤول المشتريات الدولية", department: "الشراء الدولي", phone: "771234567", status: "online", tasksCompleted: 98 },
  { id: "3", name: "سارة الخولاني", role: "المديرة المالية ورئيسة المحاسبة", department: "المالية والمحاسبة", phone: "777890123", status: "online", tasksCompleted: 85 },
  { id: "4", name: "عمر الشامي", role: "مشرف مستودع الفرز - صنعاء", department: "المستودعات الميدانية", phone: "775678901", status: "online", tasksCompleted: 114 },
  { id: "5", name: "فؤاد العريقي", role: "منسق التوزيع والشحن - عدن", department: "فرع عدن", phone: "733456789", status: "online", tasksCompleted: 67 },
  { id: "6", name: "ريهام العنسي", role: "خدمة العملاء والتتبع الفوري", department: "الدعم الفني", phone: "774567890", status: "online", tasksCompleted: 130 },
  { id: "7", name: "طارق الحمادي", role: "مندوب التوصيل الميداني - صنعاء", department: "التوصيل الميداني", phone: "778901234", status: "online", tasksCompleted: 88 },
  { id: "8", name: "كمال اليافعي", role: "مندوب التوصيل الميداني - عدن ولحج", department: "التوصيل الميداني", phone: "735678901", status: "online", tasksCompleted: 52 },
];

function AdminNotificationComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("shipment");
  const [href, setHref] = useState("/track");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const sendNotification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setMessage("");
    const { error } = await (supabase.from("notifications") as any).insert({
      title: title.trim(),
      body: body.trim(),
      kind,
      href: href || null,
      is_active: true,
    });
    setSending(false);
    if (error) {
      setMessage("تعذر إرسال الإشعار. تأكد من إعدادات الصلاحيات.");
      return;
    }
    setTitle("");
    setBody("");
    setMessage("تم بث الإشعار بنجاح لجميع العملاء.");
  };

  return (
    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-[#EA580C]">
            <Bell className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-[#0A2540]">بث إشعار فوري للعملاء</h2>
            <p className="text-[11px] text-slate-500">يظهر فوراً في شريط الإشعارات وجرس التنبيهات في لوحة العميل.</p>
          </div>
        </div>
      </div>
      <form onSubmit={sendNotification} className="grid gap-2.5 lg:grid-cols-[1.2fr_1.6fr_150px_150px_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الإشعار (مثال: وصول دفعة شحنات شي إن)..."
          required
          maxLength={120}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#0284C7] focus:bg-white transition"
        />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="نص التنبيه بالتفصيل..."
          required
          maxLength={300}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#0284C7] focus:bg-white transition"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0A2540] outline-none cursor-pointer"
        >
          <option value="shipment">📦 تحديث شحنة</option>
          <option value="purchase">⚡ تأكيد شراء</option>
          <option value="offer">🎉 عرض خاص</option>
          <option value="support">💬 تنبيه خدمة العملاء</option>
        </select>
        <select
          value={href}
          onChange={(e) => setHref(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0A2540] outline-none cursor-pointer"
        >
          <option value="/track">صفحة التتبع</option>
          <option value="/my-account">إدارة الحساب</option>
          <option value="/new-order">طلب جديد</option>
          <option value="/dashboard">لوحة التحكم</option>
        </select>
        <button
          disabled={sending}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-5 py-2 text-xs font-black text-white transition hover:opacity-95 disabled:opacity-60 cursor-pointer shadow-sm active:scale-95"
        >
          <Send className="size-3.5" />
          {sending ? "جارٍ البث..." : "إرسال"}
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-[11px] font-bold ${message.startsWith("تم") ? "text-emerald-600" : "text-rose-600"}`}>
          {message}
        </p>
      )}
    </section>
  );
}

export function AdminOperationsPage() {
  const [activeTab, setActiveTab] = useState<"operations" | "finance" | "employees">("operations");

  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_shipments_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SEED_ORDERS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_employees");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_EMPLOYEES;
  });

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // نوافذ النظام
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<"receipt" | "payment">("receipt");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [voucherFund, setVoucherFund] = useState("kuraimi");
  const [voucherCurrency, setVoucherCurrency] = useState("SAR");
  const [voucherParty, setVoucherParty] = useState("");

  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") window.location.href = path;
  };

  useEffect(() => {
    try {
      localStorage.setItem("alsouk_admin_shipments_v1", JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem("alsouk_admin_employees", JSON.stringify(employees));
    } catch {}
  }, [employees]);

  const fetchOrders = async () => {
    setLoading(true);
    if (supabaseClientInstance) {
      try {
        const { data, error } = await supabaseClientInstance
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setOrders(
            data.map((item: any) => ({
              id: String(item.id),
              orderNumber: item.order_number || item.orderNumber || `SQ-${item.id}`,
              customerName: item.customer_name || item.customerName || "عميل مسجل",
              customerPhone: item.customer_phone || item.phone || item.customerPhone || "770000000",
              customerCity: item.customer_city || item.city || "صنعاء",
              productTitle: item.product_title || item.product_name || "شحنة وساطة دولية",
              storeName: item.store_name || item.store || "SHEIN",
              status: (item.status as OrderStatus) || "new",
              originalPrice: Number(item.original_price || item.store_price || item.quote_total || 45),
              intlTrackingNumber: item.intl_tracking_number || `TRK-${item.id}`,
              createdAt: item.created_at || new Date().toISOString(),
            }))
          );
        }
      } catch (err) {
        console.error("Fetch orders error:", err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
    );
    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.from("orders").update({ status: newStatus }).eq("id", orderId);
      } catch {}
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشحنة (${orderNumber}) نهائياً؟`)) return;
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.from("orders").delete().eq("id", orderId);
      } catch {}
    }
  };

  const sendWhatsAppNotification = (order: OrderItem) => {
    const statusMap: Record<string, string> = {
      new: "تم استلام طلب الشراء وتأكيده بالمستودع الخارجي 📦",
      reviewing: "قيد المراجعة واحتساب أوزان الشحن والجمارك 🔍",
      purchased: "تم الشراء وتجهيز الشحنة بالمستودع 🛍️",
      warehouse_china: "وصلت لمستودع الفرز والتجهيز الدولي 🏭",
      international_ship: "بالشحن الدولي الجوي في طريقها لليمن ✈️",
      shipped: "وصلت مستودعات صنعاء/عدن وجارٍ تسليمها للمندوب 🚚",
      delivered: "تم تسليم الشحنة لك بنجاح، شكراً لاختيارك السوق الشامل! ✅",
      cancelled: "تم إلغاء الطلب ❌",
    };

    const statusText = statusMap[order.status] || order.status;
    const message = encodeURIComponent(
      `مرحباً ${order.customerName}،\nشحنتك رقم (${order.orderNumber}) من متجر ${order.storeName}:\nالحالة الحالية: ${statusText}\nرقم التتبع: ${order.intlTrackingNumber || order.orderNumber}\n\nشكراً لتسوقك مع السوق الشامل 🌟`
    );
    window.open(`https://wa.me/967${order.customerPhone.replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const handleExportCSV = () => {
    const headers = ["رقم الطلب", "العميل", "الهاتف", "المدينة", "المتجر", "الحالة", "السعر", "رقم التتبع", "التاريخ"];
    const rows = orders.map((o) => [
      o.orderNumber,
      `"${o.customerName}"`,
      o.customerPhone,
      `"${o.customerCity || "صنعاء"}"`,
      o.storeName,
      o.status,
      o.originalPrice,
      o.intlTrackingNumber || o.orderNumber,
      o.createdAt.split("T")[0],
    ]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `alsouk_shipments_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (storeFilter !== "all" && o.storeName.toLowerCase() !== storeFilter.toLowerCase()) return false;
      if (cityFilter !== "all" && o.customerCity !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesPhone = o.customerPhone.includes(q);
        const matchesTrack = o.intlTrackingNumber?.toLowerCase().includes(q);
        if (!matchesNum && !matchesName && !matchesPhone && !matchesTrack) return false;
      }
      return true;
    });
  }, [orders, statusFilter, storeFilter, cityFilter, searchQuery]);

  // مؤشرات الأداء اللحظية الخمسة
  const stats = useMemo(() => {
    const total = orders.length;
    const inTransit = orders.filter(
      (o) => o.status === "international_ship" || o.status === "warehouse_china" || o.status === "shipped"
    ).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const totalSalesSAR = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + (o.originalPrice || 0), 0);
    const totalSalesYER = totalSalesSAR * 142; // سعر صرف تقريبي
    const netProfitSAR = Math.round(totalSalesSAR * 0.18); // متوسط عمولة الوساطة 18%
    const remainingReceivablesYER = orders
      .filter((o) => o.status !== "delivered" && o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.originalPrice || 0) * 142, 0);

    return {
      total,
      inTransit,
      delivered,
      totalSalesSAR,
      totalSalesYER,
      netProfitSAR,
      remainingReceivablesYER,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A2540] font-sans selection:bg-[#0284C7] selection:text-white pb-24" dir="rtl">
      {/* 1. الشريط العلوي التوجيهي */}
      <div className="bg-[#0A2540] text-white px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs border-b border-sky-950/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold">لوحة الإدارة الشاملة | AL SHAMEL OPERATIONS & FINANCE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAccountsTreeOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FolderTree className="w-3.5 h-3.5 text-amber-300" />
            <span>شجرة الحسابات [70]</span>
          </button>
          <button
            onClick={() => navigateTo("/new-order")}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#F97316] text-white text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>+ طلب شراء دولي</span>
          </button>
          <button
            onClick={() => navigateTo("/track")}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-sky-200" />
            <span>تتبع مباشر</span>
          </button>
          <button
            onClick={() => navigateTo("/dashboard")}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-sky-200" />
            <span>بوابة العميل</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* 2. ترويسة لوحة الإدارة وزر الـ 3 شرطات */}
        <header className="bg-white border-2 border-sky-100 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* زر الـ 3 شرطات للقائمة الشاملة */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col justify-center items-center gap-1 p-2.5 rounded-xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] hover:from-[#0A2540] hover:to-[#0F4C81] text-white shadow-md cursor-pointer transition active:scale-95 shrink-0"
              title="القائمة الجانبية الشاملة"
            >
              <span className="w-5 h-0.5 rounded-full bg-white"></span>
              <span className="w-5 h-0.5 rounded-full bg-[#FF7A00]"></span>
              <span className="w-5 h-0.5 rounded-full bg-white"></span>
            </button>

            <EmbeddedLogo size="sm" />
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>العمليات والمالية</span>
            </div>
          </div>

          {/* محرك البحث الفوري برقم الشحنة أو الهاتف */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="بحث برقم الطلب (SQ-892411)، الهاتف، أو كود التتبع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0A2540] placeholder-slate-400 outline-none focus:border-[#0284C7] focus:bg-white transition font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQuickScanOpen(true)}
              className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[#0F4C81] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>فحص سريع</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#F97316] text-white text-xs font-black shadow-md shadow-orange-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ شحنة جديدة</span>
            </button>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>
        </header>

        {/* 3. شريط مؤشرات الأداء اللحظي (KPIs) بالعملات الثلاث */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border border-sky-100 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500">إجمالي الشحنات</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-[#0F4C81]">{stats.total}</span>
              <Package className="w-4 h-4 text-[#0F4C81]" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">المسجلة في النظام</span>
          </div>

          <div className="bg-white border border-sky-100 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500">بالنقل والترانزيت</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-[#EA580C]">{stats.inTransit}</span>
              <Plane className="w-4 h-4 text-[#EA580C]" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">جوي ومحلي</span>
          </div>

          <div className="bg-white border border-sky-100 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500">المبيعات المفوترة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-[#0F4C81] tabular-nums">
                {stats.totalSalesSAR.toLocaleString()} <span className="text-xs font-normal">SAR</span>
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              ≈ {(stats.totalSalesSAR / 3.75).toFixed(0)} $
            </span>
          </div>

          <div className="bg-white border border-sky-100 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500">صافي أرباح الوساطة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-emerald-600 tabular-nums">
                +{stats.netProfitSAR.toLocaleString()} <span className="text-xs font-normal">SAR</span>
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] text-emerald-600 font-bold mt-1">هامش عمولة 18%</span>
          </div>

          <div className="col-span-2 md:col-span-1 bg-white border border-sky-100 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500">الذمم المدينة المتبقية</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-[#0A2540] tabular-nums">
                {stats.remainingReceivablesYER.toLocaleString()} <span className="text-xs font-normal">YER</span>
              </span>
              <Wallet className="w-4 h-4 text-[#0A2540]" />
            </div>
            <span className="text-[10px] text-amber-600 font-bold mt-1">مقبوضات عند التسليم (COD)</span>
          </div>
        </div>

        {/* 4. تبويبات لوحة التحكم الثلاثية */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "operations"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>إدارة العمليات والفرز الميداني</span>
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "finance"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>النظام المحاسبي والمالي</span>
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "employees"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>طاقم العمل والموظفين ({employees.length})</span>
          </button>
        </div>

        {/* ========================================================
            التبويب الأول: إدارة العمليات والشحنات الميدانية
        ======================================================== */}
        {activeTab === "operations" && (
          <div className="space-y-4">
            {/* ملخص المسار اللوجستي الميداني بالمحطات الأربع */}
            <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black text-[#0A2540] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF7A00]"></span>
                <span>المسار اللوجستي الميداني بالمحطات الأربع:</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl space-y-1">
                  <div className="font-bold text-[#0F4C81] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#0F4C81] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>المستودعات الخارجية</span>
                  </div>
                  <p className="text-[11px] text-slate-500">شراء وتجهيز من شي إن، أمازون، علي إكسبرس، وتيمو.</p>
                </div>

                <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl space-y-1">
                  <div className="font-bold text-[#EA580C] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#EA580C] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>الشحن الدولي الجوي</span>
                  </div>
                  <p className="text-[11px] text-slate-500">إصدار بوالص الشحن، الترانزيت، والتتبع اللحظي للرحلات.</p>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1">
                  <div className="font-bold text-indigo-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>مستودعات الفرز باليمن</span>
                  </div>
                  <p className="text-[11px] text-slate-500">الفحص والتفتيش والفرز بمستودعات صنعاء وعدن.</p>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>التوزيع الميداني والتسليم</span>
                  </div>
                  <p className="text-[11px] text-slate-500">التوزيع مع المناديب والتحصيل حتى باب العميل.</p>
                </div>
              </div>
            </div>

            {/* بث الإشعارات للعملاء */}
            <AdminNotificationComposer />

            {/* أدوات الفلترة الذكية للمتاجر والحالات */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-500">تصفية المتاجر:</span>
                {["all", "SHEIN", "Amazon", "AliExpress", "TEMU", "Trendyol"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStoreFilter(st)}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      storeFilter === st
                        ? "bg-[#0F4C81] text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {st === "all" ? "جميع المتاجر" : st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 outline-none"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="new">طلب جديد</option>
                  <option value="purchased">تم الشراء</option>
                  <option value="warehouse_china">بالمستودع الخارجي</option>
                  <option value="international_ship">شحن دولي</option>
                  <option value="shipped">وصلت اليمن</option>
                  <option value="delivered">تم التسليم</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="تصدير كملف إكسل / CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>
              </div>
            </div>

            {/* جدول الشحنات عالي الكثافة */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F0F7FF] text-[#0F4C81] font-black border-b border-sky-100">
                    <tr>
                      <th className="p-3">رقم الطلب / التتبع</th>
                      <th className="p-3">العميل والهاتف</th>
                      <th className="p-3">المتجر والمحتوى</th>
                      <th className="p-3">المبلغ ($ / SAR)</th>
                      <th className="p-3">المرحلة الحالية</th>
                      <th className="p-3 text-center">الإجراءات السريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد شحنات تطابق معايير البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-sky-50/40 transition">
                          <td className="p-3 font-mono font-bold">
                            <div className="text-[#0F4C81]">{order.orderNumber}</div>
                            <div className="text-[10px] text-slate-400">{order.intlTrackingNumber}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-[#0A2540]">{order.customerName}</div>
                            <div className="text-[11px] font-mono text-slate-500" dir="ltr">
                              {order.customerPhone}
                            </div>
                            <div className="text-[10px] text-slate-400">{order.customerCity || "صنعاء"}</div>
                          </td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-800 mb-1">
                              {order.storeName}
                            </span>
                            <div className="font-medium text-slate-700 truncate max-w-xs">{order.productTitle}</div>
                          </td>
                          <td className="p-3 font-mono font-bold tabular-nums">
                            <div className="text-[#0F4C81]">{order.originalPrice} SAR</div>
                            <div className="text-[10px] text-slate-400">≈ {(order.originalPrice / 3.75).toFixed(1)} $</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#0A2540] outline-none cursor-pointer focus:border-[#0284C7]"
                            >
                              <option value="new">1. جديد بالمستودع</option>
                              <option value="purchased">2. تم الشراء</option>
                              <option value="warehouse_china">3. فحص المستودع</option>
                              <option value="international_ship">4. شحن دولي ✈️</option>
                              <option value="shipped">5. وصلت اليمن 📦</option>
                              <option value="delivered">6. تم التسليم ✓</option>
                              <option value="cancelled">إلغاء ❌</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* إرسال واتساب مباشر */}
                              <button
                                onClick={() => sendWhatsAppNotification(order)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                                title="إرسال إشعار تتبع عبر واتساب"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {/* اتصال هاتفي بالعميل */}
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81] hover:bg-sky-100 transition cursor-pointer"
                                title="اتصال مباشر بالعميل"
                              >
                                <Phone className="w-4 h-4" />
                              </a>

                              {/* طباعة السند الرسمي */}
                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition cursor-pointer"
                                title="طباعة سند الاستلام وبوليصة الشحن"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* حذف الشحنة */}
                              <button
                                onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            التبويب الثاني: النظام المحاسبي والمالي المتكامل
        ======================================================== */}
        {activeTab === "finance" && (
          <div className="space-y-4">
            {/* بطاقات أرصدة الصناديق والبنوك المعتمدة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border-2 border-sky-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">مصرف الكريمي (كريمي جوال)</span>
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-xl font-black font-mono text-[#0F4C81] tabular-nums">
                  1,485,200 <span className="text-xs font-normal">YER</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">حساب رقم: 30129841</div>
              </div>

              <div className="bg-white border-2 border-sky-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">شبكة النجم للحوالات</span>
                  <Coins className="w-4 h-4 text-[#EA580C]" />
                </div>
                <div className="mt-2 text-xl font-black font-mono text-[#EA580C] tabular-nums">
                  3,850 <span className="text-xs font-normal">SAR</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">إيداعات عملاء التوصيل</div>
              </div>

              <div className="bg-white border-2 border-sky-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">ون كاش OneCash والمحافظ</span>
                  <Zap className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 text-xl font-black font-mono text-purple-700 tabular-nums">
                  840,000 <span className="text-xs font-normal">YER</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">تحصيلات إلكترونية سريعة</div>
              </div>

              <div className="bg-white border-2 border-sky-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">الصندوق النقدي الرئيسي (كاش)</span>
                  <DollarSign className="w-4 h-4 text-[#0A2540]" />
                </div>
                <div className="mt-2 text-xl font-black font-mono text-[#0A2540] tabular-nums">
                  650 <span className="text-xs font-normal">$</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">مقبوضات المناديب عند الباب</div>
              </div>
            </div>

            {/* أدوات المحاسبة السريعة: سند قبض / سند صرف */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#0A2540]">سندات الصرف والقبض الفورية</h3>
                <p className="text-xs text-slate-500">تسجيل مدفوعات الموردين، رسوم الجمارك، أو إيداعات العملاء المباشرة.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setVoucherType("receipt");
                    setIsVoucherModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ سند قبض (إيداع)</span>
                </button>

                <button
                  onClick={() => {
                    setVoucherType("payment");
                    setIsVoucherModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ سند صرف (مصاريف)</span>
                </button>
              </div>
            </div>

            {/* كشف الحسابات والدليل المحاسبي (دليل 70) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#0A2540] flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-[#0F4C81]" />
                  <span>كشف أرصدة العملاء والذمم (الدليل المحاسبي 70)</span>
                </h3>
                <button
                  onClick={() => setIsAccountsTreeOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200 text-xs font-bold hover:bg-sky-100 transition cursor-pointer"
                >
                  استعراض الشجرة كاملة
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-2.5">رقم الحساب</th>
                      <th className="p-2.5">اسم العميل / الجهة</th>
                      <th className="p-2.5">المدينة</th>
                      <th className="p-2.5">إجمالي المشتريات</th>
                      <th className="p-2.5">المدفوع</th>
                      <th className="p-2.5">المتبقي بذمته</th>
                      <th className="p-2.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">70101</td>
                      <td className="p-2.5 font-sans font-bold text-[#0A2540]">zain muteea</td>
                      <td className="p-2.5 font-sans">صنعاء</td>
                      <td className="p-2.5 text-[#0F4C81]">350 SAR</td>
                      <td className="p-2.5 text-emerald-600">350 SAR</td>
                      <td className="p-2.5 text-slate-400">0.00</td>
                      <td className="p-2.5 text-center font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">مخلص</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">70102</td>
                      <td className="p-2.5 font-sans font-bold text-[#0A2540]">محمد الأهدل</td>
                      <td className="p-2.5 font-sans">عدن</td>
                      <td className="p-2.5 text-[#0F4C81]">580 SAR</td>
                      <td className="p-2.5 text-emerald-600">200 SAR</td>
                      <td className="p-2.5 text-[#EA580C] font-bold">380 SAR</td>
                      <td className="p-2.5 text-center font-sans">
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">تحصيل عند التسليم</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            التبويب الثالث: كادر العمل والموظفين (8 موظفين)
        ======================================================== */}
        {activeTab === "employees" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#0A2540]">طاقم العمل والعمليات المعتمد (8 موظفين)</h3>
                <p className="text-xs text-slate-500">متابعة جاهزية الكادر، الاتصال الفوري، وإدارة صلاحيات النظام.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white border-2 border-sky-100 rounded-2xl p-4 shadow-xs space-y-3 hover:border-[#0F4C81] transition flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-md">
                        {emp.department}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>متصل</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-[#0A2540] pt-1">{emp.name}</h4>
                    <p className="text-xs text-slate-500">{emp.role}</p>
                    <div className="text-xs font-mono text-slate-400" dir="ltr">
                      {emp.phone}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={`tel:${emp.phone}`}
                      className="flex-1 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0F4C81] text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال</span>
                    </a>

                    <a
                      href={`https://wa.me/967${emp.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          النوافذ المنبثقة (Modals)
      ======================================================== */}
      {/* 1. القائمة الجانبية الشاملة (Drawer) */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAccountsTree={() => setIsAccountsTreeOpen(true)}
        onOpenQuickScan={() => setIsQuickScanOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        navigateTo={navigateTo}
      />

      {/* 2. شجرة الحسابات والدليل المحاسبي */}
      {isAccountsTreeOpen && <AccountsTreeModal onClose={() => setIsAccountsTreeOpen(false)} />}

      {/* 3. نافذة الفحص السريع */}
      {isQuickScanOpen && <QuickScanModal orders={orders} onClose={() => setIsQuickScanOpen(false)} />}

      {/* 4. نافذة إضافة شحنة جديدة */}
      {isAddModalOpen && (
        <AddShipmentModal
          onCreate={(newOrder) => {
            setOrders((prev) => [newOrder, ...prev]);
            setIsAddModalOpen(false);
          }}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* 5. طباعة السند الرسمي مع الباركود */}
      {printingOrder && <PrintReceiptModal order={printingOrder} onClose={() => setPrintingOrder(null)} />}

      {/* 6. نافذة تسجيل سند قبض / صرف فوري */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-sky-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-right text-[#0A2540] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black">
                {voucherType === "receipt" ? "سند قبض مالي (إيداع)" : "سند صرف مالي (مصاريف)"}
              </h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">المبلغ:</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">العملة:</label>
                  <select
                    value={voucherCurrency}
                    onChange={(e) => setVoucherCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none"
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="USD">دولار أمريكي ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">الصندوق / البنك:</label>
                  <select
                    value={voucherFund}
                    onChange={(e) => setVoucherFund(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none"
                  >
                    <option value="kuraimi">مصرف الكريمي</option>
                    <option value="najm">شبكة النجم</option>
                    <option value="onecash">ون كاش OneCash</option>
                    <option value="cash">الصندوق النقدي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">المستفيد / العميل:</label>
                <input
                  type="text"
                  placeholder="اسم الشخص أو المورد..."
                  value={voucherParty}
                  onChange={(e) => setVoucherParty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#0284C7]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  alert("تم حفظ وترحيل السند المحاسبي بنجاح.");
                  setIsVoucherModalOpen(false);
                  setVoucherAmount("");
                  setVoucherParty("");
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                حفظ وترحيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
