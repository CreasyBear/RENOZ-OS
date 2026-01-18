# Wireframe: DOM-PROD-002c - Product Bundles: UI

## Story Reference

- **Story ID**: DOM-PROD-002c
- **Name**: Product Bundles: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

Bundle editor UI for creating and managing product bundles (kits). Allows adding component products with quantities, configuring bundle pricing (calculated or override), and displaying bundle contents in orders for picking/fulfillment.

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Bundle component list with sortable columns (Product, SKU, Qty, Unit Price, Total)
  - Inline editing for component quantities
  - Action columns for edit/delete operations

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Add component product modal with search interface
  - Multi-step bundle creation wizard (Basic Info → Components → Pricing)
  - Delete confirmation for bundle component removal

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Bundle name, SKU, and category selection inputs
  - Pricing method radio group (calculated vs override)
  - Override price input with validation

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Quantity inputs with +/- stepper controls
  - Search input for product component picker
  - Override price input with currency formatting

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Bundle component cards showing product image, name, SKU, quantity, and price
  - Bundle pricing summary card with component total and savings calculation
  - Bundle availability card showing stock breakdown by component

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - [bundle] indicator badge on product list/detail
  - Component count badge (e.g., "4 components")
  - Stock availability status badges (In Stock, Low Stock, limiting component)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | products | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/products.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Bundle Editor (Product Form - isBundle=true)

```
+========================================+
| New Product                       [X]  |
+========================================+
|                                        |
|  Product Name *                        |
|  [Solar Installation Kit______]        |
|                                        |
|  SKU *                                 |
|  [SIK-001_____________________]        |
|                                        |
|  Category                              |
|  [Bundles/Kits              v]         |
|                                        |
|  --------------------------------      |
|                                        |
|  [x] This is a bundle                  |
|                                        |
+========================================+
|                                        |
|  BUNDLE COMPONENTS                     |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Solar Panel 400W            x 4  |  |
|  | $450.00 each = $1,800.00         |  |
|  |                    [Edit] [X]    |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Inverter 5kW                x 1  |  |
|  | $1,200.00 each = $1,200.00       |  |
|  |                    [Edit] [X]    |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Mounting Kit               x 4   |  |
|  | $150.00 each = $600.00           |  |
|  |                    [Edit] [X]    |  |
|  +----------------------------------+  |
|                                        |
|  [+ Add Component]                     |
|                                        |
|  --------------------------------      |
|  Component Total: $3,600.00            |
|                                        |
+========================================+
|                                        |
|  BUNDLE PRICING                        |
|  --------------------------------      |
|                                        |
|  ( ) Use calculated price: $3,600.00   |
|  (*) Override bundle price             |
|                                        |
|  Bundle Price                          |
|  [$][____3,400.00_____]                |
|                                        |
|  Bundle Savings: $200 (5.6%)           |
|                                        |
+========================================+
|                                        |
|  [Cancel]           [Create Bundle]    |
|                                        |
+========================================+
```

### Add Component (Bottom Sheet)

```
+========================================+
| Add Component                     [X]  |
+========================================+
|                                        |
|  Search Products                       |
|  [Search...______________________] [X] |
|                                        |
|  Recent Products:                      |
|  +----------------------------------+  |
|  | Solar Panel 400W                 |  |
|  | SP-400W | $450.00                |  |
|  +----------------------------------+  |
|  | Inverter 5kW                     |  |
|  | INV-5K | $1,200.00               |  |
|  +----------------------------------+  |
|  | Mounting Kit                     |  |
|  | MNT-STD | $150.00                |  |
|  +----------------------------------+  |
|                                        |
+========================================+
|                                        |
|  (after selecting product)             |
|                                        |
|  Selected: Solar Panel 400W            |
|  Price: $450.00 each                   |
|                                        |
|  Quantity *                            |
|  [-] [___4___] [+]                     |
|                                        |
|  Component Total: $1,800.00            |
|                                        |
|  [Cancel]           [Add Component]    |
|                                        |
+========================================+
```

### Bundle Display on Product List

