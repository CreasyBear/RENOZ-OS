# Dashboard Chart Widgets Wireframe

**Story:** DOM-DASH-004b, DOM-DASH-005b
**Purpose:** Visual data representations for trends, distributions, and comparisons
**Design Aesthetic:** Data-rich scannable - clear charts with drill-down capability
**Version:** v1.1 - Added Renoz battery industry KPIs

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-004b, DOM-DASH-005b | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Key Products**: Tesla Powerwall, Pylontech US5000, BYD Battery-Box, Enphase Encharge
- **Regions**: NSW, VIC, QLD, WA, SA

---

## UI Patterns (Reference Implementation)

### Charts Architecture
- **Pattern**: Midday charts with Recharts
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/charts/`
  - `base-charts.tsx` - BaseChart, StyledArea, StyledLine, StyledXAxis, StyledYAxis, StyledTooltip
  - `revenue-chart.tsx` - Example line/area chart with target line
  - `category-expense-donut-chart.tsx` - Pie/donut chart pattern
  - `cash-flow-chart.tsx` - Bar chart pattern
- **Features**:
  - BaseChart wrapper for consistent margins, responsive container
  - StyledArea with gradient (`useGradient` prop) and pattern support
  - StyledLine for comparison lines (dashed for targets)
  - StyledTooltip with custom formatters per chart type
  - ReferenceLine at zero for context
  - ChartLegend component with solid/dashed indicators
  - Y-axis auto-scaling with `useChartMargin` hook
  - Currency/number formatting via `createYAxisTickFormatter`

### Chart Grid Layout
- **Pattern**: Midday metrics-grid adaptive layout
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/metrics/components/metrics-grid.tsx`
- **Features**:
  - First chart: full-width (hero position)
  - Remaining charts: 2-column grid on desktop (`grid-cols-1 lg:grid-cols-2 gap-6`)
  - Mobile: stacks to single column
  - Drag-and-drop reordering with @dnd-kit/core
  - SortableChartCard wrapper for drag handles
  - Customize mode with visual feedback

