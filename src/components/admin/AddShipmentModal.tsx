import { PlusCircle, X } from "lucide-react";
import { useState } from "react";
import type { OrderItem, OrderStatus } from "./types";

type NewOrderForm = {
  customerName: string;
  customerPhone: string;
  customerCity: string;
  storeName: string;
  productTitle: string;
  originalPrice: string;
  status: OrderStatus;
  trackingNumber: string;
};

const emptyForm: NewOrderForm = {
  customerName: "",
  customerPhone: "",
  customerCity: "صنعاء",
  storeName: "SHEIN",
  productTitle: "",
  originalPrice: "",
  status: "new",
  trackingNumber: "",
};

export function AddShipmentModal({
  onCreate,
  onClose,
}: {
  onCreate: (order: OrderItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<NewOrderForm>(emptyForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      alert("يرجى إدخال اسم العميل ورقم هاتفه.");
      return;
    }
    const orderNum = `SQ-${Math.floor(100000 + Math.random() * 900000)}`;
    onCreate({
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerCity: form.customerCity || "صنعاء",
      storeName: form.storeName,
      productTitle: form.productTitle.trim() || "طرد بضائع مستوردة",
      originalPrice: Number(form.originalPrice) || 0,
      status: form.status,
      intlTrackingNumber: form.trackingNumber.trim() || orderNum,
      createdAt: new Date().toISOString(),
    });
    setForm(emptyForm);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-sky-200 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl text-right text-[#0A2540]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-sm">
              <PlusCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0A2540]">إضافة طلب شحن جديد</h3>
              <p className="text-xs text-slate-500">تسجيل طرد وشحنة جديدة في منظومة التوزيع</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم العميل المستلم *</label>
            <input type="text" required placeholder="مثال: محمد عبد الله" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الهاتف *</label>
              <input type="text" required dir="ltr" placeholder="770000000" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-mono text-left outline-none focus:bg-white focus:border-[#0284C7]" />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">المدينة</label>
              <input type="text" placeholder="صنعاء / عدن / تعز" value={form.customerCity} onChange={(e) => setForm({ ...form, customerCity: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">المتجر / المصدر</label>
              <select value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-bold outline-none focus:bg-white focus:border-[#0284C7]">
                <option value="SHEIN">شي إن (SHEIN)</option>
                <option value="TEMU">تيمو (TEMU)</option>
                <option value="Amazon">أمازون (Amazon)</option>
                <option value="AliExpress">علي إكسبريس</option>
                <option value="Trendyol">ترينديول</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">المبلغ (SAR)</label>
              <input type="number" placeholder="150" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] font-mono outline-none focus:bg-white focus:border-[#0284C7]" />
            </div>
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف المنتج</label>
            <input type="text" placeholder="مثال: فستان + حذاء" value={form.productTitle} onChange={(e) => setForm({ ...form, productTitle: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#0A2540] outline-none focus:bg-white focus:border-[#0284C7]" />
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer font-bold">إلغاء</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] text-white font-black shadow-md shadow-orange-500/25 cursor-pointer">حفظ وتسجيل</button>
          </div>
        </form>
      </div>
    </div>
  );
}
