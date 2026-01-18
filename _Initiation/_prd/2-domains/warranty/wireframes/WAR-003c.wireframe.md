# Wireframe: DOM-WAR-003c - Warranty Expiry Alerts: Report Page

## Story Reference

- **Story ID**: DOM-WAR-003c
- **Name**: Warranty Expiry Alerts: Report Page
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: ReportLayout with FilterBar and DataTable

## Overview

Dedicated report page for expiring warranties at /reports/expiring-warranties. Features filter bar with expiry range, customer, and product filters. DataTable with color-coded days-until-expiry column. CSV export functionality.

## UI Patterns (Reference Implementation)

### DataTable Component
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Sortable columns for expiring warranties table
  - Row selection with checkboxes for bulk actions
  - Pagination controls for large warranty datasets

### Select Component
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Expiry range dropdown (7, 30, 60, 90 days options)
  - Customer and product filter selectors
  - Sort by dropdown for data ordering

### Badge Component
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Days-until-expiry badges with color coding (red/orange/yellow/green)
  - Active filter chips with remove functionality
  - Status indicators for warranty states

### Sheet Component
- **Pattern**: RE-UI Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Mobile filter drawer (bottom sheet)
  - Slide-in from bottom for touch-friendly filters
  - Backdrop overlay for focus

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | warranties | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-WAR-003c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/warranties.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Report View (Card List)

```
+=========================================+
| < Reports                          [*]  |
+-----------------------------------------+
|                                         |
|  Expiring Warranties                    |
|  Warranties expiring soon               |
|                                         |
+-----------------------------------------+
|  [Filters]                  [Export v]  |
|  ^Opens filter drawer                   |
+-----------------------------------------+
|  Active: 7 days | 12 results            |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | WAR-2026-00123                      ||
|  | Tesla Powerwall 2 - 13.5kWh         ||
|  | SolarTech Australia                 ||
|  | ---------------------------------   ||
|  | Expires: Jan 15, 2026               ||
|  | [3 days] <- RED badge               ||
|  | Status: [Active]                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | WAR-2026-00124                      ||
|  | Growatt Inverter - MIN 5000TL-XH    ||
|  | Melbourne Solar Co                  ||
|  | ---------------------------------   ||
|  | Expires: Jan 16, 2026               ||
|  | [4 days] <- RED badge               ||
|  | Status: [Active]                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | WAR-2026-00125                      ||
|  | LG Chem RESU10H - 9.8kWh            ||
|  | Sydney Energy Systems               ||
|  | ---------------------------------   ||
|  | Expires: Jan 18, 2026               ||
|  | [6 days] <- RED badge               ||
|  | Status: [Active]                    ||
|  +-------------------------------------+|
|                                         |
|  [Load More]                            |
|                                         |
+=========================================+
```

### Filter Drawer (Bottom Sheet)

