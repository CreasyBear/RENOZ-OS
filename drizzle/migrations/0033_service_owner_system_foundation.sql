ALTER TYPE "activity_entity_type" ADD VALUE IF NOT EXISTS 'service_system';--> statement-breakpoint
CREATE TYPE "public"."service_linkage_review_reason" AS ENUM('multiple_system_matches', 'conflicting_owner_match', 'backfill_manual_review');--> statement-breakpoint
CREATE TYPE "public"."service_linkage_review_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "service_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"normalized_full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"normalized_email" varchar(255),
	"phone" varchar(50),
	"normalized_phone" varchar(50),
	"address" jsonb,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"site_address" jsonb,
	"normalized_site_address_key" text,
	"commercial_customer_id" uuid,
	"source_order_id" uuid,
	"project_id" uuid,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_systems" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_system_ownerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_system_id" uuid NOT NULL,
	"service_owner_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"transfer_reason" text,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_system_ownerships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_linkage_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "service_linkage_review_status" DEFAULT 'pending' NOT NULL,
	"reason_code" "service_linkage_review_reason" NOT NULL,
	"source_warranty_id" uuid,
	"source_entitlement_id" uuid,
	"source_order_id" uuid,
	"project_id" uuid,
	"commercial_customer_id" uuid,
	"candidate_system_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolution_notes" text,
	"resolved_service_system_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "warranties" ADD COLUMN "service_system_id" uuid;--> statement-breakpoint
ALTER TABLE "service_owners" ADD CONSTRAINT "service_owners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_systems" ADD CONSTRAINT "service_systems_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_systems" ADD CONSTRAINT "service_systems_commercial_customer_id_customers_id_fk" FOREIGN KEY ("commercial_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_systems" ADD CONSTRAINT "service_systems_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_systems" ADD CONSTRAINT "service_systems_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_system_ownerships" ADD CONSTRAINT "service_system_ownerships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_system_ownerships" ADD CONSTRAINT "service_system_ownerships_service_system_id_service_systems_id_fk" FOREIGN KEY ("service_system_id") REFERENCES "public"."service_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_system_ownerships" ADD CONSTRAINT "service_system_ownerships_service_owner_id_service_owners_id_fk" FOREIGN KEY ("service_owner_id") REFERENCES "public"."service_owners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_source_warranty_id_warranties_id_fk" FOREIGN KEY ("source_warranty_id") REFERENCES "public"."warranties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_source_entitlement_id_warranty_entitlements_id_fk" FOREIGN KEY ("source_entitlement_id") REFERENCES "public"."warranty_entitlements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_commercial_customer_id_customers_id_fk" FOREIGN KEY ("commercial_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_resolved_service_system_id_service_systems_id_fk" FOREIGN KEY ("resolved_service_system_id") REFERENCES "public"."service_systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_linkage_reviews" ADD CONSTRAINT "service_linkage_reviews_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_service_owners_org" ON "service_owners" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_service_owners_org_name" ON "service_owners" USING btree ("organization_id","normalized_full_name");--> statement-breakpoint
CREATE INDEX "idx_service_owners_org_email" ON "service_owners" USING btree ("organization_id","normalized_email");--> statement-breakpoint
CREATE INDEX "idx_service_owners_org_phone" ON "service_owners" USING btree ("organization_id","normalized_phone");--> statement-breakpoint
CREATE INDEX "idx_service_systems_org" ON "service_systems" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_service_systems_org_address" ON "service_systems" USING btree ("organization_id","normalized_site_address_key");--> statement-breakpoint
CREATE INDEX "idx_service_systems_org_order" ON "service_systems" USING btree ("organization_id","source_order_id");--> statement-breakpoint
CREATE INDEX "idx_service_systems_org_project" ON "service_systems" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_service_systems_org_customer" ON "service_systems" USING btree ("organization_id","commercial_customer_id");--> statement-breakpoint
CREATE INDEX "idx_service_system_ownerships_org" ON "service_system_ownerships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_service_system_ownerships_system" ON "service_system_ownerships" USING btree ("service_system_id");--> statement-breakpoint
CREATE INDEX "idx_service_system_ownerships_owner" ON "service_system_ownerships" USING btree ("service_owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_service_system_ownerships_current_unique" ON "service_system_ownerships" USING btree ("service_system_id") WHERE "service_system_ownerships"."ended_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_service_linkage_reviews_org_status" ON "service_linkage_reviews" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_service_linkage_reviews_org_reason" ON "service_linkage_reviews" USING btree ("organization_id","reason_code");--> statement-breakpoint
CREATE INDEX "idx_service_linkage_reviews_source_warranty" ON "service_linkage_reviews" USING btree ("source_warranty_id");--> statement-breakpoint
CREATE INDEX "idx_service_linkage_reviews_source_entitlement" ON "service_linkage_reviews" USING btree ("source_entitlement_id");--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_service_system_id_service_systems_id_fk" FOREIGN KEY ("service_system_id") REFERENCES "public"."service_systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_warranties_service_system" ON "warranties" USING btree ("service_system_id");--> statement-breakpoint
CREATE POLICY "service_owners_select_policy" ON "service_owners" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_owners_insert_policy" ON "service_owners" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_owners_update_policy" ON "service_owners" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_owners_delete_policy" ON "service_owners" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_systems_select_policy" ON "service_systems" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_systems_insert_policy" ON "service_systems" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_systems_update_policy" ON "service_systems" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_systems_delete_policy" ON "service_systems" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_system_ownerships_select_policy" ON "service_system_ownerships" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_system_ownerships_insert_policy" ON "service_system_ownerships" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_system_ownerships_update_policy" ON "service_system_ownerships" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_system_ownerships_delete_policy" ON "service_system_ownerships" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_linkage_reviews_select_policy" ON "service_linkage_reviews" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_linkage_reviews_insert_policy" ON "service_linkage_reviews" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_linkage_reviews_update_policy" ON "service_linkage_reviews" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "service_linkage_reviews_delete_policy" ON "service_linkage_reviews" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
