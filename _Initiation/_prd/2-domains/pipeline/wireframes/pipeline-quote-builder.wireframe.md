# Quote Builder Wireframe
## DOM-PIPE-002, DOM-PIPE-003c: Quote PDF, Line Items, and Versioning

**Last Updated:** 2026-01-10
**Version:** v1.1 - Added Renoz battery/solar context
**PRD Reference:** pipeline.prd.json
**Stories:** DOM-PIPE-002, DOM-PIPE-003c

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities, opportunityItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-002, DOM-PIPE-003c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/solar manufacturer
- **Currency**: AUD
- **Quote Items**: Battery storage systems (LiFePO4), hybrid inverters, solar panels, installation services
- **Typical Deal Sizes**:
  - Residential: 5-20kWh storage ($5K-$20K AUD)
  - Commercial: 50-500kWh storage ($50K-$500K AUD)
  - Utility: 1-10MWh storage ($1M-$10M AUD)

---

## UI Patterns (Reference Implementation)

### Line Item Table
- **Pattern**: Editable data grid
- **Features**:
  - Inline editing for quantity, price
  - Product search autocomplete
  - Real-time total calculation
  - Drag to reorder line items

### Quote Summary
- **Pattern**: Sticky summary panel
- **Features**:
  - Subtotal, GST, Total with count-up animation
  - Margin indicator (color-coded)
  - CTA buttons fixed at bottom

---

## Overview

The Quote Builder is a comprehensive interface for creating and managing quotes with:
- Line item management (products/services)
- Automatic calculations (subtotal, tax, total)
- PDF generation and preview
- Version history tracking
- Quote validity management

---

## Desktop View (Full Quote Builder)

```
+================================================================================+
| Quote Builder - Brisbane Solar Co                                        [x]  |
+================================================================================+
|                                                                                 |
| +== Header ==================================================================+ |
| |                                                                            | |
| | [<- Back to Opportunity]                                                   | |
| |                                                                            | |
| | Quote #Q-2026-0042               Status: [Draft v]                         | |
| |                                                                            | |
| | Customer: Brisbane Solar Co      Contact: John Doe                         | |
| | Email: john@brisbanesolar.com.au Phone: (07) 5555 1234                     | |
| |                                                                            | |
| | Valid Until: [Jan 15, 2026 v]    [!] Expires in 30 days                    | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== Line Items (role="table") ===============================================+ |
| |                                                                            | |
| | +------------------------------------------------------------------------+ | |
| | | [=] | Product/Service        | Qty | Unit Price | Discount | Line Total| | |
| | +------------------------------------------------------------------------+ | |
| | | [=] | Solar Panel 400W x25   |  25 | $400.00    |   0%     | $10,000.00| | |
| | |     | SKU: SOLAR-400W-JINKO  |     |            |          |           | | |
| | |     | JinkoSolar Tiger Pro   |     |            |          |           | | |
| | |     | [Edit] [Remove]        |     |            |          |           | | |
| | +------------------------------------------------------------------------+ | |
| | | [=] | LiFePO4 Battery 10kWh  |  5  | $3,500.00  |  10%     | $15,750.00| | |
| | |     | SKU: BAT-LIFEPO4-10K   |     |            |          |           | | |
| | |     | Pylontech US5000       |     |            |          |           | | |
| | |     | [Edit] [Remove]        |     |            |          |           | | |
| | +------------------------------------------------------------------------+ | |
| | | [=] | Hybrid Inverter 8kW    |  2  | $3,000.00  |   0%     | $6,000.00 | | |
| | |     | SKU: INV-HYB-8KW       |     |            |          |           | | |
| | |     | Fronius Primo Hybrid   |     |            |          |           | | |
| | |     | [Edit] [Remove]        |     |            |          |           | | |
| | +------------------------------------------------------------------------+ | |
| | | [=] | Installation Kit       |  1  | $2,500.00  |   0%     | $2,500.00 | | |
| | |     | SKU: SVC-INST-KIT      |     |            |          |           | | |
| | |     | Mounting + Electrical  |     |            |          |           | | |
| | |     | [Edit] [Remove]        |     |            |          |           | | |
| | +------------------------------------------------------------------------+ | |
| | | [=] | Commissioning          |  1  | $1,500.00  |   0%     | $1,500.00 | | |
| | |     | SKU: SVC-COMMISSION    |     |            |          |           | | |
| | |     | System testing & cert  |     |            |          |           | | |
| | |     | [Edit] [Remove]        |     |            |          |           | | |
| | +------------------------------------------------------------------------+ | |
| |                                                                            | |
| | [+ Add Product]  [+ Add Custom Line]                                       | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== Product Search (when adding) ============================================+ |
| |                                                                            | |
| | Search Products: [Search by name or SKU...________________] [Search]       | |
| |                                                                            | |
| | +----------------------------------------------------------------------+   | |
| | | [x] Tesla Powerwall 2 (13.5kWh)    $14,500.00    In Stock (8)        |   | |
| | |     Integrated battery system with inverter                           |   | |
| | +----------------------------------------------------------------------+   | |
| | | [ ] BYD HVS 10.2 (10.2kWh)         $9,800.00     In Stock (15)       |   | |
| | |     High voltage battery system                                       |   | |
| | +----------------------------------------------------------------------+   | |
| | | [ ] SolarEdge Inverter 5kW         $2,200.00     In Stock (25)       |   | |
| | |     Solar inverter with DC optimizers                                 |   | |
| | +----------------------------------------------------------------------+   | |
| |                                                                            | |
| | [Cancel] [Add Selected (1)]                                                | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== Totals (aria-live="polite") =============================================+ |
| |                                                       +------------------+ | |
| |                                                       | Subtotal:        | | |
| |                                                       | $35,750.00       | | |
| |                                                       +------------------+ | |
| |                                                       | Discount:        | | |
| |   Notes:                                              | -$1,750.00       | | |
| |   +------------------------------------------------+  +------------------+ | |
| |   | 50kWh total storage capacity                   |  | Tax (10% GST):   | | |
| |   | Grid connection: Hybrid (on/off grid)          |  | $3,400.00        | | |
| |   | Free site assessment & 10yr warranty included  |  +------------------+ | |
| |   +------------------------------------------------+  | TOTAL:           | | |
| |                                                       | $37,400.00       | | |
| |                                                       +------------------+ | |
| +==========================================================================+ |
|                                                                                 |
| +== Actions =================================================================+ |
| |                                                                            | |
| | [Save Draft]  [Preview PDF]  [Generate PDF]  [Email Quote]                 | |
| |                                                                            | |
| | Version: v3 (Last saved 2 min ago)     [View Version History]              | |
| |                                                                            | |
| +==========================================================================+ |
+================================================================================+
```

