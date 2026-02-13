-- Migration: Allow fractional hours on job tasks
-- Convert estimated_hours and actual_hours to numeric for decimal support

ALTER TABLE "job_tasks"
  ALTER COLUMN "estimated_hours" TYPE numeric(8, 2)
  USING "estimated_hours"::numeric;

ALTER TABLE "job_tasks"
  ALTER COLUMN "actual_hours" TYPE numeric(8, 2)
  USING "actual_hours"::numeric;
