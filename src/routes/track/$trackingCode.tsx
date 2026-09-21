import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/track/$trackingCode")({
  component: TrackingDetailPage,
});

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const { data } = await supabase.from("orders").select("*").eq("tracking_code", trackingCode).maybeSingle();
      if (!data) setNotFound(true);
      else setOrder(data);
      setLoading(false);
    };
    if (trackingCode) fetchOrder();
  }, [trackingCode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" dir="rtl">جاري البحث...</div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center" dir="rtl">لم يتم العثور على {trackingCode}</div>;

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-6" dir="rtl">
      <div className="max-w-2xl mx-auto bg-zinc-900 text-white p-6 rounded-2xl">
        <h1 className="text-3xl font-black">{order?.tracking_code}</h1>
        <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-bold mt-4 inline-block">{order?.status}</span>
      </div>
    </div>
  );
}
