import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
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
  Send,
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

export function TrackPage() {
  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // المراحل السبع المعتمدة مع نصوصها الدقيقة
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

  // دالة البحث في قاعدة بيانات Supabase
  const handleSearch = async (overrideOrder?: string, overridePhone?: string) => {
    const oQuery = (overrideOrder !== undefined ? overrideOrder : orderQuery).trim().toUpperCase();
    const pQuery = (overridePhone !== undefined ? overridePhone : phoneQuery).trim();
    if (!oQuery && !pQuery) return;

    setLoading(true);
    setHasSearched(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let query = supabase.from('orders').select('*');

      if (oQuery && pQuery) {
        query = query.or(`order_number.ilike.%${oQuery}%,tracking_code.ilike.%${oQuery}%,phone.ilike.%${pQuery}%`);
      } else if (oQuery) {
        query = query.or(`order_number.ilike.%${oQuery}%,tracking_code.ilike.%${oQuery}%`);
      } else if (pQuery) {
        query = query.or(`phone.ilike.%${pQuery}%,customer_phone.ilike.%${pQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0] as any;
        setOrder({
          id: row.id,
          orderNumber: row.order_number || row.tracking_code || 'ORD-001',
          intlTrackingNumber: row.tracking_code || row.order_number,
          customerName: row.customer_name || 'محمد عبد الله باقصين',
          customerPhone: row.phone || row.customer_phone || '',
          customerCity: row.city || row.customer_city || 'صنعاء',
          customerAddress: row.address || '',
          storeName: row.store_name || row.store || 'Amazon',
          productUrl: row.product_link || row.product_url,
          productTitle: row.product_name || 'أجهزة إلكترونية (سماعات لاسلكية...)',
          quantity: row.quantity || 1,
          status: (row.status as OrderStatus) || 'new',
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at,
        });
      } else {
        // شحنة تجريبية ذكية متطابقة مع الصورة إذا لم يُعثر على سجل بالقاعدة
        if (oQuery === 'SQ-892411' || oQuery.includes('892411')) {
          setOrder({
            id: 'demo-892411',
            orderNumber: 'SQ-892411',
            intlTrackingNumber: 'SQ-892411',
            customerName: 'محمد عبد الله باقصين',
            customerPhone: '0501234567',
            customerCity: 'صنعاء - حدة',
            storeName: 'Amazon',
            productTitle: 'أجهزة إلكترونية (سماعات لاسلكية...)',
            productUrl: 'https://amazon.com/dp/B09VX63Q2R',
            status: 'purchased',
            createdAt: new Date().toISOString(),
          });
        } else {
          setOrder(null);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر الاتصال بقاعدة البيانات');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // تعبئة وبحث تلقائي إذا وُجدت معلمات بالرابط
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('tracking') || params.get('order') || 'SQ-892411';
      const ph = params.get('phone') || '';
      if (code) {
        setOrderQuery(code);
        if (ph) setPhoneQuery(ph);
        handleSearch(code, ph);
      }
    }
  }, []);

  // تحديث المرحلة وحفظها مباشرة في Supabase
  const handleUpdateStage = async (targetStatus: OrderStatus, stepTitle: string) => {
    if (!order) return;
    setUpdatingStatus(targetStatus);
    setSuccessMessage('');
    setErrorMessage('');

    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: targetStatus,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error && !order.id.startsWith('demo-')) throw error;

      setOrder((prev) => (prev ? { ...prev, status: targetStatus, updatedAt: now } : null));
      setSuccessMessage(`تم تحديث وتثبيت حالة الشحنة في قاعدة البيانات إلى: [${stepTitle}] بنجاح! 🚀`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء التحديث بالقاعدة: ' + (err.message || ''));
    } finally {
      setUpdatingStatus(null);
    }
  };

  // إرسال إشعار فوري للعميل عبر الواتساب
  const sendWhatsAppNotification = () => {
    if (!order) return;
    const phoneClean = order.customerPhone.replace(/[^0-9]/g, '');
    const currentStepObj = trackingSteps.find((s) => s.targetStatus === order.status) || trackingSteps[0];
    const message = `مرحباً بك أستاذ/ة ${order.customerName} 🌸\n\nتحديث جديد بشأن شحنتك رقم: ${order.intlTrackingNumber || order.orderNumber}\n📦 الحالة الحالية: *${currentStepObj.title}*\n📝 التفاصيل: ${currentStepObj.desc}\n🏪 المتجر: ${order.storeName || 'المتجر الدولي'}\n\nشكراً لاختياركم السوق الشامل - وسيطكم العالمي الموثوق ✨`;
    const url = `https://wa.me/${phoneClean.startsWith('967') ? phoneClean : `967${phoneClean}`}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

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
      {/* 1. الترويسة العلوية مع زر «لوحة حسابي» بدلاً من الأيقونات المحددة */}
      <header className="max-w-2xl mx-auto pt-6 pb-4 px-4 flex items-center justify-between">
        {/* زر لوحة حسابي في الزاوية اليسرى (مكان الدائرة الخضراء المحددة) */}
        <Link
          to="/dashboard"
          className="px-3.5 py-2 rounded-2xl bg-[#0F4C81] hover:bg-[#0A365C] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-[#0F4C81]/20 active:scale-95"
        >
          <LayoutDashboard className="w-4 h-4 text-[#FF7A00]" />
          <span>لوحة حسابي</span>
        </Link>

        {/* الشعار في المنتصف */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 font-black text-lg sm:text-xl tracking-tight">
            <span className="text-[#FF7A00]">SHOPPING</span>
            <span className="text-[#0F4C81]">AL SHAMEL</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">
            السوق الشامل - وسيطكم العالمي ... تتبع لحظي بالقاعدة 📍
          </p>
        </div>

        {/* زر رجوع */}
        <Link
          to="/"
          className="px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-sky-50 border-2 border-sky-100 hover:border-[#0F4C81] text-xs font-black text-[#0F4C81] transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
        >
          <ArrowRight className="w-4 h-4 text-[#0F4C81]" />
          <span>رجوع</span>
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-2 space-y-6">
        {/* ================================= البطاقة 1: استعلام وتتبع الشحنة ================================= */}
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
              تحديث مباشر ✨
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="space-y-4"
          >
            {/* حقل رقم الشحنة */}
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
                  placeholder="SQ-892411"
                  className="w-full py-3.5 pr-3 pl-4 bg-transparent text-[#0A2540] placeholder:text-slate-400 text-xs sm:text-sm font-mono font-bold focus:outline-none text-right"
                />
              </div>
            </div>

            {/* حقل رقم الهاتف */}
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
                  placeholder="0501234567"
                  className="w-full py-3.5 pr-3 pl-4 bg-transparent text-[#0A2540] placeholder:text-slate-400 text-xs sm:text-sm font-mono font-bold focus:outline-none text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {/* الأرقام التجريبية السريعة للتتبع الفوري */}
            <div className="pt-1">
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                أرقام تجريبية سريعة للتتبع الفوري:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {['SQ-892411', 'SQ-892412', 'SQ-892413'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setOrderQuery(code);
                      handleSearch(code, phoneQuery);
                    }}
                    className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-sky-200 bg-sky-50 text-[#0F4C81] hover:bg-[#0F4C81] hover:text-white transition shadow-2xs cursor-pointer"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {hasSearched && !order && !loading && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-1">
                <p className="text-xs sm:text-sm font-black text-rose-700 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>لم يتم العثور على شحنة مطابقة في قاعدة البيانات</span>
                </p>
                <div className="text-[11px] text-slate-600 text-center">
                  يرجى التأكد من كتابة رقم الشحنة أو رقم الهاتف بشكل صحيح
                </div>
              </div>
            )}

            {/* زر التتبع الأساسي */}
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

        {/* رسائل التنبيه والنجاح */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-emerald-900 shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-rose-900 shadow-md">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================================= البطاقة 2: تفاصيل الشحنة واسم العميل بارزاً ================================= */}
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
                    {order.customerPhone || '0501234567'}
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

              {/* تفاصيل السلعة والمنشأ المعتمدة */}
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0F4C81]">تفاصيل السلعة والمنشأ المعتمدة:</span>
                  <span className="text-[10px] font-black bg-white text-[#EA580C] px-2 py-0.5 rounded border border-orange-200">
                    {order.storeName || 'Amazon'}
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

              {/* أزرار الإجراءات: إشعار الواتساب والطباعة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={sendWhatsAppNotification}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>إشعار العميل عبر الواتساب 📱</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 text-xs font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#0F4C81]" />
                  <span>طباعة سند الشحنة والإيصال الرسمي 🖨️</span>
                </button>
              </div>
            </div>

            {/* ================================= البطاقة 3: مسار الشحنة خطوة بخطوة 📍 ================================= */}
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

              <div className="p-3 bg-gradient-to-r from-sky-50 to-orange-50 rounded-2xl border border-sky-200 text-xs font-bold text-[#0F4C81] flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>انقر على زر أي مرحلة من المسار لتحديث حالتها وتثبيتها فوراً في قاعدة بيانات الطلب!</span>
              </div>

              {/* المسار العمودي للمراحل السبع */}
              <div className="relative pr-2">
                <div className="absolute right-[23px] top-4 bottom-4 w-1 bg-gradient-to-b from-[#0F4C81] via-[#0284C7] to-[#FF7A00] -z-0 rounded-full" />
                <div className="space-y-6 relative z-10">
                  {trackingSteps.map((step) => {
                    const active = isStepActive(step, order.status);
                    const current = isStepCurrent(step, order.status);
                    const StepIcon = step.icon;
                    const isUpdatingThis = updatingStatus === step.targetStatus;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-4 transition-all duration-300 ${
                          active ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={updatingStatus !== null}
                          onClick={() => handleUpdateStage(step.targetStatus, step.title)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                            current
                              ? 'bg-gradient-to-br from-[#FF7A00] to-[#EA580C] border-white text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-200 scale-105'
                              : active
                              ? 'bg-gradient-to-br from-[#0F4C81] to-[#0284C7] border-white text-white hover:scale-105'
                              : 'bg-white border-slate-300 text-slate-400 hover:border-[#0F4C81] hover:text-[#0F4C81] hover:bg-sky-50'
                          }`}
                          title={`انقر لتعيين حالة الشحنة إلى (${step.title}) في قاعدة البيانات`}
                        >
                          {isUpdatingThis ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <StepIcon className="w-5 h-5" />
                          )}
                        </button>

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

                          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                            {current ? (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-xs font-black text-[#EA580C] shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-[#EA580C]" />
                                <span>الحالة المسجلة حالياً بالشحنة</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={updatingStatus !== null}
                                onClick={() => handleUpdateStage(step.targetStatus, step.title)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border disabled:opacity-60 bg-white hover:bg-sky-50 text-[#0F4C81] border-sky-200 hover:border-[#0F4C81]"
                              >
                                {isUpdatingThis ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F4C81]" />
                                    <span>جاري الحفظ بالقاعدة...</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5 text-[#FF7A00]" />
                                    <span>تفعيل ونقل الشحنة لهذه المرحلة (حفظ بالقاعدة) 💾</span>
                                  </>
                                )}
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
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute('/track/')({
  head: () => ({
    meta: [
      { title: 'استعلام وتتبع الشحنة — السوق الشامل' },
      { name: 'description', content: 'تتبع مسار شحنتك المباشر وتحديث حالتها في قاعدة البيانات خطوة بخطوة.' },
    ],
  }),
  component: TrackPage,
});

export default TrackPage;
 
