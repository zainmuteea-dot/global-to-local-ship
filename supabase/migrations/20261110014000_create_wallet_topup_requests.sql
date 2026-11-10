-- Wallet top-up request schema for the Supabase project this app is configured to use.
-- Review the target project's schema before applying. This migration does not credit
-- wallet_transactions; only an authorized review workflow may do that after approval.

create table if not exists public.wallet_topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'YER' check (currency = 'YER'),
  payment_method text not null check (
    payment_method in ('الكريمي', 'ون كاش', 'فلوسك', 'جوالي', 'جيب', 'حوالة النجم')
  ),
  sender_phone text not null check (char_length(trim(sender_phone)) between 7 and 30),
  note text check (note is null or char_length(note) <= 500),
  proof_path text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_topup_review_fields_check check (
    (status = 'pending_review' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
  )
);

create index if not exists wallet_topup_requests_user_created_idx
  on public.wallet_topup_requests (user_id, created_at desc);
create index if not exists wallet_topup_requests_status_created_idx
  on public.wallet_topup_requests (status, created_at desc);

alter table public.wallet_topup_requests enable row level security;
grant select, insert, update on table public.wallet_topup_requests to authenticated;

-- Create policies only when absent so this migration can be safely re-run.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_topup_requests'
      and policyname = 'wallet topups owner read'
  ) then
    create policy "wallet topups owner read" on public.wallet_topup_requests
      for select to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_topup_requests'
      and policyname = 'wallet topups staff read'
  ) then
    create policy "wallet topups staff read" on public.wallet_topup_requests
      for select to authenticated using (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or public.has_role(auth.uid(), 'staff'::public.app_role)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_topup_requests'
      and policyname = 'wallet topups owner submit'
  ) then
    create policy "wallet topups owner submit" on public.wallet_topup_requests
      for insert to authenticated with check (
        auth.uid() = user_id
        and status = 'pending_review'
        and reviewed_at is null
        and reviewed_by is null
        and split_part(proof_path, '/', 1) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_topup_requests'
      and policyname = 'wallet topups staff update'
  ) then
    create policy "wallet topups staff update" on public.wallet_topup_requests
      for update to authenticated
      using (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or public.has_role(auth.uid(), 'staff'::public.app_role)
      )
      with check (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or public.has_role(auth.uid(), 'staff'::public.app_role)
      );
  end if;
end $$;

-- Keep this bucket private. If an existing bucket differs, stop rather than silently
-- changing its settings; review it before applying this migration to that project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wallet-transfer-proofs',
  'wallet-transfer-proofs',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

do $$
declare
  v_public boolean;
  v_file_size_limit bigint;
  v_allowed_mime_types text[];
begin
  select public, file_size_limit, allowed_mime_types
    into v_public, v_file_size_limit, v_allowed_mime_types
  from storage.buckets
  where id = 'wallet-transfer-proofs';

  if not found
    or v_public is distinct from false
    or v_file_size_limit is distinct from 2097152
    or v_allowed_mime_types is null
    or cardinality(v_allowed_mime_types) <> 3
    or not (v_allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[])
  then
    raise exception 'wallet-transfer-proofs bucket is missing or has unexpected settings; review it before continuing';
  end if;
end $$;

-- Proof files are stored at <auth.uid()>/<random-file-name>.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wallet proofs owner upload'
  ) then
    create policy "wallet proofs owner upload" on storage.objects
      for insert to authenticated with check (
        bucket_id = 'wallet-transfer-proofs'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wallet proofs owner and staff read'
  ) then
    create policy "wallet proofs owner and staff read" on storage.objects
      for select to authenticated using (
        bucket_id = 'wallet-transfer-proofs'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.has_role(auth.uid(), 'admin'::public.app_role)
          or public.has_role(auth.uid(), 'staff'::public.app_role)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wallet proofs delete unlinked own upload'
  ) then
    create policy "wallet proofs delete unlinked own upload" on storage.objects
      for delete to authenticated using (
        bucket_id = 'wallet-transfer-proofs'
        and (storage.foldername(name))[1] = auth.uid()::text
        and not exists (
          select 1 from public.wallet_topup_requests r
          where r.proof_path = storage.objects.name
        )
      );
  end if;
end $$;
