# Conventions

> **Purpose**: Code patterns and standards Ralph loops MUST follow
> **Last Updated**: 2026-01-09
> **Status**: Active

---

## File Organization

### Directory Structure

```
src/
├── components/
│   ├── domain/           # Domain-specific components
│   │   ├── customers/    # Customer domain
│   │   ├── orders/       # Order domain
│   │   └── [domain]/     # Other domains
│   ├── shared/           # Reusable business components
│   │   ├── data-table/   # Generic table with column factories
│   │   ├── forms/        # Form field components
│   │   └── layout/       # Layout components
│   └── ui/               # Shadcn primitives (DO NOT MODIFY)
├── routes/               # File-based routing
│   ├── _authed/          # Authenticated routes
│   │   ├── customers/    # /customers/*
│   │   ├── orders/       # /orders/*
│   │   └── [domain]/     # Other domain routes
│   └── _public/          # Public routes (login, etc.)
├── server/
│   ├── functions/        # Server functions by domain
│   │   ├── customers.ts  # Customer server functions
│   │   ├── orders.ts     # Order server functions
│   │   └── [domain].ts   # Other domain functions
│   ├── db/               # Database layer
│   │   ├── schema/       # Drizzle schema definitions
│   │   └── queries/      # Reusable query builders
│   └── services/         # External service integrations
├── lib/                  # Utilities and helpers (use ~/ alias)
│   ├── schemas/          # Zod validation schemas
│   ├── schema/           # Drizzle database schema
│   ├── enums.ts          # Centralized enum definitions
│   └── utils/            # Pure utility functions
└── types/                # Shared TypeScript types
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| **Components** | kebab-case | `customer-form.tsx` |
| **Routes** | kebab-case folders | `routes/_authed/customers/` |
| **Server functions** | kebab-case | `server/functions/customers.ts` |
| **Schemas** | kebab-case | `lib/schemas/customers.ts` |
| **Types** | kebab-case | `types/customer-types.ts` |

### Component File Structure

```tsx
// customer-form.tsx
// 1. Imports (external → internal → relative)
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'

import { Button } from '@/components/ui/button'
import { customerSchema } from '~/schemas/customers'

import { CustomerFormFields } from './customer-form-fields'

// 2. Types (if not in separate file)
interface CustomerFormProps {
  customer?: Customer
  onSuccess: () => void
}

// 3. Component
export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  // Implementation
}
```

---

## Server Functions

### Pattern: createServerFn with Validation

```typescript
// server/functions/customers.ts
import { createServerFn } from '@tanstack/start'

import { requireAuth, withRLSContext } from '@/server/protected-procedure'
import { CreateCustomerSchema } from '~/schemas/customers'

export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator(CreateCustomerSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()
    return withRLSContext(ctx.session, async (tx) => {
      const [customer] = await tx
        .insert(customers)
        .values({ ...data, organizationId: ctx.session.orgId })
        .returning()
      return customer
    })
  })
```

### Key Rules

| Rule | Correct | Incorrect |
|------|---------|-----------|
| **Always use inputValidator** | `.inputValidator(schema)` | Manual `z.parse()` in handler |
| **Always use RLS wrapper** | `withRLSContext(ctx.session, async (tx) => ...)` | Direct `db.query()` |
| **Always require auth** | `const ctx = await requireAuth()` | No auth check |
| **Return typed data** | `return customer` | Inconsistent wrapper objects |
| **Handle errors in wrapper** | Let errors propagate | Try-catch in handler |

### Naming Convention

```typescript
// Pattern: [verb][Entity] or [verb][Entity][Qualifier]
export const getCustomers = createServerFn(...)      // List
export const getCustomer = createServerFn(...)       // Single
export const createCustomer = createServerFn(...)    // Create
export const updateCustomer = createServerFn(...)    // Update
export const deleteCustomer = createServerFn(...)    // Delete
export const getCustomerOrders = createServerFn(...) // Related data
```

---

## Row-Level Security (RLS) Patterns

### withRLSContext Wrapper

All database queries must use the RLS context wrapper to ensure proper tenant isolation:

```typescript
// server/protected-procedure.ts
export const getCustomers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await requireAuth()
    return withRLSContext(ctx.session, async (tx) => {
      return tx.query.customers.findMany()
    })
  })
