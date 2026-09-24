CREATE OR REPLACE FUNCTION public.track_order(_code text, _phone text)
RETURNS TABLE(tracking_code text, status text, customer_phone text, product_name text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.tracking_code, o.status, o.phone AS customer_phone, o.product_name, o.created_at, o.updated_at
  FROM public.orders AS o
  WHERE o.tracking_code = upper(trim(_code))
    AND regexp_replace(o.phone, '\\D', '', 'g') = regexp_replace(_phone, '\\D', '', 'g')
$$;
GRANT EXECUTE ON FUNCTION public.track_order(text,text) TO anon, authenticated;