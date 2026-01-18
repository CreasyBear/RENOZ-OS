# Wireframe: DOM-PROD-004c - Product Attributes: UI

## Story Reference

- **Story ID**: DOM-PROD-004c
- **Name**: Product Attributes: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

Attribute management system for product specifications. Includes admin settings page for defining attributes (text, number, select, boolean), category-linked templates, attribute editor on product form, attribute display on product detail, and filter by attributes on product list.

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Attribute management table with columns (Name, Type, Unit, Categories, Product Count)
  - Sortable columns for attribute organization
  - Inline actions (Edit, Delete) for each attribute row

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Attribute creation/edit form with name, type, unit, description fields
  - Category selection checkboxes for attribute assignment
  - Product attribute value editor with dynamic field types

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Attribute type dropdown (Text, Number, Select, Boolean)
  - Category filter in attribute management
  - Attribute value select dropdowns for "Select" type attributes

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Text input for attribute names and units
  - Number inputs for numeric attribute values with unit display
  - Range inputs for attribute filters (min/max)

### Checkbox
- **Pattern**: RE-UI Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Category assignment checkboxes in attribute editor
  - Boolean attribute value toggles
  - Multi-select attribute filters in product list

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Attribute type badges (Number, Text, Select, Boolean)
  - Category assignment badges showing linked categories
  - Active filter tags showing applied attribute filters

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

### Attribute Management (Settings)

