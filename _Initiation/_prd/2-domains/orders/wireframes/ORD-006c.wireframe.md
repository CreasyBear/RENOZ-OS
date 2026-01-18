# Wireframe: DOM-ORD-006c - Order Amendments UI

## Story Reference

- **Story ID**: DOM-ORD-006c
- **Name**: Order Amendments: UI
- **PRD**: memory-bank/prd/domains/orders.prd.json
- **Type**: UI Component
- **Component Type**: FormDialogWithHistory (Timeline + Diff View)

## Overview

Amendment workflow interface including request dialog with before/after comparison, amendment history timeline display, and approve/reject actions for managers. Shows all amendments on an order with status tracking, expandable change details, and approval workflow integration.

## UI Patterns (Reference Implementation)

### Stepper
- **Pattern**: RE-UI Stepper
- **Reference**: `_reference/.reui-reference/registry/default/ui/stepper.tsx`
- **Features**:
  - 3-step amendment flow (Select Changes, Review, Provide Reason)
  - Validation before allowing next step
  - Keyboard navigation

### Timeline (Amendment History)
- **Pattern**: Vertical timeline
- **Reference**: `_reference/.square-ui-reference/templates/tasks/` or custom
- **Features**:
  - Amendment history with expandable details
  - Chronological ordering
  - User attribution and timestamps

### Diff View
- **Pattern**: Before/After comparison
- **Reference**: Custom component (table-based)
- **Features**:
  - Color-coded changes: green (added), red (removed), amber (modified)
  - Side-by-side or inline view
  - Field-level change highlighting

### Status Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Amendment status: Pending (amber), Approved (blue), Applied (green), Rejected (red)

### Dialog (Approval/Rejection)
- **Pattern**: RE-UI AlertDialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx`
- **Features**:
  - Confirmation dialogs for approval/rejection
  - Required reason field for rejection
  - Action buttons

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | orders, orderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-ORD-006c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Amendment History Tab (Order Panel)

```
+=========================================+
| < Order #ORD-2024-0156           [...]  |
| Brisbane Solar Co                        |
+-----------------------------------------+
| [Items] [Fulfill] [Activity] [Amend]    |
|                              ========   |
+-----------------------------------------+
|                                         |
|  AMENDMENTS                             |
|  ───────────────────────────────────    |
|                                         |
|  +-------------------------------------+|
|  |  [clock]  Jan 10, 2026  2:30 PM     ||
|  |  ───────────────────────────────    ||
|  |                                     ||
|  |  Requested by: Mike Johnson         ||
|  |  Status: [Pending Approval]         || <- Yellow badge
|  |                                     ||
|  |  Changes:                           ||
|  |  - 10kWh LFP Battery System: 10 -> 12 units       ||
|  |  - Add: Cable Set x 5               ||
|  |                                     ||
|  |  Total Impact: +$425.00             ||
|  |                                     ||
|  |  Reason: Customer requested         ||
|  |  additional items after site visit  ||
|  |                                     ||
|  |  [View Details]                     ||
|  |                                     ||
|  |  +-------------------------------+  || <- Manager actions
|  |  |  [Approve]    [Reject]        |  ||
|  |  +-------------------------------+  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [clock]  Jan 8, 2026  10:15 AM     ||
|  |  ───────────────────────────────    ||
|  |                                     ||
|  |  Requested by: Sarah Chen           ||
|  |  Status: [Applied]                  || <- Green badge
|  |                                     ||
|  |  Changes:                           ||
|  |  - 5kW Hybrid Inverter: $89 -> $79          ||
|  |  - Removed: Mounting Bracket Set x 2         ||
|  |                                     ||
|  |  Total Impact: -$110.00             ||
|  |                                     ||
|  |  [View Details]                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [clock]  Jan 5, 2026  4:00 PM      ||
|  |  ───────────────────────────────    ||
|  |                                     ||
|  |  Requested by: Mike Johnson         ||
|  |  Status: [Rejected]                 || <- Red badge
|  |                                     ||
|  |  [View Details]                     ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|        +---------------------+          |
|        | [+] REQUEST AMEND   |          | <- FAB
|        +---------------------+          |
|                                         |
+=========================================+
```

### Request Amendment Dialog (Stepped Flow)

```
+=========================================+
| Request Amendment               [X]     |
| Order #ORD-2024-0156                    |
+-----------------------------------------+
|                                         |
|  STEP 1 OF 3: Select Changes            |
|  [=====              ]                  |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  MODIFY QUANTITIES                      |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System (WGT-001)               ||
|  |  Current: 10 units @ $125.00        ||
|  |                                     ||
|  |  New Qty:  [-] | 12 | [+]           ||
|  |  Change: +$250.00                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  5kW Hybrid Inverter (GDG-002)              ||
|  |  Current: 5 units @ $89.00          ||
|  |                                     ||
|  |  New Qty:  [-] | 5 | [+]            || <- Unchanged
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  CHANGE PRICES                          |
|                                         |
|  +-------------------------------------+|
|  |  [pencil] Edit item prices          ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  ADD/REMOVE ITEMS                       |
|                                         |
|  +-------------------------------------+|
|  |  [+] Add Item                       ||
|  +-------------------------------------+|
|  |  [-] Remove: Mounting Bracket Set x 2        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |              [NEXT ->]              ||
|  +-------------------------------------+|
|                                         |
+=========================================+

