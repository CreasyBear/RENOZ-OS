CREATE TYPE "public"."quality_inspection_result" AS ENUM('pass', 'fail', 'conditional');--> statement-breakpoint
CREATE TYPE "public"."project_priority" AS ENUM('urgent', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('quoting', 'approved', 'in_progress', 'completed', 'cancelled', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('solar', 'battery', 'solar_battery', 'service', 'warranty', 'inspection', 'commissioning');--> statement-breakpoint
CREATE TYPE "public"."site_visit_photo_type" AS ENUM('before', 'during', 'after', 'issue', 'signature', 'receipt', 'document');--> statement-breakpoint
CREATE TYPE "public"."site_visit_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."site_visit_type" AS ENUM('assessment', 'installation', 'commissioning', 'service', 'warranty', 'inspection', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."project_note_status" AS ENUM('draft', 'completed', 'processing');--> statement-breakpoint
CREATE TYPE "public"."project_note_type" AS ENUM('general', 'meeting', 'audio', 'site_visit', 'client_feedback');--> statement-breakpoint
CREATE TYPE "public"."project_file_type" AS ENUM('proposal', 'contract', 'specification', 'drawing', 'photo', 'report', 'warranty', 'other');--> statement-breakpoint
CREATE TYPE "public"."certification_type" AS ENUM('solar_accredited', 'electrical_license', 'battery_certified', 'roofing_certified', 'first_aid', 'working_at_heights');--> statement-breakpoint
CREATE TYPE "public"."installer_skill" AS ENUM('solar_panels', 'battery_systems', 'electrical_work', 'roof_work', 'conduit_install', 'commissioning', 'diagnostics', 'customer_training');--> statement-breakpoint
CREATE TYPE "public"."installer_status" AS ENUM('active', 'busy', 'away', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('none', 'ute', 'van', 'truck', 'trailer');--> statement-breakpoint
CREATE TABLE "quality_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inspection_date" timestamp with time zone DEFAULT now() NOT NULL,
	"inspector_name" varchar(255) NOT NULL,
	"result" "quality_inspection_result" NOT NULL,
	"notes" text,
	"defects" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "email_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "template_category" DEFAULT 'custom' NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "email_template_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"project_type" "project_type" DEFAULT 'solar_battery' NOT NULL,
	"status" "project_status" DEFAULT 'quoting' NOT NULL,
	"priority" "project_priority" DEFAULT 'medium' NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid,
	"site_address" jsonb NOT NULL,
	"scope" jsonb DEFAULT '{"inScope":[],"outOfScope":[]}'::jsonb,
	"outcomes" jsonb DEFAULT '[]'::jsonb,
	"key_features" jsonb DEFAULT '{"p0":[],"p1":[],"p2":[]}'::jsonb,
	"start_date" date,
	"target_completion_date" date,
	"actual_completion_date" date,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"estimated_total_value" numeric(12, 2),
	"actual_total_cost" numeric(12, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_visit_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_visit_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "site_visit_photo_type" NOT NULL,
	"photo_url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"location" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "site_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"visit_number" varchar(50) NOT NULL,
	"visit_type" "site_visit_type" DEFAULT 'installation' NOT NULL,
	"status" "site_visit_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time,
	"estimated_duration" integer,
	"actual_start_time" text,
	"actual_end_time" text,
	"installer_id" uuid NOT NULL,
	"start_location" jsonb,
	"complete_location" jsonb,
	"notes" text,
	"internal_notes" text,
	"signature_url" text,
	"signed_by_name" text,
	"sign_off_token" text,
	"sign_off_token_expires_at" text,
	"confirmation_status" varchar(50),
	"confirmation_token" text,
	"confirmed_at" text,
	"customer_sign_off_name" text,
	"customer_sign_off_date" date,
	"customer_sign_off_confirmed" boolean DEFAULT false,
	"customer_rating" integer,
	"customer_feedback" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "site_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_url" text,
	"file_type" "project_file_type" DEFAULT 'other' NOT NULL,
	"description" text,
	"site_visit_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "project_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"site_visit_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text,
	"note_type" "project_note_type" DEFAULT 'general' NOT NULL,
	"status" "project_note_status" DEFAULT 'completed' NOT NULL,
	"audio_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "project_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_workstreams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"default_visit_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_workstreams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "installer_blockouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installer_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" varchar(255),
	"blockout_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "installer_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installer_id" uuid NOT NULL,
	"certification_type" "certification_type" NOT NULL,
	"license_number" varchar(255),
	"issuing_authority" varchar(255),
	"issue_date" date,
	"expiry_date" date,
	"is_verified" boolean DEFAULT false,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"document_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "installer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "installer_status" DEFAULT 'active' NOT NULL,
	"years_experience" integer DEFAULT 0,
	"vehicle_type" "vehicle_type" DEFAULT 'none',
	"vehicle_reg" varchar(50),
	"equipment" jsonb DEFAULT '[]'::jsonb,
	"max_jobs_per_day" integer DEFAULT 2 NOT NULL,
	"max_travel_km" integer,
	"working_hours" jsonb DEFAULT '{"monday":{"start":"08:00","end":"17:00","working":true},"tuesday":{"start":"08:00","end":"17:00","working":true},"wednesday":{"start":"08:00","end":"17:00","working":true},"thursday":{"start":"08:00","end":"17:00","working":true},"friday":{"start":"08:00","end":"17:00","working":true},"saturday":{"start":"08:00","end":"12:00","working":false},"sunday":{"start":"08:00","end":"12:00","working":false}}'::jsonb,
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(50),
	"emergency_contact_relationship" varchar(100),
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "installer_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "installer_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installer_id" uuid NOT NULL,
	"skill" "installer_skill" NOT NULL,
	"proficiency_level" integer DEFAULT 3 NOT NULL,
	"years_experience" integer DEFAULT 0,
	"projects_completed" integer DEFAULT 0,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installer_territories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installer_id" uuid NOT NULL,
	"postcode" varchar(20) NOT NULL,
	"suburb" varchar(255),
	"state" varchar(50),
	"priority" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "serial_numbers" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "installed_location" text;--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "installed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "photos" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "is_installed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "installed_by" uuid;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_versions" ADD CONSTRAINT "email_template_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_versions" ADD CONSTRAINT "email_template_versions_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit_photos" ADD CONSTRAINT "site_visit_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit_photos" ADD CONSTRAINT "site_visit_photos_site_visit_id_site_visits_id_fk" FOREIGN KEY ("site_visit_id") REFERENCES "public"."site_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit_photos" ADD CONSTRAINT "site_visit_photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_installer_id_users_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_workstreams" ADD CONSTRAINT "project_workstreams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_workstreams" ADD CONSTRAINT "project_workstreams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_blockouts" ADD CONSTRAINT "installer_blockouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_blockouts" ADD CONSTRAINT "installer_blockouts_installer_id_installer_profiles_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_certifications" ADD CONSTRAINT "installer_certifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_certifications" ADD CONSTRAINT "installer_certifications_installer_id_installer_profiles_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_certifications" ADD CONSTRAINT "installer_certifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_profiles" ADD CONSTRAINT "installer_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_profiles" ADD CONSTRAINT "installer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_skills" ADD CONSTRAINT "installer_skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_skills" ADD CONSTRAINT "installer_skills_installer_id_installer_profiles_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_territories" ADD CONSTRAINT "installer_territories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_territories" ADD CONSTRAINT "installer_territories_installer_id_installer_profiles_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_quality_inspections_org" ON "quality_inspections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_quality_inspections_inventory" ON "quality_inspections" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "idx_quality_inspections_product" ON "quality_inspections" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_quality_inspections_date" ON "quality_inspections" USING btree ("inspection_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_template_versions_template_version" ON "email_template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "idx_email_template_versions_org_template" ON "email_template_versions" USING btree ("organization_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_email_template_versions_template" ON "email_template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_email_template_versions_org_created" ON "email_template_versions" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_project_members_project_user" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_org_project" ON "project_members" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_projects_org_status" ON "projects" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_projects_org_customer" ON "projects" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_projects_org_type" ON "projects" USING btree ("organization_id","project_type");--> statement-breakpoint
CREATE INDEX "idx_projects_org_priority" ON "projects" USING btree ("organization_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_projects_org_number" ON "projects" USING btree ("organization_id","project_number");--> statement-breakpoint
CREATE INDEX "idx_projects_org_created" ON "projects" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_site_visit_photos_visit" ON "site_visit_photos" USING btree ("site_visit_id");--> statement-breakpoint
CREATE INDEX "idx_site_visit_photos_project" ON "site_visit_photos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_site_visit_photos_org_visit" ON "site_visit_photos" USING btree ("organization_id","site_visit_id");--> statement-breakpoint
CREATE INDEX "idx_site_visits_org_status" ON "site_visits" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_site_visits_org_project" ON "site_visits" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_site_visits_installer_date" ON "site_visits" USING btree ("installer_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_site_visits_org_date" ON "site_visits" USING btree ("organization_id","scheduled_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_site_visits_project_number" ON "site_visits" USING btree ("project_id","visit_number");--> statement-breakpoint
CREATE INDEX "idx_project_files_org_project" ON "project_files" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_project_files_site_visit" ON "project_files" USING btree ("site_visit_id");--> statement-breakpoint
CREATE INDEX "idx_project_notes_org_project" ON "project_notes" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_project_notes_project_created" ON "project_notes" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_project_notes_site_visit" ON "project_notes" USING btree ("site_visit_id");--> statement-breakpoint
CREATE INDEX "idx_workstreams_org_project" ON "project_workstreams" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_workstreams_project_position" ON "project_workstreams" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "idx_installer_blockouts_installer_date" ON "installer_blockouts" USING btree ("installer_id","start_date");--> statement-breakpoint
CREATE INDEX "idx_installer_blockouts_org_installer" ON "installer_blockouts" USING btree ("organization_id","installer_id");--> statement-breakpoint
CREATE INDEX "idx_installer_certifications_installer" ON "installer_certifications" USING btree ("installer_id");--> statement-breakpoint
CREATE INDEX "idx_installer_certifications_org_installer" ON "installer_certifications" USING btree ("organization_id","installer_id");--> statement-breakpoint
CREATE INDEX "idx_installer_certifications_type" ON "installer_certifications" USING btree ("certification_type");--> statement-breakpoint
CREATE INDEX "idx_installer_certifications_expiry" ON "installer_certifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_installer_profiles_org_user" ON "installer_profiles" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_installer_profiles_org_status" ON "installer_profiles" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_installer_profiles_user" ON "installer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_installer_skills_installer_skill" ON "installer_skills" USING btree ("installer_id","skill");--> statement-breakpoint
CREATE INDEX "idx_installer_skills_org_installer" ON "installer_skills" USING btree ("organization_id","installer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_installer_territories_installer_postcode" ON "installer_territories" USING btree ("installer_id","postcode");--> statement-breakpoint
CREATE INDEX "idx_installer_territories_postcode" ON "installer_territories" USING btree ("postcode");--> statement-breakpoint
CREATE INDEX "idx_installer_territories_org_postcode" ON "installer_territories" USING btree ("organization_id","postcode");--> statement-breakpoint
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "email_template_versions_select_policy" ON "email_template_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_template_versions_insert_policy" ON "email_template_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_template_versions_delete_policy" ON "email_template_versions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "projects_select_policy" ON "projects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "projects_insert_policy" ON "projects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "projects_update_policy" ON "projects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "projects_delete_policy" ON "projects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "site_visits_select_policy" ON "site_visits" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "site_visits_insert_policy" ON "site_visits" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "site_visits_update_policy" ON "site_visits" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "site_visits_delete_policy" ON "site_visits" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_files_select_policy" ON "project_files" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_files_insert_policy" ON "project_files" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_files_update_policy" ON "project_files" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_files_delete_policy" ON "project_files" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_notes_select_policy" ON "project_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_notes_insert_policy" ON "project_notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_notes_update_policy" ON "project_notes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "project_notes_delete_policy" ON "project_notes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "workstreams_select_policy" ON "project_workstreams" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "workstreams_insert_policy" ON "project_workstreams" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "workstreams_update_policy" ON "project_workstreams" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "workstreams_delete_policy" ON "project_workstreams" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_profiles_select_policy" ON "installer_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_profiles_insert_policy" ON "installer_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_profiles_update_policy" ON "installer_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "installer_profiles_delete_policy" ON "installer_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));