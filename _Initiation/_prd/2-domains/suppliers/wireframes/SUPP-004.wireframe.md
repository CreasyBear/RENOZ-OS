# Wireframe: DOM-SUPP-004 - Partial Receipt Handling

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-004
> **Story Name**: Complete Partial Receipt Handling
> **Type**: UI Component
> **Component Type**: DetailPanel with DataTable
> **Last Updated**: 2026-01-10

---

## Overview

This wireframe covers the UI for handling partial goods receipts on purchase orders including:
- Back-ordered badge highlighting on items
- Receipt history section on PO detail
- Receive goods dialog with quantity entry
- Receipt records display

---

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - PO line items table with receiving status columns
  - Receipt history table with timestamp and user info
  - Status icons (OK, warning, pending) in table rows

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-dialog.tsx`
- **Features**:
  - Receive goods dialog with quantity input forms
  - Receipt detail view modal
  - Full-screen mobile dialog for receipts

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Back-ordered status badges (red/orange)
  - Pending receipt badges (gray)
  - Partial/Complete status indicators

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-tabs.tsx`
- **Features**:
  - PO detail tabs (Details, Items, Receipts, History)
  - Active tab highlighting for current view
  - Mobile-optimized tab navigation

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-input.tsx`
- **Features**:
  - Quantity received input with validation
  - Quantity rejected input with reason select
  - Notes textarea for delivery observations

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-select.tsx`
- **Features**:
  - Rejection reason dropdown selection
  - Date picker for receiving date
  - Received by user selector

---

## Mobile Wireframe (375px)

### PO Line Items with Back-Ordered Indicator

```
+=========================================+
| [Details] [Items] [Receipts] [History]  |
|           ======                        |
+-----------------------------------------+
|                                         |
|  LINE ITEMS (12)                        |
|  -----------------------------------    |
|                                         |
|  RECEIVING PROGRESS                     |
|  +-----------------------------------+  |
|  | [================    ] 83%        |  |
|  | 10/12 items fully received        |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | [OK] 2x4 Pine Lumber 8ft         |  | <- Green check
|  |     50/50 received                |  |
|  |     $225.00                       |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [OK] Drywall Sheets 4x8          |  |
|  |     100/100 received              |  |
|  |     $1,200.00                     |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [!] Cement Bags 50lb             |  | <- Warning icon
|  |     20/25 received                |  |
|  |     [BACK-ORDERED: 5]             |  | <- Red badge
|  |     $160.00 of $200.00            |  |
|  +-----------------------------------+  |
|  Border-left: 4px orange                |
|                                         |
|  +-----------------------------------+  |
|  | [--] Electrical Wire 100ft       |  | <- Pending dash
|  |     0/10 received                 |  |
|  |     [PENDING]                     |  | <- Gray badge
|  |     $0.00 of $450.00              |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [X] Conduit Pipes 10ft           |  | <- Rejected X
|  |     8/10 received (2 rejected)    |  |
|  |     [PARTIAL + REJECTED]          |  |
|  |     $120.00 of $150.00            |  |
|  +-----------------------------------+  |
|  Border-left: 4px red                   |
|                                         |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |      [RECEIVE MORE GOODS]         |  | <- Primary CTA
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Receipt History Tab

```
+=========================================+
| [Details] [Items] [Receipts] [History]  |
|                   =========             |
+-----------------------------------------+
|                                         |
|  RECEIPT HISTORY                        |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | Receipt #REC-001                  |  |
|  | January 12, 2026 at 10:30 AM      |  |
|  | --------------------------------- |  |
|  | Received by: Mike Johnson         |  |
|  | Items: 6 | Qty: 175               |  |
|  | Rejected: 2 items (reason noted)  |  |
|  |                     [View Details]|  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Receipt #REC-002                  |  |
|  | January 14, 2026 at 2:15 PM       |  |
|  | --------------------------------- |  |
|  | Received by: Sarah Kim            |  |
|  | Items: 4 | Qty: 70                |  |
|  | Rejected: 0 items                 |  |
|  |                     [View Details]|  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  RECEIPT SUMMARY                        |
|  +-----------------------------------+  |
|  | Total Ordered      |         320  |  |
|  | Total Received     |         245  |  |
|  | Total Rejected     |           2  |  |
|  | Pending            |          75  |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Value Ordered      |   $5,670.00  |  |
|  | Value Received     |   $4,280.00  |  |
|  | Outstanding        |   $1,390.00  |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |      [RECEIVE MORE GOODS]         |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Receive Goods Dialog (Full Screen Mobile)

