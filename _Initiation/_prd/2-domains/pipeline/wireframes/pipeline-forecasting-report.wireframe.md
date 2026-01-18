# Pipeline Forecasting Report Wireframe
## DOM-PIPE-006: Dedicated Forecast Report with Multiple Views

**Last Updated:** 2026-01-10
**PRD Reference:** pipeline.prd.json
**Story:** DOM-PIPE-006

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-006 | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD
- **Forecasting**: Monthly kWh targets, revenue targets in AUD
- **Win Rate Targets**: 65-70%

---

## UI Patterns (Reference Implementation)

### Summary Cards
- **Pattern**: Statistic cards with trend indicators
- **Reference**: `_reference/.reui-reference/registry/default/blocks/cards/statistic-cards/statistic-card-1.tsx`
- **Features**:
  - Value display with sparkline trends
  - Delta badges with arrow indicators (up/down)
  - Comparison to previous period ("Vs last month")
  - Action menu dropdown (Settings, Alert, Pin, Share, Remove)
  - Responsive grid layout (1-4 columns)

### Forecast Data Table
- **Pattern**: Sortable data grid with interactive rows
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Click row to drill down to opportunities
  - Sortable columns
  - Pagination support
  - Loading skeleton states
  - Empty state handling
  - Sticky header option
  - Responsive column visibility

### Chart Component
- **Pattern**: Interactive bar/line chart with drill-down
- **Reference**: Square UI chart patterns (recharts integration)
- **Features**:
  - Click bar/point to open drill-down modal
  - Legend with interactive toggle
  - Hover tooltips with detailed values
  - Export to image/PDF
  - Responsive sizing

---

## Overview

The Pipeline Forecasting Report is a dedicated analytics page providing:
- Multiple view options (Month, Quarter, Sales Rep, Customer)
- Raw and weighted value toggle
- Interactive charts with forecast vs actual comparison
- Drill-down capability to opportunity lists
- Export functionality

---

## Desktop View (Full Report)

```
+================================================================================+
| HEADER                                                                          |
+================================================================================+
|                                                                                 |
| Pipeline Forecast                                              [Export CSV v]   |
| Sales forecasting and pipeline analysis                                         |
|                                                                                 |
+=== DATE RANGE & VIEW OPTIONS ==================================================+
|                                                                                 |
| Period: [Q1 2026       v]    to    [Q2 2026       v]    [Custom Dates]         |
|                                                                                 |
| View by:  [Month] [Quarter] [Sales Rep] [Customer]                             |
|               ^                                                                 |
|               | active tab                                                      |
|                                                                                 |
| Value:   (*) Weighted    ( ) Raw                    [Refresh Data]             |
|                                                                                 |
+=================================================================================+
|                                                                                 |
| +== SUMMARY CARDS ==========================================================+ |
| |                                                                            | |
| | +----------------+ +----------------+ +----------------+ +----------------+ | |
| | | Total Pipeline | | Weighted Value | | Expected Wins  | | Win Rate       | | |
| | | $450,000       | | $198,000       | | 15 opps        | | 45%            | | |
| | | 55 opps        | | (44% of total) | | $125,000       | | [trend up]     | | |
| | +----------------+ +----------------+ +----------------+ +----------------+ | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== CHART SECTION (aria-label="Forecast chart") ============================+ |
| |                                                                            | |
| |  Pipeline Forecast by Month                                                | |
| |                                                                            | |
| |  $200K +                                                                   | |
| |        |              ████                                                 | |
| |  $150K +              ████      ▓▓▓▓                                       | |
| |        |     ████     ████      ▓▓▓▓      ░░░░                             | |
| |  $100K +     ████     ████      ▓▓▓▓      ░░░░      ░░░░                   | |
| |        |     ████     ████      ▓▓▓▓      ░░░░      ░░░░                   | |
| |   $50K +     ████     ████      ▓▓▓▓      ░░░░      ░░░░                   | |
| |        |     ████     ████      ▓▓▓▓      ░░░░      ░░░░                   | |
| |      0 +-----+--------+--------+--------+--------+--------+                | |
| |              Jan      Feb      Mar      Apr      May      Jun              | |
| |                                                                            | |
| |  Legend: ████ Actual (closed-won)  ▓▓▓▓ Committed  ░░░░ Forecast           | |
| |                                                                            | |
| |  [Click any bar to drill down to opportunities]                            | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== DATA TABLE (aria-label="Forecast data") ================================+ |
| |                                                                            | |
| | +------------------------------------------------------------------------+ | |
| | | Period    | Opps | Raw Value   | Weighted    | Actual Won  | Variance  | | |
| | +------------------------------------------------------------------------+ | |
| | | Jan 2026  | 12   | $85,000     | $42,500     | $45,200     | +$2,700   | | |
| | |           |      |             |             | [check]     | [green]   | | |
| | +------------------------------------------------------------------------+ | |
| | | Feb 2026  | 15   | $125,000    | $62,500     | $58,300     | -$4,200   | | |
| | |           |      |             |             | [check]     | [red]     | | |
| | +------------------------------------------------------------------------+ | |
| | | Mar 2026  | 8    | $95,000     | $57,000     | -           | -         | | |
| | |           |      |             |             | (in prog)   |           | | |
| | +------------------------------------------------------------------------+ | |
| | | Apr 2026  | 10   | $78,000     | $23,400     | -           | -         | | |
| | |           |      |             |             | (forecast)  |           | | |
| | +------------------------------------------------------------------------+ | |
| | | May 2026  | 7    | $45,000     | $9,000      | -           | -         | | |
| | +------------------------------------------------------------------------+ | |
| | | Jun 2026  | 3    | $22,000     | $3,300      | -           | -         | | |
| | +------------------------------------------------------------------------+ | |
| | | TOTALS    | 55   | $450,000    | $198,000    | $103,500    |           | | |
| | +------------------------------------------------------------------------+ | |
| |                                                                            | |
| | [Click any row to drill down to opportunities]                             | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
+================================================================================+
```

