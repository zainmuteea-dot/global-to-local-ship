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

function normalizePhone(value: string): string | null {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (!phone.startsWith("+")) phone = `+967${phone.replace(/^0/, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "يلزم تسجيل الدخول." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");
  const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !textbeeApiKey) {
    console.error("send-sms: required server configuration is missing");
    return json(500, { error: "إعداد SMS غير مكتمل على الخادم." });
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "جلسة الدخول غير صالحة." });

  let orderId: unknown;
  try {
    ({ orderId } = await req.json());
  } catch {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }
  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
  ) return json(400, { error: "معرّف الطلب غير صالح." });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,phone,customer_name,product_name,tracking_code,created_at,sms_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    console.error("send-sms: order lookup failed", orderError.message);
    return json(500, { error: "تعذر التحقق من الطلب." });
  }
  if (!order) return json(404, { error: "الطلب غير موجود." });
  if (!order.user_id || order.user_id !== authData.user.id) {
    return json(403, { error: "لا تملك صلاحية إرسال رسالة لهذا الطلب." });
  }

  const createdAt = Date.parse(order.created_at);
  const ageMs = Date.now() - createdAt;
  if (!Number.isFinite(createdAt) || ageMs < -120_000 || ageMs > 15 * 60_000) {
    return json(409, { error: "لا يمكن إرسال تأكيد SMS لطلب قديم." });
  }
  if (order.sms_status !== "pending") {
    return json(409, { error: "سبق بدء محاولة SMS لهذا الطلب؛ لن نكرر الإرسال تلقائيًا." });
  }

  const recipient = normalizePhone(order.phone ?? "");
  if (!recipient) return json(400, { error: "رقم الهاتف المسجل ليس بصيغة دولية صحيحة." });
  if (!order.tracking_code) return json(409, { error: "لا يوجد رقم تتبع لإضافته إلى رسالة التأكيد." });

  // قفل ذري: طلب واحد فقط يستطيع الانتقال من pending إلى sending.
  const { data: claimed, error: claimError } = await admin
    .from("orders")
    .update({ sms_status: "sending", sms_attempted_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("sms_status", "pending")
    .select("id")
    .maybeSingle();
  if (claimError) {
    console.error("send-sms: claim failed", claimError.message);
    return json(500, { error: "تعذر حجز محاولة SMS." });
  }
  if (!claimed) return json(409, { error: "بدأت محاولة SMS لهذا الطلب بالفعل؛ لن نكرر الإرسال." });

  const message = `السوق الشامل - استلمنا طلبك رقم ${order.tracking_code} بنجاح. سنتواصل معك لتأكيد التفاصيل.`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
      headers: { "x-api-key": textbeeApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: [recipient],
        message,
        ...(deviceId ? { deviceId } : {}),
      }),
      signal: controller.signal,
    });

    // لا نمرر رد TextBee أو بياناته الداخلية للمتصفح.
    await response.text();
    const finalStatus = response.ok ? "accepted" : "failed";
    const { error: updateError } = await admin
      .from("orders")
      .update({ sms_status: finalStatus })
      .eq("id", order.id)
      .eq("sms_status", "sending");
    if (updateError) {
      console.error("send-sms: could not save provider outcome", updateError.message);
      return json(502, { error: "أُرسلت المحاولة إلى TextBee لكن تعذر حفظ نتيجتها؛ لا تعِد الإرسال تلقائيًا." });
    }

    if (!response.ok) {
      console.error("send-sms: TextBee rejected request", { status: response.status });
      return json(502, { error: "رفض TextBee طلب الإرسال. راجع إعداد الجهاز ومفتاح الخدمة." });
    }
    return json(200, { accepted: true, message: "قبل TextBee طلب الرسالة للإرسال." });
  } catch (error) {
    // قد يكون الطلب وصل إلى TextBee رغم انقطاع الرد؛ لا نعيد الإرسال تلقائيًا.
    const { error: updateError } = await admin
      .from("orders")
      .update({ sms_status: "unknown" })
      .eq("id", order.id)
      .eq("sms_status", "sending");
    if (updateError) console.error("send-sms: could not save ambiguous outcome", updateError.message);
    console.error("send-sms: provider request failed", {
      timedOut: error instanceof DOMException && error.name === "AbortError",
    });
    return json(502, { error: "تعذر تأكيد نتيجة الإرسال؛ تحقّق من TextBee قبل أي إعادة محاولة." });
  } finally {
    clearTimeout(timeout);
  }
});
