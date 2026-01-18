# Wireframe: DOM-SUPP-007c - Landed Cost Tracking UI

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-007c
> **Story Name**: Landed Cost Tracking: UI
> **Type**: UI Component
> **Component Type**: Card with DataTable and ReportLayout
> **Last Updated**: 2026-01-10

---

## Overview

This wireframe covers the UI for tracking and allocating landed costs on purchase orders:
- Cost breakdown section on PO detail
- Add cost dialog (freight, duty, insurance, etc.)
- Cost allocation preview (per-item breakdown)
- Landed cost report page with filters

---

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Landed cost breakdown card with summary totals
  - Individual cost entry cards (freight, duty, brokerage)
  - Cost allocation impact summary card

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-dialog.tsx`
- **Features**:
  - Add/edit landed cost dialog
  - Cost allocation preview modal
  - Mobile bottom sheet for cost entry

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Landed costs table with type, amount, allocation method columns
  - Per-item allocation table showing cost breakdown
  - Report table for landed costs across multiple POs

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form.tsx`
- **Features**:
  - Cost type selection radio group
  - Allocation method radio buttons (by value/quantity/weight/flat)
  - Amount input with currency formatting

### Chart
- **Pattern**: RE-UI Chart
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Cost breakdown by type bar chart
  - Landing percentage trend line chart
  - Supplier comparison chart for landed costs

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Landing percentage badge (12.4%)
  - Cost increase indicator badges (+6.7%)
  - Cost type badges (Freight, Duty, Brokerage)

---

## Mobile Wireframe (375px)

### PO Costs Section

```
+=========================================+
| [Details] [Items] [Receipts] [Costs]    |
|                              ======     |
+-----------------------------------------+
|                                         |
|  LANDED COSTS                           |
|  -----------------------------------    |
|                                         |
|  [+ Add Cost]                           |
|                                         |
|  +-----------------------------------+  |
|  | Freight / Shipping               |  |
|  | --------------------------------- |  |
|  | Amount: $150.00                   |  |
|  | Allocated: By Value               |  |
|  | Added: Jan 10 by Mike J.          |  |
|  |                    [Edit] [Delete]|  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Import Duty                       |  |
|  | --------------------------------- |  |
|  | Amount: $85.00                    |  |
|  | Allocated: By Value               |  |
|  | Added: Jan 12 by Sarah K.         |  |
|  |                    [Edit] [Delete]|  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Customs Brokerage                 |  |
|  | --------------------------------- |  |
|  | Amount: $45.00                    |  |
|  | Allocated: Flat per Item          |  |
|  | Added: Jan 12 by Sarah K.         |  |
|  |                    [Edit] [Delete]|  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  COST SUMMARY                           |
|  +-----------------------------------+  |
|  | Product Cost     |    $2,250.00   |  |
|  | + Freight        |      $150.00   |  |
|  | + Duty           |       $85.00   |  |
|  | + Brokerage      |       $45.00   |  |
|  | --------------------------------- |  |
|  | TOTAL LANDED     |    $2,530.00   |  |
|  | --------------------------------- |  |
|  | Landing %        |         12.4%  |  |
|  +-----------------------------------+  |
|                                         |
|  [View Allocation Details]              |
|                                         |
+=========================================+
```

### Add Cost Dialog (Bottom Sheet)

```
+=========================================+
| ================================        |
|                                         |
| Add Landed Cost                    [X]  |
+-----------------------------------------+
|                                         |
|  Cost Type *                            |
|  +-----------------------------------+  |
|  | Select type...                 v  |  |
|  +-----------------------------------+  |
|    ( ) Freight / Shipping               |
|    ( ) Import Duty                      |
|    ( ) Customs Brokerage                |
|    ( ) Insurance                        |
|    ( ) Handling Fees                    |
|    ( ) Inspection Fees                  |
|    ( ) Other                            |
|                                         |
|  Amount *                               |
|  +-----------------------------------+  |
|  | $                        150.00   |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  ALLOCATION METHOD                      |
|                                         |
|  ( ) By Value                           |
|      Allocate proportionally based      |
|      on line item values                |
|                                         |
|  ( ) By Quantity                        |
|      Divide equally by total units      |
|                                         |
|  ( ) By Weight                          |
|      Allocate based on item weight      |
|                                         |
|  ( ) Flat per Item                      |
|      Divide equally by line items       |
|                                         |
|  -----------------------------------    |
|                                         |
|  Description / Reference                |
|  +-----------------------------------+  |
|  | Invoice #INV-2024-001 from        |  |
|  | freight carrier...                |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)                   [Add Cost]   |
|                                         |
+=========================================+
```

