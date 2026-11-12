import { createFileRoute } from "@tanstack/react-router";
import { AdminMerchantMarketplace } from "@/components/admin-merchant-marketplace";

export const Route = createFileRoute("/admin/merchants")({
  head: () => ({
    meta: [
      { title: "إدارة التجار | السوق الشامل" },
      { name: "description", content: "إدارة متاجر التجار ومراجعة المنتجات ومتابعة الطلبات." },
    ],
  }),
  component: AdminMerchantMarketplace,
});
