import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
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
    <div className="fd-root" dir="rtl" lang="ar">
      <style>{WALLET_STYLE}</style>
      <header className="fd-topbar">
        <div className="fd-topbar-in">
          <div className="fd-tp-title">
            <Wallet size={20} aria-hidden="true" />
            شحن المحفظة
          </div>
          <button className="fd-ghost" type="button" onClick={() => navigate({ to: "/my-account" })}>
            <span aria-hidden="true">←</span> رجوع
          </button>
        </div>
      </header>
      <main className="fd-wrap">
        <section className="fd-greet">
          <span className="ava">{displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1>أهلاً بك يا {displayName} 👋</h1>
            <p>هذه محفظتك الشخصية للشحن والدفع</p>
          </div>
        </section>

        <section className="fd-card" aria-label="رصيد المحفظة">
          <div className="fd-card-top">
            <span className="lbl"><Wallet size={18} aria-hidden="true" /> رصيد حساب المحفظة</span>
            <span className="fd-chip" aria-hidden="true" />
          </div>
          <div className="fd-bal">
            <div className="amt" dir="ltr">
              {transactionsLoading ? "…" : transactionsError ? "—" : fmt(balance)}.00
              <span className="cur">ر.ي</span>
            </div>
            <div className="sub"><span className="dot" /> الرصيد المتاح حسب سجل العمليات</div>
            {transactionsError && <p className="fd-card-error">تعذر التحقق من الرصيد؛ أعد المحاولة من سجل العمليات.</p>}
          </div>
        </section>

        <section className="fd-notice" role="note">
          <span className="ic" aria-hidden="true">!</span>
          <div className="tx">أرسل مبلغ التحويل عبر وسيلة الدفع المناسبة وأرفق سندًا واضحًا. سيُراجع الطلب قبل إضافة أي مبلغ إلى رصيدك.</div>
        </section>

        {!user && (
          <p className="fd-login-alert" role="alert">سجّل الدخول أولًا لعرض محفظتك أو إرسال طلب شحن.</p>
        )}

        <form id="topup-form" onSubmit={submitTopup} className="fd-form">
          <h3><span className="ic"><UploadCloud size={18} aria-hidden="true" /></span> نموذج الشحن</h3>

          <div className="fd-field">
            <label htmlFor="wallet-customer-name">اسم العميل</label>
            <input
              id="wallet-customer-name"
              className="fd-input"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              autoComplete="name"
              placeholder="اكتب اسم العميل"
            />
          </div>

          <div className="fd-field">
            <label htmlFor="wallet-phone">رقم الهاتف / المحفظة</label>
            <input
              id="wallet-phone"
              className="fd-input"
              type="tel"
              required
              minLength={7}
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="رقم الهاتف أو المحفظة"
            />
          </div>

          <div className="fd-field">
            <label htmlFor="wallet-amount">مبلغ الشحن <span className="req">*</span></label>
            <div className="fd-amtwrap">
              <span className="cu">ر.ي</span>
              <input
                id="wallet-amount"
                className="fd-input amt-in"
                type="number"
                min="1"
                max="100000000"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="fd-field">
            <label htmlFor="wallet-method">وسيلة الدفع <span className="req">*</span></label>
            <select id="wallet-method" className="fd-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>

          <div className="fd-field">
            <label htmlFor="wallet-receipt">سند التحويل (JPG / PNG / WEBP، حتى 2MB) <span className="req">*</span></label>
            <label className="fd-file" htmlFor="wallet-receipt">
              <span className="fic"><UploadCloud size={20} aria-hidden="true" /></span>
              <span className="fd-file-copy">
                <span className="ft">{receipt ? receipt.fileName : "اختيار ملف سند التحويل"}</span>
                <span className="fs">JPG / PNG / WEBP وحتى 2MB</span>
              </span>
              <input
                id="wallet-receipt"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => handleReceipt(event.target.files?.[0])}
              />
            </label>
            <p className="fd-receipt-help">أرفق صورة واضحة لإيصال نجاح التحويل، ولا ترفع بيانات البطاقة أو كلمة المرور.</p>
          </div>

          <div className="fd-secnote"><CheckCircle2 size={15} aria-hidden="true" /> لا ترسل معلومات بطاقة أو كلمة مرور</div>
          {error && <p className="fd-message fd-error" role="alert">{error}</p>}
          {success && <p className="fd-message fd-success" role="status">{success}</p>}

          <button className="fd-submit" type="submit" disabled={saving || !user}>
            <UploadCloud size={19} aria-hidden="true" />
            {saving ? "جارٍ الإرسال…" : "إرسال طلب الشحن"}
          </button>
        </form>

        <section className="fd-stats" aria-label="ملخص عمليات المحفظة">
          <div className="fd-stat total">
            <div className="st-l">إجمالي الإضافات</div>
            <div className="st-v">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(additionsTotal)}<span className="cu">ر.ي</span></div>
          </div>
          <div className="fd-stat paid">
            <div className="st-l">إجمالي الخصومات</div>
            <div className="st-v">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(deductionsTotal)}<span className="cu">ر.ي</span></div>
          </div>
          <div className="fd-stat rem">
            <div className="st-l">الرصيد الحالي</div>
            <div className="st-v">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(balance)}<span className="cu">ر.ي</span></div>
          </div>
        </section>

        <section className="fd-log">
          <h3><span className="ic"><List size={18} aria-hidden="true" /></span> سجل العمليات</h3>
          {transactionsLoading ? (
            <p className="fd-empty-state" role="status">جارٍ تحميل العمليات…</p>
          ) : transactionsError ? (
            <div className="fd-log-error" role="alert">
              <p>{transactionsError}</p>
              <button type="button" onClick={() => void loadTransactions()}>إعادة المحاولة</button>
            </div>
          ) : tx.length === 0 ? (
            <div className="fd-empty">
              <span className="eic"><List size={28} aria-hidden="true" /></span>
              <div className="et">لا توجد عمليات بعد</div>
              <div className="es">ستظهر عمليات الشحن والخصم هنا بعد تسجيلها.</div>
            </div>
          ) : (
            <div className="fd-transactions">
              {tx.map((item) => (
                <article key={item.id} className="fd-transaction">
                  <span className={`fd-tx-icon ${item.amount >= 0 ? "positive" : "negative"}`}>
                    {item.amount >= 0 ? <ArrowDownLeft size={17} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}
                  </span>
                  <div className="fd-tx-info">
                    <strong>{item.description || "عملية رصيد"}</strong>
                    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("ar-u-nu-latn")}</time>
                  </div>
                  <span dir="ltr" className={`fd-tx-amount ${item.amount >= 0 ? "positive" : "negative"}`}>
                    {item.amount >= 0 ? "+" : "−"}{fmt(Math.abs(item.amount))} <small>ر.ي</small>
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="fd-footer">تُراجع جميع طلبات الشحن قبل اعتمادها. تأكّد من المبلغ وسند التحويل قبل الإرسال.</p>
      </main>
    </div>
  );
}


const WALLET_STYLE = `
.fd-root{--primary:#0F4C81;--primary2:#1C6FB8;--gold:#D4AF37;--orange:#F97316;--orange2:#FB923C;--ink:#15233B;--ink2:#64748B;--line:#E6EEF6;--ok:#12A150;--ok2:#E3F6EC;--sky:#EAF2FB;--warn:#B45309;--warnbg:#FEF6DC;--warnbd:#F5E08A;box-sizing:border-box;min-height:100dvh;background:linear-gradient(135deg,#EAF3FD,#F5FAFE 60%);color:var(--ink);direction:rtl;font-family:'Tajawal','Cairo',sans-serif;}
.fd-root,.fd-root *{box-sizing:border-box;}
.fd-root h1,.fd-root h3,.fd-root p{margin-top:0;}
.fd-root button,.fd-root input,.fd-root select{font-family:inherit;}
.fd-wrap{width:100%;max-width:600px;margin:0 auto;padding:0 16px 48px;}
.fd-topbar{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);box-shadow:0 6px 22px rgba(15,76,129,.06);}
.fd-topbar-in{max-width:600px;margin:0 auto;padding:11px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.fd-tp-title{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:900;color:var(--primary);}
.fd-ghost{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--primary);background:var(--sky);border:1px solid #D7E6F5;border-radius:999px;padding:9px 15px;cursor:pointer;transition:background .2s,transform .2s;}
.fd-ghost:hover{background:#DCEBFA;transform:translateY(-1px);}
.fd-greet{margin-top:20px;display:flex;align-items:center;gap:13px;}
.fd-greet .ava{width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg,var(--primary),var(--primary2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;flex:none;box-shadow:0 10px 22px rgba(15,76,129,.26);}
.fd-greet h1{margin-bottom:0;font-size:clamp(18px,4.5vw,22px);font-weight:900;}
.fd-greet p{margin:2px 0 0;font-size:12.5px;font-weight:700;color:var(--ink2);}
.fd-card{margin-top:18px;position:relative;overflow:hidden;border-radius:24px;padding:24px 22px;color:#fff;background:linear-gradient(125deg,#F97316 0%,#FB923C 24%,#2F6FB0 68%,#0F4C81 100%);box-shadow:0 20px 46px rgba(15,76,129,.3),0 10px 22px rgba(249,115,22,.2);}
.fd-card::before{content:"";position:absolute;inset-inline-end:-40px;top:-60px;width:190px;height:190px;background:rgba(255,255,255,.14);border-radius:50%;pointer-events:none;}
.fd-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1;}
.fd-card-top .lbl{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800;opacity:.95;}
.fd-chip{width:40px;height:29px;border-radius:7px;background:linear-gradient(135deg,#F7D774,#D4AF37);box-shadow:inset 0 1px 2px rgba(255,255,255,.5);position:relative;flex:none;}
.fd-chip::after{content:"";position:absolute;inset:6px;border:1px solid rgba(255,255,255,.55);border-radius:4px;}
.fd-bal{position:relative;z-index:1;margin-top:18px;}
.fd-bal .amt{font-size:clamp(38px,10vw,52px);font-weight:900;line-height:1;letter-spacing:-1px;display:flex;align-items:baseline;gap:8px;}
.fd-bal .amt .cur{font-size:clamp(17px,4vw,22px);font-weight:800;opacity:.92;}
.fd-bal .sub{margin-top:9px;font-size:13px;font-weight:700;opacity:.9;display:inline-flex;align-items:center;gap:6px;}
.fd-bal .sub .dot{width:8px;height:8px;border-radius:50%;background:#7CF2B0;box-shadow:0 0 0 4px rgba(124,242,176,.25);}
.fd-card-error{margin:8px 0 0;color:#fff;font-size:11px;font-weight:700;}
.fd-notice{margin-top:18px;background:var(--warnbg);border:1.5px solid var(--warnbd);border-radius:18px;padding:16px 18px;display:flex;align-items:flex-start;gap:13px;box-shadow:0 8px 22px rgba(180,83,9,.08);}
.fd-notice .ic{width:42px;height:42px;border-radius:12px;background:#FCEFC0;color:var(--warn);border:1px solid var(--warnbd);display:flex;align-items:center;justify-content:center;flex:none;font-size:20px;font-weight:900;}
.fd-notice .tx{font-size:13px;font-weight:800;color:#7A4A08;line-height:1.85;}
.fd-login-alert{margin:12px 0 0;padding:12px;border:1px solid var(--warnbd);border-radius:12px;background:var(--warnbg);color:#7A4A08;font-size:12px;font-weight:800;line-height:1.7;}
.fd-form{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 14px 34px rgba(15,76,129,.07);}
.fd-form h3,.fd-log h3{display:flex;align-items:center;gap:9px;margin:0 0 16px;font-size:16px;font-weight:900;}
.fd-form h3 .ic,.fd-log h3 .ic{width:34px;height:34px;border-radius:10px;background:var(--sky);color:var(--primary);display:flex;align-items:center;justify-content:center;flex:none;}
.fd-field{margin-bottom:15px;}
.fd-field>label:first-child{display:block;font-size:12.5px;font-weight:800;color:var(--ink2);margin-bottom:7px;}
.fd-field label .req{color:var(--orange);}
.fd-input,.fd-select{width:100%;font-size:14.5px;font-weight:800;color:var(--ink);background:#F8FBFE;border:1.5px solid var(--line);border-radius:13px;padding:13px 15px;transition:border-color .18s,background .18s;}
.fd-input:focus,.fd-select:focus{outline:none;border-color:var(--primary2);background:#fff;box-shadow:0 0 0 3px rgba(28,111,184,.1);}
.fd-input::placeholder{color:#9FB2C8;font-weight:700;}
.fd-input.amt-in{font-size:20px;font-weight:900;letter-spacing:-.5px;}
.fd-amtwrap{position:relative;}
.fd-amtwrap .cu{position:absolute;inset-inline-start:15px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:900;color:var(--ink2);pointer-events:none;}
.fd-amtwrap .amt-in{padding-inline-start:46px;}
.fd-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2364748B' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 15px center;padding-inline-start:40px;cursor:pointer;}
.fd-file{display:flex;align-items:center;gap:12px;border:1.5px dashed #C9DCEF;border-radius:13px;padding:13px 15px;background:#F8FBFE;cursor:pointer;transition:border-color .18s,background .18s;}
.fd-file:hover{border-color:var(--primary2);background:#fff;}
.fd-file .fic{width:40px;height:40px;border-radius:11px;background:var(--sky);color:var(--primary);display:flex;align-items:center;justify-content:center;flex:none;}
.fd-file-copy{display:flex;min-width:0;flex-direction:column;}
.fd-file .ft{overflow:hidden;font-size:13px;font-weight:800;text-overflow:ellipsis;white-space:nowrap;}
.fd-file .fs{font-size:11px;font-weight:700;color:var(--ink2);margin-top:2px;}
.fd-file input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;}
.fd-file:focus-within{outline:2px solid var(--primary2);outline-offset:2px;}
.fd-receipt-help{margin:7px 0 0;color:var(--ink2);font-size:10px;font-weight:600;line-height:1.65;}
.fd-secnote{margin-top:4px;display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;color:var(--ok);background:var(--ok2);border:1px solid #BBE7CC;border-radius:11px;padding:10px 13px;}
.fd-message{margin:10px 0 0;padding:10px 12px;border-radius:11px;font-size:11px;font-weight:800;line-height:1.7;overflow-wrap:anywhere;}
.fd-error{background:#fff0f0;color:#a32222;}.fd-success{background:#eaf8ef;color:#126b3c;}
.fd-submit{width:100%;margin-top:16px;display:inline-flex;align-items:center;justify-content:center;gap:9px;font-size:15px;font-weight:900;color:#fff;background:linear-gradient(135deg,var(--primary),var(--primary2));border:none;border-radius:14px;padding:16px;cursor:pointer;box-shadow:0 12px 26px rgba(15,76,129,.3);transition:transform .18s,filter .18s;}
.fd-submit:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.07);}.fd-submit:disabled{opacity:.55;cursor:not-allowed;}
.fd-stats{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.fd-stat{min-width:0;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 10px;text-align:center;box-shadow:0 8px 20px rgba(15,76,129,.06);}
.fd-stat .st-l{font-size:11.5px;font-weight:800;color:var(--ink2);margin-bottom:6px;}
.fd-stat .st-v{font-size:17px;font-weight:900;letter-spacing:-.5px;white-space:nowrap;}
.fd-stat .st-v .cu{font-size:11px;font-weight:800;color:var(--ink2);margin-inline-start:2px;}
.fd-stat.total{border-color:#C4DCF3;}.fd-stat.total .st-v{color:var(--primary);}.fd-stat.paid{border-color:#BBE7CC;}.fd-stat.paid .st-v{color:var(--ok);}.fd-stat.rem{border-color:#FBD3AF;}.fd-stat.rem .st-v{color:var(--orange);}
.fd-log{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 14px 34px rgba(15,76,129,.07);}
.fd-log h3{margin-bottom:0;}.fd-empty{margin-top:14px;display:flex;flex-direction:column;align-items:center;gap:11px;text-align:center;padding:26px 10px;border:1.5px dashed #D7E6F5;border-radius:18px;background:linear-gradient(135deg,#F7FBFF,#EFF6FD);}
.fd-empty .eic{width:62px;height:62px;border-radius:20px;background:var(--orange2);color:#fff;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 10px 22px rgba(249,115,22,.25);}
.fd-empty .et{font-size:15px;font-weight:900;}.fd-empty .es{font-size:12.5px;font-weight:700;color:var(--ink2);max-width:270px;line-height:1.7;}
.fd-empty-state,.fd-log-error{margin-top:14px;padding:22px 12px;border:1px dashed #D7E6F5;border-radius:14px;background:#F7FBFF;text-align:center;color:var(--ink2);font-size:12px;font-weight:700;}
.fd-log-error{border-color:#f1c9c9;background:#fff5f5;color:#8d2222;}.fd-log-error p{margin:0;}.fd-log-error button{margin-top:9px;border:0;background:none;color:inherit;font:inherit;font-weight:900;text-decoration:underline;cursor:pointer;}
.fd-transactions{display:flex;flex-direction:column;gap:9px;margin-top:14px;}.fd-transaction{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid var(--line);border-radius:13px;background:#fff;}
.fd-tx-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;flex:none;}.fd-tx-icon.positive{background:var(--ok2);color:var(--ok);}.fd-tx-icon.negative{background:#fff0ee;color:#d34435;}
.fd-tx-info{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px;}.fd-tx-info strong{overflow:hidden;font-size:11px;font-weight:800;text-overflow:ellipsis;white-space:nowrap;}.fd-tx-info time{color:var(--ink2);font-size:10px;}
.fd-tx-amount{flex:none;font-size:11px;font-weight:900;}.fd-tx-amount small{font-size:9px;}.fd-tx-amount.positive{color:var(--ok);}.fd-tx-amount.negative{color:#c7352d;}
.fd-footer{margin:22px 0 0;text-align:center;font-size:12px;font-weight:700;color:var(--ink2);line-height:1.8;}
@media(max-width:420px){.fd-wrap{padding-inline:12px;}.fd-topbar-in{padding-inline:12px;}.fd-card{padding:20px 18px;}.fd-stats{gap:8px;}.fd-stat{padding:14px 5px;}.fd-stat .st-v{font-size:14px;}.fd-stat .st-l{font-size:10px;}.fd-form,.fd-log{padding:16px;}}
@media(prefers-reduced-motion:reduce){.fd-root *{transition:none!important;scroll-behavior:auto!important;}}
`;
