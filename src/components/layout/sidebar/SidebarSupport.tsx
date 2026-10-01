import { Headphones } from "lucide-react";
import { useSidebarMenu } from "../../../hooks/useSidebarMenu";
export function SidebarSupport() {
  const { items } = useSidebarMenu("support");
  return (
    <div className="rounded-2xl bg-[#0B1E36] border border-sky-900/40 p-3">
      {items.map(it => <a key={it.id} href={it.path || "#"} target="_blank" className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-200 hover:bg-sky-950"><Headphones className="size-3.5 text-emerald-400" />{it.title}</a>)}
    </div>
  );
}
