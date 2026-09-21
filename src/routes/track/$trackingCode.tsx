import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/track/$trackingCode")({
  component: TrackingDetailPage,
});

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  return (
    <div className="min-h-screen bg-[#fdfbf7] p-10 text-center" dir="rtl">
      <h1 className="text-3xl font-black">تتبع: {trackingCode}</h1>
      <p className="mt-4 text-zinc-500">الصفحة شغالة! ✅</p>
    </div>
  );
}
