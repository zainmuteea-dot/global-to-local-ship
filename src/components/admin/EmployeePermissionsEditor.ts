import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionArea } from "@/lib/permissions";

type EditorAction = "view" | "manage" | "delete" | "create";
type PermissionMap = Record<string, Record<string, boolean>>;

const AREAS: Array<{
  key: PermissionArea;
  title: string;
  actions: Array<{ key: EditorAction; title: string }>;
}> = [
  {
    key: "orders",
    title: "الطلبات",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وإضافة وتعديل",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "shipping",
    title: "الشحن",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وتحديث المراحل",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "customers",
    title: "العملاء",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وتعديل",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "notifications",
    title: "الإشعارات",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وإرسال",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "finance",
    title: "الماليات",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وتعديل",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "inventory",
    title: "المخزون والمنتجات",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وإضافة وتعديل",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "settings",
    title: "الإعدادات",
    actions: [{ key: "view", title: "عرض" }, {
      key: "manage",
      title: "إدارة وتعديل",
    }, { key: "delete", title: "حذف" }],
  },
  {
    key: "employees",
    title: "حسابات الموظفين",
    actions: [{ key: "create", title: "إضافة حسابات" }, {
      key: "delete",
      title: "حذف حسابات",
    }],
  },
];

function createDeniedPermissions(): PermissionMap {
  return Object.fromEntries(
    AREAS.map((
      area,
    ) => [
      area.key,
      Object.fromEntries(area.actions.map((action) => [action.key, false])),
    ]),
  );
}

function isPermissionMap(value: unknown): value is PermissionMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function callRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const rpc = supabase.rpc as unknown as (
    functionName: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return rpc.call(supabase, name, args);
}

export function EmployeePermissionsEditor({
  userId,
  employeeName,
  onClose,
  onSaved,
}: {
  userId: string;
  employeeName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [permissions, setPermissions] = useState<PermissionMap>(
    createDeniedPermissions,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void callRpc("admin_get_employee_permissions", { _target_user_id: userId })
      .then(({ data, error: rpcError }) => {
        if (rpcError) throw new Error(rpcError.message);
        if (!active) return;
        if (data === null) {
          setConfigured(false);
          setEditing(false);
          return;
        }
        if (!isPermissionMap(data)) {
          throw new Error("بيانات الصلاحيات المستلمة غير صالحة.");
        }
        setPermissions(data);
        setConfigured(true);
        setEditing(true);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "تعذر تحميل الصلاحيات.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  function toggle(area: string, action: string) {
    setPermissions((current) => ({
      ...current,
      [area]: { ...current[area], [action]: !current[area]?.[action] },
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { data, error: rpcError } = await callRpc(
        "admin_set_employee_permissions",
        {
          _target_user_id: userId,
          _permissions: permissions,
        },
      );
      if (rpcError) throw new Error(rpcError.message);
      if (data !== true) throw new Error("لم يؤكد الخادم حفظ الصلاحيات.");
      setConfigured(true);
      setEditing(true);
      setSaved(true);
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الصلاحيات.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-title"
    >
      <section
        dir="rtl"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="permissions-title"
              className="text-lg font-black text-slate-900"
            >
              صلاحيات {employeeName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              إدارة الصلاحيات منفصلة عن دور الحساب.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            إغلاق
          </button>
        </div>

        {loading
          ? <p className="py-8 text-center">جارٍ تحميل الصلاحيات…</p>
          : !editing
          ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-950">
                هذا الحساب غير مخصص، ويستمر حاليًا على صلاحياته الحالية دون تغيير.
              </p>
              <p className="mt-1 text-sm text-amber-900">
                عند بدء التخصيص، تبدأ كل الأذونات الجديدة مغلقة. فعّل فقط ما تريد
                منحه ثم احفظ.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPermissions(createDeniedPermissions());
                  setEditing(true);
                }}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                بدء تخصيص الصلاحيات
              </button>
            </div>
          )
          : (
            <>
              <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
                الإدارة تسمح بالإضافة والتعديل، لكنها لا تمنح الحذف تلقائيًا. أذونات
                حسابات الموظفين (إضافة/حذف) مستقلة.
              </p>
              <div className="mt-4 space-y-3">
                {AREAS.map((area) => (
                  <fieldset
                    key={area.key}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <legend className="px-2 font-black text-slate-900">
                      {area.title}
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {area.actions.map((action) => (
                        <label
                          key={action.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={permissions[area.key]?.[action.key] ===
                              true}
                            onChange={() => toggle(area.key, action.key)}
                            className="size-4 accent-blue-700"
                          />
                          {action.title}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800"
                >
                  {error}
                </p>
              )}
              {saved && (
                <p
                  role="status"
                  className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800"
                >
                  حُفظت الصلاحيات.
                </p>
              )}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border px-4 py-2 font-bold text-slate-700"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50"
                >
                  {saving ? "جارٍ الحفظ…" : "حفظ الصلاحيات"}
                </button>
              </div>
            </>
          )}
        {error && !editing && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800"
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
