import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/track/$trackingCode")({
  component: TrackingDetailPage,
});

type Order = {
  id: string;
  tracking_code: string;
  status: string;
  customer_name?: string;
  store_name?: string;
  created_at: string;
};

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const [order][setOrder] = useState<Order | null>(null);
  const [loading][setLoading] = useState(true);
  const [notFound][setNotFound] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const { data } = await supabase.from("orders").select("*").eq("tracking_code", trackingCode).maybeSingle();
      if (!data) setNotFound(true);
      else setOrder(data as Order);
      setLoading(false);
    };
    if (trackingCode) fetchOrder();
  }, [trackingCode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" dir="rtl">جاري البحث عن {trackingCode}...</div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]" dir="rtl"><div className="bg-white p-8 rounded-2xl border text-center"><h2 className="font-black text-xl">لم يتم العثور على الشحنة</h2><p className="mt-2 text-zinc-500">{trackingCode}</p></div></div>;

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 text-white p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">رقم التتبع</p>
          <h1 className="text-3xl font-black mt-1">{order?.tracking_code}</h1>
          <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-bold mt-4 inline-block">{order?.status}</span>
        </div>
      </div>
    </div>
  );
}