--- STEP 2: REVIEW CHANGES ---

+=========================================+
| Request Amendment               [X]     |
| Order #ORD-2024-0156                    |
+-----------------------------------------+
|                                         |
|  STEP 2 OF 3: Review Changes            |
|  [==========         ]                  |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  BEFORE -> AFTER                        |
|                                         |
|  +-------------------------------------+|
|  |  ITEM CHANGES                       ||
|  |  ───────────────────────────────    ||
|  |                                     ||
|  |  10kWh LFP Battery System (WGT-001)               ||
|  |  Qty: 10 -> 12  (+2)                ||
|  |  Line: $1,250 -> $1,500 (+$250)     ||
|  |                                     ||
|  |  Cable Set (CBL-010) [NEW]          ||
|  |  Qty: 0 -> 5  (+5)                  ||
|  |  Line: $0 -> $175.00 (+$175)        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  ORDER TOTALS                       ||
|  |  ───────────────────────────────    ||
|  |                                     ||
|  |  Subtotal: $3,450 -> $3,875         ||
|  |  Tax (10%): $345 -> $387.50         ||
|  |  ───────────────────────────────    ||
|  |  Total: $3,795 -> $4,262.50         ||
|  |                                     ||
|  |  DIFFERENCE: +$467.50               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |     [<- BACK]      [NEXT ->]        ||
|  +-------------------------------------+|
|                                         |
+=========================================+

--- STEP 3: ADD REASON ---

+=========================================+
| Request Amendment               [X]     |
| Order #ORD-2024-0156                    |
+-----------------------------------------+
|                                         |
|  STEP 3 OF 3: Provide Reason            |
|  [===============    ]                  |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  Reason for Amendment *                 |
|  +-------------------------------------+|
|  |                                     ||
|  | Customer requested additional       ||
|  | items after site visit. Approved    ||
|  | by customer via email on Jan 10.    ||
|  |                                     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  SUMMARY                                |
|  Items changed: 2                       |
|  Total impact: +$467.50                 |
|                                         |
|  This amendment will require            |
|  manager approval before applying.      |
|                                         |
|  +-------------------------------------+|
|  |     [<- BACK]   [SUBMIT REQUEST]    ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Amendment Detail Viewer

