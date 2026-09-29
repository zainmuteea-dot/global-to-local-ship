import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  Package,
  Search,
  ExternalLink,
  Printer,
  Trash2,
  Phone,
  MessageCircle,
  Menu,
  Clock,
  Truck,
  CheckCircle2,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  PlusCircle,
  RefreshCw,
  User,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const STATUS_OPTIONS = [
  "جديد",
  "قيد الانتظار",
  "تم الشراء",
  "تم الشحن",
  "وصل",
  "تم التوصيل",
  "ملغي",
];

function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [cityFilter, setCityFilter] = useState("كل المدن");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase
      .channel("admin-orders-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشحنة نهائياً؟")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.tracking_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name?.includes(search) ||
        o.phone?.includes(search) ||
        o.notes?.includes(search);

      const matchFilter =
        filter === "الكل" ||
        (filter === "قيد الانتظار" && (o.status === "جديد" || o.status === "قيد الانتظار")) ||
        o.status === filter;

      const matchCity =
        cityFilter === "كل المدن" ||
        (o.notes && o.notes.includes(cityFilter));

      return matchSearch && matchFilter && matchCity;
    });
  }, [orders, search, filter, cityFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => ["جديد", "قيد الانتظار", "تم التواصل"].includes(o.status)).length;
    const shipped = orders.filter((o) => ["تم الشراء", "تم الشحن", "وصل"].includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === "تم التوصيل" || o.status === "تم التسليم").length;
    const cancelled = orders.filter((o) => o.status === "ملغي").length;

    const pendingPct = total ? ((pending / total) * 100).toFixed(0) : "0";
    const shippedPct = total ? ((shipped / total) * 100).toFixed(0) : "0";
    const deliveredPct = total ? ((delivered / total) * 100).toFixed(0) : "0";

    return {
      total,
      pending,
      shipped,
      delivered,
      cancelled,
      pendingPct,
      shippedPct,
      deliveredPct,
    };
  }, [orders]);

  const exportCSV = () => {
    const header = "رقم الشحنة,العميل,الهاتف,الحالة,التاريخ,الملاحظات\n";
    const rows = filtered
      .map(
        (o) =>
          `"${o.tracking_code || ""}","${o.customer_name || ""}","${o.phone || ""}","${o.status || ""}","${o.created_at || ""}","${(o.notes || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#140d08] text-stone-100 flex font-sans">
      <AdminSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 lg:mr-72 p-4 md:p-6 space-y-5">
        {/* شريط الإجراءات العلوي التفاعلي */}
        <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#2a1d14] text-amber-300 border border-[#442c1c]"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-inner">
                <Package className="size-5 text-amber-100" />
              </div>
              <div>
                <h1 className="text-base font-black text-amber-100">
                  لوحة عمليات الشحن والتوزيع
                </h1>
                <p className="text-[11px] text-stone-400">
                  متابعة الشحنات، تحديث الحالات، إدارة بوليصات الشحن والتحصيل الفوري
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* بطاقة المشرف */}
            <div className="bg-[#170f0a] border border-[#3d2719] px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-right">
                <span className="font-bold text-stone-200">المشرف العام</span>
                <span className="text-[10px] text-emerald-400 block">admin (نشط)</span>
              </div>
              <User className="size-4 text-stone-400 mr-1" />
            </div>

            <Link
              to="/new-order"
              className="px-3 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold flex items-center gap-1.5 transition shadow"
            >
              <PlusCircle className="size-4" />
              طلب شحن جديد
            </Link>

            <button
              onClick={fetchOrders}
              className="p-2 rounded-xl bg-[#2b1c13] hover:bg-[#382418] text-amber-300 border border-[#4a301e] transition"
              title="تحديث البيانات"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* شريط الإحصائيات الأربع الكبيرة */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* إجمالي الطلبات */}
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 relative overflow-hidden shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-amber-900/40 text-amber-300 border border-amber-700/30">
                <Package className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-800/40 text-amber-200 border border-amber-600/40">
                100%
              </span>
            </div>
            <div className="text-3xl font-black text-amber-100">{stats.total}</div>
            <div className="text-xs text-stone-300 font-bold mt-1">إجمالي الطلبات</div>
            <div className="text-[10px] text-stone-400">جميع الشحنات المسجلة بالمنظومة</div>
          </div>

          {/* قيد الانتظار */}
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 relative overflow-hidden shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
                <Clock className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                {stats.pendingPct}%
              </span>
            </div>
            <div className="text-3xl font-black text-amber-400">{stats.pending}</div>
            <div className="text-xs text-amber-300 font-bold mt-1">قيد الانتظار</div>
            <div className="text-[10px] text-stone-400">بانتظار التجهيز واستلام المندوب</div>
          </div>

          {/* تم الشحن */}
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 relative overflow-hidden shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-blue-950/50 text-blue-400 border border-blue-800/40">
                <Truck className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                {stats.shippedPct}%
              </span>
            </div>
            <div className="text-3xl font-black text-blue-300">{stats.shipped}</div>
            <div className="text-xs text-blue-300 font-bold mt-1">تم الشحن</div>
            <div className="text-[10px] text-stone-400">في الطريق مع المناديب والفرز الدولي</div>
          </div>

          {/* تم التوصيل */}
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 relative overflow-hidden shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                <CheckCircle2 className="size-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                {stats.deliveredPct}%
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-400">{stats.delivered}</div>
            <div className="text-xs text-emerald-300 font-bold mt-1">تم التوصيل</div>
            <div className="text-[10px] text-stone-400">تم تسليمها للعملاء بنجاح</div>
          </div>
        </div>

        {/* شريط التحصيل المالي ومعدل الإنجاز */}
        <div className="bg-[#1c130d] border border-[#382517] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-900/40 text-emerald-300">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <span className="text-stone-400">معدل الإنجاز والتسليم: </span>
              <span className="font-bold text-emerald-400">
                {stats.deliveredPct}% نسبة تسليم ناجحة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-stone-300">
            <div>
              <span>شحنات ملغاة: </span>
              <span className="font-bold text-red-400">{stats.cancelled} طلب</span>
            </div>
            <div className="h-4 w-px bg-stone-700" />
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <DollarSign className="size-4 text-amber-400" />
              <span>إجمالي مبالغ التحصيل المباشر (COD): متصل لحظياً</span>
            </div>
          </div>
        </div>

        {/* فلاتر البحث والحالات */}
        <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 space-y-3 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* أزرار الحالات */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilter("الكل")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  filter === "الكل"
                    ? "bg-amber-700 text-amber-100 shadow"
                    : "bg-[#291b12] text-stone-300 hover:bg-[#362418]"
                }`}
              >
                الكل ({stats.total})
              </button>
              <button
                onClick={() => setFilter("قيد الانتظار")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  filter === "قيد الانتظار"
                    ? "bg-amber-700 text-amber-100"
                    : "bg-[#291b12] text-stone-300 hover:bg-[#362418]"
                }`}
              >
                قيد الانتظار ({stats.pending})
              </button>
              <button
                onClick={() => setFilter("تم الشحن")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  filter === "تم الشحن"
                    ? "bg-blue-700 text-blue-100"
                    : "bg-[#291b12] text-stone-300 hover:bg-[#362418]"
                }`}
              >
                تم الشحن ({stats.shipped})
              </button>
              <button
                onClick={() => setFilter("تم التوصيل")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  filter === "تم التوصيل"
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-[#291b12] text-stone-300 hover:bg-[#362418]"
                }`}
              >
                تم التوصيل ({stats.delivered})
              </button>
              <button
                onClick={() => setFilter("ملغي")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  filter === "ملغي"
                    ? "bg-red-800 text-red-100"
                    : "bg-[#291b12] text-stone-300 hover:bg-[#362418]"
                }`}
              >
                ملغي ({stats.cancelled})
              </button>
            </div>

            {/* تصدير وفلتر المدن */}
            <div className="flex items-center gap-2">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-[#2a1d13] border border-[#442c1c] rounded-xl px-3 py-1.5 text-xs text-stone-200 outline-none"
              >
                <option value="كل المدن">كل المدن</option>
                <option value="صنعاء">صنعاء</option>
                <option value="عدن">عدن</option>
                <option value="تعز">تعز</option>
                <option value="حضرموت">حضرموت</option>
                <option value="إب">إب</option>
                <option value="الحديدة">الحديدة</option>
              </select>

              <button
                onClick={exportCSV}
                className="px-3 py-1.5 rounded-xl bg-[#2a1d13] border border-[#442c1c] hover:bg-[#382619] text-xs font-bold text-amber-300 flex items-center gap-1.5 transition"
              >
                <Download className="size-3.5" />
                تصدير CSV
              </button>
            </div>
          </div>

          {/* حقل البحث */}
          <div className="relative">
            <Search className="absolute right-3.5 top-3 size-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم التتبع (مثل: SQ-474730)، اسم العميل، رقم الجوال، أو العنوان..."
              className="w-full bg-[#170f0a] border border-[#3b2718] rounded-xl pr-10 pl-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-600 transition"
            />
          </div>
        </div>

        {/* جدول الشحنات التفصيلي */}
        <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-3 border-b border-[#352316] flex items-center justify-between text-xs text-stone-400 bg-[#251911]">
            <span>عرض {filtered.length} من إجمالي {orders.length} طلب</span>
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5 text-amber-400" />
              <span>تاريخ اليوم: {new Date().toLocaleDateString("en-CA")}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#352316] bg-[#1a110a] text-stone-400 font-bold">
                  <th className="p-3.5">رقم الطلب والتتبع</th>
                  <th className="p-3.5">العميل والمدينة</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">الحالة الحالية</th>
                  <th className="p-3.5">تغيير الحالة</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c1d14]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-500">
                      جارٍ جلب الشحنات من قاعدة البيانات...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-500">
                      لا توجد شحنات مطابقة للبحث أو الفلتر المحدد.
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const cleanPhone = (order.phone || "").replace(/\D/g, "");
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#281c13]/50 transition group"
                      >
                        {/* رقم الطلب والتتبع */}
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-amber-300 text-sm">
                            {order.tracking_code || "SQ-000000"}
                          </div>
                          {order.product_link && (
                            <a
                              href={order.product_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-stone-400 hover:text-amber-300 flex items-center gap-1 mt-0.5 line-clamp-1"
                            >
                              <ExternalLink className="size-3 shrink-0" />
                              {order.product_name || "رابط السلعة"}
                            </a>
                          )}
                        </td>

                        {/* العميل والمدينة */}
                        <td className="p-3.5">
                          <div className="font-bold text-stone-100">
                            {order.customer_name || "عميل غير مسجل"}
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                            {order.notes || "اليمن"}
                          </div>
                        </td>

                        {/* الهاتف */}
                        <td className="p-3.5">
                          <div className="font-mono text-stone-300">
                            {order.phone || "-"}
                          </div>
                          {cleanPhone && (
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <a
                                href={`tel:${cleanPhone}`}
                                className="text-amber-400 hover:underline flex items-center gap-0.5"
                              >
                                <Phone className="size-2.5" /> اتصال
                              </a>
                              <span className="text-stone-600">|</span>
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-0.5"
                              >
                                <MessageCircle className="size-2.5" /> واتساب
                              </a>
                            </div>
                          )}
                        </td>

                        {/* الحالة الحالية بشارة ملونة */}
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              order.status === "تم التوصيل" || order.status === "تم التسليم"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                                : order.status === "تم الشحن"
                                ? "bg-blue-950 text-blue-300 border border-blue-700/50"
                                : order.status === "ملغي"
                                ? "bg-red-950 text-red-300 border border-red-700/50"
                                : "bg-amber-950 text-amber-300 border border-amber-700/50"
                            }`}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {order.status || "جديد"}
                          </span>
                        </td>

                        {/* تغيير الحالة */}
                        <td className="p-3.5">
                          <select
                            value={order.status || "جديد"}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                            className="bg-[#170f0a] border border-[#3d2719] rounded-xl px-2.5 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-600 transition"
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* التاريخ */}
                        <td className="p-3.5 text-stone-400 font-mono text-[11px]">
                          {order.created_at
                            ? new Date(order.created_at).toISOString().slice(0, 10)
                            : "-"}
                        </td>

                        {/* إجراءات */}
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/track/${order.tracking_code}`}
                              className="p-1.5 rounded-lg bg-[#2a1d13] text-stone-300 hover:text-amber-300 hover:bg-[#382619] transition"
                              title="معاينة التتبع"
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                            <button
                              onClick={() => window.print()}
                              className="p-1.5 rounded-lg bg-[#2a1d13] text-stone-300 hover:text-amber-300 hover:bg-[#382619] transition"
                              title="طباعة بوليصة الشحن"
                            >
                              <Printer className="size-3.5" />
                            </button>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="p-1.5 rounded-lg bg-[#2a1d13] text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition"
                              title="حذف الشحنة"
                            >
                              <Trash2 className="size-3.5" />
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
    </div>
  );
}
