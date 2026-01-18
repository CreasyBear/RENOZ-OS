# Financial Domain Wireframe: Credit Notes UI (DOM-FIN-001c)

**Story ID:** DOM-FIN-001c
**Component Type:** FormDialog with DataTable list
**Aesthetic:** Professional Financial - clean, precise, trustworthy
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `creditNotes` table (to be created) | NOT CREATED |
| **Server Functions Required** | `createCreditNote`, `applyCreditNoteToInvoice`, `getCreditNotes` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-001a (schema), DOM-FIN-001b (server functions) | PENDING |

### Existing Schema Available
- `orders` in `renoz-v2/lib/schema/orders.ts` (invoice fields: invoiceStatus, invoiceNumber)
- `customers` in `renoz-v2/lib/schema/customers.ts` (customer link)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth - credit notes sync TO Xero
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## UI Patterns (Reference Implementation)

### Credit Note List
- **Pattern**: RE-UI DataGrid with sorting, filtering, pagination
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Midday Example**: `_reference/.midday-reference/apps/dashboard/src/components/tables/transactions/`
- **Features**: Column sorting, status filters, search, bulk selection
- **Mobile**: Card-based list with swipe actions

### Credit Note Status Badges
- **Pattern**: RE-UI Badge with status variants
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Variants**:
  - DRAFT (gray bg, gray text)
  - ISSUED (green-500 bg, white text)
  - APPLIED (blue-500 bg, white text)
  - VOIDED (red-500 bg, white text)
- **Features**: Icons (dot, check, asterisk, X), hover states

### Create Credit Note Form
- **Pattern**: TanStack Form in Dialog/Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form-tanstack.tsx`
- **Dialog**: `_reference/.reui-reference/registry/default/ui/dialog.tsx` (desktop)
- **Sheet**: `_reference/.reui-reference/registry/default/ui/sheet.tsx` (mobile)
- **Features**: Zod validation, error display, async submit, optimistic updates
- **Fields**: Invoice selector (Combobox), Amount (currency input), Reason (RadioGroup), Notes (Textarea)

### Amount Input
- **Pattern**: Custom currency input with formatting
- **Midday Reference**: `_reference/.midday-reference/apps/dashboard/src/components/forms/amount-input.tsx`
- **Features**: Auto-format to $X,XXX.XX, GST calculation, full invoice amount toggle

### Invoice Selector
- **Pattern**: RE-UI Combobox with search
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-combobox.tsx`
- **Features**: Searchable dropdown, invoice number + customer display, balance display

### Apply Credit Dialog
- **Pattern**: Nested dialog with form
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**: RadioGroup for invoice selection, amount input, balance calculations
- **Validation**: Credit amount <= remaining invoice balance

### Credit Note Detail Panel
- **Pattern**: Sheet (mobile) / Side drawer (desktop)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**: Document-style layout, action buttons, audit trail timeline

### Empty State
- **Pattern**: Custom empty state component
- **Features**: Icon, message, primary action button
- **Midday Example**: `_reference/.midday-reference/apps/dashboard/src/components/empty-states/`

### Loading Skeleton
- **Pattern**: RE-UI Skeleton
- **Reference**: `_reference/.reui-reference/registry/default/ui/skeleton.tsx`
- **Features**: Shimmer animation, matches list card layout

---

[Rest of wireframe content remains the same...]

## Design Principles for Financial UI

- **Precision:** Monetary values displayed with exact formatting
- **Trust:** Clear status indicators, audit trails visible
- **Clarity:** Actions have clear consequences, confirmations for destructive operations
- **Consistency:** Financial workflows follow predictable patterns
- **Accessibility:** High contrast, clear labels, keyboard navigable

---

## Mobile Wireframe (375px)

### Credit Note List (Full Screen)

