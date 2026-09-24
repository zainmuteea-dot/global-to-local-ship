import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Link2, Package, Send, User, Phone, CheckCircle2 } from "lucide-react";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/new-order")({
  head: () => ({
    meta: [
      { title: "طلب جديد — السوق الشامل" },
      { name: "description", content: "أرسل رابط المنتج الذي تريد شراءه وسنتكفل بالباقي." },
    ],
  }),
  component: NewOrder,
});

function NewOrder() {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError("");
    if (!link.trim()) { setError("الصق رابط المنتج أولاً"); return; }
    if (!name.trim()) { setError("أدخل اسمك"); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) { setError("أدخل رقم جوال صحيح (9 أرقام على الأقل)"); return; }

    setLoading(true);
    const { data, error: err } = await supabase.rpc("create_order", {
      _product_link: link.trim(),
      _customer_name: name.trim(),
      _phone: `+967 ${digits}`,
    });

    setLoading(false);

    if (err) {
      setError("حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.");
      return;
    }

    setSuccess((data as string) ?? "تم");
  };

  if (success) {
    return (
      <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-border shadow-sm">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="size-9" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-black text-cocoadeep">تم استلام طلبك!</h1>
            <p className="mt-2 text-sm text-muted-foreground">سنتواصل معك قريباً لتأكيد التفاصيل.</p>
            <div className="mt-4 rounded-2xl bg-secondary px-4 py-3">
              <p className="text-xs font-bold text-clay">رقم تتبع طلبك</p>
              <p className="mt-1 font-display text-xl font-black text-cocoadeep" dir="ltr">{success}</p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => navigate({ to: "/track" })}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream"
              >
                تتبع طلبي <Package className="size-5" />
              </button>
              <button
                onClick={() => navigate({ to: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3.5 font-display text-sm font-bold text-cocoa ring-1 ring-border"
              >
                <ArrowLeft className="size-4" /> الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button
            onClick={() => navigate({ to: "/" })}
            className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
            aria-label="رجوع"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-sm">
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">اطلب منتجك الآن</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">الصق رابط المنتج من TEMU أو SHEIN أو Amazon أو AliExpress وسنتكفل بالباقي</p>

          {/* Product link */}
          <label className="mt-6 flex items-center gap-1.5 text-sm font-bold text-cocoa">
            <Link2 className="size-4" /> رابط المنتج
          </label>
          <input
            value={link}
            onChange={(e) => { setLink(e.target.value); setError(""); }}
            dir="ltr"
            placeholder="https://..."
            className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
          />

          {/* Name */}
          <label className="mt-4 flex items-center gap-1.5 text-sm font-bold text-cocoa">
            <User className="size-4" /> الاسم
          </label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="اكتب اسمك هنا"
            className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
          />

          {/* Phone */}
          <label className="mt-4 flex items-center gap-1.5 text-sm font-bold text-cocoa">
            <Phone className="size-4" /> رقم الجوال
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <span className="grid shrink-0 place-items-center rounded-2xl bg-secondary px-3 text-center text-xs font-bold text-clay">
              +967
              <br />
              اليمن
            </span>
            <input
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(""); }}
              inputMode="numeric"
              placeholder="7XXXXXXXX"
              className="w-full rounded-2xl bg-background px-4 py-3.5 text-lg tracking-widest text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
            />
          </div>

          {error && <p className="mt-3 text-xs font-bold text-destructive">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream disabled:opacity-60"
          >
            {loading ? "جاري الإرسال..." : "إرسال الطلب"} <Send className="size-5" />
          </button>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            بإرسالك الطلب فإنك توافق على
            <br />
            <span className="font-bold text-cocoa">شروط الاستخدام وسياسة الخصوصية</span>
          </p>
        </div>
      </div>
    </div>
  );
}
