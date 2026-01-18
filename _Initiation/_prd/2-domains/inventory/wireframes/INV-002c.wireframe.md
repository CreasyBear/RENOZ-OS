# Wireframe: DOM-INV-002c - Warehouse Locations: UI

## Story Reference

- **Story ID**: DOM-INV-002c
- **Name**: Warehouse Locations: UI
- **PRD**: memory-bank/prd/domains/inventory.prd.json
- **Type**: UI Component
- **Component Types**: Settings CRUD Page, Location Selector, Inventory List Column, Transfer Dialog
- **Primary Users**: Warehouse Manager, Operations, Inventory Staff

## Overview

Location management settings page with CRUD interface, location selector on goods receipt dialog, location column in inventory list, and move between locations action for inventory items.

## UI Patterns (Reference Implementation)

### Data Table
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Sortable columns for location name, zone, aisle, shelf
  - Filterable by zone and active status
  - Action column with edit/delete dropdowns

### Dialog/Sheet
- **Pattern**: RE-UI Dialog + Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx` & `sheet.tsx`
- **Features**:
  - Bottom sheet for add/edit location on mobile
  - Modal dialog for desktop
  - Focus trap and escape key handling

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Validated inputs for location name, zone, aisle, shelf, bin
  - Toggle for active/inactive status
  - Auto-generation of location name from components

### Select/Combobox
- **Pattern**: RE-UI Select + Combobox
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx` & `command.tsx`
- **Features**:
  - Location selector with search
  - Recently used locations section
  - Keyboard navigation support

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Active/Inactive status indicators
  - Zone color coding (optional)
  - Item count badges

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | inventoryItems, inventoryMovements | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/products.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Warehouse Locations**: Brisbane (main), Sydney, Melbourne, Perth

---

## Mobile Wireframe (375px)

### Settings - Location Management

