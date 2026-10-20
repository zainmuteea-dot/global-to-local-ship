import { supabase } from "@/integrations/supabase/client";

export type SendSmsResult = {
  accepted: true;
  smsBatchId?: string;
  message: string;
};

/** استدعاء دالة الخادم بعد تسجيل الدخول؛ لا تضع مفتاح TextBee هنا. */
export async function sendSms(
  phone: string,
  message: string,
): Promise<SendSmsResult> {
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: { phone, message },
  });

  if (error) {
    let serverMessage: string | undefined;
    const context = error.context;

    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === "string") {
          serverMessage = body.error;
        }
      } catch {
        // استخدم رسالة الخطأ العامة أدناه.
      }
    }

    throw new Error(serverMessage || error.message || "تعذر إرسال الرسالة.");
  }

  if (!data || data.accepted !== true) {
    throw new Error("لم يؤكد الخادم قبول طلب إرسال الرسالة.");
  }

  return data as SendSmsResult;
}
