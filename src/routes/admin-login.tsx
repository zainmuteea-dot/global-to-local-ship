import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Clock3, Headset, Info, LockKeyhole, LogIn, Package, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "دخول الإدارة | السوق الشامل" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function getSafeRedirect() {
  if (typeof window === "undefined") return "/admin";
  const target = new URLSearchParams(window.location.search).get("redirect") || "/admin";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/admin";
}

function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const initialError = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") === "not-admin"
    ? "هذا الحساب لا يملك صلاحية مدير. استخدم حسابًا مخولًا للإدارة."
    : "";
  const [error, setError] = useState(initialError);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const login = identifier.trim();
    if (!login || !password) {
      setError("أدخل رقم الهاتف أو البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setBusy(true);
    try {
      const isEmail = login.includes("@");
      const emailCandidates = isEmail ? [login] : [`${login}@alsouq.local`, `${login}@alsouk.local`];
      let signedInUser = null;
      let lastError: Error | null = null;

      for (const email of emailCandidates) {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (!result.error && result.data.user) {
          signedInUser = result.data.user;
          break;
        }
        lastError = result.error;
      }

      if (!signedInUser) {
        throw lastError || new Error("تعذر تسجيل الدخول.");
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: signedInUser.id,
        _role: "admin",
      });

      if (roleError || isAdmin !== true) {
        await supabase.auth.signOut();
        setError("تم التحقق من الحساب، لكنه لا يملك صلاحية مدير النظام.");
        return;
      }

      if (!remember) {
        setMessage("تم التحقق. ملاحظة: تذكّر الجلسة يعتمد على إعدادات جلسات Supabase للمشروع.");
      }
      window.location.replace(getSafeRedirect());
    } catch (cause) {
      console.error("Admin login failed:", cause);
      setError("تعذر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#fff1dd_0%,#f5e2c8_48%,#eed8ba_100%)] px-4 py-8 text-[#201A17] sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-white/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-[#C87443]/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/60 bg-white/35 shadow-[0_24px_80px_rgba(92,55,30,0.16)] backdrop-blur-xl lg:grid-cols-2">
        <section className="order-2 flex flex-col justify-center bg-white/85 p-6 sm:p-9 lg:order-1 lg:p-10" aria-labelledby="admin-login-title">
          <div className="mb-7 flex items-center justify-between gap-3 border-b border-[#ead8c8] pb-4">
            <div>
              <h1 id="admin-login-title" className="text-2xl font-black tracking-tight sm:text-3xl">تسجيل الدخول</h1>
              <p className="mt-1 text-xs text-[#76685d]">أدخل بيانات حساب الإدارة</p>
            </div>
            <span className="rounded-full bg-[#f6ede5] px-3 py-1.5 text-[11px] font-bold text-[#77513b]">نسخة ويب آمنة</span>
          </div>

          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold leading-6 text-red-800">{error}</div>}
          {message && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold leading-5 text-amber-900">{message}</div>}

          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="admin-identifier" className="mb-2 block text-xs font-black text-[#302820]">رقم الهاتف أو البريد الإلكتروني</label>
              <input
                id="admin-identifier"
                name="username"
                type="text"
                inputMode="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="مثال: 7xxxxxxxx أو name@example.com"
                className="min-h-12 w-full rounded-2xl border border-[#dfd8d2] bg-white px-4 text-sm outline-none transition placeholder:text-[#9b918a] focus:border-[#9a4724] focus:ring-4 focus:ring-[#9a4724]/10"
                required
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="admin-password" className="text-xs font-black text-[#302820]">كلمة المرور</label>
                <span className="text-[11px] text-[#76685d]">حافظ عليها سرية</span>
              </div>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="أدخل كلمة المرور"
                className="min-h-12 w-full rounded-2xl border border-[#dfd8d2] bg-white px-4 text-sm outline-none transition placeholder:text-[#9b918a] focus:border-[#9a4724] focus:ring-4 focus:ring-[#9a4724]/10"
                required
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-[#65584d]">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-[#873512]" />
              ابقني مسجلًا على هذا الجهاز
            </label>

            <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#873512] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#873512]/15 transition hover:bg-[#70290d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#873512]/25 disabled:cursor-wait disabled:opacity-60">
              {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <LogIn className="size-4" />}
              <span>{busy ? "جارٍ التحقق…" : "دخول الإدارة"}</span>
            </button>
          </form>
          <p className="mt-5 text-center text-[11px] leading-5 text-[#8b7d71]">يُسمح بالدخول للحسابات التي تحمل دور المدير في قاعدة البيانات فقط.</p>
        </section>

        <section className="order-1 flex flex-col justify-center p-6 sm:p-9 lg:order-2 lg:p-10" aria-labelledby="admin-welcome-title">
          <div className="mb-8 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-xs font-black shadow-sm"><span className="grid size-7 place-items-center rounded-full bg-[#873512] text-white"><Package className="size-4" /></span>السوق الشامل</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/50 px-3 py-2 text-[11px] font-bold text-[#6f5140]"><ShieldCheck className="size-4 text-[#873512]" />دخول آمن</span>
          </div>

          <h2 id="admin-welcome-title" className="text-3xl font-black tracking-tight sm:text-4xl">مرحبًا بك</h2>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#6d5d51]">سجّل دخولك للوصول إلى لوحة العمل، ومتابعة الطلبات والعمليات الإدارية بشكل آمن.</p>

          <div className="mt-6 space-y-2.5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 py-3"><span className="flex items-center gap-2 text-sm font-bold"><Clock3 className="size-4 text-[#873512]" />دخول سريع</span><span className="text-[11px] text-[#76685d]">خطوات قليلة</span></div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 py-3"><span className="flex items-center gap-2 text-sm font-bold"><LockKeyhole className="size-4 text-[#873512]" />حماية الحساب</span><span className="text-[11px] text-[#76685d]">تحقق من الصلاحية</span></div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 py-3"><span className="flex items-center gap-2 text-sm font-bold"><Headset className="size-4 text-[#873512]" />دعم الإدارة</span><span className="text-[11px] text-[#76685d]">عند الحاجة</span></div>
          </div>

          <div className="mt-5 flex items-start gap-2 self-center rounded-full border border-white/80 bg-white/60 px-4 py-2.5 text-[10px] font-bold leading-5 text-[#76685d] sm:text-[11px]"><Info className="mt-0.5 size-3.5 shrink-0 text-[#873512]" />تأكد من إدخال البيانات بشكل صحيح</div>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-[#8b7d71]"><Zap className="size-3.5 text-[#873512]" /> بوابة دخول مخصصة للإدارة</div>
        </section>
      </div>
    </main>
  );
}
