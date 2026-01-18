-- ============================================================================
-- Enable Row-Level Security on Core Tables
-- Migration: 0007_enable_rls_core_tables.sql
-- Created: 2026-01-17
--
-- SECURITY: This migration enables RLS as a defense-in-depth layer.
-- Application queries MUST still filter by organization_id.
-- RLS serves as a backup to prevent data leakage if a query is misconfigured.
--
-- Pattern: All multi-tenant tables use organization_id for isolation.
-- Policies check: organization_id = current_setting('app.organization_id')::uuid
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Set organization context
-- Call this at the start of each request after authentication
-- ============================================================================

CREATE OR REPLACE FUNCTION set_organization_context(org_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to get current org (returns null if not set)
CREATE OR REPLACE FUNCTION get_organization_context()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.organization_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_org_isolation" ON customers
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

-- Service role bypass for migrations and admin tasks
CREATE POLICY "customers_service_role" ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CONTACTS TABLE
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_org_isolation" ON contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = contacts.customer_id
      AND c.organization_id = get_organization_context()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = contacts.customer_id
      AND c.organization_id = get_organization_context()
    )
  );

CREATE POLICY "contacts_service_role" ON contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_org_isolation" ON orders
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "orders_service_role" ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ORDER LINE ITEMS TABLE
-- ============================================================================

ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_line_items_org_isolation" ON order_line_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_line_items.order_id
      AND o.organization_id = get_organization_context()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_line_items.order_id
      AND o.organization_id = get_organization_context()
    )
  );

CREATE POLICY "order_line_items_service_role" ON order_line_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_org_isolation" ON products
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "products_service_role" ON products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_org_isolation" ON inventory
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "inventory_service_role" ON inventory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- INVENTORY MOVEMENTS TABLE
-- ============================================================================

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_org_isolation" ON inventory_movements
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "inventory_movements_service_role" ON inventory_movements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_org_isolation" ON locations
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "locations_service_role" ON locations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- OPPORTUNITIES TABLE (Pipeline)
-- ============================================================================

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities_org_isolation" ON opportunities
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "opportunities_service_role" ON opportunities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- QUOTES TABLE (Pipeline)
-- ============================================================================

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_org_isolation" ON quotes
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "quotes_service_role" ON quotes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ACTIVITIES TABLE (Audit)
-- ============================================================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_org_isolation" ON activities
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "activities_service_role" ON activities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_org_isolation" ON jobs
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "jobs_service_role" ON jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications are user-scoped (user can only see their own)
CREATE POLICY "notifications_user_isolation" ON notifications
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_organization_context()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id = get_organization_context()
    AND user_id = auth.uid()
  );

CREATE POLICY "notifications_service_role" ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- EMAIL HISTORY TABLE
-- ============================================================================

ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_history_org_isolation" ON email_history
  FOR ALL
  TO authenticated
  USING (organization_id = get_organization_context())
  WITH CHECK (organization_id = get_organization_context());

CREATE POLICY "email_history_service_role" ON email_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- API TOKENS TABLE
-- ============================================================================

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens are user-scoped within org
CREATE POLICY "api_tokens_user_isolation" ON api_tokens
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_organization_context()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id = get_organization_context()
    AND user_id = auth.uid()
  );

CREATE POLICY "api_tokens_service_role" ON api_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENT: Tables NOT included in this migration
-- ============================================================================
-- organizations: Org table itself needs different policies (users see their own org)
-- users: Users table has auth.uid() based policies (already handled)
-- user_sessions: Session table has auth.uid() based policies (already handled)
--
-- These tables have their own RLS policies defined elsewhere or need special handling.
