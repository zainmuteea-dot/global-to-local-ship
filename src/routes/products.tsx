import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')

  const add = () => {
    if (!name) return alert('ادخل اسم الصنف')
    setProducts([...products, { name, barcode, buyPrice, sellPrice, qty: 0 }])
    setName(''); setBarcode(''); setBuyPrice(''); setSellPrice('')
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">إدارة الأصناف</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2 flex-wrap">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الصنف" className="border p-2 rounded" />
        <input value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="الباركود" className="border p-2 rounded" />
        <input value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder="سعر الشراء" type="number" className="border p-2 rounded" />
        <input value={sellPrice} onChange={e=>setSellPrice(e.target.value)} placeholder="سعر البيع" type="number" className="border p-2 rounded" />
        <button onClick={add} className="bg-blue-800 text-white px-4 py-2 rounded">إضافة صنف</button>
      </div>
      <table className="w-full bg-white rounded shadow">
        <thead><tr className="bg-blue-800 text-white"><th className="p-2">#</th><th className="p-2">الصنف</th><th className="p-2">باركود</th><th className="p-2">شراء</th><th className="p-2">بيع</th><th className="p-2">الكمية</th></tr></thead>
        <tbody>
          {products.map((p,i)=>(
            <tr key={i} className="border-t"><td className="p-2">{i+1}</td><td className="p-2">{p.name}</td><td className="p-2">{p.barcode}</td><td className="p-2">{p.buyPrice}</td><td className="p-2">{p.sellPrice}</td><td className="p-2">{p.qty}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
