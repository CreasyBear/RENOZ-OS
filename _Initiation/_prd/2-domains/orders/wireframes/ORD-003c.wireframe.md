# Wireframe: DOM-ORD-003c - Partial Shipments UI

## Story Reference

- **Story ID**: DOM-ORD-003c
- **Name**: Partial Shipments: UI
- **PRD**: memory-bank/prd/domains/orders.prd.json
- **Type**: UI Component
- **Component Type**: FormDialog with quantity selectors and status display

## Overview

Enhanced ship order dialog that allows item-level quantity selection for partial shipments. Shows shipped vs remaining quantities per line item with visual progress indicators. Items tab displays shipment status per item with color-coded indicators.

## UI Patterns (Reference Implementation)

### Stepper Component
- **Pattern**: RE-UI Stepper
- **Reference**: `_reference/.reui-reference/registry/default/ui/stepper.tsx`
- **Features**:
  - Horizontal/vertical orientation for partial ship flow
  - Step indicators (active/completed/inactive)
  - Keyboard navigation (arrows, home, end)

### Data Grid
- **Pattern**: RE-UI DataGrid
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Item selection table with qty steppers per row
  - Checkbox selection for items to ship
  - Responsive collapse to cards on mobile

### Quantity Stepper
- **Pattern**: Number input with increment/decrement
- **Reference**: `_reference/.reui-reference/registry/default/ui/number-field.tsx`
- **Features**:
  - Increment/decrement controls
  - Validation against available qty
  - Max limit enforcement

### Progress Bar
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Item ship progress (0%, 30% partial, 100% shipped)
  - Color gradients based on completion
  - Accessible value announcement

### Status Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - States: Not Shipped (gray), Partial (amber), Fully Shipped (green)
  - Light/outline variants

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | orders, orderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-ORD-003c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Ship Order Dialog with Item Selection (Bottom Sheet)

```
+=========================================+
| ====================================    | <- Drag handle
|                                         |
|  SHIP ORDER                      [X]    |
|  Order #ORD-2024-0156                   |
|  ───────────────────────────────────    |
|                                         |
|  CARRIER & TRACKING                     |
|  +-------------------------------------+|
|  | [truck] AusPost                 [v] ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | Tracking number *                   ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  SELECT ITEMS TO SHIP                   |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System (SKU: WGT-001)          ||
|  |  ───────────────────────────────    ||
|  |  Ordered: 10  |  Shipped: 3         ||
|  |  Remaining: 7                       ||
|  |                                     ||
|  |  Qty to Ship:                       ||
|  |  +----+ +---+ +----+                ||
|  |  | [-]| | 7 | | [+]|                || <- Stepper, max=7
|  |  +----+ +---+ +----+                ||
|  |                                     ||
|  |  [====|======      ] 30% shipped    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  5kW Hybrid Inverter (SKU: GDG-002)         ||
|  |  ───────────────────────────────    ||
|  |  Ordered: 5   |  Shipped: 0         ||
|  |  Remaining: 5                       ||
|  |                                     ||
|  |  Qty to Ship:                       ||
|  |  +----+ +---+ +----+                ||
|  |  | [-]| | 5 | | [+]|                ||
|  |  +----+ +---+ +----+                ||
|  |                                     ||
|  |  [                 ] 0% shipped     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  Battery Cable Kit (SKU: CON-003)       ||
|  |  ───────────────────────────────    ||
|  |  Ordered: 20  |  Shipped: 20        ||
|  |  [Fully Shipped]                    || <- Green badge
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  SHIPMENT SUMMARY                       |
|  Items: 2 items (12 units)              |
|  Remaining after: 0 units               |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         [CREATE SHIPMENT]           ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Item Ship Card States

```
+-- NOT SHIPPED (Gray) ----------------------+
|  +----------------------------------------+|
|  |  10kWh LFP Battery System (SKU: WGT-001)             ||
|  |  Ordered: 10  |  Shipped: 0            ||
|  |  Remaining: 10                         ||
|  |                                        ||
|  |  Qty to Ship:  [-] | 10 | [+]          ||
|  |                                        ||
|  |  [                      ] 0% shipped   || <- Gray progress
|  +----------------------------------------+|
|  Border-left: 4px solid gray-300           |
+--------------------------------------------+

