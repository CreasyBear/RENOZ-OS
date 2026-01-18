# Financial Domain Wireframe: AR Aging Report UI (DOM-FIN-003b)

**Story ID:** DOM-FIN-003b
**Component Type:** ReportPage with DataTable and Chart widget
**Aesthetic:** Professional Financial - data-dense, analytical focus
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Aging Summary Cards
- **Pattern**: RE-UI Card with Progress Bars
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `progress.tsx`
- **Features**:
  - KPI-style cards for each aging bucket (Current, 1-30, 31-60, 61-90, 90+)
  - Horizontal progress bars showing percentage of total AR
  - Alert badges for overdue buckets (warning/critical states)
  - Click-through to filtered customer list

### Aging Stacked Bar Chart
- **Pattern**: RE-UI Chart (Recharts)
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Horizontal stacked bar showing aging distribution
  - Color-coded segments (green=current, yellow=30d, orange=60d, red=90+)
  - Hover tooltips with exact amounts and percentages
  - Segment click to filter customer table

### Customer Aging Table
- **Pattern**: RE-UI DataTable with Sortable Columns
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Multi-column sorting (customer name, total due, aging buckets)
  - Row expansion for invoice-level detail
  - Search/filter by customer name or aging bucket
  - Risk level indicators (icon column for high-risk accounts)

### Customer Aging Detail Modal
- **Pattern**: RE-UI Dialog with Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `tabs.tsx`
- **Features**:
  - Invoice list grouped by aging bucket
  - Quick action buttons (email, call, send statement)
  - Payment history timeline
  - Contact info and account summary

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Computed from `orders` - needs AR aging calculation logic | NOT CREATED |
| **Server Functions Required** | `calculateAgingBuckets`, `getCustomerAging`, `getAgingReport` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-003a | PENDING |

