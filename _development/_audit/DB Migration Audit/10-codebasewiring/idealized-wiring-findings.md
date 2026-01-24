# Idealized DB — Codebase Wiring Findings (Greenfield)

This document captures **full‑stack wiring requirements** as if the system were greenfield.
It enumerates *what must exist* across Drizzle schema, migrations, server functions,
Zod schemas, TanStack Query hooks, jobs/cron, and RLS.

## 1) Drizzle Schema Inventory (Greenfield)

### Shared/Infra
- `search_index`
- `search_index_outbox`
- `recent_items`
- `activities`
- `unified_activities` (view/MV)

### Settings
- `organizations`
- `system_settings`
- `custom_fields`
- `custom_field_values`
- `data_exports`
- `business_hours_config`
- `organization_holidays`
- `portal_branding` (or settings JSONB)

### Users
- `users`
- `user_sessions`
- `user_preferences`
- `user_invitations`
- `user_groups`
- `user_group_members`
- `user_delegations`
- `user_onboarding`
- `api_tokens`
- `customer_portal_sessions`

### Customers
- `customers`
- `contacts`
- `addresses`
- `customer_activities`
- `customer_tags`
- `customer_tag_assignments`
- `customer_health_metrics`
- `customer_priorities`
- `customer_merge_audit`

### Pipeline / Sales
- `opportunities` (with `follow_up_date`)
- `quotes`
- `quote_versions`
- `opportunity_activities`
- `win_loss_reasons`

### Orders & Fulfillment
- `orders`
- `order_line_items` (with pick fields)
- `order_amendments`
- `order_shipments`
- `shipment_items`
- `order_templates`
- `order_template_items`

### Products & Catalog
- `products`
- `categories`
- `product_price_tiers`
- `customer_product_prices`
- `price_history`
- `product_bundles`
- `product_images`
- `product_attributes`
- `product_attribute_values`
- `product_relations`

### Inventory & Warehousing
- `locations`
- `warehouse_locations`
- `inventory`
- `inventory_movements`
- `stock_counts`
- `stock_count_items`
- `inventory_cost_layers`
- `inventory_forecasts`
- `inventory_alerts`

### Jobs (Field Ops)
- `job_assignments`
- `job_tasks`
- `job_materials`
- `job_time_entries` (with `category`)
- `job_photos`
- `checklist_templates`
- `job_checklists`
- `job_checklist_items`
- `job_templates`

### Communications
- `email_history`
- `scheduled_emails`
- `email_campaigns`
- `campaign_recipients`
- `scheduled_calls`
- `email_signatures`
- `email_templates`

### Financial
- `credit_notes`
- `payment_schedules`
- `reminder_templates`
- `reminder_history`
- `statement_history`
- `revenue_recognition`
- `deferred_revenue`
- `payment_reminder_settings`

### Suppliers & Procurement
- `suppliers`
- `supplier_performance_metrics`
- `purchase_orders`
- `purchase_order_items`
- `purchase_order_receipts`
- `purchase_order_receipt_items`
- `purchase_order_approvals`
- `purchase_order_approval_rules`
- `purchase_order_amendments`
- `purchase_order_costs`
- `price_agreements`
- `supplier_price_lists`
- `supplier_price_history`
- `price_change_history`

### Support & SLA
- `issues`
- `issue_templates`
- `return_authorizations`
- `rma_line_items`
- `csat_responses`
- `sla_configurations`
- `sla_tracking`
- `sla_events`
- `escalation_rules`
- `escalation_history`
- `kb_categories`
- `kb_articles`

### Warranty
- `warranty_policies`
- `warranties`
- `warranty_claims`
- `warranty_extensions`

### Reports & Analytics
- `scheduled_reports`
- `custom_reports`
- `report_favorites`
- `targets`
- `dashboard_layouts`
- `mv_daily_metrics`
- `mv_daily_pipeline`
- `mv_daily_warranty`
- `mv_daily_jobs`
- `mv_current_state`

## 2) Migration & Index Requirements
- Additive migrations only; backfill before constraints.
- GIN index on `search_index.searchVector`.
- Unique `(organizationId, entityType, entityId)` on search and recent items.
- Composite list indexes `(organizationId, status, createdAt)` per domain.
- MV indexes on `(organizationId, day)` or `(organizationId, createdAt)`.

## 3) RLS Policies (Greenfield)
- Org‑scoped policies on all tenant tables.
- Join‑only tables must join to parent for org scoping.
- Customer portal policies (customer‑scoped).
- Subcontractor portal policies (job‑assignment scoped).
- Polymorphic allowlists for `entityType`.

## 4) Zod Schemas (Required for All APIs)
For each table:
- `Create*Schema`, `Update*Schema`, `*ParamsSchema`.
For APIs:
- Search, portal auth, reports CRUD, reminders, timeline, analytics.

## 5) Server Functions (TanStack Start)
Must exist for:
- Search: `globalSearch`, `quickSearch`, `reindex`, `indexStatus`.
- Portal: request magic link, verify token, list quotes/orders/jobs/invoices, submit ticket.
- Analytics: read MVs, refresh job trigger.
- Timeline: get customer timeline, log activity, email event ingestion.
- Roles: follow‑ups, reminders, approvals, picking workflows.

## 6) Drizzle Query Modules
Create query helpers per domain for reuse and consistent filtering:
- `src/server/db/*` or `src/server/queries/*` (standardize location).
- All queries must include `organizationId` filter.
- Use `db.transaction(...)` for bulk ops (atomicity).

## 7) TanStack Query Hooks
Greenfield hooks for:
- Cmd+K search + recent items.
- Portal views.
- Reports/analytics.
- Timeline.
- Role dashboards.

## 8) Jobs / Cron
- Outbox worker (search indexing).
- MV refresh (analytics).
- Scheduled reports delivery.
- Reminder automation.
- SLA breach checks.

## 9) Atomicity Rules
- Outbox writes are in the same DB transaction as entity changes.
- Bulk operations wrapped in `db.transaction`.
- Idempotent cron jobs (safe retries).

## 10) Validation & Testing
- RLS tests for org, portal, subcontractor.
- Search latency test (<500ms).
- Timeline pagination correctness.
- Analytics consistency tests vs source tables.
