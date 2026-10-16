import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

type Msg = { from: "bot" | "user"; text: string };

const replies = [
  { match: /سلام|مرحبا|اهلا|هلا|هاي/, text: "هلا والله! أنا شامِل بوت 🤖 أسعى لخدمتك أكثر من عامل التوصيل نفسه!" },
  { match: /سعر|اسعار|تكلفة/, text: "أسعارنا؟ أرخص من قهوة الصباح 😄 أرسل رابط المنتج ونحسبها لك!" },
  { match: /شحن|توصيل|يوصل/, text: "الشحن عندنا أسرع من انتشار الأخبار 🚚 نوصل لباب بيتك!" },
  { match: /متجر|امازون|شي ان|تيمو|علي اكسبرس/, text: "AliExpress و Amazon و SHEIN و TEMU كلهم أصحابي 😎" },
  { match: /طلب|اطلب|اشتري/, text: "انسخ رابط المنتج واضغط «اطلب الآن» فوق، وخلك مرتاح ☕" },
  { match: /تتبع|شحنة|طلبي|وين/, text: "اضغط «تتبع شحنتك» وحط رقمها.. هي تتمشى في الطريق 🐢" },
  { match: /نكتة|ضحك|اضحكني/, text: "قالوا للعميل: شحنتك وصلت! قال: مستحيل أنا لسه ما طلبت! 😂 السرعة تسبق الخيال" },
];

const fallback = ["أهلاً! اسألني عن الأسعار أو الشحن أو قل لي عطني نكتة 😄"];

function BlueRobot({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size*1.15} viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="50" y1="20" x2="50" y2="9" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="7" r="5" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1.5" />
      <path d="M26 64 L14 74 L8 98" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
      <path d="M74 64 L86 74 L92 98" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 60 H68 L64 100 H36 Z" fill="#0284c7" stroke="#075985" strokeWidth="2" />
      <rect x="19" y="18" width="62" height="40" rx="12" fill="#075985" />
      <rect x="25" y="23" width="50" height="30" rx="8" fill="#0f172a" />
      <circle cx="39" cy="35" r="5" fill="#fff" />
      <circle cx="61" cy="35" r="5" fill="#fff" />
      <path d="M44 42 Q50 49 56 42 Q50 47 44 42 Z" fill="#fff" />
    </svg>
  );
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "أهلاً! أنا شامِل بوت 🤖 اسألني أي شي عن السوق الشامل.. أو اطلب نكتة، أنا مضحك (على قول أمي) 😄" }]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, open]);

  const send = () => {
    const q = text.trim(); if (!q) return;
    const hit = replies.find((r) => r.match.test(q));
    const answer = hit? hit.text : fallback[0]!;
    setMsgs((m) => [...m, { from: "user", text: q }, { from: "bot", text: answer }]);
    setText("");
  };

  return (
    <div dir="rtl" style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 9999 }}>
      {open && (
        <div style={{ position: 'fixed', bottom: 100, left: 20, width: 360, maxWidth: '92vw', height: 480, background: '#fff', borderRadius: 24, border: '2px solid #075985', boxShadow: '0 20px 50px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#075985', color: '#fff', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}><BlueRobot size={28} /> شامِل بوت</span>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', padding: 6 }}><X size={18} /></button>
          </div>
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#f0f9ff' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.from === 'user'? 'flex-end' : 'flex-start', background: m.from === 'user'? '#0284c7' : '#fff', color: m.from === 'user'? '#fff' : '#0c4a6e', border: m.from === 'bot'? '1px solid #bae6fd' : 'none', padding: '10px 14px', borderRadius: m.from === 'user'? '18px 18px 4px 18px' : '18px 18px 18px 4px', maxWidth: '85%', fontSize: 14 }}>{m.text}</div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ padding: 12, display: 'flex', gap: 8, borderTop: '1px solid #e0f2fe' }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اسألني عن المتاجر، الشحن، أو نكتة..." style={{ flex: 1, border: '1px solid #bae6fd', borderRadius: 999, padding: '10px 14px', outline: 'none' }} />
            <button type="submit" style={{ width: 42, height: 42, borderRadius: 999, background: '#0284c7', border: 0, color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Send size={16} /></button>
          </form>
        </div>
      )}
      {!open && (
        <div style={{ position: 'fixed', bottom: 20, left: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ background: '#fff', border: '2px solid #0284c7', color: '#075985', padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>اسألني! 😄</div>
          <button onClick={() => setOpen(true)} style={{ width: 66, height: 66, borderRadius: 9999, background: '#fff', border: '3px solid #075985', boxShadow: '0 8px 24px rgba(0,0,0,.2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><BlueRobot size={42} /></button>
        </div>
      )}
    </div>
  );
}
