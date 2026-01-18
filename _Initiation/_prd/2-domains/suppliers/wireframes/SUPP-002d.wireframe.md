# Wireframe: DOM-SUPP-002d - PO Approval Workflow UI

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-002d
> **Story Name**: PO Approval Workflow: UI
> **Type**: UI Component
> **Component Type**: DetailPanel with ActionBar
> **Last Updated**: 2026-01-10

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | suppliers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-SUPP-002d | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/suppliers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## UI Patterns (Reference Implementation)

### Primary Patterns

| UI Element | Pattern | Reference |
|------------|---------|-----------|
| **Action Buttons** | Button + Dialog | `_reference/.reui-reference/registry/default/ui/button.tsx`<br>`_reference/.reui-reference/registry/default/ui/dialog.tsx` |
| **Approval Actions** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |
| **Status Badge** | Badge Component | `_reference/.reui-reference/registry/default/ui/badge.tsx` |
| **Timeline/History** | Accordion Menu | `_reference/.reui-reference/registry/default/ui/accordion-menu.tsx` |
| **Form Inputs** | Base Form (TanStack) | `_reference/.reui-reference/registry/default/ui/base-form-tanstack.tsx` |
| **Dropdown Select** | Base Select | `_reference/.reui-reference/registry/default/ui/base-select.tsx` |

### Midday Reference Examples

| Feature | Midday Example |
|---------|----------------|
| **Settings Management** | `_reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/page.tsx` |
| **Approval-like Workflow** | OAuth authorize pattern:<br>`_reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/oauth/authorize/page.tsx` |
| **Action Toasts** | `_reference/.midday-reference/apps/dashboard/src/components/animated-status.tsx` |

### Pattern Details

**Dialog Pattern (Approval/Reject)**
```typescript
// Reference: base-dialog.tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Approve Purchase Order?</DialogTitle>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline" onClick={cancel}>Cancel</Button>
      <Button variant="default" onClick={confirm}>Approve</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Badge Pattern (Status)**
```typescript
// Reference: badge.tsx
<Badge variant={status === 'pending' ? 'warning' : 'default'}>
  {status}
