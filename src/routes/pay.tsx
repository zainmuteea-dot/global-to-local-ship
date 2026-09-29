import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/pay')({
  validateSearch: (s: Record<string, string>) => ({ order: s.order?? '' }),
  component: PayPage,
})

function PayPage() {
  const { order } = Route.useSearch()
  const [method, setMethod] = useState('')
  const [customerName, setCustomerName] = useState('Motaz Maqsood')
  const [phone, setPhone] = useState('773370041')

  useEffect(() => {
    if (!order) return
    supabase.from('orders').select('customer_name, phone')
     .eq('tracking_code', order).maybeSingle()
     .then(({ data }) => {
        if (data?.customer_name) setCustomerName(data.customer_name)
        if (data?.phone) setPhone(data.phone)
      })
  }, [order])

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5EBD8] font-body">
      {/* هيدر */}
      <div className="flex items-center justify-between px-4 py-4">
        <button className="bg-[#EDE0CC] px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1">
          رجوع <span>←</span>
        </button>
        <h1 className="text-xl font-black text-[#8B5E34]">الدفع</h1>
        <div className="w-[70px]"></div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4">
        {/* كرت الطلب */}
        <div className="bg-[#FFFBF2] rounded-[24px] p-4 shadow-sm border border-[#f0e2c8]">
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-2xl p-3 flex items-center gap-2">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center text-lg font-black text-[#8B5E34]">#</div>
              <div>
                <div className="text-[11px] text-gray-500">رقم الطلب</div>
                <div className="font-black text-[14px]">{order?.replace('SQ-','') || '658178'}</div>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl p-3 flex items-center gap-2">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">ⓘ</div>
              <div>
                <div className="text-[11px] text-gray-500">حالة الدفع</div>
                <div className="font-black text-[14px]">غير مكتمل</div>
              </div>
            </div>
          </div>

          <div className="text-center text-[13px] font-bold mt-3 text-[#4A3728]">
            {customerName} — <span dir="ltr">{phone}</span>
          </div>

          <div className="flex gap-2 mt-3">
            <div className="flex-1 bg-white rounded-2xl py-3 text-center">
              <div className="font-black text-[#B4662A] text-[14px]">3,650 ري</div>
              <div className="text-[11px] text-gray-500 mt-1">الإجمالي</div>
            </div>
            <div className="flex-1 bg-white rounded-2xl py-3 text-center">
              <div className="font-black text-emerald-600 text-[14px]">0 ري</div>
              <div className="text-[11px] text-gray-500 mt-1">المدفوع</div>
            </div>
            <div className="flex-1 bg-white rounded-2xl py-3 text-center">
              <div className="font-black text-red-600 text-[14px]">3,650 ري</div>
              <div className="text-[11px] text-gray-500 mt-1">المتبقي</div>
            </div>
          </div>
        </div>

        {/* كرت طريقة الدفع */}
        <div className="bg-[#FFFBF2] rounded-[24px] p-4 shadow-sm border border-[#f0e2c8]">
          <div className="font-black text-[15px] mb-3 text-right">طريقة الدفع</div>
          <div className="relative">
            <select value={method} onChange={e=>setMethod(e.target.value)}
              className="w-full appearance-none bg-white border border-[#E8D5B5] rounded-2xl py-4 pr-12 pl-10 text-[14px] text-center outline-none focus:border-[#8B5E34]">
              <option value="">اختر طريقة الدفع</option>
              <option value="جيب">جيب</option>
              <option value="جوالي">جوالي</option>
              <option value="ون كاش">ون كاش</option>
              <option value="فلوسك">فلوسك</option>
              <option value="كريمي">كريمي</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#FDF3E3] rounded-xl flex items-center justify-center">💳</div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">⌄</div>
          </div>
          {method && (
            <div className="mt-3 flex items-center gap-2 bg-white rounded-2xl p-3 border">
              <img src={`/wallets/${method}.png`} className="w-10 h-10 object-contain" onError={e=>e.currentTarget.style.display='none'} />
              <span className="font-bold">{method}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
