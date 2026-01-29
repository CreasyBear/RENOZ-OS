ALTER TABLE "job_tasks" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "customer_satisfaction_rating" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "customer_feedback" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "handover_pack_url" text;--> statement-breakpoint
ALTER TABLE "project_files" ADD COLUMN "file_name" varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE "project_files" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "project_files" ADD COLUMN "mime_type" varchar(255);--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_tasks_project" ON "job_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_job_tasks_project_status" ON "job_tasks" USING btree ("project_id","status");