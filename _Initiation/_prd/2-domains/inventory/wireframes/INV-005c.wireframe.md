# Wireframe: DOM-INV-005c - Inventory Valuation: UI

## Story Reference

- **Story ID**: DOM-INV-005c
- **Name**: Inventory Valuation: UI
- **PRD**: memory-bank/prd/domains/inventory.prd.json
- **Type**: UI Component
- **Component Types**: Valuation Report, Cost Layers View, Dashboard Widget
- **Primary Users**: Finance, Operations Manager, Business Owner

## Overview

FIFO valuation report showing cost layers per product, total inventory value on dashboard using FIFO calculation, and average cost visibility on inventory items.

## UI Patterns (Reference Implementation)

### Card with Metrics
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Valuation summary cards (total value, value change, COGS)
  - Large number display with trend indicators
  - Percentage change badges (green up, red down)

### Data Table with Sortable Columns
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Product valuation table with qty, avg cost, total value
  - Sortable by value columns
  - View layers action column

### Dialog with Nested Table
- **Pattern**: RE-UI Dialog + Table
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx` & `table.tsx`
- **Features**:
  - Cost layers modal showing FIFO stack
  - Layer table (received date, PO, quantity, unit cost)
  - Summary metrics and COGS calculator

### Chart Widget
- **Pattern**: Custom chart using RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Value trend line chart (6 months)
  - Area fill with gradient
  - Hover tooltips for data points

### Input with Calculator
- **Pattern**: RE-UI Input + Label
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx` & `label.tsx`
- **Features**:
  - COGS calculator with quantity input
  - Real-time calculation output
  - Layer breakdown display

---

## Mobile Wireframe (375px)

### Inventory Valuation Report - Mobile

```
+=========================================+
| < Reports                        [...]  |
+-----------------------------------------+
| Inventory Valuation                     |
+-----------------------------------------+
|                                         |
|  AS OF: January 10, 2026                |
|  [Change Date v]                        |
|                                         |
|  +-------------------------------------+|
|  | TOTAL INVENTORY VALUE              ||
|  | ===================================||
|  |                                     ||
|  |     $142,850.00                     ||
|  |     +2.3% vs last month             ||
|  |                                     ||
|  | 1,247 items across 156 products     ||
|  +-------------------------------------+|
|                                         |
|  VALUATION METHOD: FIFO                 |
|                                         |
|  [By Product] [By Category] [By Layer]  |
|  ============                           |
|                                         |
|  [Search products_______________]       |
|                                         |
|  +-------------------------------------+|
|  | 10kWh LFP Battery                      ||
|  | SKU: BAT-LFP-10KWH                         ||
|  | ----------------------------------- ||
|  |                                     ||
|  | Qty: 53   |   Avg Cost: $118.40     ||
|  | Total Value: $6,275.20              ||
|  |                                     ||
|  | [View Cost Layers]                  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 400W Solar Panel                    ||
|  | SKU: SOL-RES-400W                         ||
|  | ----------------------------------- ||
|  |                                     ||
|  | Qty: 62   |   Avg Cost: $285.00     ||
|  | Total Value: $17,670.00             ||
|  |                                     ||
|  | [View Cost Layers]                  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 5kW Hybrid Inverter                        ||
|  | SKU: INV-HYB-5KW                         ||
|  | ----------------------------------- ||
|  |                                     ||
|  | Qty: 27   |   Avg Cost: $498.50     ||
|  | Total Value: $13,459.50             ||
|  |                                     ||
|  | [View Cost Layers]                  ||
|  +-------------------------------------+|
|                                         |
|  [Export Report]                        |
|                                         |
+-----------------------------------------+
```

### Cost Layers Detail - Bottom Sheet

