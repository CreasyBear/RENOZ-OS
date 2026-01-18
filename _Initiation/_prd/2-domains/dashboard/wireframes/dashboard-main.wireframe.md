# Dashboard Domain Wireframe

**Route:** `/dashboard`
**Purpose:** Business intelligence and KPI tracking with configurable widgets for real-time visibility into business health
**Priority:** DOM-DASHBOARD (Phase: domain-system)
**Design Aesthetic:** Data-rich scannable - information density with clear hierarchy

---

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - KPI card containers with header, content, and footer sections
  - Widget containers for charts and tables
  - Consistent padding and elevation for visual hierarchy
  - Hover states for interactive widgets

### Chart (AreaChart, BarChart, LineChart, PieChart)
- **Pattern**: Midday Dashboard Charts (Tremor/Recharts)
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/charts/`
- **Features**:
  - Revenue trend line chart with area fill
  - Pipeline funnel visualization with stage progression
  - Orders status pie chart with segment interaction
  - Top customers horizontal bar chart with value labels
  - Responsive sizing and tooltip interactions

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - Widget category navigation (KPIs, Charts, Tables)
  - Layout density toggle (Compact, Default, Comfortable)
  - Active tab highlighting and keyboard navigation

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Widget catalog modal with search and categories
  - Widget configuration settings dialog
  - Customization panel for layout editing
  - Alert banner dialogs for contextual notifications

### DataTable (Sparkline variant)
- **Pattern**: Midday DataTable with Sparkline
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/tables/`
- **Features**:
  - Recent orders table with sortable columns
  - Inline sparkline charts in KPI cards
  - Row actions and quick view links
  - Responsive column hiding on smaller screens

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASHBOARD | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Layout Structure - Desktop (1200px+)

```
+================================================================================+
|  HEADER BAR                                                                    |
|  [Breadcrumb: Home > Dashboard]        [Date Range] [Compare] [Settings] [Help]|
+================================================================================+
|  WELCOME BANNER (Gradient Background)                                          |
|  +--------------------------------------------------------------------------+  |
|  |  Good morning, Joel            [Sales Rep]     | [Layout: Default v]    |  |
|  |  Here's what's happening with your business.   | [Auto-refresh: OFF]    |  |
|  |                                                | [Refresh] [Customize]  |  |
|  |  +--------+  +--------+  +--------+  +--------+                         |  |
|  |  |Monthly |  |Active  |  |Total   |  |Warranty|                         |  |
|  |  |Revenue |  |Install |  |kWh     |  |Claims  |                         |  |
|  |  |$85,340 |  |  12    |  | 450kWh |  |   3    |                         |  |
|  |  +--------+  +--------+  +--------+  +--------+                         |  |
|  +--------------------------------------------------------------------------+  |
+================================================================================+
|  ALERT BANNER (Contextual - shown when alerts exist)                           |
|  +--------------------------------------------------------------------------+  |
|  | [!] 5 warranties expiring soon | 3 issues need attention | [View All]    |  |
|  +--------------------------------------------------------------------------+  |
+================================================================================+
|  KPI METRICS ROW (5-column grid, sparklines)                                   |
|  +------------+ +------------+ +------------+ +------------+ +------------+    |
|  | Total kWh  | | Quote Win  | | Active     | | Monthly    | | Warranty   |    |
|  | Deployed   | | Rate       | | Projects   | | Revenue    | | Claims     |    |
|  | 2,450 kWh  | | 68%        | | 12         | | $85,340    | | 3          |    |
|  | +12.5% ^   | | +5% ^      | | +2 ^       | | +15.8% ^   | | -1 v       |    |
|  | [~~~~~]    | | [~~~~~]    | | [~~~~~]    | | [~~~~~]    | | [~~~~~]    |    |
|  +------------+ +------------+ +------------+ +------------+ +------------+    |
+================================================================================+
|  WIDGET GRID (12-column react-grid-layout)                                     |
|  +---------------------------+ +---------------------------+                   |
|  |  REVENUE TREND CHART      | |  ORDERS BY CATEGORY       |                   |
|  |  [Line Chart]             | |  [Pie Chart]              |                   |
|  |  Monthly revenue trend    | |  Battery Systems: 45%     |                   |
|  |  FY 2025 (Jul-Jun)        | |  Inverters: 30%           |                   |
|  |  [=====/=====]            | |  Solar Panels: 15%        |                   |
|  +---------------------------+ |  Services: 10%            |                   |
|  +---------------------------+ +---------------------------+                   |
|  |  PIPELINE FUNNEL          | |  TOP CUSTOMERS            |                   |
|  |  [Funnel Chart]           | |  [Bar Chart]              |                   |
|  |  Quote > Follow-up > Won  | |  Top 5 by kWh deployed    |                   |
|  |  Lead-to-order rate: 68%  | |  Brisbane Solar Co        |                   |
|  |  [>====>====>]            | |  Sydney Energy Systems    |                   |
|  +---------------------------+ +---------------------------+                   |
|  +---------------------------+ +---------------------------+                   |
|  |  RECENT PROJECTS          | |  ACTIVITY FEED            |                   |
|  |  [Table Widget]           | |  [Timeline]               |                   |
|  |  Quote | Customer    | kWh| |  - Quote sent: 15kWh     |                   |
|  |  QT-45 | Brisbane SC |50kWh| |  - Install complete: 10kWh|                   |
|  |  QT-46 | Sydney ES   |25kWh| |  - Warranty claim: PR-12  |                   |
|  +---------------------------+ +---------------------------+                   |
+================================================================================+
```

