# Wireframe: DOM-PROD-001c - Price Tiers: UI

## Story Reference

- **Story ID**: DOM-PROD-001c
- **Name**: Price Tiers: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

Price tier editor component on product detail page enabling volume discount configuration. Includes quantity threshold management, customer-specific pricing display, and resolved price preview in quotes/orders.

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
- **Industry**: Australian B2B battery/renewable energy systems
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Product Focus**: Battery Energy Storage Systems (BESS), Solar Inverters, Solar Panels, Mounting Systems
- **Price Tiers**: Small jobs (1-5 systems), Medium projects (6-20), Large developments (20+), Government/Utility contracts

---

## UI Patterns (Reference Implementation)

### DataGrid - Price Tier Table
**Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`

**Usage**: Price tier list display with sortable columns and inline editing
- **Columns**: Minimum Quantity, Tier Price, Discount %, Actions
- **Features**:
  - Sortable by quantity/price
  - Inline edit mode with validation
  - Row actions (edit, delete)
  - Empty state with "Add First Tier" CTA
  - Conditional formatting (discount % color-coded: green for >10%, yellow for 5-10%)

**Implementation Notes**:
```typescript
<DataGrid
  columns={[
    { key: 'minQuantity', title: 'Minimum Quantity', sortable: true },
    { key: 'price', title: 'Price', format: 'currency' },
    { key: 'discount', title: 'Discount', format: 'percentage', colorCode: true },
    { key: 'actions', title: 'Actions', width: 100 }
  ]}
  data={priceTiers}
  emptyState={<EmptyTiersState />}
  onSort={handleSort}
  enableInlineEdit
/>
```

### Dialog - Add/Edit Tier Modal
**Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`

**Usage**: Modal for adding/editing price tiers
- **Features**:
  - Auto-calculation of discount percentage from base price
  - Real-time preview card showing savings
  - Quantity validation (no overlaps with existing tiers)
  - Auto-suggest tier names based on quantity ranges (1-5: "Small", 6-20: "Medium", 20+: "Large")
  - Keyboard shortcuts (Cmd+S to save, Escape to cancel)

**Implementation Notes**:
```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Volume Price Tier</DialogTitle>
    </DialogHeader>
    <TierForm
      basePrice={product.price}
      existingTiers={tiers}
      onSubmit={handleSubmit}
    />
    <TierPreviewCard
      basePrice={basePrice}
      tierPrice={formData.price}
      quantity={formData.minQuantity}
    />
  </DialogContent>
</Dialog>
```

### Badge - Price Source Indicator
**Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`

**Usage**: Display price resolution source in quotes/orders
- **Variants**:
  - `customer` (blue): Customer-specific price applied
  - `tier` (green): Volume tier discount applied
  - `base` (gray): Standard base price
- **Features**:
  - Hover tooltip shows full breakdown
  - Savings amount highlighted
  - Click to expand detailed calculation

**Implementation Notes**:
```typescript
<Badge variant={priceSource} className="price-source-badge">
  {priceSource === 'customer' && 'Customer Price'}
  {priceSource === 'tier' && `Qty ${tierQuantity}+ Tier`}
  {priceSource === 'base' && 'Base Price'}
</Badge>
```

### ComboBox - Customer Selector for Price Preview
**Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`

**Usage**: Customer selection dropdown in price preview calculator
- **Features**:
  - Search/filter customers by name
  - Show customer-specific prices when available
  - Recent customers prioritized
  - Clear selection to test base/tier pricing only

**Implementation Notes**:
```typescript
<Command>
  <CommandInput placeholder="Search customers..." />
  <CommandList>
    <CommandEmpty>No customers found.</CommandEmpty>
    <CommandGroup heading="Recent Customers">
      {recentCustomers.map(customer => (
        <CommandItem
          key={customer.id}
          onSelect={() => setSelectedCustomer(customer)}
        >
          {customer.name}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>
```

---

## Mobile Wireframe (375px)

### Price Tier Editor (Product Detail - Collapsed)

