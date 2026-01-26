---
status: pending
priority: p1
issue_id: "006"
tags: [code-review, agent-native, api, authentication]
dependencies: []
---

# No API Token Authentication Middleware - Agents Cannot Call Server Functions

## Problem Statement

The `validateApiToken()` function exists but is never integrated into a middleware or `withAuth()` alternative. All server functions use `withAuth()` which requires Supabase JWT session authentication. Agents with API tokens have NO way to call any server functions.

## Findings

**File:** `src/lib/server/api-tokens.ts`
- `validateApiToken()` exists and works correctly
- Returns `ApiTokenContext` with userId, organizationId, scopes

**File:** `src/lib/server/protected.ts`
- `withAuth()` only supports Supabase JWT sessions
- No fallback to API token authentication
- All 100+ server functions use `withAuth()`

**Current State:**
- API tokens can be created, listed, revoked
- But there's NO WAY to actually USE them
- Agent-native score: 0/16 server functions support API token auth

**Gap Analysis:**
```typescript
// This exists but is never called:
export async function validateApiToken(token: string): Promise<ApiTokenContext> {
  // Works correctly - validates token, returns context
}

// But withAuth() doesn't use it:
export async function withAuth(options: WithAuthOptions = {}): Promise<SessionContext> {
  const ctx = await getSessionContext();  // Only Supabase JWT!
  // No fallback to API token...
}
```

## Proposed Solutions

### Solution 1: Create withApiAuth() Helper (Recommended)
Add a parallel helper that supports API token authentication.

**Pros:**
- Non-breaking change
- Clear separation between user and agent auth
- Can map scopes to permissions

**Cons:**
- Server functions need updating to use it
- Two auth helpers to maintain

**Effort:** Large (1-2 days)

**Implementation:**
```typescript
// New file: src/lib/server/api-auth.ts

export interface ApiSessionContext {
  tokenId: string;
  userId: string;
  organizationId: string;
  scopes: ApiTokenScope[];
  // Map scopes to permissions
  hasPermission: (permission: PermissionAction) => boolean;
}

export async function withApiAuth(options?: {
  requiredScope?: ApiTokenScope;
  permission?: PermissionAction;
}): Promise<ApiSessionContext> {
  const request = getRequest();
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer renoz_')) {
    const token = authHeader.slice(7);
    const ctx = await validateApiToken(token);

    // Set RLS context
    await db.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`
    );

    // Check required scope
    if (options?.requiredScope && !ctx.scopes.includes(options.requiredScope)) {
      throw new PermissionDeniedError('Insufficient token scope');
    }

    // Map scope to permission check
    if (options?.permission && !scopeIncludesPermission(ctx.scopes, options.permission)) {
      throw new PermissionDeniedError(`Permission denied: ${options.permission}`);
    }

    return {
      ...ctx,
      hasPermission: (p) => scopeIncludesPermission(ctx.scopes, p),
    };
  }

  throw new AuthError('API token required');
}
```

### Solution 2: Unified withAnyAuth() Helper
Create a single helper that supports both Supabase JWT and API tokens.

**Pros:**
- Single function for all auth
- Server functions don't change

**Cons:**
- More complex logic
- Context types differ between auth methods

**Implementation:**
```typescript
export async function withAnyAuth(options: WithAuthOptions = {}): Promise<SessionContext | ApiSessionContext> {
  const request = getRequest();
  const authHeader = request.headers.get('Authorization');

  // Try API token first
  if (authHeader?.startsWith('Bearer renoz_')) {
    return withApiAuth(options);
  }

  // Fall back to Supabase JWT
  return withAuth(options);
}
```

## Acceptance Criteria

- [ ] API tokens can authenticate server function calls
- [ ] Bearer token header format: `Authorization: Bearer renoz_xxx...`
- [ ] Scopes map correctly to permissions
- [ ] RLS context set for API token requests
- [ ] At least listUsers, getOrganization work with API tokens
- [ ] Rate limiting applied per token

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From agent-native-reviewer findings |
