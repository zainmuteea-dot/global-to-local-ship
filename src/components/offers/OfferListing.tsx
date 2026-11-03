import { useEffect, useState } from "react";
import { LoaderCircle, ShoppingBag, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
type OfferType = "exclusive" | "deals";
type OfferProduct = {
  id: string;
  name: string;
  image_url: string | null;
  sell_price: number;
  discount_percent: number;
  offer_type: string;
  store_name: string;
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
      const { data, error: queryError } = await db
        .from("products")
        .select("id,name,image_url,sell_price,discount_percent,offer_type,store_name")
        .in("offer_type", isDeals ? ["deals", "both"] : ["exclusive", "both"])
        .order("name", { ascending: true });
      if (!active) return;
      if (queryError) {
        setError(`تعذر تحميل المنتجات: ${queryError.message}`);
        setProducts([]);
      } else {
        setProducts((data ?? []) as OfferProduct[]);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [isDeals]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f4ee] px-4 py-10 text-[#241d15] sm:px-6 lg:px-10">
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
              const sellPrice = Number(product.sell_price) || 0;
              const discount = Math.max(0, Math.min(100, Number(product.discount_percent) || 0));
              return (
                <article key={product.id} className="group overflow-hidden rounded-3xl border border-[#eadfc9] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f2eee5]">
                    {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-[#a99c85]"><ShoppingBag className="size-12" /></div>}
                    <span className="absolute right-4 top-4 rounded-full bg-pink-600 px-3 py-2 text-xs font-black text-white shadow-lg">خصم %{discount}</span>
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500"><span>{product.store_name || "متجر"}</span><span>{product.offer_type === "both" ? "عرض حصري وتخفيض" : isDeals ? "تخفيض" : "عرض حصري"}</span></div>
                    <h2 className="line-clamp-2 min-h-12 font-extrabold leading-6">{product.name}</h2>
                    <div className="mt-4 flex flex-wrap items-baseline gap-2"><strong className="text-xl text-[#8a6424]">{sellPrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</strong></div>
                    <p className="mt-1 text-xs text-gray-500">سعر البيع</p>
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
