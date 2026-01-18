# SQL Performance Patterns

> PostgreSQL performance optimization patterns for renoz-v3 with Drizzle ORM and Supabase.

## Indexing Strategy

### Composite Indexes for Multi-Tenant Queries

Always include `organization_id` as the first column in composite indexes for efficient multi-tenant filtering:

```typescript
// drizzle/schema/orders.ts
export const orders = pgTable('orders', {
  ...idColumn,
  ...organizationColumn,
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  status: orderStatusEnum('status').notNull(),
  total: numericCasted('total', { precision: 12, scale: 2 }).notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  ...timestampColumns,
}, (table) => ({
  // Multi-tenant queries ALWAYS filter by org first
  orgIdx: index('orders_org_idx').on(table.organizationId),

  // Composite: org + status for filtered lists
  orgStatusIdx: index('orders_org_status_idx')
    .on(table.organizationId, table.status),

  // Composite: org + date for date-range queries
  orgDateIdx: index('orders_org_date_idx')
    .on(table.organizationId, table.orderDate),

  // Composite: org + customer for customer order history
  orgCustomerIdx: index('orders_org_customer_idx')
    .on(table.organizationId, table.customerId),
}))
```

### Partial Indexes for Filtered Queries

Use partial indexes when you frequently query a subset of data:

```typescript
// Only index active orders (most common query)
export const orders = pgTable('orders', {
  // ... columns
}, (table) => ({
  // Partial index: only pending/processing orders
  activeOrdersIdx: index('orders_active_idx')
    .on(table.organizationId, table.status)
    .where(sql`status IN ('pending', 'processing')`),

  // Partial index: only non-deleted records
  nonDeletedIdx: index('orders_non_deleted_idx')
    .on(table.organizationId)
    .where(sql`deleted_at IS NULL`),
}))
```

### GIN Indexes for JSONB and Text Search

```typescript
export const customers = pgTable('customers', {
  // ... columns
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  tags: text('tags').array(),
  name: text('name').notNull(),
}, (table) => ({
  // GIN index for JSONB containment queries (@>)
  metadataGinIdx: index('customers_metadata_gin_idx')
    .using('gin', table.metadata),

  // GIN index for array contains (&&, @>)
  tagsGinIdx: index('customers_tags_gin_idx')
    .using('gin', table.tags),

  // GIN index for full-text search
  nameSearchIdx: index('customers_name_search_idx')
    .using('gin', sql`to_tsvector('english', ${table.name})`),
}))
```

**Query examples:**

```typescript
// JSONB containment - uses GIN index
const premiumCustomers = await db.select()
  .from(customers)
  .where(sql`${customers.metadata} @> '{"tier": "premium"}'::jsonb`)

// Array overlap - uses GIN index
const taggedCustomers = await db.select()
  .from(customers)
  .where(sql`${customers.tags} && ARRAY['vip', 'enterprise']`)

// Full-text search - uses GIN index
const searchResults = await db.select()
  .from(customers)
  .where(sql`to_tsvector('english', ${customers.name}) @@ to_tsquery('english', ${searchTerm})`)
```

### Index Naming Conventions

| Pattern | Format | Example |
|---------|--------|---------|
| Single column | `{table}_{column}_idx` | `orders_status_idx` |
| Composite | `{table}_{col1}_{col2}_idx` | `orders_org_status_idx` |
| Partial | `{table}_{purpose}_idx` | `orders_active_idx` |
| GIN | `{table}_{column}_gin_idx` | `customers_metadata_gin_idx` |
| Unique | `{table}_{column}_uniq` | `users_email_uniq` |

---

## Query Optimization

### EXPLAIN ANALYZE Usage

Always analyze slow queries:

