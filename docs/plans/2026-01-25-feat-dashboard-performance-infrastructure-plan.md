---
title: Dashboard Performance Infrastructure
type: feat
date: 2026-01-25
priority: critical
estimated_effort: 2-3 weeks
---

# Dashboard Performance Infrastructure

## Overview

The dashboard domain has **all 16 feature stories complete** but is **NOT production-ready** due to missing performance infrastructure. Current implementation queries 7+ tables per request with no caching, which will result in 5-10 second load times at production data volumes.

This plan addresses the critical performance gap by implementing:
- Materialized views for pre-computed aggregations
- Composite indexes for fast range queries
- Redis caching layer with TTL strategy
- Background refresh jobs via Trigger.dev
- Hybrid query strategy (MV for historical, live for today)

## Problem Statement

### Current State
- `getDashboardMetrics` aggregates across orders, customers, opportunities, jobs, warranty_claims, activities tables
- No materialized views exist for pre-computed metrics
- No caching layer implemented
- All queries hit live tables regardless of date range
- Expected production load time: **5-10 seconds** (unacceptable)

### PRD Performance Requirements
| Metric | Target | Current |
|--------|--------|---------|
| Dashboard load | < 2s | ~5-10s estimated |
| Cold query (MV) | < 600ms | N/A (no MVs) |
| Cached query | < 200ms | N/A (no cache) |
| Widget refresh | < 500ms | ~2-3s estimated |

### Root Cause
The PRD defined these stories but they were not implemented:
- DASH-PERF-MVS (Materialized Views) - 0% complete
- DASH-PERF-INDEXES (Performance Indexes) - 0% complete
- DASH-PERF-CACHE (Caching Layer) - 0% complete
- DASH-PERF-REFRESH (MV Refresh Jobs) - 0% complete
- DASH-PERF-PRECOMPUTE (Pre-computation Jobs) - 0% complete
- DASH-PERF-WARMING (Cache Warming) - 0% complete
- DASH-PERF-API (Hybrid Query Integration) - 0% complete

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Dashboard Request Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client Request                                                  │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐    Cache Hit     ┌──────────────────┐          │
│  │  Redis      │ ───────────────► │  Return Cached   │          │
│  │  Cache      │                  │  Metrics         │          │
│  └─────────────┘                  └──────────────────┘          │
│       │                                                          │
│       │ Cache Miss                                               │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Hybrid Query Strategy                   │        │
│  │  ┌───────────────────┐  ┌───────────────────────┐   │        │
│  │  │ Historical Data   │  │ Today's Data          │   │        │
│  │  │ (Materialized     │  │ (Live Tables)         │   │        │
│  │  │  Views)           │  │                       │   │        │
│  │  │ - mv_daily_metrics│  │ - orders WHERE        │   │        │
│  │  │ - mv_daily_pipeline│ │   created_at >= today │   │        │
│  │  │ - mv_current_state│  │ - opportunities WHERE │   │        │
│  │  └───────────────────┘  │   updated_at >= today │   │        │
│  │           │              └───────────────────────┘   │        │
│  │           │                        │                 │        │
│  │           └────────┬───────────────┘                 │        │
│  │                    ▼                                 │        │
│  │            Merge Results                             │        │
│  └─────────────────────────────────────────────────────┘        │
│                    │                                             │
│                    ▼                                             │
│            Cache & Return                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Background Refresh Jobs                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  Every 15min  ┌─────────────────────────┐ │
│  │ refreshDailyMVs  │ ────────────► │ REFRESH CONCURRENTLY    │ │
│  │ (Trigger.dev)    │               │ mv_daily_metrics        │ │
│  └──────────────────┘               │ mv_daily_pipeline       │ │
│                                     │ mv_daily_jobs           │ │
│  ┌──────────────────┐  Every 5min   └─────────────────────────┘ │
│  │ refreshCurrent   │ ────────────► ┌─────────────────────────┐ │
│  │ State            │               │ REFRESH CONCURRENTLY    │ │
│  └──────────────────┘               │ mv_current_state        │ │
│                                     │ + Invalidate Redis      │ │
│  ┌──────────────────┐  Every hour   └─────────────────────────┘ │
│  │ refreshWarranty  │ ────────────► ┌─────────────────────────┐ │
│  │ Metrics          │               │ REFRESH CONCURRENTLY    │ │
│  └──────────────────┘               │ mv_daily_warranty       │ │
│                                     └─────────────────────────┘ │
│  ┌──────────────────┐  On Event                                 │
│  │ Event-Driven     │ ────────────► order.delivered             │
│  │ Refresh          │               opportunity.stage_changed   │
│  └──────────────────┘               job.status_changed          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Database Infrastructure (Week 1)
- Create 5 materialized views with unique indexes
- Create composite indexes for date range + organizationId queries
- Test migrations on dev database

