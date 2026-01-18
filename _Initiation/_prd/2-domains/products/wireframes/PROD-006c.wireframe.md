# Wireframe: DOM-PROD-006c - Discontinued Product Handling: UI

## Story Reference

- **Story ID**: DOM-PROD-006c
- **Name**: Discontinued Product Handling: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

UI for managing product lifecycle including discontinue action with replacement selection, visibility controls in product list, warnings on existing orders with discontinued items, and replacement suggestions when viewing discontinued products.

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Discontinue product confirmation modal with replacement selector
  - Reactivate product confirmation dialog
  - Delete confirmation when removing discontinued products

### Alert
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Discontinued product banner on product detail page
  - Order warning banner when viewing orders with discontinued items
  - Replacement suggestion alert with benefits and pricing

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - DISCONTINUED status badge with timestamp
  - Active/Discontinued filter badges in product list
  - Warning badge count on orders with discontinued items

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Replacement product suggestion card with comparison
  - Discontinued item details card showing discontinuation date
  - Swap action card with price difference and benefits

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Replacement product picker with search
  - Status filter dropdown (Active, Discontinued, Draft)
  - Suggested replacement selector with radio options

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

### Product Status Display (Product Detail)

```
+========================================+
| <- Products                            |
+========================================+
|                                        |
|  Solar Panel 300W                      |
|  SKU: SP-300W                          |
|  --------------------------------      |
|  Status: [discontinued] DISCONTINUED   |
|  Discontinued: Jan 5, 2026             |
|                                        |
+========================================+
|                                        |
|  +----------------------------------+  |
|  | [!] THIS PRODUCT IS DISCONTINUED |  |
|  |                                  |  |
|  | No longer available for new      |  |
|  | orders or quotes.                |  |
|  |                                  |  |
|  | Suggested Replacement:           |  |
|  | +------------------------------+ |  |
|  | | [img] Solar Panel 400W       | |  |
|  | |       SP-400W | $450.00      | |  |
|  | |       [View Product ->]      | |  |
|  | +------------------------------+ |  |
|  +----------------------------------+  |
|                                        |
|  [Overview] [Orders] [History]         |
|                                        |
+========================================+
```

### Discontinue Dialog (Bottom Sheet)

```
+========================================+
| Discontinue Product               [X]  |
+========================================+
|                                        |
|  Are you sure you want to              |
|  discontinue this product?             |
|                                        |
|  Solar Panel 300W                      |
|  SKU: SP-300W                          |
|                                        |
|  --------------------------------      |
|                                        |
|  This will:                            |
|  [!] Remove from product pickers       |
|  [!] Hide from default list view       |
|  [!] Warn when viewing past orders     |
|                                        |
|  --------------------------------      |
|                                        |
|  Suggest Replacement (optional)        |
|  [Search products...___________] [v]   |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 400W           |  |
|  |       SP-400W | $450.00          |  |
|  |       Similar specs, newer model |  |
|  |       [Select]                   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 350W           |  |
|  |       SP-350W | $380.00          |  |
|  |       Lower wattage option       |  |
|  |       [Select]                   |  |
|  +----------------------------------+  |
|                                        |
|  Selected: Solar Panel 400W            |
|                                        |
|  --------------------------------      |
|                                        |
|  [Cancel]          [Discontinue]       |
|                                        |
+========================================+
```

### Product List - Status Filter

```
+========================================+
| Products                     [+ New]   |
+========================================+
| [Search_______________] [Filter v]     |
+========================================+
|                                        |
| Filter Panel (expanded):               |
+========================================+
|                                        |
|  Status                                |
|  [x] Active                            |
|  [ ] Discontinued                      |
|  [ ] Draft                             |
|                                        |
|  [Clear]           [Apply Filters]     |
|                                        |
+========================================+
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 400W           |  |
|  |       SP-400W | $450.00          |  |
|  |       [*] Active                 |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 500W           |  |
|  |       SP-500W | $550.00          |  |
|  |       [*] Active                 |  |
|  +----------------------------------+  |
|                                        |
|  Toggle: [Show Discontinued]           |
|                                        |
+========================================+
```

