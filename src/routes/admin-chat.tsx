import { createFileRoute } from "@tanstack/react-router";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

export const Route = createFileRoute("/admin-chat")({
  component: AdminChatRoute,
});

function AdminChatRoute() {
  return (
    <AdminRouteGuard allowStaff redirectTo="/admin-chat">
      <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <section className="mx-auto max-w-6xl rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-900">
            محادثات العملاء
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            صندوق وارد الموظفين. ستظهر المحادثات هنا بعد ربط الروبوت بتخزين
            الرسائل في قاعدة البيانات.
          </p>
        </section>
      </main>
    </AdminRouteGuard>
  );
}
