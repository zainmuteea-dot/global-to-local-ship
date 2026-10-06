import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Package,
  Plane,
  Truck,
  CheckCircle2,
  MapPin,
  DollarSign,
  Building,
  Sparkles,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  Lock,
  RefreshCw,
  Phone,
  User,
  CalendarDays,
  Radio,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin-tracking')({
  head: () => ({
    meta: [
      { title: 'تتبع الشحنات المباشر — الإدارة | السوق الشامل' },
      { name: 'description', content: 'لوحة تتبع الشحنات المباشرة للموظفين: تحديث مراحل الشحن وحفظها بالقاعدة تلقائياً.' },
    ],
  }),
  component: LiveTrackingAdminRoute,
});

// أكواد المراحل السبع المعتمدة (تُحفظ في عمود status بالقاعدة)
type StageCode = 'new' | 'purchased' | 'international_ship' | 'shipped' | 'local_warehouse' | 'out_for_delivery' | 'delivered';

interface Shipment {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  productLink: string | null;
  storeName: string;
  city: string;
  status: StageCode | string;
  userId: string | null;
  createdAt: string;
  updatedAt?: string;
}

// عناوين المراحل السبع كما تظهر للعميل حتى يتطابق المسار في الشاشتين
const STAGES: Array<{
  code: StageCode;
  stepNumber: number;
  title: string;
  customerNote: string;
  icon: typeof CheckCircle2;
}> = [
  {
    code: 'new',
    stepNumber: 1,
    title: 'استلام الطلب والاعتماد',
    customerNote: 'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح',
    icon: CheckCircle2,
  },
  {
    code: 'purchased',
    stepNumber: 2,
    title: 'الشراء من المتجر الدولي',
    customerNote: 'تم إتمام عملية الدفع والشراء من المتجر الأصلي',
    icon: DollarSign,
  },
  {
    code: 'international_ship',
    stepNumber: 3,
    title: 'وصول المستودع الدولي',
    customerNote: 'وصلت الشحنة لمستودعنا وجاري الفحص والتغليف الآمن',
    icon: Building,
  },
  {
    code: 'shipped',
    stepNumber: 4,
    title: 'الشحن الدولي (جوي / بحري)',
    customerNote: 'الشحنة على متن رحلة الشحن الدولي متجهة إلى اليمن',
    icon: Plane,
  },
  {
    code: 'local_warehouse',
    stepNumber: 5,
    title: 'الوصول لليمن والفرز المحلي',
    customerNote: 'وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز المحلي',
    icon: MapPin,
  },
  {
    code: 'out_for_delivery',
    stepNumber: 6,
    title: 'خروج الشحنة مع المندوب للتوصيل',
    customerNote: 'الشحنة حالياً مع مندوب التوصيل في طريقها لعنوانك',
    icon: Truck,
  },
  {
    code: 'delivered',
    stepNumber: 7,
    title: 'تم التسليم بنجاح',
    customerNote: 'تم تسليم الشحنة للعميل بنجاح واستلام الطلب',
    icon: Sparkles,
  },
];

const STAGE_ORDER: StageCode[] = STAGES.map((s) => s.code);

// توحيد الحالات القديمة (عربية أو أكواد سابقة) إلى أكواد المراحل السبع
const STATUS_NORMALIZE: Record<string, StageCode | 'cancelled'> = {
  new: 'new',
  'جديد': 'new',
  reviewing: 'new',
  'قيد المراجعة': 'new',
  purchased: 'purchased',
  'تم الشراء': 'purchased',
  warehouse_china: 'international_ship',
  'المستودع الدولي': 'international_ship',
  international_ship: 'international_ship',
  'شحن دولي': 'international_ship',
  shipped: 'shipped',
  'الفرز والتوصيل': 'shipped',
  local_warehouse: 'local_warehouse',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  'تم التسليم': 'delivered',
  cancelled: 'cancelled',
  'ملغي': 'cancelled',
};

function normalizeStatus(raw: string): StageCode | 'cancelled' | 'unknown' {
  const value = (raw || '').trim().toLowerCase();
  const mapped = STATUS_NORMALIZE[value];
  if (mapped) return mapped;
  return 'unknown';
}

function stageIndexFor(status: string): number {
  const normalized = normalizeStatus(status);
  if (normalized === 'cancelled' || normalized === 'unknown') return 0;
  return STAGE_ORDER.indexOf(normalized);
}

function detectStore(link: string | null | undefined): string {
  const value = (link || '').toLowerCase();
  if (value.includes('amazon')) return 'Amazon';
  if (value.includes('aliexpress')) return 'AliExpress';
  if (value.includes('alibaba')) return 'Alibaba';
  if (value.includes('temu')) return 'TEMU';
  if (value.includes('trendyol')) return 'Trendyol';
  if (value.includes('shein')) return 'SHEIN';
  return 'متجر دولي';
}

type Access = 'loading' | 'allowed' | 'denied';