### Cost Allocation Preview

```
+=========================================+
| < Costs                                 |
+-----------------------------------------+
|                                         |
|  ALLOCATION PREVIEW                     |
|  Freight: $150.00 (By Value)            |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | LFP Battery Cells 280Ah              |  |
|  | Line Value: $225.00 (10.0%)       |  |
|  | + Freight: $15.00                 |  |
|  | --------------------------------- |  |
|  | Unit Cost: $4.50 -> $4.80         |  |
|  | Landed Cost/Unit: $4.80           |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Inverter Modules 5kW               |  |
|  | Line Value: $1,200.00 (53.3%)     |  |
|  | + Freight: $80.00                 |  |
|  | --------------------------------- |  |
|  | Unit Cost: $12.00 -> $12.80       |  |
|  | Landed Cost/Unit: $12.80          |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Solar Panels 450W              |  |
|  | Line Value: $370.00 (16.4%)       |  |
|  | + Freight: $24.60                 |  |
|  | --------------------------------- |  |
|  | Unit Cost: $18.50 -> $19.73       |  |
|  | Landed Cost/Unit: $19.73          |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Mounting Brackets               |  |
|  | Line Value: $200.00 (8.9%)        |  |
|  | + Freight: $13.33                 |  |
|  | --------------------------------- |  |
|  | Unit Cost: $8.00 -> $8.53         |  |
|  | Landed Cost/Unit: $8.53           |  |
|  +-----------------------------------+  |
|                                         |
|  (... more items)                       |
|                                         |
|  -----------------------------------    |
|                                         |
|  SUMMARY                                |
|  +-----------------------------------+  |
|  | Total Freight Allocated: $150.00  |  |
|  | Items Affected: 12                |  |
|  | Avg Increase: 6.7%                |  |
|  +-----------------------------------+  |
|                                         |
|  [x] Update inventory cost prices       |
|                                         |
+-----------------------------------------+
|                                         |
| (Back)                  [Confirm]       |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Costs Tab

```
+================================================================+
| [Details] [Items (12)] [Receipts (2)] [Costs] [Amendments]      |
|                                       =======                   |
+----------------------------------------------------------------+
|                                                                 |
| +-- LANDED COSTS ----------------------+ +-- SUMMARY ----------+|
| |                                      | |                     ||
| | [+ Add Cost]                         | | Product Cost        ||
| |                                      | | $2,250.00           ||
| | +----------------------------------+ | |                     ||
| | | Type      | Amount  | Method    | | | + Landed Costs      ||
| | +-----------+---------+-----------+ | | $280.00 (12.4%)     ||
| | | Freight   | $150.00 | By Value  | | |                     ||
| | | Duty      |  $85.00 | By Value  | | | -------------------||
| | | Brokerage |  $45.00 | Flat/Item | | |                     ||
| | +----------------------------------+ | | TOTAL LANDED       ||
| |                                      | | $2,530.00           ||
| | Total Landed Costs: $280.00          | |                     ||
| |                                      | +---------------------+|
| +--------------------------------------+                        |
|                                                                 |
| +-- ALLOCATION BY ITEM ---------------------------------------------+
| |                                                                   |
| | Product              | Orig Cost | + Landed | Landed Cost | % Inc|
| | -------------------- + --------- + -------- + ----------- + -----+
| | 2x4 Pine Lumber      |    $4.50  |   $0.30  |      $4.80  |  6.7%|
| | Drywall Sheets       |   $12.00  |   $0.80  |     $12.80  |  6.7%|
| | Joint Compound       |   $18.50  |   $1.23  |     $19.73  |  6.7%|
| | Drywall Screws       |    $8.00  |   $0.53  |      $8.53  |  6.6%|
| +-------------------------------------------------------------------+
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### PO Costs Tab Full View

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Orders                                                               |
| ----------- |                                                                                |
| Procurement | PO-2024-0145  |  ABC Building Supplies  |  [Received]                           |
|   Dashboard | ---------------------------------------------------------------------------------  |
|   Suppliers |                                                                                |
|   Orders <- | [Details] [Line Items (12)] [Receipts (2)] [Costs] [Amendments] [Activity]      |
| Catalog     |                                            ======                              |
| Jobs        |                                                                                |
| Pipeline    | +-- LANDED COSTS BREAKDOWN ------------------------------------------------------+
| Support     | |                                                                             |
|             | |  [+ Add Cost]                                                               |
|             | |                                                                             |
|             | |  +-------------------------------------------------------------------------+|
|             | |  | Type              | Amount    | Method      | Reference   | Actions    ||
|             | |  +-------------------+-----------+-------------+-------------+------------+|
|             | |  | Freight/Shipping  | $150.00   | By Value    | INV-001     | [Ed] [Del] ||
|             | |  | Import Duty       |  $85.00   | By Value    | DUTY-2024   | [Ed] [Del] ||
|             | |  | Customs Brokerage |  $45.00   | Flat/Item   | BRK-2024    | [Ed] [Del] ||
|             | |  +-------------------------------------------------------------------------+|
|             | |                                                                             |
|             | |  Total Landed Costs: $280.00                                                |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | +-- COST SUMMARY ---------------------------+ +-- ALLOCATION IMPACT -----------+
|             | |                                          | |                               |
|             | | Product Cost (subtotal):     $2,250.00   | | Items Affected:           12  |
|             | | + Freight:                     $150.00   | | Avg Cost Increase:       6.7% |
|             | | + Duty:                         $85.00   | | Min Increase:            6.6% |
|             | | + Brokerage:                    $45.00   | | Max Increase:            6.9% |
|             | | ---------------------------------------- | |                               |
|             | | TOTAL LANDED COST:           $2,530.00   | | [Update Inventory Costs]      |
|             | | ---------------------------------------- | |                               |
|             | | Landing Percentage:              12.4%   | +-------------------------------+
|             | |                                          |                                 |
|             | +------------------------------------------+                                 |
|             |                                                                                |
|             | +-- PER-ITEM ALLOCATION ----------------------------------------------------------+
|             | |                                                                             |
|             | | Product              | Qty | Orig/Unit | Landed/Unit | +Freight | +Duty  | +Broker |
|             | | -------------------- + --- + --------- + ----------- + -------- + ------ + ------- |
|             | | 2x4 Pine Lumber      |  50 |    $4.50  |      $4.80  |   $0.20  | $0.08  |   $0.02 |
|             | | Drywall Sheets       | 100 |   $12.00  |     $12.80  |   $0.53  | $0.22  |   $0.04 |
|             | | Joint Compound       |  20 |   $18.50  |     $19.73  |   $0.82  | $0.34  |   $0.06 |
|             | | Drywall Screws       |  25 |    $8.00  |      $8.53  |   $0.35  | $0.15  |   $0.04 |
|             | | (+ 8 more items...)                                                          |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

