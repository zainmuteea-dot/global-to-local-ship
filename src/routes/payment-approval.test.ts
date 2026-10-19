import { describe, expect, it, vi } from "vitest";
import { approvePaymentOnce, type ApprovalPayment } from "./payment-approval";

const payment: ApprovalPayment = {
  id: "payment-1",
  amount: 40_000,
  currency: "ر.ي",
  status: "pending",
  tracking_code: "SHP-100",
  user_id: "customer-1",
};

function makeDependencies() {
  return {
    approvePending: vi.fn().mockResolvedValue(true),
    getOrderNotes: vi.fn().mockResolvedValue("السعر المعلن: 100000 ر.ي"),
    listApprovedPayments: vi.fn().mockResolvedValue([
      { id: "payment-old", amount: 10_000, currency: "YER" },
      { id: "payment-1", amount: 40_000, currency: "ر.ي" },
    ]),
    insertCustomerNotice: vi.fn().mockResolvedValue(undefined),
  };
}

describe("approvePaymentOnce", () => {
  it("يعتمد مرة واحدة فقط ويرسل إشعارًا واحدًا", async () => {
    const dependencies = makeDependencies();
    let alreadyApproved = false;
    dependencies.approvePending.mockImplementation(async () => {
      if (alreadyApproved) return false;
      alreadyApproved = true;
      return true;
    });

    const first = await approvePaymentOnce(payment, dependencies);
    const second = await approvePaymentOnce(payment, dependencies);

    expect(first.approved).toBe(true);
    expect(first.notificationSent).toBe(true);
    expect(second.approved).toBe(false);
    expect(second.reason).toBe("already_reviewed");
    expect(dependencies.insertCustomerNotice).toHaveBeenCalledTimes(1);
  });

  it("يحسب المدفوع والمتبقي بناءً على الدفعات المعتمدة", async () => {
    const dependencies = makeDependencies();
    const result = await approvePaymentOnce(payment, dependencies);

    expect(result.approved).toBe(true);
    expect(result.body).toContain("المدفوع حتى الآن: 50,000 ر.ي");
    expect(result.body).toContain("المتبقي عليك: 50,000 ر.ي");
  });

  it("يرفض مبلغ الصفر قبل تحديث الحالة أو إرسال الإشعار", async () => {
    const dependencies = makeDependencies();

    await expect(approvePaymentOnce({ ...payment, amount: 0 }, dependencies)).rejects.toThrow(
      "أكبر من صفر",
    );

    expect(dependencies.approvePending).not.toHaveBeenCalled();
    expect(dependencies.insertCustomerNotice).not.toHaveBeenCalled();
  });

  it("لا يرسل إشعار نجاح عند فشل الاعتماد", async () => {
    const dependencies = makeDependencies();
    dependencies.approvePending.mockRejectedValue(new Error("فشل الاعتماد"));

    await expect(approvePaymentOnce(payment, dependencies)).rejects.toThrow("فشل الاعتماد");
    expect(dependencies.insertCustomerNotice).not.toHaveBeenCalled();
  });

  it("لا يرسل إشعارًا إذا لم تعد الحالة بانتظار الاعتماد", async () => {
    const dependencies = makeDependencies();
    const result = await approvePaymentOnce({ ...payment, status: "approved" }, dependencies);

    expect(result.approved).toBe(false);
    expect(dependencies.approvePending).not.toHaveBeenCalled();
    expect(dependencies.insertCustomerNotice).not.toHaveBeenCalled();
  });
});
