# Procurement Workflow Wireframe
## WF-PROCUREMENT: Demand to Goods Receipt

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/procurement.prd.json
**Priority:** 6 (Supply chain efficiency)

---

## Overview

The Procurement workflow manages the complete process from demand identification through purchase order creation, approval, and goods receipt. This wireframe covers:
- Demand identification with pending PO consideration
- Supplier comparison and selection
- PO creation and approval
- Supplier acknowledgment tracking
- Goods receipt process
- Procurement analytics dashboard

**Workflow Stages:** Demand -> Supplier Selection -> Create PO -> Approve -> Send -> Receive -> Complete

**Aesthetic:** "Supply chain clarity" - Clear demand signals, supplier insights, receipt efficiency

---

## Progress Indicator Design

### PO Lifecycle Status
```
+================================================================================+
|                                                                                 |
|  PURCHASE ORDER STATUS                                                         |
|                                                                                 |
|  [DRAFT]-->[PENDING]-->[APPROVED]-->[SENT]-->[ACKNOWLEDGED]-->[SHIPPED]-->[REC]|
|                                        *                                        |
|                                     (current)                                   |
|                                                                                 |
|  PO #PO-2026-0034 | Supplier: ABC Supplies | Total: $12,500                   |
|  Expected: Jan 18, 2026 | Items: 5 line items                                  |
|                                                                                 |
+================================================================================+

Status Colors:
- Draft: Gray (not submitted)
- Pending Approval: Orange (needs approval)
- Approved: Blue (ready to send)
- Sent: Purple (waiting for supplier)
- Acknowledged: Teal (supplier confirmed)
- Shipped/In Transit: Orange (on the way)
- Received: Green with checkmark (complete)
```

---

## Demand Identification

### Demand Queue (Desktop)
```
+================================================================================+
| DEMAND QUEUE                                           [Refresh] [Create PO]    |
+================================================================================+
|                                                                                 |
| +-- DEMAND METRICS ----------------------------------------------------------+ |
| | +------------------+ +------------------+ +------------------+              | |
| | | Below Reorder    | | Pending POs      | | Critical (0 stock)|            | |
| | |      15          | |       8          | |       3           |            | |
| | | $45,000 value    | | $32,000 value    | | [!] Urgent        |            | |
| | +------------------+ +------------------+ +------------------+              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- FILTERS -----------------------------------------------------------------+ |
| | [Search products..._______] [Critical Only] [No Pending PO] [Category v]   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DEMAND TABLE (Sorted by Priority) ---------------------------------------+ |
| |                                                                             | |
| | [ ] | Product        | Current | Reorder | Suggested | Pending | Priority  | |
| |-----+----------------+---------+---------+-----------+---------+-----------| |
| | [x] | 10kWh LFP Battery System X   |       5 |      20 |        25 |       0 | [!] CRIT  | |
| |     | WPX-001        |         |         | Lead: 7d  |         | 0 stock   | |
| | [x] | Bracket Set    |      12 |      50 |        50 |      25 | HIGH      | |
| |     | BRK-002        |         |         | Lead: 5d  | PO-032  | Low stock | |
| | [ ] | Cable Kit      |      45 |      30 |         0 |       0 | NORMAL    | |
| |     | CBL-003        |         |         | OK        |         | Adequate  | |
| | [x] | Mounting Plate |       8 |      25 |        30 |       0 | HIGH      | |
| |     | MNT-004        |         |         | Lead: 10d |         | Low stock | |
| | [ ] | Installation Kit|      30 |      20 |         0 |      15 | NORMAL    | |
| |     | INS-005        |         |         | OK        | PO-033  | Covered   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Selected: 3 items | Suggested Total: 105 units | Est. Value: $8,500           |
|                                                                                 |
| +-- DEMAND FORECAST (Next 30 Days) ------------------------------------------+ |
| |                                                                             | |
| | Based on order history and pipeline:                                       | |
| | - 10kWh LFP Battery System X: 45 units expected demand                                   | |
| | - Bracket Set: 35 units expected demand                                    | |
| | - Mounting Plate: 28 units expected demand                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                        [Add to Existing PO]  [Create New PO]  |
+================================================================================+
```