---

## Landed Cost Report Page

### Desktop Report Layout

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | Reports > Landed Cost Analysis                                                |
| ----------- |                                                                                |
| Procurement | Analyze landed costs across purchase orders                                    |
|   Dashboard | -----------------------------------------------------------------------------------
|   Suppliers |                                                                                |
|   Orders    | +-- FILTERS -----------------------------------------------------------------+
| Catalog     | |                                                                             |
| Jobs        | | Date Range: [Last 30 Days v]  Supplier: [All Suppliers v]                   |
| Reports     | | Category: [All Categories v]  Cost Type: [All Types v]                      |
|   Landed <- | |                                                       [Apply] [Reset]      |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | +-- SUMMARY METRICS ----------------------------------------------------------+
|             | |                                                                             |
|             | | +-------------+ +-------------+ +-------------+ +-------------+            |
|             | | | Total POs   | | Product     | | Landed      | | Landing %   |            |
|             | | |    23       | | $125,000    | | $15,625     | |   12.5%     |            |
|             | | +-------------+ +-------------+ +-------------+ +-------------+            |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | +-- COST BREAKDOWN BY TYPE ---------------------------------------------------+
|             | |                                                                             |
|             | | +------+ +------+ +------+ +------+ +------+                               |
|             | | |$8,500| |$4,200| |$1,800| |$850  | |$275  |                               |
|             | | |Freig | |Duty  | |Broker| |Insur | |Other |                               |
|             | | |54.4% | |26.9% | |11.5% | |5.4%  | |1.8%  |                               |
|             | | +------+ +------+ +------+ +------+ +------+                               |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | +-- LANDED COST BY SUPPLIER --------------------------------------------------+
|             | |                                                                             |
|             | | Supplier             | Orders | Product $ | Landed $ | Landing % | Trend   |
|             | | -------------------- + ------ + --------- + -------- + --------- + ------- |
|             | | ABC Building         |    8   |  $45,000  |  $5,400  |    12.0%  |   -0.5% |
|             | | XYZ Materials        |    6   |  $32,000  |  $4,480  |    14.0%  |   +1.2% |
|             | | Delta Plumbing       |    5   |  $28,000  |  $3,080  |    11.0%  |   -0.3% |
|             | | Gamma Electric       |    4   |  $20,000  |  $2,665  |    13.3%  |   +0.8% |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | +-- LANDING % TREND ----------------------------------------------------------+
|             | |                                                                             |
|             | | 15% |    ____                                                              |
|             | |     |   /    \        ____                                                 |
|             | | 12% |  /      \______/    \____                                            |
|             | |     | /                        \                                           |
|             | |  9% |/                                                                     |
|             | |     +----+----+----+----+----+----+----+----+----+----+----+----+          |
|             | |      Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec           |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | [Export Report]                                                               |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

