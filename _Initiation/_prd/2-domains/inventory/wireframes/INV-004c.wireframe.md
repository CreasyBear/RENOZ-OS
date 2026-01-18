# Wireframe: DOM-INV-004c - Reserved Stock Handling: UI

## Story Reference

- **Story ID**: DOM-INV-004c
- **Name**: Reserved Stock Handling: UI
- **PRD**: memory-bank/prd/domains/inventory.prd.json
- **Type**: UI Component
- **Component Types**: Inventory List Columns, Release Action, Reserved Stock Report
- **Primary Users**: Sales, Operations, Warehouse Manager, Finance

## Overview

Enhanced inventory list showing On Hand, Allocated, and Available columns with calculated availability. Release reservation action for allocated items and dedicated reserved stock report page.

## UI Patterns (Reference Implementation)

### Data Table with Custom Columns
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - On Hand, Allocated, Available columns with calculations
  - Low availability warning badges ([!] indicator)
  - Sortable stock columns

### Stacked Bar Chart
- **Pattern**: Custom component using RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Stock distribution visualization (Allocated vs Available)
  - Segmented horizontal bar with percentages
  - Color-coded segments (blue allocated, green available)

### Dialog with Warning
- **Pattern**: RE-UI Dialog + Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx` & `alert.tsx`
- **Features**:
  - Release reservation dialog with impact warning
  - Quantity input with max validation
  - Reason dropdown with predefined options

### Tabs with Expiry Badges
- **Pattern**: RE-UI Tabs + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx` & `badge.tsx`
- **Features**:
  - Allocations tab on product detail
  - Expiring soon indicators with pulse animation
  - Tab count badges

### Alert/Banner
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Expiry warnings (expires tomorrow, 2 days)
  - Color-coded severity (red critical, orange warning)
  - Inline alert styling

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | products, inventoryItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/products.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Inventory List - Stock Columns

```
+=========================================+
| < Inventory                      [...]  |
+-----------------------------------------+
| [Search_______________] [Filter v]      |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | 10kWh LFP Battery                      ||
|  | SKU: BAT-LFP-10KWH                         ||
|  | ----------------------------------- ||
|  |                                     ||
|  | On Hand    Allocated    Available   ||
|  |    53         8            45       ||
|  | =========  =========   =========    ||
|  |            ↑ Blue      ↑ Green      ||
|  |                                     ||
|  | [View Details]  [Release] [...]     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 400W Solar Panel                    ||
|  | SKU: SOL-RES-400W                         ||
|  | ----------------------------------- ||
|  |                                     ||
|  | On Hand    Allocated    Available   ||
|  |    62        12           50        ||
|  |                                     ||
|  | [View Details]  [Release] [...]     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 5kW Hybrid Inverter                        ||
|  | SKU: INV-HYB-5KW                         ||
|  | ----------------------------------- ||
|  |                                     ||
|  | On Hand    Allocated    Available   ||
|  |    27        25            2        ||
|  |            ↑ High         ↑ LOW [!] ||
|  |                                     ||
|  | [View Details]  [Release] [...]     ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Inventory Item Detail - Allocations Tab

```
+=========================================+
| < 10kWh LFP Battery                 [...]  |
+-----------------------------------------+
| [Overview] [Allocations] [Movements]    |
|            ============                 |
+-----------------------------------------+
|                                         |
|  STOCK SUMMARY                          |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |   On Hand: 53                       ||
|  |   +-----------------------------+   ||
|  |   | ########################### |   ||
|  |   +-----------------------------+   ||
|  |                                     ||
|  |   Allocated: 8   (15%)              ||
|  |   +-----------------------------+   ||
|  |   | ######                      |   || <- Blue
|  |   +-----------------------------+   ||
|  |                                     ||
|  |   Available: 45  (85%)              ||
|  |   +-----------------------------+   ||
|  |   | ########################    |   || <- Green
|  |   +-----------------------------+   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  CURRENT ALLOCATIONS (3)                |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | Order: ORD-2026-0089               ||
|  | Customer: Brisbane Solar Solutions                 ||
|  | Qty: 3 units                        ||
|  | Reserved: Jan 10, 2026              ||
|  | Expires: Jan 17, 2026 (7 days)      ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Order: ORD-2026-0092               ||
|  | Customer: Sydney Energy Systems           ||
|  | Qty: 3 units                        ||
|  | Reserved: Jan 12, 2026              ||
|  | Expires: Jan 19, 2026 (9 days)      ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Order: ORD-2026-0095               ||
|  | Customer: Melbourne Power Co                 ||
|  | Qty: 2 units                        ||
|  | Reserved: Jan 14, 2026              ||
|  | Expires: [!] Jan 15 (TOMORROW)      ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Release Reservation - Bottom Sheet

