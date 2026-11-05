import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, ShoppingBag, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readableTextOn, resolveCardColors } from "@/lib/offer-card-style";

const db = supabase as any;
type Page = {
  id: string; title: string; icon: string; badge: string; description: string;
  theme: "deals" | "exclusive"; image_url: string | null;
  bg_color: string | null; bg_color_2: string | null;
  text_color: string | null; accent_color: string | null;
};
type Product = {
  id: string; name: string; image_url: string | null; price: number;
  discount_percent: number; category?: string | null; brand?: string | null;
  description?: string | null; bg_color?: string | null; bg_color_2?: string | null;
  text_color?: string | null; accent_color?: string | null;
};

function OfferSlugPage() {
  const { slug } = Route.useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        setError("رابط الصفحة غير صالح."); setLoading(false); return;
      }
      const targetPath = `/offers/${slug}`;
      let pageResult = await db.from("storefront_offer_cards")
        .select("id,title,icon,badge,description,theme,image_url,bg_color,bg_color_2,text_color,accent_color")
        .eq("target_path", targetPath).eq("is_active", true).maybeSingle();
      if (pageResult.error && (pageResult.error.code === "42703" || pageResult.error.code === "PGRST204")) {
        pageResult = await db.from("storefront_offer_cards")
          .select("id,title,icon,badge,description,theme")
          .eq("target_path", targetPath).eq("is_active", true).maybeSingle();
      }
      if (!active) return;
      if (pageResult.error || !pageResult.data) {
        setError("الصفحة غير موجودة أو غير متاحة."); setLoading(false); return;
      }
      const current = {
        image_url: null, bg_color: null, bg_color_2: null, text_color: null, accent_color: null,
        ...pageResult.data,
      } as Page;
      setPage(current);

      const { data: links, error: linksError } = await db.from("offer_page_products")
        .select("product_id").eq("page_id", current.id);
      if (!active) return;
      if (linksError) {
        setError(`تعذر تحميل منتجات الصفحة: ${linksError.message}`); setLoading(false); return;
      }
      const ids = (links ?? []).map((row: { product_id: string | number }) => row.product_id);
      if (!ids.length) { setProducts([]); setLoading(false); return; }

      const columns = "id,name,image_url,price,discount_percent,category,brand,description,bg_color,bg_color_2,text_color,accent_color";
      let result = await db.from("products").select(columns).in("id", ids).order("name");
      if (result.error && (result.error.code === "42703" || result.error.code === "PGRST204")) {
        result = await db.from("products").select("id,name,image_url,price,discount_percent").in("id", ids).order("name");
      }
      if (!active) return;
      if (result.error) setError(`تعذر تحميل المنتجات: ${result.error.message}`);
      else setProducts((result.data ?? []) as Product[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [slug]);

  const colors = resolveCardColors(page?.theme === "exclusive" ? "exclusive" : "deals", page ?? {});
  return (
    <main dir="rtl" className="min-h-[100dvh] bg-[#f7f4ee] px-4 py-8 text-[#241d15] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {page && <header className="relative mb-8 overflow-hidden rounded-[2rem] p-8 shadow-xl sm:p-12"
          style={{ background: `linear-gradient(105deg, ${colors.bg_color_2}, ${colors.bg_color})`, color: colors.text_color }}>
          {page.badge && <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
            style={{ background: colors.accent_color, color: readableTextOn(colors.accent_color) }}><Tag className="size-4" />{page.badge}</span>}
          <h1 className="mt-4 text-3xl font-black sm:text-5xl">{page.title}</h1>
          {page.description && <p className="mt-3 max-w-2xl leading-7 opacity-85">{page.description}</p>}
          {page.image_url && <img src={page.image_url} alt="" className="mt-5 max-h-56 rounded-2xl object-cover" />}
        </header>}
        {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>}
        {loading ? <div role="status" className="flex items-center justify-center gap-3 rounded-2xl bg-white p-12 text-slate-500"><LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل الصفحة…</div>
          : !error && products.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-slate-500">لا توجد منتجات مضافة لهذه الصفحة بعد.</div>
          : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => {
            const productColors = resolveCardColors("deals", product);
            const discount = Math.max(0, Math.min(100, Number(product.discount_percent) || 0));
            const price = Math.max(0, Number(product.price) || 0);
            return <article key={String(product.id)} className="overflow-hidden rounded-3xl border shadow-sm"
              style={{ background: `linear-gradient(135deg, ${productColors.bg_color}, ${productColors.bg_color_2})`, color: productColors.text_color }}>
              <div className="aspect-[4/3] bg-black/5">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="size-full object-cover" /> : <div className="grid size-full place-items-center"><ShoppingBag className="size-12" /></div>}</div>
              <div className="p-5"><h2 className="font-extrabold">{product.name}</h2>{product.brand && <p className="mt-1 text-sm">الماركة: {product.brand}</p>}{product.description && <p className="mt-2 text-sm leading-6">{product.description}</p>}
              <p className="mt-4 text-xl font-black">{(price * (1 - discount / 100)).toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</p></div>
            </article>;
          })}</div>}
      </div>
    </main>
  );
}

export const Route = createFileRoute("/offers/$slug")({ component: OfferSlugPage });
