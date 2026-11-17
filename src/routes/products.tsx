import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Camera, ImagePlus, PackagePlus, Store, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { createProductWebpVariants, productImageVariantPaths } from "@/lib/merchant-product-images";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_PRODUCT_IMAGE,
  formatDate,
  formatMoney,
  getSignedProductImage,
  orderStatusLabels,
  productStatusLabels,
  type MerchantOrder,
  type MerchantProduct,
  type MerchantStorePrivate,
} from "@/lib/merchant-marketplace";

const db = supabase as any;

const merchantDashboardStyles = `
  .merchant-dashboard-theme { color: #17324b; }
  .merchant-dashboard-theme .md-hero {
    background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.12) 1px, transparent 0), linear-gradient(110deg, #0B3A66, #0E4A7A 58%, #0B3A66);
    background-size: 18px 18px, auto;
  }
  .merchant-dashboard-theme .md-section { animation: md-enter .42s ease both; }
  .merchant-dashboard-theme .md-section:nth-of-type(2) { animation-delay: .04s; }
  .merchant-dashboard-theme .md-section:nth-of-type(3) { animation-delay: .08s; }
  .merchant-dashboard-theme .md-card { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
  .merchant-dashboard-theme .md-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(11,58,102,.09); }
  .merchant-dashboard-theme .md-metric { border-color: color-mix(in srgb, var(--md-tone) 17%, white); }
  .merchant-dashboard-theme .md-metric-icon { color: var(--md-tone); background: var(--md-tone-bg); }
  .merchant-dashboard-theme .md-metric-navy { --md-tone: #0B3A66; --md-tone-bg: #E8F1FB; }
  .merchant-dashboard-theme .md-metric-orange { --md-tone: #F58220; --md-tone-bg: #FFF0E2; }
  .merchant-dashboard-theme .md-metric-green { --md-tone: #0C8F63; --md-tone-bg: #E3F8EF; }
  .merchant-dashboard-theme .md-metric-gold { --md-tone: #D99A00; --md-tone-bg: #FFF6DC; }
  .merchant-dashboard-theme .md-metric p:last-child { color: var(--md-tone); }
  .merchant-dashboard-theme .md-live-dot { animation: md-pulse 1.8s ease-out infinite; }
  @keyframes md-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes md-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,.4); } 55% { box-shadow: 0 0 0 6px rgba(52,211,153,0); } }
  @media (prefers-reduced-motion: reduce) {
    .merchant-dashboard-theme *, .merchant-dashboard-theme *::before, .merchant-dashboard-theme *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
  }
`;

async function loadMyStore() {
  const { data, error } = await db.rpc("merchant_get_my_store");
  if (error) throw error;
  return Array.isArray(data) ? (data[0] as MerchantStorePrivate | undefined) ?? null : (data as MerchantStorePrivate | null);
}

