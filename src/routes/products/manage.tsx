import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type SyntheticEvent } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

const db = supabase as any;

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  store_id: string | null;
  quantity: number | null;
  sell_price: number | null;
  image_url: string | null;
  product_url: string | null;
  created_at: string | null;
};

type ProductDraft = {
  name: string;
  sku: string;
  quantity: string;
  sell_price: string;
  image_url: string;
  product_url: string;
};

const blankDraft: ProductDraft = {
  name: "",
  sku: "",
  quantity: "0",
  sell_price: "0",
  image_url: "",
  product_url: "",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80";

// نفس عناوين الكود الجديد
const STORE_TITLES: Record<string, string> = {
  aliexpress: 'AliExpress (علي إكسبريس)',
  amazon: 'Amazon (أمازون)',
  shein: 'SHEIN (شي إن)',
  trendyol: 'TrendYol (ترينديول)',
  temu: 'TEMU (تيمو)',
  'local-products': 'Local Products (منتجات محلية)',
  discounts: 'Discounts (تخفيضات وعروض)',
  'ALX-1024': 'AliExpress (علي إكسبريس)',
  'AMZ-2048': 'Amazon (أمازون)',
  'SHN-3072': 'SHEIN (شي إن)',
  'TRL-4096': 'TrendYol (ترينديول)',
  'TMU-5120': 'TEMU (تيمو)',
  'LPR-6144': 'Local Products (منتجات محلية)',
  'DSC-7168': 'Discounts (تخفيضات وعروض)',
};

const STORES = [
  { id: 'ALX-1024', slug: 'aliexpress', color: '#FF4747' },
  { id: 'AMZ-2048', slug: 'amazon', color: '#000' },
  { id: 'SHN-3072', slug: 'shein', color: '#000' },
  { id: 'TRL-4096', slug: 'trendyol', color: '#FF6900' },
  { id: 'TMU-5120', slug: 'temu', color: '#FB7701' },
  { id: 'LPR-6144', slug: 'local-products', color: '#16A34A' },
  { id: 'DSC-7168', slug: 'discounts', color: '#7C3AED' },
];

function ProductsManageRoute() {
  return (
    <AdminRouteGuard>
      <ProductsManager />
    </AdminRouteGuard>
  );
}

export const Route = createFileRoute("/products/manage")({
  component: ProductsManageRoute,
});

function ProductsManager() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let query = db.from("products").select("id,name,sku,store_id,quantity,sell_price,image_url,product_url,created_at").order("created_at", { ascending: false });
      if (selectedStore) query = query.eq("store_id", selectedStore);
      const { data, error: loadError } = await query;
      if (loadError) {
        setError(`تعذر تحميل المنتجات: ${loadError.message}`);
        return;
      }
      setProducts((data ?? []) as ProductRow[]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "خطأ غير معروف";
      setError(`تعذر الاتصال بقاعدة البيانات: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const updateDraft = (key: keyof ProductDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const isValidHttpsUrl = (value: string) => {
    if (!value) return true;
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const name = draft.name.trim();
    const quantity = Number(draft.quantity);
    const sellPrice = Number(draft.sell_price);
    const imageUrl = draft.image_url.trim();
    const productUrl = draft.product_url.trim();

    if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(sellPrice) || sellPrice < 0) {
      setError("تحقق من الاسم والكمية وسعر البيع. يجب أن تكون الأرقام غير سالبة.");
      setNotice("");
      return;
    }
    if (!isValidHttpsUrl(imageUrl) || !isValidHttpsUrl(productUrl)) {
      setError("رابط الصورة ورابط المنتج يجب أن يكونا رابطين صحيحين ويبدآ بـ https://");
      setNotice("");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    const values = { name, sku: draft.sku.trim() || null, store_id: selectedStore || null, quantity, sell_price: sellPrice, image_url: imageUrl || null, product_url: productUrl || null };
    try {
      const result = editingId ? await db.from("products").update(values).eq("id", editingId).select("id").maybeSingle() : await db.from("products").insert(values).select("id").single();
      if (result.error) { setError(`تعذر حفظ المنتج: ${result.error.message}`); return; }
      if (!result.data) { setError("لم يتم الحفظ. تحقق من دور المدير وسياسات RLS"); return; }
      const wasEditing = Boolean(editingId);
      setDraft(blankDraft); setEditingId(null);
      setNotice(wasEditing ? "تم تحديث بطاقة المنتج." : "تمت إضافة بطاقة المنتج.");
      await loadProducts();
    } catch (cause) {
      setError(`حدث خطأ: ${cause instanceof Error ? cause.message : "غير معروف"}`);
    } finally { setBusy(false); }
  };

  const beginEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setDraft({ name: product.name ?? "", sku: product.sku ?? "", quantity: String(product.quantity ?? 0), sell_price: String(product.sell_price ?? 0), image_url: product.image_url ?? "", product_url: product.product_url ?? "" });
    setError(""); setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setDraft(blankDraft); setError(""); setNotice(""); };
  const deleteProduct = async (product: ProductRow) => {
    if (busy || deletingId) return;
    if (!window.confirm(`تأكيد حذف «${product.name}»؟`)) return;
    setDeletingId(product.id); setError(""); setNotice("");
    try {
      const { data, error: deleteError } = await db.from("products").delete().eq("id", product.id).select("id").maybeSingle();
      if (deleteError) { setError(`تعذر حذف المنتج: ${deleteError.message}`); return; }
      if (!data) { setError("لم يُحذف المنتج. تحقق من RLS."); return; }
      setNotice("تم حذف المنتج.");
      if (editingId === product.id) cancelEdit();
      await loadProducts();
    } finally { setDeletingId(null); }
  };
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_IMAGE; };

  const storeDisplayName = selectedStore ? (STORE_TITLES[selectedStore] || selectedStore) : 'كل المتاجر';

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header على شكل الكود الجديد */}
        <header className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Products: <span className="text-blue-600">{storeDisplayName}</span></h1>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{products.length} منتجات</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">إدارة كتالوج المنتجات المعروضة للمتجر المحدد</p>
          </div>
          <a href="/admin" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">→ العودة للشعارات</a>
        </header>

        {/* الـ 7 صور مربعة - رأس الصفحة */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {STORES.map(s => (
            <button key={s.id} onClick={() => setSelectedStore(s.id)} className={`rounded-2xl bg-white p-3 shadow-sm border-2 hover:shadow-xl hover:scale-105 transition-all ${selectedStore===s.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200/80'}`}>
              <div className="aspect-square rounded-xl flex items-center justify-center text-white font-black text-xs" style={{backgroundColor: s.color}}>{s.slug}</div>
              <p className="mt-2 text-[11px] font-bold">{s.id}</p>
            </button>
          ))}
        </div>

        {/* إضافة منتج على شكل الكود الجديد */}
        <section className="mb-10 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">{editingId ? <Pencil className="size-5" /> : <Plus className="size-5" />}{editingId ? "تعديل بطاقة" : "إضافة منتج جديد"}</h2>
          <form onSubmit={saveProduct} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">اسم المنتج</label>
              <input required maxLength={200} value={draft.name} onChange={e=>updateDraft("name", e.target.value)} placeholder="مثال: ساعة ذكية..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">السعر ($)</label>
              <input type="number" min="0" step="0.01" required value={draft.sell_price} onChange={e=>updateDraft("sell_price", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">رابط صورة المنتج (URL)</label>
              <input type="url" value={draft.image_url} onChange={e=>updateDraft("image_url", e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">الكمية</label>
              <input type="number" min="0" step="1" required value={draft.quantity} onChange={e=>updateDraft("quantity", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">كود المنتج</label>
              <input maxLength={100} value={draft.sku} onChange={e=>updateDraft("sku", e.target.value)} placeholder="ALX-1024" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"/>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">رابط المنتج / المتجر</label>
              <input type="url" value={draft.product_url} onChange={e=>updateDraft("product_url", e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"/>
            </div>
            <div className="md:col-span-4 flex flex-wrap gap-2 mt-2">
              <button disabled={busy || Boolean(deletingId)} type="submit" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50">{busy ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "Add Product +"}</button>
              {editingId && <button type="button" disabled={busy} onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold"><X className="size-4" /> إلغاء</button>}
              <button type="button" disabled={loading || busy} onClick={()=>void loadProducts()} className="mr-auto inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> تحديث</button>
            </div>
          </form>
          {draft.image_url && <img src={draft.image_url} alt="معاينة" className="mt-4 size-28 rounded-xl border object-cover" onError={handleImageError} />}
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</p>}
        </section>

        {/* شبكة المنتجات على شكل كروت مثل الكود الجديد */}
        <section>
          {loading ? <p className="p-6 text-sm text-slate-500">جارٍ تحميل المنتجات...</p> : products.length===0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center"><p className="text-base font-bold text-slate-500">لا توجد منتجات مضافة لهذا المتجر بعد.</p><p className="text-xs text-slate-400 mt-1">استخدم النموذج أعلاه لإضافة منتجك الأول</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map(p=>(
                <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden"><img src={p.image_url || FALLBACK_IMAGE} alt={p.name} className="h-full w-full object-cover" onError={handleImageError} /></div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{p.name}</h3>
                    <div className="mt-3 flex items-baseline justify-between"><span className="text-lg font-black text-emerald-600">${Number(p.sell_price ?? 0).toFixed(2)}</span><span className="text-xs text-slate-400 font-mono">{p.sku || `#${p.id.slice(-4)}`}</span></div>
                    <p className="mt-1 text-[11px] text-slate-500">الكمية: {p.quantity ?? 0} {p.product_url && <a href={p.product_url} target="_blank" className="text-blue-600 underline mr-2">فتح الرابط</a>}</p>
                    <div className="mt-5 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                      <button onClick={()=>beginEdit(p)} className="rounded-lg bg-blue-50 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white">Edit</button>
                      <button onClick={()=>void deleteProduct(p)} className="rounded-lg bg-rose-50 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white">{deletingId===p.id ? "جارٍ الحذف..." : "Delete"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
