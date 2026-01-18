# Wireframe: DOM-INV-001c - Reorder Point Alerts: UI

**Version**: v1.1 - Added Renoz battery inventory context

## Story Reference

- **Story ID**: DOM-INV-001c
- **Name**: Reorder Point Alerts: UI
- **PRD**: memory-bank/prd/domains/inventory.prd.json
- **Type**: UI Component
- **Component Type**: Alert Banner + Quick Action Widgets
- **Primary Users**: Purchasing Manager, Warehouse Staff, Operations

## Overview

Enhanced low stock widget with "Create PO" quick action per product, alert banner showing reorderQty suggestion, and pre-filled purchase order creation workflow.

**Renoz Battery Context**: Battery inventory has specific lead times, minimum order quantities, and seasonal demand patterns that affect reorder alerts and PO creation workflows.

---

## UI Patterns (Reference Implementation)

This wireframe uses components from the REUI library for consistent styling and behavior.

### Stat Cards - Low Stock Widget

**Component**: `statistic-card-1.tsx`
**Path**: `_reference/.reui-reference/registry/default/blocks/cards/statistic-cards/statistic-card-1.tsx`

**Mapping**:
- **Widget Header**: Use CardHeader with CardTitle for "LOW STOCK ALERTS"
- **Count Badge**: Use Badge component with count (e.g., "[!] 5")
- **Product Cards**: Each low stock item as a Card with:
  - CardHeader: Product name
  - CardContent: Stock stats (On Hand | Reorder)
  - Badge with variant="destructive" for shortage
  - Lead time info as secondary text
- **CTA Button**: Use Button variant="default" for [+ CREATE PO]
- **More Actions**: Use DropdownMenu in CardToolbar for additional options

**Key Features**:
- Hoverable cards with subtle shadow
- ArrowDown/ArrowUp icons in badges for variance
- Stat value with highlight color (red for low stock)
- "View All" link at bottom

**Example Adaptation**:
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium">
      10kWh LiFePO4 Battery
    </CardTitle>
    <CardToolbar>
      <DropdownMenu>...</DropdownMenu>
    </CardToolbar>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-2">
      <span className="text-2xl font-medium">3</span>
      <Badge variant="destructive">
        Below reorder point (25)
      </Badge>
    </div>
    <div className="text-xs text-muted-foreground mt-2">
      Lead: 6 weeks from BYD China
    </div>
    <Button variant="default" className="mt-3 w-full">
      + CREATE PO
    </Button>
  </CardContent>
</Card>
```

### Data Grid - Alert Banner / Inventory List

**Component**: `data-grid.tsx`
**Path**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`

**Mapping**:
- **Alert Banner**: Not using DataGrid directly; use Alert component instead
- **Inventory List with Actions**: Use DataGrid for product rows
  - Columns: Product, SKU, Stock, Reorder Point, Actions
  - onRowClick to open details
  - Action column with [Move] button
  - Sticky header with `headerSticky: true`
  - Row borders with `rowBorder: true`

**Key Features**:
- Sortable columns with aria-sort
- Responsive table layout
- Loading skeleton states
- Empty states support
- Custom cell rendering

**Example Adaptation**:
```tsx
<DataGrid
  table={table}
  recordCount={totalItems}
  isLoading={isLoading}
  tableLayout={{
    headerSticky: true,
    rowBorder: true,
    stripped: false,
  }}
  onRowClick={(row) => navigate(`/inventory/${row.id}`)}
>
  <DataGridContainer>
    {/* Table markup */}
  </DataGridContainer>
</DataGrid>
```

### Line Charts - Stock Trend (Optional)

**Component**: `line-chart-1.tsx`
**Path**: `_reference/.reui-reference/registry/default/blocks/charts/line-charts/line-chart-1.tsx`

**Mapping** (for future enhancement):
- **Not used in this wireframe** but could add stock level trend
- Would show historical stock levels vs reorder point
- Use Area for stock projection
- Use Line with dashed stroke for reorder threshold
- ReferenceLine for current date

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
- **Industry**: Australian B2B battery manufacturer and installer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Products**: LiFePO4 Battery systems (5kWh-500kWh), Hybrid Inverters (3kW-50kW), Solar panels (400W-550W), Installation accessories
- **Example SKUs**:
  - BAT-LFP-10KWH (10kWh LiFePO4 Battery)
  - INV-HYB-5KW (5kW Hybrid Inverter)
  - SOL-RES-400W (400W Residential Solar Panel)
