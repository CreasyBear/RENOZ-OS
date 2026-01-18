# Invoicing Workflow Wireframe
## WF-INVOICING: Order-to-Cash Process

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/invoicing.prd.json
**Priority:** 3 (Financial operations critical)

---

## Overview

The Invoicing workflow manages the complete order-to-cash process from invoice generation through payment collection and Xero reconciliation. This wireframe covers:
- Auto-invoice generation on shipment
- Batch invoicing
- Payment matching with Xero
- Collection workflow
- Month-end close process
- Cash flow forecasting

**Workflow Stages:** Order Shipped -> Generate Invoice -> Send Invoice -> Receive Payment -> Reconcile

**Aesthetic:** "Financial precision" - Clear status indicators, batch operations, audit-friendly

---

## Progress Indicator Design

### Invoice Lifecycle Status
```
+================================================================================+
|                                                                                 |
|  INVOICE STATUS                                                                |
|                                                                                 |
|  [DRAFT]-->[SENT]-->[VIEWED]-->[OVERDUE]-->[PAID]-->[RECONCILED]               |
|                                   *                                             |
|                                (current)                                        |
|                                                                                 |
|  Invoice #INV-2026-0089 | Order: ORD-2026-0123 | Customer: Acme Corp           |
|  Amount: $7,700.00 | Due: Jan 25, 2026 | Days Overdue: 5                       |
|                                                                                 |
+================================================================================+

Status Colors:
- Draft: Gray (not sent)
- Sent: Blue (awaiting payment)
- Viewed: Purple (customer engagement)
- Overdue: Red (past due date)
- Paid: Green (payment received)
- Reconciled: Green with checkmark (Xero synced)
```

### Collection Escalation Path
```
+================================================================================+
|                                                                                 |
|  COLLECTION ESCALATION PATH                                                    |
|                                                                                 |
|  [INITIAL]----->[FOLLOW-UP]----->[ESCALATION]----->[FINAL NOTICE]              |
|     Day 1          Day 7            Day 14             Day 21                  |
|                      *                                                         |
|                   (current)                                                    |
|                                                                                 |
+================================================================================+
```

---

## Auto-Invoice on Shipment

### Shipment Confirmation with Invoice
```
+================================================================================+
| ORDER SHIPPED - #ORD-2026-0123                                           [x]   |
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |         [Checkmark Animation]            |               |
|                     |                                          |               |
|                     |         ORDER SHIPPED!                   |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- SHIPPING DETAILS --------------------------------------------------------+ |
| |                                                                             | |
| | Carrier: Australia Post Express                                            | |
| | Tracking: AUS123456789                                                     | |
| | Est. Delivery: January 12, 2026                                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- INVOICE GENERATED (Auto) ------------------------------------------------+ |
| |                                                                             | |
| | [*] Invoice #INV-2026-0089 created automatically                          | |
| |                                                                             | |
| | Amount: $7,700.00 (incl. GST)                                              | |
| | Due Date: January 25, 2026 (14 days)                                       | |
| | Payment Terms: Net 14                                                       | |
| |                                                                             | |
| | Actions:                                                                    | |
| | [x] Send invoice to customer                                               | |
| | [x] Sync to Xero                                                           | |
| |                                                                             | |
| | [View Invoice]  [Edit Before Sending]                                      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                            [Close]  [Send Invoice Now]        |
+================================================================================+
```

### Auto-Invoice Settings
```
+================================================================================+
| INVOICE AUTOMATION SETTINGS                                                     |
+================================================================================+
|                                                                                 |
| +-- AUTO-INVOICE RULES ------------------------------------------------------+ |
| |                                                                             | |
| | Generate invoice automatically when:                                        | |
| |                                                                             | |
| | [x] Order is shipped                                                       | |
| |     Trigger: Status changes to 'shipped'                                   | |
| |                                                                             | |
| | [x] Job is completed (with sign-off)                                       | |
| |     Trigger: Job status 'complete' with customer signature                 | |
| |                                                                             | |
| | [ ] Order is confirmed                                                     | |
| |     (For pre-payment scenarios)                                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- AUTO-SEND OPTIONS -------------------------------------------------------+ |
| |                                                                             | |
| | ( ) Send immediately after generation                                      | |
| | (*) Queue for review before sending                                        | |
| | ( ) Hold for batch sending (daily at 6 PM)                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- XERO SYNC ---------------------------------------------------------------+ |
| |                                                                             | |
| | [x] Automatically sync invoices to Xero                                    | |
| |     Account: Sales (200)                                                   | |
| |     Tax: GST on Income                                                     | |
| |                                                                             | |
| | [x] Include tracking category                                              | |
| |     Category: [Sales Region v]                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                            [Save Settings]     |
+================================================================================+
```

