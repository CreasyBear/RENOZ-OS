ALTER TYPE "scheduled_email_status" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "scheduled_email_status" ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE "scheduled_emails"
  ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_error" text;

CREATE INDEX IF NOT EXISTS "idx_scheduled_emails_status_attempt"
  ON "scheduled_emails" ("organization_id", "status", "last_attempt_at");
