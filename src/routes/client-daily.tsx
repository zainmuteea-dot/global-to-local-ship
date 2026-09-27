import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/client-daily")({
  component: ClientDailyPage,
});

function ClientDailyPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [form, setForm] = useState({ client: "", type: "قبض", amount: "", note: "", date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const role = sessionStorage.getItem("sc_role");
    if (role!== "employee") navigate({ to: "/login" });
    const saved = JSON.parse(localStorage.getItem("sc_client_daily") || "[]");
    setEntries(saved);
  }, [navigate]);

  const save = (data: any[]) => {
    setEntries(data);
    localStorage.setItem("sc_client_daily", JSON.stringify(data));
  };

  const addEntry = () => {
    if (!form.client ||!form.amount) return alert("أكمل اسم العميل والمبلغ");
    const newEntry = { id: Date.now(),...form, amount: Number(form.amount) };
    save([newEntry,...entries]);
    setForm({ client: "", type: "قبض", amount: "", note: "", date: new Date().toISOString().split('T')[0] });
  };

  const del = (id: number) => {
    if (!confirm("حذف القيد؟")) return;
    save(entries.filter(e => e.id!== id));
  };

  const totalIn = entries.filter(e => e.type === "قبض").reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter(e => e.type === "صرف").reduce((s, e) => s + e.amount, 0);

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#3d2314]">📒 يوميات العملاء</h1>
            <p className="text-sm text-[#8a7a65]">حركات القبض والصرف اليومية</p>
          </div>
          <button onClick={() => navigate({ to: "/admin" })} className="text-sm font-bold text-[#8a7a65] hover:text-[#3d2314]">← رجوع للإدارة</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-xs text-green-700 font-bold">إجمالي القبض</div>
            <div className="text-xl font-extrabold text-green-800">{totalIn}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <div className="text-xs text-red-700 font-bold">إجمالي الصرف</div>
            <div className="text-xl font-extrabold text-red-800">{totalOut}</div>
          </div>
          <div className="bg-white border border-[#ede5d8] rounded-2xl p-4 text-center">
            <div className="text-xs text-[#8a7a65] font-bold">الصافي</div>
            <div className="text-xl font-extrabold text-[#3d2314]">{totalIn - totalOut}</div>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-[#ede5d8] mb-6">
          <h3 className="font-extrabold text-[#3d2314] mb-4">قيد جديد</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input placeholder="اسم العميل" value={form.client} onChange={e => setForm({...form, client: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm">
              <option>قبض</option>
              <option>صرف</option>
            </select>
            <input type="number" placeholder="المبلغ" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input placeholder="ملاحظة" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
          </div>
          <button onClick={addEntry} className="mt-4 w-full h-11 rounded-xl bg-[#3d2314] text-white font-bold text-sm hover:bg-[#2b170c]">إضافة القيد</button>
        </div>

        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="bg-white rounded-2xl p-4 border border-[#ede5d8] flex justify-between items-center">
              <div>
                <div className="font-bold text-[#3d2314] text-sm">{e.client} <span className={`text-xs px-2 py-0.5 rounded-full ${e.type === 'قبض'? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.type}</span></div>
                <div className="text-xs text-[#8a7a65] mt-1">{e.date} {e.note && `• ${e.note}`}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-extrabold text-[#3d2314]">{e.amount}</div>
                <button onClick={() => del(e.id)} className="text-red-500 text-xs font-bold">حذف</button>
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-center text-[#8a7a65] text-sm py-8">لا توجد قيود بعد</p>}
        </div>
      </div>
    </div>
  );
}
