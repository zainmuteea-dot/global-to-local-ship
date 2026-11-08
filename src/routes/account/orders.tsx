import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
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

const TRACKING_STAGES = [
  "استلام الطلب والاعتماد",
  "الشراء من المتجر الدولي",
  "وصول المستودع الدولي",
  "الشحن الدولي (جوي / بحري)",
  "الوصول لليمن والفرز المحلي",
  "خروج الشحنة مع المندوب للتوصيل",
  "تم التوصيل",
] as const;

function getCurrentStage(status: string | null): number {
  const normalized = (status ?? "").trim().toLowerCase();
  const stageByStatus: Record<string, number> = {
    new: 1,
    reviewing: 1,
    accepted: 1,
    approved: 1,
    pricing: 1,
    priced_waiting_pay: 1,
    purchased: 2,
    processing: 2,
    warehouse_china: 3,
    intl_warehouse: 3,
    international_warehouse: 3,
    warehouse: 3,
    international_ship: 4,
    international_transit: 4,
    shipping: 4,
    shipped: 4,
    arrived_yemen: 5,
    yemen_sorting: 5,
    local_warehouse: 5,
    customs_local: 5,
    sorting: 5,
    out_for_delivery: 6,
    with_courier: 6,
    delivered: 7,
    completed: 7,
    تم_التسليم: 7,
  };
  return stageByStatus[normalized] ?? 1;
}

function formatOrderDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ar");
}

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
        .select(
          "id,tracking_code,status,product_name,product_link,created_at,sms_status,sms_error,sms_attempt_count,sms_last_attempt_at,sms_accepted_at,sms_provider_batch_id,sms_provider_response",
        )
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
        body: {
          orderId,
          retry: orders.find((item) => item.id === orderId)?.sms_status === "failed",
        },
      });
      if (invokeError) throw new Error(invokeError.message || "تعذر الاتصال بخدمة الرسائل.");
      if (data?.accepted !== true)
        throw new Error(data?.error || "لم يؤكد مزود الخدمة قبول الرسالة.");
      setRetryMessage("قبل مزود الخدمة إعادة المحاولة. هذا لا يؤكد وصول الرسالة إلى الهاتف.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      setRetryMessage(error instanceof Error ? error.message : "تعذر إعادة المحاولة.");
      // Refresh persisted state because the server may have claimed an attempt before the response was lost.
      setReloadKey((value) => value + 1);
    } finally {
      setRetryingId(null);
    }
  };

  const smsLabel = (state: string | null) =>
    (
      ({
        pending: "بانتظار الإرسال",
        sending: "جارٍ الإرسال",
        accepted: "قبله مزود الخدمة (ليس تأكيد وصول)",
        failed: "فشل مؤكد",
        unknown: "النتيجة غير مؤكدة؛ لا تعِد الإرسال",
        delivered: "وصلت حسب تقرير الشبكة",
      }) as Record<string, string>
    )[state || ""] || "لم تُسجل حالة SMS";

  return (
    <AccountShell title="طلباتي" wide>
      <div className="orders-tracker" dir="rtl">
        <style>{`
          .orders-tracker {
            --ot-primary: #0f4c81;
            --ot-primary-light: #1c6fb8;
            --ot-ink: #15233b;
            --ot-muted: #64748b;
            --ot-line: #e3edf7;
            --ot-green: #12a150;
            --ot-orange: #f97316;
            color: var(--ot-ink);
            font-family: "Tajawal", "Cairo", var(--font-body), sans-serif;
          }
          .orders-tracker * { box-sizing: border-box; }
          .ot-intro { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin:0 0 16px; }
          .ot-intro h2 { margin:0; font-size:clamp(20px,4vw,26px); line-height:1.35; font-weight:900; }
          .ot-intro p { margin:4px 0 0; color:var(--ot-muted); font-size:13px; font-weight:600; }
          .ot-top-actions { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
          .ot-count { padding:8px 13px; color:var(--ot-primary); background:#eaf2fb; border:1px solid #d7e6f5; border-radius:999px; font-size:12px; font-weight:800; }
          .ot-new { display:inline-flex; align-items:center; justify-content:center; gap:7px; border:0; border-radius:12px; padding:10px 15px; color:white; background:linear-gradient(135deg,var(--ot-primary),var(--ot-primary-light)); text-decoration:none; font-size:13px; font-weight:900; box-shadow:0 7px 16px #0f4c8128; }
          .ot-feedback { margin:0 0 13px; padding:11px 14px; border-radius:12px; background:#eaf2fb; color:var(--ot-primary); font-size:12px; font-weight:800; }
          .ot-error { border:1px solid #fecaca; background:#fff1f2; color:#991b1b; }
          .ot-retry-load { display:inline-flex; align-items:center; gap:7px; margin-top:9px; padding:8px 12px; border:1px solid #fecaca; border-radius:10px; background:white; color:#991b1b; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
          .ot-loading { padding:42px 14px; text-align:center; color:var(--ot-muted); font-size:14px; font-weight:800; }
          .ot-loading-icon { display:inline-block; vertical-align:middle; margin-left:7px; animation:ot-spin 1s linear infinite; }
          @keyframes ot-spin { to { transform:rotate(360deg); } }
          .ot-list { display:flex; flex-direction:column; gap:16px; }
          .ot-card { min-width:0; padding:17px; border:1px solid var(--ot-line); border-radius:20px; background:white; box-shadow:0 10px 26px #0f4c810e; }
          .ot-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
          .ot-order-info { display:flex; align-items:center; gap:11px; min-width:0; }
          .ot-package { display:grid; flex:none; place-items:center; width:43px; height:43px; border-radius:13px; color:white; background:linear-gradient(135deg,var(--ot-primary),var(--ot-primary-light)); box-shadow:0 6px 15px #0f4c8130; }
          .ot-order-number { color:var(--ot-ink); font-family:inherit; font-size:16px; font-weight:900; }
          .ot-order-meta { margin-top:3px; color:var(--ot-muted); font-size:11px; font-weight:700; overflow-wrap:anywhere; }
          .ot-head-status { display:flex; flex:none; flex-direction:column; align-items:flex-end; gap:5px; }
          .ot-status { padding:5px 10px; border-radius:999px; background:#eaf2fb; color:var(--ot-primary); font-size:10px; font-weight:900; }
          .ot-stage-counter { color:var(--ot-orange); font-size:11px; font-weight:900; }
          .ot-now { display:flex; align-items:center; gap:10px; margin:14px 0 15px; padding:10px 12px; border:1px solid #f8d9be; border-radius:13px; background:#fff1e6; }
          .ot-pin { display:grid; flex:none; place-items:center; width:35px; height:35px; border-radius:11px; color:white; background:var(--ot-orange); }
          .ot-current-label { color:var(--ot-orange); font-size:10px; font-weight:900; }
          .ot-current-stage { margin-top:2px; font-size:13px; font-weight:900; line-height:1.5; }
          .ot-steps { display:flex; align-items:flex-start; margin:10px 0 4px; }
          .ot-step { position:relative; display:flex; flex:1 1 0; min-width:0; flex-direction:column; align-items:center; text-align:center; }
          .ot-step:not(:first-child)::before { position:absolute; z-index:0; top:16px; right:50%; width:100%; height:3px; border-radius:3px; background:#cbd5e1; content:""; }
          .ot-step.is-done:not(:first-child)::before { background:var(--ot-green); }
          .ot-step.is-current:not(:first-child)::before { background:linear-gradient(90deg,var(--ot-orange),var(--ot-green)); }
          .ot-node { position:relative; z-index:1; display:grid; place-items:center; width:34px; height:34px; border:2px solid #edf2f8; border-radius:50%; background:#edf2f8; color:var(--ot-muted); font-size:11px; font-weight:900; }
          .ot-step.is-done .ot-node { border-color:var(--ot-green); background:var(--ot-green); color:white; }
          .ot-step.is-current .ot-node { border:2px solid var(--ot-orange); background:white; box-shadow:0 0 0 4px #f9731620; }
          .ot-current-dot { width:11px; height:11px; border-radius:50%; background:var(--ot-orange); }
          .ot-step-label { max-width:100%; margin-top:7px; padding:0 3px; color:var(--ot-muted); font-size:9px; font-weight:800; line-height:1.4; overflow-wrap:anywhere; }
          .ot-step.is-done .ot-step-label { color:var(--ot-ink); }
          .ot-step.is-current .ot-step-label { color:var(--ot-orange); }
          .ot-track-link { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; margin-top:13px; padding:11px 14px; border-radius:11px; color:white; background:linear-gradient(135deg,var(--ot-primary),var(--ot-primary-light)); text-decoration:none; font-size:12px; font-weight:900; box-shadow:0 7px 16px #0f4c8129; }
          .ot-no-track { margin-top:12px; color:var(--ot-muted); text-align:center; font-size:11px; }
          .ot-sms { margin-top:12px; padding:11px 12px; border:1px solid var(--ot-line); border-radius:12px; background:#f8fafc; }
          .ot-sms-title { display:flex; align-items:flex-start; gap:7px; color:var(--ot-ink); font-size:11px; font-weight:800; line-height:1.6; }
          .ot-sms-detail { margin-top:4px; color:var(--ot-muted); font-size:10px; line-height:1.7; overflow-wrap:anywhere; }
          .ot-sms-error { color:#b91c1c; }
          .ot-sms-warning { margin-top:7px; color:#92400e; font-size:10px; font-weight:800; line-height:1.6; }
          .ot-sms-button { display:inline-flex; align-items:center; gap:6px; margin-top:8px; padding:8px 10px; border:0; border-radius:9px; color:white; background:var(--ot-primary); font:inherit; font-size:10px; font-weight:900; cursor:pointer; }
          .ot-sms-button:disabled { opacity:.55; cursor:wait; }
          .ot-empty { padding:18px; border:1px dashed var(--ot-line); border-radius:16px; background:white; }
          .ot-footer { margin:17px 0 4px; text-align:center; color:var(--ot-muted); font-size:11px; font-weight:700; }
          @media (max-width:640px) {
            .ot-card { padding:13px; border-radius:16px; }
            .ot-head { gap:8px; }
            .ot-order-number { font-size:14px; }
            .ot-order-meta { font-size:10px; }
            .ot-package { width:39px; height:39px; }
            .ot-steps { flex-direction:column; align-items:stretch; margin:7px 0 0; }
            .ot-step { display:flex; flex-direction:row; align-items:flex-start; gap:11px; min-height:44px; text-align:right; }
            .ot-step:not(:first-child)::before { top:-9px; right:16px; width:3px; height:18px; }
            .ot-step.is-done:not(:first-child)::before { background:var(--ot-green); }
            .ot-step.is-current:not(:first-child)::before { background:var(--ot-green); }
            .ot-step:first-child::before { display:none; }
            .ot-node { flex:none; width:33px; height:33px; }
            .ot-step-label { margin:7px 0 0; padding:0; font-size:12px; }
            .ot-current-dot { width:10px; height:10px; }
            .ot-now { margin-top:12px; }
          }
          @media (prefers-reduced-motion:reduce) {
            .orders-tracker *, .orders-tracker *::before { scroll-behavior:auto !important; animation-duration:.01ms !important; animation-iteration-count:1 !important; }
          }
        `}</style>

        <div className="ot-intro">
          <div>
            <h2>أهلًا بك{user?.user_metadata?.full_name ? ` يا ${String(user.user_metadata.full_name).trim().split(/\s+/)[0]}` : ""} 👋</h2>
            <p>تابع حالة طلباتك خطوة بخطوة حتى تصل إليك</p>
          </div>
          <div className="ot-top-actions">
            <span className="ot-count">لديك {orders.length} طلبات نشطة</span>
            <Link to="/new-order" className="ot-new">
              <Plus size={16} /> طلب جديد
            </Link>
          </div>
        </div>

        {retryMessage && <p role="status" className="ot-feedback">{retryMessage}</p>}

        {loading ? (
          <div role="status" className="ot-loading">
            <LoaderCircle className="ot-loading-icon" size={19} /> جارٍ تحميل طلباتك…
          </div>
        ) : error ? (
          <div role="alert" className="ot-feedback ot-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="ot-retry-load"
            >
              <RefreshCw size={15} /> إعادة المحاولة
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="ot-empty">
            <EmptyState
              icon={<Package className="size-6" />}
              title="لا توجد طلبات بعد"
              text="الطلبات التي ترسلها وأنت مسجّل دخول تظهر هنا."
            />
          </div>
        ) : (
          <section className="ot-list" aria-label="قائمة طلباتي">
            {orders.map((order) => {
              const currentStage = getCurrentStage(order.status);
              const status = order.status ?? "";
              return (
                <article key={order.id} className="ot-card">
                  <header className="ot-head">
                    <div className="ot-order-info">
                      <span className="ot-package"><Package size={21} /></span>
                      <div className="min-w-0">
                        <div className="ot-order-number" dir="ltr">
                          {order.tracking_code || "طلب بدون رمز تتبع"}
                        </div>
                        <div className="ot-order-meta">
                          {order.product_name || order.product_link || "طلب تسوق"}
                          {order.created_at ? ` · ${formatOrderDate(order.created_at)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="ot-head-status">
                      <span className="ot-status">{statusLabels[status] || status || "غير محدد"}</span>
                      <span className="ot-stage-counter">المرحلة {currentStage} من {TRACKING_STAGES.length}</span>
                    </div>
                  </header>

                  <div className="ot-now">
                    <span className="ot-pin"><MapPin size={18} /></span>
                    <div>
                      <div className="ot-current-label">المرحلة الحالية</div>
                      <div className="ot-current-stage">{TRACKING_STAGES[currentStage - 1]}</div>
                    </div>
                  </div>

                  <div className="ot-steps" aria-label={`المرحلة ${currentStage} من سبع مراحل`}>
                    {TRACKING_STAGES.map((stage, index) => {
                      const stageNumber = index + 1;
                      const isDone = stageNumber < currentStage;
                      const isCurrent = stageNumber === currentStage;
                      return (
                        <div
                          key={stage}
                          className={`ot-step${isDone ? " is-done" : ""}${isCurrent ? " is-current" : ""}`}
                        >
                          <span className="ot-node">
                            {isDone ? <Check size={16} strokeWidth={3} /> : isCurrent ? <span className="ot-current-dot" /> : stageNumber}
                          </span>
                          <span className="ot-step-label">{stage}</span>
                        </div>
                      );
                    })}
                  </div>

                  {order.tracking_code ? (
                    <Link
                      to="/track/$trackingCode"
                      params={{ trackingCode: order.tracking_code }}
                      className="ot-track-link"
                    >
                      <Search size={16} /> تتبع الطلب
                    </Link>
                  ) : (
                    <p className="ot-no-track">لا يتوفر رمز تتبع لهذا الطلب حتى الآن.</p>
                  )}

                  <div className="ot-sms">
                    <div className="ot-sms-title">
                      {order.sms_status === "accepted" || order.sms_status === "delivered" ? (
                        <CheckCircle2 className="text-emerald-600" size={16} />
                      ) : order.sms_status === "failed" ? (
                        <AlertCircle className="text-red-600" size={16} />
                      ) : order.sms_status === "sending" ? (
                        <LoaderCircle className="animate-spin text-blue-600" size={16} />
                      ) : (
                        <Clock3 className="text-amber-600" size={16} />
                      )}
                      <span>رسالة SMS: {smsLabel(order.sms_status)}</span>
                    </div>
                    {order.sms_attempt_count ? (
                      <p className="ot-sms-detail">عدد المحاولات: {order.sms_attempt_count}</p>
                    ) : null}
                    {order.sms_last_attempt_at ? (
                      <p className="ot-sms-detail">
                        آخر محاولة: {new Date(order.sms_last_attempt_at).toLocaleString("ar")}
                      </p>
                    ) : null}
                    {order.sms_error && order.sms_status === "failed" ? (
                      <p className="ot-sms-detail ot-sms-error">{order.sms_error}</p>
                    ) : null}
                    {order.sms_provider_batch_id ? (
                      <p className="ot-sms-detail" dir="ltr">
                        TextBee batch: {order.sms_provider_batch_id}
                      </p>
                    ) : null}
                    {(order.sms_status === "failed" || order.sms_status === "pending") && (
                      <button
                        type="button"
                        disabled={retryingId === order.id}
                        onClick={() => void retrySms(order.id)}
                        className="ot-sms-button"
                      >
                        <RefreshCw
                          size={14}
                          className={retryingId === order.id ? "animate-spin" : ""}
                        />
                        {retryingId === order.id
                          ? "جارٍ المحاولة…"
                          : order.sms_status === "pending"
                            ? "إرسال SMS"
                            : "إعادة محاولة SMS"}
                      </button>
                    )}
                    {(order.sms_status === "unknown" || order.sms_status === "sending") && (
                      <p className="ot-sms-warning">
                        لا تستخدم زر إعادة الإرسال هنا: افحص حالة الدفعة في TextBee أولًا لتجنب تكرار الرسالة.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <p className="ot-footer">تحتاج مساعدة؟ تواصل معنا عبر الدعم</p>
      </div>
    </AccountShell>
  );
}
