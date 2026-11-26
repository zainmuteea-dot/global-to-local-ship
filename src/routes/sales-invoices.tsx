import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  Smartphone,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard";
import { checkPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";

/** أيقونة lucide بأي إصدار — بدون الاعتماد على نوع LucideIcon */
type IconComponent = ComponentType<{ className?: string }>;

/* =========================================================
   أنماط سند القبض A5 — مدمجة داخل الملف حتى لا يحتاج
   المشروع أي ملف CSS إضافي (يكفي نسخ هذا الملف وحده).
   ========================================================= */
const RECEIPT_CSS = `/* =========================================================
   فواتير المبيعات — سند قبض A5 (يُستورد بجانب الصفحة)
   Tailwind مسؤول عن الصفحة، وهذا الملف للسند والطباعة فقط
   ========================================================= */

/* =========================================================
   سند القبض — نافذة A5 للطباعة
   ========================================================= */
.si-act--print {
  width: auto;
  padding: 0 10px;
  gap: 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  background: var(--si-beige);
  border-color: var(--si-beige-line);
  color: #8A5A24;
}
.si-act--print:hover { background: #FFF6E7; color: #7A4C1B; }

.si-receipt-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: none;
  place-items: center;
  padding: 28px 16px;
  overflow-y: auto;
  background: rgba(11, 58, 102, 0.42);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}
.si-receipt-overlay:target,
.si-receipt-overlay--open { display: flex; align-items: flex-start; justify-content: center; }

.si-receipt-wrap { width: 148mm; max-width: 100%; }

.si-receipt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.si-receipt-toolbar span { color: #EAF1F8; font-size: 11.5px; font-weight: 700; }
.si-receipt-close,
.si-receipt-print {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
}
.si-receipt-close { background: rgba(255, 255, 255, 0.16); color: #FFFFFF; border-color: rgba(255, 255, 255, 0.28); }
.si-receipt-print { background: var(--si-beige); color: #8A5A24; border-color: var(--si-beige-line-2); }
.si-receipt-close svg, .si-receipt-print svg { width: 15px; height: 15px; }

.si-receipt {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-height: 196mm;
  padding: 11mm 10mm 8mm;
  background: #FFFDF8;
  border: 1px solid #EBDCC2;
  border-radius: 12px;
  box-shadow: 0 30px 80px rgba(11, 58, 102, 0.28);
  color: var(--si-navy);
  font-size: 11px;
  line-height: 1.65;
}
.si-receipt svg { stroke: currentColor; }

.si-rc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 9px;
  border-bottom: 2px solid var(--si-navy);
}
.si-rc-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
.si-rc-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex: none;
  background: #FFFFFF;
  border: 1px solid #EFE3D0;
  border-radius: 9px;
  padding: 3px;
}
.si-rc-brand b { display: block; font-size: 15px; font-weight: 900; line-height: 1.4; }
.si-rc-brand small { display: block; font-size: 8px; font-weight: 700; letter-spacing: 1.4px; color: #8A9AAB; direction: ltr; }

.si-rc-title { text-align: left; flex: none; }
.si-rc-title h2 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.3px; }
.si-rc-no { display: block; font-size: 9.5px; font-weight: 700; color: #8A9AAB; direction: ltr; text-align: left; }
.si-rc-status {
  display: inline-flex;
  align-items: center;
  margin-top: 3px;
  padding: 1px 8px;
  border-radius: 6px;
  border: 1px solid;
  font-size: 9px;
  font-weight: 900;
}
.si-rc-status--partial { background: #FDECEC; border-color: #EFC4C1; color: #B42332; }
.si-rc-status--paid { background: #EAF6EF; border-color: #B9DECB; color: #0E7C5A; }
.si-rc-status--unpaid { background: #FDECEC; border-color: #EFC4C1; color: #B42332; }

.si-rc-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 16px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #E7D9C2;
}
.si-rc-meta > div { display: flex; align-items: baseline; gap: 6px; font-size: 10.5px; }
.si-rc-meta dt { color: #8A9AAB; font-weight: 700; flex: none; }
.si-rc-meta dd { margin: 0; font-weight: 800; color: var(--si-navy); min-width: 0; overflow-wrap: anywhere; }
.si-rc-meta dd.ltr { direction: ltr; }

.si-rc-table { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #EFE3D0; border-radius: 8px; overflow: hidden; }
.si-rc-table th {
  padding: 7px 10px;
  background: var(--si-beige);
  color: #8A5A24;
  font-size: 10.5px;
  font-weight: 900;
  text-align: right;
  border-bottom: 1px solid #EFE3D0;
}
.si-rc-table td { padding: 7px 10px; border-bottom: 1px solid #F5ECDD; color: #3B4E63; }
.si-rc-table tr:last-child td { border-bottom: 0; }
.si-rc-table td:last-child { text-align: left; font-weight: 800; color: var(--si-navy); font-variant-numeric: tabular-nums; white-space: nowrap; }
.si-rc-table tr.si-rc-row-due td { background: #FEF6F5; color: #B42332; }
.si-rc-table tr.si-rc-row-due td:last-child { color: #B42332; }
.si-rc-table tr.si-rc-row-total td { background: #FBF6EC; font-weight: 900; }

.si-rc-note { margin: 0; font-size: 9.5px; font-weight: 700; color: #8A9AAB; }

.si-rc-signs { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: auto; padding-top: 16px; }
.si-rc-sign { text-align: center; }
.si-rc-sign i { display: block; height: 26px; border-bottom: 1px dashed #D9C7A9; margin-bottom: 5px; }
.si-rc-sign b { display: block; font-size: 10px; font-weight: 800; color: #6B7E92; }

.si-rc-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding-top: 8px;
  border-top: 1px solid #EFE3D0;
}
.si-rc-barcode { display: block; width: 100%; height: 46px; }
.si-rc-barcode svg { display: block; width: 100%; height: 46px; }
.si-rc-tracking { font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px; color: #536579; direction: ltr; }

/* دفعات الطلب داخل السند */
.si-rc-pays-wrap { margin-top: 2px; }
.si-rc-sub {
  margin: 0 0 5px;
  font-size: 9.5px;
  font-weight: 900;
  color: #8A5A24;
  letter-spacing: .2px;
}
.si-rc-pays { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.si-rc-pays th {
  padding: 4px 8px;
  text-align: right;
  font-weight: 800;
  color: #8A9AAB;
  background: #FCF7EE;
  border-bottom: 1px solid #EFE3D0;
}
.si-rc-pays td { padding: 5px 8px; border-bottom: 1px solid #F5ECDD; color: #3B4E63; }
.si-rc-pays tr:last-child td { border-bottom: 0; }
.si-rc-pays td:last-child { text-align: left; font-weight: 800; color: var(--si-navy); white-space: nowrap; font-variant-numeric: tabular-nums; }
.si-rc-empty-note { margin: 0; font-size: 9.5px; font-weight: 700; color: #9AA5B1; }

/* الطباعة: السند وحده */
@media print {
  @page { size: A5; margin: 8mm; }
  html, body { background: #FFFFFF !important; }
  .si-page-root { padding: 0 !important; min-height: 0 !important; background: #FFFFFF !important; }

  /* عند فتح السند: اخفِ كل محتوى الصفحة واطبع السند فقط */
  .si-page-root:has(.si-receipt-overlay--open) > *:not(.si-receipt-overlay) { display: none !important; }
  .si-receipt-toolbar { display: none !important; }

  .si-receipt-overlay--open,
  .si-receipt-overlay:target {
    position: static !important;
    display: block !important;
    padding: 0 !important;
    background: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    overflow: visible !important;
  }
  .si-receipt-wrap { width: auto !important; max-width: none !important; }
  .si-receipt {
    position: static !important;
    width: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #FFFFFF !important;
  }
}

@media (max-width: 640px) {
  .si-receipt-overlay { padding: 12px 8px; }
  .si-receipt { padding: 8mm 6mm 6mm; min-height: 0; }
  .si-rc-meta { grid-template-columns: 1fr; }
  .si-rc-signs { gap: 12px; }
}

.si-rc-status--unknown { background: #F1F4F8; border-color: #D9E1EA; color: #5B6B7C; }
`;

export const Route = createFileRoute("/sales-invoices")({
  component: GuardedSalesInvoicesPage,
});

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client: string | null;
  tracking_code: string | null;
  total: number | string | null;
  total_yer: number | string | null;
  paid_yer?: number | null;
  remaining_yer?: number | null;
  deposit_due_yer: number | string | null;
  created_at: string | null;
  order_id: string | null;
  user_id: string | null;
  created_by: string | null;
  customer_phone?: string | null;
  /** طرق الدفع المعتمدة المرتبطة بهذا الطلب (بعد التطبيع) */
  payment_methods?: string[];
  source?: "invoice" | "order";
};
type InvoiceForm = {
  client: string;
  trackingCode: string;
  total: string;
  totalYer: string;
  depositDueYer: string;
  customerUserId: string;
  orderId: string;
};
type PaymentLite = { id: string; method: string; amount: number };
type MethodFilter = "all" | string;

