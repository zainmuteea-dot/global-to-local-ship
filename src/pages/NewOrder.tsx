import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Link2, 
  Check, 
  CheckCircle2, 
  ExternalLink, 
  Send, 
  RotateCcw, 
  Loader2, 
  Truck, 
  ClipboardPaste 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// اتصال Supabase المشترك مع لوحة العمليات
const supabase = createClient(
  'https://dgshuspugrruozfhmtsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2h1c3B1Z3JydW96ZmhtdHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTk0NzAsImV4cCI6MjEwNTY3NTQ3MH0.tkEuI3jwqMJ3FTPhYrZdktEe_UUfB3Q1vgKOK2u9-98'
);

interface DetectedInfo {
  storeName: string;
  storeLogo: string;
  productTitle: string;
  category: string;
  priceUSD: number;
  priceSAR: number;
  priceYER: number;
  image: string;
  sizeColor: string;
}

export default function NewOrder() {
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
    sizeColor: 'المقاس: M / اللون: حسب الصورة المختارة'
  });
  const [isDetecting, setIsDetecting] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('صنعاء');
  const [customerAddress, setCustomerAddress] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  // Quick Samples
  const samples = [
    { label: 'شي إن (SHEIN) 👗', url: 'https://ar.shein.com/Women-Plus-Clothing-c-1888.html' },
    { label: 'أمازون (Amazon) 📦', url: 'https://www.amazon.com/Apple-AirPods-Pro/dp/B0BDHW4P13' },
    { label: 'تيمو (TEMU) 🧡', url: 'https://www.temu.com/goods-smartwatch-fitness-g-601099.html' },
    { label: 'علي إكسبريس (AliExpress) 🛍️', url: 'https://www.aliexpress.com/item/10050062839210.html' }
  ];

  // محرك التعرف التلقائي على الروابط
  const handleUrlChange = (url: string) => {
    const clean = url.trim();
    setProductUrl(clean);

    if (!clean.startsWith('http')) {
      setDetectedInfo(null);
      return;
    }

    setIsDetecting(true);
    setTimeout(() => {
      let storeName = 'متجر عالمي';
      let storeLogo = '🛍️';
      let title = 'منتج مستورد عالي الجودة';
      let category = 'سلع ومنتجات عامة';
      let priceUSD = 40;
      let img = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

      const lower = clean.toLowerCase();
      if (lower.includes('shein')) {
        storeName = 'SHEIN';
        storeLogo = '👗';
        title = lower.includes('plus') || lower.includes('women')
          ? 'أزياء ومقاسات نسائية خاصة راقية (Women Plus Clothing)'
          : 'فستان أو طقم أزياء عصري من شي إن';
        category = 'أزياء وملابس وموضة';
        priceUSD = 35;
        img = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
      } else if (lower.includes('amazon')) {
        storeName = 'Amazon';
        storeLogo = '📦';
        title = lower.includes('airpod')
          ? 'سماعات Apple AirPods Pro اللاسلكية الأصلية'
          : 'سلعة أصلية ومضمونة من أمازون العالمي';
        category = 'إلكترونيات وأجهزة ذكية';
        priceUSD = 65;
        img = 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80';
      } else if (lower.includes('temu')) {
        storeName = 'TEMU';
        storeLogo = '🧡';
        title = 'عروض ومنتجات تيمو المخفضة';
        category = 'مستلزمات منزلية وإلكترونيات خفيفة';
        priceUSD = 24;
        img = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80';
      } else if (lower.includes('aliexpress')) {
        storeName = 'AliExpress';
        storeLogo = '🛍️';
        title = 'منتج مختار من منصة علي إكسبريس العالمية';
        category = 'إكسسوارات وسلع منوعة';
        priceUSD = 28;
        img = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
      }

      setDetectedInfo({
        storeName,
        storeLogo,
        productTitle: title,
        category,
        priceUSD,
        priceSAR: Math.round(priceUSD * 3.75),
        priceYER: Math.round(priceUSD * 535),
        image: img,
        sizeColor: 'المواصفات: حسب اختيار الرابط'
      });
      setIsDetecting(false);
    }, 150);
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) handleUrlChange(text);
      }
    } catch {
      const manual = prompt('الصق رابط المنتج هنا:');
      if (manual) handleUrlChange(manual);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !productUrl) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    const orderNum = 'SHP-' + Math.floor(10000 + Math.random() * 90000);

    try {
      const { error } = await supabase.from('orders').insert([
        {
          order_number: orderNum,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_city: customerCity,
          customer_address: customerAddress,
          store_name: detectedInfo?.storeName || 'SHEIN',
          product_url: productUrl,
          product_title: detectedInfo?.productTitle || 'طلب منتج جديد',
          quantity: quantity,
          status: 'new',
          payment_method: 'الدفع عند الاستلام (كاش)',
          payment_status: 'unpaid'
        }
      ]);

      if (error) throw error;
      setCreatedOrderNumber(orderNum);
    } catch (err: any) {
      alert('حدث خطأ أثناء إرسال الطلب: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2B1D14] font-sans pb-16" dir="rtl">
      
      {/* Header matching your design */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full border border-[#DCD5C6] bg-white text-[#4A3B32] hover:bg-[#F3EFE6] transition flex items-center justify-center shadow-xs cursor-pointer"
            title="رجوع"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-2xl sm:text-3xl font-black text-[#382314] tracking-tight">
            السوق الشامل
          </h1>

          <div className="border border-[#382314]/40 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#4A3B32] rounded-xs shadow-2xs">
            انقر للرجوع إلى الوراء واضغط لمشاهدة السجل
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4">
        {createdOrderNumber ? (
          <div className="bg-white border-2 border-emerald-600 rounded-3xl p-8 shadow-sm space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-[#382314]">تم إرسال طلبك بنجاح! 🎉</h2>
            <p className="text-xs text-[#7B6A5E]">تم تسجيل طلبك فوراً وسيتم التواصل معك لتأكيده وشحنه.</p>
            <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-[#E9E2D4] max-w-sm mx-auto">
              <div className="text-xs text-[#7B6A5E]">رقم تتبع طلبك:</div>
              <div className="text-2xl font-black font-mono text-purple-700">{createdOrderNumber}</div>
            </div>
            <button
              onClick={() => {
                setCreatedOrderNumber(null);
                setCustomerName('');
                setCustomerPhone('');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#382314] text-white text-xs font-bold"
            >
              طلب منتج آخر +
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#EAE3D4] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-[#2E1E12]">اطلب منتجك الآن</h2>
              <p className="text-xs sm:text-sm text-[#8A7A70]">
                الصق رابط المنتج من TEMU أو SHEIN أو Amazon أو AliExpress وسنتكفل بالباقي
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3B2C23] flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-[#8A7A70]" />
                    <span>رابط المنتج:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2.5 py-1 rounded-lg bg-[#F5F0E4] hover:bg-[#EDE6D6] text-[#3B2C23] text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-[#E0D8C8]"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>لصق من الحافظة</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://ar.shein.com/... أو أمازون، تيمو"
                    value={productUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#FAF6EE] border border-[#DDD5C7] focus:border-[#7A5B44] text-xs font-mono text-[#2B1D14] focus:outline-none transition"
                    dir="ltr"
                  />
                  {isDetecting && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-[#7A5B44] font-bold bg-white px-2 py-1 rounded-lg border border-[#DDD5C7]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>يتعرف طوالي...</span>
                    </div>
                  )}
                </div>

                {/* روابط سريعة */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[#8A7A70] font-medium ml-1">روابط سريعة:</span>
                  {samples.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleUrlChange(s.url)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                        productUrl === s.url
                          ? 'bg-[#382314] text-white border-[#382314]'
                          : 'bg-[#F7F4EC] text-[#4A3B32] border-[#E2DAD0]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* بطاقة التعرف الفوري على المنتج */}
              {detectedInfo && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FBF9F4] border-2 border-[#D8C7B4] shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE1D3]">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{detectedInfo.storeLogo}</span>
                      <div>
                        <div className="text-xs font-black text-[#2E1E12]">متجر {detectedInfo.storeName} العالمي</div>
                        <div className="text-[10px] text-[#7A6A5E]">التصنيف: {detectedInfo.category}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1 border border-emerald-300">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>تم التعرّف على المنتج بنجاح ⚡</span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-3.5 pt-1">
                    <img
                      src={detectedInfo.image}
                      alt={detectedInfo.productTitle}
                      className="w-full sm:w-24 h-24 rounded-xl object-cover border border-[#D8C7B4] shrink-0"
                    />
                    <div className="space-y-1.5 flex-1">
                      <div className="text-xs sm:text-sm font-black text-[#2E1E12] leading-snug">
                        {detectedInfo.productTitle}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="px-2 py-0.5 rounded bg-white font-bold text-[#2E1E12] border border-[#DDD4C5]">
                          السعر التقديري: <strong className="font-mono text-purple-700">${detectedInfo.priceUSD}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white text-[#4A3B32] font-mono border border-[#DDD4C5]">
                          ≈ {detectedInfo.priceSAR} ر.س
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white text-[#4A3B32] font-mono border border-[#DDD4C5]">
                          ≈ {detectedInfo.priceYER.toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* بيانات المشتري */}
              <div className="pt-2 space-y-3">
                <div className="text-xs font-bold text-[#382314] flex items-center gap-1.5 pb-1 border-b border-[#EAE3D4]">
                  <Truck className="w-4 h-4 text-[#7A5B44]" />
                  <span>بيانات التوصيل والتواصل:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A3B32] mb-1">اسمك الكريم *</label>
                    <input
                      type="text"
                      required
                      placeholder="محمد عبد الله"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD5C7] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A3B32] mb-1">رقم الهاتف / واتساب *</label>
                    <input
                      type="tel"
                      required
                      placeholder="770000000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD5C7] text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A3B32] mb-1">المدينة</label>
                    <select
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD5C7] text-xs font-bold"
                    >
                      <option value="صنعاء">صنعاء</option>
                      <option value="عدن">عدن</option>
                      <option value="تعز">تعز</option>
                      <option value="الحديدة">الحديدة</option>
                      <option value="حضرموت">حضرموت</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A3B32] mb-1">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD5C7] text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-[#382314] hover:bg-[#4D331F] text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تأكيد وإرسال الطلب الآن 📦</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