---

## Line Item Editor (Inline)

### Editing a Line Item
```
+------------------------------------------------------------------------+
| [=] | Product/Service        | Qty | Unit Price | Discount | Line Total|
+------------------------------------------------------------------------+
| +================================================================+     |
| | EDITING: LiFePO4 Battery 10kWh                            [x]  |     |
| +================================================================+     |
| |                                                                |     |
| | Product: Pylontech US5000 - 10kWh LiFePO4                     |     |
| |                                                                |     |
| | Quantity:        Unit Price:       Discount:                   |     |
| | [5        ]      [$3,500.00  ]     [10   ]%                    |     |
| |                                                                |     |
| | Description (optional):                                        |     |
| | [Includes BMS, 10yr warranty, 6000 cycle lifespan          ]   |     |
| |                                                                |     |
| | Line Total: $15,750.00 (savings: $1,750.00)                    |     |
| |                                                                |     |
| | [Cancel]                              [Update Line Item]       |     |
| +================================================================+     |
+------------------------------------------------------------------------+
```

### Add Custom Line Item
```
+================================================================+
| Add Custom Line Item                                      [x]  |
+================================================================+
|                                                                |
| Description *                                                  |
| [Site-specific electrical upgrades...                      ]   |
|                                                                |
| Quantity *           Unit Price *        Discount              |
| [1        ]          [$_______1,200]     [0    ]%              |
|                                                                |
| SKU (optional)                                                 |
| [CUSTOM-ELEC-001   ]                                           |
|                                                                |
| Line Total: $1,200.00                                          |
|                                                                |
| [Cancel]                               [Add to Quote]          |
+================================================================+
```

---

## PDF Preview Modal

