import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Plane,
  Truck,
  CheckCircle2,
  MapPin,
  DollarSign,
  Building,
  Phone,
  User,
  Sparkles,
  ArrowRight,
  Loader2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type OrderStatus =
  | 'new'
  | 'purchased'
  | 'international_ship'
  | 'shipped'
  | 'local_warehouse'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  storeName?: string;
  productName?: string;
  productLink?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export function CustomerTrackingRoute() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);

  // المراحل السبع المعتمدة للشحنة
  const trackingStages = [
    {
      stepNumber: 1,
      title: 'استلام الطلب والاعتماد',
      desc: 'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح',
      icon: CheckCircle2,
      completedIf: ['purchased', 'international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['new'],
    },
    {
      stepNumber: 2,
      title: 'الشراء من المتجر الدولي',
      desc: 'تم إتمام عملية الدفع والشراء من المتجر الأصلي',
      icon: DollarSign,
      completedIf: ['international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['purchased'],
    },
    {
      stepNumber: 3,
      title: 'وصول المستودع الدولي',
      desc: 'وصلت الشحنة لمستودعنا وجاري الفحص والتغليف الآمن',
      icon: Building,
      completedIf: ['shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['international_ship'],
    },
    {
      stepNumber: 4,
      title: 'الشحن الدولي (جوي / بحري)',
      desc: 'الشحنة على متن رحلة الشحن الدولي متجهة إلى اليمن',
      icon: Plane,
      completedIf: ['local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['shipped'],
    },
    {
      stepNumber: 5,
      title: 'الوصول لليمن والفرز المحلي',
      desc: 'وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز المحلي',
      icon: MapPin,
      completedIf: ['out_for_delivery', 'delivered'],
      currentIf: ['local_warehouse'],
    },
    {
      stepNumber: 6,
      title: 'خروج الشحنة مع المندوب للتوصيل',
      desc: 'الشحنة حالياً مع مندوب التوصيل في طريقها لعنوانك',
      icon: Truck,
      completedIf: ['delivered'],
      currentIf: ['out_for_delivery'],
    },
    {
      stepNumber: 7,
      title: 'تم التسليم بنجاح',
      desc: 'تم تسليم الشحنة للعميل بنجاح واستلام الطلب',
      icon: Sparkles,
      completedIf: [],
      currentIf: ['delivered'],
    },
  ];

  // جلب طلبات العميل الحالي عند فتح الصفحة
  useEffect(() => {
    const fetchCustomerOrders = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const storedUser = localStorage.getItem('alsouk_current_user');
        const userPhone = storedUser ? JSON.parse(storedUser)?.phone : null;

        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

        if (session?.user?.id) {
          query = query.eq('user_id', session.user.id);
        } else if (userPhone) {
          query = query.eq('phone', userPhone);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const mapped: CustomerOrder[] = data.map((item: any) => ({
            id: item.id,
            orderNumber: item.order_number || item.tracking_code || `ORD-${item.id.slice(0, 6)}`,
            trackingCode: item.tracking_code || item.order_number || `TRK-${item.id.slice(0, 6)}`,
            customerName: item.customer_name || 'عميلنا العزيز',
            customerPhone: item.phone || item.customer_phone || '',
            customerCity: item.city || item.customer_city || 'صنعاء',
            storeName: item.store_name || item.store || 'متجر دولي',
            productName: item.product_name || item.product_title || 'شحنة وساطة',
            productLink: item.product_link || item.product_url,
            status: (item.status as OrderStatus) || 'new',
            createdAt: item.created_at || new Date().toISOString(),
            updatedAt: item.updated_at,
          }));
          setOrders(mapped);
          setSelectedOrder(mapped[0] ?? null);

        }
      } catch (err) {
        console.error('Error fetching customer tracking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerOrders();
  }, []);

  // بحث العميل برقم الشحنة أو رقم الهاتف
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setSearching(true);
    setSearchNotFound(false);
    const term = searchInput.trim();

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`tracking_code.ilike.%${term}%,order_number.ilike.%${term}%,phone.ilike.%${term}%`)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: CustomerOrder[] = data.map((item: any) => ({
          id: item.id,
          orderNumber: item.order_number || item.tracking_code || `ORD-${item.id.slice(0, 6)}`,
          trackingCode: item.tracking_code || item.order_number || `TRK-${item.id.slice(0, 6)}`,
          customerName: item.customer_name || 'العميل',
          customerPhone: item.phone || '',
          customerCity: item.city || 'اليمن',
          storeName: item.store_name || 'متجر دولي',
          productName: item.product_name || 'شحنة وساطة',
          productLink: item.product_link,
          status: (item.status as OrderStatus) || 'new',
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        setSelectedOrder(mapped[0] ?? null);

        setSelectedOrder(mapped[0]);
      } else {
        setSearchNotFound(true);
      }
    } catch (err) {
      setSearchNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* الترويسة الرئيسية */}
      <header className="bg-[#0F4C81] text-white border-b border-sky-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
                <Package className="size-5 text-[#F97316]" />
                تتبع شحنتك المباشر
              </h1>
              <p className="text-[11px] text-sky-200">متابعة دقيقة لكل مراحل شحنتك حتى باب بيتك</p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-xs bg-white/15 hover:bg-white/25 text-white px-3.5 py-1.5 rounded-xl font-bold transition"
          >
            لوحة حسابي
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* مربع البحث عن الشحنة */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200">
          <h2 className="text-base sm:text-lg font-black text-[#0F4C81] mb-2 flex items-center gap-2">
            <Search className="size-5 text-[#F97316]" />
            ابحث عن شحنتك
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            أدخل رقم الشحنة (مثال: TRK-...) أو رقم الهاتف المرتبط بالطلب لمتابعة خط سير الشحنة فوراً.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="رقم الشحنة أو رقم الهاتف (مثال: 772399744)"
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F4C81] focus:bg-white transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              <span>تتبع الآن</span>
            </button>
          </form>

          {searchNotFound && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 font-bold">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <span>لم نتمكن من العثور على شحنة تطابق هذا الرقم. يرجى التأكد من الرقم أو التواصل مع خدمة العملاء.</span>
            </div>
          )}
        </div>

        {/* عرض تفاصيل الشحنة المحددة ومراحلها */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <Loader2 className="size-8 animate-spin text-[#0F4C81] mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">جاري تحميل مسار الشحنة...</p>
          </div>
        ) : selectedOrder ? (
          <div className="space-y-6">
            {/* بطاقة معلومات الشحنة */}
            <div className="bg-gradient-to-r from-[#0F4C81] to-[#0A2540] text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold bg-white/20 px-3 py-1 rounded-full text-sky-200 inline-block mb-2">
                    كود الشحنة: {selectedOrder.trackingCode}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">{selectedOrder.productName}</h3>
                  <p className="text-xs text-sky-200 mt-1">المتجر: {selectedOrder.storeName} | المدينة: {selectedOrder.customerCity}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[140px]">
                  <span className="text-[10px] text-sky-200 font-bold block mb-1">تاريخ الطلب</span>
                  <span className="text-xs font-black text-white">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('ar-YE')}
                  </span>
                </div>
              </div>
            </div>

            {/* قائمة المراحل السبع بتصميم تايم لاين مباشر */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <h3 className="text-base font-black text-[#0F4C81] mb-6 flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#F97316]" />
                خط سير الشحنة المباشر (7 مراحل)
              </h3>

              <div className="space-y-4">
                {trackingStages.map((stage) => {
                  const isDone = stage.completedIf.includes(selectedOrder.status);
                  const isCurrent = stage.currentIf.includes(selectedOrder.status);
                  const Icon = stage.icon;

                  let cardStyle = 'bg-slate-50 border-slate-200 text-slate-400';
                  let iconBadge = 'bg-slate-200 text-slate-500';

                  if (isDone) {
                    cardStyle = 'bg-emerald-50/50 border-emerald-200 text-emerald-900';
                    iconBadge = 'bg-emerald-500 text-white';
                  } else if (isCurrent) {
                    cardStyle = 'bg-blue-50/70 border-sky-300 ring-2 ring-sky-400/30 text-sky-950 shadow-sm';
                    iconBadge = 'bg-[#0F4C81] text-white animate-pulse';
                  }

                  return (
                    <div
                      key={stage.stepNumber}
                      className={`p-4 rounded-2xl border transition flex items-start gap-3.5 ${cardStyle}`}
                    >
                      <div className={`size-10 rounded-xl grid place-items-center shrink-0 font-black text-sm shadow-sm ${iconBadge}`}>
                        {isDone ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-black flex items-center gap-2">
                            <span>{stage.stepNumber}. {stage.title}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-[#F97316] text-white px-2 py-0.5 rounded-md font-bold">
                                المرحلة الحالية
                              </span>
                            )}
                            {isDone && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold">
                                مكتمل
                              </span>
                            )}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{stage.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
            <Package className="size-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-700 mb-1">لا توجد شحنات معروضة حالياً</h3>
            <p className="text-xs text-slate-400 mb-4">يمكنك استخدام مربع البحث أعلاه أو تسجيل طلب جديد من حسابك.</p>
            <Link
              to="/new-order"
              className="inline-flex items-center gap-2 bg-[#F97316] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
            >
              طلب منتج جديد
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = (createFileRoute as any)('/track/')({
  component: CustomerTrackingRoute,
});

export default CustomerTrackingRoute;
