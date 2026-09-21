import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
})

function NotificationsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-cocoadeep mb-6 flex items-center gap-2">
          <Bell className="size-6" /> الإشعارات
        </h1>
        <div className="bg-card rounded-2xl p-6 ring-1 ring-border text-center text-muted-foreground">
          لا توجد إشعارات جديدة حالياً
        </div>
        <Link to="/" className="mt-6 inline-block text-cocoa font-bold">← رجوع للرئيسية</Link>
      </div>
    </div>
  )
}