</Badge>
```

**Timeline Pattern (History)**
```typescript
// Reference: accordion-menu.tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Amendment #1</AccordionTrigger>
    <AccordionContent>
      {/* Event details */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## Overview

This wireframe covers the UI components for the PO approval workflow including:
- Submit for Approval button on draft POs
- Approve/Reject actions on pending approval POs
- Approval history section on PO detail
- Approval rules configuration in settings

---

## Mobile Wireframe (375px)

### Submit for Approval (Draft PO)

```
+=========================================+
| < Purchase Orders                [...]  |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |        PO-2024-0150               |  |
|  |                                   |  |
|  |    [Draft]                        |  | <- Gray badge
|  |                                   |  |
|  |    Gamma Electric                 |  |
|  |    Total: $8,500.00               |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |    [SUBMIT FOR APPROVAL]          |  | <- Primary action (56px)
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [Edit Order]  [Send Direct] [...]  |  | <- Secondary actions
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  [!] APPROVAL REQUIRED                  | <- Info banner
|  Orders over $5,000 require approval    |
|  by a manager before sending.           |
|                                         |
+-----------------------------------------+
```

### Submit Confirmation Dialog

```
+=========================================+
| ================================        |
|                                         |
| Submit for Approval?              [X]   |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |  PO-2024-0150                     |  |
|  |  Gamma Electric                   |  |
|  |  Total: $8,500.00                 |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  This order will be sent to:            |
|  +-----------------------------------+  |
|  | John Smith (Operations Manager)   |  |
|  | Based on: Value > $5,000          |  |
|  +-----------------------------------+  |
|                                         |
|  Add Note (optional)                    |
|  +-----------------------------------+  |
|  |                                   |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)            [Submit for         |
|                       Approval]         |
|                                         |
+=========================================+
```

### Pending Approval View (Approver)

```
+=========================================+
| < Purchase Orders                [...]  |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |        PO-2024-0150               |  |
|  |                                   |  |
|  |    [Pending Approval]             |  | <- Orange badge
|  |                                   |  |
|  |    Gamma Electric                 |  |
|  |    Total: $8,500.00               |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [!] AWAITING YOUR APPROVAL        |  | <- Alert banner
|  | Submitted by Mike Johnson         |  |
|  | Jan 10, 2026 at 2:30 PM           |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |    [APPROVE ORDER]                |  | <- Green primary (56px)
|  |                                   |  |
|  +-----------------------------------+  |
|  +-----------------------------------+  |
|  |                                   |  |
|  |    (REJECT ORDER)                 |  | <- Red secondary
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  SUBMITTER'S NOTE:                      |
|  "Urgent order for the Johnson          |
|  project. Need materials by Jan 18."    |
|                                         |
+-----------------------------------------+
| [Details] [Items] [Approval]            |
+-----------------------------------------+
```

### Approve Dialog

```
+=========================================+
| ================================        |
|                                         |
| Approve Purchase Order?           [X]   |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |  PO-2024-0150                     |  |
|  |  Gamma Electric                   |  |
|  |  Total: $8,500.00                 |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  Once approved, this order will be      |
|  ready to send to the supplier.         |
|                                         |
|  Add Comment (optional)                 |
|  +-----------------------------------+  |
|  |                                   |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)                  [Approve]     |
|                                         |
+=========================================+
```

### Reject Dialog

```
+=========================================+
| ================================        |
|                                         |
| Reject Purchase Order?            [X]   |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |  PO-2024-0150                     |  |
|  |  Gamma Electric                   |  |
|  |  Total: $8,500.00                 |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  [!] The order will be returned to      |
|  draft status for revision.             |
|                                         |
|  Reason for Rejection *                 |
|  +-----------------------------------+  |
|  | Select a reason...             v  |  |
|  +-----------------------------------+  |
|    ( ) Price too high                   |
|    ( ) Incorrect items                  |
|    ( ) Wrong supplier                   |
|    ( ) Needs budget approval            |
|    ( ) Other                            |
|                                         |
|  Additional Comments *                  |
|  +-----------------------------------+  |
|  |                                   |  |
|  | Please explain the rejection...  |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)                   [Reject]     |
|                                         |
+=========================================+
```

### Approval History Tab

```
+=========================================+
| [Details] [Items] [Approval]            |
|                           =========     |
+-----------------------------------------+
|                                         |
|  APPROVAL HISTORY                       |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | [check] APPROVED                  |  | <- Green icon
|  | John Smith                        |  |
|  | Jan 10, 2026 at 3:45 PM           |  |
|  | ---                               |  |
|  | "Approved. Proceed with order."   |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [arrow] SUBMITTED                 |  | <- Blue icon
|  | Mike Johnson                      |  |
|  | Jan 10, 2026 at 2:30 PM           |  |
|  | ---                               |  |
|  | "Urgent for Johnson project."     |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  APPROVAL RULE MATCHED                  |
|  +-----------------------------------+  |
|  | Rule: Value > $5,000              |  |
|  | Approver Role: Operations Manager |  |
|  | Threshold: $5,000 - $50,000       |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Pending Approval Action Bar

```
+================================================================+
| < Purchase Orders                                               |
+----------------------------------------------------------------+
|                                                                 |
| +-- ORDER HEADER -----------------------------------------------+
| |                                                               |
| |  PO-2024-0150                        [Pending Approval]       |
| |  Gamma Electric                                               |
| |  Total: $8,500.00  |  Submitted: Jan 10  |  By: Mike Johnson  |
| |                                                               |
| |  +-----------------------------------------------------+      |
| |  | [!] This order requires your approval                |     |
| |  +-----------------------------------------------------+      |
| |                                                               |
| |  +--------------------+ +--------------------+                 |
| |  |                    | |                    |                 |
| |  |  [APPROVE ORDER]   | |  (REJECT ORDER)    |                 |
| |  |                    | |                    |                 |
| |  +--------------------+ +--------------------+                 |
| |                                                               |
| +---------------------------------------------------------------+
|                                                                 |
| [Details] [Items (6)] [Approval History]                        |
| =========                                                       |
+----------------------------------------------------------------+
```

### Approval History Section

```
+================================================================+
| [Details] [Items (6)] [Approval History]                        |
|                       ==================                        |
+----------------------------------------------------------------+
|                                                                 |
| +-- APPROVAL TIMELINE -----------------------------------------+|
| |                                                               ||
| |  +-- CURRENT STATUS --------------------------------------+  ||
| |  |                                                        |  ||
| |  |  [clock] AWAITING APPROVAL                             |  ||
| |  |  Pending since Jan 10, 2026                            |  ||
| |  |                                                        |  ||
| |  +--------------------------------------------------------+  ||
| |                                                               ||
| |  |                                                            ||
| |  v                                                            ||
| |                                                               ||
| |  +-- SUBMITTED -------------------------------------------+  ||
| |  |                                                        |  ||
| |  |  [arrow-up] Submitted for Approval                     |  ||
| |  |  Mike Johnson  |  Jan 10, 2026 at 2:30 PM              |  ||
| |  |                                                        |  ||
| |  |  Note: "Urgent for Johnson project. Need materials     |  ||
| |  |  by Jan 18 to meet installation deadline."             |  ||
| |  |                                                        |  ||
| |  +--------------------------------------------------------+  ||
| |                                                               ||
| +---------------------------------------------------------------+|
|                                                                 |
| +-- APPROVAL RULE APPLIED -------------------------------------+|
| |                                                               ||
| |  Rule Name: Standard PO Approval                              ||
| |  Condition: Order value between $5,000 and $50,000            ||
| |  Approver: Operations Manager role                            ||
| |  Current Approvers: John Smith, Sarah Kim                     ||
| |                                                               ||
| +---------------------------------------------------------------+|
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Approval Action Bar (In Header)

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Orders                                                               |
| ----------- |                                                                                |
| Procurement | +-- ORDER HEADER ----------------------------------------------------------+   |
|   Dashboard |  |                                                                          |   |
|   Suppliers |  |  PO-2024-0150                                   [Pending Approval]       |   |
|   Orders <- |  |  =======================================================================  |   |
| Catalog     |  |                                                                          |   |
| Jobs        |  |  Supplier: Gamma Electric          Submitted by: Mike Johnson            |   |
| Pipeline    |  |  Total: $8,500.00                  Submitted: Jan 10, 2026 2:30 PM       |   |
| Support     |  |                                                                          |   |
|             |  |  +-------------------------------------------------------------------+   |   |
|             |  |  | [!] This purchase order requires your approval before it can    |   |   |
|             |  |  |     be sent to the supplier.                                     |   |   |
|             |  |  +-------------------------------------------------------------------+   |   |
|             |  |                                                                          |   |
|             |  |  +----------------+ +----------------+ +----------+ +----------+         |   |
|             |  |  |                | |                | |          | |          |         |   |
|             |  |  | [APPROVE      ]| | [REJECT       ]| | [View   ]| | [Print  ]|         |   |
|             |  |  | [ORDER       ]| | [ORDER        ]| | [Items  ]| | [       ]|         |   |
|             |  |  +----------------+ +----------------+ +----------+ +----------+         |   |
|             |  |                                                                          |   |
|             | +--------------------------------------------------------------------------+   |
```

### Approval History Panel

```
+-- APPROVAL HISTORY TAB CONTENT --------------------------------------------------+
|                                                                                   |
| +-- APPROVAL TIMELINE -----------------------+ +-- RULE DETAILS ----------------+|
| |                                            | |                                ||
| |  +-- CURRENT STATUS --------------------+  | | APPROVAL RULE APPLIED          ||
| |  |                                      |  | | -------------------------      ||
| |  |  [clock] AWAITING APPROVAL           |  | |                                ||
| |  |  Pending since Jan 10, 2026          |  | | Rule: Standard PO Approval     ||
| |  |  SLA: 24 hours  |  Remaining: 18h    |  | |                                ||
| |  |                                      |  | | Condition:                     ||
| |  +--------------------------------------+  | | Order value $5,000 - $50,000   ||
| |                                            | |                                ||
| |  |                                         | | Approver Role:                 ||
| |  v                                         | | Operations Manager             ||
| |                                            | |                                ||
| |  +-- SUBMISSION -------------------------+ | | Approvers:                     ||
| |  |                                       | | | - John Smith                   ||
| |  |  [arrow-up] Submitted for Approval    | | | - Sarah Kim                    ||
| |  |  Mike Johnson (Procurement Specialist)| | |                                ||
| |  |  Jan 10, 2026 at 2:30 PM              | | | Auto-escalation:               ||
| |  |                                       | | | After 24h -> Director          ||
| |  |  Note:                                | | |                                ||
| |  |  "Urgent for Johnson project. Need    | | +--------------------------------+|
| |  |  materials by Jan 18 to meet          | |                                  |
| |  |  installation deadline."              | |                                  |
| |  |                                       | |                                  |
| |  +---------------------------------------+ |                                  |
| |                                            |                                  |
| +--------------------------------------------+                                  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Settings: Approval Rules Configuration

### Mobile

```
+=========================================+
| < Settings                              |
+-----------------------------------------+
| PO Approval Rules                       |
| Configure approval thresholds           |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| |                                     | |
| |   [+ ADD RULE]                      | |
| |                                     | |
| +-------------------------------------+ |
|                                         |
| -----------------------------------     |
|                                         |
| +-------------------------------------+ |
| | Standard PO Approval                | |
| | $5,000 - $50,000                    | |
| | Approver: Operations Manager        | |
| | Active: ON                          | |
| |                    [Edit] [Delete]  | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | Large PO Approval                   | |
| | $50,000+                            | |
| | Approver: Director                  | |
| | Active: ON                          | |
| |                    [Edit] [Delete]  | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | Emergency Approval                  | |
| | Any value                           | |
| | Approver: CEO                       | |
| | Active: OFF                         | |
| |                    [Edit] [Delete]  | |
| +-------------------------------------+ |
|                                         |
+=========================================+
```

### Add/Edit Rule Dialog

```
+=========================================+
| ================================        |
|                                         |
| Add Approval Rule                 [X]   |
+-----------------------------------------+
|                                         |
|  Rule Name *                            |
|  +-----------------------------------+  |
|  | Standard PO Approval              |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  ORDER VALUE RANGE                      |
|                                         |
|  Minimum Amount *                       |
|  +-----------------------------------+  |
|  | $ 5,000.00                        |  |
|  +-----------------------------------+  |
|                                         |
|  Maximum Amount                         |
|  +-----------------------------------+  |
|  | $ 50,000.00                       |  |
|  +-----------------------------------+  |
|  (Leave blank for no upper limit)       |
|                                         |
|  -----------------------------------    |
|                                         |
|  APPROVER SETTINGS                      |
|                                         |
|  Approver Role *                        |
|  +-----------------------------------+  |
|  | Operations Manager             v  |  |
|  +-----------------------------------+  |
|                                         |
|  [ ] Require all approvers              |
|  [x] Any approver can approve           |
|                                         |
|  Auto-escalation (hours)                |
|  +-----------------------------------+  |
|  | 24                                |  |
|  +-----------------------------------+  |
|                                         |
|  Escalation Role                        |
|  +-----------------------------------+  |
|  | Director                       v  |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  [x] Rule is active                     |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)                  [Save Rule]   |
|                                         |
+=========================================+
```

---

## Desktop Settings View

```
+==============================================================================================+
| [Logo] Renoz CRM                                                            [Bell] [User]    |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | Settings > PO Approval Rules                                                   |
| ----------- |                                                                                |
| Settings    | Configure when purchase orders require approval                                |
|   General   | -----------------------------------------------------------------------------------
|   Users     |                                                                                |
|   Roles     | [+ Add Approval Rule]                                                          |
|   Approvals |                                                                                |
|   ...       | +------------------------------------------------------------------------------+
|             | |                                                                              |
|             | |  Rule Name          | Value Range         | Approver           | Status    |
|             | |  -------------------------------------------------------------------------   |
|             | |  Standard PO        | $5,000 - $50,000    | Operations Manager | Active    |
|             | |  Large PO           | $50,000+            | Director           | Active    |
|             | |  Emergency          | Any                 | CEO                | Inactive  |
|             | |                                                                              |
|             | +------------------------------------------------------------------------------+
|             |                                                                                |
|             | +-- RULE DETAILS (Selected) -------------------------------------------------+
|             | |                                                                             |
|             | |  Standard PO Approval                                          [Edit]     |
|             | |  ------------------------------------------------------------------------- |
|             | |                                                                             |
|             | |  Condition: Order value between $5,000.00 and $50,000.00                   |
|             | |  Approver Role: Operations Manager                                         |
|             | |  Approval Mode: Any single approver                                        |
|             | |  Auto-escalation: After 24 hours to Director                               |
|             | |                                                                             |
|             | |  Current Approvers with this role:                                         |
|             | |  - John Smith (john@company.com)                                           |
|             | |  - Sarah Kim (sarah@company.com)                                           |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

---

## Loading States

### Submitting for Approval

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |   [spinner] Submitting...         |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
  Button disabled, spinner in button
  aria-busy="true"
```

### Approval Action Processing

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |   [spinner] Approving order...    |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  Both buttons disabled during action    |
|                                         |
+=========================================+
```

### Approval History Loading

```
+=========================================+
| [Details] [Items] [Approval]            |
|                           =========     |
+-----------------------------------------+
|                                         |
|  APPROVAL HISTORY                       |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer===================]      |  |
|  | [shimmer=========]                |  |
|  | [shimmer===============]          |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer===================]      |  |
|  | [shimmer=========]                |  |
|  | [shimmer===============]          |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Empty States

