import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Search,
  Zap,
  Eye,
  Plus,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Download,
  MapPin,
  Menu,
} from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم العمليات والتوزيع — السوق الشامل" },
      { name: "description", content: "متابعة وإدارة بوليصات الشحن والتحصيل الفوري" },
    ],
  }),
  component: AdminDashboardPage,
});

interface Shipment {
  id: string;
  trackingCode: string;
  clientName: string;
  phone: string;
  city: string;
  status: "pending" | "shipped" | "delivered" | "cancelled";
  amountCOD: number;
  date: string;
}

const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: "1",
    trackingCode: "SQ-892411",
    clientName: "أحمد محمد الحاشدي",
    phone: "770998877",
    city: "صنعاء",
    status: "delivered",
    amountCOD: 1250,
    date: "2026/09/26",
  },
  {
    id: "2",
    trackingCode: "SQ-892412",
    clientName: "خالد سعيد العامري",
    phone: "711223344",
    city: "عدن",
    status: "shipped",
    amountCOD: 850,
    date: "2026/09/26",
  },
  {
    id: "3",
    trackingCode: "SQ-892413",
    clientName: "سالم عمر باوزير",
    phone: "733445566",
    city: "حضرموت",
    status: "pending",
    amountCOD: 620,
    date: "2026/09/26",
  },
  {
    id: "4",
    trackingCode: "SQ-892414",
    clientName: "ياسر عبدربه الردفاني",
    phone: "777889900",
    city: "لحج",
    status: "delivered",
    amountCOD: 927,
    date: "2026/09/25",
  },
  {
    id: "5",
    trackingCode: "SQ-892415",
    clientName: "مراد عبدالله الشميري",
    phone: "775566778",
    city: "تعز",
    status: "shipped",
    amountCOD: 1400,
    date: "2026/09/25",
  },
  {
    id: "6",
    trackingCode: "SQ-892416",
    clientName: "عمار يحيى الصعدي",
    phone: "712345678",
    city: "صعدة",
    status: "pending",
    amountCOD: 430,
    date: "2026/09/25",
  },
  {
    id: "7",
    trackingCode: "SQ-892417",
    clientName: "طارق منصور الزبيري",
    phone: "774123987",
    city: "ذمار",
    status: "pending",
    amountCOD: 510,
    date: "2026/09/24",
  },
  {
    id: "8",
    trackingCode: "SQ-892418",
    clientName: "نبيل قائد التهامي",
    phone: "739876543",
    city: "الحديدة",
    status: "delivered",
    amountCOD: 1470,
    date: "2026/09/24",
  },
  {
    id: "9",
    trackingCode: "SQ-892419",
    clientName: "عصام فؤاد العريقي",
    phone: "771122998",
    city: "إب",
    status: "cancelled",
    amountCOD: 350,
    date: "2026/09/23",
  },
];