+-- PARTIAL (Yellow/Amber) ------------------+
|  +----------------------------------------+|
|  |  10kWh LFP Battery System (SKU: WGT-001)             ||
|  |  Ordered: 10  |  Shipped: 3            ||
|  |  Remaining: 7                          ||
|  |                                        ||
|  |  Qty to Ship:  [-] | 7 | [+]           ||
|  |                                        ||
|  |  [========         ] 30% shipped       || <- Yellow progress
|  +----------------------------------------+|
|  Border-left: 4px solid amber-500          |
+--------------------------------------------+

+-- FULLY SHIPPED (Green) -------------------+
|  +----------------------------------------+|
|  |  Battery Cable Kit (SKU: CON-003)          ||
|  |  Ordered: 20  |  Shipped: 20           ||
|  |                                        ||
|  |  [Fully Shipped]                       || <- Green badge
|  |                                        ||
|  |  [====================] 100% shipped   || <- Green progress
|  +----------------------------------------+|
|  Border-left: 4px solid green-500          |
|  Background: green-50                       |
+--------------------------------------------+
```

### All Items Shipped State

```
+=========================================+
| ====================================    |
|                                         |
|  SHIP ORDER                      [X]    |
|  Order #ORD-2024-0156                   |
|  ───────────────────────────────────    |
|                                         |
|                                         |
|            +-------------+              |
|            |    [check]  |              |
|            |     ~~~     |              |
|            +-------------+              |
|                                         |
|        ALL ITEMS SHIPPED                |
|                                         |
|   All items in this order have          |
|   been shipped. No remaining            |
|   items to ship.                        |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |       [VIEW SHIPMENTS]      |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### Quantity Validation Error

```
+-------------------------------------+
|  10kWh LFP Battery System (SKU: WGT-001)          |
|  Ordered: 10  |  Shipped: 3         |
|  Remaining: 7                       |
|                                     |
|  Qty to Ship:                       |
|  +----+ +----+ +----+               |
|  | [-]| | 10 | | [+]|               | <- Invalid value
|  +----+ +----+ +----+               |
|  [!] Cannot exceed remaining (7)    | <- Error message
|                                     |
+-------------------------------------+
```

---

## Tablet Wireframe (768px)

### Ship Dialog with Item Table

```
+=====================================================================+
|                                                                      |
|   +--------------------------------------------------------------+   |
|   | Ship Order - #ORD-2024-0156                              [X] |   |
|   +--------------------------------------------------------------+   |
|   |                                                              |   |
|   |  +-- CARRIER INFO ----+  +-- TRACKING -----------------+     |   |
|   |  |                    |  |                             |     |   |
|   |  |  Carrier *         |  |  Tracking Number *          |     |   |
|   |  |  [AusPost    v]    |  |  [___________________]      |     |   |
|   |  |                    |  |                             |     |   |
|   |  +--------------------+  +-----------------------------+     |   |
|   |                                                              |   |
|   |  ──────────────────────────────────────────────────────────  |   |
|   |                                                              |   |
|   |  SELECT ITEMS TO SHIP                                        |   |
|   |                                                              |   |
|   |  +----------------------------------------------------------+|   |
|   |  | Item              | Ordered | Shipped | Remaining | Ship ||   |
|   |  +----------------------------------------------------------+|   |
|   |  | 10kWh LFP Battery System        |    10   |    3    |     7     | [-]7[+]|   |
|   |  | WGT-001           | [====   30%               ]   |       ||   |
|   |  +----------------------------------------------------------+|   |
|   |  | 5kW Hybrid Inverter       |     5   |    0    |     5     | [-]5[+]|   |
|   |  | GDG-002           | [       0%                ]   |       ||   |
|   |  +----------------------------------------------------------+|   |
|   |  | Battery Cable Kit     |    20   |   20    |     0     | Done  ||   |
|   |  | CON-003           | [=================100%    ]   | [grn] ||   |
|   |  +----------------------------------------------------------+|   |
|   |                                                              |   |
|   |  Summary: Shipping 12 units across 2 items                   |   |
|   |                                                              |   |
|   +--------------------------------------------------------------+   |
|   |                        ( Cancel )   [ Create Shipment ]      |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+=====================================================================+
```

### Items Tab - Ship Status Display

