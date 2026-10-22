import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, ArrowRightFromLine, Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

type Product = { id: string; name: string; price: number; imageUrl: string };
type Store = { name: string; arabicLabel?: string; color: string; code: string };

const STORES: Record<string, Store> = {
  aliexpress: { name: "AliExpress", color: "#FF4747", code: "ALX-1024" },
  amazon: { name: "Amazon", color: "#000000", code: "AMZ-2048" },
  shein: { name: "SHEIN", color: "#000000", code: "SHN-3072" },
  trendyol: { name: "TrendYol", color: "#FF6900", code: "TRL-4096" },
  temu: { name: "TEMU", color: "#FB7701", code: "TMU-5120" },
  "local-products": { name: "Local Products", arabicLabel: "منتجات محلية", color: "#16A34A", code: "LPR-6144" },
  discounts: { name: "Discounts", arabicLabel: "تخفيضات وعروض", color: "#7C3AED", code: "DSC-7168" },
};

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%23f1f5f9'/%3E%3Cpath d='M230 275l65-72 48 52 37-41 56 61H230z' fill='%2394a3b8'/%3E%3Ccircle cx='385' cy='165' r='24' fill='%2394a3b8'/%3E%3C/svg%3E";
const SEED_PRODUCTS: Record<string, Product[]> = {
  aliexpress: [
    { id: "alx-demo-1", name: "سماعات لاسلكية", price: 18.5, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80" },
    { id: "alx-demo-2", name: "ساعة ذكية", price: 32, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80" },
  ],
  amazon: [
    { id: "amz-demo-1", name: "سماعات رأس", price: 79.99, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80" },
  ],
  shein: [
    { id: "shn-demo-1", name: "حقيبة يومية", price: 24.5, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80" },
  ],
  trendyol: [], temu: [], "local-products": [], discounts: [],
};

function LogoProductsPage() {
  const { slug } = Route.useParams();
  const store = STORES[slug];
  const [productsBySlug, setProductsBySlug] = useState<Record<string, Product[]>>({});
  const products = productsBySlug[slug] ?? SEED_PRODUCTS[slug] ?? [];
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState("");

  const countLabel = useMemo(() => `${products.length} منتج`, [products.length]);
  const updateProducts = (next: Product[]) => setProductsBySlug((current) => ({ ...current, [slug]: next }));

  const addProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedPrice = Number(price);
    if (!name.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) return;
    const newProduct: Product = { id: `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name.trim(), price: parsedPrice, imageUrl: imageUrl.trim() || FALLBACK_IMAGE };
    updateProducts([newProduct, ...products]);
    setName(""); setPrice(""); setImageUrl("");
    setNotice("أُضيف المنتج إلى القائمة الحالية.");
  };

  const deleteProduct = (product: Product) => {
    if (!window.confirm(`حذف المنتج «${product.name}»؟`)) return;
    updateProducts(products.filter((item) => item.id !== product.id));
    setNotice("تم حذف المنتج من القائمة الحالية.");
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !editing.name.trim() || !Number.isFinite(editing.price) || editing.price < 0) return;
    updateProducts(products.map((item) => item.id === editing.id ? { ...editing, name: editing.name.trim(), imageUrl: editing.imageUrl.trim() || FALLBACK_IMAGE } : item));
    setEditing(null);
    setNotice("تم تحديث المنتج في القائمة الحالية.");
  };

  if (!store) return <AdminRouteGuard><main dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">المتجر غير موجود</h1><p className="mt-2 text-slate-500">المسار المختصر لا يطابق أحد المتاجر السبعة.</p><Link to="/admin/logos/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white"><ArrowRight className="size-4" /> العودة للشعارات</Link></div></main></AdminRouteGuard>;

  return (
    <AdminRouteGuard>
      <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">{store.code}</p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Products: <span dir="ltr">{slug}</span></h1>
              <p className="mt-2 text-sm text-slate-500">{store.name}{store.arabicLabel ? ` • ${store.arabicLabel}` : ""} <span className="mx-1">·</span><span className="font-bold text-slate-700">{countLabel}</span></p>
            </div>
            <Link to="/admin/logos/" className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"><ArrowRight className="size-4" /> العودة إلى الشعارات</Link>
          </header>

          {notice && <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><span>{notice}</span><button type="button" aria-label="إغلاق التنبيه" onClick={() => setNotice("")}><X className="size-4" /></button></div>}

          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5"><h2 className="text-xl font-black">إضافة منتج</h2><p className="mt-1 text-sm text-slate-500">أدخل الاسم والسعر ورابط صورة المنتج.</p></div>
            <form onSubmit={addProduct} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_1.5fr_auto] xl:items-end">
              <label className="text-sm font-bold text-slate-700">اسم المنتج<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: سماعات لاسلكية" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50" /></label>
              <label className="text-sm font-bold text-slate-700">السعر<input required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" dir="ltr" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-left outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50" /></label>
              <label className="text-sm font-bold text-slate-700">رابط صورة المنتج<input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/product.jpg" dir="ltr" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-left outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50" /></label>
              <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"><Plus className="size-5" /> Add Product +</button>
            </form>
          </section>

          <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black">المنتجات</h2><p className="mt-1 text-sm text-slate-500">{countLabel}</p></div></div>
          {products.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Plus className="size-7" /></div><h3 className="mt-4 text-lg font-black">لا توجد منتجات بعد</h3><p className="mt-1 text-sm text-slate-500">أضف أول منتج لهذا المتجر من النموذج أعلاه.</p></div> : <section aria-label="قائمة المنتجات" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => <article key={product.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-2xl">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100"><img src={product.imageUrl || FALLBACK_IMAGE} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /></div>
              <div className="p-4"><h3 className="line-clamp-2 min-h-12 font-black text-slate-900">{product.name}</h3><p className="mt-2 text-lg font-black text-emerald-700">{product.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">السعر</span></p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditing({ ...product })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"><Pencil className="size-4" /> Edit</button><button type="button" onClick={() => deleteProduct(product)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"><Trash2 className="size-4" /> Delete</button></div></div>
            </article>)}
          </section>}

          <div className="mt-8"><Link to="/admin/logos/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowRight className="size-4" /> عودة إلى الشعارات</Link></div>
        </div>

        {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section role="dialog" aria-modal="true" aria-labelledby="edit-product-title" dir="rtl" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 id="edit-product-title" className="text-xl font-black">تعديل المنتج</h2><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="إغلاق"><X className="size-5" /></button></div><form onSubmit={saveEdit} className="space-y-4"><label className="block text-sm font-bold">اسم المنتج<input required maxLength={120} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500" /></label><label className="block text-sm font-bold">السعر<input required type="number" min="0" step="0.01" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500" /></label><label className="block text-sm font-bold">رابط صورة المنتج<input type="url" value={editing.imageUrl} onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })} dir="ltr" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left outline-none focus:border-blue-500" /></label><div className="flex justify-start gap-2 pt-2"><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700"><Save className="size-4" /> حفظ</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-50">إلغاء</button></div></form></section></div>}
      </main>
    </AdminRouteGuard>
  );
}

export const Route = createFileRoute("/admin/logos/$slug")({ component: LogoProductsPage });
