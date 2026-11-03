import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

export type AdminRouteGuardProps = {
  children: ReactNode;
  /** Test seam; production leaves this unset and redirects to login. */
  onUnauthorized?: (reason?: string) => void;
  /** When true, allow either the admin or staff role. */
  allowStaff?: boolean;
  /** Internal path to return to after authentication. */
  redirectTo?: string;
};

/** Accept only same-origin absolute paths; reject protocol-relative and backslash paths. */
function getSafeInternalRedirect(value: string | null | undefined, fallback = "/admin"): string {
  if (
    typeof window === "undefined" ||
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%5c/i.test(value)
  ) {
    return fallback;
  }

  try {
    const target = new URL(value, window.location.origin);

    if (target.origin !== window.location.origin) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

/** Protects admin routes with a valid Supabase session and the trusted has_role RPC. */
export function AdminRouteGuard({
  children,
  onUnauthorized,
  allowStaff = false,
  redirectTo = "/admin",
}: AdminRouteGuardProps) {
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    const goToLogin = (reason?: string) => {
      if (!active || redirecting) return;
      redirecting = true;

      if (onUnauthorized) {
        onUnauthorized(reason);
        return;
      }

      const safeRedirect = getSafeInternalRedirect(redirectTo, "/admin");
      const query = new URLSearchParams({ redirect: safeRedirect });
      if (reason) query.set("error", reason);

      // Staff accounts use the shared login page; admins retain the admin login.
      const loginPath = allowStaff ? "/login" : "/admin-login";
      window.location.replace(`${loginPath}?${query.toString()}`);
    };

    const verifyAccess = async (knownSession?: Session) => {
      if (active) {
        setChecking(true);
        setCheckError(null);
      }

      const timeout = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("انتهت مهلة التحقق من صلاحية الإدارة.")), 10000),
      );
      try {
        const sessionResult = await Promise.race([
          knownSession === undefined
            ? supabase.auth.getSession()
            : Promise.resolve({ data: { session: knownSession }, error: null }),
          timeout,
        ]);
        const session = sessionResult.data.session;

        if (!active) return;
        if (sessionResult.error || !session) {
          goToLogin();
          return;
        }

        const { data: isAdmin, error: adminError } = await Promise.race([
          supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }),
          timeout,
        ]);

        if (!active) return;
        if (adminError) {
          throw adminError;
        }
        let isStaff = false;
        if (allowStaff) {
          const { data: staffRole, error: staffError } = await Promise.race([
            supabase.rpc("has_role", { _user_id: session.user.id, _role: "staff" }),
            timeout,
          ]);
          if (!active) return;
          if (staffError) throw staffError;
          isStaff = staffRole === true;
        }

        if (isAdmin !== true && !isStaff) {
          goToLogin("not-admin");
          return;
        }
        setChecking(false);
      } catch (error) {
        if (!active) return;
        setChecking(false);
        setCheckError(error instanceof Error ? error.message : "تعذر التحقق من صلاحية الإدارة.");
      }
    };

    void verifyAccess();
    const {
      data: { subscription },
    } =     supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!active) return;
        if (!session) goToLogin();
        else void verifyAccess(session);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [allowStaff, onUnauthorized, redirectTo]);

  if (checkError) {
    return (
      <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#F7E8D1] p-6 text-[#201A17]">
        <div role="alert" className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-bold">{checkError}</p>
          <button type="button" onClick={retry} className="mt-4 rounded-xl bg-[#873512] px-5 py-2 text-sm font-bold text-white">إعادة المحاولة</button>
        </div>
      </main>
    );
  }

  if (checking) {
    return (
      <main
        dir="rtl"
        className="grid min-h-screen place-items-center bg-[#F7E8D1] p-6 text-[#201A17]"
      >
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm"
        >
          <span className="size-5 animate-spin rounded-full border-2 border-[#873512]/20 border-t-[#873512]" />
          <span className="text-sm font-bold">جارٍ التحقق من صلاحية الإدارة…</span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export default AdminRouteGuard;
