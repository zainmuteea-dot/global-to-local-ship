import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-clients")({
  head: () => ({
    meta: [
      { title: "لوحة عمليات الشحن والتوزيع | السوق الشامل AL SHAMEL" },
      {
        name: "description",
        content: "إدارة وبوليصات الشحنات ومتابعة التحصيل الفوري والطلبات لمنظومة السوق الشامل في اليمن.",
      },
    ],
  }),
  component: AdminOperationsDashboard,
});

interface OrderItem {
  id: string;
  tracking_code: string;
  customer_name: string;
  phone: string;
  product_name?: string;
  product_link?: string;
  status: string;
  notes?: string;
  created_at: string;
  city?: string;
  price?: number;
}

export function AdminOperationsDashboard() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderItem | null>(null);

  // نموذج إضافة شحنة جديدة
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: "",
    phone: "",
    product_name: "",
    product_link: "",
    city: "صنعاء",
    price: "",
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as OrderItem[]) || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // تحديث حالة الشحنة
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert("حدث خطأ أثناء تعديل الحالة، تأكد من الصلاحيات.");
    }
  };

  // حذف شحنة
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشحنة نهائياً؟")) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      console.error("Error deleting order:", err);
      alert("تعذر حذف الشحنة.");
    }
  };

  // إضافة شحنة جديدة
  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.customer_name || !newOrderForm.phone) {
      alert("يرجى إدخال اسم العميل ورقم الهاتف");
      return;
    }
    const trackingCode = `SQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullNotes = `المدينة: ${newOrderForm.city} | السعر: ${newOrderForm.price || "غير محدد"}`;

    try {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          tracking_code: trackingCode,
          customer_name: newOrderForm.customer_name,
          phone: newOrderForm.phone,
          product_name: newOrderForm.product_name || "منتج تسوق عالمي",
          product_link: newOrderForm.product_link || "https://alsouq.local",
          status: "جديد",
          notes: fullNotes,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setOrders((prev) => [data as OrderItem, ...prev]);
        setIsNewOrderModalOpen(false);
        setNewOrderForm({
          customer_name: "",
          phone: "",
          product_name: "",
          product_link: "",
          city: "صنعاء",
          price: "",
        });
        alert(`تمت إضافة الشحنة بنجاح! رقم التتبع: ${trackingCode}`);
      }
    } catch (err) {
      console.error("Error inserting order:", err);
      alert("حدث خطأ أثناء حفظ الشحنة.");
    }
  };

  // تصدير CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return alert("لا توجد بيانات للتصدير.");
    const headers = ["رقم التتبع", "العميل", "الهاتف", "المنتج", "الحالة", "التاريخ"];
    const rows = filteredOrders.map((o) => [
      o.tracking_code,
      o.customer_name,
      o.phone,
      o.product_name || "",
      o.status,
      new Date(o.created_at).toLocaleDateString("ar-YE"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `شحنات_السوق_الشامل_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // إحصائيات
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "جديد" || o.status === "قيد الانتظار").length;
    const shipping = orders.filter((o) => o.status === "تم الشحن" || o.status === "في الطريق").length;
    const delivered = orders.filter((o) => o.status === "تم التوصيل" || o.status === "مكتمل").length;
    const canceled = orders.filter((o) => o.status === "ملغي").length;

    const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : "0.0";

    return { total, pending, shipping, delivered, canceled, deliveryRate };
  }, [orders]);

  // الفلترة
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.phone?.includes(searchQuery);

      const matchesStatus =
        selectedStatus === "all"
          ? true
          : selectedStatus === "pending"
          ? o.status === "جديد" || o.status === "قيد الانتظار"
          : selectedStatus === "shipping"
          ? o.status === "تم الشحن" || o.status === "في الطريق"
          : selectedStatus === "delivered"
          ? o.status === "تم التوصيل" || o.status === "مكتمل"
          : selectedStatus === "canceled"
          ? o.status === "ملغي"
          : true;

      const matchesCity =
        selectedCity === "all" ? true : o.notes?.includes(selectedCity);

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [orders, searchQuery, selectedStatus, selectedCity]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans antialiased pb-16">
      
      {/* 1. الشريط العلوي الكبسولي للروابط السريعة */}
      <div className="bg-white border-b border-sky-100/80 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <a
              href="/admin"
              className="px-3 py-1.5 rounded-lg bg-[#004B87] text-white shadow-sm flex items-center gap-1"
            >
              <span>لوحة الأدمن</span>
            </a>
            <a
              href="/new-order"
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white shadow-sm flex items-center gap-1 hover:brightness-105"
            >
              <span>اطلب الآن (بوابة العميل) ⚡</span>
            </a>
            <a
              href="/new-order"
              className="px-3 py-1.5 rounded-lg bg-[#0F4C81] text-white shadow-sm flex items-center gap-1 hover:bg-[#0c3c66]"
            >
              <span>صفحة العملاء (/new-order)</span>
            </a>
            <a
              href="/track"
              className="px-3 py-1.5 rounded-lg bg-sky-950 text-white shadow-sm flex items-center gap-1 hover:bg-black"
            >
              <span>صفحة تتبع الشحنة للعميل</span>
            </a>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>نظام السوق الشامل - النسخة الحية</span>
          </div>
        </div>
      </div>

      {/* 2. شريط الأدوات والتحكم العلوي */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* اليمين: الشعار وزر القائمة */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="size-10 rounded-xl bg-[#00629B] text-white flex flex-col items-center justify-center gap-1 hover:bg-[#005080] transition"
              title="الرئيسية"
            >
              <span className="w-5 h-0.5 bg-white rounded-full"></span>
              <span className="w-5 h-0.5 bg-white rounded-full"></span>
              <span className="w-5 h-0.5 bg-white rounded-full"></span>
            </a>

            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-[#0F4C81]">السوق الشامل</span>
                  <span className="text-[10px] bg-sky-100 text-[#0284C7] font-bold px-1.5 py-0.5 rounded">
                    لوحة العمليات
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  منظومة إدارة الشحنات وتتبع الطرود السريعة
                </span>
              </div>
            </div>
          </div>

          {/* الوسط: شريط البحث الرئيسي */}
          <div className="flex-1 max-w-md min-w-[240px]">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث برقم التتبع (مثل: SQ-892411)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-100 outline-none transition"
              />
            </div>
          </div>

          {/* اليسار: أزرار العمليات والمشرف */}
          <div className="flex items-center gap-2">
            <a
              href="/new-order"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-xs font-black shadow-sm hover:brightness-105 transition"
            >
              <ShoppingCart className="size-3.5" />
              <span>اطلب الآن ⚡</span>
            </a>

            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00629B] text-white text-xs font-black shadow-sm hover:bg-[#005080] transition cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>شحنة جديدة</span>
            </button>

            {/* شارة المشرف العام */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-xs font-bold text-[#0F4C81]">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <div className="text-right">
                <span className="block leading-none">المشرف العام</span>
                <span className="text-[10px] text-emerald-600 font-semibold">admin (نشط)</span>
              </div>
            </div>

            {/* تحديث البيانات */}
            <button
              onClick={fetchOrders}
              className="size-9 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-600 hover:text-[#0F4C81] hover:bg-slate-50 transition"
              title="تحديث البيانات"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin text-[#0284C7]" : ""}`} />
            </button>

            {/* تسجيل الخروج */}
            <a
              href="/"
              className="size-9 rounded-xl border border-red-100 bg-red-50/50 grid place-items-center text-red-500 hover:bg-red-50 transition"
              title="العودة"
            >
              <LogOut className="size-4" />
            </a>
          </div>

        </div>
      </header>

      {/* 3. محتوى لوحة العمليات */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        
        {/* هيدر الصفحة وعنوان العمليات */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500"></span>
              <h1 className="text-xl sm:text-2xl font-black text-[#0A2540]">
                لوحة عمليات الشحن والتوزيع
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              متابعة الشحنات، تحديث الحالات، إدارة بوليصات الشحن والتحصيل الفوري
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-2xs">
            <span>📅 تاريخ اليوم:</span>
            <span className="text-[#0F4C81] font-mono">
              {new Date().toISOString().slice(0, 10).replace(/-/g, "/")}
            </span>
          </div>
        </div>

        {/* 4. بطاقات العمليات والمؤشرات الأربع (KPI Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. إجمالي الطلبات (المميزة بإطار برتقالي متوهج) */}
          <div
            onClick={() => setSelectedStatus("all")}
            className={`bg-white rounded-2xl p-4 sm:p-5 border transition cursor-pointer shadow-xs ${
              selectedStatus === "all"
                ? "border-[#EA580C] ring-2 ring-orange-200 shadow-orange-500/10"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-[#004B87] text-white grid place-items-center">
                <Package className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                100%
              </span>
            </div>
            <div className="text-3xl font-black text-[#0A2540] mb-1 font-mono">
              {stats.total}
            </div>
            <div className="text-xs font-bold text-slate-700">إجمالي الطلبات</div>
            <div className="text-[11px] text-slate-400 mt-0.5">جميع الشحنات بالمنظومة</div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-[#EA580C] font-bold">تصفية مفعلة ✓</span>
            </div>
          </div>

          {/* 2. قيد الانتظار */}
          <div
            onClick={() => setSelectedStatus("pending")}
            className={`bg-white rounded-2xl p-4 sm:p-5 border transition cursor-pointer shadow-xs ${
              selectedStatus === "pending"
                ? "border-amber-500 ring-2 ring-amber-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-amber-500 text-white grid place-items-center">
                <Clock className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-3xl font-black text-[#0A2540] mb-1 font-mono">
              {stats.pending}
            </div>
            <div className="text-xs font-bold text-slate-700">قيد الانتظار</div>
            <div className="text-[11px] text-slate-400 mt-0.5">بانتظار التجهيز</div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-amber-600 font-bold">
              انقر للتصفية
            </div>
          </div>

          {/* 3. تم الشحن */}
          <div
            onClick={() => setSelectedStatus("shipping")}
            className={`bg-white rounded-2xl p-4 sm:p-5 border transition cursor-pointer shadow-xs ${
              selectedStatus === "shipping"
                ? "border-[#00629B] ring-2 ring-sky-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-[#00629B] text-white grid place-items-center">
                <Truck className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#00629B]">
                {stats.total > 0 ? Math.round((stats.shipping / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-3xl font-black text-[#0A2540] mb-1 font-mono">
              {stats.shipping}
            </div>
            <div className="text-xs font-bold text-slate-700">تم الشحن</div>
            <div className="text-[11px] text-slate-400 mt-0.5">في طريق التوصيل</div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-[#00629B] font-bold">
              انقر للتصفية
            </div>
          </div>

          {/* 4. تم التوصيل */}
          <div
            onClick={() => setSelectedStatus("delivered")}
            className={`bg-white rounded-2xl p-4 sm:p-5 border transition cursor-pointer shadow-xs ${
              selectedStatus === "delivered"
                ? "border-emerald-500 ring-2 ring-emerald-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
                <CheckCircle2 className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-3xl font-black text-[#0A2540] mb-1 font-mono">
              {stats.delivered}
            </div>
            <div className="text-xs font-bold text-slate-700">تم التوصيل</div>
            <div className="text-[11px] text-slate-400 mt-0.5">تم الاستلام بنجاح</div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-emerald-600 font-bold">
              انقر للتصفية
            </div>
          </div>

        </div>

        {/* 5. شريط معدل الإنجاز والتحصيل النقدي */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <ArrowUpDown className="size-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">معدل الإنجاز والتسليم</div>
              <div className="text-xs font-black text-emerald-600">
                {stats.deliveryRate}% نسبة تسليم ناجحة
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900">
              <span className="font-mono text-sm">💵</span>
              <span>إجمالي التحصيل (COD): <strong className="font-mono">158 ر.س</strong></span>
            </div>

            <div className="text-slate-400">|</div>

            <div className="text-rose-600">
              ملغاة: <span className="font-mono font-bold">{stats.canceled}</span> طلب
            </div>
          </div>
        </div>

        {/* 6. شريط الفلاتر، وتصدير CSV، وتبديل الحالات */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          
          {/* تبويبات الحالات */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-500 ml-1">الحالة:</span>
            
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedStatus === "all"
                  ? "bg-[#004B87] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({stats.total})
            </button>

            <button
              onClick={() => setSelectedStatus("pending")}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedStatus === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              انتظار ({stats.pending})
            </button>

            <button
              onClick={() => setSelectedStatus("shipping")}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedStatus === "shipping"
                  ? "bg-[#00629B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              شحن ({stats.shipping})
            </button>

            <button
              onClick={() => setSelectedStatus("delivered")}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedStatus === "delivered"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              تم التوصيل ({stats.delivered})
            </button>

            <button
              onClick={() => setSelectedStatus("canceled")}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedStatus === "canceled"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ملغي ({stats.canceled})
            </button>
          </div>

          {/* فلاتر المدن وتصدير CSV */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">كل المدن</option>
              <option value="صنعاء">صنعاء</option>
              <option value="عدن">عدن</option>
              <option value="تعز">تعز</option>
              <option value="حضرموت">حضرموت</option>
              <option value="إب">إب</option>
              <option value="الحديدة">الحديدة</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>تصدير CSV</span>
            </button>
          </div>

        </div>

        {/* 7. جدول العمليات (Desktop) وبطاقات العمليات (Mobile) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              عرض {filteredOrders.length} من إجمالي {stats.total} طلب
            </span>
          </div>

          {/* جدول الشاشات الكبيرة */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#F0F7FF] text-[#0F4C81] border-b border-slate-200 font-black">
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">العميل والمدينة</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">رقم التتبع</th>
                  <th className="p-3.5">حالة الشحنة</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      {loading ? "جارٍ تحميل الشحنات..." : "لا توجد شحنات مطابقة للبحث أو الفلتر."}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-sky-50/40 transition">
                      
                      {/* رقم الطلب */}
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {order.tracking_code}
                      </td>

                      {/* العميل والمدينة */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {order.notes || "اليمن"}
                        </div>
                      </td>

                      {/* رقم الهاتف */}
                      <td className="p-3.5 font-mono text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>{order.phone}</span>
                          <a
                            href={order.phone ? `https://wa.me/${order.phone.replace(/[^0-9]/g, "")}` : undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="size-5 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center hover:bg-emerald-100 transition"
                            title="مراسلة عبر واتساب"
                          >
                            <Send className="size-2.5" />
                          </a>
                        </div>
                      </td>

                      {/* رقم التتبع */}
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-[#EA580C] font-mono font-bold text-xs">
                          {order.tracking_code}
                        </span>
                      </td>

                      {/* حالة الشحنة مع قائمة تغيير الحالة */}
                      <td className="p-3.5">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs border outline-none cursor-pointer ${
                            order.status === "تم التوصيل" || order.status === "مكتمل"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.status === "تم الشحن" || order.status === "في الطريق"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : order.status === "ملغي"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <option value="جديد">جديد</option>
                          <option value="قيد الانتظار">قيد الانتظار</option>
                          <option value="تم الشحن">تم الشحن</option>
                          <option value="في الطريق">في الطريق</option>
                          <option value="تم التوصيل">تم التوصيل</option>
                          <option value="ملغي">ملغي</option>
                        </select>
                      </td>

                      {/* التاريخ */}
                      <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                        {new Date(order.created_at).toLocaleDateString("ar-YE")}
                      </td>

                      {/* أزرار الإجراءات */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* معاينة */}
                          <button
                            onClick={() => {
                              setActiveOrder(order);
                              setIsPreviewModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-[#0284C7] transition cursor-pointer"
                            title="معاينة تفاصيل الشحنة"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {/* طباعة بوليصة */}
                          <button
                            onClick={() => {
                              setActiveOrder(order);
                              window.print();
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition cursor-pointer"
                            title="طباعة البوليصة"
                          >
                            <Printer className="size-3.5" />
                          </button>

                          {/* حذف */}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1.5 rounded-lg border border-red-100 text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* بطاقات الموبايل للمقاسات الصغيرة */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد شحنات مطابقة
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-orange-50 text-[#EA580C] px-2.5 py-1 rounded-lg border border-orange-200">
                      {order.tracking_code}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(order.created_at).toLocaleDateString("ar-YE")}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#0A2540]">{order.customer_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{order.notes || "اليمن"}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${order.phone}`}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] text-xs font-bold flex items-center gap-1"
                      >
                        <Phone className="size-3" />
                        <span>اتصال</span>
                      </a>
                      <a
                        href={order.phone ? `https://wa.me/${order.phone.replace(/[^0-9]/g, "")}` : undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Send className="size-3" />
                        <span>واتساب</span>
                      </a>
                    </div>

                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border outline-none bg-slate-50"
                    >
                      <option value="جديد">جديد</option>
                      <option value="قيد الانتظار">قيد الانتظار</option>
                      <option value="تم الشحن">تم الشحن</option>
                      <option value="تم التوصيل">تم التوصيل</option>
                      <option value="ملغي">ملغي</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </main>

      {/* 8. نافذة منبثقة لإضافة شحنة جديدة */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-[#0A2540] animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-black text-[#0F4C81]">إضافة شحنة جديدة للعمليات</h2>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم العميل الكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={newOrderForm.customer_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">رقم الهاتف (الواتساب):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 772399744"
                  value={newOrderForm.phone}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">المدينة / المحافظة:</label>
                  <select
                    value={newOrderForm.city}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                  >
                    <option value="صنعاء">صنعاء</option>
                    <option value="عدن">عدن</option>
                    <option value="تعز">تعز</option>
                    <option value="حضرموت">حضرموت</option>
                    <option value="إب">إب</option>
                    <option value="الحديدة">الحديدة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">سعر التحصيل COD (اختياري):</label>
                  <input
                    type="text"
                    placeholder="مثال: 150 ر.س"
                    value={newOrderForm.price}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">وصف أو رابط المنتج:</label>
                <input
                  type="text"
                  placeholder="رابط SHEIN / Amazon أو اسم القطعة"
                  value={newOrderForm.product_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold hover:bg-slate-200 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00629B] text-white font-bold hover:bg-[#005080] transition shadow-md"
                >
                  حفظ الشحنة وإصدار التتبع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. نافذة منبثقة لمعاينة بوليصة الشحنة */}
      {isPreviewModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-[#0A2540]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <span className="font-bold text-sm text-[#0F4C81]">بوليصة شحنة السوق الشامل</span>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-sky-50 text-center">
                <div className="text-[10px] text-slate-500 font-bold">رقم التتبع الرسمي</div>
                <div className="text-lg font-mono font-black text-[#EA580C]">
                  {activeOrder.tracking_code}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-b border-slate-100 py-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">اسم العميل:</span>
                  <span className="font-bold">{activeOrder.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم الهاتف:</span>
                  <span className="font-mono font-bold">{activeOrder.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة الشحنة:</span>
                  <span className="font-bold text-[#0F4C81]">{activeOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الملاحظات:</span>
                  <span className="font-medium text-slate-700">{activeOrder.notes || "لا توجد"}</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-[#0F4C81] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#0c3c66] transition shadow-md"
              >
                <Printer className="size-4" />
                <span>طباعة السند / البوليصة</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminOperationsDashboard;
