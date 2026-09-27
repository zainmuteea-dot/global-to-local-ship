import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = sessionStorage.getItem("sc_role");
    if (role!== "employee") {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate({ to: "/login" });
  };

  const cards = [
    { title: "الموظفين", desc: "لإدارة بيانات الموظفين والرواتب", href: "/employees", icon: "👥" },
    { title: "مبالغ التأمين", desc: "تسجيل ومتابعة مبالغ التأمين", href: "/insurance-amounts", icon: "🛡️" },
    { title: "يوميات العملاء", desc: "حركات وعمليات العملاء اليومية", href: "/client-daily", icon: "📒" },
    { title: "الحسابات", desc: "إدارة الحسابات المالية", href: "/accounts", icon: "💰" },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <div className="flex justify-between items-center max-w-6xl mb-6 mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3d2314]">لوحة الإدارة - موظفين</h1>
          <p className="text-sm text-[#8a7a65]">خاص بموظفي السوق الشامل فقط</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 h-10 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-200 hover:bg-red-100"
        >
          تسجيل خروج
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {cards.map((c) => (
          <Link
            key={c.href}
            to={c.href}
            className="bg-white rounded-[24px] p-6 border border-[#ede5d8] hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="text-4xl mb-3">{c.icon}</div>
            <h3 className="font-extrabold text-[#3d2314] mb-1">{c.title}</h3>
            <p className="text-xs text-[#8a7a65]">{c.desc}</p>
            <div className="mt-4 text-sm font-bold text-[#3d2314]">دخول ←</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
