import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";
import {
  buildReceivedPresentation,
  calculateApprovedReceived,
} from "./client-reports.received-summary";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Search,
  Share2,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/client-reports")({
  component: ClientReportsPage,
});

type Client = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

type StatementRow = {
  id: string;
  date: string;
  ref: string;
  kind: "طلب" | "دفعة";
  description: string;
  amount: number | null;
  currency: string | null;
  status: string;
};

type ProfileRow = Client;
type RoleRow = { user_id: string; role: string };

const PAGE_SIZE = 500;
const DB = supabase as any;

async function fetchAllPages<T>(buildPageQuery: (from: number, to: number) => any): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildPageQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    allRows.push(...page);
    if (page.length < PAGE_SIZE) return allRows;
    from += PAGE_SIZE;
  }
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateBounds(from: string, to: string) {
  // مدخلات التاريخ تُفسّر على توقيت اليمن (UTC+3)، ونهاية النطاق شاملة.
  const start = from ? new Date(`${from}T00:00:00+03:00`).toISOString() : null;
  let end: string | null = null;
  if (to) {
    const [year, month, day] = to.split("-").map(Number);
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    const yyyy = nextDay.getUTCFullYear();
    const mm = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(nextDay.getUTCDate()).padStart(2, "0");
    end = new Date(`${yyyy}-${mm}-${dd}T00:00:00+03:00`).toISOString();
  }
  return { start, end };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ar-YE", { dateStyle: "medium", timeStyle: "short" });
}

function formatAmount(value: number) {
  return value.toLocaleString("ar-YE", { maximumFractionDigits: 2 });
}

function ClientReportsPage() {
  return (
    <AdminRouteGuard allowStaff redirectTo="/client-reports">
      <ClientReportsPageContent />
    </AdminRouteGuard>
  );
}

