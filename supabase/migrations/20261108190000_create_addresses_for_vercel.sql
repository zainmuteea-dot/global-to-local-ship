-- Safe migration for Vercel's external Supabase database.
-- PREPARED ONLY: this file has NOT been executed against any database.
-- Target: first verify this is the Supabase project used by Vercel.
-- The deployed Vercel bundle observed during diagnosis used project ref:
-- wviryamcttjppbodqaal
--
-- Step 1 (read-only preflight): run this SELECT first in the target project's SQL Editor.
-- If addresses already exists, review its columns and policies before running Step 2.

SELECT
  to_regclass('public.addresses') AS addresses_table,
  (
    SELECT json_agg(
      json_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable,
        'column_default', column_default
      ) ORDER BY ordinal_position
    )
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses'
  ) AS address_columns,
  (
    SELECT json_agg(
      json_build_object(
        'policy_name', policyname,
        'command', cmd,
        'roles', roles,
        'using', qual,
        'with_check', with_check
      ) ORDER BY policyname
    )
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'addresses'
  ) AS address_policies;

-- Step 2 (schema change): run only after confirming the target project and reviewing
-- the preflight output. This creates the expected table if absent, enables RLS,
-- grants authenticated users table-level CRUD privileges (still constrained by RLS),
-- and adds an owner-only policy. It does not insert or delete customer data.

BEGIN;

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'المنزل',
  city text NOT NULL,
  details text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_created_at_idx
  ON public.addresses (user_id, created_at DESC);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

-- Use a dedicated policy name so this migration does not replace an unknown policy.
-- The policy allows authenticated users to read/write only rows whose user_id is their auth.uid().
DROP POLICY IF EXISTS addresses_owner_access_v1 ON public.addresses;
CREATE POLICY addresses_owner_access_v1
  ON public.addresses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ask PostgREST to refresh its schema cache so the API can discover the new table.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Step 3 (read-only verification): after Step 2 commits, run:
-- SELECT to_regclass('public.addresses') AS addresses_table,
--        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.addresses'::regclass) AS rls_enabled;
-- Confirm addresses_table is public.addresses and rls_enabled is true.
-- Then retry saving an address on the Vercel site while signed in.
