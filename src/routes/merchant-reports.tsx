import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/merchant-reports')({
  component: () => <div dir="rtl" className="p-6"><h1 className="text-2xl font-bold mb-4">تقارير التاجر</h1><div className="grid grid-cols-3 gap-4"><div className="bg-white p-4 rounded shadow">إجمالي المشتريات: 0</div><div className="bg-white p-4 rounded shadow">إجمالي المبيعات: 0</div><div className="bg-white p-4 rounded shadow">صافي الربح: 0</div></div></div>
})