### Existing Schema Available
- `orders` with `invoiceStatus`, `xeroInvoiceId` in `renoz-v2/lib/schema/orders.ts`
- `customers` in `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## Design Principles for Financial Reports

- **Data Density:** Maximum information visible without sacrificing readability
- **Drill-Down:** Every aggregate should be explorable to its source
- **Export Ready:** Print-friendly layouts, clean exports
- **Visual Hierarchy:** Totals prominent, details scannable
- **Actionable:** Direct links to take action on overdue accounts

---

## Mobile Wireframe (375px)

### AR Aging Report - Summary View

```
+=========================================+
| < Reports                          [$]  |
| Accounts Receivable Aging               |
+-----------------------------------------+
| As of: Jan 10, 2026          [Refresh]  |
+-----------------------------------------+
|                                         |
|  TOTAL RECEIVABLES                      |
|  +-------------------------------------+|
|  |                                     ||
|  |        $125,450.00                  ||
|  |                                     ||
|  |    45 customers with balances       ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  AGING BUCKETS                          |
|                                         |
|  +-------------------------------------+|
|  | CURRENT (0 days)                    ||
|  | ################################### ||
|  |           $65,200.00       (52%)    ||
|  |           28 invoices               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 1-30 DAYS                           ||
|  | ####################                ||
|  |           $32,150.00       (26%)    ||
|  |           12 invoices               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 31-60 DAYS                          ||
|  | ########                            ||
|  |           $15,600.00       (12%)    ||
|  |           8 invoices                ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 61-90 DAYS                    [!]   ||
|  | ####                                ||
|  |            $7,500.00        (6%)    ||
|  |            4 invoices               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 90+ DAYS                     [!!!]  ||
|  | ##                                  ||
|  |            $5,000.00        (4%)    ||
|  |            3 invoices               ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|   [View Customer Breakdown]             |
|                                         |
|   [ Export CSV ]  [ Export PDF ]        |
|                                         |
+=========================================+
```

### Customer Breakdown List (Mobile)

```
+=========================================+
| < AR Aging                         [$]  |
| Customer Breakdown                      |
+-----------------------------------------+
| [All Customers v]      [Sort: Balance v]|
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | Acme Corporation                [>] ||
|  | ---------------------------------   ||
|  | Total Due: $15,500.00               ||
|  |                                     ||
|  | Current     $5,000   ####           ||
|  | 1-30 days   $4,500   ###            ||
|  | 31-60 days  $3,500   ##             ||
|  | 61-90 days  $2,500   #              ||
|  | 90+ days    $0       -              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Beta Industries                [>]  ||
|  | ---------------------------------   ||
|  | Total Due: $12,300.00               ||
|  |                                     ||
|  | Current     $8,000   ######         ||
|  | 1-30 days   $2,300   ##             ||
|  | 31-60 days  $2,000   #              ||
|  | 61-90 days  $0       -              ||
|  | 90+ days    $0       -              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Gamma LLC                      [>]  ||
|  | ---------------------------------   ||
|  | Total Due: $8,750.00        [!!!]   ||
|  |                                     ||
|  | Current     $0       -              ||
|  | 1-30 days   $1,250   #              ||
|  | 31-60 days  $2,500   ##             ||
|  | 61-90 days  $2,000   ##             ||
|  | 90+ days    $3,000   ###     [!]    ||
|  +-------------------------------------+|
|                                         |
|  ...more customers...                   |
|                                         |
+-----------------------------------------+
```

### Customer Drill-Down (Mobile)

```
+=========================================+
| < Customer Breakdown                    |
| Acme Corporation                        |
+-----------------------------------------+
|                                         |
|  TOTAL OUTSTANDING                      |
|  +-------------------------------------+|
|  |        $15,500.00                   ||
|  |        5 invoices                   ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  INVOICES BY AGE                        |
|                                         |
|  -- CURRENT (0 days) --                 |
|  +-------------------------------------+|
|  | INV-2026-0095          $2,500.00 [>]||
|  | Due: Jan 15, 2026                   ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | INV-2026-0089          $2,500.00 [>]||
|  | Due: Jan 12, 2026                   ||
|  +-------------------------------------+|
|                                         |
|  -- 1-30 DAYS --                        |
|  +-------------------------------------+|
|  | INV-2025-0445          $4,500.00 [>]||
|  | Due: Dec 28, 2025      13 days late ||
|  +-------------------------------------+|
|                                         |
|  -- 31-60 DAYS --                       |
|  +-------------------------------------+|
|  | INV-2025-0398          $3,500.00 [>]||
|  | Due: Dec 5, 2025       36 days late ||
|  +-------------------------------------+|
|                                         |
|  -- 61-90 DAYS --                       |
|  +-------------------------------------+|
|  | INV-2025-0312          $2,500.00 [>]||
|  | Due: Nov 15, 2025      56 days late ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|  [Contact Customer]  [Send Statement]   |
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
| < Reports                          [$]  |
| Accounts Receivable Aging               |
+-----------------------------------------+
| As of: ..............        [Refresh]  |
+-----------------------------------------+
|                                         |
|  TOTAL RECEIVABLES                      |
|  +-------------------------------------+|
|  |                                     ||
|  |        ...............              ||
|  |                                     ||
|  |    ......................           ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  AGING BUCKETS                          |
|                                         |
|  +-------------------------------------+|
|  | .............                       ||
|  | .............................       ||
|  |           ............              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | .............                       ||
|  | .........................           ||
|  |           ............              ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
| < Reports                          [$]  |
| Accounts Receivable Aging               |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |   [check]   |              |
|            |   invoice   |              |
|            +-------------+              |
|                                         |
|    ALL CAUGHT UP!                       |
|                                         |
|   Great news! You have no              |
|   outstanding receivables.              |
|                                         |
|   All invoices have been paid.          |
|                                         |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### AR Aging Report with Chart

