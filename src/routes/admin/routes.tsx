import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/routes")({
  head: () => ({
    meta: [
      { title: "توزيع الطلبات على المسارات | السوق الشامل" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoutesRedirect,
});

function AdminRoutesRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/admin-tracking");
    }
  }, []);
  return null;
}
