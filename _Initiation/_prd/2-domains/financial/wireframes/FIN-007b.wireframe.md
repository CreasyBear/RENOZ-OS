# Financial Domain Wireframe: Financial Dashboard UI (DOM-FIN-007b)

**Story ID:** DOM-FIN-007b
**Component Type:** DashboardGrid with KPIWidget and ChartWidget
**Aesthetic:** Data-rich Scannable - information density with clear hierarchy
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### KPI Widget Cards
- **Pattern**: RE-UI Card with Metric Display
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Large value display with currency formatting
  - Trend indicator (arrow icon + percentage change)
  - Progress bar for target achievement
  - Sparkline or comparison value (vs last period)

### Revenue Trend Chart
- **Pattern**: RE-UI Chart (Recharts Line)
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Multi-month line chart with data points
  - Hover tooltips showing exact values
  - Target line overlay for goal tracking
  - Responsive to period selector changes

### AR Aging Stacked Bar
- **Pattern**: RE-UI Chart (Recharts Stacked Bar)
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Horizontal stacked bar with color-coded segments
  - Segment labels with amounts and percentages
  - Click-through to detailed aging report
  - Warning indicators for overdue buckets

### Period Selector Dropdown
- **Pattern**: RE-UI Select with Presets
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Quick period options (This Month, Last Month, Q1, YTD)
  - Custom date range option with calendar picker
  - Compare to period dropdown for trend analysis
  - Auto-refresh on period change

### Quick Actions Toolbar
- **Pattern**: RE-UI Button Group
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Icon + label buttons for common actions
  - Create Invoice, Record Payment, Send Reminder shortcuts
  - Responsive layout (icon-only on mobile)
  - Grouped by action type with dividers

---

## Design Principles for Financial Dashboard

- **Executive Summary:** Key metrics visible at a glance
- **Trend Awareness:** Show direction of change, not just values
- **Drill-Down Ready:** Every metric leads to detailed view
- **Actionable:** Surface items needing attention
- **Time-Contextual:** Clear date ranges and comparison periods

---

## Mobile Wireframe (375px)

### Financial Dashboard - KPI Focus

```
+=========================================+
| < Dashboard                             |
| Financial Overview                      |
+-----------------------------------------+
| Period: [This Month v]  vs Last Month   |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |  REVENUE MTD                        ||
|  |  ===================================||
|  |                                     ||
|  |       $125,450                      ||
|  |                                     ||
|  |  [^^^^] +12.5% vs last month        ||
|  |                                     ||
|  |  [===========----------] 75%        ||
|  |  Target: $165,000                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  ACCOUNTS RECEIVABLE                ||
|  |  ===================================||
|  |                                     ||
|  |       $89,200                       ||
|  |                                     ||
|  |  [^^^^] +8.2% vs last month         ||
|  |                                     ||
|  |  Overdue: $28,100 (32%)        [!]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  OVERDUE INVOICES                   ||
|  |  ===================================||
|  |                                     ||
|  |       $28,100                       ||
|  |                                     ||
|  |  [vvvv] -5.3% vs last month    [ok] ||
|  |                                     ||
|  |  12 invoices | 8 customers          ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  CASH RECEIVED MTD                  ||
|  |  ===================================||
|  |                                     ||
|  |       $98,750                       ||
|  |                                     ||
|  |  [^^^^] +18.5% vs last month        ||
|  |                                     ||
|  |  45 payments recorded               ||
|  +-------------------------------------+|
|                                         |
|  [View AR Aging]  [View Revenue Chart]  |
|                                         |
+-----------------------------------------+
```

### Revenue Trend Chart (Mobile)

