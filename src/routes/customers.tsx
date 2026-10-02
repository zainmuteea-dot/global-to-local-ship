import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
const db = supabase as any;

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
})

function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const fetchData = async () => {
    const { data } = await db.from('customers').select('*').order('created_at', { ascending: false })
    if (data) setCustomers(data)
  }
  useEffect(()=>{fetchData()},[])

  const add = async () => {
    if(!name) return alert('ادخل الاسم')
    await db.from('customers').insert({ name, phone })
    setName(''); setPhone(''); fetchData()
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">العملاء</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم العميل" className="border p-2 rounded" />
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="الهاتف" className="border p-2 rounded" />
        <button onClick={add} className="bg-blue-800 text-white px-4 py-2 rounded">إضافة</button>
      </div>
      <div className="grid gap-2">
        {customers.map(c=>(
          <div key={c.id} className="bg-white p-3 rounded shadow flex justify-between">
            <span>{c.name}</span><span>{c.phone}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
