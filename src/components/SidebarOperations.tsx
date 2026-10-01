import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  Database,
  Users,
  UserCog,
  Store,
  Bot,
  FileText,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export function SidebarOperations() {
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isHrOpen, setIsHrOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  return (
    <div className="space-y-1 pt-1 border-t border-slate-800/60">
      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-[11px] font-black text-sky-400">لوحة التحكم والعمليات</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
          الشحن والتوزيع
        </span>
      </div>

      <Link to="/admin" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5">
          <Truck className="size-4 text-sky-400" />
          <span>لوحة عمليات الشحن والتوزيع</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800/40">[114]</span>
      </Link>

      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5">
          <Database className="size-4 text-sky-300" />
          <span>البيانات والمدخلات السريعة</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">[0]</span>
      </div>

      <div>
        <button onClick={() => setIsUsersOpen(!isUsersOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-sky-400" />
            <span>العملاء والمستخدمون</span>
          </div>
          {isUsersOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
        </button>
      </div>

      <div>
        <button onClick={() => setIsHrOpen(!isHrOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
          <div className="flex items-center gap-2.5">
            <UserCog className="size-4 text-amber-400" />
            <span>الموارد البشرية (الموظفين)</span>
          </div>
          {isHrOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5">
          <Store className="size-4 text-amber-500" />
          <span>قسم التاجر والشركاء</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/40">جملة</span>
      </div>

      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5">
          <Bot className="size-4 text-teal-400" />
          <span>روبوتاتي (الأتمتة والـ AI)</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">نشط 🤖</span>
      </div>

      <div>
        <button onClick={() => setIsReportsOpen(!isReportsOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
          <div className="flex items-center gap-2.5">
            <FileText className="size-4 text-rose-400" />
            <span>التقارير المالية والتشغيلية</span>
          </div>
          {isReportsOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
        </button>
      </div>
    </div>
  );
}
