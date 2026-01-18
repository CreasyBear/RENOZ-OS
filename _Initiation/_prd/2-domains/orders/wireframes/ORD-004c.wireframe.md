# Wireframe: DOM-ORD-004c - Backorder Management UI

## Story Reference

- **Story ID**: DOM-ORD-004c
- **Name**: Backorder Management: UI
- **PRD**: memory-bank/prd/domains/orders.prd.json
- **Type**: UI Component (Full Page Route)
- **Component Type**: ExpandableDataTable with nested rows

## Overview

Backorder report showing all backordered items grouped by product. Expandable rows reveal individual orders waiting for stock. Shows expected dates, links to purchase orders, and FIFO allocation queue. Items tab in order detail also shows backorder status per line item.

## UI Patterns (Reference Implementation)

### Expandable Data Grid
- **Pattern**: RE-UI DataGrid with row expansion
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Nested rows showing allocation queue
  - Row expansion reveals child orders (FIFO queue)
  - Parent-child hierarchy visualization
  - ARIA treegrid for accessibility

### Status Badge
- **Pattern**: RE-UI Badge variants
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - PO Status: On Order (green), Not Ordered (red warning), Overdue (red critical)
  - Backorder Status: Pending Allocation, Partially Allocated, Fully Allocated

### Alert Banner
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Backorder alert on order detail items tab
  - Warning variant with action buttons
  - Dismissible after acknowledgment

### Link Component
- **Pattern**: Purchase order deep links
- **Reference**: Standard Next.js Link
- **Features**:
  - Deep links to PO detail page
  - Visual indicator for external navigation

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | orders, orderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-ORD-004c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Backorder Report - Accordion View

```
+=========================================+
| < Reports                        [...]  |
|                                         |
| Backorder Report                        |
| ───────────────────────────────────     |
+-----------------------------------------+
|                                         |
|  [Search products...___________] [Fil]  |
|                                         |
|  SUMMARY                                |
|  +-------------------------------------+|
|  |  Total Backordered                  ||
|  |  147 units across 12 products       ||
|  |  Affecting 28 orders                ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  BACKORDERED PRODUCTS                   |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System (WGT-001)            [v]|| <- Tap to expand
|  |  ───────────────────────────────    ||
|  |  Total Backordered: 45 units        ||
|  |  Oldest Order: Dec 28, 2025         ||
|  |  Orders Affected: 8                 ||
|  |                                     ||
|  |  [On PO: PO-2024-0089]             || <- Link to PO
|  |  Expected: Jan 15, 2026             ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  5kW Hybrid Inverter (GDG-002)           [>]||
|  |  ───────────────────────────────    ||
|  |  Total Backordered: 32 units        ||
|  |  Oldest Order: Jan 2, 2026          ||
|  |  Orders Affected: 5                 ||
|  |                                     ||
|  |  [Not on order]                     || <- Warning badge
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  Battery Cable Kit (CON-003)         [>]||
|  |  ───────────────────────────────    ||
|  |  Total Backordered: 70 units        ||
|  |  Oldest Order: Jan 5, 2026          ||
|  |  Orders Affected: 15                ||
|  |                                     ||
|  |  [On PO: PO-2024-0091]             ||
|  |  Expected: Jan 12, 2026             ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Expanded Product - Order List

```
+=========================================+
|  +-------------------------------------+|
|  |  10kWh LFP Battery System (WGT-001)            [^]|| <- Expanded
|  |  ───────────────────────────────    ||
|  |  Total Backordered: 45 units        ||
|  |  [On PO: PO-2024-0089] Jan 15       ||
|  |                                     ||
|  |  +---------- ORDERS ---------------+||
|  |  |                                 |||
|  |  |  1. ORD-2024-0145              ||| <- FIFO order
|  |  |     Brisbane Solar                   |||
|  |  |     Qty: 10 | Dec 28, 2025      ||| <- Oldest first
|  |  |     [View Order]                |||
|  |  |                                 |||
|  |  |  2. ORD-2024-0148              |||
|  |  |     Sydney Energy             |||
|  |  |     Qty: 8 | Dec 30, 2025       |||
|  |  |     [View Order]                |||
|  |  |                                 |||
|  |  |  3. ORD-2024-0152              |||
|  |  |     Melbourne Power                   |||
|  |  |     Qty: 12 | Jan 2, 2026       |||
|  |  |     [View Order]                |||
|  |  |                                 |||
|  |  |  ... +5 more orders             |||
|  |  |                                 |||
|  |  +---------------------------------+||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Order Detail - Items Tab Backorder Status

