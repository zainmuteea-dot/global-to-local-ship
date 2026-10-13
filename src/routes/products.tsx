import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* =======================================================================
   صفحة المنتجات — الشامل للتسوق
   - شبكة مربعات للفئات + بانر عروض 50% + أقسام (عروض/أمازون/محلي).
   - يحاول جلب المنتجات من جدول products، وإن فشل يعرض بيانات تجريبية.
   ======================================================================= */
const STORE_NAME = "الشامل للتسوق";
const STORE_TAGLINE = "AL SHAMEL SHOPPING";
const STORE_LOGO = ""; // ضع رابط شعار المتجر ليظهر في الترويسة
const BRAND = { primary: "#1E56A0", primaryDark: "#16417c", accent: "#F28522" };
const CURRENCY = "ر.ي";

const fmt = (v: number) => Math.round(Number(v || 0)).toLocaleString("en-US");

type Source = "amazon" | "local" | "offer";

type Product = {
  id: string | number;
  name: string;
  price: number;
  oldPrice?: number | null;
  image?: string | null;
  source: Source;
  tint: string; // لون خلفية الصورة البديلة
  emoji?: string;
};

type Category = { id: string; name: string; emoji: string; tint: string };

const CATEGORIES: Category[] = [
  { id: "electronics", name: "إلكترونيات", emoji: "📱", tint: "#1E56A0" },
  { id: "fashion", name: "أزياء", emoji: "👗", tint: "#e23b3b" },
  { id: "home", name: "منزل ومطبخ", emoji: "🏠", tint: "#2e9e5b" },
  { id: "beauty", name: "جمال وعناية", emoji: "💄", tint: "#d6447f" },
  { id: "kids", name: "أطفال وألعاب", emoji: "🧸", tint: "#f39c12" },
  { id: "sports", name: "رياضة", emoji: "⚽", tint: "#0ea5b5" },
  { id: "phones", name: "هواتف وملحقات", emoji: "🎧", tint: "#7b2ff2" },
  { id: "watches", name: "ساعات", emoji: "⌚", tint: "#1b3a6b" },
  { id: "shoes", name: "أحذية", emoji: "👟", tint: "#ef7d00" },
  { id: "health", name: "صحة", emoji: "💊", tint: "#16a34a" },
  { id: "gifts", name: "هدايا", emoji: "🎁", tint: "#F28522" },
  { id: "cars", name: "سيارات", emoji: "🚗", tint: "#334155" },
];

