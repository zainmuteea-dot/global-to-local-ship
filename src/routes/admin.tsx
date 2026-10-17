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
import {
  CUSTOMERS_STORAGE_KEY,
  DEFAULT_CUSTOMERS,
  DEFAULT_ORDERS,
  ORDERS_STORAGE_KEY,
  STORAGE_PREFIX,
} from "@/components/admin/constants";
import type { Customer, OrderItem, OrderStatus } from "@/components/admin/types";
import { normalizePhoneNumber } from "@/components/admin/utils";

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
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const [statusToUpdate, setStatusToUpdate] = useState<OrderStatus>("new");
  const [notesToUpdate, setNotesToUpdate] = useState("");
  const [intlTrackingToUpdate, setIntlTrackingToUpdate] = useState("");

  const [newOrder, setNewOrder] = useState<{
    customerName: string;
    customerPhone: string;
    customerCity: string;
    productTitle: string;
    storeName: string;
    originalPrice: number;
    status: OrderStatus;
  }>({
    customerName: "",
    customerPhone: "",
    customerCity: "صنعاء",
    productTitle: "",
    storeName: "SHEIN",
    originalPrice: 20,
    status: "new",
  });

  const [voucherData, setVoucherData] = useState({
    type: "receipt",
    amount: 15000,
    currency: "YER",
    customerName: "",
    description: "دفعة مقدمة لطلب وسيط",
  });

  const [posItemName, setPosItemName] = useState("شحن دولي (كيلو)");
  const [posItemPrice, setPosItemPrice] = useState(12);
  const [posItemQty, setPosItemQty] = useState(1);
  const [posCurrency, setPosCurrency] = useState("USD");
  const [posNotice, setPosNotice] = useState<string | null>(null);

  // تحديث التبويب النشط حسب الـ URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // حفظ الطلبات في التخزين المؤقت المحلي
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("فشل حفظ الطلبات محلياً:", e);
    }
  }, [orders]);

  // حفظ العملاء في التخزين المؤقت المحلي
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error("فشل حفظ العملاء محلياً:", e);
    }
  }, [customers]);

  // طباعة وصل الكاشير
  const handlePrintReceipt = () => {
    const qty = Number(posItemQty) || 1;
    const unit = Number(posItemPrice) || 0;
    const total = qty * unit;

    const receiptWindow = window.open("", "_blank", "width=420,height=640");
    if (!receiptWindow) {
      setPosNotice("اسمح بالنوافذ المنبثقة لطباعة الفاتورة.");
      return;
    }
    receiptWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>فاتورة كاشير</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#123}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{border-bottom:1px solid #ddd;padding:12px;text-align:right}.total{font-size:18px;font-weight:bold;margin-top:24px}</style><h1>السوق الشامل — فاتورة كاشير</h1><p>${new Date().toLocaleString("ar-YE")}</p><table><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr><tr><td>${posItemName.replace(/[<>]/g, "")}</td><td>${qty}</td><td>${unit.toLocaleString("en-US")}</td></tr></table><p class="total">الإجمالي: ${total.toLocaleString("en-US")} YER</p><script>window.onload=()=>window.print()<\/script></html>`);
    receiptWindow.document.close();
    setPosNotice("تم فتح إيصال الطباعة. هذه الفاتورة لا تُحفظ في قاعدة البيانات.");
  };

  // قراءة الطلبات من قاعدة البيانات مع تحديد الأعمدة وتفاصيل الخطأ الكاملة
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

  // تحديث حالة طلب معين
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

      if (error) {
        console.error("فشل تحديث الطلب في قاعدة البيانات:", error);
      }
    } catch (err) {
      console.error("خطأ أثناء تحديث حالة الطلب:", err);
    }

    // إرسال إشعار للعميل في حال توفر معرف المستخدم
    if (targetOrder.userId) {
      try {
        await supabase.from("notifications").insert({
          user_id: targetOrder.userId,
          title: `تحديث مسار شحنتك #${targetOrder.orderNumber}`,
          message: `تغيرت حالة شحنتك من (${currentStatus}) إلى (${nextStatus}). ${STATUS_TEXT[newStatus] || ""}`,
          type: "order_update",
          link: `/track?code=${targetOrder.orderNumber}`,
        });
      } catch (e) {
        console.error("فشل إرسال الإشعار اللحظي:", e);
      }
    }

    setIsUpdateModalOpen(false);
  };

  // إرسال رسالة واتساب للعميل
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

  // إضافة طلب جديد يدوياً
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

    // إضافة أو تحديث العميل في القائمة
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
      originalPrice: 20,
      status: "new",
    });
  };

  // تصفية الطلبات بناءً على البحث والحالة
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        (order.orderNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerPhone || "").includes(searchQuery) ||
        (order.intlTrackingNumber || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // إحصائيات سريعة للوحة
  const stats = useMemo(() => {
    const total = orders.length;
    const reviewing = orders.filter((o) => o.status === "reviewing" || o.status === "new").length;
    const shipping = orders.filter((o) => o.status === "international_ship" || o.status === "warehouse_china").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return { total, reviewing, shipping, delivered };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800" dir="rtl">
      {/* الشريط العلوي للوحة التحكم */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#0284C7] flex items-center justify-center text-white shadow-md shadow-[#0F4C81]/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-base tracking-tight">السوق الشامل</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                  لوحة الإدارة
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">متابعة الشحنات والعملاء والوساطة الدولية</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <AdminAlerts />

            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إضافة طلب</span>
            </button>

            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">المتجر</span>
            </a>
          </div>
        </div>
      </header>

      {/* شريط التبويبات الرئيسي */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 sm:gap-4 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Package className="w-4 h-4" />
            إدارة الطلبات ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "customers"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            العملاء ({customers.length})
          </button>

          <button
            onClick={() => setActiveTab("cashier")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "cashier"
                ? "bg-[#0F4C81] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Wallet className="w-4 h-4" />
            الكاشير وسندات القبض
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي للوحة */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* شريط الإحصائيات السريعة */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">إجمالي الشحنات</p>
              <h3 className="text-lg font-black text-slate-800">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">قيد المراجعة / جديد</p>
              <h3 className="text-lg font-black text-slate-800">{stats.reviewing}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">شحن دولي وتجهيز</p>
              <h3 className="text-lg font-black text-slate-800">{stats.shipping}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">تم التسليم بنجاح</p>
              <h3 className="text-lg font-black text-slate-800">{stats.delivered}</h3>
            </div>
          </div>
        </div>

        {/* عرض رسالة الخطأ إن وُجدت */}
        {ordersLoadError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <span>{ordersLoadError}</span>
            <button
              onClick={fetchOrdersFromDatabase}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold shrink-0 hover:bg-rose-700 transition"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* تبويب الطلبات */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* أدوات البحث والفلترة */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، أو رقم التتبع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] transition"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">كل الحالات</option>
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
                  onClick={fetchOrdersFromDatabase}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-50"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>تحديث</span>
                </button>
              </div>
            </div>

            {/* جدول أو بطاقات الطلبات */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">لا توجد طلبات مطابقة</h4>
                  <p className="text-xs text-slate-400">جرب تغيير معايير البحث أو تحديث الصفحة.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                        <th className="p-3.5">رقم الطلب</th>
                        <th className="p-3.5">العميل والتواصل</th>
                        <th className="p-3.5">المنتج والمتجر</th>
                        <th className="p-3.5">الحالة</th>
                        <th className="p-3.5">التتبع الدولي</th>
                        <th className="p-3.5">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 font-bold text-[#0F4C81]">
                            {order.orderNumber}
                            <div className="text-[10px] text-slate-400 font-normal">
                              {new Date(order.createdAt).toLocaleDateString("ar-YE")}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800">{order.customerName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{order.customerPhone || "بدون هاتف"}</span>
                              {order.customerCity && (
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-md">
                                  {order.customerCity}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-700 truncate max-w-[200px]">
                              {order.productTitle}
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {order.storeName}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                order.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : order.status === "cancelled"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : order.status === "international_ship" || order.status === "shipped"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {STATUS_MAP_TO_ARABIC[order.status] || order.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-600">
                            {order.intlTrackingNumber || "—"}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setStatusToUpdate(order.status);
                                  setIntlTrackingToUpdate(order.intlTrackingNumber || "");
                                  setIsUpdateModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] hover:bg-[#0F4C81] hover:text-white font-bold text-[11px] transition cursor-pointer"
                              >
                                تحديث الحالة
                              </button>
                              <button
                                onClick={() => handleSendWhatsApp(order)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                title="إرسال رسالة واتساب"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* تبويب العملاء */}
        {activeTab === "customers" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">الكمية</label>
                    <input
                      type="number"
                      value={posItemQty}
                      onChange={(e) => setPosItemQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="w-full py-2.5 bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition cursor-pointer"
                  >
                    معاينة وطباعة الوصل
                  </button>
                  {posNotice && <p className="text-[11px] text-amber-600 mt-2 text-center">{posNotice}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base mb-2 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  سندات القبض والصرف
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  إصدار سندات القبض المباشرة للعملاء لتوثيق التحويلات والمقدمات المالية.
                </p>
              </div>
              <button
                onClick={() => setIsVoucherModalOpen(true)}
                className="w-full py-2.5 border border-[#0F4C81] text-[#0F4C81] hover:bg-[#0F4C81] hover:text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إنشاء سند قبض / صرف
              </button>
            </div>
          </div>
        )}
      </main>

      {/* نافذة تحديث حالة الطلب */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">
                تحديث مسار الطلب #{selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحالة الجديدة</label>
                <select
                  value={statusToUpdate}
                  onChange={(e) => setStatusToUpdate(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value="new">جديد (تم الاعتماد)</option>
                  <option value="reviewing">قيد المراجعة واحتساب التكاليف</option>
                  <option value="purchased">تم الشراء من المتجر الدولي</option>
                  <option value="warehouse_china">وصلت المستودع الخارجي</option>
                  <option value="international_ship">بالشحن الدولي (جوي / بحري)</option>
                  <option value="shipped">وصلت صنعاء والفرز للتسليم</option>
                  <option value="delivered">تم التسليم للعميل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم التتبع الدولي</label>
                <input
                  type="text"
                  value={intlTrackingToUpdate}
                  onChange={(e) => setIntlTrackingToUpdate(e.target.value)}
                  placeholder="مثال: TRK-98327192"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() =>
                  handleUpdateOrderStatus(selectedOrder.id, statusToUpdate, intlTrackingToUpdate)
                }
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                حفظ وإرسال التحديث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة طلب جديد */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">إضافة طلب وساطة جديد</h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل</label>
                  <input
                    type="text"
                    required
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المتجر الدولي</label>
                  <select
                    value={newOrder.storeName}
                    onChange={(e) => setNewOrder({ ...newOrder, storeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                  >
                    <option value="SHEIN">SHEIN</option>
                    <option value="AliExpress">AliExpress</option>
                    <option value="Amazon">Amazon</option>
                    <option value="TEMU">TEMU</option>
                    <option value="Trendyol">Trendyol</option>
                    <option value="Alibaba">Alibaba</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / الفرع</label>
                  <input
                    type="text"
                    value={newOrder.customerCity}
                    onChange={(e) => setNewOrder({ ...newOrder, customerCity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج أو الوصف</label>
                <input
                  type="text"
                  required
                  value={newOrder.productTitle}
                  onChange={(e) => setNewOrder({ ...newOrder, productTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر التقريبي ($)</label>
                  <input
                    type="number"
                    value={newOrder.originalPrice}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, originalPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحالة الابتدائية</label>
                  <select
                    value={newOrder.status}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, status: e.target.value as OrderStatus })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                  >
                    <option value="new">جديد</option>
                    <option value="reviewing">قيد المراجعة</option>
                    <option value="purchased">تم الشراء</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  حفظ الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة سند القبض والصرف */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">سند مالي جديد</h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع السند</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoucherData({ ...voucherData, type: "receipt" })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      voucherData.type === "receipt"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    سند قبض (استلام)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherData({ ...voucherData, type: "payment" })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      voucherData.type === "payment"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    سند صرف (دفع)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل أو الجهة</label>
                <input
                  type="text"
                  value={voucherData.customerName}
                  onChange={(e) => setVoucherData({ ...voucherData, customerName: e.target.value })}
                  placeholder="اسم العميل"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ</label>
                  <input
                    type="number"
                    value={voucherData.amount}
                    onChange={(e) => setVoucherData({ ...voucherData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العملة</label>
                  <select
                    value={voucherData.currency}
                    onChange={(e) => setVoucherData({ ...voucherData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / الشرح</label>
                <input
                  type="text"
                  value={voucherData.description}
                  onChange={(e) => setVoucherData({ ...voucherData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  alert(
                    "لم يُحفظ السند: جدول vouchers غير مربوط في نسخة قاعدة البيانات الحالية. اربط الجدول وسياساته أولاً حتى لا يظهر نجاح غير حقيقي."
                  );
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
