import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

type Addr = { id: string; label: string; city: string; details: string; latitude: number | null; longitude: number | null };
const schema = z.object({
  label: z.string().trim().min(1).max(40),
  city: z.string().trim().min(2, "أدخل المدينة").max(60),
  details: z.string().trim().min(3, "أدخل تفاصيل العنوان").max(300),
});

function AddressesPage() {
  const { user } = useSession();
  const [list, setList] = useState<Addr[]>([]);
  const [step, setStep] = useState<null | "locate" | "form">(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ label: "المنزل", city: "", details: "" });
  const [err, setErr] = useState("");

  const load = async () => {
    const { data } = await supabase.from("addresses").select("id,label,city,details,latitude,longitude").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const locate = () => {
    if (!navigator.geolocation) return setStep("form");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setStep("form"); },
      () => setStep("form"),
      { timeout: 10000 },
    );
  };

  const save = async () => {
    const p = schema.safeParse(form);
    if (!p.success) return setErr(p.error.issues[0].message);
    if (!user) return;
    const { error } = await supabase.from("addresses").insert({
      user_id: user.id, label: p.data.label, city: p.data.city, details: p.data.details,
      latitude: coords?.lat ?? null, longitude: coords?.lng ?? null,
    });
    if (error) return setErr("تعذر الحفظ");
    setStep(null); setForm({ label: "المنزل", city: "", details: "" }); setCoords(null); setErr("");
    load();
  };

  const remove = async (id: string) => { await supabase.from("addresses").delete().eq("id", id); load(); };
  const field = "mt-1 w-full rounded-2xl bg-background px-4 py-3 text-sm text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa";

  return (
    <AccountShell title="إدارة العناوين">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-black text-cocoadeep">عناويني المحفوظة</p>
            <p className="text-[11px] text-muted-foreground">{list.length} عنوان مسجل</p>
          </div>
          <button onClick={() => setStep("locate")} className="flex items-center gap-1 rounded-xl bg-cocoa px-4 py-2.5 text-xs font-bold text-cream shadow">
            <Plus className="size-4" /> أضف عنوان
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {list.length === 0 ? (
            <EmptyState icon={<Map className="size-6" />} title="لا يوجد لديك أي عنوان" text="أضف عنوانك لنتمكن من توصيل شحناتك بكل سهولة وسرعة." />
          ) : list.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
              <MapPin className="mt-0.5 size-5 shrink-0 text-clay" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-cocoadeep">{a.label} · {a.city}</p>
                <p className="text-xs text-muted-foreground">{a.details}</p>
                {a.latitude && <a className="text-[11px] font-bold text-clay" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}>عرض على الخريطة</a>}
              </div>
              <button onClick={() => remove(a.id)} aria-label="حذف" className="text-destructive"><Trash2 className="size-4" /></button>
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
                  <button onClick={locate} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-cocoa py-3 text-sm font-bold text-cream"><Crosshair className="size-4" /> استخدام موقعي</button>
                  <button onClick={() => setStep("form")} className="flex items-center gap-1 rounded-2xl bg-background px-4 text-sm font-bold text-cocoa ring-1 ring-border"><X className="size-4" /> تخطي</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-display font-black text-cocoadeep">عنوان جديد</p>
                {coords && <p className="mt-1 text-[11px] font-bold text-clay">تم تحديد موقعك ✓</p>}
                <label className="mt-3 block text-xs font-bold text-cocoa">اسم العنوان</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={field} />
                <label className="mt-3 block text-xs font-bold text-cocoa">المدينة</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="صنعاء" className={field} />
                <label className="mt-3 block text-xs font-bold text-cocoa">التفاصيل</label>
                <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="الحي، الشارع، أقرب معلم" rows={3} className={field} />
                {err && <p className="mt-2 text-xs font-bold text-destructive">{err}</p>}
                <div className="mt-4 flex gap-2">
                  <button onClick={save} className="flex-1 rounded-2xl bg-cocoa py-3 text-sm font-bold text-cream">حفظ العنوان</button>
                  <button onClick={() => { setStep(null); setErr(""); }} className="rounded-2xl bg-background px-4 text-sm font-bold text-cocoa ring-1 ring-border">إلغاء</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountShell>
  );
}
