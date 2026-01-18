# Quick Quote Creation Wireframe
## DOM-PIPE-008: Streamlined Quote Creation from Customer Context

**Last Updated:** 2026-01-10
**PRD Reference:** pipeline.prd.json
**Story:** DOM-PIPE-008

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-008 | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD
- **Quote Items**: Battery systems, inverters, installation services
- **Typical Deal Sizes**: Residential 5-20kWh ($5K-$20K), Commercial 50-500kWh ($50K-$500K)

---

## Overview

The Quick Quote Dialog enables rapid quote creation from customer context:
- Pre-filled customer and contact information
- Product search with autocomplete
- Live calculation of subtotal, tax, and total
- Save as draft or create opportunity immediately
- Optional AI product suggestions based on purchase history

## UI Patterns (Reference Implementation)

### Dialog (Quick Quote Modal)
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Full-width dialog for desktop with two-panel layout
  - Focus trap to contain keyboard navigation
  - Accessible modal with aria-modal and role="dialog"
  - Backdrop overlay with dismissible behavior

### Combobox (Product Search)
- **Pattern**: RE-UI Command
- **Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Autocomplete search with keyboard navigation (Arrow keys to select)
  - Search results list with role="combobox" and aria-expanded states
  - Recent searches and quick suggestions
  - Empty state for no results with helpful prompts

