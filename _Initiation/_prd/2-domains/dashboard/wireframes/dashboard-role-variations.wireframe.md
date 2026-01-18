# Dashboard Role Variations Wireframe

**Story:** Related to all dashboard stories (role-based defaults)
**Purpose:** Role-specific dashboard layouts optimized for each user's workflow
**Design Aesthetic:** Contextual relevance - right information for the right role

---

## UI Patterns (Reference Implementation)

### Badge (Role Indicator)
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Role badge display in header (Admin, Sales, Warehouse, Viewer)
  - Color-coded by role (purple/Admin, blue/Sales, orange/Warehouse, gray/Viewer)
  - Compact size for header placement
  - Read-only visual indicator

### Card (Grid Layout)
- **Pattern**: RE-UI Card with react-grid-layout
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Role-specific widget arrangement and sizing
  - Drag-and-drop customization (Admin, Sales, Warehouse)
  - Locked layout for Viewer role
  - Responsive breakpoints for different grid columns

### DataTable (Role-Filtered)
- **Pattern**: Midday DataTable
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/tables/`
- **Features**:
  - Today's Shipments table (Warehouse-specific)
  - Stale Opportunities table (Sales-specific)
  - Low Stock Alerts table (Warehouse/Admin)
  - Role-based column visibility and actions

### Button (Quick Actions)
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Role-specific quick action buttons (e.g., "Scan Barcode" for Warehouse)
  - Context-aware button visibility based on permissions
  - Icon + label combinations for clarity
  - Primary action prominence per role workflow

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Role Overview

```
+--------------------------------------------------+
| ROLE          | PRIMARY FOCUS        | WIDGETS   |
+--------------------------------------------------+
| Admin         | Full business view   | All       |
| Sales         | Pipeline & Revenue   | Sales     |
| Warehouse     | Orders & Inventory   | Operations|
| Viewer        | Summary only         | KPIs only |
+--------------------------------------------------+
```

## Admin Dashboard (Full Access)

```
+========================================================================+
|  ADMIN DASHBOARD - COMPLETE BUSINESS VIEW                               |
+========================================================================+
|  Good morning, Admin                                      [Admin Role]  |
|  Full visibility into all business operations                           |
+========================================================================+
|                                                                         |
|  METRICS ROW (6 KPIs)                                                   |
|  +----------+ +----------+ +----------+ +----------+ +----------+ +----+
|  | Revenue  | | Orders   | | Pipeline | | Warranty | | Issues   | |AOV |
|  | $45,230  | | 47       | | $456K    | | 156      | | 7        | |$342|
|  | +15%     | | +12%     | | +8%      | | 5 expir  | | -2       | |+5% |
|  +----------+ +----------+ +----------+ +----------+ +----------+ +----+
|                                                                         |
|  WIDGET GRID                                                            |
|  +---------------------------+ +---------------------------+            |
|  |  REVENUE TREND (6 cols)   | |  ORDERS STATUS (4 cols)   |            |
|  |  [Line Chart]             | |  [Pie Chart]              |            |
|  |  Last 6 months            | |  Status breakdown         |            |
|  +---------------------------+ +---------------------------+            |
|  +---------------------------+ +---------------------------+            |
|  |  PIPELINE FUNNEL (6 cols) | |  TOP CUSTOMERS (4 cols)   |            |
|  |  [Funnel Chart]           | |  [Bar Chart]              |            |
|  |  Lead to Won              | |  Top 5 by revenue         |            |
|  +---------------------------+ +---------------------------+            |
|  +------------------------------------------------------------------+  |
|  |  RECENT ORDERS TABLE (12 cols)                                    |  |
|  |  Order ID | Customer | Amount | Status | Date                     |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
+========================================================================+
```

### Admin Widget Configuration

```
+--------------------------------------------------+
| ADMIN DEFAULT WIDGETS                             |
+--------------------------------------------------+
| KPIs:                                             |
| - kpi-revenue (x:0, y:0, w:3, h:2)               |
| - kpi-orders (x:3, y:0, w:3, h:2)                |
| - kpi-pipeline (x:6, y:0, w:3, h:2)              |
| - kpi-warranties (x:9, y:0, w:3, h:2)            |
| - kpi-issues (x:0, y:2, w:3, h:2)                |
| - kpi-avg-order-value (x:3, y:2, w:3, h:2)       |
|                                                   |
| Charts:                                           |
| - chart-revenue-trend (x:0, y:4, w:6, h:4)       |
| - chart-orders-status (x:6, y:4, w:4, h:4)       |
| - chart-pipeline-funnel (x:0, y:8, w:6, h:4)     |
| - chart-top-customers (x:6, y:8, w:4, h:4)       |
|                                                   |
| Tables:                                           |
| - table-recent-orders (x:0, y:12, w:12, h:4)     |
+--------------------------------------------------+
```

## Sales Dashboard (Revenue-Focused)

```
+========================================================================+
|  SALES DASHBOARD - REVENUE & PIPELINE FOCUS                             |
+========================================================================+
|  Good morning, Sales Rep                                   [Sales Role] |
|  Your pipeline is looking strong!                                       |
+========================================================================+
|                                                                         |
|  METRICS ROW (3 KPIs - Sales-Focused)                                   |
|  +----------------+ +----------------+ +----------------+               |
|  | Pipeline Value | | Revenue MTD    | | Avg Order Val  |               |
|  | $456,789       | | $45,230        | | $342           |               |
|  | +8.5%          | | +15.3%         | | +5.2%          |               |
|  | 23 active      | | vs $39K last   | | vs $325 last   |               |
|  +----------------+ +----------------+ +----------------+               |
|                                                                         |
|  WIDGET GRID - SALES OPTIMIZED                                          |
|  +---------------------------+ +---------------------------+            |
|  |  PIPELINE FUNNEL (6 cols) | |  REVENUE TREND (6 cols)   |            |
|  |  [Funnel Chart]           | |  [Line Chart]             |            |
|  |  Stage progression        | |  Your monthly trend       |            |
|  |  Conversion rates         | |  vs team average          |            |
|  +---------------------------+ +---------------------------+            |
|  +---------------------------+ +---------------------------+            |
|  |  TOP CUSTOMERS (6 cols)   | |  STALE OPPS (6 cols)      |            |
|  |  [Bar Chart]              | |  [Table]                  |            |
|  |  Your top accounts        | |  Needs follow-up          |            |
|  |  by revenue contribution  | |  No activity > 7 days     |            |
|  +---------------------------+ +---------------------------+            |
|                                                                         |
+========================================================================+
|  QUICK ACTIONS: [+ New Opportunity] [Log Activity] [View Pipeline]     |
+========================================================================+
```

### Sales Widget Configuration

```
+--------------------------------------------------+
| SALES DEFAULT WIDGETS                             |
+--------------------------------------------------+
| KPIs (Pipeline & Revenue focused):                |
| - kpi-pipeline (x:0, y:0, w:4, h:2)              |
| - kpi-revenue (x:4, y:0, w:4, h:2)               |
| - kpi-avg-order-value (x:8, y:0, w:4, h:2)       |
|                                                   |
| Charts:                                           |
| - chart-pipeline-funnel (x:0, y:2, w:6, h:4)     |
| - chart-revenue-trend (x:6, y:2, w:6, h:4)       |
| - chart-top-customers (x:0, y:6, w:6, h:4)       |
|                                                   |
| Tables:                                           |
| - table-stale-opportunities (x:6, y:6, w:6, h:4) |
+--------------------------------------------------+
```

### Sales-Specific Features

```
SALES DASHBOARD ENHANCEMENTS:

