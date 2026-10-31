import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PermissionArea =
  | "orders"
  | "shipping"
  | "customers"
  | "notifications"
  | "finance"
  | "inventory"
  | "settings"
  | "employees";
export type PermissionAction = "view" | "manage" | "delete" | "create";

type PermissionState = {
  allowed: boolean;
  loading: boolean;
  error: string | null;
};

async function callPermissionRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const rpc = supabase.rpc as unknown as (
    functionName: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return rpc.call(supabase, name, args);
}

export async function checkPermission(
  area: PermissionArea,
  action: PermissionAction,
): Promise<boolean> {
  const { data, error } = await callPermissionRpc(
    "current_user_has_permission",
    {
      _area: area,
      _action: action,
    },
  );
  if (error) throw new Error(error.message);
  return data === true;
}

/** UI gating only. Secure mutations must also check the permission in RLS/server code. */
export function usePermission(
  area: PermissionArea,
  action: PermissionAction,
): PermissionState {
  const [state, setState] = useState<PermissionState>({
    allowed: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState({ allowed: false, loading: true, error: null });
    void checkPermission(area, action)
      .then((allowed) => {
        if (active) setState({ allowed, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            allowed: false, // fail closed if permission lookup fails
            loading: false,
            error: error instanceof Error
              ? error.message
              : "تعذر التحقق من الصلاحية.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [area, action]);

  return state;
}

export function PermissionGate({
  area,
  action,
  children,
  fallback = null,
}: {
  area: PermissionArea;
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permission = usePermission(area, action);
  if (permission.loading) return null;
  return permission.allowed ? <>{children}</> : <>{fallback}</>;
}
