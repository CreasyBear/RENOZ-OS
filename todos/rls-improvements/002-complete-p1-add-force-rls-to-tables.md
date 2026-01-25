---
status: pending
priority: p1
issue_id: "002"
tags: [rls, security, supabase]
dependencies: []
---

# Add FORCE ROW LEVEL SECURITY to All Tables

## Problem Statement

None of the tables have `FORCE ROW LEVEL SECURITY` enabled. Without this, table owners (typically the superuser or migration user) bypass RLS policies entirely. This could allow data leaks if:
- The application database user owns the tables
- Background jobs run with elevated privileges
- Admin tools connect directly to the database

## Findings

**Search Result:** No matches for `FORCE ROW LEVEL SECURITY` in the codebase.

**Current State:**
```sql
-- Tables have RLS enabled but not forced
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- Missing: ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
```

**Impact:** If the Supabase service role or migration user queries tables directly, RLS is bypassed.

## Proposed Solutions

### Solution 1: Add FORCE RLS via Migration (Recommended)

Create a single migration that adds `FORCE ROW LEVEL SECURITY` to all tables with RLS enabled.

**Effort:** Small (30 minutes)
**Risk:** Low

**Implementation:**
```sql
-- 0029_force_rls_on_all_tables.sql
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
-- ... for all tables with ENABLE ROW LEVEL SECURITY
```

### Solution 2: Update Schema Files

Add `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to each Drizzle schema file alongside the `ENABLE ROW LEVEL SECURITY`.

**Note:** Drizzle may not natively support `FORCE` - may require raw SQL in migration.

## Technical Details

**What FORCE does:**
- Without FORCE: Table owner and superusers bypass RLS
- With FORCE: RLS applies to ALL roles including owner

**When to bypass (intentionally):**
- Admin operations can use `SET ROLE` to a role that has `BYPASSRLS` privilege
- Or use separate connection with service role

## Acceptance Criteria

- [ ] All tables with RLS enabled also have FORCE ROW LEVEL SECURITY
- [ ] Migration file created and tested
- [ ] Verify service role operations still work (they bypass RLS by design)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From security-sentinel review |
