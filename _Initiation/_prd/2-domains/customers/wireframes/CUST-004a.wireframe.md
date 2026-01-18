# Wireframe: DOM-CUST-004a - Enhanced 360 View: Metrics Dashboard

## Story Reference

- **Story ID**: DOM-CUST-004a
- **Name**: Enhanced 360 View: Metrics Dashboard
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: MetricsDashboard

## Overview

Comprehensive metrics dashboard for customer overview tab showing lifetime value, YTD revenue, order statistics, trend charts, opportunities, overdue invoices, and interaction history.

## UI Patterns (Reference Implementation)

### Metric Cards
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Responsive 2-4 column grid layout (mobile to desktop)
  - Skeleton loading states for individual metrics
  - Hover elevation for interactive cards
  - Support for sparkline charts within cards

### Trend Chart
- **Pattern**: RE-UI Chart Components (Recharts/shadcn)
- **Reference**: `_reference/.reui-reference/registry/default/example/chart-*.tsx`
- **Features**:
  - Responsive bar/line chart for 12-month revenue trends
  - Interactive hover tooltips showing detailed month data
  - Color-coded dual-axis (revenue + order count)
  - Accessible SVG with screen reader table fallback

### Alert/Warning Banner
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Destructive variant for overdue invoices
  - Icon support ([!] indicator)
  - Dismissible with action buttons
  - Attention pulse animation on critical alerts

### Badge Components
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Status indicators for order states
  - Color variants (success, warning, destructive)
  - Compact display for mobile layouts
  - Optional icon support for trend arrows

### Data Display Grid
- **Pattern**: RE-UI Table (simplified for mobile cards)
- **Reference**: `_reference/.reui-reference/registry/default/ui/table.tsx`
- **Features**:
  - Adaptive layout (cards on mobile, table on desktop)
  - Sort capabilities for overdue invoices
  - Row actions (View All, individual view buttons)
  - Loading skeleton maintains aspect ratio

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-004a | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Metrics Dashboard (2-Column Grid)