### Form (Quote Details)
- **Pattern**: RE-UI Form + Input + Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`, `input.tsx`, `select.tsx`
- **Features**:
  - Validated form fields with error states (aria-invalid)
  - Customer and contact pre-fill from context
  - Quantity controls with increment/decrement buttons
  - Live calculation display for totals (aria-live="polite")

### Sheet (Mobile Bottom Sheet)
- **Pattern**: RE-UI Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Stepped flow UI for mobile (3 steps: Customer → Products → Review)
  - Bottom sheet presentation with swipe-to-dismiss
  - Progress indicator showing current step
  - Compact product list optimized for small screens

---

## Desktop View (Wide Dialog)

```
+================================================================================+
| Quick Quote for Acme Corporation                                          [x]  |
+================================================================================+
|                                                                                 |
| +== Left Panel: Customer & Products ========================================+ |
| |                                                                            | |
| | CUSTOMER INFO (pre-filled)                                                 | |
| | +------------------------------------------------------------------------+ | |
| | | Customer: Acme Corporation                              [Change]       | | |
| | | Contact:  John Doe <john@acme.com>                      [Change]       | | |
| | | Phone:    (555) 123-4567                                               | | |
| | +------------------------------------------------------------------------+ | |
| |                                                                            | |
| | QUOTE DETAILS                                                              | |
| | +------------------------------------------------------------------------+ | |
| | | Quote Name: [New Quote for Acme Corporation____________]                | | |
| | | Valid Until: [Feb 10, 2026 v] (+30 days from today)                     | | |
| | +------------------------------------------------------------------------+ | |
| |                                                                            | |
| | +======================================================================+ | |
| | | SEARCH PRODUCTS                                      (role="combobox")| | |
| | +======================================================================+ | |
| | | [Search products by name or SKU...________________________] [Search] | | |
| | |                                                                      | | |
| | | +------------------------------------------------------------------+ | | |
| | | | SEARCH RESULTS                                                   | | | |
| | | +------------------------------------------------------------------+ | | |
| | | | [+] Website Design Package                   $5,000.00           | | | |
| | | |     Professional website design and development                  | | | |
| | | |     In Stock (15 available)                                      | | | |
| | | +------------------------------------------------------------------+ | | |
| | | | [+] SEO Optimization Monthly                 $1,500.00           | | | |
| | | |     Monthly SEO optimization service                             | | | |
| | | |     In Stock (unlimited)                                         | | | |
| | | +------------------------------------------------------------------+ | | |
| | | | [+] Content Writing (per article)           $200.00              | | | |
| | | |     Professional content creation                                | | | |
| | | +------------------------------------------------------------------+ | | |
| | |                                                                      | | |
| | +======================================================================+ | |
| |                                                                            | |
| | +======================================================================+ | |
| | | AI SUGGESTIONS (based on purchase history)                           | | |
| | +======================================================================+ | |
| | | Acme previously purchased:                                           | | |
| | | +------------------------------------------------------------------+ | | |
| | | | [+] Website Maintenance Plan                 $299/mo              | | | |
| | | |     Recommended - they bought hosting last year                  | | | |
| | | +------------------------------------------------------------------+ | | |
| | | | [+] Analytics Dashboard                     $499 setup           | | | |
| | | |     Commonly paired with their SEO package                       | | | |
| | | +------------------------------------------------------------------+ | | |
| | +======================================================================+ | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== Right Panel: Quote Items & Totals ======================================+ |
| |                                                                            | |
| | QUOTE ITEMS (3)                                                            | |
| | +------------------------------------------------------------------------+ | |
| | | Website Design Package                                         [x]    | | |
| | | Qty: [-] [1] [+]  x  $5,000.00  =  $5,000.00                          | | |
| | +------------------------------------------------------------------------+ | |
| | | SEO Optimization Monthly                                       [x]    | | |
| | | Qty: [-] [3] [+]  x  $1,500.00  =  $4,500.00                          | | |
| | | Discount: [10]%                    =  $4,050.00                        | | |
| | +------------------------------------------------------------------------+ | |
| | | Content Writing (per article)                                  [x]    | | |
| | | Qty: [-] [10] [+] x  $200.00    =  $2,000.00                          | | |
| | +------------------------------------------------------------------------+ | |
| |                                                                            | |
| | NOTES                                                                      | |
| | +------------------------------------------------------------------------+ | |
| | | [Add any notes for this quote...                                     ] | | |
| | +------------------------------------------------------------------------+ | |
| |                                                                            | |
| | +========================================================================+ | |
| | |                                                                        | | |
| | |                                          Subtotal:      $11,050.00     | | |
| | |                                          Discount:        -$450.00     | | |
| | |                                          Tax (10% GST):  $1,060.00     | | |
| | |                                          ─────────────────────────     | | |
| | |                                          TOTAL:         $11,660.00     | | |
| | |                                                                        | | |
| | +========================================================================+ | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| +== Footer =================================================================+ |
| |                                                                            | |
| | [Cancel]                           [Save as Draft] [Create Opportunity]    | |
| |                                                                            | |
| +==========================================================================+ |
+================================================================================+
```

---

## Product Search Component

### Search with Autocomplete
```
+========================================================================+
| [web___________________________]                            [Search]   |
+========================================================================+
| Recent Searches: [website] [seo] [hosting]                             |
+========================================================================+
|                                                                        |
| MATCHING PRODUCTS (3)                                                  |
|                                                                        |
| +--------------------------------------------------------------------+ |
| | [+] Website Design Package                           $5,000.00     | |
| |     SKU: WEB-DES-001                                               | |
| |     Professional website design and development                    | |
| |     [In Stock: 15]                                                 | |
| +--------------------------------------------------------------------+ |
| | [+] Website Maintenance Plan                         $299.00/mo    | |
| |     SKU: WEB-MNT-001                                               | |
| |     Monthly website maintenance and updates                        | |
| |     [In Stock: Unlimited]                                          | |
| +--------------------------------------------------------------------+ |
| | [+] Website Hosting (Annual)                         $499.00/yr    | |
| |     SKU: WEB-HST-001                                               | |
| |     Premium hosting with SSL certificate                           | |
| |     [In Stock: Unlimited]                                          | |
| +--------------------------------------------------------------------+ |
|                                                                        |
| Can't find what you need? [Add Custom Line Item]                       |
|                                                                        |
+========================================================================+
  aria-role="combobox"
  aria-expanded="true"
  aria-activedescendant="product-1"
```

### Product Added Confirmation
```
+--------------------------------------------------------------------+
| [check] Added to quote                                              |
|                                                                     |
| Website Design Package x 1                           $5,000.00      |
|                                                                     |
| [Add Another] [View Quote Items]                                    |
+--------------------------------------------------------------------+
  Appears briefly (3 seconds) then fades
  aria-live="polite"
```

---

## Add Custom Line Item (Inline)

```
+========================================================================+
| ADD CUSTOM LINE ITEM                                                   |
+========================================================================+
|                                                                        |
| Description *                                                          |
| [Custom consulting services________________________]                   |
|                                                                        |
| SKU (optional)      Quantity       Unit Price                          |
| [CUSTOM-001   ]     [1      ]      [$_______500]                       |
|                                                                        |
| Discount (%)                                                           |
| [0         ]                                                           |
|                                                                        |
| Line Total: $500.00                                                    |
|                                                                        |
| [Cancel]                                      [Add to Quote]           |
+========================================================================+
```

---

## Quote Item Row States

### Default Item
```
+------------------------------------------------------------------------+
| Website Design Package                                         [x]     |
| +------------+                                                         |
| | Qty: [-] [1] [+]  x  $5,000.00  =  $5,000.00                        |
| +------------+                                                         |
|                                                                        |
+------------------------------------------------------------------------+
```

### Item with Discount
```
+------------------------------------------------------------------------+
| SEO Optimization Monthly                                       [x]     |
| +------------+                                                         |
| | Qty: [-] [3] [+]  x  $1,500.00                                      |
| +------------+                                                         |
|                                                                        |
| Discount: [10___]%  ->  Line Total: $4,050.00                          |
|                        (was $4,500.00)                                 |
+------------------------------------------------------------------------+
  Strikethrough on original price