const COLUMNS =
  "id, invoice_number, client, tracking_code, total, total_yer, deposit_due_yer, created_at, order_id, user_id, created_by";
const EMPTY_FORM: InvoiceForm = {
  client: "",
  trackingCode: "",
  total: "",
  totalYer: "",
  depositDueYer: "",
  customerUserId: "",
  orderId: "",
};
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const amount = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const money = (value: number | string | null | undefined, digits = 2) =>
  amount(value).toLocaleString("en-US", { maximumFractionDigits: digits });
const dateLabel = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("ar-YE-u-nu-latn");
};

const sumComplete = (
  rows: InvoiceRow[],
  field: "total_yer" | "paid_yer" | "remaining_yer",
) => {
  if (rows.length === 0 || rows.some((row) => row[field] == null)) return null;
  return rows.reduce((sum, row) => sum + amount(row[field]), 0);
};

const yerLabel = (value: number | string | null | undefined) =>
  value == null ? "غير مسجل" : `${money(value, 0)} ر.ي`;

/* =========================================================
   طرق الدفع — مفتاح موحّد + أسماء بديلة شائعة
   عدّل aliases حسب ما يُخزَّن فعليًا في payments.payment_method
   ========================================================= */
const PAYMENT_METHODS: {
  key: string;
  label: string;
  aliases: string[];
  Icon: IconComponent;
}[] = [
  { key: "najm", label: "النجم", aliases: ["najm", "alnajm", "al-najm", "najm cash", "النجم", "نجم"], Icon: Star },
  { key: "karimi", label: "الكريمي", aliases: ["karimi", "kuraimi", "al-kuraimi", "alkuraimi", "الكريمي", "كريمي"], Icon: Landmark },
  { key: "onecash", label: "ون كاش", aliases: ["onecash", "one cash", "one-cash", "ون كاش", "ونكاش", "one"], Icon: Wallet },
  { key: "jawali", label: "جوالي", aliases: ["jawali", "jawaly", "jawal", "جوالي", "جوال"], Icon: Smartphone },
  { key: "floosak", label: "فلوسك", aliases: ["floosak", "floosak", "floosak cash", "فلوسك", "فلوس"], Icon: Banknote },
  { key: "jaib", label: "جيب", aliases: ["jaib", "jayb", "jeeb", "جيب"], Icon: CreditCard },
];

const METHOD_ALIASES = new Map<string, string>();
PAYMENT_METHODS.forEach((method) => {
  METHOD_ALIASES.set(method.key.toLowerCase(), method.key);
  method.aliases.forEach((alias) => METHOD_ALIASES.set(alias.trim().toLowerCase(), method.key));
});
const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.key, method.label]),
);
const METHOD_ICON: Record<string, IconComponent> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.key, method.Icon]),
);

/** يحوّل أي قيمة قادمة من payments.payment_method إلى مفتاح موحّد */
function normalizeMethod(raw: unknown): string | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  return METHOD_ALIASES.get(value) ?? null;
}

type Balances = {
  rows: InvoiceRow[];
  methodTotals: Record<string, number>;
  paymentsByOrder: Record<string, PaymentLite[]>;
  otherTotal: number;
};

