import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CreditCard,
  Home,
  MapPin,
  Package,
  PackageSearch,
  Plane,
  Printer,
  ShoppingBag,
  Truck,
  Volume2,
  VolumeX,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { findTrackedOrder } from "@/lib/order-tracking.functions";

export const Route = createFileRoute("/track/$trackingCode")({
  head: () => ({ meta: [{ title: "مسار الشحنة — السوق الشامل" }] }),
  component: TrackingDetailPage,
});

const STEPS = [
  {
    key: "new",
    title: "استلام الطلب والتدقيق",
    location: "مكتب الاستقبال المركزي",
    desc: "تسجيل الطلب وتدقيق روابط السلع والكميات والمقاسات والألوان.",
    icon: Package,
  },
  {
    key: "payment_review",
    title: "التدقيق المالي والدفع",
    location: "قسم الحسابات والوساطة",
    desc: "حساب التكلفة والعملات وتأكيد استلام الدفعة.",
    icon: CreditCard,
  },
  {
    key: "purchased",
    title: "الشراء من المتجر الدولي",
    location: "الصين / أمريكا / الإمارات / تركيا",
    desc: "إتمام الشراء وإصدار كود الشحن وفاتورة المورد.",
    icon: ShoppingBag,
  },
  {
    key: "international_warehouse",
    title: "وصول مستودع التجميع الدولي",
    location: "كوانزو / دبي / الرياض",
    desc: "فحص الجودة ومطابقة الوزن والتغليف الآمن.",
    icon: Warehouse,
  },
  {
    key: "international_transit",
    title: "الشحن الدولي في الترانزيت",
    location: "في الطريق إلى الجمهورية اليمنية",
    desc: "انطلاق الشحن الجوي أو البحري نحو اليمن.",
    icon: Plane,
  },
  {
    key: "customs_local",
    title: "الجمارك والفرز بالمستودع المحلي",
    location: "صنعاء / عدن",
    desc: "التخليص الجمركي والفرز حسب المحافظات والمدن.",
    icon: MapPin,
  },
  {
    key: "out_for_delivery",
    title: "جاري التوصيل مع المندوب",
    location: "مندوب التوصيل الميداني",
    desc: "خرجت الشحنة مع المندوب إلى عنوان العميل.",
    icon: Truck,
  },
  {
    key: "delivered",
    title: "تم التسليم للعميل بنجاح",
    location: "عنوان العميل النهائي",
    desc: "تم استلام الطرد وإغلاق الطلب.",
    icon: Home,
  },
] as const;

type StepCode = (typeof STEPS)[number]["key"];
type TrackedOrder = {
  trackingCode: string;
  status: string;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
};

const stepCodes: StepCode[] = STEPS.map((step) => step.key);