## Layout Structure - Tablet (768px - 1199px)

```
+================================================+
|  HEADER BAR                                    |
|  Dashboard          [Date] [Settings] [More v]  |
+================================================+
|  WELCOME BANNER                                |
|  +------------------------------------------+  |
|  |  Good morning, Joel        [Sales Rep]   |  |
|  |  +--------+ +--------+                   |  |
|  |  |Revenue | |Orders  |                   |  |
|  |  |$12,450 | |  15    |                   |  |
|  |  +--------+ +--------+                   |  |
|  |  +--------+ +--------+                   |  |
|  |  |Pipeline| |Issues  |                   |  |
|  |  |   23   | |   7    |                   |  |
|  |  +--------+ +--------+                   |  |
|  +------------------------------------------+  |
+================================================+
|  KPI ROW (scrollable horizontal)               |
|  +------+ +------+ +------+ +------+ +------+  |
|  |Cust. | |Pipe. | |Orders| |Rev.  | |Issue |  |
|  |1,234 | |$456K | |47    | |$12K  | |7     |  |
|  +------+ +------+ +------+ +------+ +------+  |
|  [<<<<<<<<< scroll indicator >>>>>>>>>]        |
+================================================+
|  WIDGET GRID (6-column layout)                 |
|  +----------------------+                      |
|  |  REVENUE TREND       | (full width)         |
|  +----------------------+                      |
|  +-----------+ +-----------+                   |
|  |  PIPELINE | | ORDERS    | (half width each) |
|  +-----------+ +-----------+                   |
|  +----------------------+                      |
|  |  RECENT ORDERS       | (full width)         |
|  +----------------------+                      |
+================================================+
```

## Layout Structure - Mobile (<768px)

