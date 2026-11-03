CREATE TABLE public.finance_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_type text NOT NULL CHECK (voucher_type IN ('receipt', 'payment')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
  fund text NOT NULL CHECK (fund IN ('kuraimi', 'najm', 'onecash', 'cash')),
  party text NOT NULL DEFAULT '' CHECK (char_length(party) <= 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'pos')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.finance_vouchers TO authenticated;
GRANT ALL ON public.finance_vouchers TO service_role;

ALTER TABLE public.finance_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance staff can read vouchers"
ON public.finance_vouchers FOR SELECT TO authenticated
USING (public.current_user_has_permission('finance', 'view'));

CREATE POLICY "Finance staff can record vouchers"
ON public.finance_vouchers FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('finance', 'manage') AND created_by = auth.uid());

CREATE POLICY "Admins can delete vouchers"
ON public.finance_vouchers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX finance_vouchers_created_at_idx ON public.finance_vouchers (created_at DESC);

ALTER TABLE public.finance_vouchers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_vouchers;