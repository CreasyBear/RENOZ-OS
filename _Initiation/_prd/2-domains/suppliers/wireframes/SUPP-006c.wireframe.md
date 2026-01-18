# Wireframe: DOM-SUPP-006c - PO Amendments UI

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-006c
> **Story Name**: PO Amendments: UI
> **Type**: UI Component
> **Component Type**: Dialog with Form and DataTable
> **Last Updated**: 2026-01-10

---

## Overview

This wireframe covers the UI for amending purchase orders and tracking changes:
- Amendment action button on PO detail page
- Amendment dialog with form for reason and changes
- Amendment notification to supplier (email preview)
- Amendment history section with diff view
- Original vs current comparison

---

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-dialog.tsx`
- **Features**:
  - Amend order dialog with multi-section form
  - Amendment email preview modal
  - Confirmation dialog for submission

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form.tsx`
- **Features**:
  - Amendment reason select with validation
  - Change type checkboxes (quantities, prices, items)
  - Details textarea for amendment explanation

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Line items table with editable quantity inputs
  - Amendment history table with diff indicators
  - Side-by-side comparison table (original vs current)

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - NEW item badge (green) for added products
  - CHANGED indicator badge for modified items
  - Value difference badges (+$102.50)

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-tabs.tsx`
- **Features**:
  - PO detail tabs (Details, Items, Amendments, Costs)
  - Comparison view tabs (Original, Current, Side-by-Side)
  - Amendment count badge on Amendments tab

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Amendment summary card showing totals
  - Individual amendment cards in history
  - Notification status card (sent/delivered)

---

## Mobile Wireframe (375px)

### Amendment Action Button (PO Header)

```
+=========================================+
| < Purchase Orders                [...]  |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |        PO-2024-0145               |  |
|  |                                   |  |
|  |    [Sent]                         |  |
|  |                                   |  |
|  |    BYD Australia Pty Ltd          |  |
|  |    Total: $2,625.00               |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [Receive Goods] [Amend] [Print]   |  |
|  +-----------------------------------+  |
|                                         |
|  [!] Last amended Jan 12 by Mike J.     | <- If previously amended
|                                         |
+-----------------------------------------+
```

### Amend Order Dialog (Full Screen Mobile)

```
+=========================================+
| Amend Order                        [X]  |
+-----------------------------------------+
|                                         |
|  PO-2024-0145                           |
|  BYD Australia Pty Ltd                  |
|  Current Total: $2,625.00               |
|                                         |
|  -----------------------------------    |
|                                         |
|  WHAT ARE YOU CHANGING?                 |
|                                         |
|  [ ] Line item quantities               |
|  [ ] Line item prices                   |
|  [x] Add new items                      |
|  [ ] Remove items                       |
|  [ ] Delivery date                      |
|  [ ] Delivery address                   |
|  [ ] Other                              |
|                                         |
|  -----------------------------------    |
|                                         |
|  Reason for Amendment *                 |
|  +-----------------------------------+  |
|  | Select reason...               v  |  |
|  +-----------------------------------+  |
|    ( ) Customer request                 |
|    ( ) Price adjustment                 |
|    ( ) Quantity correction              |
|    ( ) Product substitution             |
|    ( ) Schedule change                  |
|    ( ) Error correction                 |
|    ( ) Other                            |
|                                         |
|  Details *                              |
|  +-----------------------------------+  |
|  | Explain the changes and why...   |  |
|  |                                   |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  LINE ITEMS                             |
|                                         |
|  +-----------------------------------+  |
|  | LFP Battery Cells 280Ah              |  |
|  | Qty: 50 -> [___55___]  [change]  |  |
|  | $4.50 x 55 = $247.50              |  |
|  |              +$22.50 from orig.   |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Inverter Modules 5kW               |  |
|  | Qty: 100 (no change)              |  |
|  | $12.00 x 100 = $1,200.00          |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | + NEW: BMS Control Units        |  | <- New item highlight
|  | Qty: [___10___]                   |  |
|  | $8.00 x 10 = $80.00               |  |
|  +-----------------------------------+  |
|                                         |
|  [+ Add Another Item]                   |
|                                         |
|  -----------------------------------    |
|                                         |
|  SUMMARY                                |
|  +-----------------------------------+  |
|  | Original Total    |    $2,625.00 |  |
|  | Amended Total     |    $2,727.50 |  |
|  | Difference        |     +$102.50 |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  [x] Notify supplier of changes         |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)             [Submit Amendment] |
|                                         |
+=========================================+
```

### Amendment History Tab

```
+=========================================+
| [Details] [Items] [Amendments] [Costs]  |
|                   ============          |
+-----------------------------------------+
|                                         |
|  AMENDMENT HISTORY                      |
|  -----------------------------------    |
|                                         |
|  This order has been amended 2 times    |
|                                         |
|  +-----------------------------------+  |
|  | Amendment #2                      |  |
|  | January 14, 2026 at 3:30 PM       |  |
|  | By: Sarah Kim                     |  |
|  | --------------------------------- |  |
|  | Reason: Customer request          |  |
|  | Changes:                          |  |
|  | - Added Drywall Tape (10 units)   |  |
|  | - Increased Pine Lumber to 55     |  |
|  | --------------------------------- |  |
|  | Value: +$102.50                   |  |
|  |                    [View Details] |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Amendment #1                      |  |
|  | January 10, 2026 at 11:15 AM      |  |
|  | By: Mike Johnson                  |  |
|  | --------------------------------- |  |
|  | Reason: Price adjustment          |  |
|  | Changes:                          |  |
|  | - Updated Pine Lumber price       |  |
|  |   $4.75 -> $4.50                  |  |
|  | --------------------------------- |  |
|  | Value: -$12.50                    |  |
|  |                    [View Details] |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  [View Original Order]                  |
|                                         |
+=========================================+
```

### Amendment Detail (Diff View)

```
+=========================================+
| < Amendments                            |
+-----------------------------------------+
|                                         |
|  Amendment #2                           |
|  January 14, 2026 at 3:30 PM            |
|  By: Sarah Kim                          |
|                                         |
|  Reason: Customer request               |
|  "Customer needs additional drywall     |
|  tape and 5 more lumber pieces for      |
|  extended project scope."               |
|                                         |
|  -----------------------------------    |
|                                         |
|  CHANGES                                |
|                                         |
|  +-----------------------------------+  |
|  | LFP Battery Cells 280Ah              |  |
|  | --------------------------------- |  |
|  | Quantity:                         |  |
|  |   Before: 50                      |  |
|  |   After:  55  [+5]                |  | <- Green highlight
|  | --------------------------------- |  |
|  | Line Total:                       |  |
|  |   Before: $225.00                 |  |
|  |   After:  $247.50  [+$22.50]      |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [+] BMS Control Units    [NEW]  |  | <- Green "NEW" badge
|  | --------------------------------- |  |
|  | Quantity: 10                      |  |
|  | Unit Price: $8.00                 |  |
|  | Line Total: $80.00                |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  SUMMARY                                |
|  +-----------------------------------+  |
|  | Items Added      |              1 |  |
|  | Items Modified   |              1 |  |
|  | Items Removed    |              0 |  |
|  | --------------------------------- |  |
|  | Value Change     |       +$102.50 |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  SUPPLIER NOTIFICATION                  |
|  Sent to: liwei@byd.com.au          |
|  Status: Delivered Jan 14 at 3:32 PM    |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Amendments Tab with Side Panel