---

## Batch Invoicing

### Select Orders for Batch Invoice
```
+================================================================================+
| BATCH INVOICE GENERATION                                      [Refresh] [Help]  |
+================================================================================+
|                                                                                 |
| Select shipped orders to generate invoices:                                    |
|                                                                                 |
| +-- FILTERS ----------------------------------------------------------------+  |
| | Ship Date: [Jan 1___] to [Jan 11__]  Customer: [All_____v]  [Apply]       |  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- UNINVOICED ORDERS -------------------------------------------------------+ |
| |                                                                             | |
| | [x] | Order#        | Customer      | Ship Date | Amount    | Status       | |
| |-----+---------------+---------------+-----------+-----------+--------------| |
| | [x] | ORD-2026-0123 | Acme Corp     | Jan 10    | $7,700.00 | Shipped      | |
| | [x] | ORD-2026-0122 | Tech Ind.     | Jan 10    | $3,200.00 | Shipped      | |
| | [x] | ORD-2026-0121 | GlobalCo      | Jan 9     | $5,500.00 | Shipped      | |
| | [ ] | ORD-2026-0120 | BigCo Ltd     | Jan 9     | $2,100.00 | Partial Ship | |
| | [x] | ORD-2026-0119 | StartupX      | Jan 8     | $950.00   | Delivered    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Selected: 4 orders | Total Value: $17,350.00                                   |
|                                                                                 |
| +-- BATCH OPTIONS -----------------------------------------------------------+ |
| |                                                                             | |
| | Invoice Date: [Jan 11, 2026  v]                                            | |
| | Due Date: [14 days from invoice v]                                         | |
| |                                                                             | |
| | [x] Send invoices to customers after generation                            | |
| | [x] Sync to Xero                                                           | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                           [Cancel]  [Preview]  [Generate 4 Invoices]          |
+================================================================================+
```

