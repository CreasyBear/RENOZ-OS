-- ============================================================================
-- Migration: Finance projection trace hardening
-- ============================================================================
-- Links payment-plan installment receipts to the real order_payments ledger and
-- enforces organization-scoped credit note numbers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "payment_schedule_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "payment_schedule_id" uuid NOT NULL REFERENCES "public"."payment_schedules"("id") ON DELETE cascade,
  "order_payment_id" uuid NOT NULL REFERENCES "public"."order_payments"("id") ON DELETE cascade,
  "amount" numeric(12, 2) DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_payment_schedule_payments_org_schedule"
  ON "payment_schedule_payments" USING btree ("organization_id", "payment_schedule_id");

CREATE INDEX IF NOT EXISTS "idx_payment_schedule_payments_org_payment"
  ON "payment_schedule_payments" USING btree ("organization_id", "order_payment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_schedule_payments_schedule_payment_unique"
  ON "payment_schedule_payments" USING btree ("payment_schedule_id", "order_payment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_credit_notes_org_number_unique"
  ON "credit_notes" USING btree ("organization_id", "credit_note_number");

ALTER TABLE "payment_schedule_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedule_payments_select_policy" ON "payment_schedule_payments"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "payment_schedule_payments_insert_policy" ON "payment_schedule_payments"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "payment_schedule_payments_update_policy" ON "payment_schedule_payments"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "payment_schedule_payments_delete_policy" ON "payment_schedule_payments"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
