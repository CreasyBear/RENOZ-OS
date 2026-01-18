# RBAC Patterns

> **Purpose**: Role-Based Access Control patterns for Ralph implementation
> **Last Updated**: 2026-01-11
> **Status**: Active

---

## Permission Matrix

### Roles

| Role | Description | Typical Users |
|------|-------------|---------------|
| **Admin** | Full system access, can manage users and settings | Business owners, system administrators |
| **Sales** | Customer and opportunity management, order creation | Sales representatives, account managers |
| **Operations** | Order fulfillment, inventory management, job scheduling | Warehouse staff, dispatchers |
| **Field-Tech** | Job execution, limited customer view | Technicians, installers |

### Resource Permissions

| Resource | Admin | Sales | Operations | Field-Tech |
|----------|-------|-------|------------|------------|
| **Customers** | CRUD | CRUD | R | R (assigned only) |
| **Orders** | CRUD | CRU | CRUD | R (assigned only) |
| **Products** | CRUD | R | RU (inventory) | R |
| **Inventory** | CRUD | R | CRUD | R |
| **Jobs** | CRUD | CR | CRUD | RU (assigned only) |
| **Financial** | CRUD | R (own quotes) | R (costs) | - |
| **Settings** | CRUD | - | - | - |
| **Reports** | CRUD | R (sales) | R (operations) | R (own) |

**Legend:** C = Create, R = Read, U = Update, D = Delete, - = No Access

---

## Server Function Authorization Pattern

### requireRole Utility

```typescript
// server/auth/require-role.ts
import { ForbiddenError } from '@/server/errors'
import { getUserRole } from '@/server/auth/get-user-role'

export type Role = 'admin' | 'sales' | 'operations' | 'field-tech'

export async function requireRole(
  userId: string,
  orgId: string,
  roles: Role[]
): Promise<Role> {
  const userRole = await getUserRole(userId, orgId)

  if (!roles.includes(userRole)) {
    throw new ForbiddenError(
      `Insufficient permissions. Required: ${roles.join(' or ')}. Current: ${userRole}`
    )
  }

  return userRole
}
```

### Usage in Server Functions

```typescript
// server/functions/customers.ts
import { createServerFn } from '@tanstack/start'
import { requireAuth, withRLSContext } from '@/server/protected-procedure'
import { requireRole } from '@/server/auth/require-role'
import { CreateCustomerSchema } from '~/schemas/customers'

export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator(CreateCustomerSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    // Only Admin and Sales can create customers
    await requireRole(ctx.session.userId, ctx.session.orgId, ['admin', 'sales'])

    return withRLSContext(ctx.session, async (tx) => {
      const [customer] = await tx
        .insert(customers)
        .values({ ...data, organizationId: ctx.session.orgId })
        .returning()
      return customer
    })
  })

export const deleteCustomer = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    // Only Admin can delete customers
    await requireRole(ctx.session.userId, ctx.session.orgId, ['admin'])

    return withRLSContext(ctx.session, async (tx) => {
      await tx.delete(customers).where(eq(customers.id, data.id))
      return { success: true }
    })
  })
```

### Resource-Level Permission Checks

```typescript
// server/auth/check-permission.ts
type Permission = 'create' | 'read' | 'update' | 'delete'
type Resource = 'customers' | 'orders' | 'products' | 'inventory' | 'jobs' | 'financial' | 'settings' | 'reports'

const PERMISSION_MATRIX: Record<Role, Record<Resource, Permission[]>> = {
  admin: {
    customers: ['create', 'read', 'update', 'delete'],
    orders: ['create', 'read', 'update', 'delete'],
    products: ['create', 'read', 'update', 'delete'],
    inventory: ['create', 'read', 'update', 'delete'],
    jobs: ['create', 'read', 'update', 'delete'],
    financial: ['create', 'read', 'update', 'delete'],
    settings: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
  },
  sales: {
    customers: ['create', 'read', 'update', 'delete'],
    orders: ['create', 'read', 'update'],
    products: ['read'],
    inventory: ['read'],
    jobs: ['create', 'read'],
    financial: ['read'], // own quotes only - enforced at query level
    settings: [],
    reports: ['read'], // sales reports only
  },
  operations: {
    customers: ['read'],
    orders: ['create', 'read', 'update', 'delete'],
    products: ['read', 'update'], // inventory updates only
    inventory: ['create', 'read', 'update', 'delete'],
    jobs: ['create', 'read', 'update', 'delete'],
    financial: ['read'], // costs only
    settings: [],
    reports: ['read'], // operations reports only
  },
  'field-tech': {
    customers: ['read'], // assigned only - enforced at query level
    orders: ['read'], // assigned only
    products: ['read'],
    inventory: ['read'],
    jobs: ['read', 'update'], // assigned only
    financial: [],
    settings: [],
    reports: ['read'], // own reports only
  },
}

export function hasPermission(role: Role, resource: Resource, permission: Permission): boolean {
  return PERMISSION_MATRIX[role][resource].includes(permission)
}

export async function requirePermission(
  userId: string,
  orgId: string,
  resource: Resource,
  permission: Permission
): Promise<Role> {
  const userRole = await getUserRole(userId, orgId)

  if (!hasPermission(userRole, resource, permission)) {
    throw new ForbiddenError(
      `Cannot ${permission} ${resource}. Role ${userRole} lacks this permission.`
    )
  }

  return userRole
}
```

