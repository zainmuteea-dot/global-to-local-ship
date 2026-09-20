import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/login")({
  component: Login,
})

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#fdf8f0] flex items-center justify-center p-6">
      <div className="bg-white rounded-[24px] shadow-xl p-8 w-full max-w-md border">
        <h1 className="text-2xl font-black text-center mb-2">تسجيل الدخول</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">ادخل حسابك للمتابعة</p>

        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full border-2 border-gray-200 rounded-2xl p-4 mb-3 outline-none focus:border-black" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full border-2 border-gray-200 rounded-2xl p-4 mb-4 outline-none focus:border-black" />

        <button onClick={()=>{
          localStorage.setItem("user", email)
          const link = localStorage.getItem("order_link") || ""
          if(link) { alert("تم حفظ طلبك: " + link + " - سيتم التواصل معك") }
          navigate({to: "/"})
        }} className="w-full bg-[#4a2c1a] text-white rounded-2xl py-4 font-bold text-lg">دخول</button>

        <p className="text-center text-sm mt-4 text-gray-500">ليس لديك حساب؟ التسجيل تلقائي عند الدخول</p>
      </div>
    </div>
  )
}
