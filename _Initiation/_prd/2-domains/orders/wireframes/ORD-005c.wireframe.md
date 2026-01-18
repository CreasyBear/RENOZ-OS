# Wireframe: DOM-ORD-005c - Order Templates UI

## Story Reference

- **Story ID**: DOM-ORD-005c
- **Name**: Order Templates: UI
- **PRD**: memory-bank/prd/domains/orders.prd.json
- **Type**: UI Component
- **Component Type**: GridWithPreview and FormDialog

## Overview

Template management interface showing all saved order templates in a grid/list view. Templates can be created manually, saved from existing orders, and used to quickly create new orders with pre-filled items at current prices. Includes preview functionality and template editor dialog.

## UI Patterns (Reference Implementation)

### Card Grid Layout
- **Pattern**: RE-UI Card in grid layout
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Masonry/flex grid for template cards
  - Hover elevation effect
  - Quick actions: Use, Edit, Duplicate, Delete

### Dialog (Template Editor)
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Modal overlay with focus trap
  - Form sections (info, items table, summary)
  - Action buttons in footer

### Data Table (Editable Items)
- **Pattern**: RE-UI DataGrid with inline editing
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Qty steppers per row
  - Add/remove rows
  - Drag reorder via dnd-kit

### Popover (Hover Preview)
- **Pattern**: RE-UI Popover
- **Reference**: `_reference/.reui-reference/registry/default/ui/popover.tsx`
- **Features**:
  - Template preview on hover
  - Shows items and current prices
  - Delay before show to prevent flicker

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Template usage statistics
  - Item count badges
  - Status indicators

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | orders, orderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-ORD-005c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Template Library - List View

```
+=========================================+
| < Settings                       [...]  |
|                                         |
| Order Templates                         |
| Reusable order configurations           |
+-----------------------------------------+
|                                         |
|  [Search templates...______]  [+ New]   |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  +-------------------------------------+|
|  |  [file]  Standard Kitchen Kit       || <- Tap to select
|  |  ───────────────────────────────    ||
|  |  8 items  |  ~$2,450.00             ||
|  |  Last used: Jan 5, 2026             ||
|  |                                     ||
|  |  [Use Template]                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [file]  Bathroom Renovation        ||
|  |  ───────────────────────────────    ||
|  |  12 items  |  ~$3,800.00            ||
|  |  Last used: Dec 28, 2025            ||
|  |                                     ||
|  |  [Use Template]                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [file]  Basic Electrical Bundle    ||
|  |  ───────────────────────────────    ||
|  |  5 items  |  ~$890.00               ||
|  |  Last used: Jan 8, 2026             ||
|  |                                     ||
|  |  [Use Template]                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [file]  Outdoor Landscaping        ||
|  |  ───────────────────────────────    ||
|  |  15 items  |  ~$5,200.00            ||
|  |  Never used                         ||
|  |                                     ||
|  |  [Use Template]                     ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Template Preview (Bottom Sheet)

```
+=========================================+
| ====================================    | <- Drag handle
|                                         |
|  Standard Kitchen Kit            [X]    |
|  ───────────────────────────────────    |
|                                         |
|  DESCRIPTION                            |
|  Standard items for kitchen             |
|  renovation projects.                   |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  ITEMS (8)                              |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System (WGT-001)               ||
|  |  Qty: 4  |  $125.00  |  $500.00     ||
|  +-------------------------------------+|
|  |  5kW Hybrid Inverter (GDG-002)              ||
|  |  Qty: 6  |  $89.00   |  $534.00     ||
|  +-------------------------------------+|
|  |  Battery Cable Kit (CON-003)            ||
|  |  Qty: 10 |  $12.50   |  $125.00     ||
|  +-------------------------------------+|
|  |  ... +5 more items                  ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  ESTIMATED TOTAL                        |
|  $2,450.00 (at current prices)          |
|                                         |
|  +-------------------------------------+|
|  |      [CREATE ORDER FROM THIS]       || <- Primary action
|  +-------------------------------------+|
|  +-------------------------------------+|
|  |  [Edit Template]  [Delete]          ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Template Editor Dialog (Full Screen)

