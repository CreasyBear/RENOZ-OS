# Support Dashboard Wireframe

**Story ID:** DOM-SUP-006
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Computed metrics tables (some new) | PARTIAL - issues EXISTS |
| **Server Functions Required** | Aggregation queries, real-time metrics calculation | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-006 | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Support Types**: Warranty claims, service requests, product questions
- **Priority**: low, normal, high, urgent

---

## UI Patterns (Reference Implementation)

### Metric Cards
- **Pattern**: RE-UI Card with counting number animation
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `counting-number.tsx`
- **Features**: Animated counter, sparkline charts, trend indicators (up/down arrows), status colors (green=success, red=warning)

### Status Badge
- **Pattern**: RE-UI Badge with variants
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**: Light/outline/ghost appearances, status colors (success/warning/destructive), size variants (xs/sm/md/lg)

### Charts
- **Pattern**: RE-UI Chart components (Recharts wrapper)
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**: Pie/donut, line, bar, area charts with tooltips, responsive design, animated entry

### Alert Banner
- **Pattern**: RE-UI Alert with actions
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**: Role="alert", dismissible, action buttons, variant colors

### Progress Indicators
- **Pattern**: RE-UI Progress (linear) or Meter
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`, `base-meter.tsx`
- **Features**: SLA health bars, percentage display, color-coded (green/yellow/red)

### Data Display
- **Pattern**: RE-UI DataGrid for team performance table
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**: Sorting, filtering, pagination, responsive columns

---

## Overview

The Support Dashboard provides a comprehensive view of support team performance and issue health. This wireframe covers:
- Issue metrics and SLA breaches
- Average resolution time tracking
- Issue breakdown by type, priority, status
- Team performance comparison
- Trend charts over time
- Quick actions for common tasks

---

## Desktop View (1280px+)

### Main Dashboard Layout

```
+================================================================================+
| HEADER BAR                                                      [bell] [Joel v] |
+================================================================================+
|                                                                                 |
| Support Dashboard                                        [Date Range v] [Export]|
| Track team performance and issue health                   Last 30 days          |
|                                                                                 |
+=== QUICK STATS (aria-live="polite") ==========================================+
| +------------------+ +------------------+ +------------------+ +---------------+ |
| | Open Issues      | | SLA Breaches     | | Avg Response     | | CSAT Score   | |
| | 47               | | 3                | | 2.4 hrs          | | 4.2 / 5.0    | |
| | +5 from yest.    | | [!] -2 from last | | -15% improved    | | +0.3 trend   | |
| | [~~~sparkline~~] | | [~~~sparkline~~] | | [~~~sparkline~~] | | [~~spark~~]  | |
| +------------------+ +------------------+ +------------------+ +---------------+ |
+=================================================================================+
|                                                                                 |
+=== ALERT BANNER (Conditional - shown when urgent items exist) =================+
| +-----------------------------------------------------------------------------+|
| | [!] 3 issues have breached SLA  |  2 escalated issues need attention        ||
| |                                                          [ View Details ]   ||
| +-----------------------------------------------------------------------------+|
+=================================================================================+
|                                                                                 |
| +== LEFT COLUMN (8 cols) =====================================================+|
| |                                                                             ||
| |  +-- ISSUES BY STATUS --------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  [Pie Chart / Donut]                                                 |  ||
| |  |                                                                      |  ||
| |  |      +---------------+                                               |  ||
| |  |      |   (  47   )   |        Open: 23                               |  ||
| |  |      |   (       )   |        In Progress: 12                        |  ||
| |  |      +---------------+        On Hold: 5                             |  ||
| |  |                               Escalated: 4                           |  ||
| |  |                               Resolved: 3                            |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- RESOLUTION TIME TREND ---------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  Avg Resolution Time (Last 30 Days)                                  |  ||
| |  |                                                                      |  ||
| |  |  [Line Chart]                                                        |  ||
| |  |        ^                                                             |  ||
| |  |   12h  |    .                                                        |  ||
| |  |        |   / \                                                       |  ||
| |  |   8h   |  /   \    .                                                 |  ||
| |  |        | /     \  / \  ___                                           |  ||
| |  |   4h   |/       \/   \/   \___                                       |  ||
| |  |        +--------------------------->                                 |  ||
| |  |        Week 1   Week 2   Week 3   Week 4                             |  ||
| |  |                                                                      |  ||
| |  |  Current Avg: 4.2 hrs  |  Target: 8 hrs  |  [*] On Track             |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- ISSUES BY TYPE ----------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  [Horizontal Bar Chart]                                              |  ||
| |  |                                                                      |  ||
| |  |  Claim      [######################] 28 (45%)                        |  ||
| |  |  Question   [##############] 18 (29%)                                |  ||
| |  |  Return     [#######] 9 (15%)                                        |  ||
| |  |  Other      [####] 7 (11%)                                           |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
| +== RIGHT COLUMN (4 cols) ====================================================+|
| |                                                                             ||
| |  +-- QUICK ACTIONS -----------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  [ + Create Issue ]                                                  |  ||
| |  |  [ View Issue Queue ]                                                |  ||
| |  |  [ View Escalated ]                                                  |  ||
| |  |  [ SLA Report ]                                                      |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- SLA HEALTH --------------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  Response SLA                                                        |  ||
| |  |  [#####################....] 87% Met                                 |  ||
| |  |                                                                      |  ||
| |  |  Resolution SLA                                                      |  ||
| |  |  [###################......] 79% Met                                 |  ||
| |  |                                                                      |  ||
| |  |  +------------------------------------------------+                  |  ||
| |  |  | At Risk: 8  |  Breached: 3  |  Paused: 2       |                  |  ||
| |  |  +------------------------------------------------+                  |  ||
| |  |                                                                      |  ||
| |  |  [ View SLA Details ]                                                |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- TEAM PERFORMANCE --------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  Top Performers This Period                                          |  ||
| |  |                                                                      |  ||
| |  |  1. Sarah K.    32 resolved  |  4.8 CSAT  |  3.2h avg                |  ||
| |  |  2. John D.     28 resolved  |  4.5 CSAT  |  4.1h avg                |  ||
| |  |  3. Mike J.     24 resolved  |  4.3 CSAT  |  5.5h avg                |  ||
| |  |                                                                      |  ||
| |  |  [ View Full Report ]                                                |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| |  +-- RECENT ACTIVITY ---------------------------------------------------+  ||
| |  |                                                                      |  ||
| |  |  [*] ISS-1250 resolved by Sarah K.                  2 min ago        |  ||
| |  |  [!] ISS-1248 escalated - VIP customer              15 min ago       |  ||
| |  |  [+] ISS-1252 created from Return template          30 min ago       |  ||
| |  |  [*] ISS-1245 resolved by John D.                   1 hour ago       |  ||
| |  |                                                                      |  ||
| |  |  [ View All Activity ]                                               |  ||
| |  |                                                                      |  ||
| |  +----------------------------------------------------------------------+  ||
| |                                                                             ||
| +============================================================================+||
|                                                                                 |
+=================================================================================+
```

### Priority Distribution Widget

```
+-- ISSUES BY PRIORITY -------------------------------------------------+
|                                                                       |
|  [Stacked Bar or Pie]                                                 |
|                                                                       |
|  Urgent    [####] 6 (10%)      [!] 2 at risk                          |
|  High      [##########] 15 (24%)                                      |
|  Medium    [########################] 35 (56%)                        |
|  Low       [####] 6 (10%)                                             |
|                                                                       |
+-----------------------------------------------------------------------+
```

### CSAT Trend Widget

```
+-- CSAT TREND (Last 12 Weeks) -----------------------------------------+
|                                                                       |
|  [Area Chart]                                                         |
|       ^                                                               |
|  5.0  |                                           ____               |
|       |                                     ____/    \              |
|  4.0  |    ____       ____          ____/            \____          |
|       |   /    \_____/    \____/                                     |
|  3.0  |  /                                                           |
|       +---------------------------------------------------------->   |
|          W1    W3    W5    W7    W9    W11                           |
|                                                                       |
|  Current: 4.2  |  Target: 4.0  |  Trend: +0.3                        |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Tablet View (768px)

```
+================================================================+
| Support Dashboard                      [Date Range v] [Export]  |
| Last 30 days                                                    |
+================================================================+
|                                                                 |
| +----------+ +----------+ +----------+ +----------+             |
| | Open     | | SLA      | | Avg Resp | | CSAT     |             |
| | 47       | | 3        | | 2.4h     | | 4.2      |             |
| | +5       | | [!] -2   | | -15%     | | +0.3     |             |
| +----------+ +----------+ +----------+ +----------+             |
|                                                                 |
| [!] 3 SLA breaches  |  2 escalated        [ View Details ]      |
|                                                                 |
+================================================================+
|                                                                 |
| QUICK ACTIONS                                                   |
| [+ Create] [Queue] [Escalated] [SLA Report]                     |
|                                                                 |
+================================================================+
|                                                                 |
| +-- ISSUES BY STATUS -----------------------------------------+ |
| |                                                             | |
| |     (Donut Chart)          Open: 23                         | |
| |                            In Progress: 12                  | |
| |                            On Hold: 5                       | |
| |                            Escalated: 4                     | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-- RESOLUTION TIME ------------------------------------------+ |
| |                                                             | |
| |  [Compact Line Chart]                                       | |
| |                                                             | |
| |  Current: 4.2h  |  Target: 8h  |  [*] On Track              | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-- SLA HEALTH -----------------------------------------------+ |
| |                                                             | |
| |  Response: [###################] 87%                        | |
| |  Resolution: [#################] 79%                        | |
| |                                                             | |
| |  At Risk: 8  |  Breached: 3  |  Paused: 2                   | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-- TEAM PERFORMANCE -----------------------------------------+ |
| |                                                             | |
| |  1. Sarah K.  32 resolved  4.8 CSAT                         | |
| |  2. John D.   28 resolved  4.5 CSAT                         | |
| |  3. Mike J.   24 resolved  4.3 CSAT                         | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### Mobile Dashboard

```
+================================+
| Support Dashboard         [=]  |
+================================+
| Last 30 days           [Date v]|
+================================+
|                                |
| OVERVIEW                       |
|                                |
| +----------------------------+ |
| | Open Issues                | |
| | 47                    +5   | |
| | [~~~sparkline~~~~~~~~~~~]  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | SLA Breaches               | |
| | 3                   [!] -2 | |
| | [~~~sparkline~~~~~~~~~~~]  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Avg Response Time          | |
| | 2.4 hrs             -15%   | |
| | [~~~sparkline~~~~~~~~~~~]  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | CSAT Score                 | |
| | 4.2 / 5.0           +0.3   | |
| | [~~~sparkline~~~~~~~~~~~]  | |
| +----------------------------+ |
|                                |
+================================+
|                                |
| [!] ALERTS (5)            [>]  |
| 3 SLA breaches, 2 escalated    |
|                                |
+================================+
|                                |
| QUICK ACTIONS                  |
|                                |
| +------------+ +------------+  |
| | [+]        | | [queue]    |  |
| | Create     | | Queue      |  |
| +------------+ +------------+  |
|                                |
| +------------+ +------------+  |
| | [!]        | | [chart]    |  |
| | Escalated  | | Reports    |  |
| +------------+ +------------+  |
|                                |
+================================+
|                                |
| ISSUES BY STATUS          [>]  |
|                                |
| +----------------------------+ |
| | Open          [####] 23    | |
| | In Progress   [##] 12      | |
| | On Hold       [#] 5        | |
| | Escalated     [#] 4        | |
| +----------------------------+ |
|                                |
+================================+
|                                |
| SLA HEALTH                [>]  |
|                                |
| Response SLA                   |
| [#################] 87%        |
|                                |
| Resolution SLA                 |
| [###############] 79%          |
|                                |
| At Risk: 8 | Breached: 3       |
|                                |
+================================+
|                                |
| TOP PERFORMERS            [>]  |
|                                |
| 1. Sarah K.  32 res  4.8 CSAT  |
| 2. John D.   28 res  4.5 CSAT  |
| 3. Mike J.   24 res  4.3 CSAT  |
|                                |
+================================+
```

### Mobile Alerts Expanded

```
+================================+
| < Alerts (5)                   |
+================================+
|                                |
| SLA BREACHES (3)               |
|                                |
| +----------------------------+ |
| | [X] ISS-1235               | |
| | Warranty claim - BMS fault             | |
| | Breached: 2h ago           | |
| | [View]                     | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [X] ISS-1240               | |
| | Warranty claim             | |
| | Breached: 45m ago          | |
| | [View]                     | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [X] ISS-1242               | |
| | Product question           | |
| | Breached: 15m ago          | |
| | [View]                     | |
| +----------------------------+ |
|                                |
| ESCALATED (2)                  |
|                                |
| +----------------------------+ |
| | [!] ISS-1248               | |
| | VIP customer issue         | |
| | Escalated: 15m ago         | |
| | [View]                     | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [!] ISS-1250               | |
| | Repeated complaint         | |
| | Escalated: 2h ago          | |
| | [View]                     | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Widget States

### Metric Card States

```
+-- POSITIVE TREND ------------------------------+
|  Open Issues                                   |
|  47                                            |
|  +5 from yesterday                             |
|  [green up arrow] or neutral indicator         |
|  Sparkline: upward trend (context-dependent)   |
|  Background: white                             |
+-------------------------------------------------+

+-- NEGATIVE TREND (Warning) --------------------+
|  SLA Breaches                                  |
|  3                                             |
|  [!] +2 from yesterday                         |
|  [red warning indicator]                       |
|  Sparkline: upward trend (bad in this context) |
|  Background: red-50 (subtle warning)           |
|  Border-left: 3px solid red-500                |
+-------------------------------------------------+

+-- POSITIVE TREND (Good) -----------------------+
|  CSAT Score                                    |
|  4.2 / 5.0                                     |
|  +0.3 trend                                    |
|  [green up arrow]                              |
|  Sparkline: upward trend                       |
|  Background: green-50 (subtle success)         |
+-------------------------------------------------+

+-- IMPROVEMENT (Goal Met) ----------------------+
|  Avg Response Time                             |
|  2.4 hrs                                       |
|  -15% improved                                 |
|  [green checkmark] Below target                |
|  Sparkline: downward trend (good for time)     |
|  Background: green-50                          |
+-------------------------------------------------+
```

---

## Loading States

### Dashboard Loading

```
+================================================================================+
| Support Dashboard                                        [Date Range] [Export]  |
+================================================================================+
|                                                                                 |
| +------------------+ +------------------+ +------------------+ +---------------+ |
| | [shimmer~~~~~~]  | | [shimmer~~~~~~]  | | [shimmer~~~~~~]  | | [shimmer~~~] | |
| | [shimmer~~~]     | | [shimmer~~~]     | | [shimmer~~~]     | | [shimmer~]   | |
| | [shimmer~~~~~~~] | | [shimmer~~~~~~~] | | [shimmer~~~~~~~] | | [shimmer~~~] | |
| +------------------+ +------------------+ +------------------+ +---------------+ |
|                                                                                 |
| +-- ISSUES BY STATUS (Loading) -----------------------------------------------+ |
| |                                                                             | |
| |     [shimmer circle]            [shimmer~~~~~~~~~~~]                        | |
| |                                 [shimmer~~~~~~~]                            | |
| |                                 [shimmer~~~~~~~~~]                          | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- RESOLUTION TIME (Loading) ------------------------------------------------+ |
| |                                                                             | |
| |  [shimmer chart area~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]         | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

### Widget Refresh

```
+-- ISSUES BY STATUS (Refreshing) --------------------------------------+
|                                                                       |
|  [Spinner in corner]                                                  |
|                                                                       |
|  [Chart visible but dimmed - opacity 0.6]                             |
|                                                                       |
|  Chart remains visible during refresh for continuity                  |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Empty States

### No Issues in Period

```
+-- ISSUES BY STATUS (Empty) -------------------------------------------+
|                                                                       |
|                    [illustration]                                     |
|                                                                       |
|              No issues in this period                                 |
|                                                                       |
|    Try selecting a different date range                               |
|    or create your first issue.                                        |
|                                                                       |
|    [ + Create Issue ]                                                 |
|                                                                       |
+-----------------------------------------------------------------------+
```

### No Team Data

```
+-- TEAM PERFORMANCE (Empty) -------------------------------------------+
|                                                                       |
|                    [illustration]                                     |
|                                                                       |
|           No performance data available                               |
|                                                                       |
|    Team performance will appear once                                  |
|    issues are assigned and resolved.                                  |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Error States

### Widget Error

```
+-- RESOLUTION TIME TREND (Error) --------------------------------------+
|                                                                       |
|  [!] Unable to load chart                                             |
|                                                                       |
|  There was a problem loading resolution time data.                    |
|                                                                       |
|  [Retry]                                                              |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Dashboard Load Error

```
+================================================================================+
| Support Dashboard                                                               |
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  |     [!] Dashboard Failed to Load                                         |  |
|  |                                                                          |  |
|  |     We couldn't load the support dashboard.                              |  |
|  |     Please check your connection and try again.                          |  |
|  |                                                                          |  |
|  |     [Retry]  [Go to Issue Queue]                                         |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+=================================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// Dashboard Page
<main role="main" aria-label="Support dashboard">
  <h1>Support Dashboard</h1>

  // Metrics Row
  <section role="region" aria-label="Key performance metrics">
    <div
      role="status"
      aria-live="polite"
      aria-label="Open issues: 47, up 5 from yesterday"
    >
      <span className="metric-value">47</span>
      <span className="metric-label">Open Issues</span>
      <span className="metric-trend">+5 from yesterday</span>
    </div>
    // ... more metrics
  </section>

  // Alert Banner
  <div
    role="alert"
    aria-live="assertive"
  >
    3 issues have breached SLA. 2 escalated issues need attention.
  </div>

  // Charts
  <section
    role="region"
    aria-label="Issues by status chart"
  >
    <h2>Issues by Status</h2>
    <div
      role="img"
      aria-label="Pie chart showing 23 open, 12 in progress,
                  5 on hold, 4 escalated, 3 resolved issues"
    >
      // Chart component
    </div>
    // Screen reader accessible table alternative
    <table className="sr-only">
      <caption>Issues by Status</caption>
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>
        <tr><td>Open</td><td>23</td></tr>
        <tr><td>In Progress</td><td>12</td></tr>
        // ...
      </tbody>
    </table>
  </section>
</main>
```

### Keyboard Navigation

```
Dashboard Page:
1. Tab to date range selector
2. Tab to export button
3. Tab to each metric card (focusable, announced)
4. Tab to alert banner actions
5. Tab to quick action buttons
6. Tab to each widget (focusable region)
7. Within widget: Tab to interactive elements (View Details links)

Metric Cards:
- Focus shows visible outline
- Enter/Space on card navigates to related detail view
- Arrow keys not used (tab navigation only)

Charts:
- Focus on chart region announces summary
- Enter opens detailed view or data table
- Escape returns focus to chart
```

### Screen Reader Announcements

```
On page load:
  "Support dashboard. Open issues: 47. SLA breaches: 3.
   Average response time: 2.4 hours. CSAT score: 4.2 out of 5."

On alert:
  "Alert: 3 issues have breached their SLA target.
   2 escalated issues require attention."

On metric update:
  "Open issues updated to 48. Increase of 1 from previous count."

On chart hover/focus:
  "Open status: 23 issues, 37 percent of total."

On date range change:
  "Dashboard updated for last 7 days. Open issues: 23.
   SLA breaches: 1."
```

---

## Animation Choreography

### Dashboard Load Sequence

```
Page Load Animation:

FRAME 1 (0ms):
  Skeleton placeholders for all elements

FRAME 2 (200ms):
  Header and date range appear

FRAME 3 (300-500ms):
  Metric cards fade in left-to-right (staggered 50ms each)

FRAME 4 (500-700ms):
  Alert banner slides down (if present)

FRAME 5 (700-1000ms):
  Charts fade in and animate (pie chart segments, line chart draws)

FRAME 6 (1000-1200ms):
  Quick actions and sidebar content fade in

Total Duration: ~1200ms
```

### Metric Card Counter Animation

```
Number Animation:

FRAME 1: Previous value displayed (or 0 on initial load)
FRAME 2: Number counts up/down to new value
FRAME 3: Trend indicator appears with slide animation
FRAME 4: Sparkline draws in

Duration: 500ms for counter
Easing: ease-out for numbers
```

### Chart Animations

```
Pie Chart Animation:
- Segments draw in clockwise from 12 o'clock
- Duration: 600ms
- Easing: ease-out

Line Chart Animation:
- Line draws left-to-right
- Points appear after line reaches them
- Duration: 800ms
- Easing: ease-in-out

Bar Chart Animation:
- Bars grow from 0 to value
- Staggered: 100ms between bars
- Duration: 400ms per bar
```

### Real-time Update

```
Live Update Animation:

When data updates:
FRAME 1: Brief pulse/glow on affected widget header
FRAME 2: Values animate to new numbers
FRAME 3: Charts smoothly transition

Duration: 300ms
No jarring refreshes - smooth transitions only
```

---

## Component Props Interface

```typescript
// Dashboard Page
interface SupportDashboardProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
}

interface DateRange {
  start: Date;
  end: Date;
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'custom';
}

// Metric Card
interface MetricCardProps {
  title: string;
  value: number | string;
  previousValue?: number | string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string; // "+5", "-15%", etc.
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  sparklineData?: number[];
  status?: 'normal' | 'warning' | 'critical' | 'success';
  onClick?: () => void;
  isLoading?: boolean;
}

// Alert Banner
interface AlertBannerProps {
  alerts: Array<{
    type: 'sla_breach' | 'escalation' | 'low_csat';
    count: number;
    message: string;
  }>;
  onViewDetails: () => void;
  onDismiss?: () => void;
}

// Issues By Status Widget
interface IssuesByStatusWidgetProps {
  data: Array<{
    status: IssueStatus;
    count: number;
    percentage: number;
  }>;
  onStatusClick?: (status: IssueStatus) => void;
  isLoading?: boolean;
  error?: Error;
}

// Resolution Time Widget
interface ResolutionTimeWidgetProps {
  chartData: Array<{
    period: string;
    value: number; // hours
  }>;
  currentAvg: number;
  target: number;
  trend: number; // percentage change
  isLoading?: boolean;
  error?: Error;
}

// Issues By Type Widget
interface IssuesByTypeWidgetProps {
  data: Array<{
    type: IssueType;
    count: number;
    percentage: number;
  }>;
  onTypeClick?: (type: IssueType) => void;
  isLoading?: boolean;
}

// SLA Health Widget
interface SLAHealthWidgetProps {
  responseSLA: {
    percentage: number;
    met: number;
    total: number;
  };
  resolutionSLA: {
    percentage: number;
    met: number;
    total: number;
  };
  atRiskCount: number;
  breachedCount: number;
  pausedCount: number;
  onViewDetails: () => void;
  isLoading?: boolean;
}

// Team Performance Widget
interface TeamPerformanceWidgetProps {
  performers: Array<{
    userId: string;
    name: string;
    avatar?: string;
    resolvedCount: number;
    csatScore: number;
    avgResolutionTime: number; // hours
  }>;
  period: string;
  onViewFullReport: () => void;
  isLoading?: boolean;
}

// Quick Actions
interface QuickActionsProps {
  actions: Array<{
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
    badge?: number;
  }>;
}

// Recent Activity Widget
interface RecentActivityWidgetProps {
  activities: Array<{
    id: string;
    type: 'created' | 'resolved' | 'escalated' | 'commented';
    issueId: string;
    issueSummary: string;
    actor: string;
    timestamp: Date;
  }>;
  onViewAll: () => void;
  onActivityClick: (issueId: string) => void;
  isLoading?: boolean;
}

// CSAT Trend Widget
interface CSATTrendWidgetProps {
  chartData: Array<{
    period: string;
    score: number;
  }>;
  currentScore: number;
  targetScore: number;
  trend: number;
  isLoading?: boolean;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard initial load | < 2s | Time to interactive |
| Metric cards render | < 500ms | All 4 cards visible |
| Chart render | < 1s | Chart fully animated |
| Date range change | < 1s | Full dashboard refresh |
| Real-time update | < 500ms | Data change to display |
| Export generation | < 3s | Start to download |

---

## Related Wireframes

- [Issue List](./support-issue-list.wireframe.md) - Queue view
- [SLA Tracking](./support-sla-tracking.wireframe.md) - SLA details
- [CSAT Feedback](./support-csat-feedback.wireframe.md) - CSAT metrics

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
