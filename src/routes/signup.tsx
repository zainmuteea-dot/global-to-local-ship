import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم لازم 3 أحرف على الأقل"),
  phone: z.string().trim().regex(/^7\d{8}$/, "رقم الجوال لازم يبدأ بـ 7 ويكون 9 أرقام"),
  password: z.string().regex(/^\d{6}$/, "كلمة المرور لازم 6 أرقام فقط"),
});

type SignupForm = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/signup")({
  component: Signup,
})

function Signup() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (data: SignupForm) => {
    localStorage.setItem("user", JSON.stringify(data));
    navigate({ to: "/login" })
  };

  return (
    <div dir="rtl" className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">إنشاء حساب جديد</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("fullName")}
            placeholder="الاسم الكامل"
            className="w-full border rounded-lg p-3"
          />
          {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <input
            {...register("phone")}
            placeholder="رقم الجوال (7xxxxxxxx)"
            dir="ltr"
            className="w-full border rounded-lg p-3 text-left"
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="كلمة المرور (6 أرقام)"
            dir="ltr"
            className="w-full border rounded-lg p-3 text-left"
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" className="w-full bg-green-600 text-white rounded-lg p-3 font-bold">
          تسجيل
        </button>
      </form>

      <p className="text-center mt-4 text-sm">
        عندك حساب؟ <Link to="/login" className="text-blue-600 font-bold">سجل الدخول</Link>
      </p>
    </div>
  )
}
