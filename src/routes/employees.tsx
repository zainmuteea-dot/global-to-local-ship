import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
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

interface EmployeeRpcRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: StaffRole;
  created_at: string | null;
}

// The current generated Supabase types do not yet declare the two admin RPCs.
// Keep this narrow adapter until types.ts is regenerated after deploying the SQL.
async function callEmployeeRpc(
  name: string,
  args?: Record<string, unknown>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const rpc = supabase.rpc as unknown as (
    functionName: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return rpc.call(supabase, name, args);
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === "string") return body.error;
      } catch {
        // Use the SDK message when the response body is not JSON.
      }
    }
  }
  return error instanceof Error ? error.message : "تعذر حذف الحساب. تحقق من إعداد Edge Function.";
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
  const [editing, setEditing] = useState<EmployeeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("staff");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

        // لا نستعلم مباشرة من user_roles/profiles: سياسات RLS الحالية تسمح للمستخدم
        // بقراءة صفه فقط. RPC SECURITY DEFINER تعرض القائمة للمدير بعد التحقق منه.
        const { data, error } = await callEmployeeRpc("admin_list_employees");
        if (error) throw new Error(error.message);
        const rows = Array.isArray(data) ? (data as EmployeeRpcRow[]) : [];
        const result: EmployeeItem[] = rows
          .filter((row) => row && typeof row.user_id === "string" && (row.role === "admin" || row.role === "staff"))
          .map((row) => ({
            id: row.user_id,
            name: row.full_name?.trim() || "موظف بدون اسم",
            phone: row.phone ?? null,
            role: row.role,
            createdAt: row.created_at ?? null,
          }));

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

  function beginEdit(employee: EmployeeItem) {
    setEditing(employee);
    setEditName(employee.name === "موظف بدون اسم" ? "" : employee.name);
    setEditPhone(employee.phone ?? "");
    setEditRole(employee.role);
    setActionError(null);
    setActionMessage(null);
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const fullName = editName.trim();
    const phone = editPhone.trim();
    if (!fullName) {
      setActionError("اكتب اسم الموظف.");
      return;
    }
    if (fullName.length > 120 || phone.length > 30) {
      setActionError("الاسم يجب ألا يتجاوز 120 حرفًا والهاتف 30 حرفًا.");
      return;
    }
    setBusyId(editing.id);
    setActionError(null);
    setActionMessage(null);
    try {
      const { error } = await callEmployeeRpc("admin_update_employee", {
        _target_user_id: editing.id,
        _full_name: fullName,
        _phone: phone || null,
        _role: editRole,
      });
      if (error) throw new Error(error.message);
      setEditing(null);
      setActionMessage("تم حفظ بيانات الموظف ودوره.");
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("تعذر تحديث حساب الموظف:", error);
      setActionError(error instanceof Error ? error.message : "تعذر حفظ التعديلات.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEmployee(employee: EmployeeItem) {
    const confirmed = window.confirm(
      `تحذير: هذا يحذف حساب الدخول نهائيًا للمستخدم ${employee.name} (${employee.id})، وقد يحذف بيانات مرتبطة حسب علاقات قاعدة البيانات. لا يمكن التراجع. هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    setBusyId(employee.id);
    setActionError(null);
    setActionMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-employee", {
        body: { userId: employee.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setActionMessage("تم حذف حساب المستخدم نهائيًا.");
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("تعذر حذف حساب الموظف:", error);
      setActionError(await getFunctionErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

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
                تأكد من تثبيت RPC باسم
                <code dir="ltr" className="mx-1 rounded bg-red-100 px-1">admin_list_employees</code>
                و
                <code dir="ltr" className="mx-1 rounded bg-red-100 px-1">admin_update_employee</code>
                في قاعدة Supabase الصحيحة، وأن الحساب يحمل دور admin.
              </p>
            </div>
          </div>
        )}

        {(actionError || actionMessage) && (
          <div role={actionError ? "alert" : "status"} className={`rounded-2xl border p-3 text-sm font-bold ${actionError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {actionError || actionMessage}
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation">
            <form onSubmit={saveEmployee} dir="rtl" className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-5 shadow-2xl" aria-labelledby="edit-employee-title">
              <div className="flex items-center justify-between gap-3">
                <h2 id="edit-employee-title" className="text-lg font-black">تعديل بيانات الموظف</h2>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="إغلاق"><X className="size-5" /></button>
              </div>
              <label className="block space-y-1 text-sm font-bold">الاسم
                <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} required className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-700" />
              </label>
              <label className="block space-y-1 text-sm font-bold">رقم الهاتف
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} maxLength={30} dir="ltr" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-left outline-none focus:border-sky-700" />
              </label>
              <label className="block space-y-1 text-sm font-bold">الدور
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as StaffRole)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-sky-700">
                  <option value="staff">موظف</option><option value="admin">مشرف عام</option>
                </select>
              </label>
              <p className="text-xs leading-6 text-amber-800">تغيير دور المدير يخضع لفحص في قاعدة البيانات، ولا يمكن خفض آخر مدير.</p>
              {actionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold">إلغاء</button>
                <button type="submit" disabled={busyId === editing.id} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Save className="size-4" />{busyId === editing.id ? "جارٍ الحفظ…" : "حفظ التعديلات"}</button>
              </div>
            </form>
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
                  <th className="px-4 py-3.5">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center font-semibold text-slate-500">
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
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => beginEdit(employee)} disabled={busyId === employee.id} className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-2 font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-50" aria-label={`تعديل ${employee.name}`}><Pencil className="size-3.5" /><span>تعديل</span></button>
                          <button type="button" onClick={() => void deleteEmployee(employee)} disabled={busyId === employee.id || employee.role === "admin"} title={employee.role === "admin" ? "غيّر دور المدير إلى موظف أولاً قبل الحذف" : undefined} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-2 font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label={employee.role === "admin" ? `يجب خفض دور ${employee.name} قبل الحذف` : `حذف ${employee.name}`}><Trash2 className="size-3.5" /><span>{busyId === employee.id ? "جارٍ…" : employee.role === "admin" ? "اخفض الدور أولاً" : "حذف نهائي"}</span></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !loadError && filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
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
          تعديلات الأدوار وبيانات الملف تمر عبر RPC محمي. حذف الحساب النهائي يمر عبر Edge Function، ولا يضع مفتاح service_role في المتصفح.
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
  component: GuardedEmployeesPage,
});

function GuardedEmployeesPage() {
  return <AdminRouteGuard><EmployeesPage /></AdminRouteGuard>;
}

export default GuardedEmployeesPage;
