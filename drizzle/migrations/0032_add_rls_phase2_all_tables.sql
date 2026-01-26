-- Add RLS Policies to All Remaining Tables (Phase 2 - Complete Coverage)
-- This migration adds Row Level Security policies to all tables with organizationId
-- that were not covered in Phase 1.

-- ============================================================================
-- PRODUCTS DOMAIN
-- ============================================================================

-- Categories
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_policy" ON "categories"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "categories_insert_policy" ON "categories"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "categories_update_policy" ON "categories"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "categories_delete_policy" ON "categories"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Product Attributes
ALTER TABLE "product_attributes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_attributes" FORCE ROW LEVEL SECURITY;

CREATE POLICY "product_attributes_select_policy" ON "product_attributes"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_attributes_insert_policy" ON "product_attributes"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_attributes_update_policy" ON "product_attributes"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_attributes_delete_policy" ON "product_attributes"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Product Attribute Values
ALTER TABLE "product_attribute_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_attribute_values" FORCE ROW LEVEL SECURITY;

CREATE POLICY "product_attribute_values_select_policy" ON "product_attribute_values"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_attribute_values_insert_policy" ON "product_attribute_values"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_attribute_values_update_policy" ON "product_attribute_values"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_attribute_values_delete_policy" ON "product_attribute_values"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Product Bundles
ALTER TABLE "product_bundles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_bundles" FORCE ROW LEVEL SECURITY;

CREATE POLICY "product_bundles_select_policy" ON "product_bundles"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_bundles_insert_policy" ON "product_bundles"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_bundles_update_policy" ON "product_bundles"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_bundles_delete_policy" ON "product_bundles"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Product Images
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" FORCE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select_policy" ON "product_images"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_images_insert_policy" ON "product_images"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_images_update_policy" ON "product_images"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_images_delete_policy" ON "product_images"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Product Price Tiers
ALTER TABLE "product_price_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_price_tiers" FORCE ROW LEVEL SECURITY;

CREATE POLICY "product_price_tiers_select_policy" ON "product_price_tiers"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_price_tiers_insert_policy" ON "product_price_tiers"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_price_tiers_update_policy" ON "product_price_tiers"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "product_price_tiers_delete_policy" ON "product_price_tiers"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Customer Product Prices
ALTER TABLE "customer_product_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_product_prices" FORCE ROW LEVEL SECURITY;

CREATE POLICY "customer_product_prices_select_policy" ON "customer_product_prices"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "customer_product_prices_insert_policy" ON "customer_product_prices"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "customer_product_prices_update_policy" ON "customer_product_prices"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "customer_product_prices_delete_policy" ON "customer_product_prices"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Price History
ALTER TABLE "price_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY "price_history_select_policy" ON "price_history"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_history_insert_policy" ON "price_history"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_history_update_policy" ON "price_history"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_history_delete_policy" ON "price_history"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- OAUTH DOMAIN
-- ============================================================================

-- OAuth Calendar Events (already has RLS from 0001_oauth_tables.sql, adding FORCE)
ALTER TABLE "oauth_calendar_events" FORCE ROW LEVEL SECURITY;

-- OAuth Connections (already has RLS, adding FORCE)
ALTER TABLE "oauth_connections" FORCE ROW LEVEL SECURITY;

-- OAuth Sync Logs (already has RLS, adding FORCE)
ALTER TABLE "oauth_sync_logs" FORCE ROW LEVEL SECURITY;

-- OAuth Service Permissions (already has RLS, adding FORCE)
ALTER TABLE "oauth_service_permissions" FORCE ROW LEVEL SECURITY;

-- OAuth Contacts (already has RLS, adding FORCE)
ALTER TABLE "oauth_contacts" FORCE ROW LEVEL SECURITY;

-- OAuth Email Messages (already has RLS, adding FORCE)
ALTER TABLE "oauth_email_messages" FORCE ROW LEVEL SECURITY;

-- OAuth States (already has RLS, adding FORCE)
ALTER TABLE "oauth_states" FORCE ROW LEVEL SECURITY;

-- OAuth Sync States (already has RLS, adding FORCE)
ALTER TABLE "oauth_sync_states" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- SETTINGS DOMAIN
-- ============================================================================

-- Business Hours Config
ALTER TABLE "business_hours_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_hours_config" FORCE ROW LEVEL SECURITY;

CREATE POLICY "business_hours_config_select_policy" ON "business_hours_config"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "business_hours_config_insert_policy" ON "business_hours_config"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "business_hours_config_update_policy" ON "business_hours_config"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "business_hours_config_delete_policy" ON "business_hours_config"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Organization Holidays
ALTER TABLE "organization_holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_holidays" FORCE ROW LEVEL SECURITY;

