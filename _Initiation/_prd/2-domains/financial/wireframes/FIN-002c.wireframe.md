# Financial Domain Wireframe: Payment Plans UI (DOM-FIN-002c)

**Story ID:** DOM-FIN-002c
**Component Type:** MultiStepDialog with Timeline display
**Aesthetic:** Professional Financial - clean, precise, trustworthy
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Payment Timeline Component
- **Pattern**: RE-UI Timeline (custom)
- **Reference**: `_reference/.reui-reference/registry/default/ui/timeline.tsx`
- **Features**:
  - Vertical timeline with nodes for each installment
  - Visual status indicators (pending, due, paid, overdue)
  - Interactive nodes that expand to show payment details
  - Progress connector lines between installments

### Multi-Step Plan Creator Dialog
- **Pattern**: RE-UI Dialog + Stepper
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `stepper.tsx`
- **Features**:
  - Step-by-step plan configuration (type → schedule → review)
  - Plan type selection with radio cards showing preview calculations
  - Date picker integration for installment due dates
  - Real-time validation of total vs installment amounts

### Payment Record Sheet
- **Pattern**: RE-UI Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Bottom sheet for mobile quick payment recording
  - Payment method toggle group (card/transfer/cash)
  - Auto-populated amount with manual override option
  - Reference field for transaction IDs

### Schedule Preview Card
- **Pattern**: RE-UI Card with DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `table.tsx`
- **Features**:
  - Installment breakdown table with dates and amounts
  - Total validation indicator (match/mismatch alerts)
  - Edit/delete actions per installment row
  - Add installment button for custom plans

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `paymentPlans`, `installments` | NOT CREATED |
| **Server Functions Required** | `createPaymentPlan`, `recordInstallmentPayment`, `getPaymentSchedule` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-002a, DOM-FIN-002b | PENDING |

### Existing Schema Available
- `orders` with `invoiceStatus`, `xeroInvoiceId` in `renoz-v2/lib/schema/orders.ts`
- `customers` in `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## Design Principles for Payment Plans

- **Clarity:** Payment schedules must be immediately understandable
- **Flexibility:** Easy to create standard or custom plans
- **Visibility:** Overdue installments prominently highlighted
- **Action-Oriented:** One-tap payment recording for field staff
- **Mobile-First:** Payment recording often happens on job sites

---

## Mobile Wireframe (375px)

### Invoice Detail - Payment Schedule Section

```
+=========================================+
| < Back                     Invoice      |
+-----------------------------------------+
|                                         |
|  INV-2026-0089                          |
|  Acme Corporation                       |
|  ======================================= |
|                                         |
|  Total: $5,000.00                       |
|  Paid: $2,500.00                        |
|  Balance: $2,500.00                     |
|                                         |
+-----------------------------------------+
| [Details] [Payments] [Schedule] [Xero]  |
|                      ============       |
+-----------------------------------------+
|                                         |
|  PAYMENT PLAN                           |
|  50/50 Split Plan                       |
|                                         |
|  +-------------------------------------+|
|  | TIMELINE                            ||
|  +-------------------------------------+|
|  |                                     ||
|  |  [*]------------------------------- ||
|  |   |                                 ||
|  |   | Installment 1        PAID [ok] ||
|  |   | $2,500.00                       ||
|  |   | Due: Jan 5, 2026                ||
|  |   | Paid: Jan 4, 2026               ||
|  |   |                                 ||
|  |  [.]------------------------------- ||
|  |   |                                 ||
|  |   | Installment 2       DUE TODAY  ||
|  |   | $2,500.00             [!]       ||
|  |   | Due: Jan 10, 2026               ||
|  |   |                                 ||
|  |   | +-----------------------------+ ||
|  |   | |   [RECORD PAYMENT]          | ||
|  |   | +-----------------------------+ ||
|  |   |                                 ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |     [Edit Payment Plan]             ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Payment Schedule - Overdue State

