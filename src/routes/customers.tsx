import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "كشف العملاء | السوق الشامل" }] }),
  component: CustomersRoute,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

type RoleRow = { user_id: string; role: string };
type OrderRow = {
  id: string;
  user_id: string | null;
  tracking_code: string | null;
  status: string | null;
  created_at: string;
  customer_name: string | null;
  phone: string | null;
  customer_phone: string | null;
  notes?: string | null;
  total_cost_usd: number | string | null;
  total_cost_yer: number | string | null;
  total_cost_sar: number | string | null;
  paid_amount: number | string | null;
  remaining_amount: number | string | null;
  profit_amount: number | string | null;
  quote_currency: string | null;
  original_currency: string | null;
};
type CustomerPayment = {
  id: string;
  tracking_code: string | null;
  order_tracking?: string | null;
  customer_name: string | null;
  wallet: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};
type Customer = ProfileRow & { orders: OrderRow[]; payments?: CustomerPayment[] };
type CurrencyCode = "USD" | "YER" | "SAR";
type MoneyLine = {
  code: CurrencyCode;
  total: number;
  recorded: number;
  expected: number;
};
type FilterKind = "all" | "active" | "inactive";

const PAGE_SIZE = 10;
const FETCH_PAGE_SIZE = 500;
const AVATAR_COLORS = ["#0F4C81", "#2E7D32", "#F97316", "#5E35B1", "#0891B2", "#DB2777"];

function getMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "غير مسجل";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "غير مسجل" : date.toLocaleDateString("ar-YE");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "ع"
  );
}

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isCancelled(status: string | null) {
  const value = (status ?? "").trim().toLowerCase();
  return ["cancelled", "canceled", "ملغي", "ملغى", "ملغية", "ملغاه"].includes(value);
}

function customerIsActive(customer: Customer, now = Date.now()) {
  const cutoff = now - 90 * 24 * 60 * 60 * 1000;
  return customer.orders.some(
    (order) => !isCancelled(order.status) && new Date(order.created_at).getTime() >= cutoff,
  );
}

function accountLabel(id: string) {
  return id.length > 12 ? `ID-${id.slice(0, 8).toUpperCase()}` : id;
}

const CURRENCY_INFO: Record<CurrencyCode, { label: string; suffix: string }> = {
  USD: { label: "دولار أمريكي", suffix: "USD" },
  YER: { label: "ريال يمني", suffix: "ر.ي" },
  SAR: { label: "ريال سعودي", suffix: "ر.س" },
};
const CURRENCY_CODES: CurrencyCode[] = ["USD", "YER", "SAR"];

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCurrency(value: string | null | undefined): CurrencyCode | null {
  const currency = (value ?? "").trim().toUpperCase();
  if (["USD", "US$", "$", "دولار", "دولار أمريكي"].includes(currency)) {
    return "USD";
  }
  if (["YER", "YRL", "ريال يمني", "ر.ي", "ريال"].includes(currency)) {
    return "YER";
  }
  if (["SAR", "ر.س", "ريال سعودي"].includes(currency)) return "SAR";
  return null;
}

function orderCurrency(order: OrderRow): CurrencyCode | null {
  const explicit =
    normalizeCurrency(order.quote_currency) ?? normalizeCurrency(order.original_currency);
  if (explicit) return explicit;

  // Legacy fallback: when no currency is recorded but the YER cost column
  // contains a value, treat that stored cost and related balances as YER.
  if (numeric(order.total_cost_yer) !== null) return "YER";

  const costValues: Array<[CurrencyCode, number | null]> = [
    ["USD", numeric(order.total_cost_usd)],
    ["SAR", numeric(order.total_cost_sar)],
  ];
  const nonZero = costValues.filter(([, value]) => value !== null && value !== 0);
  if (nonZero.length === 1) return nonZero[0]?.[0] ?? null;
  const present = costValues.filter(([, value]) => value !== null);
  return present.length === 1 ? (present[0]?.[0] ?? null) : null;
}

