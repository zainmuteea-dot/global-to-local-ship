import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;
function json(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

async function fetchAll<T>(
  makeQuery: (from: number, to: number) => any,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0;; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function listCustomers(adminClient: SupabaseClient) {
  const [profiles, roles, orders] = await Promise.all([
    fetchAll<any>((from, to) =>
      adminClient.from("profiles")
        .select("id,full_name,phone,created_at")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      adminClient.from("user_roles")
        .select("user_id,role")
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      adminClient.from("orders")
        .select(
          "id,user_id,tracking_code,status,created_at,customer_name,phone,customer_phone,total_cost_usd,total_cost_yer,total_cost_sar,paid_amount,remaining_amount,profit_amount,quote_currency,original_currency",
        )
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
  ]);

  const staffIds = new Set(
    roles
      .filter((row) => row.role === "admin" || row.role === "staff")
      .map((row) => row.user_id),
  );
  const customers = profiles.filter((profile) => !staffIds.has(profile.id));
  const profilesByPhone = new Map<string, string[]>();
  for (const profile of customers) {
    const phone = normalizePhone(profile.phone);
    if (!phone) continue;
    profilesByPhone.set(phone, [
      ...(profilesByPhone.get(phone) ?? []),
      profile.id,
    ]);
  }

  const ordersByUser = new Map<string, any[]>();
  for (const order of orders) {
    let ownerId: string | null = order.user_id && !staffIds.has(order.user_id)
      ? order.user_id
      : null;
    if (!ownerId) {
      const possibleOwners = new Set<string>();
      for (const candidate of [order.customer_phone, order.phone]) {
        const phone = normalizePhone(candidate);
        if (!phone) continue;
        for (const id of profilesByPhone.get(phone) ?? []) {
          possibleOwners.add(id);
        }
      }
      if (possibleOwners.size === 1) ownerId = [...possibleOwners][0];
    }
    if (!ownerId) continue;
    const group = ordersByUser.get(ownerId) ?? [];
    group.push(order);
    ordersByUser.set(ownerId, group);
  }

  return customers.map((profile) => ({
    ...profile,
    orders: (ordersByUser.get(profile.id) ?? []).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

async function finishAuthDeletion(adminClient: SupabaseClient, userId: string) {
  const { data, error: lookupError } = await adminClient.auth.admin.getUserById(
    userId,
  );
  if (lookupError && lookupError.status !== 404) throw lookupError;
  if (data?.user) {
    const { error } = await adminClient.auth.admin.deleteUser(userId, false);
    if (error) throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "استخدم POST فقط." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "يلزم تسجيل الدخول." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error(
      "admin-customers is missing required server environment configuration.",
    );
    return json(500, {
      error: "إعداد دالة إدارة العملاء غير مكتمل على الخادم.",
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth
    .getUser();
  if (authError || !authData.user) {
    return json(401, { error: "جلسة الدخول غير صالحة." });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [adminRole, staffRole] = await Promise.all([
    callerClient.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    }),
    callerClient.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "staff",
    }),
  ]);
  if (adminRole.error || staffRole.error) {
    console.error(
      "Customer role check failed:",
      adminRole.error?.message ?? staffRole.error?.message,
    );
    return json(500, { error: "تعذر التحقق من صلاحيات إدارة العملاء." });
  }
  const isAdmin = adminRole.data === true;
  const isStaff = staffRole.data === true;

  if (body?.action === "list") {
    if (!isAdmin && !isStaff) {
      return json(403, { error: "عرض العملاء متاح للمدير والموظفين فقط." });
    }
    try {
      const customers = await listCustomers(adminClient);
      return json(200, { success: true, canDelete: isAdmin, customers });
    } catch (error) {
      console.error(
        "Customer list query failed:",
        error instanceof Error ? error.message : "unknown error",
      );
      return json(500, {
        error:
          "تعذر قراءة الحسابات والطلبات. تحقق من توافق مخطط قاعدة الإنتاج مع الدالة.",
      });
    }
  }

  if (body?.action === "delete") {
    if (!isAdmin) return json(403, { error: "حذف العميل متاح للمدير فقط." });
    const userId = body.userId;
    if (!isUuid(userId)) return json(400, { error: "معرّف العميل غير صالح." });
    if (userId === authData.user.id) {
      return json(400, { error: "لا يمكن حذف حساب المدير الذي يستخدم الصفحة." });
    }

    const { data: targetRoles, error: targetRoleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (targetRoleError) {
      console.error(
        "Target customer role lookup failed:",
        targetRoleError.message,
      );
      return json(500, { error: "تعذر التحقق من أدوار الحساب المستهدف." });
    }
    if (targetRoles?.some((row) => row.role === "admin")) {
      return json(409, { error: "لا يمكن حذف حساب مدير من صفحة العملاء." });
    }

    const { data: pendingJob, error: pendingJobError } = await adminClient
      .from("customer_delete_jobs")
      .select("id")
      .eq("target_user_id", userId)
      .maybeSingle();
    if (pendingJobError) {
      console.error(
        "Pending customer deletion lookup failed:",
        pendingJobError.message,
      );
      return json(500, { error: "تعذر التحقق من عملية حذف سابقة." });
    }
    if (pendingJob) {
      try {
        await finishAuthDeletion(adminClient, userId);
        const { error } = await adminClient.from("customer_delete_jobs")
          .delete().eq("id", pendingJob.id);
        if (error) throw error;
        return json(200, { success: true, resumed: true });
      } catch (error) {
        console.error(
          "Retrying pending customer deletion failed:",
          error instanceof Error ? error.message : "unknown error",
        );
        return json(200, {
          success: false,
          cleanupPending: true,
          jobId: pendingJob.id,
          error:
            "سجلات العميل حُذفت مسبقًا، لكن حذف حساب الدخول ما زال يحتاج استكمالًا.",
        });
      }
    }

    const { data: jobRows, error: cleanupError } = await callerClient.rpc(
      "admin_delete_customer_records",
      { _target_user_id: userId },
    );
    if (cleanupError) {
      console.error("Customer data cleanup RPC failed:", cleanupError.message);
      return json(500, {
        error:
          "تعذر حذف سجلات العميل. تحقق من تطبيق ترحيل الحذف على قاعدة الإنتاج الصحيحة.",
      });
    }
    const job = Array.isArray(jobRows) ? jobRows[0] : jobRows;
    if (!job?.job_id) {
      return json(500, { error: "لم تُنشأ عملية استكمال الحذف." });
    }

    try {
      await finishAuthDeletion(adminClient, userId);
      const { error: jobDeleteError } = await adminClient
        .from("customer_delete_jobs")
        .delete()
        .eq("id", job.job_id);
      if (jobDeleteError) throw jobDeleteError;
      return json(200, {
        success: true,
        deletedOrders: Number(job.deleted_orders ?? 0),
        deletedPayments: Number(job.deleted_payments ?? 0),
      });
    } catch (error) {
      console.error(
        "Customer Auth deletion needs recovery:",
        error instanceof Error ? error.message : "unknown error",
      );
      return json(200, {
        success: false,
        cleanupPending: true,
        jobId: job.job_id,
        error:
          "حُذفت سجلات الطلبات والمالية، لكن حذف حساب الدخول لم يكتمل. استخدم زر استكمال الحذف.",
      });
    }
  }

  if (body?.action === "resume") {
    if (!isAdmin) {
      return json(403, { error: "استكمال حذف العميل متاح للمدير فقط." });
    }
    if (!isUuid(body.jobId)) {
      return json(400, { error: "رقم عملية الاستكمال غير صالح." });
    }
    const { data: job, error: jobError } = await adminClient
      .from("customer_delete_jobs")
      .select("id,target_user_id")
      .eq("id", body.jobId)
      .maybeSingle();
    if (jobError) {
      console.error("Customer deletion job lookup failed:", jobError.message);
      return json(500, { error: "تعذر قراءة عملية استكمال الحذف." });
    }
    if (!job) {
      return json(404, { error: "عملية الاستكمال غير موجودة أو اكتملت مسبقًا." });
    }
    try {
      await finishAuthDeletion(adminClient, job.target_user_id);
      const { error } = await adminClient.from("customer_delete_jobs").delete()
        .eq("id", job.id);
      if (error) throw error;
      return json(200, { success: true });
    } catch (error) {
      console.error(
        "Resuming customer deletion failed:",
        error instanceof Error ? error.message : "unknown error",
      );
      return json(500, {
        success: false,
        error:
          "لا يزال حذف حساب الدخول غير مكتمل. أعد المحاولة أو راجع مسؤول Supabase.",
      });
    }
  }

  return json(400, { error: "الإجراء غير معروف." });
});
