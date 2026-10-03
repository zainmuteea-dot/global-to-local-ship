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
      { title: "تتبع الطلب — AL SHAMEL SHOPPING" },
      {
        name: "description",
        content: "تابع مسار شحنتك خطوة بخطوة بالرقم والهاتف.",
      },
      {
        property: "og:title",
        content: "تتبع الطلب — AL SHAMEL SHOPPING",
      },
    ],
  }),
  component: TrackPage,
});

// المراحل السبع المعتمدة لهوية السوق الشامل
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

  if (
    s.includes("delivered") ||
    s.includes("تسليم") ||
    s.includes("مكتمل")
  ) {
    return 6;
  }

  if (
    s.includes("out_for_delivery") ||
    s.includes("مندوب") ||
    s.includes("خروج") ||
    s.includes("توصيل")
  ) {
    return 5;
  }

  if (
    s.includes("local_warehouse") ||
    s.includes("يمن") ||
    s.includes("فرز") ||
    s.includes("وصول")
  ) {
    return 4;
  }

  if (
    s.includes("shipped") ||
    s.includes("شحن") ||
    s.includes("جوي") ||
    s.includes("بحري")
  ) {
    return 3;
  }

  if (
    s.includes("international_ship") ||
    s.includes("مستودع") ||
    s.includes("تغليف")
  ) {
    return 2;
  }

  if (
    s.includes("purchased") ||
    s.includes("processing") ||
    s.includes("شراء") ||
    s.includes("دفع")
  ) {
    return 1;
  }

  return 0;
}

