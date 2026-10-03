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
  Check
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
  totalCostUSD?: number;
  totalCostSAR?: number;
  totalCostYER?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

interface UpdateShipmentProps {
  initialOrderNumber?: string;
  initialPhoneNumber?: string;
  onBack?: () => void;
  onStatusUpdated?: (orderId: string, newStatus: OrderStatus) => void;
}

export const UpdateShipment: React.FC<UpdateShipmentProps> = ({
  initialOrderNumber = '',
  initialPhoneNumber = '',
  onBack,
  onStatusUpdated,
}) => {
  const [orderQuery, setOrderQuery] = useState(initialOrderNumber);
  const [phoneQuery, setPhoneQuery] = useState(initialPhoneNumber);
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // المراحل السبع لمسار الشحنة المربوطة بحالات قاعدة البيانات
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

  // بحث تلقائي عند فتح الصفحة إذا تم تمرير رقم الطلب
  useEffect(() => {
    if (initialOrderNumber || initialPhoneNumber) {
      handleSearch(initialOrderNumber, initialPhoneNumber);
    }
  }, [initialOrderNumber, initialPhoneNumber]);

  // دالة البحث المباشر في جدول orders بقاعدة بيانات Supabase
  const handleSearch = async (orderNum?: string, phoneNum?: string) => {
    const oQuery = (orderNum !== undefined ? orderNum : orderQuery).trim().toUpperCase();
    const pQuery = (phoneNum !== undefined ? phoneNum : phoneQuery).trim();

    if (!oQuery && !pQuery) return;

    setLoading(true);
    setHasSearched(true);
    setErrorMessage('');

    try {
      let query = supabase.from('orders').select('*');

      if (oQuery && pQuery) {
        query = query.or(`order_number.ilike.%${oQuery}%,tracking_code.ilike.%${oQuery}%,intl_tracking_number.ilike.%${oQuery}%`);
      } else if (oQuery) {
        query = query.or(`order_number.ilike.%${oQuery}%,tracking_code.ilike.%${oQuery}%,intl_tracking_number.ilike.%${oQuery}%`);
      } else if (pQuery) {
        query = query.or(`customer_phone.ilike.%${pQuery}%,phone.ilike.%${pQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0];
        setOrder({
          id: row.id,
          orderNumber: row.order_number || row.tracking_code || 'ORD-001',
          intlTrackingNumber: row.intl_tracking_number || row.tracking_code,
          customerName: row.customer_name || 'العميل',
          customerPhone: row.customer_phone || row.phone || '',
          customerCity: row.customer_city || 'صنعاء',
          customerAddress: row.customer_address || '',
          storeName: row.store_name || 'SHEIN',
          productUrl: row.product_url || row.product_link,
          productTitle: row.product_title || 'شحنة متجر عالمي',
          quantity: row.quantity || 1,
          totalCostUSD: row.total_cost_usd,
          totalCostSAR: row.total_cost_sar,
          totalCostYER: row.total_cost_yer,
          status: (row.status as OrderStatus) || 'new',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      } else {
        setOrder(null);
      }
    } catch (err: any) {
      console.error('Error fetching order from Supabase:', err);
      setErrorMessage(err.message || 'تعذر الاتصال بقاعدة البيانات');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 تحديث حالة الشحنة وحفظها مباشرة في قاعدة البيانات
  const handleUpdateStage = async (targetStatus: OrderStatus, stepTitle: string) => {
    if (!order) return;
    setUpdatingStatus(targetStatus);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('orders')
        .update({
          status: targetStatus,
          updated_at: now,
        })
        .or(`id.eq.${order.id},order_number.eq.${order.orderNumber}`);

      if (error) throw error;

      // تحديث الحالة محلياً في الصفحة فوراً
      setOrder((prev) => (prev ? { ...prev, status: targetStatus, updatedAt: now } : null));
      setSuccessMessage(`تم تحديث وتثبيت حالة الشحنة في قاعدة البيانات إلى: (${stepTitle}) بنجاح! 🚀`);
      onStatusUpdated?.(order.id, targetStatus);

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error updating order stage:', err);
      setErrorMessage('حدث خطأ أثناء التحديث بالقاعدة: ' + (err.message || ''));
    } finally {
      setUpdatingStatus(null);
    }
  };

  const isStepActive = (step: typeof trackingSteps[0], currentStatus?: OrderStatus) => {
    if (!currentStatus) return false;
    return step.activeStatuses.includes(currentStatus);
  };

  const isStepCurrent = (step: typeof trackingSteps[0], currentStatus?: OrderStatus) => {
    if (!currentStatus) return false;
    return step.currentIf.includes(currentStatus);
  };

  const getStatusLabel = (status: OrderStatus) => {
    const map: Record<string, string> = {
      new: 'تم استلام الطلب',
      accepted: 'طلب معتمد ومؤكد',
      pricing: 'قيد التسعير',
      priced_waiting_pay: 'بانتظار الدفع',
      purchased: 'تم الشراء من المتجر',
      processing: 'قيد التجهيز والتغليف',
      international_ship: 'وصول المستودع الدولي',
      shipped: 'تم الشحن الدولي ✈️',
      local_warehouse: 'بالمستودع المحلي باليمن',
      out_for_delivery: 'جاري التوصيل مع المندوب 🚚',
      delivered: 'تم التسليم بنجاح ✓',
      cancelled: 'ملغي',
    };
    return map[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans selection:bg-[#0F4C81] selection:text-white pb-20" dir="rtl">
      
      {/* الترويسة الرئيسية بألوان الشعار الرسمي */}
      <header className="max-w-2xl mx-auto pt-6 pb-4 px-4 flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-2xl bg-white/90 hover:bg-sky-50 border-2 border-sky-100 hover:border-[#0F4C81] text-xs font-black text-[#0F4C81] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 group"
          >
            <ArrowRight className="w-4 h-4 text-[#0F4C81] group-hover:-translate-x-0.5 transition-transform" />
            <span>رجوع</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 font-black text-lg sm:text-xl tracking-tight">
            <span className="text-[#0F4C81]">AL SHAMEL</span>
            <span className="text-[#FF7A00]">SHOPPING</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">
            لوحة تحديث وتتبع مسار الشحنات المباشرة 📍
          </p>
        </div>

        <div className="w-16" />
      </header>

      <main className="max-w-xl mx-auto px-4 mt-2 space-y-6">
        
        {/* نموذج استعلام الشحنة */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,76,129,0.08)] ring-1 ring-sky-50 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-sky-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#0F4C81]">
                استعلام وتحديث الشحنة
              </h2>
            </div>
            <span className="text-[11px] font-black text-[#EA580C] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
              ربط مباشر بقاعدة البيانات ⚡
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-black text-[#0F4C81]">
                رقم الشحنة أو كود التتبع
              </label>
              <div className="relative flex items-center bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#0F4C81] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0284C7]/15 transition-all shadow-xs">
                <div className="px-3.5 py-3 text-[#0F4C81] bg-sky-50/80 border-l-2 border-slate-200 flex items-center justify-center font-mono font-black text-base select-none">
                  #
                </div>
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="مثال: SQ-892411 أو ORD-2026-1001"
                  className="w-full py-3.5 pr-3 pl-4 bg-transparent text-[#0A2540] placeholder:text-slate-400 text-xs sm:text-sm font-mono font-bold focus:outline-none text-right"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-black text-[#0F4C81]">
                رقم هاتف العميل
              </label>
              <div className="relative flex items-center bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#0F4C81] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0284C7]/15 transition-all shadow-xs">
                <div className="px-3.5 py-3 text-[#FF7A00] bg-orange-50/80 border-l-2 border-slate-200 flex items-center justify-center select-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="770000000 أو 774399744"
                  className="w-full py-3.5 pr-3 pl-4 bg-transparent text-[#0A2540] placeholder:text-slate-400 text-xs sm:text-sm font-mono font-bold focus:outline-none text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {hasSearched && !order && !loading && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl animate-fadeIn space-y-1">
                <p className="text-xs sm:text-sm font-black text-rose-700 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>لم يتم العثور على شحنة مطابقة في قاعدة البيانات</span>
                </p>
                <div className="text-[11px] text-slate-600 text-center">
                  يرجى التأكد من كتابة رقم الشحنة أو رقم الهاتف بشكل صحيح
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
                  <span>بحث وتتبع الشحنة 🔍</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* تنبيهات النجاح والخطأ */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl animate-bounce flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-emerald-900 shadow-md">
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

        {/* تفاصيل الشحنة والمسار عند العثور عليها */}
        {order && (
          <div className="space-y-5 animate-fadeIn">
            {/* ملخص بيانات الشحنة */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">اسم المستلم:</span>
                  <span className="font-black text-slate-900 text-sm">{order.customerName}</span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm" dir="ltr">{order.customerPhone}</span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">الحالة الحالية للشحنة:</span>
                  <span className="font-black text-white bg-gradient-to-r from-[#FF7A00] to-[#EA580C] px-2.5 py-1 rounded-lg inline-block shadow-2xs">
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">تاريخ التسجيل:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(order.createdAt).toLocaleDateString('ar-YE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* المسار الزمني التفاعلي المربوط بقاعدة البيانات */}
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
                  تحديث تفاعلي بالقاعدة ⚡
                </span>
              </div>

              <div className="p-3 bg-gradient-to-r from-sky-50 to-orange-50 rounded-2xl border border-sky-200 text-xs font-bold text-[#0F4C81] flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>انقر على زر أي مرحلة في المسار لتحديث حالتها وتثبيتها فوراً في قاعدة بيانات Supabase!</span>
              </div>

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
                        {/* أيقونة المرحلة التفاعلية */}
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
                                المرحلة الحالية ⚡
                              </span>
                            )}

                            {active && !current && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                                ✓ مكتمل
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {step.desc}
                          </p>

                          {/* زر تفعيل المرحلة وحفظها بالقاعدة */}
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
                                    <span>تفعيل ونقل الشحنة لهذه المرحلة (حفظ بالقاعدة)</span>
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
};

export default UpdateShipment;
