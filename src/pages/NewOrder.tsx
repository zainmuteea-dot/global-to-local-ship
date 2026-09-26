import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Link2, Check, CheckCircle2, Send, Loader2, Truck, ClipboardPaste } from "lucide-react";

export const Route = createFileRoute("/new-order")({
  component: NewOrder,
});

interface DetectedInfo {
  storeName: string;
  storeLogo: string;
  productTitle: string;
  category: string;
  priceUSD: number;
  priceSAR: number;
  priceYER: number;
  image: string;
}

function NewOrder() {
  const [productUrl, setProductUrl] = useState('https://ar.shein.com/Women-Plus-Clothing-c-1888.html');
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>({
    storeName: 'SHEIN',
    storeLogo: '👗',
    productTitle: 'أزياء ومقاسات نسائية خاصة راقية (Women Plus Clothing)',
    category: 'أزياء وملابس وموضة نسائية',
    priceUSD: 35,
    priceSAR: 131,
    priceYER: 18725,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('صنعاء');
  const [customerAddress, setCustomerAddress] = useState('');
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
      let storeName = 'متجر عالمي'; let storeLogo = '🛍️'; let title = 'منتج مستورد عالي الجودة';
      let category = 'سلع ومنتجات عامة'; let priceUSD = 40;
      let img = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
      const lower = clean.toLowerCase();
      if (lower.includes('shein')) { storeName='SHEIN'; storeLogo='👗'; title='أزياء ومقاسات نسائية خاصة راقية'; category='أزياء وملابس وموضة'; priceUSD=35; img='https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80'; }
      else if (lower.includes('amazon')) { storeName='Amazon'; storeLogo='📦'; title='سلعة أصلية من أمازون العالمي'; category='إلكترونيات وأجهزة ذكية'; priceUSD=65; img='https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80'; }
      else if (lower.includes('temu')) { storeName='TEMU'; storeLogo='🧡'; title='عروض ومنتجات تيمو المخفضة'; category='مستلزمات منزلية'; priceUSD=24; img='https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80'; }
      else if (lower.includes('aliexpress')) { storeName='AliExpress'; storeLogo='🛍️'; title='منتج مختار من علي إكسبريس'; category='إكسسوارات وسلع منوعة'; priceUSD=28; img='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'; }
      setDetectedInfo({ storeName, storeLogo, productTitle: title, category, priceUSD, priceSAR: Math.round(priceUSD*3.75), priceYER: Math.round(priceUSD*535), image: img });
      setIsDetecting(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName ||!customerPhone ||!productUrl) { alert('يرجى ملء جميع الحقول المطلوبة'); return; }
    setSubmitting(true);
    const orderNum = 'SHP-' + Math.floor(10000 + Math.random() * 90000);
    try {
      const { error } = await supabase.from('orders').insert([{
        order_number: orderNum, customer_name: customerName, customer_phone: customerPhone,
        customer_city: customerCity, customer_address: customerAddress,
        store_name: detectedInfo?.storeName || 'SHEIN', product_url: productUrl,
        product_title: detectedInfo?.productTitle || 'طلب منتج جديد',
        quantity, status: 'new', payment_method: 'الدفع عند الاستلام (كاش)', payment_status: 'unpaid'
      }]);
      if (error) throw error;
      setCreatedOrderNumber(orderNum);
    } catch (err: any) { alert('حدث خطأ: ' + err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2B1D14] pb-16" dir="rtl">
      <header className="max-w-5xl mx-auto px-4 pt-5 pb-6 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full border bg-white flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-black">السوق الشامل</h1>
        <div className="w-10" />
      </header>
      <main className="max-w-2xl mx-auto px-4">
        {createdOrderNumber? (
          <div className="bg-white border-2 border-emerald-600 rounded-3xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-black">تم إرسال طلبك بنجاح! 🎉</h2>
            <div className="p-4 bg-[#FAF7F0] rounded-2xl border"><div className="text-xs text-gray-500">رقم التتبع:</div><div className="text-2xl font-black font-mono text-purple-700">{createdOrderNumber}</div></div>
            <button onClick={()=>setCreatedOrderNumber(null)} className="px-5 py-2.5 rounded-xl bg-[#382314] text-white text-xs font-bold">طلب منتج آخر +</button>
          </div>
        ) : (
          <div className="bg-white border rounded-3xl p-6 space-y-6">
            <div className="text-center"><h2 className="text-2xl font-black">اطلب منتجك الآن</h2><p className="text-xs text-gray-500">الصق رابط المنتج من TEMU أو SHEIN أو Amazon وسنتكفل بالباقي</p></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold flex items-center gap-1"><Link2 className="w-4 h-4"/> رابط المنتج:</label>
                <input type="url" required value={productUrl} onChange={(e)=>handleUrlChange(e.target.value)} dir="ltr" className="w-full mt-2 px-4 py-3.5 rounded-2xl bg-[#FAF6EE] border text-xs font-mono" />
                <div className="flex flex-wrap gap-1.5 mt-2">{samples.map(s=><button key={s.label} type="button" onClick={()=>handleUrlChange(s.url)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-[#F7F4EC]">{s.label}</button>)}</div>
              </div>
              {detectedInfo && (
                <div className="p-4 rounded-2xl bg-[#FBF9F4] border-2 space-y-3">
                  <div className="flex items-center gap-2"><span className="text-2xl">{detectedInfo.storeLogo}</span><div><div className="text-xs font-black">متجر {detectedInfo.storeName}</div><div className="text-[10px] text-gray-500">{detectedInfo.category}</div></div><span className="mr-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1"><Check className="w-3 h-3"/> تم التعرف ⚡</span></div>
                  <div className="flex gap-3"><img src={detectedInfo.image} className="w-24 h-24 rounded-xl object-cover border" /><div><div className="text-sm font-black">{detectedInfo.productTitle}</div><div className="text-xs mt-2">${detectedInfo.priceUSD} ≈ {detectedInfo.priceYER.toLocaleString()} ر.ي</div></div></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="اسمك الكريم *" required value={customerName} onChange={e=>setCustomerName(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border text-xs" />
                <input placeholder="رقم الهاتف *" required value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border text-xs font-mono" dir="ltr" />
                <select value={customerCity} onChange={e=>setCustomerCity(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border text-xs font-bold"><option>صنعاء</option><option>عدن</option><option>تعز</option><option>الحديدة</option><option>حضرموت</option></select>
                <input type="number" min="1" value={quantity} onChange={e=>setQuantity(parseInt(e.target.value)||1)} className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border text-xs" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 bg-[#382314] text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">{submitting? <Loader2 className="animate-spin"/> : <><Send className="w-4 h-4"/> تأكيد وإرسال الطلب 📦</>}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
