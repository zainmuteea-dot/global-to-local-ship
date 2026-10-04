import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import {
  Search, Package, Plane, Truck, CheckCircle2, MapPin,
  DollarSign, AlertCircle, Building, Phone, Printer,
  Sparkles, ArrowRight, Loader2, Check, Bell, X, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const playPhoneRingSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
    const now = ctx.currentTime;
    const tones = [
      { freq: 587.33, start: now + 0.0, duration: 0.15, gain: 0.35 },
      { freq: 880.00, start: now + 0.12, duration: 0.18, gain: 0.40 },
      { freq: 1174.66, start: now + 0.26, duration: 0.45, gain: 0.45 },
    ];
    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, tone.start);
      gainNode.gain.setValueAtTime(0.001, tone.start);
      gainNode.gain.exponentialRampToValueAtTime(tone.gain, tone.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, tone.start + tone.duration);
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      osc.start(tone.start); osc.stop(tone.start + tone.duration);
    });
  } catch {}
};

const playDismissSound = () => {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); const now = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.09);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.09);
  } catch {}
};

export type OrderStatus = 'new'|'accepted'|'pricing'|'priced_waiting_pay'|'purchased'|'processing'|'international_ship'|'shipped'|'local_warehouse'|'out_for_delivery'|'delivered'|'cancelled';
export interface OrderItem {
  id: string; orderNumber: string; intlTrackingNumber?: string;
  customerName: string; customerPhone: string; customerCity?: string;
  customerAddress?: string; storeName?: string; productUrl?: string;
  productTitle?: string; quantity?: number; totalCostUSD?: number;
  totalCostSAR?: number; totalCostYER?: number;
  status: OrderStatus; createdAt: string; updatedAt?: string;
}

