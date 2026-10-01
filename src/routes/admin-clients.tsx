import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  PlusCircle,
  Plus,
  Phone,
  MapPin,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Trash2,
  Calendar,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  ScanLine,
  User,
  LogOut,
  ChevronDown,
  Download,
  Sparkles,
  MessageSquare,
  Database,
  X
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ==========================================
// 1. SUPABASE CLIENT & CONFIGURATION
// ==========================================
const SUPABASE_PROJECT_ID = "ihqijxikvfvubfqffezb";
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocWlqeGlrdmZ2dWJmcWZmZXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTM4MTUsImV4cCI6MjA1ODU2OTgxNX0.eW_t_TqjWwQ75903o4q3s0Xk7uB723qW_yE1iP";

let supabaseClientInstance: any = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase init note:", e);
}

// ==========================================
// 2. DATA TYPES
// ==========================================
export type OrderStatus = "new" | "reviewing" | "purchased" | "warehouse_china" | "international_ship" | "shipped" | "delivered" | "cancelled";

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
  intlTrackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 3. LOGO COMPONENT (LIGHT LOGO THEME)
// ==========================================
const EmbeddedLogo: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "sm" }) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  return (
    <div className="flex items-center gap-2.5 select-none" dir="rtl">
      <div className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] p-1.5 flex items-center justify-center shadow-md shadow-sky-950/20 shrink-0`}>
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

// Initial orders seed
const INITIAL_SEED_ORDERS: OrderItem[] = [
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
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
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
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
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

// ==========================================
// 4. MAIN ADMIN DASHBOARD COMPONENT
// ==========================================
export function AdminOperationsDashboard() {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_admin_shipments_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SEED_ORDERS;
  });

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState("");
  const [quickScanResult, setQuickScanResult] = useState<OrderItem | null>(null);
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);

  // New order form state
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerCity: "صنعاء",
    storeName: "SHEIN",
    productTitle: "",
    originalPrice: "",
    status: "new" as OrderStatus,
    trackingNumber: ""
  });

  // Save to localStorage whenever orders change
  useEffect(() => {
    try {
      localStorage.setItem("alsouk_admin_shipments_v1", JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Fetch live orders from Supabase if table exists
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
            customerName: item.customer_name || item.customerName || "عميل بدون اسم",
            customerPhone: item.customer_phone || item.customerPhone || "770000000",
            customerCity: item.customer_city || item.customerCity || "صنعاء",
            productTitle: item.product_title || item.productTitle || "شحنة دولية",
            productUrl: item.product_url || item.productUrl || "",
            storeName: item.store_name || item.storeName || "SHEIN",
            status: (item.status as OrderStatus) || "new",
            originalPrice: Number(item.original_price || item.originalPrice || 0),
            intlTrackingNumber: item.intl_tracking_number || item.intlTrackingNumber || `SQ-${item.id}`,
            createdAt: item.created_at || new Date().toISOString()
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

  // Quick Status Change handler
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

  // Delete Order
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشحنة (${orderNumber}) نهائياً؟`)) return;

    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.from("orders").delete().eq("id", orderId);
      } catch {}
    }
  };

  // Create New Shipment
  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.customerName.trim() || !newOrderForm.customerPhone.trim()) {
      alert("يرجى إدخال اسم العميل ورقم هاتفه.");
      return;
    }

    const orderNum = `SQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrd: OrderItem = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      customerName: newOrderForm.customerName.trim(),
      customerPhone: newOrderForm.customerPhone.trim(),
      customerCity: newOrderForm.customerCity || "صنعاء",
      storeName: newOrderForm.storeName,
      productTitle: newOrderForm.productTitle.trim() || "طرد بضائع مستوردة",
      originalPrice: Number(newOrderForm.originalPrice) || 0,
      status: newOrderForm.status,
      intlTrackingNumber: newOrderForm.trackingNumber.trim() || orderNum,
      createdAt: new Date().toISOString()
    };

    setOrders((prev) => [newOrd, ...prev]);
    setIsAddModalOpen(false);

    // Reset Form
    setNewOrderForm({
      customerName: "",
      customerPhone: "",
      customerCity: "صنعاء",
      storeName: "SHEIN",
      productTitle: "",
      originalPrice: "",
      status: "new",
      trackingNumber: ""
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
            status: newOrd.status,
            intl_tracking_number: newOrd.intlTrackingNumber,
            created_at: newOrd.createdAt
          }
        ]);
      } catch {}
    }
  };

  // Quick Scan search
  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickScanInput.trim().toLowerCase();
    if (!query) return;

    const found = orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === query ||
        (o.intlTrackingNumber && o.intlTrackingNumber.toLowerCase() === query)
    );

    if (found) {
      setQuickScanResult(found);
    } else {
      alert("لم يتم العثور على شحنة تطابق هذا الرقم.");
      setQuickScanResult(null);
    }
  };

  // Copy tracking number
  const copyTracking = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedTracking(id);
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  // Export CSV
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
      o.createdAt.split("T")[0]
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `alsouk_shipments_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered orders & Unique cities
  const uniqueCities = useMemo(() => {
    const c = new Set<string>();
    orders.forEach((o) => {
      if (o.customerCity) c.add(o.customerCity);
    });
    return Array.from(c);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      // City
      if (cityFilter !== "all" && o.customerCity !== cityFilter) return false;
      // Search
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

  // KPI Calculations
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "new" || o.status === "reviewing").length;
    const shipped = orders.filter((o) => o.status === "shipped" || o.status === "international_ship" || o.status === "warehouse_china").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;

    const totalCOD = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.originalPrice || 0), 0);

    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const shippedPercent = total > 0 ? Math.round((shipped / total) * 100) : 0;
    const deliveredPercent = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const deliverySuccessRate = total > 0 ? Math.round((delivered / (total - pending || 1)) * 100) : 100;

    return {
      total,
      pending,
      shipped,
      delivered,
      cancelled,
      totalCOD,
      pendingPercent,
      shippedPercent,
      deliveredPercent,
      deliverySuccessRate
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans selection:bg-[#0284C7] selection:text-white pb-20" dir="rtl">
      
      {/* 1. TOP SUPABASE NOTICE BAR */}
      <div className="bg-[#0B2545] text-white text-xs py-2 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-b border-[#134074] shadow-xs">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold">منظومة السوق الشامل (AL SHAMEL)</span>
          <span className="text-sky-400 hidden sm:inline">•</span>
          <span className="text-sky-200 hidden sm:inline text-[11px]">مزامنة حية للعمليات والشحنات</span>
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
        
        {/* 2. MAIN HEADER (LIGHT LOGO THEMED) */}
        <header className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Logo & Platform Info */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
            <EmbeddedLogo size="sm" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>لوحة العمليات</span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-72 xl:w-80">
            <input
              type="text"
              placeholder="ابحث برقم التتبع (مثل: SQ-892411)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs text-[#0A2540] placeholder-slate-400 outline-none focus:border-[#0284C7] focus:bg-white transition font-mono"
            />
            <Search className="w-4 h-4 text-sky-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Action Buttons */}
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
              title="تحديث الشحنات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>
        </header>

        {/* 3. SUB-HEADER & DATE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
              <h1 className="text-xl sm:text-2xl font-black text-[#0A2540] tracking-tight">
                لوحة عمليات الشحن والتوزيع
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة الشحنات، تحديث الحالات، إدارة بوليصات الشحن والتحصيل الفوري
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-sky-200 text-[#0F4C81] text-xs font-mono font-bold flex items-center gap-2 shadow-xs self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>اليوم: {new Date().toISOString().split("T")[0]}</span>
          </div>
        </div>

        {/* 4. THE 4 KPI CARDS (LIGHT LOGO THEMED) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Total */}
          <div
            onClick={() => setStatusFilter("all")}
            className={`rounded-2xl p-3.5 sm:p-5 cursor-pointer transition relative overflow-hidden bg-white shadow-sm ${
              statusFilter === "all"
                ? "border-2 border-orange-500 shadow-md ring-2 ring-orange-200"
                : "border border-sky-200/90 hover:border-orange-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] sm:text-xs font-bold">
                100%
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-xs">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0A2540] font-mono mb-0.5">
              {stats.total}
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-800">إجمالي الطلبات</div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">جميع الشحنات بالمنظومة</div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-orange-500">
              {statusFilter === "all" ? "تصفية مفعلة ✓" : "انقر للتصفية"}
            </div>
          </div>

          {/* Card 2: Pending */}
          <div
            onClick={() => setStatusFilter("new")}
            className={`rounded-2xl p-3.5 sm:p-5 cursor-pointer transition relative overflow-hidden bg-white shadow-sm ${
              statusFilter === "new"
                ? "border-2 border-amber-500 shadow-md ring-2 ring-amber-200"
                : "border border-amber-200/80 hover:border-amber-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] sm:text-xs font-bold">
                {stats.pendingPercent}%
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0A2540] font-mono mb-0.5">
              {stats.pending}
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-800">قيد الانتظار</div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">بانتظار التجهيز</div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-amber-600">
              {statusFilter === "new" ? "تصفية مفعلة ✓" : "انقر للتصفية"}
            </div>
          </div>

          {/* Card 3: Shipped */}
          <div
            onClick={() => setStatusFilter("shipped")}
            className={`rounded-2xl p-3.5 sm:p-5 cursor-pointer transition relative overflow-hidden bg-white shadow-sm ${
              statusFilter === "shipped"
                ? "border-2 border-[#0284C7] shadow-md ring-2 ring-sky-200"
                : "border border-sky-200/80 hover:border-sky-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[#0284C7] text-[10px] sm:text-xs font-bold">
                {stats.shippedPercent}%
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0A2540] font-mono mb-0.5">
              {stats.shipped}
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-800">تم الشحن</div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">في طريق التوصيل</div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-[#0284C7]">
              {statusFilter === "shipped" ? "تصفية مفعلة ✓" : "انقر للتصفية"}
            </div>
          </div>

          {/* Card 4: Delivered */}
          <div
            onClick={() => setStatusFilter("delivered")}
            className={`rounded-2xl p-3.5 sm:p-5 cursor-pointer transition relative overflow-hidden bg-white shadow-sm ${
              statusFilter === "delivered"
                ? "border-2 border-emerald-500 shadow-md ring-2 ring-emerald-200"
                : "border border-emerald-200/80 hover:border-emerald-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] sm:text-xs font-bold">
                {stats.deliveredPercent}%
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0A2540] font-mono mb-0.5">
              {stats.delivered}
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-800">تم التوصيل</div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">تم الاستلام بنجاح</div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-emerald-600">
              {statusFilter === "delivered" ? "تصفية مفعلة ✓" : "انقر للتصفية"}
            </div>
          </div>
        </div>

        {/* 5. SUMMARY STRIP (COD TOTAL & SUCCESS RATE) */}
        <div className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold">
                $
              </div>
              <span className="text-slate-600">إجمالي التحصيل (COD):</span>
              <span className="text-[#0A2540] font-black font-mono text-sm">
                {stats.totalCOD.toLocaleString()} ر.س
              </span>
            </div>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-rose-600">
              <span>ملغاة:</span>
              <span className="font-mono font-black">{stats.cancelled} طلب</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-left md:text-right">
              <div className="text-xs text-slate-500 font-bold">معدل الإنجاز والتسليم</div>
              <div className="text-emerald-600 font-mono font-black text-sm flex items-center gap-1">
                <span>{stats.deliverySuccessRate}%</span>
                <span>نسبة تسليم ناجحة</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* 6. FILTER BAR */}
        <div className="bg-white border border-sky-200/90 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Chips */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar py-1 w-full lg:w-auto">
            <span className="text-slate-600 font-bold ml-1 shrink-0">الحالة:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full transition font-bold cursor-pointer shrink-0 ${
                statusFilter === "all"
                  ? "bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("new")}
              className={`px-3 py-1.5 rounded-full transition font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                statusFilter === "new"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-amber-50 border border-slate-200"
              }`}
            >
              <Clock className="w-3 h-3 text-amber-500" />
              <span>انتظار ({stats.pending})</span>
            </button>
            <button
              onClick={() => setStatusFilter("shipped")}
              className={`px-3 py-1.5 rounded-full transition font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                statusFilter === "shipped"
                  ? "bg-[#0284C7] text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-sky-50 border border-slate-200"
              }`}
            >
              <Truck className="w-3 h-3 text-[#0284C7]" />
              <span>شحن ({stats.shipped})</span>
            </button>
            <button
              onClick={() => setStatusFilter("delivered")}
              className={`px-3 py-1.5 rounded-full transition font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                statusFilter === "delivered"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-emerald-50 border border-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>تم التوصيل ({stats.delivered})</span>
            </button>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full appearance-none pr-8 pl-6 py-2 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs font-bold text-[#0A2540] outline-none cursor-pointer"
              >
                <option value="all">كل المدن</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-orange-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {statusFilter !== "all" && (
              <button
                onClick={() => setStatusFilter("all")}
                className="text-xs text-orange-500 hover:underline font-bold"
              >
                إعادة ضبط
              </button>
            )}
          </div>
        </div>

        {/* 7. SHIPMENTS PRESENTATION */}
        
        {/* 📱 MOBILE CARDS VIEW */}
        <div className="block sm:hidden space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-sky-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-sm">
              لا توجد شحنات مطابقة لمعايير البحث المحددة.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const trackingNo = ord.intlTrackingNumber || ord.orderNumber;

              return (
                <div key={ord.id} className="bg-white border border-sky-200/90 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-sm text-[#0F4C81] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                      {ord.orderNumber}
                    </span>
                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                      className={`text-[11px] font-black rounded-full px-2.5 py-1 border outline-none cursor-pointer ${
                        ord.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : ord.status === "shipped" || ord.status === "international_ship"
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
                  </div>

                  <div className="text-xs text-slate-800 font-bold leading-relaxed">{ord.productTitle}</div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="font-bold text-[#0A2540]">👤 {ord.customerName}</span>
                    <span className="text-slate-600 flex items-center gap-1 font-bold">
                      <MapPin className="w-3 h-3 text-orange-500" />
                      {ord.customerCity || "صنعاء"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-mono text-slate-800 font-bold">{ord.customerPhone}</span>
                    <div className="flex items-center gap-2 font-bold">
                      <a
                        href={`tel:${ord.customerPhone.replace(/\D/g, "")}`}
                        className="px-2 py-0.5 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200 text-[11px]"
                      >
                        اتصال
                      </a>
                      <a
                        href={`https://wa.me/${ord.customerPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px]"
                      >
                        واتساب
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0F4C81] font-mono text-xs font-bold">
                      <span>{trackingNo}</span>
                      <button
                        onClick={() => copyTracking(trackingNo, ord.id)}
                        className="text-orange-500 hover:text-orange-600 transition"
                      >
                        {copiedTracking === ord.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {ord.createdAt.split("T")[0]}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                    <button
                      onClick={() => setPrintingOrder(ord)}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-orange-500" />
                      <span>سند</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 💻 DESKTOP TABLE VIEW */}
        <div className="hidden sm:block bg-white border border-sky-200/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-r from-[#F0F7FF] to-[#E0F2FE] border-b border-sky-200 text-[#0F4C81] font-black">
                <tr>
                  <th className="py-4 px-4">رقم الطلب</th>
                  <th className="py-4 px-4">العميل والمدينة</th>
                  <th className="py-4 px-4">رقم الهاتف</th>
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
                      لا توجد شحنات مطابقة لمعايير البحث المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const trackingNo = ord.intlTrackingNumber || ord.orderNumber;

                    return (
                      <tr key={ord.id} className="hover:bg-sky-50/60 transition group">
                        <td className="py-4 px-4">
                          <div className="font-mono font-black text-sm text-[#0F4C81]">{ord.orderNumber}</div>
                          <div className="text-[11px] text-slate-500 max-w-[200px] truncate mt-0.5">
                            {ord.productTitle}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-[#0A2540] text-sm">{ord.customerName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            <span>{ord.customerCity || "صنعاء"}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono">
                          <div className="text-slate-700 text-xs font-bold">{ord.customerPhone}</div>
                          <div className="text-[10px] text-sky-700 flex items-center gap-2 mt-0.5 font-bold">
                            <a href={`tel:${ord.customerPhone.replace(/\D/g, "")}`} className="hover:underline">
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
                            onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                            className={`text-xs font-black rounded-full px-3 py-1 border transition cursor-pointer text-center outline-none ${
                              ord.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : ord.status === "shipped" || ord.status === "international_ship"
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

      {/* 8. ADD SHIPMENT MODAL */}
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
                <label className="block text-slate-700 font-bold mb-1">اسم العميل المستلم *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد عبد الله"
                  value={newOrderForm.customerName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف أو الجوال *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="770000000"
                    value={newOrderForm.customerPhone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-mono text-left outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المدينة / المحافظة</label>
                  <input
                    type="text"
                    placeholder="صنعاء / عدن / تعز"
                    value={newOrderForm.customerCity}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerCity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المتجر / المصدر</label>
                  <select
                    value={newOrderForm.storeName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, storeName: e.target.value })}
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
                  <label className="block text-slate-700 font-bold mb-1">المبلغ المطلوب تحصيله (SAR)</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={newOrderForm.originalPrice}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, originalPrice: e.target.value })}
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
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, productTitle: e.target.value })}
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

      {/* 9. QUICK SCAN MODAL */}
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
                  <span className="font-mono text-[#0F4C81] font-black">{quickScanResult.orderNumber}</span>
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

      {/* 10. PRINT RECEIPT MODAL */}
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
              <div><strong>العميل:</strong> {printingOrder.customerName}</div>
              <div><strong>الهاتف:</strong> {printingOrder.customerPhone}</div>
              <div><strong>المدينة:</strong> {printingOrder.customerCity || "صنعاء"}</div>
              <div><strong>المحتوى:</strong> {printingOrder.productTitle}</div>
              <div><strong>المبلغ المطلوب:</strong> {printingOrder.originalPrice} ر.س</div>
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

// TanStack Router registration
export const Route = (createFileRoute as any)("/admin")({
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