```
+=========================================+
| < Financial                        [$]  |
| Credit Notes                            |
+-----------------------------------------+
| [Search credit notes...           ] [Q] |
+-----------------------------------------+
| [All v] [Status v] [Date Range v]       |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | CN-2026-0045                        ||
|  | Acme Corporation                    ||
|  | --------------------------          ||
|  | Amount: $1,250.00                   ||
|  | Reason: Product return              ||
|  | Status: [= ISSUED]                  ||
|  | Date: Jan 10, 2026                  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | CN-2026-0044                        ||
|  | Beta Industries                     ||
|  | --------------------------          ||
|  | Amount: $500.00                     ||
|  | Reason: Pricing adjustment          ||
|  | Status: [* APPLIED]                 ||
|  | Applied to: INV-2026-0089           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | CN-2026-0043                        ||
|  | Gamma LLC                           ||
|  | --------------------------          ||
|  | Amount: $2,100.00                   ||
|  | Reason: Service credit              ||
|  | Status: [. DRAFT]                   ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|  Showing 1-10 of 45           < 1 2 3 > |
+-----------------------------------------+
|                                         |
|        +---------------------+          |
|        |  [+] NEW CREDIT     |          |
|        |      NOTE           |          |
|        +---------------------+          |
|                                         |
+=========================================+
```

### Credit Note Status Badges

```
+-- STATUS VARIANTS ------------------------+
|                                          |
|  [. DRAFT]    - Gray background          |
|  [= ISSUED]   - Green-500 background     |
|  [* APPLIED]  - Blue-500 background      |
|  [X VOIDED]   - Red-500 background       |
|                                          |
+------------------------------------------+
```

### Create Credit Note (Full Screen Form)

