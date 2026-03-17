ALTER TABLE "customers" ADD COLUMN "xero_contact_id" text;

CREATE TABLE "xero_payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE set null,
  "dedupe_key" text NOT NULL,
  "xero_invoice_id" text NOT NULL,
  "payment_id" text,
  "amount" text NOT NULL,
  "payment_date" text NOT NULL,
  "reference" text,
  "result_state" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);

CREATE UNIQUE INDEX "idx_xero_payment_events_org_dedupe"
  ON "xero_payment_events" USING btree ("organization_id","dedupe_key");
CREATE INDEX "idx_xero_payment_events_org_invoice"
  ON "xero_payment_events" USING btree ("organization_id","xero_invoice_id");
CREATE INDEX "idx_xero_payment_events_org_processed"
  ON "xero_payment_events" USING btree ("organization_id","processed_at");
ALTER TABLE "xero_payment_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xero_payment_events_select_policy" ON "xero_payment_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "xero_payment_events_insert_policy" ON "xero_payment_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "xero_payment_events_update_policy" ON "xero_payment_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "xero_payment_events_delete_policy" ON "xero_payment_events" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "oauth_connections"
    WHERE "is_active" = true
      AND "provider" = 'xero'
      AND "service_type" = 'accounting'
    GROUP BY "organization_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active Xero accounting connections exist for at least one organization. Resolve them before applying 0027_xero_foundation_hardening.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "oauth_connections"
    WHERE "is_active" = true
      AND "provider" = 'xero'
      AND "service_type" = 'accounting'
      AND "external_account_id" IS NOT NULL
    GROUP BY "external_account_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active Xero tenant bindings exist across organizations. Resolve them before applying 0027_xero_foundation_hardening.';
  END IF;
END $$;

CREATE UNIQUE INDEX "uq_oauth_connections_active_xero_accounting_org"
  ON "oauth_connections" USING btree ("organization_id","provider","service_type")
  WHERE ("is_active" = true AND "provider" = 'xero' AND "service_type" = 'accounting');
CREATE UNIQUE INDEX "uq_oauth_connections_active_xero_tenant"
  ON "oauth_connections" USING btree ("external_account_id")
  WHERE ("is_active" = true AND "provider" = 'xero' AND "service_type" = 'accounting' AND "external_account_id" IS NOT NULL);
