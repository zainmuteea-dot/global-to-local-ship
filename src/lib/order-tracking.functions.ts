import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const trackingInput = z.object({
  code: z.string().trim().min(3).max(40),
  phone: z.string().trim().min(9).max(30),
});

export type TrackedOrder = {
  trackingCode: string;
  status: string;
  customerPhone: string;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
};

export const findTrackedOrder = createServerFn({ method: "POST" })
  .inputValidator((data) => trackingInput.parse(data))
  .handler(async ({ data }): Promise<TrackedOrder | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("track_order", {
      _code: data.code,
      _phone: data.phone,
    });

    if (error) throw new Error("تعذر البحث عن الطلب حالياً");
    const order = rows?.[0];
    if (!order) return null;

    return {
      trackingCode: order.tracking_code,
      status: order.status,
      customerPhone: order.customer_phone,
      productName: order.product_name,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  });