```
+========================================+
| <- Settings                            |
+========================================+
|                                        |
|  Product Attributes                    |
|  --------------------------------      |
|  Define custom specifications for      |
|  your products                         |
|                                        |
|  [+ Create Attribute]                  |
|                                        |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Wattage                          |  |
|  | Type: Number  |  Unit: W         |  |
|  | Categories: Solar Panels         |  |
|  |                   [Edit] [Del]   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Efficiency Rating                |  |
|  | Type: Number  |  Unit: %         |  |
|  | Categories: Solar Panels,        |  |
|  |              Inverters           |  |
|  |                   [Edit] [Del]   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Warranty Period                  |  |
|  | Type: Select                     |  |
|  | Options: 5yr, 10yr, 15yr, 25yr   |  |
|  | Categories: All                  |  |
|  |                   [Edit] [Del]   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Weatherproof                     |  |
|  | Type: Boolean                    |  |
|  | Categories: Solar Panels,        |  |
|  |              Mounting            |  |
|  |                   [Edit] [Del]   |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

### Create/Edit Attribute (Bottom Sheet)

```
+========================================+
| Create Attribute                  [X]  |
+========================================+
|                                        |
|  Attribute Name *                      |
|  [Wattage_______________________]      |
|                                        |
|  Type *                                |
|  [Number                       v]      |
|   - Text                               |
|   - Number                             |
|   - Select (dropdown)                  |
|   - Boolean (yes/no)                   |
|                                        |
|  --------------------------------      |
|                                        |
|  (For Number type)                     |
|  Unit (optional)                       |
|  [W____________________________]       |
|  e.g., W, kg, m, Hz                    |
|                                        |
|  --------------------------------      |
|                                        |
|  Apply to Categories                   |
|  [x] Solar Panels                      |
|  [ ] Inverters                         |
|  [ ] Batteries                         |
|  [ ] Mounting                          |
|  [ ] Cables & Accessories              |
|  [ ] All Categories                    |
|                                        |
|  --------------------------------      |
|                                        |
|  [Cancel]             [Create]         |
|                                        |
+========================================+
```

### Select Options Editor (For Select Type)

```
+========================================+
| Attribute Options                 [X]  |
+========================================+
|                                        |
|  Warranty Period                       |
|  Type: Select                          |
|                                        |
|  Options:                              |
|  +----------------------------------+  |
|  | [=] 5 years              [X]     |  |
|  +----------------------------------+  |
|  | [=] 10 years             [X]     |  |
|  +----------------------------------+  |
|  | [=] 15 years             [X]     |  |
|  +----------------------------------+  |
|  | [=] 25 years             [X]     |  |
|  +----------------------------------+  |
|                                        |
|  New Option                            |
|  [___________________________] [Add]   |
|                                        |
|  --------------------------------      |
|                                        |
|  [Cancel]             [Save]           |
|                                        |
+========================================+
```

### Product Attributes Tab (Product Detail)

```
+========================================+
| <- Products                            |
+========================================+
|                                        |
|  Solar Panel 400W                      |
|  SKU: SP-400W                          |
|                                        |
|  [Overview] [Pricing] [Attributes]     |
|                        ^active         |
|                                        |
+========================================+
|                                        |
|  SPECIFICATIONS                        |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Wattage                          |  |
|  | 400 W                            |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Efficiency Rating                |  |
|  | 21.5 %                           |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Dimensions                       |  |
|  | 1755 x 1038 x 35 mm              |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Weight                           |  |
|  | 21.5 kg                          |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Warranty Period                  |  |
|  | 25 years                         |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Weatherproof                     |  |
|  | Yes                              |  |
|  +----------------------------------+  |
|                                        |
|  [Edit Attributes]                     |
|                                        |
+========================================+
```

### Attribute Editor (Product Form)

```
+========================================+
| Edit Attributes                   [X]  |
+========================================+
|                                        |
|  Solar Panel 400W                      |
|  Category: Solar Panels                |
|                                        |
|  --------------------------------      |
|  SPECIFICATIONS                        |
|  --------------------------------      |
|                                        |
|  Wattage (W)                           |
|  [___400______________________]        |
|                                        |
|  Efficiency Rating (%)                 |
|  [___21.5____________________]         |
|                                        |
|  Dimensions (mm)                       |
|  [___1755 x 1038 x 35________]         |
|                                        |
|  Weight (kg)                           |
|  [___21.5____________________]         |
|                                        |
|  Warranty Period                       |
|  [25 years                   v]        |
|                                        |
|  Weatherproof                          |
|  [====*] Yes                           |
|                                        |
|  --------------------------------      |
|                                        |
|  [Cancel]       [Save Attributes]      |
|                                        |
+========================================+
```

### Product List - Attribute Filter

```
+========================================+
| Products                     [+ New]   |
+========================================+
| [Search_______________] [Filter v]     |
+========================================+
|                                        |
| FILTERS (Expanded bottom sheet)        |
+========================================+
|                                        |
|  Category                              |
|  [Solar Panels              v]         |
|                                        |
|  --------------------------------      |
|  ATTRIBUTE FILTERS                     |
|  --------------------------------      |
|                                        |
|  Wattage                               |
|  Min: [___300__] Max: [___500__] W     |
|                                        |
|  Efficiency Rating                     |
|  Min: [___20___] Max: [________] %     |
|                                        |
|  Warranty Period                       |
|  [ ] 5 years                           |
|  [ ] 10 years                          |
|  [x] 25 years                          |
|                                        |
|  Weatherproof                          |
|  (*) Any  ( ) Yes  ( ) No              |
|                                        |
|  [Clear]            [Apply Filters]    |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Attribute Management (Settings)

