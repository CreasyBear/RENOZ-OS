# Order Fulfillment Workflow Wireframe
## WF-FULFILLMENT: From Order Confirmation to Delivery

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/order-fulfillment.prd.json
**Priority:** 2 (Operational efficiency critical)

---

## Overview

The Order Fulfillment workflow manages the complete process from order confirmation through delivery. This wireframe covers:
- Fulfillment queue (Kanban-style)
- Stock allocation
- Pick list generation
- Packing workflow
- Shipping and tracking
- Fulfillment metrics

**Workflow Stages:** Order Confirmed -> Allocate Stock -> Pick Items -> Pack Order -> Ship -> Deliver

**Aesthetic:** "Warehouse efficiency" - Clear status visibility, batch operations, mobile-friendly

---

## Progress Indicator Design

### Fulfillment Pipeline Status Bar
```
+================================================================================+
|                                                                                 |
|  ORDER STATUS PIPELINE                                                         |
|                                                                                 |
|  [CONFIRMED]-->[ALLOCATED]-->[PICKING]-->[PACKING]-->[SHIPPED]-->[DELIVERED]   |
|       *                                                                         |
|    (current)                                                                    |
|                                                                                 |
|  Order #ORD-2026-0123 | Created: Jan 10, 2026 | Customer: Acme Corp            |
|                                                                                 |
+================================================================================+

Status Colors:
- Confirmed: Blue (new)
- Allocated: Purple (stock reserved)
- Picking: Orange (in warehouse)
- Packing: Teal (verification)
- Shipped: Green (in transit)
- Delivered: Green with checkmark (complete)
```

### Vertical Pipeline (Mobile)
```
+================================+
| Order #ORD-2026-0123           |
+================================+
|                                |
| [*] Confirmed                  |
|  |  Jan 10, 9:15 AM            |
|  |                             |
| [*] Stock Allocated            |
|  |  Jan 10, 9:20 AM            |
|  |  <- CURRENT                 |
|  |                             |
| [ ] Picking                    |
|  :  Not started                |
|  :                             |
| [ ] Packing                    |
|  :                             |
| [ ] Shipped                    |
|  :                             |
| [ ] Delivered                  |
|                                |
+================================+
```

---

## Fulfillment Queue (Kanban Board)

### Desktop View (1280px+)
```
+================================================================================+
| FULFILLMENT QUEUE                                    [+ Quick Add] [Refresh]    |
+================================================================================+
|                                                                                 |
+=== QUEUE METRICS (aria-live="polite") ========================================+
| +------------------+ +------------------+ +------------------+ +---------------+|
| | To Allocate      | | To Pick          | | To Pack          | | To Ship      ||
| |      12          | |      8           | |      5           | |      3       ||
| | [Priority: 4]    | | [Urgent: 2]      | | [Ready: 5]       | | [Today: 3]   ||
| +------------------+ +------------------+ +------------------+ +---------------+|
+=================================================================================+
|                                                                                 |
+=== FILTER BAR (role="search") =================================================+
| [Search orders..._______] [Today's Shipments] [Priority] [Backorders] [Clear]  |
|                                                                                 |
| Batch Actions: [Select All] [Allocate Selected] [Assign Picker v]              |
+=================================================================================+
|                                                                                 |
+=== KANBAN BOARD (role="region" aria-label="Fulfillment queue") ===============+
|                                                                                 |
| +-- TO ALLOCATE --+ +-- TO PICK ------+ +-- TO PACK ------+ +-- TO SHIP -----+|
| | (12 orders)     | | (8 orders)      | | (5 orders)      | | (3 orders)     ||
| | $45,000 total   | | $32,000 total   | | $18,000 total   | | $12,000 total  ||
| +------------------+ +------------------+ +------------------+ +----------------+|
| |                  | |                  | |                  | |              | |
| | +==============+ | | +==============+ | | +==============+ | | +===========+| |
| | |ORD-2026-0125|| | | |ORD-2026-0120|| | | |ORD-2026-0115|| | | |ORD-2026- ||| |
| | | Acme Corp   || | | | Tech Inc     || | | | GlobalCo    || | | |  0110    ||| |
| | | 5 items     || | | | 3 items      || | | | 8 items     || | | | 2 items  ||| |
| | | $2,500      || | | | $1,800       || | | | $4,200      || | | | $950     ||| |
| | | [!] URGENT  || | | | Picker: John || | | | All picked  || | | | [Print]  ||| |
| | | Ship: Today || | | | 50% picked   || | | | [Pack]      || | | | [Ship]   ||| |
| | | [Allocate]  || | | | [View List]  || | | |             || | | |          ||| |
| | +==============+ | | +==============+ | | +==============+ | | +===========+| |
| |                  | |                  | |                  | |              | |
| | +--------------+ | | +--------------+ | | +--------------+ | |              | |
| | | ORD-2026-124 | | | | ORD-2026-119 | | | | ORD-2026-114 | | |              | |
| | | BigCo Ltd    | | | | StartupX     | | | | Enterprise   | | |              | |
| | | 2 items      | | | | 1 item       | | | | 4 items      | | |              | |
| | | $1,200       | | | | $3,200         | | | | $2,100       | | |              | |
| | +--------------+ | | +--------------+ | | +--------------+ | |              | |
| +------------------+ +------------------+ +------------------+ +----------------+|
|                                                                                 |
+=================================================================================+

LEGEND:
[!] URGENT  = Priority order (red border)
Ship: Today = Same-day shipping required
Picker: X   = Assigned to picker
% picked    = Progress indicator
```