```
+=========================================+
| Create Template                    [X]  |
|                                         |
+-----------------------------------------+
|                                         |
|  Template Name *                        |
|  +-------------------------------------+|
|  | e.g., Kitchen Renovation Kit        ||
|  +-------------------------------------+|
|                                         |
|  Description                            |
|  +-------------------------------------+|
|  |                                     ||
|  | What is this template for?          ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  TEMPLATE ITEMS                         |
|                                         |
|  +-------------------------------------+|
|  |  10kWh LFP Battery System (WGT-001)               ||
|  |  Qty:  [-] | 4 | [+]     [$125.00]  ||
|  |  Notes: [_______________]    [X]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  5kW Hybrid Inverter (GDG-002)              ||
|  |  Qty:  [-] | 6 | [+]     [$89.00]   ||
|  |  Notes: [_______________]    [X]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |  [+] ADD PRODUCT                    ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |        [SAVE TEMPLATE]              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Save Order as Template Dialog

```
+=========================================+
| Save as Template                   [X]  |
|                                         |
+-----------------------------------------+
|                                         |
|  Save Order #ORD-2024-0156              |
|  as a reusable template                 |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  Template Name *                        |
|  +-------------------------------------+|
|  | Acme Kitchen Project                ||
|  +-------------------------------------+|
|                                         |
|  Description                            |
|  +-------------------------------------+|
|  |                                     ||
|  | Based on Brisbane Solar kitchen order    ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  ITEMS TO INCLUDE                       |
|                                         |
|  [x] 10kWh LFP Battery System x 10        $1,250.00   |
|  [x] 5kW Hybrid Inverter x 5          $445.00   |
|  [x] Battery Cable Kit x 20       $250.00   |
|  [x] High-Current DC Cable x 8        $280.00   |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |        [SAVE TEMPLATE]              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
|                                         |
|            +-------------+              |
|            |   [files]   |              |
|            |     ~~~     |              |
|            +-------------+              |
|                                         |
|       NO TEMPLATES YET                  |
|                                         |
|   Templates let you quickly             |
|   create orders with pre-filled         |
|   items and quantities.                 |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+] CREATE FIRST          |       |
|   |       TEMPLATE              |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
|   Or save an existing order             |
|   as a template from the order          |
|   actions menu.                         |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Template Library - Card Grid with Preview Drawer

```
+=====================================================================+
| < Settings                                                           |
|                                                                      |
| Order Templates                                   [+ Create Template]|
| Save and reuse common order configurations                           |
+---------------------------------------------------------------------+
|                                                                      |
|  [Search templates...___________]  [Sort: Most Used ▼]              |
|                                                                      |
+----------------------------------------------+-----------------------+
|                                              |                       |
|  +------------------+  +------------------+  |  PREVIEW              |
|  |  [file]          |  |  [file]          |  |  Standard Kitchen Kit |
|  |  Standard        |  |  Bathroom        |  |  ─────────────────    |
|  |  Kitchen Kit     |  |  Renovation      |  |                       |
|  |  ──────────────  |  |  ──────────────  |  |  8 items              |
|  |  8 items         |  |  12 items        |  |  ~$2,450.00           |
|  |  ~$2,450         |  |  ~$3,800         |  |                       |
|  |  Last: Jan 5     |  |  Last: Dec 28    |  |  ITEMS:               |
|  |                  |  |                  |  |  - 10kWh LFP Battery System x4      |
|  |  [selected]      |  |                  |  |  - 5kW Hybrid Inverter x6     |
|  +------------------+  +------------------+  |  - Battery Cable Kit x10  |
|                                              |  - High-Current DC Cable x5   |
|  +------------------+  +------------------+  |  - Mounting Bracket Set x8     |
|  |  [file]          |  |  [file]          |  |  +3 more...           |
|  |  Basic           |  |  Outdoor         |  |                       |
|  |  Electrical      |  |  Landscaping     |  |  ─────────────────    |
|  |  ──────────────  |  |  ──────────────  |  |                       |
|  |  5 items         |  |  15 items        |  |  [Use This Template]  |
|  |  ~$890           |  |  ~$5,200         |  |                       |
|  |  Last: Jan 8     |  |  Never used      |  |  [Edit] [Duplicate]   |
|  +------------------+  +------------------+  |  [Delete]             |
|                                              |                       |
+----------------------------------------------+-----------------------+
```

