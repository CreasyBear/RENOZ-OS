# Job Completion Workflow Wireframe
## WF-JOB: Installation Job from Scheduling to Sign-Off

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/job-completion.prd.json
**Priority:** 7 (Service delivery excellence)

---

## Overview

The Job Completion workflow manages installation jobs from scheduling through execution, sign-off, and invoicing. This wireframe covers:
- Job creation from order
- Customer confirmation scheduling
- Pre-job preparation checklist
- Field execution with status tracking
- Digital sign-off with signature capture
- Automated invoice generation

**Workflow Stages:** Order -> Schedule Job -> Assign Tech -> Execute -> Sign-Off -> Invoice

**Aesthetic:** "Field operations" - Mobile-first, quick status updates, clear progress visibility

---

## Progress Indicator Design

### Job Lifecycle Timeline (Desktop)
```
+================================================================================+
|                                                                                 |
|  JOB STATUS TIMELINE                                                           |
|                                                                                 |
|  [CREATED]-->[SCHEDULED]-->[CONFIRMED]-->[EN ROUTE]-->[ON SITE]-->[COMPLETE]   |
|                                             *                                   |
|                                          (current)                              |
|                                                                                 |
|  Job #JOB-2026-0045 | Order: ORD-2026-0123 | Customer: Acme Corp               |
|  Technician: Mike Johnson | Scheduled: Jan 11, 2026 9:00 AM                    |
|                                                                                 |
+================================================================================+

Status Colors:
- Created: Gray (pending action)
- Scheduled: Blue (date set)
- Confirmed: Purple (customer confirmed)
- En Route: Orange (tech traveling)
- On Site: Teal (work in progress)
- Complete: Green (signed off)
```

### Mobile Status Card
```
+================================+
| JOB #JOB-2026-0045             |
+================================+
| [EN ROUTE ->]                  |
|                                |
| Acme Corp Installation         |
| 123 Business St, Sydney        |
|                                |
| +----------------------------+ |
| | [*] Created                | |
| | [*] Scheduled - Jan 11     | |
| | [*] Customer Confirmed     | |
| | [>] En Route <- CURRENT    | |
| | [ ] On Site                | |
| | [ ] Complete               | |
| +----------------------------+ |
|                                |
| ETA: 15 minutes                |
| [Update Status ->]             |
+================================+
```

---

## Job Creation from Order

### Order Detail Banner (Prompt)
```
+================================================================================+
| ORDER #ORD-2026-0123 - ACME CORPORATION                                        |
+================================================================================+
|                                                                                 |
| +=== INSTALLATION REQUIRED (role="alert") ===================================+ |
| |                                                                             | |
| | [!] This order requires installation                                       | |
| |                                                                             | |
| | Products requiring installation:                                            | |
| | - 10kWh LFP Battery System X (10 units) - Professional installation needed               | |
| | - Mounting Plates (2 units) - Requires wall mounting                       | |
| |                                                                             | |
| | Estimated job duration: 4-6 hours                                          | |
| |                                                                             | |
| | [Schedule Installation Job]                                                 | |
| |                                                                             | |
| +=============================================================================+ |
|                                                                                 |
+================================================================================+
```

### Job Already Created State
```
+================================================================================+
| +=== INSTALLATION JOB CREATED ==============================================+ |
| |                                                                             | |
| | [*] Job #JOB-2026-0045 created for this order                             | |
| |                                                                             | |
| | Status: SCHEDULED                                                          | |
| | Date: January 11, 2026 at 9:00 AM                                         | |
| | Technician: Mike Johnson                                                   | |
| | Customer Confirmation: Pending                                             | |
| |                                                                             | |
| | [View Job Details]  [Reschedule]                                          | |
| |                                                                             | |
| +=============================================================================+ |
+================================================================================+
```

---

## Customer Confirmation Flow

