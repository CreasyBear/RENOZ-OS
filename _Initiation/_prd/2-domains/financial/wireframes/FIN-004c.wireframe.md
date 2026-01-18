# Financial Domain Wireframe: Customer Statements UI (DOM-FIN-004c)

**Story ID:** DOM-FIN-004c
**Component Type:** ActionPanel with PDFPreview
**Aesthetic:** Professional Financial - clean, document-focused
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Statement Period Selector
- **Pattern**: RE-UI RadioGroup with Date Range Picker
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`, `calendar.tsx`
- **Features**:
  - Quick select options (This Month, Last Month, Last Quarter, YTD)
  - Custom date range picker with start/end date inputs
  - Period preview showing transaction count
  - Auto-calculation of opening/closing balances

### Statement PDF Preview
- **Pattern**: RE-UI Card with Document Viewer
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Scrollable preview of generated statement
  - Company logo and customer address rendering
  - Transaction ledger table with running balance
  - Print-optimized layout preview

### Email Statement Dialog
- **Pattern**: RE-UI Dialog with Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `form.tsx`, `input.tsx`
- **Features**:
  - Email address input with validation
  - CC recipients toggle and multi-input
  - Subject line with merge field preview
  - Optional message textarea
  - Send copy to self checkbox

### Statement History List
- **Pattern**: RE-UI Card List with Actions
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `button.tsx`
- **Features**:
  - Chronological list of past statements
  - Sent/downloaded/not-sent status badges
  - Quick actions (view PDF, resend email)
  - Delivery status indicators (sent to, opened at)

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `statements`, `statementHistory` | NOT CREATED |
| **Server Functions Required** | `generateStatement`, `emailStatement`, `getStatementHistory` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-004a, DOM-FIN-004b | PENDING |

### Existing Schema Available
- `orders` with `invoiceStatus`, `xeroInvoiceId` in `renoz-v2/lib/schema/orders.ts`
- `customers` in `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## Design Principles for Statements

- **Preview First:** Always show what will be sent before sending
- **Date Flexibility:** Easy selection of statement periods
- **Batch Operations:** Support for generating multiple statements at once
- **Delivery Options:** Multiple ways to deliver (email, download, print)
- **History Tracking:** Full audit trail of generated statements

---

## Mobile Wireframe (375px)

### Customer Detail - Generate Statement Action

