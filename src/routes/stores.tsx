import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

const db = supabase as any;

type StoreRow = {
  id: string;
  name: string;
  location: string | null;
  created_at: string | null;
};

function StoresRoute() {
  return (
    <AdminRouteGuard>
      <StoresPage />
    </AdminRouteGuard>
  );
}

export const Route = createFileRoute("/stores")({ component: StoresRoute });

function StoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await db
      .from("stores")
      .select("id,name,location,created_at")
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(`تعذر تحميل المخازن: ${fetchError.message}`);
      setStores([]);
    } else {
      setStores((data ?? []) as StoreRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  const addStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const cleanName = name.trim();
    const cleanLocation = location.trim();
    if (!cleanName) {
      setError("أدخل اسم المخزن.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { error: insertError } = await db.from("stores").insert({
      name: cleanName,
      location: cleanLocation || null,
    });
    if (insertError) {
      setError(`تعذرت إضافة المخزن: ${insertError.message}`);
    } else {
      setName("");
      setLocation("");
      setNotice("تمت إضافة المخزن.");
      await fetchStores();
    }
    setSaving(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة المخازن</h1>
            <p className="mt-1 text-sm text-slate-500">
              تُقرأ بيانات المخزن من قاعدة البيانات، ويُنشأ معرّف UUID تلقائيًا.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchStores()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        </header>

        <form
          onSubmit={addStore}
          className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]"
        >
          <label className="space-y-1 text-sm font-bold">
            <span>اسم المخزن</span>
            <input
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 font-normal"
              placeholder="مثال: المخزن الرئيسي"
            />
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>الموقع (اختياري)</span>
            <input
              maxLength={300}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 font-normal"
              placeholder="المدينة أو العنوان"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 font-bold text-white disabled:opacity-50"
          >
            <Plus className="size-4" /> {saving ? "جارٍ الحفظ..." : "إضافة مخزن"}
          </button>
        </form>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800"
          >
            {notice}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4 font-black">المخازن المسجلة ({stores.length})</div>
          {loading ? (
            <p className="p-6 text-sm text-slate-500">جارٍ التحميل...</p>
          ) : stores.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              لا توجد مخازن ظاهرة. إن كان المتوقع وجود مخازن، فتحقق من سياسة قراءة `stores` وصلاحيات
              قاعدة البيانات.
            </div>
          ) : (
            <div className="divide-y">
              {stores.map((store) => (
                <article
                  key={store.id}
                  className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                >
                  <h2 className="font-bold text-slate-900">{store.name}</h2>
                  <p className="text-sm text-slate-600">{store.location || "لا يوجد موقع محدد"}</p>
                  <code dir="ltr" className="text-xs text-slate-400">
                    {store.id}
                  </code>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="text-xs leading-6 text-slate-500">
          الحذف غير متاح هنا حتى لا تُفقد علاقة المنتجات بالمخازن أو تصطدم بقيود المفاتيح الأجنبية.
        </p>
      </div>
    </main>
  );
}
