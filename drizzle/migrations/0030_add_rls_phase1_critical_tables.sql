-- Add RLS Policies to Critical Tables (Phase 1)
-- This migration adds Row Level Security policies to high-priority tables
-- that store financial, inventory, and warranty data.

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

CREATE POLICY "products_select_policy" ON "products"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "products_insert_policy" ON "products"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "products_update_policy" ON "products"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "products_delete_policy" ON "products"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "inventory_select_policy" ON "inventory"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_insert_policy" ON "inventory"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_update_policy" ON "inventory"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_delete_policy" ON "inventory"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- INVENTORY_MOVEMENTS TABLE (append-only, no delete)
-- ============================================================================
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" FORCE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_select_policy" ON "inventory_movements"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_movements_insert_policy" ON "inventory_movements"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- STOCK_COUNTS TABLE
-- ============================================================================
ALTER TABLE "stock_counts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_counts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "stock_counts_select_policy" ON "stock_counts"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "stock_counts_insert_policy" ON "stock_counts"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "stock_counts_update_policy" ON "stock_counts"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "stock_counts_delete_policy" ON "stock_counts"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- INVENTORY_COST_LAYERS TABLE
-- ============================================================================
ALTER TABLE "inventory_cost_layers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_cost_layers" FORCE ROW LEVEL SECURITY;

CREATE POLICY "inventory_cost_layers_select_policy" ON "inventory_cost_layers"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_cost_layers_insert_policy" ON "inventory_cost_layers"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_cost_layers_update_policy" ON "inventory_cost_layers"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_cost_layers_delete_policy" ON "inventory_cost_layers"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- INVENTORY_FORECASTS TABLE
-- ============================================================================
ALTER TABLE "inventory_forecasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_forecasts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "inventory_forecasts_select_policy" ON "inventory_forecasts"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_forecasts_insert_policy" ON "inventory_forecasts"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_forecasts_update_policy" ON "inventory_forecasts"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_forecasts_delete_policy" ON "inventory_forecasts"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- INVENTORY_ALERTS TABLE
-- ============================================================================
ALTER TABLE "inventory_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_alerts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "inventory_alerts_select_policy" ON "inventory_alerts"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_alerts_insert_policy" ON "inventory_alerts"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_alerts_update_policy" ON "inventory_alerts"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "inventory_alerts_delete_policy" ON "inventory_alerts"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- WAREHOUSE_LOCATIONS TABLE
-- ============================================================================
ALTER TABLE "warehouse_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse_locations" FORCE ROW LEVEL SECURITY;

CREATE POLICY "warehouse_locations_select_policy" ON "warehouse_locations"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warehouse_locations_insert_policy" ON "warehouse_locations"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warehouse_locations_update_policy" ON "warehouse_locations"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warehouse_locations_delete_policy" ON "warehouse_locations"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- WARRANTIES TABLE
-- ============================================================================
ALTER TABLE "warranties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warranties" FORCE ROW LEVEL SECURITY;

CREATE POLICY "warranties_select_policy" ON "warranties"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranties_insert_policy" ON "warranties"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranties_update_policy" ON "warranties"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranties_delete_policy" ON "warranties"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- WARRANTY_CLAIMS TABLE
-- ============================================================================
ALTER TABLE "warranty_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warranty_claims" FORCE ROW LEVEL SECURITY;

CREATE POLICY "warranty_claims_select_policy" ON "warranty_claims"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranty_claims_insert_policy" ON "warranty_claims"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranty_claims_update_policy" ON "warranty_claims"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranty_claims_delete_policy" ON "warranty_claims"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- WARRANTY_POLICIES TABLE
-- ============================================================================
ALTER TABLE "warranty_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warranty_policies" FORCE ROW LEVEL SECURITY;

CREATE POLICY "warranty_policies_select_policy" ON "warranty_policies"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranty_policies_insert_policy" ON "warranty_policies"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranty_policies_update_policy" ON "warranty_policies"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "warranty_policies_delete_policy" ON "warranty_policies"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- CREDIT_NOTES TABLE
-- ============================================================================
ALTER TABLE "credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_notes" FORCE ROW LEVEL SECURITY;

CREATE POLICY "credit_notes_select_policy" ON "credit_notes"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "credit_notes_insert_policy" ON "credit_notes"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "credit_notes_update_policy" ON "credit_notes"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "credit_notes_delete_policy" ON "credit_notes"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" FORCE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select_policy" ON "suppliers"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "suppliers_insert_policy" ON "suppliers"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "suppliers_update_policy" ON "suppliers"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "suppliers_delete_policy" ON "suppliers"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- SUPPLIER_PERFORMANCE_METRICS TABLE
-- ============================================================================
ALTER TABLE "supplier_performance_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_performance_metrics" FORCE ROW LEVEL SECURITY;

CREATE POLICY "supplier_performance_metrics_select_policy" ON "supplier_performance_metrics"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "supplier_performance_metrics_insert_policy" ON "supplier_performance_metrics"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "supplier_performance_metrics_update_policy" ON "supplier_performance_metrics"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "supplier_performance_metrics_delete_policy" ON "supplier_performance_metrics"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- PURCHASE_ORDERS TABLE
-- ============================================================================
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_orders_select_policy" ON "purchase_orders"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "purchase_orders_insert_policy" ON "purchase_orders"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "purchase_orders_update_policy" ON "purchase_orders"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "purchase_orders_delete_policy" ON "purchase_orders"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- PURCHASE_ORDER_ITEMS TABLE
-- ============================================================================
ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_items_select_policy" ON "purchase_order_items"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "purchase_order_items_insert_policy" ON "purchase_order_items"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "purchase_order_items_update_policy" ON "purchase_order_items"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY "purchase_order_items_delete_policy" ON "purchase_order_items"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