- **Warehouse Locations**: Brisbane (main), Sydney, Melbourne, Perth
- **Key Suppliers**:
  - BYD (Shenzhen, China) - 6 week lead time, MOQ: 50 units
  - Pylontech (Zhongshan, China) - 4 week lead time, MOQ: 20 units
  - LG Energy (Seoul, Korea) - 8 week lead time, MOQ: 100 units
- **Customer Cities**: Brisbane, Sydney, Melbourne, Perth, Adelaide

### Battery-Specific Inventory Considerations

**Lead Times**:
- China suppliers: 4-8 weeks (sea freight), 1-2 weeks (air - premium cost)
- Korea suppliers: 8 weeks standard
- Domestic accessories: 1-2 days

**Minimum Order Quantities (MOQ)**:
- BYD batteries: 50 units minimum
- Pylontech batteries: 20 units minimum
- LG batteries: 100 units minimum
- Inverters: 10 units minimum

**Seasonal Demand Patterns**:
- Summer (Dec-Feb): HIGH demand (solar peak season)
- Autumn (Mar-May): MEDIUM demand
- Winter (Jun-Aug): LOW demand
- Spring (Sep-Nov): MEDIUM-HIGH demand (pre-summer prep)

**Reorder Alert Factors**:
- Buffer stock for warranty replacements (10% of stock)
- Sea freight delays (port congestion, customs)
- Upcoming marketing campaigns or installer training events

---

## Mobile Wireframe (375px)

### Low Stock Widget - Dashboard View

