import { createFileRoute } from "@tanstack/react-router";
import AdminClientsPage from '../components/AdminClientsPage';

export const Route = (createFileRoute as any)("/admin-clients")({
  head: () => ({
    meta: [
      { title: "إدارة العملاء | السوق الشامل AL SHAMEL" },
      {
        name: "description",
        content: "إدارة العملاء والربط المباشر مع قاعدة بيانات Supabase.",
      },
    ],
  }),
  component: AdminClientsRoutePage,
});

export function AdminClientsRoutePage() {
  return (
    <AdminClientsPage
      onBack={() => {
        if (typeof window !== 'undefined') window.location.href = '/admin';
      }}
      onNavigateToNewOrder={() => {
        if (typeof window !== 'undefined') window.location.href = '/new-order';
      }}
    />
  );
}

export default AdminClientsRoutePage;