```
+=====================================================================+
| < Back | Order #ORD-2024-0156 - Brisbane Solar       [Print] [Actions v]  |
+---------------------------------------------------------------------+
| [Items] [Fulfillment] [Activity] [Amendments]                        |
| =======                                                              |
+---------------------------------------------------------------------+
|                                                                      |
|  ORDER ITEMS                                        [Ship Selected]  |
|  ─────────────────────────────────────────────────────────────────   |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | [ ] | Product        | Qty | Shipped | Status       | $ Each   | |
|  +----------------------------------------------------------------+ |
|  | [ ] | 10kWh LFP Battery System     | 10  | 3 / 10  | [Partial]    | $125.00  | |
|  |     | WGT-001        |     | [===30%          ]     |          | |
|  |     | Shipment: AP123456789AU (Jan 8)              |          | |
|  +----------------------------------------------------------------+ |
|  | [ ] | 5kW Hybrid Inverter    | 5   | 0 / 5   | [Not Shipped]| $89.00   | |
|  |     | GDG-002        |     | [       0%       ]     |          | |
|  +----------------------------------------------------------------+ |
|  | [x] | Battery Cable Kit  | 20  | 20 / 20 | [Shipped]    | $12.50   | |
|  |     | CON-003        |     | [======100%======]     |          | |
|  |     | Shipments: ST987654321 (Jan 7), DHL123 (Jan 8)|          | |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  LEGEND: [===] Partial   [   ] Not Shipped   [===] Fully Shipped    |
|                                                                      |
+=====================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Ship Dialog with Item Selection

```
+===================================================================================================+
|                                                                                                   |
|     +-------------------------------------------------------------------------------------+       |
|     | Ship Order - #ORD-2024-0156                                                    [X] |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                                                                     |       |
|     |  +-- SHIPPING DETAILS -------------------------------------------------------------+|       |
|     |  |                                                                                 ||       |
|     |  |  Carrier *                   Tracking Number *            Est. Delivery         ||       |
|     |  |  +------------------+        +--------------------+       +---------------+     ||       |
|     |  |  | AusPost       v |        |                    |       | [cal] Jan 12  |     ||       |
|     |  |  +------------------+        +--------------------+       +---------------+     ||       |
|     |  |                                                                                 ||       |
|     |  +---------------------------------------------------------------------------------+|       |
|     |                                                                                     |       |
|     |  +-- SELECT ITEMS TO SHIP --------------------------------------------------------+|       |
|     |  |                                                                                 ||       |
|     |  |  +-- Quick Actions ----------------+   Ship All Remaining: [Select All]        ||       |
|     |  |                                                                                 ||       |
|     |  |  +---------------------------------------------------------------------------+ ||       |
|     |  |  |   | Product           | SKU      | Ordered | Shipped | Remain | Qty to Ship| ||       |
|     |  |  +---------------------------------------------------------------------------+ ||       |
|     |  |  | > | 10kWh LFP Battery System        | WGT-001  |   10    |    3    |   7    |  [-] 7 [+] | ||       |
|     |  |  |   | [========            ] 30% shipped                         |  Max: 7   | ||       |
|     |  |  |   | Last shipped: Jan 8 via AusPost (AP123456789AU)                        | ||       |
|     |  |  +---------------------------------------------------------------------------+ ||       |
|     |  |  | > | 5kW Hybrid Inverter       | GDG-002  |    5    |    0    |   5    |  [-] 5 [+] | ||       |
|     |  |  |   | [                    ] 0% shipped - Not yet shipped        |  Max: 5   | ||       |
|     |  |  +---------------------------------------------------------------------------+ ||       |
|     |  |  |   | Battery Cable Kit     | CON-003  |   20    |   20    |   0    |   Done     | ||       |
|     |  |  |   | [====================] 100% shipped                        |  [green]  | ||       |
|     |  |  |   | Shipped via: ST987654321 (10), DHL1234567890 (10)                      | ||       |
|     |  |  +---------------------------------------------------------------------------+ ||       |
|     |  |  | > | High-Current DC Cable     | CBL-004  |    8    |    2    |   6    |  [-] 6 [+] | ||       |
|     |  |  |   | [====                ] 25% shipped                         |  Max: 6   | ||       |
|     |  |  +---------------------------------------------------------------------------+ ||       |
|     |  |                                                                                 ||       |
|     |  +---------------------------------------------------------------------------------+|       |
|     |                                                                                     |       |
|     |  +-- SHIPMENT SUMMARY ------------------------------------------------------------+|       |
|     |  |                                                                                 ||       |
|     |  |  Items in this shipment: 3                    Units: 18                         ||       |
|     |  |  Remaining after shipment: 0 items            Units: 0                          ||       |
|     |  |  Order will be: [Fully Shipped] after this shipment                             ||       |
|     |  |                                                                                 ||       |
|     |  +---------------------------------------------------------------------------------+|       |
|     |                                                                                     |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                          ( Cancel )    [ Create Shipment ]          |       |
|     +-------------------------------------------------------------------------------------+       |
|                                                                                                   |
+===================================================================================================+
```

### Items Tab - Full Status View

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
|             |  =======                                                                            |
|             |                                                                                     |
|             |  +-- ORDER ITEMS -----------------------------------------------------------------+  |
|             |  |                                                                                |  |
|             |  |  FULFILLMENT STATUS                                            [Ship Items]   |  |
|             |  |  ─────────────────────────────────────────────────────────────────────────    |  |
|             |  |  Total Items: 4   |   Fully Shipped: 1   |   Partial: 2   |   Not Shipped: 1  |  |
|             |  |                                                                                |  |
|             |  |  +--------------------------------------------------------------------------+ |  |
|             |  |  |   | Product        | SKU     | Qty | Unit $  | Total   | Ship Status     | |  |
|             |  |  +--------------------------------------------------------------------------+ |  |
|             |  |  |   | 10kWh LFP Battery System     | WGT-001 | 10  | $125.00 | $1,250  | [Partial] 3/10  | |  |
|             |  |  |   |                |         |     |         |         | [====   30%   ] | |  |
|             |  |  |   | SHIPMENTS:                                                           | |  |
|             |  |  |   | - AP123456789AU (AusPost) - 3 units - Jan 8                          | |  |
|             |  |  +--------------------------------------------------------------------------+ |  |
|             |  |  |   | 5kW Hybrid Inverter    | GDG-002 | 5   | $89.00  | $445    | [Not Shipped]   | |  |
|             |  |  |   |                |         |     |         |         | [      0%     ] | |  |
|             |  |  +--------------------------------------------------------------------------+ |  |
|             |  |  |   | Battery Cable Kit  | CON-003 | 20  | $12.50  | $250    | [Shipped] 20/20 | |  |
|             |  |  |   |                |         |     |         |         | [=====100%====] | |  |
|             |  |  |   | SHIPMENTS:                                                           | |  |
|             |  |  |   | - ST987654321 (StarTrack) - 10 units - Jan 7 [Delivered]             | |  |
|             |  |  |   | - DHL1234567890 (DHL) - 10 units - Jan 8 [In Transit]                | |  |
|             |  |  +--------------------------------------------------------------------------+ |  |
|             |  |  |   | High-Current DC Cable  | CBL-004 | 8   | $35.00  | $280    | [Partial] 2/8   | |  |
|             |  |  |   |                |         |     |         |         | [==    25%    ] | |  |
|             |  |  |   | SHIPMENTS:                                                           | |  |
|             |  |  |   | - AP987654321AU (AusPost) - 2 units - Jan 9 [In Transit]             | |  |
|             |  |  +--------------------------------------------------------------------------+ |  |
|             |  |                                                                                |  |
|             |  +--------------------------------------------------------------------------------+  |
|             |                                                                                     |
+-------------+-------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
LOADING ITEM STATUS:
+-------------------------------------+
|  SELECT ITEMS TO SHIP               |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  | [shimmer~~~~~~~~]  [shimmer]  |  |
|  | [shimmer~~~~~~~~~~~~~~]       |  |
|  +-------------------------------+  |
|                                     |
|  +-------------------------------+  |
|  | [shimmer~~~~~~~~~~~~~~~~]     |  |
|  | [shimmer~~~~~~~~]  [shimmer]  |  |
|  +-------------------------------+  |
+-------------------------------------+

SUBMITTING SHIPMENT:
+-------------------------------------+
|                                     |
|  +-------------------------------+  |
|  |                               |  |
|  |  [spinner]                    |  |
|  |  Creating shipment...         |  |
|  |                               |  |
|  |  Processing 3 items           |  |
|  |  [========          ] 60%     |  |
|  |                               |  |
|  +-------------------------------+  |
|                                     |
|  Cancel button available            |
+-------------------------------------+
```

