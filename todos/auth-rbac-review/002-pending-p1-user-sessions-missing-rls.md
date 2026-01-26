---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, multi-tenancy, rls, sessions]
dependencies: []
---

# User Sessions Table Missing RLS Policies

## Problem Statement

The `user_sessions` table stores session tokens, IP addresses, and user agent information but has NO RLS policies. Session tokens could be enumerated or stolen via direct database queries, enabling session hijacking attacks.

## Findings

**File:** `drizzle/schema/users/users.ts` (lines 148-198)

```typescript
export const userSessions = pgTable(
  "user_sessions",
  {
    sessionToken: text("session_token").notNull(), // SENSITIVE
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    // ...
  },
  (table) => ({
    sessionTokenUnique: uniqueIndex("idx_sessions_token_unique")...
    userIdx: index("idx_sessions_user").on(table.userId),
    // NO RLS policies defined
  })
);
```

## Proposed Solutions

### Solution 1: Add RLS via User Relationship (Recommended)
Add RLS policies that check the session belongs to a user in the current organization.

**Pros:**
- Protects session data
- Follows established patterns

**Cons:**
- Requires subquery to check user's organization

**Effort:** Small (30 min)

**Implementation:**
```typescript
selectPolicy: pgPolicy("user_sessions_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`user_id IN (
    SELECT id FROM users
    WHERE organization_id = current_setting('app.organization_id', true)::uuid
  )`,
}),
deletePolicy: pgPolicy("user_sessions_delete_policy", {
  for: "delete",
  to: "authenticated",
  using: sql`user_id IN (
    SELECT id FROM users
    WHERE organization_id = current_setting('app.organization_id', true)::uuid
  )`,
}),
```

### Solution 2: Add organizationId Column
Add `organizationId` directly to sessions table for simpler policies.

**Pros:**
- Simpler RLS policies
- Better query performance

**Cons:**
- Migration required
- Denormalization

**Effort:** Medium

## Acceptance Criteria

- [ ] RLS policies added to user_sessions table
- [ ] Migration generated and tested
- [ ] Verified users can only access their own sessions
- [ ] Verified session cleanup jobs still work

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From security-sentinel review |
