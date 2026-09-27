import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function useSession(required = true) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!alive) return;
      setSession(s); setUser(s?.user?? null); setLoading(false);
      if (required &&!s) navigate({ to: "/login" });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return;
      setSession(s); setUser(s?.user?? null); setLoading(false);
      if (required &&!s) navigate({ to: "/login" });
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [navigate, required]);

  return { session, user, loading };
}
