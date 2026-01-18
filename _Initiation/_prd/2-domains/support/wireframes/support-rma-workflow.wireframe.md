# Support RMA Workflow Wireframe

**Story IDs:** DOM-SUP-003a, DOM-SUP-003b, DOM-SUP-003c
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## UI Patterns (Reference Implementation)

### RMA Workflow Stepper
- **Pattern**: RE-UI Progress (Stepper)
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Multi-step workflow visualization (Requested → Approved → Received → Processed)
  - Current step highlighting with completion indicators
  - Step timestamps and status transitions
  - Horizontal and vertical layout support for responsive design

### RMA Status Badges
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded status indicators (gray/orange/blue/green/red)
  - Icon integration for visual status recognition
  - Compact badge variant for list views
  - Descriptive badge variant for detail views

### Item Selection Table
- **Pattern**: RE-UI Checkbox with Table
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Multi-select item checkboxes for return authorization
  - Quantity selectors for partial returns
  - Order item details with SKU, product name, pricing
  - Already-returned quantity tracking and validation

### Inspection Form
- **Pattern**: RE-UI Radio Group
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Condition selection (Good/Damaged as described/Damaged in transit/Missing)
  - Customer preference options (Refund/Replacement/Store Credit)
  - Shipping method selection with descriptive labels
  - Grouped form fields with validation feedback

### RMA Detail Cards
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - RMA header with number and status
  - Return items summary with metrics
  - RMA details and description display
  - Action buttons contextual to current status

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `rmas` table | NOT CREATED |
| **Server Functions Required** | RMA creation, status workflow, inspection logging | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-003a, DOM-SUP-003b | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Support Types**: Warranty claims, service requests, product questions
- **Priority**: low, normal, high, urgent

---

## Overview

Return Merchandise Authorization (RMA) provides a structured workflow for handling product returns. This wireframe covers:
- RMA creation from issue detail
- RMA number generation and display
- Status workflow (requested -> approved -> received -> processed)
- Item selection from linked orders
- Receipt inspection logging

---

## Desktop View (1280px+)

### Issue Detail - Create RMA Button

