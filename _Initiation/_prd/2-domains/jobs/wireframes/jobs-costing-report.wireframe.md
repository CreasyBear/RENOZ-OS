# Jobs Domain Wireframe: Job Costing Report (DOM-JOBS-008b)

**Story ID:** DOM-JOBS-008b
**Component Type:** Report DataTable with filters
**Aesthetic:** Rugged Utilitarian - optimized for office analysis
**Primary Device:** Desktop (office managers/admins)
**Secondary:** Tablet (office use)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### DataTable with Filters
- **Pattern**: RE-UI DataGrid + Filters
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`, `filters.tsx`
- **Features**:
  - Sortable columns for job profitability analysis (quoted, cost, margin)
  - Date range picker for period filtering
  - Status badges for profitable/at-risk/loss visualization

### Chart Components
- **Pattern**: RE-UI Chart
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Margin distribution scatter plot for trend analysis
  - Cost breakdown pie chart (materials vs labor)
  - Bar charts for monthly profit comparison

### Card Summaries
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Summary metric cards (total jobs, profit margin, avg margin)
  - Color-coded status indicators (green=profitable, orange=at-risk, red=loss)
  - Click to drill down into job details

### Sheet Panel
- **Pattern**: RE-UI Sheet (slide-in panel)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Job detail slide-in panel with cost breakdown
  - Material and labor variance analysis
  - Export actions for CSV download

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `jobTimeEntries`, `jobMaterials` tables in `renoz-v2/lib/schema/job-costing.ts` | NOT CREATED |
| **Server Functions Required** | `getJobCostingReport`, `getJobCostingDetails`, `calculateJobProfitability` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-008a (Schema & Server Functions) | PENDING |

### Existing Schema Available
- `jobAssignments` in `renoz-v2/lib/schema/job-assignments.ts` - for job reference
- `products` in `renoz-v2/lib/schema/products.ts` - for material cost lookup
- `users` in `renoz-v2/lib/schema/users.ts` - for labor cost by technician

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **Use Case**: Office managers and business owners analyzing job profitability
- **Job Types**: Battery installation, Inverter install, Full system commissioning, Warranty service
- **Key Features**: Material vs labor cost breakdown, margin alerts, loss identification
- **Business Value**: Identifies underperforming jobs to improve quoting accuracy and resource allocation

---

## Design Principles

- **Desktop-first:** Financial reports are office/admin tasks
- **Data density:** Show key metrics at a glance
- **Filtering:** Flexible date range, customer, job type filters
- **Visual indicators:** Color-coded profitability status
- **Export:** CSV download for further analysis
- **Drill-down:** Click to see job details

---

## Desktop Wireframe (1280px+ - Full Report)

### Job Costing Report Page

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Reports > Job Costing                                                                 |
| Customers   |  =================================================================================     |
| Orders      |                                                                                        |
| Products    |  Analyze job profitability and identify underperforming work.                         |
| Jobs        |                                                                                        |
| Reports <   |  +-- FILTERS ------------------------------------------------------------------------ +|
|  > Sales    |  |                                                                                    ||
|  > Costing <|  |  Date Range:                    Customer:              Job Type:                   ||
|  > Inventory|  |  +-------------------+          +----------------+     +------------------+        ||
|             |  |  | [cal] Jan 1, 2026 |   to     | [All Customers]|     | [All Types]      |        ||
|             |  |  +-------------------+          +----------------+     +------------------+        ||
|             |  |  +-------------------+          [v]                    [v]                         ||
|             |  |  | [cal] Jan 31,2026 |                                                             ||
|             |  |  +-------------------+                                                             ||
|             |  |                                                                                    ||
|             |  |  Quick: [Today] [This Week] [This Month] [This Quarter] [This Year] [Custom]       ||
|             |  |                                                                                    ||
|             |  |  [Apply Filters]                                              [Clear Filters]      ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- SUMMARY CARDS ----------------------------------------------------------------- +|
|             |  |                                                                                    ||
|             |  |  +---------------+  +---------------+  +---------------+  +---------------+        ||
|             |  |  | TOTAL JOBS    |  | TOTAL QUOTED  |  | TOTAL COST    |  | PROFIT MARGIN |        ||
|             |  |  |               |  |               |  |               |  |               |        ||
|             |  |  |      23       |  |   $85,400     |  |   $62,150     |  |    27.2%      |        ||
|             |  |  |               |  |               |  |               |  |   +$23,250    |        ||
|             |  |  | This period   |  | Revenue       |  | Mat + Labor   |  | Gross profit  |        ||
|             |  |  +---------------+  +---------------+  +---------------+  +---------------+        ||
|             |  |                                                                                    ||
|             |  |  +---------------+  +---------------+  +---------------+  +---------------+        ||
|             |  |  | AVG MARGIN    |  | PROFITABLE    |  | AT RISK       |  | LOSS          |        ||
|             |  |  |               |  |               |  |               |  |               |        ||
|             |  |  |    28.5%      |  |      18       |  |       3       |  |       2       |        ||
|             |  |  |               |  |    (78%)      |  |  (0-15%)      |  |  (negative)   |        ||
|             |  |  | Per job       |  | [green]       |  | [orange]      |  | [red]         |        ||
|             |  |  +---------------+  +---------------+  +---------------+  +---------------+        ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- COSTING TABLE ----------------------------------------------------------------- +|
|             |  |                                                                                    ||
|             |  |  [search] Search jobs...                                        [Export CSV]       ||
|             |  |                                                                                    ||
|             |  |  +-- Job --------+-- Customer -----+-- Quoted --+-- Materials --+-- Labor ---+-- Total Cost --+-- Margin --+-- Status --+|
|             |  |  | JOB-1234      | Acme Corp       | $15,200    |    $9,500     |   $2,100   |   $11,600      |   23.7%    | Profitable ||
|             |  |  | 10kWh Battery |                 |            |               |            |                | +$3,600    | [green]    ||
|             |  |  +----------------------------------------------------------------------------------------------------+------------------+|
|             |  |  | JOB-1235      | Tech Inc        | $8,500     |    $4,200     |   $2,400   |    $6,600      |   22.4%    | Profitable ||
|             |  |  | Inverter Upg  |                 |            |               |            |                | +$1,900    | [green]    ||
|             |  |  +----------------------------------------------------------------------------------------------------+------------------+|
|             |  |  | JOB-1236      | Morrison Home   | $12,500    |    $7,800     |   $3,200   |   $11,000      |   12.0%    | At Risk    ||
|             |  |  | System Comm   |                 |            |               |            |                | +$1,500    | [orange]   ||
|             |  |  +----------------------------------------------------------------------------------------------------+------------------+|
|             |  |  | JOB-1237      | Chen Residence  | $45,000    |   $32,500     |   $14,800  |   $47,300      |   -5.1%    | LOSS       ||
|             |  |  | 50kW BESS     |                 |            |  (+$2,500 over)|            |                | -$2,300    | [red] [!]  ||
|             |  |  +----------------------------------------------------------------------------------------------------+------------------+|
|             |  |  | JOB-1238      | Park Office     | $16,500    |   $10,200     |   $3,800   |   $14,000      |   15.2%    | Profitable ||
|             |  |  | Battery Array |                 |            |               |            |                | +$2,500    | [green]    ||
|             |  |  +----------------------------------------------------------------------------------------------------+------------------+|
|             |  |  | JOB-1239      | Johnson Home    | $3,200     |    $1,500     |     $900   |    $2,400      |   25.0%    | Profitable ||
|             |  |  | Warranty Svc  |                 |            |               |            |                | +$800      | [green]    ||
|             |  |  +----------------------------------------------------------------------------------------------------+------------------+|
|             |  |                                                                                                                         ||
|             |  |  +-- Totals ---------------------------------------------------------------------------------------------------+        ||
|             |  |  |                             | $23,900    |    $11,450    |   $7,950   |   $19,400      |   18.8%    |              ||
|             |  |  |                             |            |               |            |                | +$4,500    |              ||
|             |  |  +----------------------------------------------------------------------------------------------------+                ||
|             |  |                                                                                                                         ||
|             |  |  Showing 6 of 23 jobs                                                   [< 1 2 3 4 >]                                  ||
|             |  |                                                                                                                         ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Job Detail Drill-Down (Click Row)

```
+-- JOB COSTING DETAIL (Slide-in Panel) -------------------+
|                                                          |
|  JOB-1237 - 50kW BESS Install                    [X]     |
|  Chen Residence                                          |
|  ====================================================    |
|                                                          |
|  [!] THIS JOB IS RUNNING AT A LOSS                       |
|  --------------------------------------------------------|
|                                                          |
|  +-- PROFITABILITY SUMMARY ----------------------------+ |
|  |                                                     | |
|  |  Quoted Amount:             $45,000.00              | |
|  |  -------------------------------------------------- | |
|  |  Material Cost:             $32,500.00              | |
|  |    - Budgeted:    $30,000.00                        | |
|  |    - Overrun:      +$2,500.00  [!]                  | |
|  |                                                     | |
|  |  Labor Cost:                $14,800.00              | |
|  |    - 197 hours @ $75/hr                             | |
|  |    - Budgeted:    $12,000.00                        | |
|  |    - Overrun:      +$2,800.00  [!]                  | |
|  |  -------------------------------------------------- | |
|  |  Total Cost:                $47,300.00              | |
|  |  ================================================== | |
|  |  Profit/Loss:                -$2,300.00             | |
|  |  Margin:                     -5.1%                  | |
|  |                                                     | |
|  +-----------------------------------------------------+ |
|                                                          |
|  +-- MATERIAL BREAKDOWN -------------------------------+ |
|  |                                                     | |
|  |  Product              Budget    Actual    Variance  | |
|  |  Battery Units        $22,000   $24,000    +$2,000  | |
|  |  Inverters            $6,000    $6,200     +$200    | |
|  |  Cabling/Hardware     $1,500    $1,800     +$300    | |
|  |  Mounting/Enclosure   $500      $500       $0       | |
|  |  -------------------------------------------------- | |
|  |  Total                $30,000   $32,500    +$2,500  | |
|  |                                                     | |
|  +-----------------------------------------------------+ |
|                                                          |
|  +-- LABOR BREAKDOWN ----------------------------------+ |
|  |                                                     | |
|  |  Date        Tech        Hours    Cost              | |
|  |  Jan 8       Mike J.     8h       $600              | |
|  |  Jan 9       Mike J.     8h       $600              | |
|  |  Jan 10      Mike J.     6h       $450              | |
|  |  Jan 10      Bob S.      2h       $150              | |
|  |  -------------------------------------------------- | |
|  |  Total                   24h      $1,800            | |
|  |  Budgeted                20h      $1,500            | |
|  |  Variance                +4h      +$300             | |
|  |                                                     | |
|  +-----------------------------------------------------+ |
|                                                          |
|  +-- NOTES --------------------------------------------+ |
|  |                                                     | |
|  |  [!] Ductwork required custom modifications        | |
|  |  [!] Extra labor for unexpected complexity         | |
|  |                                                     | |
|  +-----------------------------------------------------+ |
|                                                          |
|  [View Full Job]                     [Add to Review]     |
|                                                          |
+----------------------------------------------------------+
```

### Loss Alert View (Filtered to Losses Only)

```
+======================================================================================================+
|             |                                                                                        |
| Reports <   |  Reports > Job Costing > Underperforming Jobs                                          |
|  > Costing <|  =================================================================================     |
|             |                                                                                        |
|             |  [!] Showing jobs with margin < 15%                             [Show All Jobs]        |
|             |                                                                                        |
|             |  +-- ALERT SUMMARY -------------------------------------------------------------- +    |
|             |  |                                                                               |    |
|             |  |  2 jobs at a LOSS (-$350 total)  |  3 jobs AT RISK (< 15% margin)             |    |
|             |  |  Review these jobs to identify issues and prevent future losses.             |    |
|             |  |                                                                               |    |
|             |  +-------------------------------------------------------------------------------+    |
|             |                                                                                        |
|             |  +-- UNDERPERFORMING JOBS --------------------------------------------------------- +  |
|             |  |                                                                                 |  |
|             |  |  +-- LOSS (Negative Margin) ------------------------------------------------+   |  |
|             |  |  |                                                                          |   |  |
|             |  |  |  JOB-1237 - HVAC Install - Chen Residence                               |   |  |
|             |  |  |  Quoted: $4,100 | Cost: $4,300 | Margin: -4.9% | Loss: -$200            |   |  |
|             |  |  |  Issues: Material overrun (+$400), Labor overrun (+$300)               |   |  |
|             |  |  |  [View Details]                                                         |   |  |
|             |  |  |                                                                          |   |  |
|             |  |  |  JOB-1241 - Emergency Repair - Adams Home                               |   |  |
|             |  |  |  Quoted: $800 | Cost: $950 | Margin: -18.8% | Loss: -$150               |   |  |
|             |  |  |  Issues: Overtime labor, expedited parts                               |   |  |
|             |  |  |  [View Details]                                                         |   |  |
|             |  |  |                                                                          |   |  |
|             |  |  +--------------------------------------------------------------------------+   |  |
|             |  |                                                                                 |  |
|             |  |  +-- AT RISK (0-15% Margin) ------------------------------------------------+   |  |
|             |  |  |                                                                          |   |  |
|             |  |  |  JOB-1236 - Battery Inst - Morrison Home                                 |   |  |
|             |  |  |  Quoted: $2,500 | Cost: $2,150 | Margin: 14.0% | Profit: +$350          |   |  |
|             |  |  |  [View Details]                                                         |   |  |
|             |  |  |                                                                          |   |  |
|             |  |  |  JOB-1243 - Inverter Repair - Tech Inc                                   |   |  |
|             |  |  |  Quoted: $1,200 | Cost: $1,050 | Margin: 12.5% | Profit: +$150          |   |  |
|             |  |  |  [View Details]                                                         |   |  |
|             |  |  |                                                                          |   |  |
|             |  |  |  JOB-1245 - Minor Install - Park Office                                 |   |  |
|             |  |  |  Quoted: $900 | Cost: $800 | Margin: 11.1% | Profit: +$100              |   |  |
|             |  |  |  [View Details]                                                         |   |  |
|             |  |  |                                                                          |   |  |
|             |  |  +--------------------------------------------------------------------------+   |  |
|             |  |                                                                                 |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Tablet Wireframe (768px)

