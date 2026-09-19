import { createFileRoute } from "@tanstack/react-router";
import {
  Calculator,
  Home,
  Link2,
  PackageSearch,
  Search,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

const WHATSAPP = "https://wa.me/967700000000";

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

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 4h11v9H3V4Zm12 3h4l3 3v3h-7V7ZM6 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm11 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}

const steps: { n: string; title: string; desc: string; icon: LucideIcon }[] = [
  {
    n: "١",
    title: "أرسل الرابط",
    desc: "ترسل لنا رابط المنتج اللي يعجبك من أي متجر عالمي.",
    icon: Link2,
  },
  {
    n: "٢",
    title: "اعرف السعر",
    desc: "نحسب لك التكلفة شاملة الشراء والشحن والرسوم — بدون مفاجآت.",
    icon: Calculator,
  },
  {
    n: "٣",
    title: "نشتري لك",
    desc: "ندفع ونشتري المنتج نيابةً عنك بأمان تام.",
    icon: ShoppingCart,
  },
  {
    n: "٤",
    title: "تابع الشحنة",
    desc: "نرسل لك التتبع خطوة بخطوة حتى توصل.",
    icon: PackageSearch,
  },
  {
    n: "٥",
    title: "الاستلام",
    desc: "يوصلك طلبك لباب البيت، جاهز للفتح.",
    icon: Home,
  },
];

const platforms = ["TEMU", "Trendyol", "SHEIN", "Amazon", "AliExpress"];

const testimonials = [
  {
    name: "يوسف الحيفي",
    city: "صنعاء",
    text: "اشتريت لعبتين للأولاد من شي إن، كنت متردد كثير لكن التعامل كان صادق والتوصيل وصل لباب البيت. ما توقعت أنه بهذه السهولة.",
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
        <span key={i} className="text-lg leading-none">
          ★
        </span>
      ))}
    </div>
  );
}

function Index() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background font-body text-foreground overflow-x-hidden">
      {/* زر واتساب عائم */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 start-5 z-50 flex items-center gap-2 rounded-full bg-wa px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_14px_26px_-8px_oklch(0.3_0.05_55/0.55)] transition-transform hover:-translate-y-0.5"
      >
        <WhatsAppIcon className="size-4" />
        راسلنا على واتساب
      </a>

      {/* ١. كرت خدمة العملاء */}
      <header className="px-4 pt-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-cocoa p-6 text-cream shadow-[0_22px_40px_-18px_oklch(0.3_0.05_55/0.7)] ring-1 ring-black/10 sm:p-7">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-gold font-display text-2xl font-extrabold text-cocoadeep shadow-[inset_0_-4px_0_oklch(0_0_0/0.15)]">
                س
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide text-goldsoft">خدمة العملاء</p>
                <p className="font-display text-xl font-bold leading-tight">السوق الشامل</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:ms-auto">
              {["أصلي", "سريع", "ثقة"].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-sm font-bold ring-1 ring-cream/15"
                >
                  <span className="size-2 rounded-full bg-gold" />
                  {t}
                </span>
              ))}
            </div>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 font-bold text-cocoadeep shadow-[0_8px_0_0_oklch(0.42_0.07_50)] transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="size-4" />
              اضغط هنا
            </a>
          </div>
        </div>
      </header>

      {/* ٢. العنوان الكبير + خط الطيارة والشاحنة */}
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-14 text-center">
        <h1 className="font-display text-4xl font-extrabold leading-[1.2] text-cocoadeep text-balance sm:text-6xl">
          تسوّق عالمياً،
          <br />
          واستلم محلياً
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-lg text-muted-foreground text-pretty">
          اطلب من العالم، ودع «السوق الشامل» يتولى الباقي حتى بابك — نشتري لك، ندفع عنك، ونوصل.
        </p>

        <div className="relative mx-auto mt-14 max-w-2xl">
          <div className="absolute inset-x-10 top-1/2 h-6 -translate-y-1/2 route-dots" />
          <div className="relative flex items-center justify-between px-2">
            <div className="anim-float flex items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
              <PlaneIcon className="size-7 text-cocoa" />
              <span className="text-xs font-bold text-cocoa">من العالم</span>
            </div>
            <div
              className="anim-float flex items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-border"
              style={{ animationDelay: "1.2s" }}
            >
              <span className="text-xs font-bold text-cocoa">إلى بابك</span>
              <TruckIcon className="size-7 text-clay" />
            </div>
          </div>
        </div>
      </section>

      {/* ٣. المنصات */}
      <section className="mx-auto max-w-4xl px-4 py-6">
        <p className="mb-5 text-center text-sm font-bold text-muted-foreground">
          نستورد لك من أشهر المتاجر العالمية
        </p>
        <div className="overflow-hidden rounded-3xl bg-secondary py-5 ring-1 ring-border">
          <div className="anim-marquee flex w-max items-center gap-10 px-5">
            {[...platforms, ...platforms, ...platforms].map((p, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-display text-2xl font-extrabold text-cocoa/80"
                style={{ fontFamily: p === "SHEIN" ? "inherit" : undefined }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ٤. الخمس خطوات */}
      <section className="mx-auto max-w-2xl px-4 py-14">
        <h2 className="mb-2 text-center font-display text-3xl font-extrabold text-cocoadeep text-balance sm:text-4xl">
          كيف نشتري لك؟
        </h2>
        <p className="mb-10 text-center text-muted-foreground">خمس خطوات تفصلك عن طلبك</p>

        <ol className="relative space-y-3">
          <span className="absolute bottom-4 start-[27px] top-4 w-0.5 rounded-full bg-gold/50" />
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.n} className="card-lift relative flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
                <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-cocoa font-display text-xl font-extrabold text-goldsoft ring-1 ring-black/10">
                  {s.n}
                </span>
                <div className="flex-1">
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-cocoadeep">
                    <Icon className="size-5 text-clay" aria-hidden />
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ٥. الزرّان + تجارب العملاء */}
      <section className="mx-auto max-w-4xl px-4 pb-14">
        <div className="rounded-3xl bg-cocoa p-8 text-center text-cream shadow-[0_22px_40px_-18px_oklch(0.3_0.05_55/0.7)] ring-1 ring-black/10 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold text-balance sm:text-3xl">
            جاهز تبدأ رحلتك؟
          </h2>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3.5 font-bold text-cocoadeep shadow-[0_8px_0_0_oklch(0.42_0.07_50)] transition-transform hover:-translate-y-0.5"
            >
              <ShoppingCart className="size-4" aria-hidden />
              اطلب الآن
            </a>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cream/10 px-6 py-3.5 font-bold text-cream ring-1 ring-cream/25 transition-transform hover:-translate-y-0.5"
            >
              <Search className="size-4" aria-hidden />
              تتبع شحنتك
            </a>
          </div>
        </div>

        <h3 className="mb-8 mt-14 text-center font-display text-2xl font-extrabold text-cocoadeep text-balance sm:text-3xl">
          تجارب عملائنا
        </h3>
        <div className="grid gap-5 sm:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="card-lift rounded-3xl bg-card p-6 ring-1 ring-border"
            >
              <Stars />
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground/80 text-pretty">
                {t.text}
              </blockquote>
              <figcaption className="mt-4 text-center">
                <p className="font-display font-bold text-cocoadeep">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.city}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-4xl px-4 pb-10 text-center text-sm text-muted-foreground">
        <p>السوق الشامل — وسيط شراء لليمن · أصلي · سريع · ثقة</p>
      </footer>
    </div>
  );
}
