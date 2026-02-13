DO $$ BEGIN
    CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'scheduled', 'unpaid', 'overdue', 'paid', 'canceled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'credit_card', 'cash', 'cheque', 'paypal', 'stripe', 'xero');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'site_visit' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'site_visit';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'job_assignment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'job_assignment';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'job_material' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'job_material';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'job_photo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'job_photo';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'warranty_claim' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'warranty_claim';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'warranty_policy' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'warranty_policy';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'warranty_extension' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_entity_type')) THEN
        ALTER TYPE "public"."activity_entity_type" ADD VALUE 'warranty_extension';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partially_shipped' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
        ALTER TYPE "public"."order_status" ADD VALUE 'partially_shipped' BEFORE 'shipped';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'rma_status')) THEN
        ALTER TYPE "public"."rma_status" ADD VALUE 'cancelled';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'warranty_claim_status')) THEN
        ALTER TYPE "public"."warranty_claim_status" ADD VALUE 'cancelled';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_action_plans') THEN
        CREATE TABLE "customer_action_plans" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "organization_id" uuid NOT NULL,
            "customer_id" uuid NOT NULL,
            "title" varchar(255) NOT NULL,
            "description" text,
            "priority" varchar(20) NOT NULL,
            "category" varchar(50) NOT NULL,
            "is_completed" boolean DEFAULT false NOT NULL,
            "completed_at" timestamp with time zone,
            "completed_by" uuid,
            "due_date" timestamp with time zone,
            "metadata" jsonb DEFAULT '{}'::jsonb,
            "created_by" uuid,
            "updated_by" uuid,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "customer_action_plans" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_payments') THEN
        CREATE TABLE "order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_date" date NOT NULL,
	"reference" text,
	"notes" text,
	"is_refund" boolean DEFAULT false NOT NULL,
	"related_payment_id" uuid,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
        );
        ALTER TABLE "order_payments" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;--> statement-breakpoint
