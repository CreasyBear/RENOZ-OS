# Premortem Analysis: Schema Foundation Implementation
Created: 2026-01-17
Author: architect-agent

## Executive Summary

This premortem analysis examines the renoz-v3 Schema Foundation implementation for potential failure modes across five critical dimensions: scale (10k+ records), data integrity, operational failures, integration points, and multi-tenancy isolation.

**Overall Risk Assessment: MEDIUM-HIGH**
- Several structural issues require attention before production
- Multi-tenancy isolation has gaps
- Scale performance needs index review
- Some data integrity edge cases unaddressed

---

## Risk Matrix Overview

| Risk Category | Critical | High | Medium | Low |
|--------------|----------|------|--------|-----|
| Scale (10k+ records) | 1 | 3 | 4 | 2 |
| Data Integrity | 2 | 2 | 3 | 1 |
| Operational | 0 | 2 | 3 | 2 |
| Integration Points | 1 | 2 | 2 | 1 |
| Multi-tenancy | 2 | 3 | 1 | 0 |
| **Total** | **6** | **12** | **13** | **6** |

---

## 1. Scale Risks (10k+ Records Per Table)

### CRITICAL: RISK-SCALE-001 - Email History Table Growth

**Location:** `drizzle/schema/email-history.ts`

**Issue:** Append-only table without partitioning strategy or archival mechanism.

**Scenario:** At 100 emails/day/org with 50 organizations = 1.8M records/year. Table scans for campaign analytics become slow.

**Evidence:**
- No `deletedAt` column (by design - append-only)
- Body columns (`bodyHtml`, `bodyText`) stored inline - bloats table
- Campaign queries span entire table history

**Impact:** HIGH - Query performance degradation, increased storage costs
**Likelihood:** HIGH - Email volume is predictable and will grow
**Risk Score:** CRITICAL

**Mitigations:**
1. Add time-based partitioning (monthly/quarterly)
2. Move `bodyHtml`/`bodyText` to separate `email_bodies` table with FK
3. Implement archival policy (move to cold storage after 1 year)
4. Add composite index on `(organizationId, createdAt)` for time-bounded queries

---

### HIGH: RISK-SCALE-002 - Activities Table Unbounded Growth

**Location:** `drizzle/schema/activities.ts`

**Issue:** Central audit trail for ALL entity changes grows exponentially.

**Evidence:**
```typescript
// Every CRUD operation creates an activity
entityType: activityEntityTypeEnum("entity_type").notNull(),
entityId: uuid("entity_id").notNull(),
action: activityActionEnum("action").notNull(),
```

**Scenario:** 10 entities x 100 operations/day/entity x 50 orgs = 50k activities/day = 18M/year

**Impact:** HIGH - Audit queries slow, storage explosion
**Likelihood:** HIGH - Audit logging by design captures everything

**Mitigations:**
1. Time-based partitioning on `createdAt`
2. Consider separate `activities_archive` table for old records
3. Add retention policy (e.g., 90 days hot, then archive)
4. Ensure `idx_activities_timeline` index is used for recent queries

---

### HIGH: RISK-SCALE-003 - Inventory Movements Table Growth

**Location:** `drizzle/schema/inventory.ts`

**Issue:** Every stock change creates immutable movement record.

**Evidence:**
```typescript
// Append-only: only createdAt, no updatedAt
createdAt: timestampColumns.createdAt,
createdBy: auditColumns.createdBy,
```

**Impact:** MEDIUM - Slower inventory reports, reconciliation queries
**Likelihood:** HIGH - High-volume inventory operations

**Mitigations:**
1. Partition by `movementType` or `createdAt`
2. Pre-aggregate movement summaries in materialized view
3. Add archival strategy

---

### HIGH: RISK-SCALE-004 - Missing Composite Indexes for Common Queries

**Location:** Multiple schemas

**Issue:** Several common query patterns lack optimal indexes.

**Evidence - customers.ts:**
```typescript
// Missing: (organizationId, status, createdAt) for filtered+sorted lists
orgStatusIdx: index("idx_customers_org_status").on(table.organizationId, table.status),
orgCreatedIdx: index("idx_customers_org_created").on(table.organizationId, table.createdAt),
// These are separate - JOIN queries may need composite
```