### No Approval History

```
+=========================================+
|                                         |
|  APPROVAL HISTORY                       |
|  -----------------------------------    |
|                                         |
|           +-------------+               |
|           | [clipboard] |               |
|           +-------------+               |
|                                         |
|        NO APPROVAL HISTORY              |
|                                         |
|   This order has not been submitted     |
|   for approval yet.                     |
|                                         |
+=========================================+
```

### No Approval Rules Configured

```
+=========================================+
|                                         |
|           +-------------+               |
|           |   [rules]   |               |
|           +-------------+               |
|                                         |
|     NO APPROVAL RULES CONFIGURED        |
|                                         |
|   Set up approval rules to require      |
|   manager sign-off on purchase orders   |
|   above certain amounts.                |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+ ADD FIRST RULE]        |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

---

## Error States

### Submission Failed

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Failed to Submit              |  |
|  |                                   |  |
|  | Could not submit order for        |  |
|  | approval. Please try again.       |  |
|  |                                   |  |
|  |           [Retry]                 |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Approval Action Failed

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Approval Failed               |  |
|  |                                   |  |
|  | Could not approve this order.     |  |
|  | Error: User lacks permission.     |  |
|  |                                   |  |
|  |    [Dismiss]   [Contact Admin]    |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Success States

### Order Submitted

```
+=========================================+
|                                         |
|  [check] Order Submitted for Approval   |
|                                         |
|  John Smith has been notified and       |
|  will review your order shortly.        |
|                                         |
|                            (3s auto-dismiss)
+=========================================+
  Toast notification, green accent