function LiveTrackingAdminRoute() {
  const [access, setAccess] = useState<Access>('loading');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // فحص الجلسة والدور (الموظفون والإدارة فقط)
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAccess('denied');
        return;
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);
      const allowed = (roles || []).some((r: { role: string }) => r.role === 'admin' || r.role === 'staff');
      setAccess(allowed ? 'allowed' : 'denied');
    };
    checkAccess();
  }, []);

  // جلب جميع الشحنات من القاعدة
  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Shipment[] = (data as any[]).map((item: any) => ({
          id: String(item['id']),
          trackingCode: item['tracking_code'] || `TRK-${String(item['id']).slice(0, 6)}`,
          customerName: item['customer_name'] || 'عميل مسجل',
          customerPhone: item['phone'] || '',
          productName: item['product_name'] || 'شحنة وساطة',
          productLink: item['product_link'] || null,
          storeName: detectStore(item['product_link']),
          city: item['notes'] || 'صنعاء',
          status: item['status'] || 'new',
          userId: item['user_id'] || null,
          createdAt: item['created_at'] || new Date().toISOString(),
          updatedAt: item['updated_at'] || undefined,
        }));
        setShipments(mapped);
      }
    } catch (err) {
      console.error('خطأ في جلب الشحنات:', err);
    } finally {
      setLoading(false);
    }
  };

  // تحميل أولي + اشتراك لحظي مع جدول الطلبات
  useEffect(() => {
    if (access !== 'allowed') return;
    fetchShipments();

    const channel = supabase
      .channel('admin_tracking_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchShipments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [access]);

  // إظهار رسالة مؤقتة
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // تفعيل مرحلة: حفظ بالقاعدة + إشعار تلقائي للعميل
  const activateStage = async (shipment: Shipment, stage: (typeof STAGES)[number]) => {
    setBusyId(shipment.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: stage.code, updated_at: new Date().toISOString() })
        .eq('id', shipment.id);

      if (error) {
        setToast({ kind: 'error', text: 'تعذر حفظ المرحلة في القاعدة. تحقق من الصلاحيات وحاول مجدداً.' });
        return;
      }

      await supabase.from('notifications').insert({
        user_id: shipment.userId,
        title: `تحديث مسار الشحنة (${shipment.trackingCode})`,
        body: `مرحباً ${shipment.customerName}، ${stage.customerNote}.`,
      });

      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipment.id ? { ...s, status: stage.code, updatedAt: new Date().toISOString() } : s
        )
      );
      setToast({
        kind: 'success',
        text: `تم نقل الشحنة ${shipment.trackingCode} إلى المرحلة (${stage.stepNumber}. ${stage.title}) وحفظها بالقاعدة وإشعار العميل.`,
      });
    } catch (err) {
      console.error('فشل تفعيل المرحلة:', err);
      setToast({ kind: 'error', text: 'حدث خطأ غير متوقع أثناء الحفظ.' });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return shipments;
    return shipments.filter(
      (s) =>
        s.trackingCode.toLowerCase().includes(term) ||
        s.customerName.includes(term) ||
        s.customerPhone.includes(term)
    );
  }, [shipments, searchInput]);

  const todayKey = new Date().toDateString();
  const todayOrders = shipments.filter(
    (s) => new Date(s.createdAt).toDateString() === todayKey
  ).length;
  const readyShipments = shipments.filter((s) => normalizeStatus(s.status) === 'out_for_delivery').length;
  const deliveredCount = shipments.filter((s) => normalizeStatus(s.status) === 'delivered').length;

  // شاشة الفحص
  if (access === 'loading') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] grid place-items-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-[#0F4C81] mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">جاري التحقق من صلاحيات الموظف...</p>
        </div>
      </div>
    );
  }

  // شاشة عدم السماح
  if (access === 'denied') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] grid place-items-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm">
          <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto mb-4">
            <Lock className="size-7" />
          </div>
          <h1 className="text-lg font-black text-[#0A2540]">هذه الشاشة للموظفين والإدارة فقط</h1>
          <p className="text-xs text-slate-500 mt-2 mb-6">
            تتبع الشحنات المباشر متاح لحساب الموظفين. إذا كنت عميلاً، تابع شحنتك من صفحة التتبع الخاصة بك.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/track"
              className="bg-[#F97316] hover:bg-[#EA580C] text-white px-5 py-3 rounded-2xl font-black text-sm transition"
            >
              تتبع شحنتي (للعملاء)
            </Link>
            <Link
              to="/login"
              className="bg-[#0F4C81] hover:bg-[#0A2540] text-white px-5 py-3 rounded-2xl font-black text-sm transition"
            >
              تسجيل دخول الموظفين
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* الترويسة الرئيسية */}
      <header className="bg-[#0F4C81] text-white border-b border-sky-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
                <Radio className="size-5 text-[#F97316]" />
                تتبع الشحنات المباشر — تحكم الموظفين
              </h1>
              <p className="text-[11px] text-sky-200">نقل الشحنات بين المراحل السبع وحفظها بالقاعدة مع إشعار تلقائي للعميل</p>
            </div>
          </div>
          <button
            onClick={fetchShipments}
            disabled={loading}
            className="text-xs bg-white/15 hover:bg-white/25 text-white px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* بطاقة الإحصائيات وتاريخ اليوم */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-[#0F4C81] text-white grid place-items-center">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-bold">تاريخ اليوم</p>
                <p className="text-sm font-black text-[#0A2540]">
                  {new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center min-w-[92px]">
                <p className="text-xl font-black text-[#0F4C81]">{shipments.length}</p>
                <p className="text-[10px] font-bold text-slate-500">إجمالي الشحنات</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center min-w-[92px]">
                <p className="text-xl font-black text-[#EA580C]">{todayOrders}</p>
                <p className="text-[10px] font-bold text-amber-700">طلبات اليوم</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-center min-w-[92px]">
                <p className="text-xl font-black text-[#F97316]">{readyShipments}</p>
                <p className="text-[10px] font-bold text-orange-700">جاهزة للتوصيل</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center min-w-[92px]">
                <p className="text-xl font-black text-emerald-600">{deliveredCount}</p>
                <p className="text-[10px] font-bold text-emerald-700">تم التسليم</p>
              </div>
            </div>
          </div>

          {/* البحث */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-5 relative"
          >
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث برقم الشحنة أو اسم العميل أو رقم الهاتف..."
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F4C81] focus:bg-white transition"
            />
          </form>
        </div>

        {/* رسالة الحفظ */}
        {toast && (
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.kind === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* قائمة الشحنات */}
        {loading && shipments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <Loader2 className="size-8 animate-spin text-[#0F4C81] mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">جاري جلب الشحنات من القاعدة...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
            <Package className="size-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-700 mb-1">لا توجد شحنات مطابقة</h3>
            <p className="text-xs text-slate-400">
              {shipments.length === 0
                ? 'لم تُسجل أي شحنة في القاعدة بعد. أضف شحنة جديدة من لوحة الإدارة.'
                : 'جرّب تغيير كلمة البحث أو مسح حقل البحث.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((shipment) => {
              const currentIndex = stageIndexFor(shipment.status);
              const isCancelled = normalizeStatus(shipment.status) === 'cancelled';
  const currentStage = STAGES.find((s) => s.code === normalizeStatus(shipment.status));

              return (
                <div key={shipment.id} className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
                  {/* ترويسة الشحنة */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold bg-[#0F4C81]/10 text-[#0F4C81] px-3 py-1 rounded-full font-mono" dir="ltr">
                          {shipment.trackingCode}
                        </span>
                        <span className="text-[10px] bg-orange-100 text-[#EA580C] px-2 py-0.5 rounded-md font-bold">
                          {shipment.storeName}
                        </span>
                        {isCancelled && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">
                            ملغي
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-[#0A2540]">{shipment.productName}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 font-bold">
                        <span className="flex items-center gap-1">
                          <User className="size-3.5 text-slate-400" />
                          {shipment.customerName}
                        </span>
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone className="size-3.5 text-slate-400" />
                          {shipment.customerPhone || 'غير مسجل'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-slate-400" />
                          {shipment.city}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">المرحلة الحالية</p>
                      <p className="text-xs font-black text-[#0F4C81] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                        {currentStage
                          ? `${currentStage.stepNumber}. ${currentStage.title}`
                          : 'بانتظار التسجيل'}
                      </p>
                    </div>
                  </div>

                  {/* خط سير المراحل السبع مع أزرار التفعيل */}
                  <div className="mt-4 space-y-3">
                    {STAGES.map((stage) => {
                      const idx = STAGE_ORDER.indexOf(stage.code);
                      const isDone = idx < currentIndex;
                      const isCurrent = idx === currentIndex;
                      const Icon = stage.icon;

                      let cardStyle = 'bg-slate-50 border-slate-200';
                      let iconBadge = 'bg-slate-200 text-slate-500';

                      if (isDone) {
                        cardStyle = 'bg-emerald-50/60 border-emerald-200';
                        iconBadge = 'bg-emerald-500 text-white';
                      } else if (isCurrent) {
                        cardStyle = 'bg-blue-50/70 border-sky-300 ring-2 ring-sky-400/30';
                        iconBadge = 'bg-[#0F4C81] text-white';
                      }

                      return (
                        <div
                          key={stage.code}
                          className={`p-3.5 rounded-2xl border transition flex items-start gap-3.5 ${cardStyle}`}
                        >
                          <div className={`size-10 rounded-xl grid place-items-center shrink-0 shadow-sm ${iconBadge}`}>
                            {isDone ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className={`text-sm font-black ${isCurrent ? 'text-[#0F4C81]' : isDone ? 'text-emerald-900' : 'text-slate-600'}`}>
                                {stage.stepNumber}. {stage.title}
                              </h4>
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
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{stage.customerNote}</p>
                          </div>

                          {/* زر التفعيل والحفظ بالقاعدة */}
                          {!isCurrent && !isDone && (
                            <button
                              onClick={() => activateStage(shipment, stage)}
                              disabled={busyId === shipment.id}
                              className="shrink-0 self-center bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
                            >
                              {busyId === shipment.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="size-3.5" />
                              )}
                              <span>تفعيل ونقل الشحنة لهذه المرحلة (حفظ بالقاعدة)</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default LiveTrackingAdminRoute;
