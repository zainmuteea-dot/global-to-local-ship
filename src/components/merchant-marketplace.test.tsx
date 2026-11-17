// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("swr", () => ({ default: mocks.useSWR }));
vi.mock("@/hooks/use-session", () => ({ useSession: () => ({ user: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async (path: string) => ({
          data: { signedUrl: `https://example.test/${path.split("/").pop()}` },
          error: null,
        })),
      })),
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

import { MerchantMarketplace } from "./merchant-marketplace";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IntersectionObserver", class {
    private callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) { this.callback = callback; }
    observe(target: Element) { this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = "0px";
    thresholds = [];
  });
  mocks.useSWR.mockImplementation((key: unknown) =>
    key === "merchant-marketplace"
      ? {
          data: [],
          error: new Error("network unavailable"),
          isLoading: false,
          mutate: mocks.mutate,
        }
      : { data: null, error: undefined, isLoading: false, mutate: vi.fn() },
  );
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("MerchantMarketplace retry and product images", () => {
  it("retries loading marketplace products when the retry button is pressed", () => {
    render(<MerchantMarketplace />);

    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it("shows the product fallback when its image fails to load", () => {
    mocks.useSWR.mockImplementation((key: unknown) =>
      key === "merchant-marketplace"
        ? {
            data: [
              {
                id: "product-1",
                store_id: "store-1",
                title: "منتج تجريبي",
                description: "وصف",
                category: "عام",
                price: 100,
                old_price: 150,
                discount_percent: 33,
                sku: "SKU-TEST-42",
                currency: "YER",
                stock: 2,
                image_path: "store-1/image.jpg",
                image_url: "https://example.test/broken.jpg",
                status: "approved",
                created_at: "2026-11-13T12:00:00Z",
                updated_at: "2026-11-13T12:00:00Z",
                store: {
                  id: "store-1",
                  name: "متجر تجريبي",
                  city: "صنعاء",
                  contact_phone: "777000000",
                },
              },
            ],
            error: undefined,
            isLoading: false,
            mutate: mocks.mutate,
          }
        : { data: null, error: undefined, isLoading: false, mutate: vi.fn() },
    );

    render(<MerchantMarketplace />);

    await waitFor(() => expect(screen.getByRole("img", { name: "منتج تجريبي" })).toBeTruthy());
    fireEvent.error(screen.getByRole("img", { name: "منتج تجريبي" }));

    expect(screen.getByRole("img", { name: "صورة افتراضية للمنتج" })).toBeTruthy();
    expect(screen.getAllByText("متجر تجريبي").length).toBeGreaterThan(0);
  });
});

it("opens the new quick view with stock controls and product details", async () => {
  mocks.useSWR.mockImplementation((key: unknown) =>
    key === "merchant-marketplace"
      ? {
          data: [
            {
              id: "product-quick-view",
              store_id: "store-1",
              title: "منتج تجريبي",
              description: "تفاصيل المنتج",
              category: "عام",
              price: 100,
              old_price: 150,
              discount_percent: 33,
              sku: "SKU-TEST-42",
              currency: "YER",
              stock: 2,
              image_path: "store-1/product-800.webp",
              image_url: "https://example.test/product-800.webp",
              status: "approved",
              created_at: "2026-11-13T12:00:00Z",
              updated_at: "2026-11-13T12:00:00Z",
              store: {
                id: "store-1",
                name: "متجر تجريبي",
                city: "صنعاء",
                contact_phone: "777000000",
              },
            },
          ],
          error: undefined,
          isLoading: false,
          mutate: mocks.mutate,
        }
      : { data: null, error: undefined, isLoading: false, mutate: vi.fn() },
  );

  render(<MerchantMarketplace />);
  await waitFor(() => {
    expect(screen.getByRole("img", { name: "منتج تجريبي" }).getAttribute("src")).toBe(
      "https://example.test/product-800.webp",
    );
  });
  fireEvent.click(screen.getByRole("button", { name: "معاينة منتج تجريبي" }));

  expect(screen.getByRole("dialog")).toBeTruthy();
  await waitFor(() => {
    expect(
      screen.getAllByRole("img", { name: "منتج تجريبي" }).map((image) => image.getAttribute("src")),
    ).toContain("https://example.test/product-800.webp");
  });
  expect(screen.getByText("جاهزة فوراً")).toBeTruthy();
  expect(screen.getByText("رقم الصنف")).toBeTruthy();
  expect(screen.getByText("SKU-TEST-42")).toBeTruthy();
  expect(screen.getAllByText(/خصم 33٪/).length).toBe(2);
  expect(screen.getAllByText("متجر تجريبي").length).toBeGreaterThan(0);
  expect(screen.getByText("متوفر (٢)")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /وصف المنتج/ }));
  expect(screen.getByText("تفاصيل المنتج")).toBeTruthy();
});
