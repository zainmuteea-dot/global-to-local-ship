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

function RobotFace({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <line x1="32" y1="6" x2="32" y2="14" className="stroke-cocoa" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.5" className="fill-gold" />
      <rect x="10" y="14" width="44" height="36" rx="14" className="fill-goldsoft stroke-cocoa" strokeWidth="3" />
      <rect x="4" y="26" width="6" height="12" rx="3" className="fill-cocoa" />
      <rect x="54" y="26" width="6" height="12" rx="3" className="fill-cocoa" />
      <rect x="17" y="22" width="30" height="16" rx="8" className="fill-cocoadeep" />
      <circle cx="25" cy="30" r="3.2" className="fill-gold robot-blink" />
      <circle cx="39" cy="30" r="3.2" className="fill-gold robot-blink" />
      <path d="M24 43 q8 6 16 0" className="stroke-cocoa" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function AIRobot() {
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
          <div className="mb-2 rounded-full border-2 border-cocoa bg-card px-3 py-1 font-display text-sm font-bold text-cocoa shadow-md">
            اسألني!
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="مساعد السوق الشامل"
          className="robot-float relative grid size-20 place-items-center rounded-full border-[3px] border-cocoa bg-card shadow-xl transition-transform hover:scale-105 active:scale-95"
        >
          <RobotFace size={56} />
          <span className="robot-wave absolute -right-2 top-1 grid size-7 place-items-center rounded-full bg-gold text-cocoadeep shadow"><Hand className="size-4" /></span>
        </button>
      </div>

      {open && (
        <div dir="rtl" className="fixed bottom-32 left-5 z-50 flex h-[480px] w-[340px] max-w-[90vw] flex-col overflow-hidden rounded-3xl border-2 border-cocoa bg-card shadow-2xl animate-scale-in">
          <div className="flex items-center gap-3 bg-cocoa p-3 text-cream">
            <div className="grid size-11 place-items-center rounded-full bg-cream">
              <RobotFace size={36} />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold">مساعد السوق الشامل</div>
              <div className="text-xs opacity-90">متصل الآن</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-full p-1 hover:bg-cocoadeep">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-cream p-3">
            {messages.map((m) => (
              <div key={m.id} className={m.sender === "user" ? "text-left" : "text-right"}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.sender === "user" ? "bg-cocoa text-cream" : "border border-goldsoft bg-card text-cocoadeep"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && <div className="text-xs text-cocoa">يكتب الآن...</div>}
            <div className="flex flex-wrap gap-2 pt-1">
              {SECTIONS.map((s) => (
                <Link key={s.to} to={s.to} onClick={() => setOpen(false)} className="rounded-full border border-cocoa px-3 py-1 text-xs font-bold text-cocoa hover:bg-cocoa hover:text-cream">
                  {s.label}
                </Link>
              ))}
            </div>
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-goldsoft bg-card p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب سؤالك..."
              className="flex-1 rounded-full border border-goldsoft bg-cream px-4 py-2 text-sm text-cocoadeep outline-none focus:border-cocoa"
            />
            <button onClick={send} aria-label="إرسال" className="grid size-10 place-items-center rounded-full bg-cocoa text-cream active:scale-95">
              <Send className="size-4 -scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