```
+=========================================+
| < Cancel     Create Credit Note  [Save] |
+-----------------------------------------+
|                                         |
|  From Invoice *                         |
|  +-------------------------------------+|
|  | [inv] INV-2026-0089 - Acme Corp   v ||
|  +-------------------------------------+|
|                                         |
|  Invoice Balance: $5,000.00             |
|                                         |
|  -----------------------------------------
|                                         |
|  Credit Amount *                        |
|  +-------------------------------------+|
|  | $                           1,250.00||
|  +-------------------------------------+|
|  [ ] Full invoice amount ($5,000.00)    |
|                                         |
|  Reason *                               |
|  +-------------------------------------+|
|  | Select reason...                   v||
|  +-------------------------------------+|
|                                         |
|  +-- Quick Reasons --------------------+|
|  | (o) Product return                  ||
|  | ( ) Pricing adjustment              ||
|  | ( ) Service credit                  ||
|  | ( ) Duplicate billing               ||
|  | ( ) Other                           ||
|  +-------------------------------------+|
|                                         |
|  Additional Notes                       |
|  +-------------------------------------+|
|  |                                     ||
|  | Customer requested credit for...    ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |        [ CREATE DRAFT ]             ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |     [ CREATE & ISSUE NOW ]          ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Credit Note Detail (Full Screen)

```
+=========================================+
| < Back                   Credit Note    |
+-----------------------------------------+
|                                         |
|  CN-2026-0045                           |
|  ======================================= |
|  Status: [= ISSUED]        Jan 10, 2026 |
|                                         |
|  +-------------------------------------+|
|  |  CREDIT AMOUNT                      ||
|  |                                     ||
|  |         $1,250.00                   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------------
|                                         |
|  Customer                               |
|  Acme Corporation                  [>]  |
|                                         |
|  Related Invoice                        |
|  INV-2026-0089 ($5,000.00)         [>]  |
|                                         |
|  Reason                                 |
|  Product return - Items damaged in      |
|  shipping                               |
|                                         |
|  -----------------------------------------
|                                         |
|  ACTIONS                                |
|  +-------------------------------------+|
|  | [doc] Download PDF                  ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [mail] Email to Customer            ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [apply] Apply to Invoice            ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [X] Void Credit Note                ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------------
|                                         |
|  AUDIT TRAIL                            |
|  * Created by Joel - Jan 10, 10:30 AM   |
|  * Issued by Joel - Jan 10, 10:35 AM    |
|                                         |
+=========================================+
```

### Apply Credit Note Dialog (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  APPLY CREDIT NOTE             [X]      |
|  CN-2026-0045                           |
|  -----------------------------------------
|                                         |
|  Credit Amount: $1,250.00               |
|                                         |
|  Apply to Invoice *                     |
|  +-------------------------------------+|
|  | [inv] Select invoice...           v ||
|  +-------------------------------------+|
|                                         |
|  +-- Open Invoices for Acme Corp ------+|
|  | ( ) INV-2026-0089  $5,000.00        ||
|  |     Due: Jan 15, 2026               ||
|  | ( ) INV-2026-0078  $2,500.00        ||
|  |     Due: Jan 20, 2026               ||
|  | ( ) INV-2026-0065  $1,800.00        ||
|  |     Overdue: Jan 5, 2026            ||
|  +-------------------------------------+|
|                                         |
|  Amount to Apply *                      |
|  +-------------------------------------+|
|  | $                           1,250.00||
|  +-------------------------------------+|
|  [ ] Apply full credit amount           |
|                                         |
|  New Invoice Balance: $3,750.00         |
|  Remaining Credit: $0.00                |
|                                         |
|  +-------------------------------------+|
|  |        [ APPLY CREDIT ]             ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
| < Financial                        [$]  |
| Credit Notes                            |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |   [credit]  |              |
|            |     note    |              |
|            +-------------+              |
|                                         |
|        NO CREDIT NOTES YET              |
|                                         |
|   Credit notes are used to adjust       |
|   invoice balances for returns,         |
|   pricing corrections, or credits.      |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+] CREATE CREDIT NOTE    |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
| < Financial                        [$]  |
| Credit Notes                            |
+-----------------------------------------+
| [............................] [Q]      |
+-----------------------------------------+
| [.....] [.......] [............]        |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | .......................             ||
|  | .................                   ||
|  | Amount: ...........                 ||
|  | Status: [......]                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | .......................             ||
|  | .................                   ||
|  | Amount: ...........                 ||
|  | Status: [......]                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | .......................             ||
|  | .................                   ||
|  | Amount: ...........                 ||
|  | Status: [......]                    ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Error State

```
+=========================================+
| < Financial                        [$]  |
| Credit Notes                            |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |     [!]     |              |
|            |    error    |              |
|            +-------------+              |
|                                         |
|     COULDN'T LOAD CREDIT NOTES          |
|                                         |
|   There was a problem loading your      |
|   credit notes. Please try again.       |
|                                         |
|   +-----------------------------+       |
|   |         [ RETRY ]           |       |
|   +-----------------------------+       |
|                                         |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Credit Note List with Detail Panel

```
+=============================================================================+
| < Financial | Credit Notes                           [+ New Credit Note]     |
+-----------------------------------------------------------------------------+
| [Search credit notes...                    ] [Status v] [Date v] [Export v] |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- LIST ----------------------------------+  +-- DETAIL -----------------+|
|  |                                          |  |                           ||
|  | +---------------------------------------+|  | CN-2026-0045              ||
|  | | CN-2026-0045         [= ISSUED]       ||  | ========================= ||
|  | | Acme Corporation                      ||  |                           ||
|  | | $1,250.00            Jan 10, 2026   < ||  | Status: [= ISSUED]        ||
|  | +---------------------------------------+|  |                           ||
|  |                                          |  | +----------------------+  ||
|  | +---------------------------------------+|  | |                      |  ||
|  | | CN-2026-0044         [* APPLIED]      ||  | |     $1,250.00        |  ||
|  | | Beta Industries                       ||  | |                      |  ||
|  | | $500.00              Jan 9, 2026      ||  | +----------------------+  ||
|  | +---------------------------------------+|  |                           ||
|  |                                          |  | Customer:                 ||
|  | +---------------------------------------+|  | Acme Corporation     [>]  ||
|  | | CN-2026-0043         [. DRAFT]        ||  |                           ||
|  | | Gamma LLC                             ||  | Invoice:                  ||
|  | | $2,100.00            Jan 8, 2026      ||  | INV-2026-0089        [>]  ||
|  | +---------------------------------------+|  |                           ||
|  |                                          |  | Reason:                   ||
|  | +---------------------------------------+|  | Product return            ||
|  | | CN-2026-0042         [= ISSUED]       ||  |                           ||
|  | | Delta Inc                             ||  | ----------------------    ||
|  | | $750.00              Jan 7, 2026      ||  |                           ||
|  | +---------------------------------------+|  | [Download PDF]            ||
|  |                                          |  | [Email to Customer]       ||
|  | Showing 1-10 of 45        < 1 2 3 >     |  | [Apply to Invoice]        ||
|  +------------------------------------------+  | [Void Credit Note]        ||
|                                                |                           ||
|                                                +---------------------------+|
|                                                                             |
+=============================================================================+
```

