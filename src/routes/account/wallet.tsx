import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { List, Plus, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/wallet")({
  head: () => ({
    meta: [
      { title: "الرصيد — السوق الشامل" },
      { name: "description", content: "رصيدك وسجل عملياتك في السوق الشامل." },
      { property: "og:title", content: "الرصيد — السوق الشامل" },
      { property: "og:description", content: "رصيدك وسجل عملياتك في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

type Tx = { id: string; amount: number; description: string | null; created_at: string };

function WalletPage() {
  const { user } = useSession();
  const [tx, setTx] = useState<Tx[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("wallet_transactions").select("id,amount,description,created_at").order("created_at", { ascending: false })
      .then(({ data }) => setTx((data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }))));
  }, [user]);

  const adds = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const subs = tx.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const fmt = (n: number) => n.toLocaleString("ar-YE");

  return (
    <AccountShell title="الرصيد">
      <div className="flex items-center justify-between rounded-3xl bg-card p-5 ring-1 ring-border">
        <div>
          <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
          <p className="font-display text-3xl font-black text-cocoadeep">{fmt(adds - subs)} <span className="text-sm">ر.ي</span></p>
        </div>
        <a href="https://wa.me/967700000000?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%B4%D8%AD%D9%86%20%D8%B1%D8%B5%D9%8A%D8%AF%D9%8A" target="_blank" rel="noreferrer" aria-label="شحن الرصيد" className="grid size-12 place-items-center rounded-2xl bg-cocoa text-cream shadow">
          <Plus className="size-5" />
        </a>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["عدد العمليات", tx.length], ["الإضافات", adds], ["الخصومات", subs]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl bg-card p-3 text-center ring-1 ring-border">
            <p className="text-[11px] text-muted-foreground">{l}</p>
            <p className="font-display font-black text-cocoadeep">{fmt(v as number)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-3xl bg-card p-4 ring-1 ring-border">
        <p className="mb-3 flex items-center gap-2 font-display text-sm font-black text-cocoadeep"><List className="size-4 text-clay" /> سجل العمليات</p>
        {tx.length === 0 ? <EmptyState icon={<Wallet className="size-6" />} title="لا توجد عمليات حتى الآن" /> : (
          <div className="space-y-2">
            {tx.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl bg-background p-3 ring-1 ring-border">
                <div>
                  <p className="text-sm font-bold text-cocoadeep">{t.description || "عملية"}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar")}</p>
                </div>
                <p dir="ltr" className={`font-display font-black ${t.amount >= 0 ? "text-clay" : "text-destructive"}`}>{t.amount >= 0 ? "+" : ""}{fmt(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountShell>
  );
}
