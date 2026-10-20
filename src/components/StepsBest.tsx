import type { CSSProperties, ReactNode } from "react";

type Step = {
  num: number;
  title: string;
  desc: string;
  icon: ReactNode;
  href: string;
  wide?: boolean;
};

const svgProps = {
  className: "sbg-gold-icon",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "url(#sbg-gold-grad)",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const LinkIcon = () => (
  <svg {...svgProps} aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const DollarIcon = () => (
  <svg {...svgProps} aria-hidden="true">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const CartIcon = () => (
  <svg {...svgProps} aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const SearchIcon = () => (
  <svg {...svgProps} aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const BoxIcon = () => (
  <svg {...svgProps} aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const steps: Step[] = [
  { num: 1, title: "أرسل الرابط", desc: "الصق رابط الصفحة من أي متجر إلكتروني", icon: <LinkIcon />, href: "/new-order" },
  { num: 2, title: "تعرف السعر", desc: "نوضح لك التكلفة بالريال اليمني أو الدولار", icon: <DollarIcon />, href: "/new-order" },
  { num: 3, title: "نشتري لك", desc: "نشتري بدلاً عنك ونضمن جودة وتطابق الطلب", icon: <CartIcon />, href: "/new-order" },
  { num: 4, title: "تابع الشحنة", desc: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع", icon: <SearchIcon />, href: "/track" },
  { num: 5, title: "الاستلام", desc: "توصيل موثوق حتى باب بيتك في كافة المحافظات", icon: <BoxIcon />, href: "/new-order", wide: true },
];

const iconBox: CSSProperties = {
  width: 44,
  height: 44,
  background: "#ff7a00",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 4px 15px rgba(255,122,0,.5)",
};

const dottedBackground: CSSProperties = {
  backgroundColor: "#0f2a5a",
  backgroundImage: "radial-gradient(circle, #3b82f6 1.8px, transparent 1.8px)",
  backgroundSize: "30px 30px",
  marginTop: 40,
};

export default function StepsBest() {
  return (
    <>
      <style>{`
        @keyframes sbg-gold-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px #ffd700) brightness(1); transform: scale(1); }
          50% { filter: drop-shadow(0 0 18px #ffd700) drop-shadow(0 0 30px #ffb700) brightness(1.3); transform: scale(1.08); }
        }
        @keyframes sbg-card-glow {
          0%, 100% {
            border-color: rgba(0,255,255,.85);
            box-shadow: 0 0 10px rgba(0,255,255,.75), 0 0 20px rgba(255,122,0,.48), 0 0 34px rgba(0,255,255,.22);
          }
          50% {
            border-color: rgba(255,160,0,1);
            box-shadow: 0 0 24px rgba(0,255,255,1), 0 0 44px rgba(255,122,0,.92), 0 0 62px rgba(255,122,0,.42);
          }
        }
        .sbg-title { padding-top: 26px; color: #fff; text-align: center; font-size: 20px; font-weight: 800; }
        .sbg-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; max-width: 920px; margin: 0 auto; padding: 22px 20px 34px; }
        .sbg-card {
          isolation: isolate; position: relative; display: flex; align-items: center; justify-content: space-between;
          gap: 14px; overflow: visible; padding: 16px 18px; color: #fff; text-align: right; text-decoration: none;
          box-sizing: border-box; border: 2.5px solid rgba(0,255,255,.8); border-radius: 14px;
          background: rgba(37,71,133,.92); box-shadow: 0 0 15px rgba(0,255,255,.5), 0 0 25px rgba(255,122,0,.4);
          animation: sbg-card-glow 2.2s ease-in-out infinite;
        }
        /* ظل متحرك مستقل يظل ظاهرًا حتى مع قواعد .card-fixed ذات !important في الصفحة الأم. */
        .sbg-card::before {
          content: ""; position: absolute; inset: -3px; z-index: -1; pointer-events: none;
          border: 1px solid rgba(0,255,255,.8); border-radius: inherit;
          box-shadow: 0 0 12px rgba(0,255,255,.6), 0 0 22px rgba(255,122,0,.5), 0 0 35px rgba(0,255,255,.2);
          animation: sbg-card-glow 2.2s ease-in-out infinite;
          animation-delay: var(--sbg-delay, 0s);
        }
        .sbg-card:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
        .sbg-card-wide { grid-column: 1 / -1; max-width: 460px; width: 100%; margin: 0 auto; }
        .sbg-card-text { min-width: 0; flex: 1; }
        .sbg-card-title { display: block; color: #fff; font-size: 14px; font-weight: 700; line-height: 1.4; }
        .sbg-card-num { color: #ff8c00; font-weight: 800; }
        .sbg-card-desc { display: block; margin-top: 4px; color: #cbd5e1; font-size: 12px; line-height: 1.6; }
        .sbg-icon-box { width: 44px; height: 44px; flex: 0 0 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: #ff7a00; box-shadow: 0 4px 15px rgba(255,122,0,.5); }
        .sbg-gold-icon { width: 26px; height: 26px; animation: sbg-gold-pulse 2s ease-in-out infinite; }
        .sbg-cta-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; padding: 0 20px 34px; }
        .sbg-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 11px 22px; color: #fff; font-size: 13px; font-weight: 800; text-decoration: none; }
        .sbg-cta-main { padding: 12px 26px; background: linear-gradient(135deg,#ff8a2a,#ff6a00); box-shadow: 0 0 22px rgba(255,122,0,.5); }
        .sbg-cta-ghost { border: 1.5px solid rgba(103,232,249,.5); background: rgba(255,255,255,.08); box-shadow: 0 0 14px rgba(0,255,255,.25); backdrop-filter: blur(14px); }
        .sbg-cta:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
        @media (max-width: 760px) {
          .sbg-grid { grid-template-columns: 1fr; gap: 14px; }
          .sbg-card-wide { grid-column: auto; max-width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sbg-card, .sbg-card::before, .sbg-gold-icon { animation: none !important; }
        }
      `}</style>
      <section id="steps" className="fx-steps-section" dir="rtl" style={dottedBackground} aria-labelledby="sbg-title">
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="sbg-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#ffec8b" />
              <stop offset="100%" stopColor="#ffb700" />
            </linearGradient>
          </defs>
        </svg>
        <h2 id="sbg-title" className="sbg-title">كيف تعمل؟ خطوات بسيطة</h2>
        <div className="sbg-grid">
          {steps.map((step, index) => (
            <a
              key={step.num}
              href={step.href}
              className={`card-fixed sbg-card${step.wide ? " sbg-card-wide" : ""}`}
              style={{ "--sbg-delay": `${index * 0.35}s` } as CSSProperties}
            >
              <span className="sbg-card-text">
                <span className="sbg-card-title">
                  <span className="sbg-card-num">{step.num}. </span>{step.title}
                </span>
                <span className="sbg-card-desc">{step.desc}</span>
              </span>
              <span className="sbg-icon-box">{step.icon}</span>
            </a>
          ))}
        </div>
        <div className="sbg-cta-row">
          <a href="/new-order" className="sbg-cta sbg-cta-main"><span aria-hidden="true">🛒</span><span>اطلب الآن فوراً</span></a>
          <a href="#steps" className="sbg-cta sbg-cta-ghost"><span aria-hidden="true">📣</span><span>كيف نعمل</span></a>
          <a href="/track" className="sbg-cta sbg-cta-ghost"><span aria-hidden="true">🔍</span><span>تتبع طلبك</span></a>
        </div>
      </section>
    </>
  );
}
