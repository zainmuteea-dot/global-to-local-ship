import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/admin')({ component: AdminPage })

type Order = { id: string; created_at: string; customer_name: string; phone: string; product_link: string; status: string }

function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", {ascending: false})
    if(data) setOrders(data as any)
    setLoading(false)
  }
  useEffect(()=>{fetchOrders()},[])
  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({status}).eq("id", id)
    fetchOrders()
  }
  if(loading) return <div className="p-8 text-center">جاري التحميل...</div>
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6">لوحة الطلبات - {orders.length} طلب</h1>
      <div className="grid gap-4">
        {orders.map(o => (
          <div key={o.id} className="bg-white p-4 rounded-lg shadow flex justify-between gap-2">
            <div>
              <p className="font-bold">{o.customer_name} - {o.phone}</p>
              <a href={o.product_link} target="_blank" className="text-blue-600 text-sm break-all">{o.product_link}</a>
              <p className="text-xs text-gray-500 mt-1">{new Date(o.created_at).toLocaleString('ar-YE')}</p>
            </div>
            <select value={o.status} onChange={e=>updateStatus(o.id, e.target.value)} className="border rounded h-9 px-2 bg-white shrink-0">
              <option>جديد</option><option>تم التواصل</option><option>تم الشحن</option><option>وصل</option><option>ملغي</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
