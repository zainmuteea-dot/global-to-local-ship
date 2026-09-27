import { supabase } from "@/integrations/supabase/client";

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!email.trim() || !email.includes("@")) {
    setError("يرجى إدخال بريد إلكتروني صحيح");
    return;
  }
  if (!password) {
    setError("يرجى إدخال كلمة المرور");
    return;
  }

  setLoading(true);

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (signInError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    navigate({ to: "/my-account" });
  } catch (err: any) {
    setError("تعذر تسجيل الدخول، يرجى المحاولة لاحقاً");
  } finally {
    setLoading(false);
  }
};
