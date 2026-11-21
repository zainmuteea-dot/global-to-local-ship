-- Reinstall the public best-seller RPC and refresh PostgREST's schema cache.
-- This is safe to apply when the original migration was missed or the API cache is stale.
CREATE OR REPLACE FUNCTION public.marketplace_get_best_selling_products(_limit integer DEFAULT 12)
RETURNS TABLE (product_id uuid, store_id uuid, title text, image_path text, price numeric, currency text, quantity_sold bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.store_id, p.title, p.image_path, p.price, p.currency, sum(o.quantity)::bigint AS quantity_sold
  FROM public.merchant_orders AS o
  JOIN public.merchant_products AS p ON p.id = o.product_id AND p.store_id = o.store_id
  JOIN public.merchant_stores AS s ON s.id = p.store_id
  WHERE o.status = 'delivered' AND p.status = 'approved' AND s.status = 'active'
  GROUP BY p.id, p.store_id, p.title, p.image_path, p.price, p.currency
  ORDER BY sum(o.quantity) DESC, p.title ASC, p.id ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 12), 1), 50);
$$;
REVOKE ALL ON FUNCTION public.marketplace_get_best_selling_products(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_get_best_selling_products(integer) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
