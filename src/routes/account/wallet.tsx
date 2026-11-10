// صفحة المحفظة الحالية: src/routes/account/wallet.tsx — المسار /account/wallet
// إعدادات الربط عند الحاجة:
// - عميل Supabase: @/integrations/supabase/client (عدّل الاستيراد فقط إذا اختلف مساره).
// - جدول طلبات الشحن: public.wallet_topup_requests، وأعمدته معرفة في ملف SQL المصاحب.
// - سجل الرصيد الحالي: public.wallet_transactions (يظل مستقلًا عن الطلبات المعلقة).
// - bucket الخاص بصور السند: wallet-transfer-proofs (خاص، ارفع الملف لمسار مجلد المستخدم).
// - لا يُضاف مبلغ إلى wallet_transactions إلا بعد اعتماد الإدارة عبر تدفقها المعتمد.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  List,
  Plus,
  X,
  Trash2,
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

type WalletTopup = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  sender_phone: string;
  note: string | null;
  proof_path: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

const PAYMENT_METHODS = ["الكريمي", "ون كاش", "فلوسك", "جوالي", "جيب", "حوالة النجم"] as const;
const RECIPIENT_NAME = "زين العابدين مطيع حاتم الوصابي";
const RECIPIENT_NUMBER = "772399744";
const RECEIPT_BUCKET = "wallet-transfer-proofs";
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;

function WalletPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [tx, setTx] = useState<Tx[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState("");
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [topupsLoading, setTopupsLoading] = useState(true);
  const [topupsError, setTopupsError] = useState("");
  const [proofPreview, setProofPreview] = useState<{ id: string; url: string } | null>(null);
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);
  const [proofError, setProofError] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [showTopupForm, setShowTopupForm] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
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

  const loadTopups = useCallback(async () => {
    if (!user) {
      setTopups([]);
      setTopupsLoading(false);
      setTopupsError("");
      return;
    }

    setTopupsLoading(true);
    setTopupsError("");
    try {
      // RLS limits customers to their own requests and allows only authorized staff to see all.
      const { data, error: loadError } = await (supabase as any).from("wallet_topup_requests")
        .select("id,amount,currency,payment_method,sender_phone,note,proof_path,status,created_at,reviewed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (loadError) throw loadError;
      setTopups((data ?? []) as WalletTopup[]);
    } catch (cause) {
      console.error("Could not load wallet top-up requests", cause);
      setTopupsError("تعذر تحميل طلبات الشحن. أعد المحاولة لاحقًا.");
    } finally {
      setTopupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSenderPhone("");
      setProofPreview(null);
      void loadTransactions();
      void loadTopups();
      return;
    }
    setSenderPhone(String(user.user_metadata?.["phone"] ?? ""));
    void loadTransactions();
    void loadTopups();
  }, [user, loadTransactions, loadTopups]);

  useEffect(() => {
    return () => { if (receiptPreview) URL.revokeObjectURL(receiptPreview); };
  }, [receiptPreview]);

  const addedTransactions = tx.filter((item) => item.amount > 0);
  const deductedTransactions = tx.filter((item) => item.amount < 0);
  const additionsTotal = addedTransactions.reduce((sum, item) => sum + item.amount, 0);
  const deductionsTotal = deductedTransactions.reduce((sum, item) => sum - item.amount, 0);
  const balance = additionsTotal - deductionsTotal;
  const fmt = (value: number) => value.toLocaleString("en-US");

  const copyRecipient = async () => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(RECIPIENT_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("تعذر النسخ تلقائيًا. يمكنك تحديد الرقم ونسخه يدويًا.");
    }
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
    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const openTopupProof = async (request: WalletTopup) => {
    if (!user) return;
    setProofError("");
    setProofLoadingId(request.id);
    setProofPreview(null);
    try {
      // The bucket remains private. Storage RLS checks owner/staff before issuing a 5-minute URL.
      const { data, error: signError } = await supabase.storage
        .from(RECEIPT_BUCKET)
        .createSignedUrl(request.proof_path, 300);
      if (signError) throw signError;
      if (!data?.signedUrl) throw new Error("لم يُنشأ رابط عرض للسند.");
      setProofPreview({ id: request.id, url: data.signedUrl });
    } catch (cause) {
      console.error("Could not create a wallet proof preview URL", cause);
      setProofError("لا تملك صلاحية عرض هذا السند أو تعذر تحميله.");
    } finally {
      setProofLoadingId(null);
    }
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
    if (senderPhone.trim().length < 7) {
      setError("أدخل رقم المرسِل بشكل صحيح.");
      return;
    }
    if (!receipt) {
      setError("أرفق صورة إشعار التحويل قبل إرسال الطلب.");
      return;
    }

    setSaving(true);
    let uploadedProofPath: string | null = null;
    try {
      // صورة السند في Storage والطلب في جدوله الخاص؛ الرصيد لا يتغير قبل الاعتماد.
      const extension = receipt.type === "image/jpeg" ? "jpg" : receipt.type === "image/png" ? "png" : "webp";
      const proofPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      uploadedProofPath = proofPath;
      const { error: uploadError } = await supabase.storage
        .from(RECEIPT_BUCKET)
        .upload(proofPath, receipt, { contentType: receipt.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await (supabase as any)
        .from("wallet_topup_requests")
        .insert({
          user_id: user.id,
          amount: parsedAmount,
          currency: "YER",
          payment_method: paymentMethod,
          sender_phone: senderPhone.trim(),
          note: note.trim() || null,
          proof_path: proofPath,
          status: "pending_review",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      uploadedProofPath = null;
      void loadTopups();
      setSuccess(
        `تم استلام طلب الشحن ${String(data?.id ?? "").slice(0, 8)} للمراجعة. سيُضاف الرصيد بعد اعتماده فقط.`,
      );
      setAmount("");
      setNote("");
      setReceipt(null);
      setReceiptPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (cause) {
      if (uploadedProofPath) {
        const { error: cleanupError } = await supabase.storage.from(RECEIPT_BUCKET).remove([uploadedProofPath]);
        if (cleanupError) console.warn("Could not clean up unlinked wallet proof", cleanupError);
      }
      console.error("Top-up request save failed", cause);
      const message = cause instanceof Error ? cause.message : "تعذر حفظ الطلب.";
      setError(`تعذر حفظ طلب الشحن: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fd-root" dir="rtl" lang="ar">
      <style>{WALLET_STYLE}</style>
      <header className="fd-topbar">
        <div className="fd-topbar-in">
          <div className="fd-tp-title">
            <Wallet size={20} aria-hidden="true" />
            الرصيد
          </div>
          <button className="fd-ghost" type="button" onClick={() => navigate({ to: "/my-account" })}>
            <span aria-hidden="true">←</span> رجوع
          </button>
        </div>
      </header>
      <main className="fd-wrap">
        <section className="fd-card" aria-label="رصيد المحفظة">
          <div className="fd-card-top">
            <span className="lbl">الرصيد الحالي</span>
            <button className="fd-add-button" type="button" aria-label="إضافة رصيد وعرض طرق الدفع" onClick={() => setMethodPickerOpen(true)}>
              <Plus size={21} aria-hidden="true" />
            </button>
          </div>
          <div className="fd-bal">
            <div className="amt" dir="ltr">
              {transactionsLoading ? "…" : transactionsError ? "—" : fmt(balance)}
              <span className="cur">YER</span>
            </div>
            {transactionsError && <p className="fd-card-error">تعذر التحقق من الرصيد؛ أعد المحاولة من سجل العمليات.</p>}
          </div>
        </section>

        {showTopupForm && (
          <section className="fd-topup-panel" aria-label="إضافة رصيد">
            <div className="fd-selected-method">
              <span>طريقة الدفع المختارة</span><strong>{paymentMethod}</strong>
              <button type="button" onClick={() => setMethodPickerOpen(true)}>تغيير</button>
            </div>
                    <section className="fd-notice" role="note">
          <span className="ic" aria-hidden="true">!</span>
          <div className="tx">حوّل إلى بيانات المستلم الموضحة أدناه، ثم ارفع صورة إشعار التحويل. سيُراجع الطلب قبل إضافة أي مبلغ إلى رصيدك.</div>
        </section>

        <section className="fd-recipient" aria-label="بيانات المستلم الموحد">
          <div className="fd-recipient-heading"><Wallet size={17} aria-hidden="true" /> بيانات المستلم الموحد</div>
          <strong className="fd-recipient-name">{RECIPIENT_NAME}</strong>
          <div className="fd-recipient-row">
            <span className="fd-recipient-number" dir="ltr">{RECIPIENT_NUMBER}</span>
            <button type="button" className="fd-copy" onClick={() => void copyRecipient()} aria-label="نسخ رقم المستلم">
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? "تم النسخ" : "نسخ الرقم"}
            </button>
          </div>
          {copyError && <p className="fd-copy-error" role="status">{copyError}</p>}
        </section>


                    {!user && (
          <p className="fd-login-alert" role="alert">سجّل الدخول أولًا لعرض محفظتك أو إرسال طلب شحن.</p>
        )}
                    <form id="topup-form" onSubmit={submitTopup} className="fd-form">
          <h3><span className="ic"><UploadCloud size={18} aria-hidden="true" /></span> نموذج تعبئة الرصيد</h3>

          <div className="fd-field">
            <label htmlFor="wallet-sender-phone">رقم المرسِل <span className="req">*</span></label>
            <input
              id="wallet-sender-phone"
              className="fd-input"
              type="tel"
              required
              minLength={7}
              maxLength={30}
              value={senderPhone}
              onChange={(event) => setSenderPhone(event.target.value)}
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="أدخل الرقم الذي أُرسل منه التحويل"
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
            <label htmlFor="wallet-method">اختيار المحفظة <span className="req">*</span></label>
            <select id="wallet-method" className="fd-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>

          <div className="fd-field">
            <label htmlFor="wallet-receipt">صورة سند التحويل (إيصال الدفع) <span className="req">*</span></label>
            <label className="fd-file" htmlFor="wallet-receipt">
              <span className="fic"><UploadCloud size={20} aria-hidden="true" /></span>
              <span className="fd-file-copy">
                <span className="ft">{receipt ? receipt.name : "اختيار صورة إشعار التحويل"}</span>
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
            <p className="fd-receipt-help">أرفق صورة واضحة لإيصال نجاح التحويل عبر وسيلة الدفع المختارة. تأكد من ظهور مبلغ التحويل وتاريخه أو رقم العملية.</p>
            <p className="fd-receipt-help">الملفات المقبولة: JPG أو PNG أو WEBP، بحد أقصى 2MB. لا ترفع صورة بطاقة أو تشارك كلمة مرورك.</p>
          </div>

          {receiptPreview && (
            <div className="fd-preview-wrap">
              <img className="fd-preview" src={receiptPreview} alt="معاينة صورة إشعار التحويل" />
              <button type="button" className="fd-remove-file" onClick={() => { setReceipt(null); setReceiptPreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                <Trash2 size={14} aria-hidden="true" /> إزالة الصورة
              </button>
            </div>
          )}

          <div className="fd-field">
            <label htmlFor="wallet-note">ملاحظة (اختياري)</label>
            <textarea id="wallet-note" className="fd-input fd-textarea" maxLength={500} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="أضف ملاحظة تساعدنا في مراجعة التحويل" />
          </div>

          <div className="fd-secnote"><CheckCircle2 size={15} aria-hidden="true" /> لا ترسل معلومات بطاقة أو كلمة مرور</div>
          {error && <p className="fd-message fd-error" role="alert">{error}</p>}
          {success && <p className="fd-message fd-success" role="status">{success}</p>}

          <button className="fd-submit" type="submit" disabled={saving || !user}>
            <UploadCloud size={19} aria-hidden="true" />
            {saving ? "جارٍ الإرسال…" : "إرسال طلب الشحن"}
          </button>
        </form>
          </section>
        )}

        <section className="fd-stats" aria-label="ملخص عمليات المحفظة">
          <div className="fd-stat rem">
            <div className="st-l">عدد العمليات</div>
            <div className="st-v">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(tx.length)}</div>
          </div>
          <div className="fd-stat total">
            <div className="st-l">الإضافات</div>
            <div className="st-v">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(additionsTotal)}</div>
          </div>
          <div className="fd-stat paid">
            <div className="st-l">الخصومات</div>
            <div className="st-v">{transactionsLoading ? "…" : transactionsError ? "—" : fmt(deductionsTotal)}</div>
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

{(topups.length > 0 || topupsLoading || topupsError) && (
        <section className="fd-log fd-topups" aria-label="طلبات الشحن وسنداتها">
          <div className="fd-topups-heading">
            <h3><span className="ic"><List size={18} aria-hidden="true" /></span> طلبات الشحن وسنداتها</h3>
            <button type="button" className="fd-topups-refresh" onClick={() => void loadTopups()} disabled={topupsLoading}>
              {topupsLoading ? "جارٍ التحديث…" : "تحديث"}
            </button>
          </div>

          {topupsError ? (
            <div className="fd-log-error" role="alert">
              <p>{topupsError}</p>
              <button type="button" onClick={() => void loadTopups()}>إعادة المحاولة</button>
            </div>
          ) : topupsLoading ? (
            <p className="fd-empty-state" role="status">جارٍ تحميل طلبات الشحن…</p>
          ) : topups.length === 0 ? (
            <div className="fd-empty-state">لا توجد طلبات شحن بعد.</div>
          ) : (
            <div className="fd-topup-list">
              {topups.map((request) => (
                <article key={request.id} className="fd-topup-row">
                  <div className="fd-topup-details">
                    <div className="fd-topup-title">
                      <strong>{Number(request.amount).toLocaleString("en-US")} {request.currency === "YER" ? "ر.ي" : request.currency}</strong>
                      <span className={`fd-topup-status ${request.status === "approved" ? "approved" : request.status === "rejected" ? "rejected" : "pending"}`}>
                        {request.status === "approved" ? "معتمد" : request.status === "rejected" ? "مرفوض" : request.status === "pending_review" ? "قيد المراجعة" : request.status}
                      </span>
                    </div>
                    <span>الوسيلة: {request.payment_method} · رقم المرسل: <bdi dir="ltr">{request.sender_phone}</bdi></span>
                    <time dateTime={request.created_at}>{new Date(request.created_at).toLocaleString("ar-u-nu-latn")}</time>
                    {request.note && <span className="fd-topup-note">ملاحظة: {request.note}</span>}
                    <button type="button" className="fd-proof-button" onClick={() => void openTopupProof(request)} disabled={proofLoadingId === request.id}>
                      <UploadCloud size={15} aria-hidden="true" />
                      {proofLoadingId === request.id ? "جارٍ فتح السند…" : "عرض سند التحويل"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="fd-proof-privacy">تُعرض الطلبات والسندات وفق صلاحيات الحساب وسياسات الوصول. رابط الصورة مؤقت وصالح لخمس دقائق.</p>
          {proofError && <p className="fd-message fd-error" role="alert">{proofError}</p>}
          {proofPreview && (
            <div className="fd-proof-viewer" role="dialog" aria-modal="true" aria-label="معاينة سند التحويل">
              <div className="fd-proof-viewer-head">
                <strong>معاينة سند التحويل</strong>
                <button type="button" className="fd-proof-close" onClick={() => setProofPreview(null)} aria-label="إغلاق المعاينة">إغلاق</button>
              </div>
              <img src={proofPreview.url} alt="سند التحويل" />
            </div>
          )}
        </section>


        )}
        <p className="fd-footer">تُراجع جميع طلبات الشحن قبل اعتمادها. تأكّد من المبلغ وسند التحويل قبل الإرسال.</p>

        {methodPickerOpen && (
          <div className="fd-method-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMethodPickerOpen(false); }}>
            <section className="fd-method-dialog" role="dialog" aria-modal="true" aria-labelledby="fd-method-title">
              <div className="fd-method-handle" aria-hidden="true" />
              <header className="fd-method-head">
                <div><h2 id="fd-method-title">إضافة رصيد</h2><p>اختر طريقة الدفع المناسبة ثم أدخل المبلغ وأرفق إيصال التحويل.</p></div>
                <button type="button" className="fd-method-close" onClick={() => setMethodPickerOpen(false)} aria-label="إغلاق طرق الدفع"><X size={18} /></button>
              </header>
              <div className="fd-method-grid" role="group" aria-label="طريقة الدفع">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method} type="button" className={`fd-method-option ${paymentMethod === method ? "selected" : ""}`} aria-pressed={paymentMethod === method} onClick={() => { setPaymentMethod(method); setShowTopupForm(true); setMethodPickerOpen(false); window.setTimeout(() => document.getElementById("topup-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }}>
                    <span className="fd-method-radio" aria-hidden="true" />
                    <span className="fd-method-mark" aria-hidden="true">{method.slice(0, 1)}</span>
                    <strong>{method}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}


const WALLET_STYLE = `
.fd-root{--primary:#0F4C81;--primary2:#1C6FB8;--gold:#D4AF37;--orange:#F97316;--orange2:#FB923C;--ink:#15233B;--ink2:#64748B;--line:#E6EEF6;--ok:#12A150;--ok2:#E3F6EC;--sky:#EAF2FB;--warn:#B45309;--warnbg:#FEF6DC;--warnbd:#F5E08A;box-sizing:border-box;min-height:100dvh;background:linear-gradient(135deg,#EAF3FD,#F5FAFE 60%);color:var(--ink);direction:rtl;font-family:'Tajawal','Cairo',sans-serif;}
.fd-root,.fd-root *{box-sizing:border-box;}
.fd-root h1,.fd-root h3,.fd-root p{margin-top:0;}
.fd-root button,.fd-root input,.fd-root select,.fd-root textarea{font-family:inherit;}
.fd-root .fd-wrap{width:100%;max-width:600px;margin:0 auto;padding:0 16px 48px;}
.fd-root .fd-topbar{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);box-shadow:0 6px 22px rgba(15,76,129,.06);}
.fd-root .fd-topbar-in{max-width:600px;margin:0 auto;padding:11px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.fd-root .fd-tp-title{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:900;color:var(--primary);}
.fd-root .fd-ghost{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--primary);background:var(--sky);border:1px solid #D7E6F5;border-radius:999px;padding:9px 15px;cursor:pointer;transition:background .2s,transform .2s;}
.fd-root .fd-ghost:hover{background:#DCEBFA;transform:translateY(-1px);}
.fd-root .fd-greet{margin-top:20px;display:flex;align-items:center;gap:13px;}
.fd-root .fd-greet .ava{width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg,var(--primary),var(--primary2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;flex:none;box-shadow:0 10px 22px rgba(15,76,129,.26);}
.fd-root .fd-greet h1{margin-bottom:0;font-size:clamp(18px,4.5vw,22px);font-weight:900;}
.fd-root .fd-greet p{margin:2px 0 0;font-size:12.5px;font-weight:700;color:var(--ink2);}
.fd-root .fd-card{margin-top:18px;position:relative;overflow:hidden;border-radius:24px;padding:24px 22px;color:#fff;background:linear-gradient(125deg,#F97316 0%,#FB923C 24%,#2F6FB0 68%,#0F4C81 100%);box-shadow:0 20px 46px rgba(15,76,129,.3),0 10px 22px rgba(249,115,22,.2);}
.fd-root .fd-card::before{content:"";position:absolute;inset-inline-end:-40px;top:-60px;width:190px;height:190px;background:rgba(255,255,255,.14);border-radius:50%;pointer-events:none;}
.fd-root .fd-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1;}
.fd-root .fd-card-top .lbl{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800;opacity:.95;}
.fd-root .fd-chip{width:40px;height:29px;border-radius:7px;background:linear-gradient(135deg,#F7D774,#D4AF37);box-shadow:inset 0 1px 2px rgba(255,255,255,.5);position:relative;flex:none;}
.fd-root .fd-chip::after{content:"";position:absolute;inset:6px;border:1px solid rgba(255,255,255,.55);border-radius:4px;}
.fd-root .fd-bal{position:relative;z-index:1;margin-top:18px;}
.fd-root .fd-bal .amt{font-size:clamp(38px,10vw,52px);font-weight:900;line-height:1;letter-spacing:-1px;display:flex;align-items:baseline;gap:8px;}
.fd-root .fd-bal .amt .cur{font-size:clamp(17px,4vw,22px);font-weight:800;opacity:.92;}
.fd-root .fd-bal .sub{margin-top:9px;font-size:13px;font-weight:700;opacity:.9;display:inline-flex;align-items:center;gap:6px;}
.fd-root .fd-bal .sub .dot{width:8px;height:8px;border-radius:50%;background:#7CF2B0;box-shadow:0 0 0 4px rgba(124,242,176,.25);}
.fd-root .fd-card-error{margin:8px 0 0;color:#fff;font-size:11px;font-weight:700;}
.fd-root .fd-notice{margin-top:18px;background:var(--warnbg);border:1.5px solid var(--warnbd);border-radius:18px;padding:16px 18px;display:flex;align-items:flex-start;gap:13px;box-shadow:0 8px 22px rgba(180,83,9,.08);}
.fd-root .fd-notice .ic{width:42px;height:42px;border-radius:12px;background:#FCEFC0;color:var(--warn);border:1px solid var(--warnbd);display:flex;align-items:center;justify-content:center;flex:none;font-size:20px;font-weight:900;}
.fd-root .fd-notice .tx{font-size:13px;font-weight:800;color:#7A4A08;line-height:1.85;}
.fd-root .fd-recipient{margin-top:12px;padding:14px 16px;border:1px solid #E8D38A;border-radius:16px;background:linear-gradient(135deg,#FFF9E6,#FFFDF5);box-shadow:0 8px 20px rgba(180,130,20,.08);}
.fd-root .fd-recipient-heading{display:flex;align-items:center;gap:7px;color:var(--primary);font-size:12px;font-weight:900;}
.fd-root .fd-recipient-name{display:block;margin-top:9px;color:var(--ink);font-size:14px;font-weight:900;line-height:1.7;}
.fd-root .fd-recipient-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;}
.fd-root .fd-recipient-number{color:#8A5A00;font-size:20px;font-weight:900;letter-spacing:.5px;}
.fd-root .fd-copy{display:inline-flex;align-items:center;gap:6px;border:1px solid #E8D38A;border-radius:10px;padding:8px 11px;background:#fff;color:var(--primary);font-size:11px;font-weight:900;cursor:pointer;}
.fd-root .fd-copy-error{margin:7px 0 0;color:#8A5A00;font-size:10px;font-weight:700;}
.fd-root .fd-textarea{display:block;min-height:76px;resize:vertical;}
.fd-root .fd-preview-wrap{display:flex;align-items:flex-start;gap:10px;margin:-3px 0 13px;padding:10px;border:1px solid var(--line);border-radius:13px;background:#F8FBFE;}
.fd-root .fd-preview{width:88px;height:88px;object-fit:cover;border-radius:10px;border:1px solid var(--line);}
.fd-root .fd-remove-file{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:#A33A31;font:inherit;font-size:11px;font-weight:800;cursor:pointer;}
.fd-root .fd-login-alert{margin:12px 0 0;padding:12px;border:1px solid var(--warnbd);border-radius:12px;background:var(--warnbg);color:#7A4A08;font-size:12px;font-weight:800;line-height:1.7;}
.fd-root .fd-form{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 14px 34px rgba(15,76,129,.07);}
.fd-root .fd-form h3,.fd-root .fd-log h3{display:flex;align-items:center;gap:9px;margin:0 0 16px;font-size:16px;font-weight:900;}
.fd-root .fd-form h3 .ic,.fd-root .fd-log h3 .ic{width:34px;height:34px;border-radius:10px;background:var(--sky);color:var(--primary);display:flex;align-items:center;justify-content:center;flex:none;}
.fd-root .fd-field{margin-bottom:15px;}
.fd-root .fd-field>label:first-child{display:block;font-size:12.5px;font-weight:800;color:var(--ink2);margin-bottom:7px;}
.fd-root .fd-field label .req{color:var(--orange);}
.fd-root .fd-input,.fd-root .fd-select{width:100%;font-size:14.5px;font-weight:800;color:var(--ink);background:#F8FBFE;border:1.5px solid var(--line);border-radius:13px;padding:13px 15px;transition:border-color .18s,background .18s;}
.fd-root .fd-input:focus,.fd-root .fd-select:focus{outline:none;border-color:var(--primary2);background:#fff;box-shadow:0 0 0 3px rgba(28,111,184,.1);}
.fd-root .fd-input::placeholder{color:#9FB2C8;font-weight:700;}
.fd-root .fd-input.amt-in{font-size:20px;font-weight:900;letter-spacing:-.5px;}
.fd-root .fd-amtwrap{position:relative;}
.fd-root .fd-amtwrap .cu{position:absolute;inset-inline-start:15px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:900;color:var(--ink2);pointer-events:none;}
.fd-root .fd-amtwrap .amt-in{padding-inline-start:46px;}
.fd-root .fd-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2364748B' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 15px center;padding-inline-start:40px;cursor:pointer;}
.fd-root .fd-file{display:flex;align-items:center;gap:12px;border:1.5px dashed #C9DCEF;border-radius:13px;padding:13px 15px;background:#F8FBFE;cursor:pointer;transition:border-color .18s,background .18s;}
.fd-root .fd-file:hover{border-color:var(--primary2);background:#fff;}
.fd-root .fd-file .fic{width:40px;height:40px;border-radius:11px;background:var(--sky);color:var(--primary);display:flex;align-items:center;justify-content:center;flex:none;}
.fd-root .fd-file-copy{display:flex;min-width:0;flex-direction:column;}
.fd-root .fd-file .ft{overflow:hidden;font-size:13px;font-weight:800;text-overflow:ellipsis;white-space:nowrap;}
.fd-root .fd-file .fs{font-size:11px;font-weight:700;color:var(--ink2);margin-top:2px;}
.fd-root .fd-file input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;}
.fd-root .fd-file:focus-within{outline:2px solid var(--primary2);outline-offset:2px;}
.fd-root .fd-receipt-help{margin:7px 0 0;color:var(--ink2);font-size:10px;font-weight:600;line-height:1.65;}
.fd-root .fd-secnote{margin-top:4px;display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;color:var(--ok);background:var(--ok2);border:1px solid #BBE7CC;border-radius:11px;padding:10px 13px;}
.fd-root .fd-message{margin:10px 0 0;padding:10px 12px;border-radius:11px;font-size:11px;font-weight:800;line-height:1.7;overflow-wrap:anywhere;}
.fd-root .fd-error{background:#fff0f0;color:#a32222;}.fd-root .fd-success{background:#eaf8ef;color:#126b3c;}
.fd-root .fd-submit{width:100%;margin-top:16px;display:inline-flex;align-items:center;justify-content:center;gap:9px;font-size:15px;font-weight:900;color:#fff;background:linear-gradient(135deg,var(--primary),var(--primary2));border:none;border-radius:14px;padding:16px;cursor:pointer;box-shadow:0 12px 26px rgba(15,76,129,.3);transition:transform .18s,filter .18s;}
.fd-root .fd-submit:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.07);}.fd-root .fd-submit:disabled{opacity:.55;cursor:not-allowed;}
.fd-root .fd-stats{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.fd-root .fd-stat{min-width:0;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 10px;text-align:center;box-shadow:0 8px 20px rgba(15,76,129,.06);}
.fd-root .fd-stat .st-l{font-size:11.5px;font-weight:800;color:var(--ink2);margin-bottom:6px;}
.fd-root .fd-stat .st-v{font-size:17px;font-weight:900;letter-spacing:-.5px;white-space:nowrap;}
.fd-root .fd-stat .st-v .cu{font-size:11px;font-weight:800;color:var(--ink2);margin-inline-start:2px;}
.fd-root .fd-stat.total{border-color:#C4DCF3;}.fd-root .fd-stat.total .st-v{color:var(--primary);}.fd-root .fd-stat.paid{border-color:#BBE7CC;}.fd-root .fd-stat.paid .st-v{color:var(--ok);}.fd-root .fd-stat.rem{border-color:#FBD3AF;}.fd-root .fd-stat.rem .st-v{color:var(--orange);}
.fd-root .fd-log{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 14px 34px rgba(15,76,129,.07);}
.fd-root .fd-log h3{margin-bottom:0;}.fd-root .fd-empty{margin-top:14px;display:flex;flex-direction:column;align-items:center;gap:11px;text-align:center;padding:26px 10px;border:1.5px dashed #D7E6F5;border-radius:18px;background:linear-gradient(135deg,#F7FBFF,#EFF6FD);}
.fd-root .fd-empty .eic{width:62px;height:62px;border-radius:20px;background:var(--orange2);color:#fff;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 10px 22px rgba(249,115,22,.25);}
.fd-root .fd-empty .et{font-size:15px;font-weight:900;}.fd-root .fd-empty .es{font-size:12.5px;font-weight:700;color:var(--ink2);max-width:270px;line-height:1.7;}
.fd-root .fd-empty-state,.fd-root .fd-log-error{margin-top:14px;padding:22px 12px;border:1px dashed #D7E6F5;border-radius:14px;background:#F7FBFF;text-align:center;color:var(--ink2);font-size:12px;font-weight:700;}
.fd-root .fd-log-error{border-color:#f1c9c9;background:#fff5f5;color:#8d2222;}.fd-root .fd-log-error p{margin:0;}.fd-root .fd-log-error button{margin-top:9px;border:0;background:none;color:inherit;font:inherit;font-weight:900;text-decoration:underline;cursor:pointer;}
.fd-root .fd-transactions{display:flex;flex-direction:column;gap:9px;margin-top:14px;}.fd-root .fd-transaction{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid var(--line);border-radius:13px;background:#fff;}
.fd-root .fd-tx-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;flex:none;}.fd-root .fd-tx-icon.positive{background:var(--ok2);color:var(--ok);}.fd-root .fd-tx-icon.negative{background:#fff0ee;color:#d34435;}
.fd-root .fd-tx-info{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px;}.fd-root .fd-tx-info strong{overflow:hidden;font-size:11px;font-weight:800;text-overflow:ellipsis;white-space:nowrap;}.fd-root .fd-tx-info time{color:var(--ink2);font-size:10px;}
.fd-root .fd-tx-amount{flex:none;font-size:11px;font-weight:900;}.fd-root .fd-tx-amount small{font-size:9px;}.fd-root .fd-tx-amount.positive{color:var(--ok);}.fd-root .fd-tx-amount.negative{color:#c7352d;}
.fd-root .fd-footer{margin:22px 0 0;text-align:center;font-size:12px;font-weight:700;color:var(--ink2);line-height:1.8;}
@media(max-width:420px){.fd-root .fd-wrap{padding-inline:12px;}.fd-root .fd-topbar-in{padding-inline:12px;}.fd-root .fd-card{padding:20px 18px;}.fd-root .fd-stats{gap:8px;}.fd-root .fd-stat{padding:14px 5px;}.fd-root .fd-stat .st-v{font-size:14px;}.fd-root .fd-stat .st-l{font-size:10px;}.fd-root .fd-form,.fd-root .fd-log{padding:16px;}}
@media(max-width:480px){
.fd-root .fd-wrap{max-width:440px;padding:0 12px 28px;}
.fd-root .fd-topbar-in{max-width:440px;padding:5px 12px;}
.fd-root .fd-tp-title{gap:6px;font-size:12px;}
.fd-root .fd-tp-title svg{width:14px;height:14px;}
.fd-root .fd-ghost{gap:4px;padding:5px 10px;font-size:10px;}
.fd-root .fd-greet{margin-top:11px;gap:8px;}
.fd-root .fd-greet .ava{width:36px;height:36px;border-radius:11px;font-size:16px;}
.fd-root .fd-greet h1{font-size:13px;}
.fd-root .fd-greet p{font-size:9px;}
.fd-root .fd-card{margin-top:10px;border-radius:16px;padding:13px 14px;}
.fd-root .fd-card::before{width:130px;height:130px;top:-42px;inset-inline-end:-30px;}
.fd-root .fd-card-top .lbl{gap:5px;font-size:9px;}
.fd-root .fd-card-top .lbl svg{width:12px;height:12px;}
.fd-root .fd-chip{width:25px;height:18px;border-radius:5px;}
.fd-root .fd-chip::after{inset:4px;}
.fd-root .fd-bal{margin-top:10px;}
.fd-root .fd-bal .amt{gap:5px;font-size:32px;}
.fd-root .fd-bal .amt .cur{font-size:13px;}
.fd-root .fd-bal .sub{margin-top:5px;font-size:9px;}
.fd-root .fd-notice{margin-top:11px;border-radius:13px;padding:9px 10px;gap:8px;}
.fd-root .fd-notice .ic{width:27px;height:27px;border-radius:8px;font-size:15px;}
.fd-root .fd-notice .tx{font-size:9px;line-height:1.65;}
.fd-root .fd-login-alert{font-size:10px;padding:9px;margin-top:9px;}
.fd-root .fd-form{margin-top:11px;border-radius:16px;padding:12px;}
.fd-root .fd-form h3,.fd-root .fd-log h3{gap:6px;margin-bottom:10px;font-size:11px;}
.fd-root .fd-form h3 .ic,.fd-root .fd-log h3 .ic{width:24px;height:24px;border-radius:7px;}
.fd-root .fd-form h3 .ic svg,.fd-root .fd-log h3 .ic svg{width:13px;height:13px;}
.fd-root .fd-field{margin-bottom:9px;}
.fd-root .fd-field>label:first-child{margin-bottom:5px;font-size:9px;}
.fd-root .fd-input,.fd-root .fd-select{border-radius:9px;padding:8px 10px;font-size:10px;}
.fd-root .fd-input.amt-in{font-size:15px;}
.fd-root .fd-amtwrap .cu{inset-inline-start:10px;font-size:9px;}
.fd-root .fd-amtwrap .amt-in{padding-inline-start:35px;}
.fd-root .fd-select{background-position:left 10px center;padding-inline-start:30px;}
.fd-root .fd-file{gap:8px;border-radius:9px;padding:8px 10px;}
.fd-root .fd-file .fic{width:28px;height:28px;border-radius:8px;}
.fd-root .fd-file .fic svg{width:15px;height:15px;}
.fd-root .fd-file .ft{font-size:9px;}
.fd-root .fd-file .fs,.fd-root .fd-receipt-help{font-size:8px;}
.fd-root .fd-receipt-help{margin-top:4px;}
.fd-root .fd-secnote{gap:5px;border-radius:8px;padding:7px 9px;font-size:8px;}
.fd-root .fd-submit{gap:6px;margin-top:10px;border-radius:10px;padding:10px;font-size:11px;}
.fd-root .fd-submit svg{width:14px;height:14px;}
.fd-root .fd-stats{margin-top:11px;gap:7px;}
.fd-root .fd-stat{border-radius:12px;padding:9px 5px;}
.fd-root .fd-stat .st-l{margin-bottom:4px;font-size:8px;}
.fd-root .fd-stat .st-v{font-size:11px;}
.fd-root .fd-stat .st-v .cu{font-size:8px;}
.fd-root .fd-log{margin-top:11px;border-radius:16px;padding:12px;}
.fd-root .fd-empty{margin-top:10px;gap:8px;border-radius:13px;padding:17px 8px;}
.fd-root .fd-empty .eic{width:44px;height:44px;border-radius:14px;}
.fd-root .fd-empty .eic svg{width:21px;height:21px;}
.fd-root .fd-empty .et{font-size:11px;}
.fd-root .fd-empty .es{font-size:9px;}
.fd-root .fd-empty-state,.fd-root .fd-log-error{margin-top:10px;padding:15px 9px;font-size:9px;}
.fd-root .fd-transactions{gap:7px;margin-top:10px;}
.fd-root .fd-transaction{gap:7px;padding:8px;border-radius:10px;}
.fd-root .fd-tx-icon{width:28px;height:28px;border-radius:8px;}
.fd-root .fd-tx-info strong{font-size:9px;}
.fd-root .fd-tx-info time{font-size:8px;}
.fd-root .fd-tx-amount{font-size:9px;}
.fd-root .fd-recipient{margin-top:8px;padding:9px 10px;border-radius:11px;}
.fd-root .fd-recipient-heading{gap:5px;font-size:9px;}
.fd-root .fd-recipient-heading svg{width:13px;height:13px;}
.fd-root .fd-recipient-name{margin-top:5px;font-size:10px;}
.fd-root .fd-recipient-row{margin-top:4px;gap:6px;}
.fd-root .fd-recipient-number{font-size:16px;}
.fd-root .fd-copy{gap:4px;padding:5px 7px;border-radius:7px;font-size:8px;}
.fd-root .fd-copy svg{width:12px;height:12px;}
.fd-root .fd-copy-error{font-size:8px;}
.fd-root .fd-textarea{min-height:55px;}
.fd-root .fd-preview-wrap{gap:7px;margin-bottom:9px;padding:7px;border-radius:9px;}
.fd-root .fd-preview{width:64px;height:64px;border-radius:7px;}
.fd-root .fd-remove-file{font-size:9px;}
.fd-root .fd-footer{margin-top:14px;font-size:9px;}
}
@media(prefers-reduced-motion:reduce){.fd-root *{transition:none!important;scroll-behavior:auto!important;}}
.fd-root .fd-topups-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.fd-root .fd-topups-heading h3{margin:0;}
.fd-root .fd-topups-refresh,.fd-root .fd-proof-button,.fd-root .fd-proof-close{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #D7E6F5;border-radius:10px;padding:8px 11px;background:#F7FBFF;color:var(--primary);font:inherit;font-size:11px;font-weight:900;cursor:pointer;}
.fd-root .fd-topups-refresh:disabled,.fd-root .fd-proof-button:disabled{opacity:.6;cursor:wait;}
.fd-root .fd-topup-list{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
.fd-root .fd-topup-row{padding:13px;border:1px solid var(--line);border-radius:14px;background:#FBFDFF;}
.fd-root .fd-topup-details{display:flex;flex-direction:column;align-items:flex-start;gap:7px;color:var(--ink2);font-size:11px;line-height:1.7;}
.fd-root .fd-topup-title{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--ink);font-size:13px;}
.fd-root .fd-topup-status{border-radius:999px;padding:3px 9px;font-size:10px;font-weight:900;white-space:nowrap;}
.fd-root .fd-topup-status.pending{background:#FFF5D6;color:#8A5A00;}
.fd-root .fd-topup-status.approved{background:#E3F6EC;color:#126B3C;}
.fd-root .fd-topup-status.rejected{background:#FFF0F0;color:#A32222;}
.fd-root .fd-topup-details time{font-size:10px;color:#8493A7;}
.fd-root .fd-topup-note{color:#48576A;overflow-wrap:anywhere;}
.fd-root .fd-proof-button{margin-top:2px;background:#EAF2FB;}
.fd-root .fd-proof-privacy{margin:12px 0 0;color:var(--ink2);font-size:10px;line-height:1.7;}
.fd-root .fd-proof-viewer{margin-top:12px;padding:12px;border:1px solid #C9DCEF;border-radius:14px;background:#F8FBFE;}
.fd-root .fd-proof-viewer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--primary);font-size:12px;}
.fd-root .fd-proof-viewer img{display:block;max-width:100%;max-height:60vh;margin:0 auto;object-fit:contain;border-radius:9px;background:#fff;}
@media(max-width:480px){.fd-root .fd-topups-heading h3{font-size:10px;}.fd-root .fd-topups-refresh,.fd-root .fd-proof-button,.fd-root .fd-proof-close{padding:6px 8px;font-size:9px;}.fd-root .fd-topup-row{padding:9px;}.fd-root .fd-topup-details{font-size:9px;}.fd-root .fd-topup-title{font-size:11px;}.fd-root .fd-topup-status{font-size:8px;}.fd-root .fd-topup-details time,.fd-root .fd-proof-privacy{font-size:8px;}}

/* Refined wallet balance screen; all rules stay scoped to this route. */
.fd-root{--primary:#93400f;--primary2:#b85b22;--gold:#c99b60;--orange:#b85b22;--orange2:#d47a3b;--ink:#202334;--ink2:#89745f;--line:#eadbc9;--sky:#fbf7f1;min-height:100dvh;background:linear-gradient(180deg,#f7efe2,#f1e5d2 70%);color:var(--ink);}
.fd-root .fd-topbar{background:rgba(249,243,234,.96);border-bottom:1px solid #eadbc9;box-shadow:none;}
.fd-root .fd-topbar-in{position:relative;max-width:472px;min-height:58px;justify-content:center;padding:10px 12px;}
.fd-root .fd-tp-title{color:#93400f;font-size:17px;font-weight:900;}
.fd-root .fd-tp-title svg{display:none;}
.fd-root .fd-ghost{position:absolute;inset-inline-start:12px;top:50%;transform:translateY(-50%);border-color:#e7d1b7;background:#f2e4d2;color:#93400f;border-radius:12px;padding:8px 12px;font-size:11px;}
.fd-root .fd-ghost:hover{transform:translateY(calc(-50% - 1px));background:#ead7bf;}
.fd-root .fd-wrap{max-width:472px;padding:18px 12px 40px;}
.fd-root .fd-card{margin-top:0;min-height:90px;padding:16px;border:1px solid rgba(255,255,255,.78);border-radius:22px;color:var(--ink);background:linear-gradient(135deg,#fff 0%,#fbf7f1 100%);box-shadow:0 10px 28px rgba(117,74,34,.08);}
.fd-root .fd-card::before{display:none;}
.fd-root .fd-card-top{align-items:center;}
.fd-root .fd-card-top .lbl{color:#8b745f;font-size:12px;font-weight:800;}
.fd-root .fd-bal{margin-top:5px;}
.fd-root .fd-bal .amt{flex-direction:row-reverse;justify-content:flex-start;gap:8px;font-size:31px;letter-spacing:0;color:#191d30;}
.fd-root .fd-bal .amt .cur{font-size:13px;color:#202334;opacity:1;}
.fd-root .fd-add-button{width:54px;height:54px;display:grid;place-items:center;border:0;border-radius:17px;background:linear-gradient(145deg,#bd6734,#93400f);color:#fff;box-shadow:0 8px 16px rgba(147,64,15,.18);cursor:pointer;transition:transform .15s,filter .15s;}
.fd-root .fd-add-button:hover{transform:translateY(-1px);filter:brightness(1.06);}
.fd-root .fd-add-button:focus-visible,.fd-root .fd-method-option:focus-visible,.fd-root .fd-method-close:focus-visible{outline:3px solid #d6a779;outline-offset:3px;}
.fd-root .fd-card-error{color:#a33a31;}
.fd-root .fd-stats{margin-top:12px;gap:9px;}
.fd-root .fd-stat{padding:13px 7px;border:1px solid rgba(234,219,201,.8);border-radius:16px;box-shadow:0 5px 14px rgba(117,74,34,.04);}
.fd-root .fd-stat .st-l{color:#8d7965;font-size:10px;margin-bottom:5px;}
.fd-root .fd-stat .st-v{font-size:15px;color:#202334!important;}
.fd-root .fd-stat .st-v .cu{display:none;}
.fd-root .fd-stat.total,.fd-root .fd-stat.paid,.fd-root .fd-stat.rem{border-color:rgba(234,219,201,.8);}
.fd-root .fd-log{margin-top:12px;padding:14px;border:1px solid rgba(255,255,255,.8);border-radius:18px;box-shadow:0 7px 18px rgba(117,74,34,.05);}
.fd-root .fd-log h3{font-size:14px;color:#93400f;}
.fd-root .fd-log h3 .ic{width:auto;height:auto;background:transparent;color:#a34d1a;}
.fd-root .fd-empty{border-color:#eadbc9;background:#fff;padding:20px 10px;}
.fd-root .fd-empty .eic{width:48px;height:48px;border-radius:15px;background:#f8f3ee;color:#93400f;box-shadow:none;}
.fd-root .fd-empty .et{font-size:13px;color:#93400f;}
.fd-root .fd-empty .es{color:#89745f;}
.fd-root .fd-transactions{gap:8px;}
.fd-root .fd-transaction{border-color:#f0e7dc;background:#fff;}
.fd-root .fd-topup-panel{margin-top:12px;padding:12px;border:1px solid #eadbc9;border-radius:18px;background:#fff;box-shadow:0 7px 18px rgba(117,74,34,.05);}
.fd-root .fd-selected-method{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:10px 11px;border-radius:12px;background:#faf4ec;color:#89745f;font-size:11px;font-weight:700;}
.fd-root .fd-selected-method strong{color:#93400f;font-size:12px;}
.fd-root .fd-selected-method button{margin-inline-start:auto;border:1px solid #eadbc9;border-radius:9px;padding:6px 10px;background:#fff;color:#93400f;font:inherit;font-size:10px;font-weight:900;cursor:pointer;}
.fd-root .fd-topup-panel .fd-notice{margin-top:0;}
.fd-root .fd-method-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:rgba(32,25,18,.42);backdrop-filter:blur(3px);}
.fd-root .fd-method-dialog{width:min(100%,460px);max-height:min(88dvh,720px);overflow-y:auto;padding:10px 14px 18px;border:1px solid #eadbc9;border-radius:24px;background:#fffdfa;box-shadow:0 18px 60px rgba(42,28,15,.22);animation:fd-sheet-in .2s ease-out;}
.fd-root .fd-method-handle{width:42px;height:4px;margin:0 auto 13px;border-radius:9px;background:#eadbc9;}
.fd-root .fd-method-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px;}
.fd-root .fd-method-head h2{margin:0;color:#93400f;font-size:17px;font-weight:900;}
.fd-root .fd-method-head p{margin:4px 0 0;color:#89745f;font-size:11px;font-weight:700;line-height:1.65;}
.fd-root .fd-method-close{width:34px;height:34px;flex:none;display:grid;place-items:center;border:0;border-radius:11px;background:#f7f2ed;color:#93400f;cursor:pointer;}
.fd-root .fd-method-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.fd-root .fd-method-option{position:relative;min-height:80px;display:grid;grid-template-columns:25px 42px 1fr;align-items:center;gap:8px;padding:11px;border:1px solid #e7d2bb;border-radius:18px;background:#fff;color:#222;cursor:pointer;text-align:right;transition:border-color .15s,background .15s,transform .15s;}
.fd-root .fd-method-option:hover{transform:translateY(-1px);border-color:#bd7a4e;background:#fffaf4;}
.fd-root .fd-method-option.selected{border-color:#a64f1d;background:#fff7ed;box-shadow:0 0 0 2px rgba(166,79,29,.08);}
.fd-root .fd-method-radio{width:21px;height:21px;border:1px solid #e2cdb9;border-radius:50%;background:#fff;}
.fd-root .fd-method-option.selected .fd-method-radio{border:6px solid #a64f1d;}
.fd-root .fd-method-mark{width:40px;height:40px;display:grid;place-items:center;border:1px solid #eadbc9;border-radius:12px;background:#fff;color:#a64f1d;font-size:18px;font-weight:900;box-shadow:0 3px 8px rgba(117,74,34,.06);}
.fd-root .fd-method-option strong{font-size:12px;font-weight:900;}
@keyframes fd-sheet-in{from{opacity:.5;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@media(min-width:700px){.fd-root .fd-method-overlay{align-items:center}.fd-root .fd-method-dialog{border-radius:24px}}
@media(max-width:480px){.fd-root .fd-wrap{max-width:472px;padding:14px 12px 28px}.fd-root .fd-topbar-in{max-width:472px;min-height:54px;padding:8px 12px}.fd-root .fd-tp-title{font-size:15px}.fd-root .fd-card{min-height:86px;padding:14px}.fd-root .fd-add-button{width:48px;height:48px}.fd-root .fd-bal .amt{font-size:29px}.fd-root .fd-stat{padding:11px 5px}.fd-root .fd-stat .st-l{font-size:9px}.fd-root .fd-stat .st-v{font-size:14px}.fd-root .fd-log{padding:13px}.fd-root .fd-method-dialog{padding:9px 12px 16px}.fd-root .fd-method-option{min-height:72px;grid-template-columns:20px 36px 1fr;gap:7px;padding:9px;border-radius:16px}.fd-root .fd-method-radio{width:18px;height:18px}.fd-root .fd-method-mark{width:35px;height:35px;border-radius:10px}.fd-root .fd-method-option strong{font-size:11px}}

`;
