// src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Search,
  ShoppingCart,
  UserRound,
  ShieldCheck,
  Play,
  Sparkles,
  Link2,
  DollarSign,
  PackageCheck,
  Truck,
  Home,
  CheckCircle2,
  Star,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل | AL SHAMEL SHOPPING — وسيط الشراء العالمي في اليمن" },
      {
        name: "description",
        content: "وسيط الشراء والاستيراد المعتمد في اليمن من SHEIN وAmazon وTEMU وAliExpress وTrendyol حتى باب بيتك.",
      },
    ],
  }),
  component: Index,
});

// مكون الشعار الرسمي لعربة التسوق (مطابق للصورة 58)
function AlShamelLogo({ className = "size-10" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* العجلات البرتقالية */}
        <circle cx="44" cy="78" r="9" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
        <circle cx="44" cy="78" r="4" fill="#FFFFFF" />
        <circle cx="68" cy="78" r="9" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
        <circle cx="68" cy="78" r="4" fill="#FFFFFF" />
        {/* هيكل عربة التسوق بالحرفين A و S المدمجين */}
        <path
          d="M24 28H33L48 65H78"
          stroke="#0F4C81"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 38H80L73 57H45"
          stroke="#0284C7"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* مسار حرف S واللمسة البرتقالية */}
        <path
          d="M50 42C56 36 67 36 71 43C73 47 70 52 61 54C52 56 50 61 56 65H72"
          stroke="#EA580C"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* النجمة الذهبية العلوية */}
        <polygon
          points="84,24 86,29 91,29 87,32 89,37 84,34 80,37 82,32 78,29 83,29"
          fill="#F59E0B"
        />
      </svg>
      <div className="flex flex-col text-right">
        <span className="text-[13px] font-black text-[#0F4C81] tracking-tight leading-none">
          SHOPPING <span className="text-[#EA580C]">AL SHAMEL</span>
        </span>
        <span className="text-[10px] font-bold text-sky-800 mt-0.5">
          السوق الشامل - وسيطكم العالمي
        </span>
      </div>
    </div>
  );
}

const platforms = [
  { name: "TEMU", color: "text-[#ff5000]", border: "border-orange-200" },
  { name: "TrendYol", color: "text-[#f27a1a]", border: "border-amber-200" },
  { name: "SHEIN", color: "text-black font-black", border: "border-stone-300" },
  { name: "Amazon", color: "text-[#ff9900]", border: "border-yellow-200" },
  { name: "AliExpress", color: "text-[#e62e04]", border: "border-red-200" },
];

const steps = [
  {
    step: "خطوة 1",
    title: "أرسل الرابط",
    desc: "انسخ رابط المنتج من أي متجر عالمي",
    icon: Link2,
    color: "bg-sky-50 text-sky-600 border-sky-200",
    stepColor: "bg-orange-100 text-orange-700",
    href: "/new-order",
  },
  {
    step: "خطوة 2",
    title: "اعرف السعر",
    desc: "نوضح لك التكلفة بالريال اليمني أو الدولار",
    icon: DollarSign,
    color: "bg-sky-50 text-sky-600 border-sky-200",
    stepColor: "bg-orange-100 text-orange-700",
    href: "/new-order",
  },
  {
    step: "خطوة 3",
    title: "نشتري لك",
    desc: "نشتري بدلاً عنك ونفحص جودة وتطابق الطلب",
    icon: ShoppingCart,
    color: "bg-sky-50 text-sky-600 border-sky-200",
    stepColor: "bg-orange-100 text-orange-700",
    href: "/new-order",
  },
  {
    step: "خطوة 4",
    title: "تتبع الشحنة",
    desc: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع",
    icon: Search,
    color: "bg-sky-50 text-sky-600 border-sky-200",
    stepColor: "bg-orange-100 text-orange-700",
    href: "/track",
  },
  {
    step: "خطوة 5",
    title: "الاستلام",
    desc: "توصيل موثوق حتى باب بيتك في كافة المحافظات",
    icon: PackageCheck,
    color: "bg-sky-50 text-sky-600 border-sky-200",
    stepColor: "bg-orange-100 text-orange-700",
    href: "/track",
  },
];

