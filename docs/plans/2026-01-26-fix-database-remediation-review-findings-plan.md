---
title: "fix: Database Remediation Review Findings"
type: fix
date: 2026-01-26
priority: critical
estimated_effort: 2-3 days
---

# Database Remediation Review Findings

## Overview

Address 12 findings from comprehensive code review of database query remediation work (Phases 1-4). Findings range from critical security vulnerabilities to code quality improvements.

## Problem Statement / Motivation

A multi-agent code review of the Phase 1-4 remediation work identified:
- **3 Critical (P1)** issues that block production deployment
- **5 Important (P2)** issues that should be fixed before merge
- **4 Nice-to-have (P3)** improvements for code quality

The most severe issues involve:
1. **LIKE injection vulnerabilities** in 20+ files not using `escapeLike()`
2. **Cross-tenant data corruption risk** in customer merge operations
3. **Race conditions** in 3 functions with check-then-act patterns

## Proposed Solution

Three-phase approach prioritizing security and data integrity:

```
Phase A: Critical Security & Integrity (P1) - BLOCKS DEPLOYMENT
├── A1: Fix LIKE injection in 20+ files
├── A2: Add organizationId to mergeCustomers queries
└── A3: Wrap 3 functions in transactions

Phase B: Important Fixes (P2) - Should Fix Before Merge
├── B1: Resolve duplicate server functions directory
├── B2: Convert generic errors to typed errors (56 files)
├── B3: Fix GST_RATE local definitions
├── B4: Fix restoreQuoteVersion opportunity update
└── B5: Add inventory read permissions

Phase C: Enhancements (P3) - Backlog
├── C1: Remove unused helper functions
├── C2: Add barrel exports to domain directories
├── C3: Add schedules array export
└── C4: Optimize AR aging detail query
```

---

## Phase A: Critical Security & Integrity (P1)

### A1: Fix LIKE Injection Vulnerabilities

**Issue**: 20+ files use raw string interpolation in `ilike()` patterns.

**Attack Vector**: Malicious users can inject `%` or `_` to manipulate search queries, bypass filters, or cause ReDoS-like performance degradation.

**Files to Fix**:

| File | Lines | Pattern |
|------|-------|---------|
| `products/products.ts` | 77-79, 469-470 | `ilike(products.name, \`%${search}%\`)` |
| `orders/orders.ts` | 278-279, 1649-1650 | `ilike(orders.orderNumber, \`%${search}%\`)` |
| `orders/order-templates.ts` | 90-91 | name search |
| `inventory/locations.ts` | 71-72, 389-390 | name search |
| `inventory/inventory.ts` | 105-106 | item search |
| `warranty/warranties.ts` | 222-225 | serial/name search |
| `communications/email-suppression.ts` | 65 | email search |
| `jobs/job-assignments.ts` | 293-295 | job search |
| `support/knowledge-base.ts` | 393 | article search |
| `lib/ai/tools/customer-tools.ts` | 205-206 | AI search |
| `lib/server/functions/product-search.ts` | 490-491 | product search |
| `lib/server/functions/orders.ts` | 265-266, 360 | order search |
| `lib/server/functions/products.ts` | 76-78, 485-486 | product search |
| `server/customers.ts` | 84, 96, 155, 167 | customer search |

**Fix Pattern**:
```typescript
// BEFORE (vulnerable)
ilike(products.name, `%${search}%`)

// AFTER (safe)
import { containsPattern } from '@/lib/db/utils';
ilike(products.name, containsPattern(search))
```

**Acceptance Criteria**:
- [ ] All 20+ files use `containsPattern()` or `escapeLike()`
- [ ] Grep for `ilike.*\`%\$\{` returns 0 results
- [ ] TypeScript compiles without errors

---

### A2: Add organizationId to mergeCustomers

**Issue**: UPDATE/DELETE queries in customer merge lack tenant isolation.

**File**: `src/server/functions/customers/customers.ts:1149-1269`

**Vulnerable Queries** (7 total):
1. Line 1149-1153: `contacts.set({ customerId })` - no org filter
2. Line 1156-1159: `addresses.set({ customerId })` - no org filter
3. Line 1162-1165: `customerActivities.set({ customerId })` - no org filter
4. Line 1188-1191: `customerTagAssignments.delete()` - no org filter
5. Line 1193-1197: `customerHealthMetrics.set({ customerId })` - no org filter
6. Line 1222-1225: `customerPriorities.delete()` - no org filter
7. Line 1263-1269: `customers.update()` - no org filter

