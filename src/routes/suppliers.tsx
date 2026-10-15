import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

const db = supabase as any;

export const Route = createFileRoute("/suppliers")({
  component: GuardedSuppliersPage,
});

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
};

type DbError = { code?: string; message?: string };

function describeError(error: DbError) {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "جدول الموردين غير موجود في قاعدة البيانات المتصلة. أنشئه في قاعدة الموقع الصحيحة أولًا.";
  }
  if (error.code === "42501" || /permission denied|row-level security|policy/i.test(error.message ?? "")) {
    return "رفضت قاعدة البيانات العملية. تحقق من RLS ومن سياسة المدير للعملية المطلوبة.";
  }
  return error.message || "تعذر الاتصال بقاعدة البيانات.";
}

function GuardedSuppliersPage() {
  return (
    <AdminRouteGuard>
      <SuppliersPage />
    </AdminRouteGuard>
  );
}

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    const { data, error: queryError } = await db
      .from("suppliers")
      .select("id,name,phone,created_at")
      .order("created_at", { ascending: false });

    if (queryError) {
      setSuppliers([]);
      setError(describeError(queryError));
    } else {
      setSuppliers((data ?? []) as Supplier[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const addSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) {
      setError("أدخل اسم المورد.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: insertError } = await db
      .from("suppliers")
      .insert({ name: cleanName, phone: cleanPhone || null })
      .select("id,name,phone,created_at")
      .single();

    if (insertError) {
      setError(describeError(insertError));
      setSaving(false);
      return;
    }

    setSuppliers((current) => [data as Supplier, ...current]);
    setName("");
    setPhone("");
    setNotice("تمت إضافة المورد بنجاح.");
    setSaving(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-blue-900 text-white">
              <Truck className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black">الموردون</h1>
              <p className="mt-1 text-sm text-slate-500">إدارة الموردين — للمدير فقط</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSuppliers()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        </header>

        <form onSubmit={addSupplier} className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">إضافة مورد</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              required
              placeholder="اسم المورد"
              className="min-w-0 rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={40}
              type="tel"
              placeholder="رقم الهاتف (اختياري)"
              className="min-w-0 rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={saving || loading || !name.trim()}
              className="rounded-xl bg-blue-900 px-5 py-2.5 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ…" : "إضافة المورد"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            حراسة الصفحة تمنع فتحها لغير المدير، وسياسة RLS هي التي تفرض صلاحية الإضافة في قاعدة البيانات.
          </p>
        </form>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <section aria-labelledby="suppliers-list-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="suppliers-list-heading" className="mb-3 font-bold">قائمة الموردين ({suppliers.length})</h2>
          {loading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">جارٍ تحميل الموردين…</p>
          ) : error && suppliers.length === 0 ? (
            <p className="py-5 text-center text-sm text-slate-500">أصلح اتصال الجدول أو صلاحيات القراءة، ثم اضغط «تحديث».</p>
          ) : suppliers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">لا يوجد موردون حتى الآن.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map((supplier) => (
                <li key={supplier.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="font-semibold">{supplier.name}</span>
                  <span className="text-sm text-slate-500">{supplier.phone || "لا يوجد هاتف"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
