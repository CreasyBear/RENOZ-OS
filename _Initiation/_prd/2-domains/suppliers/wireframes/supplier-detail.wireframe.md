# Wireframe: Supplier Detail / 360 Page

> **PRD**: suppliers.prd.json
> **Story**: DOM-SUPP-001 (Performance Tracking)
> **Domain**: Suppliers (DOM-SUPPLIERS)
> **Type**: Detail/360 Page
> **Last Updated**: 2026-01-10

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | suppliers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-SUPP-001 | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/suppliers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Overview

The Supplier Detail page provides a comprehensive 360-degree view of a supplier including profile information, performance scorecard, order history, price lists, and communication log. This page serves as the hub for all supplier-related activities.

---

## UI Patterns (Reference Implementation)

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-tabs.tsx`
- **Features**:
  - Supplier detail tabs (Overview, Orders, Prices, Stats, Documents)
  - Scrollable tabs for mobile with horizontal scroll
  - Active tab state with underline indicator

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Contact information card
  - Business details card
  - Performance scorecard with progress bars
  - Order history summary cards

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Status badge (Active/Inactive)
  - Performance rating stars
  - Category badges for supplier types
  - Tier indicators (Gold/Silver/Bronze)

### Chart
- **Pattern**: RE-UI Chart
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Performance scorecard progress bars (on-time delivery, quality rating)
  - Order volume trend line chart
  - Spend over time bar chart
  - Lead time distribution chart

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Order history table with status, date, value columns
  - Price list table on Prices tab
  - Communication log table with timestamps

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-dialog.tsx`
- **Features**:
  - Edit supplier info dialog
  - Create PO from supplier dialog
  - Document upload dialog
  - Email/communication dialog

---

## Mobile Wireframe (375px)

### Header Section

```
+=========================================+
| < Suppliers                      [...]  | <- Back + Actions menu
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |              [LOGO]               |  | <- Supplier logo/avatar
|  |                                   |  |
|  |    ABC Building Supplies          |  |
|  |    Active                 [****]  |  | <- Status + rating
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [Create PO]  [Email]  [Call]      |  | <- Quick actions
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
| [Overview] [Orders] [Prices] [Stats]    | <- Scrollable tabs
| =========                               |
+-----------------------------------------+
```

### Overview Tab

```
+=========================================+
|                                         |
|  CONTACT INFORMATION                    |
|  -----------------------------------    |
|  Primary Contact                        |
|  John Smith                             |
|  john@abcbuilding.com                   |
|  +1 (555) 123-4567                      |
|                                         |
|  Address                                |
|  123 Industrial Way                     |
|  Building A, Suite 100                  |
|  Houston, TX 77001                      |
|                                         |
|  -----------------------------------    |
|                                         |
|  BUSINESS DETAILS                       |
|  -----------------------------------    |
|  ABN: 12 345 678 901                    |
|  Payment Terms: Net 30                  |
|  Categories: Building Materials,        |
|              Lumber, Hardware           |
|                                         |
|  -----------------------------------    |
|                                         |
|  PERFORMANCE SCORECARD                  |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | On-Time Delivery                  |  |
|  | [================    ] 94%        |  | <- Green
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Quality Rating                    |  |
|  | [===============     ] 91%        |  | <- Green
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Response Time                     |  |
|  | [============        ] 78%        |  | <- Yellow
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Pricing Competitiveness           |  |
|  | [=================   ] 96%        |  | <- Green
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  QUICK STATS                            |
|  -----------------------------------    |
|  +----------+ +----------+ +----------+ |
|  | Orders   | | YTD      | | Avg Lead | |
|  |   45     | | $125K    | |  3 days  | |
|  +----------+ +----------+ +----------+ |
|                                         |
|  +----------+ +----------+ +----------+ |
|  | Open POs | | Pending  | | Overdue  | |
|  |    3     | | $12,500  | |    0     | |
|  +----------+ +----------+ +----------+ |
|                                         |
+=========================================+
```

