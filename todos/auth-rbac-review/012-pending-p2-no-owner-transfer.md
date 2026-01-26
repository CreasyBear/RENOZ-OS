---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, user-management, owner, feature-gap]
dependencies: []
---

# No Owner Transfer Mechanism

## Problem Statement

The code prevents demoting/deactivating owners but provides NO mechanism to transfer ownership to another user. If the owner leaves or their account is compromised, the organization becomes unmanageable.

## Findings

**File:** `src/server/functions/users/users.ts`

Current protections exist:
```typescript
// Line 220-223: Prevent owner demotion
if (existingUser.role === 'owner' && updates.role && updates.role !== 'owner') {
  throw new Error('Cannot demote the organization owner');
}

// Line 322-325: Prevent owner deactivation
if (existingUser.role === 'owner') {
  throw new Error('Cannot deactivate the organization owner');
}
```

**But NO transfer function exists.**

## Proposed Solutions

### Solution 1: Add transferOwnership Function (Recommended)
Create an explicit ownership transfer function.

**Implementation:**
```typescript
export const transferOwnership = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ newOwnerId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Only current owner can transfer
    if (ctx.role !== 'owner') {
      throw new PermissionDeniedError('Only the owner can transfer ownership');
    }

    await db.transaction(async (tx) => {
      // Demote current owner to admin
      await tx.update(users).set({ role: 'admin' }).where(eq(users.id, ctx.user.id));

      // Promote new owner
      await tx.update(users).set({ role: 'owner' }).where(
        and(
          eq(users.id, data.newOwnerId),
          eq(users.organizationId, ctx.organizationId)
        )
      );
    });

    await logAuditEvent({
      action: 'ownership.transfer',
      oldValues: { ownerId: ctx.user.id },
      newValues: { ownerId: data.newOwnerId },
    });

    return { success: true };
  });
```

## Acceptance Criteria

- [ ] Owner can transfer to another active user in org
- [ ] Current owner becomes admin after transfer
- [ ] New owner gets full owner permissions
- [ ] Audit log records the transfer
- [ ] UI for ownership transfer in settings

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From data-integrity-guardian review |
