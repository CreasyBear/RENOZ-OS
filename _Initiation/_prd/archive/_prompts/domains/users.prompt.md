# Task: Implement Users Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/users.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-users.progress.txt

## PRD ID
DOM-USERS

## Phase
domain-core

## Priority
2

## Dependencies
- FOUND-AUTH (auth patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check auth system is available
# Verify FOUND-AUTH is complete
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `lib/schema/users.ts` | User database schema |
| `lib/schemas/users.ts` | User Zod schemas |
| `src/server/functions/users.ts` | User server functions |
| `src/routes/_authed/settings/users/` | User management routes |
| `src/components/domain/users/` | User UI components |

---

## Renoz Business Context

### User Roles & Permissions

Renoz user management reflects the organizational structure of an Australian battery distributor:

```
Owner (Full Access)
    ↓
Admin (Operational Control)
    ↓
Sales (Customer-Facing)
    ↓
Warehouse (Fulfillment)
    ↓
Finance (Accounting)
    ↓
Viewer (Read-Only)
```

**Role Definitions:**

- **Owner**: Full system access, billing, user management, all data
- **Admin**: User management, settings, all operational domains (cannot access billing)
- **Sales**: Customers, opportunities, quotes, orders (create/edit)
- **Warehouse**: Inventory, fulfillment, receiving, stock movements
- **Finance**: Invoices, payments, reports, Xero integration
- **Viewer**: Read-only access to assigned areas

**IMPORTANT**: Unlike generic role systems, Renoz requires CEC accreditation tracking for installer users and warehouse location assignments for fulfillment staff.

### User Lifecycle

```
Invited → Active → Suspended
              ↓
          Deactivated (Soft Delete)
```

**Status Definitions:**

- **Invited**: Email sent, awaiting first login and password setup
- **Active**: Full access according to role permissions
- **Suspended**: Temporary access revocation (e.g., investigation, leave)
- **Deactivated**: Soft delete - user removed from active roster but data preserved

**Key Constraints:**
- Cannot delete users (preserve audit trail)
- Cannot self-elevate role (security)
- Owner role requires 2FA (security requirement)
- CEC-accredited users must have certificate expiry date

---

## UI Pattern References

### User List Table

**Component**: DataGrid with role badges and status indicators

```typescript
// Reference implementation
import { DataGrid, DataGridContainer } from '@/registry/default/ui/data-grid';
import { Badge } from '@/registry/default/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/registry/default/ui/avatar';

// Role badge configuration
const roleBadgeVariant = {
  owner: 'primary',
  admin: 'info',
  sales: 'success',
  warehouse: 'warning',
  finance: 'secondary',
  viewer: 'outline',
} as const;

// User table columns
const columns = [
  {
    accessorKey: 'user',
    header: 'User',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={row.original.avatarUrl} />
          <AvatarFallback>
            {row.original.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={roleBadgeVariant[row.original.role]} appearance="light">
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'active' ? 'success' : 'outline'}
        appearance="light"
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'lastActive',
    header: 'Last Active',
    cell: ({ row }) => formatDistanceToNow(row.original.lastActiveAt, { addSuffix: true }),
  },
];
```

**Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`

### User Invitation Form

**Component**: Modal with email validation and role selection

```typescript
// User invite modal
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/registry/default/ui/dialog';
import { Form, FormField } from '@/registry/default/ui/form';
import { Input } from '@/registry/default/ui/input';
import { Select } from '@/registry/default/ui/select';
import { Button } from '@/registry/default/ui/button';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Invite User</DialogTitle>
    </DialogHeader>

    <Form onSubmit={handleInvite}>
      <FormField label="Email" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
      </FormField>

      <FormField label="Name" required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
      </FormField>

      <FormField label="Role" required>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            {canAssignAdmin && <SelectItem value="admin">Admin</SelectItem>}
          </SelectContent>
        </Select>
      </FormField>

      <Button type="submit" disabled={isInviting}>
        {isInviting ? 'Sending...' : 'Send Invitation'}
      </Button>
    </Form>
  </DialogContent>
</Dialog>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`

### User Profile Panel

**Component**: Side panel with edit capabilities

```typescript
// User detail panel
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/registry/default/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/registry/default/ui/tabs';

<Sheet open={selectedUser !== null} onOpenChange={handleClose}>
  <SheetContent className="w-[600px]">
    <SheetHeader>
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={selectedUser.avatarUrl} />
          <AvatarFallback>{selectedUser.initials}</AvatarFallback>
        </Avatar>
        <div>
          <SheetTitle>{selectedUser.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
        </div>
      </div>
    </SheetHeader>

    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <UserDetailsForm user={selectedUser} />
      </TabsContent>

      <TabsContent value="permissions">
        <UserPermissionsPanel user={selectedUser} />
      </TabsContent>

      <TabsContent value="activity">
        <UserActivityLog userId={selectedUser.id} />
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`

---

## Implementation Notes

### User Schema with Role Metadata

```typescript
// Users with role-specific metadata
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull(), // 'owner', 'admin', 'sales', 'warehouse', 'finance', 'viewer'
  status: text('status').notNull().default('invited'), // 'invited', 'active', 'suspended'

  // Role-specific metadata (JSON for flexibility)
  roleMetadata: jsonb('role_metadata'), // CEC cert, warehouse location, etc.

  // Security
  twoFactorEnabled: boolean('two_factor_enabled').default(false),

  // Audit fields
  invitedBy: uuid('invited_by'),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
  deactivatedAt: timestamp('deactivated_at'),
  deactivatedBy: uuid('deactivated_by'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// Role metadata type examples
type SalesMetadata = {
  territory?: string[];
  commissionRate?: number;
};

type WarehouseMetadata = {
  locationId: string;
  pickingZones?: string[];
};

type InstallerMetadata = {
  cecAccreditation: {
    number: string;
    expiryDate: string; // ISO date
    categories: string[]; // e.g., ['Grid Connect', 'Battery']
  };
};
```

### User Invitation Flow

```typescript
// Server function to invite user
import { createServerFn } from '@tanstack/start';
import { sendEmail } from '@/server/services/email';

export const inviteUser = createServerFn({ method: 'POST' })
  .inputValidator(InviteUserSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    // Only admins can invite users
    if (!['admin', 'owner'].includes(ctx.session.role)) {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
    }

    // Owners/admins cannot be invited, only created by existing owner
    if (['owner', 'admin'].includes(data.role) && ctx.session.role !== 'owner') {
      throw new AppError('Only owners can create admin users', 'FORBIDDEN', 403);
    }

    return withRLSContext(ctx.session, async (tx) => {
      // Check if user already exists
      const [existing] = await tx
        .select()
        .from(users)
        .where(eq(users.email, data.email));

      if (existing) {
        throw new ValidationError('User with this email already exists', {
          email: 'Email already in use',
        });
      }

      // Create user record
      const [user] = await tx
        .insert(users)
        .values({
          organizationId: ctx.session.orgId,
          email: data.email,
          name: data.name,
          role: data.role,
          status: 'invited',
          roleMetadata: data.roleMetadata,
          invitedBy: ctx.session.userId,
          twoFactorEnabled: data.role === 'owner', // Force 2FA for owners
        })
        .returning();

      // Generate invitation token
      const token = await generateInvitationToken(user.id, user.email);

      // Send invitation email
      await sendEmail({
        to: user.email,
        template: 'user-invitation',
        data: {
          inviterName: ctx.session.userName,
          organizationName: ctx.session.orgName,
          invitationLink: `${process.env.APP_URL}/auth/accept-invite?token=${token}`,
          role: user.role,
        },
      });

      return user;
    });
  });
```

### Role Permission Check Middleware

```typescript
// Permission checking utility
type Permission =
  | 'users:read'
  | 'users:write'
  | 'users:invite'
  | 'customers:read'
  | 'customers:write'
  | 'orders:read'
  | 'orders:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'finance:read'
  | 'finance:write';

const rolePermissions: Record<string, Permission[]> = {
  owner: ['*'], // All permissions
  admin: [
    'users:read', 'users:write', 'users:invite',
    'customers:read', 'customers:write',
    'orders:read', 'orders:write',
    'inventory:read', 'inventory:write',
    'finance:read',
  ],
  sales: [
    'customers:read', 'customers:write',
    'orders:read', 'orders:write',
  ],
  warehouse: [
    'inventory:read', 'inventory:write',
    'orders:read',
  ],
  finance: [
    'customers:read',
    'orders:read',
    'finance:read', 'finance:write',
  ],
  viewer: [
    'customers:read',
    'orders:read',
    'inventory:read',
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function requirePermission(permission: Permission) {
  return async (ctx: AuthContext) => {
    if (!hasPermission(ctx.session.role, permission)) {
      throw new AppError(
        `Insufficient permissions: ${permission} required`,
        'FORBIDDEN',
        403
      );
    }
  };
}
```

### User Activity Tracking

```typescript
// Track user activity for last active timestamp
export const userActivityLog = pgTable('user_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  action: text('action').notNull(), // 'login', 'logout', 'page_view', 'action_performed'
  entityType: text('entity_type'), // 'customer', 'order', etc.
  entityId: uuid('entity_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Middleware to log activity
export async function logUserActivity(
  userId: string,
  action: string,
  metadata?: { entityType?: string; entityId?: string }
) {
  await db.insert(userActivityLog).values({
    userId,
    action,
    entityType: metadata?.entityType,
    entityId: metadata?.entityId,
  });

  // Update last active timestamp
  await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(eq(users.id, userId));
}
```

### CEC Accreditation Validation

```typescript
// For installer users, validate CEC certificate format
import { z } from 'zod';

export const CECAccreditationSchema = z.object({
  number: z.string().regex(/^A\d{7}$/, 'CEC number must be A followed by 7 digits (e.g., A1234567)'),
  expiryDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'CEC accreditation must not be expired'
  ),
  categories: z.array(z.enum([
    'Grid Connect',
    'Battery',
    'Stand Alone',
    'Hybrid',
  ])).min(1, 'At least one category required'),
});

export const InstallerMetadataSchema = z.object({
  cecAccreditation: CECAccreditationSchema,
});
```

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. For schema stories: Run `npm run db:generate`
5. Run `npm run typecheck` to verify
6. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
7. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### DO
- Support user invitation flow with email verification
- Enable role assignment with permission validation
- Track user activity (last active timestamp)
- Allow user deactivation (soft delete with audit trail)
- Validate CEC accreditation for installer roles
- Force 2FA for owner role
- Store role-specific metadata in JSON field
- Log all role changes to audit trail
- Prevent self-role-escalation (security)
- Support warehouse location assignment for warehouse staff

### DON'T
- Allow self-role escalation (security vulnerability)
- Delete users (soft delete only - preserve audit trail)
- Skip email validation on invitation
- Allow non-owners to create admin users
- Remove role-based access control checks
- Store sensitive data (passwords) in user table - use auth provider
- Allow suspended users to access system
- Skip CEC validation for installer roles

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_USERS_COMPLETE</promise>
```

---

*Domain PRD - User management for Australian battery distribution team*
