import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/pay')({
  component: PayPage,
  validateSearch: (s: Record<string, unknown>) => ({ 
    order: typeof s['order'] === 'string' ? (s['order'] as string) : '' 
  })
})

/* ===================== Styles ===================== */
const CSS = `
:root{
  --blue-900:#013a70;--blue-800:#004A8D;--blue-600:#2f6fb0;--blue-500:#3E86C4;
  --blue-100:#e3eef8;--blue-50:#f0f6fc;--orange-600:#D86616;--orange-500:#f08a2d;
  --orange-400:#F5A623;--ink:#0f2440;--muted:#6b7f99;--line:#e4ecf5;--bg:#eef3f9;
  --card:#fff;--green:#1aa260;--green-bg:#e8f8ef;--red:#e3443a;--red-bg:#fdecea;
  --radius:18px;--shadow:0 10px 30px -12px rgba(0,74,141,.22);--shadow-sm:0 4px 14px -6px rgba(0,74,141,.18);
}
.pay-root *{box-sizing:border-box;margin:0;padding:0}
.pay-root{font-family:'Cairo',system-ui,sans-serif;min-height:100vh;color:var(--ink);line-height:1.6;
  direction:rtl;padding:24px 14px 60px;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1200px 500px at 100% -10%,rgba(62,134,196,.12),transparent 60%),
    radial-gradient(1000px 500px at 0% 110%,rgba(245,166,35,.10),transparent 55%),var(--bg);}
.pay-wrap{max-width:620px;margin:0 auto}
.pay-topbar{background:linear-gradient(135deg,var(--blue-800) 0%,var(--blue-900) 55%,#06284a 100%);
  border-radius:22px;padding:18px 20px;color:#fff;box-shadow:var(--shadow);position:relative;
  overflow:hidden;display:flex;align-items:center;gap:14px}
.pay-topbar::after{content:'';position:absolute;inset:0;
  background:radial-gradient(140px 140px at 10% 120%,rgba(245,166,35,.35),transparent 70%)}
.pay-badge{width:52px;height:52px;border-radius:15px;flex:0 0 auto;
  background:linear-gradient(145deg,#fff,#eaf2fb);display:grid;place-items:center;position:relative;z-index:1;
  box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}
.pay-badge svg{width:34px;height:34px}
.pay-brand{z-index:1}
.pay-brand h1{font-size:19px;font-weight:900;letter-spacing:.3px;line-height:1.2}
.pay-brand h1 b{color:var(--orange-400)}
.pay-brand p{font-size:12px;color:#bcd3ec;font-weight:600;margin-top:2px}
.pay-arrow{margin-inline-start:auto;z-index:1;width:38px;height:38px;border-radius:11px;
  display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;transition:.2s;border:none}
.pay-arrow:hover{background:rgba(255,255,255,.22)}
.pay-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:18px;margin-top:16px;box-shadow:var(--shadow-sm)}
.pay-head{display:flex;align-items:center;gap:11px;margin-bottom:15px}
.pay-ico{width:36px;height:36px;flex:0 0 auto;border-radius:11px;display:grid;place-items:center;
  color:#fff;background:linear-gradient(140deg,var(--blue-600),var(--blue-800))}
.pay-head.alt .pay-ico{background:linear-gradient(140deg,var(--orange-400),var(--orange-600))}
.pay-title{font-weight:800;font-size:16px}
.badge{font-size:12.5px;font-weight:800;padding:5px 12px;border-radius:999px}
.badge.warn{background:#fff2df;color:#b96d05}
.badge.ok{background:var(--green-bg);color:var(--green)}
/* order details */
.od-top{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.od-box{border:1.6px solid var(--line);border-radius:14px;padding:12px 10px;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:7px;background:#fff}
.od-box .od-k{font-size:12px;font-weight:800;color:var(--muted)}
.od-box.num{background:linear-gradient(160deg,var(--green-bg),#fff);border-color:#bfe9d2}
.od-box.num .od-v{display:inline-flex;align-items:center;gap:5px;font-size:18px;font-weight:900;
  color:var(--green);direction:ltr}
.od-box.stat .od-v{display:flex}
.od-name{text-align:center;margin-top:14px;font-size:16px;font-weight:900;color:var(--ink)}
.od-prod{text-align:center;margin-top:5px;font-size:13.5px;color:var(--muted);font-weight:700}
/* زر التنبيه والإشعار التفاعلي */
.pay-wait-btn{margin-top:13px;width:100%;display:flex;align-items:center;justify-content:center;gap:9px;
  background:#fff6e9;border:1.6px solid #f3d9a8;color:#9a5b05;font-size:13.5px;font-weight:800;
  padding:13px 14px;border-radius:14px;line-height:1.6;text-align:center;cursor:pointer;transition:.25s;font-family:inherit}
.pay-wait-btn:hover{background:#ffeed1;border-color:var(--orange-500);transform:translateY(-1px)}
.pay-wait-btn.notified{background:var(--green-bg);border-color:#a3e4be;color:var(--green);cursor:default;box-shadow:0 4px 12px -4px rgba(26,162,96,.35)}
.pay-wait-btn.notified:hover{transform:none}
/* amount squares */
.pay-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.stat{border-radius:16px;padding:15px 10px;text-align:center;border:1.6px solid var(--line);
  background:#fff;position:relative;overflow:hidden;transition:.2s}
.stat:hover{transform:translateY(-2px);box-shadow:var(--shadow-sm)}
.stat .lab{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px}
.stat .num{font-size:19px;font-weight:900;line-height:1.1}
.stat .cur{font-size:11.5px;font-weight:700;color:var(--muted);margin-top:3px}
.stat.total{background:linear-gradient(160deg,#eef5fc,#fff);border-color:var(--blue-100)}
.stat.total .num{color:var(--blue-800)}
.stat.paid{background:linear-gradient(160deg,var(--green-bg),#fff);border-color:#bfe9d2}
.stat.paid .num{color:var(--green)}
.stat.rest{background:linear-gradient(160deg,var(--red-bg),#fff);border-color:#f6c9c4}
.stat.rest .num{color:var(--red)}
.stat::after{content:'';position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px}
.stat.total::after{background:var(--blue-600)}
.stat.paid::after{background:var(--green)}
.stat.rest::after{background:var(--red)}
/* قائمة طرق الدفع: عمودية كما في الشكل المرجعي، ومتجاوبة مع الجوال */
.pay-grid{
  display:flex;
  flex-direction:column;
  gap:6px;
  width:100%;
  margin-top:4px;
  padding:7px;
  background:#fffdfa;
  border:1px solid #eee1c2;
  border-radius:18px;
}
.wbtn{
  position:relative;
  display:flex;
  flex-direction:row;
  direction:rtl;
  align-items:center;
  justify-content:flex-start;
  gap:12px;
  width:100%;
  min-height:54px;
  padding:7px 9px;
  background:#fff;
  border:1px solid transparent;
  border-radius:13px;
  cursor:pointer;
  font-family:inherit;
  text-align:right;
  transition:background .18s,border-color .18s,box-shadow .18s;
  -webkit-tap-highlight-color:transparent;
}
.wbtn:hover{background:#fffaf0;border-color:#efe2c6}
.wbtn:focus{outline:none}
.wbtn:focus-visible{
  outline:3px solid #2563eb;
  outline-offset:2px;
  box-shadow:0 0 0 5px rgba(37,99,235,.16);
  z-index:1;
}
.wbtn .wchip{
  display:grid;
  place-items:center;
  flex:0 0 38px;
  width:38px;
  height:38px;
  overflow:hidden;
  background:#fff;
  border:1px solid #f0ece5;
  border-radius:11px;
  box-shadow:0 2px 8px -3px rgba(0,0,0,.18);
}
.wbtn .wchip svg{width:28px;height:28px}
.wbtn .wname{
  min-width:0;
  color:#46382b;
  font-size:13px;
  font-weight:800;
  text-align:right;
  overflow-wrap:anywhere;
}
.wbtn.active{
  color:#46382b;
  background:#fff8e8;
  border-color:#e6c76e;
  box-shadow:0 2px 8px rgba(132,95,27,.08);
}
.wbtn.active .wname{color:#46382b}
.wbtn .tick{
  position:absolute;
  top:50%;
  inset-inline-start:10px;
  display:none;
  width:18px;
  height:18px;
  align-items:center;
  justify-content:center;
  color:#198754;
  background:#fff;
  border-radius:50%;
  box-shadow:0 1px 5px rgba(0,0,0,.12);
  transform:translateY(-50%);
}
.wbtn.active .tick{display:flex}
@media(max-width:420px){
  .pay-root{padding:14px 10px 36px}
  .pay-card{padding:14px}
  .pay-grid{gap:4px;padding:6px}
  .wbtn{min-height:52px;gap:10px;padding:6px 8px}
  .wbtn .wname{font-size:12px}
  .pay-acc{padding:13px}
  .pay-accnum{padding:11px}
  .pay-accnum .name-val{font-size:14px;overflow-wrap:anywhere}
  .pay-accnum .num-val{font-size:20px}
}
@media(prefers-reduced-motion:reduce){
  .wbtn{transition:none}
}
/* account box */
.pay-acc{margin-top:16px;border-radius:16px;padding:16px;color:#fff;position:relative;overflow:hidden;
  box-shadow:0 12px 26px -12px rgba(0,0,0,.4);animation:slideUp .35s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.pay-acc .atop{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.pay-acc .wlogo{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-weight:900;font-size:18px}
.pay-acc .at{font-size:12px;opacity:.9}
.pay-acc .an{font-size:16px;font-weight:800}
.pay-accnum{display:flex;flex-direction:column;gap:8px;background:rgba(0,0,0,.22);border-radius:14px;padding:14px}
.pay-acc-row{display:flex;align-items:center;justify-content:space-between}
.pay-accnum .k{font-size:12px;opacity:.88;font-weight:700}
.pay-accnum .name-val{font-size:15px;font-weight:900;color:#fff}
.pay-accnum .num-val{font-size:22px;font-weight:900;letter-spacing:1px;direction:ltr;color:#fff}
.pay-accnum .cp{border:none;background:rgba(255,255,255,.25);color:#fff;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;cursor:pointer;transition:.2s}
.pay-accnum .cp:hover{background:rgba(255,255,255,.4)}
.pay-accnum .cp.ok{background:#1aa260}
/* تحميل إشعار الدفع */
.upload-box{margin-top:14px;background:rgba(255,255,255,.18);border:1.6px dashed rgba(255,255,255,.6);border-radius:14px;padding:14px;text-align:center;cursor:pointer;transition:.2s}
.upload-box:hover{background:rgba(255,255,255,.26);border-color:#fff}
.upload-box-content{display:flex;align-items:center;justify-content:center;gap:9px;font-size:13.5px;font-weight:800}
.upload-preview{margin-top:10px;position:relative;display:inline-block;border-radius:10px;overflow:hidden;border:2px solid #fff;max-height:160px}
.upload-preview img{max-height:160px;width:auto;display:block}
.upload-remove{position:absolute;top:5px;inset-inline-end:5px;background:#e3443a;color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:grid;place-items:center;font-size:12px;font-weight:900}
.pay-hint{margin-top:12px;font-size:12px;display:flex;gap:7px;align-items:center;opacity:.95;line-height:1.5}
.pay-btn{width:100%;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;
  font-family:inherit;font-weight:800;font-size:16px;border:none;cursor:pointer;padding:15px;border-radius:14px;transition:.2s}
.pay-primary{color:#fff;background:linear-gradient(135deg,var(--green),#15803d);box-shadow:0 10px 24px -8px rgba(26,162,96,.5)}
.pay-primary:hover{transform:translateY(-2px)}
.pay-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.pay-btn:focus-visible,.pay-arrow:focus-visible,.pay-wait-btn:focus-visible,
.pay-accnum .cp:focus-visible,.upload-box:focus-visible,.upload-remove:focus-visible{
  outline:3px solid #2563eb;outline-offset:3px;box-shadow:0 0 0 5px rgba(37,99,235,.16)
}
`

