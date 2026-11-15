import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import useSWR from "swr";
import {
  Check,
  Copy,
  Eye,
  MapPin,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  formatMoney,
  getSignedProductImage,
  loadMarketplace,
  type MarketplaceProduct,
} from "@/lib/merchant-marketplace";
import {
  addMerchantProductToCart,
  isMerchantCartItem,
  readCart,
  writeCart,
  type CartItem,
} from "@/lib/extension-cart";

async function loadMyMerchantStore() {
  const { data, error } = await supabase.rpc("merchant_get_my_store");
  if (error) throw error;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

export function MerchantMarketplace() {
  const { user } = useSession(false);
  const navigate = useNavigate();
  const {
    data: products = [],
    error,
    isLoading,
    mutate,
  } = useSWR("merchant-marketplace", loadMarketplace, {
    revalidateOnFocus: true,
    dedupingInterval: 20_000,
  });
  const { data: myStore } = useSWR(
    user ? ["merchant-my-store", user.id] : null,
    loadMyMerchantStore,
  );
  const [search, setSearch] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("store")?.trim() ?? "";
  });
  const [cartCount, setCartCount] = useState(0);
  const [addedProductTitle, setAddedProductTitle] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState<MarketplaceProduct | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  useEffect(() => {
    const syncCart = () =>
      setCartCount(
        readCart().reduce((sum, item) => sum + (isMerchantCartItem(item) ? item.quantity : 1), 0),
      );
    syncCart();
    window.addEventListener("alshamel-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("alshamel-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const addProductToCart = (product: MarketplaceProduct, quantity = 1) => {
    let next: CartItem[] = readCart();
    for (let count = 0; count < Math.max(1, Math.min(quantity, product.stock)); count += 1) {
      next = addMerchantProductToCart(next, product);
    }
    writeCart(next);
    setAddedProductTitle(product.title);
    setCartCount(
      next.reduce((sum, item) => sum + (isMerchantCartItem(item) ? item.quantity : 1), 0),
    );
  };

  const openQuickView = (product: MarketplaceProduct) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

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
    () =>
      selectedStoreId
        ? products.filter((product) => product.store.id === selectedStoreId)
        : products,
    [products, selectedStoreId],
  );
  const categories = useMemo(
    () => [...new Set(storeProducts.map((product) => product.category).filter(Boolean))],
    [storeProducts],
  );
  const visibleProducts = storeProducts.filter((product) => {
    const term = search.trim().toLocaleLowerCase();
    return (
      !term ||
      [product.title, product.description, product.category, product.store.name, product.store.city]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term)
    );
  });

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f2e8] text-[#382719]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="rounded-[2rem] border border-[#e9dfcd] bg-[#fcfaf5] p-5 shadow-[0_8px_28px_rgba(72,48,24,0.05)] sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#efe4ce] px-3 py-1.5 text-xs font-bold text-[#85602d]">
                <Store aria-hidden="true" className="size-3.5" /> السوق المحلي
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#382719] sm:text-3xl">
                {selectedStoreId
                  ? selectedStoreName
                    ? `منتجات ${selectedStoreName}`
                    : "منتجات المتجر"
                  : "تسوّق من متاجرنا المحلية"}
              </h1>
              <p className="mt-2 text-sm text-[#887966]">منتجات مختارة من تجار السوق الشامل</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/cart"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4a3020] px-4 text-sm font-bold text-white transition hover:bg-[#382719]"
              >
                <ShoppingBag aria-hidden="true" className="size-4" /> السلة{" "}
                <span className="rounded-full bg-white/15 px-2 py-0.5">{cartCount}</span>
              </Link>
              {selectedStoreId && (
                <Link
                  to="/marketplace"
                  onClick={() => setSelectedStoreId("")}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d8c7aa] bg-white px-4 text-sm font-semibold text-[#60472e] transition hover:bg-[#f6f0e5]"
                >
                  عرض كل المتاجر
                </Link>
              )}
              {selectedStoreId && myStore?.id === selectedStoreId ? (
                <>
                  <Link
                    to="/merchant"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c7aa] bg-white px-4 text-sm font-semibold text-[#60472e] transition hover:bg-[#f6f0e5]"
                  >
                    <Store aria-hidden="true" className="size-4" /> لوحة متجري
                  </Link>
                  <a
                    href="/merchant?view=add-product"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b48948] px-4 text-sm font-bold text-white transition hover:bg-[#9b743b]"
                  >
                    <Package aria-hidden="true" className="size-4" /> أضف منتج
                  </a>
                </>
              ) : (
                <Link
                  to="/merchant"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c7aa] bg-white px-4 text-sm font-semibold text-[#60472e] transition hover:bg-[#f6f0e5]"
                >
                  <Store aria-hidden="true" className="size-4" /> بوابة التاجر
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">ابحث عن منتج أو متجر</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9b8c78]"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث عن منتج أو متجر أو مدينة"
                className="h-12 rounded-xl border-[#e5dac7] bg-white pr-11 text-[#382719] placeholder:text-[#a49684] focus-visible:ring-[#b48948]"
              />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="تصنيفات المنتجات">
              <button
                type="button"
                onClick={() => setSearch("")}
                className={`h-11 rounded-xl px-4 text-sm font-bold transition ${search ? "border border-[#d9c8aa] bg-white text-[#6f5637]" : "bg-[#b48948] text-white shadow-sm"}`}
              >
                الكل
              </button>
              {categories.slice(0, 4).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSearch(category)}
                  className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${search === category ? "border-[#b48948] bg-[#eee1c9] text-[#53391e]" : "border-[#d9c8aa] bg-white text-[#6f5637] hover:bg-[#f6f0e5]"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </header>

        {addedProductTitle && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4bd91] bg-[#f1e6d1] p-4 text-sm text-[#50391f]"
          >
            <p className="font-semibold">تمت إضافة «{addedProductTitle}» إلى السلة.</p>
            <Link
              to="/cart"
              className="rounded-xl bg-[#4a3020] px-4 py-2 font-bold text-white transition hover:bg-[#382719]"
            >
              عرض السلة ({cartCount})
            </Link>
          </div>
        )}

        <section aria-labelledby="marketplace-products-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-[#a47b3e]">
                تسوّق بثقة من تجارنا
              </p>
              <h2
                id="marketplace-products-heading"
                className="text-2xl font-extrabold text-[#382719]"
              >
                المنتجات المعتمدة
              </h2>
              <p className="mt-1.5 text-sm text-[#8b7c68]">
                {storeProducts.length.toLocaleString("ar-YE")} منتج معتمد متاح
                {selectedStoreId && selectedStoreName ? ` في ${selectedStoreName}` : ""}
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#e7dcc9] bg-[#fcfaf5] px-4 py-2 text-xs font-medium text-[#7c6c58] sm:flex">
              <span className="size-2 rounded-full bg-emerald-500" /> منتجات متوفرة الآن
            </div>
          </div>

          {isLoading ? (
            <div
              className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-5 xl:grid-cols-4"
              aria-label="جارٍ تحميل المنتجات"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-[1.5rem] bg-[#ede4d5]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fcfaf5] px-5 py-12 text-center">
              <p className="text-sm text-[#8b4c3b]">تعذر تحميل المنتجات الآن. حاول مرة أخرى.</p>
              <button
                type="button"
                onClick={() => void mutate()}
                className="mt-4 rounded-xl border border-[#d8c7aa] bg-white px-4 py-2 text-sm font-bold text-[#60472e] transition hover:bg-[#f6f0e5]"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fcfaf5] px-5 py-14 text-center">
              <Package aria-hidden="true" className="mx-auto size-9 text-[#b49a73]" />
              <p className="mt-3 font-bold text-[#50391f]">
                {selectedStoreId && storeProducts.length === 0
                  ? "لا توجد منتجات معتمدة لهذا المتجر حاليًا"
                  : "لا توجد منتجات مطابقة"}
              </p>
              <p className="mt-1 text-sm text-[#8b7c68]">
                {selectedStoreId && storeProducts.length === 0
                  ? "ستظهر المنتجات هنا بعد اعتمادها من الإدارة."
                  : "جرّب كلمة بحث أخرى أو عُد إلى كل المنتجات."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-5 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addProductToCart(product)}
                  onQuickView={() => openQuickView(product)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <QuickViewDialog
        product={quickViewProduct}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onAdd={(product, quantity) => addProductToCart(product, quantity)}
        onBuyNow={(product, quantity) => {
          addProductToCart(product, quantity);
          setQuickViewOpen(false);
          void navigate({ to: "/cart" });
        }}
      />
    </main>
  );
}

function ProductCard({
  product,
  onAdd,
  onQuickView,
}: {
  product: MarketplaceProduct;
  onAdd: () => void;
  onQuickView: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageUrl = imageFailed ? null : product.image_url;

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [product.id]);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.45rem] border border-[#eee5d7] bg-white shadow-[0_5px_20px_rgba(67,45,22,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(67,45,22,0.13)]">
      <div className="relative aspect-[4/4.2] overflow-hidden bg-[#f3eee5] p-2.5 sm:p-3">
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <div
                aria-label="جارٍ تحميل صورة المنتج"
                role="progressbar"
                className="absolute inset-2.5 z-[1] flex items-center justify-center rounded-[1rem] bg-[#eee7da]"
              >
                <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-[#9a896f]" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={product.title}
              className={`size-full rounded-[1rem] object-contain transition-[opacity,transform] duration-500 group-hover:scale-[1.025] ${imageLoaded ? "opacity-100" : "opacity-0 blur-sm"}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 rounded-[1rem] bg-[#eee7da] text-center text-[#9a896f]">
            <Package aria-hidden="true" className="size-10" />
            <span className="text-xs">صورة المنتج غير متاحة</span>
          </div>
        )}
        <button
          type="button"
          onClick={onQuickView}
          aria-label={`معاينة ${product.title}`}
          className="absolute bottom-4 right-4 inline-flex size-12 items-center justify-center rounded-full border border-white/80 bg-white/70 text-[#593c20] shadow-[0_4px_18px_rgba(65,42,20,0.18)] backdrop-blur-xl transition hover:scale-105 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(213,173,104,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48948]"
        >
          <Eye aria-hidden="true" className="size-5" />
        </button>
        {product.category && (
          <span className="absolute left-4 top-4 max-w-[65%] truncate rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[10px] font-bold text-[#745832] shadow-sm backdrop-blur-sm">
            {product.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-4 pt-3.5 sm:px-4 sm:pb-5 sm:pt-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-[#3d2b1d] sm:text-base sm:leading-6">
          {product.title}
        </h3>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#98866d]">
          <Store aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{product.store.name}</span>
          {product.store.city && (
            <>
              <MapPin aria-hidden="true" className="mr-1 size-3 shrink-0" />
              <span className="truncate">{product.store.city}</span>
            </>
          )}
        </div>
        <div className="mt-2.5 flex min-h-7 flex-wrap items-center gap-1.5">
          <span className="text-base font-extrabold text-[#d77a32] sm:text-lg">
            {formatMoney(Number(product.price), product.currency)}
          </span>
          {product.old_price != null && product.old_price > product.price && (
            <span className="text-xs font-semibold text-[#9a8a75] line-through">
              {formatMoney(Number(product.old_price), product.currency)}
            </span>
          )}
          {product.discount_percent != null && product.discount_percent > 0 && (
            <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-[10px] font-extrabold text-[#c65c2d]">
              خصم {product.discount_percent}٪
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={product.stock < 1}
          className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4a3020] px-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#382719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a97a3d] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:mt-4 sm:text-sm"
        >
          <ShoppingBag aria-hidden="true" className="size-4" /> أضف للسلة
        </button>
      </div>
    </article>
  );
}

function QuickViewDialog({
  product,
  open,
  onOpenChange,
  onAdd,
  onBuyNow,
}: {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: MarketplaceProduct, quantity: number) => void;
  onBuyNow: (product: MarketplaceProduct, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setCopied(false);
    setImageUrl(null);
    setImageFailed(false);
    if (!product || !open) {
      setImageLoading(false);
      return;
    }

    let active = true;
    setImageLoading(true);
    void getSignedProductImage(product.image_path, 1200).then((url) => {
      if (!active) return;
      setImageUrl(url);
      if (!url) setImageLoading(false);
    });
    return () => {
      active = false;
    };
  }, [product?.id, open]);

  if (!product) return null;
  const itemNumber = product.sku?.trim() || product.id;

  const copyItemNumber = async () => {
    try {
      await navigator.clipboard.writeText(itemNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#21170f]/45 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          dir="rtl"
          className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-1.25rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-4 text-[#382719] shadow-[0_28px_90px_rgba(24,16,9,0.28)] outline-none sm:p-7"
        >
          <div className="relative overflow-hidden rounded-[1.5rem] bg-[#f2ede4]">
            <div className="aspect-[16/9] max-h-[42vh] w-full">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.title}
                  className="size-full object-contain"
                  decoding="async"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[#a18e71]">
                  <Package aria-hidden="true" className="size-14" />
                </div>
              )}
            </div>
            <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/95 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" /> جاهزة فوراً
            </span>
            <DialogPrimitive.Close
              aria-label="إغلاق"
              className="absolute left-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-white/85 text-[#543b25] shadow-sm backdrop-blur-md transition hover:bg-white"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-extrabold leading-8 text-[#382719] sm:text-2xl">
                {product.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                تفاصيل المنتج وإضافته إلى السلة
              </DialogPrimitive.Description>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xl font-extrabold text-[#d77a32]">
                  {formatMoney(Number(product.price), product.currency)}
                </span>
                {product.old_price != null && product.old_price > product.price && (
                  <span className="text-sm font-semibold text-[#9a8a75] line-through">
                    {formatMoney(Number(product.old_price), product.currency)}
                  </span>
                )}
                {product.discount_percent != null && product.discount_percent > 0 && (
                  <span className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-extrabold text-[#c65c2d]">
                    خصم {product.discount_percent}٪
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-[#eee5d7] bg-[#fcfaf6] p-3.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#98866d]">رقم الصنف</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#473522]" dir="ltr">
                    {itemNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyItemNumber()}
                  aria-label="نسخ رقم الصنف"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#e7dccb] bg-white text-[#715634] transition hover:bg-[#f4eddf]"
                >
                  {copied ? (
                    <Check aria-hidden="true" className="size-4 text-emerald-700" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#eee5d7] bg-[#fcfaf6] p-3.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#efe5d3] text-[#866537]">
                  <Store aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#98866d]">يباع بواسطة</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#473522]">
                    {product.store.name}
                  </p>
                </div>
              </div>
            </div>

            <Accordion
              type="single"
              collapsible
              className="rounded-2xl border border-[#eee5d7] px-4"
            >
              <AccordionItem value="description" className="border-0">
                <AccordionTrigger className="py-4 text-sm font-bold text-[#493621] hover:no-underline">
                  وصف المنتج
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-7 text-[#81715d]">
                  {product.description || "لا يوجد وصف إضافي لهذا المنتج."}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8f5ef] px-4 py-3">
              <span className="text-sm font-bold text-[#5b4933]">الكمية</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-[#e5dac8] bg-white p-1">
                  <button
                    type="button"
                    aria-label="تقليل الكمية"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-[#60472e] transition hover:bg-[#f4eddf] disabled:opacity-35"
                  >
                    <Minus aria-hidden="true" className="size-4" />
                  </button>
                  <span className="w-9 text-center text-sm font-extrabold" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="زيادة الكمية"
                    onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
                    disabled={quantity >= product.stock}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-[#60472e] transition hover:bg-[#f4eddf] disabled:opacity-35"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  متوفر ({product.stock.toLocaleString("ar-YE")})
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onAdd(product, quantity);
                  onOpenChange(false);
                }}
                disabled={product.stock < 1}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4a3020] px-4 text-sm font-extrabold text-white transition hover:bg-[#382719] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag aria-hidden="true" className="size-4" /> إضافة للسلة
              </button>
              <button
                type="button"
                onClick={() => onBuyNow(product, quantity)}
                disabled={product.stock < 1}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d9c7a8] bg-[#f0e4cf] px-4 text-sm font-extrabold text-[#50391f] transition hover:bg-[#e8d8bb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                شراء الآن
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
