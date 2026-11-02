import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ImagePlus, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type OfferType = "exclusive" | "deals" | "both";
type StoreName = "SHEIN" | "Noon" | "TEMU" | "AliExpress" | "Amazon" | "eBay";
type OfferProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  discount_percent: number;
  offer_type: OfferType;
  store_name: StoreName;
};

type ProductForm = {
  name: string;
  image_url: string;
  price: string;
  discount_percent: string;
  offer_type: OfferType | "";
  store_name: StoreName | "";
};

const emptyForm: ProductForm = {
  name: "",
  image_url: "",
  price: "",
  discount_percent: "70",
  offer_type: "",
  store_name: "",
};

const storeOptions: StoreName[] = ["SHEIN", "Noon", "TEMU", "AliExpress", "Amazon", "eBay"];
const offerLabels: Record<OfferType, string> = {
  exclusive: "عروض حصرية",
  deals: "تخفيضات حتى 70%",
  both: "الاثنين معًا",
};
const inputClass =
  "mt-2 w-full rounded-xl border border-[#e7dfd1] bg-white px-4 py-3 text-sm text-[#241d15] outline-none transition focus:border-[#b88938] focus:ring-2 focus:ring-[#b88938]/15";

function AdminOffersPage() {
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await db
      .from("products")
      .select("id,name,image_url,price,discount_percent,offer_type,store_name")
      .in("offer_type", ["exclusive", "deals", "both"])
      .order("name", { ascending: true });

    if (queryError) {
      setError(`تعذر تحميل المنتجات: ${queryError.message}`);
      setProducts([]);
    } else {
      setProducts((data ?? []) as OfferProduct[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = (product: OfferProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name ?? "",
      image_url: product.image_url ?? "",
      price: String(product.price ?? ""),
      discount_percent: String(product.discount_percent ?? 0),
      offer_type: product.offer_type,
      store_name: product.store_name,
    });
    setError("");
    setNotice("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = form.name.trim();
    const imageUrl = form.image_url.trim();
    const price = Number(form.price);
    const discount = Number(form.discount_percent);

    if (!name) return setError("اكتب اسم المنتج.");
    if (!Number.isFinite(price) || price < 0) return setError("أدخل سعرًا أصليًا صحيحًا.");
    if (!Number.isInteger(discount) || discount < 0 || discount > 100) {
      return setError("نسبة الخصم يجب أن تكون عددًا صحيحًا بين 0 و100.");
    }
    if (!form.offer_type || !form.store_name) return setError("اختر نوع العرض والمتجر.");
    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== "https:") throw new Error("https required");
      } catch {
        return setError("أدخل رابط صورة صحيحًا يبدأ بـ https://، أو اتركه فارغًا.");
      }
    }

    const payload = {
      name,
      image_url: imageUrl || null,
      price,
      discount_percent: discount,
      offer_type: form.offer_type,
      store_name: form.store_name,
    };

    setSaving(true);
    const result = editingId
      ? await db.from("products").update(payload).eq("id", editingId)
      : await db.from("products").insert(payload);
    setSaving(false);

    if (result.error) {
      setError(`لم يُحفظ المنتج: ${result.error.message}`);
      return;
    }

    closeForm();
    setNotice(editingId ? "تم تحديث المنتج بنجاح." : "تمت إضافة المنتج بنجاح.");
    await loadProducts();
  };

  const deleteProduct = async (product: OfferProduct) => {
    if (!window.confirm(`هل تريد حذف «${product.name}»؟`)) return;
    setError("");
    setNotice("");
    setDeletingId(product.id);
    const { error: deleteError } = await db.from("products").delete().eq("id", product.id);
    setDeletingId(null);

    if (deleteError) {
      setError(`لم يُحذف المنتج من قاعدة البيانات: ${deleteError.message}`);
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setNotice("تم حذف المنتج.");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f4ee] px-4 py-8 text-[#241d15] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 rounded-3xl bg-[#211b14] p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-9">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.22em] text-[#d9b96e]">YOUR GLOBAL SHOPPER · OFFERS</p>
            <h1 className="text-2xl font-black sm:text-3xl">إضافة منتجات للعروض والتخفيضات</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              أدر المنتجات التي تظهر للعملاء في صفحات العروض الحصرية والتخفيضات.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#d7b25e] to-[#f2d994] px-6 py-4 font-extrabold text-[#211b14] shadow-lg transition hover:brightness-105"
          >
            <Plus className="size-5" /> إضافة منتج جديد
          </button>
        </header>

        {notice && (
          <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </p>
        )}

        {formOpen && (
          <form onSubmit={saveProduct} className="mb-8 rounded-3xl border border-[#eadfc9] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#a47b32]">{editingId ? "تعديل المنتج" : "منتج جديد"}</p>
                <h2 className="mt-1 text-xl font-black">{editingId ? "حدّث تفاصيل العرض" : "أدخل تفاصيل المنتج"}</h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="إغلاق النموذج"
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-bold">
                اسم المنتج
                <input
                  required
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: حقيبة نسائية"
                />
              </label>

              <label className="text-sm font-bold">
                رابط صورة المنتج
                <input
                  type="url"
                  className={inputClass}
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </label>

              <label className="text-sm font-bold">
                السعر الأصلي
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                />
              </label>

              <label className="text-sm font-bold">
                نسبة الخصم (%)
                <input
                  required
                  min="0"
                  max="100"
                  step="1"
                  type="number"
                  className={inputClass}
                  value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                  placeholder="70"
                />
              </label>

              <label className="text-sm font-bold">
                نوع العرض
                <select
                  required
                  className={inputClass}
                  value={form.offer_type}
                  onChange={(e) =>
                    setForm({ ...form, offer_type: e.target.value as ProductForm["offer_type"] })
                  }
                >
                  <option value="">اختر نوع العرض</option>
                  <option value="exclusive">عروضات حصرية</option>
                  <option value="deals">تخفيضات حتى 70%</option>
                  <option value="both">الاثنين معاً</option>
                </select>
              </label>

              <label className="text-sm font-bold">
                المتجر
                <select
                  required
                  className={inputClass}
                  value={form.store_name}
                  onChange={(e) =>
                    setForm({ ...form, store_name: e.target.value as ProductForm["store_name"] })
                  }
                >
                  <option value="">اختر المتجر</option>
                  {storeOptions.map((store) => (
                    <option key={store} value={store}>
                      {store}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={saving}
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#b88938] to-[#e5c675] px-6 py-3 font-extrabold text-[#211b14] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "جارٍ الحفظ…" : "حفظ المنتج"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-600 hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        <section className="overflow-hidden rounded-3xl border border-[#eadfc9] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0eadf] px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-black">منتجات العروض</h2>
              <p className="mt-1 text-sm text-gray-500">{products.length} منتج</p>
            </div>
            <span className="rounded-full bg-[#fbf4e2] p-3 text-[#a47b32]">
              <ImagePlus className="size-5" />
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
              <LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل المنتجات…
            </div>
          ) : products.length === 0 ? (
            <p className="p-12 text-center text-sm text-gray-500">لا توجد منتجات عروض حاليًا.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead className="bg-[#faf8f3] text-xs text-gray-500">
                  <tr>
                    {["الصورة", "الاسم", "السعر الأصلي", "الخصم", "نوع العرض", "المتجر", "إجراء"].map((label) => (
                      <th key={label} className="px-4 py-4 font-bold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eadf]">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-[#fffdf8]">
                      <td className="px-4 py-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="size-14 rounded-xl object-cover" />
                        ) : (
                          <span className="grid size-14 place-items-center rounded-xl bg-gray-100 text-xs text-gray-400">
                            لا صورة
                          </span>
                        )}
                      </td>
                      <td className="max-w-56 px-4 py-3 font-bold">{product.name}</td>
                      <td className="px-4 py-3">{Number(product.price).toLocaleString("ar")} ر.س</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-pink-100 px-3 py-1 font-bold text-pink-700">
                          خصم %{product.discount_percent}
                        </span>
                      </td>
                      <td className="px-4 py-3">{offerLabels[product.offer_type]}</td>
                      <td className="px-4 py-3">{product.store_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            aria-label={`تعديل ${product.name}`}
                            className="rounded-lg border border-[#eadfc9] p-2 text-[#8b682c] hover:bg-[#fbf4e2]"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === product.id}
                            onClick={() => void deleteProduct(product)}
                            aria-label={`حذف ${product.name}`}
                            className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/admin/offers")({
  component: () => (
    <AdminRouteGuard>
      <AdminOffersPage />
    </AdminRouteGuard>
  ),
});
