import { ChevronLeft, Home, Search, Truck, X, Zap, FolderTree, Users } from "lucide-react";
import { EmbeddedLogo } from "./Logo";

export function AdminSidebar({
  isOpen,
  onClose,
  onOpenAccountsTree,
  navigateTo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountsTree: () => void;
  navigateTo: (path: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10" dir="rtl">
        <div className="w-80 sm:w-96 max-w-[85vw] bg-white text-[#0A2540] shadow-2xl flex flex-col border-l border-sky-200 animate-in slide-in-from-right duration-300">
          <div className="p-4 bg-gradient-to-r from-[#0B2545] to-[#0F4C81] text-white flex items-center justify-between">
            <EmbeddedLogo size="sm" />
            <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-[#0A2540]">المشرف العام</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">متصل</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs divide-y divide-slate-100">
            <div className="space-y-1 pt-1">
              <div className="px-3 py-1 text-[10px] font-bold text-sky-700 uppercase tracking-wider">إدارة العمليات</div>
              <button onClick={() => { onClose(); navigateTo("/admin"); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white shadow-sm cursor-pointer">
                <div className="flex items-center gap-2.5"><Truck className="w-4 h-4 text-orange-300" /><span>لوحة عمليات الشحن</span></div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">نشط</span>
              </button>
              <button onClick={() => { onClose(); navigateTo("/new-order"); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0F4C81] transition cursor-pointer">
                <div className="flex items-center gap-2.5"><Zap className="w-4 h-4 text-orange-500" /><span>طلب شراء جديد</span></div>
                <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button onClick={() => { onClose(); navigateTo("/track"); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0F4C81] transition cursor-pointer">
                <div className="flex items-center gap-2.5"><Search className="w-4 h-4 text-sky-600" /><span>تتبع الشحنة</span></div>
                <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            <div className="space-y-1 pt-3">
              <div className="px-3 py-1 text-[10px] font-bold text-sky-700 uppercase tracking-wider">العملاء وقواعد البيانات</div>
              <button onClick={() => { onClose(); navigateTo("/admin-clients"); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0F4C81] transition cursor-pointer">
                <div className="flex items-center gap-2.5"><Users className="w-4 h-4 text-emerald-600" /><span>إدارة العملاء</span></div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">قاعدة بيانات</span>
              </button>
              <button onClick={() => { onClose(); onOpenAccountsTree(); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0F4C81] transition cursor-pointer">
                <div className="flex items-center gap-2.5"><FolderTree className="w-4 h-4 text-amber-500" /><span>شجرة الحسابات المحاسبية</span></div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">مالية</span>
              </button>
            </div>

            <div className="space-y-1 pt-3">
              <div className="px-3 py-1 text-[10px] font-bold text-sky-700 uppercase tracking-wider">المتجر</div>
              <button onClick={() => { onClose(); navigateTo("/"); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0F4C81] transition cursor-pointer">
                <div className="flex items-center gap-2.5"><Home className="w-4 h-4 text-orange-500" /><span>المتجر الرئيسي</span></div>
                <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-500 text-[10px]">Al Shamel v2.4</span>
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
}
