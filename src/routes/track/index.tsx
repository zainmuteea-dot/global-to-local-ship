import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Hash,
  MapPin,
  Phone,
  Plane,
  Printer,
  Search,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "تتبع الطلب — السوق الشامل" },
      { name: "description", content: "تابع مسار شحنتك خطوة بخطوة بالرقم والهاتف." },
      { property: "og:title", content: "تتبع الطلب — السوق الشامل" },
    ],
  }),
  component: TrackPage,
});

// المراحل السبع المعتمدة مطابقة للصورة الثانية
const TRACKING_STAGES = [
  {
    id: 1,
    title: "استلام الطلب والاعتماد",
    desc: "تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح",
    icon: Check,
  },
  {
    id: 2,
    title: "الشراء من المتجر الدولي",
    desc: "تم إتمام عملية الدفع والشراء من المتجر الأصلي",
    icon: DollarSign,
  },
  {
    id: 3,
    title: "وصول المستودع الدولي",
    desc: "وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا وتجهيز التغليف",
    icon: Building2,
  },
  {
    id: 4,
    title: "الشحن الدولي (جوي / بحري)",
    desc: "الشحنة على متن رحلة الشحن الدولي متجهة إلى الجمهورية اليمنية",
    icon: Plane,
  },
  {
    id: 5,
    title: "الوصول لليمن والفرز المحلي",
    desc: "وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز في المستودع المحلي",
    icon: MapPin,
  },
  {
    id: 6,
    title: "خروج الشحنة مع المندوب للتوصيل",
    desc: "الشحنة حالياً مع مندوب التوصيل في طريقها لعنوان العميل",
    icon: Truck,
  },
  {
    id: 7,
    title: "تم التسليم بنجاح",
    desc: "تم استلام الشحنة من قبل العميل بنجاح وسداد الرصيد",
    icon: Sparkles,
  },
];

// تحديد رقم المرحلة الحالية حسب حالة الطلب في قاعدة البيانات
function getActiveStageIndex(status: string): number {
  const s = (status || "").toLowerCase();
  if (s.includes("تسليم") || s.includes("delivered") || s.includes("مكتمل")) return 6;
  if (s.includes("مندوب") || s.includes("خروج") || s.includes("توصيل")) return 5;
  if (s.includes("يمن") || s.includes("فرز") || s.includes("وصول")) return 4;
  if (s.includes("شحن") || s.includes("جوي") || s.includes("بحري")) return 3;
  if (s.includes("مستودع") || s.includes("تغليف")) return 2;
  if (s.includes("شراء") || s.includes("دفع")) return 1;
  return 0; // استلام واعتماد
}

