import { useEffect, useState } from "react";
import { ArrowLeft, Globe2, PackageCheck, ShoppingBag } from "lucide-react";

const slides = [
  {
    eyebrow: "تسوّق عالميًا",
    title: "متاجرك المفضّلة أقرب إليك",
    description: "ابدأ من رابط المنتج، وأرسل تفاصيل طلبك من المتجر الذي تختاره.",
    action: "ابدأ طلبك",
    href: "/new-order",
    Icon: ShoppingBag,
    accent: "from-orange-500/25 via-orange-500/5 to-transparent",
  },
  {
    eyebrow: "تابع طلبك",
    title: "رحلة طلبك بخطوات أوضح",
    description: "بعد إنشاء الطلب، استخدم صفحة التتبع لمراجعة آخر حالة مسجلة.",
    action: "تتبع الطلب",
    href: "/track",
    Icon: PackageCheck,
    accent: "from-sky-400/25 via-sky-400/5 to-transparent",
  },
];

export default function HeroFlipping() {
  const [active, setActive] = useState(0);
  const slide = slides[active];
  const { Icon } = slide;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const showSlide = (index: number) => setActive(index);

  return (
    <section
      aria-label="عروض وخدمات السوق الشامل"
      aria-roledescription="carousel"
      className="mx-auto w-full max-w-5xl px-4 pt-4"
    >
      <div className="relative isolate overflow-hidden rounded-[26px] border border-white/15 bg-[#0b2345]/85 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l ${slide.accent}`}
        />
        <div className="grid min-h-[174px] grid-cols-[68px_1fr] items-center gap-4 p-4 sm:min-h-[205px] sm:grid-cols-[104px_1fr] sm:gap-7 sm:p-7">
          <div className="grid size-16 place-items-center rounded-2xl border border-orange-300/25 bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)] sm:size-24 sm:rounded-[28px]">
            <Icon className="size-8 sm:size-11" aria-hidden="true" />
          </div>

          <div className="min-w-0 text-right">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200/20 bg-sky-100/10 px-3 py-1 text-[10px] font-black text-sky-100 sm:text-xs">
              <Globe2 className="size-3.5 text-orange-300" aria-hidden="true" />
              {slide.eyebrow}
            </div>
            <h2 className="text-lg font-black leading-snug text-white sm:text-2xl">
              {slide.title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-6 text-sky-100/80 sm:text-sm">
              {slide.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <a
                href={slide.href}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-950/30 transition hover:-translate-y-0.5 hover:from-orange-400 hover:to-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
              >
                {slide.action}
                <ArrowLeft className="size-4" aria-hidden="true" />
              </a>
              <div className="flex items-center gap-2" aria-label="اختيار الشريحة">
                {slides.map((item, index) => (
                  <button
                    key={item.eyebrow}
                    type="button"
                    onClick={() => showSlide(index)}
                    aria-label={`عرض الشريحة ${index + 1}: ${item.eyebrow}`}
                    aria-pressed={active === index}
                    className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${
                      active === index ? "w-7 bg-orange-400" : "w-2.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