```
+=========================================+
| < Financial                             |
| Revenue Trend                           |
+-----------------------------------------+
| Period: [Last 6 Months v]               |
+-----------------------------------------+
|                                         |
|  REVENUE OVER TIME                      |
|  +-------------------------------------+|
|  |                           * $125K   ||
|  |                     *               ||
|  |               *           *         ||
|  |         *                           ||
|  |    *                                ||
|  |  ---------------------------------  ||
|  |  Aug Sep Oct Nov Dec Jan            ||
|  +-------------------------------------+|
|                                         |
|  Total (6 months): $542,350             |
|  Average Monthly: $90,391               |
|                                         |
|  +-------------------------------------+|
|  | Best Month:     Nov  $132,500       ||
|  | Lowest Month:   Aug   $68,200       ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Quick Actions Bar (Mobile)

```
+=========================================+
|                                         |
|  QUICK ACTIONS                          |
|  +-------------------------------------+|
|  | [+] Create   [rec] Record  [send]   ||
|  |     Invoice       Payment  Reminder ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Outstanding Invoices List (Mobile)

```
+=========================================+
| < Financial                             |
| Outstanding Invoices                    |
+-----------------------------------------+
| Sort: [Due Date v]   [Filter: All v]    |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | INV-0089                   [!] 15d  ||
|  | Acme Corporation                    ||
|  | $5,000.00          Due: Dec 27      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | INV-0095                   [!] 5d   ||
|  | Beta Industries                     ||
|  | $2,500.00          Due: Jan 5       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | INV-0098                            ||
|  | Gamma LLC                           ||
|  | $3,200.00          Due: Jan 15      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | INV-0102                            ||
|  | Delta Inc                           ||
|  | $1,800.00          Due: Jan 20      ||
|  +-------------------------------------+|
|                                         |
|  Total Outstanding: $89,200             |
|  [View All 45 Invoices]                 |
|                                         |
+-----------------------------------------+
```

### Loading Skeleton

