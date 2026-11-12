import { createFileRoute } from "@tanstack/react-router";
import { MerchantMarketplace } from "@/components/merchant-marketplace";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "سوق التجار | السوق الشامل" },
      { name: "description", content: "تصفح منتجات التجار المحليين واطلبها نقدًا عند الاستلام." },
    ],
  }),
  component: MerchantMarketplace,
});
