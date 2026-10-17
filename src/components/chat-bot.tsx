import { useEffect, useRef, useState } from "react";
import { Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Msg = { from: "bot" | "user" | "staff"; text: string };

const replies: { match: RegExp; text: string }[] = [
  { match: /سلام|مرحبا|اهلا|أهلا|هلا|هاي/, text: "هلا والله! أنا شامِل بوت 🤖 أسعى لخدمتك أكثر من عامل التوصيل نفسه!" },
  { match: /سعر|اسعار|أسعار|تكلفة|غالي|رخيص/, text: "أسعارنا؟ أرخص من قهوة الصباح.. تقريبًا 😄 أرسل رابط المنتج ونحسبها لك بالريال أو الدولار!" },
  { match: /شحن|توصيل|يوصل|وصل/, text: "الشحن عندنا أسرع من انتشار الأخبار في القرية 🚚 نوصل لكل المحافظات حتى باب بيتك!" },
  { match: /متجر|متاجر|امازون|أمازون|شي ان|شيإن|علي اكسبرس|ترينديول|تيمو/, text: "AliExpress وAmazon وSHEIN وTrendyol وTEMU... كلهم أصحابي، أطلب منهم وهم ما يردون عليّ إلا بالخصومات 😎" },
  { match: /طلب|اطلب|اشتري|شراء/, text: "بسيطة! انسخ رابط المنتج، اضغط «اطلب الآن» فوق، وخلك مرتاح.. إحنا نشتري ونشحن وأنت تشرب شاهي ☕" },
  { match: /تتبع|شحنة|طلبي|وين/, text: "شحنتك؟ اضغط زر «تتبع شحنتك» وحط رقمها.. وإذا تأخرت لا تزعل، هي تتمشى في الطريق 🐢" },
  { match: /ضحك|نكتة|اضحكني/, text: "نكتة؟ قالوا للعميل: شحنتك وصلت! قال: مستحيل، أنا لسه ما طلبت! 😂 مع السوق الشامل السرعة تسبق الخيال" },
  { match: /شكرا|مشكور|يعطيك/, text: "العفو! خدمتك شرف لي.. وأنا بوت ما آخذ إكرامية، بس دعوة حلوة تكفي 🙏" },
  { match: /مين|من انت|من أنت|بوت|روبوت/, text: "أنا شامِل بوت، موظف الشهر كل شهر (لأني الموظف الوحيد 🤖). أعرف كل شي عن السوق الشامل!" },
];

const fallback = [
  "سؤال حلو! بس أنا متخصص بس في السوق الشامل.. جرب تسألني عن الأسعار أو الشحن 😅",
  "هممم.. دعني أفكر.. طيب فكرت، ما فهمت 😂 اسألني عن المتاجر أو الطلب!",
  "هذا خارج تغطيتي، أنا أغطي بس السوق الشامل.. زي الشبكة تمامًا 📶",
];

type ChatSession = { conversationId: string; accessToken: string };

type StoredChatMessage = {
  id: string;
  sender_type: "visitor" | "bot" | "staff";
  body: string;
  created_at: string;
};

const CHAT_STORAGE_KEY = "alsouk_chat_session_v2";
const CHAT_WELCOME =
  "أهلاً! أنا شامِل بوت 🤖 اسألني عن السوق الشامل أو اترك رسالتك لفريق الدعم.";
const db = supabase as any;

function readChatSession(): ChatSession | null {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "conversationId" in parsed &&
      "accessToken" in parsed &&
      typeof parsed.conversationId === "string" &&
      typeof parsed.accessToken === "string"
    ) {
      return {
        conversationId: parsed.conversationId,
        accessToken: parsed.accessToken,
      };
    }
  } catch (error) {
    console.error("Could not read saved chat session", error);
  }

  return null;
}

