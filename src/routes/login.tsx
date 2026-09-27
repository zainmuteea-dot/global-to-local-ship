import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ArrowLeft, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | السوق الشامل" },
      { name: "description", content: "سجل دخولك إلى حسابك في السوق الشامل لمتابعة طلباتك وشحناتك" },
    ],
  }),
  component: LoginPage,
});

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }

    setLoading(true);

    // حفظ الجلسة محلياً ونقل المستخدم للحساب
    sessionStorage.setItem("sc_email", email.trim());
    
    setTimeout(() => {
      setLoading(false);
      navigate({ to: "/my-account" });
    }, 500);
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-4 py-10 font-['Cairo',sans-serif] selection:bg-[#3d2314] selection:text-white"
    >
      {/* الترويسة العلوية */}
      <div className="text-center mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3d2314] tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
          السوق الشامل
        </h1>
        <p className="mt-2 text-sm text-[#7c6a59] font-medium">
          تسجيل الدخول إلى حسابك
        </p>
      </div>

      {/* كرت النموذج الرئيسي */}
      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
        {/* شريط التبديل العلوي: إنشاء حساب جديد على اليمين وتسجيل الدخول على اليسار */}
        <div className="flex bg-[#f5ede1] p-1.5 rounded-2xl mb-7 border border-[#e8dfd1]">
          <Link
            to="/signup"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-center text-[#5d4634] hover:text-[#3d2314]"
          >
            إنشاء حساب جديد
          </Link>
          <button
            type="button"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-center bg-[#3d2314] text-white shadow-sm"
          >
            تسجيل الدخول
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* البريد الإلكتروني */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              البريد الإلكتروني *
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-11 pl-4 py-3 text-sm text-[#3d2314] placeholder-[#a49688] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all text-right"
                required
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d] pointer-events-none" />
            </div>
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              كلمة المرور *
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-11 pl-4 py-3 text-sm text-[#3d2314] placeholder-[#a49688] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all text-right font-mono"
                required
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d] pointer-events-none" />
            </div>
          </div>

          {/* زر تسجيل الدخول */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3d2314] hover:bg-[#2c180d] active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول إلى حسابي"}</span>
              <ArrowLeft className="size-4" />
            </button>
          </div>
        </form>

        {/* فاصل سفلي */}
        <div className="my-6 border-t border-[#ede5d8]" />

        {/* طلب بدون تسجيل */}
        <div className="text-center">
          <Link
            to="/new-order"
            className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#3d2314] hover:text-[#5d4634] transition-colors"
          >
            <ShoppingBag className="size-4 text-[#8a7b6d]" />
            <span>طلب منتج بدون تسجيل حساب (/new-order)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
