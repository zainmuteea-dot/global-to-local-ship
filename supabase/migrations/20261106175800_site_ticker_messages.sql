-- 20261106175800_site_ticker_messages.sql
-- جدول مستقل لرسائل أشرطة الموقع، منفصل تمامًا عن public.notifications وSMS.
-- افتراضات هذا الترحيل: وجود public.app_role وpublic.has_role(uuid, app_role)
-- كما في ترحيلات أدوار الإدارة الحالية بالمشروع.

CREATE TABLE IF NOT EXISTS public.site_ticker_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 180),
  placement text NOT NULL DEFAULT 'home_guest'
    CHECK (placement IN ('home_guest', 'dashboard', 'both')),
  badge text NOT NULL DEFAULT '' CHECK (char_length(badge) <= 30),
  -- روابط داخلية فقط؛ يمنع ذلك إدخال javascript: أو روابط خارجية غير مقصودة.
  href text NULL CHECK (
    href IS NULL OR (left(href, 1) = '/' AND left(href, 2) <> '//')
  ),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_ticker_valid_activation_window
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

COMMENT ON TABLE public.site_ticker_messages IS
  'رسائل أشرطة الموقع العامة؛ مستقلة عن إشعارات العملاء والرسائل النصية SMS.';
COMMENT ON COLUMN public.site_ticker_messages.placement IS
  'home_guest للصفحة الرئيسية للزوار، dashboard للوحة العميل، both لكليهما.';
COMMENT ON COLUMN public.site_ticker_messages.starts_at IS
  'وقت بدء التفعيل، مخزن كتوقيت مطلق timestamptz؛ NULL يعني دون حد بداية.';
COMMENT ON COLUMN public.site_ticker_messages.ends_at IS
  'وقت انتهاء التفعيل، مخزن كتوقيت مطلق timestamptz؛ NULL يعني دون حد انتهاء.';
COMMENT ON COLUMN public.site_ticker_messages.updated_at IS
  'على التطبيق تحديث هذا الحقل إلى now() عند تعديل الرسالة.';

ALTER TABLE public.site_ticker_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_ticker_messages FROM PUBLIC;
GRANT SELECT ON TABLE public.site_ticker_messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.site_ticker_messages TO authenticated;

DROP POLICY IF EXISTS site_ticker_public_read ON public.site_ticker_messages;
CREATE POLICY site_ticker_public_read
  ON public.site_ticker_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

DROP POLICY IF EXISTS site_ticker_staff_manage ON public.site_ticker_messages;
CREATE POLICY site_ticker_staff_manage
  ON public.site_ticker_messages
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

CREATE INDEX IF NOT EXISTS site_ticker_messages_active_order_idx
  ON public.site_ticker_messages (placement, sort_order, created_at)
  WHERE is_active = true;

-- رسائل ابتدائية مطابقة للمحتوى الحالي. تُدرج مرة واحدة بمعرّفات ثابتة،
-- ولا تُستبدل قيمها إذا عدّلها المسؤول لاحقًا.
INSERT INTO public.site_ticker_messages
  (id, message, placement, badge, href, sort_order, is_active)
VALUES
  ('71000000-0000-4000-8000-000000000001',
   'مرحبًا بكم في السوق الشامل، تمتعوا بتجربة تسوق عالمية مميزة',
   'home_guest', 'أهلًا بكم', NULL, 0, true),
  ('71000000-0000-4000-8000-000000000002',
   'أرسل رابط المنتج الذي ترغب بشرائه وسنراجع تفاصيله قبل تأكيد الطلب.',
   'dashboard', 'طريقة الطلب', '/new-order', 0, true),
  ('71000000-0000-4000-8000-000000000003',
   'تابع حالة طلبك ورقم التتبع من صفحة تتبع الطلبات.',
   'dashboard', 'تتبع الطلب', '/track', 1, true),
  ('71000000-0000-4000-8000-000000000004',
   'ارفع سند الدفع وتابع تفاصيل دفعتك من صفحة الدفع.',
   'dashboard', 'الدفعات', '/pay', 2, true),
  ('71000000-0000-4000-8000-000000000005',
   'تحتاج مساعدة؟ تجد خيارات التواصل في صفحة حسابي.',
   'dashboard', 'خدمة العملاء', '/my-account', 3, true)
ON CONFLICT (id) DO NOTHING;
