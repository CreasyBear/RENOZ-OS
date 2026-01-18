# Wireframe: DOM-ORD-001c - Shipment Tracking UI

## Story Reference

- **Story ID**: DOM-ORD-001c
- **Name**: Shipment Tracking: UI
- **PRD**: memory-bank/prd/domains/orders.prd.json
- **Type**: UI Component
- **Component Type**: DataTable with responsive layouts

## Overview

Display shipment tracking information within order detail views. Shows all shipments for an order with carrier information, tracking numbers (clickable), shipped dates, and delivery status. Supports multiple carriers with deep-linking to external tracking pages.

---

## UI Patterns (Reference Implementation)

### Data Table
- **Pattern**: RE-UI DataGrid
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Status column with StatusBadge component
  - Sortable by date, carrier, status
  - Responsive collapse to cards on mobile

### Status Badge
- **Pattern**: Semantic status badges
- **Reference**: `renoz-v3/src/components/ui/status-badge.tsx`
- **Features**:
  - Shipment status colors from design system
  - States: In Transit (blue), Out for Delivery (amber), Delivered (green), Exception (red)

### Timeline (Delivery Tracking)
- **Pattern**: Midday timeline
- **Reference**: `.square-ui-reference/templates/tasks/`
- **Features**:
  - Carrier integration status
  - Map preview if available
  - Delivery proof photos

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | orders, orderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-ORD-001c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/solar manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Order Types**: Battery system orders, Inverter orders, Solar panel installations
- **Typical Values**: Residential ($5K-$20K), Commercial ($50K-$500K)
- **Products**: Tesla Powerwall 2, Pylontech US5000, Fronius Primo 8.2kW

---

## Mobile Wireframe (375px)

### Shipment List - Cards View

```
+=========================================+
| < Order #ORD-2024-0156           [...]  |
| Brisbane Solar Co                       |
+-----------------------------------------+
| [Items] [Fulfillment] [Activity] [Amend]|
|         ==============                  |
+-----------------------------------------+
|                                         |
|  SHIPMENTS                              |
|  ────────────────────────────────────   |
|                                         |
|  +-------------------------------------+|
|  |  [truck]  AusPost                   ||
|  |  ────────────────────────────────   ||
|  |                                     ||
|  |  Tracking: AP123456789AU            ||
|  |  [Track Package ->]                 || <- Opens carrier site
|  |                                     ||
|  |  Shipped: 08/01/2026  2:30 PM       ||
|  |  By: Mike Johnson                   ||
|  |                                     ||
|  |  Items: 2x Tesla Powerwall 2        ||
|  |  Notes: Fragile - Lithium batteries ||
|  |        Requires forklift delivery   ||
|  |                                     ||
|  |  Status: [In Transit]               || <- Blue badge
|  |  Est. Delivery: 10/01/2026          ||
|  |                                     ||
|  |  [Mark Delivered]                   || <- Primary action
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [truck]  StarTrack                 ||
|  |  ────────────────────────────────   ||
|  |                                     ||
|  |  Tracking: ST987654321              ||
|  |  [Track Package ->]                 ||
|  |                                     ||
|  |  Shipped: 07/01/2026  10:15 AM      ||
|  |  By: Sarah Chen                     ||
|  |                                     ||
|  |  Items: 3x Pylontech US5000         ||
|  |  Notes: UN3481 Class 9 Hazmat       ||
|  |        Do not stack >2 pallets      ||
|  |                                     ||
|  |  Status: [Delivered]                || <- Green badge
|  |  Delivered: 09/01/2026  3:45 PM     ||
|  |                                     ||
|  |  [sig] [cam] [photo]                || <- Proof icons
|  |  [View Delivery Proof]              ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|        +---------------------+          |
|        |   [+] ADD SHIPMENT  |          | <- 56px FAB
|        +---------------------+          |
|                                         |
+=========================================+
```

### Shipment Card States

