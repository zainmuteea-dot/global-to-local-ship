-- Optional merchant storefront identity and product merchandising fields.
ALTER TABLE public.merchant_stores
  ADD COLUMN IF NOT EXISTS store_image_path text,
  ADD COLUMN IF NOT EXISTS store_image_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS store_image_position text NOT NULL DEFAULT 'center';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='merchant_stores_store_image_fit_check' AND conrelid='public.merchant_stores'::regclass) THEN
    ALTER TABLE public.merchant_stores ADD CONSTRAINT merchant_stores_store_image_fit_check CHECK (store_image_fit IN ('cover','contain'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='merchant_stores_store_image_position_check' AND conrelid='public.merchant_stores'::regclass) THEN
    ALTER TABLE public.merchant_stores ADD CONSTRAINT merchant_stores_store_image_position_check CHECK (store_image_position IN ('left','center','right'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='merchant_stores_store_image_path_check' AND conrelid='public.merchant_stores'::regclass) THEN
    ALTER TABLE public.merchant_stores ADD CONSTRAINT merchant_stores_store_image_path_check CHECK (store_image_path IS NULL OR store_image_path LIKE id::text || '/%');
  END IF;
END $$;

ALTER TABLE public.merchant_products
  ADD COLUMN IF NOT EXISTS old_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_percent integer,
  ADD COLUMN IF NOT EXISTS sku text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='merchant_products_old_price_check' AND conrelid='public.merchant_products'::regclass) THEN
    ALTER TABLE public.merchant_products ADD CONSTRAINT merchant_products_old_price_check CHECK (old_price IS NULL OR old_price > price);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='merchant_products_discount_percent_check' AND conrelid='public.merchant_products'::regclass) THEN
    ALTER TABLE public.merchant_products ADD CONSTRAINT merchant_products_discount_percent_check CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 99);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='merchant_products_sku_check' AND conrelid='public.merchant_products'::regclass) THEN
    ALTER TABLE public.merchant_products ADD CONSTRAINT merchant_products_sku_check CHECK (sku IS NULL OR (char_length(btrim(sku)) BETWEEN 1 AND 80));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS merchant_products_store_sku_unique_idx
  ON public.merchant_products(store_id, lower(btrim(sku))) WHERE sku IS NOT NULL;

-- Keep access owner-scoped; public readers only receive the optional display fields.
GRANT SELECT (store_image_path,store_image_fit,store_image_position) ON public.merchant_stores TO anon,authenticated;
GRANT UPDATE (store_image_path,store_image_fit,store_image_position) ON public.merchant_stores TO authenticated;
GRANT SELECT (old_price,discount_percent,sku) ON public.merchant_products TO anon,authenticated;
GRANT INSERT (old_price,discount_percent,sku) ON public.merchant_products TO authenticated;
GRANT UPDATE (old_price,discount_percent,sku) ON public.merchant_products TO authenticated;

-- Store images use the existing private merchant image bucket and are readable only for active stores.
DROP POLICY IF EXISTS merchant_store_images_public_read ON storage.objects;
CREATE POLICY merchant_store_images_public_read ON storage.objects FOR SELECT TO anon,authenticated USING (
  bucket_id='merchant-product-images' AND EXISTS (
    SELECT 1 FROM public.merchant_stores s
    WHERE s.store_image_path=name AND s.status='active'
  )
);

-- Return store image display settings only through the merchant's own-store RPC.
DROP FUNCTION IF EXISTS public.merchant_get_my_store();
CREATE FUNCTION public.merchant_get_my_store() RETURNS TABLE(
  id uuid,name text,description text,contact_phone text,city text,status text,commission_rate numeric,created_at timestamptz,
  store_image_path text,store_image_fit text,store_image_position text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT s.id,s.name,s.description,s.contact_phone,s.city,s.status,s.commission_rate,s.created_at,
         s.store_image_path,s.store_image_fit,s.store_image_position
  FROM public.merchant_stores s WHERE s.owner_id=auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.merchant_get_my_store() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_store() TO authenticated;
