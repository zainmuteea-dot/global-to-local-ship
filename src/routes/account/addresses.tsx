import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, Crosshair, Home, Map, MapPin, Plus, Trash2, X } from "lucide-react";
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

type AddressWriteError = {
  code?: string;
  message?: string;
};

function getAddressWriteErrorMessage(error: unknown): string {
  const dbError = (error ?? {}) as AddressWriteError;
  const code = dbError.code ?? "";
  const detail = typeof dbError.message === "string" ? dbError.message.trim().slice(0, 180) : "";
  const diagnostic = [code ? `رمز ${code}` : "", detail ? `تفاصيل الخادم: ${detail}` : ""]
    .filter(Boolean)
    .join(" · ");
  const withDiagnostic = (message: string) =>
    diagnostic ? `${message} (${diagnostic})` : message;

  if (code === "42501") {
    return withDiagnostic("رفضت قاعدة البيانات حفظ العنوان بسبب الصلاحيات. تأكد من تسجيل الدخول؛ إذا استمر الخطأ أرسل هذه التفاصيل للدعم.");
  }
  if (code === "23502") {
    return withDiagnostic("هناك حقل مطلوب لم يُرسل إلى قاعدة البيانات. أرسل هذه التفاصيل للدعم.");
  }
  if (code === "23503") {
    return withDiagnostic("تعذر ربط العنوان بحسابك الحالي. حدّث الصفحة وسجّل الدخول مجددًا، ثم أعد المحاولة.");
  }
  if (code === "42P01" || code === "42703" || code.startsWith("PGRST")) {
    return withDiagnostic("يوجد اختلاف في إعداد جدول العناوين على الخادم. أرسل هذه التفاصيل للدعم.");
  }
  if (error instanceof TypeError || /fetch|network|connection|internet|timeout/i.test(dbError.message ?? "")) {
    return withDiagnostic("تعذر الاتصال بالخادم لحفظ العنوان. تحقق من الإنترنت ثم أعد المحاولة.");
  }
  return withDiagnostic("تعذر حفظ العنوان. تحقق من اتصالك وتسجيل الدخول، ثم أعد المحاولة.");
}

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
      setErr(getAddressWriteErrorMessage(error));
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

  const rawName = user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"];
  const displayName =
    (typeof rawName === "string" && rawName.trim()) || user?.email?.split("@")[0] || "ضيف";
  const countText = list.length === 1 ? "عنوان واحد مسجل" : `${list.length} عناوين مسجلة`;
  const field =
    "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

  return (
    <AccountShell title="إدارة العناوين">
      <div className="space-y-3 pb-8">
        <section className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-l from-[#0F4C81] to-[#287FC4] px-4 py-4 text-white shadow-lg shadow-sky-900/15">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20 text-lg font-black">
            {displayName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-black">أهلاً بك يا {displayName} 👋</h2>
            <p className="mt-0.5 text-xs font-medium text-white/85">إدارة عناوينك لتوصيل أسرع وأسهل</p>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-[#0F4C81]">
              <MapPin className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">العناوين المحفوظة</h3>
              <p className="text-[11px] text-slate-500">
                {sessionLoading || loading ? "جارٍ التحميل…" : countText}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!user || busy}
            onClick={() => {
              setErr("");
              setStep("locate");
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#287FC4] px-3.5 py-2 text-xs font-extrabold text-white shadow-md shadow-sky-900/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" /> أضف عنوان جديد
          </button>
        </section>

        {!sessionLoading && !user && (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
            سجّل الدخول لعرض عناوينك وإدارتها.
          </p>
        )}
        {pageError && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
            <p>{pageError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 font-bold underline">
              إعادة المحاولة
            </button>
          </div>
        )}

        {sessionLoading || loading ? (
          <div role="status" className="rounded-2xl border border-slate-100 bg-white py-10 text-center text-sm text-slate-500 shadow-sm">
            جارٍ تحميل العناوين…
          </div>
        ) : list.length === 0 && user && !pageError ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <EmptyState
              icon={<Map className="size-6" />}
              title="لا يوجد لديك أي عنوان"
              text="أضف عنوانك لنتمكن من توصيل شحناتك بكل سهولة وسرعة."
            />
          </div>
        ) : (
          <section className="space-y-3" aria-label="قائمة العناوين">
            {list.map((address) => {
              const isWork = /عمل|work|متجر|محل|شركة/i.test(address.label);
              const AddressIcon = isWork ? BriefcaseBusiness : Home;
              return (
                <article
                  key={address.id}
                  className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#287FC4] text-white shadow-md shadow-sky-900/15">
                      <AddressIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-black text-slate-900">{address.label}</h3>
                      <p className="mt-0.5 break-words text-xs font-semibold text-slate-500">{address.city}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(address)}
                      aria-label={`حذف العنوان ${address.label}`}
                      className="grid size-9 shrink-0 place-items-center rounded-xl border border-red-100 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400">تفاصيل العنوان</p>
                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-700">{address.details}</p>
                    {address.latitude != null && address.longitude != null && (
                      <a
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://maps.google.com/?q=${address.latitude},${address.longitude}`}
                      >
                        <MapPin className="size-3.5" /> عرض على الخريطة
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
        <p className="px-2 pt-1 text-center text-[11px] font-medium leading-5 text-slate-500">
          يمكنك حفظ عدة عناوين واختيار العنوان المناسب عند الحاجة.
        </p>
      </div>

      {step && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div dir="rtl" className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl">
            {step === "locate" ? (
              <div className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-sky-50 text-[#0F4C81]">
                  <MapPin className="size-7" />
                </span>
                <p className="mt-4 text-sm font-bold leading-7 text-slate-800">
                  لضمان وصول الطلب إلى المكان الصحيح، اسمح للمتصفح باستخدام موقعك الحالي.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={locate}
                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#0F4C81] px-3 text-sm font-bold text-white"
                  >
                    <Crosshair className="size-4" /> استخدام موقعي
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="flex min-h-11 items-center gap-1 rounded-2xl bg-slate-50 px-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    <X className="size-4" /> تخطي
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">عنوان جديد</h2>
                    {coords && <p className="mt-1 text-[11px] font-bold text-emerald-700">تم تحديد موقعك ✓</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="إغلاق"
                    onClick={() => { setStep(null); setErr(""); }}
                    className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <label className="mt-4 block text-xs font-bold text-slate-700">اسم العنوان</label>
                <input
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  className={field}
                />
                <label className="mt-3 block text-xs font-bold text-slate-700">المدينة</label>
                <input
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                  placeholder="صنعاء"
                  className={field}
                />
                <label className="mt-3 block text-xs font-bold text-slate-700">التفاصيل</label>
                <textarea
                  value={form.details}
                  onChange={(event) => setForm({ ...form, details: event.target.value })}
                  placeholder="الحي، الشارع، أقرب معلم"
                  rows={3}
                  className={field}
                />
                {err && <p role="alert" className="mt-2 break-words text-xs font-bold leading-5 text-red-700">{err}</p>}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={busy}
                    className="min-h-11 flex-1 rounded-2xl bg-[#0F4C81] px-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "جارٍ الحفظ…" : "حفظ العنوان"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep(null); setErr(""); }}
                    className="min-h-11 rounded-2xl bg-slate-50 px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountShell>
  );
}
