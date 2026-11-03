-- Adds optional brand and description fields used by the offer admin form
-- and customer offer cards. Review the target Supabase project before applying.
DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'public.products does not exist in this database; confirm the correct Supabase project before applying this migration.';
  END IF;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS description text;
