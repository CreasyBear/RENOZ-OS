# Idealized Database Schema (Bible)

This document is the top-down, future-proof target schema for Renoz v3.
It consolidates domain ownership, cross-domain relationships, and role-driven needs.

## Migration Workflow Alignment (Research → Analyze → Plan → Implement → Review)
- **Research**: PRDs + Drizzle audit + role PRDs complete.
- **Analyze**: Cross-domain gaps and ownership conflicts identified.
- **Plan**: This idealized schema defines the target end state.
- **Implement**: Follow `target-schema-amendments.md` for staged changes.
- **Review**: Re-run RLS and performance checks after each phase.

## Domain Boundaries and Ownership
- **Settings**: organizations, system settings, custom fields, data exports, business hours, holidays.
- **Users**: users, groups, invitations, sessions, delegations, tokens.
- **Customers**: customers, contacts, addresses, customer activities, tags, health metrics.
- **Pipeline**: opportunities, quotes, quote versions, win/loss reasons.
- **Orders**: orders, line items, shipments, amendments, templates.
- **Products**: products, categories, pricing tiers, attributes, bundles, images.
- **Inventory**: locations, warehouse locations, inventory, stock counts, alerts.
- **Jobs**: job assignments, tasks, materials, time entries, checklists.
- **Communications**: email history, campaigns, scheduled calls/emails, templates.
- **Financial**: credit notes, payment schedules, statement history, revenue recognition.
- **Suppliers**: suppliers, purchase orders, approvals, receipts, pricing.
- **Support**: issues, SLA, KB, escalation, returns, CSAT.
- **Warranty**: policies, warranties, claims, extensions.
- **Reports**: scheduled reports, custom reports, report favorites.
- **Search**: search index and recent items.
- **Portal**: customer portal sessions and branding configuration.
- **Timeline**: unified customer timeline view/table.
- **Activities**: audit log for cross-domain event history.

## Cross-Domain Canonical References
- `orders.customerId -> customers.id`
- `order_line_items.productId -> products.id`
- `inventory.productId -> products.id`
- `warranties.productId -> products.id`
- `warranties.customerId -> customers.id`
- `financial.*.orderId -> orders.id` (unless invoices introduced)
- `jobs.orderId -> orders.id` (nullable)
- `support.return_authorizations.orderId -> orders.id`
- `support.rma_line_items.orderLineItemId -> order_line_items.id`
- `products.warrantyPolicyId -> warranty_policies.id`

## Role-Driven Schema Additions
- `opportunities.follow_up_date` (sales)
- `scheduled_reports` / `custom_reports` / `report_favorites` (admin/finance)
- `payment_reminder_settings` (finance)
- `job_time_entries.category` (field tech)
- `order_line_items.pick_status` + `picked_at` + `picked_by` (operations)

## Cross-Domain PRD Additions
- `search_index` + `recent_items` (global search)
- `unified_activities` (timeline aggregation)
- `customer_portal_sessions` (magic-link portal auth)

## Data Type Standards
- Money: numeric(12,2) across all currency values.
- Counts: integer for all counters.
- UUID primary keys for every table.
- JSONB only for flexible metadata, not core business attributes.

## Financial Source of Truth (Decision)
- **Orders are the invoice-of-record** (finalized).
- Financial tables reference `orderId` consistently; no `invoices` table planned.

## Search Indexing (Decision)
- Use **outbox-driven indexing** (`search_index_outbox`) for async, reliable updates.
- Triggers are optional for MVP only; outbox is the long-term path.

## Portal Extensions
- Customer portal uses read-only views of core tables.
- Extend portal model for **subcontractor access** via scoped sessions and role policies.

## Audit and Compliance
- `activities` is the canonical audit log.
- Use `createdBy`/`updatedBy` on operational tables.
- Use `deletedAt` only where retention needs justify soft deletes.

## Rollback Strategy (Schema Changes)
- Use additive migrations first (new tables/columns, nullable defaults).
- Backfill data in controlled batches.
- Enforce constraints after backfill is validated.
- Keep deprecated columns for one release before removal.