```
┌────────────────────────────────────────┐
│ ← Customers                            │
├────────────────────────────────────────┤
│                                        │
│  Brisbane Solar Co                      │
│  [Overview] [Orders] [Activity] [...]  │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ Lifetime Value │ YTD Revenue    │   │
│  │ ────────────── │ ──────────     │   │
│  │ $245,000       │ $45,200        │   │
│  │ +12% YoY       │ +8% vs LY      │   │
│  └────────────────┴────────────────┘   │
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ Total Orders   │ Avg Order      │   │
│  │ ────────────── │ ──────────     │   │
│  │ 47             │ $5,213         │   │
│  │ 15 this year   │ +3% vs avg     │   │
│  └────────────────┴────────────────┘   │
│                                        │
│  Order Trend (12 months)               │
│  ┌──────────────────────────────────┐  │
│  │     ▄                            │  │
│  │   ▄ █ ▄     ▄                    │  │
│  │ ▄ █ █ █ ▄ ▄ █ ▄ ▄   ▄           │  │
│  │ █ █ █ █ █ █ █ █ █ ▄ █ ▄         │  │
│  │ J F M A M J J A S O N D         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ Open Orders    │ Open Quotes    │   │
│  │ ────────────── │ ──────────     │   │
│  │ 3              │ 2              │   │
│  │ $12,500        │ $28,000        │   │
│  └────────────────┴────────────────┘   │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ [!] Overdue Invoices             │  │
│  │ ────────────────────────────     │  │
│  │ 2 invoices  |  $4,500 overdue   │  │
│  │                   [View All →]   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ Customer Since │ Last Contact   │   │
│  │ ────────────── │ ──────────     │   │
│  │ Mar 15, 2023   │ Jan 8, 2026    │   │
│  │ 2y 10m         │ 2 days ago     │   │
│  │                │ (Phone call)   │   │
│  └────────────────┴────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Metrics Dashboard - Loading State (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ [............] │ [............] │   │
│  │ [..........] │ [..........] │   │
│  └────────────────┴────────────────┘   │
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ [............] │ [............] │   │
│  │ [..........] │ [..........] │   │
│  └────────────────┴────────────────┘   │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ [............................]   │  │
│  │ [............................]   │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Metrics Dashboard - Empty State (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │      [illustration: chart]       │  │
│  │                                  │  │
│  │    No transaction history yet    │  │
│  │                                  │  │
│  │  This customer hasn't placed     │  │
│  │  any orders yet. Create their    │  │
│  │  first order to see metrics.     │  │
│  │                                  │  │
│  │      [Create First Order]        │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────────────────┬────────────────┐   │
│  │ Customer Since │ Last Contact   │   │
│  │ ────────────── │ ──────────     │   │
│  │ Jan 10, 2026   │ Never          │   │
│  │ Today          │ -              │   │
│  └────────────────┴────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Metrics Dashboard (3-Column Grid)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Brisbane Solar Co                         [Edit] [Actions ▼]  │
│  [Overview] [Orders] [Quotes] [Activity] [Contacts] [More]    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │ Lifetime Value   │ YTD Revenue      │ Total Orders     │   │
│  │ ──────────────── │ ──────────────── │ ──────────────   │   │
│  │ $245,000         │ $45,200          │ 47               │   │
│  │ +12% YoY [^]     │ +8% vs LY [^]    │ 15 this year     │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────┬──────────────────────┐   │
│  │ Order Trend (Last 12 Months)    │ Quick Stats          │   │
│  │ ─────────────────────────────── │ ──────────────────   │   │
│  │                                 │                      │   │
│  │       ▄                         │ Avg Order Value      │   │
│  │     ▄ █ ▄     ▄                 │ $5,213 (+3%)         │   │
│  │   ▄ █ █ █ ▄ ▄ █ ▄ ▄   ▄        │                      │   │
│  │   █ █ █ █ █ █ █ █ █ ▄ █ ▄      │ Order Frequency      │   │
│  │   J F M A M J J A S O N D      │ 1.3/month            │   │
│  │                                 │                      │   │
│  │ ● Revenue  ○ Orders             │ Customer Since       │   │
│  │                                 │ Mar 15, 2023         │   │
│  └─────────────────────────────────┴──────────────────────┘   │
│                                                               │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │ Open Orders      │ Open Quotes      │ Last Interaction │   │
│  │ ──────────────── │ ──────────────── │ ──────────────   │   │
│  │ 3 orders         │ 2 quotes         │ Jan 8, 2026      │   │
│  │ $12,500 pending  │ $28,000 value    │ Phone call       │   │
│  │      [View →]    │      [View →]    │ 2 days ago       │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [!] Overdue Invoices                         [View All] │  │
│  │ ─────────────────────────────────────────────────────   │  │
│  │ INV-2024-0892  $2,500  15 days overdue                  │  │
│  │ INV-2024-0901  $2,000  8 days overdue                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Metrics Dashboard (4-Column Grid with Expanded Chart)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products     [Bell] [User] │
├──────────┬──────────────────────────────────────────────────────────────────────────┤
│          │                                                                          │
│ Dashboard│  ← Back to Customers                                                     │
│ ──────── │                                                                          │
│ Customers│  Brisbane Solar Co                          [New Order] [Edit] [More ▼]  │
│ Orders   │  john@brisbanesolar.com.au | +61 7 3000 0123 | ABN: 12345678901                          │
│ Quotes   │  ────────────────────────────────────────────────────────────────────    │
│ Products │                                                                          │
│ Settings │  [Overview] [Orders] [Quotes] [Warranties] [Activity] [Contacts] [Addr.] │
│          │                                                                          │
│          │  ═══════════════════════════════════════════════════════════════════════ │
│          │                                                                          │
│          │  ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│          │  │ Lifetime Value  │ YTD Revenue     │ Total Orders    │ Avg Order     │ │
│          │  │ ─────────────── │ ─────────────── │ ─────────────── │ ───────────── │ │
│          │  │ $245,000        │ $45,200         │ 47              │ $5,213        │ │
│          │  │ +12% YoY [^]    │ +8% vs LY [^]   │ 15 this year    │ +3% vs avg    │ │
│          │  │                 │                 │                 │               │ │
│          │  │ [mini-sparkline]│ [mini-sparkline]│ [mini-sparkline]│               │ │
│          │  └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│          │                                                                          │
│          │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │ Revenue & Order Trend (Last 12 Months)                   [Export]  │  │
│          │  │ ────────────────────────────────────────────────────────────────   │  │
│          │  │                                                                    │  │
│          │  │  $15k │                    ▄                                       │  │
│          │  │       │          ▄       ▄ █ ▄                                     │  │
│          │  │  $10k │        ▄ █ ▄   ▄ █ █ █                                     │  │
│          │  │       │      ▄ █ █ █ ▄ █ █ █ █ ▄     ▄                             │  │
│          │  │  $5k  │    ▄ █ █ █ █ █ █ █ █ █ █ ▄ ▄ █                             │  │
│          │  │       │  ▄ █ █ █ █ █ █ █ █ █ █ █ █ █ █                             │  │
│          │  │  $0   │──█─█─█─█─█─█─█─█─█─█─█─█─█─█─█──                           │  │
│          │  │         Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec           │  │
│          │  │                                                                    │  │
│          │  │  ● Revenue ($)  ○ Order Count       Hover for details              │  │
│          │  │                                                                    │  │
│          │  └────────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
│          │  ┌─────────────────────────┬─────────────────────────┬────────────────┐  │
│          │  │ Open Orders             │ Open Opportunities      │ Customer Info  │  │
│          │  │ ─────────────────────── │ ─────────────────────── │ ────────────── │  │
│          │  │                         │                         │                │  │
│          │  │ 3 orders pending        │ 2 opportunities         │ Since:         │  │
│          │  │ Total: $12,500          │ Pipeline: $28,000       │ Mar 15, 2023   │  │
│          │  │                         │                         │                │  │
│          │  │ • ORD-2026-0045 $5,200  │ • Expansion Q1 $18,000  │ Last Contact:  │  │
│          │  │ • ORD-2026-0048 $4,800  │ • Renewal      $10,000  │ Jan 8, 2026    │  │
│          │  │ • ORD-2026-0051 $2,500  │                         │ (Phone call)   │  │
│          │  │                         │                         │                │  │
│          │  │          [View All →]   │          [View All →]   │ Order Freq:    │  │
│          │  │                         │                         │ 1.3/month      │  │
│          │  └─────────────────────────┴─────────────────────────┴────────────────┘  │
│          │                                                                          │
│          │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │ [!] Overdue Invoices                           role="alert"        │  │
│          │  │ ────────────────────────────────────────────────────────────────   │  │
│          │  │                                                                    │  │
│          │  │  Invoice         Amount     Due Date      Days Overdue             │  │
│          │  │  ─────────────────────────────────────────────────────────────     │  │
│          │  │  INV-2024-0892   $2,500     Dec 25, 2025  15 days      [View]      │  │
│          │  │  INV-2024-0901   $2,000     Jan 2, 2026   8 days       [View]      │  │
│          │  │                                                                    │  │
│          │  │  Total Overdue: $4,500                          [View All →]       │  │
│          │  │                                                                    │  │
│          │  └────────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Chart Hover State (Desktop)

```
┌────────────────────────────────────────────────────────────────┐
│ Revenue & Order Trend                                          │
│                                                                │
│         ┌───────────────────┐                                  │
│         │ August 2025       │                                  │
│         │ ─────────────     │                                  │
│         │ Revenue: $12,450  │                                  │
│       ▄ │ Orders: 5         │                                  │
│     ▄ █ │ Avg: $2,490       │                                  │
│   ▄ █ █←└───────────────────┘                                  │
│ ▄ █ █ █ ▄ ...                                                  │
│ J F M A M J J A S O N D                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
INDIVIDUAL METRIC LOADING:
┌─────────────────┐
│ Lifetime Value  │
│ ─────────────── │
│ [...........] │
│ [..........]   │
└─────────────────┘

