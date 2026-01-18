# Lead-to-Order Workflow Wireframe
## WF-LEAD-ORDER: End-to-End Sales Process

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/lead-to-order.prd.json
**Priority:** 1 (Primary revenue-generating workflow)

---

## Overview

The Lead-to-Order workflow guides sales through the complete cycle from opportunity creation to order conversion. This wireframe covers:
- Sales wizard with step navigation
- Quote lifecycle tracking
- Follow-up automation
- One-click conversion flow
- Conversion analytics

**Workflow Stages:** Create Opportunity -> Build Quote -> Send Quote -> Customer Response -> Convert to Order

**Aesthetic:** "Guided journey" - Clear progress, encouraging completion

---

## Progress Indicator Design

### Horizontal Stepper (Desktop/Tablet)
```
+================================================================================+
|                                                                                 |
|    [1]--------[2]--------[3]--------[4]--------[5]                             |
|   Create    Build      Send      Customer    Convert                           |
|   Opp       Quote      Quote     Response    Order                             |
|    *         *                                                                  |
|  (done)   (active)                                                             |
|                                                                                 |
|  Progress: Step 2 of 5 - Building Quote                                        |
|  [====================>                              ] 40%                      |
|                                                                                 |
+================================================================================+

LEGEND:
[1]* = Completed step (filled circle, checkmark, green)
[2]* = Active step (filled circle, pulsing border, blue)
[3]  = Pending step (empty circle, gray)
---  = Connector line (solid for complete, dashed for pending)
```

### Vertical Stepper (Mobile < 640px)
```
+================================+
|                                |
| [*] Create Opportunity         |
|  |  Acme Corp - $15,000        |
|  |                             |
| [*] Build Quote                |
|  |  3 products added           |
|  |  <- CURRENT STEP            |
|  |                             |
| [ ] Send Quote                 |
|  :                             |
| [ ] Customer Response          |
|  :                             |
| [ ] Convert to Order           |
|                                |
| Progress: 40% Complete         |
+================================+
```

---

## Step 1: Create/Select Customer

### Desktop View (1280px+)
```
+================================================================================+
| SALES WIZARD                                               [Save Draft] [x]     |
+================================================================================+
| [1]--------[2]--------[3]--------[4]--------[5]                                |
| Select     Build      Review     Send       Complete                           |
| Customer   Quote      Quote      Quote                                         |
|  (active)                                                                       |
+================================================================================+
|                                                                                 |
| STEP 1: SELECT CUSTOMER                                                        |
|                                                                                 |
| +-- SEARCH EXISTING -------------+ +-- OR CREATE NEW ------------------+       |
| |                                | |                                    |       |
| | [Search customers...________]  | | [+ Create New Customer]           |       |
| |                                | |                                    |       |
| | RECENT CUSTOMERS:              | | Quick add for new leads           |       |
| | +----------------------------+ | |                                    |       |
| | | Brisbane Solar Co           | | |                                    |       |
| | | 5 opportunities, $125K     | | |                                    |       |
| | +----------------------------+ | |                                    |       |
| | | Tech Industries            | | |                                    |       |
| | | 2 opportunities, $45K      | | |                                    |       |
| | +----------------------------+ | |                                    |       |
| +--------------------------------+ +------------------------------------+       |
|                                                                                 |
| SELECTED CUSTOMER:                                                             |
| +----------------------------------------------------------------------------+ |
| | Brisbane Solar Co                                              [Change]     | |
| | John Smith (Primary) | john@acme.com | (555) 123-4567                      | |
| | 123 Business St, Sydney NSW 2000                                           | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
| SELECT CONTACT FOR QUOTE:                                                      |
| +----------------------------+ +----------------------------+                   |
| | [*] John Smith (Primary)   | | [ ] Jane Doe (Accounts)    |                  |
| |     john@acme.com          | |     jane@acme.com          |                  |
| +----------------------------+ +----------------------------+                   |
|                                                                                 |
|                                            [Cancel]  [Continue to Quote ->]    |
+================================================================================+
```

