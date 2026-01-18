# Server Functions Patterns

> TanStack Start server functions for renoz-v3 with Supabase auth and Drizzle ORM.

## 1. createServerFn Basics

### GET vs POST

```typescript
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'

// GET - for reading data (cacheable, no side effects)
export const getCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({ orgId: z.string().uuid() }))
  .handler(async ({ data }) => {
    return db.query.customers.findMany({
      where: eq(customers.organizationId, data.orgId)
    })
  })

// POST - for mutations (creates, updates, deletes)
export const createCustomer = createServerFn({ method: 'POST' })
  .validator(z.object({
    orgId: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email().optional(),
  }))
  .handler(async ({ data }) => {
    const [customer] = await db.insert(customers).values({
      organizationId: data.orgId,
      name: data.name,
      email: data.email,
    }).returning()
    return customer
  })
```

### Validator Pattern with Zod

```typescript
import { z } from 'zod'

// Define reusable schemas
const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

const customerFilterSchema = z.object({
  status: z.enum(['lead', 'prospect', 'active', 'inactive']).optional(),
  search: z.string().optional(),
})

// Compose schemas
export const listCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({
    orgId: z.string().uuid(),
    ...paginationSchema.shape,
    ...customerFilterSchema.shape,
  }))
  .handler(async ({ data }) => {
    const { orgId, page, limit, status, search } = data
    const offset = (page - 1) * limit

    const conditions = [eq(customers.organizationId, orgId)]
    if (status) conditions.push(eq(customers.status, status))
    if (search) conditions.push(ilike(customers.name, `%${search}%`))

    const [results, [{ count }]] = await Promise.all([
      db.query.customers.findMany({
        where: and(...conditions),
        limit,
        offset,
        orderBy: desc(customers.createdAt),
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(and(...conditions)),
    ])

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    }
  })
```

## 2. Authentication

### Getting User Context from Supabase JWT

```typescript
// src/server/auth.ts
import { createServerFn } from '@tanstack/start'
import { getWebRequest } from '@tanstack/start/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role for server-side
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Extract and validate JWT from request
export async function getAuthUser() {
  const request = getWebRequest()
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}

// Get user's organization from JWT claims or database
export async function getAuthContext() {
  const user = await getAuthUser()
  if (!user) return null

  // Option 1: From JWT custom claims (set during login)
  const orgId = user.app_metadata?.org_id

  // Option 2: From database lookup
  // const membership = await db.query.organizationMembers.findFirst({
  //   where: eq(organizationMembers.userId, user.id)
  // })

  return {
    userId: user.id,
    email: user.email!,
    orgId,
    role: user.app_metadata?.role as string | undefined,
  }
}
```

### Using Auth in Server Functions

```typescript
// src/server/customers.ts
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'
import { getAuthContext } from './auth'
import { UnauthorizedError, ForbiddenError } from './errors'

export const getMyCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({
    status: z.enum(['lead', 'prospect', 'active']).optional()
  }))
  .handler(async ({ data }) => {
    const auth = await getAuthContext()
    if (!auth) {
      throw new UnauthorizedError('Authentication required')
    }

    return db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, auth.orgId),
        data.status ? eq(customers.status, data.status) : undefined
      ),
    })
  })
```

## 3. Authorization

### Checking Org Membership Before Queries

```typescript
// src/server/authorization.ts
import { db } from '@/db'
import { organizationMembers, organizations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { ForbiddenError } from './errors'

export async function requireOrgMembership(userId: string, orgId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, orgId)
    ),
  })

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization')
  }

  return membership
}

export async function requireRole(
  userId: string,
  orgId: string,
  allowedRoles: ('owner' | 'admin' | 'sales' | 'operations' | 'viewer')[]
) {
  const membership = await requireOrgMembership(userId, orgId)

  if (!allowedRoles.includes(membership.role as any)) {
    throw new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`)
  }

  return membership
}
```

### Authorization in Practice

```typescript
// src/server/orders.ts
import { requireRole } from './authorization'