### Orders Tab

```
+=========================================+
|                                         |
|  PURCHASE ORDERS                        |
|  -----------------------------------    |
|                                         |
|  [All v] [Open v] [Search...        ]   |
|                                         |
|  +-----------------------------------+  |
|  | PO-2024-0145                      |  |
|  | Received              $2,450.00   |  |
|  | Jan 8, 2026                       |  |
|  | 12 items                          |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | PO-2024-0142                      |  |
|  | Partially Received    $5,670.00   |  |
|  | Jan 5, 2026              [!]      |  | <- Has back-ordered
|  | 8 items (3 pending)               |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | PO-2024-0138                      |  |
|  | Sent                  $3,200.00   |  |
|  | Jan 2, 2026                       |  |
|  | 6 items                           |  |
|  +-----------------------------------+  |
|                                         |
|  [View All Orders (45)]                 |
|                                         |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |    [+] CREATE PURCHASE ORDER      |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Stats Tab (Performance Details)

```
+=========================================+
|                                         |
|  PERFORMANCE METRICS                    |
|  -----------------------------------    |
|                                         |
|  Period: [Last 12 Months v]             |
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |        DELIVERY PERFORMANCE       |  |
|  |                                   |  |
|  |   [Chart: Line graph showing      |  |
|  |    on-time % over 12 months]      |  |
|  |                                   |  |
|  |   ------------------------------- |  |
|  |   Target: 90%  |  Actual: 94%     |  |
|  |   Trend: +3% from prev period     |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  DELIVERY BREAKDOWN                     |
|  +-----------------------------------+  |
|  | On Time          | 42    | 93.3%  |  |
|  | Early            |  2    |  4.4%  |  |
|  | Late (1-3 days)  |  1    |  2.2%  |  |
|  | Late (3+ days)   |  0    |  0.0%  |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  QUALITY METRICS                        |
|  +-----------------------------------+  |
|  | Orders Received   | 45            |  |
|  | Items Received    | 324           |  |
|  | Items Rejected    | 12    (3.7%)  |  |
|  | Value Rejected    | $890          |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  COMPARISON                             |
|  +-----------------------------------+  |
|  | vs Category Average:              |  |
|  |                                   |  |
|  | On-Time:  [=======*====] +7%     |  |
|  | Quality:  [======*=====] +4%     |  |
|  | Response: [====*=======] -8%     |  |
|  | Price:    [=========*==] +12%    |  |
|  +-----------------------------------+  |
|                                         |
|  [Download Performance Report]          |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