### Schedule Job Dialog
```
+================================================================================+
| SCHEDULE INSTALLATION JOB                                                 [x]   |
+================================================================================+
|                                                                                 |
| Order: #ORD-2026-0123 - Brisbane Solar Co                                       |
| Site Address: 123 Business St, Sydney NSW 2000                                 |
|                                                                                 |
| +-- SELECT DATE AND TIME ----------------------------------------------------+ |
| |                                                                             | |
| |  January 2026                                                              | |
| |  +---+---+---+---+---+---+---+                                             | |
| |  | S | M | T | W | T | F | S |                                             | |
| |  +---+---+---+---+---+---+---+                                             | |
| |  |   |   |   | 8 | 9 |10 |11 |                                             | |
| |  +---+---+---+---+---+---+---+                                             | |
| |  |12 |13 |14 |15 |16 |17 |18 |   <- Select Date                           | |
| |  +---+---+---+---+---+---+---+        [11] selected (highlighted)          | |
| |                                                                             | |
| |  Available Time Slots (Jan 11):                                            | |
| |  (*) 9:00 AM - 1:00 PM (4 hrs)                                            | |
| |  ( ) 1:00 PM - 5:00 PM (4 hrs)                                            | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ASSIGN TECHNICIAN -------------------------------------------------------+ |
| |                                                                             | |
| |  Available Technicians:                                                    | |
| |  +-----------------------------------------------------------------------+ | |
| |  | (*) Mike Johnson                                                      | | |
| |  |     Skills: Batterys, Doors, General Installation                      | | |
| |  |     Availability: Free | 2 jobs today | Rating: 4.8/5                 | | |
| |  +-----------------------------------------------------------------------+ | |
| |  | ( ) Sarah Williams                                                     | | |
| |  |     Skills: Batterys, Commercial                                        | | |
| |  |     Availability: Busy until 2 PM | 3 jobs today | Rating: 4.9/5      | | |
| |  +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CUSTOMER NOTIFICATION ---------------------------------------------------+ |
| |                                                                             | |
| | [x] Send confirmation request to customer                                  | |
| |     Email: john@acme.com                                                   | |
| |                                                                             | |
| | [x] Send reminder 24 hours before appointment                              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                              [Cancel]  [Schedule & Send Confirmation]          |
+================================================================================+
```

### Public Customer Confirmation Page
```
+================================================================================+
|                                                                                 |
|                         [COMPANY LOGO]                                          |
|                                                                                 |
|                   INSTALLATION APPOINTMENT                                      |
|                       CONFIRMATION                                              |
|                                                                                 |
+================================================================================+
|                                                                                 |
| Hello John,                                                                     |
|                                                                                 |
| We have scheduled an installation appointment for you:                          |
|                                                                                 |
| +-- APPOINTMENT DETAILS ----------------------------------------------------+  |
| |                                                                            |  |
| |  Date: Saturday, January 11, 2026                                         |  |
| |  Time: 9:00 AM - 1:00 PM                                                  |  |
| |                                                                            |  |
| |  Location:                                                                 |  |
| |  123 Business St                                                          |  |
| |  Sydney NSW 2000                                                          |  |
| |                                                                            |  |
| |  Technician: Mike Johnson                                                 |  |
| |                                                                            |  |
| |  Work to be performed:                                                    |  |
| |  - Install 10kWh LFP Battery System X (10 units)                                        |  |
| |  - Mount Mounting Plates (2 units)                                        |  |
| |  - System testing and handover                                            |  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| Please confirm this appointment suits you:                                      |
|                                                                                 |
|        +=====================+      +====================+                      |
|        |                     |      |                    |                      |
|        |  [Confirm Time]     |      | [Request Change]   |                      |
|        |                     |      |                    |                      |
|        +=====================+      +====================+                      |
|                                                                                 |
| If you need to request a different time, we'll contact you                     |
| within 24 hours to arrange an alternative.                                      |
|                                                                                 |
+================================================================================+
```

### Request Change Form
```
+================================================================================+
| REQUEST SCHEDULE CHANGE                                                         |
+================================================================================+
|                                                                                 |
| Current Appointment: January 11, 2026 at 9:00 AM                               |
|                                                                                 |
| +-- PREFERRED ALTERNATIVES ------------------------------------------------+   |
| |                                                                           |   |
| | Preferred Date: [______________] [Calendar Icon]                         |   |
| |                                                                           |   |
| | Preferred Time:                                                          |   |
| | (*) Morning (8 AM - 12 PM)                                               |   |
| | ( ) Afternoon (12 PM - 5 PM)                                             |   |
| | ( ) Any time                                                             |   |
| |                                                                           |   |
| | Reason for change (optional):                                            |   |
| | +---------------------------------------------------------------------+  |   |
| | | [                                                                   ]  |   |
| | | [                                                                   ]  |   |
| | +---------------------------------------------------------------------+  |   |
| |                                                                           |   |
| | Best contact number: [(555) 123-4567________]                           |   |
| +--------------------------------------------------------------------------+   |
|                                                                                 |
|                                              [Cancel]  [Submit Request]        |
+================================================================================+
```

