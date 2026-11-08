import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CreditCard, Eye, Loader2, Receipt, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/account/invoices")({
  component: AccountInvoicesPage,
});

type InvoiceItem = {
  key: string;
  orderId: string | null;
  invoiceNumber: string;
  client: string | null;
  totalYer: number | null;
  paidYer: number | null;
  remainingYer: number | null;
  createdAt: string | null;
};

const FIXED_YER_RATE = { SAR: 140, USD: 535 } as const;

function resolveOrderTotalYER(
  storedTotal: unknown,
  notes: string | null | undefined,
): number | null {
  const priceMatch = (notes ?? "").match(/السعر المعلن:\s*([\d,]+(?:\.\d+)?)\s*([^|]*)/);

  if (priceMatch) {
    const amount = Number((priceMatch[1] ?? "").replace(/,/g, ""));
    const currency = (priceMatch[2] ?? "").trim().toLowerCase();

    if (Number.isFinite(amount) && amount > 0) {
      if (currency.includes("سعودي") || currency.includes("ر.س") || currency.includes("sar")) {
        return Math.round(amount * FIXED_YER_RATE.SAR);
      }
      if (currency.includes("$") || currency.includes("دولار") || currency.includes("usd")) {
        return Math.round(amount * FIXED_YER_RATE.USD);
      }
      if (currency.includes("يمني") || currency.includes("ر.ي") || currency.includes("yer")) {
        return Math.round(amount);
      }
    }
  }

  const savedTotal = Number(storedTotal);
  return Number.isFinite(savedTotal) && savedTotal > 0 ? savedTotal : null;
}

const money = (value: number | null) =>
  value == null ? "غير مسجل" : `${Math.round(value).toLocaleString("ar-YE")} ر.ي`;

