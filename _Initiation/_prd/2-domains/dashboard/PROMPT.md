# Ralph Loop: Dashboard Domain Phase

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Build the Dashboard domain for renoz-v3: complete business intelligence and analytics platform providing real-time visibility into operational performance with configurable widgets, time-based analysis, target tracking, and automated reporting capabilities. This domain manages executive and operational visibility into battery manufacturing and B2B sales performance for Renoz Energy's Australian business.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with DOM-DASH-001.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/dashboard/dashboard.prd.json`

### Wireframe Index
- `./wireframes/index.md`

### Individual Wireframes (UI stories only)
| Story | Wireframe |
|-------|-----------|
| DOM-DASH-002a | `./wireframes/dashboard-date-range.wireframe.md` |
| DOM-DASH-002b | `./wireframes/dashboard-date-range.wireframe.md`, `dashboard-kpi-cards.wireframe.md` |
| DOM-DASH-003a | `./wireframes/dashboard-targets.wireframe.md` |
| DOM-DASH-003c | `./wireframes/dashboard-targets.wireframe.md` |
| DOM-DASH-003d | `./wireframes/dashboard-kpi-cards.wireframe.md`, `dashboard-targets.wireframe.md` |
| DOM-DASH-004a | `./wireframes/dashboard-kpi-cards.wireframe.md` |
| DOM-DASH-004b | `./wireframes/dashboard-chart-widgets.wireframe.md` |
| DOM-DASH-004c | `./wireframes/dashboard-chart-widgets.wireframe.md` |
| DOM-DASH-005a | `./wireframes/dashboard-comparison.wireframe.md` |
| DOM-DASH-005b | `./wireframes/dashboard-comparison.wireframe.md`, `dashboard-chart-widgets.wireframe.md` |
| DOM-DASH-006a | `./wireframes/dashboard-scheduled-reports.wireframe.md` |
| DOM-DASH-006c | `./wireframes/dashboard-scheduled-reports.wireframe.md` |
| DOM-DASH-007 | `./wireframes/dashboard-mobile.wireframe.md` |
| DOM-DASH-008a | `./wireframes/dashboard-ai-insights.wireframe.md` |
| DOM-DASH-008b | `./wireframes/dashboard-ai-insights.wireframe.md` |

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Business Context
- **Industry**: Australian B2B battery/battery installation
- **Key Metrics**: Revenue (AUD), kWh deployed, quote win rate, active installations, warranty claims, pipeline, customer count
- **Users**: Admin (full access), Sales (pipeline focus), Operations (installations focus), Technician (field focus), Viewer (read-only)
- **Refresh Rates**: Real-time (5 min), near real-time (15 min), batch (daily 2AM)
- **Financial Truth**: Xero for accounting, internal systems for operational metrics

---

## Premortem Remediation: Dashboard Performance

**Source:** `_meta/remediation-dashboard-performance.md`
**Created:** 2026-01-17

### Problem Identified

The original PRD specified a 2-second dashboard load requirement with 10,000+ daily data points over 2 years of historical data. The `getDashboardMetrics` endpoint aggregates across 7+ tables (orders, orderItems, opportunities, customers, warranties, jobs, products, targets) per request with no caching strategy. Cold query estimate: 3-8 seconds for full date range on production data - **unachievable without optimization**.

### Solution Architecture

```
Client Request
      |
      v
+--------------+    Cache Hit    +--------------+
|   API Layer  |<--------------->|    Redis     |
|              |                 |  (TTL: 5m)   |
+--------------+                 +--------------+
      | Cache Miss
      v
+--------------+
| Aggregation  |---- Recent data (last 24h) ----> Live Query
|   Router     |
|              |---- Historical data -----------> Materialized Views
+--------------+
      ^
      | Refresh
+--------------+
| Trigger.dev  | <--- Cron: Every 15 minutes
| Background   | <--- Event: On order/job complete
+--------------+
```

### Key Components

| Component | Purpose | Refresh Rate |
|-----------|---------|--------------|
| mv_daily_metrics | Revenue, kWh, order counts | 15 min |
| mv_daily_pipeline | Opportunity stages, win rate | 15 min + event |
| mv_daily_warranty | Claims by status/type | 1 hour |
| mv_daily_jobs | Job status, labor hours | 15 min + event |
| mv_current_state | Active counts (live snapshot) | 5 min |
| Redis Cache | Full response caching | 5 min TTL |

### Performance Targets