**Evidence - orders.ts:**
```typescript
// Missing: (organizationId, customerId, orderDate) for customer order history
// Missing: (organizationId, status, orderDate) for order lists with date range
```

**Impact:** MEDIUM - Suboptimal query plans, increased CPU
**Likelihood:** HIGH - These are common UI patterns

**Mitigations:**
1. Add composite indexes matching actual query patterns
2. Audit with `EXPLAIN ANALYZE` after initial load test
3. Consider partial indexes for common filters (e.g., `WHERE status = 'active'`)

---

### MEDIUM: RISK-SCALE-005 - JSONB Column Indexing

**Location:** Multiple schemas (`addresses`, `preferences`, `metadata`, `lineItems`)

**Issue:** JSONB columns used extensively but not all have GIN indexes.

**Evidence - quotes.ts:**
```typescript
lineItems: jsonb("line_items").$type<QuoteLineItem[]>().default([]),
// No index - searching line items requires full table scan
```

**Impact:** MEDIUM - Slow searches within JSONB data
**Likelihood:** MEDIUM - Depends on search patterns implemented

**Mitigations:**
1. Add GIN indexes for JSONB columns that will be searched
2. Consider jsonb_path_ops for containment queries
3. Extract frequently-queried fields to dedicated columns

---

### MEDIUM: RISK-SCALE-006 - Full-Text Search Index Maintenance

**Location:** `customers.ts`, `products.ts`

**Issue:** GIN indexes for full-text search add write overhead.

**Evidence:**
```typescript
nameSearchIdx: index("idx_customers_name_search").using("gin", fullTextSearchSql(table.name)),
```

**Impact:** LOW - Slower writes, index bloat over time
**Likelihood:** MEDIUM - Normal GIN index behavior

**Mitigations:**
1. Schedule regular `REINDEX CONCURRENTLY` maintenance
2. Monitor index size vs table size ratio
3. Consider `gin_pending_list_limit` tuning

---

### MEDIUM: RISK-SCALE-007 - Notification Table Accumulation

**Location:** `drizzle/schema/notifications.ts`

**Issue:** User notifications accumulate without cleanup.

**Evidence:**
```typescript
// Has dismissedAt but no archival strategy
dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
```

**Impact:** LOW - Query slowdown for notification badges/counts
**Likelihood:** MEDIUM - Depends on notification volume

**Mitigations:**
1. Add cleanup job for old dismissed notifications
2. Partial index: `WHERE status = 'pending' OR status = 'sent'`

---

### MEDIUM: RISK-SCALE-008 - Order Line Items Denormalization

**Location:** `drizzle/schema/orders.ts`

**Issue:** Line items table grows proportionally to orders.

**Evidence:**
```typescript
// 10 items/order average x 10k orders = 100k line items
lineNumber: text("line_number").notNull(),
```

**Impact:** LOW - Moderate growth, well-indexed
**Likelihood:** MEDIUM - Depends on order patterns

**Mitigations:**
1. Existing indexes are appropriate
2. Consider archival with parent order

---

### LOW: RISK-SCALE-009 - User Sessions Cleanup

**Location:** `drizzle/schema/users.ts`

**Issue:** Session records may accumulate if not cleaned up.

**Evidence:**
```typescript
export const userSessions = pgTable("user_sessions", {
  expiresAt: timestampColumns.createdAt, // Misnamed - uses createdAt pattern
```

**Note:** The `expiresAt` field reuses `createdAt` pattern which is confusing.

**Impact:** LOW - Session tables typically small
**Likelihood:** LOW - Sessions usually short-lived

**Mitigations:**
1. Add cleanup job for expired sessions
2. Fix naming: use proper `expiresAt` column definition

---

### LOW: RISK-SCALE-010 - Contacts Per Customer

**Location:** `drizzle/schema/customers.ts`

**Issue:** No limit on contacts per customer.

**Evidence:**
```typescript
customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
```

**Impact:** LOW - Unlikely to have many contacts per customer
**Likelihood:** LOW - Natural business constraint

**Mitigations:**
1. Consider application-level limit (e.g., 50 contacts/customer)
2. Index is already present

---

## 2. Data Integrity Risks

### CRITICAL: RISK-INTEGRITY-001 - Contacts Boolean Column Type Error

