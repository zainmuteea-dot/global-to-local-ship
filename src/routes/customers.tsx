import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("سجّل الدخول بحساب إداري لعرض قائمة العملاء.");
      }

      const { data: isAdmin, error: roleCheckError } =
        await supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        });

      if (roleCheckError) throw roleCheckError;

      if (!isAdmin) {
        throw new Error("هذا الحساب لا يملك صلاحية عرض قائمة العملاء.");
      }

      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const staffIds = new Set(
        (roleRows ?? [])
          .filter((row) => row.role === "admin" || row.role === "staff")
          .map((row) => row.user_id),
      );

      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const customerRows: Customer[] = (profileRows ?? [])
        .filter((profile) => !staffIds.has(profile.id))
        .map((profile) => ({
          id: profile.id,
          name: profile.full_name?.trim() || "عميل بدون اسم",
          phone: profile.phone,
          created_at: profile.created_at,
        }));

      setCustomers(customerRows);
    } catch (error) {
      console.error("تعذر تحميل قائمة العملاء:", error);

      setCustomers([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء تحميل العملاء.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData, reloadKey]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.phone ?? "").toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#0A2540]">
              كشف العملاء
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              الحسابات المسجلة في النظام، مع استبعاد حسابات الإدارة والموظفين.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b3b65] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
            تحديث القائمة
          </button>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-[#0F4C81]">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-600">
                عدد العملاء
              </p>
              <p className="text-2xl font-black text-[#0A2540]">
                {loading ? "—" : customers.length}
              </p>
            </div>
          </div>

          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </section>

        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          >
            {loadError}
            <p className="mt-2 font-normal">
              إذا كان الخطأ متعلقًا بالصلاحيات، راجع سياسات RLS على جدولي
              {" "}
              <code dir="ltr">profiles</code>
              {" "}
              و
              {" "}
              <code dir="ltr">user_roles</code>
              {" "}
              وتأكد أن الوصول مقصور على الإدارة.
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            جارٍ تحميل العملاء...
          </div>
        ) : loadError ? null : filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            {customers.length === 0
              ? "لا توجد حسابات عملاء لعرضها."
              : "لا توجد نتائج مطابقة للبحث."}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-right">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">اسم العميل</th>
                    <th className="px-4 py-3">رقم الهاتف</th>
                    <th className="px-4 py-3">تاريخ التسجيل</th>
                    <th className="px-4 py-3">معرّف الحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-[#0A2540]">
                        {customer.name}
                      </td>
                      <td dir="ltr" className="px-4 py-3 text-right font-mono text-slate-700">
                        {customer.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(customer.created_at)}
                      </td>
                      <td
                        dir="ltr"
                        className="px-4 py-3 text-right font-mono text-xs text-slate-500"
                      >
                        {customer.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
