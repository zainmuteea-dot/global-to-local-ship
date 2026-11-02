import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Link2, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STORE_LINKS, normalizeStoreUrl } from "@/lib/store-links";

type Props = { slug: string; label: string };

/** Lets admin/staff set the store link that customers open from the store box. */
export function StoreLinkEditor({ slug, label }: Props) {
  const [url, setUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("store_links")
      .select("url")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage({ ok: false, text: "تعذر تحميل الرابط الحالي." });
        const current = data?.url ?? null;
        setSavedUrl(current);
        setUrl(current ?? DEFAULT_STORE_LINKS[slug] ?? "");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = normalizeStoreUrl(url);
    if (!clean) {
      setMessage({ ok: false, text: "أدخل رابطًا صحيحًا يبدأ بـ https://" });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("store_links")
      .upsert({ slug, url: clean }, { onConflict: "slug" });
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: "لم يتم الحفظ. تأكد أن حسابك مشرف أو موظف." });
      return;
    }
    setSavedUrl(clean);
    setUrl(clean);
    setMessage({ ok: true, text: "تم حفظ الرابط وسيظهر للعملاء فورًا." });
  };

  const shown = savedUrl ?? DEFAULT_STORE_LINKS[slug] ?? null;

  return (
    <section
      aria-label={`رابط ${label} للعملاء`}
      className="mb-6 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="size-5 text-orange-500" />
        <h2 className="font-black text-slate-900">رابط {label} الظاهر للعملاء</h2>
      </div>
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <input
          dir="ltr"
          type="url"
          inputMode="url"
          value={url}
          disabled={loading}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://ar.aliexpress.com/..."
          aria-label={`رابط ${label}`}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ الرابط
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {shown ? (
          <a
            href={shown}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="inline-flex items-center gap-1 break-all font-semibold text-blue-600 hover:underline"
          >
            <ExternalLink className="size-3.5" /> {shown}
          </a>
        ) : (
          <span className="text-slate-500">لا يوجد رابط بعد.</span>
        )}
        {!savedUrl && !loading && (
          <span className="text-slate-500">الرابط الافتراضي مستخدم حتى تحفظ رابطك.</span>
        )}
      </div>
      {message && (
        <p
          role="status"
          className={`mt-2 text-sm font-bold ${message.ok ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