### Create Credit Note Modal

```
+===============================================================+
|                                                               |
|   +-------------------------------------------------------+   |
|   | Create Credit Note                               [X]  |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |  From Invoice *                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  | [inv] INV-2026-0089 - Acme Corp ($5,000.00)     v ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   |  +------------------------+ +------------------------+|   |
|   |  | Credit Amount *        | | Reason *               ||   |
|   |  | +--------------------+ | | +--------------------+ ||   |
|   |  | | $          1,250.00| | | | Product return   v | ||   |
|   |  | +--------------------+ | | +--------------------+ ||   |
|   |  | [ ] Full amount        | |                        ||   |
|   |  +------------------------+ +------------------------+|   |
|   |                                                       |   |
|   |  Additional Notes                                     |   |
|   |  +---------------------------------------------------+|   |
|   |  | Customer requested credit due to damaged items... ||   |
|   |  |                                                   ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  |      ( Cancel )       [ Create & Issue ]          ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|                                                               |
+===============================================================+
```

---

## Desktop Wireframe (1280px+)

### Credit Note List Page

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Credit Notes                                              [+ New Credit Note]         |
| Customers   |  Manage credit notes and adjustments                                                   |
| Orders      |  --------------------------------------------------------------------------------------|
| Products    |                                                                                        |
| Jobs        |  [Search credit notes...                           ] [Status v] [Date Range v]        |
| Pipeline    |                                                                                        |
| Financial < |  Active Filters: [Issued x] [This Month x]                           [Clear All]       |
|  > Invoices |  --------------------------------------------------------------------------------------|
|  > Payments |                                                                                        |
|  > Credits <|  +--------------------------------------------------------------------------------+    |
|  > Aging    |  |                                                                                |    |
|  > Reports  |  | [ ] | Credit #     | Customer        | Amount      | Reason     | Status   | |    |
| Settings    |  +-----+-------------+-----------------+-------------+------------+----------+--+    |
|             |  | [ ] | CN-2026-0045| Acme Corp       | $1,250.00   | Return     | ISSUED   |...|    |
|             |  | [ ] | CN-2026-0044| Beta Industries | $500.00     | Price adj  | APPLIED  |...|    |
|             |  | [ ] | CN-2026-0043| Gamma LLC       | $2,100.00   | Service    | DRAFT    |...|    |
|             |  | [ ] | CN-2026-0042| Delta Inc       | $750.00     | Return     | ISSUED   |...|    |
|             |  | [ ] | CN-2026-0041| Epsilon Co      | $3,000.00   | Duplicate  | VOIDED   |...|    |
|             |  +--------------------------------------------------------------------------------+    |
|             |                                                                                        |
|             |  < 1 2 3 ... 10 >                                   Showing 1-25 of 234 credit notes   |
|             |                                                                                        |
|             |  --------------------------------------------------------------------------------------|
|             |                                                                                        |
|             |  SUMMARY                                                                               |
|             |  +--------------------+ +--------------------+ +--------------------+                   |
|             |  | Total Issued       | | Total Applied      | | Pending Draft      |                   |
|             |  | $45,250.00         | | $38,500.00         | | $6,750.00          |                   |
|             |  | 45 credit notes    | | 38 credit notes    | | 7 credit notes     |                   |
|             |  +--------------------+ +--------------------+ +--------------------+                   |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Credit Note Detail Panel (Side Drawer)

