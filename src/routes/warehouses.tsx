import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/warehouses")({
  component: WarehousesPage,
});

type Warehouse = {
  id: string;
  name: string;
  location: string;
  phone: string;
};

function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("warehouses");
    if (saved) setWarehouses(JSON.parse(saved));
  }, []);

  const save = (data: Warehouse[]) => {
    setWarehouses(data);
    localStorage.setItem("warehouses", JSON.stringify(data));
  };

  const addWarehouse = () => {
    if (!name.trim()) return;
    const newW = {
      id: Date.now().toString(),
      name: name.trim(),
      location: location.trim(),
      phone: phone.trim(),
    };
    save([...warehouses, newW]);
    setName(""); setLocation(""); setPhone("");
  };

  const deleteWarehouse = (id: string) => {
    save(warehouses.filter(w => w.id!== id));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <div className="max-w-4xl mx-auto">
        <Link to="/admin" className="text-sm text-[#8a7a65] font-bold">← رجوع للوحة الإدارة</Link>
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

        {warehouses.length===0 && (
          <p className="text-center text-[#8a7a65] text-sm mt-8">لا توجد مخازن بعد، أضف أول مخزن</p>
        )}
      </div>
    </div>
  );
}
