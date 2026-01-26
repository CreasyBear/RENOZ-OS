---
status: pending
priority: p2
issue_id: "005"
tags: [rls, performance, index]
dependencies: []
---

# Add Composite Index for user_sessions RLS Performance

## Problem Statement

The `user_sessions` RLS policy uses a subquery that scans the `users` table:

```sql
USING (user_id IN (
  SELECT id FROM users
  WHERE organization_id = current_setting('app.organization_id', true)::uuid
))
```

This lacks an optimal index for the subquery, causing performance degradation at scale.

**Impact:**
- At 10K sessions: ~100-200ms added latency
- At 100K sessions: ~500ms-1s latency
- At 1M sessions: Query timeouts likely

## Findings

**Existing indexes on users table:**
- `idx_users_org_role` on `(organization_id, role)`
- `idx_users_org_status` on `(organization_id, status)`

**Missing:** A covering index on `(organization_id, id)` that the subquery can use efficiently.

## Proposed Solutions

### Solution 1: Add Composite Index (Recommended)

Create an index specifically for the RLS subquery pattern.

**Effort:** Small (15 minutes)
**Risk:** Low (CONCURRENTLY prevents locking)

**Implementation:**
```sql
CREATE INDEX CONCURRENTLY idx_users_org_id
ON users(organization_id, id);
```

### Solution 2: Use Covering Index with INCLUDE

For even better performance, include the id in a covering index:

```sql
CREATE INDEX CONCURRENTLY idx_users_org_covering
ON users(organization_id) INCLUDE (id);
```

## Technical Details

**Why this helps:**
- The subquery `SELECT id FROM users WHERE organization_id = X` becomes an index-only scan
- No need to access the table heap for the id value
- Significantly faster for large users tables

**Index size estimate:**
- ~16 bytes per row (UUID + UUID)
- At 10K users: ~160KB
- At 100K users: ~1.6MB

## Acceptance Criteria

- [ ] Index created with CONCURRENTLY option
- [ ] Query plan shows index-only scan for user_sessions RLS
- [ ] EXPLAIN ANALYZE shows improved performance

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From performance-oracle review |
