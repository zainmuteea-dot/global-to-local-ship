import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  ArrowRight, Search, Printer, Share2, Calendar, 
  FileText, ArrowDownLeft, ArrowUpRight, DollarSign, 
  TrendingUp, Wallet, CheckCircle2, Clock, AlertCircle,
  Phone, User, Package
} from "lucide-react";

export const Route = createFileRoute('/client-reports')({
  component: ClientReportsPage,
});

// بيانات نموذجية للعملاء وحركاتهم المالية
interface Transaction {
  id: string;
  date: string;
  refNo: string;
  type: "شراء وتوريد" | "سند قبض" | "شحن وتخليص" | "عمولة وسيط" | "استرداد";
  description: string;
  debit: number;   // مدين (مستحق على العميل)
  credit: number;  // دائن (مدفوع من العميل)
  currency: "USD" | "SAR" | "YER";
  status: "مكتمل" | "معلق" | "قيد المراجعة";
}

interface ClientData {
  id: string;
  name: string;
  phone: string;
  city: string;
  joinDate: string;
  totalOrders: number;
  balanceUSD: number; // الرصيد المتبقي (مدين - دائن)
  balanceYER: number;
  transactions: Transaction[];
}

const INITIAL_CLIENTS: ClientData[] = [
  {
    id: "CL-8801",
    name: "محمد عبد الله الأصبحي",
    phone: "777123456",
    city: "صنعاء - حدة",
    joinDate: "2026-01-15",
    totalOrders: 14,
    balanceUSD: 85,
    balanceYER: 45000,
    transactions: [
      { id: "TX-101", date: "2026-03-28", refNo: "SQ-800816", type: "شراء وتوريد", description: "شراء منتجات SHEIN + شحن جوي سريع", debit: 220, credit: 0, currency: "USD", status: "مكتمل" },
      { id: "TX-102", date: "2026-03-29", refNo: "RC-3021", type: "سند قبض", description: "دفعة مقدمة نقدية عبر الكريمي", debit: 0, credit: 150, currency: "USD", status: "مكتمل" },
      { id: "TX-103", date: "2026-04-01", refNo: "SQ-800955", type: "شراء وتوريد", description: "طلب عطور من Trendyol تركيا", debit: 65, credit: 0, currency: "USD", status: "مكتمل" },
      { id: "TX-104", date: "2026-04-02", refNo: "RC-3045", type: "سند قبض", description: "حوالة بنكية سداد جزئي", debit: 0, credit: 50, currency: "USD", status: "مكتمل" },
      { id: "TX-105", date: "2026-04-03", refNo: "DL-1120", type: "شحن وتخليص", description: "رسوم توصيل منزلي صنعاء", debit: 0, credit: 0, currency: "USD", status: "مكتمل" }
    ]
  },
  {
    id: "CL-8802",
    name: "سارة خالد القاسمي",
    phone: "733987654",
    city: "عدن - المنصورة",
    joinDate: "2026-02-10",
    totalOrders: 6,
    balanceUSD: 0,
    balanceYER: 0,
    transactions: [
      { id: "TX-201", date: "2026-03-15", refNo: "SQ-799201", type: "شراء وتوريد", description: "ملابس أطفال TEMU", debit: 110, credit: 0, currency: "USD", status: "مكتمل" },
      { id: "TX-202", date: "2026-03-15", refNo: "RC-2890", type: "سند قبض", description: "سداد كامل كاش عند الاستلام", debit: 0, credit: 110, currency: "USD", status: "مكتمل" }
    ]
  },
  {
    id: "CL-8803",
    name: "مؤسسة الأفق للتجارة (جملة)",
    phone: "711554433",
    city: "تعز - الحوبان",
    joinDate: "2025-11-20",
    totalOrders: 42,
    balanceUSD: 540,
    balanceYER: 290000,
    transactions: [
      { id: "TX-301", date: "2026-03-20", refNo: "SQ-800112", type: "شراء وتوريد", description: "بوليصة هواتف وملحقات من علي بابا", debit: 1850, credit: 0, currency: "USD", status: "مكتمل" },
      { id: "TX-302", date: "2026-03-21", refNo: "RC-2911", type: "سند قبض", description: "تحويل تجاري مصرف النجم", debit: 0, credit: 1500, currency: "USD", status: "مكتمل" },
      { id: "TX-303", date: "2026-03-25", refNo: "SQ-800340", type: "شحن وتخليص", description: "تخليص جمركي وأجور شحن بحري كراتين 4", debit: 190, credit: 0, currency: "USD", status: "مكتمل" }
    ]
  }
];