```
+=========================================+
| Receive Goods                      [X]  |
+-----------------------------------------+
|                                         |
|  PO-2024-0142                           |
|  XYZ Materials Co                       |
|                                         |
|  -----------------------------------    |
|                                         |
|  Receiving Date                         |
|  +-----------------------------------+  |
|  | [calendar] Today, Jan 15, 2026  v |  |
|  +-----------------------------------+  |
|                                         |
|  Received By                            |
|  +-----------------------------------+  |
|  | Mike Johnson (you)              v |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  ITEMS TO RECEIVE                       |
|                                         |
|  +-----------------------------------+  |
|  | Cement Bags 50lb                  |  |
|  | Outstanding: 5 of 25              |  |
|  |                                   |  |
|  | Quantity Received                 |  |
|  | +--------+--------+--------+      |  |
|  | |  [-]   |   5    |  [+]   |      |  |
|  | +--------+--------+--------+      |  |
|  |                                   |  |
|  | Quantity Rejected                 |  |
|  | +--------+--------+--------+      |  |
|  | |  [-]   |   0    |  [+]   |      |  |
|  | +--------+--------+--------+      |  |
|  |                                   |  |
|  | Rejection Reason (if rejected)    |  |
|  | +-------------------------------+ |  |
|  | | Select reason...           v  | |  |
|  | +-------------------------------+ |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Electrical Wire 100ft             |  |
|  | Outstanding: 10 of 10             |  |
|  |                                   |  |
|  | Quantity Received                 |  |
|  | +--------+--------+--------+      |  |
|  | |  [-]   |   10   |  [+]   |      |  |
|  | +--------+--------+--------+      |  |
|  |                                   |  |
|  | Quantity Rejected                 |  |
|  | +--------+--------+--------+      |  |
|  | |  [-]   |   0    |  [+]   |      |  |
|  | +--------+--------+--------+      |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  Notes                                  |
|  +-----------------------------------+  |
|  | Delivery notes, damage report... |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
|                                         |
| Items: 2  |  Qty: 15  |  Rejected: 0    |
|                                         |
| (Cancel)              [Confirm Receipt] |
|                                         |
+=========================================+
```

### Receipt Detail View

