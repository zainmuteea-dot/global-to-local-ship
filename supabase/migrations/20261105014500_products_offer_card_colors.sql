-- Product card appearance settings for admin-managed offers.
-- Run only on the Supabase project used by the deployed app.
BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bg_color text,
  ADD COLUMN IF NOT EXISTS bg_color_2 text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS accent_color text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_bg_color_hex_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_bg_color_hex_check
      CHECK (bg_color IS NULL OR bg_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_bg_color_2_hex_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_bg_color_2_hex_check
      CHECK (bg_color_2 IS NULL OR bg_color_2 ~ '^#[0-9A-Fa-f]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_text_color_hex_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_text_color_hex_check
      CHECK (text_color IS NULL OR text_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_accent_color_hex_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_accent_color_hex_check
      CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

COMMIT;