### Batch Generation Progress
```
+================================================================================+
| GENERATING INVOICES                                                             |
+================================================================================+
|                                                                                 |
|                     +----------------------------------+                        |
|                     |                                  |                        |
|                     |   Generating Invoice 2 of 4...   |                        |
|                     |                                  |                        |
|                     |   [==================>     ] 50% |                        |
|                     |                                  |                        |
|                     +----------------------------------+                        |
|                                                                                 |
| +-- PROGRESS LOG ------------------------------------------------------------+ |
| |                                                                             | |
| | [*] INV-2026-0089 - Acme Corp - $7,700.00 - Created & Sent                | |
| | [*] INV-2026-0090 - Tech Ind. - $3,200.00 - Created & Sent                | |
| | [~] INV-2026-0091 - GlobalCo - $5,500.00 - Creating...                    | |
| | [ ] INV-2026-0092 - StartupX - $950.00 - Pending                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

### Batch Complete Summary
```
+================================================================================+
| BATCH INVOICE COMPLETE                                                    [x]   |
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |         [Stack of Invoices Icon]         |               |
|                     |                                          |               |
|                     |      4 INVOICES GENERATED                |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- SUMMARY -----------------------------------------------------------------+ |
| |                                                                             | |
| | Created:          4 invoices                                               | |
| | Total Value:      $17,350.00                                               | |
| | Sent to Customers: 4                                                        | |
| | Synced to Xero:   4                                                        | |
| | Errors:           0                                                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DETAILS -----------------------------------------------------------------+ |
| |                                                                             | |
| | Invoice#       | Customer   | Amount     | Status                          | |
| |----------------+------------+------------+---------------------------------| |
| | INV-2026-0089  | Acme Corp  | $7,700.00  | [*] Sent, Synced               | |
| | INV-2026-0090  | Tech Ind.  | $3,200.00  | [*] Sent, Synced               | |
| | INV-2026-0091  | GlobalCo   | $5,500.00  | [*] Sent, Synced               | |
| | INV-2026-0092  | StartupX   |   $950.00  | [*] Sent, Synced               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                      [View Invoices]  [Export Report]  [Close]                 |
+================================================================================+
```

---

## Payment Matching Interface

### Split-Pane Matching View (Desktop)
```
+================================================================================+
| PAYMENT RECONCILIATION                                     [Import] [Refresh]   |
+================================================================================+
|                                                                                 |
| +-- UNMATCHED BANK TRANSACTIONS ----+ +-- UNPAID INVOICES ------------------+ |
| |                                    | |                                     | |
| | Date     | Ref        | Amount    | | Invoice#       | Customer  | Amount | |
| |----------+------------+-----------| |----------------+-----------+--------| |
| | Jan 11   | ACME-PAY   | $7,700.00 | | INV-2026-0089  | Acme Corp | $7,700 | |
| |          |            |           | |                |           | [Match]| |
| |----------+------------+-----------| |----------------+-----------+--------| |
| | Jan 11   | TECH123    | $3,200.00 | | INV-2026-0090  | Tech Ind. | $3,200 | |
| |          |            |           | |                |           | [Match]| |
| |----------+------------+-----------| |----------------+-----------+--------| |
| | Jan 10   | Payment    | $5,000.00 | | INV-2026-0085  | GlobalCo  | $5,500 | |
| |          |            | [Partial?]| |                |           | [Match]| |
| |----------+------------+-----------| |----------------+-----------+--------| |
| | Jan 10   | UNKNOWN    |   $950.00 | | INV-2026-0087  | BigCo Ltd | $2,100 | |
| |          |            |           | |                |           | [Match]| |
| +------------------------------------+ |----------------+-----------+--------| |
|                                        | INV-2026-0088  | StartupX  |   $950 | |
| [< Import More Transactions]          |                |           | [Match]| |
|                                        +-------------------------------------+ |
|                                                                                 |
+=================================================================================+
|                                                                                 |
| +-- SUGGESTED MATCHES (Auto-detected) --------------------------------------+  |
| |                                                                            |  |
| | [!] 2 automatic matches found                                             |  |
| |                                                                            |  |
| | Transaction: ACME-PAY $7,700.00 <---> Invoice: INV-2026-0089 $7,700.00   |  |
| | Match Confidence: 95% (Amount exact, reference contains customer name)    |  |
| | [Accept Match]  [Reject]                                                  |  |
| |                                                                            |  |
| | Transaction: UNKNOWN $950.00 <---> Invoice: INV-2026-0088 $950.00        |  |
| | Match Confidence: 80% (Amount exact, date matches due date)               |  |
| | [Accept Match]  [Reject]                                                  |  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
+=================================================================================+
```

### Manual Match Dialog
```
+================================================================================+
| MATCH PAYMENT TO INVOICE                                                  [x]   |
+================================================================================+
|                                                                                 |
| +-- TRANSACTION -------------------------------------------------------------+ |
| |                                                                             | |
| | Date: January 10, 2026                                                     | |
| | Reference: Payment                                                         | |
| | Amount: $5,000.00                                                          | |
| | Bank Account: Business Cheque (****1234)                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- MATCH TO INVOICE --------------------------------------------------------+ |
| |                                                                             | |
| | Selected: INV-2026-0085 - GlobalCo - $5,500.00                            | |
| |                                                                             | |
| | [!] Amount Mismatch: Transaction is $3,200.00 less than invoice             | |
| |                                                                             | |
| | How would you like to handle this?                                         | |
| |                                                                             | |
| | (*) Record as partial payment                                              | |
| |     Remaining balance: $3,200.00                                             | |
| |     Invoice status: Partially Paid                                         | |
| |                                                                             | |
| | ( ) Write off difference                                                   | |
| |     Mark invoice as fully paid                                             | |
| |     Write-off account: [Bad Debt v]                                        | |
| |                                                                             | |
| | ( ) Allocate to multiple invoices                                          | |
| |     Split payment across invoices                                          | |
| |                                                                             | |
| | Notes:                                                                      | |
| | [Partial payment received, awaiting balance___________________]            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                      [Cancel]  [Apply Payment]                 |
+================================================================================+
```

### Reconciliation Progress Indicator
```
+================================================================================+
| RECONCILIATION STATUS                                                           |
+================================================================================+
|                                                                                 |
| +-- PROGRESS ----------------------------------------------------------------+ |
| |                                                                             | |
| |  Transactions Imported:     45                                             | |
| |  Auto-Matched:              28 (62%)                                       | |
| |  Manually Matched:          12 (27%)                                       | |
| |  Unmatched:                  5 (11%)                                       | |
| |                                                                             | |
| |  [=============================================>           ] 89%           | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- MATCHED TODAY -----------------------------------------------------------+ |
| |                                                                             | |
| | Total Matched: $125,450.00                                                 | |
| | Invoices Closed: 40                                                        | |
| | Partial Payments: 3                                                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Collection Workflow

