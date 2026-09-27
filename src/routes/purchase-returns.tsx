import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/purchase-returns')({
  component: () => <div dir="rtl" className="p-6"><h1 className="text-2xl font-bold">مرتجع المشتريات</h1><div className="bg-white p-4 rounded shadow mt-4"><input placeholder="رقم فاتورة الشراء" className="border p-2 rounded ml-2"/><input placeholder="الصنف المرتجع" className="border p-2 rounded ml-2"/><input placeholder="الكمية" type="number" className="border p-2 rounded ml-2"/><button className="bg-red-700 text-white px-4 py-2 rounded">حفظ المرتجع</button></div></div>
})
