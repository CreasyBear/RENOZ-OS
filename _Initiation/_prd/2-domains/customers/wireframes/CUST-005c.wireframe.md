# Wireframe: DOM-CUST-005c - Health Score: UI Display

## Story Reference

- **Story ID**: DOM-CUST-005c
- **Name**: Health Score: UI Display
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: ScoreGauge

## Overview

Display customer health score (0-100) in list and detail views with color-coded badges/gauges, score breakdowns, filtering capabilities, and at-risk customer highlighting.

## UI Patterns (Reference Implementation)

### Health Score Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded variants (success=70-100, warning=40-69, destructive=0-39)
  - Compact dot indicator for list views
  - Clickable/tappable for breakdown popover
  - Pending state (gray outline) for new customers

### Circular Gauge
- **Pattern**: RE-UI Progress (Circular variant)
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Animated arc from 0 to score percentage
  - Count-up number animation (0 to score)
  - Color transition based on score threshold
  - Accessible meter role (aria-valuenow)

### Popover/Tooltip
- **Pattern**: RE-UI Popover
- **Reference**: `_reference/.reui-reference/registry/default/ui/popover.tsx`
- **Features**:
  - Score breakdown on badge click/hover
  - Responsive positioning (auto-flip on overflow)
  - Keyboard accessible (Enter to open, Esc to close)
  - Shows component scores with visual progress bars

### Progress Bars (Breakdown)
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Linear bars for Recency/Frequency/Monetary scores
  - Staggered animation on render
  - Accessible value labels (85/100 format)
  - Contextual descriptions (e.g., "Last order: 12 days ago")

### Data Grid with Filters
- **Pattern**: RE-UI Data Table
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Health score column with badge display
  - Filter by score range (Good/Fair/Risk/Pending)
  - Sortable columns including health score
  - At-risk row highlighting (red tint + left border)

### Alert Widget (At-Risk Dashboard)
- **Pattern**: RE-UI Alert + Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`, `card.tsx`
- **Features**:
  - Destructive alert variant for at-risk customers
  - Embedded mini-table with customer list
  - Action buttons (Contact, View) per row
  - Attention pulse animation (2x loop)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-005c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Health Score Badge (Customer Detail - Compact)

```
┌────────────────────────────────────────┐
│ ← Customers                            │
├────────────────────────────────────────┤
│                                        │
│  Brisbane Solar Co         [●75] Good   │
│  ─────────────────────    ↑ colored    │
│  john@brisbanesolar.com.au              dot+score  │
│                                        │
└────────────────────────────────────────┘

SCORE TAPPED - Breakdown Popover:
┌────────────────────────────────────────┐
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Health Score: 75 (Good)          │  │
│  │ ─────────────────────────────    │  │
│  │                                  │  │
│  │ ┌────────────────────────────┐   │  │
│  │ │        [gauge: 75]         │   │  │
│  │ │     ┌──────────────┐       │   │  │
│  │ │     │      75      │       │   │  │
│  │ │     └──────────────┘       │   │  │
│  │ └────────────────────────────┘   │  │
│  │                                  │  │
│  │ Score Breakdown:                 │  │
│  │ ─────────────────────────────    │  │
│  │                                  │  │
│  │ Recency (30%)           85/100   │  │
│  │ Last order: 12 days ago          │  │
│  │ [========--]                     │  │
│  │                                  │  │
│  │ Frequency (30%)         70/100   │  │
│  │ Orders/year: 8                   │  │
│  │ [=======---]                     │  │
│  │                                  │  │
│  │ Monetary (40%)          72/100   │  │
│  │ LTV percentile: 72nd             │  │
│  │ [=======---]                     │  │
│  │                                  │  │
│  │ Updated: Jan 10, 2026 2:00 AM    │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Health Score States (Mobile)

```
HEALTHY (70-100):
┌────────────────────────────────────────┐
│  Brisbane Solar Co         [●85] Good   │
│                           green        │
└────────────────────────────────────────┘

WARNING (40-69):
┌────────────────────────────────────────┐
│  Sydney Energy Systems          [●52] Fair   │
│                           yellow       │
└────────────────────────────────────────┘

AT RISK (0-39):
┌────────────────────────────────────────┐
│  Melbourne Power Solutions                [●28] Risk   │
│                           red          │
│  ┌──────────────────────────────────┐  │
│  │ [!] At Risk - Needs attention    │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘

PENDING (New Customer):
┌────────────────────────────────────────┐
│  New Company              [○--] Pend.  │
│                           gray         │
└────────────────────────────────────────┘

ERROR:
┌────────────────────────────────────────┐
│  Error Corp               [?] Error    │
│                        ↑ tap to retry  │
└────────────────────────────────────────┘
```