```
+================================================================================+
| < Back to Issues                                                                |
+================================================================================+
| +----------------------------------------------------------------------------+ |
| | ISS-1250: Customer wants to return defective countertops                   | |
| |     Customer: Granite Plus Inc  |  Type: Return  |  Priority: Medium       | |
| |     Assignee: Sarah K.          |  Status: Open  |  Created: Jan 10        | |
| |                                                                            | |
| |     [ Edit ]  [ Assign ]  [ Status v ]  [ Create RMA ]  [ Actions v ]      | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
|                                                                                 |
| +-- LINKED ORDER -------------------------------------------------------------+ |
| |                                                                             | |
| |  Order: ORD-5678 - Kitchen Renovation Materials                             | |
| |  Date: Dec 15, 2025  |  Total: $4,500  |  Status: Delivered                 | |
| |                                                                             | |
| |  +-----------------------------------------------------------------------+  | |
| |  | SKU        | Product                 | Qty | Unit Price | Total       |  | |
| |  +------------+-------------------------+-----+------------+-------------+  | |
| |  | CTR-001    | Granite Countertop 8ft  | 2   | $800       | $1,600      |  | |
| |  | CTR-002    | Granite Countertop 4ft  | 1   | $450       | $450        |  | |
| |  | SEAL-100   | Countertop Sealant      | 3   | $25        | $75         |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- EXISTING RMAs ------------------------------------------------------------+ |
| |                                                                             | |
| |  No RMAs created for this issue.                                            | |
| |                                                                             | |
| |  [ + Create RMA ]                                                           | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

### Create RMA Dialog

```
+================================================================+
| Create Return Authorization                               [X]  |
+================================================================+
|                                                                |
|  Issue: ISS-1250 - Customer wants to return defective...       |
|  Order: ORD-5678 - Kitchen Renovation Materials                |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  SELECT ITEMS TO RETURN                                        |
|                                                                |
|  +----------------------------------------------------------+  |
|  | [ ] | SKU      | Product              | Qty  | Return    |  |
|  +-----+----------+----------------------+------+-----------+  |
|  | [x] | CTR-001  | Granite Countertop   | 2    | [1 v] [2] |  |
|  |     |          | 8ft                  |      |           |  |
|  +-----+----------+----------------------+------+-----------+  |
|  | [x] | CTR-002  | Granite Countertop   | 1    | [1 v]     |  |
|  |     |          | 4ft                  |      |           |  |
|  +-----+----------+----------------------+------+-----------+  |
|  | [ ] | SEAL-100 | Countertop Sealant   | 3    | [  v]     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Return Reason *                                               |
|  +---------------------------------------------- v-----------+  |
|  | Defective/Damaged                                         |  |
|  +----------------------------------------------------------+  |
|    Options: Defective/Damaged, Wrong Item, Not as Described,   |
|             Changed Mind, Duplicate Order, Other               |
|                                                                |
|  Detailed Description *                                        |
|  +----------------------------------------------------------+  |
|  | Countertops arrived with visible cracks and chips. The   |  |
|  | customer noticed damage after unpacking. Photos attached |  |
|  | to issue.                                                 |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Customer Preference                                           |
|  +----------------------------------------------------------+  |
|  | ( ) Refund                                                |  |
|  | (o) Replacement                                           |  |
|  | ( ) Store Credit                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Shipping Instructions                                         |
|  +----------------------------------------------------------+  |
|  | ( ) Customer ships to warehouse                           |  |
|  | (o) Schedule pickup                                       |  |
|  | ( ) On-site inspection only (no physical return)          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Internal Notes (not visible to customer)                      |
|  +----------------------------------------------------------+  |
|  |                                                           |  |
|  +----------------------------------------------------------+  |
|                                                                |
|                          ( Cancel )  [ Create RMA ]            |
+================================================================+
  Minimum 1 item must be selected
  aria-labelledby="create-rma-title"
```

### RMA Detail View

```
+================================================================================+
| < Back to Issue                                                                 |
+================================================================================+
| +----------------------------------------------------------------------------+ |
| | RMA-000042                                              Status: APPROVED   | |
| |                                                                            | |
| | Created: Jan 10, 2026  |  Issue: ISS-1250  |  Order: ORD-5678              | |
| | Customer: Granite Plus Inc                                                 | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
|                                                                                 |
| +== RMA WORKFLOW STATUS ======================================================+ |
| |                                                                             | |
| |  [*] Requested  -->  [*] Approved  -->  [ ] Received  -->  [ ] Processed   | |
| |      Jan 10           Jan 10 2PM         Pending            Pending        | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- RETURN ITEMS -------------------------------------------------------------+ |
| |                                                                             | |
| |  +-----------------------------------------------------------------------+  | |
| |  | SKU      | Product                | Return Qty | Status    | Action  |  | |
| |  +----------+------------------------+------------+-----------+---------+  | |
| |  | CTR-001  | Granite Countertop 8ft | 1 of 2     | Approved  | [...]   |  | |
| |  | CTR-002  | Granite Countertop 4ft | 1 of 1     | Approved  | [...]   |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| |  Total Items: 2  |  Estimated Value: $1,250                                 | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- RMA DETAILS --------------------------------------------------------------+ |
| |                                                                             | |
| |  Return Reason: Defective/Damaged                                           | |
| |  Customer Preference: Replacement                                           | |
| |  Shipping Method: Schedule pickup                                           | |
| |                                                                             | |
| |  Description:                                                               | |
| |  Countertops arrived with visible cracks and chips. The customer noticed    | |
| |  damage after unpacking. Photos attached to issue.                          | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ACTIONS ------------------------------------------------------------------+ |
| |                                                                             | |
| |  Current Status: APPROVED                                                   | |
| |                                                                             | |
| |  [ Mark as Received ]    <- Next step in workflow                           | |
| |                                                                             | |
| |  ( Reject RMA )   ( Cancel RMA )                                            | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- RMA HISTORY --------------------------------------------------------------+ |
| |                                                                             | |
| |  Jan 10, 2026, 2:30 PM - Sarah K.                                           | |
| |  RMA approved. Scheduled pickup for Jan 12.                                 | |
| |                                                                             | |
| |  Jan 10, 2026, 10:15 AM - Sarah K.                                          | |
| |  RMA created from issue ISS-1250.                                           | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

