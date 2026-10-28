import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://alsouq-alshamel-kgr7rpu41-zain-muteea.vercel.app",
  "https://alsouq-alshamel-6a9edhh1c-zain-muteea.vercel.app",
  "https://alsouq-alshamel-hiev8qd1-zain-muteea.vercel.app",
  "https://alsouq-alshamel-qfs4764b3-zain-muteea.vercel.app",
  "https://alsouq-alshamel-hio0vg4qd1-zain-muteea.vercel.app",
  "https://alsouq-alshamel-1bhgdcrd5-zain-muteea.vercel.app",
]);

const STAGES: Record<
  string,
  { title: string; message: string; allowedStatuses: string[] }
> = {
  new: {
    title: "استلام الطلب والتدقيق",
    message: "تم استلام طلبك وبدأنا تدقيق التفاصيل.",
    allowedStatuses: ["new", "accepted", "جديد", "قيد المراجعة"],
  },
  payment_review: {
    title: "التدقيق المالي والدفع",
    message: "طلبك الآن في مرحلة التدقيق المالي وتأكيد الدفع.",
    allowedStatuses: [
      "payment_review",
      "reviewing",
      "pricing",
      "priced_waiting_pay",
      "تدقيق مالي",
      "قيد التسعير",
    ],
  },
  purchased: {
    title: "الشراء من المتجر الدولي",
    message: "تم شراء المنتجات من المتجر الدولي وبدأ تجهيز طلبك.",
    allowedStatuses: [
      "purchased",
      "processing",
      "تم الشراء",
      "قيد الشراء والتجهيز",
    ],
  },
  international_warehouse: {
    title: "وصول مستودع التجميع الدولي",
    message: "وصل طلبك إلى مستودع التجميع الدولي لفحصه وتجهيزه للشحن.",
    allowedStatuses: [
      "international_warehouse",
      "warehouse_china",
      "المستودع الدولي",
    ],
  },
  international_transit: {
    title: "الشحن الدولي",
    message: "غادرت شحنتك مستودع التجميع وهي في طريقها دولياً.",
    allowedStatuses: [
      "international_transit",
      "international_ship",
      "shipped",
      "شحن دولي",
    ],
  },
  customs_local: {
    title: "الجمارك والفرز المحلي",
    message: "وصلت شحنتك إلى مرحلة التخليص والفرز المحلي.",
    allowedStatuses: ["customs_local", "local_warehouse", "الفرز والتوصيل"],
  },
  out_for_delivery: {
    title: "جاري التوصيل",
    message: "خرجت شحنتك للتوصيل مع المندوب.",
    allowedStatuses: ["out_for_delivery"],
  },
  delivered: {
    title: "تم التسليم",
    message: "تم تسليم طلبك بنجاح. شكراً لاختيارك السوق الشامل.",
    allowedStatuses: ["delivered", "تم التسليم"],
  },
};

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...ALLOWED_ORIGINS, ...configuredOrigins]);
}

function isAllowedOrigin(origin: string, allowedOrigins: Set<string>): boolean {
  return allowedOrigins.has(origin) ||
    /^https:\/\/alsouq-alshamel-[a-z0-9-]+-zain-muteea\.vercel\.app$/i.test(origin) ||
    /^http:\/\/localhost(?::\d+)?$/i.test(origin);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(origin, getAllowedOrigins())) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function stageForStatus(status: string): string | null {
  const normalized = status.trim().toLowerCase();
  if (!normalized) return null;

  let matchedStage: string | null = null;
  for (const [stageCode, stage] of Object.entries(STAGES)) {
    const matches = stage.allowedStatuses.some(
      (allowedStatus) => allowedStatus.trim().toLowerCase() === normalized,
    );
    if (!matches) continue;
    // Ambiguous status aliases fail closed instead of choosing a stage implicitly.
    if (matchedStage && matchedStage !== stageCode) return null;
    matchedStage = stageCode;
  }
  return matchedStage;
}