```
+=========================================+
| < Order #ORD-2024-0156           [...]  |
| Brisbane Solar Co                        |
+-----------------------------------------+
| [Items] [Fulfillment] [Activity] [Amend]|
| =======                                 |
+-----------------------------------------+
|                                         |
|  ORDER ITEMS                            |
|  ───────────────────────────────────    |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System                         ||
|  |  WGT-001                            ||
|  |  ───────────────────────────────    ||
|  |  Qty: 10  |  $125.00  |  $1,250.00  ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |  [!] BACKORDERED             |  || <- Red highlight
|  |  |  ───────────────────────     |  ||
|  |  |  Allocated: 0 / 10           |  ||
|  |  |  On Backorder: 10 units      |  ||
|  |  |                              |  ||
|  |  |  Expected: Jan 15, 2026      |  ||
|  |  |  [On PO: PO-2024-0089]       |  ||
|  |  |                              |  ||
|  |  |  Queue Position: 1 of 8      |  || <- FIFO position
|  |  +-------------------------------+  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  5kW Hybrid Inverter                        ||
|  |  GDG-002                            ||
|  |  ───────────────────────────────    ||
|  |  Qty: 5   |  $89.00   |  $445.00    ||
|  |                                     ||
|  |  Status: [Allocated]                || <- Green badge
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State - No Backorders

```
+=========================================+
| < Reports                        [...]  |
|                                         |
| Backorder Report                        |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |    [box]    |              |
|            |     ~~~     |              |
|            |    [check]  |              |
|            +-------------+              |
|                                         |
|        NO BACKORDERS                    |
|                                         |
|   Great news! All ordered items         |
|   are currently in stock or             |
|   have been allocated.                  |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |      [VIEW ALL ORDERS]      |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Backorder Report - Grouped List

