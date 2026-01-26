---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, security, authorization, permissions]
dependencies: []
---

# ~40% of Server Functions Call withAuth() Without Permission Checks

## Problem Statement

Approximately 100+ server functions call `withAuth()` without specifying a permission requirement. While this ensures authentication, it allows ANY authenticated user (including viewers with read-only access) to access the endpoint regardless of their role.

## Findings

**Pattern Found:**
```typescript
// WRONG - No permission check
const ctx = await withAuth();

// CORRECT - With permission check
const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
```

**Examples of Missing Permission Checks:**

**Warranty Domain** (`src/server/functions/warranty/warranties.ts`):
- Line 109: `getExpiringWarranties` - no permission
- Line 200: `listWarranties` - no permission
- Line 343: `getWarrantyReport` - no permission
- Line 476, 545, 625, 663: various warranty functions

**OAuth Domain** (`src/routes/api/oauth/`):
- `connections.ts:12` - lists OAuth connections
- `dashboard.ts:13` - OAuth dashboard data
- `initiate.ts:21` - initiates OAuth flow
- `health.ts:12` - OAuth health check

**Automation Jobs** (`src/server/functions/automation-jobs.ts`):
- Line 186: `getJobStatus`
- Line 206: `getUserJobs`
- Line 228: `getActiveJobs`

**Sessions** (`src/server/functions/users/sessions.ts`):
- Line 102, 165, 194, 245: session management

## Proposed Solutions

### Solution 1: Audit and Add Permissions (Recommended)
Systematically add appropriate permissions to each function.

**Effort:** Medium (4-8 hours)

**Implementation:**
```typescript
// Before
export const listWarranties = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth();  // NO PERMISSION
    // ...
  });

// After
export const listWarranties = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    // ...
  });
```

### Solution 2: Lint Rule
Create ESLint rule to flag `withAuth()` calls without permission.

**Pros:**
- Prevents future regressions
- Catches issues at build time

**Cons:**
- Some functions legitimately don't need permission (user's own data)

## Files to Update

| File | Lines | Suggested Permission |
|------|-------|---------------------|
| `warranty/warranties.ts` | 109, 200, 343, 476, 545, 625, 663 | `warranty.read` |
| `warranty/warranty-claims.ts` | 241, 359, 737, 843 | `warranty.read`/`warranty.update` |
| `automation-jobs.ts` | 186, 206, 228 | `job.read` |
| `users/sessions.ts` | 102, 165, 194, 245 | `user.read` (own sessions) |
| `oauth/*` | multiple | `organization.manageIntegrations` |

## Acceptance Criteria

- [ ] All server functions have explicit permission checks
- [ ] Exceptions documented (e.g., getCurrentUser for own data)
- [ ] viewer role cannot access warranty, OAuth, or job functions
- [ ] ESLint rule prevents future regressions (optional)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From security-sentinel and pattern-recognition reviews |