### Mark as Received Dialog (With Inspection)

```
+================================================================+
| Mark RMA as Received                                      [X]  |
+================================================================+
|                                                                |
|  RMA-000042 has arrived at the warehouse.                      |
|  Please complete the inspection for each item.                 |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  ITEM INSPECTION                                               |
|                                                                |
|  +== CTR-001: Granite Countertop 8ft (1 unit) ================+|
|  |                                                            ||
|  |  Condition on Receipt *                                    ||
|  |  +------------------------------------------------------+  ||
|  |  | ( ) Good - Item as described                         |  ||
|  |  | (o) Damaged - Matches return reason                  |  ||
|  |  | ( ) Damaged - Additional damage in transit           |  ||
|  |  | ( ) Missing/Wrong Item                               |  ||
|  |  +------------------------------------------------------+  ||
|  |                                                            ||
|  |  Inspection Notes                                          ||
|  |  +------------------------------------------------------+  ||
|  |  | Confirmed cracks on both surfaces as described       |  ||
|  |  +------------------------------------------------------+  ||
|  |                                                            ||
|  |  [ + Add Photo ]                                           ||
|  |                                                            ||
|  +============================================================+|
|                                                                |
|  +== CTR-002: Granite Countertop 4ft (1 unit) ================+|
|  |                                                            ||
|  |  Condition on Receipt *                                    ||
|  |  +------------------------------------------------------+  ||
|  |  | (o) Damaged - Matches return reason                  |  ||
|  |  +------------------------------------------------------+  ||
|  |                                                            ||
|  |  Inspection Notes                                          ||
|  |  +------------------------------------------------------+  ||
|  |  | Large chip on corner, consistent with photos         |  ||
|  |  +------------------------------------------------------+  ||
|  |                                                            ||
|  +============================================================+|
|                                                                |
|  Received By *                                                 |
|  +---------------------------------------------- v-----------+  |
|  | Mike Johnson (Warehouse)                                  |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Receipt Date *                                                |
|  +----------------------------------------------------------+  |
|  | Jan 12, 2026                                   [calendar] |  |
|  +----------------------------------------------------------+  |
|                                                                |
|                    ( Cancel )  [ Confirm Receipt ]             |
+================================================================+
```

### Process RMA Dialog

```
+================================================================+
| Process RMA                                               [X]  |
+================================================================+
|                                                                |
|  Complete RMA-000042 and finalize the return.                  |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  RESOLUTION                                                    |
|                                                                |
|  Action for Each Item:                                         |
|                                                                |
|  +== CTR-001: Granite Countertop 8ft =========================+|
|  |                                                            ||
|  |  Resolution *                                              ||
|  |  +------------------------------------------------------+  ||
|  |  | ( ) Full Refund ($800)                               |  ||
|  |  | (o) Replacement (Ship new unit)                      |  ||
|  |  | ( ) Partial Refund: $[____]                          |  ||
|  |  | ( ) Store Credit ($800)                              |  ||
|  |  | ( ) Reject - Not eligible for return                 |  ||
|  |  +------------------------------------------------------+  ||
|  |                                                            ||
|  +============================================================+|
|                                                                |
|  +== CTR-002: Granite Countertop 4ft =========================+|
|  |                                                            ||
|  |  Resolution *                                              ||
|  |  +------------------------------------------------------+  ||
|  |  | (o) Replacement (Ship new unit)                      |  ||
|  |  +------------------------------------------------------+  ||
|  |                                                            ||
|  +============================================================+|
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  SUMMARY                                                       |
|                                                                |
|  Total Refund: $0.00                                           |
|  Store Credit: $0.00                                           |
|  Replacements: 2 items (scheduled for shipment)                |
|                                                                |
|  Processing Notes                                              |
|  +----------------------------------------------------------+  |
|  | Replacement order #ORD-6789 will be created              |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [ ] Send notification to customer                             |
|                                                                |
|                    ( Cancel )  [ Complete RMA ]                |
+================================================================+
```

