# Query Patterns

> Drizzle ORM query conventions for renoz-v3 PostgreSQL database.

## 1. Query Organization

Organize queries by domain in a dedicated `queries/` folder:

```
src/
├── db/
│   ├── index.ts           # Database client export
│   ├── schema/            # Table definitions
│   └── queries/           # Query modules
│       ├── index.ts       # Re-exports all queries
│       ├── customers.ts   # Customer domain queries
│       ├── orders.ts      # Order domain queries
│       ├── products.ts    # Product catalog queries
│       ├── inventory.ts   # Inventory queries
│       └── reports.ts     # Aggregation/reporting queries
```

### Query Module Pattern

```typescript
// src/db/queries/customers.ts
import { db } from '../index'
import { customers, contacts, orders } from '../schema'
import { eq, and, or, desc, sql, ilike } from 'drizzle-orm'
import type { Customer, NewCustomer, CustomerUpdate } from '../schema/customers'

// Group related queries in an object for clean imports
export const customerQueries = {
  // Simple queries
  findById,
  findByOrg,
  findByEmail,

  // Complex queries
  findWithContacts,
  findWithOrders,
  search,

  // Mutations
  create,
  update,
  softDelete,
}

// Export individual functions for direct imports
export { findById, findByOrg, create, update }
```

## 2. Database Connection

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// CRITICAL: disable prepare for Supabase pooler compatibility
// Supabase uses PgBouncer in transaction mode which doesn't support prepared statements
const client = postgres(connectionString, {
  prepare: false,
  // Optional: connection pool settings
  max: 10,
  idle_timeout: 20,
})

export const db = drizzle(client, { schema })
```

## 3. Prepared Statements

Use `.prepare()` for hot paths to improve performance. Prepared statements are compiled once and reused.

```typescript
// src/db/queries/customers.ts
import { db } from '../index'
import { customers } from '../schema'
import { eq, and } from 'drizzle-orm'

// Prepared statement with placeholder
const findByIdPrepared = db
  .select()
  .from(customers)
  .where(eq(customers.id, sql.placeholder('id')))
  .prepare('find_customer_by_id')

// Prepared statement with multiple placeholders
const findByOrgAndStatusPrepared = db
  .select()
  .from(customers)
  .where(
    and(
      eq(customers.organizationId, sql.placeholder('orgId')),
      eq(customers.status, sql.placeholder('status'))
    )
  )
  .prepare('find_customers_by_org_and_status')

// Usage
export async function findById(id: string): Promise<Customer | undefined> {
  const [customer] = await findByIdPrepared.execute({ id })
  return customer
}

export async function findByOrgAndStatus(
  orgId: string,
  status: CustomerStatus
): Promise<Customer[]> {
  return findByOrgAndStatusPrepared.execute({ orgId, status })
}
```

### When to Use Prepared Statements

| Use Prepared | Use Dynamic |
|--------------|-------------|
| High-frequency queries (100+ req/s) | Complex dynamic filters |
| Simple parameter substitution | Variable column selection |
| Known query shape at compile time | Conditional joins |

**Note:** With `prepare: false` in connection config (required for Supabase pooler), prepared statements still provide query plan caching benefits within the same connection.

## 4. Relational Queries

Drizzle's relational query API (`db.query.table`) provides a cleaner syntax for fetching related data.

### Basic Find Operations

```typescript
// Find one by ID with type-safe result
export async function findById(id: string): Promise<Customer | undefined> {
  return db.query.customers.findFirst({
    where: eq(customers.id, id),
  })
}

// Find many with filters
export async function findByOrg(orgId: string): Promise<Customer[]> {
  return db.query.customers.findMany({
    where: eq(customers.organizationId, orgId),
    orderBy: [desc(customers.createdAt)],
  })
}
```

### Nested Relations with `with:`

```typescript
// Customer with contacts and recent orders
export async function findWithRelations(id: string) {
  return db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      contacts: true,  // Include all contacts
      orders: {
        limit: 5,
        orderBy: [desc(orders.createdAt)],
        with: {
          lineItems: true,  // Nested relation
        },
      },
    },
  })
}

// Organization with members and their roles
export async function findOrgWithMembers(orgId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    with: {
      members: {
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })
}
```

### Column Selection with `columns:`

```typescript
// Select only needed columns - reduces payload
export async function findCustomerSummaries(orgId: string) {
  return db.query.customers.findMany({
    where: eq(customers.organizationId, orgId),
    columns: {
      id: true,
      name: true,
      email: true,
      status: true,
      // Omit: address, notes, metadata, etc.
    },
    orderBy: [customers.name],
  })
}

