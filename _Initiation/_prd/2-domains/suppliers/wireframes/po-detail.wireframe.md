# Wireframe: Purchase Order Detail Page

> **PRD**: suppliers.prd.json
> **Domain**: Suppliers (DOM-SUPPLIERS)
> **Type**: Detail Page
> **Last Updated**: 2026-01-10

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | purchaseOrders, purchaseOrderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/purchase-orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Overview

The Purchase Order Detail page provides comprehensive view and management of a single purchase order. It displays order information, line items, receiving status, and supports actions like sending, receiving, and amending. This page serves as the foundation for approval workflow, receipt handling, and amendment tracking features.

---

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Order header card displaying PO number, supplier, and status badge
  - Order information sections (Supplier details, Delivery address, Notes)
  - Order summary card with subtotal, shipping, tax breakdown

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - Detail page navigation (Details, Items, Receipts, Costs, Amendments, Activity)
  - Tab counts showing item quantity, receipt count, amendment count
  - Smooth content transitions between tabs

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Line items table with product, SKU, quantity, price, and receiving status
  - Receipt history table showing received/rejected items per receipt
  - Visual indicators for partial receipts and back-ordered items

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Status badges (Draft, Pending Approval, Sent, Partial, Received, Closed)
  - Item-level status badges (Received, Pending, Back-ordered)
  - Warning badges for overdue dates and partial receipts

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Receive goods dialog with item checklist
  - Approval/rejection confirmation dialogs
  - Order cancellation warning dialog

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Goods receipt form with quantity inputs and quality checks
  - Amendment form for modifying order details
  - Notes and special instructions textarea

---

## Mobile Wireframe (375px)

### Header Section

```
+=========================================+
| < Purchase Orders                [...]  | <- Back + Actions menu
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |        PO-2024-0145               |  |
|  |                                   |  |
|  |    [Sent]                         |  | <- Status badge
|  |                                   |  |
|  |    ABC Building Supplies          |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [Receive Goods]  [Print]  [...]   |  | <- Primary action
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
| [Details] [Items] [Receipts] [History]  | <- Tabs
| ========                                |
+-----------------------------------------+
```

### Details Tab

```
+=========================================+
|                                         |
|  ORDER INFORMATION                      |
|  -----------------------------------    |
|                                         |
|  Supplier                               |
|  ABC Building Supplies                  |
|  [View Supplier ->]                     |
|                                         |
|  -----------------------------------    |
|                                         |
|  Order Date                             |
|  January 8, 2026                        |
|                                         |
|  Expected Delivery                      |
|  January 15, 2026                       |
|                                         |
|  Payment Terms                          |
|  Net 30                                 |
|                                         |
|  -----------------------------------    |
|                                         |
|  DELIVERY ADDRESS                       |
|  -----------------------------------    |
|  Warehouse A                            |
|  456 Industrial Blvd                    |
|  Suite 100                              |
|  Houston, TX 77002                      |
|                                         |
|  -----------------------------------    |
|                                         |
|  ORDER NOTES                            |
|  -----------------------------------    |
|  Please deliver between 8am-12pm.       |
|  Contact Mike at loading dock.          |
|                                         |
|  -----------------------------------    |
|                                         |
|  ORDER SUMMARY                          |
|  -----------------------------------    |
|  +-----------------------------------+  |
|  | Subtotal           |    $2,250.00 |  |
|  | Shipping           |      $150.00 |  |
|  | Tax (10%)          |      $225.00 |  |
|  +-----------------------------------+  |
|  | TOTAL              |    $2,625.00 |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Items Tab

```
+=========================================+
|                                         |
|  LINE ITEMS (12)                        |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | 2x4 Pine Lumber 8ft              |  |
|  | SKU: LUM-2X4-8                   |  |
|  | 50 @ $4.50 = $225.00              |  |
|  | Status: Received 50/50     [OK]   |  | <- Green checkmark
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Drywall Sheet 4x8                |  |
|  | SKU: DRY-48-12                   |  |
|  | 100 @ $12.00 = $1,200.00          |  |
|  | Status: Received 100/100   [OK]   |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Cement Bags 50lb             [!] |  | <- Partial
|  | SKU: CEM-50-GEN                  |  |
|  | 25 @ $8.00 = $200.00              |  |
|  | Status: Received 20/25            |  |
|  | [BACK-ORDERED: 5]                 |  | <- Warning badge
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Electrical Wire 100ft            |  |
|  | SKU: ELE-WIRE-100                |  |
|  | 10 @ $45.00 = $450.00             |  |
|  | Status: Pending                   |  |
|  +-----------------------------------+  |
|                                         |
|  [View More Items (8)]                  |
|                                         |
+=========================================+
```

### Receipts Tab

```
+=========================================+
|                                         |
|  RECEIPT HISTORY                        |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | Receipt #1                        |  |
|  | January 10, 2026                  |  |
|  | Received by: Mike Johnson         |  |
|  | ---                               |  |
|  | Items received: 8                 |  |
|  | Items rejected: 1                 |  |
|  | [View Details]                    |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Receipt #2                        |  |
|  | January 12, 2026                  |  |
|  | Received by: Sarah Kim            |  |
|  | ---                               |  |
|  | Items received: 2                 |  |
|  | Items rejected: 0                 |  |
|  | [View Details]                    |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  RECEIPT SUMMARY                        |
|  +-----------------------------------+  |
|  | Total Ordered     |           12  |  |
|  | Received          |           10  |  |
|  | Rejected          |            1  |  |
|  | Pending           |            1  |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  |     [RECEIVE MORE GOODS]          |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

