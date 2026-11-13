import { useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import { BadgeCheck, Search, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
type Candidate = { user_id: string; full_name: string; phone: string };
type AdminStore = MerchantStorePrivate & { owner_id: string; product_count: number };
type ReviewProduct = MerchantProduct & { store_name: string; image_url: string | null };
type AdminTab = "stores" | "review" | "orders";

async function loadStores() {
  const { data, error } = await db.rpc("merchant_admin_list_stores");
  if (error) throw error;
  return (data ?? []) as AdminStore[];
}

async function loadReviewQueue() {
  const { data, error } = await db.from("merchant_products").select("*").eq("status", "pending_review").order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as MerchantProduct[];
  const storeIds = [...new Set(rows.map((row) => row.store_id))];
  const { data: stores, error: storesError } = storeIds.length
    ? await db.from("merchant_stores").select("id,name").in("id", storeIds)
    : { data: [], error: null };
  if (storesError) throw storesError;
  const storeNameById = new Map((stores ?? []).map((store: { id: string; name: string }) => [store.id, store.name]));
  const images = await Promise.all(rows.map((row) => getSignedProductImage(row.image_path)));
  return rows.map((row, index) => ({ ...row, store_name: storeNameById.get(row.store_id) ?? "متجر", image_url: images[index] ?? null })) as ReviewProduct[];
}

async function loadOrders() {
  const { data, error } = await db.from("merchant_orders").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as MerchantOrder[];
}

export function AdminMerchantMarketplace() {
  const [tab, setTab] = useState<AdminTab>("stores");
  const { data: stores = [], error: storesError, mutate: mutateStores } = useSWR("merchant-admin-stores", loadStores);
  const { data: queue = [], error: queueError, mutate: mutateQueue } = useSWR("merchant-admin-review", loadReviewQueue);
  const { data: orders = [], error: ordersError, mutate: mutateOrders } = useSWR("merchant-admin-orders", loadOrders);

  return (
    <main dir="rtl" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:p-8">
          <div><Badge variant="secondary" className="mb-3">إدارة السوق</Badge><h1 className="text-3xl font-bold">إدارة التجار والمنتجات</h1><p className="mt-2 text-muted-foreground">تسجيل المتاجر، مراجعة المنتجات، ومتابعة الطلبات والعمولات.</p></div>
          <div className="flex flex-wrap gap-2" aria-label="أقسام إدارة السوق">
            <TabButton active={tab === "stores"} onClick={() => setTab("stores")}>المتاجر</TabButton>
            <TabButton active={tab === "review"} onClick={() => setTab("review")}>مراجعة المنتجات <span className="rounded-full bg-background/70 px-1.5">{queue.length}</span></TabButton>
            <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>الطلبات</TabButton>
          </div>
        </header>

        {tab === "stores" && <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" aria-label="إدارة المتاجر">
          <CreateStoreForm onCreated={() => void mutateStores()} />
          <Card className="rounded-2xl"><CardHeader><CardTitle>المتاجر المسجلة</CardTitle><CardDescription>{stores.length.toLocaleString("ar-YE")} متجر</CardDescription></CardHeader><CardContent className="grid gap-3">{storesError ? <p role="alert" className="text-sm text-destructive">تعذر تحميل المتاجر.</p> : stores.length ? stores.map((store) => <AdminStoreRow key={store.id} store={store} onSaved={() => void mutateStores()} />) : <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">لا توجد متاجر مسجلة بعد.</p>}</CardContent></Card>
        </section>}

        {tab === "review" && <section aria-label="مراجعة المنتجات"><Card className="rounded-2xl"><CardHeader><CardTitle>قائمة مراجعة المنتجات</CardTitle><CardDescription>المنتجات لا تظهر في السوق حتى اعتمادها.</CardDescription></CardHeader><CardContent className="grid gap-4">{queueError ? <p role="alert" className="text-sm text-destructive">تعذر تحميل قائمة المراجعة.</p> : queue.length ? queue.map((product) => <ReviewRow key={product.id} product={product} onReviewed={() => { void mutateQueue(); void mutateStores(); }} />) : <div className="rounded-xl bg-muted/50 p-8 text-center"><BadgeCheck aria-hidden="true" className="mx-auto mb-2 size-7 text-primary" /><p className="font-semibold">لا توجد منتجات بانتظار المراجعة</p></div>}</CardContent></Card></section>}

        {tab === "orders" && <section aria-label="طلبات السوق"><Card className="rounded-2xl"><CardHeader><CardTitle>طلبات السوق</CardTitle><CardDescription>آخر 100 طلب. بيانات العناوين مرئية للإدارة ومقدم الطلب والمتجر المعني فقط.</CardDescription></CardHeader><CardContent className="grid gap-3">{ordersError ? <p role="alert" className="text-sm text-destructive">تعذر تحميل الطلبات.</p> : orders.length ? orders.map((order) => <AdminOrderRow key={order.id} order={order} onChanged={() => void mutateOrders()} />) : <p className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">لا توجد طلبات حتى الآن.</p>}</CardContent></Card></section>}
      </main>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted"}`}>{children}</button>;
}

function CreateStoreForm({ onCreated }: { onCreated: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data: candidates = [], isLoading } = useSWR(
    search.trim().length >= 2 ? ["merchant-admin-candidates", search.trim()] : null,
    async ([, query]) => {
      const { data, error } = await db.rpc("merchant_admin_candidates", { _search: query });
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const { error } = await db.rpc("merchant_admin_create_store", {
      _owner_id: selected.user_id,
      _name: form.name.trim(),
      _contact_phone: form.phone.trim(),
      _city: form.city.trim(),
    });
    if (error) { setBusy(false); setMessage("تعذر إنشاء المتجر. قد يكون للمستخدم متجر مسجل بالفعل."); return; }
    const { error: notificationError } = await db.from("notifications").insert({
      user_id: selected.user_id,
      title: "مبروك، تم منحك علامة تاجر.",
      body: 'الآن تقدر تضيف منتجات متجرك وصورها من زر "أضف منتج". منتجاتك بتظهر للزبائن بعد ما تعتمدها الإدارة.',
      kind: "account",
      href: "/merchant?view=add-product",
      is_active: true,
    });
    setBusy(false);
    setSelected(null);
    setSearch("");
    setForm({ name: "", phone: "", city: "" });
    setMessage(notificationError ? "تم تسجيل المتجر، لكن تعذر إرسال إشعار التاجر. يمكن للتاجر البدء من لوحة المتجر." : "تم تسجيل المتجر وإرسال إشعار منح صفة التاجر.");
    onCreated();
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="flex items-center gap-2"><Store aria-hidden="true" className="size-5 text-primary" /> تسجيل متجر جديد</CardTitle><CardDescription>ابحث عن حساب العميل أولًا، ثم اربط المتجر بحسابه.</CardDescription></CardHeader>
      <CardContent className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium"><span>بحث عن العميل بالاسم أو رقم الهاتف</span><div className="relative"><Search aria-hidden="true" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setSelected(null); }} placeholder="اكتب حرفين على الأقل" className="pr-9" /></div></label>
        {search.trim().length >= 2 && <div className="max-h-48 overflow-auto rounded-xl border p-1" aria-label="نتائج البحث">{isLoading ? <p className="p-3 text-sm text-muted-foreground">جارٍ البحث…</p> : candidates.length ? candidates.map((candidate) => <button key={candidate.user_id} type="button" onClick={() => { setSelected(candidate); setForm({ ...form, phone: candidate.phone ?? "" }); }} className={`flex w-full items-center gap-3 rounded-lg p-3 text-right hover:bg-muted ${selected?.user_id === candidate.user_id ? "bg-primary/10" : ""}`}><UserRound aria-hidden="true" className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{candidate.full_name}</span><span className="block text-xs text-muted-foreground">{candidate.phone || "لا يوجد رقم هاتف"}</span></span></button>) : <p className="p-3 text-sm text-muted-foreground">لا توجد حسابات مطابقة غير مرتبطة بمتجر.</p>}</div>}
        {selected && <form onSubmit={create} className="grid gap-3 border-t pt-4">
          <p className="text-sm font-semibold">العميل: {selected.full_name}</p>
          <Field label="اسم المتجر"><Input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="رقم تواصل المتجر"><Input required minLength={7} maxLength={24} inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="المدينة"><Input maxLength={80} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          <Button type="submit" disabled={busy}>{busy ? "جارٍ التسجيل…" : "تسجيل المتجر"}</Button>
        </form>}
        {!selected && message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}

function AdminStoreRow({ store, onSaved }: { store: AdminStore; onSaved: () => void }) {
  const [rate, setRate] = useState(String(Number(store.commission_rate) * 100));
  const [status, setStatus] = useState(store.status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await db.rpc("merchant_admin_set_store_terms", { _store_id: store.id, _status: status, _commission_rate: Number(rate) / 100 });
    setBusy(false);
    if (error) { setMessage("تعذر تحديث الشروط."); return; }
    setMessage("تم تحديث الشروط.");
    onSaved();
  }
  return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0"><p className="truncate font-semibold">{store.name}</p><p className="mt-1 text-xs text-muted-foreground">{store.contact_phone} · {store.city || "دون مدينة"} · {store.product_count.toLocaleString("ar-YE")} منتج</p><p className="mt-1 truncate text-xs text-muted-foreground">معرّف صاحب المتجر: {store.owner_id}</p></div>
      <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs text-muted-foreground">العمولة %<Input type="number" min="0" max="30" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="h-8 w-24" /></label><label className="grid gap-1 text-xs text-muted-foreground">الحالة<select value={status} onChange={(event) => setStatus(event.target.value as AdminStore["status"])} className="h-8 rounded-md border border-input bg-background px-2 text-sm"><option value="active">نشط</option><option value="suspended">موقوف</option></select></label><Button type="submit" size="sm" variant="outline" disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button></div>
      {message && <p role="status" className="text-xs text-muted-foreground sm:col-span-2">{message}</p>}
    </form>
  );
}

function ReviewRow({ product, onReviewed }: { product: ReviewProduct; onReviewed: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function review(decision: "approved" | "rejected") {
    setBusy(true);
    setMessage("");
    const { error } = await db.rpc("merchant_admin_review_product", { _product_id: product.id, _decision: decision, _review_note: note.trim() });
    setBusy(false);
    if (error) { setMessage("تعذر حفظ قرار المراجعة."); return; }
    onReviewed();
  }
  return (
    <article className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-[150px_1fr]">
      {product.image_url ? <img src={product.image_url} alt={product.title} className="aspect-[4/3] w-full rounded-xl object-cover sm:aspect-square" loading="lazy" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted sm:aspect-square">لا توجد صورة</div>}
      <div className="flex min-w-0 flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{product.title}</h3><p className="mt-1 text-sm text-muted-foreground">متجر {product.store_name}</p></div><Badge variant="outline">{productStatusLabels.pending_review}</Badge></div><p className="text-sm text-muted-foreground">{product.description || "لا يوجد وصف"}</p><div className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span>{formatMoney(Number(product.price), product.currency)}</span><span>المخزون: {product.stock.toLocaleString("ar-YE")}</span><span>{product.category || "دون تصنيف"}</span></div><label className="grid gap-1.5 text-sm font-medium"><span>ملاحظة الرفض (تظهر للتاجر عند الرفض)</span><Textarea maxLength={500} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="اذكر التعديل المطلوب إن وجد" /></label>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<div className="flex flex-wrap gap-2"><Button type="button" onClick={() => void review("approved")} disabled={busy}><BadgeCheck data-icon="inline-start" aria-hidden="true" /> اعتماد المنتج</Button><Button type="button" variant="outline" onClick={() => void review("rejected")} disabled={busy}>إرجاع للتعديل</Button></div></div>
    </article>
  );
}

function AdminOrderRow({ order, onChanged }: { order: MerchantOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const actions: Partial<Record<MerchantOrder["status"], { status: MerchantOrder["status"]; label: string }>> = {
    pending: { status: "confirmed", label: "تأكيد" },
    confirmed: { status: "preparing", label: "بدء التجهيز" },
    preparing: { status: "ready", label: "جاهز" },
    ready: { status: "delivered", label: "تم التسليم" },
  };
  const action = actions[order.status];
  async function update(status: MerchantOrder["status"]) {
    setBusy(true);
    setMessage("");
    const { error } = await db.rpc("merchant_update_order_status", { _order_id: order.id, _next_status: status });
    setBusy(false);
    if (error) { setMessage("تعذر تحديث الحالة."); return; }
    onChanged();
  }
  return (
    <article className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.product_title} × {order.quantity.toLocaleString("ar-YE")}</p><Badge variant={order.status === "delivered" ? "secondary" : order.status === "cancelled" ? "destructive" : "outline"}>{orderStatusLabels[order.status]}</Badge></div><p className="mt-1 text-sm">{order.customer_name} · {order.customer_phone}</p><p className="mt-1 text-xs text-muted-foreground">{order.customer_city} · {order.delivery_address} · {formatDate(order.created_at)}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>الإجمالي {formatMoney(Number(order.total_amount), order.currency)}</span><span>عمولة {formatMoney(Number(order.commission_amount), order.currency)}</span><span>للتاجر {formatMoney(Number(order.seller_amount), order.currency)}</span></div></div>
      <div className="flex flex-wrap gap-2">{action && <Button size="sm" onClick={() => void update(action.status)} disabled={busy}>{action.label}</Button>}{!["delivered", "cancelled"].includes(order.status) && <Button size="sm" variant="outline" onClick={() => void update("cancelled")} disabled={busy}>إلغاء</Button>}</div>
      {message && <p role="alert" className="text-xs text-destructive lg:col-span-2">{message}</p>}
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{children}</label>;
}
