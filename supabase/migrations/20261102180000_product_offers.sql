ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_name text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_offer_type_allowed'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_offer_type_allowed
      CHECK (offer_type IN ('exclusive', 'deals', 'both', 'none'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_discount_percent_range'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_discount_percent_range
      CHECK (discount_percent BETWEEN 0 AND 100);
  END IF;
END $$;