```
+=========================================+
| =====================================   |
|                                         |
|  RELEASE RESERVATION             [X]    |
|  -------------------------------------- |
|                                         |
|  Product                                |
|  +------------------------------------+ |
|  | 10kWh LFP Battery (BAT-LFP-10KWH)   [locked] | |
|  +------------------------------------+ |
|                                         |
|  Order                                  |
|  +------------------------------------+ |
|  | ORD-2026-0089 - Brisbane Solar Solutions [locked] | |
|  +------------------------------------+ |
|                                         |
|  Currently Reserved: 3 units            |
|                                         |
|  QUANTITY TO RELEASE *                  |
|  +------------------------------------+ |
|  |  3                                 | | <- Default: all
|  +------------------------------------+ |
|  Release all or partial                 |
|                                         |
|  REASON *                               |
|  +--------------------------------+ [v] |
|  | Select reason...                   | |
|  +------------------------------------+ |
|                                         |
|  Reasons:                               |
|  - Order cancelled                      |
|  - Customer request                     |
|  - Stock reallocation                   |
|  - Expired reservation                  |
|  - Other                                |
|                                         |
|  Notes (optional)                       |
|  +------------------------------------+ |
|  | Additional context...              | |
|  +------------------------------------+ |
|                                         |
|  [!] Warning: Releasing stock will      |
|  make it available for other orders.    |
|  Order ORD-2026-0089 will need to be    |
|  re-allocated if stock is needed.       |
|                                         |
|  +------------------------------------+ |
|  |                                    | |
|  |      [RELEASE RESERVATION]         | | <- 56px primary
|  |                                    | |
|  +------------------------------------+ |
|                                         |
+=========================================+
```

### Reserved Stock Report - Mobile

