# Dashboard Performance Remediation Plan

**Created**: 2026-01-17
**Author**: architect-agent
**Related PRD**: DOM-DASHBOARD
**Problem**: getDashboardMetrics aggregates across 7+ tables per request with no caching strategy

---

## Executive Summary

The dashboard PRD specifies a 2-second load requirement with 10,000+ daily data points over 2 years of historical data. Without materialized views and caching, this requirement is unachievable. This remediation plan provides:

1. **Materialized views** for pre-computed daily/weekly/monthly aggregations
2. **Database indexes** optimized for date range + organizationId queries
3. **Incremental refresh strategy** using Trigger.dev background jobs
4. **Redis caching layer** with smart TTL and invalidation
5. **Background pre-computation** for expensive metrics

---

## Problem Analysis

### Current Architecture (Specified)

```
Request → API → 7+ Table JOINs → Response
                     ↓
              orders + orderItems
              opportunities  
              customers
              warranties/warranty_claims
              jobs/job_assignments
              products
              targets
```

### Data Volume Projections

| Metric | Daily | Monthly | 2 Years |
|--------|-------|---------|---------|
| Orders | ~30 | ~900 | ~21,600 |
| Order Items | ~90 | ~2,700 | ~64,800 |
| Opportunities | ~20 | ~600 | ~14,400 |
| Warranty Claims | ~5 | ~150 | ~3,600 |
| Jobs | ~15 | ~450 | ~10,800 |
| Total Rows Scanned | ~160 | ~4,800 | ~115,200 |

### Query Complexity

The `getDashboardMetrics` endpoint requires:

| Metric | Calculation | Tables | Complexity |
|--------|-------------|--------|------------|
| revenue | SUM(orderItems.lineTotal) WHERE orders.status = 'delivered' | orders, orderItems | O(n) full scan |
| kwh_deployed | SUM(batterySystem.capacity_kwh) WHERE jobs.status = 'completed' | jobs, products, orderItems | O(n) with joins |
| quote_win_rate | COUNT(accepted) / COUNT(total) opportunities | opportunities | O(n) full scan |
| active_installations | COUNT(jobs) WHERE status IN ('in_progress', 'scheduled') | jobs | O(n) filter |
| warranty_claims | COUNT(warranty_claims) | warranty_claims | O(n) filter |
| pipeline | SUM(value * probability / 100) | opportunities | O(n) calculation |
| customers | COUNT(DISTINCT customers) with activity | orders, opportunities, jobs | O(n) with DISTINCT |

**Cold query estimate**: 3-8 seconds for full date range on production data.

---

## Solution Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Request Flow                                  │
└─────────────────────────────────────────────────────────────────────┘

 Client Request
       │
       ▼
┌──────────────┐    Cache Hit    ┌──────────────┐
│   API Layer  │◀───────────────▶│    Redis     │
│              │                 │  (TTL: 5m)   │
└──────────────┘                 └──────────────┘
       │ Cache Miss
       ▼
┌──────────────┐
│ Aggregation  │──── Recent data (last 24h) ────▶ Live Query
│   Router     │
│              │──── Historical data ────────────▶ Materialized Views
└──────────────┘
       ▲
       │ Refresh
┌──────────────┐
│ Trigger.dev  │ ◀─── Cron: Every 15 minutes
│ Background   │ ◀─── Event: On order/job complete
└──────────────┘
```

---

## 1. Materialized Views

### 1.1 Daily Metrics Aggregation

```sql
-- mv_daily_metrics: Pre-computed daily aggregations by organization
-- Refresh: Incremental (append-only for past days, recalculate today)

