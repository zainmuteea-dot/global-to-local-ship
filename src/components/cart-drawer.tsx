import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import {
  addToCart,
  isMerchantCartItem,
  readCart,
  removeFromCart,
  updateMerchantCartQuantity,
  writeCart,
  type CartItem,
} from "@/lib/extension-cart";
import "./cart-drawer.css";

type Props = { open: boolean; onClose: () => void };
type Currency = string;

function money(value: number, currency: Currency): string {
  const amount = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (currency === "YER") return `${amount} ري`;
  if (currency === "SAR") return `${amount} ر.س`;
  if (currency === "USD") return `$${amount}`;
  return `${amount} ${currency}`;
}

function itemCurrency(item: CartItem): Currency | null {
  return item.currency ?? null;
}

export function CartDrawer({ open, onClose }: Props) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [removedItem, setRemovedItem] = useState<CartItem | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener("alshamel-cart-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("alshamel-cart-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  const count = items.reduce((sum, item) => sum + (isMerchantCartItem(item) ? item.quantity : 1), 0);
  const hasUnpricedItems = items.some((item) => item.price === null || !item.currency);
  const totals = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const item of items) {
      const currency = itemCurrency(item);
      if (!currency || item.price === null) continue;
      const quantity = isMerchantCartItem(item) ? item.quantity : 1;
      grouped.set(currency, (grouped.get(currency) ?? 0) + item.price * quantity);
    }
    return Array.from(grouped.entries());
  }, [items]);

  const changeQuantity = (item: Extract<CartItem, { kind: "merchant" }>, quantity: number) => {
    const next = updateMerchantCartQuantity(readCart(), item.id, quantity);
    setItems(next);
    writeCart(next);
  };

  const removeItem = (item: CartItem) => {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const next = removeFromCart(readCart(), item.id);
    setItems(next);
    writeCart(next);
    setRemovedItem(item);
    undoTimerRef.current = window.setTimeout(() => setRemovedItem(null), 6000);
  };

  const undoRemove = () => {
    if (!removedItem) return;
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const next = addToCart(readCart(), removedItem);
    setItems(next);
    writeCart(next);
    setRemovedItem(null);
  };

  return (
    <div className="cd-root" data-open={open ? "true" : "false"} aria-hidden={!open}>
      <button
        type="button"
        className="cd-overlay"
        aria-label="إغلاق السلة"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <section
        ref={panelRef}
        className="cd-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketplace-cart-title"
        aria-describedby="marketplace-cart-description"
        dir="rtl"
      >
        <header className="cd-head">
          <div className="cd-head-t">
            <span className="cd-badge" aria-label={`${count} قطعة`}>{count}</span>
            <h2 id="marketplace-cart-title" className="cd-title">سلة التسوق</h2>
          </div>
          <button ref={closeRef} type="button" className="cd-close" onClick={onClose} aria-label="إغلاق السلة">
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        <p id="marketplace-cart-description" className="sr-only">منتجاتك المحفوظة محليًا في سلة السوق الشامل</p>
        {items.length > 0 && (
          <div className="cd-ship" aria-label="تفاصيل التوصيل">
            <p className="cd-ship-t">
              <span className="cd-ship-i"><Truck aria-hidden="true" size={15} /></span>
              <span>رسوم التوصيل تظهر قبل تأكيد الطلب</span>
            </p>
            <div className="cd-bar" aria-hidden="true"><i style={{ width: "0%" }} /></div>
          </div>
        )}

        <div className="cd-body">
          {items.length === 0 ? (
            <div className="cd-empty">
              <span className="cd-empty-i"><ShoppingBag aria-hidden="true" size={34} /></span>
              <h3>سلتك فارغة</h3>
              <p>أضف منتجات من السوق لتظهر هنا وتراجعها قبل إكمال الطلب.</p>
              <Link to="/products" className="cd-ghost-btn" onClick={onClose}>
                متابعة التسوق <ArrowLeft aria-hidden="true" size={15} />
              </Link>
            </div>
          ) : (
            <>
              <p className="cd-from">منتجاتك من <b>السوق الشامل</b></p>
              <ul className="cd-list">
                {items.map((item) => {
                  const local = isMerchantCartItem(item);
                  const quantity = local ? item.quantity : 1;
                  return (
                    <li key={item.id} className="cd-item">
                      <div className="cd-thumb">
                        {item.image ? (
                          <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
                        ) : (
                          <span className="cd-ph" aria-label="لا توجد صورة" role="img" />
                        )}
                      </div>
                      <div className="cd-info">
                        <p className="cd-name">{item.title}</p>
                        <p className="cd-desc">{local ? item.store.name : item.store.toUpperCase()}</p>
                        <div className="cd-row">
                          {local ? (
                            <div className="cd-qty" aria-label={`كمية ${item.title}`}>
                              <button type="button" aria-label={`تقليل كمية ${item.title}`} disabled={quantity <= 1} onClick={() => changeQuantity(item, quantity - 1)}>−</button>
                              <span aria-live="polite">{quantity}</span>
                              <button type="button" aria-label={`زيادة كمية ${item.title}`} disabled={quantity >= item.stock} onClick={() => changeQuantity(item, quantity + 1)}>+</button>
                            </div>
                          ) : (
                            <span className="cd-qty-static">1 قطعة</span>
                          )}
                          <span className="cd-price">
                            {item.price === null || !item.currency ? (
                              <b className="cd-price-pending">يحدد عند الطلب</b>
                            ) : (
                              <>
                                {local && quantity > 1 && <s>{money(item.price, item.currency)}</s>}
                                <b>{money(item.price * quantity, item.currency)}</b>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <button type="button" className="cd-del" aria-label={`حذف ${item.title} من السلة`} onClick={() => removeItem(item)}>
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {removedItem && (
                <div className="cd-toast" role="status">
                  <span>تم حذف «{removedItem.title}»</span>
                  <button type="button" onClick={undoRemove}><UndoIcon /> تراجع</button>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <footer className="cd-foot">
            <div className="cd-sum" aria-label="ملخص أسعار السلة">
              {totals.map(([currency, amount]) => (
                <div className="cd-sum-r" key={currency}>
                  <span>المجموع الفرعي · {currency}</span>
                  <b dir="ltr">{money(amount, currency)}</b>
                </div>
              ))}
              <div className="cd-sum-sep" />
              <div className="cd-sum-r is-total">
                <span>{totals.length > 1 ? "المجموع حسب العملة" : "الإجمالي"}</span>
                <b>{hasUnpricedItems ? "يكتمل عند تأكيد الأسعار" : totals.length === 1 ? money(totals[0][1], totals[0][0]) : totals.length > 1 ? `${count} قطع` : "—"}</b>
              </div>
            </div>
            <Link to="/cart" className="cd-cta" onClick={onClose}>
              <span className="cd-cta-t">إكمال الطلب</span>
              <span className="cd-cta-a">متابعة <ArrowLeft aria-hidden="true" size={15} /></span>
            </Link>
            <p className="cd-note">لن يتم تأكيد الطلب قبل مراجعتك النهائية</p>
          </footer>
        )}
      </section>
    </div>
  );
}

function UndoIcon() {
  return <Check aria-hidden="true" size={14} />;
}