```
+================================================================+
| <- Settings                                                     |
+================================================================+
|                                                                 |
|  Product Attributes                           [+ Create New]    |
|  Define custom specifications for your products                 |
|                                                                 |
|  [Search attributes...________________________]                 |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                                                            |  |
|  | Attribute      Type      Unit    Categories       Actions  |  |
|  | -------------------------------------------------------   |  |
|  | Wattage        Number    W       Solar Panels     [E][D]  |  |
|  | Efficiency     Number    %       Solar, Inverters [E][D]  |  |
|  | Dimensions     Text      mm      All              [E][D]  |  |
|  | Weight         Number    kg      All              [E][D]  |  |
|  | Warranty       Select    -       All              [E][D]  |  |
|  | Weatherproof   Boolean   -       Solar, Mounting  [E][D]  |  |
|  | Voltage        Number    V       Batteries, Inv.  [E][D]  |  |
|  | Capacity       Number    kWh     Batteries        [E][D]  |  |
|  |                                                            |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Create/Edit Attribute Modal

```
+================================================================+
|                                                                 |
|  +----------------------------------------------------------+  |
|  | Create Attribute                                    [X]  |  |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  | +------------------------+ +---------------------------+ |  |
|  | | Attribute Name *       | | Type *                    | |  |
|  | | [Wattage_________]     | | [Number              v]   | |  |
|  | +------------------------+ +---------------------------+ |  |
|  |                                                          |  |
|  | +------------------------+ +---------------------------+ |  |
|  | | Unit (for numbers)     | | Description               | |  |
|  | | [W_________________]   | | [Power output in watts__] | |  |
|  | +------------------------+ +---------------------------+ |  |
|  |                                                          |  |
|  | (For Select type - Options)                              |  |
|  | +------------------------------------------------------+ |  |
|  | | [=] 5 years  [X]   [=] 10 years [X]   [+ Add]        | |  |
|  | | [=] 15 years [X]   [=] 25 years [X]                  | |  |
|  | +------------------------------------------------------+ |  |
|  |                                                          |  |
|  | Apply to Categories:                                     |  |
|  | +------------------------------------------------------+ |  |
|  | | [x] Solar Panels  [ ] Inverters  [ ] Batteries       | |  |
|  | | [ ] Mounting      [ ] Cables     [ ] All Categories  | |  |
|  | +------------------------------------------------------+ |  |
|  |                                                          |  |
|  |                        [Cancel]  [Create Attribute]      |  |
|  +----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Product Attributes Tab

```
+================================================================+
| <- Back to Products                                             |
+================================================================+
|                                                                 |
|  Solar Panel 400W                          [Edit] [Actions v]   |
|  SKU: SP-400W | Category: Solar Panels                          |
|                                                                 |
|  [Overview] [Pricing] [Images] [Attributes] [Related]           |
|                                 ^active                         |
|                                                                 |
+================================================================+
|                                                                 |
|  SPECIFICATIONS                                [Edit]           |
|  --------------------------------------------------------      |
|                                                                 |
|  +------------------------+  +---------------------------+      |
|  | Electrical             |  | Physical                  |      |
|  | --------------------   |  | -----------------------   |      |
|  | Wattage:      400 W    |  | Dimensions: 1755x1038mm  |      |
|  | Efficiency:   21.5%    |  | Weight:     21.5 kg      |      |
|  | Voltage:      38.4 V   |  | Weatherproof: Yes        |      |
|  +------------------------+  +---------------------------+      |
|                                                                 |
|  +------------------------+  +---------------------------+      |
|  | Warranty               |  | Certifications            |      |
|  | --------------------   |  | -----------------------   |      |
|  | Period:    25 years    |  | IEC 61215, IEC 61730     |      |
|  | Coverage:  Product +   |  | UL 1703                  |      |
|  |            Performance |  |                          |      |
|  +------------------------+  +---------------------------+      |
|                                                                 |
+================================================================+
```

### Product List with Attribute Columns

```
+================================================================+
| Products                                      [+ New Product]   |
+================================================================+
| [Search______________] [Category v] [Attributes v] [Status v]   |
|                                                                 |
| Active Attribute Filters:                                       |
| [Wattage: 300-500W x] [Warranty: 25yr x] [Weatherproof: Yes x]  |
|                                                                 |
+================================================================+
|                                                                 |
| +-----------------------------------------------------------+  |
| |                                                            |  |
| | Product          SKU       Wattage  Efficiency  Warranty   |  |
| | -------------------------------------------------------   |  |
| | Solar Panel 400W SP-400W   400 W    21.5%       25 years  |  |
| | Solar Panel 500W SP-500W   500 W    22.1%       25 years  |  |
| | Solar Panel 350W SP-350W   350 W    20.8%       25 years  |  |
| |                                                            |  |
| +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Attribute Management (Settings - Full)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | Settings > Product Attributes                                         |
| ------  |                                                                       |
| Catalog | Product Attributes                                  [+ Create New]    |
| Orders  | Define and manage custom specifications for your product catalog      |
| Custmrs | ---------------------------------------------------------------------  |
| ------  |                                                                       |
| Settings| [Search attributes...____________________] [Filter by Category v]     |
|  Users  |                                                                       |
|  Orgs   | +--------------------------------------------------------------------+|
|  Attrs  | |                                                                    ||
|  ^active| | Attribute      Type     Unit   Categories              Used  Act. ||
|         | | ------------------------------------------------------------------ ||
|         | | Wattage        Number   W      Solar Panels            45   [E][D]||
|         | | Efficiency     Number   %      Solar Panels, Inverters 52   [E][D]||
|         | | Dimensions     Text     mm     All Categories          78   [E][D]||
|         | | Weight         Number   kg     All Categories          78   [E][D]||
|         | | Warranty       Select   -      All Categories          78   [E][D]||
|         | |   Options: 5yr, 10yr, 15yr, 25yr                                   ||
|         | | Weatherproof   Boolean  -      Solar, Mounting         38   [E][D]||
|         | | Voltage        Number   V      Batteries, Inverters    24   [E][D]||
|         | | Capacity       Number   kWh    Batteries               12   [E][D]||
|         | | Cable Length   Number   m      Cables                  15   [E][D]||
|         | | Connector      Select   -      Cables                  15   [E][D]||
|         | |   Options: MC4, Anderson, Ring Terminal                            ||
|         | |                                                                    ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
|         | Showing 10 attributes                          < 1 2 >                |
|         |                                                                       |
+=========+======================================================================+
```