```
+=========================================+
| < Reports                        [...]  |
+-----------------------------------------+
| Reserved Stock Report                   |
+-----------------------------------------+
|                                         |
|  SUMMARY                                |
|  +-------------------------------------+|
|  | Total Reserved    | 156 units       ||
|  | Total Value       | $18,450         ||
|  | Reservations      | 23              ||
|  | Expiring Soon     | 5               ||
|  +-------------------------------------+|
|                                         |
|  [All] [Expiring] [By Product] [By Cust]|
|  ===                                    |
|                                         |
|  EXPIRING SOON (5)                      |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  | [!] 10kWh LFP Battery         3 units  ||
|  |     ORD-2026-0095 - Melbourne Power Co       ||
|  |     Expires: TOMORROW               ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [!] 400W Solar Panel       5 units  ||
|  |     ORD-2026-0087 - Perth Renewables       ||
|  |     Expires: 2 days                 ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [*] 5kW Hybrid Inverter           2 units  ||
|  |     ORD-2026-0091 - Adelaide Battery Corp         ||
|  |     Expires: 5 days                 ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [*] Battery Pack 10kWh     8 units  ||
|  |     ORD-2026-0093 - Foxtrot Ltd     ||
|  |     Expires: 6 days                 ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [*] Cable Kit Pro         10 units  ||
|  |     ORD-2026-0094 - Golf Inc        ||
|  |     Expires: 7 days                 ||
|  |                          [Release]  ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Inventory List - Stock Columns

```
+=======================================================================+
| Inventory                                           [+ Add Inventory] |
+-----------------------------------------------------------------------+
| [Search_____________________] [Category v] [Location v] [Export]      |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-------------------------------------------------------------------+|
|  | [ ] | Product         | SKU    | On Hand | Alloc | Avail | Actions||
|  +-------------------------------------------------------------------+|
|  | [ ] | 10kWh LFP Battery  | BAT-LFP-10KWH | 53      | 8     | 45    | [...]  ||
|  | [ ] | Solar Panel 400 | SOL-RES-400W | 62      | 12    | 50    | [...]  ||
|  | [ ] | 5kW Hybrid Inverter    | INV-HYB-5KW | 27      | 25    | 2 [!] | [...]  ||
|  | [ ] | Battery 10kWh   | BP-10K | 38      | 0     | 38    | [...]  ||
|  | [ ] | Cable Kit Pro   | CK-PRO | 89      | 15    | 74    | [...]  ||
|  +-------------------------------------------------------------------+|
|                                                                       |
|  Legend: [!] Low available stock                                      |
|                                                                       |
+=======================================================================+
```

### Inventory Detail - Allocations View

```
+=======================================================================+
| < 10kWh LFP Battery                              [Edit] [Actions v]      |
+-----------------------------------------------------------------------+
| [Overview] [Allocations] [Movements] [Cost Layers]                    |
|            ============                                               |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- STOCK BREAKDOWN ---------------+  +-- QUICK ACTIONS ------------+|
|  |                                  |  |                             ||
|  |  On Hand:      53 units          |  |  [Release All Reserved]     ||
|  |  Allocated:     8 units (15%)    |  |  [View Order History]       ||
|  |  Available:    45 units (85%)    |  |  [Allocate to Order]        ||
|  |                                  |  |                             ||
|  |  +-----------------------------+ |  +-----------------------------+|
|  |  | ########################### | |                                |
|  |  | [Allocated][  Available   ] | |                                |
|  |  +-----------------------------+ |                                |
|  |                                  |                                |
|  +----------------------------------+                                |
|                                                                       |
|  CURRENT ALLOCATIONS (3)                                              |
|  -------------------------------------------------------------------  |
|                                                                       |
|  +-------------------------------------------------------------------+|
|  | Order         | Customer       | Qty | Reserved  | Expires | Act  ||
|  +-------------------------------------------------------------------+|
|  | ORD-2026-0089 | Brisbane Solar Solutions      | 3   | Jan 10    | Jan 17  | [Rel]||
|  | ORD-2026-0092 | Beta Industrie | 3   | Jan 12    | Jan 19  | [Rel]||
|  | ORD-2026-0095 | Melbourne Power Co      | 2   | Jan 14    | Jan 15! | [Rel]||
|  +-------------------------------------------------------------------+|
|                                                                       |
+=======================================================================+
```

### Reserved Stock Report

```
+=======================================================================+
| Reports > Reserved Stock                                   [Export]   |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-------------------------+  +-------------------------+             |
|  | TOTAL RESERVED          |  | EXPIRING THIS WEEK      |             |
|  | 156 units / $18,450     |  | 5 reservations          |             |
|  | 23 reservations         |  | 28 units / $3,200       |             |
|  +-------------------------+  +-------------------------+             |
|                                                                       |
|  [All Reservations] [Expiring Soon] [By Product] [By Customer]        |
|                     ==============                                    |
|                                                                       |
|  +-------------------------------------------------------------------+|
|  | Status | Product         | Order       | Customer     | Qty | Exp ||
|  +-------------------------------------------------------------------+|
|  | [!]    | 10kWh LFP Battery  | ORD-0095    | Melbourne Power Co    | 2   | Tmrw||
|  | [!]    | Solar Panel 400 | ORD-0087    | Perth Renewables    | 5   | 2d  ||
|  | [*]    | 5kW Hybrid Inverter    | ORD-0091    | Adelaide Battery Corp      | 2   | 5d  ||
|  | [*]    | Battery 10kWh   | ORD-0093    | Foxtrot Ltd  | 8   | 6d  ||
|  | [*]    | Cable Kit Pro   | ORD-0094    | Golf Inc     | 10  | 7d  ||
|  +-------------------------------------------------------------------+|
|                                                                       |
|  [!] = Expiring within 3 days                                         |
|  [*] = Expiring within 7 days                                         |
|                                                                       |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Inventory List - Full Stock Columns

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Inventory                                                      [+ Add Inventory]      |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  [Search___________________] [Category v] [Location v] [Availability v] [Export]       |
| Inventory < |                                                                                        |
| Jobs        |  +------------------------------------------------------------------------------------+|
| Pipeline    |  |                                                                                    ||
|             |  | [ ] | Product         | SKU       | On Hand | Allocated | Available | Value | Act  ||
|             |  | ------------------------------------------------------------------------------------||
|             |  | [ ] | 10kWh LFP Battery  | BAT-LFP-10KWH    | 53      | 8         | 45        | $6,625| [.. ]||
|             |  | [ ] | Solar Panel 400 | SOL-RES-400W    | 62      | 12        | 50        | $18.6k| [.. ]||
|             |  | [ ] | 5kW Hybrid Inverter    | INV-HYB-5KW    | 27      | 25        | 2 [!]     | $13.5k| [.. ]||
|             |  | [ ] | Battery 10kWh   | BP-10K    | 38      | 0         | 38        | $38k  | [.. ]||
|             |  | [ ] | Cable Kit Pro   | CK-PRO    | 89      | 15        | 74        | $1,335| [.. ]||
|             |  | [ ] | Mounting Rails  | MR-STD    | 145     | 20        | 125       | $2,175| [.. ]||
|             |  | [ ] | Bracket Set     | BS-100    | 234     | 0         | 234       | $2,340| [.. ]||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  Legend: [!] Available < 10% of On Hand (critically low)                               |
|             |  Showing 1-7 of 156 items                                        < 1 [2] 3 ... 23 >    |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Inventory Detail - Allocations Tab

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Inventory                                                                   |
| Customers   |                                                                                        |
| Orders      |  10kWh LFP Battery (BAT-LFP-10KWH)                                  [Edit] [Adjust] [Actions v]  |
| Products    |  Category: Electronics > Widgets   |   Location: Aisle A-1, Shelf 2                    |
| Inventory < |  ------------------------------------------------------------------------------------- |
|             |                                                                                        |
|             |  [Overview] [Allocations] [Movements] [Cost Layers] [Forecasting]                      |
|             |              ============                                                              |
|             |                                                                                        |
|             |  +-- STOCK BREAKDOWN ------------------------------------------------+                 |
|             |  |                                                                   |                 |
|             |  |  +---------------------+  +---------------------+  +---------------------+          |
|             |  |  | ON HAND             |  | ALLOCATED           |  | AVAILABLE           |          |
|             |  |  | 53 units            |  | 8 units (15%)       |  | 45 units (85%)      |          |
|             |  |  | $6,625 value        |  | 3 orders            |  | Ready to sell       |          |
|             |  |  +---------------------+  +---------------------+  +---------------------+          |
|             |  |                                                                   |                 |
|             |  |  Stock Distribution:                                              |                 |
|             |  |  +--------------------------------------------------------------------+             |
|             |  |  | [Allocated 15%][         Available 85%                          ] |             |
|             |  |  +--------------------------------------------------------------------+             |
|             |  |                                                                   |                 |
|             |  +-------------------------------------------------------------------+                 |
|             |                                                                                        |
|             |  +-- CURRENT ALLOCATIONS (3) ----------------------------------------------------+     |
|             |  |                                                                               |     |
|             |  |  +---------------------------------------------------------------------------+|     |
|             |  |  | Order          | Customer         | Qty  | Reserved   | Expires    | Act ||     |
|             |  |  +---------------------------------------------------------------------------+|     |
|             |  |  | ORD-2026-0089  | Brisbane Solar Solutionsoration | 3    | Jan 10     | Jan 17     | [R] ||     |
|             |  |  | ORD-2026-0092  | Sydney Energy Systems  | 3    | Jan 12     | Jan 19     | [R] ||     |
|             |  |  | ORD-2026-0095  | Melbourne Power Co        | 2    | Jan 14     | Jan 15 [!] | [R] ||     |
|             |  |  +---------------------------------------------------------------------------+|     |
|             |  |                                                                               |     |
|             |  |  [Release All Reservations]  [View All Orders]  [Add Allocation]             |     |
|             |  |                                                                               |     |
|             |  +-------------------------------------------------------------------------------+     |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Release Reservation Modal - Desktop