| Metric | Target | Budget |
|--------|--------|--------|
| Dashboard load (total) | < 2 seconds | PRD requirement |
| Cold query (no cache) | < 600 ms | MV query + merge |
| Cached response | < 200 ms | Redis hit |
| Widget refresh | < 500 ms | Individual metric |
| Cache hit rate | > 80% | Business hours |

### New Stories Added

The following performance stories have been added to the PRD:

1. **DASH-PERF-MVS** - Create 5 materialized views with unique indexes
2. **DASH-PERF-INDEXES** - Create composite indexes for date range queries
3. **DASH-PERF-CACHE** - Implement Redis caching layer with Upstash
4. **DASH-PERF-REFRESH** - Trigger.dev jobs for MV refresh (15-min, 5-min, hourly)
5. **DASH-PERF-PRECOMPUTE** - Daily/weekly pre-computation for expensive metrics
6. **DASH-PERF-WARMING** - Cache warming for active organizations at 2 AM
7. **DASH-PERF-API** - Integrate hybrid query strategy into getDashboardMetrics

### Implementation Order

Execute performance stories after DASH-CORE-SCHEMA and in parallel with DASH-CORE-API:

```
DASH-CORE-SCHEMA
      |
      +---> DASH-PERF-MVS ---> DASH-PERF-INDEXES
      |           |
      |           +---> DASH-PERF-CACHE
      |                      |
      |                      +---> DASH-PERF-REFRESH
      |                      +---> DASH-PERF-PRECOMPUTE
      |
      +---> DASH-CORE-API
                  |
                  +---> DASH-PERF-WARMING (needs both CACHE + API)
                  +---> DASH-PERF-API (needs CACHE + MVS + API)
```

### Files to Create

```
drizzle/migrations/007_dashboard_materialized_views.ts
drizzle/migrations/008_dashboard_indexes.ts
src/lib/cache/dashboard-cache.ts
trigger/dashboard-refresh.ts
trigger/dashboard-precompute.ts
trigger/cache-warming.ts
```

### Environment Variables Required

```bash
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
```

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| MV refresh blocks queries | Use REFRESH CONCURRENTLY (requires unique index) |
| Redis unavailable | Fallback to direct MV query |
| MV data stale | Hybrid query merges live data for today |
| Background job failures | Retry logic + alerting in Trigger.dev |

---

## Story Execution Order

### CRITICAL: Dependencies Must Be Respected

The Dashboard domain has a strict dependency chain for each feature:
1. **Schema (a)**: Database table creation (targets, scheduledReports, dashboardLayouts)
2. **Server Functions (b)**: API endpoints and metric calculations
3. **UI Components (c/d)**: User interface and interactions

### Execution Phases

#### Phase 1: Core Infrastructure (No Dependencies on Other Dashboard Stories)

| Story ID | Name | Creates Table(s) | Type |
|----------|------|------------------|------|
| DOM-DASH-001 | Dashboard Core Schema | targets, scheduledReports, dashboardLayouts | schema |

**Note**: DOM-DASH-001 is the only schema story - all other stories depend on this.

#### Phase 2: Server Function Stories (Sequential Dependencies)

| Story ID | Name | Depends On |
|----------|------|------------|
| DOM-DASH-001 (continued) | Dashboard Core Schema | (none) |
| DOM-DASH-001b | Dashboard Core API | DOM-DASH-001a |
| DOM-DASH-002a | Date Range Filtering (API) | DOM-DASH-001b |
| DOM-DASH-003b | Targets Management API | DOM-DASH-001a |
| DOM-DASH-005a | Comparison Analysis API | DOM-DASH-001b |
| DOM-DASH-006b | Automated Reports API | DOM-DASH-001a |
| DOM-DASH-008a | AI-Powered Insights (Server) | DOM-DASH-001b |

#### Phase 3: UI Component Stories (Each Depends on Server Functions)

