import { Link, useRouterState } from "@tanstack/react-router";
import {
  X,
  Home,
  ShoppingCart,
  Search,
  Coins,
  Users,
  Package,
  Bell,
  UserRound,
  LifeBuoy,
  ChevronLeft,
} from "lucide-react";

const sections = [
  {
    title: "التسوق وخدمة العملاء",
    items: [
      { to: "/", label: "الرئيسية (المتجر)", icon: Home, badge: null as string | null },
      { to: "/new-order", label: "اطلب الآن — طلب جديد", icon: ShoppingCart, badge: "فوري" },
      { to: "/track", label: "تتبع الشحنات والطلبات", icon: Search, badge: null },
    ],
  },
  {
    title: "الإدارة المالية والمحاسبية",
    items: [
      { to: "/accounting", label: "النظام المالي المتكامل", icon: Coins, badge: "3 عملات" },
      { to: "/admin-clients", label: "صفحة العملاء الشاملة", icon: Users, badge: null },
    ],
  },
  {
    title: "لوحة التحكم والعمليات",
    items: [
      { to: "/admin", label: "لوحة عمليات الشحن والتوزيع", icon: Package, badge: "إدارة" },
      { to: "/notifications", label: "الإشعارات والمتابعة", icon: Bell, badge: null },
    ],
  },
  {
    title: "الدعم والمساعدة",
    items: [
      { to: "/my-account", label: "حسابي وإدارة العمليات", icon: UserRound, badge: null },
      { to: "/track", label: "دعم العملاء وتتبع المساعدة", icon: LifeBuoy, badge: null },
    ],
  },
];

export function AdminSidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {/* خلفية معتمة للإغلاق (تعمل في جميع الشاشات) */}
      <div
        onClick={onToggle}
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        dir="rtl"
        className={`fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] border-l border-sky-100 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* رأس القائمة */}
        <div className="p-4 bg-white border-b border-sky-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] flex items-center justify-center text-white font-black shadow-sm">
              AS
            </div>
            <div className="leading-tight">
              <div className="font-black text-sm text-[#0F4C81]">السوق الشامل</div>
              <div className="text-[10px] font-bold text-[#F97316]">AL SHAMEL SHOPPING</div>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-sky-50 text-slate-500 hover:bg-sky-100 hover:text-[#0F4C81] transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* هوية المشرف */}
        <div className="mx-3 mt-3 p-3 rounded-2xl bg-white border border-sky-100 shadow-xs flex items-center gap-2.5">
          <div className="size-10 rounded-full bg-gradient-to-tr from-[#F97316] to-[#FB923C] grid place-items-center text-white font-black shadow-sm">
            ز
          </div>
          <div className="leading-tight">
            <div className="text-xs font-black text-[#0A2540]">زين مطيع</div>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600">متصل</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400 font-mono">ID: #92841</span>
            </div>
          </div>
          <span className="mr-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-[#0F4C81] text-white">
            المشرف العام
          </span>
        </div>

        {/* الأقسام الأربعة */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-black text-slate-400 mb-1.5 px-1 flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-orange-400 rounded-full" />
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={onToggle}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                        active
                          ? "bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white shadow-md"
                          : "text-slate-600 hover:bg-white hover:text-[#0F4C81] hover:shadow-xs border border-transparent hover:border-sky-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          className={`size-4 ${active ? "text-orange-300" : "text-[#0284C7]"}`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                            active ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronLeft className="size-3.5 opacity-40" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* تذييل القائمة */}
        <div className="p-3 bg-white border-t border-sky-100 text-center text-[10px] font-bold text-slate-400">
          السوق الشامل — وسيطكم المعتمد للشراء من العالم
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
