import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Package,
  Plane,
  Truck,
  CheckCircle2,
  MapPin,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Building,
  Phone,
  User,
  Printer,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Loader2,
  Check,
  Bell,
  X,
  ChevronLeft,
  Calendar,
  Clock,
  MessageSquare,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OrdersService, normalizePhone } from '@/services/supabaseOrders';

// =========================================================================
// 1. محاكي نغمة رنين الهاتف الحقيقية (Phone Ringtone Chime)
// =========================================================================
const playPhoneRingSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const tones = [
      { freq: 587.33, start: now + 0.0, duration: 0.15, gain: 0.35 },
      { freq: 880.00, start: now + 0.12, duration: 0.18, gain: 0.40 },
      { freq: 1174.66, start: now + 0.26, duration: 0.45, gain: 0.45 },
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, tone.start);

      gainNode.gain.setValueAtTime(0.001, tone.start);
      gainNode.gain.exponentialRampToValueAtTime(tone.gain, tone.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, tone.start + tone.duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(tone.start);
      osc.stop(tone.start + tone.duration);
    });
  } catch (e) {
    console.warn('Sound error:', e);
  }
};

const playDismissSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.09);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
};

// =========================================================================
// 2. أنواع البيانات (Types)
// =========================================================================
export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'pricing'
  | 'priced_waiting_pay'
  | 'purchased'
  | 'processing'
  | 'international_ship'
  | 'shipped'
  | 'local_warehouse'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  orderNumber: string;
  intlTrackingNumber?: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  customerAddress?: string;
  storeName?: string;
  productUrl?: string;
  productTitle?: string;
  quantity?: number;
  totalCostUSD?: number;
  totalCostSAR?: number;
  totalCostYER?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

