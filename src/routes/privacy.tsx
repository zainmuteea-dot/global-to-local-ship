import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Headphones,
  IdCard,
  Mail,
  Phone,
  RefreshCw,
  Share2,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — السوق الشامل" },
      { name: "description", content: "كيف يجمع السوق الشامل بياناتك ويستخدمها ويحميها." },
      { property: "og:title", content: "سياسة الخصوصية — السوق الشامل" },
      { property: "og:description", content: "كيف يجمع السوق الشامل بياناتك ويستخدمها ويحميها." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

type PrivacySection = {
  title: string;
  icon: LucideIcon;
  text?: string;
  bullets?: string[];
};

const sections: PrivacySection[] = [
  {
    title: "البيانات التي نجمعها",
    icon: IdCard,
    bullets: [
      "بيانات الحساب: الاسم، رقم الجوال، البريد الإلكتروني، والصورة الشخصية إن أضفتها.",
      "بيانات الطلبات: روابط المنتجات، المواصفات، وحالة الشحنة.",
      "عناوين التوصيل، وموقعك الجغرافي فقط عند موافقتك على استخدامه.",
    ],
  },
  {
    title: "كيف نستخدم بياناتك",
    icon: Target,
    bullets: [
      "تنفيذ طلباتك وشراؤها وشحنها وتوصيلها إليك.",
      "التواصل معك بخصوص الطلبات والأسعار وحالة الشحن.",
      "إرسال إشعارات وعروض يمكنك إيقافها في أي وقت.",
    ],
  },
  {
    title: "مشاركة البيانات",
    icon: Share2,
    text: "لا نبيع بياناتك لأي جهة. نشارك فقط الحد الأدنى اللازم مع شركات الشحن والتوصيل لإيصال طلبك، أو عندما يُطلب ذلك قانونياً.",
  },
  {
    title: "حماية البيانات",
    icon: ShieldCheck,
    text: "نحفظ بياناتك في خوادم مؤمّنة، ولا يستطيع الاطلاع على بيانات حسابك إلا أنت وفريق خدمة العملاء المخوّل.",
  },
  {
    title: "حقوقك",
    icon: Headphones,
    bullets: [
      "تعديل بيانات حسابك في أي وقت من صفحة «حسابي».",
      "طلب حذف حسابك وبياناتك بالتواصل مع خدمة العملاء.",
    ],
  },
  {
    title: "التحديثات",
    icon: RefreshCw,
    text: "قد نحدّث هذه السياسة من وقت لآخر، وسيتم نشر أي تعديل في هذه الصفحة.",
  },
];

function PrivacyPage() {
  const navigate = useNavigate();
  const goBack = () => navigate({ to: "/my-account" });

  return (
    <div className="privacy-page" dir="rtl" lang="ar">
      <style>{styles}</style>
      <header className="privacy-header">
        <div className="privacy-header-inner">
          <button className="privacy-close" type="button" onClick={goBack} aria-label="العودة إلى حسابي">
            <X size={18} />
          </button>
          <span className="privacy-header-title">سياسة الخصوصية والأمان</span>
          <span className="privacy-header-spacer" aria-hidden="true" />
        </div>
      </header>

      <main className="privacy-main">
        <section className="privacy-hero">
          <div className="privacy-hero-copy">
            <span className="privacy-hero-kicker">السوق الشامل</span>
            <h1>خصوصيتك أمانة</h1>
            <p>نستخدم بياناتك لخدمة حسابك وطلباتك، ونوضح هنا كيف نتعامل معها.</p>
          </div>
          <img className="privacy-logo" src="/alshamel-logo.png" alt="شعار السوق الشامل" />
        </section>

        <section className="privacy-notice" aria-label="تنبيه الخصوصية">
          <span className="privacy-notice-icon" aria-hidden="true"><AlertTriangle size={18} /></span>
          <p><strong>تنبيه — خصوصية وأمان:</strong> هذه معلومات عامة داخل التطبيق وليست مراجعة قانونية.</p>
        </section>

        <div className="privacy-intro">
          <div>
            <h2>دليل سريع</h2>
            <p>ستة أقسام توضح تعاملنا مع بياناتك</p>
          </div>
          <span className="privacy-intro-icon" aria-hidden="true"><FileText size={18} /></span>
        </div>

        <div className="privacy-list">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <article className={`privacy-card privacy-card-${index + 1}`} key={section.title}>
                <div className="privacy-card-heading">
                  <span className="privacy-number">{index + 1}</span>
                  <span className="privacy-card-icon" aria-hidden="true"><Icon size={19} /></span>
                  <h3>{section.title}</h3>
                </div>
                {section.text && <p className="privacy-copy">{section.text}</p>}
                {section.bullets && (
                  <ul className="privacy-copy-list">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </article>
            );
          })}
        </div>

        <section className="privacy-contact">
          <h2><span className="privacy-contact-icon"><Headphones size={17} /></span>تواصل معنا</h2>
          <a className="privacy-contact-row" href="mailto:support@alshamel.ye">
            <span className="privacy-contact-symbol"><Mail size={16} /></span>
            <span className="privacy-contact-copy"><small>البريد الإلكتروني</small><b dir="ltr">support@alshamel.ye</b></span>
          </a>
          <a className="privacy-contact-row" href="https://wa.me/967773370041" target="_blank" rel="noreferrer">
            <span className="privacy-contact-symbol"><Phone size={16} /></span>
            <span className="privacy-contact-copy"><small>الواتساب</small><b dir="ltr">+967 773 370 041</b></span>
          </a>
        </section>
      </main>

      <footer className="privacy-footer">
        <div className="privacy-footer-inner">
          <button type="button" className="privacy-back-button" onClick={goBack}>
            <ArrowRight size={17} /> العودة إلى حسابي
          </button>
          <span className="privacy-footer-note"><ShieldCheck size={14} /> راجع السياسة في أي وقت</span>
        </div>
      </footer>
    </div>
  );
}