### Confirmation Success
```
+================================================================================+
|                                                                                 |
|                    +=====================================+                      |
|                    |                                     |                      |
|                    |       [Checkmark Animation]         |                      |
|                    |                                     |                      |
|                    |    APPOINTMENT CONFIRMED!           |                      |
|                    |                                     |                      |
|                    |    Saturday, January 11, 2026       |                      |
|                    |    9:00 AM - 1:00 PM                |                      |
|                    |                                     |                      |
|                    +=====================================+                      |
|                                                                                 |
| What to expect:                                                                 |
| - You will receive a reminder email 24 hours before                            |
| - Our technician Mike will call when en route                                  |
| - Please ensure someone is available to provide access                         |
|                                                                                 |
| Questions? Contact us at support@company.com or (02) 9123 4567                 |
|                                                                                 |
| [Add to Calendar]  [View Order Details]                                        |
|                                                                                 |
+================================================================================+
```

---

## Pre-Job Preparation Checklist

### Desktop View
```
+================================================================================+
| PRE-JOB CHECKLIST - JOB #JOB-2026-0045                           [Print Pack]   |
+================================================================================+
|                                                                                 |
| Technician: Mike Johnson                     Scheduled: Jan 11, 9:00 AM        |
| Customer: Brisbane Solar Co                   Address: 123 Business St, Sydney  |
|                                                                                 |
| +-- PREPARATION STATUS ------------------------------------------------------+ |
| | [=================================>                          ] 60% Ready   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- MATERIALS (Inventory Allocation) ----------------------------------------+ |
| |                                                                             | |
| | [*] 10kWh LFP Battery System X - 10 units                    Bin: A-01      [Allocated]  | |
| |     Serial: SN-001 to SN-010                                               | |
| | [*] Mounting Plates - 2 units                  Bin: B-03      [Allocated]  | |
| | [*] Installation Kit - 1 set                   Bin: C-05      [Allocated]  | |
| | [ ] Cabling - 20m                              Bin: D-01      [Pending]    | |
| |     [Allocate Now]                                                         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- VEHICLE LOADING ---------------------------------------------------------+ |
| |                                                                             | |
| | [ ] All materials loaded into vehicle                                      | |
| | [ ] Installation tools verified                                            | |
| | [ ] Safety equipment present                                               | |
| | [ ] Vehicle inspection complete                                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DOCUMENTATION -----------------------------------------------------------+ |
| |                                                                             | |
| | [*] Work order generated                      [View PDF]                   | |
| | [*] Site access instructions noted                                         | |
| | [*] Customer contact verified                                              | |
| | [ ] Special requirements reviewed                                          | |
| |     Note: "Access via loading dock, call on arrival"                       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CUSTOMER INFO -----------------------------------------------------------+ |
| |                                                                             | |
| | Contact: John Smith                                                        | |
| | Phone: (555) 123-4567                         [Call]                       | |
| | Email: john@acme.com                          [Email]                      | |
| |                                                                             | |
| | Site Address: 123 Business St, Sydney NSW 2000                             | |
| | [Navigate (Google Maps)]                                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                            [Cancel Job]  [Mark Ready for Dispatch]             |
+================================================================================+
```