### Product List - With Discontinued Products

```
+========================================+
| Products                     [+ New]   |
+========================================+
| [Search_______________] [Filter v]     |
|                                        |
| Showing: Active + Discontinued         |
+========================================+
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 400W           |  |
|  |       SP-400W | $450.00          |  |
|  |       [*] Active                 |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 300W           |  |
|  |       SP-300W | $350.00          |  |
|  |       [x] DISCONTINUED           |  |
|  |       ^ Faded/strikethrough      |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Inverter 3kW               |  |
|  |       INV-3K | $800.00           |  |
|  |       [x] DISCONTINUED           |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

### Order Detail - Discontinued Item Warning

```
+========================================+
| Order #ORD-2025-0089                   |
+========================================+
|                                        |
|  Customer: Acme Corporation            |
|  Status: Open                          |
|                                        |
|  --------------------------------      |
|  LINE ITEMS                            |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Solar Panel 400W            x 10 |  |
|  | $450.00 each                     |  |
|  | Subtotal: $4,500.00              |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [!] Solar Panel 300W        x 5  |  |
|  |     $350.00 each                 |  |
|  |     Subtotal: $1,750.00          |  |
|  |     -------------------------    |  |
|  |     [!] PRODUCT DISCONTINUED     |  |
|  |     This product is no longer    |  |
|  |     available.                   |  |
|  |                                  |  |
|  |     Replacement:                 |  |
|  |     Solar Panel 400W (+$100/ea)  |  |
|  |     [Swap Product]               |  |
|  +----------------------------------+  |
|                                        |
|  --------------------------------      |
|  Total: $6,250.00                      |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Product Status Badge & Actions

```
+================================================================+
| <- Back to Products                                             |
+================================================================+
|                                                                 |
|  Solar Panel 300W                          [Edit] [Actions v]   |
|  SKU: SP-300W | Category: Solar Panels                          |
|                                                                 |
|  Status: [x DISCONTINUED]  |  Discontinued: Jan 5, 2026         |
|  --------------------------------------------------------      |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | [!] THIS PRODUCT HAS BEEN DISCONTINUED                     |  |
|  | -----------------------------------------------------------| |
|  |                                                             |  |
|  | This product is no longer available for new orders.         |  |
|  | Existing orders may still reference this product.           |  |
|  |                                                             |  |
|  | SUGGESTED REPLACEMENT:                                      |  |
|  | +-------------------------------------------------------+   |  |
|  | | [img]  Solar Panel 400W (SP-400W)        $450.00      |   |  |
|  | |        Higher wattage, same dimensions                |   |  |
|  | |                                   [View Replacement]  |   |  |
|  | +-------------------------------------------------------+   |  |
|  |                                                             |  |
|  | [Reactivate Product]                                        |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Discontinue Dialog (Modal)

```
+================================================================+
|                                                                 |
|  +----------------------------------------------------------+  |
|  | Discontinue Product                                  [X]  |  |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  | You are about to discontinue:                            |  |
|  |                                                          |  |
|  | +------------------------------------------------------+ |  |
|  | | [img]  Solar Panel 300W                              | |  |
|  | |        SKU: SP-300W  |  Currently Active             | |  |
|  | +------------------------------------------------------+ |  |
|  |                                                          |  |
|  | This action will:                                        |  |
|  | [!] Remove from all product pickers and search           |  |
|  | [!] Hide from product list (visible with filter)         |  |
|  | [!] Add warnings to existing orders with this item       |  |
|  |                                                          |  |
|  | -------------------------------------------------------- |  |
|  |                                                          |  |
|  | Suggest a Replacement (optional)                         |  |
|  | [Search for replacement product..._______________]       |  |
|  |                                                          |  |
|  | +------------------------------------------------------+ |  |
|  | | [img] Solar Panel 400W     SP-400W     $450    [Sel] | |  |
|  | | [img] Solar Panel 350W     SP-350W     $380    [Sel] | |  |
|  | +------------------------------------------------------+ |  |
|  |                                                          |  |
|  | Selected: Solar Panel 400W (SP-400W)                     |  |
|  |                                                          |  |
|  |                   [Cancel]    [Discontinue Product]      |  |
|  +----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Product List with Status Column

