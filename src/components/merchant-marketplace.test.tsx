// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    storage: { from: vi.fn() },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

import { MerchantMarketplace } from "./merchant-marketplace";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useSWR.mockImplementation((key: unknown) =>
    key === "merchant-marketplace"
      ? { data: [], error: new Error("network unavailable"), isLoading: false, mutate: mocks.mutate }
      : { data: null, error: undefined, isLoading: false, mutate: vi.fn() },
  );
});

afterEach(() => cleanup());

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
            data: [{
              id: "product-1", store_id: "store-1", title: "منتج تجريبي", description: "وصف", category: "عام",
              price: 100, currency: "YER", stock: 2, image_path: "store-1/image.jpg", image_url: "https://example.test/broken.jpg",
              status: "approved", created_at: "2026-11-13T12:00:00Z", updated_at: "2026-11-13T12:00:00Z",
              store: { id: "store-1", name: "متجر تجريبي", city: "صنعاء", contact_phone: "777000000" },
            }], error: undefined, isLoading: false, mutate: mocks.mutate,
          }
        : { data: null, error: undefined, isLoading: false, mutate: vi.fn() },
    );

    render(<MerchantMarketplace />);

    fireEvent.error(screen.getByRole("img", { name: "منتج تجريبي" }));

    expect(screen.getByText("صورة المنتج غير متاحة")).toBeTruthy();
    expect(screen.getAllByText("متجر تجريبي").length).toBeGreaterThan(0);
  });
});
