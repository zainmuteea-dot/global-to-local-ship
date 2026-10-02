import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/new-order')({
  component: NewOrderPage,
})

/* ===================== Styles ===================== */
const CSS = `
:root{
  --blue-900:#013a70;--blue-800:#004A8D;--blue-600:#2f6fb0;--blue-500:#3E86C4;
  --blue-100:#e3eef8;--blue-50:#f0f6fc;--orange-600:#D86616;--orange-500:#f08a2d;
  --orange-400:#F5A623;--ink:#0f2440;--muted:#6b7f99;--line:#e4ecf5;--bg:#eef3f9;
  --card:#fff;--green-bg:#e8f8ef;--radius:18px;
  --shadow:0 10px 30px -12px rgba(0,74,141,.22);--shadow-sm:0 4px 14px -6px rgba(0,74,141,.18);
}
.no-root *{box-sizing:border-box;margin:0;padding:0}
.no-root{font-family:'Cairo',system-ui,sans-serif;min-height:100vh;color:var(--ink);line-height:1.6;
  direction:rtl;padding:24px 14px 60px;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1200px 500px at 100% -10%,rgba(62,134,196,.12),transparent 60%),
    radial-gradient(1000px 500px at 0% 110%,rgba(245,166,35,.10),transparent 55%),var(--bg);}
.no-wrap{max-width:620px;margin:0 auto}
.no-topbar{background:linear-gradient(135deg,var(--blue-800) 0%,var(--blue-900) 55%,#06284a 100%);
  border-radius:22px;padding:18px 20px;color:#fff;box-shadow:var(--shadow);position:relative;
  overflow:hidden;display:flex;align-items:center;gap:14px}
.no-topbar::after{content:'';position:absolute;inset:0;
  background:radial-gradient(140px 140px at 10% 120%,rgba(245,166,35,.35),transparent 70%)}
.no-badge{width:52px;height:52px;border-radius:15px;flex:0 0 auto;
  background:linear-gradient(145deg,#fff,#eaf2fb);display:grid;place-items:center;position:relative;z-index:1;
  box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}
.no-badge svg{width:34px;height:34px}
.no-brand{z-index:1}
.no-brand h1{font-size:19px;font-weight:900;letter-spacing:.3px;line-height:1.2}
.no-brand h1 b{color:var(--orange-400)}
.no-brand p{font-size:12px;color:#bcd3ec;font-weight:600;margin-top:2px}
.no-arrow{margin-inline-start:auto;z-index:1;width:38px;height:38px;border-radius:11px;
  display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;transition:.2s;border:none}
.no-arrow:hover{background:rgba(255,255,255,.22)}
.no-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:18px;margin-top:16px;box-shadow:var(--shadow-sm)}
.no-head{display:flex;align-items:center;gap:11px;margin-bottom:15px}
.no-num{width:34px;height:34px;flex:0 0 auto;border-radius:11px;display:grid;place-items:center;
  font-weight:900;color:#fff;font-size:15px;background:linear-gradient(140deg,var(--blue-600),var(--blue-800))}
.no-head.alt .no-num{background:linear-gradient(140deg,var(--orange-400),var(--orange-600))}
.no-ico{width:30px;height:30px;flex:0 0 auto;display:grid;place-items:center;color:var(--blue-800)}
.no-head.alt .no-ico{color:var(--orange-600)}
.no-title{font-weight:800;font-size:16px}
.no-field{margin-top:14px}
.no-field:first-of-type{margin-top:0}
.no-lbl{display:block;font-size:13.5px;font-weight:700;margin-bottom:7px;color:#334e73}
.no-req{color:var(--orange-600);font-weight:900}
.no-iw{position:relative}
.no-iw .ic{position:absolute;inset-inline-start:13px;top:50%;transform:translateY(-50%);
  color:var(--muted);width:18px;height:18px;pointer-events:none}
.no-root input,.no-root select,.no-root textarea{width:100%;font-family:inherit;font-size:14.5px;color:var(--ink);
  background:var(--blue-50);border:1.6px solid var(--line);border-radius:13px;padding:13px 15px;transition:.18s;outline:none}
.no-root input.has-ic{padding-inline-start:42px}
.no-root input:focus,.no-root select:focus,.no-root textarea:focus{border-color:var(--blue-500);
  background:#fff;box-shadow:0 0 0 4px rgba(62,134,196,.14)}
.no-root textarea{resize:vertical;min-height:96px;line-height:1.7}
.no-root input::placeholder,.no-root textarea::placeholder{color:#9bafc7}
.no-pill{display:inline-flex;align-items:center;gap:7px;background:#000;color:#fff;font-weight:900;
  font-size:14px;letter-spacing:.5px;padding:7px 14px;border-radius:10px;margin-bottom:11px}
.no-ok{display:flex;align-items:center;gap:9px;background:var(--green-bg);border:1.4px solid #bfe9d2;
  color:#0d7a46;font-size:13px;font-weight:700;padding:11px 13px;border-radius:12px;margin-top:11px}
.no-ok .flash{margin-inline-start:auto;color:var(--orange-500)}
.no-q{font-size:13.5px;font-weight:700;color:#334e73;margin:16px 0 9px}
.no-choices{display:flex;gap:10px;flex-wrap:wrap}
.no-choice{flex:1;min-width:92px;text-align:center;cursor:pointer;border:1.6px solid var(--line);
  background:#fff;border-radius:12px;padding:11px 8px;font-weight:700;font-size:14px;color:#51688a;transition:.18s;user-select:none}
.no-choice:hover{border-color:var(--blue-500)}
.no-choice.active{border-color:var(--blue-800);background:var(--blue-800);color:#fff;box-shadow:0 6px 14px -6px rgba(0,74,141,.5)}
.no-price{display:flex;gap:10px}
.no-price .no-iw{flex:1}
.no-price select{flex:0 0 130px;-webkit-appearance:none;appearance:none;font-weight:700;background:#fff}
.no-ta{position:relative}
.no-ta .mic{position:absolute;inset-inline-end:12px;bottom:12px;width:34px;height:34px;border-radius:10px;
  display:grid;place-items:center;cursor:pointer;border:none;color:#fff;transition:.2s;
  background:linear-gradient(140deg,var(--orange-400),var(--orange-600))}
.no-ta .mic:hover{transform:scale(1.06)}
.no-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;font-family:inherit;
  font-weight:800;font-size:16px;border:none;cursor:pointer;padding:15px;border-radius:14px;transition:.2s}
.no-primary{color:#fff;background:linear-gradient(135deg,var(--blue-600),var(--blue-800));
  box-shadow:0 12px 26px -10px rgba(0,74,141,.6)}
.no-primary:hover{transform:translateY(-2px)}
.no-ghost{background:#fff;color:var(--blue-800);border:1.8px solid var(--blue-100);margin-top:11px}
.no-ghost:hover{border-color:var(--blue-500);background:var(--blue-50)}
.no-foot{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;margin-top:22px}
.no-foot .f{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#5a7294}
.no-foot .f svg{color:var(--blue-500)}
.no-foot .f svg{width:15px;height:15px}
.no-foot .f:nth-child(2) svg{color:var(--orange-500)}
@media(max-width:520px){.no-brand h1{font-size:16px}.no-price{flex-direction:column}.no-price select{flex:1}}
@media(max-width:360px){.no-badge{width:44px;height:44px}.no-badge svg{width:28px;height:28px}.no-brand h1{font-size:14px}}
`