export const createOrder = createServerFn({ method: 'POST' })
  .validator(z.object({
    customerId: z.string().uuid(),
    lineItems: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
    })),
  }))
  .handler(async ({ data }) => {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()

    // Require sales or higher to create orders
    await requireRole(auth.userId, auth.orgId, ['owner', 'admin', 'sales'])

    // Verify customer belongs to org
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, data.customerId),
        eq(customers.organizationId, auth.orgId)
      ),
    })

    if (!customer) {
      throw new NotFoundError('Customer not found')
    }

    // Create order with audit trail
    const [order] = await db.insert(orders).values({
      organizationId: auth.orgId,
      customerId: data.customerId,
      lineItems: data.lineItems,
      createdBy: auth.userId,
    }).returning()

    return order
  })
```

## 4. Error Handling

### Custom Error Classes

```typescript
// src/server/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
  }
}
```

### Error Handling in Server Functions

```typescript
// src/server/utils.ts
import { AppError } from './errors'

// Wrap handler with consistent error handling
export function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T | { error: { message: string; code: string; statusCode: number } }> {
  return fn().catch((error) => {
    if (error instanceof AppError) {
      return {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        },
      }
    }

    // Log unexpected errors
    console.error('Unexpected error:', error)

    return {
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    }
  })
}

// Usage in server function
export const updateCustomer = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    status: z.enum(['lead', 'prospect', 'active']).optional(),
  }))
  .handler(async ({ data }) => {
    return withErrorHandling(async () => {
      const auth = await getAuthContext()
      if (!auth) throw new UnauthorizedError()

      const existing = await db.query.customers.findFirst({
        where: and(
          eq(customers.id, data.id),
          eq(customers.organizationId, auth.orgId)
        ),
      })

      if (!existing) throw new NotFoundError('Customer')

      const [updated] = await db
        .update(customers)
        .set({
          ...data,
          updatedBy: auth.userId,
        })
        .where(eq(customers.id, data.id))
        .returning()

      return updated
    })
  })
```

## 5. File Organization

### `src/server/` Structure by Domain

```
src/server/
├── index.ts              # Re-exports all server functions
├── auth.ts               # Authentication utilities
├── authorization.ts      # Authorization checks
├── errors.ts             # Custom error classes
├── middleware.ts         # Shared middleware functions
├── utils.ts              # Utility functions
│
├── customers/
│   ├── index.ts          # Re-exports
│   ├── queries.ts        # GET functions (reads)
│   └── mutations.ts      # POST functions (writes)
│
├── orders/
│   ├── index.ts
│   ├── queries.ts
│   └── mutations.ts
│
├── products/
│   ├── index.ts
│   ├── queries.ts
│   └── mutations.ts
│
└── ai/
    ├── index.ts
    ├── agents.ts         # AI agent server functions
    └── tools.ts          # AI tool definitions
```

### Domain Module Pattern

```typescript
// src/server/customers/queries.ts
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { eq, and, desc, ilike } from 'drizzle-orm'
import { getAuthContext } from '../auth'
import { UnauthorizedError, NotFoundError } from '../errors'

export const getCustomer = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()

    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, data.id),
        eq(customers.organizationId, auth.orgId)
      ),
      with: {
        contacts: true,
        orders: { limit: 5, orderBy: desc(orders.createdAt) },
      },
    })

    if (!customer) throw new NotFoundError('Customer')
    return customer
  })

export const searchCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({ query: z.string().min(1) }))
  .handler(async ({ data }) => {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()

    return db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, auth.orgId),
        ilike(customers.name, `%${data.query}%`)
      ),
      limit: 10,
    })
  })

// src/server/customers/mutations.ts
export const createCustomer = createServerFn({ method: 'POST' })
  // ... as shown earlier

// src/server/customers/index.ts
export * from './queries'
export * from './mutations'
```

## 6. Calling from Client

### Using with TanStack Query

```typescript
// src/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer
} from '@/server/customers'

// Query keys factory
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
}

// List hook with filters
export function useCustomers(filters: { status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => getCustomers({ data: filters }),
  })
}

// Detail hook
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomer({ data: { id } }),
    enabled: !!id,
  })
}

// Create mutation with optimistic update
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; email?: string }) =>
      createCustomer({ data }),
    onSuccess: () => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