```
+=============================================================================+
| < Reports | Accounts Receivable Aging                    As of: Jan 10, 2026|
+-----------------------------------------------------------------------------+
| [Refresh Data]    [Export CSV]    [Export PDF]    [Print]                   |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- AGING SUMMARY CHART ------------+  +-- TOTALS ---------------------+  |
|  |                                   |  |                               |  |
|  |  $65.2K  $32.2K  $15.6K  $7.5K  $5K |  | Total AR: $125,450.00       |  |
|  |    |       |       |      |     |  |  | Customers: 45               |  |
|  |   ####    ###     ##      #     #  |  | Invoices: 55                |  |
|  |   ####    ###     ##      #     #  |  |                             |  |
|  |   ####    ###     ##      #     #  |  | Overdue: $28,100.00 (22%)   |  |
|  |   ####    ###     ##      #     #  |  | At Risk: $12,500.00 (10%)   |  |
|  |   ####    ###     ##                |  |                             |  |
|  |  ─────────────────────────────      |  +-----------------------------+  |
|  |  Current 1-30  31-60 61-90  90+     |                                   |
|  |                                     |                                   |
|  +-------------------------------------+                                   |
|                                                                             |
|  +-- CUSTOMER BREAKDOWN TABLE ----------------------------------------------+
|  |                                                                          |
|  | Customer          | Total Due  | Current  | 1-30    | 31-60  | 61-90 | 90+ |
|  +-------------------+------------+----------+---------+--------+-------+-----+
|  | Acme Corporation  | $15,500.00 | $5,000   | $4,500  | $3,500 | $2,500|  -  |
|  | Beta Industries   | $12,300.00 | $8,000   | $2,300  | $2,000 |   -   |  -  |
|  | Gamma LLC    [!]  |  $8,750.00 |    -     | $1,250  | $2,500 | $2,000|$3K  |
|  | Delta Inc         |  $7,200.00 | $4,200   | $3,000  |    -   |   -   |  -  |
|  | Epsilon Co        |  $6,500.00 | $3,500   | $1,500  | $1,500 |   -   |  -  |
|  | ...               |    ...     |   ...    |  ...    |  ...   |  ...  | ... |
|  +------------------------------------------------------------------------------+
|  |                                                                          |
|  | < 1 2 3 ... 5 >                              Showing 1-10 of 45 customers |
|  +--------------------------------------------------------------------------+
|                                                                             |
+=============================================================================+
```

### Customer Detail Modal

```
+===============================================================+
|                                                               |
|   +-------------------------------------------------------+   |
|   | Acme Corporation - Aging Detail                  [X]  |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |  Total Outstanding: $15,500.00                        |   |
|   |  Last Payment: Jan 5, 2026 ($2,500.00)                |   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  | Invoice #      | Amount    | Due Date   | Age     ||   |
|   |  +----------------+-----------+------------+---------+|   |
|   |  | INV-2026-0095  | $2,500.00 | Jan 15     | Current ||   |
|   |  | INV-2026-0089  | $2,500.00 | Jan 12     | Current ||   |
|   |  | INV-2025-0445  | $4,500.00 | Dec 28     | 13 days ||   |
|   |  | INV-2025-0398  | $3,500.00 | Dec 5      | 36 days ||   |
|   |  | INV-2025-0312  | $2,500.00 | Nov 15     | 56 days ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  | [Email]  [Call]  [Statement]  [View Customer]     ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|                                                               |
+===============================================================+
```

---

## Desktop Wireframe (1280px+)

