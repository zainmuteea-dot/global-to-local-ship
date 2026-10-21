import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://alsouq-alshamel-kgr7rpu41-zain-muteea.vercel.app",
  "https://alsouq-alshamel-6a9edhh1c-zain-muteea.vercel.app",
  "https://alsouq-alshamel-hiev8qd1-zain-muteea.vercel.app",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(
  req: Request,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizePhone(value: string): string | null {
  let phone = value.trim().replace(/[\s()-]/g, "");

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  if (!phone.startsWith("+")) {
    const digits = phone.replace(/\D/g, "").replace(/^0/, "");
    phone = digits.startsWith("967") ? `+${digits}` : `+967${digits}`;
  }

  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

/** Extract only a short, allow-listed error summary; never persist the raw provider body. */
function safeProviderError(
  parsed: any,
  secrets: Array<string | null | undefined>,
): { code: string | null; message: string } {
  const errorValue = parsed?.error;
  const rawCode = parsed?.code ?? parsed?.errorCode ?? errorValue?.code ??
    parsed?.data?.code;
  const rawMessage = parsed?.message ??
    (typeof errorValue === "string" ? errorValue : errorValue?.message) ??
    parsed?.detail ?? parsed?.data?.message ?? parsed?.data?.error;

  let message = typeof rawMessage === "string"
    ? rawMessage.replace(/\s+/g, " ").trim()
    : "لم يرسل TextBee تفاصيل إضافية للرفض.";

  for (const secret of secrets) {
    if (secret && secret.length >= 4) {
      message = message.split(secret).join("[محذوف]");
    }
  }

  // Redact phone numbers, bearer credentials and token-like values in case a
  // provider error unexpectedly echoes request data.
  message = message
    .replace(/Bearer\s+\S+/gi, "Bearer [محذوف]")
    .replace(/(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/g, "[رقم محذوف]")
    .replace(/\b(?:sk|key|tok|lov|api)[-_][A-Za-z0-9_-]{12,}\b/gi, "[قيمة محذوفة]")
    .slice(0, 240);

  const code = typeof rawCode === "string" || typeof rawCode === "number"
    ? String(rawCode).replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 64) || null
    : null;

  return { code, message };
}

Deno.serve(async (req: Request) => {
  try {
    const origin = req.headers.get("Origin");

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json(req, 403, { error: "هذا النطاق غير مسموح." });
    }

    // عالج طلب المتصفح المسبق قبل قراءة الجسم أو طلب جلسة المستخدم.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(req),
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
    const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");
    const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !textbeeApiKey ||
      !deviceId
    ) {
      console.error("send-sms: required server configuration is missing");
      return json(req, 500, { error: "إعداد SMS غير مكتمل على الخادم." });
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await caller.auth.getUser();

    if (authError || !authData.user) {
      return json(req, 401, { error: "جلسة الدخول غير صالحة." });
    }

    let body: { orderId?: unknown; retry?: unknown };

    try {
      body = await req.json();
    } catch {
      return json(req, 400, { error: "بيانات الطلب غير صالحة." });
    }

    const { orderId, retry } = body;

    if (
      typeof orderId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(orderId)
    ) {
      return json(req, 400, { error: "معرّف الطلب غير صالح." });
    }

    if (retry !== undefined && typeof retry !== "boolean") {
      return json(req, 400, { error: "قيمة إعادة المحاولة غير صالحة." });
    }

    const isRetry = retry === true;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id,user_id,phone,tracking_code,sms_status,sms_attempt_count",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("send-sms: order lookup failed", orderError.message);
      return json(req, 500, { error: "تعذر التحقق من الطلب." });
    }

    if (!order) {
      return json(req, 404, { error: "الطلب غير موجود." });
    }

    if (!order.user_id || order.user_id !== authData.user.id) {
      return json(req, 403, {
        error: "لا تملك صلاحية إرسال رسالة لهذا الطلب.",
      });
    }

    if (!order.tracking_code) {
      return json(req, 409, { error: "لا يوجد رقم تتبع للرسالة." });
    }

    if (isRetry && order.sms_status !== "failed") {
      return json(req, 409, {
        error: "إعادة المحاولة متاحة فقط بعد فشل مؤكد. لم يُرسل شيء.",
      });
    }

    if (!isRetry && order.sms_status !== "pending") {
      if (
        order.sms_status === "accepted" ||
        order.sms_status === "delivered"
      ) {
        return json(req, 200, {
          accepted: true,
          status: order.sms_status,
          message: "سبق قبول الرسالة لهذا الطلب؛ لم يُكرر الإرسال.",
        });
      }

      return json(req, 409, {
        error: "حالة SMS ليست pending؛ لم يُكرر الإرسال.",
      });
    }

    const recipient = normalizePhone(order.phone ?? "");

    if (!recipient) {
      return json(req, 400, {
        error: "رقم الهاتف المسجل ليس بصيغة دولية صحيحة.",
      });
    }

    // الحجز الذري يمنع محاولتين متزامنتين من إرسال الرسالة نفسها.
    const expectedStatus = isRetry ? "failed" : "pending";

    const { data: claimed, error: claimError } = await admin
      .from("orders")
      .update({
        sms_status: "sending",
        sms_last_attempt_at: new Date().toISOString(),
        sms_attempt_count: (order.sms_attempt_count ?? 0) + 1,
        sms_error: null,
      })
      .eq("id", order.id)
      .eq("user_id", authData.user.id)
      .eq("sms_status", expectedStatus)
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("send-sms: claim failed", claimError.message);
      return json(req, 500, { error: "تعذر حجز محاولة SMS." });
    }

    if (!claimed) {
      return json(req, 409, {
        error: "بدأت محاولة أخرى بالفعل؛ لم يُكرر الإرسال.",
      });
    }

    const persistOutcome = async (
      patch: Record<string, unknown>,
    ): Promise<boolean> => {
      const { error } = await admin
        .from("orders")
        .update(patch)
        .eq("id", order.id)
        .eq("sms_status", "sending");

      if (error) {
        console.error("send-sms: outcome persistence failed", error.message);
        return false;
      }

      return true;
    };

    const message =
      `السوق الشامل - استلمنا طلبك رقم ${order.tracking_code} بنجاح. ` +
      "سنتواصل معك لتأكيد التفاصيل.";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(
        "https://api.textbee.dev/api/v1/gateway/send-sms",
        {
          method: "POST",
          headers: {
            "x-api-key": textbeeApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipients: [recipient],
            message,
            deviceId,
          }),
          signal: controller.signal,
        },
      );

      const responseText = await response.text();
      let parsed: any = null;

      try {
        parsed = JSON.parse(responseText);
      } catch {
        // لا نخزّن نص رد المزود الخام.
      }

      const result = parsed?.data ?? parsed;
      const batchId =
        typeof result?.smsBatchId === "string" ? result.smsBatchId : null;

      if (!response.ok) {
        const definitelyRejected =
          response.status >= 400 && response.status < 500;
        const state = definitelyRejected ? "failed" : "unknown";
        const providerError = safeProviderError(parsed, [
          textbeeApiKey,
          deviceId,
          recipient,
        ]);

        // Keep actionable but redacted diagnostics in the order record. Never
        // log or persist the raw provider body, phone, device ID, or API key.
        console.error("send-sms: TextBee returned a non-success status", {
          status: response.status,
          outcome: state,
          providerCode: providerError.code,
        });

        const saved = await persistOutcome({
          sms_status: state,
          sms_error: `TextBee HTTP ${response.status}`,
          sms_provider_response: {
            httpStatus: response.status,
            providerError,
          },
        });

        if (!saved) {
          return json(req, 502, {
            error:
              "تعذر حفظ نتيجة TextBee؛ تحقق من الطلب قبل إعادة الإرسال.",
          });
        }

        if (!definitelyRejected) {
          return json(req, 502, {
            status: "unknown",
            error:
              "نتيجة TextBee غير مؤكدة. لا تعِد الإرسال قبل التحقق من سجل المزود.",
          });
        }

        return json(req, 502, {
          status: "failed",
          error: "رفض TextBee الطلب. راجع إعداد المزود قبل إعادة المحاولة.",
        });
      }

      const failureCount =
        typeof result?.failureCount === "number"
          ? result.failureCount
          : null;
      const successCount =
        typeof result?.successCount === "number"
          ? result.successCount
          : null;

      if (
        result?.success === false ||
        (failureCount !== null &&
          failureCount > 0 &&
          (successCount === null || successCount === 0))
      ) {
        const saved = await persistOutcome({
          sms_status: "failed",
          sms_error: "TextBee لم يقبل إدراج الرسالة في الإرسال.",
          sms_provider_response: {
            success: false,
            failureCount,
            successCount,
          },
        });

        if (!saved) {
          return json(req, 502, {
            error:
              "تعذر حفظ فشل الإرسال؛ تحقق من الحالة قبل أي محاولة جديدة.",
          });
        }

        return json(req, 502, {
          status: "failed",
          error: "TextBee لم يقبل الرسالة. راجع إعداد الجهاز.",
        });
      }

      const clearlyAccepted =
        batchId !== null ||
        result?.success === true ||
        (successCount !== null && successCount > 0);

      if (!clearlyAccepted) {
        const saved = await persistOutcome({
          sms_status: "unknown",
          sms_error: "رد TextBee لا يحتوي تأكيد قبول واضحًا.",
          sms_provider_response: { outcome: "unrecognized_response" },
        });

        if (!saved) {
          console.error("send-sms: unable to persist unrecognized outcome");
        }

        return json(req, 502, {
          status: "unknown",
          error:
            "رد TextBee غير واضح. تحقق من سجل المزود قبل أي إعادة إرسال.",
        });
      }

      // قبول المزود لا يعني أن الرسالة وصلت إلى هاتف المستلم.
      const safeProviderResponse = {
        smsBatchId: batchId,
        success: typeof result?.success === "boolean"
          ? result.success
          : null,
        recipientCount: typeof result?.recipientCount === "number"
          ? result.recipientCount
          : null,
        successCount,
        failureCount,
      };

      const saved = await persistOutcome({
        sms_status: "accepted",
        sms_accepted_at: new Date().toISOString(),
        sms_provider_batch_id: batchId,
        sms_error: null,
        sms_provider_response: safeProviderResponse,
      });

      if (!saved) {
        return json(req, 502, {
          error:
            "قبل TextBee الطلب لكن تعذر حفظ النتيجة. لا تعِد الإرسال؛ تحقق من سجل المزود.",
        });
      }

      return json(req, 200, {
        accepted: true,
        status: "accepted",
        batchId,
        message: "قبل TextBee طلب الرسالة؛ هذا لا يؤكد وصولها للهاتف.",
      });
    } catch (error) {
      // نتيجة الشبكة غامضة؛ قد يكون المزود قبل الرسالة قبل انقطاع الاتصال.
      const saved = await persistOutcome({
        sms_status: "unknown",
        sms_error: "نتيجة اتصال غير مؤكدة؛ تحقق من TextBee قبل أي إجراء.",
        sms_provider_response: { outcome: "network_unknown" },
      });

      if (!saved) {
        console.error("send-sms: unable to persist ambiguous outcome");
      }

      console.error("send-sms: provider request outcome unknown", {
        timedOut: error instanceof DOMException &&
          error.name === "AbortError",
      });

      return json(req, 502, {
        status: "unknown",
        error:
          "نتيجة SMS غير مؤكدة. لا تعِد الإرسال قبل التحقق من سجل TextBee.",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("send-sms: unexpected function error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return json(req, 500, {
      error: "حدث خطأ غير متوقع في دالة SMS.",
    });
  }
});
