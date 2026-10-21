const ALLOWED_ORIGINS = [
  "https://qfs4764b3.lovable.app",
  "https://qfs4764h3.lovable.app",
  "http://localhost:5173",
];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { orderId, recipient, message, retry } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY")!;
    const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID")!;

    // Normalize Yemen number to E.164 without +
    let normalizedRecipient = recipient.replace(/[^0-9]/g, "");
    if (normalizedRecipient.startsWith("0")) {
      normalizedRecipient = "967" + normalizedRecipient.slice(1);
    }
    if (!normalizedRecipient.startsWith("967")) {
      normalizedRecipient = "967" + normalizedRecipient;
    }

    const response = await fetch(
      `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
      {
        method: "POST",
        headers: {
          "x-api-key": textbeeApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: [normalizedRecipient],
          message,
        }),
      }
    );

    const resultText = await response.text();
    let resultJson = null;
    try { resultJson = JSON.parse(resultText); } catch {}

    if (!response.ok) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from("orders").update({
        sms_status: "failed",
        sms_attempt_count: 1,
        sms_last_attempt_at: new Date().toISOString(),
        sms_error: `TextBee HTTP ${response.status}: ${resultText.slice(0,300)}`,
        sms_provider_response: { httpStatus: response.status, body: resultText.slice(0,1000) },
      }).eq("id", orderId);

      return new Response(JSON.stringify({ error: resultText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // success
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);
    await supabase.from("orders").update({
      sms_status: "accepted",
      sms_provider_batch_id: resultJson?.data?.batchId || null,
      sms_accepted_at: new Date().toISOString(),
      sms_provider_response: resultJson,
      sms_error: null,
    }).eq("id", orderId);

    return new Response(JSON.stringify({ ok: true, data: resultJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], "Content-Type": "application/json" },
    });
  }
});