```typescript
// Development helper - wrap queries for analysis
async function explainAnalyze<T>(
  query: SQL,
  db: DrizzleClient
): Promise<{ plan: string; result: T }> {
  const explained = await db.execute(sql`EXPLAIN ANALYZE ${query}`)
  const result = await db.execute(query) as T
  return { plan: explained.rows.map(r => r['QUERY PLAN']).join('\n'), result }
}

// Usage
const { plan, result } = await explainAnalyze(
  sql`SELECT * FROM orders WHERE organization_id = ${orgId} AND status = 'pending'`,
  db
)
console.log(plan) // Shows index usage, row estimates, actual time
```

**Key metrics to watch:**

| Metric | Good | Bad |
|--------|------|-----|
| Seq Scan | Small tables (<1000 rows) | Large tables |
| Index Scan | Any size | - |
| Rows Removed by Filter | Low | High (missing index) |
| Sort Method: quicksort | In-memory | external merge (needs work_mem) |
| Nested Loop | Few iterations | Many iterations (N+1) |

### Avoiding N+1 Queries with Joins

**Problem - N+1 pattern:**

```typescript
// BAD: N+1 queries
const orders = await db.select().from(ordersTable).where(eq(ordersTable.orgId, orgId))

// This creates N additional queries!
for (const order of orders) {
  const customer = await db.select().from(customers).where(eq(customers.id, order.customerId))
}
```

**Solution 1 - Drizzle Relations (recommended):**

```typescript
// GOOD: Single query with relations
const ordersWithCustomers = await db.query.orders.findMany({
  where: eq(orders.organizationId, orgId),
  with: {
    customer: true,
    lineItems: true,
  },
})
```

**Solution 2 - Explicit Join:**

```typescript
// GOOD: Explicit left join
const ordersWithCustomers = await db
  .select({
    order: orders,
    customer: customers,
  })
  .from(orders)
  .leftJoin(customers, eq(orders.customerId, customers.id))
  .where(eq(orders.organizationId, orgId))
```

**Solution 3 - Batch Load:**

```typescript
// GOOD: Batch load in two queries
const ordersList = await db.select().from(orders).where(eq(orders.orgId, orgId))
const customerIds = [...new Set(ordersList.map(o => o.customerId))]

const customersList = await db
  .select()
  .from(customers)
  .where(inArray(customers.id, customerIds))

const customerMap = new Map(customersList.map(c => [c.id, c]))
const ordersWithCustomers = ordersList.map(o => ({
  ...o,
  customer: customerMap.get(o.customerId),
}))
```

### Batch Operations vs Individual Inserts

```typescript
// BAD: Individual inserts (slow)
for (const item of items) {
  await db.insert(lineItems).values(item)
}

// GOOD: Batch insert (fast)
await db.insert(lineItems).values(items)

// GOOD: Batch insert with conflict handling
await db
  .insert(products)
  .values(productList)
  .onConflictDoUpdate({
    target: products.sku,
    set: {
      name: sql`excluded.name`,
      price: sql`excluded.price`,
      updatedAt: new Date(),
    },
  })

// GOOD: Batch update with CASE
await db.execute(sql`
  UPDATE orders
  SET status = CASE id
    ${sql.join(
      updates.map(u => sql`WHEN ${u.id} THEN ${u.status}::order_status`),
      sql` `
    )}
  END
  WHERE id IN (${sql.join(updates.map(u => u.id), sql`, `)})
`)
```

### Connection Pooling Settings

```typescript
// lib/db.ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

// Connection pool configuration
const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString, {
  // CRITICAL for Supabase pooler
  prepare: false,

  // Pool settings
  max: 10,                    // Max connections in pool
  idle_timeout: 20,           // Close idle connections after 20s
  connect_timeout: 10,        // Timeout for new connections

  // Statement timeout (prevent runaway queries)
  options: {
    statement_timeout: '30000', // 30 seconds max
  },
})

export const db = drizzle(client)
```

---

## Pagination Performance

### Cursor-Based Pagination (Preferred)

Offset-based pagination degrades as offset increases. Cursor-based pagination maintains constant performance.

