-- Migration: Add Email Signatures Table
-- Story: DOM-COMMS-006
-- Description: Create email_signatures table for personal and company signatures

-- ============================================================================
-- EMAIL SIGNATURES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "email_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,

  -- Owner (null for company-wide signatures)
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,

  -- Signature details
  "name" text NOT NULL,
  "content" text NOT NULL,

  -- Flags
  "is_default" boolean NOT NULL DEFAULT false,
  "is_company_wide" boolean NOT NULL DEFAULT false,

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

-- User's signatures
CREATE INDEX IF NOT EXISTS "idx_email_signatures_user"
  ON "email_signatures"("user_id");

-- Organization signatures (for company-wide)
CREATE INDEX IF NOT EXISTS "idx_email_signatures_org"
  ON "email_signatures"("organization_id");

-- Default signature lookup
CREATE INDEX IF NOT EXISTS "idx_email_signatures_default"
  ON "email_signatures"("organization_id", "user_id", "is_default");

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE "email_signatures" ENABLE ROW LEVEL SECURITY;

-- Users can see their own signatures and company-wide signatures
CREATE POLICY "email_signatures_select_policy" ON "email_signatures"
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR user_id IS NULL
      OR is_company_wide = true
    )
  );

-- Users can create their own signatures
CREATE POLICY "email_signatures_insert_policy" ON "email_signatures"
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Users can update their own signatures
CREATE POLICY "email_signatures_update_policy" ON "email_signatures"
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Users can delete their own signatures
CREATE POLICY "email_signatures_delete_policy" ON "email_signatures"
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );
