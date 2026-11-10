import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  List,
  UploadCloud,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell } from "@/components/AccountShell";

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
  const fmt = (value: number) => value.toLocaleString("en-US");

  const scrollToTopup = () => {
    topupFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <div className="wallet-fund-page" dir="rtl">
        <style>{WALLET_STYLE}</style>

        <header className="wf-topbar">
          <div className="wf-topbar-inner">
            <div className="wf-page-title"><Wallet size={18} /> شحن المحفظة</div>
            <button type="button" className="wf-back" onClick={() => window.history.back()}>
              رجوع <span aria-hidden="true">←</span>
            </button>
          </div>
        </header>

        <main className="wf-content">
          <section className="wf-greeting">
            <span className="wf-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <div className="wf-greeting-copy">
              <h2>أهلاً بك يا {displayName} 👋</h2>
              <p>هذه محفظتك الشخصية للشحن والدفع</p>
            </div>
          </section>

          <section className="wf-balance-card" aria-label="رصيد المحفظة">
            <span className="wf-orb wf-orb-one" aria-hidden="true" />
            <span className="wf-orb wf-orb-two" aria-hidden="true" />
            <div className="wf-card-heading">
              <span><Wallet size={16} /> رصيد حساب المحفظة</span>
              <span className="wf-currency-chip">ر.ي</span>
            </div>
            <div className="wf-balance-value" dir="ltr">
              <span>{transactionsLoading ? "…" : transactionsError ? "—" : fmt(balance)}</span>
              <small>ر.ي</small>
            </div>
            <div className="wf-balance-caption">
              <span className="wf-live-dot" /> الرصيد المتاح حسب سجل عملياتك المسجل
            </div>
            {transactionsError && <p className="wf-card-error">تعذر التحقق من الرصيد، أعد المحاولة من سجل العمليات.</p>}
          </section>

          <section className="wf-notice" role="note">
            <span className="wf-notice-icon" aria-hidden="true">!</span>
            <p>اختر وسيلة الدفع المناسبة، ثم أرسل مبلغ التحويل وأرفق صورة واضحة للسند. سيُراجع طلب الشحن قبل إضافة أي مبلغ إلى رصيدك.</p>
          </section>

          {!user && (
            <p role="alert" className="wf-login-alert">
              سجّل الدخول أولًا لعرض محفظتك أو إرسال طلب شحن.
            </p>
          )}

          <form ref={topupFormRef} id="topup-form" onSubmit={submitTopup} className="wf-form">
            <div className="wf-section-heading">
              <span className="wf-heading-icon"><UploadCloud size={16} /></span>
              <div>
                <h3>نموذج الشحن</h3>
                <p>أدخل بيانات التحويل لإرسال طلبك للمراجعة</p>
              </div>
            </div>

            <label className="wf-field">
              <span>اسم العميل</span>
              <input
                required
                minLength={2}
                maxLength={120}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                placeholder="اكتب اسم العميل"
              />
            </label>

            <label className="wf-field">
              <span>رقم الهاتف أو المحفظة</span>
              <input
                required
                minLength={7}
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="+967..."
              />
            </label>

            <label className="wf-field">
              <span>مبلغ الشحن <b>*</b></span>
              <div className="wf-amount-wrap">
                <span>ر.ي</span>
                <input
                  required
                  type="number"
                  min="1"
                  max="100000000"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </label>

            <label className="wf-field">
              <span>وسيلة الدفع <b>*</b></span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>

            <div className="wf-field wf-receipt-field">
              <span className="wf-label">سند التحويل (JPG / PNG / WEBP، حتى 2MB) <b>*</b></span>
              <p className="wf-receipt-help">أرفق صورة واضحة لإيصال نجاح التحويل، وتأكد من ظهور المبلغ وتاريخ التحويل أو رقم العملية.</p>
              <button type="button" className="wf-file-picker" onClick={() => fileInputRef.current?.click()}>
                <span className="wf-upload-icon"><UploadCloud size={17} /></span>
                <span className="wf-file-copy">
                  <strong>{receipt ? receipt.fileName : "اختيار ملف سند التحويل"}</strong>
                  <small>JPG / PNG / WEBP • حتى 2MB</small>
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleReceipt(event.target.files?.[0])}
                  aria-label="اختيار صورة سند التحويل"
                />
              </button>
              {receipt && (
                <p className="wf-file-selected" role="status"><CheckCircle2 size={14} /> تم اختيار السند</p>
              )}
            </div>

            <div className="wf-security-note"><CheckCircle2 size={14} /> لا ترفع صورة بطاقة ولا تشارك كلمة مرورك.</div>

            {error && <p role="alert" className="wf-message wf-error">{error}</p>}
            {success && <p role="status" className="wf-message wf-success">{success}</p>}

            <button type="submit" disabled={saving || !user} className="wf-submit">
              <UploadCloud size={17} />
              {saving ? "جارٍ حفظ الطلب…" : "إرسال طلب الشحن للمراجعة"}
            </button>
          </form>

          <section className="wf-stats" aria-label="ملخص سجل الرصيد">
            <div className="wf-stat wf-stat-add">
              <span>إجمالي الإضافات</span>
              <strong dir="ltr">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(additionsTotal)} <small>ر.ي</small></strong>
            </div>
            <div className="wf-stat wf-stat-deduct">
              <span>إجمالي الخصومات</span>
              <strong dir="ltr">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(deductionsTotal)} <small>ر.ي</small></strong>
            </div>
            <div className="wf-stat wf-stat-balance">
              <span>الرصيد الحالي</span>
              <strong dir="ltr">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(balance)} <small>ر.ي</small></strong>
            </div>
          </section>

          <section className="wf-log">
            <div className="wf-section-heading">
              <span className="wf-heading-icon"><List size={16} /></span>
              <div>
                <h3>سجل العمليات</h3>
                <p>عمليات الإضافة والخصم المسجلة على رصيدك</p>
              </div>
            </div>

            {transactionsLoading ? (
              <p role="status" className="wf-empty-state">جارٍ تحميل العمليات…</p>
            ) : transactionsError ? (
              <div role="alert" className="wf-load-error">
                <p>{transactionsError}</p>
                <button type="button" onClick={() => void loadTransactions()}>إعادة المحاولة</button>
              </div>
            ) : tx.length === 0 ? (
              <div className="wf-empty-state">
                <span className="wf-empty-icon"><List size={22} /></span>
                <strong>لا توجد عمليات بعد</strong>
                <p>ستظهر عمليات الشحن والخصم هنا بعد تسجيلها.</p>
              </div>
            ) : (
              <div className="wf-transactions">
                {tx.map((item) => (
                  <article key={item.id} className="wf-transaction">
                    <span className={`wf-transaction-icon ${item.amount >= 0 ? "is-positive" : "is-negative"}`}>
                      {item.amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <div className="wf-transaction-details">
                      <strong>{item.description || "عملية رصيد"}</strong>
                      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("ar-u-nu-latn")}</time>
                    </div>
                    <span dir="ltr" className={`wf-transaction-amount ${item.amount >= 0 ? "is-positive" : "is-negative"}`}>
                      {item.amount >= 0 ? "+" : "−"}{fmt(Math.abs(item.amount))} <small>ر.ي</small>
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="wf-footer">تُراجع جميع طلبات الشحن قبل إضافة أي مبلغ إلى رصيد المحفظة.</p>
        </main>
      </div>
    </AccountShell>
  );
}

const WALLET_STYLE = `
.wallet-fund-page{--wf-primary:#0f4c81;--wf-primary-2:#287fc4;--wf-orange:#f97316;--wf-ink:#15233b;--wf-muted:#64748b;--wf-line:#e4edf6;--wf-green:#12a150;direction:rtl;color:var(--wf-ink);font-family:'Tajawal','Cairo',sans-serif;}
.wallet-fund-page *{box-sizing:border-box;}
.wf-topbar{margin:-.75rem -.75rem 0;padding:10px 14px;background:rgba(255,255,255,.95);border-bottom:1px solid var(--wf-line);box-shadow:0 5px 18px rgba(15,76,129,.05);}
.wf-topbar-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.wf-page-title{display:flex;align-items:center;gap:8px;color:var(--wf-primary);font-size:14px;font-weight:900;}
.wf-back{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid #d7e6f5;border-radius:999px;background:#eff6fc;color:var(--wf-primary);font:inherit;font-size:11px;font-weight:800;cursor:pointer;}
.wf-content{width:100%;max-width:600px;margin:0 auto;padding:0 4px 28px;}
.wf-greeting{display:flex;align-items:center;gap:10px;margin:14px 0 12px;}
.wf-avatar{display:grid;flex:none;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--wf-primary),var(--wf-primary-2));color:#fff;font-size:17px;font-weight:900;box-shadow:0 6px 14px #0f4c8128;}
.wf-greeting-copy{min-width:0;}
.wf-greeting h2{margin:0;font-size:15px;font-weight:900;line-height:1.45;}
.wf-greeting p{margin:2px 0 0;color:var(--wf-muted);font-size:10px;font-weight:700;}
.wf-balance-card{position:relative;isolation:isolate;overflow:hidden;padding:17px 16px 14px;border-radius:17px;color:white;background:linear-gradient(115deg,#f97316 0%,#f7a34e 25%,#327bb6 67%,#0f4c81 100%);box-shadow:0 14px 28px #0f4c812b;}
.wf-orb{position:absolute;z-index:-1;border-radius:999px;background:#ffffff20;pointer-events:none;}
.wf-orb-one{width:115px;height:115px;inset-inline-start:-40px;top:-58px;}
.wf-orb-two{width:90px;height:90px;inset-inline-end:-34px;bottom:-54px;background:#ffffff12;}
.wf-card-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;font-weight:800;}
.wf-card-heading>span:first-child{display:flex;align-items:center;gap:6px;}
.wf-currency-chip{padding:4px 8px;border:1px solid #ffffff55;border-radius:7px;background:#ffffff20;font-size:9px;}
.wf-balance-value{display:flex;align-items:baseline;gap:6px;margin-top:14px;font-size:clamp(30px,8vw,40px);font-weight:900;line-height:1;letter-spacing:-.7px;}
.wf-balance-value small{font-size:12px;letter-spacing:0;}
.wf-balance-caption{display:flex;align-items:center;gap:7px;margin-top:9px;color:#ffffffed;font-size:9px;font-weight:700;}
.wf-live-dot{width:7px;height:7px;border-radius:50%;background:#7cf2b0;box-shadow:0 0 0 3px #7cf2b044;}
.wf-card-error{margin:8px 0 0;font-size:10px;font-weight:700;}
.wf-notice{display:flex;align-items:center;gap:9px;margin-top:12px;padding:10px 11px;border:1px solid #f4d876;border-radius:12px;background:#fff8df;color:#79520a;}
.wf-notice-icon{display:grid;flex:none;place-items:center;width:27px;height:27px;border-radius:8px;background:#fff0bd;color:#b45309;font-weight:900;}
.wf-notice p{margin:0;font-size:10px;font-weight:800;line-height:1.7;}
.wf-login-alert{margin:12px 0 0;padding:10px;border:1px solid #f4d876;border-radius:11px;background:#fff8df;color:#79520a;font-size:11px;font-weight:800;line-height:1.7;}
.wf-form,.wf-log{margin-top:12px;padding:13px;border:1px solid var(--wf-line);border-radius:15px;background:#fff;box-shadow:0 8px 22px #0f4c8109;}
.wf-section-heading{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.wf-heading-icon{display:grid;flex:none;place-items:center;width:28px;height:28px;border-radius:9px;background:#eaf2fb;color:var(--wf-primary);}
.wf-section-heading h3{margin:0;font-size:12px;font-weight:900;}
.wf-section-heading p{margin:2px 0 0;color:var(--wf-muted);font-size:9px;font-weight:700;line-height:1.5;}
.wf-field{display:block;margin:0 0 10px;color:var(--wf-ink);}
.wf-field>span:first-child,.wf-label{display:block;margin-bottom:5px;color:#52647b;font-size:10px;font-weight:800;}
.wf-field b,.wf-label b{color:var(--wf-orange);}
.wf-field input:not([type=file]),.wf-field select,.wf-amount-wrap input{width:100%;min-height:36px;padding:8px 10px;border:1px solid #dce7f1;border-radius:9px;background:#f5f8fc;color:var(--wf-ink);font-family:inherit;font-size:11px;font-weight:800;outline:none;transition:border-color .15s,background .15s;}
.wf-field input:focus,.wf-field select:focus,.wf-amount-wrap input:focus{border-color:#5a9bd1;background:#fff;box-shadow:0 0 0 3px #dceeff;}
.wf-field input::placeholder{color:#91a4ba;font-weight:600;}
.wf-amount-wrap{position:relative;}
.wf-amount-wrap>span{position:absolute;inset-inline-start:10px;top:50%;z-index:1;transform:translateY(-50%);color:var(--wf-muted);font-size:9px;font-weight:900;pointer-events:none;}
.wf-amount-wrap input{padding-inline-start:42px;}
.wf-field select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 11px center;cursor:pointer;}
.wf-receipt-field{margin-top:1px;}
.wf-receipt-help{margin:0 0 6px;color:var(--wf-muted);font-size:9px;line-height:1.6;}
.wf-file-picker{display:flex;width:100%;align-items:center;gap:9px;padding:8px;border:1px dashed #b9d5ef;border-radius:10px;background:#f6faff;text-align:right;font-family:inherit;cursor:pointer;}
.wf-upload-icon{display:grid;flex:none;place-items:center;width:30px;height:30px;border-radius:8px;background:#e5f1fc;color:var(--wf-primary);}
.wf-file-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px;}
.wf-file-copy strong{overflow:hidden;color:var(--wf-ink);font-size:9px;text-overflow:ellipsis;white-space:nowrap;}
.wf-file-copy small{color:var(--wf-muted);font-size:8px;}
.wf-file-picker input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;clip-path:inset(50%);}
.wf-file-picker:focus-within{outline:2px solid #5a9bd1;outline-offset:2px;}
.wf-file-selected{display:flex;align-items:center;gap:5px;margin:5px 0 0;color:#087b43;font-size:9px;font-weight:800;}
.wf-security-note{display:flex;align-items:center;gap:6px;margin:2px 0 0;padding:8px 9px;border:1px solid #b6e6cb;border-radius:8px;background:#e9f9ef;color:#13804a;font-size:9px;font-weight:800;}
.wf-message{margin:9px 0 0;padding:9px 10px;border-radius:9px;font-size:10px;font-weight:800;line-height:1.6;overflow-wrap:anywhere;}
.wf-error{background:#fff0f0;color:#a32222;}
.wf-success{background:#eaf8ef;color:#126b3c;}
.wf-submit{display:flex;width:100%;min-height:38px;align-items:center;justify-content:center;gap:7px;margin-top:10px;padding:9px 12px;border:0;border-radius:9px;background:linear-gradient(100deg,var(--wf-primary),var(--wf-primary-2));color:#fff;font-family:inherit;font-size:10px;font-weight:900;box-shadow:0 7px 15px #0f4c8127;cursor:pointer;transition:filter .15s,transform .15s;}
.wf-submit:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px);}
.wf-submit:disabled{cursor:not-allowed;opacity:.55;}
.wf-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px;}
.wf-stat{display:flex;min-width:0;flex-direction:column;align-items:center;gap:4px;padding:9px 4px;border:1px solid #dce7f1;border-radius:10px;background:#fff;text-align:center;}
.wf-stat span{color:var(--wf-muted);font-size:8px;font-weight:800;}
.wf-stat strong{font-size:10px;font-weight:900;white-space:nowrap;}
.wf-stat small{color:var(--wf-muted);font-size:7px;}
.wf-stat-add{border-color:#b9e7cc;}.wf-stat-add strong{color:#078244;}
.wf-stat-deduct{border-color:#f7d1b8;}.wf-stat-deduct strong{color:#c65d20;}
.wf-stat-balance{border-color:#c3ddf3;}.wf-stat-balance strong{color:var(--wf-primary);}
.wf-log{padding:13px;}
.wf-log .wf-section-heading{margin-bottom:10px;}
.wf-empty-state{display:flex;min-height:102px;flex-direction:column;align-items:center;justify-content:center;gap:7px;margin:0;padding:14px 10px;border:1px dashed #c8def1;border-radius:12px;background:linear-gradient(135deg,#f8fbff,#eff6fd);text-align:center;color:var(--wf-ink);}
.wf-empty-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--wf-orange);color:#fff;box-shadow:0 6px 13px #f9731633;}
.wf-empty-state strong{font-size:10px;font-weight:900;}
.wf-empty-state p{max-width:240px;margin:0;color:var(--wf-muted);font-size:9px;line-height:1.6;}
.wf-load-error{padding:10px;border:1px solid #f1c9c9;border-radius:10px;background:#fff5f5;color:#8d2222;font-size:10px;font-weight:700;}
.wf-load-error p{margin:0;}
.wf-load-error button{margin-top:7px;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;cursor:pointer;}
.wf-transactions{display:flex;flex-direction:column;gap:7px;}
.wf-transaction{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #edf1f5;border-radius:10px;background:#fff;}
.wf-transaction-icon{display:grid;flex:none;place-items:center;width:29px;height:29px;border-radius:8px;}
.wf-transaction-icon.is-positive{background:#e8f8ef;color:#0d8b4b;}
.wf-transaction-icon.is-negative{background:#fff0ee;color:#d34435;}
.wf-transaction-details{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px;}
.wf-transaction-details strong{overflow:hidden;font-size:9px;font-weight:800;text-overflow:ellipsis;white-space:nowrap;}
.wf-transaction-details time{color:var(--wf-muted);font-size:8px;}
.wf-transaction-amount{flex:none;font-size:9px;font-weight:900;}
.wf-transaction-amount small{font-size:7px;}
.wf-transaction-amount.is-positive{color:#087b43;}
.wf-transaction-amount.is-negative{color:#c7352d;}
.wf-footer{margin:12px 4px 0;color:var(--wf-muted);text-align:center;font-size:9px;font-weight:700;line-height:1.7;}
@media(min-width:640px){.wf-topbar{margin-inline:-1rem;padding-inline:18px;}.wf-content{padding-inline:8px;}.wf-form,.wf-log{padding:16px;}.wf-field input:not([type=file]),.wf-field select,.wf-amount-wrap input{min-height:40px;font-size:12px;}.wf-field>span:first-child,.wf-label{font-size:11px;}.wf-submit{min-height:42px;font-size:12px;}}
@media(prefers-reduced-motion:reduce){.wallet-fund-page *{scroll-behavior:auto!important;transition:none!important;}}
`;