---

## View Options

### View by Quarter
```
+================================================================================+
| View by:  [Month] [Quarter] [Sales Rep] [Customer]                             |
|                      ^                                                          |
+=================================================================================+
|                                                                                 |
| +------------------------------------------------------------------------+     |
| | Period    | Opps | Raw Value   | Weighted    | Actual Won  | Variance  |     |
| +------------------------------------------------------------------------+     |
| | Q1 2026   | 35   | $305,000    | $162,000    | $103,500    | -$58,500  |     |
| | Q2 2026   | 20   | $145,000    | $36,000     | -           | -         |     |
| +------------------------------------------------------------------------+     |
| | TOTALS    | 55   | $450,000    | $198,000    | $103,500    |           |     |
| +------------------------------------------------------------------------+     |
|                                                                                 |
+================================================================================+
```

### View by Sales Rep
```
+================================================================================+
| View by:  [Month] [Quarter] [Sales Rep] [Customer]                             |
|                                  ^                                              |
+=================================================================================+
|                                                                                 |
| +------------------------------------------------------------------------+     |
| | Sales Rep      | Opps | Raw Value   | Weighted    | Win Rate | Target  |     |
| +------------------------------------------------------------------------+     |
| | Sarah Smith    | 18   | $180,000    | $85,000     | 52%      | $150K   |     |
| |                |      |             | ████████░░  | [above]  | 113%    |     |
| +------------------------------------------------------------------------+     |
| | John Doe       | 22   | $155,000    | $65,000     | 38%      | $150K   |     |
| |                |      |             | █████░░░░░  | [below]  | 43%     |     |
| +------------------------------------------------------------------------+     |
| | Mike Johnson   | 15   | $115,000    | $48,000     | 45%      | $100K   |     |
| |                |      |             | ██████░░░░  | [on trk] | 48%     |     |
| +------------------------------------------------------------------------+     |
| | TOTALS         | 55   | $450,000    | $198,000    | 45%      | $400K   |     |
| +------------------------------------------------------------------------+     |
|                                                                                 |
+================================================================================+
  Progress bars show weighted vs target
  Win rate badges: above (green), on track (yellow), below (red)
```