| Story ID | Name | Depends On | Wireframe |
|----------|------|------------|-----------|
| DOM-DASH-002a | Date Range Filtering (UI) | DOM-DASH-002a (server) | dashboard-date-range.wireframe.md |
| DOM-DASH-002b | Wire Date Range to Widgets | DOM-DASH-002a (ui) | dashboard-date-range.wireframe.md, dashboard-kpi-cards.wireframe.md |
| DOM-DASH-003a | Create Targets Schema | DOM-DASH-001a | dashboard-targets.wireframe.md |
| DOM-DASH-003b | Add Target Server Functions | DOM-DASH-003a | (none) |
| DOM-DASH-003c | Add Target Settings UI | DOM-DASH-003b | dashboard-targets.wireframe.md |
| DOM-DASH-003d | Add Target Progress to KPI Widgets | DOM-DASH-003c | dashboard-kpi-cards.wireframe.md, dashboard-targets.wireframe.md |
| DOM-DASH-004a | Add KPI Widget Click Handlers | DOM-DASH-003d | dashboard-kpi-cards.wireframe.md |
| DOM-DASH-004b | Add Chart Drill-Down Modal | DOM-DASH-004a | dashboard-chart-widgets.wireframe.md |
| DOM-DASH-004c | Preserve Context in Drill-Down | DOM-DASH-004b | dashboard-chart-widgets.wireframe.md |
| DOM-DASH-005a | Add Comparison Periods (Server) | DOM-DASH-001b | (none) |
| DOM-DASH-005b | Add Comparison Periods (UI) | DOM-DASH-005a | dashboard-comparison.wireframe.md, dashboard-chart-widgets.wireframe.md |
| DOM-DASH-006a | Create Scheduled Reports Schema | DOM-DASH-001a | dashboard-scheduled-reports.wireframe.md |
| DOM-DASH-006b | Add Report Server Functions | DOM-DASH-006a | (none) |
| DOM-DASH-006c | Add Report Management UI | DOM-DASH-006b | dashboard-scheduled-reports.wireframe.md |
| DOM-DASH-006d | Add Trigger.dev Scheduled Job | DOM-DASH-006c | (none) |
| DOM-DASH-007 | Create Mobile Dashboard | DOM-DASH-002b, DOM-DASH-004c | dashboard-mobile.wireframe.md |
| DOM-DASH-008a | Create AI Insights Server Function | DOM-DASH-001b | dashboard-ai-insights.wireframe.md |
| DOM-DASH-008b | Create AI Insights Widget Component | DOM-DASH-008a | dashboard-ai-insights.wireframe.md |

---

## Recommended Execution Order

**Execute stories in this order to respect all dependencies:**

```
1.  DOM-DASH-001a - Dashboard Core Schema (targets, scheduledReports, dashboardLayouts)
2.  DASH-PERF-MVS - Dashboard Materialized Views (5 MVs for performance) [REMEDIATION]
3.  DASH-PERF-INDEXES - Dashboard Performance Indexes [REMEDIATION]
4.  DASH-PERF-CACHE - Dashboard Caching Layer (Upstash Redis) [REMEDIATION]
5.  DOM-DASH-001b - Dashboard Core API (getDashboardMetrics, getMetricsComparison, layouts)
6.  DASH-PERF-REFRESH - Dashboard MV Refresh Jobs (Trigger.dev) [REMEDIATION]
7.  DASH-PERF-PRECOMPUTE - Dashboard Pre-computation Jobs [REMEDIATION]
8.  DASH-PERF-WARMING - Dashboard Cache Warming [REMEDIATION]
9.  DASH-PERF-API - Dashboard Hybrid Query Integration [REMEDIATION]
10. DOM-DASH-003a - Create Targets Schema
11. DOM-DASH-003b - Add Target Server Functions (CRUD + progress tracking)
12. DOM-DASH-003c - Add Target Settings UI (wireframe: dashboard-targets.wireframe.md)
13. DOM-DASH-003d - Add Target Progress to KPI Widgets (wireframe: dashboard-kpi-cards + targets)
14. DOM-DASH-002a - Date Range Filtering (API) (wireframe: dashboard-date-range.wireframe.md)
15. DOM-DASH-002b - Wire Date Range to Widgets (wireframe: date-range + kpi-cards)
16. DOM-DASH-004a - Add KPI Widget Click Handlers (wireframe: dashboard-kpi-cards.wireframe.md)
17. DOM-DASH-004b - Add Chart Drill-Down Modal (wireframe: dashboard-chart-widgets.wireframe.md)
18. DOM-DASH-004c - Preserve Context in Drill-Down (wireframe: dashboard-chart-widgets.wireframe.md)
19. DOM-DASH-005a - Add Comparison Periods (Server)
20. DOM-DASH-005b - Add Comparison Periods (UI) (wireframe: dashboard-comparison + chart-widgets)
21. DOM-DASH-006a - Create Scheduled Reports Schema
22. DOM-DASH-006b - Add Report Server Functions
23. DOM-DASH-006c - Add Report Management UI (wireframe: dashboard-scheduled-reports.wireframe.md)
24. DOM-DASH-006d - Add Trigger.dev Scheduled Job
25. DOM-DASH-008a - Create AI Insights Server Function
26. DOM-DASH-008b - Create AI Insights Widget Component (wireframe: dashboard-ai-insights.wireframe.md)
27. DOM-DASH-007 - Create Mobile Dashboard (wireframe: dashboard-mobile.wireframe.md)
```

