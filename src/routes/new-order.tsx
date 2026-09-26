import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://dgshuspugrruozfhmtsh.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2h1c3B1Z3JydW96ZmhtdHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTk0NzAsImV4cCI6MjEwNTY3NTQ3MH0.tkEuI3jwqMJ3FTPhYrZdktEe_UUfB3Q1vgKOK2u9-98');
export const Route = createFileRoute("/new-order")({ component: NewOrder });

const LOGOS: Record<string,string> = {
  SHEIN: "https://upload.wikimedia.org/wikipedia/commons/2/25/Shein-logo.png",
  Amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  TEMU: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Temu-logo.svg",
  AliExpress: "https://upload.wikimedia.org/wikipedia/commons/8/83/AliExpress_logo.svg",
  noon: "https://upload.wikimedia.org/wikipedia/commons/4/48/Noon-logo.svg",
  eBay: "https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg",
  ZARA: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg",
};

function detectStore(url:string){
  const u = url.toLowerCase();
  if(u.includes('shein')) return 'SHEIN';
  if(u.includes('amazon')) return 'Amazon';
  if(u.includes('temu')) return 'TEMU';
  if(u.includes('aliexpress')) return 'AliExpress';
  if(u.includes('noon')) return 'noon';
  if(u.includes('ebay')) return 'eBay';
  if(u.includes('zara')) return 'ZARA';
  return '';
}