async function attachOrderBalances(rows: InvoiceRow[]): Promise<Balances> {
  // order_id is the only key used to connect an invoice/order to its payments.
  // Tracking strings are deliberately not used for payment matching.
  const orderIds = Array.from(
    new Set(
      rows.map((row) => row.order_id).filter((id): id is string => Boolean(id)),
    ),
  );
  const methodTotals: Record<string, number> = {};
  const paymentsByOrder: Record<string, PaymentLite[]> = {};
  if (orderIds.length === 0) {
    return {
      rows: rows.map((row) => ({
        ...row,
        total_yer: null,
        paid_yer: null,
        remaining_yer: null,
        payment_methods: [],
      })),
      methodTotals,
      paymentsByOrder,
      otherTotal: 0,
    };
  }

  const db = supabase as any;
  const { data: orderRows, error: ordersError } = await db
    .from("orders")
    .select("id, total_cost_yer, customer_phone")
    .in("id", orderIds);

  // customer_phone قد لا يكون موجودًا في بعض قواعد البيانات؛ نعيد المحاولة بدونه.
  let safeOrderRows: any[] | null = orderRows ?? null;
  if (ordersError) {
    const retry = await db.from("orders").select("id, total_cost_yer").in("id", orderIds);
    if (retry.error) {
      console.error(
        "Could not load linked orders for invoice balances:",
        ordersError,
      );
      return {
        rows: rows.map((row) => ({
          ...row,
          total_yer: null,
          paid_yer: null,
          remaining_yer: null,
          payment_methods: [],
        })),
        methodTotals,
        paymentsByOrder,
        otherTotal: 0,
      };
    }
    safeOrderRows = retry.data ?? [];
  }

  const orderById = new Map<string, any>(
    (safeOrderRows ?? []).map((order: any) => [String(order.id), order]),
  );
  const paidByOrderId = new Map<string, number>();
  const methodsByOrderId = new Map<string, Set<string>>();
  const invalidOrderIds = new Set<string>();
  let otherTotal = 0;
  const paymentPageSize = 1000;

  try {
    // Chunk IDs to keep PostgREST URLs bounded, and paginate to avoid silently
    // truncating an order's approved payment history at the API row cap.
    for (let idStart = 0; idStart < orderIds.length; idStart += 100) {
      const idChunk = orderIds.slice(idStart, idStart + 100);
      for (let from = 0; ; from += paymentPageSize) {
        const { data: paymentRows, error: paymentsError } = await db
          .from("payments")
          .select("id, order_id, amount, payment_method")
          .in("order_id", idChunk)
          .eq("status", "approved")
          .order("order_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + paymentPageSize - 1);

        if (paymentsError) throw paymentsError;

        for (const payment of paymentRows ?? []) {
          const orderId = String(payment.order_id ?? "");
          const value = Number(payment.amount);
          if (!idChunk.includes(orderId)) continue;
          if (!Number.isFinite(value)) {
            invalidOrderIds.add(orderId);
            continue;
          }
          paidByOrderId.set(orderId, (paidByOrderId.get(orderId) ?? 0) + value);

          const methodKey = normalizeMethod(payment.payment_method);
          const methodLabel = methodKey
            ? METHOD_LABEL[methodKey]
            : String(payment.payment_method ?? "").trim() || "غير محدد";
          if (methodKey) {
            methodTotals[methodKey] = (methodTotals[methodKey] ?? 0) + value;
          } else {
            otherTotal += value;
          }
          const bucket = methodsByOrderId.get(orderId) ?? new Set<string>();
          if (methodKey) bucket.add(methodKey);
          methodsByOrderId.set(orderId, bucket);

          paymentsByOrder[orderId] = [
            ...(paymentsByOrder[orderId] ?? []),
            {
              id: String(payment.id ?? `${orderId}-${(paymentsByOrder[orderId] ?? []).length}`),
              method: methodLabel,
              amount: value,
            },
          ];
        }

        if ((paymentRows ?? []).length < paymentPageSize) break;
      }
    }
  } catch (paymentsError) {
    console.error(
      "Could not load approved payments by order_id:",
      paymentsError,
    );
    return {
      rows: rows.map((row) => {
        const order = row.order_id ? orderById.get(row.order_id) : null;
        return {
          ...row,
          total_yer: order?.total_cost_yer ?? null,
          paid_yer: null,
          remaining_yer: null,
          payment_methods: [],
        };
      }),
      methodTotals,
      paymentsByOrder,
      otherTotal,
    };
  }

  return {
    rows: rows.map((row) => {
      if (!row.order_id) {
        return {
          ...row,
          total_yer: null,
          paid_yer: null,
          remaining_yer: null,
          payment_methods: [],
        };
      }

      const order = orderById.get(row.order_id);
      const total =
        order?.total_cost_yer == null ? null : Number(order.total_cost_yer);
      const hasValidTotal = total !== null && Number.isFinite(total);
      const paid = invalidOrderIds.has(row.order_id)
        ? null
        : (paidByOrderId.get(row.order_id) ?? 0);

      return {
        ...row,
        customer_phone: order?.customer_phone ?? row.customer_phone ?? null,
        payment_methods: Array.from(methodsByOrderId.get(row.order_id) ?? []),
        // The order's total_cost_yer is the sole source of the displayed total.
        total_yer: hasValidTotal ? total : null,
        paid_yer: paid,
        remaining_yer:
          hasValidTotal && paid !== null ? Math.max(0, total - paid) : null,
      };
    }),
    methodTotals,
    paymentsByOrder,
    otherTotal,
  };
}

function GuardedSalesInvoicesPage() {
  return (
    <PermissionRouteGuard area="finance" action="view" allowStaff redirectTo="/sales-invoices">
      <SalesInvoicesPage />
    </PermissionRouteGuard>
  );
}

function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [methodTotals, setMethodTotals] = useState<Record<string, number>>({});
  const [otherMethodTotal, setOtherMethodTotal] = useState(0);
  const [paymentsByOrder, setPaymentsByOrder] = useState<Record<string, PaymentLite[]>>({});
  const [receiptInvoice, setReceiptInvoice] = useState<InvoiceRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<"order" | "invoice" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canIssueInvoice, setCanIssueInvoice] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    let active = true;
    const verifyAdmin = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        if (active) setCanIssueInvoice(false);
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });
      if (active) setCanIssueInvoice(!error && data === true);
      try {
        const [manage, remove] = await Promise.all([
          checkPermission("finance", "manage"),
          checkPermission("finance", "delete"),
        ]);
        if (active) {
          setCanManage(manage === true);
          setCanDelete(remove === true);
        }
      } catch (permissionError) {
        console.error("Could not resolve finance permissions:", permissionError);
        if (active) {
          setCanManage(false);
          setCanDelete(false);
        }
      }
    };
    void verifyAdmin();
    return () => {
      active = false;
    };
  }, []);

  /* نافذة السند: إغلاق بـ Escape + منع تمرير الخلفية */
  useEffect(() => {
    if (!receiptInvoice) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReceiptInvoice(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [receiptInvoice]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const db = supabase as any;
    const [invoiceResult, orderResult] = await Promise.all([
      db.from("sales_invoices").select(COLUMNS).order("created_at", { ascending: false }).limit(200),
      db.from("orders")
        .select("id, tracking_code, customer_name, user_id, total_cost_yer, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (invoiceResult.error) {
      console.error("Failed to load sales invoices:", invoiceResult.error);
      setInvoices([]);
      setErrorMessage("تعذر تحميل فواتير المبيعات. تحقق من اتصال Supabase وسياسات RLS.");
      setLoading(false);
      return;
    }
    if (orderResult.error) {
      console.error("Failed to load orders for sales invoices:", orderResult.error);
      setInvoices([]);
      setErrorMessage("تعذر تحميل الطلبات المرتبطة بالفواتير.");
      setLoading(false);
      return;
    }

    const orderRows = (orderResult.data ?? []) as any[];
    const orderByTrackingCode = new Map<string, any>();
    for (const order of orderRows) {
      const code = String(order.tracking_code ?? "").trim();
      if (code) orderByTrackingCode.set(code, order);
    }
    const invoiceRows = (invoiceResult.data ?? []).map((row: InvoiceRow) => {
      const exactOrder = row.order_id
        ? null
        : orderByTrackingCode.get(String(row.tracking_code ?? "").trim());
      return {
        ...row,
        order_id: row.order_id ?? (exactOrder?.id ? String(exactOrder.id) : null),
        source: "invoice" as const,
      };
    });
    const invoiceOrderIds = new Set(
      invoiceRows.map((row: InvoiceRow) => row.order_id).filter((id: string | null): id is string => Boolean(id)),
    );
    const orderInvoices: InvoiceRow[] = orderRows
      .filter((order) => !invoiceOrderIds.has(String(order.id)))
      .map((order) => ({
        id: String(order.id),
        invoice_number: order.tracking_code || `ORD-${order.id}`,
        client: order.customer_name ?? null,
        tracking_code: order.tracking_code ?? null,
        total: null,
        total_yer: order.total_cost_yer ?? null,
        paid_yer: null,
        remaining_yer: null,
        deposit_due_yer: null,
        created_at: order.created_at ?? null,
        order_id: String(order.id),
        user_id: order.user_id ?? null,
        created_by: null,
        source: "order",
      }));

    const balanced = await attachOrderBalances([...invoiceRows, ...orderInvoices]);
    balanced.rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    setInvoices(balanced.rows);
    setMethodTotals(balanced.methodTotals);
    setOtherMethodTotal(balanced.otherTotal);
    setPaymentsByOrder(balanced.paymentsByOrder);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  /** نتائج البحث فقط — تُستخدم لحساب عدّادات طرق الدفع */
  const searchFiltered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return invoices;
    return invoices.filter((row) =>
      [row.invoice_number, row.client, row.tracking_code]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(term)),
    );
  }, [invoices, search]);

  const methodCounts = useMemo(() => {
    const result: Record<string, number> = { all: searchFiltered.length };
    PAYMENT_METHODS.forEach((method) => {
      result[method.key] = searchFiltered.filter((row) =>
        (row.payment_methods ?? []).includes(method.key),
      ).length;
    });
    return result;
  }, [searchFiltered]);

  const filteredInvoices = useMemo(() => {
    if (methodFilter === "all") return searchFiltered;
    return searchFiltered.filter((row) =>
      (row.payment_methods ?? []).includes(methodFilter),
    );
  }, [searchFiltered, methodFilter]);

  const totals = useMemo(
    () => ({
      yer: sumComplete(invoices, "total_yer"),
      paid: sumComplete(invoices, "paid_yer"),
      remaining: sumComplete(invoices, "remaining_yer"),
    }),
    [invoices],
  );

  const methodsTotal = useMemo(
    () => PAYMENT_METHODS.reduce((sum, method) => sum + (methodTotals[method.key] ?? 0), 0),
    [methodTotals],
  );

  const updateForm = (key: keyof InvoiceForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSaveInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    const client = form.client.trim();
    const total = Number(form.total);
    const totalYer = Number(form.totalYer);
    const depositDueYer =
      form.depositDueYer.trim() === "" ? null : Number(form.depositDueYer);
    const customerUserId = form.customerUserId.trim() || null;
    const orderId = form.orderId.trim() || null;
    if (!client) {
      setErrorMessage("أدخل اسم العميل.");
      return;
    }
    const editingOrder = editingId !== null && editingSource === "order";
    if (
      (!editingOrder && (!Number.isFinite(total) || total < 0)) ||
      !Number.isFinite(totalYer) ||
      totalYer < 0
    ) {
      setErrorMessage("أدخل إجماليًا صحيحًا غير سالب بالريال اليمني.");
      return;
    }
    if (editingOrder && !form.trackingCode.trim()) {
      setErrorMessage("رقم الطلب مطلوب ولا يمكن تركه فارغًا.");
      return;
    }
    if (
      depositDueYer !== null &&
      (!Number.isFinite(depositDueYer) || depositDueYer < 0)
    ) {
      setErrorMessage("أدخل مبلغ الدفعة المقدمة بالريال كرقم صحيح غير سالب.");
      return;
    }
    if (customerUserId && !UUID_RE.test(customerUserId)) {
      setErrorMessage(
        "معرّف حساب العميل يجب أن يكون UUID صحيحًا، أو اتركه فارغًا.",
      );
      return;
    }
    if (orderId && !UUID_RE.test(orderId)) {
      setErrorMessage("معرّف الطلب يجب أن يكون UUID صحيحًا، أو اتركه فارغًا.");
      return;
    }
    if (editingId) {
      try {
        if (!(await checkPermission("finance", "manage"))) {
          setErrorMessage("لا تملك صلاحية تعديل فواتير المبيعات.");
          return;
        }
      } catch (permissionError) {
        console.error("Could not verify invoice edit permission:", permissionError);
        setErrorMessage("تعذر التحقق من صلاحية التعديل. لم يتم حفظ التغييرات.");
        return;
      }
    }
    setSaving(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      console.error("Could not identify signed-in admin:", authError);
      setSaving(false);
      setErrorMessage(
        "انتهت جلسة الدخول أو تعذر التحقق منها. سجّل الدخول مجددًا.",
      );
      return;
    }
    if (!editingId) {
      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });
      if (roleError || isAdmin !== true) {
        setSaving(false);
        setErrorMessage("إصدار الفواتير متاح للمدير فقط حاليًا.");
        return;
      }
    }
    const db = supabase as any;
    const values = {
      client,
      tracking_code: form.trackingCode.trim() || null,
      total,
      total_yer: totalYer,
      deposit_due_yer: depositDueYer,
      user_id: customerUserId,
      order_id: orderId,
      updated_at: new Date().toISOString(),
    };
    const result = editingId && editingSource === "order"
      ? await db.from("orders").update({
          customer_name: client,
          tracking_code: form.trackingCode.trim(),
          total_cost_yer: totalYer,
          updated_at: new Date().toISOString(),
        }).eq("id", editingId)
      : editingId
        ? await db.from("sales_invoices").update(values).eq("id", editingId)
        : await db
            .from("sales_invoices")
            .insert({ ...values, created_by: authData.user.id });
    setSaving(false);
    if (result.error) {
      console.error("Failed to save sales invoice:", result.error);
      setErrorMessage(
        "لم تُحفظ الفاتورة. تأكد من الأعمدة وسياسات RLS وأن حسابك يحمل دور المدير، ثم أعد المحاولة.",
      );
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditingSource(null);
    setShowAddModal(false);
    setSuccessMessage(
      editingId
        ? "تم تحديث الفاتورة في قاعدة البيانات."
        : "تم حفظ الفاتورة في قاعدة البيانات.",
    );
    await loadInvoices();
  };

  const startEditing = async (row: InvoiceRow) => {
    try {
      if (!(await checkPermission("finance", "manage"))) {
        setErrorMessage("لا تملك صلاحية تعديل فواتير المبيعات.");
        return;
      }
    } catch (permissionError) {
      console.error("Could not verify invoice edit permission:", permissionError);
      setErrorMessage("تعذر التحقق من صلاحية التعديل. حاول مرة أخرى.");
      return;
    }
    setEditingId(row.id);
    setEditingSource(row.source ?? "invoice");
    setForm({
      client: row.client ?? "",
      trackingCode: row.tracking_code ?? "",
      total: row.total == null ? "" : String(row.total),
      totalYer: row.total_yer == null ? "" : String(row.total_yer),
      depositDueYer:
        row.deposit_due_yer == null ? "" : String(row.deposit_due_yer),
      customerUserId: row.user_id ?? "",
      orderId: row.order_id ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setShowAddModal(true);
  };

  const deleteInvoice = async (row: InvoiceRow) => {
    try {
      if (!(await checkPermission("finance", "delete"))) {
        setErrorMessage("لا تملك صلاحية حذف فواتير المبيعات.");
        return;
      }
    } catch (permissionError) {
      console.error("Could not verify invoice delete permission:", permissionError);
      setErrorMessage("تعذر التحقق من صلاحية الحذف. لم يتم حذف الفاتورة.");
      return;
    }
    if (
      !window.confirm(
        row.source === "order"
          ? `سيُحذف الطلب ${row.invoice_number} فعليًا من سجل الطلبات. قد تمنع علاقة الدفعات الحذف. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟`
          : `هل أنت متأكد من حذف الفاتورة ${row.invoice_number}؟ لا يمكن التراجع عن الحذف.`,
      )
    )
      return;
    setErrorMessage("");
    setSuccessMessage("");
    const db = supabase as any;
    if (row.source === "order") {
      const { count: paymentCount, error: paymentCheckError } = await db
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("order_id", row.id);
      if (paymentCheckError || (paymentCount ?? 0) > 0) {
        setErrorMessage(paymentCheckError
          ? "تعذر التحقق من سجل الدفعات؛ أُوقف حذف الطلب حفاظًا على السجل المالي."
          : "لا يمكن حذف طلب له سجل دفعات. عالج السجل المالي يدويًا قبل أي حذف.");
        return;
      }
      const { count: linkedInvoiceCount, error: invoiceCheckError } = await db
        .from("sales_invoices")
        .select("id", { count: "exact", head: true })
        .eq("order_id", row.id);
      if (invoiceCheckError || (linkedInvoiceCount ?? 0) > 0) {
        setErrorMessage(invoiceCheckError
          ? "تعذر التحقق من الفواتير المرتبطة؛ أُوقف حذف الطلب حفاظًا على السجلات."
          : "لا يمكن حذف طلب مرتبط بفاتورة محفوظة. احذف أو عالج الفاتورة وفق الصلاحية أولًا.");
        return;
      }
    }
    const { error } = row.source === "order"
      ? await db.from("orders").delete().eq("id", row.id)
      : await db.from("sales_invoices").delete().eq("id", row.id);
    if (error) {
      console.error("Failed to delete sales invoice/order:", error);
      setErrorMessage(row.source === "order"
        ? "تعذر حذف الطلب. قد تمنعه سياسات RLS أو علاقة قاعدة البيانات. لم تُحذف بيانات أخرى."
        : "تعذر حذف الفاتورة. تحقق من صلاحية الحذف وسياسة RLS.");
      return;
    }
    setSuccessMessage(row.source === "order" ? "تم حذف الطلب." : "تم حذف الفاتورة.");
    await loadInvoices();
  };

  const shareInvoice = (row: InvoiceRow) => {
    const text = [
      `فاتورة مبيعات: ${row.invoice_number}`,
      row.client ? `العميل: ${row.client}` : "",
      row.tracking_code ? `كود الشحنة: ${row.tracking_code}` : "",
      `الإجمالي بالريال اليمني: ${yerLabel(row.total_yer)}`,
      `المدفوع بالريال اليمني: ${yerLabel(row.paid_yer)}`,
      `المتبقي عند التسليم: ${yerLabel(row.remaining_yer)}`,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const filters: { key: MethodFilter; label: string; Icon: IconComponent }[] = [
    { key: "all", label: "كل الطرق", Icon: FileText },
    ...PAYMENT_METHODS.map((method) => ({
      key: method.key as MethodFilter,
      label: method.label,
      Icon: method.Icon,
    })),
  ];

  return (
    <div
      dir="rtl"
      className="si-page-root min-h-[100dvh] bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 font-['Cairo',sans-serif] md:p-8"
    >
      <style>{RECEIPT_CSS}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="رجوع"
              className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            >
              <ArrowRight className="size-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-black text-[#0F4C81] md:text-2xl">
                <Receipt className="size-6 text-[#F97316]" /> فواتير المبيعات
              </h1>
              <p className="text-xs font-medium text-slate-500 md:text-sm">
                طلبات المتجر والفواتير المحفوظة، مع حساب الدفعات المعتمدة من payments.order_id.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadInvoices()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              تحديث
            </button>
            {canIssueInvoice && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditingSource(null);
                  setForm(EMPTY_FORM);
                  setErrorMessage("");
                  setSuccessMessage("");
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-[#0F4C81] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0c3c66]"
              >
                <Plus className="size-4" /> إصدار فاتورة
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="طباعة"
              className="rounded-xl bg-slate-100 p-2.5 text-slate-700 transition hover:bg-slate-200"
            >
              <Printer className="size-5" />
            </button>
          </div>
        </header>
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="إغلاق"
              className="font-black"
            >
              ×
            </button>
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          >
            {successMessage}
          </div>
        )}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[#0F4C81]">
              <span className="text-xs font-bold">
                إجمالي الفواتير بالريال اليمني
              </span>
              <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-[#0F4C81]"><Wallet className="size-4" /></span>
            </div>
            <div className="whitespace-nowrap text-xl font-black text-slate-900 sm:text-2xl">
              {loading
                ? "…"
                : totals.yer == null
                  ? "بيانات غير مكتملة"
                  : yerLabel(totals.yer)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {invoices.length} فاتورة أو طلب محمّل
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold">
                المبلغ المدفوع بالريال اليمني
              </span>
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-4" /></span>
            </div>
            <div className="whitespace-nowrap text-xl font-black text-emerald-800 sm:text-2xl">
              {loading
                ? "…"
                : totals.paid == null
                  ? "بيانات غير مكتملة"
                  : yerLabel(totals.paid)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              الدفعات المعتمدة أو المسجلة فقط
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold">
                المتبقي عند التسليم بالريال اليمني
              </span>
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock className="size-4" /></span>
            </div>
            <div className="whitespace-nowrap text-xl font-black text-amber-700 sm:text-2xl">
              {loading
                ? "…"
                : totals.remaining == null
                  ? "بيانات غير مكتملة"
                  : yerLabel(totals.remaining)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              لا يُحتسب من مبالغ غير مرتبطة بالطلب
            </p>
          </div>
        </section>

        {/* ===== طرق الدفع ===== */}
        <section
          aria-labelledby="payment-methods-title"
          className="rounded-2xl border border-[#F2E6D3] bg-[#FFFAF1] p-4 shadow-sm md:p-5"
        >
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E6D3] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl border border-[#F0E3CF] bg-white text-[#9A6B2F]">
                <CreditCard className="size-4" />
              </span>
              <div>
                <h2
                  id="payment-methods-title"
                  className="text-sm font-black text-[#0B3A66] md:text-base"
                >
                  طرق الدفع
                </h2>
                <p className="text-[11px] font-semibold text-slate-500">
                  إجمالي المدفوع لكل طريقة من جدول payments (الحالة: معتمد)
                </p>
              </div>
            </div>
            <span className="inline-flex items-baseline gap-1.5 rounded-full border border-[#F0E3CF] bg-white px-3 py-1 text-[11px] font-bold text-[#0B3A66]">
              الإجمالي المدفوع
              <b className="text-xs font-black text-emerald-700">
                {loading ? "…" : `${money(methodsTotal, 0)} ر.ي`}
              </b>
            </span>
          </header>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
            {PAYMENT_METHODS.map((method) => {
              const value = methodTotals[method.key] ?? 0;
              const isZero = value === 0;
              const Icon = method.Icon;
              return (
                <article
                  key={method.key}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition ${
                    isZero
                      ? "border-dashed border-[#EFE5D6] bg-[#FDFBF7] opacity-70"
                      : "border-[#F0E3CF] bg-[#FFFDF8] hover:border-[#E7D6B8] hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-lg border ${
                      isZero
                        ? "border-[#EFE8DC] bg-[#F7F4EE] text-slate-400"
                        : "border-[#F0E1C9] bg-[#F8EEDD] text-[#8A6A45]"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span
                    title={`مدفوع عبر ${method.label}`}
                    className={`text-[11px] font-bold leading-5 sm:text-xs ${
                      isZero ? "text-slate-400" : "text-[#0B3A66]"
                    }`}
                  >
                    {method.label}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[11px] font-black tabular-nums sm:text-sm ${
                      isZero ? "text-slate-400" : "text-[#0B3A66]"
                    }`}
                  >
                    {loading ? "…" : money(value, 0)}
                    <span className="ms-1 text-[10px] font-bold text-slate-500">ر.ي</span>
                  </span>
                </article>
              );
            })}
          </div>
          {otherMethodTotal > 0 && (
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              يوجد {money(otherMethodTotal, 0)} ر.ي بطريقة دفع غير مصنّفة — أضف اسمها في
              aliases داخل PAYMENT_METHODS.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ابحث برقم الفاتورة أو كود الشحنة أو اسم العميل..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-medium outline-none transition focus:border-[#0F4C81] focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FileText className="size-4" /> عرض {filteredInvoices.length} من{" "}
            {searchFiltered.length} فاتورة
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* ===== تصفية حسب طريقة الدفع ===== */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg border border-[#F4E6D0] bg-[#FDF6EC] text-[#9A6B2F]">
                <CreditCard className="size-4" />
              </span>
              <h3 className="text-xs font-black text-[#0F4C81] md:text-sm">
                تصفية حسب طريقة الدفع
              </h3>
            </div>
            <div
              role="group"
              aria-label="تصفية حسب طريقة الدفع"
              className="flex flex-wrap items-center gap-1.5"
            >
              {filters.map((item) => {
                const active = methodFilter === item.key;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMethodFilter(item.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                      active
                        ? "border-[#EADDC6] bg-[#FFFAF1] text-[#0B3A66] shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#0F4C81]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                    <span
                      className={`min-w-[20px] rounded-md px-1.5 text-[10px] font-black tabular-nums ${
                        active ? "bg-white text-[#8A5A24]" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {methodCounts[item.key] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead className="border-b border-sky-100 bg-[#0F4C81]/5 text-xs font-bold text-[#0F4C81]">
                <tr>
                  <th className="px-4 py-3">رقم الفاتورة</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">طريقة الدفع</th>
                  <th className="px-4 py-3">كود الشحنة</th>
                  <th className="px-4 py-3 text-center">الإجمالي بالريال</th>
                  <th className="px-4 py-3 text-center">المدفوع</th>
                  <th className="px-4 py-3 text-center">المتبقي عند التسليم</th>
                  <th className="px-4 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> جارٍ تحميل
                        الفواتير...
                      </span>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-500"
                    >
                      {invoices.length
                        ? methodFilter === "all"
                          ? "لا توجد نتائج مطابقة للبحث."
                          : "لا توجد فواتير بهذه الطريقة. جرّب طريقة دفع ثانية أو ارجع لكل الطرق."
                        : "لا توجد فواتير محفوظة في قاعدة البيانات."}
                      {invoices.length > 0 && methodFilter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setMethodFilter("all")}
                          className="mt-3 block w-full text-xs font-bold text-[#0F4C81] underline decoration-dotted underline-offset-4"
                        >
                          عرض كل الطرق
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((row) => (
                    <tr
                      key={row.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5">
                        <div className="whitespace-nowrap font-mono font-bold text-[#0F4C81]">
                          {row.invoice_number}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {dateLabel(row.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.client || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {(row.payment_methods ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(row.payment_methods ?? []).map((key) => {
                              const Icon = METHOD_ICON[key] ?? CreditCard;
                              return (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#F3E4CB] bg-[#FFF8EC] px-2 py-0.5 text-[11px] font-bold text-[#8A5A24]"
                                >
                                  <Icon className="size-3" />
                                  {METHOD_LABEL[key] ?? key}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            بدون دفعة معتمدة
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded bg-sky-50 px-2 py-0.5 font-mono text-xs font-bold text-[#0F4C81]">
                          {row.tracking_code || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-black text-slate-900">
                        {yerLabel(row.total_yer)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                        {yerLabel(row.paid_yer)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700">
                        {yerLabel(row.remaining_yer)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-1.5">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => void startEditing(row)}
                              title={row.source === "order" ? "تعديل الطلب" : "تعديل الفاتورة"}
                              aria-label={`تعديل ${row.source === "order" ? "الطلب" : "الفاتورة"} ${row.invoice_number}`}
                              className="rounded-lg bg-sky-50 p-1.5 text-sky-700 transition hover:bg-sky-100"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void deleteInvoice(row)}
                              title={row.source === "order" ? "حذف الطلب" : "حذف الفاتورة"}
                              aria-label={`حذف ${row.source === "order" ? "الطلب" : "الفاتورة"} ${row.invoice_number}`}
                              className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => shareInvoice(row)}
                            title="مشاركة على واتساب"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Share2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceiptInvoice(row)}
                            title="طباعة سند قبض"
                            aria-label={`طباعة سند قبض الفاتورة ${row.invoice_number}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#F2E6D3] bg-[#FFFAF1] px-2 py-1.5 text-[11px] font-bold text-[#8A5A24] transition hover:bg-[#FFF4E3]"
                          >
                            <Printer className="size-4" /> طباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="invoice-dialog-title"
              className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2
                  id="invoice-dialog-title"
                  className="flex items-center gap-2 text-lg font-black text-[#0F4C81]"
                >
                  <Receipt className="size-5 text-[#F97316]" />{" "}
                  {editingId ? (editingSource === "order" ? "تعديل الطلب" : "تعديل فاتورة المبيعات") : "إصدار فاتورة مبيعات"}
                </h2>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingId(null); setEditingSource(null); }}
                  aria-label="إغلاق"
                  className="flex size-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSaveInvoice} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    اسم العميل
                    <input
                      required
                      maxLength={200}
                      value={form.client}
                      onChange={(e) => updateForm("client", e.target.value)}
                      placeholder="اسم العميل"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    كود الشحنة (اختياري)
                    <input
                      maxLength={100}
                      value={form.trackingCode}
                      onChange={(e) =>
                        updateForm("trackingCode", e.target.value)
                      }
                      placeholder="SQ-..."
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  {editingSource !== "order" && (
                    <label className="text-xs font-bold text-slate-600">
                      الإجمالي بالدولار
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={form.total}
                        onChange={(e) => updateForm("total", e.target.value)}
                        placeholder="0.00"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                      />
                    </label>
                  )}
                  <label className="text-xs font-bold text-slate-600">
                    الإجمالي بالريال اليمني
                    <input
                      required
                      min="0"
                      step="1"
                      type="number"
                      value={form.totalYer}
                      onChange={(e) => updateForm("totalYer", e.target.value)}
                      placeholder="0"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                    الدفعة المقدمة المطلوبة بالريال (اختياري)
                    <input
                      min="0"
                      step="1"
                      type="number"
                      value={form.depositDueYer}
                      onChange={(e) =>
                        updateForm("depositDueYer", e.target.value)
                      }
                      placeholder="0"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </label>
                </div>
                <details className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-slate-600">
                    ربط الفاتورة بحساب عميل أو طلب (اختياري)
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">
                      معرّف حساب العميل (UUID)
                      <input
                        value={form.customerUserId}
                        onChange={(e) =>
                          updateForm("customerUserId", e.target.value)
                        }
                        placeholder="اتركه فارغًا إن لم يتوفر"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none focus:border-[#0F4C81]"
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      معرّف الطلب (UUID)
                      <input
                        value={form.orderId}
                        onChange={(e) => updateForm("orderId", e.target.value)}
                        placeholder="اتركه فارغًا إن لم يتوفر"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none focus:border-[#0F4C81]"
                      />
                    </label>
                  </div>
                </details>
                <p className="text-[11px] leading-5 text-slate-500">
                  رقم الفاتورة ووقت الإنشاء ينشئهما الجدول تلقائيًا. الحفظ يمر
                  عبر جلسة المستخدم وسياسات RLS. حقول النموذج الحالية محفوظة كما
                  هي؛ عرض قائمة الفواتير بالريال اليمني فقط.
                </p>
                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-800"
                  >
                    {errorMessage}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0F4C81] text-sm font-bold text-white shadow-md transition hover:bg-[#0c3c66] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> جارٍ
                        الحفظ...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />{" "}
                        {editingId ? "حفظ التعديلات" : "حفظ وإصدار الفاتورة"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => { setShowAddModal(false); setEditingId(null); setEditingSource(null); }}
                    className="h-11 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ===== سند قبض A5 — خارج حاوية الصفحة حتى يُطبع وحده ===== */}
      {receiptInvoice && (
        <ReceiptSheet
          invoice={receiptInvoice}
          payments={paymentsByOrder[String(receiptInvoice.order_id ?? "")] ?? []}
          onClose={() => setReceiptInvoice(null)}
        />
      )}
    </div>
  );
}

/* ===================== سند القبض ===================== */
const STORE = {
  name: "السوق الشامل",
  latin: "AL SHAMEL SHOPPING",
  // عدّل المسار إلى شعارك داخل public، واتركه فارغًا لاستخدام اسم المتجر فقط.
  logo: "/shamel-logo.jpg",
};

type ReceiptStatus = "paid" | "partial" | "unpaid" | "unknown";

function ReceiptSheet({
  invoice,
  payments,
  onClose,
}: {
  invoice: InvoiceRow;
  payments: PaymentLite[];
  onClose: () => void;
}) {
  const hasTotal = invoice.total_yer != null && Number.isFinite(Number(invoice.total_yer));
  const hasPaid = invoice.paid_yer != null && Number.isFinite(Number(invoice.paid_yer));
  const total = hasTotal ? Number(invoice.total_yer) : 0;
  const paid = hasPaid ? Number(invoice.paid_yer) : 0;
  const due = hasTotal && hasPaid ? Math.max(total - paid, 0) : 0;

  const status: ReceiptStatus = !hasTotal || !hasPaid
    ? "unknown"
    : paid >= total && total > 0
      ? "paid"
      : paid > 0
        ? "partial"
        : "unpaid";
  const statusText =
    status === "paid"
      ? "مدفوع بالكامل"
      : status === "partial"
        ? "دفعة جزئية"
        : status === "unpaid"
          ? "غير مدفوع"
          : "بيانات غير مكتملة";

  const methodLabel = (invoice.payment_methods ?? [])
    .map((key) => METHOD_LABEL[key] ?? key)
    .join(" · ");
  const tracking = invoice.tracking_code || invoice.invoice_number;
  const paidText = hasPaid ? `${money(paid, 0)} ر.ي` : "غير مسجل";
  const dueText = hasTotal && hasPaid ? `${money(due, 0)} ر.ي` : "غير مسجل";

  return (
    <div
      className="si-receipt-overlay si-receipt-overlay--open"
      role="dialog"
      aria-modal="true"
      aria-label={`سند قبض الفاتورة ${invoice.invoice_number}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="si-receipt-wrap">
        <div className="si-receipt-toolbar">
          <span>معاينة السند · مقاس A5</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="si-receipt-print"
              onClick={() => window.print()}
            >
              <Printer className="size-4" /> طباعة السند
            </button>
            <button type="button" className="si-receipt-close" onClick={onClose}>
              <X className="size-4" /> إغلاق
            </button>
          </div>
        </div>

        <article className="si-receipt">
          <header className="si-rc-head">
            <div className="si-rc-brand">
              {STORE.logo ? (
                <img
                  className="si-rc-logo"
                  src={STORE.logo}
                  alt={`شعار ${STORE.name}`}
                  width={48}
                  height={48}
                />
              ) : null}
              <div>
                <b>{STORE.name}</b>
                <small>{STORE.latin}</small>
              </div>
            </div>
            <div className="si-rc-title">
              <h2>سند قبض</h2>
              <span className="si-rc-no">RECEIPT / {tracking}</span>
              <span className={`si-rc-status si-rc-status--${status}`}>
                {statusText}
              </span>
            </div>
          </header>

          <dl className="si-rc-meta">
            <div>
              <dt>رقم الفاتورة</dt>
              <dd className="ltr">{invoice.invoice_number}</dd>
            </div>
            <div>
              <dt>رقم التتبع</dt>
              <dd className="ltr">{tracking || "—"}</dd>
            </div>
            <div>
              <dt>اسم العميل</dt>
              <dd>{invoice.client || "—"}</dd>
            </div>
            <div>
              <dt>رقم الهاتف</dt>
              <dd className="ltr">{invoice.customer_phone || "—"}</dd>
            </div>
            <div>
              <dt>التاريخ</dt>
              <dd className="ltr">{dateLabel(invoice.created_at)}</dd>
            </div>
            <div>
              <dt>طريقة الدفع</dt>
              <dd>{methodLabel || (payments.length ? payments[0].method : "—")}</dd>
            </div>
          </dl>

          <table className="si-rc-table">
            <thead>
              <tr>
                <th scope="col">البيان</th>
                <th scope="col">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="si-rc-row-total">
                <td>إجمالي الفاتورة</td>
                <td>{hasTotal ? `${money(total, 0)} ر.ي` : "غير مسجل"}</td>
              </tr>
              <tr>
                <td>المبلغ المدفوع</td>
                <td>{paidText}</td>
              </tr>
              <tr className={due > 0 ? "si-rc-row-due" : ""}>
                <td>المتبقي عند التسليم</td>
                <td>{dueText}</td>
              </tr>
            </tbody>
          </table>

          {status === "partial" && (
            <p className="si-rc-note">
              ملاحظة: هذه دفعة جزئية — تم سداد {money(paid, 0)} ر.ي من أصل{" "}
              {money(total, 0)} ر.ي، ويتبقى {money(due, 0)} ر.ي تُستلم عند التسليم.
            </p>
          )}

          <div className="si-rc-pays-wrap">
            <p className="si-rc-sub">الدفعات المعتمدة على الطلب</p>
            {payments.length > 0 ? (
              <table className="si-rc-pays">
                <thead>
                  <tr>
                    <th scope="col">طريقة الدفع</th>
                    <th scope="col">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>دفعت عبر {payment.method}</td>
                      <td>{money(payment.amount, 0)} ر.ي</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="si-rc-empty-note">
                لا توجد دفعات معتمدة مسجلة على هذا الطلب.
              </p>
            )}
          </div>

          <div className="si-rc-signs">
            <div className="si-rc-sign">
              <i />
              <b>توقيع المستلم</b>
            </div>
            <div className="si-rc-sign">
              <i />
              <b>توقيع المحاسب</b>
            </div>
          </div>

          <footer className="si-rc-foot">
            <Barcode value={tracking || invoice.invoice_number} />
            <span className="si-rc-tracking">{tracking || invoice.invoice_number}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}

/* ===================== باركود Code 128B ===================== */
const CODE128_CODES: string[] = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100"
];
const CODE128_STOP = "1100011101011";

/** يبني سلسلة الوحدات (0/1) لباركود Code 128B. */
function code128b(value: string): string {
  const clean = value.replace(/[^\x20-\x7E]/g, "");
  let checksum = 104;
  let bits = CODE128_CODES[104];
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index) - 32;
    bits += CODE128_CODES[code];
    checksum += code * (index + 1);
  }
  bits += CODE128_CODES[checksum % 103];
  return bits + CODE128_STOP;
}

function Barcode({ value }: { value: string }) {
  const bits = code128b(value);
  const quiet = 10;
  const width = bits.length + quiet * 2;
  return (
    <span className="si-rc-barcode">
      <svg
        viewBox={`0 0 ${width} 44`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`باركود رقم التتبع ${value}`}
        shapeRendering="crispEdges"
      >
        {bits.split("").map((bit, index) =>
          bit === "1" ? (
            <rect
              key={index}
              x={quiet + index}
              y={0}
              width={1}
              height={44}
              fill="#0B3A66"
            />
          ) : null,
        )}
      </svg>
    </span>
  );
}

export default GuardedSalesInvoicesPage;
