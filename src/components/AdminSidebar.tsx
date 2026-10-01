import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { X, Home, ShoppingCart, Search, Coins, Users, Package, Bell, UserRound, LifeBuoy, ChevronLeft } from "lucide-react";

const supabase = createClient(
  "https://ihqijxikvfvubfqffezb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocWlqeGlrdmZ2dWJmcWZmZXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTM4MTUsImV4cCI6MjA1ODU2OTgxNX0.eW_t_TqjWwQ75903o4q3s0Xk7uB723qW_yE1iP"
);

const iconMap: any = { Home, ShoppingCart, Search, Coins, Users, Package, Bell, UserRound, LifeBuoy };

const defaultSections = [
  { title: "التسوق وخدمة العملاء", items: [
    { to: "/", label: "الرئيسية (المتجر)", icon: Home, badge: null },
    { to: "/new-order", label: "اطلب الآن — طلب جديد", icon: ShoppingCart, badge: "فوري" },
    { to: "/track", label: "تتبع الشحنات والطلبات", icon: Search, badge: null },
  ]},
  { title: "الإدارة المالية والمحاسبية", items: [
    { to: "/accounting", label: "النظام المالي المتكامل", icon: Coins, badge: "3 عملات" },
    { to: "/admin-clients", label: "صفحة العملاء الشاملة", icon: Users, badge: null },
  ]},
  { title: "لوحة التحكم والعمليات", items: [
    { to: "/admin", label: "لوحة عمليات الشحن والتوزيع", icon: Package, badge: "إدارة" },
    { to: "/notifications", label: "الإشعارات والمتابعة", icon: Bell, badge: null },
  ]},
  { title: "الدعم والمساعدة", items: [
    { to: "/my-account", label: "حسابي وإدارة العمليات", icon: UserRound, badge: null },
    { to: "/support", label: "دعم العملاء وتتبع المساعدة", icon: LifeBuoy, badge: null },
  ]},
];

export function AdminSidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sections, setSections] = useState(defaultSections);

  useEffect(()=>{
    supabase.from('sidebar_buttons').select('*').order('sort_order').then(({data})=>{
      if(data && data.length>0){
        const grouped: any = {};
        data.forEach((b:any)=>{
          if(!grouped[b.section_title]) grouped[b.section_title]=[];
          grouped[b.section_title].push({
            to: b.path, label: b.label, badge: b.badge,
            icon: iconMap[b.icon] || Home
          });
        });
        const newSections = Object.keys(grouped).map(title=>({title, items: grouped[title]}));
        if(newSections.length>0) setSections(newSections as any);
      }
    });
  },[]);

  return (
    <>
      <div onClick={onToggle} className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity ${isOpen? "opacity-100" : "opacity-0 pointer-events-none"}`} />
      <aside dir="rtl" className={`fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] border-l border-sky-100 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${isOpen? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-4 bg-white border-b border-sky-100 flex items-center justify-between">
          <div className="font-black text-sm text-[#0F4C81]">السوق الشامل</div>
          <button onClick={onToggle} className="p-1.5 rounded-lg bg-sky-50"><X className="size-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {sections.map((section:any)=>(
            <div key={section.title}>
              <p className="text-[10px] font-black text-slate-400 mb-1.5 px-1">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item:any)=>{
                  const active = pathname === item.to;
                  return (
                    <Link key={item.label} to={item.to} onClick={onToggle} className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${active? "bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white" : "text-slate-600 hover:bg-white"}`}>
                      <div className="flex items-center gap-2.5"><item.icon className="size-4"/><span>{item.label}</span></div>
                      {item.badge? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">{item.badge}</span> : <ChevronLeft className="size-3.5 opacity-40"/>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-white border-t text-center text-[10px] font-bold text-slate-400">السوق الشامل — وسيطكم المعتمد</div>
      </aside>
    </>
  );
}
export default AdminSidebar;