```
+=========================================+
| [=] Dashboard                    [bell] |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | LOW STOCK ALERTS           [!] 5    ||
|  | ===================================||
|  |                                     ||
|  | +----------------------------------+||
|  | | [!] 10kWh LiFePO4 Battery       |||
|  | |     On Hand: 3  |  Reorder: 25  |||
|  | |     Lead: 6 weeks (BYD China)   |||
|  | |     ========================    |||
|  | |     +------------------------+  |||
|  | |     |    [+ CREATE PO]       |  ||| <- 44px CTA
|  | |     +------------------------+  |||
|  | +----------------------------------+||
|  |                                     ||
|  | +----------------------------------+||
|  | | [!] 5kW Hybrid Inverter         |||
|  | |     On Hand: 12  |  Reorder: 50 |||
|  | |     Lead: 4 weeks (Pylontech)   |||
|  | |     Summer demand approaching   |||
|  | |     ========================    |||
|  | |     +------------------------+  |||
|  | |     |    [+ CREATE PO]       |  |||
|  | |     +------------------------+  |||
|  | +----------------------------------+||
|  |                                     ||
|  | +----------------------------------+||
|  | | [!] LFP Battery Module 2.4kWh   |||
|  | |     On Hand: 2  |  Reorder: 10  |||
|  | |     Lead: 8 weeks (LG Korea)    |||
|  | |     ========================    |||
|  | |     +------------------------+  |||
|  | |     |    [+ CREATE PO]       |  |||
|  | |     +------------------------+  |||
|  | +----------------------------------+||
|  |                                     ||
|  |          [View All (5)]             ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Alert Banner - Inventory List Header

```
+=========================================+
| < Inventory                      [...]  |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [!] REORDER ALERT                   | |
| |                                     | |
| | 5 products below reorder point      | |
| |                                     | |
| | Suggested action: Create purchase   | |
| | orders for low stock items          | |
| |                                     | |
| | Note: 6-8 week lead times from      | |
| | China suppliers. Order now for      | |
| | summer demand (December peak).      | |
| |                                     | |
| | [Create All POs]    [Dismiss]       | |
| +-------------------------------------+ |
|                                         |
| [Search_______________] [Filter v]      |
|                                         |
| +-------------------------------------+ |
| | 10kWh LiFePO4 Battery                  | |
| | SKU: BAT-LFP-10KWH  |  Stock: 3            | |
| | [!] Below reorder point (25)        | |
| | Lead: 6 weeks from BYD China        | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | 400W Solar Panel                    | |
| | SKU: SOL-RES-400W  |  Stock: 12           | |
| | [!] Below reorder point (50)        | |
| | Lead: 4 weeks from Pylontech        | |
| +-------------------------------------+ |
|                                         |
+=========================================+
```

### Create PO Quick Action - Bottom Sheet

```
+=========================================+
| =====================================   | <- Drag handle
|                                         |
|  CREATE PURCHASE ORDER           [X]    |
|  -------------------------------------- |
|                                         |
|  Product                                |
|  +------------------------------------+ |
|  | 10kWh LiFePO4 Battery     [locked] | | <- Pre-filled
|  +------------------------------------+ |
|                                         |
|  Current Stock                          |
|  +------------------------------------+ |
|  | 3 units                   [locked] | |
|  +------------------------------------+ |
|                                         |
|  Reorder Point                          |
|  +------------------------------------+ |
|  | 25 units                  [locked] | |
|  +------------------------------------+ |
|                                         |
|  SUGGESTED ORDER QUANTITY               |
|  +------------------------------------+ |
|  |  50                                | | <- MOQ from supplier
|  +------------------------------------+ |
|  ↑ BYD minimum order: 50 units          |
|  Lead time: 6 weeks (sea freight)       |
|                                         |
|  Supplier                               |
|  +------------------------------------+ |
|  | [v] BYD (Shenzhen, China)          | | <- Pre-filled
|  +------------------------------------+ |
|                                         |
|  Shipping Method                        |
|  +------------------------------------+ |
|  | [v] Sea Freight (6 weeks)          | |
|  |     Air Freight (1-2 weeks) +$500  | |
|  +------------------------------------+ |
|                                         |
|  Expected Delivery                      |
|  +------------------------------------+ |
|  | [cal] 24/02/2026 (6 weeks)         | |
|  +------------------------------------+ |
|  ↑ Allow buffer for customs & port      |
|                                         |
|  Storage Notes                          |
|  +------------------------------------+ |
|  | Store at 30-50% charge              | |
|  | Temperature: 10-35°C                | |
|  +------------------------------------+ |
|                                         |
|  +------------------------------------+ |
|  |                                    | |
|  |        [CREATE PO]                 | | <- 56px primary
|  |                                    | |
|  +------------------------------------+ |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Low Stock Widget - Dashboard

```
+=====================================================================+
| Dashboard                                              [Bell] [User] |
+---------------------------------------------------------------------+
|                                                                     |
|  +-------------------------+  +-----------------------------------+ |
|  | QUICK STATS             |  | LOW STOCK ALERTS            [!] 5 | |
|  | ======================= |  | ================================= | |
|  |                         |  |                                   | |
|  | Total Value: $125,450   |  | Product        Stock  Reorder  PO | |
|  | Items: 1,247            |  | -------------------------------------
|  | Below Reorder: 5        |  | LiFePO4 10kWh   3      25    [+PO] | |
|  | Pending POs: 3          |  |   BYD China - 6 weeks lead         | |
|  +-------------------------+  | Hybrid Inv 5kW  12     50    [+PO] | |
|                               |   Pylontech - 4 weeks lead         | |
|                               | LFP Module 2.4  2      10    [+PO] | |
|                               |   LG Korea - 8 weeks lead          | |
|                               |                                   | |
|                               | Note: Summer demand (Dec) peak    | |
|                               | approaching. Order early.         | |
|                               |                                   | |
|                               | [Create All POs] [View Details]   | |
|                               +-----------------------------------+ |
|                                                                     |
+---------------------------------------------------------------------+
```

### Alert Banner - Inventory List

