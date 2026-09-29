import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Home,
  PackagePlus,
  Compass,
  UserCheck,
  MessageSquare,
  Tag,
  ShoppingCart,
  Landmark,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Briefcase,
  Store,
  Bot,
  BarChart3,
  Headphones,
  Sliders,
  DollarSign,
  ChevronDown,
  X,
  LogOut,
  CircleDot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  title: string;
  icon: any;
  href?: string;
  badge?: string;
  badgeColor?: string;
  subItems?: { title: string; href: string }[];
}

interface MenuSection {
  title: string;
  badge?: string;
  badgeColor?: string;
  items: MenuItem[];
}

export function AdminSidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "الحسابات والدليل المالي": true,
  });

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

  const sections: MenuSection[] = [
    {
      title: "التسوق وخدمات العملاء",
      items: [
        { title: "الرئيسية", icon: Home, href: "/admin" },
        { title: "طلب جديد (اطلب الآن)", icon: PackagePlus, href: "/new-order", badge: "فوري", badgeColor: "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30" },
        { title: "تتبع الطلبات والشحنات", icon: Compass, href: "/track" },
        { title: "حسابي وإدارة العمليات", icon: UserCheck, href: "/my-account" },
        { title: "الرسائل والمحادثات", icon: MessageSquare, href: "/notifications", badge: "2 جديدة", badgeColor: "bg-blue-600/30 text-blue-300 border border-blue-500/30" },
        { title: "الأسعار والشحن", icon: Tag, href: "/prices" },
        { title: "المتجر الإلكتروني", icon: ShoppingCart, href: "/products" },
      ],
    },
    {
      title: "الإدارة المالية والمحاسبية",
      badge: "3 عملات",
      badgeColor: "bg-emerald-950 text-emerald-400 border border-emerald-700/50",
      items: [
        { title: "النظام المالي والمحاسبي المتكامل", icon: Landmark, href: "/accounts", badge: "جديد", badgeColor: "bg-emerald-600 text-white" },
        { title: "الخزنة والمحافظ النقدية (6 حسابات)", icon: ShieldCheck, href: "/accounts", badge: "شامل", badgeColor: "bg-emerald-900/50 text-emerald-300" },
        { title: "السندات المالية (قبض وصرف)", icon: DollarSign, href: "/accounts", badge: "0 $", badgeColor: "bg-emerald-900/50 text-emerald-300" },
        {
          title: "الحسابات والدليل المالي",
          icon: FileSpreadsheet,
          badge: "70",
          badgeColor: "bg-amber-900/40 text-amber-300 border border-amber-600/40",
          subItems: [
            { title: "شجرة الحسابات والعملاء [70]", href: "/accounts" },
            { title: "كشوفات الحسابات بالعملات", href: "/accounts" },
            { title: "قيود اليومية المزدوجة", href: "/accounts" },
          ],
        },
        { title: "العمولات الآلية والأرباح", icon: DollarSign, href: "/accounts", badge: "10$/طلب", badgeColor: "bg-amber-800/40 text-amber-200" },
      ],
    },
    {
      title: "لوحة التحكم والعمليات",
      badge: "الشحن والتوزيع",
      badgeColor: "bg-amber-900/50 text-amber-300 border border-amber-700/40",
      items: [
        { title: "لوحة عمليات الشحن والتوزيع", icon: Landmark, href: "/admin", badge: "41 شحنة", badgeColor: "bg-amber-700 text-amber-100" },
        { title: "البيانات والمدخلات السريعة", icon: FileSpreadsheet, href: "/admin", badge: "[0]", badgeColor: "bg-stone-800 text-stone-300" },
        { title: "العملاء والمستخدمون", icon: Users, href: "/admin-clients" },
        { title: "الموارد البشرية (الموظفين)", icon: Briefcase, href: "/employees" },
        { title: "قسم التاجر والشركاء", icon: Store, href: "/suppliers", badge: "جملة", badgeColor: "bg-amber-600/30 text-amber-300" },
        { title: "روبوتاتي (الأتمتة والـ AI)", icon: Bot, href: "/admin", badge: "نشط", badgeColor: "bg-emerald-700/40 text-emerald-300" },
        { title: "التقارير المالية والتشغيلية", icon: BarChart3, href: "/merchant-reports" },
      ],
    },
    {
      title: "الدعم والمساعدة",
      items: [
        { title: "الدعم الفني وخدمة العملاء", icon: Headphones, href: "/notifications", badge: "واتساب", badgeColor: "bg-emerald-900/60 text-emerald-300" },
        { title: "إعدادات النظام والربط", icon: Sliders, href: "/admin" },
      ],
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        dir="rtl"
        className={`fixed top-0 right-0 h-full w-72 bg-[#1c130d] border-l border-[#3a2719] text-stone-200 z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* هيدر القائمة مع بيانات المشرف */}
        <div className="p-4 border-b border-[#352316] bg-[#241810]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center font-black text-amber-100 shadow-md">
                س
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-100">السوق الشامل</h2>
                <p className="text-[10px] text-stone-400">وسيط الشراء العالمي المعتمد</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="bg-[#170f0a] border border-[#3b2718] rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-stone-200">زين مطيع</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">متصل</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400">ID: #92841</span>
          </div>
        </div>

        {/* عناصر القائمة مقسمة */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs scrollbar-thin scrollbar-thumb-stone-800">
          {sections.map((sec, sIdx) => (
            <div key={sIdx}>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold text-stone-400 tracking-wider">
                  {sec.title}
                </span>
                {sec.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sec.badgeColor}`}>
                    {sec.badge}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const hasSub = item.subItems && item.subItems.length > 0;
                  const isExpanded = expanded[item.title];

                  return (
                    <div key={iIdx}>
                      {hasSub ? (
                        <button
                          onClick={() => toggleExpand(item.title)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition text-stone-300 hover:bg-[#2b1c12] hover:text-amber-200 ${
                            isExpanded ? "bg-[#271910] text-amber-300" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="size-4 text-amber-500/80" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.badge && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.badgeColor}`}>
                                {item.badge}
                              </span>
                            )}
                            <ChevronDown
                              className={`size-3 text-stone-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>
                      ) : (
                        <Link
                          to={item.href || "/admin"}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl transition text-stone-300 hover:bg-[#2b1c12] hover:text-amber-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="size-4 text-amber-500/80" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}

                      {/* عناصر متفرعة */}
                      {hasSub && isExpanded && (
                        <div className="mr-6 my-1 space-y-1 border-r border-[#3f2a1b] pr-2">
                          {item.subItems?.map((sub, subIdx) => (
                            <Link
                              key={subIdx}
                              to={sub.href}
                              className="block py-1.5 px-2 rounded-lg text-[11px] text-stone-400 hover:text-amber-200 hover:bg-[#2c1d13] transition"
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
            </div>
          ))}
        </div>

        {/* زر تسجيل الخروج في الأسفل */}
        <div className="p-3 border-t border-[#352316] bg-[#22160e]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/40 text-red-300 border border-red-900/40 hover:bg-red-900/60 transition text-xs font-bold"
          >
            <LogOut className="size-4" />
            تسجيل الخروج من المنظومة
          </button>
        </div>
      </aside>
    </>
  );
}
