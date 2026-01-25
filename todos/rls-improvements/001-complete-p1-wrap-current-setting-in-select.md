---
status: pending
priority: p1
issue_id: "001"
tags: [rls, performance, supabase, security]
dependencies: []
---

# Wrap current_setting() in SELECT Subqueries for RLS Performance

## Problem Statement

All 30+ RLS policies call `current_setting('app.organization_id', true)` directly without wrapping in a SELECT subquery. Per Supabase performance documentation, this causes the function to be evaluated for **every row scanned** rather than being evaluated once and cached.

**Impact at scale:**
- At 100K rows: 50-100% slower queries
- At 1M rows: 2-5x slower queries

## Findings

**Current Pattern (inefficient):**
```sql
using (organization_id = current_setting('app.organization_id', true)::uuid)
```

**Supabase Recommended Pattern:**
```sql
using (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
```

**Affected Files (30+):**
- `drizzle/schema/settings/organizations.ts`
- `drizzle/schema/users/users.ts`
- `drizzle/schema/_shared/audit-logs.ts`
- `drizzle/schema/customers/customers.ts`
- `drizzle/schema/activities/activities.ts`
- All other schema files with `pgPolicy` definitions

## Proposed Solutions

### Solution 1: Global Search and Replace (Recommended)
Find all instances of the pattern and update with SELECT wrapper.

**Effort:** Small (1-2 hours)
**Risk:** Low (no functional change, same security semantics)

**Implementation:**
```bash
# Find all affected files
grep -r "current_setting('app.organization_id', true)::uuid" drizzle/schema/

# Update pattern in each file
# FROM: current_setting('app.organization_id', true)::uuid
# TO:   (SELECT current_setting('app.organization_id', true)::uuid)
```

### Solution 2: Create Helper SQL Function
Create a reusable function that returns the cached org ID.

```sql
CREATE OR REPLACE FUNCTION auth.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.organization_id', true)::uuid;
$$;
```

**Effort:** Medium (2-3 hours)
**Risk:** Low, but adds dependency

## Technical Details

**Why this matters:**
- PostgreSQL can cache scalar subquery results
- Bare function calls may be re-evaluated per row during sequential scans
- The optimizer treats `(SELECT func())` as a constant after first evaluation

## Acceptance Criteria

- [ ] All `current_setting()` calls in RLS policies wrapped in SELECT
- [ ] No functional changes to policy logic
- [ ] Generate migration file for policy updates
- [ ] Verify with EXPLAIN ANALYZE on test data

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From Supabase RLS performance review |
