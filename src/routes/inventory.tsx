import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/inventory')({
  component: InventoryHome,
})

function InventoryHome() {
  const links = [
    { to: '/stores', label: 'المخازن' },
    { to: '/products', label: 'الأصناف' },
    { to: '/purchase-invoices', label: 'فواتير المشتريات' },
    { to: '/sales-invoices', label: 'فواتير المبيعات' },
    { to: '/purchase-returns', label: 'مرتجع المشتريات' },
    { to: '/sales-returns', label: 'مرتجع المبيعات' },
    { to: '/merchant-reports', label: 'تقارير التاجر' },
    { to: '/client-reports', label: 'تقارير العميل' },
  ]
  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-6">نظام المخازن والفواتير</h1>
      <div className="grid grid-cols-2 gap-4">
        {links.map(l => (
          <Link key={l.to} to={l.to} className="bg-white p-6 rounded shadow text-center font-bold hover:bg-blue-50">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
