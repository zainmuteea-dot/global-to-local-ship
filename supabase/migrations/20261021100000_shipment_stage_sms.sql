-- Manual migration for shipment-stage tracking, notification history and SMS audit.
-- This is prepared only. Compare with the exact Supabase production schema before applying.
-- It is independent of the existing send-sms function and does not send messages.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS courier_phone text;

CREATE TABLE IF NOT EXISTS public.shipment_notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_code text NOT NULL CHECK (stage_code IN (
    'new', 'payment_review', 'purchased', 'international_warehouse',
    'international_transit', 'customs_local', 'out_for_delivery', 'delivered'
  )),
  channel text NOT NULL CHECK (channel IN ('app', 'whatsapp')),
  delivery_state text NOT NULL CHECK (delivery_state IN ('created', 'prepared', 'no_account')),
  event_type text NOT NULL CHECK (event_type IN ('stage', 'reminder')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_notification_events_order_created_idx
  ON public.shipment_notification_events (order_id, created_at DESC);
ALTER TABLE public.shipment_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipment_notification_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.shipment_notification_events FROM authenticated;
GRANT SELECT ON public.shipment_notification_events TO authenticated;
GRANT ALL ON public.shipment_notification_events TO service_role;
DROP POLICY IF EXISTS "Staff read shipment notification events" ON public.shipment_notification_events;
CREATE POLICY "Staff read shipment notification events"
ON public.shipment_notification_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Keep staff authorization server-side; browser clients cannot write stage history directly.
CREATE OR REPLACE FUNCTION public.admin_set_shipment_stage(
  _order_id uuid,
  _stage_code text,
  _action text,
  _channel text,
  _message text,
  _courier_name text DEFAULT NULL,
  _courier_phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_current_rank integer;
  v_requested_rank integer;
  v_delivery_state text;
  v_event_type text;
  v_stage_codes text[] := ARRAY[
    'new','payment_review','purchased','international_warehouse',
    'international_transit','customs_local','out_for_delivery','delivered'
  ];
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _stage_code IS NULL OR NOT (_stage_code = ANY(v_stage_codes)) THEN
    RAISE EXCEPTION 'invalid_stage';
  END IF;
  IF _action NOT IN ('advance','notify') OR _channel NOT IN ('app','whatsapp') THEN
    RAISE EXCEPTION 'invalid_action_or_channel';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 OR length(_message) > 4000 THEN
    RAISE EXCEPTION 'invalid_message';
  END IF;
  IF _action = 'advance' AND _stage_code = 'out_for_delivery'
     AND (nullif(trim(coalesce(_courier_name,'')), '') IS NULL
          OR nullif(trim(coalesce(_courier_phone,'')), '') IS NULL) THEN
    RAISE EXCEPTION 'courier_required';
  END IF;

  SELECT user_id, status INTO v_user_id, v_status
  FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0002'; END IF;

  v_current_rank := CASE lower(trim(coalesce(v_status,'')))
    WHEN 'new' THEN 0 WHEN 'accepted' THEN 0 WHEN 'جديد' THEN 0 WHEN 'قيد المراجعة' THEN 0
    WHEN 'payment_review' THEN 1 WHEN 'reviewing' THEN 1 WHEN 'pricing' THEN 1 WHEN 'priced_waiting_pay' THEN 1 WHEN 'تدقيق مالي' THEN 1 WHEN 'قيد التسعير' THEN 1
    WHEN 'purchased' THEN 2 WHEN 'processing' THEN 2 WHEN 'تم الشراء' THEN 2 WHEN 'قيد الشراء والتجهيز' THEN 2
    WHEN 'international_warehouse' THEN 3 WHEN 'warehouse_china' THEN 3 WHEN 'المستودع الدولي' THEN 3
    WHEN 'international_transit' THEN 4 WHEN 'international_ship' THEN 4 WHEN 'shipped' THEN 4 WHEN 'شحن دولي' THEN 4
    WHEN 'customs_local' THEN 5 WHEN 'local_warehouse' THEN 5 WHEN 'الفرز والتوصيل' THEN 5
    WHEN 'out_for_delivery' THEN 6
    WHEN 'delivered' THEN 7 WHEN 'تم التسليم' THEN 7
    ELSE -1 END;
  v_requested_rank := array_position(v_stage_codes, _stage_code) - 1;

  IF _action = 'advance' THEN
    IF v_current_rank < 0 OR v_requested_rank <= v_current_rank THEN
      RAISE EXCEPTION 'stage_must_advance';
    END IF;
    UPDATE public.orders
    SET status = _stage_code,
        courier_name = CASE WHEN _stage_code = 'out_for_delivery' THEN nullif(trim(coalesce(_courier_name,'')), '') ELSE courier_name END,
        courier_phone = CASE WHEN _stage_code = 'out_for_delivery' THEN nullif(trim(coalesce(_courier_phone,'')), '') ELSE courier_phone END
    WHERE id = _order_id;
  END IF;

  v_event_type := CASE WHEN _action = 'advance' THEN 'stage' ELSE 'reminder' END;
  IF _channel = 'whatsapp' THEN
    v_delivery_state := 'prepared';
  ELSIF v_user_id IS NULL THEN
    v_delivery_state := 'no_account';
  ELSE
    INSERT INTO public.notifications(user_id, title, body)
    VALUES (v_user_id, 'تحديث حالة الطلب', _message);
    v_delivery_state := 'created';
  END IF;

  INSERT INTO public.shipment_notification_events
    (order_id, stage_code, channel, delivery_state, event_type, message)
  VALUES
    (_order_id, _stage_code, _channel, v_delivery_state, v_event_type, _message);

  RETURN jsonb_build_object('notification_state', v_delivery_state, 'event_type', v_event_type);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_shipment_stage(uuid,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_shipment_stage(uuid,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_shipment_notification_history(_order_id uuid)
RETURNS TABLE (
  id uuid, stage_code text, channel text, delivery_state text,
  event_type text, message text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT e.id, e.stage_code, e.channel, e.delivery_state, e.event_type, e.message, e.created_at
  FROM public.shipment_notification_events e
  WHERE e.order_id = _order_id
  ORDER BY e.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_shipment_notification_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_shipment_notification_history(uuid) TO authenticated;

-- One SMS audit row per order and stage prevents duplicate sends after acceptance.
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