### Template Selector in Order Creation

```
+=====================================================================+
|                                                                      |
|   +--------------------------------------------------------------+   |
|   | Create New Order                                         [X] |   |
|   +--------------------------------------------------------------+   |
|   |                                                              |   |
|   |  Create From:  ( ) Blank Order   (o) Template                |   |
|   |                                                              |   |
|   |  ────────────────────────────────────────────────────────    |   |
|   |                                                              |   |
|   |  SELECT TEMPLATE                                             |   |
|   |                                                              |   |
|   |  [Search templates...___________]                            |   |
|   |                                                              |   |
|   |  +-- AVAILABLE TEMPLATES -----------------------------------+|   |
|   |  |                                                          ||   |
|   |  |  +----------------------------------------------------+  ||   |
|   |  |  | (o) Standard Kitchen Kit                           |  ||   |
|   |  |  |     8 items  |  ~$2,450.00                         |  ||   |
|   |  |  |     10kWh LFP Battery System, 5kW Hybrid Inverter, Battery Cable Kit...      |  ||   |
|   |  |  +----------------------------------------------------+  ||   |
|   |  |                                                          ||   |
|   |  |  +----------------------------------------------------+  ||   |
|   |  |  | ( ) Bathroom Renovation                            |  ||   |
|   |  |  |     12 items  |  ~$3,800.00                        |  ||   |
|   |  |  |     Tile Kit, Plumbing Set, Vanity Bundle...       |  ||   |
|   |  |  +----------------------------------------------------+  ||   |
|   |  |                                                          ||   |
|   |  |  +----------------------------------------------------+  ||   |
|   |  |  | ( ) Basic Electrical Bundle                        |  ||   |
|   |  |  |     5 items  |  ~$890.00                           |  ||   |
|   |  |  |     Wire Set, Switch Pack, Outlet Kit...           |  ||   |
|   |  |  +----------------------------------------------------+  ||   |
|   |  |                                                          ||   |
|   |  +----------------------------------------------------------+|   |
|   |                                                              |   |
|   +--------------------------------------------------------------+   |
|   |                      ( Cancel )   [ Create from Template ]   |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+=====================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Template Library with Hover Preview

```
+===================================================================================================+
| Renoz CRM                                                                    [bell] [Joel v]      |
+-------------+-------------------------------------------------------------------------------------+
|             |                                                                                     |
| Dashboard   |  Settings > Order Templates                                                         |
| Customers   |                                                                                     |
| Orders      |  Order Templates                                            [+ Create Template]     |
| Products    |  Save and reuse common order configurations                                         |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────      |
| Pipeline    |                                                                                     |
| Settings  < |  +-- FILTERS ----------------------------------------------------------------+      |
|   General   |  |                                                                            |      |
|   Templates |  |  [Search templates...________]  [Sort: Most Used ▼]  [View: Grid ▼]       |      |
|   Taxes     |  |                                                                            |      |
|   Users     |  +----------------------------------------------------------------------------+      |
|             |                                                                                     |
|             |  +-- TEMPLATE GRID -----------------------------------------------------------+      |
|             |  |                                                                            |      |
|             |  |  +-------------------+  +-------------------+  +-------------------+       |      |
|             |  |  |  [file-icon]      |  |  [file-icon]      |  |  [file-icon]      |       |      |
|             |  |  |                   |  |                   |  |                   |       |      |
|             |  |  |  Standard Kitchen |  |  Bathroom         |  |  Basic Electrical |       |      |
|             |  |  |  Kit              |  |  Renovation       |  |  Bundle           |       |      |
|             |  |  |  ───────────────  |  |  ───────────────  |  |  ───────────────  |       |      |
|             |  |  |  8 items          |  |  12 items         |  |  5 items          |       |      |
|             |  |  |  ~$2,450.00       |  |  ~$3,800.00       |  |  ~$890.00         |       |      |
|             |  |  |                   |  |                   |  |                   |       |      |
|             |  |  |  Last: Jan 5      |  |  Last: Dec 28     |  |  Last: Jan 8      |       |      |
|             |  |  |  Used: 12 times   |  |  Used: 8 times    |  |  Used: 23 times   |       |      |
|             |  |  |                   |  |                   |  |                   |       |      |
|             |  |  |  [Use]  [E] [...] |  |  [Use]  [E] [...] |  |  [Use]  [E] [...] |       |      |
|             |  |  +-------------------+  +-------------------+  +-------------------+       |      |
|             |  |                                                                            |      |
|             |  |  +-------------------+  +-------------------+  +-------------------+       |      |
|             |  |  |  [file-icon]      |  |  [file-icon]      |  |  [+]              |       |      |
|             |  |  |                   |  |                   |  |                   |       |      |
|             |  |  |  Outdoor          |  |  Premium HVAC     |  |  Create New       |       |      |
|             |  |  |  Landscaping      |  |  Installation     |  |  Template         |       |      |
|             |  |  |  ───────────────  |  |  ───────────────  |  |                   |       |      |
|             |  |  |  15 items         |  |  22 items         |  |                   |       |      |
|             |  |  |  ~$5,200.00       |  |  ~$8,400.00       |  |                   |       |      |
|             |  |  |                   |  |                   |  |                   |       |      |
|             |  |  |  Never used       |  |  Last: Jan 2      |  |                   |       |      |
|             |  |  |                   |  |  Used: 5 times    |  |                   |       |      |
|             |  |  |                   |  |                   |  |                   |       |      |
|             |  |  |  [Use]  [E] [...] |  |  [Use]  [E] [...] |  |                   |       |      |
|             |  |  +-------------------+  +-------------------+  +-------------------+       |      |
|             |  |                                                                            |      |
|             |  +----------------------------------------------------------------------------+      |
|             |                                                                                     |
+-------------+-------------------------------------------------------------------------------------+
```

### Hover Preview Popover

```
+-------------------+
|  Standard Kitchen |
|  Kit              |   <- Hovering over card
+-------------------+
        |
        v
