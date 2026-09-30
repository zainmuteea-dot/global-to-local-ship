import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  CircleDollarSign,
  Hand,
  Link2,
  Package,
  Search,
  ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

// مكونات داخلية عشان ما يفشل البناء
function AlShamelLogo({ showText = true }: { size?: string; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] grid place-items-center text-white font-black text-lg">S</div>
      {showText && (
        <div className="leading-none">
          <div className="font-black text-[#EA580C] text-xs">SHOPPING AL SHAMEL</div>
          <div className="text-[10px] text-[#0F4C81] font-bold">التسوق الشامل</div>
        </div>
      )}
    </div>
  );
}

function AppSidebar({ isOpen, onClose, onNavigate }: { isOpen: boolean; onClose: () => void; onNavigate: (r: string) => void }) {
  if (!isOpen) return null;
  const items = [
    { label: "اطلب الآن", route: "new-order" },
    { label: "تتبع شحنة", route: "track" },
    { label: "حسابي", route: "my-account" },
    { label: "الطلبات", route: "orders" },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-72 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="mb-4 text-sm font-bold">✕ إغلاق</button>
        <div className="space-y-1">
          {items.map((it) => (
            <button key={it.route} onClick={() => onNavigate(it.route)} className="block w-full text-right p-3 rounded-xl hover:bg-sky-50 text-sm font-bold">
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountsTreeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black mb-4">شجرة الحسابات</h3>
        <p className="text-sm text-slate-500">قريباً</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold">إغلاق</button>
      </div>
    </div>
  );
}

function Index() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(false);

  const platforms = [
    { name: "TEMU", color: "text-[#FA6400]" },
    { name: "TrendYol", color: "text-[#F27A1A]" },
    { name: "SHEIN", color: "text-zinc-900" },
    { name: "Amazon", color: "text-[#FF9900]" },
    { name: "AliExpress", color: "text-[#FF4747]" },
  ];

  const steps = [
    { title: "أرسل الرابط", desc: "انسخ رابط المنتج من أي متجر عالمي", icon: Link2 },
    { title: "اعرف السعر", desc: "نوضح لك التكلفة بالريال اليمني أو الدولار", icon: CircleDollarSign },
    { title: "نشتري لك", desc: "نشتري بدلاً عنك ونضمن جودة وتطابق الطلب", icon: ShoppingCart },
    { title: "تابع الشحنة", desc: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع", icon: Search },
    { title: "الاستلام", desc: "توصيل موثوق حتى باب بيتك في كافة المحافظات", icon: Package },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540]">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col justify-center items-center gap-1.5 size-12 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] text-white shadow-md hover:scale-105 active:scale-95 ring-2 ring-sky-300/50 cursor-pointer"
          >
            <span className="w-6 h-1 rounded-full bg-white"></span>
            <span className="w-6 h-1 rounded-full bg-orange-400"></span>
            <span className="w-6 h-1 rounded-full bg-white"></span>
          </button>
          <AlShamelLogo size="md" showText={true} />
        </div>
        <div className="flex items-center gap-2">
          <a href="/new-order" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] px-5 py-2.5 font-black text-xs sm:text-sm text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-300/40">
            <ShoppingCart className="size-4" />
            <span>اطلب الآن</span>
          </a>
        </div>
      </header>

      <section className="px-4 pt-4">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A2540] via-[#0F4C81] to-[#134074] p-6 text-white shadow-2xl sm:p-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl sm:text-4xl font-black">كيف تطلب؟<span className="text-orange-400">؟</span></h2>
            <div className="grid size-16 sm:size-20 place-items-center rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#FB923C] ring-4 ring-white/30 shadow-lg cursor-pointer">
              <span className="grid size-8 place-items-center rounded-full bg-white text-[#EA580C]">▶</span>
            </div>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-sky-100 max-w-md">انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/new-order" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-7 py-3 font-black text-sm text-white shadow-lg ring-2 ring-orange-300/40 hover:-translate-y-0.5 transition">
              <Hand className="size-5 -scale-x-100" />
              <span>اضغط هنا لطلب منتج</span>
            </a>
            <a href="/track" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 font-bold text-xs sm:text-sm text-white">
              <Search className="size-4 text-orange-300" />
              <span>تتبع شحنة سابقة</span>
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 pt-10 text-center">
        <h3 className="font-bold text-xs text-[#0F4C81] mb-4">نستورد لك من أشهر المتاجر العالمية</h3>
        <div className="flex justify-center gap-3 flex-wrap">
          {platforms.map((p) => (
            <div key={p.name} className={`grid size-20 place-items-center rounded-2xl bg-white shadow-sm border border-sky-100 font-black text-sm ${p.color}`}>{p.name}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-sky-100 shadow-sm">
                <span className="grid size-12 place-items-center rounded-xl bg-sky-50 text-[#0284C7]"><Icon className="size-5" /></span>
                <div>
                  <h4 className="text-sm font-black text-[#0F4C81]">{s.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={(r) => (window.location.href = `/${r}`)} />
      <AccountsTreeModal isOpen={isAccountsTreeOpen} onClose={() => setIsAccountsTreeOpen(false)} />
    </div>
  );
}

export default Index;
