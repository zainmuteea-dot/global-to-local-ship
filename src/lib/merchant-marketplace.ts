import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

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
  store: Pick<MerchantStore, "id" | "name" | "contact_phone" | "city">;
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

export async function getSignedProductImage(path: string): Promise<string | null> {
  if (!path || path.endsWith(`/${EMPTY_PRODUCT_IMAGE}`)) return null;
  try {
    const { data, error } = await supabase.storage
      .from("merchant-product-images")
      .createSignedUrl(path, 3600);
    if (error) {
      console.warn("[merchant-marketplace] product image signing failed", error.message);
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    // A storage/network failure for one image must not hide every approved product.
    logMarketplaceError("product image signing", error);
    return null;
  }
}

export async function loadMarketplace(): Promise<MarketplaceProduct[]> {
  const { data: rows, error } = await db
    .from("merchant_products")
    .select("id,store_id,title,description,category,price,currency,stock,image_path,status,created_at,updated_at")
    .eq("status", "approved")
    .gt("stock", 0)
    .order("created_at", { ascending: false });
  if (error) {
    logMarketplaceError("approved products query", error);
    throw error;
  }
  if (!rows?.length) return [];

  const storeIds = [...new Set(rows.map((row: MerchantProduct) => row.store_id))];
  const { data: stores, error: storeError } = await db
    .from("merchant_stores")
    .select("id,name,contact_phone,city")
    .in("id", storeIds)
    .eq("status", "active");
  if (storeError) {
    logMarketplaceError("active stores query", storeError);
    throw storeError;
  }

  const storeById = new Map<string, MarketplaceProduct["store"]>(
    (stores ?? []).map((store: MarketplaceProduct["store"]) => [store.id, store]),
  );
  const visibleRows = (rows as MerchantProduct[]).filter((row) => storeById.has(row.store_id));
  const signedImages = await Promise.all(visibleRows.map((row) => getSignedProductImage(row.image_path)));

  return visibleRows.map((row, index) => ({
    ...row,
    image_url: signedImages[index] ?? null,
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