```
+================================================================+
| < Purchase Orders                                               |
+----------------------------------------------------------------+
|                                                                 |
| +-- ORDER HEADER -----------------------------------------------+
| |                                                               |
| |  PO-2024-0145                              [Sent]             |
| |  ABC Building Supplies                                        |
| |  Order Date: Jan 8  |  Expected: Jan 15  |  Total: $2,625    |
| |                                                               |
| |  [Receive Goods]  [Print]  [Email]  [Edit]  [More v]          |
| |                                                               |
| +---------------------------------------------------------------+
|                                                                 |
| [Details] [Items (12)] [Receipts (2)] [Costs] [History]         |
| ==========                                                      |
+----------------------------------------------------------------+
|                                                                 |
| +-- LEFT: ORDER INFO ----------------+ +-- RIGHT: SUMMARY ------+
| |                                    | |                        |
| | SUPPLIER                           | | ORDER SUMMARY          |
| | ABC Building Supplies              | | ---------------------- |
| | John Smith                         | | Subtotal    $2,250.00  |
| | john@abc.com                       | | Shipping      $150.00  |
| | [View Supplier]                    | | Tax           $225.00  |
| |                                    | | ---------------------- |
| | ---------------------------------- | | TOTAL       $2,625.00  |
| |                                    | |                        |
| | ORDER DETAILS                      | | ---------------------- |
| | Order Date: Jan 8, 2026            | |                        |
| | Expected: Jan 15, 2026             | | RECEIVING STATUS       |
| | Payment Terms: Net 30              | | [==========   ] 83%    |
| | Reference: INV-2024-001            | | 10/12 items received   |
| |                                    | |                        |
| | ---------------------------------- | | [!] 1 item back-ordered|
| |                                    | |                        |
| | DELIVERY ADDRESS                   | +------------------------+
| | Warehouse A                        |                          |
| | 456 Industrial Blvd                |                          |
| | Houston, TX 77002                  |                          |
| |                                    |                          |
| | ---------------------------------- |                          |
| |                                    |                          |
| | NOTES                              |                          |
| | Please deliver 8am-12pm.           |                          |
| +------------------------------------+                          |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Orders                                                               |
| ----------- |                                                                                |
| Procurement | +-- ORDER HEADER ----------------------------------------------------------+   |
|   Dashboard |  |                                                                          |   |
|   Suppliers |  |  PO-2024-0145                                            [Sent]          |   |
|   Orders <- |  |  ======================================================================  |   |
| Catalog     |  |                                                                          |   |
| Jobs        |  |  Supplier: ABC Building Supplies    Order Date: Jan 8, 2026              |   |
| Pipeline    |  |  Contact: John Smith                Expected: Jan 15, 2026               |   |
| Support     |  |                                     Payment: Net 30                      |   |
|             |  |                                                                          |   |
|             |  |  +-------------+ +----------+ +--------+ +--------+ +--------+ +------+  |   |
|             |  |  |[Receive    ]| |[Print   ]| |[Email ]| |[Amend ]| |[Cancel]| |[... ]|  |   |
|             |  |  |[Goods     ]| |[PO      ]| |[Supp. ]| |[Order ]| |        | |      |  |   |
|             |  |  +-------------+ +----------+ +--------+ +--------+ +--------+ +------+  |   |
|             |  |                                                                          |   |
|             | +--------------------------------------------------------------------------+   |
|             |                                                                                |
|             | [Details] [Line Items (12)] [Receipts (2)] [Costs] [Amendments] [Activity]     |
|             | ==========                                                                     |
|             |                                                                                |
|             | +-- MAIN CONTENT -----------------------------------------------------------+   |
|             | |                                                                           |   |
|             | | +-- ORDER INFORMATION ----------------+ +-- ORDER SUMMARY ---------------+|   |
|             | | |                                     | |                                ||   |
|             | | | SUPPLIER                            | | +----------------------------+ ||   |
|             | | | ABC Building Supplies               | | | Subtotal      |  $2,250.00 | ||   |
|             | | | Primary: John Smith                 | | | Shipping      |    $150.00 | ||   |
|             | | | john@abc.com | +1 555-123-4567      | | | Tax (10%)     |    $225.00 | ||   |
|             | | | [View Supplier Profile]             | | +----------------------------+ ||   |
|             | | |                                     | | | TOTAL         |  $2,625.00 | ||   |
|             | | | ----------------------------------- | | +----------------------------+ ||   |
|             | | |                                     | |                                ||   |
|             | | | DELIVERY DETAILS                    | | +----- RECEIVING STATUS -----+||   |
|             | | | Address: Warehouse A                | | |                             |||   |
|             | | | 456 Industrial Blvd, Suite 100      | | | [===============     ] 83%  |||   |
|             | | | Houston, TX 77002                   | | |                             |||   |
|             | | |                                     | | | Items Ordered:    12        |||   |
|             | | | Expected: January 15, 2026          | | | Items Received:   10        |||   |
|             | | | Shipping Method: Standard Ground   | | | Items Rejected:    1        |||   |
|             | | |                                     | | | Items Pending:     1        |||   |
|             | | | ----------------------------------- | | |                             |||   |
|             | | |                                     | | | [!] 1 item back-ordered     |||   |
|             | | | NOTES                               | | +-----------------------------+||   |
|             | | | Please deliver between 8am-12pm.   | |                                ||   |
|             | | | Contact Mike at the loading dock.  | +--------------------------------+|   |
|             | | +-------------------------------------+                                  |   |
|             | |                                                                           |   |
|             | | +-- LINE ITEMS ----------------------------------------------------------+|   |
|             | | |                                                                       ||   |
|             | | | Product           | SKU          | Qty    | Unit     | Total    | Rec ||   |
|             | | | ----------------- | ------------ | ------ | -------- | -------- | --- ||   |
|             | | | 2x4 Pine Lumber   | LUM-2X4-8    |   50   |  $4.50   |  $225.00 | 50  ||   |
|             | | | Drywall Sheet 4x8 | DRY-48-12    |  100   | $12.00   |$1,200.00 | 100 ||   |
|             | | | Cement Bags 50lb  | CEM-50-GEN   |   25   |  $8.00   |  $200.00 | 20[!]|   |
|             | | | Electrical Wire   | ELE-WIRE-100 |   10   | $45.00   |  $450.00 |  0  ||   |
|             | | | [+ 8 more items...]                                                   ||   |
|             | | |                                                                       ||   |
|             | | +-----------------------------------------------------------------------+|   |
|             | |                                                                           |   |
|             | +--------------------------------------------------------------------------+   |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

---

## Action States

### Primary Action Button States

```
DRAFT STATUS:
+-------------------+ +------------+ +------------+
| [Submit for      ] | [Send to   ] | [Edit      ] |
| [Approval       ] | [Supplier  ] | [Order     ] |
+-------------------+ +------------+ +------------+

