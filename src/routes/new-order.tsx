import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/new-order")({
  component: NewOrder,
})

function NewOrder() {
  const [link, setLink] = useState("")
  const navigate = useNavigate()
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#fdf8f0] flex items-center justify-center p-6">
      <div className="bg-white rounded-[24px] shadow-xl p-8 w-full max-w-lg border">
        <h1 className="text-2xl font-black text-center mb-2 text-[#4a2c1a]">اطلب منتجك الآن</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">الصق رابط المنتج من شي إن، ترنديول، علي اكسبرس...</p>
        <input value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..." className="w-full border-2 border-gray-200 rounded-2xl p-4 mb-4 focus:border-black outline-none" />
        <button onClick={()=>{ if(!link) return alert("الصق الرابط أولاً"); localStorage.setItem("order_link", link); navigate({to: "/login"}) }} className="w-full bg-[#4a2c1a] text-white rounded-2xl py-4 font-bold text-lg">متابعة لتسجيل الدخول</button>
      </div>
    </div>
  )
}
