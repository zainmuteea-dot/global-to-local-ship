/*
# Create orders table for the السوق الشامل platform

## Purpose
Stores customer orders for the proxy shopping service. Customers (unauthenticated) place orders;
employees (authenticated via Supabase Auth) manage them through the admin dashboard.

## New Tables

### orders
- `id` (uuid, PK, auto-generated)
- `tracking_code` (text, unique, not null) — short code customers use to track their shipment (e.g. "SC-XXXXXX")
- `customer_name` (text, not null) — full name of the customer
- `phone` (text, not null) — customer phone number in international format (e.g. +967 7XXXXXXXX)
- `product_link` (text, not null) — URL of the product from TEMU/SHEIN/Amazon/etc.
- `product_name` (text) — optional product title extracted from the link
- `status` (text, not null, default 'جديد') — order status: جديد، تم التواصل، تم الشراء، تم الشحن، وصل، ملغي
- `notes` (text) — admin notes about the order
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now()) — last status change timestamp

## Security (RLS)

- **INSERT**: Allow `anon, authenticated` — customers place orders without signing in.
- **SELECT**: Allow `authenticated` only — only logged-in employees can see orders.
- **UPDATE**: Allow `authenticated` only — only employees can change order status.
- **DELETE**: Allow `authenticated` only — employees can remove orders.

## Important Notes

1. The app uses Supabase Auth for EMPLOYEE login only (email/password). Customers do not have accounts.
2. An anon-key client (no sign-in) can INSERT orders but cannot SELECT them — this is intentional.
3. Employees must sign in at /admin to see and manage orders.
4. A trigger auto-generates tracking_code if not provided.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text UNIQUE NOT NULL DEFAULT ('SC-' || lpad(floor(random() * 1000000)::text, 6, '0')),
  customer_name text NOT NULL,
  phone text NOT NULL,
  product_link text NOT NULL,
  product_name text,
  status text NOT NULL DEFAULT 'جديد',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone (customers) to place orders
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated employees can view orders
DROP POLICY IF EXISTS "auth_select_orders" ON orders;
CREATE POLICY "auth_select_orders" ON orders FOR SELECT
  TO authenticated USING (true);

-- Only authenticated employees can update orders
DROP POLICY IF EXISTS "auth_update_orders" ON orders;
CREATE POLICY "auth_update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated employees can delete orders
DROP POLICY IF EXISTS "auth_delete_orders" ON orders;
CREATE POLICY "auth_delete_orders" ON orders FOR DELETE
  TO authenticated USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_tracking_code_idx ON orders (tracking_code);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
