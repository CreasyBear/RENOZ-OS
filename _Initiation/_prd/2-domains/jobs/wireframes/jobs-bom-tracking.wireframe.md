# Jobs Domain Wireframe: BOM (Bill of Materials) Tracking (DOM-JOBS-002c)

**Story ID:** DOM-JOBS-002c
**Component Type:** DataTable with inline editing
**Aesthetic:** Rugged Utilitarian - designed for harsh field conditions
**Primary Device:** Mobile (field technicians)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### DataGrid Table
- **Pattern**: RE-UI DataGrid
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Material inventory tracking with inline quantity editing
  - Column sorting and filtering for SKU search
  - Row actions for add/remove materials

### Card Component
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Material summary cards with status indicators (not started, in progress, complete, over-used)
  - Progress visualization for usage tracking
  - Border-left color coding by completion state

### Input Controls
- **Pattern**: RE-UI Input + Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`, `base-button.tsx`
- **Features**:
  - Large touch-friendly increment/decrement buttons (48px) for quantity updates
  - Barcode scanner integration via camera input
  - Search input for material filtering

### Sheet/Dialog
- **Pattern**: RE-UI Sheet (mobile), Dialog (desktop)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`, `dialog.tsx`
- **Features**:
  - Bottom sheet for "Add Material" on mobile with drag handle
  - Responsive modal for desktop material selection
  - Preview and confirmation before adding materials

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `jobMaterials` table in `renoz-v2/lib/schema/job-materials.ts` | NOT CREATED |
| **Server Functions Required** | `addJobMaterial`, `updateJobMaterialUsage`, `reserveJobStock` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-002a (schema), DOM-JOBS-002b (server functions) | PENDING |

### Existing Schema Available
- `products` in `renoz-v2/lib/schema/products.ts` (product catalog)
- `inventoryItems` in `renoz-v2/lib/schema/products.ts` (stock tracking)
- `jobAssignments` in `renoz-v2/lib/schema/job-assignments.ts` (job link)

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **BOM Items**: Battery units, inverters, cables, mounting hardware, circuit breakers
- **Serialized Tracking**: Battery units track by serial number
- **Materials**: BAT-LFP-10KWH, INV-HYB-5KW, CAB-DC-50MM, BRK-100A
- **Terminology**: Use generic terms (e.g., "Battery Unit" not "PowerWall")

---

## Design Principles for Field Use

- **Touch targets:** Minimum 44px (prefer 48px for primary actions)
- **High contrast:** Dark text on light backgrounds, clear status colors
- **One-handed operation:** Primary actions reachable by thumb
- **Glove-friendly:** Extra padding, forgiving hit areas
- **Outdoor visibility:** No subtle grays, bold typography
- **Quick updates:** Tap-to-increment for usage tracking
- **Barcode scanning:** Camera integration for quick product lookup

---

## Mobile Wireframe (Primary - 375px)

### Materials List View

```
+=========================================+
| < Job #JOB-1234                    [*]  | <- Sync indicator
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] | <- Scrollable tabs
|                   ====                  |
+-----------------------------------------+
|                                         |
|  MATERIALS SUMMARY                      |
|  +-------------------------------------+|
|  | Total Cost         | $2,450.00      ||
|  | Items              | 12             ||
|  | Usage              | 8/12 items used||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [search] Search materials...        || <- 48px height
|  +-------------------------------------+|
|                                         |
|  ALLOCATED MATERIALS                    |
|  +-------------------------------------+|
|  | Battery Unit 10kWh LFP         [!]  || <- Low stock indicator
|  | SKU: BAT-LFP-10KWH                  ||
|  | +--------+   +------------------+   ||
|  | | Needed |   |      Used        |   ||
|  | |   2    |   |  [-] 1 [+]       |   || <- 48px +/- buttons
|  | +--------+   +------------------+   ||
|  | Unit: $4,500.00  Total: $9,000.00   ||
|  |                          <- SWIPE   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Hybrid Inverter 5kW                 ||
|  | SKU: INV-HYB-5KW                    ||
|  | +--------+   +------------------+   ||
|  | | Needed |   |      Used        |   ||
|  | |   1    |   |  [-] 1 [+]       |   || <- Fully used
|  | +--------+   +------------------+   ||
|  | Unit: $2,200.00  Total: $2,200.00  [X] || <- Checkmark when fully used
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | DC Cable 50mm                       ||
|  | SKU: CAB-DC-50MM                    ||
|  | +--------+   +------------------+   ||
|  | | Needed |   |      Used        |   ||
|  | |   20m  |   |  [-] 0m [+]      |   ||
|  | +--------+   +------------------+   ||
|  | Unit: $12.50/m  Total: $250.00      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Circuit Breaker 100A                ||
|  | SKU: BRK-100A                       ||
|  | +--------+   +------------------+   ||
|  | | Needed |   |      Used        |   ||
|  | |   2    |   |  [-] 0 [+]       |   ||
|  | +--------+   +------------------+   ||
|  | Unit: $75.00    Total: $150.00      ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|  +-------------------------------------+|
|  |     [scan] SCAN BARCODE             || <- 56px, camera action
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |     [+] ADD MATERIAL                || <- 56px FAB
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Material Card States

```
+-- NOT STARTED ------------------------------+
|  +----------------------------------------+ |
|  | Product Name                           | |
|  | SKU: ABC-123                           | |
|  | Needed: 5   |   Used: 0                | |
|  | Progress: [                    ]  0%   | | <- Empty progress
|  | Unit: $100   Total: $500               | |
|  +----------------------------------------+ |
|  Background: white                          |
|  Border-left: none                          |
+-----------------------------------------+