```
+=========================================+
|                                         |
|  =====================================  |
|         <- drag handle                  |
|                                         |
|  Filters                          [X]   |
|  =====================================  |
|                                         |
|  Expiry Range                           |
|  +-------------------------------------+|
|  | ○ Next 7 days                       ||
|  | ● Next 30 days     <- Selected      ||
|  | ○ Next 60 days                      ||
|  | ○ Next 90 days                      ||
|  | ○ Custom range                      ||
|  +-------------------------------------+|
|                                         |
|  Customer                               |
|  +-------------------------------------+|
|  | Search customers...                 ||
|  +-------------------------------------+|
|                                         |
|  Product                                |
|  +-------------------------------------+|
|  | Search products...                  ||
|  +-------------------------------------+|
|                                         |
|  Status                                 |
|  +-------------------------------------+|
|  | [x] Active                          ||
|  | [ ] Expired                         ||
|  | [ ] All                             ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |     (Clear All)    [Apply Filters]  ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Report with Collapsible Filters

```
+=======================================================================+
| < Reports                                                              |
+------------------------------------------------------------------------+
|                                                                        |
|  Expiring Warranties                                      [Export v]   |
|  Warranties approaching expiration date                                |
|                                                                        |
+------------------------------------------------------------------------+
|  [-] Filters                                                           |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |  Expiry Range         Customer              Product              |  |
|  |  [Next 30 days v]     [All Customers v]     [All Products v]     |  |
|  |                                                                  |  |
|  |  Active Filters: [30 days x]                  [Clear All]        |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
+------------------------------------------------------------------------+
|                                                                        |
|  Showing 12 warranties | Total Value: $45,000                          |
|                                                                        |
+------------------------------------------------------------------------+
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | Warranty       | Product           | Customer   | Expires  | Days|  |
|  +----------------+-------------------+------------+----------+-----+  |
|  | WAR-00123      | Tesla Powerwall 2 | SolarTech  | Jan 15   | [3] |  |
|  |                | 13.5kWh           | Australia  |          | RED |  |
|  +----------------+-------------------+------------+----------+-----+  |
|  | WAR-00124      | Growatt Inverter  | Melbourne  | Jan 16   | [4] |  |
|  |                | MIN 5000TL-XH     | Solar Co   |          | RED |  |
|  +----------------+-------------------+------------+----------+-----+  |
|  | WAR-00125      | LG Chem RESU10H   | Sydney Eng | Jan 18   | [6] |  |
|  |                | 9.8kWh            | Systems    |          | RED |  |
|  +----------------+-------------------+------------+----------+-----+  |
|  | WAR-00126      | Fronius Primo     | Brisbane   | Jan 25   |[13] |  |
|  |                | 8.2kW Inverter    | Solar      |          | YEL |  |
|  +----------------+-------------------+------------+----------+-----+  |
|  | WAR-00127      | BYD Battery-Box   | Perth      | Feb 1    |[20] |  |
|  |                | HVS 10.2          | Energy     |          | GRN |  |
|  +----------------+-------------------+------------+----------+-----+  |
|                                                                        |
|  < 1 2 3 >                           Showing 1-10 of 12                |
|                                                                        |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Report Page

```
+================================================================================================+
| [Logo] Renoz CRM                                                         [Bell] [User v]       |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Reports  |  Expiring Warranties                                              [Export to CSV]   |
| -------  |  ===================================================================================  |
| Sales    |  Monitor warranties approaching expiration for renewal opportunities                 |
| Warranty<|                                                                                      |
| Pipeline |  +--------------------------------------------------------------------------------+  |
| Products |  | FILTERS                                                                        |  |
|          |  |                                                                                |  |
|          |  |  Expiry Range      Customer             Product            Status              |  |
|          |  |  [30 days v]       [Select customer v]  [Select product v] [Active v]          |  |
|          |  |                                                                                |  |
|          |  |  Custom Date Range:  [From: ___________]  [To: ___________]                   |  |
|          |  |                                                                                |  |
|          |  |  Active Filters: [Next 30 days x] [Active only x]              [Clear All]    |  |
|          |  |                                                                                |  |
|          |  +--------------------------------------------------------------------------------+  |
|          |                                                                                      |
|          |  +--- SUMMARY METRICS ----------------------------------------------------------+   |
|          |  |                                                                              |   |
|          |  |  Total Warranties: 12  |  Total Value: $45,000  |  Avg Days to Expiry: 18   |   |
|          |  |                                                                              |   |
|          |  +------------------------------------------------------------------------------+   |
|          |                                                                                      |
|          |  +--------------------------------------------------------------------------------+  |
|          |  |                                                                                |  |
|          |  |  [ ] | Warranty #     | Product              | Customer        | Expiry Date  |  |
|          |  |      |                |                      |                 | Days Left    |  |
|          |  |------+----------------+----------------------+-----------------+--------------|  |
|          |  |  [ ] | WAR-2026-00123 | Tesla Powerwall 2    | SolarTech       | Jan 15, 2026 |  |
|          |  |      |                | 13.5kWh Battery      | Australia       | [3 days]     |  |
|          |  |      |                |                      |                 | ============ |  |
|          |  |------+----------------+----------------------+-----------------+--------------+  |
|          |  |  [ ] | WAR-2026-00124 | Growatt Inverter     | Melbourne Solar | Jan 16, 2026 |  |
|          |  |      |                | MIN 5000TL-XH        | Co.             | [4 days]     |  |
|          |  |      |                |                      |                 | ============ |  |
|          |  |------+----------------+----------------------+-----------------+--------------+  |
|          |  |  [ ] | WAR-2026-00125 | LG Chem RESU10H      | Sydney Energy   | Jan 18, 2026 |  |
|          |  |      |                | 9.8kWh Battery       | Systems         | [6 days]     |  |
|          |  |      |                |                      |                 | ============ |  |
|          |  |------+----------------+----------------------+-----------------+--------------+  |
|          |  |  [ ] | WAR-2026-00126 | Fronius Primo        | Brisbane Solar  | Jan 25, 2026 |  |
|          |  |      |                | 8.2kW Inverter       | Solutions       | [13 days]    |  |
|          |  |      |                |                      |                 | ------------ |  |
|          |  |------+----------------+----------------------+-----------------+--------------+  |
|          |  |  [ ] | WAR-2026-00127 | BYD Battery-Box      | Perth Energy    | Feb 1, 2026  |  |
|          |  |      |                | HVS 10.2             | Group           | [20 days]    |  |
|          |  |      |                |                      |                 | ............ |  |
|          |  |------+----------------+----------------------+-----------------+--------------+  |
|          |  |                                                                                |  |
|          |  |  Selected: 0                                      < 1 [2] 3 >  1-10 of 12     |  |
|          |  |                                                                                |  |
|          |  +--------------------------------------------------------------------------------+  |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+

LEGEND (Days Left column):
============ = RED (1-7 days) - Critical/Urgent
------------ = YELLOW (8-21 days) - Warning
............ = GREEN (22-30 days) - Healthy
```

