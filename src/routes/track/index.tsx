import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Hash, Phone, Search, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/track/")({
  component: TrackIndex,
});

function TrackIndex() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handleTrack = () => {
    const trackingCode = code.trim() || "demo";
    navigate({ to: "/track/$trackingCode", params: { trackingCode } });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background font-body">
      <header className="flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <img src="/IMG-20260922-WA6153.jpg" alt="مساعد جلوبال" className="size-full object-cover" />
          </span>
          <h1 className="font-display text-2xl font-black text-cocoadeep">تتبع الطلب</h1>
        </div>
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-card px-4 py-2 font-display text-sm font-bold text-cocoa ring-1 ring-border"
        >
          رجوع <ArrowRight className="size-4" />
        </button>
      </header>

      <main className="mx-auto mt-8 max-w-md px-5">
        <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
          <label className="mb-6 block">
            <span className="mb-2 block text-right font-display text-sm font-extrabold text-cocoadeep">رقم الطلب</span>
            <div className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-gold">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 123456"
                className="min-w-0 flex-1 bg-transparent text-right text-base text-cocoadeep outline-none placeholder:text-muted-foreground"
              />
              <span className="grid size-8 place-items-center rounded-lg bg-secondary text-clay">
                <Hash className="size-4" />
              </span>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-right font-display text-sm font-extrabold text-cocoadeep">رقم الهاتف</span>
            <div className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-gold">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="رقم الهاتف المسجل بالطلب"
                inputMode="tel"
                className="min-w-0 flex-1 bg-transparent text-right text-base text-cocoadeep outline-none placeholder:text-muted-foreground"
              />
              <span className="grid size-8 place-items-center rounded-lg bg-secondary text-clay">
                <Phone className="size-4" />
              </span>
            </div>
          </label>
        </div>

        <button
          onClick={handleTrack}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold to-cocoa px-6 py-4 font-display text-lg font-extrabold text-cream shadow-lg shadow-cocoa/20 transition active:scale-[0.99]"
        >
          <Search className="size-5" /> تتبع طلبك
        </button>
      </main>
    </div>
  );
}
