import React, { useState, type CSSProperties } from "react";

type Vars = CSSProperties & { [key: `--${string}`]: string };

interface PayMethod {
  id: string;
  name: string;
  sub: string;
  color: string;
  cbg: string;
  logo: string;
}

const METHODS: PayMethod[] = [
  { id: "jeeb",    name: "جيب",          sub: "Jeeb",         color: "#e23b3b", cbg: "#fdeceb", logo: "https://pbs.twimg.com/profile_images/1909228883901136896/xfI4p59P_400x400.jpg" },
  { id: "jawali",  name: "جوالي",        sub: "Jawali",       color: "#f39c12", cbg: "#fef4e3", logo: "https://jawali.com.ye/Terms/jawali.png" },
  { id: "floosak", name: "فلوسك",        sub: "Floosak",      color: "#1e7fd4", cbg: "#e9f2fb", logo: "https://play-lh.googleusercontent.com/zFQM3P20sCb90Z6JHrp7vHAPJAPxXNDyMzVHxABxSMTWVA6i2mCKPQJhtLf3FUlV01jkVS87iDT_wa80NUaQLw=s512" },
  { id: "haseb",   name: "حاسب",         sub: "Haseb",        color: "#2e9e5b", cbg: "#e8f5ec", logo: "https://haseb.co/assets/app/img/header/logo.png" },
  { id: "cash",    name: "كاش",          sub: "Cash",         color: "#0ea5b5", cbg: "#e5f5f6", logo: "https://cdn.aptoide.com/imgs/1/e/5/1e5c9d05ea1abde2246212a3150fb522_icon.png" },
  { id: "onecash", name: "ون كاش",       sub: "One Cash",     color: "#ef7d00", cbg: "#fef1e3", logo: "https://play-lh.googleusercontent.com/WqrsU_pFeqT63UuvAH8vavDeee22oJWtrp6TuVyqbWddB8EtkSToVwPUzp-arwD_3em6VnzDHF-8STWhujko1Q=s512" },
  { id: "easy",    name: "إيزي",         sub: "Easy",         color: "#7cb518", cbg: "#f0f7e3", logo: "https://play-lh.googleusercontent.com/zNc2yh5uga4GBRv0AiXGgE4LHbLupRKwkULQz3tj1pDUH0CW9rHlsZbk10PYLP-Ry7mBmT-0aXMLSLPeBqQWSA=s512" },
  { id: "mobile",  name: "موبايل موني", sub: "Mobile Money", color: "#1b3a6b", cbg: "#e8edf5", logo: "https://play-lh.googleusercontent.com/fnxxZ7KP15EhtTTw23pVYEMICO4O8KKjkYSG3tOF5YfZYT5MbWflqaAyJmhWoizSru9pFXIR8m9mb17fzGAKxQ=s512" },
];

const ORDER_NO = "144684";
const ORDER_REF = "7777866s – sxsaxs";
const ACCOUNT_NAME = "زين العابدين مطيع حاتم الوصابي";
const ACCOUNT_NUMBER = "772399744";
const TOTAL = "3,650";

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);

function WalletLogo({ m }: { m: PayMethod }) {
  const [fail, setFail] = useState(false);
  if (fail) {
    return (
      <span style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: m.cbg, color: m.color,
        fontWeight: 800, fontSize: 20, borderRadius: 8
      }}>
        {m.name[0]}
      </span>
    );
  }
  return <img src={m.logo} alt={m.name} onError={() => setFail(true)} style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}} referrerPolicy="no-referrer" />;
}

