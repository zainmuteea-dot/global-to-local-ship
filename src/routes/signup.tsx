import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم الكامل مطلوب (3 أحرف على الأقل)"),
  phone: z.string().trim().regex(/^7\d{8}$/, "رقم الجوال يجب أن يكون 9 أرقام ويبدأ بالرقم 7"),
  password: z.string().regex(/^\d{6}$/, "كلمة المرور يجب أن تتكون من 6 أرقام بالضبط"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (d: SignupForm) => console.log("967" + d.phone, d);

  return (
    <div dir="rtl" className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">إنشاء حساب جديد</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input {...register("fullName")} placeholder="الاسم الكامل" className="w-full border rounded p-3" />
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <div className="flex gap-2">
            <span className="px-3 py-3 bg-gray-100 rounded border">967+</span>
            <input {...register("phone")} placeholder="771234567" maxLength={9} inputMode="numeric" className="flex-1 border rounded p-3" />
          </div>
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <input {...register("password")} type="password" maxLength={6} inputMode="numeric" placeholder="كلمة المرور (6 أرقام)" className="w-full border rounded p-3" />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white rounded p-3 font-bold">تسجيل</button>
      </form>
    </div>
  );
}