```
+========================================+
| <- Products                            |
+========================================+
|                                        |
|  Tesla Powerwall 2 (13.5kWh)           |
|  SKU: BAT-TES-PW2                      |
|  --------------------------------      |
|  Base Price: $13,500.00                |
|  Cost: $10,200.00                      |
|                                        |
|  [Overview] [Pricing] [Stock]          |
|              ^active                   |
|                                        |
+========================================+
|                                        |
|  PRICING                               |
|  --------------------------------      |
|                                        |
|  Base Price                            |
|  [$][___13,500.00______]               |
|                                        |
|  --------------------------------      |
|                                        |
|  Volume Discounts (3)            [v]   |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Qty 6+      $12,825   5.0% off   |  |
|  | (Medium Project Tier)            |  |
|  +----------------------------------+  |
|  | Qty 20+     $12,150   10.0% off  |  |
|  | (Large Development)              |  |
|  +----------------------------------+  |
|  | Qty 50+     $11,475   15.0% off  |  |
|  | (Utility Scale)                  |  |
|  +----------------------------------+  |
|                                        |
|  [+ Add Tier]                          |
|                                        |
+========================================+
```

### Add/Edit Price Tier (Bottom Sheet)

```
+========================================+
| Add Price Tier                    [X]  |
+========================================+
|                                        |
|  Minimum Quantity *                    |
|  [___6_________________]               |
|  Orders of this quantity or more       |
|                                        |
|  Tier Price *                          |
|  [$][___12,825.00_______]              |
|                                        |
|  Tier Name (optional)                  |
|  [Medium Project Tier__________]       |
|                                        |
|  --------------------------------      |
|                                        |
|  Preview                               |
|  +----------------------------------+  |
|  | Base: $13,500.00                 |  |
|  | Tier: $12,825.00                 |  |
|  | Savings: $675.00 (5.0%)          |  |
|  +----------------------------------+  |
|                                        |
|  [Cancel]              [Save Tier]     |
|                                        |
+========================================+
```

### Customer-Specific Price (Customer Detail)

```
+========================================+
| <- Customers                           |
+========================================+
|                                        |
|  Solar Solutions NSW                   |
|  contact@solarsolutions.com.au         |
|                                        |
|  [Overview] [Orders] [Prices]          |
|                         ^active        |
|                                        |
+========================================+
|                                        |
|  CUSTOM PRICING (8 products)           |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Tesla Powerwall 2 (13.5kWh)      |  |
|  | Base: $13,500.00                 |  |
|  | Customer: $12,500.00  7.4% off   |  |
|  |                         [Edit]   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Fronius Primo 5kW Inverter       |  |
|  | Base: $3,200.00                  |  |
|  | Customer: $2,900.00  9.4% off    |  |
|  |                         [Edit]   |  |
|  +----------------------------------+  |
|                                        |
|  [+ Add Product Price]                 |
|                                        |
+========================================+
```

### Quote Line Item - Resolved Price Display

```
+========================================+
| New Quote                         [X]  |
+========================================+
|                                        |
|  Customer: Solar Solutions NSW         |
|                                        |
|  --------------------------------      |
|  LINE ITEMS                            |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Tesla Powerwall 2          x 25  |  |
|  | $12,150.00 each (Qty 20+ tier)   |  |
|  | Subtotal: $303,750.00            |  |
|  |                                  |  |
|  | [i] Large development discount   |  |
|  |     Base: $13,500 -> $12,150     |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Fronius Primo 5kW           x 25 |  |
|  | $2,900.00 each (Customer price)  |  |
|  | Subtotal: $72,500.00             |  |
|  |                                  |  |
|  | [i] Customer pricing applied     |  |
|  |     Base: $3,200 -> $2,900       |  |
|  +----------------------------------+  |
|                                        |
|  --------------------------------      |
|  Subtotal: $376,250.00                 |
|  GST (10%): $37,625.00                 |
|  Total: $413,875.00                    |
|  Savings: $41,250.00                   |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Price Tier Editor (Product Detail Page)

```
+================================================================+
| <- Back to Products                                             |
+================================================================+
|                                                                 |
|  BYD Battery-Box Premium HVS 10.2kWh        [Edit] [Actions v]  |
|  SKU: BAT-BYD-HVS102 | Category: Battery Systems | Active      |
|  --------------------------------------------------------      |
|                                                                 |
|  [Overview] [Pricing] [Stock] [Specs] [Attributes]              |
|              ^active                                            |
|                                                                 |
+================================================================+
|                                                                 |
|  +------------------------+  +-------------------------------+  |
|  | BASE PRICING           |  | VOLUME DISCOUNTS              |  |
|  | --------------------   |  | ---------------------------   |  |
|  |                        |  |                               |  |
|  | Base Price             |  | Qty      Price     Discount   |  |
|  | [$][___10,900.00_]     |  | ----------------------------- |  |
|  |                        |  | 6+       $10,355   5.0%  [Ed] |  |
|  | Cost                   |  |          (Medium Project)     |  |
|  | [$][____8,200.00_]     |  | 20+      $9,810   10.0%  [Ed] |  |
|  |                        |  |          (Large Dev.)         |  |
|  | Margin: 24.8%          |  | 50+      $9,265   15.0%  [Ed] |  |
|  |                        |  |          (Utility Scale)      |  |
|  |                        |  | [+ Add Volume Tier]           |  |
|  +------------------------+  +-------------------------------+  |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | PRICE PREVIEW                                              |  |
|  | -------------------------------------------------------   |  |
|  |                                                            |  |
|  | Quantity:  [___25___] [v]    Customer: [None        v]    |  |
|  |                                                            |  |
|  | Resolved Price: $9,810.00 (Volume tier: 20+)               |  |
|  |                                                            |  |
|  | Price Resolution Order:                                    |  |
|  | 1. Customer-specific price (if set)                        |  |
|  | 2. Volume tier (based on quantity)                         |  |
|  | 3. Base price (fallback)                                   |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Add/Edit Price Tier Modal

