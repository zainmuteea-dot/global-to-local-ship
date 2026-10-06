import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
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
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

// دالة قراءة رقم الهاتف فورياً من ذاكرة المتصفح
function getInitialClientPhone(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const urlPhone = params.get('phone');
  if (urlPhone && urlPhone.trim()) return urlPhone.trim();

  const direct = localStorage.getItem('sc_phone') || sessionStorage.getItem('sc_phone');
  if (direct && direct.trim() && !direct.includes('@')) return direct.trim();

  try {
    const raw = localStorage.getItem('alsouk_current_user');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.phone && p.phone.trim() && !p.phone.includes('@')) return p.phone.trim();
    }
  } catch {}

  return '';
}

// دالة قراءة كود التتبع من معلمات الرابط
function getInitialTrackingCode(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('tracking') || params.get('order') || '').trim();
}

export function TrackPage() {
  const [orderQuery, setOrderQuery] = useState<string>(() => getInitialTrackingCode());
  const [phoneQuery, setPhoneQuery] = useState<string>(() => getInitialClientPhone());
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // المراحل السبع المعتمدة لمسار تتبع العميل
  const trackingSteps = [
    {
      id: 'step-1',
      title: 'استلام الطلب والاعتماد',
      desc: 'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح',
      icon: CheckCircle2,
      targetStatus: 'new' as OrderStatus,
      activeStatuses: ['new', 'accepted', 'pricing', 'priced_waiting_pay', 'purchased', 'processing', 'international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['new', 'accepted', 'pricing'],
    },
    {
      id: 'step-2',
      title: 'الشراء من المتجر الدولي',
      desc: 'تم إتمام عملية الدفع والشراء من المتجر الأصلي',
      icon: DollarSign,
      targetStatus: 'purchased' as OrderStatus,
      activeStatuses: ['purchased', 'processing', 'international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['purchased', 'processing'],
    },
    {
      id: 'step-3',
      title: 'وصول المستودع الدولي',
      desc: 'وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا وتجهيز التغليف',
      icon: Building,
      targetStatus: 'international_ship' as OrderStatus,
      activeStatuses: ['international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['international_ship'],
    },
    {
      id: 'step-4',
      title: 'الشحن الدولي (جوي / بحري)',
      desc: 'الشحنة على متن رحلة الشحن الدولي متجهة إلى الجمهورية اليمنية',
      icon: Plane,
      targetStatus: 'shipped' as OrderStatus,
      activeStatuses: ['shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['shipped'],
    },
    {
      id: 'step-5',
      title: 'الوصول لليمن والفرز المحلي',
      desc: 'وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز في المستودع المحلي',
      icon: MapPin,
      targetStatus: 'local_warehouse' as OrderStatus,
      activeStatuses: ['local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['local_warehouse'],
    },
    {
      id: 'step-6',
      title: 'خروج الشحنة مع المندوب للتوصيل',
      desc: 'الشحنة حالياً مع مندوب التوصيل في طريقها لعنوان العميل',
      icon: Truck,
      targetStatus: 'out_for_delivery' as OrderStatus,
      activeStatuses: ['out_for_delivery', 'delivered'],
      currentIf: ['out_for_delivery'],
    },
    {
      id: 'step-7',
      title: 'تم التسليم بنجاح',
      desc: 'تم استلام الشحنة من قبل العميل بنجاح وسداد الرصيد',
      icon: Sparkles,
      targetStatus: 'delivered' as OrderStatus,
      activeStatuses: ['delivered'],
      currentIf: ['delivered'],
    },
  ];

  // دالة البحث التلقائي المصححة المتوافقة مع أعمدة Supabase (tracking_code و phone)
  const handleSearch = useCallback(async (overrideOrder?: string, overridePhone?: string) => {
    const oQuery = (overrideOrder !== undefined ? overrideOrder : orderQuery).trim().toUpperCase();
    const pQuery = (overridePhone !== undefined ? overridePhone : phoneQuery).trim();
    if (!oQuery && !pQuery) return;

    setLoading(true);
    setHasSearched(true);
    setErrorMessage('');

    try {
      let query = supabase.from('orders').select('*');

      if (oQuery && pQuery) {
        query = query.or(`tracking_code.ilike.%${oQuery}%,phone.ilike.%${pQuery}%`);
      } else if (oQuery) {
        query = query.ilike('tracking_code', `%${oQuery}%`);
      } else if (pQuery) {
        query = query.ilike('phone', `%${pQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0] as any;
        setOrder({
          id: row.id,
          orderNumber: row.tracking_code || 'ORD-001',
          intlTrackingNumber: row.tracking_code || 'ORD-001',
          customerName: row.customer_name || 'عميل السوق الشامل',
          customerPhone: row.phone || pQuery,
          customerCity: 'اليمن',
          customerAddress: '',
          storeName: 'المتجر الدولي',
          productUrl: row.product_link,
          productTitle: row.product_name || 'طلب وسيط شراء دولي',
          quantity: 1,
          status: (row.status as OrderStatus) || 'new',
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at,
        });
      } else {
        setOrder(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر الاتصال بقاعدة البيانات');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderQuery, phoneQuery]);

  // الجلب التلقائي الفوري من جلسة المستخدم وقاعدة البيانات
  useEffect(() => {
    let active = true;

    async function initUserTracking() {
      let resolvedPhone = getInitialClientPhone();
      const resolvedTracking = getInitialTrackingCode();

      // فحص جلسة المستخدم في Supabase Auth إن لم يتوفر الرقم محلياً
      if (!resolvedPhone) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('phone, full_name')
              .eq('id', user.id)
              .maybeSingle();

            if (profile?.phone && !profile.phone.includes('@')) {
              resolvedPhone = profile.phone.trim();
              if (active) {
                setPhoneQuery(resolvedPhone);
                localStorage.setItem('sc_phone', resolvedPhone);
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (!active) return;

      // تشغيل البحث التلقائي إذا وجد رقم هاتف أو كود تتبع
      if (resolvedTracking || resolvedPhone) {
        handleSearch(resolvedTracking || undefined, resolvedPhone || undefined);
      }
    }

    initUserTracking();

    return () => {
      active = false;
    };
  }, [handleSearch]);

  // الربط التلقائي المباشر (Realtime): تحديث المسار فوراً بمجرد أن يغير الأدمن الحالة
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`customer-order-live-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).status) {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: (payload.new as any).status as OrderStatus,
                    updatedAt: (payload.new as any).updated_at,
                  }
                : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const isStepActive = (step: (typeof trackingSteps)[0], currentStatus?: OrderStatus) => {
    if (!currentStatus) return false;
    return step.activeStatuses.includes(currentStatus);
  };

  const isStepCurrent = (step: (typeof trackingSteps)[0], currentStatus?: OrderStatus) => {
    if (!currentStatus) return false;
    return step.currentIf.includes(currentStatus);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans selection:bg-[#0F4C81] selection:text-white pb-20"
      dir="rtl"
    >
      {/* الترويسة العلوية */}
      <header className="max-w-2xl mx-auto pt-6 pb-4 px-4 flex items-center justify-between">
        <Link
          to="/dashboard"
          className="px-3.5 py-2 rounded-2xl bg-[#0F4C81] hover:bg-[#0A365C] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-[#0F4C81]/20 active:scale-95"
        >
          <LayoutDashboard className="w-4 h-4 text-[#FF7A00]" />
          <span>لوحة حسابي</span>
        </Link>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 font-black text-lg sm:text-xl tracking-tight">
            <span className="text-[#FF7A00]">SHOPPING</span>
            <span className="text-[#0F4C81]">AL SHAMEL</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">
            السوق الشامل - وسيطكم العالمي ... تتبع لحظي بالقاعدة 📍
          </p>
        </div>

        <Link
          to="/"
          className="px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-sky-50 border-2 border-sky-100 hover:border-[#0F4C81] text-xs font-black text-[#0F4C81] transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
        >
          <ArrowRight className="w-4 h-4 text-[#0F4C81]" />
          <span>رجوع</span>
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-2 space-y-6">
        {/* البطاقة 1: استعلام وتتبع الشحنة */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,76,129,0.08)] ring-1 ring-sky-50 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-sky-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#0F4C81]">
                استعلام وتتبع الشحنة
              </h2>
            </div>
            <span className="text-[11px] font-black text-[#EA580C] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
              تحديث مباشر تلقائي ✨
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="space-y-4"
          >
            {/* حقل كود التتبع */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-black text-[#0F4C81]">
                رقم الطلب أو الشحنة
              </label>
              <div className="relative flex items-center bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#0F4C81] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0284C7]/15 transition-all shadow-xs">
                <div className="px-3.5 py-3 text-[#0F4C81] bg-sky-50/80 border-l-2 border-slate-200 flex items-center justify-center font-mono font-black text-base select-none">
                  #
                </div>
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="أدخل كود التتبع أو رقم الطلب"
                  className="w-full py-3.5 pr-3 pl-4 bg-transparent text-[#0A2540] placeholder:text-slate-400 text-xs sm:text-sm font-mono font-bold focus:outline-none text-right"
                />
              </div>
            </div>

            {/* حقل رقم الهاتف - يظهر تلقائياً */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-black text-[#0F4C81]">
                رقم الهاتف أو الواتساب
              </label>
              <div className="relative flex items-center bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#0F4C81] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0284C7]/15 transition-all shadow-xs">
                <div className="px-3.5 py-3 text-[#FF7A00] bg-orange-50/80 border-l-2 border-slate-200 flex items-center justify-center select-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="رقم هاتفك المسجل"
                  className="w-full py-3.5 pr-3 pl-4 bg-transparent text-[#0A2540] placeholder:text-slate-400 text-xs sm:text-sm font-mono font-bold focus:outline-none text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {hasSearched && !order && !loading && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-1">
                <p className="text-xs sm:text-sm font-black text-rose-700 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>لم يتم العثور على شحنة مطابقة في قاعدة البيانات</span>
                </p>
                <div className="text-[11px] text-slate-600 text-center">
                  يرجى التأكد من كتابة كود التتبع أو رقم الهاتف المسجل بشكل صحيح
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#0F4C81] hover:from-[#0A365C] hover:to-[#0F4C81] active:scale-[0.99] text-white font-black text-base shadow-xl shadow-[#0F4C81]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 border border-sky-300/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري البحث في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Search className="w-4.5 h-4.5 text-white" />
                  <span>تتبع طلبك الآن 🔍</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* رسائل التنبيه */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-rose-900 shadow-md">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* البطاقة 2: تفاصيل الشحنة */}
        {order && (
          <div className="space-y-6">
            <div className="bg-white/95 backdrop-blur-md border-2 border-sky-200 rounded-[32px] p-5 sm:p-7 shadow-[0_20px_50px_rgba(15,76,129,0.08)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-sky-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    تم العثور على الشحنة بقاعدة البيانات ✓
                  </span>
                </div>
                <div className="font-mono font-black text-base sm:text-lg text-[#0F4C81] bg-gradient-to-r from-sky-50 via-white to-orange-50 px-3.5 py-1.5 rounded-2xl border-2 border-sky-200 shadow-xs">
                  {order.intlTrackingNumber || order.orderNumber}
                </div>
              </div>

              {/* شبكة البيانات الرباعية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">اسم العميل:</span>
                  <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#0F4C81]" />
                    {order.customerName}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5" dir="ltr">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    {order.customerPhone || phoneQuery}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">الحالة الحالية:</span>
                  <span className="font-black text-white bg-gradient-to-r from-[#FF7A00] to-[#EA580C] px-3 py-1 rounded-lg inline-block shadow-2xs">
                    {trackingSteps.find((s) => s.targetStatus === order.status)?.title || 'قيد المعالجة'}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">تاريخ التسجيل:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(order.createdAt).toLocaleDateString('ar-YE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* تفاصيل السلعة */}
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0F4C81]">تفاصيل السلعة والمنشأ المعتمدة:</span>
                  <span className="text-[10px] font-black bg-white text-[#EA580C] px-2 py-0.5 rounded border border-orange-200">
                    {order.storeName || 'المتجر الدولي'}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800">{order.productTitle}</p>
                {order.productUrl && (
                  <a
                    href={order.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-[#0284C7] hover:underline flex items-center gap-1 pt-1 break-all"
                  >
                    <span>{order.productUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>

            {/* البطاقة 3: مسار الشحنة خطوة بخطوة 📍 */}
            <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-[32px] p-5 sm:p-7 shadow-[0_20px_50px_rgba(15,76,129,0.08)] space-y-6">
              <div className="flex items-center justify-between border-b-2 border-sky-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-[#0F4C81]">
                    مسار الشحنة خطوة بخطوة 📍
                  </h3>
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200 shadow-2xs">
                  تحديث تفاعلي ومباشر ⚡
                </span>
              </div>

              {/* المسار العمودي للمراحل السبع */}
              <div className="relative pr-2">
                <div className="absolute right-[23px] top-4 bottom-4 w-1 bg-gradient-to-b from-[#0F4C81] via-[#0284C7] to-[#FF7A00] -z-0 rounded-full" />
                <div className="space-y-6 relative z-10">
                  {trackingSteps.map((step) => {
                    const active = isStepActive(step, order.status);
                    const current = isStepCurrent(step, order.status);
                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-4 transition-all duration-300 ${
                          active ? 'opacity-100' : 'opacity-60'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all shadow-xs ${
                            current
                              ? 'bg-gradient-to-br from-[#FF7A00] to-[#EA580C] border-white text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-200 scale-105'
                              : active
                              ? 'bg-gradient-to-br from-[#0F4C81] to-[#0284C7] border-white text-white'
                              : 'bg-white border-slate-300 text-slate-400'
                          }`}
                        >
                          <StepIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 pt-1 text-right">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-sm font-black ${
                                current
                                  ? 'text-[#EA580C]'
                                  : active
                                  ? 'text-[#0F4C81]'
                                  : 'text-slate-700'
                              }`}
                            >
                              {step.title}
                            </h4>
                            {current && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#FF7A00] to-[#EA580C] text-white shadow-xs animate-pulse">
                                المرحلة الحالية 📍
                              </span>
                            )}
                            {active && !current && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                                ✓ تم الإنجاز
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {step.desc}
                          </p>

                          {current && (
                            <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-xs font-black text-[#EA580C] w-fit shadow-2xs">
                              <Check className="w-3.5 h-3.5 text-[#EA580C]" />
                              <span>الحالة المسجلة حالياً بالشحنة</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute('/track/')({
  component: TrackPage,
});
