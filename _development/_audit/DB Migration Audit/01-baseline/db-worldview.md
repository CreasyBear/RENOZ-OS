# DB World View (Initial)

This document captures the current understanding of renoz-v3 database intent based on Drizzle schemas and Zod validation schemas. It also lists early inconsistencies that require resolution before Supabase schema alignment.

## Sources Reviewed
- Drizzle schema: `drizzle/schema/_shared/*`, `drizzle/schema/users/*`, `drizzle/schema/settings/organizations.ts`
- Drizzle schema: `drizzle/schema/customers/customers.ts`
- Drizzle schema: `drizzle/schema/orders/*`
- Drizzle schema: `drizzle/schema/pipeline/pipeline.ts`
- Drizzle schema: `drizzle/schema/inventory/inventory.ts`
- Drizzle schema: `drizzle/schema/products/products.ts`
- Zod schemas: `src/lib/schemas/_shared/patterns.ts`
- Zod schemas: `src/lib/schemas/orders/orders.ts`
- Zod schemas: `src/lib/schemas/customers/customers.ts`
- Zod schemas: `src/lib/schemas/pipeline/pipeline.ts`
- Zod schemas: `src/lib/schemas/users/users.ts`
- PRD: `_Initiation/_prd/2-domains/dashboard/dashboard.prd.json`
- Prompt: `_Initiation/_prd/2-domains/dashboard/PROMPT.md`
- Supabase snapshot: `schema-snapshot-*.json` in `_development/_audit/`

## Domain Intent (From Schema)

### Users & Organizations
- Multi-tenant org model with organization settings, branding, and subscription placeholders.
- Users linked to Supabase Auth via `authId`; app-level profile stored in JSONB.
- Strong audit trail via `audit_logs` and `user_sessions`.
- Role and status enums centralized in `_shared/enums.ts`.

### Customers
- Full CRM model: customers, contacts, addresses, activities, tags, health metrics, priorities, and merge audit.
- Supports hierarchy (`parentId`), health scoring, credit hold, and rich tagging.
- Mix of relational tables and JSONB for flexible fields and metadata.

### Orders
- Order headers + line items + shipments + shipment items + amendments + templates.
- Supports payment status, tax types, and Xero integration.
- Shipment tracking and partial delivery supported.

### Pipeline
- Opportunities, activities, win/loss reasons, quote versions, and legacy quotes.
- Links opportunities to customers, contacts, and users.
- Quote versions store line items in JSONB.

### Products
- Full catalog with categories, attributes, bundles, images, relations, pricing tiers, and warranty policy linkage.
- Inventory-tracked products, tax types, and SKU uniqueness per organization.

### Inventory
- Locations, inventory stock, movements (append-only), stock counts, cost layers, forecasts, and alerts.
- Inventory movements include metadata for order/PO linkage.

### Activities
- Append-only activity log with entity polymorphism (`entityType`, `entityId`), action enums, and source tracking.
- Designed for organization-scoped querying and time-based feed analytics.

### Communications
- Email history with engagement tracking (open/click), scheduled emails and calls, campaigns, templates, and signatures.
- Campaigns use recipient criteria and per-recipient tracking with link back to `email_history`.

### Dashboard (BI)
- Dashboard domain expects dedicated core tables: `targets`, `scheduledReports`, `dashboardLayouts`.
- Heavy reliance on materialized views for pre-aggregated metrics (daily + current state).
- Hybrid query strategy: materialized views for historical, live tables for recent (24h).
- Target tracking and scheduled reporting are first-class entities with auditability.

## Early Inconsistencies / Violations (Schema vs Zod / PRD Intent)

### Users & Organizations
- **Organization fields**: Drizzle `organizations` includes `slug`, `abn`, `branding`, `plan`, `stripeCustomerId`, but does **not** include `createdBy`, `updatedBy`, `version`, or `domain` (which appear in user PRD).
- **User identity fields**: Drizzle uses `name` + JSONB `profile` while PRD expects `firstName`/`lastName` at top level.
- **User sessions**: Drizzle stores `ipAddress` as text (fine) but Zod expects nullable string; ok. No Zod schema for session creation exists yet.

### Customers
- **Timestamp types**: Drizzle stores several timestamps as `text` ISO strings (`healthScoreUpdatedAt`, `lastContactedAt`, `scheduledAt`, `completedAt`, `createdAt` in activities), while Zod often expects `datetime` strings or coerced Date. This is inconsistent with other tables using `timestamp`.
- **Tags**: Drizzle uses JSONB array for `tags` on `customers`; PRD specifies `text[]`. Not necessarily wrong but needs intentionality.
- **Contacts**: Zod uses `phoneSchema` which is optional; the create schema does not require any phone number even though fields exist in DB. This might be intentional but should be validated against requirements.

