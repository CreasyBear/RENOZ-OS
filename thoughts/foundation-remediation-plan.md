# Foundation Remediation Plan
## renoz-v3 | Created 2026-01-17

Based on comprehensive premortem, orchestration, performance, and security reviews.

---

## Priority Matrix

| Priority | Category | Issue | Effort |
|----------|----------|-------|--------|
| P0 | Security | Add `withAuth` to customers.ts | 30 min |
| P0 | Security | Add `withAuth` to jobs.ts | 30 min |
| P0 | Security | Add `organizationId` filter to all queries | 1 hr |
| P1 | Security | Server-side account lockout | 2 hr |
| P1 | Performance | Add cursor indexes (orders, opportunities) | 30 min |
| P1 | Performance | Fix N+1 in getCustomerById | 30 min |
| P2 | Performance | JWT auto-refresh | 1 hr |
| P2 | Orchestration | Query key factory pattern | 1 hr |
| P2 | Performance | DataTable virtualization | 2 hr |
| P3 | Orchestration | Standardize loading/error states | 2 hr |
| P3 | Security | Upgrade API token hashing to bcrypt | 1 hr |

---

## Phase 1: Critical Security Fixes (P0)

### 1.1 Add withAuth to customers.ts

**File:** `src/server/customers.ts`

**Current Pattern (VULNERABLE):**
```typescript
export const getCustomers = createServerFn({ method: "GET" })
  .inputValidator(customerListQuerySchema)
  .handler(async ({ data }) => {
    // TODO: Add organizationId filter from session context
    // ... queries without auth check
  });
```

**Target Pattern:**
```typescript
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

export const getCustomers = createServerFn({ method: "GET" })
  .inputValidator(customerListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const conditions = [
      eq(customers.organizationId, ctx.organizationId), // Multi-tenant isolation
      sql`${customers.deletedAt} IS NULL`,
    ]
    // ... rest of query
  });
```

**Functions to Update:**
- [ ] `getCustomers` - add withAuth + permission + orgId filter
- [ ] `getCustomersCursor` - add withAuth + permission + orgId filter
- [ ] `getCustomerById` - add withAuth + permission + orgId filter
- [ ] `createCustomer` - add withAuth + permission + set orgId on insert
- [ ] `updateCustomer` - add withAuth + permission + verify orgId
- [ ] `deleteCustomer` - add withAuth + permission + verify orgId

---

### 1.2 Add withAuth to jobs.ts

**File:** `src/server/jobs.ts`

**Functions to Update:**
- [ ] `createJob` - add withAuth, set organizationId from ctx
- [ ] `trackJobProgress` - add withAuth, verify job belongs to org
- [ ] `completeJob` - add withAuth, verify job belongs to org
- [ ] `getJobById` - add withAuth, filter by orgId
- [ ] `getUserJobs` - add withAuth, filter by orgId

**Special Consideration:** Jobs may be created by Trigger.dev tasks (server-to-server). Need to support both:
1. User-initiated jobs (use withAuth)
2. System-initiated jobs (use service token or bypass)

**Recommendation:** Create `createJobInternal` for system use, keep `createJob` for user API.

---

### 1.3 Enable RLS on All Tables

**Tables Missing RLS:**
| Table | Priority | Notes |
|-------|----------|-------|
| customers | P0 | Core business data |
| contacts | P0 | PII |
| orders | P0 | Core business data |
| products | P1 | Catalog data |
| inventory | P1 | Stock data |
| activities | P1 | Audit trail |
| opportunities | P1 | Pipeline data |
| quotes | P1 | Pricing data |
| stages | P2 | Config data |
| stock_movements | P2 | Inventory audit |

**RLS Policy Template:**
```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users in same org
CREATE POLICY "Users can view own org customers"
ON customers FOR SELECT
TO authenticated
USING (organization_id = (current_setting('app.organization_id'))::uuid);

-- Policy for insert
CREATE POLICY "Users can create customers in own org"
ON customers FOR INSERT
TO authenticated
WITH CHECK (organization_id = (current_setting('app.organization_id'))::uuid);

-- Policy for update
CREATE POLICY "Users can update own org customers"
ON customers FOR UPDATE
TO authenticated
USING (organization_id = (current_setting('app.organization_id'))::uuid)
WITH CHECK (organization_id = (current_setting('app.organization_id'))::uuid);
```

