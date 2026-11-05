import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Camera, ImagePlus, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedLogo } from "@/components/admin/Logo";
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

type OfferType = "exclusive" | "deals" | "both";
type OfferProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  discount_percent: number;
  offer_type: OfferType;
  category: string | null;
  brand: string | null;
  description: string | null;
  bg_color: string | null;
  bg_color_2: string | null;
  text_color: string | null;
  accent_color: string | null;
};

type ProductForm = {
  name: string;
  image_url: string;
  price: string;
  discount_percent: string;
  offer_type: OfferType | "";
  category: string;
  brand: string;
  description: string;
} & OfferCardColors;

const productStyleDefaults = (offerType: OfferType | "") =>
  offerType === "exclusive" ? THEME_COLORS.exclusive : THEME_COLORS.deals;

const PRODUCT_COLOR_FIELDS: { key: keyof OfferCardColors; label: string }[] = [
  { key: "bg_color", label: "لون الخلفية" },
  { key: "bg_color_2", label: "لون التدرّج الثاني" },
  { key: "text_color", label: "لون الكتابة" },
  { key: "accent_color", label: "لون شارة الخصم" },
];

const emptyForm: ProductForm = {
  name: "",
  image_url: "",
  price: "",
  discount_percent: "70",
  offer_type: "",
  category: "",
  brand: "",
  description: "",
  ...THEME_COLORS.deals,
};

type OfferDraft = { form: ProductForm; editingId: string | null; formOpen: boolean };
const OFFER_DRAFT_KEY = "admin-offers-form-draft-v1";

function readOfferDraft(): OfferDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OFFER_DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<OfferDraft>;
    if (!saved.formOpen || !saved.form || typeof saved.form !== "object") return null;
    const form = saved.form as Partial<ProductForm>;
    const offerType = form.offer_type;
    const validOfferType = ["", "exclusive", "deals", "both"].includes(String(offerType))
      ? (offerType as ProductForm["offer_type"])
      : "";
    const styleDefaults = productStyleDefaults(validOfferType);
    return {
      form: {
        name: typeof form.name === "string" ? form.name : "",
        image_url: typeof form.image_url === "string" ? form.image_url : "",
        price: typeof form.price === "string" ? form.price : "",
        discount_percent: typeof form.discount_percent === "string" ? form.discount_percent : "70",
        offer_type: validOfferType,
        category: typeof form.category === "string" ? form.category : "",
        brand: typeof form.brand === "string" ? form.brand : "",
        description: typeof form.description === "string" ? form.description : "",
        bg_color: typeof form.bg_color === "string" ? form.bg_color : styleDefaults.bg_color,
        bg_color_2: typeof form.bg_color_2 === "string" ? form.bg_color_2 : styleDefaults.bg_color_2,
        text_color: typeof form.text_color === "string" ? form.text_color : styleDefaults.text_color,
        accent_color: typeof form.accent_color === "string" ? form.accent_color : styleDefaults.accent_color,
      },
      editingId: typeof saved.editingId === "string" ? saved.editingId : null,
      formOpen: true,
    };
  } catch {
    return null;
  }
}

const offerLabels: Record<OfferType, string> = {
  exclusive: "عروض حصرية",
  deals: "تخفيضات حتى 70%",
  both: "الاثنين معًا",
};
const inputClass =
  "mt-2 w-full rounded-xl border border-[#C9DCEB] bg-white px-4 py-3 text-sm text-[#0A2540] outline-none transition focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/15";

