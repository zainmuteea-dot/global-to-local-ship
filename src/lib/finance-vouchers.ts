export const FUND_OPTIONS = [
  { value: "kuraimi", label: "مصرف الكريمي" },
  { value: "najm", label: "شبكة النجم" },
  { value: "onecash", label: "ون كاش OneCash" },
  { value: "cash", label: "الصندوق النقدي" },
] as const;

export function fundLabel(fund: string): string {
  return FUND_OPTIONS.find((f) => f.value === fund)?.label ?? fund;
}

type VoucherLike = {
  voucher_type: string;
  amount: number | string;
  currency: string;
  fund: string;
};

/** Balance per fund and currency: receipts add, payments subtract. */
export function computeFundBalances(
  vouchers: VoucherLike[],
): Record<string, Record<string, number>> {
  const balances: Record<string, Record<string, number>> = {};
  for (const v of vouchers) {
    const amount = Number(v.amount);
    if (!Number.isFinite(amount)) continue;
    const sign = v.voucher_type === "receipt" ? 1 : v.voucher_type === "payment" ? -1 : 0;
    if (sign === 0) continue;
    const fund = (balances[v.fund] ??= {});
    fund[v.currency] = Math.round(((fund[v.currency] ?? 0) + sign * amount) * 100) / 100;
  }
  return balances;
}