```
+=======================================================================+
| < Reports                                              [Export CSV]    |
+-----------------------------------------------------------------------+
| Job Costing Report                                                     |
| ==================================================================     |
+-----------------------------------------------------------------------+
|                                                                        |
|  +-- Date Range ---------------------------+                           |
|  | [cal] Jan 1 - Jan 31, 2026          [v] |                           |
|  +-----------------------------------------+                           |
|                                                                        |
|  +-- Filters ------------------------------+                           |
|  | Customer: [All]  Type: [All]        [v] |                           |
|  +-----------------------------------------+                           |
|                                                                        |
|  +------+------+------+------+                                         |
|  | Jobs | Quoted| Cost | Margin|                                       |
|  |  23  | $85K  | $62K | 27.2% |                                       |
|  +------+------+------+------+                                         |
|                                                                        |
|  +-- Job Cards (Scrollable) ----------------------------------------+  |
|  |                                                                  |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | JOB-1234 - Kitchen Inst - Acme Corp                          ||  |
|  |  | Quoted: $5,200 | Cost: $3,550 | Margin: 31.7%                 ||  |
|  |  | [======================] Profitable [green]                   ||  |
|  |  +--------------------------------------------------------------+|  |
|  |                                                                  |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | JOB-1235 - Bathroom Reno - Tech Inc                          ||  |
|  |  | Quoted: $3,800 | Cost: $3,000 | Margin: 21.1%                 ||  |
|  |  | [=================] Profitable [green]                        ||  |
|  |  +--------------------------------------------------------------+|  |
|  |                                                                  |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | JOB-1236 - Battery Inst - Morrison Home                       ||  |
|  |  | Quoted: $2,500 | Cost: $2,150 | Margin: 14.0%                 ||  |
|  |  | [============] At Risk [orange]                               ||  |
|  |  +--------------------------------------------------------------+|  |
|  |                                                                  |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | JOB-1237 - HVAC Install - Chen Residence           [!]       ||  |
|  |  | Quoted: $4,100 | Cost: $4,300 | Margin: -4.9%                 ||  |
|  |  | [XXXXXXXXXXXXX] LOSS [red]                                    ||  |
|  |  +--------------------------------------------------------------+|  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+=======================================================================+
```

