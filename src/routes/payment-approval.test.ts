export const PENDING_APPROVAL_STATUSES = ["pending", "بانتظار التأكيد"];

export type ApprovalPayment = {
  id: string;
  amount: number;
  currency: string | null;
  status: string;
  tracking_code: string;
  user_id: string | null;
};

type ApprovedPaymentRow = {
  id: string;
  amount: number | string;
  currency: string | null;
};

type CustomerNotice = {
  user_id: string;
  payment_id: string;
  title: string;
  body: string;
};

type ApprovalDependencies = {
  /** Must atomically update only while payment.status is one of pendingStatuses. */
  approvePending: (
    paymentId: string,
    pendingStatuses: string[],
  ) => Promise<boolean>;
  getOrderNotes: (trackingCode: string) => Promise<string | null>;
  listApprovedPayments: (
    trackingCode: string,
  ) => Promise<ApprovedPaymentRow[]>;
  insertCustomerNotice: (notice: CustomerNotice) => Promise<void>;
};

export type ApprovalResult = {
  approved: boolean;
  notificationSent: boolean;
  body: string | null;
  reason?: "not_pending" | "already_reviewed" | "missing_user";
};

const formatAmount = (value: number) =>
  Math.round(value).toLocaleString("en-US");

function normalizedCurrency(value: string | null | undefined): string {
  const currency = (value || "ر.ي").trim().toUpperCase();
  if (currency === "YER" || currency === "ر.ي" || currency === "ريال يمني") {
    return "YER";
  }
  return currency;
}

function readOrderTotal(
  notes: string | null,
): { amount: number; currency: string } | null {
  const match = notes?.match(/السعر المعلن:\s*([\d.]+)\s*([^|]*)/);
  if (!match) return null;

  const amount = Number(match[1]);
  const currency = (match[2] || "ر.ي").trim();
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (currency.includes("سعودي") || currency.includes("ر.س")) {
    return { amount: Math.round(amount * 142), currency: "YER" };
  }
  if (currency.includes("$") || currency.includes("دولار")) {
    return { amount: Math.round(amount * 535), currency: "YER" };
  }
  return { amount: Math.round(amount), currency };
}

export async function approvePaymentOnce(
  payment: ApprovalPayment,
  dependencies: ApprovalDependencies,
): Promise<ApprovalResult> {
  const amount = Number(payment.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("مبلغ الدفعة يجب أن يكون عددًا صحيحًا أكبر من صفر.");
  }

  if (!PENDING_APPROVAL_STATUSES.includes(payment.status)) {
    return {
      approved: false,
      notificationSent: false,
      body: null,
      reason: "not_pending",
    };
  }

  // Compare-and-set in the database prevents concurrent/double approval.
  const updated = await dependencies.approvePending(
    payment.id,
    PENDING_APPROVAL_STATUSES,
  );
  if (!updated) {
    return {
      approved: false,
      notificationSent: false,
      body: null,
      reason: "already_reviewed",
    };
  }

  if (!payment.user_id) {
    return {
      approved: true,
      notificationSent: false,
      body: null,
      reason: "missing_user",
    };
  }

  let body =
    `تم اعتماد وتسجيل ${formatAmount(amount)} ${payment.currency || "ر.ي"} ` +
    `للطلب ${payment.tracking_code}. لا يُعد المبلغ مسجلًا إلا بعد نجاح اعتماد الدفعة.`;

  try {
    const notes = await dependencies.getOrderNotes(payment.tracking_code);
    const total = readOrderTotal(notes);

    if (
      total &&
      normalizedCurrency(total.currency) === normalizedCurrency(payment.currency)
    ) {
      const approved = await dependencies.listApprovedPayments(
        payment.tracking_code,
      );
      const matchingCurrency = approved.every(
        (row) => normalizedCurrency(row.currency) === normalizedCurrency(payment.currency),
      );
      const includesCurrentPayment = approved.some(
        (row) => row.id === payment.id,
      );

      if (matchingCurrency && includesCurrentPayment) {
        const paid = approved.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const remaining = Math.max(total.amount - paid, 0);
        body =
          `تم اعتماد وتسجيل ${formatAmount(amount)} ${payment.currency || "ر.ي"} ` +
          `للطلب ${payment.tracking_code}. إجمالي الطلب: ${formatAmount(total.amount)} ر.ي، ` +
          `المدفوع حتى الآن: ${formatAmount(paid)} ر.ي، ` +
          `المتبقي عليك: ${formatAmount(remaining)} ر.ي.`;
      } else {
        body += " تعذر حساب المتبقي بدقة؛ راجع صفحة الدفع.";
      }
    } else {
      body += " تعذر تحديد إجمالي الطلب لحساب المتبقي؛ راجع صفحة الدفع.";
    }
  } catch {
    body += " تعذر حساب المتبقي تلقائيًا؛ راجع صفحة الدفع.";
  }

  try {
    await dependencies.insertCustomerNotice({
      user_id: payment.user_id,
      payment_id: payment.id,
      title: `تم اعتماد دفعتك للطلب ${payment.tracking_code}`,
      body,
    });
    return { approved: true, notificationSent: true, body };
  } catch {
    // Approval already succeeded; a notification failure must not reverse it.
    return { approved: true, notificationSent: false, body };
  }
}
