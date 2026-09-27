import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#fdf6e9] pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to="/request" className="bg-white border rounded-full px-4 py-2 text-sm font-bold shadow">
          اطلب الآن
        </Link>
        <div className="flex gap-3">
          <button className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">🔔</button>
          <Link to="/my-account" className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">👤</Link>
        </div>
      </div>

      {/* Main Brown Card */}
      <div className="mx-4 bg-[#5a3418] rounded-[2rem] p-6 text-center text-[#f5d78e]">
        <div className="text-xs mb-1">◆◆◆◆◆</div>
        <h1 className="text-2xl font-extrabold mb-6">السوق الشامل</h1>

        <div className="flex justify-center gap-6 mb-8">
          <Link to="/my-account" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 border border-[#f5d78e] rounded-full flex items-center justify-center text-xl">👤</div>
            <span className="text-sm">التسجيل</span>
          </Link>
          <Link to="/request" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 border border-[#f5d78e] rounded-full flex items-center justify-center text-xl">👋</div>
            <span className="text-sm">الطلب</span>
          </Link>
          <Link to="/shipments" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 border border-[#f5d78e] rounded-full flex items-center justify-center text-xl">📄</div>
            <span className="text-sm">الشحن</span>
          </Link>
        </div>

        <div className="mx-auto w-32 h-32 bg-white/10 border-2 border-white/20 rounded-3xl flex items-center justify-center mb-6">
          <div className="w-10 h-10 bg-[#f5d78e] rounded-full flex items-center justify-center text-[#5a3418]">▶</div>
        </div>

        <h2 className="text-3xl font-extrabold mb-4">كيف تطلب؟؟</h2>
        <Link to="/how-to-order" className="inline-flex items-center gap-2 bg-[#d4a24e] text-[#5a3418] font-bold px-6 py-3 rounded-full">
          👋 اضغط هنا
        </Link>
      </div>

      {/* Bottom Section */}
      <div className="p-6">
        <h2 className="text-3xl font-extrabold mb-2">تسوّق عالمياً، واستلم</h2>
        <p className="text-gray-600">اطلب من أي مكان في العالم وتوصله لباب</p>
      </div>
    </div>
  )
}
