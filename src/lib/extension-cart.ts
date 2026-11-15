// Sلة السوق الشامل: عناصر من إضافة المتصفح ومن السوق المحلي، محفوظة في متصفح العميل.

export type CartCurrency = "USD" | "SAR";
export type MerchantCartCurrency = "YER" | "SAR" | "USD";
export type CartStore = "shein" | "noon" | "amazon";

export type ExternalCartItem = {
  kind?: "external";
  id: string;
  url: string;
  title: string;
  image: string;
  price: number | null;
  currency: CartCurrency | null;
  store: CartStore;
  addedAt: string;
};

export type MerchantCartItem = {
  kind: "merchant";
  id: string;
  productId: string;
  storeId: string;
  title: string;
  image: string;
  price: number;
  currency: MerchantCartCurrency;
  quantity: number;
  stock: number;
  store: { id: string; name: string; city: string };
  addedAt: string;
};

export type CartItem = ExternalCartItem | MerchantCartItem;

export const CART_STORAGE_KEY = "alshamel_cart_v1";
export const CART_MAX_ITEMS = 50;

// نطاقات المتاجر الرسمية فقط، حتى لا تُقبل نطاقات مقلدة مثل amazon.com.evil.io.
const STORE_HOSTS: Record<CartStore, RegExp> = {
  shein: /(^|\.)shein\.(com|com\.mx|co\.uk)$/i,
  noon: /(^|\.)noon\.com$/i,
  amazon: /(^|\.)amazon\.(com|sa|ae|eg|co\.uk|de|com\.tr)$/i,
};

export const CART_STORE_LABELS: Record<CartStore, string> = {
  shein: "SHEIN",
  noon: "Noon",
  amazon: "Amazon",
};

/** يحدد المتجر من رابط https فقط؛ أي رابط آخر يُرفض. */
export function detectCartStore(rawUrl: string): CartStore | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  for (const [store, re] of Object.entries(STORE_HOSTS) as [CartStore, RegExp][]) {
    if (re.test(parsed.hostname)) return store;
  }
  return null;
}

/** العملات التي يقبلها نموذج الطلب الخارجي: الدولار والريال السعودي فقط. */
export function normalizeCurrency(raw: unknown): CartCurrency | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase();
  if (v === "USD" || v === "$" || v === "US$") return "USD";
  if (v === "SAR" || v === "ر.س" || v === "SR" || v === "﷼") return "SAR";
  return null;
}

function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