CREATE POLICY "organization_holidays_select_policy" ON "organization_holidays"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "organization_holidays_insert_policy" ON "organization_holidays"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "organization_holidays_update_policy" ON "organization_holidays"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "organization_holidays_delete_policy" ON "organization_holidays"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- SUPPLIERS DOMAIN
-- ============================================================================

-- Price Agreements
ALTER TABLE "price_agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_agreements" FORCE ROW LEVEL SECURITY;

CREATE POLICY "price_agreements_select_policy" ON "price_agreements"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_agreements_insert_policy" ON "price_agreements"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_agreements_update_policy" ON "price_agreements"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_agreements_delete_policy" ON "price_agreements"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Price Change History
ALTER TABLE "price_change_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_change_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY "price_change_history_select_policy" ON "price_change_history"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_change_history_insert_policy" ON "price_change_history"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_change_history_update_policy" ON "price_change_history"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "price_change_history_delete_policy" ON "price_change_history"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Purchase Order Amendments
ALTER TABLE "purchase_order_amendments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_amendments" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_amendments_select_policy" ON "purchase_order_amendments"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_amendments_insert_policy" ON "purchase_order_amendments"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_amendments_update_policy" ON "purchase_order_amendments"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_amendments_delete_policy" ON "purchase_order_amendments"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Purchase Order Approvals
ALTER TABLE "purchase_order_approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_approvals" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_approvals_select_policy" ON "purchase_order_approvals"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_approvals_insert_policy" ON "purchase_order_approvals"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_approvals_update_policy" ON "purchase_order_approvals"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_approvals_delete_policy" ON "purchase_order_approvals"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Purchase Order Approval Rules
ALTER TABLE "purchase_order_approval_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_approval_rules" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_approval_rules_select_policy" ON "purchase_order_approval_rules"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_approval_rules_insert_policy" ON "purchase_order_approval_rules"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_approval_rules_update_policy" ON "purchase_order_approval_rules"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_approval_rules_delete_policy" ON "purchase_order_approval_rules"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Purchase Order Costs
ALTER TABLE "purchase_order_costs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_costs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_costs_select_policy" ON "purchase_order_costs"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_costs_insert_policy" ON "purchase_order_costs"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_costs_update_policy" ON "purchase_order_costs"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_costs_delete_policy" ON "purchase_order_costs"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Purchase Order Receipts
ALTER TABLE "purchase_order_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_receipts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_receipts_select_policy" ON "purchase_order_receipts"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_receipts_insert_policy" ON "purchase_order_receipts"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_receipts_update_policy" ON "purchase_order_receipts"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_receipts_delete_policy" ON "purchase_order_receipts"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Purchase Order Receipt Items
ALTER TABLE "purchase_order_receipt_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_receipt_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_receipt_items_select_policy" ON "purchase_order_receipt_items"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_receipt_items_insert_policy" ON "purchase_order_receipt_items"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_receipt_items_update_policy" ON "purchase_order_receipt_items"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "purchase_order_receipt_items_delete_policy" ON "purchase_order_receipt_items"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Supplier Price Lists
ALTER TABLE "supplier_price_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_price_lists" FORCE ROW LEVEL SECURITY;

CREATE POLICY "supplier_price_lists_select_policy" ON "supplier_price_lists"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "supplier_price_lists_insert_policy" ON "supplier_price_lists"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "supplier_price_lists_update_policy" ON "supplier_price_lists"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "supplier_price_lists_delete_policy" ON "supplier_price_lists"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Supplier Price History
ALTER TABLE "supplier_price_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_price_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY "supplier_price_history_select_policy" ON "supplier_price_history"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "supplier_price_history_insert_policy" ON "supplier_price_history"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "supplier_price_history_update_policy" ON "supplier_price_history"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "supplier_price_history_delete_policy" ON "supplier_price_history"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- FINANCIAL DOMAIN
-- ============================================================================

-- Payment Reminder Settings
ALTER TABLE "payment_reminder_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_reminder_settings" FORCE ROW LEVEL SECURITY;

CREATE POLICY "payment_reminder_settings_select_policy" ON "payment_reminder_settings"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "payment_reminder_settings_insert_policy" ON "payment_reminder_settings"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "payment_reminder_settings_update_policy" ON "payment_reminder_settings"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "payment_reminder_settings_delete_policy" ON "payment_reminder_settings"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Reminder Templates
ALTER TABLE "reminder_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY "reminder_templates_select_policy" ON "reminder_templates"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "reminder_templates_insert_policy" ON "reminder_templates"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "reminder_templates_update_policy" ON "reminder_templates"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "reminder_templates_delete_policy" ON "reminder_templates"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Reminder History
ALTER TABLE "reminder_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY "reminder_history_select_policy" ON "reminder_history"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "reminder_history_insert_policy" ON "reminder_history"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "reminder_history_update_policy" ON "reminder_history"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "reminder_history_delete_policy" ON "reminder_history"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Payment Schedules
ALTER TABLE "payment_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_schedules" FORCE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_select_policy" ON "payment_schedules"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "payment_schedules_insert_policy" ON "payment_schedules"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "payment_schedules_update_policy" ON "payment_schedules"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "payment_schedules_delete_policy" ON "payment_schedules"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Revenue Recognition
ALTER TABLE "revenue_recognition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revenue_recognition" FORCE ROW LEVEL SECURITY;

