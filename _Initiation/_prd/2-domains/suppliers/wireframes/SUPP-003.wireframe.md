# Wireframe: DOM-SUPP-003 - Auto-PO from Reorder Alerts

> **PRD**: suppliers.prd.json
> **Story ID**: DOM-SUPP-003
> **Story Name**: Complete Auto-PO from Reorder Alerts
> **Type**: UI Component
> **Component Type**: Dialog with grouped DataTable
> **Last Updated**: 2026-01-10

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | suppliers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-SUPP-003 | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/suppliers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Overview

This wireframe covers the UI for viewing reorder suggestions grouped by supplier and creating purchase orders directly from those suggestions. Key features:
- Reorder suggestions dialog with supplier grouping
- Create PO action per supplier group
- Reorder suggestions widget for procurement dashboard
- Accordion-style mobile interactions

---

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-dialog.tsx`
- **Features**:
  - Full-screen mobile reorder suggestions dialog
  - Responsive dialog sizing for tablet/desktop views
  - Overlay backdrop with proper focus management

### Accordion
- **Pattern**: RE-UI Accordion
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-accordion.tsx`
- **Features**:
  - Collapsible supplier groups for mobile
  - Expand/collapse animation for item lists
  - Single or multiple open panels support

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Reorder suggestions table with product details
  - Sortable columns for desktop view
  - Row selection with checkboxes for item selection

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Dashboard widget card for reorder suggestions
  - Supplier group summary cards
  - Status indicators and badges for alerts

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Back-ordered status badges
  - Pending/Complete status indicators
  - Alert count badges for dashboard widget

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-input.tsx`
- **Features**:
  - Quantity adjustment inputs with +/- buttons
  - Search filter for products in dialog
  - Number input validation for order quantities

---

## Mobile Wireframe (375px)

### Reorder Suggestions Widget (Dashboard)

```
+=========================================+
|                                         |
|  REORDER SUGGESTIONS                    |
|  -----------------------------------    |
|                                         |
|  [!] 12 items need reordering           | <- Alert indicator
|                                         |
|  +-----------------------------------+  |
|  | ABC Building Supplies (4 items)   |  |
|  | Est. Value: $1,250               >|  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | XYZ Materials (3 items)           |  |
|  | Est. Value: $890                 >|  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | Delta Plumbing (5 items)          |  |
|  | Est. Value: $2,100               >|  |
|  +-----------------------------------+  |
|                                         |
|  [View All Suggestions (12)]            |
|                                         |
+=========================================+
```

### Reorder Suggestions Dialog (Full Screen Mobile)

```
+=========================================+
| Reorder Suggestions                [X]  |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [Search items...                  ] | |
| +-------------------------------------+ |
|                                         |
| SUMMARY                                 |
| +-------------------------------------+ |
| | 12 items  |  3 suppliers  |  $4,240 | |
| +-------------------------------------+ |
|                                         |
+-----------------------------------------+
|                                         |
| +-- ABC BUILDING SUPPLIES --------------+
| |                                       |
| |  4 items  |  Est: $1,250              |
| |                                       |
| |  +-----------------------------------+|
| |  |                                   ||
| |  |   [CREATE PO]                     || <- 48px button
| |  |                                   ||
| |  +-----------------------------------+|
| |                                       |
| +---------------------------------------+
|                                         |
|   +-----------------------------------+ |
|   | [v] 2x4 Pine Lumber 8ft          | | <- Checkbox
|   |     SKU: LUM-2X4-8                | |
|   |     Current: 15  |  Reorder: 50   | |
|   |     Unit Cost: $4.50              | |
|   +-----------------------------------+ |
|                                         |
|   +-----------------------------------+ |
|   | [v] Drywall Sheets 4x8           | |
|   |     SKU: DRY-48-12                | |
|   |     Current: 8   |  Reorder: 100  | |
|   |     Unit Cost: $12.00             | |
|   +-----------------------------------+ |
|                                         |
|   +-----------------------------------+ |
|   | [v] Joint Compound 5gal          | |
|   |     SKU: JNT-5GAL                 | |
|   |     Current: 2   |  Reorder: 20   | |
|   |     Unit Cost: $18.50             | |
|   +-----------------------------------+ |
|                                         |
|   +-----------------------------------+ |
|   | [v] Drywall Screws 1lb           | |
|   |     SKU: DRY-SCR-1                | |
|   |     Current: 5   |  Reorder: 25   | |
|   |     Unit Cost: $8.00              | |
|   +-----------------------------------+ |
|                                         |
+-----------------------------------------+
|                                         |
| +-- XYZ MATERIALS (collapsed) ----------+
| |                                       |
| |  3 items  |  Est: $890           [v] | <- Expand chevron
| |                                       |
| +---------------------------------------+
|                                         |
| +-- DELTA PLUMBING (collapsed) ---------+
| |                                       |
| |  5 items  |  Est: $2,100         [v] | |
| |                                       |
| +---------------------------------------+
|                                         |
+=========================================+
```

### Expanded Supplier Group

```
+-- ABC BUILDING SUPPLIES (expanded) -----+
|                                         |
|  4 items selected  |  Est: $1,250       |
|                              [^] collapse|
|                                         |
|  +------------------------------------+ |
|  |                                    | |
|  |       [CREATE PO FOR ABC]          | |
|  |                                    | |
|  +------------------------------------+ |
|                                         |
|  [ ] Select All (4)                     |
|  -----------------------------------    |
|                                         |
|  +-----------------------------------+  |
|  | [v] 2x4 Pine Lumber 8ft           |  |
|  |     Current: 15 / Min: 50         |  |
|  |     Suggested Qty: 50             |  |
|  |     +---------+                   |  |
|  |     | 50  [-][+] |               |  | <- Qty adjuster
|  |     +---------+                   |  |
|  |     @ $4.50 = $225.00             |  |
|  +-----------------------------------+  |
|                                         |
|  +-----------------------------------+  |
|  | [v] Drywall Sheets 4x8            |  |
|  |     Current: 8 / Min: 25          |  |
|  |     +---------+                   |  |
|  |     | 100 [-][+] |               |  |
|  |     +---------+                   |  |
|  |     @ $12.00 = $1,200.00          |  |
|  +-----------------------------------+  |
|                                         |
|  (... more items)                       |
|                                         |
+-----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Reorder Suggestions Dialog

