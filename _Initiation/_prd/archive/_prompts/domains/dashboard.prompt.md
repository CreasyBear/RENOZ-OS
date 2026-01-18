# Task: Implement Dashboard Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/dashboard.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-dashboard.progress.txt

## PRD ID
DOM-DASHBOARD

## Phase
domain-core

## Priority
2

## Dependencies
- All domain PRDs for data aggregation

---

## Renoz Business Context

### Core KPIs
- **Systems Sold**: Total kWh capacity of battery systems sold this period
- **Active Installers**: Number of registered, active installation partners
- **Pipeline Value**: Total dollar value of quotes in progress (not yet sold)
- **Warranty Claim Rate**: Percentage of installed systems with warranty claims
- **Average Installation Time**: Days from sale to completion
- **Revenue**: Total sales revenue for the period

### Dashboard Charts
- **Monthly kWh Shipped**: Line chart showing battery capacity sold over time
- **Installer Growth**: Area chart of new vs active installers by month
- **Product Mix**: Pie/bar chart of battery models sold (e.g., PowerWall 2, PowerWall 3, etc.)
- **Regional Sales**: Map or bar chart showing sales by state/region
- **Installation Pipeline**: Funnel chart from quote → sold → scheduled → installed
- **Warranty Trends**: Line chart of warranty claims over time

### Quick Actions (Dashboard CTA Cards)
- **Create Quote**: Launch quote builder for a customer
- **Check Stock**: View current inventory of battery models
- **Schedule Installation**: Assign installer to a sold system
- **View Claims**: Open warranty claims dashboard
- **Download Report**: Export monthly sales data

### User Roles & Dashboard Views
- **Sales Manager**: Focus on pipeline value, conversion rates, regional performance
- **Operations Manager**: Focus on installation schedules, installer performance, warranty rates
- **Executive**: High-level KPIs, revenue trends, growth metrics
- **Installer (Partner)**: Their assigned jobs, schedules, product inventory

---

## UI Pattern References

### KPI Cards - Animated Count-Up
**Reference**: `_reference/.midday-reference/apps/dashboard/src/components/animated-number.tsx`

**Pattern**: Use `@number-flow/react` for smooth animated count-up when values change.

```tsx
import NumberFlow from "@number-flow/react";

<NumberFlow
  value={totalKwh}
  format={{
    style: "decimal",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }}
  willChange
  locales="en"
/>
```

**Renoz Implementation**:
- Use `KpiCard` component from `renoz-v3/src/components/ui/kpi-card.tsx`
- Already supports trend indicators (up/down/neutral)
- Add `NumberFlow` for animated values in KPI cards
- Use `font-display` (Fraunces serif) for large numbers
- Bottom accent gradient bar (already in CSS)

### Charts - Recharts with Custom Tooltips
**Reference**: `_reference/.midday-reference/apps/dashboard/src/components/canvas/`

**Pattern**: Use Recharts library with custom styled tooltips, responsive containers.

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium">{payload[0].value} kWh</p>
    </div>
  );
};

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={monthlyData}>
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip content={<CustomTooltip />} />
    <Line type="monotone" dataKey="kwh" stroke="var(--color-primary-600)" />
  </LineChart>
</ResponsiveContainer>
```

**Chart Colors**:
- Use design system tokens: `--color-chart-1` through `--color-chart-6`
- Primary color: `--color-primary-600` (teal)
- Accent color: `--color-accent-500` (amber)

### Activity Feed - Virtualized List
**Reference**: Midday uses virtualized lists for performance with large datasets.

**Pattern**: Use `@tanstack/react-virtual` for activity feeds with 100+ items.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const rowVirtualizer = useVirtualizer({
  count: activities.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
});
```

### Real-Time Updates
**Reference**: Midday uses TanStack Query with polling/websockets.

**Pattern**: Use `refetchInterval` or subscribe to real-time events for dashboard KPIs.

```tsx
const { data: kpis } = useQuery({
  queryKey: ['dashboard', 'kpis'],
  queryFn: fetchKpis,
  refetchInterval: 30000, // 30 seconds
});
```

---

## Implementation Notes

### Design System Integration
All components must use tokens from `renoz-v3/src/styles.css`:

**Colors**:
- Background: `var(--background)` (stone-50)
- Cards: `var(--card)` (white with stone-200 border)
- Text: `var(--foreground)` (stone-900)
- Primary actions: `var(--primary)` (teal-600)
- Accent: `var(--accent)` (amber-500)

**Typography**:
- Display numbers: `var(--font-display)` (Fraunces serif)
- Body text: `var(--font-body)` (Plus Jakarta Sans)
- Data tables: `var(--font-mono)` with `tabular-nums` class

**Spacing**:
- Card padding: `var(--spacing-6)` (24px)
- Grid gaps: `var(--spacing-4)` (16px)
- Section margins: `var(--spacing-8)` (32px)

**Shadows**:
- Cards: `var(--shadow-sm)`
- Hover: `var(--shadow-md)`
- Primary CTAs: `var(--shadow-primary)` (colored shadow)

**Border Radius**:
- Cards: `var(--radius-xl)` (16px)
- Buttons: `var(--radius-lg)` (12px)
- Badges: `var(--radius-full)` (pill shape)

**Animations**:
- Duration: `var(--duration-base)` (150ms) for most transitions
- Easing: `var(--ease-out)` for smooth transitions
- Use `animate-fade-up` for page load stagger

### Component Structure
```
renoz-v3/src/components/domain/dashboard/
├── kpi-grid.tsx              # Grid of KPI cards
├── monthly-kwh-chart.tsx     # Line chart component
├── installer-growth-chart.tsx # Area chart component
├── product-mix-chart.tsx     # Pie/bar chart component
├── quick-actions.tsx         # CTA card grid
├── activity-feed.tsx         # Recent activity list
└── dashboard-layout.tsx      # Main layout wrapper
```

### Server Functions
```
renoz-v3/src/server/functions/dashboard.ts
├── getKpiMetrics()           # Aggregate KPIs from all domains
├── getMonthlyKwh()           # Sales data by month
├── getInstallerGrowth()      # Installer onboarding trends
├── getProductMix()           # Product sales breakdown
├── getRecentActivity()       # Latest system events
└── getQuickActions()         # Role-based action cards
```

### Data Aggregation Strategy
- Dashboard queries aggregate from: Customers, Inventory, Installers, Systems domains
- Use database views or materialized views for performance
- Cache expensive aggregations (30s-5min TTL based on data freshness needs)
- Implement role-based filtering at the query level

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/server/functions/dashboard.ts` | Dashboard server functions |
| `src/components/domain/dashboard/` | Dashboard UI components |
| `src/components/ui/kpi-card.tsx` | KPI card component (already exists) |
| `src/styles.css` | Design system tokens |
| `_reference/.midday-reference/apps/dashboard/` | UI pattern reference |

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. Run `npm run typecheck` to verify
5. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
6. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### DO
- Aggregate data from all domains
- Optimize for fast loading
- Support role-based widgets
- Use caching for expensive queries
- Use design system tokens consistently
- Implement animated count-ups for KPIs
- Use Recharts for all charts
- Virtualize long lists (>50 items)
- Add real-time updates for critical KPIs

### DON'T
- Make N+1 queries
- Block on slow calculations
- Hardcode colors (use CSS variables)
- Use inline styles (use design system classes)
- Fetch all data at once (lazy load charts)
- Skip loading states (use skeleton screens)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_DASHBOARD_COMPLETE</promise>
```

---

*Domain PRD - Dashboard and analytics*