CHART LOADING:
┌────────────────────────────────────────┐
│ Order Trend                            │
│ ────────────────────────────────────   │
│                                        │
│ [...................................] │
│ [...................................] │
│ [...................................] │
│                                        │
│   Skeleton maintains aspect ratio      │
│                                        │
└────────────────────────────────────────┘

FULL DASHBOARD LOADING:
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ [...........] │ [...........] │ [...........] │ [...........] │
│ [.........]   │ [.........]   │ [.........]   │ [.........]   │
└───────────────┴───────────────┴───────────────┴───────────────┘
┌──────────────────────────────────────────────────────────────┐
│ [............................................................│
│ .............................................................│
│ ............................................................]│
└──────────────────────────────────────────────────────────────┘
```

### Empty States

```
NO TRANSACTION HISTORY:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                   [illustration: empty chart]                  │
│                                                                │
│                No transaction history yet                      │
│                                                                │
│      This customer hasn't placed any orders yet.               │
│      Create their first order to start tracking metrics.       │
│                                                                │
│                    [Create First Order]                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

NO OVERDUE INVOICES (good state):
┌────────────────────────────────────────────────────────────────┐
│ [check] No Overdue Invoices                                    │
│ ────────────────────────────────────────────────────────────   │
│ All invoices are current. Great job!                           │
└────────────────────────────────────────────────────────────────┘

