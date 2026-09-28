import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin-clients")({
  component: AdminClientsPage,
});

function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("role", "client").order("created_at", { ascending: false })
      .then(({ data }) => { setClients(data || []); setLoading(false); });
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf8f2] p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-black mb-4">يومية العملاء</h1>
        <div className="bg-white rounded-2xl ring-1 ring-black/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-700 text-white">
              <tr>
                <th className="p-3">الرقم</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">التلفون</th>
                <th className="p-3">تاريخ التسجيل</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center">جاري التحميل...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center">لا يوجد عملاء بعد</td></tr>
              ) : clients.map((c, i) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{28000 + i}</td>
                  <td className="p-3 font-bold">{c.full_name || "بدون اسم"}</td>
                  <td className="p-3" dir="ltr">{c.phone || "-"}</td>
                  <td className="p-3">{c.created_at ? new Date(c.created_at).toLocaleDateString("ar") : "-"}</td>
                  <td className="p-3"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">نشط</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