```
+=====================================================================+
| < Reports                                                            |
|                                                                      |
| Backorder Report                                       [Export CSV]  |
| Track products with insufficient stock                               |
+---------------------------------------------------------------------+
|                                                                      |
|  [Search products..._______________]  [Product ▼]  [PO Status ▼]    |
|                                                                      |
|  +-- SUMMARY -------------------------------------------------------+|
|  |  Total Backordered: 147 units  |  Products: 12  |  Orders: 28   ||
|  +------------------------------------------------------------------+|
|                                                                      |
|  BACKORDERED BY PRODUCT                                              |
|  ─────────────────────────────────────────────────────────────────   |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Product          | Backorder | Orders | PO Status    | Expect  | |
|  +----------------------------------------------------------------+ |
|  | v 10kWh LFP Battery System     |    45     |   8    | PO-2024-0089 | Jan 15  | |
|  |   WGT-001        |           |        | [On Order]   |         | |
|  +----------------------------------------------------------------+ |
|  |   +-- ORDERS (FIFO) ----------------------------------------+  | |
|  |   | #  | Order         | Customer      | Qty | Order Date   |  | |
|  |   +----------------------------------------------------------+  | |
|  |   | 1  | ORD-2024-0145 | Brisbane Solar     | 10  | Dec 28, 2025 |  | |
|  |   | 2  | ORD-2024-0148 | Sydney Energy     |  8  | Dec 30, 2025 |  | |
|  |   | 3  | ORD-2024-0152 | Melbourne Power     | 12  | Jan 2, 2026  |  | |
|  |   | 4  | ORD-2024-0155 | GoldCoast Battery     |  5  | Jan 3, 2026  |  | |
|  |   | .. | +4 more       |               | 10  |              |  | |
|  |   +----------------------------------------------------------+  | |
|  +----------------------------------------------------------------+ |
|  | > 5kW Hybrid Inverter    |    32     |   5    | [Not Ordered]| -       | |
|  |   GDG-002        |           |        | [!] Warning  |         | |
|  +----------------------------------------------------------------+ |
|  | > Battery Cable Kit  |    70     |  15    | PO-2024-0091 | Jan 12  | |
|  |   CON-003        |           |        | [On Order]   |         | |
|  +----------------------------------------------------------------+ |
|                                                                      |
+=====================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Backorder Report Page

```
+===================================================================================================+
| Renoz CRM                                                                    [bell] [Joel v]      |
+-------------+-------------------------------------------------------------------------------------+
|             |                                                                                     |
| Dashboard   |  Reports > Backorder Report                                                         |
| Customers   |                                                                                     |
| Orders      |  Backorder Report                                          [Refresh] [Export CSV]  |
| Products    |  Products with insufficient stock to fulfill orders                                 |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────      |
| Pipeline    |                                                                                     |
| Reports  <  |  +-- FILTERS ----------------------------------------------------------------+      |
|   Backorders|  |                                                                            |      |
|   Sales     |  |  [Search products...________]  [Product ▼]  [PO Status ▼]  [Clear Filters]|      |
|   Inventory |  |                                                                            |      |
| Settings    |  +----------------------------------------------------------------------------+      |
|             |                                                                                     |
|             |  +-- SUMMARY METRICS ---------------------------------------------------------+      |
|             |  |                                                                            |      |
|             |  |  +----------------+  +----------------+  +----------------+  +------------+|      |
|             |  |  | Total Units    |  | Products       |  | Orders         |  | Avg Wait   ||      |
|             |  |  | Backordered    |  | Affected       |  | Affected       |  | Time       ||      |
|             |  |  | 147            |  | 12             |  | 28             |  | 8 days     ||      |
|             |  |  +----------------+  +----------------+  +----------------+  +------------+|      |
|             |  |                                                                            |      |
|             |  +----------------------------------------------------------------------------+      |
|             |                                                                                     |
|             |  +-- BACKORDER TABLE ---------------------------------------------------------+      |
|             |  |                                                                            |      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |  |   | Product        | SKU     | Backorder | Orders | PO Status | Expect ||      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |  | v | 10kWh LFP Battery System     | WGT-001 |    45     |   8    | On Order  | Jan 15 ||      |
|             |  |  |   |                |         |           |        | PO-0089   |        ||      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |  |   +-- ALLOCATION QUEUE (FIFO) --------------------------------------+ ||      |
|             |  |  |   |                                                                 | ||      |
|             |  |  |   | Pos | Order          | Customer        | Qty  | Ordered    | $ | ||      |
|             |  |  |   +----------------------------------------------------------------+ ||      |
|             |  |  |   | 1   | ORD-2024-0145  | Brisbane Solar       | 10   | Dec 28     | v | ||      |
|             |  |  |   | 2   | ORD-2024-0148  | Sydney Energy | 8    | Dec 30     | v | ||      |
|             |  |  |   | 3   | ORD-2024-0152  | Melbourne Power       | 12   | Jan 2      | v | ||      |
|             |  |  |   | 4   | ORD-2024-0155  | GoldCoast Battery       | 5    | Jan 3      | v | ||      |
|             |  |  |   | 5   | ORD-2024-0158  | Epsilon Co      | 3    | Jan 4      | v | ||      |
|             |  |  |   | 6   | ORD-2024-0160  | Zeta Ltd        | 2    | Jan 5      | v | ||      |
|             |  |  |   | 7   | ORD-2024-0162  | Eta Corp        | 3    | Jan 6      | v | ||      |
|             |  |  |   | 8   | ORD-2024-0165  | Theta Inc       | 2    | Jan 7      | v | ||      |
|             |  |  |   +----------------------------------------------------------------+ ||      |
|             |  |  |   |                                               Total: 45 units  | ||      |
|             |  |  |   +-----------------------------------------------------------------+ ||      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |  | > | 5kW Hybrid Inverter    | GDG-002 |    32     |   5    | [!] Not   | -      ||      |
|             |  |  |   |                |         |           |        | Ordered   |        ||      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |  | > | Battery Cable Kit  | CON-003 |    70     |  15    | On Order  | Jan 12 ||      |
|             |  |  |   |                |         |           |        | PO-0091   |        ||      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |  | > | High-Current DC Cable  | CBL-004 |    25     |   4    | On Order  | Jan 18 ||      |
|             |  |  |   |                |         |           |        | PO-0092   |        ||      |
|             |  |  +------------------------------------------------------------------------+|      |
|             |  |                                                                            |      |
|             |  +----------------------------------------------------------------------------+      |
|             |                                                                                     |
+-------------+-------------------------------------------------------------------------------------+
```

### Order Detail - Items Tab with Backorder Banner

```
+===================================================================================================+
|             |                                                                                     |
|             |  [Items] [Fulfillment] [Activity] [Amendments]                                      |
|             |  =======                                                                            |
|             |                                                                                     |
|             |  +-- BACKORDER ALERT --------------------------------------------------------+      |
|             |  |  [!] This order has backordered items                                     |      |
|             |  |      2 of 4 items are waiting for stock                                   |      |
|             |  +--------------------------------------------------------------------------+      |
|             |                                                                                     |
|             |  +-- ORDER ITEMS -----------------------------------------------------------+      |
|             |  |                                                                          |      |
|             |  |  +--------------------------------------------------------------------+ |      |
|             |  |  | Product        | SKU     | Qty | Price   | Total    | Status       | |      |
|             |  |  +--------------------------------------------------------------------+ |      |
|             |  |  | 10kWh LFP Battery System     | WGT-001 | 10  | $125.00 | $1,250   | [Backorder]  | |      |
|             |  |  |                |         |     |         |          | 0/10 alloc   | |      |
|             |  |  |                |         |     |         |          | Pos: 1 of 8  | |      |
|             |  |  |                |         |     |         |          | Exp: Jan 15  | |      |
|             |  |  |                |         |     |         |          | PO-0089 [->] | |      |
|             |  |  +--------------------------------------------------------------------+ |      |
|             |  |  | 5kW Hybrid Inverter    | GDG-002 | 5   | $89.00  | $445     | [Backorder]  | |      |
|             |  |  |                |         |     |         |          | 0/5 alloc    | |      |
|             |  |  |                |         |     |         |          | Pos: 3 of 5  | |      |
|             |  |  |                |         |     |         |          | [!] No PO    | |      |
|             |  |  +--------------------------------------------------------------------+ |      |
|             |  |  | Battery Cable Kit  | CON-003 | 20  | $12.50  | $250     | [Allocated]  | |      |
|             |  |  |                |         |     |         |          | 20/20        | |      |
|             |  |  +--------------------------------------------------------------------+ |      |
|             |  |  | High-Current DC Cable  | CBL-004 | 8   | $35.00  | $280     | [Allocated]  | |      |
|             |  |  |                |         |     |         |          | 8/8          | |      |
|             |  |  +--------------------------------------------------------------------+ |      |
|             |  |                                                                          |      |
|             |  +--------------------------------------------------------------------------+      |
|             |                                                                                     |
+-------------+-------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
REPORT LOADING:
+-------------------------------------+
|  Backorder Report                   |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  +-------------------------------+  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer] [shim] [shim] [shim]|  |
|  +-------------------------------+  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  | [shimmer~~~~~~~~]             |  |
|  +-------------------------------+  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  +-------------------------------+  |
+-------------------------------------+