```
+=====================================================================+
| Inventory                                          [+ Add Inventory] |
+---------------------------------------------------------------------+
|                                                                     |
|  +----------------------------------------------------------------+ |
|  | [!] REORDER ALERT: 5 products below reorder point              | |
|  |                                                                | |
|  | LiFePO4 10kWh (3/25) | Hybrid Inv 5kW (12/50) | Module (2/10)   | |
|  |                                                                | |
|  | Lead times: 4-8 weeks from China/Korea. Summer demand peak     | |
|  | approaching December. Consider air freight for urgent items.   | |
|  |                                                                | |
|  |            [Create All POs]  [Review Items]  [Dismiss for 24h] | |
|  +----------------------------------------------------------------+ |
|                                                                     |
|  [Search_________________________] [Category v] [Status v] [Sort v] |
|                                                                     |
|  +----------------------------------------------------------------+ |
|  | [ ] | Product         | SKU       | Stock | Reorder | Actions | |
|  +----------------------------------------------------------------+ |
|  | [ ] | 10kWh LiFePO4 Battery  | BAT-LFP-10KWH    | 3 [!] | 25      | [...] | |
|  |     | Lead: 6 weeks (BYD China) | MOQ: 50 units                   | |
|  | [ ] | Solar Panel 400 | SOL-RES-400W    | 12[!] | 50      | [...] | |
|  |     | Lead: 4 weeks (Pylontech) | MOQ: 20 units                   | |
|  | [ ] | 5kW Hybrid Inverter    | INV-HYB-5KW    | 2 [!] | 10      | [...] | |
|  |     | Lead: 4 weeks (Pylontech) | MOQ: 10 units                   | |
|  +----------------------------------------------------------------+ |
|                                                                     |
+=====================================================================+
```

---

## Desktop Wireframe (1280px+)

### Low Stock Widget - Dashboard

