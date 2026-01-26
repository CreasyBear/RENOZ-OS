---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, data-integrity, schema, fk-constraint]
dependencies: []
---

# Invitation FK Has Contradictory NOT NULL + SET NULL Constraint

## Problem Statement

The `invitedBy` column in `user_invitations` is marked as `notNull()` but the FK specifies `onDelete: "set null"`. This creates a contradiction that will cause a constraint violation error if a user who sent invitations is hard-deleted.

## Findings

**File:** `drizzle/schema/users/user-invitations.ts` (lines 60-62)

```typescript
// CRITICAL - SET NULL mismatch with NOT NULL
invitedBy: uuid("invited_by")
  .notNull()  // <-- Requires a value
  .references(() => users.id, { onDelete: "set null" }),  // <-- Tries to set NULL on delete
```

**Crash Scenario:**
1. Admin invites users (creates invitation records with invitedBy = admin's ID)
2. Admin is hard-deleted from database (direct SQL or migration)
3. FK trigger tries to SET NULL on invitedBy
4. NOT NULL constraint violation error
5. Delete fails, data corruption possible

**Current Mitigation:** Users are soft-deleted, so FK reference remains valid. But direct database operations could trigger this.

## Proposed Solutions

### Solution 1: Change to onDelete: "cascade" (Recommended)
If the inviter is deleted, their invitations should also be deleted.

**Pros:**
- Clean data model
- No orphaned invitations
- Consistent with users cascade on org delete

**Cons:**
- Pending invitations lost if inviter deleted

**Effort:** Small

**Implementation:**
```typescript
invitedBy: uuid("invited_by")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
```

### Solution 2: Make invitedBy Nullable
Allow invitations to exist without an inviter reference.

**Pros:**
- Preserves invitation history
- Works with SET NULL

**Cons:**
- Loses inviter info on delete
- Makes auditing harder

**Implementation:**
```typescript
invitedBy: uuid("invited_by")
  .references(() => users.id, { onDelete: "set null" }),  // Remove .notNull()
```

### Solution 3: Change to onDelete: "restrict"
Prevent deleting users who have sent invitations.

**Pros:**
- Preserves all data
- Forces explicit handling

**Cons:**
- Blocks user deletion workflow

## Acceptance Criteria

- [ ] FK constraint updated with consistent delete behavior
- [ ] Migration generated and applied
- [ ] Tested: delete user with pending invitations works correctly
- [ ] Tested: invitation history preserved appropriately

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From data-integrity-guardian review |
