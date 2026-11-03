import { useEffect, useState } from "react";
import { LoaderCircle, ShoppingBag, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
};

export function OfferListing({ type }: { type: OfferType }) {
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isDeals = type === "deals";

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      const filters = isDeals ? ["deals", "both"] : ["exclusive", "both"];
      const { data, error: queryError } = await db
        .from("products")
        .select("id,name,image_url,price,discount_percent,offer_type")
        .in("offer_type", filters)
        .order("name", { ascending: true });
      if (!active) return;
      if (queryError) {
        setError(`تعذر تحميل المنتجات: ${queryError.message}`);
        setProducts([]);
      } else {
        const baseProducts = (data ?? []) as Omit<OfferProduct, "category" | "brand" | "description">[];
        const { data: categoryRows } = await db
          .from("products")
          .select("id,category")
          .in("id", baseProducts.map((product) => product.id));
        const categories = new Map<string, string | null>((categoryRows ?? []).map((row: { id: string; category: string | null }) => [row.id, row.category] as [string, string | null]));
        const { data: detailRows } = await db
          .from("products")
          .select("id,brand,description")
          .in("id", baseProducts.map((product) => product.id));
        const details = new Map<string, { brand: string | null; description: string | null }>(
          (detailRows ?? []).map((row: { id: string; brand: string | null; description: string | null }) => [row.id, { brand: row.brand, description: row.description }]),
        );
        setProducts(baseProducts.map((product) => ({
          ...product,
          category: categories.get(product.id) ?? null,
          brand: details.get(product.id)?.brand ?? null,
          description: details.get(product.id)?.description ?? null,
        })));
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [isDeals]);

  return (
    <main dir="rtl" className="min-h-[100dvh] bg-[#f7f4ee] px-4 py-10 text-[#241d15] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className={`relative mb-8 overflow-hidden rounded-[2rem] p-8 text-white shadow-xl sm:p-12 ${isDeals ? "bg-gradient-to-l from-[#562339] to-[#a34766]" : "bg-gradient-to-l from-[#211b14] to-[#5b4526]"}`}>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold"><Tag className="size-4" /> {isDeals ? "تخفيضات مختارة" : "اختيارات خاصة"}</span>
            <h1 className="mt-5 text-3xl font-black sm:text-5xl">{isDeals ? "تخفيضات حتى 70%" : "عروض حصرية"}</h1>
            <p className="mt-4 text-sm leading-7 text-white/75 sm:text-base">{isDeals ? "اكتشف المنتجات المتاحة ضمن التخفيضات الحالية." : "منتجات مختارة ضمن العروض الحصرية لمتجرنا."}</p>
          </div>
          <div aria-hidden="true" className="absolute -left-10 -top-16 size-64 rounded-full border-[35px] border-white/5" />
        </header>

        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p>}
        {loading ? <div role="status" className="flex items-center justify-center gap-3 rounded-2xl bg-white p-14 text-gray-500"><LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل المنتجات…</div> : products.length === 0 && !error ? <div className="rounded-2xl bg-white p-14 text-center text-gray-500">لا توجد منتجات في هذه العروض حاليًا.</div> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const originalPrice = Math.max(0, Number(product.price) || 0);
              const discount = Math.max(0, Math.min(100, Number(product.discount_percent) || 0));
              const salePrice = originalPrice * (1 - discount / 100);
              return (
                <article key={product.id} className="group overflow-hidden rounded-3xl border border-[#eadfc9] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f2eee5]">
                    {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-[#a99c85]"><ShoppingBag className="size-12" /></div>}
                    <span className="absolute right-4 top-4 rounded-full bg-pink-600 px-3 py-2 text-xs font-black text-white shadow-lg">خصم %{discount}</span>
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-xs text-gray-500"><span>{product.offer_type === "both" ? "عرض حصري وتخفيض" : isDeals ? "تخفيض" : "عرض حصري"}</span>{product.category && <span className="rounded-full bg-[#f7efe0] px-2.5 py-1 font-bold text-[#8a6424]">{categoryLabels[product.category] ?? product.category}</span>}</div>
                    <h2 className="line-clamp-2 min-h-12 font-extrabold leading-6">{product.name}</h2>
                    {product.brand && <p className="mt-1 text-sm font-bold text-[#8a6424]">الماركة: {product.brand}</p>}
                    {product.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{product.description}</p>}
                    <div className="mt-4 flex flex-wrap items-baseline gap-2">{discount > 0 && <span className="text-sm text-gray-400 line-through">{originalPrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</span>}<strong className="text-xl text-[#8a6424]">{salePrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</strong></div>
                    <p className="mt-1 text-xs text-gray-500">{discount > 0 ? "السعر بعد الخصم" : "سعر البيع"}</p>
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
