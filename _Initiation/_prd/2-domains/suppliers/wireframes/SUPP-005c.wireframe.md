# Wireframe: DOM-SUPP-005c - Supplier Price Lists UI

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-005c
> **Story Name**: Supplier Price Lists: UI
> **Type**: UI Component
> **Component Type**: Tab with DataTable and comparison Cards
> **Last Updated**: 2026-01-10

---

## Overview

This wireframe covers the UI for managing supplier price lists and comparing prices across suppliers:
- Supplier prices tab on supplier detail page
- Price list DataTable with CRUD operations
- Price comparison across suppliers for a product
- Preferred supplier indicator on product detail
- Add/edit price dialog

---

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Supplier price list table with sortable columns
  - Product, SKU, price, min quantity, effective date columns
  - Row actions dropdown for edit/delete/set preferred

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-dialog.tsx`
- **Features**:
  - Add/edit supplier price dialog
  - Mobile bottom sheet for price entry
  - Confirmation dialog for delete actions

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Price comparison cards for each supplier
  - Preferred supplier card with star indicator
  - Best price highlighting with green badge

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-tabs.tsx`
- **Features**:
  - Supplier detail tabs (Overview, Orders, Prices, Stats)
  - Product detail tabs (Details, Inventory, Suppliers)
  - Active tab state management

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Preferred supplier badge (star icon)
  - Price expiring warning badge
  - Best price indicator badge

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form.tsx`
- **Features**:
  - Price entry form with validation
  - Date pickers for effective/expiry dates
  - Checkbox for "Set as preferred supplier"

### Chart
- **Pattern**: RE-UI Chart
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Price history line chart showing trends
  - Multi-supplier comparison chart
  - Interactive data points with tooltips

---

## Mobile Wireframe (375px)

### Supplier Prices Tab

```
+=========================================+
| < Suppliers                      [...]  |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |    ABC Building Supplies          |  |
|  |    Active                 [****]  |  |
|  +-----------------------------------+  |
|                                         |
+-----------------------------------------+
| [Overview] [Orders] [Prices] [Stats]    |
|                     =======             |
+-----------------------------------------+
|                                         |
|  PRICE LIST                             |
|  -----------------------------------    |
|                                         |
|  [+ Add Price]                          |
|                                         |
|  +-----------------------------------+  |
|  | [Search products...             ] |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | 2x4 Pine Lumber 8ft              |  |
|  | SKU: LUM-2X4-8                   |  |
|  | -------------------------------- |  |
|  | Price: $4.50 / unit              |  |
|  | Min Qty: 25                       |  |
|  | Effective: Jan 1, 2026            |  |
|  | [Preferred]                      >|  | <- Badge + chevron
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Drywall Sheets 4x8               |  |
|  | SKU: DRY-48-12                   |  |
|  | -------------------------------- |  |
|  | Price: $12.00 / unit             |  |
|  | Min Qty: 10                       |  |
|  | Effective: Jan 1, 2026            |  |
|  |                                  >|  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Joint Compound 5gal              |  |
|  | SKU: JNT-5GAL                    |  |
|  | -------------------------------- |  |
|  | Price: $18.50 / unit             |  |
|  | Min Qty: 5                        |  |
|  | Effective: Dec 15, 2025           |  |
|  | [Expires: Jan 31]           [!]  >|  | <- Expiring warning
|  +-----------------------------------+  |
|                                         |
|  [Load More (45 total)]                 |
|                                         |
+=========================================+
```

### Add/Edit Price Dialog (Bottom Sheet)

```
+=========================================+
| ================================        | <- Drag handle
|                                         |
| Add Supplier Price                 [X]  |
+-----------------------------------------+
|                                         |
|  Product *                              |
|  +-----------------------------------+  |
|  | [Search products...           ] v |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  Unit Price *                           |
|  +-----------------------------------+  |
|  | $                         4.50    |  |
|  +-----------------------------------+  |
|                                         |
|  Minimum Order Quantity                 |
|  +-----------------------------------+  |
|  | 25                                |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  VALIDITY PERIOD                        |
|                                         |
|  Effective From *                       |
|  +-----------------------------------+  |
|  | [cal] January 1, 2026          v  |  |
|  +-----------------------------------+  |
|                                         |
|  Expires On                             |
|  +-----------------------------------+  |
|  | [cal] No expiration            v  |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  Notes                                  |
|  +-----------------------------------+  |
|  | Volume discount available for     |  |
|  | orders over 100 units...          |  |
|  +-----------------------------------+  |
|                                         |
|  [ ] Set as preferred supplier          |
|      for this product                   |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)                   [Save Price] |
|                                         |
+=========================================+
```

### Price Card Detail (Tap to Expand)

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | 2x4 Pine Lumber 8ft         [^]  |  | <- Expanded
|  | SKU: LUM-2X4-8                   |  |
|  +-----------------------------------+  |
|  |                                   |  |
|  | Price: $4.50 / unit               |  |
|  | Min Order Qty: 25 units           |  |
|  |                                   |  |
|  | --------------------------------- |  |
|  |                                   |  |
|  | Effective: January 1, 2026        |  |
|  | Expires: No expiration            |  |
|  |                                   |  |
|  | --------------------------------- |  |
|  |                                   |  |
|  | [Preferred Supplier]              |  |
|  |                                   |  |
|  | Notes:                            |  |
|  | Volume discount available for     |  |
|  | orders over 100 units. Contact    |  |
|  | sales for quote.                  |  |
|  |                                   |  |
|  | --------------------------------- |  |
|  |                                   |  |
|  | PRICE HISTORY                     |  |
|  | Dec 2025: $4.75 -> $4.50 (-5.3%)  |  |
|  | Sep 2025: $4.50 -> $4.75 (+5.6%)  |  |
|  | Jun 2025: $4.25 -> $4.50 (+5.9%)  |  |
|  |                                   |  |
|  | --------------------------------- |  |
|  |                                   |  |
|  | [Edit Price]  [Delete]            |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Prices Tab

```
+================================================================+
| < Suppliers                                                     |
+----------------------------------------------------------------+
| ABC Building Supplies                    Active      [****]     |
+----------------------------------------------------------------+
| [Overview] [Orders (45)] [Prices] [Stats] [Documents]           |
|                          ========                               |
+----------------------------------------------------------------+
|                                                                 |
| +-- PRICE LIST ------------------------------------------------+|
| |                                                               ||
| | [+ Add Price]                   [Search products...        ]  ||
| |                                                               ||
| | +-----------------------------------------------------------+||
| | | Product              | Price    | Min Qty | Effective | * |||
| | +----------------------+----------+---------+-----------+---+||
| | | 2x4 Pine Lumber 8ft  | $4.50    |   25    | Jan 1     |[P]|||
| | | Drywall Sheets 4x8   | $12.00   |   10    | Jan 1     |   |||
| | | Joint Compound 5gal  | $18.50   |    5    | Dec 15 [!]|   |||
| | | Drywall Screws 1lb   | $8.00    |   10    | Jan 1     |   |||
| | | Sanding Blocks       | $3.25    |   20    | Jan 1     |[P]|||
| | +-----------------------------------------------------------+||
| |                                                               ||
| | Showing 1-10 of 45 prices                  < 1 [2] 3 4 5 >   ||
| |                                                               ||
| +---------------------------------------------------------------+|
|                                                                 |
| LEGEND: [P] = Preferred Supplier  [!] = Price expiring soon     |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Supplier Price List Tab

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Suppliers                                                            |
| ----------- |                                                                                |
| Procurement | ABC Building Supplies                                   Active      [****]     |
|   Dashboard | ---------------------------------------------------------------------------------  |
|   Suppliers |                                                                                |
|   Orders    | [Overview] [Orders (45)] [Prices] [Performance] [Documents] [Notes]            |
| Catalog     |                          ========                                              |
| Jobs        |                                                                                |
| Pipeline    | +-- SUPPLIER PRICE LIST ---------------------------------------------------------+
| Support     | |                                                                             |
|             | |  [+ Add Price]                                [Search products...        ]  |
|             | |                                                                             |
|             | |  +-------------------------------------------------------------------------+|
|             | |  | Product              | SKU          | Price   | Min Qty | Effective | Exp | Pref |
|             | |  +----------------------+--------------+---------+---------+-----------+-----+------+
|             | |  | 2x4 Pine Lumber 8ft  | LUM-2X4-8    | $4.50   |    25   | Jan 1, 26 |  -  | [*]  |
|             | |  | Drywall Sheets 4x8   | DRY-48-12    | $12.00  |    10   | Jan 1, 26 |  -  |      |
|             | |  | Joint Compound 5gal  | JNT-5GAL     | $18.50  |     5   | Dec 15, 25|[!] |      |
|             | |  | Drywall Screws 1lb   | DRY-SCR-1    | $8.00   |    10   | Jan 1, 26 |  -  |      |
|             | |  | Sanding Blocks       | SAND-BLK     | $3.25   |    20   | Jan 1, 26 |  -  | [*]  |
|             | |  | Painter's Tape       | TAPE-PAINT   | $5.75   |    12   | Jan 1, 26 |  -  |      |
|             | |  | Drop Cloths 9x12     | DROP-9X12    | $8.00   |     6   | Jan 1, 26 |  -  |      |
|             | |  | Caulk Tubes          | CAULK-WHT    | $4.25   |    24   | Jan 1, 26 |  -  |      |
|             | |  +-------------------------------------------------------------------------+|
|             | |                                                                             |
|             | |  Showing 1-25 of 45 prices                            < 1 [2] 3 ... 5 >    |
|             | |                                                                             |
|             | +-----------------------------------------------------------------------------+
|             |                                                                                |
|             | LEGEND:  [*] = Preferred Supplier for this product                             |
|             |          [!] = Price expiring within 30 days                                   |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+
```

### Row Actions (Hover/Focus)

```
+---------------------------------------------------------------------------------+
| 2x4 Pine Lumber 8ft  | LUM-2X4-8    | $4.50   | 25 | Jan 1 | - | [*] | [...] |
+---------------------------------------------------------------------------------+
                                                                        |
                                                         +----------------------+
                                                         | View Price History   |
                                                         | Edit Price           |
                                                         | Set as Preferred     |
                                                         | -------------------- |
                                                         | Delete Price         |
                                                         +----------------------+
