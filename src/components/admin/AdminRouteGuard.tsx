import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Protects the admin page with Supabase Auth and the trusted public.has_role RPC.
 * Copy to src/components/admin/AdminRouteGuard.tsx and wrap the admin page route.
 */
export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    const goToLogin = (reason?: string) => {
      if (!active || redirecting) return;
      redirecting = true;
      const query = reason ? `?error=${encodeURIComponent(reason)}` : "";
      window.location.replace(`/admin-login${query}&redirect=${encodeURIComponent("/admin")}`);
    };

    const verifyAdmin = async (knownSession?: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        goToLogin();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void verifyAdmin(session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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