```
+=========================================+
|                                         |
|  PAYMENT PLAN                           |
|  Monthly (3 Installments)               |
|                                         |
|  +-------------------------------------+|
|  | !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  ||
|  | OVERDUE PAYMENT                     ||
|  | 1 installment is 15 days overdue    ||
|  | !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | TIMELINE                            ||
|  +-------------------------------------+|
|  |                                     ||
|  |  [*]------------------------------- ||
|  |   |                                 ||
|  |   | Installment 1        PAID [ok] ||
|  |   | $1,666.67                       ||
|  |   | Paid: Dec 15, 2025              ||
|  |   |                                 ||
|  |  [!]------------------------------- ||
|  |   |                                 ||
|  |   | Installment 2       OVERDUE    ||
|  |   | $1,666.67        [!!!] 15 DAYS  ||
|  |   | Was Due: Dec 26, 2025           ||
|  |   |                                 ||
|  |   | +-----------------------------+ ||
|  |   | |   [RECORD PAYMENT]          | ||
|  |   | +-----------------------------+ ||
|  |   |                                 ||
|  |  [ ]------------------------------- ||
|  |   |                                 ||
|  |   | Installment 3        PENDING   ||
|  |   | $1,666.66                       ||
|  |   | Due: Jan 26, 2026               ||
|  |   |                                 ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Create Payment Plan - Step 1 (Plan Type)

```
+=========================================+
| ====================================    |
|                                         |
|  CREATE PAYMENT PLAN            [X]     |
|  Step 1 of 2                            |
|  -----------------------------------    |
|                                         |
|  Invoice: INV-2026-0089                 |
|  Amount: $5,000.00                      |
|                                         |
|  ===================================    |
|                                         |
|  SELECT PLAN TYPE                       |
|                                         |
|  +-------------------------------------+|
|  |  [*] 50/50 SPLIT                    ||
|  |                                     ||
|  |  $2,500.00 on signing               ||
|  |  $2,500.00 on completion            ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  | Jan 10    ->    Feb 10        |  ||
|  |  | $2,500         $2,500         |  ||
|  |  +-------------------------------+  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  ( ) THIRDS                         ||
|  |                                     ||
|  |  33% - 33% - 34%                    ||
|  |  3 equal installments               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  ( ) MONTHLY                        ||
|  |                                     ||
|  |  Equal monthly payments             ||
|  |  Choose number of months            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  ( ) CUSTOM                         ||
|  |                                     ||
|  |  Define your own schedule           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |          [ NEXT: SCHEDULE ]         ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Create Payment Plan - Step 2 (Schedule)

```
+=========================================+
| ====================================    |
|                                         |
|  CREATE PAYMENT PLAN            [X]     |
|  Step 2 of 2: Configure Schedule        |
|  -----------------------------------    |
|                                         |
|  Plan Type: 50/50 Split                 |
|  Total: $5,000.00                       |
|                                         |
|  ===================================    |
|                                         |
|  INSTALLMENT 1                          |
|  +-------------------------------------+|
|  | Amount                              ||
|  | +-----------------------------------+|
|  | | $                        2,500.00 ||
|  | +-----------------------------------+|
|  |                                     ||
|  | Due Date                            ||
|  | +-----------------------------------+|
|  | | [cal] Jan 10, 2026              v ||
|  | +-----------------------------------+|
|  +-------------------------------------+|
|                                         |
|  INSTALLMENT 2                          |
|  +-------------------------------------+|
|  | Amount                              ||
|  | +-----------------------------------+|
|  | | $                        2,500.00 ||
|  | +-----------------------------------+|
|  |                                     ||
|  | Due Date                            ||
|  | +-----------------------------------+|
|  | | [cal] Feb 10, 2026              v ||
|  | +-----------------------------------+|
|  +-------------------------------------+|
|                                         |
|  -----------------------------------    |
|  Total: $5,000.00 [ok]                  |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  |       [ CREATE PAYMENT PLAN ]       ||
|  +-------------------------------------+|
|                                         |
|  ( Back to Plan Type )                  |
|                                         |
+=========================================+
```

### Create Payment Plan - Monthly Options