```
+======================================================================================================+
| Renoz CRM                                                                       [Bell] [User v]      |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard < |  Dashboard                                                         [Date Range v]       |
| Customers   |  ------------------------------------------------------------------------------------- |
| Orders      |                                                                                        |
| Products    |  +------------------------+  +------------------------+  +------------------------+    |
| Inventory   |  | INVENTORY VALUE        |  | ITEMS IN STOCK         |  | PENDING RECEIPTS       |    |
| Jobs        |  | ====================== |  | ====================== |  | ====================== |    |
| Pipeline    |  |                        |  |                        |  |                        |    |
| Support     |  | $125,450               |  | 1,247                  |  | 3 POs                  |    |
|             |  | +2.3% vs last month    |  | 42 low stock           |  | Est. arrival: 24/01    |    |
|             |  +------------------------+  +------------------------+  +------------------------+    |
|             |                                                                                        |
|             |  +------------------------------------------------------------------------------------+|
|             |  | LOW STOCK ALERTS - Action Required                                         [!] 5  ||
|             |  |==================================================================================||
|             |  |                                                                                  ||
|             |  |  Product              SKU        On Hand    Reorder Pt   Supplier/Lead    Action  ||
|             |  |  ------------------------------------------------------------------------------------
|             |  |  10kWh LiFePO4 Battery       BAT-LFP-10KWH     3          25           BYD/6wk MOQ:50 [+PO]   ||
|             |  |  400W Solar Panel     SOL-RES-400W     12         50           Pylontech/4wk     [+PO]   ||
|             |  |  5kW Hybrid Inverter         INV-HYB-5KW     2          10           Pylontech/4wk     [+PO]   ||
|             |  |  LFP Module 2.4kWh    MOD-24K       8          30           LG Korea/8wk      [+PO]   ||
|             |  |  Solar Mounting Kit   SMK-PRO       15         40           Domestic/2d       [+PO]   ||
|             |  |                                                                                  ||
|             |  |  5 items below reorder point                                                     ||
|             |  |                                                                                  ||
|             |  |  [i] Summer demand peak approaching (December). China suppliers have 4-8 week   ||
|             |  |      lead times. Consider ordering now to avoid stockouts during high season.   ||
|             |  |                                                                                  ||
|             |  |  [Create All Purchase Orders]  [Configure Alerts]  [Export to CSV]              ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Create PO Modal - Desktop

```
+======================================================================================================+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  | CREATE PURCHASE ORDER                                                                     [X] |  |
|  +================================================================================================+  |
|  |                                                                                                |  |
|  |  +-- PRODUCT INFO ------------------------------------------+  +-- ORDER DETAILS -----------+ |  |
|  |  |                                                         |  |                             | |  |
|  |  |  Product: 10kWh LiFePO4 Battery                                |  |  Quantity *                 | |  |
|  |  |  SKU: BAT-LFP-10KWH                                            |  |  +------------------------+ | |  |
|  |  |  Type: LiFePO4 Battery System                           |  |  |  50 (MOQ minimum)      | | |  |
|  |  |                                                         |  |  +------------------------+ | |  |
|  |  |  Current Stock: 3 units                                 |  |  Suggested: 50 units        | |  |
|  |  |  Reorder Point: 25 units                                |  |  (BYD minimum order)        | |  |
|  |  |  Suggested Order Qty: 50 units                          |  |                             | |  |
|  |  |                                                         |  |  Unit Cost *                | |  |
|  |  |  Storage Requirements:                                  |  |  +------------------------+ | |  |
|  |  |  - Temperature: 10-35°C                                 |  |  |  AUD $1,125.00         | | |  |
|  |  |  - Charge level: 30-50% for storage                     |  |  +------------------------+ | |  |
|  |  |  - Humidity: <85% RH                                    |  |  Last: $1,125.00            | |  |
|  |  |  - Hazmat: UN3481 Class 9                               |  |                             | |  |
|  |  |                                                         |  |  Shipping Method:           | |  |
|  |  |  Last Ordered: 2 weeks ago                              |  |  ( ) Sea Freight (6wks)     | |  |
|  |  |  Avg Lead Time: 6 weeks                                 |  |  (o) Air Freight (1-2wks)   | |  |
|  |  |                                                         |  |      +$500 premium          | |  |
|  |  +----------------------------------------------------------+  |                             | |  |
|  |                                                                 |  Total: AUD $56,750.00     | |  |
|  |  +-- SUPPLIER -----------------------------------------------+ |  (ex GST)                  | |  |
|  |  |                                                           | +-----------------------------+ |  |
|  |  |  Preferred Supplier:                                      |                                |  |
|  |  |  +-----------------------------------------------------+  |  +-- DELIVERY -------------+ |  |
|  |  |  | [v] BYD (Shenzhen, China)                           |  |  |                          | |  |
|  |  |  +-----------------------------------------------------+  |  |  Expected Date *         | |  |
|  |  |                                                           |  |  +--------------------+  | |  |
|  |  |  Contact: apac@byd.com                                    |  |  | [cal] 24/02/2026   |  | |  |
|  |  |  Phone: +86 755 8988 8888                                 |  |  +--------------------+  | |  |
|  |  |  Lead Time: 6 weeks (sea), 1-2 weeks (air)                |  |  ↑ 6 weeks + buffer     | |  |
|  |  |  Minimum Order Qty: 50 units                              |  |                          | |  |
|  |  |                                                           |  |  Notes                   | |  |
|  |  |  Hazmat Shipping: UN3481 Class 9 certified                |  |  +--------------------+  | |  |
|  |  |                                                           |  |  | Summer demand prep |  | |  |
|  |  +-----------------------------------------------------------+  |  | Store 30-50% charge|  | |  |
|  |                                                                  |  +--------------------+  | |  |
|  |                                                                  +----------------------------+ |  |
|  |                                                                                                |  |
|  +------------------------------------------------------------------------------------------------+  |
|  |                                                                                                |  |
|  |                                             ( Cancel )   [ Create Purchase Order ]             |  |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
LOW STOCK WIDGET LOADING:
+-------------------------------------+
| LOW STOCK ALERTS             [...]  |
| =================================== |
|                                     |
| +----------------------------------+|
| | [............................] |||
| | [..............] [...........]  ||
| | [Fetching supplier lead times...] ||
| +----------------------------------+|
|                                     |
| +----------------------------------+|
| | [............................] |||
| | [..............] [...........]  ||
| +----------------------------------+|
|                                     |
+-------------------------------------+
↑ Skeleton with shimmer animation