```
+========================================+
| Products                     [+ New]   |
+========================================+
| [Search_______________] [Filter v]     |
+========================================+
|                                        |
|  +----------------------------------+  |
|  | [bundle] Solar Installation Kit  |  |
|  | SIK-001 | Bundles                |  |
|  | $3,400.00 | 4 components         |  |
|  |                        Active *  |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Solar Panel 400W                 |  |
|  | SP-400W | Solar Panels           |  |
|  | $450.00                          |  |
|  |                        Active *  |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

### Order Items - Bundle Expanded for Picking

```
+========================================+
| Order #ORD-2026-0042                   |
+========================================+
|                                        |
|  Status: Ready for Picking             |
|                                        |
|  --------------------------------      |
|  LINE ITEMS                            |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | [bundle] Solar Install Kit  x 1  |  |
|  | $3,400.00                        |  |
|  |                                  |  |
|  | Components to pick:              |  |
|  | -------------------------------- |  |
|  | [ ] Solar Panel 400W        x 4  |  |
|  | [ ] Inverter 5kW            x 1  |  |
|  | [ ] Mounting Kit            x 4  |  |
|  | [ ] Cable 10m               x 2  |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Inverter 10kW              x 1   |  |
|  | $2,500.00                        |  |
|  |                                  |  |
|  | [ ] Pick item                    |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Bundle Editor (Product Detail Page)

```
+================================================================+
| <- Back to Products                                             |
+================================================================+
|                                                                 |
|  Solar Installation Kit                   [Edit] [Actions v]    |
|  SKU: SIK-001 | Category: Bundles | [bundle] Bundle             |
|  --------------------------------------------------------      |
|                                                                 |
|  [Overview] [Components] [Pricing] [Stock]                      |
|              ^active                                            |
|                                                                 |
+================================================================+
|                                                                 |
|  BUNDLE COMPONENTS (4)                      [+ Add Component]   |
|  --------------------------------------------------------      |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                                                            |  |
|  | Product              SKU       Qty   Unit      Total       |  |
|  | -------------------------------------------------------   |  |
|  | Solar Panel 400W     SP-400W   4     $450.00   $1,800.00  |  |
|  |                                             [Ed] [X]       |  |
|  | Inverter 5kW         INV-5K    1     $1,200    $1,200.00  |  |
|  |                                             [Ed] [X]       |  |
|  | Mounting Kit         MNT-STD   4     $150.00   $600.00    |  |
|  |                                             [Ed] [X]       |  |
|  | Cable 10m            CBL-10M   2     $45.00    $90.00     |  |
|  |                                             [Ed] [X]       |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  +------------------------+  +-------------------------------+  |
|  | COMPONENT TOTAL        |  | BUNDLE PRICING                |  |
|  | --------------------   |  | ---------------------------   |  |
|  | $3,690.00              |  | (*) Override price: $3,400    |  |
|  |                        |  | ( ) Use component total       |  |
|  |                        |  |                               |  |
|  |                        |  | Savings: $290 (7.9%)          |  |
|  +------------------------+  +-------------------------------+  |
|                                                                 |
+================================================================+
```

### Add Component Modal

```
+================================================================+
|                                                                 |
|  +----------------------------------------------------+        |
|  | Add Bundle Component                          [X]  |        |
|  +----------------------------------------------------+        |
|  |                                                    |        |
|  |  Search Products                                   |        |
|  |  [Search by name or SKU________________] [search]  |        |
|  |                                                    |        |
|  |  +----------------------------------------------+  |        |
|  |  | Solar Panel 400W                             |  |        |
|  |  | SP-400W | $450.00 | In Stock: 125            |  |        |
|  |  +----------------------------------------------+  |        |
|  |  | Solar Panel 500W                             |  |        |
|  |  | SP-500W | $550.00 | In Stock: 89             |  |        |
|  |  +----------------------------------------------+  |        |
|  |  | Inverter 5kW                                 |  |        |
|  |  | INV-5K | $1,200.00 | In Stock: 34            |  |        |
|  |  +----------------------------------------------+  |        |
|  |                                                    |        |
|  |  (after selection)                                 |        |
|  |  ------------------------------------------------ |        |
|  |  Selected: Solar Panel 400W                        |        |
|  |                                                    |        |
|  |  Quantity       Component Total                    |        |
|  |  [-] [__4__] [+]    $1,800.00                     |        |
|  |                                                    |        |
|  |                  [Cancel]    [Add Component]       |        |
|  +----------------------------------------------------+        |
|                                                                 |
+================================================================+
```