export default function ClientReportsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("CL-8801");
  const [dateFilter, setDateFilter] = useState("all");

  const selectedClient = useMemo(() => {
    return INITIAL_CLIENTS.find(c => c.id === selectedClientId) || INITIAL_CLIENTS[0];
  }, [selectedClientId]);

  // تصفية العملاء في شريط البحث
  const filteredClients = useMemo(() => {
    if (!search.trim()) return INITIAL_CLIENTS;
    return INITIAL_CLIENTS.filter(c => 
      c.name.includes(search) || 
      c.phone.includes(search) || 
      c.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // حساب المجاميع المالية للعميل المحدد
  const totals = useMemo(() => {
    const totalDebit = selectedClient.transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = selectedClient.transactions.reduce((sum, t) => sum + t.credit, 0);
    const netBalance = totalDebit - totalCredit;
    return { totalDebit, totalCredit, netBalance };
  }, [selectedClient]);

  // إرسال كشف الحساب عبر الواتساب للعميل
  const handleWhatsAppShare = () => {
    const text = `السلام عليكم أخي/أختي ${selectedClient.name}،\nكشف حسابك لدى *السوق الشامل*:\n- إجمالي العمليات: ${totals.totalDebit} $\n- إجمالي المدفوع: ${totals.totalCredit} $\n- المتبقي الواجب سداده: ${totals.netBalance} $\n\nشكراً لتعاملك معنا!`;
    const cleanPhone = selectedClient.phone.startsWith("967") ? selectedClient.phone : `967${selectedClient.phone.replace(/^0+/, "")}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 md:p-8 font-['Cairo',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* الترويسة وأزرار الرجوع والطباعة */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate({ to: "/admin" })}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#0F4C81] flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#F97316]" />
                تقارير وكشوفات حساب العملاء
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">سجل الحركات المالية، المديونيات، وسندات القبض لكل عميل</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition"
            >
              <Share2 className="w-4 h-4" />
              مشاركة بالواتساب
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-sm shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              طباعة الكشف الرسمي
            </button>
          </div>
        </div>

        {/* شريط اختيار والبحث عن العميل */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="ابحث باسم العميل أو رقم الهاتف أو كود العميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pr-12 pl-4 rounded-xl bg-white border border-slate-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium shadow-sm"
            />
          </div>

          <div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#0F4C81] outline-none text-sm font-bold text-[#0F4C81] shadow-sm"
            >
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) - {c.phone}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* بطاقة بيانات العميل المختار */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-sky-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              {selectedClient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{selectedClient.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-[#0F4C81] font-bold">{selectedClient.id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedClient.phone}</span>
                <span>•</span>
                <span>{selectedClient.city}</span>
                <span>•</span>
                <span>عميل منذ: {selectedClient.joinDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
            <Package className="w-4 h-4 text-[#F97316]" />
            <span className="text-slate-600">إجمالي الشحنات:</span>
            <span className="font-black text-slate-900">{selectedClient.totalOrders} شحنة</span>
          </div>
        </div>

        {/* بطاقات المؤشرات المالية للعميل (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-bold">إجمالي المطالبات (مدين)</span>
              <ArrowDownLeft className="w-5 h-5 bg-rose-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-slate-900">${totals.totalDebit.toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-1">تكلفة الشراء والشحن والجمارك</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold">إجمالي المدفوعات (دائن)</span>
              <ArrowUpRight className="w-5 h-5 bg-emerald-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-slate-900">${totals.totalCredit.toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-1">سندات القبض والدفعات المستلمة</p>
          </div>

          <div className={`p-5 rounded-2xl border shadow-sm ${totals.netBalance > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">الرصيد المتبقي (مستحق السداد)</span>
              <Wallet className="w-5 h-5 text-[#F97316]" />
            </div>
            <div className={`text-2xl font-black ${totals.netBalance > 0 ? 'text-[#F97316]' : 'text-emerald-700'}`}>
              ${totals.netBalance.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {totals.netBalance > 0 ? "يستحق التحصيل من العميل عند التسليم" : "الحساب مسدد بالكامل ولا توجد ذمم"}
            </p>
          </div>
        </div>

        {/* جدول كشف الحساب التفصيلي */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h3 className="font-black text-[#0F4C81] text-sm md:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F97316]" />
              كشف الحساب التفصيلي للعمليات
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {selectedClient.transactions.length} حركات مسجلة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#0F4C81]/5 text-[#0F4C81] text-xs font-bold border-b border-sky-100">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">المرجع</th>
                  <th className="py-3 px-4">نوع الحركة</th>
                  <th className="py-3 px-4">البيان / الوصف</th>
                  <th className="py-3 px-4 text-center">مدين (+)</th>
                  <th className="py-3 px-4 text-center">دائن (-)</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {selectedClient.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 text-xs text-slate-600">{tx.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded">
                        {tx.refNo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        tx.type === 'سند قبض' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 text-xs md:text-sm">{tx.description}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                      {tx.debit > 0 ? `$${tx.debit}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {tx.credit > 0 ? `$${tx.credit}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