### Mobile View (< 640px)
```
+================================+
| Sales Wizard              [x]  |
+================================+
| Step 1 of 5                    |
| [=====>                   ] 20%|
+================================+
|                                |
| SELECT CUSTOMER                |
|                                |
| [Search customers..._______]   |
|                                |
| -- RECENT --                   |
| +----------------------------+ |
| | Brisbane Solar Co           | |
| | 5 opps, $125K              | |
| +----------------------------+ |
| | Tech Industries            | |
| | 2 opps, $45K               | |
| +----------------------------+ |
|                                |
| [+ Create New Customer]        |
|                                |
| -- SELECTED --                 |
| +----------------------------+ |
| | Brisbane Solar Co           | |
| | John Smith                 | |
| | john@acme.com              | |
| |              [Change]      | |
| +----------------------------+ |
|                                |
| -- CONTACT --                  |
| (*) John Smith (Primary)       |
| ( ) Jane Doe (Accounts)        |
|                                |
+================================+
| [Back]       [Continue ->]     |
+================================+
```

---

## Step 2: Build Quote

### Desktop View (1280px+)
```
+================================================================================+
| SALES WIZARD                                               [Save Draft] [x]     |
+================================================================================+
| [1]--------[2]--------[3]--------[4]--------[5]                                |
| Select     Build      Review     Send       Complete                           |
| Customer   Quote      Quote      Quote                                         |
|    *       (active)                                                            |
+================================================================================+
|                                                                                 |
| STEP 2: BUILD QUOTE                                                            |
| Customer: Brisbane Solar Co - John Smith                                        |
|                                                                                 |
| +-- ADD PRODUCTS -------------------------------------------------------------+|
| |                                                                              ||
| | [Search products...___________________________] [+ Add Custom Line]          ||
| |                                                                              ||
| | SUGGESTED (Based on customer history):                                       ||
| | +----------+ +----------+ +----------+                                       ||
| | | Widget A | | Widget B | | Service  |                                       ||
| | | $3,200     | | $750     | | $200/hr  |                                       ||
| | | [Add]    | | [Add]    | | [Add]    |                                       ||
| | +----------+ +----------+ +----------+                                       ||
| +------------------------------------------------------------------------------+|
|                                                                                 |
| +-- QUOTE ITEMS --------------------------------------------------------------+|
| | Product            | Qty  | Unit Price | Discount | Line Total   | Actions  ||
| |--------------------+------+------------+----------+--------------+----------||
| | 10kWh LFP Battery System X       | 10   | $3,200.00    | 10%      | $4,500.00    | [E] [x]  ||
| | Installation Svc   | 5    | $200.00    | -        | $8,500.00    | [E] [x]  ||
| | Support Package    | 1    | $2,000.00  | -        | $2,000.00    | [E] [x]  ||
| +------------------------------------------------------------------------------+|
|                                                                                 |
| +-- QUOTE SUMMARY ----------------------------+                                 |
| | Subtotal:                        $7,500.00  |                                 |
| | Discount Applied:                 -$3,200.00  |                                 |
| | GST (10%):                         $700.00  |                                 |
| | ------------------------------------------- |                                 |
| | TOTAL:                           $7,700.00  |                                 |
| +---------------------------------------------+                                 |
|                                                                                 |
|                                      [<- Back]  [Continue to Review ->]        |
+================================================================================+
```

### Tablet View (768px - 1024px)
```
+================================================================+
| Sales Wizard                            [Save Draft] [x]        |
+================================================================+
| [1]----[2]----[3]----[4]----[5]                                |
|   *   active                                                    |
+================================================================+
|                                                                 |
| BUILD QUOTE - Brisbane Solar Co                                  |
|                                                                 |
| [Search products...___________] [+ Custom]                      |
|                                                                 |
| +-- ITEMS (Swipe to delete) -------------------------------+   |
| | 10kWh LFP Battery System X         10 x $3,200    -10%    $4,500   [E]   |   |
| | Installation Svc      5 x $200     -      $8,500   [E]   |   |
| | Support Package       1 x $2,000   -      $2,000   [E]   |   |
| +----------------------------------------------------------+   |
|                                                                 |
| +-- SUMMARY ----+                                               |
| | Subtotal: $7,500 | Discount: -$3,200 | GST: $700              |
| | TOTAL: $7,700                                               |
| +---------------+                                               |
|                                                                 |
| [<- Back]                            [Continue ->]             |
+================================================================+
```

---

## Step 3: Review Quote

