import { Suspense, lazy } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, X } from "lucide-react";

const SidebarShopping = lazy(() => import("./SidebarShopping").then(m => ({ default: m.SidebarShopping })));
const SidebarFinance = lazy(() => import("./SidebarFinance").then(m => ({ default: m.SidebarFinance })));
const SidebarOperations = lazy(() => import("./SidebarOperations").then(m => ({ default: m.SidebarOperations })));
const SidebarSupport = lazy(() => import("./SidebarSupport").then(m => ({ default: m.SidebarSupport })));

function Loader() {
  return <div className="px-3 py-2 text-[11px] text-slate-500 animate-pulse">جاري التحميل...</div>;
}

export function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />}

      <aside className={`fixed lg:static top-0 right-0 h-full w-[290px] bg-[#0A1628] border-l border-slate-800 z-50 flex flex-col transition-transform duration-300 ${isOpen? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>

        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 grid place-items-center">
              <Globe className="size-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-sm">السوق الشامل</div>
              <div className="text-[10px] text-slate-400">من العالم إلى اليمن</div>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800">
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          <Suspense fallback={<Loader />}>
            <SidebarShopping />
          </Suspense>
          <Suspense fallback={<Loader />}>
            <SidebarFinance />
          </Suspense>
          <Suspense fallback={<Loader />}>
            <SidebarOperations />
          </Suspense>
          <Suspense fallback={<Loader />}>
            <SidebarSupport />
          </Suspense>
        </nav>

        <div className="p-3 border-t border-slate-800/60">
          <div className="text-[10px] text-slate-500 text-center">v2.1 - تم التقسيم لتسريع التحميل ⚡</div>
        </div>

      </aside>
    </>
  );
}