#### Phase 2: Background Jobs (Week 1-2)
- Trigger.dev scheduled tasks for MV refresh
- Event-driven refresh on key business events
- Cache warming job for active organizations

#### Phase 3: Caching Layer (Week 2)
- DashboardCache class with Upstash Redis
- TTL strategy per metric type
- Pattern-based cache invalidation

#### Phase 4: API Integration (Week 2-3)
- Hybrid query strategy in getDashboardMetrics
- Fallback to live query if MV unavailable
- Performance monitoring and alerting

## Acceptance Criteria

### Functional Requirements

- [ ] All 5 materialized views created and queryable
- [ ] Composite indexes created on orders, opportunities, jobs, warranty_claims
- [ ] DashboardCache class handles get/set/invalidate operations
- [ ] MV refresh jobs run on schedule (5min, 15min, hourly)
- [ ] Event-driven refresh triggers on order.delivered, opportunity.stage_changed
- [ ] Cache warming pre-populates for active organizations
- [ ] getDashboardMetrics uses hybrid query strategy

### Non-Functional Requirements

- [ ] Dashboard load < 2 seconds
- [ ] Cold query (MV, no cache) < 600ms
- [ ] Cached query < 200ms
- [ ] Widget refresh < 500ms
- [ ] Cache hit rate > 80% during business hours
- [ ] MV data freshness < 15 minutes

### Quality Gates

- [ ] All migrations run successfully on dev
- [ ] Performance benchmarks pass with Year 3 data volume
- [ ] Fallback behavior works when Redis unavailable
- [ ] No N+1 queries in dashboard server functions

## Implementation Details

### Phase 1: Materialized Views Migration

**File: `drizzle/migrations/007_dashboard_materialized_views.ts`**

