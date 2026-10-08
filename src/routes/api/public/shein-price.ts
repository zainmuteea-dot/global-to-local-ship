import { createFileRoute } from "@tanstack/react-router";

// واجهة بيانات الطلب
interface SheinPriceRequest {
  url?: string;
  originalPrice?: number;
  currency?: string; // e.g. SAR, USD, YER
  exchangeRate?: number; // سعر الصرف
  commissionPercent?: number; // نسبة العمولة %
  shippingCost?: number; // تكلفة الشحن
}

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
          const body: SheinPriceRequest = await request.json();
          const originalPrice = Number(body.originalPrice) || 0;
          const exchangeRate = Number(body.exchangeRate) || 1.0;
          const commissionPercent = Number(body.commissionPercent) ?? 10; // افتراضي 10%
          const shippingCost = Number(body.shippingCost) || 0;

          // السعر بعد تحويل العملة
          const convertedPrice = originalPrice * exchangeRate;
          // قيمة العمولة
          const commissionAmount = (convertedPrice * commissionPercent) / 100;
          // الإجمالي النهائي
          const finalPrice = Math.round(convertedPrice + commissionAmount + shippingCost);

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
            { status: 400 }
          );
        }
      },
    },
  },
});
