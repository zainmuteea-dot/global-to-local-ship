import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "رمز التحقق — السوق الشامل" },
      { name: "description", content: "أدخل رمز التحقق المرسل إلى بريدك لتسجيل الدخول إلى السوق الشامل." },
      { property: "og:title", content: "رمز التحقق — السوق الشامل" },
      { property: "og:description", content: "أدخل رمز التحقق المرسل إلى بريدك لتسجيل الدخول إلى السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

const LEN = 6;

function VerifyPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(55);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const e = sessionStorage.getItem("sc_email");
    if (!e) navigate({ to: "/login" });
    else setEmail(e);
    // If the user clicked the email link in another tab, continue automatically
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_IN") finish();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const finish = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const name = sessionStorage.getItem("sc_name");
    const phone = sessionStorage.getItem("sc_phone");
    const patch: { full_name?: string; phone?: string } = {};
    if (name) patch.full_name = name;
    if (phone) patch.phone = phone;
    if (Object.keys(patch).length) {
      await supabase.from("profiles").upsert({ id: data.user.id, ...patch });
    }
    sessionStorage.removeItem("sc_name");
    sessionStorage.removeItem("sc_phone");
    navigate({ to: "/my-account" });
  };

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const arr = clean.slice(0, LEN).split("");
      setDigits(Array.from({ length: LEN }, (_, k) => arr[k] ?? ""));
      refs.current[Math.min(arr.length, LEN - 1)]?.focus();
      return;
    }
    setDigits((prev) => prev.map((p, idx) => (idx === i ? clean : p)));
    setError("");
    if (clean && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const confirm = async () => {
    const token = digits.join("");
    if (token.length < LEN) return setError("أدخل الرمز كاملاً");
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (err) return setError("الرمز غير صحيح أو انتهت صلاحيته");
    finish();
  };

  const resend = async () => {
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/my-account` } });
    setSeconds(55);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button onClick={() => navigate({ to: "/login" })} className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border" aria-label="رجوع">
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">رمز التحقق</h1>
          <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            أرسلنا رمز التحقق إلى بريدك <Mail className="size-4 text-clay" />
          </p>
          <p dir="ltr" className="mt-1 text-center font-display text-base font-black text-clay">{email}</p>

          <p className="mt-6 text-sm font-bold text-cocoa">أدخل الرمز</p>
          <div dir="ltr" className="mt-2 flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
                inputMode="numeric"
                className="h-14 w-full rounded-xl bg-background text-center font-display text-2xl font-black text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
              />
            ))}
          </div>
          {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">أو اضغط على رابط الدخول في الرسالة مباشرة</p>

          <button onClick={confirm} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream disabled:opacity-70">
            {busy ? "جارٍ التحقق…" : "تأكيد الدخول"} <Check className="size-5" />
          </button>
          <button onClick={resend} disabled={seconds > 0} className="mt-3 w-full rounded-2xl bg-secondary py-3 text-sm font-bold text-clay disabled:opacity-70">
            {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "إعادة إرسال الرمز"}
          </button>
        </div>
      </div>
    </div>
  );
}
