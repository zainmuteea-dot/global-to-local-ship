export type ApprovedPaymentRow = {
  kind: string;
  status: string;
  amount: number | null;
  currency: string | null;
};

export type ReceivedSummary = {
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

function defaultFormatAmount(amount: number): string {
  return amount.toLocaleString("ar-YE", { maximumFractionDigits: 2 });
}

export function calculateApprovedReceived(
  rows: readonly ApprovedPaymentRow[],
): ReceivedSummary {
  const totals = new Map<string, number>();
  let approvedCount = 0;
  let hasMissingApprovedAmount = false;

  for (const row of rows) {
    if (row.kind !== "دفعة" || row.status !== "معتمد") continue;
    approvedCount += 1;
    if (row.amount === null || !Number.isFinite(row.amount)) {
      hasMissingApprovedAmount = true;
      continue;
    }
    const currency = row.currency || "غير محدد";
    totals.set(currency, (totals.get(currency) ?? 0) + row.amount);
  }

  return {
    approvedCount,
    hasMissingApprovedAmount,
    totals: Array.from(totals.entries()),
  };
}

export function buildReceivedPresentation(
  summary: ReceivedSummary,
  formatAmount: (amount: number) => string = defaultFormatAmount,
): ReceivedPresentation {
  const totals = summary.totals;
  if (summary.approvedCount === 0) {
    return {
      state: "none",
      reportText: "لا توجد دفعات معتمدة",
      partialText: null,
      whatsappText: "- لا توجد دفعات معتمدة ضمن الفترة المحددة",
      totals,
    };
  }

  const partialTotals = totals
    .map(([currency, amount]) => `${formatAmount(amount)} ${currency}`)
    .join("، ");

  if (summary.hasMissingApprovedAmount) {
    return {
      state: "incomplete",
      reportText: "غير مكتمل",
      partialText: partialTotals
        ? `المبالغ المعتمدة الموثقة جزئيًا: ${partialTotals}`
        : "لا توجد مبالغ معتمدة موثقة لعرضها جزئيًا.",
      whatsappText: `- المقبوض المعتمد: غير مكتمل؛ توجد دفعة معتمدة بلا مبلغ موثق${
        partialTotals ? `\n- إجمالي المبالغ المعتمدة الموثقة جزئيًا: ${partialTotals}` : ""
      }`,
      totals,
    };
  }

  const lines = totals.map(
    ([currency, amount]) => `- المقبوض المعتمد: ${formatAmount(amount)} ${currency}`,
  );
  return {
    state: "complete",
    reportText: totals
      .map(([currency, amount]) => `${formatAmount(amount)} ${currency}`)
      .join("، "),
    partialText: null,
    whatsappText: lines.join("\n"),
    totals,
  };
}