**Location:** `drizzle/schema/customers.ts`

**Issue:** Boolean flags incorrectly defined as UUID type.

**Evidence:**
```typescript
// BUG: These should be boolean, not uuid
isPrimary: uuid("is_primary").default(sql`false`),
isDecisionMaker: uuid("is_decision_maker").default(sql`false`),
```

**Impact:** CRITICAL - Runtime errors, data corruption
**Likelihood:** HIGH - Will fail on first use

**Mitigations:**
1. **IMMEDIATE FIX REQUIRED** - Change to `boolean("is_primary").default(false)`
2. Add migration to fix column types before any data is inserted

---

### CRITICAL: RISK-INTEGRITY-002 - Inventory Quantity Calculated Field Drift

**Location:** `drizzle/schema/inventory.ts`

**Issue:** `quantityAvailable` is stored but should equal `quantityOnHand - quantityAllocated`. Can drift.

**Evidence:**
```typescript
quantityOnHand: quantityColumn("quantity_on_hand"),
quantityAllocated: quantityColumn("quantity_allocated"),
quantityAvailable: quantityColumn("quantity_available"), // onHand - allocated
```

**Scenario:** Bug in allocation logic updates `quantityAllocated` but not `quantityAvailable`.

**Impact:** CRITICAL - Incorrect inventory availability, overselling
**Likelihood:** MEDIUM - Depends on transaction discipline

**Mitigations:**
1. Use database trigger to auto-calculate `quantityAvailable`
2. Or: Remove stored column, use generated column
3. Add CHECK constraint: `quantity_available = quantity_on_hand - quantity_allocated`
4. Add periodic reconciliation job

---

### HIGH: RISK-INTEGRITY-003 - Quote Line Items in JSONB

**Location:** `drizzle/schema/pipeline.ts`

**Issue:** Line items stored as JSONB array, bypassing referential integrity.

**Evidence:**
```typescript
lineItems: jsonb("line_items").$type<QuoteLineItem[]>().default([]),
```

**Problems:**
- No FK to products table
- Product deletion doesn't update quote line items
- Schema changes to QuoteLineItem not enforced

**Impact:** HIGH - Orphaned references, inconsistent pricing
**Likelihood:** MEDIUM - Depends on product deletion frequency

**Mitigations:**
1. Consider separate `quote_line_items` table (like order_line_items)
2. If keeping JSONB, add validation trigger
3. Store snapshot of product data at quote time

---

### HIGH: RISK-INTEGRITY-004 - Soft Delete Cascade Gaps

**Location:** Multiple schemas

**Issue:** Soft delete (`deletedAt`) doesn't cascade to related records.

**Evidence - orders.ts:**
```typescript
// Customer soft-deleted, but orders still reference it
customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
```

**Scenario:** Soft-delete customer, their orders still active but customer appears "deleted".

**Impact:** MEDIUM - UI confusion, data inconsistency
**Likelihood:** MEDIUM - Common in CRM workflows

**Mitigations:**
1. Add application logic to cascade soft deletes
2. Or: Use triggers to propagate soft deletes
3. Views that exclude soft-deleted parents

---

### MEDIUM: RISK-INTEGRITY-005 - Missing NOT NULL Constraints

**Location:** Multiple schemas

**Issue:** Some fields that should be required are nullable.

**Evidence - orders.ts:**
```typescript
dueDate: date("due_date"),  // Should this be required?
```

**Evidence - opportunities.ts:**
```typescript
assignedTo: uuid("assigned_to"),  // No FK reference
```

**Impact:** LOW - Incomplete data records
**Likelihood:** MEDIUM - Depends on UI validation

**Mitigations:**
1. Review each nullable field for business requirement
2. Add FK reference for `assignedTo` to users table

---

### MEDIUM: RISK-INTEGRITY-006 - Decimal Precision in Currency Calculations

**Location:** `drizzle/schema/patterns.ts`

**Issue:** Currency uses `numeric(12,2)` which is correct, but calculations in JavaScript can lose precision.

**Evidence:**
```typescript
export const currencyColumn = (name: string) =>
  numericCasted(name, { precision: 12, scale: 2 }).notNull().default(0);
```

**Scenario:** `0.1 + 0.2 = 0.30000000000000004` in JavaScript before storing.