```

---

## Price Comparison View (Product Detail)

### Desktop Product Page - Supplier Prices Section

```
+-- SUPPLIER PRICES FOR: 2x4 Pine Lumber 8ft ----------------------------------------+
|                                                                                     |
|  Compare prices from your suppliers for this product                               |
|                                                                                     |
|  +-- COMPARISON CARDS -------------------------------------------------------------+
|  |                                                                                 |
|  |  +-- ABC BUILDING [Preferred] --+ +-- XYZ MATERIALS --------+ +-- DELTA ------+ |
|  |  |                              | |                          | |               | |
|  |  |  $4.50 / unit                | |  $4.75 / unit            | |  $4.95 / unit | |
|  |  |  ==========================  | |  ======================== | |  ============ | |
|  |  |                              | |                          | |               | |
|  |  |  Min Qty: 25                 | |  Min Qty: 50             | |  Min Qty: 10  | |
|  |  |  Lead Time: 3 days           | |  Lead Time: 5 days       | |  Lead: 2 days | |
|  |  |  On-Time: 94%                | |  On-Time: 87%            | |  On-Time: 98% | |
|  |  |                              | |                          | |               | |
|  |  |  Savings: Best Price         | |  vs Best: +$0.25 (+5.6%) | |  +$0.45 (+10%)| |
|  |  |  [Preferred Supplier]        | |                          | |               | |
|  |  |                              | |                          | |               | |
|  |  |  [Create PO]                 | |  [Create PO]             | |  [Create PO]  | |
|  |  +------------------------------+ +--------------------------+ +---------------+ |
|  |                                                                                 |
|  +---------------------------------------------------------------------------------+
|                                                                                     |
|  +-- PRICE HISTORY CHART ----------------------------------------------------------+
|  |                                                                                 |
|  |  $5.00 |          ____                                                         |
|  |        |     ____/    \                                                         |
|  |  $4.75 |____/          \____                                                    |
|  |        |                    \____                                               |
|  |  $4.50 |                         \____________________________________          |
|  |        |                                                                        |
|  |  $4.25 |----+----+----+----+----+----+----+----+----+----+----+----+           |
|  |        Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar  Apr  May             |
|  |                                                                                 |
|  |  --- ABC Building   --- XYZ Materials   --- Delta Plumbing                     |
|  |                                                                                 |
|  +---------------------------------------------------------------------------------+
|                                                                                     |
+-------------------------------------------------------------------------------------+
```

### Mobile Price Comparison

```
+=========================================+
| < Catalog                               |
+-----------------------------------------+
| 2x4 Pine Lumber 8ft                     |
| SKU: LUM-2X4-8                          |
+-----------------------------------------+
| [Details] [Inventory] [Suppliers]       |
|                       ===========       |
+-----------------------------------------+
|                                         |
|  SUPPLIER PRICES                        |
|  -----------------------------------    |
|                                         |
|  Best Price: $4.50 (ABC Building)       |
|                                         |
|  +-----------------------------------+  |
|  | ABC Building Supplies  [Preferred]|  |
|  | --------------------------------- |  |
|  | $4.50 / unit           BEST      |  | <- Green tag
|  | Min: 25  |  Lead: 3d  |  94% OT  |  |
|  | [Create PO]                      |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | XYZ Materials Co                  |  |
|  | --------------------------------- |  |
|  | $4.75 / unit           +5.6%     |  | <- vs best
|  | Min: 50  |  Lead: 5d  |  87% OT  |  |
|  | [Create PO]                      |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Delta Plumbing Inc                |  |
|  | --------------------------------- |  |
|  | $4.95 / unit           +10%      |  |
|  | Min: 10  |  Lead: 2d  |  98% OT  |  |
|  | [Create PO]                      |  |
|  +-----------------------------------+  |
|                                         |
|  -----------------------------------    |
|                                         |
|  [Set Preferred Supplier v]             |
|                                         |
+=========================================+
```

---

## Preferred Supplier Badge (Product Detail Header)

```
+================================================================+
| < Catalog                                                       |
+----------------------------------------------------------------+
|                                                                 |
| [IMAGE]  2x4 Pine Lumber 8ft                                    |
|          SKU: LUM-2X4-8  |  Category: Lumber                    |
|          ------------------------------------------------       |
|          Stock: 150 units  |  Reorder Level: 50                 |
|                                                                 |
|          +-- PREFERRED SUPPLIER ---------------------------+    |
|          | [ABC] ABC Building Supplies                     |    |
|          |       $4.50/unit | 3 day lead | 94% on-time     |    |
|          +--------------------------------------------------+   |
|                                                                 |
|          [View All Suppliers (3)]                               |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Loading States