```
+=========================================+
| =====================================   |
|                                         |
|  COST LAYERS                     [X]    |
|  -------------------------------------- |
|                                         |
|  10kWh LFP Battery (BAT-LFP-10KWH)                |
|  Total: 53 units @ $6,275.20            |
|  Avg Cost: $118.40/unit                 |
|                                         |
|  FIFO LAYERS (oldest first)             |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | LAYER 1 (Oldest)                    ||
|  | Received: Dec 15, 2025              ||
|  | PO: PO-2025-0234                    ||
|  | ----------------------------------- ||
|  | Original: 50 units @ $115.00        ||
|  | Remaining: 18 units                 ||
|  | Layer Value: $2,070.00              ||
|  | Age: 26 days                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | LAYER 2                             ||
|  | Received: Jan 5, 2026               ||
|  | PO: PO-2026-0012                    ||
|  | ----------------------------------- ||
|  | Original: 25 units @ $118.00        ||
|  | Remaining: 25 units                 ||
|  | Layer Value: $2,950.00              ||
|  | Age: 5 days                         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | LAYER 3 (Newest)                    ||
|  | Received: Jan 8, 2026               ||
|  | PO: PO-2026-0028                    ||
|  | ----------------------------------- ||
|  | Original: 15 units @ $122.00        ||
|  | Remaining: 10 units                 ||
|  | Layer Value: $1,255.20              ||
|  | Age: 2 days                         ||
|  +-------------------------------------+|
|                                         |
|  SUMMARY                                |
|  -----------------------------------    |
|  Total Layers: 3                        |
|  Oldest Layer: 26 days                  |
|  Newest Layer: 2 days                   |
|  Cost Range: $115.00 - $122.00          |
|                                         |
|  [Close]                                |
|                                         |
+=========================================+
```

### Dashboard - Inventory Value Widget