1. Personal Performance:
   +----------------------------------+
   | Your Performance This Month      |
   | +------------------------------+ |
   | | Revenue: $45,230 / $60,000   | |
   | | [=================>---] 75%  | |
   | | 15 days remaining            | |
   | +------------------------------+ |
   | vs Team Average: 82%            |
   +----------------------------------+

2. Follow-Up Reminders:
   +----------------------------------+
   | Follow-Up Needed Today           |
   | +------------------------------+ |
   | | - Acme Corp (no contact 5d)  | |
   | | - Beta Inc (proposal sent)   | |
   | | - Gamma LLC (meeting sched)  | |
   | +------------------------------+ |
   +----------------------------------+

3. Leaderboard (Optional):
   +----------------------------------+
   | Sales Leaderboard - December     |
   | +------------------------------+ |
   | | 1. Jane - $68,450           | |
   | | 2. You - $45,230 (!)        | |
   | | 3. Bob - $42,100            | |
   | +------------------------------+ |
   +----------------------------------+
```

## Warehouse/Operations Dashboard

```
+========================================================================+
|  OPERATIONS DASHBOARD - ORDERS & INVENTORY FOCUS                        |
+========================================================================+
|  Good morning, Warehouse Manager                       [Warehouse Role] |
|  15 orders ready to ship today                                          |
+========================================================================+
|                                                                         |
|  PRIORITY ALERT BANNER                                                  |
|  +------------------------------------------------------------------+  |
|  | [!] 3 orders overdue | 5 low stock items | 2 pending deliveries   |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  TODAY'S SHIPMENTS (Priority Widget - Large)                            |
|  +------------------------------------------------------------------+  |
|  |  TODAY'S SHIPMENTS                              [8 cols]          |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | Priority | Order    | Customer   | Items | Ship By | Status   ||  |
|  |  |----------|----------|------------|-------|---------|----------|  |
|  |  | [!] HIGH | ORD-1234 | Acme Corp  | 5     | 10:00AM | Ready    ||  |
|  |  | [!] HIGH | ORD-1235 | Beta Inc   | 3     | 11:00AM | Packing  ||  |
|  |  | [-] MED  | ORD-1236 | Gamma LLC  | 8     | 2:00PM  | Ready    ||  |
|  |  +--------------------------------------------------------------+|  |
|  |  [Ship Selected] [Print Labels] [Mark Shipped]                   |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +---------------------------+ +---------------------------+            |
|  |  ORDERS BY STATUS (6 col) | |  LOW STOCK ALERTS (6 col) |            |
|  |  [Pie Chart]              | |  [Table]                  |            |
|  |  Pending/Ready/Shipped    | |  Items below threshold    |            |
|  |  Today's distribution     | |  Reorder recommendations  |            |
|  +---------------------------+ +---------------------------+            |
|  +---------------------------+ +---------------------------+            |
|  |  RECENT ORDERS (6 cols)   | |  INVENTORY LEVELS (6 cols)|            |
|  |  [Table]                  | |  [Stacked Bar]            |            |
|  |  Latest incoming orders   | |  By category              |            |
|  +---------------------------+ +---------------------------+            |
|                                                                         |
+========================================================================+
|  QUICK ACTIONS: [Scan Barcode] [Receive Shipment] [Inventory Count]    |
+========================================================================+
```

### Warehouse Widget Configuration

```
+--------------------------------------------------+
| WAREHOUSE DEFAULT WIDGETS                         |
+--------------------------------------------------+
| Priority Widget:                                  |
| - quick-todays-shipments (x:0, y:0, w:8, h:5)    |
| - kpi-orders (x:8, y:0, w:4, h:2)                |
|                                                   |
| Charts:                                           |
| - chart-orders-status (x:0, y:5, w:6, h:4)       |
| - chart-inventory-levels (x:6, y:5, w:6, h:4)    |
|                                                   |
| Tables:                                           |
| - table-recent-orders (x:0, y:9, w:6, h:4)       |
| - table-low-stock (x:6, y:9, w:6, h:4)           |
+--------------------------------------------------+
```

### Warehouse-Specific Features

```
WAREHOUSE DASHBOARD ENHANCEMENTS:

