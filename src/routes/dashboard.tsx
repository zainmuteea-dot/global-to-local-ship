import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const [stats, setStats] = useState({products:0, customers:0, sales:0, suppliers:0})
  useEffect(()=>{
    const load = async () => {
      const { count: pc } = await supabase.from('products').select('*',{count:'exact', head:true})
      const { count: cc } = await supabase.from('customers').select('*',{count:'exact', head:true})
      const { count: sc } = await supabase.from('sales_invoices').select('*',{count:'exact', head:true})
      const { count: supc } = await supabase.from('suppliers').select('*',{count:'exact', head:true})
      setStats({products: pc||0, customers: cc||0, sales: sc||0, suppliers: supc||0})
    }
    load()
  },[])
  const cards = [
    {title:'المنتجات', value: stats.products, link:'/products', color:'bg-blue-600'},
    {title:'العملاء', value: stats.customers, link:'/customers', color:'bg-green-600'},
    {title:'الموردين', value: stats.suppliers, link:'/suppliers', color:'bg-orange-600'},
    {title:'فواتير المبيعات', value: stats.sales, link:'/sales-invoices', color:'bg-purple-600'},
  ]
  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-3xl font-bold mb-6">لوحة تحكم الإدارة</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c,i)=>(
          <Link key={i} to={c.link} className={`${c.color} text-white p-6 rounded-xl shadow`}>
            <div className="text-3xl font-bold">{c.value}</div>
            <div>{c.title}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
