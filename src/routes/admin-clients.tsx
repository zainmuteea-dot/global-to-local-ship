import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  Search,
  RefreshCw,
  PlusCircle,
  MapPin,
  Copy,
  Check,
  Printer,
  Trash2,
  Calendar,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  ScanLine,
  Users,
  Download,
  Database,
  X,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const supabaseClientInstance: any = supabase;

// ==========================================
// 1. الأنواع والبيانات (DATA TYPES)
// ==========================================
export type OrderStatus =
  | "new"
  | "reviewing"
  | "purchased"
  | "warehouse_china"
  | "international_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  productTitle: string;
  productUrl?: string;
  storeName: string;
  status: OrderStatus;
  originalPrice: number;
  total_cost?: number;
  paid?: number;
  profit?: number;
  intlTrackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// هيكل العميل المجمّع بحسب آخر 9 أرقام
export interface GroupedClient {
  phoneLast9: string; // آخر 9 أرقام من الهاتف (مفتاح التجميع)
  originalPhone: string; // رقم الهاتف الكامل (phone)
  clientName: string; // اسم العميل (name)
  city: string; // المدينة (city)
  ordersCount: number; // count = orders.length
  total_cost: number; // مجموع التكلفة = sum(total_cost)
  paid: number; // مجموع المبالغ المدفوعة = sum(paid)
  remaining: number; // total_cost - paid
  profit: number; // مجموع الأرباح = sum(profit)
  orders: OrderItem[]; // قائمة طلبات هذا العميل
  latestOrderDate: string; // تاريخ أحدث طلب
}

// دالة استخراج آخر 9 أرقام من رقم الهاتف
export const extractLast9Digits = (rawPhone?: string): string => {
  if (!rawPhone) return "000000000";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length <= 9) return digits.padStart(9, "0");
  return digits.slice(-9);
};

// تجميع الطلبات حسب آخر 9 أرقام من هاتف العميل
export const groupOrdersByLast9 = (orders: OrderItem[]): GroupedClient[] => {
  const map = new Map<string, OrderItem[]>();

  for (const ord of orders) {
    const key = extractLast9Digits(ord.customerPhone);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(ord);
  }

  const result: GroupedClient[] = [];

  map.forEach((clientOrders, phoneLast9) => {
    // ترتيب الطلبات من الأحدث للأقدم
    clientOrders.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );

    const clientName =
      clientOrders.find((o) => o.customerName && o.customerName.trim().length > 1)?.customerName ||
      "عميل بدون اسم";
    const originalPhone =
      clientOrders.find((o) => o.customerPhone && o.customerPhone.replace(/\D/g, "").length >= 9)
        ?.customerPhone || `7${phoneLast9.slice(-8)}`;
    const city = clientOrders.find((o) => o.customerCity)?.customerCity || "صنعاء";

    let total_cost = 0;
    let paid = 0;
    let profit = 0;

    clientOrders.forEach((o) => {
      const cost = Number(o.total_cost || o.originalPrice || 0);
      const orderPaid = Number(o.paid !== undefined ? o.paid : o.status === "delivered" ? cost : 0);
      const orderProfit = Number(o.profit !== undefined ? o.profit : Math.round(cost * 0.15));

      total_cost += cost;
      paid += orderPaid;
      profit += orderProfit;
    });

    const remaining = total_cost - paid;
    const count = clientOrders.length;
    const latestOrderDate = clientOrders[0]?.createdAt || new Date().toISOString();

    result.push({
      phoneLast9,
      originalPhone,
      clientName,
      city,
      ordersCount: count,
      total_cost,
      paid,
      remaining,
      profit,
      orders: clientOrders,
      latestOrderDate,
    });
  });

  return result.sort((a, b) => b.remaining - a.remaining || b.total_cost - a.total_cost);
};