```
+=========================================+
| < Dashboard                             |
| Financial Overview                      |
+-----------------------------------------+
| Period: [...............] vs [........] |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |  ..................                 ||
|  |  ===================================||
|  |                                     ||
|  |       ...........                   ||
|  |                                     ||
|  |  [....] ................            ||
|  |                                     ||
|  |  [....................] ...         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  ..................                 ||
|  |  ===================================||
|  |                                     ||
|  |       ...........                   ||
|  |                                     ||
|  |  [....] ................            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Financial Dashboard - Two Column Grid

```
+=============================================================================+
| < Dashboard | Financial Overview                    Period: [This Month v]   |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- KPI ROW ---------------------------------------------------------------+
|  |                                                                          |
|  | +--------------------+ +--------------------+ +--------------------+      |
|  | | REVENUE MTD        | | AR BALANCE         | | OVERDUE            |      |
|  | |                    | |                    | |                    |      |
|  | |     $125,450       | |     $89,200        | |     $28,100        |      |
|  | |                    | |                    | |                    |      |
|  | | [^] +12.5%         | | [^] +8.2%          | | [v] -5.3%   [ok]   |      |
|  | | Target: 75%        | | Overdue: 32%  [!]  | | 12 invoices        |      |
|  | +--------------------+ +--------------------+ +--------------------+      |
|  |                                                                          |
|  | +--------------------+                                                   |
|  | | CASH RECEIVED      |                                                   |
|  | |                    |                                                   |
|  | |     $98,750        |                                                   |
|  | |                    |                                                   |
|  | | [^] +18.5%         |                                                   |
|  | | 45 payments        |                                                   |
|  | +--------------------+                                                   |
|  +--------------------------------------------------------------------------+
|                                                                             |
|  +-- CHARTS & TABLES -------------------------------------------------------+
|  |                                                                          |
|  | +-- REVENUE CHART -----------------+  +-- AR AGING -------------------+  |
|  | |                                  |  |                               |  |
|  | |        * $125K                   |  | Current:  $61,100 (68%)       |  |
|  | |      *   *                       |  | 1-30:     $15,600 (17%)       |  |
|  | |    *       *                     |  | 31-60:    $7,500  (8%)        |  |
|  | |  *           *                   |  | 61-90:    $3,000  (4%)        |  |
|  | | Oct Nov Dec Jan                  |  | 90+:      $2,000  (3%)   [!]  |  |
|  | |                                  |  |                               |  |
|  | | [View Full Chart]               |  | [View Aging Report]           |  |
|  | +----------------------------------+  +-------------------------------+  |
|  |                                                                          |
|  +--------------------------------------------------------------------------+
|                                                                             |
|  +-- TOP CUSTOMERS BY REVENUE ----------+  +-- OUTSTANDING INVOICES ------+ |
|  |                                      |  |                              | |
|  | 1. Acme Corp         $45,200        |  | INV-0089  Acme    $5,000 [!] | |
|  | 2. Beta Industries   $28,500        |  | INV-0095  Beta    $2,500 [!] | |
|  | 3. Gamma LLC         $22,100        |  | INV-0098  Gamma   $3,200     | |
|  | 4. Delta Inc         $18,750        |  | INV-0102  Delta   $1,800     | |
|  | 5. Epsilon Co        $10,900        |  | INV-0105  Epsilon $4,500     | |
|  |                                      |  |                              | |
|  | [View All Customers]                |  | [View All Invoices]          | |
|  +--------------------------------------+  +------------------------------+ |
|                                                                             |
+=============================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Financial Dashboard

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Financial Dashboard                                                                   |
| Customers   |  --------------------------------------------------------------------------------------|
| Orders      |                                                                                        |
| Products    |  Period: [This Month v]   Compare to: [Last Month v]               [Refresh] [Export]  |
| Jobs        |                                                                                        |
| Pipeline    |  ========================================================================================
| Financial < |                                                                                        |
| Settings    |  +-- KPI WIDGETS (4-column) ----------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | +-------------------+ +-------------------+ +-------------------+ +---------------+ ||
|             |  | | REVENUE MTD       | | AR BALANCE        | | OVERDUE AMOUNT    | | CASH RECEIVED| ||
|             |  | |                   | |                   | |                   | |              | ||
|             |  | |    $125,450       | |    $89,200        | |    $28,100        | |   $98,750    | ||
|             |  | |                   | |                   | |                   | |              | ||
|             |  | | [^^^^] +12.5%     | | [^^^^] +8.2%      | | [vvvv] -5.3%      | | [^^^^]+18.5% | ||
|             |  | | vs last month    | | 45 customers      | | 12 invoices       | | 45 payments  | ||
|             |  | |                   | |                   | |                   | |              | ||
|             |  | | Target Progress:  | | Overdue: 32% [!]  | | [v] Improving     | | Avg: $2,195  | ||
|             |  | | [========--] 75%  | |                   | | 8 customers       | |              | ||
|             |  | +-------------------+ +-------------------+ +-------------------+ +---------------+ ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- CHARTS ROW (2-column) -----------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | +-- REVENUE TREND (Line Chart) -----------------+  +-- AR AGING (Stacked Bar) ---+ ||
|             |  | |                                               |  |                             | ||
|             |  | |                                 * $125K       |  | $61.1K |##########|         | ||
|             |  | |                           *                   |  | $15.6K |###      |          | ||
|             |  | |                     *           * $98K        |  |  $7.5K |##       |          | ||
|             |  | |               *                               |  |  $3.0K |#        |          | ||
|             |  | |         *                                     |  |  $2.0K |#        |   [!]    | ||
|             |  | |    *                                          |  |        +---------+          | ||
|             |  | |  --------------------------------------------  |  |        Curr 1-30 31-60 61+ | ||
|             |  | |  Aug  Sep  Oct  Nov  Dec  Jan                  |  |                             | ||
|             |  | |                                               |  | Total: $89,200              | ||
|             |  | |  YTD Total: $542,350                          |  |                             | ||
|             |  | |  [View Detailed Report]                       |  | [View Aging Report]         | ||
|             |  | +-----------------------------------------------+  +-----------------------------+ ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- DATA TABLES ROW (2-column) ------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | +-- TOP CUSTOMERS BY REVENUE --------+  +-- OUTSTANDING INVOICES ----------------+ ||
|             |  | |                                    |  |                                        | ||
|             |  | | Customer           | Revenue | %   |  | Invoice   | Customer  | Amount | Due  | ||
|             |  | +--------------------+---------+-----+  +-----------+-----------+--------+------+ ||
|             |  | | Acme Corporation   | $45,200 | 36% |  | INV-0089  | Acme      | $5,000 | [!]  | ||
|             |  | | Beta Industries    | $28,500 | 23% |  | INV-0095  | Beta      | $2,500 | [!]  | ||
|             |  | | Gamma LLC          | $22,100 | 18% |  | INV-0098  | Gamma     | $3,200 |      | ||
|             |  | | Delta Inc          | $18,750 | 15% |  | INV-0102  | Delta     | $1,800 |      | ||
|             |  | | Epsilon Co         | $10,900 |  8% |  | INV-0105  | Epsilon   | $4,500 |      | ||
|             |  | |                    |         |     |  |           |           |        |      | ||
|             |  | | [View All]                        |  | [View All 45 Invoices]                 | ||
|             |  | +------------------------------------+  +----------------------------------------+ ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- QUICK ACTIONS -------------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  |  [+ Create Invoice]   [+ Record Payment]   [Send Reminders]   [Generate Statements]||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### KPI Widget Expanded (Drill-Down)