```
+=========================================+
| Amendment Detail                   [X]  |
| Order #ORD-2024-0156                    |
+-----------------------------------------+
|                                         |
|  Status: [Pending Approval]             |
|                                         |
|  Requested: Jan 10, 2026 2:30 PM        |
|  By: Mike Johnson                       |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  ITEM CHANGES                           |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System                         ||
|  |  ───────────────────────────────    ||
|  |  BEFORE          AFTER              ||
|  |  Qty: 10         Qty: 12            ||
|  |  $1,250.00       $1,500.00          ||
|  |                  +$250.00           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  Cable Set [NEW ITEM]               ||
|  |  ───────────────────────────────    ||
|  |  Qty: 5                             ||
|  |  $175.00                            ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  TOTAL CHANGES                          |
|  ───────────────────────────────────    |
|  Subtotal: $3,450 -> $3,875  (+$425)    |
|  Tax: $345 -> $387.50  (+$42.50)        |
|  Total: $3,795 -> $4,262.50  (+$467.50) |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  REASON                                 |
|  Customer requested additional items    |
|  after site visit. Approved by          |
|  customer via email on Jan 10.          |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  +-------------------------------------+|
|  |  [Approve Amendment]                ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  |  [Reject Amendment]                 ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
|                                         |
|  AMENDMENTS                             |
|  ───────────────────────────────────    |
|                                         |
|            +-------------+              |
|            |   [doc]     |              |
|            |    ~~~      |              |
|            +-------------+              |
|                                         |
|       NO AMENDMENTS YET                 |
|                                         |
|   Amendments track changes to           |
|   this order after creation.            |
|   Changes require approval              |
|   before being applied.                 |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+] REQUEST AMENDMENT     |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Amendment History with Side-by-Side Comparison

```
+=====================================================================+
| < Back | Order #ORD-2024-0156 - Brisbane Solar       [Print] [Actions v]  |
+---------------------------------------------------------------------+
| [Items] [Fulfillment] [Activity] [Amendments]                        |
|                                  ===========                         |
+---------------------------------------------------------------------+
|                                                                      |
|  AMENDMENTS                                    [+ Request Amendment] |
|  ─────────────────────────────────────────────────────────────────   |
|                                                                      |
+----------------------------------------------+-----------------------+
|  TIMELINE                                    |  DETAIL               |
|                                              |                       |
|  +----------------------------------------+  |  Amendment #AM-003    |
|  |  [o] Jan 10, 2026 2:30 PM              |  |  [Pending Approval]   |
|  |      Requested by: Mike Johnson        |  |  ─────────────────    |
|  |      [Pending Approval]                |<-|                       |
|  |      +$467.50 impact                   |  |  CHANGES:             |
|  +----------------------------------------+  |                       |
|  |  [o] Jan 8, 2026 10:15 AM              |  |  10kWh LFP Battery System           |
|  |      Requested by: Sarah Chen          |  |  10 -> 12 units       |
|  |      [Applied]                         |  |  +$250.00             |
|  |      -$110.00 impact                   |  |                       |
|  +----------------------------------------+  |  Cable Set (NEW)      |
|  |  [o] Jan 5, 2026 4:00 PM               |  |  5 units              |
|  |      Requested by: Mike Johnson        |  |  +$175.00             |
|  |      [Rejected]                        |  |                       |
|  |      +$320.00 impact                   |  |  ─────────────────    |
|  +----------------------------------------+  |                       |
|                                              |  Total: +$467.50      |
|                                              |                       |
|                                              |  ─────────────────    |
|                                              |                       |
|                                              |  [Approve] [Reject]   |
|                                              |                       |
+----------------------------------------------+-----------------------+
```

### Request Amendment Dialog (Side-by-Side)

```
+=====================================================================+
|                                                                      |
|   +--------------------------------------------------------------+   |
|   | Request Amendment - Order #ORD-2024-0156                 [X] |   |
|   +--------------------------------------------------------------+   |
|   |                                                              |   |
|   |  +-- MAKE CHANGES -----------+  +-- PREVIEW ---------------+ |   |
|   |  |                           |  |                          | |   |
|   |  |  CURRENT ORDER ITEMS      |  |  CHANGES SUMMARY         | |   |
|   |  |                           |  |                          | |   |
|   |  |  10kWh LFP Battery System               |  |  10kWh LFP Battery System              | |   |
|   |  |  Current: 10 @ $125       |  |  10 -> 12 (+2)           | |   |
|   |  |  New Qty: [-] 12 [+]      |  |  +$250.00                | |   |
|   |  |                           |  |                          | |   |
|   |  |  5kW Hybrid Inverter              |  |  Cable Set (NEW)         | |   |
|   |  |  Current: 5 @ $89         |  |  5 units                 | |   |
|   |  |  New Qty: [-] 5 [+]       |  |  +$175.00                | |   |
|   |  |                           |  |                          | |   |
|   |  |  ─────────────────────    |  |  ──────────────────────  | |   |
|   |  |                           |  |                          | |   |
|   |  |  [+ Add Item]             |  |  TOTALS                  | |   |
|   |  |  [- Remove Item]          |  |  Before: $3,795.00       | |   |
|   |  |                           |  |  After: $4,262.50        | |   |
|   |  |                           |  |  Difference: +$467.50    | |   |
|   |  |                           |  |                          | |   |
|   |  +---------------------------+  +--------------------------+ |   |
|   |                                                              |   |
|   |  Reason *                                                    |   |
|   |  +----------------------------------------------------------+|   |
|   |  | Customer requested additional items after site visit...  ||   |
|   |  +----------------------------------------------------------+|   |
|   |                                                              |   |
|   +--------------------------------------------------------------+   |
|   |                      ( Cancel )   [ Submit Request ]         |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+=====================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Amendment Tab with Timeline