```
+================================================================+
| [Details] [Items (12)] [Receipts] [Amendments (2)] [Costs]      |
|                                   ================              |
+----------------------------------------------------------------+
|                                                                 |
| +-- AMENDMENT HISTORY ----------------+ +-- SELECTED -----------+
| |                                     | |                       |
| | This order has been amended 2 times | | Amendment #2          |
| |                                     | | Jan 14 by Sarah K.    |
| | +--------------------------------+  | |                       |
| | | #2 | Jan 14 | Sarah K. | +$102|< | | Reason:               |
| | +--------------------------------+  | | Customer request      |
| | | #1 | Jan 10 | Mike J.  | -$12 |  | |                       |
| | +--------------------------------+  | | Changes:              |
| |                                     | | - Pine Lumber: +5     |
| | [View Original Order]               | | - Added Drywall Tape  |
| |                                     | |                       |
| +-------------------------------------+ | Value: +$102.50       |
|                                         |                       |
|                                         | [View Full Details]   |
|                                         +-----------------------+
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Amendment Dialog

```
+==============================================================================================+
|                                                                                              |
| +-- AMEND ORDER DIALOG -----------------------------------------------------------------+    |
| |                                                                                       |    |
| |  Amend Purchase Order                                                           [X]  |    |
| |  ====================================================================================|    |
| |                                                                                       |    |
| |  PO-2024-0145  |  BYD Australia Pty Ltd  |  Current Total: $2,625.00                 |    |
| |                                                                                       |    |
| |  +-- AMENDMENT DETAILS -------------------+ +-- LINE ITEMS ---------------------------+   |
| |  |                                        | |                                         |   |
| |  | What are you changing?                 | | Product            | Qty  | New Qty    |   |
| |  | [x] Line item quantities               | | ------------------- + ---- + ---------- |   |
| |  | [ ] Line item prices                   | | 2x4 Pine Lumber    |  50  | [__55__]   |   |
| |  | [x] Add new items                      | | Drywall Sheets     | 100  | [__100_]   |   |
| |  | [ ] Remove items                       | | Joint Compound     |  20  | [__20__]   |   |
| |  | [ ] Delivery date                      | | Drywall Screws     |  25  | [__25__]   |   |
| |  | [ ] Delivery address                   | |                                         |   |
| |  | [ ] Other                              | | + NEW ITEMS                             |   |
| |  |                                        | | ----------------------------------------|   |
| |  | -----------------------------------    | | [Search product to add...            ]  |   |
| |  |                                        | |                                         |   |
| |  | Reason for Amendment *                 | | BMS Control Units | [__10__] @ $8.00  |   |
| |  | [Customer request              v]      | |                           [x] Remove   |   |
| |  |                                        | |                                         |   |
| |  | Details *                              | | [+ Add Another Item]                    |   |
| |  | +------------------------------------+ | |                                         |   |
| |  | | Customer needs additional         | | +-----------------------------------------+   |
| |  | | drywall tape and 5 more lumber   | |                                             |   |
| |  | | pieces for extended scope.        | | +-- SUMMARY ------------------------------+   |
| |  | +------------------------------------+ | |                                         |   |
| |  |                                        | | Original Total:        $2,625.00        |   |
| |  | -----------------------------------    | | Amended Total:         $2,727.50        |   |
| |  |                                        | | Difference:             +$102.50        |   |
| |  | [x] Notify supplier of changes         | |                                         |   |
| |  | [x] Requires re-approval (>10% change) | | +---------------------------------------+   |
| |  |                                        | |                                             |   |
| |  +----------------------------------------+ +---------------------------------------------+   |
| |                                                                                       |    |
| |  ===================================================================================  |    |
| |                                                                                       |    |
| |                                              (Cancel)           [Submit Amendment]    |    |
| |                                                                                       |    |
| +---------------------------------------------------------------------------------------+    |
|                                                                                              |
+==============================================================================================+
```

### Amendment History with Comparison

```
+-- AMENDMENTS TAB CONTENT ----------------------------------------------------------------+
|                                                                                          |
| +-- AMENDMENT HISTORY -----------------------+ +-- COMPARISON VIEW ---------------------+|
| |                                            | |                                        ||
| | This order has been amended 2 times        | | AMENDMENT #2 DETAILS                   ||
| |                                            | | January 14, 2026 at 3:30 PM            ||
| | +----------------------------------------+ | | By: Sarah Kim                          ||
| | |                                        | | |                                        ||
| | | #  | Date   | By       | Change       | | | Reason: Customer request               ||
| | | -- + ------ + -------- + ------------ | | | "Customer needs additional drywall     ||
| | | 2  | Jan 14 | Sarah K. | +$102.50   < | | | tape and 5 more lumber pieces for      ||
| | | 1  | Jan 10 | Mike J.  | -$12.50      | | | extended project scope."               ||
| | |                                        | | |                                        ||
| | +----------------------------------------+ | | +-- CHANGES ---------------------------+||
| |                                            | | |                                      |||
| | [View Original Order]                      | | | ITEM           | BEFORE | AFTER     |||
| |                                            | | | -------------- + ------ + --------- |||
| +--------------------------------------------+ | | Pine Lumber Qty|   50   | 55 [+5]   |||
|                                                | | | Pine Lumber $  | $225   | $247.50  |||
|                                                | | | Drywall Tape   |  NEW   | 10 @ $8  |||
|                                                | | |                                      |||
|                                                | | | Total Change: +$102.50              |||
|                                                | | +--------------------------------------+||
|                                                | |                                        ||
|                                                | | +-- NOTIFICATION ---------------------+||
|                                                | | | Sent: liwei@byd.com.au          |||
|                                                | | | Status: Delivered Jan 14 3:32 PM    |||
|                                                | | +--------------------------------------+||
|                                                | |                                        ||
|                                                | +----------------------------------------+|
|                                                                                          |
+------------------------------------------------------------------------------------------+
```

### Original vs Current Comparison

```
+-- COMPARE: ORIGINAL vs CURRENT ----------------------------------------------------------+
|                                                                                          |
|  [Original Order]  [Current Order]  [Side-by-Side]                                       |
|                                     =============                                        |
|                                                                                          |
| +-- ORIGINAL (Jan 8, 2026) -------------+ +-- CURRENT (After 2 Amendments) -------------+|
| |                                        | |                                             ||
| | LINE ITEMS                             | | LINE ITEMS                                  ||
| |                                        | |                                             ||
| | Product           | Qty  | Price      | | Product           | Qty  | Price           ||
| | 2x4 Pine Lumber   |  50  | $4.75      | | 2x4 Pine Lumber   |  55  | $4.50   [CHANGED]||
| | Drywall Sheets    | 100  | $12.00     | | Drywall Sheets    | 100  | $12.00          ||
| | Joint Compound    |  20  | $18.50     | | Joint Compound    |  20  | $18.50          ||
| | Drywall Screws    |  25  | $8.00      | | Drywall Screws    |  25  | $8.00           ||
| |                                        | | Drywall Tape      |  10  | $8.00   [NEW]   ||
| |                                        | |                                             ||
| | ----------------------                 | | ----------------------                      ||
| | Subtotal: $2,387.50                    | | Subtotal: $2,477.50  [+$90.00]              ||
| | Shipping: $150.00                      | | Shipping: $150.00                           ||
| | Tax: $237.50                           | | Tax: $100.00  [CHANGED]                     ||
| | ----------------------                 | | ----------------------                      ||
| | TOTAL: $2,775.00                       | | TOTAL: $2,727.50  [-$47.50]                 ||
| |                                        | |                                             ||
| +----------------------------------------+ +---------------------------------------------+|
|                                                                                          |
| SUMMARY OF ALL CHANGES:                                                                  |
| - Pine Lumber: Qty increased 50->55, Price reduced $4.75->$4.50                          |
| - Drywall Tape: Added 10 units @ $8.00                                                   |
| - Tax: Adjusted from $237.50 to $100.00                                                  |
|                                                                                          |
+------------------------------------------------------------------------------------------+
```

---

## Email Preview for Supplier Notification

```
+=========================================+
| Preview: Amendment Notification         |
+-----------------------------------------+
|                                         |
|  To: liwei@byd.com.au               |
|  Subject: Amendment to PO-2024-0145     |
|                                         |
|  -----------------------------------    |
|                                         |
|  Dear BYD Australia Pty Ltd,            |
|                                         |
|  Purchase Order PO-2024-0145 has been   |
|  amended. Please review the changes:    |
|                                         |
|  CHANGES:                               |
|  - 2x4 Pine Lumber: Qty 50 -> 55        |
|  - Added: Drywall Tape (10 units)       |
|                                         |
|  NEW TOTAL: $2,727.50 (+$102.50)        |
|                                         |
|  Reason: Customer request               |
|  "Customer needs additional drywall     |
|  tape and 5 more lumber pieces."        |
|                                         |
|  Please confirm receipt of this         |
|  amendment.                             |
|                                         |
|  Regards,                               |
|  Renoz CRM                              |
|                                         |
|  -----------------------------------    |
|                                         |
|  [Edit Message]       [Send Now]        |
|                                         |
+=========================================+
```

---

## Loading States

### Amendment History Loading

```
+-------------------------------------------------------------+
|                                                             |
| AMENDMENT HISTORY                                           |
| ---------------------------------------------------         |
|                                                             |
| +-------------------------------------------------------+   |
| | [shimmer===================]  [shimmer====]           |   |
| | [shimmer===========]                                  |   |
| | [shimmer===================]                          |   |
| +-------------------------------------------------------+   |
|                                                             |
| +-------------------------------------------------------+   |
| | [shimmer===================]  [shimmer====]           |   |
| | [shimmer===========]                                  |   |
| | [shimmer===================]                          |   |
| +-------------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
```

### Submitting Amendment

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |  [spinner] Processing amendment...|  |
|  |                                   |  |
|  |  Updating line items...           |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Empty State

### No Amendments

```
+=========================================+
|                                         |
|  AMENDMENT HISTORY                      |
|  -----------------------------------    |
|                                         |
|           +-------------+               |
|           | [document]  |               |
|           +-------------+               |
|                                         |
|      NO AMENDMENTS YET                  |
|                                         |
|   This order has not been amended.      |
|   Click "Amend Order" to make changes   |
|   to quantities, prices, or items.      |
|                                         |
+=========================================+
```

---

## Error States

### Failed to Save Amendment

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Amendment Failed              |  |
|  |                                   |  |
|  | Could not save this amendment.    |  |
|  | Error: Order is no longer active. |  |
|  |                                   |  |
|  |    [Dismiss]    [Retry]           |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Approval Required Warning

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Re-Approval Required          |  |
|  |                                   |  |
|  | This amendment increases the      |  |
|  | order value by more than 10%.     |  |
|  | The order will require re-approval|  |
|  | before sending to the supplier.   |  |
|  |                                   |  |
|  |           [Continue]              |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Success State

```
+=========================================+
|                                         |
|  [check] Amendment Saved!               |
|                                         |
|  PO-2024-0145 has been amended.         |
|  Supplier notification sent.            |
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<!-- Amendment Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="amend-title">
  <h2 id="amend-title">Amend Purchase Order</h2>

  <fieldset role="group" aria-label="Change types">
    <legend>What are you changing?</legend>
    <label>
      <input type="checkbox" /> Line item quantities
    </label>
  </fieldset>

  <label for="reason-select">Reason for Amendment</label>
  <select id="reason-select" aria-required="true">
    <option>Customer request</option>
  </select>

  <table role="grid" aria-label="Line items to amend">
    <thead>
      <tr>
        <th scope="col">Product</th>
        <th scope="col">Current Qty</th>
        <th scope="col">New Qty</th>
      </tr>
    </thead>
    <tbody>
      <tr aria-label="2x4 Pine Lumber, current quantity 50">
        <td>2x4 Pine Lumber</td>
        <td>50</td>
        <td>
          <input type="number" aria-label="New quantity" value="55" />
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Amendment History -->
<section role="region" aria-label="Amendment history">
  <h2>Amendment History</h2>
  <ol role="list" aria-label="Amendments timeline">
    <li aria-label="Amendment 2 on January 14 by Sarah Kim, added $102.50">
      <!-- Amendment details -->
    </li>
  </ol>
