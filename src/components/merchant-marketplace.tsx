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
  ArrowRight,
  LockKeyhole,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CartDrawer } from "./cart-drawer";
import "./marketplace.css";
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    if (typeof window === "undefined") return "";
    return getStoreLocatorFromUrl();
  });
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
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
    return (
      products.find((product) => {
        const store = product.store as MarketplaceProduct["store"] & { slug?: string };
        return (
          store.id === selectedStoreId ||
          normalizeStoreLocator(store.name) === locator ||
          (store.slug ? normalizeStoreLocator(store.slug) === locator : false)
        );
      }) ?? null
    );
  }, [products, selectedStoreId]);
  const selectedStoreName = selectedStore?.store.name?.trim() || "السوق الشامل";
  const headerStoreName = selectedStoreId ? selectedStoreName : "السوق الشامل";
  const resolvedStoreId = selectedStore?.store.id ?? selectedStoreId;
  const storeProducts = useMemo(
    () =>
      selectedStoreId
        ? products.filter((product) => product.store.id === resolvedStoreId)
        : products,
    [products, resolvedStoreId, selectedStoreId],
  );
  const categories = useMemo(
    () => [...new Set(storeProducts.map((product) => product.category).filter((category): category is string => Boolean(category)))],
    [storeProducts],
  );
  const visibleProducts = storeProducts.filter((product) => {
    const term = search.trim().toLocaleLowerCase();
    return (
      (!term ||
      [
        product.title,
        product.description,
        product.category,
        product.sku,
        (
          product as MarketplaceProduct & {
            color?: string;
            colour?: string;
            size?: string;
            sizes?: string[];
          }
        ).color,
        (product as MarketplaceProduct & { colour?: string }).colour,
        (product as MarketplaceProduct & { size?: string }).size,
        ...((product as MarketplaceProduct & { sizes?: string[] }).sizes ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(term)) &&
      (!selectedCategory || product.category === selectedCategory)
    );
  });

  return (
    <main dir="rtl" lang="ar" className="mkt">
      <header className="mkt-bar">
        <div className="mkt-bar-in">
          <Link to="/products" aria-label="رجوع إلى المتاجر" className="mkt-back">
            <span>رجوع</span><ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <div className="mkt-brand" aria-label={headerStoreName}>
            <span className="mkt-logo" aria-hidden="true">{Array.from(headerStoreName.trim())[0] || "س"}</span>
            <div className="mkt-brand-txt">
              <h1>{headerStoreName}</h1>
              <span>{selectedStoreId ? `${storeProducts.length.toLocaleString("ar-YE")} منتجات` : "متجر التجار"}</span>
            </div>
          </div>
          <button
            type="button"
            aria-label={`افتح السلة، ${cartCount} منتجات`}
            className="mkt-cart"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag aria-hidden="true" className="size-6" />
            <i className="mkt-cart-n">{cartCount}</i>
          </button>
        </div>
      </header>

      <div className="mkt-tools">
        <label className="mkt-search">
          <Search aria-hidden="true" className="size-5" />
          <span className="sr-only">ابحث باسم القطعة أو اللون أو المقاس</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم القطعة، اللون أو المقاس..."
          />
          {search && (
            <button type="button" className="mkt-clear" onClick={() => setSearch("")} aria-label="مسح البحث">×</button>
          )}
        </label>
        <button
          type="button"
          className="mkt-sort"
          aria-expanded={showFilters}
          aria-controls="marketplace-categories"
          aria-label="إظهار تصنيفات المنتجات"
          onClick={() => setShowFilters((value) => !value)}
        >
          <span aria-hidden="true" className="text-xl leading-none">☷</span>
        </button>
      </div>
      {showFilters && (
        <nav id="marketplace-categories" className="mkt-chips" aria-label="تصنيفات المنتجات">
          <button type="button" className={`mkt-chip ${selectedCategory ? "" : "on"}`} onClick={() => setSelectedCategory("")}>الكل</button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`mkt-chip ${selectedCategory === category ? "on" : ""}`}
              onClick={() => setSelectedCategory((current) => current === category ? "" : category)}
            >
              {category}
            </button>
          ))}
        </nav>
      )}

      <section className="mkt-main" aria-label="المنتجات المعتمدة">
        {addedProductTitle && (
          <div role="status" className="mkt-added">
            <span>تمت إضافة «{addedProductTitle}» إلى السلة.</span>
            <button type="button" onClick={() => setCartOpen(true)}>عرض السلة ({cartCount})</button>
          </div>
        )}
        {isLoading ? (
          <div className="mkt-grid" aria-label="جارٍ تحميل المنتجات">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="mkt-skeleton" />)}
          </div>
        ) : error ? (
          <div className="mkt-empty" role="alert">
            <b>تعذر تحميل المنتجات الآن</b>
            <p>تحقق من اتصالك ثم أعد المحاولة.</p>
            <button type="button" className="mkt-empty-retry" onClick={() => void mutate()}>إعادة المحاولة</button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="mkt-empty">
            <Package aria-hidden="true" className="size-9" />
            <b>{selectedStoreId && storeProducts.length === 0 ? "لا توجد منتجات معتمدة لهذا المتجر حاليًا" : "لا توجد منتجات مطابقة"}</b>
            <p>{selectedStoreId && storeProducts.length === 0 ? "ستظهر المنتجات هنا بعد اعتمادها من الإدارة." : "جرّب كلمة بحث أخرى أو عُد إلى كل المنتجات."}</p>
            {(search || selectedCategory) && <button type="button" className="mkt-empty-retry" onClick={() => { setSearch(""); setSelectedCategory(""); }}>مسح البحث والتصفية</button>}
          </div>
        ) : (
          <div className="mkt-grid">
            {visibleProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 3}
                onAdd={() => addProductToCart(product)}
                onQuickView={(cardImageUrl) => openQuickView(product, cardImageUrl)}
              />
            ))}
          </div>
        )}
      </section>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
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

