// Testable request handler for the wallet proof endpoint.
// Uses the caller's JWT for role, database and Storage access; never uses service_role.
export type WalletTopupRequest = {
  id: string;
  user_id: string;
  proof_path: string;
  status: string;
};

type SupabaseResult<T> = { data: T; error: unknown };

export type WalletProofClient = {
  auth: {
    getUser: () => Promise<SupabaseResult<{ user: { id: string } | null }>>;
  };
  rpc: (name: string, args: Record<string, string>) => Promise<SupabaseResult<unknown>>;
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<SupabaseResult<WalletTopupRequest | null>>;
      };
    };
  };
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<SupabaseResult<Blob | null>>;
    };
  };
};

type CreateClient = (
  url: string,
  anonKey: string,
  options: {
    global: { headers: { Authorization: string } };
    auth: { persistSession: false; autoRefreshToken: false };
  },
) => WalletProofClient;

type HandlerDependencies = {
  createClient: CreateClient;
  getEnv: (name: string) => string | undefined;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JsonBody = Record<string, unknown>;

function json(status: number, body: JsonBody) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function detectImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 &&
    bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d &&
    bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function createWalletTopupProofHandler({ createClient, getEnv }: HandlerDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(401, { error: "يلزم تسجيل الدخول." });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const anonKey = getEnv("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      console.error("wallet-topup-proof: missing Supabase server configuration");
      return json(500, { error: "إعداد عرض السند غير مكتمل على الخادم." });
    }

    // The request JWT is passed to all calls. This keeps caller identity and RLS intact.
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) {
      return json(401, { error: "جلسة الدخول غير صالحة." });
    }

    // Recheck the current role on every proof request, so revoked access is rejected immediately.
    const [adminRole, staffRole] = await Promise.all([
      caller.rpc("has_role", { _user_id: authData.user.id, _role: "admin" }),
      caller.rpc("has_role", { _user_id: authData.user.id, _role: "staff" }),
    ]);
    if (adminRole.error || staffRole.error) {
      console.error("wallet-topup-proof: role check failed");
      return json(500, { error: "تعذر التحقق من صلاحية الموظف." });
    }
    if (adminRole.data !== true && staffRole.data !== true) {
      return json(403, { error: "عرض السند متاح للموظفين المخوّلين فقط." });
    }

    let body: JsonBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "بيانات الطلب غير صالحة." });
    }
    const requestId = body.request_id;
    if (typeof requestId !== "string" || !REQUEST_ID_RE.test(requestId)) {
      return json(400, { error: "معرّف طلب الشحن غير صالح." });
    }

    // Query as caller, not with service_role; the staff SELECT policy applies.
    const { data: request, error: requestError } = await caller
      .from("wallet_topup_requests")
      .select("id,user_id,proof_path,status")
      .eq("id", requestId)
      .maybeSingle();
    if (requestError) {
      console.error("wallet-topup-proof: request lookup failed");
      return json(500, { error: "تعذر العثور على طلب الشحن." });
    }
    if (!request) return json(404, { error: "طلب الشحن غير موجود أو غير متاح." });
    if (request.status !== "pending_review") {
      return json(409, { error: "السند متاح للطلبات قيد المراجعة فقط." });
    }

    const proofPath = request.proof_path;
    const pathParts = typeof proofPath === "string" ? proofPath.split("/") : [];
    if (
      pathParts.length !== 2 ||
      pathParts[0] !== request.user_id ||
      !pathParts[1] ||
      pathParts.some((part) => part === "." || part === "..")
    ) {
      console.error("wallet-topup-proof: invalid proof path for request");
      return json(404, { error: "ملف السند غير موجود أو غير متاح." });
    }

    // Download as the same caller; private-bucket Storage RLS remains a second gate.
    const { data: file, error: storageError } = await caller.storage
      .from("wallet-transfer-proofs")
      .download(proofPath);
    if (storageError || !file) {
      console.error("wallet-topup-proof: private storage download denied or failed");
      return json(404, { error: "ملف السند غير موجود أو لا تملك صلاحية عرضه." });
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return json(413, { error: "حجم ملف السند غير مسموح." });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const imageType = detectImageType(bytes);
    const declaredType = (file.type || "").split(";")[0].trim().toLowerCase();
    if (
      !imageType ||
      (declaredType && declaredType !== "application/octet-stream" && declaredType !== imageType)
    ) {
      return json(415, { error: "نوع ملف السند غير مسموح." });
    }

    const extension = imageType === "image/jpeg" ? "jpg" : imageType === "image/png" ? "png" : "webp";
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        // Supabase JS parses application/octet-stream as Blob; expose verified image MIME separately.
        "Content-Type": "application/octet-stream",
        "X-Image-Content-Type": imageType,
        "Access-Control-Expose-Headers": "X-Image-Content-Type, Content-Disposition, Content-Length",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="wallet-proof.${extension}"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  };
}
