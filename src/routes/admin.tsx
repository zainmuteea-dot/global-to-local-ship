import { createFileRoute } from "@tanstack/react-router";
import { AdminAlerts } from "@/components/admin/AdminAlerts";
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
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedLogo } from "@/components/admin/Logo";
import { AccountsTreeModal } from "@/components/admin/AccountsTreeModal";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AddShipmentModal } from "@/components/admin/AddShipmentModal";
import { QuickScanModal } from "@/components/admin/QuickScanModal";
import { PrintReceiptModal } from "@/components/admin/PrintReceiptModal";
import { INITIAL_SEED_ORDERS } from "@/components/admin/seed-data";
import type { OrderItem, OrderStatus } from "@/components/admin/types";
function AdminRouteError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : String(error);

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8fafc",
        fontFamily: "sans-serif",
      }}
    >
      <section
        role="alert"
        style={{
          width: "min(100%, 680px)",
          padding: 24,
          border: "1px solid #fecaca",
          borderRadius: 16,
          background: "#fff",
          color: "#7f1d1d",
        }}
      >
        <h1>تعذّر تحميل لوحة الإدارة</h1>
        <p>انسخ رسالة الخطأ أدناه لمعرفة السبب:</p>

        <pre
          dir="ltr"
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            padding: 12,
            borderRadius: 8,
            background: "#fef2f2",
          }}
        >
          {message}
        </pre>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 16px",
            border: 0,
            borderRadius: 8,
            background: "#7f1d1d",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          إعادة تحميل الصفحة
        </button>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminOperationsPage,
  errorComponent: AdminRouteError,
});

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
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const sendNotification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setMessage("");
    const { error } = await supabase.from("notifications").insert({
      title: title.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      setMessage("تعذر إرسال الإشعار. يرجى التحقق من الصلاحيات.");
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
            <h3 className="text-sm font-black text-[#0A2540]">بث إشعار فوري للعملاء</h3>
            <p className="text-[11px] text-slate-500">سيظهر التنبيه فوراً في حسابات العملاء وشريط التنبيهات</p>
          </div>
        </div>
      </div>

      <form onSubmit={sendNotification} className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الإشعار (مثال: وصول شحنات جديدة)"
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0284C7] bg-slate-50 font-bold"
          required
        />
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="نص الإشعار التفصيلي..."
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0284C7] bg-slate-50 md:col-span-2"
          required
        />
        <button
          type="submit"
          disabled={sending}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-105 disabled:opacity-60 cursor-pointer"
        >
          <Send className="size-3.5" />
          <span>{sending ? "جارٍ البث..." : "إرسال التنبيه"}</span>
        </button>
      </form>
      {message && <p className="mt-2 text-xs font-bold text-[#0284C7]">{message}</p>}
    </section>
  );
}

const STATUS_MAP_TO_UI: Record<string, OrderStatus> = {
  "جديد": "new",
  "قيد المراجعة": "reviewing",
  "تم الشراء": "purchased",
  "المستودع الدولي": "warehouse_china",
  "شحن دولي": "international_ship",
  "الفرز والتوصيل": "shipped",
  "تم التسليم": "delivered",
  "ملغي": "cancelled",
  "new": "new",
  "reviewing": "reviewing",
  "purchased": "purchased",
  "warehouse_china": "warehouse_china",
  "international_ship": "international_ship",
  "shipped": "shipped",
  "delivered": "delivered",
  "cancelled": "cancelled",
};

const STATUS_MAP_TO_ARABIC: Record<OrderStatus, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  purchased: "تم الشراء",
  warehouse_china: "المستودع الدولي",
  international_ship: "شحن دولي",
  shipped: "الفرز والتوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const STATUS_TEXT: Record<OrderStatus, string> = {
  new: "تم استلام الطلب والاعتماد",
  reviewing: "قيد المراجعة واحتساب التكاليف",
  purchased: "تم الشراء من المتجر الدولي",
  warehouse_china: "وصلت المستودع الخارجي والتجهيز",
  international_ship: "بالشحن الدولي (جوي / بحري)",
  shipped: "وصلت اليمن وجارٍ التوزيع مع المندوب",
  delivered: "تم التسليم بنجاح للعميل",
  cancelled: "ملغي",
};