```
+=========================================+
| ====================================    |
|                                         |
|  CREATE PAYMENT PLAN            [X]     |
|  Step 2 of 2: Monthly Schedule          |
|  -----------------------------------    |
|                                         |
|  Plan Type: Monthly                     |
|  Total: $5,000.00                       |
|                                         |
|  ===================================    |
|                                         |
|  NUMBER OF MONTHS                       |
|  +----------+ +----------+ +----------+ |
|  |    3     | |    6     | |    12    | |
|  |  months  | |  months  | |  months  | |
|  | $1,666/mo| |  $833/mo | |  $417/mo | |
|  +----------+ +----------+ +----------+ |
|       [ ]         [*]          [ ]      |
|                                         |
|  START DATE                             |
|  +-------------------------------------+|
|  | [cal] Jan 10, 2026                v ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------    |
|                                         |
|  PREVIEW SCHEDULE                       |
|  +-------------------------------------+|
|  | 1. Jan 10, 2026      $833.34       ||
|  | 2. Feb 10, 2026      $833.33       ||
|  | 3. Mar 10, 2026      $833.33       ||
|  | 4. Apr 10, 2026      $833.33       ||
|  | 5. May 10, 2026      $833.33       ||
|  | 6. Jun 10, 2026      $833.34       ||
|  +-------------------------------------+|
|  Total: $5,000.00 [ok]                  |
|                                         |
|  +-------------------------------------+|
|  |       [ CREATE PAYMENT PLAN ]       ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Create Payment Plan - Custom

```
+=========================================+
| ====================================    |
|                                         |
|  CREATE PAYMENT PLAN            [X]     |
|  Step 2 of 2: Custom Schedule           |
|  -----------------------------------    |
|                                         |
|  Plan Type: Custom                      |
|  Total: $5,000.00                       |
|  Allocated: $3,500.00                   |
|  Remaining: $1,500.00 [!]               |
|                                         |
|  ===================================    |
|                                         |
|  INSTALLMENTS                           |
|                                         |
|  +-------------------------------------+|
|  | 1. Jan 10     $2,000.00       [del] ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | 2. Jan 25     $1,500.00       [del] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |       [+ ADD INSTALLMENT]           ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | [!] Remaining: $1,500.00            ||
|  | Add another installment to cover    ||
|  | the full invoice amount.            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |    [ CREATE PAYMENT PLAN ]          ||
|  |    (disabled until balanced)        ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Record Installment Payment (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  RECORD PAYMENT                 [X]     |
|  Installment 2 of 2                     |
|  -----------------------------------    |
|                                         |
|  Invoice: INV-2026-0089                 |
|  Customer: Acme Corporation             |
|                                         |
|  Expected Amount: $2,500.00             |
|                                         |
|  ===================================    |
|                                         |
|  Payment Amount *                       |
|  +-------------------------------------+|
|  | $                          2,500.00 ||
|  +-------------------------------------+|
|  [ ] Pay exact amount ($2,500.00)       |
|                                         |
|  Payment Date *                         |
|  +-------------------------------------+|
|  | [cal] Jan 10, 2026 (Today)        v ||
|  +-------------------------------------+|
|                                         |
|  Payment Method                         |
|  +----------+ +----------+ +----------+ |
|  |  [card]  | |  [bank]  | |  [cash]  | |
|  |   Card   | | Transfer | |   Cash   | |
|  +----------+ +----------+ +----------+ |
|     [*]          [ ]          [ ]       |
|                                         |
|  Reference (optional)                   |
|  +-------------------------------------+|
|  | e.g., check number, transaction ID  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |         [ RECORD PAYMENT ]          ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State - No Payment Plan

```
+=========================================+
|                                         |
|  PAYMENT SCHEDULE                       |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         +-------------+             ||
|  |         |  [calendar] |             ||
|  |         |   schedule  |             ||
|  |         +-------------+             ||
|  |                                     ||
|  |     NO PAYMENT PLAN SET UP          ||
|  |                                     ||
|  |   This invoice doesn't have a       ||
|  |   payment plan. Create one to       ||
|  |   split payments into installments. ||
|  |                                     ||
|  |   +-----------------------------+   ||
|  |   |   [+] CREATE PAYMENT PLAN   |   ||
|  |   +-----------------------------+   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
|                                         |
|  PAYMENT PLAN                           |
|  ......................                 |
|                                         |
|  +-------------------------------------+|
|  | TIMELINE                            ||
|  +-------------------------------------+|
|  |                                     ||
|  |  [.]------------------------------- ||
|  |   |                                 ||
|  |   | ......................   [...] ||
|  |   | ..............                  ||
|  |   | ...............                 ||
|  |   |                                 ||
|  |  [.]------------------------------- ||
|  |   |                                 ||
|  |   | ......................   [...] ||
|  |   | ..............                  ||
|  |   | ...............                 ||
|  |   |                                 ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Invoice Detail with Payment Schedule

```
+=============================================================================+
| < Invoices | INV-2026-0089 - Acme Corporation                               |
+-----------------------------------------------------------------------------+
| [Details] [Line Items] [Payments] [Schedule] [Documents] [Activity]         |
|                                   ==========                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- INVOICE SUMMARY ------------------+  +-- PAYMENT PLAN ----------------+|
|  |                                     |  |                                ||
|  | Total:        $5,000.00             |  | Plan Type: 50/50 Split         ||
|  | Paid:         $2,500.00             |  | Created: Jan 5, 2026           ||
|  | Balance:      $2,500.00             |  |                                ||
|  |                                     |  | Progress:                      ||
|  | Status: [Partially Paid]            |  | [#########.........] 50%       ||
|  |                                     |  |                                ||
|  +-------------------------------------+  | [Edit Plan]                    ||
|                                           +--------------------------------+|
|                                                                             |
|  +-- PAYMENT TIMELINE ------------------------------------------------------+
|  |                                                                          |
|  |  [*] PAID                  [ ] DUE TODAY                                 |
|  |   |                         |                                            |
|  |   | Installment 1           | Installment 2                              |
|  |   | $2,500.00               | $2,500.00                                  |
|  |   | Due: Jan 5              | Due: Jan 10                                |
|  |   | Paid: Jan 4             |                                            |
|  |   | Via: Card ****4242      | [RECORD PAYMENT]                           |
|  |   |                         |                                            |
|  |   +-------------------------+                                            |
|  |                                                                          |
|  +---------------------------------------------------------------------------+
|                                                                             |
+=============================================================================+
```

### Create Payment Plan Wizard (Modal)

```
+===============================================================+
|                                                               |
|   +-------------------------------------------------------+   |
|   | Create Payment Plan                              [X]  |   |
|   | INV-2026-0089 - $5,000.00                             |   |
|   +-------------------------------------------------------+   |
|   | [1. Plan Type]  [2. Schedule]  [3. Review]            |   |
|   |  ===============                                      |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |  SELECT A PLAN TYPE                                   |   |
|   |                                                       |   |
|   |  +-------------------------+ +-------------------------+ |   |
|   |  | [*] 50/50 SPLIT         | | ( ) THIRDS              | |   |
|   |  |                         | |                         | |   |
|   |  | $2,500 + $2,500         | | $1,667 x 3              | |   |
|   |  |                         | |                         | |   |
|   |  | Jan 10 -> Feb 10        | | Jan -> Feb -> Mar       | |   |
|   |  +-------------------------+ +-------------------------+ |   |
|   |                                                       |   |
|   |  +-------------------------+ +-------------------------+ |   |
|   |  | ( ) MONTHLY             | | ( ) CUSTOM              | |   |
|   |  |                         | |                         | |   |
|   |  | Equal monthly payments  | | Define your own         | |   |
|   |  | Choose 3, 6, or 12 mo   | | installments            | |   |
|   |  +-------------------------+ +-------------------------+ |   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |                          ( Cancel )    [ Next Step ]  |   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|                                                               |
+===============================================================+
```

### Payment Plan - Horizontal Timeline

```
+=============================================================================+
|                                                                             |
|  PAYMENT TIMELINE                                                           |
|  ============================================================================
|                                                                             |
|  [*] ==================== [*] ==================== [ ] ==================== |
|   |                        |                        |                       |
|  PAID                     PAID                    PENDING                   |
|  $1,666.67               $1,666.67               $1,666.66                  |
|  Dec 15                   Jan 15                  Feb 15                    |
|                                                                             |
|  +-------------------+   +-------------------+   +-------------------+       |
|  | [check] Paid      |   | [check] Paid      |   | Due in 35 days    |       |
|  | Dec 14, 2025      |   | Jan 14, 2026      |   |                   |       |
|  | Card ****4242     |   | Bank Transfer     |   | [Record Payment]  |       |
|  +-------------------+   +-------------------+   +-------------------+       |
|                                                                             |
+=============================================================================+
```

---

## Desktop Wireframe (1280px+)

### Invoice Detail Page - Payment Schedule Tab

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Invoices                                                                    |
| Customers   |                                                                                        |
| Orders      |  INV-2026-0089 - Kitchen Renovation                                                    |
| Products    |  Acme Corporation                          [Download PDF] [Email] [Actions v]          |
| Jobs        |  --------------------------------------------------------------------------------------|
| Pipeline    |                                                                                        |
| Financial < |  [Details] [Line Items] [Payments] [Payment Schedule] [Documents] [Activity]           |
|  > Invoices |                                            ==================                          |
|  > Payments |  --------------------------------------------------------------------------------------|
|  > Credits  |                                                                                        |
|  > Aging    |  +-- PAYMENT PLAN SUMMARY ------------------------------------------+                   |
|  > Reports  |  |                                                                  |                   |
| Settings    |  |  Plan Type: Monthly (6 installments)          Status: On Track  |                   |
|             |  |  Created: Jan 5, 2026 by Joel                                    |                   |
|             |  |                                                                  |                   |
|             |  |  Progress: [####################..........] 4/6 Paid (67%)       |                   |
|             |  |                                                                  |                   |
|             |  |  Paid: $3,333.34          Remaining: $1,666.66                   |                   |
|             |  |                                                                  |                   |
|             |  |                              [Edit Plan] [Send Reminder]         |                   |
|             |  +------------------------------------------------------------------+                   |
|             |                                                                                        |
|             |  +-- PAYMENT SCHEDULE TABLE --------------------------------------------------------+   |
|             |  |                                                                                  |   |
|             |  | #  | Due Date       | Amount      | Status   | Paid Date  | Method    | Actions |   |
|             |  +----+---------------+-------------+----------+------------+-----------+---------+   |
|             |  | 1  | Dec 15, 2025  | $833.34     | PAID     | Dec 14     | Card      | [...]   |   |
|             |  | 2  | Jan 15, 2026  | $833.33     | PAID     | Jan 14     | Transfer  | [...]   |   |
|             |  | 3  | Feb 15, 2026  | $833.33     | PAID     | Feb 14     | Card      | [...]   |   |
|             |  | 4  | Mar 15, 2026  | $833.33     | PAID     | Mar 14     | Cash      | [...]   |   |
|             |  | 5  | Apr 15, 2026  | $833.33     | DUE      | -          | -         | [Pay]   |   |
|             |  | 6  | May 15, 2026  | $833.34     | PENDING  | -          | -         | [...]   |   |
|             |  +---------------------------------------------------------------------------------+   |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Overdue Installments Dashboard Widget

```
+======================================================================================================+
|                                                                                                      |
|  +-- OVERDUE INSTALLMENTS (Financial Dashboard Widget) -----------------------------------------+    |
|  |                                                                                              |    |
|  |  [!] OVERDUE PAYMENTS                                                    [View All]          |    |
|  |  ========================================================================================    |    |
|  |                                                                                              |    |
|  |  +-----------------------------------------------------------------------------------+       |    |
|  |  | Customer          | Invoice        | Installment | Amount    | Days Overdue      |       |    |
|  |  +-------------------+----------------+-------------+-----------+-------------------+       |    |
|  |  | Acme Corporation  | INV-2026-0089  | 2 of 3      | $1,666.67 | 15 days [!!]      |       |    |
|  |  | Beta Industries   | INV-2026-0078  | 3 of 4      | $500.00   | 7 days [!]        |       |    |
|  |  | Gamma LLC         | INV-2026-0065  | 1 of 2      | $2,500.00 | 3 days            |       |    |
|  |  +-----------------------------------------------------------------------------------+       |    |
|  |                                                                                              |    |
|  |  Total Overdue: $4,666.67 across 3 invoices               [Send Bulk Reminders]              |    |
|  |                                                                                              |    |
|  +----------------------------------------------------------------------------------------------+    |
|                                                                                                      |
+======================================================================================================+
```

### Create Payment Plan - Full Wizard

```
+======================================================================================================+
|                                                                                                      |
|   +-----------------------------------------------------------------------------------------------+  |
|   | Create Payment Plan for INV-2026-0089                                                    [X]  |  |
|   +-----------------------------------------------------------------------------------------------+  |
|   |                                                                                               |  |
|   |  +-- STEPS ------------------------------------------------------------------------------+    |  |
|   |  | [1. Select Plan Type] === [2. Configure Schedule] === [3. Review & Create]            |    |  |
|   |  |        (done)                   (current)                  (pending)                  |    |  |
|   |  +----------------------------------------------------------------------------------------+   |  |
|   |                                                                                               |  |
|   |  CONFIGURE YOUR MONTHLY SCHEDULE                                                              |  |
|   |  ===========================================================================================  |  |
|   |                                                                                               |  |
|   |  +-- PLAN SETTINGS -------------------------+  +-- SCHEDULE PREVIEW ----------------------+   |  |
|   |  |                                          |  |                                          |   |  |
|   |  | Number of Months                         |  | Installment Schedule                     |   |  |
|   |  | +------+ +------+ +------+ +------+      |  |                                          |   |  |
|   |  | |  3   | |  6   | |  9   | |  12  |      |  | +--------------------------------------+ |   |  |
|   |  | +------+ +------+ +------+ +------+      |  | | #  | Date        | Amount           | |   |  |
|   |  |   [ ]     [*]      [ ]      [ ]          |  | +----+-------------+------------------+ |   |  |
|   |  |                                          |  | | 1  | Jan 10, 2026| $833.34          | |   |  |
|   |  | Start Date                               |  | | 2  | Feb 10, 2026| $833.33          | |   |  |
|   |  | +------------------------------------+   |  | | 3  | Mar 10, 2026| $833.33          | |   |  |
|   |  | | [calendar] Jan 10, 2026          v |   |  | | 4  | Apr 10, 2026| $833.33          | |   |  |
|   |  | +------------------------------------+   |  | | 5  | May 10, 2026| $833.33          | |   |  |
|   |  |                                          |  | | 6  | Jun 10, 2026| $833.34          | |   |  |
|   |  | Payment Day of Month                     |  | +--------------------------------------+ |   |  |
|   |  | +------------------------------------+   |  |                                          |   |  |
|   |  | | 10th of each month               v |   |  | Total: $5,000.00 [check]                 |   |  |
|   |  | +------------------------------------+   |  |                                          |   |  |
|   |  |                                          |  +------------------------------------------+   |  |
|   |  | Monthly Payment: $833.33                 |                                                 |  |
|   |  |                                          |                                                 |  |
|   |  +------------------------------------------+                                                 |  |
|   |                                                                                               |  |
|   +-----------------------------------------------------------------------------------------------+  |
|   |                                                                                               |  |
|   |                               ( Back )    ( Cancel )    [ Next: Review ]                      |  |
|   |                                                                                               |  |
|   +-----------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
+-- PLAN CREATION ----------------------------+
|                                            |
|  [ [spin] Creating payment plan... ]       |
|                                            |
|  Calculating installments...               |
|                                            |
+--------------------------------------------+

+-- PAYMENT RECORDING ------------------------+
|                                            |
|  [ [spin] Recording payment... ]           |
|                                            |
|  Updating invoice balance...               |
|                                            |
+--------------------------------------------+

+-- SCHEDULE LOADING -------------------------+
|                                            |
|  Timeline skeleton with shimmer:           |
|                                            |
|  [.]--------[.]--------[.]--------[.]      |
|   |          |          |          |       |
|  [....]    [....]    [....]    [....]      |
|  [....]    [....]    [....]    [....]      |
|                                            |
+--------------------------------------------+
```

### Empty States

```
+-- NO PAYMENT PLAN --------------------------+
|                                            |
|         +-------------+                    |
|         |  [calendar] |                    |
|         |   + coins   |                    |
|         +-------------+                    |
|                                            |
|     NO PAYMENT PLAN SET UP                 |
|                                            |
|  Split this invoice into manageable        |
|  installments to help your customer        |
|  pay over time.                            |
|                                            |
|     [+ Create Payment Plan]                |
|                                            |
+--------------------------------------------+

+-- NO OVERDUE INSTALLMENTS ------------------+
|                                            |
|     [check] All payments on track!         |
|                                            |
|  No overdue installments at this time.     |
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- CREATE PLAN ERROR ------------------------+
|                                            |
|  [!] Failed to create payment plan         |
|                                            |
|  The invoice total doesn't match the       |
|  sum of installments. Please check         |
|  your amounts.                             |
|                                            |
|              [Adjust Amounts]              |
|                                            |
+--------------------------------------------+

+-- PAYMENT RECORDING ERROR ------------------+
|                                            |
|  [!] Payment recording failed              |
|                                            |
|  Unable to record this payment.            |
|  Please try again.                         |
|                                            |
|       [Retry]    [Cancel]                  |
|                                            |
+--------------------------------------------+

+-- PLAN EDIT CONFLICT -----------------------+
|                                            |
|  [!] Cannot edit payment plan              |
|                                            |
|  This plan has payments already recorded.  |
|  You can only add new installments or      |
|  void and recreate the plan.               |
|                                            |
|     [Add Installment]    [Cancel]          |
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- PLAN CREATED -----------------------------+
|                                            |
|  [check] Payment plan created!             |
|                                            |
|  6 monthly installments of $833.33         |
|  First payment due: Jan 10, 2026           |
|                                            |
|     [View Schedule]                        |
|                                            |
|  <- Toast (5 seconds)                      |
+--------------------------------------------+

+-- PAYMENT RECORDED -------------------------+
|                                            |
|  [check] Payment recorded                  |
|                                            |
|  Installment 4 of 6 paid                   |
|  Remaining balance: $1,666.66              |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- ALL INSTALLMENTS PAID --------------------+
|                                            |
|  [check] [confetti] Invoice fully paid!    |
|                                            |
|  All 6 installments have been paid.        |
|  Invoice status updated to PAID.           |
|                                            |
|     [View Invoice]                         |
|                                            |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Payment Plan Wizard**
   - Tab: Plan type options -> Next button
   - Arrow keys: Navigate between plan type cards
   - Enter: Select plan type and advance
   - Escape: Close wizard

2. **Schedule Configuration**
   - Tab: Month count -> Start date -> Day of month -> Preview table -> Next
   - Number inputs: Arrow up/down to adjust

3. **Record Payment Dialog**
   - Tab: Amount -> Exact checkbox -> Date -> Method options -> Reference -> Submit
   - Arrow keys: Navigate payment methods
   - Enter: Submit form

### ARIA Requirements

```html
<!-- Payment Plan Wizard -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="wizard-title"
>
  <h2 id="wizard-title">Create Payment Plan</h2>

  <!-- Progress Steps -->
  <nav aria-label="Wizard progress">
    <ol role="list">
      <li aria-current="step">Select Plan Type</li>
      <li>Configure Schedule</li>
      <li>Review & Create</li>
    </ol>
  </nav>

  <!-- Plan Type Selection -->
  <fieldset>
    <legend>Select a plan type</legend>
    <div role="radiogroup" aria-label="Plan types">
      <div role="radio" aria-checked="true" tabindex="0">
        50/50 Split
      </div>
      <div role="radio" aria-checked="false" tabindex="-1">
        Thirds
      </div>
    </div>
  </fieldset>
</div>

<!-- Payment Timeline -->
<section aria-label="Payment schedule timeline">
  <ol role="list">
    <li aria-label="Installment 1, $833.34, paid on December 14">
      <!-- Installment details -->
    </li>
    <li aria-label="Installment 2, $833.33, due January 15">
      <!-- Installment details -->
    </li>
  </ol>
</section>

<!-- Overdue Warning -->
<div role="alert" aria-live="polite">
  <span>1 installment is 15 days overdue</span>
</div>

<!-- Record Payment Form -->
<form aria-label="Record payment form">
  <label for="payment-amount">Payment Amount</label>
  <input
    id="payment-amount"
    type="text"
    inputmode="decimal"
    aria-describedby="expected-hint"
  />
  <span id="expected-hint">Expected: $2,500.00</span>
</form>
```

### Screen Reader Announcements

- Plan created: "Payment plan created with 6 monthly installments of $833.33. First payment due January 10, 2026."
- Payment recorded: "Payment of $833.33 recorded for installment 4 of 6. Remaining balance: $1,666.66"
- Overdue warning: "Warning: 1 installment is 15 days overdue"
- Plan complete: "Congratulations! All installments have been paid. Invoice is now fully paid."
- Step navigation: "Step 2 of 3: Configure schedule"

---

## Animation Choreography

### Timeline Progress

```
INSTALLMENT PAID:
- Duration: 400ms
- Node: pulse (scale 1 -> 1.2 -> 1) with checkmark draw
- Connector: fill from gray to green (left to right, 300ms)
- Next node: subtle pulse to indicate next due
```

### Wizard Step Transition

```
STEP FORWARD:
- Duration: 350ms
- Current step: translateX(0) -> translateX(-100%), opacity 1 -> 0
- Next step: translateX(100%) -> translateX(0), opacity 0 -> 1
- Progress indicator: fill animation (200ms)

STEP BACKWARD:
- Duration: 300ms
- Reverse of forward animation
```

### Plan Type Selection

```
CARD SELECT:
- Duration: 200ms
- Scale: 1 -> 1.02
- Border: 2px solid gray -> 2px solid green-500
- Checkmark: fade in (100ms)
- Deselected: scale 1.02 -> 1, border to gray
```

### Overdue Pulse

```
OVERDUE INDICATOR:
- Duration: 2s
- Animation: opacity 1 -> 0.7 -> 1
- Border: pulse red glow
- Loop: infinite (attention-grabbing but not distracting)
```

### Number Picker

```
MONTH COUNT SELECT:
- Duration: 150ms
- Previous: scale down, fade
- Current: scale up, highlight
- Preview table: cross-fade rows (200ms)
```

---

## Component Props Interfaces

```typescript
// Payment Plan Types
type PaymentPlanType = 'fifty_fifty' | 'thirds' | 'monthly' | 'custom';
type InstallmentStatus = 'pending' | 'due' | 'paid' | 'overdue';

interface PaymentSchedule {
  id: string;
  invoiceId: string;
  planType: PaymentPlanType;
  installments: Installment[];
  createdAt: Date;
  createdByUserId: string;
}

interface Installment {
  id: string;
  installmentNo: number;
  dueDate: Date;
  amount: number;
  status: InstallmentStatus;
  paidAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;
}

// Payment Schedule Display
interface PaymentScheduleDisplayProps {
  invoiceId: string;
  variant?: 'timeline' | 'table' | 'compact';
  showActions?: boolean;
  onRecordPayment?: (installment: Installment) => void;
  onEditPlan?: () => void;
}

// Payment Timeline
interface PaymentTimelineProps {
  installments: Installment[];
  orientation?: 'horizontal' | 'vertical';
  showRecordButton?: boolean;
  onRecordPayment?: (installment: Installment) => void;
}

// Create Payment Plan Wizard
interface CreatePaymentPlanWizardProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (schedule: PaymentSchedule) => void;
}

// Plan Type Selector
interface PlanTypeSelectorProps {
  invoiceAmount: number;
  selectedType: PaymentPlanType | null;
  onSelect: (type: PaymentPlanType) => void;
}

// Schedule Configuration
interface ScheduleConfigProps {
  planType: PaymentPlanType;
  invoiceAmount: number;
  onChange: (config: ScheduleConfig) => void;
}

interface ScheduleConfig {
  months?: number; // For monthly plans
  startDate: Date;
  dayOfMonth?: number;
  installments?: CustomInstallment[]; // For custom plans
}

interface CustomInstallment {
  date: Date;
  amount: number;
}

// Record Payment Dialog
interface RecordPaymentDialogProps {
  installment: Installment;
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Overdue Installments Widget
interface OverdueInstallmentsWidgetProps {
  limit?: number;
  onViewAll?: () => void;
  onSendReminders?: (installmentIds: string[]) => void;
}

// Schedule Preview
interface SchedulePreviewProps {
  installments: PreviewInstallment[];
  totalAmount: number;
  isValid: boolean;
}

interface PreviewInstallment {
  date: Date;
  amount: number;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Payment timeline | PaymentTimeline | - |
| Timeline node | TimelineNode | - |
| Schedule table | PaymentScheduleTable | Table |
| Create wizard | CreatePaymentPlanWizard | Dialog |
| Plan type cards | PlanTypeSelector | RadioGroup, Card |
| Month picker | MonthCountPicker | ToggleGroup |
| Schedule preview | SchedulePreview | Table |
| Record payment | RecordPaymentDialog | Dialog |
| Installment card | InstallmentCard | Card |
| Overdue alert | OverdueAlert | Alert |
| Empty state | EmptyState | - |
| Loading skeleton | PaymentScheduleSkeleton | Skeleton |

---

## Files to Create/Modify

### Create
- `src/components/domain/financial/payment-plans/payment-schedule-display.tsx`
- `src/components/domain/financial/payment-plans/payment-timeline.tsx`
- `src/components/domain/financial/payment-plans/timeline-node.tsx`
- `src/components/domain/financial/payment-plans/create-payment-plan-wizard.tsx`
- `src/components/domain/financial/payment-plans/plan-type-selector.tsx`
- `src/components/domain/financial/payment-plans/schedule-configuration.tsx`
- `src/components/domain/financial/payment-plans/schedule-preview.tsx`
- `src/components/domain/financial/payment-plans/record-payment-dialog.tsx`
- `src/components/domain/financial/payment-plans/overdue-installments-widget.tsx`
- `src/components/domain/financial/payment-plans/payment-schedule-skeleton.tsx`

### Modify
- `src/routes/_authed/financial/invoices/$invoiceId.tsx` (add Payment Schedule tab)
- `src/routes/_authed/financial/index.tsx` (add Overdue widget to dashboard)
- `src/components/domain/orders/order-detail.tsx` (add Create Payment Plan action)