### Error States

```
QUANTITY EXCEEDED:
+-------------------------------------+
|  10kWh LFP Battery System (SKU: WGT-001)          |
|  Ordered: 10  |  Shipped: 3         |
|  Remaining: 7                       |
|                                     |
|  Qty to Ship:                       |
|  +----+ +----+ +----+               |
|  | [-]| | 10 | | [+]|               | <- Red border
|  +----+ +----+ +----+               |
|  [!] Maximum available: 7           |
+-------------------------------------+

INSUFFICIENT STOCK:
+-------------------------------------+
|  10kWh LFP Battery System (SKU: WGT-001)          |
|  Ordered: 10  |  Shipped: 3         |
|  Remaining: 7                       |
|                                     |
|  [!] Only 5 units in stock          | <- Warning banner
|                                     |
|  Qty to Ship:                       |
|  +----+ +---+ +----+                |
|  | [-]| | 5 | | [+]|                | <- Capped at stock
|  +----+ +---+ +----+                |
+-------------------------------------+

SHIPMENT FAILED:
+=========================================+
|  [!] Shipment Creation Failed           |
|                                         |
|  Could not create shipment. Some        |
|  items may have been shipped by         |
|  another user.                          |
|                                         |
|  [Refresh & Retry]  [Cancel]            |
+=========================================+
```

