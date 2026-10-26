import type { CSSProperties } from "react";

const reviews = [
  {
    quote:
      "اشتريت لعبتين للأولاد من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت بدون أي عناء.",
    name: "يوسف الحنفي",
    city: "صنعاء",
    delay: "0s",
  },
  {
    quote: "وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعدن! خدمة ممتازة وتجاوب فوري عبر الواتساب.",
    name: "أمة الحكيمي",
    city: "عدن",
    delay: ".4s",
  },
  {
    quote: "التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية.",
    name: "ياسر باشديد",
    city: "حضرموت",
    delay: ".8s",
  },
];

const dottedBackground: CSSProperties = {
  backgroundColor: "#0f2a5a",
  backgroundImage: "radial-gradient(circle, #3b82f6 1.8px, transparent 1.8px)",
  backgroundSize: "30px 30px",
};

export default function ReviewsBest() {
  return (
    <>
      <style>{`
        @keyframes rbg-card-glow {
          0%, 100% {
            border-color: rgba(0,255,255,.85);
            box-shadow: 0 0 10px rgba(0,255,255,.75), 0 0 20px rgba(255,122,0,.48), 0 0 34px rgba(0,255,255,.22);
          }
          50% {
            border-color: rgba(255,160,0,1);
            box-shadow: 0 0 24px rgba(0,255,255,1), 0 0 44px rgba(255,122,0,.92), 0 0 62px rgba(255,122,0,.42);
          }
        }
        .rbg-section { width: 100%; margin-top: 0; }
        .rbg-title { padding-top: 26px; color: #fff; text-align: center; font-size: 20px; font-weight: 800; }
        .rbg-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; max-width: 1100px; margin: 0 auto; padding: 28px 20px 40px; }
        .rbg-card {
          isolation: isolate; position: relative; overflow: visible; padding: 24px 20px; color: #fff; text-align: center;
          border: 2.5px solid rgba(0,255,255,.8); border-radius: 16px; background: rgba(25,55,110,.95);
          box-shadow: 0 0 15px rgba(0,255,255,.5), 0 0 25px rgba(255,122,0,.4);
          animation: rbg-card-glow 2.2s ease-in-out infinite;
        }
        .rbg-card::before {
          content: ""; position: absolute; inset: -3px; z-index: -1; pointer-events: none;
          border: 1px solid rgba(0,255,255,.8); border-radius: inherit;
          box-shadow: 0 0 12px rgba(0,255,255,.6), 0 0 22px rgba(255,122,0,.5), 0 0 35px rgba(0,255,255,.2);
          animation: rbg-card-glow 2.2s ease-in-out infinite;
          animation-delay: var(--rbg-delay, 0s);
        }
        .rbg-card:focus-within { outline: 2px solid #fff; outline-offset: 4px; }
        .rbg-stars { margin-bottom: 12px; color: #ffb700; font-size: 16px; letter-spacing: 3px; text-shadow: 0 0 12px rgba(255,183,0,.8); }
        .rbg-quote { color: #fff; font-size: 13px; font-weight: 500; line-height: 1.8; }
        .rbg-divider { height: 1px; max-width: 160px; margin: 14px auto 0; background: linear-gradient(90deg, transparent, rgba(255,140,0,.8), rgba(103,232,249,.8), transparent); }
        .rbg-name { margin: 12px 0 2px; color: #fff; font-size: 14px; font-weight: 700; }
        .rbg-city { color: #ff8c00; font-size: 12px; font-weight: 700; }
        @media (max-width: 760px) { .rbg-grid { grid-template-columns: 1fr; gap: 14px; } }
        @media (prefers-reduced-motion: reduce) { .rbg-card, .rbg-card::before { animation: none !important; } }
      `}</style>
      <section
        className="fx-steps-section reviews rbg-section"
        dir="rtl"
        style={dottedBackground}
        aria-labelledby="rbg-title"
      >
        <h2 id="rbg-title" className="rbg-title">
          آراء عملائنا
        </h2>
        <div className="rbg-grid">
          {reviews.map((review) => (
            <figure
              key={review.name}
              className="testimonial-fixed rbg-card"
              style={{ "--rbg-delay": review.delay } as CSSProperties}
            >
              <div className="rbg-stars" aria-label="5 من 5 نجوم">
                ★★★★★
              </div>
              <blockquote className="rbg-quote">“{review.quote}”</blockquote>
              <figcaption>
                <div className="rbg-divider" />
                <p className="rbg-name">{review.name}</p>
                <p className="rbg-city">{review.city}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