function normalizePhone(input: string): string | null {
  let value = input.trim().replace(/[\s()-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+")) {
    const digits = value.replace(/\D/g, "").replace(/^0/, "");
    value = digits.startsWith("967") ? `+${digits}` : `+967${digits}`;
  }
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

function safeProviderError(
  parsed: any,
  secrets: Array<string | null | undefined>,
) {
  const rawCode = parsed?.code ?? parsed?.errorCode ?? parsed?.error?.code ??
    parsed?.data?.code;
  const rawMessage = parsed?.message ??
    (typeof parsed?.error === "string"
      ? parsed.error
      : parsed?.error?.message) ??
    parsed?.detail ?? parsed?.data?.message;
  let message = typeof rawMessage === "string"
    ? rawMessage.replace(/\s+/g, " ").trim()
    : "رفض TextBee الطلب دون تفاصيل إضافية.";
  for (const secret of secrets) {
    if (secret && secret.length >= 4) {
      message = message.split(secret).join("[محذوف]");
    }
  }
  message = message
    .replace(/Bearer\s+\S+/gi, "Bearer [محذوف]")
    .replace(/(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/g, "[رقم محذوف]")
    .replace(
      /\b(?:sk|key|tok|lov|api)[-_][A-Za-z0-9_-]{12,}\b/gi,
      "[قيمة محذوفة]",
    )
    .slice(0, 180);
  const code = typeof rawCode === "string" || typeof rawCode === "number"
    ? String(rawCode).replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 64) || null
    : null;
  return { code, message };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  const origin = req.headers.get("Origin");
  if (origin && !corsHeaders(req)["Access-Control-Allow-Origin"]) {
    return json(req, 403, {
      error:
        "هذا النطاق غير مسموح. أضف عنوان الواجهة الدقيق إلى ALLOWED_ORIGINS.",
    });
  }
  if (req.method !== "POST") {
    return json(req, 405, { error: "استخدم POST فقط." });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(req, 401, { error: "يلزم تسجيل الدخول." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("TEXTBEE_API_KEY");
  const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !apiKey || !deviceId) {
    console.error("send-shipment-stage-sms: server configuration missing");
    return json(req, 500, { error: "إعداد SMS غير مكتمل على الخادم." });
  }

  let body: { orderId?: unknown; stageCode?: unknown; retry?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "بيانات الطلب غير صالحة." });
  }
  const { orderId, stageCode, retry } = body;
  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(orderId)
  ) {
    return json(req, 400, { error: "معرّف الطلب غير صالح." });
  }
  if (typeof stageCode !== "string" || !STAGES[stageCode]) {
    return json(req, 400, { error: "مرحلة الشحنة غير صالحة." });
  }
  if (retry !== undefined && typeof retry !== "boolean") {
    return json(req, 400, { error: "قيمة إعادة المحاولة غير صالحة." });
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) {
    return json(req, 401, { error: "جلسة الدخول غير صالحة." });
  }
  const [
    { data: isAdmin, error: adminError },
    { data: isStaff, error: staffError },
  ] = await Promise.all([
    caller.rpc("has_role", { _user_id: authData.user.id, _role: "admin" }),
    caller.rpc("has_role", { _user_id: authData.user.id, _role: "staff" }),
  ]);
  if (adminError || staffError) {
    return json(req, 500, { error: "تعذر التحقق من صلاحية الموظف." });
  }
  if (isAdmin !== true && isStaff !== true) {
    return json(req, 403, {
      error: "إرسال إشعار الشحنة متاح للموظفين والمدير فقط.",
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await admin.from("orders")
    .select(
      "id,tracking_code,customer_name,phone,customer_phone,status,courier_name,courier_phone",
    )
    .eq("id", orderId).maybeSingle();
  if (orderError) {
    console.error(
      "send-shipment-stage-sms: order lookup failed",
      orderError.message,
    );
    return json(req, 500, { error: "تعذر التحقق من الشحنة." });
  }
  if (!order) return json(req, 404, { error: "الشحنة غير موجودة." });
  const currentStage = stageForStatus(String(order.status ?? ""));
  if (currentStage !== stageCode) {
    return json(req, 409, {
      error:
        currentStage === null
          ? "حالة الطلب غير معروفة أو ملتبسة؛ لم تُرسل رسالة."
          : "المرحلة المطلوبة لا تطابق حالة الطلب الحالية؛ لم تُرسل رسالة.",
    });
  }
  const recipient = normalizePhone(order.phone || order.customer_phone || "");
  if (!recipient) return json(req, 400, { error: "رقم هاتف العميل غير صالح." });

  const { data: prior, error: priorError } = await admin.from(
    "shipment_stage_sms",
  )
    .select("id,sms_status,sms_attempt_count,sms_provider_batch_id")
    .eq("order_id", orderId).eq("stage_code", stageCode).maybeSingle();
  if (priorError) {
    console.error(
      "send-shipment-stage-sms: audit lookup failed",
      priorError.message,
    );
    return json(req, 500, {
      error: "تعذر قراءة سجل SMS للمرحلة. لم تُرسل رسالة.",
    });
  }

  let attemptCount = 1;
  let claimId: string;
  if (!prior) {
    const { data: inserted, error: insertError } = await admin.from(
      "shipment_stage_sms",
    )
      .insert({
        order_id: orderId,
        stage_code: stageCode,
        sms_status: "sending",
        sms_attempt_count: 1,
      })
      .select("id").single();
    if (insertError || !inserted) {
      // A parallel invocation may have claimed the unique order/stage row; never send twice.
      if (insertError?.code !== "23505") {
        console.error(
          "send-shipment-stage-sms: claim insert failed",
          insertError?.message,
        );
      }
      return json(req, 409, {
        error:
          "هناك محاولة مسجلة لهذه المرحلة؛ تحقق من سجل SMS قبل أي إعادة إرسال.",
      });
    }
    claimId = inserted.id;
  } else {
    if (prior.sms_status === "accepted") {
      return json(req, 200, {
        status: "accepted",
        duplicate: true,
        message: "سبق قبول TextBee لرسالة هذه المرحلة؛ لم تُكرر.",
      });
    }
    if (prior.sms_status === "sending" || prior.sms_status === "unknown") {
      return json(req, 409, {
        status: prior.sms_status,
        message: "نتيجة المحاولة غير محسومة؛ تحقق من TextBee ولا تعِد الإرسال.",
      });
    }
    if (prior.sms_status !== "failed" || retry !== true) {
      return json(req, 409, {
        status: prior.sms_status,
        message: "إعادة المحاولة مسموحة فقط بعد فشل مؤكد وبطلب صريح.",
      });
    }
    attemptCount = (prior.sms_attempt_count ?? 0) + 1;
    const { data: claimed, error: claimError } = await admin.from(
      "shipment_stage_sms",
    )
      .update({
        sms_status: "sending",
        sms_attempt_count: attemptCount,
        sms_error: null,
      })
      .eq("id", prior.id).eq("sms_status", "failed").select("id").maybeSingle();
    if (claimError || !claimed) {
      return json(req, 409, {
        error: "بدأت محاولة أخرى أو تعذر حجز إعادة الإرسال؛ لم تُرسل رسالة.",
      });
    }
    claimId = claimed.id;
  }

  const messageParts = [
    `مرحباً ${
      order.customer_name || "عميلنا"
    }، تحديث طلبك ${order.tracking_code}.`,
    `${STAGES[stageCode].title}: ${STAGES[stageCode].message}`,
  ];
  if (stageCode === "out_for_delivery" && order.courier_name) {
    messageParts.push(
      `المندوب: ${order.courier_name}${
        order.courier_phone ? `، هاتفه ${order.courier_phone}` : ""
      }.`,
    );
  }
  const message = messageParts.join(" ");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const persist = async (patch: Record<string, unknown>) => {
    const { error } = await admin.from("shipment_stage_sms").update(patch).eq(
      "id",
      claimId,
    ).eq("sms_status", "sending");
    if (error) {
      console.error(
        "send-shipment-stage-sms: outcome persistence failed",
        error.message,
      );
    }
    return !error;
  };

  try {
    const response = await fetch(
      "https://api.textbee.dev/api/v1/gateway/send-sms",
      {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: [recipient], message, deviceId }),
        signal: controller.signal,
      },
    );
    const responseText = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(responseText);
    } catch { /* Raw provider body is never persisted or logged. */ }
    const result = parsed?.data ?? parsed;
    const batchId = typeof result?.smsBatchId === "string"
      ? result.smsBatchId
      : null;

    if (!response.ok) {
      // TextBee documents these statuses as rejected/not sent; other errors remain
      // unknown because a transient provider failure may happen after acceptance.
      const confirmedNotAccepted = [400, 401, 429].includes(response.status);
      const safeError = safeProviderError(parsed, [
        apiKey,
        deviceId,
        recipient,
      ]);
      const status = confirmedNotAccepted ? "failed" : "unknown";
      const detail = safeError.message;
      const saved = await persist({
        sms_status: status,
        sms_error: `TextBee HTTP ${response.status}: ${detail}`.slice(0, 240),
        sms_provider_response: {
          httpStatus: response.status,
          providerError: safeError,
        },
      });
      if (!saved) {
        return json(req, 502, {
          status: "unknown",
          message: "تعذر حفظ نتيجة TextBee؛ تحقق من سجل المزود قبل أي إجراء.",
        });
      }
      return json(req, 502, {
        status,
        message: confirmedNotAccepted
          ? `رفض TextBee الرسالة (HTTP ${response.status}): ${detail}`
          : "نتيجة TextBee غير مؤكدة؛ تحقق من سجل المزود ولا تُعد الإرسال الآن.",
      });
    }

    const successCount = typeof result?.successCount === "number"
      ? result.successCount
      : null;
    const failureCount = typeof result?.failureCount === "number"
      ? result.failureCount
      : null;
    if (
      result?.success === false ||
      (failureCount !== null && failureCount > 0 &&
        (successCount === null || successCount === 0))
    ) {
      const saved = await persist({
        sms_status: "failed",
        sms_error: "TextBee لم يقبل إدراج رسالة المرحلة.",
        sms_provider_response: { success: false, failureCount, successCount },
      });
      if (!saved) {
        return json(req, 502, {
          status: "unknown",
          message: "تعذر حفظ نتيجة TextBee؛ تحقق من سجل المزود.",
        });
      }
      return json(req, 502, {
        status: "failed",
        message:
          "TextBee لم يقبل رسالة المرحلة؛ راجع سبب الرفض قبل إعادة المحاولة.",
      });
    }
    const clearlyAccepted = batchId !== null || result?.success === true ||
      (successCount !== null && successCount > 0);
    if (!clearlyAccepted) {
      await persist({
        sms_status: "unknown",
        sms_error: "رد TextBee لا يحتوي تأكيد قبول واضحاً.",
        sms_provider_response: { outcome: "unrecognized_response" },
      });
      return json(req, 502, {
        status: "unknown",
        message: "رد TextBee غير واضح؛ تحقق من سجل المزود قبل إعادة الإرسال.",
      });
    }

    const saved = await persist({
      sms_status: "accepted",
      sms_accepted_at: new Date().toISOString(),
      sms_provider_batch_id: batchId,
      sms_error: null,
      sms_provider_response: {
        smsBatchId: batchId,
        success: typeof result?.success === "boolean" ? result.success : null,
        recipientCount: typeof result?.recipientCount === "number"
          ? result.recipientCount
          : null,
        successCount,
        failureCount,
      },
    });
    if (!saved) {
      return json(req, 502, {
        status: "unknown",
        message:
          "قبل TextBee الرسالة لكن تعذر حفظ النتيجة. لا تعِد الإرسال قبل المراجعة.",
      });
    }
    return json(req, 200, {
      status: "accepted",
      message: "قبل TextBee طلب SMS؛ هذا لا يؤكد وصول الرسالة للهاتف.",
    });
  } catch (error) {
    const saved = await persist({
      sms_status: "unknown",
      sms_error: "نتيجة اتصال غير مؤكدة؛ تحقق من TextBee قبل أي إجراء.",
      sms_provider_response: { outcome: "network_unknown" },
    });
    console.error("send-shipment-stage-sms: provider request outcome unknown", {
      timedOut: error instanceof DOMException && error.name === "AbortError",
      persisted: saved,
    });
    return json(req, 502, {
      status: "unknown",
      message: "نتيجة SMS غير مؤكدة؛ تحقق من TextBee ولا تعِد الإرسال الآن.",
    });
  } finally {
    clearTimeout(timeout);
  }
});
