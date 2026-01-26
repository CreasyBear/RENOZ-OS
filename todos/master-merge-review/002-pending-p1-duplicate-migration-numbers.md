---
status: complete
priority: p1
issue_id: "MMR-002"
tags: [database, migrations, data-integrity, critical]
dependencies: []
---

# Duplicate Migration Numbers (0029_*)

## Problem Statement

There are multiple migration files with the same sequence number (0029_*), which can cause migration execution order issues and potentially corrupt the database schema. This is a critical data integrity issue.

## Findings

- **Location:** `drizzle/migrations/`
- **Conflicting files:**
  - `0029_add_ai_infrastructure_schema.sql`
  - `0029_force_rls_on_all_tables.sql`
- **Risk:** Migrations may execute in unpredictable order, leading to schema inconsistencies
- **Severity:** P1 CRITICAL - Must be resolved before running migrations on any environment

## Proposed Solutions

### Option 1: Renumber Migrations (Recommended)

**Approach:** Rename one of the 0029 migrations to 0030 (or higher) to establish proper ordering.

**Pros:**
- Clear execution order
- Simple fix
- No data loss risk

**Cons:**
- If already run in production, requires careful migration state management

**Effort:** 30 minutes

**Risk:** Low if not yet deployed

---

### Option 2: Merge Migrations

**Approach:** Combine both 0029 migrations into a single file with proper ordering.

**Pros:**
- Single migration reduces complexity
- Clear dependencies between changes

**Cons:**
- More invasive change
- Harder to track individual changes

**Effort:** 1 hour

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `drizzle/migrations/0029_add_ai_infrastructure_schema.sql`
- `drizzle/migrations/0029_force_rls_on_all_tables.sql`

**Database state check:**
```sql
SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 10;
```

## Resources

- **Review Agent:** Data Integrity Guardian
- **Drizzle Migration Docs:** https://orm.drizzle.team/docs/migrations

## Acceptance Criteria

- [ ] No duplicate migration numbers exist
- [ ] Migration order is logical (AI schema before RLS that uses it)
- [ ] All migrations apply cleanly on fresh database
- [ ] Existing environments can migrate safely

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Data Integrity Guardian Agent

**Actions:**
- Identified duplicate migration number 0029
- Assessed risk to database integrity
- Documented remediation options

**Learnings:**
- Always verify migration numbers before committing
- Use `npm run db:generate` to auto-generate proper sequence numbers