```
+=========================================+
| Dashboard                        [...]  |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | INVENTORY VALUE                     ||
|  | ===================================||
|  |                                     ||
|  |     $142,850.00                     ||
|  |     ↑ +$3,250 (+2.3%)               ||
|  |                                     ||
|  |  Method: FIFO                       ||
|  |  Items: 1,247                       ||
|  |  Products: 156                      ||
|  |                                     ||
|  | +-------------------------------+   ||
|  | |   $$$$$$$$$$$$$$$$$$$         |   || <- Bar chart
|  | | Dec   Jan   Feb   Mar   Apr   |   ||
|  | +-------------------------------+   ||
|  |                                     ||
|  | [View Full Report]                  ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Inventory Valuation Report

```
+=======================================================================+
| Reports > Inventory Valuation                               [Export]  |
+-----------------------------------------------------------------------+
|                                                                       |
|  +------------------------+  +------------------------+               |
|  | TOTAL VALUE            |  | VALUE CHANGE           |               |
|  | $142,850.00            |  | +$3,250 (+2.3%)        |               |
|  | 1,247 items            |  | vs last month          |               |
|  +------------------------+  +------------------------+               |
|                                                                       |
|  As of: [Jan 10, 2026 v]    Method: FIFO                              |
|                                                                       |
|  [By Product] [By Category] [By Location] [Cost Layer History]        |
|  ============                                                         |
|                                                                       |
|  [Search_____________________] [Category v] [Sort: Value v]           |
|                                                                       |
|  +-------------------------------------------------------------------+|
|  | Product         | SKU    | Qty | Avg Cost | Total Value | Layers  ||
|  +-------------------------------------------------------------------+|
|  | Battery 10kWh   | BP-10K | 38  | $995.00  | $37,810.00  | [View]  ||
|  | Solar Panel 400 | SOL-RES-400W | 62  | $285.00  | $17,670.00  | [View]  ||
|  | 5kW Hybrid Inverter    | INV-HYB-5KW | 27  | $498.50  | $13,459.50  | [View]  ||
|  | 10kWh LFP Battery  | BAT-LFP-10KWH | 53  | $118.40  | $6,275.20   | [View]  ||
|  | Mounting Rails  | MR-STD | 145 | $15.00   | $2,175.00   | [View]  ||
|  +-------------------------------------------------------------------+|
|                                                                       |
+=======================================================================+
```

### Cost Layers Modal

```
+=======================================================================+
| Cost Layers - 10kWh LFP Battery (BAT-LFP-10KWH)                            [X]  |
+=======================================================================+
|                                                                       |
|  SUMMARY                                                              |
|  +------------------------+  +------------------------+               |
|  | Total Quantity         |  | Total Value            |               |
|  | 53 units               |  | $6,275.20              |               |
|  +------------------------+  +------------------------+               |
|                                                                       |
|  Average Cost: $118.40/unit   |   Cost Range: $115.00 - $122.00       |
|                                                                       |
|  FIFO COST LAYERS                                                     |
|  +-------------------------------------------------------------------+|
|  | #  | Received   | PO          | Orig | Remain | Unit $ | Value    ||
|  +-------------------------------------------------------------------+|
|  | 1  | Dec 15 '25 | PO-2025-0234| 50   | 18     | $115.00| $2,070.00||
|  | 2  | Jan 5 '26  | PO-2026-0012| 25   | 25     | $118.00| $2,950.00||
|  | 3  | Jan 8 '26  | PO-2026-0028| 15   | 10     | $122.00| $1,255.20||
|  +-------------------------------------------------------------------+|
|                                                                       |
|  DEPLETION PREVIEW                                                    |
|  If you sell 30 units, FIFO cost of goods sold: $3,490.00             |
|  (18 @ $115 + 12 @ $118)                                              |
|                                                                       |
|                                                           [Close]     |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Inventory Valuation Report - Full

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Reports > Inventory Valuation                                                         |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  +-- VALUATION SUMMARY ------------------------------------------------------------------+
| Inventory   |  |                                                                                     |
| Reports <   |  |  +---------------------+  +---------------------+  +---------------------+          |
|   Valuation |  |  | TOTAL VALUE         |  | VALUE CHANGE        |  | COGS (This Month)   |          |
|   ========= |  |  | $142,850.00         |  | +$3,250 (+2.3%)     |  | $28,450.00          |          |
|   Aging     |  |  | 1,247 items         |  | vs December 2025    |  | Based on FIFO       |          |
|   Reserved  |  |  +---------------------+  +---------------------+  +---------------------+          |
| Jobs        |  |                                                                                     |
| Pipeline    |  |  As of: [Jan 10, 2026 v]     Valuation Method: FIFO                                |
|             |  |                                                                                     |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  [By Product] [By Category] [By Location] [Cost Layer History] [Value Trend]  [Export] |
|             |  ============                                                                          |
|             |                                                                                        |
|             |  [Search___________________] [Category v] [Location v] [Sort: Value v]                 |
|             |                                                                                        |
|             |  +------------------------------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | Product         | SKU       | Qty  | Avg Cost  | Total Value  | Layers | Actions  ||
|             |  | ------------------------------------------------------------------------------------||
|             |  | Battery 10kWh   | BP-10K    | 38   | $995.00   | $37,810.00   | 2      | [View]   ||
|             |  | Solar Panel 400 | SOL-RES-400W    | 62   | $285.00   | $17,670.00   | 3      | [View]   ||
|             |  | 5kW Hybrid Inverter    | INV-HYB-5KW    | 27   | $498.50   | $13,459.50   | 2      | [View]   ||
|             |  | 10kWh LFP Battery  | BAT-LFP-10KWH    | 53   | $118.40   | $6,275.20    | 3      | [View]   ||
|             |  | Cable Kit Pro   | CK-PRO    | 89   | $35.00    | $3,115.00    | 4      | [View]   ||
|             |  | Mounting Rails  | MR-STD    | 145  | $15.00    | $2,175.00    | 2      | [View]   ||
|             |  | Bracket Set     | BS-100    | 234  | $10.00    | $2,340.00    | 1      | [View]   ||
|             |  | Connector Kit   | CN-KIT    | 56   | $22.50    | $1,260.00    | 2      | [View]   ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  Showing 1-8 of 156 products                                  < 1 [2] 3 ... 20 >       |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Cost Layers Modal - Desktop

