import { ScanLine, X } from "lucide-react";
import { useState } from "react";
import type { OrderItem } from "./types";

export function QuickScanModal({
  orders,
  onClose,
}: {
  orders: OrderItem[];
  onClose: () => void;
}) {
  const [quickScanInput, setQuickScanInput] = useState("");
  const [quickScanResult, setQuickScanResult] = useState<OrderItem | null>(null);

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickScanInput.trim().toLowerCase();
    if (!query) return;

    const found = orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === query ||
        (o.intlTrackingNumber && o.intlTrackingNumber.toLowerCase() === query),
    );

    if (found) {
      setQuickScanResult(found);
    } else {
      alert("لم يتم العثور على شحنة تطابق هذا الرقم.");
      setQuickScanResult(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-sky-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-right text-[#0A2540]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-black text-[#0A2540]">فحص سريع برقم التتبع</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleQuickScan} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-bold">اكتب رقم الشحنة أو التتبع (مثال: SQ-892411):</label>
            <input type="text" autoFocus placeholder="SQ-xxxxxx" value={quickScanInput} onChange={(e) => setQuickScanInput(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-sky-200 text-[#0A2540] font-mono text-center text-lg font-black outline-none tracking-wider focus:bg-white focus:border-[#0284C7]" />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] hover:from-[#0A2540] font-black text-xs text-white shadow-md cursor-pointer">بحث وفحص</button>
        </form>

        {quickScanResult && (
          <div className="mt-4 p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#0F4C81] font-black">{quickScanResult.orderNumber}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">{quickScanResult.status}</span>
            </div>
            <div className="text-[#0A2540] font-bold">{quickScanResult.customerName}</div>
            <div className="text-slate-600">{quickScanResult.productTitle}</div>
          </div>
        )}
      </div>
    </div>
  );
}
