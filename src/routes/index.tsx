import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Fingerprint,
  Link2,
  Menu,
  MousePointerClick,
  Package,
  PackageCheck,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل | وسيط الشراء والاستيراد المعتمد في اليمن" },
      {
        name: "description",
        content:
          "تسوق عالمياً من شي إن وأمازون وعلي إكسبريس وتيمو وترينديول واستلم عند باب بيتك في اليمن.",
      },
      { property: "og:title", content: "السوق الشامل - وسيطكم العالمي في اليمن" },
      {
        property: "og:description",
        content: "اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

/* ========================================================
   1. الشعار الرسمي المتطابق مع الهوية
======================================================== */
function AlShamelLogo() {
  return (
    <a href="/" className="flex items-center gap-2.5 group">
      {/* أيقونة عربة التسوق AS مع العجلات والنجمة الذهبية */}
      <div className="relative size-11 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* مقبض وهيكل العربة */}
          <path
            d="M 18 24 L 28 24 L 38 64 L 78 64 L 86 36 L 32 36"
            fill="none"
            stroke="#0F4C81"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* حرف A & S متداخل في العربة */}
          <path
            d="M 44 38 L 52 58 L 47 58 L 45 52 L 40 52"
            fill="none"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 64 42 C 60 38 52 40 54 47 C 56 53 66 51 64 58 C 62 62 54 62 50 58"
            fill="none"
            stroke="#EA580C"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* العجلات البرتقالية */}
          <circle cx="42" cy="76" r="8" fill="#EA580C" />
          <circle cx="42" cy="76" r="3" fill="#FFFFFF" />
          <circle cx="74" cy="76" r="8" fill="#EA580C" />
          <circle cx="74" cy="76" r="3" fill="#FFFFFF" />
          {/* النجمة الذهبية العلوية */}
          <polygon
            points="76,14 78,20 84,20 79,24 81,30 76,26 71,30 73,24 68,20 74,20"
            fill="#F59E0B"
          />
        </svg>
      </div>

      {/* نصوص الشعار باللونين الأزرق والبرتقالي */}
      <div className="flex flex-col text-right leading-tight">
        <div className="flex items-baseline gap-1 font-black text-sm tracking-tight">
          <span className="text-[#EA580C]">SHOPPING</span>
          <span className="text-[#0F4C81]">AL SHAMEL</span>
        </div>
        <span className="text-[10px] font-bold text-[#0284C7] tracking-wider">
          السوق الشامل • وسيطكم العالمي
        </span>
      </div>
    </a>
  );
}

/* ========================================================
   2. القائمة الجانبية السريعة
======================================================== */
function QuickSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  const links = [
    { label: "اطلب الآن (طلب جديد)", href: "/new-order", icon: ShoppingCart },
    { label: "تتبع شحنتك", href: "/track", icon: Search },
    { label: "حسابي الشخصي", href: "/my-account", icon: User },
    { label: "لوحة تحكم العمليات", href: "/admin", icon: PackageCheck },
    { label: "النظام المالي والمحاسبي", href: "/accounts", icon: CircleDollarSign },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-72 bg-white text-[#0A2540] p-5 shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <AlShamelLogo />
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="space-y-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 text-sm font-bold text-slate-700 hover:text-[#0F4C81] transition"
                >
                  <Icon className="size-4 text-[#EA580C]" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
        <div className="border-t pt-3 text-center text-xs text-slate-400">
          السوق الشامل © 2026 - وسيطكم العالمي في اليمن
        </div>
      </aside>
    </div>
  );
}

