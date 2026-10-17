export type ApprovedPaymentRow = {
  kind: string;
  status: string;
  amount: number | null;
  currency: string | null;
};

export type ReceivedSummary = {
  paymentCount: number;
  approvedCount: number;
  hasMissingApprovedAmount: boolean;
  totals: Array<[currency: string, amount: number]>;
};

export type ReceivedPresentation = {
  state: "none" | "complete" | "incomplete";
  reportText: string;
  partialText: string | null;
  whatsappText: string;
  totals: Array<[currency: string, amount: number]>;
};

const CURRENCY_CODES: Record<string, string> = {
  YER: "YER",
  YR: "YER",
  "ر.ي": "YER",
  "رياليمني": "YER",
  USD: "USD",
  "$": "USD",
  SAR: "SAR",
  "ر.س": "SAR",
  AED: "AED",
  "د.إ": "AED",
  CNY: "CNY",
  RMB: "CNY",
  "¥": "CNY",
};

function normalizeCurrency(currency: string | null): string {
  const value = currency?.trim() ?? "";
  if (!value) return "غير محدد";
  return CURRENCY_CODES[value.toUpperCase().replace(/\s+/g, "")] ?? value;
}

function formatNumber(amount: number): string {
  return amount.toLocaleString("ar-YE", { maximumFractionDigits: 2 });
}

function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${formatNumber(amount)} ${currency}`;
  }
}

export function calculateApprovedReceived(
  rows: readonly ApprovedPaymentRow[],
): ReceivedSummary {
  const totals = new Map<string, number>();
  let paymentCount = 0;
  let approvedCount = 0;
  let hasMissingApprovedAmount = false;

  for (const row of rows) {
    if (row.kind !== "دفعة") continue;
    paymentCount += 1;
    if (row.status !== "معتمد") continue;

    approvedCount += 1;
    if (row.amount === null || !Number.isFinite(row.amount)) {
      hasMissingApprovedAmount = true;
      continue;
    }

    const currency = normalizeCurrency(row.currency);
    totals.set(currency, (totals.get(currency) ?? 0) + row.amount);
  }

  return {
    paymentCount,
    approvedCount,
    hasMissingApprovedAmount,
    totals: Array.from(totals.entries()),
  };
}

export function buildReceivedPresentation(
  summary: ReceivedSummary,
  formatAmount: (amount: number, currency: string) => string = formatCurrencyAmount,
): ReceivedPresentation {
  const totals = summary.totals;

  if (summary.approvedCount === 0) {
    const noPayments = summary.paymentCount === 0;
    return {
      state: "none",
      reportText: noPayments
        ? "لا توجد دفعات ضمن الفترة المحددة"
        : "لا توجد دفعات معتمدة ضمن الفترة المحددة",
      partialText: null,
      whatsappText: noPayments
        ? "- لا توجد دفعات ضمن الفترة المحددة"
        : "- توجد دفعات مسجلة، لكن لا توجد دفعات معتمدة ضمن الفترة المحددة",
      totals,
    };
  }

  const partialTotals = totals
    .map(([currency, amount]) => formatAmount(amount, currency))
    .join("، ");

  if (summary.hasMissingApprovedAmount) {
    return {
      state: "incomplete",
      reportText: "غير مكتمل",
      partialText: partialTotals
        ? `المبالغ المعتمدة الموثقة جزئيًا: ${partialTotals}`
        : "لا توجد مبالغ معتمدة موثقة لعرضها جزئيًا.",
      whatsappText: `- المقبوض المعتمد: غير مكتمل؛ توجد دفعة معتمدة بلا مبلغ موثق${
        partialTotals ? `\n- المبالغ المعتمدة الموثقة جزئيًا: ${partialTotals}` : ""
      }`,
      totals,
    };
  }

  const lines = totals.map(
    ([currency, amount]) => `- المقبوض المعتمد: ${formatAmount(amount, currency)}`,
  );
  return {
    state: "complete",
    reportText: totals
      .map(([currency, amount]) => formatAmount(amount, currency))
      .join("\n"),
    partialText: null,
    whatsappText: lines.join("\n"),
    totals,
  };
}