```

### When to Use

| Operation | Use withRLSContext? | Notes |
|-----------|---------------------|-------|
| **Read queries** (findMany, findFirst) | YES | Always filter by org |
| **Write queries** (insert, update, delete) | YES | Ensure org ownership |
| **Aggregate queries** (count, sum) | YES | Scoped to org |
| **System admin operations** | NO | Explicit bypass with audit |

### Pattern Details

```typescript
// The wrapper sets RLS context and provides a transaction
export async function withRLSContext<T>(
  session: Session,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set RLS context for this transaction
    await tx.execute(sql`SELECT set_config('app.current_org_id', ${session.orgId}, true)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${session.userId}, true)`)

    return callback(tx)
  })
}
```

### Common Mistakes

```typescript
// WRONG: Direct db access bypasses RLS
export const getCustomers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await requireAuth()
    return db.query.customers.findMany() // No RLS!
  })

// CORRECT: Use withRLSContext
export const getCustomers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await requireAuth()
    return withRLSContext(ctx.session, async (tx) => {
      return tx.query.customers.findMany()
    })
  })
```

### RLS Policies in Database

```sql
-- Example RLS policy for customers table
CREATE POLICY "customers_org_isolation" ON customers
  FOR ALL
  TO authenticated
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

---

## Validation Schemas

### Pattern: Centralized Zod Schemas

```typescript
// lib/schemas/customers.ts
import { z } from 'zod'
import { CustomerStatusSchema } from '~/enums'

// Create schema (no id, no timestamps)
export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  status: CustomerStatusSchema,
  notes: z.string().optional(),
})

// Update schema (partial + required id + version)
export const UpdateCustomerSchema = CreateCustomerSchema.partial()

export const UpdateCustomerWithIdSchema = UpdateCustomerSchema.extend({
  id: z.string().uuid(),
  version: z.number().int().nonnegative(),
})

// Query schema (for list filtering)
export const ListCustomersSchema = z.object({
  search: z.string().optional(),
  status: CustomerStatusSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})
```

### Enum Pattern

```typescript
// lib/enums.ts
import { z } from 'zod'

// All enums centralized for consistency
export const CUSTOMER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const
export const CustomerStatusSchema = z.enum(['active', 'inactive'])
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>

export const OPPORTUNITY_STAGES = {
  NEW: 'new',
  QUOTED: 'quoted',
  PENDING: 'pending',
  ORDERED: 'ordered',
  WON: 'won',
  LOST: 'lost',
} as const
export const OpportunityStageSchema = z.enum(['new', 'quoted', 'pending', 'ordered', 'won', 'lost'])
export type OpportunityStage = z.infer<typeof OpportunityStageSchema>

export const ORDER_STATUSES = {
  PENDING_FULFILLMENT: 'pending_fulfillment',
  READY_TO_PICK: 'ready_to_pick',
  PICKING: 'picking',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
} as const
export const OrderStatusSchema = z.enum(['pending_fulfillment', 'ready_to_pick', 'picking', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'on_hold'])
export type OrderStatus = z.infer<typeof OrderStatusSchema>
```

---

## Component Patterns

### Data Table Pattern

```tsx
// components/domain/customers/customer-table.tsx
import { DataTable } from '@/components/shared/data-table'
import { createColumnHelper } from '@tanstack/react-table'

import type { Customer } from '@/types/customer-types'

const columnHelper = createColumnHelper<Customer>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('email', {
    header: 'Email',
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => <Badge>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => <CustomerActions customer={row.original} />,
  }),
]

export function CustomerTable({ customers }: { customers: Customer[] }) {
  return <DataTable columns={columns} data={customers} />
}
```

### Form Pattern

```tsx
// components/domain/customers/customer-form.tsx
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { useMutation } from '@tanstack/react-query'

import { createCustomerSchema } from '@/lib/validation/customer-schema'
import { createCustomer } from '@/server/functions/customers'

export function CustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess,
  })

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      type: 'residential' as const,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createCustomerSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ data: value })
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <form.Field name="name">
        {(field) => (
          <FormField
            label="Name"
            error={field.state.meta.errors?.[0]}
          >
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
      {/* More fields... */}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
```

### Route Pattern

