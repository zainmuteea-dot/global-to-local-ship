import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — السوق الشامل" },
      { name: "description", content: "سجّل دخولك برقم جوالك لمتابعة طلباتك في السوق الشامل." },
      { property: "og:title", content: "تسجيل الدخول — السوق الشامل" },
      { property: "og:description", content: "سجّل دخولك برقم جوالك لمتابعة طلباتك في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setError("أدخل رقم جوال صحيح (9 أرقام)");
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    localStorage.setItem("sc_phone", `+967 ${digits}`);
    localStorage.setItem("sc_code", code);
    navigate({ to: "/verify" });
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
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
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">تسجيل الدخول</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">أدخل رقم هاتفك لنرسل لك كود التحقق</p>

          <label className="mt-6 flex items-center gap-1.5 text-sm font-bold text-cocoa">
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
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              inputMode="numeric"
              placeholder="7XXXXXXXX"
              className="w-full rounded-2xl bg-background px-4 py-3.5 text-lg tracking-widest text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
            />
          </div>
          {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}

          <button
            onClick={submit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream"
          >
            متابعة <ArrowRight className="size-5" />
          </button>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            باستمرارك فإنك توافق على
            <br />
            <span className="font-bold text-cocoa">شروط الاستخدام وسياسة الخصوصية</span>
          </p>
        </div>
      </div>
    </div>
  );
}
