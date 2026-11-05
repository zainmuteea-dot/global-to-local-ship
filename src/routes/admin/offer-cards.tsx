import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, ImagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";
import {
  QUICK_SWATCHES,
  THEME_COLORS,
  normalizeHex,
  readableTextOn,
  resolveCardColors,
  safeImageUrl,
  type OfferCardColors,
} from "@/lib/offer-card-style";

const db = supabase as any;
const TABLE = "storefront_offer_cards";
const BASE_COLUMNS = "id,title,icon,badge,description,button_label,target_path,theme,is_active,sort_order";
const STYLE_COLUMNS = "image_url,bg_color,bg_color_2,text_color,accent_color,card_width_px,card_height_px";
const MISSING_STYLE_COLUMNS_MESSAGE =
  "قاعدة البيانات تحتاج أعمدة الصورة والألوان والمقاس. طبّق الترحيل 20261105201000_offer_card_dimensions على قاعدة الموقع ثم أعد المحاولة.";

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column/i.test(error.message ?? "");
}

type OfferCard = {
  id: string;
  title: string;
  icon: string;
  badge: string;
  description: string;
  button_label: string;
  target_path: string;
  theme: "exclusive" | "deals";
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  bg_color: string | null;
  bg_color_2: string | null;
  text_color: string | null;
  accent_color: string | null;
  card_width_px: number;
  card_height_px: number;
};

type CardForm = Omit<OfferCard, "id" | "target_path"> & {
  target_path: "/exclusive" | "/deals" | "/offers/new";
};
type CardPayload = Omit<CardForm, "target_path"> & { target_path: string };
const CUSTOM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CARD_DRAFT_KEY = "admin-offer-card-draft-v1";
type LocalCardDraft = { editingId: string | null; form: CardForm; pageSlug: string };
function readLocalCardDraft(): LocalCardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CARD_DRAFT_KEY);
    return raw ? JSON.parse(raw) as LocalCardDraft : null;
  } catch {
    return null;
  }
}

const emptyForm: CardForm = {
  title: "",
  icon: "✨",
  badge: "",
  description: "",
  button_label: "تصفح العروض",
  target_path: "/deals",
  theme: "deals",
  is_active: false,
  sort_order: 0,
  image_url: null,
  card_width_px: 520,
  card_height_px: 300,
  ...THEME_COLORS.deals,
};