### Tablet View (768px - 1024px)
```
+================================================================+
| Fulfillment Queue                        [Filter v] [Refresh]   |
+================================================================+
| To Allocate: 12 | To Pick: 8 | To Pack: 5 | To Ship: 3         |
+================================================================+
|                                                                 |
| <- Horizontal scroll for columns ->                             |
| +============================================================+ |
| | +-- ALLOCATE -+ +-- PICK ----+ +-- PACK ----+ +-- SHIP ---+| |
| | | (12)        | | (8)        | | (5)        | | (3)       || |
| | +-------------+ +-------------+ +-------------+ +-----------+| |
| | |+----------+| |+----------+| |+----------+| |+----------+|| |
| | || ORD-125  || || ORD-120  || || ORD-115  || || ORD-110  ||| |
| | || Acme $2K || || Tech $1K || || GlblCo   || || BigCo    ||| |
| | || [!]Today || || John 50% || || [Pack]   || || [Ship]   ||| |
| | |+----------+| |+----------+| |+----------+| |+----------+|| |
| +============================================================+ |
|                                                                 |
+================================================================+
```

### Mobile View (< 640px)
```
+================================+
| Fulfillment          [=] [+]   |
+================================+
| [Allocate|Pick|Pack|Ship]      |
|     ^active                    |
+================================+
|                                |
| TO ALLOCATE (12 orders)        |
| Total Value: $45,000           |
|                                |
| +----------------------------+ |
| | ORD-2026-0125              | |
| | Acme Corp                  | |
| | 5 items | $2,500           | |
| | [!] URGENT - Ship Today    | |
| |            [Allocate ->]   | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ORD-2026-0124              | |
| | BigCo Ltd                  | |
| | 2 items | $1,200           | |
| |            [Allocate ->]   | |
| +----------------------------+ |
|                                |
| [Load More...]                 |
|                                |
+================================+
| [Bulk Select] [Batch Actions]  |
+================================+
```

---

## Stock Allocation Flow

