import { useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import { BadgeCheck, ImagePlus, PackagePlus, Store, Truck } from "lucide-react";
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

  const delivered = orders.filter((order) => order.status === "delivered");
  const revenue = delivered.reduce((sum, order) => sum + Number(order.seller_amount), 0);
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

  return (
    <main dir="rtl" className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div><Badge variant={store.status === "active" ? "secondary" : "destructive"}>{store.status === "active" ? "المتجر نشط" : "المتجر موقوف"}</Badge><h1 className="mt-3 text-3xl font-bold">مرحبًا بك في {store.name}</h1><p className="mt-2 text-muted-foreground">أدر منتجاتك وطلباتك من مكان واحد.</p></div>
        <div className="rounded-2xl bg-muted/60 px-5 py-4 text-sm"><p className="text-muted-foreground">عمولة المنصة</p><p className="mt-1 text-2xl font-bold">{(Number(store.commission_rate) * 100).toLocaleString("ar-YE")}٪</p></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="ملخص المتجر">
        <Metric icon={<PackagePlus aria-hidden="true" />} label="المنتجات" value={products.length.toLocaleString("ar-YE")} />
        <Metric icon={<Truck aria-hidden="true" />} label="الطلبات النشطة" value={pendingOrders.toLocaleString("ar-YE")} />
        <Metric icon={<BadgeCheck aria-hidden="true" />} label="مستحقات الطلبات المسلّمة" value={formatMoney(revenue, "YER")} />
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

function ProductForm({ store, onCreated }: { store: MerchantStorePrivate; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "", price: "", currency: "YER", stock: "1" });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image || store.status !== "active") return;
    if (!image.type.startsWith("image/") || image.size > 6 * 1024 * 1024) {
      setMessage("اختر صورة JPG أو PNG أو WebP لا يتجاوز حجمها 6 ميجابايت.");
      return;
    }
    setBusy(true);
    setMessage("");
    const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const imagePath = `${store.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("merchant-product-images").upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) {
      setBusy(false);
      setMessage("تعذر رفع الصورة. تأكد من نوعها وحجمها ثم أعد المحاولة.");
      return;
    }

    const { data, error: insertError } = await db.from("merchant_products").insert({
      store_id: store.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      currency: form.currency,
      stock: Number(form.stock),
      image_path: imagePath,
    }).select("id").single();

    if (insertError) {
      await supabase.storage.from("merchant-product-images").remove([imagePath]);
      setBusy(false);
      setMessage("تعذر حفظ المنتج. تحقق من السعر والمخزون ثم أعد المحاولة.");
      return;
    }

    const { error: submitError } = await db.rpc("merchant_submit_product", { _product_id: data.id });
    setBusy(false);
    setForm({ title: "", description: "", category: "", price: "", currency: "YER", stock: "1" });
    setImage(null);
    onCreated();
    setMessage(submitError ? "تم حفظ المنتج كمسودة؛ تعذرت إرساله للمراجعة." : "تم إرسال المنتج إلى الإدارة للمراجعة.");
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus aria-hidden="true" className="size-5 text-primary" /> إضافة منتج</CardTitle><CardDescription>يلزم اعتماد الإدارة قبل ظهور المنتج للعملاء.</CardDescription></CardHeader>
      <CardContent><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم المنتج"><Input required minLength={2} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="التصنيف"><Input maxLength={60} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="مثال: عطور" /></Field>
        <Field label="السعر"><Input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
        <Field label="العملة"><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="YER">ريال يمني (YER)</option><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار (USD)</option></select></Field>
        <Field label="الكمية المتاحة"><Input required type="number" min="0" max="1000000" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></Field>
        <Field label="صورة المنتج"><Input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} className="h-auto min-h-9 py-2" /></Field>
        <Field label="وصف المنتج" className="sm:col-span-2"><Textarea maxLength={1200} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        {message && <p role="status" className="text-sm text-muted-foreground sm:col-span-2">{message}</p>}
        <p className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2"><ImagePlus aria-hidden="true" className="size-4" /> JPG أو PNG أو WebP، بحد أقصى 6 ميجابايت.</p>
        <Button type="submit" disabled={busy || !image || store.status !== "active"} className="sm:col-span-2">{busy ? "جارٍ حفظ المنتج…" : "إرسال للمراجعة"}</Button>
      </form></CardContent>
    </Card>
  );
}

function ProductInventory({ products, error, onSaved, active }: { products: (MerchantProduct & { image_url: string | null })[]; error?: Error; onSaved: () => void; active: boolean }) {
  if (error) return <Card className="rounded-2xl"><CardContent className="py-8 text-sm text-destructive">تعذر تحميل المنتجات.</CardContent></Card>;
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>إدارة المنتجات</CardTitle><CardDescription>غيّر السعر والمخزون مباشرة. تعديل وصف أو صورة منتج منشور يعيده للمراجعة.</CardDescription></CardHeader>
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
