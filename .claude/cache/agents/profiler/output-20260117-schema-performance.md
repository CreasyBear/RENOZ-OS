# Performance Analysis: Schema Foundation Database Layer
Generated: 2026-01-17

## Executive Summary
- **Bottleneck Type:** Index Coverage / Query Pattern Mismatches
- **Current Performance:** Unknown (no metrics provided, static analysis only)
- **Expected Improvement:** 2-10x for identified query patterns with proper indexing

## Findings by Priority

---

### CRITICAL: Missing Composite Index for Cursor Pagination

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/customers.ts:113-116`
**Type:** Missing Index
**Impact:** Table scans on pagination queries as dataset grows

**Evidence:**
The cursor pagination (`getCustomersCursor` in `customers.ts`) orders by:
```typescript
// src/server/customers.ts:153
.orderBy(orderDirection(customers.createdAt), orderDirection(customers.id))
```

And applies cursor condition:
```typescript
// src/lib/db/pagination.ts:132-140
or(
  sql`${createdAtColumn} < ${cursorDate}`,
  and(
    sql`${createdAtColumn} = ${cursorDate}`,
    sql`${idColumn} < ${cursor.id}`
  )
)
```

But the existing index is:
```typescript
// customers.ts:113-116
orgCreatedIdx: index("idx_customers_org_created").on(
  table.organizationId,
  table.createdAt,  // Missing: id column!
),
```

**Problem:** For cursor pagination to be efficient, the index MUST include `(organizationId, createdAt, id)` - all three columns. Without `id` in the index, the tie-breaker comparison forces a table scan.

**Missing Index:**
```typescript
// Needed for efficient cursor pagination
orgCreatedIdIdx: index("idx_customers_org_created_id").on(
  table.organizationId,
  table.createdAt,
  table.id,
),
```

**Expected Improvement:** 5-10x on paginated list queries with 10k+ records

---

### CRITICAL: Same Issue on All Tables with Cursor Pagination Potential

**Affected Tables:**
| Table | Current Index | Missing Column |
|-------|---------------|----------------|
| `customers` | `(org_id, created_at)` | `id` |
| `orders` | `(org_id, order_date)` | `id` |
| `activities` | `(org_id, created_at)` | `id` |
| `inventory_movements` | `(org_id, created_at)` | `id` |
| `email_history` | `(org_id, created_at)` | `id` |
| `notifications` | `(user_id, created_at)` | `id` |

**All cursor-paginated list endpoints will suffer degraded performance.**

---

### HIGH: N+1 Query Risk in getCustomerById

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/customers.ts:163-188`
**Type:** N+1 Query Pattern
**Impact:** 2 queries instead of 1 for every customer detail view

**Evidence:**
```typescript
// src/server/customers.ts:168-182
const result = await db
  .select()
  .from(customers)
  .where(and(eq(customers.id, id), sql`${customers.deletedAt} IS NULL`))
  .limit(1);

// Separate query for contacts
const customerContacts = await db
  .select()
  .from(contacts)
  .where(eq(contacts.customerId, id));
```

**Optimization:** Use Drizzle's `with` clause or a JOIN:
```typescript
const result = await db.query.customers.findFirst({
  where: and(eq(customers.id, id), sql`${customers.deletedAt} IS NULL`),
  with: {
    contacts: true,
  },
});
```

**Expected Improvement:** 50% reduction in latency (1 query vs 2)

---

### HIGH: Missing GIN Index on JSONB Tags Column

**Location:** Multiple schema files
**Type:** Missing Index
**Impact:** Full table scan on tag-based filtering

**Evidence:**
Several tables have `tags` JSONB columns but no GIN index:
- `customers.tags` (customers.ts:88)
- `products.tags` (products.ts:108)
- `opportunities.tags` (pipeline.ts:80)

**Currently:** `WHERE tags @> '["vip"]'` requires full table scan.

**Missing Indexes:**
```typescript
// In customers.ts
tagsGinIdx: index("idx_customers_tags_gin").using("gin", table.tags),

// In products.ts
tagsGinIdx: index("idx_products_tags_gin").using("gin", table.tags),

// In pipeline.ts
tagsGinIdx: index("idx_opportunities_tags_gin").using("gin", table.tags),
```

**Expected Improvement:** 10-100x on tag filtering queries

---

### MEDIUM: Offset Pagination Still Present (Legacy)

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/customers.ts:32-93`
**Type:** Inefficient Algorithm
**Impact:** O(n) skip cost for deep pages

**Evidence:**
```typescript
// src/server/customers.ts:72
.offset(offset);
```

The legacy `getCustomers` function uses offset pagination. For page 100 with pageSize 20, Postgres must scan and discard 2000 rows.

**Recommendation:** Deprecate and remove once cursor pagination is fully adopted. The cursor version (`getCustomersCursor`) is already implemented.

---

### MEDIUM: Missing Index for Multi-Column Filter Combinations

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/customers.ts:44-55`
**Type:** Suboptimal Index Coverage

**Evidence:**
Common query pattern filters by multiple columns:
```typescript
if (status) conditions.push(eq(customers.status, status));
if (type) conditions.push(eq(customers.type, type));
if (size) conditions.push(eq(customers.size, size));
```

Current indexes:
- `idx_customers_org_status` - covers (org_id, status)

Missing composite for common combinations:
```typescript
// If users frequently filter by status + type
orgStatusTypeIdx: index("idx_customers_org_status_type").on(
  table.organizationId,
  table.status,
  table.type,
),
```

**Expected Improvement:** 2-5x on filtered list queries (requires query pattern analysis to confirm common filter combos)

---

### MEDIUM: Full-Text Search Missing on Description Fields

**Location:** Various schema files
**Type:** Missing Index