### Price List Loading

```
+-------------------------------------------------------------+
|                                                             |
| +-- PRICE LIST -------------------------------------------+ |
| |                                                         | |
| | [+ Add Price]                   [shimmer=============]  | |
| |                                                         | |
| | +-------------------------------------------------------+|
| | | [shimmer============] | [shimmer] | [shimmer==]       ||
| | | [shimmer==============] | [shimmer] | [shimmer===]    ||
| | | [shimmer=========] | [shimmer] | [shimmer====]        ||
| | | [shimmer==============] | [shimmer] | [shimmer==]     ||
| | +-------------------------------------------------------+|
| |                                                         | |
| +---------------------------------------------------------+ |
|                                                             |
+-------------------------------------------------------------+
```

### Comparison Loading

```
+=========================================+
|                                         |
|  SUPPLIER PRICES                        |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer================]         |  |
|  | [shimmer=======]                  |  |
|  | [shimmer==============]           |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [shimmer================]         |  |
|  | [shimmer=======]                  |  |
|  | [shimmer==============]           |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Empty States

### No Prices Configured

```
+=========================================+
|                                         |
|           +-------------+               |
|           | [price tag] |               |
|           +-------------+               |
|                                         |
|      NO PRICE LIST CONFIGURED           |
|                                         |
|   Add products with prices from this    |
|   supplier to enable automatic price    |
|   lookup when creating purchase orders. |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |     [+ ADD FIRST PRICE]     |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### No Supplier Prices for Product

