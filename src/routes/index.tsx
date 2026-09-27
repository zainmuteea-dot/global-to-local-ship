import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [stats, setStats] = useState({products:0, customers:0, sales:0, stores:0})

  useEffect(()=>{
    const load = async () => {
      const { count: pc } = await supabase.from('products').select('*',{count:'exact', head:true})
      const { count: cc } = await supabase.from('customers').select('*',{count:'exact', head:true})
      const { count: sc } = await supabase.from('sales_invoices').select('*',{count:'exact', head:true})
      const { count: stc } = await supabase.from('stores').select('*',{count:'exact', head:true})
      setStats({products: pc||0, customers: cc||0, sales: sc||0, stores: stc||0})
    }
    load()
  },[])

  const cards = [
    {title:'المنتجات', value: stats.products, link:'/products', color:'bg-blue-600'},
    {title:'العملاء', value: stats.customers, link:'/customers', color:'bg-green-600'},
    {title:'فواتير المبيعات', value: stats.sales, link:'/sales-invoices', color:'bg-purple-600'},
    {title:'المخازن', value: stats.stores, link:'/stores', color:'bg-orange-600'},
  ]

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-3xl font-bold mb-6">لوحة التحكم - نظام المبيعات</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c,i)=>(
          <Link key={i} to={c.link} className={`${c.color} text-white p-6 rounded-xl shadow`}>
            <div className="text-3xl font-bold">{c.value}</div>
            <div>{c.title}</div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link to="/sales-invoices" className="bg-white p-6 rounded shadow text-center font-bold">+ فاتورة مبيعات جديدة</Link>
        <Link to="/purchase-invoices" className="bg-white p-6 rounded shadow text-center font-bold">+ فاتورة مشتريات جديدة</Link>
      </div>
    </div>
  )
}
