import { describe, expect, it } from "vitest";
import {
  buildReceivedPresentation,
  calculateApprovedReceived,
  type ApprovedPaymentRow,
} from "./client-reports.received-summary";

const controlledCurrencyFormat = (amount: number, currency: string) =>
  `${amount.toLocaleString("en-US")} ${currency}`;

function present(rows: ApprovedPaymentRow[]) {
  return buildReceivedPresentation(calculateApprovedReceived(rows), controlledCurrencyFormat);
}

describe("ملخص المقبوض المعتمد في كشف حساب العملاء", () => {
  it("يوضح عدم وجود أي دفعات بدل عرض صفر", () => {
    const result = present([{ kind: "طلب", status: "مسجل", amount: null, currency: null }]);

    expect(result.state).toBe("none");
    expect(result.reportText).toBe("لا توجد دفعات ضمن الفترة المحددة");
    expect(result.whatsappText).toBe("- لا توجد دفعات ضمن الفترة المحددة");
  });

  it("يميّز وجود دفعات معلقة أو مرفوضة عن عدم وجود دفعات", () => {
    const result = present([
      { kind: "دفعة", status: "معلق", amount: 20, currency: "YER" },
      { kind: "دفعة", status: "مرفوض", amount: null, currency: "YER" },
    ]);

    expect(result.state).toBe("none");
    expect(result.reportText).toBe("لا توجد دفعات معتمدة ضمن الفترة المحددة");
    expect(result.whatsappText).toContain("توجد دفعات مسجلة");
  });

  it("يعرض المقبوض غير مكتمل في التقرير وواتساب عند غياب مبلغ دفعة معتمدة", () => {
    const result = present([
      { kind: "دفعة", status: "معتمد", amount: 100, currency: "YER" },
      { kind: "دفعة", status: "معتمد", amount: null, currency: "YER" },
      { kind: "دفعة", status: "معلق", amount: 900, currency: "YER" },
    ]);

    expect(result.state).toBe("incomplete");
    expect(result.reportText).toBe("غير مكتمل");
    expect(result.partialText).toContain("100 YER");
    expect(result.whatsappText).toContain("المقبوض المعتمد: غير مكتمل");
    expect(result.whatsappText).toContain("100 YER");
    expect(result.whatsappText).not.toContain("المقبوض المعتمد: 100 YER");
  });

  it("يجمع المبالغ بحسب العملة ويعرض كل إجمالي في سطر مستقل", () => {
    const result = present([
      { kind: "دفعة", status: "معتمد", amount: 100, currency: "YER" },
      { kind: "دفعة", status: "معتمد", amount: 50, currency: "YER" },
      { kind: "دفعة", status: "معتمد", amount: 7, currency: "USD" },
      { kind: "دفعة", status: "مرفوض", amount: 999, currency: "YER" },
    ]);

    expect(result.state).toBe("complete");
    expect(result.reportText).toBe("150 YER\n7 USD");
    expect(result.whatsappText).toBe("- المقبوض المعتمد: 150 YER\n- المقبوض المعتمد: 7 USD");
  });

  it("ينسق العملة برمز العملة المحلي عند استخدام المنسق الافتراضي", () => {
    const summary = calculateApprovedReceived([
      { kind: "دفعة", status: "معتمد", amount: 125, currency: "YER" },
      { kind: "دفعة", status: "معتمد", amount: 8, currency: "USD" },
    ]);
    const result = buildReceivedPresentation(summary);
    const expectedYER = new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    }).format(125);
    const expectedUSD = new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "USD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    }).format(8);

    expect(result.reportText).toBe(`${expectedYER}\n${expectedUSD}`);
    expect(result.whatsappText).toContain(expectedYER);
    expect(result.whatsappText).toContain(expectedUSD);
  });
});