```typescript
// Types
interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

// Cursor-based pagination implementation
export async function getOrdersPage(
  orgId: string,
  cursor: string | null,
  limit: number = 20
): Promise<CursorPage<Order>> {
  // Decode cursor (composite of sort fields)
  const decoded = cursor
    ? JSON.parse(Buffer.from(cursor, 'base64').toString())
    : null

  const query = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        decoded
          ? or(
              // Primary sort: orderDate desc
              lt(orders.orderDate, decoded.orderDate),
              // Tiebreaker: id
              and(
                eq(orders.orderDate, decoded.orderDate),
                lt(orders.id, decoded.id)
              )
            )
          : undefined
      )
    )
    .orderBy(desc(orders.orderDate), desc(orders.id))
    .limit(limit + 1) // Fetch one extra to check hasMore

  const results = await query
  const hasMore = results.length > limit
  const data = hasMore ? results.slice(0, -1) : results

  // Encode next cursor
  const lastItem = data[data.length - 1]
  const nextCursor = hasMore && lastItem
    ? Buffer.from(JSON.stringify({
        orderDate: lastItem.orderDate,
        id: lastItem.id,
      })).toString('base64')
    : null

  return { data, nextCursor, hasMore }
}
```

### Keyset Pagination Pattern

For simpler cases with a single sort column:

```typescript
// Keyset pagination - works well with indexes
export const getCustomersAfter = createServerFn({ method: 'GET' })
  .validator(z.object({
    orgId: z.string().uuid(),
    afterId: z.string().uuid().optional(),
    limit: z.number().min(1).max(100).default(20),
  }))
  .handler(async ({ data }) => {
    // Uses index on (organization_id, id)
    return db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, data.orgId),
          data.afterId ? gt(customers.id, data.afterId) : undefined
        )
      )
      .orderBy(asc(customers.id))
      .limit(data.limit)
  })
```

### When to Use Offset (Acceptable Cases)

```typescript
// Offset is OK for:
// 1. Small datasets (<10,000 rows)
// 2. Admin dashboards with specific page navigation
// 3. When total count is needed

export async function getOrdersWithCount(
  orgId: string,
  page: number,
  pageSize: number
) {
  const offset = (page - 1) * pageSize

  const [data, countResult] = await Promise.all([
    db.select()
      .from(orders)
      .where(eq(orders.organizationId, orgId))
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.organizationId, orgId)),
  ])

  return {
    data,
    total: countResult[0].count,
    page,
    pageSize,
    totalPages: Math.ceil(countResult[0].count / pageSize),
  }
}
```

---

## Aggregation Patterns

### Materialized Views for Dashboards

```sql
-- Create materialized view for dashboard stats
CREATE MATERIALIZED VIEW organization_stats AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status = 'active') as active_customers,
  COUNT(*) FILTER (WHERE status = 'lead') as leads,
  COUNT(*) as total_customers,
  DATE_TRUNC('month', created_at) as month
FROM customers
WHERE deleted_at IS NULL
GROUP BY organization_id, DATE_TRUNC('month', created_at);

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX org_stats_idx
ON organization_stats (organization_id, month);

-- Refresh strategy (run via cron/trigger.dev)
REFRESH MATERIALIZED VIEW CONCURRENTLY organization_stats;
```

**Drizzle integration:**

```typescript
// Define as a table for querying
export const organizationStats = pgTable('organization_stats', {
  organizationId: uuid('organization_id').notNull(),
  activeCustomers: integer('active_customers').notNull(),
  leads: integer('leads').notNull(),
  totalCustomers: integer('total_customers').notNull(),
  month: timestamp('month', { withTimezone: true }).notNull(),
})

// Query materialized view
const stats = await db
  .select()
  .from(organizationStats)
  .where(eq(organizationStats.organizationId, orgId))
  .orderBy(desc(organizationStats.month))
  .limit(12) // Last 12 months
```

### Window Functions for Analytics

