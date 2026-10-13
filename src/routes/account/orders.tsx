import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, Package, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/use-session';
import { AccountShell, EmptyState } from '@/components/AccountShell';

export const Route = createFileRoute('/account/orders')({
  head: () => ({
    meta: [
      { title: 'طلباتي — السوق الشامل' },
      {
        name: 'description',
        content: 'كل طلباتك وحالتها في السوق الشامل.',
      },
    ],
  }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  tracking_code: string | null;
  status: string | null;
  product_name: string | null;
  product_link: string | null;
  created_at: string | null;
};

const statusLabels: Record<string, string> = {
  new: 'جديد',
  reviewing: 'قيد المراجعة',
  purchased: 'تم الشراء',
  warehouse_china: 'مستودع الصين',
  international_ship: 'شحن دولي',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

function OrdersPage() {
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (sessionLoading) return;

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    async function loadOrders() {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('orders')
        .select(
          'id,tracking_code,status,product_name,product_link,created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isActive) return;

      if (queryError) {
        setOrders([]);
        setError(`تعذر تحميل الطلبات: ${queryError.message}`);
      } else {
        setOrders((data ?? []) as OrderRow[]);
      }

      setLoading(false);
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, [user, sessionLoading, reloadKey]);

  return (
    <AccountShell title="طلباتي">
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display font-black text-cocoadeep">
            {orders.length} طلب
          </p>

          <Link
            to="/new-order"
            className="flex items-center gap-1 rounded-xl bg-cocoa px-3 py-2 text-xs font-bold text-cream"
          >
            <Plus className="size-4" />
            طلب جديد
          </Link>
        </div>

        {loading ? (
          <div
            role="status"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            جارٍ تحميل طلباتك…
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold ring-1 ring-red-200"
            >
              <RefreshCw className="size-4" />
              إعادة المحاولة
            </button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="size-6" />}
            title="لا توجد طلبات بعد"
            text="الطلبات التي ترسلها وأنت مسجّل دخول تظهر هنا."
          />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const status = order.status ?? '';
              const content = (
                <>
                  <Package className="size-5 shrink-0 text-clay" />

                  <div className="min-w-0 flex-1">
                    <p
                      dir="ltr"
                      className="text-right font-display text-sm font-black text-cocoadeep"
                    >
                      {order.tracking_code || 'طلب بدون رمز تتبع'}
                    </p>

                    <p className="truncate text-[11px] text-muted-foreground">
                      {order.product_name ||
                        order.product_link ||
                        'طلب تسوق'}
                    </p>

                    {order.created_at && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('ar')}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-clay">
                    {statusLabels[status] || status || 'غير محدد'}
                  </span>

                  {order.tracking_code && (
                    <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </>
              );

              return order.tracking_code ? (
                <Link
                  key={order.id}
                  to="/track/$trackingCode"
                  params={{ trackingCode: order.tracking_code }}
                  className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={order.id}
                  className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border"
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AccountShell>
  );
}
