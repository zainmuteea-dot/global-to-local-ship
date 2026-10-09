import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, Check, CheckCircle2, ChevronLeft, Circle, Clock3, CreditCard, MapPin, Package, Plane, RefreshCw, Search, ShieldCheck, ShoppingBag, Truck, Warehouse, X, MessageCircle, Loader2, History, UserRound, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
export const Route = createFileRoute('/admin-tracking')({
  head: () => ({ meta: [{ title: 'تتبع الشحنات المباشر — الإدارة | السوق الشامل' }] }),
  component: LiveTrackingAdminRoute,
});

type StageCode = 'new' | 'payment_review' | 'purchased' | 'international_warehouse' | 'international_transit' | 'customs_local' | 'out_for_delivery' | 'delivered';
type Channel = 'app' | 'whatsapp';
type Shipment = { id: string; trackingCode: string; customerName: string; customerPhone: string; productName: string; productLink: string; storeName: string; city: string; status: string; userId: string | null; courierName: string; courierPhone: string; createdAt: string };
type EventRow = { id: string; stage_code: StageCode; channel: Channel; delivery_state: string; event_type: string; message: string; created_at: string };
const STAGES = [
  { code: 'new', title: 'استلام الطلب والتدقيق', location: 'مكتب الاستقبال المركزي', detail: 'تسجيل الطلب وتدقيق روابط السلع والكميات والمقاسات والألوان.', icon: Package },
  { code: 'payment_review', title: 'التدقيق المالي والدفع', location: 'قسم الحسابات والوساطة', detail: 'حساب التكلفة والعملات وتأكيد استلام الدفعة.', icon: CreditCard },
  { code: 'purchased', title: 'الشراء من المتجر الدولي', location: 'الصين / أمريكا / الإمارات / تركيا', detail: 'إتمام الشراء وإصدار كود الشحن وفاتورة المورد.', icon: ShoppingBag },
  { code: 'international_warehouse', title: 'وصول مستودع التجميع الدولي', location: 'كوانزو / دبي / الرياض', detail: 'فحص الجودة ومطابقة الوزن والتغليف الآمن.', icon: Warehouse },
  { code: 'international_transit', title: 'الشحن الدولي في الترانزيت', location: 'في الطريق إلى الجمهورية اليمنية', detail: 'انطلاق الشحن الجوي أو البحري نحو الموانئ والمطارات اليمنية.', icon: Plane },
  { code: 'customs_local', title: 'الجمارك والفرز بالمستودع المحلي', location: 'صنعاء / عدن', detail: 'التخليص الجمركي والفرز حسب المحافظات والمدن.', icon: MapPin },
  { code: 'out_for_delivery', title: 'جاري التوصيل مع المندوب', location: 'مندوب التوصيل الميداني', detail: 'خرجت الشحنة مع المندوب إلى عنوان العميل.', icon: Truck },
  { code: 'delivered', title: 'تم التسليم للعميل بنجاح', location: 'عنوان العميل النهائي', detail: 'تم استلام الطرد وإغلاق الطلب.', icon: CheckCircle2 },
] as const;
const stageCodes = STAGES.map(s => s.code) as StageCode[];
const stageIndex = (status: string) => {
  const s = (status || '').trim().toLowerCase();
  const aliases: Record<string, StageCode> = {
    'جديد':'new', reviewing:'new', 'قيد المراجعة':'new', 'استلام الطلب والتدقيق':'new',
    'تدقيق مالي':'payment_review', payment_review:'payment_review', 'التدقيق المالي والدفع':'payment_review',
    purchased:'purchased', 'تم الشراء':'purchased', 'قيد الشراء والتجهيز':'purchased',
    warehouse_china:'international_warehouse', 'المستودع الدولي':'international_warehouse', international_warehouse:'international_warehouse',
    international_ship:'international_transit', shipped:'international_transit', 'شحن دولي':'international_transit',
    local_warehouse:'customs_local', customs_local:'customs_local', 'الفرز والتوصيل':'customs_local',
    out_for_delivery:'out_for_delivery', delivered:'delivered', 'تم التسليم':'delivered',
  };
  const code = aliases[s] || (stageCodes.includes(s as StageCode) ? s as StageCode : 'new');
  return stageCodes.indexOf(code);
};
const detectStore = (link: string) => {
  const value = (link || '').toLowerCase();
  return value.includes('shein') ? 'SHEIN' : value.includes('amazon') ? 'Amazon' : value.includes('aliexpress') ? 'AliExpress' : value.includes('trendyol') ? 'Trendyol' : value.includes('iherb') ? 'iHerb' : value.includes('temu') ? 'TEMU' : 'متجر دولي';
};
const trackingUrl = (code: string) => `${window.location.origin}/track/${encodeURIComponent(code)}`;
const messageFor = (s: Shipment, stage: typeof STAGES[number]) => `مرحباً ${s.customerName}، تحديث شحنتك ${s.trackingCode}\nالمتجر: ${s.storeName}\nالمرحلة: ${stage.title}\n${stage.detail}${stage.code === 'out_for_delivery' && s.courierName ? `\nالمندوب: ${s.courierName}${s.courierPhone ? ` — ${s.courierPhone}` : ''}` : ''}\nرابط التتبع: ${trackingUrl(s.trackingCode)}`;
const normalizePhone = (input: string) => {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `967${digits.slice(1)}`;
  else if (digits.length === 9) digits = `967${digits}`;
  return digits;
};