function formatProductPrice(value: number, currency: MarketplaceProduct["currency"] = "YER"): string {
  return `${Number(value).toLocaleString("en-US")} ${currency}`;
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
  priority,
  onAdd,
  onQuickView,
}: {
  product: MarketplaceProduct;
  priority: boolean;
  onAdd: () => void;
  onQuickView: (cardImageUrl?: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTimedOut, setImageTimedOut] = useState(false);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);
  const [requestStarted, setRequestStarted] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const productWithImageAliases = product as MarketplaceProduct & {
    images?: Array<string | { url?: string; src?: string }>;
    image?: string | { url?: string; src?: string };
  };
  const firstImage = Array.isArray(productWithImageAliases.images)
    ? productWithImageAliases.images[0]
    : undefined;
  const directProductImage =
    (typeof firstImage === "string" ? firstImage : (firstImage?.url ?? firstImage?.src)) ||
    product.image_url ||
    (typeof productWithImageAliases.image === "string"
      ? productWithImageAliases.image
      : (productWithImageAliases.image?.url ?? productWithImageAliases.image?.src)) ||
    null;
  const imageUrlToShow = imageFailed || imageTimedOut ? null : (imageUrl ?? directProductImage);
  const discountPercent = getDiscountPercent(product);
  const stockLabel =
    product.stock === 1 ? "متجر 1 قطعة" : `متوفر ${product.stock.toLocaleString("ar-YE")} قطع`;

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
    setImageTimedOut(false);
    setPlaceholderFailed(false);
    setImageUrl(null);
    setRequestStarted(false);
  }, [product.id]);

  useEffect(() => {
    if (directProductImage) setRequestStarted(true);
  }, [product.id, directProductImage]);

  useEffect(() => {
    if (!requestStarted || imageLoaded || imageFailed || imageTimedOut) return;
    const timeout = window.setTimeout(() => setImageTimedOut(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [requestStarted, imageLoaded, imageFailed, imageTimedOut]);

  useEffect(() => {
    const node = imageContainerRef.current;
    if (!node || imageUrl || directProductImage) return;
    let active = true;
    const requestImage = () => {
      setRequestStarted(true);
      void getSignedProductImage(product.image_path, 800).then((url) => {
        if (!active) return;
        setImageUrl(url);
        if (!url) setImageFailed(true);
      });
    };
    if (priority || typeof IntersectionObserver === "undefined") {
      requestImage();
      return () => {
        active = false;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        requestImage();
        observer.disconnect();
      },
      { rootMargin: "250px" },
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [product.id, product.image_path, directProductImage, imageUrl, priority]);

  const cardImageUrl = imageUrlToShow ?? undefined;

  return (
    <article className="mkt-card">
      <div
        ref={imageContainerRef}
        className="mkt-media"
      >
        {imageUrlToShow ? (
          <img
            src={imageUrlToShow}
            alt={product.title}
            width={600}
            height={750}
            className={imageLoaded ? "is-loaded" : "is-loading"}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        ) : imageTimedOut || imageFailed ? (
          placeholderFailed ? (
            <div role="img" aria-label="تعذر تحميل الصورة" className="mkt-image-placeholder" />
          ) : (
          <img
            src="/marketplace-product-placeholder.svg"
            alt="صورة افتراضية للمنتج"
            width={600}
            height={750}
            className="mkt-fallback"
            loading="eager"
            decoding="async"
            onError={() => setPlaceholderFailed(true)}
          />
          )
        ) : (
          <div
            role="img"
            aria-label="لا توجد صورة للمنتج"
            className="mkt-image-placeholder"
          />
        )}
        <div className="mkt-badges">
          <span className="mkt-b-fast">
            فوري ⚡
          </span>
          <span className={`mkt-b-stock ${product.stock < 1 ? "off" : ""}`}>
            {product.stock > 0 ? "متوفر" : "نفد المخزون"}
          </span>
        </div>
        <div className="mkt-actions">
          <button
            type="button"
            onClick={() => onQuickView(cardImageUrl)}
            aria-label={`معاينة ${product.title}`}
            className="mkt-ra white"
          >
            <Eye aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={product.stock < 1}
            aria-label={`أضف ${product.title} للسلة`}
            className="mkt-ra brown"
          >
            <ShoppingBag aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <div className="mkt-body">
        <h3 className="mkt-name">
          {product.title}
        </h3>
        <div className="mkt-meta">
          <span className="mkt-tag">
            {product.category || "عام"}
          </span>
        </div>
        <div className="mkt-pricing">
          <span className="mkt-stock-txt">{stockLabel}</span>
          <div className="mkt-price">
            <div className="mkt-was" dir="ltr">
              {product.old_price != null && product.old_price > product.price && (
                <>
                  <s>{Number(product.old_price).toLocaleString("en-US")}</s>
                  {discountPercent > 0 && <span className="mkt-off">-{discountPercent}%</span>}
                </>
              )}
            </div>
            <div className="mkt-now" dir="ltr">
              <b>{Number(product.price).toLocaleString("en-US")}</b>
              <span>{product.currency === "YER" ? "ري" : product.currency}</span>
            </div>
          </div>
        </div>
        <div className="mkt-seller">🏠 السوق الشامل</div>
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
  const oldPrice =
    product.old_price != null && product.old_price > product.price
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
          className="mkt-quick-view fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-1rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] bg-white p-4 text-[#382719] shadow-[0_28px_90px_rgba(24,16,9,0.28)] outline-none sm:p-5"
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

          <div className="mkt-quick-view-image relative h-[380px] w-full overflow-hidden rounded-[16px] bg-[#eee7da]">
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
                    Before Discount {formatProductPrice(oldPrice, product.currency)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="rounded-full bg-[#fff0e8] px-2.5 py-1 text-xs font-extrabold text-[#c65c2d]">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xl font-extrabold text-[#d95e16] sm:text-2xl">
                {formatProductPrice(Number(product.price), product.currency)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="min-w-0 rounded-xl bg-[#f7f2e9] p-3">
              <p className="text-[11px] font-semibold text-[#98866d]">رقم الصنف</p>
              <div className="mt-1 flex items-center justify-between gap-1.5">
                <p className="truncate text-sm font-bold text-[#473522]" dir="ltr">
                  {itemNumber}
                </p>
                <button
                  type="button"
                  onClick={() => void copyItemNumber()}
                  aria-label="نسخ رقم الصنف"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#715634] transition hover:bg-[#f4eddf]"
                >
                  {copied ? (
                    <Check aria-hidden="true" className="size-4 text-emerald-700" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
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
                {product.stock === 1
                  ? "المتوفر قطعة واحدة"
                  : `المتوفر ${product.stock.toLocaleString("ar-YE")} قطعة`}
              </p>
            </div>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-extrabold text-[#60472e]">
              1 فقط <LockKeyhole aria-hidden="true" className="size-3.5" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onAdd(product, 1);
                onOpenChange(false);
              }}
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
