import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
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
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "جلسة الدخول غير صالحة." });
  let body: { orderId?: unknown; retry?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "بيانات الطلب غير صالحة." }); }
  const { orderId, retry } = body;
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return json(400, { error: "معرّف الطلب غير صالح." });
  }
  if (retry !== undefined && typeof retry !== "boolean") return json(400, { error: "قيمة إعادة المحاولة غير صالحة." });
  const isRetry = retry === true;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error: orderError } = await admin.from("orders")
    .select("id,user_id,phone,customer_name,product_name,tracking_code,sms_status,sms_attempt_count")
    .eq("id", orderId).maybeSingle();
  if (orderError) { console.error("send-sms: order lookup failed", orderError.message); return json(500, { error: "تعذر التحقق من الطلب." }); }
  if (!order) return json(404, { error: "الطلب غير موجود." });
  if (!order.user_id || order.user_id !== authData.user.id) return json(403, { error: "لا تملك صلاحية إرسال رسالة لهذا الطلب." });
  if (!order.tracking_code) return json(409, { error: "لا يوجد رقم تتبع للرسالة." });
  if (isRetry && order.sms_status !== "failed") return json(409, { error: "إعادة المحاولة متاحة فقط بعد فشل مؤكد. لم يُرسل شيء." });
  if (!isRetry && order.sms_status !== "pending") {
    if (order.sms_status === "accepted" || order.sms_status === "delivered") return json(200, { accepted: true, status: order.sms_status, message: "سبق قبول الرسالة لهذا الطلب؛ لم يُكرر الإرسال." });
    return json(409, { error: "حالة SMS ليست pending؛ لم يُكرر الإرسال." });
  }
  const recipient = normalizePhone(order.phone ?? "");
  if (!recipient) return json(400, { error: "رقم الهاتف المسجل ليس بصيغة دولية صحيحة." });

  // Atomic compare-and-set: exactly one caller can claim pending or a confirmed failed retry.
  const expectedStatus = isRetry ? "failed" : "pending";
  const { data: claimed, error: claimError } = await admin.from("orders")
    .update({ sms_status: "sending", sms_last_attempt_at: new Date().toISOString(), sms_attempt_count: (order.sms_attempt_count ?? 0) + 1, sms_error: null })
    .eq("id", order.id).eq("user_id", authData.user.id).eq("sms_status", expectedStatus)
    .select("id").maybeSingle();
  if (claimError) { console.error("send-sms: claim failed", claimError.message); return json(500, { error: "تعذر حجز محاولة SMS." }); }
  if (!claimed) return json(409, { error: "بدأت محاولة أخرى بالفعل؛ لم يُكرر الإرسال." });

  const message = `السوق الشامل - استلمنا طلبك رقم ${order.tracking_code} بنجاح. سنتواصل معك لتأكيد التفاصيل.`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const persist = async (patch: Record<string, unknown>) => {
    const { error } = await admin.from("orders").update(patch).eq("id", order.id).eq("sms_status", "sending");
    if (error) console.error("send-sms: outcome persistence failed", error.message);
    return !error;
  };
  try {
    const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST", headers: { "x-api-key": textbeeApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: [recipient], message, ...(deviceId ? { deviceId } : {}) }), signal: controller.signal,
    });
    const responseText = await response.text();
    let parsed: any = null;
    try { parsed = JSON.parse(responseText); } catch { /* avoid saving raw provider bodies */ }
    if (!response.ok) {
      const definiteRejection = response.status >= 400 && response.status < 500;
      const finalState = definiteRejection ? "failed" : "unknown";
      const saved = await persist({ sms_status: finalState, sms_error: `TextBee HTTP ${response.status}`, sms_provider_response: { httpStatus: response.status } });
      if (!saved) return json(502, { error: "تعذر حفظ نتيجة TextBee؛ افحص سجل الطلب قبل أي إعادة إرسال." });
      if (!definiteRejection) return json(502, { status: "unknown", error: "خطأ خادم من TextBee والنتيجة غير مؤكدة. لا تعِد الإرسال قبل التحقق." });
      return json(502, { status: "failed", error: "رفض TextBee الطلب (4xx). يمكن إعادة المحاولة بعد مراجعة الإعداد." });
    }
    const result = parsed?.data ?? parsed;
    const batchId = typeof result?.smsBatchId === "string" ? result.smsBatchId : null;
    const safeProviderResult = {
      success: typeof result?.success === "boolean" ? result.success : null,
      smsBatchId: batchId,
      recipientCount: typeof result?.recipientCount === "number" ? result.recipientCount : null,
      successCount: typeof result?.successCount === "number" ? result.successCount : null,
      failureCount: typeof result?.failureCount === "number" ? result.failureCount : null,
      warning: result?.warning && typeof result.warning === "object"
        ? { code: result.warning.code ?? null, message: result.warning.message ?? null }
        : null,
    };
    if (result?.success === false || (typeof result?.failureCount === "number" && result.failureCount > 0 && !(result?.successCount > 0))) {
      const savedFailure = await persist({ sms_status: "failed", sms_error: "TextBee لم يقبل إدراج الرسالة في الإرسال.", sms_provider_response: { success: false, failureCount: result?.failureCount ?? null } });
      if (!savedFailure) return json(502, { error: "تعذر حفظ فشل الإرسال؛ افحص الحالة قبل أي محاولة جديدة." });
      return json(502, { status: "failed", error: "TextBee لم يقبل الرسالة. يمكن إعادة المحاولة بعد مراجعة الجهاز." });
    }
    if (result?.success !== true && !batchId && !(typeof result?.successCount === "number" && result.successCount > 0)) {
      const savedUnknown = await persist({ sms_status: "unknown", sms_error: "رد TextBee لا يحتوي على تأكيد قبول يمكن تفسيره.", sms_provider_response: result ?? null });
      if (!savedUnknown) console.error("send-sms: unable to persist unrecognized provider outcome");
      return json(502, { status: "unknown", error: "رد TextBee غير واضح؛ تحقق من TextBee قبل أي إعادة إرسال." });
    }
    // HTTP success means accepted/queued, not handset delivery.
    const saved = await persist({ sms_status: "accepted", sms_accepted_at: new Date().toISOString(), sms_provider_batch_id: batchId, sms_error: null, sms_provider_response: safeProviderResult });
    if (!saved) return json(502, { error: "قبل TextBee الرسالة لكن تعذر حفظ النتيجة؛ لا تعِد الإرسال وتحقق من سجل TextBee." });
    return json(200, { accepted: true, status: "accepted", batchId, message: "قبل TextBee طلب الرسالة؛ هذا لا يؤكد وصولها للهاتف." });
  } catch (error) {
    // Network/timeout outcome is ambiguous; never mark retryable, since provider may have accepted it.
    const saved = await persist({ sms_status: "unknown", sms_error: "نتيجة اتصال غير مؤكدة؛ تحقق من TextBee قبل أي إجراء.", sms_provider_response: { outcome: "network_unknown" } });
    if (!saved) console.error("send-sms: ambiguous result could not be persisted");
    console.error("send-sms: provider request outcome unknown", { timedOut: error instanceof DOMException && error.name === "AbortError" });
    return json(502, { status: "unknown", error: "نتيجة SMS غير مؤكدة. لا تعِد الإرسال قبل التحقق من TextBee." });
  } finally { clearTimeout(timeout); }
});