### Collection Queue (Desktop)
```
+================================================================================+
| COLLECTION QUEUE                                        [Export] [Send Batch]   |
+================================================================================+
|                                                                                 |
| +-- COLLECTION METRICS ------------------------------------------------------+ |
| | +------------------+ +------------------+ +------------------+ +----------+| |
| | | Total Overdue    | | 30+ Days         | | 60+ Days         | | 90+ Days || |
| | |    $45,200       | |    $23,100       | |     $12,500      | |  $9,600  || |
| | |   15 invoices    | |    8 invoices    | |     4 invoices   | | 3 inv.   || |
| | +------------------+ +------------------+ +------------------+ +----------+| |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- QUEUE TABLE (Sorted by Days Overdue) ------------------------------------+ |
| |                                                                             | |
| | [ ] | Days | Invoice#       | Customer    | Amount    | Stage    | Actions | |
| |-----+------+----------------+-------------+-----------+----------+---------| |
| | [ ] | 45   | INV-2026-0045  | OldCo Ltd   | $8,500.00 | [!] ESC  | [Call]  | |
| |     |      |                |             |           |          | [Email] | |
| |     |      |                |             |           |          | [Stmt]  | |
| |-----+------+----------------+-------------+-----------+----------+---------| |
| | [ ] | 32   | INV-2026-0052  | LatePayCo   | $4,200.00 | Follow   | [Call]  | |
| |     |      |                |             |           |          | [Email] | |
| |-----+------+----------------+-------------+-----------+----------+---------| |
| | [ ] | 18   | INV-2026-0067  | SlowPay Inc | $2,100.00 | Initial  | [Call]  | |
| |     |      |                |             |           |          | [Email] | |
| |-----+------+----------------+-------------+-----------+----------+---------| |
| | [ ] | 12   | INV-2026-0078  | DelayedCo   | $1,500.00 | Initial  | [Call]  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| LEGEND: [!] ESC = Escalated | Follow = Follow-up stage | Initial = First contact|
+================================================================================+
```

### Collection Activity Timeline (On Invoice)
```
+================================================================================+
| COLLECTION HISTORY - INV-2026-0045                                              |
+================================================================================+
|                                                                                 |
| Invoice: $8,500.00 | Due: Dec 15, 2025 | Days Overdue: 45                     |
|                                                                                 |
| +-- ESCALATION PATH ---------------------------------------------------------+ |
| |                                                                             | |
| |  [INITIAL]----->[FOLLOW-UP]----->[ESCALATION]----->[FINAL NOTICE]          | |
| |     Dec 16        Dec 23            Jan 6          <- CURRENT               | |
| |       *             *                 *                                     | |
| |     (done)        (done)           (active)                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ACTIVITY TIMELINE -------------------------------------------------------+ |
| |                                                                             | |
| |  Jan 8, 2026 - 2:30 PM                                                     | |
| |  [Phone] Called - Spoke with Jane in accounts                              | |
| |  Result: Promised to pay by Jan 15                                         | |
| |  Logged by: Sarah (Finance)                                                | |
| |  -----------------------------------------------------------------------   | |
| |  Jan 6, 2026 - 9:00 AM                                                     | |
| |  [Email] Escalation email sent                                             | |
| |  Template: Escalation Notice                                               | |
| |  Status: Delivered, Opened                                                 | |
| |  -----------------------------------------------------------------------   | |
| |  Dec 29, 2025 - 10:15 AM                                                   | |
| |  [Phone] Called - No answer, left voicemail                                | |
| |  Logged by: Mike (Finance)                                                 | |
| |  -----------------------------------------------------------------------   | |
| |  Dec 23, 2025 - 9:00 AM                                                    | |
| |  [Email] Follow-up email sent automatically                                | |
| |  Status: Delivered, Opened Dec 24                                          | |
| |  -----------------------------------------------------------------------   | |
| |  Dec 16, 2025 - 9:00 AM                                                    | |
| |  [Email] Initial reminder sent automatically                               | |
| |  Status: Delivered                                                         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PROMISE TO PAY ----------------------------------------------------------+ |
| |                                                                             | |
| | [!] Active Promise: $8,500.00 by January 15, 2026                          | |
| |     Days remaining: 7                                                       | |
| |                                                                             | |
| |     [Mark as Broken]  [Record Payment Received]                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| ACTIONS: [Log Call] [Send Email] [Send Statement] [Schedule Follow-up]        |
+================================================================================+
```