function NewOrder(){
  const [step,setStep]=useState(1);
  const [url,setUrl]=useState(''); const [store,setStore]=useState('');
  const [previews,setPreviews]=useState<string[]>([]);
  const [name,setName]=useState(''); const [phone,setPhone]=useState('');
  const [address,setAddress]=useState(''); const [lat,setLat]=useState(''); const [lng,setLng]=useState('');
  const [loading,setLoading]=useState(false); const [done,setDone]=useState<string|null>(null);

  const onUrl=(v:string)=>{ setUrl(v); setStore(v.length>15? detectStore(v) : ''); };

  const getLocation=()=>{
    if(!navigator.geolocation){ alert('المتصفح لا يدعم الموقع'); return; }
    navigator.geolocation.getCurrentPosition(
      (p)=>{ setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setAddress(`موقع محدد: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`); },
      ()=>alert('تعذر تحديد الموقع')
    );
  };

  const submit=async()=>{
    if(!name||!phone||!address){ alert('اكمل الاسم والهاتف والعنوان'); return; }
    setLoading(true);
    const n='SHP-'+Math.floor(10000+Math.random()*90000);
    await supabase.from('orders').insert([{
      order_number:n, customer_name:name, customer_phone:phone,
      customer_city:'', customer_address:address,
      store_name:store||'عام', product_url:url,
      product_title:`طلب ${store}`, quantity:1,
      status:'new', payment_status:'unpaid',
    }]);
    setLoading(false); setDone(n);
  };

  if(done) return <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#EDE0CC] p-4"><div className="bg-white p-8 rounded-2xl text-center shadow">✅ تم استلام طلبك!<div className="font-mono font-black text-[#8B5E34] text-xl mt-2">{done}</div></div></div>;

  return(
    <div className="min-h-screen bg-[#E9DCC3] py-6 px-4" dir="rtl">
      <div className="max-w-[430px] mx-auto bg-[#FFFBF2] rounded-[20px] p-5 shadow space-y-4">

        {step===1 && (<>
          <div className="flex justify-between items-center">
            <h1 className="font-black text-[16px]">الخطوة 1: رابط المنتج</h1>
            <span className="text-[11px] bg-[#F1E6D0] px-2 py-1 rounded-full">الخطوة 1 من 2</span>
          </div>

          <div>
            <label className="text-[12px] font-bold block mb-1">رابط المنتج</label>
            <input value={url} onChange={e=>onUrl(e.target.value)}
              onPaste={e=>{const t=e.clipboardData.getData('text'); setTimeout(()=>onUrl(t),30);}}
              placeholder="الصق رابط شي إن / أمازون / Temu..." dir="ltr"
              className="w-full bg-[#F9F5EB] border rounded-xl px-4 py-3 text-[12px] font-mono text-left outline-none focus:ring-2 focus:ring-[#8B5E34]" />
            {store && (
              <div className="flex items-center justify-center gap-2 mt-2 bg-white border border-emerald-200 rounded-xl py-2.5">
                <img src={LOGOS[store]} className="h-5 max-w-[90px] object-contain" onError={e=>{(e.currentTarget.style.display='none')}} alt={store} />
                <span className="bg-black text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">{store}</span>
                <span className="text-emerald-600 text-[11px] font-bold">✓ تم التعرف على {store}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-[12px] font-bold block mb-1">لقطات سلة المشتريات</label>
            <label className="block border-2 border-dashed border-[#8B5E34] rounded-xl bg-[#FDF8EE] p-6 text-center cursor-pointer">
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={e=>{ if(e.target.files) setPreviews(Array.from(e.target.files).slice(0,5).map(f=>URL.createObjectURL(f))); }} />
              <div className="text-[13px] font-bold">اسحب وأفلت لقطات الشاشة هنا</div>
              <div className="text-[11px] text-gray-500 mt-1">أو انقر للتحميل • حتى 5 صور • PNG أو JPG</div>
            </label>
            {previews.length>0 && <div className="grid grid-cols-3 gap-2 mt-2">{previews.map((s,i)=><img key={i} src={s} className="h-20 w-full object-cover rounded-lg"/>)}</div>}
          </div>

          <button onClick={()=>{ if(!store){ alert('الصق رابط منتج أولاً'); return; } setStep(2); }}
            className="w-full bg-[#4A3728] text-white rounded-xl py-3.5 font-black">التالي: عنوان التوصيل</button>
        </>)}

        {step===2 && (<>
          <div className="flex justify-between items-center">
            <h1 className="font-black text-[18px]">إتمام الطلب</h1>
            <span className="text-[11px] bg-[#F1E6D0] px-2 py-1 rounded-full">الخطوة 2 من 2</span>
          </div>
          <p className="text-[11px] text-gray-500 -mt-2">أدخل تفاصيلك لإتمام التوصيل • {store && `المتجر: ${store}`}</p>

          <div>
            <label className="text-[12px] font-bold block mb-1">الاسم الكامل</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="أدخل اسمك الكامل"
              className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]" />
          </div>
          <div>
            <label className="text-[12px] font-bold block mb-1">رقم الهاتف</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05XX XXX XXX" dir="ltr"
              className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] text-left outline-none focus:ring-2 focus:ring-[#C17A4A]" />
          </div>
          <div>
            <label className="text-[12px] font-bold block mb-1">عنوان التوصيل</label>
            <div className="relative">
              <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="أدخل العنوان بالتفصيل - الشارع، المبنى، الحي..."
                className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 pr-10 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]" />
              <button onClick={getLocation} type="button" title="تحديد موقعي"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#F5B86E] rounded-lg flex items-center justify-center text-lg">📍</button>
            </div>
            <button onClick={getLocation} type="button"
              className="w-full mt-2 border border-[#C17A4A] text-[#A05A2A] rounded-xl py-2.5 text-[13px] font-bold">📍 تحديد الموقع على الخريطة</button>
            {lat && <div className="text-[11px] text-emerald-600 mt-1 font-bold">✓ تم تحديد الموقع: {lat}, {lng}</div>}
          </div>

          <div className="flex gap-2">
            <button onClick={()=>setStep(1)} className="px-4 py-3 border rounded-xl font-bold text-[13px]">رجوع</button>
            <button onClick={submit} disabled={loading} className="flex-1 bg-[#B4662A] text-white rounded-xl py-3.5 font-black">{loading?'جاري...':'متابعة إلى الدفع'}</button>
          </div>
          <div className="text-center text-[10px] text-gray-500">🔒 سيتم مشاركة موقعك فقط لتحديد نقطة التوصيل بدقة • آمن ومحمي</div>
        </>)}
      </div>
    </div>
  );
}
