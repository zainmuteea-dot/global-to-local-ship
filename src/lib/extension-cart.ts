// سلة "أضف للسوق الشامل": عناصر تصل من إضافة المتصفح وتُحفظ في متصفح العميل.

export type CartCurrency = "USD" | "SAR";
export type CartStore = "shein" | "noon" | "amazon";

export type CartItem = {
  id: string;
  url: string;
  title: string;
  image: string;
  price: number | null;
  currency: CartCurrency | null;
  store: CartStore;
  addedAt: string;
};

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

/** العملات التي يقبلها نموذج الطلب: الدولار والريال السعودي فقط. */
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
export function parseIncomingItem(raw: unknown, now = new Date()): CartItem | null {
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

/** يضيف العنصر؛ نفس الرابط لا يتكرر بل يُحدَّث وينتقل للأعلى. */
export function addToCart(items: CartItem[], item: CartItem): CartItem[] {
  const rest = items.filter((i) => i.url !== item.url);
  return [item, ...rest].slice(0, CART_MAX_ITEMS);
}

export function removeFromCart(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id);
}

export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (i): i is CartItem =>
            !!i && typeof i === "object" && typeof i.id === "string" && detectCartStore(i.url) !== null,
        )
      : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("alshamel-cart-updated", { detail: { count: items.length } }));
  } catch {
    // التخزين غير متاح؛ تبقى السلة في الصفحة الحالية فقط.
  }
}