### RMA List on Issue Detail

```
+-- RETURN AUTHORIZATIONS -----------------------------------------------------+
|                                                                              |
|  +------------------------------------------------------------------------+  |
|  | RMA#        | Status    | Items   | Created     | Value    | Actions  |  |
|  +-------------+-----------+---------+-------------+----------+----------+  |
|  | RMA-000042  | [*] PROC  | 2 items | Jan 10      | $1,250   | [View]   |  |
|  | RMA-000041  | [X] REJ   | 1 item  | Jan 5       | $450     | [View]   |  |
|  +------------------------------------------------------------------------+  |
|                                                                              |
|  [ + Create New RMA ]                                                        |
|                                                                              |
+------------------------------------------------------------------------------+

LEGEND:
[*] PROC = Processed (green)
[o] RECV = Received (blue)
[>] APPR = Approved (orange)
[?] REQ  = Requested (gray)
[X] REJ  = Rejected (red)
```

---

## Tablet View (768px)

### RMA Detail (Tablet)

```
+================================================================+
| < Back  |  RMA-000042                         Status: APPROVED  |
+================================================================+
|                                                                 |
| Issue: ISS-1250  |  Order: ORD-5678  |  Customer: Granite Plus  |
|                                                                 |
+================================================================+
|                                                                 |
| WORKFLOW                                                        |
| +-------------------------------------------------------------+ |
| | [*] Requested -> [*] Approved -> [ ] Received -> [ ] Proc   | |
| +-------------------------------------------------------------+ |
|                                                                 |
| RETURN ITEMS                                                    |
| +-------------------------------------------------------------+ |
| | CTR-001 - Granite Countertop 8ft                            | |
| | Return: 1 of 2  |  Status: Approved                         | |
| +-------------------------------------------------------------+ |
| | CTR-002 - Granite Countertop 4ft                            | |
| | Return: 1 of 1  |  Status: Approved                         | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Total: 2 items  |  Value: $1,250                                |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| |               [ Mark as Received ]                          | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| ( Reject RMA )   ( Cancel RMA )                                 |
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### RMA Creation (Mobile)

```
+================================+
| ============================== | <- Drag handle
|                                |
| CREATE RMA                [X]  |
| =============================== |
|                                |
| Issue: ISS-1250                |
| Order: ORD-5678                |
|                                |
| SELECT ITEMS                   |
| +----------------------------+ |
| | [x] CTR-001                | |
| |     Granite Countertop 8ft | |
| |     Qty: 2  Return: [1 v]  | |
| +----------------------------+ |
| | [x] CTR-002                | |
| |     Granite Countertop 4ft | |
| |     Qty: 1  Return: [1 v]  | |
| +----------------------------+ |
| | [ ] SEAL-100               | |
| |     Countertop Sealant     | |
| |     Qty: 3                 | |
| +----------------------------+ |
|                                |
| Return Reason *                |
| +----------------------------+ |
| | Defective/Damaged       v  | |
| +----------------------------+ |
|                                |
| Description *                  |
| +----------------------------+ |
| | Countertops arrived with   | |
| | visible cracks...          | |
| +----------------------------+ |
|                                |
| Customer Preference            |
| +----------------------------+ |
| | ( ) Refund                 | |
| | (o) Replacement            | |
| | ( ) Store Credit           | |
| +----------------------------+ |
|                                |
| Shipping                       |
| +----------------------------+ |
| | (o) Schedule pickup        | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| |                            | |
| |      [ Create RMA ]        | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### RMA Detail (Mobile)

