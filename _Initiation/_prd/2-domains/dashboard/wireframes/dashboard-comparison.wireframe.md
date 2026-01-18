# Dashboard Comparison Periods Wireframe

**Story:** DOM-DASH-005a, DOM-DASH-005b
**Purpose:** Period-over-period comparison for trend analysis
**Design Aesthetic:** Clear comparison visualization with meaningful insights

---

## UI Patterns (Reference Implementation)

### Switch
- **Pattern**: RE-UI Switch
- **Reference**: `_reference/.reui-reference/registry/default/ui/switch.tsx`
- **Features**:
  - Toggle comparison mode on/off
  - Visual state indication with smooth transition
  - Accessible keyboard control (Space to toggle)

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Comparison period dropdown (Last Period, Same Period Last Year)
  - Accessible keyboard navigation (Arrow keys, Enter)
  - Clear selected value display

### Chart (AreaChart, LineChart)
- **Pattern**: Midday Dashboard Charts
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/charts/`
- **Features**:
  - Dual-line overlay for current vs comparison period
  - Dashed line styling for comparison period
  - Legend with visual differentiation (solid vs dashed)
  - Responsive tooltip showing both values

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Trend indicators (up/down arrows) with percentage change
  - Color-coded improvement/decline (green for positive, red for negative)
  - Inverted logic for negative metrics (issues, returns)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-005a, DOM-DASH-005b | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Comparison Toggle in Header

```
+========================================================================+
|  DASHBOARD HEADER WITH COMPARISON TOGGLE                                |
+========================================================================+
|                                                                         |
|  +------------------------------------------------------------------+  |
|  | [Date: This Month]                                                |  |
|  |                                                                   |  |
|  | Compare:  [OFF] / [ON]     [vs Last Period v]                    |  |
|  |                            +---------------------------+          |  |
|  |                            | vs Last Period            |          |  |
|  |                            | vs Same Period Last Year  |          |  |
|  |                            +---------------------------+          |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
+========================================================================+
```

## Comparison Mode States

### Comparison OFF

```
+------------------------------------------+
| Compare:  [ OFF ] / [  ON  ]             |
|                                          |
| "Show current period data only"          |
+------------------------------------------+
```

### Comparison ON

```
+------------------------------------------+
| Compare:  [  OFF  ] / [ ON ]             |
|           [vs Last Period v]             |
|                                          |
| "Comparing Dec 2024 to Nov 2024"         |
+------------------------------------------+
```

## Trend Indicator Component

```
+==========================================+
|  TREND INDICATOR VARIANTS                 |
+==========================================+

