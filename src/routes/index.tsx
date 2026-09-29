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
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل — وسيط شراء يوصلك من العالم إلى اليمن" },
      {
        name: "description",
        content:
          "تسوق عالمياً واستلم محلياً: نشتري لك من TEMU وSHEIN وAmazon وTrendyol وAliExpress ونوصل لباب بيتك في جميع مدن اليمن.",
      },
    ],
  }),
  component: IndexPage,
});

export function IndexPage() {
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // جلب بيانات العميل وحالة تسجيل دخوله تلقائياً
  useEffect(() => {
    async function loadUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || "";
          let name =
            session.user.user_metadata?.full_name ||
            localStorage.getItem("sc_name") ||
            sessionStorage.getItem("sc_name") ||
            "";

          // إذا لم يتوفر الاسم في الجلسة نجلبه من جدول profiles
          if (!name) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", session.user.id)
              .maybeSingle();
            if (data?.full_name) {
              name = data.full_name;
              localStorage.setItem("sc_name", name);
            }
          }

          setCurrentUser({
            name: name || email.split("@")[0] || "العميل",
            email: email,
          });
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    }

    loadUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || "";
        const name =
          session.user.user_metadata?.full_name ||
          localStorage.getItem("sc_name") ||
          email.split("@")[0] ||
          "العميل";
        setCurrentUser({ name, email });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const heroCircles: { label: string; icon: LucideIcon; to: string }[] = [
    { label: currentUser ? "حسابي" : "التسجيل", icon: UserRound, to: currentUser ? "/my-account" : "/login" },
    { label: "الطلب", icon: Hand, to: "/new-order" },
    { label: "الشحن", icon: FileText, to: "/track" },
  ];

  const platforms = [
    { name: "TEMU", color: "text-[#FA6400]" },
    { name: "TrendYol", color: "text-[#F27A1A]" },
    { name: "SHEIN", color: "text-black" },
    { name: "Amazon", color: "text-[#FF9900]" },
    { name: "AliExpress", color: "text-[#FF4747]" },
  ];

  const steps = [
    { title: "أرسل الرابط", desc: "انسخ رابط المنتج من أي متجر", icon: Link2, to: "/new-order" },
    { title: "اعرف السعر", desc: "نوضح لك التكلفة بالريال اليمني أو الدولار", icon: CircleDollarSign, to: "/new-order" },
    { title: "نشتري لك", desc: "نشتري بدلاً عنك ونضمن جودة الطلب", icon: ShoppingCart, to: "/new-order" },
    { title: "تابع الشحنة", desc: "تتبع طلبك أولاً بأول برقم الشحنة", icon: Search, to: "/track" },
    { title: "الاستلام", desc: "يوصلك حتى باب بيتك في كل المحافظات", icon: Package, to: "/my-account" },
  ];

  const testimonials = [
    { name: "يوسف الحيفي", city: "صنعاء", text: "اشتريت لعبتين للأولاد من شي إن، التعامل كان صادق والتوصيل وصل لباب البيت." },
    { name: "أمة الحكيمي", city: "عدن", text: "وأخيراً لقيت موقع يوصل لعدن! خدمة ممتازة والتجاوب سريع جداً في الواتساب." },
    { name: "ياسر باشديد", city: "حضرموت", text: "التجربة فاقت التوقعات، تتبعت شحنتي كل يوم والتغليف كان ممتاز." },
  ];

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FDF8EE] text-[#4A3728] font-sans selection:bg-[#8B5E34] selection:text-white pb-14">
      {/* الشريط العلوي مع الخط الأخضر والزر الأخضر المطلوبين */}
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-2">
        {/* جهة اليمين: أيقونة الحساب + الإشعارات + الخط الأخضر لاسم العميل وحالة الاتصال */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={currentUser ? "/my-account" : "/login"}
            title={currentUser ? "إدارة حسابي" : "تسجيل الدخول"}
            className="grid size-11 place-items-center rounded-full bg-white text-[#8B5E34] ring-1 ring-[#E8D7BB] shadow-sm transition hover:scale-105 hover:bg-[#FAF4E6]"
          >
            <UserRound className="size-6" />
          </Link>

          <Link
            to="/notifications"
            className="relative grid size-11 place-items-center rounded-full bg-white text-[#8B5E34] ring-1 ring-[#E8D7BB] shadow-sm transition hover:scale-105 hover:bg-[#FAF4E6]"
          >
            <Bell className="size-6" />
            {currentUser && (
              <span className="absolute top-2 right-2 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </Link>

          {/* الخط الأخضر: نقطة متصل + اسم العميل + مرحباً بك في متجر السوق الشامل */}
          {currentUser ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-50/95 px-4 py-2 text-xs font-bold text-emerald-950 shadow-sm animate-in fade-in duration-200">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
              </span>
              <span className="font-black text-emerald-950 text-sm">
                متصل: {currentUser.name}
              </span>
              <span className="text-emerald-700 font-semibold hidden md:inline">
                | مرحباً بك في متجر السوق الشامل
              </span>
            </div>
          ) : (
            <div className="text-xs text-[#8B5E34] bg-white/70 px-3 py-1.5 rounded-full border border-[#E8D7BB]">
              مرحباً بك في السوق الشامل
            </div>
          )}
        </div>

        {/* جهة اليسار: زر إدارة حسابك وعملياتك الأخضر + زر اطلب الآن */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <Link
              to="/my-account"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 px-4 py-2 font-black text-xs sm:text-sm text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 ring-2 ring-emerald-400/40"
            >
              <Package className="size-4 text-emerald-100" />
              <span>إدارة حسابك وعملياتك</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-[#E8D7BB] bg-white px-4 py-2 text-xs font-bold text-[#8B5E34] hover:bg-[#FAF4E6] transition"
            >
              تسجيل الدخول / حساب جديد
            </Link>
          )}

          <Link
            to="/new-order"
            className="grid size-11 place-items-center rounded-full bg-white text-[#8B5E34] ring-1 ring-[#E8D7BB] shadow-sm transition hover:scale-105 hover:bg-[#FAF4E6]"
          >
            <span className="text-[10px] font-black leading-none text-center">اطلب الآن</span>
          </Link>
        </div>
      </div>

      {/* بنر الهيدر البني (كيف تطلب؟) */}
      <header className="px-4 pt-3">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-[#593922] p-6 text-[#FDF8EE] ring-1 ring-black/10 shadow-lg sm:p-8">
          <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
            <div className="flex items-start gap-4">
              {heroCircles.map(({ label, icon: Icon, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex flex-col items-center gap-1.5 transition hover:opacity-90"
                >
                  <span className="grid size-11 place-items-center rounded-full ring-2 ring-[#FDF8EE]/40 bg-white/10 sm:size-12">
                    <Icon className="size-5 text-[#ECC880] sm:size-6" />
                  </span>
                  <span className="text-xs font-bold text-[#ECC880]">{label}</span>
                </Link>
              ))}
            </div>
            <div className="text-start">
              <p className="font-black text-2xl tracking-tight text-[#ECC880] sm:text-3xl">
                السوق الشامل
              </p>
              <p className="text-[11px] text-[#FDF8EE]/80 mt-0.5">وسيط الشراء المعتمد إلى اليمن</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end">
            <div className="flex-1 text-center sm:text-start">
              <p className="text-3xl font-black leading-tight text-[#ECC880] sm:text-4xl">
                كيف تطلب؟<span className="text-amber-400">؟</span>
              </p>
              <p className="text-xs text-[#FDF8EE]/80 mt-1">
                انسخ رابط أي منتج عالمي وسنتولى الشراء والفحص والشحن حتى بابك
              </p>
            </div>
            <div className="relative shrink-0">
              <div className="grid size-20 place-items-center rounded-2xl bg-white/10 ring-2 ring-white/30 sm:size-24 hover:bg-white/20 transition">
                <span className="grid size-9 place-items-center rounded-full bg-[#ECC880] text-[#593922] shadow">
                  <svg viewBox="0 0 24 24" className="size-4 ml-0.5" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/new-order"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#C17A4A] hover:bg-[#a66336] px-6 py-2.5 font-bold text-base text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              <Hand className="size-5 -scale-x-100" />
              <span>اضغط هنا لطلب منتج</span>
            </Link>

            <Link
              to="/track"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 px-4 py-2.5 font-bold text-sm text-white transition"
            >
              <Search className="size-4" />
              <span>تتبع شحنة سابقة</span>
            </Link>
          </div>
        </div>
      </header>

      {/* عنوان تسوق عالمياً واستلم محلياً */}
      <section className="px-4 pb-2 pt-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-black leading-snug text-[#4A3728]">
          تسوّق عالمياً، واستلم محلياً
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#8B5E34]">
          اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع مدن اليمن
        </p>
      </section>

      {/* شعارات المتاجر العالمية */}
      <section className="px-4 pt-6">
        <p className="mb-4 text-center text-xs font-bold text-[#8B5E34]">
          نستورد لك من أشهر المتاجر العالمية
        </p>
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3 sm:gap-4" dir="ltr">
          {platforms.map((p) => (
            <div
              key={p.name}
              className={`grid size-20 place-items-center rounded-2xl bg-white text-center font-black text-sm shadow-sm border border-[#E8D7BB] sm:size-24 sm:text-base ${p.color}`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </section>

      {/* خطوات الشراء الـ 5 */}
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const last = i === steps.length - 1;
            return (
              <Link
                key={s.title}
                to={s.to}
                className={`group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#E8D7BB] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#8B5E34]/40 active:scale-95 text-right ${
                  last ? "sm:col-span-2 sm:mx-auto sm:w-2/3" : ""
                }`}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[#FAF4E6] text-[#8B5E34] transition-colors group-hover:bg-[#8B5E34] group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-black text-[#4A3728] transition-colors group-hover:text-[#8B5E34]">
                    {s.title}
                  </p>
                  <p className="text-xs text-[#8B5E34] mt-0.5">{s.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* أزرار الإجراءات السفلية */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/new-order"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#593922] hover:bg-[#432A18] px-8 py-3.5 font-black text-sm text-white shadow-md hover:shadow-lg transition"
          >
            <ShoppingCart className="size-4" />
            <span>اطلب الآن</span>
          </Link>

          <Link
            to="/track"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-black text-sm text-[#8B5E34] ring-1 ring-[#E8D7BB] shadow-sm hover:bg-[#FAF4E6] transition"
          >
            <Search className="size-4" />
            <span>تتبع شحنتك</span>
          </Link>
        </div>
      </section>

      {/* آراء العملاء */}
      <section className="pb-12 pt-4">
        <h2 className="mb-4 text-center font-black text-xl text-[#4A3728]">آراء عملائنا</h2>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 justify-center">
          {testimonials.map((t, i) => (
            <div key={i} className="w-64 shrink-0 rounded-2xl bg-white p-5 ring-1 ring-[#E8D7BB] shadow-sm">
              <div className="flex justify-center text-amber-500 mb-2">★★★★★</div>
              <p className="text-xs leading-relaxed text-[#593922] text-center font-medium">"{t.text}"</p>
              <div className="mt-3 text-center border-t border-[#FAF4E6] pt-2">
                <p className="text-xs font-black text-[#4A3728]">{t.name}</p>
                <p className="text-[10px] text-gray-500">{t.city}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* تذييل الصفحة */}
      <footer className="pb-8 text-center border-t border-[#E8D7BB] pt-6 bg-white/40">
        <p className="text-xs font-black text-[#593922]">السوق الشامل — وسيطكم المعتمد نحو التميز</p>
        <p className="mt-1 text-[11px] text-[#8B5E34]">جميع الحقوق محفوظة © 2026</p>
      </footer>
    </div>
  );
}