```
+======================================================================================================+
| ... (main content) ...                                                                               |
|                                                                                        +-------------+
|                                                                                        |             |
|  +--------------------------------------------------------------------------------+    | CN-2026-0045|
|  | [ ] | Credit #     | Customer        | Amount      | Reason     | Status   |..|    | =========== |
|  +-----+-------------+-----------------+-------------+------------+----------+--+    |             |
|  | [ ] | CN-2026-0045| Acme Corp       | $1,250.00   | Return     | ISSUED   |< |    | [= ISSUED]  |
|  | [ ] | CN-2026-0044| Beta Industries | $500.00     | Price adj  | APPLIED  |..|    |             |
|  | [ ] | CN-2026-0043| Gamma LLC       | $2,100.00   | Service    | DRAFT    |..|    | Amount:     |
|  +--------------------------------------------------------------------------------+    | $1,250.00   |
|                                                                                        |             |
|                                                                                        | Customer:   |
|                                                                                        | Acme Corp   |
|                                                                                        |             |
|                                                                                        | Invoice:    |
|                                                                                        | INV-0089    |
|                                                                                        |             |
|                                                                                        | Reason:     |
|                                                                                        | Product     |
|                                                                                        | return      |
|                                                                                        |             |
|                                                                                        | ----------- |
|                                                                                        |             |
|                                                                                        | [PDF]       |
|                                                                                        | [Email]     |
|                                                                                        | [Apply]     |
|                                                                                        | [Void]      |
|                                                                                        |             |
|                                                                                        | ----------- |
|                                                                                        |             |
|                                                                                        | History:    |
|                                                                                        | * Created   |
|                                                                                        | * Issued    |
|                                                                                        |             |
+----------------------------------------------------------------------------------------+-------------+
```

### Customer Detail - Credit Notes Timeline

```
+======================================================================================================+
| Customer: Acme Corporation                                                                           |
+------------------------------------------------------------------------------------------------------+
| [Overview] [Orders] [Invoices] [Payments] [Credit Notes] [Activity]                                  |
|            =====================                                                                     |
+------------------------------------------------------------------------------------------------------+
|                                                                                                      |
|  +-- CREDIT NOTES TIMELINE -----------------------------------------------------------------+        |
|  |                                                                                          |        |
|  |  Total Credits: $3,500.00                                              [+ New Credit]    |        |
|  |  ----------------------------------------------------------------------------------      |        |
|  |                                                                                          |        |
|  |  [=] Jan 10, 2026                                                                        |        |
|  |  |   CN-2026-0045 - Product Return                                                       |        |
|  |  |   Amount: $1,250.00    Status: ISSUED                                                 |        |
|  |  |   Related: INV-2026-0089                                      [View] [Apply]          |        |
|  |  |                                                                                       |        |
|  |  [*] Jan 5, 2026                                                                         |        |
|  |  |   CN-2026-0038 - Pricing Adjustment                                                   |        |
|  |  |   Amount: $750.00      Status: APPLIED to INV-2026-0078                               |        |
|  |  |                                                                        [View]         |        |
|  |  |                                                                                       |        |
|  |  [*] Dec 15, 2025                                                                        |        |
|  |  |   CN-2025-0412 - Service Credit                                                       |        |
|  |  |   Amount: $1,500.00    Status: APPLIED to INV-2025-0890                               |        |
|  |  |                                                                        [View]         |        |
|  |                                                                                          |        |
|  +------------------------------------------------------------------------------------------+        |
|                                                                                                      |
+------------------------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
+-- FORM SUBMISSION -----------------------------+
|                                               |
|  Button transforms:                           |
|  [ Create Credit Note ]                       |
|         |                                     |
|         v                                     |
|  [ [spin] Creating... ]  <- Disabled          |
|         |                                     |
|         v                                     |
|  [ [check] Created! ]    <- Success flash     |
|                                               |
+-----------------------------------------------+

+-- LIST LOADING --------------------------------+
|                                               |
|  Skeleton cards with shimmer animation        |
|  3 placeholder cards visible                  |
|  Duration: Until data loads                   |
|                                               |
+-----------------------------------------------+

+-- APPLY CREDIT PROCESSING ---------------------+
|                                               |
|  [ [spin] Applying credit... ]                |
|                                               |
|  Progress indicator if > 2 seconds            |
|                                               |
+-----------------------------------------------+
```

