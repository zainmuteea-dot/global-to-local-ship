import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  List,
  Plus,
  UploadCloud,
  Wallet,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/wallet")({
  head: () => ({
    meta: [
      { title: "محفظتي — السوق الشامل" },
      { name: "description", content: "رصيدك وطلبات شحن الرصيد في السوق الشامل." },
    ],
  }),
  component: WalletPage,
});

type Tx = {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
};

const PAYMENT_METHODS = [
  "الكريمي جوال / حاسب",
  "ون كاش OneCash",
  "فلوسك Floosak",
  "جوالي Jawali",
  "جيب Jeeb",
  "حوالة النجم",
] as const;
const QUICK_AMOUNTS = [5000, 10000, 20000] as const;
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;

function WalletPage() {
  const { user } = useSession();
  const [tx, setTx] = useState<Tx[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [receipt, setReceipt] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topupFormRef = useRef<HTMLFormElement>(null);

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTx([]);
      setTransactionsLoading(false);
      setTransactionsError("");
      return;
    }

    setTransactionsLoading(true);
    setTransactionsError("");
    try {
      const { data, error: loadError } = await supabase
        .from("wallet_transactions")
        .select("id,amount,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (loadError) throw loadError;
      setTx(
        (data ?? []).map((item) => ({
          ...item,
          amount: Number(item.amount),
        })),
      );
    } catch (cause) {
      console.error("Could not load wallet transactions", cause);
      setTransactionsError("تعذر تحميل سجل الرصيد. تحقق من اتصالك ثم أعد المحاولة.");
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCustomerName("");
      setPhone("");
      void loadTransactions();
      return;
    }
    setCustomerName(
      String(user.user_metadata?.["full_name"] ?? user.user_metadata?.["name"] ?? ""),
    );
    setPhone(String(user.user_metadata?.["phone"] ?? ""));
    void loadTransactions();
  }, [user, loadTransactions]);

  const addedTransactions = tx.filter((item) => item.amount > 0);
  const deductedTransactions = tx.filter((item) => item.amount < 0);
  const additionsTotal = addedTransactions.reduce((sum, item) => sum + item.amount, 0);
  const deductionsTotal = deductedTransactions.reduce((sum, item) => sum - item.amount, 0);
  const balance = additionsTotal - deductionsTotal;
  const fmt = (value: number) => value.toLocaleString("ar-YE");

  const scrollToTopup = () => {
    topupFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseQuickAmount = (value: number) => {
    setAmount(String(value));
    setError("");
    setSuccess("");
    scrollToTopup();
  };

  const choosePaymentMethod = (method: string) => {
    setPaymentMethod(method);
    setError("");
    setSuccess("");
    scrollToTopup();
  };

  const handleReceipt = (file?: File) => {
    setError("");
    setSuccess("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("ارفع صورة بصيغة JPG أو PNG أو WEBP.");
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError("حجم السند أكبر من 2 ميغابايت. اختر صورة أصغر.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("تعذرت قراءة الصورة. حاول اختيارها مرة أخرى.");
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        setError("تعذرت قراءة الصورة. حاول مرة أخرى.");
        return;
      }
      setReceipt({ dataUrl, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const submitTopup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("سجّل الدخول أولًا لإرسال طلب شحن.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("أدخل مبلغًا أكبر من صفر.");
      return;
    }
    if (parsedAmount > 100000000) {
      setError("المبلغ أكبر من الحد المسموح. تواصل مع الإدارة.");
      return;
    }
    if (customerName.trim().length < 2) {
      setError("أدخل اسم العميل بشكل صحيح.");
      return;
    }
    if (phone.trim().length < 7) {
      setError("أدخل رقم الهاتف أو المحفظة بشكل صحيح.");
      return;
    }
    if (!receipt) {
      setError("أرفق صورة سند التحويل قبل إرسال الطلب.");
      return;
    }

    setSaving(true);
    try {
      // طلب الشحن محفوظ في جدوله الخاص، ولا يُضاف الرصيد قبل اعتماد الإدارة.
      const { data, error: insertError } = await (supabase as any)
        .from("wallet_topup_requests")
        .insert({
          user_id: user.id,
          customer_name: customerName.trim(),
          phone: phone.trim(),
          amount: parsedAmount,
          currency: "YER",
          payment_method: paymentMethod,
          receipt_image: receipt.dataUrl,
          status: "pending_review",
        })
        .select("request_code")
        .single();

      if (insertError) throw insertError;
      setSuccess(
        `تم حفظ الطلب ${data?.request_code ?? ""} وإرساله للمراجعة. لن يُضاف الرصيد حتى تعتمد الإدارة الطلب.`,
      );
      setAmount("");
      setReceipt(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (cause) {
      console.error("Top-up request save failed", cause);
      const message = cause instanceof Error ? cause.message : "تعذر حفظ الطلب.";
      setError(`تعذر حفظ طلب الشحن: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    String(user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"] ?? "").trim() ||
    user?.email?.split("@")[0] ||
    "بك";

  return (
    <AccountShell title="محفظتي">
      <div className="space-y-4 pb-8">
        <section className="flex items-center gap-3 px-1 py-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0F4C81] to-[#287FC4] text-base font-black text-white shadow-md shadow-sky-900/15">
            {displayName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-slate-900">أهلاً بك يا {displayName} 👋</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">هذه محفظتك الشخصية للشحن والدفع</p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#0F4C81] via-[#327BB6] to-[#FF8A28] px-4 py-4 text-white shadow-xl shadow-sky-900/20">
          <span className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-white/15" aria-hidden="true" />
          <span className="pointer-events-none absolute -right-8 -bottom-12 size-32 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <Wallet className="size-4" /> رصيد الحساب والمحفظة
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white/90">ر.ي</span>
          </div>
          <div className="relative mt-5">
            <p className="text-[11px] font-semibold text-white/80">الرصيد المتاح حالياً</p>
            <p className="mt-1 flex items-baseline gap-1.5 text-3xl font-black tracking-tight" dir="rtl">
              {transactionsLoading ? "…" : transactionsError ? "—" : fmt(balance)}
              <span className="text-sm font-bold text-white/90">ر.ي</span>
            </p>
            {transactionsError && (
              <p className="mt-1 text-[10px] font-semibold text-white/90">تعذر التحقق من الرصيد، أعد المحاولة أدناه.</p>
            )}
          </div>
          <div className="relative mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-white/85">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,.2)]" />
            يُحسب الرصيد من سجل عملياتك المسجلة
          </div>
        </section>

        <section aria-labelledby="quick-charge-title">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="grid size-8 place-items-center rounded-lg bg-sky-50 text-[#0F4C81]"><Zap className="size-4" /></span>
            <h3 id="quick-charge-title" className="text-sm font-black text-slate-900">شحن سريع</h3>
            <span className="ms-auto text-[10px] font-medium text-slate-500">اختر مبلغًا لبدء طلب الشحن</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={!user}
                onClick={() => chooseQuickAmount(value)}
                className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-white p-2 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-white"><Plus className="size-3.5" /></span>
                <span className="text-sm font-black">{fmt(value)}</span>
                <span className="text-[9px] font-bold text-slate-500">ر.ي</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="وسائل الشحن" className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!user}
            onClick={() => choosePaymentMethod("الكريمي جوال / حاسب")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#287FC4] px-2.5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-sky-900/15 transition hover:brightness-105 disabled:opacity-50"
          >
            <Wallet className="size-4" /> شحن عبر الكريمي
          </button>
          <button
            type="button"
            disabled={!user}
            onClick={() => choosePaymentMethod("ون كاش OneCash")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 to-orange-400 px-2.5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-orange-700/15 transition hover:brightness-105 disabled:opacity-50"
          >
            <Wallet className="size-4" /> شحن عبر ون كاش
          </button>
        </section>

        {!user && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
            سجّل الدخول أولًا لعرض محفظتك أو إرسال طلب شحن.
          </p>
        )}

        <form
          ref={topupFormRef}
          id="topup-form"
          onSubmit={submitTopup}
          className="scroll-mt-4 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div>
            <h3 className="text-sm font-black text-slate-900">طلب شحن الرصيد</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              أرسل بيانات التحويل والسند. الطلب يذهب للمراجعة ولا يضيف الرصيد تلقائيًا.
            </p>
          </div>

          <label className="block space-y-1 text-xs font-bold text-slate-700">
            <span>اسم العميل</span>
            <input
              required
              minLength={2}
              maxLength={120}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              autoComplete="name"
            />
          </label>

          <label className="block space-y-1 text-xs font-bold text-slate-700">
            <span>رقم الهاتف أو المحفظة</span>
            <input
              required
              minLength={7}
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-bold text-slate-700">
              <span>مبلغ الشحن (ر.ي)</span>
              <input
                required
                type="number"
                min="1"
                max="100000000"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                inputMode="decimal"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-700">
              <span>وسيلة الدفع</span>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700">سند التحويل (JPG / PNG / WEBP، حتى 2MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleReceipt(event.target.files?.[0])}
              className="block w-full text-xs text-slate-600 file:me-2 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-bold file:text-[#0F4C81]"
            />
            {receipt && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="size-4 shrink-0" /> {receipt.fileName}
              </div>
            )}
            <p className="text-[10px] leading-4 text-slate-500">لا ترسل معلومات بطاقة أو كلمة مرور.</p>
          </div>

          {error && <p role="alert" className="break-words rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-800">{error}</p>}
          {success && <p role="status" className="break-words rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">{success}</p>}

          <button
            type="submit"
            disabled={saving || !user}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#287FC4] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-sky-900/15 disabled:cursor-wait disabled:opacity-50"
          >
            <UploadCloud className="size-4" />
            {saving ? "جارٍ حفظ الطلب…" : "إرسال طلب الشحن للمراجعة"}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <span className="grid size-8 place-items-center rounded-lg bg-sky-50 text-[#0F4C81]"><List className="size-4" /></span>
            سجل العمليات الأخيرة
          </h3>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-2 text-center">
              <p className="text-[9px] font-semibold text-slate-500">عدد العمليات</p>
              <p className="mt-0.5 text-xs font-black text-slate-900">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(tx.length)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-center">
              <p className="text-[9px] font-semibold text-emerald-700">عدد الإضافات</p>
              <p className="mt-0.5 text-xs font-black text-emerald-800">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(addedTransactions.length)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-2 text-center">
              <p className="text-[9px] font-semibold text-red-700">عدد الخصومات</p>
              <p className="mt-0.5 text-xs font-black text-red-800">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(deductedTransactions.length)}</p>
            </div>
          </div>

          {transactionsLoading ? (
            <p role="status" className="mt-3 rounded-xl bg-slate-50 py-7 text-center text-xs font-medium text-slate-500">جارٍ تحميل العمليات…</p>
          ) : transactionsError ? (
            <div role="alert" className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-800">
              <p>{transactionsError}</p>
              <button type="button" onClick={() => void loadTransactions()} className="mt-2 font-bold underline">إعادة المحاولة</button>
            </div>
          ) : tx.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-sky-200 bg-gradient-to-br from-sky-50 to-slate-50 p-4">
              <EmptyState icon={<Wallet className="size-6" />} title="لا توجد عمليات بعد" text="ستظهر عمليات الشحن والخصم هنا بعد تسجيلها." />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {tx.map((item) => (
                <article key={item.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.amount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {item.amount >= 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">{item.description || "عملية رصيد"}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{new Date(item.created_at).toLocaleDateString("ar")}</p>
                  </div>
                  <p dir="ltr" className={`shrink-0 text-xs font-black ${item.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {item.amount >= 0 ? "+" : "−"}{fmt(Math.abs(item.amount))} <span className="text-[9px]">ر.ي</span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="px-2 text-center text-[10px] font-medium leading-5 text-slate-500">
          جميع طلبات الشحن تُراجع قبل إضافة أي مبلغ إلى رصيد المحفظة.
        </p>
      </div>
    </AccountShell>
  );
}