```
+=========================================+
| < Customers                             |
| Acme Corporation                        |
+-----------------------------------------+
| [Overview] [Orders] [Invoices] [Fin.]   |
|                              ========   |
+-----------------------------------------+
|                                         |
|  FINANCIAL SUMMARY                      |
|  +-------------------------------------+|
|  | Opening Balance:      $12,500.00    ||
|  | + Invoices:           $25,000.00    ||
|  | - Payments:          -$22,500.00    ||
|  | - Credits:            -$1,500.00    ||
|  | = Closing Balance:    $13,500.00    ||
|  +-------------------------------------+|
|                                         |
|  =======================================|
|                                         |
|  STATEMENTS                             |
|                                         |
|  +-------------------------------------+|
|  |   [+] GENERATE STATEMENT            ||
|  +-------------------------------------+|
|                                         |
|  +-- RECENT STATEMENTS -----------------+
|  |                                     ||
|  |  Dec 2025 Statement           [>]   ||
|  |  Sent Dec 15, 2025                  ||
|  |  Balance: $12,500.00                ||
|  |                                     ||
|  |  Nov 2025 Statement           [>]   ||
|  |  Sent Nov 15, 2025                  ||
|  |  Balance: $8,750.00                 ||
|  |                                     ||
|  |  Oct 2025 Statement           [>]   ||
|  |  Sent Oct 15, 2025                  ||
|  |  Balance: $5,200.00                 ||
|  |                                     ||
|  |  [View All Statement History]       ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Generate Statement - Date Selection (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  GENERATE STATEMENT             [X]     |
|  Acme Corporation                       |
|  -----------------------------------    |
|                                         |
|  SELECT STATEMENT PERIOD                |
|                                         |
|  Quick Select:                          |
|  +----------+ +----------+ +----------+ |
|  | This     | | Last     | | Last     | |
|  | Month    | | Month    | | Quarter  | |
|  +----------+ +----------+ +----------+ |
|     [ ]         [*]          [ ]        |
|                                         |
|  +----------+ +----------+              |
|  | Last     | | Year to  |              |
|  | Year     | | Date     |              |
|  +----------+ +----------+              |
|     [ ]         [ ]                     |
|                                         |
|  -----------------------------------    |
|                                         |
|  Custom Range:                          |
|                                         |
|  Start Date                             |
|  +-------------------------------------+|
|  | [cal] Dec 1, 2025                 v ||
|  +-------------------------------------+|
|                                         |
|  End Date                               |
|  +-------------------------------------+|
|  | [cal] Dec 31, 2025                v ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------    |
|                                         |
|  STATEMENT SUMMARY                      |
|  +-------------------------------------+|
|  | Period: Dec 1 - Dec 31, 2025        ||
|  | Opening: $8,750.00                  ||
|  | Transactions: 12                    ||
|  | Closing: $12,500.00                 ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |      [ PREVIEW STATEMENT ]          ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Statement Preview (Full Screen)

```
+=========================================+
| < Back               Preview     [...]  |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  +-----------------------------+    ||
|  |  |     [Company Logo]          |    ||
|  |  |     RENOZ SOLUTIONS         |    ||
|  |  +-----------------------------+    ||
|  |                                     ||
|  |  STATEMENT                          ||
|  |  Period: Dec 1-31, 2025             ||
|  |                                     ||
|  |  To:                                ||
|  |  Acme Corporation                   ||
|  |  123 Business Ave                   ||
|  |  Sydney NSW 2000                    ||
|  |                                     ||
|  |  -------------------------          ||
|  |                                     ||
|  |  Opening Balance: $8,750.00         ||
|  |                                     ||
|  |  TRANSACTIONS                       ||
|  |  -------------------------          ||
|  |  Dec 5  INV-0089  $5,000.00        ||
|  |  Dec 8  PMT       -$3,500.00        ||
|  |  Dec 12 INV-0095  $2,500.00        ||
|  |  Dec 15 CR-0045   -$250.00         ||
|  |                                     ||
|  |  -------------------------          ||
|  |  Closing Balance: $12,500.00        ||
|  |                                     ||
|  |  Amount Due: $12,500.00             ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |        [ EMAIL STATEMENT ]          ||
|  +-------------------------------------+|
|                                         |
|  ( Download PDF )   ( Print )           |
|                                         |
+=========================================+
```

### Email Statement Dialog

```
+=========================================+
| ====================================    |
|                                         |
|  EMAIL STATEMENT                [X]     |
|  -----------------------------------    |
|                                         |
|  To: *                                  |
|  +-------------------------------------+|
|  | john@acme.com                       ||
|  +-------------------------------------+|
|  [ ] Include additional recipients      |
|                                         |
|  CC: (optional)                         |
|  +-------------------------------------+|
|  | accounts@acme.com                   ||
|  +-------------------------------------+|
|                                         |
|  Subject:                               |
|  +-------------------------------------+|
|  | Statement - December 2025           ||
|  +-------------------------------------+|
|                                         |
|  Message: (optional)                    |
|  +-------------------------------------+|
|  | Please find attached your account   ||
|  | statement for December 2025.        ||
|  |                                     ||
|  | If you have any questions, please   ||
|  | contact us.                         ||
|  +-------------------------------------+|
|                                         |
|  [ ] Send copy to me                    |
|                                         |
|  +-------------------------------------+|
|  |         [ SEND STATEMENT ]          ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Statement History (Full Screen)