### Log Collection Call Dialog
```
+================================================================================+
| LOG COLLECTION CALL                                                       [x]   |
+================================================================================+
|                                                                                 |
| Invoice: INV-2026-0045 | Customer: OldCo Ltd | Amount: $8,500.00              |
|                                                                                 |
| +-- CALL DETAILS ------------------------------------------------------------+ |
| |                                                                             | |
| | Contact Person: [Jane Smith____________]                                   | |
| | Phone Number: [(02) 9876 5432__________]                                   | |
| |                                                                             | |
| | Call Result:                                                               | |
| | (*) Spoke with contact                                                     | |
| | ( ) Left voicemail                                                         | |
| | ( ) No answer                                                              | |
| | ( ) Wrong number                                                           | |
| | ( ) Refused to take call                                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- OUTCOME -----------------------------------------------------------------+ |
| |                                                                             | |
| | [x] Promise to pay received                                                | |
| |                                                                             | |
| |     Amount: [$8,500.00______]  (Full / Partial)                           | |
| |     Date: [Jan 15, 2026___]                                               | |
| |                                                                             | |
| | [ ] Payment dispute raised                                                 | |
| | [ ] Request for payment plan                                               | |
| | [ ] Escalate to management                                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Notes:                                                                          |
| +-----------------------------------------------------------------------------+ |
| | Spoke with Jane in accounts. She confirmed the invoice was approved but    | |
| | payment run delayed due to holidays. Will be included in Jan 15 payment.   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Schedule Follow-up: [Jan 16, 2026 v] if payment not received                  |
|                                                                                 |
|                                               [Cancel]  [Log Call Activity]    |
+================================================================================+
```

---

## Collection Metrics Dashboard

