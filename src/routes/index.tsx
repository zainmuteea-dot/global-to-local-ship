import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Fingerprint,
  Menu,
  MousePointerClick,
  PackageCheck,
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
  Phone,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HeroFlipping from "@/components/HeroFlipping";
import BestBackground from "@/components/BestBackground";
import StepsBest from "@/components/StepsBest";
import ReviewsBest from "@/components/ReviewsBest";

type HomeNotification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean | null;
  created_at: string;
  payment_id: string | null;
};

const notificationTone: Record<string, string> = {
  shipment: 'bg-sky-100 text-sky-700',
  purchase: 'bg-orange-100 text-orange-700',
  offer: 'bg-amber-100 text-amber-700',
  support: 'bg-emerald-100 text-emerald-700',
  system: 'bg-slate-100 text-slate-700',
  payment_approved: 'bg-emerald-100 text-emerald-700',
};

const notificationIcon = (type: string) => {
  if (type === 'shipment') return PackageCheck;
  if (type === 'purchase') return ShoppingBag;
  if (type === 'offer') return Sparkles;
  if (type === 'payment_approved') return CircleDollarSign;
  if (type === 'support') return ShieldCheck;
  return Bell;
};

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
  const [notifications, setNotifications] = useState<HomeNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // أبقِ حالة تسجيل الدخول متزامنة عند الدخول أو الخروج دون إعادة تحميل الصفحة.
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.error('تعذر قراءة جلسة المستخدم:', error);
      setUser(data?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setReadNotificationIds(new Set());
      setNotificationError(null);
      return;
    }

    let alive = true;
    const loadNotifications = async () => {
      const [notificationResult, readResult] = await Promise.all([
        (supabase.from('notifications') as any)
          .select('id,user_id,title,message,type,is_read,created_at,payment_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        (supabase.from('notification_reads' as never) as any)
          .select('notification_id')
          .eq('user_id', user.id),
      ]);
      if (!alive) return;

      if (notificationResult.error) {
        console.error('تعذر تحميل الإشعارات:', notificationResult.error);
        setNotificationError('تعذر تحميل الإشعارات الآن. حاول تحديث الصفحة.');
        setNotifications([]);
        return;
      }

      if (readResult.error) {
        console.error('تعذر تحميل سجل قراءة الإشعارات:', readResult.error);
        setNotificationError('ظهرت الإشعارات، لكن تعذر تحميل حالة قراءتها.');
      } else {
        setNotificationError(null);
      }

      // إشعار new_payment_submitted مخصص للإدارة، وليس جرس العميل.
      const customerRows = ((notificationResult.data ?? []) as HomeNotification[]).filter(
        (notification) => notification.type !== 'new_payment_submitted',
      );
      setNotifications(customerRows);
      if (!readResult.error) {
        setReadNotificationIds(new Set((readResult.data ?? []).map((row: any) => row.notification_id)));
      }
    };

    void loadNotifications();
    const channel = supabase
      .channel(`customer-notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const notification = payload.new as HomeNotification;
        // لا تعرض إشعارات الإدارة أو الإشعارات العامة/غير المرتبطة بهذا المستخدم.
        if (notification.user_id !== user.id || notification.type === 'new_payment_submitted') return;
        setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
        setShowNotificationToast(true);
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const activeNotification = notifications[0] ?? null;
  const unreadCount = notifications.filter((notification) => !readNotificationIds.has(notification.id)).length;

  const markNotificationRead = async (notificationId: string): Promise<boolean> => {
    if (!user) return false;
    if (readNotificationIds.has(notificationId)) return true;

    const { error } = await (supabase.from('notification_reads' as never) as any).upsert(
      { notification_id: notificationId, user_id: user.id },
      { onConflict: 'notification_id,user_id' },
    );

    if (error) {
      console.error('تعذر حفظ قراءة الإشعار:', error);
      setNotificationError('تعذر حفظ حالة القراءة. تحقق من الاتصال ثم حاول مجددًا.');
      return false;
    }

    setReadNotificationIds((current) => new Set(current).add(notificationId));
    setNotificationError(null);
    return true;
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    const unread = notifications.filter((notification) => !readNotificationIds.has(notification.id));
    if (unread.length === 0) return;

    const { error } = await (supabase.from('notification_reads' as never) as any).upsert(
      unread.map((notification) => ({ notification_id: notification.id, user_id: user.id })),
      { onConflict: 'notification_id,user_id' },
    );

    if (error) {
      console.error('تعذر حفظ قراءة الإشعارات:', error);
      setNotificationError('تعذر حفظ حالة القراءة. تحقق من الاتصال ثم حاول مجددًا.');
      return;
    }

    setReadNotificationIds((current) => {
      const next = new Set(current);
      unread.forEach((notification) => next.add(notification.id));
      return next;
    });
    setNotificationError(null);
  };

  const openNotification = async (notificationId: string) => {
    const saved = await markNotificationRead(notificationId);
    if (saved) window.location.assign('/notifications');
  };
  const heroCircles = [
    { label: user ? 'حسابي' : 'التسجيل', icon: UserRound, href: '/my-account' },
    { label: 'الطلب', icon: Hand, href: '/new-order' },
    { label: 'الشحن', icon: FileText, href: '/track' },
  ];

  const [productLink, setProductLink] = useState('');

  const startOrderWithLink = () => {
    const link = productLink.trim();
    if (link) {
      try { localStorage.setItem('alsouk_pending_link', link); } catch {}
    }
    window.location.assign('/new-order?step=link');
  };

  const platforms = [
    { name: 'TEMU', temu: true },
    { name: 'Trendyol' },
    { name: 'SHEIN' },
    { name: 'Amazon' },
    { name: 'AliExpress' },
  ];

  return (
    <div
      dir="rtl"
      lang="ar"
      className="relative min-h-screen overflow-hidden text-white font-sans selection:bg-[#F97316] selection:text-white"
    >
      <style>{`
@keyframes glowPulseFix {
 0% {
   box-shadow: 0 0 12px rgba(0,255,255,0.6), 0 0 22px rgba(255,122,0,0.5), 0 0 35px rgba(0,255,255,0.2);
   border-color: rgba(0,255,255,0.8);
 }
 50% {
   box-shadow: 0 0 25px rgba(0,255,255,1), 0 0 45px rgba(255,122,0,0.9), 0 0 65px rgba(255,122,0,0.4);
   border-color: rgba(255,160,0,1);
 }
 100% {
   box-shadow: 0 0 12px rgba(0,255,255,0.6), 0 0 22px rgba(255,122,0,0.5), 0 0 35px rgba(0,255,255,0.2);
   border-color: rgba(0,255,255,0.8);
 }
}
.card-fixed {
  animation: glowPulseFix 2.2s ease-in-out infinite !important;
  border: 2.5px solid rgba(0,255,255,0.8) !important;
  background: rgba(37,71,133,0.92) !important;
  border-radius: 14px !important;
  box-shadow: 0 0 15px rgba(0,255,255,0.5), 0 0 25px rgba(255,122,0,0.4) !important;
}
.testimonial-fixed {
  animation: glowPulseFix 2.2s ease-in-out infinite !important;
  border: 2.5px solid rgba(0,255,255,0.8) !important;
  background: rgba(25,55,110,0.95) !important;
  border-radius: 16px !important;
  box-shadow: 0 0 15px rgba(0,255,255,0.5), 0 0 25px rgba(255,122,0,0.4) !important;
}
@media (prefers-reduced-motion: reduce) {
  .card-fixed, .testimonial-fixed { animation: none !important; }
}
`}</style>
      <BestBackground />
      {activeNotification && (
        <div className="sticky top-0 z-40 border-b border-orange-200/70 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-md sm:px-4">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-xs">
            <span className="relative flex size-2.5 shrink-0"><span className="absolute inline-flex size-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-orange-500" /></span>
            <span className="hidden rounded-full bg-orange-100 px-2.5 py-1 font-black text-orange-700 sm:inline">إشعار من الإدارة</span>
            <div className="min-w-0 flex-1 truncate text-right"><span className="font-black text-[#0A2540]">{activeNotification.title}</span><span className="mr-2 hidden text-slate-500 md:inline">{activeNotification.message}</span></div>
            <button type="button" onClick={() => void openNotification(activeNotification.id)} className="hidden shrink-0 items-center gap-1 rounded-xl bg-[#0F4C81] px-3 py-1.5 font-black text-white transition hover:bg-[#0A2540] sm:inline-flex">عرض الإشعارات <ChevronLeft className="size-3.5" /></button>
            <button onClick={() => setNotifications((current) => current.slice(1))} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="إغلاق الإشعار"><X className="size-4" /></button>
          </div>
        </div>
      )}

      {/* 🌟 الشريط العلوي الزجاجي الثابت مع شعار SHOPPING AL SHAMEL */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
        style={{ backgroundColor: 'rgba(8, 26, 56, 0.8)' }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
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
          <AlShamelLogo size="lg" showText={true} variant="dark" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
        </div>

        {/* جهة اليسار: حسابي والإشعارات وزر اطلب الآن */}
        <div className="relative flex flex-wrap items-center gap-2 sm:gap-2.5">
          <a
            href="/my-account"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/8 text-white shadow-sm backdrop-blur-md transition hover:scale-105 hover:bg-white/15"
            title="حسابي"
          >
            <User className="size-5" />
          </a>

          <button onClick={() => setIsNotificationOpen((open) => !open)} className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/8 text-white shadow-sm backdrop-blur-md transition hover:scale-105 hover:bg-white/15" title="الإشعارات" aria-expanded={isNotificationOpen}>
            <Bell className="size-5" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#ff7a00] text-[10px] font-black text-white ring-2 ring-white/40">{unreadCount}</span>}
          </button>
          {isNotificationOpen && (
            <div className="absolute left-0 top-14 z-50 w-[min(calc(100vw-32px),340px)] overflow-hidden rounded-2xl border border-sky-100 bg-white p-2 text-right shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2"><span className="text-xs font-black text-[#0A2540]">إشعارات الإدارة</span><button onClick={() => setIsNotificationOpen(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">إغلاق</button></div>
              {notificationError && <p role="alert" className="mx-2 mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">{notificationError}</p>}
              {notifications.length === 0 ? <p className="px-2 py-5 text-center text-xs text-slate-400">لا توجد إشعارات</p> : <div className="space-y-1 pt-2">{notifications.map((notification) => { const Icon = notificationIcon(notification.type); const isRead = readNotificationIds.has(notification.id); return <button type="button" key={notification.id} onClick={() => void openNotification(notification.id)} className={`flex w-full items-start gap-2 rounded-xl p-2 text-right transition hover:bg-slate-50 ${isRead ? 'opacity-70' : 'bg-sky-50/70'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${notificationTone[notification.type] ?? notificationTone['system']}`}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-[#0A2540]">{notification.title}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{notification.message}</span></span>{!isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-orange-500" aria-label="غير مقروء" />}</button>; })}</div>}
              <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2"><button onClick={() => void markAllNotificationsRead()} className="rounded-xl bg-[#0F4C81] px-2 py-2 text-[10px] font-black text-white">تحديد الكل كمقروء</button><button onClick={() => setIsNotificationOpen(false)} className="rounded-xl bg-slate-100 px-2 py-2 text-[10px] font-black text-slate-600">إغلاق</button></div>
            </div>
          )}

          <a
            href="/new-order"
            className="als-button-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ff6a00] px-5 py-2.5 font-black text-xs sm:text-sm text-white shadow-[0_0_20px_rgba(255,122,0,0.4)] transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <ShoppingCart className="size-4 text-white" />
            <span>اطلب الآن</span>
          </a>
        </div>
        </div>
      </header>

      {showNotificationToast && activeNotification && (
        <div className="fixed left-4 right-4 top-16 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-orange-200 bg-white p-3 text-right shadow-2xl animate-in slide-in-from-top-3">
          {(() => { const Icon = notificationIcon(activeNotification.type); return <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${notificationTone[activeNotification.type] ?? notificationTone['system']}`}><Icon className="size-5" /></span>; })()}
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[#0A2540]">{activeNotification.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{activeNotification.message}</p></div>
          <button type="button" onClick={() => void openNotification(activeNotification.id)} className="shrink-0 rounded-xl bg-orange-500 px-2.5 py-2 text-[10px] font-black text-white">عرض</button>
          <button onClick={() => setShowNotificationToast(false)} aria-label="إغلاق التنبيه"><X className="size-4 text-slate-400" /></button>
        </div>
      )}

      {/* 🌟 بنر الهيدر الكبير المتقلب بين عرضين (شحن مجاني / خصم 50%) */}
      <HeroFlipping />

      {/* 🌟 المنطقة الترحيبية العلوية */}
      <section className="px-4 pb-2 pt-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/8 text-sky-100 text-xs font-bold mb-4 backdrop-blur-md">
          <Star className="size-3.5 fill-[#ff7a00] text-[#ff7a00]" />
          <span>خدمة القرية والصالة الأولى في اليمن</span>
        </div>
        <h1 className="text-3xl sm:text-[42px] font-black leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          تسوق عالمياً، واستمتع محلياً
        </h1>
        <p className="mt-3 text-sm sm:text-base text-white/85 max-w-xl mx-auto">
          اطلب من أي متجر عالمي ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية
        </p>
      </section>

      {/* 🌟 شعارات المتاجر العالمية */}
      <section className="px-4 pt-6">
        <p className="mb-4 text-center text-xs font-bold text-sky-200 flex items-center justify-center gap-2">
          <span className="w-8 h-0.5 bg-orange-400 rounded-full" />
          <span>نستورد لك من أشهر المتاجر العالمية</span>
          <span className="w-8 h-0.5 bg-orange-400 rounded-full" />
        </p>
        <div className="mx-auto grid max-w-[750px] grid-cols-5 gap-3 sm:gap-4 py-5" dir="ltr">
          {platforms.map((p) => (
            <div
              key={p.name}
              className={`als-store-tile group relative flex h-[90px] sm:h-[130px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[22px] transition-transform duration-300 hover:scale-105 ${
                p.temu ? 'als-store-tile--temu' : ''
              }`}
            >
              <span className="pointer-events-none absolute inset-0 rounded-[22px] als-store-shine" />
              <span
                className="relative z-10 text-lg sm:text-[22px] text-white"
                style={{
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                }}
              >
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 خانة لصق رابط المنتج */}
      <section className="mx-auto max-w-2xl px-4 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); startOrderWithLink(); }}
          className="group relative flex items-center gap-2 overflow-hidden rounded-2xl border border-white/15 bg-white/8 p-2 shadow-lg backdrop-blur-2xl animate-in fade-in duration-500"
        >
          <span className="pointer-events-none absolute -inset-y-8 -right-16 w-14 rotate-12 bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-0 blur-sm transition-all duration-700 group-focus-within:right-[120%] group-focus-within:opacity-100" />
          <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-[#ff7a00]/0 transition-all duration-300 group-focus-within:animate-pulse group-focus-within:ring-[#ff7a00]/50" />
          <Search className="relative z-10 mr-1 size-5 shrink-0 text-white" />
          <input
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            dir="ltr"
            placeholder="الصق رابط المنتج هنا..."
            className="relative z-10 w-full bg-transparent py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/70"
          />
          <button
            type="submit"
            className="relative z-10 shrink-0 rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff6a00] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/30 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            اطلب الآن
          </button>
        </form>
      </section>

      {/* 🌟 خطوات الشراء الـ 5 */}
      <StepsBest />

      {/* 🌟 آراء العملاء */}
      <ReviewsBest />

      {/* 🌟 تذييل الصفحة */}
      <footer className="pb-10 text-center border-t border-white/10 pt-8 bg-white/5 backdrop-blur-md">
        <div className="flex justify-center mb-3">
          <AlShamelLogo size="sm" showText={true} variant="dark" />
        </div>
        <p className="text-xs font-bold text-sky-200">وسيطكم المعتمد للشراء والاستيراد من كافة المتاجر العالمية</p>
        <p className="mt-1 text-[11px] text-sky-400/80">جميع الحقوق محفوظة © 2026 — AL SHAMEL SHOPPING</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <a
            href="https://wa.me/967770000000"
            target="_blank"
            rel="noopener noreferrer"
            title="واتساب"
            aria-label="تواصل معنا عبر واتساب"
            className="group relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-[#25D366] text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95"
          >
            <span className="pointer-events-none absolute -inset-y-8 -right-16 w-10 rotate-12 bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-0 blur-sm transition-all duration-700 group-hover:right-[120%] group-hover:opacity-100" />
            <Phone className="relative z-10 size-5" />
          </a>
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="فيسبوك"
            aria-label="تابعنا على فيسبوك"
            className="group relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-[#1877F2] text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95"
          >
            <span className="pointer-events-none absolute -inset-y-8 -right-16 w-10 rotate-12 bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-0 blur-sm transition-all duration-700 group-hover:right-[120%] group-hover:opacity-100" />
            <svg viewBox="0 0 24 24" fill="currentColor" className="relative z-10 size-5"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5H16.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z"/></svg>
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="انستقرام"
            aria-label="تابعنا على انستقرام"
            className="group relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95"
          >
            <span className="pointer-events-none absolute -inset-y-8 -right-16 w-10 rotate-12 bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-0 blur-sm transition-all duration-700 group-hover:right-[120%] group-hover:opacity-100" />
            <svg viewBox="0 0 24 24" fill="currentColor" className="relative z-10 size-5"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.8.1-1.1.1-1.5.2-1.9.3-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.1.4-.3.8-.3 1.9-.1 1.3-.1 1.7-.1 4.8s0 3.5.1 4.8c.1 1.1.2 1.5.3 1.9.2.5.4.8.7 1.1.3.3.6.5 1.1.7.4.1.8.3 1.9.3 1.3.1 1.7.1 4.8.1s3.5 0 4.8-.1c1.1-.1 1.5-.2 1.9-.3.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.1-.4.3-.8.3-1.9.1-1.3.1-1.7.1-4.8s0-3.5-.1-4.8c-.1-1.1-.2-1.5-.3-1.9-.2-.5-.4-.8-.7-1.1-.3-.3-.6-.5-1.1-.7-.4-.1-.8-.3-1.9-.3-1.3-.1-1.7-.1-4.8-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.2-8.3a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"/></svg>
          </a>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            title="تيليجرام"
            aria-label="تواصل معنا عبر تيليجرام"
            className="group relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-[#229ED9] text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95"
          >
            <span className="pointer-events-none absolute -inset-y-8 -right-16 w-10 rotate-12 bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-0 blur-sm transition-all duration-700 group-hover:right-[120%] group-hover:opacity-100" />
            <Send className="relative z-10 size-5" />
          </a>
        </div>
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
