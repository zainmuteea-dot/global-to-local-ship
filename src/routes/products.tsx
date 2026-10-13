import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShoppingBag, Search, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/al-shamel-logo.asset.json";
import imgDress from "@/assets/product-dress.jpg";
import imgSneakers from "@/assets/product-sneakers.jpg";
import imgHeadphones from "@/assets/product-headphones.jpg";
import imgBag from "@/assets/product-bag.jpg";
import imgWatch from "@/assets/product-watch.jpg";
import imgSunglasses from "@/assets/product-sunglasses.jpg";
import imgToy from "@/assets/product-toy.jpg";
import imgAirfryer from "@/assets/product-airfryer.jpg";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "المنتجات | الشامل للتسوق" },
      { name: "description", content: "تصفح منتجات مختارة من شي إن وأمازون واطلبها عبر الشامل للتسوق مع الدفع المحلي والتوصيل لباب بيتك." },
      { property: "og:title", content: "المنتجات | الشامل للتسوق" },
      { property: "og:description", content: "منتجات مختارة من المتاجر العالمية، والشراء عبر الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

type StoreKey = "shein" | "amazon";

const PRODUCTS: { id: string; name: string; store: StoreKey; price: number; img: string; tag?: string }[] = [
  { id: "p1", name: "فستان صيفي بنقشة زهور", store: "shein", price: 89, img: imgDress, tag: "الأكثر طلباً" },
  { id: "p2", name: "حذاء رياضي أبيض وبرتقالي", store: "shein", price: 120, img: imgSneakers },
  { id: "p3", name: "سماعات رأس لاسلكية", store: "amazon", price: 199, img: imgHeadphones, tag: "عرض" },
  { id: "p4", name: "حقيبة يد جلدية أنيقة", store: "shein", price: 145, img: imgBag },
  { id: "p5", name: "ساعة يد رجالية معدنية", store: "amazon", price: 260, img: imgWatch },
  { id: "p6", name: "نظارة شمسية كلاسيكية", store: "shein", price: 55, img: imgSunglasses },
  { id: "p7", name: "دب قطيفة للأطفال", store: "amazon", price: 65, img: imgToy },
  { id: "p8", name: "قلاية هوائية منزلية", store: "amazon", price: 310, img: imgAirfryer, tag: "جديد" },
];

const STORE_LABEL: Record<StoreKey, string> = { shein: "شي إن", amazon: "أمازون" };
const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "shein", label: "شي إن" },
  { key: "amazon", label: "أمازون" },
] as const;

function ProductsPage() {
  const [filter, setFilter] = useState<"all" | StoreKey>("all");
  const [q, setQ] = useState("");
  const visible = PRODUCTS.filter(
    (p) =>
      (filter === "all" || p.store === filter) &&
      (!q.trim() || p.name.includes(q.trim()))
  );

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/stores" className="brand">
            <img src={logo.url} alt="شعار الشامل للتسوق" />
            <span>
              <strong>
                الشامل<span className="brand-accent"> للتسوق</span>
              </strong>
              <small lang="en">AL SHAMEL SHOPPING</small>
            </span>
          </Link>
          <Button asChild variant="order" className="stores-head-btn">
            <Link to="/order">
              اطلب الآن
              <ArrowLeft size={16} />
            </Link>
          </Button>
        </div>
      </header>

      <main className="page-container">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span />
              تشكيلة مختارة
            </div>
            <h1>
              المنتجات<span className="title-dot">.</span>
            </h1>
            <p>منتجات مختارة من شي إن وأمازون — والشراء يتم عبر الشامل.</p>
          </div>
        </div>

        <div className="products-toolbar">
          <div className="products-filters">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                type="button"
                variant={filter === f.key ? "selected" : "choice"}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.key !== "all" && <Store size={15} />}
                {f.label}
              </Button>
            ))}
          </div>
          <div className="products-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن منتج…"
            />
          </div>
        </div>

        <div className="products-grid">
          {visible.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-media">
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  width={1024}
                  height={1024}
                />
                {p.tag && (
                  <span className="product-tag">
                    <Sparkles size={12} />
                    {p.tag}
                  </span>
                )}
                <span className={`product-store store-badge-${p.store}`}>
                  {STORE_LABEL[p.store]}
                </span>
              </div>
              <div className="product-body">
                <h3>{p.name}</h3>
                <div className="product-meta">
                  <span className="product-price">
                    {p.price} <small>ر.س</small>
                  </span>
                  <span className="product-note">السعر تقريبي قبل الشحن</span>
                </div>
                <Button asChild variant="order" className="product-cta">
                  <Link to="/order">
                    اشترِ عبر الشامل
                    <ShoppingBag size={15} />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
          {visible.length === 0 && (
            <p className="products-empty">لا توجد منتجات مطابقة لبحثك.</p>
          )}
        </div>

        <section className="products-banner">
          <div>
            <strong>ما لقيت منتجك؟</strong>
            <span>انسخ رابط أي منتج من شي إن أو أمازون والصقه في صفحة الطلب، ونتولى الباقي.</span>
          </div>
          <Button asChild variant="order">
            <Link to="/order">
              اطلب برابطك الخاص
              <ArrowLeft size={16} />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="site-footer">
        <span>
          الشامل للتسوق<span className="footer-dot">·</span>من العالم إلى بابك
        </span>
        <small>AL SHAMEL SHOPPING</small>
      </footer>
    </div>
  );
}