```
+================================+
| < Back        RMA-000042       |
+================================+
|                                |
| Status: [>] APPROVED           |
|                                |
| Issue: ISS-1250                |
| Order: ORD-5678                |
| Customer: Granite Plus Inc     |
|                                |
+================================+
|                                |
| WORKFLOW                       |
| +----------------------------+ |
| | [*] Requested              | |
| |     Jan 10, 10:15 AM       | |
| |          |                 | |
| |          v                 | |
| | [*] Approved               | |
| |     Jan 10, 2:30 PM        | |
| |          |                 | |
| |          v                 | |
| | [ ] Received               | |
| |     Pending                | |
| |          |                 | |
| |          v                 | |
| | [ ] Processed              | |
| |     Pending                | |
| +----------------------------+ |
|                                |
+================================+
|                                |
| ITEMS (2)                      |
|                                |
| +----------------------------+ |
| | CTR-001                    | |
| | Granite Countertop 8ft     | |
| | Return: 1 of 2             | |
| | Status: Approved           | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | CTR-002                    | |
| | Granite Countertop 4ft     | |
| | Return: 1 of 1             | |
| | Status: Approved           | |
| +----------------------------+ |
|                                |
| Total Value: $1,250            |
|                                |
+================================+
|                                |
| Reason: Defective/Damaged      |
| Preference: Replacement        |
| Shipping: Schedule pickup      |
|                                |
+================================+
|                                |
| +----------------------------+ |
| |                            | |
| |   [ Mark as Received ]     | |
| |                            | |
| +----------------------------+ |
|                                |
| (Reject)        (Cancel RMA)   |
|                                |
+================================+
```

### Inspection Form (Mobile)

```
+================================+
| ============================== |
|                                |
| MARK RECEIVED             [X]  |
| =============================== |
|                                |
| RMA-000042                     |
|                                |
| INSPECTION                     |
|                                |
| +----------------------------+ |
| | CTR-001                    | |
| | Granite Countertop 8ft     | |
| |                            | |
| | Condition *                | |
| | ( ) Good                   | |
| | (o) Damaged - as described | |
| | ( ) Damaged - transit      | |
| | ( ) Missing/Wrong          | |
| |                            | |
| | Notes                      | |
| | +------------------------+ | |
| | | Cracks confirmed...    | | |
| | +------------------------+ | |
| |                            | |
| | [+ Photo]                  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | CTR-002                    | |
| | Granite Countertop 4ft     | |
| |                            | |
| | Condition *                | |
| | (o) Damaged - as described | |
| |                            | |
| | Notes                      | |
| | +------------------------+ | |
| | | Chip confirmed...      | | |
| | +------------------------+ | |
| +----------------------------+ |
|                                |
| Received By *                  |
| +----------------------------+ |
| | Mike Johnson            v  | |
| +----------------------------+ |
|                                |
| Receipt Date *                 |
| +----------------------------+ |
| | Jan 12, 2026       [cal]   | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| |                            | |
| |   [ Confirm Receipt ]      | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

---

## RMA Status Workflow Visualization

```
+== RMA STATUS FLOW ============================================+
|                                                               |
|   [REQUESTED]  -->  [APPROVED]  -->  [RECEIVED]  --> [PROCESSED]
|       |                |                |               |
|       v                v                v               v
|    (gray)          (orange)          (blue)         (green)
|                        |
|                        v
|                   [REJECTED]
|                    (red)
|                                                               |
+===============================================================+

STATUS BADGES:

+-- REQUESTED (Initial) ----------------------+
|  [?] REQUESTED                              |
|  Background: gray-100                       |
|  Border: gray-400                           |
|  Text: "Awaiting review"                    |
+---------------------------------------------+

+-- APPROVED ---------------------------------+
|  [>] APPROVED                               |
|  Background: orange-50                      |
|  Border: orange-500                         |
|  Text: "Ready for return"                   |
+---------------------------------------------+

