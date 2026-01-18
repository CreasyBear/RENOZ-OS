# Wireframe: DOM-SUPP-008 - Procurement Dashboard

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-008
> **Story Name**: Create Procurement Dashboard
> **Type**: UI Component
> **Component Type**: Dashboard with widget Cards and Charts
> **Last Updated**: 2026-01-10

---

## Overview

The Procurement Dashboard provides a centralized overview of all procurement activities including:
- Open PO count and pending receipts
- MTD spend with trend
- POs by status breakdown (chart)
- Top suppliers by volume
- Expected receipts calendar/list
- Quick actions (create PO, receive goods)
- Reorder suggestions widget

---

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Metric cards for KPIs (Open POs, Pending Receipts, Spend MTD)
  - Widget cards for each dashboard section
  - Responsive grid layout for card arrangements

### Chart
- **Pattern**: RE-UI Chart
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Donut chart for POs by status breakdown
  - Line chart for spend trend over 6 months
  - Bar chart for top suppliers comparison

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Expected receipts table with date grouping
  - Top suppliers table with ranking and metrics
  - Reorder alerts table grouped by supplier

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Alert count badges for reorder suggestions
  - Trend indicators (+12%, -5%) on metric cards
  - Status badges on PO breakdown

### Calendar
- **Pattern**: RE-UI Custom Component
- **Reference**: `_reference/.reui-reference/registry/default/ui/calendar.tsx`
- **Features**:
  - Monthly calendar view for expected receipts
  - Day cells with delivery count indicators
  - Interactive date selection

### Button
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-button.tsx`
- **Features**:
  - Quick action buttons (Create PO, Receive Goods)
  - Widget action buttons (View All, Create POs)
  - Primary/secondary button variants

---

## Mobile Wireframe (375px)

### Dashboard Overview

```
+=========================================+
| < Home                                  |
+-----------------------------------------+
| Procurement Dashboard                   |
| Manage your supply chain                |
+-----------------------------------------+
|                                         |
| +-----------------------------------+   |
| | OPEN POs              PENDING REC |   |
| | +---------------+ +---------------+   |
| | |      12       | |       5       |   |
| | |  $45,200      | |   Awaiting    |   |
| | +---------------+ +---------------+   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | SPEND MTD                         |   |
| | $125,450                    +12%  |   | <- vs prev month
| | [=====================     ]      |   |
| | Budget: $150,000                  |   |
| +-----------------------------------+   |
|                                         |
+-----------------------------------------+
|                                         |
| QUICK ACTIONS                           |
| +----------+ +----------+ +----------+  |
| |  Create  | | Receive  | | View All |  |
| |   PO     | |  Goods   | |   POs    |  |
| |   [+]    | |   [box]  | |   [>]    |  |
| +----------+ +----------+ +----------+  |
|                                         |
+-----------------------------------------+
|                                         |
| REORDER ALERTS                    [!]   |
| +-----------------------------------+   |
| | 12 items need reordering         |   |
| | Across 3 suppliers               |   |
| | Est. Value: $4,240               |   |
| | [View Suggestions]               |   |
| +-----------------------------------+   |
|                                         |
+-----------------------------------------+
|                                         |
| EXPECTED RECEIPTS                       |
| This Week                               |
|                                         |
| +-----------------------------------+   |
| | Today (Jan 15)                    |   |
| | --------------------------------- |   |
| | PO-2024-0145                      |   |
| | BYD Australia - $2,450             |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | Tomorrow (Jan 16)                 |   |
| | --------------------------------- |   |
| | PO-2024-0138                      |   |
| | Sungrow Australia - $3,200           |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | Thursday (Jan 18)                 |   |
| | --------------------------------- |   |
| | PO-2024-0142                      |   |
| | Growatt Pacific - $5,670 (partial)  |   |
| +-----------------------------------+   |
|                                         |
| [View All Expected Receipts]            |
|                                         |
+-----------------------------------------+
|                                         |
| TOP SUPPLIERS (This Month)              |
|                                         |
| +-----------------------------------+   |
| | 1. BYD Australia Supplies          |   |
| |    $35,000 | 8 orders | [****]    |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | 2. Sungrow Australia Inc             |   |
| |    $28,500 | 6 orders | [****]    |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | 3. Growatt Pacific Co               |   |
| |    $21,200 | 5 orders | [** ]     |   |
| +-----------------------------------+   |
|                                         |
| [View All Suppliers]                    |
|                                         |
+=========================================+
```

### Collapsible Sections (Mobile)

```
+=========================================+
|                                         |
| [v] REORDER ALERTS                [!]   | <- Collapsed header
|     12 items | $4,240                   |
|                                         |
| [^] POs BY STATUS                       | <- Expanded
| +-----------------------------------+   |
| |                                   |   |
| | Draft     [===       ]     5      |   |
| | Pending   [==        ]     3      |   |
| | Sent      [==========]    12      |   |
| | Partial   [=         ]     2      |   |
| | Received  [=========== ]  23      |   |
| |                                   |   |
| +-----------------------------------+   |
|                                         |
| [v] TOP SUPPLIERS                       | <- Collapsed
|     BYD Australia leads with $35K        |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Two-Column Layout

