/*
# Connect customer notifications to administrator sends

1. New tables
- `public.user_roles` stores trusted administrator/staff roles when the project database has not created them yet.
- `public.notifications` stores administrator-created broadcast or customer-specific alerts.
- `public.notification_reads` stores each authenticated customer's read state.

2. Notification columns
- `kind` identifies the bell category.
- `href` stores the in-app destination.
- `is_active` controls visibility.
- `sent_by` and `sent_at` record the sender and send time.

3. Security
- Customers can read only active broadcast notifications or active notifications addressed to themselves.
- Only users with the trusted `admin` or `staff` role can create, update, or delete notifications.
- Authorship defaults from the authenticated session and is not client-writable.
- Read-state rows are scoped to the authenticated owner.
- Realtime is enabled for notifications.

4. Important notes
- Existing seeded welcome rows are deactivated instead of deleted.
- The frontend no longer creates or displays timer-based notifications; visible notifications come from administrator-created rows.
*/

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'system',
  href text,
  is_active boolean NOT NULL DEFAULT true,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS href text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE public.notifications
  ALTER COLUMN sent_by SET DEFAULT auth.uid();

UPDATE public.notifications
SET is_active = false
WHERE title IN ('مرحباً بك في السوق الشامل', 'تابع شحنتك بسهولة');

GRANT SELECT ON public.notifications TO authenticated;
GRANT DELETE ON public.notifications TO authenticated;
REVOKE INSERT, UPDATE ON public.notifications FROM authenticated;
GRANT INSERT (user_id, title, body, kind, href, is_active) ON public.notifications TO authenticated;
GRANT UPDATE (title, body, kind, href, is_active) ON public.notifications TO authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own or broadcast" ON public.notifications;
DROP POLICY IF EXISTS "Customers read active notifications" ON public.notifications;
CREATE POLICY "Customers read active notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (user_id IS NULL OR auth.uid() = user_id)
);

DROP POLICY IF EXISTS "staff manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff insert notifications" ON public.notifications;
CREATE POLICY "Staff insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff update notifications" ON public.notifications;
CREATE POLICY "Staff update notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff delete notifications" ON public.notifications;
CREATE POLICY "Staff delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;

DROP POLICY IF EXISTS "Users read own notification reads" ON public.notification_reads;
CREATE POLICY "Users read own notification reads"
ON public.notification_reads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notification reads" ON public.notification_reads;
CREATE POLICY "Users insert own notification reads"
ON public.notification_reads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notification reads" ON public.notification_reads;
CREATE POLICY "Users update own notification reads"
ON public.notification_reads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notification reads" ON public.notification_reads;
CREATE POLICY "Users delete own notification reads"
ON public.notification_reads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