```

### Item Editing
```
+========================================================================+
| EDITING: Website Design Package                                   [x]  |
+========================================================================+
|                                                                        |
| Quantity:        Unit Price:         Discount:                         |
| [1        ]      [$5,000.00   ]      [0        ]%                      |
|                                                                        |
| Custom Description (optional):                                         |
| [Override the default description for this quote...              ]     |
|                                                                        |
| Line Total: $5,000.00                                                  |
|                                                                        |
| [Cancel]                                           [Update]            |
+========================================================================+
```

---

## Tablet View

```
+============================================+
| Quick Quote - Acme Corp              [x]   |
+============================================+
|                                            |
| Customer: Acme Corporation     [Change]    |
| Contact: John Doe                          |
|                                            |
| Valid Until: [Feb 10, 2026    v]           |
|                                            |
+============================================+
| SEARCH PRODUCTS                            |
| [Search by name or SKU...        ] [Go]    |
+============================================+
|                                            |
| +----------------------------------------+ |
| |[+] Website Design      $5,000          | |
| |    In Stock (15)                       | |
| +----------------------------------------+ |
| |[+] SEO Optimization    $1,500          | |
| |    In Stock                            | |
| +----------------------------------------+ |
|                                            |
+============================================+
| QUOTE ITEMS (2)                            |
+============================================+
|                                            |
| +----------------------------------------+ |
| | Website Design Package           [x]   | |
| | 1 x $5,000 = $5,000                    | |
| +----------------------------------------+ |
| | SEO Optimization                 [x]   | |
| | 3 x $1,500 = $4,050 (10% off)          | |
| +----------------------------------------+ |
|                                            |
+============================================+
|                                            |
| Subtotal:          $9,050.00               |
| Tax (10%):           $905.00               |
| TOTAL:             $9,955.00               |
|                                            |
+============================================+
|                                            |
| [Cancel] [Draft] [Create Opportunity]      |
|                                            |
+============================================+
```

---

## Mobile View (Stepped Flow)

### Step 1: Customer Selection
```
+==============================+
| Quick Quote            [x]   |
+==============================+
| Step 1 of 3: Customer        |
| [====]--------------------   |
+==============================+
|                              |
| Customer                     |
| +---------------------------+|
| | Acme Corporation          ||
| | john@acme.com             ||
| |                [Change]   ||
| +---------------------------+|
|                              |
| Contact                      |
| [John Doe              v]    |
|                              |
| Quote Name                   |
| [New Quote for Acme...]      |
|                              |
| Valid Until                  |
| [Feb 10, 2026          v]    |
|                              |
|                              |
|              [Next: Add Items]|
+==============================+
```

### Step 2: Add Products
```
+==============================+
| Quick Quote            [x]   |
+==============================+
| Step 2 of 3: Products        |
| [========]------------       |
+==============================+
|                              |
| [Search products...      ]   |
|                              |
| +---------------------------+|
| |[+] Website Design         ||
| |    $5,000    In Stock     ||
| +---------------------------+|
| |[+] SEO Optimization       ||
| |    $1,500    In Stock     ||
| +---------------------------+|
| |[+] Content Writing        ||
| |    $200      In Stock     ||
| +---------------------------+|
|                              |
| --- ADDED (2) ---            |
|                              |
| +---------------------------+|
| | Website Design  1x  $5,000||
| |               [-] [1] [+] ||
| +---------------------------+|
| | SEO Opt.       3x  $4,050 ||
| |               [-] [3] [+] ||
| +---------------------------+|
|                              |
|            [Back] [Next: Review]|
+==============================+
```

### Step 3: Review & Create
```
+==============================+
| Quick Quote            [x]   |
+==============================+
| Step 3 of 3: Review          |
| [================]           |
+==============================+
|                              |
| CUSTOMER                     |
| Acme Corporation             |
| John Doe                     |
|                              |
| ITEMS (2)                    |
| +---------------------------+|
| | Website Design     $5,000 ||
| | SEO Optimization   $4,050 ||
| +---------------------------+|
|                              |
| TOTALS                       |
| +---------------------------+|
| | Subtotal:       $9,050.00 ||
| | Tax (10%):        $905.00 ||
| | TOTAL:          $9,955.00 ||
| +---------------------------+|
|                              |
| Notes                        |
| [Add notes...           ]    |
|                              |
| Valid: Feb 10, 2026          |
|                              |
| [Back]                       |
| [Save as Draft]              |
| [Create Opportunity]         |
+==============================+
```

---

## AI Suggestions Panel

### Based on Purchase History
```
+========================================================================+
| AI SUGGESTIONS                                    Powered by [AI logo] |
+========================================================================+
|                                                                        |
| Based on Acme Corporation's history:                                   |
|                                                                        |
| +--------------------------------------------------------------------+ |
| | RECOMMENDED                                                        | |
| +--------------------------------------------------------------------+ |
| | [+] Website Maintenance Plan                         $299.00/mo    | |
| |     [star] 85% of customers who bought Website Design also buy     | |
| |     maintenance within 3 months                                    | |
| +--------------------------------------------------------------------+ |
|                                                                        |
| +--------------------------------------------------------------------+ |
| | FREQUENTLY BOUGHT TOGETHER                                         | |
| +--------------------------------------------------------------------+ |
| | [+] SSL Certificate                                  $99.00/yr     | |
| |     Commonly paired with website projects                          | |
| +--------------------------------------------------------------------+ |
| | [+] Analytics Dashboard                             $499.00        | |
| |     Acme has used analytics tools in the past                      | |
| +--------------------------------------------------------------------+ |
|                                                                        |
| [Hide Suggestions]                                                     |
+========================================================================+
```

---

## Loading States

### Product Search Loading
```
+========================================================================+
| [web___________________________]                            [spinner]  |
+========================================================================+
|                                                                        |
| Searching products...                                                  |
|                                                                        |
| [shimmer=====================================]                         |
| [shimmer=====================================]                         |
| [shimmer=====================================]                         |
|                                                                        |
+========================================================================+
```

### Adding Product to Quote
```
+--------------------------------------------------------------------+
| [+] Website Design Package                           $5,000.00     |
|     [spinner] Adding to quote...                                   |
+--------------------------------------------------------------------+
  Button disabled during add
