import { AlertTriangle, LockKeyhole } from "lucide-react";

export function SheinSyncPanel() {
  return (
    <section
      dir="rtl"
      aria-labelledby="shein-sync-title"
      className="mb-8 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h2 id="shein-sync-title" className="text-xl font-black text-slate-900">
            مزامنة SHEIN
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            المزامنة غير مفعّلة حاليًا. يلزم اعتماد الوصول إلى واجهة SHEIN
            وتجهيز إعدادات الربط قبل تشغيلها.
          </p>

          <div
            role="status"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
          >
            لن تُرسل هذه اللوحة طلبات إلى SHEIN، ولن تستورد أو تعدّل المنتجات
            أو المخزون.
          </div>

          <button
            type="button"
            disabled
            aria-describedby="shein-sync-disabled-note"
            className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-500"
          >
            <LockKeyhole className="size-4" aria-hidden="true" />
            المزامنة غير متاحة
          </button>

          <p id="shein-sync-disabled-note" className="mt-2 text-xs text-slate-500">
            سيُتاح التشغيل بعد تجهيز واعتماد التكامل الرسمي.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SheinSyncPanel;
