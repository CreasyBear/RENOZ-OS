# Schema & Query Trace-Through Standards

This document establishes a systematic framework for debugging data access, aggregation, and schema compliance issues in the Renoz v3 codebase. Use this as a replicable methodology for identifying and fixing similar problems.

**Last updated:** 2026-01-30

**Related:**
- [STANDARDS.md](./STANDARDS.md) - Codebase architecture patterns
- [CLAUDE.md](./CLAUDE.md) - Project overview and commands

---

## Table of Contents

1. [Trace-Through Methodology](#1-trace-through-methodology)
2. [Common Data Access Patterns](#2-common-data-access-patterns)
3. [Aggregation Patterns](#3-aggregation-patterns)
4. [Type Definition Standards](#4-type-definition-standards)
5. [Common Issues & Fixes](#5-common-issues--fixes)
6. [Audit Checklist](#6-audit-checklist)
7. [Quick Reference](#7-quick-reference)
8. [Null vs Undefined Policy](#8-null-vs-undefined-policy)
9. [Drizzle Query Best Practices](#9-drizzle-query-best-practices)
10. [Known Type Debt (@ts-expect-error)](#10-known-type-debt-tsexpect-error)

---

## 1. Trace-Through Methodology

### Systematic Data Flow Trace

When debugging data access or display issues, trace the complete data flow:

```
UI Component (Route/Component)
  ↓ uses hook
Hook (useQuery/useMutation)
  ↓ calls server function
Server Function (createServerFn)
  ↓ queries database
Database (PostgreSQL via Drizzle)
```

### Step-by-Step Process

#### Step 1: Problem Statement Analysis
- **What is the symptom?** (e.g., "showing zeros", "duplicate rows", "missing data")
- **What works?** (identify what's functioning to narrow scope)
- **What's the expected behavior?** (document expected vs actual)

#### Step 2: Standards Compliance Check
- Read `STANDARDS.md` to understand:
  - TanStack Query patterns (centralized keys, no direct `useQuery` in routes)
  - Data flow patterns (Route → Hook → Server → Database)
  - Return type patterns (server functions return data directly, not nested)
  - Type definition locations (types in `lib/schemas`, not inline)

#### Step 3: Top-Down Data Flow Trace

For each data path, verify:

1. **Route Component** (`routes/_authenticated/{domain}/*.tsx`)
   - How is data accessed? (`data?.property` vs `data?.data?.property`)
   - Are types imported from schemas?
   - Any inline type definitions?

2. **Hook** (`hooks/{domain}/*.ts`)
   - Uses centralized query keys?
   - Calls server function correctly?
   - Returns `useQuery` result directly?

3. **Server Function** (`server/functions/{domain}/*.ts`)
   - Return type matches hook expectation?
   - Data structure matches component access pattern?
   - Uses `db.select()` vs `db.execute()` correctly?
   - Handles snake_case → camelCase conversion?

4. **Database Query**
   - SQL returns expected columns?
   - Aggregation logic correct?
   - Filters applied correctly?

#### Step 4: Pattern Recognition

Identify common issues:
- **Data access**: TanStack Query returns server function results directly (not nested under `data`)
- **Raw SQL**: `db.execute()` returns snake_case columns that need explicit mapping
- **Type mismatches**: TypeScript types expect camelCase, but SQL returns snake_case
- **Aggregation**: Individual rows shown instead of aggregated by business key (productId+locationId)

#### Step 5: Cross-Reference Check

After fixing, search for similar patterns:
- Other `db.execute()` usages with same issue
- Other places accessing `?.data?.` when data should be direct
- Other snake_case/camelCase mismatches
- Other aggregation issues

#### Step 6: Validation

- Fix the immediate issue
- Check linter errors
- Verify type safety
- Ensure consistency with codebase patterns

---

## 2. Common Data Access Patterns

### Pattern: TanStack Query Data Access

**Correct:**
```typescript
// Hook returns useQuery result
const { data: movementData } = useMovements();

// Server function returns ListMovementsResult directly
// Route accesses: movementData?.movements
const movements = movementData?.movements ?? [];
```

**Incorrect:**
```typescript
// ❌ WRONG - TanStack Query doesn't nest under 'data'
const movements = movementData?.data?.movements ?? [];
```

**Why:** TanStack Query's `data` property contains the server function result directly. The server function return value IS the data.

### Pattern: db.execute() with Raw SQL

**Issue:** `db.execute()` with raw SQL returns snake_case columns, but TypeScript types expect camelCase.

**Correct:**
```typescript
// SQL returns snake_case
const result = await db.execute<{
  product_id: string;
  product_sku: string;
  product_name: string;
}>(sql`SELECT product_id, product_sku, product_name FROM ...`);

// Map to camelCase in return
return result.map((row) => ({
  productId: row.product_id,
  productSku: row.product_sku,
  productName: row.product_name,
}));
```

**Incorrect:**
```typescript
// ❌ WRONG - Type mismatch
const result = await db.execute<{
  productId: string;  // SQL returns product_id, not productId
  productSku: string;
}>(sql`SELECT product_id, product_sku FROM ...`);
```

**Why:** Drizzle's `casing: 'snake_case'` only applies to query builder (`db.select()`), not raw SQL (`db.execute()`).

### Pattern: db.select() vs db.execute()

**Use `db.select()` when:**
- Using Drizzle query builder
- Need automatic snake_case → camelCase conversion
- Working with schema-defined tables
- **Performing aggregations** (use Drizzle functions: `count()`, `sum()`, `avg()`)

**Use `db.execute()` when:**
- Complex SQL (CTEs, window functions, advanced aggregations)
- Need raw SQL performance
- Must manually map snake_case → camelCase
- **Only when Drizzle functions cannot express the query** (e.g., complex CASE expressions with OR conditions)

### Pattern: Drizzle Aggregation Functions

**CRITICAL:** Always use Drizzle's typed aggregation functions (`count()`, `sum()`, `avg()`) instead of raw SQL when possible.

#### COUNT Operations

**✅ CORRECT - Use Drizzle `count()`:**
```typescript
// ✅ CORRECT - Drizzle count() function
const result = await db
  .select({ value: count() })
  .from(orders)
  .where(whereClause);
```

**❌ INCORRECT - Raw SQL COUNT:**
```typescript
// ❌ WRONG - Use Drizzle count() instead
const result = await db
  .select({ value: sql<number>`COUNT(*)` })
  .from(orders)
  .where(whereClause);
```

**Why:** Drizzle's `count()` is type-safe, handles nulls correctly, and integrates with the query builder.

#### SUM Operations

**✅ CORRECT - Use Drizzle `sum()` with typed columns:**
```typescript
// ✅ CORRECT - Typed column access with sum()
const column = orders.total;  // Typed Drizzle column
const [row] = await db
  .select({ value: sum(column) })
  .from(orders)
  .where(whereClause);
const result = Number(row?.value ?? 0);  // Handle nulls in JS
```

**❌ INCORRECT - Raw SQL SUM:**
```typescript
// ❌ WRONG - Use Drizzle sum() instead
const result = await db
  .select({ value: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
  .from(orders)
  .where(whereClause);
```

**Why:** Drizzle's `sum()` provides type safety and better integration. Handle nulls in JavaScript with `?? 0`.

#### AVG Operations

**✅ CORRECT - Use Drizzle `avg()` with typed columns:**
```typescript
// ✅ CORRECT - Typed column access with avg()
const column = orders.total;
const [row] = await db
  .select({ value: avg(column) })
  .from(orders)
  .where(whereClause);
const result = Number(row?.value ?? 0);  // Handle nulls in JS
```

**❌ INCORRECT - Raw SQL AVG:**
```typescript
// ❌ WRONG - Use Drizzle avg() instead
const result = await db
  .select({ value: sql<number>`COALESCE(AVG(${orders.total}), 0)` })
  .from(orders)
  .where(whereClause);
```

#### Column Access Pattern

**✅ CORRECT - Typed column mapping:**
```typescript
// ✅ CORRECT - Map field names to typed columns
function getColumnForField(table: string, field: string): SQLWrapper {
  switch (table) {
    case 'orders':
      switch (field) {
        case 'total': return orders.total;      // ✅ Typed column
        case 'subtotal': return orders.subtotal; // ✅ Typed column
        default: throw new Error(`Unknown field: ${field}`);
      }
    case 'opportunities':
      switch (field) {
        case 'value': return opportunities.value;           // ✅ Typed column
        case 'weightedValue': return opportunities.weightedValue; // ✅ Typed column
        default: throw new Error(`Unknown field: ${field}`);
      }
  }
}

// Use in query
const column = getColumnForField('orders', 'total');
const [row] = await db
  .select({ value: sum(column) })
  .from(orders);
```

**❌ INCORRECT - Dynamic property access:**
```typescript
// ❌ WRONG - Dynamic property access loses type safety
const column = orders[metric.field as keyof typeof orders];  // ❌ No type safety
const result = await db
  .select({ value: sql<number>`SUM(${column})` })
  .from(orders);
```

**Why:** Typed column mapping provides:
- Compile-time type safety
- Clear error messages for invalid fields
- IDE autocomplete support
- No runtime property access errors

#### Conditional Aggregations

**✅ CORRECT - Drizzle `count()` with CASE expression:**
```typescript
// ✅ CORRECT - Drizzle count() with SQL template for CASE
const [result] = await db
  .select({
    won: count(sql`CASE WHEN ${opportunities.stage} = 'won' THEN 1 END`),
    total: count(sql`CASE WHEN ${opportunities.stage} IN ('won', 'lost') THEN 1 END`),
  })
  .from(opportunities)
  .where(whereClause);
```

**⚠️ ACCEPTABLE - Raw SQL for complex CASE expressions:**
```typescript
// ⚠️ ACCEPTABLE - Raw SQL only when Drizzle cannot express the pattern
// Example: CASE with OR condition (Drizzle doesn't support this directly)
const [result] = await db
  .select({
    total: count(),  // ✅ Use Drizzle where possible
    breached: sql<number>`SUM(CASE WHEN ${slaTracking.responseBreached} OR ${slaTracking.resolutionBreached} THEN 1 ELSE 0 END)`,
  })
  .from(slaTracking)
  .where(whereClause);
```

**Guideline:** Use raw SQL only when Drizzle functions cannot express the query pattern. Always prefer Drizzle functions.

#### Null Handling Pattern

**✅ CORRECT - Handle nulls in JavaScript:**
```typescript
// ✅ CORRECT - Drizzle functions return nullable results
const [row] = await db
  .select({ value: sum(orders.total) })
  .from(orders)
  .where(whereClause);

// Handle nulls in JavaScript (not SQL COALESCE)
const result = Number(row?.value ?? 0);
```

**Why:** Drizzle aggregation functions return `null` when no rows match. Handle this in JavaScript for consistency and type safety.

#### Join Patterns

**✅ CORRECT - Drizzle functions in joins:**
```typescript
// ✅ CORRECT - sum() with typed column in LEFT JOIN
const [result] = await db
  .select({
    total: sum(orders.total),  // ✅ Typed column
  })
  .from(warranties)
  .leftJoin(orders, eq(warranties.orderId, orders.id))
  .where(
    and(
      whereClause,
      eq(orders.organizationId, organizationId),  // ✅ Security filter
      isNull(orders.deletedAt)  // ✅ Soft delete filter
    )
  );

// Handle nulls
const value = Number(result?.total ?? 0);
```

**Security:** Always filter joined tables by `organizationId` and `deletedAt` for multi-tenant isolation.

---

## 3. Aggregation Patterns

### Pattern: Aggregating by Business Key

**Problem:** Database returns individual rows (e.g., cost layers), but UI needs aggregated view (e.g., by product SKU + location).

**Example: Aging Items**

**Before (Individual Rows):**
```typescript
// Returns 10 cost layers for same product
items: [
  { productSku: 'LV-5KWH100AH', quantity: 1, ... },
  { productSku: 'LV-5KWH100AH', quantity: 1, ... },
  // ... 8 more rows
]
```

**After (Aggregated):**
```typescript
// Returns 1 aggregated row
items: [
  { productSku: 'LV-5KWH100AH', quantity: 10, ... }
]
```

**Aggregation Logic:**
```typescript
// Group by productId + locationId
const aggregatedMap = new Map<string, AggregatedItem>();

items.forEach((item) => {
  const key = `${item.productId}-${item.locationId}`;
  const existing = aggregatedMap.get(key);
  
  if (existing) {
    // Aggregate: sum quantities, sum values, track oldest date, highest risk
    existing.totalQuantity += item.quantity;
    existing.totalValue += item.value;
    existing.weightedAverageCost = existing.totalValue / existing.totalQuantity;
    if (item.receivedAt < existing.oldestReceivedAt) {
      existing.oldestReceivedAt = item.receivedAt;
    }
    // Update to highest risk level
    if (riskLevel(item) > riskLevel(existing.highestRisk)) {
      existing.highestRisk = item.risk;
    }
  } else {
    // Create new aggregated item
    aggregatedMap.set(key, { ...item });
  }
});

return Array.from(aggregatedMap.values());
```

### Pattern: Counting Aggregated Items

**Problem:** Counting individual rows instead of unique business entities.

**Before:**
```typescript
// Counts cost layers (647)
totalItems: aging.length
```

**After:**
```typescript
// Counts unique product+location combinations
const uniqueKeys = new Set(
  aging.map(item => `${item.productId}-${item.locationId}`)
);
totalItems: uniqueKeys.size
```

### Aggregation Rules

1. **Identify Business Key**: What uniquely identifies an aggregated entity?
   - Product + Location: `productId + locationId`
   - Product only: `productId`
   - Customer + Period: `customerId + period`

2. **Choose Aggregation Functions**:
   - Quantities: `SUM(quantity)`
   - Values: `SUM(quantity * unitCost)`
   - Costs: Weighted average `SUM(value) / SUM(quantity)`
   - Dates: `MIN(receivedAt)` (oldest) or `MAX(createdAt)` (newest)
   - Risk: Highest level in group

3. **Preserve Required Fields**: Ensure aggregated items include all fields needed by UI components.

---

## 4. Type Definition Standards

### CRITICAL RULE: Types Must Be in Type Files, NOT Component Files

**All types MUST be defined in schema/type files (`src/lib/schemas/`), NEVER in component files (routes, components, hooks).**

**Violation:**
```typescript
// ❌ WRONG - Type defined in component file
// routes/inventory/counts.tsx
type StockCountItemWithRelations = StockCountItem & {
  inventory?: { /* ... */ } | null;
};

// ❌ WRONG - Inline type in route file
const typeCounts: Record<string, { count: number; units: number; value: number }> = {};
```

**Correct:**
```typescript
// ✅ CORRECT - Type in schema file
// src/lib/schemas/inventory/inventory.ts
export interface StockCountItemWithRelations extends StockCountItem {
  inventory?: { /* ... */ } | null;
}

export interface MovementTypeCount {
  count: number;
  units: number;
  value: number;
}

// ✅ CORRECT - Import and use in route file
// routes/inventory/counts.tsx
import type { StockCountItemWithRelations, MovementTypeCount } from '@/lib/schemas/inventory';
const typeCounts: Record<string, MovementTypeCount> = {};
```

**Rationale:**
- Types are shared across multiple files and must be centralized
- Single source of truth for type definitions
- Easier maintenance and refactoring
- Better IDE support and type checking
- Prevents type duplication and inconsistencies

### Type Definition Locations

| Type Category | Location | Example |
|--------------|----------|---------|
| **Domain Types** | `lib/schemas/{domain}/{entity}.ts` | `Customer`, `Order`, `Product` |
| **Query Types** | `lib/schemas/{domain}/{entity}.ts` | `CustomerListQuery`, `OrderFilters` |
| **Response Types** | `lib/schemas/{domain}/{entity}.ts` | `ListCustomersResult`, `InventoryValuationResult` |
| **Aggregation Types** | `lib/schemas/{domain}/{entity}.ts` | `MovementTypeCount`, `AggregatedAgingItem` |
| **Relation Types** | `lib/schemas/{domain}/{entity}.ts` | `StockCountItemWithRelations`, `MovementWithRelations` |
| **UI State Types** | Route file (simple unions only) | `type Tab = 'a' \| 'b'` (OK for simple local state) |

### ServerFn Serialization Boundary

**When types cross the ServerFn boundary** (createServerFn input/output), TanStack Start serializes to JSON. The framework infers `{ [x: string]: {} }` for object values in generic JSON fields. This conflicts with `Record<string, unknown>` because `unknown` is not assignable to `{}` in the inferred return type.

**Fix at the schema level** using a wire-type pattern:

1. **Define wire types** for data that crosses ServerFn boundaries (metadata, filters, arbitrary JSON).
2. **Use `z.record(z.string(), z.any())`** in Zod schemas for flexible JSON fields—produces `{ [key: string]: any }` which satisfies both `unknown` and `{}`.
3. **Add explicit return types** to server handlers when the inferred type conflicts with domain types.
4. **Domain types** (e.g. `CustomerFiltersState`) remain the source of truth for UI; wire types bridge the boundary.

```typescript
// lib/schemas/_shared/patterns.ts
export const flexibleJsonSchema = z.record(z.string(), z.any());
export type FlexibleJson = z.infer<typeof flexibleJsonSchema>;  // { [key: string]: any }

// Domain type (UI layer)
export interface CustomerFiltersState extends Record<string, unknown> {
  search: string;
  status: CustomerStatus[];
  // ...
}

// Wire type (ServerFn boundary)
export interface SavedCustomerFilterWire {
  id: string;
  name: string;
  filters: FlexibleJson;  // Satisfies ServerFn inference
  createdAt: Date;
  updatedAt: Date;
}
```

**See:** `docs/design-system/FILTER-STANDARDS.md` §9 Type System Adjustments, `STANDARDS.md` §3 Hook Patterns.

### When to Extract Types

**Extract to schema when:**
- Type is used in multiple files
- Type represents domain data structure
- Type is part of API contract (server ↔ client)
- Type has complex structure (objects, arrays, nested)

**Keep inline when:**
- Simple union type for UI state (`type Tab = 'a' | 'b'`)
- Truly local to single component
- Temporary transformation type

---

## 5. Common Issues & Fixes

### Issue 1: Data Access Path Mismatch

**Symptom:** Data shows as `undefined` or `null` when it should exist.

**Root Cause:** Accessing nested `data` property that doesn't exist.

**Fix:**
```typescript
// Before
const movements = movementData?.data?.movements ?? [];

// After
const movements = movementData?.movements ?? [];
```

**Verification:**
1. Check server function return type
2. Verify hook returns `useQuery` result
3. Confirm route accesses `data` property directly

### Issue 2: Snake_Case vs CamelCase Mismatch

**Symptom:** Properties are `undefined` even though SQL query returns data.

**Root Cause:** SQL returns snake_case, but code expects camelCase.

**Fix:**
```typescript
// Before
const result = await db.execute<{
  productId: string;  // ❌ Wrong - SQL returns product_id
}>(sql`SELECT product_id FROM ...`);

// After
const result = await db.execute<{
  product_id: string;  // ✅ Match SQL column names
}>(sql`SELECT product_id FROM ...`);

// Then map to camelCase
return result.map(row => ({
  productId: row.product_id,  // ✅ Explicit mapping
}));
```

**Verification:**
1. Check SQL column names (snake_case)
2. Verify TypeScript type matches SQL
3. Map snake_case → camelCase in return statement

### Issue 3: Duplicate Rows (No Aggregation)

**Symptom:** Same product appears multiple times with quantity 1 each.

**Root Cause:** Returning individual database rows instead of aggregating by business key.

**Fix:**
```typescript
// Before - Individual rows
items: itemsInBucket.slice(0, 10).map(item => ({ ...item }))

// After - Aggregated by product+location
const aggregated = aggregateByProductLocation(itemsInBucket);
items: aggregated.slice(0, 10)
```

**Verification:**
1. Identify business key (productId+locationId, productId, etc.)
2. Group rows by business key
3. Aggregate quantities, values, dates, risk levels
4. Return aggregated array

### Issue 4: Incorrect Item Counts

**Symptom:** "Total Items: 647" but should be much less (unique products).

**Root Cause:** Counting database rows instead of unique entities.

**Fix:**
```typescript
// Before
totalItems: aging.length  // Counts cost layers

// After
const uniqueKeys = new Set(
  aging.map(item => `${item.productId}-${item.locationId}`)
);
totalItems: uniqueKeys.size  // Counts unique combinations
```

**Verification:**
1. Identify what "item" means in business context
2. Count unique business keys, not database rows
3. Use `Set` or `Map` to track uniqueness

### Issue 5: Inline Type Definitions

**Symptom:** Linter warnings about inline types, violates STANDARDS.md.

**Root Cause:** Types defined inline instead of in schema files.

**Fix:**
```typescript
// Before - Inline in route file
const typeCounts: Record<string, { count: number; units: number }> = {};

// After - Type in schema file
// In lib/schemas/inventory/inventory.ts
export interface MovementTypeCount {
  count: number;
  units: number;
}

// In route file
import type { MovementTypeCount } from '@/lib/schemas/inventory';
const typeCounts: Record<string, MovementTypeCount> = {};
```

**Verification:**
1. Search for inline `Record<>`, `Array<>`, object types
2. Extract to schema file
3. Import in route/component file

---

## 6. Audit Checklist

Use this checklist when debugging data access or aggregation issues:

### Data Access Audit

- [ ] **Route Component**
  - [ ] Accesses `data?.property` (not `data?.data?.property`)
  - [ ] Types imported from schemas (not inline)
  - [ ] Handles `undefined`/`null` correctly

- [ ] **Hook**
  - [ ] Uses centralized query keys from `@/lib/query-keys`
  - [ ] Calls server function correctly
  - [ ] Returns `useQuery` result directly

- [ ] **Server Function**
  - [ ] Return type matches hook expectation
  - [ ] Data structure matches component access
  - [ ] Uses correct query method (`db.select()` vs `db.execute()`)
  - [ ] Maps snake_case → camelCase if using `db.execute()`
  - [ ] Uses Drizzle aggregation functions (`count()`, `sum()`, `avg()`) instead of raw SQL
  - [ ] Uses typed column access (not dynamic property access)
  - [ ] Handles nulls correctly (JavaScript `?? 0` pattern)

- [ ] **Database Query**
  - [ ] SQL returns expected columns
  - [ ] Aggregation logic correct (if needed)
  - [ ] Filters applied correctly

### Aggregation Audit

- [ ] **Business Key Identified**
  - [ ] What uniquely identifies an aggregated entity?
  - [ ] Is aggregation needed? (individual rows vs business entities)

- [ ] **Aggregation Logic**
  - [ ] Quantities summed correctly
  - [ ] Values summed correctly
  - [ ] Weighted averages calculated
  - [ ] Dates tracked (oldest/newest as needed)
  - [ ] Risk levels aggregated (highest in group)

- [ ] **Item Counts**
  - [ ] Counts unique entities, not database rows
  - [ ] Uses `Set` or `Map` for uniqueness tracking

### Type Definition Audit

- [ ] **No Inline Types**
  - [ ] No `Record<string, { ... }>` inline
  - [ ] No `Array<{ ... }>` inline
  - [ ] No object types inline in route files

- [ ] **Types in Schemas**
  - [ ] Complex types in `lib/schemas/{domain}/`
  - [ ] Exported from schema barrel (`index.ts`)
  - [ ] Imported in route/component files

---

## 7. Quick Reference

### Data Flow Trace Commands

```bash
# Find where data is accessed
grep -r "data\?\.data\." src/routes

# Find db.execute() usages
grep -r "db\.execute" src/server/functions

# Find inline type definitions
grep -r "Record<.*{" src/routes
grep -r ": \{" src/routes | grep -v "import\|export\|function\|const\|let"

# Find aggregation issues (individual rows)
grep -r "\.map((item)" src/server/functions | grep -v "aggregate"
```

### Common Fixes

| Issue | Pattern | Fix |
|-------|---------|-----|
| Data undefined | `data?.data?.property` | `data?.property` |
| Properties undefined | SQL snake_case, code camelCase | Map snake_case → camelCase |
| Duplicate rows | Individual DB rows shown | Aggregate by business key |
| Wrong count | `array.length` | `new Set(array.map(key)).size` |
| Inline types | `Record<string, {...}>` | Extract to schema file |
| Raw SQL aggregations | `sql\`SUM(...)\`` | Use `sum(column)` with typed column |
| Dynamic column access | `orders[field]` | Use typed column mapping function |
| Null handling in SQL | `COALESCE(SUM(...), 0)` | Use `sum(column)` + JS `?? 0` |

### Verification Steps

1. **Check return type**: `grep -A 5 "return \{" src/server/functions/{domain}/*.ts`
2. **Check data access**: `grep "data\?\.\w" src/routes/{domain}/*.tsx`
3. **Check aggregation**: `grep -A 10 "items:" src/server/functions/{domain}/*.ts`
4. **Check types**: `grep "interface\|type" src/lib/schemas/{domain}/*.ts`

---

## 8. Null vs Undefined Policy

**DB → Server:** The database returns `null` for optional columns (JSONB, text, etc.). The server should normalize to the schema contract before returning. Use `normalizeProductRow` or similar helpers in `lib/schemas/*/normalize.ts`.

**Schema output:** Use `.nullable().default(null)` for optional fields that may be absent, so output is `T | null` rather than `T | undefined`.

**Coercion at boundary only:** When the schema cannot be changed, normalize at the explicit API boundary (e.g. server handler return, or a single `normalizeForView` in the container). Avoid ad-hoc `?? null` scattered in views.

---

## Examples

### Example 1: Movements Data Access Fix

**Problem:** Movements tab showing zeros.

**Trace:**
1. Route: `analytics.tsx:255` - accesses `movementData?.data?.movements`
2. Hook: `use-inventory.ts:324` - returns `useQuery` result
3. Server: `inventory.ts:834` - returns `ListMovementsResult` with `movements` at top level
4. **Issue:** Route expected nested `data.movements`, but server returns `movements` directly

**Fix:**
```typescript
// Before
const movements = (movementData?.data?.movements ?? []);

// After
const movements = (movementData?.movements ?? []);
```

### Example 2: Turnover Column Name Mismatch

**Problem:** Turnover by category showing "No category data".

**Trace:**
1. Route: `analytics.tsx:217` - accesses `turnoverData?.byProduct`
2. Hook: `use-valuation.ts:126` - returns `useQuery` result
3. Server: `valuation.ts:644` - uses `db.execute()` with raw SQL
4. **Issue:** SQL returns `product_id` (snake_case), but code expected `productId` (camelCase)

**Fix:**
```typescript
// Before
const turnoverByProduct = await db.execute<{
  productId: string;  // ❌ Wrong
}>(sql`SELECT product_id FROM ...`);

// After
const turnoverByProduct = await db.execute<{
  product_id: string;  // ✅ Match SQL
}>(sql`SELECT product_id FROM ...`);

// Map in return
byProduct: turnoverByProduct.map(p => ({
  productId: p.product_id,  // ✅ Explicit mapping
  ...
}))
```

### Example 3: Aging Items Aggregation

**Problem:** Same product showing 10+ times with qty 1 each.

**Trace:**
1. Route: `analytics.tsx:169` - receives individual cost layers
2. Server: `valuation.ts:513` - returns individual cost layers
3. **Issue:** Cost layers are individual rows, but UI needs aggregated by product+location

**Fix:**
```typescript
// Before - Individual rows
items: itemsInBucket.slice(0, 10).map(item => ({ ...item }))

// After - Aggregated
const aggregatedMap = new Map<string, AggregatedAgingItem>();
itemsInBucket.forEach(item => {
  const key = `${item.productId}-${item.locationId}`;
  const existing = aggregatedMap.get(key);
  if (existing) {
    existing.totalQuantity += item.quantityRemaining;
    existing.totalValue += item.quantityRemaining * Number(item.unitCost);
    // ... aggregate other fields
  } else {
    aggregatedMap.set(key, { ...item });
  }
});
items: Array.from(aggregatedMap.values()).slice(0, 10)
```

---

---

## 9. Drizzle Query Best Practices

### Aggregation Function Checklist

When writing aggregation queries, verify:

- [ ] **Using Drizzle functions**: `count()`, `sum()`, `avg()` instead of raw SQL
- [ ] **Typed columns**: Column access via typed Drizzle columns (not dynamic)
- [ ] **Null handling**: JavaScript `?? 0` pattern (not SQL COALESCE)
- [ ] **Type safety**: Column mapping function for dynamic field access
- [ ] **Raw SQL justification**: Only use raw SQL when Drizzle cannot express the pattern

### Query Pattern Decision Tree

```
Need aggregation?
├─ Yes → Can use Drizzle function?
│   ├─ Yes → Use count()/sum()/avg() with typed column
│   └─ No → Use raw SQL (justify in comment)
└─ No → Use db.select() with column selection

Need dynamic field access?
├─ Yes → Create column mapping function
│   └─ Map field names to typed columns
└─ No → Use typed column directly

Need null handling?
├─ Yes → Handle in JavaScript (?? 0)
└─ No → Use result directly
```

### Example: Complete Aggregation Pattern

```typescript
// ✅ CORRECT - Complete pattern with all best practices

// 1. Column mapping function (typed access)
function getColumnForField(table: string, field: string): SQLWrapper {
  switch (table) {
    case 'orders':
      switch (field) {
        case 'total': return orders.total;
        case 'subtotal': return orders.subtotal;
        default: throw new Error(`Unknown field: ${field}`);
      }
  }
}

// 2. Query with Drizzle aggregation
async function calculateMetric(organizationId: string, metricId: string) {
  const metric = getMetric(metricId);
  const column = getColumnForField(metric.table, metric.field);
  
  // 3. Use Drizzle sum() with typed column
  const [row] = await db
    .select({ value: sum(column) })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, organizationId),  // ✅ Security
        isNull(orders.deletedAt)  // ✅ Soft delete
      )
    );
  
  // 4. Handle nulls in JavaScript
  return {
    value: Number(row?.value ?? 0),  // ✅ Null handling
    metricId,
    calculatedAt: new Date(),
  };
}
```

---

## 10. Known Type Debt (@ts-expect-error)

Several ServerFn handlers use `@ts-expect-error` to work around type mismatches. Documenting the pattern here for future remediation.

### Root Cause

- **JSONB / Record mismatch:** PostgreSQL JSONB columns return `Record<string, unknown>`. TanStack Start ServerFn inference expects schema types like `{ [x: string]: {} }`. The index signature `[x: string]: {}` is stricter than `Record<string, unknown>` (unknown is not assignable to {}).
- **TanStack Start ServerFn inference:** Explicit return type annotations on handlers sometimes conflict with inferred ServerFn types, requiring `@ts-expect-error`.

### Affected Files

| File | Count | Reason |
|------|-------|--------|
| `server/functions/orders/order-amendments.ts` | 8 | `changes.before` Record vs schema; ServerFn inference |
| `server/functions/settings/custom-fields.ts` | 7 | Complex return types |
| `server/functions/communications/email-campaigns.ts` | 6 | `recipientCriteria.customFilters` Record vs schema |

### Planned Fix (Future)

1. **Schema alignment:** Relax schema types for JSONB fields to accept `Record<string, unknown>` and validate at runtime.
2. **Shared JSONB handling:** Create a `flexibleJsonSchema` or similar that maps DB JSONB to a permissive schema type.
3. **TanStack Start:** Track framework updates for improved ServerFn type inference.

---

**Document Version:** 2026-01-30  
**Last Updated:** After Drizzle aggregation refactoring (metrics aggregator)
