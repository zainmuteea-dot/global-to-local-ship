import { supabase } from "@/integrations/supabase/client";
import { productImageVariantPath, type ProductImageWidth } from "@/lib/merchant-product-images";

const db = supabase as any;

// Keep signed image URLs in memory during their usable lifetime to avoid repeat signing calls.
const signedImageUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000;
const SIGNED_URL_STORAGE_PREFIX = "marketplace-product-image:v1:";

function readCachedSignedImage(cacheKey: string): string | null {
  const memory = signedImageUrlCache.get(cacheKey);
  if (memory && memory.expiresAt > Date.now()) return memory.url;
  signedImageUrlCache.delete(cacheKey);
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${SIGNED_URL_STORAGE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { url?: unknown; expiresAt?: unknown };
    if (typeof saved.url === "string" && typeof saved.expiresAt === "number" && saved.expiresAt > Date.now()) {
      signedImageUrlCache.set(cacheKey, { url: saved.url, expiresAt: saved.expiresAt });
      return saved.url;
    }
    window.localStorage.removeItem(`${SIGNED_URL_STORAGE_PREFIX}${cacheKey}`);
  } catch {
    // Storage may be disabled or unavailable in private browsing; the network flow still works.
  }
  return null;
}

function cacheSignedImage(cacheKey: string, url: string) {
  const expiresAt = Date.now() + SIGNED_URL_CACHE_MS;
  signedImageUrlCache.set(cacheKey, { url, expiresAt });
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${SIGNED_URL_STORAGE_PREFIX}${cacheKey}`, JSON.stringify({ url, expiresAt }));
  } catch {
    // The in-memory and browser HTTP caches remain available when local storage is full or disabled.
  }
}

// Existing production schema requires image_path; this store-scoped sentinel represents no uploaded image.
export const EMPTY_PRODUCT_IMAGE = "__no_image__";

export type MerchantStore = {
  id: string;
  name: string;
  description: string;
  contact_phone: string;
  city: string;
  status: "active" | "suspended";
  created_at: string;
  store_image_path: string | null;
  store_image_fit: "cover" | "contain";
  store_image_position: "left" | "center" | "right";
};

export type MerchantStorePrivate = MerchantStore & {
  commission_rate: number;
};

export type MerchantProduct = {
  id: string;
  store_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  sku: string | null;
  currency: "YER" | "SAR" | "USD";
  stock: number;
  image_path: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type MerchantOrder = {
  id: string;
  customer_id: string | null;
  store_id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  currency: MerchantProduct["currency"];
  commission_rate: number;
  total_amount: number;
  commission_amount: number;
  seller_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  delivery_address: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  created_at: string;
};

export type MarketplaceProduct = MerchantProduct & {
  image_url: string | null;
  store: Pick<
    MerchantStore,
    | "id"
    | "name"
    | "contact_phone"
    | "city"
    | "store_image_path"
    | "store_image_fit"
    | "store_image_position"
  > & { image_url: string | null };
};

export const productStatusLabels: Record<MerchantProduct["status"], string> = {
  draft: "مسودة",
  pending_review: "بانتظار المراجعة",
  approved: "منشور",
  rejected: "يحتاج تعديلًا",
  archived: "مؤرشف",
};

export const orderStatusLabels: Record<MerchantOrder["status"], string> = {
  pending: "طلب جديد",
  confirmed: "تم التأكيد",
  preparing: "قيد التجهيز",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function logMarketplaceError(stage: string, error: unknown) {
  const issue = error as { code?: string; message?: string; hint?: string } | null;
  console.error(`[merchant-marketplace] ${stage} failed`, {
    code: issue?.code,
    message: issue?.message ?? String(error),
    hint: issue?.hint,
  });
}

export async function getSignedProductImage(
  path: string,
  width?: ProductImageWidth,
  refresh = false,
): Promise<string | null> {
  if (!path || path.endsWith(`/${EMPTY_PRODUCT_IMAGE}`)) return null;
  const variantPath = width ? productImageVariantPath(path, width) : null;
  const imagePath = variantPath ?? path;
  const cacheKey = `${imagePath}:${width ?? "original"}`;
  if (!refresh) {
    const cachedUrl = readCachedSignedImage(cacheKey);
    if (cachedUrl) return cachedUrl;
  }
  signedImageUrlCache.delete(cacheKey);
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(`${SIGNED_URL_STORAGE_PREFIX}${cacheKey}`); } catch { /* cache is optional */ }
  }
  try {
    const { data, error } = await supabase.storage
      .from("merchant-product-images")
      .createSignedUrl(
        imagePath,
        3600,
        !variantPath && width
          ? { transform: { width, resize: width === 600 ? "cover" : "contain", quality: 70 } }
          : undefined,
      );
    if (error) {
      console.warn("[merchant-marketplace] product image signing failed", error.message);
      return null;
    }
    cacheSignedImage(cacheKey, data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    // A storage/network failure for one image must not hide every approved product.
    logMarketplaceError("product image signing", error);
    return null;
  }
}

const MARKETPLACE_PRODUCT_FIELDS =
  "id,store_id,title,description,category,price,old_price,discount_percent,sku,currency,stock,image_path,status,created_at,updated_at";
const MARKETPLACE_PRODUCT_BASE_FIELDS =
  "id,store_id,title,description,category,price,currency,stock,image_path,status,created_at,updated_at";
const MARKETPLACE_STORE_FIELDS =
  "id,name,contact_phone,city,store_image_path,store_image_fit,store_image_position";
const MARKETPLACE_STORE_BASE_FIELDS = "id,name,contact_phone,city";

function isMissingColumnError(error: unknown): boolean {
  const issue = error as { code?: string; message?: string; details?: string } | null;
  const message = `${issue?.message ?? ""} ${issue?.details ?? ""}`;
  return issue?.code === "42703" || issue?.code === "PGRST204" ||
    /column .* does not exist|could not find .*column.*schema cache/i.test(message);
}

export async function loadMarketplace(): Promise<MarketplaceProduct[]> {
  let { data: rows, error } = await db
    .from("merchant_products")
    .select(MARKETPLACE_PRODUCT_FIELDS)
    .eq("status", "approved")
    .gt("stock", 0)
    .order("created_at", { ascending: false });

  // Optional merchandising columns were added after the base marketplace schema.
  // Fall back to the original production columns if that migration/schema cache is behind.
  if (error && isMissingColumnError(error)) {
    console.warn("[merchant-marketplace] optional product columns unavailable; using base fields");
    const fallback = await db
      .from("merchant_products")
      .select(MARKETPLACE_PRODUCT_BASE_FIELDS)
      .eq("status", "approved")
      .gt("stock", 0)
      .order("created_at", { ascending: false });
    rows = fallback.data;
    error = fallback.error;
  }
  if (error) {
    logMarketplaceError("approved products query", error);
    throw error;
  }
  if (!rows?.length) return [];

  const productRows = (rows as Array<Partial<MerchantProduct> & Pick<MerchantProduct,
    "id" | "store_id" | "title" | "description" | "category" | "price" | "currency" | "stock" | "image_path" | "status" | "created_at" | "updated_at"
  >>).map((row) => ({
    ...row,
    old_price: row.old_price ?? null,
    discount_percent: row.discount_percent ?? null,
    sku: row.sku ?? null,
  })) as MerchantProduct[];

  const storeIds = [...new Set(productRows.map((row) => row.store_id))];
  let { data: stores, error: storeError } = await db
    .from("merchant_stores")
    .select(MARKETPLACE_STORE_FIELDS)
    .in("id", storeIds)
    .eq("status", "active");

  // Store image presentation fields are optional; don't let an unapplied migration
  // prevent the real approved products and active stores from appearing.
  if (storeError && isMissingColumnError(storeError)) {
    console.warn("[merchant-marketplace] optional store image columns unavailable; using base fields");
    const fallback = await db
      .from("merchant_stores")
      .select(MARKETPLACE_STORE_BASE_FIELDS)
      .in("id", storeIds)
      .eq("status", "active");
    stores = fallback.data;
    storeError = fallback.error;
  }
  if (storeError) {
    logMarketplaceError("active stores query", storeError);
    throw storeError;
  }

  // Product image signing is done on demand by each card, not serially while loading the product list.
  const storeById = new Map<string, MarketplaceProduct["store"]>(
    (stores ?? []).map((store: Partial<MarketplaceProduct["store"]> & Pick<MarketplaceProduct["store"], "id" | "name" | "contact_phone" | "city">) => [
      store.id,
      {
        ...store,
        store_image_path: store.store_image_path ?? null,
        store_image_fit: store.store_image_fit ?? "cover",
        store_image_position: store.store_image_position ?? "center",
        image_url: null,
      },
    ] as const),
  );
  const visibleRows = productRows.filter((row) => storeById.has(row.store_id));
  return visibleRows.map((row) => ({
    ...row,
    image_url: null, // Signed lazily when the product card enters the viewport.
    store: storeById.get(row.store_id)!,
  }));
}

export function formatMoney(amount: number, currency: MerchantProduct["currency"]): string {
  try {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ar-YE")} ${currency}`;
  }
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium" }).format(new Date(value));
}
