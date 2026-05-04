CREATE TYPE "public"."issue_next_action_type" AS ENUM('create_rma', 'warranty_claim', 'field_service', 'customer_follow_up', 'monitor', 'no_action');--> statement-breakpoint
CREATE TYPE "public"."issue_resolution_category" AS ENUM('hardware_fault', 'shipping_damage', 'fulfillment_error', 'installation_issue', 'software_or_firmware', 'usage_guidance', 'no_fault_found', 'other');--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "resolved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "resolution_category" "issue_resolution_category";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "diagnosis_notes" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "next_action_type" "issue_next_action_type";--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_issues_resolution_category" ON "issues" USING btree ("organization_id","resolution_category");--> statement-breakpoint
CREATE INDEX "idx_issues_next_action_type" ON "issues" USING btree ("organization_id","next_action_type");