### Row Hover State

```
+----------------+----------------------+-----------------+--------------+
|  [ ] | WAR-00123 | Kitchen Inverter Set  | Acme Corp      | Jan 15, 2026 |
|      |           | Oak                  | John Smith     | [3 days]     |
|      |           |                      |                | ============ |
|------+-----------+----------------------+----------------+--------------|
        ^
        |
   +----+---------------------+
   | [View] [Contact] [Renew] | <- Row action buttons on hover
   +--------------------------+
```

---

## Days Left Column Visualization

```
+--- DAYS LEFT VISUAL INDICATOR -----------------------------------+
|                                                                  |
|  CRITICAL (1-7 days):                                            |
|  +------------------+                                            |
|  | [3 days]         |  Background: red-100                       |
|  | ================ |  Text: red-700                             |
|  +------------------+  Border-left: 4px solid red-500            |
|                        Row background: red-50/30                  |
|                                                                  |
|  WARNING (8-21 days):                                            |
|  +------------------+                                            |
|  | [15 days]        |  Background: yellow-100                    |
|  | ---------------- |  Text: yellow-700                          |
|  +------------------+  Border-left: 4px solid yellow-500         |
|                        Row background: normal                     |
|                                                                  |
|  HEALTHY (22-30 days):                                           |
|  +------------------+                                            |
|  | [28 days]        |  Background: green-100                     |
|  | ................ |  Text: green-700                           |
|  +------------------+  Border-left: 4px solid green-500          |
|                        Row background: normal                     |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
INITIAL PAGE LOAD:
+--------------------------------------------------------------------------------+
|  Expiring Warranties                                            [Export v]      |
+--------------------------------------------------------------------------------+
|  Filters: [Loading...]                                                          |
+--------------------------------------------------------------------------------+
|  [........] | [.......] | [.....] | [......] | [...]                           |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+          |
|  | [...................................] | [............] | [...] |          |
|  | [...................................] | [............] | [...] |          |
|  | [...................................] | [............] | [...] |          |
|  | [...................................] | [............] | [...] |          |
|  | [...................................] | [............] | [...] |          |
|  +------------------------------------------------------------------+          |
|  <- Skeleton rows with shimmer                                                  |
|                                                                                 |
+--------------------------------------------------------------------------------+

FILTER APPLYING:
+--------------------------------------------------------------------------------+
|  [spinner] Applying filters...                                                  |
|                                                                                 |
|  +------------------------------------------------------------------+          |
|  | Existing data dims (opacity: 0.5)                                |          |
|  +------------------------------------------------------------------+          |
+--------------------------------------------------------------------------------+

EXPORTING:
+--------------------------------------------+
|  [spinner] Generating CSV export...         |
|                                             |
|  Exporting 12 warranties                    |
|  [============............] 50%             |
+--------------------------------------------+
```