/* بيانات تجريبية (تُستبدل تلقائياً ببيانات Supabase عند توفرها) */
const SAMPLE: Product[] = [
  { id: "o1", name: "سماعات بلوتوث لاسلكية", price: 7500, oldPrice: 15000, source: "offer", tint: "#1E56A0", emoji: "🎧" },
  { id: "o2", name: "ساعة ذكية رياضية", price: 12000, oldPrice: 24000, source: "offer", tint: "#1b3a6b", emoji: "⌚" },
  { id: "o3", name: "حقيبة ظهر عصرية", price: 5000, oldPrice: 10000, source: "offer", tint: "#e23b3b", emoji: "🎒" },
  { id: "o4", name: "مصباح مكتبي LED", price: 3250, oldPrice: 6500, source: "offer", tint: "#f39c12", emoji: "💡" },
  { id: "a1", name: "شاحن سريع USB-C", price: 4200, source: "amazon", tint: "#1E56A0", emoji: "🔌" },
  { id: "a2", name: "لوحة مفاتيح لاسلكية", price: 9800, source: "amazon", tint: "#334155", emoji: "⌨️" },
  { id: "a3", name: "كاميرا مراقبة منزلية", price: 15600, source: "amazon", tint: "#0ea5b5", emoji: "📷" },
  { id: "a4", name: "مكنسة كهربائية محمولة", price: 22000, source: "amazon", tint: "#7b2ff2", emoji: "🧹" },
  { id: "l1", name: "عسل سدر يمني أصلي", price: 18000, source: "local", tint: "#F28522", emoji: "🍯" },
  { id: "l2", name: "بن يمني محمّص", price: 6500, source: "local", tint: "#8b5a2b", emoji: "☕" },
  { id: "l3", name: "زبيب يمني فاخر", price: 4000, source: "local", tint: "#6d28d9", emoji: "🍇" },
  { id: "l4", name: "بخور وعود طبيعي", price: 9000, source: "local", tint: "#2e9e5b", emoji: "🌿" },
];

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [{ title: "المنتجات — الشامل للتسوق" }],
  }),
  component: ProductsPage,
});
function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(SAMPLE);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("id,name,price,old_price,image,source")
          .limit(60);
        if (error) throw error;
        if (!alive) return;
        if (Array.isArray(data) && data.length) {
          const palette = ["#1E56A0", "#e23b3b", "#2e9e5b", "#f39c12", "#0ea5b5", "#7b2ff2", "#F28522", "#1b3a6b"];
          const mapped: Product[] = data.map((r: any, i: number) => ({
            id: r.id,
            name: r.name ?? "منتج",
            price: Number(r.price || 0),
            oldPrice: r.old_price ? Number(r.old_price) : null,
            image: r.image ?? null,
            source: (r.source as Source) || "amazon",
            tint: palette[i % palette.length],
            emoji: "🛍️",
          }));
          setProducts(mapped);
        }
      } catch {
        // نُبقي البيانات التجريبية عند الفشل.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return products;
    return products.filter((p) => p.name.includes(q));
  }, [products, query]);

  const offers = filtered.filter((p) => p.source === "offer");
  const amazon = filtered.filter((p) => p.source === "amazon");
  const local = filtered.filter((p) => p.source === "local");

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 pb-10"
      style={{ fontFamily: "Cairo, system-ui, sans-serif" }}
    >
      {/* شريط علوي */}
      <div
        className="sticky top-0 z-20 text-white shadow-md"
        style={{ background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` }}
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {STORE_LOGO ? (
                <img src={STORE_LOGO} alt={STORE_NAME} className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-base font-black">
                  <span style={{ color: BRAND.primary }}>A</span>
                  <span style={{ color: BRAND.accent, marginInlineStart: -3 }}>S</span>
                </span>
              )}
              <div>
                <h1 className="text-base font-extrabold leading-tight">{STORE_NAME}</h1>
                <p className="text-[10px] tracking-widest text-white/70">{STORE_TAGLINE}</p>
              </div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full text-lg" style={{ backgroundColor: BRAND.accent }}>
              🛒
            </span>
          </div>
          {/* بحث */}
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
            <span className="text-slate-400">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج…"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        {/* بانر العروض 50% */}
        <section
          className="relative mb-5 overflow-hidden rounded-3xl p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(120deg, ${BRAND.accent}, #d9680f)` }}
        >
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-white/15" />
          <div className="relative">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">عروض محدودة</span>
            <h2 className="mt-3 text-3xl font-black leading-tight">خصومات تصل إلى 50%</h2>
            <p className="mt-1 text-sm text-white/90">على تشكيلة مختارة من أفضل المنتجات</p>
          </div>
        </section>

        {/* مربعات الفئات */}
        <section className="mb-6">
          <SectionTitle sub="تسوّق بسهولة" title="الفئات" />
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm transition active:scale-95"
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${c.tint}1a`, color: c.tint }}
                >
                  {c.emoji}
                </span>
                <span className="text-[11px] font-bold leading-tight text-slate-700">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* عروض 50% */}
        {offers.length > 0 && (
          <ProductSection
            sub="وفّر أكثر"
            title="عروض حتى 50%"
            badge="‐‏50%"
            badgeColor={BRAND.accent}
            items={offers}
          />
        )}

        {/* منتجات أمازون */}
        {amazon.length > 0 && (
          <ProductSection
            sub="شحن عالمي عبر الشامل"
            title="منتجات مختارة من أمازون"
            badge="أمازون"
            badgeColor={BRAND.primary}
            items={amazon}
          />
        )}

        {/* منتجات محلية */}
        {local.length > 0 && (
          <ProductSection
            sub="ادعم المنتج المحلي"
            title="منتجات محلية وطنية"
            badge="صنع في اليمن"
            badgeColor="#2e9e5b"
            items={local}
          />
        )}

        {!loading && filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-slate-400">لا توجد منتجات مطابقة للبحث.</p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ sub, title }: { sub: string; title: string }) {
  return (
    <div className="mb-3">
      <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: BRAND.accent }}>
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRAND.accent }} />
        {sub}
      </span>
      <h2 className="text-xl font-extrabold" style={{ color: BRAND.primaryDark }}>
        {title}
      </h2>
    </div>
  );
}

function ProductSection({
  sub,
  title,
  badge,
  badgeColor,
  items,
}: {
  sub: string;
  title: string;
  badge: string;
  badgeColor: string;
  items: Product[];
}) {
  return (
    <section className="mb-6">
      <SectionTitle sub={sub} title={title} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} badge={badge} badgeColor={badgeColor} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ p, badge, badgeColor }: { p: Product; badge: string; badgeColor: string }) {
  const discount =
    p.oldPrice && p.oldPrice > p.price
      ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
      : 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square">
        {p.image ? (
          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-5xl"
            style={{ backgroundColor: `${p.tint}1a` }}
          >
            <span>{p.emoji || "🛍️"}</span>
          </div>
        )}
        <span
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow"
          style={{ backgroundColor: badgeColor }}
        >
          {badge}
        </span>
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white shadow">
            -{discount}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-[2.4rem] text-xs font-bold text-slate-700">{p.name}</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-sm font-black" style={{ color: BRAND.primary }}>
            {fmt(p.price)} <span className="text-[10px] font-bold text-slate-400">{CURRENCY}</span>
          </span>
          {p.oldPrice && p.oldPrice > p.price && (
            <span className="text-[11px] text-slate-400 line-through">{fmt(p.oldPrice)}</span>
          )}
        </div>
        <button
          className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-white transition active:scale-95"
          style={{ backgroundColor: BRAND.accent }}
        >
          أضف للسلة
        </button>
      </div>
    </div>
  );
}
