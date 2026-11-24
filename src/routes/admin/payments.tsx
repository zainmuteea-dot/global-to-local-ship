import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsRedirect,
});

function AdminPaymentsRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/payments");
    }
  }, []);
  return null;
}