### Desktop View
```
+================================================================================+
| COLLECTION PERFORMANCE                                  [Export] [Date: 30d v]  |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS (aria-live="polite") -----------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | Total Overdue    | | Collected (30d)  | | DSO              | | Success  ||  |
| | |    $45,200       | |    $125,800      | |    32 days       | |   78%    ||  |
| | | -$12K vs last mo | | +$18K vs last mo | | -3 days vs avg   | | +5%     ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- AGING BREAKDOWN ---------------------------------------------------------+  |
| |                                                                             |  |
| |  Current    1-30 Days   31-60 Days   61-90 Days   90+ Days                 |  |
| |  $120,500   $45,200     $23,100      $12,500      $9,600                   |  |
| |  ████████   ████        ██           █            █                        |  |
| |    57%        21%         11%          6%           5%                     |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- COLLECTION TREND --------------------------------------------------------+  |
| |                                                                             |  |
| | $150K|                                                                     |  |
| | $100K|    ___     ___     ___     ___     ___                              |  |
| |  $50K|   |   |   |   |   |   |   |   |   |   |                             |  |
| |    $0|___|___|___|___|___|___|___|___|___|___|___                          |  |
| |       Week1  Week2  Week3  Week4  Week5                                    |  |
| |                                                                             |  |
| |  [---] Overdue  [███] Collected                                            |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- PROMISE TRACKING --------------------------------------------------------+  |
| |                                                                             |  |
| | Active Promises: 8        Fulfilled (30d): 12       Broken (30d): 3       |  |
| | Total Value: $42,500      Collected: $38,200        Lost: $8,500          |  |
| |                                                                             |  |
| | Promise fulfillment rate: 80%                                              |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Cash Flow Forecast

### Forecast Chart View
```
+================================================================================+
| CASH FLOW FORECAST                            [Export] [Period: Monthly v]      |
+================================================================================+
|                                                                                 |
| +-- FORECAST SUMMARY --------------------------------------------------------+ |
| | +------------------+ +------------------+ +------------------+              | |
| | | Next 30 Days     | | Next 60 Days     | | Next 90 Days     |             | |
| | | $185,000         | | $320,000         | | $445,000         |             | |
| | | Expected AR      | | Expected AR      | | Expected AR      |             | |
| | +------------------+ +------------------+ +------------------+              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- FORECAST VS ACTUAL CHART ------------------------------------------------+ |
| |                                                                             | |
| | $200K|                                    ____                              | |
| |      |                              ____/                                   | |
| | $150K|                        ____/      ____----                           | |
| |      |                  ____/    ____----                                   | |
| | $100K|            ____/  ____----                                           | |
| |      |      ____/ ____----                                                  | |
| |  $50K| ____/----                                                            | |
| |      |----                                                                  | |
| |    $0|__|__|__|__|__|__|__|__|__|__|__|__|__                                | |
| |       Jan  Feb  Mar  Apr  May  Jun  Jul                                    | |
| |                                                                             | |
| |  [---] Forecast (based on due dates)                                       | |
| |  [___] Forecast (adjusted for payment patterns)                            | |
| |  [===] Actual received                                                     | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CUSTOMER PAYMENT PATTERNS -----------------------------------------------+ |
| |                                                                             | |
| | Customer      | Avg Days to Pay | Reliability | Impact on Forecast         | |
| |---------------+-----------------+-------------+----------------------------| |
| | Acme Corp     |      7 days     |    98%      | Early payer (+)            | |
| | Tech Ind.     |     18 days     |    85%      | On time                    | |
| | GlobalCo      |     35 days     |    70%      | Late payer (-$5K shift)    | |
| | OldCo Ltd     |     52 days     |    45%      | Unreliable (-$8.5K risk)   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- FORECAST BREAKDOWN BY WEEK ----------------------------------------------+ |
| |                                                                             | |
| | Week      | Due       | Expected  | Confidence | Notes                      | |
| |-----------+-----------+-----------+------------+---------------------------| |
| | Jan 13-19 | $42,500   | $38,000   |    89%     | 3 late payers              | |
| | Jan 20-26 | $55,000   | $52,000   |    94%     | Major customer due         | |
| | Jan 27-Feb 2 | $35,000 | $32,500  |    93%     | Standard mix              | |
| | Feb 3-9   | $52,500   | $47,000   |    89%     | 2 unreliable customers    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Month-End Close Process

### Month-End Checklist
```
+================================================================================+
| MONTH-END CLOSE - JANUARY 2026                                           [x]   |
+================================================================================+
|                                                                                 |
| Close Period: January 1 - January 31, 2026                                     |
| Status: IN PROGRESS                                                            |
|                                                                                 |
| +-- CLOSE CHECKLIST ---------------------------------------------------------+ |
| |                                                                             | |
| | [===========================================>                 ] 70%        | |
| |                                                                             | |
| | INVOICING                                                                  | |
| | [*] All shipped orders invoiced                        7 of 7              | |
| | [*] All completed jobs invoiced                        12 of 12            | |
| | [ ] Review uninvoiced items                            3 items pending     | |
| |     [View Uninvoiced]                                                      | |
| |                                                                             | |
| | PAYMENTS                                                                   | |
| | [*] All bank transactions imported                     Jan 1-31            | |
| | [*] Payments matched to invoices                       98% matched         | |
| | [ ] Review unmatched payments                          4 transactions      | |
| |     [View Unmatched]                                                       | |
| |                                                                             | |
| | RECONCILIATION                                                             | |
| | [*] AR balance matches Xero                            $210,500            | |
| | [ ] Review aged receivables                            Report ready        | |
| |     [View Report]                                                          | |
| | [ ] Identify accruals                                  2 potential         | |
| |     [Review Accruals]                                                      | |
| |                                                                             | |
| | XERO SYNC                                                                  | |
| | [*] All invoices synced                                152 invoices        | |
| | [*] All payments synced                                148 payments        | |
| | [ ] Verify sync accuracy                               Pending review      | |
| |     [Run Verification]                                                     | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CLOSE SUMMARY -----------------------------------------------------------+ |
| |                                                                             | |
| | Revenue (January):        $485,200                                         | |
| | Payments Received:        $452,800                                         | |
| | Outstanding AR:           $210,500                                         | |
| | Bad Debt Write-off:         $2,100                                         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [!] WARNING: 3 uninvoiced items and 4 unmatched payments must be resolved     |
|     before period can be closed.                                               |
|                                                                                 |
|                          [Save Progress]  [Generate Report]  [Close Period]    |
+================================================================================+
```

