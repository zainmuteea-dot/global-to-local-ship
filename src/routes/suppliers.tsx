import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
const db = supabase as any;

export const Route = createFileRoute('/suppliers')({
  component: SuppliersPage,
})

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const fetchData = async () => {
    const { data } = await db.from('suppliers').select('*').order('created_at', { ascending: false })
    if (data) setSuppliers(data)
  }
  useEffect(()=>{fetchData()},[])

  const add = async () => {
    if(!name) return alert('ادخل الاسم')
    await db.from('suppliers').insert({ name, phone })
    setName(''); setPhone(''); fetchData()
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">الموردين</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المورد" className="border p-2 rounded" />
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="الهاتف" className="border p-2 rounded" />
        <button onClick={add} className="bg-blue-800 text-white px-4 py-2 rounded">إضافة</button>
      </div>
      <div className="grid gap-2">
        {suppliers.map(s=>(
          <div key={s.id} className="bg-white p-3 rounded shadow flex justify-between">
            <span>{s.name}</span><span>{s.phone}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
