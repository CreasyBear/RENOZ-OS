---
status: pending
priority: p1
issue_id: "003"
tags: [rls, security, orders, financial]
dependencies: []
---

# Orders Table Missing Standard CRUD RLS Policies

## Problem Statement

The `orders` and `order_line_items` tables only have **portal select policies** - they are missing standard CRUD (Create, Read, Update, Delete) RLS policies for internal users. This creates a security gap where:

1. Internal user queries rely solely on application-level filtering
2. INSERT/UPDATE/DELETE operations have no RLS protection at all
3. SQL injection or bypassed auth could expose all order data

## Findings

**File:** `drizzle/schema/orders/orders.ts`

**Current State:**
```typescript
// Only has portal policy for customer portal access
portalSelectPolicy: pgPolicy("orders_portal_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`(
    ${table.organizationId} = current_setting('app.organization_id', true)::uuid
    OR EXISTS (SELECT 1 FROM portal_identities ...)
  )`,
}),
```

**Missing Policies:**
- `orders_select_policy` - Standard org isolation for SELECT
- `orders_insert_policy` - INSERT protection
- `orders_update_policy` - UPDATE protection
- `orders_delete_policy` - DELETE protection

Same issue affects `order_line_items`.

## Proposed Solutions

### Solution 1: Add Standard CRUD Policies (Recommended)

Add the four standard policies alongside the existing portal policy.

**Effort:** Medium (1 hour)
**Risk:** Low

**Implementation:**
```typescript
// Add to orders table
selectPolicy: pgPolicy("orders_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
}),
insertPolicy: pgPolicy("orders_insert_policy", {
  for: "insert",
  to: "authenticated",
  withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
}),
updatePolicy: pgPolicy("orders_update_policy", {
  for: "update",
  to: "authenticated",
  using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
  withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
}),
deletePolicy: pgPolicy("orders_delete_policy", {
  for: "delete",
  to: "authenticated",
  using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
}),
// Keep existing portal policy
portalSelectPolicy: pgPolicy("orders_portal_select_policy", {...}),
```

## Technical Details

**Policy Evaluation:**
- PostgreSQL uses OR logic between multiple policies for the same operation
- The portal SELECT policy and standard SELECT policy will both allow access
- For INSERT/UPDATE/DELETE, only the new policies apply (portal doesn't modify data)

## Acceptance Criteria

- [ ] orders table has all 5 policies (4 CRUD + 1 portal)
- [ ] order_line_items table has all 5 policies
- [ ] Generate migration for policy changes
- [ ] Test internal user CRUD operations work
- [ ] Test portal user SELECT still works

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From architecture-strategist review |
