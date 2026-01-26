-- Migration: Add RLS policies for organizations and user_sessions tables
-- Also fixes the user_invitations FK constraint
-- Generated: 2026-01-25

-- ============================================================================
-- ENABLE RLS ON organizations TABLE
-- ============================================================================

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;

-- Select policy: Users can only read their own organization
CREATE POLICY "organizations_select_policy"
  ON "organizations"
  FOR SELECT
  TO authenticated
  USING (id = current_setting('app.organization_id', true)::uuid);

-- Update policy: Users can only update their own organization
CREATE POLICY "organizations_update_policy"
  ON "organizations"
  FOR UPDATE
  TO authenticated
  USING (id = current_setting('app.organization_id', true)::uuid)
  WITH CHECK (id = current_setting('app.organization_id', true)::uuid);

-- ============================================================================
-- ENABLE RLS ON user_sessions TABLE
-- ============================================================================

ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;

-- Select policy: Users can only see sessions for users in their organization
CREATE POLICY "user_sessions_select_policy"
  ON "user_sessions"
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = current_setting('app.organization_id', true)::uuid
    )
  );

-- Delete policy: Users can only delete sessions for users in their organization
CREATE POLICY "user_sessions_delete_policy"
  ON "user_sessions"
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = current_setting('app.organization_id', true)::uuid
    )
  );

-- ============================================================================
-- FIX user_invitations FK CONSTRAINT
-- Change from ON DELETE SET NULL to ON DELETE CASCADE
-- This matches the NOT NULL constraint on invited_by column
-- ============================================================================

-- Drop existing constraint
ALTER TABLE "user_invitations"
  DROP CONSTRAINT IF EXISTS "user_invitations_invited_by_users_id_fk";

-- Add new constraint with CASCADE
ALTER TABLE "user_invitations"
  ADD CONSTRAINT "user_invitations_invited_by_users_id_fk"
  FOREIGN KEY ("invited_by")
  REFERENCES "users"("id")
  ON DELETE CASCADE;
