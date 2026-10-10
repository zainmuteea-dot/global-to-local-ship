import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { 
  User, 
  Lock, 
  Phone, 
  Mail, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  ShoppingBag 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | السوق الشامل AL SHAMEL SHOPPING" },
      {
        name: "description",
        content: "تسجيل الدخول إلى حسابك في السوق الشامل لمتابعة طلباتك وشحناتك الدولية.",
      },
    ],
  }),
  component: LoginPage,
});

/* =========================================================================
   1. شعار AL SHAMEL SHOPPING الأزرق والبرتقالي
   ========================================================================= */
const AlShamelLogo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <div className="relative shrink-0 drop-shadow-md" style={{ width: size, height: size }}>
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="loginBlue" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#29B6F6" />
          <stop offset="35%" stopColor="#0284C7" />
          <stop offset="70%" stopColor="#0F4C81" />
          <stop offset="100%" stopColor="#0A2540" />
        </linearGradient>
        <linearGradient id="loginOrange" x1="40" y1="60" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="30%" stopColor="#FB923C" />
          <stop offset="75%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="loginStar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path d="M 108 42 C 122 48, 140 48, 152 38" stroke="url(#loginBlue)" strokeWidth="5" strokeLinecap="round" />
      <path d="M 158 35 L 160.5 40 L 166 40.5 L 162 44 L 163.5 49.5 L 158 46.5 L 152.5 49.5 L 154 44 L 150 40.5 L 155.5 40 Z" fill="url(#loginStar)" />
      <path d="M 44 42 C 48 42, 53 43, 56 47 C 60 52, 62 60, 68 76 L 76 96" stroke="url(#loginBlue)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 68 56 L 80 56 C 84 56, 92 68, 96 74 L 122 110" stroke="url(#loginOrange)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 68 96 L 96 38 C 98 34, 102 34, 104 38 L 132 94" stroke="url(#loginBlue)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 114 56 L 148 56 C 152 56, 155 60, 153 64 L 144 86" stroke="url(#loginBlue)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 144 86 C 142 98, 126 102, 114 102 C 90 102, 80 118, 96 124 L 134 124 C 144 124, 148 116, 146 108" stroke="url(#loginOrange)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 104 38 C 120 38, 138 48, 142 66 C 144 78, 132 86, 116 88 L 94 90" stroke="url(#loginBlue)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 68 126 C 64 126, 60 128, 60 133 C 60 138, 64 140, 72 140 L 136 140 C 142 140, 146 136, 146 130" stroke="url(#loginBlue)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="82" cy="154" r="14" fill="url(#loginOrange)" />
      <circle cx="82" cy="154" r="6" fill="#FFFFFF" />
      <circle cx="128" cy="154" r="14" fill="url(#loginOrange)" />
      <circle cx="128" cy="154" r="6" fill="#FFFFFF" />
    </svg>
  </div>
);

/* رقم واتساب الإدارة بصيغة دولية دون علامة +. تأكد من الرقم قبل النشر. */
const ADMIN_WHATSAPP_NUMBER = "967773370041";

/**
 * يحوّل رقم الهاتف اليمني المحلي إلى صيغة E.164 المطلوبة من Supabase.
 * يقبل: 7XXXXXXXX، 07XXXXXXXX، 9677XXXXXXXX، +9677XXXXXXXX، 009677XXXXXXXX.
 */
function normalizePhoneE164(value: string) {
  const digitMap: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  const asciiValue = value.replace(/[٠-٩۰-۹]/g, (digit) => digitMap[digit]);
  const trimmed = asciiValue.trim();

  if (!/^[+0-9\s().-]+$/.test(trimmed)) {
    throw new Error("أدخل رقم الهاتف بالأرقام فقط، مثل 770000000.");
  }

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00967")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("967")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^7\d{8}$/.test(digits)) {
    throw new Error("أدخل رقمًا يمنيًا صحيحًا من 9 أرقام يبدأ بـ7، مثل 770000000.");
  }

  return `+967${digits}`;
}

/* =========================================================================
   2. صفحة تسجيل الدخول وإنشاء الحساب
   ========================================================================= */
