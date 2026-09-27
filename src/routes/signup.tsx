import { supabase } from "@/integrations/supabase/client";

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!fullName.trim() || fullName.trim().length < 3) {
    setError("يرجى إدخال الاسم الكامل (3 أحرف على الأقل)");
    return;
  }
  if (!phone.trim()) {
    setError("يرجى إدخال رقم الهاتف أو الواتساب");
    return;
  }
  if (!email.trim() || !email.includes("@")) {
    setError("يرجى إدخال بريد إلكتروني صحيح");
    return;
  }
  if (!password || password.length < 6) {
    setError("كلمة المرور يجب أن لا تقل عن 6 خانات");
    return;
  }

  setLoading(true);

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
    }

    navigate({ to: "/account-success" });
  } catch (err: any) {
    setError(err?.message || "حدث خطأ أثناء إنشاء الحساب");
  } finally {
    setLoading(false);
  }
};
