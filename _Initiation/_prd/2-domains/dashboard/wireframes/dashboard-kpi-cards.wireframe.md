# Dashboard KPI Cards Wireframe

**Story:** DOM-DASH-002b, DOM-DASH-003d, DOM-DASH-004a
**Purpose:** Key Performance Indicator cards with sparklines, trends, targets, and drill-down capability
**Design Aesthetic:** Data-rich scannable - maximum information density with clear hierarchy
**Version:** v1.1 - Added Renoz battery industry KPIs

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-002b, DOM-DASH-003d, DOM-DASH-004a | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Key Metrics**: kWh deployed, systems sold, installer activity, warranty claims

---

## UI Patterns (Reference Implementation)

### KPI Display & Animation
- **Pattern**: Midday BaseWidget with animated count-up
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/widgets/`
  - `base.tsx` - Base widget container with icon, title, description, actions
  - `revenue-summary.tsx` - Number formatting with FormatAmount
  - Widget architecture: Icon + Title + Value + Description + Actions pattern
- **Features**:
  - Count-up animation on load (CSS transitions, not JS counters for performance)
  - Trend indicator with icon (TrendingUp, TrendingDown, Minus)
  - Click handlers for drill-down navigation
  - Consistent spacing: gap-2 for flex columns
  - Text hierarchy: title (text-sm text-[#666666]), value (text-2xl font-normal)
  - Polling support via WIDGET_POLLING_CONFIG for real-time updates

### Widget Grid Layout
- **Pattern**: Midday widgets-grid with dnd-kit
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/widgets/widgets-grid.tsx`
- **Features**:
  - Desktop: 4-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6`)
  - Mobile: Horizontal scroll with snap (`overflow-x-auto snap-x snap-mandatory`)
  - Mobile card width: `w-[calc(100vw-2rem)]` with `snap-center`
  - Drag-and-drop reordering with @dnd-kit/core
  - Customize mode with wiggle animation (`wiggle-1` through `wiggle-8` classes)
  - ErrorBoundary wrapping each widget for resilience
  - DragOverlay with shadow effects during drag
  - Two sections: primary (visible) and available (dimmed, opacity-60)

### Sparklines
- **Pattern**: Recharts Area/Line with minimal styling
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/charts/revenue-chart.tsx`
- **Features**:
  - BaseChart wrapper with consistent margins
  - StyledArea with gradient support (`useGradient` prop)
  - ReferenceLine at zero for context
  - Custom tooltip with StyledTooltip component
  - Responsive height defaults (320px for full charts)
  - For KPI cards: smaller inline sparklines (height: 32-40px)

### Number Formatting
- **Pattern**: Midday FormatAmount utility
- **Reference**: `@/utils/format` in Midday codebase
- **Implementation**: Use Intl.NumberFormat with currency, locale, maximumFractionDigits
- **Examples**:
  - Revenue: `formatAmount({ amount, currency: 'AUD', maximumFractionDigits: 0 })`
  - Percentages: Custom formatter with % suffix
  - kWh: Custom formatter with unit suffix