/* ===================== Icons ===================== */
const Hash = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>)
const Receipt = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>)
const Wallet = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H4a2 2 0 0 0-2 2v2"/><circle cx="16" cy="14" r="1.5"/></svg>)
const Card = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const Info = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>)
const CheckIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>)
const Copy = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>)
const Arrow = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>)
const Bell = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)
const Camera = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>)

const Logo = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3E86C4"/><stop offset="1" stopColor="#004A8D"/></linearGradient>
      <linearGradient id="gOr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#D86616"/><stop offset="1" stopColor="#F5A623"/></linearGradient>
    </defs>
    <path d="M22 12 L34 44 H18 L30 12 Z" fill="url(#gBlue)"/>
    <path d="M40 14 c7 0 7 9 0 9 c-7 0 -7 9 0 9" stroke="url(#gBlue)" strokeWidth={5} strokeLinecap="round" fill="none"/>
    <path d="M14 46 H46 L50 32 H20" stroke="url(#gOr)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="22" cy="54" r="4" fill="url(#gOr)"/>
    <circle cx="42" cy="54" r="4" fill="url(#gOr)"/>
    <path d="M50 10 l1.6 3.4 L55 15 l-3.4 1.6 L50 20 l-1.6-3.4 L45 15 l3.4-1.6 Z" fill="#F5A623"/>
  </svg>
)

