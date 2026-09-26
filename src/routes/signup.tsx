import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Lock, Phone, UserRound } from "lucide-react";

const BRAND = "السوق الشامل";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب جديد — السوق الشامل" },
      { name: "description", content: "أنشئ حسابك الجديد برقم الهاتف في السوق الشامل وسيط الشراء العالمي." },
      { property: "og:title", content: "إنشاء حساب جديد — السوق الشامل" },
      { property: "og:description", content: "أنشئ حسابك الجديد برقم الهاتف في السوق الشامل وسيط الشراء العالمي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().trim().regex(/^7\d{8}$/, "رقم الجوال يجب أن يبدأ بـ 7 ويكون 9 أرقام"),
  password: z.string().regex(/^\d{6}$/, "كلمة المرور يجب أن تتكون من 6 أرقام فقط"),
});

type SignupFormData = z.infer<typeof signupSchema>;

function SignupPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = (data: SignupFormData) => {
    // حفظ بيانات المستخدم محلياً
    localStorage.setItem("user", JSON.stringify(data));
    // التوجيه إلى صفحة تسجيل الدخول
    navigate({ to: "/login" });
  };

  const inputClass =
    "w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa transition";

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        {/* الشريط العلوي */}
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border transition hover:bg-muted"
            aria-label="رجوع للرئيسية"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        {/* بطاقة التسجيل */}
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h1 className="text-center font-display text-2xl font-black text-cocoadeep">إنشاء حساب جديد</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">أدخل بياناتك للتسجيل والمتابعة برقم الهاتف</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* الاسم الكامل */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-cocoa">
                <UserRound className="size-4" /> الاسم الكامل
              </label>
              <input
                {...register("fullName")}
                type="text"
                placeholder="مثال: محمد عبدالله"
                className={`mt-2 ${inputClass}`}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs font-bold text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            {/* رقم الجوال */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-cocoa">
                <Phone className="size-4" /> رقم الجوال (اليمن)
              </label>
              <div className="mt-2 flex items-stretch gap-2">
                <span className="grid shrink-0 place-items-center rounded-2xl bg-secondary px-3.5 text-xs font-bold text-clay">
                  +967
                </span>
                <input
                  {...register("phone")}
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="7XXXXXXXX"
                  maxLength={9}
                  className={`${inputClass} tracking-widest text-left`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs font-bold text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-cocoa">
                <Lock className="size-4" /> كلمة المرور (6 أرقام)
              </label>
              <input
                {...register("password")}
                type="password"
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                placeholder="******"
                className={`mt-2 ${inputClass} tracking-widest text-left`}
              />
              {errors.password && (
                <p className="mt-1 text-xs font-bold text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* زر التسجيل */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="font-bold text-cocoa underline underline-offset-4">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
