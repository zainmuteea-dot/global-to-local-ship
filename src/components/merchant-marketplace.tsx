import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import useSWR from "swr";
import { MapPin, Package, Search, ShoppingBag, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { formatMoney, loadMarketplace, type MarketplaceProduct } from "@/lib/merchant-marketplace";

const db = supabase as any;

async function loadMyMerchantStore() {
  const { data, error } = await db.rpc("merchant_get_my_store");
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

export function MerchantMarketplace() {
  const { user } = useSession(false);
  const { data: products = [], error, isLoading, mutate } = useSWR("merchant-marketplace", loadMarketplace, {
    revalidateOnFocus: true,
    dedupingInterval: 20_000,
  });
  const { data: myStore } = useSWR(user ? ["merchant-my-store", user.id] : null, loadMyMerchantStore);
  const [search, setSearch] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("store")?.trim() ?? "";
  });
  const [selected, setSelected] = useState<MarketplaceProduct | null>(null);

  // Keep the store filter in sync when a customer navigates back/forward.
  useEffect(() => {
    const syncStoreFromUrl = () => {
      setSelectedStoreId(new URLSearchParams(window.location.search).get("store")?.trim() ?? "");
    };
    window.addEventListener("popstate", syncStoreFromUrl);
    return () => window.removeEventListener("popstate", syncStoreFromUrl);
  }, []);

  const selectedStoreName = useMemo(
    () => products.find((product) => product.store.id === selectedStoreId)?.store.name ?? "",
    [products, selectedStoreId],
  );
  const storeProducts = useMemo(
    () => selectedStoreId ? products.filter((product) => product.store.id === selectedStoreId) : products,
    [products, selectedStoreId],
  );
  const categories = useMemo(
    () => [...new Set(storeProducts.map((product) => product.category).filter(Boolean))],
    [storeProducts],
  );
  const visibleProducts = storeProducts.filter((product) => {
    const term = search.trim().toLocaleLowerCase();
    return !term || [product.title, product.description, product.category, product.store.name, product.store.city]
      .join(" ")
      .toLocaleLowerCase()
      .includes(term);
  });

  return (
    <main dir="rtl" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4">السوق المحلي</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {selectedStoreId ? (selectedStoreName ? `منتجات ${selectedStoreName}` : "منتجات المتجر") : "منتجات من تجار السوق الشامل"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {selectedStoreId
                ? "تصفح المنتجات التي اعتمدتها الإدارة لهذا المتجر."
                : "اكتشف منتجات التجار المحليين واطلبها مباشرة. الدفع نقدًا عند الاستلام."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedStoreId && (
              <Link to="/marketplace" onClick={() => setSelectedStoreId("")} className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted">
                عرض كل المتاجر
              </Link>
            )}
            {selectedStoreId && myStore?.id === selectedStoreId ? (
              <>
                <Link to="/merchant" className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted">
                  <Store aria-hidden="true" className="size-4" /> لوحة متجري
                </Link>
                <a href="/merchant?view=add-product" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  <Package aria-hidden="true" className="size-4" /> + أضف منتج
                </a>
              </>
            ) : (
              <Link to="/merchant" className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted">
                <Store aria-hidden="true" className="size-4" /> بوابة التاجر
              </Link>
            )}
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">ابحث عن منتج أو متجر</span>
            <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن منتج أو متجر أو مدينة" className="h-11 pr-10" />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="تصنيفات المنتجات">
            <Button type="button" variant={search ? "outline" : "secondary"} size="sm" onClick={() => setSearch("")}>الكل</Button>
            {categories.slice(0, 4).map((category) => (
              <Button key={category} type="button" variant={search === category ? "secondary" : "outline"} size="sm" onClick={() => setSearch(category)}>{category}</Button>
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <OrderPanel product={selected} userId={user?.id ?? null} onClose={() => setSelected(null)} onPlaced={() => { setSelected(null); void mutate(); }} />
      )}

      <section aria-labelledby="marketplace-products-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="marketplace-products-heading" className="text-xl font-bold">المنتجات المعتمدة</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {storeProducts.length.toLocaleString("ar-YE")} منتج معتمد متاح
              {selectedStoreId && selectedStoreName ? ` في ${selectedStoreName}` : ""}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="جارٍ تحميل المنتجات">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : error ? (
          <Card><CardContent className="py-10 text-center text-sm text-destructive">تعذر تحميل المنتجات الآن. حاول تحديث الصفحة.</CardContent></Card>
        ) : visibleProducts.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package aria-hidden="true" className="size-9 text-muted-foreground" />
            <p className="font-semibold">
              {selectedStoreId && storeProducts.length === 0
                ? "لا توجد منتجات معتمدة لهذا المتجر حاليًا"
                : "لا توجد منتجات مطابقة"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedStoreId && storeProducts.length === 0
                ? "ستظهر المنتجات هنا بعد اعتمادها من الإدارة."
                : "جرّب كلمة بحث أخرى أو عُد إلى كل المنتجات."}
            </p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onOrder={() => setSelected(product)} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function ProductCard({ product, onOrder }: { product: MarketplaceProduct; onOrder: () => void }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground"><Package aria-hidden="true" className="size-10" /></div>
        )}
      </div>
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-center justify-between gap-2">
          {product.category ? <Badge variant="secondary">{product.category}</Badge> : <span />}
          <span className="text-xs text-muted-foreground">متبقي {product.stock.toLocaleString("ar-YE")}</span>
        </div>
        <CardTitle className="line-clamp-1 text-base">{product.title}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-10">{product.description || "منتج من أحد متاجر السوق الشامل"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <p className="text-lg font-bold text-primary">{formatMoney(Number(product.price), product.currency)}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Store aria-hidden="true" className="size-3.5" /><span>{product.store.name}</span></div>
        {product.store.city && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-3.5" /><span>{product.store.city}</span></div>}
      </CardContent>
      <CardFooter>
        <Button type="button" className="w-full" onClick={onOrder} disabled={product.stock < 1}>
          <ShoppingBag data-icon="inline-start" aria-hidden="true" /> اطلب الآن
        </Button>
      </CardFooter>
    </Card>
  );
}

