import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Puzzle, ShoppingCart, Trash2 } from "lucide-react";
import {
  addToCart,
  CART_STORE_LABELS,
  type CartItem,
  parseIncomingItem,
  readCart,
  removeFromCart,
  writeCart,
} from "@/lib/extension-cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلتي | السوق الشامل AL SHAMEL SHOPPING" },
      {
        name: "description",
        content: "المنتجات التي أضفتها من SHEIN وNoon وAmazon عبر زر «أضف للسوق الشامل»، جاهزة للطلب والتوصيل لباب بيتك.",
      },
      { property: "og:title", content: "سلتي | السوق الشامل" },
      {
        property: "og:description",
        content: "منتجاتك المختارة من SHEIN وNoon وAmazon جاهزة للطلب عبر السوق الشامل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function formatPrice(item: CartItem): string {
  if (item.price === null || !item.currency) return "السعر يُحدد عند الطلب";
  return item.currency === "USD"
    ? `$${item.price.toLocaleString("en-US")}`
    : `${item.price.toLocaleString("en-US")} ر.س`;
}

function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [justAdded, setJustAdded] = useState<CartItem | null>(null);
  const [rejected, setRejected] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cart = readCart();
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1") {
      const item = parseIncomingItem({
        url: params.get("url"),
        title: params.get("title"),
        image: params.get("image"),
        price: params.get("price"),
        currency: params.get("currency"),
      });
      if (item) {
        cart = addToCart(cart, item);
        writeCart(cart);
        setJustAdded(item);
      } else {
        setRejected(true);
      }
      void navigate({ to: "/cart", replace: true });
    }
    setItems(cart);
    setLoaded(true);
  }, [navigate]);

  const remove = (id: string) => {
    const next = removeFromCart(items, id);
    setItems(next);
    writeCart(next);
    if (justAdded?.id === id) setJustAdded(null);
  };

  const clearAll = () => {
    if (!window.confirm("حذف كل المنتجات من السلة؟")) return;
    setItems([]);
    writeCart([]);
    setJustAdded(null);
  };

  return (
    <main dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">سلتي في السوق الشامل</h1>
              <p className="text-sm opacity-80">{items.length} منتج من SHEIN وNoon وAmazon</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/extension"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-3 py-2 text-xs font-bold hover:bg-primary-foreground/25"
            >
              <Puzzle className="h-4 w-4" /> إضافة المتصفح
            </Link>
            <Link
              to="/dashboard"
              className="rounded-xl bg-primary-foreground/15 px-3 py-2 text-xs font-bold hover:bg-primary-foreground/25"
            >
              لوحة حسابي
            </Link>
          </div>
        </header>

        {justAdded && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-sm font-bold">
              تمت إضافة «{justAdded.title}» من {CART_STORE_LABELS[justAdded.store]} إلى سلتك.
            </p>
          </div>
        )}
        {rejected && (
          <div className="rounded-2xl border border-destructive/40 bg-card p-4 text-sm font-bold text-destructive">
            لم نتمكن من إضافة المنتج: الرابط ليس من SHEIN أو Noon أو Amazon.
          </div>
        )}

        {loaded && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 font-bold">سلتك فارغة</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ثبّت إضافة المتصفح، ثم اضغط «أضف للسوق الشامل» في صفحة أي منتج على SHEIN أو Noon أو Amazon.
            </p>
            <Link
              to="/extension"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-black text-secondary-foreground"
            >
              <Puzzle className="h-4 w-4" /> تحميل الإضافة
            </Link>
          </div>
        )}

        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">
                    {CART_STORE_LABELS[item.store]}
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-bold">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {CART_STORE_LABELS[item.store]}
                  </span>
                </div>
                <p className="text-base font-black text-primary">{formatPrice(item)}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    to="/new-order"
                    search={{
                      url: item.url,
                      store: item.store,
                      productName: item.title,
                      price: item.price !== null ? String(item.price) : undefined,
                      currency: item.currency ?? undefined,
                      step: "price",
                    }}
                    className="rounded-lg bg-secondary px-4 py-2 text-xs font-black text-secondary-foreground hover:opacity-90"
                  >
                    اطلب هذا المنتج
                  </Link>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> فتح في المتجر
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {items.length > 1 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-muted-foreground underline"
          >
            إفراغ السلة
          </button>
        )}
      </div>
    </main>
  );
}