function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // تصفية الشحنات
  const filteredShipments = useMemo(() => {
    return INITIAL_SHIPMENTS.filter((item) => {
      const matchSearch =
        searchQuery === "" ||
        item.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery);

      const matchStatus =
        activeFilter === "all" || item.status === activeFilter;

      const matchCity =
        cityFilter === "all" || item.city === cityFilter;

      return matchSearch && matchStatus && matchCity;
    });
  }, [searchQuery, activeFilter, cityFilter]);

  // إحصائيات سريعة مطابقة للصورة
  const stats = useMemo(() => {
    const total = INITIAL_SHIPMENTS.length;
    const pending = INITIAL_SHIPMENTS.filter((s) => s.status === "pending").length;
    const shipped = INITIAL_SHIPMENTS.filter((s) => s.status === "shipped").length;
    const delivered = INITIAL_SHIPMENTS.filter((s) => s.status === "delivered").length;
    const cancelled = INITIAL_SHIPMENTS.filter((s) => s.status === "cancelled").length;
    const totalCOD = INITIAL_SHIPMENTS.filter((s) => s.status !== "cancelled").reduce(
      (acc, s) => acc + s.amountCOD,
      0
    );
    const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : "0";

    return { total, pending, shipped, delivered, cancelled, totalCOD, successRate };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0e101f] text-slate-100 flex font-body">
      {/* القائمة الجانبية الحمراء */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* المحتوى الرئيسي للداشبورد */}
      <div className="flex-1 lg:mr-64 p-4 lg:p-6 transition-all">
        {/* الشريط العلوي للوحة العمليات */}
        <header className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f] mb-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* الشعار والبيانات */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-[#232747] text-white hover:bg-[#2e335e]"
              >
                <Menu className="size-5" />
              </button>
              <div className="size-11 rounded-2xl bg-[#7c3aed] flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
                <Package className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-white">السوق الشامل</h1>
                  <span className="rounded-full bg-[#272b50] px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                    لوحة التحكم
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  منظومة إدارة الشحنات وتتبع الطرود السريعة
                </p>
              </div>
            </div>

            {/* شريط البحث السريع والعمليات */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث برقم التتبع (مثلاً: 2411)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 sm:w-64 rounded-xl bg-[#0f1122] py-2 pr-9 pl-3 text-xs text-slate-200 border border-[#292c4f] focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
                />
              </div>

              {/* شارة المشرف العام */}
              <div className="flex items-center gap-2 rounded-xl bg-[#212444] px-3 py-1.5 border border-[#30345e] text-xs">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">المشرف العام</span>
                <span className="text-[10px] text-emerald-400">(نشط) admin</span>
              </div>

              {/* أزرار العمليات السريعة */}
              <Link
                to="/new-order"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition"
              >
                <Zap className="size-3.5" /> اطلب الآن
              </Link>

              <Link
                to="/track"
                className="flex items-center gap-1.5 rounded-xl bg-[#2b2450] border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-[#39306b] transition"
              >
                <Eye className="size-3.5" /> تتبع العميل
              </Link>

              <Link
                to="/new-order"
                className="flex items-center gap-1.5 rounded-xl bg-[#7c3aed] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-[#6d28d9] transition"
              >
                <Plus className="size-4" /> طلب شحن جديد
              </Link>
            </div>
          </div>
        </header>

        {/* عنوان اللوحة والتاريخ */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-cyan-400" />
              لوحة عمليات الشحن والتوزيع
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              متابعة الشحنات، تحديث الحالات، إدارة بوليصات الشحن والتحصيل الفوري
            </p>
          </div>
          <div className="rounded-xl bg-[#16182e] border border-[#272b50] px-3.5 py-1.5 text-xs font-bold text-slate-300">
            📅 تاريخ اليوم: 2026/09/28
          </div>
        </div>

        {/* بطاقات الإحصائيات الأربع الملونة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* إجمالي الطلبات (بنفسجي) */}
          <div
            onClick={() => setActiveFilter("all")}
            className={`cursor-pointer rounded-2xl bg-[#181a33] p-5 border transition-all ${
              activeFilter === "all"
                ? "border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/20"
                : "border-[#2b2e54] hover:border-purple-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-bold text-purple-300">
                100%
              </span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Package className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{stats.total}</div>
            <div className="text-sm font-bold text-purple-200">إجمالي الطلبات</div>
            <p className="text-[11px] text-slate-400 mt-0.5">جميع الشحنات المسجلة بالمنظومة</p>
            <div className="mt-3 pt-3 border-t border-purple-500/20 text-[10px] font-bold text-purple-400">
              {activeFilter === "all" ? "✓ تصفية مفعلة حالياً" : "انقر لتصفية الجدول"}
            </div>
          </div>

          {/* قيد الانتظار (برتقالي) */}
          <div
            onClick={() => setActiveFilter("pending")}
            className={`cursor-pointer rounded-2xl bg-[#181a33] p-5 border transition-all ${
              activeFilter === "pending"
                ? "border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-900/20"
                : "border-[#2b2e54] hover:border-amber-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                33%
              </span>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{stats.pending}</div>
            <div className="text-sm font-bold text-amber-200">قيد الانتظار</div>
            <p className="text-[11px] text-slate-400 mt-0.5">بانتظار التجهيز واستلام المندوب</p>
            <div className="mt-3 pt-3 border-t border-amber-500/20 text-[10px] font-bold text-amber-400">
              {activeFilter === "pending" ? "✓ تصفية مفعلة حالياً" : "انقر لتصفية الجدول"}
            </div>
          </div>

          {/* تم الشحن (أزرق) */}
          <div
            onClick={() => setActiveFilter("shipped")}
            className={`cursor-pointer rounded-2xl bg-[#181a33] p-5 border transition-all ${
              activeFilter === "shipped"
                ? "border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-900/20"
                : "border-[#2b2e54] hover:border-blue-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                22%
              </span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Truck className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{stats.shipped}</div>
            <div className="text-sm font-bold text-blue-200">تم الشحن</div>
            <p className="text-[11px] text-slate-400 mt-0.5">في الطريق مع المناديب والفرز</p>
            <div className="mt-3 pt-3 border-t border-blue-500/20 text-[10px] font-bold text-blue-400">
              {activeFilter === "shipped" ? "✓ تصفية مفعلة حالياً" : "انقر لتصفية الجدول"}
            </div>
          </div>

          {/* تم التوصيل (أخضر) */}
          <div
            onClick={() => setActiveFilter("delivered")}
            className={`cursor-pointer rounded-2xl bg-[#181a33] p-5 border transition-all ${
              activeFilter === "delivered"
                ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-900/20"
                : "border-[#2b2e54] hover:border-emerald-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                33%
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{stats.delivered}</div>
            <div className="text-sm font-bold text-emerald-200">تم التوصيل</div>
            <p className="text-[11px] text-slate-400 mt-0.5">تم تسليمها للعملاء بنجاح</p>
            <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              {activeFilter === "delivered" ? "✓ تصفية مفعلة حالياً" : "انقر لتصفية الجدول"}
            </div>
          </div>
        </div>

        {/* الشريط المالي السريع (COD ونسبة الإنجاز) */}
        <div className="rounded-2xl bg-[#16182e] p-4 border border-[#272b50] mb-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
              <TrendingUp className="size-4" />
            </span>
            <span>معدل الإنجاز والتسليم: {stats.successRate}% نسبة تسليم ناجحة</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-purple-300">
              <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                <DollarSign className="size-4" />
              </span>
              <span>
                إجمالي مبالغ التحصيل (COD):{" "}
                <span className="text-white text-sm font-black">
                  {stats.totalCOD.toLocaleString()} ر.س
                </span>
              </span>
            </div>
            <div className="text-rose-400">
              شحنات ملغاة: {stats.cancelled} طلب
            </div>
          </div>
        </div>

        {/* شريط الفلاتر والبحث في الجدول */}
        <div className="rounded-2xl bg-[#16182e] p-4 border border-[#272b50] mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-bold ml-1">الحالة:</span>
            {[
              { id: "all", label: `الكل (${stats.total})` },
              { id: "pending", label: `قيد الانتظار (${stats.pending})` },
              { id: "shipped", label: `تم الشحن (${stats.shipped})` },
              { id: "delivered", label: `تم التوصيل (${stats.delivered})` },
              { id: "cancelled", label: `ملغي (${stats.cancelled})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === tab.id
                    ? "bg-[#7c3aed] text-white shadow-md shadow-purple-800/30"
                    : "bg-[#212444] text-slate-300 hover:bg-[#2b2f57]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-xl bg-[#212444] border border-[#32365e] px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">كل المدن</option>
              <option value="صنعاء">صنعاء</option>
              <option value="عدن">عدن</option>
              <option value="تعز">تعز</option>
              <option value="حضرموت">حضرموت</option>
              <option value="الحديدة">الحديدة</option>
            </select>

            <button
              onClick={() => alert("جارٍ تصدير ملف CSV...")}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700/30 border border-emerald-600/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-700/50 transition"
            >
              <Download className="size-3.5" /> تصدير CSV
            </button>
          </div>
        </div>

        {/* جدول بيانات الشحنات */}
        <div className="overflow-x-auto rounded-2xl bg-[#16182e] border border-[#272b50] shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1f223f] text-slate-300 font-bold border-b border-[#2b2f57]">
              <tr>
                <th className="p-3.5">رقم التتبع</th>
                <th className="p-3.5">اسم العميل</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5">المدينة</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">مبلغ التحصيل (COD)</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24284b] text-slate-200">
              {filteredShipments.map((s) => (
                <tr key={s.id} className="hover:bg-[#1b1e38] transition">
                  <td className="p-3.5 font-mono font-bold text-purple-300">
                    {s.trackingCode}
                  </td>
                  <td className="p-3.5 font-bold text-white">{s.clientName}</td>
                  <td dir="ltr" className="p-3.5 text-right font-mono text-slate-300">
                    {s.phone}
                  </td>
                  <td className="p-3.5">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="size-3 text-rose-400" />
                      {s.city}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {s.status === "delivered" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        <CheckCircle2 className="size-3" /> تم التوصيل
                      </span>
                    )}
                    {s.status === "shipped" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
                        <Truck className="size-3" /> تم الشحن
                      </span>
                    )}
                    {s.status === "pending" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                        <Clock className="size-3" /> قيد الانتظار
                      </span>
                    )}
                    {s.status === "cancelled" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                        <XCircle className="size-3" /> ملغي
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-bold text-white">
                    {s.amountCOD.toLocaleString()} ر.س
                  </td>
                  <td className="p-3.5 text-slate-400">{s.date}</td>
                  <td className="p-3.5 text-center">
                    <Link
                      to={`/track/${s.trackingCode}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#282d54] px-2.5 py-1 text-[11px] font-bold text-purple-200 hover:bg-[#343a6d] transition"
                    >
                      <Eye className="size-3" /> تفاصيل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
