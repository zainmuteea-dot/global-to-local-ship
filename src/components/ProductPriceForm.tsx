// src/components/ProductPriceForm.tsx
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "invalid" | "detected" | "loading" | "success" | "notfound" | "error";

const CURRENCIES = [
  { code: "SAR", label: "ر.س سعودي" },
  { code: "AED", label: "د.إ إماراتي" },
  { code: "USD", label: "$ دولار" },
  { code: "YER", label: "ر.ي يمني" },
] as const;

const SHEIN_RE = /^https?:\/\/([a-z0-9-]+\.)?shein\.com\/[^\s]+/i;
const FETCH_TIMEOUT_MS = 15000;
const DEBOUNCE_MS = 700;

interface Props {
  url: string; setUrl: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
}

async function requestPrice(url: string, currency: string, signal: AbortSignal) {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT_MS)
  );
  const call = (async () => {
    const res = await fetch(
      `/api/shein-price?url=${encodeURIComponent(url)}&currency=${currency}`,
      { signal, headers: { Accept: "application/json" } }
    );
    let data: any = {};
    try { data = await res.json(); } catch { throw new Error("bad-json"); }
    if (!res.ok) throw new Error(res.status === 429? "rate-limit" : data?.error || "server");
    if (data?.price == null || Number.isNaN(Number(data.price))) throw new Error("notfound");
    return {
      price: Number(data.price),
      currency: String(data.currency || currency),
      title: data.title as string | undefined,
    };
  })();
  return Promise.race([call, timeout]);
}

export default function ProductPriceForm({ url, setUrl, title, setTitle, price, setPrice, currency, setCurrency }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [reason, setReason] = useState<string>();
  const [priceAuto, setPriceAuto] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFetch = useCallback(async (targetUrl: string, cur: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    setReason(undefined);
    try {
      const r = await requestPrice(targetUrl, cur, ctrl.signal);
      setPrice(String(r.price));
      setPriceAuto(true);
      if (r.title) setTitle(r.title);
      setCurrency(r.currency);
      setStatus("success");
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      const code = e?.message as string;
      if (code === "notfound") { setStatus("notfound"); return; }
      setReason(code);
      setStatus("error");
    }
  }, [setPrice, setTitle, setCurrency]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = url.trim();
    if (!t) { setStatus("idle"); return; }
    if (!SHEIN_RE.test(t)) { setStatus("invalid"); return; }
    setStatus("detected");
    debounceRef.current = setTimeout(() => runFetch(t, currency), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const retry = () => { if (SHEIN_RE.test(url.trim())) runFetch(url.trim(), currency); };
  const clearUrl = () => { abortRef.current?.abort(); setUrl(""); setStatus("idle"); setPriceAuto(false); };

  const msg: Record<Status, string> = {
    idle: "",
    invalid: "الرابط غير صالح — الصق رابط منتج من SHEIN",
    detected: "تم التعرف على SHEIN ✓",
    loading: "جارٍ جلب السعر...",
    success: "تم جلب السعر تلقائياً ✓",
    notfound: "تعذّر إيجاد السعر تلقائياً — أدخله يدوياً",
    error: reason === "timeout"? "انتهت المهلة — حاول مجدداً أو أدخل السعر يدوياً"
      : reason === "rate-limit"? "طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة"
      : "تعذّر الاتصال بالخادم — حاول مجدداً",
  };

  const tone: Record<Status, string> = {
    idle: "#8a8378", invalid: "#d9534f", detected: "#2e9e5b", loading: "#e8873b",
    success: "#2e9e5b", notfound: "#c17d15", error: "#d9534f",
  };

  return (
    <div dir="rtl" className="space-y-3">
      <div>
        <label className="text-[12px] font-bold block mb-1">رابط المنتج</label>
        <div className="relative">
          <input
            type="url" inputMode="url" dir="ltr"
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ar.shein.com/..."
            className={`w-full bg-[#F9F5EB] border rounded-xl px-4 py-3 text-[12px] font-mono text-left outline-none focus:ring-2 focus:ring-[#8B5E34] ${status === "invalid"? "border-red-400 bg-red-50" : "border-gray-200"}`}
          />
          {url && (
            <button type="button" onClick={clearUrl} aria-label="مسح"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">✕</button>
          )}
        </div>
      </div>

      {status!== "idle" && (
        <div className="flex items-center gap-2 text-[12px] font-bold px-3 py-2 rounded-xl border"
          style={{ color: tone[status], backgroundColor: tone[status] + "14", borderColor: tone[status] + "40" }}>
          {status === "loading"? <span className="animate-spin">⏳</span> : <span>{status === "success" || status === "detected"? "✓" : status === "notfound"? "⚠" : "✕"}</span>}
          <span>{msg[status]}</span>
          {(status === "error" || status === "notfound") && (
            <button type="button" onClick={retry} className="mr-auto underline text-[11px]">↻ إعادة المحاولة</button>
          )}
        </div>
      )}

      <div>
        <label className="text-[12px] font-bold block mb-1">نوع المنتج / الوصف (يمكنك تعديله)</label>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: Casual Short Sleeve T-Shirt..."
          className="w-full bg-[#FDF8EE] border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#8B5E34]"
        />
      </div>

      <div>
        <label className="text-[12px] font-bold block mb-1">
          سعر السلعة في المتجر الأصلي{" "}
          {priceAuto && status === "success" && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">تلقائي</span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="number" min={0} step="0.01" dir="ltr"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setPriceAuto(false); }}
            placeholder={status === "loading"? "جارٍ الجلب..." : "سيظهر تلقائياً أو أدخله يدوياً"}
            className="flex-1 bg-[#FDF8EE] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-left font-bold outline-none focus:ring-2 focus:ring-[#8B5E34]"
          />
          <select
            value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="bg-[#FDF8EE] border border-gray-200 rounded-xl px-3 py-3 text-[12px] font-bold outline-none"
          >
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        {status === "loading" && (
          <div className="h-1.5 rounded-full mt-3 bg-gradient-to-l from-amber-200 via-amber-100 to-amber-200 animate-pulse" />
        )}
      </div>
    </div>
  );
}