+-----------------------------------------------+
|  Standard Kitchen Kit                         |
|  ─────────────────────────────────────────    |
|                                               |
|  DESCRIPTION                                  |
|  Standard items for kitchen renovation        |
|  projects. Includes all basic supplies.       |
|                                               |
|  ─────────────────────────────────────────    |
|                                               |
|  ITEMS (8)                   CURRENT PRICE    |
|  - 10kWh LFP Battery System x4                   $500.00    |
|  - 5kW Hybrid Inverter x6                  $534.00    |
|  - Battery Cable Kit x10               $125.00    |
|  - High-Current DC Cable x5                $175.00    |
|  - Mounting Bracket Set x8                  $240.00    |
|  - Mount Bracket x12               $180.00    |
|  - Seal Pack x20                   $200.00    |
|  - Hardware Box x2                 $496.00    |
|                                               |
|  ─────────────────────────────────────────    |
|  ESTIMATED TOTAL: $2,450.00                   |
|  (based on current pricing)                   |
|                                               |
|  [ Use This Template ]                        |
+-----------------------------------------------+
```

### Template Editor Dialog

```
+===================================================================================================+
|                                                                                                   |
|     +-------------------------------------------------------------------------------------+       |
|     | Edit Template: Standard Kitchen Kit                                            [X] |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                                                                     |       |
|     |  +-- TEMPLATE INFO ----------------------------------------------------------+      |       |
|     |  |                                                                           |      |       |
|     |  |  Template Name *                    Description                           |      |       |
|     |  |  +-------------------------+        +-------------------------------+     |      |       |
|     |  |  | Standard Kitchen Kit    |        | Standard items for kitchen   |     |      |       |
|     |  |  +-------------------------+        | renovation projects...       |     |      |       |
|     |  |                                     +-------------------------------+     |      |       |
|     |  |                                                                           |      |       |
|     |  +--------------------------------------------------------------------------+      |       |
|     |                                                                                     |       |
|     |  +-- TEMPLATE ITEMS --------------------------------------------------------+      |       |
|     |  |                                                                          |      |       |
|     |  |  +----------------------------------------------------------------------+|      |       |
|     |  |  | Product              | SKU     | Qty    | Current $  | Notes   | [X] ||      |       |
|     |  |  +----------------------------------------------------------------------+|      |       |
|     |  |  | 10kWh LFP Battery System           | WGT-001 | [-]4[+]| $125.00    | [____]  | [x] ||      |       |
|     |  |  | 5kW Hybrid Inverter          | GDG-002 | [-]6[+]| $89.00     | [____]  | [x] ||      |       |
|     |  |  | Battery Cable Kit        | CON-003 |[-]10[+]| $12.50     | [____]  | [x] ||      |       |
|     |  |  | High-Current DC Cable        | CBL-004 | [-]5[+]| $35.00     | [____]  | [x] ||      |       |
|     |  |  | Mounting Bracket Set          | FIT-005 | [-]8[+]| $30.00     | [____]  | [x] ||      |       |
|     |  |  | Mount Bracket        | MNT-006 |[-]12[+]| $15.00     | [____]  | [x] ||      |       |
|     |  |  | Seal Pack            | SEL-007 |[-]20[+]| $10.00     | [____]  | [x] ||      |       |
|     |  |  | Hardware Box         | HWR-008 | [-]2[+]| $248.00    | [____]  | [x] ||      |       |
|     |  |  +----------------------------------------------------------------------+|      |       |
|     |  |                                                                          |      |       |
|     |  |  [+ Add Product]                         Estimated Total: $2,450.00      |      |       |
|     |  |                                                                          |      |       |
|     |  +--------------------------------------------------------------------------+      |       |
|     |                                                                                     |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                      ( Cancel )   ( Duplicate )   [ Save Template ]                 |       |
|     +-------------------------------------------------------------------------------------+       |
|                                                                                                   |
+===================================================================================================+
```

---

## Interaction States

### Loading States

```
TEMPLATE LIBRARY LOADING:
+-------------------------------------+
|  Order Templates                    |
|  ─────────────────────────────────  |
|                                     |
|  +---------------+  +---------------+
|  | [shimmer~~~]  |  | [shimmer~~~]  |
|  | [shimmer~]    |  | [shimmer~]    |
|  | [shimmer~~~]  |  | [shimmer~~~]  |
|  +---------------+  +---------------+
|                                     |
|  +---------------+  +---------------+
|  | [shimmer~~~]  |  | [shimmer~~~]  |
|  | [shimmer~]    |  | [shimmer~]    |
|  +---------------+  +---------------+
+-------------------------------------+