CREATE POLICY "revenue_recognition_select_policy" ON "revenue_recognition"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "revenue_recognition_insert_policy" ON "revenue_recognition"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "revenue_recognition_update_policy" ON "revenue_recognition"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "revenue_recognition_delete_policy" ON "revenue_recognition"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Deferred Revenue
ALTER TABLE "deferred_revenue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deferred_revenue" FORCE ROW LEVEL SECURITY;

CREATE POLICY "deferred_revenue_select_policy" ON "deferred_revenue"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "deferred_revenue_insert_policy" ON "deferred_revenue"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "deferred_revenue_update_policy" ON "deferred_revenue"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "deferred_revenue_delete_policy" ON "deferred_revenue"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Statement History
ALTER TABLE "statement_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "statement_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY "statement_history_select_policy" ON "statement_history"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "statement_history_insert_policy" ON "statement_history"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "statement_history_update_policy" ON "statement_history"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "statement_history_delete_policy" ON "statement_history"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- JOBS DOMAIN
-- ============================================================================

-- Checklist Templates
ALTER TABLE "checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY "checklist_templates_select_policy" ON "checklist_templates"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "checklist_templates_insert_policy" ON "checklist_templates"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "checklist_templates_update_policy" ON "checklist_templates"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "checklist_templates_delete_policy" ON "checklist_templates"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Job Checklists
ALTER TABLE "job_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_checklists" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_checklists_select_policy" ON "job_checklists"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_checklists_insert_policy" ON "job_checklists"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_checklists_update_policy" ON "job_checklists"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_checklists_delete_policy" ON "job_checklists"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Job Checklist Items
ALTER TABLE "job_checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_checklist_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_checklist_items_select_policy" ON "job_checklist_items"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_checklist_items_insert_policy" ON "job_checklist_items"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_checklist_items_update_policy" ON "job_checklist_items"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_checklist_items_delete_policy" ON "job_checklist_items"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Job Materials
ALTER TABLE "job_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_materials" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_materials_select_policy" ON "job_materials"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_materials_insert_policy" ON "job_materials"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_materials_update_policy" ON "job_materials"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_materials_delete_policy" ON "job_materials"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Job Tasks
ALTER TABLE "job_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_tasks_select_policy" ON "job_tasks"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_tasks_insert_policy" ON "job_tasks"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_tasks_update_policy" ON "job_tasks"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_tasks_delete_policy" ON "job_tasks"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Job Templates
ALTER TABLE "job_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_templates_select_policy" ON "job_templates"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_templates_insert_policy" ON "job_templates"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_templates_update_policy" ON "job_templates"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_templates_delete_policy" ON "job_templates"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Job Time Entries
ALTER TABLE "job_time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_time_entries" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_time_entries_select_policy" ON "job_time_entries"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_time_entries_insert_policy" ON "job_time_entries"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_time_entries_update_policy" ON "job_time_entries"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "job_time_entries_delete_policy" ON "job_time_entries"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- SUPPORT DOMAIN
-- ============================================================================

-- CSAT Responses
ALTER TABLE "csat_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "csat_responses" FORCE ROW LEVEL SECURITY;

CREATE POLICY "csat_responses_select_policy" ON "csat_responses"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "csat_responses_insert_policy" ON "csat_responses"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "csat_responses_update_policy" ON "csat_responses"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "csat_responses_delete_policy" ON "csat_responses"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Escalation Rules
ALTER TABLE "escalation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escalation_rules" FORCE ROW LEVEL SECURITY;

CREATE POLICY "escalation_rules_select_policy" ON "escalation_rules"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "escalation_rules_insert_policy" ON "escalation_rules"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "escalation_rules_update_policy" ON "escalation_rules"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "escalation_rules_delete_policy" ON "escalation_rules"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Escalation History
ALTER TABLE "escalation_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escalation_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY "escalation_history_select_policy" ON "escalation_history"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "escalation_history_insert_policy" ON "escalation_history"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "escalation_history_update_policy" ON "escalation_history"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "escalation_history_delete_policy" ON "escalation_history"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Issue Templates
ALTER TABLE "issue_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issue_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY "issue_templates_select_policy" ON "issue_templates"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "issue_templates_insert_policy" ON "issue_templates"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "issue_templates_update_policy" ON "issue_templates"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "issue_templates_delete_policy" ON "issue_templates"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Issues
ALTER TABLE "issues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issues" FORCE ROW LEVEL SECURITY;

