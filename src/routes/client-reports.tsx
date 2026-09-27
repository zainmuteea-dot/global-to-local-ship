import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/client-reports')({
  component: () => <div dir="rtl" className="p-6"><h1 className="text-2xl font-bold mb-4">تقارير العميل</h1><div className="bg-white p-4 rounded shadow"><input placeholder="ابحث باسم العميل" className="border p-2 rounded w-full mb-4"/><p>سجل فواتير العميل وحسابه يظهر هنا</p></div></div>
})