```
+================================================================+
| Reorder Suggestions                                        [X]  |
+----------------------------------------------------------------+
|                                                                 |
| +----------------------------+ +--------------------------------+
| | [Search items...         ] | | SUMMARY                        |
| +----------------------------+ | 12 items | 3 suppliers | $4,240|
|                                 +--------------------------------+
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
| +-- ABC BUILDING SUPPLIES (4 items) ---------------------------+
| |                                                               |
| |  [ ] Select All                            Est: $1,250        |
| |                                                               |
| |  +-----------------------------------------------------------+|
| |  | [ ] | Product           | Current | Reorder | Unit  | Tot ||
| |  +-----+---------+---------+---------+---------+-------+-----+|
| |  | [v] | 2x4 Pine Lumber   |    15   |   50    | $4.50 | $225||
| |  | [v] | Drywall 4x8       |     8   |  100    |$12.00 |$1.2K||
| |  | [v] | Joint Compound    |     2   |   20    |$18.50 | $370||
| |  | [v] | Drywall Screws    |     5   |   25    | $8.00 | $200||
| |  +-----------------------------------------------------------+|
| |                                                               |
| |                                    [CREATE PO FOR ABC]        |
| |                                                               |
| +---------------------------------------------------------------+
|                                                                 |
| +-- XYZ MATERIALS (3 items) ------------------------------------+
| |  (Collapsed - click to expand)                    Est: $890   |
| +---------------------------------------------------------------+
|                                                                 |
| +-- DELTA PLUMBING (5 items) -----------------------------------+
| |  (Collapsed - click to expand)                  Est: $2,100   |
| +---------------------------------------------------------------+
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Reorder Suggestions Dialog

```
+==============================================================================================+
|                                                                                              |
| +-- REORDER SUGGESTIONS DIALOG -------------------------------------------------------------+
| |                                                                                          |
| |  Reorder Suggestions                                                               [X]   |
| |  ========================================================================================|
| |                                                                                          |
| |  +-----------------------------+ +------------------------------------------------------+ |
| |  | [Search products...       ] | | SUMMARY                                              | |
| |  +-----------------------------+ | 12 items from 3 suppliers | Estimated Total: $4,240  | |
| |                                  +------------------------------------------------------+ |
| |                                                                                          |
| |  +-- ABC BUILDING SUPPLIES -----------------------------------------------------------+ |
| |  |                                                                                    | |
| |  |  Supplier Rating: [****]  |  Lead Time: 3 days  |  On-Time: 94%                   | |
| |  |                                                                                    | |
| |  |  +--------------------------------------------------------------------------------+| |
| |  |  | [ ] | Product              | SKU          | Current | Min | Order | Unit  | Total  || |
| |  |  +-----+----------------------+--------------+---------+-----+-------+-------+--------+| |
| |  |  | [v] | 2x4 Pine Lumber 8ft  | LUM-2X4-8    |    15   | 50  |  50   | $4.50 | $225.00|| |
| |  |  | [v] | Drywall Sheets 4x8   | DRY-48-12    |     8   | 25  | 100   |$12.00 |$1,200.0|| |
| |  |  | [v] | Joint Compound 5gal  | JNT-5GAL     |     2   | 10  |  20   |$18.50 | $370.00|| |
| |  |  | [v] | Drywall Screws 1lb   | DRY-SCR-1    |     5   | 15  |  25   | $8.00 | $200.00|| |
| |  |  +--------------------------------------------------------------------------------+| |
| |  |                                                                                    | |
| |  |  [ ] Select All (4)                                   Group Total: $1,995.00       | |
| |  |                                                                                    | |
| |  |                                                          [CREATE PO FOR ABC]       | |
| |  +------------------------------------------------------------------------------------+ |
| |                                                                                          |
| |  +-- XYZ MATERIALS -----------------------------------------------------------------------+|
| |  |                                                                                      | |
| |  |  Supplier Rating: [** ]  |  Lead Time: 5 days  |  On-Time: 87%                      | |
| |  |  (Collapsed - 3 items, Est: $890)                                            [Expand]| |
| |  +--------------------------------------------------------------------------------------+|
| |                                                                                          |
| |  +-- DELTA PLUMBING ----------------------------------------------------------------------+|
| |  |                                                                                      | |
| |  |  Supplier Rating: [****]  |  Lead Time: 2 days  |  On-Time: 98%                     | |
| |  |  (Collapsed - 5 items, Est: $2,100)                                          [Expand]| |
| |  +--------------------------------------------------------------------------------------+|
| |                                                                                          |
| +-------------------------------------------------------------------------------------------+
|                                                                                              |
+==============================================================================================+
```

### Dashboard Widget (Desktop)

```
+-- REORDER SUGGESTIONS WIDGET ----------------------------------+
|                                                                |
|  REORDER SUGGESTIONS                              [View All]   |
|  ----------------------------------------------------------   |
|                                                                |
|  [!] 12 items below minimum stock levels                       |
|                                                                |
|  +------+-----------------+-------+----------+--------------+  |
|  |Status| Supplier        | Items | Est Val  | Action       |  |
|  +------+-----------------+-------+----------+--------------+  |
|  | [!]  | ABC Building    |   4   | $1,250   | [Create PO]  |  |
|  | [!]  | XYZ Materials   |   3   |   $890   | [Create PO]  |  |
|  | [!]  | Delta Plumbing  |   5   | $2,100   | [Create PO]  |  |
|  +------+-----------------+-------+----------+--------------+  |
|                                                                |
|  Total Estimated Reorder Value: $4,240                         |
|                                                                |
+----------------------------------------------------------------+
```

---

## Item Selection & Quantity Adjustment

### Item Card with Quantity Control

```
+-----------------------------------------------------------+
| [v] 2x4 Pine Lumber 8ft                                   |
|     SKU: LUM-2X4-8  |  Preferred Supplier: ABC Building   |
|     -----------------------------------------------       |
|     Stock Status:                                         |
|     Current: 15  |  Minimum: 50  |  Deficit: 35          |
|     -----------------------------------------------       |
|     Order Quantity:                                       |
|     +--------+--------+--------+                          |
|     |  [-]   |   50   |  [+]   |                          | <- Adjustable
|     +--------+--------+--------+                          |
|     -----------------------------------------------       |
|     Unit Cost: $4.50  |  Line Total: $225.00              |
+-----------------------------------------------------------+
  Border-left: 4px red-500 (below minimum)
