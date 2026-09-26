import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Package, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/orders")({
  head: () => ({
    meta: [
      { title: "طلباتي — السوق الشامل" },
      { name: "description", content: "كل طلباتك وحالتها في السوق الشامل." },
      { property: "og:title", content: "طلباتي — السوق الشامل" },
      { property: "og:description", content: "كل طلباتك وحالتها في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

type O = { id: string; tracking_code: string; status: string; product_name: string | null; product_link: string; created_at: string };

function OrdersPage() {
  const { user } = useSession();
  const [orders, setOrders] = useState<O[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,tracking_code,status,product_name,product_link,created_at").eq("user_id", user.id)
      .order("created_at", { ascending: false }).then(({ data }) => setOrders(data ?? []));
  }, [user]);

  return (
    <AccountShell title="طلباتي">
      <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display font-black text-cocoadeep">{orders.length} طلب</p>
          <Link to="/new-order" className="flex items-center gap-1 rounded-xl bg-cocoa px-3 py-2 text-xs font-bold text-cream"><Plus className="size-4" /> طلب جديد</Link>
        </div>
        {orders.length === 0 ? <EmptyState icon={<Package className="size-6" />} title="لا توجد طلبات بعد" text="الطلبات التي ترسلها وأنت مسجّل دخول تظهر هنا." /> : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link key={o.id} to="/track/$trackingCode" params={{ trackingCode: o.tracking_code }} className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
                <Package className="size-5 shrink-0 text-clay" />
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="text-right font-display text-sm font-black text-cocoadeep">{o.tracking_code}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{o.product_name || o.product_link}</p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-clay">{o.status}</span>
                <ChevronLeft className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AccountShell>
  );
}
