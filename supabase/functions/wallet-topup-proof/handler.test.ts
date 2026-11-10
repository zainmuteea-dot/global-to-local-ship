// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createWalletTopupProofHandler, type WalletProofClient } from "./handler";

const REQUEST_ID = "7ab69d9b-03d4-44f0-9d3c-7fd630e0e1c1";
const VALID_JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], { type: "image/jpeg" });

function createDependencies({
  authorization = "Bearer valid-jwt",
  user = { id: "staff-user" },
  admin = false,
  staff = true,
}: {
  authorization?: string | null;
  user?: { id: string } | null;
  admin?: boolean;
  staff?: boolean;
} = {}) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
  const rpc = vi.fn(async (_name: string, args: Record<string, string>) => ({
    data: args._role === "admin" ? admin : staff,
    error: null,
  }));
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: REQUEST_ID,
      user_id: "customer-user",
      proof_path: "customer-user/receipt.jpg",
      status: "pending_review",
    },
    error: null,
  });
  const download = vi.fn().mockResolvedValue({ data: VALID_JPEG, error: null });
  const createSignedUrl = vi.fn();
  const caller = {
    auth: { getUser },
    rpc,
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
    storage: {
      from: vi.fn(() => ({ download, createSignedUrl })),
    },
  };
  const createClient = vi.fn(() => caller as unknown as WalletProofClient);
  const getEnv = vi.fn((name: string) =>
    name === "SUPABASE_URL" ? "https://example.supabase.co" : "public-anon-key",
  );
  const handler = createWalletTopupProofHandler({ createClient, getEnv });
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authorization !== null) headers.set("Authorization", authorization);
  const makeRequest = () => new Request("https://example.test/wallet-topup-proof", {
    method: "POST",
    headers,
    body: JSON.stringify({ request_id: REQUEST_ID }),
  });

  return { handler, makeRequest, createClient, getUser, rpc, maybeSingle, download, createSignedUrl };
}

describe("wallet-topup-proof server authorization", () => {
  it("يرفض الطلب عند غياب JWT قبل إنشاء عميل أو الوصول إلى التخزين", async () => {
    const deps = createDependencies({ authorization: null });

    const response = await deps.handler(deps.makeRequest());

    expect(response.status).toBe(401);
    expect(deps.createClient).not.toHaveBeenCalled();
    expect(deps.getUser).not.toHaveBeenCalled();
    expect(deps.download).not.toHaveBeenCalled();
    expect(deps.createSignedUrl).not.toHaveBeenCalled();
  });

  it("يرفض العرض فور سحب دور staff ويعيد فحص الدور عند كل طلب", async () => {
    const deps = createDependencies({ staff: false, admin: false });

    const response = await deps.handler(deps.makeRequest());

    expect(response.status).toBe(403);
    expect(deps.rpc).toHaveBeenCalledTimes(2);
    expect(deps.maybeSingle).not.toHaveBeenCalled();
    expect(deps.download).not.toHaveBeenCalled();
    expect(deps.createSignedUrl).not.toHaveBeenCalled();
  });

  it("يعرض الصورة بعد التحقق دون إنشاء رابط تخزين موقّع", async () => {
    const deps = createDependencies({ staff: true });

    const response = await deps.handler(deps.makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(response.headers.get("X-Image-Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(deps.download).toHaveBeenCalledWith("customer-user/receipt.jpg");
    expect(deps.createSignedUrl).not.toHaveBeenCalled();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(await VALID_JPEG.arrayBuffer()));
  });
});
