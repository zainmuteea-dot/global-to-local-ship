import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", number: "", balance: "" });

  useEffect(() => {
    const role = sessionStorage.getItem("sc_role");
    if (role!== "employee") navigate({ to: "/login" });
    const saved = JSON.parse(localStorage.getItem("sc_accounts") || "[]");
    setAccounts(saved);
  }, [navigate]);

  const save = (data: any[]) => {
    setAccounts(data);
    localStorage.setItem("sc_accounts", JSON.stringify(data));
  };

  const add = () => {
    if (!form.name) return alert("أدخل اسم الحساب");
    save([{ id: Date.now(),...form, balance: Number(form.balance || 0) },...accounts]);
    setForm({ name: "", number: "", balance: "" });
  };

  const del = (id: number) => {
    if (!confirm("حذف الحساب؟")) return;
    save(accounts.filter(a => a.id!== id));
  };

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#3d2314]">💰 الحسابات</h1>
            <p className="text-sm text-[#8a7a65]">إجمالي الأرصدة: <span className="font-extrabold text-[#3d2314]">{total}</span></p>
          </div>
          <button onClick={() => navigate({ to: "/admin" })} className="text-sm font-bold text-[#8a7a65]">← رجوع للإدارة</button>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-[#ede5d8] mb-6">
          <h3 className="font-extrabold text-[#3d2314] mb-4">حساب جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="اسم الحساب" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input placeholder="رقم الحساب" value={form.number} onChange={e => setForm({...form, number: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input type="number" placeholder="الرصيد الافتتاحي" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <button onClick={add} className="h-11 rounded-xl bg-[#3d2314] text-white font-bold text-sm">إضافة</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-5 border border-[#ede5d8]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-extrabold text-[#3d2314]">{a.name}</div>
                  <div className="text-xs text-[#8a7a65] mt-1">{a.number}</div>
                </div>
                <button onClick={() => del(a.id)} className="text-red-500 text-xs font-bold">حذف</button>
              </div>
              <div className="mt-4 text-2xl font-extrabold text-[#3d2314]">{a.balance}</div>
            </div>
          ))}
        </div>
        {accounts.length === 0 && <p className="text-center text-[#8a7a65] text-sm py-8">لا توجد حسابات بعد</p>}
      </div>
    </div>
  );
}
