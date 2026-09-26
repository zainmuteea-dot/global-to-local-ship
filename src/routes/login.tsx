import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) return alert("أدخل الاسم والإيميل");
    sessionStorage.setItem("sc_name", name.trim());
    sessionStorage.setItem("sc_email", email.trim());
    setShowSuccess(true);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h1 className="font-display text-2xl font-black text-cocoadeep text-center">إنشاء حساب</h1>
          
          <label className="mt-6 block text-sm font-bold">الاسم الكامل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: محمد أحمد" className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa" />

          <label className="mt-4 block text-sm font-bold">البريد الإلكتروني</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@mail.com" className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa" />

          <button onClick={handleCreate} className="mt-6 w-full rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream">
            إنشاء حسابك
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-green-100 text-3xl">✅</div>
            <h2 className="font-display text-xl font-black text-cocoadeep">تم انشاء حسابك بنجاح</h2>
            <p className="mt-2 text-sm text-gray-500">أهلاً {name}!</p>
            <button onClick={() => navigate({ to: "/my-account" })} className="mt-6 w-full rounded-2xl bg-cocoa py-3.5 font-bold text-white">
              موافق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
