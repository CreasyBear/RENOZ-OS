-- Additional Orders Domain RLS Policies
-- Enables Row Level Security for multi-tenant isolation on:
-- - order_shipments
-- - shipment_items
-- - order_templates
-- - order_template_items
-- - order_amendments

-- ============================================================================
-- ENABLE RLS ON ORDER_SHIPMENTS TABLE
-- ============================================================================

ALTER TABLE "order_shipments" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see order shipments from their organization
CREATE POLICY "order_shipments_org_isolation" ON "order_shipments"
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

-- Service role bypass for server-side operations
CREATE POLICY "order_shipments_service_role" ON "order_shipments"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ENABLE RLS ON SHIPMENT_ITEMS TABLE
-- ============================================================================

ALTER TABLE "shipment_items" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see shipment items from their organization
CREATE POLICY "shipment_items_org_isolation" ON "shipment_items"
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

-- Service role bypass for server-side operations
CREATE POLICY "shipment_items_service_role" ON "shipment_items"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ENABLE RLS ON ORDER_TEMPLATES TABLE
-- ============================================================================

ALTER TABLE "order_templates" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see order templates from their organization
CREATE POLICY "order_templates_org_isolation" ON "order_templates"
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

-- Service role bypass for server-side operations
CREATE POLICY "order_templates_service_role" ON "order_templates"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ENABLE RLS ON ORDER_TEMPLATE_ITEMS TABLE
-- ============================================================================

ALTER TABLE "order_template_items" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see order template items from their organization
CREATE POLICY "order_template_items_org_isolation" ON "order_template_items"
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

-- Service role bypass for server-side operations
CREATE POLICY "order_template_items_service_role" ON "order_template_items"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ENABLE RLS ON ORDER_AMENDMENTS TABLE
-- ============================================================================

ALTER TABLE "order_amendments" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see order amendments from their organization
CREATE POLICY "order_amendments_org_isolation" ON "order_amendments"
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

-- Service role bypass for server-side operations
CREATE POLICY "order_amendments_service_role" ON "order_amendments"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