### Demand Item Card (Mobile)
```
+================================+
| 10kWh LFP Battery System X (WPX-001)         |
+================================+
| [!] CRITICAL - OUT OF STOCK    |
+================================+
|                                |
| Current Stock:    5 units      |
| Reorder Point:   20 units      |
| Suggested Order: 25 units      |
|                                |
| Pending POs:     None          |
| Lead Time:       7 days        |
|                                |
| 30-Day Forecast: 45 units      |
|                                |
| Preferred Supplier:            |
| ABC Supplies - $3,200/unit       |
|                                |
| [Add to PO]                    |
+================================+
```

---

## Supplier Comparison

### Supplier Selection (Desktop)
```
+================================================================================+
| SUPPLIER COMPARISON - 10kWh LFP Battery System X                                        [x]   |
+================================================================================+
|                                                                                 |
| Compare suppliers for: 10kWh LFP Battery System X (WPX-001)                                  |
| Quantity needed: 25 units                                                      |
|                                                                                 |
| +-- SUPPLIER OPTIONS --------------------------------------------------------+ |
| |                                                                             | |
| | +-- ABC SUPPLIES (Preferred) ----------------------------------------+     | |
| | |                                                                     |     | |
| | | (*) Select this supplier                                           |     | |
| | |                                                                     |     | |
| | |  Unit Price:      $3,200.00                                          |     | |
| | |  Total (25):      $12,500.00                                       |     | |
| | |  Lead Time:       7 days                                           |     | |
| | |                                                                     |     | |
| | |  Performance Score: [============] 92%                             |     | |
| | |  - On-time delivery: 95%                                           |     | |
| | |  - Quality score: 98%                                              |     | |
| | |  - Communication: 85%                                              |     | |
| | |                                                                     |     | |
| | |  [*] RECOMMENDED - Best overall value                             |     | |
| | +---------------------------------------------------------------------+     | |
| |                                                                             | |
| | +-- XYZ DISTRIBUTORS ------------------------------------------------+     | |
| | |                                                                     |     | |
| | | ( ) Select this supplier                                           |     | |
| | |                                                                     |     | |
| | |  Unit Price:      $480.00 (-4%)                                    |     | |
| | |  Total (25):      $12,000.00 (Save $3,200)                          |     | |
| | |  Lead Time:       12 days (+5 days)                                |     | |
| | |                                                                     |     | |
| | |  Performance Score: [========] 78%                                 |     | |
| | |  - On-time delivery: 75%                                           |     | |
| | |  - Quality score: 88%                                              |     | |
| | |  - Communication: 70%                                              |     | |
| | |                                                                     |     | |
| | |  [!] Lower price but longer lead time and lower reliability       |     | |
| | +---------------------------------------------------------------------+     | |
| |                                                                             | |
| | +-- GLOBAL PARTS CO -------------------------------------------------+     | |
| | |                                                                     |     | |
| | | ( ) Select this supplier                                           |     | |
| | |                                                                     |     | |
| | |  Unit Price:      $520.00 (+4%)                                    |     | |
| | |  Total (25):      $13,000.00                                       |     | |
| | |  Lead Time:       5 days (-2 days)                                 |     | |
| | |                                                                     |     | |
| | |  Performance Score: [==========] 88%                               |     | |
| | |  - On-time delivery: 90%                                           |     | |
| | |  - Quality score: 95%                                              |     | |
| | |  - Communication: 80%                                              |     | |
| | |                                                                     |     | |
| | |  [i] Best option if urgent delivery needed                        |     | |
| | +---------------------------------------------------------------------+     | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Selection Notes (optional):                                                    |
| [Selected preferred supplier for reliable delivery___________________]        |
|                                                                                 |
|                                              [Cancel]  [Confirm Selection]     |
+================================================================================+
```

---

## PO Creation Wizard

