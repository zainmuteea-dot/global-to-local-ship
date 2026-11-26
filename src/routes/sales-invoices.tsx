import { createPortal } from "react-dom";
import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Banknote,
  BarChart3,
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
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard";
import { checkPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";

/** أيقونة lucide بأي إصدار — بدون الاعتماد على نوع LucideIcon */
type IconComponent = ComponentType<{ className?: string | undefined }>;

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
  product_items?: ProductSaleItem[] | undefined;
  product_items_invalid?: number;
  product_items_error?: boolean;
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
   الملخص الإحصائي الشهري — يُحسب من الصفوف المحمّلة فقط
   ========================================================= */
type MonthSummary = {
  key: string;
  label: string;
  count: number;
  total: number;
  paid: number;
  remaining: number;
  missing: number;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Aden",
});

function monthKeyOf(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Aden", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}

function buildMonthlySummary(rows: InvoiceRow[]): MonthSummary[] {
  const buckets = new Map<
    string,
    MonthSummary & { sampleDate: string }
  >();
  for (const row of rows) {
    const key = monthKeyOf(row.created_at);
    if (!key) continue;
    const bucket =
      buckets.get(key) ?? {
        key,
        label: "",
        count: 0,
        total: 0,
        paid: 0,
        remaining: 0,
        missing: 0,
        sampleDate: row.created_at ?? "",
      };
    bucket.count += 1;
    if (row.total_yer == null || !Number.isFinite(Number(row.total_yer))) bucket.missing += 1;
    else bucket.total += amount(row.total_yer);
    if (row.paid_yer == null || !Number.isFinite(Number(row.paid_yer))) bucket.missing += 1;
    else bucket.paid += amount(row.paid_yer);
    if (row.remaining_yer == null || !Number.isFinite(Number(row.remaining_yer))) bucket.missing += 1;
    else bucket.remaining += amount(row.remaining_yer);
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(({ sampleDate, ...bucket }) => {
      const date = new Date(sampleDate);
      return {
        ...bucket,
        label: Number.isNaN(date.getTime())
          ? bucket.key
          : MONTH_FORMATTER.format(date),
      };
    });
}

function monthShares(month: MonthSummary) {
  if (month.total <= 0 || month.missing > 0) return { paid: 0, rest: 0 };
  const paid = Math.min(100, (month.paid / month.total) * 100);
  const rest = Math.min(100 - paid, (month.remaining / month.total) * 100);
  return { paid, rest };
}

/* تحليل المنتجات: مصدر قابل للتعديل، ولا تُفترض كمية أو قيمة غير مسجلة. */
const PRODUCT_ITEM_SOURCE = {
  table: "order_items", orderId: "order_id", itemId: "id",
  productId: "product_id", variantId: "variant_id", sku: "sku",
  name: "product_name", quantity: "quantity", totalYer: "total_yer",
} as const;

type ProductSaleItem = { key: string; name: string; quantity: number | null; revenue: number | null };
type ProductStat = { key: string; name: string; quantity: number; revenue: number; orders: number; missingQuantity: number; missingRevenue: number };
type ProductMonth = { key: string; label: string; products: ProductStat[]; orders: number; covered: number; missingOrders: number; invalidItems: number; missingQuantity: number; missingRevenue: number };
type ProductAnalysis = { months: ProductMonth[]; duplicates: number; invalidDates: number; unlinked: number; loadError: boolean };

function nonNegativeNumber(value: unknown): number | null {
  if (value == null || (typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeProductItem(raw: Record<string, unknown>): ProductSaleItem | null {
  const cfg = PRODUCT_ITEM_SOURCE;
  const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  const id = text(raw[cfg.productId]);
  const sku = text(raw[cfg.sku]);
  const variant = text(raw[cfg.variantId]);
  // لا ندمج منتجات مختلفة بالاسم وحده، ولا نحول إجمالي الطلب إلى إيراد منتج.
  if (!id && !sku) return null;
  const key = JSON.stringify([id ? "id" : "sku", id || sku, variant]);
  return { key, name: (text(raw[cfg.name]) || (sku ? `SKU: ${sku}` : `منتج ${id}`)) + (variant ? ` / ${variant}` : ""), quantity: nonNegativeNumber(raw[cfg.quantity]), revenue: nonNegativeNumber(raw[cfg.totalYer]) };
}

async function attachProductItems(rows: InvoiceRow[]): Promise<InvoiceRow[]> {
  const ids = [...new Set(rows.map((row) => row.order_id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return rows;
  const byOrder = new Map<string, ProductSaleItem[]>();
  const invalid = new Map<string, number>();
  const seen = new Set<string>();
  try {
    const cfg = PRODUCT_ITEM_SOURCE;
    // دفعات صغيرة + ترقيم صفحات؛ لا نكتفي بحد Supabase الافتراضي.
    for (let start = 0; start < ids.length; start += 80) {
      const batch = ids.slice(start, start + 80);
      let finished = false;
      for (let offset = 0; offset <= 10000; offset += 500) {
        const { data, error } = await (supabase as any).from(cfg.table).select("*").in(cfg.orderId, batch).order(cfg.itemId, { ascending: true }).range(offset, offset + 499);
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error("Invalid product item response");
        if (offset === 10000 && data.length > 0) throw new Error("Product item safety limit exceeded");
        for (const record of data as Record<string, unknown>[]) {
          const orderId = String(record[cfg.orderId] ?? "");
          if (!batch.includes(orderId)) continue;
          const itemId = String(record[cfg.itemId] ?? "");
          if (itemId) {
            const dedupKey = JSON.stringify([orderId, itemId]);
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);
          }
          const item = normalizeProductItem(record);
          if (!item) { invalid.set(orderId, (invalid.get(orderId) ?? 0) + 1); continue; }
          const list = byOrder.get(orderId) ?? [];
          list.push(item);
          byOrder.set(orderId, list);
        }
        if (data.length < 500) { finished = true; break; }
      }
      if (!finished) throw new Error("Incomplete product item pages");
    }
    return rows.map((row) => ({ ...row, product_items: row.order_id ? byOrder.get(row.order_id) ?? [] : undefined, product_items_invalid: row.order_id ? invalid.get(row.order_id) ?? 0 : 0, product_items_error: false }));
  } catch (error) {
    console.error("Could not load product items for monthly analysis:", error);
    return rows.map((row) => ({ ...row, product_items: undefined, product_items_error: Boolean(row.order_id) }));
  }
}

function buildProductMonths(rows: InvoiceRow[]): ProductAnalysis {
  const buckets = new Map<string, ProductMonth & { stats: Map<string, ProductStat> }>();
  const seenOrders = new Set<string>();
  let duplicates = 0, invalidDates = 0, unlinked = 0;
  const loadError = rows.some((row) => row.product_items_error);
  // عند تكرار فواتير الطلب، يُحسب مرة واحدة بتاريخ أحدث سجل ظاهر.
  for (const row of [...rows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "") || a.id.localeCompare(b.id))) {
    if (!row.order_id) { unlinked++; continue; }
    if (seenOrders.has(row.order_id)) { duplicates++; continue; }
    const key = monthKeyOf(row.created_at);
    if (!key) { invalidDates++; continue; }
    seenOrders.add(row.order_id);
    const bucket = buckets.get(key) ?? { key, label: MONTH_FORMATTER.format(new Date(row.created_at ?? "")), products: [], orders: 0, covered: 0, missingOrders: 0, invalidItems: 0, missingQuantity: 0, missingRevenue: 0, stats: new Map<string, ProductStat>() };
    bucket.orders++;
    const items = row.product_items ?? [];
    const invalid = row.product_items_invalid ?? 0;
    bucket.invalidItems += invalid;
    if (!items.length || row.product_items_error || invalid > 0) bucket.missingOrders++;
    else bucket.covered++;
    const seenProducts = new Set<string>();
    for (const item of items) {
      const stat = bucket.stats.get(item.key) ?? { key: item.key, name: item.name, quantity: 0, revenue: 0, orders: 0, missingQuantity: 0, missingRevenue: 0 };
      if (!seenProducts.has(item.key)) { stat.orders++; seenProducts.add(item.key); }
      if (item.quantity === null) { stat.missingQuantity++; bucket.missingQuantity++; } else stat.quantity += item.quantity;
      if (item.revenue === null) { stat.missingRevenue++; bucket.missingRevenue++; } else stat.revenue += item.revenue;
      bucket.stats.set(item.key, stat);
    }
    buckets.set(key, bucket);
  }
  return { months: [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key)).map(({ stats, ...month }) => ({ ...month, products: [...stats.values()] })), duplicates, invalidDates, unlinked, loadError };
}

function rankProductMonth(month: ProductMonth, metric: "quantity" | "revenue"): ProductStat[] | null {
  if (month.missingOrders || month.invalidItems || (metric === "quantity" ? month.missingQuantity : month.missingRevenue)) return null;
  return [...month.products].sort((a, b) => b[metric] - a[metric] || a.key.localeCompare(b.key));
}

const PRODUCT_ANALYSIS_CSS = `
.si-products{box-sizing:border-box;min-width:0;border:1px solid #F2E6D3;border-radius:16px;background:#FFFAF1;padding:20px;color:#0B3A66;}
.si-products *{box-sizing:border-box}.si-products h2,.si-products h3{margin:0 0 10px;font-weight:900}.si-products p{margin:8px 0;font-size:12px;line-height:1.8;color:#475569}
.si-products-controls{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}.si-products-controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;min-width:0}.si-products-controls select{max-width:100%;border:1px solid #F2E6D3;border-radius:10px;padding:9px;background:#fff;color:#0B3A66;font:inherit;min-height:40px}.si-products-controls select:focus-visible{outline:2px solid #0F4C81;outline-offset:2px}
.si-products-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}.si-products-kpis div{padding:12px;background:#fff;border:1px solid #F2E6D3;border-radius:12px;font-size:12px}.si-products-kpis b{display:block;margin-top:6px;font-size:16px;overflow-wrap:anywhere}
.si-products-warning{padding:10px;border:1px solid #F2E6D3;border-radius:10px;background:#FFF4D6;color:#854D0E!important}.si-products-table-wrap{overflow-x:auto;max-width:100%}.si-products table{border-collapse:collapse;width:100%;min-width:580px;font-size:12px;background:#fff}.si-products th,.si-products td{padding:12px 10px;border-bottom:1px solid #F2E6D3;text-align:right;vertical-align:top}.si-products th{background:#F5EBD9;color:#0B3A66}.si-products td:nth-child(2){overflow-wrap:anywhere;min-width:160px;max-width:330px}.si-product-mobile{display:none;font-size:10px;line-height:1.7;color:#475569;margin-top:4px}.si-product-track{height:6px;background:#F2E6D3;border-radius:9px;margin-top:6px;overflow:hidden}.si-product-fill{height:100%;background:#0F4C81}.si-products-month{margin-top:18px}.si-products-empty{padding:24px;text-align:center}

.si-product-leaders{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:14px 0}.si-product-leader{border:1px solid #F2E6D3;background:#fff;border-radius:12px;padding:10px 12px;min-width:0}.si-product-leader span{display:block;font-size:11px;font-weight:700;color:#9A6B2F}.si-product-leader b{display:block;margin-top:4px;font-size:12.5px;color:#0B3A66;overflow-wrap:anywhere}.si-product-leader em{display:block;margin-top:3px;font-style:normal;font-size:11px;color:#475569}
@media print{.si-product-leaders{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:6px 0}.si-product-leader{padding:4px;border-color:#DDD}.si-product-leader b{font-size:8px}.si-product-leader span,.si-product-leader em{font-size:7px}}
@media(max-width:600px){.si-products{padding:14px}.si-products-kpis{grid-template-columns:1fr}.si-products-controls label{flex:1 1 130px}.si-product-mobile{display:block}.si-products table{min-width:0;font-size:11px}.si-products th,.si-products td{padding:8px 5px}.si-products td:nth-child(2){min-width:0;max-width:none}.si-products th:nth-child(5),.si-products td:nth-child(5),.si-products th:nth-child(6),.si-products td:nth-child(6){display:none}}
@media print{.si-product-mobile{display:none}.si-products{padding:0;border:0;border-radius:0;margin:12px 0;background:white}.si-products table{min-width:0;font-size:9px;table-layout:fixed}.si-products th,.si-products td{padding:6px;overflow-wrap:anywhere}.si-products td:nth-child(2){min-width:0;max-width:none}.si-products thead{display:table-header-group}.si-products tr{break-inside:avoid}.si-products h3{break-after:avoid}.si-products p{font-size:9px}.si-product-track{display:none}.si-products-warning{background:white}.si-products-controls{display:none}}
`;

function ProductRankingTable({ month, metric, limit }: { month: ProductMonth; metric: "quantity" | "revenue"; limit: number }) {
  const ranked = rankProductMonth(month, metric);
  if (!ranked) return <p className="si-products-warning">الترتيب حسب {metric === "quantity" ? "الكمية" : "قيمة المبيعات"} غير متاح: بيانات هذا الشهر غير مكتملة. طلبات بلا تفاصيل مكتملة: {month.missingOrders}؛ بنود بلا هوية: {month.invalidItems}؛ بنود بلا كمية: {month.missingQuantity}؛ بنود بلا قيمة: {month.missingRevenue}.</p>;
  if (ranked.length === 0) return <p className="si-products-empty">لا توجد بنود منتجات متاحة لهذا الشهر.</p>;
  const total = ranked.reduce((sum, product) => sum + product[metric], 0);
  const max = ranked[0]?.[metric] ?? 0;
  const selected = limit > 0 ? ranked.slice(0, limit) : ranked;
  return <div className="si-products-table-wrap"><table><thead><tr><th>الترتيب</th><th>المنتج</th><th>الكمية</th><th>القيمة (ر.ي)</th><th>الطلبات</th><th>حصة الشهر</th></tr></thead><tbody>{selected.map((product, index) => {
    const rank = ranked.findIndex((candidate) => candidate[metric] === product[metric]) + 1;
    const share = total > 0 ? product[metric] / total * 100 : null;
    return <tr key={product.key}><td>{rank}{index > 0 && ranked[index - 1]?.[metric] === product[metric] ? " (تعادل)" : ""}</td><td>{product.name}<span className="si-product-mobile">{product.orders} طلب — الحصة: {share === null ? "غير متاحة" : `${money(share, 1)}%`}</span><div className="si-product-track" aria-hidden="true"><div className="si-product-fill" style={{ width: `${max > 0 ? product[metric] / max * 100 : 0}%` }} /></div></td><td>{product.missingQuantity ? "غير مكتمل" : money(product.quantity)}</td><td>{product.missingRevenue ? "غير مكتمل" : money(product.revenue, 0)}</td><td>{product.orders}</td><td>{share === null ? "غير متاحة" : `${money(share, 1)}%`}</td></tr>;
  })}</tbody></table></div>;
}

function MonthlyProductsSection({ rows, loading = false, forReport = false }: { rows: InvoiceRow[]; loading?: boolean; forReport?: boolean }) {
  const analysis = useMemo(() => buildProductMonths(rows), [rows]);
  const [monthKey, setMonthKey] = useState("");
  const [metric, setMetric] = useState<"quantity" | "revenue">("quantity");
  const [limit, setLimit] = useState(10);
  const selected = analysis.months.find((month) => month.key === monthKey) ?? analysis.months[0];
  const ranked = selected ? rankProductMonth(selected, metric) : null;
  const leader = ranked?.[0];
  const tied = leader ? (ranked ?? []).filter((product) => product[metric] === leader[metric]).length : 0;
  return <section className="si-products" aria-label="تحليل المنتجات الأكثر مبيعاً لكل شهر" dir="rtl"><style dangerouslySetInnerHTML={{ __html: PRODUCT_ANALYSIS_CSS }} /><h2>تحليل المنتجات الأكثر مبيعًا لكل شهر</h2><p>السجلات المحمّلة والظاهرة فقط حسب البحث وطريقة الدفع. الشهر حسب إنشاء الفاتورة/الطلب بتوقيت اليمن، وليس تاريخ دفع المبلغ. الكميات بنود الطلبات، وليست صافي المبيعات بعد الإلغاء أو المرتجعات.</p><p>هوية المنتج حسب المعرّف أو SKU مع فصل المتغيرات. قيمة المبيعات هي إجمالي بند المنتج المسجل بالريال اليمني فقط، وليست إجمالي الطلب أو أرباحًا.</p>
  {(analysis.duplicates > 0 || analysis.invalidDates > 0 || analysis.unlinked > 0) && <p>مستبعد: {analysis.unlinked} سجل بلا طلب مرتبط، {analysis.invalidDates} بلا تاريخ صحيح، {analysis.duplicates} سجل مكرر لنفس الطلب (احتُسب أحدث سجل ظاهر مرة واحدة).</p>}
  {loading ? <p role="status">جارٍ تحميل تفاصيل المنتجات…</p> : <>
  {analysis.loadError && <p className="si-products-warning" role="status">تعذر تحميل تفاصيل المنتجات. تحقق من جدول order_items وأسماء الحقول وسياسات RLS؛ الفواتير وميزات الطباعة الأخرى لم تتغير.</p>}
  {!analysis.months.length ? <p className="si-products-empty">لا توجد سجلات مرتبطة بطلبات ذات تاريخ صحيح للتحليل.</p> : forReport ? <>{analysis.months.map((month) => <div className="si-products-month" key={month.key}><h3>{month.label} — أعلى 10 منتجات حسب الكمية</h3><p>تفاصيل متاحة: {month.covered} من {month.orders} طلب. الحصة من جميع منتجات الشهر؛ التعادل يحتفظ بنفس الترتيب.</p><ProductRankingTable month={month} metric="quantity" limit={10} /></div>)}</> : selected && <>
  <div className="si-products-leaders">{analysis.months.map((month) => { const best = rankProductMonth(month, metric)?.[0]; return <div className="si-product-leader" key={month.key}><span>{month.label}</span><b>{best && best[metric] > 0 ? best.name : rankProductMonth(month, metric) ? "لا توجد مبيعات موجبة" : "غير مكتمل"}</b><em>{best && best[metric] > 0 ? `${money(best[metric], metric === "quantity" ? 2 : 0)}${metric === "revenue" ? " ر.ي" : ""} — ${money(month.covered)} من ${money(month.orders)} طلب` : rankProductMonth(month, metric) ? "لا توجد قيمة موجبة للمقياس" : "الترتيب موقوف لنقص البيانات"}</em></div>; })}</div>
  <div className="si-products-controls"><label>الشهر<select value={selected.key} onChange={(event) => setMonthKey(event.target.value)}>{analysis.months.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}</select></label><label>ترتيب حسب<select value={metric} onChange={(event) => setMetric(event.target.value === "revenue" ? "revenue" : "quantity")}><option value="quantity">الكمية المباعة</option><option value="revenue">قيمة المبيعات بالريال اليمني</option></select></label><label>عدد المنتجات<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}><option value={5}>أعلى 5</option><option value={10}>أعلى 10</option><option value={0}>جميع المنتجات</option></select></label></div>
  <div className="si-products-kpis"><div>الأكثر مبيعًا<b>{leader && leader[metric] > 0 ? `${leader.name}${tied > 1 ? ` (تعادل ${tied} منتجات)` : ""}` : ranked ? "لا توجد مبيعات موجبة" : "غير متاح"}</b></div><div>إجمالي {metric === "quantity" ? "الكمية" : "قيمة المبيعات"}<b>{ranked ? `${money(ranked.reduce((sum, product) => sum + product[metric], 0), metric === "quantity" ? 2 : 0)}${metric === "revenue" ? " ر.ي" : ""}` : "غير مكتمل"}</b></div><div>الطلبات ذات التفاصيل المتاحة<b>{selected.covered} / {selected.orders}</b></div></div><ProductRankingTable month={selected} metric={metric} limit={limit} /><p>حصة المنتج من إجمالي الشهر حسب مقياس الترتيب، وليس من أعلى النتائج فقط. عند نقص بيانات المقياس أو تفاصيل الطلبات يُوقف الترتيب؛ عدد الطلبات لكل منتج لا يُجمع كعدد طلبات الشهر.</p>
  </>}
  </>}
  </section>;
}

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
          const rawMethod = String(payment.payment_method ?? "").trim();
          const methodLabel = methodKey
            ? METHOD_LABEL[methodKey] ?? methodKey
            : rawMethod || "غير محدد";
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
  const [pdfExport, setPdfExport] = useState<{
    rows: InvoiceRow[];
    search: string;
    method: string;
    exportedAt: string;
  } | null>(null);
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
    const withProducts = await attachProductItems(balanced.rows);
    setInvoices(withProducts);
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

  const exportInvoicesPdf = () => {
    if (loading || filteredInvoices.length === 0) return;
    setReceiptInvoice(null);
    setPdfExport({
      rows: filteredInvoices.map((row) => ({ ...row, payment_methods: [...(row.payment_methods ?? [])] })),
      search: search.trim(),
      method: methodFilter === "all" ? "كل الطرق" : METHOD_LABEL[methodFilter] ?? methodFilter,
      exportedAt: new Date().toLocaleString("ar-YE-u-nu-latn"),
    });
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
      <style dangerouslySetInnerHTML={{ __html: RECEIPT_CSS }} />
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportInvoicesPdf}
              disabled={loading || filteredInvoices.length === 0}
              title="تصدير الفواتير الظاهرة إلى PDF عبر حفظ كملف PDF"
              className="flex items-center gap-2 rounded-xl bg-[#0B3A66] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#082C4E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="size-4" /> تصدير PDF
            </button>
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

        <MonthlySummarySection rows={filteredInvoices} />
        <MonthlyProductsSection rows={filteredInvoices} loading={loading} />

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

      {pdfExport && (
        <InvoicePdfReport
          report={pdfExport}
          onClose={() => setPdfExport(null)}
        />
      )}

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

/* ===================== الملخص الشهري ===================== */
type MonthComparisonMetric = {
  label: string;
  base: number | null;
  target: number | null;
  difference: number | null;
  change: number | null;
  unit: "money" | "count" | "percentage";
};
function compareSalesMonths(base: MonthSummary, target: MonthSummary): MonthComparisonMetric[] {
  const values = [
    { label: "عدد الفواتير / السجلات", base: base.count, target: target.count, unit: "count" as const },
    { label: "إجمالي المبيعات", base: base.missing ? null : base.total, target: target.missing ? null : target.total, unit: "money" as const },
    { label: "المدفوع المعتمد حاليًا", base: base.missing ? null : base.paid, target: target.missing ? null : target.paid, unit: "money" as const },
    { label: "المتبقي عند التسليم", base: base.missing ? null : base.remaining, target: target.missing ? null : target.remaining, unit: "money" as const },
    { label: "نسبة التحصيل", base: !base.missing && base.total > 0 ? base.paid / base.total * 100 : null, target: !target.missing && target.total > 0 ? target.paid / target.total * 100 : null, unit: "percentage" as const },
  ];
  return values.map((metric) => ({ ...metric,
    difference: metric.base === null || metric.target === null ? null : metric.target - metric.base,
    change: metric.unit === "percentage" || metric.base === null || metric.target === null || metric.base === 0 ? null : (metric.target - metric.base) / metric.base * 100,
  }));
}
function comparisonValue(value: number | null, unit: MonthComparisonMetric["unit"], signed = false): string {
  if (value === null) return "غير متاح";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${money(value, unit === "percentage" ? 1 : 0)}${unit === "money" ? " ر.ي" : unit === "percentage" ? signed ? " نقطة مئوية" : "%" : ""}`;
}

const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
  month: "short",
  timeZone: "Asia/Aden",
});

function monthShortLabel(key: string): string {
  const date = new Date(`${key}-01T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? key : MONTH_SHORT_FORMATTER.format(date);
}

function compactMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1e6) return `${money(value / 1e6, 1)} م`;
  if (absolute >= 1e3) return `${money(value / 1e3, 0)} ألف`;
  return money(value, 0);
}

/** الأشهر الواقعة بين الشهرين، بحد أقصى 12 نقطة مع الاحتفاظ بالطرفين */
function trendMonthsBetween(months: MonthSummary[], baseKey: string, targetKey: string): MonthSummary[] {
  const low = baseKey < targetKey ? baseKey : targetKey;
  const high = baseKey < targetKey ? targetKey : baseKey;
  const inside = months.filter((month) => month.key >= low && month.key <= high).sort((a, b) => a.key.localeCompare(b.key));
  if (inside.length <= 12) return inside;
  const sample = new Set<number>([0, inside.length - 1]);
  for (let step = 1; step < 12; step += 1) sample.add(Math.round((step * (inside.length - 1)) / 11));
  return [...sample].sort((a, b) => a - b).map((index) => inside[index]).filter((month): month is MonthSummary => Boolean(month));
}

/** موضع النص عند طرفي الرسم حتى لا يُقطع */
const edgeClass = (x: number) => (x < 16 ? " is-start" : x > 84 ? " is-end" : "");

function SalesGrowthChart({ months, baseKey, targetKey, baseLabel, targetLabel }: { months: MonthSummary[]; baseKey: string; targetKey: string; baseLabel: string; targetLabel: string }) {
  const points = trendMonthsBetween(months, baseKey, targetKey);
  const low = baseKey < targetKey ? baseKey : targetKey;
  const high = baseKey < targetKey ? targetKey : baseKey;
  const inRange = months.filter((month) => month.key >= low && month.key <= high);
  const complete = points.length >= 2 && inRange.length > 0 && inRange.every((month) => month.missing === 0 && Number.isFinite(month.total) && month.total >= 0);
  const first = points[0];
  const last = points[points.length - 1];
  const growth = complete && first && last && first.total > 0 ? (last.total - first.total) / first.total * 100 : null;
  const difference = complete && first && last ? last.total - first.total : null;
  const direction = difference === null ? "unknown" : difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const stroke = direction === "up" ? "#047857" : direction === "down" ? "#B91C1C" : "#0F4C81";
  if (!complete || !first || !last) {
    return <div className="si-growth" role="status"><h4>اتجاه نمو المبيعات بين الشهرين</h4><p className="si-compare-warning">الرسم غير متاح لأن أحد أشهر المدى غير مكتمل القيم المالية أو لا يملك تاريخًا صحيحًا. لا يُرسم اتجاه من بيانات ناقصة، ولا تُعامل القيم الغائبة كصفر.</p></div>;
  }
  const max = Math.max(...points.map((month) => month.total), 0);
  const scale = max > 0 ? max : 1;
  const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
  const startIndex = monthIndex(first.key);
  const span = Math.max(1, monthIndex(last.key) - startIndex);
  const coordinates = points.map((month) => ({
    month,
    x: 9 + ((monthIndex(month.key) - startIndex) * 82) / span,
    y: 14 + (month.total / scale) * 62,
  }));
  const smallestGap = coordinates.slice(1).reduce((gap, point, index) => Math.min(gap, point.x - (coordinates[index]?.x ?? 0)), 82);
  const chartMinWidth = Math.max(260, 80 * 100 / Math.max(smallestGap, 0.1));
  const polyline = coordinates.map((point) => `${money(point.x, 2)},${money(100 - point.y, 2)}`).join(" ");
  const summary = `${first.label} ${money(first.total, 0)} ريال، ${last.label} ${money(last.total, 0)} ريال، ${direction === "up" ? "اتجاه صاعد" : direction === "down" ? "اتجاه هابط" : "بدون تغيير"}${growth === null ? "" : ` بنسبة ${money(Math.abs(growth), 1)} بالمئة`}`;
  return (
    <figure className="si-growth">
      <figcaption>
        <h4>اتجاه نمو المبيعات بين الشهرين</h4>
        <p className={`si-growth-state si-growth-${direction}`}>
          {direction === "up" ? "اتجاه صاعد" : direction === "down" ? "اتجاه هابط" : "بدون تغيير"}
          {growth !== null && <span dir="ltr">{growth > 0 ? "+" : growth < 0 ? "−" : ""}{money(Math.abs(growth), 1)}%</span>}
        </p>
      </figcaption>
      <p className="si-growth-range">من {first.label} إلى {last.label} — {points.length} نقطة شهرية · أعلى قيمة {compactMoney(max)} · محور القيم يبدأ من صفر</p>
      <p>اختيار المقارنة: {targetLabel} مقابل {baseLabel}. يُقرأ الرسم زمنيًا من الأقدم يسارًا إلى الأحدث يمينًا، حتى لو عكست شهر الأساس.</p>
      {points.length > 3 && <p className="si-growth-scroll-hint">على الجوال: مرّر الرسم أفقيًا لمشاهدة بقية الأشهر.</p>}
      <div className="si-growth-scroll" tabIndex={0} role="region" aria-label="رسم اتجاه المبيعات القابل للتمرير">
        <div className="si-growth-plot" role="img" aria-label={summary} style={{ minWidth: `${Math.ceil(chartMinWidth)}px` }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {[14, 29.5, 45, 60.5, 76].map((line) => <line key={line} x1="0" x2="100" y1={100 - line} y2={100 - line} className="si-growth-grid" vectorEffect="non-scaling-stroke" />)}
            <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {coordinates.map((point) => <line key={`${point.month.key}-drop`} x1={money(point.x, 2)} x2={money(point.x, 2)} y1={100 - point.y} y2="86" stroke={stroke} strokeWidth="1" strokeDasharray="3 3" opacity="0.3" vectorEffect="non-scaling-stroke" />)}
          </svg>
          {coordinates.map((point) => <span key={`${point.month.key}-dot`} className={`si-growth-dot${edgeClass(point.x)}`} style={{ left: `${money(point.x, 2)}%`, bottom: `${money(point.y, 2)}%`, background: stroke }} aria-hidden="true" />)}
          {coordinates.map((point) => <span key={`${point.month.key}-value`} className={`si-growth-value${edgeClass(point.x)}`} style={{ left: `${money(point.x, 2)}%`, bottom: `calc(${money(point.y, 2)}% + 10px)` }}>{compactMoney(point.month.total)}</span>)}
          {coordinates.map((point) => <span key={`${point.month.key}-tick`} className={`si-growth-tick${edgeClass(point.x)}`} style={{ left: `${money(point.x, 2)}%` }}>{monthShortLabel(point.month.key)}<small>{point.month.key.slice(0, 4)}</small></span>)}
        </div>
      </div>
      <p className="si-growth-note">
        {growth === null ? "نسبة النمو غير متاحة لأن إجمالي الشهر الأقدم صفر. " : "نسبة الاتجاه محسوبة من الشهر الأقدم إلى الأحدث. "}
        {inRange.length > points.length ? `عُرضت ${points.length} نقطة من ${inRange.length} شهرًا مع الاحتفاظ بالطرفين. ` : ""}
        الرسم يوضح اتجاه الإجمالي وليس توقعًا، ولا يعوّض غياب الأشهر بمبيعات صفر. الخط يصل بين النقاط المتاحة؛ لا يُستنتج منه إجمالي الأشهر الغائبة. المبالغ بالريال اليمني.
      </p>
    </figure>
  );
}

const MONTHLY_TOGGLE_CSS = `
.si-monthly-toggle{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:14px 16px;border:1px solid #0B3A66;border-radius:12px;background:#0B3A66;color:#FFFFFF;text-align:start;font:inherit;font-size:14px;font-weight:800;cursor:pointer;}
.si-monthly-toggle:hover{background:#0F4C81}.si-monthly-toggle:focus-visible,.si-monthly-pagination button:focus-visible{outline:3px solid #0F4C81;outline-offset:3px}
.si-monthly-toggle-main,.si-monthly-toggle-meta{display:flex;align-items:center;gap:10px;min-width:0}.si-monthly-toggle-main{flex:1 1 250px}.si-monthly-toggle-main>svg{flex-shrink:0}.si-monthly-toggle-meta{flex-wrap:wrap;font-size:12px}.si-monthly-toggle-action{display:inline-flex;align-items:center;gap:8px;background:#FFFAF1;color:#0B3A66;border-radius:8px;padding:7px 10px;white-space:nowrap}
.si-monthly-content{padding-top:16px;min-width:0}.si-monthly-content[hidden]{display:none!important}
.si-monthly-pagination{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;border-top:1px solid #F2E6D3;padding-top:12px;color:#0B3A66;font-size:12px;font-weight:700}.si-monthly-pagination p{margin:0}.si-monthly-pagination p span{font-weight:500}.si-monthly-page-buttons{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.si-monthly-pagination button{box-sizing:border-box;border:1px solid #F2E6D3;border-radius:8px;min-width:40px;min-height:40px;padding:8px 10px;background:#FFFAF1;color:#0B3A66;font:inherit;cursor:pointer}.si-monthly-pagination button:hover:not(:disabled){border-color:#0F4C81}.si-monthly-pagination button.si-monthly-page-active{background:#0F4C81;color:white;border-color:#0F4C81}.si-monthly-pagination button:disabled{background:#F1F5F9;color:#64748B;cursor:not-allowed}

.si-month-compare{box-sizing:border-box;margin:16px 0;padding:14px;border:1px solid #F2E6D3;border-radius:12px;background:#FFFAF1;color:#0B3A66}.si-month-compare h3{font-size:14px;font-weight:900;margin:0 0 10px}.si-month-compare-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.si-month-compare label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;flex:1 1 180px;min-width:0}.si-month-compare select{box-sizing:border-box;width:100%;border:1px solid #F2E6D3;background:white;color:#0B3A66;border-radius:8px;padding:10px;font:inherit;min-height:42px}.si-month-compare button{box-sizing:border-box;border:1px solid #0F4C81;background:#0F4C81;color:white;border-radius:8px;padding:10px 14px;font:inherit;font-size:12px;font-weight:700;min-height:42px;cursor:pointer}.si-month-compare button:disabled{border-color:#CBD5E1;background:#F1F5F9;color:#64748B;cursor:not-allowed}.si-month-compare button.si-compare-reset{border-color:#F2E6D3;background:white;color:#0B3A66}.si-month-compare select:focus-visible,.si-month-compare button:focus-visible{outline:3px solid #0F4C81;outline-offset:2px}.si-month-compare p{font-size:11px;line-height:1.8;margin:10px 0;color:#475569}.si-month-compare .si-compare-warning{color:#854D0E}.si-compare-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:10px;margin-top:12px}.si-compare-card{min-width:0;border:1px solid #F2E6D3;background:white;border-radius:10px;padding:12px}.si-compare-card h4{font-size:12px;font-weight:800;margin:0 0 10px}.si-compare-card dl{margin:0;font-size:11px}.si-compare-card dl>div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;margin-bottom:7px}.si-compare-card dt{color:#475569;overflow-wrap:anywhere}.si-compare-card dd{margin:0;color:#0B3A66;font-weight:700}.si-compare-difference{border-top:1px solid #F2E6D3;padding-top:8px;font-size:12px;font-weight:800}.si-compare-increase{color:#0B3A66}.si-compare-decrease{color:#B91C1C}.si-compare-neutral{color:#475569}

.si-growth{box-sizing:border-box;min-width:0;margin:16px 0 0;background:#FFFFFF;border:1px solid #F2E6D3;border-radius:12px;padding:14px;color:#0B3A66}.si-growth h4{margin:0;font-size:14px;font-weight:900}.si-growth figcaption{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}.si-growth p.si-growth-state{margin:0;font-size:12px;font-weight:900;display:flex;gap:8px;align-items:center}.si-growth p.si-growth-up{color:#047857}.si-growth p.si-growth-down{color:#B91C1C}.si-growth p.si-growth-flat{color:#0F4C81}.si-growth p.si-growth-range{font-size:12px;font-weight:700;color:#0B3A66}.si-growth-scroll{max-width:100%;min-width:0;overflow-x:auto;padding:2px 0 8px;direction:ltr}.si-growth-scroll:focus-visible{outline:2px solid #0F4C81;outline-offset:2px}.si-growth-plot{position:relative;height:230px;width:100%;direction:ltr}.si-growth-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.si-growth-grid{stroke:#E2E8F0;stroke-width:1}.si-growth-dot{position:absolute;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 3px white;transform:translate(-50%,50%)}.si-growth-value{position:absolute;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:800;color:#0B3A66;direction:rtl}.si-growth-tick{position:absolute;bottom:0;transform:translateX(-50%);font-size:11px;line-height:1.5;font-weight:700;color:#475569;white-space:nowrap;text-align:center;direction:rtl}.si-growth-tick small{display:block;font-size:10px;font-weight:500}.si-growth-value.is-start,.si-growth-tick.is-start{transform:none}.si-growth-value.is-end,.si-growth-tick.is-end{transform:translateX(-100%)}.si-growth-scale{position:absolute;right:0;top:1px;font-size:10px;color:#475569;direction:rtl}.si-growth-zero{position:absolute;left:1px;bottom:14%;font-size:10px;color:#475569}.si-growth .si-growth-note{color:#475569;line-height:1.9}
@media(max-width:600px){.si-growth{padding:12px}.si-growth figcaption{align-items:flex-start}.si-growth h4{font-size:13px}.si-growth-plot{height:215px}}
@media(max-width:600px){.si-month-compare{padding:12px}.si-month-compare-controls button{flex:1 1 130px}.si-compare-cards{grid-template-columns:1fr}}
@media(max-width:600px){.si-monthly-toggle{padding:12px;font-size:13px}.si-monthly-pagination{flex-direction:column;align-items:flex-start}.si-monthly-toggle-meta{width:100%;justify-content:space-between}}
`;

function MonthlySummarySection({ rows }: { rows: InvoiceRow[] }) {
  const months = useMemo(() => buildMonthlySummary(rows), [rows]);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [baseKey, setBaseKey] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [comparison, setComparison] = useState<{ base: string; target: string } | null>(null);
  const baseChoice = months.find((month) => month.key === baseKey) ?? months[1] ?? months[0];
  const targetChoice = months.find((month) => month.key === targetKey) ?? months[0];
  const baseMonth = comparison ? months.find((month) => month.key === comparison.base) : undefined;
  const targetMonth = comparison ? months.find((month) => month.key === comparison.target) : undefined;
  const comparing = Boolean(baseMonth && targetMonth && baseMonth.key !== targetMonth.key);
  const displayMonths = comparing && baseMonth && targetMonth
    ? months.filter((month) => month.key === baseMonth.key || month.key === targetMonth.key)
    : months;
  const comparisons = comparing && baseMonth && targetMonth ? compareSalesMonths(baseMonth, targetMonth) : [];
  const applyComparison = () => {
    if (!baseChoice || !targetChoice || baseChoice.key === targetChoice.key) return;
    setComparison({ base: baseChoice.key, target: targetChoice.key });
    setPage(1);
  };
  const clearComparison = () => { setComparison(null); setPage(1); };
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(displayMonths.length / pageSize));
  const currentPage = Math.min(pageCount, Math.max(1, page));
  const visibleMonths = displayMonths.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => pageStart + index);
  useEffect(() => { setPage(1); setComparison(null); }, [rows]);
  const stats = useMemo(() => {
    const complete = months.every((month) => month.missing === 0);
    const totalAll = months.reduce((sum, month) => sum + month.total, 0);
    const paidAll = months.reduce((sum, month) => sum + month.paid, 0);
    const best = months.reduce<MonthSummary | null>(
      (top, month) => (top === null || month.total > top.total ? month : top),
      null,
    );
    const latest = months[0] ?? null;
    const previous = months[1] ?? null;
    return {
      totalAll,
      paidAll,
      complete,
      best: complete ? best : null,
      latest,
      previous,
      average: complete && months.length > 0 ? totalAll / months.length : null,
      collection: complete && totalAll > 0 ? (paidAll / totalAll) * 100 : null,
      growth:
        latest && previous && latest.missing === 0 && previous.missing === 0 && previous.total > 0 &&
        Math.round((Date.parse(`${latest.key}-01T00:00:00Z`) - Date.parse(`${previous.key}-01T00:00:00Z`)) / 86400000) <= 31
          ? ((latest.total - previous.total) / previous.total) * 100
          : null,
    };
  }, [months]);
  const maxTotal = useMemo(
    () => displayMonths.reduce((max, month) => month.missing > 0 ? max : Math.max(max, month.total), 0),
    [displayMonths],
  );
  const undatedCount = rows.length - months.reduce((sum, month) => sum + month.count, 0);

  return (
    <section
      aria-labelledby="monthly-summary-title"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
    >
      <header>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="monthly-summary-content"
          onClick={() => setIsOpen((open) => !open)}
          className="si-monthly-toggle"
        >
          <span className="si-monthly-toggle-main">
            <BarChart3 className="size-5" />
            <span id="monthly-summary-title">الملخص الإحصائي للمبيعات حسب الشهر</span>
          </span>
          <span className="si-monthly-toggle-meta">
            <span>{months.length} شهر</span>
            <span className="si-monthly-toggle-action">{isOpen ? "إخفاء الملخص" : "عرض الملخص"} <span aria-hidden="true">{isOpen ? "−" : "+"}</span></span>
          </span>
        </button>
      </header>
      <style dangerouslySetInnerHTML={{ __html: MONTHLY_TOGGLE_CSS }} />
      <div id="monthly-summary-content" hidden={!isOpen} className="si-monthly-content">
        <p className="mb-3 text-[11px] font-semibold text-slate-600">
          حسب تاريخ إنشاء الفاتورة/الطلب بتوقيت اليمن، مع البحث وفلتر الدفع.
          المدفوع هو رصيد الدفعات المعتمدة الحالي وليس تحصيلًا بتاريخ الدفع.
          المؤشرات تشمل جميع أشهر النتائج المحمّلة؛ الترقيم وفلتر المقارنة يغيّران الأشرطة والجدول فقط؛ مؤشرات الأداء العامة تشمل جميع أشهر النتائج.
        </p>

      <section className="si-month-compare" aria-labelledby="monthly-compare-title">
        <h3 id="monthly-compare-title">مقارنة أداء المبيعات بين شهرين محددين</h3>
        <div className="si-month-compare-controls">
          <label>شهر الأساس<select aria-label="شهر الأساس" value={baseChoice?.key ?? ""} disabled={months.length < 2} onChange={(event) => { setBaseKey(event.target.value); clearComparison(); }}>
            {!months.length && <option value="">لا توجد أشهر</option>}
            {months.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
          </select></label>
          <label>شهر المقارنة<select aria-label="شهر المقارنة" value={targetChoice?.key ?? ""} disabled={months.length < 2} onChange={(event) => { setTargetKey(event.target.value); clearComparison(); }}>
            {!months.length && <option value="">لا توجد أشهر</option>}
            {months.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
          </select></label>
          <button type="button" onClick={applyComparison} disabled={months.length < 2 || !baseChoice || !targetChoice || baseChoice.key === targetChoice.key}>مقارنة الشهرين</button>
          <button type="button" className="si-compare-reset" onClick={clearComparison} disabled={!comparing}>عرض جميع الأشهر</button>
        </div>
        <p>الفرق = شهر المقارنة − شهر الأساس. التغير النسبي محسوب من شهر الأساس؛ فرق التحصيل بالنقاط المئوية. يمكن مقارنة شهرين غير متتاليين.</p>
        {months.length < 2 ? <p className="si-compare-warning" role="status">تحتاج شهرين مختلفين على الأقل ضمن النتائج المحمّلة للمقارنة.</p> : baseChoice?.key === targetChoice?.key ? <p className="si-compare-warning" role="status">اختر شهرين مختلفين للمقارنة.</p> : null}
        {comparing && baseMonth && targetMonth && <>
          <p role="status" aria-live="polite">المقارنة النشطة: {targetMonth.label} مقابل {baseMonth.label}. الأشرطة والجدول يعرضان هذين الشهرين فقط.</p>
          <SalesGrowthChart months={months} baseKey={baseMonth.key} targetKey={targetMonth.key} baseLabel={baseMonth.label} targetLabel={targetMonth.label} />
          <div className="si-compare-cards">{comparisons.map((metric) => <article className="si-compare-card" key={metric.label}>
            <h4>{metric.label}</h4>
            <dl><div><dt>{baseMonth.label} (الأساس)</dt><dd>{comparisonValue(metric.base, metric.unit)}</dd></div><div><dt>{targetMonth.label} (المقارنة)</dt><dd>{comparisonValue(metric.target, metric.unit)}</dd></div></dl>
            <div className={`si-compare-difference ${metric.difference === null || metric.difference === 0 ? "si-compare-neutral" : metric.difference > 0 ? "si-compare-increase" : "si-compare-decrease"}`}>
              الفرق: <bdi>{comparisonValue(metric.difference, metric.unit, true)}</bdi>
            </div>
            <p>{metric.unit === "percentage" ? "الفرق بالنقاط المئوية، وليس نسبة نمو." : metric.change === null ? metric.base === 0 && metric.target !== null ? "التغير النسبي غير متاح لأن قيمة الأساس صفر." : "التغير النسبي غير متاح لعدم اكتمال البيانات." : <>التغير: <bdi>{comparisonValue(metric.change, "percentage", false)}</bdi></>}</p>
          </article>)}</div>
          <p>الزيادة أو النقصان وصف للفرق فقط؛ زيادة المتبقي لا تعني تحسن الأداء. الأشهر الجارية قد تكون جزئية، والمبالغ المدفوعة أرصدة معتمدة حالية لا التحصيل النقدي خلال الشهر. عند نقص القيم المالية لا تُحسب فروقها؛ يبقى عدد السجلات قابلًا للمقارنة.</p>
        </>}
      </section>

      {undatedCount > 0 && (
        <p role="status" className="mb-3 text-xs font-bold text-amber-700">
          {undatedCount} سجل بدون تاريخ صحيح مستبعد من التجميع الشهري.
        </p>
      )}
      {months.some((month) => month.missing > 0) && (
        <p className="mb-3 text-xs font-bold text-amber-700">البيانات المالية ناقصة لبعض الأشهر؛ أُخفيت مؤشرات الأداء التي تعتمد عليها بدل احتسابها كصفر.</p>
      )}
      {months.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
          لا توجد تواريخ فواتير في النتائج الحالية لعرض الملخص الشهري.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="rounded-xl border border-[#F2E6D3] bg-[#FFFAF1] p-3">
              <p className="text-[11px] font-bold text-slate-500">متوسط أشهر النتائج</p>
              <p className="mt-1 whitespace-nowrap text-sm font-black text-[#0B3A66]">
                {stats.average == null ? "بيانات غير مكتملة" : `${money(stats.average, 0)} ر.ي`}
              </p>
            </div>
            <div className="rounded-xl border border-[#F2E6D3] bg-[#FFFAF1] p-3">
              <p className="text-[11px] font-bold text-slate-500">أفضل شهر</p>
              <p className="mt-1 truncate text-sm font-black text-[#0B3A66]">
                {stats.best ? stats.best.label : "غير متاح"}
              </p>
              {stats.best && (
                <p className="text-[11px] font-bold text-emerald-700">
                  {money(stats.best.total, 0)} ر.ي
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[#F2E6D3] bg-[#FFFAF1] p-3">
              <p className="text-[11px] font-bold text-slate-500">نسبة التحصيل</p>
              <p className="mt-1 text-sm font-black text-emerald-700">
                {stats.collection == null ? "غير متاحة" : `${money(stats.collection, 1)}%`}
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {stats.complete ? `${money(stats.paidAll, 0)} من ${money(stats.totalAll, 0)}` : "بيانات غير مكتملة"}
              </p>
            </div>
            <div className="rounded-xl border border-[#F2E6D3] bg-[#FFFAF1] p-3">
              <p className="text-[11px] font-bold text-slate-500">آخر شهر مقابل السابق</p>
              {stats.growth == null ? (
                <p className="mt-1 text-sm font-black text-slate-500">لا مقارنة</p>
              ) : (
                <p
                  className={`mt-1 flex items-center gap-1 text-sm font-black ${
                    stats.growth >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {stats.growth >= 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  <span dir="ltr">{money(Math.abs(stats.growth), 1)}%</span>
                </p>
              )}
              <p className="text-[11px] font-bold text-slate-500">
                {stats.previous ? stats.previous.label : "شهر واحد فقط"}
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {visibleMonths.map((month) => {
              const shares = monthShares(month);
              const width = maxTotal > 0 ? Math.max(2, (month.total / maxTotal) * 100) : 0;
              return (
                <li key={month.key}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="w-20 shrink-0 text-xs font-bold text-[#0B3A66] sm:w-24">
                      {month.label}
                    </span>
                    <div
                      className="relative h-3 min-w-[110px] flex-1 overflow-hidden rounded-full bg-slate-100"
                      role="img"
                      aria-label={month.missing > 0 ? `${month.label}: بيانات غير مكتملة` : `${month.label}: إجمالي ${money(month.total, 0)} ريال، مدفوع ${money(month.paid, 0)}، متبقٍ ${money(month.remaining, 0)}`}
                    >
                      <span
                        className="absolute inset-y-0 right-0 rounded-full bg-emerald-600"
                        style={{ width: `${(width * shares.paid) / 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 rounded-full bg-amber-500"
                        style={{
                          right: `${(width * shares.paid) / 100}%`,
                          width: `${(width * shares.rest) / 100}%`,
                        }}
                      />
                    </div>
                    <span
                      className="w-20 shrink-0 text-left text-xs font-black tabular-nums text-slate-900 sm:w-24"
                      dir="ltr"
                    >
                      {month.missing > 0 ? "غير مكتمل" : money(month.total, 0)}
                    </span>
                    <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 sm:inline-block">
                      {month.count} فاتورة
                    </span>
                    {month.missing > 0 && (
                      <span className="hidden text-[10px] font-bold text-amber-700 sm:inline">
                        {month.missing} قيمة ناقصة
                      </span>
                    )}
                    <span className="w-full text-[11px] font-semibold text-slate-500 md:hidden">
                      {month.count} فاتورة
                      {month.missing > 0
                        ? ` · ${month.missing} قيمة ناقصة`
                        : ` · مدفوع ${money(month.paid, 0)} · متبقٍ ${money(month.remaining, 0)}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px] text-right text-xs">
              <thead className="bg-slate-50 text-[#0B3A66]"><tr>
                <th className="p-3">الشهر</th><th className="p-3">السجلات</th><th className="p-3">الإجمالي</th><th className="p-3">المدفوع</th><th className="p-3">المتبقي</th><th className="p-3">التحصيل</th>
              </tr></thead>
              <tbody>{visibleMonths.map((month) => (
                <tr key={month.key} className="border-b border-slate-100">
                  <td className="p-3 font-bold">{month.label}</td><td className="p-3">{month.count}</td>
                  <td className="whitespace-nowrap p-3">{month.missing ? "غير مكتمل" : yerLabel(month.total)}</td>
                  <td className="whitespace-nowrap p-3 text-emerald-700">{month.missing ? "غير مكتمل" : yerLabel(month.paid)}</td>
                  <td className="whitespace-nowrap p-3 text-amber-700">{month.missing ? "غير مكتمل" : yerLabel(month.remaining)}</td>
                  <td className="p-3">{month.missing === 0 && month.total > 0 ? `${money(month.paid / month.total * 100, 1)}%` : "غير متاحة"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <nav className="si-monthly-pagination" aria-label="صفحات الملخص الشهري">
            <p role="status" aria-live="polite">الصفحة {currentPage} من {pageCount} <span>— الأشهر {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, displayMonths.length)} من {displayMonths.length}</span></p>
            <div className="si-monthly-page-buttons">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="الصفحة السابقة">السابق</button>
              {pageStart > 1 && <><button type="button" onClick={() => setPage(1)} aria-label="الصفحة 1">1</button>{pageStart > 2 && <span aria-hidden="true">…</span>}</>}
              {pageNumbers.map((number) => <button key={number} type="button" aria-label={`الصفحة ${number}`} aria-current={number === currentPage ? "page" : undefined} className={number === currentPage ? "si-monthly-page-active" : ""} onClick={() => setPage(number)}>{number}</button>)}
              {pageStart + pageNumbers.length - 1 < pageCount && <>{pageStart + pageNumbers.length < pageCount && <span aria-hidden="true">…</span>}<button type="button" onClick={() => setPage(pageCount)} aria-label={`الصفحة ${pageCount}`}>{pageCount}</button></>}
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="الصفحة التالية">التالي</button>
            </div>
          </nav>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-sm bg-emerald-600" /> مدفوع
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-sm bg-amber-500" /> متبقٍ عند التسليم
            </span>
            <span className="text-slate-400">طول الشريط يقارن الأشهر المكتملة فقط. النسبة تقارن آخر شهرين متتاليين ظاهرين؛ قد يكون آخر شهر غير مكتمل زمنيًا.</span>
          </div>
        </>
      )}
      </div>
    </section>
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
              <dd>{methodLabel || payments[0]?.method || "—"}</dd>
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
  const pattern = (code: number) => CODE128_CODES[code] ?? "";
  let checksum = 104;
  let bits = pattern(104);
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index) - 32;
    bits += pattern(code);
    checksum += code * (index + 1);
  }
  bits += pattern(checksum % 103);
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


/* تقرير تصدير مستقل عن سند القبض A5، مع طباعة عربية أصلية. */
const PDF_REPORT_CSS = `
.si-pdf-export { position:fixed; inset:0; z-index:100; overflow:auto; padding:20px; background:#EAF0F6; color:#0F172A; font-family:Cairo,Tahoma,Arial,sans-serif; box-sizing:border-box; }
.si-pdf-export * { box-sizing:border-box; }
.si-pdf-toolbar { max-width:1120px; margin:0 auto 16px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; }
.si-pdf-toolbar p { margin:0; color:#475569; font-size:13px; }
.si-pdf-actions { display:flex; gap:8px; }
.si-pdf-actions button { cursor:pointer; border:1px solid #CBD5E1; border-radius:10px; padding:10px 14px; background:#FFFFFF; color:#0B3A66; font:700 13px Cairo,Tahoma,Arial,sans-serif; }
.si-pdf-actions button:first-child { background:#0B3A66; color:#FFFFFF; border-color:#0B3A66; }
.si-pdf-paper { max-width:1120px; margin:0 auto; padding:24px; background:#FFFFFF; border:1px solid #DCE3EB; border-radius:12px; }
.si-pdf-head { border-bottom:2px solid #0B3A66; padding-bottom:14px; }
.si-pdf-head h2 { margin:0 0 5px; color:#0B3A66; font-size:22px; }
.si-pdf-head p { margin:4px 0; color:#475569; font-size:12px; overflow-wrap:anywhere; }
.si-pdf-sums { display:flex; flex-wrap:wrap; gap:12px; margin:14px 0; }
.si-pdf-sums div { flex:1 1 150px; padding:10px; border:1px solid #F2E6D3; background:#FFFAF1; border-radius:8px; font-size:12px; }
.si-pdf-sums b { display:block; margin-top:4px; color:#0B3A66; font-size:15px; }
.si-pdf-table-wrap { overflow-x:auto; }
.si-pdf-table { width:100%; min-width:820px; table-layout:fixed; border-collapse:collapse; font-size:11px; }
.si-pdf-table th, .si-pdf-table td { text-align:right; padding:9px 6px; border:1px solid #DCE3EB; vertical-align:top; overflow-wrap:anywhere; }
.si-pdf-table th { background:#EDF3F9; color:#0B3A66; font-weight:700; }
.si-pdf-table tr:nth-child(even) td { background:#F8FAFC; }
.si-pdf-num { direction:ltr; unicode-bidi:isolate; display:inline-block; }
.si-pdf-months { margin:0 0 14px; }
.si-pdf-months h3 { margin:0 0 6px; font-size:12px; color:#0B3A66; }
.si-pdf-months-table { font-size:10px; }
.si-pdf-foot { margin-top:14px; font-size:11px; color:#475569; }
@media print {
  @page siInvoiceReport { size:A4 landscape; margin:12mm; }
  body:has(> .si-pdf-export) > *:not(.si-pdf-export) { display:none !important; }
  html:has(.si-pdf-export), body:has(> .si-pdf-export) { margin:0 !important; padding:0 !important; height:auto !important; overflow:visible !important; background:#FFFFFF !important; }
  .si-pdf-export { position:static !important; display:block !important; overflow:visible !important; padding:0 !important; background:#FFFFFF !important; page:siInvoiceReport; }
  .si-pdf-toolbar { display:none !important; }
  .si-pdf-paper { max-width:none; margin:0; padding:0; border:0; border-radius:0; }
  .si-pdf-head, .si-pdf-sums { break-inside:avoid; }
  .si-pdf-table-wrap { overflow:visible !important; }
  .si-pdf-table { min-width:0; font-size:10px; }
  .si-pdf-table th, .si-pdf-table td { padding:6px 5px; }
  .si-pdf-table thead { display:table-header-group; }
  .si-pdf-table tr { break-inside:avoid; page-break-inside:avoid; }
  .si-pdf-months h3 { break-after:avoid; }
  .si-pdf-foot { break-inside:avoid; }
  .si-pdf-export { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;

function InvoicePdfReport({ report, onClose }: {
  report: { rows: InvoiceRow[]; search: string; method: string; exportedAt: string };
  onClose: () => void;
}) {
  const reportTotals = {
    total: sumComplete(report.rows, "total_yer"),
    paid: sumComplete(report.rows, "paid_yer"),
    remaining: sumComplete(report.rows, "remaining_yer"),
  };
  const monthlyPdf = buildMonthlySummary(report.rows);
  const printReport = () => window.print();
  const autoPrinted = useRef(false);

  useEffect(() => {
    // Keep the preview after print/cancel so the user can retry or close it.
    const oldTitle = document.title;
    const oldOverflow = document.body.style.overflow;
    document.title = "فواتير-المبيعات";
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const ready = async () => {
      if (document.fonts) await document.fonts.ready;
      if (cancelled) return;
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (cancelled || autoPrinted.current) return;
          autoPrinted.current = true;
          window.print();
        });
      });
    };
    void ready();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      document.title = oldTitle;
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <section className="si-pdf-export" dir="rtl" role="dialog" aria-modal="true" aria-label="تصدير فواتير المبيعات إلى PDF">
      <style dangerouslySetInnerHTML={{ __html: PDF_REPORT_CSS }} />
      <div className="si-pdf-toolbar">
        <p>اختر «حفظ كملف PDF» من وجهة الطباعة. التقرير يشمل الفواتير الظاهرة فقط.</p>
        <div className="si-pdf-actions">
          <button type="button" onClick={printReport}>حفظ / طباعة PDF</button>
          <button type="button" onClick={onClose}>إغلاق المعاينة</button>
        </div>
      </div>
      <article className="si-pdf-paper">
        <header className="si-pdf-head">
          <h2>السوق الشامل — تقرير فواتير المبيعات</h2>
          <p>وقت التصدير: {report.exportedAt} | عدد السجلات: {report.rows.length}</p>
          <p>طريقة الدفع: {report.method} | البحث: {report.search || "بدون بحث"}</p>
          <p>نطاق التقرير: السجلات المحمّلة والظاهرة حسب البحث والفلتر، وليس كامل قاعدة البيانات.</p>
        </header>
        <div className="si-pdf-sums">
          <div>الإجمالي بالريال اليمني<b>{reportTotals.total == null ? "بيانات غير مكتملة" : yerLabel(reportTotals.total)}</b></div>
          <div>المدفوع<b>{reportTotals.paid == null ? "بيانات غير مكتملة" : yerLabel(reportTotals.paid)}</b></div>
          <div>المتبقي عند التسليم<b>{reportTotals.remaining == null ? "بيانات غير مكتملة" : yerLabel(reportTotals.remaining)}</b></div>
        </div>
        {monthlyPdf.length > 0 && (
          <section className="si-pdf-months">
            <h3>الملخص الشهري حسب تاريخ إنشاء الفاتورة/الطلب (توقيت اليمن)</h3>
            <p className="si-pdf-foot">المدفوع رصيد معتمد حالي وليس التحصيل حسب تاريخ الدفع. مستبعد لغياب تاريخ صحيح: {report.rows.length - monthlyPdf.reduce((sum, month) => sum + month.count, 0)} سجل.</p>
            <div className="si-pdf-table-wrap">
              <table className="si-pdf-table si-pdf-months-table">
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th>عدد الفواتير</th>
                    <th>الإجمالي (ر.ي)</th>
                    <th>المدفوع (ر.ي)</th>
                    <th>المتبقي (ر.ي)</th>
                    <th>نسبة التحصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPdf.map((month) => (
                    <tr key={month.key}>
                      <td>{month.label}</td>
                      <td>{month.count}</td>
                      <td><span className="si-pdf-num">{month.missing > 0 ? "غير مكتمل" : money(month.total, 0)}</span></td>
                      <td><span className="si-pdf-num">{month.missing > 0 ? "غير مكتمل" : money(month.paid, 0)}</span></td>
                      <td><span className="si-pdf-num">{month.missing > 0 ? "غير مكتمل" : money(month.remaining, 0)}</span></td>
                      <td><span className="si-pdf-num">{month.missing === 0 && month.total > 0 ? `${money((month.paid / month.total) * 100, 1)}%` : "غير متاحة"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <MonthlyProductsSection rows={report.rows} forReport />
        <div className="si-pdf-table-wrap">
          <table className="si-pdf-table">
            <colgroup><col style={{width:"4%"}} /><col style={{width:"15%"}} /><col style={{width:"16%"}} /><col style={{width:"12%"}} /><col style={{width:"11%"}} /><col style={{width:"12%"}} /><col style={{width:"10%"}} /><col style={{width:"10%"}} /><col style={{width:"10%"}} /></colgroup>
            <thead><tr><th>#</th><th>رقم الفاتورة</th><th>العميل</th><th>كود الشحنة</th><th>التاريخ</th><th>طريقة الدفع</th><th>الإجمالي (ر.ي)</th><th>المدفوع (ر.ي)</th><th>المتبقي (ر.ي)</th></tr></thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={`${row.source ?? "invoice"}-${row.id}-${index}`}>
                  <td>{index + 1}</td>
                  <td><span className="si-pdf-num">{row.invoice_number}</span></td>
                  <td>{row.client || "غير مسجل"}</td>
                  <td><span className="si-pdf-num">{row.tracking_code || "—"}</span></td>
                  <td>{dateLabel(row.created_at)}</td>
                  <td>{(row.payment_methods ?? []).map((key) => METHOD_LABEL[key] ?? key).join("، ") || "غير مسجلة"}</td>
                  <td><span className="si-pdf-num">{row.total_yer == null ? "غير مسجل" : money(row.total_yer, 0)}</span></td>
                  <td><span className="si-pdf-num">{row.paid_yer == null ? "غير مسجل" : money(row.paid_yer, 0)}</span></td>
                  <td><span className="si-pdf-num">{row.remaining_yer == null ? "غير مسجل" : money(row.remaining_yer, 0)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="si-pdf-foot">تقرير فواتير وليس سند قبض مستقلًا. الدفعات المحتسبة هي المعتمدة فقط. القيم غير المتوفرة موضحة ولا تُعامل كصفر.</footer>
      </article>
    </section>,
    document.body,
  );
}

export default GuardedSalesInvoicesPage;
