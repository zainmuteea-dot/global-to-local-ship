import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  PlusCircle,
  Printer,
  Trash2,
  CheckSquare,
  Smartphone,
  Users,
  DollarSign,
  Ban,
  ArrowRight,
  Check,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/admin-clients")({
  head: () => ({
    meta: [
      { title: "العملاء | السوق الشامل" },
      { name: "description", content: "إدارة وعرض العملاء المسجلين" },
    ],
  }),
  component: AdminClientsPage,
});

interface ClientRow {
  id: string | number;
  code: string;
  name: string;
  shopName: string;
  phone: string;
  city: string;
  status: string;
  groupName: string;
  commissionGroup: string;
  hasDevice: boolean;
  operationsCount: number;
  insuranceAmount: number;
  loanAmount: number;
  agent: string;
  balance: number;
  isOnline: boolean;
  currency: string;
  appVersion: string;
}

const INITIAL_CLIENTS: ClientRow[] = [
  {
    id: 1, code: "28750", name: "حافظ توفيق عبده قائد البحري", shopName: "موظف",
    phone: "714322851", city: "شبوه", status: "فعال",
    groupName: "تم ترقيتك الى مستوى VIP مستوى اول", commissionGroup: "عمولة أ",
    hasDevice: true, operationsCount: 0, insuranceAmount: 0, loanAmount: 0,
    agent: "المركز الرئيسي", balance: 0, isOnline: false, currency: "ريال يمني", appVersion: "915",
  },
  {
    id: 2, code: "28751", name: "صالح محمد أحمد اليافعي", shopName: "متجر الأناقة",
    phone: "771234567", city: "عدن", status: "فعال",
    groupName: "مستوى VIP مميز", commissionGroup: "عمولة أ",
    hasDevice: true, operationsCount: 14, insuranceAmount: 50000, loanAmount: 0,
    agent: "وكيل عدن", balance: 12500, isOnline: true, currency: "ريال يمني", appVersion: "915",
  },
];