### Step 1: Select Supplier
```
+================================================================================+
| CREATE PURCHASE ORDER                                                     [x]   |
+================================================================================+
|                                                                                 |
| +-- PO WIZARD ---------------------------------------------------------------+ |
| | Step 1 of 4: Select Supplier                                               | |
| | [====>                                                          ] 25%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SELECT SUPPLIER ---------------------------------------------------------+ |
| |                                                                             | |
| | Create PO for:                                                             | |
| | [ABC Supplies                                                           v] | |
| |                                                                             | |
| | Supplier Details:                                                          | |
| | Contact: John Supplier                                                     | |
| | Email: orders@abcsupplies.com                                             | |
| | Phone: (02) 9876 5432                                                      | |
| |                                                                             | |
| | Performance:                                                               | |
| | [============] 92% | Last Order: Jan 5, 2026 | Avg Lead Time: 6 days      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ITEMS FROM DEMAND QUEUE (Auto-grouped) ----------------------------------+ |
| |                                                                             | |
| | [x] 10kWh LFP Battery System X (WPX-001)      25 units @ $3,200.00     = $12,500.00       | |
| | [x] Bracket Set (BRK-002)       50 units @ $25.00      = $1,250.00        | |
| | [x] Mounting Plate (MNT-004)    30 units @ $45.00      = $1,350.00        | |
| |                                                                             | |
| | Subtotal: $15,100.00                                                       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                    [Next: Review Items ->]    |
+================================================================================+
```

### Step 2: Review & Adjust Items
```
+================================================================================+
| +-- PO WIZARD ---------------------------------------------------------------+ |
| | Step 2 of 4: Review Items                                                  | |
| | [==========>                                                    ] 50%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PO LINE ITEMS -----------------------------------------------------------+ |
| |                                                                             | |
| | Product        | Qty      | Unit Price | Discount | Line Total   | Act    | |
| |----------------+----------+------------+----------+--------------+--------| |
| | 10kWh LFP Battery System X   | [25___]  | [$3,200.00_] | [_____%] | $12,500.00   | [x]    | |
| | WPX-001        |          |            |          |              |        | |
| |----------------+----------+------------+----------+--------------+--------| |
| | Bracket Set    | [50___]  | [$25.00__] | [5____%] | $1,187.50    | [x]    | |
| | BRK-002        |          |            |          |              |        | |
| |----------------+----------+------------+----------+--------------+--------| |
| | Mounting Plate | [30___]  | [$45.00__] | [_____%] | $1,350.00    | [x]    | |
| | MNT-004        |          |            |          |              |        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [+ Add Another Item]                                                           |
|                                                                                 |
| +-- PO TOTALS ---------------------------------------------------------------+ |
| |                                                                             | |
| | Subtotal:                                            $15,037.50            | |
| | Shipping: [Included                               v]    $0.00              | |
| | GST (10%):                                           $1,503.75             | |
| | ---------------------------------------------------------------            | |
| | PO TOTAL:                                           $16,541.25             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                    [<- Back]  [Next: Delivery Details ->]     |
+================================================================================+
```

### Step 3: Delivery Details
```
+================================================================================+
| +-- PO WIZARD ---------------------------------------------------------------+ |
| | Step 3 of 4: Delivery Details                                              | |
| | [================>                                              ] 75%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DELIVERY INFORMATION ----------------------------------------------------+ |
| |                                                                             | |
| | Expected Delivery Date:                                                    | |
| | [Jan 18, 2026          v] (Based on 7-day lead time)                       | |
| |                                                                             | |
| | Delivery Address:                                                          | |
| | (*) Main Warehouse                                                         | |
| |     456 Industrial Ave, Sydney NSW 2000                                   | |
| |                                                                             | |
| | ( ) Other Address                                                          | |
| |     [Select or enter address...]                                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SPECIAL INSTRUCTIONS ----------------------------------------------------+ |
| |                                                                             | |
| | Delivery Instructions (for supplier):                                      | |
| | +-----------------------------------------------------------------------+ | |
| | | Please deliver to loading dock. Call ahead on (02) 9123 4567.         | | |
| | | Operating hours: 7 AM - 5 PM Mon-Fri.                                 | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Internal Notes (not visible to supplier):                                  | |
| | +-----------------------------------------------------------------------+ | |
| | | Urgent order - needed for Acme Corp job on Jan 20.                    | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- APPROVAL REQUIRED -------------------------------------------------------+ |
| |                                                                             | |
| | [!] This PO requires manager approval (Total > $10,000)                   | |
| |                                                                             | |
| | Approver: [Auto-route to manager v]                                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                    [<- Back]  [Next: Review & Submit ->]      |
+================================================================================+
```