function createChatAccessToken(): string {
  if (typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex
    .slice(10, 16)
    .join("")}`;
}

function mapStoredMessages(rows: StoredChatMessage[]): Msg[] {
  return [
    { from: "bot", text: CHAT_WELCOME },
    ...rows.map((row) => ({
      from: row.sender_type === "visitor" ? "user" : row.sender_type,
      text: row.body,
    })),
  ];
}

/** شخصية الروبوت الزرقاء المرسومة بـSVG، دون صورة خارجية. */
export function BlueRobotMascot({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`blue-robot-character ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="robotBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        <linearGradient id="headBevelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#081528" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g className="robot-antenna-group">
        <line
          x1="50"
          y1="20"
          x2="50"
          y2="9"
          stroke="#0284c7"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="7"
          r="5"
          fill="#38bdf8"
          stroke="#bae6fd"
          strokeWidth="1.5"
          className="robot-beacon"
        />
      </g>

      <g className="robot-arms">
        <path
          d="M26 64 L14 74 L8 98"
          stroke="url(#robotBlueGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="robot-arm-left"
        />
        <path
          d="M74 64 L86 74 L92 98"
          stroke="url(#robotBlueGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="robot-arm-right"
        />
      </g>

      <g className="robot-body">
        <path
          d="M32 60 H68 L64 100 H36 Z"
          fill="url(#robotBlueGrad)"
          stroke="#075985"
          strokeWidth="2"
        />
        <line
          x1="42"
          y1="61"
          x2="40"
          y2="99"
          stroke="#7dd3fc"
          strokeWidth="3"
          opacity="0.85"
        />
        <line
          x1="50"
          y1="61"
          x2="50"
          y2="99"
          stroke="#bae6fd"
          strokeWidth="4"
          opacity="0.95"
        />
        <line
          x1="58"
          y1="61"
          x2="60"
          y2="99"
          stroke="#7dd3fc"
          strokeWidth="3"
          opacity="0.85"
        />
      </g>

      <g className="robot-head-group">
        <rect x="16" y="32" width="5" height="12" rx="2.5" fill="#0284c7" />
        <rect x="79" y="32" width="5" height="12" rx="2.5" fill="#0284c7" />

        <rect
          x="19"
          y="18"
          width="62"
          height="40"
          rx="12"
          fill="url(#headBevelGrad)"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />

        <rect
          x="25"
          y="23"
          width="50"
          height="30"
          rx="8"
          fill="url(#screenGrad)"
          stroke="#0369a1"
          strokeWidth="1"
        />

        <g className="robot-face-expressions" filter="url(#eyeGlow)">
          <circle cx="39" cy="35" r="5" fill="#ffffff" className="robot-eye" />
          <circle cx="61" cy="35" r="5" fill="#ffffff" className="robot-eye" />
          <path
            d="M44 42 Q50 49 56 42 Q50 47 44 42 Z"
            fill="#ffffff"
            className="robot-smile"
          />
        </g>
      </g>
    </svg>
  );
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  const [isGiggling, setIsGiggling] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: CHAT_WELCOME },
  ]);
  const [text, setText] = useState("");
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [initAttempt, setInitAttempt] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const initializeChat = async () => {
      setChatReady(false);
      setChatError("");

      try {
        let saved = readChatSession();

        if (!saved) {
          const accessToken = createChatAccessToken();
          const { data, error } = await db.rpc("chat_create_conversation", {
            _access_token: accessToken,
          });

          if (error) throw error;

          if (typeof data !== "string" || !data) {
            throw new Error("The chat creation RPC returned no conversation ID");
          }

          saved = { conversationId: data, accessToken };

          try {
            window.localStorage.setItem(
              CHAT_STORAGE_KEY,
              JSON.stringify(saved),
            );
          } catch (storageError) {
            console.error(
              "Could not persist chat session in this browser",
              storageError,
            );
            throw new Error("تعذر حفظ جلسة المحادثة على هذا الجهاز.");
          }
        }

        if (cancelled) return;

        setChatSession(saved);
        setChatReady(true);
      } catch (error) {
        console.error("Chat initialization failed", error);

        if (!cancelled) {
          setChatError(
            "تعذر بدء المحادثة. تأكد من إعداد دوال قاعدة البيانات وسياسات الوصول ثم أعد المحاولة.",
          );
        }
      }
    };

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [initAttempt]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, open]);

  useEffect(() => {
    if (!open || !chatSession || !chatReady) return;

    let cancelled = false;
    let loadingMessages = false;

    const refreshMessages = async () => {
      if (loadingMessages) return;

      loadingMessages = true;

      const { data, error } = await db.rpc("chat_get_messages", {
        _conversation_id: chatSession.conversationId,
        _access_token: chatSession.accessToken,
      });

      loadingMessages = false;

      if (cancelled) return;

      if (error) {
        console.error("Loading chat messages failed", error);
        setChatError(
          "تعذر تحميل الرسائل. قد تكون المحادثة غير متاحة؛ أعد المحاولة أو ابدأ محادثة جديدة.",
        );
        return;
      }

      setChatError("");
      setMsgs(mapStoredMessages((data ?? []) as StoredChatMessage[]));
    };

    void refreshMessages();

    const timer = window.setInterval(() => {
      void refreshMessages();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, chatSession, chatReady]);

  const startNewConversation = () => {
    try {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.error("Could not clear saved chat session", error);
    }

    setChatSession(null);
    setChatReady(false);
    setMsgs([{ from: "bot", text: CHAT_WELCOME }]);
    setChatError("");
    setInitAttempt((attempt) => attempt + 1);
  };

  const send = async () => {
    const question = text.trim();

    if (
      !question ||
      question.length > 1000 ||
      !chatSession ||
      !chatReady ||
      sendingRef.current
    ) {
      return;
    }

    sendingRef.current = true;
    setChatBusy(true);
    setChatError("");
    setIsGiggling(true);
    window.setTimeout(() => setIsGiggling(false), 800);

    const matchingReply = replies.find((item) => item.match.test(question));
    const answer =
      matchingReply?.text ??
      fallback[Math.floor(Math.random() * fallback.length)] ??
      fallback[0]!;

    try {
      const { error } = await db.rpc("chat_send_visitor_message", {
        _conversation_id: chatSession.conversationId,
        _access_token: chatSession.accessToken,
        _body: question,
        _bot_reply: answer,
      });

      if (error) throw error;

      setText("");

      const { data, error: refreshError } = await db.rpc(
        "chat_get_messages",
        {
          _conversation_id: chatSession.conversationId,
          _access_token: chatSession.accessToken,
        },
      );

      if (refreshError) throw refreshError;

      setMsgs(mapStoredMessages((data ?? []) as StoredChatMessage[]));
    } catch (error) {
      console.error("Sending chat message failed", error);
      setChatError("لم تُرسل الرسالة. تحقق من الاتصال وحاول مجددًا.");
    } finally {
      sendingRef.current = false;
      setChatBusy(false);
    }
  };

  if (gone) return null;

  return (
    <div className="chatbot" dir="rtl">
      {open && (
        <div className="chatbot-panel glass-card">
          <div className="chatbot-head">
            <span className="flex items-center gap-2 font-bold text-sky-200">
              <span className={isGiggling ? "animate-giggle" : ""}>
                <BlueRobotMascot size={26} />
              </span>
              شامِل بوت
            </span>

            <span className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="إخفاء الروبوت"
                title="إخفاء الروبوت"
                onClick={() => setGone(true)}
              >
                <Trash2 size={15} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="إغلاق نافذة المحادثة"
                onClick={() => setOpen(false)}
              >
                <X size={15} />
              </Button>
            </span>
          </div>

          <div className="chatbot-msgs" ref={listRef} aria-live="polite">
            {!chatReady && !chatError && (
              <div className="chatbot-msg bot" role="status">
                جارٍ الاتصال بصندوق المحادثات…
              </div>
            )}

            {msgs.map((message, index) => (
              <div
                key={`${message.from}-${index}`}
                className={`chatbot-msg ${
                  message.from === "user" ? "user" : "bot"
                } animate-pop-in`}
              >
                {message.text}
              </div>
            ))}
          </div>

          {chatError && (
            <div className="px-3 pb-2 text-xs text-red-200" role="alert">
              <p>{chatError}</p>

              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setInitAttempt((attempt) => attempt + 1)
                  }
                >
                  إعادة المحاولة
                </Button>

                {chatSession && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={startNewConversation}
                  >
                    محادثة جديدة
                  </Button>
                )}
              </div>
            </div>
          )}

          <form
            className="chatbot-form"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              placeholder={
                chatReady
                  ? "اسألني عن المتاجر، الشحن، أو اكتب للدعم…"
                  : "جارٍ تجهيز المحادثة…"
              }
              aria-label="رسالتك للروبوت"
              disabled={!chatReady || chatBusy}
            />

            <Button
              type="submit"
              size="icon"
              aria-label="إرسال"
              className="bg-sky-600 text-white hover:bg-sky-500"
              disabled={!chatReady || chatBusy || !text.trim()}
            >
              <Send size={15} />
            </Button>
          </form>
        </div>
      )}

      {!open && (
        <div className="chatbot-fab-container">
          <div className="chatbot-badge-callout">
            مرحباً بك! كيف يمكنني مساعدتك اليوم؟
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="chatbot-fab"
            aria-label="فتح محادثة شامل بوت"
            onClick={() => setOpen(true)}
          >
            <BlueRobotMascot size={46} />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="chatbot-dismiss"
            aria-label="إخفاء الروبوت"
            title="إخفاء الروبوت"
            onClick={() => setGone(true)}
          >
            <X size={13} />
          </Button>
        </div>
      )}
    </div>
  );
}
