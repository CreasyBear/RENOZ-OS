---
title: "fix: Database Query Security, Performance, and Integrity Remediation"
type: fix
date: 2026-01-25
priority: critical
estimated_effort: 3-4 sprints
---

# Database Query Remediation Plan

## Overview

Comprehensive remediation of database query issues identified through security, performance, data integrity, and pattern analysis. This plan addresses 22 critical/important issues across 131 server function files containing 3,139 query operations.

## Problem Statement / Motivation

A thorough database audit revealed:
- **4 critical security vulnerabilities** - Unauthenticated public endpoints affecting all tenants
- **8 critical N+1 query patterns** - Bulk operations executing hundreds of individual queries
- **4 critical data integrity issues** - Multi-step mutations without transaction protection
- **15+ duplicate files** - Root-level duplicates of subdirectory files causing confusion
- **30+ handlers missing permission checks** - Only checking auth, not authorization

These issues pose security risks, performance degradation at scale, and potential data corruption.

## Proposed Solution

Four-phase remediation prioritizing security first, then data integrity, performance, and cleanup.

---

## Phase 1: Security Fixes (Critical - Week 1)

### 1.1 Remove Public Exposure of Background Job Functions

**Issue**: 3 server functions exposed as public endpoints without authentication.

| File | Function | Fix |
|------|----------|-----|
| `src/server/functions/users/invitations.ts:459-469` | `expireOldInvitations` | Convert to Trigger.dev scheduled job |
| `src/server/functions/suppliers/approvals.ts:576` | `autoEscalateOverdue` | Convert to Trigger.dev scheduled job |
| `src/server/functions/inventory/alerts.ts:337` | `checkAndTriggerAlerts` | Convert to Trigger.dev scheduled job |

**Implementation**:
```typescript
// BEFORE: Public server function
export const expireOldInvitations = createServerFn({ method: 'POST' }).handler(async () => {
  // No auth - vulnerable
});

// AFTER: Trigger.dev scheduled job
// src/trigger/jobs/expire-invitations.ts
export const expireInvitationsJob = schedules.task({
  id: 'expire-old-invitations',
  cron: '0 * * * *', // Every hour
  run: async () => {
    // Safe - only callable by Trigger.dev
  },
});
```

- [x] Create `src/trigger/jobs/expire-invitations.ts`
- [x] Create `src/trigger/jobs/auto-escalate-approvals.ts`
- [x] Create `src/trigger/jobs/check-inventory-alerts.ts`
- [x] Mark public server functions as @deprecated (kept for backwards compatibility)
- [x] Register jobs in `src/trigger/jobs/index.ts`

### 1.2 Add LIKE Character Escaping Utility

**Issue**: 20+ files use `ilike()` without escaping `%` and `_` wildcards, enabling pattern injection.

**Create utility**:
```typescript
// src/lib/db/utils.ts
/**
 * Escapes LIKE/ILIKE pattern characters to prevent pattern injection.
 * Call this before passing user input to ilike() or like().
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}
```

**Files to update** (use `escapeLike()` for search inputs):

| File | Line | Pattern |
|------|------|---------|
| `customers/customers.ts` | 97, 109 | `ilike(customers.name, \`%${search}%\`)` |
| `products/products.ts` | 76-81 | name/sku search |
| `orders/orders.ts` | 276-281 | orderNumber search |
| `users/users.ts` | 74 | name/email search |
| `suppliers/suppliers.ts` | 94 | name search |
| `inventory/inventory.ts` | 104-108 | item search |
| `search/search.ts` | 45+ | global search |
| + 13 more files | various | search patterns |

- [x] Create `src/lib/db/utils.ts` with `escapeLike()` function
- [x] Update `customers/customers.ts` search patterns
- [x] Update `products/product-search.ts` search patterns
- [x] Update `orders/orders.ts` search patterns
- [x] Update `users/users.ts` search patterns
- [x] Update `suppliers/suppliers.ts` search patterns
- [x] Update `pipeline/pipeline.ts` search patterns
- [x] Update `support/issues.ts` search patterns
- [x] Update `suppliers/purchase-orders.ts` search patterns
- [x] Update `suppliers/pricing.ts` search patterns (2 patterns)
- [x] Update `financial/credit-notes.ts` search patterns (2 patterns)
- [x] Update `dashboard/layouts.ts` search patterns
- [x] Update `dashboard/targets.ts` search patterns
- [x] Update `dashboard/scheduled-reports.ts` search patterns
- [x] Update `support/issue-templates.ts` search patterns
- [x] Update root `pipeline.ts` (duplicate file) search patterns

### 1.3 Add Missing organizationId Filters