### Desktop PDF Preview
```
+================================================================================+
| Quote Preview                                                             [x]  |
+================================================================================+
|                                                                                 |
| +== Toolbar ================================================================+ |
| |                                                                            | |
| | [<- Previous Page] Page 1 of 2 [Next Page ->]                              | |
| |                                                                            | |
| | [Zoom: 100% v]  [Fit Width]  [Fit Page]                                    | |
| |                                                                            | |
| | [Download PDF]  [Email Quote]  [Print]                                     | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== PDF Content ============================================================+ |
| |                                                                            | |
| |  +--------------------------------------------------------------------+    | |
| |  |                                                                    |    | |
| |  |  [RENOZ LOGO]                          SOLAR & BATTERY SYSTEMS    |    | |
| |  |                                                                    |    | |
| |  |  QUOTE                                                             |    | |
| |  |  -----                                                             |    | |
| |  |                                                                    |    | |
| |  |  Quote #: Q-2026-0042              Date: January 10, 2026          |    | |
| |  |  Valid Until: February 10, 2026                                    |    | |
| |  |                                                                    |    | |
| |  |  TO:                               FROM:                           |    | |
| |  |  Brisbane Solar Co                 Renoz Energy                    |    | |
| |  |  John Doe                          123 Business Street             |    | |
| |  |  john@brisbanesolar.com.au         Sydney, NSW 2000                |    | |
| |  |                                    info@renoz.com.au               |    | |
| |  |                                                                    |    | |
| |  |  SYSTEM DETAILS:                                                   |    | |
| |  |  - Total Storage: 50kWh (LiFePO4)                                  |    | |
| |  |  - Solar Array: 10kW (25x 400W panels)                             |    | |
| |  |  - Inverter: 16kW hybrid (2x 8kW)                                  |    | |
| |  |  - Grid Type: Hybrid (on/off grid capable)                         |    | |
| |  |                                                                    |    | |
| |  |  ----------------------------------------------------------------  |    | |
| |  |  | Item                      | Qty | Price       | Total        |  |    | |
| |  |  ----------------------------------------------------------------  |    | |
| |  |  | Solar Panel 400W x25      |  25 | $400.00     | $10,000.00   |  |    | |
| |  |  |   (JinkoSolar Tiger Pro)  |     |             |              |  |    | |
| |  |  | LiFePO4 Battery 10kWh x5  |   5 | $3,500.00   | $15,750.00   |  |    | |
| |  |  |   (Pylontech US5000)      |     |             | (10% disc)   |  |    | |
| |  |  | Hybrid Inverter 8kW x2    |   2 | $3,000.00   | $6,000.00    |  |    | |
| |  |  |   (Fronius Primo Hybrid)  |     |             |              |  |    | |
| |  |  | Installation Kit          |   1 | $2,500.00   | $2,500.00    |  |    | |
| |  |  | Commissioning & Testing   |   1 | $1,500.00   | $1,500.00    |  |    | |
| |  |  ----------------------------------------------------------------  |    | |
| |  |                                                                    |    | |
| |  |                                    Subtotal:      $35,750.00       |    | |
| |  |                                    Discount:       -$1,750.00      |    | |
| |  |                                    GST (10%):      $3,400.00       |    | |
| |  |                                    ----------------------          |    | |
| |  |                                    TOTAL:         $37,400.00       |    | |
| |  |                                                                    |    | |
| |  |  WARRANTY & SERVICE:                                               |    | |
| |  |  - 10-year product warranty on all batteries                       |    | |
| |  |  - 25-year performance warranty on solar panels                    |    | |
| |  |  - 5-year workmanship warranty                                     |    | |
| |  |                                                                    |    | |
| |  |  Terms & Conditions:                                               |    | |
| |  |  - Payment: 50% deposit, 50% on completion                         |    | |
| |  |  - Quote valid for 30 days                                         |    | |
| |  |  - Installation timeline: 4-6 weeks after deposit                  |    | |
| |  |                                                                    |    | |
| |  +--------------------------------------------------------------------+    | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
+================================================================================+
```

---

## Version History Panel

### Version History List
```
+================================================================+
| Version History                                           [x]  |
+================================================================+
|                                                                |
| Current Version: v3                                            |
|                                                                |
| +------------------------------------------------------------+ |
| | v3 (Current)                           Jan 10, 2026 2:30pm | |
| | Created by: Sarah Smith                                    | |
| | Total: $37,400.00                                          | |
| | Notes: Added battery bundle discount                       | |
| | [View] [Compare]                                           | |
| +------------------------------------------------------------+ |
| | v2                                     Jan 9, 2026 4:15pm  | |
| | Created by: Sarah Smith                                    | |
| | Total: $39,150.00                                          | |
| | Notes: Increased battery count from 3 to 5 units          | |
| | [View] [Compare] [Restore]                                 | |
| +------------------------------------------------------------+ |
| | v1                                     Jan 8, 2026 10:00am | |
| | Created by: John Admin                                     | |
| | Total: $22,950.00                                          | |
| | Notes: Initial quote (3x batteries, 1x inverter)           | |
| | [View] [Compare] [Restore]                                 | |
| +------------------------------------------------------------+ |
|                                                                |
+================================================================+
```

