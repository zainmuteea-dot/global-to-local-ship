import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Phone, Mail, Lock, UserPlus, Zap, ShoppingBag, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب جديد — السوق الشامل" },
      { name: "description", content: "إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك في السوق الشامل" },
      { property: "og:title", content: "إنشاء حساب جديد — السوق الشامل" },
      { property: "og:description", content: "إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك في السوق الشامل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

const YEMEN_CITIES = [
  "صنعاء",
  "عدن",
  "تعز",
  "إب",
  "حضرموت (المكلا/سيئون)",
  "الحديدة",
  "ذمار",
  "مأرب",
  "عمران",
  "حجة",
  "لحج",
  "أبين",
  "شبوة",
  "المهرة",
  "صعدة",
];

function SignupPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("صنعاء");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: "signup" | "login") => {
    setActiveTab(tab);
    if (tab === "login") {
      navigate({ to: "/login" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 3) {
      setError("يرجى إدخال الاسم الكامل (3 أحرف على الأقل)");
      return;
    }
    if (!phone.trim()) {
      setError("يرجى إدخال رقم الهاتف أو الواتساب");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }

    setLoading(true);

    // حفظ البيانات محلياً للجلسة
    const userData = {
      fullName: fullName.trim(),
      city,
      phone: phone.trim(),
      email: email.trim(),
    };

    sessionStorage.setItem("sc_name", userData.fullName);
    sessionStorage.setItem("sc_phone", userData.phone);
    sessionStorage.setItem("sc_email", userData.email);
    sessionStorage.setItem("sc_city", userData.city);
    localStorage.setItem("user", JSON.stringify(userData));

    setTimeout(() => {
      setLoading(false);
      navigate({ to: "/account-success" });
    }, 600);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-4 py-10 font-['Cairo',sans-serif] selection:bg-[#3d2314] selection:text-white">
      {/* الترويسة العلوية */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3d2314] tracking-tight">
          السوق الشامل
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#7c6a59] font-medium">
          إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك
        </p>
      </div>

      {/* كرت النموذج الرئيسي */}
      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
        
        {/* شريط التبديل العلوي */}
        <div className="flex bg-[#f5ede1] p-1.5 rounded-2xl mb-7">
          <button
            type="button"
            onClick={() => handleTabChange("login")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-center ${
              activeTab === "login"
                ? "bg-[#3d2314] text-white shadow-sm"
                : "text-[#5d4634] hover:text-[#3d2314]"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("signup")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-center ${
              activeTab === "signup"
                ? "bg-[#3d2314] text-white shadow-sm"
                : "text-[#5d4634] hover:text-[#3d2314]"
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* الاسم الكامل */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              الاسم الكامل *
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد عبد الله"
                className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-4 pl-11 py-3 text-sm text-[#3d2314] placeholder-[#a49688] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all"
                required
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d]" />
            </div>
          </div>

          {/* صف رقم الهاتف والمدينة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* المدينة */}
            <div>
              <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
                المدينة *
              </label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-4 pl-10 py-3 text-sm text-[#3d2314] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all appearance-none cursor-pointer font-medium"
                >
                  {YEMEN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d] pointer-events-none" />
              </div>
            </div>

            {/* رقم الهاتف / واتساب */}
            <div>
              <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
                رقم الهاتف / واتساب *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="77000000"
                  className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-4 pl-11 py-3 text-sm text-[#3d2314] placeholder-[#a49688] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all text-right"
                  required
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d]" />
              </div>
            </div>
          </div>

          {/* البريد الإلكتروني */}
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">
              البريد الإلكتروني *
            </label>
            <div className="relative">
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-4 pl-11 py-3 text-sm text-[#3d2314] placeholder-[#a49688] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all text-right"
                required
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d]" />
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
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#fbf9f5] border border-[#e8dfd1] rounded-2xl pr-4 pl-11 py-3 text-sm text-[#3d2314] placeholder-[#a49688] outline-none focus:border-[#3d2314] focus:ring-1 focus:ring-[#3d2314] transition-all text-right"
                required
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7b6d]" />
            </div>
          </div>

          {/* زر إنشاء الحساب */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3d2314] hover:bg-[#2c180d] active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <Zap className="size-4 fill-amber-400 text-amber-400" />
              <span>{loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب وتفعيله فوراً"}</span>
              <UserPlus className="size-4 mr-0.5" />
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
