import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  approvePaymentOnce,
  PENDING_APPROVAL_STATUSES,
} from "./payment-approval";

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

type PaymentDraft = {
  amount: string;
  currency: string;
  customer_name: string;
  phone: string;
  receipt_image: string;
  tracking_code: string;
  wallet: string;
};

type PaymentFilter = "pending" | "approved" | "rejected" | "all";
type PeriodFilter = "all" | "today" | "week" | "month";

const isWithinPeriod = (dateStr: string, period: PeriodFilter): boolean => {
  if (period === "all") return true;
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  if (isNaN(created)) return true;

  if (period === "today") {
    // بداية اليوم الحالي بتوقيت الرياض (UTC+3) أو خلال آخر 24 ساعة
    const riyadhNow = new Date(now + 3 * 3600 * 1000);
    const startOfRiyadhToday = Date.UTC(
      riyadhNow.getUTCFullYear(),
      riyadhNow.getUTCMonth(),
      riyadhNow.getUTCDate(),
      -3, 0, 0, 0
    );
    return created >= startOfRiyadhToday || (now - created) <= 24 * 3600 * 1000;
  }
  if (period === "week") {
    return (now - created) <= 7 * 24 * 3600 * 1000;
  }
  if (period === "month") {
    return (now - created) <= 30 * 24 * 3600 * 1000;
  }
  return true;
};

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { name: "description", content: "مراجعة وتعديل وأرشفة طلبات الدفع." },
      { property: "og:title", content: "طلبات الدفع والمحاسبة — السوق الشامل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (value: number) =>
  Math.round(Number(value || 0)).toLocaleString("en-US");

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

const toDraft = (payment: Payment): PaymentDraft => ({
  amount: String(payment.amount ?? ""),
  currency: payment.currency ?? "ر.ي",
  customer_name: payment.customer_name ?? "",
  phone: payment.phone ?? "",
  receipt_image: payment.receipt_image ?? "",
  tracking_code: payment.tracking_code ?? "",
  wallet: payment.wallet ?? "",
});

function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  // التحديث التلقائي وجرس الإشعارات
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  // تنبيه يظهر داخل صفحة الإدارة عند وصول طلب دفع جديد
  const [newPaymentAlert, setNewPaymentAlert] = useState<Payment | null>(null);

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

      const [paymentsResult, archivesResult] = await Promise.all([
        supabase
          .from("payments")
          .select(
            "id,amount,created_at,currency,customer_name,phone,receipt_image,reviewed_at,status,tracking_code,updated_at,user_id,wallet",
          )
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("payment_archives")
          .select("payment_id"),
      ]);

      if (paymentsResult.error) {
        throw new Error(
          `تعذر تحميل طلبات الدفع: ${paymentsResult.error.message} (${
            paymentsResult.error.code ?? "بدون رمز"
          })`,
        );
      }

      if (archivesResult.error) {
        throw new Error(
          `تعذر تحميل سجل الأرشفة. تحقق من تنفيذ SQL وسياسات RLS: ${archivesResult.error.message}`,
        );
      }

      setRows((paymentsResult.data ?? []) as Payment[]);
      setArchivedIds(
        new Set(
          (archivesResult.data ?? []).map(
            (row: { payment_id: string }) => row.payment_id,
          ),
        ),
      );
    } catch (cause) {
      console.error("تعذر تحميل طلبات الدفع:", cause);
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر تحميل طلبات الدفع.",
      );
    } finally {
      setLoading(false);
      setLastRefreshedAt(
        new Date().toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setCountdown(15);
    }
  }, []);

  useEffect(() => {
    void load();

    const paymentsChannel = supabase
      .channel("payments_live_admin")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
        },
        (payload) => {
          const payment = payload.new as Payment;

          if (PENDING_APPROVAL_STATUSES.includes(payment.status)) {
            setNewPaymentAlert(payment);
            setFilter("pending");
            setShowArchived(false);
          }

          void load();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "payments",
        },
        () => void load(),
      )
      .subscribe();

    const archiveChannel = supabase
      .channel("payment_archives_live_admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_archives",
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(paymentsChannel);
      void supabase.removeChannel(archiveChannel);
    };
  }, [load]);

  // مؤقت التحديث التلقائي كل 15 ثانية مع عداد تنازلي
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void load();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const approve = async (payment: Payment) => {
    setErr("");
    setNotice("");

    if (
      !window.confirm(
        `اعتماد الدفعة بمبلغ ${fmt(Number(payment.amount))} ${
          payment.currency
        } للطلب ${payment.tracking_code}؟\nسيتم تسجيل سند قبض، وتحديث الصندوق، وتحديث حالة الطلب وإرسال إشعار للعميل.`,
      )
    ) {
      return;
    }

    setBusy(payment.id);

    try {
      const result = await approvePaymentOnce(payment, {
        approvePending: async (paymentId, pendingStatuses) => {
          const { data, error } = await supabase
            .from("payments")
            .update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", paymentId)
            .in("status", pendingStatuses)
            .select("id")
            .maybeSingle();

          if (error) {
            throw new Error(`تعذر اعتماد الدفعة: ${error.message}`);
          }

          return Boolean(data);
        },

        getOrderNotes: async (trackingCode) => {
          const { data, error } = await supabase
            .from("orders")
            .select("notes")
            .eq("tracking_code", trackingCode)
            .maybeSingle();

          if (error) throw error;
          return data?.notes ?? null;
        },

        listApprovedPayments: async (trackingCode) => {
          const { data, error } = await supabase
            .from("payments")
            .select("id,amount,currency")
            .eq("tracking_code", trackingCode)
            .eq("status", "approved");

          if (error) throw error;
          return data ?? [];
        },

        insertCustomerNotice: async (notification) => {
          const { error } = await (supabase.from("notifications") as any)
            .insert(notification);

          if (error) throw error;
        },
      });

      if (!result.approved) {
        throw new Error(
          result.reason === "already_reviewed"
            ? "لم يتم اعتماد الدفعة؛ ربما راجعها مسؤول آخر. أعد تحميل البيانات."
            : "الدفعة ليست بانتظار المراجعة.",
        );
      }

      const warning = result.notificationSent
        ? ""
        : result.reason === "missing_user"
          ? " تم الاعتماد، لكن لم يُرسل إشعار لعدم ربط الدفعة بحساب العميل."
          : " تم الاعتماد، لكن تعذر إنشاء إشعار العميل.";

      setNotice(`تم اعتماد الدفعة ${payment.tracking_code}.${warning}`);
      await load();
    } catch (cause) {
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
    if (
      !window.confirm(
        `هل تريد رفض سند الدفع للطلب ${payment.tracking_code}؟`,
      )
    ) {
      return;
    }

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
        .in("status", PENDING_APPROVAL_STATUSES)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(`تعذر رفض السند: ${error.message}`);
      }

      if (!data) {
        throw new Error("لم يتم التحديث؛ قد تكون راجعتها سابقاً.");
      }

      let warning = "";
      if (payment.user_id) {
        const { error: noticeError } = await (
          supabase.from("notifications") as any
        ).insert({
          user_id: payment.user_id,
          title: "تم رفض سند السداد",
          message: `تم رفض سند السداد للطلب ${payment.tracking_code}. يرجى التحقق من صحة السند والمحاولة مجدداً أو التواصل مع الإدارة.`,
          type: "payment_rejected",
        });

        if (noticeError) {
          warning = " (تم الرفض، لكن تعذر إرسال الإشعار للعميل)";
        }
      }

      setNotice(`تم رفض سند الطلب ${payment.tracking_code}.${warning}`);
      await load();
    } catch (cause) {
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر رفض الدفعة.",
      );
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (payment: Payment) => {
    setErr("");
    setNotice("");
    setEditing(payment);
    setDraft(toDraft(payment));
  };

  const saveEdit = async () => {
    if (!editing || !draft) return;

    setErr("");
    setNotice("");

    const amount = Number(draft.amount);

    if (!Number.isSafeInteger(amount) || amount < 0) {
      setErr("المبلغ يجب أن يكون عددًا صحيحًا موجبًا أو صفرًا.");
      return;
    }

    if (
      !draft.tracking_code.trim() ||
      !draft.wallet.trim() ||
      !draft.currency.trim()
    ) {
      setErr("أكمل رمز الطلب ووسيلة الدفع والعملة.");
      return;
    }

    const isApproved = editing.status === "approved";

    if (
      isApproved &&
      (amount !== Number(editing.amount) ||
        draft.currency !== editing.currency ||
        draft.wallet !== editing.wallet ||
        draft.tracking_code !== editing.tracking_code)
    ) {
      setErr(
        "للحفاظ على تطابق القيود المالية، لا يمكن تغيير المبلغ أو العملة أو وسيلة الدفع أو رمز الطلب لدفعة معتمدة. يمكن تعديل اسم العميل والهاتف ورابط السند.",
      );
      return;
    }

    if (!window.confirm("حفظ التعديلات؟ لن تتغير حالة الدفعة.")) {
      return;
    }

    setBusy(editing.id);

    try {
      const update: Record<string, unknown> = {
        customer_name: draft.customer_name.trim() || null,
        phone: draft.phone.trim() || null,
        receipt_image: draft.receipt_image.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (!isApproved) {
        update.amount = amount;
        update.currency = draft.currency.trim();
        update.wallet = draft.wallet.trim();
        update.tracking_code = draft.tracking_code.trim();
      }

      const { data, error } = await (supabase.from("payments") as any)
        .update(update)
        .eq("id", editing.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(`تعذر حفظ التعديلات: ${error.message}`);
      }

      if (!data) {
        throw new Error(
          "لم يُحفظ التعديل؛ تحقق من صلاحية التحديث وسياسات RLS.",
        );
      }

      setNotice("تم حفظ بيانات الطلب دون تغيير حالته.");
      setEditing(null);
      setDraft(null);
      await load();
    } catch (cause) {
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر حفظ التعديلات.",
      );
    } finally {
      setBusy(null);
    }
  };

  const archive = async (payment: Payment) => {
    if (
      !window.confirm(
        `أرشفة الطلب ${payment.tracking_code}؟ سيختفي من القائمة الرئيسية مع بقاء سجل الدفع والقيود المالية محفوظة.`,
      )
    ) {
      return;
    }

    setErr("");
    setNotice("");
    setBusy(payment.id);

    try {
      const { error } = await (supabase as any)
        .from("payment_archives")
        .insert({
          payment_id: payment.id,
          archived_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error && error.code !== "23505") {
        throw new Error(`تعذر أرشفة الطلب: ${error.message}`);
      }

      setNotice(
        `تمت أرشفة الطلب ${payment.tracking_code} مع الاحتفاظ بسجله المالي.`,
      );
      await load();
    } catch (cause) {
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذرت أرشفة الطلب.",
      );
    } finally {
      setBusy(null);
    }
  };

  const restore = async (payment: Payment) => {
    if (
      !window.confirm(
        `إعادة الطلب ${payment.tracking_code} إلى القائمة الرئيسية؟`,
      )
    ) {
      return;
    }

    setErr("");
    setNotice("");
    setBusy(payment.id);

    try {
      const { error } = await (supabase as any)
        .from("payment_archives")
        .delete()
        .eq("payment_id", payment.id);

      if (error) {
        throw new Error(`تعذرت استعادة الطلب: ${error.message}`);
      }

      setNotice(`تمت استعادة الطلب ${payment.tracking_code}.`);
      await load();
    } catch (cause) {
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذرت استعادة الطلب.",
      );
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(
    () =>
      rows.filter((payment) => {
        const isArchived = archivedIds.has(payment.id);

        if (isArchived !== showArchived) return false;
        if (!isWithinPeriod(payment.created_at, period)) return false;

        if (filter === "all") return true;
        if (filter === "pending") {
          return PENDING_APPROVAL_STATUSES.includes(payment.status);
        }

        return payment.status === filter;
      }),
    [rows, archivedIds, showArchived, filter, period],
  );

  const pendingPayments = useMemo(
    () =>
      rows.filter((payment) =>
        PENDING_APPROVAL_STATUSES.includes(payment.status),
      ),
    [rows],
  );

  const pendingCount = pendingPayments.length;

  const countsByPeriod = useMemo(() => {
    const todayCount = rows.filter((p) =>
      isWithinPeriod(p.created_at, "today"),
    ).length;
    const weekCount = rows.filter((p) =>
      isWithinPeriod(p.created_at, "week"),
    ).length;
    const monthCount = rows.filter((p) =>
      isWithinPeriod(p.created_at, "month"),
    ).length;

    return {
      all: rows.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
    };
  }, [rows]);

  const totals = useMemo(() => {
    const byWallet: Record<string, number> = {};

    rows
      .filter((payment) => payment.status === "approved")
      .forEach((payment) => {
        byWallet[payment.wallet] =
          (byWallet[payment.wallet] ?? 0) +
          Number(payment.amount || 0);
      });

    return byWallet;
  }, [rows]);

  const totalApproved = Object.values(totals).reduce(
    (sum, value) => sum + value,
    0,
  );

  const pendingSum = rows
    .filter((payment) => PENDING_APPROVAL_STATUSES.includes(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 font-[Cairo] sm:p-6"
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black">
              طلبات الدفع والمحاسبة
            </h1>
            <p className="mt-1 text-xs text-sky-200">
              مراجعة وتعديل وأرشفة الطلبات مع حفظ القيود
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* زر التحديث التلقائي */}
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                autoRefresh
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "border-white/20 bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
              title={
                autoRefresh
                  ? "انقر لإيقاف التحديث التلقائي"
                  : "انقر لتفعيل التحديث التلقائي"
              }
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  autoRefresh
                    ? "animate-pulse bg-emerald-400"
                    : "bg-slate-400"
                }`}
              />
              <span>
                {autoRefresh
                  ? `تحديث تلقائي (${countdown}ث)`
                  : "تحديث متوقف"}
              </span>
            </button>

            {/* زر تحديث يدوي فوري */}
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-50"
              title="تحديث البيانات الآن"
            >
              <svg
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>تحديث</span>
            </button>

            {/* جرس الإشعارات مع القائمة المنسدلة */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowNotificationsMenu((prev) => !prev)
                }
                className="relative flex items-center justify-center rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25 focus:outline-none"
                aria-label="قائمة الإشعارات والطلبات المعلقة"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>

                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white shadow-md ring-2 ring-[#0A2540]">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* القائمة المنسدلة للإشعارات */}
              {showNotificationsMenu && (
                <div
                  className="absolute left-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl sm:w-96"
                  style={{ minWidth: "290px" }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                        {pendingCount}
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        الطلبات بانتظار المراجعة
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotificationsMenu(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  {pendingPayments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      ✓ لا توجد طلبات معلقة حالياً، الحسابات كلها محدثة!
                    </div>
                  ) : (
                    <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                      {pendingPayments.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFilter("pending");
                            setShowArchived(false);
                            setShowNotificationsMenu(false);
                          }}
                          className="flex w-full items-start justify-between rounded-xl border border-amber-100 bg-amber-50/60 p-2.5 text-right transition hover:bg-amber-100/70"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                {item.customer_name || "عميل"}
                              </span>
                              <span
                                dir="ltr"
                                className="rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700"
                              >
                                {item.tracking_code}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              عبر {item.wallet} •{" "}
                              {new Date(
                                item.created_at,
                              ).toLocaleTimeString("ar-SA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="text-xs font-black text-amber-900">
                              {fmt(Number(item.amount || 0))}
                            </span>
                            <span className="mr-1 text-[10px] text-slate-500">
                              {item.currency || "ر.ي"}
                            </span>
                          </div>
                        </button>
                      ))}

                      {pendingPayments.length > 6 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilter("pending");
                            setShowArchived(false);
                            setShowNotificationsMenu(false);
                          }}
                          className="w-full rounded-xl bg-slate-100 py-2 text-center text-xs font-bold text-[#0F4C81] hover:bg-slate-200"
                        >
                          عرض كل الطلبات المعلقة ({pendingCount})
                        </button>
                      )}
                    </div>
                  )}

                  {lastRefreshedAt && (
                    <div className="mt-2 border-t border-slate-100 pt-2 text-center text-[10px] text-slate-400">
                      آخر تحديث للبيانات: {lastRefreshedAt}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              to="/admin"
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              ← لوحة الإدارة
            </Link>
          </div>
        </header>

        {err && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <b>تعذر تنفيذ العملية</b>
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

        {newPaymentAlert && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <b>وصلت دفعة جديدة</b>
            <p className="mt-1">
              الطلب{" "}
              <b dir="ltr">{newPaymentAlert.tracking_code}</b>
              {" • "}العميل:{" "}
              {newPaymentAlert.customer_name || "غير محدد"}
              {" • "}المبلغ:{" "}
              {fmt(Number(newPaymentAlert.amount))}{" "}
              {newPaymentAlert.currency || "ر.ي"}
            </p>
            <p className="mt-1">راجع السند قبل اعتماد الدفعة.</p>
            <button
              type="button"
              onClick={() => setNewPaymentAlert(null)}
              className="mt-2 rounded-lg bg-amber-200 px-3 py-1 font-bold"
            >
              إغلاق
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="بانتظار الاعتماد"
            value={
              rows.filter((payment) =>
                PENDING_APPROVAL_STATUSES.includes(payment.status),
              ).length
            }
            sub={`${fmt(pendingSum)} ر.ي مطلوب`}
            color="text-amber-600"
          />
          <Kpi
            label="المقبوض المعتمد"
            value={fmt(totalApproved)}
            sub="ر.ي، يشمل المؤرشف"
            color="text-emerald-600"
          />
          <Kpi
            label="دفعات معتمدة"
            value={
              rows.filter((payment) => payment.status === "approved").length
            }
            sub="عملية"
            color="text-[#0F4C81]"
          />
          <Kpi
            label="مرفوضة"
            value={
              rows.filter((payment) => payment.status === "rejected").length
            }
            sub="عملية"
            color="text-red-600"
          />
        </div>

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-black text-[#0A2540]">
            إجمالي المقبوض المعتمد حسب وسيلة الدفع
          </h2>

          {Object.keys(totals).length === 0 ? (
            <p className="text-xs text-slate-500">
              لا توجد دفعات معتمدة.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(totals).map(([wallet, value]) => (
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

        {/* فلاتر الفترة الزمنية وفلاتر الحالات */}
        <div className="mt-4 space-y-3">
          {/* فلتر الفترات: الكل، اليوم، قبل أسبوع، قبل شهر */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="ml-1 text-xs font-bold text-slate-500">
              الفترة:
            </span>
            {(
              [
                {
                  id: "all",
                  label: "كل الأوقات",
                  count: countsByPeriod.all,
                },
                {
                  id: "today",
                  label: "طلبات اليوم",
                  count: countsByPeriod.today,
                },
                {
                  id: "week",
                  label: "قبل أسبوع",
                  count: countsByPeriod.week,
                },
                {
                  id: "month",
                  label: "قبل شهر",
                  count: countsByPeriod.month,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                  period === item.id
                    ? "border-[#0A2540] bg-[#0A2540] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`mr-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                    period === item.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {/* فلتر الحالات والأرشيف */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="ml-1 text-xs font-bold text-slate-500">
              الحالة:
            </span>
            {(["pending", "approved", "rejected", "all"] as const).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                    filter === item
                      ? "border-[#0F4C81] bg-[#0F4C81] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {item === "all"
                    ? "الكل"
                    : STATUS[item]?.label}
                </button>
              ),
            )}

            <span className="mx-1 hidden h-4 w-px bg-slate-300 sm:inline-block" />

            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                !showArchived
                  ? "border-slate-700 bg-slate-700 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              القائمة الرئيسية
            </button>

            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                showArchived
                  ? "border-slate-700 bg-slate-700 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              الأرشيف ({archivedIds.size})
            </button>
          </div>
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
            const isPending = PENDING_APPROVAL_STATUSES.includes(payment.status);
            const isArchived = archivedIds.has(payment.id);
            const amount = Number(payment.amount || 0);

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
                    {isArchived && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        مؤرشف
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-600">
                    الطلب{" "}
                    <b dir="ltr">{payment.tracking_code}</b>
                    {" • "}عبر <b>{payment.wallet}</b>
                    {" • "}
                    {new Date(payment.created_at).toLocaleString("ar")}
                  </div>

                  {payment.phone && (
                    <div className="mt-1 text-xs text-slate-600">
                      الهاتف: <b dir="ltr">{payment.phone}</b>
                    </div>
                  )}

                  <p className="mt-3 text-sm font-bold">
                    المبلغ: {fmt(amount)} {payment.currency || "ر.ي"}
                  </p>

                  {payment.reviewed_at && (
                    <p className="mt-1 text-xs text-slate-500">
                      تاريخ المراجعة:{" "}
                      {new Date(payment.reviewed_at).toLocaleString("ar")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:w-52 sm:flex-col">
                  <button
                    type="button"
                    disabled={busy === payment.id}
                    onClick={() => startEdit(payment)}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 disabled:opacity-50"
                  >
                    تعديل البيانات
                  </button>

                  {isArchived ? (
                    <button
                      type="button"
                      disabled={busy === payment.id}
                      onClick={() => void restore(payment)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50"
                    >
                      استعادة من الأرشيف
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === payment.id}
                      onClick={() => void archive(payment)}
                      className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                    >
                      أرشفة
                    </button>
                  )}

                  {!isArchived && isPending && (
                    <>
                      <button
                        type="button"
                        disabled={busy === payment.id}
                        onClick={() => void approve(payment)}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {busy === payment.id
                          ? "جارٍ التنفيذ…"
                          : "اعتماد الدفعة ✓"}
                      </button>

                      <button
                        type="button"
                        disabled={busy === payment.id}
                        onClick={() => void reject(payment)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                      >
                        رفض السند
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {editing && draft && (
        <div
          className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تعديل بيانات طلب الدفع"
        >
          <section className="my-6 w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  تعديل بيانات الدفعة
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  الحالة الحالية:{" "}
                  {STATUS[editing.status]?.label ?? editing.status}، ولن
                  تتغير بالحفظ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            {editing.status === "approved" && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                الدفعة معتمدة: يمكن تعديل اسم العميل والهاتف ورابط السند
                فقط. المبلغ والعملة ووسيلة الدفع ورمز الطلب مقفلة حفاظًا
                على تطابق الحسابات.
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="المبلغ">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.amount}
                  disabled={editing.status === "approved"}
                  onChange={(event) =>
                    setDraft({ ...draft, amount: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="العملة">
                <input
                  value={draft.currency}
                  disabled={editing.status === "approved"}
                  onChange={(event) =>
                    setDraft({ ...draft, currency: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="اسم العميل">
                <input
                  value={draft.customer_name}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      customer_name: event.target.value,
                    })
                  }
                  className="input"
                />
              </Field>

              <Field label="هاتف العميل">
                <input
                  dir="ltr"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft({ ...draft, phone: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="رمز الطلب">
                <input
                  dir="ltr"
                  value={draft.tracking_code}
                  disabled={editing.status === "approved"}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      tracking_code: event.target.value,
                    })
                  }
                  className="input"
                />
              </Field>

              <Field label="وسيلة الدفع / المحفظة">
                <input
                  value={draft.wallet}
                  disabled={editing.status === "approved"}
                  onChange={(event) =>
                    setDraft({ ...draft, wallet: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="رابط صورة السند">
                  <input
                    dir="ltr"
                    type="url"
                    value={draft.receipt_image}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        receipt_image: event.target.value,
                      })
                    }
                    placeholder="https://… أو اتركه فارغًا"
                    className="input"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={busy === editing.id}
                onClick={() => void saveEdit()}
                className="rounded-xl bg-[#0F4C81] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy === editing.id
                  ? "جارٍ الحفظ…"
                  : "حفظ التعديلات"}
              </button>
            </div>
          </section>
        </div>
      )}

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

      <style>
        {`.input{width:100%;margin-top:.35rem;border:1px solid #cbd5e1;border-radius:.75rem;padding:.65rem .8rem;font-size:.9rem}.input:disabled{background:#f1f5f9;color:#64748b}`}
      </style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold text-slate-700">
      {label}
      {children}
    </label>
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
