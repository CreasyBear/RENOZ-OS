---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, data-integrity, race-condition, security]
dependencies: []
---

# Race Condition in Invitation Acceptance - Double User Creation Possible

## Problem Statement

The `acceptInvitation` function has NO transaction wrapping its operations. Between checking the invitation status and marking it accepted, another request could create a duplicate user or leave the system in a corrupted state.

## Findings

**File:** `src/server/functions/users/invitations.ts` (lines 287-354)

```typescript
// Step 1: Check invitation (NOT locked)
const [invitation] = await db
  .select()
  .from(userInvitations)
  .where(and(eq(userInvitations.token, data.token), eq(userInvitations.status, 'pending')))
  .limit(1);

// ... time passes - RACE WINDOW ...

// Step 2: Create Supabase auth user
const { data: authData, error: authError } = await supabase.auth.admin.createUser({...});

// ... time passes - RACE WINDOW ...

// Step 3: Create application user
const [newUser] = await db.insert(users).values({...}).returning();

// Step 4: Mark invitation as accepted
await db.update(userInvitations).set({ status: 'accepted', ... })
```

**Race Scenario:**
```
Request 1: Check invitation → pending (OK)
Request 2: Check invitation → pending (OK)  -- BOTH PASS!
Request 1: Create Supabase user
Request 2: Create Supabase user → ERROR: email exists
Request 1: Create app user → SUCCESS
Request 1: Mark accepted
Request 2: Throws error, invitation marked accepted, no user created for Request 2
```

**Partial State Risk:**
If Supabase user creation succeeds but app user creation fails:
- Orphaned Supabase auth account exists
- Invitation remains "pending" but email is now taken
- User cannot re-accept invitation

## Proposed Solutions

### Solution 1: Transaction with Row Lock (Recommended)
Wrap the entire operation in a transaction with `SELECT FOR UPDATE` to lock the invitation row.

**Pros:**
- Prevents race condition
- Handles partial failures via rollback
- Standard solution

**Cons:**
- Cannot rollback Supabase user creation (external system)

**Effort:** Medium (1-2 hours)

**Implementation:**
```typescript
export const acceptInvitation = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationSchema)
  .handler(async ({ data }) => {
    // Rate limit check first (outside transaction)
    const request = getRequest();
    const clientId = getClientIdentifier(request);
    checkRateLimit('invitation-accept', clientId, RATE_LIMITS.publicAction);

    return await db.transaction(async (tx) => {
      // Lock the invitation row
      const [invitation] = await tx
        .select()
        .from(userInvitations)
        .where(and(
          eq(userInvitations.token, data.token),
          eq(userInvitations.status, 'pending')
        ))
        .for('update')  // ROW LOCK
        .limit(1);

      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Check expiry
      if (new Date() > invitation.expiresAt) {
        await tx.update(userInvitations).set({ status: 'expired' })...
        throw new Error('Invitation has expired');
      }

      // Mark as processing immediately to prevent race
      await tx.update(userInvitations).set({
        status: 'processing',  // New intermediate status
        version: sql`version + 1`
      });

      // Create Supabase auth user (OUTSIDE transaction - external system)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({...});

      if (authError) {
        // Rollback will restore invitation to pending
        throw new Error(`Failed to create account: ${authError.message}`);
      }

      // Create application user
      const [newUser] = await tx.insert(users).values({...}).returning();

      // Mark invitation as accepted
      await tx.update(userInvitations).set({
        status: 'accepted',
        acceptedAt: new Date(),
        version: sql`version + 1`,
      });

      return { success: true, userId: newUser.id, email: newUser.email };
    });
  });
```

### Solution 2: Optimistic Locking with Version Check
Use the version column to detect concurrent modifications.

**Pros:**
- Simpler than FOR UPDATE
- Works with connection poolers that don't support locks

**Cons:**
- Retries needed on conflict

## Acceptance Criteria

- [ ] acceptInvitation wrapped in transaction
- [ ] Row lock prevents concurrent acceptance
- [ ] Partial failures roll back cleanly
- [ ] Orphaned Supabase users handled (cleanup job or compensation)
- [ ] Load test: 10 concurrent accepts of same invitation only creates 1 user

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From data-integrity-guardian review |