```tsx
// routes/_authed/customers/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { getCustomers, getCustomerMetrics } from '@/server/functions/customers'
import { CustomerTable } from '@/components/domain/customers/customer-table'

export const Route = createFileRoute('/_authed/customers/')({
  // Loaders use Promise.all for parallel data fetching
  loader: async ({ context }) => {
    const [customers, metrics] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ['customers'],
        queryFn: () => getCustomers(),
        staleTime: 30_000,
      }),
      context.queryClient.ensureQueryData({
        queryKey: ['customer-metrics'],
        queryFn: () => getCustomerMetrics(),
        staleTime: 60_000,
      }),
    ])
    return { customers, metrics }
  },
  component: CustomersPage,
})

function CustomersPage() {
  const { customers, metrics } = Route.useLoaderData()

  return (
    <PageLayout title="Customers">
      <MetricsBar metrics={metrics} />
      <CustomerTable customers={customers} />
    </PageLayout>
  )
}
```

---

## UI Conventions

### Spacing Scale (8px base)

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Default gap |
| `space-3` | 12px | Medium spacing |
| `space-4` | 16px | Section gap |
| `space-6` | 24px | Large gap |
| `space-8` | 32px | Page sections |

### Typography Scale

| Token | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Labels, captions |
| `text-sm` | 14px | Body text, table cells |
| `text-base` | 16px | Default body |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles |

### Color Usage

| Context | Color Token | When |
|---------|-------------|------|
| **Primary action** | `primary` | Main buttons, links |
| **Destructive** | `destructive` | Delete, cancel |
| **Success** | `green-*` | Confirmations, positive status |
| **Warning** | `yellow-*` | Alerts, pending states |
| **Error** | `red-*` | Validation, failures |
| **Muted** | `muted` | Secondary text, disabled |

### Component States

Every interactive component must handle:

| State | Visual | Example |
|-------|--------|---------|
| **Default** | Normal appearance | Button at rest |
| **Hover** | Subtle highlight | Lighter/darker bg |
| **Focus** | Ring outline | `ring-2 ring-primary` |
| **Active** | Pressed state | Darker bg |
| **Disabled** | Muted, no pointer | `opacity-50 cursor-not-allowed` |
| **Loading** | Spinner/skeleton | Button spinner |
| **Error** | Red border/text | Form field error |

---

## Error Handling

### Custom Error Classes

```typescript
// src/server/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(entityType: string, entityId?: string, details?: Record<string, unknown>) {
    super(`${entityType} not found${entityId ? `: ${entityId}` : ''}`, 'NOT_FOUND', 404, details)
  }
}

export class ConcurrencyError extends AppError {
  constructor(
    entityType: string,
    entityId: string,
    attemptedVersion: number,
    currentVersion: number,
    details?: {
      currentState?: Record<string, unknown>
      attemptedChanges?: Record<string, unknown>
      lastModifiedBy?: { id: string; email?: string }
      lastModifiedAt?: Date
    }
  ) {
    super(
      `${entityType} was modified by another user (expected v${attemptedVersion}, found v${currentVersion})`,
      'CONCURRENCY_CONFLICT',
      409,
      { entityId, attemptedVersion, currentVersion, ...details }
    )
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400, { fields })
  }
}
```

### Error Handling in Server Functions

```typescript
// Errors propagate naturally - RLS wrapper handles common cases
export const updateCustomer = createServerFn({ method: 'POST' })
  .inputValidator(UpdateCustomerWithIdSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()
    return withRLSContext(ctx.session, async (tx) => {
      const [existing] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, data.id))

      if (!existing) {
        throw new NotFoundError('customer', data.id)
      }

      if (existing.version !== data.version) {
        throw new ConcurrencyError('customer', data.id, data.version, existing.version, {
          currentState: existing,
          attemptedChanges: data,
          lastModifiedAt: existing.updatedAt,
        })
      }

      const [updated] = await tx
        .update(customers)
        .set({ ...data, version: data.version + 1, updatedAt: new Date() })
        .where(eq(customers.id, data.id))
        .returning()

      return updated
    })
  })
```

---

## Path Aliases

```typescript
// tsconfig.json defines these aliases:
"@/*": ["./src/*"]     // For src/ directory
"~/*": ["./lib/*"]     // For lib/ directory
```

## Import Order

