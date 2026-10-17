import { describe, expect, it } from "vitest";
import {
  buildReceivedPresentation,
  calculateApprovedReceived,
  type ApprovedPaymentRow,
} from "./client-reports.received-summary";

const plainAmount = (amount: number) => String(amount);

function present(rows: ApprovedPaymentRow[]) {
  return buildReceivedPresentation(calculateApprovedReceived(rows), plainAmount);
}

describe("المقبوض المعتمد في كشف حساب العملاء", () => {
  it("يعرض غير مكتمل في التقرير وواتساب عند وجود دفعة معتمدة بلا مبلغ", () => {
    const result = present([
      { kind: "دفعة", status: "معتمد", amount: 100, currency: "ر.ي" },
      { kind: "دفعة", status: "معتمد", amount: null, currency: "ر.ي" },
      { kind: "دفعة", status: "معلق", amount: 900, currency: "ر.ي" },
    ]);

    expect(result.state).toBe("incomplete");
    expect(result.reportText).toBe("غير مكتمل");
    expect(result.partialText).toContain("100 ر.ي");
    expect(result.whatsappText).toContain("المقبوض المعتمد: غير مكتمل");
    expect(result.whatsappText).toContain("100 ر.ي");
    expect(result.whatsappText).not.toContain("المقبوض المعتمد: 100 ر.ي");
  });

  it("يعرض مجموع كل المبالغ المعتمدة الصحيحة في التقرير وواتساب", () => {
    const result = present([
      { kind: "دفعة", status: "معتمد", amount: 100, currency: "ر.ي" },
      { kind: "دفعة", status: "معتمد", amount: 50, currency: "ر.ي" },
      { kind: "دفعة", status: "معتمد", amount: 7, currency: "USD" },
      { kind: "دفعة", status: "مرفوض", amount: 999, currency: "ر.ي" },
    ]);

    expect(result.state).toBe("complete");
    expect(result.reportText).toBe("150 ر.ي، 7 USD");
    expect(result.whatsappText).toBe(
      "- المقبوض المعتمد: 150 ر.ي\n- المقبوض المعتمد: 7 USD",
    );
  });

  it("يعرض عدم وجود دفعات معتمدة لا صفرًا عند عدم وجودها", () => {
    const result = present([
      { kind: "دفعة", status: "معلق", amount: 20, currency: "ر.ي" },
      { kind: "دفعة", status: "مرفوض", amount: null, currency: "ر.ي" },
    ]);

    expect(result.state).toBe("none");
    expect(result.reportText).toBe("لا توجد دفعات معتمدة");
    expect(result.whatsappText).toBe(
      "- لا توجد دفعات معتمدة ضمن الفترة المحددة",
    );
  });
});
