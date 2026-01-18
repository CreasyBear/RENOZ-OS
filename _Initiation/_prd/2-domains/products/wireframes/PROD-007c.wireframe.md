# Wireframe: DOM-PROD-007c - Related Products: UI

## Story Reference

- **Story ID**: DOM-PROD-007c
- **Name**: Related Products: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

UI for managing product relationships and displaying related products. Includes relation management on product detail page, product search with relationship type selection, and grouped display of accessories, alternatives, and upgrades.

## UI Patterns (Reference Implementation)

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - Related Products tab on product detail page
  - Grouped sections (Accessories, Alternatives, Upgrades)
  - Tab navigation between relation types

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Add related product modal with search and type selection
  - Remove relation confirmation dialog
  - Product comparison modal for alternatives

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Related product cards showing image, name, SKU, price
  - "Frequently Bought Together" bundle card with total pricing
  - Upgrade suggestion card with benefits and price difference

### RadioGroup
- **Pattern**: RE-UI RadioGroup
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Relation type selector (Accessory, Alternative, Upgrade)
  - Replacement product radio selection in suggestions
  - Alternative product comparison radio group

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Relation type badges (Accessory, Alternative, Upgrade)
  - Product count badges per relation type
  - Savings badge for bundle pricing

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Search input for finding related products
  - Quantity input for "Add All" accessories feature
  - Filter input in product comparison view

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

### Related Products Tab (Product Detail)

```
+========================================+
| <- Products                            |
+========================================+
|                                        |
|  Solar Panel 400W                      |
|  SKU: SP-400W                          |
|                                        |
|  [Overview] [Pricing] [Related]        |
|                        ^active         |
|                                        |
+========================================+
|                                        |
|  RELATED PRODUCTS                      |
|  --------------------------------      |
|                                        |
|  ACCESSORIES (3)                       |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | [img] Mounting Kit               |  |
|  |       MNT-STD | $150.00          |  |
|  |       Fits all 400W panels       |  |
|  |                         [X]      |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] MC4 Connector Cable        |  |
|  |       CBL-MC4 | $25.00           |  |
|  |       10m extension cable        |  |
|  |                         [X]      |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Junction Box               |  |
|  |       JB-001 | $45.00            |  |
|  |       Weatherproof               |  |
|  |                         [X]      |  |
|  +----------------------------------+  |
|                                        |
|  --------------------------------      |
|                                        |
|  ALTERNATIVES (2)                      |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 350W           |  |
|  |       SP-350W | $380.00          |  |
|  |       Lower wattage option       |  |
|  |                         [X]      |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 400W Premium   |  |
|  |       SP-400P | $520.00          |  |
|  |       Bifacial technology        |  |
|  |                         [X]      |  |
|  +----------------------------------+  |
|                                        |
|  --------------------------------      |
|                                        |
|  UPGRADES (1)                          |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | [img] Solar Panel 500W           |  |
|  |       SP-500W | $550.00          |  |
|  |       Higher output              |  |
|  |                         [X]      |  |
|  +----------------------------------+  |
|                                        |
|  [+ Add Related Product]               |
|                                        |
+========================================+
```

### Add Related Product (Bottom Sheet)

```
+========================================+
| Add Related Product               [X]  |
+========================================+
|                                        |
|  Relation Type *                       |
|  +----------------------------------+  |
|  | (*) Accessory                    |  |
|  |     Compatible add-ons           |  |
|  +----------------------------------+  |
|  | ( ) Alternative                  |  |
|  |     Similar products             |  |
|  +----------------------------------+  |
|  | ( ) Upgrade                      |  |
|  |     Better/newer versions        |  |
|  +----------------------------------+  |
|                                        |
|  --------------------------------      |
|                                        |
|  Search Product                        |
|  [Search...______________________]     |
|                                        |
|  +----------------------------------+  |
|  | [img] Mounting Kit               |  |
|  |       MNT-STD | $150.00          |  |
|  |       [Select]                   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] MC4 Connector Cable        |  |
|  |       CBL-MC4 | $25.00           |  |
|  |       [Select]                   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [img] Junction Box               |  |
|  |       JB-001 | $45.00            |  |
|  |       [Select]                   |  |
|  +----------------------------------+  |
|                                        |
|  Selected: Mounting Kit                |
|                                        |
|  [Cancel]            [Add Relation]    |
|                                        |
+========================================+
```

