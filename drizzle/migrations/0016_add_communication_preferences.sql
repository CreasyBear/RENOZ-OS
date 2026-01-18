-- Migration: Add Communication Preferences to Contacts
-- Story: DOM-COMMS-005
-- Description: Add email and SMS opt-in columns to contacts table

-- ============================================================================
-- ADD PREFERENCE COLUMNS
-- ============================================================================

-- Email opt-in (default true for existing contacts)
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email_opt_in" boolean NOT NULL DEFAULT true;

-- SMS opt-in (default false for existing contacts)
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "sms_opt_in" boolean NOT NULL DEFAULT false;

-- Timestamps for when preferences were set (for compliance)
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email_opt_in_at" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "sms_opt_in_at" text;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding opted-in contacts for email campaigns
CREATE INDEX IF NOT EXISTS "idx_contacts_email_opt_in"
  ON "contacts"("organization_id", "email_opt_in")
  WHERE "email_opt_in" = true;

-- Index for finding opted-in contacts for SMS
CREATE INDEX IF NOT EXISTS "idx_contacts_sms_opt_in"
  ON "contacts"("organization_id", "sms_opt_in")
  WHERE "sms_opt_in" = true;