const reviews = [
  {
    text: "اشتريت لعيالي طلبات من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت بدون أي عناء.",
    name: "يوسف العزاني",
    city: "صنعاء",
  },
  {
    text: "وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعندن! خدمة ممتازة وتجاوب فوري عبر الواتساب.",
    name: "أسماء السعدي",
    city: "عدن",
  },
  {
    text: "التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية.",
    name: "رامي راجح",
    city: "حضرموت",
  },
];

export function Index() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfileName(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfileName(session.user);
      } else {
        setUser(null);
        setUserName("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileName = async (currentUser: any) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", currentUser.id)
      .maybeSingle();

    const name =
      data?.full_name ||
      currentUser.user_metadata?.full_name ||
      (typeof window !== "undefined" ? sessionStorage.getItem("sc_name") : "") ||
      "عميلنا العزيز";
    setUserName(name);
  };

  const isLoggedIn = !!user;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-white font-['Cairo',sans-serif] text-slate-800">
      
      {/* 1. الشريط العلوي التفاعلي */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* الشعار الرسمي AL SHAMEL SHOPPING */}
          <Link to="/" className="flex items-center gap-2">
            <AlShamelLogo className="size-11" />
          </Link>

          {/* الأزرار العلوية */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  to="/my-account"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0F4C81] text-xs font-bold hover:bg-sky-100 transition"
                >
                  <UserRound className="size-3.5 text-[#0284C7]" />
                  <span>مرحباً بك ({userName})</span>
                </Link>
                <Link
                  to="/notifications"
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-[#0F4C81] transition shadow-xs"
                >
                  <Bell className="size-4" />
                </Link>
                <Link
                  to="/new-order"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition"
                >
                  <ShoppingCart className="size-3.5" />
                  <span>اطلب الآن</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0F4C81] text-xs font-bold hover:bg-sky-100 transition"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/new-order"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition"
                >
                  <ShoppingCart className="size-3.5" />
                  <span>اطلب الآن</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-10">

        {/* 2. بنر الهيرو الكبير: كيف تطلب؟؟ بتدرج أزرق ملكي متطابق مع الصورة 60 */}
        <div className="relative rounded-3xl bg-gradient-to-bl from-[#0A2540] via-[#0F4C81] to-[#0284C7] p-6 md:p-10 text-white shadow-2xl overflow-hidden border border-sky-400/20">
          
          {/* تأثيرات الإضاءة الخلفية */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 size-72 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-72 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

          {/* الخطوات الدائرية العلوية (التسجيل / الطلب / الشحن) */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#EA580C] text-white text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider">
                  AL SHAMEL
                </span>
                <span className="text-xl md:text-2xl font-black tracking-tight text-white">
                  السوق الشامل
                </span>
              </div>
              <p className="text-xs text-sky-150 text-sky-200 mt-1">
                وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs text-sky-200">
              <div className="flex items-center gap-1.5">
                <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white border border-white/20">1</div>
                <span>التسجيل</span>
              </div>
              <div className="w-4 h-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <div className="size-6 rounded-full bg-orange-500 flex items-center justify-center text-[11px] font-bold text-white shadow">2</div>
                <span className="text-white font-bold">الطلب</span>
              </div>
              <div className="w-4 h-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white border border-white/20">3</div>
                <span>الشحن</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* المحتوى النصي */}
            <div className="md:col-span-8 space-y-4">
              <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-2">
                كيف تطلب؟؟ <span className="text-orange-400">❓</span>
              </h1>
              <p className="text-sm md:text-base text-sky-100 max-w-xl leading-relaxed">
                انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك في جميع المحافظات اليمنية.
              </p>

              {/* أزرار الإجراء السريع */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/new-order"
                  className
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#F97316] to-[#EA580C] px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <ShoppingCart className="size-4" />
                  اضغط هنا لطلب منتج
                </Link>

                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  <Search className="size-4" />
                  تتبع شحنة سابقة
                </Link>
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border border-sky-300/20 bg-sky-950/25 px-3 py-2 text-[11px] text-sky-100">
                <ShieldCheck className="size-4 text-[#FB923C]" />
                ضمان استرجاع 100% في حال عدم مطابقة المنتج
              </div>
            </div>

            {/* زر الفيديو */}
            <div className="md:col-span-4 flex justify-center md:justify-end">
              <button
                type="button"
                aria-label="تشغيل فيديو يشرح طريقة الطلب"
                className="group grid size-24 place-items-center rounded-3xl border border-white/30 bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white shadow-xl shadow-orange-950/40 transition hover:scale-105"
              >
                <span className="grid size-12 place-items-center rounded-full bg-white text-[#EA580C] shadow-lg">
                  <Play className="mr-0.5 size-5 fill-current" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. عنوان الخدمة والمتاجر العالمية */}
        <section className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-bold text-[#0284C7] shadow-sm">
            <Sparkles className="size-3.5 text-[#F97316]" />
            خدمة الشراء والوساطة الأولى في اليمن
          </div>

          <h2 className="text-2xl font-black text-[#0A2540] md:text-3xl">
            تسوّق عالمياً، واستلم محلياً
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            نشتري لك من أشهر المتاجر العالمية ونوصل طلبك بأمان حتى باب بيتك
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className={`rounded-xl border ${platform.border} bg-white px-5 py-4 text-xs font-bold shadow-sm transition hover:-translate-y-1 hover:shadow-md ${platform.color}`}
              >
                {platform.name}
              </div>
            ))}
          </div>
        </section>

        {/* 4. خطوات الخدمة الخمس */}
        <section>
          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="h-px w-10 bg-orange-300" />
            <h2 className="text-lg font-black text-[#0F4C81]">خمس خطوات تفصلك عن طلبك</h2>
            <span className="h-px w-10 bg-orange-300" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <Link
                  key={step.step}
                  to={step.href}
                  className="group relative rounded-2xl border border-sky-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg"
                >
                  <span className={`absolute -top-2 right-4 rounded-full px-2 py-1 text-[10px] font-black ${step.stepColor}`}>
                    {step.step}
                  </span>

                  <div className={`mx-auto mb-3 grid size-12 place-items-center rounded-2xl border ${step.color}`}>
                    <Icon className="size-5" />
                  </div>

                  <h3 className="text-sm font-black text-[#0A2540]">{step.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{step.desc}</p>
                </Link>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/track"
              className="inline-flex items-center gap-2 rounded-xl border border-[#0284C7] bg-white px-5 py-3 text-sm font-bold text-[#0F4C81] transition hover:bg-sky-50"
            >
              <Search className="size-4" />
              تتبع شحنتك الآن
            </Link>
            <Link
              to="/new-order"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#0A2540]"
            >
              <ShoppingCart className="size-4" />
              اطلب الآن فوراً
            </Link>
          </div>
        </section>

        {/* 5. آراء العملاء */}
        <section className="rounded-3xl border border-sky-100 bg-sky-50/60 p-5 md:p-8">
          <div className="mb-6 text-center">
            <div className="flex justify-center gap-0.5 text-[#F97316]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-current" />
              ))}
            </div>
            <h2 className="mt-2 text-xl font-black text-[#0A2540]">
              آراء وتجارب عملائنا الكرام
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.name} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
                <div className="mb-3 flex gap-0.5 text-[#F97316]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="size-3 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-slate-600">“{review.text}”</p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-sm font-black text-[#0F4C81]">{review.name}</p>
                  <p className="text-xs text-[#EA580C]">{review.city}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* الفوتر */}
      <footer className="border-t border-sky-100 bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center">
          <AlShamelLogo className="size-12" />
          <p className="max-w-md text-xs leading-6 text-slate-500">
            السوق الشامل — وسيط الشراء والاستيراد المعتمد من المتاجر العالمية إلى جميع محافظات اليمن.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81]">
            <ShieldCheck className="size-4 text-[#F97316]" />
            تسوق بثقة، شحن آمن، وتوصيل محلي
          </div>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} AL SHAMEL SHOPPING. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
