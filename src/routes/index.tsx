import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#0F4C81] grid place-items-center text-white font-black">☰</div>
          <div className="text-center">
            <div className="font-black text-[#EA580C] text-sm leading-none">SHOPPING AL SHAMEL</div>
            <div className="text-[10px] text-[#0F4C81]">التسوق الشامل • استورد العالم</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-orange-100 rounded-full p-1 text-[11px] font-bold">
            <span className="px-3 py-1 rounded-full bg-[#EA580C] text-white">عميل جديد</span>
            <span className="px-3 py-1 text-slate-600 flex items-center gap-1">A <span className="w-5 h-5 rounded-full bg-white grid place-items-center">🔔</span></span>
          </div>
        </div>
      </header>

      {/* Hero Card */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-l from-[#0A2540] via-[#0F4C81] to-[#1a5a9a] p-6 text-white relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="text-right">
              <div className="inline-block text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full mb-2">AL SHAMEL</div>
              <h1 className="text-xl font-black">السوق الشامل</h1>
              <p className="text-[11px] text-sky-200 mt-1">وسيطك الموثوق للاستيراد من الصين إلى العالم لمنتجاتك المفضلة</p>
            </div>
            <div className="flex gap-2">
              {[ "📄","🛒","👤"].map((e,i)=>(
                <div key={i} className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center text-sm">{e}</div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#FB923C] grid place-items-center shadow-lg">
              <span className="w-8 h-8 rounded-full bg-white grid place-items-center text-[#EA580C] text-sm">▶</span>
            </div>
            <div className="text-right max-w-[70%]">
              <h2 className="text-lg font-black text-orange-300">كيف تطلب؟؟</h2>
              <p className="text-[11px] text-sky-100 leading-5 mt-1">انسخ رابط المنتج من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن للمنتج حتى باب بيتك</p>
            </div>
          </div>

          <div className="mt-5 flex gap-2 flex-wrap">
            <button className="flex-1 bg-[#EA580C] hover:bg-[#F97316] rounded-xl py-2.5 text-xs font-black">🛒 اضغط هنا لطلب منتج</button>
            <button className="px-4 bg-white/10 border border-white/20 rounded-xl py-2.5 text-xs font-bold">🔍 تتبع شحنة</button>
            <button className="px-4 bg-white/10 border border-white/20 rounded-xl py-2.5 text-xs font-bold flex items-center gap-1">💬 <span>تواصل معنا عبر واتساب للحصول على مساعدة</span></button>
          </div>
        </div>
      </section>

      {/* Subtitle */}
      <section className="text-center mt-6 px-4">
        <div className="inline-block text-[10px] bg-sky-100 text-[#0F4C81] px-3 py-1 rounded-full font-bold">💡 نوصل طلبك بالريال والدولار</div>
        <h3 className="mt-2 font-black text-[#0A2540]">تسوق عالمياً، واستلم محلياً</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto leading-5">اختر من بين آلاف المنتجات العالمية الموثوقة. نحن نشتريها لك بكل أمان، ونوصلها إلى باب منزلك بكل سهولة وأمان.</p>
        <div className="text-[10px] text-orange-500 font-bold mt-2">--- تسوق من كافة المتاجر العالمية ---</div>
      </section>

      {/* Stores */}
      <section className="max-w-3xl mx-auto flex justify-center gap-3 mt-4 px-4 flex-wrap">
        {[
          {n:"TEMU",c:"text-[#FA6400]"},
          {n:"TrendYol",c:"text-[#F27A1A]"},
          {n:"SHEIN",c:"text-black"},
          {n:"Amazon",c:"text-[#FF9900]"},
          {n:"AliExpress",c:"text-[#FF4747]"},
        ].map(s=>(
          <div key={s.n} className={`w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 grid place-items-center font-black text-[11px] ${s.c}`}>{s.n}</div>
        ))}
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-3 mt-6 px-4">
        {[
          {t:"أرسل الرابط",d:"انسخ رابط المنتج من أي متجر عالمي",e:"🔗"},
          {t:"اعرف السعر",d:"نوضح لك التكلفة بالريال اليمني",e:"💲"},
          {t:"نشتري لك",d:"نشتري بدلاً عنك ونضمن جودة وتطابق الطلب",e:"🛒"},
          {t:"تابع الشحنة",d:"تتبع مسار شحنتك لحظة بلحظة",e:"🔍"},
        ].map(s=>(
          <div key={s.t} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100 shadow-sm">
            <div className="text-[10px] text-orange-500 font-bold whitespace-nowrap">{s.t} <span className="block text-slate-400 font-normal">{s.d}</span></div>
            <div className="mr-auto w-8 h-8 rounded-full bg-sky-50 grid place-items-center">{s.e}</div>
          </div>
        ))}
        <div className="sm:col-span-2 flex justify-center">
          <div className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100 shadow-sm w-full sm:w-1/2">
            <div className="text-[10px] text-orange-500 font-bold">الاستلام <span className="block text-slate-400 font-normal">توصيل موثوق حتى باب بيتك</span></div>
            <div className="mr-auto w-8 h-8 rounded-full bg-sky-50 grid place-items-center">📦</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex justify-center gap-2 mt-6">
        <button className="px-6 py-2 rounded-full bg-white border text-[11px] font-bold">🛍️ تصفح المنتجات</button>
        <button className="px-6 py-2 rounded-full bg-[#0F4C81] text-white text-[11px] font-black">اطلب الآن 🛒</button>
      </section>

      {/* Reviews */}
      <section className="max-w-5xl mx-auto mt-8 px-4">
        <h4 className="text-center text-[12px] font-black text-[#EA580C]">⭐⭐⭐⭐⭐ آراء وتجارب عملاء الشامل</h4>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {[
            {n:"أحمد الحميري",t:"التجربة ممتازة والشحن سريع. طلبت سماعات ووصلت بحالة ممتازة ومغلفة بعناية."},
            {n:"سارة العتيبي",t:"وأخيراً وسيط يفهم! سعره واضح وتوصيل سريع. أنصح فيه بشدة."},
            {n:"محمد الشمري",t:"أفضل تجربة شراء من الصين. الدعم كان رائع وساعدوني في اختيار المقاس."},
          ].map(r=>(
            <div key={r.n} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
              <div className="text-orange-400 text-[10px]">★★★★★</div>
              <p className="text-[11px] text-slate-600 mt-2 leading-5">{r.t}</p>
              <div className="mt-3 text-[11px] font-black text-[#0F4C81]">{r.n}</div>
              <div className="text-[9px] text-orange-500">عميل موثق</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center mt-10 pb-8 px-4">
        <div className="font-black text-[#EA580C] text-sm">SHOPPING AL SHAMEL 🛒</div>
        <div className="text-[10px] text-[#0F4C81] font-bold">التسوق الشامل • استورد العالم</div>
        <p className="text-[9px] text-slate-400 mt-2 max-w-md mx-auto leading-4">وجهتك الأولى للاستيراد الشخصي من الصين. نضمن لك تجربة تسوق آمنة ومريحة.</p>
        <div className="text-[9px] text-slate-400 mt-1">صنعاء، اليمن • AL SHAMEL © 2026</div>
      </footer>
    </div>
  );
}