### Step 4: Review & Submit
```
+================================================================================+
| +-- PO WIZARD ---------------------------------------------------------------+ |
| | Step 4 of 4: Review & Submit                                               | |
| | [======================>                                        ] 95%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PO SUMMARY --------------------------------------------------------------+ |
| |                                                                             | |
| | +-- HEADER --------------------------------------------------------------+ | |
| | | Supplier:       ABC Supplies                                           | | |
| | | PO Number:      PO-2026-0034 (will be assigned)                       | | |
| | | PO Date:        January 11, 2026                                       | | |
| | | Expected:       January 18, 2026                                       | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- LINE ITEMS ----------------------------------------------------------+ | |
| | | 10kWh LFP Battery System X (WPX-001)      25 x $3,200.00      = $12,500.00            | | |
| | | Bracket Set (BRK-002)       50 x $23.75 (5%)  = $1,187.50             | | |
| | | Mounting Plate (MNT-004)    30 x $45.00       = $1,350.00             | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- TOTALS --------------------------------------------------------------+ | |
| | | Subtotal:    $15,037.50                                                | | |
| | | GST:         $1,503.75                                                 | | |
| | | TOTAL:       $16,541.25                                                | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Delivery: Main Warehouse, 456 Industrial Ave, Sydney                      | |
| | Status After Submit: PENDING APPROVAL (requires manager)                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SUBMIT OPTIONS ----------------------------------------------------------+ |
| |                                                                             | |
| | ( ) Save as Draft                                                         | |
| |     Save and continue editing later                                        | |
| |                                                                             | |
| | (*) Submit for Approval                                                    | |
| |     Route to manager for approval                                          | |
| |                                                                             | |
| | ( ) Submit and Send Immediately (if no approval needed)                   | |
| |     Disabled - approval required for this PO                               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                    [<- Back]  [Submit for Approval]           |
+================================================================================+
```

---

## PO Approval