### Mobile Report View

```
+=========================================+
| < Reports                               |
+-----------------------------------------+
| Landed Cost Analysis                    |
+-----------------------------------------+
|                                         |
| [Filters v]                             |
| Last 30 Days | All Suppliers            |
|                                         |
| -----------------------------------     |
|                                         |
| +----------+ +----------+               |
| | POs: 23  | | Landing  |               |
| |          | | 12.5%    |               |
| +----------+ +----------+               |
| +----------+ +----------+               |
| | Product  | | Landed   |               |
| | $125K    | | $15.6K   |               |
| +----------+ +----------+               |
|                                         |
| -----------------------------------     |
|                                         |
| BREAKDOWN BY TYPE                       |
|                                         |
| +-----------------------------------+   |
| | Freight                    54.4%  |   |
| | [======================    ]      |   |
| | $8,500                            |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | Duty                       26.9%  |   |
| | [==========                ]      |   |
| | $4,200                            |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | Brokerage                  11.5%  |   |
| | [====                      ]      |   |
| | $1,800                            |   |
| +-----------------------------------+   |
|                                         |
| -----------------------------------     |
|                                         |
| BY SUPPLIER                             |
|                                         |
| +-----------------------------------+   |
| | ABC Building Supplies             |   |
| | 8 orders | Landing: 12.0%         |   |
| | Product: $45K | Landed: $5.4K     |   |
| +-----------------------------------+   |
|                                         |
| +-----------------------------------+   |
| | XYZ Materials Co                  |   |
| | 6 orders | Landing: 14.0% [!]     |   |
| | Product: $32K | Landed: $4.5K     |   |
| +-----------------------------------+   |
|                                         |
| [View More Suppliers (4)]               |
|                                         |
| -----------------------------------     |
|                                         |
| [Export Report]                         |
|                                         |
+=========================================+
```

---

## Loading States

### Costs Tab Loading

```
+-------------------------------------------------------------+
|                                                             |
| LANDED COSTS                                                |
| ---------------------------------------------------         |
|                                                             |
| [+ Add Cost]                                                |
|                                                             |
| +-------------------------------------------------------+   |
| | [shimmer=============] | [shimmer===] | [shimmer]     |   |
| +-------------------------------------------------------+   |
| +-------------------------------------------------------+   |
| | [shimmer=============] | [shimmer===] | [shimmer]     |   |
| +-------------------------------------------------------+   |
|                                                             |
| +-------------------------------------------------------+   |
| | [shimmer========================]                     |   |
| | [shimmer================]                             |   |
| +-------------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
```

### Report Loading

```
+=========================================+
|                                         |
| +----------+ +----------+               |
| | [shimmer]| | [shimmer]|               |
| +----------+ +----------+               |
|                                         |
| +-----------------------------------+   |
| | [shimmer========================] |   |
| +-----------------------------------+   |
| +-----------------------------------+   |
| | [shimmer========================] |   |
| +-----------------------------------+   |
| +-----------------------------------+   |
| | [shimmer========================] |   |
| +-----------------------------------+   |
|                                         |
+=========================================+
```

