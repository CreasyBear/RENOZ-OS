# Target Schema (Draft)

This is a consolidated target schema outline based on PRD requirements and current Drizzle definitions.

## Core Entities

### Identity & Org
- `organizations` (settings): org profile, settings, billing.
- `users` (users): identity, role, status, auth linkage.
- `user_groups`, `user_group_members`, `user_invitations`, `user_sessions`, `api_tokens`.

### CRM Core
- `customers`, `contacts`, `addresses`, `customer_activities`, `customer_tags`,
  `customer_tag_assignments`, `customer_health_metrics`, `customer_priorities`,
  `customer_merge_audit`.
- `opportunities`, `quotes`, `quote_versions`, `opportunity_activities`, `win_loss_reasons`.

### Catalog & Inventory
- `products`, `categories`, `product_price_tiers`, `customer_product_prices`,
  `price_history`, `product_bundles`, `product_images`, `product_attributes`,
  `product_attribute_values`, `product_relations`.
- `locations`, `warehouse_locations`, `inventory`, `inventory_movements`,
  `stock_counts`, `stock_count_items`, `inventory_cost_layers`,
  `inventory_forecasts`, `inventory_alerts`.

### Orders & Fulfillment
- `orders`, `order_line_items`, `order_amendments`, `order_shipments`,
  `shipment_items`, `order_templates`, `order_template_items`.
- `job_assignments`, `job_tasks`, `job_materials`, `job_time_entries`,
  `job_photos`, `job_checklists`, `job_checklist_items`, `checklist_templates`,
  `job_templates`.

### Communications
- `email_history`, `scheduled_emails`, `email_campaigns`,
  `campaign_recipients`, `scheduled_calls`, `email_signatures`, `email_templates`.

### Financial
- `credit_notes`, `payment_schedules`, `reminder_templates`, `reminder_history`,
  `statement_history`, `revenue_recognition`, `deferred_revenue`.

### Suppliers
- `suppliers`, `supplier_performance_metrics`, `purchase_orders`,
  `purchase_order_items`, `purchase_order_receipts`, `purchase_order_receipt_items`,
  `purchase_order_approvals`, `purchase_order_approval_rules`, `purchase_order_amendments`,
  `purchase_order_costs`, `price_agreements`, `supplier_price_lists`,
  `supplier_price_history`, `price_change_history`.

### Support & Warranty
- `issues`, `issue_templates`, `return_authorizations`, `rma_line_items`,
  `csat_responses`, `kb_categories`, `kb_articles`.
- `warranty_policies`, `warranties`, `warranty_claims`, `warranty_extensions`.

### Shared Infrastructure
- `activities` as cross-domain audit log.
- `sla_configurations`, `sla_tracking`, `sla_events`, `escalation_rules`, `escalation_history`.
- `business_hours_config`, `organization_holidays` (pending ownership decision).

### Analytics & Reporting
- `targets`, `scheduled_reports`, `dashboard_layouts`, `report_favorites`, `custom_reports`.
- Materialized views: `mv_daily_metrics`, `mv_daily_pipeline`, `mv_daily_warranty`,
  `mv_daily_jobs`, `mv_current_state`.

## Required Additions (not in Drizzle)
- Dashboard/reporting tables and materialized views.
- Dedicated `audit_logs` table (if not using `activities`).
- Role/permissions tables if required by role PRDs.

## Standardization Targets
- Enforce consistent `organizationId` in all tenant tables.
- Normalize money precision and count field types.
- Ensure explicit FKs on cross-domain references where PRD requires.
