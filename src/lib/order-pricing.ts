export type OrderPriceCurrency = "USD" | "SAR" | "YER";

export const FIXED_YER_RATES: Readonly<Record<OrderPriceCurrency, number>> = {
  USD: 535,
  SAR: 140,
  YER: 1,
};

export type OrderPriceSource = {
  total_cost_yer?: unknown;
  total_cost_sar?: unknown;
  total_cost_usd?: unknown;
  original_currency?: unknown;
  quote_currency?: unknown;
  notes?: string | null;
};

export function normalizeOrderPriceCurrency(value: unknown): OrderPriceCurrency | null {
  const currency = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["usd", "us$", "$", "دولار", "دولار أمريكي"].includes(currency)) return "USD";
  if (["sar", "ر.س", "ر.س.", "ريال سعودي", "سعودي"].includes(currency)) return "SAR";
  if (["yer", "yrl", "ريال يمني", "ر.ي", "ر.ي.", "ريال", "يمني"].includes(currency)) return "YER";
  if (currency.includes("دولار") || currency.includes("$") || currency.includes("usd"))
    return "USD";
  if (currency.includes("سعودي") || currency.includes("ر.س") || currency.includes("sar"))
    return "SAR";
  if (currency.includes("يمني") || currency.includes("ر.ي") || currency.includes("yer"))
    return "YER";
  return null;
}

export function parseQuotedOrderPrice(notes: string | null | undefined): {
  amount: number;
  currency: OrderPriceCurrency;
} | null {
  const match = (notes ?? "").match(/السعر المعلن:\s*([\d,]+(?:\.\d+)?)\s*([^|]*)/i);
  if (!match) return null;
  const amount = Number((match[1] ?? "").replace(/,/g, ""));
  const currency = normalizeOrderPriceCurrency(match[2]);
  if (!Number.isFinite(amount) || amount <= 0 || !currency) return null;
  return { amount, currency };
}

export function convertOrderPriceToYER(amount: number, currency: OrderPriceCurrency): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * FIXED_YER_RATES[currency]);
}

function positiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** Recalculates only when the original currency and source amount are clear.
 * Otherwise it preserves the saved YER total, or returns null instead of guessing. */
export function resolveOrderTotalYER(order: OrderPriceSource): number | null {
  const quoted = parseQuotedOrderPrice(order.notes);
  const originalCurrency = normalizeOrderPriceCurrency(order.original_currency);
  const quoteCurrency = normalizeOrderPriceCurrency(order.quote_currency);
  const sourceCurrency = originalCurrency ?? quoteCurrency ?? quoted?.currency ?? null;

  if (sourceCurrency) {
    const sourceAmount =
      sourceCurrency === "SAR"
        ? positiveNumber(order.total_cost_sar)
        : sourceCurrency === "USD"
          ? positiveNumber(order.total_cost_usd)
          : positiveNumber(order.total_cost_yer);
    const amount = sourceAmount ?? (quoted?.currency === sourceCurrency ? quoted.amount : null);
    if (amount !== null) return convertOrderPriceToYER(amount, sourceCurrency);
  }

  return positiveNumber(order.total_cost_yer);
}