```
+=========================================+
| < Receipts                              |
+-----------------------------------------+
|                                         |
|  Receipt #REC-001                       |
|  -----------------------------------    |
|                                         |
|  Date: January 12, 2026 10:30 AM        |
|  Received By: Mike Johnson              |
|  PO: PO-2024-0142                       |
|                                         |
|  -----------------------------------    |
|                                         |
|  ITEMS RECEIVED                         |
|                                         |
|  +-----------------------------------+  |
|  | 2x4 Pine Lumber 8ft              |  |
|  | Ordered: 50  |  This Receipt: 50 |  |
|  | Status: [Complete]                |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Drywall Sheets 4x8               |  |
|  | Ordered: 100 |  This Receipt: 100|  |
|  | Status: [Complete]                |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Cement Bags 50lb                 |  |
|  | Ordered: 25  |  This Receipt: 20 |  |
|  | Status: [Partial]                 |  |
|  | Remaining: 5 back-ordered         |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Conduit Pipes 10ft         [!]   |  |
|  | Ordered: 10  |  This Receipt: 8  |  |
|  | Rejected: 2                       |  |
|  | Reason: Damaged in transit        |  |
|  | Status: [Partial + Rejected]      |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  NOTES                                  |
|  Delivery arrived at 10:15 AM.          |
|  Two conduit pipes had visible damage.  |
|  Photos taken and sent to supplier.     |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Line Items with Back-Ordered Status

```
+================================================================+
| [Details] [Items (12)] [Receipts (2)] [Costs] [History]         |
|           ===========                                           |
+----------------------------------------------------------------+
|                                                                 |
| RECEIVING PROGRESS                                              |
| +-------------------------------------------------------------+ |
| | [========================================    ] 83% Complete  | |
| | 10 of 12 items fully received | 2 items with outstanding qty | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | St | Product              | Ordered | Received | Status     | |
| +----+----------------------+---------+----------+------------+ |
| | OK | 2x4 Pine Lumber 8ft  |    50   |    50    | Complete   | |
| | OK | Drywall Sheets 4x8   |   100   |   100    | Complete   | |
| | [!]| Cement Bags 50lb     |    25   |    20    | Back-order | |
| |    |                      |         |          | (5 pending)| |
| | -- | Electrical Wire 100ft|    10   |     0    | Pending    | |
| | X  | Conduit Pipes 10ft   |    10   |  8 (-2)  | Rejected   | |
| +-------------------------------------------------------------+ |
|                                                                 |
|                                          [Receive More Goods]   |
|                                                                 |
+================================================================+
```

### Receipt History Table

```
+================================================================+
| [Details] [Items (12)] [Receipts (2)] [Costs] [History]         |
|                        ==============                           |
+----------------------------------------------------------------+
|                                                                 |
| +-- RECEIPT HISTORY -------------------------------------------+|
| |                                                               ||
| | Receipt # | Date          | Received By   | Items | Rejected ||
| | ----------+---------------+---------------+-------+----------||
| | REC-001   | Jan 12, 10:30 | Mike Johnson  |   6   |    2     ||
| | REC-002   | Jan 14, 14:15 | Sarah Kim     |   4   |    0     ||
| |                                                               ||
| +---------------------------------------------------------------+|
|                                                                 |
| +-- SUMMARY --------------------------+ +-- VALUE --------------+|
| |                                     | |                       ||
| | Total Ordered:           320        | | Ordered:    $5,670.00 ||
| | Total Received:          245        | | Received:   $4,280.00 ||
| | Total Rejected:            2        | | Outstanding:$1,390.00 ||
| | Pending/Back-ordered:     75        | |                       ||
| +-------------------------------------+ +-----------------------+|
|                                                                 |
|                                          [Receive More Goods]   |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Line Items View with Receiving Status

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Orders                                                               |
| ----------- |                                                                                |
| Procurement | PO-2024-0142                                        [Partially Received]         |
|   Dashboard | XYZ Materials Co                                                               |
|   Suppliers | ---------------------------------------------------------------------------------  |
|   Orders <- |                                                                                |
| Catalog     | [Details] [Line Items (12)] [Receipts (2)] [Costs] [Amendments] [Activity]      |
| Jobs        |           ================                                                     |
| Pipeline    |                                                                                |
| Support     | +-- RECEIVING STATUS --------------------------------------------------------+  |
|             | |                                                                             |  |
|             | |  [=================================================    ] 83% Complete       |  |
|             | |  10 of 12 items fully received | 2 items outstanding | 2 items rejected    |  |
|             | |                                                                             |  |
|             | +-----------------------------------------------------------------------------+  |
|             |                                                                                |
|             | +------------------------------------------------------------------------------+
|             | |                                                                              |
|             | | St | Product              | SKU          | Ord | Rec | Rej | Pend | Status  |
|             | +----+----------------------+--------------+-----+-----+-----+------+---------+
|             | | OK | 2x4 Pine Lumber 8ft  | LUM-2X4-8    | 50  | 50  |  0  |   0  | Complete|
|             | | OK | Drywall Sheets 4x8   | DRY-48-12    | 100 | 100 |  0  |   0  | Complete|
|             | | OK | Joint Compound 5gal  | JNT-5GAL     | 20  | 20  |  0  |   0  | Complete|
|             | | OK | Drywall Screws 1lb   | DRY-SCR-1    | 25  | 25  |  0  |   0  | Complete|
|             | +----+----------------------+--------------+-----+-----+-----+------+---------+
|             | | [!]| Cement Bags 50lb     | CEM-50-GEN   | 25  | 20  |  0  |   5  |[BACKORD]| <- Orange row
|             | | -- | Electrical Wire 100ft| ELE-WIRE-100 | 10  |  0  |  0  |  10  | Pending | <- Gray row
|             | | X  | Conduit Pipes 10ft   | COND-10      | 10  |  8  |  2  |   0  |[PARTIAL]| <- Red row
|             | +----+----------------------+--------------+-----+-----+-----+------+---------+
|             | | OK | PVC Fittings Set     | PVC-FIT-SET  | 15  | 15  |  0  |   0  | Complete|
|             | | OK | Copper Pipe 1/2"     | COP-PIPE-12  | 30  | 30  |  0  |   0  | Complete|
|             | | OK | Solder Flux          | SOLD-FLUX    | 10  | 10  |  0  |   0  | Complete|
|             | | OK | Pipe Insulation      | PIPE-INS     | 25  | 25  |  0  |   0  | Complete|
|             | | OK | Mounting Brackets    | MNT-BRKT     | 40  | 40  |  0  |   0  | Complete|
|             | +------------------------------------------------------------------------------+
|             |                                                                                |
|             |                                                        [Receive More Goods]    |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+

