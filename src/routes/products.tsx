import React, { useState, useMemo, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useSession } from "@/hooks/use-session";
import { createFileRoute, Outlet, useLocation, Link } from "@tanstack/react-router";
import { readCart } from "@/lib/extension-cart";
import { supabase } from "@/integrations/supabase/client";

import { readableTextOn, resolveCardColors, safeImageUrl } from "@/lib/offer-card-style";
import { getSignedProductImage } from "@/lib/merchant-marketplace";

const db = supabase as any;

async function loadCurrentMerchantStore() {
  const { data, error } = await db.rpc("merchant_get_my_store");
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

type BestSellingProduct = {
  product_id: string;
  store_id: string;
  title: string;
  image_path: string;
  price: number;
  currency: "YER" | "SAR" | "USD";
  quantity_sold: number;
  image_url: string | null;
};

async function loadBestSellingProducts(): Promise<BestSellingProduct[]> {
  const { data, error } = await db.rpc("marketplace_get_best_selling_products", { _limit: 12 });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row: Omit<BestSellingProduct, "image_url">) => ({
    ...row,
    image_url: await getSignedProductImage(row.image_path, 400),
  })));
}

/** Allow only legacy offer routes or a safe internal custom-offer route. */
function safeOfferPath(value: unknown): string {
  if (value === "/deals" || value === "/exclusive") return value;
  if (typeof value === "string" && /^\/offers\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return value;
  return "/deals";
}

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

type MerchantStorefront = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  status: "active" | "suspended";
  store_image_path: string | null;
  store_image_fit: "cover" | "contain";
  store_image_position: "left" | "center" | "right";
  store_image_url: string | null;
};

type StorefrontOfferCard = {
  id: string;
  title: string;
  icon: string;
  badge: string;
  description: string;
  button_label: string;
  target_path: string;
  theme: "exclusive" | "deals";
  is_active: boolean;
  sort_order: number;
  image_url?: string | null;
  bg_color?: string | null;
  bg_color_2?: string | null;
  text_color?: string | null;
  accent_color?: string | null;
  card_width_px?: number | null;
  card_height_px?: number | null;
};