/* ===================== خيارات المحافظ الرسمية ===================== */
type Wallet = { key: string; label: string; color: string; iconSvg: any }

const WALLETS: Wallet[] = [
  { 
    key: 'kuraimi', 
    label: 'الكريمي جوال / حاسب', 
    color: '#0e7090', 
    iconSvg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#0e7090"/>
        <path d="M12 28V12L28 20L12 28Z" fill="#fff"/>
        <circle cx="28" cy="14" r="3" fill="#f59e0b"/>
      </svg>
    )
  },
  { 
    key: 'onecash', 
    label: 'ون كاش OneCash', 
    color: '#7c3aed', 
    iconSvg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#7c3aed"/>
        <circle cx="20" cy="20" r="10" stroke="#fff" strokeWidth="3"/>
        <path d="M20 14V26" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    )
  },
  { 
    key: 'floosak', 
    label: 'فلوسك Floosak', 
    color: '#2563eb', 
    iconSvg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#2563eb"/>
        <path d="M14 26C14 20 18 14 26 14M26 14V22M26 14H18" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    key: 'jawali', 
    label: 'جوالي Jawali', 
    color: '#be185d', 
    iconSvg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#be185d"/>
        <rect x="13" y="10" width="14" height="20" rx="3" stroke="#fff" strokeWidth="2.5"/>
        <circle cx="20" cy="25" r="1.5" fill="#fff"/>
      </svg>
    )
  },
  { 
    key: 'jeeb', 
    label: 'جيب Jeeb', 
    color: '#0284c7', 
    iconSvg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#0284c7"/>
        <path d="M12 16H28V24C28 27 25 29 20 29C15 29 12 27 12 24V16Z" fill="#fff"/>
        <line x1="16" y1="13" x2="24" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  },
  { 
    key: 'najm', 
    label: 'حوالة النجم', 
    color: '#ea580c', 
    iconSvg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#ea580c"/>
        <path d="M20 11L22.5 17.5L29 18L24 22.5L25.5 29L20 25.5L14.5 29L16 22.5L11 18L17.5 17.5L20 11Z" fill="#fff"/>
      </svg>
    )
  },
]