CREATE POLICY "issues_select_policy" ON "issues"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "issues_insert_policy" ON "issues"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "issues_update_policy" ON "issues"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "issues_delete_policy" ON "issues"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- KB Categories
ALTER TABLE "kb_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kb_categories" FORCE ROW LEVEL SECURITY;

CREATE POLICY "kb_categories_select_policy" ON "kb_categories"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "kb_categories_insert_policy" ON "kb_categories"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "kb_categories_update_policy" ON "kb_categories"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "kb_categories_delete_policy" ON "kb_categories"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- KB Articles
ALTER TABLE "kb_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kb_articles" FORCE ROW LEVEL SECURITY;

CREATE POLICY "kb_articles_select_policy" ON "kb_articles"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "kb_articles_insert_policy" ON "kb_articles"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "kb_articles_update_policy" ON "kb_articles"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "kb_articles_delete_policy" ON "kb_articles"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- SLA Configurations
ALTER TABLE "sla_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sla_configurations" FORCE ROW LEVEL SECURITY;

CREATE POLICY "sla_configurations_select_policy" ON "sla_configurations"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_configurations_insert_policy" ON "sla_configurations"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_configurations_update_policy" ON "sla_configurations"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_configurations_delete_policy" ON "sla_configurations"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- SLA Events
ALTER TABLE "sla_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sla_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY "sla_events_select_policy" ON "sla_events"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_events_insert_policy" ON "sla_events"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_events_update_policy" ON "sla_events"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_events_delete_policy" ON "sla_events"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- SLA Tracking
ALTER TABLE "sla_tracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sla_tracking" FORCE ROW LEVEL SECURITY;

CREATE POLICY "sla_tracking_select_policy" ON "sla_tracking"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_tracking_insert_policy" ON "sla_tracking"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_tracking_update_policy" ON "sla_tracking"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "sla_tracking_delete_policy" ON "sla_tracking"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Warranty Extensions
ALTER TABLE "warranty_extensions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warranty_extensions" FORCE ROW LEVEL SECURITY;

CREATE POLICY "warranty_extensions_select_policy" ON "warranty_extensions"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "warranty_extensions_insert_policy" ON "warranty_extensions"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "warranty_extensions_update_policy" ON "warranty_extensions"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "warranty_extensions_delete_policy" ON "warranty_extensions"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- REPORTS / DASHBOARD DOMAIN
-- ============================================================================

-- Custom Reports
ALTER TABLE "custom_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_reports" FORCE ROW LEVEL SECURITY;

CREATE POLICY "custom_reports_select_policy" ON "custom_reports"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "custom_reports_insert_policy" ON "custom_reports"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "custom_reports_update_policy" ON "custom_reports"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "custom_reports_delete_policy" ON "custom_reports"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Dashboard Layouts
ALTER TABLE "dashboard_layouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dashboard_layouts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_layouts_select_policy" ON "dashboard_layouts"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "dashboard_layouts_insert_policy" ON "dashboard_layouts"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "dashboard_layouts_update_policy" ON "dashboard_layouts"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "dashboard_layouts_delete_policy" ON "dashboard_layouts"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Report Favorites
ALTER TABLE "report_favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_favorites" FORCE ROW LEVEL SECURITY;

CREATE POLICY "report_favorites_select_policy" ON "report_favorites"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "report_favorites_insert_policy" ON "report_favorites"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "report_favorites_update_policy" ON "report_favorites"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "report_favorites_delete_policy" ON "report_favorites"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Scheduled Reports
ALTER TABLE "scheduled_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_reports" FORCE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_reports_select_policy" ON "scheduled_reports"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "scheduled_reports_insert_policy" ON "scheduled_reports"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "scheduled_reports_update_policy" ON "scheduled_reports"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "scheduled_reports_delete_policy" ON "scheduled_reports"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Targets
ALTER TABLE "targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "targets" FORCE ROW LEVEL SECURITY;

CREATE POLICY "targets_select_policy" ON "targets"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "targets_insert_policy" ON "targets"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "targets_update_policy" ON "targets"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "targets_delete_policy" ON "targets"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- ============================================================================
-- MISC DOMAIN
-- ============================================================================

-- Notifications
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_policy" ON "notifications"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "notifications_insert_policy" ON "notifications"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "notifications_update_policy" ON "notifications"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "notifications_delete_policy" ON "notifications"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Automation Jobs
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_policy" ON "jobs"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "jobs_insert_policy" ON "jobs"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "jobs_update_policy" ON "jobs"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
CREATE POLICY "jobs_delete_policy" ON "jobs"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