**Evidence:**
Full-text search indexes exist on `name` fields but not `description`:
- `products.description` - no GIN index
- `opportunities.description` - no GIN index

If users search product descriptions, this will be a sequential scan.

**Missing Index:**
```typescript
// In products.ts
descSearchIdx: index("idx_products_desc_search").using(
  "gin",
  fullTextSearchSql(table.description)
),
```

---

### LOW: Connection Pool Sizing

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/db/index.ts:34-44`
**Type:** Configuration

**Evidence:**
```typescript
const client = postgres(connectionString, {
  prepare: false,  // Required for Supabase Transaction mode
  max: 10,         // Pool size
  idle_timeout: 20,
});
```

**Analysis:**
- `max: 10` is reasonable for a small-medium app
- Supabase free tier allows 60 connections
- `prepare: false` is required but disables prepared statement caching (minor perf hit)

**Recommendation:** Monitor connection pool utilization. Scale to `max: 20-30` if seeing connection wait times.

---

### LOW: Potential Table Scan on Soft Delete Filter

**Location:** All tables with `deletedAt` column
**Type:** Filter Efficiency

**Evidence:**
Common pattern:
```typescript
conditions.push(sql`${customers.deletedAt} IS NULL`);
```

Partial indexes on unique constraints do include this:
```typescript
.where(sql`${table.email} IS NOT NULL AND ${table.deletedAt} IS NULL`)
```

But general queries might benefit from a partial index on active records:
```typescript
// Only if queries rarely need deleted records
orgActiveIdx: index("idx_customers_org_active").on(
  table.organizationId,
).where(sql`${table.deletedAt} IS NULL`),
```

---

## JSONB Query Performance Analysis

### Current State
- `addresses`, `preferences`, `metadata` columns use JSONB
- NO GIN indexes on these columns

### Risk Assessment
| Column | Risk Level | Reason |
|--------|------------|--------|
| `tags` | HIGH | Likely filtered with `@>` operator |
| `addresses` | LOW | Probably not queried, just stored |
| `preferences` | LOW | Probably not filtered |
| `metadata` | MEDIUM | May be searched for custom fields |

### Recommendations
1. **Definitely add:** GIN index on `tags` columns
2. **Consider adding:** GIN index on `metadata` if custom field search is needed
3. **Skip for now:** `addresses`, `preferences` (not typically queried)

---

## Connection Pooling Analysis

### Current Configuration
```typescript
{
  prepare: false,  // Supabase PgBouncer requirement
  max: 10,
  idle_timeout: 20,
}
```

### Supabase Context
- Using Transaction mode (port 6543) via PgBouncer
- Prepared statements disabled (required)
- Connection multiplexing in effect

### Recommendations
| Metric | Current | Suggested |
|--------|---------|-----------|
| `max` | 10 | 10-20 (monitor first) |
| `idle_timeout` | 20s | 20s (good) |

Monitor with:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_db';
```

---

## Recommendations Summary

### Quick Wins (Low effort, high impact)
1. **Add composite cursor pagination indexes** - Critical for list performance
   - `(organizationId, createdAt, id)` on customers, orders, activities, etc.
2. **Add GIN indexes on tags columns** - Enables efficient tag filtering
3. **Use Drizzle relations** for customer+contacts query - Reduces N+1

### Medium-term (Higher effort)
1. Analyze actual query patterns to identify filter column combinations
2. Add targeted composite indexes based on real usage
3. Consider full-text search on description fields if needed

### Architecture Considerations
1. Deprecate offset pagination endpoint once cursor is stable
2. Monitor connection pool utilization as traffic grows
3. Consider read replicas for heavy reporting queries

---

## Index Recommendations Summary

```typescript
// customers.ts - ADD:
orgCreatedIdIdx: index("idx_customers_org_created_id").on(
  table.organizationId, table.createdAt, table.id
),
tagsGinIdx: index("idx_customers_tags_gin").using("gin", table.tags),

// products.ts - ADD:
orgCreatedIdIdx: index("idx_products_org_created_id").on(
  table.organizationId, table.createdAt, table.id
),
tagsGinIdx: index("idx_products_tags_gin").using("gin", table.tags),

// orders.ts - ADD:
orgDateIdIdx: index("idx_orders_org_date_id").on(
  table.organizationId, table.orderDate, table.id
),

// pipeline.ts - ADD:
orgCreatedIdIdx: index("idx_opportunities_org_created_id").on(
  table.organizationId, table.createdAt, table.id
),
tagsGinIdx: index("idx_opportunities_tags_gin").using("gin", table.tags),

// activities.ts - ADD:
timelineIdIdx: index("idx_activities_timeline_id").on(
  table.organizationId, table.createdAt, table.id
),

// notifications.ts - ADD:
userCreatedIdIdx: index("idx_notifications_user_created_id").on(
  table.userId, table.createdAt, table.id
),

// email_history.ts - ADD:
orgCreatedIdIdx: index("idx_email_history_org_created_id").on(
  table.organizationId, table.createdAt, table.id
),

// inventory.ts (movements) - ADD:
orgCreatedIdIdx: index("idx_movements_org_created_id").on(
  table.organizationId, table.createdAt, table.id
),
```

---

## Files Analyzed

| File | Path |
|------|------|
| DB Client | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/db/index.ts` |
| Pagination | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/db/pagination.ts` |
| Customers Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/customers.ts` |
| Orders Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/orders.ts` |
| Products Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/products.ts` |
| Pipeline Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/pipeline.ts` |
| Activities Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/activities.ts` |
| Inventory Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/inventory.ts` |
| Notifications Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/notifications.ts` |
| Email History Schema | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/email-history.ts` |
| Customers Server | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/customers.ts` |
| Users Server | `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/users.ts` |
