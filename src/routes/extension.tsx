import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Puzzle, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "إضافة المتصفح «أضف للسوق الشامل» | AL SHAMEL SHOPPING" },
      {
        name: "description",
        content: "إضافة Chrome تضع زر «أضف للسوق الشامل» داخل صفحات منتجات SHEIN وNoon وAmazon لإضافة المنتج لسلتك بضغطة.",
      },
      { property: "og:title", content: "إضافة «أضف للسوق الشامل» لمتصفح Chrome" },
      {
        property: "og:description",
        content: "أضف منتجات SHEIN وNoon وAmazon إلى سلة السوق الشامل مباشرة من صفحة المنتج.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExtensionPage,
});

const ZIP_NAME = "alshamel-extension.zip";

const STEPS = [
  "حمّل الملف المضغوط وفك الضغط عنه في مجلد.",
  "افتح الرابط chrome://extensions في متصفح Chrome (أو Edge / Brave).",
  "فعّل «وضع المطوّر» (Developer mode) من أعلى الصفحة.",
  "اضغط «تحميل إضافة غير مضغوطة» (Load unpacked) واختر المجلد.",
  "افتح أي منتج على SHEIN أو Noon أو Amazon، وستجد زر «أضف للسوق الشامل» أسفل الصفحة.",
];

function ExtensionPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/${ZIP_NAME}`);
      if (!res.ok) throw new Error(`تعذر التحميل (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ZIP_NAME;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحميل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Puzzle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">إضافة «أضف للسوق الشامل»</h1>
              <p className="text-sm opacity-80">لمتصفح Chrome — تعمل على SHEIN وNoon وAmazon</p>
            </div>
          </div>
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-black text-secondary-foreground shadow disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {busy ? "جاري التحميل..." : "تحميل الإضافة"}
          </button>
          {error && <p className="mt-2 text-sm font-bold">{error}</p>}
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-black">طريقة التثبيت</h2>
          <ol className="space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">
          <h2 className="mb-2 text-base font-black">كيف تعمل؟</h2>
          <p className="text-muted-foreground">
            عند الضغط على الزر تقرأ الإضافة اسم المنتج وصورته وسعره ورابطه، وتفتح سلتك في السوق الشامل
            وتضيفه تلقائيًا. من السلة تضغط «اطلب هذا المنتج» فيُعبأ نموذج الطلب بالرابط والسعر.
          </p>
          <p className="mt-2 text-muted-foreground">
            الأسعار بالدولار أو الريال السعودي تُنقل كما هي؛ العملات الأخرى (مثل الدرهم) تُترك ليُحدد السعر عند الطلب.
          </p>
          <Link
            to="/cart"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <ShoppingCart className="h-4 w-4" /> فتح سلتي
          </Link>
        </section>
      </div>
    </main>
  );
}
