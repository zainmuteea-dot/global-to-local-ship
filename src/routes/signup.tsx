import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Phone, Lock, UserPlus, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب جديد — السوق الشامل" },
      { name: "description", content: "إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك في السوق الشامل" },
    ],
  }),
  component: SignupPage,
});

export function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim().replace(/\s+/g, "");

    if (!fullName.trim() || fullName.trim().length < 3) {
      setError("يرجى إدخال الاسم الكامل (3 أحرف على الأقل)");
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setError("يرجى إدخال رقم هاتف صحيح");
      return;
    }
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }

    setLoading(true);

    try {
      // توليد معرّف بريدي داخلي من رقم الهاتف لضمان تسجيل الدخول السلس بدون اشتراط بريد خارجي
      const internalEmail = `${cleanPhone}@alsouq.local`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: cleanPhone,
            role: "client",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered") || signUpError.message.includes("User already")) {
          setError("هذا الرقم مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: cleanPhone,
          role: "client",
        });
      }

      // حفظ البيانات محلياً لتعبئتها تلقائياً عند الطلب
      sessionStorage.setItem("sc_name", fullName.trim());
      sessionStorage.setItem("sc_phone", cleanPhone);
      sessionStorage.setItem("sc_role", "client");

      navigate({ to: "/account-success" });
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-4 py-10 font-['Cairo',sans-serif] selection:bg-[#3d2314] selection:text-white">
      <div className="text-center mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3d2314] tracking-tight">السوق الشامل</h1>
        <p className="mt-2 text-sm text-[#7c6a59] font-medium">إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك</p>
      </div>

      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
        {/* أزرار التبديل العلوية */}
        <div className="flex bg-[#f5ede1] p-1.5 rounded-2xl mb-7 border border-[#e8dfd1]">
          <button type="button" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center bg-[#3d2314] text-white shadow-sm">
            إنشاء حساب جديد
          </button>
          <Link to="/login" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-[#5d4634] hover:text-[#3d2314]">
            تسجيل الدخول
          </Link>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* الاسم الكامل */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: محمد علي"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition"
              />
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>

          {/* رقم الهاتف أو الواتساب */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              رقم الهاتف أو الواتساب <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="770000000"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right"
              />
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right"
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>

          {/* زر التأكيد */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-2xl bg-[#3d2314] hover:bg-[#2b170c] text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-between px-5 py-3 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 opacity-80" />
              <span>{loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب وتفعيله فوراً"}</span>
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