```
+-- IN TRANSIT ------------------------------+
|  +----------------------------------------+|
|  |  [truck]  AusPost                      ||
|  |                                        ||
|  |  Tracking: AP123456789AU               ||
|  |  [Track Package ->]                    ||
|  |                                        ||
|  |  Items: 2x Tesla Powerwall 2           ||
|  |  Notes: Fragile - Lithium batteries    ||
|  |        Temperature sensitive 10-35°C   ||
|  |                                        ||
|  |  Status: [In Transit]                  || <- Blue badge
|  |  Est. Delivery: 10/01/2026             ||
|  |                                        ||
|  |  [Mark Delivered]                      ||
|  +----------------------------------------+|
|  Border-left: 4px solid blue-500           |
+--------------------------------------------+

+-- DELIVERED -------------------------------+
|  +----------------------------------------+|
|  |  [truck]  StarTrack                    ||
|  |                                        ||
|  |  Tracking: ST987654321                 ||
|  |  [Track Package ->]                    ||
|  |                                        ||
|  |  Items: 3x Pylontech US5000            ||
|  |  Compliance: UN3481 Class 9 Hazmat     ||
|  |                                        ||
|  |  Status: [Delivered]                   || <- Green badge
|  |  Delivered: 09/01/2026  3:45 PM        ||
|  |                                        ||
|  |  [sig] [cam] [photo] <- Has proof      ||
|  |  [View Delivery Proof]                 ||
|  +----------------------------------------+|
|  Border-left: 4px solid green-500          |
+--------------------------------------------+

+-- OUT FOR DELIVERY ------------------------+
|  +----------------------------------------+|
|  |  [truck]  DHL                          ||
|  |                                        ||
|  |  Tracking: DHL1234567890               ||
|  |  [Track Package ->]                    ||
|  |                                        ||
|  |  Items: 1x Fronius Primo 8.2kW         ||
|  |  Notes: Installation location photo    ||
|  |        required on delivery            ||
|  |                                        ||
|  |  Status: [Out for Delivery]            || <- Amber badge
|  |  Est. Delivery: Today                  ||
|  |                                        ||
|  |  [Mark Delivered]                      ||
|  +----------------------------------------+|
|  Border-left: 4px solid amber-500          |
+--------------------------------------------+
```

### Ship Order Dialog (Bottom Sheet)

