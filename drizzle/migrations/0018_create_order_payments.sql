-- ============================================================================
-- Migration: Create order_payments table
-- ============================================================================
-- Records payment transactions against orders.
-- Amounts are stored in dollars (numeric(12,2)).
-- ============================================================================

CREATE TABLE "order_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "order_id" uuid NOT NULL REFERENCES "public"."orders"("id") ON DELETE cascade,
  "amount" numeric(12, 2) DEFAULT 0 NOT NULL,
  "payment_method" "payment_method" NOT NULL,
  "payment_date" date NOT NULL,
  "reference" text,
  "notes" text,
  "is_refund" boolean DEFAULT false NOT NULL,
  "related_payment_id" uuid,
  "recorded_by" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "order_payments"
  ADD CONSTRAINT "order_payments_related_payment_id_fkey"
  FOREIGN KEY ("related_payment_id") REFERENCES "public"."order_payments"("id")
  ON DELETE set null;

CREATE INDEX "idx_order_payments_org_order" ON "order_payments" USING btree ("organization_id","order_id");
CREATE INDEX "idx_order_payments_org_date" ON "order_payments" USING btree ("organization_id","payment_date");
CREATE INDEX "idx_order_payments_org_method" ON "order_payments" USING btree ("organization_id","payment_method");
CREATE INDEX "idx_order_payments_order" ON "order_payments" USING btree ("order_id");
CREATE INDEX "idx_order_payments_date" ON "order_payments" USING btree ("payment_date");

ALTER TABLE "order_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_payments_select_policy" ON "order_payments"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "order_payments_insert_policy" ON "order_payments"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "order_payments_update_policy" ON "order_payments"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "order_payments_delete_policy" ON "order_payments"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
