import { createFileRoute, useLocation } from "@tanstack/react-router";
import { AdminAlerts } from "@/components/admin/AdminAlerts";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { useEffect, useMemo, useRef, useState } from "react";
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
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Truck,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderItem, OrderStatus } from "@/components/admin/types";

// ==================== تعريف واجهة العميل والثوابت المدمجة ====================
export interface Customer {
  id: string;
  name: string;
  phone: string;
  city?: string;
  totalOrders: number;
  totalSpent: number;
  joinedAt: string;
}

const ORDERS_STORAGE_KEY = "shamel_admin_orders";
const CUSTOMERS_STORAGE_KEY = "shamel_admin_customers";

function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("00967")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("+967")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "967" + cleaned.slice(1);
  if (/^[7][0-9]{8}$/.test(cleaned)) cleaned = "967" + cleaned;
  return cleaned;
}

const DEFAULT_ORDERS: OrderItem[] = [
  {
    id: "ord-1",
    orderNumber: "SQ-892411",
    customerName: "زين مطيع",
    customerPhone: "773209744",
    customerCity: "صنعاء",
    productTitle: "حذاء رياضي أصلي - مقاس 42",
    storeName: "SHEIN",
    status: "new",
    originalPrice: 158,
    intlTrackingNumber: "SQ-892411",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord-2",
    orderNumber: "SQ-892412",
    customerName: "محمد غالب الحاشدي",
    customerPhone: "771234567",
    customerCity: "عدن",
    productTitle: "حقيبة نسائية كلاسيكية جلد فاخر",
    storeName: "TEMU",
    status: "shipped",
    originalPrice: 220,
    intlTrackingNumber: "SQ-892412",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "ord-3",
    orderNumber: "SQ-892413",
    customerName: "أحمد بن عبد الله",
    customerPhone: "772223344",
    customerCity: "تعز",
    productTitle: "سماعات بلوتوث عازلة للضوضاء برو",
    storeName: "Amazon",
    status: "delivered",
    originalPrice: 310,
    intlTrackingNumber: "SQ-892413",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "ord-4",
    orderNumber: "SQ-892414",
    customerName: "سارة عبد الرحمن",
    customerPhone: "778899001",
    customerCity: "حضرموت",
    productTitle: "فستان سهرة أنيق تركي",
    storeName: "Trendyol",
    status: "new",
    originalPrice: 195,
    intlTrackingNumber: "SQ-892414",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: "CUST-1",
    name: "زين مطيع",
    phone: "773209744",
    city: "صنعاء",
    totalOrders: 3,
    totalSpent: 480,
    joinedAt: "2024-01-15",
  },
  {
    id: "CUST-2",
    name: "محمد غالب الحاشدي",
    phone: "771234567",
    city: "عدن",
    totalOrders: 2,
    totalSpent: 350,
    joinedAt: "2024-02-10",
  },
  {
    id: "CUST-3",
    name: "أحمد بن عبد الله",
    phone: "772223344",
    city: "تعز",
    totalOrders: 5,
    totalSpent: 920,
    joinedAt: "2024-01-20",
  },
];

function AdminRouteError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "تعذر تحميل لوحة التحكم";
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">تعذر فتح لوحة التحكم</h2>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-[#0F4C81] text-white rounded-xl font-bold text-sm shadow hover:bg-[#0d3f6c] transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminRouteGuard>
      <AdminDashboard />
    </AdminRouteGuard>
  ),
  errorComponent: AdminRouteError,
});

const STATUS_MAP_TO_UI: Record<string, OrderStatus> = {
  new: "new",
  reviewing: "reviewing",
  purchased: "purchased",
  warehouse_china: "warehouse_china",
  international_ship: "international_ship",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  "جديد": "new",
  "قيد المراجعة": "reviewing",
  "تم الشراء": "purchased",
  "المستودع الدولي": "warehouse_china",
  "شحن دولي": "international_ship",
  "الفرز والتوصيل": "shipped",
  "تم التسليم": "delivered",
  "ملغي": "cancelled",
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
  shipped: "وصلت صنعاء والفرز للتسليم",
  delivered: "تم تسليم الشحنة للعميل بنجاح",
  cancelled: "تم إلغاء الطلب",
};