CREATE PO PROCESSING:
+------------------------------------+
|                                    |
|   Creating Purchase Order...       |
|   +----------------------------+   |
|   | [==========          ] 50% |   |
|   +----------------------------+   |
|                                    |
|   Validating supplier lead time... |
|   Checking MOQ requirements...     |
|   Calculating delivery date...     |
|                                    |
+------------------------------------+
```

### Empty States

```
NO LOW STOCK ITEMS:
+-------------------------------------+
| LOW STOCK ALERTS                    |
| =================================== |
|                                     |
|           +-------------+           |
|           |   [check]   |           |
|           +-------------+           |
|                                     |
|      All Stock Levels Healthy       |
|                                     |
|   No products are below their       |
|   reorder points. All battery       |
|   systems adequately stocked for    |
|   current demand levels.            |
|                                     |
|   [View Inventory Report]           |
|                                     |
+-------------------------------------+

NO REORDER POINT SET:
+-------------------------------------+
| [!] Warning                         |
|                                     |
| This product has no reorder point   |
| configured. Set one to enable       |
| automatic low stock alerts.         |
|                                     |
| Battery products should include:    |
| - Lead time consideration (4-8wks)  |
| - MOQ from supplier                 |
| - Seasonal demand buffer            |
|                                     |
| [Configure Reorder Point]           |
+-------------------------------------+
```

### Error States

```
FAILED TO LOAD ALERTS:
+-------------------------------------+
| LOW STOCK ALERTS             [!]    |
| =================================== |
|                                     |
|   Couldn't load stock alerts        |
|                                     |
|   Check your connection and         |
|   try again.                        |
|                                     |
|   [Retry]                           |
|                                     |
+-------------------------------------+

CREATE PO FAILED:
+-------------------------------------+
| [!] Failed to Create PO             |
|                                     |
| Could not create purchase order     |
| for 10kWh LiFePO4 Battery.                 |
|                                     |
| Error: Below minimum order quantity |
| BYD requires minimum 50 units.      |
| Current suggested: 25 units         |
|                                     |
| [Adjust Quantity]  [Try Again]      |
+-------------------------------------+

LEAD TIME WARNING:
+-------------------------------------+
| [!] Extended Lead Time              |
|                                     |
| BYD China currently has 8-10 week   |
| lead times due to port congestion.  |
|                                     |
| Consider:                           |
| - Air freight (+$500, 1-2 weeks)    |
| - Alternative supplier (Pylontech)  |
| - Order larger quantity now         |
|                                     |
| [View Alternatives]  [Continue]     |
+-------------------------------------+
```

### Success States

```
PO CREATED:
+-------------------------------------+
| [ok] Purchase Order Created         |
|                                     |
| PO-2026-0042 created for            |
| 50x 10kWh LiFePO4 Battery                  |
|                                     |
| Supplier: BYD (Shenzhen, China)     |
| Total: AUD $56,750.00 (ex GST)      |
| Shipping: Sea Freight (6 weeks)     |
| Expected: 24/02/2026                |
|                                     |
| Storage reminder: 30-50% charge,    |
| 10-35°C temperature                 |
|                                     |
| [View PO]  [Create Another]         |
+-------------------------------------+

ALL POs CREATED:
+-------------------------------------+
| [ok] 5 Purchase Orders Created      |
|                                     |
| Successfully created POs for all    |
| low stock battery items.            |
|                                     |
| Total Value: AUD $94,750.00         |
| Suppliers: BYD, Pylontech, LG       |
| Average Lead Time: 6 weeks          |
|                                     |
| Next steps:                         |
| - Confirm hazmat shipping           |
| - Prepare bonded warehouse space    |
| - Schedule SoH inspections          |
|                                     |
| [View All POs]  [Done]              |
+-------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Low Stock Widget**
   - Tab to widget header
   - Tab through each product row
   - Tab to Create PO button per row
   - Tab to View All link
   - Tab to Create All POs button

2. **Alert Banner**
   - Focus on banner container
   - Tab through action buttons
   - Tab to dismiss link

3. **Create PO Dialog**
   - Focus trapped in dialog
   - Tab through: Quantity, Unit Cost, Supplier, Shipping Method, Date, Notes
   - Tab to Cancel, then Create
   - Escape closes dialog

### ARIA Requirements