STATUS LEGEND:
OK  = Fully received (green checkmark)
[!] = Back-ordered (orange warning)
--  = Pending (gray dash)
X   = Has rejections (red X)
```

### Receipt History Panel

```
+-- RECEIPTS TAB CONTENT ----------------------------------------------------------+
|                                                                                   |
| +-- RECEIPT HISTORY -----------------------+ +-- SUMMARY -----------------------+ |
| |                                          | |                                   | |
| | Receipt # | Date     | By       | Items  | | QUANTITY                          | |
| | ----------+----------+----------+------- | | Ordered:         320              | |
| | REC-001   | Jan 12   | Mike J.  |  6     | | Received:        245 (76.6%)      | |
| |           | 10:30 AM |          | (2 rej)| | Rejected:          2 (0.6%)       | |
| | [View]    |          |          |        | | Pending:          75 (23.4%)      | |
| | ----------+----------+----------+------- | |                                   | |
| | REC-002   | Jan 14   | Sarah K. |  4     | | VALUE                             | |
| |           | 2:15 PM  |          |        | | Ordered:      $5,670.00           | |
| | [View]    |          |          |        | | Received:     $4,280.00           | |
| | ----------+----------+----------+------- | | Rejected:        $30.00           | |
| |                                          | | Outstanding:  $1,390.00           | |
| +------------------------------------------+ +-----------------------------------+ |
|                                                                                   |
| +-- OUTSTANDING ITEMS (Back-ordered) -------------------------------------------+ |
| |                                                                                | |
| |  [!] These items have not been fully received:                                 | |
| |                                                                                | |
| |  +----------+--------------------+-------------+-----------+------------------+| |
| |  | Qty Left | Product            | Supplier    | Last Ship | Expected         || |
| |  +----------+--------------------+-------------+-----------+------------------+| |
| |  |     5    | Cement Bags 50lb   | XYZ Mat.    | Jan 12    | Jan 18 (est)     || |
| |  |    10    | Electrical Wire    | XYZ Mat.    | -         | Jan 20 (est)     || |
| |  +----------+--------------------+-------------+-----------+------------------+| |
| |                                                                                | |
| |  [Contact Supplier about outstanding items]                                    | |
| |                                                                                | |
| +--------------------------------------------------------------------------------+ |
|                                                                                   |
|                                                         [Receive More Goods]      |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Receive Goods Dialog

### Desktop Modal