</section>

<!-- Comparison View -->
<section role="region" aria-label="Order comparison">
  <div role="group" aria-label="Original order details">
    <h3>Original Order</h3>
  </div>
  <div role="group" aria-label="Current order details">
    <h3>Current Order</h3>
  </div>
</section>
```

### Keyboard Navigation

```
Tab Order (Amendment Dialog):
1. Close button (X)
2. Change type checkboxes
3. Reason dropdown
4. Details textarea
5. Line item quantity inputs
6. Add item search
7. Notify checkbox
8. Cancel button
9. Submit button

History Navigation:
- Tab: Move between amendments
- Enter: View amendment details
- Arrow Up/Down: Navigate amendment list

Comparison View:
- Tab to toggle between Original/Current/Side-by-Side
- Arrow keys: Navigate comparison table
```

### Screen Reader Announcements

```
On dialog open:
  "Amend purchase order dialog. Current total $2,625.
   Select what you want to change."

On quantity change:
  "2x4 Pine Lumber quantity changed from 50 to 55.
   Line total: $247.50. Order total updated to $2,727.50."

On amendment submit:
  "Submitting amendment. 2 changes: quantity increase,
   new item added. Total change: +$102.50."

On amendment history focus:
  "Amendment 2 of 2. January 14 by Sarah Kim.
   Customer request. Value change: +$102.50."

