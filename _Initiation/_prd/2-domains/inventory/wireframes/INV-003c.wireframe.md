# Wireframe: DOM-INV-003c - Stock Count Process: UI

## Story Reference

- **Story ID**: DOM-INV-003c
- **Name**: Stock Count Process: UI
- **PRD**: memory-bank/prd/domains/inventory.prd.json
- **Type**: UI Component
- **Component Types**: List Page, Count Entry Form, Variance Highlighting, Barcode Scanning
- **Primary Users**: Warehouse Staff, Inventory Manager, Operations

## Overview

Stock count entry UI with variance highlighting, barcode scanning support, count history list, and adjustment preview on completion. Designed for warehouse floor use with mobile-first approach.

## UI Patterns (Reference Implementation)

### Progress Bar
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Count completion progress (12/45 items, 27%)
  - Visual percentage bar with gradient
  - Accessible ARIA progressbar role

### Card with Status Indicators
- **Pattern**: RE-UI Card + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx` & `badge.tsx`
- **Features**:
  - Item cards with variance status (match, over, short, pending)
  - Color-coded left border (green match, blue over, red short, gray pending)
  - Status icons with semantic colors

### Input Stepper
- **Pattern**: RE-UI Input + Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx` & `button.tsx`
- **Features**:
  - Quantity input with -/+ buttons
  - Large touch targets (48px) for warehouse gloves
  - Real-time variance calculation

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - Filter tabs (All, Counted, Pending, Variance)
  - Active tab highlighting
  - Keyboard navigation

### Dialog with Preview
- **Pattern**: RE-UI Dialog + Table
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx` & `table.tsx`
- **Features**:
  - Complete count dialog with adjustment preview
  - Summary statistics (matched, variance count)
  - Required reason selector

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | inventoryMovements | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/products.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Stock Counts List

```
+=========================================+
| < Inventory                      [...]  |
+-----------------------------------------+
| Stock Counts                            |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [+ START NEW COUNT]            || <- 48px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ACTIVE COUNTS                          |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | [*] COUNT-2026-0015                 ||
|  |     In Progress                     ||
|  |     Started: 2h ago by Mike         ||
|  |     Progress: 12/45 items (27%)     ||
|  |     +---------------------------+   ||
|  |     | [############...........]  |   ||
|  |     +---------------------------+   ||
|  |     [Continue Counting]             ||
|  +-------------------------------------+|
|                                         |
|  RECENT COUNTS                          |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | [ok] COUNT-2026-0014                ||
|  |     Completed - Jan 8               ||
|  |     Items: 42 | Variance: 3         ||
|  |     Adjustments: +5, -2             ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ok] COUNT-2026-0013                ||
|  |     Completed - Jan 5               ||
|  |     Items: 38 | Variance: 0         ||
|  |     No adjustments needed           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [x] COUNT-2026-0012                 ||
|  |     Cancelled - Jan 3               ||
|  |     Reason: Shift change            ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Start New Count - Product Selection

```
+=========================================+
| =====================================   |
|                                         |
|  START STOCK COUNT               [X]    |
|  -------------------------------------- |
|                                         |
|  COUNT TYPE                             |
|  +-------------+  +------------------+  |
|  | (o) Full    |  | ( ) Partial      |  |
|  +-------------+  +------------------+  |
|                                         |
|  Full = All products                    |
|  Partial = Selected products/locations  |
|                                         |
|  <- If Partial selected:                |
|                                         |
|  FILTER BY                              |
|  +----------------------------------+   |
|  | [v] Category: All                |   |
|  +----------------------------------+   |
|  +----------------------------------+   |
|  | [v] Location: All                |   |
|  +----------------------------------+   |
|                                         |
|  OR SELECT PRODUCTS                     |
|  +----------------------------------+   |
|  | [Search products___________] [+] |   |
|  +----------------------------------+   |
|                                         |
|  Selected: 0 products                   |
|                                         |
|  NOTES (optional)                       |
|  +----------------------------------+   |
|  | e.g., Monthly cycle count        |   |
|  +----------------------------------+   |
|                                         |
|  +----------------------------------+   |
|  |                                  |   |
|  |      [START COUNT]               |   | <- 56px primary
|  |                                  |   |
|  +----------------------------------+   |
|                                         |
+=========================================+
```

### Count Entry - Main Interface

