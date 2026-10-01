import { Printer, X } from "lucide-react";
import type { OrderItem } from "./types";

export function PrintReceiptModal({
  order,
  onClose,
}: {
  order: OrderItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-sky-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-center space-y-4 text-[#0A2540]">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mx-auto">
          <Printer className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h3 className="text-base font-black">سند شحن وبوليصة استلام</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{order.orderNumber}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-right space-y-1.5">
          <div><strong>العميل:</strong> {order.customerName}</div>
          <div><strong>الهاتف:</strong> {order.customerPhone}</div>
          <div><strong>المدينة:</strong> {order.customerCity || "صنعاء"}</div>
          <div><strong>المحتوى:</strong> {order.productTitle}</div>
          <div><strong>المبلغ:</strong> {order.originalPrice} ر.س</div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">إغلاق</button>
          <button onClick={() => { window.print(); onClose(); }} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white text-xs font-bold">طباعة</button>
        </div>
      </div>
    </div>
  );
}