```
+=========================================+
| ====================================    | <- Drag handle
|                                         |
|  CREATE SHIPMENT               [X]      |
|  Order #ORD-2024-0156                   |
|  ───────────────────────────────────    |
|                                         |
|  Carrier *                              |
|  +-------------------------------------+|
|  | [truck] Select carrier...       [v] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ( ) AusPost                         ||
|  | ( ) StarTrack                       ||
|  | ( ) TNT                             ||
|  | ( ) DHL                             ||
|  | ( ) FedEx                           ||
|  | ( ) UPS                             ||
|  | ( ) Other                           ||
|  +-------------------------------------+|
|                                         |
|  Tracking Number *                      |
|  +-------------------------------------+|
|  | Enter tracking number               ||
|  +-------------------------------------+|
|                                         |
|  Estimated Delivery                     |
|  +-------------------------------------+|
|  | [cal] Select date (DD/MM/YYYY)      ||
|  +-------------------------------------+|
|                                         |
|  Shipment Notes                         |
|  +-------------------------------------+|
|  |                                     ||
|  | Hazmat/handling notes...            ||
|  | - Fragile - Lithium batteries       ||
|  | - Requires forklift delivery        ||
|  | - Temperature sensitive 10-35°C     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         [CREATE SHIPMENT]           || <- 56px button
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
|                                         |
|  SHIPMENTS                              |
|  ────────────────────────────────────   |
|                                         |
|                                         |
|            +-------------+              |
|            |   [truck]   |              |
|            |    ~~~      |              |
|            +-------------+              |
|                                         |
|         NO SHIPMENTS YET                |
|                                         |
|   Create a shipment to track           |
|   delivery of this order                |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |    [+] CREATE FIRST         |       |
|   |        SHIPMENT             |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
|                                         |
|  SHIPMENTS                              |
|  ────────────────────────────────────   |
|                                         |
|  +-------------------------------------+|
|  |  [.] .................              ||
|  |      .............                  ||
|  |                                     ||
|  |      ..................             ||
|  |      ...........                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [.] .................              ||
|  |      .............                  ||
|  |                                     ||
|  |      ..................             ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Shipment List - Compact View

```
+=====================================================================+
| < Back | Order #ORD-2024-0156 - Brisbane Solar       [Print] [Actions v]  |
+---------------------------------------------------------------------+
| [Items] [Fulfillment] [Activity] [Amendments]                        |
|         ==============                                               |
+---------------------------------------------------------------------+
|                                                                      |
|  +-- ORDER SUMMARY ---------+  +-- SHIPMENT STATUS ----------------+|
|  |                          |  |                                   ||
|  |  Total: $12,450.00 AUD   |  |  Shipments: 2 of 2 shipped        ||
|  |  Items: 8 line items     |  |  Status: Partially Delivered      ||
|  |  Status: [Shipped]       |  |  Next Est: 10/01/2026             ||
|  |                          |  |                                   ||
|  +--------------------------+  +-----------------------------------+|
|                                                                      |
|  SHIPMENTS                                        [+ Add Shipment]   |
|  ─────────────────────────────────────────────────────────────────   |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Carrier    | Tracking          | Shipped      | Status    | [] | |
|  +----------------------------------------------------------------+ |
|  | AusPost    | AP123456789AU     | 08/01 2:30p  | In Transit| [v]| |
|  |            | [Track ->]        | Mike J.      | Est: 10/01|    | |
|  |            | 2x Tesla Powerwall 2 | Hazmat: Lithium           |    | |
|  +----------------------------------------------------------------+ |
|  | StarTrack  | ST987654321       | 07/01 10:15a | Delivered | [v]| |
|  |            | [Track ->]        | Sarah C.     | [sig][cam]|    | |
|  |            | 3x Pylontech US5000 | UN3481 Class 9             |    | |
|  +----------------------------------------------------------------+ |
|                                                                      |
+=====================================================================+
```

### Expanded Row Detail

```
+=====================================================================+
|  +----------------------------------------------------------------+ |
|  | v AusPost    | AP123456789AU     | 08/01 2:30p | In Transit   | |
|  +----------------------------------------------------------------+ |
|  |                                                                 | |
|  |   Shipped By: Mike Johnson                                      | |
|  |   Estimated Delivery: 10/01/2026                                | |
|  |   Notes: Fragile - Lithium batteries                            | |
|  |         Requires forklift delivery                              | |
|  |         Temperature sensitive - store 10-35°C                   | |
|  |                                                                 | |
|  |   Items in this shipment:                                       | |
|  |   - 2x Tesla Powerwall 2                                        | |
|  |                                                                 | |
|  |   [Track on AusPost]  [Mark Delivered]  [Edit]                  | |
|  |                                                                 | |
|  +----------------------------------------------------------------+ |
+=====================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Table View