```
+===================================================================================================+
| Renoz CRM                                                                    [bell] [Joel v]      |
+-------------+-------------------------------------------------------------------------------------+
|             |                                                                                     |
| Dashboard   |  < Back to Orders                                                                   |
| Customers   |                                                                                     |
| Orders  <   |  Order #ORD-2024-0156                              [Print] [Edit] [Actions v]       |
| Products    |  Brisbane Solar Co - Kitchen Renovation                                              |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────      |
| Pipeline    |                                                                                     |
| Support     |  [Items] [Fulfillment] [Activity] [Amendments]                                      |
|             |                                    ===========                                      |
|             |                                                                                     |
|             |  +-- AMENDMENTS ----------------------------------------------------------------+   |
|             |  |                                                           [+ Request Amend] |   |
|             |  |                                                                              |   |
|             |  |  +--- TIMELINE --------------------------+  +--- DETAIL -------------------+|   |
|             |  |  |                                       |  |                              ||   |
|             |  |  |  Jan 10, 2026                         |  |  AMENDMENT #AM-003           ||   |
|             |  |  |  ┌────────────────────────────────┐   |  |  Status: [Pending Approval]  ||   |
|             |  |  |  │ [o] 2:30 PM                    │   |  |                              ||   |
|             |  |  |  │ Mike Johnson                   │<--|--|  ITEM CHANGES                ||   |
|             |  |  |  │ [Pending Approval]             │   |  |  ──────────────────────────  ||   |
|             |  |  |  │ 2 items changed | +$467.50     │   |  |                              ||   |
|             |  |  |  └────────────────────────────────┘   |  |  +------------------------+  ||   |
|             |  |  |        |                              |  |  | BEFORE     | AFTER     |  ||   |
|             |  |  |        |                              |  |  +------------------------+  ||   |
|             |  |  |  Jan 8, 2026                          |  |  | 10kWh LFP Battery System | 10kWh LFP Battery System|  ||   |
|             |  |  |  ┌────────────────────────────────┐   |  |  | 10 units   | 12 units  |  ||   |
|             |  |  |  │ [o] 10:15 AM                   │   |  |  | $1,250     | $1,500    |  ||   |
|             |  |  |  │ Sarah Chen                     │   |  |  +------------------------+  ||   |
|             |  |  |  │ [Applied]                      │   |  |  | -          | Cable Set |  ||   |
|             |  |  |  │ 2 items changed | -$110.00     │   |  |  | -          | 5 units   |  ||   |
|             |  |  |  └────────────────────────────────┘   |  |  | -          | $175      |  ||   |
|             |  |  |        |                              |  |  +------------------------+  ||   |
|             |  |  |        |                              |  |                              ||   |
|             |  |  |  Jan 5, 2026                          |  |  TOTAL IMPACT                ||   |
|             |  |  |  ┌────────────────────────────────┐   |  |  ──────────────────────────  ||   |
|             |  |  |  │ [o] 4:00 PM                    │   |  |  Subtotal: +$425.00          ||   |
|             |  |  |  │ Mike Johnson                   │   |  |  Tax (10%): +$42.50          ||   |
|             |  |  |  │ [Rejected]                     │   |  |  Total: +$467.50             ||   |
|             |  |  |  │ 1 item changed | +$320.00      │   |  |                              ||   |
|             |  |  |  │ Reason: Out of stock           │   |  |  ──────────────────────────  ||   |
|             |  |  |  └────────────────────────────────┘   |  |                              ||   |
|             |  |  |                                       |  |  REASON                      ||   |
|             |  |  |                                       |  |  Customer requested          ||   |
|             |  |  +---------------------------------------+  |  additional items...         ||   |
|             |  |                                             |                              ||   |
|             |  |                                             |  ──────────────────────────  ||   |
|             |  |                                             |                              ||   |
|             |  |                                             |  [ Approve ]  [ Reject ]     ||   |
|             |  |                                             |                              ||   |
|             |  |                                             +------------------------------+|   |
|             |  +------------------------------------------------------------------------------+   |
|             |                                                                                     |
+-------------+-------------------------------------------------------------------------------------+
```