```
+================================================================+
| < Home                                                          |
+----------------------------------------------------------------+
| Procurement Dashboard                                           |
| Manage your supply chain                                        |
+----------------------------------------------------------------+
|                                                                 |
| +-- ROW 1: KEY METRICS ------------------------------------------+
| |                                                               |
| | +----------+ +----------+ +----------+ +----------+           |
| | | Open POs | | Pending  | | Spend    | | Budget   |           |
| | |    12    | | Receipt  | |  MTD     | | Remain   |           |
| | | $45,200  | |    5     | | $125,450 | | $24,550  |           |
| | |          | |          | |   +12%   | |          |           |
| | +----------+ +----------+ +----------+ +----------+           |
| |                                                               |
| +---------------------------------------------------------------+
|                                                                 |
| +-- QUICK ACTIONS -----------------------------------------------+
| |                                                               |
| | [+ Create PO]  [Receive Goods]  [View Suppliers]  [Reports]   |
| |                                                               |
| +---------------------------------------------------------------+
|                                                                 |
| +-- LEFT COLUMN -----------------+ +-- RIGHT COLUMN -------------+
| |                                | |                             |
| | REORDER ALERTS            [!]  | | POS BY STATUS               |
| | +----------------------------+ | | +-------------------------+ |
| | | 12 items from 3 suppliers  | | | |                         | |
| | | Est. Value: $4,240         | | | | [Donut Chart]           | |
| | |                            | | | |                         | |
| | | BYD Australia (4)    >      | | | | Draft: 5     Pending: 3 | |
| | | Growatt Pacific (3)   >      | | | | Sent: 12     Partial: 2 | |
| | | Sungrow Australia (5)  >      | | | | Received: 23            | |
| | |                            | | | +-------------------------+ |
| | | [View All Suggestions]     | | |                             |
| | +----------------------------+ | | [View All POs]              |
| |                                | |                             |
| | EXPECTED RECEIPTS              | | TOP SUPPLIERS               |
| | +----------------------------+ | | +-------------------------+ |
| | | Today                      | | | | BYD Australia    $35,000 | |
| | | PO-0145 | ABC | $2,450     | | | | Delta Plumb.    $28,500 | |
| | |                            | | | | Growatt Pacific   $21,200 | |
| | | Tomorrow                   | | | | CATL Energy.     $18,900 | |
| | | PO-0138 | Delta | $3,200   | | | | Trina Solar ANZ    $12,300 | |
| | |                            | | | +-------------------------+ |
| | | Thu Jan 18                 | | |                             |
| | | PO-0142 | XYZ | $5,670     | | | [View All Suppliers]        |
| | |                            | | |                             |
| | +----------------------------+ | +-----------------------------+
| |                                |                               |
| +--------------------------------+                               |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Dashboard Layout

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | Procurement Dashboard                               Last Updated: 2 min ago    |
| ----------- | Manage your supply chain                                                      |
| Procurement | -----------------------------------------------------------------------------------
|   Dashboard |                                                                                |
|   Suppliers | +-- KEY METRICS ROW --------------------------------------------------------+   |
|   Orders    | |                                                                           |   |
| Catalog     | | +-------------+ +-------------+ +-------------+ +-------------+ +---------+|
| Jobs        | | | OPEN POs    | | PENDING     | | SPEND MTD   | | BUDGET      | | LANDING ||
| Pipeline    | | |     12      | | RECEIPTS    | |             | | REMAINING   | |   %     ||
| Support     | | |   $45,200   | |      5      | |  $125,450   | |   $24,550   | |  12.4%  ||
|             | | |   +8% WoW   | |   Awaiting  | |   +12% MoM  | |   16.4%     | |  Avg    ||
|             | | +-------------+ +-------------+ +-------------+ +-------------+ +---------+|
|             | |                                                                           |   |
|             | +--------------------------------------------------------------------------+   |
|             |                                                                                |
|             | +-- QUICK ACTIONS -----------------------------------------------------------+  |
|             | |                                                                            |  |
|             | | [+ Create PO]  [Receive Goods]  [View Suppliers]  [Generate Report]        |  |
|             | |                                                                            |  |
|             | +----------------------------------------------------------------------------+  |
|             |                                                                                |
|             | +-- MAIN WIDGETS (3-column grid) -----------------------------------------------+
|             | |                                                                             |
|             | | +-- REORDER ALERTS -----+ +-- POS BY STATUS ----+ +-- EXPECTED RECEIPTS ---+|
|             | | |                       | |                      | |                       ||
|             | | | [!] 12 items need     | |    [Donut Chart]     | | CALENDAR VIEW         ||
|             | | | reordering            | |                      | |                       ||
|             | | |                       | |  Draft     5   11%   | | +---+---+---+---+---+ ||
|             | | | +-------------------+ | |  Pending   3    7%   | | |Mon|Tue|Wed|Thu|Fri| ||
|             | | | | Supplier | Items  | | |  Sent     12   27%   | | +---+---+---+---+---+ ||
|             | | | +---------+--------+ | |  Partial   2    4%   | | |   | 1 |   | 2 |   | ||
|             | | | | ABC     |   4    | | |  Received 23   51%   | | +---+---+---+---+---+ ||
|             | | | | XYZ     |   3    | | |                      | | | 1 |   |   |   |   | ||
|             | | | | Delta   |   5    | | | Total: 45 orders     | | +---+---+---+---+---+ ||
|             | | | +-------------------+ | |                      | |                       ||
|             | | |                       | | [View All POs]       | | Today: 1 expected     ||
|             | | | Est: $4,240           | |                      | | PO-0145 | ABC | $2.4K ||
|             | | |                       | +----------------------+ |                       ||
|             | | | [Create POs]          |                         | [View Calendar]        ||
|             | | +-----------------------+                         +-----------------------+|
|             | |                                                                             |
|             | | +-- TOP SUPPLIERS -----------+ +-- SPEND TREND --------------------+        |
|             | | |                            | |                                   |        |
|             | | | This Month by Volume       | | $150K |        _____             |        |
|             | | |                            | |       |   ____/     \            |        |
|             | | | 1. BYD Australia  $35,000   | | $100K |__/           \____       |        |
|             | | |    [==============] [****] | |       |                   \____  |        |
|             | | | 2. Delta Plumb.  $28,500   | |  $50K |                        \ |        |
|             | | |    [===========  ] [****]  | |       +---+---+---+---+---+---+ |        |
|             | | | 3. Growatt Pacific $21,200   | |        Jul Aug Sep Oct Nov Dec  |        |
|             | | |    [========     ] [** ]   | |                                   |        |
|             | | | 4. CATL Energy.   $18,900   | | --- Budget  --- Actual           |        |
|             | | |    [=======      ] [****]  | |                                   |        |
|             | | | 5. Trina Solar ANZ  $12,300   | +-----------------------------------+        |
|             | | |    [=====        ] [***]   |                                              |
|             | | |                            |                                              |
|             | | | [View All Suppliers]       |                                              |
|             | | +----------------------------+                                              |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

---

## Widget Specifications

### Open POs Widget

```
+-------------+
| OPEN POs    |
| +=========+ |
| |   12    | | <- Large number
| +---------+ |
| $45,200     | <- Total value
| +8% WoW     | <- Trend indicator (green up arrow)
+-------------+
  Click: Navigate to PO list filtered by open status
  aria-label: "12 open purchase orders worth $45,200, up 8% from last week"
