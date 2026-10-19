import type { CSSProperties, ReactNode } from "react";

type Step = {
  num: number;
  title: string;
  desc: string;
  icon: ReactNode;
  href: string;
  wide?: boolean;
};

/* أيقونات SVG تأخذ التدرّج الذهبي من #goldGrad (الإيموجي لا يقبل التلوين الذهبي) */
const svgProps = {
  className: "gold-icon",
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const LinkIcon = () => (
  <svg {...svgProps}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const DollarIcon = () => (
  <svg {...svgProps}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const CartIcon = () => (
  <svg {...svgProps}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const SearchIcon = () => (
  <svg {...svgProps}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const BoxIcon = () => (
  <svg {...svgProps}>
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
  width: "44px",
  height: "44px",
  background: "#ff7a00",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 4px 15px rgba(255,122,0,0.5)",
};

export default function StepsBest() {
  return (
    <section id="steps" className="fx-steps-section" dir="rtl">
      {/* التدرّج الذهبي + نبض الأيقونة الذهبية (مدمج داخل المكوّن) */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#ffec8b" />
            <stop offset="100%" stopColor="#ffb700" />
          </linearGradient>
        </defs>
      </svg>
      <style>{`
@keyframes goldIconPulse {
  0%   { filter: drop-shadow(0 0 6px gold) brightness(1); transform: scale(1); }
  50%  { filter: drop-shadow(0 0 18px gold) drop-shadow(0 0 30px #ffb700) brightness(1.3); transform: scale(1.08); }
  100% { filter: drop-shadow(0 0 6px gold) brightness(1); transform: scale(1); }
}
.gold-icon {
  width: 26px;
  height: 26px;
  animation: goldIconPulse 2s ease-in-out infinite;
}
.gold-icon path, .gold-icon circle, .gold-icon rect,
.gold-icon line, .gold-icon polyline { stroke: url(#goldGrad); }
@media (prefers-reduced-motion: reduce) { .gold-icon { animation: none; } }
`}</style>

      <h2 className="fx-steps-title">كيف تعمل؟ خطوات بسيطة</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
          maxWidth: "920px",
          margin: "0 auto",
          padding: "22px 20px 10px",
        }}
      >
        {steps.map((step, i) => (
          <a
            key={step.num}
            href={step.href}
            className="card-fixed"
            style={{
              animationDelay: `${i * 0.35}s`,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              position: "relative",
              overflow: "visible",
              textDecoration: "none",
              boxSizing: "border-box",
              ...(step.wide
                ? { gridColumn: "1 / -1", maxWidth: "460px", margin: "0 auto", width: "100%" }
                : {}),
            }}
          >
            <span style={{ flex: 1, textAlign: "right" }}>
              <span style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#ffffff", lineHeight: 1.4 }}>
                <span style={{ color: "#ff8c00", fontWeight: 800 }}>{step.num}. </span>
                {step.title}
              </span>
              <span style={{ display: "block", marginTop: "4px", color: "#cbd5e1", fontSize: "12px", lineHeight: 1.6 }}>
                {step.desc}
              </span>
            </span>

            <span style={iconBox}>{step.icon}</span>
          </a>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "10px 20px 34px",
        }}
      >
        <a
          href="/new-order"
          className="fx-cta-pulse"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "linear-gradient(135deg, #ff8a2a, #ff6a00)",
            borderRadius: "12px", padding: "12px 26px", color: "#ffffff",
            fontWeight: 800, fontSize: "13px", textDecoration: "none",
            boxShadow: "0 0 22px rgba(255,122,0,0.5), 0 4px 15px rgba(255,122,0,0.35)",
          }}
        >
          <span aria-hidden="true">🛒</span>
          <span>اطلب الآن فوراً</span>
        </a>

        <a
          href="#steps"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.08)", backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)", border: "1.5px solid rgba(103,232,249,0.5)",
            borderRadius: "12px", padding: "11px 22px", color: "#ffffff",
            fontWeight: 800, fontSize: "13px", textDecoration: "none",
            boxShadow: "0 0 14px rgba(0,255,255,0.25)",
          }}
        >
          <span aria-hidden="true">📣</span>
          <span>كيف نعمل</span>
        </a>

        <a
          href="/track"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.08)", backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)", border: "1.5px solid rgba(103,232,249,0.5)",
            borderRadius: "12px", padding: "11px 22px", color: "#ffffff",
            fontWeight: 800, fontSize: "13px", textDecoration: "none",
            boxShadow: "0 0 14px rgba(0,255,255,0.25)",
          }}
        >
          <span aria-hidden="true">🔍</span>
          <span>تتبع طلبك</span>
        </a>
      </div>
    </section>
  );
}
