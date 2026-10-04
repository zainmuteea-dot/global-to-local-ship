import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Hand,
  Link2,
  Menu,
  MousePointerClick,
  Package,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  User,
  UserCheck,
  UserRound,
  X,
  Settings,
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

function DashboardPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('عزيزنا العميل');
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ products: 0, customers: 0, sales: 0, suppliers: 0 });

  // جلب اسم العميل من الجلسة ومؤشرات قاعدة البيانات
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const name =
        session?.user?.user_metadata?.['full_name'] ||
        sessionStorage.getItem('sc_name') ||
        '';
      if (name) setUserName(name);
    });

    const loadStats = async () => {
      try {
        const { count: pc } = await (supabase as any).from('products').select('*', { count: 'exact', head: true });
        const { count: cc } = await (supabase as any).from('customers').select('*', { count: 'exact', head: true });
        const { count: sc } = await (supabase as any).from('sales_invoices').select('*', { count: 'exact', head: true });
        const { count: supc } = await (supabase as any).from('suppliers').select('*', { count: 'exact', head: true });
        setStats({ products: pc || 0, customers: cc || 0, sales: sc || 0, suppliers: supc || 0 });
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
  }, []);

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
      {/* 🌟 1. الشريط الإخباري العلوي الداكن */}
      <div className="bg-[#07192F] text-white text-xs px-3 py-2 border-b border-sky-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-[#EA580C] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <span>⚡ إشعار فوري</span>
          </span>
          <span className="font-bold text-slate-200 truncate">
            تم تأكيد وشراء طلبك: تم شراء طلبك من متجر SHEIN بنجاح وجاري تجهيز الشحن الدولي إلى اليمن.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/track"
            className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-[11px] px-3 py-1 rounded-lg flex items-center gap-1 transition"
          >
            <Truck className="size-3.5" />
            <span>تتبع الشحنة</span>
          </Link>
          <div className="flex items-center gap-1 text-slate-400">
            <button className="hover:text-white p-0.5"><ChevronRight className="size-3.5" /></button>
            <button className="hover:text-white p-0.5"><ChevronLeft className="size-3.5" /></button>
            <button className="hover:text-white p-0.5"><X className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {/* 🌟 2. الهيدر الرئيسي الفاخر */}
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-5 pb-3">
        {/* اليمين: زر القائمة والشعار الرسمي */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col justify-center items-center gap-1 size-11 rounded-2xl bg-[#0F4C81] hover:bg-[#0A2540] text-white shadow-md transition-all active:scale-95 cursor-pointer"
            title="القائمة"
          >
            <span className="w-5 h-0.5 rounded-full bg-white" />
            <span className="w-5 h-0.5 rounded-full bg-[#F97316]" />
            <span className="w-5 h-0.5 rounded-full bg-white" />
          </button>
          <AlShamelLogo size="md" showText={true} />
        </div>

        {/* اليسار: كبسولة العمل متصل + أزرار الحساب والإشعارات والطلب */}
        <div className="flex items-center gap-2.5">
          {/* كبسولة العمل متصل بالنقطة الخضراء النابضة */}
          <div className="flex items-center gap-2 bg-white border border-emerald-200/80 rounded-full px-3.5 py-1.5 shadow-2xs text-xs font-black">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
            </span>
            <span className="text-slate-800">{userName || 'العمل'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600">متصل</span>
          </div>

          {/* زر أيقونة الحساب الدائرية */}
          <Link
            to="/my-account"
            className="grid size-11 place-items-center rounded-2xl bg-white text-[#0F4C81] ring-1 ring-sky-200 shadow-xs hover:bg-sky-50 transition active:scale-95"
            title="إدارة حسابي"
          >
            <User className="size-5" />
          </Link>

          {/* زر جرس الإشعارات مع البادج */}
          <Link
            to="/notifications"
            className="relative grid size-11 place-items-center rounded-2xl bg-white text-[#0F4C81] ring-1 ring-sky-200 shadow-xs hover:bg-sky-50 transition active:scale-95"
            title="الإشعارات"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 size-5 bg-[#EA580C] text-white text-[10px] font-black rounded-full grid place-items-center ring-2 ring-white">
                {unreadNotifications}
              </span>
            )}
          </Link>

          {/* زر اطلب الآن البرتقالي */}
          <Link
            to="/new-order"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] px-5 py-2.5 font-black text-xs sm:text-sm text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <ShoppingCart className="size-4 text-white" />
            <span>اطلب الآن</span>
          </Link>
        </div>
      </header>

      {/* 🌟 3. بطاقة الهيرو الكحلية الملكية (نفس الصورة تماماً) */}
      <section className="px-4 pt-3 pb-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0A2540] via-[#0F4C81] to-[#134074] p-6 text-white shadow-2xl sm:p-9 border border-sky-400/20">
          
          {/* الترويسة العلوية للبطاقة: اسم السوق الشامل + أزرار الكبسولات */}
          <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">السوق الشامل</h1>
                <span className="bg-[#EA580C] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  AL SHAMEL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-sky-200 font-bold mt-1">
                وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية
              </p>
            </div>

            {/* الأزرار العلوية الثلاثة: إدارة حسابي + الطلب + الشحن */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Link
                to="/my-account"
                className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
              >
                <UserRound className="size-5 text-sky-300 mb-0.5" />
                <span className="text-[11px] font-black">حسابي</span>
              </Link>
              <Link
                to="/new-order"
                className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
              >
                <Hand className="size-5 text-orange-400 mb-0.5" />
                <span className="text-[11px] font-black">الطلب</span>
              </Link>
              <Link
                to="/track"
                className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
              >
                <FileText className="size-5 text-sky-300 mb-0.5" />
                <span className="text-[11px] font-black">الشحن</span>
              </Link>
            </div>
          </div>

          {/* محتوى الهيرو: كيف تطلب؟ + زر الفيديو والأزرار السفلية */}
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
            <div className="relative size-20 sm:size-24 rounded-3xl bg-gradient-to-tr from-[#EA580C] to-[#FB923C] grid place-items-center shadow-lg shadow-orange-500/40 cursor-pointer hover:scale-105 active:scale-95 transition">
              <Play className="size-8 sm:size-10 text-white fill-white ml-1" />
            </div>
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

      {/* 🌟 4. قسم الوساطة وتسوّق عالمياً واستلم محلياً */}
      <section className="max-w-5xl mx-auto px-4 text-center my-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-[#0F4C81] border border-sky-200 mb-2">
          <Sparkles className="size-3.5 text-[#EA580C]" /> خدمة الشراء والوساطة الأولى في اليمن
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540]">تسوّق عالمياً، واستلم محلياً</h2>
        <p className="text-xs sm:text-sm text-slate-600 font-bold mt-1">
          اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية.
        </p>
      </section>

      {/* 🌟 5. المتاجر العالمية المعتمدة */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-center gap-2 text-xs font-black text-amber-600 mb-4">
          <span>🎗️ نستورد لك من أشهر المتاجر العالمية</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {platforms.map((p, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-center font-black text-lg transition hover:shadow-md ${p.color} ${p.border}`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 6. خطوات الطلب الـ 5 ببطاقات بيضاء نقية */}
      <section className="max-w-5xl mx-auto px-4 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 transition hover:shadow-md ${i === 4 ? 'md:col-span-2 md:w-2/3 md:mx-auto' : ''}`}
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
            className="inline-flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0A2540] text-white px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md transition"
          >
            <ShoppingCart className="size-4" />
            <span>اطلب الآن فوراً</span>
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-2xs transition"
          >
            <Search className="size-4 text-[#EA580C]" />
            <span>تتبع شحنتك الآن</span>
          </Link>
        </div>
      </section>

      {/* 🌟 7. مؤشرات النظام وقاعدة البيانات (KPIs) */}
      <section className="max-w-5xl mx-auto px-4 mb-10">
        <h3 className="text-sm font-black text-slate-500 mb-3 text-right">مؤشرات النظام الحية</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs text-right">
            <span className="text-xs font-bold text-slate-400">المنتجات</span>
            <div className="text-2xl font-black text-[#0F4C81] mt-1">{stats.products}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs text-right">
            <span className="text-xs font-bold text-slate-400">العملاء</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.customers}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-xs text-right">
            <span className="text-xs font-bold text-slate-400">الموردين</span>
            <div className="text-2xl font-black text-[#EA580C] mt-1">{stats.suppliers}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs text-right">
            <span className="text-xs font-bold text-slate-400">فواتير المبيعات</span>
            <div className="text-2xl font-black text-purple-600 mt-1">{stats.sales}</div>
          </div>
        </div>
      </section>

      {/* 🌟 8. قسم آراء وتجارب العملاء بخمس نجوم */}
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
    </div>
  );
}
