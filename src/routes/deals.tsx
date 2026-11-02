import { createFileRoute } from "@tanstack/react-router";
import { OfferListing } from "@/components/offers/OfferListing";

export const Route = createFileRoute("/deals")({
  component: () => <OfferListing type="deals" />,
});