async function loadMyProducts(storeId: string) {
  const { data, error } = await db
    .from("merchant_products")
    .select("id,store_id,title,description,category,price,old_price,discount_percent,sku,currency,stock,image_path,status,review_note,created_at,updated_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const products = (data ?? []) as MerchantProduct[];
  const images = await Promise.all(products.map((product) => getSignedProductImage(product.image_path, 400)));
  return products.map((product, index) => ({ ...product, image_url: images[index] ?? null }));
}

async function loadMyOrders(storeId: string) {
  const { data, error } = await db.from("merchant_orders").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MerchantOrder[];
}

export function MerchantDashboard() {
  const { user, loading: authLoading } = useSession();
  const addProductMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "add-product";
  const { data: store, isLoading: storeLoading, error: storeError, mutate: mutateStore } = useSWR(
    user ? ["merchant-my-store", user.id] : null,
    loadMyStore,
  );
  const { data: products = [], error: productsError, mutate: mutateProducts } = useSWR(
    store ? ["merchant-products", store.id] : null,
    ([, storeId]) => loadMyProducts(storeId),
  );
  const { data: orders = [], error: ordersError, mutate: mutateOrders } = useSWR(
    store ? ["merchant-orders", store.id] : null,
    ([, storeId]) => loadMyOrders(storeId),
  );

  const deliveredInYER = orders.filter(
    (order) => order.status === "delivered" && order.currency === "YER",
  );
  const sellerShareInYER = deliveredInYER.reduce(
    (sum, order) => sum + Number(order.seller_amount),
    0,
  );
  const pendingOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;

  if (authLoading || storeLoading) {
    return <main dir="rtl" className="mx-auto max-w-6xl px-4 py-12"><p className="text-sm text-muted-foreground">جارٍ تحميل بوابة التاجر…</p></main>;
  }
  if (storeError) {
    return <main dir="rtl" className="mx-auto max-w-6xl px-4 py-12"><Card><CardContent className="py-10 text-center text-destructive">تعذر التحقق من المتجر. حدّث الصفحة أو تواصل مع الإدارة.</CardContent></Card></main>;
  }
  if (!store) {
    return (
      <main dir="rtl" className="mx-auto max-w-3xl px-4 py-12">
        <Card className="rounded-3xl"><CardHeader><div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Store aria-hidden="true" /></div><CardTitle>لا يوجد متجر مرتبط بحسابك</CardTitle><CardDescription>تُنشئ الإدارة حسابات المتاجر بعد مراجعة بيانات التاجر. تواصل مع فريق السوق الشامل لبدء التسجيل.</CardDescription></CardHeader></Card>
      </main>
    );
  }

  if (addProductMode) {
    return (
      <main dir="rtl" className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/merchant" className="w-fit text-sm font-semibold text-primary hover:underline">العودة إلى لوحة متجري</Link>
        <header><Badge variant="secondary">{store.name}</Badge><h1 className="mt-3 text-3xl font-bold">إضافة منتج</h1><p className="mt-2 text-muted-foreground">أضف صورة واضحة ووصفًا وسعرًا وكمية. سيظهر المنتج للزبائن بعد اعتماد الإدارة.</p></header>
        <ProductForm store={store} onCreated={() => void mutateProducts()} />
      </main>
    );
  }

  return (
    <main dir="rtl" className="merchant-dashboard-theme mx-auto flex min-h-screen w-full max-w-[1240px] flex-col gap-4 bg-[#f3f7fc] px-3 py-4 sm:gap-5 sm:px-6 sm:py-7 xl:px-8">
      <style>{merchantDashboardStyles}</style>
      <header className="md-section md-hero relative isolate overflow-hidden rounded-2xl bg-gradient-to-l from-[#0B3A66] via-[#0E4577] to-[#0B3A66] p-5 text-white shadow-xl shadow-[#0B3A66]/15 sm:rounded-[28px] sm:p-7 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 -z-10 size-72 rounded-full bg-[#F58220]/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 -z-10 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold"><span className={`md-live-dot size-2 rounded-full ${store.status === "active" ? "bg-emerald-400" : "bg-rose-400"}`} />{store.status === "active" ? "المتجر نشط" : "المتجر موقوف"}</span>
              <span className="rounded-full bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white">بوابة التاجر</span>
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">مرحبًا بك في {store.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">أدر منتجاتك وطلباتك من مكان واحد، وتابع أداء متجرك بكل وضوح.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-36 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm"><p className="text-xs text-white/70">حالة المتجر</p><p className="mt-1 text-2xl font-extrabold">{store.status === "active" ? "نشط" : "متوقف"}</p></div>
            <Button asChild disabled={store.status !== "active"} className="min-h-11 w-full rounded-xl bg-[#F58220] px-5 font-bold text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#e97514] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC531] focus-visible:ring-offset-2 sm:w-auto"><a href="/merchant?view=add-product"><PackagePlus aria-hidden="true" className="ml-2 size-4" />أضف منتج</a></Button>
          </div>
        </div>
        <div aria-hidden="true" className="absolute bottom-0 right-0 h-1 w-1/3 bg-gradient-to-l from-[#F58220] to-[#FFC531]" />
      </header>

      <section className="md-section grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="ملخص المتجر">
        <a
          href="#merchant-products"
          aria-label="الانتقال إلى إدارة المنتجات"
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58220] focus-visible:ring-offset-2"
        >
          <Metric tone="navy" icon={<PackagePlus aria-hidden="true" />} label="المنتجات" value={products.length.toLocaleString("ar-YE")} />
        </a>
        <Metric tone="orange" icon={<Truck aria-hidden="true" />} label="الطلبات النشطة" value={pendingOrders.toLocaleString("ar-YE")} />
        <Metric tone="green" icon={<BadgeCheck aria-hidden="true" />} label="حصة التاجر من الطلبات المسلّمة · YER" value={formatMoney(sellerShareInYER, "YER")} />
        <Metric tone="gold" icon={<Store aria-hidden="true" />} label="عمولة المنصة" value={`${(Number(store.commission_rate) * 100).toLocaleString("ar-YE")}٪`} />
      </section>

      {store.status === "suspended" && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">المتجر موقوف مؤقتًا. يمكنك الاطلاع على بياناتك، لكن الإضافة والطلبات الجديدة غير متاحة.</p>}

      <section aria-label="إضافة المنتجات وبيانات المتجر" className="md-section grid min-w-0 items-start gap-4 sm:gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <ProductForm store={store} onCreated={() => void mutateProducts()} />
        <StoreProfile store={store} onSaved={() => void mutateStore()} />
      </section>

      <section id="merchant-products" aria-label="إدارة المنتجات" className="scroll-mt-6">
        <ProductInventory products={products} error={productsError} onSaved={() => void mutateProducts()} active={store.status === "active"} />
      </section>

      <section aria-labelledby="merchant-shisha-heading" className="md-section grid gap-5 rounded-3xl border border-[#0B3A66]/10 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <Badge variant="secondary" className="mb-2">قسم خاص</Badge>
          <h2 id="merchant-shisha-heading" className="text-2xl font-bold">معسلات المتجر</h2>
          <p className="mt-2 text-sm text-muted-foreground">أضف معسلات ومنتجات الشيشة وتابع الكمية والسعر وحالة المراجعة. لن تظهر المنتجات للعملاء قبل اعتماد الإدارة.</p>
        </div>
        <ProductInventory
          products={products.filter(isShishaProduct)}
          error={productsError}
          onSaved={() => void mutateProducts()}
          active={store.status === "active"}
          title="معسلات ومنتجات الشيشة"
          description="تظهر هنا المنتجات المصنفة كمعسل أو شيشة؛ عدّل السعر والكمية، وتابع اعتماد الإدارة قبل النشر."
        />
      </section>

      <section aria-label="طلبات المتجر" className="md-section">
        <MerchantOrders orders={orders} error={ordersError} onStatusChanged={() => { void mutateOrders(); void mutateProducts(); }} />
      </section>
    </main>
  );
}

function Metric({ icon, label, value, tone = "navy" }: { icon: ReactNode; label: string; value: string; tone?: "navy" | "orange" | "green" | "gold" }) {
  return <Card className={`md-card md-metric md-metric-${tone} rounded-2xl border bg-white shadow-sm`}><CardContent className="flex min-h-24 items-center gap-3 p-4 sm:p-5"><div className="md-metric-icon flex size-11 shrink-0 items-center justify-center rounded-2xl">{icon}</div><div className="min-w-0"><p className="text-xs leading-5 text-muted-foreground sm:text-sm">{label}</p><p className="mt-1 break-words text-lg font-extrabold sm:text-xl">{value}</p></div></CardContent></Card>;
}

function StoreProfile({ store, onSaved }: { store: MerchantStorePrivate; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: store.name,
    description: store.description,
    contact_phone: store.contact_phone,
    city: store.city,
  });
  const [storeImagePath, setStoreImagePath] = useState<string | null>(
    store.store_image_path ?? null,
  );
  const [storeImageFile, setStoreImageFile] = useState<File | null>(null);
  const [storeImagePreview, setStoreImagePreview] = useState<string | null>(null);
  const [storeImageFit, setStoreImageFit] = useState<"cover" | "contain">(
    store.store_image_fit ?? "cover",
  );
  const [storeImagePosition, setStoreImagePosition] = useState<"left" | "center" | "right">(
    store.store_image_position ?? "center",
  );
  const [savedStoreImageUrl, setSavedStoreImageUrl] = useState<string | null>(null);
  const storeImageInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (storeImagePath) {
      void getSignedProductImage(storeImagePath).then((url) => {
        if (active) setSavedStoreImageUrl(url);
      });
    } else {
      setSavedStoreImageUrl(null);
    }
    return () => {
      active = false;
    };
  }, [storeImagePath]);

  function selectStoreImage(file?: File) {
    if (!file) return;
    if (
      ["image/jpeg", "image/png", "image/webp"].includes(file.type) === false ||
      file.size > 6 * 1024 * 1024
    ) {
      setMessage("اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 6 ميجابايت.");
      return;
    }
    if (storeImagePreview) URL.revokeObjectURL(storeImagePreview);
    setStoreImageFile(file);
    setStoreImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    let nextImagePath = storeImagePath;
    let uploadedPath: string | null = null;
    if (storeImageFile) {
      const extension =
        storeImageFile.type === "image/png"
          ? "png"
          : storeImageFile.type === "image/webp"
            ? "webp"
            : "jpg";
      uploadedPath = `${store.id}/store/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("merchant-product-images")
        .upload(uploadedPath, storeImageFile, { contentType: storeImageFile.type, upsert: false });
      if (uploadError) {
    setBusy(false);
        setMessage("تعذر رفع الصورة. تأكد من نوعها وحجمها ثم أعد المحاولة.");
        return;
      }
      nextImagePath = uploadedPath;
    }
    const { error } = await db
      .from("merchant_stores")
      .update({
        ...form,
        store_image_path: nextImagePath,
        store_image_fit: storeImageFit,
        store_image_position: storeImagePosition,
      })
      .eq("id", store.id);
    setBusy(false);
    if (error) {
      console.error("[merchant-store] extended profile update failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      // Keep the basic profile editable while the optional store-image migration is absent.
      const { error: basicUpdateError } = await db
        .from("merchant_stores")
        .update(form)
        .eq("id", store.id);
      if (basicUpdateError) {
        console.error("[merchant-store] basic profile update failed", {
          code: basicUpdateError.code,
          message: basicUpdateError.message,
          details: basicUpdateError.details,
          hint: basicUpdateError.hint,
        });
        if (uploadedPath) {
          await supabase.storage.from("merchant-product-images").remove([uploadedPath]);
        }
        setMessage(`تعذر حفظ بيانات المتجر (الرمز ${basicUpdateError.code ?? "غير متوفر"}). لم تتغير البيانات.`);
        return;
      }
      if (uploadedPath) {
        await supabase.storage.from("merchant-product-images").remove([uploadedPath]);
      }
      setMessage("تم حفظ بيانات المتجر، لكن لم تُحفظ الصورة لأن تحديث قاعدة البيانات الخاص بصور المتاجر لم يُطبّق بعد.");
      onSaved();
      return;
    }
    if (store.store_image_path && store.store_image_path !== nextImagePath) {
      await supabase.storage.from("merchant-product-images").remove([store.store_image_path]);
    }
    setStoreImagePath(nextImagePath);
    setStoreImageFile(null);
    if (storeImagePreview) URL.revokeObjectURL(storeImagePreview);
    setStoreImagePreview(null);
    setMessage("تم حفظ بيانات المتجر وصورته.");
    window.dispatchEvent(new Event("merchant-store-updated"));
    onSaved();
  }

  return (
    <Card className="md-card rounded-2xl border-[#0B3A66]/10 shadow-sm">
      <CardHeader>
        <CardTitle>بيانات المتجر</CardTitle>
        <CardDescription>هذه المعلومات تظهر للعملاء في السوق.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-3">
          <Field label="اسم المتجر">
            <Input
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="رقم التواصل">
            <Input
              required
              minLength={7}
              maxLength={24}
              inputMode="tel"
              value={form.contact_phone}
              onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}
            />
          </Field>
          <Field label="المدينة">
            <Input
              maxLength={80}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
          <Field label="نبذة قصيرة">
            <Textarea
              maxLength={1000}
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <div className="grid gap-3 rounded-xl border p-3 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">صورة المتجر</p>
                <p className="text-xs text-muted-foreground">
                  JPG أو PNG أو WebP، بحد أقصى 6 ميجابايت.
                </p>
              </div>
              <input
                ref={storeImageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="اختيار صورة المتجر"
                onChange={(event) => {
                  selectStoreImage(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy || store.status !== "active"}
                onClick={() => storeImageInput.current?.click()}
              >
                رفع صورة المتجر
              </Button>
            </div>
            {storeImagePreview || savedStoreImageUrl ? (
              <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-xl bg-muted p-2">
                <img
                  src={storeImagePreview ?? savedStoreImageUrl ?? ""}
                  alt="معاينة صورة المتجر"
                  className="h-36 w-full rounded-lg"
                  style={{ objectFit: storeImageFit, objectPosition: storeImagePosition }}
                />
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                تظهر الأيقونة الافتراضية إذا لم تُرفع صورة
              </div>
            )}
            {storeImageFile && (
              <p className="text-xs text-muted-foreground">{storeImageFile.name}</p>
            )}
            {storeImagePath && (
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 w-fit text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                disabled={busy}
                onClick={() => {
                  setStoreImagePath(null);
                  setSavedStoreImageUrl(null);
                  setStoreImageFile(null);
                  if (storeImagePreview) URL.revokeObjectURL(storeImagePreview);
                  setStoreImagePreview(null);
                }}
              >
                إزالة صورة المتجر
              </Button>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium">
                طريقة عرض الصورة
                <select
                  value={storeImageFit}
                  onChange={(event) => setStoreImageFit(event.target.value as "cover" | "contain")}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="cover">تغطية (Cover)</option>
                  <option value="contain">احتواء (Contain)</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                موضع الصورة
                <select
                  value={storeImagePosition}
                  onChange={(event) =>
                    setStoreImagePosition(event.target.value as "left" | "center" | "right")
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="left">يسار</option>
                  <option value="center">وسط</option>
                  <option value="right">يمين</option>
                </select>
              </label>
            </div>
          </div>
          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
          <Button type="submit" className="min-h-11 w-full rounded-xl bg-[#0B3A66] px-5 font-bold text-white hover:bg-[#082f54] focus-visible:ring-2 focus-visible:ring-[#FFC531] sm:w-auto" disabled={busy || store.status !== "active"}>
            {busy ? "جارٍ الحفظ…" : "حفظ بيانات المتجر"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProductForm({
  store,
  onCreated,
  presetCategory,
}: {
  store: MerchantStorePrivate;
  onCreated: () => void;
  presetCategory?: string;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: presetCategory ?? "",
    price: "",
    oldPrice: "",
    discountPercent: "",
    sku: "",
    currency: "YER" as MerchantProduct["currency"],
    stock: "1",
  });
  const [image, setImage] = useState<File | null>(null);
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftImagePath, setDraftImagePath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  function resetForm() {
    setForm({
      title: "",
      description: "",
      category: presetCategory ?? "",
      price: "",
      oldPrice: "",
      discountPercent: "",
      sku: "",
      currency: "YER" as MerchantProduct["currency"],
      stock: "1",
    });
    setImage(null);
    setSelectedImagePath(null);
    setUploadedImagePath(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setImageUploadMessage("");
    setDraftId(null);
    setDraftImagePath(null);
    if (formElement) formElement.reset();
  }

  async function handleImageSelection(file: File | undefined) {
    if (!file) return;
    setMessage("");
    setImageUploadMessage("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 6 * 1024 * 1024
    ) {
      setImage(null);
      setSelectedImagePath(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setImageUploadMessage("ارفع صورة JPG أو PNG أو WebP بحجم لا يتجاوز 6 ميجابايت.");
      return;
    }
    const previousTemporaryPath = uploadedImagePath;
    setSelectedImagePath(null);
    setImage(file);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(file));
    setUploadingImage(true);
    setImageUploadMessage("جارٍ ضغط الصورة وإنشاء نسختي WebP…");
    let uploadedPaths: string[] = [];
    try {
      const variants = await createProductWebpVariants(file);
      const basePath = `${store.id}/${crypto.randomUUID()}`;
      for (const variant of variants) {
        const variantPath = `${basePath}-${variant.width}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("merchant-product-images")
          .upload(variantPath, variant.file, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        uploadedPaths.push(variantPath);
      }
      const fullVariantPath = `${basePath}-1200.webp`;
      setSelectedImagePath(fullVariantPath);
      setUploadedImagePath(fullVariantPath);
      if (previousTemporaryPath && previousTemporaryPath !== draftImagePath) {
        const previousVariants = productImageVariantPaths(previousTemporaryPath);
        await supabase.storage
          .from("merchant-product-images")
          .remove(previousVariants ?? [previousTemporaryPath]);
      }
      setImageUploadMessage("تم ضغط الصورة ورفع نسختي WebP (400px و1200px) بنجاح.");
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from("merchant-product-images").remove(uploadedPaths);
      }
      setImage(null);
      setImageUploadMessage(
        error instanceof Error && error.message.includes("200 KB")
          ? "تعذر ضغط الصورة إلى أقل من 200 كيلوبايت. جرّب صورة أصغر أو أوضح."
          : "تعذر تجهيز الصورة أو رفع نسختي WebP. أعد المحاولة بصورة JPG أو PNG أو WebP.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function persist() {
    if (!formElement?.reportValidity()) return;
    if (store.status !== "active") return;
    if (uploadingImage) {
      setMessage("انتظر اكتمال رفع الصورة.");
      return;
    }
     const price = Number(form.price);
    const oldPrice = form.oldPrice.trim() ? Number(form.oldPrice) : null;
    const discountPercent = form.discountPercent.trim() ? Number(form.discountPercent) : null;
    const stock = Number(form.stock);
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 1_000_000 ||
      (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price)) ||
      (discountPercent !== null &&
        (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 99))
    ) {
      setMessage(
        "تحقق من السعر السابق والخصم والكمية. يجب أن يكون السعر السابق أعلى من السعر الحالي.",
      );
      return;
    }

    setBusy(true);
    setMessage("");
    const imagePath = selectedImagePath ?? draftImagePath ?? `${store.id}/${EMPTY_PRODUCT_IMAGE}`;

    const values = {
      store_id: store.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: presetCategory ?? form.category.trim(),
      price,
      old_price: oldPrice,
      discount_percent: discountPercent,
      sku: form.sku.trim() || null,
      currency: form.currency,
      stock,
      image_path: imagePath,
    };

    let productId = draftId;
    if (productId) {
      const { error } = await db
        .from("merchant_products")
        .update(values)
        .eq("id", productId)
        .eq("store_id", store.id);
      if (error) {
        setBusy(false);
        setMessage("تعذر تحديث المنتج. لم يتغير المنتج المحفوظ.");
        return;
      }
      if (draftImagePath && draftImagePath !== imagePath) {
        await supabase.storage
          .from("merchant-product-images")
          .remove(productImageVariantPaths(draftImagePath) ?? [draftImagePath]);
      }
    } else {
      const { data, error } = await db
        .from("merchant_products")
        .insert(values)
        .select("id")
        .single();
      if (error || !data) {
        const issue = error as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        } | null;
        console.error("[merchant-marketplace] product insert failed", {
          code: issue?.code,
          message: issue?.message,
          details: issue?.details,
          hint: issue?.hint,
        });
        setBusy(false);
        setMessage(
          error
            ? `تعذر حفظ المنتج (الرمز ${issue?.code ?? "غير متوفر"}): ${issue?.message ?? "خطأ غير معروف"}`
            : "تعذر حفظ المنتج: لم تُرجع قاعدة البيانات رقم المنتج. لا تعاود الإرسال قبل التحقق من قائمة المنتجات.",
        );
        return;
      }
      productId = data.id as string;
    }

    setDraftId(productId);
    setDraftImagePath(imagePath);
    setSelectedImagePath(null);
    setUploadedImagePath(null);
    setImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    onCreated();

    const { error: submitError } = await db.rpc("merchant_submit_product", {
      _product_id: productId,
    });
    setBusy(false);
    if (submitError) {
      setMessage("تم حفظ المنتج، لكن تعذر إرساله للمراجعة. أعد المحاولة لاحقًا.");
      return;
    }

    resetForm();
    setMessage("تم الإرسال بنجاح. المنتج بانتظار اعتماد الإدارة.");
    onCreated();
  }

  return (
    <Card className="md-card rounded-2xl border-[#0B3A66]/10 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus aria-hidden="true" className="size-5 text-primary" />{" "}
          {presetCategory ? "إضافة معسل أو منتج شيشة" : "إضافة منتج"}
        </CardTitle>
        <CardDescription>
          {presetCategory
            ? "أرسل المعسل لمراجعة الإدارة؛ التصنيف يضبط تلقائيًا إلى معسلات."
            : "أرسل المنتج للمراجعة؛ لن يظهر للعملاء قبل اعتماد الإدارة."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={setFormElement}
          onSubmit={(event) => {
            event.preventDefault();
            void persist();
          }}
          className="grid min-w-0 gap-4 sm:gap-5 2xl:grid-cols-[minmax(0,1fr)_280px]"
        >
          <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
          <Field label="اسم المنتج">
            <Input
              required
              minLength={2}
              maxLength={120}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          {!presetCategory && (
            <Field label="التصنيف">
              <Input
                maxLength={60}
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="مثال: عطور"
              />
            </Field>
          )}
          <Field label="السعر">
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </Field>
          <Field label="السعر السابق (اختياري)">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.oldPrice}
              onChange={(event) => setForm({ ...form, oldPrice: event.target.value })}
            />
          </Field>
          <Field label="نسبة الخصم ٪ (اختياري)">
            <Input
              type="number"
              min="1"
              max="99"
              step="1"
              value={form.discountPercent}
              onChange={(event) => setForm({ ...form, discountPercent: event.target.value })}
            />
          </Field>
          <Field label="رقم الصنف (اختياري)">
            <Input
              maxLength={80}
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            />
          </Field>
          <Field label="العملة">
            <select
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value as MerchantProduct["currency"] })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="YER">ريال يمني (YER)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار (USD)</option>
            </select>
          </Field>
          <Field label="الكمية المتاحة">
            <Input
              required
              type="number"
              min="0"
              max="1000000"
              step="1"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
            />
          </Field>
        <div className="grid gap-1.5 text-sm font-medium">
          <span>صورة المنتج</span>
            <span className="text-xs font-normal text-muted-foreground">
              ارفع صورة واضحة للمنتج - JPG أو PNG أو WebP - بحد أقصى 6 ميجابايت. الصورة اختيارية.
            </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full border-[#0B3A66]/20 text-[#0B3A66] hover:border-[#0B3A66]/40 hover:bg-[#0B3A66]/5 sm:w-auto"
                disabled={busy || uploadingImage || store.status !== "active"}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera aria-hidden="true" className="ml-2 size-4" />
                التقاط صورة بالكاميرا
            </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full border-[#0B3A66]/20 text-[#0B3A66] hover:border-[#0B3A66]/40 hover:bg-[#0B3A66]/5 sm:w-auto"
                disabled={busy || uploadingImage || store.status !== "active"}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImagePlus aria-hidden="true" className="ml-2 size-4" />
                اختيار من الصور
            </Button>
          </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => {
                void handleImageSelection(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
              className="sr-only"
              tabIndex={-1}
              aria-label="التقاط صورة المنتج بالكاميرا"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                void handleImageSelection(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
              className="sr-only"
              tabIndex={-1}
              aria-label="اختيار صورة المنتج من الصور"
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="معاينة صورة المنتج"
                className="mt-2 h-36 w-full rounded-xl border object-cover"
              />
            )}
            {imageUploadMessage && (
              <span
                role="status"
                className={`text-xs font-medium ${selectedImagePath ? "text-primary" : "text-muted-foreground"}`}
              >
                {imageUploadMessage}
              </span>
            )}
            {image?.name && (
              <span className="text-xs font-normal text-muted-foreground">{image.name}</span>
            )}
        </div>
          <Field label="وصف المنتج" className="sm:col-span-2">
            <Textarea
              maxLength={1200}
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          {message && (
            <p role="status" className="text-sm text-muted-foreground sm:col-span-2">
              {message}
            </p>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
            <ImagePlus aria-hidden="true" className="size-4" /> على الهاتف يمكنك التقاط الصورة
            مباشرة بالكاميرا، ولن تظهر للزبائن إلا بعد اعتماد الإدارة.
          </p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" className="min-h-12 w-full rounded-xl bg-[#F58220] px-6 font-bold text-white shadow-sm transition-colors hover:bg-[#e97514] focus-visible:ring-2 focus-visible:ring-[#0B3A66] sm:w-auto" disabled={busy || uploadingImage || store.status !== "active"}>
              {busy ? "جارٍ الإرسال…" : "إرسال للمراجعة"}
            </Button>
        </div>
          </div>
          <aside aria-label="معاينة المنتج" className="rounded-2xl border border-[#0B3A66]/10 bg-gradient-to-b from-[#0B3A66]/[0.035] to-white p-4 2xl:sticky 2xl:top-6 2xl:self-start">
            <div className="mb-3 flex items-center justify-between gap-2"><p className="font-bold text-[#0B3A66]">معاينة المنتج</p><span className="rounded-full bg-[#F58220]/10 px-2.5 py-1 text-xs font-semibold text-[#C65E0C]">مباشرة</span></div>
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-muted/70">
              {imagePreviewUrl ? <img src={imagePreviewUrl} alt="معاينة المنتج" className="h-full w-full object-cover" /> : <div className="grid justify-items-center gap-2 text-muted-foreground"><ImagePlus aria-hidden="true" className="size-9" /><span className="text-xs">ستظهر صورة المنتج هنا</span></div>}
            </div>
            <div className="mt-4 space-y-2">
              <p className="line-clamp-2 min-h-6 font-bold">{form.title.trim() || "اسم المنتج"}</p>
              <p className="line-clamp-3 min-h-12 text-sm leading-6 text-muted-foreground">{form.description.trim() || "سيظهر وصف المنتج هنا بعد إدخاله."}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="font-extrabold text-[#F58220]">{form.price ? formatMoney(Number(form.price), form.currency) : "السعر"}</span><span className="rounded-full bg-[#0B3A66]/[0.06] px-2.5 py-1 text-xs text-[#0B3A66]">{form.category.trim() || presetCategory || "التصنيف"}</span></div>
              <p className="text-xs text-muted-foreground">المخزون: {form.stock || "0"} · يظهر بعد اعتماد الإدارة</p>
            </div>
          </aside>
        </form>
      </CardContent>
    </Card>
  );
}

function isShishaProduct(product: MerchantProduct) {
  const searchable = `${product.category} ${product.title}`.trim().toLowerCase();
  return /معسل|شيشة|ارجيلة|أرجيلة/.test(searchable);
}

function ProductInventory({ products, error, onSaved, active, title = "إدارة المنتجات", description = "غيّر السعر والمخزون مباشرة. تعديل وصف أو صورة منتج منشور يعيده للمراجعة." }: { products: (MerchantProduct & { image_url: string | null })[]; error?: Error; onSaved: () => void; active: boolean; title?: string; description?: string }) {
  if (error) return <Card className="rounded-2xl"><CardContent className="py-8 text-sm text-destructive">تعذر تحميل المنتجات.</CardContent></Card>;
  return (
    <Card className="md-card rounded-2xl border-[#0B3A66]/10 shadow-sm">
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="grid gap-3">
        {products.length === 0 ? <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">لم تضف منتجات بعد.</p> : products.map((product) => <InventoryRow key={product.id} product={product} onSaved={onSaved} active={active} />)}
      </CardContent>
    </Card>
  );
}

function InventoryRow({
  product,
  onSaved,
  active,
}: {
  product: MerchantProduct & { image_url: string | null };
  onSaved: () => void;
  active: boolean;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [oldPrice, setOldPrice] = useState(
    product.old_price == null ? "" : String(product.old_price),
  );
  const [discountPercent, setDiscountPercent] = useState(
    product.discount_percent == null ? "" : String(product.discount_percent),
  );
  const [sku, setSku] = useState(product.sku ?? "");
  const [stock, setStock] = useState(String(product.stock));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const currentPrice = Number(price);
    const previousPrice = oldPrice.trim() ? Number(oldPrice) : null;
    const discount = discountPercent.trim() ? Number(discountPercent) : null;
    if (
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0 ||
      (previousPrice !== null &&
        (!Number.isFinite(previousPrice) || previousPrice <= currentPrice)) ||
      (discount !== null && (!Number.isInteger(discount) || discount < 1 || discount > 99))
    ) {
    setBusy(false);
      setMessage("تحقق من السعر السابق ونسبة الخصم.");
      return;
    }
    const { error } = await db
      .from("merchant_products")
      .update({
        price: currentPrice,
        old_price: previousPrice,
        discount_percent: discount,
        sku: sku.trim() || null,
        stock: Number(stock),
      })
      .eq("id", product.id);
    setBusy(false);
    if (error) {
      setMessage("تعذر الحفظ");
      return;
    }
    setMessage("تم الحفظ");
    onSaved();
  }
  return (
    <form
      onSubmit={save}
      className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt=""
          className="size-16 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-lg bg-muted">
          <ImagePlus aria-hidden="true" className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge
            variant={
              product.status === "approved"
                ? "secondary"
                : product.status === "rejected"
                  ? "destructive"
                  : "outline"
            }
          >
            {productStatusLabels[product.status]}
          </Badge>
          {product.review_note && (
            <span className="text-xs text-destructive">{product.review_note}</span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            السعر
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="h-8"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            السعر السابق
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={oldPrice}
              onChange={(event) => setOldPrice(event.target.value)}
              className="h-8"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            الخصم ٪
            <Input
              type="number"
              min="1"
              max="99"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              className="h-8"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            رقم الصنف
            <Input
              maxLength={80}
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className="h-8"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            المخزون
            <Input
              type="number"
              min="0"
              max="1000000"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              className="h-8"
            />
          </label>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <span className="text-xs text-muted-foreground">{product.currency}</span>
        <Button size="sm" type="submit" className="min-h-10 rounded-lg border-[#0B3A66]/25 px-4 font-semibold text-[#0B3A66] hover:bg-[#0B3A66]/5" variant="outline" disabled={busy || !active}>
          {busy ? "حفظ…" : "حفظ"}
        </Button>
        {message && (
          <span role="status" className="text-xs text-muted-foreground">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}

function MerchantOrders({ orders, error, onStatusChanged }: { orders: MerchantOrder[]; error?: Error; onStatusChanged: () => void }) {
  if (error) return <Card className="rounded-2xl"><CardContent className="py-8 text-sm text-destructive">تعذر تحميل الطلبات.</CardContent></Card>;
  return (
    <Card className="md-card rounded-2xl border-[#0B3A66]/10 shadow-sm">
      <CardHeader><CardTitle>الطلبات</CardTitle><CardDescription>حدّث حالة الطلب بعد التواصل مع العميل.</CardDescription></CardHeader>
      <CardContent className="grid gap-3">
        {orders.length === 0 ? <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">ستظهر طلبات العملاء هنا.</p> : orders.map((order) => <OrderRow key={order.id} order={order} onChanged={onStatusChanged} />)}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order, onChanged }: { order: MerchantOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next: Partial<Record<MerchantOrder["status"], { status: MerchantOrder["status"]; label: string }>> = {
    pending: { status: "confirmed", label: "تأكيد الطلب" },
    confirmed: { status: "preparing", label: "بدء التجهيز" },
    preparing: { status: "ready", label: "جاهز للتسليم" },
    ready: { status: "delivered", label: "تم التسليم" },
  };
  const action = next[order.status];
  async function changeStatus(status: MerchantOrder["status"]) {
    setBusy(true);
    setError("");
    const { error: updateError } = await db.rpc("merchant_update_order_status", { _order_id: order.id, _next_status: status });
    setBusy(false);
    if (updateError) { setError("تعذر تحديث الحالة."); return; }
    onChanged();
  }
  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{order.product_title} <span className="text-muted-foreground">× {order.quantity.toLocaleString("ar-YE")}</span></p><p className="mt-1 text-sm">{order.customer_name} · {order.customer_phone}</p><p className="mt-1 text-xs text-muted-foreground">{order.customer_city} · {order.delivery_address}</p></div><Badge variant={order.status === "delivered" ? "secondary" : order.status === "cancelled" ? "destructive" : "outline"}>{orderStatusLabels[order.status]}</Badge></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span className="text-sm font-semibold">{formatMoney(Number(order.total_amount), order.currency)} <span className="font-normal text-muted-foreground">· {formatDate(order.created_at)}</span></span><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{action && <Button className="min-h-10 w-full rounded-lg bg-[#0B3A66] px-4 font-semibold text-white hover:bg-[#082f54] sm:w-auto" size="sm" onClick={() => void changeStatus(action.status)} disabled={busy}>{busy ? "جارٍ التحديث…" : action.label}</Button>}{!["delivered", "cancelled"].includes(order.status) && <Button className="min-h-10 w-full rounded-lg border-rose-200 px-4 font-semibold text-rose-700 hover:bg-rose-50 sm:w-auto" size="sm" variant="outline" onClick={() => void changeStatus("cancelled")} disabled={busy}>إلغاء</Button>}</div></div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </article>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium ${className}`}><span>{label}</span>{children}</label>;
}
