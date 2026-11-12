-- Merchant marketplace: store-scoped catalog, moderated listings and cash-on-delivery orders.
-- The merchant is identified by an admin-assigned store owner row; no client can grant itself access.

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = required_role
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(text) TO anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', existing_policy.policyname);
  END LOOP;
END;
$$;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, phone, city, created_at, shop_name, group_name, commission_group, currency, app_version)
  ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, full_name, phone, city) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, city) ON TABLE public.profiles TO authenticated;

CREATE POLICY profiles_select_self
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_self
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_select_staff
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'finance'::public.app_role)
    OR public.has_role(auth.uid(), 'orders_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'support'::public.app_role)
  );

CREATE TABLE public.merchant_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  contact_phone text NOT NULL CHECK (char_length(btrim(contact_phone)) BETWEEN 7 AND 24),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 80),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.1000 CHECK (commission_rate BETWEEN 0 AND 0.3000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.merchant_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.merchant_stores(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1200),
  category text NOT NULL DEFAULT '' CHECK (char_length(category) <= 60),
  price numeric(12,2) NOT NULL CHECK (price > 0),
  currency text NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
  stock integer NOT NULL DEFAULT 0 CHECK (stock BETWEEN 0 AND 1000000),
  image_path text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (image_path LIKE store_id::text || '/%')
);

CREATE INDEX merchant_products_public_idx
  ON public.merchant_products (status, created_at DESC);
CREATE INDEX merchant_products_store_idx
  ON public.merchant_products (store_id, status, created_at DESC);

CREATE TABLE public.merchant_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.merchant_stores(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.merchant_products(id) ON DELETE RESTRICT,
  product_title text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price > 0),
  currency text NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  commission_rate numeric(5,4) NOT NULL CHECK (commission_rate BETWEEN 0 AND 0.3000),
  total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0),
  commission_amount numeric(14,2) NOT NULL CHECK (commission_amount >= 0),
  seller_amount numeric(14,2) NOT NULL CHECK (seller_amount >= 0),
  payment_method text NOT NULL DEFAULT 'cash_on_delivery' CHECK (payment_method = 'cash_on_delivery'),
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 100),
  customer_phone text NOT NULL CHECK (char_length(btrim(customer_phone)) BETWEEN 7 AND 24),
  customer_city text NOT NULL CHECK (char_length(btrim(customer_city)) BETWEEN 2 AND 80),
  delivery_address text NOT NULL CHECK (char_length(btrim(delivery_address)) BETWEEN 5 AND 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX merchant_orders_store_idx ON public.merchant_orders (store_id, created_at DESC);
CREATE INDEX merchant_orders_customer_idx ON public.merchant_orders (customer_id, created_at DESC);

ALTER TABLE public.merchant_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.merchant_stores FROM anon, authenticated;
GRANT SELECT (id, name, description, contact_phone, city, status, created_at)
  ON TABLE public.merchant_stores TO anon, authenticated;
GRANT UPDATE (name, description, contact_phone, city)
  ON TABLE public.merchant_stores TO authenticated;

CREATE POLICY merchant_stores_public_read
  ON public.merchant_stores FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY merchant_stores_owner_read
  ON public.merchant_stores FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY merchant_stores_admin_read
  ON public.merchant_stores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY merchant_stores_owner_update
  ON public.merchant_stores FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND status = 'active')
  WITH CHECK (owner_id = auth.uid());

REVOKE ALL PRIVILEGES ON TABLE public.merchant_products FROM anon, authenticated;
GRANT SELECT (id, store_id, title, description, category, price, currency, stock, image_path, status, created_at, updated_at)
  ON TABLE public.merchant_products TO anon;
GRANT SELECT (id, store_id, title, description, category, price, currency, stock, image_path, status, review_note, created_at, updated_at)
  ON TABLE public.merchant_products TO authenticated;
GRANT INSERT (store_id, title, description, category, price, currency, stock, image_path)
  ON TABLE public.merchant_products TO authenticated;
GRANT UPDATE (title, description, category, price, currency, stock, image_path)
  ON TABLE public.merchant_products TO authenticated;

CREATE POLICY merchant_products_public_read
  ON public.merchant_products FOR SELECT TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id = store_id AND s.status = 'active'
    )
  );
CREATE POLICY merchant_products_owner_read
  ON public.merchant_products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
  );
CREATE POLICY merchant_products_admin_read
  ON public.merchant_products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY merchant_products_owner_insert
  ON public.merchant_products FOR INSERT TO authenticated
  WITH CHECK (
    status = 'draft'
    AND image_path LIKE store_id::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.status = 'active'
    )
  );
CREATE POLICY merchant_products_owner_update
  ON public.merchant_products FOR UPDATE TO authenticated
  USING (
    status IN ('draft', 'rejected', 'approved')
    AND EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.status = 'active'
    )
  )
  WITH CHECK (
    image_path LIKE store_id::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.merchant_product_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.image_path IS DISTINCT FROM OLD.image_path
  ) THEN
    NEW.status := 'pending_review';
    NEW.review_note := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER merchant_product_touch_trigger
  BEFORE UPDATE ON public.merchant_products
  FOR EACH ROW EXECUTE FUNCTION public.merchant_product_touch();