### Desktop View
```
+================================================================================+
| SALES WIZARD                                               [Save Draft] [x]     |
+================================================================================+
| [1]--------[2]--------[3]--------[4]--------[5]                                |
| Select     Build      Review     Send       Complete                           |
| Customer   Quote      Quote      Quote                                         |
|    *         *       (active)                                                  |
+================================================================================+
|                                                                                 |
| STEP 3: REVIEW QUOTE                                                           |
|                                                                                 |
| +-- QUOTE PREVIEW (PDF-like) ------------------------------------------------+ |
| |                                                                             | |
| |   [COMPANY LOGO]                                                            | |
| |                                                                             | |
| |   QUOTATION                                      Quote #: QT-2026-0042      | |
| |   Date: January 10, 2026                         Valid Until: Jan 24, 2026  | |
| |                                                                             | |
| |   TO:                            FROM:                                      | |
| |   Brisbane Solar Co               Renoz Batterys                              | |
| |   John Smith                     123 Main St                                | |
| |   john@acme.com                  Sydney NSW 2000                            | |
| |                                                                             | |
| |   +--------------------------------------------------------------------+   | |
| |   | Description          | Qty | Unit Price | Discount | Total        |   | |
| |   |----------------------+-----+------------+----------+--------------|   | |
| |   | 10kWh LFP Battery System X         |  10 |    $3,200.00 |      10% |   $4,500.00  |   | |
| |   | Installation Service |   5 |    $200.00 |        - |   $8,500.00  |   | |
| |   | Support Package      |   1 |  $2,000.00 |        - |   $2,000.00  |   | |
| |   +--------------------------------------------------------------------+   | |
| |                                                                             | |
| |                                         Subtotal:           $7,500.00       | |
| |                                         Discount:            -$3,200.00       | |
| |                                         GST (10%):            $700.00       | |
| |                                         TOTAL AUD:          $7,700.00       | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- QUOTE OPTIONS -----------------------------------------------------------+ |
| |                                                                             | |
| | Quote Validity: [14 days v]     Notes for Customer:                        | |
| |                                 [___________________________________]       | |
| | Terms & Conditions: [Standard v][___________________________________]       | |
| |                                 [___________________________________]       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                            [<- Back]  [Save as Draft]  [Continue to Send ->]   |
+================================================================================+
```

---

## Step 4: Send Quote

### Desktop View
```
+================================================================================+
| SALES WIZARD                                               [Save Draft] [x]     |
+================================================================================+
| [1]--------[2]--------[3]--------[4]--------[5]                                |
| Select     Build      Review     Send       Complete                           |
| Customer   Quote      Quote      Quote                                         |
|    *         *          *       (active)                                       |
+================================================================================+
|                                                                                 |
| STEP 4: SEND QUOTE                                                             |
|                                                                                 |
| +-- SEND OPTIONS ------------------------------------------------------------+ |
| |                                                                             | |
| | Send To:                                                                    | |
| | [x] John Smith <john@acme.com>                                             | |
| | [ ] Jane Doe <jane@acme.com>                                               | |
| | [+ Add another recipient]                                                   | |
| |                                                                             | |
| | Email Subject:                                                              | |
| | [Quote #QT-2026-0042 from Renoz Batterys_________________________]           | |
| |                                                                             | |
| | Email Message:                                                              | |
| | +-----------------------------------------------------------------------+   | |
| | | Hi John,                                                              |   | |
| | |                                                                       |   | |
| | | Thank you for the opportunity to quote on your requirements.          |   | |
| | | Please find attached our quotation for your review.                   |   | |
| | |                                                                       |   | |
| | | This quote is valid until January 24, 2026.                           |   | |
| | |                                                                       |   | |
| | | Please let me know if you have any questions.                         |   | |
| | |                                                                       |   | |
| | | Best regards,                                                         |   | |
| | | [Your Name]                                                           |   | |
| | +-----------------------------------------------------------------------+   | |
| |                                                                             | |
| | Attachments:                                                                | |
| | [x] Quote PDF                                                               | |
| | [ ] Terms & Conditions                                                      | |
| |                                                                             | |
| | Follow-up Sequence:                                                         | |
| | [x] Enable automated follow-ups                                            | |
| |     - Day 3: Friendly check-in                                             | |
| |     - Day 7: Value reminder                                                | |
| |     - Day 14: Final follow-up                                              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                     [<- Back]  [Save Draft]  [Send Quote ->]   |
+================================================================================+
```

---

## Step 5: Complete / Success State

