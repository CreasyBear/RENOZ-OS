CREATE TYPE "public"."warranty_entitlement_evidence_type" AS ENUM('serialized', 'unitized');--> statement-breakpoint
CREATE TYPE "public"."warranty_entitlement_issue_code" AS ENUM('missing_serial_capture', 'policy_unresolved');--> statement-breakpoint
CREATE TYPE "public"."warranty_entitlement_status" AS ENUM('pending_activation', 'needs_review', 'activated', 'voided');--> statement-breakpoint

CREATE TABLE "warranty_owner_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" jsonb,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "warranty_owner_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE TABLE "warranty_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"shipment_item_id" uuid NOT NULL,
	"order_line_item_id" uuid NOT NULL,
	"commercial_customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"warranty_policy_id" uuid,
	"serialized_item_id" uuid,
	"product_serial" varchar(255),
	"unit_sequence" integer,
	"evidence_type" "warranty_entitlement_evidence_type" NOT NULL,
	"status" "warranty_entitlement_status" DEFAULT 'pending_activation' NOT NULL,
	"provisioning_issue_code" "warranty_entitlement_issue_code",
	"delivered_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

ALTER TABLE "warranties" ADD COLUMN "source_entitlement_id" uuid;--> statement-breakpoint
ALTER TABLE "warranties" ADD COLUMN "owner_record_id" uuid;--> statement-breakpoint
ALTER TABLE "warranties" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "warranty_owner_records" ADD CONSTRAINT "warranty_owner_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_shipment_id_order_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."order_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_order_line_item_id_order_line_items_id_fk" FOREIGN KEY ("order_line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_commercial_customer_id_customers_id_fk" FOREIGN KEY ("commercial_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_warranty_policy_id_warranty_policies_id_fk" FOREIGN KEY ("warranty_policy_id") REFERENCES "public"."warranty_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_entitlements" ADD CONSTRAINT "warranty_entitlements_serialized_item_id_serialized_items_id_fk" FOREIGN KEY ("serialized_item_id") REFERENCES "public"."serialized_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_source_entitlement_id_warranty_entitlements_id_fk" FOREIGN KEY ("source_entitlement_id") REFERENCES "public"."warranty_entitlements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_owner_record_id_warranty_owner_records_id_fk" FOREIGN KEY ("owner_record_id") REFERENCES "public"."warranty_owner_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "idx_warranty_owner_records_org" ON "warranty_owner_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_owner_records_org_name" ON "warranty_owner_records" USING btree ("organization_id","full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranty_entitlements_serialized_unique" ON "warranty_entitlements" USING btree ("organization_id","shipment_item_id","serialized_item_id") WHERE "warranty_entitlements"."serialized_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranty_entitlements_serial_text_unique" ON "warranty_entitlements" USING btree ("organization_id","shipment_item_id","product_serial") WHERE "warranty_entitlements"."product_serial" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranty_entitlements_unitized_unique" ON "warranty_entitlements" USING btree ("organization_id","shipment_item_id","unit_sequence") WHERE "warranty_entitlements"."unit_sequence" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_org_status" ON "warranty_entitlements" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_org_delivered" ON "warranty_entitlements" USING btree ("organization_id","delivered_at");--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_order" ON "warranty_entitlements" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_shipment" ON "warranty_entitlements" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_customer" ON "warranty_entitlements" USING btree ("commercial_customer_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_product" ON "warranty_entitlements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_entitlements_policy" ON "warranty_entitlements" USING btree ("warranty_policy_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_source_entitlement" ON "warranties" USING btree ("source_entitlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranties_source_entitlement_unique" ON "warranties" USING btree ("source_entitlement_id") WHERE "warranties"."source_entitlement_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_warranties_owner_record" ON "warranties" USING btree ("owner_record_id");--> statement-breakpoint

CREATE POLICY "warranty_owner_records_select_policy" ON "warranty_owner_records" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_owner_records_insert_policy" ON "warranty_owner_records" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_owner_records_update_policy" ON "warranty_owner_records" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_owner_records_delete_policy" ON "warranty_owner_records" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_entitlements_select_policy" ON "warranty_entitlements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_entitlements_insert_policy" ON "warranty_entitlements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_entitlements_update_policy" ON "warranty_entitlements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_entitlements_delete_policy" ON "warranty_entitlements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