// بيانات الحساب الموحدة لجميع المحافظ
const UNIFIED_PHONE = '772399744'
const UNIFIED_NAME = 'زين العابدين مطيع حاتم الوصابي'

function fmt(n: number) {
  if (!n || isNaN(n)) return '0'
  return Number(Math.round(n)).toLocaleString('en-US')
}

/* ===================== Component ===================== */
function PayPage() {
  const { order } = Route.useSearch()
  const navigate = useNavigate()

  const orderNo = order || 'SHP-885120'

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [productName, setProductName] = useState('')
  const [currency, setCurrency] = useState('ر.ي')
  const [total, setTotal] = useState(0)
  const [paid, setPaid] = useState(0)
  const [status, setStatus] = useState('غير مكتمل')
  
  // حالة زر إشعار الإدارة
  const [isNotified, setIsNotified] = useState(false)
  const [notifying, setNotifying] = useState(false)

  // حالة صورة إشعار الدفع
  const [receiptImg, setReceiptImg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = Math.max(total - paid, 0)
  const isPaid = /مدفوع|مكتمل|paid|complete/i.test(status) && !/غير/.test(status)

  // قراءة تفاصيل الطلب من Supabase + fallback من الذاكرة المحلية
  useEffect(() => {
    let active = true

    const loadOrderData = async () => {
      setLoading(true)

      // 1. فحص فوري من التخزين المحلي كـ fallback سريع
      let fallbackFound = false
      try {
        const localList = JSON.parse(localStorage.getItem('alsouk_orders') || '[]')
        const matched = localList.find((o: any) => o.tracking_code === orderNo || o.id === orderNo)
        if (matched) {
          fallbackFound = true
          setCustomer(matched.customer_name || '')
          setPhone(matched.phone || '')
          setProductName(matched.product_name || '')
          if (matched.status) setStatus(matched.status)
        }

        const localUser = JSON.parse(localStorage.getItem('alsouk_current_user') || '{}')
        if (localUser.full_name && !customer) setCustomer(localUser.full_name)
        if (localUser.phone && !phone) setPhone(localUser.phone)
      } catch {}

      // 2. فحص حالة الإشعار وصورة السند المخزنة سابقاً
      const notificationKey = `notified_order_${orderNo}`
      if (localStorage.getItem(notificationKey) === 'true') {
        setIsNotified(true)
      }
      const savedReceipt = localStorage.getItem(`receipt_order_${orderNo}`)
      if (savedReceipt) {
        setReceiptImg(savedReceipt)
      }

      // 3. الاستعلام الدقيق من جدول orders باستخدام tracking_code
      try {
        const { data: dbOrder } = await supabase
          .from('orders')
          .select('id, tracking_code, customer_name, phone, product_name, notes, status, created_at, user_id')
          .or(`tracking_code.eq.${orderNo},id.eq.${orderNo}`)
          .maybeSingle()

        if (dbOrder && active) {
          setCustomer(dbOrder.customer_name || '')
          setPhone(dbOrder.phone || '')
          setProductName(dbOrder.product_name || 'طلب متجر دولي')
          if (dbOrder.status) setStatus(dbOrder.status)

          // استخراج السعر المعلن من تفاصيل notes
          const notesText = dbOrder.notes || ''
          const priceMatch = notesText.match(/السعر المعلن:\s*([\d.]+)\s*([^|]*)/)
          if (priceMatch) {
            const rawPrice = parseFloat(priceMatch[1] ?? '0') || 0
            const rawCur = priceMatch[2]?.trim() || ''

            if (rawCur.includes('سعودي') || rawCur.includes('ر.س')) {
              setTotal(rawPrice * 142)
              setCurrency('ر.ي')
            } else if (rawCur.includes('$') || rawCur.includes('دولار')) {
              setTotal(rawPrice * 535)
              setCurrency('ر.ي')
            } else if (rawPrice > 0) {
              setTotal(rawPrice)
              setCurrency(rawCur || 'ر.ي')
            }
          } else {
            setTotal(45000)
            setCurrency('ر.ي')
          }
        } else if (!fallbackFound) {
          setTotal(38500)
          setCurrency('ر.ي')
          const uName = localStorage.getItem('sc_name') || 'عميل السوق الشامل'
          const uPhone = localStorage.getItem('sc_phone') || '772399744'
          setCustomer(uName)
          setPhone(uPhone)
        }
      } catch (err) {
        console.warn('Order fetch fallback applied:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrderData()
    return () => { active = false }
  }, [orderNo])

  // دالة تفعيل زر إشعار الإدارة
  const handleNotifyAdmin = async () => {
    if (isNotified || notifying) return
    setNotifying(true)

    try {
      // 1. تسجيل طلب الدفع في القاعدة ليظهر للإدارة في قسم طلبات الدفع
      const { data: { session } } = await supabase.auth.getSession()
      const { error: payErr } = await supabase.from('payments').insert({
        tracking_code: orderNo,
        customer_name: customer || null,
        phone: phone || null,
        wallet: wallet?.label || walletKey,
        amount: remaining,
        currency,
        receipt_image: receiptImg,
        user_id: session?.user?.id ?? null,
      })
      if (payErr) throw payErr

      // 2. تحديث حالة الطلب في orders
      await supabase
        .from('orders')
        .update({ status: 'قيد مراجعة الدفع والتأكيد' })
        .eq('tracking_code', orderNo)

      setStatus('قيد مراجعة الدفع والتأكيد')
      setIsNotified(true)
      localStorage.setItem(`notified_order_${orderNo}`, 'true')
    } catch (e) {
      console.error(e)
      alert('تعذّر إرسال إشعار الدفع، يرجى المحاولة مرة أخرى.')
    } finally {
      setNotifying(false)
    }
  }

  // معالجة رفع صورة إشعار الدفع
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setReceiptImg(base64)
      try {
        localStorage.setItem(`receipt_order_${orderNo}`, base64)
      } catch {}
    }
    reader.readAsDataURL(file)
  }

  const [walletKey, setWalletKey] = useState('kuraimi')
  const [copied, setCopied] = useState(false)
  const wallet = useMemo(() => WALLETS.find((w) => w.key === walletKey) || WALLETS[0], [walletKey])

  const copyAcc = async () => {
    try {
      await navigator.clipboard.writeText(UNIFIED_PHONE)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="pay-root">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div className="pay-wrap">

        <header className="pay-topbar">
          <div className="pay-badge"><Logo /></div>
          <div className="pay-brand">
            <h1>SHOPPING <b>AL SHAMEL</b></h1>
            <p>طرق الدفع • أودِع بأمان</p>
          </div>
          <button className="pay-arrow" type="button" title="رجوع" onClick={() => navigate({ to: '/dashboard' })}>
            <Arrow />
          </button>
        </header>

        {/* تفاصيل الطلب */}
        <section className="pay-card">
          <div className="pay-head">
            <div className="pay-ico"><Receipt /></div>
            <div className="pay-title">تفاصيل الطلب</div>
          </div>
          <div className="pay-ord">
            <div className="od-top">
              <div className="od-box num">
                <div className="od-k">رقم الطلب</div>
                <div className="od-v"><Hash />{orderNo}</div>
              </div>
              <div className="od-box stat">
                <div className="od-k">حالة الدفع</div>
                <div className="od-v">
                  <span className={'badge ' + (isPaid ? 'ok' : 'warn')}>
                    {loading ? '...' : status}
                  </span>
                </div>
              </div>
            </div>

            {/* اسم العميل ورقم الهاتف وتفاصيل المنتج */}
            <div className="od-name">
              {loading ? 'جارٍ التحميل...' : `${customer || 'عميل السوق الشامل'} • ${phone || ''}`}
            </div>
            {productName && (
              <div className="od-prod">
                {productName}
              </div>
            )}

            {/* زر يرجى الانتظار التفاعلي مع الإدارة */}
            <button
              type="button"
              className={`pay-wait-btn ${isNotified ? 'notified' : ''}`}
              onClick={handleNotifyAdmin}
              disabled={isNotified || notifying}
              title="انقر لإشعار الإدارة فوراً بمراجعة طلبك"
            >
              {isNotified ? (
                <>
                  <CheckIc />
                  <span>تم إشعار الإدارة بنجاح! طلبك قيد المراجعة الفورية الآن ✓</span>
                </>
              ) : notifying ? (
                <span>جارٍ إشعار الإدارة...</span>
              ) : (
                <>
                  <Bell />
                  <span>يرجى الانتظار حتى يتم مراجعة طلبك • (انقر هنا لإشعار الإدارة الآن)</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ملخص المبالغ (الإجمالي، المدفوع، المتبقي) بالريال */}
        <section className="pay-card">
          <div className="pay-head">
            <div className="pay-ico"><Wallet /></div>
            <div className="pay-title">ملخص المبالغ المالية</div>
          </div>
          <div className="pay-stats">
            <div className="stat total">
              <div className="lab">الإجمالي المطلوب</div>
              <div className="num">{loading ? '…' : fmt(total)}</div>
              <div className="cur">{currency}</div>
            </div>
            <div className="stat paid">
              <div className="lab">المدفوع حالياً</div>
              <div className="num">{loading ? '…' : fmt(paid)}</div>
              <div className="cur">{currency}</div>
            </div>
            <div className="stat rest">
              <div className="lab">المتبقي عليكم</div>
              <div className="num">{loading ? '…' : fmt(remaining)}</div>
              <div className="cur">{currency}</div>
            </div>
          </div>
        </section>

        {/* طريقة الدفع والحسابات المعتمدة */}
        <section className="pay-card">
          <div className="pay-head alt">
            <div className="pay-ico"><Card /></div>
            <div className="pay-title">طريقة الدفع المعتمدة</div>
          </div>
          <div className="pay-grid" role="listbox" aria-label="اختر طريقة الدفع">
            {WALLETS.map((w) => {
              const active = w.key === walletKey
              return (
                <button
                  key={w.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={'wbtn' + (active ? ' active' : '')}
                  style={active ? { background: '#fff8e8', borderColor: '#e6c76e' } : undefined}
                  onClick={() => { setWalletKey(w.key); setCopied(false) }}
                >
                  <span className="tick"><CheckIc /></span>
                  <span className="wchip">
                    {w.iconSvg}
                  </span>
                  <span className="wname">{w.label}</span>
                </button>
              )
            })}
          </div>

          {wallet && (
            <div className="pay-acc" style={{ background: `linear-gradient(140deg, ${wallet.color}, ${wallet.color}cc)` }}>
              <div className="atop">
                <div className="wlogo" style={{ background: '#fff', color: wallet.color }}>
                  {wallet.iconSvg}
                </div>
                <div>
                  <div className="at">أودِع عبر</div>
                  <div className="an">{wallet.label}</div>
                </div>
              </div>

              {/* 🌟 صندوق رقم الحساب والاسم الموحد */}
              <div className="pay-accnum">
                <div className="pay-acc-row">
                  <div>
                    <div className="k">اسم المستلم المعتمد:</div>
                    <div className="name-val">{UNIFIED_NAME}</div>
                  </div>
                </div>
                <div className="pay-acc-row" style={{ marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.25)', paddingTop: 8 }}>
                  <div>
                    <div className="k">رقم الحساب / المحفظة:</div>
                    <div className="num-val">{UNIFIED_PHONE}</div>
                  </div>
                  <button className={'cp' + (copied ? ' ok' : '')} type="button" onClick={copyAcc} title="نسخ الرقم">
                    {copied ? <CheckIc /> : <Copy />}
                  </button>
                </div>
              </div>

              {/* 🌟 بقعة الخط الأخضر — زر وخانة تحميل صورة إشعار الدفع */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
              
              <div 
                className="upload-box" 
                onClick={() => fileInputRef.current?.click()}
                title="انقر لتحميل صورة إشعار التحويل أو لقطة الشاشة"
              >
                <div className="upload-box-content">
                  <Camera />
                  <span>{receiptImg ? 'تغيير صورة سند / إشعار التحويل' : 'اضغط هنا لتحميل صورة إشعار الدفع (سند التحويل)'}</span>
                </div>
                {receiptImg && (
                  <div className="upload-preview" onClick={(e) => e.stopPropagation()}>
                    <img src={receiptImg} alt="سند الدفع" />
                    <button 
                      className="upload-remove" 
                      type="button" 
                      title="حذف الصورة"
                      onClick={() => {
                        setReceiptImg(null)
                        localStorage.removeItem(`receipt_order_${orderNo}`)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="pay-hint">
                <Info />
                <span>أودِع المبلغ المطلوب ({fmt(remaining)} {currency}) إلى الرقم والاسم أعلاه، ثم ارفع صورة الإشعار واضغط على الزر أدناه لتأكيد الإيداع.</span>
              </div>
            </div>
          )}

          {/* زر تأكيد الإيداع وإشعار الإدارة */}
          <button 
            className="pay-btn pay-primary" 
            type="button" 
            disabled={!wallet || notifying || isNotified}
            aria-live="polite"
            aria-busy={notifying}
            onClick={handleNotifyAdmin}
          >
            {isNotified ? <CheckIc /> : null}
            <span>
              {notifying
                ? 'جارٍ إرسال إشعار الدفع للإدارة...'
                : isNotified
                  ? 'تم إرسال إشعار الدفع للإدارة بنجاح ✓'
                  : 'لقد أودعت المبلغ — إشعار الإدارة الآن'}
            </span>
          </button>
        </section>

      </div>
    </div>
  )
}
