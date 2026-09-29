import { useEffect, useState, type CSSProperties } from "react";
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/pay')({
  validateSearch: (s: Record<string, string>) => ({ order: s.order ?? '' }),
  component: Pay,
})

type Vars = CSSProperties & { [key: `--${string}`]: string };

interface PayMethod {
  id: string; name: string; sub: string;
  color: string; cbg: string; logo: string;
}

const METHODS: PayMethod[] = [
  { id: "jeeb", name: "جيب", sub: "Jeeb", color: "#e23b3b", cbg: "#fdeceb", logo: "/wallets/jeeb.png" },
  { id: "jawali", name: "جوالي", sub: "Jawali", color: "#f39c12", cbg: "#fef4e3", logo: "/wallets/jawali.png" },
  { id: "floosak", name: "فلوسك", sub: "Floosak", color: "#1e7fd4", cbg: "#e9f2fb", logo: "/wallets/floosak.png" },
  { id: "haseb", name: "حاسب", sub: "Haseb", color: "#2e9e5b", cbg: "#e8f5ec", logo: "/wallets/haseb.png" },
  { id: "cash", name: "كاش", sub: "Cash", color: "#0ea5b5", cbg: "#e5f5f6", logo: "/wallets/cash.png" },
  { id: "onecash", name: "ون كاش", sub: "One Cash", color: "#ef7d00", cbg: "#fef1e3", logo: "/wallets/onecash.png" },
  { id: "easy", name: "إيزي", sub: "Easy", color: "#7cb518", cbg: "#f0f7e3", logo: "/wallets/easy.png" },
  { id: "mobile", name: "موبايل موني", sub: "Mobile Money", color: "#1b3a6b", cbg: "#e8edf5", logo: "/wallets/mobile.png" },
];

const ACCOUNT_NAME = "زين العابدين مطيع حاتم الوصابي";
const ACCOUNT_NUMBER = "772399744";
const TOTAL = "3,650";

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);