PENDING APPROVAL STATUS:
+-------------------+ +------------+ +------------+
| [Approve         ] | [Reject    ] | [View      ] |
| [Order          ] | [Order     ] | [Details   ] |
+-------------------+ +------------+ +------------+
  (Only shown to approvers)

SENT STATUS:
+-------------------+ +------------+ +------------+
| [Receive         ] | [Print     ] | [Amend     ] |
| [Goods          ] | [PO        ] | [Order     ] |
+-------------------+ +------------+ +------------+

PARTIALLY RECEIVED:
+-------------------+ +------------+ +------------+
| [Receive More    ] | [Close     ] | [View      ] |
| [Goods          ] | [Order     ] | [Receipts  ] |
+-------------------+ +------------+ +------------+

RECEIVED/CLOSED:
+-------------------+ +------------+ +------------+
| [View            ] | [Create    ] | [Print     ] |
| [Receipts       ] | [New PO    ] | [Report    ] |
+-------------------+ +------------+ +------------+
```

---

## Loading State

```
+=========================================+
| < Purchase Orders                [...]  |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |    [shimmer===============]       |  |
|  |                                   |  |
|  |    [shimmer======]                |  |
|  |                                   |  |
|  |    [shimmer=============]         |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer==] [shimmer] [shimmer]   |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
| [shimmer===] [shimmer==] [shimmer===]   |
+-----------------------------------------+
|                                         |
|  [shimmer=================]             |
|  [shimmer==========]                    |
|  [shimmer================]              |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer====================]     |  |
|  | [shimmer========] [shimmer====]   |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer====================]     |  |
|  | [shimmer========] [shimmer====]   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Error State