### Allocation Dialog (Desktop)
```
+================================================================================+
| ALLOCATE STOCK - Order #ORD-2026-0125                                    [x]   |
+================================================================================+
|                                                                                 |
| Customer: Brisbane Solar Co                                                     |
| Ship Date: Jan 10, 2026 (TODAY - URGENT)                                       |
|                                                                                 |
| +-- ALLOCATION STATUS -------------------------------------------------------+ |
| |                                                                             | |
| | [===============================>                    ] 60% Allocated        | |
| |                                                                             | |
| | Item                  | Ordered | Available | Allocated | Status           | |
| |-----------------------+---------+-----------+-----------+------------------| |
| | 10kWh LFP Battery System X (WPX-01) |      10 |        15 |        10 | [*] Ready        | |
| | Bracket Set (BRK-02)  |       5 |         5 |         5 | [*] Ready        | |
| | Cable Kit (CBL-03)    |       3 |         1 |         1 | [!] Partial (2)  | |
| | Mounting Plate        |       2 |         0 |         0 | [x] No Stock     | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SHORTAGES ---------------------------------------------------------------+ |
| |                                                                             | |
| | [!] 2 items have stock shortages                                           | |
| |                                                                             | |
| | Cable Kit (CBL-03):                                                        | |
| |   Short: 2 units | ETA: Jan 15 (5 days)                                    | |
| |   [ ] Partial ship now, backorder rest                                     | |
| |   [ ] Wait for full stock                                                  | |
| |   [x] Substitute: Cable Kit Premium (3 in stock) +$10/unit                | |
| |                                                                             | |
| | Mounting Plate:                                                            | |
| |   Short: 2 units | ETA: Jan 20 (10 days)                                   | |
| |   [ ] Wait for stock                                                       | |
| |   [x] Hold entire order                                                    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SERIAL NUMBERS (Serialized Items) ---------------------------------------+ |
| |                                                                             | |
| | 10kWh LFP Battery System X - Select 10 units (FIFO recommended):                         | |
| | [x] SN-WPX-001 (Bin A1) - Oldest                                           | |
| | [x] SN-WPX-002 (Bin A1)                                                    | |
| | [x] SN-WPX-003 (Bin A2)                                                    | |
| | ... [View All 15 Available]                                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                              [Cancel]  [Allocate & Move to Pick Queue]        |
+================================================================================+
```

### Auto-Allocation Success Toast
```
+================================================================+
|                                                                 |
| [*] Stock Allocated Successfully                                |
|                                                                 |
| Order #ORD-2026-0125 - All items allocated                     |
| Moved to Pick Queue                                             |
|                                                                 |
| [View Pick List]                          [Dismiss] (5s)       |
+================================================================+
  role="status" aria-live="polite"
```

---

## Pick List Interface

### Pick List View (Desktop)
```
+================================================================================+
| PICK LIST - Order #ORD-2026-0125                              [Print PDF] [x]   |
+================================================================================+
|                                                                                 |
| Assigned Picker: John Smith                    Started: Jan 10, 10:15 AM       |
| Estimated Time: 15 mins                        Progress: 3 of 5 items          |
|                                                                                 |
| +-- PICK PROGRESS -----------------------------------------------------------+ |
| | [========================>                              ] 60%               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PICK ROUTE (Optimized by Bin Location) ----------------------------------+ |
| |                                                                             | |
| | Stop | Bin   | Item                | Qty | Serial#      | Status    | Pick  | |
| |------+-------+---------------------+-----+--------------+-----------+-------| |
| |  1   | A-01  | 10kWh LFP Battery System X        |  5  | SN-001-005   | [*] Picked|       | |
| |  2   | A-02  | 10kWh LFP Battery System X        |  5  | SN-006-010   | [*] Picked|       | |
| |  3   | B-03  | Bracket Set         |  5  | N/A          | [*] Picked|       | |
| |  4   | C-01  | Cable Kit           |  3  | N/A          | [ ] Pending| [Pick]| |
| |  5   | D-02  | Mounting Plate      |  2  | N/A          | [ ] Pending| [Pick]| |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- WAREHOUSE MAP (Simplified) ----------------------------------------------+ |
| |                                                                             | |
| |   [A]----[B]----[C]----[D]                                                 | |
| |    |      |      |      |                                                   | |
| |   01     03     01     02                                                   | |
| |    ^      ^      *      *                                                   | |
| |  done   done   next  pending                                               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                           [Short Pick Report]  [Complete Picking]              |
+================================================================================+
```