const styles = `
.privacy-page{--privacy-primary:#0f4c81;--privacy-primary-2:#1c6fb8;--privacy-ink:#15233b;--privacy-muted:#64748b;--privacy-line:#e4edf6;direction:rtl;min-height:100dvh;padding-bottom:78px;color:var(--privacy-ink);background:linear-gradient(135deg,#edf5fd 0%,#f7faff 60%,#eef5fc 100%);font-family:inherit}
.privacy-page *{box-sizing:border-box}
.privacy-header{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--privacy-line);background:rgba(255,255,255,.95);backdrop-filter:blur(12px)}
.privacy-header-inner{width:min(100%,680px);min-height:48px;margin:auto;padding:6px 12px;display:grid;grid-template-columns:32px 1fr 32px;align-items:center;gap:9px}
.privacy-header-title{text-align:center;color:var(--privacy-primary);font-size:12px;font-weight:900}
.privacy-header-spacer{width:32px}
.privacy-close{display:grid;place-items:center;width:30px;height:30px;border:1px solid #d7e6f5;border-radius:9px;background:#edf5fd;color:var(--privacy-primary);cursor:pointer}
.privacy-main{width:min(100%,680px);margin:auto;padding:12px 12px 20px}
.privacy-hero{min-height:96px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;border-radius:18px;background:linear-gradient(110deg,#0f4c81,#1c6fb8);color:#fff;box-shadow:0 12px 25px rgba(15,76,129,.2)}
.privacy-hero-copy{min-width:0}
.privacy-hero-kicker{display:block;margin-bottom:3px;color:#d7ebff;font-size:10px;font-weight:800}
.privacy-hero h1{margin:0;font-size:18px;line-height:1.35;font-weight:950}
.privacy-hero p{max-width:430px;margin:4px 0 0;color:#e8f3ff;font-size:10px;font-weight:650;line-height:1.7}
.privacy-logo{width:62px;height:62px;flex:none;border:2px solid rgba(255,255,255,.6);border-radius:15px;background:#fff;object-fit:contain;padding:3px}
.privacy-notice{display:flex;align-items:center;gap:9px;margin-top:11px;padding:9px 10px;border:1px solid #f4df91;border-radius:13px;background:#fff7dc;color:#80500d}
.privacy-notice-icon{display:grid;place-items:center;flex:none;width:30px;height:30px;border:1px solid #f3df98;border-radius:9px;background:#ffefb8;color:#a45606}
.privacy-notice p{margin:0;font-size:10px;font-weight:700;line-height:1.7}
.privacy-notice strong{color:#a45606;font-weight:900}
.privacy-intro{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 2px 0}
.privacy-intro h2{margin:0;color:#172b47;font-size:15px;font-weight:950}
.privacy-intro p{margin:3px 0 0;color:var(--privacy-muted);font-size:10px;font-weight:700}
.privacy-intro-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid #d7e6f5;border-radius:10px;background:#eaf2fb;color:var(--privacy-primary)}
.privacy-list{display:flex;flex-direction:column;gap:9px;margin-top:10px}
.privacy-card{position:relative;overflow:hidden;padding:11px 12px;border:1px solid var(--privacy-line);border-radius:15px;background:#fff;box-shadow:0 7px 18px rgba(15,76,129,.055)}
.privacy-card:before{position:absolute;inset-block:0;inset-inline-start:0;width:4px;background:var(--privacy-accent);content:""}
.privacy-card-heading{display:flex;align-items:center;gap:8px;min-height:33px}
.privacy-number{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:8px;background:var(--privacy-accent);color:#fff;font-size:11px;font-weight:950}
.privacy-card-icon{display:grid;place-items:center;flex:none;width:33px;height:33px;border:1px solid var(--privacy-accent-border);border-radius:10px;background:var(--privacy-accent-bg);color:var(--privacy-accent)}
.privacy-card-heading h3{margin:0;color:#15233b;font-size:12px;font-weight:900;line-height:1.5}
.privacy-copy,.privacy-copy-list{margin:7px 0 0;color:#3e4f66;font-size:10px;font-weight:650;line-height:1.75;overflow-wrap:anywhere}
.privacy-copy-list{padding-inline-start:17px}
.privacy-copy-list li+li{margin-top:2px}
.privacy-card-1{--privacy-accent:#1c6fb8;--privacy-accent-bg:#e7f1fc;--privacy-accent-border:#c6dcf3}
.privacy-card-2{--privacy-accent:#f97316;--privacy-accent-bg:#fff0e5;--privacy-accent-border:#fbd3af}
.privacy-card-3{--privacy-accent:#12a150;--privacy-accent-bg:#e5f7ed;--privacy-accent-border:#bde7ce}
.privacy-card-4{--privacy-accent:#7c3aed;--privacy-accent-bg:#f0eafe;--privacy-accent-border:#dac9f7}
.privacy-card-5{--privacy-accent:#06a6b5;--privacy-accent-bg:#e2f7f8;--privacy-accent-border:#bce8eb}
.privacy-card-6{--privacy-accent:#db3d8c;--privacy-accent-bg:#fce7f1;--privacy-accent-border:#f7c0db}
.privacy-contact{margin-top:10px;padding:11px;border:1px solid #d7e6f5;border-radius:15px;background:linear-gradient(135deg,#f3f8fd,#eaf2fb)}
.privacy-contact h2{display:flex;align-items:center;gap:7px;margin:0 0 8px;font-size:12px;font-weight:900;color:#172b47}
.privacy-contact-icon{display:grid;place-items:center;width:29px;height:29px;border:1px solid #d7e6f5;border-radius:9px;background:#fff;color:var(--privacy-primary)}
.privacy-contact-row{display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid var(--privacy-line);border-radius:11px;background:#fff;color:inherit;text-decoration:none}
.privacy-contact-row+.privacy-contact-row{margin-top:6px}
.privacy-contact-row:hover{border-color:#b8d2eb;background:#fbfdff}
.privacy-contact-symbol{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:9px;background:#eaf2fb;color:var(--privacy-primary)}
.privacy-contact-copy{display:flex;flex-direction:column;gap:1px;min-width:0}
.privacy-contact-copy small{color:var(--privacy-muted);font-size:9px;font-weight:700}
.privacy-contact-copy b{color:#172b47;font-size:10px;font-weight:900}
.privacy-footer{position:fixed;inset-inline:0;bottom:0;z-index:30;border-top:1px solid var(--privacy-line);background:rgba(255,255,255,.96);backdrop-filter:blur(12px);box-shadow:0 -6px 18px rgba(15,76,129,.07)}
.privacy-footer-inner{width:min(100%,680px);min-height:58px;margin:auto;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.privacy-back-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:0 15px;border:0;border-radius:11px;background:linear-gradient(120deg,var(--privacy-primary),var(--privacy-primary-2));color:#fff;font:inherit;font-size:11px;font-weight:900;cursor:pointer}
.privacy-footer-note{display:flex;align-items:center;gap:4px;color:#52657d;font-size:9px;font-weight:700}
@media(max-width:420px){.privacy-hero{min-height:88px;padding:11px}.privacy-logo{width:54px;height:54px}.privacy-hero h1{font-size:16px}.privacy-main{padding-inline:10px}.privacy-footer-inner{justify-content:center}.privacy-back-button{flex:1}.privacy-footer-note{display:none}}
@media(prefers-reduced-motion:reduce){.privacy-page *{scroll-behavior:auto}}
`;
