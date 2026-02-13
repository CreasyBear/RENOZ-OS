-- ============================================================================
-- Auth Linkage and RLS Hardening
-- Migration: 0014_auth_linkage_and_rls_hardening.sql
-- Created: 2026-02-11
--
-- Fixes:
-- 1) Correct user-scoped RLS policies that incorrectly compared users.id to auth.uid()
-- 2) Correct storage helper function to map auth.uid() -> users.auth_id
-- 3) Add database-level FK constraints from app tables to auth.users
-- ============================================================================

-- ============================================================================
-- 1) FIX USER-SCOPED RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "notifications_user_isolation" ON public.notifications;
CREATE POLICY "notifications_user_isolation" ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_organization_context()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = notifications.user_id
        AND u.auth_id = auth.uid()
        AND u.organization_id = get_organization_context()
    )
  )
  WITH CHECK (
    organization_id = get_organization_context()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = notifications.user_id
        AND u.auth_id = auth.uid()
        AND u.organization_id = get_organization_context()
    )
  );

DROP POLICY IF EXISTS "api_tokens_user_isolation" ON public.api_tokens;
CREATE POLICY "api_tokens_user_isolation" ON public.api_tokens
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_organization_context()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = api_tokens.user_id
        AND u.auth_id = auth.uid()
        AND u.organization_id = get_organization_context()
    )
  )
  WITH CHECK (
    organization_id = get_organization_context()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = api_tokens.user_id
        AND u.auth_id = auth.uid()
        AND u.organization_id = get_organization_context()
    )
  );

-- ============================================================================
-- 2) FIX STORAGE HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION storage.get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION storage.get_user_organization_id() IS
  'Gets organization_id for current auth user. Maps auth.uid() to public.users.auth_id.';

-- ============================================================================
-- 3) ADD DB-LEVEL FOREIGN KEYS TO auth.users
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_id_auth_users_fk'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_id_auth_users_fk
      FOREIGN KEY (auth_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portal_identities_auth_user_id_auth_users_fk'
  ) THEN
    ALTER TABLE public.portal_identities
      ADD CONSTRAINT portal_identities_auth_user_id_auth_users_fk
      FOREIGN KEY (auth_user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Ensure new writes are indexed for FK checks and auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id_organization
  ON public.users (auth_id, organization_id);
