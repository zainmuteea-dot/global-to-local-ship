import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Info, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن السوق الشامل — السوق الشامل" },
      {
        name: "description",
        content: "معلومات عن منصة السوق الشامل وطريقة استخدام خدمات الطلب والدفع والتسليم.",
      },
      { property: "og:title", content: "عن السوق الشامل — السوق الشامل" },
      {
        property: "og:description",
        content: "معلومات عن منصة السوق الشامل وخدماتها وطرق التواصل مع خدمة العملاء.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const sections = [
  {
    title: "كيف تستخدم المنصة؟",
    text: "تصفح المنتجات المتاحة أو أرسل تفاصيل ورابط المنتج عند تقديم الطلب. راجع وصف المنتج والكمية والسعر والمبلغ المطلوب قبل التأكيد، ثم تابع حالة الطلب ورقم التتبع عند توفره من صفحات الحساب.",
  },
  {
    title: "الأسعار والطلبات",
    text: "قد يختلف توفر المنتج وسعره لدى المتجر الخارجي. يعتمد المبلغ النهائي وأي رسوم على تفاصيل الطلب التي تراجعها الإدارة وتعرضها لك قبل اعتمادها. راجع صفحة الطلب والفاتورة أو إشعار الدفع لمعرفة المدفوع والمتبقي.",
  },
  {
    title: "خدمات الحساب",
    text: "يتيح الحساب الوصول إلى الطلبات والفواتير والعناوين والرصيد والإشعارات وخدمة العملاء. ظهور البيانات والخيارات يعتمد على تسجيل الدخول وحالة الطلب وتوفر الخدمة.",
  },
];

function AboutPage() {
  const navigate = useNavigate();
  const goBack = () => navigate({ to: "/my-account" });

  return (
    <main dir="rtl" lang="ar" className="min-h-dvh bg-gradient-to-b from-sky-50 via-slate-50 to-white text-slate-800">
      <header className="sticky top-0 z-10 border-b border-sky-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-[#0F4C81]">
              <Info className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-base font-black text-[#0F4C81]">عن السوق الشامل</h1>
          </div>
          <button
            type="button"
            onClick={goBack}
            aria-label="العودة إلى حسابي"
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5 pb-10">
        <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-black text-sky-700">AL SHAMEL</p>
          <h2 className="text-lg font-black text-[#0F4C81]">السوق الشامل</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            منصة تساعد العملاء في اليمن على تقديم طلبات لمنتجات من متاجر خارجية ومتابعة الطلب والدفع والتسليم من خلال حسابهم.
          </p>
        </section>

        {sections.map((section, index) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-sky-50 text-xs font-black text-[#0F4C81]">
                {index + 1}
              </span>
              <h2 className="text-sm font-black text-[#0F4C81]">{section.title}</h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">{section.text}</p>
          </section>
        ))}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-black text-[#0F4C81]">التواصل</h2>
          <p className="mb-3 text-sm leading-7 text-slate-600">
            للاستفسارات أو الإبلاغ عن مشكلة، أرسل رقم الطلب والتفاصيل ذات الصلة إلى خدمة العملاء:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="https://wa.me/967773370041"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Phone className="size-4" aria-hidden="true" />
              واتساب: +967 773 370 041
            </a>
            <a
              href="mailto:support@alshamel.ye"
              className="flex min-h-12 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              <Mail className="size-4" aria-hidden="true" />
              support@alshamel.ye
            </a>
          </div>
        </section>

        <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs leading-6 text-slate-500">
          معلومات التواصل والخدمات أعلاه بحسب ما هو مذكور في التطبيق. لم تُضف ساعات عمل أو عنوانًا تجاريًا أو ادعاء اعتماد رسمي لعدم توفر معلومات مؤكدة عنها.
        </p>

        <button
          type="button"
          onClick={goBack}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-black text-white transition hover:bg-[#0b3c67] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
        >
          <ArrowRight className="size-4" />
          العودة إلى حسابي
        </button>
      </div>
    </main>
  );
}