### Create/Edit Attribute Modal (Desktop)

```
+================================================================================+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | Create Attribute                                                    [X]  |  |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  | +-------------------------------+ +----------------------------------+   |  |
|  | | Attribute Name *              | | Type *                           |   |  |
|  | | [Wattage___________________]  | | [Number                      v]  |   |  |
|  | +-------------------------------+ +----------------------------------+   |  |
|  |                                                                          |  |
|  | +-------------------------------+ +----------------------------------+   |  |
|  | | Unit                          | | Description                      |   |  |
|  | | [W________________________]   | | [Power output rating in watts]   |   |  |
|  | | (shown after value)           | | (help text for users)            |   |  |
|  | +-------------------------------+ +----------------------------------+   |  |
|  |                                                                          |  |
|  | +--------------------------------------------------------------------+   |  |
|  | | OPTIONS (for Select type only)                                     |   |  |
|  | | ------------------------------------------------------------------ |   |  |
|  | |                                                                    |   |  |
|  | | Current Options:                                                   |   |  |
|  | | +------------------+ +------------------+ +------------------+     |   |  |
|  | | | [=] 5 years  [X] | | [=] 10 years [X] | | [=] 15 years [X] |     |   |  |
|  | | +------------------+ +------------------+ +------------------+     |   |  |
|  | | +------------------+                                               |   |  |
|  | | | [=] 25 years [X] |                                               |   |  |
|  | | +------------------+                                               |   |  |
|  | |                                                                    |   |  |
|  | | Add Option: [_________________________] [+ Add]                    |   |  |
|  | +--------------------------------------------------------------------+   |  |
|  |                                                                          |  |
|  | +--------------------------------------------------------------------+   |  |
|  | | APPLY TO CATEGORIES                                                |   |  |
|  | | ------------------------------------------------------------------ |   |  |
|  | |                                                                    |   |  |
|  | | [x] Solar Panels      [ ] Inverters       [ ] Batteries           |   |  |
|  | | [ ] Mounting          [ ] Cables          [ ] Bundles/Kits        |   |  |
|  | | ---                                                               |   |  |
|  | | [ ] All Categories (applies to all current and future)            |   |  |
|  | +--------------------------------------------------------------------+   |  |
|  |                                                                          |  |
|  |                              [Cancel]    [Create Attribute]              |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

### Product Attributes Tab (Full)

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
| Reports |                                 ^active                               |
|         |                                                                       |
+=========+======================================================================+
|         |                                                                       |
|         | PRODUCT SPECIFICATIONS                                    [Edit]      |
|         | -------------------------------------------------------------------   |
|         |                                                                       |
|         | +---------------------------+  +---------------------------+          |
|         | | ELECTRICAL                |  | PHYSICAL                  |          |
|         | | -----------------------   |  | -----------------------   |          |
|         | |                           |  |                           |          |
|         | | Wattage          400 W    |  | Dimensions  1755x1038x35  |          |
|         | | Efficiency       21.5 %   |  |             mm            |          |
|         | | Voltage (Vmp)    38.4 V   |  | Weight      21.5 kg       |          |
|         | | Current (Imp)    10.42 A  |  |                           |          |
|         | | Voltage (Voc)    46.2 V   |  | Frame       Anodized      |          |
|         | | Current (Isc)    11.08 A  |  |             Aluminum      |          |
|         | |                           |  |                           |          |
|         | +---------------------------+  +---------------------------+          |
|         |                                                                       |
|         | +---------------------------+  +---------------------------+          |
|         | | WARRANTY                  |  | CERTIFICATIONS            |          |
|         | | -----------------------   |  | -----------------------   |          |
|         | |                           |  |                           |          |
|         | | Product        25 years   |  | [check] IEC 61215         |          |
|         | | Performance    25 years   |  | [check] IEC 61730         |          |
|         | |                           |  | [check] UL 1703           |          |
|         | | Degradation:              |  | [check] CE Marking        |          |
|         | | Year 1: 98%               |  |                           |          |
|         | | Year 25: 84.8%            |  |                           |          |
|         | |                           |  |                           |          |
|         | +---------------------------+  +---------------------------+          |
|         |                                                                       |
|         | +---------------------------+                                         |
|         | | ENVIRONMENT               |                                         |
|         | | -----------------------   |                                         |
|         | |                           |                                         |
|         | | Weatherproof     Yes      |                                         |
|         | | Operating Temp   -40~85C  |                                         |
|         | | Wind Load        2400 Pa  |                                         |
|         | | Snow Load        5400 Pa  |                                         |
|         | |                           |                                         |
|         | +---------------------------+                                         |
|         |                                                                       |
+=========+======================================================================+
```

