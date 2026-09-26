import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات — السوق الشامل" },
      { name: "description", content: "آخر الإشعارات والعروض من السوق الشامل." },
      { property: "og:title", content: "الإشعارات — السوق الشامل" },
      { property: "og:description", content: "آخر الإشعارات والعروض من السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

type N = { id: string; title: string; body: string | null; created_at: string };

function NotificationsPage() {
  const { user } = useSession();
  const [list, setList] = useState<N[]>([]);
  const [on, setOn] = useState(true);

  useEffect(() => { setOn(localStorage.getItem("sc_notify") !== "0"); }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("id,title,body,created_at").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  }, [user]);

  const toggle = async () => {
    const next = !on;
    if (next && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    setOn(next);
    localStorage.setItem("sc_notify", next ? "1" : "0");
  };

  return (
    <AccountShell title="الإشعارات">
      <div className="flex items-center gap-3 rounded-3xl bg-card p-4 ring-1 ring-border">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-clay"><Bell className="size-5" /></span>
        <div className="flex-1">
          <p className="font-display text-sm font-black text-cocoadeep">الإشعارات الفورية</p>
          <p className="text-[11px] text-muted-foreground">شغّل أو أوقف الإشعارات لهذا الجهاز مباشرة من هنا.</p>
        </div>
        <button onClick={toggle} role="switch" aria-checked={on} className={`relative h-7 w-12 rounded-full transition ${on ? "bg-wa" : "bg-border"}`}>
          <span className={`absolute top-1 size-5 rounded-full bg-card transition-all ${on ? "left-1" : "left-6"}`} />
        </button>
      </div>
      <div className="mt-3 space-y-2 rounded-3xl bg-card p-3 ring-1 ring-border">
        {list.length === 0 ? <EmptyState icon={<Bell className="size-6" />} title="لا توجد إشعارات حالياً" /> : list.map((n) => (
          <div key={n.id} className="flex gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-clay"><Bell className="size-4" /></span>
            <div>
              <p className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("ar")}</p>
              <p className="text-sm font-bold text-cocoadeep">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </AccountShell>
  );
}