```
+======================================================================================================+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  | COST LAYERS - 10kWh LFP Battery (BAT-LFP-10KWH)                                                     [X] |  |
|  +================================================================================================+  |
|  |                                                                                                |  |
|  |  +-- SUMMARY --------------------------------------------------+  +-- COST ANALYSIS --------+ |  |
|  |  |                                                             |  |                         | |  |
|  |  |  Total Quantity: 53 units                                   |  |  Weighted Avg: $118.40  | |  |
|  |  |  Total Value: $6,275.20                                     |  |  Lowest Cost: $115.00   | |  |
|  |  |                                                             |  |  Highest Cost: $122.00  | |  |
|  |  |  Active Layers: 3                                           |  |  Cost Variance: 6.1%    | |  |
|  |  |  Oldest Layer: 26 days                                      |  |                         | |  |
|  |  |                                                             |  +-------------------------+ |  |
|  |  +--------------------------------------------------------------+                             |  |
|  |                                                                                                |  |
|  |  FIFO COST LAYERS (Depleted from Oldest First)                                                 |  |
|  |  +--------------------------------------------------------------------------------------------+|  |
|  |  |                                                                                            ||  |
|  |  | Layer | Received     | PO            | Original | Remaining | Unit Cost | Layer Value    ||  |
|  |  | --------------------------------------------------------------------------------------------||  |
|  |  | 1     | Dec 15, 2025 | PO-2025-0234  | 50       | 18        | $115.00   | $2,070.00      ||  |
|  |  |       | Supplier: BYD Australia      | Age: 26 days      | Next to deplete              ||  |
|  |  | --------------------------------------------------------------------------------------------||  |
|  |  | 2     | Jan 5, 2026  | PO-2026-0012  | 25       | 25        | $118.00   | $2,950.00      ||  |
|  |  |       | Supplier: BYD Australia      | Age: 5 days                                       ||  |
|  |  | --------------------------------------------------------------------------------------------||  |
|  |  | 3     | Jan 8, 2026  | PO-2026-0028  | 15       | 10        | $122.00   | $1,255.20      ||  |
|  |  |       | Supplier: Growatt Pacific     | Age: 2 days       | Newest                       ||  |
|  |  |                                                                                            ||  |
|  |  +--------------------------------------------------------------------------------------------+|  |
|  |                                                                                                |  |
|  |  +-- COGS CALCULATOR -------------------------------------------+  +-- LAYER HISTORY -------+ |  |
|  |  |                                                              |  |                        | |  |
|  |  |  Calculate COGS for a sale:                                  |  |  Last 30 Days:         | |  |
|  |  |                                                              |  |  - Received: 40 units  | |  |
|  |  |  Quantity to sell: [30        ]                              |  |  - Depleted: 32 units  | |  |
|  |  |                                                              |  |  - COGS: $3,760.00     | |  |
|  |  |  FIFO Cost of Goods Sold:                                    |  |                        | |  |
|  |  |  18 units @ $115.00 = $2,070.00                              |  |  Trend: Costs rising   | |  |
|  |  |  12 units @ $118.00 = $1,416.00                              |  |  +3.5% vs last month   | |  |
|  |  |  ----------------------------                                |  |                        | |  |
|  |  |  Total COGS: $3,486.00                                       |  +------------------------+ |  |
|  |  |  Avg Cost: $116.20/unit                                      |                             |  |
|  |  |                                                              |                             |  |
|  |  +---------------------------------------------------------------+                             |  |
|  |                                                                                                |  |
|  +------------------------------------------------------------------------------------------------+  |
|  |                                                                                                |  |
|  |                                              [Export Layers]   [View Purchase History]  [Close]|  |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

### Dashboard - Enhanced Inventory Value Widget

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard < |  Dashboard                                                         [Date Range v]       |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  +-- INVENTORY VALUATION WIDGET --------------------------------------------------------+
| Inventory   |  |                                                                                     |
| Jobs        |  |  +---------------------+  +---------------------+  +---------------------+          |
| Pipeline    |  |  | TOTAL VALUE         |  | COGS (MTD)          |  | GROSS MARGIN        |          |
|             |  |  | $142,850            |  | $28,450             |  | 32.5%               |          |
|             |  |  | ↑ +2.3%             |  | 156 items sold      |  | ↓ -1.2%             |          |
|             |  |  +---------------------+  +---------------------+  +---------------------+          |
|             |  |                                                                                     |
|             |  |  Valuation: FIFO  |  1,247 items  |  156 products  |  45 cost layers               |
|             |  |                                                                                     |
|             |  |  VALUE TREND (6 Months)                                                             |
|             |  |  +---------------------------------------------------------------------------+      |
|             |  |  | $150k |                                              *                   |      |
|             |  |  | $140k |                                    *    *                        |      |
|             |  |  | $130k |                         *    *                                   |      |
|             |  |  | $120k |              *    *                                              |      |
|             |  |  | $110k |    *    *                                                        |      |
|             |  |  |       +---+----+----+----+----+----+----+----+----+----+----+----+       |      |
|             |  |  |        Jul  Aug  Sep  Oct  Nov  Dec  Jan                                 |      |
|             |  |  +---------------------------------------------------------------------------+      |
|             |  |                                                                                     |
|             |  |  [View Full Valuation Report]  [View Cost Layers]  [Export]                        |
|             |  |                                                                                     |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### By Category View

```
+======================================================================================================+
|                                                                                                      |
| [By Product] [By Category] [By Location] [Cost Layer History] [Value Trend]                [Export] |
|              ============                                                                            |
|                                                                                                      |
| +------------------------------------------------------------------------------------------------+   |
| |                                                                                                |   |
| | VALUATION BY CATEGORY                                                                          |   |
| |                                                                                                |   |
| | +--------------------------------------------------------------------------------------------+ |   |
| | |                                                                                            | |   |
| | | Category              | Products | Items | Avg Cost | Total Value | % of Total | Chart   | |   |
| | | ---------------------------------------------------------------------------------------   | |   |
| | | Electronics           | 45       | 423   | $245.00  | $68,450.00  | 47.9%      | ####    | |   |
| | |   Batteries           | 8        | 156   | $850.00  | $42,500.00  | 29.8%      | ###     | |   |
| | |   Inverters           | 12       | 89    | $425.00  | $18,750.00  | 13.1%      | ##      | |   |
| | |   Widgets             | 25       | 178   | $95.00   | $7,200.00   | 5.0%       | #       | |   |
| | | Solar Equipment       | 35       | 312   | $185.00  | $38,400.00  | 26.9%      | ###     | |   |
| | |   Panels              | 15       | 186   | $275.00  | $28,500.00  | 20.0%      | ##      | |   |
| | |   Mounting            | 20       | 126   | $35.00   | $9,900.00   | 6.9%       | #       | |   |
| | | Cables & Accessories  | 76       | 512   | $28.00   | $36,000.00  | 25.2%      | ##      | |   |
| | |                                                                                            | |   |
| | +--------------------------------------------------------------------------------------------+ |   |
| |                                                                                                |   |
| +------------------------------------------------------------------------------------------------+   |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
VALUATION REPORT LOADING:
+------------------------------------------------------------------------------------+
| TOTAL VALUE            | VALUE CHANGE           | COGS (This Month)                |
+------------------------------------------------------------------------------------+
| [...................] | [...................] | [....................] |
+------------------------------------------------------------------------------------+