### Interactive Features
- **Pattern**: Midday chart selection and drill-down
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/charts/selectable-chart-wrapper.tsx`
- **Features**:
  - Click chart segments to filter/drill-down
  - ChartSelectionOverlay for visual feedback
  - Tooltip on hover with formatted values
  - Active segment highlighting
  - Navigation to detail views with preserved context

### Chart Container Pattern
- **Pattern**: Card-based chart widgets
- **Implementation**:
  ```tsx
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4" />
          <CardTitle>Chart Title</CardTitle>
        </div>
        <div className="flex gap-2">
          <DateRangePicker />
          <DropdownMenu /> {/* Options */}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <ChartLegend items={[...]} />
      <BaseChart data={data} height={320}>
        {/* Chart elements */}
      </BaseChart>
      <div className="mt-2 text-sm text-muted-foreground">
        Total: {formatAmount(total)}
      </div>
    </CardContent>
  </Card>
  ```

### Responsive Charts
- **Pattern**: Recharts ResponsiveContainer
- **Breakpoints**:
  - Desktop (1024px+): Full features, dual-axis support, detailed tooltips
  - Tablet (768px): Simplified tooltips, legend below chart
  - Mobile (<768px): Minimal legend, tap for details, larger touch targets
- **Height Management**:
  - Full charts: 320px default
  - Compact charts: 200-250px
  - Mobile: Reduced to 200px for easier scrolling

### Loading Skeletons
- **Pattern**: Shimmer placeholders matching chart dimensions
- **Implementation**:
  ```tsx
  {isLoading ? (
    <div className="space-y-2">
      <Skeleton className="h-[320px] w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  ) : (
    <Chart data={data} />
  )}
  ```

---

## Chart Widget Container

```
+================================================+
|  CHART WIDGET - STANDARD CONTAINER              |
+================================================+
|  +------------------------------------------+  |
|  | [Icon] Chart Title         [Date Range]  |  <- Header
|  |                            [...]  [Max]  |  <- Options menu, fullscreen
|  +------------------------------------------+  |
|  |                                          |  |
|  |                                          |  |
|  |         [CHART VISUALIZATION]            |  <- Main chart area
|  |                                          |  |
|  |                                          |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [Legend]  |  Total: $85,340   |  [Export] |  <- Footer with legend + summary
|  +------------------------------------------+  |
+================================================+
```

## Monthly kWh Shipped Chart (Line Chart)

```
+================================================+
|  Monthly kWh Shipped - FY 2025 (Jul-Jun)        |
+================================================+
|  +------------------------------------------+  |
|  | [Battery] kWh Shipped    [This Month v] [...]|  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |  2.8K |                           .---*  |  |
|  |       |                      .---'      |  |
|  |  2.4K |                 .---'           |  |
|  |       |            .---'                |  |
|  |  2.0K |       .---'                     |  |
|  |       |  .---'                          |  |
|  |  1.6K |.'                               |  |
|  |       +----+----+----+----+----+----+   |  |
|  |        Jul  Aug  Sep  Oct  Nov  Dec     |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [--] kWh Deployed (Total: 14,250 kWh)    |  |
|  +------------------------------------------+  |
+================================================+
```

### With Comparison Period Enabled

```
+================================================+
|  kWh Shipped - With Comparison                  |
+================================================+
|  +------------------------------------------+  |
|  | [Battery] kWh Shipped  [Compare: ON v]   |  |
|  |                        vs Last Year      |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |  3.0K |                           .---*  |  <- Current FY (solid)
|  |       |       ....           .---'      |  |
|  |  2.5K |   ....'    '.....---'           |  <- Last FY (dashed)
|  |       |  ..               ....          |  |
|  |  2.0K |.'                     '...      |  |
|  |       |                           '.    |  |
|  |  1.5K |                             '.. |  |
|  |       +----+----+----+----+----+----+   |  |
|  |        Jul  Aug  Sep  Oct  Nov  Dec     |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [--] This Year 14.25K kWh  [..] Last Year 11.8K kWh |  |
|  | [^] +20.8% growth year over year         |  |
|  +------------------------------------------+  |
+================================================+
```

## Orders by Product Category Chart (Pie/Donut Chart)

```
+================================================+
|  Orders by Product Category                     |
+================================================+
|  +------------------------------------------+  |
|  | [Battery] Orders by Category     [...]   |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |              +-------+                   |  |
|  |           .-'   45%  '-.                 |  <- Donut chart
|  |         .'   Battery    '.               |  |
|  |        /   +----------+   \              |  |
|  |       |    |   28     |    | 30%         |  <- Center shows total
|  |       | 15%|  Total   |    | Inverters   |  |
|  |        \   +----------+   /              |  |
|  |         '.   Solar   .'                  |  |
|  |           '-.  10% .-'                   |  |
|  |              Services                    |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [*] Battery Systems: 13  [*] Inverters: 8|  |
|  | [*] Solar: 4  [*] Services: 3            |  |
|  +------------------------------------------+  |
+================================================+
```

### Clickable Segments (Drill-Down) - Renoz Battery Products

```
Segment Click Behavior:

1. User clicks "Battery Systems" segment (45%)
2. Segment highlights with glow effect
3. Drill-down modal opens:

