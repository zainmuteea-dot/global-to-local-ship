import { describe, expect, it } from "vitest";
import { productImageVariantPath, productImageVariantPaths } from "./merchant-product-images";

describe("merchant product image variants", () => {
  it("resolves the 400px and 1200px WebP siblings from the stored 1200px path", () => {
    const path = "store-1/product-abc-1200.webp";
    expect(productImageVariantPath(path, 400)).toBe("store-1/product-abc-400.webp");
    expect(productImageVariantPath(path, 1200)).toBe(path);
    expect(productImageVariantPaths(path)).toEqual([
      "store-1/product-abc-400.webp",
      "store-1/product-abc-1200.webp",
    ]);
  });

  it("leaves legacy image paths intact so Supabase can resize them for display", () => {
    expect(productImageVariantPath("store-1/legacy-product.jpg", 400)).toBeNull();
    expect(productImageVariantPaths("store-1/legacy-product.jpg")).toBeNull();
  });
});
