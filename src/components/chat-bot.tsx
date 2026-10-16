import { useEffect, useRef, useState } from "react";
import { Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { from: "bot" | "user"; text: string };

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

// مكون الروبوت الأزرق المطابق للصورة تماماً
export function BlueRobotMascot({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`blue-robot-character ${className}`}
    >
      <defs>
        {/* تدرج اللون الأزرق الأساسي */}
        <linearGradient id="robotBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* تدرج إطار الرأس */}
        <linearGradient id="headBevelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        {/* تدرج شاشة الوجه */}
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#081528" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* توهج العيون والابتسامة البيضاء */}
        <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. الهوائي الرأسي والكرة العلوية */}
      <g className="robot-antenna-group">
        <line x1="50" y1="20" x2="50" y2="9" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="7" r="5" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1.5" className="robot-beacon" />
      </g>

      {/* 2. الذراعان */}
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

      {/* 3. الجسم مع الخطوط الرأسية كالصورة */}
      <g className="robot-body">
        <path
          d="M32 60 H68 L64 100 H36 Z"
          fill="url(#robotBlueGrad)"
          stroke="#075985"
          strokeWidth="2"
        />
        <line x1="42" y1="61" x2="40" y2="99" stroke="#7dd3fc" strokeWidth="3" opacity="0.85" />
        <line x1="50" y1="61" x2="50" y2="99" stroke="#bae6fd" strokeWidth="4" opacity="0.95" />
        <line x1="58" y1="61" x2="60" y2="99" stroke="#7dd3fc" strokeWidth="3" opacity="0.85" />
      </g>

      {/* 4. الرأس وشاشة الوجه المنحنية */}
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

        {/* العيون المستديرة البيضاء والابتسامة الضاحكة */}
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
    {
      from: "bot",
      text: "أهلاً! أنا شامِل بوت 🤖 اسألني أي شي عن السوق الشامل.. أو اطلب نكتة، أنا مضحك (على قول أمي) 😄",
    },
  ]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  if (gone) return null;

  const send = () => {
    const q = text.trim();
    if (!q) return;

    // تفعيل هزة الضحك الخفيفة للروبوت عند الإرسال
    setIsGiggling(true);
    setTimeout(() => setIsGiggling(false), 800);

    const hit = replies.find((r) => r.match.test(q));
    const answer =
      hit ? hit.text : (fallback[Math.floor(Math.random() * fallback.length)] ?? fallback[0]!);

    setMsgs((m) => [...m, { from: "user", text: q }, { from: "bot", text: answer }]);
    setText("");
  };

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
                aria-label="حذف الروبوت نهائيًا"
                title="حذف الروبوت"
                onClick={() => setGone(true)}
              >
                <Trash2 size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="إغلاق المحادثة"
                onClick={() => setOpen(false)}
              >
                <X size={15} />
              </Button>
            </span>
          </div>

          <div className="chatbot-msgs" ref={listRef}>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`chatbot-msg ${m.from === "bot" ? "bot" : "user"} animate-pop-in`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form
            className="chatbot-form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اسألني عن المتاجر، الشحن، أو نكتة..."
              aria-label="رسالتك للروبوت"
            />
            <Button type="submit" size="icon" aria-label="إرسال" className="bg-sky-600 hover:bg-sky-500 text-white">
              <Send size={15} />
            </Button>
          </form>
        </div>
      )}

      {!open && (
        <div className="chatbot-fab-container">
          {/* فقاعة دعوة للدردشة تطفو فوق الروبوت */}
          <div className="chatbot-badge-callout">
            اسألني! 😄
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="chatbot-fab"
            aria-label="فتح محادثة شامِل بوت"
            onClick={() => setOpen(true)}
          >
            <BlueRobotMascot size={46} />
          </Button>
        </div>
      )}
    </div>
  );
}