```typescript
// Running totals and rankings
const salesRankings = await db.execute(sql`
  SELECT
    s.id,
    s.name,
    SUM(o.total) as total_sales,
    RANK() OVER (ORDER BY SUM(o.total) DESC) as sales_rank,
    SUM(SUM(o.total)) OVER (ORDER BY SUM(o.total) DESC) as running_total,
    SUM(o.total) / SUM(SUM(o.total)) OVER () * 100 as percentage_of_total
  FROM salespeople s
  JOIN orders o ON o.salesperson_id = s.id
  WHERE o.organization_id = ${orgId}
    AND o.order_date >= ${startDate}
  GROUP BY s.id, s.name
`)

// Moving averages
const movingAverages = await db.execute(sql`
  SELECT
    DATE_TRUNC('day', order_date) as day,
    SUM(total) as daily_total,
    AVG(SUM(total)) OVER (
      ORDER BY DATE_TRUNC('day', order_date)
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as seven_day_avg
  FROM orders
  WHERE organization_id = ${orgId}
  GROUP BY DATE_TRUNC('day', order_date)
  ORDER BY day DESC
  LIMIT 30
`)
```

### Date Truncation for Time Series

```typescript
// Daily, weekly, monthly aggregations
type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export async function getRevenueTimeSeries(
  orgId: string,
  granularity: TimeGranularity,
  startDate: Date,
  endDate: Date
) {
  return db.execute(sql`
    SELECT
      DATE_TRUNC(${granularity}, order_date) as period,
      COUNT(*) as order_count,
      SUM(total) as revenue,
      AVG(total) as avg_order_value
    FROM orders
    WHERE organization_id = ${orgId}
      AND order_date >= ${startDate}
      AND order_date < ${endDate}
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY DATE_TRUNC(${granularity}, order_date)
    ORDER BY period ASC
  `)
}

// Generate complete time series (including zero-value periods)
export async function getCompleteTimeSeries(
  orgId: string,
  startDate: Date,
  endDate: Date
) {
  return db.execute(sql`
    WITH date_series AS (
      SELECT generate_series(
        DATE_TRUNC('day', ${startDate}::timestamp),
        DATE_TRUNC('day', ${endDate}::timestamp),
        '1 day'::interval
      ) as day
    )
    SELECT
      ds.day,
      COALESCE(COUNT(o.id), 0) as order_count,
      COALESCE(SUM(o.total), 0) as revenue
    FROM date_series ds
    LEFT JOIN orders o ON DATE_TRUNC('day', o.order_date) = ds.day
      AND o.organization_id = ${orgId}
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY ds.day
    ORDER BY ds.day
  `)
}
```

---

## Supabase-Specific Patterns

### Pooler Modes

Supabase offers two connection pooler modes. Choose based on your use case:

| Mode | Port | Use Case | Drizzle Config |
|------|------|----------|----------------|
| **Transaction** | 6543 | Serverless, short-lived connections | `prepare: false` required |
| **Session** | 5432 | Long-lived connections, prepared statements | `prepare: true` OK |

```typescript
// Transaction mode (serverless) - RECOMMENDED for TanStack Start
const transactionClient = postgres(
  process.env.DATABASE_URL!.replace(':5432/', ':6543/'), // Use pooler port
  { prepare: false } // CRITICAL: disable prepared statements
)

// Session mode (persistent servers)
const sessionClient = postgres(
  process.env.DATABASE_URL!,
  { prepare: true } // Can use prepared statements
)
```

### RLS Performance Implications

RLS adds query overhead. Optimize with these patterns:

```sql
-- 1. Use security definer functions for hot paths
CREATE OR REPLACE FUNCTION get_org_dashboard_stats(p_org_id uuid)
RETURNS TABLE (
  total_orders bigint,
  total_revenue numeric
)
LANGUAGE sql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
  SELECT
    COUNT(*),
    COALESCE(SUM(total), 0)
  FROM orders
  WHERE organization_id = p_org_id
    AND status NOT IN ('cancelled');
$$;

-- 2. Create efficient RLS policies
-- BAD: Subquery in every row check
CREATE POLICY bad_policy ON orders
  USING (organization_id IN (
    SELECT org_id FROM user_orgs WHERE user_id = auth.uid()
  ));

-- GOOD: Direct JWT claim check
CREATE POLICY good_policy ON orders
  USING (organization_id = (auth.jwt() ->> 'org_id')::uuid);

-- 3. Index columns used in RLS
CREATE INDEX orders_org_idx ON orders (organization_id);
```

**Drizzle bypass for server-side:**

```typescript
// Server function with admin client (bypasses RLS)
const adminClient = postgres(process.env.DATABASE_URL!, {
  prepare: false,
})
const adminDb = drizzle(adminClient)

export const getOrgStats = createServerFn({ method: 'GET' })
  .validator(z.object({ orgId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Validate authorization manually
    const session = await getSession()
    if (session.user.orgId !== data.orgId) {
      throw new Error('Unauthorized')
    }

    // Query without RLS overhead
    return adminDb.execute(sql`
      SELECT * FROM get_org_dashboard_stats(${data.orgId})
    `)
  })
```

### pg_stat_statements for Monitoring

Enable query performance monitoring:

```sql
-- Enable extension (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries
SELECT
  calls,
  mean_exec_time::numeric(10,2) as avg_ms,
  total_exec_time::numeric(10,2) as total_ms,
  rows,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Most frequent queries
SELECT
  calls,
  mean_exec_time::numeric(10,2) as avg_ms,
  query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Queries with high row counts (potential full scans)
SELECT
  calls,
  rows / NULLIF(calls, 0) as rows_per_call,
  query
FROM pg_stat_statements
WHERE rows / NULLIF(calls, 0) > 1000
ORDER BY rows_per_call DESC
LIMIT 10;

-- Reset stats (do periodically)
SELECT pg_stat_statements_reset();
```

**Automated monitoring helper:**

```typescript
// lib/db-monitor.ts
export async function getSlowQueries(minAvgMs: number = 100) {
  return db.execute(sql`
    SELECT
      calls,
      mean_exec_time::numeric(10,2) as avg_ms,
      total_exec_time::numeric(10,2) as total_ms,
      LEFT(query, 200) as query_preview
    FROM pg_stat_statements
    WHERE mean_exec_time > ${minAvgMs}
    ORDER BY mean_exec_time DESC
    LIMIT 20
  `)
}

export async function getMissingIndexSuggestions() {
  return db.execute(sql`
    SELECT
      schemaname,
      relname as table_name,
      seq_scan,
      seq_tup_read,
      idx_scan,
      seq_scan - idx_scan as diff
    FROM pg_stat_user_tables
    WHERE seq_scan > idx_scan
      AND seq_tup_read > 10000
    ORDER BY seq_tup_read DESC
    LIMIT 10
  `)
}
```

---

## Query Performance Checklist

Before deploying new queries:

- [ ] Run `EXPLAIN ANALYZE` on production-like data
- [ ] Verify indexes exist for WHERE/JOIN columns
- [ ] Check for Seq Scans on large tables
- [ ] Ensure N+1 patterns are resolved
- [ ] Use cursor pagination for lists >100 items
- [ ] Add `organization_id` first in composite indexes
- [ ] Test with RLS enabled
- [ ] Monitor via `pg_stat_statements` after deploy

---

## Anti-Patterns to Avoid

1. **Don't use OFFSET for deep pagination** - Use cursor/keyset instead
2. **Don't query without org filter** - Always scope to organization
3. **Don't SELECT *** - Only select needed columns for large tables
4. **Don't ignore EXPLAIN output** - Seq scans on large tables are red flags
5. **Don't forget prepare: false** - Required for Supabase pooler
6. **Don't create indexes blindly** - Each index slows writes
7. **Don't use RLS for hot paths** - Use security definer functions
8. **Don't skip connection pooling** - Use Supabase pooler or pgBouncer
