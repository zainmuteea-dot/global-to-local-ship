import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
const db = supabase as any;
export const Route = createFileRoute('/sales-invoices')({
  component: SalesPage,
})

function SalesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')

  const fetchData = async () => {
    const { data: p } = await db.from('products').select('*')
    if(p) setProducts(p)
    const { data: c } = await db.from('customers').select('*')
    if(c) setCustomers(c)
    const { data: inv } = await db.from('sales_invoices').select('*').order('created_at',{ascending:false}).limit(20)
    if(inv) setInvoices(inv)
  }
  useEffect(()=>{fetchData()},[])

  const createInvoice = async () => {
    if(!productId) return alert('اختر المنتج')
    const prod = products.find(x=>x.id===productId)
    const total = (prod?.price||0) * Number(qty)
    await db.from('sales_invoices').insert({
      customer_id: customerId||null,
      total,
      items: [{ product_id: productId, qty: Number(qty), price: prod?.price }]
    })
    setProductId(''); setQty('1'); fetchData()
    alert('تم حفظ الفاتورة')
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">فواتير المبيعات</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2 flex-wrap">
        <select value={customerId} onChange={e=>setCustomerId(e.target.value)} className="border p-2 rounded">
          <option value="">عميل نقدي</option>
          {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={productId} onChange={e=>setProductId(e.target.value)} className="border p-2 rounded">
          <option value="">اختر المنتج</option>
          {products.map(p=><option key={p.id} value={p.id}>{p.name} - {p.price}</option>)}
        </select>
        <input value={qty} onChange={e=>setQty(e.target.value)} type="number" placeholder="الكمية" className="border p-2 rounded w-24" />
        <button onClick={createInvoice} className="bg-green-700 text-white px-4 py-2 rounded">حفظ فاتورة</button>
      </div>
      <div className="grid gap-2">
        {invoices.map(inv=>(
          <div key={inv.id} className="bg-white p-3 rounded shadow flex justify-between">
            <span>{new Date(inv.created_at).toLocaleString('ar')}</span>
            <span className="font-bold">{inv.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