function currencyTotals(
  orders: OrderRow[],
  field:
    | "total_cost_usd"
    | "total_cost_yer"
    | "total_cost_sar"
    | "paid_amount"
    | "remaining_amount"
    | "profit_amount",
): MoneyLine[] {
  const explicitCostCurrency: Partial<Record<typeof field, CurrencyCode>> = {
    total_cost_usd: "USD",
    total_cost_yer: "YER",
    total_cost_sar: "SAR",
  };
  const explicitCode = explicitCostCurrency[field] as CurrencyCode | undefined;
  const lines: MoneyLine[] = [];
  for (const code of CURRENCY_CODES) {
    const relevant = explicitCode
      ? orders.filter((order) => orderCurrency(order) === code || numeric(order[field]) !== null)
      : orders.filter((order) => orderCurrency(order) === code);
    if (!relevant.length) continue;
    const values = relevant.map((order) => numeric(order[field]));
    const recorded = values.filter((value): value is number => value !== null);
    if (!recorded.length) continue;
    lines.push({
      code,
      total: recorded.reduce((sum, value) => sum + value, 0),
      recorded: recorded.length,
      expected: relevant.length,
    });
  }
  return lines;
}

function hasStoredValue(
  order: OrderRow,
  field: "paid_amount" | "remaining_amount" | "profit_amount",
) {
  return numeric(order[field]) !== null;
}

/** The customer-facing order amount is shown in Yemeni rials only.
 * `quote_currency` describes the original store price and must not relabel
 * amounts stored in a different currency column. Missing YER costs stay
 * unrecorded rather than being converted or guessed here. */
function orderCostTotals(orders: OrderRow[]): MoneyLine[] {
  const values = orders
    .map((order) => numeric(order.total_cost_yer))
    .filter((value): value is number => value !== null);
  if (!values.length) return [];
  return [
    {
      code: "YER",
      total: values.reduce((sum, value) => sum + value, 0),
      recorded: values.length,
      expected: orders.length,
    },
  ];
}

function approvedLinkedPaymentTotals(customer: Customer): MoneyLine[] {
  const orderTrackingCodes = new Set(
    customer.orders
      .map((order) => order.tracking_code?.trim())
      .filter((tracking): tracking is string => Boolean(tracking)),
  );
  const totals = new Map<CurrencyCode, { total: number; count: number }>();
  const countedPaymentIds = new Set<string>();

  for (const payment of customer.payments ?? []) {
    if (
      String(payment.status ?? "")
        .trim()
        .toLowerCase() !== "approved"
    )
      continue;
    const trackings = [payment.order_tracking, payment.tracking_code]
      .map((tracking) => tracking?.trim())
      .filter((tracking): tracking is string => Boolean(tracking));
    if (!trackings.some((tracking) => orderTrackingCodes.has(tracking))) continue;
    if (countedPaymentIds.has(payment.id)) continue;
    countedPaymentIds.add(payment.id);

    const amount = numeric(payment.amount);
    const code = normalizeCurrency(payment.currency);
    // Customer payments in the order summary are denominated in YER only.
    if (amount === null || code !== "YER") continue;
    const current = totals.get("YER") ?? { total: 0, count: 0 };
    current.total += amount;
    current.count += 1;
    totals.set("YER", current);
  }

  const value = totals.get("YER");
  return value
    ? [{ code: "YER", total: value.total, recorded: value.count, expected: value.count }]
    : [];
}

/**
 * Remaining balance priority:
 * 1. Use each order's explicitly stored remaining_amount when present.
 * 2. Otherwise calculate recorded cost minus approved payments uniquely
 *    matched to that order and in the same currency.
 * Unmatched payments stay separate and are never silently subtracted.
 */