### Loading & Error States
- **Pattern**: Midday widget-error-fallback
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/widgets/widget-error-fallback.tsx`
- **Features**:
  - ErrorBoundary per widget (isolates failures)
  - Skeleton loaders with shimmer animation
  - Retry mechanisms on error
  - Graceful degradation (show partial data with warning)

---

## KPI Card Anatomy - Standard

```
+============================================+
|  KPI CARD - STANDARD FORMAT                |
+============================================+
|  +--------------------------------------+  |
|  | [Icon]  Metric Label          [...]  |  <- Header: Icon + Label + Options
|  +--------------------------------------+  |
|  |                                      |  |
|  |         2,450 kWh                    |  <- Primary Value: Large, bold
|  |                                      |  |
|  |    [^] +12.5% vs last month          |  <- Trend: Direction + % + Period
|  |                                      |  |
|  |    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |  <- Sparkline: 7-30 day trend
|  |                                      |  |
|  +--------------------------------------+  |
+============================================+
```

## KPI Card Anatomy - With Target Progress

```
+============================================+
|  KPI CARD - WITH TARGET                    |
+============================================+
|  +--------------------------------------+  |
|  | [Battery] Systems Sold Target: 15    |  <- Shows target when set
|  +--------------------------------------+  |
|  |                                      |  |
|  |            12                        |  <- Current value
|  |                                      |  |
|  |    [^] +3 systems vs last month      |  <- Trend indicator
|  |                                      |  |
|  |    [===============>------] 80%      |  <- Progress bar to target
|  |    Target: 15 systems                |  <- Target details
|  |                                      |  |
|  +--------------------------------------+  |
|  |  On track to meet monthly goal       |  <- Status message
|  +--------------------------------------+  |
+============================================+
```

## KPI Card States

### Loading State

```
+--------------------------------------+
| [===]   [==========]                 |
+--------------------------------------+
|                                      |
|         [================]           |
|                                      |
|    [===] [=============]             |
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~~]    |
|                                      |
+--------------------------------------+
```

### Partial Data State

```
+--------------------------------------+
| [Battery] kWh Deployed  [*] Updating |  <- Amber dot indicator
+--------------------------------------+
|                                      |
|         2,450 kWh                    |  <- Value in amber color
|                                      |
|    [^] +12.5% vs last month          |
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |  <- Sparkline at 75% opacity
|                                      |
|    [Spin] Updating...                |  <- Animated spinner
+--------------------------------------+
```

### Error State

```
+--------------------------------------+
| [$] Monthly Revenue           [!]    |  <- Error indicator
+--------------------------------------+
|                                      |
|    [!] Unable to load                |
|                                      |
|    Check your connection             |
|    and try again.                    |
|                                      |
|    [Retry]                           |
|                                      |
+--------------------------------------+
```

### No Data State

```
+--------------------------------------+
| [Battery] Systems Sold               |
+--------------------------------------+
|                                      |
|         --                           |  <- Placeholder for no value
|                                      |
|    No data for this period           |
|                                      |
|    [Change Date Range]               |
|                                      |
+--------------------------------------+
```

## KPI Card Variants - Renoz Battery Industry

### Systems Sold This Month KPI

```
+--------------------------------------+
| [Battery] Systems Sold        [>]    |  <- Clickable (navigates to orders)
+--------------------------------------+
|                                      |
|            12                        |  <- Count formatted
|                                      |
|    [^] +3 systems vs last month      |  <- Green for positive
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |  <- Sales sparkline
|                                      |
+--------------------------------------+
|  5 Commercial | 7 Residential        |  <- Breakdown mini-stats
+--------------------------------------+
```

### Total kWh Deployed KPI

```
+--------------------------------------+
| [Battery] Total kWh Deployed  [>]    |  <- Clickable (navigates to projects)
+--------------------------------------+
|                                      |
|         2,450 kWh                    |  <- Energy capacity formatted
|                                      |
|    [^] +12.5% vs last month          |  <- Green for positive
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  45% Commercial | 55% Residential     |  <- Breakdown mini-stats
+--------------------------------------+
```

### Active Installers KPI

```
+--------------------------------------+
| [Users] Active Installers     [>]    |  <- Clickable (navigates to customers)
+--------------------------------------+
|                                      |
|            24                        |  <- Count of installers who ordered in 90 days
|                                      |
|    [^] +2 installers vs last quarter |  <- Green for positive
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  18 ordered this month               |  <- Context stat
+--------------------------------------+
```

### Pipeline Value (Weighted) KPI

```
+--------------------------------------+
| [Trend] Pipeline Value        [>]    |  <- Clickable (navigates to pipeline)
+--------------------------------------+
|                                      |
|         $456,789                     |  <- Currency formatted (AUD)
|                                      |
|    [^] +8.5% vs last quarter         |  <- Green for positive
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  12 active quotes awaiting decision   |  <- Context stat
+--------------------------------------+
```

### Quote Win Rate KPI

```
+--------------------------------------+
| [Trophy] Quote Win Rate       [>]    |  <- Clickable (navigates to pipeline)
+--------------------------------------+
|                                      |
|           68%                        |  <- Percentage formatted
|                                      |
|    [^] +5% vs last quarter           |  <- Green for positive
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  8 quotes likely to win this month    |  <- Context stat
+--------------------------------------+
```

### Warranty Claims KPI

```
+--------------------------------------+
| [Shield] Warranty Claims      [>]    |  <- Clickable (navigates to warranties)
+--------------------------------------+
|                                      |
|            3                         |  <- Count formatted
|                                      |
|    [v] -1 resolved this week         |  <- Green (claims resolved = good)
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  1 battery fault | 2 performance issues |  <- Alert indicators
+--------------------------------------+
```

### Warranty Claim Rate KPI

```
+--------------------------------------+
| [Shield] Warranty Claim Rate  [>]    |  <- Clickable (navigates to warranties)
+--------------------------------------+
|                                      |
|          1.9%                        |  <- Percentage of systems
|                                      |
|    [v] -0.3% vs last quarter         |  <- Green (lower is better)
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  Industry avg: 2.5%                  |  <- Benchmark comparison
+--------------------------------------+
```

### Days to Installation KPI

```
+--------------------------------------+
| [Calendar] Days to Installation      |
+--------------------------------------+
|                                      |
|           14                         |  <- Average days formatted
|                                      |
|    [v] -3 days vs last month         |  <- Green (faster = better)
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  Fastest: 7 days | Slowest: 28 days  |  <- Range stats
+--------------------------------------+
```

### Average System Size KPI

```
+--------------------------------------+
| [Calc] Avg System Size               |
+--------------------------------------+
|                                      |
|         204 kWh                      |  <- Capacity formatted
|                                      |
|    [^] +18 kWh vs last month         |
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |
|                                      |
+--------------------------------------+
|  Commercial avg: 350 kWh             |  <- Breakdown by type
|  Residential avg: 125 kWh            |
+--------------------------------------+
```

### Monthly Revenue KPI

```
+--------------------------------------+
| [$] Monthly Revenue           [>]    |  <- Clickable (navigates to orders)
+--------------------------------------+
|                                      |
|         $85,340                      |  <- Currency formatted (AUD)
|                                      |
|    [^] +15.8% vs last month          |  <- Green for positive
|                                      |
|    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |  <- Revenue sparkline
|                                      |
+--------------------------------------+
```

## Progress Bar Color Coding (Target-Based)

```
Target Progress Visual:

