import { createFileRoute } from "@tanstack/react-router";
import { MerchantDashboard } from "@/components/merchant-dashboard";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "بوابة التاجر | السوق الشامل" },
      { name: "description", content: "إدارة متجر التاجر والمنتجات والطلبات في السوق الشامل." },
    ],
  }),
  component: MerchantDashboard,
});