```
+================================================================+
| Products                                      [+ New Product]   |
+================================================================+
| [Search______________] [Category v] [Status v] [Sort: Name v]   |
|                                                                 |
| Status: [All] [Active] [Discontinued] [Draft]                   |
+================================================================+
|                                                                 |
| +-----------------------------------------------------------+  |
| |                                                            |  |
| | [img] | Product          | SKU      | Price   | Status     |  |
| | ------+------------------+----------+---------+----------- |  |
| | [img] | Solar Panel 400W | SP-400W  | $450    | [*] Active |  |
| | [img] | Solar Panel 500W | SP-500W  | $550    | [*] Active |  |
| | [img] | Inverter 5kW     | INV-5K   | $1,200  | [*] Active |  |
| | [img] | Solar Panel 300W | SP-300W  | $350    | [x] Disc.  |  |
| |       | ^ faded styling                                    |  |
| | [img] | Inverter 3kW     | INV-3K   | $800    | [x] Disc.  |  |
| |       | ^ faded styling                                    |  |
| |                                                            |  |
| +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Order Items - Discontinued Warning Banner

```
+================================================================+
| Order #ORD-2025-0089                                            |
+================================================================+
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | [!] ORDER CONTAINS DISCONTINUED PRODUCT(S)                 |  |
|  | -----------------------------------------------------------| |
|  | 1 item in this order has been discontinued.                |  |
|  | Review and consider swapping for available alternatives.   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  LINE ITEMS                                                     |
|  --------------------------------------------------------      |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | Solar Panel 400W            x 10    $450.00    $4,500.00  |  |
|  | SP-400W                                                   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | [!] Solar Panel 300W        x 5     $350.00    $1,750.00  |  |
|  | SP-300W | DISCONTINUED                                    |  |
|  | --------------------------------------------------------- |  |
|  | [!] This product is discontinued                          |  |
|  |     Replacement: Solar Panel 400W (+$100.00 ea)           |  |
|  |     [Swap to Replacement] [Keep Current]                  |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  Order Total: $6,250.00                                         |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Product Detail - Discontinued State (Full)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | <- Back to Products                                                   |
| ------  |                                                                       |
| Catalog | Solar Panel 300W - Standard Efficiency                                |
|   All   | SKU: SP-300W | Category: Solar Panels                                 |
|   Cat.  |                                                                       |
| Orders  | Status: [x DISCONTINUED]  Discontinued: Jan 5, 2026                   |
| Custmrs | ---------------------------------------------------------------------  |
| Reports |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | |                                                                    ||
|         | | [!] THIS PRODUCT HAS BEEN DISCONTINUED                             ||
|         | | ------------------------------------------------------------------ ||
|         | |                                                                    ||
|         | | This product is no longer available for new orders or quotes.      ||
|         | | It has been replaced with an updated model.                        ||
|         | |                                                                    ||
|         | | SUGGESTED REPLACEMENT:                                             ||
|         | | +----------------------------------------------------------------+ ||
|         | | |                                                                | ||
|         | | | [img]  Solar Panel 400W                                        | ||
|         | | |        SKU: SP-400W                                            | ||
|         | | |        Price: $450.00 (+$100.00)                               | ||
|         | | |                                                                | ||
|         | | |        Why this replacement?                                   | ||
|         | | |        - Same physical dimensions (fits existing mounts)       | ||
|         | | |        - Higher output (400W vs 300W)                          | ||
|         | | |        - Improved efficiency (21.5% vs 18.5%)                  | ||
|         | | |                                                                | ||
|         | | |                             [View Product] [Use in New Order]  | ||
|         | | +----------------------------------------------------------------+ ||
|         | |                                                                    ||
|         | | Actions:                                                           ||
|         | | [Reactivate Product]  [Change Replacement]  [View Order History]   ||
|         | |                                                                    ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
|         | [Overview] [Orders] [Stock History]                                   |
|         |                                                                       |
+=========+======================================================================+
```

### Discontinue Dialog (Desktop Modal)

```
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | Discontinue Product                                                  [X] |  |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | +----------------------------------------------------------------------+ |  |
|  | | PRODUCT TO DISCONTINUE                                               | |  |
|  | | -------------------------------------------------------------------- | |  |
|  | |                                                                      | |  |
|  | | [img]  Solar Panel 300W                                              | |  |
|  | |        SKU: SP-300W  |  Category: Solar Panels  |  Price: $350.00    | |  |
|  | |        Status: Currently Active                                      | |  |
|  | |        Open Orders: 3  |  Recent Sales: 12 (last 30 days)           | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  | What happens when you discontinue:                                       |  |
|  | +----------------------------------------------------------------------+ |  |
|  | | [!] Product removed from all pickers and search results              | |  |
|  | | [!] Hidden from product list by default (filter to view)             | |  |
|  | | [!] Warning badges added to 3 existing orders                        | |  |
|  | | [!] Cannot be added to new orders or quotes                          | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  | ======================================================================== |  |
|  |                                                                          |  |
|  | SELECT A REPLACEMENT PRODUCT (Recommended)                               |  |
|  |                                                                          |  |
|  | [Search for replacement product...______________________________]        |  |
|  |                                                                          |  |
|  | Suggested replacements (similar products):                               |  |
|  | +----------------------------------------------------------------------+ |  |
|  | |                                                                      | |  |
|  | | ( ) Solar Panel 400W    SP-400W   $450.00  +$100   Same size, higher | |  |
|  | |                                            output                    | |  |
|  | | ( ) Solar Panel 350W    SP-350W   $380.00  +$30    Closer price      | |  |
|  | |                                            point                     | |  |
|  | | ( ) Solar Panel 450W    SP-450W   $495.00  +$145   Premium option    | |  |
|  | |                                                                      | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  | Selected Replacement: Solar Panel 400W (SP-400W)                         |  |
|  |                                                                          |  |
|  |                                                                          |  |
|  |                               [Cancel]    [Discontinue Product]          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