**Impact:** MEDIUM - Rounding errors in totals
**Likelihood:** MEDIUM - Common JavaScript issue

**Mitigations:**
1. Use Decimal.js or big.js for calculations in application
2. Round to 2 decimal places before storing
3. Add CHECK constraints for reasonable bounds

---

### MEDIUM: RISK-INTEGRITY-007 - Order Totals Not Validated

**Location:** `drizzle/schema/orders.ts`

**Issue:** Order totals stored separately from line items, can drift.

**Evidence:**
```typescript
subtotal: currencyColumn("subtotal"),
// ... 
total: currencyColumn("total"),
// vs
// Line items have their own totals
lineTotal: currencyColumn("line_total"),
```

**Impact:** MEDIUM - Incorrect invoicing
**Likelihood:** MEDIUM - Depends on update patterns

**Mitigations:**
1. Add trigger to recalculate totals on line item change
2. Add CHECK constraint that total >= 0
3. Periodic validation job

---

### LOW: RISK-INTEGRITY-008 - Email Address Validation

**Location:** Multiple schemas (customers, users, email-history)

**Issue:** Email fields are plain text without validation.

**Evidence:**
```typescript
email: text("email"),  // No CHECK constraint
```

**Impact:** LOW - Invalid emails in database
**Likelihood:** LOW - Usually validated at application layer

**Mitigations:**
1. Add CHECK constraint with regex
2. Ensure application-level validation

---

## 3. Operational Risks

### HIGH: RISK-OPS-001 - No Migration Rollback Strategy

**Location:** `drizzle/migrations/`

**Issue:** Three migrations exist but no documented rollback procedures.

**Evidence:**
```
0000_organic_frightful_four.sql
0001_auth_user_trigger.sql
0001_bouncy_lenny_balinger.sql
```

**Problem:** Two migrations with `0001_` prefix suggests manual intervention occurred.

**Impact:** HIGH - Failed deployment recovery difficult
**Likelihood:** MEDIUM - Migrations are risky

**Mitigations:**
1. Document rollback steps for each migration
2. Test migrations on staging with production-like data
3. Create backup before migration
4. Fix duplicate `0001_` prefix

---

### HIGH: RISK-OPS-002 - PgBouncer Prepared Statement Limitation

**Location:** `src/lib/db/index.ts`

**Issue:** Using Supabase Transaction mode (PgBouncer) which doesn't support prepared statements.

**Evidence:**
```typescript
const client = postgres(connectionString, {
  prepare: false,  // Required for Supabase Transaction mode (PgBouncer)
  max: 10,
```

**Scenario:** Drizzle or postgres.js version upgrade enables prepared statements by default, breaking all queries.

**Impact:** HIGH - Complete application failure
**Likelihood:** LOW - Setting is explicit

**Mitigations:**
1. Add integration test that verifies `prepare: false` setting
2. Pin postgres.js version
3. Document PgBouncer requirement in README

---

### MEDIUM: RISK-OPS-003 - Connection Pool Exhaustion

**Location:** `src/lib/db/index.ts`

**Issue:** Fixed pool of 10 connections may be insufficient.

**Evidence:**
```typescript
max: 10,
idle_timeout: 20,
```

**Scenario:** 10 concurrent serverless function invocations each holding a connection = pool exhaustion.

**Impact:** MEDIUM - Request failures during traffic spikes
**Likelihood:** MEDIUM - Depends on traffic patterns

**Mitigations:**
1. Use Supabase connection pooler session mode for higher limits
2. Implement connection retry logic
3. Add connection pool metrics/alerting
4. Consider connection-per-request pattern for serverless

---

### MEDIUM: RISK-OPS-004 - Missing Database Constraints in Migrations

**Location:** Migration files

**Issue:** Drizzle may not generate all constraints (CHECK, triggers) automatically.

**Scenario:** CHECK constraints defined in code but not in migration = constraint not enforced.

**Impact:** MEDIUM - Data validation gaps
**Likelihood:** MEDIUM - Drizzle constraint generation varies

**Mitigations:**
1. Review generated migration SQL
2. Add custom migration for missing constraints
3. Test constraints after migration

---

### MEDIUM: RISK-OPS-005 - No Index on Foreign Keys

**Location:** Multiple schemas

