---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, performance, sprint-review]
dependencies: []
---

# Sequential Database Queries (N+1 Pattern Risk)

## Problem Statement

PDF generation jobs make 5-6 sequential database queries per document, adding 300-600ms latency. At scale (100+ concurrent generations), this creates database connection pool pressure.

## Findings

**Source:** Performance Oracle Agent

**Current Pattern (generate-invoice-pdf.tsx):**
```typescript
// Query 1: Fetch order
const [order] = await db.select({...}).from(orders).where(...);

// Query 2: Fetch line items
const lineItems = await db.select({...}).from(orderLineItems).where(...);

// Query 3: Fetch organization
const [org] = await db.select({...}).from(organizations).where(...);

// Query 4: Fetch customer
const [customer] = await db.select({...}).from(customers).where(...);

// Query 5: Fetch billing address
const [billingAddress] = await db.select({...}).from(addresses).where(...);
```

**Impact:**
- 50-100ms per query = 300-600ms total
- 100 concurrent generations = 500-600 connections

## Proposed Solutions

### Option A: Parallel fetching with Promise.all (Recommended)
**Pros:** Simple, 60-70% latency reduction
**Cons:** Minor code reorganization
**Effort:** Medium (4 hours)
**Risk:** Low

```typescript
const [orderWithItems, org, customerWithAddress] = await Promise.all([
  db.select({...}).from(orders)
    .leftJoin(orderLineItems, eq(orderLineItems.orderId, orders.id))
    .where(...),
  db.select({...}).from(organizations).where(...),
  db.select({...}).from(customers)
    .leftJoin(addresses, eq(addresses.customerId, customers.id))
    .where(...),
]);
```

### Option B: Single query with multiple JOINs
**Pros:** Single round-trip
**Cons:** Complex query, data mapping
**Effort:** High (8 hours)
**Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:** All 7 generate-*.tsx jobs
**Expected gain:** 60-70% reduction in DB query time

## Acceptance Criteria

- [ ] Database queries run in parallel where possible
- [ ] No N+1 patterns in generation jobs
- [ ] Generation time reduced measurably
- [ ] Connection pool usage stable under load

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Performance analysis from Performance Oracle agent