+-- RECEIVED ---------------------------------+
|  [o] RECEIVED                               |
|  Background: blue-50                        |
|  Border: blue-500                           |
|  Text: "At warehouse"                       |
+---------------------------------------------+

+-- PROCESSED (Final Success) ----------------+
|  [*] PROCESSED                              |
|  Background: green-50                       |
|  Border: green-500                          |
|  Text: "Completed"                          |
+---------------------------------------------+

+-- REJECTED (Final Failure) -----------------+
|  [X] REJECTED                               |
|  Background: red-50                         |
|  Border: red-500                            |
|  Text: "Not approved"                       |
+---------------------------------------------+
```

---

## Loading States

### Create RMA Dialog Loading

```
+================================================================+
| Create Return Authorization                               [X]  |
+================================================================+
|                                                                |
|  Loading order items...                                        |
|                                                                |
|  +----------------------------------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]         |  |
|  | [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]                 |  |
|  | [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]         |  |
|  +----------------------------------------------------------+  |
|                                                                |
+================================================================+
```

### RMA Submit Processing

```
+================================================================+
| Creating RMA...                                           [X]  |
+================================================================+
|                                                                |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  |     [spinner]  Creating RMA-000042...                    |  |
|  |                                                          |  |
|  |     - Validating items                                   |  |
|  |     - Generating RMA number                              |  |
|  |     - Creating authorization                             |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
+================================================================+
```

---

## Empty States

### No RMAs on Issue

```
+-- RETURN AUTHORIZATIONS --------------------------------------+
|                                                               |
|                    [illustration]                             |
|                                                               |
|           No return authorizations                            |
|                                                               |
|    Create an RMA to process product returns                   |
|    for this issue.                                            |
|                                                               |
|    [ + Create RMA ]                                           |
|                                                               |
+---------------------------------------------------------------+
```

### No Order Linked

```
+-- CREATE RMA (No Order) --------------------------------------+
|                                                               |
|  [!] Cannot create RMA                                        |
|                                                               |
|  This issue has no linked order.                              |
|  An order must be linked to create a return authorization.    |
|                                                               |
|  [ Link Order ]                                               |
|                                                               |
+---------------------------------------------------------------+
```

---

## Error States

### Failed to Create RMA

```
+================================================================+
| [!] RMA Creation Failed                                        |
+================================================================+
|                                                                |
|  Could not create the return authorization.                    |
|                                                                |
|  Error: One or more items are not eligible for return.         |
|  CTR-001 has already been returned in RMA-000040.              |
|                                                                |
|  [ Dismiss ]  [ Try Again ]                                    |
|                                                                |
+================================================================+
```

### Invalid Status Transition

```
+================================================================+
| [!] Cannot Change Status                                       |
+================================================================+
|                                                                |
|  Cannot mark as Processed.                                     |
|                                                                |
|  The RMA must be in "Received" status before it can be         |
|  processed. Current status: Approved.                          |
|                                                                |
|  [ Mark as Received First ]  [ Dismiss ]                       |
|                                                                |
+================================================================+
```

---

## Success States

### RMA Created Successfully

```
+================================================================+
| [success] RMA Created                                          |
|                                                                |
| RMA-000042 has been created successfully.                      |
| Customer will be notified with return instructions.            |
|                                                                |
| [ View RMA ]  [ Dismiss ]                                      |
+================================================================+
```

### RMA Processed Successfully

```
+================================================================+
| [success] RMA Completed                                        |
|                                                                |
| RMA-000042 has been processed.                                 |
|                                                                |
| Summary:                                                       |
| - 2 items returned                                             |
| - Replacement order ORD-6789 created                           |
| - Customer notified                                            |
|                                                                |
| [ View Replacement Order ]  [ Dismiss ]                        |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// RMA Status Workflow
<nav
  role="navigation"
  aria-label="RMA workflow status"
