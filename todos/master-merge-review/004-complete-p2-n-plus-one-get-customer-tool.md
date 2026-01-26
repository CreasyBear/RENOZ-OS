---
status: complete
priority: p2
issue_id: "MMR-004"
tags: [performance, n-plus-one, ai-tools, database]
dependencies: []
---

# N+1 Queries in getCustomerTool

## Problem Statement

The `getCustomerTool` function in the AI infrastructure makes 3 sequential database queries that could be parallelized with `Promise.all()`. This creates unnecessary latency in AI agent responses.

## Findings

- **Location:** AI customer tool implementation
- **Issue:** Sequential queries instead of parallel execution
- **Impact:** ~3x slower than optimal for customer data retrieval
- **Severity:** P2 HIGH - Affects AI agent response times

**Current pattern:**
```typescript
const customer = await getCustomer(id);     // Query 1
const orders = await getOrders(customerId); // Query 2 (waits for 1)
const jobs = await getJobs(customerId);     // Query 3 (waits for 2)
```

## Proposed Solutions

### Option 1: Promise.all Parallelization (Recommended)

**Approach:** Execute independent queries in parallel using `Promise.all()`.

**Pros:**
- Reduces latency by ~66%
- Simple refactor
- No architectural changes needed

**Cons:**
- Slightly higher momentary database load
- Need to handle partial failures

**Effort:** 1 hour

**Risk:** Low

---

### Option 2: Single Joined Query

**Approach:** Combine into a single query with JOINs and aggregate the results.

**Pros:**
- Single round-trip to database
- Potentially more efficient for large result sets

**Cons:**
- More complex SQL
- May return duplicate data requiring client-side deduplication
- Harder to maintain

**Effort:** 3-4 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/lib/ai/tools/customer-tool.ts` (or similar)

**Optimized pattern:**
```typescript
const [customer, orders, jobs] = await Promise.all([
  getCustomer(id),
  getOrders(customerId),
  getJobs(customerId),
]);
```

## Resources

- **Review Agent:** Performance Oracle
- **Promise.all Docs:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all

## Acceptance Criteria

- [ ] Queries execute in parallel where independent
- [ ] Response time reduced by >50%
- [ ] Error handling covers partial failures
- [ ] No regression in functionality

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Performance Oracle Agent

**Actions:**
- Identified sequential query pattern in AI tool
- Measured impact on response latency
- Proposed parallelization solution

**Learnings:**
- AI tool latency directly impacts user experience
- Independent queries should always be parallelized