const COLOR_FIELDS: { key: keyof OfferCardColors; label: string }[] = [
  { key: "bg_color", label: "لون الخلفية" },
  { key: "bg_color_2", label: "لون التدرّج الثاني" },
  { key: "text_color", label: "لون الكتابة" },
  { key: "accent_color", label: "لون الزر والشارة" },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

function OfferCardsAdminPage() {
  const [cards, setCards] = useState<OfferCard[]>([]);
  const [form, setForm] = useState<CardForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [styleColumnsReady, setStyleColumnsReady] = useState(true);
  const [pageSlug, setPageSlug] = useState("");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = (columns: string) =>
      db.from(TABLE).select(columns).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    let { data, error: queryError } = await query(`${BASE_COLUMNS},${STYLE_COLUMNS}`);
    if (isMissingColumnError(queryError)) {
      setStyleColumnsReady(false);
      ({ data, error: queryError } = await query(BASE_COLUMNS));
    } else {
      setStyleColumnsReady(true);
    }

    if (queryError) {
      setError(`تعذر تحميل بطاقات العروض: ${queryError.message}`);
      setCards([]);
    } else {
      setCards(((data ?? []) as Partial<OfferCard>[]).map((card) => ({
        image_url: null,
        bg_color: null,
        bg_color_2: null,
        text_color: null,
        accent_color: null,
        ...card,
      })) as OfferCard[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  function startNew() {
    const draft = readLocalCardDraft();
    if (draft && !draft.editingId) {
      setEditingId(null);
      setPageSlug(draft.pageSlug || "");
      setForm(draft.form);
    } else {
      setEditingId(null);
      setPageSlug("");
      setForm({ ...emptyForm, sort_order: cards.length });
    }
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function startEdit(card: OfferCard) {
    const savedDraft = readLocalCardDraft();
    if (savedDraft?.editingId === card.id) {
      setEditingId(card.id);
      setPageSlug(savedDraft.pageSlug || "");
      setForm(savedDraft.form);
      setFormOpen(true);
      setError("");
      setNotice("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setEditingId(card.id);
    const isCustomPage = /^\/offers\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.target_path);
    setPageSlug(isCustomPage ? card.target_path.slice("/offers/".length) : "");
    setForm({
      title: card.title,
      icon: card.icon,
      badge: card.badge,
      description: card.description,
      button_label: card.button_label,
      target_path: card.target_path === "/exclusive"
        ? "/exclusive"
        : card.target_path === "/deals"
          ? "/deals"
          : "/offers/new",
      theme: card.theme,
      is_active: card.is_active,
      sort_order: card.sort_order,
      image_url: card.image_url,
      card_width_px: Number(card.card_width_px) || 520,
      card_height_px: Number(card.card_height_px) || 300,
      ...resolveCardColors(card.theme, card),
    });
    setFormOpen(true);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setFormOpen(false);
    try { window.sessionStorage.removeItem(CARD_DRAFT_KEY); } catch { /* ignore storage errors */ }
    setPageSlug("");
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function applyTemplate(theme: CardForm["theme"]) {
    setForm((current) => ({ ...current, theme, ...THEME_COLORS[theme] }));
  }

  function setColor(key: keyof OfferCardColors, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadCardImage(file?: File) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!file.type.startsWith("image/")) {
      setError("اختر ملف صورة صالحًا.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("حجم الصورة يجب ألا يتجاوز 8 ميغابايت.");
      return;
    }
    setUploadingImage(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const filePath = `offer-cards/${crypto.randomUUID()}.${extension}`;
      const { data, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(data.path);
      if (!urlData.publicUrl) throw new Error("تعذر إنشاء رابط للصورة.");
      setForm((current) => ({ ...current, image_url: urlData.publicUrl }));
      setNotice("تم رفع الصورة. اضغط «حفظ البطاقة» لتثبيتها.");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "خطأ غير معروف";
      setError(`تعذر رفع الصورة: ${message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const isCustomPage = form.target_path === "/offers/new";
    const slug = pageSlug.trim().toLowerCase();
    if (isCustomPage && !CUSTOM_SLUG_PATTERN.test(slug)) {
      setError("اكتب معرّفًا إنجليزيًا صالحًا مثل ramadan-offers.");
      return;
    }

    const targetPath = isCustomPage ? `/offers/${slug}` : form.target_path;
    if (
      isCustomPage &&
      cards.some((card) => card.target_path === targetPath && card.id !== editingId)
    ) {
      setError("هذا المسار مستخدم بالفعل. اختر معرّفًا آخر.");
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publishToCustomers = submitter?.value === "publish";
    const payload: CardPayload = {
      ...form,
      is_active: publishToCustomers,
      target_path: targetPath,
      title: form.title.trim(),
      icon: form.icon.trim() || "✨",
      badge: form.badge.trim(),
      description: form.description.trim(),
      button_label: form.button_label.trim() || "تصفح العروض",
      sort_order: Number(form.sort_order),
      image_url: form.image_url ? safeImageUrl(form.image_url) : null,
      card_width_px: Math.round(Number(form.card_width_px)),
      card_height_px: Math.round(Number(form.card_height_px)),
      bg_color: normalizeHex(form.bg_color),
      bg_color_2: normalizeHex(form.bg_color_2),
      text_color: normalizeHex(form.text_color),
      accent_color: normalizeHex(form.accent_color),
    };

    if (!payload.title) {
      setError("اكتب اسم البطاقة.");
      return;
    }
    if (form.image_url && !payload.image_url) {
      setError("رابط الصورة يجب أن يبدأ بـ https://");
      return;
    }
    if (!payload.bg_color || !payload.bg_color_2 || !payload.text_color || !payload.accent_color) {
      setError("أحد الألوان غير صالح. اختر اللون من المنتقي أو اكتبه بصيغة ‎#RRGGBB.");
      return;
    }
    if (!Number.isInteger(payload.sort_order)) {
      setError("ترتيب البطاقة يجب أن يكون عددًا صحيحًا.");
      return;
    }
    if (!Number.isInteger(payload.card_width_px) || payload.card_width_px < 240 || payload.card_width_px > 1600) {
      setError("عرض البطاقة يجب أن يكون بين 240 و1600 بكسل.");
      return;
    }
    if (!Number.isInteger(payload.card_height_px) || payload.card_height_px < 220 || payload.card_height_px > 900) {
      setError("ارتفاع البطاقة يجب أن يكون بين 220 و900 بكسل.");
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publishToCustomers = submitter?.value === "publish";
    if (!publishToCustomers) {
      const draftPayload = { ...payload, is_active: false } as CardForm;
      try {
        window.sessionStorage.setItem(CARD_DRAFT_KEY, JSON.stringify({ editingId, form: draftPayload, pageSlug } satisfies LocalCardDraft));
      } catch {
        setError("تعذر حفظ المسودة على هذا الجهاز. يمكنك إبقاء النموذج مفتوحًا ومراجعة المعاينة.");
        return;
      }
      setNotice("حُفظت المسودة على هذا الجهاز فقط. لم تتغير البطاقة المنشورة ولم تُرسل أي تغييرات للعملاء.");
      return;
    }

    payload.is_active = true;
    setSaving(true);
    const result = editingId
      ? await db.from(TABLE).update(payload).eq("id", editingId)
      : await db.from(TABLE).insert(payload);
    setSaving(false);

    if (result.error) {
      setError(isMissingColumnError(result.error) ? MISSING_STYLE_COLUMNS_MESSAGE : `تعذر حفظ البطاقة: ${result.error.message}`);
      return;
    }

    setNotice(publishToCustomers ? "تم نشر البطاقة للعملاء." : "تم حفظ البطاقة كمسودة، ولن تظهر للعملاء.");
    cancelForm();
    await loadCards();
  }

  async function deleteCard(card: OfferCard) {
    if (!window.confirm(`هل تريد حذف بطاقة «${card.title}»؟`)) return;
    setError("");
    setNotice("");
    const { error: deleteError } = await db.from(TABLE).delete().eq("id", card.id);
    if (deleteError) {
      setError(`تعذر حذف البطاقة: ${deleteError.message}`);
      return;
    }
    if (editingId === card.id) cancelForm();
    setNotice("تم حذف البطاقة.");
    await loadCards();
  }

  return (
    <AdminRouteGuard>
      <main dir="rtl" className="min-h-[100dvh] bg-slate-50 px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-bold text-amber-700">إدارة صفحة المنتجات</p>
              <h1 className="mt-1 text-2xl font-black">بطاقات العروض</h1>
              <p className="mt-2 text-sm text-slate-500">أضف البطاقات وعدّل اسمها وأيقونتها أو احذفها. التغييرات تظهر للعملاء.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/products" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-slate-50">
                <ArrowRight className="size-4" /> صفحة العملاء
              </Link>
              <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
                <Plus className="size-4" /> إضافة بطاقة
              </button>
            </div>
          </header>

          {(error || notice) && (
            <div role={error ? "alert" : "status"} className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              <span>{error || notice}</span>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} aria-label="إغلاق التنبيه"><X className="size-4" /></button>
            </div>
          )}

          {formOpen && (
            <form onSubmit={saveCard} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">{editingId ? "تعديل البطاقة" : "بطاقة جديدة"}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">اسم البطاقة
                  <input required maxLength={100} className={inputClass} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label className="text-sm font-bold">الأيقونة (إيموجي أو رمز)
                  <input maxLength={12} className={inputClass} value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} placeholder="👑" />
                </label>
                <label className="text-sm font-bold">الشارة الصغيرة
                  <input maxLength={40} className={inputClass} value={form.badge} onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))} placeholder="EXCLUSIVE" />
                </label>
                <label className="text-sm font-bold">نص الزر
                  <input maxLength={60} className={inputClass} value={form.button_label} onChange={(event) => setForm((current) => ({ ...current, button_label: event.target.value }))} />
                </label>
                <label className="text-sm font-bold">صفحة الوجهة
                  <select className={inputClass} value={form.target_path} onChange={(event) => {
                    const nextTarget = event.target.value as CardForm["target_path"];
                    setForm((current) => ({ ...current, target_path: nextTarget }));
                    if (nextTarget !== "/offers/new") setPageSlug("");
                  }}>
                    <option value="/exclusive">العروض الحصرية (/exclusive)</option>
                    <option value="/deals">التخفيضات (/deals)</option>
                    <option value="/offers/new">إنشاء صفحة مستقلة</option>
                  </select>
                </label>
                {form.target_path === "/offers/new" && (
                  <label className="text-sm font-bold">
                    معرّف الصفحة بالإنجليزية (slug)
                    <input
                      required
                      maxLength={60}
                      dir="ltr"
                      className={inputClass}
                      value={pageSlug}
                      onChange={(event) => setPageSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                          .replace(/-{2,}/g, "-")
                          .replace(/^-+|-+$/g, ""),
                      )}
                      placeholder="ramadan-offers"
                      aria-describedby="offer-page-slug-hint"
                    />
                    <span id="offer-page-slug-hint" className="mt-1 block text-xs font-normal text-slate-500">
                      رابط الصفحة سيكون: <b dir="ltr">/offers/{pageSlug || "your-slug"}</b>
                    </span>
                  </label>
                )}
                <label className="text-sm font-bold">قالب ألوان جاهز (تقدر تغيّره تحت)
                  <select className={inputClass} value={form.theme} onChange={(event) => applyTemplate(event.target.value as CardForm["theme"])}>
                    <option value="exclusive">أسود وذهبي</option>
                    <option value="deals">وردي</option>
                  </select>
                </label>
                <label className="text-sm font-bold">ترتيب العرض
                  <input type="number" step="1" className={inputClass} value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
                </label>
                <div className="self-end rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  الحالة الحالية: {form.is_active ? "منشورة للعملاء" : "مسودة غير ظاهرة للعملاء"}. استخدم زر النشر بعد مراجعة المعاينة.
                </div>
              </div>
              {form.target_path === "/offers/new" && (
                <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800">
                  إنشاء الصفحات المستقلة يحتاج تطبيق ترحيل قاعدة البيانات وإضافة مسار العرض الديناميكي أولًا. إذا لم تُطبّق هذه التغييرات، قد يرفض حفظ المسار الجديد.
                </p>
              )}
              {!styleColumnsReady && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">{MISSING_STYLE_COLUMNS_MESSAGE}</p>
              )}

              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-black">صورة البطاقة</legend>
                <div className="flex flex-wrap items-center gap-3">
                  {form.image_url ? (
                    <img src={form.image_url} alt="صورة البطاقة" className="size-20 rounded-xl border object-cover" />
                  ) : (
                    <span className="grid size-20 place-items-center rounded-xl border border-dashed text-xs text-slate-400">بدون صورة</span>
                  )}
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-slate-50 ${uploadingImage ? "pointer-events-none opacity-50" : ""}`}>
                    <ImagePlus className="size-4" /> {uploadingImage ? "جارٍ رفع الصورة…" : "اختيار صورة من الجهاز"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingImage}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void uploadCardImage(file);
                      }}
                    />
                  </label>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm((current) => ({ ...current, image_url: null }))} className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50">
                      إزالة الصورة
                    </button>
                  )}
                </div>
                <label className="block text-sm font-bold">أو الصق رابط صورة (https://)
                  <input dir="ltr" className={inputClass} value={form.image_url ?? ""} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value || null }))} placeholder="https://..." />
                </label>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-black">أبعاد البطاقة للعملاء</legend>
                <p className="text-xs leading-6 text-slate-500">غيّر العرض والارتفاع بالبكسل، وشاهد النتيجة مباشرة في المعاينة أدناه. على الجوال يتقلص العرض تلقائيًا ليلائم الشاشة.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">العرض (px)
                    <input type="number" min={240} max={1600} step={10} required className={inputClass} value={form.card_width_px} onChange={(event) => setForm((current) => ({ ...current, card_width_px: Number(event.target.value) }))} />
                    <span className="mt-1 block text-xs font-normal text-slate-500">من 240 إلى 1600 بكسل</span>
                  </label>
                  <label className="text-sm font-bold">الارتفاع (px)
                    <input type="number" min={220} max={900} step={10} required className={inputClass} value={form.card_height_px} onChange={(event) => setForm((current) => ({ ...current, card_height_px: Number(event.target.value) }))} />
                    <span className="mt-1 block text-xs font-normal text-slate-500">من 220 إلى 900 بكسل</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-black">الألوان — اختر أي لون</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {COLOR_FIELDS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <span className="block text-sm font-bold">{label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={label}
                          value={normalizeHex(form[key]) ?? "#000000"}
                          onChange={(event) => setColor(key, event.target.value.toUpperCase())}
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                        />
                        <input
                          dir="ltr"
                          maxLength={7}
                          aria-label={`${label} بصيغة hex`}
                          className={`${inputClass} mt-0 font-mono uppercase`}
                          value={form[key] ?? ""}
                          onChange={(event) => setColor(key, event.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            title={swatch}
                            aria-label={`${label}: ${swatch}`}
                            onClick={() => setColor(key, swatch)}
                            className={`size-6 rounded-full border border-slate-300 ${normalizeHex(form[key]) === swatch ? "ring-2 ring-amber-500 ring-offset-1" : ""}`}
                            style={{ background: swatch }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>

              <section aria-label="معاينة البطاقة للعملاء" className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black">معاينة قبل النشر</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">شاهد شكل البطاقة ضمن صفحة المتجر. «حفظ كمسودة» يحفظها على هذا الجهاز فقط ولا يغيّر ما يراه العملاء؛ لن تُحفظ في قاعدة البيانات أو تظهر لهم إلا عند اختيار «نشر للعملاء».</p>
                  </div>
                  <div className="flex gap-2" role="group" aria-label="حجم معاينة الشاشة">
                    <button type="button" aria-pressed={previewViewport === "desktop"} onClick={() => setPreviewViewport("desktop")} className={`rounded-lg border px-3 py-2 text-xs font-bold ${previewViewport === "desktop" ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300 bg-white text-slate-700"}`}>كمبيوتر</button>
                    <button type="button" aria-pressed={previewViewport === "mobile"} onClick={() => setPreviewViewport("mobile")} className={`rounded-lg border px-3 py-2 text-xs font-bold ${previewViewport === "mobile" ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300 bg-white text-slate-700"}`}>جوال</button>
                  </div>
                </div>
                <div className="mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-[#FFFBF5] p-3 shadow-inner sm:p-5" style={{ width: previewViewport === "mobile" ? 390 : "100%", maxWidth: "100%" }}>
                  <div className="mb-4 flex items-center justify-between border-b border-amber-200 pb-3 text-[10px] font-black text-slate-500 sm:text-xs">
                    <span>YOUR GLOBAL SHOPPER · السوق الشامل</span>
                    <span>معاينة {previewViewport === "mobile" ? "الجوال" : "الكمبيوتر"}</span>
                  </div>
                  <h4 className="mb-3 text-sm font-black text-[#1B1408]">العروض المميزة</h4>
                  <OfferCardPreview form={form} mobile={previewViewport === "mobile"} />
                </div>
                <p className="text-xs leading-5 text-slate-500">العرض المدخل {form.card_width_px}px والارتفاع {form.card_height_px}px. على الجوال يُحدّ العرض تلقائيًا ليتناسب مع عرض الشاشة.</p>
              </section>

              <label className="block text-sm font-bold">الوصف
                <textarea rows={3} maxLength={300} className={inputClass} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={saving} name="intent" value="draft" type="submit" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-50">
                  {saving ? <Save className="size-4 animate-pulse" /> : <Save className="size-4" />}{saving ? "جارٍ الحفظ…" : "حفظ كمسودة"}
                </button>
                <button disabled={saving} name="intent" value="publish" type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {saving ? <Save className="size-4 animate-pulse" /> : <Check className="size-4" />}{saving ? "جارٍ الحفظ…" : "نشر للعملاء"}
                </button>
                <button type="button" onClick={cancelForm} className="rounded-xl border px-4 py-2.5 text-sm font-bold">إلغاء</button>
              </div>
            </form>
          )}

          <section aria-label="قائمة بطاقات العروض" className="space-y-3">
            {loading ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500">جارٍ تحميل البطاقات...</p> : null}
            {!loading && cards.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500">لا توجد بطاقات محفوظة. أضف بطاقة للبدء.</p> : null}
            {cards.map((card) => (
              <article key={card.id} className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {card.image_url ? (
                    <img src={card.image_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: resolveCardColors(card.theme, card).bg_color }}>{card.icon}</span>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-black">{card.title}</h2>
                    <p className="mt-1 truncate text-sm text-slate-500">{card.description || "دون وصف"} · {card.target_path}</p>
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${card.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{card.is_active ? "ظاهرة" : "مخفية"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(card)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold hover:bg-slate-50"><Pencil className="size-4" /> تعديل</button>
                  <button type="button" onClick={() => void deleteCard(card)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"><Trash2 className="size-4" /> حذف</button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </AdminRouteGuard>
  );
}

function OfferCardPreview({ form, mobile = false }: { form: CardForm; mobile?: boolean }) {
  const colors = resolveCardColors(form.theme, form);
  const image = safeImageUrl(form.image_url);
  return (
    <div
      className="relative mx-auto flex flex-col items-start justify-center gap-3 overflow-hidden rounded-2xl p-6 text-right"
      style={{ boxSizing: "border-box", width: `min(100%, ${Math.max(240, Number(form.card_width_px) || 520)}px)`, height: `${Math.max(220, Number(form.card_height_px) || 300)}px`, minHeight: 220, paddingTop: mobile && image ? 190 : 24, background: `linear-gradient(135deg, ${colors.bg_color}, ${colors.bg_color_2})`, color: colors.text_color }}
    >
      {image && (
        <img
          src={image}
          alt=""
          className="absolute object-cover"
          style={mobile
            ? { top: 0, left: 0, width: "100%", height: 170, maskImage: "linear-gradient(to top, transparent, #000 40%)", WebkitMaskImage: "linear-gradient(to top, transparent, #000 40%)" }
            : { insetBlock: 0, left: 0, width: "45%", height: "100%", maskImage: "linear-gradient(to left, transparent, #000 45%)", WebkitMaskImage: "linear-gradient(to left, transparent, #000 45%)" }}
        />
      )}
      {!image && <span aria-hidden="true" className="absolute left-5 top-4 text-4xl opacity-60">{form.icon || "✨"}</span>}
      {form.badge && (
        <span className="relative rounded-full px-4 py-1.5 text-sm font-black" style={{ background: colors.accent_color, color: readableTextOn(colors.accent_color) }}>{form.badge}</span>
      )}
      <h3 className={`relative ${mobile ? "max-w-full" : "max-w-[55%]"} text-2xl font-black`}>{form.title || "اسم البطاقة"}</h3>
      {form.description && <p className={`relative ${mobile ? "max-w-full" : "max-w-[55%]"} text-sm font-bold opacity-90`}>{form.description}</p>}
      <span className="relative rounded-full px-5 py-2.5 text-sm font-black" style={{ background: colors.accent_color, color: readableTextOn(colors.accent_color) }}>
        {form.button_label || "تصفح العروض"} ←
      </span>
    </div>
  );
}

export const Route = createFileRoute("/admin/offer-cards")({ component: OfferCardsAdminPage });
