import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Mail, Phone, UserRound } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — السوق الشامل" },
      { name: "description", content: "سجّل دخولك ببريدك الإلكتروني لمتابعة طلباتك في السوق الشامل." },
      { property: "og:title", content: "تسجيل الدخول — السوق الشامل" },
      { property: "og:description", content: "سجّل دخولك ببريدك الإلكتروني لمتابعة طلباتك في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("أدخل بريد إلكتروني صحيح").max(255),
  name: z.string().trim().max(100),
  phone: z.string().regex(/^\d{0}$|^\d{9}$/, "رقم الجوال 9 أرقام"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/my-account" });
    });
  }, [navigate]);

  const submit = async () => {
    const parsed = schema.safeParse({ email, name, phone: phone.replace(/\D/g, "") });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    const p = parsed.data;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: p.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/my-account`,
        data: { full_name: p.name || null, phone: p.phone ? `+967 ${p.phone}` : null },
      },
    });
    setBusy(false);
    if (err) return setError("تعذر إرسال الرمز، حاول بعد قليل");
    sessionStorage.setItem("sc_email", p.email);
    sessionStorage.setItem("sc_name", p.name);
    sessionStorage.setItem("sc_phone", p.phone ? `+967 ${p.phone}` : "");
    navigate({ to: "/verify" });
  };

  const field = "w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa";

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button onClick={() => navigate({ to: "/" })} className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border" aria-label="رجوع">
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">تسجيل الدخول</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">أدخل بريدك لنرسل لك رمز التحقق</p>

          <label className="mt-6 flex items-center gap-1.5 text-sm font-bold text-cocoa"><Mail className="size-4" /> البريد الإلكتروني</label>
          <input dir="ltr" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="name@example.com" className={`mt-2 ${field}`} />

          <label className="mt-4 flex items-center gap-1.5 text-sm font-bold text-cocoa"><UserRound className="size-4" /> الاسم <span className="text-[11px] font-normal text-muted-foreground">(للحساب الجديد)</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك الكامل" className={`mt-2 ${field}`} />

          <label className="mt-4 flex items-center gap-1.5 text-sm font-bold text-cocoa"><Phone className="size-4" /> رقم الجوال <span className="text-[11px] font-normal text-muted-foreground">(اختياري)</span></label>
          <div className="mt-2 flex items-stretch gap-2">
            <span className="grid shrink-0 place-items-center rounded-2xl bg-secondary px-3 text-xs font-bold text-clay">+967</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="7XXXXXXXX" className={`${field} tracking-widest`} />
          </div>
          {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}

          <button onClick={submit} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream disabled:opacity-70">
            {busy ? "جارٍ الإرسال…" : "إرسال الرمز"} <ArrowRight className="size-5" />
          </button>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            باستمرارك فإنك توافق على
            <br />
            <Link to="/terms" className="font-bold text-cocoa">شروط الاستخدام</Link> و<Link to="/privacy" className="font-bold text-cocoa">سياسة الخصوصية</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
