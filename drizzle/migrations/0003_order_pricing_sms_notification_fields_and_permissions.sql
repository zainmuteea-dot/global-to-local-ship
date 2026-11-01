-- Additive fields the app already reads/writes.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS total_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS total_cost_sar numeric,
  ADD COLUMN IF NOT EXISTS total_cost_yer numeric,
  ADD COLUMN IF NOT EXISTS quote_currency text,
  ADD COLUMN IF NOT EXISTS original_currency text,
  ADD COLUMN IF NOT EXISTS sms_status text,
  ADD COLUMN IF NOT EXISTS sms_error text,
  ADD COLUMN IF NOT EXISTS sms_attempt_count integer,
  ADD COLUMN IF NOT EXISTS sms_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_provider_batch_id text,
  ADD COLUMN IF NOT EXISTS sms_provider_response jsonb;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS payment_id uuid;

-- RLS still limits notification writes to admin/staff.
GRANT INSERT (message, type, payment_id) ON public.notifications TO authenticated;
GRANT UPDATE (message, type, payment_id) ON public.notifications TO authenticated;

-- Permission check used by the admin UI and the admin-delete-employee function.
-- Admins may do everything; staff may view/manage operational areas only;
-- creating or deleting accounts and changing settings stay admin-only.
CREATE OR REPLACE FUNCTION public.current_user_has_permission(_area text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN true
    WHEN public.has_role(auth.uid(), 'staff'::public.app_role) THEN
      _action IN ('view', 'manage')
      AND _area IN ('orders', 'shipping', 'customers', 'notifications', 'finance', 'inventory')
    ELSE false
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_permission(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_permission(text, text) TO authenticated;