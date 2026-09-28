import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  Home,
  MessageSquare,
  Table,
  ListFilter,
  DollarSign,
  ShoppingCart,
  FileText,
  Settings,
  Bot,
  Users,
  Briefcase,
  TrendingUp,
  LogOut,
  ChevronDown,
  Shield,
  BookOpen,
  Tag,
  Package,
  Rocket,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  title: string;
  icon: any;
  href?: string;
  badge?: string | number;
  badgeColor?: string;
  subItems?: { title: string; href: string }[];
}

export function AdminSidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.removeItem("user");
    }
    navigate({ to: "/login" });
  };

  const menuItems: MenuItem[] = [
    { title: "الرئيسية", icon: Home, href: "/admin" },
    { title: "الرسائل", icon: MessageSquare, href: "/notifications" },
    { title: "البيانات", icon: Table, badge: "0" },
    {
      title: "الحسابات",
      icon: ListFilter,
      href: "/accounts",
      badge: "70",
      badgeColor: "bg-red-700",
      subItems: [
        { title: "دليل الحسابات", href: "/accounts" },
        { title: "سندات القبض والصرف", href: "/accounts" },
      ],
    },
    {
      title: "السندات المالية",
      icon: DollarSign,
      badge: "0",
      badgeColor: "bg-red-700",
    },
    {
      title: "العملاء",
      icon: Users,
      href: "/admin-clients",
      subItems: [
        { title: "قائمة العملاء", href: "/admin-clients" },
        { title: "يوميات العملاء", href: "/client-daily" },
        { title: "مبالغ التأمين", href: "/insurance-amounts" },
      ],
    },
    {
      title: "الموارد البشرية (الموظفين)",
      icon: Users,
      href: "/employees",
      subItems: [
        { title: "بيانات الموظفين", href: "/employees" },
        { title: "صلاحيات الموظفين", href: "/employees" },
      ],
    },
    {
      title: "الأسعار والشحن",
      icon: Tag,
      href: "/prices",
      subItems: [
        { title: "قائمة الأسعار", href: "/prices" },
        { title: "المخازن والمستودعات", href: "/warehouses" },
        { title: "إدارة خطوات الرئيسية", href: "/admin-steps" },
      ],
    },
    {
      title: "المتجر الإلكتروني",
      icon: ShoppingCart,
      href: "/products",
      subItems: [
        { title: "المنتجات", href: "/products" },
        { title: "الموردين", href: "/suppliers" },
      ],
    },
    {
      title: "التقارير",
      icon: FileText,
      href: "/merchant-reports",
      subItems: [
        { title: "تقارير التجار", href: "/merchant-reports" },
        { title: "تقارير العملاء", href: "/client-reports" },
      ],
    },
    { title: "الإعدادات", icon: Settings },
    { title: "روبوتاتي", icon: Bot },
    { title: "الخزنة", icon: Briefcase },
    { title: "قسم التاجر", icon: Briefcase },
    { title: "العمولات الآلية", icon: TrendingUp },
  ];

  return (
    <>
      {/* خلفية معتمة للهواتف عند فتح القائمة */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* شريط القائمة الجانبية باللون الأحمر */}
      <aside
        dir="rtl"
        className={`fixed top-0 right-0 z-50 h-screen w-64 bg-[#b91c1c] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* الترويسة العلوية الحمراء الداكنة */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#991b1b] border-b border-red-800">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-lg tracking-wide text-white">
              السوق الشامل إكسبرس
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg border border-red-400/30 hover:bg-red-800 transition text-white"
            aria-label="القائمة"
          >
            {isOpen ? <X className="size-5 lg:hidden" /> : <Menu className="size-5" />}
            <Menu className="size-5 hidden lg:block" />
          </button>
        </div>

        {/* قائمة الروابط القابلة للتمرير */}
        <div className="flex-1 overflow-y-auto py-2 divide-y divide-red-800/40 custom-scrollbar">
          {menuItems.map((item) => {
            const hasSub = item.subItems && item.subItems.length > 0;
            const isSubOpen = expanded[item.title];
            const Icon = item.icon;

            return (
              <div key={item.title} className="text-xs">
                {item.href && !hasSub ? (
                  <Link
                    to={item.href}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[#991b1b] transition font-bold text-white/95"
                    onClick={() => {
                      if (window.innerWidth < 1024) onToggle();
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4 text-cyan-300" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.badgeColor || "bg-red-950/80"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => (hasSub ? toggleExpand(item.title) : null)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#991b1b] transition font-bold text-white/95"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4 text-cyan-300" />
                      <span>{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.badgeColor || "bg-red-950/80"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {hasSub && (
                        <ChevronDown
                          className={`size-3.5 transition-transform ${
                            isSubOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </div>
                  </button>
                )}

                {/* القوائم المنسدلة الفرعية */}
                {hasSub && isSubOpen && (
                  <div className="bg-[#8b1515] py-1">
                    {item.subItems!.map((sub) => (
                      <Link
                        key={sub.title}
                        to={sub.href}
                        className="block pr-10 pl-4 py-2 text-[11px] font-medium text-red-100 hover:text-white hover:bg-[#781212] transition"
                        onClick={() => {
                          if (window.innerWidth < 1024) onToggle();
                        }}
                      >
                        • {sub.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* زر تسجيل الخروج في الأسفل */}
        <div className="border-t border-red-800 bg-[#991b1b] p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-950 text-red-100 hover:text-white transition text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <LogOut className="size-4 text-red-300" />
              <span>الخروج من المنظومة</span>
            </div>
            <span className="text-[10px] opacity-70">تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