Product         | SKU    | Qty | Avg Cost | Total Value | Layers
+------------------------------------------------------------------------------------+
[.............] | [.....] | [..] | [.......] | [.........] | [....] |
[.............] | [.....] | [..] | [.......] | [.........] | [....] |
[.............] | [.....] | [..] | [.......] | [.........] | [....] |
+------------------------------------------------------------------------------------+
↑ Skeleton with shimmer

COST LAYERS LOADING:
+----------------------------------------+
|                                        |
|   Loading cost layers...               |
|   +--------------------------------+   |
|   | [==================          ] |   |
|   +--------------------------------+   |
|                                        |
|   Calculating FIFO values...           |
|                                        |
+----------------------------------------+

COGS CALCULATION:
+----------------------------------------+
|                                        |
|   Calculating COGS...                  |
|   +--------------------------------+   |
|   | [============             ]    |   |
|   +--------------------------------+   |
|                                        |
+----------------------------------------+
```

### Empty States

```
NO INVENTORY TO VALUE:
+----------------------------------------+
|                                        |
|           +-------------+              |
|           |  [$0.00]    |              |
|           +-------------+              |
|                                        |
|    No Inventory to Value               |
|                                        |
|    Add inventory items to see          |
|    valuation data.                     |
|                                        |
|    [Add Inventory]                     |
|                                        |
+----------------------------------------+

