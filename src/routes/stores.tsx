import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/stores')({
  component: StoresPage,
})

function StoresPage() {
  const [stores, setStores] = useState<any[]>([])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [manager, setManager] = useState('')

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    if (data) setStores(data)
  }

  useEffect(() => { fetchStores() }, [])

  const addStore = async () => {
    if (!name) return alert('ادخل اسم المخزن')
    await supabase.from('stores').insert({ name, location })
    setName(''); setLocation(''); setManager('')
    fetchStores()
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">إدارة المخازن</h1>
      <div className="bg-white p-4 rounded shadow mb-4 flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المخزن" className="border p-2 rounded" />
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="الموقع" className="border p-2 rounded" />
        <input value={manager} onChange={e=>setManager(e.target.value)} placeholder="المسؤول" className="border p-2 rounded" />
        <button onClick={addStore} className="bg-blue-800 text-white px-4 py-2 rounded">إضافة</button>
      </div>
      <table className="w-full bg-white rounded shadow">
        <thead><tr className="bg-blue-800 text-white"><th className="p-2">#</th><th className="p-2">الاسم</th><th className="p-2">الموقع</th><th className="p-2">المسؤول</th></tr></thead>
        <tbody>
          {stores.map((s,i)=>(
            <tr key={s.id} className="border-t"><td className="p-2">{i+1}</td><td className="p-2">{s.name}</td><td className="p-2">{s.location}</td><td className="p-2">{s.manager}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