```
+======================================================================================================+
|                                                                                                      |
|   +-- REVENUE MTD (Expanded) -------------------------------------------------------------------+    |
|   |                                                                                             |    |
|   |  $125,450.00                                                   Period: Jan 1 - Jan 10      |    |
|   |  ========================================================================================   |    |
|   |                                                                                             |    |
|   |  Trend: [^^^^] +12.5% vs last month ($111,500)                                              |    |
|   |  Target: $165,000 (75% achieved)                                                            |    |
|   |  Projected: $156,000 (based on current trend)                                               |    |
|   |                                                                                             |    |
|   |  +-- BREAKDOWN BY SOURCE -------------------+  +-- DAILY TREND -----------------------+     |    |
|   |  |                                          |  |                                      |     |    |
|   |  | New Sales:        $85,200 (68%)          |  |  $15K  |     *         *             |     |    |
|   |  | Recurring:        $28,500 (23%)          |  |  $10K  |  *     *   *     *          |     |    |
|   |  | Upsells:          $11,750 (9%)           |  |   $5K  |*                     *      |     |    |
|   |  |                                          |  |        +--------------------------- |     |    |
|   |  +------------------------------------------+  |          1  2  3  4  5  6  7  8  9 10|     |    |
|   |                                                +--------------------------------------+     |    |
|   |                                                                                             |    |
|   |  [View All Invoices]    [Export Data]    [Set Target]                                       |    |
|   |                                                                                             |    |
|   +---------------------------------------------------------------------------------------------+    |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
+-- FULL DASHBOARD LOADING -------------------+
|                                            |
|  +----------------------------------------+|
|  | Loading financial data...              ||
|  | [=====>                    ] 25%       ||
|  +----------------------------------------+|
|                                            |
|  Skeleton KPI cards with shimmer           |
|  Chart area with placeholder               |
|  Table rows with loading bars              |
|                                            |
+--------------------------------------------+

+-- WIDGET REFRESH ---------------------------+
|                                            |
|  +----------------------------------------+|
|  | REVENUE MTD          [[spin] ...]      ||
|  |                                        ||
|  |     $125,450  (dimmed while loading)   ||
|  |                                        ||
|  +----------------------------------------+|
|                                            |
|  Content remains visible but dimmed        |
|  Spinner in corner                         |
|                                            |
+--------------------------------------------+

+-- CHART LOADING ----------------------------+
|                                            |
|  +----------------------------------------+|
|  |                                        ||
|  |        [spin]                          ||
|  |     Loading chart...                   ||
|  |                                        ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+
```

### Empty States

