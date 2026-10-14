import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Crosshair, Map, MapPin, Plus, Trash2, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/addresses")({
  head: () => ({
    meta: [
      { title: "إدارة العناوين — السوق الشامل" },
      { name: "description", content: "أضف عناوين التوصيل الخاصة بك في السوق الشامل." },
      { property: "og:title", content: "إدارة العناوين — السوق الشامل" },
      { property: "og:description", content: "أضف عناوين التوصيل الخاصة بك في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddressesPage,
});

type Addr = {
  id: string;
  label: string;
  city: string;
  details: string;
  latitude: number | null;
  longitude: number | null;
};

const schema = z.object({
  label: z.string().trim().min(1, "أدخل اسم العنوان").max(40),
  city: z.string().trim().min(2, "أدخل المدينة").max(60),
  details: z.string().trim().min(3, "أدخل تفاصيل العنوان").max(300),
});

function AddressesPage() {
  const { user, loading: sessionLoading } = useSession();
  const [list, setList] = useState<Addr[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const [step, setStep] = useState<null | "locate" | "form">(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ label: "المنزل", city: "", details: "" });
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("id,label,city,details,latitude,longitude")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setList((data ?? []) as Addr[]);
    } catch (error) {
      console.error("Failed to load addresses:", error);
      setPageError("تعذر تحميل عناوينك. تحقق من اتصالك أو صلاحيات الحساب ثم أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionLoading) void load();
  }, [sessionLoading, load]);

  const locate = () => {
    if (!navigator.geolocation) {
      setStep("form");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStep("form");
      },
      () => setStep("form"),
      { timeout: 10000 },
    );
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "تحقق من البيانات");
      return;
    }
    if (!user) {
      setErr("سجّل الدخول أولًا لحفظ عنوانك.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase.from("addresses").insert({
        user_id: user.id,
        label: parsed.data.label,
        city: parsed.data.city,
        details: parsed.data.details,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      if (error) throw error;

      setStep(null);
      setForm({ label: "المنزل", city: "", details: "" });
      setCoords(null);
      await load();
    } catch (error) {
      console.error("Failed to save address:", error);
      setErr("تعذر حفظ العنوان. تأكد من تسجيل الدخول وصلاحيات العناوين.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (address: Addr) => {
    if (!user) return;
    const confirmed = window.confirm(`هل تريد حذف العنوان «${address.label}»؟`);
    if (!confirmed) return;

    setBusy(true);
    setPageError("");
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", address.id)
        .eq("user_id", user.id);
      if (error) throw error;
      await load();
    } catch (error) {
      console.error("Failed to delete address:", error);
      setPageError("تعذر حذف العنوان. تحقق من صلاحيات الحساب ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 w-full rounded-2xl bg-background px-4 py-3 text-sm text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa";

  return (
    <AccountShell title="إدارة العناوين">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display font-black text-cocoadeep">عناويني المحفوظة</p>
            <p className="text-[11px] text-muted-foreground">{list.length} عنوان مسجل</p>
          </div>
          <button
            type="button"
            disabled={!user || busy}
            onClick={() => { setErr(""); setStep("locate"); }}
            className="flex items-center gap-1 rounded-xl bg-cocoa px-4 py-2.5 text-xs font-bold text-cream shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" /> أضف عنوان
          </button>
        </div>

        {!sessionLoading && !user && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            سجّل الدخول لعرض عناوينك وإدارتها.
          </p>
        )}
        {pageError && (
          <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <p>{pageError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 font-bold underline">
              إعادة المحاولة
            </button>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {sessionLoading || loading ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">جارٍ تحميل العناوين…</p>
          ) : list.length === 0 && user && !pageError ? (
            <EmptyState icon={<Map className="size-6" />} title="لا يوجد لديك أي عنوان" text="أضف عنوانك لنتمكن من توصيل شحناتك بكل سهولة وسرعة." />
          ) : list.map((address) => (
            <div key={address.id} className="flex items-start gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
              <MapPin className="mt-0.5 size-5 shrink-0 text-clay" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-cocoadeep">{address.label} · {address.city}</p>
                <p className="text-xs text-muted-foreground">{address.details}</p>
                {address.latitude != null && address.longitude != null && (
                  <a className="text-[11px] font-bold text-clay" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${address.latitude},${address.longitude}`}>
                    عرض على الخريطة
                  </a>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(address)}
                aria-label={`حذف العنوان ${address.label}`}
                className="text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {step && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cocoadeep/50 p-4 backdrop-blur-sm">
          <div dir="rtl" className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
            {step === "locate" ? (
              <div className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cocoa text-cream"><MapPin className="size-7" /></span>
                <p className="mt-4 text-sm font-bold leading-7 text-cocoadeep">لضمان وصول الطلب إلى المكان الصحيح، اسمح للمتصفح باستخدام موقعك الحالي.</p>
                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={locate} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-cocoa py-3 text-sm font-bold text-cream"><Crosshair className="size-4" /> استخدام موقعي</button>
                  <button type="button" onClick={() => setStep("form")} className="flex items-center gap-1 rounded-2xl bg-background px-4 text-sm font-bold text-cocoa ring-1 ring-border"><X className="size-4" /> تخطي</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-display font-black text-cocoadeep">عنوان جديد</p>
                {coords && <p className="mt-1 text-[11px] font-bold text-clay">تم تحديد موقعك ✓</p>}
                <label className="mt-3 block text-xs font-bold text-cocoa">اسم العنوان</label>
                <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} className={field} />
                <label className="mt-3 block text-xs font-bold text-cocoa">المدينة</label>
                <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="صنعاء" className={field} />
                <label className="mt-3 block text-xs font-bold text-cocoa">التفاصيل</label>
                <textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="الحي، الشارع، أقرب معلم" rows={3} className={field} />
                {err && <p role="alert" className="mt-2 text-xs font-bold text-destructive">{err}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => void save()} disabled={busy} className="flex-1 rounded-2xl bg-cocoa py-3 text-sm font-bold text-cream disabled:opacity-50">{busy ? "جارٍ الحفظ…" : "حفظ العنوان"}</button>
                  <button type="button" onClick={() => { setStep(null); setErr(""); }} className="rounded-2xl bg-background px-4 text-sm font-bold text-cocoa ring-1 ring-border">إلغاء</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountShell>
  );
}
