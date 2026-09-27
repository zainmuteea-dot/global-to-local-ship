import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Phone, Mail, Lock, UserPlus, Zap, ShoppingBag, ChevronDown } from "lucide-react";
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

const YEMEN_CITIES = ["صنعاء","عدن","تعز","إب","حضرموت (المكلا/سيئون)","الحديدة","ذمار","مأرب","عمران","حجة","لحج","أبين","شبوة","المهرة","صعدة","الضالع","البيضاء","ريمة","الجوف","سقطرى"];

export function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("صنعاء");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client"|"employee">("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || fullName.trim().length < 3) { setError("يرجى إدخال الاسم الكامل (3 أحرف على الأقل)"); return; }
    if (!phone.trim()) { setError("يرجى إدخال رقم الهاتف أو الواتساب"); return; }
    if (!email.trim() ||!email.includes("@")) { setError("يرجى إدخال بريد إلكتروني صحيح"); return; }
    if (!password || password.length < 6) { setError("كلمة المرور يجب أن لا تقل عن 6 خانات"); return; }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(), password: password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), city: city, role: role } },
      });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName.trim(), phone: phone.trim() });
      }
      sessionStorage.setItem("sc_name", fullName.trim());
      sessionStorage.setItem("sc_phone", phone.trim());
      sessionStorage.setItem("sc_email", email.trim());
      sessionStorage.setItem("sc_city", city);
      sessionStorage.setItem("sc_role", role);
      navigate({ to: "/account-success" });
    } catch (err: any) { setError(err?.message || "حدث خطأ أثناء إنشاء الحساب"); }
    finally { setLoading(false); }
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-4 py-10 font-['Cairo',sans-serif] selection:bg-[#3d2314] selection:text-white">
      <div className="text-center mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3d2314] tracking-tight">السوق الشامل</h1>
        <p className="mt-2 text-sm text-[#7c6a59] font-medium">إنشاء حساب جديد للبدء بالطلب وتتبع شحناتك</p>
      </div>
      <div className="w-full max-w-[460px] bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_-5px_rgba(61,35,20,0.06)] border border-[#ede5d8]">
        <div className="flex bg-[#f5ede1] p-1.5 rounded-2xl mb-7 border border-[#e8dfd1]">
          <button type="button" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center bg-[#3d2314] text-white shadow-sm">إنشاء حساب جديد</button>
          <Link to="/login" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-[#5d4634] hover:text-[#3d2314]">تسجيل الدخول</Link>
        </div>
        {error && <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">الاسم الكامل <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: محمد علي" className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition" />
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">المدينة / المحافظة</label>
            <div className="relative">
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-12 pr-4 pl-10 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] appearance-none focus:outline-none focus:border-[#3d2314] focus:bg-white transition cursor-pointer">
                {YEMEN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">رقم الهاتف أو الواتساب <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="770000000" className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right" />
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right" />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5 mr-1">كلمة المرور <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 pr-11 pl-4 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] text-sm text-[#3d2314] placeholder-[#a89d8f] focus:outline-none focus:border-[#3d2314] focus:bg-white transition text-right" />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7663]" />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full h-13 rounded-2xl bg-[#3d2314] hover:bg-[#2b170c] text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-between px-5 py-3">
              <UserPlus className="w-4 h-4 opacity-80" />
              <span>{loading? "جارٍ إنشاء الحساب..." : "إنشاء الحساب وتفعيله فوراً"}</span>
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </button>
          </div>

          <div className="pt-3">
            <p className="text-center text-xs font-bold text-[#8a7a65] mb-3">نوع الحساب</p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => setRole("client")} className={`flex items-center gap-2 px-6 h-11 rounded-full border-2 text-sm font-bold transition-all ${role==="client"? "border-[#3d2314] bg-[#3d2314] text-white" : "border-[#e8ddd0] bg-white text-[#8a7a65]"}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${role==="client"? "bg-white" : "bg-[#d9cfc0]"}`}></span> عميل
              </button>
              <button type="button" onClick={() => setRole("employee")} className={`flex items-center gap-2 px-6 h-11 rounded-full border-2 text-sm font-bold transition-all ${role==="employee"? "border-[#3d2314] bg-[#3d2314] text-white" : "border-[#e8ddd0] bg-white text-[#8a7a65]"}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${role==="employee"? "bg-white" : "bg-[#d9cfc0]"}`}></span> موظفين
              </button>
            </div>
          </div>
        </form>
        <div className="mt-6 pt-5 border-t border-[#ede5d8] text-center">
          <Link to="/new-order" className="inline-flex items-center gap-2 text-xs font-bold text-[#8a684b] hover:text-[#3d2314] transition">
            <ShoppingBag className="w-3.5 h-3.5" /><span>طلب منتج بدون تسجيل حساب (/new-order)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
