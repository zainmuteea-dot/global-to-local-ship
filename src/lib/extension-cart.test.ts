import { describe, expect, it } from "vitest";
import { addToCart, detectCartStore, parseIncomingItem } from "./extension-cart";

describe("extension cart", () => {
  it("accepts only SHEIN, Noon and Amazon https links", () => {
    expect(detectCartStore("https://ar.shein.com/x-p-123.html")).toBe("shein");
    expect(detectCartStore("https://www.noon.com/saudi-ar/p/N1/")).toBe("noon");
    expect(detectCartStore("https://www.amazon.sa/dp/B0X")).toBe("amazon");
    expect(detectCartStore("https://www.temu.com/x")).toBeNull();
    expect(detectCartStore("http://www.amazon.com/dp/B0X")).toBeNull();
    expect(detectCartStore("https://amazon.com.evil.io/dp/B0X")).toBeNull();
  });

  it("keeps price only for USD or SAR", () => {
    const sar = parseIncomingItem({ url: "https://www.noon.com/p/1", price: "1,250.5", currency: "SAR" });
    expect(sar?.price).toBe(1250.5);
    expect(sar?.currency).toBe("SAR");
    const aed = parseIncomingItem({ url: "https://www.noon.com/p/1", price: 99, currency: "AED" });
    expect(aed?.price).toBeNull();
  });

  it("does not duplicate the same product link", () => {
    const a = parseIncomingItem({ url: "https://www.amazon.com/dp/A", price: 5, currency: "USD" })!;
    const b = parseIncomingItem({ url: "https://www.amazon.com/dp/A", price: 6, currency: "USD" })!;
    const cart = addToCart(addToCart([], a), b);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.price).toBe(6);
  });
});
