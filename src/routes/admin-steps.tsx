import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export const Route = createFileRoute("/admin-steps")({
  component: StepsAdmin,
});

type StepRow = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  link_to: string;
  sort_order: number;
  is_active: boolean;
};

const icons = ["Link2", "CircleDollarSign", "ShoppingCart", "Search", "Package"];

function StepsAdmin() {
  const [rows, setRows] = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", icon_name: "Link2", link_to: "/new-order", sort_order: 1 });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from("site_steps").select("*").order("sort_order");
    if (data) setRows(data as StepRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title) return alert("أدخل العنوان");
    const { error } = await db.from("site_steps").insert([{ ...form, is_active: true }]);
    if (!error) { setForm({ title: "", description: "", icon_name: "Link2", link_to: "/new-order", sort_order: 1 }); load(); }
  };

  const toggle = async (r: StepRow) => {
    await db.from("site_steps").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذه الخطوة؟")) return;
    await db.from("site_steps").delete().eq("id", id);
    load();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf8f2] p-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/admin" className="text-sm text-cocoa font-bold">← رجوع للوحة الإدارة</Link>
        <h1 className="mt-2 text-2xl font-black text-cocoadeep">إدارة خطوات الرئيسية</h1>
        <p className="text-sm text-muted-foreground mb-6">البطاقات الخمس الظاهرة في الصفحة الرئيسية</p>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-border mb-6">
          <h2 className="font-bold mb-3">إضافة خطوة جديدة</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="العنوان (مثال: أرسل الرابط)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="rounded-xl border p-2.5" />
            <input placeholder="الوصف (مثال: انسخ رابط المنتج)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="rounded-xl border p-2.5" />
            <select value={form.icon_name} onChange={e=>setForm({...form,icon_name:e.target.value})} className="rounded-xl border p-2.5">
              {icons.map(ic=><option key={ic} value={ic}>{ic}</option>)}
            </select>
            <select value={form.link_to} onChange={e=>setForm({...form,link_to:e.target.value})} className="rounded-xl border p-2.5">
              <option value="/new-order">/new-order - صفحة الطلب</option>
              <option value="/track">/track - تتبع الشحنة</option>
              <option value="/my-account">/my-account - حسابي</option>
              <option value="/signup">/signup - التسجيل</option>
            </select>
            <input type="number" placeholder="الترتيب" value={form.sort_order} onChange={e=>setForm({...form,sort_order:Number(e.target.value)})} className="rounded-xl border p-2.5" />
          </div>
          <button onClick={add} className="mt-3 rounded-xl bg-cocoa px-6 py-2.5 text-cream font-bold">إضافة</button>
        </div>
        {loading ? <p>جاري التحميل...</p> : (
          <div className="grid gap-3">
            {rows.map(r=>(
              <div key={r.id} className={`flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-border ${!r.is_active?"opacity-50":""}`}>
                <div>
                  <p className="font-bold">{r.title} <span className="text-xs text-muted-foreground">#{r.sort_order} - {r.icon_name}</span></p>
                  <p className="text-sm text-muted-foreground">{r.description} → {r.link_to}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>toggle(r)} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold">{r.is_active?"إخفاء":"تفعيل"}</button>
                  <button onClick={()=>del(r.id)} className="rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-sm font-bold">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