>
  <ol role="list">
    <li aria-current={status === 'requested' ? 'step' : undefined}>
      <span aria-label="Step 1: Requested, completed">
        Requested
      </span>
    </li>
    <li aria-current={status === 'approved' ? 'step' : undefined}>
      <span aria-label="Step 2: Approved, current step">
        Approved
      </span>
    </li>
    <!-- ... -->
  </ol>
</nav>

// Item Selection in Create RMA
<fieldset>
  <legend>Select items to return from order ORD-5678</legend>
  <div role="group" aria-labelledby="item-CTR-001-label">
    <input
      type="checkbox"
      id="item-CTR-001"
      aria-describedby="item-CTR-001-desc"
    />
    <label id="item-CTR-001-label">CTR-001: Granite Countertop 8ft</label>
    <span id="item-CTR-001-desc">Quantity ordered: 2</span>
    <select aria-label="Return quantity for CTR-001">
      <option>1</option>
      <option>2</option>
    </select>
  </div>
</fieldset>

// RMA List
<table
  role="table"
  aria-label="Return authorizations for issue ISS-1250"
>
  <thead>
    <tr>
      <th scope="col">RMA Number</th>
      <th scope="col">Status</th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>RMA-000042</td>
      <td>
        <span aria-label="Status: Processed, completed">
          Processed
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

### Keyboard Navigation

```
Create RMA Dialog:
1. Focus moves to first item checkbox on open
2. Tab through: Item checkboxes -> Quantity selects -> Reason dropdown
3. Tab to: Description -> Customer Preference radios -> Shipping radios
4. Tab to: Notes -> Cancel -> Create buttons
5. Space toggles checkboxes
6. Arrow keys navigate radio options
7. Escape closes dialog

RMA Detail Page:
1. Tab to workflow status (read-only, announced)
2. Tab to each item row
3. Tab to action button (Mark as Received)
4. Tab to secondary actions (Reject, Cancel)
5. Tab to history entries
```

### Screen Reader Announcements

```
On RMA creation:
  "Return authorization RMA-000042 created for 2 items totaling $1,250.
   Status: Requested. Customer notification will be sent."

On status change:
  "RMA-000042 status changed from Approved to Received.
   Items have been inspected and logged."

On RMA completion:
  "RMA-000042 has been processed. Replacement order ORD-6789 created.
   2 items will be shipped to customer."

On rejection:
  "RMA-000042 has been rejected. Reason: Items not eligible for return."
```

---

## Animation Choreography

### Workflow Status Progression

```
Status Change Animation (Approved -> Received):

FRAME 1 (0ms):
  [*] Requested  -->  [*] Approved  -->  [ ] Received
                           ^current

FRAME 2 (150ms):
  Connector line animates from Approved to Received
  Blue fill travels along line

FRAME 3 (300ms):
  Received circle fills with blue
  Scale pulse (1.0 -> 1.1 -> 1.0)

FRAME 4 (450ms):
  "Received" text fades in
  Date/time appears below

Duration: 450ms
Easing: ease-out
```

### Item Selection Toggle

```
Checkbox Selection:

FRAME 1: Empty checkbox
FRAME 2 (50ms): Checkbox fills
FRAME 3 (100ms): Checkmark draws in
FRAME 4 (150ms): Row background highlights (blue-50)
FRAME 5 (200ms): Quantity selector becomes active

Deselection: Reverse animation
Duration: 200ms
```

### RMA Number Generation

```
Number Reveal Animation:

FRAME 1: Placeholder "RMA-######"
FRAME 2: Numbers spin/randomize briefly
FRAME 3: Final number locks in from left to right
FRAME 4: Subtle glow effect

Duration: 500ms
Sound: (optional) subtle click/lock sound
```

---

## Component Props Interface

