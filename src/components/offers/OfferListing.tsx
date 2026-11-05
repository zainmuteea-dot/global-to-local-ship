import { useEffect, useState } from "react";
import { LoaderCircle, ShoppingBag, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readableTextOn, resolveCardColors, type OfferCardTheme } from "@/lib/offer-card-style";

const db = supabase as any;
const categoryLabels: Record<string, string> = {
  electronics: "إلكترونيات",
  office_supplies: "أدوات مكتبية",
  hookah_supplies: "معسلات الشيشة",
  other: "أخرى",
};
type OfferType = "exclusive" | "deals";
type OfferProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  discount_percent: number;
  offer_type: string;
  category: string | null;
  brand: string | null;
  description: string | null;
  bg_color: string | null;
  bg_color_2: string | null;
  text_color: string | null;
  accent_color: string | null;
};
type OfferPageCard = {
  title: string;
  badge: string;
  description: string;
  theme: OfferCardTheme;
  bg_color: string | null;
  bg_color_2: string | null;
  text_color: string | null;
  accent_color: string | null;
};

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42703" || error.code === "PGRST204" || /column/i.test(error.message ?? "")));
}

async function loadPageCard(targetPath: string) {
  const styledResult = await db
    .from("storefront_offer_cards")
    .select("title,badge,description,theme,bg_color,bg_color_2,text_color,accent_color")
    .eq("target_path", targetPath)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Keep editable text available if this Supabase database has the base card
  // table but the optional custom-color migration has not been applied yet.
  if (!isMissingColumnError(styledResult.error)) return styledResult;

  return db
    .from("storefront_offer_cards")
    .select("title,badge,description,theme")
    .eq("target_path", targetPath)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
}

