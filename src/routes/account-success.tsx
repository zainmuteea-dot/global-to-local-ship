import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/account-success")({
  component: SuccessPage,
});

function SuccessPage() {
  const navigate = useNavigate();
  const name = typeof window!== "undefined"? sessionStorage.getItem("sc_name") || "" : "";

  useEffect(() => {
    const t = setTimeout(() => {
      navigate({ to: "/my-account" });
    }, 4000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#f1e8d0] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] bg-[#fdf8ec] p-8 text-center shadow-sm ring-1 ring-black/10">
        {name && <h2 className="mb-4 text-xl font-black text-[#4b2e1f]">أهلاً بك يا {name} 🥳</h2>}

        <div className="mx-auto mb-6 grid size-24 place-items-center rounded-full bg-yellow-100 text-6xl animate-bounce">🎉</div>

        <h1 className="text-3xl font-black text-[#4b2e1f]">مبروك!</h1>
        <p className="mt-3 text-xl font-bold text-[#4b2e1f]">تم انشاء حسابك بنجاح في السوق الشامل</p>

        <button onClick={()=>navigate({to:"/my-account"})} className="mt-8 w-full rounded-full bg-[#4b2e1f] py-4 text-lg font-bold text-white hover:opacity-90">
          انتقل الى ادارة الحساب
        </button>
        <p className="mt-3 text-xs text-gray-500">جاري تحويلك تلقائياً...</p>
      </div>
    </div>
  );
}