```
+=========================================+
| < COUNT-2026-0015                [Scan] |
+-----------------------------------------+
|                                         |
|  PROGRESS: 12/45 items (27%)            |
|  +-------------------------------------+|
|  | [############.....................]  ||
|  +-------------------------------------+|
|                                         |
|  [All] [Counted] [Pending] [Variance]   |
|  ===                                    |
|                                         |
|  +-------------------------------------+|
|  | [?] 10kWh LFP Battery                  ||
|  |     SKU: BAT-LFP-10KWH                     ||
|  |     Location: Aisle A-1, S2         ||
|  |     Expected: 53                    ||
|  |                                     ||
|  |     Counted:                        ||
|  |     +---------------------------+   ||
|  |     |  [  -  ]  [    ]  [  +  ] |   || <- Large touch
|  |     +---------------------------+   ||
|  |                                     ||
|  |     [Done] <- Mark item counted    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ok] 400W Solar Panel               ||
|  |     SKU: SOL-RES-400W                     ||
|  |     Location: Main Warehouse        ||
|  |     Expected: 62 | Counted: 62      ||
|  |     Variance: 0                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [!] 5kW Hybrid Inverter                    ||
|  |     SKU: INV-HYB-5KW                     ||
|  |     Location: Receiving Dock        ||
|  |     Expected: 27 | Counted: 25      ||
|  |     VARIANCE: -2   <--------        || <- Red highlight
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |        [COMPLETE COUNT]             || <- Disabled until done
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Count Entry - Scan Mode

```
+=========================================+
| < COUNT-2026-0015            [Keyboard] |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |     +-------------------------+     ||
|  |     |   [[[[[[[[[[[[[[[[[[[   |     ||
|  |     |                         |     ||
|  |     |    SCAN BARCODE         |     ||
|  |     |                         |     ||
|  |     |   Point camera at       |     ||
|  |     |   product barcode       |     ||
|  |     |                         |     ||
|  |     +-------------------------+     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Last Scanned:                          |
|  +-------------------------------------+|
|  | [ok] 10kWh LFP Battery                 ||
|  |     Scanned: 1 | Total: 54          ||
|  |     Expected: 53                    ||
|  |     +1 variance                     ||
|  +-------------------------------------+|
|                                         |
|  Scan History (this session):           |
|  +-------------------------------------+|
|  | 10:32 - BAT-LFP-10KWH x1                   ||
|  | 10:31 - BAT-LFP-10KWH x1                   ||
|  | 10:30 - SOL-RES-400W x5                   ||
|  | 10:28 - INV-HYB-5KW x2                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |    [ENTER QUANTITY MANUALLY]        || <- Secondary
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Variance Highlighting States

```
+-- NO VARIANCE (Match) ----------------------+
|  +----------------------------------------+ |
|  | [ok] Product Name                      | |
|  |     Expected: 53 | Counted: 53         | |
|  |     Variance: 0                        | |
|  +----------------------------------------+ |
|  Background: green-50                       |
|  Border-left: 4px solid green-500           |
|  Icon: Checkmark (green)                    |
+--------------------------------------------|

+-- POSITIVE VARIANCE (Over) -----------------+
|  +----------------------------------------+ |
|  | [+] Product Name                       | |
|  |     Expected: 53 | Counted: 56         | |
|  |     VARIANCE: +3                       | | <- Blue/info
|  +----------------------------------------+ |
|  Background: blue-50                        |
|  Border-left: 4px solid blue-500            |
|  Icon: Plus circle (blue)                   |
+--------------------------------------------|

+-- NEGATIVE VARIANCE (Short) ----------------+
|  +----------------------------------------+ |
|  | [!] Product Name                       | |
|  |     Expected: 53 | Counted: 50         | |
|  |     VARIANCE: -3                       | | <- Red/warning
|  +----------------------------------------+ |
|  Background: red-50                         |
|  Border-left: 4px solid red-500             |
|  Icon: Alert triangle (red)                 |
+--------------------------------------------|

+-- NOT YET COUNTED --------------------------+
|  +----------------------------------------+ |
|  | [?] Product Name                       | |
|  |     Expected: 53 | Counted: -          | |
|  |     Pending                            | | <- Muted
|  +----------------------------------------+ |
|  Background: gray-50                        |
|  Border-left: 4px solid gray-300            |
|  Icon: Question mark (gray)                 |
+--------------------------------------------|
```

### Complete Count - Adjustment Preview

```
+=========================================+
| =====================================   |
|                                         |
|  COMPLETE STOCK COUNT            [X]    |
|  -------------------------------------- |
|                                         |
|  COUNT SUMMARY                          |
|  -----------------------------------    |
|                                         |
|  Total Items: 45                        |
|  Matched: 38 (84%)                      |
|  Variance: 7 items                      |
|                                         |
|  ADJUSTMENTS REQUIRED                   |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | [!] 10kWh LFP Battery          +3      ||
|  |     Expected: 53 -> Actual: 56      ||
|  |     Adjustment: INCREASE +3         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [!] 5kW Hybrid Inverter            -2      ||
|  |     Expected: 27 -> Actual: 25      ||
|  |     Adjustment: DECREASE -2         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [!] Battery Pack 10kWh      -1      ||
|  |     Expected: 38 -> Actual: 37      ||
|  |     Adjustment: DECREASE -1         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [!] Cable Kit Pro           +2      ||
|  |     Expected: 89 -> Actual: 91      ||
|  |     Adjustment: INCREASE +2         ||
|  +-------------------------------------+|
|                                         |
|  Net Change: +2 units                   |
|  Value Impact: +$250.00                 |
|                                         |
|  ADJUSTMENT REASON *                    |
|  +----------------------------------+   |
|  | [v] Stock count reconciliation  |   |
|  +----------------------------------+   |
|                                         |
|  Notes                                  |
|  +----------------------------------+   |
|  | Monthly cycle count Jan 2026    |   |
|  +----------------------------------+   |
|                                         |
|  +----------------------------------+   |
|  |     [CONFIRM & APPLY]           |   | <- 56px primary
|  +----------------------------------+   |
|                                         |
|  ( Cancel - Continue Counting )         |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Stock Counts List

```
+=======================================================================+
| Inventory > Stock Counts                              [+ Start Count] |
+-----------------------------------------------------------------------+
|                                                                       |
|  [All Counts] [In Progress] [Completed] [Cancelled]                   |
|                ============                                           |
|                                                                       |
|  +-------------------------------------------------------------------+|
|  |                                                                   ||
|  |  Count #       | Status      | Items    | Variance | Date        ||
|  |  -------------------------------------------------------------------
|  |  COUNT-0015    | In Progress | 12/45    | 3 items  | 2h ago      ||
|  |  COUNT-0014    | Completed   | 42/42    | 3 items  | Jan 8       ||
|  |  COUNT-0013    | Completed   | 38/38    | 0 items  | Jan 5       ||
|  |  COUNT-0012    | Cancelled   | 15/50    | -        | Jan 3       ||
|  |  COUNT-0011    | Completed   | 25/25    | 1 item   | Dec 28      ||
|  |                                                                   ||
|  +-------------------------------------------------------------------+|
|                                                                       |
+=======================================================================+
```

### Count Entry - Split View

```
+=======================================================================+
| < COUNT-2026-0015                         [Scan Mode] [Complete Count] |
+-----------------------------------------------------------------------+
|                                                                       |
|  Progress: 12/45 items (27%)                                          |
|  +-------------------------------------------------------------------+|
|  | [##############..........................................]         ||
|  +-------------------------------------------------------------------+|
|                                                                       |
|  +-- ITEMS LIST ---------------------------+  +-- CURRENT ITEM ------+|
|  |                                         |  |                      ||
|  | [All] [Pending] [Counted] [Variance]    |  | 10kWh LFP Battery       ||
|  | ===                                     |  | SKU: BAT-LFP-10KWH          ||
|  |                                         |  | Location: A-1, S2    ||
|  | [Search items_______________]           |  |                      ||
|  |                                         |  | Expected: 53         ||
|  | +--------------------------------------+|  |                      ||
|  | | [?] 10kWh LFP Battery                  <|  | Counted:             ||
|  | |     Exp: 53 | Pending               ||  | +-----------------+  ||
|  | +--------------------------------------+|  | |                 |  ||
|  |                                         |  | |      53         |  ||
|  | +--------------------------------------+|  | |                 |  ||
|  | | [ok] 400W Solar Panel                ||  | +-----------------+  ||
|  | |     Exp: 62 | Counted: 62 | Var: 0   ||  |                      ||
|  | +--------------------------------------+|  | [-10] [-1] [+1] [+10]||
|  |                                         |  |                      ||
|  | +--------------------------------------+|  | Variance: 0          ||
|  | | [!] 5kW Hybrid Inverter                     ||  |                      ||
|  | |     Exp: 27 | Counted: 25 | Var: -2  ||  | [Mark Counted]       ||
|  | +--------------------------------------+|  |                      ||
|  |                                         |  | [Skip for Now]       ||
|  | +--------------------------------------+|  +----------------------+|
|  | | [ok] Battery Pack 10kWh              ||                         |
|  | |     Exp: 38 | Counted: 37 | Var: -1  ||                         |
|  | +--------------------------------------+|                         |
|  |                                         |                         |
|  +------------------------------------------+                         |
|                                                                       |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Stock Counts List

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Inventory > Stock Counts                                          [+ Start Count]     |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  [All Counts] [In Progress] [Completed] [Cancelled]     [Search________] [Date Range v]|
| Inventory < |                                                                                        |
|   Items     |  +------------------------------------------------------------------------------------+|
|   Locations |  |                                                                                    ||
|   Counts    |  |  Count #         | Type     | Status      | Progress | Variance | Started | Actions||
|   ========= |  |  ------------------------------------------------------------------------------------
|   Reports   |  |  COUNT-2026-0015 | Partial  | In Progress | 12/45    | 3 items  | 2h ago  | [...]  ||
| Jobs        |  |  COUNT-2026-0014 | Full     | Completed   | 42/42    | 3 items  | Jan 8   | [...]  ||
| Pipeline    |  |  COUNT-2026-0013 | Partial  | Completed   | 38/38    | 0 items  | Jan 5   | [...]  ||
|             |  |  COUNT-2026-0012 | Full     | Cancelled   | 15/50    | -        | Jan 3   | [...]  ||
|             |  |  COUNT-2026-0011 | Partial  | Completed   | 25/25    | 1 item   | Dec 28  | [...]  ||
|             |  |  COUNT-2026-0010 | Full     | Completed   | 156/156  | 5 items  | Dec 15  | [...]  ||
|             |  |  COUNT-2026-0009 | Partial  | Completed   | 30/30    | 2 items  | Dec 10  | [...]  ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  Showing 1-7 of 24 counts                                           < 1 [2] 3 4 >      |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Count Entry - Full Desktop

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Counts                                    [Cancel Count] [Complete Count]   |
| Customers   |                                                                                        |
| Orders      |  COUNT-2026-0015 - Monthly Cycle Count                                                 |
| Products    |  Started: Jan 10, 2026 at 10:15 AM by Mike Johnson                                     |
| Inventory < |  ------------------------------------------------------------------------------------- |
|             |                                                                                        |
|             |  +-- PROGRESS ---------------------------------------------------------------------+   |
|             |  |                                                                                 |   |
|             |  |  [#################################............................................] |   |
|             |  |  27% Complete - 12 of 45 items counted                                          |   |
|             |  |                                                                                 |   |
|             |  |  Matched: 9  |  Over (+): 2  |  Short (-): 1  |  Pending: 33                    |   |
|             |  |                                                                                 |   |
|             |  +---------------------------------------------------------------------------------+   |
|             |                                                                                        |
|             |  +-- ITEMS TABLE ----------------------------------------+  +-- QUICK ENTRY ---------+|
|             |  |                                                       |  |                        ||
|             |  | [All] [Pending] [Counted] [Variance]   [Search___]    |  | SCAN OR ENTER          ||
|             |  | ===                                                   |  |                        ||
|             |  |                                                       |  | +--------------------+ ||
|             |  | +----------------------------------------------------+|  | | [Scan Barcode]     | ||
|             |  | | Stat | Product         | SKU    | Exp | Cnt | Var ||  | +--------------------+ ||
|             |  | +----------------------------------------------------+|  |                        ||
|             |  | | [?]  | 10kWh LFP Battery  | BAT-LFP-10KWH | 53  |  -  |  -  ||  | OR                     ||
|             |  | | [ok] | Solar Panel 400 | SOL-RES-400W | 62  | 62  |  0  ||  |                        ||
|             |  | | [!]  | 5kW Hybrid Inverter    | INV-HYB-5KW | 27  | 25  | -2  ||  | Product:               ||
|             |  | | [-]  | Battery 10kWh   | BP-10K | 38  | 37  | -1  ||  | +--------------------+ ||
|             |  | | [+]  | Cable Kit Pro   | CK-PRO | 89  | 91  | +2  ||  | | [Search/scan...]   | ||
|             |  | | [ok] | Mounting Rails  | MR-STD | 145 | 145 |  0  ||  | +--------------------+ ||
|             |  | | [ok] | Bracket Set     | BS-100 | 234 | 234 |  0  ||  |                        ||
|             |  | | [?]  | Connector Kit   | CN-KIT | 56  |  -  |  -  ||  | Quantity:              ||
|             |  | | [?]  | Wire Harness    | WH-PRO | 78  |  -  |  -  ||  | +--------------------+ ||
|             |  | +----------------------------------------------------+|  | |  1                 | ||
|             |  |                                                       |  | +--------------------+ ||
|             |  | < 1 2 3 4 5 >                                         |  |                        ||
|             |  +-------------------------------------------------------+  | [Add Count]            ||
|             |                                                              |                        ||
|             |                                                              | Recent:                ||
|             |                                                              | BAT-LFP-10KWH: 53 (0)        ||
|             |                                                              | SOL-RES-400W: 62 (0)        ||
|             |                                                              | INV-HYB-5KW: 25 (-2)       ||
|             |                                                              +------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Complete Count Modal - Desktop

```
+======================================================================================================+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  | COMPLETE STOCK COUNT - COUNT-2026-0015                                                    [X] |  |
|  +================================================================================================+  |
|  |                                                                                                |  |
|  |  +-- SUMMARY -------------------------------------------+  +-- ADJUSTMENTS PREVIEW ----------+|  |
|  |  |                                                      |  |                                  ||  |
|  |  |  Count Statistics                                    |  |  7 adjustments will be made      ||  |
|  |  |  ───────────────────────────────────────            |  |                                  ||  |
|  |  |                                                      |  |  +------------------------------+||  |
|  |  |  Total Items:        45                              |  |  | Product     | Exp | Act | Var|||  |
|  |  |  Counted:           45 (100%)                        |  |  +------------------------------+||  |
|  |  |  Matched:           38 (84%)                         |  |  | Widget Pro  | 53  | 56  | +3 |||  |
|  |  |  With Variance:      7 (16%)                         |  |  | Inverter    | 27  | 25  | -2 |||  |
|  |  |                                                      |  |  | Battery     | 38  | 37  | -1 |||  |
|  |  |  Variance Summary                                    |  |  | Cable Kit   | 89  | 91  | +2 |||  |
|  |  |  ───────────────────────────────────────            |  |  | Connector   | 56  | 55  | -1 |||  |
|  |  |                                                      |  |  | Wire Harn.  | 78  | 79  | +1 |||  |
|  |  |  Over (+):           3 items  (+6 units)             |  |  | Bracket     | 234 | 232 | -2 |||  |
|  |  |  Short (-):          4 items  (-6 units)             |  |  +------------------------------+||  |
|  |  |  Net Change:         0 units                         |  |                                  ||  |
|  |  |                                                      |  |  Net: 0 units                    ||  |
|  |  |  Value Impact                                        |  |  Value: +$0.00                   ||  |
|  |  |  ───────────────────────────────────────            |  |                                  ||  |
|  |  |                                                      |  +----------------------------------+|  |
|  |  |  Current Value:     $85,450.00                       |                                      |  |
|  |  |  Adjusted Value:    $85,450.00                       |  +-- OPTIONS -----------------------+|  |
|  |  |  Value Change:      +$0.00                           |  |                                  ||  |
|  |  |                                                      |  |  Adjustment Reason *             ||  |
|  |  +------------------------------------------------------+  |  +----------------------------+ ||  |
|  |                                                             |  | [v] Stock count recon.     | ||  |
|  |                                                             |  +----------------------------+ ||  |
|  |                                                             |                                  ||  |
|  |                                                             |  Notes                           ||  |
|  |                                                             |  +----------------------------+ ||  |
|  |                                                             |  | Monthly Jan cycle count    | ||  |
|  |                                                             |  +----------------------------+ ||  |
|  |                                                             |                                  ||  |
|  |                                                             |  [x] Send notification to mgr   ||  |
|  |                                                             |  [x] Generate variance report   ||  |
|  |                                                             |                                  ||  |
|  |                                                             +----------------------------------+|  |
|  |                                                                                                |  |
|  +------------------------------------------------------------------------------------------------+  |
|  |                                                                                                |  |
|  |                                    ( Save as Draft )  ( Cancel )   [ Confirm & Apply ]         |  |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
COUNTS LIST LOADING:
+-------------------------------------------------------------------+
| Count #       | Status      | Items    | Variance | Date          |
+-------------------------------------------------------------------+
| [...........................] | [.......] | [......] | [........] |
| [...........................] | [.......] | [......] | [........] |
| [...........................] | [.......] | [......] | [........] |
+-------------------------------------------------------------------+
↑ Skeleton rows with shimmer

COUNT ITEMS LOADING:
+----------------------------------------------------+
| Stat | Product         | SKU    | Exp | Cnt | Var |
+----------------------------------------------------+
| [.] | [..............] | [....] | [.] | [.] | [.] |
| [.] | [..............] | [....] | [.] | [.] | [.] |
| [.] | [..............] | [....] | [.] | [.] | [.] |
+----------------------------------------------------+

BARCODE SCANNING:
+-------------------------------------+
|                                     |
|     +-------------------------+     |
|     |   Scanning...           |     |
|     |   [===============    ] |     |
|     +-------------------------+     |
|                                     |
+-------------------------------------+

APPLYING ADJUSTMENTS:
+------------------------------------+
|                                    |
|   Applying adjustments...          |
|   +----------------------------+   |
|   | [============          ]   |   |
|   +----------------------------+   |
|                                    |
|   Processing 7 of 7 items...       |
|                                    |
+------------------------------------+
```

### Empty States

```
NO STOCK COUNTS:
+-------------------------------------+
|                                     |
|         +-------------+             |
|         |  [clipboard] |            |
|         +-------------+             |
|                                     |
|     No Stock Counts Yet             |
|                                     |
|  Start a stock count to verify      |
|  your inventory accuracy.           |
|                                     |
|  [+ Start First Count]              |
|                                     |
+-------------------------------------+

NO ITEMS TO COUNT (filtered):
+-------------------------------------+
|                                     |
|  No items match your filters        |
|                                     |
|  Try adjusting your category        |
|  or location filters.               |
|                                     |
|  [Clear Filters]                    |
|                                     |
+-------------------------------------+

COUNT IN PROGRESS BY ANOTHER USER:
+-------------------------------------+
| [!] Active Count in Progress        |
|                                     |
| COUNT-2026-0015 is currently        |
| being counted by Sarah K.           |
|                                     |
| Started 2 hours ago                 |
| Progress: 12/45 items               |
|                                     |
| [Join Count] [Start New Count]      |
+-------------------------------------+
```

### Error States

```
SCAN FAILED:
+-------------------------------------+
| [!] Barcode Not Recognized          |
|                                     |
| Could not find a product matching   |
| barcode: 7891234567890              |
|                                     |
| [Try Again] [Enter Manually]        |
+-------------------------------------+

SAVE FAILED:
+-------------------------------------+
| [!] Could Not Save Count            |
|                                     |
| Your count data has been saved      |
| locally and will sync when          |
| connection is restored.             |
|                                     |
| [Retry Now] [Continue Offline]      |
+-------------------------------------+

CONFLICT DETECTED:
+-------------------------------------+
| [!] Count Conflict                  |
|                                     |
| 10kWh LFP Battery was updated by       |
| another user during your count.     |
|                                     |
| Your count: 56                      |
| Current stock: 58 (received +5)     |
|                                     |
| [Use My Count] [Recount Item]       |
+-------------------------------------+

CANNOT COMPLETE:
+-------------------------------------+
| [!] Cannot Complete Count           |
|                                     |
| 33 items have not been counted.     |
|                                     |
| Complete all items or use           |
| "Save as Draft" to continue later.  |
|                                     |
| [Continue Counting] [Save Draft]    |
+-------------------------------------+
```

### Success States

```
COUNT STARTED:
+-------------------------------------+
| [ok] Stock Count Started            |
|                                     |
| COUNT-2026-0016                     |
| 45 items ready for counting         |
|                                     |
| [Start Counting]                    |
+-------------------------------------+

ITEM COUNTED:
+-------------------------------------+
| [ok] 10kWh LFP Battery counted         |
|                                     |
| Counted: 56                         |
| Variance: +3                        |
|                                     |
| (Auto-dismiss in 2s)                |
+-------------------------------------+

COUNT COMPLETED:
+-------------------------------------+
| [ok] Stock Count Completed          |
|                                     |
| COUNT-2026-0015                     |
| 45 items counted                    |
| 7 adjustments applied               |
|                                     |
| [View Report] [Done]                |
+-------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Counts List**
   - Tab to Start New Count button
   - Tab to tab filters
   - Tab through table rows
   - Tab to pagination

2. **Count Entry**
   - Tab to progress bar (informational)
   - Tab to filter tabs
   - Tab to search
   - Tab through item rows
   - Tab to quantity input for current item
   - Tab to +/- buttons
   - Tab to Mark Counted button
   - Tab to Complete Count button

3. **Scan Mode**
   - Focus on scan viewport
   - Tab to manual entry button
   - Tab to scan history
   - Escape exits scan mode

### ARIA Requirements

```html
<!-- Progress Bar -->
<div
  role="progressbar"
  aria-valuenow="27"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Count progress: 12 of 45 items, 27 percent"
>
  <div style="width: 27%"></div>
</div>

<!-- Items Table -->
<table
  role="grid"
  aria-label="Stock count items"
  aria-describedby="count-summary"
>
  <tr role="row" aria-selected="true">
    <td role="gridcell">
      <span aria-label="Status: Pending count">?</span>
    </td>
    <td role="gridcell">10kWh LFP Battery</td>
  </tr>
</table>

<!-- Variance Indicator -->
<span
  role="status"
  aria-live="polite"
  aria-label="Variance: negative 2, shortage"
  class="variance-negative"
>
  -2
</span>

<!-- Quantity Input -->
<div role="group" aria-label="Quantity counter for 10kWh LFP Battery">
  <button aria-label="Decrease by 1">-</button>
  <input
    type="number"
    aria-label="Counted quantity"
    aria-describedby="expected-qty"
  />
  <button aria-label="Increase by 1">+</button>
</div>
<span id="expected-qty">Expected: 53 units</span>

<!-- Barcode Scanner -->
<div
  role="application"
  aria-label="Barcode scanner active"
  aria-live="polite"
>
  <p>Point camera at product barcode</p>
</div>
```

### Screen Reader Announcements

- Count started: "Stock count started with 45 items"
- Item scanned: "10kWh LFP Battery scanned, counted 1, total 54"
- Variance detected: "Variance detected: negative 2 for 5kW Hybrid Inverter"
- Item completed: "10kWh LFP Battery counted, 53 units, no variance"
- Count progress: "12 of 45 items counted, 27 percent complete"
- Count completed: "Stock count completed, 7 adjustments applied"

---

## Animation Choreography

### Count Entry

```
QUANTITY UPDATE:
- Duration: 200ms
- Number: scale up slightly, color flash
- Input border: highlight color (green/red based on variance)

ITEM MARKED COUNTED:
- Duration: 300ms
- Checkmark: scale in from center
- Row: slide to appropriate section (variance filter)
- Progress bar: animate width increase
- Count badge: pulse update

VARIANCE HIGHLIGHT:
- Duration: 250ms
- Border-left: animate color (gray -> red/green/blue)
- Background: fade in tint
- Icon: rotate in
```

### Barcode Scan

```
SCAN SUCCESS:
- Duration: 150ms
- Screen flash: green border
- Sound: success beep
- Haptic: light vibration
- Item highlight: pulse in list

SCAN FAIL:
- Duration: 200ms
- Screen flash: red border
- Sound: error tone
- Haptic: double vibration
- Message: slide in from bottom
```

### Complete Count

```
MODAL OPEN:
- Duration: 300ms
- Backdrop: fade in
- Modal: slide up + fade in
- Content: stagger in

ADJUSTMENTS APPLIED:
- Duration: 500ms per item
- Progress bar: animate
- Items: fade to green checkmarks
- Total: count up animation

SUCCESS:
- Duration: 400ms
- Confetti: subtle celebration
- Checkmark: scale in
- Modal: hold 1s, then fade out
```

---

## Component Props Interfaces

```typescript
// Stock Counts List
interface StockCountsListProps {
  /** Initial status filter */
  initialStatus?: 'all' | 'in_progress' | 'completed' | 'cancelled';
  /** Search query */
  searchQuery?: string;
  /** Date range filter */
  dateRange?: { start: Date; end: Date };
  /** Callback when count selected */
  onSelectCount?: (countId: string) => void;
  /** Callback when new count started */
  onStartCount?: () => void;
}

interface StockCount {
  id: string;
  countNumber: string;
  organizationId: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  type: 'full' | 'partial';
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  completedBy?: string;
  notes?: string;
  itemCount: number;
  countedCount: number;
  varianceCount: number;
}

// Start Count Dialog
interface StartCountDialogProps {
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Callback on count started */
  onStarted?: (count: StockCount) => void;
}

interface StartCountFormValues {
  type: 'full' | 'partial';
  categoryIds?: string[];
  locationIds?: string[];
  productIds?: string[];
  notes?: string;
}

// Count Entry
interface CountEntryProps {
  /** Count ID */
  countId: string;
  /** Enable barcode scanning */
  enableScanning?: boolean;
  /** Callback on count completed */
  onComplete?: (count: StockCount) => void;
  /** Callback on count cancelled */
  onCancel?: (countId: string) => void;
}

interface StockCountItem {
  id: string;
  stockCountId: string;
  productId: string;
  productName: string;
  sku: string;
  locationId?: string;
  locationName?: string;
  expectedQty: number;
  countedQty?: number;
  variance?: number;
  countedAt?: Date;
  countedBy?: string;
}

// Count Item Row
interface CountItemRowProps {
  /** Item data */
  item: StockCountItem;
  /** Is currently selected */
  isSelected?: boolean;
  /** Callback when clicked */
  onClick?: () => void;
  /** Callback when quantity updated */
  onQuantityChange?: (quantity: number) => void;
  /** Callback when marked counted */
  onMarkCounted?: () => void;
  /** Show inline edit mode */
  inlineEdit?: boolean;
}

// Quantity Stepper
interface QuantityStepperProps {
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Large step increment (for +10/-10 buttons) */
  largeStep?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Expected value (for variance display) */
  expected?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// Barcode Scanner
interface BarcodeScannerProps {
  /** Is scanning active */
  active: boolean;
  /** Callback when barcode scanned */
  onScan: (barcode: string) => void;
  /** Callback when scanner closed */
  onClose: () => void;
  /** Supported barcode formats */
  formats?: ('ean-13' | 'upc-a' | 'code-128' | 'qr')[];
  /** Show scan history */
  showHistory?: boolean;
}

// Variance Indicator
interface VarianceIndicatorProps {
  /** Expected quantity */
  expected: number;
  /** Counted quantity */
  counted?: number;
  /** Show as badge or inline */
  variant?: 'badge' | 'inline' | 'detailed';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
}

// Complete Count Dialog
interface CompleteCountDialogProps {
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Count to complete */
  count: StockCount;
  /** Items with variance */
  varianceItems: StockCountItem[];
  /** Callback on completion */
  onComplete?: (adjustments: StockAdjustment[]) => void;
}

interface StockAdjustment {
  productId: string;
  productName: string;
  previousQty: number;
  newQty: number;
  variance: number;
  reason: string;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/inventory/stock-counts/index.tsx` | Stock counts list page |
| `src/routes/_authed/inventory/stock-counts/$countId.tsx` | Count entry page |
| `src/components/domain/inventory/stock-count-form.tsx` | Start count dialog |
| `src/components/domain/inventory/count-item-row.tsx` | Individual item row |
| `src/components/domain/inventory/quantity-stepper.tsx` | +/- quantity control |
| `src/components/domain/inventory/barcode-scanner.tsx` | Camera barcode scanning |
| `src/components/domain/inventory/variance-indicator.tsx` | Variance display |
| `src/components/domain/inventory/complete-count-dialog.tsx` | Completion & adjustment preview |

---

## Design References

- **Variance Colors**: Red (#EF4444) for short, Blue (#3B82F6) for over, Green (#22C55E) for match
- **Progress Bar**: Green gradient fill with animation
- **Scan Feedback**: Border flash effect with haptic
- **Touch Targets**: 48px minimum for warehouse use with gloves
- **Typography**: Bold numbers for quantities, clear contrast for readability