```typescript
// 1. React/framework imports
import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'

// 2. External library imports
import { z } from 'zod'
import { format } from 'date-fns'

// 3. Absolute imports from src (@ alias)
import { Button } from '@/components/ui/button'
import { createCustomer } from '@/server/functions/customers'

// 4. Absolute imports from lib (~/ alias)
import { CreateCustomerSchema } from '~/schemas/customers'
import type { Customer } from '~/schema/customers'

// 5. Relative imports
import { CustomerFormFields } from './customer-form-fields'
import type { CustomerFormProps } from './types'
```

---

## Type Patterns

### Drizzle Type Inference

```typescript
// types/customer-types.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { customers } from '@/server/db/schema/customers'

// Full entity from database
export type Customer = InferSelectModel<typeof customers>

// For creating new records
export type NewCustomer = InferInsertModel<typeof customers>

// For updates (partial with required id)
export type UpdateCustomer = Partial<Customer> & { id: string; version: number }
```

### Zod Type Inference

```typescript
// types/customer-types.ts
import type { z } from 'zod'
import type { createCustomerSchema, customerQuerySchema } from '@/lib/validation/customer-schema'

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type CustomerQuery = z.infer<typeof customerQuerySchema>
```

---

## Testing Conventions

### File Location

```
src/
├── components/
│   └── domain/
│       └── customers/
│           ├── customer-form.tsx
│           └── customer-form.test.tsx  # Co-located
├── server/
│   └── functions/
│       ├── customers.ts
│       └── customers.test.ts           # Co-located
└── __tests__/                          # Integration tests
    └── customers.integration.test.ts
```

### Test Naming

```typescript
describe('CustomerForm', () => {
  it('should render empty form for new customer', () => {})
  it('should populate fields when editing existing customer', () => {})
  it('should show validation errors for required fields', () => {})
  it('should call onSuccess after successful submission', () => {})
})
```

---

## External Documentation References

When implementing patterns, reference these official docs:

### TanStack Ecosystem

| Library | Docs | Key Patterns |
|---------|------|--------------|
| **TanStack Start** | [tanstack.com/start](https://tanstack.com/start) | `createServerFn`, `inputValidator`, middleware |
| **TanStack Router** | [tanstack.com/router](https://tanstack.com/router) | `createFileRoute`, loaders, search params |
| **TanStack Query** | [tanstack.com/query](https://tanstack.com/query) | `useQuery`, `useMutation`, query keys |
| **TanStack Form** | [tanstack.com/form](https://tanstack.com/form) | `useForm`, field validation, Zod adapter |
| **TanStack Table** | [tanstack.com/table](https://tanstack.com/table) | `createColumnHelper`, sorting, filtering |

### AI/Agent Patterns

| Library | Docs | Key Patterns |
|---------|------|--------------|
| **Vercel AI SDK** | [sdk.vercel.ai](https://sdk.vercel.ai) | `streamText`, `generateObject`, tools |
| **AI SDK Agents** | [aisdkagents.com](https://aisdkagents.com) | Multi-step tool patterns, workflows |
| **Claude Agent SDK** | [anthropic docs](https://docs.anthropic.com) | Multi-turn conversations, sessions |

### Infrastructure

| Service | Docs | Key Patterns |
|---------|------|--------------|
| **Supabase** | [supabase.com/docs](https://supabase.com/docs) | RLS policies, `(select auth.uid())` |
| **Drizzle ORM** | [orm.drizzle.team](https://orm.drizzle.team) | Schema definitions, type inference |
| **Trigger.dev** | [trigger.dev/docs](https://trigger.dev/docs) | Background jobs, retries |

### Key Patterns from Docs

**TanStack Start Server Functions:**
```typescript
// Official pattern from TanStack docs
export const getTodos = createServerFn({ method: 'GET' })
  .inputValidator(zodValidator(z.object({ userId: z.string() })))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    return db.todos.findMany({ where: { userId: data.userId } })
  })
```

**Supabase RLS Performance:**
```sql
-- Use (select auth.uid()) for better RLS performance
create policy "rls_select" on table_name
to authenticated
using ( (select auth.uid()) = user_id );
```

**AI SDK Multi-Step Tool Pattern:**
```typescript
// Chain tools for complex queries
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  tools: { queryOrders, queryCustomers, analyzeData },
  maxSteps: 5, // Allow multi-step reasoning
})
```

---

*These conventions are mandatory. Deviations require explicit approval and documentation.*