```
+===================================================================================================+
| Renoz CRM                                                                    [bell] [Joel v]      |
+-------------+-------------------------------------------------------------------------------------+
|             |                                                                                     |
| Dashboard   |  < Back to Orders                                                                   |
| Customers   |                                                                                     |
| Orders  <   |  Order #ORD-2024-0156                              [Print] [Edit] [Actions v]       |
| Products    |  Brisbane Solar Co - Solar Battery Installation                                     |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────      |
| Pipeline    |                                                                                     |
| Support     |  [Items] [Fulfillment] [Activity] [Amendments]                                      |
|             |         ==============                                                              |
|             |                                                                                     |
|             |  +-- SHIPMENTS ----------------------------------------------------------------+    |
|             |  |                                                           [+ Add Shipment]  |    |
|             |  |                                                                             |    |
|             |  |  +-----------------------------------------------------------------------+  |    |
|             |  |  |   | Carrier    | Tracking        | Shipped         | Est.Del  | Status     |  |
|             |  |  +-----------------------------------------------------------------------+  |    |
|             |  |  | > | AusPost    | AP123456789AU   | 08/01/2026      | 10/01    | In Transit |  |
|             |  |  |   |            | [Track ->]      | 2:30 PM         |          | [blue]     |  |
|             |  |  |   |            | 2x Tesla Powerwall 2                 |          |            |  |
|             |  |  |   |            | by Mike Johnson | Hazmat: Lithium  |          |            |  |
|             |  |  +-----------------------------------------------------------------------+  |    |
|             |  |  | > | StarTrack  | ST987654321     | 07/01/2026      | 09/01    | Delivered  |  |
|             |  |  |   |            | [Track ->]      | 10:15 AM        | [sig]    | [green]    |  |
|             |  |  |   |            | 3x Pylontech US5000                  | [cam]    |            |  |
|             |  |  |   |            | by Sarah Chen   | UN3481 Class 9   | [photo]  |            |  |
|             |  |  +-----------------------------------------------------------------------+  |    |
|             |  |  | > | DHL        | DHL9876543210   | 09/01/2026      | 11/01    | Out for    |  |
|             |  |  |   |            | [Track ->]      | 8:00 AM         |          | Delivery   |  |
|             |  |  |   |            | 1x Fronius Primo 8.2kW               |          | [amber]    |  |
|             |  |  |   |            | by Mike Johnson | Install photo req|          |            |  |
|             |  |  +-----------------------------------------------------------------------+  |    |
|             |  |                                                                             |    |
|             |  |  Total Shipments: 3    |    Delivered: 1    |    In Transit: 2             |    |
|             |  |                                                                             |    |
|             |  +-----------------------------------------------------------------------------+    |
|             |                                                                                     |
+-------------+-------------------------------------------------------------------------------------+
```

### Inline Actions Menu

```
+-----------------------------------------------------------------------+
| > | AusPost    | AP123456789AU   | 08/01/2026     | 10/01  | [...]  |
|   |            | [Track ->]      | 2:30 PM        |        |        |
+-----------------------------------------------------------------------+
                                                                  |
                                                   +------------------+
                                                   | [eye] View Details|
                                                   | [pen] Edit        |
                                                   | [check] Mark Delivered|
                                                   | [file] Add Note   |
                                                   | [trash] Delete    |
                                                   +------------------+
```

### Tracking Link Tooltip

```
+-----------------------------------------------------------------------+
| > | AusPost    | AP123456789AU   | 08/01/2026     | 10/01  | ...   |
|   |            | [Track ->]      |                |        |       |
|   |            |     |           |                |        |       |
+-----------------------------------------------------------------------+
                     |
                     v
          +---------------------------+
          | Track on AusPost website  |
          | Opens in new tab          |
          | (Ctrl+Click to open)      |
          +---------------------------+
```

---

## Carrier Configuration

### Supported Carriers

```
+-- CARRIER CONFIG --------------------------------------------------+
|                                                                     |
|  CARRIER         TRACKING URL PATTERN                               |
|  ─────────────────────────────────────────────────────────────────  |
|  AusPost         https://auspost.com.au/track/{trackingNumber}      |
|  StarTrack       https://startrack.com.au/track/{trackingNumber}    |
|  TNT             https://tnt.com/tracking/{trackingNumber}          |
|  DHL             https://dhl.com/track?number={trackingNumber}      |
|  FedEx           https://fedex.com/track?tracknumber={trackingNumber}|
|  UPS             https://ups.com/track?tracknum={trackingNumber}    |
|  Other           N/A (no deep link)                                 |
|                                                                     |
+--------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
SHIPMENT LIST LOADING:
+-------------------------------------+
|  SHIPMENTS                          |
|  ───────────────────────────────    |
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

CREATE SHIPMENT SUBMITTING:
+-------------------------------------+
|                                     |
|  +-------------------------------+  |
|  |                               |  |
|  |    [spinner]  Creating...    |  |
|  |                               |  |
|  +-------------------------------+  |
|                                     |
|  Form fields disabled               |
|  Submit button shows spinner        |
+-------------------------------------+
```

### Error States