### Customer List with Health Score (Mobile Cards)

```
┌────────────────────────────────────────┐
│ Customers                    [+ New]   │
├────────────────────────────────────────┤
│ [Search_______________] [Filter ▼]     │
│                                        │
│ Health: [All ▼]                        │
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Brisbane Solar Co        [●85]    │   │
│ │ john@brisbanesolar.com.au            Good    │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Sydney Energy Systems         [●52]    │   │
│ │ contact@sydneyenergy.com.au          Fair    │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ [!] Melbourne Power Solutions           [●28]    │   │
│ │ info@gamma.co         At Risk    │   │
│ │                        Active ● │   │
│ │ ↑ highlighted row (red tint)     │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Health Score Badge (Customer Detail - Badge)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Brisbane Solar Co                         [Edit] [Actions ▼]  │
│  john@brisbanesolar.com.au | +61 7 3000 0123                                  │
│                                                               │
│  Health Score:                                                │
│  ┌─────────────────────────────────────┐                      │
│  │ [●85] Good                    [i]   │                      │
│  │       ↑ colored badge with tooltip  │                      │
│  └─────────────────────────────────────┘                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘

TOOLTIP ON HOVER/TAP:
┌─────────────────────────────────────────────────────┐
│ Health Score Breakdown                              │
│ ─────────────────────────────────────────────────   │
│                                                     │
│ Recency:   85/100  (Last order 12 days ago)        │
│ Frequency: 70/100  (8 orders/year)                 │
│ Monetary:  72/100  (72nd percentile LTV)           │
│                                                     │
│ Updated: Jan 10, 2026                              │
└─────────────────────────────────────────────────────┘
```