1. Today's Workload Summary:
   +----------------------------------+
   | Today's Workload                 |
   | +------------------------------+ |
   | | Orders to Pack: 12           | |
   | | Orders to Ship: 8            | |
   | | Receiving Expected: 3        | |
   | | Inventory Counts: 2 sections | |
   | +------------------------------+ |
   +----------------------------------+

2. Time-Sensitive Indicators:
   +----------------------------------+
   | Shipping Cutoffs                 |
   | +------------------------------+ |
   | | UPS Ground: 4:00 PM (2hrs)   | |
   | | FedEx Next Day: 2:00 PM (now)| |
   | | Local Delivery: 5:00 PM      | |
   | +------------------------------+ |
   +----------------------------------+

3. Barcode Scanner Integration:
   +----------------------------------+
   | Quick Scan                       |
   | +------------------------------+ |
   | | [Scan Barcode]               | |
   | |                              | |
   | | Last scanned: WGT-1234       | |
   | | Qty: 50 | Loc: A-12-3       | |
   | +------------------------------+ |
   +----------------------------------+
```

## Viewer Dashboard (Summary Only)

```
+========================================================================+
|  VIEWER DASHBOARD - READ-ONLY SUMMARY                                   |
+========================================================================+
|  Welcome, Viewer                                        [Viewer Role]  |
|  Business overview for December 2024                                    |
+========================================================================+
|                                                                         |
|  METRICS ROW (3 KPIs - Summary Only)                                    |
|  +----------------+ +----------------+ +----------------+               |
|  | Revenue        | | Orders         | | Pipeline       |               |
|  | $45,230        | | 47             | | $456,789       |               |
|  | +15.3%         | | +12%           | | +8.5%          |               |
|  +----------------+ +----------------+ +----------------+               |
|                                                                         |
|  SINGLE CHART - REVENUE TREND                                           |
|  +------------------------------------------------------------------+  |
|  |  REVENUE TREND (12 cols)                                          |  |
|  |  [Line Chart - Read Only]                                         |  |
|  |                                                                   |  |
|  |  Last 6 months revenue trend                                      |  |
|  |  No drill-down or interaction                                     |  |
|  |                                                                   |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  Note: Contact your administrator for detailed reports.                 |
+========================================================================+
```

### Viewer Widget Configuration

```
+--------------------------------------------------+
| VIEWER DEFAULT WIDGETS                            |
+--------------------------------------------------+
| KPIs (Summary only):                              |
| - kpi-revenue (x:0, y:0, w:4, h:2)               |
| - kpi-orders (x:4, y:0, w:4, h:2)                |
| - kpi-pipeline (x:8, y:0, w:4, h:2)              |
|                                                   |
| Charts (Single):                                  |
| - chart-revenue-trend (x:0, y:2, w:12, h:5)      |
|                                                   |
| Restrictions:                                     |
| - No drill-down links                            |
| - No customization controls                       |
| - Read-only mode                                  |
+--------------------------------------------------+
```

## Role Detection and Switching

```
+================================================================+
|  ROLE DETECTION FLOW                                            |
+================================================================+

