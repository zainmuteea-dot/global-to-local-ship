BEGIN;
SELECT plan(36);

-- Schema, constraints, and effective column/function grants from the migration.
SELECT has_column('public', 'merchant_stores', 'store_image_path', 'adds store image path');
SELECT has_column('public', 'merchant_stores', 'store_image_fit', 'adds store image fit');
SELECT has_column('public', 'merchant_stores', 'store_image_position', 'adds store image position');
SELECT ok((
  SELECT is_nullable = 'NO'
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'merchant_stores'
    AND column_name = 'store_image_fit'
), 'store image fit is non-null');
SELECT ok((
  SELECT is_nullable = 'NO'
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'merchant_stores'
    AND column_name = 'store_image_position'
), 'store image position is non-null');
SELECT ok((
  SELECT column_default LIKE '%cover%'
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'merchant_stores'
    AND column_name = 'store_image_fit'
), 'store image fit defaults to cover');
SELECT ok((
  SELECT column_default LIKE '%center%'
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'merchant_stores'
    AND column_name = 'store_image_position'
), 'store image position defaults to center');
SELECT ok(has_column_privilege('anon', 'public.merchant_stores', 'store_image_path', 'SELECT'), 'anon can read the display path');
SELECT ok(has_column_privilege('anon', 'public.merchant_stores', 'store_image_fit', 'SELECT'), 'anon can read the display fit');
SELECT ok(has_column_privilege('anon', 'public.merchant_stores', 'store_image_position', 'SELECT'), 'anon can read the display position');
SELECT ok(has_column_privilege('authenticated', 'public.merchant_stores', 'store_image_path', 'SELECT'), 'authenticated can read the display path');
SELECT ok(has_column_privilege('authenticated', 'public.merchant_stores', 'store_image_fit', 'SELECT'), 'authenticated can read the display fit');
SELECT ok(has_column_privilege('authenticated', 'public.merchant_stores', 'store_image_position', 'SELECT'), 'authenticated can read the display position');
SELECT ok(has_column_privilege('authenticated', 'public.merchant_stores', 'store_image_path', 'UPDATE'), 'authenticated can update the display path');
SELECT ok(has_column_privilege('authenticated', 'public.merchant_stores', 'store_image_fit', 'UPDATE'), 'authenticated can update the display fit');
SELECT ok(has_column_privilege('authenticated', 'public.merchant_stores', 'store_image_position', 'UPDATE'), 'authenticated can update the display position');
SELECT ok(NOT has_column_privilege('authenticated', 'public.merchant_stores', 'owner_id', 'UPDATE'), 'authenticated cannot change store ownership');
SELECT ok(NOT has_column_privilege('anon', 'public.merchant_stores', 'store_image_path', 'UPDATE'), 'anon cannot update store images');
SELECT ok(has_function_privilege('authenticated', 'public.merchant_get_my_store()', 'EXECUTE'), 'authenticated can call the own-store RPC');
SELECT ok(NOT has_function_privilege('anon', 'public.merchant_get_my_store()', 'EXECUTE'), 'anon cannot call the own-store RPC');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'public.merchant_stores'::regclass
    AND conname = 'merchant_stores_store_image_fit_check'
), 'fit values are constrained');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'public.merchant_stores'::regclass
    AND conname = 'merchant_stores_store_image_position_check'
), 'position values are constrained');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'public.merchant_stores'::regclass
    AND conname = 'merchant_stores_store_image_path_check'
), 'image paths are scoped to their store');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'merchant_store_images_public_read'
    AND cmd = 'SELECT'
    AND roles @> ARRAY['anon'::name, 'authenticated'::name]
    AND qual ILIKE '%store_image_path%'
    AND qual ILIKE '%active%'
), 'storage read policy is limited to active store images');

-- Synthetic identities and stores are transaction-scoped and never touch real accounts.
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'store-image-owner-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'store-image-owner-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'store-image-owner-c@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.merchant_stores (
  id, owner_id, name, contact_phone, status, store_image_path
) VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Test active store A', '700000001', 'active', '00000000-0000-4000-8000-000000000201/logo.webp'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', 'Test active store B', '700000002', 'active', '00000000-0000-4000-8000-000000000202/logo.webp'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000103', 'Test suspended store', '700000003', 'suspended', '00000000-0000-4000-8000-000000000203/logo.webp');

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('merchant-product-images', '00000000-0000-4000-8000-000000000201/logo.webp'),
  ('merchant-product-images', '00000000-0000-4000-8000-000000000202/logo.webp'),
  ('merchant-product-images', '00000000-0000-4000-8000-000000000203/logo.webp');

-- Anonymous reads must remain restricted to active stores and their images.
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.merchant_stores WHERE id IN (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000203'
)), 2::bigint, 'anonymous readers see only active test stores');
SELECT is((SELECT count(*) FROM public.merchant_stores WHERE id = '00000000-0000-4000-8000-000000000203'), 0::bigint, 'anonymous readers cannot see a suspended store');
SELECT is((SELECT count(*) FROM storage.objects WHERE name IN (
  '00000000-0000-4000-8000-000000000201/logo.webp',
  '00000000-0000-4000-8000-000000000202/logo.webp',
  '00000000-0000-4000-8000-000000000203/logo.webp'
)), 2::bigint, 'anonymous readers see images for active stores');
SELECT is((SELECT count(*) FROM storage.objects WHERE name = '00000000-0000-4000-8000-000000000203/logo.webp'), 0::bigint, 'anonymous readers cannot see a suspended store image');
RESET ROLE;

-- Authenticated owner can update only their own active store and the RPC stays owner-scoped.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
SET LOCAL ROLE authenticated;
SELECT is((
  WITH changed AS (
    UPDATE public.merchant_stores
    SET store_image_path = '00000000-0000-4000-8000-000000000201/new-logo.webp',
        store_image_fit = 'contain',
        store_image_position = 'right'
    WHERE id = '00000000-0000-4000-8000-000000000201'
    RETURNING 1
  ) SELECT count(*) FROM changed
), 1::bigint, 'store owner can update their image settings');
SELECT is((SELECT store_image_path FROM public.merchant_stores WHERE id = '00000000-0000-4000-8000-000000000201'), '00000000-0000-4000-8000-000000000201/new-logo.webp', 'updated image path is saved');
SELECT throws_ok($$UPDATE public.merchant_stores SET store_image_path = 'wrong-folder/logo.webp' WHERE id = '00000000-0000-4000-8000-000000000201'$$, '23514', NULL, 'rejects a path outside the store folder');
SELECT throws_ok($$UPDATE public.merchant_stores SET store_image_fit = 'stretch' WHERE id = '00000000-0000-4000-8000-000000000201'$$, '23514', NULL, 'rejects an unsupported image fit');
SELECT throws_ok($$UPDATE public.merchant_stores SET store_image_position = 'top' WHERE id = '00000000-0000-4000-8000-000000000201'$$, '23514', NULL, 'rejects an unsupported image position');
SELECT is((
  WITH changed AS (
    UPDATE public.merchant_stores
    SET store_image_fit = 'contain'
    WHERE id = '00000000-0000-4000-8000-000000000202'
    RETURNING 1
  ) SELECT count(*) FROM changed
), 0::bigint, 'store owner cannot update another active store');
SELECT is((SELECT count(*) FROM public.merchant_get_my_store()), 1::bigint, 'own-store RPC returns one owned store');
SELECT is((SELECT id FROM public.merchant_get_my_store()), '00000000-0000-4000-8000-000000000201'::uuid, 'own-store RPC does not disclose another store');

SELECT * FROM finish();
ROLLBACK;