On comparison view:
  "Side-by-side comparison. Original total $2,775.
   Current total $2,727.50. Difference: -$47.50."
```

---

## Animation Choreography

### Dialog Entry

```
DIALOG OPEN:
- Backdrop: Fade in (150ms)
- Dialog: Slide up + fade (200ms)
- Sections: Stagger fade (200-400ms)
```

### Quantity Change Feedback

```
QUANTITY UPDATE:
- Input: Border highlight (150ms)
- Line total: Counter animation (200ms)
- Order total: Counter animation (300ms)
- Difference: Color transition + counter (300ms)
```

### New Item Added

```
ADD ITEM:
- Row: Slide down + fade in (250ms)
- "NEW" badge: Scale in (150ms)
- Total update: Counter animation (300ms)
```

### Comparison Toggle

```
VIEW SWITCH:
- Current panel: Fade out (150ms)
- New panel: Fade in (200ms)
- Changed cells: Highlight flash (300ms)
```

---

## Component Props Interface

```typescript
// AmendPODialog.tsx
interface AmendPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    poNumber: string;
    supplier: { id: string; name: string; email: string };
    lineItems: POLineItem[];
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
  onSubmit: (amendment: AmendmentInput) => Promise<void>;
  isSubmitting: boolean;
}

interface AmendmentInput {
  changeTypes: AmendmentChangeType[];
  reason: AmendmentReason;
  details: string;
  lineItemChanges: Array<{
    lineItemId: string;
    newQuantity?: number;
    newPrice?: number;
    remove?: boolean;
  }>;
  newItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  notifySupplier: boolean;
}