```
+================================================================+
| < Suppliers                                                     |
+----------------------------------------------------------------+
|                                                                 |
| +-- SUPPLIER HEADER -------------------------------------------+
| |                                                               |
| | [LOGO]  ABC Building Supplies                     [Actions v] |
| |         Active                            [****]              |
| |         Primary: John Smith | john@abcbuilding.com            |
| |                                                               |
| |  [Create PO]  [Send Email]  [View Catalog]                    |
| |                                                               |
| +---------------------------------------------------------------+
|                                                                 |
| [Overview] [Orders] [Prices] [Stats] [Documents] [Notes]        |
| ==========                                                      |
+----------------------------------------------------------------+
|                                                                 |
| +-- LEFT COLUMN ------------------+ +-- RIGHT COLUMN ----------+|
| |                                 | |                          ||
| | CONTACT INFORMATION             | | PERFORMANCE SCORECARD    ||
| | ------------------------------- | | ------------------------ ||
| | Primary Contact                 | |                          ||
| | John Smith                      | | On-Time Delivery         ||
| | john@abcbuilding.com            | | [=============   ] 94%   ||
| | +1 (555) 123-4567               | |                          ||
| |                                 | | Quality Rating           ||
| | Address                         | | [============    ] 91%   ||
| | 123 Industrial Way              | |                          ||
| | Building A, Suite 100           | | Response Time            ||
| | Houston, TX 77001               | | [==========      ] 78%   ||
| |                                 | |                          ||
| | ------------------------------- | | Pricing                  ||
| |                                 | | [==============  ] 96%   ||
| | BUSINESS DETAILS                | |                          ||
| | ------------------------------- | | ------------------------ ||
| | ABN: 12 345 678 901             | |                          ||
| | Payment Terms: Net 30           | | QUICK STATS              ||
| | Categories: Building Materials  | | +-------+ +-------+      ||
| |                                 | | |Orders | |YTD Val|      ||
| |                                 | | |  45   | |$125K  |      ||
| |                                 | | +-------+ +-------+      ||
| |                                 | | +-------+ +-------+      ||
| |                                 | | |Open PO| |Avg Ld |      ||
| |                                 | | |   3   | |3 days |      ||
| |                                 | | +-------+ +-------+      ||
| +---------------------------------+ +---------------------------+|
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Suppliers                                                            |
| ----------- |                                                                                |
| Procurement | +-- SUPPLIER HEADER --------------------------------------------------------+  |
|   Dashboard |  |                                                                          |  |
|   Suppliers |  |  [LOGO]  ABC Building Supplies                                          |  |
|   Orders    |  |          Active  |  Houston, TX  |  Supplier since 2019         [****]  |  |
| Catalog     |  |                                                                          |  |
| Jobs        |  |  +----------+ +-------------+ +------------+ +----------+ +----------+  |  |
| Pipeline    |  |  |[Create   ]| |[Send       ]| |[View      ]| |[Edit    ]| |[...     ]|  |  |
| Support     |  |  |[ PO     ]| |[ Email    ]| |[ Catalog ]| |[Supplier]| |[Actions]|  |  |
|             |  |  +----------+ +-------------+ +------------+ +----------+ +----------+  |  |
|             |  |                                                                          |  |
|             | +--------------------------------------------------------------------------+  |
|             |                                                                                |
|             | [Overview] [Orders (45)] [Price List] [Performance] [Documents] [Notes]        |
|             | ==========                                                                     |
|             |                                                                                |
|             | +-- MAIN CONTENT -----------------------------------------------------------+  |
|             | |                                                                           |  |
|             | | +-- CONTACT & BUSINESS ------------+ +-- PERFORMANCE SCORECARD ---------+|  |
|             | | |                                  | |                                   ||  |
|             | | | CONTACT INFORMATION              | |  Overall Rating: [****] 4.2/5.0  ||  |
|             | | | ---------------------------      | |  -------------------------------- ||  |
|             | | | Primary Contact                  | |                                   ||  |
|             | | | John Smith (Account Manager)     | |  +-- On-Time Delivery -----------+||  |
|             | | | john@abcbuilding.com             | |  |                               |||  |
|             | | | +1 (555) 123-4567                | |  | [==================   ] 94%   |||  |
|             | | |                                  | |  | Target: 90%  |  Trend: +3%    |||  |
|             | | | Accounts Payable                 | |  +-------------------------------+||  |
|             | | | ap@abcbuilding.com               | |                                   ||  |
|             | | | +1 (555) 123-4568                | |  +-- Quality Rating -------------+||  |
|             | | |                                  | |  |                               |||  |
|             | | | ---------------------------      | |  | [=================    ] 91%   |||  |
|             | | |                                  | |  | Target: 85%  |  Trend: +2%    |||  |
|             | | | ADDRESS                          | |  +-------------------------------+||  |
|             | | | 123 Industrial Way               | |                                   ||  |
|             | | | Building A, Suite 100            | |  +-- Response Time --------------+||  |
|             | | | Houston, TX 77001                | |  |                               |||  |
|             | | |                                  | |  | [=============        ] 78%   |||  |
|             | | | ---------------------------      | |  | Target: 85%  |  Trend: -5%    |||  |
|             | | |                                  | |  | [!] Below target              |||  |
|             | | | BUSINESS DETAILS                 | |  +-------------------------------+||  |
|             | | | ABN: 12 345 678 901              | |                                   ||  |
|             | | | Payment Terms: Net 30            | |  +-- Price Competitiveness ------+||  |
|             | | | Credit Limit: $50,000            | |  |                               |||  |
|             | | | Categories:                      | |  | [====================  ] 96%  |||  |
|             | | |   - Building Materials           | |  | Best in category              |||  |
|             | | |   - Lumber & Wood                | |  +-------------------------------+||  |
|             | | |   - Hardware & Fasteners         | |                                   ||  |
|             | | +----------------------------------+ +-----------------------------------+|  |
|             | |                                                                           |  |
|             | | +-- QUICK STATS --------------------------------------------------------+|  |
|             | | |                                                                       ||  |
|             | | | +-------------+ +-------------+ +-------------+ +-------------+       ||  |
|             | | | | Total       | | YTD         | | Open POs    | | Avg Lead    |       ||  |
|             | | | | Orders      | | Value       | |             | | Time        |       ||  |
|             | | | |             | |             | |             | |             |       ||  |
|             | | | |    45       | |  $125,000   | |     3       | |   3 days    |       ||  |
|             | | | |             | |             | |  $12,500    | |             |       ||  |
|             | | | +-------------+ +-------------+ +-------------+ +-------------+       ||  |
|             | | |                                                                       ||  |
|             | | +-----------------------------------------------------------------------+|  |
|             | |                                                                           |  |
|             | | +-- RECENT ORDERS ------------------------------------------------------+|  |
|             | | |                                                                       ||  |
|             | | | PO #          | Date       | Status              | Value    | Items  ||  |
|             | | | ------------- + ---------- + ------------------- + -------- + ------ ||  |
|             | | | PO-2024-0145  | Jan 8      | Received            | $2,450   |  12    ||  |
|             | | | PO-2024-0142  | Jan 5      | Partially Received  | $5,670   |   8    ||  |
|             | | | PO-2024-0138  | Jan 2      | Sent                | $3,200   |   6    ||  |
|             | | |                                                                       ||  |
|             | | | [View All Orders]                                                     ||  |
|             | | +-----------------------------------------------------------------------+|  |
|             | |                                                                           |  |
|             | +--------------------------------------------------------------------------+  |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

---

## Performance Scorecard Widget

### Compact Version (for sidebars/cards)

```
+-----------------------------------+
| PERFORMANCE SCORECARD             |
| Overall: [****] 4.2 / 5.0         |
+-----------------------------------+
| On-Time     [=========   ] 94%    |
| Quality     [========    ] 91%    |
| Response    [======      ] 78% [!]|
| Pricing     [==========  ] 96%    |
+-----------------------------------+
```

### Expanded Version (for Stats tab)

```
+-------------------------------------------------------------------+
| PERFORMANCE SCORECARD                         Period: Last 12 Months|
+-------------------------------------------------------------------+
|                                                                    |
|  Overall Rating: [****] 4.2 / 5.0                                  |
|  ----------------------------------------------------------------  |
|                                                                    |
|  +-- ON-TIME DELIVERY (94%) ----------------------------------+    |
|  |                                                            |    |
|  |  [==============================================    ] 94%  |    |
|  |                                                            |    |
|  |  Target: 90%  |  Trend: +3%  |  Rank: #2 of 12 suppliers   |    |
|  |                                                            |    |
|  |  Breakdown:                                                |    |
|  |  +------------+--------+---------+                         |    |
|  |  | On Time    |   42   |  93.3%  |                         |    |
|  |  | Early      |    2   |   4.4%  |                         |    |
|  |  | Late 1-3d  |    1   |   2.2%  |                         |    |
|  |  | Late 3d+   |    0   |   0.0%  |                         |    |
|  |  +------------+--------+---------+                         |    |
|  +------------------------------------------------------------+    |
|                                                                    |
|  +-- QUALITY RATING (91%) ------------------------------------+    |
|  |                                                            |    |
|  |  [==========================================        ] 91%  |    |
|  |                                                            |    |
|  |  Target: 85%  |  Trend: +2%  |  Rank: #3 of 12 suppliers   |    |
|  |                                                            |    |
|  |  Items Received: 324  |  Rejected: 12 (3.7%)               |    |
|  |  Rejection Value: $890                                     |    |
|  +------------------------------------------------------------+    |
|                                                                    |
|  +-- RESPONSE TIME (78%) -------------------------------------+    |
|  |                                                            |    |
|  |  [================================                  ] 78%  |    |
|  |                                                            |    |
|  |  [!] BELOW TARGET - Target: 85%  |  Trend: -5%             |    |
|  |                                                            |    |
|  |  Avg Response: 4.2 hours  |  Target: 2 hours               |    |
|  +------------------------------------------------------------+    |
|                                                                    |
|  [Download Report PDF]  [View Trend Charts]                        |
|                                                                    |
+-------------------------------------------------------------------+
```

---

## Loading State

```
+=========================================+
| < Suppliers                      [...]  |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |         [shimmer======]           |  |
|  |                                   |  |
|  |    [shimmer==================]    |  |
|  |    [shimmer======]  [shimmer=]    |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer===] [shimmer] [shimmer]  |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
| [shimmer===] [shimmer==] [shimmer===]   |
+-----------------------------------------+
|                                         |
|  [shimmer=================]             |
|  [shimmer==========]                    |
|  [shimmer================]              |
|  [shimmer=======]                       |
|                                         |
|  [shimmer=================]             |
|  [shimmer==========]                    |
|  [shimmer================]              |
|                                         |
+=========================================+
```

---

## Error State

```
+=========================================+
|                                         |
|           +-------------+               |
|           |    [!]      |               |
|           +-------------+               |
|                                         |
|     UNABLE TO LOAD SUPPLIER             |
|                                         |
|   There was a problem loading this      |
|   supplier's information.               |
|                                         |
|   Error: Connection timeout             |
|                                         |
|   [Retry]  [Back to Suppliers]          |
|                                         |
+=========================================+
  role="alert"
  aria-live="assertive"
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<main role="main" aria-label="Supplier details for ABC Building Supplies">
  <header role="banner">
    <h1>ABC Building Supplies</h1>
    <span role="status">Active supplier</span>
    <div role="group" aria-label="Performance rating: 4 out of 5 stars">
      <!-- Star icons -->
    </div>
  </header>

  <nav role="tablist" aria-label="Supplier information tabs">
    <button role="tab" aria-selected="true" aria-controls="overview-panel">
      Overview
    </button>
    <button role="tab" aria-selected="false" aria-controls="orders-panel">
      Orders
    </button>
    <!-- ... -->
  </nav>

  <section role="tabpanel" id="overview-panel" aria-labelledby="overview-tab">
    <section role="region" aria-label="Performance scorecard">
      <h2>Performance Scorecard</h2>
      <div role="meter" aria-valuenow="94" aria-valuemin="0" aria-valuemax="100"
           aria-label="On-time delivery: 94 percent">
        <!-- Progress bar -->
      </div>
    </section>
  </section>