CREATE OR REPLACE FUNCTION public.merchant_admin_candidates(_search text DEFAULT '')
RETURNS TABLE(user_id uuid, full_name text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(_search, ''))) < 2 THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.id, coalesce(nullif(p.full_name, ''), 'عميل'), p.phone
    FROM public.profiles AS p
    WHERE (p.full_name ILIKE '%' || btrim(_search) || '%' OR p.phone ILIKE '%' || btrim(_search) || '%')
      AND NOT EXISTS (
        SELECT 1 FROM public.merchant_stores AS s WHERE s.owner_id = p.id
      )
    ORDER BY p.full_name NULLS LAST
    LIMIT 30;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_admin_create_store(
  _owner_id uuid,
  _name text,
  _contact_phone text,
  _city text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_store_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _owner_id) THEN
    RAISE EXCEPTION 'customer account not found' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(coalesce(_name, ''))) NOT BETWEEN 2 AND 100
     OR char_length(btrim(coalesce(_contact_phone, ''))) NOT BETWEEN 7 AND 24
     OR char_length(coalesce(_city, '')) > 80 THEN
    RAISE EXCEPTION 'invalid store details' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.merchant_stores (owner_id, name, contact_phone, city, created_by)
  VALUES (_owner_id, btrim(_name), btrim(_contact_phone), btrim(coalesce(_city, '')), auth.uid())
  RETURNING id INTO new_store_id;
  RETURN new_store_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_admin_list_stores()