### Full AR Aging Report Page

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Accounts Receivable Aging Report                                                      |
| Customers   |  Track outstanding invoices and manage collections                                     |
| Orders      |  ----------------------------------------------------------------------------------------
| Products    |                                                                                        |
| Jobs        |  Report Date: Jan 10, 2026            [Refresh]  [Export v]  [Print]                   |
| Pipeline    |                                                                                        |
| Financial < |  ========================================================================================
|  > Invoices |                                                                                        |
|  > Payments |  +-- AGING SUMMARY ----------------------------------------------------------------+   |
|  > Credits  |  |                                                                                 |   |
|  > Aging  < |  |  +-------------+  +-------------+  +-------------+  +-------------+  +--------+|   |
|  > Reports  |  |  | CURRENT     |  | 1-30 DAYS   |  | 31-60 DAYS  |  | 61-90 DAYS  |  | 90+    ||   |
| Settings    |  |  | $65,200.00  |  | $32,150.00  |  | $15,600.00  |  | $7,500.00   |  | $5,000 ||   |
|             |  |  | 28 invoices |  | 12 invoices |  | 8 invoices  |  | 4 invoices  |  | 3 inv  ||   |
|             |  |  | 52%         |  | 26%         |  | 12%         |  | 6%    [!]   |  | 4% [!] ||   |
|             |  |  +-------------+  +-------------+  +-------------+  +-------------+  +--------+|   |
|             |  |                                                                                 |   |
|             |  |  TOTAL: $125,450.00 | 55 invoices | 45 customers                                |   |
|             |  |                                                                                 |   |
|             |  +----------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- STACKED BAR VISUALIZATION -----------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  [████████████████████████████|██████████████|███████|████|███]                 |  |
|             |  |   Current (52%)              1-30 (26%)    31-60   61-90  90+                   |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- CUSTOMER BREAKDOWN BY AGING ---------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  [Search customer...          ]  [Filter: All v]  [Sort: Total Due v]           |  |
|             |  |  -------------------------------------------------------------------------------  |  |
|             |  |                                                                                  |  |
|             |  |  +------------------------------------------------------------------------------+|  |
|             |  |  |    | Customer          | Total      | Current  | 1-30     | 31-60  | 61-90 | 90+ | Actions |
|             |  |  +----+------------------+------------+----------+----------+--------+-------+-----+---------+
|             |  |  |    | Acme Corporation | $15,500.00 | $5,000   | $4,500   | $3,500 | $2,500|  -  | [...]   |
|             |  |  |    | Beta Industries  | $12,300.00 | $8,000   | $2,300   | $2,000 |   -   |  -  | [...]   |
|             |  |  | [!]| Gamma LLC        |  $8,750.00 |    -     | $1,250   | $2,500 | $2,000|$3K  | [...]   |
|             |  |  |    | Delta Inc        |  $7,200.00 | $4,200   | $3,000   |    -   |   -   |  -  | [...]   |
|             |  |  |    | Epsilon Co       |  $6,500.00 | $3,500   | $1,500   | $1,500 |   -   |  -  | [...]   |
|             |  |  |    | Zeta Corp        |  $5,800.00 | $2,800   | $1,500   | $1,500 |   -   |  -  | [...]   |
|             |  |  |    | Eta Partners     |  $5,200.00 | $5,200   |    -     |    -   |   -   |  -  | [...]   |
|             |  |  +----+------------------+------------+----------+----------+--------+-------+-----+---------+
|             |  |                                                                                  |  |
|             |  |  Showing 1-25 of 45 customers                              < 1 [2] >             |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Dashboard Widget (Compact)

```
+======================================================================================================+
|                                                                                                      |
|  +-- AR AGING SNAPSHOT (Dashboard Widget) --------------------------------------------------+        |
|  |                                                                                          |        |
|  |  ACCOUNTS RECEIVABLE                                         [View Full Report]          |        |
|  |  ========================================================================================|        |
|  |                                                                                          |        |
|  |  +--------+  +--------+  +--------+  +--------+  +--------+                              |        |
|  |  |$65.2K  |  |$32.2K  |  |$15.6K  |  | $7.5K  |  | $5.0K  |     Total: $125,450          |        |
|  |  |Current |  |1-30    |  |31-60   |  |61-90 ! |  |90+ !!  |     Overdue: $28,100         |        |
|  |  +--------+  +--------+  +--------+  +--------+  +--------+                              |        |
|  |                                                                                          |        |
|  |  [████████████████████████████|██████████████|███████|████|███]                          |        |
|  |                                                                                          |        |
|  +-----------------------------------------------------------------------------------------+         |
|                                                                                                      |
+======================================================================================================+
```

### Export Options Dropdown

