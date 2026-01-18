# v2 Pattern Reference for Ralph

> **Purpose**: Guide Ralph to follow good v2 patterns and avoid legacy/problematic ones.
> **Generated**: 2026-01-16
> **Source**: renoz-v2 codebase audit

---

## Pattern Categories

| Category | Status | Notes |
|----------|--------|-------|
| Schema (Drizzle) | ✅ FOLLOW | Well-structured, consistent |
| Server Functions | ✅ FOLLOW | Good patterns with some improvements needed |
| RLS Context | ✅ FOLLOW | Solid multi-tenancy approach |
| Supabase Auth | ✅ FOLLOW | Clean separation of browser/server |
| Error Handling | ⚠️ PARTIAL | Good base, needs expansion |
| Components | ⚠️ PARTIAL | Some patterns good, some inconsistent |

---

## ✅ PATTERNS TO FOLLOW

### 1. Schema Pattern (Drizzle)

**Location**: `lib/schema/*.ts`

```typescript
// GOOD: Standard schema structure
import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),

  // Multi-tenant FK (REQUIRED for all entity tables)
  organizationId: uuid('organization_id').notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  // Business fields
  companyName: text('company_name').notNull(),
  status: text('status').default('active'),

  // Audit columns (REQUIRED for all entity tables)
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  version: integer('version').default(1).notNull(), // Optimistic locking
}, (table) => ({
  // Indexes on commonly queried columns
  orgIdIdx: index('idx_customers_org_id').on(table.organizationId),
  statusIdx: index('idx_customers_status').on(table.status),
}));

// Type inference exports
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
```

**Key Rules**:
- Always use `uuid('id').primaryKey().defaultRandom()`
- Always include `organizationId` FK for multi-tenancy
- Always include audit columns: `createdAt`, `updatedAt`, `deletedAt`, `version`
- Always export `$inferSelect` and `$inferInsert` types
- Always add indexes on `organizationId` and commonly filtered columns

---

### 2. RLS Context Pattern

**Location**: `src/server/db.ts`

```typescript
// GOOD: RLS context wrapper
export async function withRLSContext<T>(
  session: Session,
  operation: (tx: any) => Promise<T>
): Promise<T> {
  if (!session.orgId) {
    throw new Error('Organization ID required for RLS context');
  }

  // Validate UUID format (security)
  if (!UUID_REGEX.test(session.orgId)) {
    throw new Error('Invalid organization ID format');
  }

  return await db.transaction(async (tx) => {
    // Set RLS context for this transaction
    await tx.execute(sql.raw(`SET LOCAL app.organization_id = '${session.orgId}'`));
    return await operation(tx);
  });
}
```

**Key Rules**:
- Always validate UUID format before using in SQL
- Always use transaction for RLS context
- Always set `app.organization_id` for RLS policies

---

### 3. Server Function Pattern

**Location**: `src/server/functions/*.ts`

```typescript
// GOOD: Server function with auth and RLS
export const getCustomerListMetrics = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await requireAuth();
    const orgId = ctx.session.orgId!;

    return await withRLSContext(ctx.session, async (tx) => {
      // Database operations here
      const result = await tx.select().from(customers);
      return result;
    });
  });

// GOOD: Mutation with validation schema
export const createCustomer = createServerFn({ method: 'POST' })
  .validator(CreateCustomerSchema) // Zod schema
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    return await withRLSContext(ctx.session, async (tx) => {
      const [customer] = await tx.insert(customers)
        .values({
          ...data,
          organizationId: ctx.session.orgId!,
          createdByUserId: ctx.session.userId,
        })
        .returning();

      // Audit logging for mutations
      await logAuditEvent({
        action: 'customer.create',
        entityType: 'customer',
        entityId: customer.id,
        userId: ctx.session.userId,
        organizationId: ctx.session.orgId!,
      });

      return customer;
    });
  });
```

**Key Rules**:
- Always use `requireAuth()` for protected functions
- Always wrap DB operations in `withRLSContext()`
- Always use Zod `.validator()` for input validation
- Always log audit events for mutations
- Always include `organizationId` when inserting records

