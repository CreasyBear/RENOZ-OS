---
status: complete
priority: p1
issue_id: "MMR-001"
tags: [security, sql-injection, code-review, critical]
dependencies: []
---

# SQL Injection via sql.raw() in check-expiring-warranties.ts

## Problem Statement

The `check-expiring-warranties.ts` file uses `sql.raw()` with interpolated variables, which bypasses parameterized query protection and creates a SQL injection vulnerability. This is a critical security issue that could allow attackers to execute arbitrary SQL commands.

## Findings

- **Location:** `src/trigger/jobs/check-expiring-warranties.ts`
- **Issue:** Using `sql.raw()` with string interpolation instead of parameterized queries
- **Risk:** SQL injection attacks can read/modify/delete any data in the database
- **Severity:** P1 CRITICAL - Immediate fix required before production deployment

## Proposed Solutions

### Option 1: Use Parameterized Queries (Recommended)

**Approach:** Replace `sql.raw()` with Drizzle's parameterized query syntax using `sql` template literal properly.

**Pros:**
- Completely eliminates SQL injection risk
- Maintains query flexibility
- Follows Drizzle best practices

**Cons:**
- Requires understanding Drizzle's SQL builder API

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Use Drizzle Query Builder

**Approach:** Rewrite the query using Drizzle's type-safe query builder instead of raw SQL.

**Pros:**
- Type-safe at compile time
- No SQL injection possible
- Better IDE support

**Cons:**
- May require query restructuring
- More verbose for complex queries

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/trigger/jobs/check-expiring-warranties.ts` - raw SQL usage

**Pattern to fix:**
```typescript
// WRONG - SQL Injection vulnerable
const result = await db.execute(sql.raw(`SELECT * FROM warranties WHERE date < '${userInput}'`))

// CORRECT - Parameterized
const result = await db.execute(sql`SELECT * FROM warranties WHERE date < ${userInput}`)
```

## Resources

- **Review Agent:** Security Sentinel
- **OWASP Reference:** https://owasp.org/Top10/A03_2021-Injection/
- **Drizzle SQL Docs:** https://orm.drizzle.team/docs/sql

## Acceptance Criteria

- [ ] All `sql.raw()` usages in the file are replaced with parameterized queries
- [ ] No string interpolation in SQL queries
- [ ] Query functionality verified with tests
- [ ] Security review passed

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Security Sentinel Agent

**Actions:**
- Identified SQL injection vulnerability in check-expiring-warranties.ts
- Classified as P1 CRITICAL security issue
- Documented remediation approach

**Learnings:**
- Always use parameterized queries with Drizzle
- `sql.raw()` should never be used with user-controlled data