```
+=========================================+
| < Settings                       [...]  |
+-----------------------------------------+
| [General] [Users] [Locations] [Tags]    |
|          ========================       |
+-----------------------------------------+
|                                         |
|  WAREHOUSE LOCATIONS                    |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [+ ADD LOCATION]               || <- 48px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [Search locations_______________]      |
|                                         |
|  +-------------------------------------+|
|  | Main Warehouse                      ||
|  | Zone: A | Aisle: 1 | Shelf: -       ||
|  | Bin: - | Status: Active [*]         ||
|  |                        [E] [...]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Receiving Dock                      ||
|  | Zone: R | Aisle: - | Shelf: -       ||
|  | Bin: - | Status: Active [*]         ||
|  |                        [E] [...]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Aisle A-1, Shelf 1                  ||
|  | Zone: A | Aisle: 1 | Shelf: 1       ||
|  | Bin: - | Status: Active [*]         ||
|  |                        [E] [...]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Aisle A-1, Shelf 2                  ||
|  | Zone: A | Aisle: 1 | Shelf: 2       ||
|  | Bin: - | Status: Active [*]         ||
|  |                        [E] [...]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Aisle A-1, Shelf 3, Bin 1           ||
|  | Zone: A | Aisle: 1 | Shelf: 3       ||
|  | Bin: 1 | Status: Inactive [o]       ||
|  |                        [E] [...]    ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Add/Edit Location - Bottom Sheet

```
+=========================================+
| =====================================   | <- Drag handle
|                                         |
|  ADD LOCATION                    [X]    |
|  -------------------------------------- |
|                                         |
|  Location Name *                        |
|  +------------------------------------+ |
|  | e.g., Aisle A-1, Shelf 2           | |
|  +------------------------------------+ |
|                                         |
|  Zone                                   |
|  +------------------------------------+ |
|  | e.g., A, B, Receiving              | |
|  +------------------------------------+ |
|                                         |
|  Aisle                                  |
|  +------------------------------------+ |
|  | e.g., 1, 2, 3                      | |
|  +------------------------------------+ |
|                                         |
|  Shelf                                  |
|  +------------------------------------+ |
|  | e.g., 1, 2, 3                      | |
|  +------------------------------------+ |
|                                         |
|  Bin                                    |
|  +------------------------------------+ |
|  | e.g., 1, 2, A, B                   | |
|  +------------------------------------+ |
|                                         |
|  Status                                 |
|  +-------------+  +---------------+     |
|  |  (o) Active |  |  ( ) Inactive |     | <- Toggle
|  +-------------+  +---------------+     |
|                                         |
|  +------------------------------------+ |
|  |                                    | |
|  |        [SAVE LOCATION]             | | <- 56px primary
|  |                                    | |
|  +------------------------------------+ |
|                                         |
+=========================================+
```

### Goods Receipt - Location Selector

```
+=========================================+
| RECEIVE GOODS                    [X]    |
+-----------------------------------------+
|                                         |
|  PO: PO-2026-0042                       |
|  Supplier: BYD Australia         |
|  -----------------------------------    |
|                                         |
|  Product                                |
|  +------------------------------------+ |
|  | 10kWh LFP Battery (BAT-LFP-10KWH)   [locked] | |
|  +------------------------------------+ |
|                                         |
|  Quantity Ordered: 50                   |
|  Quantity to Receive *                  |
|  +------------------------------------+ |
|  |  50                                | |
|  +------------------------------------+ |
|                                         |
|  PUT-AWAY LOCATION *                    |
|  +--------------------------------+ [v] |
|  | Select location...                 | |
|  +------------------------------------+ |
|                                         |
|  <- Opens location picker:              |
|                                         |
|  +------------------------------------+ |
|  | [Search locations___________] [X]  | |
|  |                                    | |
|  | RECENTLY USED                      | |
|  | [*] Aisle A-1, Shelf 2             | |
|  | [ ] Main Warehouse                 | |
|  |                                    | |
|  | ALL LOCATIONS                      | |
|  | [ ] Receiving Dock                 | |
|  | [ ] Aisle A-1, Shelf 1             | |
|  | [ ] Aisle A-1, Shelf 2             | |
|  | [ ] Aisle A-1, Shelf 3             | |
|  | [ ] Aisle B-1, Shelf 1             | |
|  +------------------------------------+ |
|                                         |
|  Serial Numbers (if applicable)         |
|  +------------------------------------+ |
|  | [Scan] or enter manually...        | |
|  +------------------------------------+ |
|                                         |
|  +------------------------------------+ |
|  |       [RECEIVE GOODS]              | |
|  +------------------------------------+ |
|                                         |
+=========================================+
```

### Inventory List - Location Column

```
+=========================================+
| < Inventory                      [...]  |
+-----------------------------------------+
| [Search_______________] [Filter v]      |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | 10kWh LFP Battery                      ||
|  | SKU: BAT-LFP-10KWH  |  Stock: 53           ||
|  | Location: Aisle A-1, Shelf 2        ||
|  |                         [Move] [...] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 400W Solar Panel                    ||
|  | SKU: SOL-RES-400W  |  Stock: 62           ||
|  | Location: Main Warehouse            ||
|  |                         [Move] [...] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 5kW Hybrid Inverter                        ||
|  | SKU: INV-HYB-5KW  |  Stock: 27           ||
|  | Location: Receiving Dock            ||
|  |                         [Move] [...] ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Move Between Locations - Dialog