---

## UI Permission Checks

### useHasPermission Hook

```typescript
// hooks/use-has-permission.ts
import { useSession } from '@/hooks/use-session'
import { hasPermission } from '@/lib/auth/permissions'
import type { Resource, Permission } from '@/types/auth-types'

export function useHasPermission(resource: Resource, permission: Permission): boolean {
  const { session } = useSession()

  if (!session?.role) return false

  return hasPermission(session.role, resource, permission)
}

// Convenience hooks for common checks
export function useCanCreate(resource: Resource): boolean {
  return useHasPermission(resource, 'create')
}

export function useCanUpdate(resource: Resource): boolean {
  return useHasPermission(resource, 'update')
}

export function useCanDelete(resource: Resource): boolean {
  return useHasPermission(resource, 'delete')
}
```

### Usage in Components

```tsx
// components/domain/customers/customer-actions.tsx
import { useHasPermission, useCanDelete } from '@/hooks/use-has-permission'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function CustomerActions({ customer }: { customer: Customer }) {
  const canEdit = useHasPermission('customers', 'update')
  const canDelete = useCanDelete('customers')

  return (
    <DropdownMenu>
      <DropdownMenuItem disabled={!canEdit}>
        Edit Customer
      </DropdownMenuItem>
      {canDelete && (
        <DropdownMenuItem variant="destructive">
          Delete Customer
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  )
}
```

### Conditional Rendering Pattern

```tsx
// components/shared/permission-gate.tsx
import { useHasPermission } from '@/hooks/use-has-permission'
import type { Resource, Permission } from '@/types/auth-types'

interface PermissionGateProps {
  resource: Resource
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({
  resource,
  permission,
  children,
  fallback = null
}: PermissionGateProps) {
  const hasAccess = useHasPermission(resource, permission)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Usage
<PermissionGate resource="customers" permission="delete">
  <DeleteButton onClick={handleDelete} />
</PermissionGate>
```

---

## Protected Route Pattern

### Route-Level Authorization

```tsx
// routes/_authed/settings/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/server/auth/get-session'

export const Route = createFileRoute('/_authed/settings/')({
  beforeLoad: async ({ context }) => {
    const session = await getSession()

    // Only admins can access settings
    if (session.role !== 'admin') {
      throw redirect({
        to: '/dashboard',
        search: { error: 'insufficient_permissions' },
      })
    }
  },
  component: SettingsPage,
})
```

### Layout-Level Authorization

```tsx
// routes/_authed/admin.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    if (context.session.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
```

### Navigation Filtering

```tsx
// components/shared/layout/sidebar.tsx
import { useSession } from '@/hooks/use-session'
import { hasPermission } from '@/lib/auth/permissions'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', resource: null },
  { label: 'Customers', href: '/customers', resource: 'customers' as const },
  { label: 'Orders', href: '/orders', resource: 'orders' as const },
  { label: 'Settings', href: '/settings', resource: 'settings' as const },
]

export function Sidebar() {
  const { session } = useSession()

  const visibleItems = navItems.filter(item =>
    item.resource === null || hasPermission(session.role, item.resource, 'read')
  )

  return (
    <nav>
      {visibleItems.map(item => (
        <NavLink key={item.href} to={item.href}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

---

## Database Schema

### User Roles Table

```typescript
// server/db/schema/user-roles.ts
import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'
import { organizations } from './organizations'

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  role: text('role', { enum: ['admin', 'sales', 'operations', 'field-tech'] }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: uuid('assigned_by').references(() => users.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.organizationId] }),
}))
```

### RLS Policy for Role Checks

```sql
-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only see roles in their organization
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT org_id FROM auth.jwt()));

-- Only admins can modify roles
CREATE POLICY "user_roles_admin_all" ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.organization_id = organization_id
        AND ur.role = 'admin'
    )
  );
```

---

## Error Handling

### ForbiddenError Class

```typescript
// server/errors.ts
export class ForbiddenError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details)
    this.name = 'ForbiddenError'
  }
}
```

### Client-Side Error Handling

```tsx
// Handle 403 errors in mutation
const mutation = useMutation({
  mutationFn: deleteCustomer,
  onError: (error) => {
    if (error.code === 'FORBIDDEN') {
      toast.error('You do not have permission to perform this action')
    }
  },
})
```

---

*These patterns are mandatory for all Ralph implementations. Role checks must be enforced at both server and UI levels.*