// =========================================================================
// 3. مكون صفحة استعلام وتتبع الشحنات المباشر
// =========================================================================
export function TrackRouteComponent() {
  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [todayDateString, setTodayDateString] = useState('');
  const [pinnedNotification, setPinnedNotification] = useState<{
    show: boolean;
    stageTitle: string;
    orderNumber: string;
    customerName: string;
    status: string;
    time: string;
  }>({
    show: false,
    stageTitle: '',
    orderNumber: '',
    customerName: '',
    status: '',
    time: '',
  });

  // حساب تاريخ اليوم تلقائياً
  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setTodayDateString(today.toLocaleDateString('ar-YE', options));
    loadAllOrders();
  }, []);

  // جلب كافة طلبات اليوم لحساب الإحصائيات الذكية
  const loadAllOrders = async () => {
    try {
      const orders = await OrdersService.getLocalOrders();
      setAllOrders(orders);
    } catch (e) {
      console.warn('Error loading orders:', e);
    }
  };

  // إحصائيات الصفحة المطلوبة (طلبات اليوم والطلبات الجاهزة)
  const stats = useMemo(() => {
    const todayYMD = new Date().toISOString().slice(0, 10);
    const todayOrders = allOrders.filter(
      (o) => o.createdAt && o.createdAt.slice(0, 10) === todayYMD
    );
    const readyOrders = allOrders.filter(
      (o) => o.status === 'local_warehouse' || o.status === 'out_for_delivery'
    );
    const deliveredOrders = allOrders.filter((o) => o.status === 'delivered');

    return {
      totalToday: todayOrders.length,
      readyCount: readyOrders.length,
      deliveredCount: deliveredOrders.length,
      totalAll: allOrders.length,
    };
  }, [allOrders]);

  // تنفيذ البحث والاستعلام
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const oQ = orderQuery.trim();
    const pQ = phoneQuery.trim();

    if (!oQ && !pQ) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const found = await OrdersService.getOrderByNumberOrPhone(oQ, pQ);
      setOrder(found);
      if (found) {
        setOrderQuery(found.orderNumber);
      }
    } catch (err) {
      console.error('Search error:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // تفعيل ونقل الشحنة للمرحلة وحفظها بالقاعدة مع إشعار ونغمة الهاتف
  const handleUpdateStage = async (targetStatus: OrderStatus, stepTitle: string) => {
    if (!order) return;
    setUpdatingStatus(targetStatus);

    try {
      const updated = await OrdersService.updateOrder(order.id, {
        status: targetStatus,
      });

      if (updated) {
        setOrder(updated);

        // تشغيل نغمة رنين الهاتف الحقيقية
        playPhoneRingSound();

        // إظهار الإشعار المثبت
        const nowTime = new Date().toLocaleTimeString('ar-YE', {
          hour: '2-digit',
          minute: '2-digit',
        });

        setPinnedNotification({
          show: true,
          stageTitle: stepTitle,
          orderNumber: updated.orderNumber,
          customerName: updated.customerName,
          status: targetStatus,
          time: nowTime,
        });

        // تحديث قائمة الطلبات المحلية
        loadAllOrders();
      }
    } catch (err: any) {
      alert('خطأ أثناء حفظ التحديث بالقاعدة: ' + (err?.message || ''));
    } finally {
      setUpdatingStatus(null);
    }
  };

  // المراحل السبع المطلوبة بنصها الدقيق
  const trackingStages = [
    {
      id: 'step-1',
      title: 'استلام الطلب والاعتماد',
      desc: 'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح',
      icon: CheckCircle2,
      targetStatus: 'new' as OrderStatus,
      activeIf: [
        'new',
        'accepted',
        'pricing',
        'priced_waiting_pay',
        'purchased',
        'processing',
        'international_ship',
        'shipped',
        'local_warehouse',
        'out_for_delivery',
        'delivered',
      ],
      currentIf: ['new', 'accepted', 'pricing'],
    },
    {
      id: 'step-2',
      title: 'الشراء من المتجر الدولي',
      desc: 'تم إتمام عملية الدفع والشراء من المتجر الأصلي',
      icon: DollarSign,
      targetStatus: 'purchased' as OrderStatus,
      activeIf: [
        'purchased',
        'processing',
        'international_ship',
        'shipped',
        'local_warehouse',
        'out_for_delivery',
        'delivered',
      ],
      currentIf: ['purchased', 'processing'],
    },
    {
      id: 'step-3',
      title: 'وصول المستودع الدولي',
      desc: 'وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا وتجهيز التغليف',
      icon: Building,
      targetStatus: 'processing' as OrderStatus,
      activeIf: [
        'processing',
        'international_ship',
        'shipped',
        'local_warehouse',
        'out_for_delivery',
        'delivered',
      ],
      currentIf: ['processing'],
    },
    {
      id: 'step-4',
      title: 'الشحن الدولي (جوي / بحري)',
      desc: 'الشحنة على متن رحلة الشحن الدولي متجهة إلى الجمهورية اليمنية',
      icon: Plane,
      targetStatus: 'international_ship' as OrderStatus,
      activeIf: [
        'international_ship',
        'shipped',
        'local_warehouse',
        'out_for_delivery',
        'delivered',
      ],
      currentIf: ['international_ship', 'shipped'],
    },
    {
      id: 'step-5',
      title: 'الوصول لليمن والفرز المحلي',
      desc: 'وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز في المستودع المحلي',
      icon: Package,
      targetStatus: 'local_warehouse' as OrderStatus,
      activeIf: ['local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['local_warehouse'],
    },
    {
      id: 'step-6',
      title: 'خروج الشحنة مع المندوب للتوصيل',
      desc: 'الشحنة حالياً مع مندوب التوصيل في طريقها لعنوان العميل',
      icon: Truck,
      targetStatus: 'out_for_delivery' as OrderStatus,
      activeIf: ['out_for_delivery', 'delivered'],
      currentIf: ['out_for_delivery'],
    },
    {
      id: 'step-7',
      title: 'تم التسليم بنجاح',
      desc: 'تم استلام الشحنة من قبل العميل بنجاح وتم إغلاق الطلب',
      icon: Check,
      targetStatus: 'delivered' as OrderStatus,
      activeIf: ['delivered'],
      currentIf: ['delivered'],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16" dir="rtl">
      
      {/* 🌟 1. الإشعار المثبت المنبثق مع صوت الهاتف */}
      {pinnedNotification.show && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-[#173e56] text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-400 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-black">
                  <span>تم التحديث والحفظ بالقاعدة ✓</span>
                  <span className="text-[10px] text-white/70">({pinnedNotification.time})</span>
                </div>
                <h4 className="text-sm font-black text-white mt-0.5">
                  {pinnedNotification.stageTitle}
                </h4>
                <p className="text-xs text-sky-100 font-medium mt-1">
                  العميل: <strong className="text-white">{pinnedNotification.customerName}</strong>
                </p>
                <p className="text-[11px] text-white/80 font-mono">
                  رقم الشحنة: {pinnedNotification.orderNumber}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playDismissSound();
                setPinnedNotification((prev) => ({ ...prev, show: false }));
              }}
              className="text-white/70 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 🌟 2. رأس صفحة التتبع باللون الكحلي النفطي */}
      <header className="bg-[#173e56] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Truck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                تتبع الشحنات المباشر
              </h1>
              <p className="text-[11px] text-sky-200">
                منظومة السوق الشامل للوساطة والتوصيل
              </p>
            </div>
          </div>

          <div className="text-left text-xs text-sky-200 font-medium hidden sm:block">
            <span>التاريخ: {todayDateString}</span>
          </div>
        </div>
      </header>

      {/* 🌟 3. لوحة الإحصائيات المرتبة (تاريخ اليوم - طلبات اليوم - الطلبات الجاهزة) */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* التاريخ اليوم */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">تاريخ اليوم</span>
              <span className="text-xs font-black text-slate-800 line-clamp-1">{todayDateString || 'اليوم'}</span>
            </div>
          </div>

          {/* عدد طلبات اليوم */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">عدد طلبات اليوم</span>
              <span className="text-lg font-black text-indigo-700">{stats.totalToday} طلب</span>
            </div>
          </div>

          {/* عدد الطلبات الجاهزة */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">الطلبات الجاهزة للفرز</span>
              <span className="text-lg font-black text-amber-700">{stats.readyCount} شحنة</span>
            </div>
          </div>

          {/* الشحنات المسلمة بنجاح */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">تم التسليم بنجاح</span>
              <span className="text-lg font-black text-emerald-700">{stats.deliveredCount} شحنة</span>
            </div>
          </div>

        </div>
      </div>

      {/* 🌟 4. حقل الاستعلام والبحث برقم الشحنة أو الهاتف */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <form onSubmit={handleSearch} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-xs sm:text-sm font-black text-slate-800">
              استعلام وبحث عن شحنة عميل
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                رقم الشحنة / الطلب (مثل SQ-892411)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="أدخل رقم الشحنة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-9 pl-3 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#173e56]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                أو رقم هاتف العميل المسجل
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="مثال: 770000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-9 pl-3 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#173e56]"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#173e56] hover:bg-[#123043] text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>استعلام الآن</span>
            </button>

            {/* أرقام تجريبية سريعة */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <span className="hidden sm:inline">أمثلة:</span>
              <button
                type="button"
                onClick={() => {
                  setOrderQuery('SQ-892411');
                  handleSearch();
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                SQ-892411
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 🌟 5. بطاقة تفاصيل الشحنة واسم العميل ومراحل الشحن السبع */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        {order ? (
          <div className="space-y-6">
            
            {/* بطاقة رأس الشحنة واسم العميل */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                    رقم الشحنة: {order.orderNumber}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-2 flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-500" />
                    <span>اسم العميل: {order.customerName}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{order.customerPhone}</span>
                    <span className="text-slate-300">•</span>
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{order.customerCity || 'صنعاء / اليمن'}</span>
                  </p>
                </div>

                <div className="text-left">
                  <span className="text-xs text-slate-400 font-bold block">إجمالي الطلب:</span>
                  <span className="text-lg font-black text-emerald-700">
                    {order.totalCostSAR ? `${order.totalCostSAR} ر.س` : '1,580 ر.س'}
                  </span>
                </div>
              </div>

              {/* تفاصيل المنتج والمتجر */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div>
                  <span className="font-bold text-slate-700">المتجر / المنتج: </span>
                  <span>{order.productTitle || 'طلب وساطة وشحن من المتاجر العالمية'}</span>
                </div>
                {order.productUrl && (
                  <a
                    href={order.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:text-sky-800 font-bold flex items-center gap-1 underline"
                  >
                    <span>رابط المنتج الأصلي</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* 🌟 6. المراحل السبع المباشرة مع أزرار (تفعيل ونقل الشحنة لهذه المرحلة) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    مراحل حركة وتتبع الشحنة المباشرة
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  الحفظ يتم مباشرة في قاعدة البيانات
                </span>
              </div>

              {/* قائمة المراحل المرتبة خطوة بخطوة */}
              <div className="space-y-4">
                {trackingStages.map((stage, idx) => {
                  const isDone = stage.activeIf.includes(order.status);
                  const isCurrent = stage.currentIf.includes(order.status);
                  const Icon = stage.icon;
                  const isBusyThis = updatingStatus === stage.targetStatus;

                  return (
                    <div
                      key={stage.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isCurrent
                          ? 'bg-sky-50/70 border-sky-500 shadow-sm ring-2 ring-sky-200'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-slate-50 border-slate-200 opacity-90'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* نص المرحلة والأيقونة */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                              isCurrent
                                ? 'bg-[#173e56] text-white shadow-md animate-pulse'
                                : isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-500">
                                المرحلة {idx + 1}:
                              </span>
                              <h4 className="text-sm font-black text-slate-900">
                                {stage.title}
                              </h4>
                              {isDone && (
                                <span className="text-emerald-700 font-black text-xs flex items-center gap-0.5">
                                  ✓ مكتمل
                                </span>
                              )}
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white font-black text-[10px]">
                                  المرحلة الحالية ⚡
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                              {stage.desc}
                            </p>
                          </div>
                        </div>

                        {/* زر تفعيل ونقل الشحنة لهذه المرحلة */}
                        <div className="shrink-0 pt-2 sm:pt-0">
                          {isCurrent ? (
                            <span className="px-3 py-1.5 rounded-xl bg-sky-100 text-sky-900 font-black text-xs inline-flex items-center gap-1 border border-sky-300">
                              <span>الحالة المسجلة حالياً بالشحنة</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleUpdateStage(stage.targetStatus, stage.title)}
                              disabled={isBusyThis}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                            >
                              {isBusyThis ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              <span>تفعيل ونقل الشحنة لهذه المرحلة (حفظ بالقاعدة)</span>
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : hasSearched && !loading ? (
          <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
            <h3 className="text-base font-black text-slate-800">
              لم يتم العثور على شحنة مطابقة للبيانات المدخلة
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              تأكد من كتابة رقم الشحنة بصيغة صحيحة (مثال: SQ-892411) أو رقم هاتف العميل المسجل بالطلب.
            </p>
          </div>
        ) : null}
      </div>

    </div>
  );
}

export const Route = (createFileRoute as any)('/track/')({
  component: TrackRouteComponent,
});
