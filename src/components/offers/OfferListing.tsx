import { useEffect, useState } from "react";
import { LoaderCircle, ShoppingBag, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;
type OfferType = "exclusive" | "deals";
type OfferProduct = { id: string; name: string; image_url: string | null; price: number; discount_percent: number; offer_type: string; store_name: string };
export function OfferListing({ type }: { type: OfferType }) {
  const [products, setProducts] = useState<OfferProduct[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { let active = true; const load = async () => { const { data, error: queryError } = await db.from("products").select("id,name,image_url,price,discount_percent,offer_type,store_name").in("offer_type", type === "deals" ? ["deals", "both"] : ["exclusive", "both"]).order("name"); if (!active) return; setProducts(data ?? []); setError(queryError ? "تعذر تحميل المنتجات حاليًا." : ""); setLoading(false); }; void load(); return () => { active = false; }; }, [type]);
  if (loading) return <div className="flex items-center justify-center gap-2 p-10 text-slate-500"><LoaderCircle className="animate-spin" /> جارٍ تحميل المنتجات…</div>;
  if (error) return <p role="alert" className="rounded-2xl bg-rose-50 p-5 text-center text-rose-700">{error}</p>;
  if (!products.length) return <p className="rounded-2xl border border-dashed border-[#e7dfd1] bg-white p-10 text-center text-slate-500">لا توجد منتجات في هذا القسم حاليًا.</p>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-[#eadfc9] bg-white shadow-sm"><div className="aspect-square bg-[#faf8f3]">{product.image_url ? <img src={product.image_url} alt={product.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[#b88938]"><ShoppingBag className="size-12" /></div>}</div><div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-black">{product.name}</h3><span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-bold text-pink-700"><Tag className="mr-1 inline size-3" />%{product.discount_percent}</span></div><p className="mt-3 text-lg font-black text-[#8b682c]">{Number(product.price).toLocaleString("ar")} ر.س</p><p className="mt-1 text-xs text-slate-500">من {product.store_name}</p></div></article>)}</div>;
}