```

### Item States

```
SELECTED (Below Minimum):
+-----------------------------------------------------------+
| [v] Product Name                                   [!]    |
|     Current: 15 / Min: 50                                 |
|     Qty: [  50  ]  @ $4.50 = $225.00                      |
+-----------------------------------------------------------+
  Border-left: 4px red-500
  Background: red-50
  Checkbox: Checked

SELECTED (Low Stock Warning):
+-----------------------------------------------------------+
| [v] Product Name                                   [~]    |
|     Current: 28 / Min: 25 (Low)                           |
|     Qty: [  50  ]  @ $4.50 = $225.00                      |
+-----------------------------------------------------------+
  Border-left: 4px yellow-500
  Background: yellow-50

DESELECTED:
+-----------------------------------------------------------+
| [ ] Product Name                                          |
|     Current: 15 / Min: 50                                 |
|     Suggested Qty: 50                                     |
+-----------------------------------------------------------+
  Border-left: none
  Background: white
  Muted styling
```

---

## Create PO Flow

### Creating PO Confirmation

```
+=========================================+
| ================================        |
|                                         |
| Create Purchase Order?            [X]   |
+-----------------------------------------+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |  Supplier: ABC Building Supplies  |  |
|  |  Items: 4                         |  |
|  |  Total: $1,995.00                 |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  A new purchase order will be created   |
|  with the selected items.               |
|                                         |
|  Expected Delivery                      |
|  +-----------------------------------+  |
|  | [calendar] Select date...       v |  |
|  +-----------------------------------+  |
|                                         |
|  Notes                                  |
|  +-----------------------------------+  |
|  |                                   |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
|  [ ] Send to supplier immediately       |
|  [x] Save as draft for review           |
|                                         |
+-----------------------------------------+
|                                         |
| (Cancel)                 [Create Order] |
|                                         |
+=========================================+
```

### PO Created Success

```
+=========================================+
|                                         |
|  [check] Purchase Order Created!        |
|                                         |
|  PO-2024-0152 has been created          |
|  with 4 items from ABC Building.        |
|                                         |
|  [View Order]   (Dismiss)               |
|                                         |
+=========================================+
  Toast with action button