function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>(INITIAL_CLIENTS);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("صنعاء");
  const [newShop, setNewShop] = useState("");

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
         .from("profiles")
         .select("id, full_name, phone, created_at")
         .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          const mapped: ClientRow[] = data.map((p: any, idx: number) => ({
            id: p.id, code: String(28760 + idx),
            name: p.full_name || "عميل غير مسمى", shopName: "فردي",
            phone: p.phone || "---", city: "اليمن", status: "فعال",
            groupName: "عميل مسجل جديد", commissionGroup: "افتراضي",
            hasDevice: true, operationsCount: 0, insuranceAmount: 0, loanAmount: 0,
            agent: "المركز الرئيسي", balance: 0, isOnline: true,
            currency: "ريال يمني", appVersion: "915",
          }));
          setClients([...mapped,...INITIAL_CLIENTS]);
        }
      } catch (err) { console.error(err); }
    }
    fetchProfiles();
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) ||
      c.code.includes(q) || c.city.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const toggleSelectAll = () => {
    const next =!selectAll;
    setSelectAll(next);
    const updated: Record<string, boolean> = {};
    if (next) filteredClients.forEach((c) => { updated[c.code] = true; });
    setSelectedIds(updated);
  };

  const toggleRow = (code: string) => {
    setSelectedIds((prev) => ({...prev, [code]:!prev[code] }));
  };

  const handleAddClient = () => {
    if (!newName.trim() ||!newPhone.trim()) {
      alert("يرجى إدخال اسم العميل ورقم الهاتف");
      return;
    }
    const newEntry: ClientRow = {
      id: Date.now(), code: String(Math.floor(28000 + Math.random() * 2000)),
      name: newName.trim(), shopName: newShop.trim() || "موظف",
      phone: newPhone.trim(), city: newCity, status: "فعال",
      groupName: "عميل جديد", commissionGroup: "افتراضي",
      hasDevice: true, operationsCount: 0, insuranceAmount: 0, loanAmount: 0,
      agent: "المركز الرئيسي", balance: 0, isOnline: true,
      currency: "ريال يمني", appVersion: "915",
    };
    setClients([newEntry,...clients]);
    setNewName(""); setNewPhone(""); setNewShop("");
    setShowAddModal(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3f4f6] text-[#222] font-sans antialiased select-none">
      <header className="bg-[#b91c1c] text-white px-3 py-2 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-xs transition">
              <ArrowRight className="w-4 h-4" /><span>لوحة الإدارة</span>
            </Link>
            <h1 className="text-xl font-bold tracking-wide">العملاء</h1>
          </div>
          <div className="flex-1 max-w-md min-w-[240px]">
            <div className="relative">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في البيانات..."
                className="w-full h-8 pr-8 pl-3 text-xs text-gray-900 bg-white rounded border border-red-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-white" />
              <Search className="w-4 h-4 text-gray-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/95">
            <button onClick={toggleSelectAll} title="تحديد الكل" className="p-1 hover:bg-black/15 rounded transition"><CheckSquare className="w-4 h-4" /></button>
            <button onClick={() => {
                const count = Object.values(selectedIds).filter(Boolean).length;
                if (count === 0) alert("حدد عملاء للحذف أولاً");
                else if (confirm(`هل أنت متأكد من حذف ${count} عميل؟`)) {
                  setClients((prev) => prev.filter((c) =>!selectedIds[c.code]));
                  setSelectedIds({});
                }
              }} title="حذف المحدد" className="p-1 hover:bg-black/15 rounded transition"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => window.print()} title="طباعة الكشف" className="p-1 hover:bg-black/15 rounded transition"><Printer className="w-4 h-4" /></button>
            <button onClick={() => setShowAddModal(true)} title="إضافة عميل جديد" className="p-1 bg-white/20 hover:bg-white/30 rounded transition flex items-center gap-1 text-xs font-semibold px-2">
              <PlusCircle className="w-4 h-4 text-white" /><span>إضافة</span>
            </button>
            <button onClick={() => setSearch("")} title="تحديث البيانات" className="p-1 hover:bg-black/15 rounded transition"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="bg-[#dbeafe] border-b border-blue-200 px-4 py-1 text-xs font-bold text-gray-800 flex justify-between items-center">
        <span>العدد: {filteredClients.length}</span>
        {Object.values(selectedIds).filter(Boolean).length > 0 && (
          <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded text-[11px]">
            المحدد: {Object.values(selectedIds).filter(Boolean).length}
          </span>
        )}
      </div>

      <div className="overflow-x-auto border-b border-gray-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-[11px] text-right whitespace-nowrap">
          <thead>
            <tr className="bg-[#d4e6f6] text-gray-900 font-bold border-b border-[#a9c7e4]">
              <th className="p-1.5 border-l border-[#c0d8ef] text-center w-8">
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="cursor-pointer" />
              </th>
              <th className="p-1.5 border-l border-[#c0d8ef]">الرقم</th>
              <th className="p-1.5 border-l border-[#c0d8ef]">الاسم</th>
              <th className="p-1.5 border-l border-[#c0d8ef]">اسم المحل</th>
              <th className="p-1.5 border-l border-[#c0d8ef]">رقم التلفون</th>
              <th className="p-1.5 border-l border-[#c0d8ef]">العنوان</th>
              <th className="p-1.5 border-l border-[#c0d8ef]">الحالة</th>
              <th className="p-1.5 border-l border-[#c0d8ef]">المجموعة</th>
              <th className="p-1.5 text-center">المزيد</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c, i) => {
              const isSelected =!!selectedIds[c.code];
              return (
                <tr key={c.code + i} className={`border-b border-gray-200 hover:bg-[#eaf3fc] transition ${isSelected? "bg-[#dbeafe]" : i % 2 === 0? "bg-white" : "bg-[#f9fafb]"}`}>
                  <td className="p-1.5 border-l border-gray-200 text-center">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleRow(c.code)} className="cursor-pointer" />
                  </td>
                  <td className="p-1.5 border-l border-gray-200 font-mono font-bold text-gray-700">{c.code}</td>
                  <td className="p-1.5 border-l border-gray-200 font-bold text-gray-900">{c.name}</td>
                  <td className="p-1.5 border-l border-gray-200 text-gray-600">{c.shopName}</td>
                  <td className="p-1.5 border-l border-gray-200 font-mono text-gray-800">{c.phone}</td>
                  <td className="p-1.5 border-l border-gray-200">{c.city}</td>
                  <td className="p-1.5 border-l border-gray-200">
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">{c.status}</span>
                  </td>
                  <td className="p-1.5 border-l border-gray-200 text-blue-900 font-medium">{c.groupName}</td>
                  <td className="p-1.5 text-center">
                    <button onClick={() => alert(`عرض ملف العميل: ${c.name}`)} className="text-blue-700 hover:underline font-bold text-[10px]">عرض</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-red-600" /><span>إضافة عميل جديد للنظام</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">اسم العميل *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: أحمد محمد علي" className="w-full h-8 px-2 border rounded focus:ring-1 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">رقم الهاتف *</label>
                <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="771234567" className="w-full h-8 px-2 border rounded font-mono focus:ring-1 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">اسم المحل</label>
                <input type="text" value={newShop} onChange={(e) => setNewShop(e.target.value)} placeholder="موظف / تاجر" className="w-full h-8 px-2 border rounded focus:ring-1 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">المدينة</label>
                <select value={newCity} onChange={(e) => setNewCity(e.target.value)} className="w-full h-8 px-2 border rounded bg-white outline-none">
                  <option>صنعاء</option><option>عدن</option><option>تعز</option><option>إب</option><option>حضرموت</option><option>الحديدة</option><option>شبوه</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">إلغاء</button>
              <button onClick={handleAddClient} className="px-4 py-1.5 text-xs bg-[#b91c1c] hover:bg-red-800 text-white font-bold rounded shadow">حفظ العميل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