```
+=========================================+
| =====================================   |
|                                         |
|  MOVE INVENTORY                  [X]    |
|  -------------------------------------- |
|                                         |
|  Product                                |
|  +------------------------------------+ |
|  | 10kWh LFP Battery (BAT-LFP-10KWH)   [locked] | |
|  +------------------------------------+ |
|                                         |
|  Current Location                       |
|  +------------------------------------+ |
|  | Aisle A-1, Shelf 2       [locked] | |
|  +------------------------------------+ |
|                                         |
|  Quantity to Move *                     |
|  +------------------------------------+ |
|  |  10                                | | <- Max: 53
|  +------------------------------------+ |
|  Available: 53 units                    |
|                                         |
|  NEW LOCATION *                         |
|  +--------------------------------+ [v] |
|  | Select destination...              | |
|  +------------------------------------+ |
|                                         |
|  Reason (optional)                      |
|  +------------------------------------+ |
|  | e.g., Reorganization, Picking prep | |
|  +------------------------------------+ |
|                                         |
|  +------------------------------------+ |
|  |                                    | |
|  |        [MOVE INVENTORY]            | | <- 56px primary
|  |                                    | |
|  +------------------------------------+ |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Settings - Location Management

```
+=======================================================================+
| Settings                                                              |
+-----------------------------------------------------------------------+
| [General] [Users] [Locations] [Integrations] [Billing]                |
|                   ============                                        |
+-----------------------------------------------------------------------+
|                                                                       |
|  WAREHOUSE LOCATIONS                                  [+ Add Location]|
|  -------------------------------------------------------------------- |
|                                                                       |
|  [Search locations___________________]  [Status: All v]  [Zone: All v]|
|                                                                       |
|  +-------------------------------------------------------------------+|
|  | Name                 | Zone | Aisle | Shelf | Bin | Status | Act  ||
|  +-------------------------------------------------------------------+|
|  | Main Warehouse       | -    | -     | -     | -   | Active | [..] ||
|  | Receiving Dock       | R    | -     | -     | -   | Active | [..] ||
|  | Aisle A-1, Shelf 1   | A    | 1     | 1     | -   | Active | [..] ||
|  | Aisle A-1, Shelf 2   | A    | 1     | 2     | -   | Active | [..] ||
|  | Aisle A-1, Shelf 3   | A    | 1     | 3     | -   | Active | [..] ||
|  | Aisle A-1, S3, Bin 1 | A    | 1     | 3     | 1   | Inact. | [..] ||
|  | Aisle B-1, Shelf 1   | B    | 1     | 1     | -   | Active | [..] ||
|  +-------------------------------------------------------------------+|
|                                                                       |
|  Showing 7 of 24 locations                      < 1 [2] 3 >           |
|                                                                       |
+=======================================================================+
```

### Goods Receipt with Location

```
+=======================================================================+
| Receive Goods - PO-2026-0042                                     [X]  |
+=======================================================================+
|                                                                       |
|  +-- ORDER INFO -----------------------+  +-- RECEIVE --------------+ |
|  |                                     |  |                         | |
|  |  Supplier: BYD Australia     |  |  Line Items:            | |
|  |  Ordered: Jan 10, 2026              |  |                         | |
|  |  Expected: Jan 15, 2026             |  |  Product     Ord   Recv | |
|  |  Status: Pending                    |  |  --------------------  | |
|  |                                     |  |  Widget Pro   50   [50] | |
|  +-------------------------------------+  |  Solar Panel  25   [25] | |
|                                           |                         | |
|  +-- PUT-AWAY LOCATION ----------------+  |  Location:              | |
|  |                                     |  |  [Aisle A-1, S2    v]   | |
|  |  [*] Single location for all items |  |                         | |
|  |  [ ] Assign location per item       |  |  Serial Numbers:        | |
|  |                                     |  |  [Scan or enter...]     | |
|  |  Location:                          |  |                         | |
|  |  +-------------------------------+  |  +-------------------------+ |
|  |  | [v] Aisle A-1, Shelf 2        |  |                             |
|  |  +-------------------------------+  |                             |
|  |                                     |                             |
|  |  Zone: A | Aisle: 1 | Shelf: 2     |                             |
|  |  Current items: 53 widgets         |                             |
|  |                                     |                             |
|  +-------------------------------------+                             |
|                                                                       |
|                                        ( Cancel )  [ Receive Goods ]  |
+=======================================================================+
```

### Inventory List with Location Column

```
+=======================================================================+
| Inventory                                           [+ Add Inventory] |
+-----------------------------------------------------------------------+
| [Search_____________________] [Location v] [Category v] [Status v]    |
+-----------------------------------------------------------------------+
|                                                                       |
| Filter: Location = "Aisle A-1"                         [Clear Filter] |
|                                                                       |
| +-------------------------------------------------------------------+ |
| | [ ] | Product         | SKU    | Stock | Location       | Actions| |
| +-------------------------------------------------------------------+ |
| | [ ] | 10kWh LFP Battery  | BAT-LFP-10KWH | 53    | Aisle A-1, S2  | [Move] | |
| | [ ] | Widget Pro 300  | WP-300 | 28    | Aisle A-1, S1  | [Move] | |
| | [ ] | Cable Kit Pro   | CK-PRO | 145   | Aisle A-1, S3  | [Move] | |
| | [ ] | Bracket Set     | BS-100 | 89    | Aisle A-1, S2  | [Move] | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| Showing 1-4 of 4 items                                                |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Settings - Location Management

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Warehouse Locations                                                        |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  +------------------------------------------------------------------------------------+|
| Inventory   |  |                                                                                    ||
| Jobs        |  |  WAREHOUSE LOCATIONS                                           [+ Add Location]   ||
| Settings <  |  |  ================================================================================  ||
|   General   |  |                                                                                    ||
|   Users     |  |  [Search locations______________]  [Zone v]  [Status v]  [Export]                 ||
|   Locations |  |                                                                                    ||
|   ========= |  |  +--------------------------------------------------------------------------------+||
|   Tags      |  |  |                                                                                |||
|   Billing   |  |  |  Name                    | Zone | Aisle | Shelf | Bin | Items | Status | Act   |||
|             |  |  |  ---------------------------------------------------------------------------------
|             |  |  |  Main Warehouse          | -    | -     | -     | -   | 234   | Active | [E][D]|||
|             |  |  |  Receiving Dock          | R    | -     | -     | -   | 45    | Active | [E][D]|||
|             |  |  |  Aisle A-1, Shelf 1      | A    | 1     | 1     | -   | 89    | Active | [E][D]|||
|             |  |  |  Aisle A-1, Shelf 2      | A    | 1     | 2     | -   | 156   | Active | [E][D]|||
|             |  |  |  Aisle A-1, Shelf 3      | A    | 1     | 3     | -   | 67    | Active | [E][D]|||
|             |  |  |  Aisle A-1, S3, Bin 1    | A    | 1     | 3     | 1   | 0     | Inact. | [E][D]|||
|             |  |  |  Aisle A-1, S3, Bin 2    | A    | 1     | 3     | 2   | 34    | Active | [E][D]|||
|             |  |  |  Aisle B-1, Shelf 1      | B    | 1     | 1     | -   | 123   | Active | [E][D]|||
|             |  |  |  Aisle B-1, Shelf 2      | B    | 1     | 2     | -   | 78    | Active | [E][D]|||
|             |  |  |  Aisle B-2, Shelf 1      | B    | 2     | 1     | -   | 45    | Active | [E][D]|||
|             |  |  |                                                                                |||
|             |  |  +--------------------------------------------------------------------------------+||
|             |  |                                                                                    ||
|             |  |  Showing 1-10 of 24 locations                               < 1 [2] 3 >           ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Add/Edit Location Modal

