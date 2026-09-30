// src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Search,
  ShoppingCart,
  UserRound,
  Play,
  Link2,
  DollarSign,
  PackageCheck,
  Truck,
  Home,
  Star,
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

function AlShamelLogo({ className = "size-10" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="44" cy="78" r="9" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
        <circle cx="44" cy="78" r="4" fill="#FFFFFF" />
        <circle cx="68" cy="78" r="9" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
        <circle cx="68" cy="78" r="4" fill="#FFFFFF" />
        <path d="M24 28H33L48 65H78" stroke="#0F4C81" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 38H80L73 57H45" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 42C56 36 67 36 71 43C73 47 70 52 61 54C52 56 50 61 56 65H72" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />
        <polygon points="84,24 86,29 91,29 87,32 89,37 84,34 80,37 82,32 78,29 83,29" fill="#F59E0B" />
      </svg>
      <div className="flex flex-col text-right">
        <span className="text-[13px] font-black text-[#0F4C81] tracking-tight leading-none">
          SHOPPING <span className="text-[#EA580C]">AL SHAMEL</span>
        </span>
        <span className="text-[10px] font-bold text-sky-800 mt-0.5">السوق الشامل - وسيطكم العالمي</span>
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
  { step: "خطوة 1", title: "أرسل الرابط", desc: "انسخ رابط المنتج من أي متجر عالمي", icon: Link2, color: "bg-sky-50 text-sky-600 border-sky-200", stepColor: "bg-orange-100 text-orange-700", href: "/new-order" },
  { step: "خطوة 2", title: "اعرف السعر", desc: "نوضح لك التكلفة بالريال اليمني أو الدولار", icon: DollarSign, color: "bg-sky-50 text-sky-600 border-sky-200", stepColor: "bg-orange-100 text-orange-700", href: "/new-order" },
  { step: "خطوة 3", title: "نشتري لك", desc: "نشتري بدلاً عنك ونفحص جودة وتطابق الطلب", icon: ShoppingCart, color: "bg-sky-50 text-sky-600 border-sky-200", stepColor: "bg-orange-100 text-orange-700", href: "/new-order" },
  { step: "خطوة 4", title: "تتبع الشحنة", desc: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع", icon: Search, color: "bg-sky-50 text-sky-600 border-sky-200", stepColor: "bg-orange-100 text-orange-700", href: "/track" },
  { step: "خطوة 5", title: "الاستلام", desc: "توصيل موثوق حتى باب بيتك في كافة المحافظات", icon: PackageCheck, color: "bg-sky-50 text-sky-600 border-sky-200", stepColor: "bg-orange-100 text-orange-700", href: "/track" },
];

const reviews = [
  { text: "اشتريت لعيالي طلبات من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت بدون أي عناء.", name: "يوسف العزاني", city: "صنعاء" },
  { text: "وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعندن! خدمة ممتازة وتجاوب فوري عبر الواتساب.", name: "أسماء السعدي", city: "عدن" },
  { text: "التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية.", name: "رامي راجح", city: "حضرموت" },
];

export function Index() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchProfileName(session.user); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); fetchProfileName(session.user); }
      else { setUser(null); setUserName(""); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileName = async (currentUser: any) => {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", currentUser.id).maybeSingle();
    const name = data?.full_name || currentUser.user_metadata?.full_name || (typeof window!== "undefined"? sessionStorage.getItem("sc_name") : "") || "عميلنا العزيز";
    setUserName(name);
  };

  const isLoggedIn =!!user;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-white font-['Cairo',sans-serif] text-slate-800">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><AlShamelLogo className="size-11" /></Link>
          <div className="flex items-center gap-2">
            {isLoggedIn? (
              <>
                <Link to="/my-account" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0F4C81] text-xs font-bold hover:bg-sky-100 transition">
                  <UserRound className="size-3.5 text-[#0284C7" /><span>مرحباً ({userName})</span>
                </Link>
                <Link to="/notifications" className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs"><Bell className="size-4" /></Link>
                <Link to="/new-order" className="flex items-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md"><ShoppingCart className="size-3.5" /><span>اطلب الآن</span></Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0F4C81] text-xs font-bold">تسجيل الدخول</Link>
                <Link to="/new-order" className="flex items-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md"><ShoppingCart className="size-3.5" /><span>اطلب الآن</span></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-10">
        <div className="relative rounded-3xl bg-gradient-to-bl from-[#0A2540] via-[#0F4C81] to-[#0284C7] p-6 md:p-10 text-white shadow-2xl overflow-hidden border border-sky-400/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 size-72 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-72 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#EA580C] text-white text-[10px] font-black px-2 py-0.5 rounded-md">AL SHAMEL</span>
                <span className="text-xl md:text-2xl font-black text-white">السوق الشامل</span>
              </div>
              <p className="text-xs text-sky-200 mt-1">وسيط الشراء والاستيراد المعتمد في اليمن</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-4">
              <h1 className="text-3xl md:text-4xl font-black text-white">كيف تطلب؟؟ <span className="text-orange-400">❓</span></h1>
              <p className="text-sm md:text-base text-sky-100 max-w-xl leading-relaxed">انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك.</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/new-order" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:scale-105 transition"><ShoppingCart className="size-5" />ابدأ طلبك الآن</Link>
                <Link to="/track" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-white/20 transition"><Search className="size-5" />تتبع شحنتك</Link>
              </div>
            </div>
            <div className="md:col-span-4 flex justify-center">
              <div className="bg-white rounded-3xl p-6 shadow-xl"><AlShamelLogo className="size-20" /></div>
            </div>
          </div>
        </div>

        <section>
          {/* ===== النصف الثاني ===== */}
<section className="text-center mt-8 px-4">
  <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0284C7] text-[11px] font-bold px-4 py-1.5 rounded-full">
    🛒 خدمة الشراء والوساطة الأولى في اليمن
  </span>
  <h2 className="text-[26px] font-black text-[#0A2540] mt-3">تسوّق عالمياً، واستلم محلياً</h2>
  <p className="text-[12px] text-slate-500 mt-2 leading-6 max-w-md mx-auto">
    اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية
  </p>