+-- IN PROGRESS ------------------------------+
|  +----------------------------------------+ |
|  | Product Name                           | |
|  | SKU: ABC-123                           | |
|  | Needed: 5   |   Used: 3                | |
|  | Progress: [##########          ]  60%  | | <- Partial progress
|  | Unit: $100   Total: $500               | |
|  +----------------------------------------+ |
|  Background: blue-50                        |
|  Border-left: 4px solid blue-500            |
+---------------------------------------------+

+-- COMPLETE ---------------------------------+
|  +----------------------------------------+ |
|  | Product Name                      [X]  | | <- Checkmark
|  | SKU: ABC-123                           | |
|  | Needed: 5   |   Used: 5                | |
|  | Progress: [####################] 100%  | |
|  | Unit: $100   Total: $500               | |
|  +----------------------------------------+ |
|  Background: green-50                       |
|  Border-left: 4px solid green-500           |
+---------------------------------------------+

+-- OVER-USED --------------------------------+
|  +----------------------------------------+ |
|  | Product Name                      [!]  | | <- Warning
|  | SKU: ABC-123                           | |
|  | Needed: 5   |   Used: 7 (+2 over)      | | <- Red text
|  | Progress: [####################+++] !  | | <- Overrun indicator
|  | Unit: $100   Total: $700 (+$200)       | | <- Cost overrun
|  +----------------------------------------+ |
|  Background: orange-50                      |
|  Border-left: 4px solid orange-500          |
+---------------------------------------------+

+-- LOW STOCK --------------------------------+
|  +----------------------------------------+ |
|  | Product Name                      [!]  | | <- Alert
|  | SKU: ABC-123                           | |
|  | Needed: 5   |   Stock: 2 (LOW)         | | <- Red warning
|  | [!] Only 2 in stock - 3 short          | |
|  | Unit: $100   Total: $500               | |
|  +----------------------------------------+ |
|  Background: red-50                         |
|  Border-left: 4px solid red-500             |
+---------------------------------------------+
```

### Swipe Actions (48px reveal)

```
+-------------------------------------------------------------+
|                                                             |
|  <- SWIPE LEFT reveals:                                     |
|  +----------------------------------------+-------+---------+
|  | Base Inverter Unit 24"                  | EDIT  | REMOVE  |
|  | Needed: 4  Used: 2                     | [pen] |   [X]   |
|  |                                        | gray  |   red   |
|  +----------------------------------------+-------+---------+
|                                                             |
+-------------------------------------------------------------+
```

### Quick Quantity Update (Tap +/-)

```
+-- TAP TO INCREMENT/DECREMENT -----------------------+
|                                                     |
|  User taps [+] button:                              |
|  +-----------------------------------------------+  |
|  |  [-] 2 [+]  ->  [-] 3 [+]                     |  |
|  |  |                                            |  |
|  | Haptic feedback                               |  |
|  | Number animates up                            |  |
|  | Progress bar updates                          |  |
|  | Cost recalculates                             |  |
|  | Server sync (debounced 500ms)                 |  |
|  +-----------------------------------------------+  |
|                                                     |
|  Long-press [+] or [-] for rapid increment:         |
|  - Accelerates after 500ms                          |
|  - Stops at limits (0 or max stock)                 |
|                                                     |
|  Overrun warning:                                   |
|  +-----------------------------------------------+  |
|  | [!] Used more than allocated. Continue?       |  |
|  |                    [Cancel] [Continue]        |  | <- 48px buttons
|  +-----------------------------------------------+  |
|                                                     |
+-----------------------------------------------------+
```

### Add Material Dialog (Bottom Sheet)

```
+=========================================+
| ====================================    | <- Drag handle
|                                         |
|  ADD MATERIAL                  [X]      | <- 48px close
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | [scan] Scan barcode to add          || <- Camera button
|  +-------------------------------------+|
|                                         |
|  ------- OR SEARCH -------              |
|                                         |
|  +-------------------------------------+|
|  | [search] Search products...         || <- Autocomplete
|  +-------------------------------------+|
|                                         |
|  RECENT PRODUCTS                        |
|  +-------------------------------------+|
|  | Base Inverter 24"         CAB-BASE-24||
|  | $350.00                    [+ ADD]  || <- 48px button
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | Upper Inverter 36"       CAB-UPPER-36||
|  | $275.00                    [+ ADD]  ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | Hardware Set              HW-CAB-SET||
|  | $25.00                     [+ ADD]  ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Add Material - Quantity Selection

```
+=========================================+
| ====================================    |
|                                         |
|  ADD MATERIAL                  [X]      |
|  -----------------------------------    |
|                                         |
|  SELECTED PRODUCT                       |
|  +-------------------------------------+|
|  | Base Inverter Unit 24"               ||
|  | SKU: CAB-BASE-24                    ||
|  | Unit Price: $350.00                 ||
|  | In Stock: 12 units                  ||
|  +-------------------------------------+|
|                                         |
|  QUANTITY REQUIRED                      |
|  +-------------------------------------+|
|  |                                     ||
|  |    [-]      4      [+]              || <- Large 56px buttons
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Subtotal:            $1,400.00      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |       [ADD TO JOB]                  || <- 56px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                   ====                  |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |   [box]     |              |
|            |             |              |
|            +-------------+              |
|                                         |
|       NO MATERIALS ADDED                |
|                                         |
|   Add materials to track inventory      |
|   usage and costs for this job.         |
|                                         |
|   +-----------------------------+       |
|   |     [scan] SCAN BARCODE     |       | <- 56px CTA
|   +-----------------------------+       |
|                                         |
|   +-----------------------------+       |
|   |     [+] ADD MATERIAL        |       | <- 56px secondary
|   +-----------------------------+       |
|                                         |
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                   ====                  |
+-----------------------------------------+
|                                         |
|  MATERIALS SUMMARY                      |
|  +-------------------------------------+|
|  | ...............   | ...........     ||
|  | ...............   | ...........     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ....................................||
|  | .........................           ||
|  | ............    ............        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ....................................||
|  | .........................           ||
|  | ............    ............        ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px - Office Use)

```
+=======================================================================+
| < Back | Job #JOB-1234 - Install 10kWh battery system       [Sync *] [Actions v]|
+-----------------------------------------------------------------------+
| [Overview] [Tasks] [Materials] [Time] [Checklist] [Photos] [Notes]    |
|                    ===========                                        |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- MATERIALS SUMMARY ----------------+  +-- COST BREAKDOWN ---------+
|  |                                     |  |                           |
|  |  Total Materials:    12 items       |  |  Budgeted:    $3,000.00   |
|  |  Used:               8 items        |  |  Actual:      $2,450.00   |
|  |  Completion:         67%            |  |  Variance:    -$550.00    |
|  |                                     |  |  Status: UNDER BUDGET [X] |
|  +-------------------------------------+  +---------------------------+
|                                                                       |
|  +-- MATERIALS LIST --------------------------------------------------|
|  |                                                                    |
|  |  [search] Search materials...            [scan] Scan  [+] Add      |
|  |  ---------------------------------------------------------------------
|  |                                                                    |
|  |  +--- Material ----+-- SKU -------+-- Qty ---+-- Used --+-- Cost --+
|  |  | Base Inverter 24"| CAB-BASE-24  |    4     | [-]2[+]  | $1,400   |
|  |  | [!] Low stock   |              |          | ######   |          |
|  |  +------------------------------------------------------------------+
|  |  | Upper Inverter   | CAB-UPPER-36 |    3     | [-]3[+]  |   $825   |
|  |  |                 |              |          | ######   |    [X]   |
|  |  +------------------------------------------------------------------+
|  |  | Hardware Set    | HW-CAB-SET   |    7     | [-]0[+]  |   $175   |
|  |  |                 |              |          | [    ]   |          |
|  |  +------------------------------------------------------------------+
|  |  | Countertop Gran | CT-GRANITE-8 |    1     | [-]0[+]  |   $450   |
|  |  |                 |              |          | [    ]   |          |
|  |  +------------------------------------------------------------------+
|  |  | Sink - Stainles | SINK-SS-DBL  |    1     | [-]1[+]  |   $299   |
|  |  |                 |              |          | ######   |    [X]   |
|  |  +------------------------------------------------------------------+
|  |                                                                    |
|  +--------------------------------------------------------------------+
|                                                                       |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+ - Admin/Office Manager)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Jobs                                                                        |
| Customers   |                                                                                        |
| Orders      |  Job #JOB-1234 - 45 Industrial Rd - Install 10kWh battery system                                      |
| Products    |  Customer: Acme Corp          Status: [In Progress]      [Edit Job] [Actions v]        |
| Jobs <      |  ----------------------------------------------------------------------------------    |
| Pipeline    |                                                                                        |
| Support     |  [Overview] [Tasks] [Materials] [Time Tracking] [Checklist] [Photos] [Notes]           |
|             |                      ===========                                                       |
|             |                                                                                        |
|             |  +-- MATERIALS (BOM) ------------------------------------------------------------------|
|             |  |                                                                                     |
|             |  |  +-- Summary Cards ------------------------------------------------------------+    |
|             |  |  | [Total Items]  | [Used]        | [Budget]      | [Actual]      | [Variance] |    |
|             |  |  | 12 items       | 8 (67%)       | $3,000.00     | $2,450.00     | -$550 [X]  |    |
|             |  |  +-------------------------------------------------------------------------+    |
|             |  |                                                                                     |
|             |  |  +-- Actions Bar ---------------------------------------------------------------+   |
|             |  |  | [search] Search materials...     [scan] Scan Barcode  [Reserve Stock]  [+ Add] | |
|             |  |  +-----------------------------------------------------------------------------+   |
|             |  |                                                                                     |
|             |  |  +-- Materials Table -----------------------------------------------------------+   |
|             |  |  | [ ] | SKU          | Product                | Qty Req | Qty Used | Unit    | Total    | Status   |
|             |  |  +-------------------------------------------------------------------------------------------+
|             |  |  | [ ] | CAB-BASE-24  | Base Inverter Unit 24"  |    4    | [-]2[+]  | $350.00 | $1,400.00| In Progress |
|             |  |  |     |              | [!] Low stock warning  |         |          |         |          |          |
|             |  |  +-------------------------------------------------------------------------------------------+
|             |  |  | [ ] | CAB-UPPER-36 | Upper Inverter Unit 36" |    3    | [-]3[+]  | $275.00 |  $825.00 | Complete [X] |
|             |  |  +-------------------------------------------------------------------------------------------+
|             |  |  | [ ] | HW-CAB-SET   | Inverter Hardware Set   |    7    | [-]0[+]  |  $25.00 |  $175.00 | Not Started |
|             |  |  +-------------------------------------------------------------------------------------------+
|             |  |  | [ ] | CT-GRANITE-8 | Countertop Granite 8ft |    1    | [-]0[+]  | $450.00 |  $450.00 | Not Started |
|             |  |  +-------------------------------------------------------------------------------------------+
|             |  |  | [ ] | SINK-SS-DBL  | Sink Stainless Double  |    1    | [-]1[+]  | $299.00 |  $299.00 | Complete [X] |
|             |  |  +-------------------------------------------------------------------------------------------+
|             |  |                                                                                     |
|             |  |  +-- Bulk Actions (when selected) -----------------------------------------------+  |
|             |  |  | 3 selected    [Reserve Stock] [Remove from Job] [Export CSV]     [Deselect]  |  |
|             |  |  +-----------------------------------------------------------------------------+  |
|             |  |                                                                                     |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Barcode Scanning Flow

```
+-- BARCODE SCAN FLOW ---------------------------------------+
|                                                            |
|  1. User taps [scan] SCAN BARCODE button                   |
|                                                            |
|  2. Camera view opens (fullscreen on mobile)               |
|  +------------------------------------------------------+  |
|  |                                                      |  |
|  |   +----------------------------------------------+   |  |
|  |   |                                              |   |  |
|  |   |      Aim camera at barcode                   |   |  |
|  |   |                                              |   |  |
|  |   |   +----------------------------------+       |   |  |
|  |   |   |  [ | | | | |  | | || | | | ]    |       |   |  | <- Viewfinder
|  |   |   +----------------------------------+       |   |  |
|  |   |                                              |   |  |
|  |   +----------------------------------------------+   |  |
|  |                                                      |  |
|  |   [torch] Toggle Flash    [X] Close                  |  | <- 48px buttons
|  |                                                      |  |
|  +------------------------------------------------------+  |
|                                                            |
|  3. On successful scan:                                    |
|  - Haptic feedback (success)                               |
|  - Flash green overlay                                     |
|  - Product lookup                                          |
|                                                            |
|  4a. If product found in catalog:                          |
|  +------------------------------------------------------+  |
|  |  [X] PRODUCT FOUND                                   |  |
|  |  ------------------------------------------------    |  |
|  |  Base Inverter Unit 24"                               |  |
|  |  SKU: CAB-BASE-24                                    |  |
|  |  Price: $350.00                                      |  |
|  |  In Stock: 12                                        |  |
|  |                                                      |  |
|  |  Quantity: [-]  1  [+]                               |  |
|  |                                                      |  |
|  |  [ADD TO JOB]                [SCAN ANOTHER]          |  | <- 48px buttons
|  +------------------------------------------------------+  |
|                                                            |
|  4b. If product NOT found:                                 |
|  +------------------------------------------------------+  |
|  |  [!] PRODUCT NOT FOUND                               |  |
|  |  ------------------------------------------------    |  |
|  |  Barcode: 1234567890123                              |  |
|  |                                                      |  |
|  |  This product is not in your catalog.                |  |
|  |                                                      |  |
|  |  [CREATE PRODUCT]            [SCAN ANOTHER]          |  |
|  +------------------------------------------------------+  |
|                                                            |
+------------------------------------------------------------+
```

---

## Reserve Stock Flow

```
+-- RESERVE STOCK CONFIRMATION ------------------------------+
|                                                            |
|  Triggered from desktop "Reserve Stock" button             |
|                                                            |
|  +------------------------------------------------------+  |
|  |                                                      |  |
|  |  RESERVE INVENTORY FOR JOB                           |  |
|  |  ------------------------------------------------    |  |
|  |                                                      |  |
|  |  This will reserve the following items from          |  |
|  |  inventory for Job #JOB-1234:                        |  |
|  |                                                      |  |
|  |  +--------------------------------------------------+|  |
|  |  | Product                | Qty   | Available       ||  |
|  |  |------------------------|-------|-----------------|  |
|  |  | Base Inverter 24"       |  4    | 12 -> 8        ||  |
|  |  | Upper Inverter 36"      |  3    | 8 -> 5         ||  |
|  |  | Hardware Set           |  7    | 50 -> 43       ||  |
|  |  | Countertop Granite     |  1    | 3 -> 2         ||  |
|  |  +--------------------------------------------------+|  |
|  |                                                      |  |
|  |  [!] 1 item has insufficient stock:                  |  |
|  |  - Sink Stainless: Need 1, Only 0 available         |  |
|  |                                                      |  |
|  |            [Cancel]           [Reserve Available]    |  |
|  |                                                      |  |
|  +------------------------------------------------------+  |
|                                                            |
+------------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Quantity +/- | aria-label="Increase/Decrease quantity" | +/- keys | 48x48px |
| Material row | role="row" | Tab focus | Full row tappable |
| Scan button | aria-label="Scan barcode" | Enter | 56px height |
| Search input | role="searchbox" | Type to filter | 48px height |
| Progress bar | role="progressbar" | - | - |
| Stock warning | role="alert" | - | - |

---

## Offline Behavior

```
+-- OFFLINE MODE --------------------------------------------+
|                                                            |
|  Usage updates:                                            |
|  - Work locally, queue for sync                            |
|  - Dotted border on modified cards                         |
|  - Toast: "Saved offline. Will sync when online."          |
|                                                            |
|  Barcode scanning:                                         |
|  - Uses cached product catalog                             |
|  - New products cannot be created offline                  |
|  - Toast: "Offline - using cached catalog"                 |
|                                                            |
|  Stock levels:                                             |
|  - Show last known values                                  |
|  - "[!] Stock levels may be outdated"                      |
|                                                            |
+------------------------------------------------------------+
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Materials list | JobMaterialsTab | - |
| Material card | MaterialCard | Card |
| Quantity control | QuantityControl | Button, Input |
| Progress bar | MaterialProgress | Progress |
| Add material dialog | AddMaterialDialog | Sheet (mobile), Dialog (desktop) |
| Barcode scanner | BarcodeScanner | - (custom) |
| Empty state | EmptyState | - |
| Loading skeleton | MaterialsTableSkeleton | Skeleton |

---

## Files to Create/Modify

- src/components/domain/jobs/job-materials-tab.tsx (create)
- src/components/domain/jobs/material-card.tsx (create)
- src/components/domain/jobs/add-material-dialog.tsx (create)
- src/components/domain/jobs/quantity-control.tsx (create)
- src/components/domain/jobs/barcode-scanner.tsx (create)
- src/routes/installer/jobs/$jobId.tsx (modify: add BOM tab)