RETURNS TABLE(
  id uuid,
  owner_id uuid,
  name text,
  contact_phone text,
  city text,
  status text,
  commission_rate numeric,
  created_at timestamptz,
  product_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.id, s.owner_id, s.name, s.contact_phone, s.city, s.status,
      s.commission_rate, s.created_at, count(p.id)
    FROM public.merchant_stores AS s
    LEFT JOIN public.merchant_products AS p ON p.store_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_get_my_store()
RETURNS TABLE(
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
  SELECT s.id, s.name, s.description, s.contact_phone, s.city,
    s.status, s.commission_rate, s.created_at
  FROM public.merchant_stores AS s
  WHERE s.owner_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.merchant_admin_set_store_terms(
  _store_id uuid,
  _status text,
  _commission_rate numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('active', 'suspended') OR _commission_rate NOT BETWEEN 0 AND 0.3000 THEN
    RAISE EXCEPTION 'invalid store terms' USING ERRCODE = '22023';
  END IF;
  UPDATE public.merchant_stores
    SET status = _status, commission_rate = _commission_rate, updated_at = now()
    WHERE id = _store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_submit_product(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.merchant_products AS p
    SET status = 'pending_review', review_note = NULL, updated_at = now()
    WHERE p.id = _product_id
      AND p.status IN ('draft', 'rejected')
      AND p.image_path LIKE p.store_id::text || '/%'
      AND EXISTS (
        SELECT 1 FROM public.merchant_stores AS s
        WHERE s.id = p.store_id AND s.owner_id = auth.uid() AND s.status = 'active'
      );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product cannot be submitted' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_admin_review_product(
  _product_id uuid,
  _decision text,
  _review_note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('approved', 'rejected') OR char_length(coalesce(_review_note, '')) > 500 THEN
    RAISE EXCEPTION 'invalid review decision' USING ERRCODE = '22023';
  END IF;
  UPDATE public.merchant_products
    SET status = _decision,
        review_note = CASE WHEN _decision = 'rejected' THEN nullif(btrim(_review_note), '') ELSE NULL END,
        updated_at = now()
    WHERE id = _product_id AND status = 'pending_review';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending product not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_archive_product(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.merchant_products AS p
    SET status = 'archived', updated_at = now()
    WHERE p.id = _product_id
      AND p.status IN ('draft', 'rejected', 'approved')
      AND EXISTS (
        SELECT 1 FROM public.merchant_stores AS s
        WHERE s.id = p.store_id AND s.owner_id = auth.uid()
      );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product cannot be archived' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_admin_candidates(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_admin_create_store(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_admin_list_stores() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_get_my_store() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_admin_set_store_terms(uuid, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_submit_product(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_admin_review_product(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_archive_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_admin_candidates(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_admin_create_store(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_admin_list_stores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_store() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_admin_set_store_terms(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_submit_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_admin_review_product(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_archive_product(uuid) TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.merchant_orders FROM anon, authenticated;
GRANT SELECT ON TABLE public.merchant_orders TO authenticated;
CREATE POLICY merchant_orders_customer_read
  ON public.merchant_orders FOR SELECT TO authenticated
  USING (customer_id = auth.uid());
CREATE POLICY merchant_orders_store_owner_read
  ON public.merchant_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
  );
CREATE POLICY merchant_orders_admin_read
  ON public.merchant_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.merchant_create_order(
  _product_id uuid,
  _quantity integer,
  _customer_name text,
  _customer_phone text,
  _customer_city text,
  _delivery_address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_product record;
  next_total numeric(14,2);
  next_commission numeric(14,2);
  new_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in required' USING ERRCODE = '42501';
  END IF;
  IF _quantity IS NULL OR _quantity NOT BETWEEN 1 AND 100
     OR char_length(btrim(coalesce(_customer_name, ''))) NOT BETWEEN 2 AND 100
     OR char_length(btrim(coalesce(_customer_phone, ''))) NOT BETWEEN 7 AND 24
     OR char_length(btrim(coalesce(_customer_city, ''))) NOT BETWEEN 2 AND 80
     OR char_length(btrim(coalesce(_delivery_address, ''))) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'invalid order details' USING ERRCODE = '22023';
  END IF;

  SELECT p.id, p.store_id, p.title, p.price, p.currency, p.stock, s.commission_rate
    INTO current_product
    FROM public.merchant_products AS p
    JOIN public.merchant_stores AS s ON s.id = p.store_id
    WHERE p.id = _product_id AND p.status = 'approved' AND s.status = 'active'
    FOR UPDATE OF p, s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product unavailable' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.merchant_products
    SET stock = stock - _quantity, updated_at = now()
    WHERE id = current_product.id AND stock >= _quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient stock' USING ERRCODE = '22023';
  END IF;

  next_total := round(current_product.price * _quantity, 2);
  next_commission := round(next_total * current_product.commission_rate, 2);
  INSERT INTO public.merchant_orders (
    customer_id, store_id, product_id, product_title, quantity, unit_price, currency,
    commission_rate, total_amount, commission_amount, seller_amount,
    customer_name, customer_phone, customer_city, delivery_address
  ) VALUES (
    auth.uid(), current_product.store_id, current_product.id, current_product.title,
    _quantity, current_product.price, current_product.currency,
    current_product.commission_rate, next_total, next_commission, next_total - next_commission,
    btrim(_customer_name), btrim(_customer_phone), btrim(_customer_city), btrim(_delivery_address)
  ) RETURNING id INTO new_order_id;
  RETURN new_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_update_order_status(_order_id uuid, _next_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_order public.merchant_orders%ROWTYPE;
  actor_is_admin boolean;
  actor_is_owner boolean;
  actor_is_customer boolean;
  allowed_transition boolean := false;
BEGIN
  SELECT * INTO current_order
    FROM public.merchant_orders
    WHERE id = _order_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  actor_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  actor_is_owner := EXISTS (
    SELECT 1 FROM public.merchant_stores
    WHERE id = current_order.store_id AND owner_id = auth.uid()
  );
  actor_is_customer := current_order.customer_id = auth.uid();

  IF actor_is_customer AND NOT actor_is_owner AND NOT actor_is_admin THEN
    allowed_transition := current_order.status = 'pending' AND _next_status = 'cancelled';
  ELSIF actor_is_owner OR actor_is_admin THEN
    allowed_transition :=
      (current_order.status = 'pending' AND _next_status IN ('confirmed', 'cancelled'))
      OR (current_order.status = 'confirmed' AND _next_status IN ('preparing', 'cancelled'))
      OR (current_order.status = 'preparing' AND _next_status IN ('ready', 'cancelled'))
      OR (current_order.status = 'ready' AND _next_status IN ('delivered', 'cancelled'));
  END IF;

  IF NOT allowed_transition THEN
    RAISE EXCEPTION 'invalid order status transition' USING ERRCODE = '42501';
  END IF;

  IF _next_status = 'cancelled' AND current_order.status <> 'delivered' THEN
    UPDATE public.merchant_products
      SET stock = stock + current_order.quantity, updated_at = now()
      WHERE id = current_order.product_id;
  END IF;
  UPDATE public.merchant_orders
    SET status = _next_status, updated_at = now()
    WHERE id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_create_order(uuid, integer, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_update_order_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_create_order(uuid, integer, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_update_order_status(uuid, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-product-images',
  'merchant-product-images',
  false,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY merchant_product_images_published_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'merchant-product-images'
    AND EXISTS (
      SELECT 1
      FROM public.merchant_products AS p
      JOIN public.merchant_stores AS s ON s.id = p.store_id
      WHERE p.image_path = name AND p.status = 'approved' AND s.status = 'active'
    )
  );
CREATE POLICY merchant_product_images_owner_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'merchant-product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.merchant_stores AS s
        WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
      )
    )
  );
CREATE POLICY merchant_product_images_owner_upload
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'merchant-product-images'
    AND EXISTS (
      SELECT 1 FROM public.merchant_stores AS s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid() AND s.status = 'active'
    )
  );
CREATE POLICY merchant_product_images_owner_cleanup
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'merchant-product-images'
    AND NOT EXISTS (
      SELECT 1 FROM public.merchant_products AS p WHERE p.image_path = name
    )
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.merchant_stores AS s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND s.owner_id = auth.uid()
      )
    )
  );
