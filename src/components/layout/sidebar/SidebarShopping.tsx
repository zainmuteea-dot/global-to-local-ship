import { Link } from "react-router-dom";
import { Home, Truck, Zap, ChevronDown } from "lucide-react";
import { useSidebarMenu } from "../../../hooks/useSidebarMenu";

const icons: any = { Home, Truck, Zap };

export function SidebarShopping() {
  const { items } = useSidebarMenu("shopping");
  return (
    <div className="rounded-2xl bg-[#0B1E36] border border-sky-900/40 overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2.5 text-sky-300 font-black">
        <span className="flex items-center gap-2 text-[11px]"><Home className="size-3.5" />التسوق</span>
        <ChevronDown className="size-3.5" />
      </button>
      <div className="px-2 pb-2 space-y-1">
        {items.map(it => {
          const Icon = icons[it.icon || "Home"] || Home;
          return (
            <Link key={it.id} to={it.path || "/"} className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-200 hover:bg-sky-950 hover:text-white">
              <span className="flex items-center gap-2"><Icon className="size-3.5 text-sky-400" />{it.title}</span>
              {it.badge && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300">{it.badge}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
