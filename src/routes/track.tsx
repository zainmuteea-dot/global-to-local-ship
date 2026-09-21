import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package } from "lucide-react";

export const Route = createFileRoute("/track")({
  component: TrackSearchPage,
});

function TrackSearchPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-[2rem] shadow-lg max-w-md w-full text-center border">
        <Package size={60} className="mx-auto text-orange-500 mb-4" />
        <h1 className="text-2xl font-black mb-2">تتبع شحنتك الخاصة</h1>
        <p className="text-zinc-500 mb-6 text-sm">ادخل كود التتبع مثل ALS-12345</p>
        <input
          value={code}
          onChange={(e)=> setCode(e.target.value.toUpperCase())}
          placeholder="ALS-12345"
          className="flex-1 border border-zinc-200 rounded-full px-5 py-3 text-center font-bold tracking-widest w-full"
        />
        <button
          onClick={()=> { if(code) navigate({to: "/track/$trackingCode", params: {trackingCode: code}}) }}
          className="w-full mt-4 bg-zinc-900 text-white py-3 rounded-full font-bold flex items-center justify-center gap-2"
        >
          <Search size={18}/> تتبع الآن
        </button>
      </div>
    </div>
  );
}