```
+================================================================+
|                                                                 |
|  +----------------------------------------------------+        |
|  | Add Volume Price Tier                         [X]  |        |
|  +----------------------------------------------------+        |
|  |                                                    |        |
|  |  Tier Name                                         |        |
|  |  [Medium Project (6-20 units)_______________]      |        |
|  |                                                    |        |
|  |  Minimum Quantity *        Tier Price *            |        |
|  |  [___6_____________]       [$][___10,355.00__]     |        |
|  |                                                    |        |
|  |  ------------------------------------------------ |        |
|  |                                                    |        |
|  |  Preview Calculation                               |        |
|  |  +----------------------------------------------+  |        |
|  |  | Base Price:        $10,900.00                |  |        |
|  |  | Tier Price:        $10,355.00                |  |        |
|  |  | Discount:          $545.00 (5.0%)            |  |        |
|  |  |                                              |  |        |
|  |  | At Qty 6:          $62,130.00 total          |  |        |
|  |  | vs Base:           $65,400.00 total          |  |        |
|  |  | Customer Saves:    $3,270.00                 |  |        |
|  |  +----------------------------------------------+  |        |
|  |                                                    |        |
|  |                   [Cancel]    [Save Tier]          |        |
|  +----------------------------------------------------+        |
|                                                                 |
+================================================================+
```

### Customer Prices Tab

