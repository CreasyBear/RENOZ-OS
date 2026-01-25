-- Update RLS Policies for Performance Optimization
-- This migration wraps current_setting() calls in SELECT subqueries
-- and adds missing CRUD policies to orders/order_line_items tables.

-- ============================================================================
-- ADD MISSING ORDERS TABLE CRUD POLICIES
-- (Table already has RLS enabled but only had portal policy)
-- ============================================================================

-- Standard org isolation policies (alongside existing portal policy)
CREATE POLICY "orders_select_policy" ON "orders"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "orders_insert_policy" ON "orders"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "orders_update_policy" ON "orders"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "orders_delete_policy" ON "orders"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- ADD MISSING ORDER_LINE_ITEMS TABLE CRUD POLICIES
-- ============================================================================

CREATE POLICY "order_line_items_select_policy" ON "order_line_items"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "order_line_items_insert_policy" ON "order_line_items"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "order_line_items_update_policy" ON "order_line_items"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "order_line_items_delete_policy" ON "order_line_items"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- NOTE: The existing pgPolicy definitions in Drizzle schema files have been
-- updated to use the SELECT wrapper pattern. When Drizzle generates migrations
-- for those policies, they will already have the optimized pattern.
--
-- Existing policies created via earlier migrations use the non-optimized pattern
-- but remain functional. A future migration can DROP and recreate them if needed.
-- ============================================================================
