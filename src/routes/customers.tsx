import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [{ title: "كشف العملاء | السوق الشامل" }],
  }),
  component: CustomersRoute,
});

type OrderRow = { code: string; label: string; state: "done" | "progress" };
type Customer = {
  id: string;
  accountNo: string;
  name: string;
  email: string;
  phone: string;
  registeredHijri: string;
  active: boolean;
  total: number;
  paid: number;
  orders: OrderRow[];
};

const AVATAR_COLORS = [
  "#0F4C81",
  "#2E7D32",
  "#F97316",
  "#5E35B1",
  "#0891B2",
  "#DB2777",
];
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
const colorFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const sar = (n: number) => `${n.toLocaleString("en-US")} ر.س`;

const CUSTOMERS: Customer[] = [
  {
    id: "1",
    accountNo: "AC-1024",
    name: "عبدالله مطيع",
    email: "abdullah.mutee@example.com",
    phone: "+967 772 399 744",
    registeredHijri: "1446/03/12هـ",
    active: true,
    total: 5000,
    paid: 3450,
    orders: [
      { code: "ORD-9821", label: "مكتمل", state: "done" },
      { code: "ORD-9770", label: "قيد التوصيل", state: "progress" },
    ],
  },
  {
    id: "2",
    accountNo: "AC-1025",
    name: "سارة العمري",
    email: "sara.amri@example.com",
    phone: "+967 733 445 566",
    registeredHijri: "1446/02/28هـ",
    active: true,
    total: 2400,
    paid: 2400,
    orders: [{ code: "ORD-9810", label: "مكتمل", state: "done" }],
  },
  {
    id: "3",
    accountNo: "AC-1026",
    name: "محمد علي",
    email: "m.ali@example.com",
    phone: "+967 700 112 233",
    registeredHijri: "1446/01/15هـ",
    active: false,
    total: 1800,
    paid: 600,
    orders: [{ code: "ORD-9705", label: "قيد الشراء", state: "progress" }],
  },
  {
    id: "4",
    accountNo: "AC-1027",
    name: "نورة سعيد",
    email: "noura.saeed@example.com",
    phone: "+967 777 889 900",
    registeredHijri: "1446/03/02هـ",
    active: true,
    total: 3600,
    paid: 1500,
    orders: [{ code: "ORD-9688", label: "مكتمل", state: "done" }],
  },
];
function CustomersRoute() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const fontStack = { fontFamily: "Cairo, Tajawal, system-ui, sans-serif" };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CUSTOMERS.filter(
      (c) =>
        !q ||
        `${c.name} ${c.phone} ${c.accountNo} ${c.email}`
          .toLowerCase()
          .includes(q),
    );
  }, [search]);

  const TOTAL = 52;
  const PAGE_SIZE = 4;
  const totalPages = Math.ceil(TOTAL / PAGE_SIZE);

  const stats = [
    {
      label: "إجمالي العملاء",
      value: "52",
      hint: "عميل",
      icon: Users,
      color: "#2196F3",
      soft: "bg-blue-50",
    },
    {
      label: "العملاء النشطون",
      value: "38",
      hint: "نشط",
      icon: UserCheck,
      color: "#16A34A",
      soft: "bg-emerald-50",
    },
    {
      label: "هذا الشهر",
      value: "9",
      hint: "عملاء جدد",
      icon: CalendarDays,
      color: "#F97316",
      soft: "bg-orange-50",
    },
    {
      label: "جدد",
      value: "5",
      hint: "عميل جديد",
      icon: Sparkles,
      color: "#5E35B1",
      soft: "bg-violet-50",
    },
  ];

  return (
    <div
      dir="rtl"
      style={fontStack}
      className="min-h-screen bg-[#F4F6FB] pb-16 text-slate-800"
    >
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800">كشف العملاء</h1>
            <p className="mt-1 text-sm text-slate-500">
              إدارة وعرض قائمة العملاء · 52 عميل
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-2xl bg-[#0F4C81] px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-95">
            <Plus className="size-4" />
            إضافة عميل
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <span
                  className={`grid size-11 place-items-center rounded-2xl ${stat.soft}`}
                  style={{ color: stat.color }}
                >
                  <Icon className="size-5" />
                </span>
                <p
                  className="mt-3 text-3xl font-black leading-none"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <p className="mt-1.5 text-xs font-bold text-slate-500">
                  {stat.label}
                  <span className="mr-1 font-normal text-slate-400">
                    · {stat.hint}
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن عميل بالاسم أو رقم الهاتف أو رقم الحساب..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-[#2196F3] focus:bg-white"
            />
          </label>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              <Download className="size-4" />
              تصدير CSV
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              <Filter className="size-4" />
              تصفية
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-black text-slate-500">
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">رقم الحساب</th>
                  <th className="px-4 py-3">تاريخ التسجيل</th>
                  <th className="px-4 py-3">رقم الهاتف</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="bg-white transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                          style={{ backgroundColor: colorFor(c.name) }}
                        >
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p
                            dir="ltr"
                            className="truncate text-right text-[11px] text-slate-400"
                          >
                            {c.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        dir="ltr"
                        className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600"
                      >
                        {c.accountNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.registeredHijri}
                    </td>
                    <td className="px-4 py-3">
                      <span dir="ltr" className="block text-right text-xs text-slate-600">
                        {c.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.active
                        ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            نشط
                          </span>
                        )
                        : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            غير نشط
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(c)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0F4C81] px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-95"
                      >
                        <Eye className="size-3.5" />
                        إظهار
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            عرض 1-{filtered.length} من {TOTAL}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              aria-label="السابق"
            >
              <ChevronRight className="size-4" />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`grid size-9 place-items-center rounded-lg text-xs font-bold transition ${
                  p === page
                    ? "bg-[#0F4C81] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-1 text-slate-400">…</span>
            <button
              onClick={() => setPage(totalPages)}
              className={`grid size-9 place-items-center rounded-lg text-xs font-bold transition ${
                page === totalPages
                  ? "bg-[#0F4C81] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {totalPages}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              aria-label="التالي"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </div>
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
        >
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <h2 id="customer-modal-title" className="font-black text-slate-800">
                تفاصيل العميل
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <span
                  className="grid size-16 shrink-0 place-items-center rounded-full text-xl font-black text-white"
                  style={{ backgroundColor: colorFor(selected.name) }}
                >
                  {initials(selected.name)}
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {selected.name}
                  </h3>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    عميل نشط
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <Mail className="size-3.5" />
                    الإيميل
                  </p>
                  <p dir="ltr" className="mt-1 truncate text-right text-xs font-bold text-slate-700">
                    {selected.email}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <Phone className="size-3.5" />
                    الهاتف
                  </p>
                  <p dir="ltr" className="mt-1 text-right text-xs font-bold text-slate-700">
                    {selected.phone}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold text-slate-400">رقم العميل</p>
                  <p dir="ltr" className="mt-1 text-right font-mono text-xs font-bold text-slate-700">
                    {selected.accountNo}
                  </p>
                </div>
              </div>
              {(() => {
                const remaining = selected.total - selected.paid;
                const pct = selected.total > 0
                  ? Math.round((selected.paid / selected.total) * 100)
                  : 0;
                return (
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-black text-slate-800">
                        <Wallet className="size-4 text-[#0F4C81]" />
                        الحالة المالية
                      </h4>
                      <span className="text-sm font-black text-emerald-600">
                        {pct}% مدفوع
                      </span>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3 text-center">
                        <p className="text-[11px] font-bold text-slate-400">إجمالي المبلغ</p>
                        <p className="mt-1 text-lg font-black text-slate-700">
                          {sar(selected.total)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                        <p className="text-[11px] font-bold text-emerald-600/70">المدفوع</p>
                        <p className="mt-1 text-lg font-black text-emerald-700">
                          {sar(selected.paid)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-red-50 p-3 text-center">
                        <p className="text-[11px] font-bold text-red-500/70">المتبقي عليه</p>
                        <p className="mt-1 text-lg font-black text-[#DC2626]">
                          {sar(remaining)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      المتبقي = الإجمالي − المدفوع
                    </p>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-slate-100 p-4">
                <h4 className="font-black text-slate-800">آخر الطلبات</h4>
                <ul className="mt-3 space-y-2">
                  {selected.orders.map((o) => (
                    <li
                      key={o.code}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <span dir="ltr" className="font-mono text-xs font-black text-slate-600">
                        {o.code}
                      </span>
                      {o.state === "done"
                        ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="size-3.5" />
                            {o.label}
                          </span>
                        )
                        : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            {o.label}
                          </span>
                        )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <FileDown className="size-4" />
                  تنزيل الفاتورة
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0F4C81] px-4 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-95">
                  <Plus className="size-4" />
                  تسجيل دفعة جديدة
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default CustomersRoute;
