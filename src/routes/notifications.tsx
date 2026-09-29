import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Phone, MessageCircle, PackagePlus, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type OrderNotif = {
  id: string; tracking_code: string; customer_name: string;
  phone: string; notes: string; status: string; created_at: string; read?: boolean;
};

function NotificationsPage() {
  const { user } = useSession();
  const [orders, setOrders] = useState<OrderNotif[]>([]);
  const [sysNotifs, setSysNotifs] = useState<any[]>([]);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("sc_notify")!== "0");

  const playSound = () => {
    if(!soundOn) return;
    new Audio("https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3").play().catch(()=>{});
  };

  useEffect(() => {
    if(!user) return;
    // طلبات أخيرة
    supabase.from("orders").select("*").order("created_at",{ascending:false}).limit(30)
     .then(({data})=>{ if(data) setOrders(data.map(d=>({...d, read:true}))); });
    // إشعارات النظام القديمة عندك
    supabase.from("notifications").select("id,title,body,created_at").order("created_at",{ascending:false})
     .then(({data})=>{ if(data) setSysNotifs(data); });

    // Realtime لأي طلب جديد
    const ch = supabase.channel("orders-notif-live")
     .on("postgres_changes",{event:"INSERT",schema:"public",table:"orders"},(payload)=>{
        const o = payload.new as OrderNotif;
        setOrders(prev=>[{...o, read:false},...prev]);
        playSound();
        if("Notification" in window && Notification.permission==="granted"){
          new Notification("طلب جديد 🛒",{body:`${o.customer_name} - ${o.tracking_code}`});
        }
      }).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  }, [user]);

  const toggle = async () => {
    const next =!soundOn;
    if(next && "Notification" in window && Notification.permission==="default") await Notification.requestPermission();
    setSoundOn(next);
    localStorage.setItem("sc_notify", next?"1":"0");
  };

  const markContacted = async (id:string)=>{
    await supabase.from("orders").update({status:"تم التواصل"}).eq("id",id);
    setOrders(p=>p.map(o=>o.id===id?{...o,status:"تم التواصل",read:true}:o));
  };

  const unread = orders.filter(o=>!o.read).length;

  return (
    <AccountShell title="الإشعارات - السوق الشامل">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative"><Bell className="size-6 text-amber-300"/>
            {unread>0 && <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] size-5 rounded-full flex items-center justify-center font-bold">{unread}</span>}
          </div>
          <h2 className="font-black">طلبات العملاء اللحظية</h2>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={toggle} className="px-3 py-2 rounded-xl bg-[#2a1d14] border border-[#442c1c] text-amber-300 font-bold">
            {soundOn?"🔔 الصوت يعمل":"🔕 الصوت متوقف"}
          </button>
          <button onClick={()=>setOrders(p=>p.map(o=>({...o,read:true})))} className="px-3 py-2 rounded-xl bg-[#2a1d14] border border-[#442c1c] text-amber-300 font-bold flex items-center gap-1">
            <CheckCheck className="size-4"/> تعليم الكل كمقروء
          </button>
        </div>
      </div>

      {orders.length===0? <EmptyState title="لا توجد طلبات" desc="أي طلب جديد من عميل سيظهر هنا فوراً مع صوت وإشعار"/> : (
        <div className="space-y-3">
          {orders.map(o=>{
            const clean=(o.phone||"").replace(/\D/g,"");
            return (
              <div key={o.id} className={`bg-[#1f150e] border rounded-2xl p-4 flex flex-wrap justify-between gap-3 ${!o.read?"border-amber-600":"border-[#3b2718]"}`}>
                <div className="flex gap-3">
                  <div className={`p-2.5 rounded-xl ${!o.read?"bg-amber-700 text-white animate-pulse":"bg-[#2a1d14] text-amber-300"}`}><PackagePlus className="size-5"/></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{o.customer_name}</span>
                      {!o.read && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">جديد</span>}
                      <span className="text-[10px] font-mono text-stone-500">{o.tracking_code}</span>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">{o.notes} • {new Date(o.created_at).toLocaleString("ar")}</div>
                    <div className="text-[11px]">الحالة: <span className="text-amber-300 font-bold">{o.status}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {clean && <>
                    <a href={`tel:${clean}`} className="p-2.5 rounded-xl bg-amber-700 text-white"><Phone className="size-4"/></a>
                    <a href={`https://wa.me/${clean}?text=${encodeURIComponent(`مرحباً ${o.customer_name}، طلبك ${o.tracking_code} وصلنا`)}`} target="_blank" className="p-2.5 rounded-xl bg-emerald-700 text-white"><MessageCircle className="size-4"/></a>
                  </>}
                  <button onClick={()=>markContacted(o.id)} className="text-xs px-3 py-2 rounded-xl border border-emerald-700 text-emerald-300 font-bold">تمت المتابعة</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sysNotifs.length>0 && <>
        <h3 className="font-bold mt-6 mb-2 text-stone-400">إشعارات النظام</h3>
        <div className="space-y-2">{sysNotifs.map(n=>(
          <div key={n.id} className="bg-[#1a120b] border border-[#3b2718] rounded-xl p-3 text-sm">
            <div className="font-bold">{n.title}</div><div className="text-stone-400 text-xs">{n.body}</div>
          </div>))}</div>
      </>}
    </AccountShell>
  );
}
