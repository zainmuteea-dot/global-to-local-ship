import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

// نوع الصفحة يقتصر على الأعمدة المطلوبة فعلًا.
// currency قيمة عرض ثابتة، وليست عمودًا مطلوبًا من قاعدة البيانات.
type Payment = Pick<
  PaymentRow,
  | "id"
  | "amount"
  | "created_at"
  | "customer_name"
  | "receipt_image"
  | "reviewed_at"
  | "status"
  | "tracking_code"
  | "updated_at"
  | "user_id"
  | "wallet"
> & {
  currency: string;
};

type PaymentFilter = "pending" | "approved" | "rejected" | "all";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع والمحاسبة — السوق الشامل" },
      {
        name: "description",
        content: "مراجعة واعتماد إيداعات العملاء وأرصدة المحافظ لحظياً.",
      },
      { property: "og:title", content: "طلبات الدفع والمحاسبة — السوق الشامل" },
      {
        property: "og:description",
        content: "مراجعة واعتماد إيداعات العملاء وأرصدة المحافظ لحظياً.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (value: number) => Math.round(value).toLocaleString("en-US");

const STATUS: Record<string, { t: string; c: string }> = {
  pending: {
    t: "بانتظار المراجعة",
    c: "bg-amber-100 text-amber-800",
  },
  approved: {
    t: "معتمد ✓",
    c: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    t: "مرفوض",
    c: "bg-red-100 text-red-700",
  },
};

function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error(`تعذر التحقق من جلسة الدخول: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error(
          "لا توجد جلسة دخول. سجّل الدخول بحساب الإدارة ثم أعد تحميل الصفحة.",
        );
      }

      const [adminRole, staffRole] = await Promise.all([
        supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        }),
        supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "staff",
        }),
      ]);

      if (adminRole.error || staffRole.error) {
        const roleError = adminRole.error ?? staffRole.error;

        throw new Error(
          `تعذر فحص دور الحساب: ${roleError?.message ?? "خطأ غير معروف"}`,
        );
      }

      if (!adminRole.data && !staffRole.data) {
        throw new Error(
          "الحساب مسجل الدخول لكنه لا يحمل دور admin أو staff في جدول user_roles.",
        );
      }

      // لا تطلب phone أو currency؛ قد لا يكونان موجودين في قاعدة البيانات المتصلة.
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,amount,created_at,customer_name,receipt_image,reviewed_at,status,tracking_code,updated_at,user_id,wallet",
        )
        .order("created_at", { ascending: false });

      if (error) {
        if (
          error.code === "42501" ||
          error.message.toLowerCase().includes("permission")
        ) {
          throw new Error(
            `رفضت سياسات RLS قراءة طلبات الدفع: ${error.message}`,
          );
        }

        throw new Error(
          `فشل استعلام جدول payments: ${error.message}${
            error.code ? ` (رمز ${error.code})` : ""
          }`,
        );
      }

      const paymentRows: Payment[] = (data ?? []).map((row) => ({
        ...row,
        currency: "ر.ي",
      }));

      setRows(paymentRows);
    } catch (error) {
      console.error("تعذر تحميل طلبات الدفع:", error);

      setErr(
        error instanceof Error
          ? error.message
          : "تعذر تحميل طلبات الدفع لسبب غير معروف.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("payments_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const review = async (payment: Payment, approve: boolean) => {
    setBusy(payment.id);
    setErr("");

    const status = approve ? "approved" : "rejected";

    const { error } = await supabase
      .from("payments")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (error) {
      setErr(
        `تعذر تحديث حالة الدفعة. تحقق من دور admin/staff وسياسة UPDATE في RLS: ${error.message}`,
      );
      setBusy(null);
      return;
    }

    const { error: orderError } = await supabase
      .from("orders")
      .update({
        status: approve
          ? "تم الدفع - قيد الشراء"
          : "الدفع مرفوض - بانتظار إيداع صحيح",
      })
      .eq("tracking_code", payment.tracking_code);

    if (orderError) {
      console.error(
        "تم تحديث الدفعة لكن تعذر تحديث الطلب:",
        orderError.message,
      );
    }

    if (payment.user_id) {
      if (approve) {
        const { error: walletError } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: payment.user_id,
            amount: Number(payment.amount),
            description: `إيداع معتمد للطلب ${payment.tracking_code} عبر ${payment.wallet}`,
          });

        if (walletError) {
          console.error(
            "تم اعتماد الدفعة لكن تعذر تسجيل حركة المحفظة:",
            walletError.message,
          );
        }
      }

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: payment.user_id,
          title: approve
            ? `تم اعتماد دفعتك للطلب ${payment.tracking_code} ✓`
            : `لم يتم قبول إيداع الطلب ${payment.tracking_code}`,
          body: approve
            ? `تم استلام ${fmt(Number(payment.amount))} ${payment.currency} وبدأنا بشراء طلبك.`
            : "يرجى التواصل معنا أو إرفاق سند صحيح.",
        });

      if (notificationError) {
        console.error(
          "تعذر إرسال إشعار حالة الدفع:",
          notificationError.message,
        );
      }
    }

    setBusy(null);
    await load();
  };

  const shown =
    filter === "all"
      ? rows
      : rows.filter((payment) => payment.status === filter);

  const ledger = useMemo(() => {
    const totals: Record<string, number> = {};

    rows
      .filter((payment) => payment.status === "approved")
      .forEach((payment) => {
        totals[payment.wallet] =
          (totals[payment.wallet] ?? 0) + Number(payment.amount);
      });

    return totals;
  }, [rows]);

  const totalApproved = Object.values(ledger).reduce(
    (total, amount) => total + amount,
    0,
  );

  const pendingSum = rows
    .filter((payment) => payment.status === "pending")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 sm:p-6 font-[Cairo]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between bg-gradient-to-l from-[#0A2540] to-[#0F4C81] text-white rounded-2xl p-5 shadow">
          <div>
            <h1 className="text-xl font-black">طلبات الدفع والمحاسبة</h1>
            <p className="text-xs text-sky-200 mt-1">
              تحديث لحظي من قاعدة البيانات
            </p>
          </div>

          <Link
            to="/admin"
            className="bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl text-sm font-bold"
          >
            ← لوحة الإدارة
          </Link>
        </div>

        {err && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm"
          >
            <div>
              <p className="font-black">تعذر تحميل أو تنفيذ طلبات الدفع</p>
              <p className="mt-1 break-words">{err}</p>
              <p className="mt-2 text-xs">
                إذا كان الخطأ متعلقًا بـRLS، تأكد من أن هذا المستخدم يملك دور
                admin أو staff في user_roles وأن سياسة payments تسمح له بالقراءة
                والتحديث.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load()}
              className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 font-bold hover:bg-red-200"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Kpi
            label="بانتظار الاعتماد"
            value={rows.filter((payment) => payment.status === "pending").length}
            sub={`${fmt(pendingSum)} ر.ي`}
            color="text-amber-600"
          />

          <Kpi
            label="إجمالي المقبوضات المعتمدة"
            value={fmt(totalApproved)}
            sub="ر.ي"
            color="text-emerald-600"
          />

          <Kpi
            label="دفعات معتمدة"
            value={rows.filter((payment) => payment.status === "approved").length}
            sub="عملية"
            color="text-[#0F4C81]"
          />

          <Kpi
            label="مرفوضة"
            value={rows.filter((payment) => payment.status === "rejected").length}
            sub="عملية"
            color="text-red-600"
          />
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 p-4 mt-4">
          <h2 className="font-black text-sm text-[#0A2540] mb-3">
            أرصدة الصناديق والمحافظ (تلقائي من الدفعات المعتمدة)
          </h2>

          {Object.keys(ledger).length === 0 ? (
            <p className="text-xs text-slate-500">
              لا توجد مقبوضات معتمدة بعد.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.entries(ledger).map(([wallet, value]) => (
                <div
                  key={wallet}
                  className="border border-emerald-100 bg-emerald-50 rounded-xl p-3 text-center"
                >
                  <div className="text-xs font-bold text-slate-600">
                    {wallet}
                  </div>
                  <div className="text-lg font-black text-emerald-700 mt-1">
                    {fmt(value)}
                  </div>
                  <div className="text-[10px] text-slate-500">ر.ي</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map(
            (statusFilter) => (
              <button
                key={statusFilter}
                type="button"
                onClick={() => setFilter(statusFilter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  filter === statusFilter
                    ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {statusFilter === "all"
                  ? "الكل"
                  : STATUS[statusFilter]?.t}
              </button>
            ),
          )}
        </div>

        <div className="mt-3 space-y-3">
          {loading && (
            <p className="text-sm text-slate-500">جارٍ التحميل...</p>
          )}

          {!loading && shown.length === 0 && (
            <p className="text-sm text-slate-500 bg-white rounded-xl p-4">
              لا توجد طلبات دفع في هذا القسم.
            </p>
          )}

          {shown.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4"
            >
              {payment.receipt_image ? (
                <button
                  type="button"
                  onClick={() => setPreview(payment.receipt_image)}
                  className="shrink-0"
                  aria-label="معاينة سند الدفع"
                >
                  <img
                    src={payment.receipt_image}
                    alt="سند الدفع"
                    className="w-24 h-24 object-cover rounded-xl border"
                  />
                </button>
              ) : (
                <div className="w-24 h-24 shrink-0 rounded-xl border border-dashed grid place-items-center text-[10px] text-slate-400">
                  بدون سند
                </div>
              )}

              <div className="flex-1 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-[#0A2540]">
                    {payment.customer_name || "عميل"}
                  </span>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      STATUS[payment.status]?.c ?? ""
                    }`}
                  >
                    {STATUS[payment.status]?.t ?? payment.status}
                  </span>
                </div>

                <div className="mt-1 text-xs text-slate-600">
                  الطلب <b dir="ltr">{payment.tracking_code}</b> • عبر{" "}
                  <b>{payment.wallet}</b> •{" "}
                  {new Date(payment.created_at).toLocaleString("ar")}
                </div>

                <div className="mt-2 text-lg font-black text-emerald-700">
                  {fmt(Number(payment.amount))} {payment.currency}
                </div>
              </div>

              {payment.status === "pending" && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy === payment.id}
                    onClick={() => void review(payment, true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    اعتماد واستلام المبلغ ✓
                  </button>

                  <button
                    type="button"
                    disabled={busy === payment.id}
                    onClick={() => void review(payment, false)}
                    className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold disabled:opacity-50"
                  >
                    رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <div
          role="presentation"
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 grid place-items-center p-4 z-50"
        >
          <img
            src={preview}
            alt="سند الدفع"
            className="max-h-[90vh] max-w-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-sky-100 p-4">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={`text-2xl font-black mt-1 ${color}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
