-- Orders Domain RLS Policies
-- Enables Row Level Security for multi-tenant isolation on orders and order_line_items tables.
-- Part of ORD-CORE-SCHEMA story.

-- ============================================================================
-- ENABLE RLS ON ORDERS TABLE
-- ============================================================================

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see orders from their organization
CREATE POLICY "orders_org_isolation" ON "orders"
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM "organization_members"
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM "organization_members"
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- ENABLE RLS ON ORDER_LINE_ITEMS TABLE
-- ============================================================================

ALTER TABLE "order_line_items" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see order line items from their organization
CREATE POLICY "order_line_items_org_isolation" ON "order_line_items"
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM "organization_members"
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM "organization_members"
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SERVICE ROLE BYPASS (for server-side operations)
-- ============================================================================

-- These policies allow the service role (used by server functions) to bypass RLS
-- This is needed because server functions run with elevated privileges

CREATE POLICY "orders_service_role" ON "orders"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "order_line_items_service_role" ON "order_line_items"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