```
+==============================================================================================+
|                                                                                              |
| +-- RECEIVE GOODS DIALOG -------------------------------------------------------------------+|
| |                                                                                          ||
| |  Receive Goods                                                                     [X]   ||
| |  =======================================================================================||
| |                                                                                          ||
| |  PO-2024-0142  |  XYZ Materials Co  |  Outstanding: 15 items                             ||
| |                                                                                          ||
| |  +-- RECEIPT INFO ---------------------------+ +-- SUMMARY -------------------------+    ||
| |  |                                           | |                                    |    ||
| |  | Receiving Date                            | | Items to receive: 2               |    ||
| |  | +-----------------------------------+     | | Total quantity: 15                |    ||
| |  | | [cal] January 15, 2026       v    |     | | Rejected: 0                       |    ||
| |  | +-----------------------------------+     | |                                    |    ||
| |  |                                           | | Value: $630.00                    |    ||
| |  | Received By                               | |                                    |    ||
| |  | +-----------------------------------+     | +------------------------------------+    ||
| |  | | Mike Johnson                  v   |     |                                          ||
| |  | +-----------------------------------+     |                                          ||
| |  |                                           |                                          ||
| |  +-------------------------------------------+                                          ||
| |                                                                                          ||
| |  +-- ITEMS TO RECEIVE ----------------------------------------------------------------+ ||
| |  |                                                                                    | ||
| |  | Product            | Ord | Prev Rec | Outstanding | Receiving | Rejected | Reason | ||
| |  +--------------------+-----+----------+-------------+-----------+----------+--------+ ||
| |  | Cement Bags 50lb   | 25  |    20    |      5      | [__5__]   | [__0__]  |  N/A   | ||
| |  | Electrical Wire    | 10  |     0    |     10      | [_10__]   | [__0__]  |  N/A   | ||
| |  +--------------------+-----+----------+-------------+-----------+----------+--------+ ||
| |  |                                                                                    | ||
| |  | [ ] Receive all outstanding quantities                                             | ||
| |  |                                                                                    | ||
| |  +------------------------------------------------------------------------------------+ ||
| |                                                                                          ||
| |  Notes                                                                                   ||
| |  +------------------------------------------------------------------------------------+ ||
| |  |                                                                                    | ||
| |  | Enter any delivery notes, condition observations, or issues...                    | ||
| |  |                                                                                    | ||
| |  +------------------------------------------------------------------------------------+ ||
| |                                                                                          ||
| |  ========================================================================================||
| |                                                                                          ||
| |                                              (Cancel)              [Confirm Receipt]     ||
| |                                                                                          ||
| +-------------------------------------------------------------------------------------------+|
|                                                                                              |
+==============================================================================================+
```

### With Rejections

```
+-- ITEMS TO RECEIVE (with rejection) -----------------------------------------+
|                                                                               |
| Product            | Ord | Prev Rec | Outstanding | Receiving | Rejected     |
+--------------------+-----+----------+-------------+-----------+--------------+
| Cement Bags 50lb   | 25  |    20    |      5      | [__3__]   | [__2__]      |
|                    |     |          |             |           |              |
|                    | Rejection Reason:            | [Damaged in transit v]   |
|                    |                              |                          |
|                    | Notes: Two bags had torn     |                          |
|                    | packaging and contents       |                          |
|                    | were compromised.            |                          |
+--------------------+-----+----------+-------------+-----------+--------------+
| Electrical Wire    | 10  |     0    |     10      | [_10__]   | [__0__]      |
+--------------------+-----+----------+-------------+-----------+--------------+

Rejection Reasons (dropdown):
- Damaged in transit
- Wrong item received
- Quality below standard
- Incorrect quantity
- Expired/Near expiry
- Missing documentation
- Other (specify in notes)
```

---

## Loading States

### Line Items Loading

```
+-------------------------------------------------------------+
|                                                             |
| RECEIVING PROGRESS                                          |
| +-------------------------------------------------------+   |
| | [shimmer==========================================]   |   |
| +-------------------------------------------------------+   |
|                                                             |
| +-------------------------------------------------------+   |
| | [shimmer=============] | [shimmer===] | [shimmer]     |   |
| | [shimmer=====================] | [shimmer=====]       |   |
| +-------------------------------------------------------+   |
| +-------------------------------------------------------+   |
| | [shimmer=============] | [shimmer===] | [shimmer]     |   |
| | [shimmer=====================] | [shimmer=====]       |   |
| +-------------------------------------------------------+   |
| +-------------------------------------------------------+   |
| | [shimmer=============] | [shimmer===] | [shimmer]     |   |
| | [shimmer=====================] | [shimmer=====]       |   |
| +-------------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
```

### Submitting Receipt

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |  [spinner] Recording receipt...   |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
  Dialog content dims
  Button shows spinner
