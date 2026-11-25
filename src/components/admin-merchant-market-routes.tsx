import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertCircle,
  Check,
  Clock3,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Store,
  Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MerchantStore = {
  id: string;
  name: string;
  city: string;
  phone: string;
  ownerName: string;
  status: string;
};

type MerchantOrder = {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  delivery_address: string;
  product_title: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type MarketData = { stores: MerchantStore[]; orders: MerchantOrder[] };

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  new: "طلب جديد",
  awaiting_review: "بانتظار المراجعة",
  confirmed: "تم التأكيد",
  preparing: "قيد التجهيز",
  ready: "جاهز للتوزيع",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
};

const NEXT_STATUS_LABELS: Record<string, string> = {
  confirmed: "تأكيد الطلب",
  preparing: "بدء التجهيز",
  ready: "جاهز للتوزيع",
  delivered: "تم التسليم",
  cancelled: "إلغاء الطلب",
};

async function loadMerchantMarket(): Promise<MarketData> {
  const db = supabase as any;
  const [storesResult, ordersResult] = await Promise.all([
    db.rpc("merchant_admin_list_stores"),
    db
      .from("merchant_orders")
      .select(
        "id, store_id, customer_name, customer_phone, customer_city, delivery_address, product_title, quantity, total_amount, currency, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (storesResult.error) throw storesResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const rawStores = (storesResult.data ?? []) as Array<Record<string, unknown>>;
  const ownerIds = [...new Set(rawStores.map((store) => String(store["owner_id"] ?? "")).filter(Boolean))];
  let ownersById: Record<string, string> = {};

  if (ownerIds.length > 0) {
    const { data: profiles, error } = await db
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);
    if (error) throw error;
    ownersById = Object.fromEntries(
      (profiles ?? []).map((profile: { id: string; full_name: string | null }) => [
        profile.id,
        profile.full_name || "مالك المتجر",
      ]),
    );
  }

  return {
    stores: rawStores.map((store) => ({
      id: String(store["id"]),
      name: String(store["name"] || "متجر"),
      city: String(store["city"] || "غير محددة"),
      phone: String(store["contact_phone"] || ""),
      ownerName: ownersById[String(store["owner_id"])] || "مالك المتجر",
      status: String(store["status"] || "active"),
    })),
    orders: (ordersResult.data ?? []) as MerchantOrder[],
  };
}

function orderCode(id: string): string {
  return id.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ar-YE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminMerchantMarketRoutes() {
  const { data, error, isLoading, mutate } = useSWR("admin-merchant-market", loadMerchantMarket, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  const [query, setQuery] = useState("");
  const [driverDrafts, setDriverDrafts] = useState<Record<string, string>>({});
  const [assignedDrivers, setAssignedDrivers] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const storesById = useMemo(
    () => Object.fromEntries((data?.stores ?? []).map((store) => [store.id, store])),
    [data?.stores],
  );
  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return (data?.orders ?? []).filter((order) => {
      if (!normalizedQuery) return true;
      const storeName = storesById[order.store_id]?.name ?? "";
      return [
        orderCode(order.id),
        order.customer_name,
        order.customer_phone,
        order.customer_city,
        order.product_title,
        storeName,
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [data?.orders, query, storesById]);
  const ordersByCity = useMemo(() => {
    return filteredOrders.reduce<Record<string, MerchantOrder[]>>((groups, order) => {
      const city = order.customer_city?.trim() || "غير محددة";
      (groups[city] ??= []).push(order);
      return groups;
    }, {});
  }, [filteredOrders]);
  const cities = Object.keys(ordersByCity).sort((a, b) => a.localeCompare(b, "ar"));
  const pendingCount = (data?.orders ?? []).filter((order) =>
    ["pending", "new", "awaiting_review"].includes(order.status),
  ).length;

  const saveOrderStatus = async (order: MerchantOrder, nextStatus: string) => {
    if (!NEXT_STATUSES[order.status]?.includes(nextStatus)) return;
    setSavingOrderId(order.id);
    setNotice(null);
    try {
      const { error: updateError } = await (supabase as any).rpc("merchant_update_order_status", {
        _order_id: order.id,
        _next_status: nextStatus,
      });
      if (updateError) throw updateError;
      setNotice({ type: "success", text: `تم تحديث حالة الطلب #${orderCode(order.id)}.` });
      await mutate();
    } catch {
      setNotice({
        type: "error",
        text: "تعذر تحديث الحالة. تحقّق من صلاحية الإدارة وانتقال الحالة المسموح.",
      });
    } finally {
      setSavingOrderId(null);
    }
  };

  const assignDriver = (city: string) => {
    const driverName = driverDrafts[city]?.trim();
    if (!driverName) return;
    setAssignedDrivers((current) => ({ ...current, [city]: driverName }));
    setNotice({
      type: "success",
      text: `تم تعيين ${driverName} لمسار ${city} لهذه الجلسة.`,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-[#0A2540] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-300" /> إدارة التوزيع المحلي
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">إدارة سوق التجار على المسارات</h1>
            <p className="mt-2 text-sm text-slate-200">متابعة المتاجر وطلبات التجار وتوزيعها حسب مدينة العميل.</p>
          </div>
          <button
            type="button"
            onClick={() => void mutate()}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10 sm:self-auto"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} /> تحديث البيانات
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="ملخص سوق التجار">
          <SummaryCard icon={<Store className="size-5" />} label="التجار المسجلون" value={data?.stores.length ?? 0} />
          <SummaryCard icon={<Package className="size-5" />} label="طلبات التجار" value={data?.orders.length ?? 0} />
          <SummaryCard icon={<Clock3 className="size-5" />} label="بانتظار التوزيع" value={pendingCount} accent />
        </section>

        {notice && (
          <p
            role={notice.type === "error" ? "alert" : "status"}
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              notice.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {notice.text}
          </p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="text-lg font-black text-[#0A2540]">طلبات التجار حسب المدينة</h2>
                <p className="mt-1 text-xs text-slate-500">كل مجموعة مدينة تمثل مسار توزيع مستقل.</p>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <span className="sr-only">ابحث في طلبات التجار</span>
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="بحث بالعميل أو رقم الطلب أو المتجر"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pe-9 ps-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                />
              </label>
            </div>

            {isLoading && !data ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-bold text-slate-500" role="status">
                <RefreshCw className="size-4 animate-spin" /> جارٍ تحميل بيانات السوق…
              </div>
            ) : error ? (
              <div className="m-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-black">تعذر تحميل بيانات التجار والطلبات.</p>
                  <p className="mt-1">تحقق من اتصال Supabase وصلاحية حساب الإدارة، ولم نعرض النتيجة كأنها صفر.</p>
                  <button type="button" onClick={() => void mutate()} className="mt-3 font-bold underline">إعادة المحاولة</button>
                </div>
              </div>
            ) : cities.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">لا توجد طلبات تجار مطابقة حالياً.</div>
            ) : (
              <div className="space-y-5 p-3 sm:p-5">
                {cities.map((city) => (
                  <section key={city} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><MapPin className="size-5" /></span>
                        <div>
                          <h3 className="font-black text-[#0A2540]">مسار {city}</h3>
                          <p className="text-xs text-slate-500">{ordersByCity[city]?.length ?? 0} طلبات</p>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px] sm:flex-row">
                        <label className="sr-only" htmlFor={`driver-${city}`}>اسم السائق لمسار {city}</label>
                        <input
                          id={`driver-${city}`}
                          value={driverDrafts[city] ?? assignedDrivers[city] ?? ""}
                          onChange={(event) => setDriverDrafts((current) => ({ ...current, [city]: event.target.value }))}
                          placeholder="اسم السائق لهذا المسار"
                          className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700"
                        />
                        <button
                          type="button"
                          onClick={() => assignDriver(city)}
                          disabled={!driverDrafts[city]?.trim()}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 text-xs font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Truck className="size-4" /> تعيين السائق
                        </button>
                      </div>
                    </div>
                    {assignedDrivers[city] && (
                      <p className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
                        <Check className="size-4" /> السائق المعيّن لهذه الجلسة: {assignedDrivers[city]}
                      </p>
                    )}
                    <div className="divide-y divide-slate-100">
                      {(ordersByCity[city] ?? []).map((order) => {
                        const store = storesById[order.store_id];
                        const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                        return (
                          <article key={order.id} className="space-y-3 p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-black text-[#0A2540]">طلب #{orderCode(order.id)}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatDate(order.created_at)}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                ["pending", "new", "awaiting_review"].includes(order.status)
                                  ? "bg-amber-100 text-amber-800"
                                  : order.status === "delivered"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : order.status === "cancelled"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-sky-100 text-sky-800"
                              }`}>
                                {STATUS_LABELS[order.status] ?? order.status}
                              </span>
                            </div>
                            <div className="grid gap-3 text-sm sm:grid-cols-2">
                              <div className="min-w-0">
                                <p className="font-bold">{order.customer_name || "عميل"}</p>
                                <a href={`tel:${order.customer_phone}`} className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-700">
                                  <Phone className="size-3.5" /> {order.customer_phone}
                                </a>
                                <p className="mt-1 break-words text-xs text-slate-500">{order.delivery_address}</p>
                              </div>
                              <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                                <p className="font-bold">{order.product_title}</p>
                                <p className="mt-1 text-xs text-slate-500">{store?.name ?? "متجر"} · الكمية {order.quantity}</p>
                                <p className="mt-2 font-black text-emerald-800">{Number(order.total_amount || 0).toLocaleString("ar-YE")} {order.currency}</p>
                              </div>
                            </div>
                            {nextStatuses.length > 0 ? (
                              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                {nextStatuses.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => void saveOrderStatus(order, status)}
                                    disabled={savingOrderId === order.id}
                                    className={`min-h-9 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50 ${
                                      status === "cancelled"
                                        ? "border border-red-200 text-red-700 hover:bg-red-50"
                                        : "bg-[#0A2540] text-white hover:bg-slate-800"
                                    }`}
                                  >
                                    {savingOrderId === order.id ? "جارٍ الحفظ…" : NEXT_STATUS_LABELS[status]}
                                  </button>
                                ))}
                              </div>
                            ) : ["new", "awaiting_review"].includes(order.status) ? (
                              <p className="border-t border-amber-100 pt-3 text-xs text-amber-800">
                                يلزم أن تكون الحالة «بانتظار التأكيد» لتحديثها عبر انتقال الحالة الآمن.
                              </p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <h2 className="text-lg font-black text-[#0A2540]">قائمة التجار</h2>
                <p className="mt-1 text-xs text-slate-500">المتاجر المسجلة وحالة كل متجر.</p>
              </div>
              {isLoading && !data ? (
                <div className="p-6 text-center text-sm text-slate-500">جارٍ تحميل التجار…</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(data?.stores ?? []).map((store) => (
                    <article key={store.id} className="flex items-start gap-3 p-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-800"><Store className="size-5" /></span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-[#0A2540]">{store.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{store.ownerName} · {store.city}</p>
                        {store.phone && <a href={`tel:${store.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Phone className="size-3" />{store.phone}</a>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${store.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {store.status === "active" ? "نشط" : "موقوف"}
                      </span>
                    </article>
                  ))}
                  {!isLoading && !error && (data?.stores.length ?? 0) === 0 && (
                    <p className="p-6 text-center text-sm text-slate-500">لا توجد متاجر مسجلة.</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <p>تعيين السائق ظاهر لهذه الجلسة فقط حالياً؛ جدول الطلبات لا يتضمن حقولاً للمسار أو السائق، وتعذّر الوصول إلى صلاحية تعديل مخطط Supabase. تحديث حالة الطلب محفوظ عبر إجراء الإدارة الآمن.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-3 grid size-10 place-items-center rounded-xl ${accent ? "bg-amber-100 text-amber-800" : "bg-sky-50 text-sky-800"}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#0A2540]">{value.toLocaleString("ar-YE")}</p>
    </article>
  );
}
