CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles AS ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = required_role
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO anon, authenticated;
