import { describe, expect, it } from "vitest";
import { productImageVariantPath, productImageVariantPaths } from "./merchant-product-images";

describe("merchant product image variants", () => {
  it("resolves the 400px card and 800px detail siblings", () => {
    const path = "store-1/product-abc-800.webp";
    expect(productImageVariantPath(path, 400)).toBe("store-1/product-abc-400.webp");
    expect(productImageVariantPath(path, 600)).toBeNull();
    expect(productImageVariantPath(path, 800)).toBe(path);
    expect(productImageVariantPaths(path)).toEqual([
      "store-1/product-abc-400.webp",
      "store-1/product-abc-800.webp",
    ]);
  });

  it("uses transforms for older original product images", () => {
    expect(productImageVariantPath("store-1/legacy-product.jpg", 400)).toBeNull();
    expect(productImageVariantPath("store-1/product-abc-1200.webp", 1200)).toBe("store-1/product-abc-1200.webp");
    expect(productImageVariantPath("store-1/product-abc-1200.webp", 800)).toBeNull();
  });
});