```
+=========================================+
| < Back                                  |
| Statement History                       |
| Acme Corporation                        |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | December 2025                       ||
|  | -----------------------------------  ||
|  | Period: Dec 1-31, 2025              ||
|  | Closing Balance: $12,500.00         ||
|  | Sent: Dec 15, 2025                  ||
|  | To: john@acme.com                   ||
|  |                                     ||
|  | [View PDF]  [Resend]                ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | November 2025                       ||
|  | -----------------------------------  ||
|  | Period: Nov 1-30, 2025              ||
|  | Closing Balance: $8,750.00          ||
|  | Sent: Nov 15, 2025                  ||
|  | To: john@acme.com                   ||
|  |                                     ||
|  | [View PDF]  [Resend]                ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | October 2025                        ||
|  | -----------------------------------  ||
|  | Period: Oct 1-31, 2025              ||
|  | Closing Balance: $5,200.00          ||
|  | Downloaded only (not sent)          ||
|  |                                     ||
|  | [View PDF]                          ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Loading State - Generating PDF

```
+=========================================+
| < Back               Generating...      |
+-----------------------------------------+
|                                         |
|                                         |
|                                         |
|            +-------------+              |
|            |             |              |
|            |  [spinner]  |              |
|            |             |              |
|            +-------------+              |
|                                         |
|      GENERATING STATEMENT               |
|                                         |
|   Calculating balances...               |
|   [=====>                    ] 25%      |
|                                         |
|                                         |
|                                         |
+-----------------------------------------+
```

### Empty State - No Statements

```
+=========================================+
|                                         |
|  STATEMENTS                             |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         +-------------+             ||
|  |         |   [doc]     |             ||
|  |         |  statement  |             ||
|  |         +-------------+             ||
|  |                                     ||
|  |     NO STATEMENTS YET               ||
|  |                                     ||
|  |   No statements have been           ||
|  |   generated for this customer.      ||
|  |                                     ||
|  |   +-----------------------------+   ||
|  |   | [+] GENERATE FIRST STATEMENT|   ||
|  |   +-----------------------------+   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Customer Financial Tab with Statement Panel

```
+=============================================================================+
| < Customers | Acme Corporation                           [Edit] [Actions v] |
+-----------------------------------------------------------------------------+
| [Overview] [Orders] [Invoices] [Payments] [Financial] [Activity]            |
|                                           ==========                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- ACCOUNT SUMMARY ------------------+  +-- STATEMENTS -----------------+ |
|  |                                     |  |                               | |
|  | Opening Balance:    $8,750.00       |  | [+ Generate Statement]        | |
|  | + Invoices (MTD):  $10,000.00       |  |                               | |
|  | - Payments (MTD):  -$5,000.00       |  | Recent:                       | |
|  | - Credits (MTD):   -$1,250.00       |  |                               | |
|  | ----------------------------------- |  | Dec 2025          $12,500  [>]| |
|  | Current Balance:   $12,500.00       |  | Nov 2025           $8,750  [>]| |
|  |                                     |  | Oct 2025           $5,200  [>]| |
|  | Overdue:            $4,500.00 [!]   |  |                               | |
|  |                                     |  | [View All History]            | |
|  +-------------------------------------+  +-------------------------------+ |
|                                                                             |
|  +-- TRANSACTION HISTORY ---------------------------------------------------+
|  |                                                                          |
|  | Date        Type      Reference        Amount        Balance             |
|  +-----------+----------+----------------+-------------+--------------------+
|  | Jan 10    | Invoice  | INV-2026-0095  | +$2,500.00  | $12,500.00        |
|  | Jan 8     | Payment  | PMT-2026-0034  | -$3,000.00  | $10,000.00        |
|  | Jan 5     | Invoice  | INV-2026-0089  | +$5,000.00  | $13,000.00        |
|  | Jan 3     | Credit   | CN-2026-0045   | -$250.00    | $8,000.00         |
|  | Dec 28    | Payment  | PMT-2025-0445  | -$2,500.00  | $8,250.00         |
|  | ...       | ...      | ...            | ...         | ...               |
|  +--------------------------------------------------------------------------+
|                                                                             |
+=============================================================================+
```

### Generate Statement Modal (Split View)

```
+===============================================================+
|                                                               |
|   +-------------------------------------------------------+   |
|   | Generate Statement - Acme Corporation            [X]  |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |  +-- SETTINGS -----------------+ +-- PREVIEW --------+|   |
|   |  |                             | |                   ||   |
|   |  | Period:                     | | +---------------+ ||   |
|   |  | +-------------------------+ | | |               | ||   |
|   |  | | [*] Last Month          | | | | [PDF Preview] | ||   |
|   |  | | ( ) This Quarter        | | | |               | ||   |
|   |  | | ( ) Custom Range        | | | | STATEMENT     | ||   |
|   |  | +-------------------------+ | | | Dec 2025      | ||   |
|   |  |                             | | |               | ||   |
|   |  | Start: Dec 1, 2025          | | | Opening:      | ||   |
|   |  | End: Dec 31, 2025           | | | $8,750.00     | ||   |
|   |  |                             | | |               | ||   |
|   |  | -------------------------   | | | Transactions: | ||   |
|   |  |                             | | | 12 items      | ||   |
|   |  | Summary:                    | | |               | ||   |
|   |  | Opening: $8,750.00          | | | Closing:      | ||   |
|   |  | Transactions: 12            | | | $12,500.00    | ||   |
|   |  | Closing: $12,500.00         | | |               | ||   |
|   |  |                             | | +---------------+ ||   |
|   |  +-----------------------------+ +-------------------+|   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  |   ( Cancel )   [Download]   [ Email Statement ]   ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|                                                               |
+===============================================================+
```

