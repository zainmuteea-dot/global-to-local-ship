import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Session = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>["data"]["session"];

type AdminRouteGuardProps = {
  children: ReactNode;
  /** Test seam; production leaves this unset and redirects to login. */
  onUnauthorized?: (reason?: string) => void;
  /** When true, allow either the admin or staff role. */
  allowStaff?: boolean;
  /** Internal path to return to after authentication. */
  redirectTo?: string;
};

/** Protects admin routes with a valid Supabase session and the trusted has_role RPC. */
export function AdminRouteGuard({
  children,
  onUnauthorized,
  allowStaff = false,
  redirectTo = "/admin",
}: AdminRouteGuardProps) {
  const [checking, setChecking] = useState(true);

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

      const safeRedirect =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/admin";
      const query = new URLSearchParams({ redirect: safeRedirect });
      if (reason) query.set("error", reason);

      // Staff accounts use the shared login page; admins retain the admin login.
      const loginPath = allowStaff ? "/login" : "/admin-login";
      window.location.replace(`${loginPath}?${query.toString()}`);
    };

    const verifyAccess = async (knownSession?: Session) => {
      if (active) setChecking(true);

      const sessionResult =
        knownSession === undefined
          ? await supabase.auth.getSession()
          : { data: { session: knownSession }, error: null };
      const session = sessionResult.data.session;

      if (!active) return;
      if (sessionResult.error || !session) {
        goToLogin();
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "has_role",
        {
          _user_id: session.user.id,
          _role: "admin",
        },
      );

      if (!active) return;
      if (adminError) {
        goToLogin("role-check-failed");
        return;
      }

      let isStaff = false;
      if (allowStaff) {
        const { data: staffRole, error: staffError } = await supabase.rpc(
          "has_role",
          {
            _user_id: session.user.id,
            _role: "staff",
          },
        );

        if (!active) return;
        if (staffError) {
          goToLogin("role-check-failed");
          return;
        }
        isStaff = staffRole === true;
      }

      if (isAdmin !== true && !isStaff) {
        goToLogin("not-admin");
        return;
      }

      setChecking(false);
    };

    void verifyAccess();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        goToLogin();
      } else {
        void verifyAccess(session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [allowStaff, onUnauthorized, redirectTo]);

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
          <span className="text-sm font-bold">
            جارٍ التحقق من صلاحية الإدارة…
          </span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