### Bundle Stock Availability

```
+================================================================+
|                                                                 |
|  BUNDLE STOCK AVAILABILITY                                      |
|  --------------------------------------------------------      |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | Available Bundle Sets: 25                                  |  |
|  | (Limited by: Cable 10m - 50 in stock / 2 per bundle = 25) |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  Component Stock Breakdown:                                     |
|  +-----------------------------------------------------------+  |
|  | Component         In Stock   Per Bundle   Sets Available   |  |
|  | --------------------------------------------------------- |  |
|  | Solar Panel 400W  125        4            31              |  |
|  | Inverter 5kW      34         1            34              |  |
|  | Mounting Kit      200        4            50              |  |
|  | Cable 10m         50         2            25 (limiting)   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Bundle Editor (Product Detail - Full)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | <- Back to Products                                                   |
| ------  |                                                                       |
| Catalog | Solar Installation Kit - Complete 4kW System    [Edit] [Duplicate] [v]|
|   All   | SKU: SIK-001 | Category: Bundles | [bundle] Product Bundle            |
|   Cat.  | ---------------------------------------------------------------------  |
| Orders  |                                                                       |
| Custmrs | [Overview] [Components] [Pricing] [Stock] [Orders]                    |
| Reports |              ^active                                                  |
|         |                                                                       |
+=========+======================================================================+
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | | BUNDLE COMPONENTS                                                  ||
|         | | ------------------------------------------------------------------ ||
|         | |                                                                    ||
|         | | This bundle contains 4 products. Components are deducted from      ||
|         | | inventory when the bundle is ordered.                              ||
|         | |                                                                    ||
|         | | [Search to add component...________________________] [+ Add]       ||
|         | |                                                                    ||
|         | | +----------------------------------------------------------------+ ||
|         | | |                                                                | ||
|         | | | [drag] Product              SKU        Qty   Unit      Total   | ||
|         | | | ------------------------------------------------------------ | ||
|         | | | [=]    Solar Panel 400W     SP-400W    4     $450.00  $1,800  | ||
|         | | |        Solar Panels                               [Edit] [X]  | ||
|         | | | [=]    Inverter 5kW         INV-5K     1     $1,200   $1,200  | ||
|         | | |        Inverters                                  [Edit] [X]  | ||
|         | | | [=]    Mounting Kit         MNT-STD    4     $150.00  $600    | ||
|         | | |        Mounting                                   [Edit] [X]  | ||
|         | | | [=]    Cable 10m            CBL-10M    2     $45.00   $90     | ||
|         | | |        Cables & Accessories                       [Edit] [X]  | ||
|         | | +----------------------------------------------------------------+ ||
|         | |                                                                    ||
|         | | Component Total: $3,690.00                                         ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
|         | +---------------------------+  +----------------------------------+   |
|         | | BUNDLE PRICING            |  | AVAILABILITY                     |   |
|         | | -----------------------   |  | -------------------------------- |   |
|         | |                           |  |                                  |   |
|         | | Pricing Method:           |  | Available Sets: 25               |   |
|         | | ( ) Component sum         |  | [================-----] 25 sets  |   |
|         | |     $3,690.00             |  |                                  |   |
|         | | (*) Override price        |  | Limiting Component:              |   |
|         | |     $3,400.00             |  | Cable 10m (50 in stock)          |   |
|         | |                           |  |                                  |   |
|         | | Override Price:           |  | [View Stock Breakdown]           |   |
|         | | [$][____3,400.00____]     |  |                                  |   |
|         | |                           |  +----------------------------------+   |
|         | | Bundle Discount:          |                                        |
|         | | $290.00 (7.9% savings)    |                                        |
|         | |                           |                                        |
|         | +---------------------------+                                        |
|         |                                                                       |
+=========+======================================================================+
```

### Create New Bundle Flow

