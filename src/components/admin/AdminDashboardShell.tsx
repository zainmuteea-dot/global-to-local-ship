import { useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Check,
  CircleDollarSign,
  Clock3,
  ClipboardPlus,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  Search,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardStats = {
  activeShipments: number | null;
  followUpOrders: number | null;
  completedShipments: number | null;
  totalCollected: string | null;
};

export type ShipmentPreview = {
  id: string;
  status: string;
  detail: string;
  progress: number | null;
  tone: "blue" | "green" | "orange";
};

export type ActivityPreview = {
  icon: "plus" | "truck" | "alert";
  text: string;
  time: string;
};

type AdminDashboardShellProps = {
  children?: ReactNode;
  toolbar?: ReactNode;
  dataNotice?: string;
  /** Pass current database-backed values when integrating; defaults are clearly marked as samples. */
  stats?: DashboardStats;
  shipments?: ShipmentPreview[];
  activities?: ActivityPreview[];
  onSearch?: (value: string) => void;
  onViewAllShipments?: () => void;
  onViewAllActivity?: () => void;
  userName?: string;
};

const SAMPLE_STATS: DashboardStats = {
  activeShipments: 8,
  followUpOrders: 3,
  completedShipments: 5,
  totalCollected: "12,450",
};

const SAMPLE_SHIPMENTS: ShipmentPreview[] = [
  {
    id: "10234",
    status: "قيد النقل",
    detail: "🚚 قيد النقل - متوقع الوصول اليوم 04:30 م",
    progress: 70,
    tone: "blue",
  },
  {
    id: "10233",
    status: "تم التسليم بنجاح",
    detail: "✅ تم التسليم بنجاح - اليوم 10:15 ص",
    progress: 100,
    tone: "green",
  },
  {
    id: "10235",
    status: "بانتظار إجراء",
    detail: "⏸️ بانتظار إجراء - مر عليها ساعتين",
    progress: 60,
    tone: "orange",
  },
];

const SAMPLE_ACTIVITIES: ActivityPreview[] = [
  {
    icon: "plus",
    text: "تم استلام طلب جديد #10234 من العميل أحمد",
    time: "منذ 25 دقيقة",
  },
  {
    icon: "truck",
    text: "تم تحديث حالة الشحنة #10233 إلى قيد التوصيل",
    time: "منذ ساعة",
  },
  {
    icon: "alert",
    text: "الشحنة #10235 متوقفة منذ 3 ساعات - تحتاج مراجعة",
    time: "منذ 3 ساعات",
  },
];

const navItems = [
  { label: "لوحة القيادة", href: "/admin", icon: LayoutDashboard },
  { label: "الشحنات", href: "/admin-tracking", icon: Truck },
  { label: "الطلبات", href: "/admin-clients", icon: PackageCheck },
  { label: "العملاء", href: "/customers", icon: Users },
  { label: "إدارة الموظفين", href: "/employees", icon: Users },
  { label: "الفواتير", href: "/sales-invoices", icon: FileText },
  { label: "طرق الدفع", href: "/payments", icon: CircleDollarSign },
  { label: "التقارير", href: "/client-reports", icon: Activity },
  { label: "المنتجات الفورية", href: "/products/manage", icon: PackageOpen },
] as const;

function metricTone(tone: "blue" | "orange" | "green" | "purple") {
  return {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      value: "text-slate-900",
      note: "text-emerald-600",
      stripe: "bg-blue-500",
    },
    orange: {
      icon: "bg-orange-50 text-orange-600",
      value: "text-slate-900",
      note: "text-orange-600",
      stripe: "bg-orange-500",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-slate-900",
      note: "text-emerald-600",
      stripe: "bg-emerald-500",
    },
    purple: {
      icon: "bg-violet-50 text-violet-600",
      value: "text-slate-900",
      note: "text-emerald-600",
      stripe: "bg-violet-500",
    },
  }[tone];
}

function shipmentTone(tone: ShipmentPreview["tone"]) {
  return {
    blue: {
      badge: "bg-blue-50 text-blue-700",
      bar: "bg-blue-500",
      dot: "bg-blue-500",
    },
    green: {
      badge: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      dot: "bg-emerald-500",
    },
    orange: {
      badge: "bg-orange-50 text-orange-700",
      bar: "bg-orange-500",
      dot: "bg-orange-500",
    },
  }[tone];
}

