import { useEffect, useState } from "react";

/* =========================================================
   🌟 بنر الهيدر المتقلب — HeroFlipping
   ثلاث شرائح تتبدّل تلقائياً كل 4 ثوانٍ
   - ارتفاع الصندوق يُحسب من الشريحة النشطة نفسها (لا يظهر فارغاً)
   - توقف عند مرور الماوس + نقاط تنقل + الضغط يفتح صفحة الطلب
   - صور احتياطية (fallback) تظهر تلقائياً إن فشل تحميل صورة المشروع
   ========================================================= */

// صور احتياطية من Pexels (تُستخدم فقط عند فشل صور /public)
const PEXELS_TRUCK =
  "https://images.pexels.com/photos/9280464/pexels-photo-9280464.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";
const PEXELS_ELECTRONICS =
  "https://images.pexels.com/photos/4011762/pexels-photo-4011762.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";
const PEXELS_PARCELS =
  "https://images.pexels.com/photos/6407567/pexels-photo-6407567.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

const SLIDE_INTERVAL_MS = 4000;

type Slide = {
  id: number;
  src: string;
  fallback: string;
  alt: string;
};

const slides: Slide[] = [
  {
    id: 0,
    src: "/image%20copy%204.png",
    fallback: PEXELS_TRUCK,
    alt: "شحن مجاني لكل اليمن - بدون حد أدنى - توصيل سريع - تتبع آمن",
  },
  {
    id: 1,
    src: "/image%20copy.png",
    fallback: PEXELS_ELECTRONICS,
    alt: "خصم 50% على الإلكترونيات - أحدث الأجهزة والتقنيات - ضمان سنة - دفع آمن",
  },
  {
    id: 2,
    src: "/image%20copy%202.png",
    fallback: PEXELS_PARCELS,
    alt: "تسوق عالمياً واستلم محلياً - شحن آمن حتى باب بيتك",
  },
];

export default function HeroFlipping() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  // التقلب التلقائي (يتوقف عند الإيقاف)
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section className="px-3 pt-4 sm:px-4" dir="rtl">
      <div
        className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl ring-1 ring-sky-400/20 sm:rounded-3xl"
        style={{ backgroundColor: "#0f2a5c" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* الشريحة النشطة في التدفق الطبيعي فتحدد الارتفاع بنفسها، والبقية مطلقة الموضع */}
        <div className="relative w-full">
          {slides.map((slide, i) => {
            const isActive = i === active;
            const shown = failed[slide.id] === true ? slide.fallback : slide.src;

            return (
              <div
                key={slide.id}
                aria-hidden={!isActive}
                className={
                  isActive
                    ? "relative block w-full transition-all duration-700 ease-out"
                    : "absolute inset-0 block w-full -translate-x-8 opacity-0 transition-all duration-700 ease-out"
                }
              >
                <img
                  src={shown}
                  alt={slide.alt}
                  className="block h-auto w-full select-none object-contain"
                  draggable={false}
                  loading={i === 0 ? "eager" : "lazy"}
                  onError={() =>
                    setFailed((prev) => ({ ...prev, [slide.id]: true }))
                  }
                />

                {/* طبقة نقر شفافة تفتح صفحة الطلب عند الضغط على الشريحة النشطة */}
                {isActive && (
                  <a
                    href="/new-order"
                    aria-label="اطلب الآن"
                    className="absolute inset-0 cursor-pointer"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* نقاط التنقل */}
        <div className="flex items-center justify-center gap-2 pb-3 pt-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`عرض ${i + 1}: ${slide.alt}`}
              onClick={() => setActive(i)}
              className={`h-2.5 cursor-pointer rounded-full transition-all duration-300 ${
                i === active
                  ? "w-8 bg-orange-500"
                  : "w-2.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