### Version Comparison (Side-by-Side Diff)
```
+================================================================================+
| Compare Versions: v2 vs v3                                                [x]  |
+================================================================================+
|                                                                                 |
| +== v2 (Jan 9) ============================+ +== v3 (Jan 10) Current ========+ |
| |                                          | |                               | |
| | Line Items:                              | | Line Items:                   | |
| |                                          | |                               | |
| | Solar Panel 400W x25                     | | Solar Panel 400W x25          | |
| |   25 x $400.00 = $10,000.00              | |   25 x $400.00 = $10,000.00   | |
| |                                          | |                               | |
| | LiFePO4 Battery 10kWh x5                 | | LiFePO4 Battery 10kWh x5      | |
| |   5 x $3,500.00 = $17,500.00             | |   5 x $3,500.00 = $15,750.00  | |
| | [-] No discount                          | | [+] 10% discount applied      | |
| |                                          | |     (CHANGED)                 | |
| |                                          | |                               | |
| | Hybrid Inverter 8kW x2                   | | Hybrid Inverter 8kW x2        | |
| |   2 x $3,000.00 = $6,000.00              | |   2 x $3,000.00 = $6,000.00   | |
| |                                          | |                               | |
| | Installation Kit                         | | Installation Kit              | |
| |   1 x $2,500.00 = $2,500.00              | |   1 x $2,500.00 = $2,500.00   | |
| |                                          | |                               | |
| | Commissioning & Testing                  | | Commissioning & Testing       | |
| |   1 x $1,500.00 = $1,500.00              | |   1 x $1,500.00 = $1,500.00   | |
| +------------------------------------------+ +-------------------------------+ |
| |                                          | |                               | |
| | Subtotal: $37,500.00                     | | Subtotal: $35,750.00          | |
| | Tax (10%): $3,750.00                     | | Tax (10%): $3,400.00          | |
| | [-] TOTAL: $41,250.00                    | | [+] TOTAL: $37,400.00         | |
| |                                          | |     ($3,850.00 less)          | |
| +------------------------------------------+ +-------------------------------+ |
|                                                                                 |
| Legend: [+] Added  [-] Removed  (CHANGED) Modified                              |
|                                                                                 |
|                                              [Close] [Restore v2]               |
+================================================================================+
```

---

## Tablet View

```
+============================================+
| Quote Builder - Brisbane Solar      [x]    |
+============================================+
|                                            |
| Quote #Q-2026-0042      [Draft v]          |
| Valid Until: Feb 10, 2026                  |
|                                            |
| Customer: Brisbane Solar Co                |
| Contact: John Doe                          |
+============================================+
|                                            |
| === LINE ITEMS ===                         |
|                                            |
| +----------------------------------------+ |
| | Solar Panel 400W x25                   | |
| | 25 x $400.00              $10,000.00   | |
| | [Edit] [Remove]                        | |
| +----------------------------------------+ |
| | LiFePO4 Battery 10kWh x5 (10% off)     | |
| | 5 x $3,500.00              $15,750.00  | |
| | [Edit] [Remove]                        | |
| +----------------------------------------+ |
| | Hybrid Inverter 8kW x2                 | |
| | 2 x $3,000.00               $6,000.00  | |
| | [Edit] [Remove]                        | |
| +----------------------------------------+ |
| | Installation Kit                       | |
| | 1 x $2,500.00               $2,500.00  | |
| | [Edit] [Remove]                        | |
| +----------------------------------------+ |
| | Commissioning & Testing                | |
| | 1 x $1,500.00               $1,500.00  | |
| | [Edit] [Remove]                        | |
| +----------------------------------------+ |
|                                            |
| [+ Add Product] [+ Custom Line]            |
|                                            |
+============================================+
|                                            |
| +--------------------------------------+   |
| | Subtotal:           $35,750.00       |   |
| | Discount:            -$1,750.00      |   |
| | Tax (10%):           $3,400.00       |   |
| | TOTAL:              $37,400.00       |   |
| +--------------------------------------+   |
|                                            |
| [Save] [Preview] [Generate] [Email]        |
|                                            |
| v3 | [Version History]                     |
+============================================+
```