### Related Products Display (Customer-Facing View)

```
+========================================+
| Solar Panel 400W                       |
+========================================+
|                                        |
|  [===================]                 |
|  [   PRODUCT IMAGE   ]                 |
|  [===================]                 |
|                                        |
|  $450.00                               |
|  SKU: SP-400W                          |
|                                        |
|  [Add to Quote]                        |
|                                        |
|  --------------------------------      |
|                                        |
|  FREQUENTLY BOUGHT TOGETHER            |
|  --------------------------------      |
|                                        |
|  +------+ +------+ +------+            |
|  |[img] | |[img] | |[img] |            |
|  |Mount | |Cable | |JBox  |            |
|  |$150  | |$25   | |$45   |            |
|  +------+ +------+ +------+            |
|                                        |
|  Bundle Price: $670.00 (Save $45)      |
|  [Add All to Quote]                    |
|                                        |
|  --------------------------------      |
|                                        |
|  SIMILAR PRODUCTS                      |
|  --------------------------------      |
|                                        |
|  <- Swipe ->                           |
|  +------+ +------+ +------+            |
|  |[img] | |[img] | |[img] |            |
|  |350W  | |400P  | |450W  |            |
|  |$380  | |$520  | |$495  |            |
|  +------+ +------+ +------+            |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Related Products Tab

```
+================================================================+
| <- Back to Products                                             |
+================================================================+
|                                                                 |
|  Solar Panel 400W                          [Edit] [Actions v]   |
|  SKU: SP-400W | Category: Solar Panels                          |
|                                                                 |
|  [Overview] [Pricing] [Images] [Attributes] [Related]           |
|                                              ^active            |
|                                                                 |
+================================================================+
|                                                                 |
|  RELATED PRODUCTS                             [+ Add Related]   |
|  --------------------------------------------------------      |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | ACCESSORIES                                           (3) |  |
|  | Products that complement this item                        |  |
|  | --------------------------------------------------------- |  |
|  |                                                           |  |
|  | [img] Mounting Kit         MNT-STD    $150.00       [X]   |  |
|  | [img] MC4 Connector Cable  CBL-MC4    $25.00        [X]   |  |
|  | [img] Junction Box         JB-001     $45.00        [X]   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | ALTERNATIVES                                          (2) |  |
|  | Similar products for comparison                           |  |
|  | --------------------------------------------------------- |  |
|  |                                                           |  |
|  | [img] Solar Panel 350W     SP-350W    $380.00       [X]   |  |
|  | [img] Solar Panel 400W P   SP-400P    $520.00       [X]   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | UPGRADES                                              (1) |  |
|  | Higher-tier options                                       |  |
|  | --------------------------------------------------------- |  |
|  |                                                           |  |
|  | [img] Solar Panel 500W     SP-500W    $550.00       [X]   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Add Related Product Modal

