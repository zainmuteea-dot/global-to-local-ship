import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from 'react';
import { StaffDashboard } from '../components/StaffDashboard';
import { AppSidebar } from '../components/AppSidebar';
import { AccountsTreeModal } from '../components/AccountsTreeModal';

export const Route = (createFileRoute as any)("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة العمليات والإدارة | السوق الشامل AL SHAMEL" },
      {
        name: "description",
        content: "لوحة عمليات الشحن والفرز وإدارة الطلبات والعملاء لمنظومة السوق الشامل.",
      },
    ],
  }),
  component: AdminRoutePage,
});

export function AdminRoutePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(false);

  const handleNavigate = (route: string) => {
    if (typeof window !== 'undefined') {
      if (route === 'home') window.location.href = '/';
      else if (route === 'new_order') window.location.href = '/new-order';
      else if (route === 'my_account') window.location.href = '/my-account';
      else if (route === 'admin_clients') window.location.href = '/admin-clients';
      else window.location.href = `/${route}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540]" dir="rtl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
        <StaffDashboard
          onTrackOrder={(tr) => {
            if (typeof window !== 'undefined') {
              window.location.href = `/track?no=${encodeURIComponent(tr)}`;
            }
          }}
          onNavigateToStaff={() => handleNavigate('staff')}
          onNavigateToPayments={() => handleNavigate('payments')}
          onNavigateToOperations={() => handleNavigate('operations')}
          onNavigateToCustomerOrder={() => handleNavigate('customer_booking')}
          onNavigateToNewOrder={() => handleNavigate('new_order')}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenAccountsTree={() => setIsAccountsTreeOpen(true)}
          onNavigateToAccounting={() => handleNavigate('accounting')}
        />
      </div>

      {/* القائمة الجانبية (3 شرطات) */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigate}
        activeRoute="orders"
        onOpenAccountsTree={() => setIsAccountsTreeOpen(true)}
      />

      {/* شجرة الحسابات */}
      <AccountsTreeModal
        isOpen={isAccountsTreeOpen}
        onClose={() => setIsAccountsTreeOpen(false)}
      />
    </div>
  );
}

export default AdminRoutePage;
