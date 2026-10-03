// src/components/admin/PrintReceiptModal.tsx
import { Printer, X, ShieldCheck } from "lucide-react";

export interface OrderItem {
  orderNumber?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerCity?: string | null;
  productTitle?: string | null;
  originalPrice?: string | number | null;
}

interface PrintReceiptModalProps {
  order: OrderItem;
  onClose: () => void;
}

export function PrintReceiptModal({ order, onClose }: PrintReceiptModalProps) {
  const orderCode = order.orderNumber || "SQ-800816";
  const receiptNo = `RCP-${orderCode.replace(/^SQ-?/i, "")}`;
  const currentDate = new Date().toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* الحاوية الرئيسية للنافذة */}
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">

        {/* شريط الإجراءات العلوي (يختفي عند الطباعة الورقية) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 print:hidden">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-right">
            <h2 className="text-sm font-bold text-slate-800">سند قبض رسمي مع باركود الكود</h2>
            <p className="text-[11px] text-slate-500 font-mono">
              رقم الكود: <span className="text-purple-700 font-bold">{orderCode}</span> | السند: {receiptNo}
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            طباعة السند
          </button>
        </div>

        {/* جسم السند الرسمي القابل للطباعة */}
        <div dir="rtl" className="p-6 sm:p-8 space-y-6 text-slate-900 font-sans print:p-0">

          {/* 1. الترويسة العليا: الشعار والباركود */}
          <div className="flex items-start justify-between border-b border-slate-300 pb-5">
            {/* جهة اليمين: الهوية والبيانات الرسمية */}
            <div className="text-right space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-900 text-white flex items-center justify-center font-black shadow">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">السوق الشامل</h1>
              </div>
              <div>
                <span className="inline-block bg-purple-100 text-purple-800 text-[10px] font-bold px-3 py-0.5 rounded-full">
                  خدمات الاستيراد والشحن الدولي
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                وساطة شراء وشحن رسمي من المتاجر العالمية إلى اليمن
              </p>
              <p className="text-[10px] text-slate-500">
                صنعاء / عدن - خدمة العملاء: <span className="font-mono font-bold">770000000</span>
              </p>
            </div>

            {/* جهة اليسار: باركود التحقق والتوثيق */}
            <div className="flex flex-col items-center">
              <div className="bg-black text-white text-[10px] font-bold px-3 py-0.5 rounded-t-lg">
                سند قبض رسمي معتمد
              </div>
              <div className="border border-slate-300 rounded-b-xl p-3 bg-white text-center shadow-xs">
                <svg className="w-44 h-12" viewBox="0 0 160 40">
                  <rect x="5" y="0" width="3" height="40" fill="#000" />
                  <rect x="11" y="0" width="2" height="40" fill="#000" />
                  <rect x="16" y="0" width="5" height="40" fill="#000" />
                  <rect x="25" y="0" width="2" height="40" fill="#000" />
                  <rect x="30" y="0" width="4" height="40" fill="#000" />
                  <rect x="38" y="0" width="1" height="40" fill="#000" />
                  <rect x="42" y="0" width="6" height="40" fill="#000" />
                  <rect x="52" y="0" width="2" height="40" fill="#000" />
                  <rect x="58" y="0" width="4" height="40" fill="#000" />
                  <rect x="66" y="0" width="3" height="40" fill="#000" />
                  <rect x="73" y="0" width="5" height="40" fill="#000" />
                  <rect x="82" y="0" width="2" height="40" fill="#000" />
                  <rect x="88" y="0" width="4" height="40" fill="#000" />
                  <rect x="96" y="0" width="2" height="40" fill="#000" />
                  <rect x="102" y="0" width="5" height="40" fill="#000" />
                  <rect x="111" y="0" width="2" height="40" fill="#000" />
                  <rect x="117" y="0" width="4" height="40" fill="#000" />
                  <rect x="125" y="0" width="3" height="40" fill="#000" />
                  <rect x="132" y="0" width="5" height="40" fill="#000" />
                  <rect x="141" y="0" width="2" height="40" fill="#000" />
                  <rect x="147" y="0" width="4" height="40" fill="#000" />
                </svg>
                <div className="font-mono text-xs font-bold text-slate-800 tracking-widest mt-1">
                  * {orderCode} *
                </div>
                <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  باركود التحقق الإلكتروني
                </div>
              </div>
            </div>
          </div>

          {/* 2. شبكة بيانات العميل والأكواد */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-wrap justify-between text-xs gap-4">
            <div className="space-y-1.5 min-w-[200px]">
              <div>
                <span className="text-slate-500">اسم العميل:</span>{" "}
                <strong className="text-slate-900">{order.customerName || "zain muteea"}</strong>
              </div>
              <div>
                <span className="text-slate-500">رقم الجوال:</span>{" "}
                <strong className="text-slate-900 font-mono" dir="ltr">{order.customerPhone || "772399744"}</strong>
              </div>
              <div>
                <span className="text-slate-500">المدينة والعنوان:</span>{" "}
                <strong className="text-slate-900">{order.customerCity || "صنعاء"}</strong>
              </div>
            </div>

            <div className="space-y-1.5 min-w-[180px] text-left font-mono">
              <div>
                <span className="text-slate-500 font-sans">Order Code:</span>{" "}
                <strong className="text-purple-700">{orderCode}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Receipt No:</span>{" "}
                <strong className="text-slate-800">{receiptNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Intl Tracking:</span>{" "}
                <strong className="text-slate-800">{orderCode}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Date:</span>{" "}
                <span className="font-sans text-slate-700">{currentDate}</span>
              </div>
            </div>
          </div>

          {/* 3. جدول بيان السلعة والمنتجات (الترويسة السوداء) */}
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-black text-white font-bold text-[11px]">
                <tr>
                  <th className="p-2.5 text-center w-8">#</th>
                  <th className="p-2.5">بيان السلعة / المنتج</th>
                  <th className="p-2.5 text-center">المتجر والمواصفات</th>
                  <th className="p-2.5 text-center w-14">الكمية</th>
                  <th className="p-2.5 text-center w-28">قيمة المنتج</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="p-3 text-center font-bold text-purple-700">1</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">
                      {order.productTitle || "طلب وسيط شراء"}
                    </div>
                    {order.customerPhone && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {order.customerPhone}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">
                    Amazon / SHEIN
                  </td>
                  <td className="p-3 text-center font-bold font-mono">1</td>
                  <td className="p-3 text-center font-bold font-mono text-slate-900">
                    USD ${order.originalPrice || "0"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. تفاصيل المبالغ وحالة السداد */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                طريقة وبيانات الدفع:
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">طريقة الدفع:</span>
                <strong className="text-slate-800">الدفع عند الاستلام (كاش)</strong>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">حالة السداد:</span>
                <span className="bg-red-50 text-red-600 border border-red-200 text-[11px] font-bold px-3 py-1 rounded-full">
                  غير مدفوع (عند الاستلام)
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>قيمة المشتريات:</span>
                <span className="font-mono font-bold">USD ${order.originalPrice || "0"}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الشحن الدولي والجمارك:</span>
                <span className="font-mono font-bold">USD $0</span>
              </div>
              <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-2">
                <span>رسوم الخدمة والوساطة:</span>
                <span className="font-mono font-bold">USD $0</span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold text-sm">
                <div>
                  <span className="text-slate-900">الإجمالي النهائي:</span>
                  <div className="text-[10px] text-purple-700">ر.ي يمني (USD / SAR $)</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-600 font-bold text-xs">المبلغ المستلم: 0 ر.ي</div>
                  <div className="text-red-500 font-bold text-xs">المبلغ المتبقي: 0 ر.ي</div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. التواقيع والختم الرسمي الدائري */}
          <div className="pt-4 border-t border-dashed border-slate-300">
            <div className="grid grid-cols-3 items-center text-center">
              <div className="space-y-6">
                <div className="text-xs font-bold text-slate-700">توقيع المستلم / العميل</div>
                <div className="text-slate-300 font-mono tracking-widest text-xs">..............................</div>
              </div>
              <div className="flex justify-center">
                <div className="w-28 h-28 rounded-full border-2 border-purple-600 p-1 flex items-center justify-center text-purple-700 text-center select-none rotate-[-6deg] shadow-xs">
                  <div className="w-full h-full rounded-full border border-dashed border-purple-400 flex flex-col items-center justify-center p-1 leading-tight">
                    <span className="text-[9px] font-bold">★ رسمي ★</span>
                    <span className="text-[11px] font-black my-0.5">السوق الشامل</span>
                    <span className="text-[8px] font-semibold text-purple-800">قسم الحسابات والمالية</span>
                    <span className="text-[9px] font-black mt-1 text-emerald-600">معتمد رسمياً ✓</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="text-xs font-bold text-slate-700">توقيع أمين الصندوق / الإدارة</div>
                <div className="text-xs font-black text-slate-900 border-b border-slate-400 pb-1 mx-4">
                  السوق الشامل (معتمد)
                </div>
              </div>
            </div>
          </div>

          {/* 6. شريط التوثيق السفلي */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-mono bg-white px-2.5 py-1 rounded border font-bold text-slate-800">
              VERIFICATION CODE: {orderCode}
            </div>
            <div>
              سند قبض رسمي صادر عن نظام السوق الشامل لوساطة الشراء والتوصيل الدولي. خدمة العملاء: 770000000
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