```
+-- NO DATA FOR PERIOD -----------------------+
|                                            |
|  +----------------------------------------+|
|  |                                        ||
|  |        No data for this period         ||
|  |                                        ||
|  |  Try selecting a different date        ||
|  |  range or check if invoices have       ||
|  |  been created.                         ||
|  |                                        ||
|  |  [View All Time]  [Create Invoice]     ||
|  |                                        ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+

+-- NO OUTSTANDING INVOICES ------------------+
|                                            |
|  +----------------------------------------+|
|  |      [check] All invoices paid!        ||
|  |                                        ||
|  |  No outstanding invoices at this       ||
|  |  time. Great work on collections!      ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- WIDGET ERROR -----------------------------+
|                                            |
|  +----------------------------------------+|
|  | REVENUE MTD                   [!]      ||
|  |                                        ||
|  |  Failed to load                        ||
|  |                                        ||
|  |  [Retry]                               ||
|  +----------------------------------------+|
|                                            |
|  Other widgets remain functional           |
|                                            |
+--------------------------------------------+

+-- FULL DASHBOARD ERROR ---------------------+
|                                            |
|  +----------------------------------------+|
|  |         [!] Error                      ||
|  |                                        ||
|  |  Couldn't load dashboard data          ||
|  |                                        ||
|  |  Please check your connection          ||
|  |  and try again.                        ||
|  |                                        ||
|  |         [Retry]                        ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- REFRESH COMPLETE -------------------------+
|                                            |
|  [check] Dashboard updated                 |
|                                            |
|  Data as of: Jan 10, 2026, 2:30 PM         |
|                                            |
|  <- Toast (2 seconds)                      |
+--------------------------------------------+

+-- TARGET ACHIEVED --------------------------+
|                                            |
|  +----------------------------------------+|
|  | REVENUE MTD              [confetti]    ||
|  |                                        ||
|  |     $165,000                           ||
|  |                                        ||
|  | [check] Target achieved!               ||
|  | [=========] 100%                       ||
|  +----------------------------------------+|
|                                            |
|  Celebration animation on first achievement|
|                                            |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Dashboard Page**
   - Tab: Period selector -> Compare selector -> Refresh -> Export -> KPI widgets -> Charts -> Tables -> Quick actions
   - Enter on KPI: Open drill-down view
   - Escape: Close any open modals

2. **KPI Widget**
   - Tab: Focus widget
   - Enter: Open drill-down
   - Arrow keys: Navigate between widgets (optional)

3. **Charts**
   - Tab: Focus chart
   - Arrow keys: Navigate between data points
   - Enter: View data point details

4. **Data Tables**
   - Tab: Navigate rows
   - Enter: View row detail

### ARIA Requirements

```html
<!-- Dashboard Page -->
<main role="main" aria-label="Financial Dashboard">
  <header>
    <h1>Financial Dashboard</h1>
    <nav aria-label="Dashboard controls">
      <label for="period-select">Period</label>
      <select id="period-select" aria-describedby="period-hint">
        <option>This Month</option>
        <option>Last Month</option>
      </select>
      <span id="period-hint">Select reporting period</span>
    </nav>
  </header>

  <!-- KPI Grid -->
  <section aria-label="Key performance indicators">
    <div
      role="region"
      aria-label="Revenue month to date: $125,450, up 12.5 percent vs last month"
      tabindex="0"
    >
      <!-- KPI content -->
    </div>
  </section>

  <!-- Revenue Chart -->
  <section aria-label="Revenue trend chart">
    <figure role="img" aria-label="Revenue trend for last 6 months">
      <figcaption>Monthly revenue from August to January</figcaption>
      <!-- Chart -->
    </figure>
  </section>

  <!-- AR Aging -->
  <section aria-label="Accounts receivable aging">
    <div
      role="img"
      aria-label="AR aging breakdown: Current 68%, 1-30 days 17%, 31-60 days 8%, 61-90 days 4%, over 90 days 3%"
    >
      <!-- Stacked bar -->
    </div>
  </section>

  <!-- Data Tables -->
  <section aria-label="Top customers by revenue">
    <table aria-label="Top 5 customers">
      <thead>
        <tr>
          <th scope="col">Customer</th>
          <th scope="col" aria-sort="descending">Revenue</th>
          <th scope="col">Percentage</th>
        </tr>
      </thead>
    </table>
  </section>

  <!-- Quick Actions -->
  <nav aria-label="Quick actions">
    <button aria-label="Create new invoice">
      Create Invoice
    </button>
    <button aria-label="Record payment">
      Record Payment
    </button>
  </nav>