```
+=========================================+
|                                         |
|  SUPPLIER PRICES                        |
|  -----------------------------------    |
|                                         |
|           +-------------+               |
|           |   [store]   |               |
|           +-------------+               |
|                                         |
|      NO SUPPLIER PRICES                 |
|                                         |
|   No suppliers have pricing set up      |
|   for this product yet.                 |
|                                         |
|   [Add Supplier Price]                  |
|                                         |
+=========================================+
```

---

## Error States

### Failed to Load Prices

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Unable to Load Prices         |  |
|  |                                   |  |
|  | There was a problem loading the   |  |
|  | price list for this supplier.     |  |
|  |                                   |  |
|  |           [Retry]                 |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

### Failed to Save Price

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Failed to Save Price          |  |
|  |                                   |  |
|  | Could not save this price.        |  |
|  | Error: Duplicate entry exists.    |  |
|  |                                   |  |
|  |    [Dismiss]    [Retry]           |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Success States

### Price Saved

```
+=========================================+
|                                         |
|  [check] Price Saved!                   |
|                                         |
|  $4.50 for 2x4 Pine Lumber added        |
|  to ABC Building Supplies.              |
|                                         |
+=========================================+
  Toast notification, auto-dismiss 3s
```

### Preferred Supplier Set

```
+=========================================+
|                                         |
|  [check] Preferred Supplier Updated     |
|                                         |
|  ABC Building Supplies is now the       |
|  preferred supplier for 2x4 Pine Lumber.|
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<!-- Price List Tab -->
<section role="tabpanel" aria-labelledby="prices-tab">
  <h2>Price List</h2>

  <table role="grid" aria-label="Supplier prices for ABC Building Supplies">
    <thead>
      <tr>
        <th scope="col" aria-sort="ascending">Product</th>
        <th scope="col">Price</th>
        <th scope="col">Min Qty</th>
        <th scope="col">Effective Date</th>
        <th scope="col">Preferred</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr aria-label="2x4 Pine Lumber, $4.50, minimum 25, preferred supplier">
        <td>2x4 Pine Lumber 8ft</td>
        <td>$4.50</td>
        <td>25</td>
        <td>Jan 1, 2026</td>
        <td>
          <span role="img" aria-label="Preferred supplier">*</span>
        </td>
        <td>
          <button aria-label="Actions for 2x4 Pine Lumber price">...</button>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<!-- Price Comparison Cards -->
<section role="region" aria-label="Price comparison for 2x4 Pine Lumber">
  <h2>Supplier Prices</h2>
  <div role="list" aria-label="Available suppliers">
    <article role="listitem"
             aria-label="ABC Building Supplies, $4.50 per unit, preferred, best price">
      <!-- Card content -->
    </article>
  </div>
</section>

<!-- Add Price Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="add-price-title">
  <h2 id="add-price-title">Add Supplier Price</h2>
  <form aria-label="New price entry form">
    <label for="product-select">Product</label>
    <select id="product-select" aria-required="true">
      <!-- Options -->
    </select>
  </form>
</div>
```