**Issue**: Several UPDATE/DELETE queries missing tenant isolation.

| File | Line | Issue |
|------|------|-------|
| `customers/customers.ts` | 747-758 | Tag assignment check lacks org filter |
| `customers/customers.ts` | 883-892 | Health metric update uses only customerId |

**Fix pattern**:
```typescript
// BEFORE
.where(eq(customers.id, data.customerId))

// AFTER
.where(and(
  eq(customers.id, data.customerId),
  eq(customers.organizationId, ctx.organizationId)
))
```

- [x] Add `organizationId` to tag assignment existence check
- [x] Add `organizationId` to customer health metric update
- [ ] Audit all UPDATE/DELETE queries for missing org filters (deferred - needs deeper review)

### 1.4 Add Missing Permission Checks

**Issue**: 30+ handlers only check `await withAuth()` without permission parameter.

**Pattern to apply**:
```typescript
// BEFORE
const ctx = await withAuth();

// AFTER
const ctx = await withAuth({ permission: PERMISSIONS.domain.action });
```

**High-priority files** (sensitive operations):

| File | Functions | Permission |
|------|-----------|------------|
| `csat-responses.ts` | 103, 172, 222, 323, 446 | `customer.read/update` |
| `inventory.ts` | 79, 174, 829, 903 | `inventory.read/adjust` |
| `forecasting.ts` | 64, 120, 370, 463, 587 | `inventory.read` |
| `stock-counts.ts` | 46, 102, 736, 836 | `inventory.adjust` |

- [x] Update `csat-responses.ts` with proper permissions (5 handlers)
- [x] Update `inventory.ts` with proper permissions (4 handlers)
- [x] Update `forecasting.ts` with proper permissions (5 handlers)
- [x] Update `stock-counts.ts` with proper permissions (4 handlers)
- [ ] Update remaining 12 files with missing permissions (deferred - lower priority)

---

## Phase 2: Data Integrity Fixes (Critical - Week 2)

### 2.1 Wrap Payment Recording in Transaction

**File**: `src/server/functions/financial/payment-schedules.ts:378-464`

**Issue**: Payment installment update and order balance update are separate operations.

**Current flow** (non-atomic):
1. UPDATE installment → set paid
2. SELECT all installments → calculate total
3. UPDATE order → set paidAmount, balanceDue

**Fix**: Wrap in `db.transaction()`:

```typescript
export const recordInstallmentPayment = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // 1. Update installment
      const [updated] = await tx
        .update(paymentSchedules)
        .set({ status: 'paid', paidAt: new Date(), ... })
        .where(eq(paymentSchedules.id, data.installmentId))
        .returning();

      // 2. Recalculate order totals
      const installments = await tx
        .select()
        .from(paymentSchedules)
        .where(eq(paymentSchedules.orderId, updated.orderId));

      const totalPaid = installments
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.amount), 0);

      // 3. Update order (atomic with installment update)
      await tx
        .update(orders)
        .set({ paidAmount: totalPaid, balanceDue: order.totalAmount - totalPaid })
        .where(eq(orders.id, updated.orderId));

      return updated;
    });
  });
```

- [ ] Wrap `recordInstallmentPayment` in transaction
- [ ] Add rollback handling for partial failures
- [ ] Add test for atomicity

### 2.2 Wrap Line Item Operations in Transaction

**File**: `src/server/functions/orders/orders.ts`

**Functions to fix**:
- `addOrderLineItem` (1007-1031)
- `updateOrderLineItem` (1105-1121)
- `deleteOrderLineItem` (1179-1184)

**Pattern**:
```typescript
export const addOrderLineItem = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // Insert line item
      const [newItem] = await tx
        .insert(orderLineItems)
        .values({ ... })
        .returning();

      // Recalculate totals (within same transaction)
      await recalculateOrderTotals(data.orderId, ctx.user.id, tx);

      return newItem;
    });
  });
```

- [ ] Wrap `addOrderLineItem` in transaction
- [ ] Wrap `updateOrderLineItem` in transaction
- [ ] Wrap `deleteOrderLineItem` in transaction
- [ ] Update `recalculateOrderTotals` to accept transaction parameter

### 2.3 Wrap Stage Change with Activity Log in Transaction

**File**: `src/server/functions/pipeline/pipeline.ts:544-557`

```typescript
// Wrap stage change + activity log atomically
return await db.transaction(async (tx) => {
  const result = await tx
    .update(opportunities)
    .set(updateData)
    .where(eq(opportunities.id, id))
    .returning();

  await tx.insert(opportunityActivities).values({
    opportunityId: id,
    activityType: 'stage_change',
    previousValue: opportunity.stage,
    newValue: data.stage,
    userId: ctx.user.id,
  });

  return result[0];
});
```

