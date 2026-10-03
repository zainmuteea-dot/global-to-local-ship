/*
# Lock notification tables to the intended roles

1. Security changes
- Remove all anonymous grants from notifications, notification reads, and user roles.
- Keep customers limited to their own read-state rows.
- Keep notification creation, editing, and deletion limited to trusted admin/staff roles.
- Add explicit deny-by-default write policies for the role catalog, which is maintained outside the browser.

2. Important notes
- This changes permissions only; no notification or user data is deleted.
*/

REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.notification_reads FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "Users insert roles" ON public.user_roles;
CREATE POLICY "Users insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Users update roles" ON public.user_roles;
CREATE POLICY "Users update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Users delete roles" ON public.user_roles;
CREATE POLICY "Users delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (false);
