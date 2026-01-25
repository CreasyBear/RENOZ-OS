---
status: pending
priority: p2
issue_id: "004"
tags: [rls, security, multi-tenancy]
dependencies: ["001", "002", "003"]
---

# Add RLS to Critical Tables (Phase 1: Financial & Core)

## Problem Statement

63 tables with `organizationId` columns lack RLS policies. This todo focuses on the **highest-risk tables** that should be addressed first:

- **Financial data** (credit_notes, payment tables)
- **Core business data** (products, inventory)
- **Customer data** (warranties)

## Findings

**Phase 1 Priority Tables (15 tables):**

| Table | Risk | Data Type |
|-------|------|-----------|
| products | HIGH | Product catalog, pricing |
| inventory | HIGH | Stock levels, values |
| inventory_movements | HIGH | Audit trail |
| warranties | HIGH | Customer warranty data |
| warranty_claims | HIGH | Claim details |
| warranty_policies | HIGH | Coverage terms |
| credit_notes | HIGH | Financial credits |
| suppliers | MEDIUM | Vendor data |
| purchase_orders | MEDIUM | Procurement |
| purchase_order_items | MEDIUM | PO line items |
| order_amendments | MEDIUM | Order changes |
| order_shipments | MEDIUM | Shipping details |
| stock_counts | MEDIUM | Count data |
| stock_count_items | MEDIUM | Count details |
| warehouse_locations | MEDIUM | Location data |

## Proposed Solutions

### Solution 1: Phased Migration Approach (Recommended)

Add RLS to critical tables first, then expand in subsequent phases.

**Effort:** Large (4-6 hours for Phase 1)
**Risk:** Low-Medium

**Migration Strategy:**
```sql
-- 0030_add_rls_phase1_critical.sql

-- Enable RLS on each table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY products_select_policy ON products
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY products_insert_policy ON products
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY products_update_policy ON products
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

CREATE POLICY products_delete_policy ON products
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- Repeat for each table...
```

### Solution 2: Schema File Updates

Update each Drizzle schema file with pgPolicy definitions.

**Pros:** Schema stays in sync with migrations
**Cons:** Requires updating 15 files

## Technical Details

**Standard Policy Template:**
```typescript
const standardRlsPolicies = (tableName: string) => ({
  selectPolicy: pgPolicy(`${tableName}_select_policy`, {
    for: "select",
    to: "authenticated",
    using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
  }),
  insertPolicy: pgPolicy(`${tableName}_insert_policy`, {
    for: "insert",
    to: "authenticated",
    withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
  }),
  updatePolicy: pgPolicy(`${tableName}_update_policy`, {
    for: "update",
    to: "authenticated",
    using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
  }),
  deletePolicy: pgPolicy(`${tableName}_delete_policy`, {
    for: "delete",
    to: "authenticated",
    using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
  }),
});
```

## Acceptance Criteria

- [ ] All 15 Phase 1 tables have RLS enabled + forced
- [ ] All tables have 4 CRUD policies
- [ ] Migration file generated
- [ ] Tests verify org isolation works
- [ ] Application queries still function normally

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From architecture-strategist review |