---

## Error States

### Xero Sync Failure
```
+================================================================+
| [!] Xero Sync Failed                                      [x]   |
+================================================================+
|                                                                 |
| Invoice INV-2026-0089 could not be synced to Xero.             |
|                                                                 |
| Error: Invalid tax rate specified                               |
|                                                                 |
| Details:                                                        |
| - Tax rate 'GST 10%' not found in Xero                         |
| - Check Xero tax settings match CRM configuration              |
|                                                                 |
| [View Invoice]  [Configure Tax Mapping]  [Retry Sync]          |
+================================================================+
```

### Payment Match Conflict
```
+================================================================+
| [!] Match Conflict                                        [x]   |
+================================================================+
|                                                                 |
| Transaction: $7,700.00 (ACME-PAY)                               |
|                                                                 |
| This payment has already been matched to:                       |
| Invoice INV-2026-0089 on January 10, 2026                       |
|                                                                 |
| If this is a duplicate transaction:                             |
| - The bank may have imported the same payment twice            |
| - Check bank statement for duplicates                          |
|                                                                 |
| [View Existing Match]  [Force New Match]  [Mark as Duplicate]  |
+================================================================+
```

---

## Loading States

### Reconciliation Loading
```
+================================================================================+
| PAYMENT RECONCILIATION                                                          |
+================================================================================+
|                                                                                 |
|                     +----------------------------------+                        |
|                     |                                  |                        |
|                     |        [Spinner Animation]       |                        |
|                     |                                  |                        |
|                     |   Importing transactions from    |                        |
|                     |   Xero...                        |                        |
|                     |                                  |                        |
|                     |   Found: 45 transactions         |                        |
|                     |   Analyzing matches...           |                        |
|                     |                                  |                        |
|                     +----------------------------------+                        |
|                                                                                 |
+================================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Invoicing workflow">
  <!-- Collection Queue -->
  <section role="region" aria-label="Collection queue">
    <table role="grid" aria-label="Overdue invoices">
      <thead>
        <tr>
          <th scope="col">Days Overdue</th>
          <th scope="col">Invoice</th>
          <!-- ... -->
        </tr>
      </thead>
      <tbody>
        <tr aria-label="Invoice INV-2026-0045, 45 days overdue, $8,500">
          <!-- Row content -->
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Payment Matching -->
  <section role="region" aria-label="Payment matching">
    <div role="list" aria-label="Unmatched transactions">
      <!-- Transaction items -->
    </div>
    <div role="list" aria-label="Unpaid invoices">
      <!-- Invoice items -->
    </div>
  </section>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Filter/search controls
2. Batch action buttons
3. Table rows (arrow keys for navigation)
4. Action buttons within rows

Matching Interface:
- Tab between transaction and invoice lists
- Enter to select/match
- Space to expand transaction details
- Escape to cancel match operation

Screen Reader:
- Table totals announced on focus
- Match suggestions announced as alerts
- Status changes announced immediately
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Stacked lists, bottom sheet for matching |
| Tablet | 640px - 1024px | Tab-based split view, compact tables |
| Desktop | > 1024px | Full split-pane matching, expanded tables |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Invoice generation | < 2s | Single invoice creation |
| Batch generation | < 500ms/invoice | Per-invoice in batch |
| Transaction import | < 5s | 100 transactions from Xero |
| Auto-match | < 2s | Match suggestions for 50 items |
| Forecast calculation | < 3s | 90-day forecast |

---

## Related Wireframes

- [Order Fulfillment](./order-fulfillment.wireframe.md)
- [Job Completion](./job-completion.wireframe.md)
- [Financial Dashboard](../domains/financial-dashboard.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
