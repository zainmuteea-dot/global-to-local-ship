import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
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
    radial-gradient(1000px 500px at 0% 110%,rgba(245,166,35,.10),transparent 55%),var(--bg);
  position:relative;}
.pay-wrap{max-width:620px;margin:0 auto}

/* Header Topbar */
.pay-topbar{background:linear-gradient(135deg,var(--blue-800) 0%,var(--blue-900) 55%,#06284a 100%);
  border-radius:22px;padding:16px 20px;color:#fff;box-shadow:var(--shadow);position:relative;
  overflow:visible;display:flex;align-items:center;gap:14px}
.pay-topbar::after{content:'';position:absolute;inset:0;border-radius:22px;pointer-events:none;
  background:radial-gradient(140px 140px at 10% 120%,rgba(245,166,35,.35),transparent 70%)}
.pay-badge{width:50px;height:50px;border-radius:15px;flex:0 0 auto;
  background:linear-gradient(145deg,#fff,#eaf2fb);display:grid;place-items:center;position:relative;z-index:1;
  box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}
.pay-badge svg{width:32px;height:32px}
.pay-brand{z-index:1;flex:1}
.pay-brand h1{font-size:18px;font-weight:900;letter-spacing:.3px;line-height:1.2}
.pay-brand h1 b{color:var(--orange-400)}
.pay-brand p{font-size:11.5px;color:#bcd3ec;font-weight:600;margin-top:2px}

.pay-top-actions{margin-inline-start:auto;display:flex;align-items:center;gap:8px;z-index:2;position:relative}
.pay-arrow{width:38px;height:38px;border-radius:11px;
  display:grid;place-items:center;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;transition:.2s;border:none}
.pay-arrow:hover{background:rgba(255,255,255,.24)}

/* Notification Bell Button */
.pay-bell-btn{width:38px;height:38px;border-radius:11px;
  display:grid;place-items:center;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;transition:.2s;border:none;position:relative}
.pay-bell-btn:hover{background:rgba(255,255,255,.24)}
.pay-bell-btn.shake{animation:bellShake 0.6s cubic-bezier(.36,.07,.19,.97) both}
.pay-bell-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:10.5px;
  font-weight:900;border-radius:10px;padding:1px 6px;min-width:18px;height:18px;display:grid;place-items:center;
  box-shadow:0 0 10px rgba(239,68,68,0.85);border:2px solid #004A8D;animation:badgePulse 1.8s infinite}

/* Notification Dropdown Menu */
.pay-notif-menu{position:absolute;top:48px;left:0;width:310px;background:#ffffff;border-radius:18px;
  box-shadow:0 20px 45px -10px rgba(15,36,64,.35),0 0 0 1px rgba(0,74,141,.08);color:var(--ink);
  padding:14px;z-index:100;text-align:right;direction:rtl;animation:menuPop .25s ease-out}
.notif-menu-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #f1f5f9;margin-bottom:10px}
.notif-menu-title{font-size:13.5px;font-weight:900;color:var(--blue-900);display:flex;align-items:center;gap:6px}
.notif-mark-read{font-size:11px;color:var(--blue-600);background:none;border:none;cursor:pointer;font-weight:700;padding:2px 6px;border-radius:6px}
.notif-mark-read:hover{background:var(--blue-50)}
.notif-list{max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.notif-item{display:block;width:100%;text-align:right;font-family:inherit;background:var(--bg);padding:10px 12px;border-radius:12px;font-size:12px;border-right:3.5px solid var(--blue-500);transition:.15s;cursor:pointer}
.notif-item:hover{filter:brightness(.98)}
.notif-item.approved{border-right-color:var(--green);background:var(--green-bg)}
.notif-item-title{font-weight:800;color:var(--ink);margin-bottom:2px;display:flex;align-items:center;justify-content:space-between}
.notif-item-desc{color:var(--muted);line-height:1.4}
.notif-item-time{font-size:10px;color:#94a3b8;margin-top:4px}
.notif-empty{padding:24px 10px;text-align:center;color:var(--muted);font-size:12.5px}
.notif-error{margin-bottom:8px;padding:8px 10px;border-radius:10px;background:#fff1f2;color:#be123c;font-size:11px}

/* Top Floating Banner Toast */
.pay-banner-wrap{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;
  width:92%;max-width:540px;animation:slideDownBanner .38s cubic-bezier(0.16,1,0.3,1)}
.pay-banner{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;
  border-radius:16px;padding:14px 16px;box-shadow:0 14px 34px -8px rgba(16,185,129,0.55),0 0 0 1px rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;transition:transform .2s,box-shadow .2s}
.pay-banner:hover{transform:translateY(-2px);box-shadow:0 18px 40px -8px rgba(16,185,129,0.65)}
.pay-banner-body{display:flex;align-items:center;gap:12px}
.pay-banner-icon{font-size:24px;flex:0 0 auto;display:grid;place-items:center;background:rgba(255,255,255,0.22);width:42px;height:42px;border-radius:12px}
.pay-banner-title{font-size:14.5px;font-weight:900;letter-spacing:.2px}
.pay-banner-sub{font-size:12px;opacity:0.95;margin-top:2px;line-height:1.4}
.pay-banner-actions{display:flex;align-items:center;gap:8px}
.pay-banner-close{background:rgba(255,255,255,0.25);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;display:grid;place-items:center;font-size:13px;transition:.2s}
.pay-banner-close:hover{background:rgba(255,255,255,0.4)}

@keyframes slideDownBanner{
  0%{opacity:0;transform:translate(-50%,-24px) scale(0.96)}
  100%{opacity:1;transform:translate(-50%,0) scale(1)}
}
@keyframes bellShake{
  0%,100%{transform:rotate(0)}
  20%,60%{transform:rotate(14deg)}
  40%,80%{transform:rotate(-14deg)}
}
@keyframes badgePulse{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.15)}
}
@keyframes menuPop{
  0%{opacity:0;transform:translateY(-8px) scale(0.97)}
  100%{opacity:1;transform:translateY(0) scale(1)}
}

/* Original Cards & Form */
.pay-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:18px;margin-top:16px;box-shadow:var(--shadow-sm)}
.pay-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.pay-ico{width:34px;height:34px;border-radius:10px;background:var(--blue-100);color:var(--blue-800);display:grid;place-items:center}
.pay-title{font-size:15px;font-weight:800;color:var(--blue-900)}
.pay-ord{display:flex;flex-direction:column;gap:10px}
.od-top{display:flex;gap:10px}
.od-box{flex:1;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px 14px}
.od-k{font-size:11px;color:var(--muted);font-weight:700}
.od-v{font-size:15px;font-weight:900;color:var(--ink);display:flex;align-items:center;gap:6px;margin-top:2px}
.badge{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:800}
.badge.ok{background:var(--green-bg);color:var(--green)}
.badge.warn{background:#fff8e8;color:#b45309}
.od-name{font-size:13px;font-weight:800;color:var(--blue-900);padding:4px 6px}
.od-prod{font-size:12px;color:var(--muted);padding:0 6px}

.pay-wait-btn{width:100%;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;
  font-family:inherit;font-weight:800;font-size:13px;padding:11px 14px;border-radius:12px;border:none;cursor:pointer;transition:.2s}
.pay-wait-btn.notified{background:var(--green-bg);color:var(--green)}
.pay-wait-btn:not(.notified){background:#fff8e8;color:#b45309;border:1px solid #fde68a}

.pay-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.stat{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px 10px;text-align:center}
.stat .lab{font-size:11px;color:var(--muted);font-weight:700;margin-bottom:4px}
.stat .num{font-size:19px;font-weight:900;line-height:1.2}
.stat .cur{font-size:11px;color:var(--muted);font-weight:700}
.stat.total .num{color:var(--blue-900)}
.stat.paid .num{color:var(--green)}
.stat.rest .num{color:var(--red)}

.pay-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;padding:7px;background:#fffdfa;border:1px solid #eee1c2;border-radius:18px;}
.wbtn{position:relative;display:flex;direction:rtl;align-items:center;gap:12px;width:100%;min-height:54px;padding:7px 9px;background:#fff;border:1px solid transparent;border-radius:13px;cursor:pointer;font-family:inherit;text-align:right;transition:.18s;}
.wbtn:hover{background:#fffaf0;border-color:#efe2c6}
.wbtn .wchip{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;overflow:hidden;background:#fff;border:1px solid #f0ece5;border-radius:11px;}
.wbtn .wname{min-width:0;color:#46382b;font-size:13px;font-weight:800}
.wbtn.active{background:#fff8e8;border-color:#e6c76e}
.wbtn .tick{position:absolute;top:50%;inset-inline-start:10px;display:none;width:18px;height:18px;align-items:center;justify-content:center;color:#198754;background:#fff;border-radius:50%;transform:translateY(-50%)}
.wbtn.active .tick{display:flex}

.pay-acc{margin-top:16px;border-radius:16px;padding:16px;color:#fff;position:relative;overflow:hidden;box-shadow:0 12px 26px -12px rgba(0,0,0,.4)}
.pay-acc .atop{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.pay-acc .wlogo{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;font-weight:900;font-size:18px;flex:0 0 auto}
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

.upload-box{margin-top:14px;background:rgba(255,255,255,.18);border:1.6px dashed rgba(255,255,255,.6);border-radius:14px;padding:14px;text-align:center;cursor:pointer;transition:.2s}
.upload-box:hover{background:rgba(255,255,255,.26);border-color:#fff}
.upload-box-content{display:flex;align-items:center;justify-content:center;gap:9px;font-size:13.5px;font-weight:800}
.upload-preview{margin-top:10px;position:relative;display:inline-block;border-radius:10px;overflow:hidden;border:2px solid #fff;max-height:160px}
.upload-preview img{max-height:160px;width:auto;display:block}
.upload-remove{position:absolute;top:5px;inset-inline-end:5px;background:#e3443a;color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:grid;place-items:center;font-size:12px;font-weight:900}
.pay-hint{margin-top:12px;font-size:12px;display:flex;gap:7px;align-items:center;opacity:.95;line-height:1.5}
.pay-btn{width:100%;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:800;font-size:16px;border:none;cursor:pointer;padding:15px;border-radius:14px;transition:.2s}
.pay-primary{color:#fff;background:linear-gradient(135deg,var(--green),#15803d);box-shadow:0 10px 24px -8px rgba(26,162,96,.5)}
.pay-primary:hover{transform:translateY(-2px)}
.pay-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.pay-error{margin-top:10px;background:var(--red-bg);color:var(--red);padding:10px 14px;border-radius:10px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
.pay-success{margin-top:10px;padding:12px 14px;border-radius:10px;background:var(--green-bg);color:#087443;font-size:13px;font-weight:800;line-height:1.65}
.pay-retry{background:var(--red);color:#fff;border:none;border-radius:8px;padding:4px 10px;cursor:pointer;font-family:inherit;font-size:12px}
`

/* ===================== Icons ===================== */
const Hash = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>)
const Receipt = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>)
const Wallet = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H4a2 2 0 0 0-2 2v2"/><circle cx="16" cy="14" r="1.5"/></svg>)
const Card = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const Info = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>)
const CheckIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>)
const Copy = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>)
const Arrow = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>)
const Bell = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)
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

type Wallet = { key: string; label: string; color: string; mark: string; markClass?: string }

const WALLETS: Wallet[] = [
  { key: 'kuraimi', label: 'الكريمي جوال / حاسب', color: '#0e7090', mark: 'K' },
  { key: 'onecash', label: 'ون كاش OneCash', color: '#7c3aed', mark: '1C' },
  { key: 'floosak', label: 'فلوسك Floosak', color: '#2563eb', mark: 'F' },
  { key: 'jawali', label: 'جوالي Jawali', color: '#be185d', mark: 'J' },
  { key: 'jeeb', label: 'جيب Jeeb', color: '#0284c7', mark: 'Je' },
  { key: 'najm', label: 'حوالة النجم', color: '#ea580c', mark: '✦', markClass: 'najm' },
]

const UNIFIED_PHONE = '772399744'
const UNIFIED_NAME = 'زين العابدين مطيع حاتم الوصابي'

function fmt(n: number) {
  if (!n || isNaN(n)) return '0'
  return Number(Math.round(n)).toLocaleString('en-US')
}

// نغمة قصيرة من Web Audio API، لا تحتاج إلى ملف صوت خارجي.
function playApprovalTone(context: AudioContext) {
  const now = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, now)
  oscillator.frequency.setValueAtTime(1174, now + 0.13)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.025)
  gain.gain.setValueAtTime(0.16, now + 0.16)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.43)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/* ===================== Component ===================== */
function PayPage() {
  const { order } = Route.useSearch()
  const navigate = useNavigate()

  const orderNo = order || ''

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [productName, setProductName] = useState('')
  const [currency, setCurrency] = useState('ر.ي')
  const [total, setTotal] = useState(0)
  const [paid, setPaid] = useState(0)
  const [status, setStatus] = useState('غير مكتمل')
  
  const [isNotified, setIsNotified] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [paymentSaved, setPaymentSaved] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentWarning, setPaymentWarning] = useState('')

  const [receiptImg, setReceiptImg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notifications State & Realtime Banner
  const [notifications, setNotifications] = useState<any[]>([])
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())
  const [notificationUserId, setNotificationUserId] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState('')
  const [activeBanner, setActiveBanner] = useState<any | null>(null)
  const [showBellMenu, setShowBellMenu] = useState(false)
  const [bellShake, setBellShake] = useState(false)
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const remaining = Math.max(total - paid, 0)
  const isPaid = /مدفوع|مكتمل|paid|complete/i.test(status) && !/غير|جزئي/i.test(status)

  // اعرض الرصيد الحالي للطلب بدل المبلغ القديم المخزّن داخل نص الإشعار.
  const notificationMessage = (notice: any) => {
    const original = String(
      notice?.body ?? notice?.message ?? 'تم تأكيد استلام المبلغ بنجاح!',
    )
    const currentRemaining = loading || loadError
      ? 'المتبقي عليك حالياً قيد التحقق'
      : `المتبقي عليك حالياً: ${fmt(remaining)} ${currency}`

    const remainingPattern =
      /((?:المتبقي|متبقي|الباقي|باقي)(?:\s+(?:عليكم|عليك|علي|لكم|لك))?(?:\s+(?:حالياً|حاليًا))?\s*[:：]?\s*)(?:[٠-٩0-9][٠-٩0-9٬,،.]*\s*(?:ر\.?\s*ي|ريال(?:\s+يمني)?|YER)?|صفر|لا\s+يوجد)/iu
    const replacement = `المتبقي عليك حالياً: ${loading || loadError ? 'قيد التحقق' : `${fmt(remaining)} ${currency}`}`
    const updated = original.replace(remainingPattern, replacement)
    const hasOrder = original.includes(orderNo)

    if (updated !== original) {
      return hasOrder || !orderNo ? updated : `${updated} • الطلب: ${orderNo}`
    }
    return `${original} • ${currentRemaining}${hasOrder || !orderNo ? '' : ` • الطلب: ${orderNo}`}`
  }

  // تحميل تفاصيل الطلب والدفعات من Supabase، مع إظهار الخطأ بدلاً من عرض مبالغ افتراضية.
  const loadOrderData = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    if (!orderNo) {
      setLoadError('لم يصل رقم الطلب إلى صفحة الدفع. ارجع إلى طلباتي وافتح الدفع من الطلب الصحيح.')
      setLoading(false)
      return
    }

    try {
      const orderQuery = supabase
        .from('orders')
        .select('id, tracking_code, customer_name, phone, product_name, notes, status, created_at, user_id, total_cost_yer, paid_amount, remaining_amount, payment_status')

      const { data: dbOrder, error: orderError } = await (isUuid(orderNo)
        ? orderQuery.or(`tracking_code.eq.${orderNo},id.eq.${orderNo}`)
        : orderQuery.eq('tracking_code', orderNo)
      ).maybeSingle()

      if (orderError) throw new Error(`تعذر تحميل بيانات الطلب: ${orderError.message}`)
      if (!dbOrder) {
        setLoadError('لم نعثر على هذا الطلب. تحقق من رقم التتبع أو افتح الدفع من صفحة طلباتي.')
        return
      }

      const trackingCode = dbOrder.tracking_code || orderNo
      const { data: paymentsList, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, status, receipt_image')
        .eq('order_tracking', trackingCode)

      if (paymentsError) throw new Error(`تعذر تحميل سجل الدفعات: ${paymentsError.message}`)

      let totalApprovedPaid = 0
      let hasPendingPayment = false
      let latestReceipt = ''

      for (const payment of paymentsList ?? []) {
        if (payment.status === 'approved') {
          totalApprovedPaid += Number(payment.amount) || 0
        } else if (payment.status === 'pending' || payment.status === 'بانتظار التأكيد') {
          hasPendingPayment = true
          if (payment.receipt_image) latestReceipt = payment.receipt_image
        }
      }

      setCustomer(dbOrder.customer_name || '')
      setPhone(dbOrder.phone || '')
      setProductName(dbOrder.product_name || 'طلب متجر دولي')

      let calculatedTotal = Number(dbOrder.total_cost_yer) || 0
      if (!calculatedTotal) {
        const notesText = dbOrder.notes || ''
        const priceMatch = notesText.match(/السعر المعلن:\s*([\d.]+)\s*([^|]*)/)
        if (priceMatch) {
          const rawPrice = parseFloat(priceMatch[1] ?? '0') || 0
          const rawCurrency = priceMatch[2]?.trim() || ''
          if (rawCurrency.includes('سعودي') || rawCurrency.includes('ر.س')) {
            calculatedTotal = Math.round(rawPrice * 142)
          } else if (rawCurrency.includes('$') || rawCurrency.includes('دولار')) {
            calculatedTotal = Math.round(rawPrice * 535)
          } else if (rawPrice > 0) {
            calculatedTotal = Math.round(rawPrice)
          }
        }
      }

      setTotal(calculatedTotal)
      setCurrency('ر.ي')
      const orderPaid = Number(dbOrder.paid_amount) || 0
      const finalPaid = Math.max(orderPaid, totalApprovedPaid)
      setPaid(finalPaid)

      if (calculatedTotal <= 0) {
        setLoadError('تم تحميل الطلب، لكن لم يُسجل إجمالي يمكن التحقق منه. لا تحوّل مبلغاً من هذه الصفحة؛ تواصل مع الإدارة لتأكيد المبلغ.')
      }

      if (calculatedTotal > 0 && finalPaid >= calculatedTotal) {
        setStatus('مدفوع بالكامل')
        setIsNotified(false)
      } else if (finalPaid > 0) {
        setStatus(hasPendingPayment ? 'قيد مراجعة الدفعة الإضافية' : 'مدفوع جزئياً')
        setIsNotified(hasPendingPayment)
      } else if (hasPendingPayment) {
        setStatus('قيد مراجعة الدفع والتأكيد')
        setIsNotified(true)
      } else {
        setStatus(dbOrder.status || 'بانتظار الدفع')
        setIsNotified(false)
      }

      if (latestReceipt) setReceiptImg(latestReceipt)
    } catch (error) {
      console.error('Order/payment data load failed:', error)
      const message = error instanceof Error ? error.message : 'تعذر الاتصال بالخادم لتحميل بيانات الدفع.'
      setLoadError(`${message} تحقق من اتصال الإنترنت ثم أعد المحاولة.`)
    } finally {
      setLoading(false)
    }
  }, [orderNo])

  // تحميل البيانات الأولية
  useEffect(() => {
    loadOrderData()
  }, [loadOrderData])

  const playNotificationTone = useCallback(() => {
    if (!notificationSoundEnabled) return

    const context = audioContextRef.current
    if (!context || context.state === 'closed') return

    void context.resume()
      .then(() => playApprovalTone(context))
      .catch((error) => console.warn('Notification sound error:', error))
  }, [notificationSoundEnabled])

  const toggleNotificationSound = async () => {
    if (notificationSoundEnabled) {
      setNotificationSoundEnabled(false)
      return
    }

    try {
      const context = audioContextRef.current ?? new window.AudioContext()
      audioContextRef.current = context
      await context.resume()
      setNotificationSoundEnabled(true)
      // نغمة اختبار قصيرة بعد ضغط المستخدم لتأكيد أن الصوت يعمل.
      playApprovalTone(context)
    } catch (error) {
      console.warn('Could not enable notification sound:', error)
      setNotificationSoundEnabled(false)
    }
  }

  // إشعارات اعتماد دفعات العميل، مع حفظ القراءة في notification_reads.
  useEffect(() => {
    if (!orderNo) return

    let isActive = true
    let notifChannel: any = null
    let paymentsChannel: any = null

    const isApprovalNoticeForOrder = (notice: any, userId: string) => {
      if (!notice || notice.user_id !== userId) return false

      const category = String(notice.type ?? '').toLowerCase()
      const title = String(notice.title ?? '')
      const message = String(notice.message ?? '')
      const searchableText = `${category} ${title} ${message}`

      // إشعار إرسال دفعة للمراجعة ليس إشعار اعتماد موجهاً للعميل.
      const isPendingOrRejected =
        /new_payment_submitted|pending|بانتظار|قيد المراجعة|مراجعة الدفع|دفعة جديدة|طلب سداد|rejected|رفض|لم يتم قبول|غير مقبول/i.test(searchableText)
      const isApproved =
        /payment_approved|approved_payment|تم اعتماد|اعتماد دفعتك|اعتمدت دفعتك|approved/i.test(searchableText)
      const belongsToThisOrder = searchableText.includes(orderNo)

      return isApproved && !isPendingOrRejected && belongsToThisOrder
    }

    const fetchNotifications = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          if (isActive) {
            setNotificationUserId(null)
            setNotifications([])
            setReadNotificationIds(new Set())
            setNotificationError('')
          }
          return null
        }

        const [notificationResult, readResult] = await Promise.all([
          (supabase.from('notifications') as any)
            .select('id,user_id,title,message,type,created_at,payment_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('notification_reads')
            .select('notification_id')
            .eq('user_id', user.id),
        ])

        if (notificationResult.error) throw notificationResult.error
        if (readResult.error) throw readResult.error

        const readIds = new Set<string>((readResult.data ?? []).map((row) => row.notification_id))
        const orderNotices = ((notificationResult.data ?? []) as any[])
          .filter((notice) => isApprovalNoticeForOrder(notice, user.id))

        if (isActive) {
          setNotificationUserId(user.id)
          setNotifications(orderNotices.slice(0, 30))
          setReadNotificationIds(readIds)
          setNotificationError('')
        }

        return user
      } catch (error) {
        console.warn('Fetch customer approval notifications error:', error)
        if (isActive) setNotificationError('تعذر تحميل الإشعارات أو حالة قراءتها. حاول تحديث الصفحة.')
        return null
      }
    }

  const setupNotificationListener = async () => {
      const user = await fetchNotifications()
      if (!user || !isActive) return

      notifChannel = supabase
        .channel(`client-notif-${orderNo}-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const rawNotice = payload.new as any

            if (!isApprovalNoticeForOrder(rawNotice, user.id)) return

            const newNotice = {
              ...rawNotice,
              message: rawNotice.message ?? '',
            }

            setNotifications((previous) =>
              [newNotice, ...previous.filter((notice: any) => notice.id !== newNotice.id)].slice(0, 30),
            )
            setActiveBanner(newNotice)
            setBellShake(true)
            window.setTimeout(() => setBellShake(false), 1200)
            playNotificationTone()
            void loadOrderData()
          },
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Customer notification Realtime status:', status)
          }
        })

      paymentsChannel = supabase
        .channel(`realtime-payments-${orderNo}-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `tracking_code=eq.${orderNo}`,
          },
          () => {
            void loadOrderData()
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `tracking_code=eq.${orderNo}`,
          },
          () => {
            void loadOrderData()
          },
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Order Realtime status:', status)
          }
        })
    }

    void setupNotificationListener()

    return () => {
      isActive = false
      if (notifChannel) void supabase.removeChannel(notifChannel)
      if (paymentsChannel) void supabase.removeChannel(paymentsChannel)
    }
  }, [orderNo, loadOrderData, playNotificationTone])

  useEffect(() => {
    return () => {
      const context = audioContextRef.current
      if (context && context.state !== 'closed') {
        void context.close()
      }
    }
  }, [])

  // عند الضغط على الشريط المنبثق في رأس الصفحة: يختفي وينتقل ليفتح جرس الإشعارات
  const handleBannerClick = () => {
    setActiveBanner(null)
    setShowBellMenu(true)
    setBellShake(true)
    setTimeout(() => setBellShake(false), 600)
  }

  // عداد الجرس مشتق من سجلات notification_reads المحفوظة للمستخدم.
  const unreadCount = notifications.filter((notice) => !readNotificationIds.has(notice.id)).length

  const handleMarkRead = async (notificationId: string) => {
    if (!notificationUserId || readNotificationIds.has(notificationId)) return

    const { error } = await (supabase.from('notification_reads' as never) as any).upsert(
      { notification_id: notificationId, user_id: notificationUserId },
      { onConflict: 'notification_id,user_id' },
    )

    if (error) {
      console.warn('Mark notification read error:', error)
      setNotificationError('تعذر حفظ حالة قراءة الإشعار. حاول مجددًا.')
      return
    }

    setReadNotificationIds((current) => new Set(current).add(notificationId))
    setNotificationError('')
  }

  const handleMarkAllRead = async () => {
    if (!notificationUserId) return
    const unread = notifications.filter((notice) => !readNotificationIds.has(notice.id))
    if (unread.length === 0) return

    const { error } = await (supabase.from('notification_reads' as never) as any).upsert(
      unread.map((notice) => ({ notification_id: notice.id, user_id: notificationUserId })),
      { onConflict: 'notification_id,user_id' },
    )

    if (error) {
      console.warn('Mark all notifications read error:', error)
      setNotificationError('تعذر حفظ حالة قراءة الإشعارات. حاول مجددًا.')
      return
    }

    setReadNotificationIds((current) => {
      const next = new Set(current)
      unread.forEach((notice) => next.add(notice.id))
      return next
    })
    setNotificationError('')
  }

  const handleNotifyAdmin = async () => {
    if (isNotified || notifying || loading || loadError) return
    setNotifying(true)
    setPaymentError('')
    setPaymentWarning('')

    try {
      if (!receiptImg) {
        throw new Error('أرفق صورة سند التحويل أولاً قبل إرسال طلب المراجعة.')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        throw new Error(`تعذر التحقق من تسجيل الدخول: ${authError.message}`)
      }
      if (!user) {
        const next = window.location.pathname + window.location.search
        window.location.replace(`/login?next=${encodeURIComponent(next)}`)
        return
      }

      const orderOwnershipQuery = supabase
        .from('orders')
        .select('user_id, tracking_code, customer_name, phone')
      const { data: ownedOrder, error: ownerError } = await (isUuid(orderNo)
        ? orderOwnershipQuery.or(`tracking_code.eq.${orderNo},id.eq.${orderNo}`)
        : orderOwnershipQuery.eq('tracking_code', orderNo)
      ).maybeSingle()

      if (ownerError) {
        throw new Error(`تعذر التحقق من ملكية الطلب: ${ownerError.message}`)
      }
      if (!ownedOrder || ownedOrder.user_id !== user.id) {
        throw new Error('هذا الطلب غير مرتبط بحسابك. سجّل الدخول بالحساب الذي أنشأ الطلب.')
      }
      if (!ownedOrder.tracking_code) {
        throw new Error('تعذر قراءة رمز تتبع الطلب؛ لم يتم إرسال الدفع.')
      }
      if (!Number.isFinite(remaining) || remaining <= 0) {
        throw new Error('لا يوجد مبلغ متبقٍ صالح لإرسال طلب الدفع.')
      }

      const paymentMethod = wallet?.label || walletKey
      const paymentPayload = {
        order_tracking: ownedOrder.tracking_code,
        tracking_code: ownedOrder.tracking_code,
        customer_name: ownedOrder.customer_name || null,
        phone: ownedOrder.phone || null,
        user_id: user.id,
        method: paymentMethod,
        payment_method: paymentMethod,
        amount: remaining,
        currency,
        receipt_image: receiptImg,
        status: 'pending',
        beneficiary_name: UNIFIED_NAME,
        account_number: UNIFIED_PHONE,
      }

      const { error: payErr } = await (supabase.from('payments') as any)
        .insert(paymentPayload)

      if (payErr) {
        throw new Error(`تعذر حفظ الدفعة: ${payErr.message}`)
      }

      setPaymentSaved(true)
      setStatus('قيد مراجعة الدفع والتأكيد')
      setIsNotified(true)
    } catch (e) {
      console.error('Payment notification failed:', e)
      setPaymentError(e instanceof Error ? e.message : 'تعذر حفظ الدفعة. تحقق من الاتصال ثم أعد المحاولة.')
    } finally {
      setNotifying(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPaymentError('الملف المختار ليس صورة. اختر صورة واضحة لسند التحويل.')
      input.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('حجم صورة السند أكبر من 5 ميغابايت. اختر صورة أصغر.')
      input.value = ''
      return
    }

    setPaymentError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      if (typeof base64 !== 'string') {
        setPaymentError('تعذر قراءة صورة السند. حاول اختيارها مرة أخرى.')
        return
      }
      setReceiptImg(base64)
    }
    reader.onerror = () => setPaymentError('تعذر قراءة صورة السند. تحقق من الملف ثم أعد المحاولة.')
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

      {/* الشريط التنبيهي العائم في رأس الصفحة */}
      {activeBanner && (
        <div className="pay-banner-wrap">
          <div className="pay-banner" onClick={handleBannerClick} title="انقر لعرض الإشعار في السجل">
            <div className="pay-banner-body">
              <div className="pay-banner-icon">🎉</div>
              <div>
                <div className="pay-banner-title">{activeBanner.title || 'تم اعتماد دفعتك بنجاح ✓'}</div>
                <div className="pay-banner-sub">{notificationMessage(activeBanner)}</div>
              </div>
            </div>
            <div className="pay-banner-actions">
              <button
                type="button"
                className="pay-banner-close"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveBanner(null)
                }}
                title="إغلاق"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pay-wrap">

        {/* الهيدر العلوي مع جرس الإشعارات وزر الرجوع */}
        <header className="pay-topbar">
          <div className="pay-badge"><Logo /></div>
          <div className="pay-brand">
            <h1>SHOPPING <b>AL SHAMEL</b></h1>
            <p>طرق الدفع • أودِع بأمان</p>
          </div>

          <div className="pay-top-actions">
            <button
              type="button"
              className="pay-bell-btn"
              title={notificationSoundEnabled ? 'إيقاف صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
              aria-label={notificationSoundEnabled ? 'إيقاف صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
              aria-pressed={notificationSoundEnabled}
              onClick={() => void toggleNotificationSound()}
              style={{ fontSize: 18 }}
            >
              {notificationSoundEnabled ? '🔊' : '🔇'}
            </button>
            {/* جرس الإشعارات */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`pay-bell-btn ${bellShake ? 'shake' : ''}`}
                title="سجل الإشعارات"
                onClick={() => {
                  setShowBellMenu(!showBellMenu)
                }}
              >
                <Bell />
                {unreadCount > 0 && (
                  <span className="pay-bell-badge">{unreadCount}</span>
                )}
              </button>

              {/* القائمة المنسدلة للإشعارات */}
              {showBellMenu && (
                <div className="pay-notif-menu">
                  <div className="notif-menu-header">
                    <div className="notif-menu-title">
                      <span>🔔</span>
                      <span>سجل الإشعارات</span>
                    </div>
                    {notifications.length > 0 && (
                      <button type="button" className="notif-mark-read" onClick={handleMarkAllRead}>
                        تعليم كمقروء
                      </button>
                    )}
                  </div>

                  {notificationError && <div className="notif-error" role="alert">{notificationError}</div>}
                  {notifications.length === 0 ? (
                    <div className="notif-empty">
                      لا توجد إشعارات جديدة حالياً
                    </div>
                  ) : (
                    <div className="notif-list">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => void handleMarkRead(n.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              void handleMarkRead(n.id)
                            }
                          }}
                          className={`notif-item ${/اعتماد|approved/i.test(n.title + (n.message || '')) ? 'approved' : ''} ${!readNotificationIds.has(n.id) ? 'notif-unread' : ''}`}
                        >
                          <div className="notif-item-title">
                            <span>{n.title}</span>
                            {!readNotificationIds.has(n.id) && (
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                            )}
                          </div>
                          <div className="notif-item-desc">{notificationMessage(n)}</div>
                          <div className="notif-item-time">
                            {n.created_at
                              ? new Date(n.created_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
                              : 'الآن'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* زر الرجوع */}
            <button className="pay-arrow" type="button" title="رجوع" onClick={() => navigate({ to: '/dashboard' })}>
              <Arrow />
            </button>
          </div>
        </header>

        {loadError && (
          <div className="pay-card" role="alert" aria-live="assertive">
            <div className="pay-error" style={{ marginTop: 0 }}>
              <div>{loadError}</div>
              <button className="pay-retry" type="button" onClick={() => void loadOrderData()} disabled={loading}>
                {loading ? 'جارٍ التحقق...' : 'إعادة المحاولة'}
              </button>
            </div>
          </div>
        )}

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

            <div className="od-name">
              {loading ? 'جارٍ التحميل...' : `${customer || 'عميل السوق الشامل'} • ${phone || ''}`}
            </div>
            {productName && (
              <div className="od-prod">
                {productName}
              </div>
            )}

            <button
              type="button"
              className={`pay-wait-btn ${isNotified ? 'notified' : ''}`}
              onClick={handleNotifyAdmin}
              disabled={loading || Boolean(loadError) || remaining <= 0 || isNotified || notifying}
              title="حالة المراجعة"
            >
              {isNotified ? (
                <>
                  <CheckIc />
                  <span>تم إشعار الإدارة بنجاح! طلبك قيد المراجعة الفورية الآن ✓</span>
                </>
              ) : notifying ? (
                <span>جارٍ إشعار الإدارة...</span>
              ) : isPaid ? (
                <>
                  <CheckIc />
                  <span>تم سداد كامل المبلغ بنجاح ✓</span>
                </>
              ) : paid > 0 ? (
                <>
                  <Bell />
                  <span>تم اعتماد دفعة سابقة ({fmt(paid)} {currency}) • يمكنك سداد المتبقي أدناه</span>
                </>
              ) : (
                <>
                  <Bell />
                  <span>يرجى إيداع المبلغ وإشعار الإدارة للمراجعة الفورية</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ملخص المبالغ المالية */}
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

        {/* طريقة الدفع والتحويل */}
        {!isPaid && (
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
                    onClick={() => { setWalletKey(w.key); setCopied(false) }}
                  >
                    <span className="tick"><CheckIc /></span>
                    <span className="wchip" aria-hidden="true" style={{ color: '#fff', background: w.color, borderColor: w.color }}>
                      <span className={'brand-mark ' + (w.markClass || '')}>{w.mark}</span>
                    </span>
                    <span className="wname">{w.label}</span>
                  </button>
                )
              })}
            </div>

            {wallet && (
              <div className="pay-acc" style={{ background: `linear-gradient(140deg, ${wallet.color}, ${wallet.color}cc)` }}>
                <div className="atop">
                  <div className="wlogo" aria-hidden="true" style={{ background: '#fff', color: wallet.color }}>
                    <span className={'brand-mark ' + (wallet.markClass || '')}>{wallet.mark}</span>
                  </div>
                  <div>
                    <div className="at">أودِع عبر</div>
                    <div className="an">{wallet.label}</div>
                  </div>
                </div>

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
                  title="انقر لتحميل صورة إشعار التحويل"
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
                        onClick={() => setReceiptImg(null)}
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

            <button 
              className="pay-btn pay-primary" 
              type="button" 
              disabled={!wallet || loading || Boolean(loadError) || notifying || isNotified || remaining <= 0}
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

            {paymentSaved && (
              <div className="pay-success" role="status" aria-live="polite">
                تم حفظ طلب الدفع والسند بنجاح، وهو الآن بانتظار مراجعة الإدارة. هذا لا يعني اعتماد الدفعة بعد.
              </div>
            )}
            {paymentWarning && <div className="pay-error">{paymentWarning}</div>}
            {paymentError && (
              <div className="pay-error">
                <div>{paymentError}</div>
                <button className="pay-retry" type="button" onClick={handleNotifyAdmin} disabled={notifying}>
                  إعادة المحاولة
                </button>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
