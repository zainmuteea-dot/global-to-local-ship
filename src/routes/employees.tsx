import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowRight,
  UserCog,
  Users,
  ShieldCheck,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Trash2,
  Edit2,
  CheckCircle2,
  DollarSign,
  Truck,
  Headphones,
  Briefcase,
  X,
  BadgeCheck,
} from "lucide-react";

export type StaffRole = "admin" | "finance" | "orders_manager" | "support" | "driver";

export interface EmployeeItem {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  branch: string;
  status: "active" | "away";
  salary?: number;
  joinDate: string;
}

const INITIAL_EMPLOYEES: EmployeeItem[] = [
  {
    id: "EMP-101",
    name: "زين مطيع",
    phone: "770000000",
    role: "admin",
    branch: "الإدارة العامة - صنعاء",
    status: "active",
    salary: 1200,
    joinDate: "2024-01-15",
  },
  {
    id: "EMP-102",
    name: "أحمد الحميري",
    phone: "771234567",
    role: "finance",
    branch: "القسم المالي - صنعاء",
    status: "active",
    salary: 800,
    joinDate: "2024-03-01",
  },
  {
    id: "EMP-103",
    name: "سالم باوزير",
    phone: "773344556",
    role: "orders_manager",
    branch: "مستودع الفرز - عدن",
    status: "active",
    salary: 750,
    joinDate: "2024-05-10",
  },
  {
    id: "EMP-104",
    name: "هدى العبسي",
    phone: "775566778",
    role: "support",
    branch: "خدمة العملاء - أونلاين",
    status: "active",
    salary: 500,
    joinDate: "2024-08-20",
  },
  {
    id: "EMP-105",
    name: "عمر الكندي",
    phone: "779988776",
    role: "driver",
    branch: "مندوب توصيل - صنعاء",
    status: "active",
    salary: 400,
    joinDate: "2025-01-05",
  },
];

const ROLE_INFO: Record<StaffRole, { title: string; color: string; bg: string; border: string }> = {
  admin: { title: "مشرف عام (كل الصلاحيات)", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  finance: { title: "مسؤول مالي ومحاسب", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  orders_manager: { title: "مدير شحنات وفرز", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
  support: { title: "خدمة عملاء ودعم", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  driver: { title: "مندوب توصيل واستلام", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

function EmployeesPage() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeItem[]>(() => {
    try {
      const saved = localStorage.getItem("alsouk_staff_list_v1");
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeItem | null>(null);

  const [form, setForm] = useState<{
    name: string;
    phone: string;
    role: StaffRole;
    branch: string;
    salary: string;
  }>({
    name: "",
    phone: "",
    role: "orders_manager",
    branch: "مستودع الفرز - صنعاء",
    salary: "",
  });

  // حفظ في التخزين المحلي
  const saveEmployees = (updated: EmployeeItem[]) => {
    setEmployees(updated);
    try {
      localStorage.setItem("alsouk_staff_list_v1", JSON.stringify(updated));
    } catch {}
  };

  // تصفية الموظفين
  const filteredList = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.phone.includes(search) ||
        emp.branch.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [employees, search, roleFilter]);

  // إحصائيات
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === "active").length;
  const opsCount = employees.filter((e) => e.role === "orders_manager" || e.role === "driver").length;
  const adminFinanceCount = employees.filter((e) => e.role === "admin" || e.role === "finance").length;

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setForm({
      name: "",
      phone: "",
      role: "orders_manager",
      branch: "مستودع الفرز - صنعاء",
      salary: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingEmp(emp);
    setForm({
      name: emp.name,
      phone: emp.phone,
      role: emp.role,
      branch: emp.branch,
      salary: emp.salary ? String(emp.salary) : "",
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert("يرجى إدخال اسم الموظف ورقم هاتفه.");
      return;
    }

    if (editingEmp) {
      // تعديل
      const updated = employees.map((e) =>
        e.id === editingEmp.id
          ? {
              ...e,
              name: form.name.trim(),
              phone: form.phone.trim(),
              role: form.role,
              branch: form.branch,
              salary: form.salary ? Number(form.salary) : undefined,
            }
          : e
      );
      saveEmployees(updated);
    } else {
      // إضافة جديد
      const newStaff: EmployeeItem = {
        id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        branch: form.branch,
        status: "active",
        salary: form.salary ? Number(form.salary) : undefined,
        joinDate: new Date().toISOString().split("T")[0],
      };
      saveEmployees([newStaff, ...employees]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الموظف (${name}) من النظام؟`)) {
      saveEmployees(employees.filter((e) => e.id !== id));
    }
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
                <UserCog className="size-5 text-[#0F4C81]" />
                الموارد البشرية والصلاحيات
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">طاقم العمل وتوزيع المهام والأدوار</p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-xs font-black shadow-sm hover:shadow-orange-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        
        {/* 2. بطاقات KPI للإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">إجمالي طاقم العمل</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</div>
            </div>
            <div className="size-10 rounded-xl bg-sky-50 text-[#0F4C81] grid place-items-center">
              <Users className="size-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">موظفون نشطون الآن</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{activeCount}</div>
            </div>
            <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <CheckCircle2 className="size-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">العمليات والمناديب</div>
              <div className="text-2xl font-black text-[#EA580C] mt-0.5">{opsCount}</div>
            </div>
            <div className="size-10 rounded-xl bg-orange-50 text-[#EA580C] grid place-items-center">
              <Truck className="size-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500">الإدارة والمالية</div>
              <div className="text-2xl font-black text-purple-700 mt-0.5">{adminFinanceCount}</div>
            </div>
            <div className="size-10 rounded-xl bg-purple-50 text-purple-700 grid place-items-center">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        </div>

        {/* 3. شريط البحث والفلترة */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="size-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم، رقم الهاتف، أو الفرع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pr-9 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-[#0F4C81] outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-bold">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                roleFilter === "all" ? "bg-[#0F4C81] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({employees.length})
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                roleFilter === "admin" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              مشرفين
            </button>
            <button
              onClick={() => setRoleFilter("finance")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                roleFilter === "finance" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              مالية
            </button>
            <button
              onClick={() => setRoleFilter("orders_manager")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                roleFilter === "orders_manager" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
            >
              عمليات
            </button>
            <button
              onClick={() => setRoleFilter("driver")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                roleFilter === "driver" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              مناديب
            </button>
          </div>
        </div>

        {/* 4. جدول الموظفين */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                  <th className="py-3.5 px-4">الموظف</th>
                  <th className="py-3.5 px-4">الدور والصلاحية</th>
                  <th className="py-3.5 px-4">الفرع / القسم</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((emp) => {
                  const roleStyle = ROLE_INFO[emp.role];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-slate-100 text-[#0F4C81] grid place-items-center font-black text-xs border border-slate-200">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{emp.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.id} • انضم {emp.joinDate}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black border ${roleStyle.bg} ${roleStyle.color} ${roleStyle.border}`}>
                          <BadgeCheck className="size-3" />
                          {roleStyle.title}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {emp.branch}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {emp.phone}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          نشط
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`https://wa.me/967${emp.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            title="واتساب الموظف"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="size-3.5" />
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

      {/* 5. نافذة منبثقة لإضافة أو تعديل موظف */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCog className="size-5 text-[#EA580C]" />
                {editingEmp ? "تعديل بيانات وصلاحية موظف" : "إضافة موظف جديد إلى الطاقم"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الموظف الرباعي:</label>
                <input
                  type="text"
                  placeholder="مثال: محمد عبدالله الشامي"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب:</label>
                <input
                  type="tel"
                  placeholder="770000000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الدور الوظيفي والصلاحيات:</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-bold text-xs outline-none bg-white focus:border-[#0F4C81]"
                >
                  <option value="admin">مشرف عام (كامل الصلاحيات والإعدادات)</option>
                  <option value="finance">مسؤول مالي (الخزائن والسندات والتسعير)</option>
                  <option value="orders_manager">مدير شحنات وفرز (تحديث الحالات والطرود)</option>
                  <option value="support">خدمة عملاء (تواصل ومتابعة تذاكر)</option>
                  <option value="driver">مندوب توصيل ميداني (تسليم الطرود)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الفرع أو القسم:</label>
                <input
                  type="text"
                  placeholder="مثال: مستودع الفرز - صنعاء أو فرع عدن"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الراتب الشهري التقديري ($):</label>
                <input
                  type="number"
                  placeholder="مثال: 600"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:border-[#0F4C81]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-white bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-xs font-black transition shadow-sm cursor-pointer"
              >
                {editingEmp ? "حفظ التعديلات" : "إضافة الموظف فوراً"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "إدارة الموظفين والصلاحيات | السوق الشامل" },
      { name: "description", content: "إدارة طاقم العمل، الصلاحيات، الرواتب، وتوزيع المهام في منظومة السوق الشامل." },
    ],
  }),
  component: EmployeesPage,
});

export default EmployeesPage;
