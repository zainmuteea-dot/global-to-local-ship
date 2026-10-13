import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "pending" | "approved" | "rejected";
export type Period = "all" | "today" | "week" | "month";

export type Payment = {
  id: string;
  tracking: string;
  customer: string;
  amount: number;
  method: string;
  createdAt: string;
  status: PaymentStatus;
  archived: boolean;
};

type PaymentRecord = Payment & {
  requestedAmount: number | null;
  receivedAmount: number | null;
  remainingAmount: number | null;
  receiptImage: string | null;
  reviewedAt: string | null;
  userId: string | null;
};

type PaymentFilter = PaymentStatus | "partial" | "all";

export const AUTO_REFRESH_SECONDS = 30;
const PAGE_SIZE = 10;

export function matchesPeriod(
  createdAt: string,
  period: Period,
  now: Date,
): boolean {
  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) return false;
  if (created.getTime() > now.getTime()) return false;
  if (period === "all") return true;

  // اليوم بحسب توقيت الرياض.
  if (period === "today") {
    return (
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
      }).format(created) ===
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
      }).format(now)
    );
  }

  // آخر أسبوع (7 أيام) أو آخر شهر (30 يومًا).
  const days = period === "week" ? 7 : 30;
  return now.getTime() - created.getTime() <= days * 86400000;
}

function getPeriodBounds(period: Period, now: Date) {
  if (period === "all") return null;
  if (period === "today") {
    const riyadhDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const start = new Date(`${riyadhDate}T00:00:00+03:00`);
    return {
      start: start.toISOString(),
      end: new Date(start.getTime() + 86400000).toISOString(),
    };
  }
  const days = period === "week" ? 7 : 30;
  return {
    start: new Date(now.getTime() - days * 86400000).toISOString(),
    end: now.toISOString(),
  };
}

function escapePostgrestSearch(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s_-]/g, " ")
    .replace(/\s+/g, " ");
}

export function paymentTotals(payments: Payment[]) {
  return {
    pending: payments.filter((payment) => payment.status === "pending").length,
    approved: payments.filter((payment) => payment.status === "approved")
      .length,
    rejected: payments.filter((payment) => payment.status === "rejected")
      .length,
    received: payments
      .filter((payment) => payment.status === "approved")
      .reduce((sum, payment) => sum + payment.amount, 0),
  };
}

/**
 * بيانات تجريبية فقط.
 * لا تستدعِ هذه الدالة لعرضها في الصفحة الفعلية.
 */
export function createDemoPayments(now: Date): Payment[] {
  const rows: [
    string,
    string,
    number,
    number,
    PaymentStatus,
    string,
  ][] = [
    ["SQ-160416", "أحمد محمد", 2458, 0, "pending", "الكريمي"],
    ["SQ-941280", "سارة عبدالله", 1000, 0, "pending", "جوال"],
    ["SQ-812502", "محمد علي", 2458, 2, "approved", "الكريمي"],
    ["SQ-400643", "عبدالله حسن", 10000, 2, "approved", "حساب بنكي"],
    ["SQ-705193", "ريم خالد", 18500, 4, "approved", "جوال"],
    ["SQ-328610", "خالد أحمد", 7500, 6, "rejected", "الكريمي"],
    ["SQ-209864", "أسماء صالح", 42000, 12, "approved", "حساب بنكي"],
    ["SQ-682741", "علي عبدالرحمن", 15000, 22, "approved", "الكريمي"],
    ["SQ-517093", "نور محمد", 9000, 37, "rejected", "جوال"],
  ];

  return rows.map(
    ([tracking, customer, amount, days, status, method], index) => ({
      id: `demo-${index}`,
      tracking,
      customer,
      amount,
      method,
      status,
      archived: false,
      createdAt: new Date(
        now.getTime() - days * 86400000 - index * 60000,
      ).toISOString(),
    }),
  );
}

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع والمحاسبة — السوق الشامل" },
      {
        name: "description",
        content: "مراجعة دفعات العملاء وتسجيل المبالغ المقبوضة.",
      },
      {
        property: "og:title",
        content: "طلبات الدفع والمحاسبة — السوق الشامل",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (value: number) => Math.round(value).toLocaleString("en-US");

function playPaymentTone(context: AudioContext) {
  [880, 1174].forEach((frequency, index) => {
    const startAt = context.currentTime + index * 0.18;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.15);
  });
}