### View by Customer
```
+================================================================================+
| View by:  [Month] [Quarter] [Sales Rep] [Customer]                             |
|                                             ^                                   |
+=================================================================================+
|                                                                                 |
| +------------------------------------------------------------------------+     |
| | Customer       | Opps | Raw Value   | Weighted    | Status    | Trend  |     |
| +------------------------------------------------------------------------+     |
| | Acme Corp      | 3    | $45,000     | $22,500     | Active    | [up]   |     |
| | Tech Inc       | 2    | $38,000     | $19,000     | Active    | [flat] |     |
| | Enterprise Co  | 4    | $62,000     | $37,200     | Active    | [up]   |     |
| | StartupX       | 1    | $15,000     | $4,500      | New       | [new]  |     |
| | ...            |      |             |             |           |        |     |
| +------------------------------------------------------------------------+     |
| | TOTALS         | 55   | $450,000    | $198,000    |           |        |     |
| +------------------------------------------------------------------------+     |
|                                                                                 |
| [Show top 10 v]  [View all 45 customers]                                        |
|                                                                                 |
+================================================================================+
```

---

## Drill-Down Modal

### Period Drill-Down (Click on Month/Quarter)
```
+================================================================================+
| January 2026 Pipeline Detail                                              [x]  |
+================================================================================+
|                                                                                 |
| Period: January 2026                                                           |
| Total: $85,000 raw / $42,500 weighted                                          |
| Actual Won: $45,200                                                            |
|                                                                                 |
| +--------------------------------------------------------------------------+   |
| | Opportunity     | Customer    | Value     | Prob  | Exp Close | Status   |   |
| +--------------------------------------------------------------------------+   |
| | Website Redesign| Acme Corp   | $15,000   | 80%   | Jan 15    | [Won]    |   |
| | SEO Package     | Tech Inc    | $8,000    | 60%   | Jan 20    | [Won]    |   |
| | App Development | StartupX    | $25,000   | 30%   | Jan 28    | [Active] |   |
| | Marketing Suite | Corp Co     | $12,000   | 45%   | Jan 30    | [Active] |   |
| | ...             |             |           |       |           |          |   |
| +--------------------------------------------------------------------------+   |
|                                                                                 |
| Showing 12 opportunities                                                        |
|                                                                                 |
| [Click opportunity to open panel]                     [Export] [Close]          |
+================================================================================+
```

### Sales Rep Drill-Down
```
+================================================================================+
| Sarah Smith - Pipeline Detail                                             [x]  |
+================================================================================+
|                                                                                 |
| Sales Rep: Sarah Smith                                                         |
| Total: $180,000 raw / $85,000 weighted                                         |
| Win Rate: 52% (above team average)                                             |
| Target: $150,000 (113% achieved)                                               |
|                                                                                 |
| +--------------------------------------------------------------------------+   |
| | Opportunity     | Customer    | Value     | Prob  | Stage     | Close    |   |
| +--------------------------------------------------------------------------+   |
| | Enterprise Deal | BigCorp     | $50,000   | 75%   | Pending   | Feb 15   |   |
| | Consulting      | MidCo       | $25,000   | 60%   | Quoted    | Feb 28   |   |
| | Renewal         | OldClient   | $18,000   | 90%   | Ordered   | Jan 30   |   |
| | ...             |             |           |       |           |          |   |
| +--------------------------------------------------------------------------+   |
|                                                                                 |
|                                               [Export] [View Profile] [Close]   |
+================================================================================+
```

---

## Chart Variations

### Bar Chart (Default - Monthly)
```
  Pipeline Forecast by Month (Weighted Values)

  $200K +
        |              ████
  $150K +              ████      ▓▓▓▓
        |     ████     ████      ▓▓▓▓      ░░░░
  $100K +     ████     ████      ▓▓▓▓      ░░░░      ░░░░
        |     ████     ████      ▓▓▓▓      ░░░░      ░░░░
   $50K +     ████     ████      ▓▓▓▓      ░░░░      ░░░░
        |     ████     ████      ▓▓▓▓      ░░░░      ░░░░
      0 +-----+--------+--------+--------+--------+--------+
             Jan      Feb      Mar      Apr      May      Jun

  ████ Actual (closed)  ▓▓▓▓ Committed (>75%)  ░░░░ Forecast

  Click bar to drill down
```