```

### Order Approved

```
+=========================================+
|                                         |
|  [check] Order Approved!                |
|                                         |
|  PO-2024-0150 is now ready to           |
|  send to the supplier.                  |
|                                         |
|           [Send Now]  (Dismiss)         |
|                                         |
+=========================================+
  Toast with action button
```

### Order Rejected

```
+=========================================+
|                                         |
|  [x] Order Rejected                     |
|                                         |
|  PO-2024-0150 has been returned to      |
|  draft status. The submitter has been   |
|  notified.                              |
|                                         |
+=========================================+
  Toast notification, red accent
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<!-- Submit for Approval Button -->
<button
  aria-label="Submit purchase order for approval"
  aria-describedby="approval-info"
>
  Submit for Approval
</button>
<p id="approval-info">
  Orders over $5,000 require manager approval
</p>

<!-- Pending Approval Banner -->
<div role="alert" aria-live="polite">
  This purchase order requires your approval before it can be sent
</div>

<!-- Approval Actions -->
<div role="group" aria-label="Approval actions">
  <button aria-label="Approve this purchase order">
    Approve Order
  </button>
  <button aria-label="Reject this purchase order">
    Reject Order
  </button>
</div>

<!-- Approval History -->
<section role="region" aria-label="Approval history">
  <h2>Approval History</h2>
  <ol role="list" aria-label="Approval timeline">
    <li aria-label="Approved by John Smith on January 10">
      <!-- Event details -->
    </li>
  </ol>
