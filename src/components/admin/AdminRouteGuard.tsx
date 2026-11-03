import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

export type AdminRouteGuardProps = {
  children: ReactNode;
  onUnauthorized?: (reason?: string) => void;
  allowStaff?: boolean;
  redirectTo?: string;
};

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
    if (target.origin !== window.location.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

/** Bound a stalled auth/RPC request; failures stay closed and can be retried. */
async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs = 12_000): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("انتهت مهلة التحقق من صلاحية الإدارة.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

/**
 * Protects admin routes with a valid Supabase session and trusted has_role RPC.
 * It never grants access on a timer. Auth callbacks schedule RPC work outside
 * Supabase's auth lock, and a token refresh won't unmount an authorized page.
 */
export function AdminRouteGuard({
  children,
  onUnauthorized,
  allowStaff = false,
  redirectTo = "/admin",
}: AdminRouteGuardProps) {
  const [checking, setChecking] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let redirecting = false;
    let hasVerifiedAccess = false;
    let verifiedUserId: string | null = null;
    let requestId = 0;

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
      const loginPath = allowStaff ? "/login" : "/admin-login";
      window.location.replace(`${loginPath}?${query.toString()}`);
    };

    const verifyAccess = async (knownSession?: Session) => {
      const thisRequest = ++requestId;
      if (knownSession?.user.id && verifiedUserId && knownSession.user.id !== verifiedUserId) {
        hasVerifiedAccess = false;
      }
      if (!hasVerifiedAccess) setChecking(true);
      setVerificationError("");

      try {
        const sessionResult = knownSession === undefined
          ? await withTimeout(supabase.auth.getSession())
          : { data: { session: knownSession }, error: null };
        const session = sessionResult.data.session;

        if (!active || thisRequest !== requestId) return;
        if (sessionResult.error || !session) {
          goToLogin();
          return;
        }

        const { data: isAdmin, error: adminError } = await withTimeout(
          supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }),
        );
        if (!active || thisRequest !== requestId) return;
        if (adminError) throw new Error(adminError.message);

        let isStaff = false;
        if (allowStaff) {
          const { data: staffRole, error: staffError } = await withTimeout(
            supabase.rpc("has_role", { _user_id: session.user.id, _role: "staff" }),
          );
          if (!active || thisRequest !== requestId) return;
          if (staffError) throw new Error(staffError.message);
          isStaff = staffRole === true;
        }

        if (isAdmin !== true && !isStaff) {
          goToLogin("not-admin");
          return;
        }

        verifiedUserId = session.user.id;
        hasVerifiedAccess = true;
        setChecking(false);
      } catch (error) {
        if (!active || thisRequest !== requestId) return;
        const message = error instanceof Error ? error.message : "تعذر التحقق من صلاحية الإدارة.";
        // Fail closed on first check; after a successful check, keep the current
        // page mounted during transient refresh issues so unsaved form state survives.
        if (!hasVerifiedAccess) {
          setVerificationError(message);
          setChecking(false);
        }
      }
    };

    void verifyAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        goToLogin();
        return;
      }
      // Do not call Supabase RPC from inside onAuthStateChange; it can contend
      // with the auth lock. Deferring also prevents token refresh from blocking UI.
      window.setTimeout(() => {
        if (active) void verifyAccess(session);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [allowStaff, onUnauthorized, redirectTo, retryVersion]);

  if (checking) {
    return (
      <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#F7E8D1] p-6 text-[#201A17]">
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <span className="size-5 animate-spin rounded-full border-2 border-[#873512]/20 border-t-[#873512]" />
          <span className="text-sm font-bold">جارٍ التحقق من صلاحية الإدارة…</span>
        </div>
      </main>
    );
  }

  if (verificationError) {
    return (
      <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#F7E8D1] p-6 text-[#201A17]">
        <section role="alert" className="max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-black">تعذر التحقق من صلاحية الإدارة</h1>
          <p className="mt-2 text-sm text-slate-600">لم أفتح الصفحة لأن التحقق الأمني لم يكتمل.</p>
          <p className="mt-2 text-xs text-rose-700" dir="auto">{verificationError}</p>
          <button type="button" onClick={() => setRetryVersion((value) => value + 1)} className="mt-5 rounded-xl bg-[#0F4C81] px-5 py-3 text-sm font-bold text-white">
            إعادة المحاولة
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export default AdminRouteGuard;
