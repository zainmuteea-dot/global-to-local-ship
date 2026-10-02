import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
const db = supabase as any;

export type MenuItem = {
  id: string;
  section: string;
  title: string;
  path: string | null;
  icon: string | null;
  badge: string | null;
  sort_order: number;
};

export function useSidebarMenu(section: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
     .from("sidebar_menu")
     .select("*")
     .eq("section", section)
     .eq("is_active", true)
     .order("sort_order")
     .then(({ data }) => {
        if (data) setItems(data as MenuItem[]);
        setLoading(false);
      });
  }, [section]);

  return { items, loading };
}