### Success States

```
PARTIAL SHIPMENT CREATED:
+=========================================+
|  [check] Shipment Created               |
|                                         |
|  12 units shipped across 2 items        |
|  Tracking: AP123456789AU                |
|                                         |
|  Remaining to ship: 6 units             |
|                                         |
|              <- Auto-dismiss 5s         |
+=========================================+

ORDER FULLY SHIPPED:
+=========================================+
|  [check] Order Fully Shipped!           |
|                                         |
|  All items have been shipped.           |
|  Order status updated to Shipped.       |
|                                         |
|              <- Celebration animation   |
+=========================================+
```

---

## Accessibility Notes

### Focus Order

1. **Ship Dialog**
   - Carrier dropdown
   - Tracking number input
   - Estimated delivery date
   - For each item: Quantity decrement, quantity input, quantity increment
   - Cancel button
   - Submit button

2. **Items Tab**
   - Tab through items
   - Each item expandable to show shipment history
   - Ship button focus after item section

### ARIA Requirements

```html
<!-- Ship Dialog Item List -->
<div role="list" aria-label="Items available to ship">
  <div
    role="listitem"
    aria-label="10kWh LFP Battery System, 7 remaining to ship"
  >
    <!-- Item content -->

    <!-- Quantity Input Group -->
    <div role="group" aria-labelledby="qty-label-1">
      <span id="qty-label-1" class="sr-only">
        Quantity to ship for 10kWh LFP Battery System
      </span>

      <button
        aria-label="Decrease quantity"
        aria-disabled="false"
      >
        -
      </button>

      <input
        type="number"
        aria-label="Quantity to ship"
        aria-valuemin="0"
        aria-valuemax="7"
        aria-valuenow="7"
        aria-describedby="qty-help-1"
      />

      <button
        aria-label="Increase quantity"
        aria-disabled="true"
      >
        +
      </button>

      <span id="qty-help-1" class="sr-only">
        Maximum available: 7 units
      </span>
    </div>

    <!-- Progress Bar -->
    <div
      role="progressbar"
      aria-valuenow="30"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="30% shipped, 3 of 10 units"
    >
    </div>
  </div>
</div>

<!-- Status Badge -->
<span
  role="status"
  aria-label="Shipment status: Partially shipped, 3 of 10 units"
  class="badge-amber"
>
  Partial
</span>

<!-- Items Tab Ship Status -->
<table aria-label="Order items with shipment status">
  <thead>
    <tr>
      <th scope="col">Product</th>
      <th scope="col">SKU</th>
      <th scope="col">Quantity</th>
      <th scope="col">Shipped</th>
      <th scope="col">Ship Status</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="10kWh LFP Battery System: 3 of 10 shipped, partial">
      <!-- Row content -->
    </tr>
  </tbody>
</table>
```

### Screen Reader Announcements

