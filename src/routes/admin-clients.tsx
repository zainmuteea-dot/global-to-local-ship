import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin-clients")({
  component: AdminClientsPage,
});

function AdminClientsPage() {
  const [q, setQ] = useState("");
  const clients = [
    { id: 1, name: "أحمد محمد", phone: "770000001", city: "صنعاء" },
    { id: 2, name: "سارة علي", phone: "770000002", city: "عدن" },
  ];
  const filtered = clients.filter(c => c.name.includes(q) || c.phone.includes(q));
  return (
    <div dir="rtl" className="min-h-screen bg-[#faf8f2] p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black mb-4">العملاء</h1>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف"
          className="w-full mb-4 rounded-xl border p-3 bg-white"
        />
        <div className="bg-white rounded-2xl ring-1 ring-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr><th className="p-3 text-right">الاسم</th><th className="p-3 text-right">الهاتف</th><th className="p-3 text-right">المدينة</th></tr>
            </thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">{c.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