</section>

{/* المتاجر */}
<div className="mt-6 px-4">
  <p className="text-center text-[11px] font-black text-slate-600 mb-4">
    <span className="text-[#F97316]">—</span> تسوق الآن من أشهر المتاجر العالمية <span className="text-[#F97316]">—</span>
  </p>
  <div className="flex flex-wrap justify-center gap-3" dir="ltr">
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#FF5000]">TEMU</div>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#F27A1A]">TrendYol</div>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-black">SHEIN</div>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#FF9900]">Amazon</div>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#E62E04]">AliExpress</div>
  </div>
</div>

{/* الخطوات */}
<div className="mt-6 px-4 max-w-3xl mx-auto" dir="rtl">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
      <div className="text-right flex-1">
        <p className="text-[13px] font-black text-[#0F4C81]">أرسل الرابط <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">خطوة 1</span></p>
        <p className="text-[11px] text-slate-500 mt-1">انسخ رابط المنتج من أي متجر عالمي</p>
      </div>
      <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><Link2 className="size-5" /></div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
      <div className="text-right flex-1">
        <p className="text-[13px] font-black text-[#0F4C81]">اعرف السعر <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">خطوة 2</span></p>
        <p className="text-[11px] text-slate-500 mt-1">نوضح لك التكلفة بالريال اليمني أو الدولار</p>
      </div>
      <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><DollarSign className="size-5" /></div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
      <div className="text-right flex-1">
        <p className="text-[13px] font-black text-[#0F4C81]">نشتري لك <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">خطوة 3</span></p>
        <p className="text-[11px] text-slate-500 mt-1">نشتري بدلاً عنك ونفحص جودة وتطابق الطلب</p>
      </div>
      <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><ShoppingCart className="size-5" /></div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
      <div className="text-right flex-1">
        <p className="text-[13px] font-black text-[#0F4C81]">تتبع الشحنة <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">خطوة 4</span></p>
        <p className="text-[11px] text-slate-500 mt-1">تتبع مسار شحنتك لحظة بلحظة برقم التتبع</p>
      </div>
      <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><Search className="size-5" /></div>
    </div>
  </div>

  <div className="bg-white rounded-2xl border border-slate-100 p-4 mt-3 max-w-[500px] mx-auto flex items-center gap-3 shadow-sm">
    <div className="text-center flex-1">
      <p className="text-[13px] font-black text-[#0F4C81]">الاستلام <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">خطوة 5</span></p>
      <p className="text-[11px] text-slate-500 mt-1">توصيل موثوق حتى باب بيتك في كافة المحافظات</p>
    </div>
    <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><PackageCheck className="size-5" /></div>
  </div>

  <div className="flex justify-center gap-3 mt-5">
    <Link to="/new-order" className="bg-[#0F4C81] text-white text-[13px] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2">
      <ShoppingCart className="size-4" /> اطلب الآن فوراً
    </Link>
    <Link to="/track" className="bg-white border border-slate-200 text-[#0F4C81] text-[13px] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2">
      <Search className="size-4" /> تتبع شحنتك الآن
    </Link>
  </div>
</div>

{/* آراء العملاء */}
<section className="mt-10 px-4 max-w-4xl mx-auto">
  <h3 className="text-center text-[16px] font-black text-[#0F4C81] mb-6">⭐⭐⭐⭐⭐ آراء وتجارب عملائنا الكرام</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
      <div className="text-[#F59E0B] text-[12px] mb-2">★★★★★</div>
      <p className="text-[11px] text-slate-600 leading-6">"التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية."</p>
      <p className="text-[12px] font-black text-[#0F4C81] mt-3">يوسف العزاني</p>
      <p className="text-[10px] text-slate-400">صنعاء</p>
    </div>
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
      <div className="text-[#F59E0B] text-[12px] mb-2">★★★★★</div>
      <p className="text-[11px] text-slate-600 leading-6">"وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعندنا! خدمة ممتازة وتجاوب فوري عبر الواتساب."</p>
      <p className="text-[12px] font-black text-[#0F4C81] mt-3">أسماء السعدي</p>
      <p className="text-[10px] text-slate-400">عدن</p>
    </div>
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
      <div className="text-[#F59E0B] text-[12px] mb-2">★★★★★</div>
      <p className="text-[11px] text-slate-600 leading-6">"اشتريت لعيالي طلبات من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت."</p>
      <p className="text-[12px] font-black text-[#0F4C81] mt-3">رامي راجح</p>
      <p className="text-[10px] text-slate-400">حضرموت</p>
    </div>
  </div>
</section>