```

---

## Empty States

### No Receipts Yet

```
+=========================================+
|                                         |
|  RECEIPT HISTORY                        |
|  -----------------------------------    |
|                                         |
|           +-------------+               |
|           | [delivery]  |               |
|           +-------------+               |
|                                         |
|      NO GOODS RECEIVED YET              |
|                                         |
|   No items from this order have been    |
|   received. Click below to record       |
|   your first goods receipt.             |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |     [RECEIVE GOODS]         |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### All Items Received

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [check] ALL ITEMS RECEIVED        |  |
|  |                                   |  |
|  | All 12 items from this order have |  |
|  | been fully received.              |  |
|  |                                   |  |
|  | [Close Order]                     |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
  Green background, checkmark icon
```

---

## Error States

### Failed to Load Receipts

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Unable to Load Receipts       |  |
|  |                                   |  |
|  | There was a problem loading the   |  |
|  | receipt history for this order.   |  |
|  |                                   |  |
|  |           [Retry]                 |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Failed to Submit Receipt

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Receipt Failed                |  |
|  |                                   |  |
|  | Could not record this receipt.    |  |
|  | Error: Quantity exceeds ordered.  |  |
|  |                                   |  |
|  |    [Dismiss]    [Retry]           |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Success State

```
+=========================================+
|                                         |
|  [check] Receipt Recorded!              |
|                                         |
|  15 items received for PO-2024-0142.    |
|  Inventory has been updated.            |
|                                         |
|  [View Receipt]   (Dismiss)             |
|                                         |
+=========================================+
  Toast with action button
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<!-- Receiving Progress -->
<div role="progressbar"
     aria-valuenow="83"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Receiving progress: 83 percent, 10 of 12 items">
</div>

<!-- Line Items Table -->
<table role="grid" aria-label="Purchase order line items with receiving status">
  <thead>
    <tr>
      <th scope="col">Status</th>
      <th scope="col">Product</th>
      <th scope="col">Ordered</th>
      <th scope="col">Received</th>
      <th scope="col">Pending</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="Cement Bags 50lb, 20 of 25 received, 5 back-ordered">
      <td>
        <span role="img" aria-label="Back-ordered warning">!</span>
      </td>
      <td>Cement Bags 50lb</td>
      <td>25</td>
      <td>20</td>
      <td>
        <span class="badge" role="status">Back-ordered: 5</span>
      </td>
    </tr>
  </tbody>
</table>

<!-- Receive Goods Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="receive-title">
  <h2 id="receive-title">Receive Goods</h2>

  <div role="group" aria-label="Receiving quantities">
    <label for="qty-cement">Cement Bags quantity to receive</label>
    <input id="qty-cement" type="number"
           aria-describedby="cement-outstanding" />
    <span id="cement-outstanding">5 outstanding</span>
  </div>
</div>
```

### Keyboard Navigation

```
Tab Order (Line Items):
1. Tab navigation (Details, Items, Receipts)
2. Progress bar (informational)
3. Table rows (focusable)
4. Receive More Goods button

Table Navigation:
- Arrow Up/Down: Navigate rows
- Enter: View item details
- Tab: Move to action button

Dialog Tab Order:
1. Close button (X)
2. Receiving date picker
3. Received by selector
4. Quantity inputs (per item)
5. Rejected quantity inputs
6. Rejection reason (if applicable)
7. Notes textarea
8. Cancel button
9. Confirm button
```

### Screen Reader Announcements

```
On page load:
  "Purchase order PO-2024-0142. Receiving status: 83 percent complete.
   10 of 12 items fully received. 2 items have outstanding quantities."

On back-ordered item focus:
  "Cement Bags 50lb. 20 of 25 received. 5 items back-ordered.
   Expected delivery: January 18."

On receive dialog open:
  "Receive goods dialog. 2 items with outstanding quantities.
   Total to receive: 15 items."

On quantity change:
  "Receiving 5 Cement Bags. 0 rejected."

On receipt success:
  "Receipt recorded. 15 items received. Inventory updated."
