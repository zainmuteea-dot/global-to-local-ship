import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export const Route = createFileRoute("/admin-clients")({
  component: AdminClientsPage,
});

type Client = { id: number; name: string; phone: string; city: string };

function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("id", {ascending:false});
    if (data) setClients(data as Client[]);
  };

  useEffect(()=>{ load(); }, []);

  const addClient = async () => {
    if (!name.trim() || !phone.trim()) return alert("ادخل الاسم والهاتف");
    const { error } = await supabase.from("clients").insert([{ name, phone, city }]);
    if (error) return alert(error.message);
    setName(""); setPhone(""); setCity("");
    load();
  };

  const deleteClient = async (id: number) => {
    if (!confirm("حذف هذا العميل؟")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (!error) load();
  };

  const filtered = clients.filter(c => c.name?.includes(q) || c.phone?.includes(q));

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf8f2] p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black mb-4">العملاء</h1>
        <div className="bg-white p-4 rounded-2xl ring-1 ring-border mb-4 grid sm:grid-cols-4 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم" className="rounded-xl border p-2" />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="الهاتف" className="rounded-xl border p-2" />
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="المدينة" className="rounded-xl border p-2" />
          <button onClick={addClient} className="rounded-xl bg-cocoadeep text-white p-2 font-bold">+ إضافة</button>
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم أو الهاتف" className="w-full mb-4 rounded-xl border p-3 bg-white" />
        <div className="bg-white rounded-2xl ring-1 ring-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr><th className="p-3 text-right">الاسم</th><th className="p-3 text-right">الهاتف</th><th className="p-3 text-right">المدينة</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">{c.city}</td>
                  <td className="p-3 text-left"><button onClick={()=>deleteClient(c.id)} className="text-red-600">حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
