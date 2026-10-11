import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { List, Plus, Wallet, UploadCloud, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/account/wallet")({
  head: () => ({
    meta: [
      { title: "الرصيد — السوق الشامل" },
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

const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;

function WalletPage() {
  const { user } = useSession();
  const [tx, setTx] = useState<Tx[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [receipt, setReceipt] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setCustomerName(
      String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""),
    );
    setPhone(String(user.user_metadata?.phone ?? ""));

    let alive = true;
    supabase
      .from("wallet_transactions")
      .select("id,amount,description,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!alive) return;
        if (loadError) {
          console.error("Could not load wallet transactions", loadError);
          return;
        }
        setTx(
          (data ?? []).map((item) => ({
            ...item,
            amount: Number(item.amount),
          })),
        );
      });

    return () => {
      alive = false;
    };
  }, [user]);

  const adds = tx.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const subs = tx.filter((item) => item.amount < 0).reduce((sum, item) => sum - item.amount, 0);
  const fmt = (value: number) => value.toLocaleString("ar-YE");

  const handleReceipt = (file?: File) => {
    setError("");
    setSuccess("");
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
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
      // الجدول منفصل عمدًا عن payments المرتبط بدفعات طلبات الشراء.
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
      setSuccess(`تم حفظ الطلب ${data?.request_code ?? ""} وإرساله للمراجعة. لن يُضاف الرصيد حتى تعتمد الإدارة الطلب.`);
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

  return (
    <AccountShell title="الرصيد">
      <div className="flex items-center justify-between rounded-3xl bg-card p-5 ring-1 ring-border">
        <div>
          <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
          <p className="font-display text-3xl font-black text-cocoadeep">
            {fmt(adds - subs)} <span className="text-sm">ر.ي</span>
          </p>
        </div>
        <a href="#topup-form" aria-label="إنشاء طلب شحن" className="grid size-12 place-items-center rounded-2xl bg-cocoa text-cream shadow">
          <Plus className="size-5" />
        </a>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["عدد العمليات", tx.length], ["الإضافات", adds], ["الخصومات", subs]].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl bg-card p-3 text-center ring-1 ring-border">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="font-display font-black text-cocoadeep">{fmt(value as number)}</p>
          </div>
        ))}
      </div>

      <form id="topup-form" onSubmit={submitTopup} className="mt-4 space-y-4 rounded-3xl bg-card p-5 ring-1 ring-border">
        <div>
          <h2 className="font-display text-lg font-black text-cocoadeep">طلب شحن الرصيد</h2>
          <p className="mt-1 text-sm text-muted-foreground">أرسل بيانات التحويل والسند. الطلب يذهب للمراجعة ولا يضيف الرصيد تلقائيًا.</p>
        </div>

        <label className="block space-y-1.5 text-sm font-bold">
          <span>اسم العميل</span>
          <input required minLength={2} maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3" autoComplete="name" />
        </label>

        <label className="block space-y-1.5 text-sm font-bold">
          <span>رقم الهاتف أو المحفظة</span>
          <input required minLength={7} maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3" inputMode="tel" autoComplete="tel" />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-bold">
            <span>مبلغ الشحن (ر.ي)</span>
            <input required type="number" min="1" max="100000000" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3" inputMode="decimal" />
          </label>
          <label className="block space-y-1.5 text-sm font-bold">
            <span>وسيلة الدفع</span>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3">
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-bold">سند التحويل (JPG / PNG / WEBP، حتى 2MB)</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleReceipt(e.target.files?.[0])} className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-cocoa file:px-4 file:py-2 file:font-bold file:text-cream" />
          {receipt && <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />{receipt.fileName}</div>}
          <p className="text-xs text-muted-foreground">يرفع السند إلى سجل الطلب بشكل خاص. لا ترسل معلومات بطاقة أو كلمة مرور.</p>
        </div>

        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}

        <button type="submit" disabled={saving || !user} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa px-4 py-3 font-bold text-cream disabled:cursor-wait disabled:opacity-60">
          <UploadCloud className="size-5" />{saving ? "جارٍ حفظ الطلب…" : "إرسال طلب الشحن للمراجعة"}
        </button>
      </form>

      <div className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
        <p className="mb-3 flex items-center gap-2 font-display text-sm font-black text-cocoadeep"><List className="size-4 text-clay" />سجل عمليات الرصيد</p>
        {tx.length === 0 ? (
          <EmptyState icon={<Wallet className="size-6" />} title="لا توجد عمليات رصيد حتى الآن" />
        ) : (
          <div className="space-y-2">
            {tx.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-background p-3 ring-1 ring-border">
                <div>
                  <p className="text-sm font-bold text-cocoadeep">{item.description || "عملية"}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("ar")}</p>
                </div>
                <p dir="ltr" className={`font-display font-black ${item.amount >= 0 ? "text-clay" : "text-destructive"}`}>
                  {item.amount >= 0 ? "+" : ""}{fmt(item.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountShell>
  );
}
