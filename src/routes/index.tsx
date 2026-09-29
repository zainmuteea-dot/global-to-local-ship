import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  CircleDollarSign,
  FileText,
  Hand,
  Link2,
  Package,
  Search,
  ShoppingCart,
  UserRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل — وسيط شراء يوصلك من العالم إلى اليمن" },
      {
        name: "description",
        content: "تسوق عالمياً واستلم محلياً: نشتري لك من TEMU وSHEIN وAmazon وTrendyol وAliExpress ونوصل لباب بيتك في اليمن.",
      },
    ],
  }),
  component: Index,
});

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" />
    </svg>
  );
}

function BrandTruck() {
  return (
    <div className="flex items-end">
      <div className="rounded-md bg-card px-2 py-1 ring-1 ring-border shadow-sm">
        <p className="whitespace-nowrap font-display text-[10px] font-extrabold leading-none text-cocoadeep sm:text-xs">{BRAND}</p>
      </div>
      <div className="-ms-0.5 size-0 border-y-[7px] border-s-[10px] border-y-transparent border-s-cocoa" />
      <div className="relative -ms-1 flex gap-1">
        <span className="size-2 rounded-full bg-cocoadeep ring-2 ring-card" />
        <span className="size-2 rounded-full bg-cocoadeep ring-2 ring-card" />
      </div>
    </div>
  );
}

const platforms = [
  { name: "TEMU", className: "text-[#ff5000]" },
  { name: "TrendYol", className: "text-[#f27a1a]" },
  { name: "SHEIN", className: "text-black" },
  { name: "Amazon", className: "text-[#ff9900]" },
  { name: "AliExpress", className: "text-[#e62e04]" },
];