```
+======================================================================================================+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  | ADD WAREHOUSE LOCATION                                                                    [X] |  |
|  +================================================================================================+  |
|  |                                                                                                |  |
|  |  +-- LOCATION DETAILS -----------------------------------------------+                        |  |
|  |  |                                                                   |                        |  |
|  |  |  Location Name *                                                  |                        |  |
|  |  |  +-------------------------------------------------------------+  |                        |  |
|  |  |  | Aisle A-1, Shelf 2                                          |  |                        |  |
|  |  |  +-------------------------------------------------------------+  |                        |  |
|  |  |  System will auto-generate if left blank based on zone/aisle/shelf/bin                    |  |
|  |  |                                                                   |                        |  |
|  |  |  +-------------+  +-------------+  +-------------+  +-------------+                        |  |
|  |  |  | Zone        |  | Aisle       |  | Shelf       |  | Bin         |                        |  |
|  |  |  | +---------+ |  | +---------+ |  | +---------+ |  | +---------+ |                        |  |
|  |  |  | | A       | |  | | 1       | |  | | 2       | |  | |         | |                        |  |
|  |  |  | +---------+ |  | +---------+ |  | +---------+ |  | +---------+ |                        |  |
|  |  |  +-------------+  +-------------+  +-------------+  +-------------+                        |  |
|  |  |                                                                   |                        |  |
|  |  +-------------------------------------------------------------------+                        |  |
|  |                                                                                                |  |
|  |  +-- STATUS & OPTIONS -----------------------------------------------+                        |  |
|  |  |                                                                   |                        |  |
|  |  |  Status                                                           |                        |  |
|  |  |  +------------------+  +------------------+                       |                        |  |
|  |  |  | (o) Active       |  | ( ) Inactive     |                       |                        |  |
|  |  |  +------------------+  +------------------+                       |                        |  |
|  |  |                                                                   |                        |  |
|  |  |  [ ] Default location for new inventory receipts                  |                        |  |
|  |  |  [ ] Allow negative inventory at this location                    |                        |  |
|  |  |                                                                   |                        |  |
|  |  +-------------------------------------------------------------------+                        |  |
|  |                                                                                                |  |
|  +------------------------------------------------------------------------------------------------+  |
|  |                                                                                                |  |
|  |                                                      ( Cancel )   [ Save Location ]            |  |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

### Inventory List with Location and Move Action

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Inventory                                                      [+ Add Inventory]      |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  [Search___________________] [Location v] [Category v] [Status v] [Sort: Name v]       |
| Inventory < |                                                                                        |
| Jobs        |  +------------------------------------------------------------------------------------+|
| Pipeline    |  |                                                                                    ||
|             |  |  [ ] | Product         | SKU       | Stock | Location        | Value    | Actions ||
|             |  |  ------------------------------------------------------------------------------------
|             |  |  [ ] | 10kWh LFP Battery  | BAT-LFP-10KWH    | 53    | Aisle A-1, S2   | $6,625   | [Move]  ||
|             |  |  [ ] | Widget Pro 300  | WP-300    | 28    | Aisle A-1, S1   | $2,800   | [Move]  ||
|             |  |  [ ] | Solar Panel 400 | SOL-RES-400W    | 62    | Main Warehouse  | $18,600  | [Move]  ||
|             |  |  [ ] | 5kW Hybrid Inverter    | INV-HYB-5KW    | 27    | Receiving Dock  | $13,500  | [Move]  ||
|             |  |  [ ] | Battery 10kWh   | BP-10K    | 38    | Aisle B-1, S1   | $38,000  | [Move]  ||
|             |  |  [ ] | Mounting Rails  | MR-STD    | 145   | Aisle A-1, S3   | $2,175   | [Move]  ||
|             |  |  [ ] | Cable Kit Pro   | CK-PRO    | 89    | Aisle A-1, S3   | $1,335   | [Move]  ||
|             |  |  [ ] | Bracket Set     | BS-100    | 234   | Aisle B-1, S2   | $2,340   | [Move]  ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  Showing 1-8 of 156 items                                        < 1 [2] 3 ... 20 >    |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Move Inventory Modal

```
+======================================================================================================+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  | MOVE INVENTORY                                                                            [X] |  |
|  +================================================================================================+  |
|  |                                                                                                |  |
|  |  +-- ITEM DETAILS ------------------------------------------------+  +-- MOVE DETAILS ------+ |  |
|  |  |                                                                |  |                       | |  |
|  |  |  Product: 10kWh LFP Battery                                       |  |  Quantity to Move *   | |  |
|  |  |  SKU: BAT-LFP-10KWH                                                   |  |  +-------------------+ | |  |
|  |  |  Category: Electronics > Widgets                               |  |  |  10              | | |  |
|  |  |                                                                |  |  +-------------------+ | |  |
|  |  |  Current Location:                                             |  |  Available: 53 units  | |  |
|  |  |  +----------------------------------------------------------+  |  |                       | |  |
|  |  |  | Aisle A-1, Shelf 2                                       |  |  |  Destination *        | |  |
|  |  |  | Zone: A | Aisle: 1 | Shelf: 2                            |  |  |  +-------------------+ | |  |
|  |  |  +----------------------------------------------------------+  |  |  | [v] Select...     | | |  |
|  |  |                                                                |  |  +-------------------+ | |  |
|  |  |  Quantity at Location: 53 units                                |  |                       | |  |
|  |  |  Last Movement: 2 days ago (received)                          |  |  Reason               | |  |
|  |  |                                                                |  |  +-------------------+ | |  |
|  |  |  Other Locations with this Product:                            |  |  | Reorganization    | | |  |
|  |  |  - Main Warehouse: 12 units                                    |  |  +-------------------+ | |  |
|  |  |  - Receiving Dock: 5 units                                     |  |                       | |  |
|  |  |                                                                |  +------------------------+ |  |
|  |  +----------------------------------------------------------------+                             |  |
|  |                                                                                                |  |
|  |  +-- MOVEMENT PREVIEW -------------------------------------------------------------------+     |  |
|  |  |                                                                                       |     |  |
|  |  |  From: Aisle A-1, Shelf 2 (53 units)  ->  (43 units after move)                       |     |  |
|  |  |  To:   Main Warehouse (12 units)       ->  (22 units after move)                      |     |  |
|  |  |                                                                                       |     |  |
|  |  +----------------------------------------------------------------------------------------+     |  |
|  |                                                                                                |  |
|  +------------------------------------------------------------------------------------------------+  |
|  |                                                                                                |  |
|  |                                                    ( Cancel )   [ Move Inventory ]             |  |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
LOCATIONS TABLE LOADING:
+-------------------------------------------------------------------+
| Name              | Zone | Aisle | Shelf | Bin | Status | Actions |
+-------------------------------------------------------------------+
| [.........................] | [...] | [...] | [...] | [...] |    |
| [.........................] | [...] | [...] | [...] | [...] |    |
| [.........................] | [...] | [...] | [...] | [...] |    |
+-------------------------------------------------------------------+
↑ Skeleton rows with shimmer animation

