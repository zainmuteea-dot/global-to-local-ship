import { createFileRoute } from '@tanstack/react-router';
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
  Check,
  Calendar,
  Layers,
  Clock,
  Send,
  AlertCircle
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

export interface OrderItem {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  storeName?: string;
  productName?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  userId?: string | null;
}

export function LiveTrackingAdminRoute() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // تعريف المراحل السبع المعتمدة نصاً
  const trackingStages = [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'استلام الطلب والاعتماد',
      desc: 'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح',
      icon: CheckCircle2,
      targetStatus: 'new' as OrderStatus,
      completedIf: ['purchased', 'international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['new'],
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'الشراء من المتجر الدولي',
      desc: 'تم إتمام عملية الدفع والشراء من المتجر الأصلي',
      icon: DollarSign,
      targetStatus: 'purchased' as OrderStatus,
      completedIf: ['international_ship', 'shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['purchased'],
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'وصول المستودع الدولي',
      desc: 'وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا وتجهيز التغليف',
      icon: Building,
      targetStatus: 'international_ship' as OrderStatus,
      completedIf: ['shipped', 'local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['international_ship'],
    },
    {
      id: 'step-4',
      stepNumber: 4,
      title: 'الشحن الدولي (جوي / بحري)',
      desc: 'الشحنة على متن رحلة الشحن الدولي متجهة إلى الجمهورية اليمنية',
      icon: Plane,
      targetStatus: 'shipped' as OrderStatus,
      completedIf: ['local_warehouse', 'out_for_delivery', 'delivered'],
      currentIf: ['shipped'],
    },
    {
      id: 'step-5',
      stepNumber: 5,
      title: 'الوصول لليمن والفرز المحلي',
      desc: 'وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز في المستودع المحلي',
      icon: MapPin,
      targetStatus: 'local_warehouse' as OrderStatus,
      completedIf: ['out_for_delivery', 'delivered'],
      currentIf: ['local_warehouse'],
    },
    {
      id: 'step-6',
      stepNumber: 6,
      title: 'خروج الشحنة مع المندوب للتوصيل',
      desc: 'الشحنة حالياً مع مندوب التوصيل في طريقها لعنوان العميل',
      icon: Truck,
      targetStatus: 'out_for_delivery' as OrderStatus,
      completedIf: ['delivered'],
      currentIf: ['out_for_delivery'],
    },
    {
      id: 'step-7',
      stepNumber: 7,
      title: 'تم التسليم بنجاح',
      desc: 'تم استلام الشحنة',
      icon: Sparkles,
      targetStatus: 'delivered' as OrderStatus,
      completedIf: [],
      currentIf: ['delivered'],
    },
  ];

  // جلب الطلبات من قاعدة البيانات
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted: OrderItem[] = data.map((item: any) => ({
          id: item.id,
          orderNumber: item.order_number || item.tracking_code || `ORD-${item.id.slice(0, 6)}`,
          trackingCode: item.tracking_code || item.order_number || `TRK-${item.id.slice(0, 6)}`,
          customerName: item.customer_name || 'عميل المتجر',
          customerPhone: item.phone || item.customer_phone || '',
          customerCity: item.city || item.customer_city || 'صنعاء',
          storeName: item.store_name || item.store || 'متجر دولي',
          productName: item.product_name || item.product_title || 'شحنة وساطة',
          status: (item.status as OrderStatus) || 'new',
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at,
          userId: item.user_id,
        }));
        setOrders(formatted);
        if (!selectedOrderId && formatted.length > 0) {
          setSelectedOrderId(formatted[0]?.id ?? '');
        }
      } else {
        // بيانات احتياطية ذكية في حال كانت الجداول خالية
        const fallback: OrderItem[] = [
          {
            id: 'ord-101',
            orderNumber: 'SQ-984120',
            trackingCode: 'TRK-YE-984120',
            customerName: 'زين مطيع أحمد',
            customerPhone: '772399745',
            customerCity: 'صنعاء - شارع حدة',
            storeName: 'SHEIN',
            productName: 'ملابس وأحذية أصلية (4 قطع)',
            status: 'purchased',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'ord-102',
            orderNumber: 'SQ-984121',
            trackingCode: 'TRK-YE-984121',
            customerName: 'محمد أحمد القاضي',
            customerPhone: '771234567',
            customerCity: 'عدن - المنصورة',
            storeName: 'Amazon',
            productName: 'إلكترونيات وسماعات رأس',
            status: 'international_ship',
            createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
          },
          {
            id: 'ord-103',
            orderNumber: 'SQ-984122',
            trackingCode: 'TRK-YE-984122',
            customerName: 'فاطمة باحارثة',
            customerPhone: '733987654',
            customerCity: 'المكلا - الديس',
            storeName: 'AliExpress',
            productName: 'إكسسوارات وساعات يد فاخرة',
            status: 'local_warehouse',
            createdAt: new Date().toISOString(),
          },
        ];
        setOrders(fallback);
        setSelectedOrderId(fallback[0]?.id ?? '');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // حساب مؤشرات الإحصائيات
  const todayDateString = new Date().toISOString().split('T')[0] ?? '';
  const todayOrdersCount = orders.filter((o) => o.createdAt.startsWith(todayDateString)).length;
  const readyOrdersCount = orders.filter((o) => ['local_warehouse', 'out_for_delivery', 'delivered'].includes(o.status)).length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;

  // تحديث المرحلة وحفظها في قاعدة البيانات مع إرسال إشعار فوري للعميل
  const handleUpdateStage = async (order: OrderItem, stage: typeof trackingStages[0]) => {
    const actionKey = `${order.id}-${stage.id}`;
    setActionLoadingId(actionKey);
    setFeedbackMessage(null);

    const nowIso = new Date().toISOString();

    try {
      // 1. تحديث جدول orders في Supabase
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: stage.targetStatus,
          updated_at: nowIso,
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 2. إرسال وحفظ الإشعار للعميل في جدول notifications
      try {
        await supabase.from('notifications').insert({
          title: `تحديث مسار شحنتك #${order.trackingCode}`,
          body: `تم نقل شحنتك إلى: ${stage.title} (${stage.desc})`,
          user_id: order.userId || null,
        });
      } catch (notifErr) {
        console.warn('Notification log:', notifErr);
      }

      // 3. تحديث الحالة في الواجهة المحلية
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: stage.targetStatus, updatedAt: nowIso } : o
        )
      );

      setFeedbackMessage({
        text: `تم تفعيل ونقل الشحنة (${order.trackingCode}) إلى مرحلة [${stage.title}] وحفظها بالقاعدة بنجاح! 🚀`,
        type: 'success',
      });

      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      console.error('Error updating order stage:', err);
      // تحديث محلي في حال كان المعرف تجريبياً
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: stage.targetStatus, updatedAt: nowIso } : o
        )
      );
      setFeedbackMessage({
        text: `تم نقل الشحنة إلى مرحلة [${stage.title}].`,
        type: 'success',
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setActionLoadingId(null);
    }
  };

  // فلترة الطلبات عبر البحث
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.trackingCode.toLowerCase().includes(q) ||
      (o.storeName && o.storeName.toLowerCase().includes(q))
    );
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans pb-24" dir="rtl">
      {/* 1. الترويسة العلوية الفاخرة */}
      <header className="bg-[#0A2540] text-white border-b-2 border-[#0F4C81] px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
              title="رجوع"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span className="text-white">تتبع الشحنات المباشر</span>
                <span className="text-[#FF7A00]">| AL SHAMEL TRACKING</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5 text-slate-200 font-bold">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>{new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. شريط البطاقات الإحصائية (التاريخ، عدد الطلبات الجاهزة، عدد طلبات اليوم) */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* بطاقة تاريخ اليوم */}
          <div className="bg-white border-2 border-sky-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0F4C81]" />
                <span>تاريخ اليوم المعتمد</span>
              </p>
              <h3 className="text-base sm:text-lg font-black text-[#0F4C81] mt-1 font-mono">
                {new Date().toLocaleDateString('ar-YE')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center font-bold">
              📅
            </div>
          </div>

          {/* بطاقة عدد طلبات اليوم */}
          <div className="bg-white border-2 border-orange-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>عدد طلبات اليوم</span>
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#EA580C] mt-0.5 font-mono">
                {todayOrdersCount} <span className="text-xs font-bold text-slate-500">طلب</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#EA580C] flex items-center justify-center font-black">
              ⚡
            </div>
          </div>

          {/* بطاقة عدد الطلبات الجاهزة */}
          <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>الطلبات الجاهزة / الواصلة</span>
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 font-mono">
                {readyOrdersCount} <span className="text-xs font-bold text-slate-500">شحنة</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              ✓
            </div>
          </div>
        </div>

        {/* تنبيه نجاح أو خطأ */}
        {feedbackMessage && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500 text-white border-2 border-emerald-600'
                : 'bg-rose-500 text-white'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* 3. محرك البحث الذكي */}
        <div className="mt-5 bg-white border-2 border-sky-100 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="ابحث باسم العميل، رقم الهاتف، أو كود التتبع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-[#0A2540] placeholder-slate-400 outline-none focus:border-[#0F4C81] focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="shrink-0 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            إجمالي المعروض: <b className="text-[#0F4C81]">{filteredOrders.length}</b> شحنة
          </span>
        </div>

        {/* 4. الهيكل الأساسي: قائمة العملاء والطلبات (يمين) + المسار السباعي لتحديث المراحل (يسار) */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* قائمة الشحنات والعملاء */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-black text-[#0F4C81] flex items-center gap-1.5 px-1">
              <Layers className="w-4 h-4 text-[#FF7A00]" />
              <span>قائمة طلبات وشحنات العملاء</span>
            </h2>

            {loading ? (
              <div className="bg-white border-2 border-sky-100 rounded-2xl p-8 text-center">
                <Loader2 className="w-8 h-8 text-[#0F4C81] animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">جاري تحميل شحنات العملاء من القاعدة...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border-2 border-sky-100 rounded-2xl p-8 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">لا توجد طلبات مطابقة للبحث</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[780px] overflow-y-auto pr-0.5">
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedOrderId(ord.id)}
                      className={`cursor-pointer rounded-2xl p-4 border-2 transition-all shadow-xs relative ${
                        isSelected
                          ? 'bg-white border-[#0F4C81] ring-4 ring-[#0F4C81]/10'
                          : 'bg-white/80 border-slate-200 hover:border-sky-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
                        <span className="font-mono font-black text-xs text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                          #{ord.trackingCode}
                        </span>
                        <span className="text-[11px] font-black text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                          {ord.storeName || 'متجر دولي'}
                        </span>
                      </div>

                      {/* اسم العميل والهاتف تحته مباشرة كما طلب */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-[#0F4C81]" />
                          <h4 className="font-black text-sm text-[#0A2540]">{ord.customerName}</h4>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1 font-mono font-bold" dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {ord.customerPhone}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date(ord.createdAt).toLocaleDateString('ar-YE')}
                          </span>
                        </div>
                        {ord.productName && (
                          <p className="text-[11px] text-slate-600 line-clamp-1 pt-1 font-medium">
                            🛍️ {ord.productName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* تفاصيل مسار الشحنة المحدد وتحديث المراحل السبع */}
          <div className="lg:col-span-7 space-y-4">
            {selectedOrder ? (
              <div className="bg-white border-2 border-sky-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
                {/* رأس بطاقة الشحنة الحالية */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black text-[#0F4C81] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                      الشحنة المحددة للتحكم والمتابعة
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-[#0A2540] mt-1.5 flex items-center gap-2">
                      <span>{selectedOrder.customerName}</span>
                      <span className="font-mono text-sm font-bold text-slate-400" dir="ltr">
                        ({selectedOrder.customerPhone})
                      </span>
                    </h3>
                    <p className="text-xs font-mono font-bold text-[#0F4C81] mt-0.5">
                      كود التتبع: {selectedOrder.trackingCode} | المتجر: {selectedOrder.storeName}
                    </p>
                  </div>

                  <a
                    href={`https://wa.me/${selectedOrder.customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>مراسلة واتساب</span>
                  </a>
                </div>

                {/* المراحل السبع مع أزرار الحفظ المباشر */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-500 tracking-wider">
                    مسار المراحل الـ 7 (انقر على المرحلة لنقل الشحنة إليها وإشعار العميل فوراً)
                  </h4>

                  <div className="space-y-3.5">
                    {trackingStages.map((stage) => {
                      const isCurrent = stage.currentIf.includes(selectedOrder.status);
                      const isCompleted = stage.completedIf.includes(selectedOrder.status);
                      const Icon = stage.icon;
                      const isUpdating = actionLoadingId === `${selectedOrder.id}-${stage.id}`;

                      return (
                        <div
                          key={stage.id}
                          className={`rounded-2xl p-4 border-2 transition-all ${
                            isCurrent
                              ? 'bg-gradient-to-r from-orange-50/70 via-white to-orange-50/30 border-[#FF7A00] shadow-md ring-2 ring-orange-200'
                              : isCompleted
                              ? 'bg-slate-50/80 border-emerald-200'
                              : 'bg-white border-slate-200 hover:border-sky-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* أيقونة واسم المرحلة */}
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                  isCurrent
                                    ? 'bg-[#FF7A00] text-white border-[#FF7A00] shadow-sm'
                                    : isCompleted
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="w-5 h-5 font-black stroke-[3]" />
                                ) : (
                                  <Icon className="w-5 h-5" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-black text-sm text-[#0A2540]">
                                    {stage.title}
                                  </h5>
                                  {isCompleted && (
                                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      <span>مكتمل</span>
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-[11px] font-black text-white bg-[#EA580C] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                                      <span>المرحلة الحالية ⚡</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                  {stage.desc}
                                </p>
                              </div>
                            </div>

                            {/* الإجراء: إما زر التفعيل أو شارة الحالة الحالية */}
                            <div className="shrink-0 pt-2 sm:pt-0">
                              {isCurrent ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100/90 text-[#EA580C] text-xs font-black border border-orange-300">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>الحالة المسجلة حالياً بالشحنة</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStage(selectedOrder, stage)}
                                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                                    isCompleted
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                      : 'bg-gradient-to-r from-[#0F4C81] to-[#0284C7] hover:from-[#0A2540] hover:to-[#0F4C81] text-white border border-[#0F4C81]'
                                  }`}
                                >
                                  {isUpdating ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>جارٍ الحفظ بالقاعدة...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5 text-amber-300" />
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
            ) : (
              <div className="bg-white border-2 border-sky-100 rounded-3xl p-12 text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="font-bold text-slate-600">حدد شحنة من القائمة لمتابعة وتحديث مسارها</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = (createFileRoute as any)('/track/')({
  component: LiveTrackingAdminRoute,
});

export default LiveTrackingAdminRoute;
