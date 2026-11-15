import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink, Puzzle, ShoppingCart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  addToCart,
  isMerchantCartItem,
  updateMerchantCartQuantity,
  type MerchantCartItem,
  type ExternalCartItem,
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
        content: "راجع منتجات السوق المحلي والمتاجر العالمية في سلة واحدة، ثم أكمل طلبك والتوصيل لباب بيتك.",
      },
      { property: "og:title", content: "سلتي | السوق الشامل" },
      {
        property: "og:description",
        content: "منتجات السوق المحلي والمتاجر العالمية جاهزة للمراجعة وإكمال الطلب عبر السوق الشامل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function formatPrice(item: CartItem): string {
  if (item.price === null || !item.currency) return "السعر يُحدد عند الطلب";
  const amount = item.price.toLocaleString("ar-YE", { maximumFractionDigits: 2 });
  if (item.currency === "USD") return `$${amount}`;
  if (item.currency === "SAR") return `${amount} ر.س`;
  return `${amount} ر.ي`;
}

function CartPage() {
  const navigate = useNavigate();
  const { user } = useSession(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [justAdded, setJustAdded] = useState<ExternalCartItem | null>(null);
  const [rejected, setRejected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedMerchantProduct, setSelectedMerchantProduct] = useState<MerchantCartItem | null>(null);

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

  const saveCart = (next: CartItem[]) => {
    setItems(next);
    writeCart(next);
  };

  const changeQuantity = (item: MerchantCartItem, quantity: number) => {
    const next = updateMerchantCartQuantity(items, item.id, quantity);
    saveCart(next);
    if (selectedMerchantProduct?.id === item.id) {
      const updated = next.find((candidate): candidate is MerchantCartItem => isMerchantCartItem(candidate) && candidate.id === item.id);
      setSelectedMerchantProduct(updated ?? null);
    }
  };

  const remove = (id: string) => {
    const next = removeFromCart(items, id);
    setItems(next);
    writeCart(next);
    if (justAdded?.id === id) setJustAdded(null);
    if (selectedMerchantProduct?.id === id) setSelectedMerchantProduct(null);
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
              <p className="text-sm opacity-80">{items.reduce((sum, item) => sum + (isMerchantCartItem(item) ? item.quantity : 1), 0)} منتج</p>
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
              تمت إضافة «{justAdded.title}» من {CART_STORE_LABELS[justAdded.store]} إلى سلة السوق الشامل بنجاح.
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
              أضف المنتجات من صفحة السوق المحلي أو من المتاجر المدعومة عبر إضافة المتصفح، وستظهر هنا لمراجعة الكمية وإكمال الطلب.
            </p>
            <Link
              to="/extension"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-black text-secondary-foreground"
            >
              <Puzzle className="h-4 w-4" /> تحميل الإضافة
            </Link>
          </div>
        )}

        {selectedMerchantProduct && (
          <MerchantOrderForm
            item={selectedMerchantProduct}
            userId={user?.id ?? null}
            onClose={() => setSelectedMerchantProduct(null)}
            onPlaced={() => {
              const next = removeFromCart(readCart(), selectedMerchantProduct.id);
              saveCart(next);
              setSelectedMerchantProduct(null);
            }}
          />
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
                    {isMerchantCartItem(item) ? item.store.name : CART_STORE_LABELS[item.store]}
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-bold">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {isMerchantCartItem(item) ? item.store.name : CART_STORE_LABELS[item.store]}
                  </span>
                </div>
                <p className="text-base font-black text-primary">{formatPrice(item)}</p>
                {isMerchantCartItem(item) && (
                  <p className="text-xs text-muted-foreground">
                    {item.store.city ? `${item.store.city} · ` : ""}الكمية: {item.quantity} · الإجمالي: {formatPrice({ ...item, price: item.price * item.quantity })}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {isMerchantCartItem(item) ? (
                    <>
                      <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
                        <button type="button" aria-label={`تقليل كمية ${item.title}`} disabled={item.quantity <= 1} onClick={() => changeQuantity(item, item.quantity - 1)} className="grid size-8 place-items-center rounded-md hover:bg-muted disabled:opacity-40">−</button>
                        <span className="min-w-6 text-center text-sm font-bold" aria-label="الكمية">{item.quantity}</span>
                        <button type="button" aria-label={`زيادة كمية ${item.title}`} disabled={item.quantity >= item.stock} onClick={() => changeQuantity(item, item.quantity + 1)} className="grid size-8 place-items-center rounded-md hover:bg-muted disabled:opacity-40">+</button>
                      </div>
                      <button type="button" onClick={() => setSelectedMerchantProduct(item)} className="rounded-lg bg-secondary px-4 py-2 text-xs font-black text-secondary-foreground hover:opacity-90">أكمل الطلب</button>
                    </>
                  ) : (
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
                  )}
                  {!isMerchantCartItem(item) && <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> فتح في المتجر
                  </a>}
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


function MerchantOrderForm({ item, userId, onClose, onPlaced }: {
  item: MerchantCartItem;
  userId: string | null;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", city: item.store.city, address: "" });

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc("merchant_create_order", {
        _product_id: item.productId,
        _quantity: item.quantity,
        _customer_name: form.name,
        _customer_phone: form.phone,
        _customer_city: form.city,
        _delivery_address: form.address,
      });
      if (error) {
        setErrorMessage(error.message?.includes("insufficient stock") ? "الكمية المطلوبة غير متوفرة حاليًا." : "تعذر إرسال الطلب. راجع بياناتك وحاول مجددًا.");
        return;
      }
      setSuccess(true);
    } catch {
      setErrorMessage("تعذر الاتصال بالخادم. تحقق من اتصالك ثم حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5" aria-labelledby="merchant-cart-order-heading">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><h2 id="merchant-cart-order-heading" className="font-bold">إكمال طلب {item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{formatPrice(item)} · الكمية {item.quantity} · الدفع عند الاستلام</p></div>
        <button type="button" onClick={onClose} className="text-sm font-semibold">إغلاق</button>
      </div>
      {success ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold text-primary">تم تسجيل طلبك بنجاح. سيتواصل معك المتجر لتأكيد التسليم.</p><button type="button" onClick={onPlaced} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">تم</button></div>
      ) : !userId ? (
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">سجّل الدخول أولًا لإتمام الطلب ومتابعته.</p><Link to="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">تسجيل الدخول</Link></div>
      ) : (
        <form onSubmit={submitOrder} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">الاسم<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 rounded-lg border bg-background px-3" /></label>
          <label className="grid gap-1.5 text-sm font-medium">رقم الهاتف<input required minLength={7} maxLength={24} autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-10 rounded-lg border bg-background px-3" /></label>
          <label className="grid gap-1.5 text-sm font-medium">المدينة<input required minLength={2} maxLength={80} autoComplete="address-level2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="h-10 rounded-lg border bg-background px-3" /></label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">عنوان التوصيل<textarea required minLength={5} maxLength={300} rows={2} autoComplete="street-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="rounded-lg border bg-background px-3 py-2" /></label>
          {errorMessage && <p role="alert" className="text-sm text-destructive sm:col-span-2">{errorMessage}</p>}
          <div className="flex items-center justify-between gap-4 sm:col-span-2"><p className="text-sm text-muted-foreground">الإجمالي: <strong className="text-foreground">{formatPrice({ ...item, price: item.price * item.quantity })}</strong></p><button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">{busy ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}</button></div>
        </form>
      )}
    </section>
  );
}