function ClientReportsPageContent() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsLoadState, setRowsLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [loadedRecordsCount, setLoadedRecordsCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadClients() {
      setClientsLoading(true);
      setError("");
      try {
        const [profiles, roles] = await Promise.all([
          fetchAllPages<ProfileRow>((from, to) =>
            DB.from("profiles")
              .select("id, full_name, phone, created_at")
              .order("created_at", { ascending: false })
              .range(from, to),
          ),
          fetchAllPages<RoleRow>((from, to) =>
            DB.from("user_roles")
              .select("user_id, role")
              .range(from, to),
          ),
        ]);

        const staffIds = new Set(
          roles
            .filter((row) => row.role === "admin" || row.role === "staff")
            .map((row) => row.user_id),
        );
        const customerProfiles = profiles.filter(
          (profile) => !staffIds.has(profile.id),
        );
        if (!active) return;
        setClients(customerProfiles);
        setSelectedClientId((current) => current || customerProfiles[0]?.id || "");
      } catch (cause) {
        console.error("Client statement: failed to load customers", cause);
        if (active) setError("تعذر تحميل العملاء. تحقق من تسجيل الدخول وسياسات RLS للجداول.");
      } finally {
        if (active) setClientsLoading(false);
      }
    }
    void loadClients();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadStatement() {
      if (!selectedClientId) {
        setRows([]);
        setLoadedRecordsCount(null);
        setRowsLoadState("idle");
        return;
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        setRows([]);
        setLoadedRecordsCount(null);
        setRowsLoadState("error");
        setError("تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.");
        return;
      }

      setRowsLoading(true);
      setRowsLoadState("loading");
      setLoadedRecordsCount(null);
      setError("");
      try {
        const { start, end } = dateBounds(dateFrom, dateTo);
        const [allOrders, allPayments] = await Promise.all([
          fetchAllPages<any>((from, to) => {
            let query = DB.from("orders")
              .select("id, tracking_code, product_name, status, created_at, user_id")
              .eq("user_id", selectedClientId);
            if (start) query = query.gte("created_at", start);
            if (end) query = query.lt("created_at", end);
            return query.order("created_at", { ascending: false }).range(from, to);
          }),
          fetchAllPages<any>((from, to) => {
            let query = DB.from("payments")
              .select("id, tracking_code, customer_name, wallet, amount, currency, status, created_at, user_id")
              .eq("user_id", selectedClientId);
            if (start) query = query.gte("created_at", start);
            if (end) query = query.lt("created_at", end);
            return query.order("created_at", { ascending: false }).range(from, to);
          }),
        ]);

        const orderRows: StatementRow[] = allOrders.map((order: any) => ({
          id: `order-${order.id}`,
          date: order.created_at,
          ref: order.tracking_code || String(order.id).slice(0, 8),
          kind: "طلب",
          description: order.product_name || "طلب عميل",
          amount: null,
          currency: null,
          status: order.status || "مسجل",
        }));
        const paymentRows: StatementRow[] = allPayments.map((payment: any) => {
          const amount = toNullableNumber(payment.amount);
          const status = String(payment.status ?? "unknown");
          const statusLabel = status === "approved"
            ? "معتمد"
            : status === "pending"
              ? "معلق"
              : status === "rejected"
                ? "مرفوض"
                : status;

          return {
            id: `payment-${payment.id}`,
            date: payment.created_at,
            ref: payment.tracking_code || String(payment.id).slice(0, 8),
            kind: "دفعة",
            description: `إيصال عبر ${payment.wallet || "وسيلة غير محددة"}`,
            amount,
            currency: payment.currency || "غير محدد",
            status: statusLabel,
          };
        });
        const combined = [...orderRows, ...paymentRows].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        if (active) {
          setRows(combined);
          setLoadedRecordsCount(combined.length);
          setRowsLoadState("loaded");
        }
      } catch (cause) {
        console.error("Client statement: failed to load transactions", cause);
        if (active) {
          setRows([]);
          setLoadedRecordsCount(null);
          setRowsLoadState("error");
          setError("تعذر تحميل الحركات. تحقق من أعمدة الجداول وسياسات RLS للمدير والموظفين.");
        }
      } finally {
        if (active) setRowsLoading(false);
      }
    }
    void loadStatement();
    return () => {
      active = false;
    };
  }, [selectedClientId, dateFrom, dateTo]);

  const filteredClients = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      [client.full_name, client.phone, client.id]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(needle)),
    );
  }, [clients, search]);

  const activeClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const receivedSummary = useMemo(() => calculateApprovedReceived(rows), [rows]);
  const receivedPresentation = useMemo(
    () => buildReceivedPresentation(receivedSummary),
    [receivedSummary],
  );

  const handleWhatsAppShare = () => {
    if (!activeClient?.phone) return;
    const totalsText = receivedPresentation.whatsappText;
    const message = `السلام عليكم ${activeClient.full_name || "عميلنا"}،\nملخص الحركات المسجلة في السوق الشامل:\n${totalsText}\nالحركات المعروضة: ${rows.length} (طلبات ودفعات بجميع حالاتها)\nملاحظة: المقبوض محسوب من الدفعات المعتمدة فقط.\nملاحظة: المبالغ المستحقة لا تظهر لأن الفواتير/تكاليف الطلبات غير مسجلة في مصدر مالي مرتبط بالحساب.`;
    const phone = activeClient.phone.replace(/\D/g, "").replace(/^0+/, "");
    const internationalPhone = phone.startsWith("967") ? phone : `967${phone}`;
    window.open(`https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate({ to: "/admin" })} className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200" aria-label="رجوع">
              <ArrowRight className="size-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-black text-[#0F4C81]"><FileText className="size-6 text-orange-500" /> كشف حساب العملاء</h1>
              <p className="mt-1 text-xs text-slate-500">الطلبات وكل حالات الدفعات المسجلة للعميل</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleWhatsAppShare} disabled={!activeClient?.phone || rowsLoadState !== "loaded"} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Share2 className="size-4" /> مشاركة واتساب</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white"><Printer className="size-4" /> طباعة</button>
          </div>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950" role="note">
          يعرض هذا الكشف الطلبات وكل حالات الدفعات التي يستطيع حساب الإدارة قراءتها ضمن الفترة. إجمالي المقبوض يحتسب الدفعات المعتمدة فقط. الرصيد المستحق غير متاح حتى تُربط فواتير الطلبات ومبالغها بمصدر مالي موثق. اكتمال الكشف يعتمد كذلك على سماح سياسات RLS بقراءة كل السجلات المطلوبة.
        </div>
        <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3">
          <label className="relative md:col-span-2">
            <span className="sr-only">البحث عن عميل</span>
            <Search className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الهاتف" className="h-11 w-full rounded-xl border border-slate-200 pr-11 pl-3 text-sm outline-none focus:border-sky-500" />
          </label>
          <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} disabled={clientsLoading} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-[#0F4C81]">
            {filteredClients.length === 0 && <option value="">لا يوجد عميل مطابق</option>}
            {filteredClients.map((client) => <option key={client.id} value={client.id}>{client.full_name || "عميل بدون اسم"} · {client.phone || "بلا هاتف"}</option>)}
          </select>
          <label className="text-xs font-bold text-slate-600">من تاريخ<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">إلى تاريخ<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">مسح التاريخ</button>
        </section>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}

        {activeClient && <section className="flex flex-col justify-between gap-3 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div><h2 className="text-lg font-black text-slate-900">{activeClient.full_name || "عميل بدون اسم"}</h2><p className="mt-1 text-xs text-slate-500">{activeClient.phone || "لا يوجد هاتف"} · عضو منذ {new Date(activeClient.created_at).toLocaleDateString("ar-YE")}</p></div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"><Package className="size-4 text-orange-500" /> {rowsLoadState === "loaded" ? `${rows.filter((row) => row.kind === "طلب").length} طلب ضمن الفترة` : "عدد الطلبات غير متاح حتى نجاح القراءة"}</span>
        </section>}

        <section className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><Wallet className="size-4" /> المقبوض من الدفعات المعتمدة ضمن الفترة</p>
            {rowsLoadState === "loaded" ? (
              receivedPresentation.state === "incomplete" ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xl font-black text-amber-800">{receivedPresentation.reportText}</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">توجد دفعة معتمدة بلا مبلغ موثق، لذلك لا يُعرض مجموع جزئي كإجمالي كامل.</p>
                  {receivedPresentation.partialText && <p className="mt-2 text-sm font-bold text-slate-700">{receivedPresentation.partialText}</p>}
                </div>
              ) : receivedPresentation.state === "none" ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-lg font-black text-slate-600">{receivedPresentation.reportText}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {receivedSummary.paymentCount === 0
                      ? "لم تُسجل أي دفعات للعميل ضمن الفترة المحددة."
                      : `تم تحميل ${receivedSummary.paymentCount} دفعة، لكن لا توجد دفعة معتمدة لاحتساب المقبوض.`}
                  </p>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="mb-2 text-xs font-bold text-emerald-800">الإجمالي المعتمد حسب العملة، دون جمع عملات مختلفة:</p>
                  <p className="whitespace-pre-line text-xl font-black leading-8 text-slate-900">{receivedPresentation.reportText}</p>
                </div>
              )
            ) : (
              <p className="mt-2 text-xl font-black text-slate-400">
                {rowsLoadState === "error" ? "غير متاح بسبب فشل القراءة" : "بانتظار اكتمال القراءة"}
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
            <p className="text-sm font-bold text-amber-800">الرصيد المستحق / المدين</p>
            <p className="mt-2 text-lg font-black text-amber-900">غير متاح من المخطط الحالي</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">الطلبات لا تحمل مبالغ، وجدول فواتير المبيعات غير موجود حاليًا؛ لذلك لن أقدّر رصيدًا غير موثّق.</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
            <h3 className="font-black text-[#0F4C81]">الحركات الفعلية ضمن الفترة</h3>
            {rowsLoadState === "loaded" && (
              <span className="text-xs font-bold text-slate-500">تم تحميل {loadedRecordsCount ?? 0} سجل: {rows.filter((row) => row.kind === "طلب").length} طلب و{rows.filter((row) => row.kind === "دفعة").length} دفعة</span>
            )}
          </div>
          {clientsLoading || rowsLoading ? <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> جارٍ تحميل البيانات…</div> : rowsLoadState === "error" ? <div role="alert" className="p-10 text-center text-sm font-bold text-red-700">تعذر تحميل السجلات؛ لم تُعرض النتيجة على أنها صفر.</div> : !activeClient ? <p className="p-10 text-center text-sm text-slate-500">اختر عميلًا لعرض حركاته.</p> : rowsLoadState === "loaded" && rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-2 size-5" />نجح الجلب، ولا توجد حركات ظاهرة لهذا الحساب ضمن الفترة المحددة.</div> : rowsLoadState !== "loaded" ? <p className="p-10 text-center text-sm text-slate-500">اختر عميلاً لبدء تحميل السجلات.</p> :
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-sky-50 text-xs font-bold text-[#0F4C81]"><tr><th className="p-3">التاريخ</th><th className="p-3">المرجع</th><th className="p-3">الحركة</th><th className="p-3">البيان</th><th className="p-3">المبلغ</th><th className="p-3">الحالة</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="whitespace-nowrap p-3 text-xs text-slate-600">{formatDate(row.date)}</td><td className="p-3 font-mono text-xs font-bold text-[#0F4C81]">{row.ref}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.kind === "دفعة" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>{row.kind}</span></td><td className="p-3">{row.description}</td><td className="whitespace-nowrap p-3 font-bold">{row.amount == null ? "غير متاح" : `${formatAmount(row.amount)} ${row.currency}`}</td><td className="p-3"><span className={`inline-flex items-center gap-1 text-xs font-bold ${row.kind === "دفعة" && row.status === "معتمد" ? "text-emerald-700" : row.kind === "دفعة" && row.status === "مرفوض" ? "text-red-700" : "text-slate-700"}`}>{row.kind === "دفعة" && row.status === "معتمد" && <CheckCircle2 className="size-3" />}{row.status}</span></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </main>
  );
}