### Request Amendment Dialog (Full Comparison)

```
+===================================================================================================+
|                                                                                                   |
|     +-------------------------------------------------------------------------------------+       |
|     | Request Order Amendment - #ORD-2024-0156                                       [X] |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                                                                     |       |
|     |  +-- ORDER ITEMS (editable) ----------------+  +-- CHANGES PREVIEW ---------------+|       |
|     |  |                                          |  |                                  ||       |
|     |  |  +--------------------------------------+|  |  MODIFIED ITEMS                  ||       |
|     |  |  | Product      | Qty | Price | Remove ||  |  ─────────────────────────────── ||       |
|     |  |  +--------------------------------------+|  |                                  ||       |
|     |  |  | 10kWh LFP Battery System   |[-]12[+]| $125 |      ||  |  10kWh LFP Battery System                      ||       |
|     |  |  | WGT-001      | (was 10)      |      ||  |  Qty: 10 -> 12 (+2 units)        ||       |
|     |  |  +--------------------------------------+|  |  Line: $1,250 -> $1,500          ||       |
|     |  |  | 5kW Hybrid Inverter  |[-]5[+] | $89  |      ||  |  Impact: +$250.00                ||       |
|     |  |  | GDG-002      |        |      |      ||  |                                  ||       |
|     |  |  +--------------------------------------+|  |  ADDED ITEMS                     ||       |
|     |  |  | Battery Cable Kit|[-]20[+]| $12.50|     ||  |  ─────────────────────────────── ||       |
|     |  |  | CON-003      |        |      |      ||  |                                  ||       |
|     |  |  +--------------------------------------+|  |  Cable Set (CBL-010)             ||       |
|     |  |  | Cable Set    |[-]5[+] | $35  | [NEW]||  |  Qty: 5 @ $35.00                 ||       |
|     |  |  | CBL-010      |        |      |      ||  |  Impact: +$175.00                ||       |
|     |  |  +--------------------------------------+|  |                                  ||       |
|     |  |                                          |  |  REMOVED ITEMS                   ||       |
|     |  |  [+ Add Item to Order]                   |  |  ─────────────────────────────── ||       |
|     |  |                                          |  |  (none)                          ||       |
|     |  +------------------------------------------+  |                                  ||       |
|     |                                                |  ═══════════════════════════════ ||       |
|     |  +-- REASON ------------------------------------+                                  ||       |
|     |  |                                             |  ORDER TOTALS                    ||       |
|     |  |  Reason for Amendment *                     |  ─────────────────────────────── ||       |
|     |  |  +----------------------------------------+ |  Before      After     Change   ||       |
|     |  |  | Customer requested additional items    | |  ─────────────────────────────── ||       |
|     |  |  | after site visit. Approved by customer | |  Subtotal:   $3,875    +$425    ||       |
|     |  |  | via email on January 10, 2026.         | |  Tax (10%):  $387.50   +$42.50  ||       |
|     |  |  |                                        | |  ─────────────────────────────── ||       |
|     |  |  +----------------------------------------+ |  TOTAL:      $4,262.50 +$467.50 ||       |
|     |  +---------------------------------------------+                                  ||       |
|     |                                                +----------------------------------+|       |
|     |                                                                                     |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                      ( Cancel )    [ Submit Amendment Request ]     |       |
|     +-------------------------------------------------------------------------------------+       |
|                                                                                                   |
+===================================================================================================+
```

### Approve/Reject Dialog