---

## Desktop Wireframe (1280px+)

### Customer Detail - Financial Tab

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Customers                                                                   |
| Customers   |                                                                                        |
| Orders      |  Acme Corporation                                                                      |
| Products    |  john@acme.com | +61 2 1234 5678                     [Edit] [New Order] [Actions v]   |
| Jobs        |  --------------------------------------------------------------------------------------|
| Pipeline    |                                                                                        |
| Financial   |  [Overview] [Orders] [Invoices] [Payments] [Financial] [Activity] [Documents]          |
| Settings    |                                              ==========                                |
|             |  --------------------------------------------------------------------------------------|
|             |                                                                                        |
|             |  +-- ACCOUNT SUMMARY ---------------------+  +-- STATEMENTS & ACTIONS --------------+  |
|             |  |                                        |  |                                      |  |
|             |  |  BALANCE OVERVIEW                      |  |  [+ Generate Statement]              |  |
|             |  |  =====================================  |  |  [Send Payment Reminder]             |  |
|             |  |                                        |  |                                      |  |
|             |  |  Opening Balance (Jan 1):  $8,750.00   |  |  ---------------------------------   |  |
|             |  |  + Invoices (YTD):       $15,000.00   |  |                                      |  |
|             |  |  - Payments (YTD):       -$8,500.00   |  |  STATEMENT HISTORY                   |  |
|             |  |  - Credits (YTD):        -$1,750.00   |  |                                      |  |
|             |  |  ------------------------------------  |  |  Dec 2025 | $12,500 | Sent    [>]   |  |
|             |  |  Current Balance:        $13,500.00   |  |  Nov 2025 | $8,750  | Sent    [>]   |  |
|             |  |                                        |  |  Oct 2025 | $5,200  | Sent    [>]   |  |
|             |  |  Overdue Amount:          $4,500.00   |  |  Sep 2025 | $3,100  | Sent    [>]   |  |
|             |  |  Days Outstanding (avg):         34   |  |                                      |  |
|             |  |                                        |  |  [View Full History]                 |  |
|             |  +----------------------------------------+  +--------------------------------------+  |
|             |                                                                                        |
|             |  +-- TRANSACTION LEDGER ---------------------------------------------------------------+|
|             |  |                                                                                     ||
|             |  |  Filter: [All Types v]  [Date Range: Last 90 Days v]                [Export]        ||
|             |  |  --------------------------------------------------------------------------------   ||
|             |  |                                                                                     ||
|             |  |  Date       | Type     | Reference       | Debit      | Credit     | Balance       ||
|             |  |  -----------+----------+-----------------+------------+------------+---------------||
|             |  |  Jan 10     | Invoice  | INV-2026-0095   | $2,500.00  |            | $13,500.00    ||
|             |  |  Jan 8      | Payment  | PMT-2026-0034   |            | $3,000.00  | $11,000.00    ||
|             |  |  Jan 5      | Invoice  | INV-2026-0089   | $5,000.00  |            | $14,000.00    ||
|             |  |  Jan 3      | Credit   | CN-2026-0045    |            | $250.00    | $9,000.00     ||
|             |  |  Dec 28     | Payment  | PMT-2025-0445   |            | $2,500.00  | $9,250.00     ||
|             |  |  Dec 22     | Invoice  | INV-2025-0478   | $3,000.00  |            | $11,750.00    ||
|             |  |  Dec 15     | Credit   | CN-2025-0412    |            | $500.00    | $8,750.00     ||
|             |  |  ...        | ...      | ...             | ...        | ...        | ...           ||
|             |  |  -----------+----------+-----------------+------------+------------+---------------||
|             |  |                                                                                     ||
|             |  |  Totals (displayed period):              | $45,500.00 | $32,000.00 |               ||
|             |  |                                                                                     ||
|             |  +-------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Bulk Statement Generation (Admin)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Bulk Statement Generation                                                             |
| Customers   |  Generate statements for multiple customers at once                                    |
| Orders      |  ----------------------------------------------------------------------------------------
| Products    |                                                                                        |
| Jobs        |  STEP 1: SELECT PERIOD                                                                 |
| Pipeline    |  +----------------------------------------------------------------------------------------+
| Financial < |  |                                                                                        |
|  > Invoices |  |  +----------+  +----------+  +----------+  +----------+  +----------+                 |
|  > Payments |  |  | Dec 2025 |  | Nov 2025 |  | Oct 2025 |  | Q4 2025  |  | Custom   |                 |
|  > Credits  |  |  |   [*]    |  |   [ ]    |  |   [ ]    |  |   [ ]    |  |   [ ]    |                 |
|  > Aging    |  |  +----------+  +----------+  +----------+  +----------+  +----------+                 |
|  > Bulk  <  |  |                                                                                        |
| Settings    |  +----------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  STEP 2: SELECT CUSTOMERS                                                              |
|             |  +----------------------------------------------------------------------------------------+
|             |  |                                                                                        |
|             |  |  [x] Select All with Balance     45 customers selected                                |
|             |  |  [ ] Select All Overdue          12 customers                                          |
|             |  |                                                                                        |
|             |  |  +-----------------------------------------------------------------------------------+|
|             |  |  | [ ] | Customer           | Balance      | Last Statement | Action                 ||
|             |  |  +-----+--------------------+--------------+----------------+------------------------+|
|             |  |  | [x] | Acme Corporation   | $13,500.00   | Dec 15, 2025   | Will generate          ||
|             |  |  | [x] | Beta Industries    |  $8,250.00   | Dec 15, 2025   | Will generate          ||
|             |  |  | [x] | Gamma LLC          |  $5,600.00   | Nov 15, 2025   | Will generate          ||
|             |  |  | [ ] | Delta Inc          |      $0.00   | Dec 15, 2025   | Zero balance, skip     ||
|             |  |  | [x] | Epsilon Co         |  $2,100.00   | Dec 15, 2025   | Will generate          ||
|             |  |  +-----------------------------------------------------------------------------------+|
|             |  |                                                                                        |
|             |  +----------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  STEP 3: DELIVERY OPTIONS                                                              |
|             |  +----------------------------------------------------------------------------------------+
|             |  |                                                                                        |
|             |  |  [x] Email to primary contact                                                          |
|             |  |  [ ] CC to accounts contact                                                            |
|             |  |  [ ] Download all as ZIP                                                               |
|             |  |                                                                                        |
|             |  +----------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  +----------------------------------------------------------------------------------------+
|             |  |                                                                                        |
|             |  |  Summary: 45 statements for December 2025                                              |
|             |  |  Total AR: $125,450.00                                                                 |
|             |  |                                                                                        |
|             |  |                           ( Cancel )       [ Generate & Send 45 Statements ]           |
|             |  |                                                                                        |
|             |  +----------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Bulk Generation Progress