- Dialog opened: "Ship Order dialog. Select items and quantities to ship."
- Quantity changed: "Quantity to ship for 10kWh LFP Battery System: 5. Maximum available: 7."
- Validation error: "Error: Quantity exceeds maximum available of 7."
- Shipment summary: "Shipment summary: 12 units across 2 items."
- Success: "Shipment created. 12 units shipped. 6 units remaining."
- Order complete: "All items shipped. Order marked as fully shipped."

---

## Animation Choreography

### Quantity Stepper

```
INCREMENT/DECREMENT:
- Duration: 100ms
- Number scale: 1 -> 1.1 -> 1
- Color flash on change
- Progress bar width transition: 200ms

MAX/MIN REACHED:
- Duration: 200ms
- Button shake animation (disabled)
- Flash red border on input
```

### Progress Bar Updates

```
PROGRESS CHANGE:
- Duration: 300ms
- Easing: ease-out
- Width transition smooth
- Color gradient shift (gray -> amber -> green)

100% COMPLETE:
- Duration: 400ms
- Green pulse animation
- Checkmark appear in progress bar
- Badge flash to "Shipped"
```

### Item Selection

```
ITEM EXPAND (desktop):
- Duration: 200ms
- Height expand
- Shipment history fade in

ITEM HIGHLIGHT:
- Duration: 150ms
- Background color transition
- Border color transition
```

### Submission Flow

```
PROCESSING:
- Duration: Variable
- Per-item progress indication
- Checkmarks appear as items processed

SUCCESS - PARTIAL:
- Duration: 400ms
- Green toast slide
- Item cards update status
- Progress bars animate

SUCCESS - COMPLETE:
- Duration: 600ms
- Confetti animation (subtle)
- "Fully Shipped" badge animate in
- Green pulse on entire dialog
```

---

## Component Props Interfaces

```typescript
// Ship Order Dialog (Enhanced)
interface ShipOrderDialogProps {
  open: boolean;
  orderId: string;
  orderNumber: string;
  orderItems: OrderItemWithShipStatus[];
  onClose: () => void;
  onSubmit: (shipment: PartialShipmentInput) => Promise<void>;
  isSubmitting: boolean;
}

// Order Item with Ship Status
interface OrderItemWithShipStatus {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  qtyOrdered: number;
  qtyShipped: number;
  qtyRemaining: number;
  unitPrice: number;
  lineTotal: number;
  shipments: ItemShipmentRecord[];
}

// Item Shipment Record
interface ItemShipmentRecord {
  shipmentId: string;
  carrier: string;
  trackingNumber: string;
  qtyShipped: number;
  shippedAt: Date;
  status: 'in_transit' | 'delivered' | 'exception';
}

// Partial Shipment Input
interface PartialShipmentInput {
  carrier: CarrierType;
  trackingNumber: string;
  estimatedDelivery?: Date;
  notes?: string;
  items: {
    orderItemId: string;
    qtyToShip: number;
  }[];
}

// Item Ship Selector (within dialog)
interface ItemShipSelectorProps {
  item: OrderItemWithShipStatus;
  qtyToShip: number;
  onQtyChange: (qty: number) => void;
  error?: string;
  disabled?: boolean;
}

// Quantity Stepper
interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

// Item Ship Status Badge
interface ItemShipStatusBadgeProps {
  qtyOrdered: number;
  qtyShipped: number;
  size?: 'sm' | 'md';
}

// Item Ship Progress Bar
interface ItemShipProgressProps {
  qtyOrdered: number;
  qtyShipped: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

// Items Tab Ship Status Column
interface ItemsTabShipStatusProps {
  items: OrderItemWithShipStatus[];
  onShipItems: (itemIds: string[]) => void;
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/domain/orders/ship-order-dialog.tsx` | Enhanced with item selection |
| `src/components/domain/orders/item-ship-selector.tsx` | Item qty selector component |
| `src/components/domain/orders/quantity-stepper.tsx` | Qty +/- stepper input |
| `src/components/domain/orders/item-ship-status.tsx` | Status badge and progress |
| `src/components/domain/orders/items-tab.tsx` | Enhanced with ship status |

---

## Related Wireframes

- [DOM-ORD-001c: Shipment Tracking UI](./DOM-ORD-001c.wireframe.md)
- [DOM-ORD-002c: Delivery Confirmation UI](./DOM-ORD-002c.wireframe.md)
- [DOM-ORD-007: Fulfillment Dashboard](./DOM-ORD-007.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
