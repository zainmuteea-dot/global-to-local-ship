import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Hash, Phone, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

export type TrackedOrder = {
  trackingCode: string;
  status: string;
  customerPhone: string;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
};

function TrackIndex() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trackingCode = code.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!trackingCode) {
      setError("يرجى إدخال رقم الطلب");
      return;
    }
    if (cleanPhone.length < 8) {
      setError("أدخل رقم الهاتف المسجل بالطلب");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // البحث المباشر في جدول الطلبات orders باستخدام select("*") لتجنب أي تعارض في أسماء الأعمدة
      const { data: directOrders, error: queryError } = await supabase
        .from("orders")
        .select("*")
        .ilike("tracking_code", trackingCode);

      let matchedOrder: TrackedOrder | null = null;

      if (!queryError && directOrders && directOrders.length > 0) {
        // التحقق من مطابقة رقم الهاتف (يقبل الأرقام بـ 9 أرقام أو مع مفتاح الدولة)
        const match = directOrders.find((o) => {
          const rowPhone = (o.phone || o.customer_phone || "").replace(/\D/g, "");
          return (
            !cleanPhone ||
            rowPhone.endsWith(cleanPhone.slice(-8)) ||
            cleanPhone.endsWith(rowPhone.slice(-8))
          );
        });

        if (match) {
          matchedOrder = {
            trackingCode: match.tracking_code || trackingCode,
            status: match.status || "جديد",
            customerPhone: match.phone || match.customer_phone || cleanPhone,
            productName: match.product_name || match.product_title || match.notes || match.product_link || "طلب شحن",
            createdAt: match.created_at,
            updatedAt: match.updated_at || match.created_at,
          };
        }
      }

      if (!matchedOrder) {
        setError("لم يتم العثور على شحنة مطابقة لرقم الطلب ورقم الهاتف المدخلين");
        return;
      }

      // حفظ بيانات التتبع محلياً والانتقال لشاشة التفاصيل
      sessionStorage.setItem(`sc_tracking_${matchedOrder.trackingCode}`, JSON.stringify(matchedOrder));
      await navigate({
        to: "/track/$trackingCode",
        params: { trackingCode: matchedOrder.trackingCode },
      });
    } catch {
      setError("تعذر الاتصال بقاعدة البيانات، تأكد من اتصال الإنترنت وحاول ثانية");
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
            <Link to="/signup" aria-label="تسجيل الدخول" className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
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
                placeholder="مثال: SQ-371430"
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
                placeholder="774399744"
                inputMode="tel"
                dir="ltr"
                className="min-w-0 flex-1 bg-transparent text-right text-base text-cocoadeep outline-none placeholder:text-muted-foreground"
              />
              <Phone className="size-5 shrink-0 text-clay" />
            </span>
          </label>

          {error && <p role="alert" className="mt-3 text-sm font-bold text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-5 h-14 w-full rounded-xl bg-cocoa font-display text-lg font-extrabold text-cream">
            {loading ? "جاري البحث في قاعدة البيانات..." : "تتبع طلبك"} <Search />
          </Button>
        </form>
      </main>
    </div>
  );
}