function remainingTotals(customer: Customer): MoneyLine[] {
  const paidByOrderId = new Map<string, number>();
  const countedPaymentIds = new Set<string>();

  for (const payment of customer.payments ?? []) {
    if (
      String(payment.status ?? "")
        .trim()
        .toLowerCase() !== "approved"
    ) {
      continue;
    }
    if (countedPaymentIds.has(payment.id)) continue;

    const amount = numeric(payment.amount);
    if (amount === null || normalizeCurrency(payment.currency) !== "YER") continue;

    const paymentTrackings = new Set(
      [payment.order_tracking, payment.tracking_code]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    if (paymentTrackings.size === 0) continue;

    const matchedOrders = customer.orders.filter((order) => {
      const tracking = order.tracking_code?.trim();
      return Boolean(tracking && paymentTrackings.has(tracking));
    });

    // Do not assign a payment when a tracking value points to multiple orders.
    if (matchedOrders.length !== 1) continue;
    const order = matchedOrders[0];
    if (!order) continue;
    // Only calculate a YER balance for orders with a recorded YER cost.
    if (numeric(order.total_cost_yer) === null) continue;

    countedPaymentIds.add(payment.id);
    paidByOrderId.set(order.id, (paidByOrderId.get(order.id) ?? 0) + amount);
  }

  let total = 0;
  let recorded = 0;
  for (const order of customer.orders) {
    const storedCost = numeric(order.total_cost_yer);
    // Without a recorded YER amount, neither quote_currency nor another
    // currency-specific cost column is enough to infer a YER balance.
    if (storedCost === null) continue;

    const storedRemaining = numeric(order.remaining_amount);
    // A stored remaining amount is used only alongside a recorded YER cost,
    // which establishes the currency context for this order's balance.
    if (storedRemaining !== null) {
      total += storedRemaining;
      recorded += 1;
      continue;
    }

    total += storedCost - (paidByOrderId.get(order.id) ?? 0);
    recorded += 1;
  }

  return recorded > 0 ? [{ code: "YER", total, recorded, expected: customer.orders.length }] : [];
}

function approvedUnlinkedPaymentLines(customer: Customer) {
  const orderTrackingCodes = new Set(
    customer.orders
      .map((order) => order.tracking_code?.trim())
      .filter((tracking): tracking is string => Boolean(tracking)),
  );
  const totals = new Map<string, { label: string; total: number; count: number }>();

  for (const payment of customer.payments ?? []) {
    if (
      String(payment.status ?? "")
        .trim()
        .toLowerCase() !== "approved"
    )
      continue;
    const trackingCodes = [payment.order_tracking, payment.tracking_code]
      .map((tracking) => tracking?.trim())
      .filter((tracking): tracking is string => Boolean(tracking));
    if (trackingCodes.some((tracking) => orderTrackingCodes.has(tracking))) continue;

    const amount = numeric(payment.amount);
    if (amount === null) continue;
    const rawCurrency = payment.currency?.trim() || "عملة غير محددة";
    const normalized = normalizeCurrency(rawCurrency);
    const key = normalized ?? rawCurrency.toUpperCase();
    const label = normalized ? CURRENCY_INFO[normalized].suffix : rawCurrency;
    const current = totals.get(key) ?? { label, total: 0, count: 0 };
    current.total += amount;
    current.count += 1;
    totals.set(key, current);
  }

  return Array.from(totals.entries()).map(([key, value]) => ({ key, ...value }));
}

function safeErrorText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[عنوان مخفي]")
    .replace(
      /\b(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|sb_secret_[a-zA-Z0-9_-]+|sbp_[a-zA-Z0-9_-]+)\b/g,
      "[قيمة سرية مخفية]",
    )
    .slice(0, 240);
}

async function describeCustomerLoadError(cause: unknown): Promise<string> {
  let status: number | undefined;
  let serverMessage = "";
  let errorName = "";
  let errorMessage = "";

  if (cause instanceof Error) {
    errorName = cause.name;
    errorMessage = safeErrorText(cause.message);
  } else if (cause && typeof cause === "object") {
    const record = cause as { name?: unknown; message?: unknown; status?: unknown };
    if (typeof record.name === "string") errorName = record.name;
    if (typeof record.message === "string") errorMessage = safeErrorText(record.message);
    if (typeof record.status === "number") status = record.status;
  }

  if (cause && typeof cause === "object") {
    const record = cause as { context?: unknown; status?: unknown };
    if (typeof record.status === "number") status = record.status;
    const context = record.context;
    if (context instanceof Response) {
      status = context.status;
      try {
        const payload = await context.clone().json();
        if (typeof payload?.error === "string") serverMessage = safeErrorText(payload.error);
      } catch {
        // The HTTP status remains useful when the response body is not JSON.
      }
    } else if (context instanceof Error && !errorMessage) {
      errorMessage = safeErrorText(context.message);
    }
  }

  if (status === 404) {
    return "الدالة admin-customers غير موجودة على مشروع Supabase الذي يستخدمه الموقع (HTTP 404). انشر الدالة إلى مشروع الإنتاج الصحيح.";
  }
  if (status === 401) {
    return "رفض Supabase الجلسة أو رمز التحقق (HTTP 401). سجّل الخروج والدخول مجددًا، وتأكد من إبقاء Verify JWT مفعّلًا للدالة.";
  }
  if (status === 403) {
    return serverMessage || "حسابك لا يملك دور admin أو staff المطلوب لعرض العملاء (HTTP 403).";
  }
  if (status && status >= 500) {
    return `${serverMessage || "تعذر تنفيذ الدالة على الخادم."} (HTTP ${status}). راجع سجلات Edge Function باسم admin-customers في مشروع الإنتاج؛ لا تُعد تشغيل أي ترحيل قاعدة بيانات بناءً على هذا الخطأ وحده.`;
  }
  if (serverMessage) return serverMessage;
  if (status) {
    return `فشل استدعاء admin-customers (HTTP ${status})${errorName ? ` · ${errorName}` : ""}. تحقق من إعداد الدالة في مشروع الإنتاج.`;
  }

  const kind = /FunctionsFetchError|TypeError/i.test(errorName)
    ? "تعذر على المتصفح الوصول إلى Edge Function؛ غالبًا طلب شبكة أو CORS أو عنوان Supabase غير مطابق للنشر الحالي."
    : "لم تصل استجابة HTTP من Edge Function.";
  const details = [errorName, errorMessage].filter(Boolean).join(" · ");
  return `${kind}${details ? ` (تشخيص آمن: ${details})` : " (لا توجد استجابة من الخادم)"} افتح أدوات المطور > Network، ثم أعد المحاولة وافحص طلب functions/v1/admin-customers وحالة الطلب فقط. لا تنسخ أو تشارك Headers أو قيم المفاتيح.`;
}

