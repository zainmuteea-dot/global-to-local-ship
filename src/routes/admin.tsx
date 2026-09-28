import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const cards = [
  { title: "الموظفين", desc: "لإدارة بيانات الموظفين وترقيتهم", href: "/employees", icon: "👥" },
  { title: "العملاء", desc: "عرض العملاء المسجلين", href: "/admin-clients", icon: "🧑‍💼" },
  { title: "مبالغ التأمين", desc: "تفعيل وإضافة مبالغ التأمين", href: "/insurance-amounts", icon: "🛡️" },
  { title: "يوميات العملاء", desc: "كشوف وحركات العملاء اليومية", href: "/client-daily", icon: "📒" },
  { title: "الحسابات", desc: "لإدارة الحسابات المالية", href: "/accounts", icon: "💰" },
  { title: "الأسعار", desc: "لإدارة أسعار الشحن والخدمات", href: "/prices", icon: "🏷️" },
  { title: "المخازن", desc: "إدارة المخازن وعناوين التخزين", href: "/warehouses", icon: "📦" },
  { title: "خطوات الرئيسية", desc: "لإدارة بطاقات الخطوات الخمس", href: "/admin-steps", icon: "🚀" },
];

function AdminPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#faf8f2] p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black text-cocoadeep mb-2">لوحة الإدارة</h1>
        <p className="text-sm text-muted-foreground mb-6">إدارة جميع أقسام الموقع</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              to={c.href}
              className="rounded-2xl bg-white p-5 ring-1 ring-border hover:ring-cocoa transition shadow-sm"
            >
              <div className="text-3xl mb-3">{c.icon}</div>
              <h2 className="font-bold text-lg mb-1">{c.title}</h2>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