### Approval Queue
```
+================================================================================+
| PO APPROVAL QUEUE                                               [Refresh]       |
+================================================================================+
|                                                                                 |
| Pending your approval: 3 POs | Total Value: $45,000                            |
|                                                                                 |
| +-- QUEUE TABLE -------------------------------------------------------------+ |
| |                                                                             | |
| | Age  | PO#           | Supplier      | Value      | Urgency  | Actions     | |
| |------+---------------+---------------+------------+----------+-------------| |
| | 2h   | PO-2026-0034  | ABC Supplies  | $16,541.25 | [!] HIGH | [Review]    | |
| |      |               |               |            | Urgent   |             | |
| | 1d   | PO-2026-0033  | XYZ Dist.     | $8,200.00  | NORMAL   | [Review]    | |
| | 2d   | PO-2026-0032  | Global Parts  | $20,300.00 | LOW      | [Review]    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

### Approval Detail
```
+================================================================================+
| APPROVE PO - PO-2026-0034                                                [x]   |
+================================================================================+
|                                                                                 |
| +-- PO DETAILS --------------------------------------------------------------+ |
| | Supplier: ABC Supplies | Submitted: Jan 11, 2026 by Sarah Williams        | |
| | Value: $16,541.25 | Expected: Jan 18, 2026                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- LINE ITEMS --------------------------------------------------------------+ |
| |                                                                             | |
| | Product              | Qty | Unit Price | Line Total   | Demand Reason    | |
| |----------------------+-----+------------+--------------+------------------| |
| | 10kWh LFP Battery System X         |  25 |    $3,200.00 | $12,500.00   | Critical stock   | |
| | Bracket Set          |  50 |     $23.75 |  $1,187.50   | Below reorder    | |
| | Mounting Plate       |  30 |     $45.00 |  $1,350.00   | Below reorder    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- JUSTIFICATION -----------------------------------------------------------+ |
| | Internal Notes: "Urgent order - needed for Acme Corp job on Jan 20."      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- BUDGET CHECK ------------------------------------------------------------+ |
| |                                                                             | |
| | Monthly Budget:    $50,000                                                 | |
| | Spent This Month:  $28,500                                                 | |
| | This PO:           $16,541                                                 | |
| | Remaining:         $4,959                                                  | |
| |                                                                             | |
| | [*] Within budget                                                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DECISION ----------------------------------------------------------------+ |
| |                                                                             | |
| | (*) APPROVE                                                                | |
| |     PO will be sent to supplier                                           | |
| |                                                                             | |
| | ( ) REJECT                                                                 | |
| |     Rejection reason required                                              | |
| |                                                                             | |
| | ( ) REQUEST CHANGES                                                        | |
| |     Return to submitter with comments                                      | |
| |                                                                             | |
| | Approval Notes:                                                            | |
| | [Approved - urgent need confirmed_________________________________]        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                             [Cancel]  [Confirm Decision]       |
+================================================================================+
```

---

## Supplier Acknowledgment

### PO Sent - Awaiting Acknowledgment
```
+================================================================================+
| PO-2026-0034 - ABC SUPPLIES                                      [Actions v]    |
+================================================================================+
|                                                                                 |
| +-- STATUS -----------------------------------------------------------------+  |
| |                                                                            |  |
| |  [DRAFT]-->[PENDING]-->[APPROVED]-->[SENT]-->[ACK]-->[SHIPPED]-->[REC]    |  |
| |                                        *                                   |  |
| |                                     (current)                              |  |
| |                                                                            |  |
| |  Sent: January 11, 2026 at 3:45 PM                                        |  |
| |  Awaiting supplier acknowledgment                                          |  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- ACKNOWLEDGMENT STATUS ---------------------------------------------------+ |
| |                                                                             | |
| | [!] Waiting for supplier response                                          | |
| |                                                                             | |
| | PO was sent to: orders@abcsupplies.com                                    | |
| | Time since sent: 2 hours                                                   | |
| |                                                                             | |
| | Expected acknowledgment: Within 24 hours                                   | |
| |                                                                             | |
| | [Resend PO Email]  [Call Supplier]  [Manual Acknowledgment]               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PO DETAILS --------------------------------------------------------------+ |
| | ... (PO details as before)                                                 | |
| +-----------------------------------------------------------------------------+ |
+================================================================================+
```

### Manual Acknowledgment Dialog
```
+================================================================================+
| RECORD SUPPLIER ACKNOWLEDGMENT                                           [x]   |
+================================================================================+
|                                                                                 |
| PO: PO-2026-0034 | Supplier: ABC Supplies                                     |
|                                                                                 |
| +-- ACKNOWLEDGMENT DETAILS --------------------------------------------------+ |
| |                                                                             | |
| | Acknowledged By:                                                           | |
| | [John Supplier_____________________]                                       | |
| |                                                                             | |
| | Acknowledgment Date:                                                       | |
| | [Jan 11, 2026 4:30 PM          v]                                          | |
| |                                                                             | |
| | Confirmed Delivery Date:                                                   | |
| | [Jan 18, 2026                  v] (Same as requested)                      | |
| |                                                                             | |
| | [ ] Delivery date differs from requested                                   | |
| |     Original: Jan 18 | Confirmed: [____________]                          | |
| |                                                                             | |
| | Reference/Confirmation Number (optional):                                  | |
| | [ABC-ORD-45678_____________________]                                       | |
| |                                                                             | |
| | Notes:                                                                      | |
| | [Supplier confirmed via phone call_________________________]               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                              [Cancel]  [Record Acknowledgment] |
+================================================================================+
```

---

## Goods Receipt

### Pending Receipts List
```
+================================================================================+
| GOODS RECEIPT                                            [Scan] [Manual Entry]  |
+================================================================================+
|                                                                                 |
| +-- PENDING RECEIPTS --------------------------------------------------------+ |
| |                                                                             | |
| | Expected Today: 2 | In Transit: 5 | Overdue: 1                             | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | PO-2026-0034 | ABC Supplies                         [!] DUE TODAY    | | |
| | | Expected: Jan 18, 2026                                                | | |
| | | Items: 10kWh LFP Battery System X (25), Bracket Set (50), Mounting Plate (30)      | | |
| | | Value: $16,541.25                                                     | | |
| | | [Start Receipt]                                                       | | |
| | +-----------------------------------------------------------------------+ | |
| | | PO-2026-0033 | XYZ Distributors                    Expected: Jan 20  | | |
| | | Items: Cable Kit (100), Installation Kit (50)                        | | |
| | | Value: $8,200.00                                                      | | |
| | | [Start Receipt]                                                       | | |
| | +-----------------------------------------------------------------------+ | |
| | | [!] PO-2026-0030 | Global Parts                    OVERDUE 2 DAYS   | | |
| | | Expected: Jan 16, 2026                                                | | |
| | | Items: Premium Widget (20)                                            | | |
| | | Value: $12,000.00                                                     | | |
| | | [Start Receipt] [Contact Supplier]                                   | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
+================================================================================+
```

### Receipt Form
```
+================================================================================+
| RECEIVE PO - PO-2026-0034                                                [x]   |
+================================================================================+
|                                                                                 |
| Supplier: ABC Supplies | Expected: Jan 18, 2026                               |
|                                                                                 |
| +-- RECEIPT ITEMS -----------------------------------------------------------+ |
| |                                                                             | |
| | Product        | Ordered | Received | Bin      | Serial#s         | Status | |
| |----------------+---------+----------+----------+------------------+--------| |
| | 10kWh LFP Battery System X   |      25 | [25___]  | [A-01 v] | [Enter/Scan]     | [*] OK | |
| |                |         |          |          | SN-001 to SN-025 |        | |
| |----------------+---------+----------+----------+------------------+--------| |
| | Bracket Set    |      50 | [50___]  | [B-03 v] | N/A              | [*] OK | |
| |----------------+---------+----------+----------+------------------+--------| |
| | Mounting Plate |      30 | [28___]  | [C-02 v] | N/A              | [!] 2  | |
| |                |         |          |          |                  | SHORT  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DISCREPANCY HANDLING ----------------------------------------------------+ |
| |                                                                             | |
| | [!] Mounting Plate: 2 units short                                          | |
| |                                                                             | |
| | (*) Accept partial receipt                                                 | |
| |     Receive 28, create backorder for 2                                     | |
| |                                                                             | |
| | ( ) Reject entire shipment                                                 | |
| |     Return all items, contact supplier                                     | |
| |                                                                             | |
| | ( ) Accept with credit                                                     | |
| |     Receive 28, request credit note for 2 missing                          | |
| |                                                                             | |
| | Discrepancy Notes:                                                         | |
| | [2 units missing from shipment - packing slip shows 30___________]        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- QUALITY CHECK -----------------------------------------------------------+ |
| |                                                                             | |
| | [x] Visual inspection passed                                               | |
| | [x] Packaging intact                                                       | |
| | [ ] Quality sample taken (if applicable)                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SERIAL NUMBER ENTRY (10kWh LFP Battery System X) --------------------------------------+ |
| |                                                                             | |
| | [Scan Barcode] or enter manually:                                          | |
| |                                                                             | |
| | | SN-001 | SN-002 | SN-003 | SN-004 | SN-005 |                            | |
| | | SN-006 | SN-007 | SN-008 | SN-009 | SN-010 |                            | |
| | | SN-011 | SN-012 | SN-013 | SN-014 | SN-015 |                            | |
| | | SN-016 | SN-017 | SN-018 | SN-019 | SN-020 |                            | |
| | | SN-021 | SN-022 | SN-023 | SN-024 | SN-025 |                            | |
| |                                                                             | |
| | 25 of 25 serial numbers entered [*]                                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                              [Cancel]  [Complete Receipt]      |
+================================================================================+
```

### Receipt Complete
```
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |      [Package Received Animation]        |               |
|                     |                                          |               |
|                     |       GOODS RECEIVED!                    |               |
|                     |                                          |               |
|                     |   PO-2026-0034 - ABC Supplies            |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- RECEIPT SUMMARY ---------------------------------------------------------+ |
| |                                                                             | |
| | [*] 10kWh LFP Battery System X: 25 received, 25 ordered                                 | |
| | [*] Bracket Set: 50 received, 50 ordered                                  | |
| | [!] Mounting Plate: 28 received, 30 ordered (2 backordered)              | |
| |                                                                             | |
| | Total Received: 103 of 105 units (98%)                                    | |
| | Receipt Value: $16,451.25                                                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- INVENTORY UPDATED -------------------------------------------------------+ |
| |                                                                             | |
| | [*] 10kWh LFP Battery System X: +25 -> 30 in stock                                      | |
| | [*] Bracket Set: +50 -> 62 in stock                                       | |
| | [*] Mounting Plate: +28 -> 36 in stock                                    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [View PO]  [Print Receipt]  [Receive Another PO]                              |
+================================================================================+
```

---

## Procurement Dashboard

### Desktop View
```
+================================================================================+
| PROCUREMENT DASHBOARD                                   [Export] [Date: 30d v]  |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS ---------------------------------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | Open POs         | | Spend (30d)      | | Avg Lead Time    | | On-Time  ||  |
| | |      12          | |   $125,000       | |    6.5 days      | |   92%    ||  |
| | | $85,000 value    | | +$18K vs budget  | | -0.5 vs target   | | [*]     ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- SPEND BY CATEGORY -------------------------+ +-- SPEND BY SUPPLIER ------+ |
| |                                              | |                             | |
| | Category       | Spend    | % of Total      | | Supplier       | Spend      | |
| |----------------+----------+-----------------|  |----------------+------------| |
| | Raw Materials  | $65,000  | [=======] 52%  | | ABC Supplies   | $45,000    | |
| | Components     | $35,000  | [====] 28%     | | XYZ Dist.      | $32,000    | |
| | Packaging      | $15,000  | [==] 12%       | | Global Parts   | $28,000    | |
| | Services       | $10,000  | [=] 8%         | | Others         | $20,000    | |
| +----------------------------------------------+ +-----------------------------+ |
|                                                                                 |
| +-- SUPPLIER SCORECARD ------------------------------------------------------+  |
| |                                                                             |  |
| | Supplier        | Orders | On-Time | Quality | Avg Lead | Score            |  |
| |-----------------+--------+---------+---------+----------+------------------|  |
| | ABC Supplies    |     15 |    95%  |    98%  |   6 days | [======] 92%    |  |
| | XYZ Distributors|     12 |    75%  |    88%  |  10 days | [====] 78%      |  |
| | Global Parts Co |      8 |    90%  |    95%  |   5 days | [=====] 88%     |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- LEAD TIME TREND ---------------------------------------------------------+  |
| |                                                                             |  |
| |    12d|                                                                    |  |
| |     9d|    *                                                               |  |
| |     6d|  *   *    *    *    *----*----*                                   |  |
| |     3d|                                                                    |  |
| |     0d|__|__|__|__|__|__|__|__|                                           |  |
| |        W1  W2  W3  W4  W5  W6  W7  W8                                      |  |
| |                                                                             |  |
| |  [---] Actual  [***] Target (7 days)                                      |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Mobile Views