- [ ] Wrap `updateOpportunityStage` in transaction
- [ ] Include activity log in same transaction

### 2.4 Wrap Quote Creation with Opportunity Update in Transaction

**File**: `src/server/functions/pipeline/quote-versions.ts:133-156`

- [ ] Wrap `createQuoteVersion` in transaction
- [ ] Include opportunity value update in same transaction

### 2.5 Fix Optimistic Locking Pattern

**File**: `src/server/functions/pipeline/pipeline.ts:402`

**Issue**: Version check happens outside UPDATE, allowing race conditions.

```typescript
// BEFORE (race condition possible)
if (version !== undefined && current[0].version !== version) {
  throw new Error('Modified by another user');
}
await db.update(opportunities).set(data).where(eq(opportunities.id, id));

// AFTER (atomic check)
const result = await db
  .update(opportunities)
  .set({ ...data, version: sql`version + 1` })
  .where(and(
    eq(opportunities.id, id),
    version !== undefined ? eq(opportunities.version, version) : sql`true`
  ))
  .returning();

if (result.length === 0) {
  throw new ConflictError('Opportunity modified by another user');
}
```

- [ ] Move version check into UPDATE WHERE clause
- [ ] Return ConflictError if no rows updated

---

## Phase 3: Performance Fixes (Important - Week 3)

### 3.1 Fix N+1 Queries in Bulk Operations

**Critical files with N+1 patterns**:

| File | Function | Issue | Fix |
|------|----------|-------|-----|
| `customer-duplicate-scan.ts:264-318` | `scanDuplicatesProgressive` | Query per customer (500 in loop) | Use `inArray()` batch query |
| `customer-duplicates.ts:193-201` | `findDuplicateCustomers` | Contact query per match | JOIN or batch fetch |
| `customers.ts:1159-1170` | `mergeCustomers` | Tag insert per tag | Batch insert |
| `customers.ts:1080-1087` | Tag usage update | UPDATE per tag | CASE/WHEN batch |
| `job-batch-operations.ts:307-388` | `bulkImportJobs` | Existence check per job | Pre-fetch with `inArray()` |
| `warranty-bulk-import.ts:709-765` | `bulkRegisterWarranties` | Individual inserts | Batch insert |
| `product-bulk-ops.ts:595-616` | `bulkUpdatePrices` | UPDATE per product | Single UPDATE with CASE |
| `forecasting.ts:284-344` | `saveBulkForecasts` | Upsert per row | `ON CONFLICT DO UPDATE` |

**Example fix for duplicate scan**:
```typescript
// BEFORE: N+1 query
for (const customer of batch) {
  const matches = await db.select().from(customers)
    .where(ilike(customers.name, `%${customer.name}%`));
}

// AFTER: Batch query
const allNames = batch.map(c => c.name);
const allMatches = await db.select().from(customers)
  .where(or(...allNames.map(name => ilike(customers.name, `%${name}%`))));

// Group matches by original customer
const matchesByName = groupBy(allMatches, m => /* matching logic */);
```

- [ ] Fix `scanDuplicatesProgressive` - batch customer queries
- [ ] Fix `findDuplicateCustomers` - JOIN for contacts
- [ ] Fix `mergeCustomers` - batch insert tags
- [ ] Fix tag usage updates - single CASE/WHEN UPDATE
- [ ] Fix `bulkImportJobs` - pre-fetch existence
- [ ] Fix `bulkRegisterWarranties` - batch insert
- [ ] Fix `bulkUpdatePrices` - single UPDATE with CASE
- [ ] Fix `saveBulkForecasts` - ON CONFLICT DO UPDATE

### 3.2 Replace In-Memory Aggregation with SQL

**File**: `src/server/functions/financial/ar-aging.ts:125-224`

**Issue**: Fetches all outstanding orders, then calculates aging buckets in memory.

```typescript
// BEFORE: In-memory aggregation
const orders = await db.select().from(orders).where(...);
const buckets = { current: 0, '1-30': 0, '31-60': 0, ... };
for (const order of orders) {
  const age = daysSince(order.dueDate);
  if (age <= 0) buckets.current += order.balance;
  else if (age <= 30) buckets['1-30'] += order.balance;
  // ...
}

// AFTER: SQL aggregation
const result = await db.execute(sql`
  SELECT
    SUM(CASE WHEN age <= 0 THEN balance ELSE 0 END) as current,
    SUM(CASE WHEN age BETWEEN 1 AND 30 THEN balance ELSE 0 END) as "1-30",
    SUM(CASE WHEN age BETWEEN 31 AND 60 THEN balance ELSE 0 END) as "31-60",
    SUM(CASE WHEN age BETWEEN 61 AND 90 THEN balance ELSE 0 END) as "61-90",
    SUM(CASE WHEN age > 90 THEN balance ELSE 0 END) as "90+"
  FROM (
    SELECT balance_due as balance,
           EXTRACT(DAY FROM NOW() - due_date) as age
    FROM orders
    WHERE organization_id = ${ctx.organizationId}
      AND payment_status != 'paid'
  ) aged