// Update mutation with optimistic update
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { id: string; name?: string; status?: string }) =>
      updateCustomer({ data }),
    onMutate: async (newData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: customerKeys.detail(newData.id)
      })

      // Snapshot previous value
      const previous = queryClient.getQueryData(
        customerKeys.detail(newData.id)
      )

      // Optimistically update
      queryClient.setQueryData(
        customerKeys.detail(newData.id),
        (old: any) => ({ ...old, ...newData })
      )

      return { previous }
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          customerKeys.detail(newData.id),
          context.previous
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id)
      })
    },
  })
}
```

### Using in Components

```tsx
// src/routes/customers/index.tsx
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'

export function CustomersPage() {
  const [filters, setFilters] = useState({ status: 'active', page: 1 })
  const { data, isLoading, error } = useCustomers(filters)
  const createMutation = useCreateCustomer()

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorBoundary error={error} />

  return (
    <div>
      <CustomerFilters value={filters} onChange={setFilters} />

      <CustomerTable
        customers={data?.data ?? []}
        pagination={data?.pagination}
      />

      <CreateCustomerDialog
        onSubmit={(values) => createMutation.mutate(values)}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}
```

## 7. Streaming Responses

### For AI / Large Data Responses

```typescript
// src/server/ai/chat.ts
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getAuthContext } from '../auth'

export const streamChat = createServerFn({ method: 'POST' })
  .validator(z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })),
    context: z.object({
      customerId: z.string().uuid().optional(),
    }).optional(),
  }))
  .handler(async ({ data }) => {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()

    // Build context from database if needed
    let systemPrompt = 'You are a helpful CRM assistant.'
    if (data.context?.customerId) {
      const customer = await db.query.customers.findFirst({
        where: and(
          eq(customers.id, data.context.customerId),
          eq(customers.organizationId, auth.orgId)
        ),
      })
      if (customer) {
        systemPrompt += `\n\nCustomer context: ${JSON.stringify(customer)}`
      }
    }

    // Stream the response
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: data.messages,
    })

    // Return the stream
    return result.toDataStreamResponse()
  })
```

### Consuming Streams on Client

```tsx
// src/components/ChatInterface.tsx
import { useChat } from 'ai/react'
import { streamChat } from '@/server/ai/chat'

export function ChatInterface({ customerId }: { customerId?: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/chat', // or call streamChat directly
      body: {
        context: { customerId },
      },
    })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about this customer..."
          disabled={isLoading}
        />
      </form>
    </div>
  )
}
```

### Streaming Large Dataset Results

```typescript
// For paginated streaming of large datasets
export const streamCustomerExport = createServerFn({ method: 'POST' })
  .validator(z.object({
    format: z.enum(['csv', 'json']),
    filters: z.object({
      status: z.string().optional(),
      dateRange: z.object({
        from: z.string(),
        to: z.string(),
      }).optional(),
    }).optional(),
  }))
  .handler(async function* ({ data }) {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()

    const batchSize = 100
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const batch = await db.query.customers.findMany({
        where: eq(customers.organizationId, auth.orgId),
        limit: batchSize,
        offset,
      })

      if (batch.length < batchSize) {
        hasMore = false
      }

      // Yield each batch
      for (const customer of batch) {
        yield data.format === 'csv'
          ? `${customer.id},${customer.name},${customer.email}\n`
          : JSON.stringify(customer) + '\n'
      }

      offset += batchSize
    }
  })
```

## 8. Middleware Pattern

### Shared Auth/Logging Logic

```typescript
// src/server/middleware.ts
import { createServerFn } from '@tanstack/start'
import { getAuthContext, type AuthContext } from './auth'
import { UnauthorizedError, ForbiddenError } from './errors'

// Middleware that requires authentication
export function withAuth<TInput, TOutput>(
  handler: (params: { data: TInput; auth: AuthContext }) => Promise<TOutput>
) {
  return async ({ data }: { data: TInput }) => {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()
    return handler({ data, auth })
  }
}

// Middleware that requires specific roles
export function withRole<TInput, TOutput>(
  allowedRoles: string[],
  handler: (params: { data: TInput; auth: AuthContext }) => Promise<TOutput>
) {
  return async ({ data }: { data: TInput }) => {
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()
    if (!allowedRoles.includes(auth.role ?? '')) {
      throw new ForbiddenError(`Requires role: ${allowedRoles.join(' or ')}`)
    }
    return handler({ data, auth })
  }
}