</main>
```

### Keyboard Navigation

```
Tab Order:
1. Back button
2. Actions menu
3. Quick action buttons (Create PO, Email, Call)
4. Tab navigation (Overview, Orders, Prices, Stats)
5. Tab panel content
6. Interactive elements within panel

Tab Panel Navigation:
- Left/Right Arrow: Switch between tabs
- Enter/Space: Activate tab
- Home: First tab
- End: Last tab

Actions Menu:
- Enter: Open menu
- Arrow Up/Down: Navigate options
- Enter: Select option
- Escape: Close menu
```

### Screen Reader Announcements

```
On page load:
  "Supplier details: ABC Building Supplies. Active supplier.
   Performance rating: 4 out of 5 stars.
   Use tab navigation to explore Overview, Orders, Prices, and Stats."

On tab change:
  "Orders tab selected. Showing 45 purchase orders."

On scorecard focus:
  "Performance scorecard. On-time delivery: 94 percent,
   above 90 percent target, trending up 3 percent."

On performance warning:
  "Response time: 78 percent, below 85 percent target.
   This metric needs attention."
```

---

## Animation Choreography

### Page Load

```
INITIAL LOAD:
- Header: Fade in (0-200ms)
- Action buttons: Stagger slide up (200-400ms)
- Tabs: Fade in (300-400ms)
- Content cards: Stagger fade in (400-700ms)