+================================================+
|  Orders - Battery Systems               [X Close]  |
+================================================+
|  13 battery system orders worth $125,400        |
+================================================+
|  +------------------------------------------+  |
|  | Product          | Customer    | kWh | $    |  |
|  |------------------|-------------|-----|------|  |
|  | Tesla Powerwall  | Brisbane SC | 50  |$12K  |  |
|  | Pylontech US5000 | Sydney ES   | 25  |$8.5K |  |
|  | BYD Battery-Box  | Perth R     | 15  |$6.2K |  |
|  | ...              | ...         | ... | ...  |  |
|  +------------------------------------------+  |
|  |            [View All in Orders]          |  |
+================================================+
|  [Export CSV]                      [Close]      |
+================================================+
```

## Pipeline Funnel Chart - Renoz Battery Sales

```
+================================================+
|  Pipeline Funnel - Quote to Installation        |
+================================================+
|  +------------------------------------------+  |
|  | [Funnel] Sales Pipeline          [...]   |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |  +------------------------------------+  |  |
|  |  |        Initial Quote: 45           |  |  <- Widest (100%)
|  |  |        $225,000 AUD                |  |  |
|  |  +------------------------------------+  |  |
|  |     +-----------------------------+      |  |
|  |     |     Follow-Up: 28           |      |  <- 62%
|  |     |     $168,000 AUD            |      |  |
|  |     +-----------------------------+      |  |
|  |        +----------------------+          |  |
|  |        |   Quote Sent: 15     |          |  <- 33%
|  |        |   $112,500 AUD       |          |  |
|  |        +----------------------+          |  |
|  |           +---------------+              |  |
|  |           |  Won: 8       |              |  <- 18%
|  |           |  $67,200 AUD  |              |  |
|  |           +---------------+              |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | Win Rate: 18%  |  Avg Deal: $8,400 AUD   |  |
|  +------------------------------------------+  |
+================================================+
```

### Funnel Stage Click (Drill-Down) - Renoz Installer Context

```
User clicks "Follow-Up: 28" stage:

