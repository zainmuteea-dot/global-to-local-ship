import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [storeId, setStoreId] = useState('')

  const fetchData = async () => {
    const { data: p } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (p) setProducts(p)
    const { data: s } = await supabase.from('stores').select('*')
    if (s) setStores(s)
  }

  useEffect(() => { fetchData() }, [])

  const add = async () => {
    if (!name) return alert('ادخل اسم المنتج')
    await supabase.from('products').insert({
      name, sku, price: Number(price)||0, store_id: storeId||null
    })
    setName(''); setSku(''); setPrice(''); setStoreId('')
    fetchData()
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">المنتجات</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2 flex-wrap">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المنتج" className="border p-2 rounded" />
        <input value={sku} onChange={e=>setSku(e.target.value)} placeholder="الكود" className="border p-2 rounded" />
        <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="السعر" type="number" className="border p-2 rounded" />
        <select value={storeId} onChange={e=>setStoreId(e.target.value)} className="border p-2 rounded">
          <option value="">اختر المخزن</option>
          {stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}
        </select>
        <button onClick={add} className="bg-blue-800 text-white px-4 py-2 rounded">إضافة</button>
      </div>
      <div className="grid gap-2">
        {products.map(pr=>(
          <div key={pr.id} className="bg-white p-3 rounded shadow flex justify-between">
            <span>{pr.name} - {pr.sku}</span><span>{pr.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
