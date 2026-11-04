-- بطاقات العروض العامة التي تظهر في صفحة /products.
-- قبل التشغيل، تأكد من أن اتصال Supabase هو قاعدة التطبيق الصحيحة.

CREATE TABLE IF NOT EXISTS public.storefront_offer_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT '✨',
  badge text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  button_label text NOT NULL DEFAULT 'تصفح العروض',
  target_path text NOT NULL CHECK (target_path IN ('/exclusive', '/deals')),
  theme text NOT NULL CHECK (theme IN ('exclusive', 'deals')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_offer_cards ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.storefront_offer_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.storefront_offer_cards TO authenticated;

DROP POLICY IF EXISTS storefront_offer_cards_public_read ON public.storefront_offer_cards;
CREATE POLICY storefront_offer_cards_public_read
  ON public.storefront_offer_cards
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS storefront_offer_cards_admin_manage ON public.storefront_offer_cards;
CREATE POLICY storefront_offer_cards_admin_manage
  ON public.storefront_offer_cards
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- إنشاء البطاقتين الافتراضيتين فقط عند عدم وجود بطاقة من النوع نفسه.
INSERT INTO public.storefront_offer_cards
  (title, icon, badge, description, button_label, target_path, theme, is_active, sort_order)
SELECT 'عروضات حصرية', '👑', 'EXCLUSIVE',
       'عروض محدودة على المنتجات الفاخرة والمختارة', 'تصفح العروض',
       '/exclusive', 'exclusive', true, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.storefront_offer_cards WHERE theme = 'exclusive'
);

INSERT INTO public.storefront_offer_cards
  (title, icon, badge, description, button_label, target_path, theme, is_active, sort_order)
SELECT 'تخفيضات حتى 70%', '🌹', 'حتى 70%',
       'على منتجات مختارة من المتاجر العالمية', 'تصفح العروض',
       '/deals', 'deals', true, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.storefront_offer_cards WHERE theme = 'deals'
);
