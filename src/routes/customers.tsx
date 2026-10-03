import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
})

export interface Customer {
  id: string
  created_at: string
  name: string
  phone: string | null
  city?: string | null
  notes?: string | null
}

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customers' as any)
      .select('*')
      .order('created_at', { ascending: false })
    
    const customers = (data as unknown) as Customer[];
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const add = async () => {
    if (!name.trim()) return alert('يرجى إدخال اسم العميل')
    await supabase.from('customers' as any).insert({ name: name.trim(), phone: phone.trim() || null })
    setName('')
    setPhone('')
    fetchData()
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">العملاء</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2">
        <input 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="اسم العميل" 
          className="border p-2 rounded flex-1" 
        />
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          placeholder="رقم الهاتف" 
          className="border p-2 rounded flex-1" 
        />
        <button onClick={add} className="bg-blue-800 text-white px-6 py-2 rounded font-bold hover:bg-blue-900 transition">
          إضافة
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 py-4">جاري التحميل...</div>
      ) : (
        <div className="grid gap-2">
          {customers.map(c => (
            <div key={c.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
              <span className="font-bold text-[#0A2540]">{c.name}</span>
              <span className="font-mono text-slate-600">{c.phone || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