### Product List - Status Filter & Display

```
+================================================================================+
| Products                                                       [+ New Product]  |
+================================================================================+
| [Search________________________] [Category v] [Status v] [Sort: Name v]         |
|                                                                                 |
| Status Filter: [All] [Active (45)] [Discontinued (8)] [Draft (2)]               |
|                                                                                 |
| Active Filters: [Status: Discontinued x]                        [Clear Filters] |
+================================================================================+
|                                                                                 |
| +----------------------------------------------------------------------------+ |
| |                                                                            | |
| | [img] | Product            | SKU      | Category     | Price   | Status    | |
| | ------+--------------------+----------+--------------+---------+---------- | |
| | [img] | Solar Panel 300W   | SP-300W  | Solar Panels | $350    | Disc.     | |
| |       | Discontinued Jan 5, 2026 | Replacement: SP-400W                    | |
| |       |                    |          |              |         |           | |
| | [img] | Inverter 3kW       | INV-3K   | Inverters    | $800    | Disc.     | |
| |       | Discontinued Dec 1, 2025 | Replacement: INV-5K                     | |
| |       |                    |          |              |         |           | |
| | [img] | Battery 5kWh       | BAT-5K   | Batteries    | $2,000  | Disc.     | |
| |       | Discontinued Nov 15, 2025 | No replacement set                     | |
| |       |                    |          |              |         |           | |
| | [img] | Mounting Bracket v1| MNT-V1   | Mounting     | $45     | Disc.     | |
| |       | Discontinued Oct 1, 2025 | Replacement: MNT-V2                      | |
| |                                                                            | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
| Showing 8 discontinued products                                 < 1 >           |
|                                                                                 |
+================================================================================+
```

### Order Detail - Discontinued Items Warning (Full)