export function TrackRouteComponent() {
  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pinnedNotification, setPinnedNotification] = useState<{show:boolean; stageTitle:string; orderNumber:string}|null>(null);
  const [isDismissingNotif, setIsDismissingNotif] = useState(false);

  const trackingSteps = [
    { id:'step-1', title:'استلام الطلب والاعتماد', desc:'تم تسجيل الطلب وتدقيق الروابط والكميات بنجاح', icon:CheckCircle2, targetStatus:'new' as OrderStatus, activeStatuses:['new','accepted','pricing','priced_waiting_pay','purchased','processing','international_ship','shipped','local_warehouse','out_for_delivery','delivered'], currentIf:['new','accepted','pricing'] },
    { id:'step-2', title:'الشراء من المتجر الدولي', desc:'تم إتمام عملية الدفع والشراء من المتجر الأصلي', icon:DollarSign, targetStatus:'purchased' as OrderStatus, activeStatuses:['purchased','processing','international_ship','shipped','local_warehouse','out_for_delivery','delivered'], currentIf:['purchased','processing'] },
    { id:'step-3', title:'وصول المستودع الدولي', desc:'وصلت الشحنة إلى مستودعنا في أمريكا / الصين / تركيا وتجهيز التغليف', icon:Building, targetStatus:'international_ship' as OrderStatus, activeStatuses:['international_ship','shipped','local_warehouse','out_for_delivery','delivered'], currentIf:['international_ship'] },
    { id:'step-4', title:'الشحن الدولي (جوي / بحري)', desc:'الشحنة على متن رحلة الشحن الدولي متجهة إلى الجمهورية اليمنية', icon:Plane, targetStatus:'shipped' as OrderStatus, activeStatuses:['shipped','local_warehouse','out_for_delivery','delivered'], currentIf:['shipped'] },
    { id:'step-5', title:'الوصول لليمن والفرز المحلي', desc:'وصلت الشحنة واجتازت التخليص الجمركي وجاري الفرز في المستودع المحلي', icon:MapPin, targetStatus:'local_warehouse' as OrderStatus, activeStatuses:['local_warehouse','out_for_delivery','delivered'], currentIf:['local_warehouse'] },
    { id:'step-6', title:'خروج الشحنة مع المندوب للتوصيل', desc:'الشحنة حالياً مع مندوب التوصيل في طريقها لعنوان العميل', icon:Truck, targetStatus:'out_for_delivery' as OrderStatus, activeStatuses:['out_for_delivery','delivered'], currentIf:['out_for_delivery'] },
    { id:'step-7', title:'تم التسليم بنجاح', desc:'تم استلام الشحنة من قبل العميل بنجاح وسداد الرصيد', icon:Sparkles, targetStatus:'delivered' as OrderStatus, activeStatuses:['delivered'], currentIf:['delivered'] },
  ];

  const handleSearch = async (orderNum?: string, phoneNum?: string) => {
    const oQuery = (orderNum!== undefined? orderNum : orderQuery).trim().toUpperCase();
    const pQuery = (phoneNum!== undefined? phoneNum : phoneQuery).trim();
    if (!oQuery &&!pQuery) return;
    setLoading(true); setHasSearched(true);
    try {
      let query = supabase.from('orders').select('*');
      if (oQuery) query = query.or(`order_number.ilike.%${oQuery}%,tracking_code.ilike.%${oQuery}%,intl_tracking_number.ilike.%${oQuery}%`);
      else if (pQuery) query = query.or(`customer_phone.ilike.%${pQuery}%,phone.ilike.%${pQuery}%`);
      const { data, error } = await query.order('created_at', { ascending:false }).limit(1);
      if (error) throw error;
      if (data?.length) {
        const row = data[0] as Record<string, any>;
        setOrder({ id: row.id, orderNumber: row.order_number || row.tracking_code || 'ORD-001', intlTrackingNumber: row.intl_tracking_number || row.tracking_code, customerName: row.customer_name || 'العميل', customerPhone: row.customer_phone || row.phone || '', customerCity: row.customer_city || 'صنعاء', customerAddress: row.customer_address || '', storeName: row.store_name || 'SHEIN', productUrl: row.product_url || row.product_link, productTitle: row.product_title || 'شحنة متجر عالمي', quantity: row.quantity || 1, totalCostUSD: row.total_cost_usd, totalCostSAR: row.total_cost_sar, totalCostYER: row.total_cost_yer, status: (row.status as OrderStatus) || 'new', createdAt: row.created_at, updatedAt: row.updated_at });
      } else setOrder(null);
    } catch { setOrder(null); } finally { setLoading(false); }
  };

  useEffect(() => {
    const autoInit = async () => {
      let autoPhone = ""; let autoOrder = "";
      if (typeof window!== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        autoOrder = params.get('order') || params.get('tracking') || '';
        autoPhone = params.get('phone') || '';
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!autoPhone && session?.user) {
          const { data: profile } = await supabase.from("profiles").select("phone").eq("id", session.user.id).maybeSingle();
          if (profile?.phone) autoPhone = profile.phone;
        }
        if (!autoPhone) autoPhone = sessionStorage.getItem("sc_phone") || localStorage.getItem("sc_phone") || "";
      } catch {}
      if (autoOrder) setOrderQuery(autoOrder);
      if (autoPhone) setPhoneQuery(autoPhone);
      if (autoOrder || autoPhone) setTimeout(()=>handleSearch(autoOrder, autoPhone), 400);
    };
    autoInit();
  }, []);

  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase.channel(`order-${order.id}`)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'orders', filter:`id=eq.${order.id}` },
      (payload:any) => {
        const newStatus = payload.new?.status as OrderStatus;
        if (!newStatus) return;
        const step = trackingSteps.find(s=>s.targetStatus===newStatus);
        setOrder(prev=>prev?{...prev,status:newStatus}:prev);
        playPhoneRingSound();
        setIsDismissingNotif(false);
        setPinnedNotification({ show:true, stageTitle: step?.title||newStatus, orderNumber: order.orderNumber });
      }).subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  }, [order?.id]);

  const handleDismissNotification = () => {
    playDismissSound(); setIsDismissingNotif(true);
    setTimeout(()=>{ setPinnedNotification(null); setIsDismissingNotif(false); },280);
  };

  const isStepActive = (s:any, cur?:OrderStatus)=> cur? s.activeStatuses.includes(cur):false;
  const isStepCurrent = (s:any, cur?:OrderStatus)=> cur? s.currentIf.includes(cur):false;
  const getStatusLabel = (s:OrderStatus)=>({new:'تم استلام الطلب والاعتماد',accepted:'طلب معتمد ومؤكد',pricing:'قيد التسعير',priced_waiting_pay:'بانتظار الدفع',purchased:'تم الشراء من المتجر',processing:'قيد التجهيز والتغليف',international_ship:'وصول المستودع الدولي',shipped:'تم الشحن الدولي ✈️',local_warehouse:'بالمستودع المحلي باليمن',out_for_delivery:'جاري التوصيل مع المندوب 🚚',delivered:'تم التسليم بنجاح ✓',cancelled:'ملغي'} as any)[s]||s;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans selection:bg-[#0F4C81] selection:text-white pb-20" dir="rtl">
      {pinnedNotification?.show && (
        <div className={`fixed top-4 left-4 right-4 z-[9999] max-w-lg mx-auto transition-all duration-300 transform ${isDismissingNotif?'opacity-0 -translate-y-8 scale-95 pointer-events-none':'opacity-100 translate-y-0 scale-100'}`}>
          <div onClick={handleDismissNotification} className="group relative bg-white/95 backdrop-blur-md border-2 border-[#0F4C81] rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(15,76,129,0.25)] ring-4 ring-[#0F4C81]/15 hover:ring-[#FF7A00]/25 transition-all cursor-pointer overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#FF7A00]" />
            <div className="flex items-start gap-3.5 pt-0.5">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#EA580C] text-white flex items-center justify-center shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform">
                  <Bell className="w-6 h-6 animate-[bounce_1.5s_infinite]" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-[9px] font-black text-white items-center justify-center">1</span>
                </span>
              </div>
              <div className="flex-1 min-w-0 pr-0.5 text-right">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">إشعار فوري 🔔</span>
                    <span className="text-xs font-mono font-black text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">#{pinnedNotification.orderNumber}</span>
                  </div>
                  <button type="button" onClick={(e)=>{e.stopPropagation();handleDismissNotification();}} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"><X className="w-3.5 h-3.5"/></button>
                </div>
                <h4 className="text-sm font-black text-[#0F4C81] flex items-center gap-1"><span>تم تجهيز ونقل الشحنة بنجاح!</span><Sparkles className="w-3.5 h-3.5 text-[#FF7A00]"/></h4>
                <p className="text-xs font-bold text-slate-700 mt-1 leading-relaxed">تم اعتماد ونقل طلبك إلى مرحلة: <span className="text-[#EA580C] font-black underline underline-offset-2">[{pinnedNotification.stageTitle}]</span></p>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-black text-[#0F4C81]"><span>👆 انقر هنا لإغلاق الإشعار ومتابعة المسار</span><span className="flex items-center gap-1 text-[#FF7A00] font-bold"><span>عرض التفاصيل</span><ChevronLeft className="w-3.5 h-3.5"/></span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="max-w-2xl mx-auto pt-6 pb-4 px-4 flex items-center justify-between">
        <button onClick={()=>window.location.href='/'} className="px-4 py-2 rounded-2xl bg-white/90 border-2 border-sky-100 text-xs font-black text-[#0F4C81] flex items-center gap-1.5 cursor-pointer"><ArrowRight className="w-4 h-4"/>رجوع</button>
        <div className="text-center"><div className="flex items-center justify-center gap-1.5 font-black text-lg sm:text-xl"><span className="text-[#0F4C81]">AL SHAMEL</span><span className="text-[#FF7A00]">SHOPPING</span></div><p className="text-[11px] font-bold text-slate-500 mt-0.5">تتبع الشحنات والطرود الدولية والمحلية 📍</p></div>
        <div className="w-16"/>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-2 space-y-6">
        <div className="bg-white/95 border-2 border-sky-100 rounded-[32px] p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-sky-100/80">
            <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center"><Search className="w-4 h-4"/></div><h2 className="text-base sm:text-lg font-black text-[#0F4C81]">استعلام وتتبع مسار الشحنة</h2></div>
            <span className="text-[11px] font-black text-[#EA580C] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">تحديث مباشر ⚡</span>
          </div>
          <form onSubmit={(e)=>{e.preventDefault();handleSearch();}} className="space-y-4">
            <div className="space-y-1.5"><label className="block text-xs sm:text-sm font-black text-[#0F4C81]">رقم الشحنة أو كود التتبع</label><input value={orderQuery} onChange={e=>setOrderQuery(e.target.value)} placeholder="مثال: SQ-892411" className="w-full h-12 rounded-2xl bg-[#F8FAFC] border-2 px-4 text-center font-mono font-bold"/></div>
            <div className="space-y-1.5"><label className="block text-xs sm:text-sm font-black text-[#0F4C81]">رقم الهاتف / الواتساب</label><input value={phoneQuery} onChange={e=>setPhoneQuery(e.target.value)} placeholder="774399744" dir="ltr" className="w-full h-12 rounded-2xl bg-[#F8FAFC] border-2 px-4 text-center font-mono font-bold"/></div>
            {hasSearched &&!order &&!loading && <p className="text-xs text-center font-bold text-red-600 bg-red-50 p-2 rounded-xl">لم يتم العثور على شحنة</p>}
            <button disabled={loading} className="w-full h-12 rounded-2xl bg-[#0F4C81] text-white font-black flex items-center justify-center gap-2">{loading?<Loader2 className="animate-spin w-5 h-5"/>:<><Search className="w-5 h-5"/>تتبع طلبك الآن 🔍</>}</button>
          </form>
        </div>

        {order && (
          <div className="space-y-5">
            <div className="bg-white border-2 border-sky-200 rounded-[32px] p-5">
              <div className="flex justify-between border-b pb-3"><span className="font-mono font-black text-[#0F4C81]">{order.intlTrackingNumber||order.orderNumber}</span><span className="text-xs bg-emerald-50 px-2 py-1 rounded-full border font-black">✓ تم العثور</span></div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="text-[#0F4C81] block">العميل:</b><span className="font-black">{order.customerName}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="text-[#0F4C81] block">الهاتف:</b><span dir="ltr">{order.customerPhone}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="text-[#0F4C81] block">الحالة:</b><span className="bg-[#FF7A00] text-white px-2 py-1 rounded-lg font-black">{getStatusLabel(order.status)}</span></div>
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border"><b className="text-[#0F4C81] block">التاريخ:</b>{new Date(order.createdAt).toLocaleDateString('ar-YE')}</div>
              </div>
            </div>
            <div className="bg-white border-2 rounded-[32px] p-5">
              <h3 className="font-black text-[#0F4C81] border-b pb-3 flex gap-2 items-center"><Truck className="w-5 h-5"/> مسار الشحنة 📍</h3>
              <div className="mt-4 space-y-5">
                {trackingSteps.map(step=>{
                  const active=isStepActive(step,order.status); const cur=isStepCurrent(step,order.status); const Icon=step.icon;
                  return <div key={step.id} className="flex gap-3 items-start">
                    <div className={`w-11 h-11 rounded-2xl grid place-items-center border-2 shrink-0 ${cur?'bg-[#FF7A00] text-white border-[#FF7A00] shadow-lg':active?'bg-[#0F4C81] text-white border-[#0F4C81]':'bg-white text-slate-400 border-slate-200'}`}><Icon className="w-5 h-5"/></div>
                    <div className="flex-1"><h4 className={`text-sm font-black ${cur?'text-[#EA580C]':'text-[#0F4C81]'}`}>{step.title} {cur&&'⚡'}</h4><p className="text-xs text-slate-600">{step.desc}</p>
                    {cur && <span className="inline-block mt-1 text-[10px] font-black bg-orange-100 text-[#EA580C] px-2 py-0.5 rounded-full">المرحلة الحالية</span>}
                    </div></div>
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