// Exclude specific columns
export async function findWithoutMetadata(orgId: string) {
  return db.query.customers.findMany({
    where: eq(customers.organizationId, orgId),
    columns: {
      metadata: false,
      notes: false,
    },
  })
}
```

## 5. SQL Builder Queries

Use `db.select().from()` for complex queries requiring aggregations, raw SQL, or non-standard joins.

### Complex Aggregations

```typescript
// Order totals by customer
export async function getCustomerOrderStats(orgId: string) {
  return db
    .select({
      customerId: orders.customerId,
      customerName: customers.name,
      orderCount: sql<number>`count(${orders.id})::int`,
      totalRevenue: sql<number>`sum(${orders.total})::numeric`,
      avgOrderValue: sql<number>`avg(${orders.total})::numeric`,
      lastOrderDate: sql<Date>`max(${orders.createdAt})`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.organizationId, orgId))
    .groupBy(orders.customerId, customers.name)
    .orderBy(desc(sql`sum(${orders.total})`))
}

// Monthly revenue report
export async function getMonthlyRevenue(orgId: string, year: number) {
  return db
    .select({
      month: sql<number>`extract(month from ${orders.createdAt})::int`,
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<number>`sum(${orders.total})::numeric`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        sql`extract(year from ${orders.createdAt}) = ${year}`
      )
    )
    .groupBy(sql`extract(month from ${orders.createdAt})`)
    .orderBy(sql`extract(month from ${orders.createdAt})`)
}
```

### Subqueries

```typescript
// Customers with order count subquery
export async function getCustomersWithOrderCount(orgId: string) {
  const orderCountSq = db
    .select({
      customerId: orders.customerId,
      count: sql<number>`count(*)::int`.as('order_count'),
    })
    .from(orders)
    .groupBy(orders.customerId)
    .as('order_counts')

  return db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      orderCount: sql<number>`coalesce(${orderCountSq.count}, 0)`,
    })
    .from(customers)
    .leftJoin(orderCountSq, eq(customers.id, orderCountSq.customerId))
    .where(eq(customers.organizationId, orgId))
}
```

## 6. Pagination Patterns

### Cursor-Based Pagination (Recommended)

Best for infinite scroll and real-time data. Uses a stable cursor (usually `createdAt` + `id`).

```typescript
interface CursorPaginationParams {
  orgId: string
  limit?: number
  cursor?: {
    createdAt: Date
    id: string
  }
}

interface CursorPaginationResult<T> {
  items: T[]
  nextCursor: { createdAt: Date; id: string } | null
  hasMore: boolean
}

export async function findCustomersPaginated(
  params: CursorPaginationParams
): Promise<CursorPaginationResult<Customer>> {
  const { orgId, limit = 20, cursor } = params

  // Fetch one extra to determine if there are more
  const fetchLimit = limit + 1

  let query = db.query.customers.findMany({
    where: cursor
      ? and(
          eq(customers.organizationId, orgId),
          or(
            sql`${customers.createdAt} < ${cursor.createdAt}`,
            and(
              sql`${customers.createdAt} = ${cursor.createdAt}`,
              sql`${customers.id} < ${cursor.id}`
            )
          )
        )
      : eq(customers.organizationId, orgId),
    orderBy: [desc(customers.createdAt), desc(customers.id)],
    limit: fetchLimit,
  })

  const items = await query
  const hasMore = items.length > limit
  const resultItems = hasMore ? items.slice(0, limit) : items

  const lastItem = resultItems[resultItems.length - 1]
  const nextCursor = hasMore && lastItem
    ? { createdAt: lastItem.createdAt, id: lastItem.id }
    : null

  return { items: resultItems, nextCursor, hasMore }
}
```

### Offset-Based Pagination

Simpler but less efficient for large datasets. Good for admin panels with page numbers.

```typescript
interface OffsetPaginationParams {
  orgId: string
  page?: number
  pageSize?: number
}

