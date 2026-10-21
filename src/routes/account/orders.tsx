import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Clock3, LoaderCircle, Package, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/orders")({
  head: () => ({
    meta: [
      { title: "طلباتي — السوق الشامل" },
      {
        name: "description",
        content: "كل طلباتك وحالتها في السوق الشامل.",
      },
    ],
  }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  tracking_code: string | null;
  status: string | null;
  product_name: string | null;
  product_link: string | null;
  created_at: string | null;
  sms_status: string | null;
  sms_error: string | null;
  sms_attempt_count: number | null;
  sms_last_attempt_at: string | null;
  sms_accepted_at: string | null;
  sms_provider_batch_id: string | null;
  sms_provider_response: unknown;
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  purchased: "تم الشراء",
  warehouse_china: "مستودع الصين",
  international_ship: "شحن دولي",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function OrdersPage() {
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState("");

  useEffect(() => {
    if (sessionLoading) return;

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const userId = user.id;
    let isActive = true;

    async function loadOrders() {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("orders")
        .select("id,tracking_code,status,product_name,product_link,created_at,sms_status,sms_error,sms_attempt_count,sms_last_attempt_at,sms_accepted_at,sms_provider_batch_id,sms_provider_response")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isActive) return;

      if (queryError) {
        setOrders([]);
        setError(`تعذر تحميل الطلبات: ${queryError.message}`);
      } else {
        setOrders((data ?? []) as OrderRow[]);
      }

      setLoading(false);
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, [user, sessionLoading, reloadKey]);

  const retrySms = async (orderId: string) => {
    if (retryingId) return;
    setRetryingId(orderId);
    setRetryMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("send-sms", {
        body: { orderId, retry: orders.find((item) => item.id === orderId)?.sms_status === "failed" },
      });
      if (invokeError) throw new Error(invokeError.message || "تعذر الاتصال بخدمة الرسائل.");
      if (data?.accepted !== true) throw new Error(data?.error || "لم يؤكد مزود الخدمة قبول الرسالة.");
      setRetryMessage("قبل مزود الخدمة إعادة المحاولة. هذا لا يؤكد وصول الرسالة إلى الهاتف.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      setRetryMessage(error instanceof Error ? error.message : "تعذر إعادة المحاولة.");
      // Refresh persisted state, because the server may have claimed an attempt before the response was lost.
      setReloadKey((value) => value + 1);
    } finally {
      setRetryingId(null);
    }
  };

  const smsLabel = (state: string | null) => ({
    pending: "بانتظار الإرسال", sending: "جارٍ الإرسال", accepted: "قبله مزود الخدمة (ليس تأكيد وصول)",
    failed: "فشل مؤكد", unknown: "النتيجة غير مؤكدة؛ لا تعِد الإرسال", delivered: "وصلت حسب تقرير الشبكة",
  } as Record<string, string>)[state || ""] || "لم تُسجل حالة SMS";

  return (
    <AccountShell title="طلباتي">
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display font-black text-cocoadeep">{orders.length} طلب</p>

          <Link
            to="/new-order"
            className="flex items-center gap-1 rounded-xl bg-cocoa px-3 py-2 text-xs font-bold text-cream"
          >
            <Plus className="size-4" />
            طلب جديد
          </Link>
        </div>

        {retryMessage && <p role="status" className="mb-3 rounded-xl bg-secondary p-3 text-xs font-bold text-cocoadeep">{retryMessage}</p>}

        {loading ? (
          <div role="status" className="py-8 text-center text-sm text-muted-foreground">
            جارٍ تحميل طلباتك…
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold ring-1 ring-red-200"
            >
              <RefreshCw className="size-4" />
              إعادة المحاولة
            </button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="size-6" />}
            title="لا توجد طلبات بعد"
            text="الطلبات التي ترسلها وأنت مسجّل دخول تظهر هنا."
          />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const status = order.status ?? "";
              const content = (
                <>
                  <Package className="size-5 shrink-0 text-clay" />
                  <div className="min-w-0 flex-1">
                    <p dir="ltr" className="text-right font-display text-sm font-black text-cocoadeep">
                      {order.tracking_code || "طلب بدون رمز تتبع"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {order.product_name || order.product_link || "طلب تسوق"}
                    </p>
                    {order.created_at && <p className="mt-1 text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar")}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-clay">
                    {statusLabels[status] || status || "غير محدد"}
                  </span>
                  {order.tracking_code && <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />}
                </>
              );
              return (
                <article key={order.id} className="space-y-2 rounded-2xl bg-background p-3 ring-1 ring-border">
                  {order.tracking_code ? (
                    <Link to="/track/$trackingCode" params={{ trackingCode: order.tracking_code }}
                      className="flex items-center gap-3 rounded-xl p-1">
                      {content}
                    </Link>
                  ) : <div className="flex items-center gap-3 p-1">{content}</div>}
                  <div className="rounded-xl bg-white p-3 text-right ring-1 ring-border">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-cocoadeep">
                      {order.sms_status === "accepted" || order.sms_status === "delivered" ? <CheckCircle2 className="size-4 text-emerald-600" /> :
                       order.sms_status === "failed" ? <AlertCircle className="size-4 text-red-600" /> :
                       order.sms_status === "sending" ? <LoaderCircle className="size-4 animate-spin text-blue-600" /> :
                       <Clock3 className="size-4 text-amber-600" />}
                      <span>رسالة SMS: {smsLabel(order.sms_status)}</span>
                    </div>
                    {order.sms_attempt_count ? <p className="mt-1 text-[10px] text-muted-foreground">عدد المحاولات: {order.sms_attempt_count}</p> : null}
                    {order.sms_last_attempt_at ? <p className="mt-1 text-[10px] text-muted-foreground">آخر محاولة: {new Date(order.sms_last_attempt_at).toLocaleString("ar")}</p> : null}
                    {order.sms_error && order.sms_status === "failed" ? <p className="mt-1 text-[10px] text-red-700">{order.sms_error}</p> : null}
                    {order.sms_provider_batch_id ? <p className="mt-1 break-all text-[10px] text-muted-foreground" dir="ltr">TextBee batch: {order.sms_provider_batch_id}</p> : null}
                    {(order.sms_status === "failed" || order.sms_status === "pending") && (
                      <button type="button" disabled={retryingId === order.id} onClick={() => void retrySms(order.id)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-cocoa px-3 py-2 text-xs font-bold text-cream disabled:opacity-50">
                        <RefreshCw className={`size-3.5 ${retryingId === order.id ? "animate-spin" : ""}`} />
                        {retryingId === order.id ? "جارٍ المحاولة…" : order.sms_status === "pending" ? "إرسال SMS" : "إعادة محاولة SMS"}
                      </button>
                    )}
                    {(order.sms_status === "unknown" || order.sms_status === "sending") &&
                      <p className="mt-2 text-[10px] font-bold text-amber-800">لا تستخدم زر إعادة الإرسال هنا: افحص حالة الدفعة في TextBee أولًا لتجنب تكرار الرسالة.</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AccountShell>
  );
}