```
+======================================================================================================+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  | RELEASE RESERVATION                                                                       [X] |  |
|  +================================================================================================+  |
|  |                                                                                                |  |
|  |  +-- RESERVATION DETAILS ----------------------------------+  +-- RELEASE OPTIONS ----------+ |  |
|  |  |                                                         |  |                             | |  |
|  |  |  Product: 10kWh LFP Battery                                |  |  Quantity to Release *      | |  |
|  |  |  SKU: BAT-LFP-10KWH                                            |  |  +------------------------+ | |  |
|  |  |                                                         |  |  |  3                     | | |  |
|  |  |  Order: ORD-2026-0089                                   |  |  +------------------------+ | |  |
|  |  |  Customer: Brisbane Solar Solutionsoration                             |  |  Max: 3 units              | |  |
|  |  |                                                         |  |                             | |  |
|  |  |  Reserved: Jan 10, 2026 (4 days ago)                    |  |  Reason *                   | |  |
|  |  |  Expires: Jan 17, 2026 (7 days from now)                |  |  +------------------------+ | |  |
|  |  |                                                         |  |  | [v] Order cancelled    | | |  |
|  |  |  Currently Reserved: 3 units                            |  |  +------------------------+ | |  |
|  |  |  Unit Value: $125.00                                    |  |                             | |  |
|  |  |  Total Value: $375.00                                   |  |  Notes                      | |  |
|  |  |                                                         |  |  +------------------------+ | |  |
|  |  +----------------------------------------------------------+  |  | Customer requested     | | |  |
|  |                                                                 |  | cancellation via email | | |  |
|  |  +-- IMPACT WARNING -------------------------------------------+  +------------------------+ | |  |
|  |  |                                                             |                             | |  |
|  |  |  [!] Releasing this reservation will:                       |  [ ] Notify sales rep       | |  |
|  |  |                                                             |  [ ] Add note to order      | |  |
|  |  |  - Make 3 units available for other orders                  |                             | |  |
|  |  |  - Order ORD-2026-0089 will show as unfulfilled              +-----------------------------+ |  |
|  |  |  - Customer may need to be notified                         |                               |  |
|  |  |                                                             |                               |  |
|  |  +--------------------------------------------------------------+                               |  |
|  |                                                                                                |  |
|  +------------------------------------------------------------------------------------------------+  |
|  |                                                                                                |  |
|  |                                                   ( Cancel )   [ Release Reservation ]         |  |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

### Reserved Stock Report - Desktop

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Reports > Reserved Stock                                                              |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  +-- SUMMARY CARDS ------------------------------------------------------------------+|
| Inventory   |  |                                                                                   ||
| Reports <   |  |  +---------------------+  +---------------------+  +---------------------+        ||
|   Reserved  |  |  | TOTAL RESERVED      |  | EXPIRING SOON       |  | HIGH VALUE HOLDS   |        ||
|   ========  |  |  | 156 units           |  | 5 reservations      |  | 3 reservations     |        ||
|   Aging     |  |  | $18,450             |  | 28 units            |  | $8,200             |        ||
|   Valuation |  |  | 23 reservations     |  | within 7 days       |  | > $1,000 each      |        ||
| Jobs        |  |  +---------------------+  +---------------------+  +---------------------+        ||
| Pipeline    |  |                                                                                   ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  [All Reservations] [Expiring Soon] [By Product] [By Customer] [By Order]    [Export] |
|             |  ====================                                                                  |
|             |                                                                                        |
|             |  +------------------------------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | St | Product         | SKU    | Order       | Customer        | Qty | Exp    | Act||
|             |  | ------------------------------------------------------------------------------------||
|             |  | [!]| 10kWh LFP Battery  | BAT-LFP-10KWH | ORD-0095    | Melbourne Power Co       | 2   | Tmrw   | [R]||
|             |  | [!]| Solar Panel 400 | SOL-RES-400W | ORD-0087    | Perth Renewables       | 5   | 2 days | [R]||
|             |  | [*]| 5kW Hybrid Inverter    | INV-HYB-5KW | ORD-0091    | Adelaide Battery Corp         | 2   | 5 days | [R]||
|             |  | [*]| Battery 10kWh   | BP-10K | ORD-0093    | Foxtrot Ltd     | 8   | 6 days | [R]||
|             |  | [*]| Cable Kit Pro   | CK-PRO | ORD-0094    | Golf Inc        | 10  | 7 days | [R]||
|             |  | [ ]| Widget Pro 300  | WP-300 | ORD-0089    | Brisbane Solar Solutions       | 3   | Jan 17 | [R]||
|             |  | [ ]| Mounting Rails  | MR-STD | ORD-0092    | Sydney Energy Systems | 5   | Jan 19 | [R]||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  [!] = Expiring in < 3 days   [*] = Expiring in 3-7 days   [ ] = Normal                |
|             |                                                                                        |
|             |  Showing 1-7 of 23 reservations                              < 1 [2] 3 4 >             |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
INVENTORY LIST LOADING:
+-------------------------------------------------------------------+
| Product         | SKU    | On Hand | Allocated | Available | Act  |
+-------------------------------------------------------------------+
| [.............] | [.....] | [.....] | [......] | [......] | [...] |
| [.............] | [.....] | [.....] | [......] | [......] | [...] |
| [.............] | [.....] | [.....] | [......] | [......] | [...] |
+-------------------------------------------------------------------+
↑ Skeleton with shimmer

ALLOCATIONS LOADING:
+----------------------------------------+
| Loading allocations...                 |
| +------------------------------------+ |
| | [==================             ]  | |
| +------------------------------------+ |
+----------------------------------------+

RELEASE PROCESSING:
+----------------------------------------+
|                                        |
|   Releasing reservation...             |
|   +--------------------------------+   |
|   | [=============            ]    |   |
|   +--------------------------------+   |
|                                        |
|   Updating stock availability...       |
|                                        |
+----------------------------------------+
```