EXPANSION LOADING:
+-------------------------------------+
|  v 10kWh LFP Battery System (WGT-001)             |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  |  Loading orders...            |  |
|  |  [spinner]                    |  |
|  +-------------------------------+  |
+-------------------------------------+
```

### Error States

```
REPORT LOAD FAILED:
+-------------------------------------+
|  Backorder Report                   |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  |  [!] Failed to load report    |  |
|  |                               |  |
|  |  Unable to retrieve backorder |  |
|  |  information. Please try      |  |
|  |  again.                       |  |
|  |                               |  |
|  |  [Retry]                      |  |
|  +-------------------------------+  |
+-------------------------------------+

EXPANSION FAILED:
+-------------------------------------+
|  v 10kWh LFP Battery System (WGT-001)             |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  |  [!] Could not load orders    |  |
|  |                               |  |
|  |  [Retry]                      |  |
|  +-------------------------------+  |
+-------------------------------------+
```

### PO Status States

```
+-- ON ORDER (Good) ---------------------+
|  PO Status: [On Order]                 |
|  PO-2024-0089  [->]                    |
|  Expected: January 15, 2026            |
|                                        |
|  Background: green-50                  |
|  Link to Purchase Order detail         |
+----------------------------------------+

+-- NOT ORDERED (Warning) ---------------+
|  PO Status: [Not Ordered]              |
|  [!] Stock not on order                |
|                                        |
|  [Create Purchase Order]               | <- Action link
|                                        |
|  Background: amber-50                  |
|  Border: amber-300                     |
+----------------------------------------+