### Attribute Editor on Product Form

```
+================================================================================+
| Edit Product: Solar Panel 400W                                            [X]  |
+================================================================================+
|                                                                                 |
|  [Basic Info] [Pricing] [Attributes] [Images]                                   |
|                          ^active                                                |
|                                                                                 |
|  PRODUCT SPECIFICATIONS                                                         |
|  Based on category: Solar Panels                                                |
|  ============================================================================   |
|                                                                                 |
|  +----------------------------------+  +----------------------------------+     |
|  | ELECTRICAL SPECIFICATIONS        |  | PHYSICAL SPECIFICATIONS          |     |
|  | -------------------------------- |  | -------------------------------- |     |
|  |                                  |  |                                  |     |
|  | Wattage (W) *                    |  | Dimensions (mm)                  |     |
|  | [_____400_____________________]  |  | [_____1755 x 1038 x 35________]  |     |
|  |                                  |  |                                  |     |
|  | Efficiency (%)                   |  | Weight (kg)                      |     |
|  | [_____21.5___________________]   |  | [_____21.5___________________]   |     |
|  |                                  |  |                                  |     |
|  | Voltage - Vmp (V)                |  | Frame Material                   |     |
|  | [_____38.4___________________]   |  | [_____Anodized Aluminum_____]    |     |
|  |                                  |  |                                  |     |
|  | Current - Imp (A)                |  |                                  |     |
|  | [_____10.42__________________]   |  |                                  |     |
|  +----------------------------------+  +----------------------------------+     |
|                                                                                 |
|  +----------------------------------+  +----------------------------------+     |
|  | WARRANTY                         |  | ENVIRONMENT                      |     |
|  | -------------------------------- |  | -------------------------------- |     |
|  |                                  |  |                                  |     |
|  | Warranty Period                  |  | Weatherproof                     |     |
|  | [25 years                   v]   |  | [====*] Yes                      |     |
|  |                                  |  |                                  |     |
|  | Performance Warranty             |  | Operating Temperature            |     |
|  | [25 years                   v]   |  | [_____-40 to +85 C___________]   |     |
|  |                                  |  |                                  |     |
|  +----------------------------------+  +----------------------------------+     |
|                                                                                 |
|                                         [Cancel]    [Save Attributes]           |
|                                                                                 |
+================================================================================+
```

### Product List - Advanced Attribute Filtering