```
FAILED TO LOAD SHIPMENTS:
+-------------------------------------+
|  SHIPMENTS                          |
|  ───────────────────────────────    |
|                                     |
|  +-------------------------------+  |
|  |  [!] Couldn't load shipments  |  |
|  |                               |  |
|  |  Unable to retrieve shipment  |  |
|  |  information. Please try      |  |
|  |  again.                       |  |
|  |                               |  |
|  |         [Retry]               |  |
|  +-------------------------------+  |
+-------------------------------------+

SHIPMENT CREATION FAILED:
+-------------------------------------+
|  ================== Toast ========  |
|  [!] Failed to create shipment      |
|                                     |
|  Could not save shipment details.   |
|  Please check your connection.      |
|                                     |
|              [Retry]  [Dismiss]     |
|  ================================== |
+-------------------------------------+

INVALID TRACKING NUMBER:
+-------------------------------------+
|  Tracking Number *                  |
|  +-------------------------------+  |
|  | ABC123                        |  |
|  +-------------------------------+  |
|  [!] Invalid tracking number format |
|      for selected carrier           |
+-------------------------------------+
```

### Success States

```
SHIPMENT CREATED:
+=========================================+
|  [check] Shipment created successfully  |
|                                         |
|  AusPost - AP123456789AU                |
|                                         |
|              <- Toast auto-dismiss 3s   |
+=========================================+

MARKED AS DELIVERED:
+=========================================+
|  [check] Shipment marked as delivered   |
|                                         |
|  Confirm delivery details?              |
|                                         |
|         [Later]  [Add Proof]            |
+=========================================+
```

---

## Accessibility Notes

### Focus Order

1. **Shipment List**
   - Tab: Navigate between shipment cards/rows
   - Enter: Expand row details (desktop) or open detail sheet (mobile)
   - Arrow Up/Down: Navigate within list

2. **Ship Order Dialog**
   - Focus trapped within dialog
   - Tab through: Carrier dropdown, tracking input, date picker, notes, submit
   - Escape: Close dialog
   - Enter: Submit form (when focused on submit)

3. **Tracking Links**
   - Tab to tracking number link
   - Enter: Open carrier tracking page in new tab
   - Screen reader announces "Opens in new tab"

### ARIA Requirements

```html
<!-- Shipment List -->
<section
  role="region"
  aria-label="Order shipments"
>
  <h2 id="shipments-heading">Shipments</h2>

  <ul role="list" aria-labelledby="shipments-heading">
    <li role="listitem" aria-label="AusPost shipment, tracking AP123456789AU, status in transit">
      <!-- Card content -->
    </li>
  </ul>
</section>

<!-- Tracking Link -->
<a
  href="https://auspost.com.au/track/AP123456789AU"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Track shipment AP123456789AU on AusPost (opens in new tab)"
>
  Track Package
  <span class="sr-only">(opens in new tab)</span>
</a>

<!-- Status Badge -->
<span
  role="status"
  aria-label="Shipment status: In Transit, estimated delivery 10th January"
  class="badge-blue"
>
  In Transit
</span>

<!-- Delivery Proof Icons -->
<div aria-label="Delivery proof available: signature and photo on file">
  <span aria-hidden="true">[sig]</span>
  <span aria-hidden="true">[cam]</span>
</div>

<!-- Ship Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="ship-dialog-title"
>
  <h2 id="ship-dialog-title">Create Shipment</h2>
</dialog>
```

### Screen Reader Announcements

- List loaded: "3 shipments loaded. 1 delivered, 2 in transit."
- Shipment created: "Shipment created. AusPost tracking AP123456789AU."
- Marked delivered: "Shipment marked as delivered."
- Error: "Failed to create shipment. Retry button available."
- Link opened: "Opening AusPost tracking in new tab."

---

## Animation Choreography

### Shipment Card Entry

```
NEW SHIPMENT ADDED:
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(-20px) -> translateY(0)
- Opacity: 0 -> 1
- Scale: 0.95 -> 1
- Existing cards shift down: 200ms ease-out
```

### Status Badge Update

```
STATUS CHANGE:
- Duration: 400ms
- Old badge: fade out (150ms)
- New badge: scale in (1.2 -> 1) with color transition
- Background pulse: 300ms
```

### Ship Dialog

