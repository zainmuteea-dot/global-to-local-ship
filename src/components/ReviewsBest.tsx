import { ClipboardCheck, Globe2, PackageCheck } from "lucide-react";

const highlights = [
  {
    title: "متاجر عالمية",
    description: "ابدأ من رابط المنتج في المتجر الذي ترغب بالتسوق منه.",
    Icon: Globe2,
    color: "text-sky-200 border-sky-300/30 bg-sky-400/10",
  },
  {
    title: "تفاصيل واضحة",
    description: "أرسل خيارات المنتج وملاحظاتك مع تفاصيل الطلب.",
    Icon: ClipboardCheck,
    color: "text-orange-200 border-orange-300/30 bg-orange-400/10",
  },
  {
    title: "متابعة الطلب",
    description: "ارجع إلى صفحة التتبع لمراجعة آخر حالة متاحة.",
    Icon: PackageCheck,
    color: "text-cyan-200 border-cyan-300/30 bg-cyan-400/10",
  },
];

export default function ReviewsBest() {
  return (
    <section
      className="mx-auto max-w-4xl px-4 pb-12 pt-2 sm:pb-16"
      aria-labelledby="reviews-best-title"
    >
      <div className="mb-6 text-center sm:mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1.5 text-[10px] font-black text-orange-100 sm:text-xs">
          <span className="size-1.5 rounded-full bg-orange-400" />
          خدمة متكاملة
        </span>
        <h2
          id="reviews-best-title"
          className="mt-3 text-xl font-black text-white sm:text-2xl"
        >
          تسوّق بثقة من البداية
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-sky-100/70 sm:text-sm">
          تعرّف على ما يمكنك فعله عبر السوق الشامل.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        {highlights.map(({ title, description, Icon, color }) => (
          <article
            key={title}
            className="rounded-2xl border border-cyan-300/70 bg-[#12366a]/90 p-4 text-center shadow-[0_0_14px_rgba(0,220,255,.15),0_0_24px_rgba(249,115,22,.10)] transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_22px_rgba(0,220,255,.28),0_0_30px_rgba(249,115,22,.18)] sm:p-5"
          >
            <span className={`mx-auto mb-3 grid size-10 place-items-center rounded-xl border ${color}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-xs font-black text-white sm:text-sm">{title}</h3>
            <p className="mt-2 text-[10px] leading-5 text-sky-100/75 sm:text-[11px]">
              {description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
