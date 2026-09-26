import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from 'react';
import { ArrowLeft, Link2, Check, CheckCircle2, Send, Loader2, Truck, ClipboardPaste } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dgshuspugrruozfhmtsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2h1c3B1Z3JydW96ZmhtdHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTk0NzAsImV4cCI6MjEwNTY3NTQ3MH0.tkEuI3jwqMJ3FTPhYrZdktEe_UUfB3Q1vgKOK2u9-98'
);

export const Route = createFileRoute("/new-order")({
  component: NewOrder,
});

function NewOrder() {
  const [productUrl, setProductUrl] = useState('https://ar.shein.com/Women-Plus-Clothing-c-1888.html');
  const [detectedInfo, setDetectedInfo] = useState<any>({
    storeName: 'SHEIN',
    storeLogo: '👗',
    productTitle: 'أزياء ومقاسات نسائية خاصة راقية (Women Plus Clothing)',
    category: 'أزياء وملابس وموضة نسائية',
    priceUSD: 35, priceSAR: 131, priceYER: 18725,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('صنعاء');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  const samples = [
    { label: 'شي إن (SHEIN) 👗', url: 'https://ar.shein.com/Women-Plus-Clothing-c-1888.html' },
    { label: 'أمازون (Amazon) 📦', url: 'https://www.amazon.com/Apple-AirPods-Pro/dp/B0BDHW4P13' },
    { label: 'تيمو (TEMU) 🧡', url: 'https://www.temu.com/goods-smartwatch-fitness-g-601099.html' },
    { label: 'علي إكسبريس (AliExpress) 🛍️', url: 'https://www.aliexpress.com/item/10050062839210.html' }
  ];

  const handleUrlChange = (url: string) => {
    const clean = url.trim();
    setProductUrl(clean);
    if (!clean.startsWith('http')) { setDetectedInfo(null); return; }
    setIsDetecting(true);
    setTimeout(() => {
      let storeName = 'متجر عالمي', storeLogo = '🛍️', title = 'منتج مستورد عالي الجودة';
      let category = 'سلع عامة', priceUSD = 40;
      let img = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
      const lower = clean.toLowerCase();
      if (lower.includes('shein')) {
        storeName='SHEIN'; storeLogo='👗'; title='أزياء ومقاسات نسائية خاصة راقية'; category='أزياء وموضة'; priceUSD=35;
        img='https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
      } else if (lower.includes('amazon')) {
        storeName='Amazon'; storeLogo='📦'; title='سلعة أصلية من أمازون'; category='إلكترونيات'; priceUSD=65;
        img='https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80';
      } else if (lower.includes('temu')) {
        storeName='TEMU'; storeLogo='🧡'; title='عروض تيمو المخفضة'; category='مستلزمات'; priceUSD=24;
        img='https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80';
      } else if (lower.includes('aliexpress')) {
        storeName='AliExpress'; storeLogo='🛍️'; title='منتج من علي إكسبريس'; category='إكسسوارات'; priceUSD=28;
        img='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
      }
      setDetectedInfo({ storeName, storeLogo, productTitle: title, category, priceUSD, priceSAR: Math.round(priceUSD*3.75), priceYER: Math.round(priceUSD*535), image: img });
      setIsDetecting(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName ||!customerPhone) { alert('املأ الحقول'); return; }
    setSubmitting(true);
    const orderNum = 'SHP-' + Math.floor(10000 + Math.random()*90000);
    try {
      const { error } = await supabase.from('orders').insert([{
        order_number: orderNum, customer_name: customerName, customer_phone: customerPhone,
        customer_city: customerCity, store_name: detectedInfo?.storeName,
        product_url: productUrl, product_title: detectedInfo?.productTitle,
        quantity, status: 'new', payment_method: 'كاش عند الاستلام', payment_status: 'unpaid'
      }]);
      if (error) throw error;
      setCreatedOrderNumber(orderNum);
    } catch(err:any){ alert(err.message); }
    finally{ setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-16" dir="rtl">
      <main className="max-w-2xl mx-auto px-4 pt-6">
        {createdOrderNumber? (
          <div className="bg-white border-2 border-emerald-600 rounded-3xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-black">تم إرسال طلبك! 🎉</h2>
            <div className="text-2xl font-mono font-black text-purple-700">{createdOrderNumber}</div>
            <button onClick={()=>{setCreatedOrderNumber(null); setCustomerName(''); setCustomerPhone('');}} className="px-5 py-2.5 rounded-xl bg-[#382314] text-white text-xs font-bold">طلب آخر +</button>
          </div>
        ) : (
          <div className="bg-white border rounded-3xl p-6 space-y-5">
            <h2 className="text-2xl font-black text-center">اطلب منتجك الآن</h2>
            <input type="url" value={productUrl} onChange={(e)=>handleUrlChange(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-[#FAF6EE] border text-xs font-mono" dir="ltr" />
            <div className="flex flex-wrap gap-2">{samples.map(s=><button key={s.label} type="button" onClick={()=>handleUrlChange(s.url)} className="px-2 py-1 border rounded-lg text-[11px] font-bold bg-gray-50">{s.label}</button>)}</div>
            {detectedInfo && <div className="p-4 bg-[#FBF9F4] border-2 rounded-2xl flex gap-3"><img src={detectedInfo.image} className="w-20 h-20 rounded-xl object-cover"/><div><div className="font-black text-xs">{detectedInfo.storeName} - {detectedInfo.productTitle}</div><div className="text-xs mt-1">${detectedInfo.priceUSD} ≈ {detectedInfo.priceYER.toLocaleString()} ر.ي</div></div></div>}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="اسمك *" value={customerName} onChange={e=>setCustomerName(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border text-xs" />
              <input placeholder="هاتف *" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border text-xs" dir="ltr" />
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 bg-[#382314] text-white font-black rounded-2xl">{submitting?'جاري الإرسال...':'تأكيد وإرسال الطلب 📦'}</button>
          </div>
        )}
      </main>
    </div>
  );
}