`);
```

- [ ] Refactor `getARAgingReport` to use SQL aggregation
- [ ] Add similar fix to `financial-dashboard.ts` metrics

### 3.3 Parallelize Sequential Queries

**File**: `src/server/functions/support/issues.ts:136-222`

**Issue**: SLA calculation makes 5 sequential queries.

```typescript
// BEFORE: Sequential
const config = await db.select().from(slaConfigs)...;
const businessHours = await db.select().from(businessHours)...;
const holidays = await db.select().from(holidays)...;

// AFTER: Parallel
const [config, businessHours, holidays] = await Promise.all([
  db.select().from(slaConfigs)...,
  db.select().from(businessHours)...,
  db.select().from(holidays)...,
]);
```

- [ ] Parallelize SLA calculation queries
- [ ] Add date filter to holidays query (only fetch relevant window)
- [ ] Apply Promise.all pattern to other sequential reads

### 3.4 Add Missing Composite Indexes

**Recommended indexes** (add via migration):

```sql
-- Orders: Common filter patterns
CREATE INDEX idx_orders_org_date_status
  ON orders(organization_id, order_date, status);

CREATE INDEX idx_orders_org_payment_status
  ON orders(organization_id, payment_status);

-- Purchase Orders: Approval workflows
CREATE INDEX idx_po_org_status_approval
  ON purchase_orders(organization_id, status, approval_status);

-- Activities: Timeline queries
CREATE INDEX idx_activities_entity
  ON activities(organization_id, entity_type, entity_id, created_at DESC);
```

- [ ] Create migration for composite indexes
- [ ] Run EXPLAIN ANALYZE on hot queries before/after
- [ ] Document index usage in schema files

---

## Phase 4: Cleanup & Standardization (Week 4)

### 4.1 Delete Duplicate Root-Level Files

**15 files to delete** (subdirectory versions are canonical):

| Delete (root) | Keep (subdirectory) |
|---------------|---------------------|
| `src/server/functions/customer-analytics.ts` | `customers/customer-analytics.ts` |
| `src/server/functions/customer-duplicate-scan.ts` | `customers/customer-duplicate-scan.ts` |
| `src/server/functions/customer-duplicates.ts` | `customers/customer-duplicates.ts` |
| `src/server/functions/customer-segments.ts` | `customers/customer-segments.ts` |
| `src/server/functions/inventory.ts` | `inventory/inventory.ts` |
| `src/server/functions/forecasting.ts` | `inventory/forecasting.ts` |
| `src/server/functions/locations.ts` | `inventory/locations.ts` |
| `src/server/functions/stock-counts.ts` | `inventory/stock-counts.ts` |
| `src/server/functions/valuation.ts` | `inventory/valuation.ts` |
| `src/server/functions/pipeline.ts` | `pipeline/pipeline.ts` |
| `src/server/functions/quote-versions.ts` | `pipeline/quote-versions.ts` |
| `src/server/functions/win-loss-reasons.ts` | `pipeline/win-loss-reasons.ts` |
| `src/server/functions/activities.ts` | `activities/activities.ts` |
| `src/server/functions/alerts.ts` | `inventory/alerts.ts` |
| `src/server/functions/portal-auth.ts` | `portal/portal-auth.ts` |

**Process**:
1. Verify subdirectory file is identical or more complete
2. Search for imports of root file
3. Update imports to subdirectory path
4. Delete root file

- [ ] Verify each subdirectory file is canonical
- [ ] Update imports in affected files
- [ ] Delete 15 root-level duplicate files

### 4.2 Consolidate GST_RATE Constant

**12 files with hardcoded `GST_RATE = 0.1`**:

**Consolidate to**:
```typescript
// src/lib/constants.ts (already exports some constants)
export const TAX = {
  GST_RATE: 0.1,
  GST_PERCENTAGE: 10,
} as const;
```