**Fix Pattern**:
```typescript
// BEFORE
await tx.update(contacts)
  .set({ customerId: primaryCustomerId })
  .where(inArray(contacts.customerId, duplicateCustomerIds));

// AFTER (defense-in-depth)
await tx.update(contacts)
  .set({ customerId: primaryCustomerId })
  .where(and(
    inArray(contacts.customerId, duplicateCustomerIds),
    eq(contacts.organizationId, ctx.organizationId)
  ));
```

**Acceptance Criteria**:
- [ ] All 7 UPDATE/DELETE queries include `organizationId` filter
- [ ] Transaction wraps entire merge operation
- [ ] Test: Attempt merge with cross-tenant IDs fails

---

### A3: Fix Race Conditions (3 Functions)

**Issue**: Check-then-act patterns without transaction wrapping.

#### A3.1: `deletePaymentPlan` (payment-schedules.ts:640-686)

```typescript
// BEFORE: Race condition
const paidInstallments = await db.select()...  // Check
if (paidInstallments.length > 0) throw error;
await db.delete(paymentSchedules)...           // Act (race!)

// AFTER: Atomic check-and-delete
await db.transaction(async (tx) => {
  const paidInstallments = await tx.select()...
  if (paidInstallments.length > 0) throw new ConflictError(...);
  await tx.delete(paymentSchedules)...
});
```

#### A3.2: `restoreQuoteVersion` (quote-versions.ts:244-301)

- Wrap in transaction
- Also update opportunity value to match restored quote total

#### A3.3: `extendQuoteValidity` (quote-versions.ts:686-759)

- Wrap opportunity update + activity log in transaction
- Ensures audit trail is atomic with the change

**Acceptance Criteria**:
- [ ] All 3 functions wrapped in `db.transaction()`
- [ ] `restoreQuoteVersion` updates opportunity value
- [ ] No check-then-act patterns outside transactions

---

## Phase B: Important Fixes (P2)

### B1: Resolve Duplicate Server Functions Directory

**Issue**: Two parallel directories with 50+ imports from wrong location.

```
src/server/functions/<domain>/  ← Standard (per CLAUDE.md)
src/lib/server/functions/       ← Non-standard (50+ imports)
```

**Duplicate Files**:
| File | In `lib/server/functions/` | In `server/functions/<domain>/` |
|------|---------------------------|--------------------------------|
| orders.ts | ✓ | ✓ (orders/) |
| order-amendments.ts | ✓ | ✓ (orders/) |
| products.ts | ✓ | ✓ (products/) |
| product-search.ts | ✓ | ✓ (products/) |
| + 8 more | ✓ | ✓ |

**Decision**: Consolidate to `src/server/functions/<domain>/` (standard location).

**Tasks**:
- [ ] Identify all unique content in `lib/server/functions/`
- [ ] Merge any unique functions to canonical files
- [ ] Update 50+ imports to use `@/server/functions/<domain>/`
- [ ] Delete `src/lib/server/functions/` directory
- [ ] Verify no broken imports

**Acceptance Criteria**:
- [ ] `src/lib/server/functions/` directory deleted
- [ ] All imports use `@/server/functions/`
- [ ] TypeScript compiles, app runs

---

### B2: Convert Generic Errors to Typed Errors

**Issue**: 56 files use `throw new Error()` instead of typed error classes.

**Available Error Classes** (`@/lib/server/errors`):
- `NotFoundError` - Resource not found (HTTP 404)
- `ValidationError` - Business rule violation (HTTP 400)
- `ConflictError` - Already exists / version conflict (HTTP 409)
- `ServerError` - Config / external service error (HTTP 500)
- `AuthError` - Authentication failure (HTTP 401)

**High-Priority Files** (most errors):
| File | Count | Primary Error Types |
|------|-------|---------------------|
| `suppliers/purchase-orders.ts` | 16 | NotFoundError, ValidationError |
| `pipeline/pipeline.ts` | 15 | NotFoundError, ValidationError |
| `pipeline/quote-versions.ts` | 15 | NotFoundError, ValidationError |
| `users/user-groups.ts` | 15 | NotFoundError, ConflictError |
| `warranty/warranty-claims.ts` | 14 | NotFoundError, ValidationError |
| `warranty/warranty-policies.ts` | 14 | NotFoundError, ValidationError |
| `customers/customers.ts` | 14 | NotFoundError, ConflictError |

**Conversion Pattern**:
```typescript
// BEFORE
throw new Error('Customer not found');
throw new Error('Email already exists');
throw new Error('Cannot approve pending order');

// AFTER
throw new NotFoundError('Customer not found', 'customer');
throw new ConflictError('Email already exists');
throw new ValidationError('Cannot approve pending order');
```

**Acceptance Criteria**:
- [ ] Grep for `throw new Error\(` in `src/server/functions/` returns 0
- [ ] All errors use appropriate typed class
- [ ] HTTP status codes are correct (404, 400, 409, 500, 401)