```
+================================================================================+
| Products                                                       [+ New Product]  |
+================================================================================+
| [Search________________________] [Category v] [Status v] [More Filters v]       |
|                                                                                 |
| +----------------------------------------------------------------------------+ |
| | ATTRIBUTE FILTERS                                           [Clear All]    | |
| | -------------------------------------------------------------------------- | |
| |                                                                            | |
| | Wattage (W)             Efficiency (%)        Warranty Period              | |
| | [__300__] - [__500__]   [__20___] - [_____]   [x] 25 years                 | |
| |                                               [ ] 15 years                 | |
| |                                               [ ] 10 years                 | |
| |                                                                            | |
| | Weatherproof            Weight (kg)           Price Range                  | |
| | (*) Any ( ) Yes ( ) No  [______] - [__25__]   [$____] - [$____]            | |
| |                                                                            | |
| | [Apply Filters]                                                            | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
| Active Filters: [Wattage: 300-500W x] [Efficiency: >20% x] [25yr Warranty x]   |
|                                                                                 |
| +----------------------------------------------------------------------------+ |
| |                                                                            | |
| | [img] | Product          | SKU      | Wattage | Eff.  | Warranty | Price   | |
| | ------+------------------+----------+---------+-------+----------+-------- | |
| | [img] | Solar Panel 400W | SP-400W  | 400 W   | 21.5% | 25 years | $450    | |
| | [img] | Solar Panel 500W | SP-500W  | 500 W   | 22.1% | 25 years | $550    | |
| | [img] | Solar Panel 350W | SP-350W  | 350 W   | 20.8% | 25 years | $380    | |
| | [img] | Solar Panel 450W | SP-450W  | 450 W   | 21.8% | 25 years | $495    | |
| |                                                                            | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
| Showing 4 of 45 products                                    < 1 2 3 ... 5 >     |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
ATTRIBUTES LOADING:
+----------------------------------+
| SPECIFICATIONS                   |
| -------------------------------- |
|                                  |
| [...........................]    |
| [...........................]    |
| [...........................]    |
| [...........................]    |
|                                  |
| <- Skeleton shimmer              |
+----------------------------------+

ATTRIBUTE SAVE:
+----------------------------------+
| Wattage (W)                      |
| [____400____] [saving...]        |
|               ^ spinner          |
+----------------------------------+

FILTER APPLYING:
+----------------------------------+
| [Applying filters...]            |
|                                  |
| [spinner] Loading products...    |
+----------------------------------+
```

### Empty States

```
NO ATTRIBUTES DEFINED:
+----------------------------------+
| SPECIFICATIONS                   |
| -------------------------------- |
|                                  |
|     [specs icon]                 |
|                                  |
|   No attributes configured       |
|                                  |
|   Define attributes in Settings  |
|   to add specifications to       |
|   your products                  |
|                                  |
|   [Go to Settings]               |
|                                  |
+----------------------------------+

NO ATTRIBUTES FOR CATEGORY:
+----------------------------------+
| SPECIFICATIONS                   |
| -------------------------------- |
|                                  |
|   No attributes assigned         |
|   to this category               |
|                                  |
|   [Add Attributes to Category]   |
|                                  |
+----------------------------------+

NO FILTER RESULTS:
+----------------------------------+
|                                  |
|   No products match your         |
|   attribute filters              |
|                                  |
|   Try adjusting:                 |
|   - Wattage range                |
|   - Efficiency minimum           |
|   - Warranty selection           |
|                                  |
|   [Clear All Filters]            |
|                                  |
+----------------------------------+
```

### Error States

```
ATTRIBUTE SAVE FAILED:
+----------------------------------+
| [!] Failed to save attributes    |
|                                  |
|     Changes could not be saved.  |
|     Please try again.            |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+

INVALID NUMBER:
+----------------------------------+
| Wattage (W)                      |
| [___abc___________________]      |
| [!] Please enter a valid number  |
+----------------------------------+

DELETE ATTRIBUTE WARNING:
+----------------------------------+
| [!] Delete "Wattage"?            |
|                                  |
|     This attribute is used by    |
|     45 products. Deleting will   |
|     remove all values.           |
|                                  |
|     [Cancel] [Delete Anyway]     |
+----------------------------------+
```