```
+================================================================+
| <- Back to Customers                                            |
+================================================================+
|                                                                 |
|  Green Energy Partners                    [Edit] [Actions v]    |
|  info@greenenergypartners.com.au | 02 9123 4567                |
|                                                                 |
|  [Overview] [Orders] [Quotes] [Prices] [Activity]               |
|                               ^active                           |
|                                                                 |
+================================================================+
|                                                                 |
|  CUSTOMER-SPECIFIC PRICING                    [+ Add Product]   |
|  --------------------------------------------------------      |
|                                                                 |
|  [Search products...________________________]                   |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                                                            |  |
|  | Product                    Base        Customer  Discount  |  |
|  | -------------------------------------------------------   |  |
|  | Tesla Powerwall 2       $13,500.00   $12,500.00   7.4% [Ed]|  |
|  | BYD HVS 10.2kWh        $10,900.00   $10,000.00   8.3% [Ed]|  |
|  | Fronius Primo 5kW       $3,200.00    $2,900.00   9.4% [Ed]|  |
|  | Enphase IQ8+ Micro Inv.   $385.00      $350.00   9.1% [Ed]|  |
|  |                                                            |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  Note: Customer prices override volume tiers                    |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Price Tier Editor (Product Detail Page - Full)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | <- Back to Products                                                   |
| ------  |                                                                       |
| Catalog | SolarEdge Energy Hub Inverter 10kW Three Phase    [Duplicate] [Edit] [v]|
|   All   | SKU: INV-SE-EH10K | Category: Hybrid Inverters | Status: Active     |
|   Cat.  | ---------------------------------------------------------------------  |
| Orders  |                                                                       |
| Custmrs | [Overview] [Pricing] [Stock] [Images] [Specifications] [Related]      |
| Reports |              ^active                                                  |
|         |                                                                       |
+=========+======================================================================+
|         |                                                                       |
|         | +---------------------------+  +----------------------------------+   |
|         | | BASE PRICING              |  | VOLUME DISCOUNTS                 |   |
|         | | -----------------------   |  | -------------------------------- |   |
|         | |                           |  |                                  |   |
|         | | Base Price *              |  | Tier    Min Qty   Price    Disc  |   |
|         | | [$][_____7,850.00_____]   |  | -------------------------------- |   |
|         | |                           |  | Small   1         $7,850   0%    |   |
|         | | Cost                      |  |         (1-5)     Base     [N/A] |   |
|         | | [$][_____5,900.00_____]   |  | Medium  6         $7,458   5.0%  |   |
|         | |                           |  |         (6-20)              [Ed]  |   |
|         | | Margin: 24.8%             |  | Large   20        $7,065   10.0% |   |
|         | | [========--------] visual |  |         (20+)               [Ed]  |   |
|         | |                           |  | Utility 50        $6,673   15.0% |   |
|         | +---------------------------+  |         (50+)               [Ed]  |   |
|         |                                |                                  |   |
|         |                                | [+ Add Volume Tier]              |   |
|         |                                +----------------------------------+   |
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | | PRICE PREVIEW & TESTING                                            ||
|         | | ------------------------------------------------------------------ ||
|         | |                                                                    ||
|         | | Test price resolution for different scenarios                      ||
|         | |                                                                    ||
|         | | Quantity:     Customer:               Resolved Price:              ||
|         | | [____25___]   [Solar Solutions NSW v] $6,800.00                    ||
|         | |                                       (Customer price)            ||
|         | |                                                                    ||
|         | | +----------------------------------------------------------------+ ||
|         | | | RESOLUTION BREAKDOWN                                           | ||
|         | | | ------------------------------------------------------------ | ||
|         | | |                                                                | ||
|         | | | 1. [*] Customer-specific: $6,800.00  <-- APPLIED               | ||
|         | | | 2. [ ] Volume tier 20+:   $7,065.00                            | ||
|         | | | 3. [ ] Base price:        $7,850.00                            | ||
|         | | |                                                                | ||
|         | | | Total for 25 units: $170,000.00                                | ||
|         | | | Savings vs base:    $26,250.00 (13.4%)                         | ||
|         | | +----------------------------------------------------------------+ ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
+=========+======================================================================+
```