```
+-- EXPORT MENU ------------------------------+
|                                            |
|  +----------------------------------------+|
|  | EXPORT OPTIONS                         ||
|  +----------------------------------------+|
|  |                                        ||
|  | [csv] Export to CSV                    ||
|  |       All data, comma-separated        ||
|  |                                        ||
|  | [xls] Export to Excel                  ||
|  |       Formatted with formulas          ||
|  |                                        ||
|  | [pdf] Export to PDF                    ||
|  |       Printable report format          ||
|  |                                        ||
|  | --------------------------------       ||
|  |                                        ||
|  | [mail] Email Report                    ||
|  |        Send to recipients              ||
|  |                                        ||
|  | [schedule] Schedule Report             ||
|  |            Weekly/monthly delivery     ||
|  |                                        ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+
```

---

## Interaction States

### Loading States

```
+-- INITIAL LOAD -----------------------------+
|                                            |
|  +----------------------------------------+|
|  | Calculating aging buckets...           ||
|  | [=====>                    ] 25%       ||
|  +----------------------------------------+|
|                                            |
|  Loading 45 customers...                   |
|                                            |
+--------------------------------------------+

+-- TABLE SKELETON ---------------------------+
|                                            |
|  | Customer    | Total  | Current | ...    |
|  +-------------+--------+---------+--------|
|  | [.........] | [....] | [.....] | [...] ||
|  | [.........] | [....] | [.....] | [...] ||
|  | [.........] | [....] | [.....] | [...] ||
|  | [.........] | [....] | [.....] | [...] ||
|                                            |
|  Shimmer animation left to right           |
|                                            |
+--------------------------------------------+

+-- REFRESH LOADING --------------------------+
|                                            |
|  [Refresh] -> [[spin] Refreshing...]       |
|                                            |
|  Overlay on data with slight opacity       |
|  Data remains visible but dimmed           |
|                                            |
+--------------------------------------------+
```

### Empty States

```
+-- NO RECEIVABLES ---------------------------+
|                                            |
|         +-------------+                    |
|         |   [check]   |                    |
|         |   all paid  |                    |
|         +-------------+                    |
|                                            |
|       ALL CAUGHT UP!                       |
|                                            |
|  Great news! All your invoices            |
|  have been paid. No outstanding            |
|  receivables to report.                    |
|                                            |
|  [View Invoice History]                    |
|                                            |
+--------------------------------------------+

+-- NO RESULTS (filtered) --------------------+
|                                            |
|  No customers match your filter criteria.  |
|                                            |
|  Try adjusting your filters or             |
|  [Clear All Filters]                       |
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- LOAD ERROR -------------------------------+
|                                            |
|         [!] Error Icon                     |
|                                            |
|  Failed to load aging report               |
|                                            |
|  We couldn't calculate the aging           |
|  data. This might be a temporary           |
|  issue.                                    |
|                                            |
|         [Retry]                            |
|                                            |
+--------------------------------------------+

+-- EXPORT ERROR -----------------------------+
|                                            |
|  [!] Export failed                         |
|                                            |
|  Unable to generate the CSV file.          |
|  Please try again.                         |
|                                            |
|       [Retry Export]                       |
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- EXPORT SUCCESS ---------------------------+
|                                            |
|  [check] Report exported                   |
|                                            |
|  AR-Aging-2026-01-10.csv downloaded        |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- EMAIL SENT -------------------------------+
|                                            |
|  [check] Report emailed                    |
|                                            |
|  Sent to: finance@company.com              |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Report Page**
   - Tab: Refresh -> Export -> Print -> Search -> Filter -> Sort -> Table rows
   - Enter on row: Expand customer detail
   - Escape: Close any open modals

2. **Customer Table**
   - Tab: Navigate between rows
   - Enter: Open customer drill-down
   - Arrow Up/Down: Navigate within table
   - Space: Select row (for batch actions)

3. **Chart Interaction**
   - Tab: Navigate between chart segments
   - Enter: Drill into segment
   - Screen reader: Announces bucket values

### ARIA Requirements

```html
<!-- Report Page -->
<main role="main" aria-label="Accounts Receivable Aging Report">
  <header>
    <h1>Accounts Receivable Aging Report</h1>
    <time datetime="2026-01-10">As of January 10, 2026</time>
  </header>

  <!-- Summary Cards -->
  <section aria-label="Aging summary">
    <div role="group" aria-label="Aging buckets">
      <article aria-label="Current: $65,200, 28 invoices, 52 percent">
        <!-- Card content -->
      </article>
      <article aria-label="1 to 30 days: $32,150, 12 invoices, 26 percent">
        <!-- Card content -->
      </article>
      <!-- More buckets -->
    </div>
  </section>

  <!-- Stacked Bar Chart -->
  <figure role="img" aria-label="Aging distribution chart">
    <figcaption>Visual representation of receivables by age</figcaption>
    <div role="presentation">
      <!-- Chart visualization -->
    </div>
  </figure>

  <!-- Data Table -->
  <section aria-label="Customer breakdown">
    <table aria-label="Customers by aging bucket">
      <thead>
        <tr>
          <th scope="col">Customer</th>
          <th scope="col" aria-sort="descending">Total Due</th>
          <th scope="col">Current</th>
          <!-- More columns -->
        </tr>
      </thead>
      <tbody>
        <tr aria-label="Acme Corporation, total due $15,500">
          <td>Acme Corporation</td>
          <td>$15,500.00</td>
          <!-- More cells -->
        </tr>
      </tbody>
    </table>
  </section>
