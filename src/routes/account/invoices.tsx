import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Receipt, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

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

  return (
    <AccountShell title="فواتيري">
      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border">
        {loading ? (
          <p role="status" className="py-8 text-center text-sm">
            جارٍ تحميل فواتيرك…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadInvoices()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold"
            >
              <RefreshCw className="size-4" /> إعادة المحاولة
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="لا توجد فواتير مرتبطة بحسابك"
            text="لم نعثر على طلب أو فاتورة مرتبطة بمعرّفك أو رقم هاتفك أو بريدك المسجل."
          />
        ) : (
          invoices.map((invoice) => (
            <article key={invoice.key} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-cocoadeep">فاتورة {invoice.invoiceNumber}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {invoice.createdAt
                      ? new Date(invoice.createdAt).toLocaleDateString("ar")
                      : "التاريخ غير متوفر"}
                  </p>
                </div>
                <Receipt className="size-5 text-clay" />
              </div>
              <p className="mt-3 text-sm">العميل: {invoice.client || "غير محدد"}</p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <p>
                  الإجمالي: <strong>{money(invoice.totalYer)}</strong>
                </p>
                <p>
                  المدفوع: <strong>{money(invoice.paidYer)}</strong>
                </p>
                <p>
                  المتبقي: <strong>{money(invoice.remainingYer)}</strong>
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </AccountShell>
  );
}
