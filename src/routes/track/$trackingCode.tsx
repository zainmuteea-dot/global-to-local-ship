import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/track/$trackingCode")({
  component: TrackingDetailPage,
});

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const [order][setOrder] = useState<any>(null);
  const [loading][setLoading] = useState(true);

  useEffect(() => {
    supabase.from("orders").select("*").eq("tracking_code", trackingCode).single()
    .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [trackingCode]);

  if (loading) return <div className="p-10 text-center" dir="rtl">جاري البحث...</div>;
  if (!order) return <div className="p-10 text-center" dir="rtl">كود {trackingCode} غير موجود</div>;

  const statuses = ["تم استلام الطلب", "تم الشراء", "في الشحن الدولي", "وصل اليمن", "تم التسليم"];
  const currentIndex = statuses.indexOf(order.status);

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-4" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-lg border p-8 mt-10 text-center">
        <h1 className="text-2xl font-black">مرحبا {order.customer_name}</h1>
        <p>كودك: {order.tracking_code}</p>
        <div className="space-y-3 mt-6 text-right">
          {statuses.map((s,i)=>(
            <div key={s} className={`flex items-center gap-3 p-3 rounded-xl ${i <= currentIndex? "bg-orange-50" : "opacity-40"}`}>
              {i <= currentIndex? <CheckCircle2 className="text-green-600"/> : <Clock/>}
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