```
+================================+
|  Dashboard       [=] [Settings] |
+================================+
|  Good morning, Joel             |
|  [Sales Rep]                    |
|  +----------------------------+ |
|  | Today's Revenue   $12,450  | |
|  | +15% vs last week          | |
|  +----------------------------+ |
+================================+
|  SWIPEABLE KPI CARDS            |
|  < +--------+ +--------+ ... >  |
|    |Revenue |                   |
|    |$12,450 |                   |
|    | +8.5%  |                   |
|    +--------+                   |
|  [o o o o o] (dots indicator)   |
+================================+
|  COLLAPSIBLE WIDGET LIST        |
|  +----------------------------+ |
|  | [v] Revenue Trend          | |
|  |     [Chart collapsed]      | |
|  +----------------------------+ |
|  +----------------------------+ |
|  | [>] Orders by Status       | |
|  +----------------------------+ |
|  +----------------------------+ |
|  | [>] Pipeline Funnel        | |
|  +----------------------------+ |
|  +----------------------------+ |
|  | [v] Recent Activity        | |
|  |     - John created order   | |
|  |     - Jane closed issue    | |
|  +----------------------------+ |
+================================+
|  [Pull to Refresh]              |
+================================+
```

## Visual Hierarchy Pyramid (Data-Rich Scannable)

**LEVEL 1 (Primary Focus):** KPI Metrics - Large numbers, trend indicators, sparklines
**LEVEL 2 (Key Insights):** Chart widgets - Visual patterns, comparisons, trends
**LEVEL 3 (Supporting Detail):** Tables and lists - Recent activity, orders, alerts
**LEVEL 4 (Context):** Controls and filters - Date range, comparison, customization

## Component Mapping

### PRIMARY: Existing Renoz Components

- **`shared/metrics/MetricsSummary`** - KPI cards with sparklines and trends
- **`domain/dashboard/widget-grid.tsx`** - Drag-drop widget layout (react-grid-layout)
- **`domain/dashboard/widgets/kpi-widget.tsx`** - Individual KPI cards
- **`domain/dashboard/widgets/chart-widget.tsx`** - Chart wrapper component
- **`domain/dashboard/widgets/revenue-chart.tsx`** - Revenue trend line chart
- **`domain/dashboard/widgets/orders-status-chart.tsx`** - Order status pie chart
- **`domain/dashboard/widgets/pipeline-funnel.tsx`** - Pipeline funnel visualization
- **`domain/dashboard/widgets/top-customers-chart.tsx`** - Top customers bar chart
- **`domain/dashboard/widgets/recent-orders-widget.tsx`** - Recent orders table
- **`domain/dashboard/widget-catalog.tsx`** - Widget selection dialog
- **`domain/dashboard/dashboard-context.tsx`** - Dashboard state management

### SECONDARY: shadcn/ui Components

- **`ui/card.tsx`** - Widget containers, KPI cards
- **`ui/button.tsx`** - Actions, toggles, customization
- **`ui/select.tsx`** - Date range presets, layout density
- **`ui/switch.tsx`** - Auto-refresh toggle, comparison mode
- **`ui/skeleton.tsx`** - Loading states for all widgets
- **`ui/alert.tsx`** - Contextual alerts banner

### CHARTING: Recharts Library

- **`LineChart`** - Revenue trends, time series
- **`PieChart`** - Status distributions
- **`BarChart`** - Top customers, comparisons
- **`AreaChart`** - Pipeline funnel (custom)
- **`Sparkline`** - Mini trends in KPI cards

## Role-Based Widget Arrangements

### Admin Dashboard (Full Access)

```
+----------------+----------------+----------------+----------------+
| KPI: Revenue   | KPI: Orders    | KPI: Pipeline  | KPI: Warranties|
+----------------+----------------+----------------+----------------+
| KPI: Issues    | KPI: Avg Order |                                 |
+----------------+----------------+---------------------------------+
|           Revenue Trend Chart (6 cols)          | Orders Status   |
|                                                 | Pie (4 cols)    |
+-------------------------------------------------+-----------------+
|           Pipeline Funnel (6 cols)              | Top Customers   |
|                                                 | Bar (4 cols)    |
+-------------------------------------------------+-----------------+
|                    Recent Orders Table (12 cols)                  |
+-------------------------------------------------------------------+
```

### Sales Dashboard (Revenue-Focused)