TEMPLATE PREVIEW LOADING:
+-------------------------------------+
|  Standard Kitchen Kit               |
|  ─────────────────────────────────  |
|                                     |
|  Loading items...                   |
|  [spinner]                          |
|                                     |
|  [shimmer~~~~~~~~~~~~~~~~]          |
|  [shimmer~~~~~~~~]                  |
|  [shimmer~~~~~~~~~~~~~~~~]          |
+-------------------------------------+

CREATING ORDER FROM TEMPLATE:
+-------------------------------------+
|                                     |
|  [spinner]                          |
|  Creating order from template...    |
|                                     |
|  Calculating current prices...      |
|  [======            ] 40%           |
|                                     |
+-------------------------------------+
```

### Error States

```
TEMPLATE LOAD FAILED:
+-------------------------------------+
|  Order Templates                    |
|  ─────────────────────────────────  |
|                                     |
|  +-------------------------------+  |
|  |  [!] Failed to load templates |  |
|  |                               |  |
|  |  Please try again.            |  |
|  |                               |  |
|  |  [Retry]                      |  |
|  +-------------------------------+  |
+-------------------------------------+

SAVE TEMPLATE FAILED:
+=========================================+
|  [!] Could not save template            |
|                                         |
|  An error occurred while saving.        |
|  Your changes have not been lost.       |
|                                         |
|           [Retry]  [Cancel]             |
+=========================================+

