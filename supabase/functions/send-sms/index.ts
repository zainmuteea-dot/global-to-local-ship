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
    return json(401, { error: "يلزم تسجيل الدخول قبل إرسال الرسالة." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");
  const textbeeDeviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

  if (!supabaseUrl || !supabaseAnonKey || !textbeeApiKey) {
    console.error("send-sms: required server environment is not configured");
    return json(500, { error: "إعداد إرسال الرسائل غير مكتمل على الخادم." });
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
    console.error("send-sms: admin role check failed", roleError.message);
    return json(500, { error: "تعذر التحقق من صلاحية إرسال الرسائل." });
  }
  if (isAdmin !== true) return json(403, { error: "إرسال الرسائل متاح للمدير فقط." });

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "بيانات الطلب ليست JSON صالحًا." });
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }

  const { phone, message } = input as Record<string, unknown>;
  if (typeof phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return json(400, { error: "اكتب رقم الهاتف بصيغة دولية مثل +9677XXXXXXXX." });
  }
  if (typeof message !== "string" || !message.trim() || message.length > 1000) {
    return json(400, { error: "اكتب رسالة من 1 إلى 1000 حرف." });
  }

  const payload: Record<string, unknown> = {
    recipients: [phone],
    message: message.trim(),
    simSlot: 0,
  };
  if (textbeeDeviceId) payload.deviceId = textbeeDeviceId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
      headers: {
        "x-api-key": textbeeApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let providerResult: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(responseText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        providerResult = parsed as Record<string, unknown>;
      }
    } catch {}

    if (!response.ok) {
      console.error("send-sms: TextBee rejected the request", { status: response.status });
      return json(502, { error: "رفض مزود الرسائل الطلب. تحقق من إعداد TextBee والجهاز." });
    }

    const nestedData = providerResult.data;
    const data = nestedData && typeof nestedData === "object" ? (nestedData as Record<string, unknown>) : undefined;
    const smsBatchId = providerResult.smsBatchId ?? data?.smsBatchId;

    return json(200, {
      accepted: true,
      ...(typeof smsBatchId === "string" ? { smsBatchId } : {}),
      message: "قبل TextBee الطلب وأدخله في قائمة الإرسال؛ هذا لا يؤكد وصول الرسالة إلى الهاتف.",
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("send-sms: TextBee request failed", { timedOut });
    return json(502, {
      error: timedOut ? "انتهت مهلة الاتصال بمزود الرسائل. تحقق من سجل الرسائل قبل إعادة المحاولة." : "تعذر الاتصال بمزود الرسائل.",
    });
  } finally {
    clearTimeout(timeout);
  }
});
