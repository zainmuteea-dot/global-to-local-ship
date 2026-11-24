import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersRedirect,
});

function AdminOrdersRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/admin-clients");
    }
  }, []);
  return null;
}
