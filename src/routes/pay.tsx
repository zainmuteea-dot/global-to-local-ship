import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/pay')({
  component: PayPage,
  validateSearch: (s: Record<string, unknown>) => ({ order: (s.order as string) || '' }),
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
/* order summary rows */
.pay-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px dashed var(--line)}
.pay-row:last-child{border-bottom:none}
.pay-row .ric{width:34px;height:34px;flex:0 0 auto;border-radius:10px;display:grid;place-items:center;
  background:var(--blue-50);color:var(--blue-800)}
.pay-row .rtx{flex:1}
.pay-row .rtx .k{font-size:12px;color:var(--muted);font-weight:700}
.pay-row .rtx .v{font-size:15px;font-weight:800;color:var(--ink)}
.pay-row .rtx .v.ltr{direction:ltr;text-align:right}
.badge{font-size:12.5px;font-weight:800;padding:5px 12px;border-radius:999px}
.badge.warn{background:#fff2df;color:#b96d05}
.badge.ok{background:var(--green-bg);color:var(--green)}
/* amount squares */
.pay-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.stat{border-radius:16px;padding:15px 10px;text-align:center;border:1.6px solid var(--line);
  background:#fff;position:relative;overflow:hidden;transition:.2s}
.stat:hover{transform:translateY(-2px);box-shadow:var(--shadow-sm)}
.stat .lab{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px}
.stat .num{font-size:19px;font-weight:900;line-height:1.1}
.stat .cur{font-size:11px;font-weight:700;color:var(--muted);margin-top:2px}
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
/* select */
.pay-selwrap{position:relative}
.pay-selwrap .lic{position:absolute;inset-inline-start:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
.pay-selwrap .caret{position:absolute;inset-inline-end:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
.pay-root select{width:100%;font-family:inherit;font-size:15px;font-weight:700;color:var(--ink);
  background:var(--blue-50);border:1.6px solid var(--line);border-radius:14px;
  padding:14px 44px;-webkit-appearance:none;appearance:none;outline:none;transition:.18s;cursor:pointer}
.pay-root select:focus{border-color:var(--blue-500);background:#fff;box-shadow:0 0 0 4px rgba(62,134,196,.14)}
/* account box (أودِع عبر) */
.pay-acc{margin-top:16px;border-radius:16px;padding:16px;color:#fff;position:relative;overflow:hidden;
  box-shadow:0 12px 26px -12px rgba(0,0,0,.4);animation:slideUp .35s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.pay-acc::after{content:'';position:absolute;inset:0;background:radial-gradient(180px 120px at 110% -20%,rgba(255,255,255,.22),transparent 70%)}
.pay-acc .atop{display:flex;align-items:center;gap:10px;position:relative;z-index:1}
.pay-acc .wlogo{width:40px;height:40px;border-radius:11px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-weight:900;font-size:16px}
.pay-acc .atop .at{font-size:13px;font-weight:700;opacity:.9}
.pay-acc .atop .an{font-size:16px;font-weight:900}
.pay-accnum{position:relative;z-index:1;margin-top:14px;background:rgba(255,255,255,.16);
  border:1.4px solid rgba(255,255,255,.3);border-radius:13px;padding:13px 15px;
  display:flex;align-items:center;gap:12px}
.pay-accnum .k{font-size:11.5px;font-weight:700;opacity:.85}
.pay-accnum .num{font-size:22px;font-weight:900;letter-spacing:1px;direction:ltr}
.pay-accnum .cp{margin-inline-start:auto;border:none;background:rgba(255,255,255,.25);color:#fff;
  width:40px;height:40px;border-radius:11px;display:grid;place-items:center;cursor:pointer;transition:.2s;flex:0 0 auto}
.pay-accnum .cp:hover{background:rgba(255,255,255,.4)}
.pay-accnum .cp.ok{background:#fff;color:var(--green)}
.pay-hint{position:relative;z-index:1;margin-top:11px;font-size:12.5px;font-weight:600;opacity:.92;display:flex;gap:7px;align-items:flex-start}
/* confirm button */
.pay-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;font-family:inherit;
  font-weight:800;font-size:16px;border:none;cursor:pointer;padding:15px;border-radius:14px;transition:.2s;margin-top:16px}
.pay-primary{color:#fff;background:linear-gradient(135deg,var(--blue-600),var(--blue-800));box-shadow:0 12px 26px -10px rgba(0,74,141,.6)}
.pay-primary:hover{transform:translateY(-2px)}
.pay-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
@media(max-width:420px){.pay-stats{gap:8px}.stat .num{font-size:16px}.pay-brand h1{font-size:16px}}
`

/* ===================== Icons ===================== */
const Logo = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pgBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3E86C4"/><stop offset="1" stopColor="#004A8D"/></linearGradient>
      <linearGradient id="pgOr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#D86616"/><stop offset="1" stopColor="#F5A623"/></linearGradient>
    </defs>
    <path d="M22 12 L34 44 H18 L30 12 Z" fill="url(#pgBlue)"/>
    <path d="M40 14 c7 0 7 9 0 9 c-7 0 -7 9 0 9" stroke="url(#pgBlue)" strokeWidth={5} strokeLinecap="round" fill="none"/>
    <path d="M14 46 H46 L50 32 H20" stroke="url(#pgOr)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="22" cy="54" r="4" fill="url(#pgOr)"/><circle cx="42" cy="54" r="4" fill="url(#pgOr)"/>
    <path d="M50 10 l1.6 3.4 L55 15 l-3.4 1.6 L50 20 l-1.6-3.4 L45 15 l3.4-1.6 Z" fill="#F5A623"/>
  </svg>
)
const Arrow = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>)
const Wallet = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>)
const Receipt = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/></svg>)
const Hash = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>)
const Info = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>)
const UserIc = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
const Card = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const Caret = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>)
const Copy = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>)
const CheckIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>)

/* ===================== محافظ الدفع (اليمن) ===================== */
// الرقم موحّد لكل الطرق — عدّله حسب كل محفظة عند الحاجة
const ACCOUNT = '772399744'
type W = { key: string; label: string; color: string; account: string }
const WALLETS: W[] = [
  { key: 'jaib', label: 'جيب', color: '#1b9e77', account: ACCOUNT },
  { key: 'jawali', label: 'جوالي', color: '#c0392b', account: ACCOUNT },
  { key: 'floosak', label: 'فلوسك', color: '#8e44ad', account: ACCOUNT },
  { key: 'hasab', label: 'حاسب', color: '#2c6fbb', account: ACCOUNT },
  { key: 'cash', label: 'كاش', color: '#e67e22', account: ACCOUNT },
  { key: 'onecash', label: 'ون كاش', color: '#16a085', account: ACCOUNT },
  { key: 'easy', label: 'إيزي', color: '#2980b9', account: ACCOUNT },
  { key: 'mobilemoney', label: 'موبايل موني', color: '#d35400', account: ACCOUNT },
  { key: 'kuraimi', label: 'الكريمي', color: '#004A8D', account: ACCOUNT },
]

/* ===================== تنسيق الأرقام ===================== */
const fmt = (n: number) => n.toLocaleString('en-US')

/* ===================== Component ===================== */
function PayPage() {
  const { order } = Route.useSearch()
  const navigate = useNavigate()

  // بيانات الطلب — تأتي لاحقاً من Supabase/API (قيم تجريبية الآن)
  const orderNo = order || '658178'
  const customer = 'Motaz Maqsood'
  const phone = '773370041'
  const currency = 'ر.ي'
  const total = 3650
  const paid = 0
  const remaining = total - paid

  const [walletKey, setWalletKey] = useState('')
  const [copied, setCopied] = useState(false)
  const wallet = useMemo(() => WALLETS.find((w) => w.key === walletKey) || null, [walletKey])

  const copyAcc = async () => {
    if (!wallet) return
    try {
      await navigator.clipboard.writeText(wallet.account)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* غير متاح */ }
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
          <button className="pay-arrow" type="button" title="رجوع" onClick={() => navigate({ to: '/new-order' })}><Arrow /></button>
        </header>

        {/* تفاصيل الطلب */}
        <section className="pay-card">
          <div className="pay-head">
            <div className="pay-ico"><Receipt /></div>
            <div className="pay-title">تفاصيل الطلب</div>
          </div>
          <div className="pay-row">
            <div className="ric"><Hash /></div>
            <div className="rtx"><div className="k">رقم الطلب</div><div className="v ltr">{orderNo}</div></div>
            <span className="badge warn">غير مكتمل</span>
          </div>
          <div className="pay-row">
            <div className="ric"><UserIc /></div>
            <div className="rtx"><div className="k">الاسم ورقم الهاتف</div><div className="v ltr">{customer} – {phone}</div></div>
          </div>
        </section>

        {/* ملخص المبالغ (المربعات) */}
        <section className="pay-card">
          <div className="pay-head">
            <div className="pay-ico"><Wallet /></div>
            <div className="pay-title">ملخص المبالغ</div>
          </div>
          <div className="pay-stats">
            <div className="stat total"><div className="lab">الإجمالي</div><div className="num">{fmt(total)}</div><div className="cur">{currency}</div></div>
            <div className="stat paid"><div className="lab">المدفوع</div><div className="num">{fmt(paid)}</div><div className="cur">{currency}</div></div>
            <div className="stat rest"><div className="lab">المتبقي</div><div className="num">{fmt(remaining)}</div><div className="cur">{currency}</div></div>
          </div>
        </section>

        {/* طريقة الدفع */}
        <section className="pay-card">
          <div className="pay-head alt">
            <div className="pay-ico"><Card /></div>
            <div className="pay-title">طريقة الدفع</div>
          </div>
          <div className="pay-selwrap">
            <span className="lic"><Card /></span>
            <select value={walletKey} onChange={(e) => { setWalletKey(e.target.value); setCopied(false) }}>
              <option value="">اختر طريقة الدفع</option>
              {WALLETS.map((w) => (<option key={w.key} value={w.key}>{w.label}</option>))}
            </select>
            <span className="caret"><Caret /></span>
          </div>

          {wallet && (
            <div className="pay-acc" style={{ background: `linear-gradient(140deg, ${wallet.color}, ${wallet.color}cc)` }}>
              <div className="atop">
                <div className="wlogo">{wallet.label.charAt(0)}</div>
                <div><div className="at">أودِع عبر</div><div className="an">{wallet.label}</div></div>
              </div>
              <div className="pay-accnum">
                <div><div className="k">رقم الحساب</div><div className="num">{wallet.account}</div></div>
                <button className={'cp' + (copied ? ' ok' : '')} type="button" onClick={copyAcc} title="نسخ الرقم">
                  {copied ? <CheckIc /> : <Copy />}
                </button>
              </div>
              <div className="pay-hint"><Info /><span>أودِع المبلغ المتبقي ({fmt(remaining)} {currency}) على الرقم أعلاه ثم أرسل إشعار التحويل عبر الواتساب لتأكيد الدفع.</span></div>
            </div>
          )}

          <button className="pay-btn pay-primary" type="button" disabled={!wallet}>
            <CheckIc /><span>لقد أودعت المبلغ</span>
          </button>
        </section>

      </div>
    </div>
  )
}