```
+================================================================================+
| New Product Bundle                                                        [X]  |
+================================================================================+
|                                                                                 |
|  Step 1 of 3: Basic Information                                                 |
|  ============================================================================   |
|                                                                                 |
|  +----------------------------------+  +----------------------------------+     |
|  | Bundle Name *                    |  | SKU *                            |     |
|  | [Solar Installation Kit_____]    |  | [SIK-001_________________]       |     |
|  +----------------------------------+  +----------------------------------+     |
|                                                                                 |
|  +----------------------------------+  +----------------------------------+     |
|  | Category                         |  | Description                      |     |
|  | [Bundles/Kits            v]      |  | [Complete 4kW solar system   ]   |     |
|  +----------------------------------+  | [including panels, inverter, ]   |     |
|                                        | [mounting, and cables.       ]   |     |
|                                        +----------------------------------+     |
|                                                                                 |
|  [x] This product is a bundle (contains multiple products)                      |
|                                                                                 |
|                                                   [Cancel] [Next: Components >] |
|                                                                                 |
+================================================================================+

(Step 2)
+================================================================================+
| New Product Bundle                                                        [X]  |
+================================================================================+
|                                                                                 |
|  Step 2 of 3: Add Components                                                    |
|  ============================================================================   |
|                                                                                 |
|  Add the products that make up this bundle                                      |
|                                                                                 |
|  [Search products by name or SKU...________________________] [Search]           |
|                                                                                 |
|  Search Results:                                                                |
|  +----------------------------------------------------------------------------+ |
|  | Solar Panel 400W     SP-400W   $450.00   125 in stock       [+ Add]        | |
|  | Solar Panel 500W     SP-500W   $550.00   89 in stock        [+ Add]        | |
|  | Inverter 5kW         INV-5K    $1,200    34 in stock        [+ Add]        | |
|  | Inverter 10kW        INV-10K   $2,500    12 in stock        [+ Add]        | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  Bundle Components (4):                                                         |
|  +----------------------------------------------------------------------------+ |
|  | Product              SKU        Qty      Unit        Total        Actions   | |
|  | -------------------------------------------------------------------------- | |
|  | Solar Panel 400W     SP-400W    [_4_]    $450.00     $1,800.00    [X]       | |
|  | Inverter 5kW         INV-5K     [_1_]    $1,200.00   $1,200.00    [X]       | |
|  | Mounting Kit         MNT-STD    [_4_]    $150.00     $600.00      [X]       | |
|  | Cable 10m            CBL-10M    [_2_]    $45.00      $90.00       [X]       | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  Component Total: $3,690.00                                                     |
|                                                                                 |
|                                         [< Back] [Cancel] [Next: Pricing >]     |
|                                                                                 |
+================================================================================+

(Step 3)
+================================================================================+
| New Product Bundle                                                        [X]  |
+================================================================================+
|                                                                                 |
|  Step 3 of 3: Set Bundle Price                                                  |
|  ============================================================================   |
|                                                                                 |
|  +--------------------------------------+                                       |
|  | BUNDLE SUMMARY                       |                                       |
|  | ------------------------------------ |                                       |
|  | Name: Solar Installation Kit         |                                       |
|  | Components: 4 products               |                                       |
|  | Component Total: $3,690.00           |                                       |
|  +--------------------------------------+                                       |
|                                                                                 |
|  Pricing Method:                                                                |
|  +----------------------------------------------------------------------------+ |
|  | ( ) Use component total                                                    | |
|  |     Bundle price will be $3,690.00 (sum of all components)                 | |
|  |     Price updates automatically when component prices change               | |
|  |                                                                            | |
|  | (*) Set override price                                                     | |
|  |     Bundle price is fixed regardless of component prices                   | |
|  |                                                                            | |
|  |     Override Price: [$][____3,400.00________________]                      | |
|  |                                                                            | |
|  |     +----------------------------------------------------+                 | |
|  |     | Customer Savings:  $290.00 (7.9%)                  |                 | |
|  |     | Your Margin:       Calculate from cost...          |                 | |
|  |     +----------------------------------------------------+                 | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|                                         [< Back] [Cancel] [Create Bundle]       |
|                                                                                 |
+================================================================================+
```

### Order Detail - Bundle Components for Picking