**Issue:** Some foreign keys lack explicit indexes (Drizzle may or may not create them).

**Evidence - email-history.ts:**
```typescript
senderId: uuid("sender_id").references(() => users.id),
// senderIdx explicitly created - good
```

**Evidence - inventory.ts:**
```typescript
inventoryId: uuid("inventory_id").notNull().references(() => inventory.id),
// Index exists - good
```

**Generally good, but should verify all FKs have indexes.

**Impact:** LOW - Cascade deletes slow without index
**Likelihood:** LOW - Most FKs are indexed

**Mitigations:**
1. Audit all FK columns for indexes
2. Add explicit indexes where missing

---

### LOW: RISK-OPS-006 - JSONB Column Migration Difficulty

**Location:** Multiple schemas

**Issue:** Changing JSONB interface types doesn't generate migrations - data may be incompatible.

**Evidence:**
```typescript
export interface CustomerAddress {
  street1: string;  // What if we rename to 'line1'?
```

**Impact:** LOW - Reading old data may fail
**Likelihood:** LOW - Interface changes should be backwards compatible

**Mitigations:**
1. Document JSONB interface change policy
2. Use optional fields for new properties
3. Write data migration scripts for breaking changes

---

### LOW: RISK-OPS-007 - Backup/Restore Not Tested

**Issue:** No evidence of backup/restore testing for this schema.

**Impact:** HIGH if backups fail - Data loss
**Likelihood:** LOW - Supabase handles backups

**Mitigations:**
1. Document backup/restore procedure
2. Test restore to separate database
3. Verify JSONB data survives restore

---

## 4. Integration Point Risks

### CRITICAL: RISK-INT-001 - Supabase Auth User Sync Gap

**Location:** `drizzle/schema/users.ts`, `drizzle/migrations/0001_auth_user_trigger.sql`

**Issue:** Users table depends on Supabase auth.users, but sync mechanism unclear.

**Evidence:**
```typescript
authId: uuid("auth_id").notNull(),  // Links to auth.users.id
```

**Problem:** If auth.users record created but trigger fails, user can authenticate but has no app user record.

**Impact:** CRITICAL - Users locked out of application
**Likelihood:** MEDIUM - Depends on trigger reliability

**Mitigations:**
1. Add fallback: create user record on first API call if missing
2. Add monitoring for auth/user count discrepancy
3. Document manual recovery procedure

---

### HIGH: RISK-INT-002 - RLS Policy Not Applied to All Tables

**Location:** `drizzle/schema/users.ts` vs other schemas

**Issue:** Only `users` and `apiTokens` tables have RLS policies defined. Other tables lack RLS.

**Evidence - users.ts:**
```typescript
selectPolicy: pgPolicy("users_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
}),
```

**Evidence - customers.ts:** No RLS policies defined.

**Impact:** HIGH - Data leakage between organizations if RLS expected
**Likelihood:** MEDIUM - Depends on whether RLS is actually enabled

**Mitigations:**
1. Either: Add RLS policies to ALL org-scoped tables
2. Or: Document that RLS is application-enforced only
3. Add `FORCE ROW LEVEL SECURITY` to ensure RLS is enabled

---

### HIGH: RISK-INT-003 - app.organization_id Setting Not Documented

**Location:** `drizzle/schema/users.ts`

**Issue:** RLS policies depend on `current_setting('app.organization_id')` but how this is set is undocumented.

**Evidence:**
```typescript
using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
```

**Problem:** If application doesn't set this, queries silently return no rows (due to `true` parameter).

**Impact:** HIGH - Silent data hiding or exposure
**Likelihood:** MEDIUM - Common RLS implementation pattern

**Mitigations:**
1. Document session variable setting in middleware
2. Add helper function: `SET LOCAL app.organization_id = ?`
3. Consider using Supabase's built-in RLS helpers

---

### MEDIUM: RISK-INT-004 - External Campaign/Template IDs Not Validated

**Location:** `drizzle/schema/email-history.ts`

**Issue:** `campaignId` and `templateId` are stored but have no FK relationship.

**Evidence:**
```typescript
campaignId: uuid("campaign_id"), // For bulk sends
templateId: text("template_id"), // For template tracking
```

**Problem:** These likely reference external systems (SendGrid, etc.) but no validation exists.