```
+======================================================================================================+
|                                                                                                      |
|   +-----------------------------------------------------------------------------------------------+  |
|   | Generating Statements                                                              [Cancel]   |  |
|   +-----------------------------------------------------------------------------------------------+  |
|   |                                                                                               |  |
|   |  Progress: [#############################..................] 65%                              |  |
|   |                                                                                               |  |
|   |  Generating: 29/45 statements                                                                 |  |
|   |  Current: Beta Industries                                                                     |  |
|   |                                                                                               |  |
|   |  +----------------------------------------------------------------------------------------+   |  |
|   |  | [ok] Acme Corporation      | Generated & Emailed to john@acme.com                      |   |  |
|   |  | [ok] Alpha Inc             | Generated & Emailed to contact@alpha.io                   |   |  |
|   |  | [ok] Beta Industries       | Generating...                                             |   |  |
|   |  | [ ] Gamma LLC              | Pending                                                   |   |  |
|   |  | [ ] Delta Inc              | Pending                                                   |   |  |
|   |  | ...                        | ...                                                       |   |  |
|   |  +----------------------------------------------------------------------------------------+   |  |
|   |                                                                                               |  |
|   |  Estimated time remaining: 2 minutes                                                          |  |
|   |                                                                                               |  |
|   +-----------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
+-- GENERATING PDF ---------------------------+
|                                            |
|  +----------------------------------------+|
|  |                                        ||
|  |            [spinning icon]             ||
|  |                                        ||
|  |     Generating Statement               ||
|  |                                        ||
|  |  [=====>                    ] 25%      ||
|  |                                        ||
|  |  Calculating transactions...           ||
|  |                                        ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+

+-- SENDING EMAIL ----------------------------+
|                                            |
|  [ [spin] Sending statement... ]           |
|                                            |
|  Delivering to john@acme.com               |
|                                            |
+--------------------------------------------+

+-- LOADING PREVIEW --------------------------+
|                                            |
|  +----------------------------------------+|
|  |  +----------------------------------+  ||
|  |  |                                  |  ||
|  |  |  [skeleton lines]                |  ||
|  |  |  [skeleton lines]                |  ||
|  |  |  [skeleton lines]                |  ||
|  |  |                                  |  ||
|  |  +----------------------------------+  ||
|  +----------------------------------------+|
|                                            |
|  Shimmer animation on PDF placeholder      |
|                                            |
+--------------------------------------------+
```

