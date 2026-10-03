import React, { useState, useEffect } from 'react';
import {
  Search,
  Plane,
  Truck,
  CheckCircle2,
  MapPin,
  DollarSign,
  AlertCircle,
  Building,
  Phone,
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

  useEffect(() => {
    if (initialOrderNumber || initialPhoneNumber) {
      handleSearch(initialOrderNumber, initialPhoneNumber);
    }
  }, [initialOrderNumber, initialPhoneNumber]);

  const handleSearch = async (orderNum?: string, phoneNum?: string) => {
    const oQuery = (orderNum!== undefined? orderNum : orderQuery).trim().toUpperCase();
    const pQuery = (phoneNum!== undefined? phoneNum : phoneQuery).trim();
    if (!oQuery &&!pQuery) return;
    setLoading(true);
    setHasSearched(true);
    setErrorMessage('');
    try {
      let query = supabase.from('orders').select('*');
      if (oQuery) {
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
      setErrorMessage(err.message || 'تعذر الاتصال بقاعدة البيانات');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (targetStatus: OrderStatus, stepTitle: string) => {
    if (!order) return;
    setUpdatingStatus(targetStatus);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
       .from('orders')
       .update({ status: targetStatus, updated_at: now })
       .eq('id', order.id);
      if (error) throw error;
      setOrder((prev) => (prev? {...prev, status: targetStatus, updatedAt: now } : null));
      setSuccessMessage(`تم تحديث وتثبيت حالة الشحنة في قاعدة البيانات إلى: (${stepTitle}) بنجاح! 🚀`);
      onStatusUpdated?.(order.id, targetStatus);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
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
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans pb-20" dir="rtl">
      <header className="max-w-2xl mx-auto pt-6 pb-4 px-4 flex items-center justify-between">
        {onBack? (
          <button onClick={onBack} className="px-4 py-2 rounded-2xl bg-white/90 border-2 border-sky-100 text-xs font-black text-[#0F4C81] flex items-center gap-1.5 cursor-pointer">
            <ArrowRight className="w-4 h-4" /><span>رجوع</span>
          </button>
        ) : <div className="w-16" />}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 font-black text-lg tracking-tight">
            <span className="text-[#0F4C81]">AL SHAMEL</span><span className="text-[#FF7A00]">SHOPPING</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">لوحة تحديث وتتبع مسار الشحنات المباشرة 📍</p>
        </div>
        <div className="w-16" />
      </header>
      <main className="max-w-xl mx-auto px-4 mt-2 space-y-6">
        <div className="bg-white/95 border-2 border-sky-100 rounded-[32px] p-6 shadow-lg space-y-5">
          <h2 className="text-base font-black text-[#0F4C81] flex items-center gap-2"><Search className="w-4 h-4"/> استعلام وتحديث الشحنة</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
            <input type="text" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} placeholder="رقم الشحنة" className="w-full py-3 px-4 border-2 rounded-2xl text-sm font-bold" />
            <input type="text" value={phoneQuery} onChange={(e) => setPhoneQuery(e.target.value)} placeholder="رقم الهاتف" className="w-full py-3 px-4 border-2 rounded-2xl text-sm font-bold" dir="ltr" />
            <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-[#0F4C81] text-white font-black">
              {loading? <><Loader2 className="w-5 h-5 animate-spin inline"/> جاري البحث...</> : 'بحث وتتبع الشحنة 🔍'}
            </button>
          </form>
          {hasSearched &&!order &&!loading && <p className="text-center text-sm font-bold text-rose-600">لم يتم العثور على شحنة مطابقة</p>}
        </div>
        {successMessage && <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-sm font-black text-emerald-900 text-center">{successMessage}</div>}
        {errorMessage && <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-sm font-black text-rose-900 text-center">{errorMessage}</div>}
        {order && (
          <div className="space-y-5">
            <div className="bg-white border-2 border-sky-200 rounded-[32px] p-5 space-y-3">
              <p className="font-black">رقم التتبع: <span className="text-[#0F4C81]">{order.intlTrackingNumber || order.orderNumber}</span></p>
              <p>المستلم: <b>{order.customerName}</b> - <span dir="ltr">{order.customerPhone}</span></p>
              <p>الحالة الحالية: <b className="text-[#FF7A00]">{getStatusLabel(order.status)}</b></p>
            </div>
            <div className="bg-white border-2 border-sky-100 rounded-[32px] p-5 space-y-6">
              <h3 className="font-black text-[#0F4C81]">مسار الشحنة خطوة بخطوة 📍</h3>
              <div className="space-y-4">
                {trackingSteps.map((step) => {
                  const active = isStepActive(step, order.status);
                  const current = isStepCurrent(step, order.status);
                  const StepIcon = step.icon;
                  const isUpdatingThis = updatingStatus === step.targetStatus;
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <button disabled={updatingStatus!== null} onClick={() => handleUpdateStage(step.targetStatus, step.title)}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 ${current? 'bg-orange-500 text-white' : active? 'bg-[#0F4C81] text-white' : 'bg-white text-slate-400'}`}>
                        {isUpdatingThis? <Loader2 className="w-5 h-5 animate-spin"/> : <StepIcon className="w-5 h-5"/>}
                      </button>
                      <div className="flex-1">
                        <h4 className="text-sm font-black">{step.title} {current && '⚡'}</h4>
                        <p className="text-xs text-slate-600">{step.desc}</p>
                        {!current && (
                          <button disabled={updatingStatus!== null} onClick={() => handleUpdateStage(step.targetStatus, step.title)}
                            className="mt-2 px-3 py-1.5 text-xs font-black border rounded-xl bg-white hover:bg-sky-50 text-[#0F4C81]">
                            {isUpdatingThis? 'جاري الحفظ...' : 'تفعيل هذه المرحلة'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default UpdateShipment;
