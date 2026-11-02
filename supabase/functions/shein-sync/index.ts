import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      code: "METHOD_NOT_ALLOWED",
      error: "استخدم POST فقط.",
    });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(401, {
      code: "UNAUTHENTICATED",
      error: "يلزم تسجيل الدخول.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("shein-sync: required Supabase environment is missing");
    return jsonResponse(500, {
      code: "SERVER_CONFIGURATION_ERROR",
      error: "إعداد الدالة غير مكتمل على الخادم.",
    });
  }

  const caller = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse(401, {
      code: "INVALID_SESSION",
      error: "جلسة الدخول غير صالحة.",
    });
  }

  const { data: isAdmin, error: roleError } = await caller.rpc("has_role", {
    _user_id: authData.user.id,
    _role: "admin",
  });

  if (roleError) {
    console.error("shein-sync: admin role check failed", roleError.message);
    return jsonResponse(500, {
      code: "ROLE_CHECK_FAILED",
      error: "تعذر التحقق من صلاحية المدير.",
    });
  }

  if (isAdmin !== true) {
    return jsonResponse(403, {
      code: "ADMIN_REQUIRED",
      error: "هذه العملية متاحة للمدير فقط.",
    });
  }

  // Intentionally fail closed until SHEIN approves the API application and
  // supplies its official endpoint, authentication/signature rules, and schema.
  // No external request or product/inventory/order change is made here.
  return jsonResponse(503, {
    code: "SHEIN_API_NOT_READY",
    error: "لم يتم تفعيل المزامنة؛ يلزم اعتماد واجهة SHEIN الرسمية وتجهيز إعداداتها أولًا.",
    syncEnabled: false,
  });
});
