import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "يلزم تسجيل الدخول." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");
  const deviceIdConfigured = Boolean(Deno.env.get("TEXTBEE_DEVICE_ID"));

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("check-textbee: required Supabase function environment is missing");
    return json(500, { error: "إعداد التحقق غير مكتمل على الخادم." });
  }

  const caller = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) {
    return json(401, { error: "جلسة الدخول غير صالحة." });
  }

  const { data: isAdmin, error: roleError } = await caller.rpc("has_role", {
    _user_id: authData.user.id,
    _role: "admin",
  });

  if (roleError) {
    console.error("check-textbee: admin role check failed", roleError.message);
    return json(500, { error: "تعذر التحقق من صلاحية المدير." });
  }

  if (isAdmin !== true) return json(403, { error: "الفحص متاح للمدير فقط." });

  if (!textbeeApiKey) {
    return json(200, {
      valid: false,
      deviceIdConfigured,
      message: "سر TEXTBEE_API_KEY غير موجود في أسرار الخادم.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.textbee.dev/api/v1/gateway/stats", {
      method: "GET",
      headers: { "x-api-key": textbeeApiKey },
      signal: controller.signal,
    });

    // Read and discard the body: account totals and provider details never reach the client or logs.
    await response.arrayBuffer();

    if (response.status === 401) {
      return json(200, {
        valid: false,
        deviceIdConfigured,
        message: "لم يقبل TextBee المفتاح؛ تحقق من السر في Supabase وأن المفتاح صالح.",
      });
    }

    if (!response.ok) {
      console.error("check-textbee: provider returned non-success status", {
        status: response.status,
      });
      return json(502, {
        error: "تعذر إكمال الفحص مع TextBee. لم يتم إرسال رسالة.",
      });
    }

    return json(200, {
      valid: true,
      deviceIdConfigured,
      message: deviceIdConfigured
        ? "قبل TextBee المفتاح. وجود معرّف جهاز مُعدّ، لكن لم يتم فحص الجهاز نفسه أو إرسال رسالة."
        : "قبل TextBee المفتاح، لكن TEXTBEE_DEVICE_ID غير موجود ضمن أسرار الخادم. لم يتم إرسال رسالة.",
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("check-textbee: provider request failed", { timedOut });
    return json(502, {
      error: timedOut
        ? "انتهت مهلة الاتصال بـTextBee. لم يتم إرسال رسالة."
        : "تعذر الاتصال بـTextBee. لم يتم إرسال رسالة.",
    });
  } finally {
    clearTimeout(timeout);
  }
});