PRODUCT NOT FOUND:
+-------------------------------------+
|  [!] Product unavailable            |
|                                     |
|  10kWh LFP Battery System (WGT-001) is no longer  |
|  available. Remove from template?   |
|                                     |
|       [Keep]  [Remove]              |
+-------------------------------------+
```

### Success States

```
TEMPLATE SAVED:
+=========================================+
|  [check] Template Saved                 |
|                                         |
|  "Standard Kitchen Kit" has been        |
|  saved successfully.                    |
|                                         |
|              <- Auto-dismiss 3s         |
+=========================================+

ORDER CREATED FROM TEMPLATE:
+=========================================+
|  [check] Order Created                  |
|                                         |
|  Order #ORD-2024-0167 created           |
|  from "Standard Kitchen Kit"            |
|                                         |
|  [View Order]                           |
+=========================================+

TEMPLATE DUPLICATED:
+=========================================+
|  [check] Template Duplicated            |
|                                         |
|  "Standard Kitchen Kit (Copy)"          |
|  created successfully.                  |
|                                         |
|              <- Auto-dismiss 3s         |
+=========================================+
```

---

## Accessibility Notes

### Focus Order

1. **Template Library**
   - Search input
   - Sort dropdown
   - View toggle
   - Template cards (grid navigation)
   - Create template button

2. **Template Card**
   - Card container (focusable)
   - Use button
   - Edit button
   - Actions menu

3. **Template Editor**
   - Template name input
   - Description textarea
   - For each item: Qty controls, notes, remove button
   - Add product button
   - Cancel, Duplicate (if editing), Save buttons

### ARIA Requirements

```html
<!-- Template Library Grid -->
<section
  role="region"
  aria-label="Order templates"
>
  <h1 id="templates-heading">Order Templates</h1>

  <div
    role="grid"
    aria-labelledby="templates-heading"
    aria-rowcount="5"
    aria-colcount="3"
  >
    <div role="row" aria-rowindex="1">
      <article
        role="gridcell"
        aria-label="Standard Kitchen Kit: 8 items, approximately $2,450, last used January 5"
        tabindex="0"
      >
        <!-- Card content -->
      </article>
    </div>
  </div>
</section>

<!-- Template Card Actions -->
<button
  aria-label="Use Standard Kitchen Kit template to create order"
>
  Use Template
</button>

<button
  aria-label="Edit Standard Kitchen Kit template"
>
  Edit
</button>

<button
  aria-haspopup="menu"
  aria-expanded="false"
  aria-label="More actions for Standard Kitchen Kit"
>
  ...
</button>

<!-- Template Selector (in order creation) -->
<fieldset
  role="radiogroup"
  aria-label="Select a template"
>
  <legend>Available Templates</legend>

  <div role="radio" aria-checked="true" tabindex="0">
    <label>Standard Kitchen Kit - 8 items, ~$2,450</label>
  </div>

  <div role="radio" aria-checked="false" tabindex="-1">
    <label>Bathroom Renovation - 12 items, ~$3,800</label>
  </div>
</fieldset>

<!-- Hover Preview -->
<div
  role="tooltip"
  aria-label="Preview of Standard Kitchen Kit template"
>
  <!-- Preview content -->
</div>

<!-- Template Editor Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="editor-title"
>
  <h2 id="editor-title">Edit Template: Standard Kitchen Kit</h2>
</dialog>
```

### Screen Reader Announcements

- Library loaded: "5 order templates available."
- Template selected: "Standard Kitchen Kit selected. 8 items, estimated $2,450."
- Preview shown: "Showing preview. Press Escape to close."
- Template saved: "Template saved successfully."
- Order created: "Order ORD-2024-0167 created from template."
- Item added: "10kWh LFP Battery System added to template. 9 items total."
- Item removed: "10kWh LFP Battery System removed from template. 7 items total."

---

## Animation Choreography

### Template Card Interactions

```
HOVER (Desktop):
- Duration: 150ms
- Scale: 1 -> 1.02
- Shadow elevation increase
- Border color intensify