const DEFAULT_OFFER_CARDS: StorefrontOfferCard[] = [
  {
    id: "default-exclusive",
    title: "عروضات حصرية",
    icon: "👑",
    badge: "EXCLUSIVE",
    description: "عروض محدودة على المنتجات الفاخرة والمختارة",
    button_label: "تصفح العروض",
    target_path: "/exclusive",
    theme: "exclusive",
    is_active: true,
    sort_order: 0,
  },
  {
    id: "default-deals",
    title: "تخفيضات حتى 70%",
    icon: "🌹",
    badge: "حتى 70%",
    description: "على منتجات مختارة من المتاجر العالمية",
    button_label: "تصفح العروض",
    target_path: "/deals",
    theme: "deals",
    is_active: true,
    sort_order: 1,
  },
];

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
.pr-merchant-section{position:relative;z-index:1;max-width:1240px;margin:42px auto 0;padding:0 22px}
.pr-merchant-heading{text-align:center;margin:0 0 20px}
.pr-merchant-heading h2{margin:0;color:var(--ink);font-size:clamp(22px,3vw,32px);font-weight:900}
.pr-merchant-heading p{margin:8px 0 0;color:var(--muted);font-size:14px;font-weight:700;line-height:1.8}
.pr-merchant-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:16px}
.pr-merchant-card{position:relative;display:flex;min-height:176px;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:12px;overflow:hidden;border:1px solid rgba(212,175,55,.55);border-radius:18px;background:linear-gradient(145deg,#fff,#fffaf0);padding:22px;text-decoration:none;color:var(--ink);box-shadow:0 8px 24px rgba(27,20,8,.06);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
.pr-merchant-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(260px 160px at 100% 0%,rgba(212,175,55,.18),transparent 72%)}
.pr-merchant-card:hover{transform:translateY(-3px);border-color:#D4AF37;box-shadow:0 16px 32px rgba(184,145,42,.16)}
.pr-merchant-card:focus-visible{outline:3px solid #8B671C;outline-offset:4px}
.pr-merchant-top,.pr-merchant-bottom{position:relative;z-index:1;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px}
.pr-merchant-mark{display:grid;width:48px;height:48px;flex:none;place-items:center;border-radius:15px;background:linear-gradient(135deg,#B8912A,#E8C766);color:#241b08;font-size:24px;box-shadow:0 6px 14px rgba(184,145,42,.2)}
.pr-merchant-city{color:var(--muted);font-size:12px;font-weight:800}
.pr-merchant-title{position:relative;z-index:1;margin:0;font-size:19px;font-weight:900;line-height:1.5}
.pr-merchant-description{position:relative;z-index:1;margin:4px 0 0;color:#706344;font-size:13px;font-weight:600;line-height:1.75}
.pr-merchant-cta{display:inline-flex;align-items:center;gap:8px;color:#8B671C;font-size:13px;font-weight:900}
.pr-merchant-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.pr-merchant-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(139,103,28,.3);border-radius:10px;background:#fff;padding:9px 12px;color:#765712;font-size:12px;font-weight:900;text-decoration:none;transition:background .2s,color .2s}
.pr-merchant-action:hover{background:#8B671C;color:#fff}
.pr-merchant-state{grid-column:1/-1;border:1px dashed rgba(184,145,42,.45);border-radius:14px;background:rgba(255,255,255,.7);padding:18px;text-align:center;color:var(--muted);font-size:13px;font-weight:700;line-height:1.8}
.pr-banners{position:relative;z-index:1;max-width:1240px;margin:34px auto 0;padding:0 22px;display:flex;flex-wrap:wrap;align-items:stretch;justify-content:center;gap:22px}
.pr-banner{position:relative;min-height:220px;overflow:hidden;border-radius:18px;padding:36px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:14px;text-align:right;text-decoration:none;transition:transform .25s ease,box-shadow .25s ease}.pr-banner:hover{transform:translateY(-3px)}
.pr-sale{background:linear-gradient(135deg,#F8BBD0,#F5A6BF);color:#7A2140;box-shadow:0 16px 40px rgba(248,187,208,.48)}.pr-sale:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(400px 220px at 88% 10%,rgba(255,255,255,.6),transparent 60%),radial-gradient(300px 200px at 10% 100%,rgba(255,255,255,.35),transparent 60%)}
.pr-exclusive{background:linear-gradient(135deg,#17130F,#050505);color:#D4AF37;box-shadow:0 16px 40px rgba(0,0,0,.32);border:1px solid rgba(212,175,55,.4)}.pr-exclusive:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(115deg,rgba(212,175,55,.12) 0 1px,transparent 1px 22px);mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.15));-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.15))}
.pr-banner-img{position:absolute;top:0;bottom:0;left:0;width:45%;height:100%;object-fit:cover;pointer-events:none;-webkit-mask-image:linear-gradient(to left,transparent,#000 45%);mask-image:linear-gradient(to left,transparent,#000 45%)}.pr-has-img h2,.pr-has-img p{max-width:56%}@media(max-width:720px){.pr-banner.pr-has-img{padding-top:190px}.pr-banner-img{width:100%;height:170px;bottom:auto;-webkit-mask-image:linear-gradient(to top,transparent,#000 40%);mask-image:linear-gradient(to top,transparent,#000 40%)}.pr-has-img h2,.pr-has-img p{max-width:none}}.pr-banner-icon{position:absolute;top:16px;left:22px;z-index:1;font-size:48px;opacity:.65;pointer-events:none}.pr-badge{position:relative;z-index:1;display:inline-flex;align-items:center;border-radius:999px;background:#fff;color:#E0447D;padding:8px 18px;font-size:15px;font-weight:900;box-shadow:0 6px 16px rgba(224,68,125,.18)}
.pr-banner h2{position:relative;z-index:1;margin:2px 0;font-size:clamp(24px,3vw,36px);font-weight:900}.pr-banner p{position:relative;z-index:1;max-width:430px;margin:0;font-size:15px;font-weight:700;line-height:1.9;opacity:.88}.pr-cta{position:relative;z-index:1;display:inline-flex;align-items:center;gap:10px;margin-top:3px;border-radius:999px;background:#fff;color:#E0447D;padding:12px 24px;font-size:14px;font-weight:900;box-shadow:0 10px 24px rgba(224,68,125,.2)}.pr-exclusive .pr-cta{background:linear-gradient(135deg,#B8912A,#D4AF37 45%,#F1DA8E);color:#1B1408;box-shadow:0 10px 26px rgba(212,175,55,.28)}
/* شريط علوي وسفلي متناسقان مع هوية المتجر */
.pr-topbar{position:sticky;top:0;z-index:50;width:100%;background:rgba(255,255,255,.94);border-bottom:1px solid rgba(212,175,55,.34);box-shadow:0 4px 18px rgba(27,20,8,.045);backdrop-filter:blur(12px)}
.pr-topbar-inner{max-width:1240px;min-height:70px;margin:0 auto;padding:12px 22px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px}
.pr-logo{justify-self:start}
.pr-section-nav{justify-self:center}
.pr-topbar-actions{justify-self:end}
.pr-logo{display:inline-flex;align-items:center;gap:11px;color:var(--ink)}
.pr-logo-mark{width:40px;height:40px;display:grid;place-items:center;flex:none;border-radius:13px;background:linear-gradient(135deg,#B8912A,#D4AF37 48%,#F1DA8E);color:#1B1408;font-size:17px;font-weight:900;box-shadow:0 5px 14px rgba(184,145,42,.22)}
.pr-logo-copy{display:flex;flex-direction:column;gap:2px}
.pr-logo-copy strong{font-size:13px;letter-spacing:.7px;font-weight:900;color:#3B2E12}
.pr-logo-copy small{font-size:11px;font-weight:700;color:var(--muted)}
  .pr-topbar-note{color:var(--muted);font-size:13px;font-weight:700}
  .pr-topbar-actions{display:flex;align-items:center;gap:10px}.pr-section-nav{display:flex;align-items:center;justify-content:center;gap:10px}.pr-section-nav button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 26px;border:1px solid #D4AF37;border-radius:999px;background:#fff;color:#3B2E12;font:inherit;font-size:15px;font-weight:900;white-space:nowrap;cursor:pointer;box-shadow:0 5px 15px rgba(27,20,8,.1);transition:transform .18s ease,background .18s ease,box-shadow .18s ease}.pr-section-nav .pr-tab-international{background:linear-gradient(135deg,#B8912A,#D4AF37 48%,#F1DA8E);color:#1B1408}.pr-section-nav button.is-active{background:linear-gradient(135deg,#3B2E12,#1B1408);color:#F1DA8E;box-shadow:0 7px 18px rgba(27,20,8,.22)}.pr-section-nav button:hover{transform:translateY(-1px);box-shadow:0 7px 16px rgba(27,20,8,.18)}.pr-section-nav button:focus-visible{outline:3px solid #D4AF37;outline-offset:3px}.pr-cart-link{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid rgba(212,175,55,.45);border-radius:999px;background:#fff;color:#3B2E12;text-decoration:none;font-size:12px;font-weight:900;white-space:nowrap;box-shadow:0 4px 12px rgba(27,20,8,.06)}.pr-cart-link:hover{border-color:#D4AF37;background:#FFFBF5}.pr-cart-count{display:grid;min-width:22px;height:22px;place-items:center;border-radius:999px;background:#D4AF37;color:#1B1408;font-size:11px;font-weight:900}
  @media(max-width:720px){.pr-topbar-inner{min-height:unset;display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:9px 12px}.pr-logo{justify-content:center}.pr-section-nav{width:100%;gap:8px}.pr-topbar-actions{width:100%;justify-content:center;gap:6px}.pr-topbar-note{display:none}.pr-section-nav button{flex:1;min-height:42px;padding:8px 7px;font-size:12px}.pr-cart-link{padding:9px 10px;font-size:10px}}
@media(max-width:720px){.pr-merchant-section{margin-top:32px;padding:0 14px}.pr-merchant-grid{grid-template-columns:1fr}.pr-merchant-card{min-height:155px;padding:18px}}
.pr-footer{position:relative;z-index:1;margin-top:54px;border-top:1px solid rgba(212,175,55,.34);background:rgba(255,255,255,.68)}
.pr-footer-inner{max-width:1240px;min-height:68px;margin:0 auto;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;font-weight:700}
.pr-footer-brand{color:#3B2E12;font-weight:900;letter-spacing:.3px}
@media(max-width:1080px){.pr-stores{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.pr-logo-mark{width:36px;height:36px}.pr-logo-copy strong{font-size:11px}.pr-logo-copy small{font-size:10px}.pr-head{padding-top:38px}.pr-stores{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:0 14px}.pr-store{height:200px;padding:18px 12px}.pr-store .sh-icon{width:88px;height:88px}.pr-banners{gap:16px;padding:0 14px}.pr-banner{min-height:220px;padding:28px 22px}.pr-footer{margin-top:38px}.pr-footer-inner{min-height:60px;padding:14px;flex-direction:column;justify-content:center;gap:5px;text-align:center;font-size:11px}}
@media(prefers-reduced-motion:reduce){.pr-store,.pr-store .sh-icon,.pr-banner{transition:none}}

/* هوية واجهة السوق الشامل، مرسومة بالكامل داخل الصفحة دون أصول خارجية */
.pr-page{--navy:#0B3A66;--orange:#F58220;--gold:#FFC531;--cream:#FFF9EF;--ink:#102B45;--muted:#60758A;background:var(--cream);color:var(--ink);font-family:'Cairo','Tajawal',system-ui,sans-serif;padding-bottom:38px}
.pr-page:before{background:radial-gradient(620px 300px at 88% -6%,rgba(255,197,49,.16),transparent 62%),radial-gradient(560px 300px at 4% 2%,rgba(11,58,102,.08),transparent 62%),radial-gradient(700px 380px at 50% 108%,rgba(245,130,32,.08),transparent 62%)}
.pr-page:after{display:none}
.pr-announcement{position:relative;z-index:51;background:#082F53;color:#F5F9FC;font-size:12px;font-weight:700}
.pr-announcement-inner{max-width:1240px;min-height:34px;margin:auto;padding:6px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.pr-shipping-note{display:inline-flex;align-items:center;gap:9px}.pr-shipping-note i{width:8px;height:8px;border-radius:50%;background:#38C978;box-shadow:0 0 0 4px rgba(56,201,120,.13);animation:pr-pulse 1.8s ease-in-out infinite}
.pr-announcement-help{color:#DCE8F3}
@keyframes pr-pulse{50%{box-shadow:0 0 0 7px rgba(56,201,120,0)}}
.pr-topbar{position:sticky;top:0;background:rgba(255,255,255,.97);border-bottom:1px solid #E2EAF1;box-shadow:0 5px 18px rgba(11,58,102,.06);backdrop-filter:blur(14px)}
.pr-topbar-inner{max-width:1240px;min-height:68px;padding:9px 22px;grid-template-columns:1fr auto 1fr;gap:18px}
.pr-logo{justify-self:start;gap:10px;text-decoration:none}.pr-logo-mark{width:42px;height:42px;border-radius:14px;background:var(--cream);border:1px solid #F3E1C6;color:var(--navy);box-shadow:0 4px 12px rgba(11,58,102,.08)}.pr-logo-mark svg{width:32px;height:32px}
.pr-logo-copy strong{font-size:15px;letter-spacing:0;color:var(--navy)}.pr-logo-copy small{font-size:10px;font-weight:900;letter-spacing:2.1px;color:var(--orange)}
.pr-section-nav{gap:4px}.pr-section-nav button{position:relative;min-height:44px;padding:8px 13px;border:0;border-radius:10px;background:transparent;color:#38536E;font-size:13px;font-weight:800;box-shadow:none;transition:color .18s ease,background .18s ease}
.pr-section-nav button:after{content:"";position:absolute;right:14px;left:14px;bottom:2px;height:2px;border-radius:5px;background:var(--orange);transform:scaleX(0);transform-origin:right;transition:transform .22s ease}
.pr-section-nav button.is-active{background:#FFF7EF;color:var(--orange);box-shadow:none}.pr-section-nav button.is-active:after{transform:scaleX(1)}.pr-section-nav button:hover{background:#F8FAFC;transform:none;box-shadow:none}.pr-section-nav button:focus-visible{outline:2px solid var(--orange);outline-offset:2px}
.pr-deals-tab{display:inline-flex;align-items:center;gap:6px}.pr-new-badge{border-radius:999px;background:var(--orange);color:#fff;padding:2px 7px;font-size:9px;font-weight:900}
.pr-topbar-actions{justify-self:end}.pr-cart-link{padding:9px 13px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--orange),#FF9B25);color:#fff;font-size:12px;box-shadow:0 7px 18px rgba(245,130,32,.22)}.pr-cart-link:hover{border-color:transparent;background:linear-gradient(135deg,#E96D0B,var(--orange))}.pr-cart-count{min-width:20px;height:20px;background:rgba(255,255,255,.25);color:#fff}
.pr-search-wrap{position:relative;z-index:2;max-width:1100px;min-height:48px;margin:0 auto 26px;padding:0 0 0 0;display:flex;align-items:center;gap:0;border:1.5px solid var(--navy);border-radius:15px;background:#fff;box-shadow:0 4px 12px rgba(11,58,102,.05);overflow:hidden}
.pr-search-icon{flex:none;margin-inline:14px 4px;color:var(--navy)}.pr-search-input{flex:1;min-width:0;height:46px;border:0;outline:0;background:transparent;padding:0 10px;color:var(--ink);font:inherit;font-size:13px}.pr-search-input::placeholder{color:#8A9BAA}
.pr-search-category{height:36px;max-width:148px;margin-inline:8px;padding:0 11px;border:1px solid #E2EAF1;border-radius:9px;background:#F7F9FB;color:var(--navy);font:inherit;font-size:12px;font-weight:800}
.pr-search-submit{align-self:stretch;min-width:72px;border:0;background:linear-gradient(135deg,var(--navy),#14558A);color:#fff;font:inherit;font-size:13px;font-weight:900;cursor:pointer;transition:background .2s ease}.pr-search-submit:hover{background:linear-gradient(135deg,var(--orange),#FF9B25)}
.pr-hero{position:relative;isolation:isolate;display:grid;grid-template-columns:1.35fr .8fr;align-items:center;gap:20px;max-width:1100px;min-height:280px;margin:0 auto;padding:30px 44px;overflow:hidden;border-radius:25px;background:linear-gradient(115deg,#0B3A66 0%,#124F83 58%,#2169A7 100%);color:#fff;box-shadow:0 20px 42px rgba(11,58,102,.2)}
.pr-hero:before,.pr-hero:after{content:"";position:absolute;z-index:-1;border-radius:50%;pointer-events:none}.pr-hero:before{width:320px;height:320px;left:-80px;top:-175px;background:radial-gradient(circle,rgba(245,130,32,.33),rgba(245,130,32,0) 70%)}.pr-hero:after{width:280px;height:280px;left:28%;bottom:-220px;background:radial-gradient(circle,rgba(255,197,49,.25),transparent 70%)}
.pr-hero-copy{position:relative;z-index:1}.pr-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:rgba(255,255,255,.13);color:#FFE2A4;font-size:11px;font-weight:900}
.pr-hero h1{max-width:560px;margin:15px 0 10px;font-size:clamp(26px,3vw,38px);font-weight:900;line-height:1.45}.pr-hero h1 span{background:linear-gradient(100deg,#FFC531,#FFE39A);-webkit-background-clip:text;background-clip:text;color:transparent}.pr-hero p{max-width:560px;margin:0;color:#E0EDF7;font-size:13px;line-height:1.9}
.pr-hero-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.pr-hero-primary,.pr-hero-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:9px 17px;border-radius:12px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;transition:transform .2s ease,background .2s ease}.pr-hero-primary{border:1px solid transparent;background:linear-gradient(135deg,var(--gold),#FF9B25);color:#163653;box-shadow:0 7px 18px rgba(255,197,49,.22)}.pr-hero-secondary{border:1px solid rgba(255,255,255,.42);background:rgba(255,255,255,.1);color:#fff}.pr-hero-primary:hover,.pr-hero-secondary:hover{transform:translateY(-2px)}
.pr-hero-art{display:grid;place-items:center;min-width:0}.pr-hero-art svg{width:min(100%,285px);height:auto;filter:drop-shadow(0 12px 18px rgba(0,0,0,.14))}
.pr-panel{scroll-margin-top:92px}.pr-panel-forward{animation:pr-panel-in-forward .3s cubic-bezier(.2,.75,.25,1) both}.pr-panel-backward{animation:pr-panel-in-backward .3s cubic-bezier(.2,.75,.25,1) both}.pr-head{padding:34px 22px 10px}.pr-brand{background:#fff;border-color:#E5EDF4;color:var(--muted);font-size:11px}.pr-brand .dot{background:var(--orange);box-shadow:0 0 10px rgba(245,130,32,.45)}.pr-title{margin:12px 0 8px;color:var(--navy);font-size:clamp(24px,3vw,32px)}.pr-title .grad{background:linear-gradient(110deg,var(--orange),#D85F0B 60%,var(--gold));-webkit-background-clip:text;background-clip:text}.pr-sub{color:var(--muted);font-size:13px}.pr-divider{margin-top:15px}.pr-divider i{background:linear-gradient(90deg,transparent,var(--orange))}.pr-divider i:last-child{background:linear-gradient(270deg,transparent,var(--orange))}.pr-divider b{background:var(--gold);box-shadow:0 0 12px rgba(255,197,49,.55)}
.pr-stores{margin:18px auto 0;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}.pr-store{height:160px;gap:10px;border:1px solid #E4EAF0;border-radius:18px;background:#fff;box-shadow:0 7px 18px rgba(11,58,102,.055);animation:pr-card-in .3s ease both}.pr-store:before{background:radial-gradient(220px 120px at 50% 0%,rgba(245,130,32,.12),transparent 70%)}.pr-store:hover{transform:translateY(-4px);border-color:#F5B06C;box-shadow:0 14px 26px rgba(11,58,102,.12)}.pr-store .sh-icon{width:74px;height:74px;padding:6px;border:0;border-radius:16px}.pr-store-name{color:var(--navy);font-size:13px}.pr-store-go{color:var(--orange)}
.pr-merchant-section{margin:20px auto 0}.pr-merchant-heading{text-align:right;margin-bottom:15px}.pr-merchant-heading h2{color:var(--navy);font-size:20px}.pr-merchant-heading p{color:var(--muted);font-size:12px}.pr-merchant-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr));gap:14px}.pr-merchant-card{min-height:165px;border:1px solid #E2EAF1;border-radius:18px;background:#fff;box-shadow:0 7px 18px rgba(11,58,102,.055);animation:pr-card-in .3s ease both}.pr-merchant-card:before{background:radial-gradient(250px 130px at 100% 0%,rgba(255,197,49,.13),transparent 72%)}.pr-merchant-card:hover{border-color:#F5B06C;box-shadow:0 14px 28px rgba(11,58,102,.12)}.pr-merchant-mark{background:linear-gradient(135deg,var(--navy),#17609A);color:#fff}.pr-merchant-title{color:var(--navy)}.pr-merchant-description{color:#667B8F}.pr-merchant-cta{color:var(--orange)}.pr-merchant-action{border-color:#D8E2EB;color:var(--navy)}.pr-merchant-action:hover{background:var(--navy);color:white}.pr-merchant-city{color:var(--muted)}.pr-merchant-state{border-color:#D9E3EC;background:#fff;color:var(--muted)}
.pr-bestseller-grid{align-items:stretch}.pr-bestseller-card{position:relative;display:flex;min-height:300px;flex-direction:column;gap:10px;overflow:hidden;border:1px solid #E2EAF1;border-radius:18px;background:#fff;padding:14px;box-shadow:0 7px 18px rgba(11,58,102,.06);animation:pr-card-in .3s ease both}.pr-best-rank{position:absolute;z-index:1;top:11px;right:11px;display:grid;width:29px;height:29px;place-items:center;border-radius:50%;background:var(--gold);color:var(--navy);font-size:12px;font-weight:900}.pr-best-image{display:grid;height:150px;place-items:center;overflow:hidden;border-radius:13px;background:linear-gradient(145deg,#F5F7F8,var(--cream));color:#7890A4}.pr-best-image img{width:100%;height:100%;object-fit:contain}.pr-best-info h3{margin:0;color:var(--navy);font-size:14px;font-weight:900;line-height:1.6}.pr-best-info p{margin:4px 0;color:var(--muted);font-size:11px;font-weight:700}.pr-best-info strong{color:var(--orange);font-size:14px}.pr-best-link{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;border-radius:10px;background:#F4F8FB;padding:10px;color:var(--navy);font-size:11px;font-weight:900;text-decoration:none}.pr-best-link:hover{background:#E9F1F7}.pr-retry-button{display:block;margin:12px auto 0;border:1px solid #D8E2EB;border-radius:9px;background:#fff;padding:8px 13px;color:var(--navy);font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.pr-banners{margin:18px auto 0;gap:14px}.pr-banner{border-radius:20px;animation:pr-card-in .3s ease both}.pr-banner h3{position:relative;z-index:1;margin:2px 0;font-size:clamp(22px,2.7vw,32px);font-weight:900}.pr-sale{background:linear-gradient(135deg,#FFF3E8,#FFE0C7);color:#8B3F0C;box-shadow:0 12px 28px rgba(245,130,32,.12)}.pr-exclusive{background:linear-gradient(135deg,var(--navy),#082F53);color:#FFC531;border-color:rgba(255,197,49,.35);box-shadow:0 12px 28px rgba(11,58,102,.18)}.pr-badge{background:#fff;color:var(--orange);box-shadow:0 5px 14px rgba(11,58,102,.08)}.pr-cta{background:linear-gradient(135deg,var(--orange),#FF9B25);color:#fff;box-shadow:0 8px 20px rgba(245,130,32,.2)}.pr-exclusive .pr-cta{background:linear-gradient(135deg,var(--gold),#FF9B25);color:var(--navy)}
.pr-footer{margin-top:34px;border-color:#E2EAF1;background:#fff}.pr-footer-inner{color:var(--muted)}.pr-footer-brand{color:var(--navy)}
@keyframes pr-panel-in-forward{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}@keyframes pr-panel-in-backward{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}@keyframes pr-card-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:900px){.pr-topbar-inner{grid-template-columns:auto 1fr auto;gap:9px}.pr-section-nav{gap:0}.pr-section-nav button{padding-inline:8px;font-size:11px}.pr-logo-copy strong{font-size:13px}.pr-search-wrap,.pr-hero{margin-inline:18px}.pr-stores{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.pr-announcement-inner{min-height:30px;padding:6px 12px;font-size:10px}.pr-announcement-help{display:none}.pr-topbar-inner{display:flex;flex-direction:column;align-items:stretch;gap:7px;padding:8px 12px}.pr-logo{justify-content:center}.pr-section-nav{width:100%;justify-content:space-between;gap:2px}.pr-section-nav button{flex:1;min-height:39px;padding:7px 4px;font-size:10px;white-space:nowrap}.pr-new-badge{padding:2px 5px;font-size:8px}.pr-topbar-actions{width:100%;justify-content:center}.pr-cart-link{min-height:36px}.pr-search-wrap{min-height:45px;margin:12px 12px 17px;border-radius:12px}.pr-search-icon{width:16px;margin-inline:9px 2px}.pr-search-input{height:43px;padding-inline:6px;font-size:11px}.pr-search-category{max-width:104px;margin-inline:4px;padding-inline:5px;font-size:10px}.pr-search-submit{min-width:52px;font-size:11px}.pr-hero{grid-template-columns:1fr;min-height:0;margin-inline:12px;padding:24px 21px;border-radius:20px}.pr-hero-art{grid-row:1;position:absolute;left:4px;top:18px;width:118px;opacity:.8}.pr-hero-art svg{width:118px}.pr-hero-copy{max-width:100%;padding-top:75px}.pr-hero h1{max-width:100%;font-size:25px}.pr-hero p{font-size:12px}.pr-hero-badge{font-size:10px}.pr-hero-actions{gap:7px}.pr-hero-primary,.pr-hero-secondary{min-height:39px;padding:8px 11px;font-size:10px}.pr-head{padding:27px 15px 8px}.pr-title{font-size:24px}.pr-sub{font-size:12px}.pr-stores{grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;padding:0 12px}.pr-store{height:150px;padding:14px 9px}.pr-store .sh-icon{width:68px;height:68px}.pr-merchant-section{margin-top:22px;padding:0 12px}.pr-merchant-grid{grid-template-columns:1fr}.pr-merchant-card{min-height:150px;padding:17px}.pr-banners{gap:12px;padding:0 12px}.pr-banner{min-height:210px;padding:24px 18px}.pr-panel{scroll-margin-top:150px}.pr-bestseller-card{min-height:280px}.pr-best-image{height:125px}.pr-footer{margin-top:30px}}
@media(prefers-reduced-motion:reduce){.pr-page *,.pr-page *:before,.pr-page *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}


`;

function CustomerStorefront() {
  const { user } = useSession(false);
  const { data: currentMerchantStore } = useSWR(
    user ? ["merchant-my-store", user.id] : null,
    loadCurrentMerchantStore,
  );
  const [links, setLinks] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [offerCards, setOfferCards] = useState<StorefrontOfferCard[]>(DEFAULT_OFFER_CARDS);
  const [merchantStores, setMerchantStores] = useState<MerchantStorefront[]>([]);
  const [merchantStoresLoading, setMerchantStoresLoading] = useState(true);
  const [merchantStoresError, setMerchantStoresError] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"international" | "local" | "best-sellers" | "deals">("international");
  const [tabDirection, setTabDirection] = useState<"forward" | "backward">("forward");
  const selectTab = useCallback((nextTab: typeof activeTab) => {
    const order = ["international", "local", "best-sellers", "deals"];
    if (nextTab !== activeTab) {
      setTabDirection(order.indexOf(nextTab) > order.indexOf(activeTab) ? "forward" : "backward");
      setActiveTab(nextTab);
    }
  }, [activeTab]);
  const scrollToStorefront = useCallback(() => {
    document.getElementById("storefront-panel")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, []);
  const [storefrontSearch, setStorefrontSearch] = useState("");
  const { data: bestSellingProducts = [], isLoading: bestSellingLoading, error: bestSellingError, mutate: mutateBestSellers } = useSWR(
    activeTab === "best-sellers" ? "marketplace-best-sellers" : null,
    loadBestSellingProducts,
    { revalidateOnFocus: true, dedupingInterval: 30_000 },
  );

  useEffect(() => {
    const syncCartCount = () => setCartCount(readCart().length);
    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener("focus", syncCartCount);
    window.addEventListener("alshamel-cart-updated", syncCartCount);
    document.addEventListener("visibilitychange", syncCartCount);
    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener("focus", syncCartCount);
      window.removeEventListener("alshamel-cart-updated", syncCartCount);
      document.removeEventListener("visibilitychange", syncCartCount);
    };
  }, []);

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

  useEffect(() => {
    let isCurrent = true;

    const loadMerchantStores = async () => {
      setMerchantStoresLoading(true);
      try {
        let { data, error } = await db
          .from("merchant_stores")
          .select("id,name,description,city,status,store_image_path,store_image_fit,store_image_position")
          .eq("status", "active")
          .order("name", { ascending: true });

        let hasStoreImageFields = !error;
        if (error) {
          // Store images are optional. Older production schemas still have the core store fields.
          console.warn("[storefront] optional store-image fields unavailable; retrying core store query", {
            code: error.code,
            message: error.message,
          });
          const fallback = await db
            .from("merchant_stores")
            .select("id,name,description,city,status")
            .eq("status", "active")
            .order("name", { ascending: true });
          data = fallback.data;
          error = fallback.error;
          hasStoreImageFields = false;
        }

        if (!isCurrent) return;
        if (error) {
          console.error("[storefront] merchant store query failed", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          setMerchantStoresError("تعذر تحميل متاجر التجار حاليًا. تحقق من الاتصال أو صلاحيات عرض المتاجر.");
          setMerchantStores([]);
          return;
        }

        const rows = (data ?? []) as Array<Omit<MerchantStorefront, "store_image_url">>;
        const storesWithImages = await Promise.all(rows.map(async (store) => {
          const storeImagePath = hasStoreImageFields ? store.store_image_path : null;
          let store_image_url: string | null = null;
          if (storeImagePath) {
            const { data: signedImage, error: imageError } = await supabase.storage
              .from("merchant-product-images")
              .createSignedUrl(storeImagePath, 3600);
            if (imageError) {
              console.warn("[storefront] store image unavailable", imageError.message);
            }
            store_image_url = signedImage?.signedUrl ?? null;
          }
          return {
            ...store,
            store_image_path: storeImagePath,
            store_image_fit: hasStoreImageFields ? store.store_image_fit : "cover",
            store_image_position: hasStoreImageFields ? store.store_image_position : "center",
            store_image_url,
          };
        }));
        if (!isCurrent) return;
        setMerchantStores(storesWithImages);
        setMerchantStoresError("");
      } catch (error) {
        if (!isCurrent) return;
        console.error("[storefront] unexpected merchant store load failure", error);
        setMerchantStoresError("تعذر تحميل متاجر التجار حاليًا. تحقق من الاتصال ثم أعد المحاولة.");
        setMerchantStores([]);
      } finally {
        if (isCurrent) setMerchantStoresLoading(false);
      }
    };

    const refreshMerchantStores = () => { void loadMerchantStores(); };
    void loadMerchantStores();
    window.addEventListener("merchant-store-updated", refreshMerchantStores);
    return () => {
      isCurrent = false;
      window.removeEventListener("merchant-store-updated", refreshMerchantStores);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadOfferCards = async () => {
      const baseColumns = "id,title,icon,badge,description,button_label,target_path,theme,is_active,sort_order";
      const query = (columns: string) =>
        db
          .from("storefront_offer_cards")
          .select(columns)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
      let { data, error } = await query(`${baseColumns},image_url,bg_color,bg_color_2,text_color,accent_color,card_width_px,card_height_px`);
      // قاعدة لم تُحدَّث بعد بأعمدة الصورة والألوان: اعرض البطاقات بالألوان الافتراضية.
      if (error && (error.code === "42703" || /column/i.test(error.message ?? ""))) {
        ({ data, error } = await query(baseColumns));
      }

      if (!isCurrent) return;
      if (error) {
        setOfferCards(DEFAULT_OFFER_CARDS);
        return;
      }

      setOfferCards((data ?? []).map((card: StorefrontOfferCard) => ({
        ...card,
        target_path: safeOfferPath(card.target_path),
        theme: card.theme === "exclusive" ? "exclusive" : "deals",
      })));
    };

    void loadOfferCards();
    return () => {
      isCurrent = false;
    };
  }, []);

  const visibleStores = INTERNATIONAL_STORES.filter((store) => visibility[store.id] !== false);
  const storeIds = new Set<string>(visibleStores.map((store) => store.id));
  const visibleIconStores = STORE_ICONS.filter((store) => storeIds.has(store.id));
  const visibleOfferCards = offerCards.filter((card) =>
    visibility[card.theme === "exclusive" ? "exclusive" : "discounts"] !== false
  );
  const searchTerm = storefrontSearch.trim().toLocaleLowerCase();
  const filteredIconStores = visibleIconStores.filter((store) =>
    !searchTerm || `${store.name} ${store.id}`.toLocaleLowerCase().includes(searchTerm)
  );
  const filteredMerchantStores = merchantStores.filter((store) =>
    !searchTerm || `${store.name} ${store.city ?? ""} ${store.description ?? ""}`.toLocaleLowerCase().includes(searchTerm)
  );
  const filteredBestSellingProducts = bestSellingProducts.filter((product) =>
    !searchTerm || product.title.toLocaleLowerCase().includes(searchTerm)
  );
  const filteredOfferCards = visibleOfferCards.filter((card) =>
    !searchTerm || `${card.title} ${card.badge} ${card.description}`.toLocaleLowerCase().includes(searchTerm)
  );

  const getExternalStoreUrl = (storeId: string, fallback: string) => {
    const candidate = links[storeId]?.trim();
    return candidate && /^https?:\/\//i.test(candidate) ? candidate : fallback;
  };

  return (
    <main dir="rtl" lang="ar" className="pr-page">
      <style dangerouslySetInnerHTML={{ __html: CUSTOMER_STOREFRONT_CSS }} />

      <div className="pr-announcement" role="note">
        <div className="pr-announcement-inner">
          <span className="pr-shipping-note"><i aria-hidden="true" />الشحن متاح لجميع مدن اليمن · تسليم خلال 24 ساعة</span>
          <span className="pr-announcement-help" aria-hidden="true">تسوق بثقة · السوق الشامل</span>
        </div>
      </div>

      <div className="pr-topbar" role="banner">
        <div className="pr-topbar-inner">
          <div className="pr-logo" aria-label="السوق الشامل AL SHAMEL">
            <span className="pr-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" role="img" focusable="false">
                <path d="M8 12h5l4 19h18l5-14H16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="37" r="2.8" fill="currentColor" /><circle cx="33" cy="37" r="2.8" fill="currentColor" />
                <path d="M34 7l1.5 3.7 4 .4-3 2.5.9 3.9-3.4-2.1-3.4 2.1.9-3.9-3-2.5 4-.4z" fill="#F58220" />
              </svg>
            </span>
            <span className="pr-logo-copy"><strong>السوق الشامل</strong><small>AL SHAMEL</small></span>
          </div>
          <nav className="pr-section-nav" aria-label="أقسام السوق">
            <button type="button" className={`pr-tab-button${activeTab === "international" ? " is-active" : ""}`} aria-pressed={activeTab === "international"} onClick={() => selectTab("international")}>منتجات دولية</button>
            <button type="button" className={`pr-tab-button${activeTab === "local" ? " is-active" : ""}`} aria-pressed={activeTab === "local"} onClick={() => selectTab("local")}>متاجر محلية</button>
            <button type="button" className={`pr-tab-button${activeTab === "best-sellers" ? " is-active" : ""}`} aria-pressed={activeTab === "best-sellers"} onClick={() => selectTab("best-sellers")}>الأكثر مبيعًا</button>
            <button type="button" className={`pr-tab-button pr-deals-tab${activeTab === "deals" ? " is-active" : ""}`} aria-pressed={activeTab === "deals"} onClick={() => selectTab("deals")}>العروض<span className="pr-new-badge">جديد</span></button>
          </nav>
          <div className="pr-topbar-actions">
            <Link to="/cart" className="pr-cart-link" aria-label={`سلة المشتريات، ${cartCount} عنصر`}>
              <ShoppingCart size={17} aria-hidden="true" /><span>سلة المشتريات</span>
              <span className="pr-cart-count">{cartCount}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="pr-search-wrap" role="search">
        <Search className="pr-search-icon" aria-hidden="true" size={19} />
        <label className="sr-only" htmlFor="products-storefront-search">ابحث عن منتج أو متجر</label>
        <input id="products-storefront-search" className="pr-search-input" value={storefrontSearch} onChange={(event) => setStorefrontSearch(event.target.value)} placeholder="ابحث عن منتج، متجر، أو عرض..." />
        <label className="sr-only" htmlFor="products-storefront-category">كل الأقسام</label>
        <select id="products-storefront-category" className="pr-search-category" value={activeTab} onChange={(event) => selectTab(event.target.value as typeof activeTab)}>
          <option value="international">منتجات دولية</option><option value="local">متاجر محلية</option><option value="best-sellers">الأكثر مبيعًا</option><option value="deals">العروض</option>
        </select>
        <button type="button" className="pr-search-submit" onClick={scrollToStorefront}>بحث</button>
      </div>

      {activeTab !== "local" && (
        <section className="pr-hero" aria-labelledby="pr-hero-title">
        <div className="pr-hero-copy">
          <span className="pr-hero-badge"><Sparkles size={14} aria-hidden="true" /> تسوقك العالمي في مكان واحد</span>
          <h1 id="pr-hero-title">كل ما تحتاجه من <span>العالم</span> يوصلك إلى بابك</h1>
          <p>تسوق من أشهر المتاجر العالمية والمحلية بسهولة، واكتشف منتجات وعروضًا مختارة بعناية.</p>
          <div className="pr-hero-actions">
            <button type="button" className="pr-hero-primary" onClick={() => { selectTab("international"); scrollToStorefront(); }}>ابدأ التسوق <ShoppingBag size={16} aria-hidden="true" /></button>
            <button type="button" className="pr-hero-secondary" onClick={() => { selectTab("local"); scrollToStorefront(); }}>تصفح المتاجر <ArrowLeft size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="pr-hero-art" aria-hidden="true">
          <svg viewBox="0 0 300 240" role="img" focusable="false">
            <circle cx="142" cy="119" r="98" fill="rgba(255,255,255,.06)" />
            <circle cx="238" cy="48" r="34" fill="rgba(255,197,49,.15)" />
            <path d="M230 22l4.5 12 13 1.2-9.8 8.2 3 12.8-10.7-6.9-10.8 6.9 3-12.8-9.7-8.2 12.9-1.2z" fill="#FFC531" />
            <path d="M39 69h18l19 98h112l24-73H69" fill="none" stroke="#73BDF2" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M77 95h142l-19 62H90z" fill="#F58220" />
            <circle cx="101" cy="184" r="15" fill="#fff" stroke="#73BDF2" strokeWidth="7" /><circle cx="181" cy="184" r="15" fill="#fff" stroke="#73BDF2" strokeWidth="7" />
            <text x="148" y="143" textAnchor="middle" fontFamily="Cairo, Tajawal, sans-serif" fontSize="39" fontWeight="900" fill="#0B3A66">AS</text>
          </svg>
        </div>
        </section>
      )}

      <div className={`pr-panel pr-panel-${tabDirection}`} id="storefront-panel" key={activeTab}>
        {activeTab !== "local" && (
          <header className="pr-head">
          <span className="pr-brand"><i className="dot" /> السوق الشامل · AL SHAMEL</span>
          <h2 className="pr-title">{activeTab === "international" ? <>تسوّق من أشهر المتاجر <span className="grad">العالمية</span></> : activeTab === "best-sellers" ? <>الأكثر <span className="grad">مبيعًا</span></> : <>عروض <span className="grad">مختارة</span></>}</h2>
          <p className="pr-sub">{activeTab === "international" ? "اطلب من أشهر المتاجر العالمية وتعرّف على خيارات التسوق المتاحة." : activeTab === "best-sellers" ? "منتجات مرتبة حسب الكميات المسلّمة فعليًا للعملاء." : "اكتشف العروض الحالية من متاجر السوق الشامل."}</p>
          <div className="pr-divider" aria-hidden="true"><i /><b /><i /></div>
          </header>
        )}

        {activeTab === "international" && (
          filteredIconStores.length ? <section id="store-links" className="pr-stores" aria-label="بوابات المتاجر العالمية">
            {filteredIconStores.map(({ id, name, from, to, ink, Glyph }, index) => {
              const store = INTERNATIONAL_STORES.find((item) => item.id === id);
              const url = getExternalStoreUrl(id, store?.fallback ?? "https://www.google.com");
              return <a key={id} className="pr-store" style={{ animationDelay: `${index * 45}ms` }} href={url} target="_blank" rel="noopener noreferrer" aria-label={`تسوق من ${name}، يفتح في تبويب جديد`} title={`تسوق من ${name}`}>
                <span className="pr-store-go" aria-hidden="true">↗</span><IconShell id={`store-${id}`} from={from} to={to} {...(ink ? { ink } : {})}><Glyph /></IconShell><span className="pr-store-name">{name}</span>
              </a>;
            })}
          </section> : <div className="pr-merchant-state">لا توجد متاجر تطابق بحثك.</div>
        )}

        {activeTab === "local" && (
          <section id="merchant-stores" className="pr-merchant-section" aria-labelledby="pr-merchant-heading">
            <div className="pr-merchant-heading"><h2 id="pr-merchant-heading">متاجر التجار المحليين</h2><p>تصفح المتاجر المحلية والمنتجات التي اعتمدتها الإدارة.</p></div>
            <div className="pr-merchant-grid">
              {merchantStoresLoading ? <div className="pr-merchant-state" role="status">جارٍ تحميل المتاجر...</div> : merchantStoresError ? <div className="pr-merchant-state" role="status">{merchantStoresError}</div> : filteredMerchantStores.length === 0 ? <div className="pr-merchant-state">{searchTerm ? "لا توجد متاجر تطابق بحثك." : "لا توجد متاجر نشطة للعرض حاليًا."}</div> : filteredMerchantStores.map((store, index) => (
                <article key={store.id} className="pr-merchant-card" style={{ animationDelay: `${index * 45}ms` }}>
                  <div className="pr-merchant-top">{store.store_image_url ? <img className="pr-merchant-mark pr-merchant-store-image" src={store.store_image_url} alt={`صورة متجر ${store.name}`} style={{ objectFit: store.store_image_fit, objectPosition: store.store_image_position }} loading="lazy" /> : <span className="pr-merchant-mark" aria-hidden="true">🏪</span>}{store.city && <span className="pr-merchant-city">{store.city}</span>}</div>
                  <div><h3 className="pr-merchant-title">{store.name}</h3>{store.description && <p className="pr-merchant-description">{store.description}</p>}</div>
                  <div className="pr-merchant-bottom"><a className="pr-merchant-cta" href={`/marketplace?store=${encodeURIComponent(store.id)}`} aria-label={`تصفح منتجات متجر ${store.name}`}>تصفح المنتجات <span aria-hidden="true">←</span></a>{currentMerchantStore?.id === store.id && <div className="pr-merchant-actions" aria-label={`إدارة متجر ${store.name}`}><a className="pr-merchant-action" href="/merchant">لوحة متجري</a><a className="pr-merchant-action" href="/merchant?view=add-product">+ أضف منتج</a></div>}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "best-sellers" && (
          <section className="pr-merchant-section" aria-label="المنتجات الأكثر مبيعًا">
            <div className="pr-merchant-grid pr-bestseller-grid">
              {bestSellingLoading ? <div className="pr-merchant-state" role="status">جارٍ تحميل المنتجات الأكثر مبيعًا...</div> : bestSellingError ? <div className="pr-merchant-state" role="alert">تعذر تحميل ترتيب المبيعات. تحقق من تطبيق ترحيل عرض الأكثر مبيعًا بعد دمجه.<button type="button" className="pr-retry-button" onClick={() => void mutateBestSellers()}>إعادة المحاولة</button></div> : filteredBestSellingProducts.length === 0 ? <div className="pr-merchant-state">{searchTerm ? "لا توجد منتجات تطابق بحثك." : "لا توجد منتجات مسلّمة كافية لعرض قائمة الأكثر مبيعًا حاليًا."}</div> : filteredBestSellingProducts.map((product, index) => (
                <article key={product.product_id} className="pr-bestseller-card" style={{ animationDelay: `${index * 45}ms` }}>
                  <span className="pr-best-rank">{index + 1}</span>
                  <div className="pr-best-image">{product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy" /> : <ShoppingBag size={34} aria-hidden="true" />}</div>
                  <div className="pr-best-info"><h3>{product.title}</h3><p>{Number(product.quantity_sold).toLocaleString("ar-YE")} مبيعات مسلّمة</p><strong>{Number(product.price).toLocaleString("ar-YE", { maximumFractionDigits: 2 })} {product.currency}</strong></div>
                  <a className="pr-best-link" href={`/marketplace?store=${encodeURIComponent(product.store_id)}`}>تسوّق من المتجر <ArrowLeft size={15} aria-hidden="true" /></a>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "deals" && (
          filteredOfferCards.length ? <section className="pr-banners" aria-label="العروض المميزة">
            {filteredOfferCards.map((card, index) => {
              const exclusive = card.theme === "exclusive";
              const targetPath = safeOfferPath(card.target_path);
              const colors = resolveCardColors(card.theme, card);
              const image = safeImageUrl(card.image_url);
              const accentStyle = { background: colors.accent_color, color: readableTextOn(colors.accent_color) };
              return <a id={card.id} key={card.id} className={`pr-banner ${exclusive ? "pr-exclusive" : "pr-sale"}${image ? " pr-has-img" : ""}`} style={{ animationDelay: `${index * 45}ms`, background: `linear-gradient(135deg, ${colors.bg_color}, ${colors.bg_color_2})`, color: colors.text_color, boxSizing: "border-box", width: `${Math.max(240, Math.min(1600, Number(card.card_width_px) || 520))}px`, maxWidth: "100%", flex: "0 0 auto", height: `${Math.max(220, Math.min(900, Number(card.card_height_px) || 300))}px`, minHeight: 220 }} href={targetPath} aria-label={`تصفح ${card.title}`}>
                {image ? <img className="pr-banner-img" src={image} alt="" loading="lazy" /> : <span className="pr-banner-icon" aria-hidden="true">{card.icon || (exclusive ? "👑" : "🌹")}</span>}
                {card.badge && <span className="pr-badge" style={accentStyle}>{card.badge}</span>}<h3>{card.title}</h3>{card.description && <p>{card.description}</p>}<span className="pr-cta" style={accentStyle}>{card.button_label || "تصفح العروض"}<span aria-hidden="true">←</span></span>
              </a>;
            })}
          </section> : <div className="pr-merchant-state">لا توجد عروض تطابق بحثك.</div>
        )}
      </div>

      <footer className="pr-footer"><div className="pr-footer-inner"><span className="pr-footer-brand">AL SHAMEL · السوق الشامل</span><span>تسوق عالمي أسهل، من مكان واحد</span></div></footer>
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
      discountTag: "ماركات تركية وع��لمية",
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
                  {copiedAccount ? "تم النسخ ✓" : "ن��خ"}
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
