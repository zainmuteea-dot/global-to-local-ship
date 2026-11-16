BEGIN;
SELECT plan(7);
SELECT ok(has_function_privilege('anon', 'public.marketplace_get_best_selling_products(integer)', 'EXECUTE'), 'anonymous users may call the aggregate RPC');
SELECT ok(has_function_privilege('authenticated', 'public.marketplace_get_best_selling_products(integer)', 'EXECUTE'), 'signed-in users may call the aggregate RPC');
SELECT ok(NOT has_table_privilege('anon', 'public.merchant_orders', 'SELECT'), 'anonymous users cannot read raw customer orders');
SELECT is((SELECT proargnames::text FROM pg_proc WHERE oid = 'public.marketplace_get_best_selling_products(integer)'::regprocedure), '{_limit,product_id,store_id,title,image_path,price,currency,quantity_sold}', 'RPC exposes product aggregates but no order or customer fields');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
 ('00000000-0000-4000-8000-000000000101','authenticated','authenticated','best-seller-active@example.invalid','',now(),'{}','{}',now(),now()),
 ('00000000-0000-4000-8000-000000000103','authenticated','authenticated','best-seller-suspended@example.invalid','',now(),'{}','{}',now(),now());
INSERT INTO public.merchant_stores (id, owner_id, name, contact_phone, status) VALUES
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','Active store','700000001','active'),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000103','Suspended store','700000003','suspended');

INSERT INTO public.merchant_products (id, store_id, title, price, currency, image_path, status) VALUES
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','Approved active product',100,'YER','00000000-0000-4000-8000-000000000201/301.webp','approved'),
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000201','Pending product',200,'YER','00000000-0000-4000-8000-000000000201/302.webp','pending_review'),
 ('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000203','Product at suspended store',300,'YER','00000000-0000-4000-8000-000000000203/303.webp','approved');
INSERT INTO public.merchant_orders (id, product_id, store_id, quantity, status, customer_name, customer_phone) VALUES
 ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201',3,'delivered','PRIVATE NAME','700123456'),
 ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201',2,'delivered','PRIVATE NAME','700123456'),
 ('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201',9,'pending','PRIVATE NAME','700123456'),
 ('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000201',8,'delivered','PRIVATE NAME','700123456'),
 ('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000203',7,'delivered','PRIVATE NAME','700123456');

SET LOCAL ROLE anon;
SELECT results_eq(
  $$SELECT product_id, store_id, title, image_path, price, currency, quantity_sold FROM public.marketplace_get_best_selling_products(12)$$,
  $$VALUES ('00000000-0000-4000-8000-000000000301'::uuid,'00000000-0000-4000-8000-000000000201'::uuid,'Approved active product'::text,'00000000-0000-4000-8000-000000000201/301.webp'::text,100::numeric,'YER'::text,5::bigint)$$,
  'only delivered quantities for approved products in active stores are returned');
SELECT is((SELECT count(*) FROM public.marketplace_get_best_selling_products(0)), 1::bigint, 'non-positive limit is clamped safely');
SELECT is((SELECT count(*) FROM public.marketplace_get_best_selling_products(999)), 1::bigint, 'the upper limit is capped');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
