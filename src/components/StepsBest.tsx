import {
  ArrowLeft,
  ClipboardList,
  Link2,
  PackageCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "اختر المتجر",
    description: "تصفّح متجرك العالمي المفضّل واختر المنتج الذي تريده.",
    Icon: ShoppingBag,
  },
  {
    number: "02",
    title: "انسخ الرابط",
    description: "انسخ رابط المنتج والصقه في نموذج الطلب.",
    Icon: Link2,
  },
  {
    number: "03",
    title: "أرسل التفاصيل",
    description: "أضف الكمية والمقاس واللون وأي ملاحظات مهمة.",
    Icon: ClipboardList,
  },
  {
    number: "04",
    title: "راجع الطلب",
    description: "تأكد من تفاصيل المنتج قبل متابعة طلبك.",
    Icon: PackageCheck,
  },
  {
    number: "05",
    title: "تابع الشحنة",
    description: "استخدم صفحة التتبع لمراجعة آخر حالة متاحة.",
    Icon: Truck,
  },
];

export default function StepsBest() {
  return (
    <section
      className="mx-auto max-w-4xl px-4 py-10 sm:py-14"
      aria-labelledby="steps-best-title"
    >
      <div className="mb-6 text-center sm:mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-black text-sky-100 sm:text-xs">
          <span className="size-1.5 rounded-full bg-orange-400" />
          خطوات بسيطة وواضحة
        </span>
        <h2
          id="steps-best-title"
          className="mt-3 text-xl font-black text-white sm:text-2xl"
        >
          كيف تطلب من المتاجر العالمية؟
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-sky-100/70 sm:text-sm">
          خمس خطوات تساعدك على إرسال تفاصيل الطلب ومتابعته.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {steps.map(({ number, title, description, Icon }, index) => (
          <li
            key={number}
            className={`group relative flex min-h-[92px] items-center gap-3 rounded-xl border border-cyan-300/70 bg-[#12366a]/90 p-3 text-right shadow-[0_0_12px_rgba(0,220,255,.16),0_0_22px_rgba(249,115,22,.10)] transition duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_0_20px_rgba(0,220,255,.3),0_0_28px_rgba(249,115,22,.2)] sm:p-4 ${
              index === steps.length - 1 ? "sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.5rem)]" : ""
            }`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-orange-300/35 bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,.35)] sm:size-11">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white sm:text-sm">{title}</span>
                <span className="font-mono text-[10px] font-black tracking-widest text-sky-200/70">{number}</span>
              </span>
              <span className="mt-1 block text-[10px] leading-5 text-sky-100/75 sm:text-[11px]">
                {description}
              </span>
            </span>
            {index < steps.length - 1 && (
              <ArrowLeft
                className="hidden size-3.5 shrink-0 text-sky-300/50 sm:block"
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