```

### Creating Opportunity
```
+========================================================================+
| Creating Opportunity...                                                |
+========================================================================+
|                                                                        |
|                         [spinner]                                      |
|                                                                        |
|              Creating your opportunity...                              |
|                                                                        |
|              - Saving quote items                    [check]           |
|              - Creating opportunity record           [spin]            |
|              - Linking to customer                   [pending]         |
|                                                                        |
+========================================================================+
```

---

## Empty States

### No Products Added
```
+========================================================================+
| QUOTE ITEMS (0)                                                        |
+========================================================================+
|                                                                        |
|                    [illustration]                                      |
|                                                                        |
|               No items added yet                                       |
|                                                                        |
|    Search for products above or add a                                  |
|    custom line item to build your quote.                               |
|                                                                        |
+========================================================================+
```

### No Search Results
```
+========================================================================+
| [industrial equipment________________]                      [Search]   |
+========================================================================+
|                                                                        |
|              No products found for "industrial equipment"              |
|                                                                        |
|    Try:                                                                |
|    - Using different keywords                                          |
|    - Checking the spelling                                             |
|    - Searching by SKU                                                  |
|                                                                        |
|    Or [Add Custom Line Item]                                           |
|                                                                        |
+========================================================================+
```

### No AI Suggestions Available
```
+========================================================================+
| AI SUGGESTIONS                                                         |
+========================================================================+
|                                                                        |
|    No suggestions available                                            |
|                                                                        |
|    This is a new customer with no purchase history.                    |
|    Suggestions will appear after their first order.                    |
|                                                                        |
+========================================================================+
```

---

## Error States

### Product Add Failed
```
+--------------------------------------------------------------------+
| [!] Could not add product                                          |
|                                                                    |
| "Website Design Package" could not be added.                       |
|                                                                    |
| This product may be out of stock or unavailable.                   |
|                                                                    |
| [Dismiss] [Try Again]                                              |
+--------------------------------------------------------------------+
  role="alert"