LOCATION SELECTOR LOADING:
+------------------------------------+
| [Search locations___________] [X]  |
|                                    |
|  Loading locations...              |
|  +------------------------------+  |
|  | [.........................]  |  |
|  | [.........................]  |  |
|  | [.........................]  |  |
|  +------------------------------+  |
+------------------------------------+

MOVE IN PROGRESS:
+------------------------------------+
|                                    |
|   Moving inventory...              |
|   +----------------------------+   |
|   | [============          ]   |   |
|   +----------------------------+   |
|                                    |
|   Updating location records...     |
|                                    |
+------------------------------------+
```

### Empty States

```
NO LOCATIONS CREATED:
+-------------------------------------+
|                                     |
|         +-------------+             |
|         |  [warehouse] |            |
|         +-------------+             |
|                                     |
|     No Locations Configured         |
|                                     |
|  Create your first warehouse        |
|  location to start organizing       |
|  your inventory.                    |
|                                     |
|  [+ Add First Location]             |
|                                     |
+-------------------------------------+

NO MATCHING LOCATIONS:
+-------------------------------------+
| [Search: "Zone C"___________] [X]   |
|                                     |
|  No locations matching "Zone C"     |
|                                     |
|  [+ Create location in Zone C]      |
|                                     |
+-------------------------------------+

