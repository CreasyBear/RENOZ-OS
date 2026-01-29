ALTER TABLE "job_materials" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "job_materials" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD COLUMN "site_visit_id" uuid;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_migrated_to_project_id_projects_id_fk" FOREIGN KEY ("migrated_to_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_task_id_job_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."job_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_site_visit_id_site_visits_id_fk" FOREIGN KEY ("site_visit_id") REFERENCES "public"."site_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_materials_project" ON "job_materials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_job_materials_task" ON "job_materials" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_job_time_entries_project" ON "job_time_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_job_time_entries_site_visit" ON "job_time_entries" USING btree ("site_visit_id");