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

// توحيد تسمية العملة مع قيمة افتراضية للريال اليمني.
const normCur = (currency: string | null | undefined) =>
  (currency || "").trim() || "ر.ي";

// صياغة سطر مختصر متعدد العملات: "320,000 ر.ي · 1,200 SAR".
const fmtByCurrency = (record: Record<string, number>) => {
  const entries = Object.entries(record);
  if (entries.length === 0) return "0";
  return entries.map(([cur, val]) => `${fmt(val)} ${cur}`).join(" · ");
};

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
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  // تنبيه يظهر داخل صفحة الإدارة عند وصول طلب دفع جديد.
  const [newPaymentAlert, setNewPaymentAlert] = useState<Payment | null>(null);

  // فلتر الفترة الزمنية.
  const [period, setPeriod] = useState<PeriodFilter>("all");

  // التحديث التلقائي.
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec] = useState<number>(15);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // قائمة جرس الإشعارات.
  const [showBellMenu, setShowBellMenu] = useState<boolean>(false);

  // البحث برقم الطلب أو اسم العميل.
  const [search, setSearch] = useState<string>("");

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
      setLastRefreshedAt(new Date());
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

  // التحديث التلقائي كل refreshIntervalSec ثانية عند تفعيله.
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      void load();
    }, refreshIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshIntervalSec, load]);

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

    if (
      !window.confirm(
        `اعتماد مبلغ ${fmt(amount)} ${payment.currency || "ر.ي"} للطلب ${payment.tracking_code}؟`,
      )
    ) {
      return;
    }

    setBusy(payment.id);

    try {
      const result = await approvePaymentOnce(payment, {
        approvePending: async (paymentId, pendingStatuses) => {
          // شرط الحالة يمنع الاعتماد المكرر حتى مع ضغط الزر من جلستين.
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
          // The live notifications schema uses `message` and has no `payment_id`.
          // This runs only after the conditional payment approval succeeds.
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

      setNotice(
        `تم اعتماد الدفعة ${payment.tracking_code}.${warning}`,
      );
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
        throw new Error(`تعذر رفض الدفعة: ${error.message}`);
      }

      if (!data) {
        throw new Error(
          "لم يتغير الطلب. ربما تمت مراجعته مسبقًا؛ أعد تحميل البيانات.",
        );
      }

      let warning = "";

      if (payment.user_id) {
        const { error: noticeError } = await supabase
          .from("notifications")
          .insert({
            user_id: payment.user_id,
            title: `لم يتم قبول سند الدفع للطلب ${payment.tracking_code}`,
            message: "يرجى مراجعة السند أو التواصل مع خدمة العملاء.",
          });

        if (noticeError) {
          warning = " تعذر إنشاء إشعار العميل.";
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

  const filtered = useMemo(() => {
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return rows.filter((payment) => {
      // فلتر الأرشفة
      const isArchived = archivedIds.has(payment.id);
      if (showArchived ? !isArchived : isArchived) return false;

      // فلتر الحالة
      if (filter === "pending") {
        if (!PENDING_APPROVAL_STATUSES.includes(payment.status)) return false;
      } else if (filter !== "all" && payment.status !== filter) {
        return false;
      }

      // فلتر الفترة الزمنية
      if (period !== "all" && payment.created_at) {
        const itemTime = new Date(payment.created_at).getTime();
        const diff = now - itemTime;
        if (period === "today" && diff > oneDay) return false;
        if (period === "week" && diff > oneWeek) return false;
        if (period === "month" && diff > oneMonth) return false;
      }

      // فلتر البحث (رقم الطلب أو اسم العميل)
      const term = search.trim().toLowerCase();
      if (term) {
        const haystack = `${payment.tracking_code ?? ""} ${
          payment.customer_name ?? ""
        } ${payment.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [rows, archivedIds, showArchived, filter, period, search]);

  // الإجماليات المعتمدة مفصولة حسب وسيلة الدفع ثم العملة (تشمل المؤرشف).
  const totals = useMemo(() => {
    const byWallet: Record<string, Record<string, number>> = {};

    rows
      .filter((payment) => payment.status === "approved")
      .forEach((payment) => {
        const wallet = payment.wallet || "غير محدد";
        const cur = normCur(payment.currency);
        byWallet[wallet] = byWallet[wallet] ?? {};
        byWallet[wallet][cur] =
          (byWallet[wallet][cur] ?? 0) + Number(payment.amount || 0);
      });

    return byWallet;
  }, [rows]);

  // إجمالي المقبوض المعتمد لكل عملة على حدة.
  const totalApprovedByCurrency = useMemo(() => {
    const byCur: Record<string, number> = {};

    rows
      .filter((payment) => payment.status === "approved")
      .forEach((payment) => {
        const cur = normCur(payment.currency);
        byCur[cur] = (byCur[cur] ?? 0) + Number(payment.amount || 0);
      });

    return byCur;
  }, [rows]);

  // المبالغ المعلّقة (بانتظار الاعتماد) لكل عملة على حدة.
  const pendingByCurrency = useMemo(() => {
    const byCur: Record<string, number> = {};

    rows
      .filter((payment) => PENDING_APPROVAL_STATUSES.includes(payment.status))
      .forEach((payment) => {
        const cur = normCur(payment.currency);
        byCur[cur] = (byCur[cur] ?? 0) + Number(payment.amount || 0);
      });

    return byCur;
  }, [rows]);

  const pendingCount = rows.filter((payment) =>
    PENDING_APPROVAL_STATUSES.includes(payment.status),
  ).length;

  const approvedCount = rows.filter(
    (payment) => payment.status === "approved",
  ).length;

  const rejectedCount = rows.filter(
    (payment) => payment.status === "rejected",
  ).length;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 font-[Cairo] sm:p-6"
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow">
          <div>
            <h1 className="text-xl font-black">طلبات الدفع والمحاسبة</h1>
            <p className="mt-1 text-xs text-sky-200">
              مراجعة وتعديل وأرشفة الطلبات مع التحديث اللحظي
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* زر التحديث التلقائي */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                autoRefresh
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : "bg-white/10 text-slate-300 border border-white/10"
              }`}
              title={
                autoRefresh
                  ? `التحديث التلقائي مفعّل (كل ${refreshIntervalSec} ثانية)`
                  : "التحديث التلقائي متوقف"
              }
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>{autoRefresh ? "تحديث تلقائي: نشط" : "تحديث تلقائي: متوقف"}</span>
            </button>

            {/* جرس الإشعارات */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBellMenu(!showBellMenu)}
                className="relative rounded-xl bg-white/15 p-2.5 text-white hover:bg-white/25 transition"
                aria-label="الإشعارات"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-white shadow">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* القائمة المنسدلة للجرس */}
              {showBellMenu && (
                <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white p-3 text-slate-800 shadow-2xl ring-1 ring-black/10 z-50">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black text-[#0A2540]">
                      طلبات بانتظار الاعتماد
                    </span>
                    <span className="text-[10px] text-slate-500">
                      آخر تحديث: {lastRefreshedAt.toLocaleTimeString("ar-YE")}
                    </span>
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
                    {rows
                      .filter((p) =>
                        PENDING_APPROVAL_STATUSES.includes(p.status),
                      )
                      .slice(0, 5)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-amber-50/70 border border-amber-200 p-2 text-xs"
                        >
                          <div className="flex justify-between font-bold text-amber-900">
                            <span dir="ltr">{item.tracking_code}</span>
                            <span>
                              {fmt(Number(item.amount))}{" "}
                              {item.currency || "ر.ي"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {item.customer_name || "عميل غير مسجل"}
                          </div>
                        </div>
                      ))}
                    {pendingCount === 0 && (
                      <p className="py-4 text-center text-xs text-slate-400">
                        لا توجد طلبات معلقة حالياً
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* رابط لوحة الإدارة */}
            <Link
              to="/admin"
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25 transition"
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
            value={pendingCount}
            sub={`${fmtByCurrency(pendingByCurrency)} مطلوب`}
            color="text-amber-600"
          />
          <Kpi
            label="المقبوض المعتمد"
            value={
              Object.keys(totalApprovedByCurrency).length === 0 ? (
                "0"
              ) : (
                <div className="space-y-0.5">
                  {Object.entries(totalApprovedByCurrency).map(
                    ([cur, val]) => (
                      <div key={cur} className="leading-tight">
                        {fmt(val)}{" "}
                        <span className="text-xs font-bold text-slate-400">
                          {cur}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )
            }
            sub="لكل عملة · يشمل المؤرشف"
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
              {Object.entries(totals).map(([wallet, byCur]) => (
                <div
                  key={wallet}
                  className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"
                >
                  <div className="text-xs font-bold text-slate-600">
                    {wallet}
                  </div>
                  <div className="mt-1 space-y-1">
                    {Object.entries(byCur).map(([cur, val]) => (
                      <div key={cur} className="leading-tight">
                        <span className="text-lg font-black text-emerald-700">
                          {fmt(val)}
                        </span>{" "}
                        <span className="text-[10px] text-slate-500">
                          {cur}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-4 relative">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث برقم الطلب أو اسم العميل…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#0F4C81]"
          />
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(
            (item) => (
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
                {item === "all"
                  ? `الكل (${rows.length})`
                  : item === "pending"
                    ? `بانتظار المراجعة (${pendingCount})`
                    : item === "approved"
                      ? `معتمد (${approvedCount})`
                      : `مرفوض (${rejectedCount})`}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold ${
              !showArchived
                ? "border-slate-700 bg-slate-700 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            القائمة الرئيسية
          </button>

          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold ${
              showArchived
                ? "border-slate-700 bg-slate-700 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            الأرشيف ({archivedIds.size})
          </button>
        </div>

        {/* أزرار الفلترة الزمنية */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 border-slate-200">
          <span className="text-xs font-bold text-slate-500 ml-1">الفترة:</span>
          {([
            { id: "all", label: "كل الأوقات" },
            { id: "today", label: "طلبات اليوم" },
            { id: "week", label: "قبل أسبوع" },
            { id: "month", label: "قبل شهر" },
          ] as const).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id as PeriodFilter)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                period === p.id
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="p-3">الطلب / العميل</th>
                <th className="p-3">وسيلة الدفع</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                    جارٍ التحميل...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                    لا توجد طلبات في هذا القسم.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((payment) => {
                  const isPending = PENDING_APPROVAL_STATUSES.includes(
                    payment.status,
                  );
                  const isArchived = archivedIds.has(payment.id);
                  const amount = Number(payment.amount || 0);

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      {/* الطلب / العميل */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
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
                                className="h-10 w-10 rounded-lg border object-cover"
                              />
                            </button>
                          ) : (
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-dashed text-[9px] text-slate-400">
                              بلا سند
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-[#0A2540]">
                                {payment.customer_name || "عميل"}
                              </span>
                              {isArchived && (
                                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                                  مؤرشف
                                </span>
                              )}
                            </div>
                            <div
                              className="text-xs text-slate-500"
                              dir="ltr"
                            >
                              {payment.tracking_code}
                            </div>
                            {payment.phone && (
                              <div
                                className="text-[11px] text-slate-400"
                                dir="ltr"
                              >
                                {payment.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* وسيلة الدفع */}
                      <td className="p-3 font-bold text-slate-700">
                        {payment.wallet || "—"}
                      </td>

                      {/* المبلغ */}
                      <td className="p-3">
                        <span className="font-black text-[#0A2540]">
                          {fmt(amount)}
                        </span>{" "}
                        <span className="text-[11px] text-slate-500">
                          {payment.currency || "ر.ي"}
                        </span>
                      </td>

                      {/* التاريخ */}
                      <td className="p-3 text-xs text-slate-600">
                        {new Date(payment.created_at).toLocaleDateString("ar")}
                      </td>

                      {/* الحالة */}
                      <td className="p-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            STATUS[payment.status]?.classes ??
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {STATUS[payment.status]?.label ?? payment.status}
                        </span>
                      </td>

                      {/* التفاصيل / الإجراءات */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={busy === payment.id}
                            onClick={() => startEdit(payment)}
                            className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-800 disabled:opacity-50"
                          >
                            تعديل
                          </button>

                          {!isArchived && isPending && (
                            <>
                              <button
                                type="button"
                                disabled={busy === payment.id}
                                onClick={() => void approve(payment)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                              >
                                {busy === payment.id ? "جارٍ…" : "اعتماد ✓"}
                              </button>

                              <button
                                type="button"
                                disabled={busy === payment.id}
                                onClick={() => void reject(payment)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50"
                              >
                                رفض
                              </button>
                            </>
                          )}

                          {isArchived ? (
                            <button
                              type="button"
                              disabled={busy === payment.id}
                              onClick={() => void restore(payment)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 disabled:opacity-50"
                            >
                              استعادة
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy === payment.id}
                              onClick={() => void archive(payment)}
                              className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                            >
                              أرشفة
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>عرض {filtered.length} طلب</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-50"
          >
            تحديث الصفحة
          </button>
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
                {busy === editing.id ? "جارٍ الحفظ…" : "حفظ التعديلات"}
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
            onClick={(event) => event.stopPropagation()}
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
  value: React.ReactNode;
  sub: React.ReactNode;
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
