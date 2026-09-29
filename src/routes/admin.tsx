import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  Package, Search, ExternalLink, Printer, Trash2, Phone,
  MessageCircle, Menu, Clock, Truck, CheckCircle2, TrendingUp,
  Download, Calendar, DollarSign, PlusCircle, RefreshCw, User,
} from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });
const STATUS_OPTIONS = ["جديد","قيد الانتظار","تم الشراء","تم الشحن","وصل","تم التوصيل","ملغي"];

function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [cityFilter, setCityFilter] = useState("كل المدن");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel("admin-orders-stream").on("postgres_changes",{ event: "*", schema: "public", table: "orders" },() => fetchOrders()).subscribe();
    const notif = supabase.channel("admin-new-order-alert").on("postgres_changes",{ event: "INSERT", schema: "public", table: "orders" },(payload)=>{
      const o = payload.new as any;
      try{ new Audio("https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3").play().catch(()=>{}); }catch{}
      alert(`طلب جديد 🛒\n${o.customer_name} - ${o.tracking_code}`);
    }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(notif); };
  }, []);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    if (!error) setOrders((prev) => prev.map((o) => (o.id === id? {...o, status: newStatus } : o)));
  };
  const deleteOrder = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشحنة نهائياً؟")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (!error) setOrders((prev) => prev.filter((o) => o.id!== id));
  };

  const filtered = useMemo(() => orders.filter((o) => {
    const matchSearch =!search || o.tracking_code?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.includes(search) || o.phone?.includes(search) || o.notes?.includes(search);
    const matchFilter = filter === "الكل" || (filter === "قيد الانتظار" && (o.status === "جديد" || o.status === "قيد الانتظار")) || o.status === filter;
    const matchCity = cityFilter === "كل المدن" || (o.notes && o.notes.includes(cityFilter));
    return matchSearch && matchFilter && matchCity;
  }), [orders, search, filter, cityFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => ["جديد","قيد الانتظار","تم التواصل"].includes(o.status)).length;
    const shipped = orders.filter((o) => ["تم الشراء","تم الشحن","وصل"].includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === "تم التوصيل" || o.status === "تم التسليم").length;
    const cancelled = orders.filter((o) => o.status === "ملغي").length;
    return { total, pending, shipped, delivered, cancelled,
      pendingPct: total? ((pending/total)*100).toFixed(0):"0",
      shippedPct: total? ((shipped/total)*100).toFixed(0):"0",
      deliveredPct: total? ((delivered/total)*100).toFixed(0):"0" };
  }, [orders]);

  const exportCSV = () => {
    const header = "رقم الشحنة,العميل,الهاتف,الحالة,التاريخ,الملاحظات\n";
    const rows = filtered.map((o) => `"${o.tracking_code||""}","${o.customer_name||""}","${o.phone||""}","${o.status||""}","${o.created_at||""}","${(o.notes||"").replace(/"/g,'""')}"`).join("\n");
    const blob = new Blob(["\uFEFF"+header+rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `shipments-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#140d08] text-stone-100 flex font-sans">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 w-full min-w-0 p-4 md:p-6 space-y-5">

        <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl bg-[#2a1d14] text-amber-300 border border-[#442c1c]"><Menu className="size-5" /></button>
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center"><Package className="size-5 text-amber-100" /></div>
              <div><h1 className="text-base font-black text-amber-100">لوحة عمليات الشحن والتوزيع</h1>
              <p className="text-[11px] text-stone-400">متابعة الشحنات، تحديث الحالات، إدارة بوليصات الشحن</p></div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Link to="/new-order" className="px-3 py-2 rounded-xl bg-amber-700 text-amber-50 font-bold flex items-center gap-1.5"><PlusCircle className="size-4" /> طلب شحن جديد</Link>
            <button onClick={fetchOrders} className="p-2 rounded-xl bg-[#2b1c13] text-amber-300 border border-[#4a301e]"><RefreshCw className={`size-4 ${loading?"animate-spin":""}`} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4"><div className="text-3xl font-black text-amber-100">{stats.total}</div><div className="text-xs font-bold mt-1">إجمالي الطلبات</div></div>
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4"><div className="text-3xl font-black text-amber-400">{stats.pending}</div><div className="text-xs text-amber-300 font-bold mt-1">قيد الانتظار ({stats.pendingPct}%)</div></div>
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4"><div className="text-3xl font-black text-blue-300">{stats.shipped}</div><div className="text-xs text-blue-300 font-bold mt-1">تم الشحن ({stats.shippedPct}%)</div></div>
          <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4"><div className="text-3xl font-black text-emerald-400">{stats.delivered}</div><div className="text-xs text-emerald-300 font-bold mt-1">تم التوصيل ({stats.deliveredPct}%)</div></div>
        </div>

        <div className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[["الكل",stats.total],["قيد الانتظار",stats.pending],["تم الشحن",stats.shipped],["تم التوصيل",stats.delivered],["ملغي",stats.cancelled]].map(([label,count]:any)=>(
              <button key={label} onClick={()=>setFilter(label)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter===label?"bg-amber-700 text-white":"bg-[#291b12] text-stone-300"}`}>{label} ({count})</button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute right-3.5 top-3 size-4 text-stone-400" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ابحث برقم التتبع، اسم العميل، الجوال..." className="w-full bg-[#170f0a] border border-[#3b2718] rounded-xl pr-10 pl-4 py-2.5 text-xs outline-none focus:border-amber-600" />
          </div>
        </div>

        {/* كروت الجوال */}
        <div className="md:hidden space-y-3">
          {filtered.map((order)=>(
            <div key={order.id} className="bg-[#1f150e] border border-[#3b2718] rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-amber-300 text-sm">{order.tracking_code}</span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50">{order.status}</span>
              </div>
              <div className="text-sm font-bold">{order.customer_name}</div>
              <div className="text-xs text-stone-400 font-mono" dir="ltr">{order.phone}</div>
              <div className="flex gap-2">
                <a href={`tel:${order.phone}`} className="flex-1 text-center py-2 rounded-xl bg-amber-700 text-white text-xs font-bold">اتصال</a>
                <select value={order.status||"جديد"} onChange={(e)=>updateOrderStatus(order.id,e.target.value)} className="flex-1 bg-[#170f0a] border border-[#3d2719] rounded-xl text-xs px-2 py-2">
                  {STATUS_OPTIONS.map(st=><option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* جدول الكمبيوتر */}
        <div className="hidden md:block bg-[#1f150e] border border-[#3b2718] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead><tr className="border-b border-[#352316] bg-[#1a110a] text-stone-400 font-bold">
                <th className="p-3.5">رقم التتبع</th><th className="p-3.5">العميل</th><th className="p-3.5">الهاتف</th><th className="p-3.5">الحالة</th><th className="p-3.5">تغيير الحالة</th><th className="p-3.5">التاريخ</th><th className="p-3.5 text-center">إجراءات</th>
              </tr></thead>
              <tbody className="divide-y divide-[#2c1d14]">
                {filtered.map((order)=>{
                  const cleanPhone=(order.phone||"").replace(/\D/g,"");
                  return (
                  <tr key={order.id} className="hover:bg-[#281c13]/50">
                    <td className="p-3.5 font-mono font-bold text-amber-300">{order.tracking_code}</td>
                    <td className="p-3.5"><div className="font-bold">{order.customer_name}</div><div className="text-[11px] text-stone-400">{order.notes}</div></td>
                    <td className="p-3.5 font-mono">{order.phone}
                      {cleanPhone&&<div className="flex gap-2 mt-1 text-[10px]"><a href={`tel:${cleanPhone}`} className="text-amber-400 flex items-center gap-0.5"><Phone className="size-2.5"/> اتصال</a><a href={`https://wa.me/${cleanPhone}`} target="_blank" className="text-emerald-400 flex items-center gap-0.5"><MessageCircle className="size-2.5"/> واتساب</a></div>}
                    </td>
                    <td className="p-3.5"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-700/50">{order.status}</span></td>
                    <td className="p-3.5"><select value={order.status||"جديد"} onChange={(e)=>updateOrderStatus(order.id,e.target.value)} className="bg-[#170f0a] border border-[#3d2719] rounded-xl px-2.5 py-1.5 text-xs">{STATUS_OPTIONS.map(st=><option key={st} value={st}>{st}</option>)}</select></td>
                    <td className="p-3.5 font-mono text-[11px]">{order.created_at?.slice(0,10)}</td>
                    <td className="p-3.5"><div className="flex justify-center gap-1">
                      <Link to={`/track/${order.tracking_code}`} className="p-1.5 rounded-lg bg-[#2a1d13]"><ExternalLink className="size-3.5"/></Link>
                      <button onClick={()=>deleteOrder(order.id)} className="p-1.5 rounded-lg bg-[#2a1d13] text-red-400"><Trash2 className="size-3.5"/></button>
                    </div></td>
                  </tr>);})}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