/** يحوّل بيانات الإضافة إلى عنصر سلة آمن، أو null إذا كانت غير صالحة. */
export function parseIncomingItem(raw: unknown, now = new Date()): ExternalCartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const url = cleanText(data["url"], 2000);
  const store = detectCartStore(url);
  if (!store) return null;

  const title = cleanText(data["title"], 300) || `منتج ${CART_STORE_LABELS[store]}`;
  const imageRaw = cleanText(data["image"], 2000);
  const image = imageRaw.startsWith("https://") ? imageRaw : "";

  const priceNum =
    typeof data["price"] === "number"
      ? data["price"]
      : Number.parseFloat(String(data["price"] ?? "").replace(/,/g, ""));
  const currency = normalizeCurrency(data["currency"]);
  const priceOk = Number.isFinite(priceNum) && priceNum > 0 && currency !== null;

  return {
    kind: "external",
    id: `${store}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    title,
    image,
    price: priceOk ? Math.round(priceNum * 100) / 100 : null,
    currency: priceOk ? currency : null,
    store,
    addedAt: now.toISOString(),
  };
}

export function isMerchantCartItem(item: CartItem): item is MerchantCartItem {
  return item["kind"] === "merchant";
}

/** يضيف منتجًا محليًا، ويزيد كميته عند إضافته ثانيةً حتى حد المخزون. */
export function addMerchantProductToCart(
  items: CartItem[],
  product: {
    id: string;
    title: string;
    image_url: string | null;
    price: number;
    currency: MerchantCartCurrency;
    stock: number;
    store: { id: string; name: string; city: string };
  },
  now = new Date(),
): CartItem[] {
  const stock = Math.max(0, Math.floor(product.stock));
  if (stock < 1 || !Number.isFinite(product.price) || product.price < 0) return items;
  const existing = items.find(
    (item): item is MerchantCartItem =>
      isMerchantCartItem(item) && item["productId"] === product.id,
  );
  const quantity = Math.min(stock, (existing?.quantity ?? 0) + 1);
  const merchantItem: MerchantCartItem = {
    kind: "merchant",
    id: existing?.id ?? `merchant-${product.id}`,
    productId: product.id,
    storeId: product.store.id,
    title: cleanText(product.title, 300),
    image: product.image_url?.startsWith("https://") ? product.image_url : "",
    price: product.price,
    currency: product.currency,
    quantity,
    stock,
    store: {
      id: product.store.id,
      name: cleanText(product.store["name"], 120),
      city: cleanText(product.store.city, 120),
    },
    addedAt: existing?.addedAt ?? now.toISOString(),
  };
  return [merchantItem, ...items.filter((item) => item["id"] !== merchantItem.id)].slice(
    0,
    CART_MAX_ITEMS,
  );
}

export function updateMerchantCartQuantity(
  items: CartItem[],
  id: string,
  quantity: number,
): CartItem[] {
  return items.map((item) => {
    if (!isMerchantCartItem(item) || item["id"] !== id) return item;
    return { ...item, quantity: Math.max(1, Math.min(item["stock"], Math.floor(quantity) || 1)) };
  });
}

/** يضيف العنصر؛ الرابط نفسه لا يتكرر، والعنصر المحلي يحدّث كميته. */
export function addToCart(items: CartItem[], item: CartItem): CartItem[] {
  const isSameItem = (candidate: CartItem) =>
    isMerchantCartItem(item)
      ? isMerchantCartItem(candidate) && candidate.productId === item["productId"]
      : !isMerchantCartItem(candidate) && candidate.url === item["url"];
  const rest = items.filter((candidate) => !isSameItem(candidate));
  return [item, ...rest].slice(0, CART_MAX_ITEMS);
}

export function removeFromCart(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id);
}

function parseStoredMerchantItem(raw: Record<string, unknown>): MerchantCartItem | null {
  const store = raw["store"] as Record<string, unknown> | null;
  const productId = cleanText(raw["productId"], 200);
  const storeId = cleanText(raw["storeId"], 200);
  const title = cleanText(raw["title"], 300);
  const currency = raw["currency"];
  const price = Number(raw["price"]);
  const stock = Math.floor(Number(raw["stock"]));
  const quantity = Math.floor(Number(raw["quantity"]));
  if (!productId || !storeId || !title || !store || typeof store !== "object") return null;
  if (!["YER", "SAR", "USD"].includes(String(currency)) || !Number.isFinite(price) || price < 0)
    return null;
  if (!Number.isFinite(stock) || stock < 1 || !Number.isFinite(quantity) || quantity < 1)
    return null;
  return {
    kind: "merchant",
    id: `merchant-${productId}`,
    productId,
    storeId,
    title,
    image:
      typeof raw["image"] === "string" && raw["image"].startsWith("https://")
        ? raw["image"].slice(0, 2000)
        : "",
    price,
    currency: currency as MerchantCartCurrency,
    stock,
    quantity: Math.min(stock, quantity),
    store: {
      id: storeId,
      name: cleanText(store["name"], 120) || "متجر محلي",
      city: cleanText(store["city"], 120),
    },
    addedAt: cleanText(raw["addedAt"], 40) || new Date().toISOString(),
  };
}

export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(raw)
      ? raw.flatMap((value): CartItem[] => {
          if (!value || typeof value !== "object") return [];
          const item = value as Record<string, unknown>;
          if (item["kind"] === "merchant") {
            const parsed = parseStoredMerchantItem(item);
            return parsed ? [parsed] : [];
          }
          if (typeof item["id"] !== "string" || typeof item["url"] !== "string") return [];
          if (detectCartStore(item["url"]) === null) return [];
          return [
            {
              kind: "external",
              id: item["id"].slice(0, 200),
              url: item["url"].slice(0, 2000),
              title: cleanText(item["title"], 300),
              image:
                typeof item["image"] === "string" && item["image"].startsWith("https://")
                  ? item["image"].slice(0, 2000)
                  : "",
              price:
                typeof item["price"] === "number" && Number.isFinite(item["price"])
                  ? item["price"]
                  : null,
              currency: normalizeCurrency(item["currency"]),
              store: detectCartStore(item["url"])!,
              addedAt: cleanText(item["addedAt"], 40),
            },
          ];
        })
      : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent("alshamel-cart-updated", {
        detail: {
          count: items.reduce(
            (sum, item) => sum + (isMerchantCartItem(item) ? item["quantity"] : 1),
            0,
          ),
        },
      }),
    );
  } catch {
    // التخزين غير متاح؛ تبقى السلة في الصفحة الحالية فقط.
  }
}