### Success States

```
ATTRIBUTE CREATED:
+----------------------------------+
| [checkmark] Attribute created    |
|             "Wattage" added      |
| <- Toast 3s                      |
+----------------------------------+

ATTRIBUTES SAVED:
+----------------------------------+
| [checkmark] Specifications       |
|             updated              |
| <- Toast 3s                      |
+----------------------------------+

FILTER APPLIED:
+----------------------------------+
| [checkmark] Showing 4 of 45      |
|             products             |
| <- Toast 2s                      |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Settings - Attribute Management**
   - Tab to search input
   - Tab to "Create New" button
   - Tab through table rows
   - Within row: Tab to Edit, Delete buttons

2. **Create/Edit Attribute Modal**
   - Focus trapped in modal
   - Tab: Name -> Type -> Unit -> Description -> Categories -> Buttons
   - Escape closes modal

3. **Product Attributes Tab**
   - Tab through attribute groups
   - Tab to Edit button

4. **Attribute Editor (Product Form)**
   - Tab through attribute inputs in DOM order
   - Each input properly labeled

5. **Filter Panel**
   - Tab through range inputs
   - Tab through checkbox/radio groups
   - Tab to Apply/Clear buttons

### ARIA Requirements

```html
<!-- Attribute List (Settings) -->
<table role="table" aria-label="Product attributes">
  <thead>
    <tr>
      <th scope="col">Attribute Name</th>
      <th scope="col">Type</th>
      <th scope="col">Unit</th>
      <th scope="col">Categories</th>
      <th scope="col">Products Using</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Wattage</td>
      <td>Number</td>
      <td>W</td>
      <td>Solar Panels</td>
      <td>45</td>
      <td>
        <button aria-label="Edit Wattage attribute">Edit</button>
        <button aria-label="Delete Wattage attribute">Delete</button>
      </td>
    </tr>
  </tbody>
</table>

<!-- Attribute Type Select -->
<label for="attr-type">Type</label>
<select id="attr-type" aria-describedby="type-help">
  <option value="text">Text</option>
  <option value="number">Number</option>
  <option value="select">Select (dropdown)</option>
  <option value="boolean">Boolean (yes/no)</option>
</select>
<p id="type-help">Choose how values will be entered</p>

<!-- Product Specifications Display -->
<section aria-labelledby="specs-heading">
  <h3 id="specs-heading">Product Specifications</h3>
  <dl>
    <dt>Wattage</dt>
    <dd>400 W</dd>
    <dt>Efficiency Rating</dt>
    <dd>21.5%</dd>
  </dl>
</section>

<!-- Attribute Filter -->
<fieldset>
  <legend>Warranty Period</legend>
  <label>
    <input type="checkbox" name="warranty" value="25" />
    25 years
  </label>
  <label>
    <input type="checkbox" name="warranty" value="15" />
    15 years
  </label>
</fieldset>

<!-- Range Filter -->
<fieldset>
  <legend>Wattage Range (W)</legend>
  <label>
    Minimum
    <input type="number" aria-label="Minimum wattage" />
  </label>
  <label>
    Maximum
    <input type="number" aria-label="Maximum wattage" />
  </label>
</fieldset>
```

### Screen Reader Announcements

- Attribute created: "Wattage attribute created successfully"
- Attribute deleted: "Efficiency attribute deleted"
- Attribute saved: "Product specifications updated"
- Filter applied: "Filter applied, showing 4 of 45 products"
- Validation error: "Invalid value: Please enter a number"

---

## Animation Choreography

### Attribute Row Operations

```
ADD ATTRIBUTE:
- Duration: 300ms
- New row slides in from top
- Height: 0 -> full
- Opacity: 0 -> 1

DELETE ATTRIBUTE:
- Duration: 250ms
- Row slides out to left
- Height: full -> 0
- Remaining rows shift up

EDIT INLINE:
- Duration: 200ms
- Row background highlight
- Input focus animation
```

### Modal Transitions

```
MODAL OPEN:
- Duration: 200ms
- Backdrop: opacity 0 -> 0.5
- Modal: scale 0.95 -> 1, opacity 0 -> 1

