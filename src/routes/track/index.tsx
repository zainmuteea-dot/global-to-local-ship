import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ArrowRight, Hash, Phone, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findTrackedOrder } from "@/lib/order-tracking.functions";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "تتبع الطلب — السوق الشامل" },
      { name: "description", content: "تابع طلبك من السوق الشامل باستخدام رقم الطلب ورقم الهاتف." },
      { property: "og:title", content: "تتبع الطلب — السوق الشامل" },
      { property: "og:description", content: "تابع حالة شحنتك ومسار وصولها إلى اليمن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackIndex,
});

function TrackIndex() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const lookupOrder = useServerFn(findTrackedOrder);

  const handleTrack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trackingCode = code.trim();
    const phoneDigits = phone.replace(/\D/g, "");

    if (!trackingCode) {
      setError("أدخل رقم الطلب");
      return;
    }
    if (phoneDigits.length < 9) {
      setError("أدخل رقم الهاتف المسجل بالطلب");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const order = await lookupOrder({ data: { code: trackingCode, phone: phoneDigits } });
      if (!order) {
        setError("رقم الطلب أو الهاتف غير صحيح");
        return;
      }
      sessionStorage.setItem(`sc_tracking_${order.trackingCode}`, JSON.stringify(order));
      await navigate({ to: "/track/$trackingCode", params: { trackingCode: order.trackingCode } });
    } catch {
      setError("تعذر البحث الآن، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 pb-12 pt-5 font-body">
      <main className="mx-auto w-full max-w-md">
        <header className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <img src="/IMG-20260922-WA6153.jpg" alt="مساعد السوق الشامل" className="size-full object-cover" />
            </span>
            <Link to="/login" aria-label="تسجيل الدخول" className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
              <UserRound className="size-5" />
            </Link>
          </div>
          <h1 className="text-center font-display text-xl font-black text-cocoa">تتبع الطلب</h1>
          <Button asChild variant="secondary" className="h-10 rounded-xl px-4 font-bold text-cocoa">
            <Link to="/">رجوع <ArrowRight /></Link>
          </Button>
        </header>

        <form onSubmit={handleTrack} className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border shadow-sm">
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-cocoadeep">رقم الطلب</span>
            <span className="flex h-14 items-center gap-3 rounded-xl bg-background px-4 ring-1 ring-border focus-within:ring-2 focus-within:ring-gold">
              <input
                value={code}
                onChange={(event) => { setCode(event.target.value); setError(""); }}
                placeholder="مثال: SC-123456"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-right text-base text-cocoadeep outline-none placeholder:text-muted-foreground"
              />
              <Hash className="size-5 shrink-0 text-clay" />
            </span>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-extrabold text-cocoadeep">رقم الهاتف</span>
            <span className="flex h-14 items-center gap-3 rounded-xl bg-background px-4 ring-1 ring-border focus-within:ring-2 focus-within:ring-gold">
              <input
                value={phone}
                onChange={(event) => { setPhone(event.target.value); setError(""); }}
                placeholder="رقم الهاتف المسجل بالطلب"
                inputMode="tel"
                dir="ltr"
                className="min-w-0 flex-1 bg-transparent text-right text-base text-cocoadeep outline-none placeholder:text-muted-foreground"
              />
              <Phone className="size-5 shrink-0 text-clay" />
            </span>
          </label>

          {error && <p role="alert" className="mt-3 text-sm font-bold text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-5 h-14 w-full rounded-xl bg-cocoa font-display text-lg font-extrabold text-cream">
            {loading ? "جاري البحث..." : "تتبع طلبك"} <Search />
          </Button>
        </form>
      </main>
    </div>
  );
}