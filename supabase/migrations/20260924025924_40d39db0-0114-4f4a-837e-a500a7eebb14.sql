REVOKE EXECUTE ON FUNCTION public.track_order(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.track_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO service_role;