**Impact:** MEDIUM - Orphaned references, broken analytics
**Likelihood:** MEDIUM - Depends on email integration

**Mitigations:**
1. Document expected format/source for these IDs
2. Consider `campaigns` table if internal
3. Add validation in application layer

---

### MEDIUM: RISK-INT-005 - Stripe Customer ID Orphaning

**Location:** `drizzle/schema/organizations.ts`

**Issue:** `stripeCustomerId` stored but no sync mechanism defined.

**Evidence:**
```typescript
stripeCustomerId: text("stripe_customer_id"),
```

**Scenario:** Stripe customer deleted externally, organization still references it.

**Impact:** MEDIUM - Failed payment operations
**Likelihood:** LOW - Stripe customers rarely deleted

**Mitigations:**
1. Add webhook handler for Stripe customer.deleted
2. Periodic Stripe ID validation job
3. Graceful error handling for invalid Stripe IDs

---

### LOW: RISK-INT-006 - No API Token Rotation Policy

**Location:** `drizzle/schema/api-tokens.ts`

**Issue:** Tokens can have no expiration (`expiresAt: null`).

**Evidence:**
```typescript
expiresAt: timestamp("expires_at", { withTimezone: true }),  // null = never expires
```

**Impact:** LOW - Security risk from long-lived tokens
**Likelihood:** LOW - Standard API token pattern

**Mitigations:**
1. Default expiration (90 days?)
2. Admin policy to require rotation
3. Alert on tokens approaching 1 year old

---

## 5. Multi-Tenancy Isolation Risks

### CRITICAL: RISK-MT-001 - Inconsistent organizationId Column Pattern

**Location:** Multiple schemas

**Issue:** `organizationColumnBase` provides column but FK reference added inconsistently.

**Evidence - customers.ts:**
```typescript
...organizationColumnBase,  // Just the column, no FK
```

**Evidence - users.ts:**
```typescript
organizationId: uuid("organization_id")
  .notNull()
  .references(() => organizations.id, { onDelete: "cascade" }),  // Explicit FK
```

**Problem:** Tables using `organizationColumnBase` have no FK constraint - can reference non-existent org.

**Impact:** CRITICAL - Orphaned records, data integrity loss
**Likelihood:** HIGH - Easy to delete org without cascade

**Mitigations:**
1. **IMMEDIATE FIX** - Add FK to `organizationColumnBase` pattern
2. Or: Add explicit FK to each table using the pattern
3. Add migration to add FK constraints to existing tables

---

### CRITICAL: RISK-MT-002 - Cross-Tenant Data Access via Relation Traversal

**Location:** All relation definitions

**Issue:** Drizzle relations don't enforce tenant isolation - eager loading can cross tenants.

**Evidence:**
```typescript
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
```

**Scenario:** User in Org A loads order, relation eagerly loads customer from Org B (if customer moved orgs).

**Impact:** CRITICAL - Cross-tenant data exposure
**Likelihood:** LOW - Requires FK to cross org boundary

**Mitigations:**
1. Always include `organizationId` in JOIN conditions
2. Create tenant-scoped query helpers
3. Add database triggers to prevent cross-org FKs

---

### HIGH: RISK-MT-003 - Unique Constraints Not Org-Scoped

**Location:** `drizzle/schema/organizations.ts`, `drizzle/schema/users.ts`

**Issue:** Some unique indexes are global, not per-organization.

**Evidence - organizations.ts:**
```typescript
slugUnique: uniqueIndex("idx_organizations_slug_unique").on(table.slug),
// Correct - slugs must be globally unique
```

**Evidence - users.ts:**
```typescript
authIdUnique: uniqueIndex("idx_users_auth_id_unique").on(table.authId),
// Correct - one app user per auth user
```

**These are correct, but verify all business uniques are org-scoped.

**Evidence - products.ts:**
```typescript
skuOrgUnique: uniqueIndex("idx_products_sku_org_unique")
  .on(table.organizationId, table.sku)  // Correct - SKU unique per org
```

**Looks good for products. Check all.

**Impact:** HIGH if wrong - Collision between tenants
**Likelihood:** LOW - Most appear correct

**Mitigations:**
1. Audit all unique constraints for org-scoping
2. Add test that attempts duplicate across orgs

---

