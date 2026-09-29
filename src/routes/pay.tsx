import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pay')({
  validateSearch: (s: Record<string, string>) => ({ order: s.order ?? '' }),
  component: PayPage,
})

function PayPage() {
  const { order } = Route.useSearch()
  const [method, setMethod] = useState('')

  const methods = ['جيب','جوالي','فلوسك','حاسب','كاش','ون كاش','إيزي','موبايل موني']

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5ede0] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-center text-xl font-bold text-[#8B5E34] my-4">الدفع</h1>

        <div className="bg-white rounded-2xl p-4 shadow">
          <div className="flex justify-between mb-3">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-500">رقم الطلب</div>
              <div className="font-bold">{order || '---'}</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-sm text-gray-500">حالة الدفع</div>
              <div className="font-bold">غير مكتمل</div>
            </div>
          </div>
          <div className="flex gap-2 text-center">
            <div className="flex-1 bg-orange-50 rounded-xl p-3">
              <div className="font-bold">3,650 ري</div><div className="text-xs">الإجمالي</div>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-3">
              <div className="font-bold text-green-600">0 ري</div><div className="text-xs">المدفوع</div>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-3">
              <div className="font-bold text-red-600">3,650 ري</div><div className="text-xs">المتبقي</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow mt-4">
          <div className="font-bold mb-2">طريقة الدفع</div>
          <select value={method} onChange={e=>setMethod(e.target.value)}
            className="w-full border rounded-xl p-3">
            <option value="">اختر طريقة الدفع</option>
            {methods.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          {method && (
            <button className="w-full mt-4 bg-[#8B5E34] text-white py-3 rounded-xl font-bold">
              تأكيد الدفع عبر {method}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