+================================================+
|  Pipeline - Follow-Up Stage             [X Close]  |
+================================================+
|  28 opportunities worth $168,000 AUD            |
+================================================+
|  +------------------------------------------+  |
|  | Installer       | System | Value  | Days |  |
|  |-----------------|--------|--------|------|  |
|  | Brisbane Solar  | 50kWh  | $25K   | 14   |  |
|  | Sydney Energy   | 25kWh  | $18.5K | 7    |  |
|  | Perth Renew     | 75kWh  | $32K   | 21   |  |
|  | ...             | ...    | ...    | ...  |  |
|  +------------------------------------------+  |
|            [View All in Pipeline]              |
+================================================+
|  [Export CSV]                      [Close]      |
+================================================+
```

## Top Installers by kWh Deployed Chart (Horizontal Bar)

```
+================================================+
|  Top Installers by kWh Deployed                 |
+================================================+
|  +------------------------------------------+  |
|  | [Bar] Top Installers      [This Month v] |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  | Brisbane Solar Co   |==============| 185 kWh  |
|  |                                          |  |
|  | Sydney Energy Sys   |===========| 150 kWh     |
|  |                                          |  |
|  | Melbourne Power     |========| 120 kWh        |
|  |                                          |  |
|  | Perth Renewables    |======| 95 kWh           |
|  |                                          |  |
|  | Adelaide Battery    |====| 80 kWh             |
|  |                                          |  |
|  +------------------------------------------+  |
|  | Top 5 = 630 kWh (26% of total deployed)  |  |
|  +------------------------------------------+  |
+================================================+
```

## Stock Levels by Product Chart (Stacked Bar)

```
+================================================+
|  Stock Levels by Product Category               |
+================================================+
|  +------------------------------------------+  |
|  | [Stack] Stock Status              [...]  |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |                +----+                    |  |
|  | Tesla          |####|===|         45 units|  <- Stacked: In Stock | Low | Out
|  |                +----+---+                |  |
|  |                +--------+                |  |
|  | Pylontech      |########|==|      38 units|  |
|  |                +--------+--+             |  |
|  |                +------+                  |  |
|  | BYD            |######|=|         28 units|  |
|  |                +------+-+                |  |
|  |                +---------+               |  |
|  | Enphase        |#########|        22 units|  |
|  |                +---------+               |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [#] In Stock  [=] Low Stock  [!] Out     |  |
|  +------------------------------------------+  |
+================================================+
```

## Regional Sales Chart (Geographic Heat Map)

```
+================================================+
|  Sales by Australian State                      |
+================================================+
|  +------------------------------------------+  |
|  | [Map] Regional Sales         [This Quarter]|  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |       +------------------------+         |  |
|  |       |    Australia Map       |         |  |
|  |       |                        |         |  |
|  |       |  [QLD] - #########     |         |  <- Heat intensity
|  |       |  35% of sales          |         |
|  |       |                        |         |  |
|  |       |  [NSW] - ############  |         |  <- Darkest (highest)
|  |       |  40% of sales          |         |
|  |       |                        |         |  |
|  |       |  [VIC] - ######        |         |
|  |       |  15% of sales          |         |
|  |       |                        |         |  |
|  |       |  [WA] - ###            |         |
|  |       |  5% of sales           |         |
|  |       |                        |         |  |
|  |       |  [SA] - ###            |         |
|  |       |  5% of sales           |         |
|  |       +------------------------+         |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | NSW: $168K | QLD: $147K | VIC: $63K      |  |
|  | WA: $21K | SA: $21K                      |  |
|  +------------------------------------------+  |
+================================================+
```

## Chart Widget States

### Loading State

```
+------------------------------------------+
| [Icon] Chart Title             [...]     |
+------------------------------------------+
|                                          |
|    +----------------------------------+  |
|    |   [Shimmer animation]            |  |
|    |                                  |  |
|    |      Loading chart data...       |  |
|    |                                  |  |
|    |   [=====>                    ]   |  |
|    +----------------------------------+  |
|                                          |
+------------------------------------------+
```

### Error State

```
+------------------------------------------+
| [Icon] Chart Title             [!]       |
+------------------------------------------+
|                                          |
|    +----------------------------------+  |
|    |                                  |  |
|    |    [!] Unable to load chart      |  |
|    |                                  |  |
|    |    There was a problem loading   |  |
|    |    this chart data.              |  |
|    |                                  |  |
|    |    [Retry]  [Remove Widget]      |  |
|    +----------------------------------+  |
|                                          |
+------------------------------------------+
```

### No Data State

```
+------------------------------------------+
| [Icon] Chart Title                       |
+------------------------------------------+
|                                          |
|    +----------------------------------+  |
|    |                                  |  |
|    |    [Empty chart icon]            |  |
|    |                                  |  |
|    |    No data for this period       |  |
|    |                                  |  |
|    |    Try selecting a different     |  |
|    |    date range.                   |  |
|    |                                  |  |
|    |    [Change Date Range]           |  |
|    +----------------------------------+  |
|                                          |
+------------------------------------------+
```

## Chart Drill-Down Modal

```
+================================================================+
|  [Chart Title] - [Segment Name]                    [X Close]    |
+================================================================+
|  [Brief description of what's being shown]                      |
|  Date Range: Dec 1 - Dec 10, 2024                               |
+================================================================+
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |  DATA TABLE                                                |  |
|  +-----------------------------------------------------------+  |
|  | ID       | Name        | Value    | Status   | Date      |  |
|  |----------|-------------|----------|----------|-----------|  |
|  | XXX-001  | Item 1      | $1,234   | Active   | Dec 5     |  |
|  | XXX-002  | Item 2      | $2,345   | Pending  | Dec 6     |  |
|  | XXX-003  | Item 3      | $3,456   | Complete | Dec 7     |  |
|  | XXX-004  | Item 4      | $4,567   | Active   | Dec 8     |  |
|  | XXX-005  | Item 5      | $5,678   | Pending  | Dec 9     |  |
|  +-----------------------------------------------------------+  |
|  |                                              1-5 of 23    |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
|  [Export CSV]              [View All in {Domain}]    [Close]    |
+================================================================+
```

## Chart Comparison Mode UI

```
+------------------------------------------+
| [Icon] kWh Deployed Trend                |
| +--------------------------------------+ |
| | [Toggle: Compare]  [v Last Period ]  | |  <- Comparison controls
| | [ ] vs Last Period                   | |
| | [x] vs Same Period Last Year         | |
| +--------------------------------------+ |
+------------------------------------------+
|                                          |
|  [Chart with dual series shown]          |
|                                          |
|  Legend:                                 |
|  [--] This Period: 14,250 kWh            |
|  [..] Comparison: 11,800 kWh             |
|  [^] +20.8% growth                       |
|                                          |
+------------------------------------------+
```

## Chart Responsive Behavior

### Desktop (Full Features)

```
+------------------------------------------+
| Full chart with all features             |
| - Interactive tooltips on hover          |
| - Click segments for drill-down          |
| - Legend with toggle visibility          |
| - Export and fullscreen options          |
+------------------------------------------+
```

### Tablet (Simplified)

```
+------------------------------------------+
| Chart adapts to narrower width           |
| - Tooltips on tap                        |
| - Legend below chart (not side)          |
| - Essential controls only                |
+------------------------------------------+
```

### Mobile (Compact)

```
+----------------------------------+
| Chart scales to fit              |
| - Tap for detail overlay         |
| - No inline legend (show in      |
|   bottom sheet)                  |
| - Swipe to see more charts       |
+----------------------------------+
```

## Accessibility Requirements

### Chart ARIA Labels

```tsx
<div role="img" aria-label="Monthly kWh shipped chart showing 14,250 kWh total over 6 months with 20.8% growth">
  <ChartVisualization aria-hidden="true" />
  <table className="sr-only">
    <caption>kWh Shipped by Month</caption>
    <thead>
      <tr><th>Month</th><th>kWh</th></tr>
    </thead>
    <tbody>
      <tr><td>July</td><td>2,100 kWh</td></tr>
      <tr><td>August</td><td>2,200 kWh</td></tr>
      {/* ... */}
    </tbody>
  </table>
</div>
```

### Keyboard Navigation

```
Tab: Focus chart widget
Enter: Open drill-down for focused segment
Arrow keys: Navigate between segments
Escape: Close drill-down modal
```

### Color Contrast

```
All chart colors meet WCAG AA contrast:
- Primary series: #3b82f6 (blue)
- Comparison series: #94a3b8 (gray)
- Positive trend: #22c55e (green)
- Negative trend: #ef4444 (red)
- Warning: #f59e0b (amber)

Patterns used in addition to color:
- Solid vs dashed lines
- Different markers (circle, square, triangle)
- Distinct fills (solid, striped, dotted)
```

## Component Props Interface

```typescript
interface ChartWidgetProps {
  // Chart identification
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;

  // Data
  data: ChartDataPoint[];
  comparisonData?: ChartDataPoint[];

  // Chart type
  type: 'line' | 'bar' | 'pie' | 'funnel' | 'area' | 'stacked-bar';

  // Drill-down
  onSegmentClick?: (segment: ChartSegment) => void;
  drillDownConfig?: {
    enabled: boolean;
    entityType: string;
    filterKey: string;
  };

  // Comparison
  showComparison?: boolean;
  comparisonPeriod?: 'last-period' | 'same-period-last-year';

  // Display options
  showLegend?: boolean;
  showTotal?: boolean;
  dateRange?: { start: Date; end: Date };

  // States
  isLoading?: boolean;
  error?: Error | null;

  // Actions
  onExport?: () => void;
  onFullscreen?: () => void;
}

interface ChartSegment {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}
```

## Success Metrics

- Charts render within 500ms of data availability
- Drill-down modal opens within 200ms of click
- Chart interactions feel responsive (< 100ms feedback)
- Comparison data clearly distinguishable
- All segments accessible via keyboard
- Screen reader users can access all data via table
