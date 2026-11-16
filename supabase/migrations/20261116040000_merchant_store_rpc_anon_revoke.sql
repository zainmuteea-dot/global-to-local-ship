-- Remove anonymous execution explicitly in case default privileges granted it.
REVOKE ALL ON FUNCTION public.merchant_get_my_store() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_store() TO authenticated;
