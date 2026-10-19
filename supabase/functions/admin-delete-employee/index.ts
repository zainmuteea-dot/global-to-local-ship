import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "يلزم تسجيل الدخول." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Required Supabase function environment variables are missing.");
    return json(500, { error: "إعداد دالة الحذف غير مكتمل على الخادم." });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "جلسة الدخول غير صالحة." });

  const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
    _user_id: authData.user.id,
    _role: "admin",
  });
  if (roleError) {
    console.error("Admin role check failed:", roleError.message);
    return json(500, { error: "تعذر التحقق من صلاحيات المدير." });
  }
  if (isAdmin !== true) return json(403, { error: "الحذف متاح للمدير فقط." });

  let userId: unknown;
  try {
    ({ userId } = await req.json());
  } catch {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }
  if (
    typeof userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
  ) {
    return json(400, { error: "معرّف المستخدم غير صالح." });
  }
  if (userId === authData.user.id)
    return json(400, { error: "لا يمكن حذف حساب المدير الذي يستخدم الصفحة." });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: targetRoles, error: targetRoleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (targetRoleError) {
    console.error("Target role lookup failed:", targetRoleError.message);
    return json(500, { error: "تعذر قراءة أدوار الحساب قبل الحذف." });
  }
  if (!targetRoles?.length) return json(404, { error: "الحساب غير موجود ضمن الموظفين." });

  if (targetRoles.some((row) => row.role === "admin")) {
    return json(409, {
      error:
        "لا يُحذف حساب المدير مباشرة. غيّر دوره إلى موظف أولاً؛ قاعدة البيانات تمنع خفض آخر مدير.",
    });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId, false);
  if (deleteError) {
    console.error("Auth user deletion failed:", deleteError.message);
    return json(500, { error: "فشل حذف حساب المستخدم من نظام الدخول." });
  }

  return json(200, { success: true });
});
