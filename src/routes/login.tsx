import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ArrowLeft, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("sc_email", email.trim());
      navigate({ to: "/my-account" });
    } catch (err: any) {
      setError("تعذر تسجيل الدخول، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-4 py-10 font-['Cairo',sans-serif] selection:bg-[#3d2314] selection:text-white"
    >
      <div className="text-center mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3d2314] tracking-tight">
          السوق الشامل
        </h1>
        <p className="mt-2 text-sm text-[#7c6a59] font-medium">
          تسجيل الدخول إلى حسابك
        </p>
      </div>

      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
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
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right"
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right"
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-2xl bg-[#3d2314] hover:bg-[#2b170c] text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 px-5"
            >
              <span>{loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول إلى حسابي"}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-[#ede5d8] text-center">
          <Link
            to="/new-order"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#8a684b] hover:text-[#3d2314] transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>طلب منتج بدون تسجيل حساب (/new-order)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