</section>

<!-- Approval Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Approve Purchase Order?</h2>
  <p id="dialog-desc">
    This will approve PO-2024-0150 for $8,500
  </p>
</div>
```

### Keyboard Navigation

```
Tab Order (PO Detail with Pending Approval):
1. Back button
2. Approve Order button (primary focus)
3. Reject Order button
4. Tab navigation (Details, Items, Approval)
5. Tab panel content

Dialog Tab Order:
1. Close button (X)
2. Form fields (comment, reason select)
3. Cancel button
4. Confirm button (Approve/Reject)

Focus Trap:
- Focus trapped within dialog when open
- Escape closes dialog
- Focus returns to trigger button on close
```

### Screen Reader Announcements

```
On page load with pending approval:
  "Purchase order PO-2024-0150 pending approval.
   Submitted by Mike Johnson for $8,500.
   You can approve or reject this order."

On approve action:
  "Approving purchase order..."
  (after success)
  "Purchase order approved. Now ready to send to supplier."

On reject action:
  "Rejecting purchase order..."
  (after success)
  "Purchase order rejected. Returned to draft status."

On approval history focus:
  "Approval history. 2 events.
   Most recent: Approved by John Smith on January 10."
```

---

## Animation Choreography

### Action Buttons

```
BUTTON HOVER:
- Duration: 150ms
- Transform: Scale 1.02
- Shadow: Increase