### Customer List with Health Score Column

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Customers                                              [+ New Customer]   │
├───────────────────────────────────────────────────────────────────────────┤
│ [Search_____________________] [Status ▼] [Health ▼] [Sort: Name ▼]       │
│                                                                           │
│ Health Filter: [●All] [●Good] [●Fair] [●Risk]                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  □  Name              Email              Health Score           Status    │
│  ─────────────────────────────────────────────────────────────────────── │
│  □  Acme Corp         john@brisbanesolar.com.au      [●85] Good            ● Active  │
│  □  Sydney Energy Systems   contact@sydneyenergy.com.au    [●52] Fair            ● Active  │
│  □  Melbourne Power Solutions [!]     info@gamma.co      [●28] At Risk         ● Active  │
│  □  Perth Renewables         sales@delta.com    [●72] Good            ● Active  │
│  □  Adelaide Battery Corp        hello@epsilon.org  [○--] Pending         ● Active  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Metrics Dashboard - Health Score Integration

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │ Lifetime Value   │ YTD Revenue      │ Health Score     │   │
│  │ ──────────────── │ ──────────────── │ ──────────────   │   │
│  │ $245,000         │ $45,200          │   ┌─────────┐    │   │
│  │ +12% YoY         │ +8% vs LY        │   │   85    │    │   │
│  │                  │                  │   │  Good   │    │   │
│  │                  │                  │   └─────────┘    │   │
│  │                  │                  │ [====-----]      │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Health Score Gauge (Customer Metrics Dashboard - Full)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products     [Bell] [User] │
├──────────┬──────────────────────────────────────────────────────────────────────────┤
│          │                                                                          │
│ Dashboard│  ← Back to Customers                                                     │
│          │                                                                          │
│          │  Brisbane Solar Co                          [New Order] [Edit] [More ▼]  │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  [Overview] [Orders] [Quotes] [Warranties] [Activity] [Contacts]         │
│          │                                                                          │
│          │  ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│          │  │ Lifetime Value  │ YTD Revenue     │ Total Orders    │ Health Score  │ │
│          │  │ ─────────────── │ ─────────────── │ ─────────────── │ ───────────── │ │
│          │  │ $245,000        │ $45,200         │ 47              │               │ │
│          │  │ +12% YoY        │ +8% vs LY       │ 15 this year    │  ┌────────┐   │ │
│          │  │                 │                 │                 │  │   85   │   │ │
│          │  │                 │                 │                 │  │  Good  │   │ │
│          │  │                 │                 │                 │  └────────┘   │ │
│          │  │                 │                 │                 │ [=======---] │ │
│          │  └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Health Score Card - Expanded View on Hover

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│  ┌─ Health Score ────────────────────────────────────────────────────────────┐    │
│  │                                                                            │    │
│  │  ┌──────────────────┐                                                      │    │
│  │  │                  │                                                      │    │
│  │  │   ┌──────────┐   │    Score Breakdown                                   │    │
│  │  │   │          │   │    ─────────────────────────────────────────────     │    │
│  │  │   │    85    │   │                                                      │    │
│  │  │   │   Good   │   │    Recency (30% weight)                   85/100    │    │
│  │  │   └──────────┘   │    Last order: 12 days ago                           │    │
│  │  │                  │    [=================---]                            │    │
│  │  │   ┌─────────┐    │                                                      │    │
│  │  │   │circular │    │    Frequency (30% weight)                70/100    │    │
│  │  │   │ gauge   │    │    8 orders in last 12 months                        │    │
│  │  │   │ 85%     │    │    [==============------]                            │    │
│  │  │   └─────────┘    │                                                      │    │
│  │  │                  │    Monetary (40% weight)                  72/100    │    │
│  │  └──────────────────┘    72nd percentile lifetime value                    │    │
│  │                          [==============------]                            │    │
│  │                                                                            │    │
│  │  Updated: Jan 10, 2026 at 2:00 AM AEST            [View Score History]     │    │
│  │                                                                            │    │
│  └────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Customer List with Health Score Column (Full Table)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ Customers                                                            [+ New Customer]      │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Search________________________] [Status ▼] [Tags ▼] [Health ▼] [Credit ▼] [Sort: Name ▼] │
│                                                                                            │
│ Health Filter: [All] [●Good 70-100] [●Fair 40-69] [●Risk 0-39] [○Pending]                 │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  □  Name              Email              Phone          Health           Status            │
│  ─────────────────────────────────────────────────────────────────────────────────────── │
│  □  Acme Corp         john@brisbanesolar.com.au      555-0123      [●85] Good       ● Active          │
│  □  Sydney Energy Systems   contact@sydneyenergy.com.au    555-0124      [●52] Fair       ● Active          │
│  □  Melbourne Power Solutions [!]     info@gamma.co      555-0125      [●28] Risk       ● Active          │
│     ↑ highlighted row with red left border                                                 │
│  □  Perth Renewables         sales@delta.com    555-0126      [●72] Good       ● Active          │
│  □  Adelaide Battery Corp        hello@epsilon.org  555-0127      [○--] Pending    ● Active          │
│  □  Zeta Corp         zeta@zeta.com      555-0128      [●15] Risk       ● Active          │
│     ↑ highlighted row                                                                      │
│                                                                                            │
│  < 1 2 3 ... 10 >                                    Showing 1-25 of 234 customers        │
│                                                                                            │
│  At Risk Customers: 8 need attention                             [View All At Risk →]     │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### At-Risk Customers Dashboard Widget

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│  [!] At-Risk Customers (Health < 30)                              [View All →]    │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Customer            Score    Last Order      Action                         │  │
│  ├─────────────────────────────────────────────────────────────────────────────┤  │
│  │ Melbourne Power Solutions           [●28]    45 days ago     [Contact]  [View]             │  │
│  │ Zeta Corp           [●15]    92 days ago     [Contact]  [View]             │  │
│  │ Omega Industries    [●22]    67 days ago     [Contact]  [View]             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  8 customers at risk | Average days since last order: 68                          │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
SCORE LOADING:
┌─────────────────┐
│ Health Score    │
│ ─────────────── │
│   ┌────────┐    │
│   │ [...] │    │
│   └────────┘    │
│ [............]  │
└─────────────────┘

BREAKDOWN LOADING:
┌────────────────────────────────────────┐
│ Health Score Breakdown                 │
│                                        │
│ Recency:   [..................]       │
│ Frequency: [..................]       │
│ Monetary:  [..................]       │
│                                        │
└────────────────────────────────────────┘
```

### Empty States

```
SCORE PENDING (New Customer):
┌─────────────────┐
│ Health Score    │
│ ─────────────── │
│   ┌────────┐    │
│   │   --   │    │
│   │Pending │    │
│   └────────┘    │
│                 │
│ Score will be   │
│ calculated      │
│ tonight         │
│                 │
└─────────────────┘

NO HEALTH DATA:
┌────────────────────────────────────────┐
│ Health Score                           │
│                                        │
│ No health score available yet.         │
│                                        │
│ Health scores are calculated nightly   │
│ for customers with order history.      │
│                                        │
└────────────────────────────────────────┘
```

### Error States

```
SCORE CALCULATION ERROR:
┌─────────────────┐
│ Health Score    │
│ ─────────────── │
│   ┌────────┐    │
│   │   ?    │    │
│   │ Error  │    │
│   └────────┘    │
│                 │
│   [Retry]       │
│                 │
└─────────────────┘