export default function Pay() {
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const active = METHODS.find((m) => m.id === selected) ?? null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // تجاهل فشل الحافظة
    }
  };

  return (
    <div dir="rtl" className="pay-root">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>الدفع</h1>
          <button className="back-btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            رجوع
          </button>
        </div>

        <div className="card">
          <div className="order">
            <div className="order-row"><span className="label">رقم الطلب</span><span className="value">{ORDER_NO}</span></div>
            <div className="order-row"><span className="label">حالة الدفع</span><span className="badge"><span className="dot" /> غير مكتمل</span></div>
            <div className="ref">{ORDER_REF}</div>
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
                    <button
                      key={m.id}
                      type="button"
                      className={`method${selected === m.id ? " active" : ""}`}
                      style={{ ["--c"]: m.color } as Vars}
                      onClick={() => { setSelected(m.id); setCopied(false); }}
                    >
                      <span className="ic logo"><WalletLogo m={m} /></span>
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
              <div className="head"><span className="badge-ic logo"><WalletLogo m={active} /></span> أودِع عبر {active.name} ({active.sub})</div>
              <div className="acc-row"><span className="acc-label">اسم المستفيد</span><span className="acc-value">{ACCOUNT_NAME}</span></div>
              <div className="acc-row">
                <span className="acc-label">رقم الحساب</span>
                <span className="copy-chip">
                  <span className="acc-num sel">{ACCOUNT_NUMBER}</span>
                  <button type="button" className="copy-ic" onClick={handleCopy} aria-label="نسخ رقم الحساب" title="نسخ">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </span>
              </div>
              <div className="acc-hint">{copied ? "✓ تم نسخ رقم الحساب" : `اضغط زر النسخ لنسخ الرقم · ثم أودِع ${TOTAL} ري واضغط «المتابعة»`}</div>
            </div>
          )}

          <button className="pay-btn" type="button">المتابعة للدفع · {TOTAL} ري</button>
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
.pay-root .topbar h1{font-size:26px;font-weight:800;letter-spacing:-.5px;margin:0}
.pay-root .back-btn{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);color:var(--ink);font-family:inherit;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;cursor:pointer;box-shadow:0 4px 12px -6px rgba(90,70,40,.3);transition:.18s}
.pay-root .back-btn:hover{transform:translateY(-1px);border-color:var(--accent);color:var(--accent)}
.pay-root .back-btn svg{width:16px;height:16px}
.pay-root .card{background:var(--card);border-radius:20px;box-shadow:0 20px 50px -20px rgba(90,70,40,.35);padding:26px 24px;border:1px solid #fff}
.pay-root .order{background:var(--soft);border:1px solid var(--line);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.pay-root .order-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.pay-root .label{color:var(--muted);font-size:14px;font-weight:600}
.pay-root .value{font-size:17px;font-weight:800}
.pay-root .badge{display:inline-flex;align-items:center;gap:7px;background:var(--red);color:var(--red-ink);font-size:13px;font-weight:700;padding:6px 12px;border-radius:999px}
.pay-root .badge .dot{width:8px;height:8px;border-radius:50%;background:var(--red-ink)}
.pay-root .ref{font-size:14px;color:var(--muted);font-weight:600;border-top:1px dashed var(--line);padding-top:12px;direction:ltr;text-align:right}
.pay-root .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.pay-root .sum-box{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:16px 12px;text-align:center}
.pay-root .sum-box .label{font-size:13px;margin-bottom:8px}
.pay-root .amount{font-size:20px;font-weight:800;line-height:1.1}
.pay-root .amount .cur{font-size:13px;font-weight:700;color:var(--muted);margin-inline-start:3px}
.pay-root .sum-box.paid .amount{color:var(--green-ink)}
.pay-root .sum-box.remain .amount{color:var(--accent)}
.pay-root .section-title{font-size:16px;font-weight:800;margin-bottom:12px}
.pay-root .dropdown{border:1px solid var(--line);border-radius:14px;background:var(--soft);overflow:hidden}
.pay-root .dropdown.open{border-color:var(--accent);background:#fff}
.pay-root .summary-row{width:100%;background:none;border:none;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;font-weight:700;font-size:15px;color:var(--ink)}
.pay-root .summary-row .chev{width:20px;height:20px;color:var(--muted);transition:.2s}
.pay-root .dropdown.open .summary-row .chev{transform:rotate(180deg);color:var(--accent)}
.pay-root .methods{padding:6px;display:flex;flex-direction:column}
.pay-root .method{width:100%;background:none;border:none;font-family:inherit;text-align:start;display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:12px;cursor:pointer;transition:.15s}
.pay-root .method:hover{background:var(--accent-soft)}
.pay-root .method.active{background:var(--accent-soft)}
.pay-root .method .ic{width:44px;height:44px;flex:0 0 44px;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pay-root .method .ic.logo{background:#fff;border:1px solid var(--line);padding:4px}
.pay-root .method .name{font-weight:700;font-size:15px}
.pay-root .method .sub{font-size:12px;color:var(--muted);font-weight:600}
.pay-root .method .meta{display:flex;flex-direction:column;gap:2px}
.pay-root .method .check{margin-inline-start:auto;width:22px;height:22px;border-radius:50%;border:2px solid var(--line);flex:0 0 22px;display:flex;align-items:center;justify-content:center;transition:.15s}
.pay-root .method .check svg{width:12px;height:12px;color:#fff;opacity:0;transition:.15s}
.pay-root .method.active .check{background:var(--accent);border-color:var(--accent)}
.pay-root .method.active .check svg{opacity:1}
.pay-root .account{margin-top:16px;background:var(--cbg,#fff8ef);border:1.5px solid var(--c,var(--accent-soft));border-radius:16px;padding:18px 20px;animation:pfade .25s ease}
@keyframes pfade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.pay-root .account .head{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:800;color:var(--c,var(--accent));margin-bottom:14px}
.pay-root .account .head .badge-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pay-root .account .head .badge-ic.logo{background:#fff;border:1.5px solid var(--c,var(--accent-soft));padding:4px}
.pay-root .acc-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0}
.pay-root .acc-row + .acc-row{border-top:1px dashed var(--c,var(--accent-soft))}
.pay-root .acc-label{color:var(--muted);font-size:14px;font-weight:600}
.pay-root .acc-value{font-size:16px;font-weight:800;text-align:left}
.pay-root .copy-chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--c,var(--accent-soft));border-radius:10px;padding:6px 8px 6px 12px}
.pay-root .copy-chip .sel{user-select:all;-webkit-user-select:all;direction:ltr;letter-spacing:1px;font-weight:800;font-size:16px;cursor:text;color:var(--ink)}
.pay-root .copy-chip .copy-ic{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;flex:0 0 30px;background:var(--c,var(--accent));color:#fff;cursor:pointer;border:none;transition:.15s}
.pay-root .copy-chip .copy-ic:hover{filter:brightness(1.08);transform:translateY(-1px)}
.pay-root .copy-chip .copy-ic svg{width:15px;height:15px}
.pay-root .acc-hint{font-size:12px;color:var(--muted);font-weight:600;margin-top:10px;text-align:center}
.pay-root .pay-btn{margin-top:22px;width:100%;background:linear-gradient(135deg,#ef9a4e,#e8873b);color:#fff;border:none;font-family:inherit;font-size:17px;font-weight:800;padding:16px;border-radius:14px;cursor:pointer;box-shadow:0 12px 24px -10px rgba(232,135,59,.7);transition:.18s}
.pay-root .pay-btn:hover{transform:translateY(-2px)}
.pay-root .footnote{text-align:center;color:var(--muted);font-size:12px;margin-top:16px;font-weight:600}
@media(max-width:440px){.pay-root .summary{grid-template-columns:1fr}.pay-root .topbar h1{font-size:22px}}
`;
