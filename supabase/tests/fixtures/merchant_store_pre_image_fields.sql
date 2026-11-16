-- Minimal pre-migration schema for the isolated store-image migration test.
-- This file lives under supabase/tests/fixtures and is copied to a temporary
-- Supabase project by scripts/test-store-image-migration.sh. It is never a
-- deployable application migration.
CREATE TABLE public.merchant_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  contact_phone text NOT NULL,
  city text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_stores ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.merchant_stores FROM anon, authenticated;
GRANT SELECT (id, name, description, contact_phone, city, status, created_at)
  ON public.merchant_stores TO anon, authenticated;
GRANT UPDATE (name, description, contact_phone, city)
  ON public.merchant_stores TO authenticated;

CREATE POLICY merchant_stores_public_read
  ON public.merchant_stores FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY merchant_stores_owner_read
  ON public.merchant_stores FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY merchant_stores_owner_update
  ON public.merchant_stores FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND status = 'active')
  WITH CHECK (owner_id = auth.uid());

CREATE FUNCTION public.merchant_get_my_store()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  contact_phone text,
  city text,
  status text,
  commission_rate numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.name, s.description, s.contact_phone, s.city, s.status,
         s.commission_rate, s.created_at
  FROM public.merchant_stores AS s
  WHERE s.owner_id = auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.merchant_get_my_store() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_store() TO authenticated;


-- Minimal marketplace tables used by the isolated best-seller RPC test.
CREATE TABLE public.merchant_products (
  id uuid PRIMARY KEY, store_id uuid NOT NULL REFERENCES public.merchant_stores(id),
  title text NOT NULL, price numeric(12,2) NOT NULL, currency text NOT NULL,
  image_path text NOT NULL, status text NOT NULL
);
CREATE TABLE public.merchant_orders (
  id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES public.merchant_products(id),
  store_id uuid NOT NULL REFERENCES public.merchant_stores(id), quantity integer NOT NULL, status text NOT NULL,
  customer_name text NOT NULL DEFAULT 'private customer', customer_phone text NOT NULL DEFAULT '700000000'
);
ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.merchant_products, public.merchant_orders FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-product-images', 'merchant-product-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;