export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [accountType, setAccountType] = useState<"customer" | "staff">("customer");
  const [identifier, setIdentifier] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("صنعاء");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      let user;

      if (mode === "signup") {
        const phone = normalizePhoneE164(identifier);
        const trimmedName = fullName.trim();

        if (trimmedName.length < 3) {
          throw new Error("أدخل الاسم الكامل، 3 أحرف على الأقل.");
        }
        if (password.length < 6) {
          throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
        }

        const { data, error } = await supabase.auth.signUp({
          phone,
          password,
          options: {
            data: {
              full_name: trimmedName,
              phone,
              city,
              role: "client",
            },
          },
        });

        if (error) throw error;
        if (!data.user || !data.session) {
          throw new Error(
            "تم إنشاء الحساب، لكن الدخول لم يكتمل. عطّل Confirm phone في إعدادات Supabase إذا كنت تريد الدخول دون رمز."
          );
        }

        user = data.user;
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: trimmedName,
          phone,
        });
        if (profileError) throw profileError;
      } else if (accountType === "staff") {
        const email = identifier.trim().toLowerCase();
        if (!email || !email.includes("@")) {
          throw new Error("أدخل البريد الإلكتروني للموظف.");
        }
        if (password.length < 8) {
          throw new Error("كلمة مرور الموظف يجب ألا تقل عن 8 أحرف.");
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error || !data.user) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }

        user = data.user;
        const [adminRole, staffRole] = await Promise.all([
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "staff" }),
        ]);

        if (
          adminRole.error ||
          staffRole.error ||
          !(adminRole.data || staffRole.data)
        ) {
          await supabase.auth.signOut();
          throw new Error("هذا الحساب غير مصرح له بدخول الإدارة.");
        }

        window.location.href = "/admin";
        return;
      } else {
        const phone = normalizePhoneE164(identifier);
        const { data, error } = await supabase.auth.signInWithPassword({
          phone,
          password,
        });
        if (error || !data.user) {
          throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة.");
        }
        user = data.user;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      const resolvedName =
        profile?.full_name || user.user_metadata?.full_name || fullName.trim();
      const resolvedPhone =
        profile?.phone || user.user_metadata?.phone || normalizePhoneE164(identifier);

      localStorage.setItem("alsouk_customer_logged_in", "true");
      localStorage.setItem(
        "alsouk_current_user",
        JSON.stringify({
          full_name: resolvedName,
          phone: resolvedPhone,
          user_id: user.id,
        })
      );
      localStorage.setItem("sc_phone", resolvedPhone);
      sessionStorage.setItem("sc_phone", resolvedPhone);
      if (resolvedName) {
        localStorage.setItem("sc_name", resolvedName);
        sessionStorage.setItem("sc_name", resolvedName);
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setErrorMessage(
        err?.message || "تعذر إكمال العملية. تحقق من البيانات وحاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");

    if (accountType === "customer") {
      let phone: string;
      try {
        phone = normalizePhoneE164(identifier);
      } catch (err: any) {
        setErrorMessage(err?.message || "أدخل رقم هاتفك أولًا.");
        return;
      }

      const message =
        `السلام عليكم، نسيت كلمة مرور حسابي في السوق الشامل. رقم الهاتف المسجل: ${phone}`;
      window.open(
        `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    const email = identifier.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setErrorMessage("أدخل بريد الموظف أولًا لاستعادة كلمة المرور.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);

    if (error) {
      setErrorMessage("تعذر إرسال رابط الاستعادة. تحقق من إعدادات البريد وحاول لاحقًا.");
    } else {
      setErrorMessage("إذا كان البريد مسجلًا، فسيصل إليه رابط استعادة كلمة المرور.");
    }
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans flex flex-col justify-center items-center p-4 sm:p-6"
    >
      {/* 🌟 رأس الصفحة مع الشعار الرسمي */}
      <div className="max-w-md w-full flex flex-col items-center text-center mb-6 space-y-2">
        <AlShamelLogo size={70} />
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F4C81] tracking-tight">
          السوق الشامل
        </h1>
        <p className="text-xs sm:text-sm text-[#0284C7] font-bold">
          {mode === "login" ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد وتتبع شحناتك"}
        </p>
      </div>

      {/* 🌟 بطاقة تسجيل الدخول الحديثة */}
      <div className="max-w-md w-full bg-white border border-sky-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-sky-950/5 space-y-5">
        {/* مفتاح التبديل: تسجيل الدخول | إنشاء حساب جديد */}
        <div className="flex p-1 bg-sky-50/80 rounded-2xl border border-sky-200/70">
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMessage(""); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
              mode === "login"
                ? "bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white shadow-md"
                : "text-slate-600 hover:text-[#0F4C81]"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setAccountType("customer"); setErrorMessage(""); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
              mode === "signup"
                ? "bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white shadow-md"
                : "text-slate-600 hover:text-[#0F4C81]"
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* تنبيه الخطأ */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* نموذج الإدخال */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-[11px] font-bold text-[#0F4C81] mb-1">
                الاسم الكامل *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: زين مطيع"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs text-[#0A2540] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-sky-400/20"
                />
                <User className="w-4 h-4 text-[#0284C7] absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* رقم العميل أو بريد الموظف */}
          <div>
            <label className="block text-[11px] font-bold text-[#0F4C81] mb-1">
              {mode === "login" && accountType === "staff"
                ? "البريد الإلكتروني للموظف *"
                : "رقم الهاتف المحلي *"}
            </label>
            <div className="relative">
              <input
                type={mode === "login" && accountType === "staff" ? "email" : "tel"}
                required
                placeholder={
                  mode === "login" && accountType === "staff"
                    ? "name@example.com"
                    : "770000000"
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-3 pr-10 py-3 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs font-mono text-[#0A2540] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-sky-400/20"
                dir="ltr"
                autoComplete={
                  mode === "login" && accountType === "staff" ? "username" : "tel"
                }
                aria-label={
                  mode === "login" && accountType === "staff"
                    ? "البريد الإلكتروني للموظف"
                    : "رقم الهاتف اليمني المحلي"
                }
              />
              {mode === "login" && accountType === "staff" ? (
                <Mail className="w-4 h-4 text-[#0284C7] absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : (
                <Phone className="w-4 h-4 text-[#0284C7] absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>
            {!(mode === "login" && accountType === "staff") && (
              <p className="mt-1.5 text-[10px] text-slate-500">
                أدخل الرقم المحلي مثل 770000000؛ سيُضاف مفتاح اليمن تلقائيًا.
              </p>
            )}
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-[11px] font-bold text-[#0F4C81] mb-1">
              كلمة المرور *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                minLength={mode === "signup" ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#F8FAFC] border border-sky-200 text-xs font-mono text-[#0A2540] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-sky-400/20"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-[#0284C7] absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* استعادة كلمة المرور: العميل عبر واتساب الإدارة، والموظف عبر البريد */}
          {mode === "login" && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={loading}
                className="text-xs font-bold text-[#0284C7] hover:text-[#0F4C81] hover:underline cursor-pointer disabled:opacity-50"
              >
                {accountType === "customer"
                  ? "نسيت كلمة المرور؟ تواصل مع الإدارة عبر واتساب"
                  : "نسيت كلمة المرور؟ أرسل رابطًا إلى بريد الموظف"}
              </button>
            </div>
          )}

          {/* 🌟 الزر البرتقالي الرئيسي المتطابق مع الشعار */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 ring-2 ring-orange-300/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>جارٍ تسجيل الدخول...</span>
              </>
            ) : mode === "login" ? (
              <>
                <span>تسجيل الدخول إلى حسابي</span>
                <ArrowLeft className="w-4 h-4 text-white" />
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-orange-200" />
                <span>إنشاء الحساب والدخول ⚡</span>
              </>
            )}
          </button>
        </form>

        {/* 🌟 محدد نوع الحساب (عميل / موظفين) */}
        <div className="pt-2 border-t border-sky-100 flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">نوع الحساب</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAccountType("customer")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                accountType === "customer"
                  ? "bg-[#0F4C81] text-white shadow-sm ring-2 ring-sky-300/40"
                  : "bg-white text-slate-700 border border-sky-200 hover:bg-sky-50"
              }`}
            >
              <span className={`size-2 rounded-full ${accountType === "customer" ? "bg-orange-400" : "bg-slate-300"}`} />
              <span>عميل</span>
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setAccountType("staff")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  accountType === "staff"
                    ? "bg-[#0F4C81] text-white shadow-sm ring-2 ring-sky-300/40"
                    : "bg-white text-slate-700 border border-sky-200 hover:bg-sky-50"
                }`}
              >
                <span className={`size-2 rounded-full ${accountType === "staff" ? "bg-orange-400" : "bg-slate-300"}`} />
                <span>موظفين</span>
              </button>
            )}
          </div>
        </div>

        {/* طلب بدون تسجيل حساب */}
        <div className="pt-1 flex items-center justify-center text-xs">
          <a
            href="/new-order"
            className="hover:underline text-[#0F4C81] font-bold flex items-center gap-1.5 bg-sky-50/70 px-3 py-1.5 rounded-xl border border-sky-200/50"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
            <span>طلب منتج بدون تسجيل حساب (/new-order)</span>
          </a>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500 font-medium">
        السوق الشامل — وسيطكم المعتمد للشراء من كافة المتاجر العالمية
      </div>
    </div>
  );
}

export default LoginPage;