---

### B3: Fix GST_RATE Local Definitions

**Issue**: 2 files define `const GST_RATE = 0.1` locally instead of importing.

**Files**:
- `src/lib/server/functions/orders.ts:143`
- `src/lib/server/functions/order-amendments.ts:50`

**Fix**:
```typescript
// Replace local definition
const GST_RATE = 0.1;  // DELETE

// With import
import { GST_RATE } from '@/lib/order-calculations';
```

**Note**: These files are in the duplicate directory (B1). If B1 deletes them, this is resolved automatically.

---

### B4: Fix restoreQuoteVersion Opportunity Update

**Issue**: Restored quote doesn't update opportunity value, causing stale data.

**File**: `src/server/functions/pipeline/quote-versions.ts:244-301`

**Fix**: Add opportunity value update within transaction (covered in A3.2).

```typescript
const result = await db.transaction(async (tx) => {
  const [newVersion] = await tx.insert(quoteVersions)...

  // ADD: Update opportunity value to match restored quote
  await tx.update(opportunities)
    .set({
      value: sourceVersion[0].total,
      weightedValue: Math.round(
        sourceVersion[0].total * ((opportunity.probability ?? 50) / 100)
      ),
      updatedBy: ctx.user.id,
    })
    .where(eq(opportunities.id, opportunityId));

  return newVersion;
});
```

---

### B5: Add Inventory Read Permissions

**Issue**: Inventory read operations use `withAuth()` without explicit permission.

**Files**:
- `inventory/inventory.ts`: `listInventory`, `getInventoryItem`
- `inventory/forecasting.ts`: `listForecasts`, `getProductForecast`, `calculateSafetyStock`, `getReorderRecommendations`
- `inventory/stock-counts.ts`: `listStockCounts`, `getStockCount`

**Fix**:
```typescript
// BEFORE
const ctx = await withAuth();

// AFTER
const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
```

**Acceptance Criteria**:
- [ ] All inventory read operations have explicit `PERMISSIONS.inventory.read`
- [ ] Write operations already have correct permissions (verified)

---

## Phase C: Enhancements (P3)

### C1: Remove Unused Helper Functions

**File**: `src/lib/db/utils.ts`

**Functions to Remove** (0 usages):
- `startsWithPattern()` (lines 62-68)
- `endsWithPattern()` (lines 72-74)

**LOC Saved**: 14 lines

---

### C2: Add Barrel Exports to Domain Directories

**Issue**: Only 4/20+ domain subdirectories have `index.ts` barrel exports.

**Directories Needing `index.ts`**:
- `src/server/functions/customers/`
- `src/server/functions/orders/`
- `src/server/functions/inventory/`
- `src/server/functions/jobs/`
- `src/server/functions/pipeline/`
- `src/server/functions/products/`
- `src/server/functions/support/`
- `src/server/functions/users/`
- `src/server/functions/financial/`
- `src/server/functions/communications/`
- + others

**Template**:
```typescript
// src/server/functions/customers/index.ts
export * from './customers';
export * from './customer-analytics';
export * from './customer-duplicates';
// etc.
```

---

### C3: Add Schedules Array Export

**File**: `src/trigger/jobs/index.ts`

**Add**:
```typescript
export const schedules = [
  expireInvitationsSchedule,
  autoEscalateApprovalsSchedule,
  checkInventoryAlertsSchedule,
];
```

---

### C4: Optimize AR Aging Detail Query

**File**: `src/server/functions/financial/ar-aging.ts:395-444`

**Issue**: `getARAgingCustomerDetail` uses in-memory loop for summary.

**Optimization**: Move summary calculation to SQL subquery.

**Priority**: Low - only affects admin reports with large invoice counts.

---

## Technical Considerations

### Security
- P1 fixes must be completed before any production deployment
- LIKE injection is exploitable by any authenticated user
- Cross-tenant risk in merge is limited by initial validation but defense-in-depth required

### Performance
- No significant performance impact from P1/P2 fixes
- Adding `organizationId` to WHERE clauses may improve query plans (index usage)

### Backward Compatibility
- All changes are internal refactors
- No API changes
- No migration required

---

## Acceptance Criteria

### Phase A (Critical)
- [ ] Zero LIKE injection vulnerabilities
- [ ] All merge operations have tenant isolation
- [ ] No race conditions in payment/quote functions

### Phase B (Important)
- [ ] Single server functions directory
- [ ] All errors use typed classes
- [ ] GST_RATE has single source of truth
- [ ] Quote restoration updates opportunity value
- [ ] Inventory reads have permissions

