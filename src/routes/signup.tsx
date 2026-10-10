import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { User, Phone, Lock, UserPlus, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب جديد — السوق الشامل" },
      {
        name: "description",
        content: "إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك في السوق الشامل",
      },
    ],
  }),
  component: SignupPage,
});

/**
 * يحوّل رقم الهاتف اليمني المحلي إلى E.164 الذي يتطلبه Supabase.
 * أمثلة مدعومة: 7XXXXXXXX، 07XXXXXXXX، 9677XXXXXXXX، +9677XXXXXXXX، 009677XXXXXXXX.
 */
function normalizeYemenPhone(value: string): string {
  const digitMap: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };

  const asciiValue = value.replace(/[٠-٩۰-۹]/g, (digit) => digitMap[digit]);
  if (!/^[+0-9\s().-]+$/.test(asciiValue.trim())) {
    throw new Error("أدخل رقم الهاتف بالأرقام فقط، مثل 7XXXXXXXX.");
  }

  let digits = asciiValue.replace(/\D/g, "");
  if (digits.startsWith("00967")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("967")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^7\d{8}$/.test(digits)) {
    throw new Error("أدخل رقمًا يمنيًا صحيحًا من 9 أرقام يبدأ بـ7، مثل 7XXXXXXXX.");
  }

  return `+967${digits}`;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 3) {
      setError("يرجى إدخال الاسم الكامل (3 أحرف على الأقل).");
      return;
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeYemenPhone(phone);
    } catch (phoneError) {
      setError(phoneError instanceof Error ? phoneError.message : "تحقق من رقم الهاتف.");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 خانات.");
      return;
    }

    setLoading(true);

    try {
      // التسجيل برقم الهاتف مباشرة، دون إنشاء بريد إلكتروني وهمي.
      const { data, error: signUpError } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          data: {
            full_name: trimmedName,
            phone: normalizedPhone,
            role: "client",
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        const errorCode = String(signUpError.code ?? "").toLowerCase();

        if (
          errorCode === "phone_provider_disabled" ||
          message.includes("phone signups are disabled") ||
          message.includes("phone signup is disabled") ||
          message.includes("phone provider is disabled") ||
          (message.includes("phone") && message.includes("disabled"))
        ) {
          throw new Error(
            "تسجيل الهاتف معطّل في مشروع Supabase المتصل بالتطبيق. من لوحة Supabase افتح Authentication → Sign In / Providers، فعّل Phone، واحفظ الإعدادات."
          );
        }

        if (
          errorCode === "signup_disabled" ||
          message.includes("signups are disabled") ||
          message.includes("sign ups are disabled")
        ) {
          throw new Error(
            "تسجيل المستخدمين الجدد معطّل في مشروع Supabase. فعّل Allow new users to sign up من إعدادات المصادقة ثم أعد المحاولة."
          );
        }

        if (
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("user already")
        ) {
          throw new Error(
            "هذا الرقم مسجل مسبقًا. سجّل الدخول أو تواصل مع الإدارة لاستعادة الحساب."
          );
        }

        throw signUpError;
      }

      if (!data.user) {
        throw new Error("لم يكتمل إنشاء الحساب. تحقق من إعدادات Supabase وحاول مجددًا.");
      }

      // يلزم تعطيل تأكيد الهاتف في Supabase حتى ينشأ تسجيل دخول فوري بلا رمز.
      if (!data.session) {
        setError(
          "تم إنشاء الحساب، لكن لم يتم تسجيل الدخول تلقائيًا. عطّل تأكيد الهاتف (Confirm phone) في إعدادات Supabase ثم أعد المحاولة أو سجّل الدخول."
        );
        return;
      }

      // تُحفَظ بيانات الملف أيضًا عبر trigger المستخدم عند إنشاء الحساب؛ هذا upsert يحدّث الاسم والهاتف.
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: trimmedName,
        phone: normalizedPhone,
      });
      if (profileError) {
        // لا نوقف الدخول: بيانات الاسم والهاتف موجودة كذلك في user_metadata.
        console.error("تعذر تحديث ملف العميل:", profileError.message);
      }

      sessionStorage.setItem("sc_name", trimmedName);
      sessionStorage.setItem("sc_phone", normalizedPhone);
      sessionStorage.setItem("sc_role", "client");
      localStorage.setItem("sc_name", trimmedName);
      localStorage.setItem("sc_phone", normalizedPhone);
      localStorage.setItem("sc_role", "client");

      navigate({ to: "/account-success" });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى."
      );
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
          إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك
        </p>
      </div>

      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
        <div className="flex bg-[#f5ede1] p-1.5 rounded-2xl mb-7 border border-[#e8dfd1]">
          <button
            type="button"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center bg-[#3d2314] text-white shadow-sm"
          >
            إنشاء حساب جديد
          </button>
          <Link
            to="/login"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-[#5d4634] hover:text-[#3d2314]"
          >
            تسجيل الدخول
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                minLength={3}
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="مثال: محمد علي"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition"
              />
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel-national"
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="7XXXXXXXX"
                aria-describedby="phone-help"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right"
              />
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
            <p id="phone-help" className="mt-1.5 mr-1 text-[11px] text-[#8a7663]">
              أدخل الرقم المحلي من 9 أرقام، مثل 7XXXXXXXX. سنضيف مفتاح اليمن تلقائيًا.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              className="w-full h-13 rounded-2xl bg-[#3d2314] hover:bg-[#2b170c] text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-between px-5 py-3 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 opacity-80" />
              <span>{loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب وتفعيله فورًا"}</span>
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