```
+===================================================================================================+
|                                                                                                   |
|     +-------------------------------------------------------------------------------------+       |
|     | Reject Amendment                                                               [X] |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                                                                     |       |
|     |  You are about to reject the amendment request for Order #ORD-2024-0156.           |       |
|     |                                                                                     |       |
|     |  CHANGES REQUESTED                                                                  |       |
|     |  ─────────────────────────────────────────────────────────────────────────────      |       |
|     |  - 10kWh LFP Battery System: 10 -> 12 units (+$250.00)                                            |       |
|     |  - Add Cable Set x 5 (+$175.00)                                                     |       |
|     |  - Total Impact: +$467.50                                                           |       |
|     |                                                                                     |       |
|     |  ─────────────────────────────────────────────────────────────────────────────      |       |
|     |                                                                                     |       |
|     |  Rejection Reason *                                                                 |       |
|     |  +-------------------------------------------------------------------------------+  |       |
|     |  | Items not available in required timeframe                                     |  |       |
|     |  |                                                                               |  |       |
|     |  +-------------------------------------------------------------------------------+  |       |
|     |                                                                                     |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                           ( Cancel )    [ Confirm Rejection ]       |       |
|     +-------------------------------------------------------------------------------------+       |
|                                                                                                   |
+===================================================================================================+
```

---

## Interaction States

### Loading States

```
AMENDMENT HISTORY LOADING:
+-------------------------------------+
|  AMENDMENTS                         |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  | [shimmer~~~~~~~~]             |  |
|  | [shimmer~~~~~~~~~~~~~~]       |  |
|  +-------------------------------+  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  | [shimmer~~~~~~~~]             |  |
|  +-------------------------------+  |
+-------------------------------------+

SUBMITTING AMENDMENT:
+-------------------------------------+
|                                     |
|  [spinner]                          |
|  Submitting amendment request...    |
|                                     |
+-------------------------------------+

APPLYING AMENDMENT:
+-------------------------------------+
|                                     |
|  [spinner]                          |
|  Applying approved changes...       |
|                                     |
|  Updating order items...            |
|  Recalculating totals...            |
|  [========          ] 60%           |
|                                     |
+-------------------------------------+
```

### Error States

```
AMENDMENT LOAD FAILED:
+-------------------------------------+
|  AMENDMENTS                         |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  |  [!] Failed to load history   |  |
|  |                               |  |
|  |  [Retry]                      |  |
|  +-------------------------------+  |
+-------------------------------------+

SUBMISSION FAILED:
+=========================================+
|  [!] Amendment Request Failed           |
|                                         |
|  Could not submit the amendment         |
|  request. Please try again.             |
|                                         |
|           [Retry]  [Cancel]             |
+=========================================+

APPROVAL FAILED:
+=========================================+
|  [!] Could Not Approve Amendment        |
|                                         |
|  The order may have been modified       |
|  since this amendment was created.      |
|  Please review and try again.           |
|                                         |
|           [Review Order]  [Cancel]      |
+=========================================+

VALIDATION ERROR:
+-------------------------------------+
|  10kWh LFP Battery System                         |
|  New Qty:  [-] | 100 | [+]          |
|  [!] Quantity exceeds available     |
|      stock (45 units available)     |
+-------------------------------------+
```

### Amendment Status States

