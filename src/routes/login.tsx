import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Phone, Lock, ArrowLeft, ShoppingBag } from "lucide-react";
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
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"client" | "employee">("client");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkExistingLogin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          const savedRole = profile?.role || localStorage.getItem("sc_role") || "client";

          if (savedRole === "employee" || savedRole === "admin") {
            navigate({ to: "/admin", replace: true });
          } else {
            navigate({ to: "/my-account", replace: true });
          }
          return;
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    }

    checkExistingLogin();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputVal = phoneOrEmail.trim().replace(/\s+/g, "");
    if (!inputVal) {
      setError("يرجى إدخال رقم الهاتف");
      return;
    }
    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);

    try {
      // إذا كان الإدخال يحتوي @ يبقى بريداً، وإذا كان رقماً يحوّل لصيغة الدخول
      const loginEmail = inputVal.includes("@") ? inputVal : `${inputVal}@alsouq.local`;

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (signInError) {
        setError("رقم الهاتف أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      // قراءة بيانات المستخدم وصلاحيته
      const user = authData?.user;
      let userRole = accountType;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, phone")
          .eq("id", user.id)
          .single();

        if (profile?.role) {
          userRole = profile.role as "client" | "employee";
        }
        if (profile?.full_name) sessionStorage.setItem("sc_name", profile.full_name);
        if (profile?.phone) sessionStorage.setItem("sc_phone", profile.phone);
      }

      localStorage.setItem("sc_role", userRole);

      // التوجيه بحسب نوع الحساب المختار أو صلاحيته
      if (accountType === "employee" || userRole === "employee" || userRole === "admin") {
        navigate({ to: "/admin", replace: true });
      } else {
        navigate({ to: "/my-account", replace: true });
      }
    } catch (err: any) {
      setError("تعذر تسجيل الدخول، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center font-['Cairo',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#3d2314] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[#3d2314]">جارٍ التحقق من تسجيل الدخول...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-4 py-10 font-['Cairo',sans-serif] selection:bg-[#3d2314] selection:text-white">
      <div className="text-center mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3d2314] tracking-tight">السوق الشامل</h1>
        <p className="mt-2 text-sm text-[#7c6a59] font-medium">تسجيل الدخول إلى حسابك</p>
      </div>

      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
        {/* أزرار التبديل */}
        <div className="flex bg-[#f5ede1] p-1.5 rounded-2xl mb-7 border border-[#e8dfd1]">
          <Link to="/signup" className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-center text-[#5d4634] hover:text-[#3d2314]">
            إنشاء حساب جديد
          </Link>
          <button type="button" className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-center bg-[#3d2314] text-white shadow-sm">
            تسجيل الدخول
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* رقم الهاتف */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              رقم الهاتف أو الواتساب <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
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

          <div className="text-left mt-2 -mb-1 ml-1">
            <Link to="/forgot-password" className="text-[12px] font-bold text-[#3d2314] underline hover:opacity-70 transition">
              هل نسيت كلمة السر
            </Link>
          </div>

          {/* زر تسجيل الدخول */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-2xl bg-[#3d2314] hover:bg-[#2b170c] text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 px-5 py-3 cursor-pointer"
            >
              <span>{loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول إلى حسابي"}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* تحديد نوع الحساب: عميل أو موظف */}
          <div className="pt-3">
            <p className="text-center text-xs font-bold text-[#8a7a65] mb-2.5">نوع الحساب</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setAccountType("client")}
                className={`flex items-center gap-2 px-6 h-10 rounded-full border-2 text-xs font-bold transition-all cursor-pointer ${
                  accountType === "client"
                    ? "border-[#3d2314] bg-[#3d2314] text-white shadow-sm"
                    : "border-[#e8ddd0] bg-white text-[#8a7a65] hover:border-[#cfc1af]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${accountType === "client" ? "bg-white" : "bg-[#d9cfc0]"}`} />
                عميل
              </button>
              <button
                type="button"
                onClick={() => setAccountType("employee")}
                className={`flex items-center gap-2 px-6 h-10 rounded-full border-2 text-xs font-bold transition-all cursor-pointer ${
                  accountType === "employee"
                    ? "border-[#3d2314] bg-[#3d2314] text-white shadow-sm"
                    : "border-[#e8ddd0] bg-white text-[#8a7a65] hover:border-[#cfc1af]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${accountType === "employee" ? "bg-white" : "bg-[#d9cfc0]"}`} />
                موظفين
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-[#ede5d8] text-center">
          <Link to="/new-order" className="inline-flex items-center gap-2 text-xs font-bold text-[#8a684b] hover:text-[#3d2314] transition">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>طلب منتج بدون تسجيل حساب (/new-order)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
