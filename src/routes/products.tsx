import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const playTone = (frequency: number) => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // تجاهل منع المتصفح لتشغيل الصوت.
  }
};

const playPhoneNotificationSound = () => playTone(880);
const playDismissClickSound = () => playTone(520);
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  Heart,
  Star,
  Tag,
  Percent,
  Truck,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Sparkles,
  ArrowLeft,
  X,
  Plus,
  Minus,
  MessageCircle,
  CreditCard,
  Building,
  Wallet,
  Coins,
  ChevronLeft,
  Filter,
  CheckCircle2,
  DollarSign,
  Calculator,
  RotateCcw,
} from "lucide-react";

// =========================================================================
// 🌟 أنواع البيانات لصفحة المنتجات وبوابات الشراء الست
// =========================================================================
export interface ProductItem {
  id: string;
  store: "SHEIN" | "Amazon" | "Alibaba" | "Discounts" | "AliExpress" | "Trendyol" | "الشامل";
  sku?: string;
  quantity?: number;
  inventoryProduct?: boolean;
  title: string;
  category: string;
  priceSAR: number;
  oldPriceSAR?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  badge?: string;
  inStock: boolean;
  features?: string[];
}

export interface StorePlatform {
  id: string;
  externalUrl?: string;
  code: string;
  name: string;
  englishName: string;
  badge: string;
  badgeColor: string;
  discountTag: string;
  couponCode: string;
  image: string;
  orderCount: string;
  features: string[];
}

type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  store_id: string | null;
  quantity: number | null;
  sell_price: number | null;
  created_at: string | null;
};

type StorefrontProduct = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  site_name: string;
};

interface ProductsRouteProps {
  onBack?: () => void;
  onNavigateToOrder?: (storeCode?: string, productName?: string) => void;
  onNavigateToTracker?: () => void;
  onNavigateToAdmin?: () => void;
}

const INTERNATIONAL_STORES = [
  { id: "shein", name: "SHEIN", fallback: "https://www.shein.com", tone: "bg-[#fffaf2]" },
  { id: "noon", name: "Noon", fallback: "https://www.noon.com", tone: "bg-[#fffaf2]" },
  { id: "temu", name: "TEMU", fallback: "https://www.temu.com", tone: "bg-[#fffaf2]" },
  { id: "aliexpress", name: "AliExpress", fallback: "https://www.aliexpress.com", tone: "bg-[#fffaf2]" },
  { id: "amazon", name: "Amazon", fallback: "https://www.amazon.com", tone: "bg-[#fffaf2]" },
  { id: "ebay", name: "eBay", fallback: "https://www.ebay.com", tone: "bg-[#fffaf2]" },
  { id: "discounts", name: "تخفيضات حتى 70%", fallback: "#discounts", tone: "bg-[#f5b8c4]" },
  { id: "exclusive", name: "عروضات حصرية", fallback: "#exclusive", tone: "bg-[#17130f]" },
] as const;

type StoreGlyph = () => React.ReactElement;

type StoreIconConfig = {
  id: string;
  name: string;
  from: string;
  to: string;
  ink?: string;
  Glyph: StoreGlyph;
};