function OrderPanel({ product, userId, onClose, onPlaced }: {
  product: MarketplaceProduct;
  userId: string | null;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", city: product.store.city, address: "", quantity: 1 });

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setBusy(true);
    setErrorMessage("");
    const { error } = await db.rpc("merchant_create_order", {
      _product_id: product.id,
      _quantity: form.quantity,
      _customer_name: form.name,
      _customer_phone: form.phone,
      _customer_city: form.city,
      _delivery_address: form.address,
    });
    setBusy(false);
    if (error) {
      setErrorMessage(error.message?.includes("insufficient stock") ? "الكمية المطلوبة غير متوفرة." : "تعذر إرسال الطلب. راجع بياناتك وحاول مجددًا.");
      return;
    }
    setSuccess(true);
  }

  return (
    <Card className="border-primary/30 bg-primary/5" aria-labelledby="order-panel-heading">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle id="order-panel-heading">طلب {product.title}</CardTitle><CardDescription className="mt-1">السعر {formatMoney(Number(product.price), product.currency)} · الدفع عند الاستلام</CardDescription></div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
      </CardHeader>
      <CardContent>
        {success ? (
          <div role="status" className="flex flex-col gap-3">
            <p className="font-semibold text-primary">تم تسجيل طلبك بنجاح. سيتواصل معك المتجر لتأكيد التسليم.</p>
            <Button type="button" onClick={onPlaced}>تم</Button>
          </div>
        ) : !userId ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">سجّل الدخول أولًا لإتمام الطلب ومتابعته.</p>
            <Button asChild><Link to="/login">تسجيل الدخول</Link></Button>
          </div>
        ) : (
          <form onSubmit={submitOrder} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">الاسم<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-1.5 text-sm font-medium">رقم الهاتف<input required minLength={7} maxLength={24} autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-1.5 text-sm font-medium">المدينة<input required minLength={2} maxLength={80} autoComplete="address-level2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-1.5 text-sm font-medium">الكمية<input required type="number" min={1} max={Math.min(product.stock, 100)} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">عنوان التوصيل<textarea required minLength={5} maxLength={300} rows={2} autoComplete="street-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="rounded-lg border bg-background px-3 py-2" /></label>
            {errorMessage && <p role="alert" className="text-sm text-destructive sm:col-span-2">{errorMessage}</p>}
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <p className="text-sm text-muted-foreground">الإجمالي: <strong className="text-foreground">{formatMoney(Number(product.price) * form.quantity, product.currency)}</strong></p>
              <Button type="submit" disabled={busy}>{busy ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