### Keyboard Navigation

```
Tab Order (Price List):
1. Add Price button
2. Search input
3. Table header (sortable columns)
4. Table rows
5. Row action buttons
6. Pagination controls

Price Comparison:
- Tab: Move between supplier cards
- Enter: Create PO from selected supplier
- Arrow keys: Navigate between cards

Dialog Tab Order:
1. Close button (X)
2. Product search/select
3. Price input
4. Min quantity input
5. Effective date picker
6. Expiry date picker
7. Notes textarea
8. Preferred checkbox
9. Cancel button
10. Save button
```

### Screen Reader Announcements

```
On price list load:
  "Price list for ABC Building Supplies. 45 products with prices.
   Sorted by product name."

On preferred badge focus:
  "This supplier is the preferred supplier for this product."

On price comparison:
  "Price comparison for 2x4 Pine Lumber. 3 suppliers available.
   Best price: $4.50 from ABC Building Supplies."

On comparison card focus:
  "XYZ Materials. $4.75 per unit. 5.6 percent above best price.
   Minimum order 50 units. 5 day lead time."

On price save:
  "Price saved. $4.50 for 2x4 Pine Lumber added to ABC Building."
```

---

## Animation Choreography

### Price Card Entry

```
CARD APPEAR (comparison view):
- Stagger: 100ms between cards
- Transform: translateY(10px) -> 0
- Opacity: 0 -> 1
- Duration: 200ms
```

