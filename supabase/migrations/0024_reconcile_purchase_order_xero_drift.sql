-- ============================================================================
-- Reconcile purchase order and Xero schema drift
-- Migration: 0024_reconcile_purchase_order_xero_drift.sql
--
-- Backfills the subset of Drizzle-managed schema changes that were applied
-- manually or missed entirely in the Supabase migration chain.
-- Safe to run in partially drifted environments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Purchase order parity (drizzle 0024)
-- ----------------------------------------------------------------------------

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(12, 6),
  ADD COLUMN IF NOT EXISTS exchange_date date;

ALTER TABLE public.purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_line_total_calc;

-- ----------------------------------------------------------------------------
-- Customer/Xero parity (drizzle 0027)
-- ----------------------------------------------------------------------------

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS xero_contact_id text;

CREATE TABLE IF NOT EXISTS public.xero_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE cascade,
  order_id uuid REFERENCES public.orders(id) ON DELETE set null,
  dedupe_key text NOT NULL,
  xero_invoice_id text NOT NULL,
  payment_id text,
  amount text NOT NULL,
  payment_date text NOT NULL,
  reference text,
  result_state text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  processed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_xero_payment_events_org_dedupe
  ON public.xero_payment_events USING btree (organization_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_xero_payment_events_org_invoice
  ON public.xero_payment_events USING btree (organization_id, xero_invoice_id);

CREATE INDEX IF NOT EXISTS idx_xero_payment_events_org_processed
  ON public.xero_payment_events USING btree (organization_id, processed_at);

ALTER TABLE public.xero_payment_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'xero_payment_events'
      AND policyname = 'xero_payment_events_select_policy'
  ) THEN
    CREATE POLICY xero_payment_events_select_policy
      ON public.xero_payment_events
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'xero_payment_events'
      AND policyname = 'xero_payment_events_insert_policy'
  ) THEN
    CREATE POLICY xero_payment_events_insert_policy
      ON public.xero_payment_events
      AS PERMISSIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'xero_payment_events'
      AND policyname = 'xero_payment_events_update_policy'
  ) THEN
    CREATE POLICY xero_payment_events_update_policy
      ON public.xero_payment_events
      AS PERMISSIVE
      FOR UPDATE
      TO authenticated
      USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
      WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'xero_payment_events'
      AND policyname = 'xero_payment_events_delete_policy'
  ) THEN
    CREATE POLICY xero_payment_events_delete_policy
      ON public.xero_payment_events
      AS PERMISSIVE
      FOR DELETE
      TO authenticated
      USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.oauth_connections
    WHERE is_active = true
      AND provider = 'xero'
      AND service_type = 'accounting'
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active Xero accounting connections exist for at least one organization. Resolve them before applying 0024_reconcile_purchase_order_xero_drift.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.oauth_connections
    WHERE is_active = true
      AND provider = 'xero'
      AND service_type = 'accounting'
      AND external_account_id IS NOT NULL
    GROUP BY external_account_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active Xero tenant bindings exist across organizations. Resolve them before applying 0024_reconcile_purchase_order_xero_drift.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_connections_active_xero_accounting_org
  ON public.oauth_connections USING btree (organization_id, provider, service_type)
  WHERE (is_active = true AND provider = 'xero' AND service_type = 'accounting');

CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_connections_active_xero_tenant
  ON public.oauth_connections USING btree (external_account_id)
  WHERE (is_active = true AND provider = 'xero' AND service_type = 'accounting' AND external_account_id IS NOT NULL);
