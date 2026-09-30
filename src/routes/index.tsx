// src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Search,
  ShoppingCart,
  UserRound,
  Link2,
  DollarSign,
  PackageCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل | AL SHAMEL SHOPPING — وسيط الشراء العالمي في اليمن" },
      { name: "description", content: "وسيط الشراء والاستيراد المعتمد في اليمن من SHEIN وAmazon وTEMU وAliExpress وTrendyol حتى باب بيتك." },
    ],
  }),
  component: Index,
});

function AlShamelLogo({ className = "size-10" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${className} bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0`}>🛒</div>
      <div className="flex flex-col text-right">
        <span className="text-[13px] font-black text-[#0F4C81] tracking-tight leading-none">
          SHOPPING <span className="text-[#EA580C]">AL SHAMEL</span>
        </span>
        <span className="text-[10px] font-bold text-sky-800 mt-1">السوق الشامل - وسيطكم العالمي</span>
      </div>
    </div>
  );
}

export function Index() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setUserName(session.user.user_metadata?.full_name || "عميلنا العزيز");
      }
    });
  }, []);

  const isLoggedIn =!!user;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-white font-['Cairo',sans-serif]">
      {/* ===== الهيدر ===== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><AlShamelLogo className="size-11" /></Link>
          <div className="flex items-center gap-2">
            {isLoggedIn? (
              <>
                <Link to="/my-account" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0F4C81] text-xs font-bold">
                  <UserRound className="size-3.5 text-[#0284C7]" /><span>مرحباً ({userName})</span>
                </Link>
                <Link to="/notifications" className="p-2 rounded-full border border-slate-200 bg-white text-slate-600"><Bell className="size-4" /></Link>
              </>
            ) : (
              <Link to="/login" className="px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0F4C81] text-xs font-bold">تسجيل الدخول</Link>
            )}
            <Link to="/new-order" className="flex items-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">
              <ShoppingCart className="size-3.5" /><span>اطلب الآن</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* ===== النصف الأول : الهيرو ===== */}
        <div className="relative rounded-[2rem] bg-gradient-to-bl from-[#0A2540] via-[#0F4C81] to-[#0284C7] p-6 md:p-8 text-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#EA580C] text-white text-[10px] font-black px-2 py-0.5 rounded-md">AL SHAMEL</span>
                <span className="text-xl md:text-2xl font-black">السوق الشامل</span>
              </div>
              <p className="text-[11px] text-sky-200 mt-1">وسيط الشراء والاستيراد المعتمد في اليمن</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="text-right">
              <h1 className="text-3xl md:text-4xl font-black mb-3">كيف تطلب؟؟ <span className="text-orange-400">؟</span></h1>
              <p className="text-sm text-sky-100 leading-7 mb-6">انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى باب بيتك.</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/new-order" className="inline-flex items-center gap-2 bg-gradient-to-l from-[#EA580C] to-[#F97316] px-6 py-3 rounded-2xl font-bold text-sm shadow-lg"><ShoppingCart className="size-4" /> ابدأ طلبك الآن</Link>
                <Link to="/track" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-6 py-3 rounded-2xl font-bold text-sm"><Search className="size-4" /> تتبع شحنتك</Link>
              </div>
            </div>
            <div className="flex md:justify-start justify-center">
              <div className="bg-[#FFF7ED] rounded-3xl p-6 w-full max-w-[300px]"><AlShamelLogo className="size-14" /></div>
            </div>
          </div>
        </div>

        {/* ===== النصف الثاني ===== */}
        <section className="text-center mt-10">
          <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0284C7] text-[11px] font-bold px-4 py-1.5 rounded-full">🛒 خدمة الشراء والوساطة الأولى في اليمن</span>
          <h2 className="text-[26px] font-black text-[#0A2540] mt-3">تسوّق عالمياً، واستلم محلياً</h2>
          <p className="text-[12px] text-slate-500 mt-2 leading-6 max-w-md mx-auto">اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية</p>
        </section>

        <div className="mt-6">
          <p className="text-center text-[11px] font-black text-slate-600 mb-4"><span className="text-[#F97316]">—</span> تسوق الآن من أشهر المتاجر العالمية <span className="text-[#F97316]">—</span></p>
          <div className="flex flex-wrap justify-center gap-3" dir="ltr">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#FF5000]">TEMU</div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#F27A1A]">TrendYol</div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-black">SHEIN</div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#FF9900]">Amazon</div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-[90px] py-5 text-center font-black text-[13px] text-[#E62E04]">AliExpress</div>
          </div>
        </div>

        <div className="mt-6 max-w-3xl mx-auto" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { t: "أرسل الرابط", d: "انسخ رابط المنتج من أي متجر عالمي", s: "خطوة 1", I: Link2 },
              { t: "اعرف السعر", d: "نوضح لك التكلفة بالريال اليمني أو الدولار", s: "خطوة 2", I: DollarSign },
              { t: "نشتري لك", d: "نشتري بدلاً عنك ونفحص جودة وتطابق الطلب", s: "خطوة 3", I: ShoppingCart },
              { t: "تتبع الشحنة", d: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع", s: "خطوة 4", I: Search },
            ].map((x) => (
              <div key={x.t} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
                <div className="text-right flex-1">
                  <p className="text-[13px] font-black text-[#0F4C81]">{x.t} <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">{x.s}</span></p>
                  <p className="text-[11px] text-slate-500 mt-1">{x.d}</p>
                </div>
                <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><x.I className="size-5" /></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mt-3 max-w-[500px] mx-auto flex items-center gap-3 shadow-sm">
            <div className="text-center flex-1">
              <p className="text-[13px] font-black text-[#0F4C81]">الاستلام <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mr-1">خطوة 5</span></p>
              <p className="text-[11px] text-slate-500 mt-1">توصيل موثوق حتى باب بيتك في كافة المحافظات</p>
            </div>
            <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><PackageCheck className="size-5" /></div>
          </div>
          <div className="flex justify-center gap-3 mt-5">
            <Link to="/new-order" className="bg-[#0F4C81] text-white text-[13px] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2"><ShoppingCart className="size-4" /> اطلب الآن فوراً</Link>
            <Link to="/track" className="bg-white border border-slate-200 text-[#0F4C81] text-[13px] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2"><Search className="size-4" /> تتبع شحنتك الآن</Link>
          </div>
        </div>

        <section className="mt-10 max-w-4xl mx-auto">
          <h3 className="text-center text-[16px] font-black text-[#0F4C81] mb-6">⭐⭐⭐⭐⭐ آراء وتجارب عملائنا الكرام</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
              <div className="text-[#F59E0B] text-[12px] mb-2">★★★★★</div>
              <p className="text-[11px] text-slate-600 leading-6">"التجربة فاقت التوقعات، تتبعت شحنتي خطوة بخطوة والتغليف كان فائق الجودة والحماية."</p>
              <p className="text-[12px] font-black text-[#0F4C81] mt-3">يوسف العزاني</p><p className="text-[10px] text-slate-400">صنعاء</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
              <div className="text-[#F59E0B] text-[12px] mb-2">★★★★★</div>
              <p className="text-[11px] text-slate-600 leading-6">"وأخيراً لقينا وسيط شحن رسمي وموثوق يوصل لعندنا! خدمة ممتازة وتجاوب فوري عبر الواتساب."</p>
              <p className="text-[12px] font-black text-[#0F4C81] mt-3">أسماء السعدي</p><p className="text-[10px] text-slate-400">عدن</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
              <div className="text-[#F59E0B] text-[12px] mb-2">★★★★★</div>
              <p className="text-[11px] text-slate-600 leading-6">"اشتريت لعيالي طلبات من شي إن، التعامل كان راقي وسريع والتوصيل وصل لباب البيت."</p>
              <p className="text-[12px] font-black text-[#0F4C81] mt-3">رامي راجح</p><p className="text-[10px] text-slate-400">حضرموت</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center mt-10">
        <p className="font-black text-sm" dir="ltr"><span className="text-[#F97316]">SHOPPING</span> <span className="text-[#0F4C81]">AL SHAMEL</span> 🛒</p>
        <p className="text-[11px] text-[#0284C7] font-bold mt-1">السوق الشامل - وسيطكم العالمي</p>
        <p className="text-[11px] text-slate-500 mt-1">وسيطكم المعتمد للشراء والاستيراد من كافة المتاجر العالمية</p>
        <p className="text-[10px] text-slate-400 mt-2" dir="ltr">جميع الحقوق محفوظة © 2026 — AL SHAMEL SHOPPING</p>
      </footer>
    </div>
  );
}