```
OPEN (Mobile - Bottom Sheet):
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(100%) -> translateY(0)
- Backdrop: opacity 0 -> 0.5

CLOSE:
- Duration: 200ms
- Easing: ease-in
- Transform: translateY(0) -> translateY(100%)

OPEN (Desktop - Modal):
- Duration: 250ms
- Easing: ease-out
- Transform: scale(0.95) -> scale(1)
- Opacity: 0 -> 1
- Backdrop fade: 200ms
```

### Loading States

```
SKELETON SHIMMER:
- Duration: 1.5s
- Easing: linear
- Animation: gradient sweep left to right
- Loop: infinite

SUBMIT SPINNER:
- Duration: 800ms per rotation
- Easing: linear
- Loop: infinite until complete
```

### Success Feedback

```
CHECKMARK ANIMATION:
- Duration: 400ms
- Path draw: 200ms ease-out
- Circle scale: 300ms bounce
- Green flash on card: 200ms
```

---

## Component Props Interfaces

```typescript
// Shipment List Component
interface ShipmentListProps {
  orderId: string;
  shipments: Shipment[];
  isLoading: boolean;
  error: Error | null;
  onAddShipment: () => void;
  onMarkDelivered: (shipmentId: string) => void;
  onEditShipment: (shipment: Shipment) => void;
  onDeleteShipment: (shipmentId: string) => void;
}

// Individual Shipment Card
interface ShipmentCardProps {
  shipment: Shipment;
  variant: 'card' | 'row' | 'compact';
  expanded?: boolean;
  onToggleExpand?: () => void;
  onTrackClick: (trackingUrl: string) => void;
  onMarkDelivered: () => void;
  onViewProof?: () => void;
  actions?: ShipmentAction[];
}

// Shipment Type
interface Shipment {
  id: string;
  orderId: string;
  carrier: CarrierType;
  trackingNumber: string;
  shippedAt: Date;
  shippedBy: {
    id: string;
    name: string;
  };
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  notes?: string;
  hazmatNotes?: string; // Battery-specific hazmat info
  hasSignature?: boolean;
  hasPhoto?: boolean;
  items?: ShipmentItem[];
}

// Carrier Configuration
type CarrierType = 'auspost' | 'startrack' | 'tnt' | 'dhl' | 'fedex' | 'ups' | 'other';

interface CarrierConfig {
  id: CarrierType;
  name: string;
  trackingUrlPattern: string | null;
  trackingNumberRegex?: RegExp;
  icon: string;
}

// Ship Order Dialog
interface ShipOrderDialogProps {
  open: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSubmit: (shipment: NewShipmentInput) => Promise<void>;
  isSubmitting: boolean;
  availableItems?: OrderItem[]; // For partial shipment selection
}

// New Shipment Input
interface NewShipmentInput {
  carrier: CarrierType;
  trackingNumber: string;
  estimatedDelivery?: Date;
  notes?: string;
  hazmatNotes?: string; // Battery-specific hazmat requirements
  items?: { orderItemId: string; qtyToShip: number }[];
}

// Status Badge
interface ShipmentStatusBadgeProps {
  status: Shipment['status'];
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  size?: 'sm' | 'md' | 'lg';
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/domain/orders/shipment-list.tsx` | Main shipment list component |
| `src/components/domain/orders/shipment-card.tsx` | Individual shipment card display |
| `src/components/domain/orders/shipment-row.tsx` | Table row variant for desktop |
| `src/components/domain/orders/ship-order-dialog.tsx` | Create/edit shipment dialog |
| `src/components/domain/orders/carrier-config.ts` | Carrier URL patterns and config |
| `src/components/domain/orders/shipment-status-badge.tsx` | Status badge component |
| `src/components/domain/orders/fulfillment-tab.tsx` | Integration point |

---

## Related Wireframes

- [DOM-ORD-002c: Delivery Confirmation UI](./DOM-ORD-002c.wireframe.md)
- [DOM-ORD-003c: Partial Shipments UI](./DOM-ORD-003c.wireframe.md)
- [DOM-ORD-007: Fulfillment Dashboard](./DOM-ORD-007.wireframe.md)

---

**Document Version:** 1.1
**Updated:** 2026-01-10
**Author:** UI Skill
**Changes:** Added UI Pattern References section