---

## Empty States

### No Costs Added

```
+=========================================+
|                                         |
|  LANDED COSTS                           |
|  -----------------------------------    |
|                                         |
|           +-------------+               |
|           | [calculator]|               |
|           +-------------+               |
|                                         |
|   NO ADDITIONAL COSTS RECORDED          |
|                                         |
|   Add freight, duty, insurance, and     |
|   other costs to calculate the true     |
|   landed cost of your inventory.        |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |     [+ ADD FIRST COST]      |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### No Report Data

```
+=========================================+
|                                         |
|           +-------------+               |
|           |  [chart]    |               |
|           +-------------+               |
|                                         |
|     NO LANDED COST DATA                 |
|                                         |
|   No purchase orders with landed        |
|   costs found for the selected          |
|   date range and filters.               |
|                                         |
|   [Adjust Filters]                      |
|                                         |
+=========================================+
```

---

## Error States

### Failed to Add Cost

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Failed to Add Cost            |  |
|  |                                   |  |
|  | Could not save this landed cost.  |  |
|  | Error: Amount exceeds order total.|  |
|  |                                   |  |
|  |    [Dismiss]    [Retry]           |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Failed to Update Inventory

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Inventory Update Failed       |  |
|  |                                   |  |
|  | Could not update inventory cost   |  |
|  | prices. The landed costs have been|  |
|  | saved but inventory was not       |  |
|  | updated.                          |  |
|  |                                   |  |
|  |    [Dismiss]    [Retry Update]    |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Success State

```
+=========================================+
|                                         |
|  [check] Landed Cost Added!             |
|                                         |
|  $150.00 freight allocated across       |
|  12 items. Inventory costs updated.     |
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<!-- Costs Section -->
<section role="region" aria-label="Landed costs">
  <h2>Landed Costs</h2>

  <table role="grid" aria-label="Landed cost entries">
    <thead>
      <tr>
        <th scope="col">Cost Type</th>
        <th scope="col">Amount</th>
        <th scope="col">Allocation Method</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr aria-label="Freight $150, allocated by value">
        <td>Freight/Shipping</td>
        <td>$150.00</td>
        <td>By Value</td>
        <td>
          <button aria-label="Edit freight cost">Edit</button>
          <button aria-label="Delete freight cost">Delete</button>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<!-- Add Cost Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="add-cost-title">
  <h2 id="add-cost-title">Add Landed Cost</h2>

  <fieldset>
    <legend>Cost Type</legend>
    <label>
      <input type="radio" name="cost-type" /> Freight/Shipping
    </label>
  </fieldset>

  <label for="amount">Amount</label>
  <input id="amount" type="number" aria-required="true" />

  <fieldset>
    <legend>Allocation Method</legend>
    <label>
      <input type="radio" name="allocation" />
      By Value - allocate proportionally based on line item values
    </label>
  </fieldset>
</div>

<!-- Allocation Preview -->
<section role="region" aria-label="Cost allocation preview">
  <h2>Allocation Preview</h2>
  <table role="grid" aria-label="Per-item cost allocation">
    <thead>
      <tr>
        <th scope="col">Product</th>
        <th scope="col">Original Cost</th>
        <th scope="col">Landed Cost</th>
        <th scope="col">Increase</th>
      </tr>
    </thead>
  </table>
</section>
```

### Keyboard Navigation

```
Tab Order (Costs Section):
1. Add Cost button
2. Cost entries (table rows)
3. Edit/Delete buttons per row
4. View Allocation Details button
5. Update Inventory Costs button

Dialog Tab Order:
1. Close button (X)
2. Cost type radio buttons
3. Amount input
4. Allocation method radio buttons
5. Description textarea
6. Cancel button
7. Add Cost button
```

### Screen Reader Announcements

```
On costs section load:
  "Landed costs section. 3 costs totaling $280.
   Landing percentage: 12.4%."

On cost type selection:
  "Freight/Shipping selected. Common for transportation costs."

On allocation preview:
  "Allocation preview. $150 freight will be distributed
   across 12 items. Average increase: 6.7% per item."

On cost added:
  "Landed cost added. $150 freight allocated.
   Total landed cost now $2,530."

On inventory update:
  "Inventory cost prices updated for 12 items."