function getStepIndex(rawStatus: string): number {
  const status = (rawStatus || "").trim().toLowerCase();
  const legacyStatuses: Record<string, StepCode> = {
    جديد: "new",
    reviewing: "new",
    "قيد المراجعة": "new",
    "قيد الشراء والتجهيز": "purchased",
    warehouse_china: "international_warehouse",
    "المستودع الدولي": "international_warehouse",
    international_ship: "international_transit",
    shipped: "international_transit",
    "شحن دولي": "international_transit",
    local_warehouse: "customs_local",
    "الفرز والتوصيل": "customs_local",
    "تم التسليم": "delivered",
  };
  const normalized = legacyStatuses[status] ?? status;
  const index = stepCodes.indexOf(normalized as StepCode);
  return index < 0 ? 0 : index;
}

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const startAt = context.currentTime;
    [880, 1174].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const offset = index * 0.16;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.13, startAt + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.24);
    });
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // الصوت اختياري، ولا ينبغي أن يؤثر تعذره على التتبع.
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "غير متاح";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "غير متاح" : date.toLocaleDateString("ar-YE");
}

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [banner, setBanner] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const previousStatus = useRef<string | null>(null);
  const refreshInFlight = useRef(false);

  const lookupOrder = useCallback(
    async (phone: string, isInitialLookup: boolean) => {
      if (!trackingCode?.trim()) {
        setError("رقم التتبع غير موجود في الرابط.");
        return;
      }
      if (!isInitialLookup && refreshInFlight.current) return;

      if (!isInitialLookup) {
        refreshInFlight.current = true;
        setRefreshing(true);
      }

      try {
        const result = await findTrackedOrder({
          data: {
            code: trackingCode.trim(),
            phone: phone.trim(),
          },
        });

        if (!result) {
          if (isInitialLookup) {
            setOrder(null);
            previousStatus.current = null;
            setError("لم نجد شحنة تطابق رقم التتبع ورقم الهاتف. تحقق منهما وحاول مجدداً.");
          } else {
            setRefreshError("تعذر تحديث حالة الشحنة الآن. سنحاول مجدداً تلقائياً.");
          }
          return;
        }

        const safeOrder: TrackedOrder = {
          trackingCode: result.trackingCode,
          status: result.status,
          productName: result.productName,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };

        if (previousStatus.current && previousStatus.current !== safeOrder.status) {
          setBanner(
            `تحديث جديد: ${STEPS[getStepIndex(safeOrder.status)]?.title ?? "تحديث الحالة"}`,
          );
          if (soundOn) playNotificationSound();
        }
        previousStatus.current = safeOrder.status;
        setOrder(safeOrder);
        setError("");
        setRefreshError("");
      } catch {
        if (isInitialLookup) {
          setError("تعذر التحقق من الشحنة حالياً. تحقق من اتصالك وحاول مرة أخرى.");
        } else {
          setRefreshError("تعذر تحديث حالة الشحنة الآن. سنحاول مجدداً تلقائياً.");
        }
      } finally {
        if (isInitialLookup) setLoading(false);
        else {
          refreshInFlight.current = false;
          setRefreshing(false);
        }
      }
    },
    [trackingCode, soundOn],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phone = phoneInput.trim();
    if (phone.length < 9 || phone.length > 30) {
      setError("أدخل رقم الهاتف المرتبط بالطلب، من 9 إلى 30 خانة.");
      return;
    }
    setError("");
    setLoading(true);
    setVerifiedPhone(phone);
    void lookupOrder(phone, true);
  };

  useEffect(() => {
    if (!order || !verifiedPhone) return;
    const timer = window.setInterval(() => {
      void lookupOrder(verifiedPhone, false);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [order, verifiedPhone, lookupOrder]);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(""), 10_000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const startOver = () => {
    setOrder(null);
    setVerifiedPhone("");
    setPhoneInput("");
    setError("");
    setRefreshError("");
    setBanner("");
    previousStatus.current = null;
  };

  if (!order) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#FDF8EE] p-5 font-body">
        <section className="w-full max-w-md rounded-2xl border border-[#e8d7bb] bg-white p-6 text-center shadow-sm">
          <PackageSearch className="mx-auto size-12 text-[#C17A4A]" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-black text-[#4A3728]">تحقق من الشحنة</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            لحماية بياناتك، أدخل رقم الهاتف المرتبط بالطلب لعرض مسار الشحنة.
          </p>
          <div className="mt-4 rounded-xl bg-[#FAF4E6] p-3 text-right text-sm">
            <span className="text-xs text-slate-500">رقم التتبع</span>
            <p dir="ltr" className="mt-1 break-all text-left font-mono font-bold text-[#8B5E34]">
              {trackingCode}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-right">
            <label htmlFor="tracking-phone" className="block text-sm font-bold text-[#4A3728]">
              رقم الهاتف المستخدم في الطلب
            </label>
            <input
              id="tracking-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              required
              minLength={9}
              maxLength={30}
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              placeholder="مثال: 7XXXXXXXX أو +9677XXXXXXXX"
              className="w-full rounded-xl border border-[#dfd4c3] bg-white px-4 py-3 text-left outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/20"
              aria-describedby={error ? "tracking-error" : undefined}
            />
            {error && (
              <p id="tracking-error" role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#8B5E34] hover:bg-[#704820]"
            >
              {loading ? "جارٍ التحقق..." : "عرض مسار الشحنة"}
            </Button>
          </form>
          <Button asChild variant="outline" className="mt-3 w-full rounded-xl">
            <Link to="/track">
              <ArrowRight className="ml-1 size-4" /> العودة للتتبع
            </Link>
          </Button>
        </section>
      </div>
    );
  }

  const activeStep = getStepIndex(order.status);
  const progress = Math.round((activeStep / (STEPS.length - 1)) * 100);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FDF8EE] px-4 pb-14 pt-5 font-body">
      <main className="mx-auto max-w-2xl">
        {banner && (
          <div
            role="status"
            className="sticky top-2 z-30 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-950 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Bell className="size-5 animate-pulse" aria-hidden="true" />
              {banner}
            </div>
            <button onClick={() => setBanner("")} aria-label="إغلاق التنبيه" className="text-xl">
              ×
            </button>
          </div>
        )}

        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8d7bb] bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs text-slate-500">حالة الشحنة</p>
            <h1 className="mt-1 font-black text-[#4A3728]">
              {STEPS[activeStep]?.title ?? "قيد المتابعة"}
            </h1>
            {refreshing && <p className="mt-1 text-xs text-slate-500">جارٍ تحديث الحالة...</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSoundOn((enabled) => {
                  if (!enabled) playNotificationSound();
                  return !enabled;
                });
              }}
              className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"
              aria-label={soundOn ? "إيقاف صوت التنبيه" : "تفعيل صوت التنبيه"}
            >
              {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              {soundOn ? "الصوت مفعل" : "تفعيل الصوت"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"
            >
              <Printer className="size-4" /> طباعة
            </button>
          </div>
        </header>

        <section className="mt-3 flex items-center justify-between rounded-2xl border border-[#e8d7bb] bg-white p-4">
          <div>
            <p className="text-xs text-slate-500">رقم الشحنة</p>
            <p dir="ltr" className="font-mono font-black text-[#8B5E34]">
              {order.trackingCode}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-500">نسبة الإنجاز</p>
            <p className="font-black text-emerald-700">{progress}%</p>
          </div>
        </section>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-label="نسبة إنجاز الشحنة"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#e8d7bb] bg-white p-4 text-sm">
          <div>
            <span className="text-xs text-slate-500">المنتج</span>
            <p className="font-bold">{order.productName || "شحنة"}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">تاريخ الطلب</span>
            <p className="font-bold">{formatDate(order.createdAt)}</p>
          </div>
          <div className="col-span-2 border-t border-slate-100 pt-2">
            <span className="text-xs text-slate-500">آخر تحديث</span>
            <p className="font-bold">{formatDate(order.updatedAt)}</p>
          </div>
        </section>

        {refreshError && (
          <p
            role="status"
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {refreshError}
          </p>
        )}

        <section className="mt-5 rounded-2xl border border-[#e8d7bb] bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-black text-[#4A3728]">المراحل الثماني للشحنة</h2>
          <ol className="space-y-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const complete = index < activeStep;
              const current = index === activeStep;
              return (
                <li key={step.key} className="relative flex gap-3">
                  {index < STEPS.length - 1 && (
                    <span
                      className={`absolute right-4 top-9 h-[calc(100%+12px)] w-0.5 ${
                        index < activeStep ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full ${
                      complete
                        ? "bg-emerald-600 text-white"
                        : current
                          ? "bg-[#8B5E34] text-white ring-4 ring-[#8B5E34]/20"
                          : "border bg-slate-100 text-slate-400"
                    }`}
                  >
                    {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <div
                    className={`flex-1 rounded-xl ${current ? "border border-[#8B5E34]/20 bg-[#FAF4E6] p-3" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <b className={complete || current ? "text-[#4A3728]" : "text-slate-400"}>
                        {index + 1}. {step.title}
                      </b>
                      {current && (
                        <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          الآن
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{step.location}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={startOver}
            className="rounded-xl bg-white"
          >
            التحقق برقم هاتف آخر
          </Button>
          <Button asChild variant="outline" className="rounded-xl bg-white">
            <Link to="/track">
              <ArrowRight className="ml-1 size-4" /> البحث عن شحنة أخرى
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