### Customer Prices Management (Full Desktop)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | <- Back to Solar Solutions NSW                                        |
| ------  |                                                                       |
| Catalog | Solar Solutions NSW                     [New Order] [Edit] [Actions v]|
| Orders  | contact@solarsolutions.com.au | 1300 SOLAR | Priority Customer       |
| Custmrs | ---------------------------------------------------------------------  |
| Reports |                                                                       |
|         | [Overview] [Orders] [Quotes] [Prices] [Activity] [Documents]          |
|         |                              ^active                                  |
|         |                                                                       |
+=========+======================================================================+
|         |                                                                       |
|         | CUSTOMER-SPECIFIC PRICING                                             |
|         | -------------------------------------------------------------------   |
|         |                                                                       |
|         | Custom prices for this customer override volume tiers                 |
|         |                                                                       |
|         | [Search products...____________________]        [+ Add Product Price] |
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | |                                                                    ||
|         | | Product               SKU          Base      Custom    Discount   ||
|         | | ------------------------------------------------------------------ ||
|         | | Tesla Powerwall 2     BAT-TES-PW2  $13,500   $12,500   7.4%  [Ed] ||
|         | | BYD HVS 10.2kWh      BAT-BYD-HVS  $10,900   $10,000   8.3%  [Ed] ||
|         | | Fronius Primo 5kW     INV-FRO-P5K  $3,200    $2,900    9.4%  [Ed] ||
|         | | SolarEdge EH 10kW     INV-SE-EH10K $7,850    $6,800   13.4%  [Ed] ||
|         | | Enphase IQ8+ Micro    INV-ENP-IQ8P $385      $350      9.1%  [Ed] ||
|         | |                                                                    ||
|         | | ------------------------------------------------------------------ ||
|         | | Total Products: 5                    Average Discount: 9.5%        ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
|         | +--------------------------------------------------------------------+|
|         | | PRICING NOTES                                                      ||
|         | | ------------------------------------------------------------------ ||
|         | | - Customer prices take priority over volume tiers                  ||
|         | | - Volume tiers still apply for products without custom prices      ||
|         | | - Changes apply immediately to new quotes/orders                   ||
|         | | - This customer qualifies for Large Development tier (20+ units)   ||
|         | +--------------------------------------------------------------------+|
|         |                                                                       |
+=========+======================================================================+
```

### Quote/Order - Resolved Price Display (Desktop)

```
+================================================================================+
| New Quote for Solar Solutions NSW                                        [X]  |
+================================================================================+
|                                                                                 |
|  Customer: Solar Solutions NSW             Quote #: Q-2026-0042                |
|  Contact: John Smith                       Date: 10/01/2026                    |
|                                                                                 |
+=== LINE ITEMS ==================================================================+
|                                                                                 |
|  [Search products...___________________________] [Add]                          |
|                                                                                 |
|  +----------------------------------------------------------------------------+ |
|  |                                                                            | |
|  | Product               Qty     Unit Price      Subtotal       Price Source | |
|  | -------------------------------------------------------------------------- | |
|  | Tesla Powerwall 2      25      $12,150.00     $303,750.00   [i] Vol: 20+  | |
|  |                               [$12,150.00]                  Saved: $33,750| |
|  |                                                                            | |
|  | SolarEdge EH 10kW      25      $6,800.00      $170,000.00   [i] Customer  | |
|  |                               [$6,800.00]                   Saved: $26,250| |
|  |                                                                            | |
|  | Enphase IQ8+ Micro     250     $350.00        $87,500.00    [i] Customer  | |
|  |                               [$350.00]                     Saved: $8,750 | |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  +--------------------------+  +-----------------------------------------------+|
|  | PRICING SUMMARY          |  |                                               ||
|  | ----------------------   |  | Subtotal (ex GST):     $561,250.00            ||
|  | Volume discounts: $33,750|  | GST (10%):             $56,125.00             ||
|  | Customer discounts:$35,000|  | --------------------------------------------- ||
|  | Total saved: $68,750     |  | TOTAL (inc GST):       $617,375.00            ||
|  +--------------------------+  +-----------------------------------------------+|
|                                                                                 |
|                                         [Cancel] [Save Draft] [Send Quote]      |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
PRICE TIERS LOADING:
+----------------------------------+
| VOLUME DISCOUNTS                 |
| -------------------------------- |
|                                  |
| [...........................]    |
| [...........................]    |
| [...........................]    |
|                                  |
| <- Skeleton shimmer animation    |
+----------------------------------+

PRICE RESOLUTION LOADING:
+----------------------------------+
| Resolved Price:                  |
| [spinner] Calculating...         |
+----------------------------------+

SAVING TIER:
+----------------------------------+
| Tier 1  6+  $12,825  [saving...] |
|              <- Pulse animation   |
+----------------------------------+
```

### Empty States

```
NO VOLUME TIERS:
+----------------------------------+
| VOLUME DISCOUNTS                 |
| -------------------------------- |
|                                  |
|     [chart icon]                 |
|                                  |
|   No volume tiers configured     |
|                                  |
|   Add tiers to offer discounts   |
|   for medium and large projects  |
|                                  |
|   [+ Add First Tier]             |
|                                  |
+----------------------------------+

NO CUSTOMER PRICES:
+----------------------------------+
| CUSTOMER-SPECIFIC PRICING        |
| -------------------------------- |
|                                  |
|     [price tag icon]             |
|                                  |
|   No custom prices set           |
|                                  |
|   Add special pricing for this   |
|   customer's frequent purchases  |
|                                  |
|   [+ Add Product Price]          |
|                                  |
+----------------------------------+
```

### Error States

```
FAILED TO LOAD TIERS:
+----------------------------------+
| [!] Unable to load price tiers   |
|                                  |
|     [Retry]                      |
+----------------------------------+