### Empty States

```
+-- NO CREDIT NOTES (Organization) --------------+
|                                               |
|           +-------------+                     |
|           |   [credit]  |                     |
|           |     note    |                     |
|           +-------------+                     |
|                                               |
|       NO CREDIT NOTES YET                     |
|                                               |
|  Credit notes help you adjust invoice         |
|  balances for returns, corrections,           |
|  or customer credits.                         |
|                                               |
|     [+ Create First Credit Note]              |
|                                               |
+-----------------------------------------------+

+-- NO CREDIT NOTES (Customer) ------------------+
|                                               |
|  This customer has no credit notes.           |
|                                               |
|  [+ Create Credit Note]                       |
|                                               |
+-----------------------------------------------+

+-- NO SEARCH RESULTS ---------------------------+
|                                               |
|  No credit notes matching "xyz"               |
|                                               |
|  Try adjusting your filters or                |
|  search terms.                                |
|                                               |
|  [Clear Filters]                              |
|                                               |
+-----------------------------------------------+
```

### Error States

```
+-- LOAD ERROR ----------------------------------+
|                                               |
|         [!] Error Icon                        |
|                                               |
|  Couldn't load credit notes                   |
|                                               |
|  There was a problem connecting               |
|  to the server. Please try again.             |
|                                               |
|         [Retry]                               |
|                                               |
+-----------------------------------------------+

+-- CREATE ERROR --------------------------------+
|                                               |
|  +-------------------------------------------+|
|  | [!] Failed to create credit note         ||
|  |                                           ||
|  | The credit amount exceeds the invoice    ||
|  | balance. Please enter a valid amount.    ||
|  |                                           ||
|  |                              [Dismiss]   ||
|  +-------------------------------------------+|
|                                               |
+-----------------------------------------------+

+-- APPLY ERROR ---------------------------------+
|                                               |
|  +-------------------------------------------+|
|  | [!] Failed to apply credit note          ||
|  |                                           ||
|  | This credit note has already been        ||
|  | applied or the invoice is closed.        ||
|  |                                           ||
|  |                    [OK]   [View Invoice] ||
|  +-------------------------------------------+|
|                                               |
+-----------------------------------------------+
```

### Success States

```
+-- CREDIT NOTE CREATED -------------------------+
|                                               |
|  [check] Credit note CN-2026-0045 created     |
|                                               |
|  [View Credit Note]  [Create Another]         |
|                                               |
|  <- Toast notification (5 seconds)            |
|                                               |
+-----------------------------------------------+

+-- CREDIT APPLIED ------------------------------+
|                                               |
|  [check] Credit applied to INV-2026-0089      |
|                                               |
|  New invoice balance: $3,750.00               |
|                                               |
|  [View Invoice]                               |
|                                               |
|  <- Toast notification (5 seconds)            |
|                                               |
+-----------------------------------------------+

+-- CREDIT NOTE VOIDED --------------------------+
|                                               |
|  [check] Credit note voided                   |
|                                               |
|  This credit note can no longer be applied.   |
|                                               |
|  <- Toast notification (3 seconds)            |
|                                               |
+-----------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Credit Note List**
   - Tab: Navigate between credit note cards
   - Enter: Open credit note detail
   - Escape: Close detail panel (if open)

2. **Create Credit Note Form**
   - Tab sequence: Invoice selector -> Amount -> Full amount checkbox -> Reason -> Notes -> Create Draft -> Create & Issue
   - Enter on dropdown: Open options
   - Escape: Close dropdown/form

3. **Apply Credit Note Dialog**
   - Focus trapped within dialog
   - Tab: Invoice options -> Amount -> Apply full checkbox -> Apply button
   - Escape: Close dialog

### ARIA Requirements

```html
<!-- Credit Note List -->
<section
  role="region"
  aria-label="Credit notes list"