### Best Price Highlight

```
BEST PRICE BADGE:
- Initial: Hidden
- After cards load: Scale 0 -> 1 (200ms)
- Pulse: 2 cycles (500ms total)
- Color: Green gradient shimmer
```

### Preferred Supplier Toggle

```
SET PREFERRED:
- Previous: Fade out star (150ms)
- New: Scale star in (200ms) + sparkle effect (300ms)
- Card: Border highlight flash (200ms)
```

### Price History Chart

```
CHART LOAD:
- Axes: Fade in (200ms)
- Lines: Draw from left (500ms per line)
- Stagger: 150ms between lines
- Points: Scale in at end (200ms)
```

---

## Component Props Interface

```typescript
// SupplierPricesTab.tsx
interface SupplierPricesTabProps {
  supplierId: string;
  prices: SupplierPrice[];
  onAddPrice: () => void;
  onEditPrice: (priceId: string) => void;
  onDeletePrice: (priceId: string) => void;
  onSetPreferred: (priceId: string) => void;
  isLoading?: boolean;
}

interface SupplierPrice {
  id: string;
  product: { id: string; name: string; sku: string };
  price: number;
  minQuantity: number;
  effectiveDate: Date;
  expiryDate: Date | null;
  isPreferred: boolean;
  notes?: string;
}

// SupplierPriceDialog.tsx
interface SupplierPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  supplierId: string;
  initialData?: Partial<SupplierPriceInput>;
  onSave: (data: SupplierPriceInput) => Promise<void>;
  isSaving: boolean;
}

interface SupplierPriceInput {
  productId: string;
  price: number;
  minQuantity: number;
  effectiveDate: Date;
  expiryDate: Date | null;
  notes?: string;
  setAsPreferred: boolean;
}

// PriceComparisonCards.tsx
interface PriceComparisonCardsProps {
  productId: string;
  productName: string;
  suppliers: Array<{
    id: string;
    name: string;
    price: number;
    minQuantity: number;
    leadTimeDays: number;
    onTimePercentage: number;
    isPreferred: boolean;
    priceEffective: Date;
    priceExpiry: Date | null;
  }>;
  onCreatePO: (supplierId: string) => void;
  onSetPreferred: (supplierId: string) => void;
  isLoading?: boolean;
}

// PreferredSupplierBadge.tsx
interface PreferredSupplierBadgeProps {
  supplier: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  price: number;
  leadTimeDays: number;
  onTimePercentage: number;
  onViewAllSuppliers: () => void;
}

// PriceHistoryChart.tsx
interface PriceHistoryChartProps {
  productId: string;
  suppliers: Array<{
    id: string;
    name: string;
    color: string;
    history: Array<{
      date: Date;
      price: number;
    }>;
  }>;
  period: '3m' | '6m' | '12m' | 'all';
  onPeriodChange: (period: string) => void;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/domain/suppliers/supplier-prices-tab.tsx` | Create | Prices tab content |
| `src/components/domain/suppliers/supplier-price-dialog.tsx` | Create | Add/edit dialog |
| `src/components/domain/suppliers/price-comparison-cards.tsx` | Create | Comparison view |
| `src/components/domain/suppliers/preferred-supplier-badge.tsx` | Create | Product badge |
| `src/components/domain/suppliers/price-history-chart.tsx` | Create | Trend chart |
| `src/routes/procurement/suppliers/$supplierId.tsx` | Modify | Add Prices tab |
| `src/routes/catalog/$productId.tsx` | Modify | Add supplier section |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Price list load | < 500ms | Table populated |
| Search filter | < 200ms | Results updated |
| Dialog open | < 150ms | Form visible |
| Price save | < 1s | Complete + toast |
| Comparison load | < 500ms | Cards visible |
| Chart render | < 300ms | Lines drawn |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