export function TrackPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any | null>(null);

  // جلب رقم هاتف العميل تلقائياً عند فتح الصفحة دون الحاجة لإعادة كتابته
  useEffect(() => {
    const autoFillPhone = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // 1. محاولة جلبه من جدول الملفات الشخصية
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.phone) {
            setPhone(profile.phone);
            return;
          }

          // 2. محاولة جلبه من بيانات الميتاداتا
          const metaPhone = session.user.user_metadata?.phone;
          if (metaPhone) {
            setPhone(metaPhone);
            return;
          }
        }

        // 3. محاولة جلبه من الذاكرة المحلية للجلسة
        const localPhone =
          sessionStorage.getItem("sc_phone") ||
          sessionStorage.getItem("user_phone") ||
          localStorage.getItem("sc_phone");
        if (localPhone) {
          setPhone(localPhone);
        }
      } catch {
        // تجاهل الأخطاء واستمرار العمل اليدوي
      }
    };

    autoFillPhone();
  }, []);

  // الاستعلام عن الشحنة في قاعدة البيانات
  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanCode) {
      setError("يرجى إدخال رقم الطلب (مثال: SQ-892411)");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      // البحث في جدول الطلبات orders
      const { data, error: qErr } = await supabase
        .from("orders")
        .select("*")
        .ilike("tracking_code", cleanCode);

      if (qErr) throw qErr;

      if (!data || data.length === 0) {
        setError("لم يتم العثور على شحنة مسجلة برقم الطلب هذا.");
        return;
      }

      // مطابقة رقم الهاتف إذا كان مدخلاً
      const match = data.find((row: any) => {
        if (!cleanPhone) return true;
        const rowPhone = (row.phone || "").replace(/\D/g, "");
        return (
          rowPhone.endsWith(cleanPhone.slice(-8)) ||
          cleanPhone.endsWith(rowPhone.slice(-8))
        );
      });

      if (!match) {
        setError("رقم الطلب صحيح ولكن رقم الهاتف غير مطابق للطلب.");
        return;
      }

      setOrder({
        trackingCode: match.tracking_code || cleanCode,
        customerName: match.customer_name || "عميل السوق الشامل",
        phone: match.phone || phone,
        status: match.status || "تم الاستلام والاعتماد",
        productName: match.product_name || "أجهزة إلكترونية ومشتريات",
        productLink: match.product_link || "",
        createdAt: match.created_at
          ? new Date(match.created_at).toLocaleDateString("ar-YE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "21 سبتمبر 2026",
      });
    } catch {
      setError("حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من اتصالك وحاول ثانية.");
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = order ? getActiveStageIndex(order.status) : 0;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FDF8EE] px-4 pb-14 pt-5 font-body">
      <main className="mx-auto w-full max-w-md">
        {/* شريط الرأس: أيقونة المستخدم + عنوان تتبع الطلب + زر الرجوع */}
        <header className="flex items-center justify-between pb-3">
          <Link
            to="/my-account"
            aria-label="الحساب"
            className="grid size-11 place-items-center rounded-full bg-white text-[#4A3728] shadow-sm border border-[#EADBCC]"
          >
            <UserRound className="size-5" />
          </Link>

          <h1 className="font-display text-2xl font-black text-[#4A3728]">تتبع الطلب</h1>

          <Link
            to="/"
            className="flex items-center gap-1 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-[#4A3728] shadow-sm border border-[#EADBCC]"
          >
            <span>رجوع</span>
            <ArrowRight className="size-4" />
          </Link>
        </header>

        {/* كارت نموذج البحث (الصورة الأولى) */}
        <form
          onSubmit={handleTrack}
          className="mt-4 rounded-3xl bg-[#FAF4E6]/90 p-5 shadow-sm border border-[#EADBCC]"
        >
          {/* حقل رقم الطلب */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold text-[#4A3728]">رقم الطلب</label>
            <div className="flex h-13 items-center justify-between rounded-2xl bg-[#F4E8D8]/70 px-4 border border-[#E0D0BE] focus-within:border-[#8B5E34]">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder="SQ-892411"
                className="w-full bg-transparent text-center font-mono text-base font-bold text-[#4A3728] outline-none placeholder:text-[#A79277]"
              />
              <Hash className="size-5 text-[#8B5E34]" />
            </div>
          </div>

          {/* حقل رقم الهاتف (معبأ تلقائياً للعميل) */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-bold text-[#4A3728]">رقم الهاتف</label>
            <div className="flex h-13 items-center justify-between rounded-2xl bg-[#F4E8D8]/70 px-4 border border-[#E0D0BE] focus-within:border-[#8B5E34]">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError("");
                }}
                placeholder="774399744"
                dir="ltr"
                className="w-full bg-transparent text-center font-mono text-base font-bold text-[#4A3728] outline-none placeholder:text-[#A79277]"
              />
              <Phone className="size-5 text-[#8B5E34]" />
            </div>
          </div>

          {/* زر التتبع البني */}
          <button
            type="submit"
            disabled={loading}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#4A3728] text-base font-black text-white shadow-md transition hover:bg-[#3B2C20] disabled:opacity-60"
          >
            <Search className="size-5" />
            <span>{loading ? "جاري البحث..." : "تتبع طلبك"}</span>
          </button>

          {error && (
            <p className="mt-3 text-center text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {error}
            </p>
          )}
        </form>

        {/* نتيجة التتبع (الصورة الثانية) - تظهر مباشرة عند العثور على الشحنة */}
        {order && (
          <div className="mt-5 space-y-4 animate-in fade-in-50 duration-300">
            {/* بطاقة معلومات الشحنة العلوية */}
            <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#EADBCC]">
              {/* الرأس: رقم الشحنة + شارة قاعدة البيانات الخضراء */}
              <div className="flex items-center justify-between border-b border-[#F4E8D8] pb-4">
                <span className="rounded-xl bg-[#F4E8D8] px-3.5 py-1.5 font-mono text-sm font-black text-[#4A3728] border border-[#E0D0BE]">
                  {order.trackingCode}
                </span>

                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>تم العثور على الشحنة بقاعدة البيانات</span>
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                </div>
              </div>

              {/* شبكة البيانات 2x2 */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {/* اسم العميل */}
                <div className="rounded-2xl bg-[#FAF4E6] p-3 border border-[#EADBCC]/60">
                  <span className="text-[#8C7A6B] block mb-1">اسم العميل:</span>
                  <span className="font-black text-[#4A3728] text-sm block truncate">
                    {order.customerName}
                  </span>
                </div>

                {/* رقم الهاتف */}
                <div className="rounded-2xl bg-[#FAF4E6] p-3 border border-[#EADBCC]/60">
                  <span className="text-[#8C7A6B] block mb-1">رقم الهاتف:</span>
                  <span className="font-mono font-black text-[#4A3728] text-sm block" dir="ltr">
                    {order.phone}
                  </span>
                </div>

                {/* تاريخ التسجيل */}
                <div className="rounded-2xl bg-[#FAF4E6] p-3 border border-[#EADBCC]/60">
                  <span className="text-[#8C7A6B] block mb-1">تاريخ التسجيل:</span>
                  <span className="font-bold text-[#4A3728] block">
                    {order.createdAt}
                  </span>
                </div>

                {/* الحالة الحالية */}
                <div className="rounded-2xl bg-[#FAF4E6] p-3 border border-[#EADBCC]/60">
                  <span className="text-[#8C7A6B] block mb-1">الحالة الحالية:</span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                    {order.status} ✓
                  </span>
                </div>
              </div>

              {/* صندوق تفاصيل ورابط المنتج */}
              <div className="mt-4 rounded-2xl bg-[#FAF4E6] p-3.5 border border-[#EADBCC]/80">
                <span className="text-xs font-bold text-[#8C7A6B] block mb-1.5">
                  رابط وتفاصيل المنتج المطلوب:
                </span>
                <p className="text-xs font-black text-[#4A3728] leading-relaxed mb-2">
                  {order.productName}
                </p>
                {order.productLink && (
                  <a
                    href={order.productLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#8B5E34] hover:underline"
                    dir="ltr"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{order.productLink}</span>
                  </a>
                )}
              </div>

              {/* زر طباعة السند والإيصال */}
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white border border-[#4A3728]/30 text-sm font-black text-[#4A3728] hover:bg-[#FAF4E6] transition shadow-sm"
              >
                <Printer className="size-4" />
                <span>طباعة سند الشحنة والإيصال</span>
              </button>
            </div>

            {/* بطاقة مسار الشحنة خطوة بخطوة (7 مراحل) */}
            <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#EADBCC]">
              {/* الرأس */}
              <div className="flex items-center justify-between pb-4 border-b border-[#F4E8D8]">
                <div className="flex items-center gap-2 font-display font-black text-base text-[#4A3728]">
                  <Truck className="size-5 text-[#8B5E34]" />
                  <span>مسار الشحنة خطوة بخطوة</span>
                  <span className="text-base">📍</span>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
                  تحديث مباشر
                </span>
              </div>

              {/* قائمة المراحل السبع */}
              <div className="mt-5 space-y-6">
                {TRACKING_STAGES.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index < activeIndex;
                  const isCurrent = index === activeIndex;
                  const isUpcoming = index > activeIndex;

                  return (
                    <div key={step.id} className="relative flex items-start gap-3.5">
                      {/* خط الوصل العمودي */}
                      {index < TRACKING_STAGES.length - 1 && (
                        <div
                          className={`absolute right-4.5 top-9 h-[calc(100%+14px)] w-0.5 ${
                            isCompleted ? "bg-emerald-500" : "bg-gray-200"
                          }`}
                        />
                      )}

                      {/* الدائرة والأيقونة */}
                      <div
                        className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-white shadow-sm transition ${
                          isCompleted
                            ? "bg-emerald-600"
                            : isCurrent
                            ? "bg-amber-500 ring-4 ring-amber-100"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        <Icon className="size-4.5" />
                      </div>

                      {/* نصوص المرحلة */}
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-sm font-black ${
                              isUpcoming ? "text-gray-400" : "text-[#4A3728]"
                            }`}
                          >
                            {step.title}
                          </h3>
                          {isCompleted && (
                            <span className="text-[11px] font-bold text-emerald-600">
                              ✓ مكتمل
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                              المرحلة الحالية
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            isUpcoming ? "text-gray-400" : "text-[#7A6A5B]"
                          }`}
                        >
                          {step.desc}
                        </p>
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
}
