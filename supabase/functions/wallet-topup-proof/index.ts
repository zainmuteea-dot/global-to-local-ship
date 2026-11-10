// Serves a private wallet top-up proof only after a fresh server-side role check.
// Uses the caller's JWT for both the role check and Storage download so database and
// Storage RLS remain active. Never use the service-role key in this function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "يلزم تسجيل الدخول." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("wallet-topup-proof: missing Supabase server configuration");
    return json(500, { error: "إعداد عرض السند غير مكتمل على الخادم." });
  }

  // The request JWT is passed to all calls. This keeps the caller identity and RLS intact.
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) {
    return json(401, { error: "جلسة الدخول غير صالحة." });
  }

  // Enforce role authorization on the server every time a proof is requested.
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

  // This query is made as the caller, not with service_role; the staff SELECT policy applies.
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

  // Download as the same caller: private-bucket Storage RLS is enforced as a second gate.
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
      "Content-Type": imageType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="wallet-proof.${extension}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
