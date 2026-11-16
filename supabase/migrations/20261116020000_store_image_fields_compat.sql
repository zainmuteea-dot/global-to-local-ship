-- Ensure merchant storefront image fields and their owner-only write permissions
-- exist even if the earlier optional merchandising migration was not applied.
ALTER TABLE public.merchant_stores
  ADD COLUMN IF NOT EXISTS store_image_path text,
  ADD COLUMN IF NOT EXISTS store_image_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS store_image_position text NOT NULL DEFAULT 'center';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'merchant_stores_store_image_fit_check'
      AND conrelid = 'public.merchant_stores'::regclass
  ) THEN
    ALTER TABLE public.merchant_stores
      ADD CONSTRAINT merchant_stores_store_image_fit_check
      CHECK (store_image_fit IN ('cover', 'contain'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'merchant_stores_store_image_position_check'
      AND conrelid = 'public.merchant_stores'::regclass
  ) THEN
    ALTER TABLE public.merchant_stores
      ADD CONSTRAINT merchant_stores_store_image_position_check
      CHECK (store_image_position IN ('left', 'center', 'right'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'merchant_stores_store_image_path_check'
      AND conrelid = 'public.merchant_stores'::regclass
  ) THEN
    ALTER TABLE public.merchant_stores
      ADD CONSTRAINT merchant_stores_store_image_path_check
      CHECK (store_image_path IS NULL OR store_image_path LIKE id::text || '/%');
  END IF;
END
$$;

-- Preserve existing profile grants while explicitly enabling the image settings
-- read by the storefront and updated by the store owner.
GRANT SELECT (id, name, description, contact_phone, city, status, created_at,
              store_image_path, store_image_fit, store_image_position)
  ON public.merchant_stores TO anon, authenticated;
GRANT UPDATE (name, description, contact_phone, city,
              store_image_path, store_image_fit, store_image_position)
  ON public.merchant_stores TO authenticated;

-- Refresh the RPC result shape; PostgreSQL requires dropping the old OUT signature
-- before changing its returned columns. The function remains owner-scoped.
DROP FUNCTION IF EXISTS public.merchant_get_my_store();
CREATE FUNCTION public.merchant_get_my_store()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  contact_phone text,
  city text,
  status text,
  commission_rate numeric,
  created_at timestamptz,
  store_image_path text,
  store_image_fit text,
  store_image_position text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.name, s.description, s.contact_phone, s.city, s.status,
         s.commission_rate, s.created_at, s.store_image_path,
         s.store_image_fit, s.store_image_position
  FROM public.merchant_stores AS s
  WHERE s.owner_id = auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.merchant_get_my_store() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_store() TO authenticated;

-- Allow the existing private bucket's signed-image reads for active storefronts.
DROP POLICY IF EXISTS merchant_store_images_public_read ON storage.objects;
CREATE POLICY merchant_store_images_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'merchant-product-images'
    AND EXISTS (
      SELECT 1
      FROM public.merchant_stores AS s
      WHERE s.store_image_path = storage.objects.name
        AND s.status = 'active'
    )
  );
