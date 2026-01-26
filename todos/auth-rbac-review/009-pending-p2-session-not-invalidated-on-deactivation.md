---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, security, sessions, deactivation]
dependencies: []
---

# Sessions Not Invalidated When User is Deactivated

## Problem Statement

When a user is deactivated via `deactivateUser`, their Supabase session remains valid and their `userSessions` table entries are NOT cleared. A deactivated user can continue using the application until their JWT expires (could be hours/days).

## Findings

**File:** `src/server/functions/users/users.ts` (lines 300-354)

```typescript
export const deactivateUser = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.deactivate });

    // ... validation ...

    // Soft delete - BUT NO SESSION INVALIDATION
    await db
      .update(users)
      .set({
        status: 'deactivated',
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, data.id));

    // No: await supabase.auth.admin.signOut(userId)
    // No: await db.delete(userSessions).where(eq(userSessions.userId, data.id))

    return { success: true };
  });
```

**Partial Mitigation:**
`withAuth()` in `protected.ts` line 111 DOES check status:
```typescript
if (appUser.status !== 'active') {
  throw new AuthError(`Account is ${appUser.status}...`);
}
```

**But This Only Blocks:**
- Server function calls

**Does NOT Block:**
- Client-side navigation (user sees stale UI)
- Real-time Supabase subscriptions
- Any cached data in TanStack Query

## Proposed Solutions

### Solution 1: Invalidate All Sessions (Recommended)
Terminate Supabase session and delete local sessions on deactivation.

**Pros:**
- Immediate effect
- Clean security posture
- No lingering access

**Cons:**
- Requires service role access
- User sees abrupt logout

**Effort:** Small (30 min)

**Implementation:**
```typescript
export const deactivateUser = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.deactivate });

    const [existingUser] = await db
      .select({ id: users.id, authId: users.authId, role: users.role, email: users.email })
      .from(users)
      .where(...)
      .limit(1);

    // ... validation ...

    // Soft delete
    await db.update(users).set({
      status: 'deactivated',
      deletedAt: new Date(),
      updatedBy: ctx.user.id,
    }).where(eq(users.id, data.id));

    // NEW: Invalidate Supabase session
    const supabase = getServerSupabase();
    await supabase.auth.admin.signOut(existingUser.authId, 'global');

    // NEW: Delete local sessions
    await db.delete(userSessions).where(eq(userSessions.userId, data.id));

    // Log audit event
    await logAuditEvent({...});

    return { success: true };
  });
```

### Solution 2: Short JWT Expiry + Frequent Checks
Rely on short JWTs and frequent status checks.

**Pros:**
- No explicit session termination needed
- Works with current architecture

**Cons:**
- Still has gap (5-15 min typically)
- More database queries

## Acceptance Criteria

- [ ] Deactivated user is logged out immediately
- [ ] All Supabase sessions for user are terminated
- [ ] Local session records are deleted
- [ ] Audit log records session termination
- [ ] Works for both individual and bulk deactivation

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From data-integrity-guardian review |