```
+----------------+----------------+----------------+
| KPI: Pipeline  | KPI: Revenue   | KPI: Avg Order |
+----------------+----------------+----------------+
|      Pipeline Funnel (6 cols)   | Revenue Trend  |
|                                 | (6 cols)       |
+---------------------------------+----------------+
|    Top Customers (6 cols)       | Stale Opps     |
|                                 | Table (6 cols) |
+---------------------------------+----------------+
```

### Operations/Warehouse Dashboard

```
+-------------------------------+----------------+
|  Today's Shipments (8 cols)   | KPI: Orders    |
|  [Priority fulfillment list]  | (4 cols)       |
+-------------------------------+----------------+
|   Orders by Status (6 cols)   | Inventory      |
|                               | Levels (6 cols)|
+-------------------------------+----------------+
|   Recent Orders (6 cols)      | Low Stock      |
|                               | Alerts (6 cols)|
+-------------------------------+----------------+
```

### Viewer Dashboard (Summary Only)

```
+----------------+----------------+----------------+
| KPI: Revenue   | KPI: Orders    | KPI: Pipeline  |
+----------------+----------------+----------------+
|           Revenue Trend Chart (12 cols)         |
+------------------------------------------------+
```

## Widget Catalog Structure

```
+==================================================+
|  Add Widget                           [X Close]   |
+==================================================+
|  [Search widgets...]                              |
+==================================================+
|  CATEGORY: KPI Widgets                            |
|  +------------+ +------------+ +------------+     |
|  | Revenue    | | Orders     | | Pipeline   |     |
|  | KPI        | | KPI        | | KPI        |     |
|  | [+ Add]    | | [+ Add]    | | [+ Add]    |     |
|  +------------+ +------------+ +------------+     |
|  +------------+ +------------+ +------------+     |
|  | Issues     | | Warranties | | Avg Order  |     |
|  | KPI        | | KPI        | | KPI        |     |
|  | [+ Add]    | | [+ Add]    | | [+ Add]    |     |
|  +------------+ +------------+ +------------+     |
+==================================================+
|  CATEGORY: Charts                                 |
|  +------------+ +------------+ +------------+     |
|  | Revenue    | | Orders     | | Pipeline   |     |
|  | Trend      | | Status     | | Funnel     |     |
|  | [+ Add]    | | [+ Add]    | | [+ Add]    |     |
|  +------------+ +------------+ +------------+     |
|  +------------+ +------------+                    |
|  | Top        | | Inventory  |                    |
|  | Customers  | | Levels     |                    |
|  | [+ Add]    | | [+ Add]    |                    |
|  +------------+ +------------+                    |
+==================================================+
|  CATEGORY: Tables & Lists                         |
|  +------------+ +------------+ +------------+     |
|  | Recent     | | Stale      | | Low Stock  |     |
|  | Orders     | | Pipeline   | | Items      |     |
|  | [+ Add]    | | [+ Add]    | | [+ Add]    |     |
|  +------------+ +------------+ +------------+     |
|  +------------+                                   |
|  | Today's    |                                   |
|  | Shipments  |                                   |
|  | [+ Add]    |                                   |
|  +------------+                                   |
+==================================================+
```

## Customization Controls

```
+==================================================================+
|  DASHBOARD HEADER CONTROLS                                        |
+==================================================================+
|  [Layout: [Compact] [Default] [Comfortable]]                      |
|                                                                   |
|  [Auto-refresh: [OFF] | [30s] | [1m] | [5m]]   [Refresh Now]     |
|                                                                   |
|  [Customize]  ->  Opens edit mode (drag-drop, resize, remove)     |
|  [Widgets]    ->  Opens visibility panel                          |
|  [Reset]      ->  Restores role default layout                    |
+==================================================================+
```

## Widget Visibility Panel