CREATE MATERIALIZED VIEW mv_daily_metrics AS
SELECT 
    o.organization_id,
    DATE(o.created_at) as metric_date,
    
    -- Revenue (from delivered orders)
    COALESCE(SUM(
        CASE WHEN o.status = 'delivered' 
        THEN oi.line_total 
        ELSE 0 END
    ), 0) as revenue,
    
    -- kWh Deployed (from completed jobs with battery products)
    COALESCE(SUM(
        CASE WHEN j.status = 'completed' 
        THEN COALESCE((p.specifications->>'capacity_kwh')::numeric, 0)
        ELSE 0 END
    ), 0) as kwh_deployed,
    
    -- Order counts by status
    COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as delivered_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('draft', 'confirmed', 'picking', 'picked', 'shipped') THEN o.id END) as pending_orders,
    
    -- Total order value
    COALESCE(SUM(o.total_amount), 0) as total_order_value,
    
    -- Unique customers with activity
    COUNT(DISTINCT o.customer_id) as active_customers
    
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id AND o.organization_id = oi.organization_id
LEFT JOIN jobs j ON o.id = j.order_id AND o.organization_id = j.organization_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY o.organization_id, DATE(o.created_at);

-- Unique index for fast lookups and REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_daily_metrics_org_date 
ON mv_daily_metrics(organization_id, metric_date);

-- Index for date range queries
CREATE INDEX idx_mv_daily_metrics_date_range 
ON mv_daily_metrics(metric_date, organization_id);
```

### 1.2 Daily Pipeline Metrics

```sql
-- mv_daily_pipeline: Opportunity and quote metrics by day
-- Refresh: Incremental (15 minutes for today, daily for historical)

CREATE MATERIALIZED VIEW mv_daily_pipeline AS
SELECT 
    organization_id,
    DATE(created_at) as metric_date,
    
    -- Quote counts by stage
    COUNT(*) FILTER (WHERE stage = 'new') as new_opportunities,
    COUNT(*) FILTER (WHERE stage = 'qualified') as qualified_opportunities,
    COUNT(*) FILTER (WHERE stage = 'proposal') as proposal_opportunities,
    COUNT(*) FILTER (WHERE stage = 'negotiation') as negotiation_opportunities,
    COUNT(*) FILTER (WHERE stage = 'won') as won_opportunities,
    COUNT(*) FILTER (WHERE stage = 'lost') as lost_opportunities,
    
    -- Pipeline value (weighted by probability)
    COALESCE(SUM(value * probability / 100), 0) as weighted_pipeline,
    
    -- Total pipeline value (unweighted)
    COALESCE(SUM(value), 0) as total_pipeline,
    
    -- Quote win rate numerator/denominator
    COUNT(*) FILTER (WHERE stage IN ('won', 'lost')) as closed_opportunities,
    COUNT(*) FILTER (WHERE stage = 'won') as won_count,
    
    -- Average deal size
    COALESCE(AVG(value) FILTER (WHERE stage = 'won'), 0) as avg_won_deal_size

FROM opportunities
WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY organization_id, DATE(created_at);

CREATE UNIQUE INDEX idx_mv_daily_pipeline_org_date 
ON mv_daily_pipeline(organization_id, metric_date);
```

### 1.3 Daily Warranty Metrics

```sql
-- mv_daily_warranty: Warranty claims and resolutions
-- Refresh: Daily (warranty claims are less time-sensitive)

CREATE MATERIALIZED VIEW mv_daily_warranty AS
SELECT 
    wc.organization_id,
    DATE(wc.created_at) as metric_date,
    
    -- Claims by status
    COUNT(*) as total_claims,
    COUNT(*) FILTER (WHERE wc.status = 'pending') as pending_claims,
    COUNT(*) FILTER (WHERE wc.status = 'approved') as approved_claims,
    COUNT(*) FILTER (WHERE wc.status = 'rejected') as rejected_claims,
    COUNT(*) FILTER (WHERE wc.status = 'resolved') as resolved_claims,
    
    -- Claims by type (if type field exists)
    COUNT(*) FILTER (WHERE wc.claim_type = 'defect') as defect_claims,
    COUNT(*) FILTER (WHERE wc.claim_type = 'damage') as damage_claims,
    COUNT(*) FILTER (WHERE wc.claim_type = 'performance') as performance_claims,
    
    -- Resolution metrics
    AVG(EXTRACT(EPOCH FROM (wc.resolved_at - wc.created_at)) / 86400) 
        FILTER (WHERE wc.resolved_at IS NOT NULL) as avg_resolution_days