---

## Mobile View

```
+==============================+
| Quote Builder          [x]   |
+==============================+
|                              |
| Q-2026-0042     [Draft v]    |
| Brisbane Solar Co            |
| Expires: Feb 10              |
|                              |
+==============================+
|                              |
| LINE ITEMS (5)               |
|                              |
| +---------------------------+|
| | Solar Panel 400W x25      ||
| | 25 x $400 = $10,000       ||
| |          [Edit] [Remove]  ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | LiFePO4 Battery 10kWh x5  ||
| | 5 x $3,500 = $15,750      ||
| | 10% discount              ||
| |          [Edit] [Remove]  ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | Hybrid Inverter 8kW x2    ||
| | 2 x $3,000 = $6,000       ||
| |          [Edit] [Remove]  ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | Installation Kit          ||
| | 1 x $2,500 = $2,500       ||
| |          [Edit] [Remove]  ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | Commissioning & Testing   ||
| | 1 x $1,500 = $1,500       ||
| |          [Edit] [Remove]  ||
| +---------------------------+|
|                              |
| [+ Add Item]                 |
|                              |
+==============================+
|                              |
| Subtotal:      $35,750.00    |
| Discount:       -$1,750.00   |
| Tax (10%):      $3,400.00    |
| -------------------------    |
| TOTAL:         $37,400.00    |
|                              |
+==============================+
|                              |
| [Save Draft]                 |
| [Preview PDF]                |
| [Email Quote]                |
|                              |
| v3 - [History]               |
|                              |
+==============================+
```

### Mobile Product Search (Bottom Sheet)
```
+==============================+
| Add Product             [x]  |
+==============================+
|                              |
| [Search products...     ]    |
|                              |
| +---------------------------+|
| |[+] Tesla Powerwall 2      ||
| |    $14,500  In Stock      ||
| +---------------------------+|
| |[+] Pylontech US5000 10kWh ||
| |    $3,500   In Stock      ||
| +---------------------------+|
| |[+] BYD HVS 10.2           ||
| |    $9,800   In Stock      ||
| +---------------------------+|
| |[+] Fronius Primo 8kW      ||
| |    $3,000   In Stock      ||
| +---------------------------+|
|                              |
| [Cancel]                     |
+==============================+
  - Tap [+] to add immediately
  - No multi-select on mobile
```

---

## Loading States

### Quote Loading
```
+============================================+
| Quote Builder                         [x]  |
+============================================+
|                                            |
| [shimmer===================]               |
| [shimmer============]                      |
|                                            |
| +----------------------------------------+ |
| | [shimmer============================]  | |
| | [shimmer============] [shimmer=====]   | |
| +----------------------------------------+ |
| | [shimmer============================]  | |
| | [shimmer============] [shimmer=====]   | |
| +----------------------------------------+ |
|                                            |
+============================================+
```

### PDF Generating
```
+============================================+
| Generating PDF...                          |
+============================================+
|                                            |
|           [spinner]                        |
|                                            |
|    Preparing your quote PDF...             |
|                                            |
|    [============================] 75%      |
|                                            |
|    This may take a few seconds             |
|                                            |
+============================================+
  aria-busy="true"
  aria-label="Generating PDF, 75% complete"
```

### Version Restoring
```
+============================================+
| Restoring version v2...                    |
+============================================+
|                                            |
|           [spinner]                        |
|                                            |
|    Reverting to previous version...        |
|    This will create a new version (v4)     |
|                                            |
+============================================+
```

---

## Empty States

### No Line Items
```
+============================================+
|                                            |
| === LINE ITEMS ===                         |
|                                            |
| +----------------------------------------+ |
| |                                        | |
| |         [illustration]                 | |
| |                                        | |
| |     No items added to this quote       | |
| |                                        | |
| |  Add batteries, inverters, panels,     | |
| |  or services to build your quote.      | |
| |                                        | |
| |  [+ Add Product] [+ Custom Line]       | |
| |                                        | |
| +----------------------------------------+ |
|                                            |
+============================================+
```

### No Search Results
```
+============================================+
| Search Products                            |
+============================================+
| [diesel generator______________] [Search]  |
|                                            |
| +----------------------------------------+ |
| |                                        | |
| |         No products found              | |
| |                                        | |
| |    No battery/solar products match     | |
| |    "diesel generator"                  | |
| |                                        | |
| |    [Add Custom Line Item]              | |
| |                                        | |
| +----------------------------------------+ |
+============================================+
```

