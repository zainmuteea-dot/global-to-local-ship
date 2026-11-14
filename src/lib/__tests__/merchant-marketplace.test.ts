import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  createSignedUrl: vi.fn(),
  results: {} as Record<string, Array<{ data: unknown; error: unknown }>>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: vi.fn(() => ({ createSignedUrl: mocks.createSignedUrl })),
    },
  },
}));

import { loadMarketplace } from "../merchant-marketplace";

const product = {
  id: "product-1",
  store_id: "store-1",
  title: "منتج تجريبي",
  description: "وصف المنتج",
  category: "عام",
  price: 100,
  currency: "YER" as const,
  stock: 3,
  image_path: "product-1/image.jpg",
  status: "approved" as const,
  created_at: "2026-11-13T12:00:00Z",
  updated_at: "2026-11-13T12:00:00Z",
};

const store = {
  id: "store-1",
  name: "متجر تجريبي",
  contact_phone: "777000000",
  city: "صنعاء",
};

function setQueryResults(table: string, results: Array<{ data: unknown; error: unknown }>) {
  mocks.results[table] = [...results];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results = {};
  mocks.from.mockImplementation((table: string) => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      order: vi.fn(() => builder),
      in: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(mocks.results[table]?.shift() ?? { data: null, error: null }).then(resolve, reject),
    };
    return builder;
  });
  mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/signed-image" }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("loadMarketplace store-query failures", () => {
  it("rejects when loading active stores fails", async () => {
    setQueryResults("merchant_products", [{ data: [product], error: null }]);
    setQueryResults("merchant_stores", [{ data: null, error: { message: "stores unavailable" } }]);

    await expect(loadMarketplace()).rejects.toMatchObject({ message: "stores unavailable" });
    expect(mocks.from).toHaveBeenNthCalledWith(1, "merchant_products");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "merchant_stores");
  });

  it("loads products on retry after the active-store query recovers", async () => {
    setQueryResults("merchant_products", [
      { data: [product], error: null },
      { data: [product], error: null },
    ]);
    setQueryResults("merchant_stores", [
      { data: null, error: { message: "temporary store-query failure" } },
      { data: [store], error: null },
    ]);

    await expect(loadMarketplace()).rejects.toMatchObject({ message: "temporary store-query failure" });
    const products = await loadMarketplace();

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: "product-1",
      store,
      image_url: "https://example.test/signed-image",
    });
    expect(mocks.from).toHaveBeenCalledTimes(4);
  });
});
