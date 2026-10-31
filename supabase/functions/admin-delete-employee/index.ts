import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

function json(status: number, body: JsonRecord): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "يلزم تسجيل الدخول بحساب إداري." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error(
      "admin-delete-employee: required server configuration is missing.",
    );
    return json(500, { error: "إعداد دالة الحذف غير مكتمل على الخادم." });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth
    .getUser();
  if (authError || !authData.user) {
    return json(401, { error: "جلسة الدخول غير صالحة. سجّل الدخول مجددًا." });
  }

  const { data: mayDeleteEmployees, error: permissionError } =
    await callerClient.rpc(
      "current_user_has_permission",
      { _area: "employees", _action: "delete" },
    );
  if (permissionError) {
    console.error("admin-delete-employee: permission verification failed.");
    return json(500, { error: "تعذر التحقق من صلاحية حذف الحسابات." });
  }
  if (mayDeleteEmployees !== true) {
    return json(403, { error: "لا تملك صلاحية حذف حسابات الموظفين." });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }
  const rawUserId = (body as Record<string, unknown>).userId;
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(userId)
  ) {
    return json(400, { error: "معرّف المستخدم غير صالح." });
  }
  if (userId === authData.user.id) {
    return json(400, { error: "لا يمكن حذف حساب المدير الذي يستخدم الصفحة." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: targetRoles, error: targetRoleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (targetRoleError) {
    console.error("admin-delete-employee: target role lookup failed.");
    return json(500, { error: "تعذر قراءة أدوار الحساب قبل الحذف." });
  }
  const targetIsEmployee = targetRoles?.some(
    (row) => row.role === "admin" || row.role === "staff",
  );
  if (!targetIsEmployee) {
    return json(404, { error: "الحساب غير موجود ضمن الموظفين." });
  }

  const targetIsAdmin = targetRoles.some((row) => row.role === "admin");
  if (targetIsAdmin) {
    // Deleting another admin is more privileged than deleting a staff account.
    // Require the caller to be an admin in addition to employees/delete.
    const { data: callerIsAdmin, error: callerRoleError } = await callerClient
      .rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });
    if (callerRoleError) {
      console.error("admin-delete-employee: caller admin-role check failed.");
      return json(500, { error: "تعذر التحقق من صلاحية حذف حساب مشرف." });
    }
    if (callerIsAdmin !== true) {
      return json(403, { error: "حذف حساب مشرف متاح للمشرفين فقط." });
    }

    const { count, error: adminCountError } = await adminClient
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (adminCountError || count === null) {
      console.error(
        "admin-delete-employee: could not verify remaining admin count.",
      );
      return json(500, {
        error: "تعذر التحقق من عدد المشرفين. لم يُحذف الحساب.",
      });
    }
    if (count <= 1) {
      return json(409, { error: "لا يمكن حذف آخر مشرف عام في النظام." });
    }
    // This count is only an early, user-friendly check. The database trigger
    // in migration 20261031234200_prevent_last_admin_deletion.sql serializes
    // role removal and is the authoritative concurrency-safe protection.
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    userId,
    false,
  );
  if (deleteError) {
    // PostgreSQL may return the trigger marker directly or Auth may wrap it.
    // Only report a definite last-admin denial when the marker is present;
    // otherwise ask the operator to verify before retrying.
    if (/LAST_ADMIN_PROTECTION/.test(deleteError.message)) {
      return json(409, { error: "لا يمكن حذف آخر مشرف عام في النظام." });
    }
    console.error("admin-delete-employee: Auth account deletion failed.");
    return json(500, {
      error: targetIsAdmin
        ? "تعذر تأكيد حذف حساب المشرف. حدّث القائمة وافحص سجلات Supabase قبل إعادة المحاولة."
        : "فشل حذف حساب المستخدم من نظام الدخول. تحقق من الحالة قبل إعادة المحاولة.",
    });
  }

  return json(200, { success: true });
});
