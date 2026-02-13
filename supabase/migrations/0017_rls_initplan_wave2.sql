-- ============================================================================
-- RLS InitPlan Wave 2: Fix auth_rls_initplan (0003)
-- Migration: 0017_rls_initplan_wave2.sql
--
-- Wave 2 tables: job_assignments, recent_items
-- ============================================================================

-- ============================================================================
-- 1) job_assignments: pi.auth_user_id = auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "job_assignments_portal_select_policy" ON public.job_assignments;
CREATE POLICY "job_assignments_portal_select_policy" ON public.job_assignments
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
    OR (EXISTS (
      SELECT 1
      FROM portal_identities pi
      WHERE pi.auth_user_id = (select auth.uid())
        AND pi.status = 'active'::portal_identity_status
        AND pi.organization_id = job_assignments.organization_id
        AND pi.scope = 'customer'::portal_scope
        AND pi.customer_id = job_assignments.customer_id
    ))
    OR (EXISTS (
      SELECT 1
      FROM portal_identities pi
      WHERE pi.auth_user_id = (select auth.uid())
        AND pi.status = 'active'::portal_identity_status
        AND pi.organization_id = job_assignments.organization_id
        AND pi.scope = 'subcontractor'::portal_scope
        AND pi.job_assignment_id = job_assignments.id
    ))
  );

-- ============================================================================
-- 2) recent_items: users.auth_id = auth.uid() in subqueries
-- ============================================================================
DROP POLICY IF EXISTS "recent_items_delete_policy" ON public.recent_items;
CREATE POLICY "recent_items_delete_policy" ON public.recent_items
  FOR DELETE
  TO authenticated
  USING (
    (organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
    AND (user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
  );

DROP POLICY IF EXISTS "recent_items_select_policy" ON public.recent_items;
CREATE POLICY "recent_items_select_policy" ON public.recent_items
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
    AND (user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
  );

DROP POLICY IF EXISTS "recent_items_update_policy" ON public.recent_items;
CREATE POLICY "recent_items_update_policy" ON public.recent_items
  FOR UPDATE
  TO authenticated
  USING (
    (organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
    AND (user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
  )
  WITH CHECK (
    (organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
    AND (user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
  );

DROP POLICY IF EXISTS "recent_items_insert_policy" ON public.recent_items;
CREATE POLICY "recent_items_insert_policy" ON public.recent_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
    AND (user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
  );