BUTTON PRESS:
- Duration: 100ms
- Transform: Scale 0.98
- Return: 150ms

LOADING STATE:
- Button text: Fade out (100ms)
- Spinner: Fade in (100ms)
- Duration: Until complete
```

### Dialog Transitions

```
DIALOG OPEN:
- Backdrop: Fade in (150ms)
- Dialog: Scale 0.95 -> 1 + fade in (200ms)
- Content: Stagger fade (200-400ms)

DIALOG CLOSE:
- Content: Fade out (100ms)
- Dialog: Scale 1 -> 0.95 + fade out (150ms)
- Backdrop: Fade out (150ms)
```

### Success Feedback

```
APPROVAL SUCCESS:
- Button: Flash green (200ms)
- Status badge: Morph to new status (300ms)
- Toast: Slide up from bottom (200ms)
- Confetti (optional): 500ms burst
```

### Timeline Animation

```
HISTORY LOAD:
- Timeline connector: Draw in (300ms)
- Events: Stagger fade in (100ms between)
- Icons: Scale in (200ms each)
```

---

## Component Props Interface

```typescript
// ApprovalActionBar.tsx
interface ApprovalActionBarProps {
  order: {
    id: string;
    poNumber: string;
    status: POStatus;
    totalValue: number;
    supplier: { name: string };
    submittedBy?: { name: string; date: Date };
    submitterNote?: string;
  };
  canApprove: boolean;
  canSubmit: boolean;
  onSubmitForApproval: () => Promise<void>;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (reason: string, comment: string) => Promise<void>;
}

