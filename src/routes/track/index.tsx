import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import {
  Search, Plane, Truck, CheckCircle2, MapPin,
  DollarSign, Building, Phone, ArrowRight, Loader2, Bell, X, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// نغمة رنين الهاتف
const playPhoneRingSound = () => {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
    const now = ctx.currentTime;
    [{freq:587.33,d:0},{freq:880,d:0.12},{freq:1174.66,d:0.26}].forEach((t,i)=>{
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type='sine'; osc.frequency.setValueAtTime(t.freq, now+t.d);
      g.gain.setValueAtTime(0.001, now+t.d);
      g.gain.exponentialRampToValueAtTime(0.4, now+t.d+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now+t.d+0.4);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now+t.d); osc.stop(now+t.d+0.45);
    });
  } catch {}
};

export type OrderStatus = 'new'|'accepted'|'pricing'|'priced_waiting_pay'|'purchased'|'processing'|'international_ship'|'shipped'|'local_warehouse'|'out_for_delivery'|'delivered'|'cancelled';

export function TrackRouteComponent() {
  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [order, setOrder] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pinnedNotification, setPinnedNotification] = useState<{show:boolean; stageTitle:string; orderNumber:string}|null>(null);

  const trackingSteps = [
    { title:'استلام الطلب والاعتماد', desc:'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح', icon:CheckCircle2, targetStatus:'new', active:['new','accepted','pricing','priced_waiting_pay','purchased','processing','international_ship','shipped','local_warehouse','out_for_delivery','delivered'], current:['new','accepted','pricing'] },
    { title:'الشراء من المتجر الدولي', desc:'تم إتمام عملية الدفع والشراء من المتجر الأصلي', icon:DollarSign, targetStatus:'purchased', active:['purchased','processing','international_ship','shipped','local_warehouse','out_for_delivery','delivered'], current:['purchased','processing'] },
    { title:'وصول المستودع الدولي', desc:'وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا', icon:Building, targetStatus:'international_ship', active:['international_ship','shipped','local_warehouse','out_for_delivery','delivered'], current:['international_ship'] },
    { title:'الشحن الدولي (جوي / بحري)', desc:'الشحنة متجهة إلى الجمهورية اليمنية', icon:Plane, targetStatus:'shipped', active:['shipped','local_warehouse','out_for_delivery','delivered'], current:['shipped'] },
    { title:'الوصول لليمن والفرز المحلي', desc:'اجتازت التخليص الجمركي وجاري الفرز محلياً', icon:MapPin, targetStatus:'local_warehouse', active:['local_warehouse','out_for_delivery','delivered'], current:['local_warehouse'] },
    { title:'خروج الشحنة مع المندوب للتوصيل', desc:'الشحنة مع مندوب التوصيل', icon:Truck, targetStatus:'out_for_delivery', active:['out_for_delivery','delivered'], current:['out_for_delivery'] },
    { title:'تم التسليم بنجاح', desc:'تم الاستلام بنجاح', icon:Sparkles, targetStatus:'delivered', active:['delivered'], current:['delivered'] },
  ];

  const handleSearch = async (o?:string, p?:string) => {
    const oQ = (o!==undefined?o:orderQuery).trim().toUpperCase();
    const pQ = (p!==undefined?p:phoneQuery).trim();
    if(!oQ &&!pQ) return;
    setLoading(true); setHasSearched(true);
    try{
      let q = supabase.from('orders').select('*');
      if(oQ) q = q.or(`order_number.ilike.%${oQ}%,tracking_code.ilike.%${oQ}%,intl_tracking_number.ilike.%${oQ}%`);
      else q = q.or(`customer_phone.ilike.%${pQ}%,phone.ilike.%${pQ}%`);
      const {data} = await q.order('created_at',{ascending:false}).limit(1);
      if(data?.length){
        const r=data[0];
        setOrder({ id:r.id, orderNumber:r.order_number||r.tracking_code, intlTrackingNumber:r.intl_tracking_number||r.tracking_code, customerName:r.customer_name||'العميل', customerPhone:r.customer_phone||r.phone||'', status:r.status||'new', createdAt:r.created_at });
      } else setOrder(null);
    }catch{ setOrder(null); } finally{ setLoading(false); }
  };

  useEffect(()=>{
    const autoInit = async ()=>{
      let aP="", aO="";
      const prm = new URLSearchParams(window.location.search);
      aO = prm.get('order')||prm.get('tracking')||'';
      aP = prm.get('phone')||'';
      try{
        const {data:{session}} = await supabase.auth.getSession();
        if(!aP && session?.user){
          const {data:prof}=await supabase.from("profiles").select("phone").eq("id",session.user.id).maybeSingle();
          if(prof?.phone) aP=prof.phone;
        }
        if(!aP) aP=sessionStorage.getItem("sc_phone")||localStorage.getItem("sc_phone")||"";
      }catch{}
      if(aO) setOrderQuery(aO); if(aP) setPhoneQuery(aP);
      if(aO||aP) handleSearch(aO,aP);
    };
    autoInit();
  },[]);

  useEffect(()=>{
    if(!order?.id) return;
    const ch = supabase.channel(`order-${order.id}`)
     .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:`id=eq.${order.id}`},
      (pl:any)=>{
        const ns = pl.new?.status; if(!ns) return;
        const st = trackingSteps.find(s=>s.targetStatus===ns);
        setOrder((pr:any)=>pr?{...pr,status:ns}:pr);
        playPhoneRingSound();
        setPinnedNotification({show:true, stageTitle:st?.title||ns, orderNumber:order.orderNumber});
        setTimeout(()=>setPinnedNotification(null), 8000);
      }).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[order?.id]);

  const isActive = (s:any)=> s.active.includes(order?.status);
  const isCur = (s:any)=> s.current.includes(order?.status);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#F0F7FF] to-[#FFF7ED] pb-20 font-sans text-[#0A2540]">
      {pinnedNotification?.show && (
        <div className="fixed top-4 left-4 right-4 z-[9999] max-w-lg mx-auto">
          <div onClick={()=>setPinnedNotification(null)} className="bg-white border-2 border-[#0F4C81] rounded-3xl p-4 shadow-xl cursor-pointer">
            <div className="flex gap-3 items-start">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7A00] text-white grid place-items-center"><Bell className="w-6 h-6 animate-bounce"/></div>
              <div className="flex-1">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black bg-orange-50 text-[#EA580C] px-2 py-0.5 rounded-full border">إشعار فوري 🔔 #{pinnedNotification.orderNumber}</span><X className="w-4 h-4"/></div>
                <h4 className="text-sm font-black text-[#0F4C81] mt-1">تم تحديث شحنتك! ✨</h4>
                <p className="text-xs font-bold">وصلت إلى: <span className="text-[#EA580C] font-black">[{pinnedNotification.stageTitle}]</span></p>
                <p className="text-[11px] mt-2 text-[#0F4C81]">👆 اضغط للإغلاق</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="max-w-2xl mx-auto pt-6 px-4 flex justify-between items-center">
        <button onClick={()=>window.location.href='/'} className="px-4 py-2 rounded-2xl bg-white border-2 text-xs font-black text-[#0F4C81] flex items-center gap-1"><ArrowRight className="w-4 h-4"/>رجوع</button>
        <div className="text-center"><div className="font-black text-lg"><span className="text-[#0F4C81]">AL SHAMEL </span><span className="text-[#FF7A00]">SHOPPING</span></div><p className="text-[11px] font-bold text-slate-500">تتبع الشحنات 📍</p></div>
        <div className="w-16"/>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-4 space-y-6">
        <div className="bg-white border-2 border-sky-100 rounded-[32px] p-6">
          <form onSubmit={(e)=>{e.preventDefault();handleSearch();}} className="space-y-4">
            <div><label className="text-xs font-black text-[#0F4C81] block mb-1">رقم الشحنة</label><input value={orderQuery} onChange={e=>setOrderQuery(e.target.value)} placeholder="SQ-892411" className="w-full h-12 rounded-2xl bg-[#F8FAFC] border-2 px-4 text-center font-bold"/></div>
            <div><label className="text-xs font-black text-[#0F4C81] block mb-1">رقم الهاتف</label><input value={phoneQuery} onChange={e=>setPhoneQuery(e.target.value)} dir="ltr" placeholder="774399744" className="w-full h-12 rounded-2xl bg-[#F8FAFC] border-2 px-4 text-center font-bold"/></div>
            {hasSearched &&!order &&!loading && <p className="text-xs text-center font-bold text-red-600 bg-red-50 p-2 rounded-xl">لم يتم العثور على شحنة</p>}
            <button disabled={loading} className="w-full h-12 rounded-2xl bg-[#0F4C81] text-white font-black flex items-center justify-center gap-2">{loading?<Loader2 className="animate-spin w-5 h-5"/>:<><Search className="w-5 h-5"/>تتبع طلبك الآن 🔍</>}</button>
          </form>
        </div>

        {order && (
          <div className="space-y-5">
            <div className="bg-white border-2 border-sky-200 rounded-[32px] p-5">
              <div className="flex justify-between border-b pb-3"><span className="font-mono font-black text-[#0F4C81]">{order.intlTrackingNumber||order.orderNumber}</span><span className="text-xs bg-emerald-50 px-2 py-1 rounded-full border font-black">✓ تم العثور</span></div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="block text-[#0F4C81]">العميل:</b><span className="font-black">{order.customerName}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="block text-[#0F4C81]">الهاتف:</b><span dir="ltr">{order.customerPhone}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="block text-[#0F4C81]">الحالة:</b><span className="font-black">{order.status}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="block text-[#0F4C81]">التاريخ:</b>{new Date(order.createdAt).toLocaleDateString('ar-YE')}</div>
              </div>
            </div>

            <div className="bg-white border-2 rounded-[32px] p-5">
              <h3 className="font-black text-[#0F4C81] border-b pb-3">مسار الشحنة 📍</h3>
              <div className="mt-6 space-y-6 relative">
                <div className="absolute right-[22px] top-2 bottom-2 w-1 bg-slate-200 rounded-full"/>
                {trackingSteps.map((s,idx)=>{
                  const active=isActive(s); const cur=isCur(s); const Icon=s.icon;
                  return (
                    <div key={idx} className="flex gap-4 items-start relative">
                      <div className={`w-11 h-11 rounded-full grid place-items-center shrink-0 border-2 z-10 ${cur?'bg-[#FF7A00] text-white border-[#FF7A00] shadow-lg scale-110':active?'bg-[#0F4C81] text-white border-[#0F4C81]':'bg-white text-slate-300 border-slate-200'}`}>
                        <Icon className="w-5 h-5"/>
                      </div>
                      <div className="pt-1">
                        <h4 className={`text-sm font-black ${cur?'text-[#EA580C]':'text-[#0F4C81]'}`}>{s.title} {cur && '⚡'}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
                        {cur && <span className="inline-block mt-1 text-[10px] font-black bg-orange-100 text-[#EA580C] px-2 py-0.5 rounded-full">المرحلة الحالية</span>}
                        {active &&!cur && <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700">✓ مكتمل</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = (createFileRoute as any)('/track/')({ component: TrackRouteComponent });
export default TrackRouteComponent;
