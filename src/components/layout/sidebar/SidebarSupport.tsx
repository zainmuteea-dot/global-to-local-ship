import { Headphones, Settings, ChevronLeft } from "lucide-react";
export function SidebarSupport() {
  return (
    <div className="space-y-1 pt-1 border-t border-slate-800/60">
      <div className="px-2 pb-1 text-[11px] font-black text-sky-400">الدعم والمساعدة</div>
      <a href="https://wa.me/967770000000" target="_blank" rel="noreferrer" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5"><Headphones className="size-4 text-emerald-400" /><span>الدعم الفني وخدمة العملاء</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">واتساب</span>
      </a>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><Settings className="size-4 text-slate-400" /><span>إعدادات النظام والربط</span></div>
        <ChevronLeft className="size-3.5 opacity-50" />
      </div>
    </div>
  );
}