function AdminOffersPage() {
  const [initialDraft] = useState<OfferDraft | null>(() => readOfferDraft());
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(() => initialDraft?.form ?? { ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(() => initialDraft?.editingId ?? null);
  const [formOpen, setFormOpen] = useState(() => initialDraft?.formOpen ?? false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [styleColumnsReady, setStyleColumnsReady] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [typeFilter, setTypeFilter] = useState<OfferType | "all">("all");
  const visibleProducts = typeFilter === "all" ? products : products.filter((p) => p.offer_type === typeFilter);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = (columns: string) => db
      .from("products")
      .select(columns)
      .in("offer_type", ["exclusive", "deals", "both"])
      .order("name", { ascending: true });
    let { data, error: queryError } = await query("id,name,image_url,price,discount_percent,offer_type,category,brand,description,bg_color,bg_color_2,text_color,accent_color");
    if (queryError && (queryError.code === "42703" || queryError.code === "PGRST204" || /column/i.test(queryError.message ?? ""))) {
      setStyleColumnsReady(false);
      ({ data, error: queryError } = await query("id,name,image_url,price,discount_percent,offer_type,category,brand,description"));
    } else {
      setStyleColumnsReady(true);
    }

    if (queryError) {
      setError(`تعذر تحميل المنتجات: ${queryError.message}`);
      setProducts([]);
    } else {
      setProducts(((data ?? []) as Partial<OfferProduct>[]).map((product) => ({
        bg_color: null,
        bg_color_2: null,
        text_color: null,
        accent_color: null,
        ...product,
      })) as OfferProduct[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Keep an in-progress product safe if the protected route is remounted or refreshed.
  useEffect(() => {
    try {
      if (!formOpen) {
        window.sessionStorage.removeItem(OFFER_DRAFT_KEY);
        return;
      }
      window.sessionStorage.setItem(
        OFFER_DRAFT_KEY,
        JSON.stringify({ form, editingId, formOpen: true } satisfies OfferDraft),
      );
    } catch {
      // Storage can be unavailable in private/restricted browsing; the live React state remains intact.
    }
  }, [form, editingId, formOpen]);

  const openNewForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = (product: OfferProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name ?? "",
      image_url: product.image_url ?? "",
      price: String(product.price ?? ""),
      discount_percent: String(product.discount_percent ?? 0),
      offer_type: product.offer_type,
      category: product.category ?? "",
      brand: product.brand ?? "",
      description: product.description ?? "",
      ...resolveCardColors(product.offer_type === "exclusive" ? "exclusive" : "deals", product),
    });
    setError("");
    setNotice("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const uploadProductImage = async (file?: File) => {
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
      const filePath = `offers/${crypto.randomUUID()}.${extension}`;
      const { data, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(data.path);
      if (!urlData.publicUrl) throw new Error("تعذر إنشاء رابط عام للصورة.");
      setForm((current) => ({ ...current, image_url: urlData.publicUrl }));
      setNotice("تم رفع الصورة وإنشاء رابطها. احفظ المنتج لتثبيت التغييرات.");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "خطأ غير معروف";
      setError(`تعذر رفع الصورة. تأكد من إعداد bucket product-images وسياساته: ${message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = form.name.trim();
    const imageUrl = form.image_url.trim();
    const price = Number(form.price);
    const discount = Number(form.discount_percent);

    if (!name) return setError("اكتب اسم المنتج.");
    if (!Number.isFinite(price) || price < 0) return setError("أدخل سعرًا قبل الخصم صحيحًا.");
    if (!Number.isInteger(discount) || discount < 0 || discount > 100) {
      return setError("نسبة الخصم يجب أن تكون عددًا صحيحًا بين 0 و100.");
    }
    if (!form.offer_type) return setError("اختر نوع العرض.");
    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== "https:") throw new Error("https required");
      } catch {
        return setError("أدخل رابط صورة صحيحًا يبدأ بـ https://، أو اتركه فارغًا.");
      }
    }

    const payload = {
      name,
      image_url: imageUrl || null,
      price,
      discount_percent: discount,
      offer_type: form.offer_type,
      category: form.category || null,
      brand: form.brand.trim() || null,
      description: form.description.trim() || null,
      bg_color: normalizeHex(form.bg_color),
      bg_color_2: normalizeHex(form.bg_color_2),
      text_color: normalizeHex(form.text_color),
      accent_color: normalizeHex(form.accent_color),
    };
    if (!payload.bg_color || !payload.bg_color_2 || !payload.text_color || !payload.accent_color) {
      return setError("أحد الألوان غير صالح. اختر لونًا أو اكتبه بصيغة #RRGGBB.");
    }

    setSaving(true);
    const result = editingId
      ? await db.from("products").update(payload).eq("id", editingId)
      : await db.from("products").insert(payload);
    setSaving(false);

    if (result.error) {
      const missingStyleColumn = result.error.code === "42703" || result.error.code === "PGRST204" || /column/i.test(result.error.message ?? "");
      if (missingStyleColumn) setStyleColumnsReady(false);
      setError(missingStyleColumn
        ? "لم تُحفظ الألوان لأن أعمدتها غير موجودة في قاعدة البيانات. طبّق ترحيل product_card_colors على قاعدة الموقع الصحيحة ثم أعد المحاولة."
        : `لم يُحفظ المنتج: ${result.error.message}`);
      return;
    }

    closeForm();
    setNotice(editingId ? "تم تحديث المنتج بنجاح." : "تمت إضافة المنتج بنجاح.");
    await loadProducts();
  };

  const deleteProduct = async (product: OfferProduct) => {
    if (!window.confirm(`هل تريد حذف «${product.name}»؟`)) return;
    setError("");
    setNotice("");
    setDeletingId(product.id);
    const { error: deleteError } = await db.from("products").delete().eq("id", product.id);
    setDeletingId(null);

    if (deleteError) {
      setError(`لم يُحذف المنتج من قاعدة البيانات: ${deleteError.message}`);
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setNotice("تم حذف المنتج.");
  };

  return (
    <main dir="rtl" className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F3F8FC] px-3 py-4 text-[#0A2540] sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-3xl border border-[#DCEAF4] bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-6">
            <div className="mb-4 flex items-center justify-center border-b border-[#E6F0F7] pb-4 lg:mb-5 lg:pb-5">
              <EmbeddedLogo size="lg" />
            </div>
            <button
              type="button"
              onClick={openNewForm}
              className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#0284C7] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105 lg:mb-5"
            >
              <Plus className="size-5" /> إضافة منتج جديد
            </button>
            <p className="px-1 pb-2 text-xs font-black text-[#0A2540]">تصنيف المنتجات</p>
            <div
              className="grid grid-cols-2 gap-2 lg:flex lg:flex-col"
              role="group"
              aria-label="فلترة أنواع العروض"
            >
              {(["all", "exclusive", "deals", "both"] as const).map((key) => {
                const active = typeFilter === key;
                const label = key === "all" ? "عرض الكل" : offerLabels[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    aria-pressed={active}
                    className={`flex min-h-11 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-bold transition lg:w-full lg:px-3 ${key === "all" ? "lg:order-last lg:mt-2 lg:justify-center" : ""} ${
                      active
                        ? key === "all"
                          ? "border-[#0F4C81] bg-[#0F4C81] text-white"
                          : "border-[#F97316] bg-orange-50 text-[#0F4C81] shadow-sm"
                        : "border-[#DCEAF4] bg-white text-slate-600 hover:border-[#0284C7] hover:bg-sky-50"
                    }`}
                  >
                    <span>{label}</span>
                    {active && key !== "all" && <span className="size-2 rounded-full bg-[#F97316]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </aside>
          <div className="min-w-0">
        <header className="mb-5 flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-l from-[#0F4C81] to-[#0284C7] p-5 text-white shadow-xl sm:mb-8 sm:flex-row sm:items-center sm:p-9">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold tracking-[0.15em] text-[#FDBA74] sm:text-xs sm:tracking-[0.22em]">AL SHAMEEL SHOPPING · OFFERS</p>
            <h1 className="text-xl font-black leading-snug sm:text-3xl">إضافة منتجات للعروض والتخفيضات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:mt-3">
              أضف منتجاتك وحدد سعرها ونسبة خصمها بنفسك، دون ربطها بأي متجر خارجي.
            </p>
          </div>

        </header>

        {notice && (
          <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </p>
        )}

        {formOpen && (
          <form onSubmit={saveProduct} className="mb-5 rounded-3xl border border-[#DCEAF4] bg-white p-4 shadow-sm sm:mb-8 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#F97316]">{editingId ? "تعديل المنتج" : "منتج جديد"}</p>
                <h2 className="mt-1 text-xl font-black">{editingId ? "حدّث تفاصيل العرض" : "أدخل تفاصيل المنتج"}</h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="إغلاق النموذج"
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {!styleColumnsReady && (
              <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                قاعدة البيانات لا تحتوي أعمدة ألوان المنتجات بعد. أضف الأعمدة الأربعة بترحيل `product_card_colors` قبل حفظ الألوان؛ سيظل تحميل المنتجات القديمة متاحًا.
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-bold">
                اسم المنتج
                <input
                  required
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="مثال: حقيبة نسائية"
                />
              </label>

              <label className="text-sm font-bold">
                الماركة
                <input
                  className={inputClass}
                  value={form.brand}
                  onChange={(e) => setForm((current) => ({ ...current, brand: e.target.value }))}
                  placeholder="مثال: Nike"
                />
              </label>

              <label className="text-sm font-bold lg:col-span-3">
                وصف المنتج
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                  placeholder="اكتب وصفًا مختصرًا للمنتج"
                />
              </label>

              <div className="text-sm font-bold">
                صورة المنتج
                <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#8BB9D6] bg-[#F4FAFE] px-4 py-3 text-sm font-bold text-[#0F4C81] hover:bg-sky-50">
                  <Camera className="size-5" />
                  {uploadingImage ? "جارٍ رفع الصورة…" : "التقط صورة أو اختر من الهاتف"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      void uploadProductImage(file);
                    }}
                  />
                </label>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  أو أدخل رابط الصورة يدويًا
                  <input
                    type="url"
                    className={inputClass}
                    value={form.image_url}
                    onChange={(e) => setForm((current) => ({ ...current, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                {form.image_url && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#DCEAF4] p-2">
                    <img src={form.image_url} alt="معاينة صورة المنتج" className="size-16 rounded-lg object-cover" />
                    <span className="min-w-0 break-all text-xs font-normal text-slate-600">تم إنشاء/إدخال رابط الصورة</span>
                  </div>
                )}
              </div>

              <fieldset className="space-y-4 rounded-2xl border border-[#DCEAF4] p-4 sm:col-span-2 lg:col-span-3">
                <legend className="px-2 text-sm font-black">ألوان بطاقة المنتج</legend>
                <p className="text-xs font-medium text-slate-500">اختر أي لون من المنتقي أو أدخل قيمة HEX، وشاهد المعاينة قبل الحفظ.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {PRODUCT_COLOR_FIELDS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <span className="block text-sm font-bold">{label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={label}
                          value={normalizeHex(form[key]) ?? "#000000"}
                          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value.toUpperCase() }))}
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                        />
                        <input
                          dir="ltr"
                          maxLength={7}
                          aria-label={`${label} بصيغة HEX`}
                          className={`${inputClass} mt-0 font-mono uppercase`}
                          value={form[key]}
                          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder="#RRGGBB"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            title={swatch}
                            aria-label={`${label}: ${swatch}`}
                            onClick={() => setForm((current) => ({ ...current, [key]: swatch }))}
                            className={`size-6 rounded-full border border-slate-300 ${normalizeHex(form[key]) === swatch ? "ring-2 ring-[#0F4C81] ring-offset-1" : ""}`}
                            style={{ background: swatch }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-sm font-black">معاينة بطاقة المنتج كما تظهر للعميل</p>
                  <OfferProductPreview form={form} />
                </div>
              </fieldset>

              <label className="text-sm font-bold">
                قسم المنتج
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                >
                  <option value="">اختر القسم</option>
                  <option value="electronics">إلكترونيات</option>
                  <option value="office_supplies">أدوات مكتبية</option>
                  <option value="hookah_supplies">معسلات الشيشة</option>
                  <option value="other">أخرى</option>
                </select>
              </label>

              <label className="text-sm font-bold">
                السعر قبل الخصم
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))}
                  placeholder="0.00"
                />
              </label>

              <label className="text-sm font-bold">
                نسبة الخصم (%)
                <input
                  required
                  min="0"
                  max="100"
                  step="1"
                  type="number"
                  className={inputClass}
                  value={form.discount_percent}
                  onChange={(e) => setForm((current) => ({ ...current, discount_percent: e.target.value }))}
                  placeholder="70"
                />
              </label>

              <label className="text-sm font-bold">
                نوع العرض
                <select
                  required
                  className={inputClass}
                  value={form.offer_type}
                  onChange={(e) => {
                    const nextType = e.target.value as ProductForm["offer_type"];
                    setForm((current) => ({
                      ...current,
                      offer_type: nextType,
                      ...(nextType ? productStyleDefaults(nextType) : {}),
                    }));
                  }}
                >
                  <option value="">اختر نوع العرض</option>
                  <option value="exclusive">عروضات حصرية</option>
                  <option value="deals">تخفيضات حتى 70%</option>
                  <option value="both">الاثنين معاً</option>
                </select>
              </label>

            </div>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:flex-wrap">
              <button
                disabled={saving}
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#0284C7] px-6 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "جارٍ الحفظ…" : "حفظ المنتج"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-600 hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        <section className="overflow-hidden rounded-3xl border border-[#DCEAF4] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E6F0F7] px-4 py-4 sm:px-7 sm:py-5">
            <div>
              <h2 className="text-lg font-black">منتجات العروض</h2>
              <p className="mt-1 text-sm text-gray-500">{visibleProducts.length} من {products.length} منتج</p>
            </div>
            <span className="rounded-full bg-[#EAF5FC] p-3 text-[#F97316]">
              <ImagePlus className="size-5" />
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
              <LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل المنتجات…
            </div>
          ) : visibleProducts.length === 0 ? (
            <p className="p-12 text-center text-sm text-gray-500">لا توجد منتجات عروض حاليًا.</p>
          ) : (
            <>
            <ul className="divide-y divide-[#E6F0F7] md:hidden">
              {visibleProducts.map((product) => {
                const finalPrice = Number(product.price) * (1 - Number(product.discount_percent) / 100);
                const categoryLabel = product.category
                  ? ({ electronics: "إلكترونيات", office_supplies: "أدوات مكتبية", hookah_supplies: "معسلات الشيشة", other: "أخرى" } as Record<string, string>)[product.category] ?? product.category
                  : null;
                return (
                  <li key={product.id} className="p-4">
                    <div className="flex gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="grid size-20 shrink-0 place-items-center rounded-xl bg-gray-100 text-xs text-gray-400">لا صورة</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 truncate font-black">{product.name}</h3>
                          <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                            خصم %{product.discount_percent}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {[product.brand, categoryLabel, offerLabels[product.offer_type]].filter(Boolean).join(" · ")}
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                          <span className="text-base font-black text-[#0F4C81]">
                            {finalPrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س
                          </span>
                          <span className="text-xs text-gray-400 line-through">{Number(product.price).toLocaleString("ar")} ر.س</span>
                        </div>
                      </div>
                    </div>
                    {product.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{product.description}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCEAF4] text-sm font-bold text-[#0284C7] hover:bg-[#EAF5FC]"
                      >
                        <Pencil className="size-4" /> تعديل
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => void deleteProduct(product)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-100 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" /> حذف
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-right text-sm">
                <thead className="bg-[#F7FAFC] text-xs text-gray-500">
                  <tr>
                    {["الصورة", "الاسم", "الماركة", "الوصف", "القسم", "السعر قبل الخصم", "السعر بعد الخصم", "الخصم", "نوع العرض", "إجراء"].map((label) => (
                      <th key={label} className="px-4 py-4 font-bold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6F0F7]">
                  {visibleProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#F8FBFE]">
                      <td className="px-4 py-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="size-14 rounded-xl object-cover" />
                        ) : (
                          <span className="grid size-14 place-items-center rounded-xl bg-gray-100 text-xs text-gray-400">
                            لا صورة
                          </span>
                        )}
                      </td>
                      <td className="max-w-56 px-4 py-3 font-bold">{product.name}</td>
                      <td className="px-4 py-3">{product.brand || "—"}</td>
                      <td className="max-w-64 px-4 py-3">{product.description ? <span className="line-clamp-2">{product.description}</span> : "—"}</td>
                      <td className="px-4 py-3">{product.category ? ({ electronics: "إلكترونيات", office_supplies: "أدوات مكتبية", hookah_supplies: "معسلات الشيشة", other: "أخرى" } as Record<string, string>)[product.category] ?? product.category : "—"}</td>
                      <td className="px-4 py-3">{Number(product.price).toLocaleString("ar")} ر.س</td>
                      <td className="px-4 py-3 font-bold text-[#0F4C81]">{(Number(product.price) * (1 - Number(product.discount_percent) / 100)).toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700">
                          خصم %{product.discount_percent}
                        </span>
                      </td>
                      <td className="px-4 py-3">{offerLabels[product.offer_type]}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            aria-label={`تعديل ${product.name}`}
                            className="rounded-lg border border-[#DCEAF4] p-2 text-[#0284C7] hover:bg-[#EAF5FC]"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === product.id}
                            onClick={() => void deleteProduct(product)}
                            aria-label={`حذف ${product.name}`}
                            className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function OfferProductPreview({ form }: { form: ProductForm }) {
  const styleType = form.offer_type === "exclusive" ? "exclusive" : "deals";
  const colors = resolveCardColors(styleType, form);
  const image = safeImageUrl(form.image_url);
  const price = Math.max(0, Number(form.price) || 0);
  const discount = Math.max(0, Math.min(100, Number(form.discount_percent) || 0));
  const salePrice = price * (1 - discount / 100);

  return (
    <article
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ background: `linear-gradient(135deg, ${colors.bg_color}, ${colors.bg_color_2})`, color: colors.text_color, borderColor: colors.bg_color_2 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
        {image ? <img src={image} alt="معاينة المنتج" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm opacity-70">صورة المنتج</div>}
        <span className="absolute right-3 top-3 rounded-full px-3 py-2 text-xs font-black shadow" style={{ background: colors.accent_color, color: readableTextOn(colors.accent_color) }}>خصم %{discount}</span>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs font-bold opacity-75">{form.offer_type ? offerLabels[form.offer_type] : "نوع العرض"}</p>
        <h3 className="font-black">{form.name || "اسم المنتج"}</h3>
        {form.brand && <p className="text-sm font-bold opacity-85">الماركة: {form.brand}</p>}
        {form.description && <p className="line-clamp-2 text-sm leading-6 opacity-85">{form.description}</p>}
        <div className="flex items-baseline gap-2">
          {discount > 0 && <span className="text-sm line-through opacity-60">{price.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</span>}
          <strong className="text-xl">{salePrice.toLocaleString("ar", { maximumFractionDigits: 2 })} ر.س</strong>
        </div>
      </div>
    </article>
  );
}

export const Route = createFileRoute("/admin/offers")({
  // /admin is the parent route and already applies the shared admin guard.
  component: AdminOffersPage,
});