/* ========================================================
   3. الصفحة الرئيسية كاملة
======================================================== */
export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("زين مطيع");
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "زين مطيع";
        setUserName(name);
      }
    });
  }, []);

  const stores = [
    { name: "AliExpress", color: "text-[#E62E04]" },
    { name: "Amazon", color: "text-[#FF9900]" },
    { name: "SHEIN", color: "text-black font-black tracking-wider" },
    { name: "TrendYol", color: "text-[#F27A1A]" },
    { name: "TEMU", color: "text-[#FB5514]" },
  ];

  const steps = [
    {
      step: 1,
      title: "أرسل الرابط",
      desc: "انسخ رابط المنتج من أي متجر عالمي",
      icon: Link2,
    },
    {
      step: 2,
      title: "اعرف السعر",
      desc: "نوضح لك التكلفة بالريال اليمني أو الدولار",
      icon: CircleDollarSign,
    },
    {
      step: 3,
      title: "نشتري لك",
      desc: "نشتري بدلاً عنك ونضمن جودة وتطابق الطلب",
      icon: ShoppingCart,
    },
    {
      step: 4,
      title: "تابع الشحنة",
      desc: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع",
      icon: Search,
    },
    {
      step: 5,
      title: "الاستلام",
      desc: "توصيل موثوق حتى باب بيتك في كافة المحافظات",
      icon: Package,
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-[#0A2540] font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
      <QuickSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* ========================================================
          الهيدر العلوي الأبيض الناصع
      ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* اليمين: زر القائمة ☰ والشعار الرسمي */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="القائمة الرئيسية"
              className="size-10 sm:size-11 rounded-xl bg-[#00629B] hover:bg-[#005080] text-white flex flex-col items-center justify-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <span className="w-5 h-0.5 bg-white rounded-full"></span>
              <span className="w-5 h-0.5 bg-white rounded-full"></span>
              <span className="w-5 h-0.5 bg-white rounded-full"></span>
            </button>
            <AlShamelLogo />
          </div>

          {/* اليسار: شارة المستخدم، أيقونات التنبيهات، وزر اطلب الآن */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* شارة المستخدم متصل */}
            <a
              href="/my-account"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50/60 text-xs font-bold text-[#0F4C81] hover:bg-sky-100/70 transition"
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{userName}</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600 font-semibold">متصل</span>
            </a>

            {/* أيقونة الحساب */}
            <a
              href="/my-account"
              aria-label="حسابي"
              className="size-9 rounded-full border border-slate-200 bg-slate-50 grid place-items-center text-slate-600 hover:text-[#0F4C81] hover:bg-white transition"
            >
              <User className="size-4" />
            </a>

            {/* أيقونة التنبيهات */}
            <a
              href="/notifications"
              aria-label="الإشعارات"
              className="relative size-9 rounded-full border border-slate-200 bg-slate-50 grid place-items-center text-slate-600 hover:text-[#EA580C] hover:bg-white transition"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#EA580C] ring-2 ring-white"></span>
            </a>

            {/* زر اطلب الآن البرتقالي الفاخر */}
            <a
              href="/new-order"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              <ShoppingCart className="size-4" />
              <span>اطلب الآن</span>
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================
          البنر الداكن المقوس الفاخر (Hero Card)
      ======================================================== */}
      <section className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0A2540] via-[#0D2A4A] to-[#081A2C] text-white p-6 sm:p-10 shadow-xl overflow-hidden border border-sky-950/40">
          
          {/* تأثيرات الإضاءة الخلفية */}
          <div className="absolute -top-24 -right-24 size-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 size-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* الجهة اليمنى: الخطوات العلوية المصغرة + العنوان الرئيسي وأزرار الطلب والتتبع */}
            <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
              
              {/* أيقونات الإجراءات الثلاث المستديرة بالأعلى */}
              <div className="flex items-center gap-4">
                <a href="/my-account" className="flex flex-col items-center gap-1 group">
                  <div className="size-11 rounded-full bg-white/10 group-hover:bg-white/20 border border-white/15 grid place-items-center transition">
                    <User className="size-5 text-sky-200" />
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">حسابي</span>
                </a>

                <a href="/new-order" className="flex flex-col items-center gap-1 group">
                  <div className="size-11 rounded-full bg-white/10 group-hover:bg-white/20 border border-white/15 grid place-items-center transition">
                    <ShoppingBag className="size-5 text-sky-200" />
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">الطلب</span>
                </a>

                <a href="/track" className="flex flex-col items-center gap-1 group">
                  <div className="size-11 rounded-full bg-white/10 group-hover:bg-white/20 border border-white/15 grid place-items-center transition">
                    <Truck className="size-5 text-sky-200" />
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">الشحن</span>
                </a>
              </div>

              {/* العنوان والوصف الرئيسي */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>كيف تطلب؟</span>
                  <span className="text-[#EA580C] text-4xl">؟</span>
                </h1>
                <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                  انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك.
                </p>
              </div>

              {/* زرا الطلب والتتبع داخل البنر */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="/new-order"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-sm font-black shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  <MousePointerClick className="size-4" />
                  <span>اضغط هنا لطلب منتج</span>
                </a>

                <a
                  href="/track"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/20 text-white text-sm font-bold transition cursor-pointer"
                >
                  <Search className="size-4 text-sky-300" />
                  <span>تتبع شحنة سابقة</span>
                </a>
              </div>
            </div>

            {/* الجهة اليسرى: هوية السوق الشامل + صندوق الفيديو + شارة الضمان */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start space-y-5 lg:border-r lg:border-white/10 lg:pr-8">
              
              {/* بطاقة الشعار والوصف */}
              <div className="text-center lg:text-right">
                <div className="inline-flex items-center gap-2 mb-1">
                  <span className="text-xl font-black text-white">السوق الشامل</span>
                  <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-md">
                    AL SHAMEL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية
                </p>
              </div>

              {/* صندوق الفيديو البرتقالي المتوهج */}
              <div className="relative group cursor-pointer">
                <div className="size-20 sm:size-24 rounded-2xl bg-gradient-to-tr from-[#EA580C] to-[#FB923C] p-1 shadow-xl shadow-orange-600/30 ring-4 ring-white/10 group-hover:scale-105 transition flex items-center justify-center">
                  <div className="size-10 sm:size-12 rounded-full bg-white grid place-items-center shadow-inner">
                    <Play className="size-5 text-[#EA580C] fill-[#EA580C] translate-x-[-1px]" />
                  </div>
                </div>
              </div>

              {/* شارة الضمان 100% */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                <ShieldCheck className="size-4 text-sky-400" />
                <span>ضمان استرجاع 100% في حال عدم مطابقة المنتج</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          قسم: تسوق عالمياً، واستلم محلياً
      ======================================================== */}
      <section className="max-w-4xl mx-auto px-4 pt-10 text-center">
        {/* شارة الخدمة الأولى */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/70 border border-sky-200 text-xs font-bold text-[#0F4C81] mb-3">
          <Sparkles className="size-3.5 text-amber-500" />
          <span>خدمة الشراء والوساطة الأولى في اليمن</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight">
          تسوّق عالمياً، واستلم محلياً
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية
        </p>

        {/* شريط فاصل: نستورد لك من أشهر المتاجر العالمية */}
        <div className="flex items-center justify-center gap-3 my-6">
          <span className="w-12 h-0.5 bg-[#EA580C] rounded-full"></span>
          <span className="text-xs font-bold text-slate-600">نستورد لك من أشهر المتاجر العالمية</span>
          <span className="w-12 h-0.5 bg-[#EA580C] rounded-full"></span>
        </div>

        {/* بطاقات المتاجر العالمية الخمسة */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-w-3xl mx-auto">
          {stores.map((st) => (
            <div
              key={st.name}
              className="bg-white rounded-2xl py-4 px-3 border border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-1 transition text-center cursor-pointer"
            >
              <span className={`text-sm sm:text-base font-black ${st.color}`}>
                {st.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          شبكة الخطوات الخمس (2 + 2 + 1)
      ======================================================== */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        <div className="space-y-3">
          {/* الصف الأول: خطوة 1 + خطوة 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* خطوة 1 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-50 text-[#0284C7] grid place-items-center">
                  <Link2 className="size-5" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0A2540]">أرسل الرابط</h3>
                    <span className="text-[10px] font-bold bg-amber-50 text-[#EA580C] px-1.5 py-0.5 rounded">
                      خطوة 1
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">انسخ رابط المنتج من أي متجر عالمي</p>
                </div>
              </div>
            </div>

            {/* خطوة 2 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-50 text-[#0284C7] grid place-items-center">
                  <CircleDollarSign className="size-5" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0A2540]">اعرف السعر</h3>
                    <span className="text-[10px] font-bold bg-amber-50 text-[#EA580C] px-1.5 py-0.5 rounded">
                      خطوة 2
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">نوضح لك التكلفة بالريال اليمني أو الدولار</p>
                </div>
              </div>
            </div>
          </div>

          {/* الصف الثاني: خطوة 3 + خطوة 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* خطوة 3 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-50 text-[#0284C7] grid place-items-center">
                  <ShoppingCart className="size-5" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0A2540]">نشتري لك</h3>
                    <span className="text-[10px] font-bold bg-amber-50 text-[#EA580C] px-1.5 py-0.5 rounded">
                      خطوة 3
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">نشتري بدلاً عنك ونضمن جودة وتطابق الطلب</p>
                </div>
              </div>
            </div>

            {/* خطوة 4 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-50 text-[#0284C7] grid place-items-center">
                  <Search className="size-5" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0A2540]">تابع الشحنة</h3>
                    <span className="text-[10px] font-bold bg-amber-50 text-[#EA580C] px-1.5 py-0.5 rounded">
                      خطوة 4
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">تتبع مسار شحنتك لحظة بلحظة برقم التتبع</p>
                </div>
              </div>
            </div>
          </div>

          {/* الصف الثالث (بالمنتصف): خطوة 5 */}
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-50 text-[#0284C7] grid place-items-center">
                  <Package className="size-5" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0A2540]">الاستلام</h3>
                    <span className="text-[10px] font-bold bg-amber-50 text-[#EA580C] px-1.5 py-0.5 rounded">
                      خطوة 5
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">توصيل موثوق حتى باب بيتك في كافة المحافظات</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* زرا الإجراءات السفلية: تتبع شحنتك الآن + اطلب الآن فوراً */}
        <div className="flex items-center justify-center gap-3 pt-6">
          <a
            href="/track"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:border-[#0284C7] hover:text-[#0F4C81] transition shadow-sm"
          >
            <Search className="size-4 text-[#0284C7]" />
            <span>تتبع شحنتك الآن</span>
          </a>

          <a
            href="/new-order"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#004B87] hover:bg-[#003866] text-white text-xs sm:text-sm font-black shadow-md shadow-sky-900/20 hover:-translate-y-0.5 transition"
          >
            <ShoppingCart className="size-4" />
            <span>اطلب الآن فوراً</span>
          </a>
        </div>
      </section>

      {/* ========================================================
          قسم: آراء وتجارب عملائنا الكرام
      ======================================================== */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#0A2540]">
            آراء وتجارب عملائنا الكرام
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* الرأي 1 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between text-center">
            <div className="flex justify-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "اشتريت لعبتين للأولاد من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت بدون أي عناء."
            </p>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-bold text-slate-500">
              أم أحمد • صنعاء
            </div>
          </div>

          {/* الرأي 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between text-center">
            <div className="flex justify-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعدن! خدمة ممتازة وتجاوب فوري عبر الواتساب."
            </p>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-bold text-slate-500">
              أحمد ناصر • عدن
            </div>
          </div>

          {/* الرأي 3 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between text-center">
            <div className="flex justify-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية."
            </p>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-bold text-slate-500">
              ياسر باعبيد • حضرموت
            </div>
          </div>
        </div>
      </section>

      {/* فوتر بسيط */}
      <footer className="border-t border-slate-100 bg-white py-6 text-center text-xs text-slate-400">
        السوق الشامل (AL SHAMEL SHOPPING) • جميع الحقوق محفوظة © 2026
      </footer>
    </div>
  );
}