### Line Chart (Forecast vs Actual Trend)
```
  Forecast Accuracy Trend

  $200K +
        |            .--*---.     Actual
  $150K +     .--*--'        '---*
        |   .'                    Forecast (weighted)
  $100K +--*                      ----*----
        |
   $50K +
        |
      0 +-----+--------+--------+--------+--------+--------+
             Jan      Feb      Mar      Apr      May      Jun

  --- Forecast (at time)  ___ Actual Result  * Data point
```

### Stacked Bar (By Stage)
```
  Pipeline by Stage per Month

  $200K +
        |              ████ Won
  $150K +              ▓▓▓▓ Ordered
        |     ████     ░░░░ Pending
  $100K +     ▓▓▓▓     ░░░░ Quoted
        |     ░░░░     ░░░░ New
   $50K +     ░░░░     ░░░░
        |     ░░░░     ░░░░
      0 +-----+--------+--------+
             Jan      Feb      Mar
```

---

## Tablet View

```
+============================================+
| Pipeline Forecast             [Export v]   |
+============================================+
|                                            |
| Period: [Q1-Q2 2026   v]                   |
| View: [Month v]  Value: (*) Weighted       |
|                                            |
+============================================+
|                                            |
| +----------+ +----------+ +----------+     |
| | Pipeline | | Weighted | | Win Rate |     |
| | $450K    | | $198K    | | 45%      |     |
| +----------+ +----------+ +----------+     |
|                                            |
+============================================+
|                                            |
| [Chart - collapsible]            [+] [-]   |
| +----------------------------------------+ |
| | $200K                                  | |
| | $150K    ██                            | |
| | $100K ██ ██ ▓▓ ░░ ░░                   | |
| |  $50K ██ ██ ▓▓ ░░ ░░                   | |
| |    0  J  F  M  A  M                    | |
| +----------------------------------------+ |
|                                            |
+============================================+
|                                            |
| +---------------------------------------+  |
| | Period  | Value    | Weighted | Won   |  |
| +---------+----------+----------+-------+  |
| | Jan '26 | $85,000  | $42,500  |$45.2K |  |
| | Feb '26 | $125,000 | $62,500  |$58.3K |  |
| | Mar '26 | $95,000  | $57,000  | -     |  |
| | Apr '26 | $78,000  | $23,400  | -     |  |
| +---------------------------------------+  |
|                                            |
| [Tap row to drill down]                    |
|                                            |
+============================================+
```

---

## Mobile View

```
+==============================+
| Pipeline Forecast       [=]  |
+==============================+
|                              |
| [Q1-Q2 2026          v]      |
|                              |
| [Month][Qtr][Rep][Cust]      |
|   ^                          |
+==============================+
|                              |
| SUMMARY                      |
|                              |
| Pipeline      Weighted       |
| $450,000      $198,000       |
|                              |
| Win Rate      Expected       |
| 45%           15 opps        |
|                              |
+==============================+
|                              |
| CHART                   [-]  |
| +-------------------------+  |
| |$100K                    |  |
| | $50K ██ ██ ▓▓ ░░        |  |
| |   0  J  F  M  A         |  |
| +-------------------------+  |
|                              |
+==============================+
|                              |
| DATA                         |
|                              |
| +-------------------------+  |
| | January 2026            |  |
| | Raw: $85K  Wgt: $42.5K  |  |
| | Won: $45.2K [+2.7K]     |  |
| +-------------------------+  |
|                              |
| +-------------------------+  |
| | February 2026           |  |
| | Raw: $125K Wgt: $62.5K  |  |
| | Won: $58.3K [-4.2K]     |  |
| +-------------------------+  |
|                              |
| +-------------------------+  |
| | March 2026              |  |
| | Raw: $95K  Wgt: $57K    |  |
| | In Progress             |  |
| +-------------------------+  |
|                              |
| [Load More...]               |
|                              |
+==============================+
| [Export]                     |
+==============================+
```

