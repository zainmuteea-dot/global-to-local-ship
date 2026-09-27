import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/purchase-invoices')({
  component: PurchaseInvoices,
})

function PurchaseInvoices() {
  const [items, setItems] = useState<any[]>([{product:'', qty:1, price:0}])

  const addRow = () => setItems([...items, {product:'', qty:1, price:0}])
  const update = (i:number, f:string, v:any) => {
    const n=[...items]; n[i][f]=v; setItems(n)
  }
  const total = items.reduce((s,it)=>s+(it.qty*it.price),0)

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">فاتورة مشتريات جديدة</h1>
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex gap-2 mb-4">
          <input placeholder="اسم المورد" className="border p-2 rounded" />
          <input placeholder="رقم الفاتورة" className="border p-2 rounded" />
          <input type="date" className="border p-2 rounded" />
        </div>
        {items.map((it,i)=>(
          <div key={i} className="flex gap-2 mb-2">
            <input value={it.product} onChange={e=>update(i,'product',e.target.value)} placeholder="الصنف" className="border p-2 rounded flex-1" />
            <input value={it.qty} onChange={e=>update(i,'qty',+e.target.value)} type="number" placeholder="الكمية" className="border p-2 rounded w-24" />
            <input value={it.price} onChange={e=>update(i,'price',+e.target.value)} type="number" placeholder="السعر" className="border p-2 rounded w-32" />
            <span className="p-2 font-bold">{it.qty*it.price}</span>
          </div>
        ))}
        <button onClick={addRow} className="bg-gray-200 px-3 py-1 rounded mt-2">+ إضافة سطر</button>
        <div className="mt-4 text-xl font-bold">الإجمالي: {total}</div>
        <button className="bg-green-700 text-white px-6 py-2 rounded mt-4">حفظ الفاتورة</button>
      </div>
    </div>
  )
}
