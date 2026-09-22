import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, MessageCircle, Send } from "lucide-react";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "رمز التحقق — السوق الشامل" },
      { name: "description", content: "أدخل رمز التحقق المرسل إلى جوالك لتسجيل الدخول إلى السوق الشامل." },
      { property: "og:title", content: "رمز التحقق — السوق الشامل" },
      { property: "og:description", content: "أدخل رمز التحقق المرسل إلى جوالك لتسجيل الدخول إلى السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(55);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setPhone(localStorage.getItem("sc_phone") ?? "");
    setDemoCode(localStorage.getItem("sc_code") ?? "");
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const setAt = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((p, idx) => (idx === i ? d : p)));
    setError("");
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const confirm = () => {
    const entered = digits.join("");
    if (entered.length < 6) {
      setError("أدخل الرمز كاملاً (6 أرقام)");
      return;
    }
    if (entered !== demoCode) {
      setError("الرمز غير صحيح");
      return;
    }
    localStorage.setItem("sc_logged_in", "1");
    navigate({ to: "/my-account" });
  };

  const resend = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    localStorage.setItem("sc_code", code);
    setDemoCode(code);
    setSeconds(55);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
            aria-label="رجوع"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-sm">
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">رمز التحقق</h1>
          <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            أرسلنا رمز التحقق لرقمك
            <MessageCircle className="size-4 text-clay" />
            <Send className="size-4 text-clay" />
          </p>
          <p dir="ltr" className="mt-1 text-center font-display text-lg font-black text-clay">{phone}</p>

          <p className="mt-6 text-sm font-bold text-cocoa">أدخل الكود (6 أرقام)</p>
          <div dir="ltr" className="mt-2 flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-full rounded-xl bg-background text-center font-display text-2xl font-black text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
              />
            ))}
          </div>
          {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}

          {demoCode && (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-center text-xs font-bold text-clay">
              نسخة تجريبية — الرمز: <span dir="ltr">{demoCode}</span>
            </p>
          )}

          <button
            onClick={confirm}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream"
          >
            تأكيد الدخول <Check className="size-5" />
          </button>

          <button
            onClick={resend}
            disabled={seconds > 0}
            className="mt-3 w-full rounded-2xl bg-secondary py-3 text-sm font-bold text-clay disabled:opacity-70"
          >
            {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "إعادة إرسال الرمز"}
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