>
  <ul role="list" aria-label="Credit notes">
    <li
      role="listitem"
      aria-label="Credit note CN-2026-0045, Acme Corporation, $1,250.00, status issued"
      tabindex="0"
    >
      <!-- Card content -->
    </li>
  </ul>
</section>

<!-- Status Badge -->
<span
  role="status"
  aria-label="Status: Issued"
  class="status-badge-issued"
>
  ISSUED
</span>

<!-- Create Form -->
<form aria-label="Create credit note form">
  <fieldset>
    <legend>Credit note details</legend>
    <!-- Form fields -->
  </fieldset>
</form>

<!-- Apply Credit Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="apply-credit-title"
>
  <h2 id="apply-credit-title">Apply Credit Note</h2>
  <!-- Dialog content -->
</div>

<!-- Amount Input -->
<label for="credit-amount">Credit Amount</label>
<input
  id="credit-amount"
  type="text"
  inputmode="decimal"
  aria-describedby="amount-hint"
  aria-invalid="false"
/>
<span id="amount-hint">Enter amount up to $5,000.00</span>
```

### Screen Reader Announcements

- Credit note created: "Credit note CN-2026-0045 created for $1,250.00"
- Credit applied: "Credit of $1,250.00 applied to invoice INV-2026-0089. New balance: $3,750.00"
- Credit voided: "Credit note CN-2026-0045 has been voided"
- List loading: "Loading credit notes"
- List loaded: "Showing 10 of 45 credit notes"
- Error: "Error loading credit notes. Retry button available."

---

## Animation Choreography

### Card Entry (List Load)

```
STAGGER ANIMATION:
- Duration: 200ms per card
- Delay: 50ms between cards
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1
- Easing: ease-out
- Max stagger: 5 cards, then instant
```

### Status Badge Transition

```
STATUS CHANGE (e.g., Draft -> Issued):
- Duration: 300ms
- Old badge: scale(1) -> scale(0.8), opacity 1 -> 0
- New badge: scale(0.8) -> scale(1), opacity 0 -> 1
- Background color cross-fade: 200ms
```

### Form Dialog

```
OPEN (Mobile - Bottom Sheet):
- Duration: 350ms
- Transform: translateY(100%) -> translateY(0)
- Backdrop: opacity 0 -> 0.5
- Easing: cubic-bezier(0.32, 0.72, 0, 1)

OPEN (Desktop - Side Panel):
- Duration: 300ms
- Transform: translateX(100%) -> translateX(0)
- Backdrop: none
- Easing: ease-out

CLOSE:
- Duration: 250ms
- Reverse of open animation
- Easing: ease-in
```

### Apply Credit Confirmation

```
APPLY BUTTON PRESS:
- Duration: 150ms
- Scale: 1 -> 0.98 -> 1
- Haptic: light (mobile)

SUCCESS ANIMATION:
- Duration: 500ms
- Checkmark draw: 300ms
- Confetti burst (subtle): 200ms
- Color flash (green): 200ms
```

### Loading Skeleton

```
SHIMMER:
- Duration: 1.5s
- Animation: linear gradient sweep
- Background: gray-100 to gray-200 to gray-100
- Direction: left to right
- Loop: infinite
```

---

## Component Props Interfaces

```typescript
// Credit Note List
interface CreditNoteListProps {
  organizationId: string;
  customerId?: string; // Filter by customer
  invoiceId?: string; // Filter by invoice
  initialFilters?: CreditNoteFilters;
  onSelect?: (creditNote: CreditNote) => void;
  showSummary?: boolean;
}

