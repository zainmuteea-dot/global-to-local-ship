import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", role: "", salary: "" });

  useEffect(() => {
    const role = sessionStorage.getItem("sc_role");
    if (role!== "employee") navigate({ to: "/login" });
    setList(JSON.parse(localStorage.getItem("sc_employees") || "[]"));
  }, [navigate]);

  const save = (d: any[]) => {
    setList(d);
    localStorage.setItem("sc_employees", JSON.stringify(d));
  };

  const add = () => {
    if (!form.name) return alert("أدخل اسم الموظف");
    save([{ id: Date.now(),...form, salary: Number(form.salary || 0) },...list]);
    setForm({ name: "", phone: "", role: "", salary: "" });
  };

  const del = (id: number) => {
    if (!confirm("حذف الموظف؟")) return;
    save(list.filter(x => x.id!== id));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#3d2314]">👥 الموظفين</h1>
            <p className="text-sm text-[#8a7a65]">إدارة بيانات الموظفين والرواتب</p>
          </div>
          <button onClick={() => navigate({ to: "/admin" })} className="text-sm font-bold text-[#8a7a65]">← رجوع للإدارة</button>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-[#ede5d8] mb-6">
          <h3 className="font-extrabold text-[#3d2314] mb-4">موظف جديد</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input placeholder="الاسم" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input placeholder="الجوال" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input placeholder="المسمى الوظيفي" value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <input type="number" placeholder="الراتب" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className="h-11 px-3 rounded-xl border border-[#e8ded0] text-sm" />
            <button onClick={add} className="h-11 rounded-xl bg-[#3d2314] text-white font-bold text-sm">إضافة</button>
          </div>
        </div>

        <div className="space-y-3">
          {list.map(emp => (
            <div key={emp.id} className="bg-white rounded-2xl p-4 border border-[#ede5d8] flex justify-between items-center">
              <div>
                <div className="font-bold text-[#3d2314] text-sm">{emp.name}</div>
                <div className="text-xs text-[#8a7a65] mt-1">{emp.role} • {emp.phone} • راتب: {emp.salary}</div>
              </div>
              <button onClick={() => del(emp.id)} className="text-red-500 text-xs font-bold">حذف</button>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-[#8a7a65] text-sm py-8">لا يوجد موظفين بعد</p>}
        </div>
      </div>
    </div>
  );
}
