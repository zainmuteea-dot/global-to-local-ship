-- Ensure the owner-only store RPC cannot be invoked by anonymous API roles.
-- Revoke explicit anon grants as well as inherited PUBLIC execution.
REVOKE ALL ON FUNCTION public.merchant_get_my_store() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_store() TO authenticated;
