import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/admin-client-detail")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : "",
  }),
  component: () => (
    <AdminRouteGuard allowStaff redirectTo="/admin-client-detail">
      <AdminClientDetail />
    </AdminRouteGuard>
  ),
});

function AdminClientDetail() {
  const { id: clientId } = Route.useSearch();
  const [client, setClient] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError("");
      setClient(null);
      setOrders([]);
      try {
        if (!clientId) throw new Error("لم يُحدد العميل.");
        const [profileResult, ordersResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
          supabase
            .from("orders")
            .select("*")
            .eq("user_id", clientId)
            .order("created_at", { ascending: false }),
        ]);
        if (profileResult.error || ordersResult.error) {
          throw new Error("تعذر تحميل بيانات العميل. تحقق من الاتصال والصلاحيات.");
        }
        if (!active) return;
        setClient(profileResult.data);
        setOrders(ordersResult.data ?? []);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "تعذر تحميل البيانات.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, [clientId]);

  if (loading)
    return (
      <div className="p-8 text-center" role="status">
        جارٍ تحميل بيانات العميل…
      </div>
    );
  if (error)
    return (
      <div className="p-8" role="alert">
        {error}
      </div>
    );
  if (!client) return <div className="p-8">العميل غير موجود</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <header className="mb-6 rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">بيانات العميل: {client.full_name || "عميل"}</h1>
        <p className="mt-2 text-gray-600">{client.phone || "لم يُسجل رقم هاتف"}</p>
        <div className="mt-4 flex gap-4">
          <Link to="/admin-clients" className="text-blue-700 underline">
            رجوع للعملاء
          </Link>
          <Link to="/client-reports" className="text-blue-700 underline">
            كشف الحساب والدفعات المعتمدة
          </Link>
        </div>
      </header>
      <section className="overflow-x-auto rounded-lg bg-white shadow">
        <h2 className="bg-gray-900 p-4 font-bold text-white">طلبات العميل ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="p-6">لا توجد طلبات مرتبطة بهذا الحساب.</p>
        ) : (
          <table className="w-full text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">رقم التتبع</th>
                <th className="p-3">المنتج</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-mono">{order.tracking_code}</td>
                  <td className="p-3">{order.product_name || "طلب متجر دولي"}</td>
                  <td className="p-3">{order.status}</td>
                  <td className="p-3">{new Date(order.created_at).toLocaleDateString("ar-YE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
