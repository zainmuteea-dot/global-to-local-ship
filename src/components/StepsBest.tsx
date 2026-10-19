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
    description: "تصفّح متجرك العالمي المفضّل واختر المنتج.",
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
    title: "راجع حالة الطلب",
    description: "استخدم حسابك وصفحة التتبع لمراجعة التحديثات.",
    Icon: PackageCheck,
  },
  {
    number: "05",
    title: "تابع الشحنة",
    description: "تحقق من حالة الشحنة عبر صفحة التتبع عند توفرها.",
    Icon: Truck,
  },
];

export default function StepsBest() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16" aria-labelledby="steps-best-title">
      <div className="mb-7 text-center sm:mb-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/15 bg-white/5 px-3 py-1.5 text-[10px] font-black text-sky-200 sm:text-xs">
          <span className="size-1.5 rounded-full bg-orange-400" />
          خطوات بسيطة وواضحة
        </span>
        <h2 id="steps-best-title" className="mt-3 text-xl font-black text-white sm:text-3xl">
          كيف تطلب من المتاجر العالمية؟
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-sky-100/70 sm:text-sm">
          ابدأ برابط المنتج، ثم تابع تفاصيل طلبك وشحنتك من صفحات الخدمة.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map(({ number, title, description, Icon }, index) => (
          <li
            key={number}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-right shadow-lg shadow-black/10 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-white/[0.085]"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-orange-300/20 bg-orange-500/10 text-orange-300 transition group-hover:bg-orange-500/20">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs font-black tracking-widest text-sky-200/55">{number}</span>
            </div>
            <h3 className="text-sm font-black text-white">{title}</h3>
            <p className="mt-2 text-[11px] leading-5 text-sky-100/70">{description}</p>
            {index < steps.length - 1 && (
              <ArrowLeft className="absolute left-3 top-1/2 hidden size-4 -translate-y-1/2 text-sky-300/30 lg:block" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
