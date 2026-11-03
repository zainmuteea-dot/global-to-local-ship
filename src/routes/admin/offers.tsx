import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ImagePlus, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type OfferType = "exclusive" | "deals" | "both";
type OfferProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  discount_percent: number;
  offer_type: OfferType;
};

type ProductForm = {
  name: string;
  image_url: string;
  price: string;
  discount_percent: string;
  offer_type: OfferType | "";
};

const emptyForm: ProductForm = {
  name: "",
  image_url: "",
  price: "",
  discount_percent: "70",
  offer_type: "",
};

const offerLabels: Record<OfferType, string> = {
  exclusive: "عروض حصرية",
  deals: "تخفيضات حتى 70%",
  both: "الاثنين معًا",
};
const inputClass =
  "mt-2 w-full rounded-xl border border-[#C9DCEB] bg-white px-4 py-3 text-sm text-[#0A2540] outline-none transition focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/15";

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
  const [typeFilter, setTypeFilter] = useState<OfferType | "all">("all");
  const visibleProducts = typeFilter === "all" ? products : products.filter((p) => p.offer_type === typeFilter);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await db
      .from("products")
      .select("id,name,image_url,price,discount_percent,offer_type")
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
    if (!Number.isFinite(price) || price < 0) return setError("أدخل سعرًا قبل الخصم صحيحًا.");
    if (!Number.isInteger(discount) || discount < 0 || discount > 100) {
      return setError("نسبة الخصم يجب أن تكون عددًا صحيحًا بين 0 و100.");
    }
    if (!form.offer_type) return setError("اختر نوع العرض.");
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
    <main dir="rtl" className="min-h-screen bg-[#F3F8FC] px-4 py-8 text-[#0A2540] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-[#DCEAF4] bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <div className="mb-5 flex flex-col items-center border-b border-[#E6F0F7] pb-5 text-center">
              <img src="/al-shameel-shopping-logo.jpeg" alt="شعار AL SHAMEEL SHOPPING" className="mb-3 size-28 rounded-2xl bg-white object-contain" />
              <h2 className="text-lg font-black text-[#0F4C81]">السوق الشامل</h2>
              <p className="mt-1 text-xs font-bold tracking-wide text-[#F97316]">AL SHAMEEL SHOPPING</p>
            </div>
            <button
              type="button"
              onClick={openNewForm}
              className="mb-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#0284C7] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105"
            >
              <Plus className="size-5" /> إضافة منتج جديد
            </button>
            <div className="space-y-2" role="group" aria-label="فلترة أنواع العروض">
              <p className="px-1 pb-1 text-xs font-black text-[#0A2540]">تصنيف المنتجات</p>
              {(["exclusive", "deals", "both"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  aria-pressed={typeFilter === key}
                  className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-right text-sm font-bold transition ${typeFilter === key ? "border-[#F97316] bg-orange-50 text-[#0F4C81] shadow-sm" : "border-[#DCEAF4] bg-white text-slate-600 hover:border-[#0284C7] hover:bg-sky-50"}`}
                >
                  <span>{offerLabels[key]}</span>
                  {typeFilter === key && <span className="size-2 rounded-full bg-[#F97316]" aria-hidden="true" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                aria-pressed={typeFilter === "all"}
                className={`mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border px-3 text-sm font-extrabold transition ${typeFilter === "all" ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-[#DCEAF4] bg-[#F7FAFC] text-[#0F4C81] hover:bg-sky-50"}`}
              >
                عرض الكل
              </button>
            </div>
          </aside>
          <div className="min-w-0">
        <header className="mb-8 flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-l from-[#0F4C81] to-[#0284C7] p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-9">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.22em] text-[#FDBA74]">AL SHAMEEL SHOPPING · OFFERS</p>
            <h1 className="text-2xl font-black sm:text-3xl">إضافة منتجات للعروض والتخفيضات</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              أضف منتجاتك وحدد سعرها ونسبة خصمها بنفسك، دون ربطها بأي متجر خارجي.
            </p>
          </div>

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
          <form onSubmit={saveProduct} className="mb-8 rounded-3xl border border-[#DCEAF4] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#F97316]">{editingId ? "تعديل المنتج" : "منتج جديد"}</p>
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
                السعر قبل الخصم
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

            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={saving}
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#0284C7] px-6 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
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

        <section className="overflow-hidden rounded-3xl border border-[#DCEAF4] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E6F0F7] px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-black">منتجات العروض</h2>
              <p className="mt-1 text-sm text-gray-500">{visibleProducts.length} من {products.length} منتج</p>
            </div>
            <span className="rounded-full bg-[#EAF5FC] p-3 text-[#F97316]">
              <ImagePlus className="size-5" />
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
              <LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل المنتجات…
            </div>
          ) : visibleProducts.length === 0 ? (
            <p className="p-12 text-center text-sm text-gray-500">لا توجد منتجات عروض حاليًا.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead className="bg-[#F7FAFC] text-xs text-gray-500">
                  <tr>
                    {["الصورة", "الاسم", "السعر قبل الخصم", "السعر بعد الخصم", "الخصم", "نوع العرض", "إجراء"].map((label) => (
                      <th key={label} className="px-4 py-4 font-bold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6F0F7]">
                  {visibleProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#F8FBFE]">
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
                      <td className="px-4 py-3 font-bold text-[#0F4C81]">{(Number(product.price) * (1 - Number(product.discount_percent) / 100)).toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700">
                          خصم %{product.discount_percent}
                        </span>
                      </td>
                      <td className="px-4 py-3">{offerLabels[product.offer_type]}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            aria-label={`تعديل ${product.name}`}
                            className="rounded-lg border border-[#DCEAF4] p-2 text-[#0284C7] hover:bg-[#EAF5FC]"
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
        </div>
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
