-- Migration: Add Email Templates Table
-- Story: DOM-COMMS-007
-- Description: Create email_templates table for custom email templates with versioning

-- ============================================================================
-- ENUM
-- ============================================================================

CREATE TYPE "template_category" AS ENUM (
  'quotes',
  'orders',
  'installations',
  'warranty',
  'support',
  'marketing',
  'follow_up',
  'custom'
);

-- ============================================================================
-- EMAIL TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,

  -- Template details
  "name" text NOT NULL,
  "description" text,
  "category" "template_category" NOT NULL DEFAULT 'custom',

  -- Email content
  "subject" text NOT NULL,
  "body_html" text NOT NULL,

  -- Variables (JSON array)
  "variables" jsonb DEFAULT '[]'::jsonb,

  -- Versioning
  "version" integer NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "parent_template_id" uuid REFERENCES "email_templates"("id") ON DELETE SET NULL,

  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),

  -- Audit
  "created_by" uuid,
  "updated_by" uuid
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organization templates
CREATE INDEX IF NOT EXISTS "idx_email_templates_org"
  ON "email_templates"("organization_id");

-- Category lookup
CREATE INDEX IF NOT EXISTS "idx_email_templates_category"
  ON "email_templates"("organization_id", "category");

-- Active templates
CREATE INDEX IF NOT EXISTS "idx_email_templates_active"
  ON "email_templates"("organization_id", "is_active");

-- Version history lookup
CREATE INDEX IF NOT EXISTS "idx_email_templates_parent"
  ON "email_templates"("parent_template_id");

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;

-- Users can see their organization's templates
CREATE POLICY "email_templates_select_policy" ON "email_templates"
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can create templates for their organization
CREATE POLICY "email_templates_insert_policy" ON "email_templates"
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can update their organization's templates
CREATE POLICY "email_templates_update_policy" ON "email_templates"
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can delete their organization's templates
CREATE POLICY "email_templates_delete_policy" ON "email_templates"
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