### Mobile Checklist View
```
+================================+
| Pre-Job Check                  |
| JOB-2026-0045                  |
+================================+
| [=========>            ] 60%   |
+================================+
|                                |
| MATERIALS                      |
| [*] 10kWh LFP Battery System X (10)          |
| [*] Mounting Plates (2)        |
| [*] Installation Kit (1)       |
| [ ] Cabling (20m) [ALLOCATE]   |
|                                |
| VEHICLE                        |
| [ ] Materials loaded           |
| [ ] Tools verified             |
| [ ] Safety gear                |
| [ ] Vehicle check              |
|                                |
| DOCUMENTS                      |
| [*] Work order [View]          |
| [*] Site access                |
| [*] Customer contact           |
| [ ] Special requirements       |
|                                |
| CUSTOMER                       |
| John Smith                     |
| [Call] [Navigate]              |
|                                |
+================================+
| [Ready for Dispatch]           |
+================================+
```

---

## Field Execution - Operations Dashboard

### Desktop Operations View
```
+================================================================================+
| FIELD OPERATIONS DASHBOARD                              [Refresh] [Map View]    |
+================================================================================+
|                                                                                 |
| TODAY: January 11, 2026 | 8 Jobs Scheduled | 3 In Progress | 2 Complete       |
|                                                                                 |
| +-- MAP VIEW (Placeholder) -------------------------------------------------+  |
| |                                                                            |  |
| |   +------------------------------------------------------------------+    |  |
| |   |                                                                  |    |  |
| |   |    [Map showing technician locations]                           |    |  |
| |   |                                                                  |    |  |
| |   |    * Mike - En Route to Acme Corp                               |    |  |
| |   |    * Sarah - On Site at Tech Industries                         |    |  |
| |   |    * Bob - Complete at GlobalCo                                 |    |  |
| |   |                                                                  |    |  |
| |   +------------------------------------------------------------------+    |  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- ACTIVE JOBS -------------------------------------------------------------+  |
| |                                                                             |  |
| | Tech       | Job#          | Customer      | Status    | Time    | ETA     |  |
| |------------+---------------+---------------+-----------+---------+---------|  |
| | Mike J.    | JOB-2026-0045 | Acme Corp     | EN ROUTE  | 9:00 AM | 9:15 AM |  |
| |            |               |               | [Update]  |         |         |  |
| | Sarah W.   | JOB-2026-0044 | Tech Ind.     | ON SITE   | 8:00 AM | -       |  |
| |            |               |               | 1.5h in   |         |         |  |
| | Bob K.     | JOB-2026-0043 | GlobalCo      | COMPLETE  | 7:00 AM | Done    |  |
| |            |               |               | [View]    |         |         |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- SCHEDULE TIMELINE -------------------------------------------------------+  |
| |                                                                             |  |
| |  7AM  8AM  9AM  10AM 11AM 12PM  1PM  2PM  3PM  4PM  5PM                     |  |
| |  |____|____|____|____|____|____|____|____|____|____|____|                   |  |
| |                                                                             |  |
| | Mike  [===GlobalCo===]        [======Acme Corp======]                      |  |
| | Sarah           [==========Tech Industries==========]                       |  |
| | Bob   [==DONE==]                     [====BigCo====]                        |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Mobile Technician Status Updates

### Status Update Card (Mobile)
```
+================================+
| JOB-2026-0045                  |
| Acme Corp Installation         |
+================================+
|                                |
| CURRENT STATUS: EN ROUTE       |
|                                |
| Update to:                     |
| +----------------------------+ |
| |                            | |
| | [ON SITE - Arrived]        | |
| |                            | |
| +----------------------------+ |
|                                |
| Or report issue:               |
| [Running Late] [Can't Access]  |
|                                |
+================================+
```

### On Site - Work In Progress
```
+================================+
| JOB-2026-0045          [...]   |
| Acme Corp Installation         |
+================================+
| STATUS: ON SITE                |
| Started: 9:18 AM               |
| Duration: 1h 42m               |
+================================+
|                                |
| TASKS:                         |
| [*] Site assessment            |
| [*] Unpack materials           |
| [>] Install 10kWh LFP Battery System X       |
|     Progress: 7/10 units       |
| [ ] Install Mounting Plates    |
| [ ] System testing             |
| [ ] Customer walkthrough       |
|                                |
| +----------------------------+ |
| | TIME TRACKING              | |
| | [======1:42======]         | |
| | [Pause] [Add Note]         | |
| +----------------------------+ |
|                                |
| PHOTOS: [Take Photo]           |
| +------+ +------+ +------+     |
| |[img1]| |[img2]| |[+]   |     |
| +------+ +------+ +------+     |
|                                |
| ISSUES: [Report Issue]         |
|                                |
+================================+
| [Mark Complete ->]             |
+================================+
```

### Issue Reporting (Mobile)
```
+================================+
| REPORT ISSUE                   |
+================================+
|                                |
| Issue Type:                    |
| [Select...                  v] |
|  | Site access problem         |
|  | Missing materials           |
|  | Customer not available      |
|  | Additional work needed      |
|  | Safety concern              |
|  | Equipment malfunction       |
|                                |
| Description:                   |
| +----------------------------+ |
| |                            | |
| |                            | |
| +----------------------------+ |
|                                |
| Attach Photo: [Take Photo]     |
|                                |
| Urgency:                       |
| ( ) Low - Continue work        |
| (*) Medium - Need guidance     |
| ( ) High - Work stopped        |
|                                |
+================================+
| [Cancel]  [Submit Issue]       |
+================================+
```

---

## Job Sign-Off Flow

### Completion Wizard (Mobile-Optimized)
```
+================================+
| JOB COMPLETION                 |
| JOB-2026-0045                  |
+================================+
| Step 1 of 4                    |
| [=====>                   ] 25%|
+================================+
|                                |
| WORK COMPLETED                 |
|                                |
| Please verify completed work:  |
|                                |
| [*] 10kWh LFP Battery System X installed     |
|     10 of 10 units             |
|     Serials: SN-001 to SN-010  |
|                                |
| [*] Mounting Plates installed  |
|     2 of 2 units               |
|                                |
| [*] System testing complete    |
|                                |
| [ ] Customer walkthrough       |
|     (Next step)                |
|                                |
| Additional Work Performed:     |
| [ ] Cable management - 1hr     |
|     [Add Description]          |
|                                |
+================================+
| [Back]    [Continue ->]        |
+================================+
```

### Step 2: Customer Walkthrough
```
+================================+
| JOB COMPLETION                 |
| JOB-2026-0045                  |
+================================+
| Step 2 of 4                    |
| [==========>              ] 50%|
+================================+
|                                |
| CUSTOMER WALKTHROUGH           |
|                                |
| Review these items with        |
| the customer:                  |
|                                |
| [ ] Demonstrate operation      |
|     - Power on/off             |
|     - Basic controls           |
|                                |
| [ ] Review maintenance         |
|     - Cleaning instructions    |
|     - Service schedule         |
|                                |
| [ ] Provide documentation      |
|     - User manual              |
|     - Warranty card            |
|                                |
| [ ] Answer customer questions  |
|                                |
| Notes from walkthrough:        |
| +----------------------------+ |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
| [Back]    [Continue ->]        |
+================================+
```

### Step 3: Photo Evidence
```
+================================+
| JOB COMPLETION                 |
| JOB-2026-0045                  |
+================================+
| Step 3 of 4                    |
| [===============>         ] 75%|
+================================+
|                                |
| COMPLETION PHOTOS              |
|                                |
| Before Photos:                 |
| +------+ +------+ +------+     |
| |[img1]| |[img2]| |[img3]|     |
| +------+ +------+ +------+     |
|                                |
| After Photos (Required):       |
| +------+ +------+ +------+     |
| |[img4]| |[img5]| | [+]  |     |
| +------+ +------+ +------+     |
| Minimum 3 photos required      |
|                                |
| [Take After Photo]             |
|                                |
+================================+
| [Back]    [Continue ->]        |
+================================+
```

### Step 4: Signature Capture
```
+================================+
| JOB COMPLETION                 |
| JOB-2026-0045                  |
+================================+
| Step 4 of 4                    |
| [====================>    ] 95%|
+================================+
|                                |
| CUSTOMER SIGN-OFF              |
|                                |
| I confirm that:                |
| - Work has been completed      |
|   to my satisfaction           |
| - I have received a walkthrough|
| - I understand the warranty    |
|                                |
| +----------------------------+ |
| |                            | |
| |   [Signature Canvas]       | |
| |                            | |
| |      Sign here             | |
| |                            | |
| +----------------------------+ |
| [Clear Signature]              |
|                                |
| Customer Name:                 |
| [John Smith______________]     |
|                                |
| Feedback (optional):           |
| +----------------------------+ |
| | Great work! Very           | |
| | professional installation. | |
| +----------------------------+ |
|                                |
+================================+
| [Back]  [Complete Job]         |
+================================+
```

### Completion Success
```
+================================+
|                                |
|    [Celebration Animation]     |
|                                |
|      JOB COMPLETE!             |
|                                |
|    JOB-2026-0045               |
|    Brisbane Solar Co            |
|                                |
|    Total Time: 3h 45m          |
|    Rating: [* * * * *]         |
|                                |
+================================+
|                                |
| [*] Sign-off captured          |
| [*] Photos uploaded            |
| [*] Certificate generated      |
| [*] Customer emailed           |
| [ ] Invoice pending review     |
|                                |
| [View Certificate]             |
| [Next Job]  [Back to Schedule] |
+================================+
```

---

## Invoice Review Queue

### Desktop View
```
+================================================================================+
| INVOICE REVIEW QUEUE                                        [Bulk Approve]      |
+================================================================================+
|                                                                                 |
| Pending Review: 5 | Approved Today: 12 | Value: $45,000                        |
|                                                                                 |
| +-- QUEUE TABLE -------------------------------------------------------------+ |
| |                                                                             | |
| | [ ] | Job#          | Customer      | Amount    | Created   | Status       | |
| |-----+---------------+---------------+-----------+-----------+--------------| |
| | [ ] | JOB-2026-0045 | Acme Corp     | $7,700.00 | Jan 11    | [Review]     | |
| |     |               |               |           | 2:30 PM   |              | |
| | [ ] | JOB-2026-0044 | Tech Ind.     | $3,200.00 | Jan 11    | [Review]     | |
| |     |               |               |           | 11:00 AM  |              | |
| | [*] | JOB-2026-0043 | GlobalCo      | $5,500.00 | Jan 11    | [Approved]   | |
| |     |               |               |           | 8:30 AM   | [Send]       | |
| | [ ] | JOB-2026-0042 | BigCo Ltd     | $2,100.00 | Jan 10    | [Review]     | |
| |     |               |               |           | 4:00 PM   |              | |
| | [ ] | JOB-2026-0041 | StartupX      | $950.00   | Jan 10    | [Review]     | |
| |     |               |               |           | 1:30 PM   |              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Selected: 0 | [Approve Selected] [Send Selected]                               |
+================================================================================+
```

### Invoice Review Detail
```
+================================================================================+
| REVIEW INVOICE - JOB #JOB-2026-0045                                      [x]   |
+================================================================================+
|                                                                                 |
| Customer: Brisbane Solar Co                                                     |
| Job Completed: January 11, 2026 at 2:15 PM                                     |
| Technician: Mike Johnson                                                       |
|                                                                                 |
| +-- ORDER ITEMS -------------------------------------------------------------+ |
| |                                                                             | |
| | Item                  | Qty  | Unit Price | Total                          | |
| |-----------------------+------+------------+--------------------------------| |
| | 10kWh LFP Battery System X          |   10 |    $3,200.00 | $5,000.00                      | |
| | Mounting Plates       |    2 |    $200.00 |   $400.00                      | |
| | Installation Kit      |    1 |    $300.00 |   $300.00                      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ADDITIONAL CHARGES (From Job) -------------------------------------------+ |
| |                                                                             | |
| | [+] Add Line Item                                                          | |
| |                                                                             | |
| | Item                  | Qty  | Rate       | Total                          | |
| |-----------------------+------+------------+--------------------------------| |
| | Labor - Installation  | 3.75 |  $80.00/hr |   $300.00                      | |
| | Cable Management      | 1.00 |  $80.00/hr |    $80.00                      | |
| | Travel                |    1 |    $50.00  |    $50.00                      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- INVOICE SUMMARY ---------------------------------------------------------+ |
| |                                                                             | |
| | Order Items:                              $5,700.00                         | |
| | Additional Labor:                           $380.00                         | |
| | Travel:                                      $50.00                         | |
| | --------------------------------------------------------                   | |
| | Subtotal:                                 $6,130.00                         | |
| | GST (10%):                                  $613.00                         | |
| | --------------------------------------------------------                   | |
| | INVOICE TOTAL:                            $6,743.00                         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                    [Edit Invoice]  [Reject]  [Approve & Send to Customer]      |
+================================================================================+
```

---

## Error States

### Customer Confirmation Expired
```
+================================================================================+
|                                                                                 |
|                    +=====================================+                      |
|                    |                                     |                      |
|                    |       [Expired Icon]                |                      |
|                    |                                     |                      |
|                    |    CONFIRMATION LINK EXPIRED        |                      |
|                    |                                     |                      |
|                    |    This confirmation link has       |                      |
|                    |    expired or is no longer valid.   |                      |
|                    |                                     |                      |
|                    +=====================================+                      |
|                                                                                 |
| Please contact us to reschedule your appointment:                              |
|                                                                                 |
| Phone: (02) 9123 4567                                                          |
| Email: support@company.com                                                     |
|                                                                                 |
| Reference: JOB-2026-0045                                                       |
|                                                                                 |
+================================================================================+
```

### Job Creation Failure
```
+================================================================+
| [!] Failed to Create Job                                  [x]   |
+================================================================+
|                                                                 |
| Could not create installation job for Order #ORD-2026-0123.    |
|                                                                 |
| Reason: No available technicians with required skills          |
|                                                                 |
| Required Skills:                                                |
| - Battery Installation (Professional)                           |
| - Commercial Installation                                       |
|                                                                 |
| [Contact Scheduling Team]  [Retry]  [Schedule Later]           |
+================================================================+
```

---

## Loading States

### Schedule Loading
```
+================================================================================+
| SCHEDULE INSTALLATION JOB                                                       |
+================================================================================+
|                                                                                 |
|                     +----------------------------------+                        |
|                     |                                  |                        |
|                     |        [Spinner Animation]       |                        |
|                     |                                  |                        |
|                     |   Loading available slots...     |                        |
|                     |                                  |                        |
|                     +----------------------------------+                        |
|                                                                                 |
+================================================================================+
```

### Sign-Off Processing
```
+================================+
|                                |
|    [Progress Animation]        |
|                                |
|    Processing sign-off...      |
|                                |
|    [*] Saving signature        |
|    [ ] Uploading photos        |
|    [ ] Generating certificate  |
|    [ ] Sending notification    |
|                                |
|    Please wait...              |
+================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Job completion workflow">
  <!-- Timeline Progress -->
  <nav aria-label="Job status timeline">
    <ol role="list">
      <li role="listitem" aria-current="step">
        <span aria-label="Step: En Route, current step">En Route</span>
      </li>
    </ol>
  </nav>

  <!-- Status Update -->
  <section role="region" aria-label="Update job status">
    <button aria-label="Update status to On Site">
      On Site - Arrived
    </button>
  </section>

  <!-- Signature Canvas -->
  <section role="region" aria-label="Customer signature">
    <canvas role="img" aria-label="Signature drawing area">
    </canvas>
    <button aria-label="Clear signature and start over">
      Clear Signature
    </button>
  </section>
</main>
```

### Keyboard Navigation (Mobile-First)
```
Tab Order:
1. Status update buttons
2. Task checkboxes
3. Action buttons (Photo, Note, Issue)
4. Navigation (Back, Continue)

Signature Canvas:
- Focus indicator around canvas
- Keyboard alternative: Type name for digital signature
- Voice input option where supported

Screen Reader:
- Status changes announced immediately
- Task completion announced
- Timer updates announced periodically
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, large touch targets, bottom navigation |
| Tablet | 640px - 1024px | Two-column where appropriate, side panels |
| Desktop | > 1024px | Full dashboard, map view, timeline grid |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Status update | < 500ms | From tap to confirmation |
| Photo upload | < 5s | Per image (compressed) |
| Signature save | < 2s | Canvas to server |
| Offline queue | Immediate | Local storage, sync when online |
| Certificate generation | < 10s | PDF creation |

---

## Related Wireframes

- [Order Fulfillment](./order-fulfillment.wireframe.md)
- [Invoicing](./invoicing.wireframe.md)
- [Jobs Scheduling Calendar](../domains/jobs-scheduling-calendar.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