### Mobile PO List
```
+================================+
| Purchase Orders          [+]   |
+================================+
| [All|Draft|Pending|Open]       |
|         ^active                |
+================================+
| Open: 12 | Pending: 3          |
+================================+
|                                |
| +----------------------------+ |
| | PO-2026-0034               | |
| | ABC Supplies               | |
| | $16,541.25                 | |
| | [SENT - Awaiting ACK]      | |
| | Expected: Jan 18           | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | PO-2026-0033               | |
| | XYZ Distributors           | |
| | $8,200.00                  | |
| | [IN TRANSIT]               | |
| | Expected: Jan 20           | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [!] PO-2026-0030           | |
| | Global Parts               | |
| | $12,000.00                 | |
| | [OVERDUE - 2 days]         | |
| +----------------------------+ |
|                                |
+================================+
```

### Mobile Receipt
```
+================================+
| Receive PO-2026-0034           |
+================================+
| ABC Supplies                   |
| Expected: Today                |
+================================+
|                                |
| SCAN OR ENTER ITEMS            |
|                                |
| [Scan Barcode]                 |
|                                |
| -- ITEMS --                    |
|                                |
| 10kWh LFP Battery System X                   |
| Ordered: 25 | Received: [25]   |
| Bin: [A-01 v]                  |
| [Enter Serial Numbers]         |
| [*] Complete                   |
|                                |
| Bracket Set                    |
| Ordered: 50 | Received: [50]   |
| Bin: [B-03 v]                  |
| [*] Complete                   |
|                                |
| Mounting Plate                 |
| Ordered: 30 | Received: [28]   |
| Bin: [C-02 v]                  |
| [!] 2 short                    |
|                                |
+================================+
| [Complete Receipt]             |
+================================+
```

