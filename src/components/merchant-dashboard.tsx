import { useRef, useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Camera, ImagePlus, PackagePlus, Store, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
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

async function loadMyStore() {
  const { data, error } = await db.rpc("merchant_get_my_store");
  if (error) throw error;
  return Array.isArray(data) ? (data[0] as MerchantStorePrivate | undefined) ?? null : (data as MerchantStorePrivate | null);
}

async function loadMyProducts(storeId: string) {
  const { data, error } = await db.from("merchant_products").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
  if (error) throw error;
  const products = (data ?? []) as MerchantProduct[];
  const images = await Promise.all(products.map((product) => getSignedProductImage(product.image_path)));
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
    <main dir="rtl" className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div><Badge variant={store.status === "active" ? "secondary" : "destructive"}>{store.status === "active" ? "المتجر نشط" : "المتجر موقوف"}</Badge><h1 className="mt-3 text-3xl font-bold">مرحبًا بك في {store.name}</h1><p className="mt-2 text-muted-foreground">أدر منتجاتك وطلباتك من مكان واحد.</p></div>
        <div className="flex flex-wrap items-center gap-3"><div className="rounded-2xl bg-muted/60 px-5 py-4 text-sm"><p className="text-muted-foreground">عمولة المنصة</p><p className="mt-1 text-2xl font-bold">{(Number(store.commission_rate) * 100).toLocaleString("ar-YE")}٪</p></div><Button asChild disabled={store.status !== "active"}><a href="/merchant?view=add-product"><PackagePlus aria-hidden="true" className="ml-2 size-4" />أضف منتج</a></Button></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="ملخص المتجر">
        <Metric icon={<PackagePlus aria-hidden="true" />} label="المنتجات" value={products.length.toLocaleString("ar-YE")} />
        <Metric icon={<Truck aria-hidden="true" />} label="الطلبات النشطة" value={pendingOrders.toLocaleString("ar-YE")} />
        <Metric icon={<BadgeCheck aria-hidden="true" />} label="حصة التاجر من الطلبات المسلّمة بالريال اليمني" value={formatMoney(sellerShareInYER, "YER")} />
      </section>

      {store.status === "suspended" && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">المتجر موقوف مؤقتًا. يمكنك الاطلاع على بياناتك، لكن الإضافة والطلبات الجديدة غير متاحة.</p>}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <StoreProfile store={store} onSaved={() => void mutateStore()} />
        <ProductForm store={store} onCreated={() => void mutateProducts()} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProductInventory products={products} error={productsError} onSaved={() => void mutateProducts()} active={store.status === "active"} />
        <MerchantOrders orders={orders} error={ordersError} onStatusChanged={() => { void mutateOrders(); void mutateProducts(); }} />
      </section>

      <section aria-labelledby="merchant-shisha-heading" className="grid gap-6 rounded-3xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:col-span-2">
          <Badge variant="secondary" className="mb-2">قسم خاص</Badge>
          <h2 id="merchant-shisha-heading" className="text-2xl font-bold">معسلات المتجر</h2>
          <p className="mt-2 text-sm text-muted-foreground">أضف معسلات ومنتجات الشيشة وتابع الكمية والسعر وحالة المراجعة. لن تظهر المنتجات للعملاء قبل اعتماد الإدارة.</p>
        </div>
        <ProductForm store={store} onCreated={() => void mutateProducts()} presetCategory="معسلات" />
        <ProductInventory
          products={products.filter(isShishaProduct)}
          error={productsError}
          onSaved={() => void mutateProducts()}
          active={store.status === "active"}
          title="معسلات ومنتجات الشيشة"
          description="تظهر هنا المنتجات المصنفة كمعسل أو شيشة؛ عدّل السعر والكمية، وتابع اعتماد الإدارة قبل النشر."
        />
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Card className="rounded-2xl"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div></CardContent></Card>;
}

function StoreProfile({ store, onSaved }: { store: MerchantStorePrivate; onSaved: () => void }) {
  const [form, setForm] = useState({ name: store.name, description: store.description, contact_phone: store.contact_phone, city: store.city });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await db.from("merchant_stores").update(form).eq("id", store.id);
    setBusy(false);
    if (error) { setMessage("تعذر حفظ بيانات المتجر."); return; }
    setMessage("تم حفظ بيانات المتجر.");
    onSaved();
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>بيانات المتجر</CardTitle><CardDescription>هذه المعلومات تظهر للعملاء في السوق.</CardDescription></CardHeader>
      <CardContent><form onSubmit={save} className="grid gap-3">
        <Field label="اسم المتجر"><Input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="رقم التواصل"><Input required minLength={7} maxLength={24} inputMode="tel" value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} /></Field>
        <Field label="المدينة"><Input maxLength={80} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
        <Field label="نبذة قصيرة"><Textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" disabled={busy || store.status !== "active"}>{busy ? "جارٍ الحفظ…" : "حفظ بيانات المتجر"}</Button>
      </form></CardContent>
    </Card>
  );
}

