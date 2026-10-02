import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowRight,
  Store,
  Container,
  DollarSign,
  TrendingUp,
  Users,
  Search,
  Plus,
  Ship,
  Plane,
  FileText,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Percent,
  X,
  Package,
} from "lucide-react";

export type BulkShipmentStatus =
  | "manufacturing"
  | "port_origin"
  | "in_transit"
  | "customs_clearance"
  | "delivered";

export interface BulkCargoItem {
  id: string;
  trackingNumber: string;
  merchantName: string;
  companyName: string;
  phone: string;
  origin: string;
  method: "sea" | "air";
  volume: string; // e.g. "4.5 CBM" or "650 كجم"
  totalCostUSD: number;
  commissionUSD: number;
  status: BulkShipmentStatus;
  date: string;
}

const INITIAL_BULK_CARGO: BulkCargoItem[] = [
  {
    id: "B-8801",
    trackingNumber: "MSK-9281048",
    merchantName: "عبدالرحمن الشيباني",
    companyName: "مؤسسة الشيباني للإلكترونيات",
    phone: "777112233",
    origin: "الصين (كوانزو - شنتشن)",
    method: "sea",
    volume: "12.5 CBM",
    totalCostUSD: 4850,
    commissionUSD: 350,
    status: "in_transit",
    date: "2026-02-15",
  },
  {
    id: "B-8802",
    trackingNumber: "TK-4819022",
    merchantName: "فؤاد القدسي",
    companyName: "معارض القدسي للأقمشة والملابس",
    phone: "771889900",
    origin: "تركيا (إسطنبول)",
    method: "air",
    volume: "820 كجم",
    totalCostUSD: 9840,
    commissionUSD: 600,
    status: "customs_clearance",
    date: "2026-02-28",
  },
  {
    id: "B-8803",
    trackingNumber: "COSCO-193810",
    merchantName: "صالح المفلحي",
    companyName: "شركة الرافدين للتجهيزات المنزلية",
    phone: "773445566",
    origin: "الصين (نينغبو)",
    method: "sea",
    volume: "حاوية 20 قدم",
    totalCostUSD: 14200,
    commissionUSD: 950,
    status: "port_origin",
    date: "2026-03-01",
  },
  {
    id: "B-8804",
    trackingNumber: "EK-881920",
    merchantName: "خالد باعباد",
    companyName: "باعباد لقطع الغيار والمحركات",
    phone: "770112244",
    origin: "الإمارات (دبي - جبل علي)",
    method: "air",
    volume: "350 كجم",
    totalCostUSD: 3150,
    commissionUSD: 250,
    status: "delivered",
    date: "2026-02-10",
  },
];