/* ===================== Icons ===================== */
const Cart = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>)
const Truck = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>)
const Bag = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10l3 6-3 8H7l-3-8z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>)
const Msg = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>)
const Pin = () => (<svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>)
const User = () => (<svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
const Phone = () => (<svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>)
const Link = () => (<svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>)
const Check = ({ s = 15 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>)
const Flash = () => (<svg className="flash" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>)
const Mic = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>)
const Rocket = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/></svg>)
const Arrow = ({ s = 18 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>)
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

/* ===================== Component ===================== */
const DUP_OPTS = ['نعم', 'لا', 'غير متأكد'] as const

function NewOrderPage() {
  const [url, setUrl] = useState('https://ar.shein.com/Women-Plus-Clothing-c-1888.html')
  const [address, setAddress] = useState('')
  const [name, setName] = useState('zain muteea')
  const [phone, setPhone] = useState('772399744')
  const [price, setPrice] = useState('89')
  const [currency, setCurrency] = useState('ر.س سعودي')
  const [notes, setNotes] = useState('')
  const [dup, setDup] = useState<(typeof DUP_OPTS)[number]>('لا')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')

  const isShein = useMemo(() => /shein\./i.test(url), [url])

  const submit = () => {
    if (status === 'sending') return
    setStatus('sending')
    // TODO: استبدل بنداء API الفعلي (Serverless على Vercel)
    const payload = { url, address, name, phone, price, currency, notes, duplicates: dup }
    console.log('order payload', payload)
    setTimeout(() => setStatus('done'), 900)
  }

  return (
    <div className="no-root">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div className="no-wrap">

        <header className="no-topbar">
          <div className="no-badge"><Logo /></div>
          <div className="no-brand">
            <h1>SHOPPING <b>AL SHAMEL</b></h1>
            <p>السوق الشامل • وسيطكم العالمي</p>
          </div>
          <button className="no-arrow" type="button" title="الرجوع"><Arrow /></button>
        </header>

        {/* 1 - تفاصيل السلة */}
        <section className="no-card">
          <div className="no-head">
            <div className="no-num">1</div>
            <div className="no-ico"><Cart /></div>
            <div className="no-title">تفاصيل السلة</div>
          </div>
          <span className="no-pill">SHEIN</span>
          <div className="no-field">
            <label className="no-lbl">رابط السلة / المنتج <span className="no-req">*</span></label>
            <div className="no-iw">
              <Link />
              <input className="has-ic" type="text" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            {isShein && (
              <div className="no-ok">
                <Check s={18} />
                <span>تم التعرف على سلة متجر SHEIN بنجاح</span>
                <Flash />
              </div>
            )}
          </div>
          <div className="no-q">هل توجد منتجات مكررة؟ <span className="no-req">*</span></div>
          <div className="no-choices">
            {DUP_OPTS.map((o) => (
              <div key={o} className={'no-choice' + (dup === o ? ' active' : '')} onClick={() => setDup(o)}>{o}</div>
            ))}
          </div>
        </section>

        {/* 2 - عنوان التوصيل */}
        <section className="no-card">
          <div className="no-head">
            <div className="no-num">2</div>
            <div className="no-ico"><Truck /></div>
            <div className="no-title">عنوان التوصيل وبيانات المستلم</div>
          </div>
          <div className="no-field">
            <label className="no-lbl">عنوان التوصيل بالتفصيل (المدينة، الحي، أقرب معلم) <span className="no-req">*</span></label>
            <div className="no-iw">
              <Pin />
              <input className="has-ic" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثال: صنعاء - شارع حدة - بجوار فندق برج السلام..." />
            </div>
          </div>
          <div className="no-field">
            <label className="no-lbl">اسم المستلم الكريم <span className="no-req">*</span></label>
            <div className="no-iw">
              <User />
              <input className="has-ic" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="no-field">
            <label className="no-lbl">رقم الهاتف / الواتساب <span className="no-req">*</span></label>
            <div className="no-iw">
              <Phone />
              <input className="has-ic" type="tel" dir="ltr" style={{ textAlign: 'right' }} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </section>

        {/* 3 - السعر */}
        <section className="no-card">
          <div className="no-head alt">
            <div className="no-num">3</div>
            <div className="no-ico"><Bag /></div>
            <div className="no-title">سعر السلعة في المتجر الأصلي</div>
          </div>
          <div className="no-price">
            <div className="no-iw">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option>ر.س سعودي</option>
              <option>$ دولار</option>
              <option>ر.ي يمني</option>
            </select>
          </div>
        </section>

        {/* 4 - ملاحظات */}
        <section className="no-card">
          <div className="no-head alt">
            <div className="no-num">4</div>
            <div className="no-ico"><Msg /></div>
            <div className="no-title">ملاحظات إضافية (اختياري)</div>
          </div>
          <div className="no-ta">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اكتب أي ملاحظات خاصة بطلبك هنا (مقاسات، ألوان، تعليمات خاصة)..." />
            <button className="mic" type="button" title="تسجيل صوتي"><Mic /></button>
          </div>
        </section>

        <button className="no-btn no-primary" type="button" onClick={submit} disabled={status === 'sending'}>
          <Rocket />
          <span>{status === 'sending' ? 'جارٍ إرسال الطلب...' : status === 'done' ? '✓ تم استلام طلبك بنجاح' : 'تقديم الطلب'}</span>
        </button>
        <button className="no-btn no-ghost" type="button"><Arrow /><span>الرجوع للصفحة الرئيسية</span></button>

        <div className="no-foot">
          <div className="f"><Check /> فحص ومطابقة أصلية</div>
          <div className="f"><Truck /> توصيل لكافة المدن</div>
          <div className="f"><Check /> تأكيد بالواتساب</div>
        </div>

      </div>
    </div>
  )
}
