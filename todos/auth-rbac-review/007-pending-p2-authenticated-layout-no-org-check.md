---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, security, authentication, layout]
dependencies: []
---

# Authenticated Layout Missing Organization Membership Validation

## Problem Statement

The `_authenticated.tsx` layout only checks if a Supabase session exists. It does NOT verify that the user has an entry in the `users` table, belongs to a valid organization, or has an "active" status. A user with a valid Supabase session but deactivated in the application could still access protected routes.

## Findings

**File:** `src/routes/_authenticated.tsx` (lines 29-48)

```typescript
beforeLoad: async ({ location }) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw redirect({ to: '/login', ... })
  }

  // Only returns session.user - NO database validation!
  return { user: session.user }
}
```

**Missing Checks:**
1. User exists in `users` table
2. User's `status === 'active'`
3. User's organization exists and is active
4. User isn't soft-deleted (`deletedAt IS NULL`)

**Impact:**
- Deactivated user can continue browsing until JWT expires
- Deleted user can see stale UI
- User removed from org can still access protected routes

## Proposed Solutions

### Solution 1: Add Database Validation (Recommended)
Query the users table in beforeLoad to verify membership.

**Pros:**
- Catches deactivated users immediately
- Consistent with server-side checks
- Better UX - redirect to appropriate page

**Cons:**
- Extra database query per navigation
- Need to handle Supabase RLS context

**Effort:** Small (1-2 hours)

**Implementation:**
```typescript
beforeLoad: async ({ location }) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }

  // Verify user exists and is active
  const { data: appUser, error } = await supabase
    .from("users")
    .select("id, status, organization_id, role")
    .eq("auth_id", session.user.id)
    .is("deleted_at", null)
    .single();

  if (error || !appUser) {
    // User not found or deleted
    await supabase.auth.signOut();
    throw redirect({ to: '/login', search: { error: 'account_not_found' } })
  }

  if (appUser.status !== 'active') {
    // User is deactivated/suspended
    await supabase.auth.signOut();
    throw redirect({ to: '/login', search: { error: 'account_inactive' } })
  }

  return {
    user: session.user,
    appUser: appUser,
  }
}
```

### Solution 2: Real-time Subscription
Use Supabase Realtime to listen for user status changes and force logout.

**Pros:**
- Immediate response to status changes
- No extra query per navigation

**Cons:**
- More complex setup
- WebSocket overhead

## Acceptance Criteria

- [ ] Deactivated users are immediately redirected to login
- [ ] Deleted users cannot access protected routes
- [ ] Users see appropriate error message
- [ ] Session is terminated server-side on status change
- [ ] Works with TanStack Router's beforeLoad

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From security-sentinel review |
