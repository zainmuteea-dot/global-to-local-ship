create type public.app_role as enum ('admin','staff');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique default ('SC-' || upper(substr(md5(random()::text),1,8))),
  customer_name text not null,
  phone text not null,
  product_link text not null,
  product_name text,
  status text not null default 'جديد',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "anyone can place order" on public.orders for insert to anon, authenticated with check (status = 'جديد' and notes is null);
create policy "staff read" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "staff update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "staff delete" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create trigger orders_updated before update on public.orders for each row execute function public.update_updated_at_column();

create or replace function public.create_order(_product_link text, _customer_name text, _phone text)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if length(trim(_product_link)) = 0 or length(trim(_customer_name)) = 0 or length(_phone) < 9 then raise exception 'invalid'; end if;
  insert into public.orders(product_link, customer_name, phone) values (left(_product_link,2000), left(_customer_name,200), left(_phone,30)) returning tracking_code into code;
  return code;
end; $$;
grant execute on function public.create_order(text,text,text) to anon, authenticated;

create or replace function public.track_order(_code text)
returns table(tracking_code text, status text, product_link text, product_name text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select tracking_code, status, product_link, product_name, created_at, updated_at from public.orders where tracking_code = upper(trim(_code)) $$;
grant execute on function public.track_order(text) to anon, authenticated;