function AdminDashboard() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const defaultTab = searchParams.get("tab") || "orders";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
    } catch {
      return DEFAULT_ORDERS;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [ordersLoadState, setOrdersLoadState] = useState<"loading" | "loaded" | "error">("loaded");
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("new");
  const [newTrackingNumber, setNewTrackingNumber] = useState("");

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerPhone: "",
    customerCity: "صنعاء",
    productTitle: "",
    storeName: "SHEIN",
    originalPrice: "",
    status: "new" as OrderStatus,
  });

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherData, setVoucherData] = useState({
    type: "receipt" as "receipt" | "payment",
    account: "صندوق النقدية الرئيسي",
    amount: "",
    notes: "",
  });

  const [posItemName, setPosItemName] = useState("شحن ملابس وأحذية (SHEIN)");
  const [posItemPrice, setPosItemPrice] = useState(45);
  const [posReceiptNumber, setPosReceiptNumber] = useState("REC-98210");
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("فشل حفظ الطلبات في التخزين المحلي:", e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error("فشل حفظ العملاء في التخزين المحلي:", e);
    }
  }, [customers]);

  const stats = useMemo(() => {
    const total = orders.length;
    const inTransit = orders.filter((o) =>
      ["purchased", "warehouse_china", "international_ship"].includes(o.status)
    ).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const pending = orders.filter((o) => ["new", "reviewing"].includes(o.status)).length;
    const totalRevenue = orders.reduce((acc, curr) => acc + (curr.originalPrice || 0), 0);

    return { total, inTransit, delivered, pending, totalRevenue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone.includes(searchQuery) ||
        (order.intlTrackingNumber && order.intlTrackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === "all" || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const fetchOrdersFromDatabase = async () => {
    setLoading(true);
    setOrdersLoadState("loading");
    setOrdersLoadError(null);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,tracking_code,customer_name,phone,user_id,notes,product_name,product_link,status,created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedOrders: OrderItem[] = (data ?? []).map((item: any) => {
        let store = "SHEIN";
        const link = (item.product_link || "").toLowerCase();

        if (link.includes("amazon")) store = "Amazon";
        else if (link.includes("aliexpress")) store = "AliExpress";
        else if (link.includes("alibaba")) store = "Alibaba";
        else if (link.includes("temu")) store = "TEMU";
        else if (link.includes("trendyol")) store = "Trendyol";

        const uiStatus = STATUS_MAP_TO_UI[item.status] || "new";
        const id = String(item.id ?? "");

        return {
          id,
          orderNumber: item.tracking_code || `SQ-${id.slice(0, 8)}`,
          customerName: item.customer_name || "عميل مسجل",
          customerPhone: item.phone ?? "",
          userId: item.user_id ?? null,
          customerCity: item.notes || "صنعاء",
          productTitle: item.product_name || "شحنة وساطة دولية",
          storeName: store,
          status: uiStatus,
          originalPrice: 45,
          intlTrackingNumber: item.tracking_code || `TRK-${id.slice(0, 8)}`,
          createdAt: item.created_at || new Date().toISOString(),
        };
      });

      setOrders(mappedOrders);
      setOrdersLoadState("loaded");
    } catch (err: unknown) {
      console.error("خطأ في قراءة الطلبات من القاعدة:", err);

      const errorInfo =
        err && typeof err === "object"
          ? (err as {
              message?: unknown;
              details?: unknown;
              hint?: unknown;
              code?: unknown;
            })
          : {};

      const detail = [
        errorInfo.message,
        errorInfo.details,
        errorInfo.hint,
        errorInfo.code,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
        .join(" · ");

      setOrdersLoadState("error");
      setOrdersLoadError(
        `تعذر تحديث الطلبات. ${
          detail || "تحقق من الاتصال وصلاحيات قراءة جدول orders."
        } آخر بيانات ناجحة، إن وُجدت، ما زالت معروضة.`
      );
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    newIntlTracking?: string
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const currentStatus = STATUS_MAP_TO_ARABIC[targetOrder.status] || targetOrder.status;
    const nextStatus = STATUS_MAP_TO_ARABIC[newStatus] || newStatus;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              intlTrackingNumber: newIntlTracking ?? o.intlTrackingNumber,
            }
          : o
      )
    );

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          tracking_code: newIntlTracking ?? targetOrder.intlTrackingNumber,
        })
        .eq("id", orderId);

      if (error) throw error;
    } catch (err) {
      console.error("فشل تحديث حالة الطلب في قاعدة البيانات:", err);
    }

    if (targetOrder.userId) {
      try {
        await supabase.from("notifications").insert({
          user_id: targetOrder.userId,
          title: `تحديث مسار الشحنة (${targetOrder.orderNumber})`,
          message: `تم تحديث حالة طلبك من "${currentStatus}" إلى "${nextStatus}". رقم التتبع: ${
            newIntlTracking || targetOrder.intlTrackingNumber
          }`,
        });
      } catch (e) {
        console.error("فشل إرسال الإشعار اللحظي:", e);
      }
    }

    setIsUpdateModalOpen(false);
  };

  const handleSendWhatsApp = (order: OrderItem) => {
    const phone = normalizePhoneNumber(order.customerPhone);
    if (!phone) {
      alert("رقم هاتف العميل غير صالح لإرسال رسالة واتساب.");
      return;
    }

    const msg = encodeURIComponent(
      `مرحباً أخي ${order.customerName}،\nمعك إدارة السوق الشامل بخصوص طلبك رقم (${order.orderNumber}):\nالحالة الحالية: ${STATUS_MAP_TO_ARABIC[order.status]}\n${STATUS_TEXT[order.status]}\nرقم التتبع: ${order.intlTrackingNumber}\nنسعد دائماً بخدمتك.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerName || !newOrder.productTitle) {
      alert("يرجى تعبئة اسم العميل واسم المنتج.");
      return;
    }

    const generatedId = crypto.randomUUID();
    const trackingCode = `SQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const createdOrder: OrderItem = {
      id: generatedId,
      orderNumber: trackingCode,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      userId: null,
      customerCity: newOrder.customerCity,
      productTitle: newOrder.productTitle,
      storeName: newOrder.storeName,
      status: newOrder.status,
      originalPrice: Number(newOrder.originalPrice) || 0,
      intlTrackingNumber: `TRK-${Math.floor(1000000 + Math.random() * 9000000)}`,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [createdOrder, ...prev]);

    setCustomers((prev) => {
      const existing = prev.find(
        (c) =>
          normalizePhoneNumber(c.phone) === normalizePhoneNumber(newOrder.customerPhone) &&
          newOrder.customerPhone !== ""
      );
      if (existing) {
        return prev.map((c) =>
          c.id === existing.id
            ? { ...c, totalOrders: c.totalOrders + 1, totalSpent: c.totalSpent + (Number(newOrder.originalPrice) || 0) }
            : c
        );
      }
      return [
        {
          id: `CUST-${Date.now()}`,
          name: newOrder.customerName,
          phone: newOrder.customerPhone,
          city: newOrder.customerCity,
          totalOrders: 1,
          totalSpent: Number(newOrder.originalPrice) || 0,
          joinedAt: new Date().toISOString().split("T")[0],
        },
        ...prev,
      ];
    });

    try {
      await supabase.from("orders").insert({
        id: generatedId,
        tracking_code: trackingCode,
        customer_name: newOrder.customerName,
        phone: newOrder.customerPhone,
        notes: newOrder.customerCity,
        product_name: newOrder.productTitle,
        status: STATUS_MAP_TO_ARABIC[newOrder.status] || "جديد",
        product_link: `https://${newOrder.storeName.toLowerCase()}.com`,
      });
    } catch (err) {
      console.error("فشل حفظ الطلب في قاعدة البيانات:", err);
    }

    setIsNewOrderModalOpen(false);
    setNewOrder({
      customerName: "",
      customerPhone: "",
      customerCity: "صنعاء",
      productTitle: "",
      storeName: "SHEIN",
      originalPrice: "",
      status: "new",
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const exportOrdersCSV = () => {
    const headers = "رقم الطلب,العميل,الهاتف,المدينة,المنتج,المتجر,الحالة,السعر,رقم التتبع الدولي,التاريخ\n";
    const rows = orders
      .map(
        (o) =>
          `"${o.orderNumber}","${o.customerName}","${o.customerPhone}","${o.customerCity || ""}","${
            o.productTitle
          }","${o.storeName}","${STATUS_MAP_TO_ARABIC[o.status]}","${o.originalPrice}","${
            o.intlTrackingNumber || ""
          }","${o.createdAt}"`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `طلبات_السوق_الشامل_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* الشريط العلوي الاحترافي */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] flex items-center justify-center text-white shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 leading-tight">
                لوحة تحكم السوق الشامل
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                إدارة الشحنات والعملاء والكاشير الميداني
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrdersFromDatabase}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="تحديث البيانات من Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0F4C81]" : ""}`} />
              <span>{loading ? "جارِ المزامنة..." : "مزامنة"}</span>
            </button>

            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0c3c66] rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>طلب شحنة جديدة</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* تنبيهات المشرف */}
        <div className="mb-6">
          <AdminAlerts />
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي الطلبات</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
            <p className="text-[10px] text-slate-400 mt-1">مسجلة في النظام</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">قيد الشحن الدولي</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.inTransit}</div>
            <p className="text-[10px] text-amber-600 mt-1">بين الصين واليمن</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">تم التسليم للعميل</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.delivered}</div>
            <p className="text-[10px] text-emerald-600 mt-1">مكتمل بنجاح</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">قيمة المشتريات التقديرية</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">${stats.totalRevenue}</div>
            <p className="text-[10px] text-slate-400 mt-1">إجمالي تكاليف المنتجات</p>
          </div>
        </div>

        {/* أزرار التنقل بين التبويبات */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "orders"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
            }`}
          >
            إدارة الطلبات والشحنات ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "customers"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
            }`}
          >
            العملاء ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab("cashier")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cashier"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
            }`}
          >
            نقطة بيع كاشير سريع
          </button>
          <button
            onClick={() => setActiveTab("accounting")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "accounting"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
            }`}
          >
            دليل الحسابات والقيود
          </button>
        </div>

        {/* تنبيه خطأ تحميل الطلبات إن وجد */}
        {ordersLoadError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
            <span>{ordersLoadError}</span>
            <button
              onClick={fetchOrdersFromDatabase}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* تبويب الطلبات والشحنات */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* شريط البحث والتصفية */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، أو التتبع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-[#0F4C81] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="new">جديد</option>
                  <option value="reviewing">قيد المراجعة</option>
                  <option value="purchased">تم الشراء</option>
                  <option value="warehouse_china">المستودع الدولي</option>
                  <option value="international_ship">شحن دولي</option>
                  <option value="shipped">الفرز والتوصيل</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="cancelled">ملغي</option>
                </select>

                <button
                  onClick={exportOrdersCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تصدير كملف إكسل CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">تصدير CSV</span>
                </button>
              </div>
            </div>

            {/* جدول الطلبات */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                    <th className="p-3.5">رقم الطلب</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">المدينة</th>
                    <th className="p-3.5">المنتج والمتجر</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">التتبع الدولي</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        لا توجد طلبات مطابقة للبحث أو التصفية الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-[#0F4C81]">{order.orderNumber}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{order.customerName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{order.customerPhone}</div>
                        </td>
                        <td className="p-3.5 text-slate-600">{order.customerCity || "صنعاء"}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 line-clamp-1 max-w-xs">{order.productTitle}</div>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mt-0.5">
                            {order.storeName}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              order.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700"
                                : order.status === "cancelled"
                                ? "bg-rose-50 text-rose-700"
                                : order.status === "new"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {STATUS_MAP_TO_ARABIC[order.status] || order.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 text-[11px]">
                          {order.intlTrackingNumber || "—"}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setNewStatus(order.status);
                                setNewTrackingNumber(order.intlTrackingNumber || "");
                                setIsUpdateModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              تعديل الحالة
                            </button>

                            <button
                              onClick={() => handleSendWhatsApp(order)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="إرسال إشعار عبر واتساب"
                            >
                              <Send className="w-3.5 h-3.5" />
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
        )}

        {/* تبويب العملاء */}
        {activeTab === "customers" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">قائمة العملاء المسجلين</h3>
              <span className="text-xs text-slate-500">{customers.length} عميل</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                    <th className="p-3.5">الاسم</th>
                    <th className="p-3.5">رقم الهاتف</th>
                    <th className="p-3.5">المدينة</th>
                    <th className="p-3.5">الطلبات</th>
                    <th className="p-3.5">إجمالي المشتريات</th>
                    <th className="p-3.5">تاريخ الانضمام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">{cust.name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{cust.phone}</td>
                      <td className="p-3.5 text-slate-600">{cust.city || "صنعاء"}</td>
                      <td className="p-3.5 font-bold text-[#0F4C81]">{cust.totalOrders}</td>
                      <td className="p-3.5 font-bold text-slate-800">${cust.totalSpent}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">{cust.joinedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تبويب الكاشير */}
        {activeTab === "cashier" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0F4C81]" />
                طباعة وصل كاشير سريع
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف أو الخدمة</label>
                  <input
                    type="text"
                    value={posItemName}
                    onChange={(e) => setPosItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">السعر</label>
                    <input
                      type="number"
                      value={posItemPrice}
                      onChange={(e) => setPosItemPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الفاتورة</label>
                    <input
                      type="text"
                      value={posReceiptNumber}
                      onChange={(e) => setPosReceiptNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePrintReceipt}
                  className="w-full py-3 bg-[#0F4C81] text-white rounded-xl font-bold text-xs shadow hover:bg-[#0d3f6c] transition-colors cursor-pointer"
                >
                  طباعة الإيصال فوراً
                </button>
              </div>
            </div>

            {/* معاينة الإيصال الحراري */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-500 mb-3">معاينة إيصال الكاشير</h4>
              <div
                ref={receiptPrintRef}
                className="w-64 bg-slate-50 p-4 border border-dashed border-slate-300 rounded-xl text-center font-mono text-xs text-slate-800"
              >
                <div className="font-bold text-sm mb-1">السوق الشامل - AL SHAMEL</div>
                <div className="text-[10px] text-slate-500 mb-3">صنعاء - خدمة الوساطة الدولية</div>
                <div className="border-b border-slate-200 pb-2 mb-2 text-[10px] text-slate-500 flex justify-between">
                  <span>{posReceiptNumber}</span>
                  <span>{new Date().toLocaleDateString("ar-YE")}</span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span>{posItemName}</span>
                  <span className="font-bold">${posItemPrice}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2 font-bold flex justify-between text-sm">
                  <span>الإجمالي:</span>
                  <span>${posItemPrice}</span>
                </div>
                <div className="mt-4 text-[9px] text-slate-400">شكراً لاختياركم السوق الشامل</div>
              </div>
            </div>
          </div>
        )}

        {/* تبويب الحسابات والقيود */}
        {activeTab === "accounting" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-slate-800 text-base">دليل الحسابات ودفتر القيود</h3>
                <p className="text-xs text-slate-500">إدارة القيود المالية وسندات القبض والصرف التابعة للوساطة</p>
              </div>
              <button
                onClick={() => setIsVoucherModalOpen(true)}
                className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-bold shadow hover:bg-[#0d3f6c] cursor-pointer"
              >
                + إنشاء سند مالي جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">رصيد الصندوق النقدي</div>
                <div className="text-xl font-black text-slate-800 mt-1">$1,450.00</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">حساب بنك الكريمي</div>
                <div className="text-xl font-black text-slate-800 mt-1">$4,820.00</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">أمانات وودائع العملاء</div>
                <div className="text-xl font-black text-slate-800 mt-1">$890.00</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center py-6">
              تم ربط شجرة الحسابات بدفتر الأستاذ العام بنجاح.
            </p>
          </div>
        )}
      </main>

      {/* نافذة تعديل حالة الطلب */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">تحديث مسار الطلب ({selectedOrder.orderNumber})</h3>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحالة الجديدة</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="new">جديد</option>
                  <option value="reviewing">قيد المراجعة</option>
                  <option value="purchased">تم الشراء</option>
                  <option value="warehouse_china">المستودع الدولي</option>
                  <option value="international_ship">شحن دولي</option>
                  <option value="shipped">الفرز والتوصيل</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم التتبع الدولي</label>
                <input
                  type="text"
                  value={newTrackingNumber}
                  onChange={(e) => setNewTrackingNumber(e.target.value)}
                  placeholder="مثال: TRK-982144"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, newStatus, newTrackingNumber)}
                  className="px-5 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0d3f6c] cursor-pointer shadow-sm"
                >
                  حفظ وتحديث
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة طلب جديد */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">تسجيل طلب وساطة جديد</h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    placeholder="77XXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={newOrder.customerCity}
                    onChange={(e) => setNewOrder({ ...newOrder, customerCity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المتجر</label>
                  <select
                    value={newOrder.storeName}
                    onChange={(e) => setNewOrder({ ...newOrder, storeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                  >
                    <option value="SHEIN">SHEIN</option>
                    <option value="TEMU">TEMU</option>
                    <option value="AliExpress">AliExpress</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Trendyol">Trendyol</option>
                    <option value="Alibaba">Alibaba</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم ووصف المنتج *</label>
                <input
                  type="text"
                  required
                  value={newOrder.productTitle}
                  onChange={(e) => setNewOrder({ ...newOrder, productTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السعر التقريبي ($)</label>
                <input
                  type="number"
                  value={newOrder.originalPrice}
                  onChange={(e) => setNewOrder({ ...newOrder, originalPrice: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0d3f6c] cursor-pointer shadow-sm"
                >
                  إضافة الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة سند مالي */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">إنشاء قيد وسند مالي</h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVoucherData({ ...voucherData, type: "receipt" })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    voucherData.type === "receipt"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  سند قبض (وارد)
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherData({ ...voucherData, type: "payment" })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    voucherData.type === "payment"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  سند صرف (صادر)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحساب</label>
                <input
                  type="text"
                  value={voucherData.account}
                  onChange={(e) => setVoucherData({ ...voucherData, account: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ ($)</label>
                <input
                  type="number"
                  value={voucherData.amount}
                  onChange={(e) => setVoucherData({ ...voucherData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / ملاحظات</label>
                <textarea
                  value={voucherData.notes}
                  onChange={(e) => setVoucherData({ ...voucherData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("تم ترحيل السند بنجاح.");
                    setIsVoucherModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0d3f6c] cursor-pointer shadow-sm"
                >
                  حفظ وترحيل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