```
+================================================================+
|                                                                 |
|  +----------------------------------------------------------+  |
|  | Add Related Product                                  [X]  |  |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  | Current Product: Solar Panel 400W (SP-400W)              |  |
|  |                                                          |  |
|  | +----------------------+ +-----------------------------+ |  |
|  | | RELATION TYPE        | | SEARCH PRODUCT              | |  |
|  | | -------------------- | | --------------------------- | |  |
|  | |                      | |                             | |  |
|  | | (*) Accessory        | | [Search products...____]    | |  |
|  | |     Items that go    | |                             | |  |
|  | |     with this        | | Results:                    | |  |
|  | |                      | | +-------------------------+ | |  |
|  | | ( ) Alternative      | | | [img] Mounting Kit     | | |  |
|  | |     Similar items    | | |       MNT-STD | $150   | | |  |
|  | |     for comparison   | | +-------------------------+ | |  |
|  | |                      | | | [img] MC4 Cable        | | |  |
|  | | ( ) Upgrade          | | |       CBL-MC4 | $25    | | |  |
|  | |     Better/newer     | | +-------------------------+ | |  |
|  | |     versions         | | | [img] Junction Box     | | |  |
|  | |                      | | |       JB-001 | $45     | | |  |
|  | +----------------------+ | +-------------------------+ | |  |
|  |                          +-----------------------------+ |  |
|  |                                                          |  |
|  | Selected: Mounting Kit (MNT-STD) as Accessory            |  |
|  |                                                          |  |
|  |                       [Cancel]    [Add Relation]         |  |
|  +----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Related Products in Quote Builder

```
+================================================================+
| New Quote                                                       |
+================================================================+
|                                                                 |
|  LINE ITEMS                                                     |
|  --------------------------------------------------------      |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | Solar Panel 400W              x 10    $450.00   $4,500.00 |  |
|  | SP-400W                                                   |  |
|  | --------------------------------------------------------- |  |
|  | [lightbulb] SUGGESTED ACCESSORIES:                        |  |
|  | +-------+ +-------+ +-------+                             |  |
|  | |Mount  | |Cable  | |JBox   |    Bundle: $2,200           |  |
|  | |x10    | |x10    | |x2     |    [+ Add All]              |  |
|  | |$1,500 | |$250   | |$90    |                             |  |
|  | +-------+ +-------+ +-------+                             |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Related Products Tab (Full)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | <- Back to Products                                                   |
| ------  |                                                                       |
| Catalog | Solar Panel 400W - High Efficiency Monocrystalline                    |
|   All   | SKU: SP-400W | Category: Solar Panels | Status: Active               |
|   Cat.  | ---------------------------------------------------------------------  |
| Orders  |                                                                       |
| Custmrs | [Overview] [Pricing] [Images] [Attributes] [Stock] [Related]          |
| Reports |                                                             ^active   |
|         |                                                                       |
+=========+======================================================================+
|         |                                                                       |
|         | RELATED PRODUCTS                                    [+ Add Related]   |
|         | -------------------------------------------------------------------   |
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | | ACCESSORIES                                                   (3) ||
|         | | ------------------------------------------------------------------ ||
|         | | Products that complement this item                                ||
|         | |                                                                    ||
|         | | +----------------------------------------------------------------+ ||
|         | | |                                                                | ||
|         | | | [img] | Product           | SKU      | Price   | Notes | Act. | ||
|         | | | ------+-------------------+----------+---------+-------+------ | ||
|         | | | [img] | Mounting Kit      | MNT-STD  | $150.00 | Fits  | [X]  | ||
|         | | |       |                   |          |         | all   |      | ||
|         | | | [img] | MC4 Connector 10m | CBL-MC4  | $25.00  | Ext.  | [X]  | ||
|         | | |       |                   |          |         | cable |      | ||
|         | | | [img] | Junction Box      | JB-001   | $45.00  | IP65  | [X]  | ||
|         | | |                                                                | ||
|         | | +----------------------------------------------------------------+ ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | | ALTERNATIVES                                                  (2) ||
|         | | ------------------------------------------------------------------ ||
|         | | Similar products for customer comparison                          ||
|         | |                                                                    ||
|         | | +----------------------------------------------------------------+ ||
|         | | | [img] | Solar Panel 350W  | SP-350W  | $380.00 | Lower | [X]  | ||
|         | | |       |                   |          |         | power |      | ||
|         | | | [img] | Solar Panel 400W  | SP-400P  | $520.00 | Bifa- | [X]  | ||
|         | | |       | Premium           |          |         | cial  |      | ||
|         | | +----------------------------------------------------------------+ ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | | UPGRADES                                                      (1) ||
|         | | ------------------------------------------------------------------ ||
|         | | Higher-tier options for upselling                                 ||
|         | |                                                                    ||
|         | | +----------------------------------------------------------------+ ||
|         | | | [img] | Solar Panel 500W  | SP-500W  | $550.00 | +100W | [X]  | ||
|         | | |       |                   |          |         | power |      | ||
|         | | +----------------------------------------------------------------+ ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
+=========+======================================================================+
```

### Add Related Product Modal (Desktop)

```
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | Add Related Product                                                  [X] |  |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | Adding relation to: Solar Panel 400W (SP-400W)                           |  |
|  |                                                                          |  |
|  | +---------------------------+ +--------------------------------------+   |  |
|  | | RELATION TYPE             | | FIND PRODUCT                         |   |  |
|  | | ------------------------- | | ------------------------------------ |   |  |
|  | |                           | |                                      |   |  |
|  | | (*) Accessory             | | [Search by name or SKU...________]   |   |  |
|  | |     Products that         | |                                      |   |  |
|  | |     complement this item  | | Category: [All Categories      v]    |   |  |
|  | |                           | |                                      |   |  |
|  | |     Examples:             | | Results:                             |   |  |
|  | |     - Cables              | | +----------------------------------+ |   |  |
|  | |     - Mounts              | | |                                  | |   |  |
|  | |     - Connectors          | | | [img] Mounting Kit Standard     | |   |  |
|  | |                           | | |       MNT-STD | $150.00         | |   |  |
|  | | ( ) Alternative           | | |       Mounting | 45 in stock    | |   |  |
|  | |     Similar products      | | |                       [Select]  | |   |  |
|  | |     customers compare     | | +----------------------------------+ |   |  |
|  | |                           | | | [img] MC4 Connector Cable 10m   | |   |  |
|  | |     Examples:             | | |       CBL-MC4 | $25.00          | |   |  |
|  | |     - Different brands    | | |       Cables | 200 in stock     | |   |  |
|  | |     - Similar specs       | | |                       [Select]  | |   |  |
|  | |                           | | +----------------------------------+ |   |  |
|  | | ( ) Upgrade               | | | [img] Junction Box IP65         | |   |  |
|  | |     Better/newer versions | | |       JB-001 | $45.00           | |   |  |
|  | |                           | | |       Electrical | 89 in stock  | |   |  |
|  | |     Examples:             | | |                       [Select]  | |   |  |
|  | |     - Higher capacity     | | +----------------------------------+ |   |  |
|  | |     - Newer model         | |                                      |   |  |
|  | +---------------------------+ +--------------------------------------+   |  |
|  |                                                                          |  |
|  | +----------------------------------------------------------------------+ |  |
|  | | SELECTED: Mounting Kit (MNT-STD)                                     | |  |
|  | | Type: Accessory                                                      | |  |
|  | | Price: $150.00                                                       | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  |                                    [Cancel]    [Add Relation]            |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

