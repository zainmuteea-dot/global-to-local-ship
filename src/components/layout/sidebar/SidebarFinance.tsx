import { Link } from "@tanstack/react-router";
import { Coins, Wallet, ChevronDown } from "lucide-react";
import { useSidebarMenu } from "../../../hooks/useSidebarMenu";
const icons: any = { Coins, Wallet };
export function SidebarFinance() {
  const { items } = useSidebarMenu("finance");
  return (
    <div className="rounded-2xl bg-[#0B1E36] border border-sky-900/40 overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2.5 text-sky-300 font-black">
        <span className="flex items-center gap-2 text-[11px]"><Coins className="size-3.5" />المالية</span>
        <ChevronDown className="size-3.5" />
      </button>
      <div className="px-2 pb-2 space-y-1">
        {items.map(it => {
          const Icon = icons[it.icon || "Coins"] || Coins;
          return <Link key={it.id} to={it.path || "/"} className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-200 hover:bg-sky-950 hover:text-white"><span className="flex items-center gap-2"><Icon className="size-3.5 text-emerald-400" />{it.title}</span>{it.badge && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">{it.badge}</span>}</Link>
        })}
      </div>
    </div>
  );
}
