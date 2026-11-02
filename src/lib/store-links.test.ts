import { describe, expect, it } from "vitest";
import { normalizeStoreUrl } from "./store-links";

describe("normalizeStoreUrl", () => {
  it("adds https:// to a bare AliExpress address", () => {
    expect(normalizeStoreUrl("ar.aliexpress.com")).toBe("https://ar.aliexpress.com/");
  });

  it("keeps a full https link unchanged", () => {
    expect(normalizeStoreUrl("https://s.click.aliexpress.com/e/_abc")).toBe(
      "https://s.click.aliexpress.com/e/_abc",
    );
  });

  it("rejects non-https and script links", () => {
    expect(normalizeStoreUrl("http://aliexpress.com")).toBeNull();
    expect(normalizeStoreUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects empty or spaced input", () => {
    expect(normalizeStoreUrl("   ")).toBeNull();
    expect(normalizeStoreUrl("ali express.com")).toBeNull();
  });
});