```

### Pending Receipts Widget

```
+-------------+
| PENDING     |
| RECEIPTS    |
| +=========+ |
| |    5    | | <- Count of POs awaiting receipt
| +---------+ |
| Awaiting    |
| Delivery    |
+-------------+
  Click: Navigate to PO list filtered by sent status
```

### Spend MTD Widget

```
+-------------+
| SPEND MTD   |
| +=========+ |
| | $125,450| | <- Total spend this month
| +---------+ |
| +12% MoM    | <- vs previous month
| [=========] | <- Progress bar vs budget
| Budget: $150K|
+-------------+
  Click: Opens spend report
  aria-label: "Month to date spend $125,450, up 12% from last month, 84% of budget used"
```

### POs by Status Widget (Donut Chart)

```
+-- POS BY STATUS ------------------+
|                                   |
|        +-------------+            |
|       /   Draft: 5   \            |
|      /   Pending: 3   \           |
|     |    Sent: 12      |          |
|     |   Partial: 2     |          |
|      \  Received: 23  /           |
|       \             /             |
|        +-----+-----+              |
|              |                    |
|           Total: 45               |
|                                   |
| Legend:                           |
| [#] Draft      [#] Pending        |
| [#] Sent       [#] Partial        |
| [#] Received                      |
|                                   |
| [View All POs]                    |
+-----------------------------------+
  Interactive: Hover/click segments to filter
  aria-label: "Purchase orders by status. 45 total. 23 received, 12 sent, 5 draft, 3 pending, 2 partial"
```

### Reorder Alerts Widget

```
+-- REORDER ALERTS -----------------+
|                                   |
| [!] 12 items need reordering      |
|                                   |
| +-------------------------------+ |
| | Supplier         | Items | $  | |
| +-----------------+---------+---+ |
| | BYD Australia    |   4    | 1.2K|
| | Growatt Pacific   |   3    |  890|
| | Sungrow Australia  |   5    | 2.1K|
| +-------------------------------+ |
|                                   |
| Estimated Total: $4,240           |
|                                   |
| [View Suggestions]  [Create POs]  |
+-----------------------------------+
  Warning state: Orange border when items exist
  Empty state: Green checkmark "All stock healthy"
```

### Expected Receipts Widget

```
+-- EXPECTED RECEIPTS (Calendar) ---+
|                                   |
| << January 2026 >>                |
|                                   |
| +---+---+---+---+---+---+---+     |
| |Mon|Tue|Wed|Thu|Fri|Sat|Sun|     |
| +---+---+---+---+---+---+---+     |
| | 13| 14|[15]| 16| 17| 18| 19|    | <- [15] = today
| |   |   | 1 | 1 |   | 2 |   |     | <- Numbers = expected deliveries
| +---+---+---+---+---+---+---+     |
| | 20| 21| 22| 23| 24| 25| 26|     |
| |   | 1 |   |   | 3 |   |   |     |
| +---+---+---+---+---+---+---+     |
|                                   |
| TODAY (Jan 15):                   |
| PO-2024-0145 | BYD Australia       |
| 12 items | $2,450                 |
|                                   |
| [View Full Calendar]              |
+-----------------------------------+
  Click on day: Shows expected deliveries
  Click on PO: Navigate to PO detail
```

### Top Suppliers Widget

```
+-- TOP SUPPLIERS (This Month) -----+
|                                   |
| Ranked by order volume            |
|                                   |
| 1. BYD Australia Supplies          |
|    $35,000 (8 orders)             |
|    [====================] [****]  |
|                                   |
| 2. Sungrow Australia Inc             |
|    $28,500 (6 orders)             |
|    [================    ] [****]  |
|                                   |
| 3. Growatt Pacific Co               |
|    $21,200 (5 orders)             |
|    [============        ] [** ]   |
|                                   |
| 4. CATL Energytric                 |
|    $18,900 (4 orders)             |
|    [==========          ] [****]  |
|                                   |
| 5. Trina Solar ANZ                   |
|    $12,300 (3 orders)             |
|    [======              ] [***]   |
|                                   |
| [View All Suppliers]              |
+-----------------------------------+
  Bar shows relative volume
  Stars show performance rating
  Click: Navigate to supplier detail
```

### Spend Trend Widget

```
+-- SPEND TREND (6 Months) ---------+
|                                   |
| $150K |         ____              |
|       |    ____/    \             |
| $100K |___/          \____        |
|       |                   \____   |
|  $50K |                        \  |
|       +---+---+---+---+---+---+   |
|        Jul Aug Sep Oct Nov Dec    |
|                                   |
| --- Budget  --- Actual            |
|                                   |
| Current Month: $125,450           |
| vs Budget: -16.4%                 |
| vs Last Month: +12%               |
+-----------------------------------+
  Hover on point: Show month details
  Click: Opens spend report for that month
```

---

## Loading States

### Widget Skeletons

```
+-- WIDGET LOADING -----------------+
|                                   |
| +-------------------------------+ |
| | [shimmer==================]   | |
| | [shimmer========]             | |
| +-------------------------------+ |
|                                   |
| +-------------------------------+ |
| | [shimmer=====] | [shimmer===] | |
| | [shimmer=====] | [shimmer===] | |
| | [shimmer=====] | [shimmer===] | |
| +-------------------------------+ |
|                                   |
| [shimmer================]         |
+-----------------------------------+
  Each widget loads independently
  Stagger skeleton animation
```

### Chart Loading

```
+-- CHART LOADING ------------------+
|                                   |
|          +--------+               |
|         /          \              |
|        |  Loading   |             |
|        |    [...]   |             |
|         \          /              |
|          +--------+               |
|                                   |
| [shimmer======] [shimmer====]     |
| [shimmer======] [shimmer====]     |
+-----------------------------------+
```

---

## Empty States

### No Open POs

```
+-------------+
| OPEN POs    |
| +=========+ |
| |    0    | |
| +---------+ |
| [check]     |
| All caught  |
| up!         |
+-------------+
  Green checkmark, celebratory tone
```

### No Reorder Alerts

```
+-- REORDER ALERTS -----------------+
|                                   |
| [check] All Stock Levels Healthy  |
|                                   |
| No items need reordering at this  |
| time. Check back later.           |
|                                   |
| Last checked: 2 min ago           |
|                                   |
+-----------------------------------+
  Green background, checkmark icon
```

### No Expected Receipts

```
+-- EXPECTED RECEIPTS --------------+
|                                   |
| No deliveries expected this week  |
|                                   |
| Your next expected delivery is:   |
| Jan 24 | PO-2024-0155             |
|                                   |
+-----------------------------------+
```

---

## Error States

### Widget Error

```
+-- TOP SUPPLIERS ------------------+
|                                   |
| [!] Unable to load suppliers      |
|                                   |
| There was a problem fetching      |
| supplier data.                    |
|                                   |
| [Retry]                           |
|                                   |
+-----------------------------------+
  Error boundary isolates widget
  Other widgets continue to function
```

### Full Dashboard Error

```
+=========================================+
|                                         |
|           +-------------+               |
|           |    [!]      |               |
|           +-------------+               |
|                                         |
|   UNABLE TO LOAD DASHBOARD              |
|                                         |
|   There was a problem loading the       |
|   procurement dashboard.                |
|                                         |
|   [Retry]  [Contact Support]            |
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<main role="main" aria-label="Procurement dashboard">
  <h1>Procurement Dashboard</h1>

  <!-- Metrics Row -->
  <section role="region" aria-label="Key procurement metrics">
    <div role="status" aria-label="Open purchase orders">
      <span class="metric-value">12</span>
      <span class="metric-label">Open POs</span>
      <span class="metric-trend" aria-label="Up 8% from last week">+8%</span>
    </div>
    <!-- More metrics... -->
  </section>

  <!-- Quick Actions -->
  <nav role="navigation" aria-label="Quick actions">
    <a href="/procurement/orders/new" aria-label="Create new purchase order">
      Create PO
    </a>
    <!-- More actions... -->
  </nav>

  <!-- Widgets -->
  <section role="region" aria-label="Reorder alerts">
    <h2>Reorder Alerts</h2>
    <div role="alert" aria-live="polite">
      12 items need reordering
    </div>
    <table role="grid" aria-label="Items by supplier">
      <!-- Table content -->
    </table>
  </section>

  <section role="region" aria-label="Purchase orders by status">
    <h2>POs by Status</h2>
    <!-- Chart with aria-describedby for data summary -->
  </section>
</main>
```

### Keyboard Navigation

```
Tab Order:
1. Dashboard title (skip link target)
2. Metric cards (each focusable)
3. Quick action buttons
4. Widget 1 (Reorder Alerts)
   - Widget header
   - Table rows
   - Action buttons
5. Widget 2 (POs by Status)
   - Chart (with keyboard-accessible legend)
   - View All button
6. Widget 3 (Expected Receipts)
   - Calendar navigation
   - Day cells
   - PO links
7. Widget 4 (Top Suppliers)
   - Supplier rows
   - View All button
8. Widget 5 (Spend Trend)
   - Chart navigation points
```

### Screen Reader Announcements

```
On page load:
  "Procurement dashboard loaded. 12 open purchase orders,
   5 pending receipts, month-to-date spend $125,450."

On widget focus:
  "Reorder alerts widget. 12 items need reordering from 3 suppliers.
   Estimated total $4,240."

On chart interaction:
  "Purchase orders by status. 45 total orders.
   23 received, 12 sent, 5 draft, 3 pending, 2 partial."

On calendar day focus:
  "January 15, today. 1 expected delivery.
   PO-2024-0145 from BYD Australia, $2,450."
```

---

## Animation Choreography

### Dashboard Load

```
PAGE LOAD:
- Header: Fade in (0-150ms)
- Metrics row: Stagger fade in left to right (150-400ms)
- Quick actions: Slide up + fade (400-550ms)
- Widgets row 1: Stagger fade in (550-850ms)
- Widgets row 2: Stagger fade in (850-1100ms)

METRIC COUNTERS:
- Numbers: Count up from 0 (500ms per metric)
- Trend indicators: Fade in after count (200ms)
- Progress bars: Animate width (400ms)
```

### Widget Interactions

```
WIDGET HOVER:
- Duration: 150ms
- Transform: translateY(-2px)
- Shadow: Increase slightly
- Border: Highlight color

CHART SEGMENT HOVER:
- Segment: Scale 1.05 (150ms)
- Tooltip: Fade in (100ms)
- Other segments: Slight fade (opacity 0.7)

CALENDAR DAY HOVER:
- Background: Color transition (100ms)
- Indicator: Scale pulse (200ms)
```

### Data Refresh

```
AUTO-REFRESH (every 5 min):
- Indicator: Show in header
- Changed values: Flash highlight (300ms)
- Counters: Animate to new value (400ms)
```

---

## Component Props Interface

```typescript
// ProcurementDashboard.tsx
interface ProcurementDashboardProps {
  // Uses route loader data
}

// MetricCard.tsx
interface MetricCardProps {
  label: string;
  value: number | string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  progress?: {
    current: number;
    max: number;
    label: string;
  };
  onClick?: () => void;
  isLoading?: boolean;
}

// ReorderAlertsWidget.tsx
interface ReorderAlertsWidgetProps {
  suggestions: SupplierSuggestionGroup[];
  totalItems: number;
  totalValue: number;
  onViewSuggestions: () => void;
  onCreatePOs: () => void;
  isLoading?: boolean;
  error?: Error;
}

// POStatusChartWidget.tsx
interface POStatusChartWidgetProps {
  statusCounts: {
    draft: number;
    pending_approval: number;
    sent: number;
    partially_received: number;
    received: number;
    closed: number;
  };
  totalOrders: number;
  onStatusClick: (status: POStatus) => void;
  isLoading?: boolean;
  error?: Error;
}

// ExpectedReceiptsWidget.tsx
interface ExpectedReceiptsWidgetProps {
  viewMode: 'calendar' | 'list';
  receipts: Array<{
    date: Date;
    orders: Array<{
      id: string;
      poNumber: string;
      supplier: { id: string; name: string };
      value: number;
      itemCount: number;
      isPartial: boolean;
    }>;
  }>;
  onViewModeChange: (mode: 'calendar' | 'list') => void;
  onOrderClick: (orderId: string) => void;
  onViewAll: () => void;
  isLoading?: boolean;
  error?: Error;
}

// TopSuppliersWidget.tsx
interface TopSuppliersWidgetProps {
  period: 'week' | 'month' | 'quarter' | 'year';
  suppliers: Array<{
    id: string;
    name: string;
    totalValue: number;
    orderCount: number;
    rating: number;
    percentageOfTotal: number;
  }>;
  onSupplierClick: (supplierId: string) => void;
  onViewAll: () => void;
  isLoading?: boolean;
  error?: Error;
}

// SpendTrendWidget.tsx
interface SpendTrendWidgetProps {
  period: '3m' | '6m' | '12m';
  data: Array<{
    period: string;
    actual: number;
    budget: number;
  }>;
  currentMonth: {
    spend: number;
    budget: number;
    vsPrevMonth: number;
  };
  onPeriodChange: (period: '3m' | '6m' | '12m') => void;
  onPointClick: (period: string) => void;
  isLoading?: boolean;
  error?: Error;
}

// QuickActions.tsx
interface QuickActionsProps {
  actions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/dashboard.tsx` | Create | Dashboard page |
| `src/components/domain/procurement/widgets/metric-card.tsx` | Create | Metric display |
| `src/components/domain/procurement/widgets/reorder-alerts-widget.tsx` | Create | Reorder widget |
| `src/components/domain/procurement/widgets/po-status-chart.tsx` | Create | Donut chart |
| `src/components/domain/procurement/widgets/expected-receipts-widget.tsx` | Create | Calendar/list |
| `src/components/domain/procurement/widgets/top-suppliers-widget.tsx` | Create | Supplier ranking |
| `src/components/domain/procurement/widgets/spend-trend-widget.tsx` | Create | Trend chart |
| `src/components/domain/procurement/quick-actions.tsx` | Create | Action buttons |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard load | < 2s | All widgets visible |
| Individual widget | < 500ms | Widget rendered |
| Chart render | < 300ms | Animation complete |
| Metric update | < 200ms | Counter animation |
| Auto-refresh | < 1s | Data updated |
| Interaction response | < 100ms | Visual feedback |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