1. User logs in
2. Session contains role information:
   { email: "user@company.com", role: "sales" }

3. getRoleDefaultLayout(role) returns widgets:
   switch(role) {
     case 'admin': return adminLayout;
     case 'sales': return salesLayout;
     case 'warehouse': return warehouseLayout;
     default: return viewerLayout;
   }

4. User can customize from role default
5. Customizations saved per-user
6. Reset button restores role default
```

## Role Badge Display

```
+----------------------------------+
| ROLE BADGE STYLES                |
+----------------------------------+

Admin:
+--------+
| Admin  |  <- Purple background
+--------+

Sales:
+--------+
| Sales  |  <- Blue background
+--------+

Warehouse:
+----------+
| Warehouse |  <- Orange background
+----------+

Viewer:
+--------+
| Viewer |  <- Gray background
+--------+
```

## Permission-Based Widget Visibility

```
+----------------------------------------------------------------+
| WIDGET VISIBILITY BY ROLE                                       |
+----------------------------------------------------------------+
| Widget                  | Admin | Sales | Warehouse | Viewer   |
|-------------------------|-------|-------|-----------|----------|
| Revenue KPI             |  Yes  |  Yes  |    No     |   Yes    |
| Orders KPI              |  Yes  |  Yes  |   Yes     |   Yes    |
| Pipeline KPI            |  Yes  |  Yes  |    No     |   Yes    |
| Warranties KPI          |  Yes  |   No  |    No     |    No    |
| Issues KPI              |  Yes  |   No  |   Yes     |    No    |
| Inventory KPI           |  Yes  |   No  |   Yes     |    No    |
|-------------------------|-------|-------|-----------|----------|
| Revenue Trend Chart     |  Yes  |  Yes  |    No     |   Yes    |
| Orders Status Chart     |  Yes  |  Yes  |   Yes     |    No    |
| Pipeline Funnel         |  Yes  |  Yes  |    No     |    No    |
| Top Customers           |  Yes  |  Yes  |    No     |    No    |
| Inventory Levels        |  Yes  |   No  |   Yes     |    No    |
|-------------------------|-------|-------|-----------|----------|
| Recent Orders Table     |  Yes  |   No  |   Yes     |    No    |
| Today's Shipments       |   No  |   No  |   Yes     |    No    |
| Stale Opportunities     |   No  |  Yes  |    No     |    No    |
| Low Stock Alerts        |  Yes  |   No  |   Yes     |    No    |
+----------------------------------------------------------------+
```

## Quick Actions by Role

```
+----------------------------------------------------------------+
| QUICK ACTIONS BY ROLE                                           |
+----------------------------------------------------------------+

Admin:
[+ New Order] [+ New Customer] [View Reports] [Settings]

Sales:
[+ New Opportunity] [Log Activity] [View Pipeline] [My Customers]

Warehouse:
[Scan Barcode] [Receive Shipment] [Inventory Count] [Print Labels]

Viewer:
[Request Report] [Contact Admin]
```

## Mobile Role Adaptations

```
+================================+
|  MOBILE ROLE VARIATIONS        |
+================================+

Sales Mobile:
- Pipeline value as hero metric
- Quick call/email customer actions
- Today's follow-ups list
- Deal close probability

Warehouse Mobile:
- Today's shipments as hero
- Barcode scanner button prominent
- Pick list view
- Location lookup

Viewer Mobile:
- Simple metrics only
- No action buttons
- Summary chart
- "Request Report" CTA
```

## Success Metrics

- Role detection happens on first render
- Default layout loads within 1 second
- Role-appropriate widgets appear first
- Users can customize within role constraints
- Quick actions match role workflows
- Mobile layouts optimized per role