```typescript
// RMA Status
type RMAStatus = 'requested' | 'approved' | 'received' | 'processed' | 'rejected';

// RMA Item
interface RMAItem {
  id: string;
  sku: string;
  name: string;
  orderedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  status: RMAStatus;
  inspectionCondition?: InspectionCondition;
  inspectionNotes?: string;
  inspectionPhotos?: string[];
  resolution?: ItemResolution;
}

type InspectionCondition =
  | 'good'
  | 'damaged_as_described'
  | 'damaged_transit'
  | 'missing_wrong';

type ItemResolution =
  | { type: 'refund'; amount: number }
  | { type: 'replacement' }
  | { type: 'partial_refund'; amount: number }
  | { type: 'store_credit'; amount: number }
  | { type: 'rejected'; reason: string };

// Create RMA Dialog
interface CreateRMADialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  orderId: string;
  orderItems: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    alreadyReturned?: number;
  }>;
  onSubmit: (data: CreateRMAData) => Promise<void>;
  isSubmitting?: boolean;
}

interface CreateRMAData {
  items: Array<{
    orderItemId: string;
    returnQuantity: number;
  }>;
  returnReason: ReturnReason;
  description: string;
  customerPreference: 'refund' | 'replacement' | 'store_credit';
  shippingMethod: 'customer_ships' | 'schedule_pickup' | 'onsite_only';
  internalNotes?: string;
}

type ReturnReason =
  | 'defective_damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'changed_mind'
  | 'duplicate_order'
  | 'other';

// RMA Detail
interface RMADetailProps {
  rma: {
    id: string;
    rmaNumber: string;
    status: RMAStatus;
    issueId: string;
    orderId: string;
    customerId: string;
    customerName: string;
    items: RMAItem[];
    returnReason: ReturnReason;
    description: string;
    customerPreference: string;
    shippingMethod: string;
    createdAt: Date;
    updatedAt: Date;
    history: RMAHistoryEntry[];
  };
  onStatusChange: (newStatus: RMAStatus) => Promise<void>;
  onReceive: (data: ReceiveRMAData) => Promise<void>;
  onProcess: (data: ProcessRMAData) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

interface RMAHistoryEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  details?: string;
}

// Receive RMA Dialog
interface ReceiveRMADialogProps {
  isOpen: boolean;
  onClose: () => void;
  rmaId: string;
  items: RMAItem[];
  onSubmit: (data: ReceiveRMAData) => Promise<void>;
  warehouseStaff: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

interface ReceiveRMAData {
  receivedBy: string;
  receiptDate: Date;
  itemInspections: Array<{
    itemId: string;
    condition: InspectionCondition;
    notes?: string;
    photos?: File[];
  }>;
}

// Process RMA Dialog
interface ProcessRMADialogProps {
  isOpen: boolean;
  onClose: () => void;
  rmaId: string;
  items: RMAItem[];
  onSubmit: (data: ProcessRMAData) => Promise<void>;
  isSubmitting?: boolean;
}

interface ProcessRMAData {
  itemResolutions: Array<{
    itemId: string;
    resolution: ItemResolution;
  }>;
  processingNotes?: string;
  notifyCustomer: boolean;
}

// RMA Workflow Status
interface RMAWorkflowProps {
  currentStatus: RMAStatus;
  statusDates: Partial<Record<RMAStatus, Date>>;
  orientation?: 'horizontal' | 'vertical';
}

// RMA List
interface RMAListProps {
  rmas: Array<{
    id: string;
    rmaNumber: string;
    status: RMAStatus;
    itemCount: number;
    totalValue: number;
    createdAt: Date;
  }>;
  onView: (rmaId: string) => void;
  onCreateNew?: () => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Order items load | < 500ms | From dialog open to items displayed |
| RMA creation | < 2s | From submit to success confirmation |
| Status transition | < 1s | From action to updated display |
| RMA detail load | < 500ms | Full detail page |
| Inspection form submit | < 2s | Including photo uploads |

---

## Related Wireframes

- [Issue Detail](./support-issue-detail.wireframe.md) - RMA creation button location
- [Customer 360](./support-customer-360.wireframe.md) - Customer RMA history
- [Support Dashboard](./support-dashboard.wireframe.md) - RMA metrics

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