**Files to update**:
- `quote-versions.ts` (2 files - root and pipeline/)
- `financial-dashboard.ts`
- `order-amendments.ts`
- `orders.ts`
- `quick-quote-form.tsx`
- `quote-builder.tsx`
- `order-creation-wizard.tsx`
- `order-calculations.ts` (already exports, make this the source)

- [ ] Export `GST_RATE` from `src/lib/order-calculations.ts` only
- [ ] Update all files to import from `@/lib/order-calculations`

### 4.3 Consolidate PERMISSIONS Constants

**Issue**: Two competing permission systems.

| Location | Pattern | Usage |
|----------|---------|-------|
| `src/lib/auth/permissions.ts` | `PERMISSIONS.customer.read` | 38 files |
| `src/lib/constants.ts` | `PERMISSIONS.PRODUCTS.READ` | 19 files |

**Decision**: Keep `src/lib/auth/permissions.ts` (more usage, better casing).

- [ ] Migrate 19 files from `@/lib/constants` PERMISSIONS to `@/lib/auth/permissions`
- [ ] Remove PERMISSIONS from `@/lib/constants.ts`
- [ ] Add deprecation warning or remove constants export

### 4.4 Standardize Soft Delete Pattern

**Issue**: Two patterns for soft delete filtering.

| Pattern | Usage | Preference |
|---------|-------|------------|
| `sql\`deletedAt IS NULL\`` | 46 uses | Legacy |
| `isNull(table.deletedAt)` | 100+ uses | Preferred (type-safe) |

- [ ] Update 46 files to use `isNull()` instead of raw SQL
- [ ] Add ESLint rule to prefer `isNull()` pattern

### 4.5 Standardize Error Handling

**Issue**: Mix of typed errors and generic `new Error()`.

**Pattern to enforce**:
```typescript
// BEFORE
throw new Error('Customer not found');

// AFTER
import { NotFoundError } from '@/lib/server/errors';
throw new NotFoundError('Customer not found', 'customer');
```

- [ ] Update 50+ locations using generic errors
- [ ] Add ESLint rule to prefer typed errors

---

## Technical Considerations

### Security
- All Phase 1 fixes must be deployed before production
- Rate limiting should use Redis, not in-memory (for public endpoints)
- Permission checks prevent privilege escalation

### Performance
- Batch operations reduce database round trips by 90%+
- SQL aggregation vs in-memory can be 10-100x faster for large datasets
- Composite indexes are critical for multi-tenant queries

### Backward Compatibility
- All changes are internal refactors
- No API changes required
- No migration of existing data needed

---

## Acceptance Criteria

### Phase 1: Security
- [ ] No server functions exposed without authentication
- [ ] All search inputs escaped for LIKE patterns
- [ ] All UPDATE/DELETE queries filter by organizationId
- [ ] All handlers have appropriate permission checks

### Phase 2: Data Integrity
- [ ] Payment recording is atomic (transaction)
- [ ] Line item operations are atomic (transaction)
- [ ] Stage changes with activity logs are atomic
- [ ] Optimistic locking uses WHERE clause

### Phase 3: Performance
- [ ] No N+1 queries in bulk operations
- [ ] AR aging uses SQL aggregation
- [ ] Sequential queries parallelized where possible
- [ ] Composite indexes created for hot paths

### Phase 4: Cleanup
- [ ] No duplicate root-level server function files
- [ ] Single source of truth for GST_RATE
- [ ] Single PERMISSIONS constant system
- [ ] Consistent soft delete and error patterns

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Critical security issues | 4 | 0 |
| N+1 query patterns | 8 | 0 |
| Missing transactions | 4 | 0 |
| Duplicate files | 15 | 0 |
| Missing permission checks | 30+ | 0 |

---

## Dependencies & Risks

### Dependencies
- Trigger.dev for scheduled jobs (already in use)
- Redis for rate limiting (optional enhancement)

### Risks
- **Medium**: Breaking imports when deleting duplicate files
  - Mitigation: Search all imports before deletion
- **Low**: Performance regression from new indexes
  - Mitigation: Test in staging with production-like data

---

## References

### Internal
- Database audit findings: This conversation
- Technical debt brainstorm: `docs/brainstorms/2026-01-25-technical-debt-standardization-brainstorm.md`
- SQL performance patterns: `_Initiation/_ralph/backend-patterns/sql-performance.md`
- RLS security: `_development/_audit/DB Migration Audit/07-idealized-db/rls-and-security.md`

### Good Pattern Examples
- Transactions: `src/server/functions/orders/orders.ts:614-685`
- Permissions: `src/server/functions/products/products.ts:226`
- Batch operations: `src/server/functions/orders/orders.ts:1263-1286`
- Parallel queries: `src/server/functions/products/products.ts:112-124`
