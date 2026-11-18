import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import useSWR from "swr";
import {
  Check,
  Copy,
  Eye,
  Package,
  Search,
  ShoppingBag,
  Home,
  LockKeyhole,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import {
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

const PRODUCT_IMAGE_FALLBACK = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" rx="24" fill="#eee7da"/><g fill="none" stroke="#ad9b80" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><rect x="230" y="118" width="140" height="124" rx="18"/><path d="M230 154h140m-112 36h60m-60 28h42"/></g><text x="300" y="300" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#9a896f">صورة المنتج</text></svg>',
)}`;

function getStoreLocatorFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const queryLocator = params.get("store")?.trim() || params.get("slug")?.trim();
  if (queryLocator) return queryLocator;
  const pathMatch = window.location.pathname.match(/^\/store\/([^/]+)\/?$/i);
  return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]).trim() : "";
}

function normalizeStoreLocator(value: string): string {
  try {
    return decodeURIComponent(value).trim().toLocaleLowerCase().replace(/\/+$/, "");
  } catch {
    return value.trim().toLocaleLowerCase().replace(/\/+$/, "");
  }
}

export function MerchantMarketplace() {
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
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    if (typeof window === "undefined") return "";
    return getStoreLocatorFromUrl();
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

  const openQuickView = (product: MarketplaceProduct, cardImageUrl?: string) => {
    // Reuse the card image URL so opening Quick View never triggers another storage request.
    setQuickViewProduct({ ...product, image_url: cardImageUrl ?? product.image_url });
    setQuickViewOpen(true);
  };

  useEffect(() => {
    const syncStoreFromUrl = () => {
      setSelectedStoreId(getStoreLocatorFromUrl());
    };
    window.addEventListener("popstate", syncStoreFromUrl);
    return () => window.removeEventListener("popstate", syncStoreFromUrl);
  }, []);

  const selectedStore = useMemo(() => {
    if (!selectedStoreId) return null;
    const locator = normalizeStoreLocator(selectedStoreId);
    return products.find((product) => {
      const store = product.store as MarketplaceProduct["store"] & { slug?: string };
      return (
        store.id === selectedStoreId ||
        normalizeStoreLocator(store.name) === locator ||
        (store.slug ? normalizeStoreLocator(store.slug) === locator : false)
      );
    }) ?? null;
  }, [products, selectedStoreId]);
  const selectedStoreName = selectedStore?.store.name?.trim() || "السوق الشامل";
  const headerStoreName = selectedStoreId ? selectedStoreName : "السوق الشامل";
  const cardStoreName = selectedStoreId ? selectedStoreName : "السوق الشامل";
  const resolvedStoreId = selectedStore?.store.id ?? selectedStoreId;
  const storeProducts = useMemo(
    () =>
      selectedStoreId
        ? products.filter((product) => product.store.id === resolvedStoreId)
        : products,
    [products, resolvedStoreId, selectedStoreId],
  );
  const categories = useMemo(
    () => [...new Set(storeProducts.map((product) => product.category).filter(Boolean))],
    [storeProducts],
  );
  const visibleProducts = storeProducts.filter((product) => {
    const term = search.trim().toLocaleLowerCase();
    return (
      !term ||
      [
        product.title,
        product.description,
        product.category,
        product.sku,
        (product as MarketplaceProduct & { color?: string; colour?: string; size?: string; sizes?: string[] }).color,
        (product as MarketplaceProduct & { colour?: string }).colour,
        (product as MarketplaceProduct & { size?: string }).size,
        ...((product as MarketplaceProduct & { sizes?: string[] }).sizes ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(term)
    );
  });

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f2e8] text-[#382719]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="rounded-[2rem] border border-[#e9dfcd] bg-[#fcfaf5] p-4 shadow-[0_8px_28px_rgba(72,48,24,0.05)] sm:p-6">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <Link
              to="/products"
              aria-label="رجوع إلى المتاجر"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#e4d6c0] bg-[#f4ecde] px-3 text-sm font-bold text-[#60472e] transition hover:bg-[#ece0cd]"
            >
              رجوع <span aria-hidden="true">→</span>
            </Link>
            <h1 className="truncate text-center text-lg font-extrabold tracking-tight text-[#382719] sm:text-2xl">
              {headerStoreName}
            </h1>
            <Link
              to="/cart"
              aria-label={`السلة، ${cartCount} منتجات`}
              className="relative inline-flex size-11 items-center justify-center rounded-full bg-[#4a3020] text-white shadow-sm transition hover:bg-[#382719]"
            >
              <ShoppingBag aria-hidden="true" className="size-5" />
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-[#fcfaf5] bg-[#b48948] px-1 text-[10px] font-extrabold leading-4 text-white">
                {cartCount}
              </span>
            </Link>
          </div>

          <div className="mt-4 flex flex-row gap-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">ابحث باسم القطعة، اللون أو المقاس</span>
              <Search aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9b8c78]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم القطعة، اللون أو المقاس..."
                className="h-12 rounded-xl border-[#e5dac7] bg-white pr-11 text-[#382719] placeholder:text-[#a49684] focus-visible:ring-[#b48948]"
              />
            </label>
            <button
              type="button"
              aria-expanded={showFilters}
              aria-controls="marketplace-filters"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d9c8aa] bg-white px-4 text-sm font-bold text-[#60472e] transition hover:bg-[#f6f0e5] sm:px-5"
            >
              <span aria-hidden="true">☷</span> فلتر
            </button>
          </div>
          {showFilters && (
            <div id="marketplace-filters" className="mt-3 flex flex-wrap gap-2" aria-label="تصفية حسب التصنيف">
              <button type="button" onClick={() => setSearch("")} className={`h-10 rounded-full px-4 text-sm font-bold ${search ? "border border-[#d9c8aa] bg-white text-[#6f5637]" : "bg-[#b48948] text-white"}`}>الكل</button>
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setSearch(category)} className={`h-10 rounded-full border px-4 text-sm font-semibold ${search === category ? "border-[#b48948] bg-[#eee1c9] text-[#53391e]" : "border-[#d9c8aa] bg-white text-[#6f5637] hover:bg-[#f6f0e5]"}`}>
                  {category}
                </button>
              ))}
            </div>
          )}
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
                  storeName={cardStoreName}
                  onAdd={() => addProductToCart(product)}
                  onQuickView={(cardImageUrl) => openQuickView(product, cardImageUrl)}
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

function formatYerPrice(value: number): string {
  return `${Number(value).toLocaleString("en-US")} YER`;
}

function getShortItemNumber(sku: string | null | undefined, productId: string): string {
  const normalizedSku = sku?.trim() ?? "";
  if (/^\d{8}$/.test(normalizedSku)) return normalizedSku;

  const source = normalizedSku || productId;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const eightDigitNumber = 10_000_000 + ((hash >>> 0) % 90_000_000);
  return String(eightDigitNumber);
}

function getDiscountPercent(product: MarketplaceProduct): number {
  if (product.discount_percent != null && product.discount_percent > 0) {
    return Math.round(product.discount_percent);
  }
  if (product.old_price != null && product.old_price > product.price && product.old_price > 0) {
    return Math.round(((product.old_price - product.price) / product.old_price) * 100);
  }
  return 0;
}

function ProductCard({
  product,
  storeName,
  onAdd,
  onQuickView,
}: {
  product: MarketplaceProduct;
  storeName: string;
  onAdd: () => void;
  onQuickView: (cardImageUrl?: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTimedOut, setImageTimedOut] = useState(false);
  const [requestStarted, setRequestStarted] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageUrlToShow = imageFailed || imageTimedOut ? null : imageUrl ?? product.image_url;
  const discountPercent = getDiscountPercent(product);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
    setImageTimedOut(false);
    setImageUrl(null);
    setRequestStarted(false);
  }, [product.id]);

  useEffect(() => {
    if (!requestStarted || imageLoaded || imageFailed) return;
    const timeout = window.setTimeout(() => setImageTimedOut(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [requestStarted, imageLoaded, imageFailed]);

  useEffect(() => {
    const node = imageContainerRef.current;
    if (!node || imageUrl || product.image_url) return;
    let active = true;
    const requestImage = () => {
      setRequestStarted(true);
      void getSignedProductImage(product.image_path, 600).then((url) => {
        if (!active) return;
        setImageUrl(url);
        if (!url) setImageFailed(true);
      });
    };
    if (typeof IntersectionObserver === "undefined") {
      requestImage();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      requestImage();
      observer.disconnect();
    }, { rootMargin: "250px" });
    observer.observe(node);
    return () => { active = false; observer.disconnect(); };
  }, [product.id, product.image_path, product.image_url, imageUrl]);

  const cardImageUrl = imageUrlToShow ?? undefined;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#eee5d7] bg-white shadow-[0_5px_20px_rgba(67,45,22,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(67,45,22,0.13)]">
      <div
        ref={imageContainerRef}
        className="relative h-[300px] w-full overflow-hidden bg-[#eee7da]"
      >
        {imageUrlToShow ? (
          <img
            src={imageUrlToShow}
            alt={product.title}
            width={600}
            height={400}
            className={`h-full w-full object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <img
            src={PRODUCT_IMAGE_FALLBACK}
            alt="صورة افتراضية للمنتج"
            width={600}
            height={400}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm">فوري</span>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#38513a] shadow-sm">متوفر</span>
        </div>
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <button type="button" onClick={onAdd} disabled={product.stock < 1} aria-label={`أضف ${product.title} للسلة`} className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#4a3020] shadow-lg transition hover:scale-105 hover:bg-[#fff8ed] disabled:opacity-45">
            <ShoppingBag aria-hidden="true" className="size-5" />
          </button>
          <button type="button" onClick={() => onQuickView(cardImageUrl)} aria-label={`معاينة ${product.title}`} className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#4a3020] shadow-lg transition hover:scale-105 hover:bg-[#fff8ed]">
            <Eye aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <h3 className="line-clamp-2 min-h-10 text-center text-sm font-extrabold leading-5 text-[#3d2b1d] sm:text-base sm:leading-6">
          {product.title}
        </h3>
        <div className="mt-2 flex min-w-0 items-center justify-center gap-1.5 text-[11px] font-medium text-[#98866d]">
          <Home aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{storeName}</span>
        </div>
        <div dir="ltr" className="mt-2.5 flex min-h-7 items-center justify-between gap-2">
          {product.old_price != null && product.old_price > product.price ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#9a8a75] line-through">
                {formatYerPrice(Number(product.old_price))}
              </span>
              {discountPercent > 0 && (
                <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-[10px] font-extrabold text-[#c65c2d]">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
          ) : <span />}
          <span className="shrink-0 text-lg font-extrabold text-[#d95e16] sm:text-xl">
            {formatYerPrice(Number(product.price))}
          </span>
        </div>
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
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setCopied(false);
    setImageFailed(false);
  }, [product?.id, open]);

  if (!product) return null;
  const itemNumber = getShortItemNumber(product.sku, product.id);
  const oldPrice = product.old_price != null && product.old_price > product.price
    ? Number(product.old_price)
    : null;
  const discountPercent = getDiscountPercent(product);

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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          dir="rtl"
          className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-1rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] bg-white p-4 text-[#382719] shadow-[0_28px_90px_rgba(24,16,9,0.28)] outline-none sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <DialogPrimitive.Title className="text-base font-extrabold text-[#241a13]">
              تفاصيل القطعة
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="إغلاق"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f0e7] text-[#543b25] transition hover:bg-[#ece4d7]"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            تفاصيل المنتج وإضافته إلى السلة
          </DialogPrimitive.Description>

          <div className="relative h-[380px] w-full overflow-hidden rounded-[16px] bg-[#eee7da]">
            {product.image_url && !imageFailed ? (
              <img
                src={product.image_url}
                alt={product.title}
                width={600}
                height={380}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <img
                src="/marketplace-product-placeholder.svg"
                alt="صورة افتراضية للمنتج"
                width={600}
                height={380}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            )}
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#36543a] shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" /> جاهزة فوراً
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-[#756653]">
            {product.description || "لا يوجد وصف إضافي لهذا المنتج."}
          </p>

          <div className="mt-3">
            <h2 className="line-clamp-3 text-center text-[16px] font-extrabold leading-6 text-black">
              {product.title}
            </h2>
            <div dir="ltr" className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {oldPrice != null && (
                  <span className="text-xs font-semibold text-[#9a8a75] line-through sm:text-sm">
                    Before Discount {formatYerPrice(oldPrice)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="rounded-full bg-[#fff0e8] px-2.5 py-1 text-xs font-extrabold text-[#c65c2d]">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xl font-extrabold text-[#d95e16] sm:text-2xl">
                {formatYerPrice(Number(product.price))}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="min-w-0 rounded-xl bg-[#f7f2e9] p-3">
              <p className="text-[11px] font-semibold text-[#98866d]">رقم الصنف</p>
              <div className="mt-1 flex items-center justify-between gap-1.5">
                <p className="truncate text-sm font-bold text-[#473522]" dir="ltr">{itemNumber}</p>
                <button
                  type="button"
                  onClick={() => void copyItemNumber()}
                  aria-label="نسخ رقم الصنف"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#715634] transition hover:bg-[#f4eddf]"
                >
                  {copied ? <Check aria-hidden="true" className="size-4 text-emerald-700" /> : <Copy aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>
            <div className="min-w-0 rounded-xl bg-[#f7f2e9] p-3">
              <p className="text-[11px] font-semibold text-[#98866d]">يباع بواسطة</p>
              <p className="mt-1 truncate text-sm font-extrabold text-black">السوق الشامل</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f7f2e9] px-3.5 py-3">
            <div>
              <p className="text-sm font-bold text-[#5b4933]">حد الكمية</p>
              <p className="mt-0.5 text-xs font-semibold text-red-600">
                {product.stock === 1 ? "المتوفر قطعة واحدة" : `المتوفر ${product.stock.toLocaleString("ar-YE")} قطعة`}
              </p>
            </div>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-extrabold text-[#60472e]">
              1 فقط <LockKeyhole aria-hidden="true" className="size-3.5" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { onAdd(product, 1); onOpenChange(false); }}
              disabled={product.stock < 1}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#4a3020] px-3 text-sm font-extrabold text-white transition hover:bg-[#382719] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag aria-hidden="true" className="size-4" /> إضافة للسلة
            </button>
            <button
              type="button"
              onClick={() => onBuyNow(product, 1)}
              disabled={product.stock < 1}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#f0e4cf] px-3 text-sm font-extrabold text-[#50391f] transition hover:bg-[#e8d8bb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockKeyhole aria-hidden="true" className="size-4" /> شراء الآن
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
