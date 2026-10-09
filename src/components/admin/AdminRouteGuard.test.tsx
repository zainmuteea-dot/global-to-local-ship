// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRouteGuard } from "./AdminRouteGuard";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    rpc: mocks.rpc,
  },
}));

const adminSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 9999999999,
  user: { id: "admin-user-id", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" },
};
const customerSession = {
  ...adminSession,
  user: { ...adminSession.user, id: "customer-user-id" },
};

function renderProtectedAdmin(onUnauthorized = vi.fn()) {
  render(
    <AdminRouteGuard onUnauthorized={onUnauthorized}>
      <div>محتوى لوحة الإدارة</div>
    </AdminRouteGuard>,
  );
  return onUnauthorized;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
});

afterEach(() => cleanup());

describe("/admin route guard", () => {
  it("allows an authenticated admin into the protected page", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: adminSession }, error: null });
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    renderProtectedAdmin();

    expect(await screen.findByText("محتوى لوحة الإدارة")).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "admin-user-id",
      _role: "admin",
    });
  });

  it("redirects an unauthenticated visitor and never renders admin content", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const onUnauthorized = renderProtectedAdmin();

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledWith(undefined));
    expect(screen.queryByText("محتوى لوحة الإدارة")).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("denies a signed-in user who does not have the admin role", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: customerSession }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const onUnauthorized = renderProtectedAdmin();

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledWith("not-admin"));
    expect(screen.queryByText("محتوى لوحة الإدارة")).toBeNull();
  });

  it("fails closed if the role check returns an error", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: adminSession }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("RPC unavailable") });
    const onUnauthorized = renderProtectedAdmin();

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledWith("not-admin"));
    expect(screen.queryByText("محتوى لوحة الإدارة")).toBeNull();
  });
});