const STATUS_LABELS: Record<PaymentFilter, string> = {
  pending: "بانتظار مراجعة الدفع",
  partial: "دفعوا جزءًا",
  approved: "معتمدة",
  rejected: "مرفوضة",
  all: "الكل",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "all", label: "كل الفترات" },
  { value: "today", label: "اليوم" },
  { value: "week", label: "آخر 7 أيام" },
  { value: "month", label: "آخر 30 يومًا" },
];

const STATUS_OPTIONS: PaymentFilter[] = [
  "pending",
  "partial",
  "approved",
  "rejected",
  "all",
];

function normalizeStatus(value: unknown): PaymentStatus {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}

function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRecord[]>([]);
  const [receivedInputs, setReceivedInputs] = useState<
    Record<string, string>
  >({});
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // يعرض شاشة التحميل الكاملة عند أول تحميل فقط.
  // في التحديثات التالية تبقى الطلبات الحالية ظاهرة.
  const hasLoadedOnceRef = useRef(false);
  // null تعني أن أول قراءة ناجحة لم تنتهِ بعد؛ هذه القراءة تهيّئ baseline بصمت.
  const knownPendingIdsRef = useRef<Set<string> | null>(null);
  const loadSequenceRef = useRef(0);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [incomingAlert, setIncomingAlert] = useState("");

  const togglePaymentSound = useCallback(async () => {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      return;
    }

    try {
      const context =
        audioContextRef.current && audioContextRef.current.state !== "closed"
          ? audioContextRef.current
          : new window.AudioContext();

      audioContextRef.current = context;
      await context.resume();
      playPaymentTone(context);
      soundEnabledRef.current = true;
      setSoundEnabled(true);
    } catch (cause) {
      console.error("تعذر تفعيل صوت تنبيهات الدفع:", cause);
      setErr("تعذر تفعيل الصوت. جرّب الضغط على زر تفعيل الصوت مرة أخرى.");
    }
  }, []);

  const load = useCallback(async () => {
    const requestSequence = ++loadSequenceRef.current;
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }

    setRefreshing(true);
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
        const roleError = adminRole.error ?? staffRole.error;
        throw new Error(
          `تعذر فحص دور الحساب: ${roleError?.message ?? "خطأ غير معروف"}`,
        );
      }

      if (!adminRole.data && !staffRole.data) {
        throw new Error("الحساب لا يحمل دور admin أو staff.");
      }

      // في فلتر الدفع الجزئي، مصدر الإجمالي والمتبقي هو الطلب نفسه.
      // نقرأ الطلبات المدفوعة جزئيًا على دفعات حتى يشمل الفلتر كل الطلبات.
      const partialRemainingByTracking = new Map<string, number>();

      if (filter === "partial") {
        const batchSize = 500;
        let from = 0;

        while (true) {
          const { data: orderRows, error: ordersError } = await (
            supabase.from("orders") as any
          )
            .select("tracking_code, paid_amount, remaining_amount")
            .gt("paid_amount", 0)
            .gt("remaining_amount", 0)
            .not("tracking_code", "is", null)
            .order("tracking_code", { ascending: true })
            .range(from, from + batchSize - 1);

          if (ordersError) {
            throw new Error(
              `تعذر تحميل الطلبات المدفوعة جزئيًا: ${ordersError.message}${
                ordersError.code ? ` (${ordersError.code})` : ""
              }`,
            );
          }

          const batch = orderRows ?? [];
          for (const order of batch) {
            const tracking = String(order.tracking_code ?? "").trim();
            const remaining = Number(order.remaining_amount);

            // أرقام التتبع تكون عادةً مثل SQ-123456 أو SHP-123456.
            if (/^[A-Za-z0-9_-]+$/.test(tracking) && Number.isFinite(remaining) && remaining > 0) {
              partialRemainingByTracking.set(tracking, remaining);
            }
          }

          if (batch.length < batchSize) break;
          from += batchSize;
        }
      }

      // جلب صفحة واحدة من قاعدة البيانات مع العدد الدقيق لكل نتائج البحث والفلاتر.
      const query = (supabase.from("payments") as any)
        .select(
          "id, order_tracking, customer_name, method, amount, status, created_at, currency, phone, tracking_code, payment_method, user_id, wallet, reviewed_at, updated_at, remaining_amount",
          { count: "exact" },
        );

      if (filter === "pending" || filter === "approved" || filter === "rejected") {
        query.eq("status", filter);
      } else if (filter === "partial") {
        query.eq("status", "approved");
        const trackingCodes = Array.from(partialRemainingByTracking.keys());

        if (trackingCodes.length > 0) {
          // بعض الدفعات تربط الطلب عبر order_tracking وبعضها عبر tracking_code.
          const inList = `(${trackingCodes.join(",")})`;
          query.or(
            `order_tracking.in.${inList},tracking_code.in.${inList}`,
          );
        } else {
          // لا توجد طلبات دفع جزئي، فلا نعرض نتائج غير مطابقة.
          query.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const bounds = getPeriodBounds(period, new Date());
      if (bounds) {
        query.gte("created_at", bounds.start).lt("created_at", bounds.end);
      }

      const safeSearch = escapePostgrestSearch(search);
      if (safeSearch) {
        const pattern = `*${safeSearch}*`;
        query.or(
          `customer_name.ilike.${pattern},order_tracking.ilike.${pattern},tracking_code.ilike.${pattern},phone.ilike.${pattern},method.ilike.${pattern},payment_method.ilike.${pattern},wallet.ilike.${pattern}`,
        );
      }

      const start = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(start, start + PAGE_SIZE - 1);

      if (error) {
        throw new Error(
          `تعذر تحميل صفحة الدفعات: ${error.message}${
            error.code ? ` (${error.code})` : ""
          }`,
        );
      }

      // تجاهل نتائج الطلبات الأقدم إذا اكتمل طلب تحديث أحدث قبلها.
      if (requestSequence !== loadSequenceRef.current) return;
      setTotalCount(count ?? 0);

      const nextRows: PaymentRecord[] = (data ?? []).map((row: any) => {
        const status = normalizeStatus(row.status);
        const baseAmount = Number(row.amount ?? 0);
        const requestedAmount =
          row.requested_amount == null
            ? baseAmount
            : Number(row.requested_amount);
        const receivedAmount =
          row.received_amount == null ? null : Number(row.received_amount);
        const amount =
          status === "approved"
            ? receivedAmount ?? baseAmount
            : baseAmount;

        return {
          id: String(row.id),
          tracking: String(
            row.tracking_code ?? row.order_tracking ?? row.tracking ?? "",
          ),
          customer: String(
            row.customer_name ?? row.name ?? row.phone ?? "عميل",
          ),
          amount,
          method: String(
            row.wallet ?? row.payment_method ?? row.method ?? "غير محدد",
          ),
          createdAt: String(row.created_at ?? row.updated_at ?? ""),
          status,
          archived: false,
          requestedAmount,
          receivedAmount,
          remainingAmount:
            filter === "partial"
              ? partialRemainingByTracking.get(
                  String(row.order_tracking ?? row.tracking_code ?? "").trim(),
                ) ?? (row.remaining_amount == null ? null : Number(row.remaining_amount))
              : row.remaining_amount == null
                ? null
                : Number(row.remaining_amount),
          // لا نحمل صورة السند ضمن القائمة لتقليل حجم التحديث الدوري.
          receiptImage: null,
          reviewedAt: row.reviewed_at ?? null,
          userId: row.user_id ?? null,
        };
      }).sort((a: PaymentRecord, b: PaymentRecord) => {
        const aTime = Date.parse(a.createdAt);
        const bTime = Date.parse(b.createdAt);
        if (!Number.isFinite(aTime)) return 1;
        if (!Number.isFinite(bTime)) return -1;
        return bTime - aTime;
      });

      if (filter === "pending" && page === 1) {
        const nextPendingIds = new Set(
          nextRows
            .filter((payment) => payment.status === "pending")
            .map((payment) => payment.id),
        );
        const previouslyKnownIds = knownPendingIdsRef.current;

        if (previouslyKnownIds === null) {
          // لا تنبّه على الدفعات القديمة عند فتح الصفحة؛ نهيئ المقارنة فقط.
          knownPendingIdsRef.current = nextPendingIds;
        } else {
          const newPendingPayments = nextRows.filter(
            (payment) =>
              payment.status === "pending" &&
              !previouslyKnownIds.has(payment.id),
          );

          // حدّث خط الأساس قبل إصدار التنبيه لمنع التكرار.
          knownPendingIdsRef.current = nextPendingIds;

          if (newPendingPayments.length > 0) {
            const newestPayment = newPendingPayments[0];
            setIncomingAlert(
              `وصل ${newPendingPayments.length} طلب دفع جديد${
                newestPayment.tracking
                  ? ` • رقم الطلب ${newestPayment.tracking}`
                  : ""
              }`,
            );

            const context = audioContextRef.current;
            if (soundEnabledRef.current && context) {
              void context
                .resume()
                .then(() => playPaymentTone(context))
                .catch((cause) =>
                  console.error("تعذر تشغيل نغمة الدفعة الجديدة:", cause),
                );
            }
          }
        }
      }

      setRows(nextRows);

      setReceivedInputs((previous) => {
        const next = { ...previous };

        for (const payment of nextRows) {
          if (next[payment.id] === undefined) {
            next[payment.id] = String(
              payment.requestedAmount ?? payment.amount,
            );
          }
        }

        return next;
      });
    } catch (cause) {
      if (requestSequence === loadSequenceRef.current) {
        console.error("تعذر تحميل طلبات الدفع:", cause);
        setErr(
          cause instanceof Error ? cause.message : "تعذر تحميل طلبات الدفع.",
        );
      }
    } finally {
      if (requestSequence === loadSequenceRef.current) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filter, page, period, search]);

  const openReceipt = async (paymentId: string) => {
    setPreviewLoading(true);
    setErr("");

    try {
      const { data, error } = await (supabase.from("payments") as any)
        .select("receipt_image")
        .eq("id", paymentId)
        .single();

      if (error) {
        throw new Error(error.message || "تعذر تحميل السند.");
      }

      const receipt = data?.receipt_image;
      if (typeof receipt !== "string" || !receipt.trim()) {
        throw new Error("لا يوجد سند محفوظ لهذه الدفعة.");
      }

      setPreview(receipt);
    } catch (cause) {
      console.error("تعذر تحميل سند الدفع:", cause);
      setErr(cause instanceof Error ? cause.message : "تعذر تحميل السند.");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("payments_live_refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => void load(),
      )
      .subscribe();

    const intervalId = window.setInterval(
      () => void load(),
      AUTO_REFRESH_SECONDS * 1000,
    );

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  // احتفظ بسياق الصوت أثناء تبديل الفلاتر والصفحات، وأغلقه عند مغادرة الصفحة فقط.
  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") {
        void context.close().catch((cause) =>
          console.error("تعذر إغلاق سياق الصوت:", cause),
        );
      }
    };
  }, []);

  const approve = async (payment: PaymentRecord) => {
    setErr("");

    const received = Number(receivedInputs[payment.id]);
    const requested = Number(
      payment.requestedAmount ?? payment.amount,
    );

    if (!Number.isSafeInteger(received) || received <= 0) {
      setErr(
        `أدخل مبلغًا مقبوضًا صحيحًا أكبر من صفر للطلب ${payment.tracking}.`,
      );
      return;
    }

    if (received > requested) {
      setErr(
        `المبلغ المقبوض لا يمكن أن يتجاوز المطلوب (${fmt(
          requested,
        )} ر.ي) للطلب ${payment.tracking}.`,
      );
      return;
    }

    const remaining = requested - received;

    if (
      !window.confirm(
        `سيُعتمد ${fmt(received)} ر.ي للطلب ${payment.tracking}.\nالمتبقي عند التسليم: ${fmt(
          remaining,
        )} ر.ي.\nسيُرسل إشعار للعميل. متابعة؟`,
      )
    ) {
      return;
    }

    setBusy(payment.id);

    try {
      // Production has no approve_payment_received RPC. The payments AFTER UPDATE
      // trigger handles the receipt, fund balance, order totals, and customer notice
      // when status changes to approved. This conditional update is the single
      // atomic approval action; keeping the pending filter prevents double approval.
      const { data: approvedRow, error } = await (supabase.from("payments") as any)
        .update({
          amount: received,
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .in("status", ["pending", "بانتظار التأكيد"])
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(error.message || "تعذر اعتماد الدفعة.");
      }

      if (!approvedRow) {
        throw new Error(
          "لم يتم الاعتماد: الدفعة لم تعد معلّقة، أو لا تسمح صلاحيات قاعدة البيانات بتحديثها.",
        );
      }

      await load();
    } catch (cause) {
      console.error("تعذر اعتماد الدفعة:", cause);
      setErr(
        cause instanceof Error
          ? cause.message
          : "تعذر اعتماد الدفعة. لم يُعرض نجاح الاعتماد.",
      );
    } finally {
      setBusy(null);
    }
  };

  const reject = async (payment: PaymentRecord) => {
    if (
      !window.confirm(
        `هل تريد رفض سند الدفع للطلب ${payment.tracking}؟`,
      )
    ) {
      return;
    }

    setErr("");
    setBusy(payment.id);

    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "rejected" })
        .eq("id", payment.id)
        .in("status", ["pending", "بانتظار التأكيد"]);

      if (error) {
        throw new Error(`تعذر رفض الدفعة: ${error.message}`);
      }

      if (payment.userId) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: payment.userId,
            title: `لم يتم قبول سند الدفع للطلب ${payment.tracking}`,
            body: "يرجى مراجعة السند أو التواصل مع خدمة العملاء لإعادة تقديمه.",
            kind: "payment",
            href: "/account/wallet",
            is_active: true,
          });

        if (notificationError) {
          setErr(
            `تم تحديث حالة الدفعة، لكن تعذر إرسال إشعار الرفض: ${notificationError.message}`,
          );
        }
      }

      await load();
    } catch (cause) {
      console.error("تعذر رفض الدفعة:", cause);
      setErr(
        cause instanceof Error ? cause.message : "تعذر رفض الدفعة.",
      );
    } finally {
      setBusy(null);
    }
  };

  // الصفوف المعروضة هي الصفحة التي جلبناها من قاعدة البيانات بالفعل.
  const filteredRows = rows;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedRows = rows;

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filter, period, search]);

  const totals = useMemo(
    () => paymentTotals(rows.filter((payment) => !payment.archived)),
    [rows],
  );

  const ledger = useMemo(() => {
    const amounts: Record<string, number> = {};

    rows
      .filter(
        (payment) =>
          payment.status === "approved" && !payment.archived,
      )
      .forEach((payment) => {
        amounts[payment.method] =
          (amounts[payment.method] ?? 0) + payment.amount;
      });

    return amounts;
  }, [rows]);

  const pendingAmount = rows
    .filter(
      (payment) =>
        payment.status === "pending" && !payment.archived,
    )
    .reduce(
      (sum, payment) =>
        sum +
        Number(payment.requestedAmount ?? payment.amount),
      0,
    );

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-3 font-[Cairo] sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow-md">
          <div>
            <p className="text-xs font-bold text-sky-200">لوحة الإدارة / المحاسبة</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">طلبات الدفع والمحاسبة</h1>
            <p className="mt-1 text-xs text-sky-200">مراجعة الدفعات واعتماد المقبوض الفعلي</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void togglePaymentSound()}
              aria-pressed={soundEnabled}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              {soundEnabled ? "🔔 الصوت مفعّل" : "🔕 تفعيل صوت التنبيه"}
            </button>
            <Link to="/admin" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25">
              ← لوحة الإدارة
            </Link>
          </div>
        </header>

        {err && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-black">تعذر تنفيذ العملية أو تحميل البيانات</p>
            <p className="mt-1 break-words">{err}</p>
            <button type="button" onClick={() => void load()} className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 font-bold">
              إعادة تحميل البيانات
            </button>
          </div>
        )}

        {incomingAlert && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"
          >
            <span>🔔 {incomingAlert}</span>
            <button
              type="button"
              onClick={() => setIncomingAlert("")}
              className="rounded-lg px-3 py-1 hover:bg-emerald-100"
            >
              إخفاء
            </button>
          </div>
        )}

        <section>
          <h2 className="mb-1 text-lg font-black text-[#0A2540]">ملخص الصفحة الحالية</h2>
          <p className="mb-3 text-xs text-slate-500">الأعداد والمبالغ أدناه تخص السجلات المحمّلة في هذه الصفحة فقط.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="بانتظار الاعتماد" value={totals.pending} sub={`${fmt(pendingAmount)} ر.ي مطلوب`} color="text-amber-600" />
            <Kpi label="المقبوض المعتمد" value={fmt(totals.received)} sub="ر.ي" color="text-emerald-600" />
            <Kpi label="دفعات معتمدة" value={totals.approved} sub="عملية" color="text-[#0F4C81]" />
            <Kpi label="مرفوضة" value={totals.rejected} sub="عملية" color="text-red-600" />
          </div>
        </section>

        <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black text-[#0A2540]">المقبوض حسب وسيلة الدفع في هذه الصفحة</h2>
            <span className="text-xs text-slate-500">الدفعات المعتمدة الظاهرة حاليًا فقط</span>
          </div>
          {Object.keys(ledger).length === 0 ? (
            <p className="text-xs text-slate-500">لا توجد مقبوضات معتمدة.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(ledger).map(([method, value]) => (
                <div key={method} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                  <div className="text-xs font-bold text-slate-600">{method}</div>
                  <div className="mt-1 text-lg font-black text-emerald-700">{fmt(value)}</div>
                  <div className="text-[10px] text-slate-500">ر.ي</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-bold text-slate-600">البحث</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم العميل أو رقم الطلب أو وسيلة الدفع..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <button
              type="button"
              onClick={() => void load()}
              disabled={refreshing}
              className="rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A2540] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "جارٍ التحديث…" : "⟳ تحديث البيانات"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-black text-slate-700">الفترة الزمنية</p>
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${period === option.value ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-black text-slate-700">حالة الدفع</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => {
                  const activeColor =
                    status === "partial"
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : status === "pending"
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-[#0F4C81] bg-[#0F4C81] text-white";
                  const idleColor =
                    status === "partial"
                      ? "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                      : status === "pending"
                        ? "border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={filter === status}
                      onClick={() => setFilter(status)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold ${filter === status ? activeColor : idleColor}`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500" aria-live="polite">
            الصفحة الحالية: {filteredRows.length} سجل • إجمالي النتائج: {totalCount}
            {refreshing && hasLoadedOnceRef.current ? " • يجري التحديث في الخلفية" : ""}
            {" • "}التحديث التلقائي كل {AUTO_REFRESH_SECONDS} ثانية
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <h2 className="font-black text-[#0A2540]">سجل طلبات الدفع</h2>
            <span className="text-xs text-slate-500">{totalCount} طلب في النتائج</span>
          </div>
          {loading && !hasLoadedOnceRef.current ? (
            <p className="p-5 text-sm text-slate-500">جارٍ تحميل طلبات الدفع…</p>
          ) : totalCount === 0 ? (
            <p className="p-5 text-sm text-slate-500">لا توجد طلبات تطابق البحث والفلاتر المحددة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-right text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap border-b px-4 py-3 font-black">رقم الطلب / العميل</th>
                    <th className="whitespace-nowrap border-b px-4 py-3 font-black">وسيلة الدفع</th>
                    <th className="whitespace-nowrap border-b px-4 py-3 font-black">المبلغ</th>
                    <th className="whitespace-nowrap border-b px-4 py-3 font-black">التاريخ</th>
                    <th className="whitespace-nowrap border-b px-4 py-3 font-black">الحالة</th>
                    <th className="whitespace-nowrap border-b px-4 py-3 font-black">السند والإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((payment) => {
                    const requested = Number(payment.requestedAmount ?? payment.amount);
                    const entered = Number(receivedInputs[payment.id] ?? requested);
                    const remainingPreview = Number.isFinite(entered) ? Math.max(0, requested - entered) : requested;
                    const isPending = payment.status === "pending";
                    const actualReceived = payment.receivedAmount ?? payment.amount;
                    const validDate = payment.createdAt && !Number.isNaN(Date.parse(payment.createdAt));

                    return (
                      <tr key={payment.id} className="border-b last:border-0 hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-black text-[#0A2540]" dir="ltr">{payment.tracking || payment.id.slice(0, 8)}</div>
                          <div className="mt-1 text-slate-500">{payment.customer || "عميل"}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{payment.method}</td>
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-800">المطلوب: {fmt(requested)} ر.ي</div>
                          {isPending ? (
                            <div className="mt-2 w-40">
                              <label className="block text-[11px] font-bold text-slate-500">المقبوض فعليًا</label>
                              <input
                                type="number"
                                min="1"
                                max={requested}
                                step="1"
                                inputMode="numeric"
                                value={receivedInputs[payment.id] ?? String(requested)}
                                onChange={(event) => setReceivedInputs((previous) => ({ ...previous, [payment.id]: event.target.value }))}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold"
                              />
                              <div className="mt-1 text-[11px] font-bold text-amber-700">المتبقي: {fmt(remainingPreview)} ر.ي</div>
                            </div>
                          ) : payment.status === "approved" ? (
                            <div className="mt-1 text-[11px] text-emerald-700">المقبوض: {fmt(actualReceived)} ر.ي{payment.remainingAmount != null ? ` • المتبقي: ${fmt(payment.remainingAmount)} ر.ي` : ""}</div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{validDate ? new Date(payment.createdAt).toLocaleString("ar") : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[payment.status]}`}>
                            {payment.status === "pending" ? "بانتظار المراجعة" : payment.status === "approved" ? "معتمد ✓" : "مرفوض"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={previewLoading}
                              onClick={() => void openReceipt(payment.id)}
                              className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                            >
                              {previewLoading ? "جارٍ تحميل السند…" : "عرض السند"}
                            </button>
                            {isPending && (
                              <>
                                <button type="button" disabled={busy === payment.id} onClick={() => void approve(payment)} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                                  {busy === payment.id ? "جارٍ التنفيذ…" : "اعتماد"}
                                </button>
                                <button type="button" disabled={busy === payment.id} onClick={() => void reject(payment)} className="whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">
                                  رفض
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalCount > 0 && (
            <nav
              aria-label="ترقيم صفحات طلبات الدفع"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3"
              dir="rtl"
            >
              <span className="text-xs text-slate-600">
                صفحة {page} من {totalPages} • يعرض {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} من {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  السابقة
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg bg-[#0F4C81] px-3 py-2 text-xs font-bold text-white hover:bg-[#0A2540] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  التالية
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>

      {preview && (
        <div role="presentation" onClick={() => setPreview(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <button type="button" onClick={() => setPreview(null)} className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 font-bold">إغلاق</button>
          <img src={preview} alt="سند الدفع" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </main>
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
