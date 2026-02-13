-- ============================================================================
-- RLS InitPlan Wave 1: Fix auth_rls_initplan (0003)
-- Migration: 0015_rls_initplan_wave1.sql
--
-- Fixes RLS policies that call auth.uid() or get_organization_context()
-- per-row by wrapping them in (select ...) so they execute once per query.
-- Preserves semantics exactly; no access changes.
--
-- Wave 1 tables: users, portal_identities, notifications, api_tokens,
-- order_line_items, orders, quote_versions, quotes
-- ============================================================================

-- ============================================================================
-- 1) users: auth_id = auth.uid() -> (select auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = (select auth.uid()))
    OR (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
  );

-- ============================================================================
-- 2) portal_identities: auth_user_id = auth.uid() -> (select auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "portal_identities_select_policy" ON public.portal_identities;
CREATE POLICY "portal_identities_select_policy" ON public.portal_identities
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
    OR (auth_user_id = (select auth.uid()))
  );

-- ============================================================================
-- 3) notifications_user_isolation: u.auth_id = auth.uid(), get_organization_context()
-- ============================================================================
DROP POLICY IF EXISTS "notifications_user_isolation" ON public.notifications;
CREATE POLICY "notifications_user_isolation" ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    organization_id = (select get_organization_context())
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = notifications.user_id
        AND u.auth_id = (select auth.uid())
        AND u.organization_id = (select get_organization_context())
    )
  )
  WITH CHECK (
    organization_id = (select get_organization_context())
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = notifications.user_id
        AND u.auth_id = (select auth.uid())
        AND u.organization_id = (select get_organization_context())
    )
  );

-- ============================================================================
-- 4a) api_tokens_org_isolation: users.auth_id = auth.uid() in subquery
-- ============================================================================
DROP POLICY IF EXISTS "api_tokens_org_isolation" ON public.api_tokens;
CREATE POLICY "api_tokens_org_isolation" ON public.api_tokens
  FOR ALL
  TO authenticated
  USING (
    organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    )
  );

-- ============================================================================
-- 4b) api_tokens_owner_access: auth.uid() in subqueries
-- ============================================================================
DROP POLICY IF EXISTS "api_tokens_owner_access" ON public.api_tokens;
CREATE POLICY "api_tokens_owner_access" ON public.api_tokens
  FOR ALL
  TO authenticated
  USING (
    (user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_id = (select auth.uid())
      LIMIT 1
    ))
    OR (EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = (select auth.uid())
        AND users.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])
        AND users.organization_id = api_tokens.organization_id
    ))
  );

-- ============================================================================
-- 4c) api_tokens_user_isolation: same pattern
-- ============================================================================
DROP POLICY IF EXISTS "api_tokens_user_isolation" ON public.api_tokens;
CREATE POLICY "api_tokens_user_isolation" ON public.api_tokens
  FOR ALL
  TO authenticated
  USING (
    organization_id = (select get_organization_context())
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = api_tokens.user_id
        AND u.auth_id = (select auth.uid())
        AND u.organization_id = (select get_organization_context())
    )
  )
  WITH CHECK (
    organization_id = (select get_organization_context())
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = api_tokens.user_id
        AND u.auth_id = (select auth.uid())
        AND u.organization_id = (select get_organization_context())
    )
  );

-- ============================================================================
-- 5) order_line_items_portal_select_policy: pi.auth_user_id = auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "order_line_items_portal_select_policy" ON public.order_line_items;
CREATE POLICY "order_line_items_portal_select_policy" ON public.order_line_items
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
    OR (EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.id = order_line_items.order_id
        AND o.organization_id = order_line_items.organization_id
        AND (
          (EXISTS (
            SELECT 1
            FROM portal_identities pi
            WHERE pi.auth_user_id = (select auth.uid())
              AND pi.status = 'active'::portal_identity_status
              AND pi.organization_id = order_line_items.organization_id
              AND pi.scope = 'customer'::portal_scope
              AND pi.customer_id = o.customer_id
          ))
          OR (EXISTS (
            SELECT 1
            FROM portal_identities pi
            JOIN job_assignments ja ON ja.id = pi.job_assignment_id
            WHERE pi.auth_user_id = (select auth.uid())
              AND pi.status = 'active'::portal_identity_status
              AND pi.organization_id = order_line_items.organization_id
              AND pi.scope = 'subcontractor'::portal_scope
              AND ja.order_id = o.id
          ))
        )
    ))
  );

-- ============================================================================
-- 6) orders_portal_select_policy: pi.auth_user_id = auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "orders_portal_select_policy" ON public.orders;
CREATE POLICY "orders_portal_select_policy" ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
    OR (EXISTS (
      SELECT 1
      FROM portal_identities pi
      WHERE pi.auth_user_id = (select auth.uid())
        AND pi.status = 'active'::portal_identity_status
        AND pi.organization_id = orders.organization_id
        AND pi.scope = 'customer'::portal_scope
        AND pi.customer_id = orders.customer_id
    ))
    OR (EXISTS (
      SELECT 1
      FROM portal_identities pi
      JOIN job_assignments ja ON ja.id = pi.job_assignment_id
      WHERE pi.auth_user_id = (select auth.uid())
        AND pi.status = 'active'::portal_identity_status
        AND pi.organization_id = orders.organization_id
        AND pi.scope = 'subcontractor'::portal_scope
        AND ja.order_id = orders.id
    ))
  );

-- ============================================================================
-- 7) quote_versions_portal_select_policy: pi.auth_user_id = auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "quote_versions_portal_select_policy" ON public.quote_versions;
CREATE POLICY "quote_versions_portal_select_policy" ON public.quote_versions
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
    OR (EXISTS (
      SELECT 1
      FROM portal_identities pi
      JOIN opportunities o ON o.id = quote_versions.opportunity_id
      WHERE pi.auth_user_id = (select auth.uid())
        AND pi.status = 'active'::portal_identity_status
        AND pi.organization_id = quote_versions.organization_id
        AND pi.scope = 'customer'::portal_scope
        AND pi.customer_id = o.customer_id
    ))
  );

-- ============================================================================
-- 8) quotes_portal_select_policy: pi.auth_user_id = auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "quotes_portal_select_policy" ON public.quotes;
CREATE POLICY "quotes_portal_select_policy" ON public.quotes
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = ( SELECT (current_setting('app.organization_id'::text, true))::uuid ))
    OR (EXISTS (
      SELECT 1
      FROM portal_identities pi
      WHERE pi.auth_user_id = (select auth.uid())
        AND pi.status = 'active'::portal_identity_status
        AND pi.organization_id = quotes.organization_id
        AND pi.scope = 'customer'::portal_scope
        AND pi.customer_id = quotes.customer_id
    ))
  );
