-- يوميات العملاء: جدول مستقل عن payments وfund_vouchers.
-- شغّل هذا الملف مرة واحدة في SQL Editor لمشروع Supabase المرتبط بـVercel.
-- لا ينقل أو يحذف قيود localStorage القديمة، ولا يغير الجداول الموجودة.

BEGIN;

DO $preflight$
DECLARE
  missing_columns text[];
BEGIN
  IF to_regprocedure('public.current_user_has_permission(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Missing public.current_user_has_permission(text,text); no changes applied';
  END IF;

  IF to_regclass('public.client_daily_entries') IS NOT NULL THEN
    SELECT array_agg(required.column_name)
      INTO missing_columns
    FROM (VALUES
      ('id'), ('customer_name'), ('kind'), ('amount'), ('currency'),
      ('entry_date'), ('note'), ('created_by'), ('created_at')
    ) AS required(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'client_daily_entries'
        AND c.column_name = required.column_name
    );

    IF missing_columns IS NOT NULL THEN
      RAISE EXCEPTION 'public.client_daily_entries exists but is missing columns: %; no changes applied', missing_columns;
    END IF;
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.client_daily_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('قبض', 'صرف')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT 'بدون وصف' CHECK (char_length(note) <= 1000),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_daily_entries_date_created_idx
  ON public.client_daily_entries (entry_date DESC, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS client_daily_entries_currency_date_idx
  ON public.client_daily_entries (currency, entry_date DESC);

ALTER TABLE public.client_daily_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.client_daily_entries FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.client_daily_entries TO authenticated;

DROP POLICY IF EXISTS client_daily_entries_finance_select ON public.client_daily_entries;
CREATE POLICY client_daily_entries_finance_select
  ON public.client_daily_entries
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_permission('finance', 'view')
    OR public.current_user_has_permission('finance', 'manage')
  );

DROP POLICY IF EXISTS client_daily_entries_finance_insert ON public.client_daily_entries;
CREATE POLICY client_daily_entries_finance_insert
  ON public.client_daily_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_has_permission('finance', 'manage')
    AND created_by = auth.uid()
  );

-- عمدًا لا توجد سياسات UPDATE أو DELETE ولا منح لهما.
COMMIT;