**Note:** RLS requires setting `app.organization_id` in session. Add to `withAuth`:
```typescript
// In withAuth, after getting context:
await db.execute(sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`)
```

---

## Phase 2: High Priority Fixes (P1)

### 2.1 Server-Side Account Lockout

**Current:** Client-side React state (resets on page refresh)

**Target:** Redis-backed rate limiting using existing Upstash

**File to Create:** `src/lib/auth/rate-limit.ts`

```typescript
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
  prefix: 'ratelimit:login:',
})

export async function checkLoginRateLimit(identifier: string) {
  const { success, remaining, reset } = await loginRateLimit.limit(identifier)

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    throw new RateLimitError(`Too many login attempts. Try again in ${retryAfter} seconds.`)
  }

  return { remaining }
}

export async function resetLoginRateLimit(identifier: string) {
  await redis.del(`ratelimit:login:${identifier}`)
}
```

**Integration Point:** Call in login route before Supabase auth

---

### 2.2 Add Missing Database Indexes

**File:** Create migration `drizzle/migrations/XXXX_add_cursor_indexes.sql`

```sql
-- Orders cursor pagination index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_cursor
ON orders (organization_id, created_at DESC, id DESC);

-- Opportunities cursor pagination index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_org_cursor
ON opportunities (organization_id, created_at DESC, id DESC);

-- Quotes cursor pagination index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_org_cursor
ON quotes (organization_id, created_at DESC, id DESC);
```

---

### 2.3 Fix N+1 Query in getCustomerById

**File:** `src/server/customers.ts` (around line 134-143)

**Current:**
```typescript
const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) })
const customerContacts = await db.query.contacts.findMany({ where: eq(contacts.customerId, id) })
```

**Target:**
```typescript
const customer = await db.query.customers.findFirst({
  where: and(
    eq(customers.id, id),
    eq(customers.organizationId, ctx.organizationId)
  ),
  with: {
    contacts: true, // Eager load via Drizzle relations
  },
})
```

---

## Phase 3: Medium Priority Improvements (P2)

### 3.1 JWT Auto-Refresh

**File:** `src/lib/supabase/client.ts`

**Add to Supabase client config:**
```typescript
export const supabase = createBrowserClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,  // Enable auto-refresh
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
```

**Add session refresh hook:** `src/hooks/use-session-refresh.ts`
```typescript
export function useSessionRefresh() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed')
        }
        if (event === 'SIGNED_OUT') {
          // Redirect to login
          window.location.href = '/login'
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])
}
```

---

### 3.2 Query Key Factory Pattern

**File to Create:** `src/lib/query-keys.ts`

```typescript
export const queryKeys = {
  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: CustomerFilters) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: OrderFilters) => [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    byCustomer: (customerId: string) => [...queryKeys.orders.all, 'customer', customerId] as const,
  },

  // API Tokens
  apiTokens: {
    all: ['api-tokens'] as const,
    list: () => [...queryKeys.apiTokens.all, 'list'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: (userId?: string) => [...queryKeys.jobs.all, 'list', userId] as const,
    detail: (id: string) => [...queryKeys.jobs.all, id] as const,
  },
} as const
```

**Migration:** Update all `queryKey` usages to use factory

---

### 3.3 DataTable Virtualization

**File:** `src/components/shared/data-table/data-table.tsx`

**Add TanStack Virtual for large datasets:**

```bash
bun add @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

// In DataTable component, when rows > 100:
const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // Row height
  overscan: 10,
})
```

---

## Phase 4: Lower Priority Improvements (P3)

### 4.1 Standardize Loading/Error States

**Create:** `src/lib/query-state.ts`

```typescript
import type { UseQueryResult } from '@tanstack/react-query'

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | { status: 'success'; data: T }