FROM warranty_claims wc
WHERE wc.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY wc.organization_id, DATE(wc.created_at);

CREATE UNIQUE INDEX idx_mv_daily_warranty_org_date 
ON mv_daily_warranty(organization_id, metric_date);
```

### 1.4 Daily Jobs Metrics

```sql
-- mv_daily_jobs: Installation and job metrics
-- Refresh: Every 15 minutes (job status changes frequently)

CREATE MATERIALIZED VIEW mv_daily_jobs AS
SELECT 
    j.organization_id,
    DATE(j.created_at) as metric_date,
    
    -- Job counts by status
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE j.status = 'scheduled') as scheduled_jobs,
    COUNT(*) FILTER (WHERE j.status = 'in_progress') as in_progress_jobs,
    COUNT(*) FILTER (WHERE j.status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE j.status = 'cancelled') as cancelled_jobs,
    
    -- Active installations (current snapshot - not date-bound)
    -- This needs special handling - see section 1.5
    
    -- Time tracking
    COALESCE(SUM(jte.hours), 0) as total_labor_hours,
    COALESCE(AVG(jte.hours), 0) as avg_labor_hours_per_job

FROM jobs j
LEFT JOIN job_time_entries jte ON j.id = jte.job_id AND j.organization_id = jte.organization_id
WHERE j.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY j.organization_id, DATE(j.created_at);

CREATE UNIQUE INDEX idx_mv_daily_jobs_org_date 
ON mv_daily_jobs(organization_id, metric_date);
```

### 1.5 Current State Snapshot (Non-Historical)

```sql
-- mv_current_state: Live snapshot of current metrics
-- Refresh: Every 5 minutes via Trigger.dev

CREATE MATERIALIZED VIEW mv_current_state AS
SELECT 
    organization_id,
    NOW() as snapshot_at,
    
    -- Active installations (jobs in progress or scheduled)
    (SELECT COUNT(*) FROM jobs 
     WHERE organization_id = o.organization_id 
     AND status IN ('in_progress', 'scheduled')) as active_installations,
    
    -- Open warranty claims
    (SELECT COUNT(*) FROM warranty_claims 
     WHERE organization_id = o.organization_id 
     AND status = 'pending') as open_warranty_claims,
    
    -- Current pipeline value
    (SELECT COALESCE(SUM(value * probability / 100), 0) FROM opportunities 
     WHERE organization_id = o.organization_id 
     AND stage NOT IN ('won', 'lost')) as current_pipeline,
    
    -- Active customer count
    (SELECT COUNT(DISTINCT id) FROM customers 
     WHERE organization_id = o.organization_id 
     AND status = 'active') as active_customers

FROM organizations o;

CREATE UNIQUE INDEX idx_mv_current_state_org 
ON mv_current_state(organization_id);
```

---

## 2. Database Indexes

### 2.1 Essential Composite Indexes

```sql
-- Orders: Date range + org queries
CREATE INDEX CONCURRENTLY idx_orders_org_date_status 
ON orders(organization_id, created_at DESC, status);

CREATE INDEX CONCURRENTLY idx_orders_org_delivered_date 
ON orders(organization_id, created_at DESC) 
WHERE status = 'delivered';

-- Order Items: Aggregation optimization
CREATE INDEX CONCURRENTLY idx_order_items_org_order 
ON order_items(organization_id, order_id);

-- Opportunities: Pipeline and win rate calculations
CREATE INDEX CONCURRENTLY idx_opportunities_org_stage_date 
ON opportunities(organization_id, stage, created_at DESC);

CREATE INDEX CONCURRENTLY idx_opportunities_org_closed_date 
ON opportunities(organization_id, actual_close_date DESC) 
WHERE stage IN ('won', 'lost');

-- Jobs: Active installation counts
CREATE INDEX CONCURRENTLY idx_jobs_org_status 
ON jobs(organization_id, status);