const STATUS_MAP: Record<
  BulkShipmentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  manufacturing: { label: "قيد التجهيز بالمصنع", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  port_origin: { label: "في ميناء التصدير", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  in_transit: { label: "في البحر / الجو (إبحار)", bg: "bg-sky-50", text: "text-[#0284C7]", border: "border-sky-300" },
  customs_clearance: { label: "التخليص الجمركي بالميناء", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  delivered: { label: "تم التسليم للتاجر", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
};

function MerchantReportsPage() {
  const navigate = useNavigate();

  const [cargoList, setCargoList] = useState<BulkCargoItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_bulk_cargo_v1");
      return saved ? JSON.parse(saved) : INITIAL_BULK_CARGO;
    } catch {
      return INITIAL_BULK_CARGO;
    }
  });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newCargo, setNewCargo] = useState({
    merchantName: "",
    companyName: "",
    phone: "",
    origin: "الصين (كوانزو)",
    method: "sea" as "sea" | "air",
    volume: "",
    totalCostUSD: "",
    commissionUSD: "",
    trackingNumber: "",
  });

  const saveCargo = (items: BulkCargoItem[]) => {
    setCargoList(items);
    try {
      localStorage.setItem("alsouk_bulk_cargo_v1", JSON.stringify(items));
    } catch {}
  };

  const filtered = useMemo(() => {
    return cargoList.filter((item) => {
      const matchesSearch =
        item.merchantName.toLowerCase().includes(search.toLowerCase()) ||
        item.companyName.toLowerCase().includes(search.toLowerCase()) ||
        item.trackingNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [cargoList, search, filterStatus]);

  // إحصائيات
  const totalVolumeUSD = cargoList.reduce((acc, c) => acc + c.totalCostUSD, 0);
  const totalCommissionUSD = cargoList.reduce((acc, c) => acc + c.commissionUSD, 0);
  const activeCount = cargoList.filter((c) => c.status !== "delivered").length;
  const merchantsCount = new Set(cargoList.map((c) => c.merchantName)).size;

  const handleAddCargo = () => {
    if (!newCargo.merchantName || !newCargo.trackingNumber) {
      alert("يرجى إدخال اسم التاجر ورقم البوليصة.");
      return;
    }

    const item: BulkCargoItem = {
      id: `B-${Math.floor(8000 + Math.random() * 1000)}`,
      trackingNumber: newCargo.trackingNumber,
      merchantName: newCargo.merchantName,
      companyName: newCargo.companyName || newCargo.merchantName,
      phone: newCargo.phone || "770000000",
      origin: newCargo.origin,
      method: newCargo.method,
      volume: newCargo.volume || "1 CBM",
      totalCostUSD: Number(newCargo.totalCostUSD) || 1000,
      commissionUSD: Number(newCargo.commissionUSD) || 100,
      status: "port_origin",
      date: new Date().toISOString().split("T")[0],
    };

    saveCargo([item, ...cargoList]);
    setIsModalOpen(false);
    setNewCargo({
      merchantName: "",
      companyName: "",
      phone: "",
      origin: "الصين (كوانزو)",
      method: "sea",
      volume: "",
      totalCostUSD: "",
      commissionUSD: "",
      trackingNumber: "",
    });
  };

  const handleStatusChange = (id: string, newStatus: BulkShipmentStatus) => {
    const updated = cargoList.map((c) => (c.id === id ? { ...c, status: newStatus } : c));
    saveCargo(updated);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-slate-800 font-sans pb-16">
      
      {/* 1. الشريط العلوي */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowRight className="size-4" />
              <span>العودة للإدارة</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Store className="size-5 text-[#EA580C]" />
                قسم التاجر والشركاء (استيراد الجملة B2B)
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">متابعة بوالص الشحن الكبيرة، الحاويات، وعمولات الوكلاء</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-xs font-black shadow-sm hover:shadow-orange-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>تسجيل بوليصة جملة</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">

        {/* 2. بطاقات مؤشرات الأداء التجاري */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">إجمالي واردات الجملة</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5">
                ${totalVolumeUSD.toLocaleString()}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-sky-50 text-[#0F4C81] grid place-items-center">
              <Container className="size-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">حاويات وطرود في المسار</div>
              <div className="text-xl sm:text-2xl font-black text-[#0284C7] mt-0.5">
                {activeCount} شحنات
              </div>
            </div>
            <div className="size-10 rounded-xl bg-sky-50 text-[#0284C7] grid place-items-center">
              <Ship className="size-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">صافي عمولات الوساطة</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 mt-0.5">
                +${totalCommissionUSD.toLocaleString()}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <TrendingUp className="size-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">كبار التجار والشركاء</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                {merchantsCount} تجار
              </div>
            </div>
            <div className="size-10 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
              <Users className="size-5" />
            </div>
          </div>
        </div>

        {/* 3. بطاقات شرائح خصومات الجملة للوكلاء */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C81] rounded-3xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black flex items-center gap-2">
              <Percent className="size-4 text-amber-400" />
              شرائح وعمولات استيراد الجملة المعتمدة لدى السوق الشامل
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-sky-200">
              اتفاقيات B2B الرسمية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
              <div className="font-black text-amber-300">🥉 الشريحة الفضية (100 - 500 كجم)</div>
              <div className="text-[11px] text-sky-100 mt-1">خصم 5% على أجور الشحن + عمولة وساطة ثابتة $15 للبوليصة بالكامل.</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
              <div className="font-black text-slate-200">🥈 الشريحة الذهبية (500 - 2000 كجم)</div>
              <div className="text-[11px] text-sky-100 mt-1">خصم 12% على أجور الشحن + أولوية الفحص في موانئ التصدير والمستودعات.</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/15 border border-amber-400/40">
              <div className="font-black text-amber-400">👑 شريحة كبار الوكلاء (حاويات FCL)</div>
              <div className="text-[11px] text-sky-100 mt-1">تخليص جمركي موحد + تسليم الحاوية لمخازن التاجر مباشرة مع تقرير فحص كامل.</div>
            </div>
          </div>
        </div>

        {/* 4. البحث والفلترة */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="size-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث باسم التاجر، المؤسسة، أو رقم البوليصة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pr-9 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-[#0F4C81] outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-bold">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterStatus === "all" ? "bg-[#0F4C81] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({cargoList.length})
            </button>
            <button
              onClick={() => setFilterStatus("in_transit")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterStatus === "in_transit" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
            >
              في المسار
            </button>
            <button
              onClick={() => setFilterStatus("customs_clearance")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterStatus === "customs_clearance" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              الجمارك
            </button>
            <button
              onClick={() => setFilterStatus("delivered")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterStatus === "delivered" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              المستلمة
            </button>
          </div>
        </div>

        {/* 5. جدول بوالص الجملة */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                  <th className="py-3.5 px-4">رقم البوليصة / الكود</th>
                  <th className="py-3.5 px-4">التاجر والمؤسسة</th>
                  <th className="py-3.5 px-4">المصدر ونوع الشحن</th>
                  <th className="py-3.5 px-4">الحجم والوزن</th>
                  <th className="py-3.5 px-4">تكلفة البوليصة والعمولة</th>
                  <th className="py-3.5 px-4">مرحلة البوليصة</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const statusStyle = STATUS_MAP[item.status];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Package className="size-3.5 text-[#EA580C]" />
                          <span>{item.trackingNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.date}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{item.merchantName}</div>
                        <div className="text-[11px] text-slate-500">{item.companyName}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {item.method === "sea" ? (
                            <Ship className="size-3.5 text-cyan-600" />
                          ) : (
                            <Plane className="size-3.5 text-sky-600" />
                          )}
                          <span>{item.origin}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.method === "sea" ? "شحن بحري (حاويات)" : "شحن جوي تجاري"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">
                        {item.volume}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-black text-slate-900">${item.totalCostUSD.toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-600 font-bold">ربح الوساطة: +${item.commissionUSD}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as BulkShipmentStatus)}
                          className={`text-[11px] font-black rounded-lg px-2.5 py-1 border transition cursor-pointer outline-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <option value="manufacturing">قيد التجهيز بالمصنع</option>
                          <option value="port_origin">في ميناء التصدير</option>
                          <option value="in_transit">في البحر / الجو</option>
                          <option value="customs_clearance">التخليص الجمركي</option>
                          <option value="delivered">تم التسليم للتاجر</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`https://wa.me/967${item.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            title="تواصل مع التاجر"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                          <button
                            onClick={() => alert(`بوليصة شحن التاجر: ${item.trackingNumber}\nالحجم: ${item.volume}\nالمصدر: ${item.origin}`)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            title="تفاصيل البوليصة"
                          >
                            <FileText className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* 6. نافذة إضافة بوليصة جملة */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Container className="size-5 text-[#EA580C]" />
                تسجيل بوليصة شحن جملة جديدة
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم التاجر / المالك:</label>
                <input
                  type="text"
                  placeholder="مثال: يحيى المتوكل"
                  value={newCargo.merchantName}
                  onChange={(e) => setNewCargo({ ...newCargo, merchantName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الشركة أو المعرض:</label>
                <input
                  type="text"
                  placeholder="مثال: المتوكل للتجارة والاستيراد"
                  value={newCargo.companyName}
                  onChange={(e) => setNewCargo({ ...newCargo, companyName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم البوليصة (AWB / BL):</label>
                <input
                  type="text"
                  placeholder="مثال: COSCO-881920"
                  value={newCargo.trackingNumber}
                  onChange={(e) => setNewCargo({ ...newCargo, trackingNumber: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب:</label>
                <input
                  type="tel"
                  placeholder="770000000"
                  value={newCargo.phone}
                  onChange={(e) => setNewCargo({ ...newCargo, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة الشحن:</label>
                <select
                  value={newCargo.method}
                  onChange={(e) => setNewCargo({ ...newCargo, method: e.target.value as "sea" | "air" })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-bold text-xs outline-none bg-white focus:border-[#0F4C81]"
                >
                  <option value="sea">شحن بحري (حاويات وكراتين CBM)</option>
                  <option value="air">شحن جوي تجاري سريع</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الحجم أو الوزن التقريبي:</label>
                <input
                  type="text"
                  placeholder="مثال: 5.5 CBM أو 800 كجم"
                  value={newCargo.volume}
                  onChange={(e) => setNewCargo({ ...newCargo, volume: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تكلفة الشحن الإجمالية ($):</label>
                <input
                  type="number"
                  placeholder="مثال: 3200"
                  value={newCargo.totalCostUSD}
                  onChange={(e) => setNewCargo({ ...newCargo, totalCostUSD: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عمولة الوساطة المكتسبة ($):</label>
                <input
                  type="number"
                  placeholder="مثال: 250"
                  value={newCargo.commissionUSD}
                  onChange={(e) => setNewCargo({ ...newCargo, commissionUSD: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:border-[#0F4C81]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddCargo}
                className="px-5 py-2 rounded-xl text-white bg-gradient-to-r from-[#EA580C] to-[#F97316] text-xs font-black transition shadow-sm cursor-pointer"
              >
                حفظ وإدراج البوليصة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const Route = createFileRoute("/merchant-reports")({
  head: () => ({
    meta: [
      { title: "قسم التاجر واستيراد الجملة B2B | السوق الشامل" },
      { name: "description", content: "إدارة بوالص الشحن الكبيرة، الحاويات، واتفاقيات استيراد الجملة للوكلاء والشركاء." },
    ],
  }),
  component: MerchantReportsPage,
});

export default MerchantReportsPage;
