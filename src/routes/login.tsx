import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleCreate = () => {
    if (!email.trim() ||!name.trim()) return;
    sessionStorage.setItem("sc_email", email.trim());
    sessionStorage.setItem("sc_name", name.trim());
    sessionStorage.setItem("sc_phone", phone.trim());
    navigate({ to: "/account-success" });
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#f1e8d0] px-4 py-6 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="w-10" />
          <h1 className="font-display text-3xl font-black text-[#4b2e1f]">السوق الشامل</h1>
          <button onClick={() => window.history.back()} className="grid size-10 place-items-center rounded-full bg-white/50 ring-1 ring-black/10">←</button>
        </div>

        <div className="rounded-[28px] bg-[#fdf8ec] p-6 shadow-sm ring-1 ring-black/10">
          <h2 className="text-center font-display text-2xl font-black text-[#4b2e1f]">تسجيل الدخول</h2>
          <p className="mt-1 text-center text-sm text-[#4b2e1f]/60">أدخل بريدك لإنشاء حسابك</p>

          <div className="mt-6">
            <label className="mb-2 flex items-center justify-end gap-1 text-sm font-bold text-[#4b2e1f]">البريد الإلكتروني <span>✉️</span></label>
            <input dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-full bg-[#f1e8d0] px-5 py-3.5 text-left outline-none ring-1 ring-black/5" />
          </div>

          <div className="mt-4">
            <label className="mb-2 flex items-center justify-end gap-1 text-sm font-bold text-[#4b2e1f]">الاسم <span>👤</span></label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسمك الكامل" className="w-full rounded-full bg-[#f1e8d0] px-5 py-3.5 text-right outline-none ring-1 ring-black/5" />
          </div>

          <div className="mt-4">
            <label className="mb-2 flex items-center justify-end gap-1 text-sm font-bold text-[#4b2e1f]">رقم الجوال <span className="text-xs font-normal">(اختياري)</span> <span>📞</span></label>
            <div className="flex gap-2" dir="rtl">
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXXXXX" className="flex-1 rounded-full bg-[#f1e8d0] px-5 py-3.5 text-right outline-none ring-1 ring-black/5" />
              <span className="grid w-16 place-items-center rounded-full bg-[#f1e8d0] text-sm font-bold text-[#a68b6b] ring-1 ring-black/5">+967</span>
            </div>
          </div>

          <button onClick={handleCreate} className="mt-6 w-full rounded-full bg-[#4b2e1f] py-4 font-display text-lg font-bold text-white">
            إنشاء حسابك ←
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-[#4b2e1f]/50">باستمرارك فأنت توافق على<br/><span className="font-bold text-[#4b2e1f]">شروط الاستخدام وسياسة الخصوصية</span></p>
        </div>
      </div>
    </div>
  );
}