### Empty States

```
NO MATCHING WARRANTIES:
+--------------------------------------------------------------------------------+
|  Expiring Warranties                                            [Export v]      |
+--------------------------------------------------------------------------------+
|  Filters: [7 days] [Acme Corp x]                            [Clear All]         |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+          |
|  |                                                                  |          |
|  |                    +------------------+                          |          |
|  |                    |   [calendar]     |                          |          |
|  |                    |      icon        |                          |          |
|  |                    +------------------+                          |          |
|  |                                                                  |          |
|  |              No warranties match your filters                    |          |
|  |                                                                  |          |
|  |     No warranties are expiring for "Acme Corp" in the next       |          |
|  |     7 days. Try adjusting your filter criteria.                  |          |
|  |                                                                  |          |
|  |                    [Adjust Filters]                              |          |
|  |                                                                  |          |
|  +------------------------------------------------------------------+          |
|                                                                                 |
+--------------------------------------------------------------------------------+

NO WARRANTIES AT ALL:
+--------------------------------------------------------------------------------+
|  Expiring Warranties                                            [Export v]      |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+          |
|  |                                                                  |          |
|  |                    +------------------+                          |          |
|  |                    |   [check]        |                          |          |
|  |                    |      icon        |                          |          |
|  |                    +------------------+                          |          |
|  |                                                                  |          |
|  |          All warranties are healthy                              |          |
|  |                                                                  |          |
|  |     No warranties are expiring in the selected date range.       |          |
|  |     Great job managing your warranty portfolio!                  |          |
|  |                                                                  |          |
|  |               [View All Warranties]                              |          |
|  |                                                                  |          |
|  +------------------------------------------------------------------+          |
|                                                                                 |
+--------------------------------------------------------------------------------+
```

### Error States

```
FAILED TO LOAD REPORT:
+--------------------------------------------------------------------------------+
|  Expiring Warranties                                                            |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+          |
|  |                                                                  |          |
|  |  [!] Unable to load expiring warranties                          |          |
|  |                                                                  |          |
|  |  There was a problem fetching the report data.                   |          |
|  |  Please try again.                                               |          |
|  |                                                                  |          |
|  |                        [Retry]                                   |          |
|  |                                                                  |          |
|  +------------------------------------------------------------------+          |
|                                                                                 |
+--------------------------------------------------------------------------------+

EXPORT FAILED:
+--------------------------------------------+
|  [!] Export Failed                     [X] |
|                                            |
|  Could not generate the CSV file.          |
|  Please try again.                         |
|                                            |
|              [Retry Export]                |
+--------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Page Header**
   - Tab: Export button

2. **Filter Bar**
   - Tab through: Expiry range -> Customer -> Product -> Status -> Clear All
   - Each filter dropdown navigable with arrow keys

3. **Data Table**
   - Tab: First row checkbox
   - Arrow Up/Down: Navigate between rows
   - Enter: Open warranty detail
   - Space: Toggle row selection

4. **Pagination**
   - Tab: Previous -> Page numbers -> Next
   - Enter/Space: Navigate to page

### ARIA Requirements

```html
<!-- Report Container -->
<main
  role="main"
  aria-labelledby="report-title"
>
  <h1 id="report-title">Expiring Warranties Report</h1>
