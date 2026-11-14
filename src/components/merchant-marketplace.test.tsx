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

describe("MerchantMarketplace retry", () => {
  it("retries loading marketplace products when the retry button is pressed", () => {
    render(<MerchantMarketplace />);

    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});