FAILED TO SAVE TIER:
+----------------------------------+
| [!] Failed to save price tier    |
|     The tier could not be saved. |
|     Please try again.            |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+

INVALID TIER (quantity overlap):
+----------------------------------+
| Minimum Quantity *               |
| [___6_____________]              |
| [!] A tier already exists for    |
|     quantity 6+                  |
+----------------------------------+
```

### Success States

```
TIER SAVED:
+----------------------------------+
| [checkmark] Price tier saved     |
| <- Toast 3s                      |
+----------------------------------+

TIER DELETED:
+----------------------------------+
| [checkmark] Tier removed         |
| <- Toast 3s                      |
+----------------------------------+

CUSTOMER PRICE SET:
+----------------------------------+
| [checkmark] Customer price saved |
|             for Tesla Powerwall 2|
| <- Toast 3s                      |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Price Tier Editor**
   - Tab to base price input
   - Tab to cost input
   - Tab through tier rows (each row focusable)
   - Tab to Edit/Delete buttons within each tier
   - Tab to "Add Tier" button
   - Tab to preview section controls

2. **Add Tier Modal**
   - Focus trapped in modal
   - Tab: Quantity input -> Price input -> Cancel -> Save
   - Escape closes modal
   - Enter submits form

3. **Customer Prices Tab**
   - Tab to search input
   - Tab to "Add Product" button
   - Tab through price rows
   - Tab to Edit/Delete buttons in each row

### ARIA Requirements

```html
<!-- Price Tier List -->
<section aria-labelledby="volume-tiers-heading">
  <h3 id="volume-tiers-heading">Volume Discounts</h3>
  <table role="table" aria-label="Volume price tiers">
    <thead>
      <tr>
        <th scope="col">Minimum Quantity</th>
        <th scope="col">Price</th>
        <th scope="col">Discount</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>6+</td>
        <td>$12,825.00</td>
        <td>5.0%</td>
        <td>
          <button aria-label="Edit tier for quantity 6+">Edit</button>
          <button aria-label="Delete tier for quantity 6+">Delete</button>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<!-- Price Preview -->
<div
  role="region"
  aria-labelledby="price-preview-heading"
  aria-live="polite"
>
  <h3 id="price-preview-heading">Price Preview</h3>
  <output aria-label="Resolved price: $12,150.00, Volume tier 20+ applied">
    $12,150.00
  </output>
</div>

<!-- Add Tier Modal -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="add-tier-title"
>
  <h2 id="add-tier-title">Add Volume Price Tier</h2>
  <!-- Form content -->
</dialog>

<!-- Quote Line Item Price Source -->
<span
  role="img"
  aria-label="Volume discount applied: Quantity 20+ tier, saved $33,750"
  tabindex="0"
>
  [i]
</span>
```

### Screen Reader Announcements

- Tier added: "Price tier added for quantity 6 and above at $12,825"
- Tier deleted: "Price tier for quantity 6+ has been removed"
- Price resolved: "Price calculated as $12,150 using volume tier 20+"
- Customer price set: "Custom price set to $12,500 for Solar Solutions NSW"
- Validation error: "Error: A tier already exists for this quantity"

---

## Animation Choreography

### Tier Row Operations

```
ADD TIER:
- Duration: 300ms
- Easing: ease-out
- New row: height 0 -> full, opacity 0 -> 1
- Existing rows shift down smoothly

DELETE TIER:
- Duration: 250ms
- Easing: ease-in
- Row: opacity 1 -> 0, height full -> 0
- Remaining rows shift up: 200ms ease-out

EDIT TIER (inline):
- Duration: 200ms
- Row background: subtle highlight pulse
- Input focus: border color transition
```

### Price Resolution Preview

```
CALCULATING:
- Spinner rotation: continuous
- Duration: until complete

RESULT UPDATE:
- Duration: 300ms
- Number: count animation (old -> new value)
- Source badge: fade in with slight scale (0.95 -> 1)

BREAKDOWN EXPAND:
- Duration: 250ms
- Easing: ease-out
- Height: 0 -> auto
- Opacity: 0 -> 1
```

### Modal Transitions