---

## Mobile Wireframe (375px - View Only)

```
+=========================================+
| < Reports                               |
+-----------------------------------------+
| Job Costing                             |
| ======================================= |
+-----------------------------------------+
|                                         |
|  [cal] Jan 1 - 31, 2026            [v]  |
|                                         |
|  +----------+----------+                |
|  | 23 Jobs  | $85.4K   |                |
|  | Quoted   |          |                |
|  +----------+----------+                |
|  | $62.2K   | 27.2%    |                |
|  | Cost     | Margin   |                |
|  +----------+----------+                |
|                                         |
|  +-- STATUS BREAKDOWN -----------------+|
|  | [###] Profitable: 18 (78%)          ||
|  | [###] At Risk: 3 (13%)              ||
|  | [###] Loss: 2 (9%)                  ||
|  +-------------------------------------+|
|                                         |
|  JOBS (tap for details)                 |
|  +-------------------------------------+|
|  | JOB-1234 - Kitchen Inst             ||
|  | Acme Corp                           ||
|  | $5,200 -> $3,550                    ||
|  | Margin: 31.7% [green]          [>]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | JOB-1237 - HVAC Install        [!]  ||
|  | Chen Residence                      ||
|  | $4,100 -> $4,300                    ||
|  | Margin: -4.9% [red]            [>]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | JOB-1236 - Battery Inst              ||
|  | Morrison Home                       ||
|  | $2,500 -> $2,150                    ||
|  | Margin: 14.0% [orange]         [>]  ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|  [Export CSV]                           |
|                                         |
+=========================================+
```

