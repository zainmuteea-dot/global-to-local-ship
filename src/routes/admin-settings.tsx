import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CircleDollarSign,
  ExternalLink,
  LayoutDashboard,
  PackageSearch,
  Store,
  Truck,
  UserCog,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

export const Route = createFileRoute("/admin-settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الإدارة | السوق الشامل" },
      { name: "description", content: "إعدادات لوحة إدارة السوق الشامل: الموظفون، المتاجر، طرق الدفع والإشعارات." },
      { property: "og:title", content: "إعدادات الإدارة | السوق الشامل" },
      { property: "og:description", content: "إدارة إعدادات الموظفين والمتاجر وطرق الدفع والإشعارات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminRouteGuard allowStaff redirectTo="/admin-settings">
      <AdminSettingsPage />
    </AdminRouteGuard>
  ),
});

const SECTIONS = [
  {
    href: "/employees",
    icon: UserCog,
    title: "الموظفون والصلاحيات",
    text: "إضافة حسابات الموظفين وتعديل أدوارهم وصلاحياتهم.",
  },
  {
    href: "/products/manage",
    icon: Store,
    title: "بوابات المتاجر والروابط",
    text: "شعارات المتاجر ورابط علي إكسبريس الظاهر للعملاء.",
  },
  {
    href: "/admin/offers",
    icon: PackageSearch,
    title: "العروض والتخفيضات",
    text: "إضافة العروض الحصرية والتخفيضات وتعديلها.",
  },
  {
    href: "/payments",
    icon: CircleDollarSign,
    title: "طرق الدفع والمدفوعات",
    text: "مراجعة سندات الدفع واعتمادها أو رفضها.",
  },
  {
    href: "/admin-tracking",
    icon: Truck,
    title: "مراحل الشحن",
    text: "تحديث مراحل الشحنات وإشعار العملاء.",
  },
  {
    href: "/notifications",
    icon: Bell,
    title: "الإشعارات",
    text: "عرض الإشعارات المرسلة للعملاء والإدارة.",
  },
] as const;

function AdminSettingsPage() {
  return (
    <main dir="rtl" className="min-h-[100dvh] bg-slate-50 px-4 py-8 font-[Tajawal] text-slate-800">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#0A2540]">إعدادات الإدارة</h1>
            <p className="mt-1 text-sm text-slate-500">كل إعدادات النظام في مكان واحد.</p>
          </div>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            العودة للوحة القيادة
          </a>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ href, icon: Icon, title, text }) => (
            <a
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#EA580C]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="text-base text-[#0A2540]">{title}</b>
                  <ExternalLink className="size-4 text-slate-400 group-hover:text-[#EA580C]" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-sm text-slate-500">{text}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
