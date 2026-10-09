import { createFileRoute, useLocation } from "@tanstack/react-router";
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
  const [now, setNow] = useState(() => new Date());
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [posItemName, setPosItemName] = useState("");
  const [posQuantity, setPosQuantity] = useState("1");
  const [posUnitPrice, setPosUnitPrice] = useState("");
  const [posNotice, setPosNotice] = useState("");

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
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshPendingPayments = async () => {
    const { count, error } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (!error) setPendingPaymentsCount(count ?? 0);
  };

  useEffect(() => {
    refreshPendingPayments();
    const channel = supabase
      .channel("admin_pending_payments_badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, refreshPendingPayments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const downloadLocalBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      notice: "نسخة من البيانات المحملة في هذه الصفحة فقط، وليست نسخة كاملة أو مشفرة من قاعدة البيانات.",
      orders,
      employees,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alsouk-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyTrackingCode = async (order: OrderItem) => {
    const tracking = order.intlTrackingNumber || order.orderNumber;
    try {
      await navigator.clipboard.writeText(tracking);
      window.alert(`تم نسخ رقم التتبع: ${tracking}`);
    } catch {
      window.prompt("انسخ رقم التتبع:", tracking);
    }
  };

  const printPosReceipt = () => {
    const qty = Math.max(1, Number(posQuantity) || 1);
    const unit = Math.max(0, Number(posUnitPrice) || 0);
    const total = qty * unit;
    if (!posItemName.trim() || total <= 0) {
      setPosNotice("أدخل اسم الصنف وسعراً صحيحاً قبل الطباعة.");
      return;
    }
    const receiptWindow = window.open("", "_blank", "width=420,height=640");
    if (!receiptWindow) {
      setPosNotice("اسمح بالنوافذ المنبثقة لطباعة الفاتورة.");
      return;
    }
    receiptWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>فاتورة كاشير</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#123}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{border-bottom:1px solid #ddd;padding:12px;text-align:right}.total{font-size:18px;font-weight:bold;margin-top:24px}</style><h1>السوق الشامل — فاتورة كاشير</h1><p>${new Date().toLocaleString("ar-YE")}</p><table><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr><tr><td>${posItemName.replace(/[<>]/g, "")}</td><td>${qty}</td><td>${unit.toLocaleString("en-US")}</td></tr></table><p class="total">الإجمالي: ${total.toLocaleString("en-US")} YER</p><script>window.onload=()=>window.print()<\/script></html>`);
    receiptWindow.document.close();
    setPosNotice("تم فتح إيصال الطباعة. هذه الفاتورة لا تُحفظ في قاعدة البيانات.");
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
    const rawPhone = String(order.customerPhone ?? "").replace(/\D/g, "");
    const phone = rawPhone
      ? rawPhone.startsWith("967")
        ? rawPhone
        : `967${rawPhone.replace(/^0+/, "")}`
      : "";

    if (!phone) {
      window.alert("لا يوجد رقم هاتف صالح للعميل في هذا الطلب.");
      return;
    }

    const statusLabel = STATUS_TEXT[order.status] || order.status;
    const message = encodeURIComponent(
      `مرحباً ${order.customerName}،\nشحنتك رقم (${order.orderNumber}) من متجر ${order.storeName}:\nالحالة الحالية: ${statusLabel}\nرقم التتبع: ${order.intlTrackingNumber || order.orderNumber}\n\nشكراً لتسوقك مع السوق الشامل 🌟`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  // تصفية الشحنات
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStore = selectedStore === "ALL" || o.storeName.toUpperCase() === selectedStore.toUpperCase();
      const matchSearch =
        searchQuery === "" ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customerPhone ?? "").includes(searchQuery) ||
        (o.intlTrackingNumber && o.intlTrackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStore && matchSearch;
    });
  }, [orders, selectedStore, searchQuery]);

  // المؤشرات KPIs
  const totalShipments = orders.length;
  const transitShipments = orders.filter((o) => ["purchased", "warehouse_china", "international_ship"].includes(o.status)).length;
  const deliveredShipments = orders.filter((o) => o.status === "delivered").length;
  const billedRevenue: number | null = null;
  const netProfit: number | null = null;

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#0A2540] font-sans lg:pr-72" dir="rtl">
      {/* قائمة الإدارة الدائمة على الشاشات الكبيرة، مع الإبقاء على القائمة المنبثقة للجوال */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 flex-col border-l border-sky-950 bg-[#174F75] text-white shadow-xl lg:flex">
        <div className="border-b border-white/10 bg-[#123F60] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white text-[#174F75] shadow-sm">
              <Package className="size-6" />
            </div>
            <div>
              <div className="text-base font-black">السوق الشامل</div>
              <div className="mt-0.5 text-[11px] text-sky-100">نظام إدارة الأعمال</div>
            </div>
          </div>
        </div>
        <div className="border-b border-white/10 px-4 py-4">
          <div className="rounded-xl bg-white/10 px-3 py-3">
            <div className="text-sm font-bold">مرحباً، مشرف النظام</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-sky-100">
              <span className="size-2 rounded-full bg-emerald-400" /> مدير النظام
            </div>
          </div>
        </div>
        <nav aria-label="القائمة الرئيسية للإدارة" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {[
            { label: "الرئيسية", icon: Home, path: "/admin" },
            { label: "إدارة الطلبات والشحنات", icon: Truck, path: "/admin" },
            { label: "مسار تتبع الشحنات", icon: Plane, path: "/admin-tracking" },
            { label: "المدفوعات", icon: Wallet, path: "/payments" },
            { label: "إدارة العملاء", icon: Users, path: "/admin-clients" },
            { label: "الأصناف والمخزون", icon: Package, path: "/inventory" },
            { label: "فواتير المبيعات", icon: FileText, path: "/sales-invoices" },
            { label: "فواتير المشتريات", icon: FileSpreadsheet, path: "/purchase-invoices" },
            { label: "الحسابات والصناديق", icon: Coins, path: "/accounts" },
            { label: "الموظفون", icon: UserCheck, path: "/employees" },
            { label: "الموردون", icon: Truck, path: "/suppliers" },
            { label: "الإشعارات", icon: Bell, path: "/notifications" },
          ].map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigateTo(path)}
              aria-current={path === currentPath ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-bold transition-colors ${
                path === currentPath
                  ? "bg-[#23658F] text-white shadow-sm"
                  : "text-sky-50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-4 shrink-0 text-sky-100" />
              <span>{label}</span>
              <span className="mr-auto text-sky-200">‹</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-center text-[10px] text-sky-100">
          السوق الشامل © 2026
        </div>
      </aside>

      {/* الترويسة الرئيسية */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="mx-auto flex min-h-[4.25rem] max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-xl hover:bg-sky-50 text-[#0F4C81] border border-sky-100 transition-colors cursor-pointer lg:hidden"
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

          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex min-h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-3 py-2 text-white text-xs font-bold shadow-md transition-all hover:shadow-lg sm:gap-2 sm:px-4"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">شحنة جديدة</span>
            </button>

            <button
              onClick={() => setIsQuickScanOpen(true)}
              className="hidden min-h-10 items-center gap-1.5 rounded-xl bg-[#0F4C81] px-3 py-2 text-white text-xs font-bold transition-colors hover:bg-[#0A2540] sm:flex"
            >
              <ScanLine className="w-4 h-4" />
              <span>مسح باركود</span>
            </button>

            <button type="button" onClick={() => navigateTo("/admin-tracking")} className="hidden md:flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-3 text-xs font-bold text-[#0F4C81] hover:bg-sky-50">
              <Truck className="size-4" /><span>التتبع</span>
            </button>

            <button
              onClick={fetchOrdersFromDatabase}
              disabled={loading}
              className="p-2.5 rounded-xl border border-sky-100 bg-sky-50 text-[#0F4C81] hover:bg-sky-100 transition cursor-pointer"
              title="مزامنة وتحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#EA580C]" : ""}`} />
            </button>
            <button onClick={() => { setPosNotice(""); setIsPosOpen(true); }} className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700" type="button">
              <Wallet className="size-4" /> كاشير POS
            </button>
            <button onClick={downloadLocalBackup} className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50" type="button" title="تنزيل نسخة محلية من بيانات هذه الصفحة">
              <Download className="size-4" /> نسخة احتياطية
            </button>
            <button onClick={() => navigateTo("/notifications")} className="relative p-2.5 rounded-xl border border-sky-100 bg-white text-[#0F4C81] hover:bg-sky-50" type="button" title="الإشعارات">
              <Bell className="size-4" />
              {pendingPaymentsCount > 0 && <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black grid place-items-center">{pendingPaymentsCount}</span>}
            </button>
            <a href="https://wa.me/967773370041" target="_blank" rel="noreferrer" className="hidden xl:grid p-2.5 rounded-xl bg-emerald-50 text-emerald-700" title="تواصل واتساب"><MessageCircle className="size-4" /></a>
            <div className="hidden 2xl:block text-left text-[10px] leading-5 text-slate-500"><div>{now.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}</div><div>{now.toLocaleDateString("ar-YE")}</div></div>
            <button onClick={() => navigateTo("/")} className="hidden xl:block px-3 py-2.5 rounded-xl border border-sky-100 bg-white text-[#0F4C81] text-xs font-bold hover:bg-sky-50" type="button">معاينة المتجر</button>
          </div>
        </div>

        {/* شريط التبويبات الثلاثية */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t border-slate-100 px-2 sm:gap-2 sm:px-6 lg:px-8">
          <button
            onClick={() => setActiveTab("operations")}
            className={`flex flex-none items-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
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
            className={`flex flex-none items-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
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
            className={`flex flex-none items-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
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

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
        {/* شريط الإحصائيات الحية الخماسي */}
        <AdminAlerts />
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="التنبيهات العاجلة">
          <button type="button" onClick={() => navigateTo("/payments")} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right hover:bg-amber-100">
            <span><b className="block text-sm text-amber-900">طلبات الدفع المعلقة</b><small className="mt-1 block text-amber-800">{pendingPaymentsCount} طلب بانتظار المراجعة من قاعدة البيانات</small></span><span className="rounded-xl bg-white px-3 py-2 text-lg font-black text-amber-700">{pendingPaymentsCount}</span>
          </button>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-right">
            <span><b className="block text-sm text-orange-900">شحنات التخليص الجمركي</b><small className="mt-1 block text-orange-800">راجع حالات الجمارك في قائمة الشحنات أو صفحة التتبع.</small></span><span className="rounded-xl bg-white px-3 py-2 text-lg font-black text-orange-700">{orders.filter((o) => /جمارك|customs/i.test(String(o.status))).length}</span>
          </div>
        </section>
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
            <div className="text-2xl font-black text-[#0284C7] font-mono">{billedRevenue === null ? "—" : billedRevenue.toLocaleString("en-US")}</div>
            <div className="text-[11px] text-slate-500 mt-1">تظهر بعد ربط بيانات الفواتير</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">صافي أرباح الوساطة</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{netProfit === null ? "—" : netProfit.toLocaleString("en-US")}</div>
            <div className="text-[11px] text-slate-500 mt-1">تظهر بعد ربط بيانات الفواتير</div>
          </div>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4" aria-label="التحليل الأسبوعي">
          <div className="xl:col-span-2 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-[#0A2540]">حركة المبيعات والمشتريات — آخر 7 أيام</h2><p className="mt-1 text-[11px] text-slate-500">عرض توضيحي فقط؛ لا يمثل بيانات فعلية.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-bold text-sky-700">أسبوعي</span></div>
            <div className="mt-5 flex h-40 items-end justify-around gap-3 border-b border-slate-100 px-2">
              {[{d:"السبت",s:55,p:31},{d:"الأحد",s:72,p:38},{d:"الاثنين",s:61,p:49},{d:"الثلاثاء",s:39,p:43},{d:"الأربعاء",s:28,p:20},{d:"الخميس",s:58,p:91},{d:"الجمعة",s:34,p:24}].map((day) => <div key={day.d} className="flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[118px] items-end gap-1"><span className="w-3 rounded-t bg-blue-500" style={{height:`${day.s}%`}} title="مبيعات توضيحية"/><span className="w-3 rounded-t bg-rose-400" style={{height:`${day.p}%`}} title="مشتريات توضيحية"/></div><span className="pb-2 text-[9px] text-slate-500">{day.d}</span></div>)}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px]"><span className="text-rose-700">يوم الذروة المعلن: 501,000 YER • يحتاج مطابقة مع الفواتير الفعلية</span><span className="flex gap-3"><span className="text-blue-700">■ المبيعات</span><span className="text-rose-600">■ المشتريات</span></span></div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"><h2 className="font-black text-[#0A2540]">ملخص سير العمليات</h2><p className="mt-1 text-[11px] text-slate-500">محسوب من الشحنات المحمّلة في الصفحة.</p><div className="mt-5 space-y-4">{[{label:"طلبات قيد المراجعة",count:orders.filter(o=>o.status==="reviewing").length,color:"bg-amber-500"},{label:"طلبات قيد الشراء",count:orders.filter(o=>o.status==="purchased").length,color:"bg-blue-500"},{label:"شحنات دولية",count:orders.filter(o=>o.status==="international_ship").length,color:"bg-violet-500"},{label:"تم التسليم",count:deliveredShipments,color:"bg-emerald-500"}].map((x)=><div key={x.label}><div className="mb-1 flex justify-between text-xs"><span>{x.label}</span><b>{x.count}</b></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${x.color}`} style={{width:`${orders.length ? Math.max(4,Math.min(100,(x.count/orders.length)*100)) : 0}%`}}/></div></div>)}</div><button type="button" onClick={()=>navigateTo("/payments")} className="mt-5 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-[#0F4C81]">مراجعة المدفوعات المعلقة ({pendingPaymentsCount})</button></div>
        </section>

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
                {["ALL", "SHEIN", "Amazon", "AliExpress", "Trendyol", "iHerb", "TEMU"].map((store) => (
                  <button
                    key={store}
                    onClick={() => setSelectedStore(store)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedStore === store
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {store === "ALL" ? "جميع المتاجر" : store === "iHerb" ? "آي هيرب iHerb" : store === "SHEIN" ? "شي إن SHEIN" : store === "Amazon" ? "أمازون Amazon" : store === "AliExpress" ? "علي إكسبريس" : store}
                  </button>
                ))}
              </div>
            </div>

            {/* قائمة بطاقات للجوال */}
            <section className="space-y-3 md:hidden" aria-label="قائمة الشحنات للجوال">
              <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3">
                <h2 className="font-black text-sm text-[#0A2540]">الطلبات والشحنات</h2>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-[#0F4C81]">{filteredOrders.length} نتيجة</span>
              </div>
              {filteredOrders.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">لا توجد شحنات مطابقة.</div> : filteredOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="break-all font-mono text-sm font-black text-[#0F4C81]">{order.orderNumber}</p><span className="mt-1 inline-flex rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700">{order.storeName}</span></div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{STATUS_MAP_TO_ARABIC[order.status]}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-slate-400">العميل</p><p className="mt-1 font-bold">{order.customerName}</p><p dir="ltr" className="mt-1 text-right font-mono text-slate-500">{order.customerPhone || "—"}</p></div>
                    <div><p className="text-slate-400">المنتج / المدينة</p><p className="mt-1 line-clamp-2 font-bold">{order.productTitle}</p><p className="mt-1 text-slate-500">{order.customerCity || "صنعاء"}</p></div>
                  </div>
                  <label className="mt-3 block text-[11px] font-bold text-slate-500">تحديث المرحلة
                    <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#0A2540] outline-none focus:border-[#0284C7]">
                      <option value="new">1. استلام الطلب والاعتماد</option><option value="reviewing">2. تدقيق التكاليف والأوزان</option><option value="purchased">3. الشراء من المتجر الدولي</option><option value="warehouse_china">4. وصول المستودع الدولي</option><option value="international_ship">5. الشحن الدولي (جوي/بحري)</option><option value="shipped">6. الفرز والتسليم للمندوب</option><option value="delivered">7. تم التسليم بنجاح</option><option value="cancelled">إلغاء الطلب</option>
                    </select>
                  </label>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => sendWhatsAppNotification(order)} aria-label="رسالة واتساب" className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle className="size-4" /></button>
                    <button type="button" onClick={() => void copyTrackingCode(order)} aria-label="نسخ رقم التتبع" className="flex min-h-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Copy className="size-4" /></button>
                    <button type="button" onClick={() => setPrintingOrder(order)} aria-label="طباعة السند" className="flex min-h-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Printer className="size-4" /></button>
                    <button type="button" onClick={() => void handleDeleteOrder(order.id, order.orderNumber)} aria-label="حذف الشحنة" className="flex min-h-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><Trash2 className="size-4" /></button>
                  </div>
                </article>
              ))}
            </section>

            {/* جدول الشحنات للشاشات المتوسطة والكبيرة */}
            <div id="orders-table" className="hidden overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs md:block">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-black text-sm text-[#0A2540]">الطلبات والشحنات</h2><span className="text-xs text-slate-500">{filteredOrders.length} نتيجة</span></div>
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
                                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer" aria-label="رسالة واتساب للعميل"
                                title="إرسال واتساب للعميل"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => copyTrackingCode(order)}
                                className="p-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer" aria-label="نسخ رقم التتبع"
                                title="نسخ رقم التتبع"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer" aria-label="طباعة السند"
                                title="طباعة سند قبض رسمي"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer" aria-label="حذف الشحنة"
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">الأرصدة أدناه قيم ابتدائية واردة في المواصفات وليست قراءة مباشرة من قاعدة البيانات؛ لا تعتمدها للمحاسبة قبل ربط جدول funds.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {[
                { name: "بنك الكريمي الرئيسي", amount: "3,450,000", currency: "YER", tone: "text-[#0F4C81]" },
                { name: "محفظة ون كاش OneCash", amount: "820,000", currency: "YER", tone: "text-[#0284C7]" },
                { name: "الخزينة المركزية — صنعاء", amount: "410,000", currency: "YER", tone: "text-emerald-700" },
                { name: "صندوق التوزيع — عدن", amount: "280,000", currency: "YER", tone: "text-orange-600" },
                { name: "مصرف الراجحي — حوالات", amount: "4,200", currency: "SAR", tone: "text-violet-700" },
              ].map((fund) => <div key={fund.name} className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs"><span className="text-xs font-bold text-slate-500">{fund.name}</span><div className={`text-xl font-black font-mono mt-2 ${fund.tone}`}>{fund.amount} {fund.currency}</div><div className="text-[10px] text-amber-700 mt-2">قيمة توضيحية • غير متصلة بقاعدة البيانات</div></div>)}
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
        onOpenAccountsTree={() => setIsAccountsTreeOpen(true)}
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

      {isPosOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="pos-title">
          <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" dir="rtl">
            <div className="mb-5 flex items-center justify-between"><h2 id="pos-title" className="text-lg font-black text-[#0A2540]">كاشير POS سريع</h2><button type="button" onClick={() => setIsPosOpen(false)} className="rounded-xl bg-slate-100 p-2" aria-label="إغلاق"><X className="size-4" /></button></div>
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">هذه النسخة تحسب وتطبع إيصالاً محلياً فقط. لا تحفظ مبيعات في قاعدة البيانات لعدم توفر تعريف جدول الفواتير في الأنواع الحالية.</p>
            <div className="space-y-3"><label className="block text-xs font-bold">اسم الصنف<input value={posItemName} onChange={(e) => setPosItemName(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="مثال: رسوم شحن" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">الكمية<input type="number" min="1" value={posQuantity} onChange={(e) => setPosQuantity(e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label><label className="block text-xs font-bold">سعر الوحدة (YER)<input type="number" min="0" value={posUnitPrice} onChange={(e) => setPosUnitPrice(e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label></div><div className="rounded-xl bg-slate-50 p-3 text-sm font-black">الإجمالي: {(Math.max(1, Number(posQuantity) || 1) * Math.max(0, Number(posUnitPrice) || 0)).toLocaleString("en-US")} YER</div>{posNotice && <p className="text-xs font-bold text-sky-700">{posNotice}</p>}<button type="button" onClick={printPosReceipt} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">طباعة الإيصال</button></div>
          </section>
        </div>
      )}

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
                  alert("لم يُحفظ السند: جدول vouchers غير مربوط في نسخة قاعدة البيانات الحالية. اربط الجدول وسياساته أولاً حتى لا يظهر نجاح غير حقيقي.");
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
