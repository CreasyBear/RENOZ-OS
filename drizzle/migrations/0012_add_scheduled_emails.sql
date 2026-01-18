-- Migration: Add scheduled_emails table
-- Story: DOM-COMMS-002a - Add Scheduled Emails Schema
-- Description: Creates table for scheduling emails to be sent at a future time

-- Create status enum for scheduled emails
DO $$ BEGIN
  CREATE TYPE "public"."scheduled_email_status" AS ENUM ('pending', 'sent', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the scheduled_emails table
CREATE TABLE IF NOT EXISTS "scheduled_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipient_email" text NOT NULL,
  "recipient_name" text,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "subject" text NOT NULL,
  "template_type" text NOT NULL,
  "template_data" jsonb DEFAULT '{}'::jsonb,
  "scheduled_at" timestamp with time zone NOT NULL,
  "timezone" text NOT NULL DEFAULT 'UTC',
  "status" "scheduled_email_status" NOT NULL DEFAULT 'pending',
  "sent_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancel_reason" text,
  "email_history_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_scheduled_emails_org_status" ON "scheduled_emails" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_scheduled_emails_scheduled_at" ON "scheduled_emails" ("scheduled_at", "status");
CREATE INDEX IF NOT EXISTS "idx_scheduled_emails_user" ON "scheduled_emails" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_emails_customer" ON "scheduled_emails" ("customer_id");