LOCATION WITH NO ITEMS:
+-------------------------------------+
| Aisle A-1, Shelf 4                  |
| Zone: A | Aisle: 1 | Shelf: 4       |
|                                     |
|  This location is empty             |
|                                     |
|  [Move Items Here] [Edit] [Delete]  |
+-------------------------------------+
```

### Error States

```
FAILED TO LOAD LOCATIONS:
+-------------------------------------+
| [!] Couldn't load locations         |
|                                     |
| Check your connection and           |
| try again.                          |
|                                     |
| [Retry]                             |
+-------------------------------------+

DUPLICATE LOCATION NAME:
+-------------------------------------+
| [!] Location already exists         |
|                                     |
| A location named "Aisle A-1, S2"    |
| already exists.                     |
|                                     |
| [Edit Existing] [Use Different Name]|
+-------------------------------------+

MOVE FAILED:
+-------------------------------------+
| [!] Move Failed                     |
|                                     |
| Could not move 10 units to          |
| Main Warehouse.                     |
|                                     |
| Error: Destination inactive         |
|                                     |
| [Activate Location]  [Try Again]    |
+-------------------------------------+

CANNOT DELETE:
+-------------------------------------+
| [!] Cannot Delete Location          |
|                                     |
| "Aisle A-1, Shelf 2" contains       |
| 53 inventory items.                 |
|                                     |
| Move or remove all items first.     |
|                                     |
| [View Items]  [Cancel]              |
+-------------------------------------+
```

### Success States

```
LOCATION CREATED:
+-------------------------------------+
| [ok] Location Created               |
|                                     |
| "Aisle A-1, Shelf 4" has been       |
| created and is ready to use.        |
|                                     |
| [Add Another]  [Done]               |
+-------------------------------------+