NO COST LAYERS:
+----------------------------------------+
|                                        |
|           +-------------+              |
|           |  [layers]   |              |
|           +-------------+              |
|                                        |
|    No Cost Layers                      |
|                                        |
|    This product has no recorded        |
|    cost layers. Cost data is           |
|    created when goods are received.    |
|                                        |
|    [View Purchase History]             |
|                                        |
+----------------------------------------+

NO DATA FOR DATE RANGE:
+----------------------------------------+
|                                        |
|    No valuation data for               |
|    December 15, 2025                   |
|                                        |
|    Historical snapshots are only       |
|    available from January 1, 2026.     |
|                                        |
|    [Use Earliest Available Date]       |
|                                        |
+----------------------------------------+
```

### Error States

```
CALCULATION ERROR:
+----------------------------------------+
| [!] Valuation Calculation Error        |
|                                        |
| Could not calculate inventory value.   |
|                                        |
| Some cost layers may have              |
| inconsistent data.                     |
|                                        |
| [View Problem Items]  [Retry]          |
+----------------------------------------+

EXPORT FAILED:
+----------------------------------------+
| [!] Export Failed                      |
|                                        |
| Could not generate valuation report.   |
|                                        |
| Try again or contact support if        |
| the problem persists.                  |
|                                        |
| [Try Again]  [Cancel]                  |
+----------------------------------------+

COST LAYER MISMATCH:
+----------------------------------------+
| [!] Cost Layer Warning                 |
|                                        |
| 10kWh LFP Battery has quantity mismatch:  |
| On Hand: 53 units                      |
| Sum of Layers: 51 units                |
|                                        |
| This may indicate missing cost data.   |
|                                        |
| [Investigate]  [Dismiss]               |
+----------------------------------------+
```

### Success States

```
REPORT GENERATED:
+----------------------------------------+
| [ok] Report Generated                  |
|                                        |
| Inventory Valuation Report             |
| As of January 10, 2026                 |
|                                        |
| Total Value: $142,850.00               |
| Products: 156                          |
| Items: 1,247                           |
|                                        |
| [Download PDF]  [Done]                 |
+----------------------------------------+

EXPORT COMPLETE:
+----------------------------------------+
| [ok] Export Complete                   |
|                                        |
| Valuation report exported to:          |
| inventory-valuation-2026-01-10.csv     |
|                                        |
| [Open File]  [Done]                    |
+----------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Valuation Report**
   - Tab to date selector
   - Tab to view tabs (By Product, By Category, etc.)
   - Tab to search
   - Tab to filters
   - Tab through table headers (sortable)
   - Tab through row actions
   - Tab to export button
   - Tab to pagination

