import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ExternalLink, Save, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

const STORES = [
  { id: "shein", name: "SHEIN", defaultUrl: "https://www.shein.com" },
  { id: "noon", name: "Noon", defaultUrl: "https://www.noon.com" },
  { id: "temu", name: "TEMU", defaultUrl: "https://www.temu.com" },
  { id: "aliexpress", name: "AliExpress", defaultUrl: "https://www.aliexpress.com" },
  { id: "amazon", name: "Amazon", defaultUrl: "https://www.amazon.com" },
  { id: "ebay", name: "eBay", defaultUrl: "https://www.ebay.com" },
  { id: "discounts", name: "تخفيضات حتى 70%", defaultUrl: "#discounts" },
  { id: "exclusive", name: "عروضات حصرية", defaultUrl: "#exclusive" },
] as const;

const defaultVisibility = Object.fromEntries(STORES.map((store) => [store.id, true]));
const defaultLinks = Object.fromEntries(STORES.map((store) => [store.id, store.defaultUrl]));

function readObject(key: string, fallback: Record<string, boolean | string>) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? { ...fallback, ...value } : fallback;
  } catch {
    return fallback;
  }
}

function StoreManagementPage() {
  const [links, setLinks] = useState<Record<string, string>>(defaultLinks);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(defaultVisibility);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLinks(readObject("store_links", defaultLinks) as Record<string, string>);
    setVisibility(readObject("store_visibility", defaultVisibility) as Record<string, boolean>);
  }, []);

  function saveChanges() {
    localStorage.setItem("store_links", JSON.stringify(links));
    localStorage.setItem("store_visibility", JSON.stringify(visibility));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  }

  return (
    <AdminRouteGuard>
      <main dir="rtl" className="min-h-screen bg-[#f8f3ec] px-4 py-8 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex flex-col gap-5 rounded-3xl border border-[#d7b56d]/60 bg-[#fffdf9] p-6 shadow-[0_16px_50px_rgba(106,76,28,0.09)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-black tracking-[0.18em] text-[#a4772c]">لوحة التحكم</p>
              <h1 className="text-2xl font-black sm:text-3xl">إدارة المتاجر الدولية - تحكم بالروابط</h1>
              <p className="mt-2 text-sm text-slate-500">تحكم بما يظهر للعملاء وروابط البوابات الخارجية.</p>
            </div>
            <Link to="/products" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d7b56d] px-4 py-2.5 text-sm font-bold hover:bg-[#fff7e8]"><ArrowRight className="size-4" /> صفحة العملاء</Link>
          </header>

          <section className="overflow-hidden rounded-3xl border border-[#d7b56d]/60 bg-[#fffdf9] shadow-[0_16px_50px_rgba(106,76,28,0.09)]">
            <div className="hidden grid-cols-[1.1fr_2fr_110px_90px] gap-4 border-b border-[#eadcc7] bg-[#fff7e8] px-5 py-4 text-xs font-black text-[#80602d] sm:grid"><span>المتجر</span><span>الرابط الخارجي</span><span>الظهور</span><span>الحالة</span></div>
            <div className="divide-y divide-[#eadcc7]">
              {STORES.map((store) => (
                <div key={store.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[1.1fr_2fr_110px_90px] sm:items-center">
                  <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#161616] text-white"><Store className="size-5" /></span><span className="font-black">{store.name}</span></div>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-500 sm:sr-only">الرابط الخارجي</span><input value={links[store.id] || ""} onChange={(event) => setLinks((current) => ({ ...current, [store.id]: event.target.value }))} dir="ltr" className="w-full rounded-xl border border-[#dfd1bb] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b58b42] focus:ring-2 focus:ring-[#d7b56d]/30" /></label>
                  <button type="button" role="switch" aria-checked={Boolean(visibility[store.id])} onClick={() => setVisibility((current) => ({ ...current, [store.id]: !current[store.id] }))} className={`relative h-7 w-12 rounded-full transition ${visibility[store.id] ? "bg-[#b58b42]" : "bg-slate-300"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${visibility[store.id] ? "right-1" : "right-6"}`} /></button>
                  <span className={`text-sm font-black ${visibility[store.id] ? "text-emerald-700" : "text-slate-400"}`}>{visibility[store.id] ? "ظاهر" : "مخفي"}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row"><p className="text-xs text-slate-500">تُحفظ الإعدادات في هذا المتصفح باستخدام <code>store_links</code> و<code>store_visibility</code>.</p><button type="button" onClick={saveChanges} className="inline-flex items-center gap-2 rounded-xl bg-[#161616] px-6 py-3 font-black text-white shadow-lg transition hover:bg-[#2c2419]"><Save className="size-4" /> حفظ جميع التغييرات</button></div>
          {saved && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-bold text-emerald-800 shadow-xl"><Check className="mr-2 inline-block size-4" /> تم الحفظ بنجاح</div>}
        </div>
      </main>
    </AdminRouteGuard>
  );
}

export const Route = createFileRoute("/products/manage")({ component: StoreManagementPage });