</main>

<!-- KPI Widget (individual) -->
<article
  role="region"
  aria-labelledby="kpi-revenue-title"
  aria-describedby="kpi-revenue-desc"
  tabindex="0"
>
  <h3 id="kpi-revenue-title">Revenue MTD</h3>
  <p class="kpi-value" aria-live="polite">$125,450</p>
  <p id="kpi-revenue-desc">
    Up 12.5% compared to last month. 75% of $165,000 target.
  </p>
</article>
```

### Screen Reader Announcements

- Dashboard load: "Financial dashboard loaded. Revenue month to date: $125,450, up 12.5% vs last month."
- Period change: "Period changed to Last Month. Dashboard updating."
- Widget focus: "Revenue month to date: $125,450. Up 12.5% vs last month. 75% of target achieved. Press Enter to view details."
- Chart data: "Revenue trend chart. January: $125,450. December: $132,500. November: $98,000."
- Refresh: "Dashboard data refreshed. Last updated: January 10, 2:30 PM."

---

## Animation Choreography

### Dashboard Load Sequence

```
PAGE LOAD:
1. Header + controls appear (200ms)
2. KPI cards stagger in (100ms each, 4 cards = 400ms)
3. Chart containers fade in (200ms)
4. Charts animate data (400ms)
5. Tables fade in with row stagger (50ms each)

Total: ~1.5 seconds
```

### KPI Card Animations

```
CARD ENTER:
- Duration: 300ms
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1
- Stagger: 100ms between cards

VALUE COUNT UP:
- Duration: 600ms
- Easing: ease-out
- Number: 0 -> final value
- Format: Currency with commas

TREND INDICATOR:
- Duration: 300ms
- Arrow: scale(0) -> scale(1)
- Color: fade in based on direction
```

### Progress Bar Animation

```
BAR FILL:
- Duration: 500ms
- Easing: ease-out
- Width: 0% -> target%
- Delay: 300ms after card appears
```

### Chart Animations

```
LINE CHART:
- Duration: 600ms
- Path: draw from left to right
- Points: scale in after line reaches them

BAR CHART:
- Duration: 400ms
- Bars: grow from bottom
- Stagger: 50ms between bars

HOVER:
- Duration: 150ms
- Segment: slight lift/emphasis
- Tooltip: fade in
```

### Drill-Down Transition

```
EXPAND:
- Duration: 350ms
- Card: expand to full panel
- Content: fade in as card expands
- Background: overlay fades in

COLLAPSE:
- Duration: 300ms
- Reverse of expand
- Focus returns to original widget
```

### Data Refresh

```
REFRESH TRIGGER:
- Duration: variable
- Widgets: slight opacity reduction (0.6)
- Spinner: appears in corner
- Complete: flash, opacity returns

NEW DATA:
- Duration: 300ms
- Values: cross-fade
- Charts: morph to new data
```

---

## Component Props Interfaces

```typescript
// Dashboard Types
interface FinancialDashboardData {
  period: DateRange;
  comparePeriod?: DateRange;
  kpis: DashboardKPIs;
  revenueTrend: RevenueDataPoint[];
  arAging: AgingBucket[];
  topCustomers: CustomerRevenue[];
  outstandingInvoices: InvoiceSummary[];
  lastUpdated: Date;
}

interface DashboardKPIs {
  revenueMTD: KPIValue;
  arBalance: KPIValue;
  overdueAmount: KPIValue;
  cashReceived: KPIValue;
}

interface KPIValue {
  value: number;
  change: number;
  changeDirection: 'up' | 'down' | 'flat';
  target?: number;
  targetProgress?: number;
  subtitle?: string;
}

interface RevenueDataPoint {
  period: string;
  revenue: number;
  target?: number;
}

interface CustomerRevenue {
  customerId: string;
  customerName: string;
  revenue: number;
  percentage: number;
}

interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  daysOverdue?: number;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

// Dashboard Page
interface FinancialDashboardProps {
  initialPeriod?: DateRange;
  onPeriodChange?: (period: DateRange) => void;
}