</main>

<!-- Row Action Menu -->
<button
  aria-expanded="false"
  aria-haspopup="menu"
  aria-label="Actions for Acme Corporation"
>
  Actions
</button>
<menu role="menu" aria-label="Customer actions">
  <li role="menuitem">View customer</li>
  <li role="menuitem">Send statement</li>
  <li role="menuitem">Send reminder</li>
</menu>

<!-- Warning Indicator -->
<span
  role="status"
  aria-label="Warning: High risk, 90 plus days overdue"
>
  [!]
</span>
```

### Screen Reader Announcements

- Page load: "Accounts Receivable Aging Report loaded. Total receivables: $125,450. 45 customers with balances."
- Bucket focus: "Current bucket: $65,200, 28 invoices, 52% of total receivables"
- Customer select: "Acme Corporation selected. Total due: $15,500. 5 invoices across 5 aging buckets."
- Export complete: "CSV export complete. File downloaded."
- Refresh: "Report data refreshed. Last updated: January 10, 2026, 2:30 PM."

---

## Animation Choreography

### Page Load Sequence

```
INITIAL LOAD:
1. Header + controls appear (200ms)
2. Summary cards stagger in (50ms each, 5 cards = 250ms)
3. Chart bars animate from 0 to full height (400ms)
4. Table rows fade in with stagger (30ms each, max 10 = 300ms)
Total sequence: ~1200ms
```

### Summary Card Hover

```
HOVER STATE:
- Duration: 150ms
- Transform: translateY(-2px)
- Box-shadow: elevation increase
- Cursor: pointer (if clickable)
```

### Chart Bar Animation

```
BAR ENTER:
- Duration: 400ms per bar
- Stagger: 50ms between bars
- Easing: cubic-bezier(0.25, 0.46, 0.45, 0.94)
- Transform: scaleY(0) -> scaleY(1)
- Transform origin: bottom

BAR HOVER:
- Duration: 150ms
- Opacity: 1 -> 0.8
- Tooltip fade in: 100ms
```

### Table Row Interaction

```
ROW HOVER:
- Duration: 100ms
- Background: transparent -> gray-50

ROW SELECT:
- Duration: 200ms
- Background: gray-50 -> blue-50
- Border-left: 3px solid blue-500

EXPAND/COLLAPSE:
- Duration: 250ms
- Height: 0 -> auto (using max-height trick)
- Opacity: 0 -> 1
```

### Refresh Animation

```
BUTTON CLICK:
- Duration: 150ms
- Scale: 1 -> 0.95 -> 1

