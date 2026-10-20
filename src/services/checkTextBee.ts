import { supabase } from "@/integrations/supabase/client";

export type TextBeeCheckResult = {
  valid: boolean;
  deviceIdConfigured: boolean;
  message: string;
};

/**
 * فحص إعدادات TextBee على الخادم دون إرسال رسائل فعلية (خاص بالمدير فقط).
 */
export async function checkTextBeeConfiguration(): Promise<TextBeeCheckResult> {
  const { data, error } = await supabase.functions.invoke("check-textbee", {
    body: {},
  });

  if (error) {
    let serverMessage: string | undefined;
    const context = error.context;

    // قراءة رسالة الخطأ بأمان من الـ Response في كافة البيئات
    if (context && typeof (context as { clone?: () => Response }).clone === "function") {
      try {
        const responseBody = await (context as Response).clone().json();
        if (typeof responseBody?.error === "string") {
          serverMessage = responseBody.error;
        }
      } catch {
        // العودة لرسالة الخطأ الافتراضية إذا تعذر فك التشفير
      }
    }

    throw new Error(serverMessage || error.message || "تعذر فحص إعداد TextBee.");
  }

  if (
    !data ||
    typeof data.valid !== "boolean" ||
    typeof data.deviceIdConfigured !== "boolean" ||
    typeof data.message !== "string"
  ) {
    throw new Error("استجابة فحص TextBee غير مكتملة.");
  }

  return data as TextBeeCheckResult;
}

export default checkTextBeeConfiguration;
