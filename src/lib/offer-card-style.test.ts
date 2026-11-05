import { describe, expect, it } from "vitest";
import { normalizeHex, readableTextOn, resolveCardColors, safeImageUrl } from "./offer-card-style";

describe("offer card colors", () => {
  it("accepts any 6-digit hex color the admin picks", () => {
    expect(normalizeHex("#12ab9f")).toBe("#12AB9F");
    expect(normalizeHex("#abc")).toBe("#AABBCC");
  });

  it("rejects values that are not colors", () => {
    expect(normalizeHex("red; background:url(x)")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
  });

  it("falls back to the template color only for missing colors", () => {
    const colors = resolveCardColors("deals", { bg_color: "#0F4C81", text_color: null });
    expect(colors.bg_color).toBe("#0F4C81");
    expect(colors.text_color).toBe("#7A2140");
  });

  it("picks white button text on dark buttons and black on light ones", () => {
    expect(readableTextOn("#0A2540")).toBe("#FFFFFF");
    expect(readableTextOn("#FB923C")).toBe("#000000");
  });

  it("only allows https image links", () => {
    expect(safeImageUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(safeImageUrl("http://example.com/a.jpg")).toBeNull();
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
  });
});
