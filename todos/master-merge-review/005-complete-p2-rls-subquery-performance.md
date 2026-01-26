---
status: complete
priority: p2
issue_id: "MMR-005"
tags: [performance, rls, database, security]
dependencies: []
---

# RLS Subquery Performance Risks

## Problem Statement

Some Row-Level Security (RLS) policies use subqueries that may not be optimized, potentially causing performance degradation on tables with large row counts.

## Findings

- **Location:** RLS policies in migrations
- **Issue:** Subqueries in RLS USING clauses may cause full table scans
- **Impact:** Query performance degrades with table size
- **Severity:** P2 HIGH - Performance issue that worsens over time

**Example problematic pattern:**
```sql
CREATE POLICY "users_org_isolation" ON users
USING (organization_id IN (
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
));
```

## Proposed Solutions

### Option 1: Use Session Variables (Recommended)

**Approach:** Store organization_id in session variable, use direct comparison instead of subquery.

**Pros:**
- O(1) lookup instead of subquery
- Consistent with Supabase best practices
- Already partially implemented

**Cons:**
- Requires session setup on each request
- Need to ensure variable is always set

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Add Supporting Indexes

**Approach:** Add composite indexes that support the RLS subqueries efficiently.

**Pros:**
- No policy changes needed
- Can improve other query performance too

**Cons:**
- Doesn't eliminate subquery overhead
- Index maintenance overhead

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 3: Materialized View for User-Orgs

**Approach:** Create materialized view of user-organization mappings refreshed on change.

**Pros:**
- Very fast lookups
- Can be indexed

**Cons:**
- Stale data risk
- Complexity in refresh logic

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `drizzle/migrations/0030_add_rls_phase1_critical_tables.sql`
- `drizzle/migrations/0031_update_rls_policies_performance.sql`
- `drizzle/migrations/0032_add_rls_phase2_all_tables.sql`

**Optimized pattern using session variable:**
```sql
CREATE POLICY "users_org_isolation" ON users
USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

## Resources

- **Review Agent:** Performance Oracle
- **Supabase RLS Performance:** https://supabase.com/docs/guides/auth/row-level-security#performance

## Acceptance Criteria

- [ ] RLS policies use session variables where possible
- [ ] Subqueries have supporting indexes
- [ ] Query performance tested with large datasets
- [ ] No security regression (same isolation guarantees)

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Performance Oracle Agent

**Actions:**
- Identified RLS policies with subquery patterns
- Assessed performance implications
- Recommended session variable approach

**Learnings:**
- RLS performance critical for multi-tenant apps
- Session variables are Supabase recommended pattern
