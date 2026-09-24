import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Bike, Check, Hash, Home, PackageSearch, Phone, Plane, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrackedOrder } from "@/lib/order-tracking.functions";

export const Route = createFileRoute("/track/$trackingCode")({
  head: () => ({
    meta: [
      { title: "مسار الطلب — السوق الشامل" },
      { name: "description", content: "شاهد حالة طلبك وجميع مراحل الشحن والتسليم من السوق الشامل." },
      { property: "og:title", content: "مسار الطلب — السوق الشامل" },
      { property: "og:description", content: "شاهد حالة طلبك وجميع مراحل الشحن والتسليم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackingDetailPage,
});

const STEPS = [
  { key: "confirmed", title: "الطلب والتأكيد", desc: "تم استلام طلبك وتأكيده بنجاح.", icon: Check },
  { key: "shipping", title: "الشراء والشحن الدولي", desc: "جاري شراء طلبك وشحنه دولياً نحو مستودعاتنا.", icon: Plane },
  { key: "warehouse", title: "المخزن والفحص", desc: "وصل طلبك للمخزن ويتم فحصه وتغليفه بعناية.", icon: PackageSearch },
  { key: "out", title: "في الطريق إليك", desc: "طلبك مع المندوب وفي طريقه للتسليم، استعد!", icon: Bike },
  { key: "delivered", title: "تم التسليم", desc: "بالعافية! تم تسليم طلبك بنجاح.", icon: Home },
];

function statusToIndex(status: string): number {
  const value = status.toLowerCase();
  if (value.includes("تم التسليم") || value.includes("deliver")) return 4;
  if (value.includes("طريق") || value.includes("مندوب") || value.includes("out")) return 3;
  if (value.includes("مخزن") || value.includes("فحص") || value.includes("warehouse")) return 2;
  if (value.includes("شحن") || value.includes("شراء") || value.includes("ship")) return 1;
  return 0;
}

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(`sc_tracking_${trackingCode}`);
    if (saved) {
      try {
        setOrder(JSON.parse(saved) as TrackedOrder);
      } catch {
        sessionStorage.removeItem(`sc_tracking_${trackingCode}`);
      }
    }
    setReady(true);
  }, [trackingCode]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  if (!order) {
    return (
      <div dir="rtl" lang="ar" className="grid min-h-screen place-items-center bg-background px-5 font-body">
        <div className="w-full max-w-sm rounded-2xl bg-card p-7 text-center ring-1 ring-border">
          <PackageSearch className="mx-auto size-12 text-clay" />
          <h1 className="mt-4 font-display text-xl font-black text-cocoadeep">تحقق من بيانات الطلب</h1>
          <p className="mt-2 text-sm text-muted-foreground">أدخل رقم الطلب ورقم الهاتف لعرض مسار الشحنة.</p>
          <Button asChild className="mt-5 h-12 w-full rounded-xl bg-cocoa text-cream">
            <Link to="/track">العودة إلى التتبع</Link>
          </Button>
        </div>
      </div>
    );
  }

  const activeIndex = statusToIndex(order.status);
  const statusLabel = activeIndex === 1 ? "قيد الشحن الدولي" : order.status;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 pb-14 pt-4 font-body">
      <main className="mx-auto w-full max-w-md">
        <header className="relative flex min-h-14 items-center justify-end rounded-xl bg-card px-4 ring-1 ring-border">
          <span className="absolute -start-2 -bottom-1 grid size-14 place-items-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <img src="/IMG-20260922-WA6153.jpg" alt="مساعد السوق الشامل" className="size-full object-cover" />
          </span>
          <div className="mx-auto flex items-center gap-2 font-display text-base font-black text-cocoa">
            <Bell className="size-4 text-gold" /> {statusLabel}
          </div>
        </header>

        <Button asChild variant="secondary" className="mt-4 h-10 rounded-xl px-4 font-bold text-cocoa">
          <Link to="/track">رجوع <ArrowRight /></Link>
        </Button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoBox label="رقم الطلب" value={order.trackingCode} icon={Hash} />
          <InfoBox label="رقم الهاتف" value={order.customerPhone} icon={Phone} />
        </div>

        <h1 className="mb-5 mt-7 font-display text-xl font-black text-cocoadeep">مسار الطلب</h1>
        <ol className="relative">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const reached = index <= activeIndex;
            const active = index === activeIndex;
            const last = index === STEPS.length - 1;
            return (
              <li key={step.key} className="relative flex min-h-24 gap-4">
                {!last && <span className={`absolute right-[18px] top-10 h-[calc(100%-4px)] w-0.5 ${index < activeIndex ? "bg-gold" : "bg-border"}`} aria-hidden />}
                <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-background ${active ? "bg-cocoa text-cream" : reached ? "bg-gold text-cocoadeep" : "bg-card text-muted-foreground ring-1 ring-border"}`}>
                  <Icon className="size-4" />
                </span>
                <div className={`mb-3 flex-1 rounded-xl px-4 py-3 ${active ? "bg-card ring-1 ring-gold" : "bg-transparent"}`}>
                  <p className={`font-display text-base font-extrabold ${reached ? "text-cocoa" : "text-cocoadeep"}`}>{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}

function InfoBox({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Truck }) {
  return (
    <div className="relative min-w-0 rounded-xl bg-card p-4 ring-1 ring-border">
      <span className="absolute inset-y-3 right-0 w-1 rounded-l-full bg-gold" />
      <div className="flex items-center gap-2 text-clay"><Icon className="size-4" /><span className="text-xs font-bold text-muted-foreground">{label}</span></div>
      <p dir="ltr" className="mt-2 truncate text-right font-display text-base font-black text-cocoadeep">{value}</p>
    </div>
  );
}