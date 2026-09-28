import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Package, Search, Eye } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const STATUSES = ["جديد","تم التواصل","تم الشراء","تم الشحن","وصل","تم التسليم","ملغي"];

function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel("admin-orders")
     .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
     .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === id? {...o, status: newStatus } : o));
    }
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =!search || o.tracking_code?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.includes(search) || o.phone?.includes(search);
      const matchFilter = filter === "الكل" || o.status === filter;
      return matchSearch && matchFilter;
    });
  }, [orders, search, filter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => ["جديد","تم التواصل"].includes(o.status)).length;
    const shipped = orders.filter(o => ["تم الشراء","تم الشحن","وصل"].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === "تم التسليم").length;
    const rate = total? ((delivered/total)*100).toFixed(1) : "0";
    return { total, pending, shipped, delivered, rate };
  }, [orders]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0e101f] text-white flex">
      <AdminSidebar isOpen={false} onToggle={()=>{}} />
      <div className="flex-1 lg:mr-64 p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black flex items-center gap-2">
            <Package className="text-purple-400" /> لوحة إدارة الشحنات
          </h1>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 size-4 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث برقم الشحنة..."
              className="bg-[#16182e] border border-white/10 rounded-xl pr-9 pl-3 py-2 text-sm outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#16182e] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-gray-400">إجمالي الطلبات</div>
            <div className="text-2xl font-black">{stats.total}</div>
          </div>
          <div className="bg-[#16182e] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-amber-400">قيد المراجعة والشراء</div>
            <div className="text-2xl font-black">{stats.pending}</div>
          </div>
          <div className="bg-[#16182e] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-blue-400">شحن دولي ومستودع</div>
            <div className="text-2xl font-black">{stats.shipped}</div>
          </div>
          <div className="bg-[#16182e] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-emerald-400">المكتملة والتسليم</div>
            <div className="text-2xl font-black">{stats.delivered}</div>
            <div className="text-[11px] text-gray-500">نسبة الإنجاز {stats.rate}%</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {["الكل",...STATUSES].map(s => (
            <button key={s} onClick={()=>setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter===s? "bg-purple-600":"bg-[#1e213d] text-gray-300"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="bg-[#16182e] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-white/10">
                <th className="p-3 text-right">رقم الشحنة</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">تغيير الحالة</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">جارٍ التحميل...</td></tr>
              ) : filtered.map(order => (
                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-mono font-bold text-purple-300">{order.tracking_code}</td>
                  <td className="p-3">{order.customer_name}</td>
                  <td className="p-3" dir="ltr">{order.phone}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-white/10">{order.status}</span>
                  </td>
                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="bg-[#1e213d] border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <Link to="/track/$trackingCode" params={{ trackingCode: order.tracking_code }}
                      className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-lg">
                      <Eye size={14} /> عرض التتبع
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