### HIGH: RISK-MT-004 - User Can Belong to Multiple Organizations

**Location:** `drizzle/schema/users.ts`

**Issue:** Schema only supports one organization per user (no join table).

**Evidence:**
```typescript
organizationId: uuid("organization_id")
  .notNull()
  .references(() => organizations.id, { onDelete: "cascade" }),
```

**Scenario:** User needs access to multiple organizations (consultant, multi-business owner).

**Impact:** MEDIUM - Can't support multi-org users without schema change
**Likelihood:** MEDIUM - Common business requirement

**Mitigations:**
1. Consider `organization_members` join table
2. Or: Document single-org-per-user as intentional limitation
3. Future: Add organization switching support

---

### HIGH: RISK-MT-005 - Soft Delete Leaks Tenant Data in Constraints

**Location:** Multiple schemas with partial unique indexes

**Issue:** Partial unique indexes exclude `deletedAt IS NOT NULL` records but include all orgs.

**Evidence - customers.ts:**
```typescript
emailOrgUnique: uniqueIndex("idx_customers_email_org_unique")
  .on(table.organizationId, table.email)
  .where(sql`${table.email} IS NOT NULL AND ${table.deletedAt} IS NULL`),
```

**This is correct. But if soft-delete filter is missed, deleted records could collide.

**Impact:** LOW - Constraint handles this correctly
**Likelihood:** LOW - Pattern is correct

**Mitigations:**
1. Ensure all unique indexes include soft-delete filter
2. Consider hard delete with archive table instead

---

### MEDIUM: RISK-MT-006 - No Org-Level Feature Flags

**Location:** `drizzle/schema/organizations.ts`

**Issue:** No mechanism for org-specific feature toggles or limits.

**Evidence:**
```typescript
settings: jsonb("settings").$type<OrganizationSettings>(),
plan: text("plan").notNull().default("free"),
```

**Scenario:** Need to disable feature for one org, or enforce plan limits.

**Impact:** LOW - Can extend settings JSONB
**Likelihood:** MEDIUM - Common requirement

**Mitigations:**
1. Add `features` JSONB column or separate table
2. Define feature flag structure in settings interface

---

## Summary of Immediate Actions Required

### P0 - Fix Before Any Data Entry

1. **RISK-INTEGRITY-001**: Fix `isPrimary`/`isDecisionMaker` column types in contacts (UUID -> boolean)
2. **RISK-MT-001**: Add FK constraints to `organizationColumnBase` pattern

### P1 - Fix Before Production

3. **RISK-INTEGRITY-002**: Add CHECK constraint or trigger for inventory `quantityAvailable`
4. **RISK-INT-001**: Implement auth user sync fallback
5. **RISK-INT-002**: Either add RLS policies to all tables or document application-enforced isolation
6. **RISK-OPS-001**: Fix duplicate `0001_` migration prefix and document rollback

### P2 - Address Before Scale

7. **RISK-SCALE-001**: Plan email history partitioning strategy
8. **RISK-SCALE-002**: Plan activities table archival
9. **RISK-SCALE-004**: Add composite indexes for common query patterns

### P3 - Monitor and Plan

10. All other risks - implement monitoring and address as needed

---

## Appendix: Files Analyzed

| File | Lines | Risk Count |
|------|-------|------------|
| `drizzle/schema/notifications.ts` | 94 | 1 |
| `drizzle/schema/email-history.ts` | 118 | 2 |
| `drizzle/schema/customers.ts` | 160 | 3 |
| `drizzle/schema/orders.ts` | 178 | 3 |
| `drizzle/schema/products.ts` | 128 | 2 |
| `drizzle/schema/pipeline.ts` | 166 | 2 |
| `drizzle/schema/inventory.ts` | 215 | 3 |
| `drizzle/schema/activities.ts` | 101 | 1 |
| `drizzle/schema/organizations.ts` | 103 | 2 |
| `drizzle/schema/users.ts` | 175 | 4 |
| `drizzle/schema/api-tokens.ts` | 140 | 1 |
| `drizzle/schema/patterns.ts` | 108 | 1 |
| `drizzle/schema/enums.ts` | 155 | 0 |
| `src/lib/db/pagination.ts` | 175 | 0 |
| `src/lib/db/index.ts` | 56 | 2 |