```sql
-- mv_daily_metrics: Pre-computed daily aggregations
CREATE MATERIALIZED VIEW mv_daily_metrics AS
SELECT
  organization_id,
  DATE(created_at AT TIME ZONE 'Australia/Sydney') as metric_date,
  COUNT(*) as orders_count,
  SUM(total) as revenue,
  COUNT(DISTINCT customer_id) as customer_count,
  AVG(total) as average_order_value
FROM orders
WHERE deleted_at IS NULL
  AND created_at >= NOW() - INTERVAL '2 years'
GROUP BY organization_id, DATE(created_at AT TIME ZONE 'Australia/Sydney');

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX mv_daily_metrics_pk ON mv_daily_metrics(organization_id, metric_date);
CREATE INDEX mv_daily_metrics_date_range ON mv_daily_metrics(metric_date);

-- mv_daily_pipeline: Opportunity metrics by day
CREATE MATERIALIZED VIEW mv_daily_pipeline AS
SELECT
  organization_id,
  DATE(created_at AT TIME ZONE 'Australia/Sydney') as metric_date,
  stage,
  COUNT(*) as opportunity_count,
  SUM(value) as total_value,
  SUM(value * probability / 100) as weighted_pipeline
FROM opportunities
WHERE deleted_at IS NULL
  AND created_at >= NOW() - INTERVAL '2 years'
GROUP BY organization_id, DATE(created_at AT TIME ZONE 'Australia/Sydney'), stage;

CREATE UNIQUE INDEX mv_daily_pipeline_pk ON mv_daily_pipeline(organization_id, metric_date, stage);

-- mv_daily_warranty: Warranty claims by day
CREATE MATERIALIZED VIEW mv_daily_warranty AS
SELECT
  organization_id,
  DATE(created_at AT TIME ZONE 'Australia/Sydney') as metric_date,
  status,
  type,
  COUNT(*) as claim_count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
FROM warranty_claims
WHERE deleted_at IS NULL
  AND created_at >= NOW() - INTERVAL '2 years'
GROUP BY organization_id, DATE(created_at AT TIME ZONE 'Australia/Sydney'), status, type;

CREATE UNIQUE INDEX mv_daily_warranty_pk ON mv_daily_warranty(organization_id, metric_date, status, type);

-- mv_daily_jobs: Job metrics by day
CREATE MATERIALIZED VIEW mv_daily_jobs AS
SELECT
  organization_id,
  DATE(scheduled_date AT TIME ZONE 'Australia/Sydney') as metric_date,
  status,
  COUNT(*) as job_count,
  SUM(estimated_hours) as total_hours
FROM jobs
WHERE deleted_at IS NULL
  AND scheduled_date >= NOW() - INTERVAL '2 years'
GROUP BY organization_id, DATE(scheduled_date AT TIME ZONE 'Australia/Sydney'), status;

CREATE UNIQUE INDEX mv_daily_jobs_pk ON mv_daily_jobs(organization_id, metric_date, status);

-- mv_current_state: Live snapshot (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW mv_current_state AS
SELECT
  o.id as organization_id,
  (SELECT COUNT(*) FROM jobs j WHERE j.organization_id = o.id AND j.status IN ('scheduled', 'in_progress') AND j.deleted_at IS NULL) as active_jobs,
  (SELECT COUNT(*) FROM warranty_claims wc WHERE wc.organization_id = o.id AND wc.status = 'open' AND wc.deleted_at IS NULL) as open_claims,
  (SELECT SUM(value * probability / 100) FROM opportunities op WHERE op.organization_id = o.id AND op.stage NOT IN ('won', 'lost') AND op.deleted_at IS NULL) as current_pipeline
FROM organizations o;

CREATE UNIQUE INDEX mv_current_state_pk ON mv_current_state(organization_id);
```

### Phase 1b: Performance Indexes Migration

**File: `drizzle/migrations/008_dashboard_indexes.ts`**

```sql
-- Orders indexes for date range + org queries
CREATE INDEX CONCURRENTLY idx_orders_org_date_status
  ON orders(organization_id, created_at DESC, status);

CREATE INDEX CONCURRENTLY idx_orders_delivered
  ON orders(organization_id, created_at DESC)
  WHERE status = 'delivered' AND deleted_at IS NULL;

-- Opportunities indexes
CREATE INDEX CONCURRENTLY idx_opportunities_org_stage_date
  ON opportunities(organization_id, stage, created_at DESC);

CREATE INDEX CONCURRENTLY idx_opportunities_closed
  ON opportunities(organization_id, closed_at DESC)
  WHERE stage IN ('won', 'lost') AND deleted_at IS NULL;

-- Jobs indexes
CREATE INDEX CONCURRENTLY idx_jobs_org_status
  ON jobs(organization_id, status);

CREATE INDEX CONCURRENTLY idx_jobs_active
  ON jobs(organization_id, scheduled_date DESC)
  WHERE status IN ('scheduled', 'in_progress') AND deleted_at IS NULL;

-- Warranty claims indexes
CREATE INDEX CONCURRENTLY idx_warranty_org_status_date
  ON warranty_claims(organization_id, status, created_at DESC);

-- Covering indexes for revenue calculations
CREATE INDEX CONCURRENTLY idx_orders_revenue_cover
  ON orders(organization_id, created_at DESC)
  INCLUDE (total, status, customer_id)
  WHERE deleted_at IS NULL;
```