### Mobile Drill-Down (Full Screen)
```
+==============================+
| <- January 2026              |
+==============================+
|                              |
| Total: $85,000               |
| Weighted: $42,500            |
| Won: $45,200 (+$2,700)       |
|                              |
+==============================+
|                              |
| +---------------------------+|
| | Website Redesign          ||
| | Acme Corp                 ||
| | $15,000  80%  [Won]       ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | SEO Package               ||
| | Tech Inc                  ||
| | $8,000   60%  [Won]       ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | App Development           ||
| | StartupX                  ||
| | $25,000  30%  [Active]    ||
| +---------------------------+|
|                              |
| 12 opportunities             |
|                              |
| [Export]                     |
+==============================+
```

---

## Loading States

### Initial Report Load
```
+================================================================================+
| Pipeline Forecast                                              [shimmer===]    |
+================================================================================+
|                                                                                 |
| +----------------+ +----------------+ +----------------+ +----------------+     |
| | [shimmer=====] | | [shimmer=====] | | [shimmer=====] | | [shimmer=====] |     |
| | [shimmer]      | | [shimmer]      | | [shimmer]      | | [shimmer]      |     |
| +----------------+ +----------------+ +----------------+ +----------------+     |
|                                                                                 |
| +--------------------------------------------------------------------------+   |
| |                                                                          |   |
| | [shimmer chart placeholder]                                              |   |
| |                                                                          |   |
| | [shimmer===============================================]                 |   |
| | [shimmer=================================]                               |   |
| | [shimmer=====================]                                           |   |
| |                                                                          |   |
| +--------------------------------------------------------------------------+   |
|                                                                                 |
| +--------------------------------------------------------------------------+   |
| | [shimmer] | [shimmer=====] | [shimmer====] | [shimmer===] | [shimmer==] |   |
| | [shimmer] | [shimmer=====] | [shimmer====] | [shimmer===] | [shimmer==] |   |
| | [shimmer] | [shimmer=====] | [shimmer====] | [shimmer===] | [shimmer==] |   |
| +--------------------------------------------------------------------------+   |
+================================================================================+
```

### Drill-Down Loading
```
+================================================================================+
| January 2026 Pipeline Detail                                              [x]  |
+================================================================================+
|                                                                                 |
|                          [spinner]                                              |
|                                                                                 |
|                Loading opportunities...                                         |
|                                                                                 |
+================================================================================+
```

### Export Processing
```
+================================================+
| Exporting Report...                            |
+================================================+
|                                                |
|              [spinner]                         |
|                                                |
|    Preparing your export...                    |
|                                                |
|    [================================] 60%      |
|                                                |
|    - Gathering data                   [check]  |
|    - Calculating totals               [check]  |
|    - Generating file                  [spin]   |
|                                                |
+================================================+
```

---

## Empty States

### No Pipeline Data
```
+================================================================================+
|                                                                                 |
|                         [illustration]                                          |
|                                                                                 |
|                   No forecast data available                                    |
|                                                                                 |
|    There are no opportunities in your pipeline for                              |
|    the selected date range.                                                     |
|                                                                                 |
|    Try:                                                                         |
|    - Expanding the date range                                                   |
|    - Creating new opportunities                                                 |
|                                                                                 |
|    [Expand Date Range] [Create Opportunity]                                     |
|                                                                                 |
+================================================================================+
```

### No Results for View
```
+================================================================================+
| View by: [Sales Rep]                                                           |
+================================================================================+
|                                                                                 |
|                   No data for this view                                         |
|                                                                                 |
|    No opportunities are assigned to sales reps                                  |
|    in the selected period.                                                      |
|                                                                                 |
|    [Assign Opportunities] [View All Pipeline]                                   |
|                                                                                 |
+================================================================================+
```

---

## Error States

