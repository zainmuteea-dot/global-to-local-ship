import { describe, expect, it } from "vitest";
import {
  createPaymentMethodNormalizer,
  getPaymentMethodName,
  type PaymentMethodDefinition,
} from "./payment-methods";

const methods: PaymentMethodDefinition[] = [
  { key: "najm", aliases: ["النجم", "نجم", "najm"] },
  { key: "karimi", aliases: ["الكريمي", "كريمي", "karimi"] },
  { key: "onecash", aliases: ["ون كاش", "onecash", "one"] },
  { key: "jawali", aliases: ["جوالي", "جوال", "jawali"] },
  { key: "floosak", aliases: ["فلوسك", "floosak"] },
];

const normalizeMethod = createPaymentMethodNormalizer(methods);

describe("payment method normalization", () => {
  it.each([
    ["الكريمي جوال / حاسب", "karimi"],
    ["ون كاش OneCash", "onecash"],
    ["حوالة النجم", "najm"],
    ["فلوسك Floosak", "floosak"],
    ["جوالي Jawali", "jawali"],
  ])("recognizes compound method name %s", (raw, expected) => {
    expect(normalizeMethod(raw)).toBe(expected);
  });

  it("prefers the more specific method within a compound label", () => {
    expect(normalizeMethod("الكريمي جوال / حاسب")).toBe("karimi");
  });

  it("does not match a short Latin alias inside another word", () => {
    expect(normalizeMethod("someone online")).toBeNull();
  });

  it("returns null for an unknown label", () => {
    expect(normalizeMethod("محفظة غير مدرجة")).toBeNull();
  });
});

describe("payment method field fallback", () => {
  it("uses the first non-empty method field in priority order", () => {
    expect(
      getPaymentMethodName({ payment_method: "  ", wallet: "الكريمي", method: "karimi" }),
    ).toBe("الكريمي");
  });

  it("uses method when earlier fields are absent", () => {
    expect(getPaymentMethodName({ method: "jawali" })).toBe("jawali");
  });

  it("returns an empty label when no supported field contains text", () => {
    expect(getPaymentMethodName({ payment_method: null, wallet: 3 })).toBe("");
  });
});
