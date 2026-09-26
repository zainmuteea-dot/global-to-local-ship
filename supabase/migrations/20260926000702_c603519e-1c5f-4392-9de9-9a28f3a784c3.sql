create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid()=id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id);
create trigger profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id, full_name, phone) values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone') on conflict do nothing; return new; end; $$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'المنزل', city text not null, details text not null,
  latitude double precision, longitude double precision,
  created_at timestamptz not null default now());
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null, description text,
  created_at timestamptz not null default now());
grant select on public.wallet_transactions to authenticated;
grant all on public.wallet_transactions to service_role;
alter table public.wallet_transactions enable row level security;
create policy "own wallet read" on public.wallet_transactions for select to authenticated using (auth.uid()=user_id);
create policy "staff wallet manage" on public.wallet_transactions for all to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
grant insert, update, delete on public.wallet_transactions to authenticated;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null, body text,
  created_at timestamptz not null default now());
grant select on public.notifications to authenticated;
grant insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "read own or broadcast" on public.notifications for select to authenticated using (user_id is null or auth.uid()=user_id);
create policy "staff manage notifications" on public.notifications for all to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
insert into public.notifications(title, body) values
('مرحباً بك في السوق الشامل','اطلب من أي متجر عالمي ونوصلها لباب بيتك داخل اليمن.'),
('تابع شحنتك بسهولة','من صفحة «تتبع شحنتك» تقدر تعرف مكان طلبك في أي وقت.');

alter table public.orders add column user_id uuid references auth.users(id) on delete set null;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid()=user_id);

create or replace function public.create_order(_product_link text, _customer_name text, _phone text)
 returns text language plpgsql security definer set search_path to 'public' as $function$
declare code text;
begin
  if length(trim(_product_link)) = 0 or length(trim(_customer_name)) = 0 or length(_phone) < 9 then raise exception 'invalid'; end if;
  insert into public.orders(product_link, customer_name, phone, user_id) values (left(_product_link,2000), left(_customer_name,200), left(_phone,30), auth.uid()) returning tracking_code into code;
  return code;
end; $function$;

create policy "avatars public read" on storage.objects for select using (bucket_id='avatars');
create policy "avatars own upload" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatars own update" on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);