+-- OVERDUE (Critical) ------------------+
|  PO Status: [Overdue]                  |
|  PO-2024-0085  [->]                    |
|  Expected: January 5, 2026             |
|  [!] 5 days overdue                    |
|                                        |
|  Background: red-50                    |
|  Border: red-300                       |
+----------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Backorder Report Page**
   - Search input
   - Filter dropdowns
   - Export button
   - Expandable product rows (Tab through)
   - Within expanded row: Order links

2. **Expansion**
   - Enter/Space: Toggle expand/collapse
   - Focus moves to first order link when expanded
   - Escape: Collapse and return focus to product row

### ARIA Requirements

```html
<!-- Backorder Report Table -->
<table
  role="treegrid"
  aria-label="Backordered products with allocation queue"
>
  <thead>
    <tr>
      <th scope="col">Product</th>
      <th scope="col">Backordered</th>
      <th scope="col">Orders</th>
      <th scope="col">PO Status</th>
      <th scope="col">Expected</th>
    </tr>
  </thead>
  <tbody>
    <tr
      role="row"
      aria-level="1"
      aria-expanded="true"
      aria-label="10kWh LFP Battery System: 45 units backordered across 8 orders"
    >
      <!-- Parent row content -->
    </tr>
    <tr
      role="row"
      aria-level="2"
      aria-label="Order ORD-2024-0145, Brisbane Solar, 10 units, queue position 1"
    >
      <!-- Child row content -->
    </tr>
  </tbody>
</table>

<!-- PO Status Badge -->
<span
  role="status"
  aria-label="Purchase order status: On order, PO-2024-0089, expected January 15"
  class="badge-green"
>
  On Order
</span>

<!-- Queue Position -->
<span
  aria-label="Allocation queue position: 1 of 8, will be allocated first when stock arrives"
>
  Position: 1 of 8
</span>

<!-- Backorder Alert Banner -->
<div
  role="alert"
  aria-label="Warning: This order has 2 backordered items waiting for stock"
>
  This order has backordered items
</div>

<!-- Order Link -->
<a
  href="/orders/ORD-2024-0145"
  aria-label="View order ORD-2024-0145 for Brisbane Solar"
>
  ORD-2024-0145
</a>

<!-- PO Link -->
<a
  href="/purchase-orders/PO-2024-0089"
  aria-label="View purchase order PO-2024-0089"
>
  PO-2024-0089
</a>
```

### Screen Reader Announcements

- Page loaded: "Backorder Report. 147 units backordered across 12 products affecting 28 orders."
- Row expanded: "Expanded 10kWh LFP Battery System. 8 orders in allocation queue."
- Row collapsed: "Collapsed 10kWh LFP Battery System."
- Navigation: "Order ORD-2024-0145 for Brisbane Solar, 10 units, queue position 1 of 8."
- Filter applied: "Filtered. Showing 5 of 12 products."
- Empty state: "No backorders. All ordered items are in stock or allocated."

---

## Animation Choreography

### Row Expansion