### Empty States

```
+-- NO STATEMENT HISTORY ---------------------+
|                                            |
|         +-------------+                    |
|         |   [doc]     |                    |
|         |  statement  |                    |
|         +-------------+                    |
|                                            |
|     NO STATEMENTS YET                      |
|                                            |
|  You haven't generated any statements      |
|  for this customer yet.                    |
|                                            |
|     [+ Generate First Statement]           |
|                                            |
+--------------------------------------------+

+-- NO TRANSACTIONS (Period) -----------------+
|                                            |
|  No transactions found for this period.    |
|                                            |
|  Try selecting a different date range      |
|  or check if there's activity on the       |
|  customer's account.                       |
|                                            |
|  [Adjust Date Range]                       |
|                                            |
+--------------------------------------------+

+-- ZERO BALANCE -----------------------------+
|                                            |
|  [check] Account is fully paid             |
|                                            |
|  This customer has no outstanding          |
|  balance. You can still generate a         |
|  statement for their records.              |
|                                            |
|  [Generate Zero Balance Statement]         |
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- GENERATION ERROR -------------------------+
|                                            |
|  [!] Failed to generate statement          |
|                                            |
|  We couldn't generate the PDF.             |
|  This might be due to missing data         |
|  or a temporary issue.                     |
|                                            |
|       [Retry]    [Cancel]                  |
|                                            |
+--------------------------------------------+

+-- EMAIL DELIVERY ERROR ---------------------+
|                                            |
|  [!] Statement generated but not sent      |
|                                            |
|  The PDF was created successfully but      |
|  we couldn't deliver it by email.          |
|                                            |
|  Error: Invalid email address              |
|                                            |
|  [Download PDF]  [Update Email & Resend]   |
|                                            |
+--------------------------------------------+

+-- BULK ERROR -------------------------------+
|                                            |
|  Generation completed with errors          |
|                                            |
|  Success: 42 statements                    |
|  Failed: 3 statements                      |
|                                            |
|  Failed customers:                         |
|  - Gamma LLC: Missing email                |
|  - Delta Inc: No transactions              |
|  - Omega Co: Generation error              |
|                                            |
|  [Download Successful]  [Retry Failed]     |
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- STATEMENT SENT ---------------------------+
|                                            |
|  [check] Statement sent                    |
|                                            |
|  December 2025 statement emailed to        |
|  john@acme.com                             |
|                                            |
|  [View Statement]                          |
|                                            |
|  <- Toast (5 seconds)                      |
+--------------------------------------------+

+-- DOWNLOAD COMPLETE ------------------------+
|                                            |
|  [check] Statement downloaded              |
|                                            |
|  Statement-AcmeCorp-Dec2025.pdf            |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- BULK COMPLETE ----------------------------+
|                                            |
|  [check] All statements sent!              |
|                                            |
|  45 statements generated and delivered     |
|  Total AR covered: $125,450.00             |
|                                            |
|  [View Summary Report]                     |
|                                            |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Generate Statement Flow**
   - Tab: Period options -> Start date -> End date -> Preview -> Email/Download
   - Arrow keys: Navigate period options
   - Enter: Select period, advance flow
   - Escape: Close dialog

2. **Email Dialog**
   - Tab: To field -> CC field -> Subject -> Message -> Send copy checkbox -> Send button
   - Escape: Close dialog

3. **Statement History**
   - Tab: Navigate between statement entries
   - Enter: View statement detail
   - Arrow Up/Down: Navigate list

### ARIA Requirements

```html
<!-- Generate Statement Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="generate-statement-title"
>
  <h2 id="generate-statement-title">Generate Statement</h2>

  <!-- Period Selection -->
  <fieldset>
    <legend>Select Statement Period</legend>
    <div role="radiogroup" aria-label="Period options">
      <div role="radio" aria-checked="true" tabindex="0">
        Last Month
      </div>
      <div role="radio" aria-checked="false" tabindex="-1">
        This Quarter
      </div>
    </div>
  </fieldset>

  <!-- Date Range -->
  <div role="group" aria-label="Custom date range">
    <label for="start-date">Start Date</label>
    <input type="date" id="start-date" aria-describedby="date-hint" />
    <label for="end-date">End Date</label>
    <input type="date" id="end-date" />
    <span id="date-hint">Select the statement period</span>
  </div>