### Mobile Pick List (Warehouse Tablet/Phone)
```
+================================+
| PICK ORDER #ORD-2026-0125      |
+================================+
| John Smith | 3/5 items picked  |
| [=============>          ] 60% |
+================================+
|                                |
| NEXT PICK:                     |
| +----------------------------+ |
| | BIN: C-01                  | |
| |                            | |
| | Cable Kit (CBL-03)         | |
| | Qty: 3 units               | |
| |                            | |
| |     [Photo of item]        | |
| |                            | |
| | +------------------------+ | |
| | | [Scan Barcode]         | | |
| | | or                     | | |
| | | [Enter Qty: ___]       | | |
| | +------------------------+ | |
| |                            | |
| | [Short Pick] [Confirm Pick]| |
| +----------------------------+ |
|                                |
| REMAINING:                     |
| [ ] D-02: Mounting Plate (2)   |
|                                |
| COMPLETED:                     |
| [*] A-01: 10kWh LFP Battery System X (5)     |
| [*] A-02: 10kWh LFP Battery System X (5)     |
| [*] B-03: Bracket Set (5)      |
|                                |
+================================+
| [Pause]  [Complete All]        |
+================================+
```

### Short Pick Dialog
```
+================================================+
| SHORT PICK REPORT                          [x] |
+================================================+
|                                                |
| Item: Cable Kit (CBL-03)                       |
| Expected: 3 units                              |
| Found: 1 unit                                  |
|                                                |
| +-- REASON ----------------------------------+ |
| |                                            | |
| | ( ) Bin empty                              | |
| | (*) Fewer than expected                    | |
| | ( ) Item damaged                           | |
| | ( ) Wrong item in bin                      | |
| | ( ) Cannot locate                          | |
| +--------------------------------------------+ |
|                                                |
| Actual Quantity Found: [_1_]                   |
|                                                |
| Notes:                                         |
| [Only 1 unit in bin, system shows 3___]        |
|                                                |
| [Cancel]              [Report & Continue]      |
+================================================+
```

---

## Packing Workflow

### Packing Wizard (Desktop)
```
+================================================================================+
| PACK ORDER - #ORD-2026-0125                                              [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Verify     Add        Review     Complete                                      |
| Items     Package                                                              |
| (active)                                                                        |
+================================================================================+
|                                                                                 |
| STEP 1: VERIFY PICKED ITEMS                                                    |
|                                                                                 |
| Scan or check each item to verify:                                             |
|                                                                                 |
| +-- ITEMS TO VERIFY ---------------------------------------------------------+ |
| |                                                                             | |
| | [ ] 10kWh LFP Battery System X (WPX-01)        Qty: 10    [Scan] or [Manual Check]       | |
| |     Serial: SN-001 to SN-010                                               | |
| |                                                                             | |
| | [*] Bracket Set (BRK-02)         Qty: 5     [*] Verified                    | |
| |                                                                             | |
| | [ ] Cable Kit (CBL-03)           Qty: 1     [Scan] or [Manual Check]       | |
| |     (Note: 2 short - backorder created)                                    | |
| |                                                                             | |
| | [ ] Mounting Plate               Qty: 2     [Scan] or [Manual Check]       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Verification Progress: 1 of 4 items verified                                   |
| [========================>                                          ] 25%      |
|                                                                                 |
|                                                    [Continue to Package ->]    |
+================================================================================+
```

### Step 2: Add Package Details
```
+================================================================================+
| PACK ORDER - #ORD-2026-0125                                              [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Verify     Add        Review     Complete                                      |
| Items     Package                                                              |
|    *      (active)                                                             |
+================================================================================+
|                                                                                 |
| STEP 2: PACKAGE DETAILS                                                        |
|                                                                                 |
| +-- PACKAGE 1 ---------------------------------------------------------------+ |
| |                                                                             | |
| | Box Type: [Standard Medium v]          Dimensions: 40x30x20 cm            | |
| |                                                                             | |
| | Weight: [_4.5_] kg                     [Calculate from items]              | |
| |                                                                             | |
| | Contents:                                                                   | |
| | [x] 10kWh LFP Battery System X (10)                                                      | |
| | [x] Bracket Set (5)                                                        | |
| | [ ] Cable Kit (1)                                                          | |
| | [ ] Mounting Plate (2)                                                     | |
| |                                                                             | |
| | [Remove Package]                                                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PACKAGE 2 ---------------------------------------------------------------+ |
| |                                                                             | |
| | Box Type: [Small Flat v]               Dimensions: 20x20x5 cm              | |
| |                                                                             | |
| | Weight: [_0.5_] kg                                                         | |
| |                                                                             | |
| | Contents:                                                                   | |
| | [x] Cable Kit (1)                                                          | |
| | [x] Mounting Plate (2)                                                     | |
| |                                                                             | |
| | [Remove Package]                                                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [+ Add Another Package]                                                        |
|                                                                                 |
| Total Packages: 2 | Total Weight: 5.0 kg                                      |
|                                                                                 |
|                                    [<- Back]  [Continue to Review ->]          |
+================================================================================+
```