// ==========================================
// 2. مكون الشعار
// ==========================================
const EmbeddedLogo: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "sm" }) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  return (
    <div className="flex items-center gap-2.5 select-none" dir="rtl">
      <div
        className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] p-1.5 flex items-center justify-center shadow-md shadow-sky-950/20 shrink-0`}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <path
              d="M6 10H10L14 26H30L34 14H12"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="31" r="2.5" fill="#F97316" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="28" cy="31" r="2.5" fill="#F97316" stroke="#FFFFFF" strokeWidth="1" />
            <path
              d="M18 17L22 13M22 13L26 17M22 13V21"
              stroke="#FDBA74"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-col text-right">
        <span className="font-black tracking-tight text-[#0A2540] text-base sm:text-lg leading-tight">
          السوق الشامل
        </span>
        <span className="font-mono text-[9px] sm:text-[10px] font-black tracking-wider text-[#F97316] leading-none">
          AL SHAMEL SHOPPING
        </span>
      </div>
    </div>
  );
};

// ==========================================
// 3. المكون الرئيسي: AdminOperationsDashboard
// ==========================================
export interface AdminOperationsDashboardProps {
  onBack?: () => void;
  onNavigateToNewOrder?: () => void;
  onNavigateToZainClients?: () => void;
}

export function AdminOperationsDashboard({
  onBack,
  onNavigateToNewOrder,
}: AdminOperationsDashboardProps = {}) {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_shipments_v1");
      if (saved) return JSON.parse(saved);
    } catch {
      // This optional browser operation can fail; keep the current page usable.
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"grouped_clients" | "all_shipments">(
    "grouped_clients",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // تصفية العملاء
  const [clientFilterType, setClientFilterType] = useState<"all" | "remaining" | "paid">("all");

  // النوافذ المنبثقة
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState("");
  const [quickScanResult, setQuickScanResult] = useState<OrderItem | null>(null);
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);
  const [selectedClientOrders, setSelectedClientOrders] = useState<GroupedClient | null>(null);
  const [statementClient, setStatementClient] = useState<GroupedClient | null>(null);

  // نموذج إضافة شحنة جديدة
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerCity: "صنعاء",
    storeName: "SHEIN",
    productTitle: "",
    originalPrice: "",
    status: "new" as OrderStatus,
    trackingNumber: "",
  });

  // حفظ في localStorage
  useEffect(() => {
    try {
      localStorage.setItem("alsouk_admin_shipments_v1", JSON.stringify(orders));
    } catch {
      // This optional browser operation can fail; keep the current page usable.
    }
  }, [orders]);

  // جلب الطلبات من Supabase مع دعم كافة تسميات الأعمدة: (id, name, phone, city)
  const fetchOrders = async () => {
    setLoading(true);
    if (supabaseClientInstance) {
      try {
        const { data, error } = await supabaseClientInstance
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: OrderItem[] = data.map((item: any) => ({
            id: String(item.id),
            orderNumber: item.order_number || item.orderNumber || `SQ-${item.id}`,
            // توافق مباشر مع عمود name أو customer_name
            customerName: item.customer_name || item.customerName || item.name || "عميل بدون اسم",
            // توافق مباشر مع عمود phone أو customer_phone
            customerPhone: item.customer_phone || item.customerPhone || item.phone || "770000000",
            // توافق مباشر مع عمود city أو customer_city
            customerCity: item.customer_city || item.customerCity || item.city || "صنعاء",
            productTitle: item.product_title || item.productTitle || item.title || "شحنة دولية",
            productUrl: item.product_url || item.productUrl || "",
            storeName: item.store_name || item.storeName || "SHEIN",
            status: (item.status as OrderStatus) || "new",
            originalPrice: Number(item.original_price || item.originalPrice || item.price || 0),
            total_cost: Number(
              item.total_cost ||
                item.totalCost ||
                item.original_price ||
                item.originalPrice ||
                item.price ||
                0,
            ),
            paid:
              item.paid !== undefined
                ? Number(item.paid)
                : item.status === "delivered"
                  ? Number(item.total_cost || item.original_price || 0)
                  : 0,
            profit:
              item.profit !== undefined
                ? Number(item.profit)
                : Math.round(Number(item.original_price || 0) * 0.15),
            intlTrackingNumber:
              item.intl_tracking_number || item.intlTrackingNumber || `SQ-${item.id}`,
            createdAt: item.created_at || new Date().toISOString(),
          }));
          setOrders(mapped);
        }
      } catch (err) {
        console.warn("Supabase fetch note, using local:", err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // تجميع الطلبات حسب آخر 9 أرقام
  const groupedClients = useMemo(() => {
    return groupOrdersByLast9(orders);
  }, [orders]);

  // حسابات بطاقات الملخص الـ 4 المطلوبة
  const summaryTotals = useMemo(() => {
    let sumRemaining = 0;
    let sumPaid = 0;
    let sumCost = 0;
    let sumProfit = 0;

    groupedClients.forEach((client) => {
      sumRemaining += client.remaining;
      sumPaid += client.paid;
      sumCost += client.total_cost;
      sumProfit += client.profit;
    });

    return {
      sumRemaining,
      sumPaid,
      sumCost,
      sumProfit,
      totalClients: groupedClients.length,
      totalOrders: orders.length,
    };
  }, [groupedClients, orders]);

  // تغيير الحالة السريع
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o,
      ),
    );

    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.from("orders").update({ status: newStatus }).eq("id", orderId);
      } catch {
        // This optional browser operation can fail; keep the current page usable.
      }
    }
  };

  // حذف شحنة
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشحنة (${orderNumber}) نهائياً؟`)) return;

    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.from("orders").delete().eq("id", orderId);
      } catch {
        // This optional browser operation can fail; keep the current page usable.
      }
    }
  };

  // إنشاء شحنة جديدة
  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.customerName.trim() || !newOrderForm.customerPhone.trim()) {
      alert("يرجى إدخال اسم العميل ورقم هاتفه.");
      return;
    }

    const orderNum = `SQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const cost = Number(newOrderForm.originalPrice) || 0;
    const newOrd: OrderItem = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      customerName: newOrderForm.customerName.trim(),
      customerPhone: newOrderForm.customerPhone.trim(),
      customerCity: newOrderForm.customerCity || "صنعاء",
      storeName: newOrderForm.storeName,
      productTitle: newOrderForm.productTitle.trim() || "طرد بضائع مستوردة",
      originalPrice: cost,
      total_cost: cost,
      paid: newOrderForm.status === "delivered" ? cost : 0,
      profit: Math.round(cost * 0.15),
      status: newOrderForm.status,
      intlTrackingNumber: newOrderForm.trackingNumber.trim() || orderNum,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrd, ...prev]);
    setIsAddModalOpen(false);

    setNewOrderForm({
      customerName: "",
      customerPhone: "",
      customerCity: "صنعاء",
      storeName: "SHEIN",
      productTitle: "",
      originalPrice: "",
      status: "new",
      trackingNumber: "",
    });

    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.from("orders").insert([
          {
            order_number: newOrd.orderNumber,
            customer_name: newOrd.customerName,
            customer_phone: newOrd.customerPhone,
            customer_city: newOrd.customerCity,
            store_name: newOrd.storeName,
            product_title: newOrd.productTitle,
            original_price: newOrd.originalPrice,
            total_cost: newOrd.total_cost,
            paid: newOrd.paid,
            profit: newOrd.profit,
            status: newOrd.status,
            intl_tracking_number: newOrd.intlTrackingNumber,
            created_at: newOrd.createdAt,
          },
        ]);
      } catch {
        // This optional browser operation can fail; keep the current page usable.
      }
    }
  };

  // الفحص السريع
  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickScanInput.trim().toLowerCase();
    if (!query) return;

    const found = orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === query ||
        (o.intlTrackingNumber && o.intlTrackingNumber.toLowerCase() === query),
    );

    if (found) {
      setQuickScanResult(found);
    } else {
      alert("لم يتم العثور على شحنة تطابق هذا الرقم.");
      setQuickScanResult(null);
    }
  };

  // نسخ الرقم أو التتبع
  const copyTracking = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedTracking(id);
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  // تصدير CSV
  const handleExportCSV = () => {
    if (activeTab === "grouped_clients") {
      const headers = [
        "اسم العميل",
        "رقم الهاتف",
        "آخر 9 أرقام",
        "المدينة",
        "عدد الطلبات",
        "التكلفة الإجمالية",
        "المبلغ المدفوع",
        "المبلغ المتبقي",
        "الربح",
        "آخر طلب",
      ];
      const rows = filteredClients.map((c) => [
        `"${c.clientName.replace(/"/g, '""')}"`,
        `"${c.originalPhone}"`,
        `"${c.phoneLast9}"`,
        `"${c.city}"`,
        c.ordersCount,
        c.total_cost,
        c.paid,
        c.remaining,
        c.profit,
        c.latestOrderDate.split("T")[0],
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `alsouk_grouped_clients_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        "رقم الطلب",
        "العميل",
        "الهاتف",
        "المدينة",
        "المتجر",
        "الحالة",
        "السعر",
        "رقم التتبع",
        "التاريخ",
      ];
      const rows = filteredOrders.map((o) => [
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

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `alsouk_shipments_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // المدن الفريدة
  const uniqueCities = useMemo(() => {
    const c = new Set<string>();
    orders.forEach((o) => {
      if (o.customerCity) c.add(o.customerCity);
    });
    return Array.from(c);
  }, [orders]);

  // تصفية الشحنات
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (cityFilter !== "all" && o.customerCity !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          (o.intlTrackingNumber && o.intlTrackingNumber.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, statusFilter, cityFilter, searchQuery]);

  // تصفية العملاء المجمعين
  const filteredClients = useMemo(() => {
    return groupedClients.filter((client) => {
      if (clientFilterType === "remaining" && client.remaining <= 0) return false;
      if (clientFilterType === "paid" && client.remaining > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          client.clientName.toLowerCase().includes(q) ||
          client.originalPhone.includes(q) ||
          client.phoneLast9.includes(q) ||
          client.city.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [groupedClients, clientFilterType, searchQuery]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans pb-20"
      dir="rtl"
    >
      {/* 1. الشريط العلوي */}
      <div className="bg-[#0B2545] text-white text-xs py-2 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-b border-[#134074]">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold">منظومة السوق الشامل (AL SHAMEL)</span>
          <span className="text-sky-400 hidden sm:inline">•</span>
          <span className="text-sky-200 hidden sm:inline text-[11px]">
            تجميع العملاء حسب آخر 9 أرقام وإدارة العمليات
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1 rounded-lg bg-[#0F4C81] hover:bg-[#155e99] text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-sky-400/30"
          >
            <Download className="w-3 h-3 text-orange-300" />
            <span>تصدير البيانات CSV</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* 2. ترويسة الصفحة */}
        <header className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
            <EmbeddedLogo size="sm" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>لوحة العمليات وحسابات العملاء</span>
            </div>
          </div>

          {/* البحث */}
          <div className="relative w-full lg:w-72 xl:w-80">
            <input
              type="text"
              placeholder="ابحث بالاسم، الهاتف، أو آخر 9 أرقام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs text-[#0A2540] placeholder-slate-400 outline-none focus:border-[#0284C7] focus:bg-white transition font-mono"
            />
            <Search className="w-4 h-4 text-sky-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* الأزرار العلوية */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between sm:justify-end">
            <button
              onClick={() => {
                setQuickScanResult(null);
                setQuickScanInput("");
                setIsQuickScanOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[#0F4C81] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>فحص سريع</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] text-white text-xs font-black shadow-md shadow-orange-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ شحنة جديدة</span>
            </button>

            <button
              onClick={fetchOrders}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`}
              />
            </button>
          </div>
        </header>

        {/* 3. التبويبات */}
        <div className="flex items-center justify-between border-b border-sky-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("grouped_clients")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === "grouped_clients"
                  ? "bg-[#0F4C81] text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-100"
              }`}
            >
              <Users className="w-4 h-4 text-orange-400" />
              <span>العملاء المجمعين حسب آخر 9 أرقام ({groupedClients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("all_shipments")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === "all_shipments"
                  ? "bg-[#0F4C81] text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-100"
              }`}
            >
              <Package className="w-4 h-4 text-sky-400" />
              <span>سجل الشحنات الفردية ({orders.length})</span>
            </button>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-sky-200 text-[#0F4C81] text-xs font-mono font-bold flex items-center gap-2 shadow-xs hidden sm:flex">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>اليوم: {new Date().toISOString().split("T")[0]}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🌟 4. بطاقات الملخص الأربعة (Remaining, Paid, Cost, Profit)  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Remaining (red) sum(remaining) */}
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-rose-50 to-red-100/70 border-2 border-red-300 shadow-sm relative overflow-hidden transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-red-700 bg-red-200/80 px-2 py-0.5 rounded-full border border-red-300">
                المتبقي (Remaining)
              </span>
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-tight mb-1">
              {summaryTotals.sumRemaining.toLocaleString()}{" "}
              <span className="text-xs font-sans text-red-500 font-bold">ر.س</span>
            </div>
            <div className="text-xs font-black text-red-950">إجمالي المبالغ المتبقية</div>
            <div className="text-[10px] text-red-700 mt-0.5">
              مجموع الديون غير المسددة على العملاء
            </div>
            <div className="mt-2 pt-2 border-t border-red-200/80 text-[10px] font-bold text-red-700 flex items-center justify-between">
              <span>sum(remaining)</span>
              <span>{groupedClients.filter((c) => c.remaining > 0).length} عميل مدين</span>
            </div>
          </div>

          {/* Card 2: Paid (green) sum(paid) */}
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-green-100/70 border-2 border-emerald-300 shadow-sm relative overflow-hidden transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full border border-emerald-300">
                المدفوع (Paid)
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight mb-1">
              {summaryTotals.sumPaid.toLocaleString()}{" "}
              <span className="text-xs font-sans text-emerald-600 font-bold">ر.س</span>
            </div>
            <div className="text-xs font-black text-emerald-950">إجمالي المبالغ المدفوعة</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              مجموع المبالغ المحصلة والمسددة فعلياً
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-200/80 text-[10px] font-bold text-emerald-700 flex items-center justify-between">
              <span>sum(paid)</span>
              <span>مُحصل بنجاح ✓</span>
            </div>
          </div>

          {/* Card 3: Cost (black) sum(total_cost) */}
          <div className="rounded-2xl p-4 sm:p-5 bg-slate-900 border-2 border-slate-950 text-white shadow-md relative overflow-hidden transition hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-200 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                التكلفة (Cost)
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs border border-slate-700">
                <Package className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight mb-1">
              {summaryTotals.sumCost.toLocaleString()}{" "}
              <span className="text-xs font-sans text-slate-300 font-bold">ر.س</span>
            </div>
            <div className="text-xs font-black text-slate-100">إجمالي التكلفة الشاملة</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              مجموع مبالغ وتكاليف كافة الشحنات
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-between">
              <span>sum(total_cost)</span>
              <span>{summaryTotals.totalOrders} طلب كلي</span>
            </div>
          </div>

          {/* Card 4: Profit (blue) sum(profit) */}
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-sky-50 to-blue-100/80 border-2 border-sky-300 shadow-sm relative overflow-hidden transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded-full border border-sky-300">
                الربح (Profit)
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0284C7] font-mono tracking-tight mb-1">
              {summaryTotals.sumProfit.toLocaleString()}{" "}
              <span className="text-xs font-sans text-sky-600 font-bold">ر.س</span>
            </div>
            <div className="text-xs font-black text-sky-950">صافي أرباح الوساطة</div>
            <div className="text-[10px] text-sky-700 mt-0.5">
              مجموع أرباح الخدمة وعمولات الوساطة
            </div>
            <div className="mt-2 pt-2 border-t border-sky-200/80 text-[10px] font-bold text-sky-700 flex items-center justify-between">
              <span>sum(profit)</span>
              <span>أرباح معتمدة ✦</span>
            </div>
          </div>
        </div>

        {/* 5. عرض المحتوى بحسب التبويب النشط */}
        {activeTab === "grouped_clients" ? (
          /* ========================================================= */
          /* 🌟 جدول العملاء المجمّعين (صف واحد لكل عميل)             */
          /* ========================================================= */
          <div className="space-y-3">
            {/* شريط الفلاتر للعملاء */}
            <div className="bg-white p-3 rounded-xl border border-sky-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">تصفية الحسابات:</span>
                <button
                  onClick={() => setClientFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                    clientFilterType === "all"
                      ? "bg-[#0F4C81] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  الكل ({groupedClients.length})
                </button>
                <button
                  onClick={() => setClientFilterType("remaining")}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition flex items-center gap-1 ${
                    clientFilterType === "remaining"
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
                >
                  <span>عليه متبقي</span>
                  <span className="text-[10px] bg-white/20 px-1 rounded">
                    {groupedClients.filter((c) => c.remaining > 0).length}
                  </span>
                </button>
                <button
                  onClick={() => setClientFilterType("paid")}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition flex items-center gap-1 ${
                    clientFilterType === "paid"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <span>مسدد بالكامل</span>
                  <span className="text-[10px] bg-white/20 px-1 rounded">
                    {groupedClients.filter((c) => c.remaining <= 0).length}
                  </span>
                </button>
              </div>

              <div className="text-slate-500 text-xs font-mono">
                عرض: <span className="font-bold text-[#0A2540]">{filteredClients.length}</span> عميل
                مجمّع
              </div>
            </div>

            {/* الجدول */}
            <div className="bg-white border border-sky-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gradient-to-r from-[#F0F7FF] via-[#E0F2FE] to-[#F0F7FF] border-b border-sky-200 text-[#0F4C81] font-black">
                    <tr>
                      <th className="py-3.5 px-4">العميل والمدينة (name / city)</th>
                      <th className="py-3.5 px-4">رقم الهاتف (آخر 9 أرقام - phone)</th>
                      <th className="py-3.5 px-4 text-center">الطلبات (count)</th>
                      <th className="py-3.5 px-4 text-left">التكلفة (total_cost)</th>
                      <th className="py-3.5 px-4 text-left">المدفوع (paid)</th>
                      <th className="py-3.5 px-4 text-left">المتبقي (remaining)</th>
                      <th className="py-3.5 px-4 text-left">الربح (profit)</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#0A2540]">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          لا يوجد عملاء مطابقين لمعايير البحث.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.phoneLast9} className="hover:bg-sky-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-black text-sm text-[#0A2540]">
                              {client.clientName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-orange-500" />
                              <span>{client.city}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800">
                                {client.originalPhone}
                              </span>
                              <button
                                onClick={() =>
                                  copyTracking(client.originalPhone, client.phoneLast9)
                                }
                                className="text-slate-400 hover:text-sky-600 p-0.5 cursor-pointer"
                                title="نسخ الرقم"
                              >
                                {copiedTracking === client.phoneLast9 ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] text-sky-600 font-mono">
                              مفتاح 9 أرقام: <span className="font-bold">{client.phoneLast9}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-black text-xs">
                              {client.ordersCount}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900">
                            {client.total_cost.toLocaleString()} ر.س
                          </td>

                          <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-600">
                            {client.paid.toLocaleString()} ر.س
                          </td>

                          <td className="py-3.5 px-4 text-left font-mono font-black">
                            <span
                              className={client.remaining > 0 ? "text-red-600" : "text-emerald-600"}
                            >
                              {client.remaining.toLocaleString()} ر.س
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-left font-mono font-bold text-[#0284C7]">
                            {client.profit.toLocaleString()} ر.س
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedClientOrders(client)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-sky-200"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-[#0284C7]" />
                                <span>الطلبات ({client.ordersCount})</span>
                              </button>

                              <button
                                onClick={() => setStatementClient(client)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                title="كشف حساب العميل"
                              >
                                <FileText className="w-3.5 h-3.5 text-orange-500" />
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
        ) : (
          /* ========================================================= */
          /* 📦 سجل الشحنات الفردية                                    */
          /* ========================================================= */
          <div className="space-y-3">
            <div className="bg-white border border-sky-200/90 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-slate-600 font-bold ml-1">الحالة:</span>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-full font-bold cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-[#0F4C81] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  الكل ({orders.length})
                </button>
                <button
                  onClick={() => setStatusFilter("new")}
                  className={`px-3 py-1.5 rounded-full font-bold cursor-pointer ${
                    statusFilter === "new"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  انتظار (
                  {orders.filter((o) => o.status === "new" || o.status === "reviewing").length})
                </button>
                <button
                  onClick={() => setStatusFilter("shipped")}
                  className={`px-3 py-1.5 rounded-full font-bold cursor-pointer ${
                    statusFilter === "shipped"
                      ? "bg-[#0284C7] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  شحن (
                  {
                    orders.filter(
                      (o) => o.status === "shipped" || o.status === "international_ship",
                    ).length
                  }
                  )
                </button>
                <button
                  onClick={() => setStatusFilter("delivered")}
                  className={`px-3 py-1.5 rounded-full font-bold cursor-pointer ${
                    statusFilter === "delivered"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  تم التوصيل ({orders.filter((o) => o.status === "delivered").length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="pr-6 pl-4 py-1.5 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs font-bold text-[#0A2540] outline-none cursor-pointer"
                >
                  <option value="all">كل المدن</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white border border-sky-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gradient-to-r from-[#F0F7FF] to-[#E0F2FE] border-b border-sky-200 text-[#0F4C81] font-black">
                    <tr>
                      <th className="py-4 px-4">رقم الطلب</th>
                      <th className="py-4 px-4">العميل والمدينة (name / city)</th>
                      <th className="py-4 px-4">رقم الهاتف (phone)</th>
                      <th className="py-4 px-4">رقم التتبع</th>
                      <th className="py-4 px-4 text-center">حالة الشحنة</th>
                      <th className="py-4 px-4">التاريخ</th>
                      <th className="py-4 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#0A2540]">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          لا توجد شحنات مطابقة لمعايير البحث.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => {
                        const trackingNo = ord.intlTrackingNumber || ord.orderNumber;
                        return (
                          <tr key={ord.id} className="hover:bg-sky-50/60 transition group">
                            <td className="py-4 px-4">
                              <div className="font-mono font-black text-sm text-[#0F4C81]">
                                {ord.orderNumber}
                              </div>
                              <div className="text-[11px] text-slate-500 max-w-[200px] truncate mt-0.5">
                                {ord.productTitle}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-bold text-[#0A2540] text-sm">
                                {ord.customerName}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-orange-500" />
                                <span>{ord.customerCity || "صنعاء"}</span>
                              </div>
                            </td>

                            <td className="py-4 px-4 font-mono">
                              <div className="text-slate-700 text-xs font-bold">
                                {ord.customerPhone}
                              </div>
                              <div className="text-[10px] text-sky-700 flex items-center gap-2 mt-0.5 font-bold">
                                <a
                                  href={`tel:${ord.customerPhone.replace(/\D/g, "")}`}
                                  className="hover:underline"
                                >
                                  اتصال
                                </a>
                                <span className="opacity-40">|</span>
                                <a
                                  href={`https://wa.me/${ord.customerPhone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:underline"
                                >
                                  واتساب
                                </a>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0F4C81] font-mono text-xs font-bold">
                                <span>{trackingNo}</span>
                                <button
                                  onClick={() => copyTracking(trackingNo, ord.id)}
                                  className="text-orange-500 hover:text-orange-600 cursor-pointer"
                                  title="نسخ رقم التتبع"
                                >
                                  {copiedTracking === ord.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              <select
                                value={ord.status}
                                onChange={(e) =>
                                  handleStatusChange(ord.id, e.target.value as OrderStatus)
                                }
                                className={`text-xs font-black rounded-full px-3 py-1 border transition cursor-pointer text-center outline-none ${
                                  ord.status === "delivered"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    : ord.status === "shipped" ||
                                        ord.status === "international_ship"
                                      ? "bg-sky-50 text-[#0284C7] border-sky-300"
                                      : ord.status === "cancelled"
                                        ? "bg-rose-50 text-rose-700 border-rose-300"
                                        : "bg-amber-50 text-amber-700 border-amber-300"
                                }`}
                              >
                                <option value="delivered">● تم التوصيل</option>
                                <option value="shipped">● تم الشحن</option>
                                <option value="new">● قيد الانتظار</option>
                                <option value="cancelled">● ملغي</option>
                              </select>
                            </td>

                            <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                                <span>{ord.createdAt.split("T")[0]}</span>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                  title="حذف الشحنة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setPrintingOrder(ord)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                                  title="طباعة سند"
                                >
                                  <Printer className="w-3.5 h-3.5 text-orange-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. نافذة تفاصيل طلبات العميل المجمع */}
      {selectedClientOrders && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-sm text-[#0A2540]">
                  طلبات العميل: {selectedClientOrders.clientName}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  هاتف: {selectedClientOrders.originalPhone} (آخر 9 أرقام:{" "}
                  {selectedClientOrders.phoneLast9})
                </p>
              </div>
              <button
                onClick={() => setSelectedClientOrders(null)}
                className="p-1 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {selectedClientOrders.orders.map((o, idx) => {
                const cost = Number(o.total_cost || o.originalPrice || 0);
                const paid = Number(
                  o.paid !== undefined ? o.paid : o.status === "delivered" ? cost : 0,
                );
                const rem = cost - paid;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {o.productTitle || "طرد بضائع"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        #{o.orderNumber} • {o.storeName || "متجر"} • {o.createdAt.split("T")[0]}
                      </div>
                    </div>
                    <div className="text-left font-mono text-xs">
                      <div>
                        التكلفة: <span className="font-bold">{cost} ر.س</span>
                      </div>
                      <div className="text-emerald-600">المدفوع: {paid} ر.س</div>
                      <div className={rem > 0 ? "text-red-600 font-bold" : "text-slate-400"}>
                        المتبقي: {rem} ر.س
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t bg-slate-50 flex items-center justify-between text-xs font-bold">
              <span>إجمالي الطلبات: {selectedClientOrders.ordersCount}</span>
              <div className="flex gap-4">
                <span>التكلفة: {selectedClientOrders.total_cost} ر.س</span>
                <span className="text-emerald-600">المدفوع: {selectedClientOrders.paid} ر.س</span>
                <span className="text-red-600">المتبقي: {selectedClientOrders.remaining} ر.س</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. نافذة كشف الحساب والطباعة */}
      {statementClient && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-[#0A2540]">كشف حساب مالي للعميل</h3>
              <button
                onClick={() => setStatementClient(null)}
                className="p-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">اسم العميل (name):</span>
                <span className="font-bold">{statementClient.clientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">الهاتف (phone):</span>
                <span className="font-mono font-bold">{statementClient.originalPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">المدينة (city):</span>
                <span className="font-bold">{statementClient.city}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">مفتاح الحساب (آخر 9 أرقام):</span>
                <span className="font-mono font-bold text-sky-700">
                  {statementClient.phoneLast9}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">عدد الطلبات:</span>
                <span className="font-bold">{statementClient.ordersCount} طلب</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">إجمالي التكلفة:</span>
                <span className="font-bold">{statementClient.total_cost.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-slate-500">المبلغ المدفوع:</span>
                <span className="font-bold text-emerald-600">
                  {statementClient.paid.toLocaleString()} ر.س
                </span>
              </div>
              <div className="flex justify-between py-2 bg-red-50 p-2.5 rounded-xl text-red-700 font-bold border border-red-200">
                <span>المبلغ المتبقي:</span>
                <span className="font-mono text-sm">
                  {statementClient.remaining.toLocaleString()} ر.س
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#0F4C81] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. نافذة إضافة طلب شحن جديد */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-sky-200 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl text-right text-[#0A2540]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-sm">
                  <PlusCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0A2540]">إضافة طلب شحن جديد</h3>
                  <p className="text-xs text-slate-500">تسجيل طرد وشحنة جديدة في منظومة التوزيع</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  اسم العميل المستلم (name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد عبد الله"
                  value={newOrderForm.customerName}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, customerName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    رقم الهاتف (phone) *
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="770000000"
                    value={newOrderForm.customerPhone}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-mono text-left outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المدينة (city)</label>
                  <input
                    type="text"
                    placeholder="صنعاء / عدن / تعز"
                    value={newOrderForm.customerCity}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, customerCity: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المتجر / المصدر</label>
                  <select
                    value={newOrderForm.storeName}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, storeName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-bold outline-none focus:bg-white focus:border-[#0284C7]"
                  >
                    <option value="SHEIN">شي إن (SHEIN)</option>
                    <option value="TEMU">تيمو (TEMU)</option>
                    <option value="Amazon">أمازون (Amazon)</option>
                    <option value="AliExpress">علي إكسبريس (AliExpress)</option>
                    <option value="Trendyol">ترينديول (Trendyol)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    المبلغ المطلوب تحصيله (SAR)
                  </label>
                  <input
                    type="number"
                    placeholder="150"
                    value={newOrderForm.originalPrice}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, originalPrice: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-mono outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وصف المنتج / المحتوى</label>
                <input
                  type="text"
                  placeholder="مثال: فستان بناتي + حذاء رياضي"
                  value={newOrderForm.productTitle}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, productTitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] text-white font-black shadow-md shadow-orange-500/25 cursor-pointer"
                >
                  حفظ وتسجيل الشحنة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. نافذة الفحص السريع */}
      {isQuickScanOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-sky-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-right text-[#0A2540]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-black text-[#0A2540]">فحص سريع برقم التتبع</h3>
              </div>
              <button
                onClick={() => setIsQuickScanOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickScan} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-bold">
                  اكتب رقم الشحنة أو التتبع (مثال: SQ-892411):
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="SQ-xxxxxx"
                  value={quickScanInput}
                  onChange={(e) => setQuickScanInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-sky-200 text-[#0A2540] font-mono text-center text-lg font-black outline-none tracking-wider focus:bg-white focus:border-[#0284C7]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] hover:from-[#0A2540] font-black text-xs text-white shadow-md cursor-pointer"
              >
                بحث وفحص
              </button>
            </form>

            {quickScanResult && (
              <div className="mt-4 p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[#0F4C81] font-black">
                    {quickScanResult.orderNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    {quickScanResult.status}
                  </span>
                </div>
                <div className="text-[#0A2540] font-bold">{quickScanResult.customerName}</div>
                <div className="text-slate-600">{quickScanResult.productTitle}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. نافذة طباعة السند */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-sky-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-center space-y-4 text-[#0A2540]">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mx-auto">
              <Printer className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black">سند شحن وبوليصة استلام</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{printingOrder.orderNumber}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-right space-y-1.5">
              <div>
                <strong>العميل (name):</strong> {printingOrder.customerName}
              </div>
              <div>
                <strong>الهاتف (phone):</strong> {printingOrder.customerPhone}
              </div>
              <div>
                <strong>المدينة (city):</strong> {printingOrder.customerCity || "صنعاء"}
              </div>
              <div>
                <strong>المحتوى:</strong> {printingOrder.productTitle}
              </div>
              <div>
                <strong>المبلغ المطلوب:</strong> {printingOrder.originalPrice} ر.س
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPrintingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  window.print();
                  setPrintingOrder(null);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white text-xs font-bold"
              >
                طباعة الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// تصدير الاسم المستعار لضمان التوافق مع كامل التطبيق
export const AdminClientsPage = AdminOperationsDashboard;

// تسجيل مسار TanStack Router
export const Route = (createFileRoute as any)("/admin-clients")({
  head: () => ({
    meta: [
      { title: "لوحة العمليات والإدارة | السوق الشامل AL SHAMEL" },
      {
        name: "description",
        content: "لوحة عمليات الشحن والفرز وإدارة الطلبات والعملاء لمنظومة السوق الشامل.",
      },
    ],
  }),
  component: AdminOperationsDashboard,
});

export default AdminOperationsDashboard;