---

## Error States

### Supplier Delivery Delayed
```
+================================================================+
| [!] Delivery Delayed                                      [x]   |
+================================================================+
|                                                                 |
| PO-2026-0034 delivery has been delayed by supplier.            |
|                                                                 |
| Original: January 18, 2026                                      |
| New Date: January 22, 2026 (+4 days)                           |
|                                                                 |
| Reason: Stock shortage at supplier warehouse                    |
|                                                                 |
| Impact:                                                          |
| - 10kWh LFP Battery System X needed for Acme Corp job on Jan 20               |
| - May need to source from alternative supplier                  |
|                                                                 |
| [Accept New Date]  [Find Alternative]  [Contact Supplier]      |
+================================================================+
```

### Budget Exceeded Warning
```
+================================================================+
| [!] Budget Warning                                        [x]   |
+================================================================+
|                                                                 |
| This PO will exceed the monthly procurement budget.            |
|                                                                 |
| Monthly Budget:    $50,000                                      |
| Current Spend:     $42,000                                      |
| This PO:           $16,541                                      |
| Over Budget:       $8,541 (17%)                                |
|                                                                 |
| Options:                                                         |
| [Request Budget Increase]  [Reduce PO]  [Split Over 2 Months]  |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Procurement workflow">
  <!-- Demand Queue -->
  <section role="region" aria-label="Demand queue">
    <table role="grid" aria-label="Products below reorder point">
      <thead>
        <tr>
          <th scope="col">Product</th>
          <th scope="col">Current Stock</th>
          <!-- ... -->
        </tr>
      </thead>
    </table>
  </section>

  <!-- PO Wizard -->
  <form role="form" aria-label="Create purchase order wizard">
    <nav aria-label="PO creation progress">
      <ol role="list">
        <li role="listitem" aria-current="step">
          Step 1: Select Supplier
        </li>
      </ol>
    </nav>
  </form>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Search/filter controls
2. Demand queue checkboxes
3. Action buttons
4. Table rows

Receipt Form:
- Tab through quantity fields
- Enter to confirm serial number
- Escape to cancel scan mode

Screen Reader:
- Stock levels and priorities announced
- PO status changes announced
- Receipt progress announced
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Card-based lists, bottom sheet forms |
| Tablet | 640px - 1024px | Compact tables, side panel details |
| Desktop | > 1024px | Full tables, multi-column dashboard |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Demand calculation | < 2s | Stock check with pending POs |
| Supplier comparison | < 1s | Load 3+ suppliers |
| PO creation | < 3s | Full PO with line items |
| Receipt processing | < 500ms | Per line item |
| Serial number scan | < 200ms | Barcode decode |

---

## Related Wireframes

- [Order Fulfillment](./order-fulfillment.wireframe.md)
- [Inventory Management](../domains/inventory-management.wireframe.md)
- [Supplier Management](../domains/supplier-management.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
