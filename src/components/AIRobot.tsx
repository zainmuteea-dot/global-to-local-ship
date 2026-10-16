import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Hand, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sender = "bot" | "user" | "staff";
type Msg = { id: string; text: string; sender: Sender };
type StoredMessage = {
  id: string;
  sender_type: "visitor" | "bot" | "staff";
  body: string;
  created_at: string;
};

const CHAT_STORAGE_KEY = "alsouk_robot_chat_conversation_v1";
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
  if (/حساب|تسجيل|دخول/.test(t))
    return "تقدر تسجل دخولك برقم جوالك من زر «حسابي».";
  return "وصل سؤالك. إذا احتجت مساعدة من الموظفين، اترك رسالتك هنا وسيرونها في صندوق المحادثات.";
}

const db = supabase as any;

function mapMessage(row: StoredMessage): Msg {
  return {
    id: row.id,
    text: row.body,
    sender: row.sender_type === "visitor" ? "user" : row.sender_type,
  };
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
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", text: WELCOME, sender: "bot" },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const initialize = async () => {
      setInitializing(true);
      setError("");
      try {
        let id = window.localStorage.getItem(CHAT_STORAGE_KEY);
        if (id) {
          const { data, error: readError } = await db.rpc("chat_get_messages", {
            _conversation_id: id,
          });
          if (readError) throw readError;
          if (!active) return;
          setConversationId(id);
          const rows = (data ?? []) as StoredMessage[];
          setMessages(
            rows.length
              ? rows.map(mapMessage)
              : [{ id: "welcome", text: WELCOME, sender: "bot" }],
          );
          return;
        }

        const { data, error: createError } = await db.rpc("chat_create_conversation");
        if (createError) throw createError;
        id = data as string;
        if (!id) throw new Error("لم يُرجع الخادم رقم المحادثة.");
        window.localStorage.setItem(CHAT_STORAGE_KEY, id);
        if (active) setConversationId(id);
      } catch (cause) {
        console.error("Chat initialization failed", cause);
        if (active) setError("تعذر فتح المحادثة الآن. تحقق من الاتصال ثم أعد المحاولة.");
      } finally {
        if (active) setInitializing(false);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [open, resetKey]);

  useEffect(() => {
    if (!open || !conversationId) return;
    let active = true;
    const refresh = async () => {
      const { data, error: readError } = await db.rpc("chat_get_messages", {
        _conversation_id: conversationId,
      });
      if (!active || readError || !data) return;
      const rows = data as StoredMessage[];
      if (rows.length) setMessages(rows.map(mapMessage));
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, conversationId]);

  const send = async () => {
    const question = input.trim();
    if (!question || !conversationId || sending || question.length > 1000) return;

    const answer = reply(question);
    setInput("");
    setSending(true);
    setTyping(true);
    setError("");
    try {
      const { error: sendError } = await db.rpc("chat_send_visitor_message", {
        _conversation_id: conversationId,
        _body: question,
        _bot_reply: answer,
      });
      if (sendError) throw sendError;
      const { data, error: readError } = await db.rpc("chat_get_messages", {
        _conversation_id: conversationId,
      });
      if (readError) throw readError;
      setMessages(((data ?? []) as StoredMessage[]).map(mapMessage));
    } catch (cause) {
      console.error("Chat send failed", cause);
      setMessages((current) => [
        ...current,
        { id: `local-${Date.now()}`, text: question, sender: "user" },
      ]);
      setError("لم تُحفظ الرسالة. أعد المحاولة بعد التأكد من الاتصال.");
    } finally {
      setTyping(false);
      setSending(false);
    }
  };

  const startNewConversation = () => {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    setConversationId(null);
    setMessages([{ id: "welcome", text: WELCOME, sender: "bot" }]);
    setError("");
    setResetKey((value) => value + 1);
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
          onClick={() => setOpen((value) => !value)}
          aria-label="مساعد السوق الشامل"
          className="robot-float relative grid size-20 place-items-center rounded-full border-[3px] border-cocoa bg-card shadow-xl transition-transform hover:scale-105 active:scale-95"
        >
          <RobotFace size={56} />
          <span className="robot-wave absolute -right-2 top-1 grid size-7 place-items-center rounded-full bg-gold text-cocoadeep shadow">
            <Hand className="size-4" />
          </span>
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
              <div className="text-xs opacity-90">تصل رسالتك إلى فريق الدعم</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-full p-1 hover:bg-cocoadeep">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-cream p-3">
            {initializing && <div className="text-center text-xs text-cocoa">جارٍ فتح المحادثة…</div>}
            {messages.map((message) => (
              <div key={message.id} className={message.sender === "user" ? "text-left" : "text-right"}>
                {message.sender === "staff" && <div className="mb-1 text-xs font-bold text-emerald-800">فريق الدعم</div>}
                <div className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.sender === "user" ? "bg-cocoa text-cream" : message.sender === "staff" ? "border border-emerald-300 bg-emerald-50 text-emerald-950" : "border border-goldsoft bg-card text-cocoadeep"}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {typing && <div className="text-xs text-cocoa">يكتب الآن...</div>}
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                {error} <button onClick={startNewConversation} className="font-bold underline">إعادة بدء المحادثة</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {SECTIONS.map((section) => (
                <Link key={section.to} to={section.to} onClick={() => setOpen(false)} className="rounded-full border border-cocoa px-3 py-1 text-xs font-bold text-cocoa hover:bg-cocoa hover:text-cream">
                  {section.label}
                </Link>
              ))}
            </div>
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-goldsoft bg-card p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void send()}
              maxLength={1000}
              placeholder="اكتب سؤالك..."
              disabled={initializing || !conversationId || sending}
              className="flex-1 rounded-full border border-goldsoft bg-cream px-4 py-2 text-sm text-cocoadeep outline-none focus:border-cocoa disabled:opacity-60"
            />
            <button onClick={() => void send()} aria-label="إرسال" disabled={initializing || !conversationId || sending || !input.trim()} className="grid size-10 place-items-center rounded-full bg-cocoa text-cream active:scale-95 disabled:opacity-50">
              <Send className="size-4 -scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
