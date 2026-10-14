import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/invoices")({
  component: AccountInvoicesPage,
});

type Invoice = {
  id: string;
  client: string | null;
  total: number | string | null;
  created_at: string | null;
  order_id: string | null;
};

function AccountInvoicesPage() {
  const { user, loading: sessionLoading } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading || !user) return;

    let active = true;

    async function loadInvoices() {
      setLoading(true);
      setError("");

      // Cast مؤقت لأن تعريفات Supabase المحلية في المشروع لا تتضمن sales_invoices.
      const db = supabase as any;
      const { data, error: queryError } = await db
        .from("sales_invoices")
        .select("id,client,total,created_at,order_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (queryError) {
        setError("تعذر تحميل فواتيرك. حاول مرة أخرى.");
        setInvoices([]);
      } else {
        setInvoices((data ?? []) as Invoice[]);
      }

      setLoading(false);
    }

    void loadInvoices();
    return () => {
      active = false;
    };
  }, [user, sessionLoading]);

  return (
    <AccountShell title="فواتيري">
      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border">
        {loading ? (
          <p role="status" className="py-8 text-center text-sm">
            جارٍ تحميل فواتيرك…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold"
            >
              <RefreshCw className="size-4" />
              إعادة المحاولة
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="لا توجد فواتير مرتبطة بحسابك"
            text="الفواتير القديمة التي لم تُربط بمستخدم لن تظهر هنا."
          />
        ) : (
          invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-cocoadeep">
                    فاتورة {invoice.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {invoice.created_at
                      ? new Date(invoice.created_at).toLocaleDateString("ar")
                      : "التاريخ غير متوفر"}
                  </p>
                </div>
                <Receipt className="size-5 text-clay" />
              </div>
              <p className="mt-3 text-sm">
                العميل: {invoice.client || "غير محدد"}
              </p>
              <p className="mt-1 text-sm font-bold">
                الإجمالي المسجل:{" "}
                {invoice.total == null
                  ? "غير محدد"
                  : Number(invoice.total).toLocaleString("ar")}
              </p>
            </article>
          ))
        )}
      </section>
    </AccountShell>
  );
}
