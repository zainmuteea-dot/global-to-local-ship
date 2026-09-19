// ============= Full file contents =============
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CircleDollarSign,
  ClipboardList,
  Facebook,
  FileText,
  Hand,
  Instagram,
  Link2,
  Package,
  Search,
  ShoppingCart,
  UserRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";

const WHATSAPP = "https://wa.me/967700000000";
const BRAND = "السوق الشامل";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل — وسيط شراء يوصلك من العالم إلى اليمن" },
      {
        name: "description",
        content:
          "تسوق عالمياً واستلم محلياً: نشتري لك من TEMU وSHEIN وAmazon وTrendyol وAliExpress ونوصل لباب بيتك في اليمن. أصلي · سريع · ثقة.",
      },
      { property: "og:title", content: "السوق الشامل — تسوق عالمياً واستلم محلياً" },
      {
        property: "og:description",
        content:
          "وسيط شراء لليمن: أرسل الرابط، اعرف السعر، ونحن نشتري وندفع ونوصل لباب بيتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.6-.1-2.5-.7-4.3-2.7-5.4-4.4-.4-.6-.7-1.3-.5-2 .1-.4.6-.9.9-1.2.2-.2.5-.2.7 0l.7.9c.1.2.1.4 0 .6l-.4.5c.3.6 1.2 1.6 2.3 2.1l.5-.4c.2-.2.4-.2.6-.1l.9.6c.2.1.3.3.2.5Z" />
    </svg>
  );
}

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" />
    </svg>
  );
}

/** شاحنة تحمل اسم العلامة */
function BrandTruck() {
  return (
    <div className="flex items-end">
      <div className="rounded-md bg-card px-2 py-1 ring-1 ring-border shadow-sm">
        <p className="whitespace-nowrap font-display text-[10px] font-extrabold leading-none text-cocoadeep sm:text-xs">
          {BRAND}
        </p>
      </div>
      <div className="-ms-0.5 size-0 border-y-[7px] border-s-[10px] border-y-transparent border-s-cocoa" />
      <div className="relative -ms-1 flex gap-1 pb-[-2px]">
        <span className="size-2 rounded-full bg-cocoadeep ring-2 ring-card" />
        <span className="size-2 rounded-full bg-cocoadeep ring-2 ring-card" />
      </div>
    </div>
  );
}

const heroCircles: { label: string; icon: LucideIcon }[] = [
  { label: "التسجيل", icon: UserRound },
  { label: "الطلب", icon: Hand },
  { label: "الشحن", icon: FileText },
];

const steps: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "أرسل الرابط", desc: "انسخ رابط المنتج", icon: Link2 },
  { title: "اعرف السعر", desc: "نوضح لك التكلفة", icon: CircleDollarSign },
  { title: "نشتري لك", desc: "نشتري بدلاً عنك", icon: ShoppingCart },
  { title: "تابع الشحنة", desc: "تتبع طلبك أولاً بأول", icon: Search },
  { title: "الاستلام", desc: "يوصلك حتى باب بيتك", icon: Package },
];

const platforms: { name: string; className: string }[] = [
  { name: "TEMU", className: "bg-temu text-white" },
  { name: "Trendyol", className: "bg-trendyol text-white" },
  { name: "SHEIN", className: "bg-shein text-white" },
  { name: "Amazon", className: "bg-card text-amazon ring-1 ring-border" },
  { name: "AliExpress", className: "bg-aliexpress text-white" },
];

const testimonials = [
  {
    name: "يوسف الحيفي",
    city: "صنعاء",
    text: "اشتريت لعبتين للأولاد من شي إن، التعامل كان صادق والتوصيل وصل لباب البيت. ما توقعت أنه بهذه السهولة.",
  },
  {
    name: "أمة الحكيمي",
    city: "عدن",
    text: "وأخيراً لقيت موقع يوصل لعدن! خدمة ممتازة والتجاوب سريع جداً في الواتساب. السعر كان واضح من أول يوم.",
  },
  {
    name: "ياسر باشديد",
    city: "حضرموت",
    text: "التجربة فاقت التوقعات، تتبعت شحنتي كل يوم والتغليف كان ممتاز. أكيد بكرر الطلب مرة ثانية.",
  },
];