### Step 4: Packing Complete
```
+================================================================================+
| PACK ORDER - #ORD-2026-0125                                              [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Verify     Add        Review     Complete                                      |
| Items     Package                                                              |
|    *         *          *       (active)                                       |
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |         [Box/Package Icon]               |               |
|                     |                                          |               |
|                     |       PACKING COMPLETE!                  |               |
|                     |                                          |               |
|                     |   Order #ORD-2026-0125                   |               |
|                     |   2 packages ready to ship               |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- PACKING SUMMARY ---------------------------------------------------------+ |
| |                                                                             | |
| | Package 1: 40x30x20cm, 4.5kg                                               | |
| | Package 2: 20x20x5cm, 0.5kg                                                | |
| |                                                                             | |
| | Packing Slip: Generated                                                    | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [Print Packing Slip]  [Print Labels]  [Move to Ship Queue]                    |
+================================================================================+
```

---

## Shipping Interface

### Ship Order Dialog
```
+================================================================================+
| SHIP ORDER - #ORD-2026-0125                                              [x]   |
+================================================================================+
|                                                                                 |
| Customer: Brisbane Solar Co                                                     |
| Ship To: 123 Business St, Sydney NSW 2000                                      |
|                                                                                 |
| +-- PACKAGES ----------------------------------------------------------------+ |
| |                                                                             | |
| | Pkg# | Dimensions    | Weight | Tracking Number                            | |
| |------+---------------+--------+--------------------------------------------| |
| |  1   | 40x30x20 cm   | 4.5 kg | [___________________________]             | |
| |  2   | 20x20x5 cm    | 0.5 kg | [___________________________]             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CARRIER SELECTION -------------------------------------------------------+ |
| |                                                                             | |
| | (*) Australia Post - Express                                               | |
| |     Est. Delivery: Jan 12 (2 days) | Cost: $25.00                          | |
| |                                                                             | |
| | ( ) StarTrack                                                              | |
| |     Est. Delivery: Jan 13 (3 days) | Cost: $18.00                          | |
| |                                                                             | |
| | ( ) TNT                                                                    | |
| |     Est. Delivery: Jan 11 (1 day) | Cost: $45.00                           | |
| |                                                                             | |
| | ( ) Customer Pickup                                                        | |
| |     Customer will collect from warehouse                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Notifications:                                                                 |
| [x] Send shipping confirmation to customer                                    |
| [x] Include tracking link in email                                            |
|                                                                                 |
|                                           [Cancel]  [Confirm Shipment]        |
+================================================================================+
```

### Shipment Confirmation Toast
```
+================================================================+
|                                                                 |
| [*] Order Shipped Successfully!                                 |
|                                                                 |
| Order #ORD-2026-0125                                           |
| Tracking: AUS123456789                                          |
| Est. Delivery: Jan 12, 2026                                     |
|                                                                 |
| Customer notified via email                                     |
|                                                                 |
| [Track Shipment]                          [Dismiss] (5s)       |
+================================================================+
```

---

## Fulfillment Metrics Dashboard