```

---

## Loading States

### Widget Loading

```
+-- REORDER SUGGESTIONS WIDGET ----------------+
|                                              |
|  REORDER SUGGESTIONS                         |
|  ----------------------------------------    |
|                                              |
|  +----------------------------------------+  |
|  | [shimmer==============================]|  |
|  +----------------------------------------+  |
|                                              |
|  +----------------------------------------+  |
|  | [shimmer==========] [shimmer===]       |  |
|  | [shimmer=================]             |  |
|  +----------------------------------------+  |
|                                              |
|  +----------------------------------------+  |
|  | [shimmer==========] [shimmer===]       |  |
|  | [shimmer=================]             |  |
|  +----------------------------------------+  |
|                                              |
+----------------------------------------------+
```

### Dialog Loading

```
+=========================================+
| Reorder Suggestions                [X]  |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [shimmer========================]   | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer=======]                    | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer=====================]      | |
| | [shimmer=============]              | |
| | [shimmer==================]         | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer=====================]      | |
| | [shimmer=============]              | |
| | [shimmer==================]         | |
| +-------------------------------------+ |
|                                         |
+=========================================+
```

### Creating PO

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  |                                   |  |
|  |   [spinner] Creating order...     |  |
|  |                                   |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
  Dialog content dims
  Button shows spinner
  aria-busy="true"
```

---

## Empty State

### No Reorder Suggestions

