CREATE TYPE "public"."bom_item_status" AS ENUM('planned', 'ordered', 'received', 'allocated', 'installed');--> statement-breakpoint
CREATE TYPE "public"."bom_status" AS ENUM('draft', 'approved', 'ordered', 'partial', 'complete', 'cancelled');--> statement-breakpoint
CREATE TABLE "project_bom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"bom_number" varchar(50) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" "bom_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(255),
	"description" text,
	"estimated_material_cost" numeric(12, 2),
	"actual_material_cost" numeric(12, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "project_bom" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_bom_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bom_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"quantity_estimated" numeric(12, 4) NOT NULL,
	"quantity_ordered" numeric(12, 4) DEFAULT '0',
	"quantity_received" numeric(12, 4) DEFAULT '0',
	"quantity_installed" numeric(12, 4) DEFAULT '0',
	"unit_cost_estimated" numeric(12, 4),
	"unit_cost_actual" numeric(12, 4),
	"status" "bom_item_status" DEFAULT 'planned' NOT NULL,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"site_visit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "project_bom_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD COLUMN "migrated_to_project_id" uuid;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD COLUMN "site_visit_id" uuid;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD COLUMN "workstream_id" uuid;--> statement-breakpoint
ALTER TABLE "project_bom" ADD CONSTRAINT "project_bom_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bom" ADD CONSTRAINT "project_bom_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bom" ADD CONSTRAINT "project_bom_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bom_items" ADD CONSTRAINT "project_bom_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bom_items" ADD CONSTRAINT "project_bom_items_bom_id_project_bom_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."project_bom"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bom_items" ADD CONSTRAINT "project_bom_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bom_items" ADD CONSTRAINT "project_bom_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_bom_org_project" ON "project_bom" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_project_bom_org_number" ON "project_bom" USING btree ("organization_id","bom_number");--> statement-breakpoint
CREATE INDEX "idx_project_bom_org_status" ON "project_bom" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_project_bom_items_org_bom" ON "project_bom_items" USING btree ("organization_id","bom_id");--> statement-breakpoint
CREATE INDEX "idx_project_bom_items_org_project" ON "project_bom_items" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_project_bom_items_org_product" ON "project_bom_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_project_bom_items_org_status" ON "project_bom_items" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_project_bom_items_site_visit" ON "project_bom_items" USING btree ("site_visit_id");--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_site_visit_id_site_visits_id_fk" FOREIGN KEY ("site_visit_id") REFERENCES "public"."site_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_workstream_id_project_workstreams_id_fk" FOREIGN KEY ("workstream_id") REFERENCES "public"."project_workstreams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_tasks_site_visit" ON "job_tasks" USING btree ("site_visit_id");--> statement-breakpoint
CREATE INDEX "idx_job_tasks_workstream" ON "job_tasks" USING btree ("workstream_id");--> statement-breakpoint
CREATE POLICY "project_bom_select_policy" ON "project_bom" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_insert_policy" ON "project_bom" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_update_policy" ON "project_bom" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_delete_policy" ON "project_bom" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_items_select_policy" ON "project_bom_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_items_insert_policy" ON "project_bom_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_items_update_policy" ON "project_bom_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_bom_items_delete_policy" ON "project_bom_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));