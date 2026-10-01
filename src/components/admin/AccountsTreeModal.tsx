import { FolderTree, X } from "lucide-react";

export function AccountsTreeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-sky-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl text-right text-[#0A2540] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] text-white flex items-center justify-center shadow-sm">
              <FolderTree className="w-5 h-5 text-orange-300" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0A2540]">شجرة الحسابات المحاسبية العامة</h3>
              <p className="text-xs text-slate-500">الدليل المحاسبي الشامل لعمليات الاستيراد والطرود</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 space-y-2">
            <div className="font-bold text-[#0F4C81] flex items-center justify-between">
              <span>1 - الأصول (Assets)</span>
              <span className="font-mono text-xs">كود: 1000</span>
            </div>
            <div className="pr-4 space-y-1 text-slate-600">
              <div>• 1010 - النقدية في الصندوق (الريال اليمني / السعودي / الدولار)</div>
              <div>• 1020 - حسابات البنوك والتحويلات (الكريمي، بنك اليمن والكويت)</div>
              <div>• 1030 - ذمم العملاء المستحقة والشحنات قيد التوصيل (COD)</div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
            <div className="font-bold text-amber-800 flex items-center justify-between">
              <span>2 - الخصوم والالتزامات (Liabilities)</span>
              <span className="font-mono text-xs">كود: 2000</span>
            </div>
            <div className="pr-4 space-y-1 text-slate-600">
              <div>• 2010 - مستحقات الموردين ومتاجر الشراء (شي إن، تيمو، أمازون)</div>
              <div>• 2020 - أمانات ودفعات العملاء المقدمة</div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
            <div className="font-bold text-emerald-800 flex items-center justify-between">
              <span>3 - الإيرادات والأرباح (Revenue)</span>
              <span className="font-mono text-xs">كود: 4000</span>
            </div>
            <div className="pr-4 space-y-1 text-slate-600">
              <div>• 4010 - إيرادات عمولات الشراء والشحن الدولي</div>
              <div>• 4020 - رسوم التوصيل المحلي والفرز</div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#0284C7] text-white text-xs font-bold shadow-sm">
            إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
}