type AmendmentChangeType =
  | 'quantities'
  | 'prices'
  | 'add_items'
  | 'remove_items'
  | 'delivery_date'
  | 'delivery_address'
  | 'other';

type AmendmentReason =
  | 'customer_request'
  | 'price_adjustment'
  | 'quantity_correction'
  | 'product_substitution'
  | 'schedule_change'
  | 'error_correction'
  | 'other';

// AmendmentHistory.tsx
interface AmendmentHistoryProps {
  amendments: Array<{
    id: string;
    amendmentNumber: number;
    date: Date;
    user: { id: string; name: string };
    reason: AmendmentReason;
    details: string;
    changes: AmendmentChange[];
    valueDifference: number;
    notificationSent: boolean;
    notificationStatus?: 'sent' | 'delivered' | 'failed';
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onViewOriginal: () => void;
  isLoading?: boolean;
}

interface AmendmentChange {
  type: 'quantity' | 'price' | 'add' | 'remove';
  product: { id: string; name: string };
  before?: number;
  after?: number;
  valueDifference: number;
}

// AmendmentComparisonView.tsx
interface AmendmentComparisonViewProps {
  original: POSnapshot;
  current: POSnapshot;
  changes: AmendmentChange[];
  viewMode: 'original' | 'current' | 'side-by-side';
  onViewModeChange: (mode: 'original' | 'current' | 'side-by-side') => void;
}

interface POSnapshot {
  lineItems: Array<{
    product: { id: string; name: string };
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isNew?: boolean;
    isRemoved?: boolean;
    isChanged?: boolean;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

// AmendmentEmailPreview.tsx
interface AmendmentEmailPreviewProps {
  supplier: { name: string; email: string };
  poNumber: string;
  changes: AmendmentChange[];
  newTotal: number;
  valueDifference: number;
  reason: AmendmentReason;
  details: string;
  onEdit: () => void;
  onSend: () => void;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/purchase-orders/$poId.tsx` | Modify | Add amend action |
| `src/components/domain/procurement/amend-po-dialog.tsx` | Create | Amendment dialog |
| `src/components/domain/procurement/amendment-history.tsx` | Create | History list |
| `src/components/domain/procurement/amendment-comparison.tsx` | Create | Diff view |
| `src/components/domain/procurement/amendment-email-preview.tsx` | Create | Email preview |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dialog open | < 200ms | Form visible |
| Quantity calc | < 50ms | Totals updated |
| Amendment submit | < 2s | Complete + toast |
| History load | < 500ms | List populated |
| Comparison render | < 300ms | Side-by-side visible |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