### Desktop View
```
+================================================================================+
| FULFILLMENT DASHBOARD                               [Export] [Date: Today v]    |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS (aria-live="polite") -----------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | Fulfilled Today  | | Backlog          | | Avg Pick Time    | | On-Time  ||  |
| | |       23         | |       12         | |     8.5 min      | |   94%    ||  |
| | | +15% vs avg      | | -3 vs yesterday  | | -2 min vs target | | [green]  ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- FULFILLMENT FUNNEL ------------------------------------------------------+  |
| |                                                                             |  |
| |  ORDERS RECEIVED TODAY (35)                                                |  |
| |  +======================================================================+   |  |
| |  |######################################################################|   |  |
| |  +======================================================================+   |  |
| |                                      |                                       |  |
| |                                      v 100% allocated                        |  |
| |  ALLOCATED (35)                                                            |  |
| |  +======================================================================+   |  |
| |  |######################################################################|   |  |
| |  +======================================================================+   |  |
| |                                      |                                       |  |
| |                                      v 77% picked                            |  |
| |  PICKED (27)                                                               |  |
| |  +====================================================+                     |  |
| |  |####################################################|                     |  |
| |  +====================================================+                     |  |
| |                                      |                                       |  |
| |                                      v 85% packed                            |  |
| |  PACKED (23)                                                               |  |
| |  +===============================================+                          |  |
| |  |###############################################|                          |  |
| |  +===============================================+                          |  |
| |                                      |                                       |  |
| |                                      v 100% shipped                          |  |
| |  SHIPPED (23)                                                              |  |
| |  +===============================================+                          |  |
| |  |###############################################|                          |  |
| |  +===============================================+                          |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- TEAM PERFORMANCE -------------------------+ +-- BOTTLENECK ANALYSIS -----+ |
| |                                              | |                             | |
| | Picker      | Orders | Avg Time | Accuracy   | | Stage        | Wait Time   | |
| |-------------+--------+----------+----------| | |-------------+-------------| |
| | John Smith  |     12 |   7 min  |     98%  | | | Allocation  |    2 min    | |
| | Jane Doe    |      8 |   9 min  |     95%  | | | Picking     |   45 min *  | |
| | Bob Wilson  |      3 |  12 min  |    100%  | | | Packing     |   15 min    | |
| +----------------------------------------------+ | | Shipping    |    5 min    | |
|                                                  | +-----------------------------+ |
| * Picking identified as bottleneck              |                               |
+================================================================================+  |
|                                                                                 |
| +-- DAILY TREND CHART -------------------------------------------------------+  |
| |                                                                             |  |
| | Orders | 40|                     *                                         |  |
| |        | 30|         *    *    *   *                                       |  |
| |        | 20|    *  *                                                       |  |
| |        | 10|  *                                                            |  |
| |        |  0|__|__|__|__|__|__|__|__|                                       |  |
| |            Mon Tue Wed Thu Fri Sat Sun                                     |  |
| |                                                                             |  |
| |  [---] Received  [***] Fulfilled                                           |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Drag-and-Drop Interactions

### Card Drag Between Columns
```
IDLE STATE:                  DRAGGING:                    DROP:
+----------------+          +~~~~~~~~~~~~~~~~+           +----------------+
| ORD-2026-0125 |          | ORD-2026-0125  |           | ORD-2026-0125 |
| Acme Corp     |    ->    | Acme Corp      |     ->    | Acme Corp     |
| [Allocate]    |          | Moving to      |           | [*] Allocated |
+----------------+          | Pick Queue... |           +----------------+
 cursor: grab               +~~~~~~~~~~~~~~~~+            green pulse
                            cursor: grabbing

Screen Reader: "Order ORD-2026-0125 moved to Pick Queue"
```

### Keyboard-Based Move (Accessibility Alternative)
```
+================================================================================+
| ORDER CARD                                                                      |
+================================================================================+
|                                                                                 |
| ORD-2026-0125 | Acme Corp | 5 items | $2,500                                   |
|                                                                                 |
| Current Status: TO ALLOCATE                                                    |
|                                                                                 |
| Move to: [Select Status v]                                                     |
|          | To Allocate   |                                                     |
|          | To Pick    <- |                                                     |
|          | To Pack       |                                                     |
|          | To Ship       |                                                     |
|                                                                                 |
| [Cancel]  [Move Order]                                                         |
+================================================================================+
  Keyboard: Press 'M' on focused card to open move menu
  Arrow keys to select destination, Enter to confirm