function AccountInvoicesPage() {
  const { user, loading: sessionLoading } = useSession();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const db = supabase as any;
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const phoneCandidates = Array.from(
      new Set(
        [
          user.phone,
          typeof metadata["phone"] === "string" ? metadata["phone"] : null,
          typeof metadata["phone_number"] === "string" ? metadata["phone_number"] : null,
        ]
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      ),
    );

    try {
      const orderSelect =
        "id, tracking_code, customer_name, phone, customer_phone, user_id, total_cost_yer, notes, created_at";
      const orderMap = new Map<string, any>();
      const addOrders = (rows: any[] | null) => {
        for (const row of rows ?? []) if (row?.id) orderMap.set(String(row.id), row);
      };

      const { data: ownOrders, error: ownOrdersError } = await db
        .from("orders")
        .select(orderSelect)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (ownOrdersError) throw ownOrdersError;
      addOrders(ownOrders);

      const { data: profile } = await db
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      const profilePhone = String(profile?.phone ?? "").trim();
      if (profilePhone && !phoneCandidates.includes(profilePhone))
        phoneCandidates.push(profilePhone);

      for (const phone of phoneCandidates) {
        for (const column of ["phone", "customer_phone"]) {
          const { data, error: phoneError } = await db
            .from("orders")
            .select(orderSelect)
            .eq(column, phone)
            .order("created_at", { ascending: false })
            .limit(500);
          if (!phoneError) addOrders(data);
        }
      }

      // Some legacy deployments may have stored the account email on the row.
      // Probe only the current authenticated email; missing candidate columns are ignored.
      if (user.email) {
        for (const column of ["email", "customer_email", "email_address"]) {
          const { data, error: emailError } = await db
            .from("orders")
            .select(orderSelect)
            .eq(column, user.email)
            .order("created_at", { ascending: false })
            .limit(500);
          if (!emailError) addOrders(data);
        }
      }

      const orderIds = Array.from(orderMap.keys());
      const invoiceMap = new Map<string, any>();
      const invoiceByTrackingCode = new Map<string, any>();
      const invoiceById = new Map<string, any>();
      const addInvoices = (rows: any[] | null) => {
        for (const row of rows ?? []) {
          if (row?.id) invoiceById.set(String(row.id), row);
          if (row?.order_id) invoiceMap.set(String(row.order_id), row);
          const tracking = String(row?.tracking_code ?? "").trim();
          if (tracking && !invoiceByTrackingCode.has(tracking))
            invoiceByTrackingCode.set(tracking, row);
        }
      };
      const invoiceSelect =
        "id, invoice_number, client, total, total_yer, created_at, order_id, user_id, tracking_code";
      const { data: ownInvoices, error: ownInvoicesError } = await db
        .from("sales_invoices")
        .select(invoiceSelect)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!ownInvoicesError) addInvoices(ownInvoices);

      for (let start = 0; start < orderIds.length; start += 100) {
        const chunk = orderIds.slice(start, start + 100);
        const { data, error: linkedError } = await db
          .from("sales_invoices")
          .select(invoiceSelect)
          .in("order_id", chunk)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!linkedError) addInvoices(data);
      }
      const trackingCodes = Array.from(
        new Set(
          Array.from(orderMap.values())
            .map((order) => String(order.tracking_code ?? "").trim())
            .filter(Boolean),
        ),
      );
      for (let start = 0; start < trackingCodes.length; start += 100) {
        const chunk = trackingCodes.slice(start, start + 100);
        const { data, error: codeError } = await db
          .from("sales_invoices")
          .select(invoiceSelect)
          .in("tracking_code", chunk)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!codeError) addInvoices(data);
      }
      if (user.email) {
        for (const column of ["email", "customer_email", "email_address"]) {
          const { data, error: emailError } = await db
            .from("sales_invoices")
            .select(invoiceSelect)
            .eq(column, user.email)
            .order("created_at", { ascending: false })
            .limit(500);
          if (!emailError) addInvoices(data);
        }
      }

      const paidByOrder = new Map<string, number>();
      const invalidOrderIds = new Set<string>();
      for (let start = 0; start < orderIds.length; start += 100) {
        const chunk = orderIds.slice(start, start + 100);
        for (let offset = 0; ; offset += 1000) {
          const { data, error: paymentsError } = await db
            .from("payments")
            .select("order_id, amount")
            .in("order_id", chunk)
            .eq("status", "approved")
            .order("id", { ascending: true })
            .range(offset, offset + 999);
          if (paymentsError) throw paymentsError;
          for (const payment of data ?? []) {
            const id = String(payment.order_id ?? "");
            const amount = Number(payment.amount);
            if (!id || !Number.isFinite(amount)) invalidOrderIds.add(id);
            else paidByOrder.set(id, (paidByOrder.get(id) ?? 0) + amount);
          }
          if ((data ?? []).length < 1000) break;
        }
      }

      const items: InvoiceItem[] = Array.from(orderMap.values()).map((order) => {
        const id = String(order.id);
        const invoice =
          invoiceMap.get(id) ?? invoiceByTrackingCode.get(String(order.tracking_code ?? "").trim());
        const total = resolveOrderTotalYER(order.total_cost_yer, order.notes);
        const paid = invalidOrderIds.has(id) ? null : (paidByOrder.get(id) ?? 0);
        return {
          key: `order-${id}`,
          orderId: id,
          invoiceNumber: String(
            invoice?.invoice_number || order.tracking_code || `ORD-${id.slice(0, 8)}`,
          ),
          client: order.customer_name ?? invoice?.client ?? null,
          totalYer: total,
          paidYer: paid,
          remainingYer: total == null || paid == null ? null : Math.max(0, total - paid),
          createdAt: order.created_at ?? invoice?.created_at ?? null,
        };
      });

      for (const invoice of invoiceById.values()) {
        if (invoice.order_id && orderMap.has(String(invoice.order_id))) continue;
        const invoiceTracking = String(invoice.tracking_code ?? "").trim();
        if (
          invoiceTracking &&
          Array.from(orderMap.values()).some(
            (order) => String(order.tracking_code ?? "").trim() === invoiceTracking,
          )
        )
          continue;
        const totalRaw = invoice.total_yer ?? invoice.total;
        const total =
          totalRaw == null || !Number.isFinite(Number(totalRaw)) ? null : Number(totalRaw);
        items.push({
          key: `invoice-${invoice.id}`,
          orderId: invoice.order_id ? String(invoice.order_id) : null,
          invoiceNumber: String(invoice.invoice_number || String(invoice.id).slice(0, 8)),
          client: invoice.client ?? null,
          totalYer: total,
          paidYer: null,
          remainingYer: null,
          createdAt: invoice.created_at ?? null,
        });
      }
      items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      setInvoices(items);
    } catch (cause) {
      console.error("Failed to load account invoices:", cause);
      setInvoices([]);
      setError("تعذر تحميل فواتيرك وطلباتك. تأكد من صلاحيات قراءة الطلبات والدفعات.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionLoading && user) void loadInvoices();
  }, [loadInvoices, sessionLoading, user]);

  const navigate = useNavigate();
  const customerName = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const fromAccount = String(metadata["full_name"] ?? metadata["name"] ?? "").trim();
    const fromInvoice = String(invoices.find((invoice) => invoice.client)?.client ?? "").trim();
    return (fromAccount || fromInvoice).split(/\s+/)[0] || "عميلنا";
  }, [invoices, user]);

  const unpaidInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.remainingYer == null || invoice.remainingYer > 0),
    [invoices],
  );
  const totalRemaining = useMemo<number | null>(() => {
    if (invoices.some((invoice) => invoice.remainingYer == null)) return null;
    return invoices.reduce((sum, invoice) => sum + (invoice.remainingYer ?? 0), 0);
  }, [invoices]);

  const openPayment = (invoice: InvoiceItem) => {
    if (!invoice.orderId) return;
    void navigate({ to: "/pay", search: { order: invoice.orderId } as any });
  };

  const formatDate = (value: string | null) => {
    if (!value) return "التاريخ غير متوفر";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "التاريخ غير متوفر"
      : date.toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="ai-page" dir="rtl" lang="ar">
      <style>{INVOICE_STYLE}</style>
      <header className="ai-topbar">
        <div className="ai-topbar-inner">
          <div className="ai-brand">
            <span className="ai-brand-mark"><Wallet size={21} /></span>
            <span className="ai-brand-copy">
              <strong>السوق الشامل</strong>
              <small>AL SHAMEL SHOPPING</small>
            </span>
          </div>
          <button className="ai-back" type="button" onClick={() => void navigate({ to: "/my-account" })}>
            رجوع <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main className="ai-main">
        <section className="ai-welcome">
          <h1>أهلاً بك يا {customerName} <span aria-hidden="true">👋</span></h1>
          <p>إليك ملخص فواتيرك وحالات الدفع الخاصة بك</p>
        </section>

        {error && (
          <div className="ai-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void loadInvoices()} aria-label="إعادة تحميل الفواتير">
              <RefreshCw size={16} /> إعادة المحاولة
            </button>
          </div>
        )}

        <section className="ai-summary" aria-label="ملخص المبالغ المتبقية">
          <div className="ai-summary-info">
            <span className="ai-summary-icon"><CreditCard size={24} /></span>
            <div>
              <div className="ai-summary-label">إجمالي المتبقي المسجل عليك</div>
              <div className="ai-summary-value">{money(totalRemaining)}</div>
              <div className="ai-summary-caption">
                {unpaidInvoices.length} {unpaidInvoices.length === 1 ? "فاتورة نشطة" : "فواتير نشطة"}
              </div>
            </div>
          </div>
          <div className="ai-summary-action">
            <span className="ai-summary-note">يمكنك دفع كل طلب على حدة من بطاقته أدناه</span>
          </div>
        </section>

        <div className="ai-section-heading">
          <h2>فواتيرك</h2>
          <span>{invoices.length} {invoices.length === 1 ? "فاتورة" : "فواتير"}</span>
        </div>

        {loading ? (
          <div className="ai-state" role="status"><Loader2 className="ai-spin" size={25} /> جارٍ تحميل فواتيرك…</div>
        ) : invoices.length === 0 ? (
          <div className="ai-empty">
            <span className="ai-empty-icon"><Receipt size={25} /></span>
            <strong>لا توجد فواتير مرتبطة بحسابك</strong>
            <p>لم نعثر على طلب أو فاتورة مرتبطة بمعرّفك أو رقم هاتفك أو بريدك المسجل.</p>
          </div>
        ) : (
          <section className="ai-list" aria-label="قائمة الفواتير">
            {invoices.map((invoice) => {
              const paid = invoice.paidYer;
              const total = invoice.totalYer;
              const remaining = invoice.remainingYer;
              const percent = total != null && total > 0 && paid != null
                ? Math.max(0, Math.min(100, (paid / total) * 100))
                : null;
              const isPaid = remaining != null && remaining <= 0 && total != null;
              const status = isPaid
                ? "مدفوعة بالكامل"
                : paid != null && paid > 0
                  ? `مدفوعة جزئياً • ${Math.round(percent ?? 0)}٪`
                  : paid === 0
                    ? "غير مدفوعة"
                    : "بيانات الدفع غير مكتملة";

              return (
                <article className="ai-card" key={invoice.key}>
                  <div className="ai-card-heading">
                    <span className="ai-card-icon"><Receipt size={20} /></span>
                    <div className="ai-card-title">
                      <strong>فاتورة {invoice.invoiceNumber}</strong>
                      <time>{formatDate(invoice.createdAt)}</time>
                    </div>
                  </div>

                  <div className="ai-status">
                    <div className="ai-status-line">
                      <span className={isPaid ? "ai-status-text paid" : "ai-status-text"}>{status}</span>
                      <span className="ai-percent">{percent == null ? "—" : `${Math.round(percent)}٪`}</span>
                    </div>
                    <div className="ai-progress" aria-label={percent == null ? "نسبة السداد غير متوفرة" : `تم سداد ${Math.round(percent)} بالمئة`}>
                      <span style={{ width: `${percent ?? 0}%` }} />
                    </div>
                  </div>

                  <div className="ai-amounts">
                    <div className="ai-amount">
                      <span>الإجمالي</span><strong>{money(total)}</strong>
                    </div>
                    <div className="ai-amount paid-amount">
                      <span>المدفوع</span><strong>{money(paid)}</strong>
                    </div>
                    <div className="ai-amount remaining-amount">
                      <span>المتبقي</span><strong>{money(remaining)}</strong>
                    </div>
                  </div>

                  <div className="ai-actions">
                    {isPaid ? (
                      <button className="ai-pay-button ai-complete" type="button" disabled>
                        <Check size={17} /> تم السداد بالكامل
                      </button>
                    ) : invoice.orderId && remaining != null && remaining > 0 ? (
                      <button className="ai-pay-button" type="button" onClick={() => openPayment(invoice)}>
                        <CreditCard size={17} /> ادفع المتبقي {money(remaining)}
                      </button>
                    ) : (
                      <button className="ai-pay-button ai-unavailable" type="button" disabled>
                        {invoice.orderId ? "بيانات المبلغ غير مكتملة" : "لا يتوفر طلب مرتبط للدفع"}
                      </button>
                    )}
                    <button
                      className="ai-details-button"
                      type="button"
                      onClick={() => invoice.orderId && openPayment(invoice)}
                      disabled={!invoice.orderId}
                    >
                      <Eye size={16} /> عرض التفاصيل
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="ai-footer">
          <span>تحتاج مساعدة؟</span>
          <a href="mailto:support@alsouq-alshamel.com">تواصل معنا عبر الدعم</a>
        </footer>
      </main>
    </div>
  );
}


const INVOICE_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800;900&display=swap');
.ai-page{--ai-blue:#0f4c81;--ai-blue2:#1d70b7;--ai-ink:#12243a;--ai-muted:#62758b;--ai-line:#e0eaf4;--ai-bg:#eff6fc;--ai-green:#14884f;--ai-orange:#de8100;min-height:100dvh;background:linear-gradient(145deg,#edf6fd 0%,#f7fbff 70%);color:var(--ai-ink);font-family:'Tajawal',system-ui,sans-serif}
.ai-page *{box-sizing:border-box}
.ai-topbar{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.94);border-bottom:1px solid #e4edf6;box-shadow:0 4px 18px rgba(15,76,129,.06);backdrop-filter:blur(12px)}
.ai-topbar-inner{max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px}
.ai-brand{display:flex;align-items:center;gap:9px}.ai-brand-mark{width:39px;height:39px;display:grid;place-items:center;border-radius:12px;color:#fff;background:linear-gradient(145deg,var(--ai-blue),var(--ai-blue2));box-shadow:0 6px 14px rgba(15,76,129,.24)}
.ai-brand-copy{display:grid;line-height:1.2}.ai-brand-copy strong{font-size:14px;font-weight:900}.ai-brand-copy small{margin-top:3px;color:#bd963b;font-size:8px;font-weight:900;letter-spacing:.3px}
.ai-back{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1px solid #d8e7f5;border-radius:999px;background:#f3f8fd;color:var(--ai-blue);font:800 12px 'Tajawal',system-ui,sans-serif;cursor:pointer}.ai-back:hover{background:#e7f1fb}
.ai-main{width:min(100% - 28px,720px);margin:0 auto;padding:16px 0 28px}.ai-welcome{padding:2px 2px 0}.ai-welcome h1{margin:0;color:var(--ai-ink);font-size:clamp(20px,5vw,25px);line-height:1.4;font-weight:900}.ai-welcome h1 span{font-size:.88em}.ai-welcome p{margin:3px 0 0;color:var(--ai-muted);font-size:12px;font-weight:600}
.ai-alert{margin-top:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;color:#9f1239;font-size:12px;font-weight:700}.ai-alert button{display:inline-flex;align-items:center;gap:5px;flex:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.ai-summary{position:relative;overflow:hidden;margin-top:14px;padding:15px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;border-radius:19px;background:linear-gradient(115deg,#0e4c83,#267fc1);color:#fff;box-shadow:0 13px 26px rgba(15,76,129,.23)}.ai-summary:after{content:'';position:absolute;width:130px;height:130px;inset-inline-start:-42px;top:-66px;border-radius:50%;background:rgba(255,255,255,.08)}.ai-summary-info{position:relative;z-index:1;display:flex;align-items:center;gap:11px}.ai-summary-icon{width:43px;height:43px;display:grid;place-items:center;flex:none;border-radius:13px;background:rgba(255,255,255,.18)}.ai-summary-label{font-size:11px;font-weight:700;opacity:.94}.ai-summary-value{margin-top:1px;font-size:24px;line-height:1.3;font-weight:900}.ai-summary-caption{font-size:10px;font-weight:600;opacity:.86}.ai-summary-action{position:relative;z-index:1;max-width:190px;text-align:center}.ai-summary-note{font-size:10px;font-weight:700;opacity:.9}
.ai-section-heading{margin:21px 2px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}.ai-section-heading h2{margin:0;font-size:17px;font-weight:900}.ai-section-heading span{padding:5px 10px;border:1px solid #d7e6f5;border-radius:999px;background:#f4f9fe;color:var(--ai-blue);font-size:10px;font-weight:800}
.ai-list{display:flex;flex-direction:column;gap:13px}.ai-card{padding:14px;border:1px solid #e3ebf4;border-radius:19px;background:#fff;box-shadow:0 8px 22px rgba(15,76,129,.08);transition:transform .18s,box-shadow .18s}.ai-card:hover{transform:translateY(-2px);box-shadow:0 13px 28px rgba(15,76,129,.12)}.ai-card-heading{display:flex;align-items:center;gap:9px}.ai-card-icon{width:34px;height:34px;display:grid;place-items:center;flex:none;border-radius:11px;background:linear-gradient(145deg,var(--ai-blue),var(--ai-blue2));color:#fff;box-shadow:0 5px 12px rgba(15,76,129,.2)}.ai-card-title{min-width:0;display:flex;flex:1;align-items:flex-start;justify-content:space-between;gap:8px}.ai-card-title strong{overflow-wrap:anywhere;font-size:13px;font-weight:900}.ai-card-title time{padding-top:2px;flex:none;color:var(--ai-muted);font-size:10px;font-weight:600}
.ai-status{margin-top:12px}.ai-status-line{margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px}.ai-status-text{font-size:10px;font-weight:800;color:var(--ai-blue)}.ai-status-text.paid{color:var(--ai-green)}.ai-percent{font-size:10px;font-weight:900;color:var(--ai-blue)}.ai-progress{height:6px;overflow:hidden;border-radius:999px;background:#eaf0f6}.ai-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0f4c81,#247bc0);transition:width .35s}
.ai-amounts{margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:hidden;border:1px solid #e2eaf3;border-radius:12px}.ai-amount{min-width:0;padding:8px 5px;display:grid;justify-items:center;gap:3px;background:#fff;text-align:center}.ai-amount+.ai-amount{border-inline-start:1px solid #e9eff5}.ai-amount span{color:var(--ai-muted);font-size:9px;font-weight:700}.ai-amount strong{font-size:12px;font-weight:900;overflow-wrap:anywhere}.ai-amount.paid-amount strong{color:var(--ai-green)}.ai-amount.remaining-amount strong{color:var(--ai-orange)}
.ai-actions{margin-top:10px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.ai-pay-button,.ai-details-button{min-height:35px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:11px;font-family:inherit;font-size:10px;font-weight:900;cursor:pointer;transition:filter .18s,transform .18s}.ai-pay-button{padding:8px 10px;border:0;background:linear-gradient(110deg,#104e84,#247bc0);color:#fff;box-shadow:0 5px 11px rgba(15,76,129,.2)}.ai-pay-button:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px)}.ai-pay-button.ai-complete{background:#e6f7ee;color:var(--ai-green);box-shadow:none;cursor:default}.ai-pay-button.ai-unavailable{background:#f1f5f9;color:#64748b;box-shadow:none;cursor:not-allowed}.ai-details-button{padding:8px 11px;border:1px solid #d6e6f5;background:#fff;color:var(--ai-blue)}.ai-details-button:hover:not(:disabled){background:#f2f8fd}.ai-details-button:disabled{opacity:.55;cursor:not-allowed}
.ai-state,.ai-empty{min-height:150px;padding:30px 18px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;border:1px solid #e2eaf3;border-radius:18px;background:rgba(255,255,255,.82);color:var(--ai-muted);text-align:center;font-size:13px;font-weight:700}.ai-spin{animation:ai-spin 1s linear infinite}@keyframes ai-spin{to{transform:rotate(360deg)}}.ai-empty strong{color:var(--ai-ink);font-size:14px}.ai-empty p{margin:0;font-size:11px}.ai-empty-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:#eaf3fb;color:var(--ai-blue)}
.ai-footer{margin-top:22px;display:flex;align-items:center;justify-content:center;gap:5px;color:var(--ai-muted);font-size:10px;font-weight:700}.ai-footer a{color:var(--ai-blue);font-weight:900;text-decoration:none}.ai-footer a:hover{text-decoration:underline}
@media(max-width:480px){.ai-main{width:min(100% - 22px,720px);padding-top:13px}.ai-topbar-inner{padding-inline:12px}.ai-summary{padding:13px}.ai-summary-action{max-width:120px}.ai-summary-value{font-size:21px}.ai-card{padding:12px}.ai-amount strong{font-size:11px}.ai-actions{grid-template-columns:minmax(0,1fr) auto}.ai-pay-button,.ai-details-button{font-size:9px;padding-inline:8px}}
@media(prefers-reduced-motion:reduce){.ai-page *{scroll-behavior:auto!important;transition:none!important}.ai-spin{animation:none}}
`;