```
+----------------------------------+
|  Widget Visibility      [X]      |
+----------------------------------+
|  [x] Revenue KPI                 |
|  [x] Orders KPI                  |
|  [x] Pipeline KPI                |
|  [ ] Warranties KPI              |
|  [ ] Issues KPI                  |
|  ----------------------------    |
|  [x] Revenue Trend Chart         |
|  [x] Orders Status Chart         |
|  [ ] Pipeline Funnel             |
|  [ ] Top Customers               |
|  ----------------------------    |
|  [x] Recent Orders               |
|  [ ] Activity Feed               |
+----------------------------------+
|  [Show All]  [Hide All]  [Reset] |
+----------------------------------+
```

## Accessibility Standards (WCAG 2.1 AA)

### Keyboard Navigation

- **Tab Order:** Header controls > KPI cards > Widgets (reading order)
- **Widget Focus:** Each widget is a focusable region
- **Edit Mode:** Arrow keys for position, +/- for resize
- **Shortcuts:** `R` (refresh), `E` (edit mode), `C` (catalog)

### Screen Reader Support

```tsx
// KPI Card announcement
<div role="region" aria-label="Revenue KPI">
  <span aria-live="polite">Today's Revenue: $12,450, up 8.5% from last month</span>
</div>

// Widget grid navigation
<div role="grid" aria-label="Dashboard widgets">
  <div role="gridcell" aria-label="Revenue Trend Chart">...</div>
</div>

// Alerts
<div role="alert" aria-live="assertive">
  5 warranties expiring in the next 30 days
</div>
```

### Focus Management

- Focus visible on all interactive elements
- Focus trapped in modals (catalog, settings)
- Focus returns to trigger after modal close
- Skip link to main content

## Loading States

### Initial Load Skeleton

```
+----------------+ +----------------+ +----------------+
| [=========]    | | [=========]    | | [=========]    |
| [===========]  | | [===========]  | | [===========]  |
| [===]          | | [===]          | | [===]          |
+----------------+ +----------------+ +----------------+
+---------------------------+ +---------------------------+
| [=================================]                     |
| [=================================]                     |
| [=================================]                     |
+---------------------------+ +---------------------------+
```

### Widget Refresh Loading

```
+---------------------------+
| Revenue Trend     [...]   |  <- Spinner indicator
|  [Chart with opacity 0.5] |  <- Dimmed content
+---------------------------+
```

## Error States

### Widget Error

```
+---------------------------+
| Revenue Trend             |
+---------------------------+
|  [!] Unable to load data  |
|                           |
|  Check your connection    |
|  and try again.           |
|                           |
|  [Retry]  [Remove Widget] |
+---------------------------+
```

### Dashboard Load Error

```
+=====================================+
|          Dashboard                  |
+=====================================+
|                                     |
|  [!] Failed to load dashboard       |
|                                     |
|  We couldn't load your dashboard.   |
|  This might be a temporary issue.   |
|                                     |
|  [Retry]  [Use Default Layout]      |
|                                     |
+=====================================+
```

## Empty States

### No Widgets Configured

```
+=====================================+
|          Dashboard                  |
+=====================================+
|                                     |
|         [Empty dashboard icon]      |
|                                     |
|     No widgets configured           |
|                                     |
|  Add widgets to start tracking      |
|  your business metrics.             |
|                                     |
|  [+ Add Your First Widget]          |
|                                     |
+=====================================+
```

### No Data in Widget

```
+---------------------------+
| Revenue Trend             |
+---------------------------+
|                           |
|    [No data icon]         |
|                           |
|  No revenue data for      |
|  the selected period.     |
|                           |
|  [Change Date Range]      |
+---------------------------+
```

## Success Metrics

- Dashboard initial load < 2 seconds
- Widget refresh < 500ms
- Users can customize layout within 30 seconds
- All widgets display meaningful data at a glance
- Role-appropriate defaults reduce cognitive load
- Keyboard navigation complete without mouse

## Integration Points

- **DashboardContext:** Provides date range, filters, preferences
- **React Query:** Manages widget data fetching and caching
- **localStorage:** Persists layout preferences
- **Server Functions:** dashboard.server.ts for metrics aggregation
- **Role System:** Determines default widget configuration
