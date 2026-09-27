import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account-success")({
  component: AccountSuccessPage,
});

function AccountSuccessPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("عزيزنا العميل");
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const n = session?.user?.user_metadata?.full_name || sessionStorage.getItem("sc_name");
      if (n) setUserName(n);
    });
    const t = setTimeout(() => navigate({ to: "/my-account" }), 3500);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div dir="rtl" className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#EBE3D5] p-8 text-center">
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30" />
          <div className="relative w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 p-1.5 rounded-full text-white">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> تم التحقق بنجاح
        </span>
        <h1 className="text-2xl font-black text-[#2B1E16] mb-2">أهلاً بك، {userName}!</h1>
        <p className="text-sm text-[#7D6E63] mb-8">تم إنشاء حسابك بنجاح. جاهز الآن للطلب وتتبع شحناتك.</p>
        <button onClick={() => navigate({ to: "/my-account" })} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#4A3728] to-[#8B5E3C] text-white font-bold flex items-center justify-center gap-2">
          <span>الانتقال إلى إدارة الحساب</span><ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-xs text-[#A89F91] mt-4 animate-pulse">سيتم تحويلك تلقائياً...</p>
      </div>
    </div>
  );
}
