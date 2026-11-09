import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  AlertTriangle,
  FileText,
  Headphones,
  IdCard,
  LockKeyhole,
  Mail,
  Phone,
  Share2,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";

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
  icon: typeof IdCard;
  emoji: string;
  content: string[];
};

const sections: PrivacySection[] = [
  {
    title: "البيانات التي نجمعها",
    icon: IdCard,
    emoji: "🪪",
    content: [
      "بيانات الحساب: الاسم، رقم الجوال، البريد الإلكتروني، والصورة الشخصية إن أضفتها.",
      "بيانات الطلبات: روابط المنتجات، المواصفات، وحالة الشحنة.",
      "عناوين التوصيل، وموقعك الجغرافي فقط عند موافقتك على استخدامه.",
    ],
  },
  {
    title: "كيف نستخدم بياناتك",
    icon: Target,
    emoji: "🎯",
    content: [
      "تنفيذ طلباتك وشراؤها وشحنها وتوصيلها إليك.",
      "التواصل معك بخصوص الطلبات والأسعار وحالة الشحن.",
      "إرسال إشعارات وعروض يمكنك إيقافها في أي وقت.",
    ],
  },
  {
    title: "مشاركة البيانات",
    icon: Share2,
    emoji: "🔗",
    content: [
      "لا نبيع بياناتك لأي جهة. نشارك فقط الحد الأدنى اللازم مع شركات الشحن والتوصيل لإيصال طلبك، أو عندما يُطلب ذلك قانونياً.",
    ],
  },
  {
    title: "حماية البيانات",
    icon: ShieldCheck,
    emoji: "🛡️",
    content: [
      "نحفظ بياناتك في خوادم مؤمّنة، ولا يستطيع الاطلاع على بيانات حسابك إلا أنت وفريق خدمة العملاء المخوّل.",
    ],
  },
  {
    title: "حقوقك",
    icon: Headphones,
    emoji: "🎧",
    content: [
      "تعديل بيانات حسابك في أي وقت من صفحة «حسابي».",
      "طلب حذف حسابك وبياناتك بالتواصل مع خدمة العملاء.",
    ],
  },
  {
    title: "التحديثات",
    icon: FileText,
    emoji: "📄",
    content: ["قد نحدّث هذه السياسة من وقت لآخر، وسيتم نشر أي تعديل في هذه الصفحة."],
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
          <div className="privacy-heading">
            <span className="privacy-heading-icon" aria-hidden="true"><LockKeyhole size={19} /></span>
            <h1>سياسة الخصوصية والأمان</h1>
          </div>
          <button className="privacy-close" type="button" onClick={goBack} aria-label="العودة إلى حسابي">
            <X size={19} />
          </button>
        </div>
      </header>

      <main className="privacy-main">
        <section className="privacy-notice" aria-label="تنبيه">
          <span className="privacy-notice-icon" aria-hidden="true"><AlertTriangle size={19} /></span>
          <p><strong>تنبيه — خصوصية وأمان:</strong> هذه معلومات عامة عن سياسة المنصة، وليست استشارة قانونية.</p>
        </section>

        <div className="privacy-intro">
          <h2>كيف نتعامل مع بياناتك</h2>
          <p>آخر تحديث: سبتمبر 2026 · ستة أقسام توضح سياسة الخصوصية</p>
        </div>

        <div className="privacy-list">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <article className={`privacy-card privacy-card-${index + 1}`} key={section.title}>
                <div className="privacy-card-heading">
                  <span className="privacy-card-icon" aria-hidden="true"><Icon size={21} /></span>
                  <h3>{section.title} <span>{section.emoji}</span></h3>
                </div>
                {section.content.length === 1 ? (
                  <p className="privacy-copy">{section.content[0]}</p>
                ) : (
                  <ul className="privacy-copy-list">
                    {section.content.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                )}
              </article>
            );
          })}
        </div>

        <section className="privacy-contact">
          <h2><span className="privacy-contact-icon"><Headphones size={18} /></span>تواصل معنا</h2>
          <a className="privacy-contact-row" href="mailto:support@alshamel.ye">
            <span className="privacy-contact-symbol"><Mail size={17} /></span>
            <span className="privacy-contact-copy"><small>البريد الإلكتروني</small><b dir="ltr">support@alshamel.ye</b></span>
          </a>
          <a className="privacy-contact-row" href="https://wa.me/967773370041" target="_blank" rel="noreferrer">
            <span className="privacy-contact-symbol"><Phone size={17} /></span>
            <span className="privacy-contact-copy"><small>الواتساب</small><b dir="ltr">+967 773 370 041</b></span>
          </a>
        </section>
      </main>

      <footer className="privacy-footer">
        <div className="privacy-footer-inner">
          <button type="button" className="privacy-back-button" onClick={goBack}>
            <ArrowRight size={18} /> العودة إلى حسابي
          </button>
          <span className="privacy-footer-note"><ShieldCheck size={15} /> يمكنك مراجعة السياسة في أي وقت</span>
        </div>
      </footer>
    </div>
  );
}