// KPI Widget
interface KPIWidgetProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  change?: number;
  changeDirection?: 'up' | 'down' | 'flat';
  changeLabel?: string;
  target?: number;
  targetProgress?: number;
  subtitle?: string;
  alertLevel?: 'normal' | 'warning' | 'critical';
  onClick?: () => void;
  isLoading?: boolean;
}

// KPI Grid
interface KPIGridProps {
  kpis: Array<KPIWidgetProps>;
  columns?: 2 | 3 | 4;
}

// Revenue Chart Widget
interface RevenueChartWidgetProps {
  data: RevenueDataPoint[];
  showTarget?: boolean;
  period: string;
  onPeriodChange?: (period: string) => void;
  onDataPointClick?: (point: RevenueDataPoint) => void;
}

// AR Aging Widget
interface ARAgingWidgetProps {
  buckets: AgingBucket[];
  total: number;
  onBucketClick?: (bucket: AgingBucket) => void;
  onViewReport?: () => void;
}

// Top Customers Widget
interface TopCustomersWidgetProps {
  customers: CustomerRevenue[];
  limit?: number;
  onCustomerClick?: (customer: CustomerRevenue) => void;
  onViewAll?: () => void;
}

// Outstanding Invoices Widget
interface OutstandingInvoicesWidgetProps {
  invoices: InvoiceSummary[];
  limit?: number;
  onInvoiceClick?: (invoice: InvoiceSummary) => void;
  onViewAll?: () => void;
}

// Period Selector
interface PeriodSelectorProps {
  value: DateRange;
  onChange: (period: DateRange) => void;
  presets?: DateRange[];
}

// Comparison Toggle
interface ComparisonToggleProps {
  enabled: boolean;
  comparePeriod: DateRange;
  onToggle: (enabled: boolean) => void;
  onPeriodChange: (period: DateRange) => void;
}

// Quick Actions Bar
interface QuickActionsBarProps {
  actions: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// KPI Drill-Down
interface KPIDrillDownProps {
  kpi: KPIValue;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown?: Array<{ label: string; value: number; percentage: number }>;
  dailyTrend?: Array<{ date: Date; value: number }>;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Dashboard page | FinancialDashboard | - |
| KPI widget | KPIWidget | Card |
| KPI grid | KPIGrid | - |
| Revenue chart | RevenueChartWidget | - (Recharts) |
| AR aging chart | ARAgingWidget | - (Recharts) |
| Stacked bar | StackedBarChart | - (Recharts) |
| Top customers | TopCustomersWidget | Table |
| Outstanding invoices | OutstandingInvoicesWidget | Table |
| Period selector | PeriodSelector | Select, DatePicker |
| Comparison toggle | ComparisonToggle | Switch |
| Quick actions | QuickActionsBar | Button |
| KPI drill-down | KPIDrillDown | Dialog, Sheet |
| Loading skeleton | DashboardSkeleton | Skeleton |

---

## Files to Create/Modify

### Create
- `src/routes/_authed/financial/index.tsx` (dashboard page)
- `src/components/domain/financial/dashboard/financial-dashboard.tsx`
- `src/components/domain/financial/dashboard/kpi-widget.tsx`
- `src/components/domain/financial/dashboard/kpi-grid.tsx`
- `src/components/domain/financial/dashboard/revenue-chart-widget.tsx`
- `src/components/domain/financial/dashboard/ar-aging-widget.tsx`
- `src/components/domain/financial/dashboard/top-customers-widget.tsx`
- `src/components/domain/financial/dashboard/outstanding-invoices-widget.tsx`
- `src/components/domain/financial/dashboard/period-selector.tsx`
- `src/components/domain/financial/dashboard/quick-actions-bar.tsx`
- `src/components/domain/financial/dashboard/kpi-drill-down.tsx`
- `src/components/domain/financial/dashboard/dashboard-skeleton.tsx`

### Modify
- `src/routes/_authed/index.tsx` (add financial widgets to main dashboard)
- `src/components/shared/sidebar/nav-items.tsx` (ensure Financial nav item exists)