ALTER TABLE "return_authorizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_health_metrics" DROP CONSTRAINT "recency_score_range";--> statement-breakpoint
ALTER TABLE "customer_health_metrics" DROP CONSTRAINT "frequency_score_range";--> statement-breakpoint
ALTER TABLE "customer_health_metrics" DROP CONSTRAINT "monetary_score_range";--> statement-breakpoint
ALTER TABLE "customer_health_metrics" DROP CONSTRAINT "engagement_score_range";--> statement-breakpoint
ALTER TABLE "customer_health_metrics" DROP CONSTRAINT "overall_score_range";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "health_score_range";--> statement-breakpoint
ALTER TABLE "customer_product_prices" DROP CONSTRAINT "customer_price_valid_to_after_from";--> statement-breakpoint
ALTER TABLE "customer_product_prices" DROP CONSTRAINT "customer_price_discount_range";--> statement-breakpoint
ALTER TABLE "product_price_tiers" DROP CONSTRAINT "price_tier_max_qty_valid";--> statement-breakpoint
ALTER TABLE "product_price_tiers" DROP CONSTRAINT "price_tier_discount_range";--> statement-breakpoint
ALTER TABLE "opportunities" DROP CONSTRAINT "probability_range";--> statement-breakpoint
ALTER TABLE "supplier_price_lists" DROP CONSTRAINT "supplier_price_lists_quantity_range";--> statement-breakpoint
ALTER TABLE "supplier_price_lists" DROP CONSTRAINT "supplier_price_lists_date_range";--> statement-breakpoint
ALTER TABLE "supplier_price_lists" DROP CONSTRAINT "supplier_price_lists_discount_range";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_quality_rating_range";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_delivery_rating_range";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_communication_rating_range";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_overall_rating_range";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_order_value_range";--> statement-breakpoint
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_discount_range";--> statement-breakpoint
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_tax_rate_range";--> statement-breakpoint
ALTER TABLE "purchase_order_approval_rules" DROP CONSTRAINT "purchase_order_approval_rules_amount_range";--> statement-breakpoint
ALTER TABLE "price_agreements" DROP CONSTRAINT "price_agreements_date_range";--> statement-breakpoint
ALTER TABLE "price_agreements" DROP CONSTRAINT "price_agreements_discount_range";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_generated_documents_org_entity";--> statement-breakpoint
DROP INDEX "idx_quotes_number_org_unique";--> statement-breakpoint
DROP INDEX "idx_projects_org_number";--> statement-breakpoint
DROP INDEX "idx_warranties_number_org";--> statement-breakpoint
DROP INDEX "idx_warranties_serial_org";--> statement-breakpoint
ALTER TABLE "job_tasks" ALTER COLUMN "estimated_hours" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "job_tasks" ALTER COLUMN "actual_hours" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "allocated_serial_numbers" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_status" "invoice_status" DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_due_date" date;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "order_shipments" ADD COLUMN "shipping_cost" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "entity_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "warranties" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_agent_tasks" ADD COLUMN "cost" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD COLUMN "cost" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD COLUMN "regeneration_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_action_plans" ADD CONSTRAINT "customer_action_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_action_plans" ADD CONSTRAINT "customer_action_plans_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_action_plans" ADD CONSTRAINT "customer_action_plans_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customer_action_plans_org" ON "customer_action_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_customer_action_plans_customer" ON "customer_action_plans" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_action_plans_customer_active" ON "customer_action_plans" USING btree ("customer_id","is_completed");--> statement-breakpoint
CREATE INDEX "idx_customer_action_plans_priority" ON "customer_action_plans" USING btree ("organization_id","priority","is_completed");--> statement-breakpoint
CREATE INDEX "idx_customer_action_plans_due_date" ON "customer_action_plans" USING btree ("organization_id","due_date","is_completed");--> statement-breakpoint
CREATE INDEX "idx_order_payments_org_order" ON "order_payments" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_order_payments_org_date" ON "order_payments" USING btree ("organization_id","payment_date");--> statement-breakpoint
CREATE INDEX "idx_order_payments_org_method" ON "order_payments" USING btree ("organization_id","payment_method");--> statement-breakpoint
CREATE INDEX "idx_order_payments_order" ON "order_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_payments_date" ON "order_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_addresses_org" ON "addresses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_org" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_orders_org_invoice_status" ON "orders" USING btree ("organization_id","invoice_status");--> statement-breakpoint
CREATE INDEX "idx_inventory_serial_number" ON "inventory" USING btree ("serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_generated_documents_unique_per_entity" ON "generated_documents" USING btree ("organization_id","entity_type","entity_id","document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quotes_number_org_unique" ON "quotes" USING btree ("organization_id","quote_number") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_projects_org_number" ON "projects" USING btree ("organization_id","project_number") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranties_number_org" ON "warranties" USING btree ("organization_id","warranty_number") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranties_serial_org" ON "warranties" USING btree ("organization_id","product_serial") WHERE product_serial IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "ai_agent_tasks" DROP COLUMN "cost_cents";--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" DROP COLUMN "cost_cents";--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "recency_score_range" CHECK ("customer_health_metrics"."recency_score" IS NULL OR ("customer_health_metrics"."recency_score" >= $1 AND "customer_health_metrics"."recency_score" <= $2));--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "frequency_score_range" CHECK ("customer_health_metrics"."frequency_score" IS NULL OR ("customer_health_metrics"."frequency_score" >= $1 AND "customer_health_metrics"."frequency_score" <= $2));--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "monetary_score_range" CHECK ("customer_health_metrics"."monetary_score" IS NULL OR ("customer_health_metrics"."monetary_score" >= $1 AND "customer_health_metrics"."monetary_score" <= $2));--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "engagement_score_range" CHECK ("customer_health_metrics"."engagement_score" IS NULL OR ("customer_health_metrics"."engagement_score" >= $1 AND "customer_health_metrics"."engagement_score" <= $2));--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "overall_score_range" CHECK ("customer_health_metrics"."overall_score" IS NULL OR ("customer_health_metrics"."overall_score" >= $1 AND "customer_health_metrics"."overall_score" <= $2));--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "health_score_range" CHECK ("customers"."health_score" IS NULL OR ("customers"."health_score" >= $1 AND "customers"."health_score" <= $2));--> statement-breakpoint
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_price_valid_to_after_from" CHECK ("customer_product_prices"."valid_to" IS NULL OR "customer_product_prices"."valid_from" IS NULL OR "customer_product_prices"."valid_to" > "customer_product_prices"."valid_from");--> statement-breakpoint
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_price_discount_range" CHECK ("customer_product_prices"."discount_percent" IS NULL OR ("customer_product_prices"."discount_percent" >= $1 AND "customer_product_prices"."discount_percent" <= $2));--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "price_tier_max_qty_valid" CHECK ("product_price_tiers"."max_quantity" IS NULL OR "product_price_tiers"."min_quantity" IS NULL OR "product_price_tiers"."max_quantity" > "product_price_tiers"."min_quantity");--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "price_tier_discount_range" CHECK ("product_price_tiers"."discount_percent" IS NULL OR ("product_price_tiers"."discount_percent" >= $1 AND "product_price_tiers"."discount_percent" <= $2));--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "probability_range" CHECK ("opportunities"."probability" IS NULL OR ("opportunities"."probability" >= $1 AND "opportunities"."probability" <= $2));--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ADD CONSTRAINT "supplier_price_lists_quantity_range" CHECK ("supplier_price_lists"."max_quantity" IS NULL OR "supplier_price_lists"."min_quantity" IS NULL OR "supplier_price_lists"."max_quantity" >= "supplier_price_lists"."min_quantity");--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ADD CONSTRAINT "supplier_price_lists_date_range" CHECK ("supplier_price_lists"."expiry_date" IS NULL OR "supplier_price_lists"."effective_date" IS NULL OR "supplier_price_lists"."expiry_date" > "supplier_price_lists"."effective_date");--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ADD CONSTRAINT "supplier_price_lists_discount_range" CHECK ("supplier_price_lists"."discount_percent" IS NULL OR ("supplier_price_lists"."discount_percent" >= $1 AND "supplier_price_lists"."discount_percent" <= $2));--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_quality_rating_range" CHECK ("suppliers"."quality_rating" IS NULL OR ("suppliers"."quality_rating" >= $1 AND "suppliers"."quality_rating" <= $2));--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_delivery_rating_range" CHECK ("suppliers"."delivery_rating" IS NULL OR ("suppliers"."delivery_rating" >= $1 AND "suppliers"."delivery_rating" <= $2));--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_communication_rating_range" CHECK ("suppliers"."communication_rating" IS NULL OR ("suppliers"."communication_rating" >= $1 AND "suppliers"."communication_rating" <= $2));--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_overall_rating_range" CHECK ("suppliers"."overall_rating" IS NULL OR ("suppliers"."overall_rating" >= $1 AND "suppliers"."overall_rating" <= $2));--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_order_value_range" CHECK ("suppliers"."maximum_order_value" IS NULL OR "suppliers"."minimum_order_value" IS NULL OR "suppliers"."maximum_order_value" >= "suppliers"."minimum_order_value");--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_discount_range" CHECK ("purchase_order_items"."discount_percent" >= $1 AND "purchase_order_items"."discount_percent" <= $2);--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_tax_rate_range" CHECK ("purchase_order_items"."tax_rate" >= $1 AND "purchase_order_items"."tax_rate" <= $2);--> statement-breakpoint
ALTER TABLE "purchase_order_approval_rules" ADD CONSTRAINT "purchase_order_approval_rules_amount_range" CHECK ("purchase_order_approval_rules"."max_amount" IS NULL OR "purchase_order_approval_rules"."min_amount" IS NULL OR "purchase_order_approval_rules"."max_amount" >= "purchase_order_approval_rules"."min_amount");--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_date_range" CHECK ("price_agreements"."expiry_date" IS NULL OR "price_agreements"."effective_date" IS NULL OR "price_agreements"."expiry_date" > "price_agreements"."effective_date");--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_discount_range" CHECK ("price_agreements"."discount_percent" IS NULL OR ("price_agreements"."discount_percent" >= $1 AND "price_agreements"."discount_percent" <= $2));--> statement-breakpoint
CREATE POLICY "return_authorizations_select_policy" ON "return_authorizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "return_authorizations_insert_policy" ON "return_authorizations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "return_authorizations_update_policy" ON "return_authorizations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "return_authorizations_delete_policy" ON "return_authorizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_action_plans_select_policy" ON "customer_action_plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_action_plans_insert_policy" ON "customer_action_plans" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_action_plans_update_policy" ON "customer_action_plans" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_action_plans_delete_policy" ON "customer_action_plans" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_payments_select_policy" ON "order_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_payments_insert_policy" ON "order_payments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_payments_update_policy" ON "order_payments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_payments_delete_policy" ON "order_payments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));