2. **Cost Layers Modal**
   - Focus trapped in dialog
   - Tab through summary cards
   - Tab through layer table rows
   - Tab to COGS calculator input
   - Tab to action buttons
   - Escape closes

3. **Dashboard Widget**
   - Tab to value cards
   - Tab to chart (with keyboard navigation)
   - Tab to action links

### ARIA Requirements

```html
<!-- Valuation Summary -->
<div role="region" aria-labelledby="valuation-title">
  <h2 id="valuation-title">Inventory Valuation</h2>

  <div role="group" aria-label="Valuation summary">
    <div aria-label="Total inventory value: $142,850.00, up 2.3% from last month">
      <span class="value">$142,850.00</span>
      <span class="change">+2.3%</span>
    </div>
  </div>
</div>

<!-- Valuation Table -->
<table role="grid" aria-label="Inventory valuation by product">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="descending">
        <button aria-label="Sort by total value, currently descending">
          Total Value
        </button>
      </th>
    </tr>
  </thead>
</table>

<!-- Cost Layers Modal -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="layers-title"
>
  <h2 id="layers-title">Cost Layers - 10kWh LFP Battery</h2>

  <table role="table" aria-label="FIFO cost layers">
    <caption>Cost layers listed from oldest to newest</caption>
  </table>
</div>

<!-- COGS Calculator -->
<form role="form" aria-label="Cost of goods sold calculator">
  <label for="qty-sell">Quantity to sell</label>
  <input id="qty-sell" type="number" aria-describedby="cogs-result" />
  <output id="cogs-result" aria-live="polite">
    FIFO Cost: $3,486.00
  </output>
</form>

<!-- Value Trend Chart -->
<figure role="img" aria-label="Inventory value trend over 6 months">
  <figcaption>Value increased from $110,000 in July to $142,850 in January</figcaption>
  <svg aria-hidden="true"><!-- chart --></svg>
</figure>
```

### Screen Reader Announcements

- Report loaded: "Inventory valuation report loaded, total value $142,850, 156 products"
- Sort changed: "Sorted by total value, descending"
- Layers opened: "Cost layers for 10kWh LFP Battery, 3 active layers, total value $6,275.20"
- COGS calculated: "Cost of goods sold for 30 units: $3,486.00, average $116.20 per unit"
- Export started: "Exporting valuation report"
- Export complete: "Report exported successfully"

---

## Animation Choreography

### Report Load

```
PAGE LOAD:
- Duration: 400ms total
- Summary cards: stagger 100ms, fade up
- Table: skeleton to data transition

VALUE COUNTER:
- Duration: 1000ms
- Number: count up from 0 to final value
- Easing: ease-out
- Change badge: fade in after count complete
```

### Cost Layers

```
MODAL OPEN:
- Duration: 300ms
- Backdrop: fade in
- Modal: slide up + scale
- Content: stagger in

LAYER VISUALIZATION:
- Duration: 500ms
- Bars: width from 0 to percentage
- Stagger: 100ms between layers
- Color: gradient fill animation
```

### COGS Calculator

```
INPUT CHANGE:
- Duration: 200ms
- Debounce: 300ms
- Loading: show spinner
- Result: fade transition

RESULT UPDATE:
- Duration: 300ms
- Number: count animation
- Breakdown: slide in items
```

### Dashboard Widget

```
CHART LOAD:
- Duration: 800ms
- Line: draw from left to right
- Points: pop in on draw
- Easing: ease-out

VALUE UPDATE:
- Duration: 400ms
- Old value: fade out
- New value: count up + fade in
- Change badge: slide in
```

---

## Component Props Interfaces

