import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

type LogoItem = {
  slug: string;
  name: string;
  code: string;
  color: string;
  arabicLabel?: string;
};

const INITIAL_LOGOS: LogoItem[] = [
  { slug: "aliexpress", name: "AliExpress", code: "ALX-1024", color: "#FF4747" },
  { slug: "amazon", name: "Amazon", code: "AMZ-2048", color: "#000000" },
  { slug: "shein", name: "SHEIN", code: "SHN-3072", color: "#000000" },
  { slug: "trendyol", name: "TrendYol", code: "TRL-4096", color: "#FF6900" },
  { slug: "temu", name: "TEMU", code: "TMU-5120", color: "#FB7701" },
  {
    slug: "local-products",
    name: "Local Products",
    code: "LPR-6144",
    color: "#16A34A",
    arabicLabel: "منتجات محلية",
  },
  {
    slug: "discounts",
    name: "Discounts",
    code: "DSC-7168",
    color: "#7C3AED",
    arabicLabel: "تخفيضات وعروض",
  },
];

function LogoManagementPage() {
  const [logos, setLogos] = useState<LogoItem[]>(INITIAL_LOGOS);
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    code: "",
    slug: "",
    color: "#2563EB",
    arabicLabel: "",
  });
  const [notice, setNotice] = useState("");

  const selectedCount = selectedForDelete.length;
  const pageTitle = useMemo(
    () => `Logo Management - ${logos.length} Square Images`,
    [logos.length],
  );

  const toggleEdit = () => {
    setEditMode((current) => !current);
    setDeleteMode(false);
    setSelectedForDelete([]);
    setNotice("");
  };

  const startDelete = () => {
    if (deleteMode) {
      if (!selectedCount) {
        setDeleteMode(false);
        return;
      }
      const confirmed = window.confirm(`حذف ${selectedCount} من الشعارات المحددة؟`);
      if (confirmed) {
        setLogos((current) => current.filter((logo) => !selectedForDelete.includes(logo.slug)));
        setNotice("تم حذف الشعارات المحددة من العرض الحالي.");
      }
      setDeleteMode(false);
      setSelectedForDelete([]);
      setEditMode(false);
      return;
    }
    setDeleteMode(true);
    setEditMode(false);
    setSelectedForDelete([]);
    setNotice("حدد الشعارات التي تريد حذفها، ثم اضغط حذف مرة أخرى.");
  };

  const updateLogo = (slug: string, key: "name" | "code", value: string) => {
    setLogos((current) =>
      current.map((logo) => (logo.slug === slug ? { ...logo, [key]: value } : logo)),
    );
  };

  const createLogo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = draft.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!draft.name.trim() || !draft.code.trim() || !slug) return;
    if (
      logos.some(
        (logo) => logo.slug === slug || logo.code.toLowerCase() === draft.code.trim().toLowerCase(),
      )
    ) {
      setNotice("الاسم المختصر أو الكود مستخدم بالفعل.");
      return;
    }
    setLogos((current) => [
      ...current,
      {
        slug,
        name: draft.name.trim(),
        code: draft.code.trim(),
        color: draft.color,
        ...(draft.arabicLabel.trim() ? { arabicLabel: draft.arabicLabel.trim() } : {}),
      },
    ]);
    setDraft({ name: "", code: "", slug: "", color: "#2563EB", arabicLabel: "" });
    setAddOpen(false);
    setNotice("أُضيف الشعار إلى العرض الحالي.");
  };

  return (
    <AdminRouteGuard>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-10"
      >
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="text-right">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                إدارة المتاجر
              </p>
              <h1
                dir="ltr"
                className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"
              >
                {pageTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                إدارة بوابات المتاجر والشعارات وروابط صفحات المنتجات.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleEdit}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 ${editMode ? "bg-slate-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {editMode ? <Check className="size-4" /> : <Pencil className="size-4" />}
                {editMode ? "تم" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(true);
                  setEditMode(false);
                  setDeleteMode(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                <Plus className="size-4" /> Add
              </button>
              <button
                type="button"
                onClick={startDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700"
              >
                {deleteMode ? <Check className="size-4" /> : <Trash2 className="size-4" />}
                {deleteMode ? (selectedCount ? `Delete (${selectedCount})` : "Cancel") : "Delete"}
              </button>
            </div>
          </header>

          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
            >
              <span>{notice}</span>
              <button type="button" aria-label="إغلاق التنبيه" onClick={() => setNotice("")}>
                <X className="size-4" />
              </button>
            </div>
          )}

          <section
            aria-label="الشعارات"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {logos.map((logo) => {
              const card = (
                <article
                  className={`group relative h-full rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-2xl ${selectedForDelete.includes(logo.slug) ? "border-red-400 ring-2 ring-red-100" : "border-slate-200 hover:border-blue-200"}`}
                >
                  {deleteMode && (
                    <label className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-xs font-bold text-red-700 shadow">
                      <input
                        aria-label={`تحديد ${logo.name} للحذف`}
                        type="checkbox"
                        checked={selectedForDelete.includes(logo.slug)}
                        onChange={(event) =>
                          setSelectedForDelete((current) =>
                            event.target.checked
                              ? [...current, logo.slug]
                              : current.filter((slug) => slug !== logo.slug),
                          )
                        }
                      />{" "}
                      حذف
                    </label>
                  )}
                  <div className="mx-auto flex aspect-square w-full max-w-[250px] items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div
                      className="flex aspect-square w-full items-center justify-center rounded-xl p-4 text-center text-white shadow-inner"
                      style={{ backgroundColor: logo.color }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ImagePlus aria-hidden="true" className="size-8 opacity-80" />
                        <span
                          dir="ltr"
                          className="break-words text-xl font-black leading-tight tracking-tight sm:text-2xl"
                        >
                          {logo.name}
                        </span>
                        {logo.arabicLabel && (
                          <span className="text-sm font-bold">{logo.arabicLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {editMode ? (
                    <div className="mt-4 space-y-2" onClick={(event) => event.preventDefault()}>
                      <label className="block text-xs font-bold text-slate-500">
                        اسم المتجر
                        <input
                          value={logo.name}
                          onChange={(event) => updateLogo(logo.slug, "name", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-500">
                        الكود
                        <input
                          value={logo.code}
                          onChange={(event) => updateLogo(logo.slug, "code", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="mt-4 text-center">
                      <p dir="ltr" className="font-black text-slate-900">
                        {logo.code}
                      </p>
                      <p dir="ltr" className="mt-1 break-all text-xs text-slate-500">
                        /logos/{logo.slug}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        صفحة المنتجات: /admin/logos/{logo.slug}
                      </p>
                    </div>
                  )}
                </article>
              );
              return deleteMode ? (
                <div key={logo.slug}>{card}</div>
              ) : (
                <Link
                  key={logo.slug}
                  to={`/admin/logos/${logo.slug}` as any}
                  aria-label={`فتح منتجات ${logo.name}`}
                  className="block h-full rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                >
                  {card}
                </Link>
              );
            })}
          </section>

          {addOpen && (
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setAddOpen(false);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-logo-title"
                dir="rtl"
                className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 id="add-logo-title" className="text-xl font-black">
                    إضافة متجر أو شعار
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="إغلاق"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <form onSubmit={createLogo} className="space-y-4">
                  <label className="block text-sm font-bold">
                    اسم المتجر
                    <input
                      required
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    الكود
                    <input
                      required
                      value={draft.code}
                      onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                      placeholder="NEW-8192"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    المسار المختصر
                    <input
                      required
                      value={draft.slug}
                      onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                      placeholder="store-name"
                      dir="ltr"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    لون الشعار
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        type="color"
                        value={draft.color}
                        onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                        className="h-11 w-16 rounded-lg border border-slate-200 p-1"
                      />
                      <span dir="ltr" className="text-sm text-slate-500">
                        {draft.color}
                      </span>
                    </div>
                  </label>
                  <label className="block text-sm font-bold">
                    اسم عربي اختياري
                    <input
                      value={draft.arabicLabel}
                      onChange={(event) => setDraft({ ...draft, arabicLabel: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>
                  <div className="flex justify-start gap-2 pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700"
                    >
                      <Plus className="size-4" /> Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          <div className="mt-8 flex justify-start">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" /> العودة إلى الإدارة
            </Link>
          </div>
        </div>
      </main>
    </AdminRouteGuard>
  );
}

export const Route = createFileRoute("/admin/logos/")({ component: LogoManagementPage });
