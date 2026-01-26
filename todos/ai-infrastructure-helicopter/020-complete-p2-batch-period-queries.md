---
status: complete
priority: p2
issue_id: "PERF-002"
tags: [helicopter-review, performance, ai-infrastructure, queries, caching, group-4]
dependencies: []
---

# PERF-002: Batch/Cache Period Queries

## Problem Statement

Analytics tools that compare periods (e.g., this month vs. last month) execute separate queries for each period. This doubles query load and increases latency. Period data should be batched or cached.

## Findings

**Source:** Performance Oracle Agent + Helicopter Review

**Current state (separate queries):**
```typescript
// src/lib/ai/tools/analytics-tools.ts (hypothetical)
const currentPeriod = await getMetricsForPeriod(from, to);
const previousPeriod = await getMetricsForPeriod(prevFrom, prevTo);
// Two separate round-trips
```

**Desired pattern:**
```typescript
// Batch query for both periods
const [current, previous] = await Promise.all([
  getMetricsForPeriod(from, to),
  getMetricsForPeriod(prevFrom, prevTo),
]);

// Or single query with UNION
const metrics = await db.execute(sql`
  SELECT 'current' as period, ... FROM orders WHERE created_at BETWEEN ${from} AND ${to}
  UNION ALL
  SELECT 'previous' as period, ... FROM orders WHERE created_at BETWEEN ${prevFrom} AND ${prevTo}
`);
```

**Impact:**
- 2x database queries for period comparisons
- Higher latency for comparison reports
- More database load
- Inefficient for repeated requests

## Proposed Solutions

### Option A: Promise.all Parallelization (Recommended)
- **Pros:** Simple, immediate benefit
- **Cons:** Still 2 queries, just parallel
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: UNION Query
- **Pros:** Single round-trip
- **Cons:** More complex SQL, harder to maintain
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

### Option C: Redis Caching
- **Pros:** Avoids repeated queries entirely
- **Cons:** Cache invalidation complexity
- **Effort:** Medium (2-3 hours)
- **Risk:** Medium - stale data concerns

## Recommended Action

Option A first (quick win), then Option C for frequently accessed metrics.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/analytics-tools.ts`
- `src/server/functions/analytics/` (if separate)

**Implementation - Parallel queries:**
```typescript
// src/lib/ai/tools/analytics-tools.ts
export const getMetricsTool = tool({
  description: 'Get metrics with period comparison',
  inputSchema: z.object({
    period: z.string().describe('Current period'),
    compareTo: z.string().optional().describe('Comparison period'),
  }),
  execute: async function* ({ period, compareTo }, executionOptions) {
    const ctx = executionOptions.experimental_context as ToolExecutionContext;

    const currentDates = getPeriodDates(period);
    const previousDates = compareTo ? getPeriodDates(compareTo) : null;

    // Parallel queries
    const [currentMetrics, previousMetrics] = await Promise.all([
      getMetricsForPeriod(ctx.organizationId, currentDates),
      previousDates
        ? getMetricsForPeriod(ctx.organizationId, previousDates)
        : Promise.resolve(null),
    ]);

    // ... format and return
  },
});
```

**Implementation - Cached metrics:**
```typescript
// src/lib/ai/analytics/cached-metrics.ts
import { redis } from '@/lib/redis';

const METRICS_CACHE_TTL = 300; // 5 minutes

interface CachedMetrics {
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  // ...
}

export async function getCachedMetrics(
  organizationId: string,
  period: string
): Promise<CachedMetrics | null> {
  const key = `ai:metrics:${organizationId}:${period}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedMetrics(
  organizationId: string,
  period: string,
  metrics: CachedMetrics
): Promise<void> {
  const key = `ai:metrics:${organizationId}:${period}`;
  await redis.setex(key, METRICS_CACHE_TTL, JSON.stringify(metrics));
}

export async function getMetricsWithCache(
  organizationId: string,
  period: string
): Promise<CachedMetrics> {
  // Try cache first
  const cached = await getCachedMetrics(organizationId, period);
  if (cached) return cached;

  // Fetch from database
  const metrics = await computeMetrics(organizationId, getPeriodDates(period));

  // Cache for next time (non-blocking)
  setCachedMetrics(organizationId, period, metrics).catch(console.error);

  return metrics;
}
```

**Combined approach:**
```typescript
execute: async function* ({ period, compareTo }, executionOptions) {
  const ctx = executionOptions.experimental_context as ToolExecutionContext;

  // Parallel + cached
  const [currentMetrics, previousMetrics] = await Promise.all([
    getMetricsWithCache(ctx.organizationId, period),
    compareTo
      ? getMetricsWithCache(ctx.organizationId, compareTo)
      : Promise.resolve(null),
  ]);

  // Calculate comparison
  const comparison = previousMetrics
    ? calculateComparison(currentMetrics, previousMetrics)
    : null;

  // ... format and return
}
```

## Acceptance Criteria

- [x] Period queries run in parallel with Promise.all
- [ ] Optional: Redis caching for computed metrics
- [ ] Optional: Cache invalidation on data changes
- [x] Comparison calculations work correctly
- [x] TypeScript compiles without errors
- [x] Performance improvement measurable (50%+ latency reduction for comparisons)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Parallel queries are quick wins, caching requires invalidation strategy |
| 2026-01-26 | Implemented Promise.all parallelization for all 4 metrics | Changed total_revenue, order_count, average_order_value, and customer_count to use Promise.all for current/previous period queries |

## Resources

- `src/lib/ai/tools/analytics-tools.ts` - Current implementation
- `src/lib/ai/utils/resolve-params.ts` - getPeriodDates helper
- Redis caching patterns