SCORECARD ANIMATION:
- Progress bars: Animate from 0% to value (500-800ms)
- Easing: ease-out-cubic
- Stagger: 100ms between metrics
```

### Tab Transitions

```
TAB CHANGE:
- Current panel: Fade out left (0-150ms)
- New panel: Fade in right (150-350ms)
- Content: Stagger fade in (350-550ms)
```

### Performance Metrics

```
METRIC UPDATE:
- Old value: Counter down (0-200ms)
- New value: Counter up (200-400ms)
- Progress bar: Animate to new position (200-400ms)
- Trend indicator: Bounce in (400-500ms)
```

---

## Component Props Interface

```typescript
// SupplierDetailPage.tsx
interface SupplierDetailPageProps {
  // Uses route loader data
}

// SupplierHeader.tsx
interface SupplierHeaderProps {
  supplier: {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    rating: number;
    logoUrl?: string;
    location?: string;
    since?: string;
  };
  onCreatePO: () => void;
  onEmail: () => void;
  onEdit: () => void;
}

// PerformanceScorecard.tsx
interface PerformanceScorecardProps {
  metrics: {
    onTimeDelivery: MetricValue;
    qualityRating: MetricValue;
    responseTime: MetricValue;
    pricingCompetitiveness: MetricValue;
  };
  overallRating: number;
  period: 'last_30_days' | 'last_90_days' | 'last_12_months' | 'all_time';
  variant?: 'compact' | 'expanded';
}

