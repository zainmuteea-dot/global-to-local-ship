import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmployeeRole = "admin" | "staff";
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "استخدم POST فقط." });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "يلزم تسجيل الدخول بحساب إداري." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error(
      "admin-create-employee: required server configuration is missing.",
    );
    return json(500, {
      error: "إعداد دالة إنشاء الموظف غير مكتمل على الخادم.",
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth
    .getUser();
  if (authError || !authData.user) {
    return json(401, { error: "جلسة الدخول غير صالحة. سجّل الدخول مجددًا." });
  }

  const { data: mayCreateEmployees, error: permissionError } =
    await callerClient.rpc(
      "current_user_has_permission",
      { _area: "employees", _action: "create" },
    );
  if (permissionError) {
    console.error("admin-create-employee: permission verification failed.");
    return json(500, { error: "تعذر التحقق من صلاحية إضافة الحسابات." });
  }
  if (mayCreateEmployees !== true) {
    return json(403, { error: "لا تملك صلاحية إضافة حسابات الموظفين." });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "بيانات الطلب ليست JSON صالحًا." });
  }
  if (!isRecord(body)) {
    return json(400, { error: "بيانات الموظف غير صالحة." });
  }

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.fullName === "string"
    ? body.fullName.trim()
    : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const role = body.role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "أدخل بريدًا إلكترونيًا صحيحًا." });
  }
  if (password.length < 8 || password.length > 128) {
    return json(400, { error: "كلمة المرور يجب أن تكون بين 8 و128 حرفًا." });
  }
  if (!fullName || fullName.length > 120) {
    return json(400, { error: "الاسم مطلوب ويجب ألا يتجاوز 120 حرفًا." });
  }
  if (phone.length > 30) {
    return json(400, { error: "رقم الهاتف يجب ألا يتجاوز 30 حرفًا." });
  }
  if (role !== "admin" && role !== "staff") {
    return json(400, { error: "دور الموظف غير صالح." });
  }

  // Creating an admin account grants elevated access. A user may have the
  // employee-create permission without being allowed to create administrators.
  if (role === "admin") {
    const { data: callerIsAdmin, error: adminCheckError } = await callerClient
      .rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });
    if (adminCheckError) {
      console.error("admin-create-employee: admin-role verification failed.");
      return json(500, { error: "تعذر التحقق من صلاحية إنشاء مشرف." });
    }
    if (callerIsAdmin !== true) {
      return json(403, { error: "إنشاء حساب مشرف متاح للمشرفين فقط." });
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: created, error: createError } = await adminClient.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
      },
    });

  if (createError || !created.user) {
    const message = createError?.message ?? "unknown error";
    if (/already (been )?registered|already exists|duplicate/i.test(message)) {
      return json(409, { error: "يوجد حساب مسجل بهذا البريد الإلكتروني." });
    }
    console.error("admin-create-employee: Auth user creation failed.");
    return json(500, { error: "تعذر إنشاء حساب الموظف. راجع سجلات الدالة." });
  }

  const { error: roleInsertError } = await adminClient.from("user_roles")
    .insert({
      user_id: created.user.id,
      role: role as EmployeeRole,
    });

  if (roleInsertError) {
    // Compensate for a partial create: do not leave an unprivileged Auth user behind.
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(
      created.user.id,
    );
    if (rollbackError) {
      console.error(
        "admin-create-employee: role assignment and account rollback both failed.",
      );
      return json(500, {
        error:
          "تعذر تعيين دور الموظف، كما لم يكتمل حذف الحساب الجزئي. أوقف إعادة المحاولة وراجع مستخدم Auth وسجلات الدالة.",
      });
    }
    console.error(
      "admin-create-employee: role assignment failed; created account was rolled back.",
    );
    return json(500, {
      error: "تعذر تعيين دور الموظف. لم يُترك الحساب الجزئي.",
    });
  }

  return json(201, {
    success: true,
    user: {
      id: created.user.id,
      email: created.user.email,
      fullName,
      phone: phone || null,
      role,
    },
  });
});