### Empty States

```
NO ALLOCATIONS:
+----------------------------------------+
|                                        |
|           +-------------+              |
|           |  [boxes]    |              |
|           +-------------+              |
|                                        |
|    No Stock Allocated                  |
|                                        |
|    This product has no current         |
|    reservations or allocations.        |
|                                        |
|    All 53 units are available.         |
|                                        |
+----------------------------------------+

NO EXPIRING RESERVATIONS:
+----------------------------------------+
|                                        |
|           +-------------+              |
|           |  [check]    |              |
|           +-------------+              |
|                                        |
|    No Expiring Reservations            |
|                                        |
|    All current reservations have       |
|    more than 7 days until expiry.      |
|                                        |
+----------------------------------------+

NO RESERVED STOCK (Report):
+----------------------------------------+
|                                        |
|           +-------------+              |
|           |  [boxes]    |              |
|           +-------------+              |
|                                        |
|    No Reserved Stock                   |
|                                        |
|    There are currently no stock        |
|    reservations or allocations.        |
|                                        |
|    All inventory is available for      |
|    immediate sale.                     |
|                                        |
+----------------------------------------+
```

### Error States

```
FAILED TO LOAD ALLOCATIONS:
+----------------------------------------+
| [!] Couldn't load allocations          |
|                                        |
| Check your connection and try again.   |
|                                        |
| [Retry]                                |
+----------------------------------------+

RELEASE FAILED:
+----------------------------------------+
| [!] Release Failed                     |
|                                        |
| Could not release reservation for      |
| Order ORD-2026-0089.                   |
|                                        |
| Error: Order is already shipped        |
|                                        |
| [View Order]  [Cancel]                 |
+----------------------------------------+

INSUFFICIENT PERMISSIONS:
+----------------------------------------+
| [!] Permission Denied                  |
|                                        |
| You don't have permission to           |
| release stock reservations.            |
|                                        |
| Contact your administrator.            |
|                                        |
| [Request Access]  [OK]                 |
+----------------------------------------+
```