function LiveTrackingAdminRoute() {
  const [access, setAccess] = useState<'loading'|'allowed'|'denied'>('loading');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Shipment|null>(null);
  const [history, setHistory] = useState<EventRow[]>([]);
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setAccess('denied'); return; }
      const { data, error } = await db.from('user_roles').select('role').eq('user_id', user.id);
      if (alive) setAccess(!error && data?.some((r: any) => r.role === 'admin' || r.role === 'staff') ? 'allowed' : 'denied');
    })();
    return () => { alive = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from('orders').select('id,tracking_code,customer_name,phone,product_name,product_link,status,user_id,created_at,notes,courier_name,courier_phone').order('created_at', { ascending: false });
    if (error) setNotice(`تعذّر تحميل الطلبات: ${error.message}`);
    else setShipments((data || []).map((r: any) => ({ id:r.id, trackingCode:r.tracking_code, customerName:r.customer_name || 'عميل', customerPhone:r.phone || '', productName:r.product_name || 'شحنة', productLink:r.product_link || '', storeName:detectStore(r.product_link || ''), city:r.notes || 'غير محدد', status:r.status || 'new', userId:r.user_id || null, courierName:r.courier_name || '', courierPhone:r.courier_phone || '', createdAt:r.created_at })));
    setLoading(false);
  }, []);
  useEffect(() => { if (access !== 'allowed') return; void refresh(); const channel = supabase.channel('admin-tracking-orders-v2').on('postgres_changes', { event:'*', schema:'public', table:'orders' }, () => void refresh()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [access, refresh]);

  const loadHistory = useCallback(async (shipment: Shipment) => {
    const { data, error } = await db.rpc('admin_shipment_notification_history', { _order_id: shipment.id });
    if (error) { setHistory([]); setNotice(`تعذّر تحميل سجل الإشعارات: ${error.message}. تأكد من تطبيق SQL المرفق.`); }
    else setHistory(data || []);
  }, []);
  useEffect(() => { if (selected) { setCourierName(selected.courierName); setCourierPhone(selected.courierPhone); void loadHistory(selected); } else setHistory([]); }, [selected, loadHistory]);
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 5500); return () => clearTimeout(t); }, [notice]);

  const filtered = useMemo(() => { const q=search.trim().toLowerCase(); return shipments.filter(s => !q || `${s.trackingCode} ${s.customerName} ${s.customerPhone} ${s.storeName}`.toLowerCase().includes(q)); }, [shipments, search]);

  const doAction = async (shipment: Shipment, stage: typeof STAGES[number], action: 'advance'|'notify', channel: Channel) => {
    if (channel === 'whatsapp' && !normalizePhone(shipment.customerPhone)) { setNotice('لا يوجد رقم هاتف صالح لهذا العميل.'); return; }
    if (stage.code === 'out_for_delivery' && action === 'advance' && (!courierName.trim() || !normalizePhone(courierPhone))) { setNotice('أدخل اسم المندوب ورقمه قبل تفعيل مرحلة التوصيل.'); return; }
    const popup = channel === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    setBusy(true); setNotice('');
    try {
      const text = messageFor({ ...shipment, courierName:courierName.trim(), courierPhone:courierPhone.trim() }, stage);
      const { data, error } = await db.rpc('admin_set_shipment_stage', {
        _order_id: shipment.id, _stage_code: stage.code, _action: action, _channel: channel,
        _message: text,
        _courier_name: stage.code === 'out_for_delivery' ? courierName.trim() : null,
        _courier_phone: stage.code === 'out_for_delivery' ? normalizePhone(courierPhone) : null,
      });
      if (error) throw error;
      if (action === 'advance') setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, status:stage.code, courierName:stage.code === 'out_for_delivery' ? courierName.trim() : s.courierName, courierPhone:stage.code === 'out_for_delivery' ? normalizePhone(courierPhone) : s.courierPhone } : s));
      await loadHistory(shipment);
      if (channel === 'whatsapp') {
        if (popup) popup.location.href = `https://wa.me/${normalizePhone(shipment.customerPhone)}?text=${encodeURIComponent(text)}`;
        else setNotice('حُفظت الرسالة كجاهزة في السجل، لكن المتصفح منع نافذة واتساب. اسمح بالنوافذ المنبثقة وافتح سجل الرسائل.');
        if (popup) setNotice('فُتح واتساب برسالة جاهزة. لم تُرسل تلقائياً؛ أكّد الإرسال داخل واتساب.');
      } else {
        setNotice(data?.notification_state === 'created' ? (action === 'advance' ? 'تم تحديث المرحلة وحفظ إشعار العميل داخل التطبيق.' : 'تم حفظ التذكير داخل التطبيق دون تغيير حالة الشحنة.') : 'تم تحديث السجل، لكن العميل لا يملك حساباً مرتبطاً لتلقي إشعار داخل التطبيق.');
      }
      if (action === 'advance') await refresh();
    } catch (e) {
      popup?.close();
      setNotice(`لم تكتمل العملية: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`);
    } finally { setBusy(false); }
  };

  if (access === 'loading') return <div dir="rtl" className="min-h-screen grid place-items-center text-slate-600">جارٍ التحقق من الصلاحيات...</div>;
  if (access === 'denied') return <div dir="rtl" className="min-h-screen grid place-items-center p-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow"><ShieldCheck className="mx-auto mb-3 size-10 text-amber-600"/><h1 className="font-black">هذه الصفحة للمدير والموظفين</h1><p className="my-4 text-sm text-slate-500">سجّل الدخول بحساب مخوّل لمتابعة الشحنات.</p><Link to="/login" className="inline-block rounded-xl bg-blue-900 px-5 py-3 text-white">تسجيل الدخول</Link></div></div>;

  return <div dir="rtl" className="min-h-screen bg-slate-50 pb-16 text-slate-800">
    <header className="sticky top-0 z-20 bg-[#0F4C81] text-white shadow"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><div className="flex items-center gap-3"><Link to="/admin" className="rounded-xl bg-white/10 p-2"><ChevronLeft className="size-5"/></Link><div><h1 className="font-black">مسار الشحنة وإشعارات العميل</h1><p className="text-[11px] text-sky-100">ثماني مراحل · تحديث مباشر</p></div></div><button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold"><RefreshCw className={`size-4 ${loading?'animate-spin':''}`}/> تحديث</button></div></header>
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['إجمالي الشحنات',shipments.length],['طلبات اليوم',shipments.filter(s=>new Date(s.createdAt).toDateString()===new Date().toDateString()).length],['قيد التوصيل',shipments.filter(s=>s.status==='out_for_delivery').length],['مكتملة',shipments.filter(s=>s.status==='delivered').length]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#0F4C81]">{value}</p></div>)}</div>
      <label className="relative block"><Search className="absolute right-3 top-3 size-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث برقم الشحنة أو العميل أو الهاتف" className="w-full rounded-2xl border bg-white py-3 pr-10 pl-4 outline-none focus:border-blue-500"/></label>
      {notice && <div role="status" className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-900"><Bell className="mt-0.5 size-4 shrink-0"/>{notice}</div>}
      {loading && !shipments.length ? <div className="rounded-3xl bg-white p-12 text-center">جارٍ تحميل الشحنات...</div> : filtered.length ? <div className="grid gap-4 lg:grid-cols-2">{filtered.map(s=>{const idx=stageIndex(s.status);const current=STAGES[idx];return <article key={s.id} className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span dir="ltr" className="rounded-full bg-blue-50 px-3 py-1 font-mono text-xs font-black text-blue-900">{s.trackingCode}</span><span className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-700">{s.storeName}</span></div><h2 className="mt-2 font-black">{s.customerName}</h2><p className="mt-1 text-xs text-slate-500">{s.productName} · {s.city}</p><p dir="ltr" className="mt-1 text-right text-xs text-slate-500">{s.customerPhone}</p></div><span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{current?.title}</span></div><div className="mt-4 flex items-center gap-1">{STAGES.map((st,i)=><span key={st.code} title={`${i+1}. ${st.title}`} className={`h-2 flex-1 rounded-full ${i<=idx?'bg-emerald-500':'bg-slate-200'}`}/>)}</div><button onClick={()=>setSelected(s)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-black text-white"><Bell className="size-4"/>مسار الشحنة وإشعار</button></article>})}</div> : <div className="rounded-3xl bg-white p-12 text-center text-slate-500">لا توجد شحنات مطابقة.</div>}
    </main>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="shipment-modal-title"><section className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6"><div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6"><div><h2 id="shipment-modal-title" className="font-black">مسار الشحنة {selected.trackingCode}</h2><p className="text-xs text-slate-500">{selected.customerName} · {selected.storeName}</p></div><button onClick={()=>setSelected(null)} className="rounded-xl bg-slate-100 p-2" aria-label="إغلاق"><X className="size-4"/></button></div>
      <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-xs leading-6 text-sky-950">تحديث المرحلة ينشئ إشعاراً داخل التطبيق. زر واتساب يفتح رسالة جاهزة ويسجلها «جاهزة»، ولا يثبت الإرسال حتى تؤكده من واتساب.</div>
      {STAGES.some(s=>s.code==='out_for_delivery') && <div className="mb-4 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2"><label className="text-xs font-bold">اسم المندوب (مطلوب عند التوصيل)<input value={courierName} onChange={e=>setCourierName(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5" placeholder="اسم المندوب"/></label><label className="text-xs font-bold">هاتف المندوب<input value={courierPhone} onChange={e=>setCourierPhone(e.target.value)} dir="ltr" className="mt-1 w-full rounded-xl border bg-white p-2.5 text-right" placeholder="7xxxxxxxx"/></label></div>}
      <ol className="space-y-3">{STAGES.map((stage,i)=>{const Icon=stage.icon;const active=i===stageIndex(selected.status);const done=i<stageIndex(selected.status);return <li key={stage.code} className={`rounded-2xl border p-3 ${active?'border-blue-300 bg-blue-50':done?'border-emerald-200 bg-emerald-50/60':'bg-white'}`}><div className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${done?'bg-emerald-600 text-white':active?'bg-blue-900 text-white':'bg-slate-100 text-slate-500'}`}>{done?<Check className="size-4"/>:<Icon className="size-4"/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{i+1}. {stage.title}</b>{active&&<span className="rounded bg-blue-900 px-2 py-0.5 text-[10px] text-white">الحالية</span>}</div><p className="mt-1 text-xs text-slate-500">{stage.location} · {stage.detail}</p>{stage.code==='out_for_delivery'&&selected.courierName&&<p className="mt-1 text-xs font-bold text-emerald-800">المندوب: {selected.courierName} {selected.courierPhone&&<span dir="ltr">· {selected.courierPhone}</span>}</p>}<div className="mt-3 flex flex-wrap gap-2">{!active&&<button disabled={busy} onClick={()=>void doAction(selected,stage,'advance','app')} className="rounded-lg bg-orange-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50">{busy?'جارٍ الحفظ...':'تفعيل المرحلة وإشعار التطبيق'}</button>}<button disabled={busy} onClick={()=>void doAction(selected,stage,'notify','app')} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-[11px] font-bold text-blue-900 disabled:opacity-50">تذكير داخل التطبيق فقط</button><button disabled={busy||!normalizePhone(selected.customerPhone)} onClick={()=>void doAction(selected,stage,'notify','whatsapp')} className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 disabled:opacity-50"><MessageCircle className="size-3.5"/>فتح رسالة واتساب</button></div></div></div></li>})}</ol>
      <section className="mt-5 rounded-2xl border p-4"><h3 className="flex items-center gap-2 font-black"><History className="size-4"/>سجل الإشعارات</h3>{history.length?<ul className="mt-3 space-y-2">{history.map(ev=><li key={ev.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="flex flex-wrap justify-between gap-2 font-bold"><span>{ev.event_type==='stage'?'تغيير مرحلة':'تذكير'} · {ev.channel==='app'?'التطبيق':'واتساب'} · {ev.delivery_state==='created'?'أُنشئ إشعار التطبيق':ev.delivery_state==='prepared'?'رسالة مجهزة، بانتظار تأكيد واتساب':ev.delivery_state==='no_account'?'لا يوجد حساب تطبيق للعميل':ev.delivery_state}</span><time>{new Date(ev.created_at).toLocaleString('ar-YE')}</time></div><p className="mt-1 whitespace-pre-line text-slate-600">{ev.message}</p></li>)}</ul>:<p className="mt-3 text-xs text-slate-500">لا يوجد سجل بعد. طبّق SQL إذا لم يظهر السجل.</p>}</section>
      </section></div>}
  </div>;
}
export default LiveTrackingAdminRoute;