</div>

<!-- PDF Preview -->
<div
  role="document"
  aria-label="Statement preview for December 2025"
  tabindex="0"
>
  <!-- PDF content -->
</div>

<!-- Statement History List -->
<section aria-label="Statement history">
  <ul role="list">
    <li
      role="listitem"
      aria-label="December 2025 statement, balance $12,500, sent December 15"
    >
      <!-- Statement entry -->
    </li>
  </ul>
</section>

<!-- Progress Indicator -->
<div
  role="progressbar"
  aria-valuenow="65"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Generating statements: 29 of 45 complete"
>
  65%
</div>

<!-- Email Form -->
<form aria-label="Email statement form">
  <label for="email-to">To</label>
  <input
    type="email"
    id="email-to"
    aria-required="true"
    aria-describedby="email-hint"
  />
  <span id="email-hint">Primary recipient for the statement</span>
</form>
```

### Screen Reader Announcements

- Period selected: "Statement period set to December 1 through December 31, 2025"
- Preview loaded: "Statement preview loaded. Opening balance: $8,750. Closing balance: $12,500. 12 transactions."
- Statement sent: "Statement successfully emailed to john@acme.com"
- Generation progress: "Generating statements. 29 of 45 complete. Currently processing Beta Industries."
- Bulk complete: "Bulk generation complete. 45 statements sent successfully."

---

## Animation Choreography

### Period Selection

```
OPTION SELECT:
- Duration: 200ms
- Scale: 1 -> 1.02 -> 1
- Border: 2px gray -> 2px green-500
- Background: transparent -> green-50
- Checkmark: fade in (100ms)
```

### PDF Preview Load

```
PLACEHOLDER -> LOADED:
- Duration: 400ms
- Skeleton: fade out (200ms)
- PDF: fade in (200ms)
- Slight scale: 0.98 -> 1
```

### Progress Bar

```
PROGRESS UPDATE:
- Duration: 300ms per increment
- Easing: ease-out
- Bar fill: left to right
- Percentage number: count up animation
```

### Statement Entry

```
NEW STATEMENT ADDED:
- Duration: 300ms
- Transform: translateY(-20px) -> translateY(0)
- Opacity: 0 -> 1
- Other entries: shift down (200ms)
```

### Email Send

```
BUTTON CLICK:
- Duration: 150ms
- Scale: 1 -> 0.98 -> 1

SENDING:
- Duration: variable
- Button text: "Send" -> "[spin] Sending..."
- Disable state applied

