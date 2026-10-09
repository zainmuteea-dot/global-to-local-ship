import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

/** Protects /admin with a valid Supabase session and the trusted has_role RPC. */
export function AdminRouteGuard({
  children,
  onUnauthorized,
}: {
  children: ReactNode;
  /** Test seam; production leaves this unset and is redirected to login. */
  onUnauthorized?: (reason?: string) => void;
}) {
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
      const query = new URLSearchParams({ redirect: "/admin" });
      if (reason) query.set("error", reason);
      window.location.replace(`/admin-login?${query.toString()}`);
    };

    const verifyAdmin = async (knownSession?: Session) => {
      const sessionResult = knownSession === undefined
        ? await supabase.auth.getSession()
        : { data: { session: knownSession }, error: null };
      const session = sessionResult.data.session;

      if (!active) return;
      if (sessionResult.error || !session) {
        goToLogin();
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!active) return;
      if (error || isAdmin !== true) {
        goToLogin("not-admin");
        return;
      }
      setChecking(false);
    };

    void verifyAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) goToLogin();
      else void verifyAdmin(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [onUnauthorized]);

  if (checking) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#F7E8D1] p-6 text-[#201A17]">
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <span className="size-5 animate-spin rounded-full border-2 border-[#873512]/20 border-t-[#873512]" />
          <span className="text-sm font-bold">جارٍ التحقق من صلاحية الإدارة…</span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