< 70% (Behind):
[=======---------------] 45%
Red color (#ef4444)
"Behind target"

70-90% (On Track):
[===============-------] 78%
Yellow/Amber color (#f59e0b)
"On track"

> 90% (Exceeding):
[=====================>] 95%
Green color (#22c55e)
"Exceeding target"

100%+ (Achieved):
[======================] 112%
Green with checkmark
"Target achieved!"
```

## Sparkline Specifications

```
Sparkline Visual Details:

Width: 100% of card content area
Height: 32px
Points: 7-30 data points (based on period)
Stroke: 1.5px
Color: muted-foreground (default)
       green (positive trend)
       red (negative trend)

+------------------------------------------+
|  ·    ·                                  |
|    ·   ·      ·   ·                      |
|       ·  ·  ·  · ·  ·                    |
|            ·         ·  ·    ·           |
|                          ·  ·  ·         |
|                               ·          |
+------------------------------------------+
```

## Trend Indicator Variants

```
Positive Trend:
[^] +12.5% vs last month
    Green color (#22c55e)
    ArrowUp icon

Negative Trend:
[v] -3.2% vs last week
    Red color (#ef4444)
    ArrowDown icon

Neutral/No Change:
[-] 0% vs last month
    Gray color (muted-foreground)
    Minus icon

Note: For Issues/Problems/Warranty Claims, the color logic inverts
(fewer issues = green, more issues = red)
```

## Click/Drill-Down Behavior

```
KPI Card Click Actions:

Systems Sold KPI -> /orders?status=delivered&dateRange={current}
kWh Deployed KPI -> /orders?status=delivered&dateRange={current}&metrics=kwh
Active Installers KPI -> /customers?type=installer&active=true
Pipeline KPI -> /pipeline?stage=active&dateRange={current}
Quote Win Rate KPI -> /pipeline?status=won&dateRange={current}
Warranty Claims KPI -> /support/warranties?status=open&dateRange={current}
Warranty Claim Rate KPI -> /support/warranties?filter=rate-analysis&dateRange={current}
Monthly Revenue KPI -> /orders?status=delivered&dateRange={current}

Visual Feedback:
- cursor: pointer
- Hover: bg-accent, slight elevation
- Click: ripple effect
- Navigation: preserve date range context
```

## KPI Card Grid Layout

### Desktop (5 columns)

```
+----------+ +----------+ +----------+ +----------+ +----------+
| Systems  | | kWh      | | Active   | | Pipeline | | Warranty |
| Sold     | | Deployed | | Install  | | Value    | | Claims   |
| 12       | | 2,450kWh | | 24       | | $456K    | | 3        |
| +3 ^     | | +12.5% ^ | | +2 ^     | | +8.5% ^  | | -1 v     |
| [~~~~]   | | [~~~~]   | | [~~~~]   | | [~~~~]   | | [~~~~]   |
+----------+ +----------+ +----------+ +----------+ +----------+
```

### Tablet (3 columns, 2 rows)

```
+----------------+ +----------------+ +----------------+
| Systems Sold   | | kWh Deployed   | | Pipeline Value |
| 12             | | 2,450 kWh      | | $456,789       |
+----------------+ +----------------+ +----------------+
+----------------+ +----------------+
| Active Install | | Warranty Claims|
| 24             | | 3              |
+----------------+ +----------------+
```

### Mobile (1 column, swipeable carousel)

```
+----------------------------------+
|  < +------------------------+ >  |
|    | Systems Sold           |    |
|    | 12                     |    |
|    | +3 systems this month  |    |
|    | [~~~~~~~~~~~~~~]       |    |
|    +------------------------+    |
+----------------------------------+
|         [o o o o o]              |  <- Pagination dots
+----------------------------------+
```

## Accessibility Requirements

### ARIA Labels

```tsx
<div
  role="region"
  aria-label="Systems Sold Key Performance Indicator"
  tabIndex={0}
>
  <span className="sr-only">
    Systems Sold This Month is 12 systems, which is up 3 systems compared to last month.
    Click to view order details.
  </span>
  {/* Visual content */}
</div>
```

### Keyboard Navigation

```
Tab: Move between KPI cards
Enter/Space: Drill down to detail page
Arrow Left/Right: Navigate carousel (mobile)
```

### Screen Reader Announcements

```
"Systems Sold KPI. This month: twelve systems.
Up three systems compared to last month.
Press Enter to view order details."
```

## Component Props Interface

```typescript
interface KPIWidgetProps {
  // Core data
  value: number | string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;

  // Trend indicator
  trend?: {
    value: number;  // Percentage change
    period: string; // "vs last month", "vs last week"
  };

  // Sparkline data
  sparkline?: { period: string; value: number }[];

  // Target/Goal
  target?: {
    value: number;
    label: string;
  };

  // Drill-down
  onClick?: () => void;
  href?: string;

  // Formatting
  formatValue?: (value: number | string) => string;

  // States
  isLoading?: boolean;
  isPartialData?: boolean;
  error?: Error | null;

  // Breakdown stats
  breakdown?: { label: string; value: number | string }[];
}
```

## Success Metrics

- KPI values visible at a glance (< 1 second comprehension)
- Trend direction immediately obvious via color + icon
- Progress toward targets clearly shown
- Click targets large enough for touch (44px minimum)
- All states handled gracefully (loading, error, empty, partial)
