import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
import { ArrowRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

type Product = { id: string; name: string; price: number; imageUrl: string };
type LogoItem = { slug: string; name: string; code: string; color: string; arabicLabel?: string };
const LOGOS_KEY = "your-global-shopper.admin-logos.v1";
const PRODUCTS_KEY = "your-global-shopper.admin-logo-products.v1";
const DEFAULT_LOGOS: LogoItem[] = [
  { slug: "aliexpress", name: "AliExpress", code: "ALX-1024", color: "#FF4747" },
  { slug: "amazon", name: "Amazon", code: "AMZ-2048", color: "#000000" },
  { slug: "shein", name: "SHEIN", code: "SHN-3072", color: "#000000" },
  { slug: "trendyol", name: "TrendYol", code: "TRL-4096", color: "#FF6900" },
  { slug: "temu", name: "TEMU", code: "TMU-5120", color: "#FB7701" },
  {
    slug: "local-products",
    name: "Local Products",
    code: "LPR-6144",
    color: "#16A34A",
    arabicLabel: "منتجات محلية",
  },
  {
    slug: "discounts",
    name: "Discounts",
    code: "DSC-7168",
    color: "#7C3AED",
    arabicLabel: "تخفيضات وعروض",
  },
];
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%23f1f5f9'/%3E%3Cpath d='M230 275l65-72 48 52 37-41 56 61H230z' fill='%2394a3b8'/%3E%3Ccircle cx='385' cy='165' r='24' fill='%2394a3b8'/%3E%3C/svg%3E";
const DEMO_PRODUCTS: Record<string, Product[]> = {
  aliexpress: [
    {
      id: "alx-demo-1",
      name: "سماعات لاسلكية",
      price: 18.5,
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "alx-demo-2",
      name: "ساعة ذكية",
      price: 32,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    },
  ],
  amazon: [
    {
      id: "amz-demo-1",
      name: "سماعات رأس",
      price: 79.99,
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    },
  ],
  shein: [
    {
      id: "shn-demo-1",
      name: "حقيبة يومية",
      price: 24.5,
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80",
    },
  ],
  trendyol: [],
  temu: [],
  "local-products": [],
  discounts: [],
};

function readLogos(): LogoItem[] {
  try {
    const raw = localStorage.getItem(LOGOS_KEY);
    if (!raw) return DEFAULT_LOGOS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LOGOS;
    return parsed.filter((item): item is LogoItem =>
      Boolean(
        item &&
        typeof item.slug === "string" &&
        typeof item.name === "string" &&
        typeof item.code === "string" &&
        typeof item.color === "string",
      ),
    );
  } catch {
    return DEFAULT_LOGOS;
  }
}

function LogoProductsPage() {
  const { slug } = Route.useParams();
  const [logo, setLogo] = useState<LogoItem | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: site } = await db
        .from("storefront_sites")
        .select("id,slug,name,name_ar,logo_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      if (!site) {
        setLogo(null);
        setReady(true);
        return;
      }
      setSiteId(site.id);
      setLogo({ slug: site.slug, name: site.name, code: site.slug.toUpperCase().slice(0, 8), color: "#2563EB", arabicLabel: site.name_ar });
      const { data: rows } = await db
        .from("storefront_products")
        .select("id,name,price,image_url")
        .eq("site_id", site.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setProducts((rows ?? []).map((row: any) => ({ id: row.id, name: row.name, price: Number(row.price ?? 0), imageUrl: row.image_url })));
      setReady(true);
    })();
    return () => { active = false; };
  }, [slug]);

  const countLabel = useMemo(() => `${products.length} منتج`, [products.length]);

  const addProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedPrice = Number(price);
    const trimmedImage = imageUrl.trim();
    if (!name.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0 || !trimmedImage) return;
    try {
      if (new URL(trimmedImage).protocol !== "https:") return;
    } catch {
      return;
    }
    if (!siteId) return;
    const { data, error } = await db
      .from("storefront_products")
      .insert({ site_id: siteId, name: name.trim(), price: parsedPrice, image_url: trimmedImage, is_active: true, sort_order: products.length })
      .select("id,name,price,image_url")
      .single();
    if (error) {
      setNotice(`تعذر حفظ المنتج: ${error.message}`);
      return;
    }
    setProducts((items) => [{ id: data.id, name: data.name, price: Number(data.price ?? 0), imageUrl: data.image_url }, ...items]);
    setName("");
    setPrice("");
    setImageUrl("");
    setNotice("تمت إضافة المنتج وسيظهر للعملاء.");
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`حذف المنتج «${product.name}»؟`)) return;
    const { error } = await db.from("storefront_products").delete().eq("id", product.id);
    if (error) {
      setNotice(`تعذر حذف المنتج: ${error.message}`);
      return;
    }
    setProducts((items) => items.filter((item) => item.id !== product.id));
    setNotice("تم حذف المنتج وسيختفي من واجهة العملاء.");
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !editing.name.trim() || !Number.isFinite(editing.price) || editing.price < 0)
      return;
    const trimmedImage = editing.imageUrl.trim();
    try {
      if (new URL(trimmedImage).protocol !== "https:") return;
    } catch {
      return;
    }
    const { error } = await db
      .from("storefront_products")
      .update({ name: editing.name.trim(), price: editing.price, image_url: trimmedImage })
      .eq("id", editing.id);
    if (error) {
      setNotice(`تعذر تحديث المنتج: ${error.message}`);
      return;
    }
    setProducts((items) => items.map((item) => item.id === editing.id ? { ...editing, name: editing.name.trim(), imageUrl: trimmedImage } : item));
    setEditing(null);
    setNotice("تم تحديث المنتج وسيظهر التغيير للعملاء.");
  };

  if (!ready)
    return (
      <AdminRouteGuard>
        <main dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-6">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-7 text-center shadow-xl">
            <div className="mx-auto size-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-label="جارٍ تحميل المنتجات" />
            <p className="mt-4 font-bold text-slate-700">جارٍ تحميل منتجات الموقع...</p>
          </div>
        </main>
      </AdminRouteGuard>
    );

  if (!logo)
    return (
      <AdminRouteGuard>
        <main dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-6">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h1 className="text-2xl font-black">المتجر غير موجود</h1>
            <p className="mt-2 text-slate-500">المسار المختصر لا يطابق شعارًا مسجلًا.</p>
            <Link
              to="/admin/logos"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white"
            >
              <ArrowRight className="size-4" /> العودة للمواقع
            </Link>
          </div>
        </main>
      </AdminRouteGuard>
    );

  return (
    <AdminRouteGuard>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-10"
      >
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                {logo.code}
              </p>
              <h1 dir="ltr" className="text-2xl font-black tracking-tight sm:text-3xl">
                Products: {slug}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {logo.name}
                {logo.arabicLabel ? ` • ${logo.arabicLabel}` : ""}
                <span className="mx-2">·</span>
                <span className="font-bold text-slate-700">{countLabel}</span>
              </p>
            </div>
            <Link
              to="/admin/logos"
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:self-auto"
            >
              <ArrowRight className="size-4" /> العودة للمواقع
            </Link>
          </header>

          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            >
              <span>{notice}</span>
              <button type="button" aria-label="إغلاق التنبيه" onClick={() => setNotice("")}>
                <X className="size-4" />
              </button>
            </div>
          )}

          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <h2 className="text-xl font-black">إضافة منتج</h2>
              <p className="mt-1 text-sm text-slate-500">أدخل اسم المنتج وسعره ورابط صورة HTTPS.</p>
            </div>
            <form
              onSubmit={addProduct}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_1.5fr_auto] xl:items-end"
            >
              <label className="text-sm font-bold text-slate-700">
                اسم المنتج
                <input
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثال: سماعات لاسلكية"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                السعر
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0.00"
                  dir="ltr"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-left outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                رابط صورة المنتج
                <input
                  required
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://example.com/product.jpg"
                  dir="ltr"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-left outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                <Plus className="size-5" /> Add Product +
              </button>
            </form>
          </section>

          <div className="mb-4">
            <h2 className="text-xl font-black">المنتجات</h2>
            <p className="mt-1 text-sm text-slate-500">{countLabel}</p>
          </div>
          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <h3 className="text-lg font-black">لا توجد منتجات بعد</h3>
              <p className="mt-1 text-sm text-slate-500">أضف أول منتج من النموذج أعلاه.</p>
            </div>
          ) : (
            <section
              aria-label="قائمة المنتجات"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {products.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="aspect-square overflow-hidden bg-slate-100">
                    <img
                      src={product.imageUrl || FALLBACK_IMAGE}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 min-h-12 font-black text-slate-900">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-lg font-black text-emerald-700">
                      {product.price.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...product })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        <Pencil className="size-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                      >
                        <Trash2 className="size-4" /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>

        {editing && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setEditing(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-product-title"
              dir="rtl"
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 id="edit-product-title" className="text-xl font-black">
                  تعديل المنتج
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="إغلاق"
                >
                  <X className="size-5" />
                </button>
              </div>
              <form onSubmit={saveEdit} className="space-y-4">
                <label className="block text-sm font-bold">
                  اسم المنتج
                  <input
                    required
                    maxLength={120}
                    value={editing.name}
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block text-sm font-bold">
                  السعر
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.price}
                    onChange={(event) =>
                      setEditing({ ...editing, price: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block text-sm font-bold">
                  رابط صورة المنتج
                  <input
                    required
                    type="url"
                    value={editing.imageUrl}
                    onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })}
                    dir="ltr"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left outline-none focus:border-blue-500"
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700"
                  >
                    <Save className="size-4" /> حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </AdminRouteGuard>
  );
}

export const Route = createFileRoute("/admin/logos/$slug")({ component: LogoProductsPage });