```
EXPAND:
- Duration: 250ms
- Easing: ease-out
- Row height: 0 -> auto (measured)
- Child rows fade in: 150ms staggered (50ms each)
- Chevron rotate: 90deg

COLLAPSE:
- Duration: 200ms
- Easing: ease-in
- Row height: auto -> 0
- Child rows fade out: 100ms
- Chevron rotate: -90deg
```

### Summary Metrics

```
LOAD:
- Duration: 400ms
- Easing: ease-out
- Cards fade in sequentially (100ms stagger)
- Numbers count up animation: 300ms

REFRESH:
- Duration: 200ms
- Fade out -> update -> fade in
- Number transition: old -> new (typewriter effect)
```

### Status Badge Transitions

```
PO STATUS UPDATE:
- Duration: 300ms
- Old badge: scale out + fade
- New badge: scale in from center
- Color transition: smooth gradient
```

### Loading Skeleton

```
SHIMMER:
- Duration: 1.5s
- Easing: linear
- Gradient sweep: left to right
- Loop: infinite

SKELETON TO CONTENT:
- Duration: 200ms
- Crossfade transition
```

---

## Component Props Interfaces

```typescript
// Backorder Report Page
interface BackorderReportPageProps {
  initialFilters?: BackorderFilters;
}

// Backorder Filters
interface BackorderFilters {
  search?: string;
  productId?: string;
  poStatus?: 'on_order' | 'not_ordered' | 'overdue' | 'all';
}

// Backorder Summary
interface BackorderSummary {
  totalUnits: number;
  productsAffected: number;
  ordersAffected: number;
  avgWaitDays: number;
}

// Product Backorder Entry
interface ProductBackorder {
  productId: string;
  productName: string;
  sku: string;
  totalBackordered: number;
  ordersAffected: number;
  oldestOrderDate: Date;
  purchaseOrder?: {
    id: string;
    number: string;
    expectedDate: Date;
    status: 'on_order' | 'overdue';
  };
  allocationQueue: BackorderAllocation[];
}

// Backorder Allocation
interface BackorderAllocation {
  position: number;
  orderId: string;
  orderNumber: string;
  customerName: string;
  qtyBackordered: number;
  orderDate: Date;
}

// Backorder Table
interface BackorderTableProps {
  products: ProductBackorder[];
  isLoading: boolean;
  error: Error | null;
  expandedProductId?: string;
  onExpandProduct: (productId: string | null) => void;
  onViewOrder: (orderId: string) => void;
  onViewPO: (poId: string) => void;
}

// Backorder Item (for order detail)
interface BackorderItemStatusProps {
  item: OrderItemWithBackorderStatus;
  showQueuePosition?: boolean;
}

interface OrderItemWithBackorderStatus {
  id: string;
  productName: string;
  sku: string;
  qtyOrdered: number;
  qtyAllocated: number;
  qtyBackordered: number;
  backorderExpectedDate?: Date;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  queuePosition?: number;
  totalInQueue?: number;
}

// PO Status Badge
interface POStatusBadgeProps {
  status: 'on_order' | 'not_ordered' | 'overdue';
  poNumber?: string;
  expectedDate?: Date;
  onViewPO?: () => void;
  onCreatePO?: () => void;
}

// Summary Metrics Card
interface BackorderMetricsProps {
  summary: BackorderSummary;
  isLoading: boolean;
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/routes/_authed/reports/backorders.tsx` | Backorder report page |
| `src/components/domain/orders/backorder-table.tsx` | Expandable product table |
| `src/components/domain/orders/backorder-item.tsx` | Order detail backorder display |
| `src/components/domain/orders/po-status-badge.tsx` | PO status indicator |
| `src/components/domain/orders/backorder-metrics.tsx` | Summary metrics cards |
| `src/components/domain/orders/items-tab.tsx` | Enhanced with backorder status |

---

## Related Wireframes

- [DOM-ORD-001c: Shipment Tracking UI](./DOM-ORD-001c.wireframe.md)
- [DOM-ORD-003c: Partial Shipments UI](./DOM-ORD-003c.wireframe.md)
- [DOM-ORD-007: Fulfillment Dashboard](./DOM-ORD-007.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
