import type { ReactNode } from "react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { usePermission } from "@/lib/permissions";
import type { PermissionAction, PermissionArea } from "@/lib/permissions";

type PermissionRouteGuardProps = {
  area: PermissionArea;
  /** Route access defaults to the read/view permission. */
  action?: PermissionAction;
  /** Keep aligned with the existing role policy for the route. */
  allowStaff?: boolean;
  /** Internal route to return to after login. */
  redirectTo?: string;
  children: ReactNode;
};

/**
 * Adds a per-account permission check inside the existing admin/staff role guard.
 * This controls route rendering only; enforce sensitive data and mutations in
 * database RLS/RPCs or server-side functions as well.
 */
export function PermissionRouteGuard({
  area,
  action = "view",
  allowStaff = true,
  redirectTo,
  children,
}: PermissionRouteGuardProps) {
  return (
    <AdminRouteGuard allowStaff={allowStaff} redirectTo={redirectTo}>
      <PermissionRouteContent area={area} action={action}>
        {children}
      </PermissionRouteContent>
    </AdminRouteGuard>
  );
}

function PermissionRouteContent({
  area,
  action,
  children,
}: {
  area: PermissionArea;
  action: PermissionAction;
  children: ReactNode;
}) {
  const permission = usePermission(area, action);

  if (permission.loading) {
    return (
      <main
        dir="rtl"
        className="grid min-h-screen place-items-center p-6"
        role="status"
        aria-live="polite"
      >
        جارٍ التحقق من الصلاحية…
      </main>
    );
  }

  if (!permission.allowed) {
    return (
      <main
        dir="rtl"
        className="grid min-h-screen place-items-center p-6"
      >
        <section
          role="alert"
          className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
        >
          <h1 className="text-lg font-black text-amber-950">
            {permission.error
              ? "تعذر التحقق من صلاحية الوصول"
              : "لا تملك صلاحية الوصول"}
          </h1>
          <p className="mt-2 text-sm text-amber-900">
            {permission.error
              ? "تعذر التحقق من صلاحيتك الآن. حدّث الصفحة أو تواصل مع مشرف النظام."
              : "تواصل مع مشرف النظام إذا كنت تحتاج هذه الصفحة."}
          </p>
          {permission.error && (
            <p className="mt-3 break-words text-xs text-red-800" dir="auto">
              {permission.error}
            </p>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