### Report Load Failed
```
+================================================================================+
| [!] Unable to load forecast report                                              |
+================================================================================+
|                                                                                 |
|    There was a problem loading your pipeline forecast.                          |
|                                                                                 |
|    This could be due to:                                                        |
|    - Network connectivity issues                                                |
|    - Server temporarily unavailable                                             |
|                                                                                 |
|    [Retry] [Go to Pipeline Board]                                               |
|                                                                                 |
+================================================================================+
  role="alert"
```

### Export Failed
```
+================================================+
| [!] Export Failed                         [x]  |
+================================================+
|                                                |
| Could not generate the CSV export.             |
|                                                |
| Please try again. If the problem persists,     |
| contact support.                               |
|                                                |
|                      [Dismiss] [Try Again]     |
+================================================+
```

---

## Accessibility Specification

### Chart ARIA
```html
<figure role="figure"
        aria-label="Pipeline forecast chart showing monthly values from January to June 2026">
  <figcaption id="chart-title">Pipeline Forecast by Month</figcaption>

  <!-- Chart image/canvas -->
  <div role="img"
       aria-describedby="chart-description">
    <!-- Visual chart -->
  </div>

  <p id="chart-description" class="sr-only">
    Bar chart showing pipeline values. January: $42,500 actual won.
    February: $58,300 actual won. March: $57,000 in progress.
    April to June: forecasted values decreasing from $23,400 to $3,300.
  </p>

  <!-- Legend -->
  <ul role="list" aria-label="Chart legend">
    <li>Blue bars: Actual closed won</li>
    <li>Gray bars: Committed opportunities</li>
    <li>Light bars: Forecast</li>
  </ul>
</figure>
```

### Data Table ARIA
```html
<table role="table" aria-label="Pipeline forecast data by month">
  <thead>
    <tr>
      <th scope="col">Period</th>
      <th scope="col">Opportunities</th>
      <th scope="col">Raw Value</th>
      <th scope="col">Weighted Value</th>
      <th scope="col">Actual Won</th>
      <th scope="col">Variance</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="January 2026, 12 opportunities, $85,000 raw, $42,500 weighted, $45,200 actual, positive $2,700 variance">
      <!-- Row content -->
    </tr>
  </tbody>
</table>
```

### Keyboard Navigation
```
Tab Order:
1. Period start selector
2. Period end selector
3. Custom dates button
4. View toggle buttons (Month/Quarter/Rep/Customer)
5. Value toggle (Weighted/Raw)
6. Refresh button
7. Summary cards (read-only)
8. Chart region (interactive)
9. Table headers (sortable)
10. Table rows (clickable for drill-down)
11. Export button

Chart Interaction:
- Tab to chart region
- Arrow keys to navigate between bars
- Enter to drill down on focused bar
- Data values announced on focus

Table Interaction:
- Tab to table
- Arrow Up/Down to navigate rows
- Enter to drill down on focused row
- Escape to close drill-down
```

### Screen Reader Announcements
```
On view change:
  "Showing pipeline forecast by Sales Rep. 3 reps with active opportunities."

On period change:
  "Date range updated to Q1 2026 through Q2 2026.
   55 opportunities totaling $450,000."

On value toggle:
  "Showing weighted values. Total weighted pipeline: $198,000."

On drill-down open:
  "January 2026 detail view opened. 12 opportunities, $45,200 won."

On chart focus:
  "February 2026 bar. $62,500 weighted value. $58,300 actual won.
   Variance: negative $4,200. Press Enter to view details."
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial report load | < 2s | With up to 500 opportunities |
| View change | < 500ms | Switch between Month/Quarter/Rep |
| Chart render | < 300ms | After data load |
| Drill-down open | < 500ms | Load opportunity list |
| Export generation | < 5s | Up to 500 rows |

---

## Related Wireframes

- [Pipeline Kanban Board](./pipeline-kanban-board.wireframe.md)
- [Forecasting Fields UI](./pipeline-forecasting-fields.wireframe.md)
- [Win/Loss Reasons](./pipeline-win-loss-reasons.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