```
+================================================================================+
| Order #ORD-2026-0042                                                           |
+================================================================================+
|                                                                                 |
|  Customer: Acme Corporation               Status: [*] Ready for Picking         |
|  Order Date: Jan 10, 2026                 Assigned: John Smith                  |
|                                                                                 |
+=== PICKING LIST ================================================================+
|                                                                                 |
|  +----------------------------------------------------------------------------+ |
|  |                                                                            | |
|  | LINE ITEMS                                                    Pick Status  | |
|  | -------------------------------------------------------------------------- | |
|  |                                                                            | |
|  | [bundle] Solar Installation Kit                               x 1          | |
|  | Bundle Price: $3,400.00                                                    | |
|  | +------------------------------------------------------------------------+ | |
|  | | COMPONENTS TO PICK:                                                    | | |
|  | | -------------------------------------------------------------------- | | |
|  | | [ ] Solar Panel 400W        SP-400W    Loc: A-12-3    x 4   [Picked] | | |
|  | | [ ] Inverter 5kW            INV-5K     Loc: B-05-1    x 1   [Picked] | | |
|  | | [ ] Mounting Kit            MNT-STD    Loc: C-22-4    x 4   [Picked] | | |
|  | | [ ] Cable 10m               CBL-10M    Loc: D-01-2    x 2   [Picked] | | |
|  | +------------------------------------------------------------------------+ | |
|  |                                                                            | |
|  | Inverter 10kW (standalone)                                    x 1          | |
|  | INV-10K | $2,500.00                                   Loc: B-05-2          | |
|  | [ ]                                                              [Picked]  | |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  +---------------------------+  +------------------------------------------+    |
|  | ORDER TOTALS              |  | PICKING PROGRESS                         |    |
|  | -----------------------   |  | ---------------------------------------- |    |
|  | Subtotal:      $5,900.00  |  | [============------------] 3/5 picked    |    |
|  | Tax (10%):     $590.00    |  |                                          |    |
|  | Total:         $6,490.00  |  | [Mark All Picked]  [Complete Picking]    |    |
|  +---------------------------+  +------------------------------------------+    |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
COMPONENTS LOADING:
+----------------------------------+
| BUNDLE COMPONENTS                |
| -------------------------------- |
|                                  |
| [...........................]    |
| [...........................]    |
| [...........................]    |
|                                  |
| <- Skeleton shimmer              |
+----------------------------------+

PRODUCT SEARCH LOADING:
+----------------------------------+
| [Search: "solar"____________]    |
|                                  |
| [spinner] Searching...           |
+----------------------------------+

CALCULATING AVAILABILITY:
+----------------------------------+
| Available Sets:                  |
| [spinner] Calculating...         |
+----------------------------------+
```

### Empty States

```
NO COMPONENTS (New Bundle):
+----------------------------------+
| BUNDLE COMPONENTS                |
| -------------------------------- |
|                                  |
|     [package icon]               |
|                                  |
|   No components added yet        |
|                                  |
|   Search and add products        |
|   to create your bundle          |
|                                  |
|   [+ Add First Component]        |
|                                  |
+----------------------------------+

NO SEARCH RESULTS:
+----------------------------------+
| [Search: "xyz"______________]    |
|                                  |
|   No products found for "xyz"    |
|                                  |
|   Try a different search term    |
|   or check the product catalog   |
|                                  |
+----------------------------------+
```

### Error States

```
COMPONENT ADD FAILED:
+----------------------------------+
| [!] Failed to add component      |
|     Please try again.            |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+

CIRCULAR DEPENDENCY:
+----------------------------------+
| [!] Cannot add this product      |
|                                  |
|     Bundles cannot contain       |
|     other bundles.               |
|                                  |
|     [OK]                         |
+----------------------------------+

INSUFFICIENT STOCK WARNING:
+----------------------------------+
| [!] Low Stock Warning            |
|                                  |
|     Cable 10m only has 50 units  |
|     in stock. This limits bundle |
|     availability to 25 sets.     |
|                                  |
|     [Continue Anyway] [Cancel]   |
+----------------------------------+
```

### Success States

