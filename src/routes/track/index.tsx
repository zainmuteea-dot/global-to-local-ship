import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, Check, CheckCircle2, DollarSign, ExternalLink, Hash, MapPin, Phone, Plane, Printer, Search, Sparkles, Truck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/track/")({
  head: () => ({ meta: [{ title: "تتبع الطلب — AL SHAMEL SHOPPING" }] }),
  component: TrackPage,
});

const TRACKING_STAGES = [
  { id: 1, title: "استلام الطلب والاعتماد", desc: "تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح", icon: Check },
  { id: 2, title: "الشراء من المتجر الدولي", desc: "تم إتمام عملية الدفع والشراء من المتجر الأصلي", icon: DollarSign },
  { id: 3, title: "وصول المستودع الدولي", desc: "وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا وتجهيز التغليف", icon: Building2 },
  { id: 4, title: "الشحن الدولي (جوي / بحري)", desc: "الشحنة على متن رحلة الشحن الدولي متجهة إلى الجمهورية اليمنية", icon: Plane },
  { id: 5, title: "الوصول لليمن والفرز المحلي", desc: "وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز في المستودع المحلي", icon: MapPin },
  { id: 6, title: "خروج الشحنة مع المندوب للتوصيل", desc: "الشحنة حالياً مع مندوب التوصيل في طريقها لعنوان العميل", icon: Truck },
  { id: 7, title: "تم التسليم بنجاح", desc: "تم استلام الشحنة من قبل العميل بنجاح وسداد الرصيد", icon: Sparkles },
];

function getActiveStageIndex(status: string): number {
  const s = (status || "").toLowerCase();
  if (s.includes("delivered") || s.includes("تسليم")) return 6;
  if (s.includes("out_for_delivery") || s.includes("مندوب") || s.includes("توصيل")) return 5;
  if (s.includes("local_warehouse") || s.includes("يمن") || s.includes("فرز")) return 4;
  if (s.includes("shipped") || s.includes("شحن")) return 3;
  if (s.includes("international_ship") || s.includes("مستودع")) return 2;
  if (s.includes("purchased") || s.includes("processing") || s.includes("شراء")) return 1;
  return 0;
}

