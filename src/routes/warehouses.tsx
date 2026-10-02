import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
const db = supabase as any;

export const Route = createFileRoute("/warehouses")({
  component: WarehousesPage,
});

type Warehouse = {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
};

function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWarehouses = async () => {
    setLoading(true);
    const { data, error } = await db.from("warehouses").select("*").order("created_at", { ascending: false });
    if (!error && data) setWarehouses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const addWarehouse = async () => {
    if (!name.trim()) return;
    const { error } = await db.from("warehouses").insert({
      name: name.trim(),
      location: location.trim() || null,
      phone: phone.trim() || null,
    });
    if (!error) {
      setName(""); setLocation(""); setPhone("");
      fetchWarehouses();
    }
  };

  const deleteWarehouse = async (id: string) => {
    if (!confirm("حذف هذا المخزن؟")) return;
    await db.from("warehouses").delete().eq("id", id);
    fetchWarehouses();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/admin" className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#ede5d8] text-[#3d2314] font-bold hover:bg-[#f5efe6]">
            →
          </Link>
          <span className="text-sm text-[#8a7a65] font-bold">رجوع للوحة الإدارة</span>
        </div>

        <h1 className="text-2xl font-extrabold text-[#3d2314] mt-2 mb-6">🏬 إدارة المخازن</h1>

        <div className="bg-white rounded-[24px] p-6 border border-[#ede5d8] mb-6">
          <h3 className="font-extrabold text-[#3d2314] mb-4">إضافة مخزن جديد</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المخزن" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="الموقع / العنوان" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="رقم الهاتف" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
          </div>
          <button onClick={addWarehouse} className="mt-4 px-6 h-11 rounded-xl bg-[#3d2314] text-white text-sm font-bold hover:opacity-90">
            إضافة المخزن
          </button>
        </div>

        {loading? <p className="text-center text-[#8a7a65]">جاري التحميل...</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {warehouses.map(w => (
              <div key={w.id} className="bg-white rounded-[24px] p-5 border border-[#ede5d8]">
                <h4 className="font-extrabold text-[#3d2314]">{w.name}</h4>
                <p className="text-xs text-[#8a7a65] mt-1">📍 {w.location || "بدون عنوان"}</p>
                <p className="text-xs text-[#8a7a65] mt-1">📞 {w.phone || "بدون هاتف"}</p>
                <button onClick={()=>deleteWarehouse(w.id)} className="mt-3 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
        {!loading && warehouses.length===0 && (
          <p className="text-center text-[#8a7a65] text-sm mt-8">لا توجد مخازن بعد</p>
        )}
      </div>
    </div>
  );
}