```
+-- PENDING APPROVAL --------------------+
|  Status: [Pending Approval]            |
|  ───────────────────────────────────   |
|  Awaiting manager review               |
|                                        |
|  Background: amber-50                  |
|  Badge: amber                          |
|                                        |
|  Actions (manager only):               |
|  [Approve]  [Reject]                   |
+----------------------------------------+

+-- APPROVED (Not Applied) --------------+
|  Status: [Approved]                    |
|  ───────────────────────────────────   |
|  Approved by: Jane Manager             |
|  Approved: Jan 10, 2026 4:00 PM        |
|                                        |
|  Background: blue-50                   |
|  Badge: blue                           |
|                                        |
|  Actions:                              |
|  [Apply to Order]                      |
+----------------------------------------+

+-- APPLIED -----------------------------+
|  Status: [Applied]                     |
|  ───────────────────────────────────   |
|  Applied by: System                    |
|  Applied: Jan 10, 2026 4:15 PM         |
|                                        |
|  Background: green-50                  |
|  Badge: green                          |
|                                        |
|  No actions available                  |
+----------------------------------------+

+-- REJECTED ----------------------------+
|  Status: [Rejected]                    |
|  ───────────────────────────────────   |
|  Rejected by: Jane Manager             |
|  Rejected: Jan 5, 2026 5:00 PM         |
|  Reason: Items not available           |
|                                        |
|  Background: red-50                    |
|  Badge: red                            |
|                                        |
|  No actions available                  |
+----------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Amendment History Tab**
   - Request Amendment button
   - Timeline items (chronologically)
   - Each item: View Details, Approve (if manager), Reject (if manager)

2. **Request Amendment Dialog**
   - Step navigation (if stepped)
   - Item quantity controls
   - Add/Remove item buttons
   - Reason textarea
   - Cancel, Submit buttons

3. **Detail/Approve/Reject**
   - Focus trapped in dialog
   - Tab through all interactive elements
   - Escape to close

### ARIA Requirements

```html
<!-- Amendment Timeline -->
<section
  role="region"
  aria-label="Order amendment history"
>
  <h2 id="amendments-heading">Amendments</h2>

  <ol
    role="list"
    aria-labelledby="amendments-heading"
    class="timeline"
  >
    <li
      role="listitem"
      aria-label="Amendment on January 10, 2026, pending approval, impact plus $467.50"
    >
      <!-- Timeline item content -->
    </li>
  </ol>
</section>

<!-- Amendment Status Badge -->
<span
  role="status"
  aria-label="Amendment status: Pending manager approval"
  class="badge-amber"
>
  Pending Approval
</span>

<!-- Diff Table -->
<table
  role="table"
  aria-label="Changes comparison, before and after"
>
  <thead>
    <tr>
      <th scope="col">Before</th>
      <th scope="col">After</th>
      <th scope="col">Change</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="10kWh LFP Battery System: quantity changed from 10 to 12, plus $250">
      <!-- Row content -->
    </tr>
  </tbody>
</table>

<!-- Approval Actions -->
<div role="group" aria-label="Amendment approval actions">
  <button
    aria-label="Approve this amendment and allow changes to be applied"
  >
    Approve
  </button>
  <button
    aria-label="Reject this amendment with a reason"
  >
    Reject
  </button>
</div>

<!-- Request Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="request-dialog-title"
>
  <h2 id="request-dialog-title">Request Order Amendment</h2>
</dialog>

<!-- Step Indicator -->
<nav
  role="navigation"
  aria-label="Amendment request steps"
>
  <ol>
    <li aria-current="step">Step 1: Select Changes</li>
    <li>Step 2: Review Changes</li>
    <li>Step 3: Provide Reason</li>
  </ol>
</nav>
```

### Screen Reader Announcements

- Tab loaded: "3 amendments on this order. 1 pending approval."
- Amendment selected: "Amendment from January 10, pending approval. 2 items changed, total impact plus $467.50."
- Step changed: "Step 2 of 3: Review Changes."
- Change made: "10kWh LFP Battery System quantity changed to 12. Impact: plus $250."
- Request submitted: "Amendment request submitted. Awaiting manager approval."
- Approved: "Amendment approved. Ready to apply."
- Applied: "Amendment applied. Order updated."
- Rejected: "Amendment rejected. Reason: Items not available."

---

## Animation Choreography

### Timeline Entry

```
NEW AMENDMENT ADDED:
- Duration: 400ms
- Easing: ease-out
- Entry: slide down from top
- Other items shift down
- Highlight pulse on new item

SELECTION:
- Duration: 200ms
- Border highlight
- Detail panel slide/fade in
```

### Diff View

```
CHANGES APPEAR:
- Duration: 300ms
- Staggered row fade-in (50ms each)
- Number animations for totals
- Color-coded highlighting fade in

BEFORE/AFTER COMPARISON:
- Duration: 400ms
- Slide transition between states
- Numbers morph (typewriter effect)
```

### Status Transitions

```
PENDING -> APPROVED:
- Duration: 500ms
- Badge color transition (amber -> blue)
- Apply button fade in
- Confetti burst (subtle)