interface OffsetPaginationResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function findCustomersWithOffset(
  params: OffsetPaginationParams
): Promise<OffsetPaginationResult<Customer>> {
  const { orgId, page = 1, pageSize = 20 } = params
  const offset = (page - 1) * pageSize

  // Run count and fetch in parallel
  const [items, countResult] = await Promise.all([
    db.query.customers.findMany({
      where: eq(customers.organizationId, orgId),
      orderBy: [desc(customers.createdAt)],
      limit: pageSize,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.organizationId, orgId)),
  ])

  const total = countResult[0]?.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
```

## 7. Filter Pattern

Build dynamic where clauses using `and()` and `or()` with optional conditions.

```typescript
interface CustomerFilters {
  orgId: string
  status?: CustomerStatus | CustomerStatus[]
  search?: string
  tags?: string[]
  createdAfter?: Date
  createdBefore?: Date
}

export async function findWithFilters(filters: CustomerFilters) {
  const conditions: SQL[] = [
    eq(customers.organizationId, filters.orgId),
  ]

  // Single or multiple status values
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      conditions.push(inArray(customers.status, filters.status))
    } else {
      conditions.push(eq(customers.status, filters.status))
    }
  }

  // Full-text search on name and email
  if (filters.search) {
    const searchPattern = `%${filters.search}%`
    conditions.push(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.email, searchPattern)
      )!
    )
  }

  // Array contains (PostgreSQL @> operator)
  if (filters.tags?.length) {
    conditions.push(
      sql`${customers.tags} @> ${filters.tags}`
    )
  }

  // Date range filters
  if (filters.createdAfter) {
    conditions.push(gte(customers.createdAt, filters.createdAfter))
  }
  if (filters.createdBefore) {
    conditions.push(lte(customers.createdAt, filters.createdBefore))
  }

  return db.query.customers.findMany({
    where: and(...conditions),
    orderBy: [desc(customers.createdAt)],
  })
}
```

### Reusable Filter Builder

```typescript
// src/db/queries/utils/filter-builder.ts
import { SQL, and, or, eq, ilike, gte, lte, inArray } from 'drizzle-orm'

type FilterCondition = SQL | undefined

export function buildFilters(...conditions: FilterCondition[]): SQL | undefined {
  const validConditions = conditions.filter(Boolean) as SQL[]
  return validConditions.length > 0 ? and(...validConditions) : undefined
}

