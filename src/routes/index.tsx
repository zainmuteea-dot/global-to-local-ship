import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  FileText,
  Hand,
  UserRound,
  UserCheck,
  LogIn,
  Coins,
  FolderTree,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HOME_NOTIFICATIONS = [
  { title: 'شحنتك وصلت إلى صنعاء', text: 'طلبك جاهز الآن للتسليم إلى عنوانك.', href: '/track', icon: PackageCheck, tone: 'bg-sky-100 text-sky-700' },
  { title: 'تم تأكيد عملية الشراء', text: 'جاري تجهيز طلبك من المتجر العالمي.', href: '/account/orders', icon: ShoppingBag, tone: 'bg-orange-100 text-orange-700' },
  { title: 'عرض وساطة حصري متاح لك', text: 'استفد من التخفيضات اليومية على أجور الشحن.', href: '/prices', icon: Sparkles, tone: 'bg-amber-100 text-amber-700' },
  { title: 'رسالة جديدة من فريق الدعم', text: 'يمكنك التواصل معنا لمتابعة آخر تفاصيل طلبك.', href: '/my-account', icon: Bell, tone: 'bg-emerald-100 text-emerald-700' },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل | وسيط الشراء والاستيراد المعتمد في اليمن" },
      {
        name: "description",
        content:
          "تسوق عالمياً من شي إن وأمازون وعلي إكسبريس وتيمو وترينديول واستلم عند باب بيتك في اليمن.",
      },
    ],
  }),
  component: HomePage,
});

/* =========================================================================
   1. AlShamelLogo: شعار السوق الشامل (AL SHAMEL SHOPPING) الأزرق والبرتقالي
   ========================================================================= */
