import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteTickerPlacement = "home_guest" | "dashboard" | "both";
export type SiteTickerMessage = {
  id: string;
  message: string;
  placement: SiteTickerPlacement;
  badge: string;
  href: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

function isWithinActivationWindow(row: SiteTickerMessage, now: number) {
  const starts = row.starts_at ? Date.parse(row.starts_at) : null;
  const ends = row.ends_at ? Date.parse(row.ends_at) : null;
  return (starts === null || (Number.isFinite(starts) && starts <= now)) &&
    (ends === null || (Number.isFinite(ends) && ends > now));
}

/** Loads public ticker messages for one placement; does not use customer notifications or SMS. */
export function useSiteTickerMessages(placement: "home_guest" | "dashboard") {
  const [messages, setMessages] = useState<SiteTickerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error: queryError } = await supabase.from("site_ticker_messages")
        .select("id,message,placement,badge,href,sort_order,starts_at,ends_at,is_active")
        .eq("is_active", true)
        .in("placement", [placement, "both"])
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!alive) return;
      if (queryError) {
        console.error("تعذر تحميل رسائل شريط الموقع:", queryError);
        setError("تعذر تحميل رسائل الشريط.");
      } else {
        const now = Date.now();
        const activeRows = ((data ?? []) as SiteTickerMessage[])
          .filter((row) => isWithinActivationWindow(row, now))
          .sort((a, b) => a.sort_order - b.sort_order);
        setMessages(activeRows);
        setError(null);
      }
      setLoading(false);
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [placement]);

  return { messages, loading, error };
}