### Phase 2: Redis Caching Layer

**File: `src/lib/cache/dashboard-cache.ts`**

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const TTL = {
  full_metrics: 5 * 60,      // 5 minutes
  summary: 5 * 60,           // 5 minutes
  charts: 15 * 60,           // 15 minutes
  activity: 60,              // 1 minute
  targets: 30 * 60,          // 30 minutes
} as const;

export class DashboardCache {
  static async getMetrics(orgId: string, dateFrom: string, dateTo: string) {
    const key = `dashboard:${orgId}:${dateFrom}:${dateTo}`;
    return redis.get(key);
  }

  static async setMetrics(orgId: string, dateFrom: string, dateTo: string, data: unknown) {
    const key = `dashboard:${orgId}:${dateFrom}:${dateTo}`;
    await redis.set(key, data, { ex: TTL.full_metrics });
  }

  static async invalidateOrg(orgId: string) {
    const keys = await redis.keys(`dashboard:${orgId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  static async invalidateAll() {
    const keys = await redis.keys('dashboard:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Phase 3: Background Refresh Jobs

**File: `src/trigger/jobs/dashboard-refresh.ts`**

```typescript
import { schedules, task } from '@trigger.dev/sdk/v3';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { DashboardCache } from '@/lib/cache/dashboard-cache';

// Every 15 minutes - refresh daily metrics MVs
export const refreshDailyMetrics = schedules.task({
  id: 'refresh-daily-metrics',
  cron: '*/15 * * * *',
  run: async () => {
    const refreshedViews = [];

    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics`);
    refreshedViews.push('mv_daily_metrics');

    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_pipeline`);
    refreshedViews.push('mv_daily_pipeline');

    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_jobs`);
    refreshedViews.push('mv_daily_jobs');

    return { refreshedViews, timestamp: new Date().toISOString() };
  },
});

// Every 5 minutes - refresh current state + invalidate cache
export const refreshCurrentState = schedules.task({
  id: 'refresh-current-state',
  cron: '*/5 * * * *',
  run: async () => {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_state`);
    await DashboardCache.invalidateAll();

    return { view: 'mv_current_state', timestamp: new Date().toISOString() };
  },
});

// Every hour - refresh warranty metrics
export const refreshWarrantyMetrics = schedules.task({
  id: 'refresh-warranty-metrics',
  cron: '0 * * * *',
  run: async () => {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_warranty`);

    return { view: 'mv_daily_warranty', timestamp: new Date().toISOString() };
  },
});
```

### Phase 4: Hybrid Query Integration

**File: `src/server/functions/dashboard/metrics.ts` (modifications)**

```typescript
export const getDashboardMetrics = createServerFn({ method: 'GET' })
  .validator(dashboardMetricsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });
    const { dateFrom, dateTo } = data;

    // 1. Check cache first
    const cached = await DashboardCache.getMetrics(ctx.organizationId, dateFrom, dateTo);
    if (cached) {
      return cached as DashboardMetricsResponse;
    }

    // 2. Hybrid query: MV for historical, live for today
    const today = new Date().toISOString().split('T')[0];
    const isRangeIncludesToday = dateTo >= today;

    // Historical from MVs
    const historicalMetrics = await getHistoricalMetricsFromMV(
      ctx.organizationId,
      dateFrom,
      isRangeIncludesToday ? getPreviousDay(today) : dateTo
    );

    // Today's data from live tables (if needed)
    let todayMetrics = null;
    if (isRangeIncludesToday) {
      todayMetrics = await getTodayMetricsLive(ctx.organizationId);
    }

    // Current state (active jobs, open claims, pipeline)
    const currentState = await getCurrentStateFromMV(ctx.organizationId);

    // 3. Merge results
    const result = mergeMetrics(historicalMetrics, todayMetrics, currentState);

    // 4. Cache and return
    await DashboardCache.setMetrics(ctx.organizationId, dateFrom, dateTo, result);

    return result;
  });
```

## Dependencies & Prerequisites

### Environment Variables Required
```bash
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx
```

### Package Dependencies
- `@upstash/redis` - Already in project for other features
- `@trigger.dev/sdk` - Already configured

### Database Prerequisites
- Supabase project with sufficient connection pool
- Ability to create materialized views (standard Postgres feature)
- Sufficient storage for MV data (~2 years retention)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MV refresh blocks reads | Low | High | Use REFRESH CONCURRENTLY (requires unique index) |
| Redis unavailable | Medium | Medium | Fallback to direct MV query |
| MV data stale | Medium | Medium | Event-driven refresh + 5-min current_state refresh |
| Migration downtime | Low | High | Use CREATE INDEX CONCURRENTLY |
| Cache stampede on invalidation | Medium | Medium | Staggered TTLs, background warming |

## Success Metrics

### Performance KPIs
- Dashboard load P95 < 2 seconds
- Cache hit rate > 80% during business hours
- MV refresh completes in < 30 seconds
- Zero query timeouts

### Monitoring
- Datadog APM for response times
- Redis metrics (hit rate, memory usage)
- Trigger.dev job success rate
- MV freshness timestamp checks

## Additional Fix: Standards Violation

### welcome-checklist.tsx Container/Presenter Pattern

**Current Issue**: `welcome-checklist.tsx` contains `useQuery`/`useMutation` directly instead of following Container/Presenter pattern.

**Fix Required**:
1. Extract data fetching to container component
2. Make `WelcomeChecklist` a pure presenter receiving props
3. Add `@source` JSDoc annotations

This is a minor fix that can be addressed in Phase 1.

## References & Research

### Internal References
- PRD: `_Initiation/_prd/2-domains/dashboard/dashboard.prd.json` - Lines 18-49 (MV specs), 517-569 (performance requirements)
- Progress: `_Initiation/_prd/2-domains/dashboard/progress.txt`
- Standards: `renoz-v3/STANDARDS.md`

### External References
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [Upstash Redis Documentation](https://upstash.com/docs/redis/overall/getstarted)
- [Trigger.dev Scheduled Tasks](https://trigger.dev/docs/documentation/concepts/scheduled-tasks)

### Related Work
- DASH-CORE-SCHEMA (completed) - Base schema exists
- DASH-CORE-API (completed) - Server functions exist, need hybrid query integration
- process-scheduled-reports.ts - Pattern for Trigger.dev jobs

## Checklist Summary

### Phase 1: Database (3-4 days)
- [x] Create `0020_dashboard_materialized_views.sql` migration
- [x] Create `0021_dashboard_performance_indexes.sql` migration
- [ ] Test migrations on dev database
- [ ] Verify REFRESH CONCURRENTLY works

### Phase 2: Background Jobs (2-3 days)
- [x] Create `src/trigger/jobs/dashboard-refresh.ts`
- [x] Create `src/trigger/jobs/cache-warming.ts`
- [x] Register jobs in Trigger.dev (`src/trigger/jobs/index.ts`)
- [x] Add dashboard events to Trigger.dev client
- [ ] Test scheduled execution

### Phase 3: Caching (2-3 days)
- [x] Create `src/lib/cache/dashboard-cache.ts`
- [ ] Configure Upstash Redis credentials
- [x] Implement TTL strategy
- [x] Add fallback for Redis unavailability

### Phase 4: API Integration (3-4 days)
- [x] Modify `getDashboardMetrics` for hybrid queries
- [x] Add `queryMetricsFromMV` helper
- [x] Add `queryTodayMetricsLive` helper
- [x] Add `getMetricsHybrid` utility
- [ ] Test with benchmark data volume

### Phase 5: Monitoring & Polish (2 days)
- [ ] Add performance metrics logging
- [ ] Create benchmark tests
- [ ] Fix welcome-checklist.tsx standards violation
- [ ] Update progress.txt with new stories