async function loadCustomerRecords(): Promise<{ customers: Customer[]; canDelete: boolean }> {
  const { data, error } = await supabase.functions.invoke("admin-customers", {
    body: { action: "list" },
  });
  if (error) {
    console.error("تعذر تحميل سجل العملاء من الدالة المحمية:", error);
    throw error;
  }
  if (!data || data.success !== true || !Array.isArray(data.customers)) {
    throw new Error(data?.error || "استجابة قائمة العملاء غير صالحة.");
  }
  return {
    customers: data.customers as Customer[],
    canDelete: data.canDelete === true,
  };
}

function CustomersPageContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [canDeleteCustomers, setCanDeleteCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cleanupJobId, setCleanupJobId] = useState<string | null>(null);
  const [retryingCleanup, setRetryingCleanup] = useState(false);
  const fontStack = { fontFamily: "Cairo, Tajawal, system-ui, sans-serif" };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadCustomerRecords();
      setCustomers(result.customers);
      setCanDeleteCustomers(result.canDelete);
      setPage(1);
    } catch (cause) {
      console.error("تعذر تحميل بيانات كشف العملاء:", cause);
      setError(await describeCustomerLoadError(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const confirmDeleteCustomer = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", {
        body: { action: "delete", userId: deleteTarget.id },
      });
      if (error) throw error;
      if (data?.success !== true) {
        if (data?.cleanupPending === true && typeof data.jobId === "string") {
          setCleanupJobId(data.jobId);
          setCustomers((current) => current.filter((item) => item.id !== deleteTarget.id));
          setSelected(null);
          setDeleteTarget(null);
          setInfo(
            "حُذفت الطلبات والسجلات المالية، لكن حذف حساب الدخول لم يكتمل. استخدم زر الاستكمال أدناه.",
          );
          return;
        }
        throw new Error(data?.error || "تعذر حذف العميل.");
      }
      setCustomers((current) => current.filter((item) => item.id !== deleteTarget.id));
      setSelected(null);
      setDeleteTarget(null);
      setInfo("تم حذف حساب العميل وطلباته وسجلاته المالية نهائيًا.");
    } catch (cause) {
      console.error("فشل حذف العميل:", cause);
      setInfo(
        "لم يكتمل الحذف. تحقق من نشر دالة الإدارة والترحيل في مشروع Supabase الإنتاجي الصحيح، ثم أعد المحاولة.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const retryCustomerCleanup = async () => {
    if (!cleanupJobId || retryingCleanup) return;
    setRetryingCleanup(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", {
        body: { action: "resume", jobId: cleanupJobId },
      });
      if (error) throw error;
      if (data?.success !== true) {
        throw new Error(data?.error || "لم يكتمل التنظيف.");
      }
      setCleanupJobId(null);
      setInfo("اكتمل حذف طلبات العميل وسجلاته المالية.");
    } catch (cause) {
      console.error("تعذر استكمال تنظيف سجلات العميل:", cause);
      setInfo(
        "لا يزال التنظيف غير مكتمل. احتفظ برقم العملية التالي وراجعه مع مسؤول قاعدة البيانات: " +
          cleanupJobId,
      );
    } finally {
      setRetryingCleanup(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return customers.filter((customer) => {
      const active = customerIsActive(customer);
      if (filter === "active" && !active) return false;
      if (filter === "inactive" && active) return false;
      if (!query) return true;
      const orderSearch = customer.orders
        .map((order) => `${order.tracking_code ?? ""} ${order.status ?? ""}`)
        .join(" ");
      return `${customer.full_name ?? ""} ${customer.phone ?? ""} ${customer.id} ${orderSearch}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [customers, filter, search]);

  const now = Date.now();
  const monthStart = getMonthStart();
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;
  const activeCount = customers.filter((customer) => customerIsActive(customer, now)).length;
  const newThisMonth = customers.filter(
    (customer) => new Date(customer.created_at).getTime() >= monthStart,
  ).length;
  const newThisWeek = customers.filter(
    (customer) => new Date(customer.created_at).getTime() >= weekStart,
  ).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCsv = () => {
    const headers = [
      "اسم العميل",
      "معرّف الحساب",
      "الهاتف",
      "تاريخ التسجيل",
      "عدد الطلبات",
      "آخر طلب",
      "الحالة",
    ];
    const rows = filtered.map((customer) => {
      const latest = customer.orders[0];
      return [
        customer.full_name || "عميل بدون اسم",
        customer.id,
        customer.phone || "",
        customer.created_at,
        String(customer.orders.length),
        latest?.tracking_code || "",
        customerIsActive(customer) ? "نشط" : "غير نشط",
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    {
      label: "إجمالي العملاء",
      value: customers.length,
      hint: "من سجلات الحسابات",
      icon: Users,
      color: "#2196F3",
      soft: "bg-blue-50",
    },
    {
      label: "نشطون",
      value: activeCount,
      hint: "لديهم طلب خلال 90 يومًا",
      icon: UserCheck,
      color: "#16A34A",
      soft: "bg-emerald-50",
    },
    {
      label: "مسجلون هذا الشهر",
      value: newThisMonth,
      hint: "من تاريخ إنشاء الحساب",
      icon: CalendarDays,
      color: "#F97316",
      soft: "bg-orange-50",
    },
    {
      label: "آخر 7 أيام",
      value: newThisWeek,
      hint: "حسابات جديدة",
      icon: Sparkles,
      color: "#5E35B1",
      soft: "bg-violet-50",
    },
  ];

  return (
    <div dir="rtl" style={fontStack} className="min-h-screen bg-[#F4F6FB] pb-16 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800">كشف العملاء</h1>
            <p className="mt-1 text-sm text-slate-500">
              إدارة وعرض الحسابات المسجلة في قاعدة البيانات · {customers.length} عميل
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setInfo(
                "إنشاء حساب عميل جديد يتطلب مسار تسجيل آمنًا في النظام. هذا الزر لا ينشئ حسابًا من صفحة الإدارة حتى لا تظهر سجلات غير مكتملة.",
              )
            }
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0F4C81] px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-95"
          >
            <Plus className="size-4" /> إضافة عميل
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="mt-2 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <span
                  className={`grid size-11 place-items-center rounded-2xl ${stat.soft}`}
                  style={{ color: stat.color }}
                >
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-3xl font-black leading-none" style={{ color: stat.color }}>
                  {loading ? "—" : stat.value.toLocaleString("ar-YE")}
                </p>
                <p className="mt-1.5 text-xs font-bold text-slate-600">{stat.label}</p>
                <p className="mt-1 text-[10px] text-slate-400">{stat.hint}</p>
              </article>
            );
          })}
        </div>

        <p
          role="note"
          className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-6 text-sky-900"
        >
          مصدر البيانات: الحسابات من <span dir="ltr">profiles</span>، والأدوار من{" "}
          <span dir="ltr">user_roles</span>، والطلبات المرتبطة بمعرّف الحساب من{" "}
          <span dir="ltr">orders</span>. يُحسب «نشط» بوجود طلب غير ملغى خلال آخر 90 يومًا. وتُربط
          الطلبات القديمة التي بلا معرّف حساب بالهاتف فقط إذا كان الرقم يعود لحساب واحد دون التباس.
        </p>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">البحث في العملاء والطلبات</span>
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="بحث بالاسم أو الهاتف أو معرّف الحساب أو رقم الطلب..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-[#2196F3] focus:bg-white"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || filtered.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="size-4" /> تصدير CSV
            </button>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600">
              <Filter className="size-4" />
              <span className="sr-only">تصفية حسب النشاط</span>
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value as FilterKind);
                  setPage(1);
                }}
                className="max-w-32 bg-transparent outline-none"
              >
                <option value="all">كل العملاء</option>
                <option value="active">نشطون</option>
                <option value="inactive">غير نشطين</option>
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-black text-slate-500">
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">معرّف الحساب</th>
                  <th className="px-4 py-3">تاريخ التسجيل</th>
                  <th className="px-4 py-3">رقم الهاتف</th>
                  <th className="px-4 py-3">الطلبات</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> جارٍ تحميل سجلات العملاء…
                      </span>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      {error ? "تعذر عرض النتائج حتى نجاح الاتصال" : "لا توجد سجلات مطابقة"}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((customer) => {
                    const active = customerIsActive(customer);
                    const latest = customer.orders[0];
                    return (
                      <tr key={customer.id} className="bg-white transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                              style={{ backgroundColor: colorFor(customer.id) }}
                            >
                              {initials(customer.full_name || "عميل")}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800">
                                {customer.full_name || "عميل بدون اسم"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            dir="ltr"
                            title={customer.id}
                            className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600"
                          >
                            {accountLabel(customer.id)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(customer.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span dir="ltr" className="block text-right text-xs text-slate-600">
                            {customer.phone || "غير مسجل"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-700">
                            {customer.orders.length.toLocaleString("ar-YE")}
                          </span>
                          {latest?.tracking_code && (
                            <span className="mt-1 block text-[10px] text-slate-400">
                              الأحدث: {latest.tracking_code}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              <span className="size-1.5 rounded-full bg-emerald-500" /> نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                              <span className="size-1.5 rounded-full bg-slate-400" /> غير نشط
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelected(customer)}
                              className="flex items-center gap-1.5 rounded-xl bg-[#0F4C81] px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-95"
                            >
                              <Eye className="size-3.5" /> إظهار
                            </button>
                            {canDeleteCustomers && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(customer)}
                                aria-label={`حذف حساب ${customer.full_name || "العميل"}`}
                                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
                              >
                                <Trash2 className="size-3.5" /> حذف
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            عرض {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} من {filtered.length} عميل
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="السابق"
            >
              <ChevronRight className="size-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
              const first = Math.max(1, Math.min(safePage - 2, totalPages - 4));
              const pageNumber = totalPages <= 5 ? index + 1 : first + index;
              return (
                <button
                  type="button"
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === safePage ? "page" : undefined}
                  className={`grid size-9 place-items-center rounded-lg text-xs font-bold transition ${
                    pageNumber === safePage
                      ? "bg-[#0F4C81] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage >= totalPages}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="التالي"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {info && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => setInfo(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-6 text-slate-700">{info}</p>
              <button
                type="button"
                onClick={() => setInfo(null)}
                aria-label="إغلاق"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            {cleanupJobId && (
              <button
                type="button"
                disabled={retryingCleanup}
                onClick={() => void retryCustomerCleanup()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {retryingCleanup ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> جارٍ استكمال الحذف…
                  </>
                ) : (
                  "إعادة محاولة تنظيف السجلات"
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setInfo(null)}
              className="mt-3 w-full rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white"
            >
              حسنًا
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700">
                <Trash2 className="size-5" />
              </span>
              <div>
                <h2 id="delete-customer-title" className="text-lg font-black text-slate-900">
                  تأكيد حذف العميل نهائيًا
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  سيُحذف حساب <strong>{deleteTarget.full_name || "العميل"}</strong> مع طلباته (
                  {deleteTarget.orders.length}) وسجلات المدفوعات والمحفظة. لا يمكن التراجع عن هذا
                  الإجراء.
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-800">
              سيُحذف كذلك ملف الحساب والعناوين والإشعارات ومعاملات المحفظة المرتبطة به. أُبقي سجلات
              العملية التقنية فقط عند تعذر إكمال التنظيف لضمان إمكانية استئنافه.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteCustomer()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> جارٍ الحذف…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" /> حذف الحساب وكل السجلات
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <h2 id="customer-modal-title" className="font-black text-slate-800">
                تفاصيل العميل
              </h2>
              <div className="flex items-center gap-2">
                {canDeleteCustomers && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="size-3.5" /> حذف العميل
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="grid size-9 place-items-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
                  aria-label="إغلاق"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <span
                  className="grid size-16 shrink-0 place-items-center rounded-full text-xl font-black text-white"
                  style={{ backgroundColor: colorFor(selected.id) }}
                >
                  {initials(selected.full_name || "عميل")}
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {selected.full_name || "عميل بدون اسم"}
                  </h3>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      customerIsActive(selected)
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        customerIsActive(selected) ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {customerIsActive(selected) ? "نشط" : "غير نشط"}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <Phone className="size-3.5" /> الهاتف
                  </p>
                  <p dir="ltr" className="mt-1 text-right text-xs font-bold text-slate-700">
                    {selected.phone || "غير مسجل"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold text-slate-400">معرّف الحساب</p>
                  <p
                    dir="ltr"
                    title={selected.id}
                    className="mt-1 break-all text-right font-mono text-xs font-bold text-slate-700"
                  >
                    {selected.id}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <CalendarDays className="size-3.5" /> تاريخ التسجيل
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-slate-800">الملخص المالي للطلبات</h4>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      المستحق والمدفوع والمتبقي هنا بالريال اليمني فقط. تُستخدم تكلفة total_cost_yer
                      والدفعات المعتمدة المسجلة YER والمطابقة لرقم تتبع الطلب؛ ولا تُحوّل عملة سعر
                      السلعة الأصلية أو تُخمّن. الدفعات غير المطابقة تظهر منفصلة، والربح من الحقل
                      المسجل.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {selected.orders.length.toLocaleString("ar-YE")} طلب
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        label: "إجمالي التكلفة بالريال اليمني",
                        fields: ["total_cost_usd", "total_cost_yer", "total_cost_sar"],
                      },
                      { label: "المدفوع بالريال اليمني", fields: ["paid_amount"] },
                      { label: "المتبقي بالريال اليمني", fields: ["remaining_amount"] },
                      { label: "الربح المسجل", fields: ["profit_amount"] },
                    ] as const
                  ).map(({ label, fields }) => {
                    const financialField = fields[0] as
                      | "total_cost_usd"
                      | "total_cost_yer"
                      | "total_cost_sar"
                      | "paid_amount"
                      | "remaining_amount"
                      | "profit_amount";
                    const moneyLines =
                      fields.length === 3
                        ? orderCostTotals(selected.orders)
                        : financialField === "paid_amount"
                          ? approvedLinkedPaymentTotals(selected)
                          : financialField === "remaining_amount"
                            ? remainingTotals(selected)
                            : currencyTotals(selected.orders, "profit_amount");
                    const unknownCurrencyCount =
                      financialField === "paid_amount"
                        ? (selected.payments ?? []).filter((payment) => {
                            const trackings = [payment.order_tracking, payment.tracking_code]
                              .map((tracking) => tracking?.trim())
                              .filter((tracking): tracking is string => Boolean(tracking));
                            const hasMatchingOrder = selected.orders.some(
                              (order) =>
                                order.tracking_code &&
                                trackings.includes(order.tracking_code.trim()),
                            );
                            return (
                              String(payment.status ?? "")
                                .trim()
                                .toLowerCase() === "approved" &&
                              hasMatchingOrder &&
                              numeric(payment.amount) !== null &&
                              !normalizeCurrency(payment.currency)
                            );
                          }).length
                        : financialField === "profit_amount"
                          ? selected.orders.filter(
                              (order) =>
                                hasStoredValue(order, "profit_amount") && !orderCurrency(order),
                            ).length
                          : 0;
                    return (
                      <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold text-slate-500">{label}</p>
                        {moneyLines.length ? (
                          <ul className="mt-2 space-y-1.5">
                            {moneyLines.map((line) => (
                              <li
                                key={line.code}
                                className="flex flex-wrap items-baseline justify-between gap-1 text-sm font-black text-slate-800"
                              >
                                <span>
                                  {line.total.toLocaleString("ar-YE")}{" "}
                                  {CURRENCY_INFO[line.code].suffix}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {CURRENCY_INFO[line.code].label}
                                  {line.recorded < line.expected
                                    ? ` · متاح في ${line.recorded} من ${line.expected} طلبات`
                                    : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm font-bold text-slate-400">غير مسجل</p>
                        )}
                        {unknownCurrencyCount > 0 && (
                          <p className="mt-2 text-[11px] leading-5 text-amber-700">
                            يوجد مبلغ محفوظ في {unknownCurrencyCount} طلب، لكن عملته غير محددة؛ لم
                            أضفه إلى أي مجموع.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {approvedUnlinkedPaymentLines(selected).length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <h5 className="text-xs font-black text-amber-900">
                      دفعات معتمدة غير مطابقة لطلبات هذا العميل
                    </h5>
                    <p className="mt-1 text-[10px] leading-5 text-amber-800">
                      هذه المبالغ لا يطابق رقم تتبعها أي طلب لهذا العميل؛ لذلك تظهر مستقلة ولا تدخل
                      في المدفوع أو المتبقي المحسوب للطلبات.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {approvedUnlinkedPaymentLines(selected).map((line) => (
                        <li
                          key={line.key}
                          className="flex items-center justify-between gap-2 text-sm font-black text-amber-950"
                        >
                          <span>
                            {line.total.toLocaleString("ar-YE")} {line.label}
                          </span>
                          <span className="text-[10px] font-medium">
                            {line.count.toLocaleString("ar-YE")} دفعة معتمدة
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-[10px] leading-5 text-slate-400">
                  الطلبات التي لا تحتوي مبلغًا مسجلًا في total_cost_yer لا يُخمن رصيدها بالريال
                  اليمني؛ وتظهر الدفعات المسجلة أدناه حتى لو تعذر حساب المتبقي.
                </p>
              </section>
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-slate-800">العمليات المالية</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      دفعات العميل مع الحالة ورقم الطلب. تُحتسب المقبوضات المعتمدة فقط.
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {(selected.payments ?? []).length.toLocaleString("ar-YE")} عملية
                  </span>
                </div>
                {(selected.payments ?? []).length === 0 ? (
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    لا توجد عمليات دفع مرتبطة بهذا الحساب. قد تكون الدفعات القديمة بلا user_id أو
                    رقم تتبع مطابق.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {(selected.payments ?? []).slice(0, 20).map((payment) => (
                      <li
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5"
                      >
                        <span dir="ltr" className="font-mono text-xs font-black text-slate-600">
                          {payment.tracking_code || payment.order_tracking || "بدون رقم تتبع"}
                        </span>
                        <span className="text-sm font-black text-slate-800">
                          {numeric(payment.amount)?.toLocaleString("ar-YE") ?? "غير مسجل"}{" "}
                          {payment.currency || ""}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${String(payment.status).toLowerCase() === "approved" ? "bg-emerald-100 text-emerald-700" : String(payment.status).toLowerCase() === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {payment.status || "غير محددة"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(payment.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {(selected.payments ?? []).length > 20 && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    يُعرض أحدث 20 عملية من أصل {(selected.payments ?? []).length}.
                  </p>
                )}
              </section>
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="flex items-center gap-2 font-black text-slate-800">
                    <Package className="size-4 text-orange-500" /> طلبات العميل
                  </h4>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {selected.orders.length.toLocaleString("ar-YE")} طلب
                  </span>
                </div>
                {selected.orders.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    لا توجد طلبات مرتبطة بهذا الحساب في قاعدة البيانات.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {selected.orders.slice(0, 10).map((order) => (
                      <li
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5"
                      >
                        <span dir="ltr" className="font-mono text-xs font-black text-slate-600">
                          {order.tracking_code || `ORD-${order.id.slice(0, 8)}`}
                        </span>
                        <span className="text-xs text-slate-500">
                          {order.status || "الحالة غير مسجلة"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(order.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {selected.orders.length > 10 && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    يُعرض أحدث 10 طلبات من أصل {selected.orders.length}.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CustomersRoute() {
  return (
    <AdminRouteGuard allowStaff redirectTo="/customers">
      <CustomersPageContent />
    </AdminRouteGuard>
  );
}

export default CustomersRoute;
