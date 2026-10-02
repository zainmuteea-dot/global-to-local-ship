import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
const db = supabase as any;

export const Route = createFileRoute("/prices")({
  component: PricesPage,
});

type Price = {
  id: string;
  service_name: string;
  price: number;
  unit: string | null;
  notes: string | null;
};

function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("ر.س");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPrices = async () => {
    setLoading(true);
    const { data, error } = await db.from("prices").select("*").order("created_at", { ascending: false });
    if (!error && data) setPrices(data);
    setLoading(false);
  };

  useEffect(() => { fetchPrices(); }, []);

  const addPrice = async () => {
    if (!serviceName.trim() ||!price) return;
    const { error } = await db.from("prices").insert({
      service_name: serviceName.trim(),
      price: parseFloat(price),
      unit: unit.trim() || "ر.س",
      notes: notes.trim() || null,
    });
    if (!error) {
      setServiceName(""); setPrice(""); setNotes(""); setUnit("ر.س");
      fetchPrices();
    }
  };

  const deletePrice = async (id: string) => {
    if (!confirm("حذف هذا السعر؟")) return;
    await db.from("prices").delete().eq("id", id);
    fetchPrices();
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

        <h1 className="text-2xl font-extrabold text-[#3d2314] mt-2 mb-6">🏷️ إدارة الأسعار</h1>

        <div className="bg-white rounded-[24px] p-6 border border-[#ede5d8] mb-6">
          <h3 className="font-extrabold text-[#3d2314] mb-4">إضافة سعر جديد</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={serviceName} onChange={e=>setServiceName(e.target.value)} placeholder="اسم الخدمة / الشحن" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
            <input value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="السعر" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
            <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="العملة (ر.س)" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات" className="h-11 px-4 rounded-xl border border-[#ede5d8] text-sm" />
          </div>
          <button onClick={addPrice} className="mt-4 px-6 h-11 rounded-xl bg-[#3d2314] text-white text-sm font-bold hover:opacity-90">
            إضافة السعر
          </button>
        </div>

        {loading? <p className="text-center text-[#8a7a65]">جاري التحميل...</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prices.map(p => (
              <div key={p.id} className="bg-white rounded-[24px] p-5 border border-[#ede5d8]">
                <h4 className="font-extrabold text-[#3d2314]">{p.service_name}</h4>
                <p className="text-lg font-extrabold text-[#3d2314] mt-2">{p.price} {p.unit}</p>
                {p.notes && <p className="text-xs text-[#8a7a65] mt-1">{p.notes}</p>}
                <button onClick={()=>deletePrice(p.id)} className="mt-3 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
        {!loading && prices.length===0 && (
          <p className="text-center text-[#8a7a65] text-sm mt-8">لا توجد أسعار بعد</p>
        )}
      </div>
    </div>
  );
}