```
MODAL OPEN:
- Duration: 200ms
- Easing: ease-out
- Backdrop: opacity 0 -> 0.5
- Dialog: scale(0.95) -> scale(1), opacity 0 -> 1
- Transform-origin: center

MODAL CLOSE:
- Duration: 150ms
- Easing: ease-in
- Dialog: opacity 1 -> 0
- Backdrop: opacity 0.5 -> 0
```

### Quote Line Item Price Indicator

```
PRICE SOURCE TOOLTIP:
- Duration: 150ms
- Easing: ease-out
- Scale: 0.9 -> 1
- Opacity: 0 -> 1

SAVINGS HIGHLIGHT:
- Duration: 400ms on row hover
- Background: subtle emerald tint fade in
```

---

## Component Props Interfaces

```typescript
// Price Tier Editor
interface PriceTierEditorProps {
  productId: string;
  basePrice: number;
  tiers: PriceTier[];
  onTierAdd: (tier: CreatePriceTierInput) => Promise<void>;
  onTierUpdate: (id: string, tier: UpdatePriceTierInput) => Promise<void>;
  onTierDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

interface PriceTier {
  id: string;
  name?: string; // e.g., "Medium Project (6-20)"
  minQuantity: number;
  price: number;
  discountPercent: number; // Calculated from base price
}

interface CreatePriceTierInput {
  name?: string;
  minQuantity: number;
  price: number;
}

interface UpdatePriceTierInput {
  name?: string;
  minQuantity?: number;
  price?: number;
}

// Price Preview
interface PricePreviewProps {
  productId: string;
  basePrice: number;
  tiers: PriceTier[];
  onQuantityChange?: (qty: number) => void;
  onCustomerChange?: (customerId: string | null) => void;
}

interface ResolvedPrice {
  price: number;
  source: 'base' | 'tier' | 'customer';
  tierInfo?: { minQuantity: number; name?: string };
  customerName?: string;
  savingsAmount: number;
  savingsPercent: number;
}

// Customer Prices Tab
interface CustomerPricesTabProps {
  customerId: string;
  prices: CustomerProductPrice[];
  onPriceAdd: (input: SetCustomerPriceInput) => Promise<void>;
  onPriceUpdate: (productId: string, price: number) => Promise<void>;
  onPriceDelete: (productId: string) => Promise<void>;
  isLoading?: boolean;
}

interface CustomerProductPrice {
  productId: string;
  productName: string;
  productSku: string;
  basePrice: number;
  customerPrice: number;
  discountPercent: number;
}

interface SetCustomerPriceInput {
  productId: string;
  price: number;
}

// Quote Line Item with Price Resolution
interface QuoteLineItemProps {
  product: Product;
  quantity: number;
  resolvedPrice: ResolvedPrice;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
  showPriceBreakdown?: boolean;
}

// Add Tier Modal
interface AddTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tier: CreatePriceTierInput) => Promise<void>;
  basePrice: number;
  existingTiers: PriceTier[];
  editingTier?: PriceTier | null;
  isSubmitting?: boolean;
}

// Price Source Badge
interface PriceSourceBadgeProps {
  source: 'base' | 'tier' | 'customer';
  tierQuantity?: number;
  tierName?: string;
  customerName?: string;
  savingsAmount: number;
  savingsPercent: number;
  showTooltip?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/products/price-tier-editor.tsx` | Volume tier CRUD interface |
| `src/components/domain/products/price-tier-row.tsx` | Individual tier row component |
| `src/components/domain/products/add-tier-modal.tsx` | Modal for add/edit tier |
| `src/components/domain/products/price-preview.tsx` | Price resolution preview tool |
| `src/components/domain/customers/customer-prices-tab.tsx` | Customer-specific prices list |
| `src/components/domain/quotes/quote-line-item.tsx` | Line item with price source |
| `src/components/domain/products/price-source-badge.tsx` | Badge showing price origin |
| `src/routes/catalog/$productId.tsx` | Integration on product detail |

---

## Related Wireframes

- Product Detail Page (overview layout)
- Customer Detail Page (integration point)
- Quote Builder (resolved price display)
- Order Creation (price resolution in action)

---

**Document Version:** 1.1 - Added Renoz battery and renewable energy product attributes
**Created:** 2026-01-10
**Updated:** 2026-01-10
**Author:** UI Wireframe Generator
