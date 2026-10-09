import { useEffect, useRef, useState } from "react";
import { Printer, X, Check, LoaderCircle } from "lucide-react";
import type { OrderItem } from "./types";

function formatDate(value?: string) {
  if (!value) return new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PrintReceiptModal({
  order,
  onClose,
}: {
  order: OrderItem;
  onClose: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const finishPrint = () => {
      setPrinting(false);
      setPrinted(true);
    };
    window.addEventListener("afterprint", finishPrint);
    return () => window.removeEventListener("afterprint", finishPrint);
  }, []);

  const printReceipt = () => {
    if (!receiptRef.current || printing) return;
    setPrinting(true);
    // Leave the modal mounted while the browser print dialog is open.
    window.setTimeout(() => window.print(), 80);
  };

  const date = formatDate(order.createdAt);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="receipt-title" dir="rtl">
      <style>{`
        @page { size: 80mm 220mm; margin: 4mm; }
        @media print {
          html, body { width: 80mm !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #receipt-print-root, #receipt-print-root * { visibility: visible !important; }
          #receipt-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 72mm !important; max-width: 72mm !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; }
          #receipt-preview-shell, #receipt-actions, #receipt-close-button, .no-print { display: none !important; }
          #receipt-preview-scroll { display: contents !important; max-height: none !important; overflow: visible !important; padding: 0 !important; background: #fff !important; }
          #receipt-paper { width: 72mm !important; max-width: 72mm !important; min-height: 0 !important; margin: 0 !important; padding: 2mm !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; color: #111 !important; overflow: visible !important; }
          #receipt-paper * { color: #111 !important; }
          .receipt-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          header, section, footer { break-inside: avoid; page-break-inside: avoid; }
          p, h1, h2 { orphans: 3; widows: 3; }
          button { display: none !important; }
        }
      `}</style>

      <div id="receipt-print-root" className="w-full max-w-3xl">
        <div id="receipt-preview-shell" className="mb-3 flex items-center justify-between rounded-2xl border border-white/15 bg-[#071426] px-4 py-3 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-orange-500"><Printer className="size-5" /></div>
            <div><h2 id="receipt-title" className="font-black">معاينة سند الشحنة</h2><p className="text-xs text-slate-300">راجع التفاصيل قبل الطباعة</p></div>
          </div>
          <button id="receipt-close-button" type="button" onClick={onClose} aria-label="إغلاق المعاينة" className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>

        <div id="receipt-preview-scroll" className="mx-auto max-h-[75vh] w-full overflow-y-auto rounded-2xl bg-slate-200 p-3 sm:p-6">
          <article id="receipt-paper" ref={receiptRef} className="mx-auto min-h-[650px] w-full max-w-[420px] rounded-sm bg-white px-7 py-8 text-[#111827] shadow-xl" dir="rtl">
            <header className="receipt-avoid-break border-b-2 border-dashed border-slate-300 pb-4 text-center">
              <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full border-2 border-orange-500 text-lg font-black text-orange-600 print:border-black print:text-black">السوق</div>
              <h1 className="text-2xl font-black tracking-tight">السوق الشامل</h1>
              <p className="mt-1 text-xs font-bold text-slate-600">للتسوق والشحن الدولي</p>
              <div className="mx-auto mt-3 inline-flex rounded-full border border-slate-400 px-4 py-1.5 text-sm font-black">سند شحن واستلام</div>
            </header>

            <section className="receipt-avoid-break py-4 text-center">
              <p className="text-[10px] font-bold text-slate-500">رقم الطلب / التتبع</p>
              <p dir="ltr" className="mt-1 break-all font-mono text-2xl font-black tracking-widest">{order.orderNumber || "—"}</p>
              {order.intlTrackingNumber && <p className="mt-2 break-all font-mono text-xs text-slate-600">رقم التتبع الدولي: {order.intlTrackingNumber}</p>}
              <div className="mx-auto mt-3 max-w-[250px] border-y border-slate-300 py-2 text-[10px] leading-5 text-slate-500">يرجى إبراز رقم الطلب عند الاستلام</div>
            </section>

            <section className="receipt-avoid-break space-y-2 border-y border-dashed border-slate-300 py-4 text-xs">
              <div className="flex justify-between gap-3"><span className="text-slate-500">اسم العميل</span><strong className="max-w-[65%] text-left">{order.customerName || "—"}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">رقم الهاتف</span><strong dir="ltr" className="max-w-[65%] text-left font-mono">{order.customerPhone || "—"}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">المدينة</span><strong>{order.customerCity || "غير محددة"}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">المتجر</span><strong>{order.storeName || "—"}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">تاريخ تسجيل الطلب</span><strong>{date}</strong></div>
            </section>

            <section className="receipt-avoid-break py-4">
              <h2 className="mb-2 text-xs font-black">تفاصيل الشحنة</h2>
              <div className="rounded-lg border border-slate-300 p-3">
                <p className="break-words text-xs font-bold leading-5">{order.productTitle || "طلب تسوق"}</p>
                <p className="mt-2 text-[10px] text-slate-500">الحالة الحالية: {order.status}</p>
                {order.notes && <p className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-4 text-slate-600">ملاحظات: {order.notes}</p>}
              </div>
            </section>

            <section className="receipt-avoid-break border-t border-slate-300 pt-3">
              <div className="flex justify-between gap-3 text-xs"><span>السعر المسجل للمنتج</span><strong>{Number.isFinite(Number(order.originalPrice)) ? Number(order.originalPrice).toLocaleString("ar-YE") : "—"} ر.س</strong></div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">هذا السند يعرض السعر المسجل للمنتج فقط. رسوم الشحن والضرائب والمدفوعات غير متاحة ضمن بيانات الطلب الحالية.</p>
            </section>

            <footer className="receipt-avoid-break mt-6 border-t-2 border-dashed border-slate-300 pt-4 text-center">
              <p className="text-xs font-black">شكراً لاختياركم السوق الشامل</p>
              <p className="mt-1 text-[10px] text-slate-500">يرجى الاحتفاظ بهذا السند للمراجعة والاستلام</p>
              <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[10px] text-slate-600"><div className="border-t border-slate-400 pt-2">توقيع المستلم</div><div className="border-t border-slate-400 pt-2">توقيع الموظف</div></div>
            </footer>
          </article>
        </div>

        <div id="receipt-actions" className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={onClose} className="no-print min-h-12 rounded-xl bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/20">إغلاق</button>
          <button type="button" onClick={printReceipt} disabled={printing} className="no-print inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] px-6 text-sm font-black text-white shadow-lg disabled:opacity-70">
            {printing ? <LoaderCircle className="size-4 animate-spin" /> : printed ? <Check className="size-4" /> : <Printer className="size-4" />}
            {printing ? "نافذة الطباعة مفتوحة…" : printed ? "طباعة مرة أخرى" : "طباعة السند"}
          </button>
        </div>
      </div>
    </div>
  );
}
