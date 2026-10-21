import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://alsouq-alshamel-5mc5q3dho-zain-muteea.vercel.app",
  "https://qfs4764b3.lovable.app",
  "https://qfs4764h3.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsHeaders = (origin: string) => {
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.some(d => origin.endsWith(".vercel.app"));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await req.json();
    const { orderId, recipient, message } = body;

    if (!orderId || !recipient || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY")!;
    const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID")!;

    if (!textbeeApiKey || !deviceId) {
      throw new Error("Missing TEXTBEE secrets");
    }

    // تطبيع رقم اليمن إلى 967 بدون +
    let normalizedRecipient = recipient.replace(/[^0-9]/g, "");
    if (normalizedRecipient.startsWith("0")) {
      normalizedRecipient = "967" + normalizedRecipient.slice(1);
    }
    if (!normalizedRecipient.startsWith("967")) {
      // إذا كان 7... أضف 967
      if (normalizedRecipient.startsWith("7")) {
        normalizedRecipient = "967" + normalizedRecipient;
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // الإرسال للمسار الصحيح الجديد
    const textbeeUrl = `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`;

    const tbRes = await fetch(textbeeUrl, {
      method: "POST",
      headers: {
        "x-api-key": textbeeApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [normalizedRecipient],
        message: message,
      }),
    });

    const tbText = await tbRes.text();
    let tbJson: any = null;
    try {
      tbJson = JSON.parse(tbText);
    } catch {
      tbJson = { raw: tbText };
    }

    if (!tbRes.ok) {
      // حفظ الخطأ كاملاً لتظهر الرسالة الحقيقية
      await supabase.from("orders").update({
        sms_status: "failed",
        sms_attempt_count: 1,
        sms_last_attempt_at: new Date().toISOString(),
        sms_error: `TextBee HTTP ${tbRes.status}: ${tbText.slice(0, 500)}`,
        sms_provider_response: { httpStatus: tbRes.status, body: tbText.slice(0, 2000), json: tbJson },
      }).eq("id", orderId);

      return new Response(JSON.stringify({ error: "TextBee rejected", status: tbRes.status, body: tbJson }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // نجاح
    await supabase.from("orders").update({
      sms_status: "accepted",
      sms_provider_batch_id: tbJson?.data?.batchId || tbJson?.batchId || null,
      sms_accepted_at: new Date().toISOString(),
      sms_provider_response: tbJson,
      sms_error: null,
      sms_attempt_count: 1,
      sms_last_attempt_at: new Date().toISOString(),
    }).eq("id", orderId);

    return new Response(JSON.stringify({ ok: true, provider: tbJson }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("send-sms error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
