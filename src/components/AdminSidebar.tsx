import { Link, useRouterState } from "@tanstack/react-router";
import { X, LayoutDashboard, Package, Bell, PlusCircle, Settings } from "lucide-react";

export function AdminSidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links = [
    { to: "/admin", label: "لوحة الشحن", icon: LayoutDashboard },
    { to: "/notifications", label: "الإشعارات والمتابعة", icon: Bell },
    { to: "/new-order", label: "طلب شحن جديد", icon: PlusCircle },
    { to: "/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <>
      {/* خلفية معتمة للجوال */}
      <div
        onClick={onToggle}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-[260px] bg-[#1c130d] border-l border-[#3b2718] z-50 p-4 space-y-2 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-amber-700 flex items-center justify-center">
              <Package className="size-5 text-white" />
            </div>
            <span className="font-black text-amber-100 text-sm">السوق الشامل</span>
          </div>
          <button onClick={onToggle} className="p-2 rounded-lg bg-[#2a1d14] text-stone-400">
            <X className="size-4" />
          </button>
        </div>

        {links.map((l) => {
          const active = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              onClick={onToggle}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${
                active
                  ? "bg-amber-700 text-white"
                  : "text-stone-300 hover:bg-[#2a1d14] hover:text-amber-200"
              }`}
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          );
        })}
      </aside>
    </>
  );
}
