import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PackageCheck, MapPin, Mic } from "lucide-react";

export const Route = createFileRoute("/new-order")({ component: NewOrder });

function NewOrder() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [qtyType, setQtyType] = useState("2");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("ر.س سعودي");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate({ to: "/signup" });
    });
  }, [navigate]);

  const submit = async () => {
    if (!url.trim() ||!name ||!phone) { alert("أكمل الحقول المطلوبة *"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.from("orders").insert([{
        customer_name: name.trim(), phone: phone.trim(),
        product_link: url.trim(), product_url: url.trim(),
        product_name: "منتج من SHEIN", original_price: price? Number(price) : null,
        original_currency: "SAR", customer_address: address,
        customer_notes: notes, notes: notes,
        status: "جديد", user_id: session?.user?.id?? null
      }]).select("tracking_code").single();
      if (error) throw error;
      if (data) setTrackingCode(data.tracking_code);
    } catch(e:any){ alert(e.message); }
    finally{ setLoading(false); }
  };

  if (trackingCode) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#fef9e7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600"><PackageCheck className="size-9"/></div>
          <h1 className="font-black text-xl">تم استلام طلبك بنجاح!</h1>
          <div className="bg-[#FFFBF2] border-2 border-dashed border-orange-400 rounded-2xl p-4">
            <div className="text-2xl font-black text-orange-600">{trackingCode}</div>
            <button onClick={()=>{navigator.clipboard.writeText(trackingCode); setCopied(true);}} className="text-xs mt-2 border px-3 py-1 rounded-lg">{copied?"تم النسخ!":"نسخ الرقم"}</button>
          </div>
          <Link to="/pay" search={{order:trackingCode}} className="block bg-[#1a4a8a] text-white py-3 rounded-xl font-bold">المتابعة إلى الدفع 💳</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#fdf6e3] py-4 px-3">
      <div className="max-w-[430px] mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 text-center">
            <div className="font-black text-[18px] text-orange-500">SHOPPING <span className="text-[#1a5276]">AL SHAMEL</span> 🛍️</div>
            <div className="text-[11px] text-blue-600">السوق الشامل • وبأسعار الشامل</div>
          </div>
          <button className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center">→</button>
        </div>

        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-orange-100">
          <div className="flex items-center justify-end gap-2 text-[13px] font-bold text-[#1a5276]">
            <span>تفاصيل السلعة</span><span className="w-5 h-5 bg-[#1a5276] text-white rounded-full text-[11px] flex items-center justify-center">1</span> 📋
          </div>
          <div className="text-center mt-3"><span className="bg-[#1a5276] text-white text-[11px] font-black px-4 py-1 rounded-full">SHEIN</span></div>
          <input dir="ltr" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://ar.shein.com/..." className="w-full mt-2 border border-orange-200 rounded-xl px-3 py-2.5 text-[12px] text-center bg-[#fffdf5]" />
          <div className="mt-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] rounded-xl py-2 px-3 text-center">✨ الصق رابط المنتج من شي إن ✨</div>

          <div className="text-[11px] font-bold mt-3 mb-2 text-center">هل تريد منتج مفرد؟ *</div>
          <div className="flex gap-2">
            {["كبير منك","2","مفرد"].map(o=>(
              <button key={o} onClick={()=>setQtyType(o)} className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border ${qtyType===o?"bg-[#1a4a8a] text-white border-[#1a4a8a]":"bg-white border-gray-200"}`}>{o}</button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 text-[13px] font-bold text-[#1a5276] mt-5">
            <span>عنوان التوصيل وبيانات المستلم</span><span className="w-5 h-5 bg-[#1a5276] text-white rounded-full text-[11px] flex items-center justify-center">2</span> 🏠
          </div>
          <div className="text-[11px] mt-2 mb-1">عنوان التوصيل بتفصيل (المدينة / الحي / قرب ايش) *</div>
          <div className="relative">
            <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="مثال: صنعاء - شارع حدة - بجوار فندق برج السلام..." className="w-full border rounded-xl px-3 py-3 text-[12px] pr-10" />
            <MapPin className="absolute right-3 top-3.5 size-4 text-orange-400" />
          </div>
          <div className="flex gap-2 mt-2">
            <div className="flex-1"><div className="text-[11px] mb-1">اسم المستلم *</div><input value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم الكامل" className="w-full border rounded-xl px-3 py-2.5 text-[13px]" /></div>
            <div className="flex-1"><div className="text-[11px] mb-1">رقم الهاتف / واتساب *</div><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXXXX" className="w-full border rounded-xl px-3 py-2.5 text-[13px]" /></div>
          </div>

          <div className="flex items-center justify-end gap-2 text-[13px] font-bold text-[#1a5276] mt-5">
            <span>سعر السلعة في المتجر الأصلي</span><span className="w-5 h-5 bg-[#1a5276] text-white rounded-full text-[11px] flex items-center justify-center">3</span> 💰
          </div>
          <div className="flex gap-2 mt-2">
            <input value={price} onChange={e=>setPrice(e.target.value)} type="number" inputMode="decimal" placeholder="" className="flex-1 border rounded-xl px-3 py-2.5 text-center font-bold" />
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="bg-[#1a4a8a] text-white rounded-xl px-3 py-2.5 text-[12px]"><option>ر.س سعودي</option><option>$ دولار</option></select>
          </div>

          <div className="flex items-center justify-end gap-2 text-[13px] font-bold text-[#1a5276] mt-5">
            <span>ملاحظات إضافية (اختياري)</span><span className="w-5 h-5 bg-[#1a5276] text-white rounded-full text-[11px] flex items-center justify-center">4</span> 💬
          </div>
          <div className="relative mt-2">
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="اكتب أي ملاحظات خاصة بطلبك هنا: مقاسات، ألوان، تعليمات خاصة..." className="w-full border rounded-xl p-3 text-[12px] h-[90px] resize-none" />
            <button className="absolute bottom-3 left-3 w-8 h-8 bg-[#1a5276] text-white rounded-lg flex items-center justify-center"><Mic className="size-4"/></button>
          </div>

          <button onClick={submit} disabled={loading} className="w-full mt-4 bg-[#1e4a8a] text-white py-4 rounded-2xl font-black text-[15px] shadow-lg">
            {loading?"جاري الإرسال...":"🚀 تقديم الطلب"}
          </button>
          <button className="w-full mt-2 border border-orange-200 py-3 rounded-2xl text-[13px] text-[#1a5276]">→ ترجع للصفحة الرئيسية</button>
          <div className="flex justify-center gap-4 mt-3 text-[10px] text-gray-400">
            <span>🛡️ فحص وضمانة أصلية</span><span>🚚 توصيل لباب المنزل</span><span>✔️ تأكيد واتساب</span>
          </div>
        </div>
      </div>
    </div>
  );
}
