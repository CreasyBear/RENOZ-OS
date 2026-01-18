# Financial Domain Wireframe: Revenue Reports UI (DOM-FIN-008c)

**Story ID:** DOM-FIN-008c
**Component Type:** ReportPage with PeriodSelector and DataTable
**Aesthetic:** Professional Financial - analytical, accounting-focused
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Recognition Summary Cards
- **Pattern**: RE-UI Card with Stats Grid
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Recognized vs Deferred revenue display
  - Recognition rate percentage with visual indicator
  - Period-over-period change badges
  - YTD total with trend comparison

### Recognition Type Breakdown Chart
- **Pattern**: RE-UI Chart (Recharts Pie/Bar)
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Pie chart showing recognition type distribution
  - Segments for On Delivery, Milestone, Time-Based
  - Percentage labels and amount tooltips
  - Legend with click-to-filter functionality

### Recognition Schedule Table
- **Pattern**: RE-UI DataTable with Filters
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Multi-column table (date, invoice, customer, type, amount)
  - Type filter dropdown (all, delivery, milestone, time-based)
  - Customer search and filter
  - Sortable columns with pagination

### Roll-Forward Statement
- **Pattern**: RE-UI Table with Summary Row
- **Reference**: `_reference/.reui-reference/registry/default/ui/table.tsx`
- **Features**:
  - Opening balance → Additions → Recognized → Closing balance flow
  - Visual separators between sections
  - Highlighted totals row
  - Period label with date range

### Future Schedule Table
- **Pattern**: RE-UI DataTable with Projections
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Month-by-month recognition forecast
  - Projected vs actual indicators
  - Percentage of total column
  - Expandable rows for invoice-level detail

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `revenueRecognition` | NOT CREATED |
| **Server Functions Required** | `getRecognitionReport`, `getDeferredRevenue`, `recordRecognition` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-008a, DOM-FIN-008b | PENDING |

