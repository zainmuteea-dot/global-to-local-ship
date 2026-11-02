import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

type PreviewItem = { url: string; title: string; price: number; currency: string };

export const Route = createFileRoute("/admin/shein-sync")({ component: SheinSyncPage });

function SheinSyncPage() {
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function previewProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = url.trim();
    setError("");
    setMessage("");
    if (!/^https?:\/\/(www\.)?shein\.com\//i.test(target)) {
      setError("أدخل رابط منتج عام من SHEIN يبدأ بـ https://www.shein.com/");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/shein-price?url=${encodeURIComponent(target)}&currency=USD`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error === "notfound" ? "تعذر قراءة السعر من هذا الرابط." : "تعذر معاينة المنتج.");
      setItems((current) => [
        ...current.filter((item) => item.url !== target),
        { url: target, title: data.title || "منتج SHEIN", price: Number(data.price), currency: data.currency || "USD" },
      ]);
      setMessage("تمت المعاينة فقط. لم يتم إرسال أي بيانات إلى SHEIN.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر معاينة المنتج.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold text-blue-700">مزامنة آمنة</p>
            <h1 className="text-2xl font-black">استيراد منتجات SHEIN</h1>
            <p className="mt-2 text-sm text-slate-500">عاين منتجات عامة من روابط SHEIN قبل اعتماد ربط OpenAPI.</p>
          </div>
          <Link to="/admin/logos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50">
            <ArrowRight className="size-4" /> العودة للمواقع
          </Link>
        </header>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-black">وضع المعاينة فقط</h2>
              <p className="mt-1 text-sm leading-6">لا يوجد تطبيق SHEIN OpenAPI معتمد حاليًا؛ لذلك لا ننشر أو نعدّل منتجات في SHEIN، ولا نحفظ مفاتيح داخل المتصفح.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={previewProduct} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="shein-url">رابط منتج SHEIN</label>
            <input id="shein-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="الصق رابط منتج SHEIN هنا" className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none ring-blue-500 focus:ring-2" dir="ltr" />
            <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
              <Search className="size-4" /> {loading ? "جارٍ الفحص..." : "معاينة المنتج"}
            </button>
          </form>
          {message && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black">المنتجات التي تمت معاينتها ({items.length})</h2>
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">ألصق رابطًا لعرض المنتج هنا قبل اعتماده.</div>
          ) : items.map((item) => (
            <article key={item.url} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black">{item.title}</h3>
                <p className="mt-1 font-bold text-blue-700">{item.price.toFixed(2)} {item.currency}</p>
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700"><ExternalLink className="size-3" /> فتح الرابط الأصلي</a>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">معاينة فقط</span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