### Related Products Customer View (Product Page)

```
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | +---------------------------+  +--------------------------------------+  |  |
|  | |                           |  |                                      |  |  |
|  | | [==================]      |  | Solar Panel 400W                     |  |  |
|  | | [                  ]      |  | High Efficiency Monocrystalline      |  |  |
|  | | [   PRODUCT IMAGE  ]      |  |                                      |  |  |
|  | | [                  ]      |  | $450.00                              |  |  |
|  | | [==================]      |  |                                      |  |  |
|  | |                           |  | SKU: SP-400W                         |  |  |
|  | | [thumb] [thumb] [thumb]   |  | In Stock: 125                        |  |  |
|  | |                           |  |                                      |  |  |
|  | +---------------------------+  | [Add to Quote]  [Compare]            |  |  |
|  |                                +--------------------------------------+  |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | FREQUENTLY BOUGHT TOGETHER                                               |  |
|  | ------------------------------------------------------------------------ |  |
|  |                                                                          |  |
|  | +---------------+ +---------------+ +---------------+ +---------------+  |  |
|  | | [img]         | | [img]         | | [img]         | | [img]         |  |  |
|  | | Mounting Kit  | | MC4 Cable 10m | | Junction Box  | | Surge Protect |  |  |
|  | | $150.00       | | $25.00        | | $45.00        | | $35.00        |  |  |
|  | | [+ Add]       | | [+ Add]       | | [+ Add]       | | [+ Add]       |  |  |
|  | +---------------+ +---------------+ +---------------+ +---------------+  |  |
|  |                                                                          |  |
|  | Total with accessories: $705.00             [+ Add All to Quote]         |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | COMPARE ALTERNATIVES                                                     |  |
|  | ------------------------------------------------------------------------ |  |
|  |                                                                          |  |
|  | +-------------------+ +-------------------+ +-------------------+        |  |
|  | | [img]             | | [img]             | | [img]             |        |  |
|  | | Solar Panel 350W  | | Solar Panel 400W  | | Solar Panel 400W  |        |  |
|  | | SP-350W           | | SP-400W (this)    | | Premium SP-400P   |        |  |
|  | | $380.00           | | $450.00           | | $520.00           |        |  |
|  | |                   | |                   | |                   |        |  |
|  | | Wattage: 350W     | | Wattage: 400W     | | Wattage: 400W     |        |  |
|  | | Efficiency: 20.8% | | Efficiency: 21.5% | | Efficiency: 22.3% |        |  |
|  | | Warranty: 25yr    | | Warranty: 25yr    | | Warranty: 30yr    |        |  |
|  | |                   | |                   | |                   |        |  |
|  | | [View]            | | [Selected]        | | [View]            |        |  |
|  | +-------------------+ +-------------------+ +-------------------+        |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | UPGRADE OPTIONS                                                          |  |
|  | ------------------------------------------------------------------------ |  |
|  |                                                                          |  |
|  | [img]  Solar Panel 500W                              +$100.00            |  |
|  |        SP-500W | 500W output | 22.1% efficiency                          |  |
|  |        Get 25% more power for only $100 more         [View Upgrade ->]   |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

### Quote Builder - Related Products Suggestions

```
+================================================================================+
| New Quote for Acme Corporation                                            [X]  |
+================================================================================+
|                                                                                 |
|  LINE ITEMS                                                                     |
|  ============================================================================   |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | Product              SKU       Qty    Unit Price    Total                |  |
|  | ------------------------------------------------------------------------ |  |
|  | Solar Panel 400W     SP-400W   10     $450.00       $4,500.00            |  |
|  |                                                                          |  |
|  | +----------------------------------------------------------------------+ |  |
|  | | [lightbulb] SUGGESTED ACCESSORIES FOR THIS PRODUCT                   | |  |
|  | | -------------------------------------------------------------------- | |  |
|  | |                                                                      | |  |
|  | | [img] Mounting Kit      MNT-STD   x 10   $150.00 ea   $1,500   [+Add]| |  |
|  | | [img] MC4 Cable 10m     CBL-MC4   x 20   $25.00 ea    $500     [+Add]| |  |
|  | | [img] Junction Box      JB-001    x 2    $45.00 ea    $90      [+Add]| |  |
|  | |                                                                      | |  |
|  | | Total accessories: $2,090                      [+ Add All]           | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  | +----------------------------------------------------------------------+ |  |
|  | | [arrow-up] CONSIDER AN UPGRADE                                       | |  |
|  | | -------------------------------------------------------------------- | |  |
|  | |                                                                      | |  |
|  | | Solar Panel 500W (SP-500W)                                           | |  |
|  | | +$100.00 per unit | +$1,000.00 total | 25% more power output        | |  |
|  | |                                                                      | |  |
|  | | [Swap to Upgrade]                                                    | |  |
|  | +----------------------------------------------------------------------+ |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
RELATED PRODUCTS LOADING:
+----------------------------------+
| ACCESSORIES                      |
| -------------------------------- |
|                                  |
| [...........................]    |
| [...........................]    |
| [...........................]    |
| <- Skeleton shimmer              |
+----------------------------------+