ERROR TOOLTIP:
┌────────────────────────────────────────┐
│ Unable to calculate health score       │
│                                        │
│ This may be due to missing order       │
│ data or a temporary system issue.      │
│                                        │
│              [Retry]                   │
└────────────────────────────────────────┘
```

### Success States

```
SCORE UPDATED:
┌────────────────────────────────────────┐
│ [check] Health score updated           │
│                                        │
│ New score: 85 (was 82)                 │
└────────────────────────────────────────┘
↑ Toast notification
```

---

## Accessibility Notes

### Focus Order

1. **Score Badge**
   - Tab to badge
   - Enter to open breakdown popover
   - Arrow keys to navigate breakdown items

2. **List Column**
   - Tab through cells
   - Enter on score opens breakdown

3. **Filter**
   - Tab to filter dropdown
   - Arrow keys to select option
   - Enter to apply

### ARIA Requirements

```html
<!-- Health Score Badge -->
<div
  role="meter"
  aria-valuenow="85"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Health score: 85 out of 100, Good"
  tabindex="0"
>
  <span class="score">85</span>
  <span class="label">Good</span>
</div>

<!-- Circular Gauge (Visual) -->
<svg
  role="img"
  aria-label="Health score gauge showing 85 percent"
>
  <!-- gauge graphics -->
</svg>

<!-- Score Breakdown -->
<div
  aria-label="Health score breakdown"
>
  <div aria-label="Recency score: 85 out of 100, weight 30%">
    Recency (30%): 85/100
  </div>
  ...
</div>

<!-- At-Risk Indicator -->
<span
  role="status"
  aria-label="At risk customer, health score 28"
>
  [!] At Risk
</span>

<!-- At-Risk Row -->
<tr
  aria-label="Melbourne Power Solutions, at risk customer"
  class="at-risk"
>
  ...
</tr>

<!-- Filter -->
<select aria-label="Filter by health score">
  <option>All</option>
  <option>Good (70-100)</option>
  <option>Fair (40-69)</option>
  <option>At Risk (0-39)</option>
</select>
```

### Screen Reader Announcements

- Badge focus: "Health score: 85 out of 100, Good. Press Enter for breakdown."
- Breakdown open: "Score breakdown: Recency 85 out of 100, Frequency 70 out of 100, Monetary 72 out of 100"
- At-risk row: "Melbourne Power Solutions, at risk customer, health score 28"
- Score change: "Health score updated to 85, previously 82"
- Filter applied: "Showing at-risk customers only"

---

## Animation Choreography

### Gauge Animation

```
INITIAL RENDER:
- Duration: 800ms
- Easing: ease-out
- Arc: grows from 0 to score percentage
- Number: counts up from 0 to score

SCORE UPDATE:
- Duration: 600ms
- Easing: ease-in-out
- Arc: animates from old to new position
- Number: counts from old to new
```

### Badge States

```
APPEAR:
- Duration: 200ms
- Opacity: 0 -> 1
- Transform: scale(0.9) -> scale(1)

HOVER:
- Duration: 150ms
- Transform: scale(1.05)
- Shadow: subtle elevation

COLOR TRANSITION (on score change):
- Duration: 300ms
- Background: crossfade between colors
```

### Progress Bars (Breakdown)

```
APPEAR:
- Duration: 400ms per bar
- Stagger: 100ms
- Width: 0% -> actual%
- Easing: ease-out
```

### At-Risk Highlight

```
ATTENTION PULSE:
- Duration: 2s
- Opacity: subtle pulse
- Border: subtle glow
- Loops: 2x then stops
```

### Popover/Tooltip

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: scale(0.95) -> scale(1)
- Opacity: 0 -> 1

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Opacity: 1 -> 0
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: NPS score displays, credit score gauges, fitness apps
- **Gauge Style**: Circular arc or semi-circle with filled portion
- **Color System**:
  - Good (70-100): Green (#4CAF50)
  - Fair (40-69): Amber/Yellow (#FF9800)
  - At Risk (0-39): Red (#F44336)
  - Pending: Gray (#9E9E9E)

### Visual Hierarchy

1. Score number most prominent (large, bold)
2. Status label (Good/Fair/Risk) clearly visible
3. Gauge provides visual context
4. Breakdown shows contributing factors
5. At-risk customers stand out in lists

### Reference Files

- `.reui-reference/components/analytics.tsx` - Health score gauge component
- Financial dashboard patterns for score displays

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/health-score-badge.tsx` | Score badge/gauge component |
| `src/components/domain/customers/customer-columns.tsx` | List column integration |
| `src/components/domain/customers/customer-metrics-dashboard.tsx` | Dashboard integration |
