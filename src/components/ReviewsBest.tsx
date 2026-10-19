import { Globe2, MessageCircle, SearchCheck } from "lucide-react";

const highlights = [
  {
    title: "متاجر عالمية",
    description: "ابدأ من رابط المنتج في المتجر الذي ترغب بالتسوق منه.",
    Icon: Globe2,
    tone: "text-sky-300 bg-sky-400/10 border-sky-300/20",
  },
  {
    title: "تفاصيل طلبك",
    description: "أرسل الرابط والخيارات المطلوبة لتكون تفاصيل الطلب أوضح.",
    Icon: SearchCheck,
    tone: "text-orange-300 bg-orange-400/10 border-orange-300/20",
  },
  {
    title: "متابعة الشحنة",
    description: "ارجع إلى صفحة التتبع لمراجعة حالة الشحنة عند تحديثها.",
    Icon: MessageCircle,
    tone: "text-cyan-300 bg-cyan-400/10 border-cyan-300/20",
  },
];

export default function ReviewsBest() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-14 pt-3 sm:pb-20" aria-labelledby="reviews-best-title">
      <div className="mb-7 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/15 bg-orange-300/5 px-3 py-1.5 text-[10px] font-black text-orange-200 sm:text-xs">
          تسوّق من مكانك
        </span>
        <h2 id="reviews-best-title" className="mt-3 text-xl font-black text-white sm:text-3xl">
          تجربة تسوّق أوضح من البداية
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-sky-100/70 sm:text-sm">
          تعرّف على خطوات الخدمة الأساسية قبل إرسال طلبك.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {highlights.map(({ title, description, Icon, tone }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#102b55]/75 p-5 text-center shadow-[0_12px_35px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/35 hover:shadow-[0_12px_38px_rgba(0,180,255,0.12)]"
          >
            <div className={`mx-auto mb-3 grid size-11 place-items-center rounded-xl border ${tone}`}>
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-black text-white">{title}</h3>
            <p className="mt-2 text-[11px] leading-5 text-sky-100/75">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