export function TrackPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any | null>(null);
  const [notif, setNotif] = useState("");

  useEffect(() => {
    const autoFillPhone = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from("profiles").select("phone").eq("id", session.user.id).maybeSingle();
          if (profile?.phone) { setPhone(profile.phone); return; }
        }
        const localPhone = sessionStorage.getItem("sc_phone") || localStorage.getItem("sc_phone");
        if (localPhone) setPhone(localPhone);
      } catch {}
    };
    autoFillPhone();
  }, []);

  // الإشعار الفوري - داخل المكون
  useEffect(() => {
    if (!order?.trackingCode) return;
    const channel = supabase.channel(`order-${order.trackingCode}`)
     .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        (payload: any) => {
          const newStatus = payload.new?.status;
          if (!newStatus) return;
          setOrder((prev: any) => prev? {...prev, status: newStatus } : prev);
          setNotif(`🚀 تحديث جديد: تم نقل شحنتك إلى مرحلة جديدة`);
          setTimeout(() => setNotif(""), 6000);
        })
     .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.trackingCode]);

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanCode) { setError("يرجى إدخال رقم الطلب"); return; }
    setLoading(true); setError(""); setOrder(null);
    try {
      const { data, error: qErr } = await supabase.from("orders").select("*")
       .or(`tracking_code.ilike.%${cleanCode}%,order_number.ilike.%${cleanCode}%,intl_tracking_number.ilike.%${cleanCode}%`);
      if (qErr) throw qErr;
      if (!data || data.length === 0) { setError("لم يتم العثور على شحنة"); return; }
      const match = data[0];
      setOrder({
        trackingCode: match.tracking_code || match.order_number || cleanCode,
        customerName: match.customer_name || "عميل السوق الشامل",
        phone: match.phone || match.customer_phone || phone,
        status: match.status || "new",
        productName: match.product_name || match.product_title || "شحنة متجر عالمي",
        productLink: match.product_link || match.product_url || "",
        createdAt: match.created_at? new Date(match.created_at).toLocaleDateString("ar-YE", { day: "numeric", month: "long", year: "numeric" }) : "",
      });
    } catch { setError("خطأ بالاتصال"); } finally { setLoading(false); }
  };

  const activeIndex = order? getActiveStageIndex(order.status) : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] to-[#FFF7ED] px-4 pb-14 pt-5 font-sans text-[#0A2540]">
      {notif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0F4C81] text-white px-4 py-3 rounded-2xl shadow-xl font-black text-sm animate-bounce border-2 border-white">
          <span className="w-8 h-8 grid place-items-center bg-[#FF7A00] rounded-xl">✓</span>
          <span>{notif}</span>
        </div>
      )}
      <main className="mx-auto w-full max-w-md">
        <header className="flex items-center justify-between pb-3">
          <Link to="/my-account" className="grid w-11 h-11 place-items-center rounded-2xl bg-white text-[#0F4C81] border-2 border-sky-100"><UserRound className="w-5 h-5" /></Link>
          <div className="text-center"><div className="flex gap-1.5 font-black text-lg"><span className="text-[#0F4C81]">AL SHAMEL</span><span className="text-[#FF7A00]">SHOPPING</span></div><h1 className="text-sm font-black text-[#0F4C81]">تتبع الطلب 📍</h1></div>
          <Link to="/" className="flex items-center gap-1 rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#0F4C81] border-2 border-sky-100"><span>رجوع</span><ArrowRight className="w-4 h-4" /></Link>
        </header>
        <form onSubmit={handleTrack} className="mt-4 rounded-[32px] bg-white p-6 border-2 border-sky-100">
          <div className="mb-4"><label className="mb-1.5 block text-xs font-black text-[#0F4C81]">رقم الطلب</label>
            <div className="flex h-12 items-center rounded-2xl bg-[#F8FAFC] px-4 border-2 border-slate-200"><input value={code} onChange={(e)=>{setCode(e.target.value); setError("");}} placeholder="SQ-892411" className="w-full bg-transparent text-center font-bold outline-none" /><Hash className="w-5 h-5 text-[#0F4C81]" /></div></div>
          <div className="mb-5"><label className="mb-1.5 block text-xs font-black text-[#0F4C81]">رقم الهاتف</label>
            <div className="flex h-12 items-center rounded-2xl bg-[#F8FAFC] px-4 border-2 border-slate-200"><input value={phone} onChange={(e)=>{setPhone(e.target.value); setError("");}} placeholder="774399744" dir="ltr" className="w-full bg-transparent text-center font-bold outline-none" /><Phone className="w-5 h-5 text-[#FF7A00]" /></div></div>
          <button disabled={loading} className="w-full h-12 rounded-2xl bg-[#0F4C81] text-white font-black flex items-center justify-center gap-2"><Search className="w-5 h-5" /><span>{loading? "جاري البحث..." : "تتبع طلبك الآن 🔍"}</span></button>
          {error && <p className="mt-3 text-center text-xs font-bold text-red-600 bg-red-50 p-2 rounded-xl">{error}</p>}
        </form>
        {order && (
          <div className="mt-5 space-y-4">
            <div className="rounded-[32px] bg-white p-5 border-2 border-sky-200">
              <div className="flex justify-between border-b-2 border-sky-100 pb-3"><span className="font-mono font-black text-[#0F4C81]">{order.trackingCode}</span><span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border">✓ تم العثور</span></div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><span className="text-[#0F4C81] font-bold block">اسم العميل:</span><span className="font-black">{order.customerName}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><span className="text-[#0F4C81] font-bold block">الهاتف:</span><span className="font-bold" dir="ltr">{order.phone}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><span className="text-[#0F4C81] font-bold block">الحالة:</span><span className="bg-[#FF7A00] text-white px-2 py-1 rounded-lg font-black">{order.status}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><span className="text-[#0F4C81] font-bold block">التاريخ:</span><span>{order.createdAt}</span></div>
              </div>
              <button onClick={()=>window.print()} className="mt-4 w-full h-11 rounded-2xl border-2 border-[#0F4C81]/20 font-black text-[#0F4C81] flex items-center justify-center gap-2"><Printer className="w-4 h-4" />طباعة السند</button>
            </div>
            <div className="rounded-[32px] bg-white p-5 border-2 border-sky-100">
              <div className="font-black text-[#0F4C81] pb-3 border-b-2 border-sky-100 flex items-center gap-2"><Truck className="w-5 h-5" /> مسار الشحنة 📍</div>
              <div className="mt-4 space-y-5">
                {TRACKING_STAGES.map((step, idx) => {
                  const Icon = step.icon; const done = idx < activeIndex; const cur = idx === activeIndex;
                  return <div key={step.id} className="flex gap-3"><div className={`w-9 h-9 grid place-items-center rounded-2xl text-white shrink-0 ${done? "bg-[#0F4C81]" : cur? "bg-[#FF7A00] animate-pulse" : "bg-slate-200 text-slate-400"}`}><Icon className="w-4 h-4" /></div><div><h3 className={`text-sm font-black ${cur? "text-[#EA580C]" : "text-[#0F4C81]"}`}>{step.title} {cur && "⚡"}</h3><p className="text-xs text-slate-600">{step.desc}</p></div></div>
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