function Pay() {
  const { order } = Route.useSearch()
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cName, setCName] = useState('');
  const [saving, setSaving] = useState(false);

  const active = METHODS.find((m) => m.id === selected) ?? null;

  useEffect(() => {
    if (!order) return
    supabase.from('orders').select('customer_name').eq('tracking_code', order).maybeSingle()
      .then(({ data }) => { if (data) setCName(data.customer_name || '') })
  }, [order])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const handlePay = async () => {
    if (!active) return alert('اختر طريقة الدفع')
    setSaving(true)
    const { error } = await supabase.from('payments').insert([{
      order_tracking: order,
      customer_name: cName,
      method: active.name,
      amount: 3650,
      account_number: ACCOUNT_NUMBER,
      status: 'بانتظار التأكيد'
    }])
    setSaving(false)
    if (error) alert(error.message)
    else alert('تم تسجيل الدفع عبر ' + active.name)
  }

  return (
    <div dir="rtl" className="pay-root">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>الدفع</h1>
          <button className="back-btn" type="button" onClick={() => history.back()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            رجوع
          </button>
        </div>

        <div className="card">
          <div className="order">
            <div className="order-row"><span className="label">رقم الطلب</span><span className="value">{order || '144684'}</span></div>
            <div className="order-row"><span className="label">حالة الدفع</span><span className="badge"><span className="dot" /> غير مكتمل</span></div>
            {cName && <div className="ref">{cName}</div>}
          </div>

          <div className="summary">
            <div className="sum-box total"><div className="label">الإجمالي</div><div className="amount">{TOTAL}<span className="cur">ري</span></div></div>
            <div className="sum-box paid"><div className="label">المدفوع</div><div className="amount">0<span className="cur">ري</span></div></div>
            <div className="sum-box remain"><div className="label">المتبقي</div><div className="amount">{TOTAL}<span className="cur">ري</span></div></div>
          </div>

          <div className="pay-section">
            <div className="section-title">طريقة الدفع</div>
            <div className={`dropdown${open ? " open" : ""}`}>
              <button type="button" className="summary-row" onClick={() => setOpen((v) => !v)}>
                <span>{active ? `${active.name} (${active.sub})` : "اختر طريقة الدفع"}</span>
                <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {open && (
                <div className="methods">
                  {METHODS.map((m) => (
                    <button key={m.id} type="button"
                      className={`method${selected === m.id ? " active" : ""}`}
                      style={{ ["--c"]: m.color } as Vars}
                      onClick={() => { setSelected(m.id); setCopied(false); }}>
                      <span className="ic logo"><img src={m.logo} alt={m.name} onError={e=>{e.currentTarget.style.display='none'}} /></span>
                      <span className="meta"><span className="name">{m.name}</span><span className="sub">{m.sub}</span></span>
                      <span className="check"><CheckIcon /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {active && (
            <div className="account" style={{ ["--c"]: active.color, ["--cbg"]: active.cbg } as Vars}>
              <div className="head"><span className="badge-ic logo"><img src={active.logo} alt={active.name} /></span> أودِع عبر {active.name} ({active.sub})</div>
              <div className="acc-row"><span className="acc-label">اسم المستفيد</span><span className="acc-value">{ACCOUNT_NAME}</span></div>
              <div className="acc-row">
                <span className="acc-label">رقم الحساب</span>
                <span className="copy-chip">
                  <span className="acc-num sel">{ACCOUNT_NUMBER}</span>
                  <button type="button" className="copy-ic" onClick={handleCopy} aria-label="نسخ رقم الحساب">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </span>
              </div>
              <div className="acc-hint">{copied ? "✓ تم نسخ رقم الحساب" : `اضغط زر النسخ لنسخ الرقم · ثم أودِع ${TOTAL} ري واضغط «المتابعة»`}</div>
            </div>
          )}

          <button className="pay-btn" type="button" onClick={handlePay} disabled={saving}>
            {saving ? 'جاري الحفظ...' : `المتابعة للدفع · ${TOTAL} ري`}
          </button>
          <div className="footnote">مدفوعاتك محمية ومشفّرة 🔒</div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.pay-root{
  --bg:#f3ede4;--card:#fff;--ink:#2b2b2b;--muted:#8a8378;--line:#ece4d7;
  --soft:#faf6ef;--accent:#e8873b;--accent-soft:#fbe9d7;
  --green-ink:#2e9e5b;--red:#fdecec;--red-ink:#d9534f;
  font-family:'Cairo',system-ui,'Segoe UI',Tahoma,sans-serif;
  color:var(--ink);
  background:radial-gradient(1200px 600px at 80% -10%,#fbf6ee 0%,var(--bg) 60%);
  min-height:100vh;display:flex;justify-content:center;align-items:flex-start;
  padding:40px 16px 60px;box-sizing:border-box;
}
.pay-root *{box-sizing:border-box}
.pay-root .wrap{width:100%;max-width:560px}
.pay-root .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
.pay-root .topbar h1{font-size:26px;font-weight:800;margin:0}
.pay-root .back-btn{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);font-family:inherit;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;cursor:pointer}
.pay-root .back-btn svg{width:16px;height:16px}
.pay-root .card{background:var(--card);border-radius:20px;box-shadow:0 20px 50px -20px rgba(90,70,40,.35);padding:26px 24px}
.pay-root .order{background:var(--soft);border:1px solid var(--line);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.pay-root .order-row{display:flex;align-items:center;justify-content:space-between}
.pay-root .label{color:var(--muted);font-size:14px;font-weight:600}
.pay-root .value{font-size:17px;font-weight:800}
.pay-root .badge{display:inline-flex;align-items:center;gap:7px;background:var(--red);color:var(--red-ink);font-size:13px;font-weight:700;padding:6px 12px;border-radius:999px}
.pay-root .badge .dot{width:8px;height:8px;border-radius:50%;background:var(--red-ink)}
.pay-root .ref{font-size:14px;color:var(--muted);border-top:1px dashed var(--line);padding-top:12px}
.pay-root .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.pay-root .sum-box{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:16px 12px;text-align:center}
.pay-root .amount{font-size:20px;font-weight:800}
.pay-root .amount .cur{font-size:13px;color:var(--muted);margin-inline-start:3px}
.pay-root .sum-box.paid .amount{color:var(--green-ink)}
.pay-root .sum-box.remain .amount{color:var(--accent)}
.pay-root .section-title{font-size:16px;font-weight:800;margin-bottom:12px}
.pay-root .dropdown{border:1px solid var(--line);border-radius:14px;background:var(--soft);overflow:hidden}
.pay-root .dropdown.open{border-color:var(--accent);background:#fff}
.pay-root .summary-row{width:100%;background:none;border:none;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;font-weight:700;font-size:15px}
.pay-root .summary-row .chev{width:20px;height:20px;color:var(--muted)}
.pay-root .methods{padding:6px;display:flex;flex-direction:column}
.pay-root .method{width:100%;background:none;border:none;font-family:inherit;text-align:start;display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:12px;cursor:pointer}
.pay-root .method:hover{background:var(--accent-soft)}
.pay-root .method.active{background:var(--accent-soft)}
.pay-root .method .ic{width:44px;height:44px;flex:0 0 44px;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;border:1px solid var(--line);padding:4px}
.pay-root .method .ic img{width:100%;height:100%;object-fit:contain;display:block}
.pay-root .method .name{font-weight:700;font-size:15px}
.pay-root .method .sub{font-size:12px;color:var(--muted)}
.pay-root .method .meta{display:flex;flex-direction:column;gap:2px}
.pay-root .method .check{margin-inline-start:auto;width:22px;height:22px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center}
.pay-root .method .check svg{width:12px;height:12px;color:#fff;opacity:0}
.pay-root .method.active .check{background:var(--accent);border-color:var(--accent)}
.pay-root .method.active .check svg{opacity:1}
.pay-root .account{margin-top:16px;background:var(--cbg);border:1.5px solid var(--c);border-radius:16px;padding:18px 20px}
.pay-root .account .head{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--c);margin-bottom:14px}
.pay-root .account .head .badge-ic{width:34px;height:34px;border-radius:10px;background:#fff;border:1.5px solid var(--c);padding:4px;display:flex}
.pay-root .account .head .badge-ic img{width:100%;height:100%;object-fit:contain}
.pay-root .acc-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0}
.pay-root .acc-row + .acc-row{border-top:1px dashed var(--c)}
.pay-root .acc-label{color:var(--muted);font-size:14px}
.pay-root .acc-value{font-weight:800}
.pay-root .copy-chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--c);border-radius:10px;padding:6px 8px 6px 12px}
.pay-root .copy-chip .sel{user-select:all;direction:ltr;letter-spacing:1px;font-weight:800}
.pay-root .copy-chip .copy-ic{width:30px;height:30px;border-radius:8px;background:var(--c);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
.pay-root .copy-chip .copy-ic svg{width:15px;height:15px}
.pay-root .acc-hint{font-size:12px;color:var(--muted);text-align:center;margin-top:10px}
.pay-root .pay-btn{margin-top:22px;width:100%;background:linear-gradient(135deg,#ef9a4e,#e8873b);color:#fff;border:none;font-family:inherit;font-size:17px;font-weight:800;padding:16px;border-radius:14px;cursor:pointer}
.pay-root .footnote{text-align:center;color:var(--muted);font-size:12px;margin-top:16px}
`;