APPROVED -> APPLIED:
- Duration: 600ms
- Badge color transition (blue -> green)
- Checkmark animation
- Action buttons fade out
- Success pulse on timeline item

PENDING -> REJECTED:
- Duration: 400ms
- Badge color transition (amber -> red)
- Shake animation (subtle)
- Actions fade out
```

### Step Navigation

```
NEXT STEP:
- Duration: 300ms
- Current panel slide left
- New panel slide in from right
- Progress bar fill animation

PREVIOUS STEP:
- Duration: 300ms
- Reverse of next step
- Progress bar shrink animation
```

---

## Component Props Interfaces

```typescript
// Amendment History Component
interface AmendmentHistoryProps {
  orderId: string;
  amendments: OrderAmendment[];
  isLoading: boolean;
  error: Error | null;
  selectedAmendmentId?: string;
  onSelectAmendment: (id: string) => void;
  onRequestAmendment: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onApply: (id: string) => Promise<void>;
  canApprove: boolean; // Manager permission
}

// Order Amendment
interface OrderAmendment {
  id: string;
  orderId: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  requestedAt: Date;
  requestedBy: { id: string; name: string };
  approvedAt?: Date;
  approvedBy?: { id: string; name: string };
  rejectedAt?: Date;
  rejectedBy?: { id: string; name: string };
  appliedAt?: Date;
  reason: string;
  rejectionReason?: string;
  changes: AmendmentChanges;
}

// Amendment Changes
interface AmendmentChanges {
  itemChanges: ItemChange[];
  totalsChange: TotalsChange;
}

interface ItemChange {
  orderItemId?: string; // null for new items
  productId: string;
  productName: string;
  sku: string;
  type: 'modified' | 'added' | 'removed';
  oldQty?: number;
  newQty?: number;
  oldPrice?: number;
  newPrice?: number;
  oldLineTotal?: number;
  newLineTotal?: number;
}

interface TotalsChange {
  oldSubtotal: number;
  newSubtotal: number;
  oldTax: number;
  newTax: number;
  oldTotal: number;
  newTotal: number;
  difference: number;
}

// Request Amendment Dialog
interface RequestAmendmentDialogProps {
  open: boolean;
  order: OrderWithItems;
  onClose: () => void;
  onSubmit: (amendment: AmendmentRequest) => Promise<void>;
  isSubmitting: boolean;
}

// Amendment Request Input
interface AmendmentRequest {
  orderId: string;
  reason: string;
  itemChanges: {
    orderItemId?: string;
    productId: string;
    newQty: number;
    newPrice?: number;
    action: 'modify' | 'add' | 'remove';
  }[];
}

// Amendment Detail View
interface AmendmentDetailProps {
  amendment: OrderAmendment;
  onApprove?: () => void;
  onReject?: () => void;
  onApply?: () => void;
  canApprove: boolean;
  isProcessing: boolean;
}

// Diff View Component
interface AmendmentDiffViewProps {
  changes: AmendmentChanges;
  variant: 'compact' | 'full';
}

// Status Badge
interface AmendmentStatusBadgeProps {
  status: OrderAmendment['status'];
  size?: 'sm' | 'md';
}

// Approval/Rejection Dialog
interface ApprovalDialogProps {
  open: boolean;
  amendment: OrderAmendment;
  action: 'approve' | 'reject';
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  isSubmitting: boolean;
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/domain/orders/amendment-history.tsx` | Timeline display component |
| `src/components/domain/orders/request-amendment-dialog.tsx` | Request dialog with steps |
| `src/components/domain/orders/amendment-diff-view.tsx` | Before/after comparison |
| `src/components/domain/orders/amendment-detail.tsx` | Detail view with actions |
| `src/components/domain/orders/amendment-status-badge.tsx` | Status indicator |
| `src/components/domain/orders/approval-dialog.tsx` | Approve/reject confirmation |
| `src/components/domain/orders/order-panel.tsx` | Add amendments tab |

---

## Related Wireframes

- [DOM-ORD-001c: Shipment Tracking UI](./DOM-ORD-001c.wireframe.md)
- [DOM-ORD-005c: Order Templates UI](./DOM-ORD-005c.wireframe.md)
- [DOM-ORD-007: Fulfillment Dashboard](./DOM-ORD-007.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
