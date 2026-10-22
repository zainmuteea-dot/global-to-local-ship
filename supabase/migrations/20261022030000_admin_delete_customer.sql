-- Admin-only permanent deletion for a customer account and its orders/financial records.
-- Review the production schema and take a backup before running this migration.

CREATE TABLE IF NOT EXISTS public.customer_delete_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_delete_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_delete_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.customer_delete_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_customer_records(_target_user_id uuid)
RETURNS TABLE(job_id uuid, deleted_orders integer, deleted_payments integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_phone text;
  v_phone_digits text;
  v_phone_is_unique boolean := false;
  v_job_id uuid;
  v_deleted_orders integer := 0;
  v_deleted_payments integer := 0;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_role(v_caller_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_only' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL OR _target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'invalid_target' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _target_user_id AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'cannot_delete_admin' USING ERRCODE = '42501';
  END IF;

  SELECT p.phone INTO v_phone
  FROM public.profiles p
  WHERE p.id = _target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_phone_digits := regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  IF v_phone_digits <> '' THEN
    SELECT count(*) = 1 INTO v_phone_is_unique
    FROM public.profiles p
    WHERE regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_phone_digits;
  END IF;

  INSERT INTO public.customer_delete_jobs(target_user_id, created_by)
  VALUES (_target_user_id, v_caller_id)
  ON CONFLICT (target_user_id) DO UPDATE SET created_by = EXCLUDED.created_by
  RETURNING id INTO v_job_id;

  -- Delete orders explicitly associated with this account. Also include legacy
  -- guest orders by phone only when that phone belongs to exactly one profile.
  WITH deleted AS (
    DELETE FROM public.orders o
    WHERE o.user_id = _target_user_id
       OR (
         v_phone_is_unique
         AND o.user_id IS NULL
         AND regexp_replace(coalesce(nullif(trim(o.customer_phone), ''), o.phone, ''), '[^0-9]', '', 'g') = v_phone_digits
       )
    RETURNING o.tracking_code
  ), tracked AS (
    SELECT tracking_code FROM deleted WHERE tracking_code IS NOT NULL
  ), payment_delete AS (
    DELETE FROM public.payments p
    WHERE p.user_id = _target_user_id
       OR (
         p.user_id IS NULL
         AND p.tracking_code IN (SELECT tracking_code FROM tracked)
       )
       OR (
         v_phone_is_unique
         AND p.user_id IS NULL
         AND regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_phone_digits
       )
    RETURNING p.id
  )
  SELECT (SELECT count(*)::integer FROM deleted),
         (SELECT count(*)::integer FROM payment_delete)
  INTO v_deleted_orders, v_deleted_payments;

  DELETE FROM public.wallet_transactions WHERE user_id = _target_user_id;
  DELETE FROM public.notifications WHERE user_id = _target_user_id;
  DELETE FROM public.addresses WHERE user_id = _target_user_id;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;

  RETURN QUERY SELECT v_job_id, v_deleted_orders, v_deleted_payments;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_customer_records(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer_records(uuid) TO authenticated, service_role;

COMMENT ON TABLE public.customer_delete_jobs IS
  'Temporary recovery records for two-phase customer deletion; remove after Auth deletion succeeds.';
COMMENT ON FUNCTION public.admin_delete_customer_records(uuid) IS
  'Admin-only transactional deletion of orders, matching payments, and wallet transactions. The caller then deletes the Auth user server-side.';