</main>

<!-- Filter Section -->
<section
  role="search"
  aria-label="Filter expiring warranties"
>
  <select
    aria-label="Filter by expiry range"
    aria-describedby="expiry-help"
  >
    <option>Next 7 days</option>
    <option>Next 30 days</option>
  </select>
  <span id="expiry-help" class="sr-only">
    Select the time range for warranty expiration
  </span>
</section>

<!-- Results Summary -->
<div
  role="status"
  aria-live="polite"
  aria-label="Showing 12 warranties, total value $45,000"
>
  Showing 12 warranties | Total Value: $45,000
</div>

<!-- Data Table -->
<table
  role="table"
  aria-label="Expiring warranties list"
  aria-describedby="table-description"
>
  <caption id="table-description" class="sr-only">
    List of warranties expiring within the selected date range,
    sorted by days until expiry ascending
  </caption>
  <thead>
    <tr role="row">
      <th role="columnheader" scope="col" aria-label="Select warranty">
        <input type="checkbox" aria-label="Select all warranties" />
      </th>
      <th role="columnheader" scope="col" aria-sort="none">Warranty #</th>
      <th role="columnheader" scope="col">Product</th>
      <th role="columnheader" scope="col">Customer</th>
      <th role="columnheader" scope="col" aria-sort="ascending">
        Expiry Date / Days Left
      </th>
    </tr>
  </thead>
  <tbody>
    <tr
      role="row"
      tabindex="0"
      aria-label="Warranty WAR-2026-00123, Kitchen Inverter Set, Acme Corp,
                  expires January 15, 3 days remaining, critical"
    >
      ...
    </tr>
  </tbody>
</table>

<!-- Days Left Badge -->
<span
  role="status"
  aria-label="3 days until expiry, critical urgency"
  class="badge badge-critical"
>
  3 days
</span>

<!-- Pagination -->
<nav
  role="navigation"
  aria-label="Pagination"
>
  <button aria-label="Go to previous page" disabled>Previous</button>
  <button aria-label="Page 1">1</button>
  <button aria-current="page" aria-label="Page 2, current">2</button>
  <button aria-label="Page 3">3</button>
  <button aria-label="Go to next page">Next</button>
</nav>
```

### Screen Reader Announcements

- Page loaded: "Expiring warranties report. Showing 12 warranties expiring in the next 30 days."
- Filter applied: "Filter applied. Now showing 5 warranties for Acme Corporation."
- Filter cleared: "Filters cleared. Showing all 12 expiring warranties."
- Sort changed: "Table sorted by expiry date, ascending."
- Export started: "Generating CSV export for 12 warranties."
- Export complete: "Export complete. CSV file ready for download."
- Row selected: "Warranty WAR-2026-00123 selected."
- Navigation: "Navigating to warranty WAR-2026-00123 detail page."

---

## Animation Choreography

### Filter Bar

```
FILTER DROPDOWN OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: translateY(-8px) opacity(0) -> translateY(0) opacity(1)
- Height: 0 -> auto

FILTER CHIP APPEAR:
- Duration: 150ms
- Easing: ease-out
- Transform: scale(0.8) -> scale(1)
- Background: flash highlight

FILTER CHIP REMOVE:
- Duration: 100ms
- Easing: ease-in
- Transform: scale(1) -> scale(0.8)
- Opacity: 1 -> 0
- Other chips shift left: 150ms
```

### Table Rows

```
INITIAL LOAD:
- Duration: 300ms (staggered)
- Each row: 30ms delay from previous
- Transform: opacity(0) translateY(8px) -> opacity(1) translateY(0)

FILTER RESULT UPDATE:
- Duration: 200ms
- Exiting rows: opacity 1 -> 0, height collapse
- Entering rows: opacity 0 -> 1, height expand
- Remaining rows: shift position smoothly

ROW HOVER (Desktop):
- Duration: 150ms
- Background: transparent -> gray-50
- Action buttons: opacity 0 -> 1, translateY(4px) -> translateY(0)

