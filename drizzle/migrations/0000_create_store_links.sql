CREATE TABLE public.store_links (
  slug text PRIMARY KEY,
  url text NOT NULL CHECK (url ~* '^https://[^\s]+$' AND length(url) <= 2000),
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_links TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_links TO authenticated;
GRANT ALL ON public.store_links TO service_role;

ALTER TABLE public.store_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads store links" ON public.store_links
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Staff insert store links" ON public.store_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff update store links" ON public.store_links
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE TRIGGER store_links_updated BEFORE UPDATE ON public.store_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();