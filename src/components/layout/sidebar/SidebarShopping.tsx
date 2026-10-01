import { Link, useLocation } from "@tanstack/react-router";
import { Home, Truck, Zap, UserCheck, MessageSquare, Tag, ShoppingBag, ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
export function SidebarShopping() {
  const [isPricesOpen, setIsPricesOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  return (
    <div className="space-y-1">
      <div className="px-2 pb-1 text-[11px] font-black text-sky-400">التسوق وخدمات العملاء</div>
      <Link to="/" className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition ${currentPath === "/"? "bg-[#0284C7] text-white shadow-md shadow-sky-600/30" : "text-slate-300 hover:bg-[#0B1E36] hover:text-white"}`}>
        <div className="flex items-center gap-2.5"><Home className="size-4 text-sky-200" /><span>الرئيسية (متجر السوق الشامل)</span></div><ChevronLeft className="size-3.5 opacity-70" />
      </Link>
      <Link to="/admin" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5"><Truck className="size-4 text-sky-400" /><span>لوحة عمليات الشحن والفرز</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800/40">إدارة</span>
      </Link>
      <Link to="/new-order" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5"><Zap className="size-4 text-amber-400" /><span>طلب جديد (اطلب الآن)</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-800/40">فوراً</span>
      </Link>
      <Link to="/track" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5"><Truck className="size-4 text-sky-400" /><span>تتبع الطلبات والشحنات</span></div><ChevronLeft className="size-3.5 opacity-50" />
      </Link>
      <Link to="/my-account" className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold">
        <div className="flex items-center gap-2.5"><UserCheck className="size-4 text-emerald-400" /><span>حسابي وإدارة العمليات</span></div><ChevronLeft className="size-3.5 opacity-50" />
      </Link>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><MessageSquare className="size-4 text-indigo-400" /><span>الرسائل والمحادثات</span></div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800/40">2 جديدة</span>
      </div>
      <div><button onClick={() => setIsPricesOpen(!isPricesOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><Tag className="size-4 text-amber-500" /><span>الأسعار والشحن</span></div>{isPricesOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}</button></div>
      <div><button onClick={() => setIsStoreOpen(!isStoreOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
        <div className="flex items-center gap-2.5"><ShoppingBag className="size-4 text-emerald-400" /><span>المتجر الإلكتروني</span></div>{isStoreOpen? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}</button></div>
    </div>
  );
}
