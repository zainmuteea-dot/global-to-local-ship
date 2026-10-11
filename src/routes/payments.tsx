import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Payment = {
  id: string;
  amount: number;
  created_at: string;
  currency: string;
  customer_name: string | null;
  phone: string | null;
  receipt_image: string | null;
  reviewed_at: string | null;
  status: string;
  tracking_code: string;
  updated_at: string;
  user_id: string | null;
  wallet: string;
};

type PaymentFilter = "pending" | "approved" | "rejected" | "all";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع والمحاسبة — السوق الشامل" },
      {
        name: "description",
        content: "مراجعة دفعات العملاء واعتمادها أو رفضها.",
      },
      { property: "og:title", content: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (value: number) =>
  Math.round(Number(value || 0)).toLocaleString("en-US");

const PENDING_STATUSES = ["pending", "بانتظار التأكيد"];

const STATUS: Record<string, { label: string; classes: string }> = {
  pending: {
    label: "بانتظار المراجعة",
    classes: "bg-amber-100 text-amber-800",
  },
  "بانتظار التأكيد": {
    label: "بانتظار التأكيد",
    classes: "bg-amber-100 text-amber-800",
  },
  approved: {
    label: "معتمد ✓",
    classes: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "مرفوض",
    classes: "bg-red-100 text-red-700",
  },
};

function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error(`تعذر التحقق من جلسة الدخول: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("سجّل الدخول بحساب الإدارة ثم أعد تحميل الصفحة.");
      }

      const [adminRole, staffRole] = await Promise.all([
        supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        }),
        supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "staff",
        }),
      ]);

      if (adminRole.error || staffRole.error) {
        throw new Error(
          `تعذر فحص دور الحساب: ${
            (adminRole.error ?? staffRole.error)?.message ??
            "خطأ غير معروف"
          }`,
        );
      }

      if (!adminRole.data && !staffRole.data) {
        throw new Error("الحساب لا يحمل دور admin أو staff.");
      }

      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,amount,created_at,currency,customer_name,phone,receipt_image,reviewed_at,status,tracking_code,updated_at,user_id,wallet",
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(
          `تعذر تحميل طلبات الدفع: ${error.message}${
            error.code ? ` (${error.code})` : ""
          }`,
        );
      }

      setRows((data ?? []) as Payment[]);
    } catch (cause) {
      console.error("تعذر تحميل طلبات الدفع:", cause);
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر تحميل طلبات الدفع.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("payments_live_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const approve = async (payment: Payment) => {
    setErr("");
    setNotice("");

    const amount = Number(payment.amount);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setErr(
        `لا يمكن اعتماد الطلب ${payment.tracking_code}: المبلغ يجب أن يكون عددًا صحيحًا أكبر من صفر.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `اعتماد مبلغ ${fmt(amount)} ${payment.currency || "ر.ي"} للطلب ${
        payment.tracking_code
      }؟`,
    );

    if (!confirmed) return;

    setBusy(payment.id);

    try {
      const { data, error } = await supabase
        .from("payments")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .in("status", PENDING_STATUSES)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(`تعذر اعتماد الدفعة: ${error.message}`);
      }

      if (!data) {
        throw new Error(
          "لم يتغير الطلب. ربما تمت مراجعته مسبقًا؛ أعد تحميل البيانات.",
        );
      }

      let notificationWarning = "";

      if (payment.user_id) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: payment.user_id,
            title: `تم اعتماد دفعتك للطلب ${payment.tracking_code}`,
            body: `تم اعتماد مبلغ ${fmt(amount)} ${
              payment.currency || "ر.ي"
            }.`,
          });

        if (notificationError) {
          console.error(
            "تم اعتماد الدفعة لكن تعذر إنشاء الإشعار:",
            notificationError,
          );
          notificationWarning =
            " تم اعتماد الدفعة، لكن تعذر إنشاء إشعار العميل.";
        }
      }

      setNotice(
        `تم اعتماد مبلغ ${fmt(amount)} للطلب ${payment.tracking_code}.${notificationWarning}`,
      );

      await load();
    } catch (cause) {
      console.error("تعذر اعتماد الدفعة:", cause);
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر اعتماد الدفعة.",
      );
    } finally {
      setBusy(null);
    }
  };

  const reject = async (payment: Payment) => {
    const confirmed = window.confirm(
      `هل تريد رفض سند الدفع للطلب ${payment.tracking_code}؟`,
    );

    if (!confirmed) return;

    setErr("");
    setNotice("");
    setBusy(payment.id);

    try {
      const { data, error } = await supabase
        .from("payments")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .in("status", PENDING_STATUSES)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(`تعذر رفض الدفعة: ${error.message}`);
      }

      if (!data) {
        throw new Error(
          "لم يتغير الطلب. ربما تمت مراجعته مسبقًا؛ أعد تحميل البيانات.",
        );
      }

      let notificationWarning = "";

      if (payment.user_id) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: payment.user_id,
            title: `لم يتم قبول سند الدفع للطلب ${payment.tracking_code}`,
            body: "يرجى مراجعة السند أو التواصل مع خدمة العملاء.",
          });

        if (notificationError) {
          console.error(
            "تم رفض الدفعة لكن تعذر إنشاء الإشعار:",
            notificationError,
          );
          notificationWarning =
            " تم رفض الدفعة، لكن تعذر إنشاء إشعار العميل.";
        }
      }

      setNotice(
        `تم رفض سند الطلب ${payment.tracking_code}.${notificationWarning}`,
      );

      await load();
    } catch (cause) {
      console.error("تعذر رفض الدفعة:", cause);
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر رفض الدفعة.",
      );
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => {
    if (filter === "all") return rows;

    return rows.filter((payment) => {
      if (filter === "pending") {
        return PENDING_STATUSES.includes(payment.status);
      }

      return payment.status === filter;
    });
  }, [filter, rows]);

  const approvedByWallet = useMemo(() => {
    const totals: Record<string, number> = {};

    rows
      .filter((payment) => payment.status === "approved")
      .forEach((payment) => {
        totals[payment.wallet] =
          (totals[payment.wallet] ?? 0) + Number(payment.amount || 0);
      });

    return totals;
  }, [rows]);

  const totalApproved = Object.values(approvedByWallet).reduce(
    (sum, value) => sum + value,
    0,
  );

  const pendingSum = rows
    .filter((payment) => PENDING_STATUSES.includes(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 font-[Cairo] sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow">
          <div>
            <h1 className="text-xl font-black">طلبات الدفع والمحاسبة</h1>
            <p className="mt-1 text-xs text-sky-200">
              مراجعة طلبات الدفع واعتمادها أو رفضها
            </p>
          </div>

          <Link
            to="/admin"
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
          >
            ← لوحة الإدارة
          </Link>
        </header>

        {err && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <p className="font-black">تعذر تنفيذ العملية</p>
            <p className="mt-1 break-words">{err}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 font-bold"
            >
              إعادة تحميل البيانات
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="بانتظار الاعتماد"
            value={
              rows.filter((payment) =>
                PENDING_STATUSES.includes(payment.status),
              ).length
            }
            sub={`${fmt(pendingSum)} ر.ي مطلوب`}
            color="text-amber-600"
          />
          <Kpi
            label="المقبوض المعتمد"
            value={fmt(totalApproved)}
            sub="ر.ي"
            color="text-emerald-600"
          />
          <Kpi
            label="دفعات معتمدة"
            value={rows.filter((payment) => payment.status === "approved").length}
            sub="عملية"
            color="text-[#0F4C81]"
          />
          <Kpi
            label="مرفوضة"
            value={rows.filter((payment) => payment.status === "rejected").length}
            sub="عملية"
            color="text-red-600"
          />
        </div>

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-black text-[#0A2540]">
            إجمالي الدفعات المعتمدة حسب وسيلة الدفع
          </h2>

          {Object.keys(approvedByWallet).length === 0 ? (
            <p className="text-xs text-slate-500">لا توجد دفعات معتمدة.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(approvedByWallet).map(([wallet, value]) => (
                <div
                  key={wallet}
                  className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"
                >
                  <div className="text-xs font-bold text-slate-600">
                    {wallet}
                  </div>
                  <div className="mt-1 text-lg font-black text-emerald-700">
                    {fmt(value)}
                  </div>
                  <div className="text-[10px] text-slate-500">ر.ي</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold ${
                filter === item
                  ? "border-[#0F4C81] bg-[#0F4C81] text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {item === "all" ? "الكل" : STATUS[item]?.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {loading && (
            <p className="text-sm text-slate-500">جارٍ التحميل...</p>
          )}

          {!loading && shown.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-500">
              لا توجد طلبات في هذا القسم.
            </p>
          )}

          {shown.map((payment) => {
            const isPending = PENDING_STATUSES.includes(payment.status);
            const amount = Number(payment.amount || 0);
            const currency = payment.currency || "ر.ي";

            return (
              <article
                key={payment.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"
              >
                {payment.receipt_image ? (
                  <button
                    type="button"
                    onClick={() => setPreview(payment.receipt_image)}
                    className="shrink-0"
                    aria-label="معاينة سند الدفع"
                  >
                    <img
                      src={payment.receipt_image}
                      alt="سند الدفع"
                      className="h-24 w-24 rounded-xl border object-cover"
                    />
                  </button>
                ) : (
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-dashed text-xs text-slate-400">
                    بدون سند
                  </div>
                )}

                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-[#0A2540]">
                      {payment.customer_name || "عميل"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        STATUS[payment.status]?.classes ??
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATUS[payment.status]?.label ?? payment.status}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-600">
                    الطلب <b dir="ltr">{payment.tracking_code}</b>
                    {" • "}
                    عبر <b>{payment.wallet}</b>
                    {" • "}
                    {new Date(payment.created_at).toLocaleString("ar")}
                  </div>

                  <p className="mt-3 text-sm font-bold">
                    مبلغ الدفعة: {fmt(amount)} {currency}
                  </p>

                  {payment.phone && (
                    <p className="mt-1 text-xs text-slate-600">
                      هاتف العميل: <b dir="ltr">{payment.phone}</b>
                    </p>
                  )}

                  {payment.reviewed_at && (
                    <p className="mt-1 text-xs text-slate-500">
                      تاريخ المراجعة:{" "}
                      {new Date(payment.reviewed_at).toLocaleString("ar")}
                    </p>
                  )}
                </div>

                {isPending && (
                  <div className="flex shrink-0 flex-col gap-2 sm:w-48">
                    <button
                      type="button"
                      disabled={busy === payment.id}
                      onClick={() => void approve(payment)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === payment.id ? "جارٍ الاعتماد…" : "اعتماد الدفعة ✓"}
                    </button>

                    <button
                      type="button"
                      disabled={busy === payment.id}
                      onClick={() => void reject(payment)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      رفض السند
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {preview && (
        <div
          role="presentation"
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 font-bold"
          >
            إغلاق
          </button>

          <img
            src={preview}
            alt="سند الدفع"
            className="max-h-[90vh] max-w-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-4">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
