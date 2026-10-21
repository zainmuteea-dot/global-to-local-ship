-- SMS attempt tracking for orders. Idempotent: safe to run more than once.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sms_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS sms_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_provider_batch_id text,
  ADD COLUMN IF NOT EXISTS sms_error text,
  ADD COLUMN IF NOT EXISTS sms_provider_response jsonb;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_sms_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_sms_status_check
  CHECK (sms_status IN ('pending', 'sending', 'accepted', 'failed', 'unknown', 'delivered'));

CREATE INDEX IF NOT EXISTS orders_sms_status_idx ON public.orders (sms_status);
