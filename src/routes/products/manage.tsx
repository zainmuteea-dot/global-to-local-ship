import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';

const db = supabase as any;

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  store_id: string | null;
  quantity: number | null;
  sell_price: number | null;
  created_at: string | null;
};

type ProductDraft = {
  name: string;
  sku: string;
  quantity: string;
  sell_price: string;
};

const blankDraft: ProductDraft = { name: '', sku: '', quantity: '0', sell_price: '0' };

function ProductsManageRoute() {
  return <AdminRouteGuard><ProductsManager /></AdminRouteGuard>;
}

export const Route = createFileRoute('/products/manage')({ component: ProductsManageRoute });

function ProductsManager() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await db
      .from('products')
      .select('id,name,sku,store_id,quantity,sell_price,created_at')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(`تعذر تحميل المنتجات: ${loadError.message}`);
    } else {
      setError('');
      setProducts((data ?? []) as ProductRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const updateDraft = (key: keyof ProductDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    const quantity = Number(draft.quantity);
    const sellPrice = Number(draft.sell_price);

    if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(sellPrice) || sellPrice < 0) {
      setError('تحقق من الاسم والكمية وسعر البيع. يجب أن تكون الأرقام غير سالبة.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    const values = {
      name,
      sku: draft.sku.trim() || null,
      quantity,
      sell_price: sellPrice,
      store_id: null,
    };

    const result = editingId
      ? await db.from('products').update(values).eq('id', editingId).select('id').maybeSingle()
      : await db.from('products').insert(values).select('id').single();

    setBusy(false);
    if (result.error) {
      setError(`تعذر حفظ المنتج: ${result.error.message}`);
      return;
    }
    if (!result.data) {
      setError('لم يتم الحفظ. لم تُرجع قاعدة البيانات سجلًا؛ تحقق من دور المدير وسياسات RLS.');
      return;
    }

    setDraft(blankDraft);
    setEditingId(null);
    setNotice(editingId ? 'تم تحديث بطاقة المنتج.' : 'تمت إضافة بطاقة المنتج.');
    await loadProducts();
  };

  const beginEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      sku: product.sku ?? '',
      quantity: String(product.quantity ?? 0),
      sell_price: String(product.sell_price ?? 0),
    });
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setDraft(blankDraft); setError(''); };

  const deleteProduct = async (product: ProductRow) => {
    if (!window.confirm(`تأكيد حذف «${product.name}»؟ لا يمكن التراجع عن الحذف.`)) return;
    setError('');
    setNotice('');
    const { data, error: deleteError } = await db
      .from('products').delete().eq('id', product.id).select('id').maybeSingle();
    if (deleteError) {
      setError(`تعذر حذف المنتج: ${deleteError.message}`);
      return;
    }
    if (!data) {
      setError('لم يُحذف المنتج. تحقق من دور المدير وسياسات RLS.');
      return;
    }
    setNotice('تم حذف المنتج.');
    await loadProducts();
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-black">إدارة المنتجات</h1>
            <p className="mt-1 text-sm text-slate-500">أضف بطاقة أو عدّلها واحذفها. ما تحفظه هنا يظهر للعميل في صفحة المنتجات.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/products" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50"><ExternalLink className="size-4" /> صفحة العميل</a>
            <a href="/admin" className="inline-flex items-center gap-2 rounded-xl bg-[#005696] px-4 py-2 text-sm font-bold text-white hover:bg-[#0F4C81]"><ArrowRight className="size-4" /> لوحة الإدارة</a>
          </div>
        </header>

        <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">{editingId ? <Pencil className="size-5" /> : <Plus className="size-5" />}{editingId ? 'تعديل بطاقة' : 'إضافة بطاقة جديدة'}</h2>
          <form onSubmit={saveProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input required maxLength={200} value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} placeholder="اسم المنتج" className="rounded-xl border p-3 text-sm" />
            <input maxLength={100} value={draft.sku} onChange={(e) => updateDraft('sku', e.target.value)} placeholder="كود المنتج (اختياري)" className="rounded-xl border p-3 text-sm" />
            <label className="space-y-1 text-xs font-bold text-slate-600">الكمية<input type="number" min="0" step="1" value={draft.quantity} onChange={(e) => updateDraft('quantity', e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal text-slate-900" /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">سعر البيع<input type="number" min="0" step="0.01" value={draft.sell_price} onChange={(e) => updateDraft('sell_price', e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal text-slate-900" /></label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#005696] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? 'جارٍ الحفظ…' : editingId ? 'حفظ التعديل' : 'إضافة البطاقة'}</button>
              {editingId && <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold"><X className="size-4" /> إلغاء</button>}
              <button type="button" onClick={() => void loadProducts()} className="mr-auto inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"><RefreshCw className="size-4" /> تحديث</button>
            </div>
          </form>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4"><h2 className="font-black">بطاقات المنتجات</h2><span className="text-sm text-slate-500">{products.length} منتج</span></div>
          {loading ? <p role="status" className="p-6 text-sm text-slate-500">جارٍ تحميل المنتجات…</p> : products.length === 0 ? <p className="p-6 text-sm text-slate-500">لا توجد بطاقات محفوظة بعد.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">المنتج</th><th className="p-3">الكود</th><th className="p-3">الكمية</th><th className="p-3">سعر البيع</th><th className="p-3">الإجراءات</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t"><td className="p-3 font-bold">{product.name}</td><td className="p-3">{product.sku || '—'}</td><td className="p-3">{product.quantity ?? 0}</td><td className="p-3">{Number(product.sell_price ?? 0).toLocaleString()}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => beginEdit(product)} className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900"><Pencil className="size-3.5" /> تعديل</button><button type="button" onClick={() => void deleteProduct(product)} className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-800"><Trash2 className="size-3.5" /> حذف</button></div></td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </main>
  );
}
