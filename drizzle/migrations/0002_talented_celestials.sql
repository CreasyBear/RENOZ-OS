CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"bucket" text DEFAULT 'attachments' NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "idx_customers_org_created";--> statement-breakpoint
DROP INDEX "idx_email_history_org_created";--> statement-breakpoint
DROP INDEX "idx_activities_timeline";--> statement-breakpoint
DROP INDEX "idx_notifications_user_created";--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "is_primary" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "is_primary" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "is_decision_maker" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "is_decision_maker" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attachments_storage_key_unique" ON "attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_attachments_org" ON "attachments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_entity" ON "attachments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_uploader" ON "attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_customers_org_created_id" ON "customers" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_customers_tags_gin" ON "customers" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_products_org_created_id" ON "products" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_products_tags_gin" ON "products" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_email_history_org_created_id" ON "email_history" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_activities_timeline" ON "activities" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE POLICY "attachments_select_policy" ON "attachments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "attachments_insert_policy" ON "attachments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "attachments_update_policy" ON "attachments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "attachments_delete_policy" ON "attachments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);