// ApprovalSubmitDialog.tsx
interface ApprovalSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    poNumber: string;
    supplier: { name: string };
    totalValue: number;
  };
  approvalRule: {
    name: string;
    approverRole: string;
    approvers: Array<{ name: string }>;
  } | null;
  onSubmit: (note?: string) => Promise<void>;
  isSubmitting: boolean;
}

// ApprovalConfirmDialog.tsx
interface ApprovalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject';
  order: {
    poNumber: string;
    supplier: { name: string };
    totalValue: number;
  };
  onConfirm: (data: ApprovalData) => Promise<void>;
  isProcessing: boolean;
}

interface ApprovalData {
  comment?: string;
  reason?: string; // Required for reject
}

// ApprovalHistory.tsx
interface ApprovalHistoryProps {
  events: Array<{
    id: string;
    type: 'submitted' | 'approved' | 'rejected' | 'escalated';
    user: { name: string; role: string };
    date: Date;
    note?: string;
    reason?: string;
  }>;
  currentStatus: POStatus;
  appliedRule?: {
    name: string;
    condition: string;
    approverRole: string;
    approvers: Array<{ name: string; email: string }>;
    escalationHours?: number;
    escalationRole?: string;
  };
  isLoading?: boolean;
}

// ApprovalRulesSettings.tsx
interface ApprovalRulesSettingsProps {
  rules: Array<{
    id: string;
    name: string;
    minAmount: number;
    maxAmount: number | null;
    approverRole: string;
    requireAll: boolean;
    escalationHours: number | null;
    escalationRole: string | null;
    isActive: boolean;
  }>;
  onAddRule: (rule: ApprovalRuleInput) => Promise<void>;
  onEditRule: (id: string, rule: ApprovalRuleInput) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
}

// ApprovalRuleDialog.tsx
interface ApprovalRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: ApprovalRuleInput;
  availableRoles: Array<{ id: string; name: string }>;
  onSave: (rule: ApprovalRuleInput) => Promise<void>;
  isSaving: boolean;
}

interface ApprovalRuleInput {
  name: string;
  minAmount: number;
  maxAmount: number | null;
  approverRole: string;
  requireAll: boolean;
  escalationHours: number | null;
  escalationRole: string | null;
  isActive: boolean;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/purchase-orders/$poId.tsx` | Modify | Add approval actions |
| `src/components/domain/procurement/approval-actions.tsx` | Create | Action bar component |
| `src/components/domain/procurement/approval-submit-dialog.tsx` | Create | Submit dialog |
| `src/components/domain/procurement/approval-confirm-dialog.tsx` | Create | Approve/reject dialog |
| `src/components/domain/procurement/approval-history.tsx` | Create | History timeline |
| `src/routes/_authed/settings/po-approval-rules.tsx` | Create | Settings page |
| `src/components/domain/procurement/approval-rule-dialog.tsx` | Create | Rule editor |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Action response | < 100ms | Visual feedback |
| Submit/Approve API | < 2s | Complete operation |
| Dialog open | < 150ms | Fully visible |
| History load | < 500ms | Events rendered |
| Toast display | < 100ms | After action |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
