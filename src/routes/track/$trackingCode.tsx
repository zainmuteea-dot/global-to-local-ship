import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Hash, Phone, ArrowRight, CheckCircle2, Truck, PackageSearch, Bike, Home } from "lucide-react";

export const Route = createFileRoute("/track/$trackingCode")({
  component: TrackingDetailPage,
});

const STEPS = [
  { key: "confirmed", title: "الطلب والتأكيد", desc: "تم استلام طلبك وتأكيده بنجاح.", icon: CheckCircle2 },
  { key: "shipping", title: "الشراء والشحن الدولي", desc: "جاري شراء طلبك وشحنه دولياً نحو مستودعاتنا.", icon: Truck },
  { key: "warehouse", title: "المخزن والفحص", desc: "وصل طلبك للمخزن ويتم فحصه وتغليفه بعناية.", icon: PackageSearch },
  { key: "out", title: "في الطريق إليك", desc: "طلبك مع المندوب وفي طريقه للتسليم، استعد!", icon: Bike },
  { key: "delivered", title: "تم التسليم", desc: "بالعافية! تم تسليم طلبك بنجاح.", icon: Home },
];

// Map a stored order status to the active step index.
function statusToIndex(status?: string): number {
  const s = (status || "").toLowerCase();
  if (s.includes("تسليم") || s.includes("deliver")) return 4;
  if (s.includes("طريق") || s.includes("مندوب") || s.includes("out")) return 3;
  if (s.includes("مخزن") || s.includes("فحص") || s.includes("warehouse")) return 2;
  if (s.includes("شحن") || s.includes("شراء") || s.includes("ship")) return 1;
  return 1;
}

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.rpc("track_order", { _code: trackingCode });
        setOrder(Array.isArray(data) ? (data[0] ?? null) : null);
      } catch {
        // Supabase not configured in this environment — fall back to the URL params.
        setOrder(null);
      }
      setLoading(false);
    };
    if (trackingCode) fetchOrder();
  }, [trackingCode]);

  const activeIndex = statusToIndex(order?.status);
  const orderNumber = order?.tracking_code || trackingCode;
  const phone = order?.customer_phone || order?.phone || "—";
  const statusLabel = order?.status || "قيد الشحن الدولي";

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-14 font-body">
      <header className="flex items-center justify-between px-5 pt-6">
        <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <img src="/IMG-20260922-WA6153.jpg" alt="مساعد جلوبال" className="size-full object-cover" />
        </span>
        <button
          onClick={() => navigate({ to: "/track" })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-card px-4 py-2 font-display text-sm font-bold text-cocoa ring-1 ring-border"
        >
          رجوع <ArrowRight className="size-4" />
        </button>
      </header>

      <main className="mx-auto mt-6 max-w-md px-5">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 ring-1 ring-border">
          <Bell className="size-5 text-gold" />
          <span className="font-display text-lg font-black text-cocoadeep">{statusLabel}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-center justify-end gap-2 text-clay">
              <span className="font-display text-sm font-bold text-cocoa">رقم الطلب</span>
              <Hash className="size-4" />
            </div>
            <p className="mt-1 text-right font-display text-lg font-black text-cocoadeep">{loading ? "..." : orderNumber}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-center justify-end gap-2 text-clay">
              <span className="font-display text-sm font-bold text-cocoa">رقم الهاتف</span>
              <Phone className="size-4" />
            </div>
            <p className="mt-1 text-right font-display text-lg font-black text-cocoadeep">{loading ? "..." : phone}</p>
          </div>
        </div>

        <h2 className="mb-4 mt-8 font-display text-xl font-extrabold text-cocoadeep">مسار الطلب</h2>

        <ol className="relative space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < activeIndex;
            const active = i === activeIndex;
            const isLast = i === STEPS.length - 1;
            return (
              <li key={step.key} className="relative flex gap-4">
                {!isLast && (
                  <span
                    className={`absolute right-[19px] top-11 h-[calc(100%-8px)] w-0.5 ${done ? "bg-gold" : "bg-border"}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`z-10 grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-background ${
                    done ? "bg-gold text-cocoadeep" : active ? "bg-cocoa text-cream" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <div
                  className={`flex-1 rounded-2xl p-4 ring-1 ${
                    active ? "bg-gold/15 ring-gold" : "bg-card ring-border"
                  }`}
                >
                  <p className={`font-display text-base font-extrabold ${active ? "text-cocoadeep" : "text-cocoadeep"}`}>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
