import { describe, expect, it } from "vitest";
import { computeFundBalances } from "./finance-vouchers";

describe("computeFundBalances", () => {
  it("adds receipts and subtracts payments per fund and currency", () => {
    const balances = computeFundBalances([
      { voucher_type: "receipt", amount: 50000, currency: "YER", fund: "cash" },
      { voucher_type: "payment", amount: 12000, currency: "YER", fund: "cash" },
      { voucher_type: "receipt", amount: 300, currency: "SAR", fund: "kuraimi" },
    ]);
    expect(balances.cash?.YER).toBe(38000);
    expect(balances.kuraimi?.SAR).toBe(300);
  });

  it("keeps currencies separate inside the same fund", () => {
    const balances = computeFundBalances([
      { voucher_type: "receipt", amount: 100, currency: "USD", fund: "najm" },
      { voucher_type: "receipt", amount: 1000, currency: "YER", fund: "najm" },
    ]);
    expect(balances.najm).toEqual({ USD: 100, YER: 1000 });
  });
});
