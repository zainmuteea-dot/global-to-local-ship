-- فواتير المبيعات: تطبيق finance/manage للتعديل وfinance/delete للحذف.
-- شغّل هذا الترحيل يدويًا في Supabase الإنتاج بعد مراجعة RLS.
-- لا ينشئ جداول ولا يحذف بيانات. لا يغير صلاحية إصدار الفواتير أو القراءة.
-- فحص تمهيدي: يوقف الترحيل إذا لم تكن البنية المطلوبة موجودة.
DO $preflight$
BEGIN
  IF to_regclass('public.sales_invoices') IS NULL THEN
    RAISE EXCEPTION 'Missing public.sales_invoices; no changes applied';
  END IF;
  IF to_regclass('public.employee_permissions') IS NULL THEN
    RAISE EXCEPTION 'Missing public.employee_permissions; no changes applied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_permissions'
      AND column_name = 'user_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_permissions'
      AND column_name = 'permissions'
  ) THEN
    RAISE EXCEPTION 'employee_permissions is missing expected columns; no changes applied';
  END IF;
  IF to_regprocedure('public.current_user_has_permission(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Missing public.current_user_has_permission(text,text); no changes applied';
  END IF;
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Missing expected public.has_role(uuid,public.app_role); no changes applied';
  END IF;
END;
$preflight$;

BEGIN;

-- الدالة العامة الحالية تمنح الموظف غير المخصص صلاحيات ماليات ضمنية.
-- نقصر هذا السلوك على الماليات فقط: المدير يحتفظ بصلاحيته، والموظف يجب
-- أن يملك سجل employee_permissions وصلاحية finance المحددة صراحة.
CREATE OR REPLACE FUNCTION public.current_user_has_permission(_area text, _action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_permissions jsonb;
  v_area jsonb;
  v_value jsonb;
begin
  if auth.uid() is null then return false; end if;

  if _area = 'employees' then
    if _action not in ('create', 'delete') then return false; end if;
  elsif _area in ('orders', 'shipping', 'customers', 'notifications', 'finance', 'inventory', 'settings') then
    if _action not in ('view', 'manage', 'delete') then return false; end if;
  else
    return false;
  end if;

  select ep.permissions into v_permissions
  from public.employee_permissions ep
  where ep.user_id = auth.uid();

  if not found then
    if _area = 'employees' then
      return public.has_role(auth.uid(), 'admin'::public.app_role);
    end if;
    -- الحسابات غير المخصصة لا تحصل على وصول مالي ضمني إلا للمدير.
    if _area = 'finance' then
      return public.has_role(auth.uid(), 'admin'::public.app_role);
    end if;
    return public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'staff'::public.app_role);
  end if;

  v_area := v_permissions -> _area;
  if jsonb_typeof(v_area) <> 'object' then return false; end if;
  v_value := v_area -> _action;
  return jsonb_typeof(v_value) = 'boolean' and v_value = 'true'::jsonb;
end;
$function$;

-- فعّل RLS حتى تكون السياسات نافذة على طلبات PostgREST العادية.
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

-- اسم السياسة الحالية مؤكد من نتيجة pg_policies التي أرسلها المستخدم.
DROP POLICY IF EXISTS sales_invoices_admin_update ON public.sales_invoices;
CREATE POLICY sales_invoices_admin_update
  ON public.sales_invoices
  FOR UPDATE
  TO authenticated
  USING (public.current_user_has_permission('finance', 'manage'))
  WITH CHECK (public.current_user_has_permission('finance', 'manage'));

DROP POLICY IF EXISTS sales_invoices_admin_delete ON public.sales_invoices;
CREATE POLICY sales_invoices_admin_delete
  ON public.sales_invoices
  FOR DELETE
  TO authenticated
  USING (public.current_user_has_permission('finance', 'delete'));

-- منح صلاحية الجدول فقط لكي تصل الطلبات إلى RLS؛ الصفوف تظل محكومة بالسياسات أعلاه.
GRANT UPDATE, DELETE ON TABLE public.sales_invoices TO authenticated;

COMMIT;

-- تحقق بعد التنفيذ: يجب أن تكون سياسة UPDATE واحدة بالشرط manage،
-- وسياسة DELETE واحدة بالشرط delete. احتفظ بسياسات SELECT وINSERT كما هي.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sales_invoices'
ORDER BY policyname;


-- تحقق من تفعيل RLS على الجدول (يجب أن تكون relrowsecurity = true).
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'sales_invoices';