Positive Change (Improvement):
+------------------------------------------+
|  [^] +15.3%                              |
|  vs last period                          |
+------------------------------------------+
| Color: Green (#22c55e)                   |
| Icon: ArrowUp                            |

Negative Change (Decline):
+------------------------------------------+
|  [v] -8.2%                               |
|  vs last period                          |
+------------------------------------------+
| Color: Red (#ef4444)                     |
| Icon: ArrowDown                          |

No Change:
+------------------------------------------+
|  [-] 0%                                  |
|  vs last period                          |
+------------------------------------------+
| Color: Gray (muted)                      |
| Icon: Minus                              |

Note: For "negative" metrics (Issues, Returns, etc.)
the color logic inverts:
- Decrease = Green (improvement)
- Increase = Red (decline)
```

## KPI Widget with Comparison

```
+============================================+
|  KPI WIDGET - COMPARISON MODE              |
+============================================+
|  +--------------------------------------+  |
|  | [$] Revenue                          |  |
|  +--------------------------------------+  |
|  |                                      |  |
|  |         $45,230                      |  <- Current period
|  |                                      |  |
|  |    [^] +15.3% vs last period         |  <- Comparison indicator
|  |        ($39,245 -> $45,230)          |  <- Absolute values
|  |                                      |  |
|  |    [~~~~~~~~~~~~~~~~~~~~~~~~~~~]     |  |
|  |                                      |  |
|  +--------------------------------------+  |
+============================================+

Expanded Comparison Detail (on hover/focus):
+--------------------------------------+
|  Comparison Details                  |
|  +--------------------------------+  |
|  | This Period:    $45,230        |  |
|  | Last Period:    $39,245        |  |
|  | Change:         +$5,985        |  |
|  | Change %:       +15.3%         |  |
|  +--------------------------------+  |
+--------------------------------------+
```

## Chart with Comparison Overlay

```
+================================================================+
|  REVENUE TREND - COMPARISON MODE                                |
+================================================================+
|  +----------------------------------------------------------+  |
|  | [$] Revenue Trend    [Compare: ON]  [vs Last Period v]   |  |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  |  $50K |                              .---*               |  |
|  |       |       ....              .---'                    |  |
|  |  $40K |   ....'    '.......---'                          |  |
|  |       |  ..                   ....                       |  |
|  |  $30K |.'                         '...                   |  |
|  |       |                               '.                 |  |
|  |  $20K |                                 '..              |  |
|  |       +------+------+------+------+------+------+        |  |
|  |         W1     W2     W3     W4     W5     W6            |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|  | Legend:                                                   |  |
|  | [--] This Period: $245,230                               |  |
|  | [..] Last Period: $198,450 (dashed line)                 |  |
|  | [^] +23.6% overall improvement                           |  |
|  +----------------------------------------------------------+  |
+================================================================+
```

## Comparison in Pie Chart

```
+================================================+
|  ORDERS BY STATUS - COMPARISON MODE             |
+================================================+
|  +------------------------------------------+  |
|  | [Box] Orders by Status     [Compare: ON] |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  |  This Period        vs     Last Period   |  |
|  |                                          |  |
|  |     +-----+                  +-----+     |  |
|  |   .'  47  '.              .'  42  '.     |  |
|  |  /  Total   \            /  Total   \    |  |
|  |  \         /            \         /     |  |
|  |   '.     .'              '.     .'       |  |
|  |     +---+                  +---+         |  |
|  |                                          |  |
|  |  Change: +5 orders (+11.9%)              |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | Breakdown:                                |  |
|  | Pending:    12 vs 10  [^] +20%           |  |
|  | Processing: 19 vs 18  [^] +5.6%          |  |
|  | Complete:   16 vs 14  [^] +14.3%         |  |
|  +------------------------------------------+  |
+================================================+
```

## Comparison Period Options

```
+------------------------------------------+
| Comparison Period Selection              |
+------------------------------------------+
| Currently viewing: December 2024         |
|                                          |
| Compare to:                              |
| +--------------------------------------+ |
| | (x) vs Last Period                   | |  <- Nov 2024
| |     November 2024                    | |
| |                                      | |
| | ( ) vs Same Period Last Year         | |  <- Dec 2023
| |     December 2023                    | |
| +--------------------------------------+ |
+------------------------------------------+
```

## Comparison Summary Card

```
+================================================+
|  PERIOD COMPARISON SUMMARY                      |
+================================================+
|  +------------------------------------------+  |
|  | December 2024 vs November 2024           |  |
|  +------------------------------------------+  |
|  |                                          |  |
|  | Overall Performance:                     |  |
|  | +--------------------------------------+ |  |
|  | |  [^] +12.3% improvement              | |  |
|  | |  across all key metrics              | |  |
|  | +--------------------------------------+ |  |
|  |                                          |  |
|  | Metric Breakdown:                        |  |
|  | +--------------------------------------+ |  |
|  | | Revenue      $45K -> $50K  [^] +11% | |  |
|  | | Orders       42 -> 47       [^] +12% | |  |
|  | | Pipeline     $180K -> $200K [^] +11% | |  |
|  | | Customers    230 -> 245     [^] +6.5%| |  |
|  | | Issues       12 -> 8        [v] -33% | |  |
|  | +--------------------------------------+ |  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [View Detailed Report]  [Export]         |  |
|  +------------------------------------------+  |
+================================================+
```

## Loading State (Comparison Data)

```
+------------------------------------------+
| Compare:  [  OFF  ] / [ ON ]             |
+------------------------------------------+
|                                          |
|  Loading comparison data...              |
|  [===========>                      ]    |
|                                          |
+------------------------------------------+

Widget during comparison load:
+--------------------------------------+
| [$] Revenue                          |
+--------------------------------------+
|                                      |
|         $45,230                      |  <- Current shows
|                                      |
|    [Spin] Loading comparison...      |  <- Comparison loading
|                                      |
+--------------------------------------+
```

## Error State (Comparison Unavailable)

```
+------------------------------------------+
| Compare:  [  OFF  ] / [ ON ]             |
+------------------------------------------+
|                                          |
|  [!] Comparison data unavailable         |
|                                          |
|  No data exists for the comparison       |
|  period (December 2023).                 |
|                                          |
|  [Try Different Period]  [Dismiss]       |
|                                          |
+------------------------------------------+
```

## No Comparison Data

```
+--------------------------------------+
| [$] Revenue                          |
+--------------------------------------+
|                                      |
|         $45,230                      |
|                                      |
|    [i] No comparison data            |
|    (New metric - no prior period)    |
|                                      |
+--------------------------------------+
```

## Mobile Layout

### Comparison Toggle (Mobile)

```
+================================+
|  Dashboard                     |
+================================+
|  Dec 2024           [Compare v]|
|  +----------------------------+|
|  | Compare to:                ||
|  | ( ) OFF                    ||
|  | (x) Last Period (Nov)      ||
|  | ( ) Last Year (Dec 2023)   ||
|  +----------------------------+|
+================================+
```

### KPI Card with Comparison (Mobile)

```
+----------------------------+
| [$] Revenue                |
+----------------------------+
|        $45,230             |
|                            |
| vs Nov 2024:               |
| [^] +15.3% ($39,245)       |
+----------------------------+
```

## Accessibility Requirements

### ARIA Labels

```tsx
<div role="group" aria-label="Period comparison controls">
  <Switch
    aria-label="Enable period comparison"
    aria-describedby="comparison-description"
  />
  <span id="comparison-description" className="sr-only">
    When enabled, shows metrics compared to a previous period
  </span>
</div>

<div aria-label="Revenue comparison" role="region">
  <span className="sr-only">
    Revenue is $45,230 this period, up 15.3% from $39,245 in the previous period.
    This represents an improvement of $5,985.
  </span>
</div>
```

### Screen Reader Announcements

```
On comparison toggle:
"Comparison enabled. Showing December 2024 compared to November 2024."

On metric with comparison:
"Revenue: forty-five thousand two hundred thirty dollars.
Up fifteen point three percent compared to previous period.
Previous period was thirty-nine thousand two hundred forty-five dollars."

On comparison period change:
"Now comparing to same period last year, December 2023."
```

### Keyboard Navigation

```
Tab: Move between comparison controls
Space: Toggle comparison on/off
Arrow Down: Open comparison period dropdown
Enter: Select comparison period
Escape: Close dropdown
```

## Visual Differentiation

```
Chart Line Styles:

Current Period:
- Solid line (2px)
- Primary color
- Filled area under line (optional)

Comparison Period:
- Dashed line (2px, dash: 4px)
- Muted/gray color
- No fill

Legend:
[--] Current (solid swatch)
[..] Previous (dashed swatch)
```

## Component Props Interface

```typescript
interface ComparisonControlsProps {
  // State
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;

  // Comparison period
  comparisonType: 'last-period' | 'same-period-last-year';
  onComparisonTypeChange: (type: ComparisonType) => void;

  // Current period context
  currentPeriod: DateRange;

  // Loading states
  isLoading?: boolean;
  error?: Error | null;
}

interface TrendIndicatorProps {
  currentValue: number;
  previousValue: number;
  formatValue?: (value: number) => string;
  metricType?: 'positive' | 'negative'; // For color logic
  showAbsoluteChange?: boolean;
  showPreviousValue?: boolean;
}

interface ChartWithComparisonProps extends ChartProps {
  comparisonData?: ChartDataPoint[];
  showComparison?: boolean;
  comparisonLabel?: string;
}
```

## Success Metrics

- Comparison toggle responds within 100ms
- Comparison data loads within 1 second
- Users understand trend direction at a glance
- Color coding correctly reflects improvement/decline
- Comparison visible without scrolling on desktop
- All comparison data accessible via keyboard/screen reader