```
+=========================================+
|                                         |
|           +-------------+               |
|           |    [!]      |               |
|           +-------------+               |
|                                         |
|    UNABLE TO LOAD PURCHASE ORDER        |
|                                         |
|   There was a problem loading this      |
|   order. The order may not exist or     |
|   you may not have permission.          |
|                                         |
|   [Retry]  [Back to Orders]             |
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<main role="main" aria-label="Purchase order PO-2024-0145">
  <header role="banner">
    <h1>PO-2024-0145</h1>
    <span role="status" aria-label="Order status: Sent">Sent</span>
  </header>

  <nav role="tablist" aria-label="Order information tabs">
    <button role="tab" aria-selected="true">Details</button>
    <button role="tab" aria-selected="false">Line Items (12)</button>
    <button role="tab" aria-selected="false">Receipts (2)</button>
  </nav>

  <section role="tabpanel" aria-labelledby="details-tab">
    <section role="region" aria-label="Supplier information">
      <!-- Supplier details -->
    </section>
    <section role="region" aria-label="Order summary">
      <table role="table" aria-label="Order totals">
        <!-- Summary table -->
      </table>
    </section>
  </section>
</main>
```

### Keyboard Navigation

```
Tab Order:
1. Back button
2. Actions menu/buttons
3. Tab navigation
4. Tab panel content
5. Line items table
6. Action buttons within panel

Table Navigation:
- Tab: Move through rows
- Arrow keys: Navigate cells
- Enter: View item details
- Space: Toggle selection
```

### Screen Reader Announcements

