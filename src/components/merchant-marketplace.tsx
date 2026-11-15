import { useEffect, useMemo, useState } from "react";
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
import { addMerchantProductToCart, isMerchantCartItem, readCart, writeCart, type CartItem } from "@/lib/extension-cart";

async function loadMyMerchantStore() {
  const { data, error } = await supabase.rpc("merchant_get_my_store");
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
  const [cartCount, setCartCount] = useState(0);
  const [addedProductTitle, setAddedProductTitle] = useState("");

  useEffect(() => {
    const syncCart = () => setCartCount(readCart().reduce((sum, item) => sum + (isMerchantCartItem(item) ? item.quantity : 1), 0));
    syncCart();
    window.addEventListener("alshamel-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("alshamel-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const addProductToCart = (product: MarketplaceProduct) => {
    const current: CartItem[] = readCart();
    const next = addMerchantProductToCart(current, product);
    writeCart(next);
    setAddedProductTitle(product.title);
    setCartCount(next.reduce((sum, item) => sum + (isMerchantCartItem(item) ? item.quantity : 1), 0));
  };

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
            <Link to="/cart" className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted">
              <ShoppingBag aria-hidden="true" className="size-4" /> السلة ({cartCount})
            </Link>
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

      {addedProductTitle && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">تمت إضافة «{addedProductTitle}» إلى السلة.</p>
          <Link to="/cart" className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">عرض السلة ({cartCount})</Link>
        </div>
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
          <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 xl:grid-cols-4" aria-label="جارٍ تحميل المنتجات">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : error ? (
          <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm">
            <p className="text-destructive">تعذر تحميل المنتجات الآن. حاول مرة أخرى.</p>
            <Button type="button" variant="outline" onClick={() => void mutate()}>إعادة المحاولة</Button>
          </CardContent></Card>
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
          <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onOrder={() => addProductToCart(product)} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function ProductCard({ product, onOrder }: { product: MarketplaceProduct; onOrder: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : product.image_url;

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted text-center text-muted-foreground">
            <Package aria-hidden="true" className="size-9" />
            <span className="text-xs">صورة المنتج غير متاحة</span>
            <span className="max-w-[90%] truncate text-xs">{product.store.name}</span>
          </div>
        )}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1.5">
          {product.category ? (
            <Badge className="max-w-[65%] truncate rounded-full border border-white/70 bg-white/95 text-[10px] font-semibold text-foreground shadow-sm hover:bg-white">
              {product.category}
            </Badge>
          ) : <span />}
          <Badge className="shrink-0 rounded-full border border-white/70 bg-white/95 text-[10px] font-semibold text-emerald-700 shadow-sm hover:bg-white">
            متوفر
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          متبقي {product.stock.toLocaleString("ar-YE")}
        </div>
      </div>

      <CardHeader className="gap-1.5 px-3 pb-2 pt-3 sm:px-4">
        <CardTitle className="line-clamp-2 min-h-10 text-sm leading-5 sm:text-base">{product.title}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-9 text-xs leading-4 sm:text-sm">
          {product.description || "منتج من أحد متاجر السوق الشامل"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-0 sm:px-4">
        <p className="text-base font-extrabold text-primary sm:text-lg">{formatMoney(Number(product.price), product.currency)}</p>
        <div className="mt-auto grid gap-1 border-t border-border/60 pt-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Store aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{product.store.name}</span>
          </div>
          {product.store.city && (
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{product.store.city}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-3 pb-3 pt-0 sm:px-4">
        <Button type="button" size="sm" className="w-full text-xs sm:text-sm" onClick={onOrder} disabled={product.stock < 1}>
          <ShoppingBag data-icon="inline-start" aria-hidden="true" className="size-4" /> أضف للسلة
        </Button>
      </CardFooter>
    </Card>
  );
}
