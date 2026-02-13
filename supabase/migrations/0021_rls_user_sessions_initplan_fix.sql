-- ============================================================================
-- RLS InitPlan Fix: user_sessions
-- Migration: 0021_rls_user_sessions_initplan_fix.sql
--
-- Fix remaining auth_rls_initplan warnings for public.user_sessions by wrapping
-- current_setting() with (select ...) inside policy predicates.
-- ============================================================================

DROP POLICY IF EXISTS "user_sessions_delete_policy" ON public.user_sessions;
CREATE POLICY "user_sessions_delete_policy" ON public.user_sessions
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT users.id
      FROM users
      WHERE users.organization_id = ((select current_setting('app.organization_id'::text, true))::uuid)
    )
  );

DROP POLICY IF EXISTS "user_sessions_select_policy" ON public.user_sessions;
CREATE POLICY "user_sessions_select_policy" ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT users.id
      FROM users
      WHERE users.organization_id = ((select current_setting('app.organization_id'::text, true))::uuid)
    )
  );

