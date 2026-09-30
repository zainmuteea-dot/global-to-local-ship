import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة العمليات والإدارة | السوق الشامل AL SHAMEL" },
      { name: "description", content: "لوحة عمليات الشحن والفرز وإدارة الطلبات والعملاء لمنظومة السوق الشامل." },
    ],
  }),
  component: AdminRoutePage,
});

export function AdminRoutePage() {
  const cards = [
    { to: "/admin-clients", title: "العملاء", desc: "إدارة وعرض العملاء المسجلين" },
    { to: "/dashboard", title: "لوحة المتابعة", desc: "متابعة الشحنات والعمليات" },
    { to: "/customers", title: "الزبائن", desc: "قائمة الزبائن" },
    { to: "/employees", title: "الموظفين", desc: "إدارة الموظفين" },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-[#0F4C81] mb-2">لوحة الإدارة</h1>
        <p className="text-sm text-slate-600 mb-8">السوق الشامل — إدارة العمليات والطلبات والعملاء</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <h2 className="font-bold text-[#0F4C81] mb-1">{c.title}</h2>
              <p className="text-xs text-slate-500">{c.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link to="/" className="text-xs font-bold text-[#0284C7] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminRoutePage;