function IconShell({
  id,
  from,
  to,
  ink = "#ffffff",
  children,
}: {
  id: string;
  from: string;
  to: string;
  ink?: string;
  children: React.ReactNode;
}) {
  const gradientId = `${id}-gradient`;
  const shineId = `${id}-shine`;

  return (
    <svg viewBox="0 0 120 120" className="sh-icon" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="112" height="112" rx="16" fill={`url(#${gradientId})`} />
      <rect x="4" y="4" width="112" height="112" rx="16" fill={`url(#${shineId})`} />
      <rect x="4" y="4" width="112" height="112" rx="16" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      <g transform="translate(24 24) scale(0.6)" stroke={ink} fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

function GlyphShein() {
  return <>
    <path d="M22 34h56l-5 46a8 8 0 0 1-8 7H35a8 8 0 0 1-8-7z" />
    <path d="M38 34c0-11 6-18 12-18s12 7 12 18M40 56h20M38 69h24" />
  </>;
}

function GlyphNoon() {
  return <>
    <circle cx="50" cy="44" r="15" />
    <path d="M50 16v8M50 72v-6M22 44h8M78 44h-8M31 25l6 6M69 25l-6 6M20 84h60" />
  </>;
}

function GlyphTemu() {
  return <>
    <path d="M20 40l30-14 30 14v40L50 94 20 80z" />
    <path d="M20 40l30 14 30-14M50 54v40" />
  </>;
}

function GlyphAli() {
  return <>
    <path d="M18 52L82 24 64 86 50 62z" />
    <path d="M50 62L82 24" />
  </>;
}

function GlyphAmazon() {
  return <>
    <path d="M16 24h12l7 42h40l8-28H33" />
    <circle cx="42" cy="82" r="6" />
    <circle cx="74" cy="82" r="6" />
  </>;
}

function GlyphEbay() {
  return <>
    <path d="M52 18H28a8 8 0 0 0-8 8v24a8 8 0 0 0 2.3 5.6l30 30a8 8 0 0 0 11.3 0l22-22a8 8 0 0 0 0-11.3l-30-30A8 8 0 0 0 52 18z" />
    <circle cx="40" cy="38" r="5" />
  </>;
}

const STORE_ICONS: StoreIconConfig[] = [
  { id: "shein", name: "SHEIN", from: "#2B2B2B", to: "#000000", Glyph: GlyphShein },
  { id: "noon", name: "Noon", from: "#FEEE00", to: "#E7B400", ink: "#2A2100", Glyph: GlyphNoon },
  { id: "temu", name: "TEMU", from: "#FF8A1E", to: "#E25C00", Glyph: GlyphTemu },
  { id: "aliexpress", name: "AliExpress", from: "#FF3A1A", to: "#C21400", Glyph: GlyphAli },
  { id: "amazon", name: "Amazon", from: "#2B3A4E", to: "#131A22", Glyph: GlyphAmazon },
  { id: "ebay", name: "eBay", from: "#1E7CE8", to: "#0049A6", Glyph: GlyphEbay },
];

const CUSTOMER_STOREFRONT_CSS = `
/* ================= ثيم /products المستوحى من التصميم المرسل ================= */
.pr-page{
  --cream:#FFFBF5;--gold:#D4AF37;--gold-2:#E8C766;--ink:#1B1408;--muted:#6B5B33;
  position:relative;isolation:isolate;min-height:100dvh;width:100%;overflow-x:hidden;
  direction:rtl;text-align:right;background:var(--cream);
  font-family:'Tajawal','Cairo',system-ui,-apple-system,'Segoe UI',sans-serif;
  color:var(--ink);padding:0 0 80px;
}
.pr-page:before,.pr-page:after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none}
.pr-page:before{background:radial-gradient(620px 300px at 88% -6%,rgba(212,175,55,.16),transparent 62%),radial-gradient(560px 300px at 4% 2%,rgba(248,187,208,.18),transparent 62%),radial-gradient(700px 380px at 50% 108%,rgba(212,175,55,.10),transparent 62%)}
.pr-page:after{opacity:.42;background-image:radial-gradient(1.2px 1.2px at 18% 22%,rgba(212,175,55,.5),transparent),radial-gradient(1.2px 1.2px at 72% 12%,rgba(212,175,55,.35),transparent),radial-gradient(1.2px 1.2px at 42% 62%,rgba(212,175,55,.3),transparent),radial-gradient(1.2px 1.2px at 88% 74%,rgba(212,175,55,.35),transparent);background-size:520px 520px,640px 640px,760px 760px,580px 580px}
.pr-head{position:relative;z-index:1;text-align:center;max-width:980px;margin:0 auto;padding:64px 22px 12px}
.pr-brand{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:900;letter-spacing:1px;color:var(--muted);background:rgba(255,255,255,.82);border:1px solid rgba(212,175,55,.45);border-radius:999px;padding:8px 17px;box-shadow:0 5px 18px rgba(27,20,8,.04);backdrop-filter:blur(8px)}
.pr-brand .dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-2));box-shadow:0 0 12px rgba(212,175,55,.8)}
.pr-title{font-size:clamp(28px,4.4vw,52px);font-weight:900;line-height:1.25;margin:20px 0 12px;color:var(--ink);letter-spacing:-.3px}
.pr-title .grad{background:linear-gradient(120deg,#B8912A,#D4AF37 45%,#F1DA8E);-webkit-background-clip:text;background-clip:text;color:transparent}
.pr-sub{font-size:clamp(14px,1.5vw,18px);font-weight:700;color:var(--muted);max-width:640px;margin:0 auto;line-height:1.9}
.pr-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:26px}
.pr-divider i{display:block;height:1px;width:min(180px,26vw);background:linear-gradient(90deg,transparent,var(--gold))}.pr-divider i:last-child{background:linear-gradient(270deg,transparent,var(--gold))}.pr-divider b{width:9px;height:9px;transform:rotate(45deg);background:var(--gold);box-shadow:0 0 14px rgba(212,175,55,.9)}
.pr-stores{position:relative;z-index:1;max-width:1240px;margin:44px auto 0;padding:0 22px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px}
.pr-store{width:100%;height:220px;cursor:pointer;position:relative;overflow:hidden;background:linear-gradient(150deg,#fff,#FFFBF5);border:1px solid rgba(212,175,55,.8);border-radius:16px;box-shadow:0 8px 22px rgba(212,175,55,.13),0 2px 8px rgba(27,20,8,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:17px;padding:20px 16px;transition:transform .3s cubic-bezier(.22,.7,.3,1),box-shadow .3s ease,border-color .3s ease;text-decoration:none;font-family:inherit}
.pr-store:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(220px 120px at 50% 0%,rgba(212,175,55,.18),transparent 70%);opacity:0;transition:opacity .3s ease}
.pr-store:hover{transform:translateY(-4px);box-shadow:0 20px 38px rgba(212,175,55,.24),0 8px 20px rgba(27,20,8,.1);border-color:#E8C766}.pr-store:hover:before{opacity:1}.pr-store:focus-visible,.pr-banner:focus-visible{outline:3px solid #8B671C;outline-offset:4px}
.pr-store .sh-icon{position:relative;z-index:1;width:96px;height:96px;display:block;padding:8px;box-sizing:border-box;background:#fff;border:1px solid #EFE3C2;border-radius:18px;box-shadow:0 7px 18px rgba(27,20,8,.08);filter:drop-shadow(0 5px 10px rgba(27,20,8,.12));transition:transform .3s ease,box-shadow .3s ease}
.pr-store:hover .sh-icon{transform:scale(1.05);box-shadow:0 12px 25px rgba(27,20,8,.13)}
.pr-store-name{position:relative;z-index:1;color:#6B5B33;font-size:15px;font-weight:900;letter-spacing:.4px}.pr-store-go{position:absolute;top:12px;left:14px;z-index:2;color:#B8912A;font-size:18px;opacity:0;transition:opacity .2s ease}.pr-store:hover .pr-store-go,.pr-store:focus-visible .pr-store-go{opacity:1}
.pr-banners{position:relative;z-index:1;max-width:1240px;margin:34px auto 0;padding:0 22px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
.pr-banner{position:relative;min-height:300px;overflow:hidden;border-radius:18px;padding:36px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:14px;text-align:right;text-decoration:none;transition:transform .25s ease,box-shadow .25s ease}.pr-banner:hover{transform:translateY(-3px)}
.pr-sale{background:linear-gradient(135deg,#F8BBD0,#F5A6BF);color:#7A2140;box-shadow:0 16px 40px rgba(248,187,208,.48)}.pr-sale:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(400px 220px at 88% 10%,rgba(255,255,255,.6),transparent 60%),radial-gradient(300px 200px at 10% 100%,rgba(255,255,255,.35),transparent 60%)}
.pr-exclusive{background:linear-gradient(135deg,#17130F,#050505);color:#D4AF37;box-shadow:0 16px 40px rgba(0,0,0,.32);border:1px solid rgba(212,175,55,.4)}.pr-exclusive:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(115deg,rgba(212,175,55,.12) 0 1px,transparent 1px 22px);mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.15));-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.15))}
.pr-banner-icon{position:absolute;top:16px;left:22px;z-index:1;font-size:48px;opacity:.65;pointer-events:none}.pr-badge{position:relative;z-index:1;display:inline-flex;align-items:center;border-radius:999px;background:#fff;color:#E0447D;padding:8px 18px;font-size:15px;font-weight:900;box-shadow:0 6px 16px rgba(224,68,125,.18)}
.pr-banner h2{position:relative;z-index:1;margin:2px 0;font-size:clamp(24px,3vw,36px);font-weight:900}.pr-banner p{position:relative;z-index:1;max-width:430px;margin:0;font-size:15px;font-weight:700;line-height:1.9;opacity:.88}.pr-cta{position:relative;z-index:1;display:inline-flex;align-items:center;gap:10px;margin-top:3px;border-radius:999px;background:#fff;color:#E0447D;padding:12px 24px;font-size:14px;font-weight:900;box-shadow:0 10px 24px rgba(224,68,125,.2)}.pr-exclusive .pr-cta{background:linear-gradient(135deg,#B8912A,#D4AF37 45%,#F1DA8E);color:#1B1408;box-shadow:0 10px 26px rgba(212,175,55,.28)}
/* شريط علوي وسفلي متناسقان مع هوية المتجر */
.pr-topbar{position:relative;z-index:2;width:100%;background:rgba(255,255,255,.88);border-bottom:1px solid rgba(212,175,55,.34);box-shadow:0 4px 18px rgba(27,20,8,.045);backdrop-filter:blur(12px)}
.pr-topbar-inner{max-width:1240px;min-height:70px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.pr-logo{display:inline-flex;align-items:center;gap:11px;color:var(--ink)}
.pr-logo-mark{width:40px;height:40px;display:grid;place-items:center;flex:none;border-radius:13px;background:linear-gradient(135deg,#B8912A,#D4AF37 48%,#F1DA8E);color:#1B1408;font-size:17px;font-weight:900;box-shadow:0 5px 14px rgba(184,145,42,.22)}
.pr-logo-copy{display:flex;flex-direction:column;gap:2px}
.pr-logo-copy strong{font-size:13px;letter-spacing:.7px;font-weight:900;color:#3B2E12}
.pr-logo-copy small{font-size:11px;font-weight:700;color:var(--muted)}
.pr-topbar-note{color:var(--muted);font-size:13px;font-weight:700}
.pr-footer{position:relative;z-index:1;margin-top:54px;border-top:1px solid rgba(212,175,55,.34);background:rgba(255,255,255,.68)}
.pr-footer-inner{max-width:1240px;min-height:68px;margin:0 auto;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;font-weight:700}
.pr-footer-brand{color:#3B2E12;font-weight:900;letter-spacing:.3px}
@media(max-width:1080px){.pr-stores{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.pr-topbar-inner{min-height:62px;padding:10px 14px}.pr-logo-mark{width:36px;height:36px}.pr-logo-copy strong{font-size:11px}.pr-logo-copy small{font-size:10px}.pr-topbar-note{max-width:125px;font-size:11px;text-align:left}.pr-head{padding-top:38px}.pr-stores{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:0 14px}.pr-store{height:200px;padding:18px 12px}.pr-store .sh-icon{width:88px;height:88px}.pr-banners{grid-template-columns:1fr;gap:16px;padding:0 14px}.pr-banner{min-height:260px;padding:28px 22px}.pr-footer{margin-top:38px}.pr-footer-inner{min-height:60px;padding:14px;flex-direction:column;justify-content:center;gap:5px;text-align:center;font-size:11px}}
@media(prefers-reduced-motion:reduce){.pr-store,.pr-store .sh-icon,.pr-banner{transition:none}}

`;

function CustomerStorefront() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const savedLinks: unknown = JSON.parse(localStorage.getItem("store_links") || "{}");
      const savedVisibility: unknown = JSON.parse(localStorage.getItem("store_visibility") || "{}");
      setLinks(savedLinks && typeof savedLinks === "object" ? savedLinks as Record<string, string> : {});
      setVisibility(savedVisibility && typeof savedVisibility === "object" ? savedVisibility as Record<string, boolean> : {});
    } catch {
      setLinks({});
      setVisibility({});
    }
  }, []);

  const visibleStores = INTERNATIONAL_STORES.filter((store) => visibility[store.id] !== false);
  const storeIds = new Set<string>(visibleStores.map((store) => store.id));
  const visibleIconStores = STORE_ICONS.filter((store) => storeIds.has(store.id));
  const offerStores = visibleStores.filter((store) => store.id === "discounts" || store.id === "exclusive");

  const getExternalStoreUrl = (storeId: string, fallback: string) => {
    const candidate = links[storeId]?.trim();
    return candidate && /^https?:\/\//i.test(candidate) ? candidate : fallback;
  };

  return (
    <main dir="rtl" lang="ar" className="pr-page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CUSTOMER_STOREFRONT_CSS }} />

      <div className="pr-topbar" role="banner">
        <div className="pr-topbar-inner">
          <div className="pr-logo" aria-label="الشامل للتسوق">
            <span className="pr-logo-mark" aria-hidden="true">ش</span>
            <span className="pr-logo-copy">
              <strong>YOUR GLOBAL SHOPPER</strong>
              <small>السوق الشامل</small>
            </span>
          </div>
          <span className="pr-topbar-note">تسوقك العالمي في مكان واحد</span>
        </div>
      </div>

      <header className="pr-head">
        <h1 className="pr-title">السوق الشامل <span className="grad">منتجات دولية</span></h1>
        <p className="pr-sub">كل منتجاتك العالمية في مكان واحد • تسوق الآن من أشهر المتاجر</p>
        <div className="pr-divider" aria-hidden="true"><i /><b /><i /></div>
      </header>

      <section id="store-links" className="pr-stores" aria-label="بوابات المتاجر العالمية">
        {visibleIconStores.map(({ id, name, from, to, ink, Glyph }) => {
          const store = INTERNATIONAL_STORES.find((item) => item.id === id);
          const url = getExternalStoreUrl(id, store?.fallback ?? "https://www.google.com");
          return (
            <a
              key={id}
              className="pr-store"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`تسوق من ${name}، يفتح في تبويب جديد`}
              title={`تسوق من ${name}`}
            >
              <span className="pr-store-go" aria-hidden="true">↗</span>
              <IconShell id={`store-${id}`} from={from} to={to} {...(ink ? { ink } : {})}>
                <Glyph />
              </IconShell>
              <span className="pr-store-name">{name}</span>
            </a>
          );
        })}
      </section>

      {offerStores.length > 0 && (
        <section className="pr-banners" aria-label="العروض المميزة">
          {offerStores.map((store) => {
            const exclusive = store.id === "exclusive";
            const offerPath = exclusive ? "/exclusive" : "/deals";
            return (
              <a
                id={store.id}
                key={store.id}
                className={`pr-banner ${exclusive ? "pr-exclusive" : "pr-sale"}`}
                href={offerPath}
                aria-label={`تصفح ${store.name}`}
              >
                <span className="pr-banner-icon" aria-hidden="true">{exclusive ? "👑" : "🌹"}</span>
                {exclusive ? <span className="pr-badge">EXCLUSIVE</span> : <span className="pr-badge">حتى 70%</span>}
                <h2>{exclusive ? store.name : "تخفيضات حتى 70%"}</h2>
                <p>{exclusive ? "عروض محدودة على المنتجات الفاخرة والمختارة" : "على منتجات مختارة من المتاجر العالمية"}</p>
                <span className="pr-cta">
                  تصفح العروض
                  <span aria-hidden="true">←</span>
                </span>
              </a>
            );
          })}
        </section>
      )}

      <footer className="pr-footer">
        <div className="pr-footer-inner">
          <span className="pr-footer-brand">YOUR GLOBAL SHOPPER · السوق الشامل</span>
          <span>تسوق عالمي أسهل، من مكان واحد</span>
        </div>
      </footer>
    </main>
  );
}

