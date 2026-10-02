import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/inventory')({
  component: InventoryPage,
})

export interface ProductInventoryItem {
  id: string
  created_at: string
  name: string
  barcode: string | null
  stock: number
  price: number
}

function InventoryPage() {
  const [products, setProducts] = useState<ProductInventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('products' as any)
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setProducts(data as ProductInventoryItem[])
        setLoading(false)
      })
  }, [])

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">المخزون</h1>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 text-right">المنتج</th>
              <th className="p-3 text-center">الباركود</th>
              <th className="p-3 text-center">الكمية</th>
              <th className="p-3 text-center">السعر</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-500">جاري تحميل المنتجات...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-500">لا توجد منتجات مسجلة في المخزون</td></tr>
            ) : (
              products.map(p => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{p.name}</td>
                  <td className="p-3 text-center font-mono text-slate-600">{p.barcode || '—'}</td>
                  <td className={`p-3 text-center font-black ${p.stock <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {p.stock}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-800">{p.price}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
