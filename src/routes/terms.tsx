import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, FileText, X } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — السوق الشامل" },
      {
        name: "description",
        content: "شروط وأحكام استخدام منصة السوق الشامل للشراء من المتاجر العالمية.",
      },
      { property: "og:title", content: "شروط الاستخدام — السوق الشامل" },
      {
        property: "og:description",
        content: "شروط وأحكام استخدام منصة السوق الشامل للشراء من المتاجر العالمية.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

type Section = { title: string; text?: string; bullets?: string[] };

const sections: Section[] = [
  {
    title: "مقدمة",
    text: "تعد منصة السوق الشامل وسيطاً تجارياً إلكترونياً يسهل عملية الشراء من المتاجر العالمية وتوصيلها للعملاء داخل الجمهورية اليمنية. باستخدامك للموقع، فإنك توافق على الالتزام بكافة الشروط والأحكام الواردة أدناه.",
  },
  {
    title: "طبيعة الخدمة",
    text: "تنحصر مسؤولية السوق الشامل في شراء المنتجات بناءً على الروابط والمواصفات المختارة من قبل العميل وشحنها. نحن لا نصنع المنتجات ولا نملك السيطرة على جودة التصنيع أو الخامات في المتاجر الأصلية.",
  },
  {
    title: "التسجيل والتحقق",
    bullets: [
      "يلتزم العميل بتقديم بيانات دقيقة تشمل الاسم ورقم الهاتف.",
      "يتم تفعيل الحساب عبر رمز التحقق (OTP) لضمان أمان العمليات وموثوقيتها.",
      "العميل مسؤول مسؤولية كاملة عن الحفاظ على سرية بيانات حسابه وكافة الأنشطة التي تتم عبره.",
    ],
  },
  {
    title: "الأسعار والدفع",
    bullets: [
      "يتم احتساب التكلفة الإجمالية وتشمل (سعر المنتج، رسوم الوساطة، وتكاليف الشحن) عند تأكيد الطلب.",
      "يحق للمنصة تعديل عرض السعر قبل التأكيد النهائي في حال حدوث تغييرات في أسعار الصرف أو تحديثات مفاجئة من المصدر.",
    ],
  },
  {
    title: "مدة التوصيل",
    bullets: [
      "المدة التقديرية لوصول الطلبات تتراوح بين 10 إلى 20 يوم عمل.",
      "قد تتأثر هذه المدة بظروف الشحن الدولي، أو الإجراءات الجمركية، أو عوامل خارجة عن إرادتنا، ولا يعد هذا التأخير الخارج عن إرادتنا إخلالاً بمستوى الخدمة.",
    ],
  },
  {
    title: "سياسة الاستبدال والاسترجاع",
    bullets: [
      'تلتزم المنصة بتعويض العميل في حال وصول منتج "مختلف تماماً" عن الطلب الأساسي (مثال: خطأ جذري في نوع الصنف).',
      "العميل مسؤول عن اختيار المقاسات، والألوان، والمواصفات من الموقع الأصلي. لا يحق للعميل المطالبة بالاسترجاع في حال وصل المنتج مطابقاً لطلبه ولكن بمقاس غير مناسب أو جودة مصنعية لم تنل إعجابه.",
    ],
  },
  {
    title: "التعديلات والملكية الفكرية",
    bullets: [
      "جميع حقوق التصميم، والبرمجة، والمحتوى، والواجهات البصرية في الموقع هي ملكية حصرية لـ السوق الشامل.",
      "يحق للمنصة تحديث هذه الشروط أو إجراء تعديلات عليها في أي وقت بما يتماشى مع سياسات العمل، ويُعد استمرار استخدامك للموقع موافقة ضمنية على التحديثات الجديدة.",
    ],
  },
];

const cardStyles = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"];

function TermsPage() {
  const navigate = useNavigate();
  const terms = useMemo(() => sections, []);
  const goBack = () => navigate({ to: "/my-account" });

  return (
    <div className="terms-page" dir="rtl" lang="ar">
      <style>{styles}</style>
      <header className="terms-header">
        <div className="terms-header-inner">
          <div className="terms-heading">
            <span className="terms-heading-icon" aria-hidden="true">
              <FileText size={20} />
            </span>
            <h1>شروط الاستخدام</h1>
          </div>
          <button className="terms-close" type="button" aria-label="العودة إلى حسابي" onClick={goBack}>
            <X size={19} />
          </button>
        </div>
      </header>

      <main className="terms-main">
        <section className="terms-notice" aria-label="تنبيه">
          <span className="terms-notice-icon" aria-hidden="true">!</span>
          <p><strong>يرجى مراجعة الشروط:</strong> اقرأ البنود وسياسات الشراء والشحن قبل استخدام المنصة.</p>
        </section>

        <div className="terms-intro">
          <h2>بنود الشروط</h2>
          <p>آخر تحديث: سبتمبر 2026 · راجع البنود التالية بعناية</p>
        </div>

        <div className="terms-list">
          {terms.map((section, index) => (
            <article className={`terms-card ${cardStyles[index]}`} key={section.title}>
              <div className="terms-card-head">
                <span className="terms-number">{index + 1}</span>
                <span className="terms-card-icon" aria-hidden="true">
                  {index === 0 ? "🛒" : index === 1 ? "📦" : index === 2 ? "👤" : index === 3 ? "💳" : index === 4 ? "🚚" : index === 5 ? "📄" : "💬"}
                </span>
                <h3>{section.title}</h3>
              </div>
              {section.text && <p className="terms-copy">{section.text}</p>}
              {section.bullets && (
                <ul className="terms-bullets">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
            </article>
          ))}
        </div>
      </main>

      <footer className="terms-footer">
        <div className="terms-footer-inner">
          <button className="terms-back-button" type="button" onClick={goBack}>
            <ArrowRight size={18} />
            العودة إلى حسابي
          </button>
          <span className="terms-footer-note"><Check size={15} /> الشروط متاحة للمراجعة في أي وقت</span>
        </div>
      </footer>
    </div>
  );
}

const styles = `
.terms-page{--tp:#0f4c81;--tp2:#1c6fb8;--ink:#15233b;--muted:#64748b;--line:#e4edf6;direction:rtl;min-height:100dvh;padding-bottom:92px;color:var(--ink);background:linear-gradient(135deg,#edf5fd 0%,#f7faff 60%,#eef5fc 100%);font-family:inherit}
.terms-page *{box-sizing:border-box}
.terms-header{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--line);background:rgba(255,255,255,.94);backdrop-filter:blur(12px);box-shadow:0 5px 18px rgba(15,76,129,.06)}
.terms-header-inner{width:min(100%,680px);min-height:62px;margin:auto;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.terms-heading{display:flex;align-items:center;gap:9px;color:var(--tp)}
.terms-heading h1{margin:0;font-size:17px;font-weight:900}
.terms-heading-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#eaf2fb}
.terms-close{display:grid;place-items:center;width:38px;height:38px;border:1px solid #d7e6f5;border-radius:12px;background:#edf5fd;color:var(--tp);cursor:pointer}
.terms-close:hover{background:#dceafa}
.terms-main{width:min(100%,680px);margin:auto;padding:0 18px 26px}
.terms-notice{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px 14px;border:1px solid #f4df91;border-radius:17px;background:#fff7dc;color:#80500d;box-shadow:0 7px 18px rgba(180,120,10,.06)}
.terms-notice-icon{display:grid;place-items:center;flex:none;width:36px;height:36px;border:1px solid #f3df98;border-radius:11px;background:#ffefb8;color:#a45606;font-size:21px;font-weight:900}
.terms-notice p{margin:0;font-size:12px;font-weight:700;line-height:1.8}
.terms-notice strong{font-weight:900;color:#a45606}
.terms-intro{margin:19px 2px 0}
.terms-intro h2{margin:0;font-size:19px;font-weight:900;color:#172b47}
.terms-intro p{margin:5px 0 0;color:var(--muted);font-size:12px;font-weight:700}
.terms-list{display:flex;flex-direction:column;gap:13px;margin-top:15px}
.terms-card{position:relative;overflow:hidden;padding:16px 16px 15px;border:1px solid var(--line);border-radius:19px;background:#fff;box-shadow:0 10px 26px rgba(15,76,129,.065);transition:transform .18s,box-shadow .18s}
.terms-card:hover{transform:translateY(-2px);box-shadow:0 15px 30px rgba(15,76,129,.1)}
.terms-card:before{position:absolute;inset-block:0;inset-inline-start:0;width:5px;background:var(--accent);content:""}
.terms-card-head{display:flex;align-items:center;gap:11px;min-height:42px}
.terms-number{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:10px;background:var(--accent);color:#fff;font-weight:900;box-shadow:0 5px 12px var(--shadow)}
.terms-card-icon{display:grid;place-items:center;flex:none;width:42px;height:42px;border:1px solid var(--accent-border);border-radius:13px;background:var(--accent-bg);font-size:20px}
.terms-card-head h3{min-width:0;margin:0;color:#15233b;font-size:14px;font-weight:900;line-height:1.5}
.terms-copy,.terms-bullets{margin:10px 0 0;color:#3e4f66;font-size:12px;font-weight:650;line-height:1.9;overflow-wrap:anywhere}
.terms-bullets{padding-inline-start:19px}
.terms-bullets li+li{margin-top:5px}
.terms-card.t1{--accent:#1c6fb8;--accent-bg:#e7f1fc;--accent-border:#c6dcf3;--shadow:rgba(28,111,184,.28)}
.terms-card.t2{--accent:#12a150;--accent-bg:#e5f7ed;--accent-border:#bde7ce;--shadow:rgba(18,161,80,.25)}
.terms-card.t3{--accent:#7c3aed;--accent-bg:#f0eafe;--accent-border:#dac9f7;--shadow:rgba(124,58,237,.22)}
.terms-card.t4{--accent:#e49a13;--accent-bg:#fff5df;--accent-border:#f3dfad;--shadow:rgba(228,154,19,.22)}
.terms-card.t5{--accent:#0e9aa7;--accent-bg:#e2f7f8;--accent-border:#bce8eb;--shadow:rgba(14,154,167,.22)}
.terms-card.t6{--accent:#f97316;--accent-bg:#fff0e5;--accent-border:#fbd3af;--shadow:rgba(249,115,22,.22)}
.terms-card.t7{--accent:#db3d8c;--accent-bg:#fce7f1;--accent-border:#f7c0db;--shadow:rgba(219,61,140,.22)}
.terms-footer{position:fixed;inset-inline:0;bottom:0;z-index:30;border-top:1px solid var(--line);background:rgba(255,255,255,.96);backdrop-filter:blur(12px);box-shadow:0 -7px 22px rgba(15,76,129,.07)}
.terms-footer-inner{width:min(100%,680px);min-height:72px;margin:auto;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.terms-back-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 18px;border:0;border-radius:13px;background:linear-gradient(120deg,var(--tp),var(--tp2));color:#fff;font:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(15,76,129,.2)}
.terms-back-button:hover{filter:brightness(1.07)}
.terms-footer-note{display:flex;align-items:center;gap:5px;color:#52657d;font-size:10px;font-weight:700}
@media(max-width:480px){.terms-header-inner,.terms-main,.terms-footer-inner{padding-inline:13px}.terms-card{padding:14px 13px}.terms-footer-inner{justify-content:center}.terms-back-button{flex:1}.terms-footer-note{display:none}.terms-copy,.terms-bullets{font-size:11.5px}}
@media(prefers-reduced-motion:reduce){.terms-card{transition:none}}
`;