```
+================================================================================+
| Order #ORD-2025-0089                                                           |
+================================================================================+
|                                                                                 |
|  Customer: Acme Corporation               Status: Open                          |
|  Order Date: Dec 15, 2025                 Rep: John Smith                       |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | [!] ORDER CONTAINS DISCONTINUED ITEMS                                     |  |
|  | ------------------------------------------------------------------------ |  |
|  |                                                                          |  |
|  | 1 item in this order has been discontinued since the order was created.  |  |
|  | Consider swapping to the suggested replacement or confirming with the    |  |
|  | customer.                                                                |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  LINE ITEMS                                                                     |
|  ============================================================================   |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | Product              SKU       Qty    Unit Price    Total       Status   |  |
|  | ------------------------------------------------------------------------ |  |
|  | Solar Panel 400W     SP-400W   10     $450.00       $4,500.00   OK       |  |
|  |                                                                          |  |
|  | [!] Solar Panel 300W SP-300W   5      $350.00       $1,750.00   DISC     |  |
|  | +----------------------------------------------------------------------+ |  |
|  | |                                                                      | |  |
|  | | [!] This product was discontinued on Jan 5, 2026                     | |  |
|  | |                                                                      | |  |
|  | | Suggested Replacement: Solar Panel 400W (SP-400W)                    | |  |
|  | | Price difference: +$100.00 per unit (+$500.00 total)                 | |  |
|  | |                                                                      | |  |
|  | | [Swap to Replacement]  [Keep Current & Proceed]  [Remove Item]       | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +------------------------+                                                     |
|  | ORDER SUMMARY          |                                                     |
|  | ---------------------- |                                                     |
|  | Subtotal:   $6,250.00  |                                                     |
|  | Tax (10%):  $625.00    |                                                     |
|  | Total:      $6,875.00  |                                                     |
|  +------------------------+                                                     |
|                                                                                 |
+================================================================================+
```

### Product Picker - Hiding Discontinued

```
+================================================================================+
| Select Product                                                            [X]  |
+================================================================================+
|                                                                                 |
|  [Search products...______________________________________]                     |
|                                                                                 |
|  [ ] Include discontinued products                                              |
|                                                                                 |
|  Category: [All Categories v]                                                   |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | [img] | Product            | SKU      | Price    | Stock   | Action      |  |
|  | ------+--------------------+----------+----------+---------+------------ |  |
|  | [img] | Solar Panel 400W   | SP-400W  | $450.00  | 125     | [Add]       |  |
|  | [img] | Solar Panel 500W   | SP-500W  | $550.00  | 89      | [Add]       |  |
|  | [img] | Solar Panel 350W   | SP-350W  | $380.00  | 67      | [Add]       |  |
|  | [img] | Inverter 5kW       | INV-5K   | $1,200   | 34      | [Add]       |  |
|  | [img] | Inverter 10kW      | INV-10K  | $2,500   | 12      | [Add]       |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  Note: Discontinued products are hidden by default                              |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
DISCONTINUING:
+----------------------------------+
| [spinner] Discontinuing...       |
|                                  |
| Updating product status and      |
| notifying affected orders...     |
+----------------------------------+

LOADING REPLACEMENT SUGGESTIONS:
+----------------------------------+
| Suggested replacements:          |
|                                  |
| [...........................]    |
| [...........................]    |
| [...........................]    |
| <- Skeleton shimmer              |
+----------------------------------+

SWAPPING PRODUCT:
+----------------------------------+
| [spinner] Swapping product...    |
|                                  |
| Updating order line item...      |
+----------------------------------+
```

### Empty States

```
NO REPLACEMENT SUGGESTIONS:
+----------------------------------+
| Suggested replacements:          |
|                                  |
|   No similar products found      |
|                                  |
|   Search manually or skip        |
|   setting a replacement          |
|                                  |
+----------------------------------+

NO DISCONTINUED PRODUCTS:
+----------------------------------+
| Status: Discontinued             |
|                                  |
|   No discontinued products       |
|                                  |
|   All products in your catalog   |
|   are currently active           |
|                                  |
+----------------------------------+
```

### Error States

```
DISCONTINUE FAILED:
+----------------------------------+
| [!] Failed to discontinue        |
|                                  |
|     The product could not be     |
|     discontinued. Please try     |
|     again.                       |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+

SWAP FAILED:
+----------------------------------+
| [!] Product swap failed          |
|                                  |
|     Could not swap Solar Panel   |
|     300W for Solar Panel 400W.   |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+

CANNOT DISCONTINUE (pending orders):
+----------------------------------+
| [!] Cannot discontinue           |
|                                  |
|     This product has pending     |
|     orders that must be          |
|     fulfilled first.             |
|                                  |
|     [View Orders] [Cancel]       |
+----------------------------------+
```