### No Version History
```
+============================================+
| Version History                            |
+============================================+
|                                            |
| +----------------------------------------+ |
| |                                        | |
| |    No versions yet                     | |
| |                                        | |
| |    Save your quote to create the       | |
| |    first version (v1).                 | |
| |                                        | |
| +----------------------------------------+ |
|                                            |
+============================================+
```

---

## Error States

### Failed to Add Product
```
+============================================+
| [!] Could not add product                  |
+============================================+
|                                            |
| Failed to add "Pylontech US5000 10kWh"     |
| to the quote.                              |
|                                            |
| This product may no longer be available.   |
|                                            |
| [Dismiss] [Try Again]                      |
+============================================+
  role="alert"
```

### PDF Generation Failed
```
+============================================+
| [!] PDF Generation Failed                  |
+============================================+
|                                            |
| We couldn't generate your quote PDF.       |
|                                            |
| Please check:                              |
| - All line items have valid prices         |
| - Customer information is complete         |
|                                            |
| [Cancel] [Retry]                           |
+============================================+
```

### Version Restore Failed
```
+============================================+
| [!] Restore Failed                         |
+============================================+
|                                            |
| Could not restore version v2.              |
|                                            |
| The quote may have been modified by        |
| another user. Please refresh and try       |
| again.                                     |
|                                            |
| [Dismiss] [Refresh Quote]                  |
+============================================+
```

---

## Accessibility Specification

### Line Items Table ARIA
```html
<table role="table" aria-label="Quote line items">
  <thead>
    <tr>
      <th scope="col">Reorder</th>
      <th scope="col">Product/Service</th>
      <th scope="col">Quantity</th>
      <th scope="col">Unit Price</th>
      <th scope="col">Discount</th>
      <th scope="col">Line Total</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="LiFePO4 Battery 10kWh, 5 units, $15,750 total">
      <!-- Row content -->
    </tr>
  </tbody>
</table>
```

### Totals Region ARIA
```html
<div role="region"
     aria-label="Quote totals"
     aria-live="polite">
  <dl>
    <dt>Subtotal</dt>
    <dd>$35,750.00</dd>
    <dt>Discount</dt>
    <dd>-$1,750.00</dd>
    <dt>Tax (10% GST)</dt>
    <dd>$3,400.00</dd>
    <dt>Total</dt>
    <dd><strong>$37,400.00</strong></dd>
  </dl>
</div>
```

### Keyboard Navigation
```
Tab Order:
1. Back button
2. Quote status dropdown
3. Validity date picker
4. First line item row
5. Line item actions (Edit, Remove)
6. Add Product button
7. Add Custom Line button
8. Notes textarea
9. Action buttons (Save, Preview, Generate, Email)
10. Version history link

Line Item Row:
- Tab to row, Enter to edit
- Tab to Edit button, Enter to open editor
- Tab to Remove button, Enter to confirm delete
- Drag handle: focus + Space to start drag, Arrow keys to reorder

Inline Editor:
- Tab through fields
- Enter to save
- Escape to cancel
```

### Screen Reader Announcements
```
On line item add:
  "LiFePO4 Battery 10kWh added to quote. Quantity 5, line total: $17,500.
   Quote total: $37,400"

On line item update:
  "LiFePO4 Battery 10kWh updated. 10% discount applied.
   New line total: $15,750. Quote total: $35,650"

On line item remove:
  "Installation Kit removed from quote. Quote total: $33,150"

On version restore:
  "Quote restored to version 2. New version 4 created.
   5 line items. Total: $39,150"

On PDF generate:
  "PDF generated successfully. Opening preview."
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quote load time | < 1s | Full quote with line items |
| Add line item | < 200ms | From click to row visible |
| Calculation update | < 100ms | After any value change |
| PDF generation | < 5s | For up to 50 line items |
| Version load | < 500ms | Single version details |
| Diff comparison | < 1s | Between any two versions |

---

## Related Wireframes

- [Pipeline Kanban Board](./pipeline-kanban-board.wireframe.md)
- [Quick Quote Dialog](./pipeline-quick-quote.wireframe.md)
- [Quote Validity Badge](./pipeline-quote-validity.wireframe.md)

---

**Document Version:** v1.1
**Created:** 2026-01-10
**Updated:** 2026-01-10 (Added Renoz battery/solar context)
**Author:** UI Skill