**Note:** Stories marked [REMEDIATION] were added from premortem analysis to ensure performance targets are met.

---

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **For UI stories**: Read the corresponding wireframe file(s)
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>` (use the completion_promise from PRD)
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

---

## Performance Testing

**Reference:** `_Initiation/_meta/patterns/performance-benchmarks.md`

### Data Volume Targets

The dashboard must perform well at **Year 3 scale**:
- 10,000 opportunities
- 100,000 activities
- 2,000 customers
- 5,000 orders

### Performance Commands

```bash
# Seed benchmark data (Year 3 volume)
cd renoz-v3 && bun run seed:benchmark --volume=year3

# Run full performance test suite
cd renoz-v3 && bun test:perf

# Test dashboard load time (<2s cold, <500ms cached)
cd renoz-v3 && bun test:perf -- --grep "dashboard load" --timeout=5000

# Test widget refresh times
cd renoz-v3 && bun test:perf -- --grep "widget refresh" --timeout=2000

# Test global search (<500ms)
cd renoz-v3 && bun test:perf -- --grep "global search" --timeout=1500

# Analyze query performance
cd renoz-v3 && bun run db:explain -- "SELECT * FROM mv_daily_metrics WHERE organization_id = '...' AND metric_date BETWEEN '...' AND '...'"
```

### Widget Performance Targets

| Widget | Target | Data Source |
|--------|--------|-------------|
| KPI Cards | <300ms | mv_current_state + Redis |
| Revenue Chart | <500ms | mv_daily_metrics + Redis |
| Pipeline Chart | <500ms | mv_daily_pipeline + Redis |
| Activity Feed | <200ms | Live query (paginated) |
| Warranty Summary | <400ms | mv_daily_warranty + Redis |
| Jobs Overview | <400ms | mv_daily_jobs + Redis |
| Target Progress | <300ms | targets + mv_current_state |

### When to Run Performance Tests

- **After DASH-PERF-MVS**: Verify materialized views query in <100ms
- **After DASH-PERF-CACHE**: Verify cache hit rate >80% on repeated queries
- **After DASH-PERF-API**: Verify full dashboard load <2s cold, <500ms cached
- **Before DOM_DASHBOARD_COMPLETE**: Full performance regression test

---

## Domain-Specific Constraints

### DO
- Use Drizzle ORM for all database operations with proper migrations
- Create Zod schemas for all data validation
- Follow shadcn/ui and RE-UI patterns per wireframes
- Store monetary amounts in AUD cents (e.g., $1,500.00 = 150000)
- Use React Query for data fetching and caching
- Implement proper loading skeletons and empty states
- Store date ranges in URL parameters for shareability
- Follow responsive design: desktop (12-col), tablet (6-col), mobile (1-col)
- Ensure WCAG 2.1 AA accessibility compliance
- Use TanStack Table for list/grid views
- Use Dialog/Sheet components for modals per shadcn/ui patterns
- Implement role-based dashboard defaults (Admin, Sales, Operations, Technician, Viewer)

### DO NOT
- Use multi-currency (AUD only)
- Create duplicate UI components - use existing patterns from shared library
- Modify files outside dashboard domain scope
- Skip acceptance criteria
- Implement real-time streaming (use polling/refresh instead)
- Store layouts in context without database persistence
- Skip mobile responsiveness
- Hardcode metric calculations - use aggregated tables for performance

### File Structure
```
renoz-v3/
├── src/
│   ├── routes/_authed/dashboard/
│   │   ├── index.tsx                    # Main dashboard
│   │   ├── targets.tsx                  # Target settings (DOM-DASH-003c)
│   │   └── reports.tsx                  # Report management (DOM-DASH-006c)
│   ├── components/domain/dashboard/
│   │   ├── dashboard-grid.tsx           # Grid layout (DOM-DASH-001b)
│   │   ├── widget-catalog.tsx           # Widget add menu
│   │   ├── date-range-selector.tsx      # Date filtering (DOM-DASH-002a)
│   │   ├── comparison-toggle.tsx        # Period comparison (DOM-DASH-005b)
│   │   ├── widgets/
│   │   │   ├── kpi-widget.tsx           # KPI cards (DOM-DASH-003d)
│   │   │   ├── chart-widget.tsx         # Charts (DOM-DASH-004b)
│   │   │   ├── activity-feed.tsx        # Activity timeline
│   │   │   └── ai-insights-widget.tsx   # AI insights (DOM-DASH-008b)
│   │   ├── dashboard-context.tsx        # Global state
│   │   └── mobile-dashboard.tsx         # Mobile layout (DOM-DASH-007)
│   ├── lib/
│   │   ├── schema/
│   │   │   └── dashboard.ts             # Drizzle tables
│   │   ├── schemas/
│   │   │   └── dashboard.ts             # Zod validation
│   │   └── server/
│   │       └── functions/dashboard.ts   # Server functions
│   └── server/
│       ├── functions/
│       │   ├── dashboard.ts             # Metrics & layout endpoints
│       │   ├── targets.ts               # Target CRUD endpoints
│       │   ├── reports.ts               # Report endpoints
│       │   └── ai-insights.ts           # AI insights endpoint
├── trigger/
│   └── dashboard-reports.ts             # Trigger.dev scheduled jobs (DOM-DASH-006d)
└── drizzle/
    ├── schema/
    │   └── dashboard.ts                 # Table definitions
    └── migrations/
        └── dashboard.ts                 # Schema migration
