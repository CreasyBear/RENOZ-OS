---
status: pending
priority: p2
issue_id: "SEC-003"
tags: [helicopter-review, security, ai-infrastructure, rls, multi-tenant, group-3]
dependencies: []
---

# SEC-003: Customer Activities Query Missing Org Scoping

## Problem Statement

The customer activities query in `getCustomerTool` fetches activities by `customerId` without verifying the activity belongs to the same organization. While RLS should protect this, defense-in-depth requires explicit org filtering.

## Findings

**Source:** Security Sentinel Agent + Helicopter Review

**Location:** `src/lib/ai/tools/customer-tools.ts:71-77`

**Current state (no org filter):**
```typescript
// Get last activity date - only filters by customerId
db
  .select({ createdAt: customerActivities.createdAt })
  .from(customerActivities)
  .where(eq(customerActivities.customerId, customerId))
  .orderBy(desc(customerActivities.createdAt))
  .limit(1),
```

**Required pattern:**
```typescript
// Should join to customers table to verify org ownership
db
  .select({ createdAt: customerActivities.createdAt })
  .from(customerActivities)
  .innerJoin(customers, eq(customerActivities.customerId, customers.id))
  .where(
    and(
      eq(customerActivities.customerId, customerId),
      eq(customers.organizationId, _context.organizationId)
    )
  )
  .orderBy(desc(customerActivities.createdAt))
  .limit(1),
```

**Risk:**
- If RLS is misconfigured, could leak activity data across orgs
- Defense-in-depth principle violated
- Inconsistent with other queries that do filter by org

## Proposed Solutions

### Option A: Add Join with Org Filter (Recommended)
- **Pros:** Defense-in-depth, consistent pattern
- **Cons:** Slightly more complex query
- **Effort:** Small (15 minutes)
- **Risk:** Low

### Option B: Add Org Column to Activities Table
- **Pros:** Direct filtering without join
- **Cons:** Requires migration, data denormalization
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

## Recommended Action

Option A - Add join to customers table with org filter.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/customer-tools.ts`

**Fixed query:**
```typescript
// Get last activity date with org scoping
db
  .select({ createdAt: customerActivities.createdAt })
  .from(customerActivities)
  .innerJoin(customers, eq(customerActivities.customerId, customers.id))
  .where(
    and(
      eq(customerActivities.customerId, customerId),
      eq(customers.organizationId, _context.organizationId)
    )
  )
  .orderBy(desc(customerActivities.createdAt))
  .limit(1),
```

## Acceptance Criteria

- [ ] Activity query includes join to customers table
- [ ] Organization filter applied via join
- [ ] Query still returns correct results
- [ ] Performance not significantly impacted (index on customerId)
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Always filter by org, even when RLS is in place |

## Resources

- `src/lib/ai/tools/customer-tools.ts` - Current implementation
- OWASP multi-tenant security guidelines
