import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Package, Clock, Truck, CheckCircle2, XCircle, Search,
  Eye, Plus, TrendingUp, Download, Menu, ExternalLink, RefreshCw
} from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم العمليات والتوزيع — السوق الشامل" },
      { name: "description", content: "متابعة وإدارة طلبات وبوليصات الشحن الفوري" },
    ],
  }),
  component: AdminDashboardPage,
});

interface OrderItem {
  id: string;
  trackingCode: string;
  customerName: string;
  phone: string;
  productLink: string;
  productName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  "جديد": { label: "جديد", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  "تم التواصل": { label: "تم التواصل", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "تم الشراء": { label: "تم الشراء", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  "تم الشحن": { label: "تم الشحن الدولي", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  "وصل": { label: "وصل للمستودع", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  "تم التسليم": { label: "تم التسليم", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  "ملغي": { label: "ملغي", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
};

function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && !error) {
      setOrders(data.map((d: any) => ({
        id: d.id,
        trackingCode: d.tracking_code,
        customerName: d.customer_name,
        phone: d.phone,
        productLink: d.product_link,
        productName: d.product_name,
        status: d.status || "جديد",
        notes: d.notes,
        createdAt: new Date(d.created_at).toLocaleDateString('ar-YE', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } else {
      alert("تعذر تحديث الحالة: " + error.message);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      const matchSearch = searchQuery === "" ||
        item.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerName.includes(searchQuery) ||
        item.phone.includes(searchQuery);
      const matchStatus = activeFilter === "all" || item.status === activeFilter;
      return matchSearch && matchStatus;
    });
  }, [searchQuery, activeFilter, orders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(s => s.status === "جديد" || s.status === "تم التواصل").length;
    const shipped = orders.filter(s => s.status === "تم الشراء" || s.status === "تم الشحن" || s.status === "وصل").length;
    const delivered = orders.filter(s => s.status === "تم التسليم").length;
    const cancelled = orders.filter(s => s.status === "ملغي").length;
    const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : "0";
    return { total, pending, shipped, delivered, cancelled, successRate };
  }, [orders]);

  const exportCSV = () => {
    const header = "رقم_التتبع,اسم_العميل,الهاتف,الحالة,الرابط,ملاحظات,تاريخ_الطلب\n";
    const rows = filteredOrders.map(s => 
      `"${s.trackingCode}","${s.customerName}","${s.phone}","${s.status}","${s.productLink}","${s.notes || ''}","${s.createdAt}"`
    ).join("\n");
    const blob = new Blob(["\ufeff" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `طلبات_السوق_الشامل_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0e101f] text-slate-100 flex font-body">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
      
      <div className="flex-1 lg:mr-64 p-4 lg:p-6 transition-all">
        {/* Header */}
        <header className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f] mb-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl bg-[#232747] text-white">
                <Menu className="size-5" />
              </button>
              <div className="size-11 rounded-2xl bg-[#7c3aed] flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
                <Package className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-white">السوق الشامل</h1>
                  <span className="rounded-full bg-[#272b50] px-2.5 py-0.5 text-[10px] font-bold text-purple-300">إدارة الطلبات</span>
                </div>
                <p className="text-xs text-slate-400">إدارة ومتابعة طلبات الوساطة وبوليصات الشحن المتصلة بقاعدة البيانات</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث برقم التتبع أو الاسم أو الهاتف"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 sm:w-72 rounded-xl bg-[#0f1122] py-2 pr-9 pl-3 text-xs border border-[#292c4f] focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                onClick={loadOrders}
                title="تحديث البيانات"
                className="p-2 rounded-xl bg-[#212444] border border-[#30345e] hover:bg-[#2c305a] text-slate-300"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-xl bg-[#212444] px-3.5 py-2 text-xs font-bold border border-[#30345e] hover:bg-[#2c305a]"
              >
                <Download className="size-3.5" />
                <span>تصدير CSV</span>
              </button>

              <Link
                to="/new-order"
                className="flex items-center gap-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] px-3.5 py-2 text-xs font-bold text-white shadow"
              >
                <Plus className="size-4" />
                <span>طلب جديد</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f]">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>إجمالي الطلبات</span>
              <Package className="size-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-1">كافة الطلبات المسجلة</div>
          </div>

          <div className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f]">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>قيد المراجعة والشراء</span>
              <Clock className="size-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-amber-400">{stats.pending}</div>
            <div className="text-[10px] text-slate-500 mt-1">طلبات جديدة وتواصل</div>
          </div>

          <div className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f]">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>شحن دولي ومستودع</span>
              <Truck className="size-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-cyan-400">{stats.shipped}</div>
            <div className="text-[10px] text-slate-500 mt-1">في مسار الشحن والتوزيع</div>
          </div>

          <div className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f]">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>المكتملة والتسليم</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-emerald-400">{stats.delivered}</div>
            <div className="text-[10px] text-emerald-400/80 mt-1">نسبة الإنجاز: {stats.successRate}%</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {["all", "جديد", "تم التواصل", "تم الشراء", "تم الشحن", "وصل", "تم التسليم", "ملغي"].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setActiveFilter(statusKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === statusKey
                  ? "bg-[#7c3aed] text-white"
                  : "bg-[#16182e] text-slate-400 border border-[#2a2d4f] hover:bg-[#202342]"
              }`}
            >
              {statusKey === "all" ? "جميع الطلبات" : statusKey}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="rounded-2xl bg-[#16182e] border border-[#2a2d4f] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#121426] text-slate-400 border-b border-[#2a2d4f]">
                <tr>
                  <th className="py-3 px-4">رقم الشحنة</th>
                  <th className="py-3 px-4">العميل والهاتف</th>
                  <th className="py-3 px-4">رابط المنتج</th>
                  <th className="py-3 px-4">العنوان والملاحظات</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232647]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {loading ? "جاري تحميل البيانات من الخادم..." : "لا توجد طلبات مطابقة للبحث أو الفلتر"}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-slate-300", bg: "bg-slate-700/20 border-slate-600/30" };
                    return (
                      <tr key={order.id} className="hover:bg-[#1a1d36] transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-purple-300 bg-[#25284a] px-2 py-1 rounded-lg border border-purple-500/20">
                            {order.trackingCode}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{order.customerName}</div>
                          <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{order.phone}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <a
                            href={order.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline flex items-center gap-1 truncate"
                            title={order.productLink}
                          >
                            <span className="truncate">{order.productName || order.productLink}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        </td>
                        <td className="py-3 px-4 max-w-[220px]">
                          <p className="text-slate-300 truncate" title={order.notes || "لا توجد"}>
                            {order.notes || "—"}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold border bg-[#101222] ${statusInfo.color} focus:outline-none`}
                          >
                            {Object.keys(STATUS_MAP).map((st) => (
                              <option key={st} value={st} className="bg-[#16182e] text-white">
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {order.createdAt}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            to="/track/$trackingCode"
                            params={{ trackingCode: order.trackingCode }}
                            target="_blank"
                            className="inline-flex items-center gap-1 bg-[#25284a] hover:bg-[#343864] text-purple-300 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-purple-500/20"
                          >
                            <Eye className="size-3.5" />
                            <span>عرض التتبع</span>
                          </Link>
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