```
+=========================================+
|                                         |
|           +-------------+               |
|           | [inventory] |               |
|           +-------------+               |
|                                         |
|      ALL STOCK LEVELS HEALTHY           |
|                                         |
|   All products are above their          |
|   minimum stock levels. Great work!     |
|                                         |
|   [View Inventory Report]               |
|                                         |
+=========================================+
```

### Widget Empty State

```
+-- REORDER SUGGESTIONS WIDGET ----------------+
|                                              |
|  REORDER SUGGESTIONS                         |
|  ----------------------------------------    |
|                                              |
|  [check] All stock levels healthy            |
|                                              |
|  No items need reordering at this time.      |
|                                              |
+----------------------------------------------+
  Green checkmark indicator
  Compact empty state
```

---

## Error State

### Failed to Load Suggestions

```
+=========================================+
|                                         |
|           +-------------+               |
|           |    [!]      |               |
|           +-------------+               |
|                                         |
|   UNABLE TO LOAD SUGGESTIONS            |
|                                         |
|   There was a problem loading           |
|   reorder suggestions.                  |
|                                         |
|            [Retry]                      |
|                                         |
+=========================================+
```

### Failed to Create PO

```
+=========================================+
|                                         |
|  +-----------------------------------+  |
|  | [!] Failed to Create Order        |  |
|  |                                   |  |
|  | Could not create purchase order.  |  |
|  | Please try again.                 |  |
|  |                                   |  |
|  | Error: Supplier price expired     |  |
|  |                                   |  |
|  |     [Dismiss]   [Retry]           |  |
|  +-----------------------------------+  |
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<!-- Suggestions Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="suggestions-title"
>
  <h2 id="suggestions-title">Reorder Suggestions</h2>

  <!-- Search -->
  <input
    type="search"
    aria-label="Search products to reorder"
  />

  <!-- Supplier Group -->
  <section
    role="region"
    aria-labelledby="supplier-abc"
  >
    <h3 id="supplier-abc">ABC Building Supplies - 4 items</h3>

    <!-- Items List -->
    <div role="group" aria-label="Items to reorder from ABC Building">
      <div role="checkbox" aria-checked="true" tabindex="0">
        <span>2x4 Pine Lumber 8ft</span>
        <label>
          Quantity:
          <input type="number" aria-label="Order quantity" value="50" />
        </label>
      </div>
    </div>

    <button aria-label="Create purchase order for ABC Building Supplies">
      Create PO for ABC
    </button>
  </section>
</div>

<!-- Dashboard Widget -->
<section role="region" aria-label="Reorder suggestions">
  <h2>Reorder Suggestions</h2>
  <div role="status" aria-live="polite">
    12 items need reordering
  </div>
  <ul role="list" aria-label="Suppliers with items to reorder">
    <li>
      <a href="#" aria-label="ABC Building Supplies, 4 items, estimated $1,250">
        ABC Building Supplies
      </a>
    </li>
  </ul>
</section>
```

### Keyboard Navigation

```
Dialog Tab Order:
1. Close button (X)
2. Search input
3. First supplier group header
4. Select All checkbox
5. Item checkboxes (per supplier)
6. Quantity inputs (for selected items)
7. Create PO button
8. Next supplier group

Item Navigation:
- Tab: Move between items
- Space: Toggle item selection
- Arrow Up/Down: Navigate between items
- Enter on Create PO: Create order

Quantity Adjustment:
- Tab to quantity field
- Type number or use arrow keys
- Shift+Arrow: Adjust by 10
```

### Screen Reader Announcements

```
On dialog open:
  "Reorder suggestions dialog. 12 items from 3 suppliers
   need reordering. Total estimated value: $4,240."

On supplier group focus:
  "ABC Building Supplies. 4 items to reorder.
   Estimated value $1,250. All items selected."

On item toggle:
  "2x4 Pine Lumber selected for reorder.
   Quantity 50 at $4.50. Line total $225."

On Create PO:
  "Creating purchase order for ABC Building Supplies.
   4 items, total $1,995."

On success:
  "Purchase order PO-2024-0152 created successfully.
   4 items from ABC Building."
```

---