PREVIEW POPOVER:
- Duration: 200ms
- Easing: ease-out
- Transform: translateY(10px) -> translateY(0)
- Opacity: 0 -> 1
- Delay: 300ms after hover (prevent flicker)

CARD SELECTION:
- Duration: 200ms
- Border highlight animation
- Check indicator fade in
```

### Template Editor

```
DIALOG OPEN:
- Duration: 250ms
- Easing: ease-out
- Transform: scale(0.95) -> scale(1)
- Opacity: 0 -> 1
- Backdrop fade: 200ms

ADD ITEM:
- Duration: 300ms
- New row slide down from top
- Other rows shift down
- Focus moves to qty input

REMOVE ITEM:
- Duration: 200ms
- Row fade out + collapse
- Other rows slide up
- Height transition

REORDER ITEMS (drag):
- Duration: 200ms
- Dragged item elevates
- Placeholder shows drop position
- Items shift to make room
```

### Grid Layout

```
FILTER APPLIED:
- Duration: 300ms
- Hidden cards fade out
- Visible cards reflow
- Staggered animation (50ms per card)

VIEW CHANGE (Grid <-> List):
- Duration: 400ms
- Crossfade between layouts
- Cards morph shape
```

---

## Component Props Interfaces

```typescript
// Template Library Page
interface TemplateLibraryProps {
  initialFilters?: TemplateFilters;
}

// Template Filters
interface TemplateFilters {
  search?: string;
  sortBy?: 'name' | 'lastUsed' | 'mostUsed' | 'itemCount';
  sortOrder?: 'asc' | 'desc';
}

// Order Template
interface OrderTemplate {
  id: string;
  name: string;
  description?: string;
  orgId: string;
  items: OrderTemplateItem[];
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  useCount: number;
}

// Template Item
interface OrderTemplateItem {
  id: string;
  templateId: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  notes?: string;
  currentPrice?: number; // Resolved at display time
}

// Template Card
interface TemplateCardProps {
  template: OrderTemplate;
  variant: 'grid' | 'list';
  isSelected?: boolean;
  onSelect?: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// Template Preview
interface TemplatePreviewProps {
  template: OrderTemplate;
  estimatedTotal: number;
  onUse: () => void;
  onEdit: () => void;
  variant: 'popover' | 'drawer' | 'sheet';
}

// Template Editor Dialog
interface TemplateEditorDialogProps {
  open: boolean;
  template?: OrderTemplate; // null for create
  onClose: () => void;
  onSave: (template: NewTemplateInput | UpdateTemplateInput) => Promise<void>;
  isSubmitting: boolean;
}

// Template Input
interface NewTemplateInput {
  name: string;
  description?: string;
  items: {
    productId: string;
    qty: number;
    notes?: string;
  }[];
}

interface UpdateTemplateInput extends NewTemplateInput {
  id: string;
}

// Template Selector (in order creation)
interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (templateId: string | null) => void;
  templates: OrderTemplate[];
  isLoading: boolean;
}

// Save as Template Dialog
interface SaveAsTemplateDialogProps {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSave: (template: NewTemplateInput) => Promise<void>;
  isSubmitting: boolean;
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/domain/orders/template-library.tsx` | Template grid/list view |
| `src/components/domain/orders/template-card.tsx` | Individual template card |
| `src/components/domain/orders/template-preview.tsx` | Hover/drawer preview |
| `src/components/domain/orders/template-editor-dialog.tsx` | Create/edit dialog |
| `src/components/domain/orders/template-selector.tsx` | Order creation selector |
| `src/components/domain/orders/save-as-template-dialog.tsx` | Save order as template |
| `src/components/domain/orders/order-creation-dialog.tsx` | Modify for template option |
| `src/components/domain/orders/order-context-menu.tsx` | Add save as template action |
| `src/routes/_authed/settings/templates.tsx` | Settings page integration |

---

## Related Wireframes

- [DOM-ORD-001c: Shipment Tracking UI](./DOM-ORD-001c.wireframe.md)
- [DOM-ORD-006c: Order Amendments UI](./DOM-ORD-006c.wireframe.md)
- [DOM-ORD-007: Fulfillment Dashboard](./DOM-ORD-007.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
