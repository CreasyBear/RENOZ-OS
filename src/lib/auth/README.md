# Authentication & Authorization

This document covers the auth architecture for renoz-v3, including Supabase Auth integration, role-based access control (RBAC), API tokens, and multi-tenant isolation.

## Table of Contents

- [Overview](#overview)
- [Supabase Auth Setup](#supabase-auth-setup)
- [Role Definitions](#role-definitions)
- [Permission Matrix](#permission-matrix)
- [Protected Server Functions](#protected-server-functions)
- [Permission Guard Component](#permission-guard-component)
- [API Tokens](#api-tokens)
- [RLS Policy Patterns](#rls-policy-patterns)
- [Testing](#testing)

---

## Overview

The auth system uses a layered approach:

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
│   PermissionGuard, useHasPermission, useCurrentUser          │
├─────────────────────────────────────────────────────────────┤
│                    Server Layer                              │
│   withAuth(), SessionContext, permission checking            │
├─────────────────────────────────────────────────────────────┤
│                   Supabase Auth                              │
│   JWT validation, session management                         │
├─────────────────────────────────────────────────────────────┤
│                    Database (RLS)                            │
│   Row-level security policies enforce organization isolation │
└─────────────────────────────────────────────────────────────┘
```

**Key Files:**

| File | Purpose |
|------|---------|
| `src/lib/auth/permissions.ts` | Centralized permission matrix |
| `src/lib/server/protected.ts` | Server-side auth utilities |
| `src/lib/supabase/server.ts` | Supabase server client |
| `src/lib/supabase/client.ts` | Supabase browser client |
| `src/components/shared/permission-guard.tsx` | UI permission component |
| `src/hooks/use-has-permission.ts` | Permission check hooks |
| `drizzle/schema/api-tokens.ts` | API token table schema |
| `src/lib/server/api-tokens.ts` | API token server functions |

---

## Supabase Auth Setup

### Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # Server-only, never expose
```

### Browser Client

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Server Client

```typescript
// For user-context operations (respects RLS)
import { createServerSupabase } from '@/lib/supabase/server'
const supabase = createServerSupabase(request)

// For admin operations (bypasses RLS) - use carefully!
import { createAdminSupabase } from '@/lib/supabase/server'
const admin = createAdminSupabase()
```

### Auth Flow

1. User logs in via Supabase Auth (email/password, OAuth, etc.)
2. Supabase creates a JWT stored in cookies
3. `getServerUser(request)` validates the JWT on the server
4. `withAuth()` fetches the user record and returns `SessionContext`

---

## Role Definitions

Roles are defined in `canonical-enums.json` and implemented in `permissions.ts`:

| Role | Description |
|------|-------------|
| `owner` | Full access, including billing |
| `admin` | Full access except billing |
| `manager` | Team and operations management |
| `sales` | Customer and sales focused |
| `operations` | Inventory and fulfillment |
| `support` | Customer service |
| `viewer` | Read-only access |

```typescript
type Role = 'owner' | 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer'
```

---

## Permission Matrix

Permissions follow the `domain.action` format (e.g., `customer.create`, `order.fulfill`).

### Domains

```typescript
// src/lib/auth/permissions.ts
export const PERMISSIONS = {
  customer: { create, read, update, delete, export, import },
  contact: { create, read, update, delete },
  order: { create, read, update, delete, fulfill, cancel, export },
  product: { create, read, update, delete, managePricing },
  inventory: { read, adjust, transfer, receive },
  opportunity: { create, read, update, delete, assign },
  quote: { create, read, update, delete, send, approve },
  user: { read, invite, update, deactivate, changeRole },
  organization: { read, update, manageBilling, manageIntegrations },
  report: { viewSales, viewFinancial, viewOperations, export },
  apiToken: { create, read, revoke },
}
```

### Using Permission Helpers

```typescript
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/auth/permissions'

// Single permission check
if (hasPermission(user.role, 'customer.create')) {
  // Allow customer creation
}

// Any of multiple permissions
if (hasAnyPermission(user.role, ['customer.create', 'customer.update'])) {
  // Allow editing form
}

// All permissions required
if (hasAllPermissions(user.role, ['order.create', 'order.fulfill'])) {
  // Allow order creation + fulfillment workflow
}

// Get all permitted actions for a role
const actions = getPermittedActions('sales')
// ['customer.create', 'customer.read', ...]
```

---

## Protected Server Functions

Use `withAuth()` inside TanStack Start server function handlers:

### Basic Authentication

```typescript
import { createServerFn } from '@tanstack/react-start'
import { withAuth } from '@/lib/server/protected'

export const getMyProfile = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth()
    return ctx.user
  })
```

### With Permission Check

```typescript
import { createServerFn } from '@tanstack/react-start'
import { withAuth } from '@/lib/server/protected'
import { createCustomerSchema } from '@/lib/schemas/customers'
import { db } from '@/lib/db'
import { customers } from '../../../drizzle/schema'

export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator(createCustomerSchema)
  .handler(async ({ data }) => {
    // Requires authentication + 'customer.create' permission
    const ctx = await withAuth({ permission: 'customer.create' })

    // Always scope to organization for multi-tenancy
    return db.insert(customers).values({
      ...data,
      organizationId: ctx.organizationId,
    })
  })
```

### SessionContext Properties

```typescript
interface SessionContext {
  authUser: { id: string; email?: string }
  user: {
    id: string
    authId: string
    email: string
    name: string | null
    role: Role
    status: string
    organizationId: string
  }
  role: Role
  organizationId: string  // Use this for all queries!
}
```

### Error Handling

```typescript
import { AuthError, PermissionDeniedError } from '@/lib/server/protected'

// AuthError - 401 Unauthorized (not logged in)
// PermissionDeniedError - 403 Forbidden (logged in but no permission)

try {
  const ctx = await withAuth({ permission: 'user.changeRole' })
} catch (error) {
  if (error instanceof AuthError) {
    // Redirect to login
  }
  if (error instanceof PermissionDeniedError) {
    // Show "access denied" message
  }
}
```

---

## Permission Guard Component

Use `PermissionGuard` to conditionally render UI based on permissions:

### Basic Usage

```tsx
import { PermissionGuard } from '@/components/shared/permission-guard'

// Hide element if no permission
<PermissionGuard permission="customer.delete">
  <DeleteButton />
</PermissionGuard>
```

### With Fallback

```tsx
<PermissionGuard
  permission="report.export"
  fallback={<span className="text-gray-400">Export not available</span>}
>
  <ExportButton />
</PermissionGuard>
```

### Multiple Permissions

```tsx
// Any permission (OR logic)
<PermissionGuard
  permissions={['customer.create', 'customer.update']}
  requireAll={false}  // default
>
  <EditForm />
</PermissionGuard>

// All permissions (AND logic)
<PermissionGuard
  permissions={['order.create', 'order.fulfill']}
  requireAll={true}
>
  <OrderWorkflow />
</PermissionGuard>
```

### Direct Hooks

```typescript
import {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions
} from '@/hooks/use-has-permission'

function MyComponent() {
  const canCreateCustomer = useHasPermission('customer.create')
  const canEditOrDelete = useHasAnyPermission(['customer.update', 'customer.delete'])
  const hasFullAccess = useHasAllPermissions(['customer.create', 'customer.update', 'customer.delete'])

  // ...
}
```

---

## API Tokens

API tokens allow programmatic access without user sessions.

### Token Format

```
renoz_<base64-encoded-random-bytes>
```

Example: `renoz_SGVsbG8gV29ybGQh`

### Token Scopes

| Scope | Permissions |
|-------|-------------|
| `read` | Read-only access |
| `write` | Read + write (includes `read`) |
| `admin` | Full access (includes `read` + `write`) |

### Creating Tokens (Server)

```typescript
import { createApiToken } from '@/lib/server/api-tokens'

const result = await createApiToken({
  name: 'CI/CD Pipeline',
  scopes: ['read', 'write'],
  expiresAt: new Date('2025-12-31'),
})

// result.token is the plaintext token - shown only once!
// Store result.id for future reference
```

### Validating Tokens (Server)

```typescript
import { validateApiToken } from '@/lib/server/api-tokens'

const ctx = await validateApiToken({ token: 'renoz_...' })

if (ctx) {
  console.log(ctx.organizationId)
  console.log(ctx.scopes)

  // Check specific scope
  if (ctx.hasScope('write')) {
    // Allow write operation
  }
}
```

### Token Security

1. Tokens are hashed (SHA-256) before storage - plaintext never saved
2. Token prefix (first 8 chars) is stored for identification
3. Tokens can be revoked immediately
4. Expiration dates are enforced
5. Scopes limit what operations are allowed

---

## RLS Policy Patterns

Row-Level Security (RLS) provides database-level multi-tenant isolation.

### Organization Isolation Pattern

All business entities include `organization_id`:

```sql
-- Example: customers table RLS
CREATE POLICY "org_isolation" ON customers
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );
```

### Always Scope Queries

```typescript
// CORRECT: Always filter by organizationId
const customers = await db
  .select()
  .from(customers)
  .where(eq(customers.organizationId, ctx.organizationId))

// WRONG: Missing organization filter (RLS will block, but don't rely on it)
const customers = await db.select().from(customers)
```

### Pattern for Server Functions

```typescript
export const listCustomers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth({ permission: 'customer.read' })

    return db
      .select()
      .from(customers)
      .where(eq(customers.organizationId, ctx.organizationId))
      .orderBy(desc(customers.createdAt))
  })
```

---

## Testing

### Integration Tests

Auth integration tests are in `tests/integration/auth/`:

| File | Coverage |
|------|----------|
| `permission.spec.ts` | Role permissions, helper functions |
| `api-token.spec.ts` | Token scopes, format validation |
| `org-isolation.spec.ts` | Multi-tenant isolation patterns |

### Running Tests

```bash
bun test tests/integration/auth/
```

### Example Test Patterns

```typescript
// Test permission matrix
it('viewer cannot perform customer mutations', () => {
  expect(hasPermission('viewer', PERMISSIONS.customer.create)).toBe(false)
  expect(hasPermission('viewer', PERMISSIONS.customer.update)).toBe(false)
  expect(hasPermission('viewer', PERMISSIONS.customer.delete)).toBe(false)
})

// Test org isolation
it('user in org A cannot access org B resources', () => {
  expect(canAccessResource('org-a', 'org-b')).toBe(false)
})

// Test token scopes
it('write scope includes read permission', () => {
  expect(scopeIncludesPermission(['write'], 'read')).toBe(true)
  expect(scopeIncludesPermission(['write'], 'write')).toBe(true)
  expect(scopeIncludesPermission(['write'], 'admin')).toBe(false)
})
```

---

## Quick Reference

### Adding a New Permission

1. Add to `PERMISSIONS` in `src/lib/auth/permissions.ts`
2. Add to appropriate roles in `ROLE_PERMISSIONS`
3. Use in server functions: `withAuth({ permission: 'domain.action' })`
4. Use in UI: `<PermissionGuard permission="domain.action">`

### Creating a Protected Server Function

```typescript
export const myFunction = createServerFn({ method: 'POST' })
  .inputValidator(mySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: 'my.permission' })
    // Always use ctx.organizationId for queries
    return db.query(...).where(eq(table.organizationId, ctx.organizationId))
  })
```

### Checking Permission in UI

```tsx
<PermissionGuard permission="my.permission">
  <MyProtectedContent />
</PermissionGuard>
```
