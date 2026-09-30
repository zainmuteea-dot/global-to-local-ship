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
