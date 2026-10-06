import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import {
  Bell, ChevronLeft, ChevronRight, CircleDollarSign, FileText, Hand,
  Link2, Menu, Package, Play, Search, ShieldCheck, ShoppingCart,
  Sparkles, Truck, User, LogOut, X, ExternalLink, CheckCheck,
  Clock, ArrowRight, HelpCircle, PhoneCall
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AlShamelLogo } from './index';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'لوحة التحكم والعمليات — السوق الشامل' },
      { name: 'description', content: 'لوحة التحكم الرئيسية وإدارة الطلبات والشحنات في السوق الشامل.' },
    ],
  }),
  component: DashboardPage,
});

export default function DashboardPage() {
  const navigate = useNavigate();

  // بيانات المستخدم الحقيقية
  const [userName, setUserName] = useState<string>('جاري التحميل...');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  // حالة النوافذ والقوائم
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // مؤشرات طلبات العميل الشخصية
  const [orderStats, setOrderStats] = useState({
    total: 0,
    inProgress: 0,
    shipping: 0,
    delivered: 0,
  });

  // شريط الإشعارات المتحرك
  const tickerItems = [
    { text: 'تم تأكيد وشراء طلبك من متجر SHEIN بنجاح وجاري تجهيز الشحن الدولي إلى اليمن.', tag: '⚡ إشعار فوري', link: '/track' },
    { text: 'وصلت شحنتك إلى مستودع التجميع الدولي، وتم فحص المنتجات ومطابقتها.', tag: '📦 فحص الجودة', link: '/track' },
    { text: 'رحلة جوية جديدة متجهة إلى صنعاء وعدن، تسليم الشحنات خلال 48 ساعة.', tag: '✈️ شحن سريع', link: '/track' },
    { text: 'تخفيض عمولة الشراء إلى 5% فقط لكافة طلبات Trendyol و AliExpress هذا الأسبوع!', tag: '🎉 عرض حصري', link: '/new-order' },
  ];
  const [currentTicker, setCurrentTicker] = useState(0);

  // قائمة إشعارات العميل للجرس
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'تم تأكيد طلبك بنجاح', desc: 'تم استلام طلبك وجاري مراجعته من فريق المشتريات', time: 'منذ 10 دقائق', read: false },
    { id: '2', title: 'تحديث حالة الشحنة', desc: 'تم شحن الطرد الدولي برقم تتبع خاص بك', time: 'منذ ساعتين', read: false },
    { id: '3', title: 'عرض ترويجي جديد', desc: 'استمتع بالشحن المجاني للطلبات فوق 100$', time: 'منذ يوم', read: false },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // دوران شريط الإشعارات تلقائياً كل 5.5 ثوانٍ
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTicker((prev) => (prev + 1) % tickerItems.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [tickerItems.length]);

  // جلب جلسة العميل واسمه الحقيقي وطلباته
  useEffect(() => {
    const loadUserDataAndOrders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // 1. فحص بيانات الحساب المحفوظة محلياً (alsouk_current_user)
        let localName = '';
        let localPhone = '';
        try {
          const stored = localStorage.getItem('alsouk_current_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.full_name) localName = parsed.full_name;
            if (parsed.phone) localPhone = parsed.phone;
          }
        } catch {}

        // 2. فحص بيانات الجلسة من Supabase
        const metaName = session?.user?.user_metadata?.['full_name'];
        const sessionPhone = session?.user?.phone || session?.user?.user_metadata?.['phone'] || '';
        const phone = sessionPhone || localPhone || sessionStorage.getItem('sc_phone') || localStorage.getItem('sc_phone') || '';

        // 3. فحص جدول profiles إن كان مسجلاً
        let profileName = '';
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile?.full_name) profileName = profile.full_name;
        }

        const finalName = profileName || metaName || localName || (phone ? `عميل (${phone.slice(-4)})` : 'عميلنا العزيز');
        setUserName(finalName);
        setUserPhone(phone);
        if (session?.user?.id) setUserId(session.user.id);

        // 4. جلب طلبات هذا العميل فقط لحساب مؤشراته
        let query = supabase.from('orders').select('id, status, customer_name, phone');
        if (session?.user?.id) {
          query = query.eq('user_id', session.user.id);
        } else if (phone) {
          query = query.eq('phone', phone);
        }

        const { data: userOrders, error } = await query;

        if (!error && userOrders && userOrders.length > 0) {
          const total = userOrders.length;
          const delivered = userOrders.filter(o => o.status === 'تم التسليم' || o.status === 'delivered').length;
          const shipping = userOrders.filter(o => o.status === 'تم الشحن' || o.status === 'شحن دولي' || o.status === 'shipped').length;
          const inProgress = Math.max(0, total - delivered);

          setOrderStats({ total, inProgress, shipping, delivered });
        } else {
          // قراءة احتياطية من التخزين المحلي
          const raw = localStorage.getItem('alsouk_orders');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                setOrderStats({
                  total: parsed.length,
                  inProgress: parsed.filter((o: any) => o.status !== 'تم التسليم').length,
                  shipping: parsed.filter((o: any) => o.status === 'تم الشحن').length,
                  delivered: parsed.filter((o: any) => o.status === 'تم التسليم').length,
                });
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error loading client dashboard data:', err);
      }
    };

    loadUserDataAndOrders();
  }, []);

  // دالة تسجيل الخروج الرسمية
  const handleSignOut = async () => {
    if (confirm('هل ترغب بتسجيل الخروج من حسابك؟')) {
      try {
        await supabase.auth.signOut();
        sessionStorage.clear();
        localStorage.removeItem('sc_user');
        localStorage.removeItem('sc_phone');
        localStorage.removeItem('sc_name');
        localStorage.removeItem('alsouk_customer_logged_in');
        navigate({ to: '/login' });
      } catch (e) {
        navigate({ to: '/login' });
      }
    }
  };

  // تحديد الكل كمقروء
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const platforms = [
    { name: 'TEMU', color: 'text-[#FA6400]', border: 'hover:border-[#FA6400]/40' },
    { name: 'TrendYol', color: 'text-[#F27A1A]', border: 'hover:border-[#F27A1A]/40' },
    { name: 'SHEIN', color: 'text-zinc-900', border: 'hover:border-zinc-800/40' },
    { name: 'Amazon', color: 'text-[#FF9900]', border: 'hover:border-[#FF9900]/40' },
    { name: 'AliExpress', color: 'text-[#FF4747]', border: 'hover:border-[#FF4747]/40' },
  ];

  const steps = [
    { title: 'أرسل الرابط', step: 'خطوة 1', desc: 'انسخ رابط المنتج من أي متجر عالمي', icon: Link2, color: 'text-[#0284C7]' },
    { title: 'اعرف السعر', step: 'خطوة 2', desc: 'نوضح لك التكلفة بالريال اليمني أو الدولار', icon: CircleDollarSign, color: 'text-[#F97316]' },
    { title: 'نشتري لك', step: 'خطوة 3', desc: 'نشتري بدلاً عنك ونضمن جودة وتطابق الطلب', icon: ShoppingCart, color: 'text-[#0284C7]' },
    { title: 'تابع الشحنة', step: 'خطوة 4', desc: 'تتبع مسار شحنتك لحظة بلحظة برقم التتبع', icon: Search, color: 'text-[#F97316]' },
    { title: 'الاستلام', step: 'خطوة 5', desc: 'توصيل موثوق حتى باب بيتك في كافة المحافظات', icon: Package, color: 'text-[#0284C7]' },
  ];

  const testimonials = [
    { name: 'أحمد القدسي', city: 'صنعاء', text: 'أفضل تجربة شراء من شي إن وصلت الطلبية خلال أسبوعين وسليمة 100%' },
    { name: 'سارة باوزير', city: 'المكلا', text: 'وفروا علي عناء الدفع الدولي والشحن وصل لباب البيت بأسعار ممتازة جداً' },
    { name: 'فؤاد الردفاني', city: 'عدن', text: 'تتبع الشحنة دقيق جداً وخدمة العملاء متعاونين وسريعين في الرد' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-slate-800 font-sans pb-24" dir="rtl">
      
      {/* 🌟 1. شريط الإشعارات العلوي المتحرك */}
      <div className="bg-[#0A2540] text-slate-200 text-xs py-2 px-4 border-b border-sky-950/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="shrink-0 bg-[#EA580C] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {tickerItems[currentTicker]?.tag}
            </span>
            <Link
              to={tickerItems[currentTicker]?.link ?? '/dashboard'}
              className="truncate hover:text-white transition font-medium"
            >
              {tickerItems[currentTicker]?.text}
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            <button
              onClick={() => setCurrentTicker((prev) => (prev - 1 + tickerItems.length) % tickerItems.length)}
              className="hover:text-white p-1 rounded-md hover:bg-white/10 transition"
              title="السابق"
            >
              <ChevronRight className="size-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1">{currentTicker + 1}/{tickerItems.length}</span>
            <button
              onClick={() => setCurrentTicker((prev) => (prev + 1) % tickerItems.length)}
              className="hover:text-white p-1 rounded-md hover:bg-white/10 transition"
              title="التالي"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 2. الهيدر الرئيسي مع كبسولة العميل وزر إدارة حسابي وتسجيل الخروج */}
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-5 pb-3 relative z-30">
        {/* اليمين: زر القائمة والشعار الرسمي */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col justify-center items-center gap-1 size-11 rounded-2xl bg-[#0F4C81] hover:bg-[#0A2540] text-white shadow-md transition-all active:scale-95 cursor-pointer"
            title="القائمة الشاملة"
          >
            <span className="w-5 h-0.5 rounded-full bg-white" />
            <span className="w-5 h-0.5 rounded-full bg-[#F97316]" />
            <span className="w-5 h-0.5 rounded-full bg-white" />
          </button>
          <AlShamelLogo size="md" showText={true} />
        </div>

        {/* اليسار: كبسولة العميل + زر إدارة حسابي + زر الخروج + الجرس + زر اطلب الآن */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* كبسولة العميل متصل (بالنقطة الخضراء النابضة) */}
          <Link
            to="/my-account"
            className="flex items-center gap-2 bg-white border border-emerald-300 hover:border-emerald-500 rounded-full px-3.5 py-1.5 shadow-xs text-xs font-black transition group"
            title="عرض ملفي الشخصي"
          >
            <span className="relative flex size-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
            </span>
            <span className="text-slate-800 group-hover:text-[#0F4C81] max-w-[120px] truncate">{userName}</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 font-extrabold">متصل</span>
          </Link>

          {/* 🌟 زر إدارة حسابي المطلوب بشكل واضح ومباشر */}
          <Link
            to="/my-account"
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#0F4C81] hover:bg-[#0A2540] text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-xs transition active:scale-95"
            title="الانتقال إلى إعدادات الحساب والعناوين"
          >
            <User className="size-3.5 text-[#F97316]" />
            <span>إدارة حسابي</span>
          </Link>

          {/* 🔴 زر تسجيل الخروج */}
          <button
            onClick={handleSignOut}
            className="grid size-11 place-items-center rounded-2xl bg-white text-rose-600 hover:text-white hover:bg-rose-600 ring-1 ring-rose-200 shadow-xs transition active:scale-95 cursor-pointer group"
            title="تسجيل الخروج"
          >
            <LogOut className="size-5 transition-transform group-hover:-translate-x-0.5" />
          </button>

          {/* 🔔 جرس مراجعة الإشعارات التفاعلي */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative grid size-11 place-items-center rounded-2xl bg-white text-[#0F4C81] ring-1 ring-sky-200 shadow-xs hover:bg-sky-50 transition active:scale-95 cursor-pointer"
              title="مراجعة الإشعارات"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 bg-[#EA580C] text-white text-[10px] font-black rounded-full grid place-items-center ring-2 ring-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* نافذة الإشعارات المنسدلة للعميل */}
            {isNotifOpen && (
              <div className="absolute left-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white shadow-2xl border border-sky-100 p-4 text-right z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Bell className="size-4 text-[#EA580C]" />
                    <span className="font-black text-sm text-[#0A2540]">إشعاراتي</span>
                    <span className="bg-orange-100 text-[#EA580C] text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadCount} جديد
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                    >
                      <CheckCheck className="size-3.5" />
                      <span>تحديد الكل كمقروء</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl transition hover:bg-sky-50/60 cursor-pointer ${
                        notif.read ? 'opacity-70' : 'bg-orange-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-[#0A2540]">{notif.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">{notif.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to="/my-account"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-black text-[#0F4C81] hover:underline"
                  >
                    عرض كل الإشعارات والطلبات ←
                  </Link>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* زر اطلب الآن البرتقالي */}
          <Link
            to="/new-order"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] px-4 sm:px-5 py-2.5 font-black text-xs sm:text-sm text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <ShoppingCart className="size-4 text-white" />
            <span>اطلب الآن</span>
          </Link>
        </div>
      </header>

      {/* 🌟 3. بطاقة الهيرو الكحلية الملكية */}
      <section className="px-4 pt-3 pb-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0A2540] via-[#0F4C81] to-[#134074] p-6 text-white shadow-2xl sm:p-9 border border-sky-400/20">
          
          {/* الترويسة العلوية للبطاقة: اسم السوق الشامل + أزرار الكبسولات */}
          <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">السوق الشامل</h1>
                <span className="bg-[#EA580C] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">AL SHAMEL</span>
              </div>
              <p className="text-xs sm:text-sm text-sky-200 font-bold mt-1">
                وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية
              </p>
            </div>

            {/* الأزرار العلوية الثلاثة: حسابي + الطلب + الشحن */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Link
                to="/my-account"
                className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
                title="إدارة حسابي"
              >
                <User className="size-5 text-sky-300 mb-0.5" />
                <span className="text-[11px] font-black">حسابي</span>
              </Link>
              <Link
                to="/new-order"
                className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
                title="طلب جديد"
              >
                <Hand className="size-5 text-orange-400 mb-0.5" />
                <span className="text-[11px] font-black">الطلب</span>
              </Link>
              <Link
                to="/track"
                className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
                title="تتبع الشحنات"
              >
                <FileText className="size-5 text-sky-300 mb-0.5" />
                <span className="text-[11px] font-black">الشحن</span>
              </Link>
            </div>
          </div>

          {/* محتوى الهيرو: كيف تطلب؟ + زر تشغيل الفيديو التوضيحي */}
          <div className="py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-right max-w-xl">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-4xl font-black text-white">كيف تطلب؟</h2>
                <span className="text-2xl sm:text-4xl font-black text-amber-400">؟</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك.
              </p>
            </div>

            {/* زر تشغيل الفيديو البرتقالي الكبير */}
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="relative size-20 sm:size-24 rounded-3xl bg-gradient-to-tr from-[#EA580C] to-[#FB923C] grid place-items-center shadow-lg shadow-orange-500/40 cursor-pointer hover:scale-105 active:scale-95 transition group"
              title="مشاهدة فيديو طريقة الطلب"
            >
              <Play className="size-8 sm:size-10 text-white fill-white ml-1 group-hover:scale-110 transition" />
              <span className="absolute -bottom-6 text-[11px] font-black text-sky-200 whitespace-nowrap">شاهد الشرح 🎥</span>
            </button>
          </div>

          {/* الأزرار السفلية وشارة الضمان */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/new-order"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] px-6 py-3 font-black text-sm text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 active:scale-95"
              >
                <Hand className="size-4" />
                <span>اضغط هنا لطلب منتج</span>
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 px-5 py-3 font-black text-xs text-white transition active:scale-95"
              >
                <Search className="size-4 text-sky-300" />
                <span>تتبع شحنة سابقة</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-200 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>ضمان استرجاع 100% في حال عدم مطابقة المنتج</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 4. مؤشرات طلبات وشحنات العميل الشخصية */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-[#0F4C81]" />
            <h3 className="text-sm font-black text-[#0A2540]">متابعة طلباتي وشحناتي</h3>
          </div>
          <Link to="/my-account" className="text-xs font-bold text-[#0F4C81] hover:text-[#EA580C] transition">
            تفاصيل الحساب والفواتير ←
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/my-account"
            className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs text-right hover:shadow-md transition hover:-translate-y-0.5 block"
          >
            <span className="text-xs font-bold text-slate-400">إجمالي طلباتي</span>
            <div className="text-2xl font-black text-[#0F4C81] mt-1">{orderStats.total}</div>
          </Link>

          <Link
            to="/track"
            className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs text-right hover:shadow-md transition hover:-translate-y-0.5 block"
          >
            <span className="text-xs font-bold text-slate-400">قيد الشراء والتجهيز</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{orderStats.inProgress}</div>
          </Link>

          <Link
            to="/track"
            className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs text-right hover:shadow-md transition hover:-translate-y-0.5 block"
          >
            <span className="text-xs font-bold text-slate-400">شحنات في الطريق</span>
            <div className="text-2xl font-black text-[#0284C7] mt-1">{orderStats.shipping}</div>
          </Link>

          <Link
            to="/my-account"
            className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs text-right hover:shadow-md transition hover:-translate-y-0.5 block"
          >
            <span className="text-xs font-bold text-slate-400">تم الاستلام</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{orderStats.delivered}</div>
          </Link>
        </div>
      </section>

      {/* 🌟 5. تسوق عالمياً واستلم محلياً */}
      <section className="max-w-5xl mx-auto px-4 text-center my-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-[#0F4C81] border border-sky-200 mb-2">
          <Sparkles className="size-3.5 text-[#EA580C]" /> خدمة الشراء والوساطة الأولى في اليمن
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540]">تسوّق عالمياً، واستلم محلياً</h2>
        <p className="text-xs sm:text-sm text-slate-600 font-bold mt-1">
          اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية.
        </p>
      </section>

      {/* 🌟 6. المتاجر العالمية المعتمدة */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-center gap-2 text-xs font-black text-amber-600 mb-4">
          <span>🎗️ نستورد لك من أشهر المتاجر العالمية</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {platforms.map((p, idx) => (
            <Link
              key={idx}
              to="/new-order"
              className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-center font-black text-lg transition hover:shadow-md ${p.color} ${p.border}`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 🌟 7. خطوات الطلب الـ 5 */}
      <section className="max-w-5xl mx-auto px-4 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 transition hover:shadow-md ${
                  i === 4 ? 'md:col-span-2 md:w-2/3 md:mx-auto' : ''
                }`}
              >
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-[#0A2540]">{st.title}</span>
                    <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                      {st.step}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">{st.desc}</p>
                </div>
                <div className="size-11 rounded-2xl bg-sky-50 grid place-items-center shrink-0 border border-sky-100">
                  <Icon className={`size-5 ${st.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* أزرار العمليات السريعة */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Link
            to="/new-order"
            className="inline-flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0A2540] text-white px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md transition active:scale-95"
          >
            <ShoppingCart className="size-4" />
            <span>اطلب الآن فوراً</span>
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-2xs transition active:scale-95"
          >
            <Search className="size-4 text-[#EA580C]" />
            <span>تتبع شحنتك الآن</span>
          </Link>
        </div>
      </section>

      {/* 🌟 8. قسم آراء وتجارب العملاء */}
      <section className="max-w-5xl mx-auto px-4 mb-14 text-center">
        <h3 className="text-lg font-black text-[#0A2540] mb-5">آراء وتجارب عملائنا الكرام ⭐⭐⭐⭐⭐</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-center">
              <div className="flex justify-center text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">{t.text}</p>
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-xs font-black text-[#0A2540]">{t.name}</span>
                <span className="text-[10px] font-bold text-[#EA580C]">{t.city}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 القائمة الجانبية المنسدلة (Slide-Over Drawer) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-80 max-w-[85vw] bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <AlShamelLogo size="sm" showText={true} />
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="size-9 rounded-xl bg-slate-100 grid place-items-center text-slate-600 hover:bg-slate-200"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* بطاقة العميل المتصل داخل القائمة */}
              <div className="bg-sky-50 rounded-2xl p-3.5 my-4 border border-sky-100">
                <span className="text-[11px] font-bold text-slate-400 block">حساب العميل المتصل:</span>
                <span className="text-sm font-black text-[#0F4C81] block mt-0.5">{userName}</span>
                {userPhone && <span className="text-xs font-bold text-slate-500 block mt-0.5">{userPhone}</span>}
              </div>

              {/* روابط التنقل السريع */}
              <nav className="space-y-2 mt-4 text-right">
                <Link
                  to="/dashboard"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-sky-100/60 font-black text-sm text-[#0F4C81]"
                >
                  <ShoppingCart className="size-4 text-[#EA580C]" />
                  <span>لوحة العمليات الرئيسية</span>
                </Link>
                <Link
                  to="/new-order"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 font-black text-sm text-slate-700 transition"
                >
                  <Hand className="size-4 text-[#0F4C81]" />
                  <span>طلب شراء جديد</span>
                </Link>
                <Link
                  to="/track"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 font-black text-sm text-slate-700 transition"
                >
                  <Truck className="size-4 text-[#0F4C81]" />
                  <span>تتبع الشحنات المباشر</span>
                </Link>
                <Link
                  to="/my-account"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 font-black text-sm text-slate-700 transition"
                >
                  <User className="size-4 text-[#0F4C81]" />
                  <span>إدارة حسابي والفواتير</span>
                </Link>
                <Link
                  to="/prices"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 font-black text-sm text-slate-700 transition"
                >
                  <CircleDollarSign className="size-4 text-[#0F4C81]" />
                  <span>دليل الأسعار والعمولات</span>
                </Link>
                <a
                  href="https://wa.me/967770000000"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-50 text-emerald-700 font-black text-sm transition"
                >
                  <PhoneCall className="size-4 text-emerald-600" />
                  <span>الدعم الفني عبر الواتساب</span>
                </a>
              </nav>
            </div>

            {/* زر تسجيل الخروج */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-sm py-3 rounded-2xl transition"
              >
                <LogOut className="size-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 نافذة الفيديو التوضيحي المنبثقة */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 left-4 size-9 rounded-full bg-slate-100 grid place-items-center text-slate-600 hover:bg-slate-200"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-[#0F4C81]">
              <Play className="size-5 text-[#EA580C] fill-[#EA580C]" />
              <h3 className="font-black text-lg">شرح طريقة الطلب والاستيراد</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed">
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                <span className="font-black text-[#0F4C81] block mb-1">1. انسخ الرابط:</span>
                تصفح متجرك المفضل (شي إن، أمازون، تيمو) وانسخ رابط أي منتج يعجبك.
              </div>
              <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100">
                <span className="font-black text-[#EA580C] block mb-1">2. أرسل الطلب:</span>
                اضغط على «اطلب الآن» والصق الرابط، وسيقوم النظام فوراً بحساب التكلفة.
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="font-black text-emerald-700 block mb-1">3. الاستلام عند باب بيتك:</span>
                نتولى الشراء والفحص والشحن ونوصلها لك في أي محافظة يمنية.
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                to="/new-order"
                onClick={() => setIsVideoModalOpen(false)}
                className="bg-[#EA580C] text-white px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-[#C2410C] transition"
              >
                ابدأ الطلب الآن ⚡
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