### Orders
- **Order line items naming**: PRD expects `orderItems` with snapshot fields (`productNameSnapshot`, `productSkuSnapshot`) but Drizzle uses `order_line_items` with `sku`/`description` only. Snapshot intent not explicitly represented.
- **Created/Updated by**: PRD requires `createdBy`/`updatedBy` NOT NULL with `ON DELETE SET NULL` (invalid combination); Drizzle uses nullable audit fields without constraints. Need final decision.
- **Order totals**: Zod create schema does not include totals and expects server calculation; Drizzle stores totals. OK but needs explicit calculation contract.
- **Order number**: Zod allows optional `orderNumber`, but Drizzle makes `orderNumber` required. Need generation strategy defined.

### Pipeline
- **Currency units**: Drizzle uses `currencyColumn` (numeric 12,2) but comments and Zod schemas treat values as **cents**. This is a critical mismatch.
- **Stage naming in comments**: Pipeline header comment mentions “Quoted/Pending” but enums are `proposal/negotiation`. Likely stale but needs cleanup.
- **Legacy quotes vs quoteVersions**: Both exist; needs clear canonical usage in domain logic and APIs.

### Activities
- **Changes structure**: PRD expects `changes` as `{ field: { old, new } }`, while schema uses `before/after` with optional `fields` list. Needs convergence.
- **Partitioning requirement**: PRD mandates monthly partitioning; schema notes migration needed but confirm implementation plan.

### Communications
- **Schema naming**: PRD references `email-history` table but Drizzle uses `email_history`. Likely fine but should be standardized in docs and queries.
- **Template categories**: PRD uses category set (quotes, orders, installations, warranty, support, custom) while Drizzle adds `marketing` and `follow_up`. Confirm intended taxonomy.

### Inventory
- **Table naming**: PRD defines `inventoryItems` and `warehouseLocations`, while Drizzle uses `inventory` and `locations` (plus a separate `warehouse-locations.ts`). Needs consistent naming and mapping.
- **Computed fields**: PRD expects `quantityAvailable` as a generated column; Drizzle uses a normal column without constraint or computed rule.
- **Quality status**: PRD includes `qualityStatus` on inventory items; Drizzle does not include it on `inventory` table (only `inventoryStatus`).
- **Serial tracking**: PRD expects `serialNumber` uniqueness; Drizzle has `serialNumber` field without a uniqueness constraint.

### Products
- **Audit requirements**: PRD requires `createdBy`/`updatedBy` NOT NULL; Drizzle uses nullable audit columns for products and related tables.
- **Tags storage**: PRD specifies `text[]` for tags; Drizzle stores tags in JSONB arrays.
- **Field naming**: PRD uses `productType` while Drizzle uses `type`.

### Dashboard
- **Missing schema**: No Drizzle schema exists for `targets`, `scheduledReports`, or `dashboardLayouts` yet, despite PRD requiring them.
- **Org ID naming**: Dashboard PRD uses `orgId` while the codebase standard is `organizationId`.
- **Multi-tenancy gap**: `dashboardLayouts` in PRD is user/role scoped only (no `orgId`), which may allow cross-org leakage unless implicitly scoped by user or RLS.
- **RLS expectations**: PRD acceptance criteria mention RLS, but no policies are defined yet.
- **Materialized views**: PRD mandates 5 MVs with retention and refresh cadence; none exist in schema.

### Cross-Domain
- **Organization ID naming**: PRDs sometimes use `orgId` while Drizzle uses `organizationId` (e.g., win/loss reasons in PRD). Need consistent naming across schema and APIs.
- **Audit logging vs activity logging**: Separate tables exist (`audit_logs` vs `activities`/`customer_activities`). Must ensure clear boundaries in domain events.
- **Supabase baseline drift**: Existing Supabase tables already implement a CRM-like schema with different naming and fields (e.g., `order_items`, `inventory_items`, `job_assignments`) vs renoz-v3 Drizzle design. Full diff required before migration.

## Next Steps (Immediate)
1. Confirm whether a "files" domain PRD exists (none found under `_Initiation/_prd/2-domains`).
2. Extend this document with any remaining domains after full PRD intake.
3. After full PRD intake, compare against Supabase schema via MCP.