```

---

## External Dependencies

### Required Before Dashboard Domain
- **schema-foundation**: Base tables (organizations, users, customers, orders)
- **DOM-ORD (Orders)**: For order data and metrics
- **DOM-CUST (Customers)**: For customer acquisition metrics
- **DOM-PIPE (Pipeline)**: For opportunity data

### What Dashboard Enables
- **WF-EXEC (Executive Workflow)**: Uses dashboard for decision-making
- **DOM-REPORT (Reports)**: Uses dashboard data for report generation

---

## Completion

When ALL dashboard stories pass:
```xml
<promise>DOM_DASHBOARD_COMPLETE</promise>
```

---

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues -> Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts -> Verify policy SQL syntax
  - Import errors -> Check TanStack Start path aliases
  - Wireframe mismatch -> Re-read wireframe file for exact component structure
  - Metric calculation errors -> Verify aggregation logic in server functions
  - Performance issues -> Use React Query caching and aggregated tables

---

## Progress Template

```markdown
# Dashboard Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
### Phase 1: Core Schema
- [ ] DOM-DASH-001a: Dashboard Core Schema

### Phase 1.5: Performance Infrastructure [REMEDIATION]
- [ ] DASH-PERF-MVS: Dashboard Materialized Views
- [ ] DASH-PERF-INDEXES: Dashboard Performance Indexes
- [ ] DASH-PERF-CACHE: Dashboard Caching Layer

### Phase 2: Core API & Server Functions
- [ ] DOM-DASH-001b: Dashboard Core API
- [ ] DASH-PERF-REFRESH: Dashboard MV Refresh Jobs [REMEDIATION]
- [ ] DASH-PERF-PRECOMPUTE: Dashboard Pre-computation Jobs [REMEDIATION]
- [ ] DASH-PERF-WARMING: Dashboard Cache Warming [REMEDIATION]
- [ ] DASH-PERF-API: Dashboard Hybrid Query Integration [REMEDIATION]
- [ ] DOM-DASH-003a: Create Targets Schema
- [ ] DOM-DASH-003b: Add Target Server Functions
- [ ] DOM-DASH-002a: Date Range Filtering (API)
- [ ] DOM-DASH-005a: Add Comparison Periods (Server)
- [ ] DOM-DASH-006a: Create Scheduled Reports Schema
- [ ] DOM-DASH-006b: Add Report Server Functions
- [ ] DOM-DASH-008a: Create AI Insights Server Function

### Phase 3: UI Components
- [ ] DOM-DASH-003c: Add Target Settings UI
- [ ] DOM-DASH-003d: Add Target Progress to KPI Widgets
- [ ] DOM-DASH-002b: Wire Date Range to Widgets
- [ ] DOM-DASH-004a: Add KPI Widget Click Handlers
- [ ] DOM-DASH-004b: Add Chart Drill-Down Modal
- [ ] DOM-DASH-004c: Preserve Context in Drill-Down
- [ ] DOM-DASH-005b: Add Comparison Periods (UI)
- [ ] DOM-DASH-006c: Add Report Management UI
- [ ] DOM-DASH-006d: Add Trigger.dev Scheduled Job
- [ ] DOM-DASH-008b: Create AI Insights Widget Component
- [ ] DOM-DASH-007: Create Mobile Dashboard

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
- Performance remediation stories from premortem analysis added 2026-01-17
```

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Dashboard Domain Phase
