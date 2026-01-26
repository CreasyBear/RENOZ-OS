---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, data-integrity, transaction, signup]
dependencies: []
---

# Signup Flow Not Wrapped in Transaction - Orphaned Org/User Possible

## Problem Statement

The signup flow in `completeSignup` creates both an organization AND owner user with NO transaction wrapper. If the organization insert succeeds but the user insert fails, an orphaned organization with no owner is created.

## Findings

**File:** `src/server/functions/auth/confirm.ts` (lines 52-78)

```typescript
// Lines 52-78: NOT wrapped in transaction
const [organization] = await db.insert(organizations).values({
  name: data.organizationName,
  slug: generateSlug(data.organizationName),
  // ...
}).returning();

// FAILURE BETWEEN THESE COULD ORPHAN THE ORG

const [user] = await db.insert(users).values({
  authId: authUser.id,
  organizationId: organization.id,  // References just-created org
  email: authUser.email,
  role: 'owner',
  // ...
}).returning();

// ALSO: NO AUDIT LOG for organization/user creation
```

**Orphan Scenario:**
1. Organization inserted successfully
2. User insert fails (constraint violation, network error, etc.)
3. Organization exists with no owner
4. Supabase auth user exists but no app user
5. User cannot complete signup, cannot retry (org slug taken)

**Additional Issue:**
No audit log for the initial signup - creates compliance gap.

## Proposed Solutions

### Solution 1: Wrap in Transaction (Recommended)
Use Drizzle's transaction API to ensure atomicity.

**Pros:**
- Atomic operation
- Automatic rollback on failure
- Standard solution

**Cons:**
- Cannot rollback Supabase auth (external system)

**Effort:** Small (1 hour)

**Implementation:**
```typescript
export const completeSignup = createServerFn({ method: 'POST' })
  .inputValidator(completeSignupSchema)
  .handler(async ({ data }) => {
    // Validate auth user exists (external - before transaction)
    const authUser = await getServerUser(getRequest());
    if (!authUser) throw new AuthError('Authentication required');

    // Transaction for database operations
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [organization] = await tx.insert(organizations).values({
        name: data.organizationName,
        slug: generateSlug(data.organizationName),
        settings: { timezone: 'Australia/Sydney', ... },
      }).returning();

      // Create owner user
      const [user] = await tx.insert(users).values({
        authId: authUser.id,
        organizationId: organization.id,
        email: authUser.email,
        role: 'owner',
        status: 'active',
      }).returning();

      // Audit log (inside transaction)
      await tx.insert(auditLogs).values({
        organizationId: organization.id,
        userId: user.id,
        action: AUDIT_ACTIONS.ORGANIZATION_CREATE,
        entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
        entityId: organization.id,
        newValues: { name: organization.name },
      });

      await tx.insert(auditLogs).values({
        organizationId: organization.id,
        userId: user.id,
        action: AUDIT_ACTIONS.USER_CREATE,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        newValues: { email: user.email, role: 'owner' },
      });

      return { organization, user };
    });

    return {
      organizationId: result.organization.id,
      userId: result.user.id,
    };
  });
```

## Acceptance Criteria

- [ ] Signup wrapped in transaction
- [ ] Failed user creation rolls back organization
- [ ] Audit logs created for org and user
- [ ] Works with existing Supabase auth flow
- [ ] Error messages are user-friendly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From data-integrity-guardian review |