export function TrackPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any | null>(null);

  // جلب رقم هاتف العميل تلقائيا عند فتح الصفحة
  useEffect(() => {
    const autoFillPhone = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.phone) {
            setPhone(profile.phone);
            return;
          }

          const metaPhone = session.user.user_metadata?.["phone"];

          if (metaPhone) {
            setPhone(metaPhone);
            return;
          }
        }

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
      const { data, error: qErr } = await supabase
        .from("orders")
        .select("*")
        .or(
          `tracking_code.ilike.%${cleanCode}%,order_number.ilike.%${cleanCode}%,intl_tracking_number.ilike.%${cleanCode}%`
        );

      if (qErr) {
        throw qErr;
      }

      if (!data || data.length === 0) {
        setError("لم يتم العثور على شحنة مسجلة برقم الطلب هذا.");
        return;
      }

      const match = data.find((row: any) => {
        if (!cleanPhone) {
          return true;
        }

        const rowPhone = (
          row.phone ||
          row.customer_phone ||
          ""
        ).replace(/\D/g, "");

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
        trackingCode:
          match.tracking_code ||
          match.order_number ||
          cleanCode,
        customerName:
          match.customer_name ||
          "عميل السوق الشامل",
        phone:
          match.phone ||
          match.customer_phone ||
          phone,
        status: match.status || "new",
        productName:
          match.product_name ||
          match.product_title ||
          "شحنة متجر عالمي",
        productLink:
          match.product_link ||
          match.product_url ||
          "",
        createdAt: match.created_at
          ? new Date(match.created_at).toLocaleDateString(
              "ar-YE",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )
          : "21 سبتمبر 2026",
      });
    } catch {
      setError(
        "حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من اتصالك وحاول ثانية."
      );
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = order
    ? getActiveStageIndex(order.status)
    : 0;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] px-4 pb-14 pt-5 font-sans text-[#0A2540]"
    >
      <main className="mx-auto w-full max-w-md">
        {/* شريط الرأس */}
        <header className="flex items-center justify-between pb-3">
          <Link
            to="/my-account"
            aria-label="الحساب"
            className="grid size-11 place-items-center rounded-2xl bg-white text-[#0F4C81] shadow-sm border-2 border-sky-100"
          >
            <UserRound className="size-5" />
          </Link>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 font-black text-lg tracking-tight">
              <span className="text-[#0F4C81]">
                AL SHAMEL
              </span>
              <span className="text-[#FF7A00]">
                SHOPPING
              </span>
            </div>
            <h1 className="text-sm font-black text-[#0F4C81] mt-0.5">
              تتبع الطلب 📍
            </h1>
          </div>

          <Link
            to="/"
            className="flex items-center gap-1 rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#0F4C81] shadow-sm border-2 border-sky-100"
          >
            <span>رجوع</span>
            <ArrowRight className="size-4" />
          </Link>
        </header>

        {/* كارت نموذج البحث */}
        <form
          onSubmit={handleTrack}
          className="mt-4 rounded-[32px] bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,76,129,0.08)] border-2 border-sky-100"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-black text-[#0F4C81]">
              رقم الطلب
            </label>
            <div className="flex h-13 items-center justify-between rounded-2xl bg-[#F8FAFC] px-4 border-2 border-slate-200 focus-within:border-[#0F4C81]">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder="SQ-892411"
                className="w-full bg-transparent text-center font-mono text-base font-bold text-[#0A2540] outline-none placeholder:text-slate-400"
              />
              <Hash className="size-5 text-[#0F4C81]" />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-black text-[#0F4C81]">
              رقم الهاتف
            </label>
            <div className="flex h-13 items-center justify-between rounded-2xl bg-[#F8FAFC] px-4 border-2 border-slate-200 focus-within:border-[#0F4C81]">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError("");
                }}
                placeholder="774399744"
                dir="ltr"
                className="w-full bg-transparent text-center font-mono text-base font-bold text-[#0A2540] outline-none placeholder:text-slate-400"
              />
              <Phone className="size-5 text-[#FF7A00]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#0F4C81] text-base font-black text-white shadow-xl shadow-[#0F4C81]/30 transition hover:from-[#0A365C] disabled:opacity-60"
          >
            <Search className="size-5" />
            <span>
              {loading ? "جاري البحث..." : "تتبع طلبك الآن 🔍"}
            </span>
          </button>

          {error && (
            <p className="mt-3 text-center text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {error}
            </p>
          )}
        </form>

        {order && (
          <div className="mt-5 space-y-4 animate-in fade-in-50 duration-300">
            <div className="rounded-[32px] bg-white p-5 shadow-sm border-2 border-sky-200">
              <div className="flex items-center justify-between border-b-2 border-sky-100 pb-4">
                <span className="rounded-2xl bg-gradient-to-r from-sky-50 via-white to-orange-50 px-3.5 py-1.5 font-mono text-sm font-black text-[#0F4C81] border-2 border-sky-200">
                  {order.trackingCode}
                </span>

                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    تم العثور على الشحنة بقاعدة البيانات
                  </span>
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">
                    اسم العميل:
                  </span>
                  <span className="font-black text-slate-900 text-sm block truncate">
                    {order.customerName}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">
                    رقم الهاتف:
                  </span>
                  <span
                    className="font-mono font-bold text-slate-900 text-sm block"
                    dir="ltr"
                  >
                    {order.phone}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">
                    تاريخ التسجيل:
                  </span>
                  <span className="font-bold text-slate-800 block">
                    {order.createdAt}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-slate-200">
                  <span className="text-[#0F4C81] block mb-1 font-bold">
                    الحالة الحالية:
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#EA580C] px-2 py-1 text-xs font-black text-white">
                    {order.status} ✓
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-3.5 border border-slate-200">
                <span className="text-xs font-bold text-[#0F4C81] block mb-1.5">
                  رابط وتفاصيل المنتج المطلوب:
                </span>
                <p className="text-xs font-black text-slate-900 leading-relaxed mb-2">
                  {order.productName}
                </p>
                {order.productLink && (
                  <a
                    href={order.productLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:underline"
                    dir="ltr"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {order.productLink}
                    </span>
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white border-2 border-[#0F4C81]/20 text-sm font-black text-[#0F4C81] hover:bg-sky-50 transition shadow-sm"
              >
                <Printer className="size-4" />
                <span>
                  طباعة سند الشحنة والإيصال
                </span>
              </button>
            </div>

            <div className="rounded-[32px] bg-white p-5 shadow-sm border-2 border-sky-100">
              <div className="flex items-center justify-between pb-4 border-b-2 border-sky-100">
                <div className="flex items-center gap-2 font-black text-base text-[#0F4C81]">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#0284C7] text-white grid place-items-center">
                    <Truck className="size-4" />
                  </div>
                  <span>
                    مسار الشحنة خطوة بخطوة 📍
                  </span>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black text-[#EA580C] border border-orange-200">
                  تحديث مباشر ⚡
                </span>
              </div>

              <div className="mt-5 space-y-6 relative">
                <div className="absolute right-[17px] top-2 bottom-2 w-1 bg-gradient-to-b from-[#0F4C81] via-[#0284C7] to-[#FF7A00] rounded-full" />

                {TRACKING_STAGES.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index < activeIndex;
                  const isCurrent = index === activeIndex;
                  const isUpcoming = index > activeIndex;

                  return (
                    <div
                      key={step.id}
                      className="relative flex items-start gap-3.5"
                    >
                      <div
                        className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-2xl text-white shadow-sm border-2 ${
                          isCompleted
                            ? "bg-gradient-to-br from-[#0F4C81] to-[#0284C7] border-white"
                            : isCurrent
                            ? "bg-gradient-to-br from-[#FF7A00] to-[#EA580C] border-white ring-4 ring-orange-200 scale-105"
                            : "bg-white border-slate-300 text-slate-400"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>

                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-sm font-black ${
                              isCurrent
                                ? "text-[#EA580C]"
                                : isCompleted
                                ? "text-[#0F4C81]"
                                : "text-slate-500"
                            }`}
                          >
                            {step.title}
                          </h3>

                          {isCompleted && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ✓ مكتمل
                            </span>
                          )}

                          {isCurrent && (
                            <span className="rounded-full bg-gradient-to-r from-[#FF7A00] to-[#EA580C] px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                              المرحلة الحالية ⚡
                            </span>
                          )}
                        </div>

                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            isUpcoming
                              ? "text-slate-400"
                              : "text-slate-600"
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
// إشعار فوري عند تحديث الإدارة لمرحلة الشحنة
const [notif, setNotif] = useState("");

useEffect(() => {
  if (!order) return;

  const channel = supabase
    .channel(`order-${order.trackingCode}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `tracking_code=eq.${order.trackingCode}`,
      },
      (payload: any) => {
        const newStatus = payload.new.status;
        setOrder((prev: any) => prev ? { ...prev, status: newStatus } : prev);
        setNotif(`🚀 تحديث جديد: تم نقل شحنتك إلى مرحلة (${newStatus})`);
        setTimeout(() => setNotif(""), 6000);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [order?.trackingCode]);