```

---

## Animation Choreography

### Progress Bar Updates

```
PROGRESS INCREASE:
- Bar width: Animate to new percentage (500ms)
- Counter: Count up to new number (300ms)
- Easing: ease-out
- Color shift if crossing thresholds (gray -> yellow -> green)
```

### Back-Ordered Badge

```
BADGE APPEAR:
- Scale: 0.8 -> 1 (200ms)
- Fade in (150ms)
- Pulse animation on first appearance (500ms)

ROW HIGHLIGHT:
- Border-left: Slide in from left (200ms)
- Background: Fade to warning color (200ms)
```

### Receipt Recording

```
CONFIRM BUTTON PRESS:
- Button: Scale 0.98 (50ms)
- Spinner: Fade in (100ms)
- Text: "Recording..." (100ms)

SUCCESS:
- Dialog: Slide down + fade out (250ms)
- Toast: Slide up from bottom (200ms)
- Progress bar: Animate to new percentage (500ms)
- Item rows: Update status with flash (300ms)
```

---

## Component Props Interface

```typescript
// ReceivingStatusBar.tsx
interface ReceivingStatusBarProps {
  ordered: number;
  received: number;
  rejected: number;
  pending: number;
}

// POLineItemsReceivingTable.tsx
interface POLineItemsReceivingTableProps {
  items: Array<{
    id: string;
    product: { id: string; name: string; sku: string };
    quantityOrdered: number;
    quantityReceived: number;
    quantityRejected: number;
    quantityPending: number;
    isBackOrdered: boolean;
    unitPrice: number;
  }>;
  onReceiveGoods: () => void;
}

// ReceiptHistoryTable.tsx
interface ReceiptHistoryTableProps {
  receipts: Array<{
    id: string;
    receiptNumber: string;
    date: Date;
    receivedBy: { id: string; name: string };
    itemCount: number;
    totalQuantity: number;
    rejectedCount: number;
  }>;
  onViewReceipt: (receiptId: string) => void;
  isLoading?: boolean;
}

// ReceiptSummary.tsx
interface ReceiptSummaryProps {
  summary: {
    quantityOrdered: number;
    quantityReceived: number;
    quantityRejected: number;
    quantityPending: number;
    valueOrdered: number;
    valueReceived: number;
    valueOutstanding: number;
  };
}

// ReceiveGoodsDialog.tsx
interface ReceiveGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    poNumber: string;
    supplier: { name: string };
  };
  outstandingItems: Array<{
    id: string;
    lineItemId: string;
    product: { id: string; name: string; sku: string };
    quantityOrdered: number;
    quantityReceived: number;
    quantityOutstanding: number;
    unitPrice: number;
  }>;
  onSubmit: (data: ReceiptInput) => Promise<void>;
  isSubmitting: boolean;
}

interface ReceiptInput {
  receivingDate: Date;
  receivedById: string;
  items: Array<{
    lineItemId: string;
    quantityReceived: number;
    quantityRejected: number;
    rejectionReason?: string;
    rejectionNotes?: string;
  }>;
  notes?: string;
}

// BackOrderedItemsAlert.tsx
interface BackOrderedItemsAlertProps {
  items: Array<{
    product: { name: string };
    quantityOutstanding: number;
    supplier: { id: string; name: string };
    expectedDate?: Date;
  }>;
  onContactSupplier: () => void;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/purchase-orders/$poId.tsx` | Modify | Add receiving status |
| `src/components/domain/procurement/receiving-status-bar.tsx` | Create | Progress indicator |
| `src/components/domain/procurement/po-line-items-receiving.tsx` | Create | Table with status |
| `src/components/domain/procurement/receipt-history-table.tsx` | Create | History display |
| `src/components/domain/procurement/receive-goods-dialog.tsx` | Modify | Enhance existing |
| `src/components/domain/procurement/back-ordered-alert.tsx` | Create | Outstanding items |
| `lib/schema/receipt-records.ts` | Create (optional) | Receipt tracking |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Line items render | < 500ms | All rows visible |
| Receipt history load | < 500ms | Table populated |
| Dialog open | < 200ms | Form visible |
| Receipt submit | < 2s | Complete + feedback |
| Progress update | < 300ms | Bar animated |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