NO OPEN OPPORTUNITIES:
┌─────────────────────────┐
│ Open Opportunities      │
│ ─────────────────────── │
│                         │
│ No open opportunities   │
│                         │
│    [Create Quote]       │
│                         │
└─────────────────────────┘
```

### Error States

```
INDIVIDUAL METRIC ERROR:
┌─────────────────┐
│ Lifetime Value  │
│ ─────────────── │
│ [!] Error       │
│                 │
│    [Retry]      │
└─────────────────┘

CHART ERROR:
┌────────────────────────────────────────┐
│ Order Trend                            │
│ ────────────────────────────────────   │
│                                        │
│   [!] Unable to load chart data        │
│                                        │
│           [Retry]                      │
│                                        │
└────────────────────────────────────────┘

PARTIAL DATA ERROR:
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ $245,000      │ $45,200       │ [!] Error     │ $5,213        │
│ +12% YoY      │ +8% vs LY     │   [Retry]     │ +3% vs avg    │
└───────────────┴───────────────┴───────────────┴───────────────┘
↑ Other metrics still display, failed one shows error with retry
```

### Success States

```
DATA REFRESHED:
┌────────────────────────────────────────┐
│ [check] Data updated                   │
│ <- Toast notification (2s)             │
└────────────────────────────────────────┘

METRIC CARD CLICK (opens detail):
┌─────────────────┐
│ Total Orders    │ <- Hover: slight elevation
│ ─────────────── │
│ 47              │
│ 15 this year    │
│        [→]      │ <- Click: navigates to orders
└─────────────────┘
```

---

## Accessibility Notes

### Focus Order

1. **Metric Cards Row**
   - Tab through each metric card (left to right)
   - Enter/Space on card opens detailed breakdown

2. **Chart**
   - Tab to chart region
   - Arrow keys to navigate data points
   - Enter to view point details

3. **Action Items**
   - Tab to "View All" links
   - Tab to individual item actions

### ARIA Requirements

```html
<!-- Dashboard Region -->
<section
  role="region"
  aria-label="Customer metrics dashboard"
>

<!-- Metric Card -->
<article
  role="article"
  tabindex="0"
  aria-label="Lifetime value: $245,000, up 12% year over year"
>
  <h3>Lifetime Value</h3>
  <p class="value">$245,000</p>
  <p class="trend">+12% YoY</p>
</article>

<!-- Chart -->
<figure
  role="img"
  aria-label="Order trend chart showing revenue and order count over the last 12 months. Revenue peaked in August at $12,450."
>
  <svg>...</svg>
  <figcaption>Revenue and Order Trend</figcaption>
</figure>