CREATE INDEX CONCURRENTLY idx_jobs_org_active 
ON jobs(organization_id, created_at DESC) 
WHERE status IN ('in_progress', 'scheduled');

-- Warranty Claims: Open claims and resolution tracking
CREATE INDEX CONCURRENTLY idx_warranty_claims_org_status_date 
ON warranty_claims(organization_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_warranty_claims_org_pending 
ON warranty_claims(organization_id, created_at DESC) 
WHERE status = 'pending';

-- Customers: Activity tracking
CREATE INDEX CONCURRENTLY idx_customers_org_status 
ON customers(organization_id, status);

CREATE INDEX CONCURRENTLY idx_customers_org_last_order 
ON customers(organization_id, last_order_date DESC);
```

### 2.2 Covering Indexes for Common Queries

```sql
-- Revenue calculation covering index
CREATE INDEX CONCURRENTLY idx_order_items_revenue_calc 
ON order_items(organization_id, order_id) 
INCLUDE (line_total, quantity, unit_price);

-- Pipeline calculation covering index
CREATE INDEX CONCURRENTLY idx_opportunities_pipeline_calc 
ON opportunities(organization_id, stage) 
INCLUDE (value, probability, expected_close_date);
```

---

## 3. Incremental Refresh Strategy

### 3.1 Refresh Schedule

| View | Frequency | Method | Trigger |
|------|-----------|--------|---------|
| mv_daily_metrics | 15 min | REFRESH CONCURRENTLY | Cron job |
| mv_daily_pipeline | 15 min | REFRESH CONCURRENTLY | Cron job + on opportunity stage change |
| mv_daily_warranty | 1 hour | REFRESH CONCURRENTLY | Cron job |
| mv_daily_jobs | 15 min | REFRESH CONCURRENTLY | Cron job + on job status change |
| mv_current_state | 5 min | REFRESH CONCURRENTLY | Cron job |

### 3.2 Trigger.dev Background Jobs

```typescript
// trigger/dashboard-refresh.ts
import { schedules, eventTrigger } from "@trigger.dev/sdk/v3";

// Scheduled refresh every 15 minutes
export const refreshDailyMetrics = schedules.task({
  id: "refresh-daily-metrics",
  cron: "*/15 * * * *", // Every 15 minutes
  run: async () => {
    const db = getDatabase();
    
    // Refresh all daily materialized views concurrently
    await Promise.all([
      db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics`),
      db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_pipeline`),
      db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_jobs`),
    ]);
    
    return { refreshed: ["mv_daily_metrics", "mv_daily_pipeline", "mv_daily_jobs"] };
  },
});

// More frequent refresh for current state
export const refreshCurrentState = schedules.task({
  id: "refresh-current-state",
  cron: "*/5 * * * *", // Every 5 minutes
  run: async () => {
    const db = getDatabase();
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_state`);
    
    // Invalidate Redis cache for affected orgs
    await invalidateMetricsCache();
    
    return { refreshed: ["mv_current_state"] };
  },
});

// Hourly warranty refresh
export const refreshWarrantyMetrics = schedules.task({
  id: "refresh-warranty-metrics",
  cron: "0 * * * *", // Every hour
  run: async () => {
    const db = getDatabase();
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_warranty`);
    return { refreshed: ["mv_daily_warranty"] };
  },
});

// Event-driven refresh on significant changes
export const onOrderDelivered = eventTrigger({
  id: "order-delivered-refresh",
  event: "order.delivered",
  run: async (payload) => {
    const { organizationId } = payload;
    
    // Refresh and invalidate cache for this org
    await refreshOrgMetrics(organizationId);
    await invalidateOrgCache(organizationId);
  },
});

export const onOpportunityStageChange = eventTrigger({
  id: "opportunity-stage-refresh",
  event: "opportunity.stage_changed",
  run: async (payload) => {
    const { organizationId, newStage } = payload;
    
    // Only refresh on significant stage changes
    if (["won", "lost"].includes(newStage)) {
      await refreshOrgPipeline(organizationId);
      await invalidateOrgCache(organizationId);
    }
  },
});
```

### 3.3 Hybrid Query Strategy

```typescript
// src/server/functions/dashboard.ts

export async function getDashboardMetrics({
  organizationId,
  dateFrom,
  dateTo,
}: DashboardMetricsInput) {
  // 1. Check Redis cache first
  const cacheKey = `dashboard:${organizationId}:${dateFrom}:${dateTo}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Split query: historical from MV, recent from live tables
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  const [historicalMetrics, recentMetrics, currentState] = await Promise.all([
    // Historical: Use materialized views (fast)
    getHistoricalMetricsFromMV(organizationId, dateFrom, yesterday),
    
    // Recent (today): Live query (small dataset)
    getRecentMetricsLive(organizationId, today, dateTo),
    
    // Current state: Use snapshot view
    getCurrentStateFromMV(organizationId),
  ]);
  
  // 3. Merge results
  const metrics = mergeMetrics(historicalMetrics, recentMetrics, currentState);
  
  // 4. Cache result (5 minute TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(metrics));
  
  return metrics;
}

async function getHistoricalMetricsFromMV(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date
) {
  return db.execute(sql`
    SELECT 
      SUM(revenue) as revenue,
      SUM(kwh_deployed) as kwh_deployed,
      SUM(delivered_orders) as delivered_orders,
      SUM(active_customers) as unique_customers
    FROM mv_daily_metrics
    WHERE organization_id = ${organizationId}
      AND metric_date >= ${dateFrom}
      AND metric_date <= ${dateTo}
  `);
}

async function getRecentMetricsLive(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date
) {
  // Live query for today's data only (small dataset, always fresh)
  return db.execute(sql`
    SELECT 
      COALESCE(SUM(oi.line_total), 0) as revenue,
      COUNT(DISTINCT o.id) as delivered_orders
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.organization_id = ${organizationId}
      AND o.status = 'delivered'
      AND o.created_at >= ${dateFrom}
      AND o.created_at <= ${dateTo}
  `);
}
```

---

## 4. Redis Caching Layer

### 4.1 Cache Key Structure

```
dashboard:{orgId}:{dateFrom}:{dateTo}         → Full metrics response
dashboard:summary:{orgId}                      → Current period summary
dashboard:charts:{orgId}:{chartType}:{range}   → Chart data
dashboard:activity:{orgId}:{page}              → Activity feed pages
dashboard:targets:{orgId}                      → Target progress
```

### 4.2 TTL Strategy

| Cache Type | TTL | Invalidation Trigger |
|------------|-----|----------------------|
| Full metrics | 5 min | MV refresh, data change |
| Summary | 5 min | MV refresh |
| Charts | 15 min | MV refresh |
| Activity | 1 min | Real-time event |
| Targets | 30 min | Target update |

### 4.3 Cache Implementation

```typescript
// src/lib/cache/dashboard-cache.ts
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export class DashboardCache {
  private static TTL = {
    METRICS: 300,      // 5 minutes
    CHARTS: 900,       // 15 minutes
    ACTIVITY: 60,      // 1 minute
    TARGETS: 1800,     // 30 minutes
  };

  static async getMetrics(
    orgId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<DashboardMetrics | null> {
    const key = `dashboard:${orgId}:${dateFrom}:${dateTo}`;
    const cached = await redis.get<DashboardMetrics>(key);
    return cached;
  }

  static async setMetrics(
    orgId: string,
    dateFrom: string,
    dateTo: string,
    metrics: DashboardMetrics
  ): Promise<void> {
    const key = `dashboard:${orgId}:${dateFrom}:${dateTo}`;
    await redis.setex(key, this.TTL.METRICS, metrics);
  }

  static async invalidateOrg(orgId: string): Promise<void> {
    // Pattern-based deletion
    const keys = await redis.keys(`dashboard:${orgId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  static async invalidateAll(): Promise<void> {
    const keys = await redis.keys("dashboard:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### 4.4 Cache Warming

```typescript
// trigger/cache-warming.ts
import { schedules } from "@trigger.dev/sdk/v3";

// Pre-warm cache for active organizations during off-peak hours
export const warmDashboardCache = schedules.task({
  id: "warm-dashboard-cache",
  cron: "0 2 * * *", // 2 AM daily (AEST off-peak)
  run: async () => {
    const db = getDatabase();
    
    // Get orgs with recent activity
    const activeOrgs = await db.query.organizations.findMany({
      where: (org, { gt }) => gt(org.updatedAt, subDays(new Date(), 7)),
    });
    
    // Pre-compute common date ranges
    const ranges = [
      { name: "today", from: startOfDay(new Date()), to: new Date() },
      { name: "this_week", from: startOfWeek(new Date()), to: new Date() },
      { name: "this_month", from: startOfMonth(new Date()), to: new Date() },
      { name: "last_30_days", from: subDays(new Date(), 30), to: new Date() },
    ];
    
    for (const org of activeOrgs) {
      for (const range of ranges) {
        const metrics = await computeDashboardMetrics(org.id, range.from, range.to);
        await DashboardCache.setMetrics(
          org.id,
          range.from.toISOString(),
          range.to.toISOString(),
          metrics
        );
      }
    }
    
    return { warmed: activeOrgs.length, ranges: ranges.length };
  },
});
```

---

## 5. Background Pre-computation

### 5.1 Expensive Metrics Queue

Some metrics are too expensive to compute on-demand:

| Metric | Complexity | Pre-compute Strategy |
|--------|------------|----------------------|
| Trend charts (12 months) | High | Daily at 2 AM |
| YoY comparisons | High | Daily at 2 AM |
| Product mix pie charts | Medium | Every 15 min with MV refresh |
| Conversion funnel | Medium | On opportunity stage change |
| Customer acquisition cost | High | Weekly on Sunday |

### 5.2 Pre-computation Jobs

```typescript
// trigger/dashboard-precompute.ts

// Heavy analytics computed overnight
export const precomputeTrendCharts = schedules.task({
  id: "precompute-trend-charts",
  cron: "0 2 * * *", // 2 AM daily
  run: async () => {
    const db = getDatabase();
    const orgs = await getActiveOrganizations();
    
    for (const org of orgs) {
      // 12-month revenue trend
      const revenueTrend = await computeRevenueTrend(org.id, 12);
      await redis.setex(
        `dashboard:charts:${org.id}:revenue_trend:12m`,
        86400, // 24 hour TTL
        revenueTrend
      );
      
      // 12-month kWh deployment trend
      const kwhTrend = await computeKwhTrend(org.id, 12);
      await redis.setex(
        `dashboard:charts:${org.id}:kwh_trend:12m`,
        86400,
        kwhTrend
      );
      
      // YoY comparison
      const yoyComparison = await computeYoYComparison(org.id);
      await redis.setex(
        `dashboard:charts:${org.id}:yoy_comparison`,
        86400,
        yoyComparison
      );
    }
    
    return { processed: orgs.length };
  },
});

// Weekly expensive analytics
export const precomputeWeeklyAnalytics = schedules.task({
  id: "precompute-weekly-analytics",
  cron: "0 3 * * 0", // 3 AM Sunday
  run: async () => {
    const orgs = await getActiveOrganizations();
    
    for (const org of orgs) {
      // Customer acquisition cost
      const cac = await computeCustomerAcquisitionCost(org.id);
      await redis.setex(`dashboard:analytics:${org.id}:cac`, 604800, cac);
      
      // Customer lifetime value
      const ltv = await computeCustomerLifetimeValue(org.id);
      await redis.setex(`dashboard:analytics:${org.id}:ltv`, 604800, ltv);
    }
    
    return { processed: orgs.length };
  },
});
```

---

## 6. Performance Targets

### 6.1 Response Time Budgets

| Component | Target | Budget |
|-----------|--------|--------|
| Redis cache lookup | 50ms | 50ms |
| MV query (historical) | 200ms | 200ms |
| Live query (today) | 100ms | 100ms |
| Merge + transform | 50ms | 50ms |
| Network overhead | 100ms | 100ms |
| **Total cached** | **< 200ms** | 150ms |
| **Total cold** | **< 600ms** | 500ms |
| **Target (PRD)** | **< 2000ms** | 2000ms |

### 6.2 Monitoring Metrics

```typescript
// src/lib/monitoring/dashboard-metrics.ts

export const dashboardMetrics = {
  // Latency
  "dashboard.cache.hit_rate": Gauge,
  "dashboard.cache.latency_ms": Histogram,
  "dashboard.mv_query.latency_ms": Histogram,
  "dashboard.live_query.latency_ms": Histogram,
  "dashboard.total.latency_ms": Histogram,
  
  // Freshness
  "dashboard.mv.last_refresh_seconds_ago": Gauge,
  "dashboard.cache.age_seconds": Histogram,
  
  // Volume
  "dashboard.requests.count": Counter,
  "dashboard.mv_refresh.count": Counter,
};
```

---

## 7. Implementation Phases

### Phase 1: Database Layer (Week 1)

**Files to create:**
- `drizzle/migrations/007_dashboard_materialized_views.ts`
- `drizzle/migrations/008_dashboard_indexes.ts`

**Acceptance criteria:**
- [ ] All 5 materialized views created
- [ ] All composite indexes created
- [ ] Unique indexes for REFRESH CONCURRENTLY
- [ ] Migration tested on dev database

### Phase 2: Background Jobs (Week 1-2)

**Files to create:**
- `trigger/dashboard-refresh.ts`
- `trigger/dashboard-precompute.ts`
- `trigger/cache-warming.ts`

**Acceptance criteria:**
- [ ] 15-minute refresh job running
- [ ] 5-minute current state refresh running
- [ ] Event-driven refresh on order/opportunity changes
- [ ] Cache warming job running at 2 AM

### Phase 3: Caching Layer (Week 2)

**Files to create:**
- `src/lib/cache/dashboard-cache.ts`
- `src/lib/cache/invalidation.ts`

**Acceptance criteria:**
- [ ] Redis connection configured
- [ ] Cache key structure implemented
- [ ] TTL strategy implemented
- [ ] Invalidation on data changes working

### Phase 4: API Integration (Week 2-3)

**Files to modify:**
- `src/server/functions/dashboard.ts`

**Acceptance criteria:**
- [ ] Hybrid query strategy (MV + live) implemented
- [ ] Cache-first pattern implemented
- [ ] Response time < 600ms (cold), < 200ms (warm)
- [ ] Error handling for cache/MV failures

### Phase 5: Monitoring (Week 3)

**Files to create:**
- `src/lib/monitoring/dashboard-metrics.ts`

**Acceptance criteria:**
- [ ] Latency metrics tracked
- [ ] Cache hit rate visible
- [ ] MV freshness monitored
- [ ] Alerts configured for degradation

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MV refresh blocks queries | High | Use REFRESH CONCURRENTLY (requires unique index) |
| Redis unavailable | Medium | Fallback to direct MV query |
| MV data stale | Medium | Hybrid query merges live data for today |
| Background job failures | Medium | Retry logic + alerting in Trigger.dev |
| Index bloat | Low | Scheduled REINDEX during maintenance window |

---

## 9. Open Questions

- [ ] Should we use PostgreSQL native materialized views or Supabase-managed?
- [ ] What is the Redis instance size needed for caching?
- [ ] Should we implement read replicas for dashboard queries?
- [ ] What is the acceptable staleness for each metric type?

---

## 10. Success Criteria

1. Dashboard load time < 2 seconds (target from PRD)
2. Widget refresh < 500ms
3. Cache hit rate > 80% during business hours
4. Materialized views refreshed every 15 minutes
5. No cold query takes longer than 3 seconds
6. System handles 50 concurrent dashboard users

---

*This remediation plan addresses the performance gaps identified in the premortem analysis for DOM-DASHBOARD.*