```

---

## Error States

### Allocation Failure
```
+================================================================+
| [!] Stock Allocation Failed                              [x]   |
+================================================================+
|                                                                 |
| Order #ORD-2026-0125 could not be fully allocated.             |
|                                                                 |
| Reason: Insufficient stock for 2 items                         |
|                                                                 |
| - Cable Kit: 2 units short                                     |
| - Mounting Plate: Stock reserved by another order              |
|                                                                 |
| Options:                                                        |
| [Partial Allocate]  [Hold Order]  [Contact Purchasing]         |
+================================================================+
  role="alert" aria-live="assertive"
```

### Pick Verification Mismatch
```
+================================================================+
| [!] Quantity Mismatch                                    [x]   |
+================================================================+
|                                                                 |
| Item: 10kWh LFP Battery System X (WPX-01)                                    |
| Expected: 10 units                                              |
| Scanned: 8 units                                                |
|                                                                 |
| Please verify:                                                  |
| - Check bin A-01 and A-02 for remaining units                  |
| - Confirm serial numbers match                                  |
|                                                                 |
| [Scan More]  [Report Short]  [Override (Manager)]              |
+================================================================+
```

---

## Loading States

### Queue Loading
```
+================================================================================+
| FULFILLMENT QUEUE                                                              |
+================================================================================+
|                                                                                 |
| +-- TO ALLOCATE --+ +-- TO PICK ------+ +-- TO PACK ------+ +-- TO SHIP -----+|
| | [shimmer======] | | [shimmer======] | | [shimmer======] | | [shimmer=====]||
| | [shimmer======] | | [shimmer======] | | [shimmer======] | | [shimmer=====]||
| +------------------+ +------------------+ +------------------+ +----------------+|
| |                  | |                  | |                  | |              | |
| | +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~+| |
| | | [shimmer]    | | | | [shimmer]    | | | | [shimmer]    | | | | [shimmer] || |
| | | [shimmer]    | | | | [shimmer]    | | | | [shimmer]    | | | | [shimmer] || |
| | | [shimmer]    | | | | [shimmer]    | | | | [shimmer]    | | | | [shimmer] || |
| | +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~~~~+ | | +~~~~~~~~~~~+| |
| +------------------+ +------------------+ +------------------+ +----------------+|
|                                                                                 |
+================================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Fulfillment queue">
  <section role="region" aria-label="Queue metrics">
    <div role="status" aria-live="polite">
      <!-- Metrics updates -->
    </div>
  </section>

  <section role="region" aria-label="Kanban board">
    <div role="list" aria-label="Fulfillment stages">
      <article role="listitem" aria-label="To Allocate, 12 orders">
        <h3>TO ALLOCATE</h3>
        <div role="list" aria-label="Orders to allocate">
          <article role="listitem"
                   aria-label="Order ORD-2026-0125, Acme Corp, $2,500, urgent"
                   tabindex="0"
                   draggable="true">
            <!-- Order card -->
          </article>
        </div>
      </article>
    </div>
  </section>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Search/filter controls
2. Batch action buttons
3. First card in first column
4. Navigate cards with arrow keys

Card Actions:
- Enter: Open order details
- M: Open move menu (accessibility alternative to drag)
- Space: Select for batch action
- A: Quick allocate
- P: Print pick list

Screen Reader:
- Column totals announced on focus
- Card status and urgency announced
- Move confirmations announced
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Tab-based column switching, card list view |
| Tablet | 640px - 1024px | Horizontal scrolling columns, compact cards |
| Desktop | > 1024px | Full Kanban board, expanded cards |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Queue load | < 2s | Time to render all columns |
| Card drag start | < 100ms | Visual feedback delay |
| Allocation process | < 3s | Full allocation completion |
| Pick list print | < 2s | PDF generation time |
| Real-time updates | < 500ms | Status change propagation |

---

## Related Wireframes

- [Lead to Order](./lead-to-order.wireframe.md)
- [Job Completion](./job-completion.wireframe.md)
- [Invoicing](./invoicing.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
