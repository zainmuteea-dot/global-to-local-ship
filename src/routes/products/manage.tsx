/**
 * استبدل بهذا الملف كامل محتوى: src/routes/products/manage.tsx
 * هذا هو المسار الفرعي /products/manage، ويعرض لوحة إدارة المنتجات الفعلية.
 * لا تستبدل به src/routes/products.tsx؛ ذلك الملف يبقى صفحة التسوق الأب.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type SyntheticEvent } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

const db = supabase as any;

type StoreRow = { id: string; name: string; location: string | null };
type ProductRow = {
  id: string; name: string; sku: string | null; store_id: string | null;
  quantity: number | null; sell_price: number | null; image_url: string | null;
  product_url: string | null; created_at: string | null;
};
type ProductDraft = {
  name: string; sku: string; quantity: string; sell_price: string;
  image_url: string; product_url: string;
};

const blankDraft: ProductDraft = { name: "", sku: "", quantity: "0", sell_price: "0", image_url: "", product_url: "" };
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80";

function ProductsManageRoute() {
  return <AdminRouteGuard><ProductsManager /></AdminRouteGuard>;
}

export const Route = createFileRoute("/products/manage")({ component: ProductsManageRoute });

function ProductsManager() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [filterStoreId, setFilterStoreId] = useState("");
  const [formStoreId, setFormStoreId] = useState("");
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [storeResult, productResult] = await Promise.all([
      db.from("stores").select("id,name,location").order("name", { ascending: true }),
      db.from("products").select("id,name,sku,store_id,quantity,sell_price,image_url,product_url,created_at").order("created_at", { ascending: false }),
    ]);
    if (storeResult.error) {
      setStores([]);
      setError(`تعذر تحميل المخازن: ${storeResult.error.message}. تأكد من سياسة وصول المدير إلى stores.`);
    } else {
      setStores((storeResult.data ?? []) as StoreRow[]);
    }
    if (productResult.error) {
      setProducts([]);
      setError((previous) => previous ? `${previous} | تعذر تحميل المنتجات: ${productResult.error.message}` : `تعذر تحميل المنتجات: ${productResult.error.message}`);
    } else {
      setProducts((productResult.data ?? []) as ProductRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const visibleProducts = filterStoreId ? products.filter((product) => product.store_id === filterStoreId) : products;
  const updateDraft = (key: keyof ProductDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
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
    if (!formStoreId || !stores.some((store) => store.id === formStoreId)) {
      setError("اختر مخزنًا فعليًا من القائمة قبل حفظ المنتج."); setNotice(""); return;
    }
    if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(sellPrice) || sellPrice < 0) {
      setError("تحقق من الاسم والكمية وسعر البيع. يجب أن تكون الأرقام غير سالبة."); setNotice(""); return;
    }
    if (!isValidHttpsUrl(imageUrl) || !isValidHttpsUrl(productUrl)) {
      setError("رابط الصورة ورابط المنتج يجب أن يكونا صحيحين ويبدآ بـ https://"); setNotice(""); return;
    }
    setBusy(true); setError(""); setNotice("");
    const values = {
      name, sku: draft.sku.trim() || null, store_id: formStoreId,
      quantity, sell_price: sellPrice, image_url: imageUrl || null,
      product_url: productUrl || null,
    };
    try {
      const result = editingId
        ? await db.from("products").update(values).eq("id", editingId).select("id").maybeSingle()
        : await db.from("products").insert(values).select("id").single();
      if (result.error) { setError(`تعذر حفظ المنتج: ${result.error.message}`); return; }
      if (!result.data) { setError("لم يتم الحفظ. تحقق من دور المدير ومنح قاعدة البيانات وسياسات RLS."); return; }
      const wasEditing = Boolean(editingId);
      setDraft(blankDraft); setEditingId(null); setFormStoreId("");
      setNotice(wasEditing ? "تم تحديث المنتج وربطه بالمخزن المحدد." : "تمت إضافة المنتج وربطه بالمخزن المحدد.");
      await loadData();
    } catch (cause) {
      setError(`حدث خطأ: ${cause instanceof Error ? cause.message : "غير معروف"}`);
    } finally { setBusy(false); }
  };

  const beginEdit = (product: ProductRow) => {
    setEditingId(product.id); setFormStoreId(product.store_id ?? "");
    setDraft({ name: product.name ?? "", sku: product.sku ?? "", quantity: String(product.quantity ?? 0), sell_price: String(product.sell_price ?? 0), image_url: product.image_url ?? "", product_url: product.product_url ?? "" });
    setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setFormStoreId(""); setDraft(blankDraft); setError(""); setNotice(""); };

  const deleteProduct = async (product: ProductRow) => {
    if (busy || deletingId) return;
    if (!window.confirm(`تأكيد حذف «${product.name}»؟`)) return;
    setDeletingId(product.id); setError(""); setNotice("");
    try {
      const { data, error: deleteError } = await db.from("products").delete().eq("id", product.id).select("id").maybeSingle();
      if (deleteError) { setError(`تعذر حذف المنتج: ${deleteError.message}`); return; }
      if (!data) { setError("لم يُحذف المنتج. تحقق من سياسة الحذف ودور المدير."); return; }
      setNotice("تم حذف المنتج.");
      if (editingId === product.id) cancelEdit();
      await loadData();
    } finally { setDeletingId(null); }
  };

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_IMAGE;
  };
  const storeName = (storeId: string | null) => stores.find((store) => store.id === storeId)?.name ?? "غير مربوط بمخزن";

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-5 font-sans text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة المنتجات</h1>
            <p className="mt-1 text-sm text-slate-500">المخازن ومعرّفاتها تُحمّل من قاعدة البيانات، ولا تُستخدم رموز ثابتة مكان UUID.</p>
          </div>
          <a href="/admin" className="rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50">العودة للإدارة</a>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button type="button" onClick={() => setFilterStoreId("")} className={`rounded-xl border bg-white p-3 text-sm font-bold ${!filterStoreId ? "border-blue-500 ring-2 ring-blue-100" : ""}`}>كل المخازن</button>
          {stores.map((store) => (
            <button type="button" key={store.id} onClick={() => setFilterStoreId(store.id)} className={`rounded-xl border bg-white p-3 text-right ${filterStoreId === store.id ? "border-blue-500 ring-2 ring-blue-100" : ""}`}>
              <span className="block font-bold">{store.name}</span>
              {store.location && <span className="mt-1 block text-xs text-slate-500">{store.location}</span>}
            </button>
          ))}
        </section>

        {stores.length === 0 && !loading && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">لا توجد مخازن متاحة للاختيار. أضف مخزنًا من صفحة /stores أو تحقق من سياسات RLS.</div>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</p>}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">{editingId ? <Pencil className="size-5" /> : <Plus className="size-5" />}{editingId ? "تعديل المنتج" : "إضافة منتج"}</h2>
          <form onSubmit={saveProduct} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="space-y-1 text-sm font-bold md:col-span-2"><span>اسم المنتج</span><input required maxLength={200} value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-bold"><span>المخزن</span><select required value={formStoreId} onChange={(e) => setFormStoreId(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5"><option value="">اختر مخزنًا</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
            <label className="space-y-1 text-sm font-bold"><span>سعر البيع</span><input type="number" min="0" step="0.01" required value={draft.sell_price} onChange={(e) => updateDraft("sell_price", e.target.value)} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-bold"><span>الكمية</span><input type="number" min="0" step="1" required value={draft.quantity} onChange={(e) => updateDraft("quantity", e.target.value)} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-bold"><span>كود المنتج</span><input maxLength={100} value={draft.sku} onChange={(e) => updateDraft("sku", e.target.value)} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-bold"><span>رابط صورة المنتج</span><input type="url" value={draft.image_url} onChange={(e) => updateDraft("image_url", e.target.value)} placeholder="https://..." className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-bold md:col-span-2"><span>رابط المنتج</span><input type="url" value={draft.product_url} onChange={(e) => updateDraft("product_url", e.target.value)} placeholder="https://..." className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 font-normal" /></label>
            <div className="flex flex-wrap items-end gap-2 md:col-span-4">
              <button disabled={busy || stores.length === 0} type="submit" className="rounded-xl bg-emerald-700 px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة المنتج"}</button>
              {editingId && <button type="button" disabled={busy} onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 font-bold"><X className="size-4" /> إلغاء</button>}
              <button type="button" disabled={loading || busy} onClick={() => void loadData()} className="mr-auto inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-bold"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> تحديث</button>
            </div>
          </form>
          {draft.image_url && <img src={draft.image_url} alt="معاينة المنتج" className="mt-4 size-24 rounded-xl border object-cover" onError={handleImageError} />}
        </section>

        <section>
          <h2 className="mb-3 font-black">المنتجات ({visibleProducts.length})</h2>
          {loading ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">جارٍ التحميل...</p> : visibleProducts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed bg-white p-10 text-center text-sm text-slate-500">لا توجد منتجات في هذا المخزن حتى الآن.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <img src={product.image_url || FALLBACK_IMAGE} alt={product.name} className="h-44 w-full bg-slate-100 object-cover" onError={handleImageError} />
                  <div className="space-y-2 p-4">
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-xs text-slate-500">المخزن: {storeName(product.store_id)}</p>
                    <div className="flex items-center justify-between"><span className="font-black text-emerald-700">${Number(product.sell_price ?? 0).toFixed(2)}</span><span className="text-xs text-slate-500">الكمية: {product.quantity ?? 0}</span></div>
                    <p className="truncate text-xs text-slate-500">{product.sku || "بلا كود"}</p>
                    {product.product_url && <a href={product.product_url} target="_blank" rel="noreferrer" className="block text-xs text-blue-700 underline">فتح رابط المنتج</a>}
                    <div className="grid grid-cols-2 gap-2 border-t pt-3">
                      <button type="button" onClick={() => beginEdit(product)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-50 py-2 text-xs font-bold text-blue-800"><Pencil className="size-3.5" /> تعديل</button>
                      <button type="button" disabled={Boolean(deletingId)} onClick={() => void deleteProduct(product)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 py-2 text-xs font-bold text-rose-800 disabled:opacity-50"><Trash2 className="size-3.5" />{deletingId === product.id ? "جارٍ الحذف" : "حذف"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