```

---

## Animation Choreography

### Cost Entry Add

```
ADD COST:
- New row: Slide down + fade in (250ms)
- Summary totals: Counter animation (300ms)
- Allocation table: Update flash (200ms)
```

### Allocation Preview

```
PREVIEW LOAD:
- Items: Stagger fade in (50ms between)
- Cost columns: Animate numbers (200ms each)
- Percentage: Color transition based on value
```

### Report Charts

```
CHART LOAD:
- Bars: Animate height from 0 (500ms, stagger 50ms)
- Lines: Draw left to right (800ms)
- Labels: Fade in after data (200ms)
```

---

## Component Props Interface

```typescript
// POCostsSection.tsx
interface POCostsSectionProps {
  orderId: string;
  costs: LandedCost[];
  lineItems: POLineItem[];
  onAddCost: () => void;
  onEditCost: (costId: string) => void;
  onDeleteCost: (costId: string) => void;
  onViewAllocation: () => void;
  onUpdateInventory: () => void;
  isLoading?: boolean;
}

interface LandedCost {
  id: string;
  type: LandedCostType;
  amount: number;
  allocationMethod: AllocationMethod;
  description?: string;
  reference?: string;
  addedBy: { id: string; name: string };
  addedAt: Date;
}

type LandedCostType =
  | 'freight'
  | 'duty'
  | 'brokerage'
  | 'insurance'
  | 'handling'
  | 'inspection'
  | 'other';

type AllocationMethod =
  | 'by_value'
  | 'by_quantity'
  | 'by_weight'
  | 'flat_per_item';

// AddCostDialog.tsx
interface AddCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  mode: 'create' | 'edit';
  initialData?: Partial<LandedCostInput>;
  onSave: (cost: LandedCostInput) => Promise<void>;
  isSaving: boolean;
}

interface LandedCostInput {
  type: LandedCostType;
  amount: number;
  allocationMethod: AllocationMethod;
  description?: string;
  reference?: string;
  updateInventoryCosts: boolean;
}

// CostAllocationPreview.tsx
interface CostAllocationPreviewProps {
  cost: {
    type: LandedCostType;
    amount: number;
    allocationMethod: AllocationMethod;
  };
  lineItems: Array<{
    id: string;
    product: { id: string; name: string };
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    weight?: number;
  }>;
  allocations: Array<{
    lineItemId: string;
    allocatedAmount: number;
    newUnitCost: number;
    percentageIncrease: number;
  }>;
}

// CostSummary.tsx
interface CostSummaryProps {
  productCost: number;
  landedCosts: Array<{
    type: LandedCostType;
    amount: number;
  }>;
  totalLandedCost: number;
  landingPercentage: number;
}

// LandedCostReport.tsx
interface LandedCostReportProps {
  filters: {
    dateRange: { from: Date; to: Date };
    supplierId: string | null;
    categoryId: string | null;
    costType: LandedCostType | null;
  };
  onFilterChange: (filters: LandedCostReportProps['filters']) => void;
}

interface LandedCostReportData {
  summary: {
    totalOrders: number;
    productCost: number;
    landedCost: number;
    landingPercentage: number;
  };
  byType: Array<{
    type: LandedCostType;
    amount: number;
    percentage: number;
  }>;
  bySupplier: Array<{
    supplier: { id: string; name: string };
    orderCount: number;
    productCost: number;
    landedCost: number;
    landingPercentage: number;
    trend: number;
  }>;
  trend: Array<{
    period: string;
    landingPercentage: number;
  }>;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/purchase-orders/$poId.tsx` | Modify | Add Costs tab |
| `src/components/domain/procurement/po-costs-section.tsx` | Create | Costs breakdown |
| `src/components/domain/procurement/add-cost-dialog.tsx` | Create | Add/edit dialog |
| `src/components/domain/procurement/cost-allocation-preview.tsx` | Create | Preview table |
| `src/components/domain/procurement/cost-summary.tsx` | Create | Summary card |
| `src/routes/_authed/reports/landed-costs.tsx` | Create | Report page |
| `src/components/domain/reports/landed-cost-charts.tsx` | Create | Report charts |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Costs section load | < 500ms | Table populated |
| Dialog open | < 150ms | Form visible |
| Allocation calc | < 200ms | Preview updated |
| Cost save | < 1s | Complete + toast |
| Report load | < 2s | Charts rendered |
| Inventory update | < 3s | All items updated |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
