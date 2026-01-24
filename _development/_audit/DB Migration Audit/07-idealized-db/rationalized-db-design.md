# Rationalized DB Design (Simple + Future‑Proof)

This document distills the idealized schema into a **simple, durable** database design
that avoids premature complexity while still supporting scale, security, and role needs.

## 1) Design Philosophy (Simple First)
- **Single source of truth** for each concept. No duplicate tables across domains.
- **Explicit relationships** > implicit join logic.
- **Minimal polymorphism**; only where the value is high (activities, custom fields).
- **Org‑scoped first**: every entity is scoped to `organizationId` unless strictly user‑only.
- **Stable identifiers**: UUIDs everywhere; external numbers are display‑only.
- **Write path is sacred**: avoid slow triggers on hot tables unless required.

## 2) Canonical Entities (Comprehensive, No Duplicates)

### Settings
- `organizations`
- `system_settings`
- `custom_fields`
- `custom_field_values`
- `data_exports`
- `business_hours_config`
- `organization_holidays`
- `portal_branding` (or settings JSONB)

### Users & Access
- `users`
- `user_sessions`
- `user_preferences`
- `user_invitations`
- `user_groups`
- `user_group_members`
- `user_delegations`
- `user_onboarding`
- `api_tokens`

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
- `opportunities`
- `quotes`
- `quote_versions`
- `opportunity_activities`
- `win_loss_reasons`

### Orders & Fulfillment
- `orders`
- `order_line_items`
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
- `job_time_entries`
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
- `issues` (support tickets)
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

### Reports & Dashboard
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

### Cross‑Domain Infrastructure
- `activities`
- `unified_activities` (table or view)
- `search_index`
- `search_index_outbox`
- `recent_items`
- `customer_portal_sessions`

## 3) Cross‑Domain Truths (Avoid Ambiguity)
- **Orders are invoice‑of‑record** (finalized).
- **Support tickets = `issues`** (no parallel `support_tickets`).
- **Portal = read‑only views** of core tables; do not duplicate data.

## 4) Search (Simple + Future‑Proof)
- **One table**: `search_index` (org‑scoped).
- **Event driven**: outbox table `search_index_outbox` for async indexing (finalized).
- **No polling**; index updates are enqueued on writes.
- **Simple ranking**: exact match > prefix match > full‑text rank.

## 5) Timeline (Avoid Data Duplication)
- Prefer a **view or materialized view** `unified_activities` over `activities + email_history`.
- Denormalize only what’s needed for fast lists: `customerId`, `activityType`, `createdAt`.
- Keep `activities` as canonical audit log.

## 6) RLS & Security (Trust is Non‑Negotiable)
- **Org‑scoped by default** for every table.
- Join‑only tables (no orgId) must have explicit RLS join rules.
- Polymorphic allowlists for `entityType` (activities, custom fields, SLA).
- Portal access uses **customer‑scoped policies**, not org‑scoped.
 - Subcontractor portal access uses **job‑scoped policies** with explicit assignment linkage.

## 7) Role Friction Points (Design Out Frustration)

### Admin / Manager
**Frustrations**
- Dashboard is slow or inconsistent.
- Approval queues unclear.
**Design**
- Materialized views for KPIs.
- Clear status fields + audit trail on approvals.

### Sales
**Frustrations**
- Can’t see customer history fast.
- Follow‑ups get lost.
**Design**
- `opportunities.follow_up_date` with index.
- Timeline view on customer detail and hover.

### Operations
**Frustrations**
- Picking status unclear; stock mismatches.
**Design**
- `order_line_items.pick_status`, `picked_at`, `picked_by`.
- Inventory movements are canonical for stock adjustments.

### Finance
**Frustrations**
- Invoice vs order mismatch; reminders not automated.
**Design**
- Orders as invoice‑of‑record.
- `payment_reminder_settings` + reminder history tied to orders.

### Field Tech
**Frustrations**
- Mobile sync unreliable, time logs inconsistent.
**Design**
- `job_time_entries.category` (work/travel/break).
- Version column on sync‑sensitive tables.

## 8) Edge Cases to Bake In
- **Soft delete** only where retention is required (customers/orders/products).
- **Ad‑hoc line items**: keep `order_line_items.productId` nullable but enforce naming.
- **Partial shipments**: shipment items link to line items with quantity splits.
- **Customer merges**: keep a merge audit table; never hard delete.
- **Email events**: idempotent webhook handling (avoid duplicates).
- **Search index staleness**: fall back to exact‑match queries for numbers.
 - **Portal access**: ensure subcontractor sees only assigned jobs and limited customer info.

## 9) Performance Without Over‑Engineering
- Composite indexes: `(organizationId, status, createdAt)` on list tables.
- Full‑text only where needed (search index + customers).
- Partitioning only for append‑only tables at scale (`activities`, `email_history`).

## 10) Full‑Stack Guidance (What to Build First)
1. **Schema basics** (missing tables + columns).
2. **RLS policies** (org + customer portal).
3. **Search index + recent items** (Cmd+K foundation).
4. **Timeline view** (customer 360).
5. **Role‑specific routes** (sales/ops/finance/admin defaults).

## 11) What We Explicitly Avoid (For Simplicity)
- Duplicate tables for invoices or support tickets unless required.
- Real‑time search via external engine (not needed yet).
- Complex polymorphic models beyond `activities`.
