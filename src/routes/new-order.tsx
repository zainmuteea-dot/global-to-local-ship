import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PackageCheck, MapPin, Mic } from "lucide-react";

export const Route = createFileRoute("/new-order")({ component: NewOrder });

function NewOrder() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string|null>(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session?.user) navigate({to:"/signup"});
    });
  },[navigate]);

  const submit = async ()=>{
    if(!url.trim()||!name.trim()||!phone.trim()){ alert("أكمل الحقول المطلوبة"); return; }
    setLoading(true);
    try{
      const {data:{session}} = await supabase.auth.getSession();
      const {data, error} = await supabase.from("orders").insert([{
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        phone: phone.trim(),
        customer_address: address.trim(),
        product_url: url.trim(),
        product_link: url.trim(),
        original_price: price? Number(price) : 0,
        original_currency: "SAR",
        customer_notes: notes.trim(),
        notes: notes.trim(),
        status: "new",
        payment_status: "unpaid"
      }]).select("tracking_code, order_number").single();
      if(error) throw error;
      setTrackingCode(data?.tracking_code || data?.order_number);
    }catch(e:any){ alert("خطأ: "+e.message); }
    finally{ setLoading(false); }
  };

  if(trackingCode){
    return(
      <div dir="rtl" className="min-h-screen bg-[#fef9e7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600"><PackageCheck className="size-9"/></div>
          <h1 className="font-black text-xl">تم استلام طلبك!</h1>
          <div className="text-2xl font-black text-orange-600 select-all">{trackingCode}</div>
          <Link to="/pay" search={{order:trackingCode}} className="block bg-[#1a4a8a] text-white py-3 rounded-xl font-bold">المتابعة إلى الدفع</Link>
        </div>
      </div>
    );
  }

  return(
    <div dir="rtl" className="min-h-screen bg-[#fdf6e3] py-4 px-3">
      <div className="max-w-[430px] mx-auto">
        <div className="text-center font-black text-[18px] text-orange-500 mb-2">SHOPPING <span className="text-[#1a5276]">AL SHAMEL</span> 🛍️</div>
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-orange-100 space-y-4">
          <div>
            <div className="font-bold text-[#1a5276] text-[13px] mb-1">1️⃣ تفاصيل السلعة</div>
            <input dir="ltr" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://ar.shein.com/..." className="w-full border border-orange-200 rounded-xl px-3 py-2.5 text-[12px] text-center" />
          </div>
          <div>
            <div className="font-bold text-[#1a5276] text-[13px] mb-1">2️⃣ عنوان التوصيل وبيانات المستلم</div>
            <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="المدينة - الحي - الشارع" className="w-full border rounded-xl px-3 py-3 text-[12px] mb-2" />
            <div className="flex gap-2">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المستلم *" className="flex-1 border rounded-xl px-3 py-2.5 text-[13px]" />
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="رقم الهاتف *" className="flex-1 border rounded-xl px-3 py-2.5 text-[13px]" />
            </div>
          </div>
          <div>
            <div className="font-bold text-[#1a5276] text-[13px] mb-1">3️⃣ سعر السلعة في المتجر الأصلي</div>
            <input value={price} onChange={e=>setPrice(e.target.value)} type="number" inputMode="decimal" placeholder="" className="w-full border rounded-xl px-3 py-2.5 text-center font-bold" />
          </div>
          <div>
            <div className="font-bold text-[#1a5276] text-[13px] mb-1">4️⃣ ملاحظات إضافية</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="مقاسات، ألوان..." className="w-full border rounded-xl p-3 text-[12px] h-[80px]" />
          </div>
          <button onClick={submit} disabled={loading} className="w-full bg-[#1e4a8a] text-white py-4 rounded-2xl font-black">{loading?"جاري الإرسال...":"🚀 تقديم الطلب"}</button>
        </div>
      </div>
    </div>
  );
}