const styles = `
.privacy-page{--privacy-primary:#0f4c81;--privacy-primary-2:#1c6fb8;--privacy-ink:#15233b;--privacy-muted:#64748b;--privacy-line:#e4edf6;direction:rtl;min-height:100dvh;padding-bottom:86px;color:var(--privacy-ink);background:linear-gradient(135deg,#edf5fd 0%,#f7faff 60%,#eef5fc 100%);font-family:inherit}
.privacy-page *{box-sizing:border-box}
.privacy-header{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--privacy-line);background:rgba(255,255,255,.94);backdrop-filter:blur(12px);box-shadow:0 5px 18px rgba(15,76,129,.06)}
.privacy-header-inner{width:min(100%,680px);min-height:62px;margin:auto;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.privacy-heading{display:flex;align-items:center;gap:9px;color:var(--privacy-primary)}
.privacy-heading h1{margin:0;font-size:16px;font-weight:900}
.privacy-heading-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#eaf2fb}
.privacy-close{display:grid;place-items:center;width:38px;height:38px;border:1px solid #d7e6f5;border-radius:12px;background:#edf5fd;color:var(--privacy-primary);cursor:pointer}
.privacy-close:hover{background:#dceafa}
.privacy-main{width:min(100%,680px);margin:auto;padding:0 18px 24px}
.privacy-notice{display:flex;align-items:center;gap:11px;margin-top:15px;padding:11px 13px;border:1px solid #f4df91;border-radius:16px;background:#fff7dc;color:#80500d;box-shadow:0 7px 18px rgba(180,120,10,.06)}
.privacy-notice-icon{display:grid;place-items:center;flex:none;width:35px;height:35px;border:1px solid #f3df98;border-radius:11px;background:#ffefb8;color:#a45606}
.privacy-notice p{margin:0;font-size:11.5px;font-weight:700;line-height:1.8}
.privacy-notice strong{font-weight:900;color:#a45606}
.privacy-intro{margin:17px 2px 0}
.privacy-intro h2{margin:0;font-size:18px;font-weight:900;color:#172b47}
.privacy-intro p{margin:4px 0 0;color:var(--privacy-muted);font-size:11px;font-weight:700}
.privacy-list{display:flex;flex-direction:column;gap:11px;margin-top:13px}
.privacy-card{position:relative;overflow:hidden;padding:13px 14px;border:1px solid var(--privacy-line);border-radius:17px;background:#fff;box-shadow:0 8px 22px rgba(15,76,129,.06);transition:transform .18s,box-shadow .18s}
.privacy-card:hover{transform:translateY(-2px);box-shadow:0 14px 27px rgba(15,76,129,.1)}
.privacy-card:before{position:absolute;inset-block:0;inset-inline-start:0;width:4px;background:var(--privacy-accent);content:""}
.privacy-card-heading{display:flex;align-items:center;gap:10px;min-height:39px}
.privacy-card-icon{display:grid;place-items:center;flex:none;width:39px;height:39px;border:1px solid var(--privacy-accent-border);border-radius:12px;background:var(--privacy-accent-bg);color:var(--privacy-accent)}
.privacy-card-heading h3{margin:0;color:#15233b;font-size:13px;font-weight:900;line-height:1.5}
.privacy-card-heading h3 span{margin-inline-start:2px}
.privacy-copy,.privacy-copy-list{margin:8px 0 0;color:#3e4f66;font-size:11px;font-weight:650;line-height:1.8;overflow-wrap:anywhere}
.privacy-copy-list{padding-inline-start:18px}
.privacy-copy-list li+li{margin-top:3px}
.privacy-card-1{--privacy-accent:#1c6fb8;--privacy-accent-bg:#e7f1fc;--privacy-accent-border:#c6dcf3}
.privacy-card-2{--privacy-accent:#12a150;--privacy-accent-bg:#e5f7ed;--privacy-accent-border:#bde7ce}
.privacy-card-3{--privacy-accent:#f97316;--privacy-accent-bg:#fff0e5;--privacy-accent-border:#fbd3af}
.privacy-card-4{--privacy-accent:#7c3aed;--privacy-accent-bg:#f0eafe;--privacy-accent-border:#dac9f7}
.privacy-card-5{--privacy-accent:#06a6b5;--privacy-accent-bg:#e2f7f8;--privacy-accent-border:#bce8eb}
.privacy-card-6{--privacy-accent:#db3d8c;--privacy-accent-bg:#fce7f1;--privacy-accent-border:#f7c0db}
.privacy-contact{margin-top:12px;padding:13px;border:1px solid #d7e6f5;border-radius:17px;background:linear-gradient(135deg,#f3f8fd,#eaf2fb)}
.privacy-contact h2{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:13px;font-weight:900;color:#172b47}
.privacy-contact-icon{display:grid;place-items:center;width:31px;height:31px;border:1px solid #d7e6f5;border-radius:10px;background:#fff;color:var(--privacy-primary)}
.privacy-contact-row{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--privacy-line);border-radius:13px;background:#fff;color:inherit;text-decoration:none}
.privacy-contact-row+.privacy-contact-row{margin-top:7px}
.privacy-contact-row:hover{border-color:#b8d2eb;background:#fbfdff}
.privacy-contact-symbol{display:grid;place-items:center;flex:none;width:33px;height:33px;border-radius:10px;background:#eaf2fb;color:var(--privacy-primary)}
.privacy-contact-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.privacy-contact-copy small{color:var(--privacy-muted);font-size:9px;font-weight:700}
.privacy-contact-copy b{color:#172b47;font-size:11px;font-weight:900}
.privacy-footer{position:fixed;inset-inline:0;bottom:0;z-index:30;border-top:1px solid var(--privacy-line);background:rgba(255,255,255,.96);backdrop-filter:blur(12px);box-shadow:0 -7px 22px rgba(15,76,129,.07)}
.privacy-footer-inner{width:min(100%,680px);min-height:66px;margin:auto;padding:9px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.privacy-back-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 17px;border:0;border-radius:13px;background:linear-gradient(120deg,var(--privacy-primary),var(--privacy-primary-2));color:#fff;font:inherit;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(15,76,129,.2)}
.privacy-back-button:hover{filter:brightness(1.07)}
.privacy-footer-note{display:flex;align-items:center;gap:5px;color:#52657d;font-size:10px;font-weight:700}
@media(max-width:480px){.privacy-header-inner,.privacy-main,.privacy-footer-inner{padding-inline:12px}.privacy-card{padding:12px}.privacy-footer-inner{justify-content:center}.privacy-back-button{flex:1}.privacy-footer-note{display:none}.privacy-copy,.privacy-copy-list{font-size:10.5px}}
@media(prefers-reduced-motion:reduce){.privacy-card{transition:none}}
`;