```
COMPONENT ADDED:
+----------------------------------+
| [checkmark] Solar Panel 400W     |
|             added to bundle      |
| <- Toast 3s                      |
+----------------------------------+

BUNDLE CREATED:
+----------------------------------+
| [checkmark] Bundle created       |
|             successfully         |
| <- Toast + redirect              |
+----------------------------------+

ALL ITEMS PICKED:
+----------------------------------+
| [checkmark] All bundle           |
|             components picked    |
| <- Toast with confetti           |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Bundle Editor**
   - Tab to search/add component input
   - Tab through component rows
   - Within each row: quantity input -> edit -> delete
   - Tab to pricing method radios
   - Tab to override price input (if selected)
   - Tab to action buttons

2. **Add Component Modal**
   - Focus trapped in modal
   - Tab: Search -> Results list -> Quantity -> Cancel -> Add
   - Arrow keys navigate search results
   - Enter selects product
   - Escape closes modal

3. **Order Picking View**
   - Tab through pick checkboxes
   - Space toggles picked state
   - Tab to "Mark All Picked" button
   - Tab to "Complete Picking" button

### ARIA Requirements

```html
<!-- Bundle Badge -->
<span
  role="status"
  aria-label="Product bundle containing 4 components"
  class="bundle-badge"
>
  [bundle]
</span>

<!-- Component List -->
<section aria-labelledby="components-heading">
  <h3 id="components-heading">Bundle Components (4)</h3>
  <table role="table" aria-label="Bundle component products">
    <thead>
      <tr>
        <th scope="col">Product</th>
        <th scope="col">SKU</th>
        <th scope="col">Quantity</th>
        <th scope="col">Unit Price</th>
        <th scope="col">Total</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Solar Panel 400W</td>
        <td>SP-400W</td>
        <td>
          <input
            type="number"
            aria-label="Quantity for Solar Panel 400W"
            value="4"
          />
        </td>
        <td>$450.00</td>
        <td>$1,800.00</td>
        <td>
          <button aria-label="Edit Solar Panel 400W quantity">Edit</button>
          <button aria-label="Remove Solar Panel 400W from bundle">Remove</button>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<!-- Pricing Method -->
<fieldset>
  <legend>Bundle Pricing Method</legend>
  <label>
    <input
      type="radio"
      name="pricing-method"
      value="calculated"
      aria-describedby="calculated-desc"
    />
    Use component total
  </label>
  <p id="calculated-desc">$3,690.00 - updates with component prices</p>

  <label>
    <input
      type="radio"
      name="pricing-method"
      value="override"
      aria-describedby="override-desc"
    />
    Override price
  </label>
  <p id="override-desc">Set a fixed bundle price</p>
</fieldset>

<!-- Picking Checkbox -->
<label>
  <input
    type="checkbox"
    aria-label="Mark Solar Panel 400W as picked, 4 required"
  />
  <span>Solar Panel 400W x 4</span>
</label>

<!-- Availability Indicator -->
<div
  role="status"
  aria-live="polite"
  aria-label="25 complete bundles available, limited by Cable 10m stock"
>
  Available Sets: 25
</div>
```

### Screen Reader Announcements

- Component added: "Solar Panel 400W added to bundle, quantity 4"
- Component removed: "Inverter 5kW removed from bundle"
- Quantity changed: "Quantity updated to 6, component total $2,700"
- Pricing changed: "Bundle price set to $3,400, customer saves $290"
- Item picked: "Solar Panel 400W picked, 4 of 5 items complete"
- Stock warning: "Warning: Limited availability due to Cable 10m stock"

---

## Animation Choreography

### Component Row Operations

```
ADD COMPONENT:
- Duration: 300ms
- Easing: ease-out
- New row slides in from left
- Height expands: 0 -> full
- Opacity: 0 -> 1
- Other rows shift smoothly

REMOVE COMPONENT:
- Duration: 250ms
- Easing: ease-in
- Row slides out to left
- Height: full -> 0
- Opacity: 1 -> 0
- Rows below shift up

REORDER (drag):
- Duration: 200ms per position
- Row follows cursor with slight elevation
- Drop zone highlight pulse
- Smooth settle on drop
```

### Bundle Totals

```
COMPONENT TOTAL UPDATE:
- Duration: 300ms
- Number animation (count up/down)
- Subtle pulse on total display