### Quote Sent Success
```
+================================================================================+
| SALES WIZARD                                                              [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]--------[5]                                |
| Select     Build      Review     Send       Complete                           |
| Customer   Quote      Quote      Quote                                         |
|    *         *          *          *        (active)                           |
+================================================================================+
|                                                                                 |
|                        +========================================+               |
|                        |                                        |               |
|                        |        [Animated Checkmark]            |               |
|                        |              SUCCESS!                  |               |
|                        |                                        |               |
|                        |    Quote QT-2026-0042 has been sent    |               |
|                        |    to john@acme.com                    |               |
|                        |                                        |               |
|                        +========================================+               |
|                                                                                 |
| +-- WHAT'S NEXT ---------------------------------------------------------+     |
| |                                                                         |     |
| |  Quote Lifecycle Status:                                                |     |
| |  [SENT] -----> [VIEWED] -----> [APPROVED] -----> [CONVERTED]            |     |
| |    *                                                                     |     |
| |  (current)                                                              |     |
| |                                                                         |     |
| |  You'll be notified when:                                               |     |
| |  - Customer views the quote                                             |     |
| |  - Customer approves or requests changes                                |     |
| |                                                                         |     |
| |  Automated follow-ups scheduled:                                        |     |
| |  - Jan 13: Friendly check-in                                            |     |
| |  - Jan 17: Value reminder                                               |     |
| |  - Jan 24: Final follow-up (quote expires)                              |     |
| +-------------------------------------------------------------------------+     |
|                                                                                 |
| [View Opportunity]  [Create Another Quote]  [Back to Pipeline]                 |
+================================================================================+
```

---

## Quote Lifecycle Status Panel

