import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Package, Clock, Truck, CheckCircle2, XCircle, Search,
  Zap, Eye, Plus, TrendingUp, DollarSign, Download, MapPin, Menu,
} from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";

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

function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("shipments").select("*").order("created_at", { ascending: false });
      if (data) {
        setShipments(data.map((d: any) => ({
          id: d.id,
          trackingCode: d.tracking_code,
          clientName: d.client_name,
          phone: d.phone || "",
          city: d.city || "",
          status: d.status,
          amountCOD: Number(d.amount_cod),
          date: new Date(d.created_at).toLocaleDateString('en-CA')
        })));
      }
    };
    load();
  }, []);

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const matchSearch = searchQuery === "" ||
        item.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.clientName.includes(searchQuery) || item.phone.includes(searchQuery);
      const matchStatus = activeFilter === "all" || item.status === activeFilter;
      const matchCity = cityFilter === "all" || item.city === cityFilter;
      return matchSearch && matchStatus && matchCity;
    });
  }, [searchQuery, activeFilter, cityFilter, shipments]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter(s => s.status === "pending").length;
    const shipped = shipments.filter(s => s.status === "shipped").length;
    const delivered = shipments.filter(s => s.status === "delivered").length;
    const cancelled = shipments.filter(s => s.status === "cancelled").length;
    const totalCOD = shipments.filter(s => s.status!== "cancelled").reduce((acc, s) => acc + s.amountCOD, 0);
    const successRate = total > 0? ((delivered / total) * 100).toFixed(1) : "0";
    return { total, pending, shipped, delivered, cancelled, totalCOD, successRate };
  }, [shipments]);

  const exportCSV = () => {
    const header = "tracking_code,client_name,phone,city,status,amount_cod,date\n";
    const rows = filteredShipments.map(s => `${s.trackingCode},${s.clientName},${s.phone},${s.city},${s.status},${s.amountCOD},${s.date}`).join("\n");
    const blob = new Blob(["\ufeff" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "shipments.csv"; a.click();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0e101f] text-slate-100 flex font-body">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p =>!p)} />
      <div className="flex-1 lg:mr-64 p-4 lg:p-6 transition-all">
        <header className="rounded-2xl bg-[#16182e] p-4 border border-[#2a2d4f] mb-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl bg-[#232747] text-white">
                <Menu className="size-5" />
              </button>
              <div className="size-11 rounded-2xl bg-[#7c3aed] flex items-center justify-center text-white">
                <Package className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-white">السوق الشامل</h1>
                  <span className="rounded-full bg-[#272b50] px-2.5 py-0.5 text-[10px] font-bold text-purple-300">لوحة التحكم</span>
                </div>
                <p className="text-xs text-slate-400">منظومة إدارة الشحنات وتتبع الطرود السريعة</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 size-4 text-slate-400" />
                <input type="text" placeholder="ابحث برقم التتبع" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 sm:w-64 rounded-xl bg-[#0f1122] py-2 pr-9 pl-3 text-xs border border-[#292c4f] focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#212444] px-3 py-1.5 border border-[#30345e] text-xs">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">المشرف العام</span>
                <span className="text-[10px] text-emerald-400">(نشط)</span>
              </div>
              <Link to="/new-order" className="flex items-center gap-1.5 rounded-xl bg-[#7c3aed] px-3.5 py-1.5 text-xs font-bold text-white">
                <Plus className="size-4" /> طلب شحن جديد
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div onClick={() => setActiveFilter("all")} className="cursor-pointer rounded-2xl bg-[#181a33] p-5 border border-[#2b2e54]">
            <div className="text-3xl font-black">{stats.total}</div>
            <div className="text-sm font-bold text-purple-200">إجمالي الطلبات</div>
          </div>
          <div onClick={() => setActiveFilter("pending")} className="cursor-pointer rounded-2xl bg-[#181a33] p-5 border border-[#2b2e54]">
            <div className="text-3xl font-black">{stats.pending}</div>
            <div className="text-sm font-bold text-amber-200">قيد الانتظار</div>
          </div>
          <div onClick={() => setActiveFilter("shipped")} className="cursor-pointer rounded-2xl bg-[#181a33] p-5 border border-[#2b2e54]">
            <div className="text-3xl font-black">{stats.shipped}</div>
            <div className="text-sm font-bold text-blue-200">تم الشحن</div>
          </div>
          <div onClick={() => setActiveFilter("delivered")} className="cursor-pointer rounded-2xl bg-[#181a33] p-5 border border-[#2b2e54]">
            <div className="text-3xl font-black">{stats.delivered}</div>
            <div className="text-sm font-bold text-emerald-200">تم التوصيل</div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#16182e] p-4 border border-[#272b50] mb-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp className="size-4" />
            <span>معدل الإنجاز: {stats.successRate}%</span>
          </div>
          <div className="flex items-center gap-2 text-purple-300">
            <DollarSign className="size-4" />
            <span>إجمالي COD: <span className="text-white font-black">{stats.totalCOD.toLocaleString()} ر.س</span></span>
          </div>
          <div className="text-rose-400">ملغاة: {stats.cancelled}</div>
        </div>

        <div className="rounded-2xl bg-[#16182e] p-4 border border-[#272b50] mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[["all",`الكل (${stats.total})`],["pending",`انتظار (${stats.pending})`],["shipped",`شحن (${stats.shipped})`],["delivered",`توصيل (${stats.delivered})`],["cancelled",`ملغي (${stats.cancelled})`]].map(([id,label]) => (
              <button key={id} onClick={() => setActiveFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeFilter===id?"bg-[#7c3aed] text-white":"bg-[#212444] text-slate-300"}`}>{label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={cityFilter} onChange={(e)=>setCityFilter(e.target.value)} className="rounded-xl bg-[#212444] px-3 py-1.5 text-xs">
              <option value="all">كل المدن</option>
              <option value="صنعاء">صنعاء</option>
              <option value="عدن">عدن</option>
              <option value="تعز">تعز</option>
              <option value="حضرموت">حضرموت</option>
              <option value="الحديدة">الحديدة</option>
            </select>
            <button onClick={exportCSV} className="flex items-center gap-1 rounded-xl bg-emerald-700/30 px-3 py-1.5 text-xs font-bold text-emerald-300">
              <Download className="size-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-[#16182e] border border-[#272b50]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1f223f] text-slate-300"><tr>
              <th className="p-3.5">رقم التتبع</th><th className="p-3.5">العميل</th>
              <th className="p-3.5">الهاتف</th><th className="p-3.5">المدينة</th>
              <th className="p-3.5">الحالة</th><th className="p-3.5">COD</th><th className="p-3.5">التاريخ</th>
            </tr></thead>
            <tbody className="divide-y divide-[#24284b]">
              {filteredShipments.map((s) => (
                <tr key={s.id} className="hover:bg-[#1b1e38]">
                  <td className="p-3.5 font-mono text-purple-300 font-bold">{s.trackingCode}</td>
                  <td className="p-3.5 font-bold text-white">{s.clientName}</td>
                  <td className="p-3.5">{s.phone}</td>
                  <td className="p-3.5">{s.city}</td>
                  <td className="p-3.5">{s.status}</td>
                  <td className="p-3.5 font-bold">{s.amountCOD.toLocaleString()} ر.س</td>
                  <td className="p-3.5 text-slate-400">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shipments.length===0 && <p className="p-8 text-center text-slate-400 text-sm">لا توجد شحنات بعد</p>}
        </div>
      </div>
    </div>
  );
}