SAVINGS CALCULATION:
- Duration: 400ms
- Appears after override price set
- Fade in with slight scale (0.95 -> 1)
- Green highlight for positive savings
```

### Picking Progress

```
ITEM PICKED:
- Duration: 200ms
- Checkbox: scale bounce (1 -> 1.2 -> 1)
- Row: background fade to green tint
- Strikethrough animation on text

ALL PICKED CELEBRATION:
- Duration: 500ms
- Confetti burst from center
- Progress bar fills with pulse
- "Complete" badge appears
```

### Modal Transitions

```
MODAL OPEN:
- Duration: 200ms
- Backdrop fade: 0 -> 0.5
- Modal scale: 0.95 -> 1
- Focus to search input

MODAL CLOSE:
- Duration: 150ms
- Modal fade: 1 -> 0
- Backdrop fade: 0.5 -> 0
```

---

## Component Props Interfaces

```typescript
// Bundle Editor
interface BundleEditorProps {
  productId?: string; // undefined for new bundle
  bundleData?: BundleData;
  onSave: (bundle: CreateBundleInput | UpdateBundleInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface BundleData {
  id: string;
  name: string;
  sku: string;
  components: BundleComponent[];
  pricingMethod: 'calculated' | 'override';
  overridePrice?: number;
  componentTotal: number;
}

interface BundleComponent {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CreateBundleInput {
  name: string;
  sku: string;
  categoryId?: string;
  description?: string;
  components: { productId: string; quantity: number }[];
  pricingMethod: 'calculated' | 'override';
  overridePrice?: number;
}

// Component Search
interface ComponentSearchProps {
  onSelect: (product: Product, quantity: number) => void;
  excludeProductIds?: string[]; // Exclude already-added products
  excludeBundles?: boolean; // Prevent circular dependencies
}

// Bundle Component Row
interface BundleComponentRowProps {
  component: BundleComponent;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  isDragging?: boolean;
  dragHandleProps?: DragHandleProps;
}

// Bundle Pricing
interface BundlePricingProps {
  componentTotal: number;
  pricingMethod: 'calculated' | 'override';
  overridePrice?: number;
  onMethodChange: (method: 'calculated' | 'override') => void;
  onPriceChange: (price: number) => void;
}

// Bundle Availability
interface BundleAvailabilityProps {
  bundleId: string;
  components: BundleComponent[];
  onViewBreakdown: () => void;
}

interface AvailabilityResult {
  availableSets: number;
  limitingComponent: {
    productId: string;
    productName: string;
    inStock: number;
    perBundle: number;
  } | null;
  componentBreakdown: {
    productId: string;
    productName: string;
    inStock: number;
    perBundle: number;
    setsAvailable: number;
  }[];
}

// Order Bundle Picking
interface BundlePickingListProps {
  lineItem: OrderLineItem;
  components: ExpandedBundleComponent[];
  onComponentPicked: (componentId: string) => void;
  onAllPicked: () => void;
}

interface ExpandedBundleComponent {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  location?: string;
  isPicked: boolean;
}

// Bundle Badge
interface BundleBadgeProps {
  componentCount: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/products/bundle-editor.tsx` | Main bundle editing interface |
| `src/components/domain/products/bundle-component-row.tsx` | Individual component row |
| `src/components/domain/products/bundle-component-search.tsx` | Product search for adding |
| `src/components/domain/products/bundle-pricing.tsx` | Pricing method selection |
| `src/components/domain/products/bundle-availability.tsx` | Stock availability display |
| `src/components/domain/products/bundle-badge.tsx` | Bundle indicator badge |
| `src/components/domain/orders/bundle-picking-list.tsx` | Order picking component |
| `src/routes/catalog/$productId.tsx` | Integration on product detail |
| `src/components/domain/products/product-form.tsx` | Bundle toggle integration |

---

## Related Wireframes

- Product Form (bundle toggle)
- Product List (bundle badge display)
- Order Detail (bundle expansion for picking)
- Inventory (bundle stock calculations)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Wireframe Generator
