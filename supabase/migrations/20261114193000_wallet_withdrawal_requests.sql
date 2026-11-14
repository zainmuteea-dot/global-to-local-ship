-- Manual wallet withdrawal requests.
-- Requests are reviewed and paid manually; this migration never reserves or debits wallet funds.

create table if not exists public.wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'YER' check (currency = 'YER'),
  destination_method text not null check (char_length(trim(destination_method)) between 2 and 80),
  destination_details text not null check (char_length(trim(destination_details)) between 5 and 500),
  note text check (note is null or char_length(note) <= 500),
  review_note text check (review_note is null or char_length(review_note) <= 500),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'paid')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_withdrawal_review_fields_check check (
    (status = 'pending_review' and reviewed_at is null and reviewed_by is null
      and paid_at is null and paid_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null
      and reviewed_by is not null and paid_at is null and paid_by is null)
    or (status = 'paid' and reviewed_at is not null and reviewed_by is not null
      and paid_at is not null and paid_by is not null)
  )
);

create index if not exists wallet_withdrawal_requests_user_created_idx
  on public.wallet_withdrawal_requests (user_id, created_at desc);
create index if not exists wallet_withdrawal_requests_status_created_idx
  on public.wallet_withdrawal_requests (status, created_at desc);

alter table public.wallet_withdrawal_requests enable row level security;
revoke all on table public.wallet_withdrawal_requests from public, anon, authenticated;
grant select, insert on table public.wallet_withdrawal_requests to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_withdrawal_requests'
      and policyname = 'wallet withdrawals owner read'
  ) then
    create policy "wallet withdrawals owner read" on public.wallet_withdrawal_requests
      for select to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_withdrawal_requests'
      and policyname = 'wallet withdrawals staff read'
  ) then
    create policy "wallet withdrawals staff read" on public.wallet_withdrawal_requests
      for select to authenticated using (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or public.has_role(auth.uid(), 'staff'::public.app_role)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_withdrawal_requests'
      and policyname = 'wallet withdrawals owner submit'
  ) then
    create policy "wallet withdrawals owner submit" on public.wallet_withdrawal_requests
      for insert to authenticated with check (
        auth.uid() = user_id
        and status = 'pending_review'
        and reviewed_at is null
        and reviewed_by is null
        and paid_at is null
        and paid_by is null
        and review_note is null
      );
  end if;
end $$;

-- Staff may approve or reject a pending request, but this never changes wallet_transactions.
create or replace function public.review_wallet_withdrawal(
  _request_id uuid,
  _decision text,
  _review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.wallet_withdrawal_requests%rowtype;
  v_review_note text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لمراجعة طلب السحب.' using errcode = '42501';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'staff'::public.app_role)
  ) then
    raise exception 'لا تملك صلاحية مراجعة طلبات السحب.' using errcode = '42501';
  end if;

  if _decision is null or _decision not in ('approved', 'rejected') then
    raise exception 'قرار مراجعة طلب السحب غير صالح.' using errcode = '22023';
  end if;

  if _review_note is not null and char_length(_review_note) > 500 then
    raise exception 'ملاحظة المراجعة تتجاوز الحد المسموح.' using errcode = '22023';
  end if;
  v_review_note := nullif(trim(_review_note), '');

  select * into v_request
  from public.wallet_withdrawal_requests
  where id = _request_id
  for update;

  if not found then
    raise exception 'طلب السحب غير موجود.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending_review' then
    raise exception 'تمت مراجعة هذا الطلب مسبقًا.' using errcode = '55000';
  end if;

  update public.wallet_withdrawal_requests
  set status = _decision,
      review_note = v_review_note,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'success', true,
    'decision', _decision,
    'request_id', v_request.id,
    'amount', v_request.amount
  );
end;
$$;

-- Record an already completed, manual payout; no transfer or wallet debit is performed.
create or replace function public.mark_wallet_withdrawal_paid(_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.wallet_withdrawal_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لتسجيل صرف طلب السحب.' using errcode = '42501';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'staff'::public.app_role)
  ) then
    raise exception 'لا تملك صلاحية تسجيل صرف طلبات السحب.' using errcode = '42501';
  end if;

  select * into v_request
  from public.wallet_withdrawal_requests
  where id = _request_id
  for update;

  if not found then
    raise exception 'طلب السحب غير موجود.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'يجب اعتماد طلب السحب قبل تسجيل صرفه.' using errcode = '55000';
  end if;

  update public.wallet_withdrawal_requests
  set status = 'paid',
      paid_at = now(),
      paid_by = auth.uid(),
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'success', true,
    'status', 'paid',
    'request_id', v_request.id,
    'amount', v_request.amount
  );
end;
$$;

revoke all on function public.review_wallet_withdrawal(uuid, text, text) from public, anon;
grant execute on function public.review_wallet_withdrawal(uuid, text, text) to authenticated;
revoke all on function public.mark_wallet_withdrawal_paid(uuid) from public, anon;
grant execute on function public.mark_wallet_withdrawal_paid(uuid) to authenticated;
