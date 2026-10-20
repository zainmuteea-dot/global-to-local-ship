import { supabase } from "@/integrations/supabase/client";

export type TextBeeCheckResult = {
  valid: boolean;
  deviceIdConfigured: boolean;
  message: string;
};

/** Checks server-side TextBee credentials without sending an SMS. Admin only. */
export async function checkTextBeeConfiguration(): Promise<TextBeeCheckResult> {
  const { data, error } = await supabase.functions.invoke("check-textbee", {
    body: {},
  });

  if (error) {
    let serverMessage: string | undefined;
    const context = error.context;

    if (context instanceof Response) {
      try {
        const responseBody = await context.clone().json();
        if (typeof responseBody?.error === "string") {
          serverMessage = responseBody.error;
        }
      } catch {
        // Fall through to the SDK error.
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