```
On page load:
  "Purchase order PO-2024-0145, sent to ABC Building Supplies.
   Total value $2,625. 83% received, 1 item back-ordered."

On tab change:
  "Line items tab. Showing 12 items, 10 received, 2 pending."

On receiving status:
  "Receiving progress: 83 percent complete.
   10 of 12 items received. 1 item back-ordered."

On action:
  "Receive goods button. Opens goods receipt form."
```

---

## Animation Choreography

### Page Load

```
INITIAL LOAD:
- Header: Fade in (0-200ms)
- Status badge: Scale in (200-300ms)
- Action buttons: Stagger fade (300-450ms)
- Tabs: Fade in (400-500ms)
- Content: Stagger fade (500-800ms)

STATUS BADGE:
- Entry: Scale from 0.8 to 1 + fade (200ms)
- Color: Appropriate status color
```

### Tab Transitions

```
TAB CHANGE:
- Current panel: Fade out (0-150ms)
- New panel: Fade in (150-350ms)
- Table rows: Stagger fade (350-600ms, 30ms between)
```

### Action Feedback

```
BUTTON PRESS:
- Scale: 0.95 (50ms)
- Return: 1.0 (100ms)

ACTION COMPLETE:
- Success toast: Slide up from bottom (200ms)
- Hold: 3s
- Dismiss: Slide down (150ms)
```

---

## Component Props Interface

```typescript
// PODetailPage.tsx
interface PODetailPageProps {
  // Uses route loader data
}

// PODetailHeader.tsx
interface PODetailHeaderProps {
  order: {
    id: string;
    poNumber: string;
    status: POStatus;
    supplier: { id: string; name: string; contact?: string };
    orderDate: Date;
    expectedDate: Date | null;
    totalValue: number;
  };
  onAction: (action: PODetailAction) => void;
  canApprove?: boolean;
  canReceive?: boolean;
}

// PODetailTabs.tsx
interface PODetailTabsProps {
  activeTab: 'details' | 'items' | 'receipts' | 'costs' | 'amendments' | 'activity';
  counts: {
    items: number;
    receipts: number;
    amendments: number;
  };
  onTabChange: (tab: PODetailTabsProps['activeTab']) => void;
}

// POOrderInfo.tsx
interface POOrderInfoProps {
  order: {
    supplier: SupplierSummary;
    deliveryAddress: Address;
    orderDate: Date;
    expectedDate: Date | null;
    paymentTerms: string;
    shippingMethod?: string;
    reference?: string;
    notes?: string;
  };
}

// POOrderSummary.tsx
interface POOrderSummaryProps {
  summary: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
  receivingStatus: {
    totalItems: number;
    receivedItems: number;
    rejectedItems: number;
    pendingItems: number;
    backOrderedItems: number;
  };
}

// POLineItemsTable.tsx
interface POLineItemsTableProps {
  items: Array<{
    id: string;
    product: { id: string; name: string; sku: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    quantityReceived: number;
    quantityRejected: number;
    isBackOrdered: boolean;
  }>;
  onItemClick?: (itemId: string) => void;
  showReceivingStatus?: boolean;
}

type PODetailAction =
  | 'receive'
  | 'send'
  | 'print'
  | 'email'
  | 'amend'
  | 'submit_approval'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'close'
  | 'duplicate';
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/purchase-orders/$poId.tsx` | Modify | Implement detail layout |
| `src/components/domain/procurement/po-detail-header.tsx` | Create | Header with actions |
| `src/components/domain/procurement/po-detail-tabs.tsx` | Create | Tab navigation |
| `src/components/domain/procurement/po-order-info.tsx` | Create | Order info section |
| `src/components/domain/procurement/po-order-summary.tsx` | Create | Summary + receiving |
| `src/components/domain/procurement/po-line-items-table.tsx` | Create | Line items display |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load | < 1.5s | Time to interactive |
| Tab switch | < 200ms | Panel content visible |
| Action response | < 100ms | Visual feedback |
| Line items render | < 500ms | All rows visible |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