---

### 4. Supabase Auth Pattern

**Location**: `lib/supabase-browser.ts`

```typescript
// GOOD: Singleton browser client
let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  return browserClient;
}
```

**Key Rules**:
- Use singleton pattern for browser client
- Use `@supabase/ssr` for cookie-based sessions (SSR compatible)
- Separate browser client from server client
- Use `VITE_` prefix for client-exposed env vars

---

### 5. Error Classes Pattern

**Location**: `src/server/errors.ts`

```typescript
// GOOD: Custom error classes
export class NotFoundError extends Error {
  code = 'NOT_FOUND';
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
  }
}

export class ConcurrencyError extends Error {
  code = 'CONCURRENCY_ERROR';
  constructor() {
    super('Record was modified by another user');
  }
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
  }
}
```

---

## ⚠️ PATTERNS TO IMPROVE (Don't Copy Exactly)

### 1. Protected Procedure Pattern

**Issue**: v2 has `createProtectedFn`, `createProtectedQuery`, `createProtectedMutation` but they're not consistently used.

**v3 Improvement**: Use a single `createProtectedFn` with options:

```typescript
// v3: Unified pattern
export const getCustomers = createProtectedFn({
  method: 'GET',
  validator: ListCustomersSchema,
  auth: { requiredPermission: 'customer.read' },
  handler: async ({ data, ctx }) => {
    // ...
  }
});
```

---

### 2. Component Import Pattern

**Issue**: v2 has mixed import patterns for components.

**v3 Improvement**: Always use barrel exports:

```typescript
// GOOD: Barrel import
import { Button, Card, Dialog } from '@/components/ui';

// AVOID: Individual imports
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

---

## ❌ PATTERNS TO AVOID

### 1. Raw SQL Interpolation

```typescript
// BAD: SQL injection risk
await tx.execute(sql.raw(`SELECT * FROM customers WHERE id = '${userId}'`));

// GOOD: Use parameterized queries
await tx.select().from(customers).where(eq(customers.id, userId));
```

### 2. Missing organizationId

```typescript
// BAD: No org isolation
const customers = await tx.select().from(customers);

// GOOD: Always filter by org (RLS handles this with withRLSContext)
const customers = await withRLSContext(session, async (tx) => {
  return tx.select().from(customers);
});
```

### 3. Client-Side Only Auth Checks

```typescript
// BAD: Only client check
if (!user) return <Navigate to="/login" />;

// GOOD: Server-side check FIRST, then client
// In route loader:
const ctx = await requireAuth(); // Server-side
// Then client-side for UX only
```

---

## File Reference Locations

| Pattern | v2 Location | Copy To v3 |
|---------|-------------|------------|
| Schema template | `lib/schema/customers.ts` | `drizzle/schema/` |
| Server function | `src/server/functions/customers.ts` | `src/lib/server/functions/` |
| RLS wrapper | `src/server/db.ts` | `src/lib/server/db.ts` |
| Error classes | `src/server/errors.ts` | `src/lib/server/errors.ts` |
| Browser auth | `lib/supabase-browser.ts` | `src/lib/supabase/client.ts` |
| Zod schemas | `lib/schemas/customers.ts` | `src/lib/schemas/` |
| Enums | `lib/enums.ts` | `src/lib/enums.ts` |

---

## Integration with PROMPT.md

Add this to Foundation PROMPT.md files:

```markdown
## Reference Patterns from v2

FOLLOW these v2 patterns exactly:
- Schema structure: `renoz-v2/lib/schema/customers.ts`
- RLS context: `renoz-v2/src/server/db.ts#withRLSContext`
- Error classes: `renoz-v2/src/server/errors.ts`
- Supabase browser: `renoz-v2/lib/supabase-browser.ts`

DO NOT copy these v2 anti-patterns:
- Raw SQL string interpolation
- Missing organizationId in queries
- Client-only auth checks
```

---

*Generated from renoz-v2 audit on 2026-01-16*