## Animation Choreography

### Dialog Entry

```
DIALOG OPEN:
- Backdrop: Fade in (150ms)
- Dialog: Slide up + fade (200ms)
- Summary: Fade in (250ms)
- Supplier groups: Stagger fade in (300-500ms)
```

### Group Expand/Collapse

```
EXPAND:
- Header: Rotate chevron (200ms)
- Items: Slide down + fade in (300ms)
- Height: Animate expand (300ms)

COLLAPSE:
- Items: Fade out (150ms)
- Height: Animate collapse (250ms)
- Header: Rotate chevron (200ms)
```

### Item Selection

```
SELECT:
- Checkbox: Scale bounce (200ms)
- Border-left: Slide in (150ms)
- Background: Fade to color (150ms)
- Total update: Counter animation (200ms)

DESELECT:
- Checkbox: Fade (100ms)
- Border: Slide out (150ms)
- Background: Fade to white (150ms)
```

### PO Creation

```
CREATE BUTTON PRESS:
- Button: Scale 0.98 (50ms)
- Spinner: Fade in (100ms)
- Button text: "Creating..." (100ms)

SUCCESS:
- Dialog: Fade out (200ms)
- Toast: Slide up (200ms)
- Widget update: Counter animation (300ms)
```

---

## Component Props Interface

```typescript
// ReorderSuggestionsWidget.tsx
interface ReorderSuggestionsWidgetProps {
  suggestions: SupplierSuggestionGroup[];
  onViewAll: () => void;
  onCreatePO: (supplierId: string) => void;
  isLoading?: boolean;
}

// ReorderSuggestionsDialog.tsx
interface ReorderSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: SupplierSuggestionGroup[];
  onCreatePO: (data: CreatePOFromSuggestionsInput) => Promise<void>;
  isLoading?: boolean;
}

interface SupplierSuggestionGroup {
  supplier: {
    id: string;
    name: string;
    rating: number;
    leadTimeDays: number;
    onTimePercentage: number;
  };
  items: SuggestionItem[];
  estimatedTotal: number;
}

interface SuggestionItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  suggestedQuantity: number;
  unitCost: number;
  supplierId: string;
}

// SupplierSuggestionGroup.tsx
interface SupplierSuggestionGroupProps {
  group: SupplierSuggestionGroup;
  selectedItems: string[];
  quantities: Record<string, number>;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onSelectAll: (selected: boolean) => void;
  onCreatePO: () => void;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  isCreating?: boolean;
}

// SuggestionItemRow.tsx
interface SuggestionItemRowProps {
  item: SuggestionItem;
  isSelected: boolean;
  quantity: number;
  onSelect: (selected: boolean) => void;
  onQuantityChange: (quantity: number) => void;
}

// CreatePOFromSuggestionsDialog.tsx
interface CreatePOFromSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: { id: string; name: string };
  items: Array<{ item: SuggestionItem; quantity: number }>;
  total: number;
  onConfirm: (data: {
    expectedDate: Date | null;
    notes: string;
    sendImmediately: boolean;
  }) => Promise<void>;
  isCreating: boolean;
}

interface CreatePOFromSuggestionsInput {
  supplierId: string;
  items: Array<{ productId: string; quantity: number }>;
  expectedDate: Date | null;
  notes: string;
  sendImmediately: boolean;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/server/functions/purchase-orders.ts` | Modify | Add supplier grouping |
| `src/components/domain/procurement/reorder-suggestions-widget.tsx` | Create | Dashboard widget |
| `src/components/domain/procurement/reorder-suggestions-dialog.tsx` | Create | Full dialog |
| `src/components/domain/procurement/supplier-suggestion-group.tsx` | Create | Grouped list |
| `src/components/domain/procurement/suggestion-item-row.tsx` | Create | Item row |
| `src/components/domain/procurement/suggest-items-dialog.tsx` | Modify | Update existing |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Widget load | < 500ms | Data + render |
| Dialog open | < 300ms | Fully visible |
| Group expand | < 200ms | Items visible |
| Item toggle | < 50ms | Visual update |
| Create PO | < 2s | Complete operation |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
