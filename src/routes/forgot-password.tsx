import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("تم إرسال رابط الاستعادة إلى بريدك الإلكتروني");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f5ef] flex flex-col items-center px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-bold text-[#3b2416]">السوق الشامل</h1>
      <p className="text-[#8a7a6b] mt-2 mb-8">استعادة كلمة المرور</p>

      <div className="bg-white w-full max-w-md rounded-[28px] p-7 shadow-lg">
        <form onSubmit={handleSubmit}>
          <label className="block text-right text-sm font-semibold text-[#3b2416] mb-2">
            البريد الإلكتروني <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 pr-11 border border-[#e8ddd0] rounded-full bg-[#faf8f4] outline-none text-left"
              dir="ltr"
            />
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8a7a6b]" />
          </div>

          {error && <p className="text-red-600 text-sm mt-3 text-right">{error}</p>}
          {message && <p className="text-green-700 text-sm mt-3 text-right">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-[#3b2416] text-white rounded-full py-4 font-bold disabled:opacity-50"
          >
            {loading? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/login" className="text-sm text-[#3b2416] font-semibold underline inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" /> العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