// Usage
const where = buildFilters(
  eq(customers.organizationId, orgId),
  status && eq(customers.status, status),
  search && ilike(customers.name, `%${search}%`),
  createdAfter && gte(customers.createdAt, createdAfter),
)
```

## 8. Transaction Pattern

Use transactions for operations that must succeed or fail together.

### Basic Transaction

```typescript
export async function createOrderWithItems(
  orderData: NewOrder,
  items: NewOrderItem[]
): Promise<Order> {
  return db.transaction(async (tx) => {
    // Insert order
    const [order] = await tx
      .insert(orders)
      .values(orderData)
      .returning()

    // Insert line items with order reference
    const orderItems = items.map(item => ({
      ...item,
      orderId: order.id,
    }))

    await tx.insert(orderItems).values(orderItems)

    // Update inventory (decrement stock)
    for (const item of items) {
      await tx
        .update(inventory)
        .set({
          quantity: sql`${inventory.quantity} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, item.productId))
    }

    return order
  })
}
```

### Transaction with Rollback on Validation

```typescript
export async function transferInventory(
  fromWarehouseId: string,
  toWarehouseId: string,
  productId: string,
  quantity: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Check source inventory
    const [source] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.warehouseId, fromWarehouseId),
          eq(inventory.productId, productId)
        )
      )
      .for('update')  // Row-level lock

    if (!source || source.quantity < quantity) {
      throw new Error('Insufficient inventory')
      // Transaction automatically rolls back on throw
    }

    // Decrement source
    await tx
      .update(inventory)
      .set({ quantity: sql`${inventory.quantity} - ${quantity}` })
      .where(eq(inventory.id, source.id))

    // Upsert destination
    await tx
      .insert(inventory)
      .values({
        warehouseId: toWarehouseId,
        productId,
        quantity,
      })
      .onConflictDoUpdate({
        target: [inventory.warehouseId, inventory.productId],
        set: { quantity: sql`${inventory.quantity} + ${quantity}` },
      })
  })
}
```

### Nested Transaction (Savepoints)

```typescript
export async function complexOperation() {
  await db.transaction(async (tx) => {
    await tx.insert(auditLogs).values({ action: 'start' })

    try {
      // Nested transaction creates a savepoint
      await tx.transaction(async (nestedTx) => {
        await nestedTx.insert(orders).values(orderData)
        // If this fails, only the nested transaction rolls back
      })
    } catch (error) {
      // Log but continue - outer transaction still commits
      await tx.insert(auditLogs).values({ action: 'nested_failed' })
    }

    await tx.insert(auditLogs).values({ action: 'complete' })
  })
}
```

## 9. Error Handling

### Drizzle Error Types

```typescript
import { DrizzleError } from 'drizzle-orm'
import { PostgresError } from 'postgres'

export async function createCustomer(data: NewCustomer): Promise<Customer> {
  try {
    const [customer] = await db
      .insert(customers)
      .values(data)
      .returning()
    return customer
  } catch (error) {
    if (error instanceof PostgresError) {
      // PostgreSQL-specific errors
      switch (error.code) {
        case '23505': // unique_violation
          throw new ConflictError('Customer with this email already exists')
        case '23503': // foreign_key_violation
          throw new NotFoundError('Referenced organization not found')
        case '23514': // check_violation
          throw new ValidationError('Data validation failed')
        case '23502': // not_null_violation
          throw new ValidationError(`Missing required field: ${error.column}`)
        default:
          throw new DatabaseError('Database operation failed', error)
      }
    }
    throw error
  }
}
```

### Custom Error Classes

```typescript
// src/errors/database.ts
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### Error Handling Wrapper

```typescript
// src/db/queries/utils/with-error-handling.ts
import { PostgresError } from 'postgres'

type QueryFn<T> = () => Promise<T>

export async function withErrorHandling<T>(
  queryFn: QueryFn<T>,
  context: string
): Promise<T> {
  try {
    return await queryFn()
  } catch (error) {
    if (error instanceof PostgresError) {
      console.error(`Database error in ${context}:`, {
        code: error.code,
        message: error.message,
        detail: error.detail,
        constraint: error.constraint,
      })
    }
    throw error
  }
}

// Usage
export async function findCustomer(id: string) {
  return withErrorHandling(
    () => db.query.customers.findFirst({ where: eq(customers.id, id) }),
    'findCustomer'
  )
}
```

## 10. Common Query Patterns

### Upsert (Insert or Update)

```typescript
export async function upsertCustomer(data: NewCustomer): Promise<Customer> {
  const [customer] = await db
    .insert(customers)
    .values(data)
    .onConflictDoUpdate({
      target: [customers.organizationId, customers.email],
      set: {
        name: data.name,
        phone: data.phone,
        updatedAt: new Date(),
      },
    })
    .returning()
  return customer
}
```

### Soft Delete

```typescript
export async function softDeleteCustomer(id: string): Promise<void> {
  await db
    .update(customers)
    .set({ deletedAt: new Date() })
    .where(eq(customers.id, id))
}

// Query excludes soft-deleted by default
export async function findActiveCustomers(orgId: string) {
  return db.query.customers.findMany({
    where: and(
      eq(customers.organizationId, orgId),
      isNull(customers.deletedAt)
    ),
  })
}
```

### Batch Operations

```typescript
// Batch insert with chunking
export async function batchCreateCustomers(
  items: NewCustomer[],
  chunkSize = 100
): Promise<Customer[]> {
  const results: Customer[] = []

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const inserted = await db
      .insert(customers)
      .values(chunk)
      .returning()
    results.push(...inserted)
  }

  return results
}

// Batch update
export async function batchUpdateStatus(
  ids: string[],
  status: CustomerStatus
): Promise<void> {
  await db
    .update(customers)
    .set({ status, updatedAt: new Date() })
    .where(inArray(customers.id, ids))
}
```

### Exists Check

```typescript
export async function customerExists(
  orgId: string,
  email: string
): Promise<boolean> {
  const result = await db
    .select({ exists: sql<boolean>`1` })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, orgId),
        eq(customers.email, email)
      )
    )
    .limit(1)

  return result.length > 0
}
```

## Quick Reference

### Import Cheatsheet

```typescript
// Core
import { db } from '@/db'
import { customers, orders, products } from '@/db/schema'

// Operators
import {
  eq, ne, gt, gte, lt, lte,  // Comparison
  and, or, not,               // Logical
  inArray, notInArray,        // Arrays
  isNull, isNotNull,          // Nullability
  like, ilike,                // Pattern matching
  between,                    // Range
  sql,                        // Raw SQL
  asc, desc,                  // Ordering
} from 'drizzle-orm'

// Types
import type { InferSelectModel, InferInsertModel, SQL } from 'drizzle-orm'
```

### Query Type Comparison

| Use Case | API | Example |
|----------|-----|---------|
| Simple CRUD | `db.query.table` | `db.query.customers.findMany()` |
| With relations | `db.query.table` + `with:` | `findFirst({ with: { orders: true } })` |
| Aggregations | `db.select().from()` | `select({ count: sql\`count(*)\` })` |
| Complex joins | `db.select().from()` | `select().from(a).leftJoin(b, ...)` |
| Insert | `db.insert()` | `insert(customers).values(data)` |
| Update | `db.update()` | `update(customers).set(data).where()` |
| Delete | `db.delete()` | `delete(customers).where()` |

## Anti-Patterns to Avoid

1. **Don't use raw SQL for simple queries** - Use Drizzle operators for type safety
2. **Don't forget `prepare: false`** - Required for Supabase pooler
3. **Don't skip pagination** - Always paginate list endpoints
4. **Don't use offset for infinite scroll** - Use cursor-based pagination
5. **Don't ignore transactions** - Wrap multi-table mutations
6. **Don't swallow errors** - Handle PostgreSQL error codes properly
7. **Don't select all columns** - Use `columns:` for partial selects
8. **Don't forget organizationId** - Every query needs multi-tenant scoping