export function Index() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // فحص جلسة المستخدم الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfileName(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    // محاولة جلب الاسم من جدول profiles ثم من metadata ثم sessionStorage
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

  // الخطوات حسب حالة تسجيل الدخول
  const steps = isLoggedIn
    ? [
        { title: "أرسل الرابط", desc: "انسخ رابط المنتج من أي متجر", icon: Link2, to: "/new-order" },
        { title: "اعرف السعر", desc: "نوضح لك التكلفة بالريال اليمني أو الدولار", icon: CircleDollarSign, to: "/new-order" },
        { title: "نشتري لك", desc: "نشتري بدلاً عنك ونضمن جودة الطلب", icon: ShoppingCart, to: "/new-order" },
        { title: "تابع الشحنة", desc: "تتبع طلبك أولاً بأول برقم الشحنة", icon: Search, to: "/track" },
        { title: "الاستلام", desc: "يوصلك حتى باب بيتك في كل المحافظات", icon: Package, to: "/my-account" },
      ]
    : [
        { title: "أرسل الرابط", desc: "انسخ رابط المنتج", icon: Link2, to: "/new-order" },
        { title: "اعرف السعر", desc: "نوضح لك التكلفة", icon: CircleDollarSign, to: "/new-order" },
        { title: "نشتري لك", desc: "نشتري بدلاً عنك", icon: ShoppingCart, to: "/new-order" },
        { title: "تابع الشحنة", desc: "تتبع طلبك أولاً بأول", icon: Search, to: "/track" },
        { title: "الاستلام", desc: "يوصلك حتى باب بيتك", icon: Package, to: "/signup" },
      ];

  return (
    <div dir="rtl" lang="ar" className="min-h-screen overflow-x-hidden bg-[#FAF7F2] font-['Cairo',sans-serif] text-[#3D2314]">
      {/* الشريط العلوي التفاعلي */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-4">
        {/* الجانب الأيمن / الأزرار */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                to="/new-order"
                className="grid size-10 place-items-center rounded-full bg-white text-[#4A3728] border border-[#E5DAC6] shadow-sm text-[10px] font-bold"
              >
                اطلب الآن
              </Link>
              <Link
                to="/my-account"
                className="flex items-center gap-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white px-3.5 py-2 rounded-full text-xs font-bold shadow-sm transition"
              >
                <ShieldCheck className="size-4" />
                <span>إدارة حسابك وعملياتك</span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-1 bg-white border border-[#E5DAC6] rounded-full p-1 shadow-sm">
              <Link to="/login" className="px-3 py-1 text-xs font-bold text-[#6B5A4E] hover:text-[#3D2314]">
                تسجيل الدخول
              </Link>
              <Link to="/new-order" className="bg-[#4A3728] text-white px-3 py-1 rounded-full text-xs font-bold">
                اطلب الآن
              </Link>
            </div>
          )}
        </div>

        {/* المنتصف: يظهر بعد تسجيل الدخول فقط (شارة الاتصال بالاسم) */}
        {isLoggedIn && (
          <div className="hidden sm:flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل: <strong className="text-[#14532D]">{userName}</strong> | مرحباً بك في متجر السوق الشامل</span>
          </div>
        )}

        {/* الجانب الأيسر: الإشعارات وأيقونة المستخدم */}
        <div className="flex items-center gap-2">
          <Link
            to={isLoggedIn ? "/notifications" : "/login"}
            className="grid size-10 place-items-center rounded-full bg-white text-[#4A3728] border border-[#E5DAC6] shadow-sm relative"
          >
            <Bell className="size-5" />
            {isLoggedIn && <span className="absolute top-2 right-2 size-2 bg-emerald-500 rounded-full" />}
          </Link>
          <Link
            to={isLoggedIn ? "/my-account" : "/signup"}
            className="grid size-10 place-items-center rounded-full bg-white text-[#4A3728] border border-[#E5DAC6] shadow-sm hover:border-[#4A3728] transition"
            title={isLoggedIn ? "حسابي" : "إنشاء حساب"}
          >
            <UserRound className="size-5" />
          </Link>
        </div>
      </div>

      {/* بطاقة كيف تطلب */}
      <header className="px-4 pt-4">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-[#4A3728] p-6 text-[#FDF8EE] shadow-xl sm:p-8">
          <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
            {/* الدوائر العلوية الثلاث */}
            <div className="flex items-start gap-4">
              <Link
                to={isLoggedIn ? "/my-account" : "/signup"}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <span className="grid size-11 place-items-center rounded-full ring-2 ring-[#FDF8EE]/40 bg-[#3D2C1F] group-hover:bg-[#5C4533] transition">
                  <UserRound className="size-5 text-[#F5B86E]" />
                </span>
                <span className="text-xs font-bold text-[#F5B86E]">
                  {isLoggedIn ? "حسابي" : "التسجيل"}
                </span>
              </Link>

              <Link to="/new-order" className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <span className="grid size-11 place-items-center rounded-full ring-2 ring-[#FDF8EE]/40 bg-[#3D2C1F] group-hover:bg-[#5C4533] transition">
                  <Hand className="size-5 text-[#F5B86E]" />
                </span>
                <span className="text-xs font-bold text-[#F5B86E]">الطلب</span>
              </Link>

              <Link to="/track" className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <span className="grid size-11 place-items-center rounded-full ring-2 ring-[#FDF8EE]/40 bg-[#3D2C1F] group-hover:bg-[#5C4533] transition">
                  <FileText className="size-5 text-[#F5B86E]" />
                </span>
                <span className="text-xs font-bold text-[#F5B86E]">الشحن</span>
              </Link>
            </div>

            <div className="text-start">
              <p className="font-display text-2xl font-black text-[#F5B86E] sm:text-3xl">{BRAND}</p>
              {isLoggedIn && (
                <p className="text-[11px] text-[#D8C7B5] font-bold mt-0.5">وسيط الشراء المعتمد إلى اليمن</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end">
            <div className="flex-1 text-center sm:text-start">
              <p className="font-display text-3xl font-black text-[#F5B86E] sm:text-4xl">
                كيف تطلب؟<span className="text-[#E5A85A]">؟</span>
              </p>
              {isLoggedIn && (
                <p className="text-xs text-[#E8DAC8] mt-1.5 max-w-sm">
                  انسخ رابط أي منتج عالمي وسنتولى الشراء والفحص والشحن حتى بابك
                </p>
              )}
            </div>
            <div className="relative shrink-0">
              <div className="grid size-20 place-items-center rounded-2xl bg-white/10 ring-2 ring-white/20 sm:size-24">
                <span className="grid size-9 place-items-center rounded-full bg-[#F5B86E] text-[#4A3728]">
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* أزرار الإجراء أسفل البطاقة */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/new-order"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F5B86E] hover:bg-[#e4a860] px-5 py-2.5 font-bold text-[#3D2314] shadow-md transition active:scale-95"
            >
              <Hand className="size-5 -scale-x-100" />
              <span>{isLoggedIn ? "اضغط هنا لطلب منتج" : "اضغط هنا"}</span>
            </Link>

            {isLoggedIn && (
              <Link
                to="/track"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3D2C1F] hover:bg-[#5C4533] border border-[#6B523F] px-4 py-2.5 text-xs font-bold text-[#FDF8EE] transition"
              >
                <Search className="size-3.5" />
                <span>تتبع شحنة سابقة</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* العنوان الترويجي */}
      <section className="px-4 pb-4 pt-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3D2314]">تسوّق عالمياً، واستلم محلياً</h1>
        <p className="mt-2 text-xs sm:text-sm text-[#7D6E63]">
          {isLoggedIn
            ? "اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع مدن اليمن"
            : "اطلب من أي مكان في العالم ونوصله لباب بيتك"}
        </p>
      </section>

      {/* الطائرة والسيارة */}
      <section className="relative mt-2 h-28 w-full overflow-hidden sm:h-36">
        <PlaneIcon className="absolute top-2 start-[5%] size-8 -scale-x-100 text-[#4A3728]/70 sm:size-10" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#EFE6D5]" />
        <div className="absolute bottom-10 left-[10%] sm:left-[45%]">
          <BrandTruck />
        </div>
      </section>

      {/* المتاجر العالمية */}
      <section className="px-4 pt-6">
        <p className="mb-4 text-center text-xs font-bold text-[#8C7B6D]">نستورد لك من أشهر المتاجر العالمية</p>
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3" dir="ltr">
          {platforms.map((p) => (
            <span
              key={p.name}
              className={`grid size-20 place-items-center rounded-2xl bg-white text-center font-bold text-sm shadow-sm border border-[#E8DFCFC] ${p.className}`}
            >
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* بطاقات الخطوات */}
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const last = i === steps.length - 1;
            return (
              <Link
                key={s.title}
                to={s.to}
                className={`flex items-center gap-3 rounded-2xl bg-white p-4 border border-[#EBE3D5] shadow-sm transition hover:shadow-md ${
                  last ? "sm:col-span-2 sm:mx-auto sm:w-1/2" : ""
                }`}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[#FAF5EB] text-[#4A3728]">
                  <Icon className="size-5 text-[#8B5E34]" />
                </span>
                <div className="text-start">
                  <p className="font-bold text-sm text-[#3D2314]">{s.title}</p>
                  <p className="text-xs text-[#7D6E63]">{s.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
