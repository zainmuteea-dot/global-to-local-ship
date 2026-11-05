-- Adds customer-facing card width and height settings for storefront_offer_cards.
-- Safe to run more than once. It does not change rows, RLS, or existing policies.
BEGIN;

ALTER TABLE public.storefront_offer_cards
  ADD COLUMN IF NOT EXISTS card_width_px integer NOT NULL DEFAULT 520,
  ADD COLUMN IF NOT EXISTS card_height_px integer NOT NULL DEFAULT 300;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.storefront_offer_cards'::regclass
      AND conname = 'storefront_offer_cards_card_width_px_range_check'
  ) THEN
    ALTER TABLE public.storefront_offer_cards
      ADD CONSTRAINT storefront_offer_cards_card_width_px_range_check
      CHECK (card_width_px BETWEEN 240 AND 1600);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.storefront_offer_cards'::regclass
      AND conname = 'storefront_offer_cards_card_height_px_range_check'
  ) THEN
    ALTER TABLE public.storefront_offer_cards
      ADD CONSTRAINT storefront_offer_cards_card_height_px_range_check
      CHECK (card_height_px BETWEEN 220 AND 900);
  END IF;
END $$;

COMMIT;