interface MetricValue {
  value: number; // 0-100
  target: number;
  trend: number; // +/- percentage change
  rank?: {
    position: number;
    total: number;
  };
}

// PerformanceMetric.tsx
interface PerformanceMetricProps {
  label: string;
  value: number;
  target: number;
  trend?: number;
  showWarning?: boolean;
  variant?: 'progress' | 'gauge';
  animate?: boolean;
}

// SupplierQuickStats.tsx
interface SupplierQuickStatsProps {
  stats: {
    totalOrders: number;
    ytdValue: number;
    openPOs: number;
    openPOValue: number;
    avgLeadTime: number;
    overdueItems: number;
  };
}

// RecentOrdersList.tsx
interface RecentOrdersListProps {
  orders: Array<{
    id: string;
    poNumber: string;
    date: Date;
    status: POStatus;
    value: number;
    itemCount: number;
    hasBackOrdered?: boolean;
  }>;
  supplierId: string;
  limit?: number;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/suppliers/$supplierId.tsx` | Modify | Implement 360 layout |
| `src/components/domain/suppliers/supplier-header.tsx` | Create | Header with actions |
| `src/components/domain/suppliers/performance-scorecard.tsx` | Create | Scorecard widget |
| `src/components/domain/suppliers/performance-metric.tsx` | Create | Individual metric display |
| `src/components/domain/suppliers/supplier-quick-stats.tsx` | Create | Stats grid |
| `src/components/domain/suppliers/recent-orders-list.tsx` | Create | Order preview list |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load | < 2s | Time to interactive |
| Tab switch | < 300ms | Panel content visible |
| Scorecard animation | < 800ms | All bars animated |
| Action response | < 100ms | Visual feedback |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