SUCCESS:
- Duration: 400ms
- Button: green flash
- Checkmark icon appears
- Dialog closes after 500ms
```

### Bulk Progress

```
ROW COMPLETE:
- Duration: 200ms
- Status icon: [spin] -> [check]
- Row background: subtle green flash
- Next row: [pending] -> [spin] begins
```

---

## Component Props Interfaces

```typescript
// Statement Types
interface Statement {
  id: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactionCount: number;
  pdfUrl?: string;
  sentAt?: Date;
  sentTo?: string;
  createdAt: Date;
  createdByUserId: string;
}

interface StatementTransaction {
  date: Date;
  type: 'invoice' | 'payment' | 'credit' | 'adjustment';
  reference: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance: number;
}

interface StatementPreview {
  customer: Customer;
  period: { start: Date; end: Date };
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransaction[];
  amountDue: number;
}

// Generate Statement Dialog
interface GenerateStatementDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (statement: Statement) => void;
}

// Period Selector
interface PeriodSelectorProps {
  selectedPeriod: PeriodOption | null;
  onSelect: (period: PeriodOption) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}

type PeriodOption =
  | 'this_month'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'year_to_date'
  | 'custom';

// Statement Preview
interface StatementPreviewProps {
  preview: StatementPreview;
  isLoading?: boolean;
  onDownload?: () => void;
  onEmail?: () => void;
}

// Email Statement Dialog
interface EmailStatementDialogProps {
  statement: Statement | StatementPreview;
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface EmailStatementForm {
  to: string;
  cc?: string;
  subject: string;
  message?: string;
  sendCopy: boolean;
}

// Statement History
interface StatementHistoryProps {
  customerId: string;
  limit?: number;
  onViewStatement?: (statement: Statement) => void;
  onResend?: (statement: Statement) => void;
}

// Statement Entry
interface StatementEntryProps {
  statement: Statement;
  onView?: () => void;
  onResend?: () => void;
}

// Transaction Ledger
interface TransactionLedgerProps {
  customerId: string;
  dateRange?: { start: Date; end: Date };
  typeFilter?: StatementTransaction['type'][];
  onExport?: () => void;
}

// Bulk Statement Generation
interface BulkStatementGeneratorProps {
  onComplete?: (results: BulkStatementResult) => void;
}

interface BulkStatementResult {
  total: number;
  successful: number;
  failed: number;
  statements: Array<{
    customerId: string;
    customerName: string;
    status: 'success' | 'failed';
    error?: string;
    statement?: Statement;
  }>;
}

// Bulk Progress
interface BulkProgressProps {
  total: number;
  completed: number;
  current?: { customerId: string; customerName: string };
  results: BulkStatementResult['statements'];
  onCancel?: () => void;
}

// Account Summary
interface AccountSummaryProps {
  customerId: string;
  showStatementActions?: boolean;
  onGenerateStatement?: () => void;
  onSendReminder?: () => void;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Generate dialog | GenerateStatementDialog | Dialog, Sheet |
| Period selector | PeriodSelector | RadioGroup, DatePicker |
| PDF preview | StatementPreview | - |
| Email dialog | EmailStatementDialog | Dialog |
| Statement history | StatementHistory | - |
| Statement entry | StatementEntry | Card |
| Transaction ledger | TransactionLedger | Table |
| Bulk generator | BulkStatementGenerator | - |
| Bulk progress | BulkProgress | Dialog, Progress |
| Account summary | AccountSummary | Card |
| Loading skeleton | StatementSkeleton | Skeleton |

---

## Files to Create/Modify

### Create
- `src/components/domain/financial/statements/generate-statement-dialog.tsx`
- `src/components/domain/financial/statements/period-selector.tsx`
- `src/components/domain/financial/statements/statement-preview.tsx`
- `src/components/domain/financial/statements/email-statement-dialog.tsx`
- `src/components/domain/financial/statements/statement-history.tsx`
- `src/components/domain/financial/statements/statement-entry.tsx`
- `src/components/domain/financial/statements/transaction-ledger.tsx`
- `src/components/domain/financial/statements/bulk-statement-generator.tsx`
- `src/components/domain/financial/statements/bulk-progress.tsx`
- `src/components/domain/financial/statements/account-summary.tsx`
- `src/routes/_authed/financial/statements/bulk.tsx`

### Modify
- `src/routes/_authed/customers/$customerId.tsx` (add Financial tab with statements)
- `src/routes/_authed/financial/index.tsx` (add bulk statement link)