### On Opportunity Detail Page
```
+================================================================================+
| OPPORTUNITY: ACME CORP - WIDGET PROJECT                                        |
+================================================================================+
|                                                                                 |
| +-- QUOTE STATUS (aria-live="polite") ---------------------------------------+ |
| |                                                                             | |
| |  Quote #QT-2026-0042 - $7,700.00                                           | |
| |                                                                             | |
| |  [DRAFT] --> [SENT] --> [VIEWED] --> [APPROVED] --> [CONVERTED]            | |
| |                           *                                                 | |
| |                        (current)                                            | |
| |                                                                             | |
| |  Status: VIEWED                                                             | |
| |  Viewed At: Jan 11, 2026 2:34 PM (2 hours ago)                             | |
| |  View Count: 3 times                                                        | |
| |                                                                             | |
| |  [!] Waiting for customer response                                          | |
| |      Quote expires in 12 days                                               | |
| |                                                                             | |
| |  Actions:                                                                   | |
| |  [Send Follow-up]  [Extend Quote]  [Edit Quote]                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Follow-Up Timeline

### Timeline View (Desktop)
```
+================================================================================+
| FOLLOW-UP SEQUENCE                                           [Pause] [Cancel]   |
+================================================================================+
|                                                                                 |
| Status: ACTIVE - Step 2 of 3                                                   |
| [=========================================>                    ] 66%            |
|                                                                                 |
| +-- TIMELINE -------------------------------------------------------------+    |
| |                                                                          |    |
| |  [*] Day 0: Quote Sent                                     Jan 10       |    |
| |   |  Email delivered to john@acme.com                                    |    |
| |   |  [View Email]                                                       |    |
| |   |                                                                      |    |
| |  [*] Day 3: Friendly Check-in                              Jan 13       |    |
| |   |  Email sent - "Just checking in on the quote..."                    |    |
| |   |  Opened: Jan 13, 4:15 PM                                           |    |
| |   |  [View Email]                                                       |    |
| |   |                                                                      |    |
| |  [ ] Day 7: Value Reminder                                 Jan 17       |    |
| |   :  Scheduled - 4 days away                            <- NEXT         |    |
| |   :  [Send Now] [Skip] [Edit]                                           |    |
| |   :                                                                      |    |
| |  [ ] Day 14: Final Follow-up                               Jan 24       |    |
| |      Scheduled                                                           |    |
| |      Quote expires this day                                              |    |
| +--------------------------------------------------------------------------+    |
|                                                                                 |
| [+ Add Custom Follow-up]                           [Send Immediate Follow-up]   |
+================================================================================+
```

### Mobile View (< 640px)
```
+================================+
| Follow-up Sequence   [...]     |
+================================+
| ACTIVE - Step 2 of 3           |
| [=============>          ] 66% |
+================================+
|                                |
| [Accordion - Tap to expand]    |
|                                |
| [v] Day 0: Quote Sent          |
|     Jan 10 - Delivered         |
|                                |
| [v] Day 3: Check-in            |
|     Jan 13 - Sent & Opened     |
|                                |
| [>] Day 7: Value Reminder      |
|     Jan 17 - NEXT              |
|     [Send Now]                 |
|                                |
| [ ] Day 14: Final              |
|     Jan 24 - Scheduled         |
|                                |
+================================+
| [+ Add Follow-up]              |
+================================+
```

---

## One-Click Conversion Wizard

### Step 1: Review Quote
```
+================================================================================+
| CONVERT TO ORDER                                                          [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Review     Stock      Confirm    Complete                                      |
| Quote      Check                                                               |
| (active)                                                                        |
+================================================================================+
|                                                                                 |
| STEP 1: REVIEW APPROVED QUOTE                                                  |
|                                                                                 |
| Quote #QT-2026-0042 was approved on Jan 15, 2026                              |
|                                                                                 |
| +-- QUOTE SUMMARY -----------------------------------------------------------+ |
| | Customer: Brisbane Solar Co                                                  | |
| | Contact: John Smith <john@acme.com>                                        | |
| |                                                                             | |
| | Items:                                                                      | |
| | +-----------------------------------------------------------------------+   | |
| | | 10kWh LFP Battery System X           | 10 units | $4,500.00                         |   | |
| | | Installation Service   |  5 hours | $8,500.00                         |   | |
| | | Support Package        |  1 year  | $2,000.00                         |   | |
| | +-----------------------------------------------------------------------+   | |
| |                                                                             | |
| | Total: $7,700.00 (incl. GST)                                               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                   [Cancel]  [Check Stock ->]   |
+================================================================================+
```

### Step 2: Stock Check
```
+================================================================================+
| CONVERT TO ORDER                                                          [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Review     Stock      Confirm    Complete                                      |
| Quote      Check                                                               |
|    *      (active)                                                             |
+================================================================================+
|                                                                                 |
| STEP 2: STOCK AVAILABILITY CHECK                                               |
|                                                                                 |
| +-- STOCK STATUS ------------------------------------------------------------+ |
| |                                                                             | |
| | Product              | Needed | Available | Status                         | |
| |----------------------+--------+-----------+--------------------------------| |
| | 10kWh LFP Battery System X         |     10 |        15 | [*] In Stock                  | |
| | Installation Service |      5 |       N/A | [*] Service (no stock)        | |
| | Support Package      |      1 |       N/A | [*] Service (no stock)        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [*] All items available - Ready to convert!                                    |
|                                                                                 |
|                                           [<- Back]  [Continue to Confirm ->]  |
+================================================================================+
```

### Stock Check - Partial Availability Warning
```
+================================================================================+
| CONVERT TO ORDER                                                          [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Review     Stock      Confirm    Complete                                      |
| Quote      Check                                                               |
|    *      (active)                                                             |
+================================================================================+
|                                                                                 |
| STEP 2: STOCK AVAILABILITY CHECK                                               |
|                                                                                 |
| +-- STOCK STATUS ------------------------------------------------------------+ |
| |                                                                             | |
| | [!] PARTIAL STOCK AVAILABLE                                                | |
| |                                                                             | |
| | Product              | Needed | Available | Status                         | |
| |----------------------+--------+-----------+--------------------------------| |
| | 10kWh LFP Battery System X         |     10 |         7 | [!] Partial (3 short)         | |
| | Installation Service |      5 |       N/A | [*] Service (no stock)        | |
| | Support Package      |      1 |       N/A | [*] Service (no stock)        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- RESOLUTION OPTIONS ------------------------------------------------------+ |
| |                                                                             | |
| | ( ) Wait for full stock (ETA: Jan 25, 2026 - 10 days)                      | |
| |     Order will be created but held until stock arrives                      | |
| |                                                                             | |
| | (*) Partial fulfillment                                                     | |
| |     Ship 7 now, backorder 3 (customer notified)                            | |
| |                                                                             | |
| | ( ) Substitute product                                                      | |
| |     10kWh LFP Battery System X2 available (10 in stock) - Price: $520/unit               | |
| |     [View Comparison]                                                       | |
| |                                                                             | |
| | ( ) Cancel conversion                                                       | |
| |     Return to opportunity                                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                           [<- Back]  [Continue to Confirm ->]  |
+================================================================================+
```

### Step 3: Confirm Order
```
+================================================================================+
| CONVERT TO ORDER                                                          [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Review     Stock      Confirm    Complete                                      |
| Quote      Check                                                               |
|    *         *       (active)                                                  |
+================================================================================+
|                                                                                 |
| STEP 3: CONFIRM ORDER CREATION                                                 |
|                                                                                 |
| +-- ORDER SUMMARY -----------------------------------------------------------+ |
| |                                                                             | |
| | Customer: Brisbane Solar Co                                                  | |
| | Order Type: Sales Order                                                     | |
| | Source: Quote #QT-2026-0042                                                | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+   | |
| | | 10kWh LFP Battery System X           | 10 units |    $4,500.00                      |   | |
| | | Installation Service   |  5 hours |    $8,500.00                      |   | |
| | | Support Package        |  1 year  |    $2,000.00                      |   | |
| | |                        |          |                                   |   | |
| | | Subtotal:              |          |    $7,000.00                      |   | |
| | | GST (10%):             |          |      $700.00                      |   | |
| | | ORDER TOTAL:           |          |    $7,700.00                      |   | |
| | +-----------------------------------------------------------------------+   | |
| |                                                                             | |
| | Shipping Address:                                                           | |
| | 123 Business St, Sydney NSW 2000                                           | |
| |                                                                             | |
| | [x] Send order confirmation to customer                                    | |
| | [ ] Requires installation job (will be created automatically)              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                          [<- Back]  [Create Order]             |
+================================================================================+
```

### Step 4: Success / Complete
```
+================================================================================+
| CONVERT TO ORDER                                                          [x]   |
+================================================================================+
| [1]--------[2]--------[3]--------[4]                                           |
| Review     Stock      Confirm    Complete                                      |
| Quote      Check                                                               |
|    *         *          *       (active)                                       |
+================================================================================+
|                                                                                 |
|                      +==========================================+              |
|                      |                                          |              |
|                      |     [Celebration Animation / Confetti]   |              |
|                      |                                          |              |
|                      |              ORDER CREATED!              |              |
|                      |                                          |              |
|                      |     Order #ORD-2026-0123                 |              |
|                      |     $7,700.00                            |              |
|                      |                                          |              |
|                      +==========================================+              |
|                                                                                 |
| +-- SUMMARY ----------------------------------------------------------------+  |
| |                                                                            |  |
| | [*] Quote converted to order                                              |  |
| | [*] Opportunity marked as WON                                             |  |
| | [*] Stock allocated                                                       |  |
| | [*] Order confirmation sent to customer                                   |  |
| | [ ] Installation job created (pending scheduling)                         |  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| [View Order]  [Schedule Installation]  [Back to Pipeline]                      |
+================================================================================+
```

---

## Conversion Analytics Dashboard

### Desktop View
```
+================================================================================+
| CONVERSION ANALYTICS                                    [Export] [Date: 30d v]  |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS (aria-live="polite") -----------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | Quotes Sent      | | View Rate        | | Approval Rate    | | Convert  ||  |
| | |       45         | |      78%         | |       62%        | |    85%   ||  |
| | | +12% vs last mo  | | +5% vs last mo   | | -3% vs last mo   | | +8%     ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- CONVERSION FUNNEL -------------------------------------------------------+  |
| |                                                                             |  |
| |  QUOTES SENT (45)                                                          |  |
| |  +======================================================================+   |  |
| |  |######################################################################|   |  |
| |  +======================================================================+   |  |
| |                                      |                                       |  |
| |                                      v 78% viewed                            |  |
| |  QUOTES VIEWED (35)                                                        |  |
| |  +======================================================+                   |  |
| |  |######################################################|                   |  |
| |  +======================================================+                   |  |
| |                                      |                                       |  |
| |                                      v 62% approved                          |  |
| |  QUOTES APPROVED (22)                                                      |  |
| |  +======================================+                                   |  |
| |  |######################################|                                   |  |
| |  +======================================+                                   |  |
| |                                      |                                       |  |
| |                                      v 85% converted                         |  |
| |  ORDERS CREATED (19)                                                       |  |
| |  +==================================+                                       |  |
| |  |##################################|                                       |  |
| |  +==================================+                                       |  |
| |                                                                             |  |
| |  DROP-OFF ANALYSIS:                                                        |  |
| |  - 22% never viewed (10 quotes) - Consider resending                       |  |
| |  - 38% viewed but not approved (13 quotes) - Review pricing/competition    |  |
| |  - 15% approved but not converted (3 quotes) - Check stock issues          |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- AVG TIME BY STAGE -------------------------------------------------------+  |
| |                                                                             |  |
| |  Sent -> Viewed:     1.2 days                                              |  |
| |  Viewed -> Approved: 3.5 days                                              |  |
| |  Approved -> Order:  0.5 days                                              |  |
| |  Total Avg Cycle:    5.2 days                                              |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Win Probability Gauge

### On Opportunity Card
```
+==========================================+
| [=] Brisbane Solar Co          [EDIT]     |
|==========================================|
| $15,000                   Expected:      |
|                          Jan 25, 2026    |
|------------------------------------------+
|                                          |
|    Win Probability                       |
|                                          |
|         +---------+                      |
|       / 65%       \                      |
|      |   [!]       |                     |
|       \    HIGH   /                      |
|         +---------+                      |
|     (auto-calculated)                    |
|                                          |
|   Factors:                               |
|   + Quote viewed 3x                      |
|   + Customer tier: Gold                  |
|   - 5 days in stage                      |
|                                          |
|   [Override] [View History]              |
+==========================================+
  Color: Green (>60%), Yellow (30-60%), Red (<30%)
  aria-label="Win probability 65 percent, rated high"
```

### Probability History Timeline
```
+================================================================================+
| WIN PROBABILITY HISTORY                                                         |
+================================================================================+
|                                                                                 |
| Current: 65% (HIGH)                                     [Manual Override]       |
|                                                                                 |
| +-- TREND CHART -------------------------------------------------------------+ |
| |                                                                             | |
| | 100%|                                                                       | |
| |  80%|                                    * 65%                              | |
| |  60%|                        * 55%   * 60%                                  | |
| |  40%|            * 40%   * 45%                                              | |
| |  20%|     * 30%                                                             | |
| |   0%|_*_____|______|______|______|______|______|                           | |
| |     Jan 5   7      9      11     13     15     17                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CHANGE LOG --------------------------------------------------------------+ |
| | Date       | Prob  | Change | Reason                                       | |
| |------------+-------+--------+----------------------------------------------| |
| | Jan 15     |   65% |   +5%  | Customer viewed quote 3rd time               | |
| | Jan 13     |   60% |   +5%  | Follow-up email opened                       | |
| | Jan 11     |   55% |  +10%  | Quote sent and viewed                        | |
| | Jan 10     |   45% |   +5%  | Quote created with competitive pricing       | |
| | Jan 8      |   40% |  +10%  | Customer tier upgraded to Gold               | |
| | Jan 5      |   30% |    -   | Initial probability (new opportunity)        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Transition States

### Step Transition Animation
```
CURRENT STEP                TRANSITION               NEXT STEP
+----------------+         +----------------+        +----------------+
|                |         |                |        |                |
|   Step 1       |   ->    |  [Slide Left]  |   ->   |   Step 2       |
|   Content      |         |   + Fade       |        |   Content      |
|                |         |                |        |                |
+----------------+         +----------------+        +----------------+
  opacity: 1                 opacity: 0.5             opacity: 1
  transform: 0               transform: -20px         transform: 0

Duration: 300ms
Easing: ease-in-out
```

### Quote Status Change Animation
```
Before:                      During:                   After:
[SENT]-->[VIEWED]-->...     [SENT]-->[VIEWED]-->...  [SENT]-->[VIEWED]-->...
   *                              *=====>                      *
                             (pulse animation)           (green glow)

Screen Reader: "Quote status changed to Viewed"
```

---

## Error States

### Quote Send Failure
```
+================================================================================+
| SEND QUOTE                                                                [x]   |
+================================================================================+
|                                                                                 |
| +-- ERROR (role="alert") ---------------------------------------------------+ |
| |                                                                            | |
| | [!] Failed to Send Quote                                                  | |
| |                                                                            | |
| | The email could not be delivered to john@acme.com                         | |
| | Reason: Invalid email address                                              | |
| |                                                                            | |
| | +-- SUGGESTIONS ------------------------------------------+                | |
| | | - Verify the email address is correct                   |                | |
| | | - Check if there's an alternative contact               |                | |
| | | - Try sending to a different recipient                  |                | |
| | +----------------------------------------------------------+                | |
| |                                                                            | |
| | [Edit Recipient]  [Retry Send]  [Save as Draft]                           | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

### Conversion Stock Error
```
+================================================================================+
| CONVERT TO ORDER - ERROR                                                  [x]   |
+================================================================================+
|                                                                                 |
| +-- ERROR (role="alert") ---------------------------------------------------+ |
| |                                                                            | |
| | [!] Stock Allocation Failed                                               | |
| |                                                                            | |
| | Unable to allocate stock for 10kWh LFP Battery System X.                                | |
| | The available quantity changed since the quote was created.               | |
| |                                                                            | |
| | Current availability: 3 units (was 15)                                    | |
| | Required: 10 units                                                         | |
| |                                                                            | |
| | [Go Back to Stock Check]  [Contact Purchasing]  [Cancel Conversion]       | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Loading States

### Wizard Step Loading
```
+================================================================================+
| SALES WIZARD                                                                    |
+================================================================================+
| [1]--------[2]--------[3]--------[4]--------[5]                                |
+================================================================================+
|                                                                                 |
|                     +----------------------------------+                        |
|                     |                                  |                        |
|                     |        [Spinner Animation]       |                        |
|                     |                                  |                        |
|                     |       Saving your quote...       |                        |
|                     |                                  |                        |
|                     +----------------------------------+                        |
|                                                                                 |
| aria-busy="true"                                                               |
| aria-label="Saving quote, please wait"                                         |
+================================================================================+
```

### Conversion Processing
```
+================================================================================+
| CONVERTING TO ORDER                                                             |
+================================================================================+
|                                                                                 |
|                     +----------------------------------+                        |
|                     |                                  |                        |
|                     |      [Progress Animation]        |                        |
|                     |                                  |                        |
|                     |  [*] Creating order...           |                        |
|                     |  [ ] Allocating stock...         |                        |
|                     |  [ ] Marking opportunity won...  |                        |
|                     |  [ ] Sending confirmation...     |                        |
|                     |                                  |                        |
|                     |     Step 1 of 4                  |                        |
|                     |                                  |                        |
|                     +----------------------------------+                        |
|                                                                                 |
+================================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Sales wizard">
  <!-- Progress Stepper -->
  <nav aria-label="Quote creation progress">
    <ol role="list">
      <li role="listitem" aria-current="step">
        <span aria-label="Step 1: Select Customer, completed">
          Step 1: Select Customer
        </span>
      </li>
      <!-- ... more steps -->
    </ol>
    <div role="progressbar"
         aria-valuenow="40"
         aria-valuemin="0"
         aria-valuemax="100"
         aria-label="Quote creation 40 percent complete">
    </div>
  </nav>

  <!-- Step Content -->
  <section role="region" aria-label="Step 2: Build Quote">
    <!-- Form content -->
  </section>

  <!-- Navigation -->
  <nav aria-label="Wizard navigation">
    <button>Back</button>
    <button aria-label="Continue to review quote">Continue</button>
  </nav>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Close/Cancel button
2. Save Draft button
3. Progress stepper (informational)
4. Step content form fields (top to bottom)
5. Back button
6. Continue/Submit button

Shortcuts:
- Escape: Close wizard (with unsaved changes warning)
- Ctrl+S: Save draft
- Enter: Submit current step (when on last field)

Focus Management:
- On step change: Focus moves to first interactive element of new step
- On error: Focus moves to first error message
- On success: Focus moves to success message
```

### Screen Reader Announcements
```
On wizard open:
  "Sales wizard opened. Step 1 of 5: Select Customer"

On step navigation:
  "Step 2 of 5: Build Quote. Add products to your quote."

On validation error:
  "Error: Please select a customer before continuing"

On quote sent:
  "Success! Quote QT-2026-0042 has been sent to john@acme.com"

On probability change:
  "Win probability updated to 65 percent"
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Vertical stepper, single column, bottom sheet modals |
| Tablet | 640px - 1024px | Horizontal stepper compact, 2-column forms |
| Desktop | > 1024px | Full horizontal stepper, side-by-side panels |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Wizard load | < 500ms | Time to first step interactive |
| Step transition | < 300ms | Animation duration |
| Auto-save | < 1s | Time to save draft |
| Quote send | < 3s | Time from click to confirmation |
| Stock check | < 2s | Time to return availability |

---

## Related Wireframes

- [Pipeline Kanban Board](../domains/pipeline-kanban-board.wireframe.md)
- [Quote Builder](../domains/pipeline-quote-builder.wireframe.md)
- [Order Fulfillment](./order-fulfillment.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