export function getQueryState<T>(query: UseQueryResult<T>): QueryState<T> {
  if (query.isLoading) return { status: 'loading' }
  if (query.isError) return { status: 'error', error: query.error as Error }
  if (!query.data || (Array.isArray(query.data) && query.data.length === 0)) {
    return { status: 'empty' }
  }
  return { status: 'success', data: query.data }
}
```

**Create:** `src/components/shared/query-renderer.tsx`

```typescript
export function QueryRenderer<T>({
  query,
  loading,
  error,
  empty,
  children,
}: {
  query: UseQueryResult<T>
  loading?: React.ReactNode
  error?: (error: Error) => React.ReactNode
  empty?: React.ReactNode
  children: (data: T) => React.ReactNode
}) {
  const state = getQueryState(query)

  switch (state.status) {
    case 'loading': return loading ?? <LoadingState />
    case 'error': return error?.(state.error) ?? <ErrorState error={state.error} />
    case 'empty': return empty ?? <EmptyState />
    case 'success': return children(state.data)
  }
}
```

---

### 4.2 Upgrade API Token Hashing

**File:** `src/lib/auth/tokens.ts`

**Current:** SHA-256 (fast but weak)
**Target:** bcrypt (slow, resistant to brute force)

```typescript
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, SALT_ROUNDS)
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash)
}
```

**Migration Required:** Existing tokens will need to be regenerated (breaking change).

---

## Execution Checklist

### Day 1: P0 Security
- [ ] Update customers.ts with withAuth (6 functions)
- [ ] Update jobs.ts with withAuth (5 functions)
- [ ] Test all endpoints still work
- [ ] Write integration test for cross-tenant isolation

### Day 2: P0/P1 Security + Performance
- [ ] Create RLS migration for 5 core tables
- [ ] Apply RLS migration
- [ ] Implement server-side rate limiting
- [ ] Add cursor indexes migration

### Day 3: P1/P2 Performance + Auth
- [ ] Fix N+1 in getCustomerById
- [ ] Enable JWT auto-refresh
- [ ] Add session refresh hook
- [ ] Test session expiry scenarios

### Day 4: P2 Code Quality
- [ ] Create query key factory
- [ ] Migrate existing query keys
- [ ] Add DataTable virtualization (optional)

### Day 5: Testing + Documentation
- [ ] Add integration tests for all security fixes
- [ ] Update README with security patterns
- [ ] Document rate limiting configuration

---

## Success Criteria

- [ ] All server functions in src/server/ use withAuth
- [ ] All queries filter by organizationId
- [ ] Login rate-limited to 5 attempts per 15 minutes (server-side)
- [ ] RLS enabled on all 10 core tables
- [ ] JWT auto-refresh enabled
- [ ] No cross-tenant data leakage in integration tests
- [ ] Cursor pagination indexes exist on frequently queried tables

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/server/customers.ts` | Add withAuth, orgId filters |
| `src/server/jobs.ts` | Add withAuth, orgId filters |
| `src/lib/auth/rate-limit.ts` | New file |
| `src/lib/supabase/client.ts` | Enable autoRefreshToken |
| `src/hooks/use-session-refresh.ts` | New file |
| `src/lib/query-keys.ts` | New file |
| `drizzle/migrations/XXXX_*.sql` | New migrations |
| `supabase/migrations/XXXX_*.sql` | RLS policies |

---

## Reference: Good Pattern (users.ts)

The `src/server/users.ts` file demonstrates the correct pattern:

```typescript
export const listOrganizationUsers = createServerFn({ method: 'GET' })
  .inputValidator(listUsersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read })  // ✓ Auth + Permission

    const orgUsers = await db
      .select({ ... })
      .from(users)
      .where(eq(users.organizationId, ctx.organizationId))  // ✓ Org isolation
      .limit(pageSize)
      .offset(offset)

    return { users: orgUsers }
  })
```

All other server functions should follow this pattern.