### Success States

```
RESERVATION RELEASED:
+----------------------------------------+
| [ok] Reservation Released              |
|                                        |
| 3 units of 10kWh LFP Battery are now      |
| available for other orders.            |
|                                        |
| Order ORD-2026-0089 has been           |
| updated accordingly.                   |
|                                        |
| [View Order]  [Done]                   |
+----------------------------------------+

ALL RESERVATIONS RELEASED:
+----------------------------------------+
| [ok] All Reservations Released         |
|                                        |
| 8 units released from 3 orders:        |
| - ORD-2026-0089: 3 units               |
| - ORD-2026-0092: 3 units               |
| - ORD-2026-0095: 2 units               |
|                                        |
| 10kWh LFP Battery now fully available.    |
|                                        |
| [View Inventory]  [Done]               |
+----------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Inventory List**
   - Tab to search
   - Tab to filters
   - Tab through table headers (sortable)
   - Tab through row actions
   - Tab to pagination

2. **Allocations Tab**
   - Tab to stock summary cards
   - Tab through allocation rows
   - Tab to release buttons
   - Tab to action buttons

3. **Release Dialog**
   - Focus trapped in dialog
   - Tab: Quantity, Reason dropdown, Notes, checkboxes
   - Tab to Cancel, then Release
   - Escape closes

### ARIA Requirements

```html
<!-- Stock Columns -->
<th scope="col" aria-sort="descending">
  <button aria-label="Sort by available stock, currently descending">
    Available
  </button>
