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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");
  const textbeeDeviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

  const caller = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: authorization! } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData } = await caller.auth.getUser();
  const { data: isAdmin } = await caller.rpc("has_role", { _user_id: authData.user.id, _role: "admin" });
  if (isAdmin !== true) return json(403, { error: "للمدير فقط." });

  const { phone, message } = await req.json();

  const payload: any = {
    recipients: [phone],
    message: message.trim(),
    simSlot: 0,
  };
  if (textbeeDeviceId) payload.deviceId = textbeeDeviceId;

  const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
    method: "POST",
    headers: { "x-api-key": textbeeApiKey!, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.text();
  console.log(result);

  if (!response.ok) return json(502, { error: result });

  return json(200, { accepted: true });
});
