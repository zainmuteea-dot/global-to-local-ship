import { createFileRoute } from "@tanstack/react-router";
import { AdminMerchantMarketRoutes } from "@/components/admin-merchant-market-routes";

export const Route = createFileRoute("/admin/merchant-market")({
  head: () => ({
    meta: [
      { title: "إدارة سوق التجار على المسارات | السوق الشامل" },
      {
        name: "description",
        content: "إدارة طلبات التجار وتوزيعها حسب المدينة ومتابعة حالة التوصيل.",
      },
    ],
  }),
  component: AdminMerchantMarketRoutes,
});
