import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type OrderAlert = {
  key: string;
  code: string;
  name: string;
  phone: string;
  reason: string;
  tone: "red" | "amber";
};

type PendingPayment = {
  id: string;
  tracking_code: string;
  customer_name: string | null;
  phone: string | null;
  wallet: string;
  receipt_image: string | null;
  created_at: string;
};

const DONE = /تم التسليم|ملغي|مكتمل/;

export function AdminAlerts() {
  const [orders, setOrders] = useState<OrderAlert[]>([]);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentLoadError, setPaymentLoadError] = useState("");

  const load = useCallback(async () => {
    const [{ data: orderRows }, { data: paymentRows, error: paymentError }] =
      await Promise.all([
        supabase
          .from("orders")
          .select("tracking_code,customer_name,phone,status,updated_at,created_at")
          .order("updated_at", { ascending: true })
          .limit(200),

        supabase
          .from("payments")
          .select(
            "id,tracking_code,customer_name,phone,wallet,receipt_image,created_at",
          )
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (paymentError) {
      console.error("تعذّر تحميل تنبيهات الدفع:", paymentError);
      setPaymentLoadError("تعذّر تحميل طلبات الدفع. تحقق من صلاحية حساب الإدارة.");
      setPayments([]);
    } else {
      setPaymentLoadError("");
      setPayments((paymentRows ?? []) as PendingPayment[]);
    }

    const now = Date.now();
    const orderAlerts: OrderAlert[] = [];

    (orderRows ?? []).forEach((order) => {
      if (DONE.test(order.status ?? "")) return;

      const updatedAt = order.updated_at ?? order.created_at;
      if (!updatedAt) return;

      const hoursSinceUpdate = (now - new Date(updatedAt).getTime()) / 36e5;
      if (!Number.isFinite(hoursSinceUpdate)) return;

      const alertBase = {
        key: order.tracking_code ?? `order-${updatedAt}`,
        code: order.tracking_code ?? "",
        name: order.customer_name ?? "",
        phone: order.phone ?? "",
      };

      if (hoursSinceUpdate >= 72) {
        orderAlerts.push({
          ...alertBase,
          reason: `متأخر — بدون تحديث منذ ${Math.floor(hoursSinceUpdate / 24)} يوم`,
          tone: "red",
        });
      } else if (hoursSinceUpdate >= 24) {
        orderAlerts.push({
          ...alertBase,
          reason: `يحتاج متابعة — منذ ${Math.floor(hoursSinceUpdate)} ساعة`,
          tone: "amber",
        });
      }
    });

    setOrders(orderAlerts);
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("admin_payment_order_alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (
    payments.length === 0 &&
    orders.length === 0 &&
    !paymentLoadError
  ) {
    return null;
  }

  return (
    <>
      <section
        dir="rtl"
        className="mb-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
        aria-labelledby="admin-alerts-title"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3
            id="admin-alerts-title"
            className="font-black text-sm text-[#0A2540]"
          >
            تنبيهات لوحة الإدارة ({payments.length + orders.length})
          </h3>

          <Link
            to="/payments"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            مراجعة طلبات الدفع
            {payments.length > 0 ? ` (${payments.length})` : ""}
          </Link>
        </div>

        {paymentLoadError && (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
          >
            {paymentLoadError}
          </p>
        )}

        {payments.length > 0 && (
          <div className="mb-4 space-y-2">
            <h4 className="text-xs font-black text-emerald-800">
              طلبات دفع جديدة بانتظار المراجعة
            </h4>

            {payments.map((payment) => (
              <article
                key={payment.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 text-xs text-slate-700">
                  <div className="font-black text-[#0A2540]">
                    {payment.customer_name || "عميل"}
                  </div>

                  <div className="mt-1">
                    وسيلة الدفع:{" "}
                    <b>{payment.wallet || "غير محددة"}</b>
                    {" • "}
                    الطلب:{" "}
                    <b dir="ltr">{payment.tracking_code || "غير متوفر"}</b>
                  </div>

                  {payment.phone && (
                    <div className="mt-1" dir="ltr">
                      {payment.phone}
                    </div>
                  )}

                  <div className="mt-1 text-[11px] text-slate-500">
                    {payment.created_at
                      ? new Date(payment.created_at).toLocaleString("ar")
                      : ""}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {payment.receipt_image ? (
                    <button
                      type="button"
                      onClick={() => setReceiptPreview(payment.receipt_image)}
                      className="rounded-lg bg-[#0F4C81] px-3 py-2 text-xs font-bold text-white hover:bg-[#0A2540]"
                      aria-label={`عرض سند الدفع للطلب ${payment.tracking_code}`}
                    >
                      عرض السند
                    </button>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                      لا يوجد سند مرفق
                    </span>
                  )}

                  <Link
                    to="/payments"
                    className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    فتح صفحة الدفع
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {orders.length > 0 && (
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((alert) => (
              <article
                key={alert.key}
                className={`rounded-xl border p-3 text-xs ${
                  alert.tone === "red"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="font-black">{alert.reason}</div>

                <div className="mt-1 font-bold text-slate-700">
                  {alert.name || "عميل"}
                  {alert.phone && (
                    <>
                      {" • "}
                      <span dir="ltr">{alert.phone}</span>
                    </>
                  )}
                </div>

                <Link
                  to="/track/$trackingCode"
                  params={{ trackingCode: alert.code }}
                  className="mt-2 inline-flex rounded-lg bg-[#0F4C81] px-2 py-1 font-bold text-white"
                >
                  فتح الطلب {alert.code}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {receiptPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معاينة سند الدفع"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setReceiptPreview(null)}
        >
          <div className="relative max-h-[90vh] max-w-full rounded-2xl bg-white p-3">
            <button
              type="button"
              onClick={() => setReceiptPreview(null)}
              className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full bg-red-600 font-black text-white shadow"
              aria-label="إغلاق معاينة السند"
            >
              ×
            </button>

            <img
              src={receiptPreview}
              alt="سند تحويل العميل"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