interface CreditNoteFilters {
  status?: CreditNoteStatus[];
  dateRange?: { start: Date; end: Date };
  search?: string;
  sortBy?: 'date' | 'amount' | 'customer';
  sortOrder?: 'asc' | 'desc';
}

// Credit Note Card
interface CreditNoteCardProps {
  creditNote: CreditNote;
  isSelected?: boolean;
  onClick?: () => void;
  showCustomer?: boolean;
  showActions?: boolean;
  variant?: 'compact' | 'detailed';
}

// Create Credit Note Form
interface CreateCreditNoteFormProps {
  invoiceId?: string; // Pre-select invoice
  customerId?: string; // Filter invoices by customer
  onSuccess?: (creditNote: CreditNote) => void;
  onCancel?: () => void;
}

// Credit Note Detail
interface CreditNoteDetailProps {
  creditNoteId: string;
  onClose?: () => void;
  onApply?: () => void;
  onVoid?: () => void;
  variant?: 'panel' | 'page' | 'modal';
}

// Apply Credit Note Dialog
interface ApplyCreditNoteDialogProps {
  creditNote: CreditNote;
  invoices?: Invoice[]; // Available invoices
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (invoiceId: string, amount: number) => void;
}

// Status Badge
interface CreditNoteStatusBadgeProps {
  status: CreditNoteStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'voided';

// Credit Note Timeline (Customer Detail)
interface CreditNoteTimelineProps {
  customerId: string;
  limit?: number;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

// Data Types
interface CreditNote {
  id: string;
  number: string; // CN-2026-0045
  invoiceId: string;
  customerId: string;
  amount: number;
  reason: CreditNoteReason;
  reasonDetails?: string;
  status: CreditNoteStatus;
  appliedToInvoiceId?: string;
  appliedAt?: Date;
  pdfUrl?: string;
  createdAt: Date;
  createdByUserId: string;
  organizationId: string;
}

type CreditNoteReason =
  | 'product_return'
  | 'pricing_adjustment'
  | 'service_credit'
  | 'duplicate_billing'
  | 'other';
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Credit note list | CreditNoteList | - |
| Credit note card | CreditNoteCard | Card |
| Status badge | CreditNoteStatusBadge | Badge |
| Create form | CreateCreditNoteForm | Form, Sheet/Dialog |
| Detail panel | CreditNoteDetail | Sheet |
| Apply dialog | ApplyCreditNoteDialog | Dialog |
| Timeline | CreditNoteTimeline | - |
| Empty state | EmptyState | - |
| Loading skeleton | CreditNoteListSkeleton | Skeleton |
| Amount input | CurrencyInput | Input |

---

## Files to Create/Modify

### Create
- `src/components/domain/financial/credit-notes/credit-note-list.tsx`
- `src/components/domain/financial/credit-notes/credit-note-card.tsx`
- `src/components/domain/financial/credit-notes/credit-note-status-badge.tsx`
- `src/components/domain/financial/credit-notes/create-credit-note-form.tsx`
- `src/components/domain/financial/credit-notes/credit-note-detail.tsx`
- `src/components/domain/financial/credit-notes/apply-credit-note-dialog.tsx`
- `src/components/domain/financial/credit-notes/credit-note-timeline.tsx`
- `src/components/domain/financial/credit-notes/credit-note-list-skeleton.tsx`
- `src/routes/_authed/financial/credit-notes/index.tsx`
- `src/routes/_authed/financial/credit-notes/$creditNoteId.tsx`

### Modify
- `src/routes/_authed/customers/$customerId.tsx` (add Credit Notes tab)
- `src/routes/_authed/financial/invoices/$invoiceId.tsx` (add Create Credit Note action)
