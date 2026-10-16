import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Hand, Send, X } from "lucide-react";

type Msg = { id: number; text: string; sender: "bot" | "user" };

const SECTIONS: { label: string; to: "/new-order" | "/track" | "/login" }[] = [
  { label: "اطلب الآن", to: "/new-order" },
  { label: "تتبع شحنتك", to: "/track" },
  { label: "حسابي", to: "/login" },
];

const WELCOME =
  "مرحباً، كيف يمكنني مساعدتك؟\nأنا مساعد السوق الشامل. نشتري لك من TEMU، Trendyol، SHEIN، Amazon، AliExpress ونوصل طلبك لباب بيتك في اليمن.";

function reply(q: string): string {
  const t = q.toLowerCase();
  if (/سعر|تكلف|كم|رسوم|فلوس/.test(t))
    return "أرسل رابط المنتج من صفحة «اطلب الآن»، ونحسب لك السعر شامل الشراء والشحن حتى باب بيتك قبل ما تدفع أي شيء.";
  if (/تتبع|شحن|وين|طلبي|وصل/.test(t))
    return "تقدر تتابع طلبك من صفحة «تتبع شحنتك» برقم الطلب ورقم هاتفك.";
  if (/اطلب|طلب|شراء|اشتري|رابط/.test(t))
    return "الطلب سهل: 1) أرسل الرابط 2) اعرف السعر 3) نشتري لك 4) نتابع الشحنة 5) الاستلام. ابدأ من «اطلب الآن».";
  if (/متجر|منصة|امازون|شي|تيمو|ترند|علي/.test(t))
    return "نستورد لك من TEMU، Trendyol، SHEIN، Amazon، AliExpress.";
  if (/مدة|متى|يوم|وقت/.test(t))
    return "مدة التوصيل تختلف حسب المتجر وبلد الشحن، ونبلغك بالمدة المتوقعة مع السعر.";
  if (/حساب|تسجيل|دخول/.test(t)) return "تقدر تسجل دخولك برقم جوالك من زر «حسابي».";
  return "سؤال جميل! للتفاصيل تواصل معنا واتساب، أو اختر قسماً من الأزرار تحت.";
}

// رسمة الروبوت الأزرق الكرتوني المطابقة للصورة
function RobotFace({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="robotBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="robotScreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* الهوائي والكرة المضيئة */}
      <line x1="32" y1="4" x2="32" y2="14" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="4" r="3.5" fill="#38bdf8" filter="url(#robotGlow)" />

      {/* الأذنان الجانبيتان */}
      <rect x="4" y="24" width="5" height="12" rx="2.5" fill="#0284c7" />
      <rect x="55" y="24" width="5" height="12" rx="2.5" fill="#0284c7" />

      {/* الرأس الأزرق المنحني (تلفاز كرتوني) */}
      <rect x="8" y="14" width="48" height="38" rx="14" fill="url(#robotBlueGrad)" stroke="#0369a1" strokeWidth="2" />

      {/* شاشة الوجه الداكنة */}
      <rect x="14" y="20" width="36" height="22" rx="7" fill="url(#robotScreenGrad)" stroke="#38bdf8" strokeWidth="1.2" />

      {/* العيون المضيئة المتحركة (رمش) */}
      <g className="robot-blink">
        <circle cx="24" cy="30" r="3.2" fill="#38bdf8" filter="url(#robotGlow)" />
        <circle cx="40" cy="30" r="3.2" fill="#38bdf8" filter="url(#robotGlow)" />
        <circle cx="25" cy="29" r="1" fill="#ffffff" />
        <circle cx="41" cy="29" r="1" fill="#ffffff" />
      </g>

      {/* الابتسامة المضيئة */}
      <path d="M26 36 Q32 39.5 38 36" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function AIRobot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ id: 1, text: WELCOME, sender: "bot" }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { id: Date.now(), text: q, sender: "user" }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, text: reply(q), sender: "bot" }]);
      setTyping(false);
    }, 700);
  };

  return (
    <>
      <div className="fixed bottom-5 left-5 z-50 flex flex-col items-center">
        {!open && (
          <div className="mb-2 rounded-full border-2 border-sky-500 bg-card px-3 py-1 font-display text-sm font-bold text-sky-600 shadow-md">
            اسألني! 😄
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="مساعد السوق الشامل"
          className="robot-float relative grid size-20 place-items-center rounded-full border-[3px] border-sky-500 bg-sky-50/80 shadow-xl transition-transform hover:scale-105 active:scale-95"
        >
          <RobotFace size={56} />
          <span className="robot-wave absolute -right-2 top-1 grid size-7 place-items-center rounded-full bg-sky-500 text-white shadow">
            <Hand className="size-4" />
          </span>
        </button>
      </div>

      {open && (
        <div dir="rtl" className="fixed bottom-32 left-5 z-50 flex h-[480px] w-[340px] max-w-[90vw] flex-col overflow-hidden rounded-3xl border-2 border-sky-500 bg-card shadow-2xl animate-scale-in">
          {/* رأس نافذة المحادثة */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-sky-700 to-sky-600 p-3 text-white">
            <div className="grid size-11 place-items-center rounded-full bg-slate-900 border border-sky-400">
              <RobotFace size={34} />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold">مساعد السوق الشامل</div>
              <div className="text-xs text-sky-200">متصل الآن 🟢</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-full p-1 hover:bg-sky-800 text-white">
              <X className="size-5" />
            </button>
          </div>

          {/* الرسائل */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-3">
            {messages.map((m) => (
              <div key={m.id} className={m.sender === "user" ? "text-left" : "text-right"}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.sender === "user"
                      ? "bg-sky-600 text-white"
                      : "border border-sky-200 bg-white text-slate-800 shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && <div className="text-xs text-sky-600 animate-pulse">يكتب الآن...</div>}

            <div className="flex flex-wrap gap-2 pt-1">
              {SECTIONS.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-sky-600 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-600 hover:text-white transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <div ref={endRef} />
          </div>

          {/* حقل الإرسال */}
          <div className="flex gap-2 border-t border-sky-100 bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب سؤالك..."
              className="flex-1 rounded-full border border-sky-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
            />
            <button onClick={send} aria-label="إرسال" className="grid size-10 place-items-center rounded-full bg-sky-600 text-white active:scale-95 hover:bg-sky-500 transition-colors">
              <Send className="size-4 -scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// يدعم كلا النوعين من الاستيراد
export default AIRobot;