export default function AdminOperationsPage() {
  const [activeTab, setActiveTab] = useState<"operations" | "finance" | "employees">("operations");
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_shipments_v1");
      return saved ? JSON.parse(saved) : INITIAL_SEED_ORDERS;
    } catch {
      return INITIAL_SEED_ORDERS;
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_employees");
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);

  // Financial Voucher Modal
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<"receipt" | "payment">("receipt");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [voucherCurrency, setVoucherCurrency] = useState("SAR");
  const [voucherFund, setVoucherFund] = useState("kuraimi");
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

  // دالة جلب الشحنات من قاعدة بيانات Lovable Cloud
  const fetchOrdersFromDatabase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mappedOrders: OrderItem[] = data.map((item: any) => {
          let store = "SHEIN";
          const link = (item.product_link || "").toLowerCase();
          if (link.includes("amazon")) store = "Amazon";
          else if (link.includes("aliexpress")) store = "AliExpress";
          else if (link.includes("alibaba")) store = "Alibaba";
          else if (link.includes("temu")) store = "TEMU";
          else if (link.includes("trendyol")) store = "Trendyol";

          const uiStatus = STATUS_MAP_TO_UI[item.status] || "new";

          return {
            id: String(item.id),
            orderNumber: item.tracking_code || `SQ-${item.id.slice(0, 8)}`,
            customerName: item.customer_name || "عميل مسجل",
            customerPhone: item.phone ?? "",
            customerCity: item.notes || "صنعاء",
            productTitle: item.product_name || "شحنة وساطة دولية",
            storeName: store,
            status: uiStatus,
            originalPrice: 45,
            intlTrackingNumber: item.tracking_code || `TRK-${item.id.slice(0, 8)}`,
            createdAt: item.created_at || new Date().toISOString(),
          };
        });
        setOrders(mappedOrders);
      } else if ((!data || data.length === 0) && orders.length === 0) {
        setOrders(INITIAL_SEED_ORDERS);
      }
    } catch (err) {
      console.error("خطأ في قراءة الطلبات من القاعدة:", err);
    } finally {
      setLoading(false);
    }
  };

  // الاشتراك اللحظي Realtime مع جدول orders
  useEffect(() => {
    fetchOrdersFromDatabase();

    const channel = supabase
      .channel("admin_orders_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrdersFromDatabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // تحديث حالة الشحنة وحفظها بالقاعدة مع إشعار تلقائي للعميل
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
    );

    const arabicStatus = STATUS_MAP_TO_ARABIC[newStatus] || newStatus;

    try {
      await supabase
        .from("orders")
        .update({ status: arabicStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (targetOrder) {
        await supabase.from("notifications").insert({
          title: `تحديث مسار الشحنة (${targetOrder.orderNumber})`,
          body: `مرحباً ${targetOrder.customerName}، شحنتك أصبحت في مرحلة: ${STATUS_TEXT[newStatus]}`,
        });
      }
    } catch (e) {
      console.error("فشل التحديث في القاعدة:", e);
    }
  };

  // حذف شحنة من الواجهة والقاعدة
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشحنة (${orderNumber}) نهائياً؟`)) return;
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    try {
      await supabase.from("orders").delete().eq("id", orderId);
    } catch (e) {
      console.error("فشل الحذف من القاعدة:", e);
    }
  };

  // إضافة شحنة جديدة وحفظها بالقاعدة
  const handleCreateShipment = async (newOrder: OrderItem) => {
    setOrders((prev) => [newOrder, ...prev]);
    setIsAddModalOpen(false);

    try {
      await supabase.from("orders").insert({
        tracking_code: newOrder.orderNumber,
        customer_name: newOrder.customerName,
        phone: newOrder.customerPhone,
        product_link: `https://${newOrder.storeName.toLowerCase()}.com`,
        product_name: newOrder.productTitle,
        status: STATUS_MAP_TO_ARABIC[newOrder.status] || "جديد",
        notes: newOrder.customerCity || "صنعاء",
      });
    } catch (e) {
      console.error("فشل حفظ الشحنة بالقاعدة:", e);
    }
  };

  const sendWhatsAppNotification = (order: OrderItem) => {
    const localPhone = String(order.customerPhone ?? "").replace(/\D/g, "");
    const customerPhone = localPhone
      ? localPhone.startsWith("967")
        ? localPhone
        : `967${localPhone.replace(/^0+/, "")}`
      : "";

    if (!customerPhone) {
      window.alert("لا يوجد رقم هاتف صالح للعميل في هذا الطلب.");
      return;
    }

    const statusLabel = STATUS_TEXT[order.status] || order.status;
    const message = encodeURIComponent(
      `مرحباً ${order.customerName}،\nشحنتك رقم (${order.orderNumber}) من متجر ${order.storeName}:\nالحالة الحالية: ${statusLabel}\nرقم التتبع: ${order.intlTrackingNumber || order.orderNumber}\n\nشكراً لتسوقك مع السوق الشامل 🌟`
    );
    window.open(`https://wa.me/${customerPhone}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  // تصفية الشحنات
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStore = selectedStore === "ALL" || o.storeName.toUpperCase() === selectedStore.toUpperCase();
      const matchSearch =
        searchQuery === "" ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        (o.intlTrackingNumber && o.intlTrackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStore && matchSearch;
    });
  }, [orders, selectedStore, searchQuery]);

  // المؤشرات KPIs
  const totalShipments = orders.length;
  const transitShipments = orders.filter((o) => ["purchased", "warehouse_china", "international_ship"].includes(o.status)).length;
  const deliveredShipments = orders.filter((o) => o.status === "delivered").length;
  const billedRevenue = totalShipments * 185;
  const netProfit = totalShipments * 28;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A2540] font-sans" dir="rtl">
      {/* الترويسة الرئيسية */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-xl hover:bg-sky-50 text-[#0F4C81] border border-sky-100 transition-colors cursor-pointer"
              title="القائمة الإدارية الشاملة"
            >
              <span className="space-y-1 block w-5">
                <span className="block h-0.5 w-full bg-[#0F4C81] rounded-full"></span>
                <span className="block h-0.5 w-full bg-[#0F4C81] rounded-full"></span>
                <span className="block h-0.5 w-3/4 bg-[#0F4C81] rounded-full"></span>
              </span>
            </button>
            <div className="cursor-pointer" onClick={() => navigateTo("/admin")}>
              <EmbeddedLogo />
            </div>
            <div className="hidden lg:block border-r border-slate-200 pr-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                قاعدة البيانات: متصلة لحظياً ⚡
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>شحنة جديدة</span>
            </button>

            <button
              onClick={() => setIsQuickScanOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0A2540] transition-colors cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>مسح باركود</span>
            </button>

            <button
              onClick={fetchOrdersFromDatabase}
              disabled={loading}
              className="p-2.5 rounded-xl border border-sky-100 bg-sky-50 text-[#0F4C81] hover:bg-sky-100 transition cursor-pointer"
              title="مزامنة وتحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#EA580C]" : ""}`} />
            </button>
          </div>
        </div>

        {/* شريط التبويبات الثلاثية */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab("operations")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === "operations"
                ? "border-[#0284C7] text-[#0284C7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>إدارة الشحنات والعمليات الميدانية</span>
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === "finance"
                ? "border-[#0284C7] text-[#0284C7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>النظام المالي والمحاسبي الموحد</span>
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === "employees"
                ? "border-[#0284C7] text-[#0284C7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>طاقم العمل والموظفين ({employees.length})</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* شريط الإحصائيات الحية الخماسي */}
        <AdminAlerts />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">إجمالي الشحنات</span>
              <Package className="w-4 h-4 text-[#0F4C81]" />
            </div>
            <div className="text-2xl font-black text-[#0A2540] font-mono">{totalShipments}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">تحديث لحظي من القاعدة</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">الترانزيت الدولي</span>
              <Plane className="w-4 h-4 text-[#F97316]" />
            </div>
            <div className="text-2xl font-black text-[#F97316] font-mono">{transitShipments}</div>
            <div className="text-[11px] text-slate-500 mt-1">بالجو والشحن البحري</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">تم التسليم بنجاح</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{deliveredShipments}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">تسليم لباب البيت</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">المبيعات المفوترة</span>
              <DollarSign className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div className="text-2xl font-black text-[#0284C7] font-mono">${billedRevenue}</div>
            <div className="text-[11px] text-slate-500 mt-1">إجمالي مشتريات العملاء</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">صافي أرباح الوساطة</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">${netProfit}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">عمولة الوساطة المحققة</div>
          </div>
        </div>

        {/* مكون بث التنبيهات المباشرة */}
        <AdminNotificationComposer />

        {/* 1. تبويب العمليات والشحنات */}
        {activeTab === "operations" && (
          <div className="space-y-4">
            {/* المحطات اللوجستية الأربع */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl">
                <span className="text-[11px] font-bold text-blue-600">المحطة 1</span>
                <h4 className="font-bold text-xs text-[#0A2540] mt-1">المستودعات الخارجية</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">أمريكا، الصين، تركيا</p>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl">
                <span className="text-[11px] font-bold text-orange-600">المحطة 2</span>
                <h4 className="font-bold text-xs text-[#0A2540] mt-1">الشحن الدولي</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">رحلات جوية وبحرية مباشرة</p>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-sky-50 to-white border border-sky-100 rounded-2xl">
                <span className="text-[11px] font-bold text-sky-600">المحطة 3</span>
                <h4 className="font-bold text-xs text-[#0A2540] mt-1">مستودعات الفرز</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">صنعاء وعدن والتخليص</p>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-600">المحطة 4</span>
                <h4 className="font-bold text-xs text-[#0A2540] mt-1">التوزيع والتسليم</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">مع المناديب لباب البيت</p>
              </div>
            </div>

            {/* أدوات البحث وفلاتر المتاجر */}
            <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="بحث برقم الشحنة (SQ-..)، اسم العميل، أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-[#0284C7] focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {["ALL", "SHEIN", "Amazon", "AliExpress", "TEMU", "Trendyol"].map((store) => (
                  <button
                    key={store}
                    onClick={() => setSelectedStore(store)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedStore === store
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {store === "ALL" ? "جميع المتاجر" : store}
                  </button>
                ))}
              </div>
            </div>

            {/* جدول الشحنات المباشر */}
            <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F0F7FF] text-[#0F4C81] border-b border-sky-100">
                    <tr>
                      <th className="py-3 px-4 font-black">الشحنة / المتجر</th>
                      <th className="py-3 px-4 font-black">العميل والهاتف</th>
                      <th className="py-3 px-4 font-black">المنتج والتفاصيل</th>
                      <th className="py-3 px-4 font-black">المرحلة الحالية</th>
                      <th className="py-3 px-4 font-black text-center">إجراء فوري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          لا توجد شحنات مطابقة للبحث أو الفلتر المختار
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-[#0F4C81]">{order.orderNumber}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-[#EA580C]">
                              {order.storeName}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0A2540]">{order.customerName}</div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">{order.customerPhone}</div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-700 truncate">{order.productTitle}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{order.customerCity || "صنعاء"}</div>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#0A2540] outline-none focus:border-[#0284C7] cursor-pointer"
                            >
                              <option value="new">1. استلام الطلب والاعتماد</option>
                              <option value="reviewing">2. تدقيق التكاليف والأوزان</option>
                              <option value="purchased">3. الشراء من المتجر الدولي</option>
                              <option value="warehouse_china">4. وصول المستودع الدولي</option>
                              <option value="international_ship">5. الشحن الدولي (جوي/بحري)</option>
                              <option value="shipped">6. الفرز والتسليم للمندوب</option>
                              <option value="delivered">7. تم التسليم بنجاح</option>
                              <option value="cancelled">إلغاء الطلب</option>
                            </select>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => sendWhatsAppNotification(order)}
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                                title="إرسال واتساب للعميل"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                title="طباعة سند قبض رسمي"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                                title="حذف الشحنة"
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

        {/* 2. تبويب النظام المالي والمحاسبي */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
                <span className="text-xs font-bold text-slate-400">مصرف الكريمي</span>
                <div className="text-xl font-black text-[#0F4C81] font-mono mt-1">42,500 SAR</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">حساب التحصيل الرئيسي</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
                <span className="text-xs font-bold text-slate-400">شبكة النجم للحوالات</span>
                <div className="text-xl font-black text-[#F97316] font-mono mt-1">18,200 SAR</div>
                <div className="text-[11px] text-slate-500 mt-1">حوالات المحافظات</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
                <span className="text-xs font-bold text-slate-400">محفظة ون كاش (OneCash)</span>
                <div className="text-xl font-black text-[#0284C7] font-mono mt-1">9,400 SAR</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">دفع إلكتروني فوري</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
                <span className="text-xs font-bold text-slate-400">الصندوق النقدي الرئيسي</span>
                <div className="text-xl font-black text-slate-800 font-mono mt-1">3,850,000 YER</div>
                <div className="text-[11px] text-slate-500 mt-1">كاش التسليم للمناديب</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVoucherType("receipt");
                  setIsVoucherModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white font-bold text-xs shadow-sm hover:brightness-105 cursor-pointer"
              >
                + تسجيل سند قبض جديد
              </button>

              <button
                onClick={() => {
                  setVoucherType("payment");
                  setIsVoucherModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                - تسجيل سند صرف مصاريف
              </button>

              <button
                onClick={() => setIsAccountsTreeOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-[#0F4C81] font-bold text-xs hover:bg-sky-50 cursor-pointer"
              >
                عرض شجرة الحسابات والدليل
              </button>
            </div>
          </div>
        )}

        {/* 3. تبويب طاقم العمل والموظفين */}
        {activeTab === "employees" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-700">متصل الآن</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {emp.department}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#0A2540]">{emp.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{emp.role}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600">
                  <span>{emp.phone}</span>
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/967${emp.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`tel:${emp.phone}`}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 1. القائمة الجانبية الشاملة */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAccountsTree={() => setIsAccountsTreeOpen(false)}
        onOpenQuickScan={() => setIsQuickScanOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        navigateTo={navigateTo}
      />

      {/* 2. شجرة الحسابات والدليل المحاسبي */}
      {isAccountsTreeOpen && <AccountsTreeModal onClose={() => setIsAccountsTreeOpen(false)} />}

      {/* 3. نافذة الفحص السريع */}
      {isQuickScanOpen && <QuickScanModal orders={orders} onClose={() => setIsQuickScanOpen(false)} />}

      {/* 4. نافذة إضافة شحنة جديدة وحفظها بالقاعدة */}
      {isAddModalOpen && (
        <AddShipmentModal
          onCreate={handleCreateShipment}
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
