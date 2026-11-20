-- Admin-only rename and safe deletion/archive for merchant marketplace records.
-- This migration never updates or deletes rows in public.merchant_orders.

CREATE OR REPLACE FUNCTION public.merchant_admin_rename_store(_store_id uuid, _name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(_name, ''))) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'invalid store name' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.merchant_stores WHERE id = _store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.merchant_stores
  SET name = btrim(_name), updated_at = now()
  WHERE id = _store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_admin_delete_product(_product_id uuid)
RETURNS TABLE(action text, image_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_image_path text;
  v_has_orders boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Locking the product serializes this decision with merchant_create_order,
  -- which also locks the product before inserting an order.
  SELECT p.image_path INTO v_image_path
  FROM public.merchant_products AS p
  WHERE p.id = _product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.merchant_orders AS o WHERE o.product_id = _product_id
  ) INTO v_has_orders;

  IF v_has_orders THEN
    UPDATE public.merchant_products
    SET status = 'archived', updated_at = now()
    WHERE id = _product_id;
    RETURN QUERY SELECT 'archived'::text, ARRAY[]::text[];
    RETURN;
  END IF;

  -- Protect against an order being created between the reference check and deletion.
  -- A foreign-key conflict rolls back only this block, then the product is archived.
  BEGIN
    DELETE FROM public.merchant_products WHERE id = _product_id;
  EXCEPTION WHEN foreign_key_violation THEN
    UPDATE public.merchant_products
    SET status = 'archived', updated_at = now()
    WHERE id = _product_id;
    RETURN QUERY SELECT 'archived'::text, ARRAY[]::text[];
    RETURN;
  END;

  RETURN QUERY SELECT 'deleted'::text,
    CASE WHEN v_image_path = '__no_image__' OR v_image_path LIKE '%/__no_image__'
      THEN ARRAY[]::text[] ELSE ARRAY[v_image_path]::text[] END;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_admin_delete_store(_store_id uuid)
RETURNS TABLE(action text, image_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_orders boolean;
  v_image_paths text[];
  v_store_image_path text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Lock products first in the same order as checkout (product, then store).
  -- This lets any in-flight checkout finish before the order reference check.
  PERFORM p.id
  FROM public.merchant_products AS p
  WHERE p.store_id = _store_id
  ORDER BY p.id
  FOR UPDATE;

  PERFORM 1 FROM public.merchant_stores AS s WHERE s.id = _store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.merchant_orders AS o WHERE o.store_id = _store_id
  ) INTO v_has_orders;

  IF v_has_orders THEN
    UPDATE public.merchant_stores
    SET status = 'suspended', updated_at = now()
    WHERE id = _store_id;
    RETURN QUERY SELECT 'archived'::text, ARRAY[]::text[];
    RETURN;
  END IF;

  SELECT s.store_image_path INTO v_store_image_path
  FROM public.merchant_stores AS s
  WHERE s.id = _store_id;

  SELECT coalesce(array_agg(p.image_path) FILTER (WHERE p.image_path <> '__no_image__' AND p.image_path NOT LIKE '%/__no_image__'), ARRAY[]::text[])
  INTO v_image_paths
  FROM public.merchant_products AS p
  WHERE p.store_id = _store_id;

  IF v_store_image_path IS NOT NULL THEN
    v_image_paths := array_append(v_image_paths, v_store_image_path);
  END IF;

  -- The orders foreign key remains the final safety check if a checkout races this call.
  BEGIN
    DELETE FROM public.merchant_stores WHERE id = _store_id;
  EXCEPTION WHEN foreign_key_violation THEN
    UPDATE public.merchant_stores
    SET status = 'suspended', updated_at = now()
    WHERE id = _store_id;
    RETURN QUERY SELECT 'archived'::text, ARRAY[]::text[];
    RETURN;
  END;

  RETURN QUERY SELECT 'deleted'::text, v_image_paths;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_admin_rename_store(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_admin_delete_product(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_admin_delete_store(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_admin_rename_store(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_admin_delete_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_admin_delete_store(uuid) TO authenticated;