```html
<!-- Low Stock Widget -->
<section
  role="region"
  aria-labelledby="low-stock-title"
  aria-live="polite"
>
  <h2 id="low-stock-title">Low Stock Alerts - Battery Systems</h2>
  <span aria-live="assertive">5 items require action</span>
</section>

<!-- Alert Banner -->
<div
  role="alert"
  aria-labelledby="alert-title"
>
  <h3 id="alert-title">Reorder Alert - Long Lead Times</h3>
  <p>5 products below reorder point. China suppliers have 4-8 week lead times.</p>
  <button aria-label="Create purchase orders for all low stock battery items">
    Create All POs
  </button>
  <button aria-label="Dismiss alert for 24 hours">
    Dismiss
  </button>
</div>

<!-- Create PO Button -->
<button
  aria-label="Create purchase order for 10kWh LiFePO4 Battery, 3 in stock, reorder point 25, BYD supplier with 6 week lead time"
>
  + Create PO
</button>

<!-- Create PO Modal -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="create-po-title"
>
  <h2 id="create-po-title">Create Purchase Order - Battery System</h2>
</div>
```

### Screen Reader Announcements

- Widget load: "Low stock alerts loaded, 5 battery items require action with extended lead times"
- Alert dismissed: "Alert dismissed for 24 hours"
- PO creation started: "Creating purchase order for 10kWh LiFePO4 Battery from BYD China, 6 week lead time"
- PO created: "Purchase order PO-2026-0042 created successfully for 50 units, expected delivery 24 February 2026"
- All POs created: "5 purchase orders created for battery suppliers, total value $94,750 Australian dollars"
- Error: "Failed to create purchase order, quantity below minimum order requirement of 50 units from BYD"
- Lead time warning: "Extended lead time alert: BYD China currently 8-10 weeks due to port congestion"

---

## Animation Choreography

### Widget Entry

```
DASHBOARD LOAD:
- Duration: 400ms total
- Stagger: 100ms between cards
- Easing: ease-out
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1

ALERT COUNT BADGE:
- Duration: 300ms
- Delay: 200ms after widget
- Scale: 0 -> 1.1 -> 1
- Background: pulse twice (red for critical)

LEAD TIME INDICATOR:
- Duration: 200ms
- Fade in after product name
- Color: orange for extended lead times
```

### Alert Banner

```
APPEAR (slide down):
- Duration: 350ms
- Easing: ease-out
- Transform: translateY(-100%) -> translateY(0)
- Opacity: 0 -> 1
- Height: 0 -> auto

DISMISS (slide up):
- Duration: 250ms
- Easing: ease-in
- Transform: translateY(0) -> translateY(-100%)
- Opacity: 1 -> 0
```

### Create PO Button

```
HOVER:
- Duration: 150ms
- Background: primary -> primary-dark
- Transform: scale(1) -> scale(1.02)

CLICK:
- Duration: 100ms
- Transform: scale(1) -> scale(0.98) -> scale(1)

LOADING:
- Spinner fade in: 150ms
- Button text: "Create PO" -> "Creating..."
- Pulse animation on button
```

### Create PO Modal

```
OPEN:
- Duration: 300ms
- Backdrop: opacity 0 -> 0.5 (200ms)
- Modal: scale(0.95) -> scale(1)
- Modal: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1

CLOSE:
- Duration: 200ms
- Modal: scale(1) -> scale(0.95)
- Opacity: 1 -> 0
- Backdrop: opacity 0.5 -> 0 (last)
```

### Success State

```
PO CREATED:
- Duration: 400ms
- Checkmark: scale(0) -> scale(1.2) -> scale(1)
- Card highlight: green flash (200ms)
- Row update: stock badge animates color change
- Toast: slide up from bottom (300ms)
```

---

## Component Props Interfaces

