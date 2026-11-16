import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { 
  BadgeCheck, 
  Search, 
  Store, 
  UserRound, 
  ShoppingBag, 
  Clock, 
  Percent, 
  Phone, 
  CheckCircle2, 
  XCircle,
  Eye,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/* ---------- الأنواع ---------- */
type AdminTab = "stores" | "review" | "orders";
type OrderStatus = "new" | "preparing" | "ready" | "done" | "cancel";

interface Candidate {
  user_id: string;
  full_name: string;
  phone: string;
  city: string;
}

interface AdminStore {
  id: string;
  name: string;
  contact_phone: string;
  city: string;
  commission_rate: number;
  status: "active" | "suspended";
  owner_id: string;
  owner_name: string;
  product_count: number;
}

interface ReviewProduct {
  id: string;
  title: string;
  store_id: string;
  store_name: string;
  category: string;
  price: number;
  old_price: number;
  stock: number;
  status: string;
  description: string;
}

interface AdminOrder {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  delivery_address: string;
  store_name: string;
  product_title: string;
  amount: number;
  quantity: number;
  status: OrderStatus;
  created_at: string;
}

const orderStatusLabels: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "طلب جديد", variant: "default" },
  preparing: { label: "قيد التجهيز", variant: "secondary" },
  ready: { label: "جاهز للتسليم", variant: "secondary" },
  done: { label: "مكتمل", variant: "outline" },
  cancel: { label: "ملغي", variant: "destructive" },
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("ar-YE", { style: "currency", currency: "YER", maximumFractionDigits: 0 }).format(amount);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/* =========================== المكوّن الرئيسي =========================== */
export function AdminMerchantMarketplace() {
  const [tab, setTab] = useState<AdminTab>("stores");
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [queue, setQueue] = useState<ReviewProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [stRes, prRes, odRes] = await Promise.all([
        supabase.from("stores").select("*, owner:profiles(full_name, city), products(count)").order("created_at", { ascending: false }),
        supabase.from("products").select("*, store:stores(name)").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, store:stores(name)").order("created_at", { ascending: false }),
      ]);

      if (stRes.error) throw new Error("تعذر تحميل المتاجر: " + stRes.error.message);
      if (prRes.error) throw new Error("تعذر تحميل المنتجات: " + prRes.error.message);
      if (odRes.error) throw new Error("تعذر تحميل الطلبات: " + odRes.error.message);

      setStores((stRes.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        contact_phone: r.phone || "—",
        city: r.owner?.city || "صنعاء",
        commission_rate: Number(r.commission) || 10,
        status: r.active ? "active" : "suspended",
        owner_id: r.owner_id || "غير مرتبط",
        owner_name: r.owner?.full_name || "بدون اسم",
        product_count: r.products?.[0]?.count ?? 0,
      })));

      setQueue((prRes.data ?? []).map((r: any) => ({
        id: r.id,
        title: r.name,
        store_id: r.store_id,
        store_name: r.store?.name ?? "متجر",
        category: r.category || "عام",
        price: Number(r.price) || 0,
        old_price: Number(r.old_price) || 0,
        stock: r.qty || 0,
        status: r.status,
        description: "",
      })));

      setOrders((odRes.data ?? []).map((r: any) => ({
        id: r.id,
        code: r.code || r.id.slice(0, 8),
        customer_name: r.customer_name || "عميل",
        customer_phone: r.customer_phone || "—",
        customer_city: "اليمن",
        delivery_address: "استلام من الفرع",
        store_name: r.store?.name ?? "متجر عام",
        product_title: r.product_name || "منتج",
        amount: Number(r.amount) || 0,
        quantity: 1,
        status: (r.status as OrderStatus) || "new",
        created_at: r.created_at,
      })));
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <main dir="rtl" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:p-8">
        <div>
          <Badge variant="secondary" className="mb-3">إدارة السوق</Badge>
          <h1 className="text-3xl font-bold tracking-tight">إدارة التجار والمنتجات</h1>
          <p className="mt-2 text-muted-foreground">تسجيل المتاجر، مراجعة المنتجات، ومتابعة الطلبات والعمولات.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="أقسام إدارة السوق">
          <TabButton active={tab === "stores"} onClick={() => setTab("stores")}>
            المتاجر <span className="mr-1 rounded-full bg-background/80 px-2 text-xs">{stores.length}</span>
          </TabButton>
          <TabButton active={tab === "review"} onClick={() => setTab("review")}>
            مراجعة المنتجات <span className="mr-1 rounded-full bg-primary/20 px-2 text-xs">{queue.length}</span>
          </TabButton>
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
            الطلبات <span className="mr-1 rounded-full bg-background/80 px-2 text-xs">{orders.length}</span>
          </TabButton>
        </div>
      </header>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ---------- تبويب المتاجر ---------- */}
      {tab === "stores" && (
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" aria-label="إدارة المتاجر">
          <CreateStoreForm onCreated={loadData} />
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>المتاجر المسجلة</CardTitle>
              <CardDescription>{stores.length} متجر مسجل في النظام</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">جارٍ تحميل المتاجر…</p>
              ) : stores.length ? (
                stores.map((store) => (
                  <AdminStoreRow key={store.id} store={store} onSaved={loadData} />
                ))
              ) : (
                <p className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
                  لا توجد متاجر مسجلة بعد. استخدم النموذج لتسجيل أول متجر.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ---------- تبويب مراجعة المنتجات ---------- */}
      {tab === "review" && (
        <section aria-label="مراجعة المنتجات">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>قائمة مراجعة المنتجات</CardTitle>
              <CardDescription>المنتجات لا تظهر في المتجر للزبائن حتى اعتمادها من الإدارة.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {loading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">جارٍ تحميل قائمة المراجعة…</p>
              ) : queue.length ? (
                queue.map((product) => (
                  <ReviewRow key={product.id} product={product} onReviewed={loadData} />
                ))
              ) : (
                <div className="rounded-xl bg-muted/40 p-12 text-center">
                  <BadgeCheck aria-hidden="true" className="mx-auto mb-3 size-10 text-primary" />
                  <p className="font-semibold text-lg">لا توجد منتجات بانتظار المراجعة</p>
                  <p className="mt-1 text-sm text-muted-foreground">جميع المنتجات المرفوعة إما معتمدة أو تم الرد عليها.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ---------- تبويب الطلبات ---------- */}
      {tab === "orders" && (
        <section aria-label="طلبات السوق">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>طلبات السوق</CardTitle>
              <CardDescription>متابعة الطلبات وتحديث حالاتها وحساب العمولات.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">جارٍ تحميل الطلبات…</p>
              ) : orders.length ? (
                orders.map((order) => (
                  <AdminOrderRow key={order.id} order={order} onChanged={loadData} />
                ))
              ) : (
                <p className="rounded-xl bg-muted/50 p-12 text-center text-sm text-muted-foreground">
                  لا توجد طلبات مسجلة حتى الآن.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}

/* =========================== أزرار التبويب =========================== */
function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "border bg-background hover:bg-muted text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================== نموذج تسجيل متجر جديد =========================== */
function CreateStoreForm({ onCreated }: { onCreated: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setCandidates([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const clean = q.replace(/[%,()]/g, "");
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, city")
        .or(`full_name.ilike.%${clean}%,phone.ilike.%${clean}%`)
        .limit(6);

      setCandidates(
        (data ?? []).map((d) => ({
          user_id: d.id,
          full_name: d.full_name || "بدون اسم",
          phone: d.phone || "",
          city: d.city || "صنعاء",
        }))
      );
      setSearching(false);
    }, 280);
    return () => clearTimeout(t);
  }, [search]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");

    const { error } = await supabase.from("stores").insert({
      name: form.name.trim(),
      phone: form.phone.trim() || selected.phone,
      owner_id: selected.user_id,
      commission: 10,
      active: true,
    });

    setBusy(false);
    if (error) {
      setMessage("تعذر إنشاء المتجر: " + error.message);
      return;
    }

    setMessage("تم تسجيل المتجر بنجاح وربطه بالعميل.");
    setSelected(null);
    setSearch("");
    setForm({ name: "", phone: "", city: "" });
    onCreated();
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="size-5 text-primary" /> تسجيل متجر جديد
        </CardTitle>
        <CardDescription>ابحث عن حساب العميل بالاسم أو الهاتف، ثم اربط المتجر به.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>بحث عن العميل</span>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder="اكتب اسم العميل أو رقمه…"
              className="pr-9"
            />
          </div>
        </label>

        {search.trim().length >= 2 && (
          <div className="max-h-48 overflow-auto rounded-xl border p-1" aria-label="نتائج البحث">
            {searching ? (
              <p className="p-3 text-center text-sm text-muted-foreground">جارٍ البحث…</p>
            ) : candidates.length ? (
              candidates.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => {
                    setSelected(c);
                    setForm((f) => ({ ...f, phone: c.phone }));
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-right transition-colors hover:bg-muted ${
                    selected?.user_id === c.user_id ? "bg-primary/10 border-primary" : ""
                  }`}
                >
                  <UserRound className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.full_name}</span>
                    <span className="block text-xs text-muted-foreground">{c.phone || "لا يوجد هاتف"} · {c.city}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="p-3 text-center text-sm text-muted-foreground">لا يوجد عملاء مطابقون.</p>
            )}
          </div>
        )}

        {selected && (
          <form onSubmit={create} className="grid gap-3 border-t pt-4">
            <div className="rounded-lg bg-primary/10 p-3 text-sm">
              <span className="font-semibold text-primary">العميل المختار:</span> {selected.full_name} ({selected.phone})
            </div>
            <Field label="اسم المتجر">
              <Input
                required
                minLength={2}
                maxLength={100}
                placeholder="مثال: متجر النخبة"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="رقم تواصل المتجر">
              <Input
                required
                dir="ltr"
                placeholder="77xxxxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "جارٍ الحفظ…" : "تأكيد تسجيل المتجر"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* =========================== بطاقة متجر مسجل =========================== */
function AdminStoreRow({ store, onSaved }: { store: AdminStore; onSaved: () => void }) {
  const [rate, setRate] = useState(String(store.commission_rate));
  const [status, setStatus] = useState<"active" | "suspended">(store.status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("stores")
      .update({
        commission: Number(rate) || 0,
        active: status === "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    setBusy(false);
    if (error) {
      setMessage("تعذر الحفظ: " + error.message);
      return;
    }
    setMessage("تم الحفظ بنجاح.");
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-base">{store.name}</p>
          <Badge variant={status === "active" ? "outline" : "destructive"}>
            {status === "active" ? "نشط" : "موقوف"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {store.contact_phone} · المالك: {store.owner_name} · {store.product_count} منتج
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          العمولة ٪
          <Input
            type="number"
            min="0"
            max="100"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-8 w-20 text-center"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          الحالة
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "suspended")}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={busy}>
          {busy ? "…" : "حفظ"}
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground sm:col-span-2">{message}</p>}
    </form>
  );
}

/* =========================== بطاقة مراجعة المنتج =========================== */
function ReviewRow({ product, onReviewed }: { product: ReviewProduct; onReviewed: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function review(decision: "approved" | "rejected") {
    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({ status: decision })
      .eq("id", product.id);

    setBusy(false);
    if (error) {
      setMessage("تعذر التحديث: " + error.message);
      return;
    }
    onReviewed();
  }

  return (
    <article className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-[120px_1fr]">
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted font-bold text-muted-foreground">
        <ShoppingBag className="size-8 opacity-40" />
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base">{product.title}</h3>
            <p className="text-xs text-muted-foreground">متجر: {product.store_name}</p>
          </div>
          <Badge variant="outline">بانتظار المراجعة</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          <span className="text-primary">{formatMoney(product.price)}</span>
          {product.old_price > product.price && (
            <span className="text-muted-foreground line-through">{formatMoney(product.old_price)}</span>
          )}
          <span className="text-xs text-muted-foreground">المخزون: {product.stock}</span>
          <span className="text-xs text-muted-foreground">القسم: {product.category}</span>
        </div>

        <label className="grid gap-1.5 text-xs font-medium">
          <span>ملاحظات المراجعة (في حال الرفض أو التعديل)</span>
          <Textarea
            maxLength={300}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اذكر سبب الرفض أو التعديلات المطلوبة…"
          />
        </label>

        {message && <p className="text-xs text-destructive">{message}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => review("approved")} disabled={busy}>
            <CheckCircle2 className="size-4 ml-1.5" /> اعتماد المنتج
          </Button>
          <Button size="sm" variant="outline" onClick={() => review("rejected")} disabled={busy}>
            <XCircle className="size-4 ml-1.5" /> رفض / إرجاع
          </Button>
        </div>
      </div>
    </article>
  );
}

/* =========================== بطاقة الطلب =========================== */
function AdminOrderRow({ order, onChanged }: { order: AdminOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const nextStatusMap: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
    new: { next: "preparing", label: "بدء التجهيز" },
    preparing: { next: "ready", label: "جاهز للتسليم" },
    ready: { next: "done", label: "إتمام التسليم" },
  };

  const action = nextStatusMap[order.status];

  async function updateStatus(nextStatus: OrderStatus) {
    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", order.id);

    setBusy(false);
    if (error) {
      setMessage("تعذر تحديث الحالة: " + error.message);
      return;
    }
    onChanged();
  }

  const badgeConfig = orderStatusLabels[order.status] ?? { label: order.status, variant: "outline" };

  return (
    <article className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{order.code}</span>
          <p className="font-semibold text-sm">{order.product_title}</p>
          <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          العميل: {order.customer_name} ({order.customer_phone}) · متجر: {order.store_name}
        </p>
        <p className="mt-1 text-xs font-semibold text-primary">
          المبلغ: {formatMoney(order.amount)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {action && (
          <Button size="sm" onClick={() => updateStatus(action.next)} disabled={busy}>
            {busy ? "…" : action.label}
          </Button>
        )}
        {order.status !== "cancel" && order.status !== "done" && (
          <Button size="sm" variant="outline" onClick={() => updateStatus("cancel")} disabled={busy}>
            إلغاء الطلب
          </Button>
        )}
      </div>
      {message && <p className="text-xs text-destructive lg:col-span-2">{message}</p>}
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
