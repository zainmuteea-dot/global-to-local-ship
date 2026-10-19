import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const priceRequest = z.object({
  originalPrice: z.number().finite().nonnegative(),
  exchangeRate: z.number().finite().positive().default(1),
  commissionPercent: z.number().finite().min(0).max(100).default(10),
  shippingCost: z.number().finite().nonnegative().default(0),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("SAR"),
});

export const Route = createFileRoute("/api/public/shein-price")({
  server: {
    handlers: {
      // استعلام تجريبي عبر GET
      GET: async () => {
        return Response.json({
          success: true,
          message: "خدمة تسعير شي إن في السوق الشامل جاهزة",
          defaultCommission: "10%",
        });
      },

      // استقبال بيانات السعر أو الرابط وحساب التكلفة الإجمالية
      POST: async ({ request }) => {
        try {
          const body = priceRequest.parse(await request.json());
          const { originalPrice, exchangeRate, commissionPercent, shippingCost } = body;

          // السعر بعد تحويل العملة
          const convertedPrice = originalPrice * exchangeRate;
          // قيمة العمولة
          const commissionAmount = (convertedPrice * commissionPercent) / 100;
          // الإجمالي النهائي
          const finalPrice = Math.round(convertedPrice + commissionAmount + shippingCost);

          if (![convertedPrice, commissionAmount, finalPrice].every(Number.isFinite)) {
            throw new Error("invalid-price");
          }
          return Response.json({
            success: true,
            data: {
              originalPrice,
              exchangeRate,
              convertedPrice,
              commissionPercent,
              commissionAmount,
              shippingCost,
              finalPrice,
              currency: body.currency || "SAR",
              note: "تم احتساب السعر شاملاً عمولة السوق الشامل والشحن",
            },
          });
        } catch (error) {
          return Response.json(
            { success: false, error: "تعذر معالجة الطلب، تأكد من صحة البيانات" },
            { status: 400 },
          );
        }
      },
    },
  },
});