ADDING RELATION:
+----------------------------------+
| [spinner] Adding relation...     |
+----------------------------------+

SEARCH LOADING:
+----------------------------------+
| [Search: "mount"__________]      |
|                                  |
| [spinner] Searching...           |
+----------------------------------+
```

### Empty States

```
NO RELATED PRODUCTS:
+----------------------------------+
| RELATED PRODUCTS                 |
| -------------------------------- |
|                                  |
|     [link icon]                  |
|                                  |
|   No related products yet        |
|                                  |
|   Add accessories, alternatives, |
|   and upgrades to help           |
|   customers find what they need  |
|                                  |
|   [+ Add First Related Product]  |
|                                  |
+----------------------------------+

NO ACCESSORIES:
+----------------------------------+
| ACCESSORIES                  (0) |
| -------------------------------- |
|                                  |
|   No accessories linked          |
|                                  |
|   [+ Add Accessory]              |
|                                  |
+----------------------------------+

NO SEARCH RESULTS:
+----------------------------------+
| [Search: "xyz"___________]       |
|                                  |
|   No products found for "xyz"    |
|                                  |
|   Try a different search term    |
|                                  |
+----------------------------------+
```

### Error States

```
ADD RELATION FAILED:
+----------------------------------+
| [!] Failed to add relation       |
|                                  |
|     Could not link products.     |
|     Please try again.            |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+

