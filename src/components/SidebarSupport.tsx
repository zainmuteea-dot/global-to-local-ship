import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Headset,
  FileWarning,
  BookOpen,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export function SidebarSupport() {
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [isComplaintsOpen, setIsComplaintsOpen] = useState(false);

  return (
    <div className="space-y-1 pt-1 border-t border-slate-800/60">
      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-[11px] font-black text-sky-400">الدعم والمساعدة والسياسات</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
          تواصل معنا
        </span>
      </div>

      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5">
          <MessageCircle className="size-4 text-sky-400" />
          <span>خدمة العملاء والمحادثة الفورية</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/40">مباشر</span>
      </div>

      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5">
          <Headset className="size-4 text-indigo-400" />
          <span>الدعم الفني والمركز الرئيسي</span>
        </div>
      </div>

      <div>
        <button onClick={() => setIsComplaintsOpen(!isComplaintsOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
          <div className="flex items-center gap-2.5">
            <FileWarning className="size-4 text-rose-400" />
            <span>الشكاوى والبلاغات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800/40">بلاغ</span>
            {isComplaintsOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
          </div>
        </button>
      </div>

      <div>
        <button onClick={() => setIsPoliciesOpen(!isPoliciesOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
          <div className="flex items-center gap-2.5">
            <BookOpen className="size-4 text-amber-400" />
            <span>السياسات والشروط</span>
          </div>
          {isPoliciesOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
        </button>

        {isPoliciesOpen && (
          <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
            <Link to="/terms" className="block px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition">• الشروط والأحكام</Link>
            <Link to="/privacy" className="block px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition">• سياسة الخصوصية</Link>
            <Link to="/returns" className="block px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition">• سياسة الإرجاع والاستبدال</Link>
          </div>
        )}
      </div>

      <Link to="/accounts" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span>الامتثال والحوكمة</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">موثوق</span>
      </Link>
    </div>
  );
}