export const ProductsPage: React.FC<ProductsRouteProps> = ({
  onBack,
  onNavigateToOrder,
  onNavigateToTracker,
  onNavigateToAdmin,
}) => {
  // Navigation & Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<
    "SAR" | "YER_SANAA" | "YER_ADEN" | "USD"
  >("SAR");

  // Quick Amount Adjuster & Order Modal State
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ProductItem | null>(null);
  const [orderAmountSAR, setOrderAmountSAR] = useState<number>(100);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [paymentSplit, setPaymentSplit] = useState<"half" | "full">("half");
  const [paymentMethod, setPaymentMethod] = useState<string>("كريمي");
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<{ product: ProductItem; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const goToOrder = (storeCode?: string, productName?: string) => {
    if (onNavigateToOrder) {
      onNavigateToOrder(storeCode, productName);
      return;
    }

    const params = new URLSearchParams();
    if (storeCode) params.set("store", storeCode);
    if (productName) params.set("productName", productName);
    const query = params.toString();
    window.location.assign(`/new-order${query ? `?${query}` : ""}`);
  };

  type CatalogProduct = {
    id: string;
    name: string;
    sku: string | null;
    store_id: string | null;
    quantity: number | null;
    sell_price: number | null;
    created_at: string | null;
  };

  const [customerStoreUrls, setCustomerStoreUrls] = useState<Record<string, string>>({});
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("your-global-shopper.admin-logos.v1");
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(parsed)) return;
      const urls = Object.fromEntries(
        parsed
          .filter((item): item is { slug: string; customerUrl?: string } => Boolean(item && typeof item === "object" && "slug" in item && typeof item.slug === "string"))
          .filter((item) => typeof item.customerUrl === "string" && /^https:\/\//i.test(item.customerUrl))
          .map((item) => [item.slug, item.customerUrl as string]),
      );
      setCustomerStoreUrls(urls);
    } catch {
      setCustomerStoreUrls({});
    }
  }, []);
  const [storefrontProducts, setStorefrontProducts] = useState<StorefrontProduct[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const loadCatalogProducts = useCallback(async () => {
    const [{ data, error }, { data: managed, error: managedError }] = await Promise.all([
      db.from("products").select("id,name,sku,store_id,quantity,sell_price,created_at").order("created_at", { ascending: false }),
      db.from("storefront_products").select("id,name,price,image_url,storefront_sites!inner(name)").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);
    if (error) {
      setCatalogError(`تعذر تحميل المنتجات المحفوظة: ${error.message}`);
    } else {
      setCatalogProducts((data ?? []) as CatalogProduct[]);
    }
    if (managedError) {
      setCatalogError((current) => current || `تعذر تحميل منتجات المواقع: ${managedError.message}`);
    } else {
      setStorefrontProducts((managed ?? []).map((item: any) => ({
        id: `managed-${item.id}`,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        site_name: item.storefront_sites?.name ?? "متجر",
      })));
    }
  }, []);

  useEffect(() => {
    void loadCatalogProducts();
  }, [loadCatalogProducts]);

  // أسعار الصرف التقريبية في السوق اليمني
  const exchangeRates = {
    SAR: 1,
    YER_SANAA: 140, // 1 ر.س = 140 ر.ي (صنعاء)
    YER_ADEN: 535, // 1 ر.س = 535 ر.ي (عدن)
    USD: 0.27, // 1 ر.س = 0.27 دولار
  };

  const formatPrice = (amountSAR: number, currency = selectedCurrency) => {
    const rate = exchangeRates[currency];
    const val = amountSAR * rate;
    if (currency === "USD") return `$${val.toFixed(2)}`;
    if (currency === "SAR") return `${Math.round(val)} ر.س`;
    return `${Math.round(val).toLocaleString()} ر.ي`;
  };

  // =========================================================================
  // 🌟 البطائق الست الرئيسية للمتاجر العالمية (حسب طلب العميل)
  // 1. شي إن | 2. أمازون | 3. علي بابا | 4. خصومات 50% | 5. علي إكسبريس | 6. ترينديول
  // =========================================================================
  const sixPlatforms: StorePlatform[] = [
  {
    id: "plat-1-shein",
    externalUrl: "https://ar.shein.com",
    code: "SHEIN",
      name: "شي إن - SHEIN",
      englishName: "Fashion & Style",
      badge: "الوسيط رقم #1 في اليمن 👑",
      badgeColor: "bg-slate-900 text-white",
      discountTag: "كوبون خصم 20%",
      couponCode: "SHEIN20",
      image:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
      orderCount: "38,400+ طلب مشحون",
      features: ["تجميع طلبات ذكي", "فحص المقاس والجودة", "شحن جوي سريع"],
    },
    {
      id: "plat-2-amazon",
      code: "Amazon",
      name: "أمازون - Amazon",
      englishName: "Prime Tech & Brands",
      badge: "أصلي 100% ومضمون 🛡️",
      badgeColor: "bg-amber-400 text-slate-950",
      discountTag: "أسعار أمازون برايم",
      couponCode: "AMZ-PRIME",
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
      orderCount: "24,100+ طلب منجز",
      features: ["تغليف أصلي ضد الكسر", "إلكترونيات وعطور أصلية", "تتبع شحنة مبا��ر"],
    },
    {
      id: "plat-3-alibaba",
      code: "Alibaba",
      name: "علي بابا - Alibaba",
      englishName: "Wholesale & Factories",
      badge: "استيراد بأسعار المصانع 🏭",
      badgeColor: "bg-orange-600 text-white",
      discountTag: "أسعار الجملة للتجار",
      couponCode: "ALI-BABA",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      orderCount: "12,900+ شحنة تجارية",
      features: ["شحن حاويات بحري وجوي", "تجميع بمستودع كوانزو", "تخليص جمركي متكامل"],
    },
    {
      id: "plat-4-discounts",
      code: "Discounts",
      name: "خصومات وتصفيات 50%",
      englishName: "Mega 50% OFF Sale",
      badge: "عروض نصف السعر 🔥",
      badgeColor: "bg-rose-600 text-white animate-pulse",
      discountTag: "خصم حقيقي 50%",
      couponCode: "SAVE50",
      image:
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
      orderCount: "45,800+ كوبون مستخدم",
      features: ["تطبيق كود الخصم الأقوى", "اقتناص السعر الأرخص", "توفير نصف القيمة"],
    },
    {
      id: "plat-5-aliexpress",
      externalUrl: "https://www.aliexpress.com",
      code: "AliExpress",
      name: "علي إكسبريس - AliExpress",
      englishName: "Retail Factory Prices",
      badge: "ملايين السلع بسعر التكلفة ⚡",
      badgeColor: "bg-red-600 text-white",
      discountTag: "شراء قطاعي واقتصادي",
      couponCode: "ALI-EXPRESS",
      image:
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80",
      orderCount: "31,700+ طلب قطاعي",
      features: ["شحن اقتصادي مجمع", "ابتكارات ذكية وأدوات", "سعر المصنع بالقطعة"],
    },
    {
      id: "plat-6-trendyol",
      code: "Trendyol",
      name: "ترينديول ومواقع العالم",
      englishName: "Global Brands & Turkish Fashion",
      badge: "أي موقع بالعالم نشتري منه 🌍",
      badgeColor: "bg-indigo-600 text-white",
      discountTag: "ماركات تركية وعالمية",
      couponCode: "GLOBAL-SHIP",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
      orderCount: "19,300+ طلب عالمي",
      features: ["شراء من أي رابط دولي", "قطنيات فاخرة ومكملات", "توصيل لباب بيتك"],
    },
  ];

  // =========================================================================
  // 🌟 منتجات الكتالوج المتنوعة الجاهزة للطلب السريع
  // =========================================================================
  const initialProducts: ProductItem[] = [
    {
      id: "p-1",
      store: "SHEIN",
      title: "فستان سهرة فرنسي فاخر بتطريز لؤلؤي راقي",
      category: "أزياء نسائية",
      priceSAR: 120,
      oldPriceSAR: 180,
      rating: 4.9,
      reviewsCount: 340,
      image:
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80",
      badge: "الأكثر طلباً 🔥",
      inStock: true,
      features: ["خامة عالية الجودة", "مقاسات دقيقة", "شحن مجاني"],
    },
    {
      id: "p-2",
      store: "SHEIN",
      title: "طقم أطفال قطني مريح للمناسبات والأعياد",
      category: "أطفال ورضع",
      priceSAR: 65,
      oldPriceSAR: 95,
      rating: 4.8,
      reviewsCount: 215,
      image:
        "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&auto=format&fit=crop&q=80",
      badge: "خصم 30%",
      inStock: true,
      features: ["قطن 100%", "مريح ولطيف", "غسيل يدوي وآلي"],
    },
    {
      id: "p-3",
      store: "Amazon",
      title: "سماعات بلوتوث لاسلكية عازلة للضوضاء برو ANC",
      category: "إلكترونيات",
      priceSAR: 195,
      oldPriceSAR: 290,
      rating: 4.9,
      reviewsCount: 1420,
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      badge: "أصلي 100% 🛡️",
      inStock: true,
      features: ["بطارية تدوم 40 ساعة", "شحن سريع Type-C", "ضمان استبدال"],
    },
    {
      id: "p-4",
      store: "Amazon",
      title: "ساعة ذكية لمتابعة اللياقة والنبض وشاشة AMOLED",
      category: "ساعات وأجهزة",
      priceSAR: 145,
      oldPriceSAR: 220,
      rating: 4.7,
      reviewsCount: 880,
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      badge: "أمازون برايم",
      inStock: true,
      features: ["مقاومة للماء IP68", "تدعم اللغة العربية", "إشعارات المكالمات"],
    },
    {
      id: "p-5",
      store: "Alibaba",
      title: "كرتون كابلات شحن سريع بالجملة (100 حبة للمحلات)",
      category: "تجارة وجملة",
      priceSAR: 320,
      oldPriceSAR: 480,
      rating: 4.9,
      reviewsCount: 190,
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80",
      badge: "سعر المصنع 🏭",
      inStock: true,
      features: ["شحن سريع 65W", "جودة تجارية موثوقة", "تغليف بيع بالتجزئة"],
    },
    {
      id: "p-6",
      store: "Discounts",
      title: "حقيبة يد جلدية كلاسيكية مع محفظة يد نسائية فاخرة",
      category: "حقائب وإكسسوارات",
      priceSAR: 85,
      oldPriceSAR: 170,
      rating: 4.8,
      reviewsCount: 412,
      image:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80",
      badge: "نصف السعر 50% 🔥",
      inStock: true,
      features: ["جلد صناعي فاخر", "سعة واسعة", "ألوان متناسقة"],
    },
    {
      id: "p-7",
      store: "AliExpress",
      title: "جهاز مساج الرقبة والظهر الذكي المحمول بالحرارة",
      category: "صحة وعناية",
      priceSAR: 75,
      oldPriceSAR: 125,
      rating: 4.6,
      reviewsCount: 650,
      image:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
      badge: "ترند تيك توك ⚡",
      inStock: true,
      features: ["3 مستويات تدليك", "تسخين حراري مهدئ", "شحن USB"],
    },
    {
      id: "p-8",
      store: "Trendyol",
      title: "عباية تركية قطنية راقية بتطريز يدوي أنيق",
      category: "أزياء تركية",
      priceSAR: 160,
      oldPriceSAR: 230,
      rating: 4.9,
      reviewsCount: 290,
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80",
      badge: "صنع في تركيا 🇹🇷",
      inStock: true,
      features: ["قطن تركي أصلي", "قصة واسعة مريحة", "طرحة متناسقة مجاناً"],
    },
  ];

  // تصفية المنتجات حسب البحث والمتجر والفئة
  const filteredProducts = useMemo(() => {
    const managedProducts: ProductItem[] = storefrontProducts.map((product) => ({
      id: product.id,
      store: "الشامل",
      title: product.name,
      category: product.site_name,
      priceSAR: Number(product.price ?? 0),
      rating: 5,
      reviewsCount: 0,
      image: product.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      badge: `من ${product.site_name}`,
      inStock: true,
    }));

    const savedProducts: ProductItem[] = catalogProducts.map((product) => ({
      id: product.id,
      store: "الشامل",
      title: product.name,
      category: "منتجات الشامل",
      priceSAR: Number(product.sell_price ?? 0),
      rating: 0,
      reviewsCount: 0,
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80",
      badge: Number(product.quantity ?? 0) > 0 ? "متوفر" : "غير متوفر",
      inStock: Number(product.quantity ?? 0) > 0,
      ...(product.sku ? { sku: product.sku } : {}),
      quantity: Number(product.quantity ?? 0),
      inventoryProduct: true,
    }));

    return [...managedProducts, ...savedProducts, ...initialProducts].filter((p) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStore = selectedStoreFilter === "all" || p.store === selectedStoreFilter;
      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchStore && matchCategory;
    });
  }, [catalogProducts, storefrontProducts, searchQuery, selectedStoreFilter, selectedCategory]);

  const categoriesList = [
    "all",
    "أزياء نسائية",
    "إلكترونيات",
    "أطفال ورضع",
    "ساعات وأجهزة",
    "تجارة وجملة",
    "حقائب وإكسسوارات",
    "صحة وعناية",
    "أزياء تركية",
  ];

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    playPhoneNotificationSound();
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const handleCopyAccountNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedAccount(num);
    playPhoneNotificationSound();
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleOpenOrderModal = (product: ProductItem) => {
    playDismissClickSound();
    setSelectedProductForOrder(product);
    setOrderAmountSAR(product.priceSAR);
    setOrderQuantity(1);
    setPaymentSplit("half");
  };

  const handleAddToCart = (product: ProductItem) => {
    playPhoneNotificationSound();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const cartTotalSAR = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.priceSAR * item.quantity, 0);
  }, [cartItems]);

  const handleSendWhatsAppOrder = () => {
    if (!selectedProductForOrder) return;
    const totalSAR = orderAmountSAR * orderQuantity;
    const dueNowSAR = paymentSplit === "half" ? Math.ceil(totalSAR * 0.5) : totalSAR;
    const remainingSAR = paymentSplit === "half" ? Math.floor(totalSAR * 0.5) : 0;

    const message =
      `السلام عليكم، أرغب بطلب شراء السلعة التالية عبر *الشامل للتسوق*:\n` +
      `▪️ اسم المنتج: ${selectedProductForOrder.title}\n` +
      `▪️ المتجر المعتمد: ${selectedProductForOrder.store}\n` +
      `▪️ الكمية: ${orderQuantity}\n` +
      `▪️ الإجمالي: ${totalSAR} ر.س (${formatPrice(totalSAR)})\n` +
      `▪️ نظام السداد: ${paymentSplit === "half" ? "عربون 50% مقدم والباقي عند الاستلام" : "سداد كامل 100%"}\n` +
      `▪️ المبلغ المطلوب تحويله الآن: ${dueNowSAR} ر.س (${formatPrice(dueNowSAR)})\n` +
      (remainingSAR > 0 ? `▪️ المبلغ المتبقي عند الاستلام: ${remainingSAR} ر.س\n` : "") +
      `▪️ طريقة الدفع المختارة: ${paymentMethod}\n\nيرجى تأكيد الحساب للتحويل والمباشرة بالطلب. شكراً!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/967773370041?text=${encoded}`, "_blank");
  };

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#005696] selection:text-white pb-24"
      dir="rtl"
    >
      {/* 🌟 1. رأس الصفحة الرسمي */}
      <header className="border-b border-slate-200 bg-white px-3 py-3 sm:px-6" dir="rtl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <a
            href="/products"
            className="flex items-center gap-2.5"
            aria-label="الشامل للتسوق - الصفحة الرئيسية"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#005696]">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-black text-[#005696] sm:text-xl">
                الشامل للتسوق
              </span>
              <span className="block text-[9px] font-bold tracking-[0.2em] text-[#005696]">
                AL SHAMEL SHOPPING
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            {onNavigateToTracker && (
              <button
                type="button"
                onClick={onNavigateToTracker}
                className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex"
              >
                تتبع الطلب
              </button>
            )}
            {onNavigateToAdmin && (
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex"
              >
                الإدارة
              </button>
            )}
            <button
              type="button"
              onClick={() => goToOrder("SHEIN")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#005696] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0F4C81]"
            >
              اطلب الآن <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 2. شريط البحث والعملة وأزرار الفلترة السريعة */}
      <section className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* خانة البحث السريع */}
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج، متجر، أو فئة معينة..."
              className="w-full pr-9 pl-8 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#005696] focus:ring-2 focus:ring-[#005696]/15 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* محول العملات وسلة المشتريات */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* اختيار العملة */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <span className="text-[11px] text-slate-500 px-1">العملة:</span>
              {[
                { id: "SAR", label: "ر.س" },
                { id: "YER_SANAA", label: "صنعاء" },
                { id: "YER_ADEN", label: "عدن" },
                { id: "USD", label: "$" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCurrency(c.id as any)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                    selectedCurrency === c.id
                      ? "bg-white text-[#005696] shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* زر السلة */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-[#005696] text-white hover:bg-[#0F4C81] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-black hidden sm:inline">السلة</span>
              {cartItems.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 🌟 3. قسم بطائق المتاجر الست الرئيسية (Underneath Header) */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 pb-3">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#005696] text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                بوابات المتاجر الست المعتمدة للشراء والشحن
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                اختر متجرك للفلترة السريعة وتطبيق كوبونات الخصم الحصرية
              </p>
            </div>
          </div>

          {selectedStoreFilter !== "all" && (
            <button
              onClick={() => setSelectedStoreFilter("all")}
              className="text-xs font-bold text-[#005696] hover:underline cursor-pointer"
            >
              عرض الكل (إلغاء الفلتر)
            </button>
          )}
        </div>

        {/* شبكة البطاقات الست */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
  {sixPlatforms.map((plat, idx) => {
  const storeSlug = plat.code === "AliExpress" ? "aliexpress" : plat.code.toLowerCase();
  const customerUrl = customerStoreUrls[storeSlug] ?? plat.externalUrl;
  const isSelected = selectedStoreFilter === plat.code;
            return (
              <div
                key={plat.id}
                onClick={() => setSelectedStoreFilter(isSelected ? "all" : plat.code)}
                className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col cursor-pointer active:scale-95 ${
                  isSelected
                    ? "border-[#005696] ring-2 ring-[#005696]/20 bg-sky-50/50 shadow-md"
                    : "border-slate-200 bg-white hover:border-[#005696] hover:shadow-sm"
                }`}
              >
                {/* صورة البطاقة */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  <img
                    src={plat.image}
                    alt={plat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* رقم البطاقة */}
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold flex items-center justify-center border border-white/20">
                    {idx + 1}
                  </span>

                  {/* وسام الخصم */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                    {plat.discountTag}
                  </span>

                  {/* العنوان داخل الصورة */}
                  <span className="absolute bottom-1.5 right-1.5 left-1.5 text-white font-black text-xs leading-tight line-clamp-1 drop-shadow-sm">
                    {plat.name}
                  </span>
                </div>

                {/* كود الخصم وزر الطلب السريع */}
                <div className="p-2 space-y-1 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCoupon(plat.couponCode);
                    }}
                    className="w-full py-1 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-mono font-bold text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedCoupon === plat.couponCode ? (
                      <span className="text-emerald-600 font-bold">تم النسخ ✓</span>
                    ) : (
                      <>
                        <Tag className="w-2.5 h-2.5 text-amber-500" />
                        <span>{plat.couponCode}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToOrder(plat.code);
                    }}
                    className="w-full py-1 px-1 rounded-lg bg-[#005696] hover:bg-[#084273] text-white text-[10px] font-black transition cursor-pointer"
                  >
                    اطلب الآن
                  </button>
  {customerUrl && (
  <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(customerUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-1 py-1 text-[10px] font-bold text-slate-600 transition hover:border-[#005696] hover:text-[#005696]"
                    >
                      تصفح {plat.code}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🌟 4. شريط الأقسام السريعة */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">الفئات:</span>
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-2xs font-black"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat === "all" ? "جميع الأقسام" : cat}
          </button>
        ))}
      </section>

      {/* 🌟 5. شبكة المنتج��ت (Products Grid) */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 space-y-4">
        {catalogError && (
          <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
            {catalogError}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>عرض {filteredProducts.length} منتج متوفر للشحن الفوري</span>
          {selectedStoreFilter !== "all" && (
            <span className="text-[#005696]">مصفى لمتجر: {selectedStoreFilter}</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => (
            <article
              key={prod.id}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-[#005696] shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* صورة المنتج */}
              <div className="relative aspect-square overflow-hidden bg-slate-50">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {prod.badge && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-xs">
                    {prod.badge}
                  </span>
                )}

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[9.5px] font-mono font-bold">
                  {prod.store}
                </span>
              </div>

              {/* تفاصيل المنتج */}
              <div className="p-3.5 space-y-2 text-right flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mb-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{prod.rating}</span>
                    <span className="text-slate-400 font-normal">({prod.reviewsCount})</span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 hover:text-[#005696] transition-colors">
                    {prod.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                        {formatPrice(prod.priceSAR)}
                      </span>
                      {prod.oldPriceSAR && (
                        <span className="text-xs text-slate-400 line-through mr-1.5 font-mono">
                          {formatPrice(prod.oldPriceSAR)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {prod.category}
                    </span>
                  </div>

                  {/* أزرار الإجراءات: شراء سريع + إضافة للسلة */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenOrderModal(prod)}
                      className="py-2 px-2 rounded-xl bg-gradient-to-r from-[#005696] to-[#0F4C81] hover:from-[#084273] hover:to-[#0A2540] text-white text-xs font-black transition cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span>حاسبة وشراء</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(prod)}
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>إضافة للسلة</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* 🌟 6. نافذة تفاعلية: حاسبة وتعديل المبلغ المالي وخيارات السداد */}
      {selectedProductForOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4 p-5 sm:p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#005696] flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    تعديل وحاسبة المبلغ: {selectedProductForOrder.title}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-bold">
                    المتجر: {selectedProductForOrder.store} | عمولة 0%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* تعديل الكمية وسعر القطعة */}
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-slate-600">سعر السلعة (ر.س):</label>
                <input
                  type="number"
                  min="1"
                  value={orderAmountSAR}
                  onChange={(e) => setOrderAmountSAR(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-center font-bold text-sm focus:outline-none focus:border-[#005696]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600">الكمية المطلوبة:</label>
                <div className="flex items-center justify-between border border-slate-300 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm">{orderQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setOrderQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* نظام توزيع السداد: عربون 50% أو كامل */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                خيارات توزيع المبلغ والسداد:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentSplit("half")}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer ${
                    paymentSplit === "half"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-black"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-black text-emerald-700">✨ عربون 50% مقدم</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    سدد النصف الآن والباقي عند الاستلام
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentSplit("full")}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer ${
                    paymentSplit === "full"
                      ? "border-[#005696] bg-sky-50 text-[#005696] font-black"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-black text-[#005696]">💳 سداد كامل (100%)</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    دفع القيمة كاملة لسرعة التجهيز
                  </span>
                </button>
              </div>
            </div>

            {/* تفاصيل المبالغ المحسوبة */}
            <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>إجمالي الطلب ({orderQuantity} قطع):</span>
                <span className="font-mono font-bold text-white">
                  {orderAmountSAR * orderQuantity} ر.س (
                  {formatPrice(orderAmountSAR * orderQuantity)})
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-black text-sm pt-1 border-t border-slate-800">
                <span>المبلغ المطلوب سداده الآن:</span>
                <span className="font-mono text-base">
                  {paymentSplit === "half"
                    ? Math.ceil(orderAmountSAR * orderQuantity * 0.5)
                    : orderAmountSAR * orderQuantity}{" "}
                  ر.س
                </span>
              </div>
              {paymentSplit === "half" && (
                <div className="flex items-center justify-between text-amber-300 text-xs">
                  <span>المتبقي عند المعاينة والاستلام:</span>
                  <span className="font-mono font-bold">
                    {Math.floor(orderAmountSAR * orderQuantity * 0.5)} ر.س
                  </span>
                </div>
              )}
            </div>

            {/* طريقة الدفع المعتمدة */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">طريقة الدفع والحساب:</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                {["كريمي", "ون كاش", "النجم", "جيب", "استلام", "USDT"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 px-2 rounded-xl border text-center transition cursor-pointer ${
                      paymentMethod === m
                        ? "bg-slate-900 text-white border-slate-900 font-black"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {m === "كريمي"
                      ? "🏦 الكريمي"
                      : m === "ون كاش"
                        ? "📱 ون كاش"
                        : m === "النجم"
                          ? "💸 الن��م"
                          : m === "جيب"
                            ? "🪙 جيب"
                            : m === "استلام"
                              ? "🤝 عند الاستلام"
                              : "⚡ USDT"}
                  </button>
                ))}
              </div>

              {/* بطاقة الحساب المعتمد */}
              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold">
                    رقم الحساب المعتمد:
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {paymentMethod === "كريمي"
                      ? "3007123456"
                      : paymentMethod === "ون كاش"
                        ? "777000111"
                        : "الشامل للتسوق"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyAccountNumber(paymentMethod === "كريمي" ? "3007123456" : "777000111")
                  }
                  className="px-2.5 py-1 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1 shadow-2xs"
                >
                  {copiedAccount ? "تم النسخ ✓" : "نسخ"}
                </button>
              </div>
            </div>

            {/* أزرار الإجراء عبر واتساب */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendWhatsAppOrder}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال تفاصيل السداد والطلب عبر واتساب 📲</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const product = selectedProductForOrder;
                  setSelectedProductForOrder(null);
                  if (product) goToOrder(product.store, product.title);
                }}
                className="py-3 px-3.5 rounded-xl bg-[#005696] hover:bg-[#084273] text-white font-black text-xs transition cursor-pointer"
              >
                صف��ة الطلب ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 7. سلة المشتريات الجانبية */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-start"
          dir="rtl"
        >
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-4 sm:p-5 text-right animate-slideIn">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#005696]" />
                  <h3 className="font-black text-base text-slate-900">سلة المشتريات</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto stroke-1" />
                  <p className="text-sm font-bold">سلتك فارغة حالياً</p>
                </div>
              ) : (
                <div className="py-3 space-y-3 max-h-[60vh] overflow-y-auto">
                  {cartItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-2xl border border-slate-200"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-14 h-14 object-cover rounded-xl"
                      />
                      <div className="flex-1 text-right">
                        <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                          {item.product.title}
                        </h4>
                        <span className="text-xs font-mono font-black text-emerald-700">
                          {formatPrice(item.product.priceSAR * item.quantity)}
                        </span>
                        <div className="text-[10px] text-slate-500 font-bold">
                          الكمية: {item.quantity}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setCartItems((prev) =>
                            prev.filter((i) => i.product.id !== item.product.id),
                          )
                        }
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>إجمالي السلة:</span>
                  <span className="text-emerald-700 font-mono">{formatPrice(cartTotalSAR)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (cartItems.length !== 1) {
                      window.alert(
                        "نموذج الطلب الحالي يستقبل منتجًا واحدًا. أرسل كل منتج كطلب مستقل حتى لا تُحذف عناصر من السلة.",
                      );
                      return;
                    }
                    const item = cartItems[0];
                    if (!item) return;
                    setIsCartOpen(false);
                    goToOrder(item.product.store, item.product.title);
                  }}
                  className="w-full py-3 rounded-xl bg-[#005696] hover:bg-[#084273] text-white font-black text-xs transition cursor-pointer"
                >
                  إتمام الشراء الآن ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * شاشة بديلة قديمة محفوظة للتوافق؛ صفحة العملاء تعرض الآن الكتالوج الكامل وبطاقات المتاجر.
 */
const CustomerProductsHiddenPage: React.FC = () => (
  <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div
        aria-hidden="true"
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl"
      >
        🛍️
      </div>
      <h1 className="text-2xl font-black text-slate-900">الشامل للتسوق</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
        لا توجد منتجات أو عروض معروضة حاليًا.
      </p>
    </section>
  </main>
);

/**
 * يعرض الكتالوج للعملاء على /products، ويُبقي صفحات الإدارة الفرعية
 * مثل /products/manage داخل Outlet.
 */
const ProductsRouteEntry: React.FC = () => {
  const pathname = useLocation({ select: (location) => location.pathname });

  if (pathname === "/products/manage") {
    return <Outlet />;
  }

  return <CustomerStorefront />;
};

export const Route = createFileRoute("/products")({
  component: ProductsRouteEntry,
});

export default ProductsPage;