```typescript
// Low Stock Widget
interface LowStockWidgetProps {
  /** Maximum items to display before "View All" */
  maxItems?: number;
  /** Show quick action buttons */
  showActions?: boolean;
  /** Callback when Create PO is clicked */
  onCreatePO?: (productId: string) => void;
  /** Callback when Create All POs is clicked */
  onCreateAllPOs?: (productIds: string[]) => void;
  /** Custom empty state content */
  emptyContent?: React.ReactNode;
  /** Widget variant */
  variant?: 'dashboard' | 'compact' | 'detailed';
  /** Show supplier lead times */
  showLeadTimes?: boolean;
  /** Highlight seasonal demand warnings */
  showSeasonalAlerts?: boolean;
}

interface LowStockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  supplierCountry?: string;
  leadTimeDays?: number;
  leadTimeWeeks?: number;
  minimumOrderQty?: number;
  lastOrderedAt?: Date;
  avgLeadTimeDays?: number;
  unitCost?: number;
  // Battery-specific fields
  hazmatClass?: string; // e.g., "UN3481"
  storageTemp?: string; // e.g., "10-35°C"
  storageCharge?: string; // e.g., "30-50%"
  seasonalDemand?: 'high' | 'medium' | 'low';
  warrantBufferPct?: number; // Percentage for warranty replacements
}

// Alert Banner
interface InventoryAlertBannerProps {
  /** Alert items to display */
  alerts: LowStockItem[];
  /** Show product chips inline */
  showProductChips?: boolean;
  /** Max chips before "+N more" */
  maxChips?: number;
  /** Callback when dismissed */
  onDismiss?: (durationHours: number) => void;
  /** Callback when action taken */
  onAction?: (action: 'create-all' | 'review' | 'configure') => void;
  /** Allow permanent dismiss */
  allowPermanentDismiss?: boolean;
  /** Variant */
  variant?: 'warning' | 'critical' | 'info';
  /** Show seasonal context */
  showSeasonalContext?: boolean;
  /** Show lead time warnings */
  showLeadTimeWarnings?: boolean;
}

// Create PO Dialog
interface CreatePODialogProps {
  /** Product to create PO for */
  product: LowStockItem;
  /** Open state */
  open: boolean;
  /** Callback to close */
  onClose: () => void;
  /** Callback on successful creation */
  onSuccess?: (poId: string) => void;
  /** Prefill supplier */
  defaultSupplierId?: string;
  /** Prefill quantity (defaults to reorderQty or MOQ) */
  defaultQuantity?: number;
  /** Allow editing locked fields */
  allowEdits?: boolean;
  /** Show shipping method options */
  showShippingOptions?: boolean;
  /** Show hazmat compliance warnings */
  showHazmatWarnings?: boolean;
  /** Show storage requirement notes */
  showStorageNotes?: boolean;
}

interface CreatePOFormValues {
  productId: string;
  supplierId: string;
  quantity: number;
  unitCost: number;
  shippingMethod?: 'sea' | 'air';
  shippingCost?: number;
  expectedDeliveryDate: Date;
  notes?: string;
  // Battery-specific
  storageInstructions?: string;
  hazmatCompliance?: boolean;
}

// Create PO Quick Action
interface CreatePOQuickActionProps {
  /** Product info */
  product: LowStockItem;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Show full text or icon only */
  iconOnly?: boolean;
  /** Callback on success */
  onSuccess?: (poId: string) => void;
  /** Show lead time in tooltip */
  showLeadTime?: boolean;
  /** Show MOQ warning if below minimum */
  showMOQWarning?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/dashboard/widgets/low-stock-widget.tsx` | Enhanced low stock widget with Create PO action |
| `src/components/domain/inventory/inventory-alerts-banner.tsx` | Alert banner for inventory list header |
| `src/components/domain/inventory/create-po-dialog.tsx` | Quick PO creation modal |
| `src/components/domain/inventory/create-po-quick-action.tsx` | Button component for inline PO creation |
| `src/routes/_authed/inventory/index.tsx` | Integration point for alert banner |
| `src/routes/_authed/dashboard.tsx` | Integration point for widget |

---

## Design References

- **Color Palette**: Warning orange (#F97316) for low stock, Critical red (#EF4444) for stockout risk, success green (#22C55E) for healthy
- **Badge Style**: Rounded pill with count, pulse animation for urgency
- **Lead Time Indicator**: Small badge showing weeks, color-coded by urgency
- **MOQ Warning**: Subtle yellow background when quantity below minimum
- **Supplier Flag**: Small country flag icon next to supplier name
- **Card Style**: Subtle shadow, left border accent for status
- **Button Style**: Primary for main CTA, ghost for secondary actions
- **Seasonal Alert**: Sun icon with "Summer demand" note in orange
