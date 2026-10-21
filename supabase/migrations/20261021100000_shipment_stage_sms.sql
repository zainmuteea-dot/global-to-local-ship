-- Standalone migration: per-stage SMS audit and deduplication.
-- Apply only after confirming public.orders exists in the target production project.
CREATE TABLE IF NOT EXISTS public.shipment_stage_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_code text NOT NULL CHECK (stage_code IN (
    'new', 'payment_review', 'purchased', 'international_warehouse',
    'international_transit', 'customs_local', 'out_for_delivery', 'delivered'
  )),
  sms_status text NOT NULL DEFAULT 'sending'
    CHECK (sms_status IN ('sending', 'accepted', 'failed', 'unknown')),
  sms_attempt_count integer NOT NULL DEFAULT 1 CHECK (sms_attempt_count >= 1),
  sms_error text,
  sms_provider_response jsonb,
  sms_provider_batch_id text,
  sms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_stage_sms_order_stage_unique UNIQUE (order_id, stage_code)
);

CREATE INDEX IF NOT EXISTS shipment_stage_sms_order_updated_idx
  ON public.shipment_stage_sms (order_id, updated_at DESC);

ALTER TABLE public.shipment_stage_sms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipment_stage_sms FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.shipment_stage_sms FROM authenticated;
GRANT SELECT ON public.shipment_stage_sms TO authenticated;
GRANT ALL ON public.shipment_stage_sms TO service_role;

DROP POLICY IF EXISTS "Staff read shipment stage SMS" ON public.shipment_stage_sms;
CREATE POLICY "Staff read shipment stage SMS"
ON public.shipment_stage_sms FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE OR REPLACE FUNCTION public.set_shipment_stage_sms_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS shipment_stage_sms_updated_at ON public.shipment_stage_sms;
CREATE TRIGGER shipment_stage_sms_updated_at
BEFORE UPDATE ON public.shipment_stage_sms
FOR EACH ROW EXECUTE FUNCTION public.set_shipment_stage_sms_updated_at();
