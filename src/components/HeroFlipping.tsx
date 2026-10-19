import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Globe2,
  PackageCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

const slides = [
  {
    eyebrow: "AL SHAMEL SHOPPING",
    title: "تسوّق عالميًا، واستمتع محليًا",
    description:
      "اختر منتجك من متجرك المفضّل، وأرسل رابطه لنساعدك في متابعة طلبك.",
    action: "ابدأ طلبك",
    href: "/new-order",
    Icon: ShoppingBag,
    glow: "from-orange-500/30 via-orange-400/10 to-transparent",
  },
  {
    eyebrow: "تابع طلبك",
    title: "رحلة طلبك أوضح خطوة بخطوة",
    description:
      "ارجع إلى صفحة التتبع لمراجعة آخر حالة مسجلة لطلبك أو شحنتك.",
    action: "تتبع الطلب",
    href: "/track",
    Icon: PackageCheck,
    glow: "from-cyan-400/30 via-blue-400/10 to-transparent",
  },
];

export default function HeroFlipping() {
  const [active, setActive] = useState(0);
  const slide = slides[active];
  const SlideIcon = slide.Icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-label="السوق الشامل، تسوق وشحن عالمي"
      aria-roledescription="carousel"
      className="mx-auto w-full max-w-5xl px-4 pt-5 sm:pt-7"
    >
      <div className="relative isolate overflow-hidden rounded-2xl border border-sky-300/25 bg-[#09254b]/95 shadow-[0_18px_55px_rgba(0,0,0,.35)] sm:rounded-[26px]">
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 bg-gradient-to-l ${slide.glow}`}
        />
        <div className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(#7dd3fc_0.7px,transparent_0.7px)] [background-size:16px_16px]" />

        <div className="grid min-h-[220px] items-center gap-2 px-5 py-5 sm:min-h-[270px] sm:px-9 sm:py-7 lg:grid-cols-[1fr_230px]">
          <div dir="rtl" className="relative z-10 text-right">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1.5 text-[10px] font-black tracking-wide text-orange-100 sm:text-xs">
              <Globe2 className="size-3.5 text-orange-300" aria-hidden="true" />
              {slide.eyebrow}
            </div>
            <h2 className="max-w-2xl text-xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
              {slide.title}
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-sky-100/85 sm:mt-3 sm:text-sm sm:leading-7">
              {slide.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 sm:mt-5">
              <a
                href={slide.href}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-950/40 transition hover:-translate-y-0.5 hover:from-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 sm:px-5 sm:py-3 sm:text-sm"
              >
                {slide.action}
                <ArrowLeft className="size-4" aria-hidden="true" />
              </a>
              <div className="flex items-center gap-2" aria-label="اختيار العرض">
                {slides.map((item, index) => (
                  <button
                    key={item.eyebrow}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`عرض ${item.eyebrow}`}
                    aria-pressed={active === index}
                    className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${
                      active === index
                        ? "w-7 bg-orange-400"
                        : "w-2.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            dir="ltr"
            className="relative hidden h-[190px] items-center justify-center lg:flex"
          >
            <div className="absolute size-44 rounded-full border border-sky-300/20 bg-sky-400/10 shadow-[0_0_70px_rgba(14,165,233,.25)]" />
            <div className="absolute size-36 rounded-full border border-orange-300/20" />
            <div className="relative grid size-28 place-items-center rounded-[28px] border border-orange-200/30 bg-gradient-to-br from-orange-400 to-orange-700 text-white shadow-[0_12px_45px_rgba(249,115,22,.4)]">
              <Truck className="size-16" strokeWidth={1.5} />
            </div>
            <div className="absolute bottom-5 right-1 grid size-11 place-items-center rounded-2xl border border-sky-200/25 bg-[#0e3766] text-sky-200 shadow-lg">
              <PackageCheck className="size-5" />
            </div>
            <div className="absolute left-2 top-5 grid size-10 place-items-center rounded-xl border border-orange-200/25 bg-[#102e57] text-orange-200 shadow-lg">
              <SlideIcon className="size-5" />
            </div>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#071a37]/75 px-3 py-1 text-[10px] font-bold text-sky-100">
              تسوق من متاجرك المفضلة
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
