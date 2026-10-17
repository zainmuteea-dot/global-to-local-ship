import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export const Route = createFileRoute('/admin-client-detail')({
  component: AdminClientDetail,
})

function AdminClientDetail() {
  const searchParams = new URLSearchParams(window.location.search)
  const clientId = searchParams.get('id')
  
  const [client, setClient] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!clientId) return
      
      // 1. جيب بيانات العميل
      const { data: clientData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', clientId)
        .single()
      
      setClient(clientData)

      // 2. جيب كل طلباته (مع معالجة +967)
      if (clientData?.phone) {
        const cleanPhone = clientData.phone.replace('+967', '').replace('967', '')
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.${clientData.phone},customer_phone.ilike.%${cleanPhone}%`)
          .order('created_at', { ascending: false })

        setOrders(ordersData || [])
      }
      setLoading(false)
    }
    loadData()
  }, [clientId])

  if (loading) return <div className="p-8 text-center">جاري تحميل كشف الحساب...</div>
  if (!client) return <div className="p-8">العميل غير موجود</div>

  const totalRemaining = orders.reduce((s, o) => s + (o.remaining_amount || 0), 0)
  const totalPaid = orders.reduce((s, o) => s + (o.paid_amount || 0), 0)
  const totalProfit = orders.reduce((s, o) => s + (o.profit_amount || 0), 0)
  const totalCost = orders.reduce((s, o) => s + (o.total_cost_yer || 0), 0)

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">كشف حساب: {client.name}</h1>
            <p className="text-gray-600 mt-1">📞 {client.phone} | 📍 {client.city || 'غير محدد'} | 🆔 {client.id.slice(0,8)}...</p>
            <p className="text-sm text-gray-400 mt-1">تاريخ التسجيل: {new Date(client.created_at).toLocaleDateString('ar-YE')}</p>
          </div>
          <a href="/admin-clients" className="bg-gray-200 px-4 py-2 rounded">رجوع للعملاء</a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border-2 border-red-500 p-4 rounded-lg">
          <div className="text-sm text-red-600">المتبقي عليه</div>
          <div className="text-2xl font-bold text-red-800">{totalRemaining.toLocaleString()} ر.ي</div>
        </div>
        <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg">
          <div className="text-sm text-green-600">المدفوع</div>
          <div className="text-2xl font-bold text-green-800">{totalPaid.toLocaleString()} ر.ي</div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-500 p-4 rounded-lg">
          <div className="text-sm text-blue-600">إجمالي الربح</div>
          <div className="text-2xl font-bold text-blue-800">{totalProfit.toLocaleString()} ر.ي</div>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-500 p-4 rounded-lg">
          <div className="text-sm text-yellow-600">عدد الطلبات</div>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-900 text-white font-bold">تفاصيل الطلبات ({orders.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-right">رقم الطلب</th>
                <th className="p-3 text-right">المنتج</th>
                <th className="p-3 text-right">المتجر</th>
                <th className="p-3 text-right">الإجمالي ر.ي</th>
                <th className="p-3 text-right">المدفوع</th>
                <th className="p-3 text-right">المتبقي</th>
                <th className="p-3 text-right">الربح</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <tr key={o.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-mono text-xs">{o.order_number || o.tracking_code || '-'}</td>
                  <td className="p-3">{o.product_name || o.product_title || 'طلب متجر دولي'}</td>
                  <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{o.store_name || '-'}</span></td>
                  <td className="p-3">{o.total_cost_yer?.toLocaleString() || '-'}</td>
                  <td className="p-3 text-green-600">{o.paid_amount?.toLocaleString()}</td>
                  <td className="p-3 text-red-600 font-bold">{o.remaining_amount?.toLocaleString()}</td>
                  <td className="p-3 text-blue-600">{o.profit_amount?.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      o.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      o.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>{o.status}</span>
                  </td>
                  <td className="p-3 text-xs">{new Date(o.created_at).toLocaleDateString('ar-YE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Totals */}
        <div className="p-4 bg-yellow-100 border-t-2 border-yellow-500 font-bold flex justify-between">
          <span>الإجمالي: {totalCost.toLocaleString()} ر.ي تكلفة | {totalRemaining.toLocaleString()} متبقي | {totalPaid.toLocaleString()} مدفوع | {totalProfit.toLocaleString()} ربح</span>
        </div>
      </div>
    </div>
  )
}