INVENTORY MOVED:
+-------------------------------------+
| [ok] Inventory Moved                |
|                                     |
| 10 x 10kWh LFP Battery moved           |
| from Aisle A-1, Shelf 2             |
| to Main Warehouse                   |
|                                     |
| [View at New Location]  [Done]      |
+-------------------------------------+

LOCATION DEACTIVATED:
+-------------------------------------+
| [ok] Location Deactivated           |
|                                     |
| "Aisle A-1, S3, Bin 1" is now       |
| inactive and hidden from selectors. |
|                                     |
| [Undo]  [Done]                      |
+-------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Location Settings Page**
   - Tab to Add Location button
   - Tab to search input
   - Tab to filter dropdowns
   - Tab through table headers (sortable)
   - Tab through each row's actions
   - Tab to pagination

2. **Add/Edit Location Dialog**
   - Focus trapped in dialog
   - Tab: Name, Zone, Aisle, Shelf, Bin, Status, checkboxes
   - Tab to Cancel, then Save
   - Escape closes dialog

3. **Location Selector**
   - Tab opens dropdown
   - Arrow keys navigate options
   - Enter/Space selects
   - Escape closes

4. **Move Inventory Dialog**
   - Focus trapped
   - Tab: Quantity, Destination, Reason
   - Tab to Cancel, then Move
   - Escape closes

### ARIA Requirements

```html
<!-- Location Settings Table -->
<table
  role="grid"
  aria-label="Warehouse locations"
  aria-rowcount="24"
>
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Name</th>
      <th role="columnheader">Zone</th>
    </tr>
  </thead>
</table>

<!-- Location Selector -->
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <input
    aria-label="Search and select location"
    aria-autocomplete="list"
  />
</div>

<ul role="listbox" aria-label="Available locations">
  <li role="option" aria-selected="true">Aisle A-1, Shelf 2</li>
  <li role="option" aria-selected="false">Main Warehouse</li>
</ul>

<!-- Move Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="move-title"
>
  <h2 id="move-title">Move Inventory</h2>

  <label for="quantity">Quantity to Move</label>
  <input
    id="quantity"
    type="number"
    aria-describedby="quantity-help"
  />
  <span id="quantity-help">Available: 53 units</span>
</div>
```

### Screen Reader Announcements

- Table sort: "Sorted by name, ascending"
- Location created: "Location Aisle A-1, Shelf 4 created successfully"
- Location selected: "Location Main Warehouse selected"
- Move complete: "10 units moved to Main Warehouse"
- Error: "Move failed, destination location is inactive"
- Filter applied: "Showing 7 locations in Zone A"

---

## Animation Choreography

### Table Row Entry

```
PAGE LOAD:
- Duration: 300ms total
- Stagger: 50ms between rows
- Easing: ease-out
- Transform: translateX(-10px) -> translateX(0)
- Opacity: 0 -> 1
```

### Location Selector

```
DROPDOWN OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: scaleY(0) -> scaleY(1)
- Transform-origin: top
- Opacity: 0 -> 1

OPTION HOVER:
- Duration: 100ms
- Background: transparent -> gray-100

OPTION SELECT:
- Duration: 150ms
- Checkmark: scale(0) -> scale(1.1) -> scale(1)
- Row highlight flash
```

### Move Inventory

```
PREVIEW UPDATE:
- Duration: 250ms
- Easing: ease-out
- Number animation: count up/down
- Color: old value fades, new value highlights

MOVE COMPLETE:
- Duration: 400ms
- Checkmark animation
- Source row: quantity updates with highlight
- Destination row: quantity updates with highlight
- Toast slides up
```

### Add/Edit Dialog