<!-- Chart Data Table (sr-only) -->
<table class="sr-only" aria-label="Monthly order data">
  <tr><th>Month</th><th>Revenue</th><th>Orders</th></tr>
  <tr><td>January</td><td>$8,200</td><td>3</td></tr>
  ...
</table>

<!-- Overdue Alert -->
<div
  role="alert"
  aria-label="2 overdue invoices totaling $4,500"
>
  <h3>Overdue Invoices</h3>
  ...
</div>

<!-- Progress Indicators -->
<span
  aria-label="Year over year change: positive 12%"
>
  +12% YoY [^]
</span>
```

### Screen Reader Announcements

- Dashboard loaded: "Customer metrics dashboard loaded. Lifetime value $245,000, YTD revenue $45,200..."
- Metric card focus: "Lifetime value: $245,000, up 12% year over year. Press Enter for details."
- Chart navigation: "August 2025: Revenue $12,450, 5 orders"
- Overdue alert: "Alert: 2 overdue invoices totaling $4,500"
- Data refresh: "Metrics data refreshed"

---

## Animation Choreography

### Dashboard Entry

```
INITIAL LOAD:
- Duration: 400ms total
- Stagger: 50ms between cards
- Each card:
  - Opacity: 0 -> 1
  - Transform: translateY(8px) -> translateY(0)
- Chart loads last with shimmer -> render

METRIC VALUES:
- Duration: 600ms
- Number animation: count up from 0 to value
- Easing: ease-out
```

### Chart Animations

```
CHART RENDER:
- Duration: 800ms
- Bars: grow from bottom to height
- Stagger: 30ms between bars
- Easing: ease-out

LINE CHART (if used):
- Duration: 1000ms
- Path: draw stroke from left to right
- Easing: ease-in-out

HOVER:
- Duration: 150ms
- Tooltip: fade in + translateY(-4px)
- Bar/point: slight scale (1 -> 1.05)
```

### Metric Card Interactions

```
HOVER:
- Duration: 150ms
- Transform: translateY(-2px)
- Box-shadow: elevation increase
- Easing: ease-out

CLICK/FOCUS:
- Duration: 100ms
- Transform: scale(0.98)
- Background: subtle highlight

DATA UPDATE:
- Duration: 300ms
- Old value: fade out
- New value: fade in
- Change indicator: pulse if changed
```

### Alert Animations

```
OVERDUE ALERT APPEAR:
- Duration: 300ms
- Transform: scale(0.95) -> scale(1)
- Border: pulse highlight (2x)
- Background: subtle red pulse

ALERT DISMISS:
- Duration: 200ms
- Height: collapse to 0
- Opacity: 1 -> 0
```

### Loading States

```
SKELETON SHIMMER:
- Duration: 1.5s
- Gradient: left to right sweep
- Loop: infinite
- Easing: linear

VALUE SKELETON:
- Skeleton width matches expected value width
- Maintains layout stability
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: Financial dashboards, Stripe Dashboard, Square Dashboard
- **Cards**: Clean white cards with subtle shadows
- **Typography**: Large, bold numbers for primary metrics
- **Colors**:
  - Positive trends: Green (#4CAF50)
  - Negative trends: Red (#F44336)
  - Neutral: Gray
- **Charts**: Simple, clean bar charts with hover states

### Visual Hierarchy

1. Primary metrics (LTV, YTD) largest and most prominent
2. Trend indicators visually connected to values
3. Chart draws eye in center/below
4. Alerts stand out with color but don't dominate
5. Secondary info (dates, frequencies) smaller text

### Reference Files

- `.square-ui-reference/templates/dashboard-1/` - Metrics dashboard layout
- `.reui-reference/components/analytics.tsx` - Chart and gauge components

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/customer-metrics-dashboard.tsx` | Main dashboard component |
| `src/routes/_authed/customers/$customerId.tsx` | Integration (overview tab) |

---

## Performance Requirements

Per PRD requirements:
- Dashboard renders in < 200ms
- Data fetches in parallel where possible
- Charts use canvas/SVG efficiently
- Skeleton states prevent layout shift
