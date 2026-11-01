-- Prevent deleting or demoting the final admin role, including concurrent requests.
-- The singleton row lock serializes admin-role mutations; the trigger's count
-- runs after the lock is acquired, so a waiting transaction sees the prior commit.

CREATE TABLE IF NOT EXISTS public.admin_role_guard (
  id boolean PRIMARY KEY DEFAULT true CHECK (id IS TRUE)
);

INSERT INTO public.admin_role_guard (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_role_guard ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_role_guard FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_last_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  admin_count bigint;
BEGIN
  -- Changes that neither add nor remove an admin do not affect the invariant.
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'admin'::public.app_role THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role IS DISTINCT FROM 'admin'::public.app_role THEN
      RETURN OLD;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM 'admin'::public.app_role
       AND NEW.role IS DISTINCT FROM 'admin'::public.app_role THEN
      RETURN NEW;
    END IF;
    IF OLD.role IS NOT DISTINCT FROM 'admin'::public.app_role
       AND NEW.role IS NOT DISTINCT FROM 'admin'::public.app_role THEN
      RETURN NEW;
    END IF;
  END IF;

  -- A single database row is the mutex shared by all transactions touching
  -- admin roles. It also covers Auth user deletion, whose FK cascade deletes
  -- the corresponding row from public.user_roles.
  PERFORM 1
  FROM public.admin_role_guard
  WHERE id IS TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADMIN_ROLE_GUARD_NOT_INITIALIZED';
  END IF;

  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE'
         AND OLD.role IS NOT DISTINCT FROM 'admin'::public.app_role
         AND NEW.role IS DISTINCT FROM 'admin'::public.app_role) THEN
    SELECT count(*)
    INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role;

    IF admin_count <= 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'LAST_ADMIN_PROTECTION',
        DETAIL = 'At least one admin role must remain.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_last_admin_role() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS protect_last_admin_role ON public.user_roles;
CREATE TRIGGER protect_last_admin_role
BEFORE INSERT OR UPDATE OF role OR DELETE
ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_admin_role();