```
OPEN:
- Duration: 250ms
- Backdrop: opacity 0 -> 0.5
- Dialog: translateY(20px) -> translateY(0)
- Dialog: scale(0.95) -> scale(1)

FIELD FOCUS:
- Duration: 150ms
- Border: gray -> primary
- Label: slide up (if floating)

SAVE SUCCESS:
- Duration: 300ms
- Button: "Save" -> checkmark -> "Saved"
- Dialog closes after 500ms delay
```

---

## Component Props Interfaces

```typescript
// Location Management Page
interface LocationsSettingsPageProps {
  /** Initial search query */
  initialSearch?: string;
  /** Filter by zone */
  zoneFilter?: string;
  /** Filter by status */
  statusFilter?: 'active' | 'inactive' | 'all';
}

// Location Table
interface LocationsTableProps {
  /** Location data */
  locations: WarehouseLocation[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when edit clicked */
  onEdit?: (location: WarehouseLocation) => void;
  /** Callback when delete clicked */
  onDelete?: (locationId: string) => void;
  /** Callback when row clicked */
  onRowClick?: (location: WarehouseLocation) => void;
  /** Sortable columns */
  sortableColumns?: ('name' | 'zone' | 'items')[];
  /** Default sort */
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
}

interface WarehouseLocation {
  id: string;
  organizationId: string;
  name: string;
  zone?: string | null;
  aisle?: string | null;
  shelf?: string | null;
  bin?: string | null;
  isActive: boolean;
  itemCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Add/Edit Location Dialog
interface LocationDialogProps {
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Location to edit (null for create) */
  location?: WarehouseLocation | null;
  /** Callback on success */
  onSuccess?: (location: WarehouseLocation) => void;
}

interface LocationFormValues {
  name: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  isActive: boolean;
  isDefault?: boolean;
  allowNegative?: boolean;
}

// Location Selector
interface LocationSelectorProps {
  /** Selected location ID */
  value?: string;
  /** Callback when selection changes */
  onChange: (locationId: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show recently used section */
  showRecentlyUsed?: boolean;
  /** Filter to only active locations */
  activeOnly?: boolean;
  /** Allow creating new locations inline */
  allowCreate?: boolean;
  /** Callback when new location created */
  onCreateNew?: (name: string) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Error state */
  error?: string;
  /** Required field */
  required?: boolean;
}

// Move Inventory Dialog
interface MoveInventoryDialogProps {
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Inventory item to move */
  item: {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    currentLocationId: string;
    currentLocationName: string;
    quantityAtLocation: number;
  };
  /** Callback on success */
  onSuccess?: (movement: InventoryMovement) => void;
}

interface MoveInventoryFormValues {
  quantity: number;
  destinationLocationId: string;
  reason?: string;
}

interface InventoryMovement {
  id: string;
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason?: string;
  movedAt: Date;
  movedBy: string;
}

// Inventory List Location Column
interface LocationColumnProps {
  /** Location data */
  location?: {
    id: string;
    name: string;
    zone?: string;
  };
  /** Show full path or short name */
  format?: 'full' | 'short';
  /** Allow clicking to filter */
  filterable?: boolean;
  /** Callback when clicked */
  onFilterByLocation?: (locationId: string) => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/settings/locations.tsx` | Location management settings page |
| `src/components/domain/warehouse/location-dialog.tsx` | Add/Edit location modal |
| `src/components/domain/warehouse/location-selector.tsx` | Location combobox selector |
| `src/components/domain/warehouse/locations-table.tsx` | Locations data table |
| `src/components/domain/inventory/move-inventory-dialog.tsx` | Move between locations modal |
| `src/components/domain/inventory/inventory-columns.tsx` | Add location column |
| `src/components/domain/procurement/receive-goods.tsx` | Add location selector |

---

## Design References

- **Location Badge**: Compact pill with zone prefix (A-1-2)
- **Zone Colors**: Optional color coding by zone (A=blue, B=green, R=orange)
- **Hierarchy Visual**: Indented display for bin under shelf under aisle
- **Move Preview**: Side-by-side comparison with animated numbers
- **Recent Locations**: Pinned section in selector for quick access