RELATION EXISTS:
+----------------------------------+
| [!] Relation already exists      |
|                                  |
|     Mounting Kit is already      |
|     linked as an accessory.      |
|                                  |
|     [OK]                         |
+----------------------------------+

SELF-REFERENCE ERROR:
+----------------------------------+
| [!] Cannot link to itself        |
|                                  |
|     A product cannot be          |
|     related to itself.           |
|                                  |
|     [OK]                         |
+----------------------------------+
```

### Success States

```
RELATION ADDED:
+----------------------------------+
| [checkmark] Relation added       |
|             Mounting Kit linked  |
|             as accessory         |
| <- Toast 3s                      |
+----------------------------------+

RELATION REMOVED:
+----------------------------------+
| [checkmark] Relation removed     |
| <- Toast 3s                      |
+----------------------------------+

ACCESSORIES ADDED TO QUOTE:
+----------------------------------+
| [checkmark] 3 accessories added  |
|             to quote             |
| <- Toast 3s                      |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Related Products Tab**
   - Tab through section headers
   - Tab through product rows within each section
   - Tab to remove button [X] in each row
   - Tab to "Add Related Product" button

2. **Add Related Modal**
   - Focus trapped in modal
   - Tab: Relation type radios -> Search -> Results -> Cancel -> Add
   - Escape closes modal

3. **Customer View**
   - Tab through accessory cards
   - Tab to "Add" buttons
   - Tab to "Add All" button
   - Tab through alternative/upgrade sections

### ARIA Requirements

```html
<!-- Related Products Section -->
<section aria-labelledby="related-products-heading">
  <h2 id="related-products-heading">Related Products</h2>

  <!-- Accessories Group -->
  <section aria-labelledby="accessories-heading">
    <h3 id="accessories-heading">Accessories (3)</h3>
    <p>Products that complement this item</p>
    <ul role="list" aria-label="Accessory products">
      <li>
        <article aria-label="Mounting Kit, $150.00">
          <img src="..." alt="Mounting Kit" />
          <h4>Mounting Kit</h4>
          <p>MNT-STD | $150.00</p>
          <button aria-label="Remove Mounting Kit from accessories">
            Remove
          </button>
        </article>
      </li>
    </ul>
  </section>
</section>

<!-- Add Relation Modal -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="add-relation-title"
>
  <h2 id="add-relation-title">Add Related Product</h2>

  <fieldset>
    <legend>Relation Type</legend>
    <label>
      <input type="radio" name="type" value="accessory" checked />
      Accessory - Products that complement this item
    </label>
    <label>
      <input type="radio" name="type" value="alternative" />
      Alternative - Similar products for comparison
    </label>
    <label>
      <input type="radio" name="type" value="upgrade" />
      Upgrade - Higher-tier options
    </label>
  </fieldset>

  <label for="product-search">Search Product</label>
  <input
    id="product-search"
    type="search"
    aria-describedby="search-help"
  />
  <p id="search-help">Search by product name or SKU</p>

  <ul role="listbox" aria-label="Search results">
    <li role="option" aria-selected="true">
      Mounting Kit - MNT-STD - $150.00
    </li>
  </ul>
</dialog>

<!-- Frequently Bought Together -->
<section aria-labelledby="fbt-heading">
  <h3 id="fbt-heading">Frequently Bought Together</h3>
  <ul role="list" aria-label="Suggested accessories">
    <li>
      <article>
        <img src="..." alt="Mounting Kit" />
        <h4>Mounting Kit</h4>
        <p>$150.00</p>
        <button aria-label="Add Mounting Kit to quote">Add</button>
      </article>
    </li>
  </ul>
  <button aria-label="Add all 4 accessories to quote, total $255.00">
    Add All to Quote
  </button>
</section>
```

### Screen Reader Announcements

- Relation added: "Mounting Kit added as accessory to Solar Panel 400W"
- Relation removed: "MC4 Cable removed from related products"
- Added to quote: "3 accessories added to quote"
- Search results: "Found 5 products matching 'mount'"