export function AdminDashboardShell({
  children,
  toolbar,
  dataNotice = "بيانات نموذج التصميم، وليست قراءة مباشرة من قاعدة البيانات",
  stats = SAMPLE_STATS,
  shipments = SAMPLE_SHIPMENTS,
  activities = SAMPLE_ACTIVITIES,
  onSearch,
  onViewAllShipments,
  onViewAllActivity,
  userName = "أحمد",
}: AdminDashboardShellProps) {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [notice, setNotice] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setNotice("تعذّر تسجيل الخروج. حاول مرة أخرى.");
      setLogoutLoading(false);
      return;
    }
    window.location.assign("/admin-login");
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <div dir="rtl" className="alshamel-admin-dashboard min-h-screen bg-[#f6f7fb] font-[Tajawal] text-slate-800">
      <style>{`
.alshamel-admin-dashboard{--panel:#0a1527;--panel-raised:#101d30;--line:#243349;--ink:#e6edf7;--muted:#93a4ba;min-height:100vh;background:radial-gradient(ellipse at 88% 0%,rgba(249,115,22,.08),transparent 28%),radial-gradient(ellipse at 8% 20%,rgba(14,165,233,.06),transparent 28%),#050b17!important;color:var(--ink)!important;color-scheme:dark}
.alshamel-admin-dashboard .bg-white,.alshamel-admin-dashboard .bg-slate-50,.alshamel-admin-dashboard .bg-slate-100,.alshamel-admin-dashboard .bg-slate-200,.alshamel-admin-dashboard [class~="bg-[#f6f7fb]"],.alshamel-admin-dashboard [class~="bg-[#f8fafc]"]{background-color:var(--panel)!important}
.alshamel-admin-dashboard [class~="bg-white/90"]{background-color:rgba(5,11,23,.94)!important}
.alshamel-admin-dashboard .border-slate-100,.alshamel-admin-dashboard .border-slate-200,.alshamel-admin-dashboard .border-sky-100,.alshamel-admin-dashboard .border-blue-100,.alshamel-admin-dashboard .border-emerald-100,.alshamel-admin-dashboard .border-orange-100,.alshamel-admin-dashboard .border-amber-200{border-color:var(--line)!important}
.alshamel-admin-dashboard .text-slate-900,.alshamel-admin-dashboard .text-slate-800,.alshamel-admin-dashboard .text-slate-700,.alshamel-admin-dashboard [class~="text-[#172554]"],.alshamel-admin-dashboard [class~="text-[#0A2540]"],.alshamel-admin-dashboard [class~="text-[#0F4C81]"]{color:var(--ink)!important}
.alshamel-admin-dashboard .text-slate-600,.alshamel-admin-dashboard .text-slate-500,.alshamel-admin-dashboard .text-slate-400{color:var(--muted)!important}
.alshamel-admin-dashboard .divide-slate-100>*+*{border-color:var(--line)!important}
.alshamel-admin-dashboard input,.alshamel-admin-dashboard select,.alshamel-admin-dashboard textarea{background-color:#0b1729!important;color:var(--ink)!important;border-color:var(--line)!important;color-scheme:dark}
.alshamel-admin-dashboard input::placeholder,.alshamel-admin-dashboard textarea::placeholder{color:#71839a!important}
.alshamel-admin-dashboard .bg-blue-50{background-color:rgba(59,130,246,.12)!important}.alshamel-admin-dashboard .bg-sky-50{background-color:rgba(14,165,233,.12)!important}.alshamel-admin-dashboard .bg-emerald-50{background-color:rgba(16,185,129,.12)!important}.alshamel-admin-dashboard .bg-orange-50,.alshamel-admin-dashboard .bg-amber-50{background-color:rgba(249,115,22,.12)!important}.alshamel-admin-dashboard .bg-violet-50{background-color:rgba(139,92,246,.12)!important}.alshamel-admin-dashboard .bg-rose-50{background-color:rgba(244,63,94,.12)!important}
.alshamel-admin-dashboard .text-blue-600,.alshamel-admin-dashboard .text-blue-700,.alshamel-admin-dashboard .text-sky-700{color:#60a5fa!important}.alshamel-admin-dashboard .text-emerald-600,.alshamel-admin-dashboard .text-emerald-700{color:#34d399!important}.alshamel-admin-dashboard .text-orange-600,.alshamel-admin-dashboard .text-orange-700,.alshamel-admin-dashboard .text-amber-700{color:#fb923c!important}.alshamel-admin-dashboard .text-violet-600{color:#c4b5fd!important}.alshamel-admin-dashboard .text-rose-600,.alshamel-admin-dashboard .text-red-600{color:#fb7185!important}
.alshamel-admin-dashboard .border-blue-200,.alshamel-admin-dashboard .border-emerald-200,.alshamel-admin-dashboard .border-orange-200,.alshamel-admin-dashboard .border-amber-200,.alshamel-admin-dashboard .border-rose-200{border-color:#31435c!important}
.alshamel-admin-dashboard [class~="bg-[#3b82f6]"]{background-color:#f97316!important;color:#fff!important}.alshamel-admin-dashboard [class~="bg-[#1a2a52]"]{background-color:#070e1c!important}.alshamel-admin-dashboard .bg-orange-600{background-color:#ff8a32!important}.alshamel-admin-dashboard .bg-orange-600:hover{background-color:#f97316!important}
.alshamel-admin-dashboard .shadow-sm,.alshamel-admin-dashboard .shadow-md,.alshamel-admin-dashboard .shadow-lg{box-shadow:0 12px 30px rgba(0,0,0,.25)!important}.alshamel-admin-dashboard hr{border-color:var(--line)!important}.alshamel-admin-dashboard table{color:var(--ink)!important}
.alshamel-admin-dashboard [class*="to-white"]{background-image:none!important}
.alshamel-admin-dashboard [aria-label="إحصائيات اليوم"]>article:nth-child(1)>span:first-child{background-color:#fb923c!important}
.alshamel-admin-dashboard [aria-label="إحصائيات اليوم"]>article:nth-child(2)>span:first-child{background-color:#facc15!important}
.alshamel-admin-dashboard [aria-label="إحصائيات اليوم"]>article:nth-child(3)>span:first-child{background-color:#22c55e!important}
.alshamel-admin-dashboard [aria-label="إحصائيات اليوم"]>article:nth-child(4)>span:first-child{background-color:#38bdf8!important}
.alshamel-admin-dashboard [aria-label="إحصائيات اليوم"]>article:nth-child(2)>div>div:last-child{background-color:rgba(250,204,21,.12)!important;color:#facc15!important}
.alshamel-admin-dashboard [aria-label="إحصائيات اليوم"]>article:nth-child(4)>div>div:last-child{background-color:rgba(56,189,248,.12)!important;color:#38bdf8!important}
@media(prefers-reduced-motion:reduce){.alshamel-admin-dashboard *{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`}</style>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[288px] max-w-[88vw] flex-col bg-[#1a2a52] text-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-label="القائمة الرئيسية"
      >
        <div className="flex min-h-[100px] items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-950/20">
              <Truck className="size-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">السوق الشامل</div>
              <div className="mt-0.5 text-xs font-medium text-blue-100/75">نظام إدارة الأعمال</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
            className="grid size-9 place-items-center rounded-xl text-blue-100 hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mx-4 mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="text-xs font-medium text-blue-100/70">مرحباً بعودتك</div>
          <div className="mt-1 text-base font-bold">مرحباً، {userName}</div>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            مساحة الإدارة
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto px-4" aria-label="التنقل">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <a
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold transition-colors ${
                  active
                    ? "bg-[#3b82f6] text-white shadow-md shadow-blue-950/20"
                    : "text-blue-100/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => setNotice("قسم الإعدادات غير متاح في صفحة النظام الحالية.")}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-right text-sm font-bold text-blue-100/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings className="size-[18px] shrink-0" aria-hidden="true" />
            <span>الإعدادات</span>
          </button>
        </nav>

        <div className="space-y-1 border-t border-white/10 p-4">
          <a
            href="/admin-chat"
            className="flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-blue-100/85 hover:bg-white/10 hover:text-white"
          >
            <Headphones className="size-[18px]" aria-hidden="true" />
            الدعم
          </a>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-right text-sm font-semibold text-blue-100/85 hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
            {logoutLoading ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج"}
          </button>
          <div className="px-4 pt-3 text-[11px] text-blue-100/50">السوق الشامل © 2026</div>
        </div>
      </aside>

      <div className="min-h-screen lg:mr-[288px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="فتح القائمة"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-[#172554] sm:text-[28px]">
                  لوحة القيادة
                </h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">
                  ملخص أداء اليوم -{" "}
                  {new Intl.DateTimeFormat("ar", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date())}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <label className="relative hidden sm:block">
                <span className="sr-only">بحث</span>
                <Search className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  value={searchValue}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="بحث..."
                  className="h-11 w-40 rounded-xl border border-slate-200 bg-[#f8fafc] pr-10 pl-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:w-56"
                />
              </label>
              <a
                href="/notifications"
                aria-label="التنبيهات"
                className="relative grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
              >
                <Bell className="size-5" />
                <span className="absolute right-[9px] top-[9px] size-2 rounded-full border-2 border-white bg-rose-500" />
              </a>
            </div>
          </div>
          <div className="px-4 pb-3 sm:hidden">
            <label className="relative block">
              <span className="sr-only">بحث</span>
              <Search className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="بحث..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pr-10 pl-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
          {toolbar ? (
            <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-7 lg:px-9">
              <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
                {toolbar}
              </div>
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">نظرة سريعة على حركة الأعمال</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800">
              {dataNotice}
            </span>
          </div>

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4"
            aria-label="إحصائيات اليوم"
          >
            <MetricCard
              title="مجموع الشحنات النشطة"
              value={stats.activeShipments === null ? "—" : String(stats.activeShipments)}
              note={
                stats.activeShipments === null
                  ? "بانتظار تحميل بيانات الطلبات"
                  : "عدد فعلي من جدول الطلبات"
              }
              tone="blue"
              icon={<Truck className="size-5" />}
            />
            <MetricCard
              title="طلبات تحتاج متابعة"
              value={stats.followUpOrders === null ? "—" : String(stats.followUpOrders)}
              note={
                stats.followUpOrders === null
                  ? "بانتظار تحميل بيانات الطلبات"
                  : "طلبات جديدة أو قيد المراجعة"
              }
              tone="orange"
              icon={<Clock3 className="size-5" />}
            />
            <MetricCard
              title="شحنات مكتملة"
              value={stats.completedShipments === null ? "—" : String(stats.completedShipments)}
              note={
                stats.completedShipments === null
                  ? "بانتظار تحميل بيانات الطلبات"
                  : "حالات التسليم في جدول الطلبات"
              }
              tone="green"
              icon={<Check className="size-5" />}
            />
            <MetricCard
              title="إجمالي تكلفة الطلبات"
              value={stats.totalCollected === null ? "—" : `${Number(stats.totalCollected).toLocaleString("ar-YE")} ر.ي`}
              note={
                stats.totalCollected === null
                  ? "لا توجد تكلفة بالريال اليمني مسجلة"
                  : "مجموع تكلفة الطلبات بالريال اليمني"
              }
              tone="purple"
              icon={<CircleDollarSign className="size-5" />}
            />
          </section>

          <section
            className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-2"
            aria-label="تفاصيل اليوم"
          >
            <Panel
              title="أحدث الطلبات وحالاتها"
              icon={<PackageSearch className="size-5" aria-hidden="true" />}
              action="عرض كل الطلبات"
              onAction={onViewAllShipments ?? (() => window.location.assign("/admin-clients"))}
            >
              {shipments.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-slate-400">
                  لا توجد طلبات متاحة للعرض حالياً.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {shipments.map((shipment) => {
                    const tone = shipmentTone(shipment.tone);
                    return (
                      <article key={shipment.id} className="py-4 first:pt-1 last:pb-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`size-2.5 rounded-full ${tone.dot}`} />
                            <h3 className="text-sm font-extrabold text-slate-800">
                              طلب #{shipment.id}
                            </h3>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${tone.badge}`}
                          >
                            {shipment.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{shipment.detail}</p>
                        {shipment.progress !== null ? (
                          <div
                            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-label={`تقدم الطلب ${shipment.id}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={shipment.progress}
                          >
                            <div
                              className={`h-full rounded-full transition-all ${tone.bar}`}
                              style={{ width: `${shipment.progress}%` }}
                            />
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel
              title="أحدث الطلبات المسجّلة"
              icon={<ClipboardPlus className="size-5" aria-hidden="true" />}
              action="عرض كل الطلبات"
              onAction={onViewAllActivity ?? (() => window.location.assign("/admin-clients"))}
            >
              {activities.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-slate-400">
                  لا توجد طلبات مسجّلة لعرضها.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activities.map((activity, index) => (
                    <article
                      key={`${activity.time}-${index}`}
                      className="flex gap-3.5 py-4 first:pt-1 last:pb-1"
                    >
                      <ActivityIcon type={activity.icon} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-6 text-slate-700">
                          {activity.text}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{activity.time}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          {notice && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice("")} aria-label="إغلاق الرسالة">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  tone,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  tone: "blue" | "orange" | "green" | "purple";
  icon: ReactNode;
}) {
  const colors = metricTone(tone);
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <span className={`absolute inset-x-0 top-0 h-1 ${colors.stripe}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-6 text-slate-500">{title}</p>
          <p className={`mt-3 text-3xl font-extrabold tracking-tight ${colors.value}`} dir="auto">
            {value}
          </p>
        </div>
        <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${colors.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-4 text-xs font-bold ${colors.note}`}>{note}</p>
    </article>
  );
}

function Panel({
  title,
  icon,
  action,
  onAction,
  children,
}: {
  title: string;
  icon: ReactNode;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex min-w-0 items-center gap-2.5 text-[#172554]">
          <span className="shrink-0 text-blue-600">{icon}</span>
          <h2 className="text-lg font-extrabold">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
        >
          {action}
        </button>
      </div>
      {children}
    </section>
  );
}

function ActivityIcon({ type }: { type: ActivityPreview["icon"] }) {
  const styles = {
    plus: "bg-blue-50 text-blue-600",
    truck: "bg-blue-50 text-blue-600",
    alert: "bg-orange-50 text-orange-600",
  };

  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-xl ${styles[type]}`}
      aria-hidden="true"
    >
      {type === "plus" ? <ClipboardPlus className="size-5" /> : null}
      {type === "truck" ? <Truck className="size-5" /> : null}
      {type === "alert" ? <Clock3 className="size-5" /> : null}
    </span>
  );
}
