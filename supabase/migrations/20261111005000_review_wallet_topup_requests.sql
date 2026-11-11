-- Atomic, staff-authorized review of wallet top-up requests.
-- Approval changes the request and writes exactly one wallet transaction in one DB transaction.
create or replace function public.review_wallet_topup(_request_id uuid, _decision text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.wallet_topup_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لمراجعة طلب الشحن.' using errcode = '42501';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'staff'::public.app_role)
  ) then
    raise exception 'لا تملك صلاحية مراجعة طلبات شحن المحفظة.' using errcode = '42501';
  end if;

  if _decision is null or _decision not in ('approved', 'rejected') then
    raise exception 'قرار المراجعة غير صالح.' using errcode = '22023';
  end if;

  select * into v_request
  from public.wallet_topup_requests
  where id = _request_id
  for update;

  if not found then
    raise exception 'طلب الشحن غير موجود.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending_review' then
    raise exception 'تمت مراجعة هذا الطلب مسبقًا؛ لا يمكن إضافة الرصيد مرة أخرى.' using errcode = '55000';
  end if;

  if v_request.amount is null or v_request.amount <= 0 then
    raise exception 'مبلغ طلب الشحن غير صالح.' using errcode = '22023';
  end if;

  update public.wallet_topup_requests
  set status = _decision,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = v_request.id;

  if _decision = 'approved' then
    insert into public.wallet_transactions (user_id, amount, description)
    values (
      v_request.user_id,
      v_request.amount,
      format('شحن المحفظة (طلب %s)', v_request.id)
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'decision', _decision,
    'request_id', v_request.id,
    'amount', v_request.amount
  );
end;
$$;

revoke all on function public.review_wallet_topup(uuid, text) from public, anon;
grant execute on function public.review_wallet_topup(uuid, text) to authenticated;
