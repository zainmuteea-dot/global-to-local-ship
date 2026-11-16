import { createFileRoute } from "@tanstack/react-router";
import { AdminMerchantMarketplace } from "@/components/admin-merchant-marketplace";

export const Route = createFileRoute("/admin/merchants")({
  head: () => ({
    meta: [
      { title: "إدارة التجار | السوق الشامل" },
      { name: "description", content: "إدارة متاجر التجار ومراجعة المنتجات ومتابعة الطلبات." },
      { property: "og:title", content: "إدارة التجار | السوق الشامل" },
      { property: "og:description", content: "إدارة متاجر التجار ومراجعة المنتجات ومتابعة الطلبات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminMerchantMarketplace,
});
