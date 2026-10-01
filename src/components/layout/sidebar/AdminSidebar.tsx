import { Suspense, lazy } from "react";
import { X, ShoppingBag } from "lucide-react";
const SidebarShopping = lazy(() => import("./sidebar/SidebarShopping").then(m => ({ default: m.SidebarShopping })));
const SidebarFinance = lazy(() => import("./sidebar/SidebarFinance").then(m => ({ default: m.SidebarFinance })));
const SidebarDashboard = lazy(() => import("./sidebar/SidebarDashboard").then(m => ({ default: m.SidebarDashboard })));
const SidebarSupport = lazy(() => import("./sidebar/SidebarSupport").then(m => ({ default: m.SidebarSupport })));
interface AdminSidebarProps { isOpen: boolean; onClose: () => void; }
export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden" />
      <aside dir="rtl" className="fixed top-0 right-0 z-50 h-full w-[295px] bg-[#071426] border-l border-sky-950/60 text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 overflow-hidden font-sans select-none">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-[#06101f]">
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="إغلاق القائمة"><X className="size-4" /></button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-center gap-1 leading-none">
                <span className="font-black text-sm tracking-wide text-[#F97316]">SHOPPING</span>
                <span className="font-black text-sm tracking-wide text-white">AL SHAMEL</span>
              </div>
              <div className="text-[10px] font-bold text-sky-400 tracking-wider mt-0.5">السوق الشامل • وسيطكم العالمي</div>
            </div>
            <div className="size-8 rounded-lg bg-gradient-to-tr from-[#EA580C] to-[#F97316] grid place-items-center text-white shadow-sm shadow-orange-500/30"><ShoppingBag className="size-4" /></div>
          </div>
        </div>
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-[#0B1E36] border border-sky-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">زين مطيع</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />متصل</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-sky-400">ID: #92841</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs scrollbar-thin scrollbar-thumb-sky-900/40">
          <Suspense fallback={<div className="p-4 text-center text-slate-500">جاري التحميل...</div>}>
            <SidebarShopping />
            <SidebarFinance />
            <SidebarDashboard />
            <SidebarSupport />
          </Suspense>
        </div>
        <div className="p-3 border-t border-slate-800/80 bg-[#06101f] text-center text-[10px] font-bold text-sky-400/90 tracking-wide">السوق الشامل © 2026 • إصدار النظام V2.8</div>
      </aside>
    </>
  );
}
