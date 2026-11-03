-- Manual migration for the admin/offers image upload and product category field.
-- Review the target Supabase project before running. This script is not run from chat.

-- Preflight: confirm public.products exists and review its current columns.
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'public.products does not exist in this database; stop and confirm the correct Supabase project.';
  END IF;
END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_category_allowed_values'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_allowed_values
      CHECK (category IS NULL OR category IN ('electronics', 'office_supplies', 'hookah_supplies', 'other'));
  END IF;
END $$;

-- Create a public bucket only if it does not exist. Do not change the visibility
-- of an existing bucket automatically; inspect it first if this bucket already exists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

SELECT id, name, public FROM storage.buckets WHERE id = 'product-images';

-- Only users with the admin role may upload/manage files in this bucket.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'product_images_admin_upload'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY product_images_admin_upload
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'product-images'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'product_images_admin_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY product_images_admin_update
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'product-images'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
      WITH CHECK (
        bucket_id = 'product-images'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'product_images_admin_delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY product_images_admin_delete
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'product-images'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    $policy$;
  END IF;
END $$;
