import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
const db = supabase as any;

export const Route = createFileRoute('/sales-returns')({
  component: SalesReturnsComponent,
})

function SalesReturnsComponent() {
  const [returns, setReturns] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [invoiceId, setInvoiceId] = useState("")
  const [reason, setReason] = useState("")
  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: 0 }])

  const load = async () => {
    const { data } = await db.from("sales_returns").select("*, sales_invoices(invoice_number)").order("created_at", { ascending: false })
    setReturns(data || [])
    const inv = await db.from("sales_invoices").select("id, invoice_number")
    setInvoices(inv.data || [])
    const prod = await db.from("products").select("id, name, sale_price")
    setProducts(prod.data || [])
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const { data: ret, error } = await db.from("sales_returns").insert({
      invoice_id: invoiceId,
      return_number: `SR-${Date.now()}`,
      reason, total_amount: total, status: "completed"
    }).select().single()
    if (error) return alert(error.message)
    for (const it of items) {
      await db.from("sales_return_items").insert({
        return_id: ret.id, product_id: it.product_id,
        quantity: it.quantity, unit_price: it.unit_price,
        total_price: it.quantity * it.unit_price
      })
    }
    setInvoiceId(""); setReason(""); setItems([{ product_id: "", quantity: 1, unit_price: 0 }])
    load()
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">مرتجعات المبيعات</h1>
      <div className="bg-white p-4 rounded shadow space-y-4">
        <select value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} className="border p-2 rounded w-full">
          <option value="">اختر الفاتورة</option>
          {invoices.map(i=><option key={i.id} value={i.id}>{i.invoice_number}</option>)}
        </select>
        <input placeholder="سبب الإرجاع" value={reason} onChange={e=>setReason(e.target.value)} className="border p-2 rounded w-full" />
        {items.map((it, idx)=>(
          <div key={idx} className="flex gap-2">
            <select value={it.product_id} onChange={e=>{
              const p = products.find(x=>x.id===e.target.value)
              const c=[...items]; c[idx]={...c[idx]!, product_id:e.target.value, unit_price:p?.sale_price||0}; setItems(c)
            }} className="border p-2 rounded flex-1">
              <option value="">منتج</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" value={it.quantity} onChange={e=>{const c=[...items]; c[idx]!.quantity=+e.target.value; setItems(c)}} className="border p-2 rounded w-20" />
            <input type="number" value={it.unit_price} onChange={e=>{const c=[...items]; c[idx]!.unit_price=+e.target.value; setItems(c)}} className="border p-2 rounded w-28" />
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={()=>setItems([...items,{product_id:"",quantity:1,unit_price:0}])} className="bg-gray-200 px-4 py-2 rounded">+ صنف</button>
          <button onClick={submit} className="bg-red-700 text-white px-4 py-2 rounded">حفظ المرتجع</button>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-right p-2">الرقم</th><th className="text-right p-2">الفاتورة</th><th className="text-right p-2">الإجمالي</th><th className="text-right p-2">السبب</th></tr></thead>
          <tbody>{returns.map(r=><tr key={r.id} className="border-b"><td className="p-2">{r.return_number}</td><td className="p-2">{r.sales_invoices?.invoice_number}</td><td className="p-2">{r.total_amount}</td><td className="p-2">{r.reason}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
