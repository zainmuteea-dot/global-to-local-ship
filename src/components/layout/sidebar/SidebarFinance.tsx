import { Link } from "@tanstack/react-router";
import { Coins, Wallet, Receipt, FileSpreadsheet, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
export function SidebarFinance() {
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(true);
  return (
    <div className="space-y-1 pt-1 border-t border-slate-800/60">
      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-[11px] font-black text-sky-400">الإدارة المالية والمحاسبية</span>
        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">3 عملات YEM/SAR/USD</span>
      </div>
      <Link to="/accounts" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5"><Coins className="size-4 text-emerald-400" /><span>النظام المالي والمحاسبي المتكامل</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-700/50">جديد ⚡</span>
      </Link>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><Wallet className="size-4 text-amber-400" /><span>الخزنة والمحافظ النقدية (6 حسابات)</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/40">شامل</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><Receipt className="size-4 text-emerald-400" /><span>السندات المالية (قبض وصرف)</span></div>
        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">$ [0]</span>
      </div>
      <div>
        <button onClick={() => setIsAccountsTreeOpen(!isAccountsTreeOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
          <div className="flex items-center gap-2.5"><FileSpreadsheet className="size-4 text-cyan-400" /><span>الحسابات والدليل المالي</span></div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/30">[70]</span>
            {isAccountsTreeOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
          </div>
        </button>
        {isAccountsTreeOpen && (
          <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
            <div className="px-2.5 py-1.5 rounded-lg bg-[#271311] border border-amber-900/60 text-amber-300 font-bold flex items-center justify-between"><span>• شجرة الحسابات والعملاء [70]</span><span>⚡</span></div>
            <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">• كشوفات الحسابات بالعملات</div>
            <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">• قيود اليومية المزدوجة</div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><TrendingUp className="size-4 text-teal-400" /><span>العمولات الآلية والأرباح</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800/40">$10/طلب</span>
      </div>
    </div>
  );
}