ROW SELECTION:
- Duration: 100ms
- Checkbox: scale bounce
- Row background: subtle highlight flash
```

### Export Progress

```
PROGRESS BAR:
- Duration: variable (based on actual progress)
- Easing: linear
- Width: 0% -> 100%
- Color: blue-500

COMPLETE:
- Duration: 300ms
- Progress bar: flash green
- Download icon: bounce animation
- Auto-dismiss toast: after 3s
```

---

## Component Props Interface

```typescript
// Report Page Props
interface ExpiringWarrantiesReportProps {
  initialFilters?: ExpiryReportFilters;
}

// Filter Types
interface ExpiryReportFilters {
  expiryRange: ExpiryRangeOption;
  customDateFrom?: Date;
  customDateTo?: Date;
  customerId?: string;
  productId?: string;
  status: 'active' | 'expired' | 'all';
  sortBy: 'expiry_asc' | 'expiry_desc' | 'customer' | 'product';
  page: number;
  limit: number;
}

type ExpiryRangeOption = '7' | '30' | '60' | '90' | 'custom';

// Data Types
interface ExpiringWarrantyRow {
  id: string;
  warrantyNumber: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerContactName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  urgencyLevel: 'critical' | 'warning' | 'healthy';
  status: 'active' | 'expired';
  registrationDate: Date;
  value: number;
}

interface ExpiringWarrantiesReportData {
  warranties: ExpiringWarrantyRow[];
  totalCount: number;
  totalValue: number;
  avgDaysToExpiry: number;
  pagination: PaginationInfo;
}

// Filter Bar Component
interface ExpiryReportFilterBarProps {
  filters: ExpiryReportFilters;
  onFiltersChange: (filters: ExpiryReportFilters) => void;
  customers: { id: string; name: string }[];
  products: { id: string; name: string }[];
  isLoading: boolean;
}

// Data Table Component
interface ExpiryReportTableProps {
  data: ExpiringWarrantyRow[];
  isLoading: boolean;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onRowClick: (warranty: ExpiringWarrantyRow) => void;
}

// Days Badge Component
interface DaysUntilExpiryBadgeProps {
  days: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Export Button Component
interface ExportButtonProps {
  filters: ExpiryReportFilters;
  totalCount: number;
  onExportStart: () => void;
  onExportComplete: (url: string) => void;
  onExportError: (error: Error) => void;
}

// Hook for Report Data
interface UseExpiringWarrantiesReportOptions {
  filters: ExpiryReportFilters;
}

interface UseExpiringWarrantiesReportReturn {
  data: ExpiringWarrantiesReportData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

---

## URL State Persistence

```typescript
// URL Parameters Map
interface ExpiryReportUrlParams {
  range?: ExpiryRangeOption;   // ?range=30
  from?: string;               // ?from=2026-01-10 (ISO date)
  to?: string;                 // ?to=2026-02-10
  customer?: string;           // ?customer=cust_123
  product?: string;            // ?product=prod_456
  status?: string;             // ?status=active
  sort?: string;               // ?sort=expiry_asc
  page?: string;               // ?page=2
}

// Example URLs:
// /reports/expiring-warranties?range=30&status=active
// /reports/expiring-warranties?range=custom&from=2026-01-10&to=2026-02-10
// /reports/expiring-warranties?customer=cust_123&sort=expiry_asc&page=2
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/reports/expiring-warranties.tsx` | Report page route |
| `src/components/domain/reports/expiry-report-filter-bar.tsx` | Filter bar component |
| `src/components/domain/reports/expiry-report-table.tsx` | Data table component |
| `src/components/domain/reports/expiry-report-summary.tsx` | Summary metrics card |
| `src/components/domain/support/days-until-expiry-badge.tsx` | Days badge component |
| `src/components/domain/reports/export-csv-button.tsx` | Export functionality |
| `src/hooks/use-expiring-warranties-report.ts` | Data fetching hook |
| `src/hooks/use-report-url-state.ts` | URL state management |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-003c