```typescript
// Valuation Report
interface InventoryValuationReportProps {
  /** Date for valuation snapshot */
  asOfDate?: Date;
  /** Initial view */
  initialView?: 'product' | 'category' | 'location' | 'layers' | 'trend';
  /** Callback when product clicked */
  onProductClick?: (productId: string) => void;
  /** Callback when export clicked */
  onExport?: (format: 'csv' | 'pdf') => void;
}

interface ValuationSummary {
  totalValue: number;
  totalItems: number;
  totalProducts: number;
  valueChange: number;
  valueChangePercent: number;
  cogsThisMonth: number;
  itemsSoldThisMonth: number;
  valuationMethod: 'FIFO' | 'LIFO' | 'WAC';
}

interface ProductValuation {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  averageCost: number;
  totalValue: number;
  layerCount: number;
  lowestCost: number;
  highestCost: number;
  oldestLayerAge: number;
}

// Cost Layers Modal
interface CostLayersModalProps {
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Product ID */
  productId: string;
  /** Show COGS calculator */
  showCOGSCalculator?: boolean;
  /** Callback on export */
  onExport?: () => void;
}

interface CostLayer {
  id: string;
  productId: string;
  receivedAt: Date;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  supplierName?: string;
  originalQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  layerValue: number;
  ageInDays: number;
}

interface CostLayersSummary {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  totalValue: number;
  averageCost: number;
  lowestCost: number;
  highestCost: number;
  costVariancePercent: number;
  layerCount: number;
  oldestLayerDays: number;
  newestLayerDays: number;
}

// COGS Calculator
interface COGSCalculatorProps {
  /** Cost layers for calculation */
  layers: CostLayer[];
  /** Current quantity */
  currentQuantity: number;
  /** Callback when calculated */
  onCalculate?: (result: COGSResult) => void;
}

interface COGSResult {
  quantityToSell: number;
  totalCOGS: number;
  averageCostPerUnit: number;
  layerBreakdown: {
    layerId: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
  }[];
}

// Inventory Value Widget
interface InventoryValueWidgetProps {
  /** Show value trend chart */
  showTrend?: boolean;
  /** Trend period in months */
  trendMonths?: number;
  /** Show COGS data */
  showCOGS?: boolean;
  /** Widget size */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when clicked */
  onClick?: () => void;
}

interface InventoryValueData {
  totalValue: number;
  valueChange: number;
  valueChangePercent: number;
  totalItems: number;
  totalProducts: number;
  cogsMonth: number;
  itemsSoldMonth: number;
  grossMarginPercent: number;
  trendData: { date: string; value: number }[];
}

// Category Valuation
interface CategoryValuationProps {
  /** Sort by */
  sortBy?: 'value' | 'percentage' | 'items' | 'name';
  /** Sort direction */
  sortDir?: 'asc' | 'desc';
  /** Expand subcategories */
  expandSubcategories?: boolean;
}

interface CategoryValuation {
  categoryId: string;
  categoryName: string;
  parentCategoryId?: string;
  productCount: number;
  itemCount: number;
  averageCost: number;
  totalValue: number;
  percentageOfTotal: number;
  subcategories?: CategoryValuation[];
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/reports/inventory-valuation.tsx` | Valuation report page |
| `src/components/domain/inventory/cost-layers-modal.tsx` | FIFO layers detail |
| `src/components/domain/inventory/cogs-calculator.tsx` | Cost of goods calculator |
| `src/components/domain/inventory/valuation-table.tsx` | Product valuation table |
| `src/components/domain/inventory/category-valuation.tsx` | Category breakdown view |
| `src/components/domain/dashboard/widgets/inventory-value-widget.tsx` | Dashboard widget |

---

## Design References

- **Value Color**: Green (#22C55E) for increases, Red (#EF4444) for decreases
- **Layer Colors**: Gradient from blue (oldest) to teal (newest)
- **Chart Style**: Line chart with filled area, smooth curves
- **Currency Format**: USD with thousands separator, 2 decimal places
- **Percentage Format**: One decimal place with + or - indicator
- **FIFO Indicator**: Badge showing "FIFO" valuation method