DATA REFRESH:
- Duration: 300ms
- Existing data: opacity 1 -> 0.5
- New data crossfade: 200ms
- Completion: opacity 0.5 -> 1
```

---

## Component Props Interfaces

```typescript
// Aging Report Types
interface AgingBucket {
  name: string;
  label: string; // "Current", "1-30 Days", etc.
  minDays: number;
  maxDays: number | null; // null for 90+
  amount: number;
  invoiceCount: number;
  percentage: number;
  isOverdue: boolean;
}

interface CustomerAging {
  customerId: string;
  customerName: string;
  totalDue: number;
  buckets: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
  invoices: AgingInvoice[];
  lastPaymentDate?: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

interface AgingInvoice {
  id: string;
  number: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  bucket: string;
}

interface AgingReportData {
  asOfDate: Date;
  totalReceivables: number;
  totalCustomers: number;
  totalInvoices: number;
  buckets: AgingBucket[];
  customers: CustomerAging[];
}

// Main Report Page
interface ARAgingReportPageProps {
  initialData?: AgingReportData;
  onExport?: (format: ExportFormat) => void;
}

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

// Aging Summary Cards
interface AgingSummaryCardsProps {
  buckets: AgingBucket[];
  totalReceivables: number;
  onBucketClick?: (bucket: AgingBucket) => void;
}

// Aging Summary Card
interface AgingSummaryCardProps {
  bucket: AgingBucket;
  isSelected?: boolean;
  onClick?: () => void;
}

// Stacked Bar Chart
interface AgingStackedBarProps {
  buckets: AgingBucket[];
  height?: number;
  showLabels?: boolean;
  onSegmentClick?: (bucket: AgingBucket) => void;
}

// Customer Breakdown Table
interface CustomerAgingTableProps {
  customers: CustomerAging[];
  selectedBucket?: string; // Filter by bucket
  onCustomerSelect?: (customer: CustomerAging) => void;
  onAction?: (action: CustomerAction, customer: CustomerAging) => void;
}

type CustomerAction = 'view' | 'statement' | 'reminder' | 'call' | 'email';

// Customer Detail Modal
interface CustomerAgingDetailProps {
  customer: CustomerAging;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceClick?: (invoice: AgingInvoice) => void;
  onAction?: (action: CustomerAction) => void;
}

// Dashboard Widget
interface AgingDashboardWidgetProps {
  data?: AgingReportData;
  onViewFullReport?: () => void;
  compact?: boolean;
}

// Export Menu
interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  onEmail?: () => void;
  onSchedule?: () => void;
  isExporting?: boolean;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Report page | ARAgingReportPage | - |
| Summary cards | AgingSummaryCards | Card |
| Summary card | AgingSummaryCard | Card |
| Stacked bar | AgingStackedBar | - (custom chart) |
| Customer table | CustomerAgingTable | Table |
| Customer row | CustomerAgingRow | TableRow |
| Detail modal | CustomerAgingDetail | Dialog |
| Export menu | ExportMenu | DropdownMenu |
| Dashboard widget | AgingDashboardWidget | Card |
| Loading skeleton | AgingReportSkeleton | Skeleton |
| Empty state | EmptyState | - |

---

## Files to Create/Modify

### Create
- `src/routes/_authed/financial/reports/aging.tsx`
- `src/components/domain/financial/reports/ar-aging-report-page.tsx`
- `src/components/domain/financial/reports/aging-summary-cards.tsx`
- `src/components/domain/financial/reports/aging-stacked-bar.tsx`
- `src/components/domain/financial/reports/customer-aging-table.tsx`
- `src/components/domain/financial/reports/customer-aging-detail.tsx`
- `src/components/domain/financial/reports/export-menu.tsx`
- `src/components/domain/financial/widgets/aging-dashboard-widget.tsx`
- `src/components/domain/financial/reports/aging-report-skeleton.tsx`

### Modify
- `src/routes/_authed/financial/index.tsx` (add widget to dashboard)
- `src/routes/_authed/index.tsx` (add widget to main dashboard)
