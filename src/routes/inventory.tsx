import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
const db = supabase as any;

export const Route = createFileRoute('/inventory')({
  component: InventoryPage,
})

function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  useEffect(()=>{
    db.from('products').select('*').order('name').then(({data})=>{ if(data) setProducts(data) })
  },[])
  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">المخزون</h1>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr><th className="p-3 text-right">المنتج</th><th className="p-3">الباركود</th><th className="p-3">الكمية</th><th className="p-3">السعر</th></tr>
          </thead>
          <tbody>
            {products.map(p=>(
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-center">{p.barcode}</td>
                <td className={`p-3 text-center font-bold ${p.stock<=5?'text-red-600':''}`}>{p.stock}</td>
                <td className="p-3 text-center">{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