### Existing Schema Available
- `orders` with `invoiceStatus`, `xeroInvoiceId` in `renoz-v2/lib/schema/orders.ts`
- `customers` in `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## Design Principles for Revenue Reports

- **Accounting Accuracy:** GAAP/AASB compliant presentation
- **Period Clarity:** Clear distinction between recognition periods
- **Audit Ready:** Traceable to source transactions
- **Export Friendly:** Clean exports for accountants
- **Drill-Down:** Every total links to underlying transactions

---

## Mobile Wireframe (375px)

### Revenue Recognition Report

```
+=========================================+
| < Reports                               |
| Revenue Recognition                     |
+-----------------------------------------+
| Period: [Q4 2025 v]       [Export v]    |
+-----------------------------------------+
|                                         |
|  RECOGNITION SUMMARY                    |
|  +-------------------------------------+|
|  |                                     ||
|  |  Recognized Revenue                 ||
|  |       $245,600.00                   ||
|  |                                     ||
|  |  Deferred Revenue                   ||
|  |        $68,400.00                   ||
|  |                                     ||
|  |  Recognition Rate: 78%              ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  BY RECOGNITION TYPE                    |
|                                         |
|  +-------------------------------------+|
|  | On Delivery                         ||
|  | $158,200.00                   64%   ||
|  | [##################------]          ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Milestone                           ||
|  | $62,400.00                    25%   ||
|  | [########------------------]        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Time-Based                          ||
|  | $25,000.00                    10%   ||
|  | [###---------------------]          ||
|  +-------------------------------------+|
|                                         |
|  [View Detailed Schedule]               |
|                                         |
+-----------------------------------------+
```

### Deferred Revenue Report

```
+=========================================+
| < Reports                               |
| Deferred Revenue                        |
+-----------------------------------------+
| As of: [Jan 10, 2026 v]   [Export v]    |
+-----------------------------------------+
|                                         |
|  DEFERRED BALANCE                       |
|  +-------------------------------------+|
|  |                                     ||
|  |  Total Deferred                     ||
|  |       $68,400.00                    ||
|  |                                     ||
|  |  To Recognize This Month:           ||
|  |       $24,200.00                    ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  RECOGNITION SCHEDULE                   |
|                                         |
|  +-------------------------------------+|
|  | JAN 2026                            ||
|  | $24,200.00          35%             ||
|  | [############-----------------]     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | FEB 2026                            ||
|  | $18,500.00          27%             ||
|  | [##########-------------------]     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | MAR 2026                            ||
|  | $12,200.00          18%             ||
|  | [######-----------------------]     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | APR 2026+                           ||
|  | $13,500.00          20%             ||
|  | [#######----------------------]     ||
|  +-------------------------------------+|
|                                         |
|  [View Source Invoices]                 |
|                                         |
+-----------------------------------------+
```

### Recognition Detail List (Mobile)

```
+=========================================+
| < Revenue Recognition                   |
| Q4 2025 Details                         |
+-----------------------------------------+
| Type: [All v]      Sort: [Date v]       |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | Dec 28, 2025                        ||
|  | INV-2025-0478 - Kitchen Reno        ||
|  | Acme Corporation                    ||
|  | Type: [On Delivery]                 ||
|  |                                     ||
|  | Recognized: $15,500.00              ||
|  | Milestone: Job Complete             ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Dec 22, 2025                        ||
|  | INV-2025-0465 - Battery Install      ||
|  | Beta Industries                     ||
|  | Type: [Milestone]                   ||
|  |                                     ||
|  | Recognized: $8,200.00               ||
|  | Milestone: Phase 2 Complete         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Dec 15, 2025                        ||
|  | INV-2025-0450 - Maintenance         ||
|  | Gamma LLC                           ||
|  | Type: [Time-Based]                  ||
|  |                                     ||
|  | Recognized: $2,500.00               ||
|  | Period: Dec 2025 (1/12)             ||
|  +-------------------------------------+|
|                                         |
|  ...more entries...                     |
|                                         |
+-----------------------------------------+
```

### Loading Skeleton

```
+=========================================+
| < Reports                               |
| Revenue Recognition                     |
+-----------------------------------------+
| Period: [...........]       [........]  |
+-----------------------------------------+
|                                         |
|  RECOGNITION SUMMARY                    |
|  +-------------------------------------+|
|  |                                     ||
|  |  ........................           ||
|  |       ...............               ||
|  |                                     ||
|  |  ........................           ||
|  |       ...............               ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  BY RECOGNITION TYPE                    |
|                                         |
|  +-------------------------------------+|
|  | ........................             ||
|  | ...............                      ||
|  | [..............................]     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Revenue Recognition Report

```
+=============================================================================+
| < Reports | Revenue Recognition                      Period: [Q4 2025 v]     |
+-----------------------------------------------------------------------------+
| [Export CSV]    [Export PDF]    [Print]                                     |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- SUMMARY CARDS ---------------------------------------------------------+
|  |                                                                          |
|  | +-------------------------+ +-------------------------+ +-------------+  |
|  | | Recognized Revenue      | | Deferred Revenue        | | Rate       |  |
|  | |      $245,600.00        | |      $68,400.00         | |    78%     |  |
|  | | +$32,400 vs Q3          | | -$12,200 vs Q3          | | [###---]   |  |
|  | +-------------------------+ +-------------------------+ +-------------+  |
|  |                                                                          |
|  +--------------------------------------------------------------------------+
|                                                                             |
|  +-- BY RECOGNITION TYPE ---------------+  +-- BY MONTH ------------------+ |
|  |                                      |  |                              | |
|  | On Delivery    $158,200  64%         |  | Oct:  $72,400   29%          | |
|  | [######################--------]     |  | Nov:  $85,200   35%          | |
|  |                                      |  | Dec:  $88,000   36%          | |
|  | Milestone      $62,400   25%         |  |                              | |
|  | [########--------------------]       |  | [#########--------]          | |
|  |                                      |  | [###########------]          | |
|  | Time-Based     $25,000   10%         |  | [############-----]          | |
|  | [###-----------------------]         |  |                              | |
|  +--------------------------------------+  +------------------------------+ |
|                                                                             |
|  +-- DETAILED RECOGNITION TABLE --------------------------------------------+
|  |                                                                          |
|  | Date       | Invoice       | Customer        | Type      | Amount       |
|  +------------+--------------+-----------------+-----------+--------------+
|  | Dec 28     | INV-0478     | Acme Corp       | Delivery  | $15,500.00   |
|  | Dec 22     | INV-0465     | Beta Industries | Milestone | $8,200.00    |
|  | Dec 15     | INV-0450     | Gamma LLC       | Time-Based| $2,500.00    |
|  | Dec 10     | INV-0442     | Delta Inc       | Delivery  | $12,800.00   |
|  | ...        | ...          | ...             | ...       | ...          |
|  +--------------------------------------------------------------------------+
|                                                                             |
+=============================================================================+
```

### Deferred Revenue Roll-Forward

```
+=============================================================================+
| < Reports | Deferred Revenue Roll-Forward               As of: Jan 10, 2026 |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- ROLL-FORWARD STATEMENT ------------------------------------------------+
|  |                                                                          |
|  |  Opening Deferred Balance (Jan 1):           $56,200.00                  |
|  |                                                                          |
|  |  + New Deferrals (Advance Payments):        +$36,400.00                  |
|  |  - Recognized in Period:                    -$24,200.00                  |
|  |                                                                          |
|  |  ======================================================================= |
|  |  Closing Deferred Balance (Jan 10):          $68,400.00                  |
|  |                                                                          |
|  +--------------------------------------------------------------------------+
|                                                                             |
|  +-- FUTURE RECOGNITION SCHEDULE -------------------------------------------+
|  |                                                                          |
|  | Period     | Beginning   | Recognized  | Additions   | Ending           |
|  +------------+-------------+-------------+-------------+------------------+
|  | Jan 2026   | $56,200     | -$24,200    | +$36,400    | $68,400          |
|  | Feb 2026   | $68,400     | -$18,500    | (projected) | $49,900          |
|  | Mar 2026   | $49,900     | -$12,200    | (projected) | $37,700          |
|  | Apr 2026   | $37,700     | -$8,500     | (projected) | $29,200          |
|  | May 2026   | $29,200     | -$5,000     | (projected) | $24,200          |
|  +--------------------------------------------------------------------------+
|                                                                             |
+=============================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Revenue Recognition Report

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Revenue Recognition Report                                                            |
| Customers   |  --------------------------------------------------------------------------------------|
| Orders      |                                                                                        |
| Products    |  Period: [Q4 2025 v]   Recognition Type: [All Types v]         [Export v]  [Print]     |
| Jobs        |                                                                                        |
| Pipeline    |  ========================================================================================
| Financial < |                                                                                        |
|  > Invoices |  +-- RECOGNITION SUMMARY --------------------------------------------------------------+|
|  > Payments |  |                                                                                    ||
|  > Credits  |  | +--------------------+ +--------------------+ +--------------------+ +------------+ ||
|  > Aging    |  | | RECOGNIZED         | | DEFERRED           | | RECOGNITION RATE   | | YTD TOTAL | ||
|  > Reports <|  | |                    | |                    | |                    | |            | ||
|    > Recog. |  | |   $245,600.00      | |   $68,400.00       | |       78%          | | $892,400   | ||
|    > Defer. |  | |                    | |                    | |                    | |            | ||
|             |  | | +$32,400 vs Q3     | | -$12,200 vs Q3     | | [##############--] | | +15% YoY   | ||
|             |  | +--------------------+ +--------------------+ +--------------------+ +------------+ ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- BREAKDOWN CHARTS ----------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | +-- BY TYPE ----------------------+  +-- BY MONTH -------------------------+       ||
|             |  | |                                 |  |                                     |       ||
|             |  | |  On Delivery   ######### 64%   |  |  $88K  |           ####             |       ||
|             |  | |  Milestone     #####     25%   |  |  $85K  |      ####                  |       ||
|             |  | |  Time-Based    ##        10%   |  |  $72K  | ####                       |       ||
|             |  | |                                 |  |        +---------------------------  |       ||
|             |  | |  [View by Type]                 |  |          Oct    Nov    Dec          |       ||
|             |  | +--------------------------------+  +--------------------------------------+       ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- DETAILED RECOGNITION SCHEDULE ---------------------------------------------------+|
|             |  |                                                                                    ||
|             |  |  Filter: [All Types v]  [All Customers v]  [Search invoice...]                     ||
|             |  |  --------------------------------------------------------------------------------  ||
|             |  |                                                                                    ||
|             |  |  +-------------------------------------------------------------------------------+||
|             |  |  | Date       | Invoice    | Customer        | Type      | Milestone | Amount   |||
|             |  |  +------------+-----------+-----------------+-----------+-----------+----------+||
|             |  |  | Dec 28     | INV-0478  | Acme Corp       | Delivery  | Complete  | $15,500  |||
|             |  |  | Dec 22     | INV-0465  | Beta Industries | Milestone | Phase 2   | $8,200   |||
|             |  |  | Dec 15     | INV-0450  | Gamma LLC       | Time      | Dec 2025  | $2,500   |||
|             |  |  | Dec 10     | INV-0442  | Delta Inc       | Delivery  | Complete  | $12,800  |||
|             |  |  | Dec 8      | INV-0438  | Epsilon Co      | Milestone | Phase 1   | $6,400   |||
|             |  |  | Dec 5      | INV-0432  | Zeta Corp       | Time      | Dec 2025  | $4,200   |||
|             |  |  | Dec 3      | INV-0428  | Eta Partners    | Delivery  | Complete  | $9,800   |||
|             |  |  +-------------------------------------------------------------------------------+||
|             |  |                                                                                    ||
|             |  |  Showing 1-25 of 156 entries                              < 1 [2] 3 ... 7 >        ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Deferred Revenue Report (Desktop)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Financial   |  Deferred Revenue Report                                                               |
|   Reports   |  --------------------------------------------------------------------------------------|
|    Deferred |                                                                                        |
|             |  As of: [Jan 10, 2026 v]                                        [Export v]  [Print]    |
|             |                                                                                        |
|             |  ========================================================================================
|             |                                                                                        |
|             |  +-- DEFERRED BALANCE SUMMARY --------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | +--------------------+ +--------------------+ +--------------------+               ||
|             |  | | TOTAL DEFERRED     | | TO RECOGNIZE (30d) | | TO RECOGNIZE (90d) |               ||
|             |  | |                    | |                    | |                    |               ||
|             |  | |   $68,400.00       | |   $24,200.00       | |   $54,900.00       |               ||
|             |  | |                    | |                    | |                    |               ||
|             |  | | From 45 invoices   | | 35% of balance     | | 80% of balance     |               ||
|             |  | +--------------------+ +--------------------+ +--------------------+               ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- ROLL-FORWARD (Year to Date) -----------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | Opening Balance (Jan 1, 2026):                              $56,200.00             ||
|             |  |                                                                                    ||
|             |  | + Additions (Advance Payments Received):                   +$36,400.00             ||
|             |  | - Recognized Revenue (Released to Income):                 -$24,200.00             ||
|             |  |                                                                                    ||
|             |  | ================================================================================   ||
|             |  | Closing Balance (Jan 10, 2026):                             $68,400.00             ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- FUTURE RECOGNITION SCHEDULE -----------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | Period      | Opening     | To Recognize| New Deferrals| Closing    | % of Total  ||
|             |  +-------------+-------------+-------------+--------------+------------+-------------+||
|             |  | Jan 2026    | $56,200     | $24,200     | $36,400      | $68,400    | -           ||
|             |  | Feb 2026    | $68,400     | $18,500     | TBD          | $49,900*   | 27%         ||
|             |  | Mar 2026    | $49,900     | $12,200     | TBD          | $37,700*   | 18%         ||
|             |  | Apr 2026    | $37,700     | $8,500      | TBD          | $29,200*   | 12%         ||
|             |  | May 2026    | $29,200     | $5,000      | TBD          | $24,200*   | 7%          ||
|             |  | Jun 2026+   | $24,200     | $24,200     | TBD          | $0*        | 36%         ||
|             |  +------------------------------------------------------------------------------------+||
|             |  | * Projected based on current recognition schedules                                 ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- DEFERRED BY SOURCE INVOICE ------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | Invoice    | Customer        | Total Value | Deferred    | Schedule   | Actions   ||
|             |  +-----------+-----------------+-------------+-------------+------------+-----------+||
|             |  | INV-0495  | Acme Corp       | $45,000     | $22,500     | 6 mo equal | [View]    |||
|             |  | INV-0488  | Beta Industries | $28,000     | $14,000     | Milestone  | [View]    |||
|             |  | INV-0475  | Gamma LLC       | $36,000     | $12,000     | 12 mo equal| [View]    |||
|             |  | INV-0462  | Delta Inc       | $18,000     | $9,000      | Milestone  | [View]    |||
|             |  | INV-0455  | Epsilon Co      | $24,000     | $10,900     | 6 mo equal | [View]    |||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
+-- REPORT LOADING ---------------------------+
|                                            |
|  +----------------------------------------+|
|  | Generating report...                   ||
|  | [=====>                    ] 25%       ||
|  +----------------------------------------+|
|                                            |
|  Calculating recognition schedules...      |
|                                            |
+--------------------------------------------+

+-- TABLE LOADING ----------------------------+
|                                            |
|  +----------------------------------------+|
|  | Date    | Invoice | Customer | Amount  ||
|  +---------+---------+----------+---------|
|  | [....] | [.....] | [......] | [.....] ||
|  | [....] | [.....] | [......] | [.....] ||
|  | [....] | [.....] | [......] | [.....] ||
|  +----------------------------------------+|
|                                            |
|  Shimmer animation                         |
|                                            |
+--------------------------------------------+

+-- EXPORT GENERATING ------------------------+
|                                            |
|  [ [spin] Generating PDF... ]              |
|                                            |
|  Preparing 156 line items                  |
|                                            |
+--------------------------------------------+
```

### Empty States

```
+-- NO RECOGNITION DATA ----------------------+
|                                            |
|         +-------------+                    |
|         |   [chart]   |                    |
|         |   revenue   |                    |
|         +-------------+                    |
|                                            |
|     NO RECOGNITION DATA                    |
|                                            |
|  No revenue has been recognized for        |
|  this period. This could mean:             |
|                                            |
|  * No invoices have been delivered         |
|  * No milestones have been completed       |
|  * Recognition schedules not set up        |
|                                            |
|  [Adjust Period]  [View All Invoices]      |
|                                            |
+--------------------------------------------+

+-- NO DEFERRED REVENUE ----------------------+
|                                            |
|  [check] No deferred revenue               |
|                                            |
|  All revenue has been recognized.          |
|  No advance payments are pending.          |
|                                            |
|  [View Recognition History]                |
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- CALCULATION ERROR ------------------------+
|                                            |
|  [!] Recognition calculation failed        |
|                                            |
|  Unable to calculate recognition for       |
|  some invoices. Please review:             |
|                                            |
|  * INV-0495: Missing delivery date         |
|  * INV-0488: Milestone not defined         |
|                                            |
|  [View Problem Invoices]  [Retry]          |
|                                            |
+--------------------------------------------+

+-- EXPORT ERROR -----------------------------+
|                                            |
|  [!] Export failed                         |
|                                            |
|  Unable to generate the report file.       |
|  Please try again.                         |
|                                            |
|  [Retry Export]                            |
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- EXPORT COMPLETE --------------------------+
|                                            |
|  [check] Report exported                   |
|                                            |
|  Revenue-Recognition-Q4-2025.pdf           |
|  downloaded successfully                   |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- RECOGNITION RECORDED ---------------------+
|                                            |
|  [check] Revenue recognized                |
|                                            |
|  $15,500.00 recognized for INV-0478        |
|  Milestone: Job Complete                   |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Report Page**
   - Tab: Period selector -> Type filter -> Export -> Print -> Summary cards -> Charts -> Table filters -> Table rows
   - Enter on row: View invoice detail
   - Escape: Close any modals

2. **Period Selector**
   - Tab: Navigate between options
   - Arrow keys: Change period
   - Enter: Apply selection

3. **Data Table**
   - Tab: Navigate headers and rows
   - Enter: View row detail
   - Arrow Up/Down: Navigate within table

### ARIA Requirements

```html
<!-- Report Page -->
<main role="main" aria-label="Revenue Recognition Report">
  <header>
    <h1>Revenue Recognition Report</h1>
    <nav aria-label="Report controls">
      <label for="period-select">Period</label>
      <select id="period-select" aria-describedby="period-hint">
        <option>Q4 2025</option>
      </select>
    </nav>
  </header>

  <!-- Summary Cards -->
  <section aria-label="Recognition summary">
    <article
      aria-label="Recognized revenue: $245,600, up $32,400 vs Q3"
    >
      <!-- Card content -->
    </article>
    <article
      aria-label="Deferred revenue: $68,400, down $12,200 vs Q3"
    >
      <!-- Card content -->
    </article>
  </section>

  <!-- Recognition Table -->
  <section aria-label="Detailed recognition schedule">
    <table aria-label="Revenue recognition entries">
      <thead>
        <tr>
          <th scope="col" aria-sort="descending">Date</th>
          <th scope="col">Invoice</th>
          <th scope="col">Customer</th>
          <th scope="col">Type</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr
          aria-label="December 28, Invoice 0478, Acme Corp, Delivery, $15,500"
        >
          <!-- Row content -->
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Roll-Forward Statement -->
  <section aria-label="Deferred revenue roll-forward">
    <table aria-label="Roll-forward calculation">
      <tbody>
        <tr>
          <th scope="row">Opening Balance</th>
          <td>$56,200.00</td>
        </tr>
        <tr>
          <th scope="row">Additions</th>
          <td>+$36,400.00</td>
        </tr>
        <tr>
          <th scope="row">Recognized</th>
          <td>-$24,200.00</td>
        </tr>
        <tr>
          <th scope="row">Closing Balance</th>
          <td>$68,400.00</td>
        </tr>
      </tbody>
    </table>
  </section>
</main>

<!-- Chart Accessibility -->
<figure role="img" aria-label="Revenue by recognition type chart">
  <figcaption>
    Breakdown: On Delivery 64%, Milestone 25%, Time-Based 10%
  </figcaption>
</figure>
```

### Screen Reader Announcements

- Report load: "Revenue Recognition Report loaded. Q4 2025. Recognized revenue: $245,600. Deferred revenue: $68,400."
- Period change: "Period changed to Q3 2025. Report updating."
- Row focus: "December 28, Invoice 0478, Acme Corporation, On Delivery, $15,500 recognized."
- Export complete: "PDF export complete. Revenue-Recognition-Q4-2025.pdf downloaded."

---

## Animation Choreography

### Report Load Sequence

```
PAGE LOAD:
1. Header + controls appear (200ms)
2. Summary cards stagger in (100ms each)
3. Chart containers fade in (200ms)
4. Charts animate (bar grow, line draw)
5. Table rows fade in with stagger (30ms each)

Total: ~1.5 seconds
```

### Summary Card Entry

```
CARD ENTER:
- Duration: 300ms
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1
- Stagger: 100ms between cards

VALUE ANIMATION:
- Duration: 600ms
- Number: count up from 0
- Easing: ease-out
```

### Chart Animations

```
PIE/DONUT:
- Duration: 500ms
- Segments: grow from center
- Stagger: 100ms between segments

BAR CHART:
- Duration: 400ms
- Bars: grow from left
- Stagger: 50ms between bars
```

### Roll-Forward Animation

```
ENTRY:
- Duration: 300ms per row
- Rows: slide in from left
- Values: count in
- Final total: highlight pulse
```

### Period Change

```
TRANSITION:
- Duration: 300ms
- Old data: fade out
- Loading: shimmer
- New data: fade in

CHART UPDATE:
- Duration: 400ms
- Bars: morph to new heights
- Numbers: count to new values
```

---

## Component Props Interfaces

```typescript
// Recognition Types
type RecognitionType = 'on_delivery' | 'milestone' | 'time_based';

interface RecognitionEntry {
  id: string;
  date: Date;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  recognitionType: RecognitionType;
  amount: number;
  milestoneId?: string;
  milestoneName?: string;
  periodLabel?: string; // For time-based: "Dec 2025"
}

interface RecognitionSummary {
  period: DateRange;
  recognizedRevenue: number;
  deferredRevenue: number;
  recognitionRate: number;
  changeVsPrevious: {
    recognized: number;
    deferred: number;
  };
  byType: Array<{
    type: RecognitionType;
    amount: number;
    percentage: number;
  }>;
  byMonth: Array<{
    month: string;
    amount: number;
    percentage: number;
  }>;
}

interface DeferredRevenueEntry {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalValue: number;
  deferredAmount: number;
  scheduleType: RecognitionType;
  futureRecognition: Array<{
    period: string;
    amount: number;
  }>;
}

interface DeferredRevenueSummary {
  asOfDate: Date;
  totalDeferred: number;
  toRecognize30Days: number;
  toRecognize90Days: number;
  invoiceCount: number;
  rollForward: {
    opening: number;
    additions: number;
    recognized: number;
    closing: number;
  };
  futureSchedule: Array<{
    period: string;
    opening: number;
    toRecognize: number;
    additions: number | null;
    closing: number;
    percentageOfTotal: number;
  }>;
}

// Revenue Recognition Report
interface RevenueRecognitionReportProps {
  initialPeriod?: DateRange;
  onPeriodChange?: (period: DateRange) => void;
}

// Recognition Summary Cards
interface RecognitionSummaryCardsProps {
  summary: RecognitionSummary;
  isLoading?: boolean;
}

// Recognition By Type Chart
interface RecognitionByTypeChartProps {
  data: RecognitionSummary['byType'];
  onTypeClick?: (type: RecognitionType) => void;
}

// Recognition By Month Chart
interface RecognitionByMonthChartProps {
  data: RecognitionSummary['byMonth'];
  onMonthClick?: (month: string) => void;
}

// Recognition Table
interface RecognitionTableProps {
  entries: RecognitionEntry[];
  filters: {
    type?: RecognitionType;
    customerId?: string;
    search?: string;
  };
  onFilterChange: (filters: RecognitionTableProps['filters']) => void;
  onEntryClick?: (entry: RecognitionEntry) => void;
}

// Deferred Revenue Report
interface DeferredRevenueReportProps {
  asOfDate?: Date;
  onDateChange?: (date: Date) => void;
}

// Roll-Forward Statement
interface RollForwardStatementProps {
  data: DeferredRevenueSummary['rollForward'];
  periodLabel: string;
}

// Future Schedule Table
interface FutureScheduleTableProps {
  schedule: DeferredRevenueSummary['futureSchedule'];
  onPeriodClick?: (period: string) => void;
}

// Deferred By Invoice Table
interface DeferredByInvoiceTableProps {
  entries: DeferredRevenueEntry[];
  onInvoiceClick?: (entry: DeferredRevenueEntry) => void;
}

// Period Selector (Report-specific)
interface ReportPeriodSelectorProps {
  value: DateRange;
  onChange: (period: DateRange) => void;
  granularity: 'month' | 'quarter' | 'year';
  presets?: DateRange[];
}

// Export Menu
interface ReportExportMenuProps {
  reportType: 'recognition' | 'deferred';
  period: DateRange;
  onExport: (format: 'csv' | 'xlsx' | 'pdf') => void;
  isExporting?: boolean;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Recognition report | RevenueRecognitionReport | - |
| Deferred report | DeferredRevenueReport | - |
| Summary cards | RecognitionSummaryCards | Card |
| By type chart | RecognitionByTypeChart | - (Recharts) |
| By month chart | RecognitionByMonthChart | - (Recharts) |
| Recognition table | RecognitionTable | Table |
| Roll-forward | RollForwardStatement | Table |
| Future schedule | FutureScheduleTable | Table |
| Deferred by invoice | DeferredByInvoiceTable | Table |
| Period selector | ReportPeriodSelector | Select, DatePicker |
| Export menu | ReportExportMenu | DropdownMenu |
| Loading skeleton | ReportSkeleton | Skeleton |

---

## Files to Create/Modify

### Create
- `src/routes/_authed/financial/reports/recognition.tsx`
- `src/routes/_authed/financial/reports/deferred.tsx`
- `src/components/domain/financial/reports/revenue-recognition-report.tsx`
- `src/components/domain/financial/reports/deferred-revenue-report.tsx`
- `src/components/domain/financial/reports/recognition-summary-cards.tsx`
- `src/components/domain/financial/reports/recognition-by-type-chart.tsx`
- `src/components/domain/financial/reports/recognition-by-month-chart.tsx`
- `src/components/domain/financial/reports/recognition-table.tsx`
- `src/components/domain/financial/reports/roll-forward-statement.tsx`
- `src/components/domain/financial/reports/future-schedule-table.tsx`
- `src/components/domain/financial/reports/deferred-by-invoice-table.tsx`
- `src/components/domain/financial/reports/report-period-selector.tsx`
- `src/components/domain/financial/reports/report-export-menu.tsx`

### Modify
- `src/routes/_authed/financial/reports/index.tsx` (add navigation to new reports)
- `src/routes/_authed/financial/index.tsx` (add report links to dashboard)
