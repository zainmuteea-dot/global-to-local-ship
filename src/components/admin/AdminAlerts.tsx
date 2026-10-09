import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Alert = {
  key: string;
  code: string;
  name: string;
  phone: string;
  reason: string;
  tone: "red" | "amber" | "green";
};

const DONE = /تم التسليم|ملغي|مكتمل/;
// رقم الإدارة بصيغة دولية، بدون علامة +.
const ADMIN_WHATSAPP_NUMBER = "967773370041";

export function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pendingPays, setPendingPays] = useState(0);

  const load = async () => {
    const [{ data: orders }, { data: pays }] = await Promise.all([
      supabase
        .from("orders")
        .select("tracking_code,customer_name,phone,status,updated_at,created_at")
        .order("updated_at", { ascending: true })
        .limit(200),
      supabase
        .from("payments")
        .select("id,tracking_code,customer_name,phone")
        .eq("status", "pending"),
    ]);

    const now = Date.now();
    const list: Alert[] = [];

    (pays ?? []).forEach((payment) =>
      list.push({
        key: `p${payment.id}`,
        code: payment.tracking_code ?? "",
        name: payment.customer_name ?? "",
        phone: payment.phone ?? "",
        reason: "دفعة بانتظار الاعتماد",
        tone: "green",
      }),
    );

    (orders ?? []).forEach((order) => {
      if (DONE.test(order.status ?? "")) return;

      const updatedAt = order.updated_at ?? order.created_at;
      if (!updatedAt) return;
      const hrs = (now - new Date(updatedAt).getTime()) / 36e5;
      if (!Number.isFinite(hrs)) return;

      const alertBase = {
        key: order.tracking_code ?? `order-${updatedAt}`,
        code: order.tracking_code ?? "",
        name: order.customer_name ?? "",
        phone: order.phone ?? "",
      };

      if (hrs >= 72) {
        list.push({
          ...alertBase,
          reason: `متأخر — بدون تحديث منذ ${Math.floor(hrs / 24)} يوم`,
          tone: "red",
        });
      } else if (hrs >= 24) {
        list.push({
          ...alertBase,
          reason: `يحتاج متابعة — منذ ${Math.floor(hrs)} ساعة`,
          tone: "amber",
        });
      }
    });

    setPendingPays(pays?.length ?? 0);
    setAlerts(list);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin_alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, load)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!alerts.length) return null;

  const tone = {
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };

  return (
    <div className="mb-4 bg-white border border-red-100 rounded-2xl p-4 shadow-xs" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-sm text-[#0A2540]">
          ⚠️ تنبيهات تحتاج متابعتك ({alerts.length})
        </h3>
        <Link
          to="/payments"
          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg"
        >
          طلبات الدفع {pendingPays > 0 ? `(${pendingPays})` : ""}
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {alerts.map((alert) => {
          const adminMessage = encodeURIComponent(
            `تنبيه من لوحة الإدارة\n${alert.reason}\nرقم الطلب: ${alert.code || "غير متوفر"}\nالعميل: ${alert.name || "غير معروف"}\nهاتف العميل: ${alert.phone || "غير متوفر"}`,
          );
          const adminWhatsAppUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${adminMessage}`;

          return (
            <div
              key={alert.key}
              className={`border rounded-xl p-3 text-xs ${tone[alert.tone]}`}
            >
              <div className="font-black">{alert.reason}</div>
              <div className="mt-1 font-bold text-slate-700">
                {alert.name || "عميل"} •{" "}
                <span dir="ltr">{alert.phone || "لا يوجد رقم هاتف"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to={alert.tone === "green" ? "/payments" : "/track/$trackingCode"}
                  params={{ trackingCode: alert.code } as never}
                  className="px-2 py-1 rounded-lg bg-[#0F4C81] text-white font-bold"
                >
                  فتح الطلب {alert.code}
                </Link>
                <a
                  href={adminWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                >
                  مراسلة الإدارة واتساب
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
