CREATE TYPE "public"."job_material_reservation_status" AS ENUM('pending', 'fulfilled', 'released', 'expired');--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'rma' BEFORE 'user';--> statement-breakpoint
CREATE TABLE "job_material_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_material_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"quantity_reserved" integer NOT NULL,
	"status" "job_material_reservation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_material_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_material_serial_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_material_id" uuid NOT NULL,
	"serial_number" text NOT NULL,
	"product_id" uuid NOT NULL,
	"installed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_material_serial_numbers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_material_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_material_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"caption" text,
	"taken_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_material_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_onboarding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installer_blockouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installer_certifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installer_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installer_territories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_reminder_settings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminder_history" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminder_templates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deferred_revenue" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "deferred_revenue" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "deferred_revenue" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "revenue_recognition" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "revenue_recognition" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "revenue_recognition" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "statement_history" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "customer_id_from_metadata" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "movement_id_from_metadata" uuid;--> statement-breakpoint
ALTER TABLE "installer_profiles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_material_reservations" ADD CONSTRAINT "job_material_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_reservations" ADD CONSTRAINT "job_material_reservations_job_material_id_job_materials_id_fk" FOREIGN KEY ("job_material_id") REFERENCES "public"."job_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_reservations" ADD CONSTRAINT "job_material_reservations_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_serial_numbers" ADD CONSTRAINT "job_material_serial_numbers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_serial_numbers" ADD CONSTRAINT "job_material_serial_numbers_job_material_id_job_materials_id_fk" FOREIGN KEY ("job_material_id") REFERENCES "public"."job_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_serial_numbers" ADD CONSTRAINT "job_material_serial_numbers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_photos" ADD CONSTRAINT "job_material_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_material_photos" ADD CONSTRAINT "job_material_photos_job_material_id_job_materials_id_fk" FOREIGN KEY ("job_material_id") REFERENCES "public"."job_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_material_reservations_org_job_material" ON "job_material_reservations" USING btree ("organization_id","job_material_id");--> statement-breakpoint
CREATE INDEX "idx_job_material_reservations_org_inventory" ON "job_material_reservations" USING btree ("organization_id","inventory_id");--> statement-breakpoint
CREATE INDEX "idx_job_material_reservations_status" ON "job_material_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_material_serial_numbers_org_job_material" ON "job_material_serial_numbers" USING btree ("organization_id","job_material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_job_material_serial_numbers_org_serial" ON "job_material_serial_numbers" USING btree ("organization_id","serial_number");--> statement-breakpoint
CREATE INDEX "idx_job_material_photos_org_job_material" ON "job_material_photos" USING btree ("organization_id","job_material_id");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_org" ON "user_onboarding" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_org" ON "user_preferences" USING btree ("organization_id");--> statement-breakpoint
CREATE POLICY "user_onboarding_select_policy" ON "user_onboarding" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_onboarding_insert_policy" ON "user_onboarding" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_onboarding_update_policy" ON "user_onboarding" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_onboarding_delete_policy" ON "user_onboarding" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_preferences_select_policy" ON "user_preferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_preferences_insert_policy" ON "user_preferences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_preferences_update_policy" ON "user_preferences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_preferences_delete_policy" ON "user_preferences" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_blockouts_select_policy" ON "installer_blockouts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_blockouts_insert_policy" ON "installer_blockouts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_blockouts_update_policy" ON "installer_blockouts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_blockouts_delete_policy" ON "installer_blockouts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_certifications_select_policy" ON "installer_certifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_certifications_insert_policy" ON "installer_certifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_certifications_update_policy" ON "installer_certifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_certifications_delete_policy" ON "installer_certifications" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_skills_select_policy" ON "installer_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_skills_insert_policy" ON "installer_skills" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_skills_update_policy" ON "installer_skills" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_skills_delete_policy" ON "installer_skills" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_territories_select_policy" ON "installer_territories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_territories_insert_policy" ON "installer_territories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_territories_update_policy" ON "installer_territories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_territories_delete_policy" ON "installer_territories" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_reservations_select_policy" ON "job_material_reservations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_reservations_insert_policy" ON "job_material_reservations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_reservations_update_policy" ON "job_material_reservations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_reservations_delete_policy" ON "job_material_reservations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_serial_numbers_select_policy" ON "job_material_serial_numbers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_serial_numbers_insert_policy" ON "job_material_serial_numbers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_serial_numbers_update_policy" ON "job_material_serial_numbers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_serial_numbers_delete_policy" ON "job_material_serial_numbers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_photos_select_policy" ON "job_material_photos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_photos_insert_policy" ON "job_material_photos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_photos_update_policy" ON "job_material_photos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_material_photos_delete_policy" ON "job_material_photos" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));