### Success States

```
PRODUCT DISCONTINUED:
+----------------------------------+
| [checkmark] Product discontinued |
|             Solar Panel 300W     |
|             is now discontinued  |
| <- Toast 3s                      |
+----------------------------------+

PRODUCT REACTIVATED:
+----------------------------------+
| [checkmark] Product reactivated  |
|             Solar Panel 300W     |
|             is now active        |
| <- Toast 3s                      |
+----------------------------------+

PRODUCT SWAPPED:
+----------------------------------+
| [checkmark] Product swapped      |
|             Replaced with        |
|             Solar Panel 400W     |
| <- Toast 3s                      |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Discontinue Dialog**
   - Focus trapped in modal
   - Tab: Search -> Replacement options -> Cancel -> Discontinue
   - Escape closes modal

2. **Discontinued Product Banner**
   - Banner focusable
   - Tab to replacement link
   - Tab to action buttons

3. **Order Discontinued Warning**
   - Warning banner focusable
   - Tab through each line item warning
   - Tab to action buttons within warning

4. **Product List with Status**
   - Tab through filter options
   - Status column readable by screen readers

### ARIA Requirements

```html
<!-- Discontinued Status Badge -->
<span
  role="status"
  aria-label="Product status: Discontinued since January 5, 2026"
  class="status-badge discontinued"
>
  DISCONTINUED
</span>

<!-- Discontinue Confirmation Dialog -->
<dialog
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="discontinue-title"
  aria-describedby="discontinue-desc"
>
  <h2 id="discontinue-title">Discontinue Product</h2>
  <p id="discontinue-desc">
    You are about to discontinue Solar Panel 300W.
    This will hide it from product pickers and add warnings to existing orders.
  </p>
</dialog>

<!-- Discontinued Warning Banner -->
<div
  role="alert"
  aria-labelledby="discontinued-warning-title"
>
  <h3 id="discontinued-warning-title">This Product Has Been Discontinued</h3>
  <p>No longer available for new orders.</p>
  <a href="..." aria-label="View suggested replacement: Solar Panel 400W">
    View Replacement
  </a>
</div>

<!-- Order Discontinued Item Warning -->
<div
  role="alert"
  aria-live="polite"
>
  <p>Order contains discontinued product: Solar Panel 300W</p>
  <button aria-label="Swap Solar Panel 300W with replacement Solar Panel 400W">
    Swap to Replacement
  </button>
</div>

<!-- Status Filter -->
<fieldset>
  <legend>Filter by Status</legend>
  <label>
    <input type="checkbox" checked />
    Active (45 products)
  </label>
  <label>
    <input type="checkbox" />
    Discontinued (8 products)
  </label>
</fieldset>

<!-- Product Picker Hide Discontinued -->
<label>
  <input
    type="checkbox"
    aria-describedby="include-disc-help"
  />
  Include discontinued products
</label>
<p id="include-disc-help">
  Discontinued products are hidden by default
</p>
```

### Screen Reader Announcements

- Product discontinued: "Solar Panel 300W has been discontinued. Replacement set to Solar Panel 400W"
- Product reactivated: "Solar Panel 300W has been reactivated"
- Replacement suggestion: "Suggested replacement: Solar Panel 400W, price increase $100"
- Order warning: "Warning: Order contains 1 discontinued product"
- Product swapped: "Product swapped from Solar Panel 300W to Solar Panel 400W"

---

## Animation Choreography

### Discontinue Action

```
DISCONTINUE BUTTON PRESS:
- Duration: 150ms
- Scale: 1 -> 0.95 -> 1
- Confirmation dialog appears

DIALOG OPEN:
- Duration: 200ms
- Backdrop: opacity 0 -> 0.5
- Dialog: scale 0.95 -> 1

PROCESSING:
- Button: loading spinner
- Duration: until complete
```

### Status Badge Transitions

```
ACTIVE -> DISCONTINUED:
- Duration: 300ms
- Old badge: fade out
- New badge: fade in with pulse
- Row: background desaturate