export function OfferListing({ type }: { type: OfferType }) {
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [pageCard, setPageCard] = useState<OfferPageCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isDeals = type === "deals";

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      setPageCard(null);

      const targetPath = isDeals ? "/deals" : "/exclusive";
      const filters = isDeals ? ["deals", "both"] : ["exclusive", "both"];
      const baseQuery = (columns: string) => db
        .from("products")
        .select(columns)
        .in("offer_type", filters)
        .order("name", { ascending: true });

      const [cardResult, firstProductsResult] = await Promise.all([
        loadPageCard(targetPath),
        baseQuery("id,name,image_url,price,discount_percent,offer_type,bg_color,bg_color_2,text_color,accent_color"),
      ]);

      if (!active) return;
      if (!cardResult.error && cardResult.data) {
        setPageCard(cardResult.data as OfferPageCard);
      }

      let { data, error: queryError } = firstProductsResult;
      if (queryError && (queryError.code === "42703" || queryError.code === "PGRST204" || /column/i.test(queryError.message ?? ""))) {
        ({ data, error: queryError } = await baseQuery("id,name,image_url,price,discount_percent,offer_type"));
      }
      if (!active) return;

      if (queryError) {
        setError(`تعذر تحميل المنتجات: ${queryError.message}`);
        setProducts([]);
        setLoading(false);
        return;
      }

      const baseProducts = ((data ?? []) as Partial<OfferProduct>[]).map((product) => ({
        ...product,
        bg_color: product.bg_color ?? null,
        bg_color_2: product.bg_color_2 ?? null,
        text_color: product.text_color ?? null,
        accent_color: product.accent_color ?? null,
      })) as Omit<OfferProduct, "category" | "brand" | "description">[];

      if (baseProducts.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const [{ data: categoryRows }, { data: detailRows }] = await Promise.all([
        db.from("products").select("id,category").in("id", baseProducts.map((product) => product.id)),
        db.from("products").select("id,brand,description").in("id", baseProducts.map((product) => product.id)),
      ]);
      if (!active) return;

      const categories = new Map<string, string | null>(
        (categoryRows ?? []).map((row: { id: string; category: string | null }) => [row.id, row.category] as [string, string | null]),
      );
      const details = new Map<string, { brand: string | null; description: string | null }>(
        (detailRows ?? []).map((row: { id: string; brand: string | null; description: string | null }) => [row.id, { brand: row.brand, description: row.description }]),
      );
      setProducts(baseProducts.map((product) => ({
        ...product,
        category: categories.get(product.id) ?? null,
        brand: details.get(product.id)?.brand ?? null,
        description: details.get(product.id)?.description ?? null,
      })));
      setLoading(false);
    };

    void load();
    return () => { active = false; };
  }, [isDeals]);

  const fallbackTheme: OfferCardTheme = isDeals ? "deals" : "exclusive";
  const theme: OfferCardTheme = pageCard?.theme === "exclusive" ? "exclusive" : fallbackTheme;
  const colors = resolveCardColors(theme, pageCard ?? {});
  const badge = pageCard?.badge ?? (isDeals ? "تخفيضات مختارة" : "اختيارات خاصة");
  const title = pageCard?.title ?? (isDeals ? "تخفيضات حتى 70%" : "عروض حصرية");
  const description = pageCard?.description ?? (isDeals
    ? "اكتشف المنتجات المتاحة ضمن التخفيضات الحالية."
    : "منتجات مختارة ضمن العروض الحصرية لمتجرنا.");

  return (
    <main dir="rtl" className="min-h-[100dvh] bg-[#f7f4ee] px-4 py-10 text-[#241d15] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header
          className="relative mb-8 overflow-hidden rounded-[2rem] p-8 shadow-xl sm:p-12"
          style={{
            background: `linear-gradient(105deg, ${colors.bg_color_2}, ${colors.bg_color})`,
            color: colors.text_color,
          }}
        >
          <div className="relative z-10 max-w-2xl">
            {badge.trim() && (
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
                style={{ background: colors.accent_color, color: readableTextOn(colors.accent_color) }}
              >
                <Tag className="size-4" /> {badge}
              </span>
            )}
            <h1 className="mt-5 text-3xl font-black sm:text-5xl">{title}</h1>
            {description.trim() && <p className="mt-4 text-sm leading-7 opacity-80 sm:text-base">{description}</p>}
          </div>
          <div
            aria-hidden="true"
            className="absolute -left-10 -top-16 size-64 rounded-full border-[35px] border-white/10"
          />
        </header>

        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p>}
        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 rounded-2xl bg-white p-14 text-gray-500">
            <LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل المنتجات…
          </div>
        ) : products.length === 0 && !error ? (
          <div className="rounded-2xl bg-white p-14 text-center text-gray-500">لا توجد منتجات في هذه العروض حاليًا.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const originalPrice = Math.max(0, Number(product.price) || 0);
              const discount = Math.max(0, Math.min(100, Number(product.discount_percent) || 0));
              const salePrice = originalPrice * (1 - discount / 100);
              const productColors = resolveCardColors(product.offer_type === "exclusive" ? "exclusive" : "deals", product);
              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${productColors.bg_color}, ${productColors.bg_color_2})`,
                    color: productColors.text_color,
                    borderColor: productColors.bg_color_2,
                  }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center opacity-70"><ShoppingBag className="size-12" /></div>
                    )}
                    <span
                      className="absolute right-4 top-4 rounded-full px-3 py-2 text-xs font-black shadow-lg"
                      style={{ background: productColors.accent_color, color: readableTextOn(productColors.accent_color) }}
                    >
                      خصم %{discount}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-xs opacity-80">
                      <span>{product.offer_type === "both" ? "عرض حصري وتخفيض" : isDeals ? "تخفيض" : "عرض حصري"}</span>
                      {product.category && (
                        <span className="rounded-full px-2.5 py-1 font-bold" style={{ background: productColors.accent_color, color: readableTextOn(productColors.accent_color) }}>
                          {categoryLabels[product.category] ?? product.category}
                        </span>
                      )}
                    </div>
                    <h2 className="line-clamp-2 min-h-12 font-extrabold leading-6">{product.name}</h2>
                    {product.brand && <p className="mt-1 text-sm font-bold opacity-85">الماركة: {product.brand}</p>}
                    {product.description && <p className="mt-2 line-clamp-3 text-sm leading-6 opacity-80">{product.description}</p>}
                    <div className="mt-4 flex flex-wrap items-baseline gap-2">
                      {discount > 0 && <span className="text-sm line-through opacity-60">{originalPrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</span>}
                      <strong className="text-xl font-black">{salePrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</strong>
                    </div>
                    <p className="mt-1 text-xs opacity-70">{discount > 0 ? "السعر بعد الخصم" : "سعر البيع"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