export const AlShamelLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}> = ({ size = 'md', showText = true, variant = 'light', className = '' }) => {
  const iconSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 🌟 أيقونة عربة التسوق AS + النجمة البرتقالية */}
      <div className={`relative ${iconSizeMap[size]} shrink-0 transition-transform duration-300 hover:scale-105`}>
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            {/* التدرج الأزرق الملكي */}
            <linearGradient id="routeAsBlue" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#29B6F6" />
              <stop offset="35%" stopColor="#0284C7" />
              <stop offset="70%" stopColor="#0F4C81" />
              <stop offset="100%" stopColor="#0A2540" />
            </linearGradient>

            {/* التدرج البرتقالي الناري */}
            <linearGradient id="routeAsOrange" x1="40" y1="60" x2="160" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="30%" stopColor="#FB923C" />
              <stop offset="75%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>

            {/* تدرج النجمة الذهبية */}
            <linearGradient id="routeStarGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>

          {/* مسار النجمة العلوية */}
          <path
            d="M 108 42 C 122 48, 140 48, 152 38"
            stroke="url(#routeAsBlue)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* النجمة الخماسية البرتقالية */}
          <path
            d="M 158 35 L 160.5 40 L 166 40.5 L 162 44 L 163.5 49.5 L 158 46.5 L 152.5 49.5 L 154 44 L 150 40.5 L 155.5 40 Z"
            fill="url(#routeStarGrad)"
          />

          {/* مقبض العربة الأزرق */}
          <path
            d="M 44 42 C 48 42, 53 43, 56 47 C 60 52, 62 60, 68 76 L 76 96"
            stroke="url(#routeAsBlue)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* سلة التسوق - ضلع حرف A البرتقالي */}
          <path
            d="M 68 56 L 80 56 C 84 56, 92 68, 96 74 L 122 110"
            stroke="url(#routeAsOrange)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* حرف A الأزرق الملكي */}
          <path
            d="M 68 96 L 96 38 C 98 34, 102 34, 104 38 L 132 94"
            stroke="url(#routeAsBlue)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* إطار السلة العلوي الأزرق */}
          <path
            d="M 114 56 L 148 56 C 152 56, 155 60, 153 64 L 144 86"
            stroke="url(#routeAsBlue)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* انحناءة حرف S البرتقالي */}
          <path
            d="M 144 86 C 142 98, 126 102, 114 102 C 90 102, 80 118, 96 124 L 134 124 C 144 124, 148 116, 146 108"
            stroke="url(#routeAsOrange)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 104 38 C 120 38, 138 48, 142 66 C 144 78, 132 86, 116 88 L 94 90"
            stroke="url(#routeAsBlue)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* قاعدة العربة السفلية */}
          <path
            d="M 68 126 C 64 126, 60 128, 60 133 C 60 138, 64 140, 72 140 L 136 140 C 142 140, 146 136, 146 130"
            stroke="url(#routeAsBlue)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* العجلة اليسرى (برتقالي + مركز أبيض) */}
          <circle cx="82" cy="154" r="14" fill="url(#routeAsOrange)" />
          <circle cx="82" cy="154" r="6" fill="#FFFFFF" />

          {/* العجلة اليمنى (برتقالي + مركز أبيض) */}
          <circle cx="128" cy="154" r="14" fill="url(#routeAsOrange)" />
          <circle cx="128" cy="154" r="6" fill="#FFFFFF" />
        </svg>
      </div>

      {/* كتابة الشعار: AL SHAMEL SHOPPING */}
      {showText && (
        <div className="flex flex-col items-start leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-lg sm:text-xl ${
                isDark ? 'text-white' : 'text-[#0F4C81]'
              }`}
            >
              AL SHAMEL
            </span>
            <span className="font-extrabold text-lg sm:text-xl text-[#F97316]">
              SHOPPING
            </span>
          </div>
          <span
            className={`text-xs font-bold mt-0.5 tracking-wide ${
              isDark ? 'text-sky-200' : 'text-[#0284C7]'
            }`}
          >
            السوق الشامل • وسيطكم العالمي
          </span>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   2. QuickSidebar: القائمة الجانبية السريعة (3 شرطات)
   ========================================================================= */
export const QuickSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: any;
}> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10" dir="rtl">
        <div className="w-80 sm:w-96 bg-[#0B2545] text-white shadow-2xl flex flex-col border-l border-sky-900/50 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 bg-[#07192F] border-b border-sky-800/40 flex items-center justify-between">
            <AlShamelLogo size="sm" showText={true} variant="dark" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-200 hover:text-white transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* User Status */}
          <div className="px-4 py-2.5 bg-[#091F3A] border-b border-sky-800/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">
                {user?.user_metadata?.full_name || 'زين مطيع'}
              </span>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                متصل 🟢
              </span>
            </div>
            <span className="text-[11px] text-sky-300 font-mono">ID: #92841</span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            <a
              href="/"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold bg-[#0F4C81] text-white shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="size-4 text-orange-400" />
                <span>الرئيسية (متجر السوق الشامل)</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-60" />
            </a>

            <a
              href="/new-order"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sky-100 hover:bg-sky-900/60 transition"
            >
              <div className="flex items-center gap-2.5">
                <MousePointerClick className="size-4 text-orange-400" />
                <span>طلب جديد (اطلب الآن)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold">
                فوري
              </span>
            </a>

            <a
              href="/track"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sky-100 hover:bg-sky-900/60 transition"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="size-4 text-sky-400" />
                <span>تتبع الطلبات والشحنات</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-60" />
            </a>

            <a
              href="/my-account"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sky-100 hover:bg-sky-900/60 transition"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="size-4 text-emerald-400" />
                <span>حسابي وإدارة العمليات</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-60" />
            </a>

            <a
              href="/accounting"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sky-100 hover:bg-sky-900/60 transition"
            >
              <div className="flex items-center gap-2.5">
                <Coins className="size-4 text-emerald-400" />
                <span>النظام المالي والمحاسبي</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300">3 عملات</span>
            </a>

            <a
              href="/orders"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sky-100 hover:bg-sky-900/60 transition"
            >
              <div className="flex items-center gap-2.5">
                <PackageCheck className="size-4 text-sky-400" />
                <span>لوحة عمليات الشحن والفرز</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                إدارة
              </span>
            </a>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-[#07192F] border-t border-sky-800/40 text-center text-[11px] text-sky-300">
            السوق الشامل — وسيطكم المعتمد للشراء من العالم
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. HomePage: المكون الرئيسي لصفحة البداية بالهوية الجديدة
   ========================================================================= */
export function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customerName, setCustomerName] = useState('زين مطيع');
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNotificationBarVisible, setIsNotificationBarVisible] = useState(true);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  useEffect(() => {
    // جلب المستخدم من Supabase إن وجد
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        if (data.user.user_metadata?.["full_name"]) {
          setCustomerName(data.user.user_metadata["full_name"]);
        }
      }
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNotificationIndex((current) => (current + 1) % HOME_NOTIFICATIONS.length);
      setShowNotificationToast(true);
      window.setTimeout(() => setShowNotificationToast(false), 4200);
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  const activeNotification = HOME_NOTIFICATIONS[notificationIndex] ?? HOME_NOTIFICATIONS[0]!;
  const ActiveNotificationIcon = activeNotification.icon;
  const heroCircles = [
    { label: user ? 'حسابي' : 'التسجيل', icon: UserRound, href: '/my-account' },
    { label: 'الطلب', icon: Hand, href: '/new-order' },
    { label: 'الشحن', icon: FileText, href: '/track' },
  ];

  const platforms = [
    { name: 'TEMU', color: 'text-[#FA6400]', border: 'hover:border-[#FA6400]/40' },
    { name: 'TrendYol', color: 'text-[#F27A1A]', border: 'hover:border-[#F27A1A]/40' },
    { name: 'SHEIN', color: 'text-zinc-900', border: 'hover:border-zinc-800/40' },
    { name: 'Amazon', color: 'text-[#FF9900]', border: 'hover:border-[#FF9900]/40' },
    { name: 'AliExpress', color: 'text-[#FF4747]', border: 'hover:border-[#FF4747]/40' },
  ];

  const steps = [
    { title: 'أرسل الرابط', desc: 'انسخ رابط المنتج من أي متجر عالمي', icon: Link2, color: 'text-[#0284C7]' },
    { title: 'اعرف السعر', desc: 'نوضح لك التكلفة بالريال اليمني أو الدولار', icon: CircleDollarSign, color: 'text-[#F97316]' },
    { title: 'نشتري لك', desc: 'نشتري بدلاً عنك ونضمن جودة وتطابق الطلب', icon: ShoppingCart, color: 'text-[#0284C7]' },
    { title: 'تابع الشحنة', desc: 'تتبع مسار شحنتك لحظة بلحظة برقم التتبع', icon: Search, color: 'text-[#F97316]' },
    { title: 'الاستلام', desc: 'توصيل موثوق حتى باب بيتك في كافة المحافظات', icon: Package, color: 'text-[#0284C7]' },
  ];

  const testimonials = [
    { name: 'يوسف الحيفي', city: 'صنعاء', text: 'اشتريت لعبتين للأولاد من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت بدون أي عناء.' },
    { name: 'أمة الحكيمي', city: 'عدن', text: 'وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعدن! خدمة ممتازة وتجاوب فوري عبر الواتساب.' },
    { name: 'ياسر باشديد', city: 'حضرموت', text: 'التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية.' },
  ];

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans selection:bg-[#0284C7] selection:text-white"
    >
      {isNotificationBarVisible && (
        <div className="sticky top-0 z-40 border-b border-orange-200/70 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-md sm:px-4">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-xs">
            <span className="relative flex size-2.5 shrink-0"><span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-orange-500" /></span>
            <span className="hidden rounded-full bg-orange-100 px-2.5 py-1 font-black text-orange-700 sm:inline">إشعار فوري</span>
            <div className="min-w-0 flex-1 truncate text-right"><span className="font-black text-[#0A2540]">{activeNotification.title}</span><span className="mr-2 hidden text-slate-500 md:inline">{activeNotification.text}</span></div>
            <a href={activeNotification.href} className="hidden shrink-0 items-center gap-1 rounded-xl bg-[#0F4C81] px-3 py-1.5 font-black text-white transition hover:bg-[#0A2540] sm:inline-flex">تتبع الشحنة <ChevronLeft className="size-3.5" /></a>
            <button onClick={() => setNotificationIndex((current) => (current - 1 + HOME_NOTIFICATIONS.length) % HOME_NOTIFICATIONS.length)} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-orange-50 hover:text-orange-600" aria-label="الإشعار السابق"><ChevronRight className="size-4" /></button>
            <button onClick={() => setNotificationIndex((current) => (current + 1) % HOME_NOTIFICATIONS.length)} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-orange-50 hover:text-orange-600" aria-label="الإشعار التالي"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setIsNotificationBarVisible(false)} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="إغلاق الإشعار"><X className="size-4" /></button>
          </div>
        </div>
      )}

      {/* 🌟 هيدر المتجر مع شعار AL SHAMEL SHOPPING الرسمي الجديد */}
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-6 pb-2">
        <div className="flex items-center gap-3">
          {/* زر القائمة الجانبية (3 شرطات) بالأزرق والبرتقالي */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            title="القائمة الجانبية (3 شرطات)"
            className="flex flex-col justify-center items-center gap-1.5 size-12 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] hover:from-[#0A2540] hover:to-[#0F4C81] text-white shadow-md hover:scale-105 active:scale-95 transition-all ring-2 ring-sky-300/50 group shrink-0 cursor-pointer"
          >
            <span className="w-6 h-1 rounded-full bg-white group-hover:bg-orange-300 transition-all" />
            <span className="w-6 h-1 rounded-full bg-orange-400 group-hover:bg-white transition-all" />
            <span className="w-6 h-1 rounded-full bg-white group-hover:bg-orange-300 transition-all" />
          </button>

          {/* شعار السوق الشامل */}
          <AlShamelLogo size="md" showText={true} />
        </div>

        {/* جهة اليسار: الإشعارات وزر اطلب الآن */}
        <div className="relative flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button onClick={() => setIsNotificationOpen((open) => !open)} className="relative grid size-11 place-items-center rounded-2xl bg-white text-[#0F4C81] ring-1 ring-sky-200 shadow-sm transition hover:scale-105 hover:bg-sky-50" title="الإشعارات" aria-expanded={isNotificationOpen}>
            <Bell className="size-5" />
            <span className="absolute -right-1 -top-1 grid size-5 animate-pulse place-items-center rounded-full bg-orange-500 text-[10px] font-black text-white ring-2 ring-white">{HOME_NOTIFICATIONS.length}</span>
          </button>
          {isNotificationOpen && (
            <div className="absolute left-0 top-14 z-50 w-[min(calc(100vw-32px),340px)] overflow-hidden rounded-2xl border border-sky-100 bg-white p-2 text-right shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2"><span className="text-xs font-black text-[#0A2540]">آخر التنبيهات</span><button onClick={() => setIsNotificationOpen(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">إغلاق</button></div>
              <div className="space-y-1 pt-2">{HOME_NOTIFICATIONS.map((notification) => { const Icon = notification.icon; return <a key={notification.title} href={notification.href} className="flex items-start gap-2 rounded-xl p-2 transition hover:bg-slate-50"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${notification.tone}`}><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-xs font-black text-[#0A2540]">{notification.title}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{notification.text}</span></span></a>; })}</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2"><button onClick={() => setIsNotificationOpen(false)} className="rounded-xl bg-[#0F4C81] px-2 py-2 text-[10px] font-black text-white">تحديد الكل كمقروء</button><a href={activeNotification.href} className="rounded-xl bg-orange-50 px-2 py-2 text-center text-[10px] font-black text-orange-700">تتبع الشحنة</a><button onClick={() => setIsNotificationOpen(false)} className="rounded-xl bg-slate-100 px-2 py-2 text-[10px] font-black text-slate-600">مسح الكل</button></div>
            </div>
          )}

          <a
            href="/my-account"
            className="grid size-11 place-items-center rounded-2xl bg-white text-[#0F4C81] ring-1 ring-sky-200 shadow-sm transition hover:scale-105 hover:bg-sky-50"
            title="حسابي"
          >
            <User className="size-5" />
          </a>

          <a
            href="/new-order"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] px-5 py-2.5 font-black text-xs sm:text-sm text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:scale-95 ring-2 ring-orange-300/40"
          >
            <ShoppingCart className="size-4 text-white" />
            <span>اطلب الآن</span>
          </a>
        </div>
      </header>

      {showNotificationToast && (
        <div className="fixed left-4 right-4 top-16 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-orange-200 bg-white p-3 text-right shadow-2xl animate-in slide-in-from-top-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${activeNotification.tone}`}><ActiveNotificationIcon className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[#0A2540]">{activeNotification.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{activeNotification.text}</p></div>
          <a href={activeNotification.href} className="shrink-0 rounded-xl bg-orange-500 px-2.5 py-2 text-[10px] font-black text-white">تتبع</a>
          <button onClick={() => setShowNotificationToast(false)} aria-label="إغلاق التنبيه"><X className="size-4 text-slate-400" /></button>
        </div>
      )}

      {/* 🌟 بنر الهيدر الكبير (كيف تطلب؟؟) بألوان الشعار: كحلي محيطي مع لمسات برتقالية */}
      <section className="px-4 pt-4">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A2540] via-[#0F4C81] to-[#134074] p-6 text-white ring-1 ring-sky-400/20 shadow-2xl sm:p-8">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-60 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-60 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

          {/* الأيقونات الثلاث + اسم السوق الشامل */}
          <div className="relative flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
            <div className="flex items-start gap-3 sm:gap-4">
              {heroCircles.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-1.5 transition hover:scale-105 active:scale-95 group"
                >
                  <span className="grid size-12 place-items-center rounded-2xl ring-2 ring-sky-300/30 bg-white/10 group-hover:bg-white/20 transition-all shadow-md">
                    <Icon className="size-5 text-orange-400 group-hover:text-orange-300" />
                  </span>
                  <span className="text-xs font-bold text-sky-200 group-hover:text-white">{label}</span>
                </a>
              ))}
            </div>

            <div className="text-start">
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-white sm:text-3xl">
                  السوق الشامل
                </span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/40 text-[11px] font-black">
                  AL SHAMEL
                </span>
              </div>
              <p className="text-xs text-sky-200/90 mt-1 font-medium">
                وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية
              </p>
            </div>
          </div>

          {/* عنوان "كيف تطلب؟؟" مع زر تشغيل الفيديو البرتقالي المتوهج */}
          <div className="relative mt-8 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end justify-between">
            <div className="flex-1 text-center sm:text-start">
              <p className="text-3xl font-black leading-tight text-white sm:text-4xl">
                كيف تطلب؟<span className="text-orange-400 animate-pulse">؟</span>
              </p>
              <p className="text-xs sm:text-sm text-sky-200/90 mt-2 max-w-md">
                انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك
              </p>
            </div>

            {/* زر تشغيل الفيديو البرتقالي */}
            <div className="relative shrink-0">
              <a
                href="/new-order"
                className="grid size-20 place-items-center rounded-2xl bg-gradient-to-tr from-[#F97316] via-[#EA580C] to-[#FB923C] ring-4 ring-white/30 sm:size-24 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-orange-500/40 group cursor-pointer"
                title="شاهد كيف تطلب"
              >
                <span className="grid size-10 place-items-center rounded-full bg-white text-[#EA580C] shadow-md group-hover:scale-105 transition-transform">
                  <Play className="size-5 ml-0.5 fill-current" />
                </span>
              </a>
            </div>
          </div>

          {/* أزرار العمليات السفلية */}
          <div className="relative mt-7 flex flex-wrap items-center gap-3 pt-4 border-t border-sky-500/20">
            <a
              href="/new-order"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] px-7 py-3 font-black text-sm sm:text-base text-white shadow-lg shadow-orange-500/40 ring-2 ring-orange-300/40 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <Hand className="size-5 -scale-x-100 text-white" />
              <span>اضغط هنا لطلب منتج</span>
            </a>

            <a
              href="/track"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 font-bold text-xs sm:text-sm text-white transition hover:-translate-y-0.5 backdrop-blur-xs"
            >
              <Search className="size-4 text-orange-300" />
              <span>تتبع شحنة سابقة</span>
            </a>

            <div className="mr-auto hidden lg:flex items-center gap-2 text-xs text-sky-200 font-bold bg-white/10 px-3.5 py-2 rounded-xl border border-sky-400/20">
              <ShieldCheck className="size-4 text-orange-400" />
              <span>ضمان استرجاع 100% في حال عدم مطابقة المنتج</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 تسوق عالمياً واستلم محلياً */}
      <section className="px-4 pb-2 pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-[#0F4C81] text-xs font-bold mb-2">
          <Sparkles className="size-3.5 text-orange-500" />
          <span>خدمة الشراء والوساطة الأولى في اليمن</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black leading-snug text-[#0F4C81]">
          تسوّق عالمياً، واستلم محلياً
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#475569] max-w-lg mx-auto">
          اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية
        </p>
      </section>

      {/* 🌟 شعارات المتاجر العالمية */}
      <section className="px-4 pt-6">
        <p className="mb-4 text-center text-xs font-bold text-[#0F4C81] flex items-center justify-center gap-2">
          <span className="w-8 h-0.5 bg-orange-400 rounded-full" />
          <span>نستورد لك من أشهر المتاجر العالمية</span>
          <span className="w-8 h-0.5 bg-orange-400 rounded-full" />
        </p>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 sm:gap-4" dir="ltr">
          {platforms.map((p) => (
            <div
              key={p.name}
              className={`grid size-20 place-items-center rounded-2xl bg-white text-center font-black text-sm shadow-sm border border-sky-100 hover:shadow-md transition-all duration-200 hover:-translate-y-1 sm:size-24 sm:text-base ${p.color} ${p.border}`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 خطوات الشراء الـ 5 */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="grid gap-3.5 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const last = i === steps.length - 1;
            return (
              <a
                key={s.title}
                href={s.title === 'تابع الشحنة' ? '/track' : '/new-order'}
                className={`group flex items-center gap-3.5 rounded-2xl bg-white p-4 ring-1 ring-sky-100 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#0284C7]/50 active:scale-95 text-right ${
                  last ? 'sm:col-span-2 sm:mx-auto sm:w-2/3' : ''
                }`}
              >
                <span className="grid size-12 place-items-center rounded-xl bg-sky-50 text-[#0284C7] transition-all group-hover:bg-gradient-to-tr group-hover:from-[#0F4C81] group-hover:to-[#0284C7] group-hover:text-white shadow-xs">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-black text-[#0F4C81] transition-colors group-hover:text-[#0284C7] flex items-center gap-1.5">
                    <span>{s.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">
                      خطوة {i + 1}
                    </span>
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">{s.desc}</p>
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/track"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-black text-sm text-[#0F4C81] ring-1 ring-sky-200 shadow-sm hover:bg-sky-50 transition"
          >
            <Search className="size-4 text-orange-500" />
            <span>تتبع شحنتك الآن</span>
          </a>

          <a
            href="/new-order"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#0F4C81] hover:from-[#0A2540] hover:to-[#0284C7] px-8 py-3.5 font-black text-sm text-white shadow-lg shadow-sky-900/20 hover:shadow-xl transition"
          >
            <ShoppingCart className="size-4 text-orange-300" />
            <span>اطلب الآن فوراً</span>
          </a>
        </div>
      </section>

      {/* 🌟 آراء العملاء */}
      <section className="pb-12 pt-4">
        <h2 className="mb-5 text-center font-black text-xl text-[#0F4C81] flex items-center justify-center gap-2">
          <span>آراء وتجارب عملائنا الكرام</span>
          <span className="text-orange-500 text-sm">★★★★★</span>
        </h2>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 justify-center">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="w-68 shrink-0 rounded-2xl bg-white p-5 ring-1 ring-sky-100 shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-center text-orange-400 mb-2">★★★★★</div>
              <p className="text-xs leading-relaxed text-[#334155] text-center font-medium">"{t.text}"</p>
              <div className="mt-3 text-center border-t border-sky-50 pt-2">
                <p className="text-xs font-black text-[#0F4C81]">{t.name}</p>
                <p className="text-[10px] text-orange-600 font-bold">{t.city}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 تذييل الصفحة */}
      <footer className="pb-10 text-center border-t border-sky-100 pt-8 bg-white/70">
        <div className="flex justify-center mb-3">
          <AlShamelLogo size="sm" showText={true} />
        </div>
        <p className="text-xs font-bold text-[#64748B]">وسيطكم المعتمد للشراء والاستيراد من كافة المتاجر العالمية</p>
        <p className="mt-1 text-[11px] text-[#94A3B8]">جميع الحقوق محفوظة © 2026 — AL SHAMEL SHOPPING</p>
      </footer>

      {/* القائمة الجانبية السريعة */}
      <QuickSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
      />
    </div>
  );
}

export default HomePage;