</th>

<td aria-label="Available: 2 units, critically low">
  2 <span role="img" aria-label="Warning">!</span>
</td>

<!-- Allocation Row -->
<tr
  role="row"
  aria-label="Reservation for Order ORD-2026-0089, Brisbane Solar Solutionsoration, 3 units, expires January 17"
>
  <td role="gridcell">ORD-2026-0089</td>
  <td role="gridcell">Brisbane Solar Solutionsoration</td>
</tr>

<!-- Expiry Warning -->
<span
  role="status"
  aria-live="polite"
  aria-label="Warning: Expires tomorrow"
  class="expiry-warning"
>
  [!] TOMORROW
</span>

<!-- Release Button -->
<button
  aria-label="Release reservation for Order ORD-2026-0089, 3 units"
>
  Release
</button>

<!-- Release Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="release-title"
  aria-describedby="release-warning"
>
  <h2 id="release-title">Release Reservation</h2>
  <p id="release-warning">
    Warning: Releasing stock will make it available for other orders.
  </p>
</div>

<!-- Stock Distribution Bar -->
<div
  role="img"
  aria-label="Stock distribution: 15% allocated, 85% available"
>
  <div aria-hidden="true" style="width: 15%">Allocated</div>
  <div aria-hidden="true" style="width: 85%">Available</div>
</div>
```

### Screen Reader Announcements

- List loaded: "Inventory list loaded, 156 items, 3 with low availability"
- Allocation viewed: "3 allocations for 10kWh LFP Battery, 8 units reserved"
- Expiry warning: "Warning: Reservation expires tomorrow"
- Release started: "Releasing 3 units from Order ORD-2026-0089"
- Release complete: "3 units released, now 48 units available"
- Filter applied: "Showing 5 reservations expiring within 7 days"

---

## Animation Choreography

### Stock Columns

```
PAGE LOAD:
- Duration: 300ms
- Stagger: 50ms between columns
- Opacity: 0 -> 1
- Available column: highlight flash if low

AVAILABILITY UPDATE:
- Duration: 400ms
- Number: count animation (old -> new)
- Color: flash green if increasing, red if decreasing
- Badge: pulse if crossing threshold
```

### Allocation List

```
LOAD:
- Duration: 300ms
- Stagger: 75ms between rows
- Transform: translateY(10px) -> translateY(0)
- Opacity: 0 -> 1

EXPIRY WARNING:
- Pulse animation for items expiring soon
- Duration: 1.5s
- Loop: 3 times on page load
```

### Release Action

```
BUTTON CLICK:
- Duration: 150ms
- Scale: 1 -> 0.95 -> 1
- Background: primary -> primary-dark

PROCESSING:
- Button: show spinner
- Row: pulse with highlight

SUCCESS:
- Duration: 500ms
- Row: slide out (height collapse)
- Available column: count up animation
- Toast: slide in from bottom
```

### Distribution Bar

```
INITIAL RENDER:
- Duration: 500ms
- Width: 0% -> actual%
- Easing: ease-out
- Stagger: allocated first, then available

