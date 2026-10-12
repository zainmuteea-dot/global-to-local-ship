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

type PaymentFilter = PaymentStatus | "all";

export const AUTO_REFRESH_SECONDS = 30;

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

const STATUS_LABELS: Record<PaymentFilter, string> = {
  pending: "بانتظار المراجعة",
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // يعرض شاشة التحميل الكاملة عند أول تحميل فقط.
  // في التحديثات التالية تبقى الطلبات الحالية ظاهرة.
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
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

      // Read the existing production row shape without naming optional columns.
      // This avoids PostgREST failing when requested_amount or similar columns
      // are not present in the connected production database.
      const { data, error } = await (supabase.from("payments") as any)
        .select("*");

      if (error) {
        throw new Error(
          `تعذر تحميل طلبات الدفع: ${error.message}${
            error.code ? ` (${error.code})` : ""
          }`,
        );
      }

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
            row.remaining_amount == null
              ? null
              : Number(row.remaining_amount),
          receiptImage:
            row.receipt_image ?? row.receipt_url ?? row.proof_url ?? null,
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
      console.error("تعذر تحميل طلبات الدفع:", cause);
      setErr(
        cause instanceof Error ? cause.message : "تعذر تحميل طلبات الدفع.",
      );
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      const { error } = await (supabase as any).rpc(
        "approve_payment_received",
        {
          _payment_id: payment.id,
          _received_amount: received,
        },
      );

      if (error) {
        throw new Error(error.message || "تعذر اعتماد الدفعة.");
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

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const now = new Date();

    return rows.filter((payment) => {
      const matchesStatus =
        filter === "all" || payment.status === filter;

      const matchesDate = matchesPeriod(
        payment.createdAt,
        period,
        now,
      );

      const searchableText = [
        payment.customer,
        payment.tracking,
        payment.method,
        payment.id,
      ]
        .join(" ")
        .toLocaleLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      return (
        matchesStatus &&
        matchesDate &&
        matchesSearch &&
        !payment.archived
      );
    });
  }, [rows, filter, period, search]);

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
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 font-[Cairo] sm:p-6"
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-[#0A2540] to-[#0F4C81] p-5 text-white shadow">
          <div>
            <p className="text-xs font-bold text-sky-200">
              لوحة الإدارة / المحاسبة
            </p>
            <h1 className="mt-1 text-xl font-black">
              طلبات الدفع والمحاسبة
            </h1>
            <p className="mt-1 text-xs text-sky-200">
              مراجعة الدفعات واعتماد المقبوض الفعلي
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
            <p className="font-black">
              تعذر تنفيذ العملية أو تحميل البيانات
            </p>
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

        <section className="mt-4">
          <h2 className="mb-3 text-lg font-black text-[#0A2540]">
            ملخص المدفوعات
          </h2>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="بانتظار الاعتماد"
              value={totals.pending}
              sub={`${fmt(pendingAmount)} ر.ي مطلوب`}
              color="text-amber-600"
            />
            <Kpi
              label="المقبوض المعتمد"
              value={fmt(totals.received)}
              sub="ر.ي"
              color="text-emerald-600"
            />
            <Kpi
              label="دفعات معتمدة"
              value={totals.approved}
              sub="عملية"
              color="text-[#0F4C81]"
            />
            <Kpi
              label="مرفوضة"
              value={totals.rejected}
              sub="عملية"
              color="text-red-600"
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-black text-[#0A2540]">
            إجمالي المقبوض حسب وسيلة الدفع
          </h2>

          {Object.keys(ledger).length === 0 ? (
            <p className="text-xs text-slate-500">
              لا توجد مقبوضات معتمدة.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(ledger).map(([method, value]) => (
                <div
                  key={method}
                  className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"
                >
                  <div className="text-xs font-bold text-slate-600">
                    {method}
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

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-bold text-slate-600">
                البحث
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم العميل أو رقم الطلب أو وسيلة الدفع..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void load()}
                disabled={refreshing}
                className="w-full rounded-xl bg-[#0F4C81] px-4 py-2 text-sm font-bold text-white hover:bg-[#0A2540] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {refreshing ? "جارٍ التحديث…" : "تحديث البيانات"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black text-slate-700">
              الفترة الزمنية
            </p>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    period === option.value
                      ? "border-[#0F4C81] bg-[#0F4C81] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black text-slate-700">
              حالة الدفع
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    filter === status
                      ? "border-[#0F4C81] bg-[#0F4C81] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500" aria-live="polite">
            المعروض: {filteredRows.length} من {rows.length}
            {refreshing && hasLoadedOnceRef.current
              ? " • يجري التحديث في الخلفية"
              : ""}
            {" • "}
            التحديث التلقائي كل {AUTO_REFRESH_SECONDS} ثانية
          </p>
        </section>

        <section className="mt-3 space-y-3">
          {loading && !hasLoadedOnceRef.current && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-500">
              جارٍ تحميل طلبات الدفع…
            </p>
          )}

          {hasLoadedOnceRef.current && filteredRows.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-500">
              لا توجد طلبات تطابق البحث والفلاتر المحددة.
            </p>
          )}

          {filteredRows.map((payment) => {
            const requested = Number(
              payment.requestedAmount ?? payment.amount,
            );
            const entered = Number(
              receivedInputs[payment.id] ?? requested,
            );
            const remainingPreview = Number.isFinite(entered)
              ? Math.max(0, requested - entered)
              : requested;
            const isPending = payment.status === "pending";
            const actualReceived =
              payment.receivedAmount ?? payment.amount;

            return (
              <article
                key={payment.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"
              >
                {payment.receiptImage ? (
                  <button
                    type="button"
                    onClick={() => setPreview(payment.receiptImage)}
                    className="shrink-0"
                    aria-label="معاينة سند الدفع"
                  >
                    <img
                      src={payment.receiptImage}
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
                      {payment.customer || "عميل"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[payment.status]}`}
                    >
                      {payment.status === "pending"
                        ? "بانتظار المراجعة"
                        : payment.status === "approved"
                          ? "معتمد ✓"
                          : "مرفوض"}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-600">
                    الطلب <b dir="ltr">{payment.tracking}</b>
                    {" • "}عبر <b>{payment.method}</b>
                    {" • "}
                    {new Date(payment.createdAt).toLocaleString("ar")}
                  </div>

                  {isPending ? (
                    <>
                      <div className="mt-3 text-sm font-bold">
                        المبلغ المطلوب: {fmt(requested)} ر.ي
                      </div>

                      <label className="mt-2 block max-w-xs text-xs font-bold text-slate-700">
                        المبلغ المقبوض فعليًا
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={requested}
                            step="1"
                            inputMode="numeric"
                            value={
                              receivedInputs[payment.id] ??
                              String(requested)
                            }
                            onChange={(event) =>
                              setReceivedInputs((previous) => ({
                                ...previous,
                                [payment.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base font-black"
                          />
                          <span>ر.ي</span>
                        </div>
                      </label>

                      <p className="mt-2 text-xs font-bold text-amber-700">
                        المتبقي على العميل عند التسليم:{" "}
                        {fmt(remainingPreview)} ر.ي
                      </p>

                      <p className="mt-1 text-[11px] text-slate-500">
                        تأكد من السند قبل الاعتماد.
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 space-y-1 text-sm">
                      <p>
                        المبلغ المطلوب: {fmt(requested)} ر.ي
                      </p>
                      {payment.status === "approved" && (
                        <>
                          <p className="font-black text-emerald-700">
                            المقبوض والمعتمد: {fmt(actualReceived)} ر.ي
                          </p>
                          <p className="font-bold text-amber-700">
                            المتبقي عند التسليم:{" "}
                            {fmt(payment.remainingAmount ?? 0)} ر.ي
                          </p>
                        </>
                      )}
                    </div>
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
                      {busy === payment.id
                        ? "جارٍ الاعتماد…"
                        : "اعتماد المقبوض ✓"}
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
        </section>
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