```

### Save Draft Failed
```
+========================================================================+
| [!] Could not save draft                                          [x] |
+========================================================================+
|                                                                        |
| Your quote draft could not be saved.                                   |
|                                                                        |
| Your items are still in the form. Please try again.                    |
|                                                                        |
|                                        [Dismiss] [Retry Save]          |
+========================================================================+
```

### Unsaved Changes Warning
```
+========================================================================+
| Unsaved Changes                                                   [x] |
+========================================================================+
|                                                                        |
| You have unsaved changes in your quote.                                |
|                                                                        |
| Quote items:                                                           |
| - Website Design Package (1x)                                          |
| - SEO Optimization (3x)                                                |
|                                                                        |
| What would you like to do?                                             |
|                                                                        |
| [Discard Changes] [Save as Draft] [Cancel]                             |
+========================================================================+
  role="alertdialog"
  Focus trap active
```

---

## Accessibility Specification

### Product Search ARIA
```html
<div class="product-search">
  <label id="search-label" for="product-search">
    Search products
  </label>
  <input id="product-search"
         role="combobox"
         aria-labelledby="search-label"
         aria-autocomplete="list"
         aria-expanded="true"
         aria-controls="search-results"
         aria-activedescendant="product-1" />

  <ul id="search-results"
      role="listbox"
      aria-label="Product search results">
    <li id="product-1"
        role="option"
        aria-selected="true">
      Website Design Package - $5,000.00
    </li>
    <!-- More options -->
  </ul>
</div>
```

### Quote Items ARIA
```html
<section aria-label="Quote items">
  <h3>Quote Items (3)</h3>
  <ul role="list" aria-live="polite">
    <li aria-label="Website Design Package, quantity 1, $5,000 total">
      <span>Website Design Package</span>
      <span role="group" aria-label="Quantity controls">
        <button aria-label="Decrease quantity">-</button>
        <input type="number" value="1" aria-label="Quantity" />
        <button aria-label="Increase quantity">+</button>
      </span>
      <span aria-label="Line total">$5,000.00</span>
      <button aria-label="Remove Website Design Package from quote">
        Remove
      </button>
    </li>
  </ul>
</section>
```

### Totals Region ARIA
```html
<div role="region"
     aria-label="Quote totals"
     aria-live="polite">
  <dl>
    <dt>Subtotal</dt>
    <dd>$9,050.00</dd>
    <dt>Tax (10% GST)</dt>
    <dd>$905.00</dd>
    <dt>Total</dt>
    <dd><strong>$9,955.00</strong></dd>
  </dl>
</div>
```

### Keyboard Navigation
```
Product Search:
- Tab to search input
- Type to search (debounced)
- Arrow Down to enter results list
- Arrow Up/Down to navigate results
- Enter to add product
- Escape to close results

Quote Items:
- Tab to first item
- Tab through quantity controls
- Enter on +/- to adjust quantity
- Delete/Backspace to remove item
- Tab to discount field (if visible)

Overall Dialog:
- Escape shows unsaved changes warning (if items present)
- Tab cycles through all interactive elements
- Enter on primary button submits

Mobile Steps:
- Swipe left/right between steps (optional)
- Tab navigation still works
- Step indicators are focusable
```

### Screen Reader Announcements
```
On product search:
  "3 products found for 'web'. Use arrow keys to navigate."

On product added:
  "Website Design Package added to quote.
   Quantity 1, $5,000. Quote total: $5,000."

On quantity changed:
  "SEO Optimization quantity updated to 3.
   Line total: $4,500. Quote total: $9,500."

On discount applied:
  "10% discount applied to SEO Optimization.
   New line total: $4,050. Quote total: $9,050."

On product removed:
  "Content Writing removed from quote.
   2 items remaining. Quote total: $9,050."

On opportunity created:
  "Opportunity created successfully.
   Opening Acme Corporation opportunity."
```

---

## Success State - Opportunity Created

```
+========================================================================+
| Opportunity Created                                               [x] |
+========================================================================+
|                                                                        |
|                    [check illustration]                                |
|                                                                        |
|              Opportunity Created Successfully!                         |
|                                                                        |
|              Acme Corporation                                          |
|              $9,955.00 (weighted: $2,986.50)                           |
|                                                                        |
|              Stage: New                                                |
|              Probability: 30% (default)                                |
|              Quote valid until: Feb 10, 2026                           |
|                                                                        |
| +--------------------------------------------------------------------+ |
| | What's next?                                                       | |
| |                                                                    | |
| | [View Opportunity] [Send Quote Email] [Create Another]             | |
| +--------------------------------------------------------------------+ |
|                                                                        |
+========================================================================+
```

---

## Related Wireframes

- [Quote Builder](./pipeline-quote-builder.wireframe.md)
- [Pipeline Kanban Board](./pipeline-kanban-board.wireframe.md)
- [Opportunity Panel](./pipeline-opportunity-panel.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