function Stars() {
  return (
    <div className="flex justify-center gap-0.5 text-gold" aria-label="خمس نجوم">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-sm leading-none">
          ★
        </span>
      ))}
    </div>
  );
}

/** مثلثات الزخرفة فوق الشعار */
function Confetti() {
  return (
    <div className="mb-1 flex flex-wrap justify-center gap-1" aria-hidden>
      {["size-1.5", "size-2", "size-1.5", "size-2.5", "size-1.5", "size-2"].map((s, i) => (
        <span
          key={i}
          className={`${s} rotate-45 bg-goldsoft/70 ${i % 2 ? "rounded-[2px]" : "rounded-full"}`}
        />
      ))}
    </div>
  );
}

function Index() {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen overflow-x-hidden bg-background font-body text-foreground"
    >
      {/* الشريط العلوي */}
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
            <UserRound className="size-4" aria-hidden />
          </span>
          <span className="grid size-8 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
            <Bell className="size-4" aria-hidden />
          </span>
        </div>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-sm font-bold text-cream shadow-[0_8px_0_0_oklch(0.28_0.05_55)] transition-transform hover:-translate-y-0.5"
        >
          <span className="text-base leading-none">+</span>
          اطلب الآن
        </a>
      </div>

      {/* كرت «كيف تطلب؟» */}
      <header className="px-4 pt-4">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-cocoa p-6 text-cream shadow-[0_24px_44px_-20px_oklch(0.3_0.05_55/0.7)] ring-1 ring-black/10 sm:p-8">
          <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
            {/* دوائر التسجيل/الطلب/الشحن */}
            <div className="flex items-start gap-4">
              {heroCircles.map(({ label, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <span className="grid size-11 place-items-center rounded-full ring-2 ring-cream/50 sm:size-12">
                    <Icon className="size-5 text-goldsoft sm:size-6" aria-hidden />
                  </span>
                  <span className="text-xs font-bold text-goldsoft">{label}</span>
                </div>
              ))}
            </div>
            {/* الشعار */}
            <div className="text-start">
              <Confetti />
              <p className="font-display text-2xl font-black tracking-tight text-goldsoft sm:text-3xl">
                {BRAND}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end">
            {/* كيف تطلب؟ */}
            <div className="flex-1 text-center sm:text-start">
              <p className="font-display text-4xl font-black leading-tight text-goldsoft sm:text-5xl">
                كيف تطلب؟<span className="text-gold">؟</span>
              </p>
              <svg
                viewBox="0 0 120 10"
                className="mx-auto mt-1 h-2.5 w-32 text-gold sm:mx-0"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 7c30-6 86-6 116-2"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            {/* سبورة العرض + الشخص */}
            <div className="relative shrink-0" aria-hidden>
              <div className="grid size-24 place-items-center rounded-xl bg-cream/10 ring-2 ring-cream/40 sm:size-28">
                <span className="grid size-9 place-items-center rounded-full bg-goldsoft text-cocoa">
                  <svg viewBox="0 0 24 24" className="size-4 translate-x-px" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
              </div>
              <span className="absolute -bottom-1 -start-3 grid size-9 place-items-center rounded-full bg-clay ring-2 ring-cocoa">
                <UserRound className="size-4 text-cream" />
              </span>
              <span className="absolute -top-2 end-2 font-display text-xl font-black text-gold">
                ↖
              </span>
            </div>
          </div>

          {/* اضغط هنا */}
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 font-display text-lg font-extrabold text-cocoadeep shadow-[0_7px_0_0_oklch(0.42_0.07_50)] transition-transform hover:-translate-y-0.5"
          >
            <Hand className="size-5 -scale-x-100 text-clay" aria-hidden />
            اضغط هنا
          </a>
        </div>
      </header>

      {/* العنوان */}
      <section className="px-4 pb-4 pt-8 text-center">
        <h1 className="font-display text-3xl font-extrabold leading-snug text-cocoadeep text-balance sm:text-4xl">
          تسوّق عالمياً، واستلم محلياً
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          اطلب من أي مكان في العالم ونوصله لباب بيتك
        </p>
      </section>

      {/* مشهد الطيارة والجبال والشاحنة */}
      <section className="relative mt-2 w-full" aria-hidden>
        <PlaneIcon className="anim-float absolute -top-6 start-[4%] size-9 -scale-x-100 text-cocoa/80 sm:size-12" />
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="block h-16 w-full text-sand sm:h-24"
          fill="currentColor"
        >
          <path d="M0 90V55l60-22 60 22 70-30 70 30 80-26 80 26 60-18 60 18 90-32 90 32 70-24 70 24 80-20 80 20 60-16 60 16 90-30 90 30 70-22 70 22 80-18 80 18 60-14 60 14 90-28 90 28 70-20 70 20 60-16 60 16V90Z" />
        </svg>
        <div className="route-dots relative h-4 w-full" />
        <div className="anim-drive absolute bottom-3 left-[8%] sm:left-[46%]">
          <BrandTruck />
        </div>
      </section>

      {/* المنصات */}
      <section className="px-4 pt-6">
        <p className="mb-4 text-center text-sm font-bold text-muted-foreground">
          نستورد لك من أشهر المتاجر العالمية
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {platforms.map((p) => (
            <span
              key={p.name}
              className={`rounded-lg px-3.5 py-2 font-display text-sm font-extrabold shadow-sm ${p.className}`}
            >
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* الخطوات */}
      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const last = i === steps.length - 1;
            return (
              <div
                key={s.title}
                className={`card-lift flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border ${
                  last ? "sm:col-span-2 sm:mx-auto sm:w-1/2" : ""
                }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-clay">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-base font-extrabold text-cocoadeep">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* الزرّان */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-card px-6 py-3.5 font-display font-extrabold text-cocoa ring-1 ring-border transition-transform hover:-translate-y-0.5"
          >
            <Search className="size-4" aria-hidden />
            تتبع شحنتك
          </a>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-cocoa px-8 py-4 font-display font-extrabold text-cream shadow-[0_9px_0_0_oklch(0.28_0.05_55)] transition-transform hover:-translate-y-0.5"
          >
            <ShoppingCart className="size-4" aria-hidden />
            اطلب الآن
          </a>
        </div>
      </section>

      {/* آراء العملاء */}
      <section className="pb-14">
        <h2 className="mb-6 text-center font-display text-2xl font-extrabold text-cocoadeep">
          آراء عملائنا
        </h2>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2">
          {[...testimonials, ...testimonials].map((t, i) => (
            <figure
              key={i}
              className="w-64 shrink-0 snap-center rounded-2xl bg-card p-5 ring-1 ring-border"
            >
              <Stars />
              <blockquote className="mt-3 text-sm leading-relaxed text-foreground/80">
                {t.text}
              </blockquote>
              <figcaption className="mt-3 text-center">
                <p className="font-display text-sm font-bold text-cocoadeep">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.city}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* الفوتر */}
      <footer className="pb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="واتساب"
            className="grid size-9 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="size-4" />
          </a>
          <span
            aria-label="يوتيوب"
            className="grid size-9 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
          >
            <Youtube className="size-4" aria-hidden />
          </span>
          <span
            aria-label="فيسبوك"
            className="grid size-9 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
          >
            <Facebook className="size-4" aria-hidden />
          </span>
          <span
            aria-label="إنستغرام"
            className="grid size-9 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
          >
            <Instagram className="size-4" aria-hidden />
          </span>
        </div>
        <p className="font-display text-sm font-extrabold text-cocoadeep">
          شريككم نحو التميز والنجاح
        </p>
        <p className="text-xs text-muted-foreground">بشكل احترافي</p>
        <p className="mt-3 font-display text-xs font-bold tracking-wide text-cocoa">
          {BRAND} © 2026
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          جميع الحقوق محفوظة — {BRAND}
        </p>
      </footer>
    </div>
  );
}