### Phase C (Nice-to-Have)
- [ ] No unused helper functions
- [ ] Consistent barrel exports
- [ ] Schedules array exported
- [ ] AR aging optimized

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| LIKE injection vulnerabilities | 20+ | 0 |
| Cross-tenant query risks | 7 | 0 |
| Race condition functions | 3 | 0 |
| Duplicate directories | 2 | 1 |
| Generic error throws | 56 files | 0 |
| Missing permissions | 8 handlers | 0 |

---

## Dependencies & Sequencing

### Task Dependencies

```
B3 (GST_RATE) ─────► BLOCKED_BY ─────► B1 (directory consolidation)
                     If B1 deletes lib/server/functions/, B3 is auto-resolved

B2 verification ───► BLOCKED_BY ─────► B1 (directory consolidation)
                     Grep target directory changes after consolidation

C1 (helper removal) ► BLOCKED_BY ─────► A1 decision on prefix patterns
                     If prefix patterns need startsWithPattern(), don't remove it

B4 (opportunity) ──► MERGED_WITH ─────► A3.2 (restoreQuoteVersion)
                     Same function, same transaction
```

### Recommended Execution Order

```
1. A1 - LIKE injection (can start immediately)
2. A2 - Cross-tenant merge (can start immediately, parallel with A1)
3. A3 - Race conditions (includes B4, can start immediately)
   └── A3.2 includes B4 fix
4. B1 - Directory consolidation (after A1-A3 to avoid conflicts)
   └── Resolves B3 automatically
5. B2 - Error typing (after B1)
6. B5 - Inventory permissions (parallel with B2)
7. C1-C4 - Enhancements (after all B tasks)
```

### Risks
- **Medium**: Breaking imports when consolidating directories
  - Mitigation: Use `grep -r` to find all imports before deletion
- **Low**: Typed error changes affect error handling UI
  - Mitigation: Error classes already exist and are used elsewhere

---

## Verification Commands

### Pre-Implementation State Check

```bash
# A1: Count current LIKE injection vulnerabilities
grep -r "ilike.*\`%\$\{" src/ --include="*.ts" | wc -l
grep -r "ILIKE.*\$\{\`%" src/ --include="*.ts" | wc -l
grep -r "\`\$\{.*%\`" src/ --include="*.ts" | grep -i ilike | wc -l

# B2: Count generic errors
grep -r "throw new Error\(" src/server/functions/ --include="*.ts" | wc -l

# B1: List duplicate directory files
ls src/lib/server/functions/*.ts 2>/dev/null
```

### Post-Implementation Verification

```bash
# A1: Zero LIKE injection
grep -r "ilike.*\`%\$\{" src/ --include="*.ts" && echo "FAIL" || echo "PASS"

# A2: Verify organizationId in merge (manual review)
grep -A5 "inArray.*customerId.*duplicateCustomerIds" src/server/functions/customers/customers.ts

# B1: Directory deleted
[ ! -d "src/lib/server/functions" ] && echo "PASS" || echo "FAIL"

# B2: Zero generic errors
grep -r "throw new Error\(" src/server/functions/ --include="*.ts" && echo "FAIL" || echo "PASS"

# TypeScript compiles
npm run typecheck
```

---

## Error Type Decision Tree

For B2 (Generic Error Conversion), use this mapping:

| Error Message Pattern | Error Class | Example |
|----------------------|-------------|---------|
| "not found" / "does not exist" | `NotFoundError` | `throw new NotFoundError('Customer not found', 'customer')` |
| "already exists" / "duplicate" | `ConflictError` | `throw new ConflictError('Email already exists')` |
| "cannot" / "invalid" / "must be" | `ValidationError` | `throw new ValidationError('Cannot approve pending order')` |
| "modified by another" / "version" | `ConflictError` | `throw new ConflictError('Record modified by another user')` |
| Auth/permission failures | `AuthError` | `throw new AuthError('Session expired')` |
| Config/external service | `ServerError` | `throw new ServerError('Database connection failed')` |

---

## References

### Internal
- Original remediation plan: `docs/plans/2026-01-25-fix-database-query-remediation-plan.md`
- Error classes: `src/lib/server/errors.ts`
- DB utilities: `src/lib/db/utils.ts`
- Permissions: `src/lib/auth/permissions.ts`

### Institutional Learnings
- Multi-tenant isolation: `docs/solutions/DOCUMENT_GENERATION_QUICK_REFERENCE.md`
- Code organization: `docs/solutions/codebase-organization/consolidate-duplicate-zod-schemas.md`

### Review Agents Used
- security-sentinel
- data-integrity-guardian
- performance-oracle
- pattern-recognition-specialist
- architecture-strategist
- code-simplicity-reviewer