// Logging middleware
export function withLogging<TInput, TOutput>(
  name: string,
  handler: (params: { data: TInput }) => Promise<TOutput>
) {
  return async ({ data }: { data: TInput }) => {
    const start = performance.now()
    try {
      const result = await handler({ data })
      console.log(`[${name}] Success in ${performance.now() - start}ms`)
      return result
    } catch (error) {
      console.error(`[${name}] Error in ${performance.now() - start}ms:`, error)
      throw error
    }
  }
}
```

### Using Middleware

```typescript
// src/server/customers/queries.ts
import { withAuth, withRole, withLogging } from '../middleware'

export const getCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({
    status: z.string().optional(),
  }))
  .handler(
    withLogging('getCustomers',
      withAuth(async ({ data, auth }) => {
        return db.query.customers.findMany({
          where: and(
            eq(customers.organizationId, auth.orgId),
            data.status ? eq(customers.status, data.status) : undefined
          ),
        })
      })
    )
  )

// Admin-only function
export const deleteCustomer = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(
    withRole(['owner', 'admin'], async ({ data, auth }) => {
      await db
        .update(customers)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(customers.id, data.id),
          eq(customers.organizationId, auth.orgId)
        ))
      return { success: true }
    })
  )
```

### Composable Middleware Chain

```typescript
// src/server/middleware.ts

// Compose multiple middleware
export function compose<TInput, TOutput>(
  ...middlewares: Array<
    (next: (params: any) => Promise<any>) => (params: any) => Promise<any>
  >
) {
  return (handler: (params: { data: TInput }) => Promise<TOutput>) => {
    return middlewares.reduceRight(
      (next, middleware) => middleware(next),
      handler
    )
  }
}

// Rate limiting middleware
export function withRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  return <T>(next: (params: T) => Promise<any>) =>
    async (params: T) => {
      const auth = await getAuthContext()
      const rateLimitKey = `${key}:${auth?.userId ?? 'anonymous'}`

      // Check rate limit (using Redis or in-memory store)
      const current = await getRateLimit(rateLimitKey)
      if (current >= limit) {
        throw new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
      }

      await incrementRateLimit(rateLimitKey, windowMs)
      return next(params)
    }
}

// Usage with compose
export const sensitiveOperation = createServerFn({ method: 'POST' })
  .validator(z.object({ /* ... */ }))
  .handler(
    compose(
      withLogging('sensitiveOperation'),
      withRateLimit('sensitive', 10, 60000), // 10 per minute
      withRole(['owner']),
    )(async ({ data, auth }) => {
      // Handler implementation
    })
  )
```

## Quick Reference

### Server Function Skeleton

```typescript
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'
import { getAuthContext } from '@/server/auth'
import { UnauthorizedError } from '@/server/errors'

export const myServerFn = createServerFn({ method: 'GET' /* or 'POST' */ })
  .validator(z.object({
    // Define input schema
  }))
  .handler(async ({ data }) => {
    // 1. Auth check
    const auth = await getAuthContext()
    if (!auth) throw new UnauthorizedError()

    // 2. Authorization check (if needed)
    // await requireRole(auth.userId, auth.orgId, ['admin'])

    // 3. Business logic
    const result = await db.query.table.findMany({
      where: eq(table.organizationId, auth.orgId),
    })

    // 4. Return
    return result
  })
```

### Common Imports

```typescript
// TanStack
import { createServerFn } from '@tanstack/start'
import { getWebRequest } from '@tanstack/start/server'

// Validation
import { z } from 'zod'

// Database
import { db } from '@/db'
import { eq, and, or, desc, asc, ilike, sql } from 'drizzle-orm'

// Auth
import { getAuthContext } from '@/server/auth'
import { requireRole, requireOrgMembership } from '@/server/authorization'

// Errors
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError
} from '@/server/errors'

// AI (when needed)
import { streamText, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
```

## Anti-Patterns to Avoid

1. **Don't skip auth checks** - Every server function needs authentication
2. **Don't trust client orgId** - Always use `auth.orgId` from JWT
3. **Don't expose internal errors** - Wrap in AppError classes
4. **Don't forget org scoping** - Every query needs `organizationId` filter
5. **Don't mix GET/POST** - GET for reads, POST for mutations
6. **Don't skip validation** - Always use Zod validators
7. **Don't return raw DB errors** - They may leak schema info
