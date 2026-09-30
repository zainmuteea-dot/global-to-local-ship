import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  Bell,
  UserRound,
  ShoppingCart,
  Menu,
  Search,
  Play,
  ShieldCheck,
  Link2,
  CircleDollarSign,
  Package,
  Truck,
  FileText,
  User,
  ShoppingBag,
  Sparkles,
  Star,
  Hand,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f8fb] text-[#0d2238] font-sans">
      {/* ===== الهيدر العلوي ===== */}
      <header className="max-w-[1100px] mx-auto flex items-center justify-between px-4 py-3">
        {/* اليمين: القائمة + الشعار */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0d3a62] to-[#1a6db5] grid place-items-center text-white shadow-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-[#0d2238] grid place-items-center">
                <ShoppingCart className="w-6 h-6 text-white" />
                <div className="absolute -bottom-1 flex gap-0.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="font-black text-[15px] tracking-tight">
                <span className="text-orange-500">SHOPPING</span>{" "}
                <span className="text-[#0d3a62]">AL SHAMEL</span>
              </div>
              <div className="text-[11px] text-[#0d3a62] font-bold">السوق الشامل • وسيطكم العالمي</div>
            </div>
          </div>
        </div>

        {/* اليسار */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-[12px] font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            زين مطيع | متصل
          </div>
          <button className="w-10 h-10 rounded-full bg-white shadow grid place-items-center">
            <UserRound className="w-5 h-5 text-slate-600" />
          </button>
          <button className="relative w-10 h-10 rounded-full bg-white shadow grid place-items-center">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-white shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 text-white text-[13px] font-black shadow-lg shadow-orange-200">
            <ShoppingCart className="w-4 h-4" />
            اطلب الآن
          </button>
        </div>
      </header>

      {/* ===== بطاقة الهيرو ===== */}
      <section className="max-w-[1020px] mx-auto px-4">
        <div className="rounded-3xl bg-[#0d2238] text-white p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-bl from-[#123a62]/60 to-transparent pointer-events-none" />

          <div className="relative flex flex-col md:flex-row justify-between gap-6">
            {/* يمين الهيرو */}
            <div className="flex-1">
              <div className="flex gap-3 justify-start mb-5">
                {[
                  { icon: User, label: "حسابي" },
                  { icon: ShoppingBag, label: "الطلب" },
                  { icon: FileText, label: "الشحن" },
                ].map((it, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 grid place-items-center backdrop-blur">
                      <it.icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-[11px] text-slate-300">{it.label}</span>
                  </div>
                ))}
              </div>

              <h2 className="text-3xl font-black mb-2">
                كيف تطلب<span className="text-orange-400">؟؟</span>
              </h2>
              <p className="text-[13px] text-slate-300 leading-relaxed max-w-[420px]">
                انسخ رابط أي منتج تريده من أي موقع عالمي وتستلم الشراء والفحص والشحن والشحن حتى باب بيتك
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 font-black text-[14px] shadow-lg shadow-orange-900/30">
                  <Hand className="w-5 h-5" />
                  اضغط هنا لطلب منتج
                </button>
                <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-[13px] font-bold backdrop-blur">
                  <Search className="w-4 h-4" />
                  تتبع شحنة سابقة
                </button>
              </div>
            </div>

            {/* يسار الهيرو */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 text-[10px] font-black">AL SHAMEL</span>
                <h3 className="text-xl font-black">السوق الشامل</h3>
              </div>
              <p className="text-[12px] text-slate-300 mb-5">وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية</p>

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 grid place-items-center shadow-xl ring-4 ring-white/10 cursor-pointer hover:scale-105 transition">
                <div className="w-10 h-10 rounded-full bg-white grid place-items-center">
                  <Play className="w-5 h-5 text-orange-600 fill-orange-600 mr-[-2px]" />
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-[12px]">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                ضمان استرجاع 100% في حال عدم مطابقة المنتج
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== العناوين ===== */}
      <section className="text-center mt-10 px-4">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[12px] text-[#0d3a62] font-bold mb-3">
          <Sparkles className="w-4 h-4 text-orange-500" />
          خدمة الشراء والوساطة الأولى في اليمن
        </div>
        <h1 className="text-3xl font-black text-[#0d2238]">تسوّق عالمياً، واستلم محلياً</h1>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          اطلب من أي مكان في العالم ويوصلك لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 mb-5">
          <div className="h-[2px] w-10 bg-orange-400 rounded" />
          <span className="text-[13px] font-bold text-[#0d2238]">نستورد لك من أشهر المتاجر العالمية</span>
          <div className="h-[2px] w-10 bg-orange-400 rounded" />
        </div>

        <div className="flex justify-center gap-3 flex-wrap">
          {[
            { n: "AliExpress", c: "text-red-500" },
            { n: "Amazon", c: "text-[#ff9900]" },
            { n: "SHEIN", c: "text-black" },
            { n: "TrendYol", c: "text-orange-500" },
            { n: "TEMU", c: "text-orange-600" },
          ].map((s) => (
            <div key={s.n} className={`w-[88px] h-[88px] bg-white rounded-2xl shadow-sm border border-slate-100 grid place-items-center font-black text-[14px] ${s.c}`}>
              {s.n}
            </div>
          ))}
        </div>
      </section>

      {/* ===== الخطوات الخمس ===== */}
      <section className="max-w-[900px] mx-auto px-4 mt-10">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { n: 1, t: "إرسل رابط المنتج", d: "انسخ رابط المنتج من أي متجر عالمي", icon: Link2 },
            { n: 2, t: "اعرف السعر", d: "توضيح لك التكلفة بالريال اليمني أو الدولار", icon: CircleDollarSign },
            { n: 3, t: "نشتري لك", d: "نشتري بلا عمولات ونفحص جودة وتغليف الطلب", icon: ShoppingCart },
            { n: 4, t: "تتبع الشحنة", d: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع", icon: Search },
          ].map((s) => (
            <div key={s.n} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <div className="inline-block px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[11px] font-black mb-1">خطوة {s.n}</div>
                <h4 className="font-black text-[15px]">{s.t}</h4>
                <p className="text-[12px] text-slate-500 mt-1">{s.d}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 grid place-items-center shrink-0">
                <s.icon className="w-6 h-6 text-[#1a6db5]" />
              </div>
            </div>
          ))}
        </div>
        <div className="max-w-[420px] mx-auto mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <div className="inline-block px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[11px] font-black mb-1">خطوة 5</div>
              <h4 className="font-black text-[15px]">الاستلام</h4>
              <p className="text-[12px] text-slate-500 mt-1">توصيل شحنتك حتى باب بيتك في كافة المحافظات</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 grid place-items-center shrink-0">
              <Truck className="w-6 h-6 text-[#1a6db5]" />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <button className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#0d3a62] text-white font-black text-[14px] shadow-lg">
            <ShoppingCart className="w-5 h-5" />
            اطلب الآن فوراً
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-blue-100 text-[#0d3a62] font-bold text-[14px]">
            <Search className="w-4 h-4 text-orange-500" />
            تتبع شحنتك الآن
          </button>
        </div>
      </section>

      {/* ===== آراء العملاء ===== */}
      <section className="max-w-[1000px] mx-auto px-4 mt-12 pb-16">
        <h2 className="text-center font-black text-[18px] flex items-center justify-center gap-2">
          <span className="flex text-orange-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-orange-400" />
            ))}
          </span>
          آراء وتجارب عملائنا الكرام
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            { city: "تعز", text: "التجربة كانت ممتازة، طلبت شحنة ملابس من SHEIN، خطوة بخطوة وتابعها لحتى وصلت. المصداقية والأمانة." },
            { city: "عدن", text: "وصلت لي الشحنة بسرعة وشحن موثوق من امازون، خدمة ممتازة وتواصل ممتاز عبر الواتساب." },
            { city: "صنعاء", text: "اشتريت لأهلي لابتوب من شي ان، التغليف كان راقي وسريع والتوصيل وصل لباب البيت، دعم فني ممتاز." },
          ].map((r, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex justify-center text-orange-400 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-orange-400" />
                ))}
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed text-center">"{r.text}"</p>
              <div className="text-center text-[11px] text-slate-400 mt-4">— عميل من {r.city} —</div>
            </div>
          ))}
        </div>
      </section>

      {/* القائمة الجانبية */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black mb-4">القائمة</h3>
            {["اطلب الآن", "تتبع شحنة", "حسابي", "الشحن"].map((it) => (
              <div key={it} className="p-3 rounded-xl hover:bg-slate-50 font-bold text-[14px] cursor-pointer">{it}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Index;
