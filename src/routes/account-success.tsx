import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/account-success")({
  component: SuccessPage,
});

function SuccessPage() {
  const navigate = useNavigate();
  const name = typeof window!== "undefined"? sessionStorage.getItem("sc_name") || "" : "";

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#f1e8d0] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] bg-[#fdf8ec] p-10 text-center shadow-sm ring-1 ring-black/10">
        <div className="mx-auto mb-6 grid size-24 place-items-center rounded-full bg-yellow-100 text-6xl">🎉</div>
        <h1 className="text-3xl font-black text-[#4b2e1f]">مبروك!</h1>
        <p className="mt-3 text-xl font-bold text-[#4b2e1f]">تم انشاء حسابك بنجاح في السوق الشامل</p>
        {name && <p className="mt-2 text-gray-600">أهلاً بك يا {name} 🥳</p>}
        <button onClick={()=>navigate({to:"/my-account"})} className="mt-8 w-full rounded-full bg-[#4b2e1f] py-4 text-lg font-bold text-white">
          ابدأ التسوق الآن
        </button>
      </div>
    </div>
  );
}
