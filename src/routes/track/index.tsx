import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/track/")({
  component: TrackSearchPage,
});

function TrackSearchPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow max-w-md w-full text-center border">
        <h1 className="text-2xl font-black mb-4">تتبع شحنتك</h1>
        <input value={code} onChange={(e)=> setCode(e.target.value.toUpperCase())} placeholder="ALS-12345" className="border w-full rounded-full px-5 py-3 text-center font-bold" />
        <button onClick={()=> { if(code) navigate({to: "/track/$trackingCode", params: {trackingCode: code}}) }} className="w-full mt-4 bg-zinc-900 text-white py-3 rounded-full font-bold">
          تتبع الآن
        </button>
      </div>
    </div>
  );
}
