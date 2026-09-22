import { createFileRoute, Link } from "@tanstack/react-router";
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

const WHATSAPP = "https://wa.me/967775527993";
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Z" />
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
  { name: "يوسف الحيفي", city: "صنعاء", text: "اشتريت لعبتين للأولاد من شي إن، التعامل كان صادق والتوصيل وصل لباب البيت." },
  { name: "أمة الحكيمي", city: "عدن", text: "وأخيراً لقيت موقع يوصل لعدن! خدمة ممتازة والتجاوب سريع جداً في الواتساب." },
  { name: "ياسر باشديد", city: "حضرموت", text: "التجربة فاقت التوقعات، تتبعت شحنتي كل يوم والتغليف كان ممتاز." },
];

function Stars() {
  return (
    <div className="flex justify-center gap-0.5 text-gold">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-sm leading-none">★</span>
      ))}
    </div>
  );
}

function Confetti() {
  return (
    <div className="mb-1 flex flex-wrap justify-center gap-1" aria-hidden>
      {["size-1.5", "size-2", "size-1.5", "size-2.5", "size-1.5", "size-2"].map((s, i) => (
        <span key={i} className={`${s} rotate-45 bg-goldsoft/70 ${i % 2? "rounded-[2px]" : "rounded-full"}`} />
      ))}
    </div>
  );
}

function Index() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen overflow-x-hidden bg-background font-body text-foreground">
      <style>{`
        @keyframes fly-across {
          0% { transform: translateX(120vw); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-120vw); opacity: 0; }
        }
        @keyframes truck-move {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(18px); }
        }
        @keyframes scroll-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
       .animate-fly { animation: fly-across 8s linear infinite; }
       .animate-truck { animation: truck-move 2.8s ease-in-out infinite; }
       .animate-marquee { animation: scroll-rtl 18s linear infinite; }
      `}</style>

      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <Link to="/login" className="grid size-11 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border shadow-sm">
            <UserRound className="size-6" />
          </Link>
          <Link to="/notifications" className="grid size-11 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border shadow-sm">
            <Bell className="size-6" />
          </Link>
        </div>
        <a href="/new-order" className="grid size-11 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border shadow-sm">
          <span className="text-[10px] font-bold leading-none text-center">اطلب الآن</span>
        </a>
      </div>

      <header className="px-4 pt-4">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-cocoa p-6 text-cream ring-1 ring-black/10 sm:p-8">
          <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
            <div className="flex items-start gap-4">
              {heroCircles.map(({ label, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <span className="grid size-11 place-items-center rounded-full ring-2 ring-cream/50 sm:size-12">
                    <Icon className="size-5 text-goldsoft sm:size-6" />
                  </span>
                  <span className="text-xs font-bold text-goldsoft">{label}</span>
                </div>
              ))}
            </div>
            <div className="text-start">
              <Confetti />
              <p className="font-display text-2xl font-black tracking-tight text-goldsoft sm:text-3xl">{BRAND}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end">
            <div className="flex-1 text-center sm:text-start">
              <p className="font-display text-4xl font-black leading-tight text-goldsoft sm:text-5xl">كيف تطلب؟<span className="text-gold">؟</span></p>
            </div>
            <div className="relative shrink-0">
              <div className="grid size-24 place-items-center rounded-xl bg-cream/10 ring-2 ring-cream/40 sm:size-28">
                <span className="grid size-9 place-items-center rounded-full bg-goldsoft text-cocoa">
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
                </span>
              </div>
            </div>
          </div>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 font-display text-lg font-extrabold text-cocoadeep">
            <Hand className="size-5 -scale-x-100" /> اضغط هنا
          </a>
        </div>
      </header>

      <section className="px-4 pb-4 pt-8 text-center">
        <h1 className="font-display text-3xl font-extrabold leading-snug text-cocoadeep sm:text-4xl">تسوّق عالمياً، واستلم محلياً</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">اطلب من أي مكان في العالم ونوصله لباب بيتك</p>
      </section>

      <section className="relative mt-2 h-36 w-full overflow-hidden sm:h-44">
        <PlaneIcon className="absolute top-3 start-[4%] size-10 -scale-x-100 text-cocoa/80 sm:top-4 sm:size-12 animate-fly" />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-sand sm:h-16" />
        <div className="absolute inset-x-0 bottom-12 h-2 route-dots sm:bottom-14" />
        <div className="absolute bottom-14 left-[8%] sm:bottom-16 sm:left-[46%] animate-truck"><BrandTruck /></div>
      </section>

      <section className="px-4 pt-6">
        <p className="mb-4 text-center text-sm font-bold text-muted-foreground">نستورد لك من أشهر المتاجر العالمية</p>
        <div className="overflow-hidden" dir="ltr">
          <div className="flex w-max animate-marquee gap-3 px-3">
            {[...platforms,...platforms].map((p, i) => (
              <span key={i} className={`rounded-lg px-3.5 py-2 font-display text-sm font-extrabold shadow-sm whitespace-nowrap ${p.className}`}>{p.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const last = i === steps.length - 1;
            return (
              <div key={s.title} className={`flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border ${last? "sm:col-span-2 sm:mx-auto sm:w-1/2" : ""}`}>
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-clay"><Icon className="size-5" /></span>
                <div>
                  <p className="font-display text-base font-extrabold text-cocoadeep">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-card px-6 py-3.5 font-display font-extrabold text-cocoa ring-1 ring-border">
            <Search className="size-4" /> تتبع شحنتك
          </a>
          <a href="/new-order" className="inline-flex items-center gap-2 rounded-2xl bg-cocoa px-8 py-4 font-display font-extrabold text-cream">
            <ShoppingCart className="size-4" /> اطلب الآن
          </a>
        </div>
      </section>

      <section className="pb-14">
        <h2 className="mb-6 text-center font-display text-2xl font-extrabold text-cocoadeep">آراء عملائنا</h2>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2">
          {testimonials.map((t, i) => (
            <figure key={i} className="w-64 shrink-0 rounded-2xl bg-card p-5 ring-1 ring-border">
              <Stars />
              <blockquote className="mt-3 text-sm leading-relaxed text-foreground/80">{t.text}</blockquote>
              <figcaption className="mt-3 text-center">
                <p className="font-display text-sm font-bold text-cocoadeep">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.city}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="pb-10 text-center">
        <p className="font-display text-sm font-extrabold text-cocoadeep">شريككم نحو التميز والنجاح</p>
        <p className="mt-3 font-display text-xs font-bold tracking-wide text-cocoa">{BRAND} © 2026</p>
      </footer>
    </div>
  );
}