---

## Data Visualization

### Margin Distribution Chart

```
+-- MARGIN DISTRIBUTION ----------------------------------+
|                                                         |
|  Profit Margin by Job                                   |
|                                                         |
|  50%|                                                   |
|     |                              *                    |
|  40%|           *                                       |
|     |    *   *     *                                    |
|  30%|  *   *   *     *  *                               |
|     |                      *   *                        |
|  20%|                           *  *                    |
|     |                                 *                 |
|  10%|                                    *              |
|     |                                       *           |
|   0%|----------------------------------------*------    |
|     |                                           *       | <- At risk zone
| -10%|                                              *    | <- Loss zone
|     +---------------------------------------------------+
|       J1  J2  J3  J4  J5  J6  J7  J8  J9 J10 J11 J12    |
|                                                         |
|  [---] = Target margin zone (25-35%)                    |
|                                                         |
+---------------------------------------------------------+
```

### Cost Breakdown Pie Chart

```
+-- COST BREAKDOWN (Selected Period) ---------------------+
|                                                         |
|           Total Cost: $62,150                           |
|                                                         |
|              +-------------+                            |
|           ,-'   Materials   '-.                         |
|         ,'     $38,500        ',                        |
|        /        62%             \                       |
|       |                          |                      |
|       |           +--------------+                      |
|        \        ,'    Labor     /                       |
|         '.    ,'    $23,650   ,'                        |
|           '-.'       38%   ,-'                          |
|              '-.       ,-'                              |
|                 '-----'                                 |
|                                                         |
|  [##] Materials: $38,500 (62%)                          |
|  [##] Labor: $23,650 (38%)                              |
|                                                         |
+---------------------------------------------------------+
```

