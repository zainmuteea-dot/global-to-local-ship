-- صورة وألوان حرة لبطاقات العروض. آمن للتشغيل أكثر من مرة، ولا يفعل شيئًا إذا لم يوجد الجدول.
ALTER TABLE IF EXISTS public.storefront_offer_cards
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS bg_color text,
  ADD COLUMN IF NOT EXISTS bg_color_2 text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS accent_color text;

DO $$
BEGIN
  IF to_regclass('public.storefront_offer_cards') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'storefront_offer_cards_colors_hex') THEN
    ALTER TABLE public.storefront_offer_cards
      ADD CONSTRAINT storefront_offer_cards_colors_hex CHECK (
        (bg_color IS NULL OR bg_color ~ '^#[0-9A-Fa-f]{6}$')
        AND (bg_color_2 IS NULL OR bg_color_2 ~ '^#[0-9A-Fa-f]{6}$')
        AND (text_color IS NULL OR text_color ~ '^#[0-9A-Fa-f]{6}$')
        AND (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'storefront_offer_cards_image_https') THEN
    ALTER TABLE public.storefront_offer_cards
      ADD CONSTRAINT storefront_offer_cards_image_https CHECK (image_url IS NULL OR image_url ~ '^https://');
  END IF;
END $$;