---

## Animation Choreography

### Relation Operations

```
ADD RELATION:
- Duration: 300ms
- New item: fade in + slide down
- Section expands smoothly if needed

REMOVE RELATION:
- Duration: 250ms
- Item: slide out left + fade
- Section contracts if empty

REORDER (drag):
- Duration: 200ms
- Item follows cursor
- Others shift smoothly
```

### Section Expand/Collapse

```
EXPAND SECTION:
- Duration: 250ms
- Height: 0 -> auto
- Arrow rotates 90 degrees

COLLAPSE SECTION:
- Duration: 200ms
- Height: auto -> 0
- Arrow rotates back
```

### Add to Quote

```
ADD SINGLE:
- Duration: 200ms
- Button: pulse effect
- Item: brief highlight

ADD ALL:
- Duration: 400ms (staggered)
- Items highlight sequentially (50ms delay)
- Button: success state
- Confetti burst (subtle)
```

### Modal Transitions

```
MODAL OPEN:
- Duration: 200ms
- Backdrop: opacity 0 -> 0.5
- Modal: scale 0.95 -> 1

MODAL CLOSE:
- Duration: 150ms
- Modal: opacity 1 -> 0
- Backdrop: fade out
```

---

## Component Props Interfaces

```typescript
// Related Products Tab
interface RelatedProductsTabProps {
  productId: string;
  relations: ProductRelation[];
  onAddRelation: (input: AddRelationInput) => Promise<void>;
  onRemoveRelation: (relationId: string) => Promise<void>;
  isLoading?: boolean;
}

interface ProductRelation {
  id: string;
  relatedProductId: string;
  relatedProduct: Product;
  type: 'accessory' | 'alternative' | 'upgrade';
}

interface AddRelationInput {
  relatedProductId: string;
  type: 'accessory' | 'alternative' | 'upgrade';
}

// Add Relation Modal
interface AddRelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  existingRelationIds: string[];
  onAdd: (input: AddRelationInput) => Promise<void>;
  isSubmitting?: boolean;
}

// Related Products Display (Customer View)
interface RelatedProductsDisplayProps {
  productId: string;
  accessories: Product[];
  alternatives: Product[];
  upgrades: Product[];
  onAddToQuote: (productId: string, quantity?: number) => void;
  onAddAllAccessories: () => void;
  showBundlePrice?: boolean;
}

// Relation Group
interface RelationGroupProps {
  title: string;
  description: string;
  type: 'accessory' | 'alternative' | 'upgrade';
  products: ProductRelation[];
  onRemove: (relationId: string) => void;
  isEditable?: boolean;
}

// Quote Suggestions
interface QuoteSuggestionsProps {
  lineItem: QuoteLineItem;
  accessories: Product[];
  upgrade?: Product;
  onAddAccessory: (productId: string, quantity: number) => void;
  onAddAllAccessories: () => void;
  onSwapToUpgrade: () => void;
}

// Product Comparison
interface ProductComparisonProps {
  currentProduct: Product;
  alternatives: Product[];
  comparisonAttributes: string[];
  onSelect: (productId: string) => void;
}

// Upgrade Banner
interface UpgradeBannerProps {
  currentProduct: Product;
  upgrade: Product;
  priceDifference: number;
  benefits: string[];
  onViewUpgrade: () => void;
  onSwap?: () => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/products/related-products-tab.tsx` | Tab on product detail |
| `src/components/domain/products/add-relation-modal.tsx` | Modal for adding relations |
| `src/components/domain/products/relation-group.tsx` | Grouped relation display |
| `src/components/domain/products/related-products-display.tsx` | Customer-facing view |
| `src/components/domain/products/product-comparison.tsx` | Alternatives comparison |
| `src/components/domain/products/upgrade-banner.tsx` | Upgrade suggestion |
| `src/components/domain/quotes/quote-suggestions.tsx` | Quote builder suggestions |
| `src/routes/catalog/$productId.tsx` | Related tab integration |

---

## Related Wireframes

- Product Detail Page (related tab)
- Quote Builder (accessory suggestions)
- Product Page (customer-facing display)
- Order Creation (upsell opportunities)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Wireframe Generator