---

## Export Format (CSV)

```
+-- CSV EXPORT PREVIEW -----------------------------------+
|                                                         |
|  Job Costing Report - January 2026                      |
|  Generated: 2026-01-31 14:30:00                         |
|                                                         |
|  Columns:                                               |
|  - Job ID                                               |
|  - Job Title                                            |
|  - Customer                                             |
|  - Date Completed                                       |
|  - Quoted Amount                                        |
|  - Material Cost                                        |
|  - Material Budget                                      |
|  - Material Variance                                    |
|  - Labor Hours                                          |
|  - Labor Cost                                           |
|  - Labor Budget                                         |
|  - Labor Variance                                       |
|  - Total Cost                                           |
|  - Profit/Loss                                          |
|  - Margin %                                             |
|  - Status (Profitable/At Risk/Loss)                     |
|                                                         |
+---------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Filter inputs | Standard form | Tab | 44px min |
| Date picker | role="dialog" | Arrow, Enter | 44px |
| Table row | role="row" | Tab, Enter | Full row |
| Sort header | aria-sort | Enter | Full header |
| Export button | aria-label="Export CSV" | Enter | 44px |
| Status badge | role="status" | - | - |
| Chart | role="img", aria-label | - | - |
| Detail panel | role="dialog" | Esc to close | - |

---

## Keyboard Navigation

```
+-- KEYBOARD CONTROLS ---------------------------------------+
|                                                            |
|  FILTERS:                                                  |
|  - Tab: Move between filter inputs                         |
|  - Enter: Apply filters                                    |
|  - Esc: Clear current input                                |
|                                                            |
|  TABLE:                                                    |
|  - Tab: Move to table, then between rows                   |
|  - Arrow Up/Down: Navigate rows                            |
|  - Enter: Open job detail panel                            |
|  - Click header: Sort by column                            |
|                                                            |
|  DETAIL PANEL:                                             |
|  - Esc: Close panel                                        |
|  - Tab: Navigate within panel                              |
|                                                            |
+------------------------------------------------------------+
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Report page | JobCostingReport | - |
| Filter bar | CostingFilterBar | - |
| Date range picker | DateRangePicker | Calendar, Popover |
| Summary cards | CostingSummaryCards | Card |
| Costing table | JobCostingTable | DataTable |
| Table row | CostingTableRow | TableRow |
| Status badge | MarginStatusBadge | Badge |
| Detail panel | JobCostingDetailPanel | Sheet |
| Cost breakdown | CostBreakdownChart | - (recharts) |
| Export button | ExportButton | Button |
| Empty state | EmptyState | - |

---

## Files to Create/Modify

- src/routes/_authed/reports/job-costing.tsx (create)
- src/components/domain/jobs/job-costing-table.tsx (create)
- src/components/domain/jobs/costing-summary-cards.tsx (create)
- src/components/domain/jobs/costing-filter-bar.tsx (create)
- src/components/domain/jobs/job-costing-detail-panel.tsx (create)
- src/components/domain/jobs/margin-status-badge.tsx (create)
- src/server/functions/job-costing.ts (use from DOM-JOBS-008a)