DISCONTINUED -> ACTIVE:
- Duration: 300ms
- Old badge: fade out
- New badge: fade in with pulse
- Row: background saturate
```

### Warning Banners

```
BANNER APPEAR:
- Duration: 300ms
- Height: 0 -> full
- Opacity: 0 -> 1
- Background: warning color pulse

BANNER DISMISS:
- Duration: 200ms
- Height: full -> 0
- Opacity: 1 -> 0
```

### Product Swap

```
SWAP ANIMATION:
- Duration: 400ms
- Old item: slide out left + fade
- New item: slide in right + fade
- Brief green highlight on new item
```

### List Filtering

```
SHOW DISCONTINUED:
- Duration: 300ms (staggered)
- Items: fade in + slide down
- 50ms delay between items

HIDE DISCONTINUED:
- Duration: 200ms
- Items: fade out + slide up
- Simultaneous
```

---

## Component Props Interfaces

```typescript
// Discontinue Dialog
interface DiscontinueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onDiscontinue: (replacementId?: string) => Promise<void>;
  suggestedReplacements: Product[];
  isLoading?: boolean;
}

// Discontinued Product Banner
interface DiscontinuedBannerProps {
  product: Product;
  replacement?: Product;
  discontinuedAt: Date;
  onReactivate?: () => void;
  onChangeReplacement?: () => void;
  showActions?: boolean;
}

// Product Status Badge
interface ProductStatusBadgeProps {
  status: 'active' | 'discontinued' | 'draft';
  discontinuedAt?: Date;
  size?: 'sm' | 'md' | 'lg';
}

// Order Discontinued Warning
interface OrderDiscontinuedWarningProps {
  lineItems: OrderLineItem[];
  discontinuedItems: DiscontinuedLineItem[];
  onSwap: (lineItemId: string, replacementProductId: string) => Promise<void>;
  onRemove: (lineItemId: string) => Promise<void>;
  onKeep: (lineItemId: string) => void;
}

interface DiscontinuedLineItem {
  lineItemId: string;
  product: Product;
  replacement?: Product;
  priceDifference: number;
}

// Status Filter
interface ProductStatusFilterProps {
  value: ProductStatus[];
  onChange: (statuses: ProductStatus[]) => void;
  counts: Record<ProductStatus, number>;
}

type ProductStatus = 'active' | 'discontinued' | 'draft';

// Product Picker with Discontinued Toggle
interface ProductPickerProps {
  onSelect: (product: Product) => void;
  includeDiscontinued?: boolean;
  onIncludeDiscontinuedChange?: (include: boolean) => void;
  excludeProductIds?: string[];
}

// Replacement Selector
interface ReplacementSelectorProps {
  currentProduct: Product;
  suggestions: Product[];
  selectedId?: string;
  onSelect: (productId: string) => void;
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

// Swap Product Action
interface SwapProductActionProps {
  discontinuedProduct: Product;
  replacement: Product;
  quantity: number;
  priceDifference: number;
  onSwap: () => void;
  onKeep: () => void;
  onRemove: () => void;
  isSwapping?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/products/discontinue-dialog.tsx` | Discontinue confirmation modal |
| `src/components/domain/products/discontinued-banner.tsx` | Product detail warning banner |
| `src/components/domain/products/product-status-badge.tsx` | Status indicator badge |
| `src/components/domain/products/replacement-selector.tsx` | Replacement product picker |
| `src/components/domain/orders/discontinued-warning.tsx` | Order line item warning |
| `src/components/domain/orders/swap-product-action.tsx` | Swap product inline action |
| `src/routes/catalog/$productId.tsx` | Discontinued state integration |
| `src/routes/catalog/index.tsx` | Status filter integration |
| `src/components/domain/products/product-picker.tsx` | Hide discontinued toggle |

---

## Related Wireframes

- Product Detail Page (status display)
- Product List (status filtering)
- Order Detail (discontinued warnings)
- Product Picker (hiding discontinued)
- Quote Builder (discontinued handling)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Wireframe Generator
