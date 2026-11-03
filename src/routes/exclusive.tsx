import { createFileRoute } from "@tanstack/react-router";
import { OfferListing } from "@/components/offers/OfferListing";

export const Route = createFileRoute("/exclusive")({
  component: () => <OfferListing type="exclusive" />,
});