UPDATE:
- Duration: 400ms
- Width: smooth transition
- Color: highlight change
```

---

## Component Props Interfaces

```typescript
// Inventory List Stock Columns
interface StockColumnsProps {
  /** Show allocated column */
  showAllocated?: boolean;
  /** Show available column */
  showAvailable?: boolean;
  /** Highlight threshold for low available */
  lowAvailableThreshold?: number; // percentage
  /** Highlight threshold for critical available */
  criticalAvailableThreshold?: number; // percentage
}

interface InventoryStockData {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  onHand: number;
  allocated: number;
  available: number; // calculated: onHand - allocated
  value: number;
}

// Allocations Tab
interface AllocationsTabProps {
  /** Product ID */
  productId: string;
  /** Inventory item ID */
  inventoryItemId: string;
  /** Callback when release clicked */
  onRelease?: (allocationId: string) => void;
  /** Callback when release all clicked */
  onReleaseAll?: (allocationIds: string[]) => void;
}

interface Allocation {
  id: string;
  inventoryItemId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  quantity: number;
  reservedAt: Date;
  reservedUntil?: Date;
  status: 'active' | 'fulfilled' | 'released' | 'expired';
}

// Release Reservation Dialog
interface ReleaseReservationDialogProps {
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Allocation to release */
  allocation: Allocation;
  /** Product info */
  product: {
    id: string;
    name: string;
    sku: string;
    unitValue: number;
  };
  /** Callback on success */
  onSuccess?: (released: ReleasedAllocation) => void;
}

interface ReleaseFormValues {
  quantity: number;
  reason: 'order_cancelled' | 'customer_request' | 'stock_reallocation' | 'expired' | 'other';
  notes?: string;
  notifySalesRep?: boolean;
  addNoteToOrder?: boolean;
}

interface ReleasedAllocation {
  allocationId: string;
  quantityReleased: number;
  newAvailable: number;
}

// Stock Distribution Bar
interface StockDistributionBarProps {
  /** On hand quantity */
  onHand: number;
  /** Allocated quantity */
  allocated: number;
  /** Available quantity */
  available: number;
  /** Show labels */
  showLabels?: boolean;
  /** Show percentages */
  showPercentages?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Animate on render */
  animate?: boolean;
}

// Reserved Stock Report
interface ReservedStockReportProps {
  /** Initial view filter */
  initialView?: 'all' | 'expiring' | 'by_product' | 'by_customer' | 'by_order';
  /** Expiring threshold in days */
  expiringDays?: number;
  /** Callback when release clicked */
  onRelease?: (allocationId: string) => void;
}

interface ReservedStockSummary {
  totalUnits: number;
  totalValue: number;
  totalReservations: number;
  expiringSoon: number;
  expiringUnits: number;
  expiringValue: number;
  highValueCount: number;
  highValueAmount: number;
}

// Availability Badge
interface AvailabilityBadgeProps {
  /** Available quantity */
  available: number;
  /** On hand quantity (for percentage) */
  onHand: number;
  /** Show warning if below threshold */
  warnThreshold?: number; // percentage
  /** Show critical if below threshold */
  criticalThreshold?: number; // percentage
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/inventory/inventory-columns.tsx` | Add allocated/available columns |
| `src/components/domain/inventory/allocations-tab.tsx` | Product detail allocations view |
| `src/components/domain/inventory/release-reservation-dialog.tsx` | Release action modal |
| `src/components/domain/inventory/stock-distribution-bar.tsx` | Visual stock breakdown |
| `src/components/domain/inventory/availability-badge.tsx` | Available stock indicator |
| `src/routes/_authed/reports/reserved-stock.tsx` | Reserved stock report page |

---

## Design References

- **Allocated Color**: Blue (#3B82F6) - represents commitment
- **Available Color**: Green (#22C55E) - represents sellable
- **Warning Color**: Orange (#F97316) - for expiring soon
- **Critical Color**: Red (#EF4444) - for expiring tomorrow or low available
- **Distribution Bar**: Stacked horizontal bar, smooth animations
- **Expiry Badge**: Pulsing for urgent items
