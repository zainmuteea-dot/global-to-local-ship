import { useState } from "react";
import { ORDER_STATUSES } from "@/constants/orderStatuses";

export default function Admin() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("الكل");

  const filtered = filter === "الكل" ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="p-4 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-black mb-4">إدارة الطلبات</h1>

      <div className="flex gap-2 flex-wrap mb-4">
        {["الكل", ...ORDER_STATUSES.map(s => s.value)].map(v => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold ${filter === v ? 'bg-amber-900 text-white' : 'bg-amber-100 text-amber-900'}`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold">طلب #{order.id?.slice(0,8)}</span>
              <span className="text-sm bg-amber-100 px-3 py-1 rounded-full">{order.status}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">الزبون: {order.customer_name} - {order.phone}</p>
            {order.delivery_notes && (
              <p className="text-sm font-bold text-amber-800 bg-amber-50 p-2 rounded mt-2">
                ملاحظة التوصيل: {order.delivery_notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