MODAL CLOSE:
- Duration: 150ms
- Modal: opacity 1 -> 0
- Backdrop: opacity 0.5 -> 0
```

### Specification Cards

```
CARD LOAD:
- Duration: 300ms (staggered)
- Each card: fade in + slide up
- 50ms delay between cards

CARD UPDATE:
- Duration: 200ms
- Value: crossfade old -> new
- Brief highlight pulse
```

### Filter Panel

```
EXPAND:
- Duration: 250ms
- Height: 0 -> auto
- Opacity: 0 -> 1

COLLAPSE:
- Duration: 200ms
- Height: auto -> 0
- Opacity: 1 -> 0

FILTER TAG APPEAR:
- Duration: 150ms
- Scale: 0.8 -> 1
- Opacity: 0 -> 1

FILTER TAG REMOVE:
- Duration: 100ms
- Scale: 1 -> 0.8
- Opacity: 1 -> 0
```

---

## Component Props Interfaces

```typescript
// Attribute Management
interface AttributeManagementPageProps {
  attributes: ProductAttribute[];
  categories: Category[];
  onAttributeCreate: (input: CreateAttributeInput) => Promise<void>;
  onAttributeUpdate: (id: string, input: UpdateAttributeInput) => Promise<void>;
  onAttributeDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

interface ProductAttribute {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  unit?: string;
  description?: string;
  options?: string[]; // For select type
  categoryIds: string[];
  productCount: number;
}

interface CreateAttributeInput {
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  unit?: string;
  description?: string;
  options?: string[];
  categoryIds: string[];
}

// Attribute Editor (Product Form)
interface AttributeEditorProps {
  productId: string;
  categoryId: string;
  values: ProductAttributeValue[];
  availableAttributes: ProductAttribute[];
  onSave: (values: SetAttributeValueInput[]) => Promise<void>;
  isLoading?: boolean;
}

interface ProductAttributeValue {
  attributeId: string;
  attributeName: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  value: string;
  unit?: string;
  options?: string[];
}

interface SetAttributeValueInput {
  attributeId: string;
  value: string;
}

// Attribute Display (Product Detail)
interface AttributeDisplayProps {
  values: ProductAttributeValue[];
  groupBy?: 'category' | 'none';
  onEdit?: () => void;
  columns?: 1 | 2 | 3;
}

// Attribute Filter
interface AttributeFilterProps {
  attributes: ProductAttribute[];
  currentFilters: AttributeFilterValue[];
  onFilterChange: (filters: AttributeFilterValue[]) => void;
  onClear: () => void;
}

interface AttributeFilterValue {
  attributeId: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'range' | 'in';
  value: string | number | boolean | string[] | [number, number];
}

// Create/Edit Modal
interface AttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  attribute?: ProductAttribute; // undefined for create
  categories: Category[];
  onSubmit: (input: CreateAttributeInput | UpdateAttributeInput) => Promise<void>;
  isSubmitting?: boolean;
}

// Attribute Filter Tag
interface AttributeFilterTagProps {
  attribute: ProductAttribute;
  filter: AttributeFilterValue;
  onRemove: () => void;
}

// Select Options Editor
interface SelectOptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
  onAdd: (option: string) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/settings/product-attributes.tsx` | Admin management page |
| `src/components/domain/products/attribute-modal.tsx` | Create/edit attribute modal |
| `src/components/domain/products/attribute-editor.tsx` | Product form attribute editor |
| `src/components/domain/products/attribute-display.tsx` | Product detail specs display |
| `src/components/domain/products/attribute-filter.tsx` | Product list filter panel |
| `src/components/domain/products/attribute-filter-tag.tsx` | Active filter tag |
| `src/components/domain/products/select-options-editor.tsx` | Options for select type |
| `src/routes/catalog/$productId.tsx` | Attributes tab integration |
| `src/routes/catalog/index.tsx` | Filter integration |

---

## Related Wireframes

- Product Detail Page (attributes tab)
- Product Form (attribute editing)
- Product List (attribute filtering)
- Settings Navigation (attribute management)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Wireframe Generator
