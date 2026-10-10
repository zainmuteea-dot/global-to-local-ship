import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "admin" | "staff";
type RoleFilter = "all" | StaffRole;

interface EmployeeItem {
  id: string;
  name: string;
  phone: string | null;
  role: StaffRole;
  createdAt: string | null;
}

const ROLE_INFO: Record<StaffRole, { title: string; color: string; bg: string; border: string }> = {
  admin: {
    title: "مشرف عام",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  staff: {
    title: "موظف",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
};

function formatJoinDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadEmployees() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          throw new Error("يجب تسجيل الدخول بحساب إداري لعرض الموظفين.");
        }

        const { data: isAdmin, error: permissionError } = await supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        });
        if (permissionError) throw permissionError;
        if (!isAdmin) {
          throw new Error("هذا الحساب لا يملك صلاحية المشرف لعرض قائمة الموظفين.");
        }

        // user_roles هو المصدر الموثوق لتحديد الموظفين، وليس بيانات المتصفح المحلية.
        const { data: roleRows, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");
        if (rolesError) throw rolesError;

        const rolesByUser = new Map<string, StaffRole>();
        for (const row of roleRows ?? []) {
          if (row.role === "admin") {
            rolesByUser.set(row.user_id, "admin");
          } else if (row.role === "staff" && !rolesByUser.has(row.user_id)) {
            rolesByUser.set(row.user_id, "staff");
          }
        }

        const userIds = [...rolesByUser.keys()];
        if (userIds.length === 0) {
          if (active) setEmployees([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, phone, created_at")
          .in("id", userIds);
        if (profilesError) throw profilesError;

        const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
        const result: EmployeeItem[] = userIds.map((id) => {
          const profile = profilesById.get(id);
          return {
            id,
            name: profile?.full_name?.trim() || "موظف بدون اسم",
            phone: profile?.phone ?? null,
            role: rolesByUser.get(id) ?? "staff",
            createdAt: profile?.created_at ?? null,
          };
        });

        result.sort((a, b) => {
          if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
          return a.name.localeCompare(b.name, "ar");
        });

        if (active) setEmployees(result);
      } catch (error) {
        console.error("تعذر تحميل قائمة الموظفين من Supabase:", error);
        if (active) {
          setEmployees([]);
          setLoadError(
            error instanceof Error
              ? error.message
              : "تعذر تحميل الموظفين. تحقق من اتصال Supabase وسياسات الوصول.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEmployees();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return employees.filter((employee) => {
      const matchesRole = roleFilter === "all" || employee.role === roleFilter;
      const matchesSearch =
        !query ||
        employee.name.toLocaleLowerCase().includes(query) ||
        (employee.phone ?? "").includes(search.trim()) ||
        employee.id.toLocaleLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [employees, roleFilter, search]);

  const adminCount = employees.filter((employee) => employee.role === "admin").length;
  const staffCount = employees.filter((employee) => employee.role === "staff").length;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] pb-16 font-sans text-slate-800"
    >
      <header className="sticky top-0 z-30 border-b border-sky-100 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/admin" })}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 p-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <ArrowRight className="size-4" />
              <span>العودة للإدارة</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="flex items-center gap-2 text-base font-black text-slate-900">
                <UserCog className="size-5 text-[#0F4C81]" />
                الموظفون من قاعدة البيانات
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                الحسابات التي لديها دور موثوق في Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0F4C81] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0b3b65] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-6xl space-y-6 px-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-500">إجمالي حسابات الموظفين</div>
              <div className="mt-0.5 text-2xl font-black text-slate-900">
                {loading ? "—" : employees.length}
              </div>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-sky-50 text-[#0F4C81]">
              <Users className="size-5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-500">المشرفون</div>
              <div className="mt-0.5 text-2xl font-black text-rose-700">
                {loading ? "—" : adminCount}
              </div>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-500">الموظفون</div>
              <div className="mt-0.5 text-2xl font-black text-sky-700">
                {loading ? "—" : staffCount}
              </div>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
              <UserRound className="size-5" />
            </div>
          </div>
        </section>

        <section className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3 top-3 size-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو المعرّف..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-xs font-semibold outline-none focus:border-[#0F4C81] focus:bg-white"
            />
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 text-xs font-bold sm:w-auto sm:pb-0">
            {([
              ["all", `الكل (${employees.length})`],
              ["admin", `المشرفون (${adminCount})`],
              ["staff", `الموظفون (${staffCount})`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRoleFilter(value)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 transition ${
                  roleFilter === value
                    ? "bg-[#0F4C81] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {loadError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-black">تعذر تحميل الموظفين</p>
              <p className="mt-1">{loadError}</p>
              <p className="mt-2 text-xs">
                تأكد أن هذا الحساب مشرف، وأن سياسات RLS تسمح للمشرف بقراءة جدولي
                <code dir="ltr" className="mx-1 rounded bg-red-100 px-1">user_roles</code>
                و
                <code dir="ltr" className="mx-1 rounded bg-red-100 px-1">profiles</code>.
              </p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50 font-bold text-slate-500">
                  <th className="px-4 py-3.5">الموظف</th>
                  <th className="px-4 py-3.5">الدور</th>
                  <th className="px-4 py-3.5">رقم الهاتف</th>
                  <th className="px-4 py-3.5">تاريخ إنشاء الحساب</th>
                  <th className="px-4 py-3.5">معرّف الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center font-semibold text-slate-500">
                      جارٍ تحميل الموظفين من قاعدة البيانات...
                    </td>
                  </tr>
                )}
                {!loading && !loadError && filteredEmployees.map((employee) => {
                  const roleStyle = ROLE_INFO[employee.role];
                  return (
                    <tr key={employee.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-9 place-items-center rounded-full border border-slate-200 bg-slate-100 text-sm font-black text-[#0F4C81]">
                            {employee.name.charAt(0)}
                          </div>
                          <span className="font-black text-slate-900">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-black ${roleStyle.bg} ${roleStyle.color} ${roleStyle.border}`}>
                          <BadgeCheck className="size-3" />
                          {roleStyle.title}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                        {employee.phone || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-slate-400" />
                          {formatJoinDate(employee.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[10px] text-slate-500" dir="ltr">
                        {employee.id}
                      </td>
                    </tr>
                  );
                })}
                {!loading && !loadError && filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <p className="font-black text-slate-700">
                        {employees.length === 0
                          ? "لا توجد حسابات موظفين في جدول user_roles."
                          : "لا توجد نتائج تطابق البحث أو التصفية."}
                      </p>
                      {employees.length === 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          أضف دور admin أو staff للحساب المطلوب من لوحة Supabase.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-[11px] font-medium text-slate-500">
          تعرض الصفحة الحسابات ذات الدور admin أو staff فقط. إضافة الحسابات والأدوار تتم بأمان من Supabase.
        </p>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "إدارة الموظفين والصلاحيات | السوق الشامل" },
      {
        name: "description",
        content: "عرض حسابات الموظفين والمشرفين المرتبطة بقاعدة بيانات Supabase.",
      },
    ],
  }),
  component: EmployeesPage,
});

export default EmployeesPage
