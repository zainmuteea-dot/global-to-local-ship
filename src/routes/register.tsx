import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, UserRound } from "lucide-react";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "إنشاء الحساب — السوق الشامل" },
      { name: "description", content: "أخبرنا باسمك لنكمل إنشاء حسابك في السوق الشامل." },
      { property: "og:title", content: "إنشاء الحساب — السوق الشامل" },
      { property: "og:description", content: "أخبرنا باسمك لنكمل إنشاء حسابك في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("sc_verified")) {
      navigate({ to: "/login" });
      return;
    }
    setName(localStorage.getItem("sc_name") ?? "");
  }, [navigate]);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("أدخل اسمك لإكمال إنشاء الحساب");
      return;
    }
    localStorage.setItem("sc_name", trimmed);
    localStorage.setItem("sc_logged_in", "1");
    navigate({ to: "/my-account" });
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button
            onClick={() => navigate({ to: "/verify" })}
            className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
            aria-label="رجوع"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-sm">
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">خطوة أخيرة!</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">أخبرنا باسمك لنكمل إنشاء حسابك بنجاح.</p>

          <label className="mt-6 flex items-center gap-1.5 text-sm font-bold text-cocoa">
            <UserRound className="size-4" /> الاسم
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) submit();
            }}
            placeholder="اكتب اسمك هنا"
            className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 text-lg text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
          />
          {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}

          <button
            onClick={submit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream"
          >
            إنشاء الحساب <UserPlus className="size-5" />
          </button>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            بالاستمرار فإنك توافق على
            <br />
            <span className="font-bold text-cocoa">شروط الاستخدام وسياسة الخصوصية</span>
          </p>
        </div>
      </div>
    </div>
  );
}