function ProductForm({ store, onCreated, presetCategory }: { store: MerchantStorePrivate; onCreated: () => void; presetCategory?: string }) {
  const [form, setForm] = useState({ title: "", description: "", category: presetCategory ?? "", price: "", currency: "YER", stock: "1" });
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
    setForm({ title: "", description: "", category: presetCategory ?? "", price: "", currency: "YER", stock: "1" });
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
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size >= 6 * 1024 * 1024) {
      setImage(null);
      setSelectedImagePath(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setImageUploadMessage("ارفع صورة JPG أو PNG أقل من 6 ميجابايت.");
      return;
    }
    const previousTemporaryPath = uploadedImagePath;
    setSelectedImagePath(null);
    setImage(file);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(file));
    setUploadingImage(true);
    setImageUploadMessage("جارٍ رفع الصورة…");
    const extension = file.type === "image/png" ? "png" : "jpg";
    const imagePath = `${store.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("merchant-product-images")
      .upload(imagePath, file, { contentType: file.type, upsert: false });
    setUploadingImage(false);
    if (uploadError) {
      setImage(null);
      setImageUploadMessage("تعذر رفع الصورة. تأكد من نوعها وحجمها ثم أعد المحاولة.");
      return;
    }
    setSelectedImagePath(imagePath);
    setUploadedImagePath(imagePath);
    if (previousTemporaryPath && previousTemporaryPath !== draftImagePath) {
      await supabase.storage.from("merchant-product-images").remove([previousTemporaryPath]);
    }
    setImageUploadMessage("تم رفع الصورة بنجاح، وستظهر في عرض المنتج بعد الاعتماد");
  }

  async function persist(mode: "draft" | "submit") {
    if (!formElement?.reportValidity()) return;
    if (store.status !== "active") return;
    if (uploadingImage) {
      setMessage("انتظر اكتمال رفع الصورة.");
      return;
    }
    if (!selectedImagePath && !draftImagePath) {
      setMessage("اختر صورة للمنتج قبل الحفظ.");
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
      setMessage("تحقق من السعر والكمية المدخلة.");
      return;
    }

    setBusy(true);
    setMessage("");
    const imagePath = selectedImagePath ?? draftImagePath;
    if (!imagePath) {
      setBusy(false);
      setMessage("اختر صورة للمنتج قبل الحفظ.");
      return;
    }

    const values = {
      store_id: store.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: presetCategory ?? form.category.trim(),
      price,
      currency: form.currency,
      stock,
      image_path: imagePath,
    };

    let productId = draftId;
    if (productId) {
      const { error } = await db.from("merchant_products").update(values).eq("id", productId).eq("store_id", store.id);
      if (error) {
        setBusy(false);
        setMessage("تعذر تحديث المسودة. لم يتغير المنتج المحفوظ.");
        return;
      }
      if (draftImagePath && draftImagePath !== imagePath) {
        await supabase.storage.from("merchant-product-images").remove([draftImagePath]);
      }
    } else {
      const { data, error } = await db.from("merchant_products").insert(values).select("id").single();
      if (error || !data) {
        setBusy(false);
        setMessage("تعذر حفظ المنتج. تحقق من البيانات ثم أعد المحاولة.");
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

    if (mode === "draft") {
      setBusy(false);
      setMessage("حُفظ المنتج كمسودة. يمكنك العودة لإكماله أو إرساله للمراجعة.");
      return;
    }

    const { error: submitError } = await db.rpc("merchant_submit_product", { _product_id: productId });
    setBusy(false);
    if (submitError) {
      setMessage("حُفظت المسودة، لكن تعذر إرسالها للمراجعة. أعد المحاولة لاحقًا.");
      return;
    }

    resetForm();
    setMessage("تم إرسال المنتج إلى الإدارة للمراجعة.");
    onCreated();
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus aria-hidden="true" className="size-5 text-primary" /> {presetCategory ? "إضافة معسل أو منتج شيشة" : "إضافة منتج"}</CardTitle><CardDescription>{presetCategory ? "احفظ المعسل كمسودة أو أرسله لمراجعة الإدارة؛ التصنيف يضبط تلقائيًا إلى معسلات." : "احفظ المنتج كمسودة أو أرسله للمراجعة؛ لن يظهر للعملاء قبل اعتماد الإدارة."}</CardDescription></CardHeader>
      <CardContent><form ref={setFormElement} onSubmit={(event) => { event.preventDefault(); void persist("submit"); }} className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم المنتج"><Input required minLength={2} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        {!presetCategory && <Field label="التصنيف"><Input maxLength={60} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="مثال: عطور" /></Field>}
        <Field label="السعر"><Input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
        <Field label="العملة"><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="YER">ريال يمني (YER)</option><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار (USD)</option></select></Field>
        <Field label="الكمية المتاحة"><Input required type="number" min="0" max="1000000" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></Field>
        <div className="grid gap-1.5 text-sm font-medium">
          <span>صورة المنتج</span>
          <span className="text-xs font-normal text-muted-foreground">ارفع صورة واضحة للمنتج - JPG أو PNG - أقل من 6 ميجابايت</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy || uploadingImage || store.status !== "active"} onClick={() => cameraInputRef.current?.click()}>
              <Camera aria-hidden="true" className="ml-2 size-4" />التقاط صورة بالكاميرا
            </Button>
            <Button type="button" variant="outline" disabled={busy || uploadingImage || store.status !== "active"} onClick={() => galleryInputRef.current?.click()}>
              <ImagePlus aria-hidden="true" className="ml-2 size-4" />اختيار من الصور
            </Button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => { void handleImageSelection(event.target.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" tabIndex={-1} aria-label="التقاط صورة المنتج بالكاميرا" />
          <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png" onChange={(event) => { void handleImageSelection(event.target.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" tabIndex={-1} aria-label="اختيار صورة المنتج من الصور" />
          {imagePreviewUrl && <img src={imagePreviewUrl} alt="معاينة صورة المنتج" className="mt-2 h-36 w-full rounded-xl border object-cover" />}
          {imageUploadMessage && <span role="status" className={`text-xs font-medium ${selectedImagePath ? "text-primary" : "text-muted-foreground"}`}>{imageUploadMessage}</span>}
          {image?.name && <span className="text-xs font-normal text-muted-foreground">{image.name}</span>}
        </div>
        <Field label="وصف المنتج" className="sm:col-span-2"><Textarea maxLength={1200} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        {message && <p role="status" className="text-sm text-muted-foreground sm:col-span-2">{message}</p>}
        <p className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2"><ImagePlus aria-hidden="true" className="size-4" /> على الهاتف يمكنك التقاط الصورة مباشرة بالكاميرا، ولن تظهر للزبائن إلا بعد اعتماد الإدارة.</p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="button" variant="outline" disabled={busy || store.status !== "active"} onClick={() => void persist("draft")}>{busy ? "جارٍ الحفظ…" : "حفظ كمسودة"}</Button>
          <Button type="submit" disabled={busy || uploadingImage || store.status !== "active"}>{busy ? "جارٍ الحفظ…" : draftId ? "إرسال المسودة للمراجعة" : "إرسال للمراجعة"}</Button>
        </div>
      </form></CardContent>
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
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="grid gap-3">
        {products.length === 0 ? <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">لم تضف منتجات بعد.</p> : products.map((product) => <InventoryRow key={product.id} product={product} onSaved={onSaved} active={active} />)}
      </CardContent>
    </Card>
  );
}

function InventoryRow({ product, onSaved, active }: { product: MerchantProduct & { image_url: string | null }; onSaved: () => void; active: boolean }) {
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await db.from("merchant_products").update({ price: Number(price), stock: Number(stock) }).eq("id", product.id);
    setBusy(false);
    if (error) { setMessage("تعذر الحفظ"); return; }
    setMessage("تم الحفظ");
    onSaved();
  }
  return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      {product.image_url ? <img src={product.image_url} alt="" className="size-16 rounded-lg object-cover" loading="lazy" /> : <div className="flex size-16 items-center justify-center rounded-lg bg-muted"><ImagePlus aria-hidden="true" className="size-5 text-muted-foreground" /></div>}
      <div className="min-w-0"><p className="truncate font-semibold">{product.title}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Badge variant={product.status === "approved" ? "secondary" : product.status === "rejected" ? "destructive" : "outline"}>{productStatusLabels[product.status]}</Badge>{product.review_note && <span className="text-xs text-destructive">{product.review_note}</span>}</div><div className="mt-2 grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs text-muted-foreground">السعر<Input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="h-8" /></label><label className="grid gap-1 text-xs text-muted-foreground">المخزون<Input type="number" min="0" max="1000000" value={stock} onChange={(event) => setStock(event.target.value)} className="h-8" /></label></div></div>
      <div className="flex flex-col items-start gap-2 sm:items-end"><span className="text-xs text-muted-foreground">{product.currency}</span><Button size="sm" type="submit" variant="outline" disabled={busy || !active}>{busy ? "حفظ…" : "حفظ"}</Button>{message && <span role="status" className="text-xs text-muted-foreground">{message}</span>}</div>
    </form>
  );
}

function MerchantOrders({ orders, error, onStatusChanged }: { orders: MerchantOrder[]; error?: Error; onStatusChanged: () => void }) {
  if (error) return <Card className="rounded-2xl"><CardContent className="py-8 text-sm text-destructive">تعذر تحميل الطلبات.</CardContent></Card>;
  return (
    <Card className="rounded-2xl">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span className="text-sm font-semibold">{formatMoney(Number(order.total_amount), order.currency)} <span className="font-normal text-muted-foreground">· {formatDate(order.created_at)}</span></span><div className="flex gap-2">{action && <Button size="sm" onClick={() => void changeStatus(action.status)} disabled={busy}>{busy ? "جارٍ التحديث…" : action.label}</Button>}{!["delivered", "cancelled"].includes(order.status) && <Button size="sm" variant="outline" onClick={() => void changeStatus("cancelled")} disabled={busy}>إلغاء</Button>}</div></div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </article>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium ${className}`}><span>{label}</span>{children}</label>;
}
