# Detail View Patterns Wireframe

**Version:** 1.0
**Last Updated:** 2026-01-10
**Status:** Draft

---

## Purpose

Define reusable detail page patterns for entity views across the application. These patterns ensure consistency while allowing flexibility for different entity types.

---

## Pattern 1: Standard Detail View

**Best For:** Customer, Contact, Product, Quote detail pages
**Key Features:** Tab navigation, sidebar context, clear actions

### Desktop Layout (1440px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Customers > John Smith                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────┬─────────────────────┐  │
│  │ HEADER SECTION                                │  QUICK ACTIONS      │  │
│  │ ┌─────┐                                       │  ┌───────────────┐  │  │
│  │ │     │  John Smith                           │  │ [Edit]        │  │  │
│  │ │ JS  │  🟢 Active Customer                   │  │ [Delete]      │  │  │
│  │ │     │  ID: CUST-12345                       │  │ [More ▼]      │  │  │
│  │ └─────┘                                       │  └───────────────┘  │  │
│  │         Last updated: 2 hours ago             │                     │  │
│  └───────────────────────────────────────────────┴─────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────┬─────────────────────┐  │
│  │ TAB NAVIGATION                                │  SIDEBAR            │  │
│  │ [Overview] [Orders] [Activity] [Documents]    │                     │  │
│  ├───────────────────────────────────────────────┤  ┌───────────────┐  │  │
│  │ MAIN CONTENT AREA                             │  │ CONTACT INFO  │  │  │
│  │                                               │  │               │  │  │
│  │ ┌─────────────────────────────────────────┐   │  │ 📧 Email      │  │  │
│  │ │ CONTACT INFORMATION                     │   │  │ john@ex.com   │  │  │
│  │ │                                         │   │  │               │  │  │
│  │ │ Email: john.smith@example.com           │   │  │ 📞 Phone      │  │  │
│  │ │ Phone: +1 (555) 123-4567               │   │  │ +1 555-1234   │  │  │
│  │ │ Company: Acme Corp                      │   │  │               │  │  │
│  │ │ Title: VP Operations                    │   │  │ 🏢 Company    │  │  │
│  │ └─────────────────────────────────────────┘   │  │ Acme Corp     │  │  │
│  │                                               │  └───────────────┘  │  │
│  │ ┌─────────────────────────────────────────┐   │                     │  │
│  │ │ ADDRESS                                 │   │  ┌───────────────┐  │  │
│  │ │                                         │   │  │ QUICK STATS   │  │  │
│  │ │ 123 Main Street                         │   │  │               │  │  │
│  │ │ Suite 400                               │   │  │ Total Orders  │  │  │
│  │ │ San Francisco, CA 94105                 │   │  │ 47            │  │  │
│  │ │ United States                           │   │  │               │  │  │
│  │ └─────────────────────────────────────────┘   │  │ Lifetime Val  │  │  │
│  │                                               │  │ $125,890      │  │  │
│  │ ┌─────────────────────────────────────────┐   │  │               │  │  │
│  │ │ CUSTOM FIELDS                           │   │  │ Avg Order     │  │  │
│  │ │                                         │   │  │ $2,678        │  │  │
│  │ │ Industry: Technology                    │   │  └───────────────┘  │  │
│  │ │ Employee Count: 500-1000                │   │                     │  │
│  │ │ Account Tier: Enterprise                │   │  ┌───────────────┐  │  │
│  │ │ Renewal Date: 2026-06-30                │   │  │ RELATED       │  │  │
│  │ └─────────────────────────────────────────┘   │  │               │  │  │
│  │                                               │  │ ▸ Orders (47) │  │  │
│  │ ┌─────────────────────────────────────────┐   │  │ ▸ Quotes (12) │  │  │
│  │ │ NOTES                                   │   │  │ ▸ Contacts(8) │  │  │
│  │ │                                         │   │  └───────────────┘  │  │
│  │ │ Key account - quarterly reviews         │   │                     │  │
│  │ │ required. Contact Jane for approvals.   │   │  ┌───────────────┐  │  │
│  │ │                                         │   │  │ ASSIGNED TO   │  │  │
│  │ │ [+ Add Note]                            │   │  │               │  │  │
│  │ └─────────────────────────────────────────┘   │  │ 👤 Sarah Lee  │  │  │
│  │                                               │  │ Sales Rep     │  │  │
│  └───────────────────────────────────────────────┤  └───────────────┘  │  │
│                                                   │                     │  │
└───────────────────────────────────────────────────┴─────────────────────┘  │
```

### Tablet Layout (768px - 1439px)

```
┌───────────────────────────────────────────────┐
│ Breadcrumb: Home > Customers > John Smith    │
├───────────────────────────────────────────────┤
│ HEADER (stacked)                              │
│ ┌─────┐                                       │
│ │ JS  │  John Smith  🟢 Active                │
│ └─────┘  ID: CUST-12345                       │
│                                               │
│ [Edit] [Delete] [More ▼]                      │
├───────────────────────────────────────────────┤
│ [Overview] [Orders] [Activity] [Documents]    │
├───────────────────────────────────────────────┤
│ COLLAPSIBLE SIDEBAR (above content)           │
│ ▾ CONTACT INFO                                │
│   📧 john@example.com                         │
│   📞 +1 555-1234                              │
│                                               │
│ ▸ QUICK STATS                                 │
│ ▸ RELATED ITEMS                               │
├───────────────────────────────────────────────┤
│ MAIN CONTENT                                  │
│ (full width, scrollable sections)             │
│                                               │
│ ┌─────────────────────────────────────────┐   │
│ │ CONTACT INFORMATION                     │   │
│ │ ...                                     │   │
│ └─────────────────────────────────────────┘   │
└───────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)

```
┌─────────────────────────┐
│ [<] John Smith   [⋮]    │
├─────────────────────────┤
│ ┌─────┐                 │
│ │ JS  │ John Smith      │
│ └─────┘ 🟢 Active       │
│         CUST-12345      │
│                         │
│ [Edit] [Delete] [More]  │
├─────────────────────────┤
│ [Overview ▼]            │
│ • Orders                │
│ • Activity              │
│ • Documents             │
├─────────────────────────┤
│ ▾ QUICK INFO            │
│ 📧 john@example.com     │
│ 📞 +1 555-1234          │
│ 🏢 Acme Corp            │
│                         │
│ Orders: 47              │
│ Lifetime: $125,890      │
├─────────────────────────┤
│ CONTACT INFORMATION     │
│ Email: john@ex.com      │
│ Phone: +1 555-1234      │
│ ...                     │
│                         │
│ ADDRESS                 │
│ 123 Main Street         │
│ ...                     │
│                         │
│ (scrollable content)    │
└─────────────────────────┘
```

### Components Used

1. **Header Section**
   - Avatar/Icon (circular, 64px)
   - Entity name (H1, 28px)
   - Status badge (pill shape, colored)
   - Metadata (gray text, 14px)
   - Action buttons (primary, secondary, dropdown)

2. **Tab Navigation**
   - Active tab: underline + bold
   - Inactive tabs: hover effect
   - Mobile: converts to dropdown selector

3. **Info Cards**
   - Card container with padding
   - Section header (H3, 18px)
   - Key-value pairs or form layout
   - Optional edit button per section

4. **Sidebar Widgets**
   - Contact info card
   - Stats card (metric + value)
   - Related items list (collapsible)
   - Assigned user card

---

## Pattern 2: Split View (Master-Detail)

**Best For:** Order management, Email threads, Document review
**Key Features:** List + detail side-by-side, quick switching

### Desktop Layout (1440px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Orders                                                   │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ MASTER LIST (40%)            ┊  DETAIL VIEW (60%)                           │
│                              ┊                                              │
│ ┌──────────────────────────┐ ┊  ┌────────────────────────────────────────┐ │
│ │ 🔍 Search orders...      │ ┊  │ Order #ORD-5678                        │ │
│ └──────────────────────────┘ ┊  │ 🟢 In Progress                         │ │
│                              ┊  │                                        │ │
│ [All] [Pending] [Shipped]    ┊  │ [Edit] [Cancel] [Ship] [More ▼]       │ │
│                              ┊  └────────────────────────────────────────┘ │
│ ┌──────────────────────────┐ ┊                                              │
│ │ 📦 ORD-5678  🟢          │ ┊  ┌────────────────────────────────────────┐ │
│ │ Acme Corp                │ ┊  │ CUSTOMER                               │ │
│ │ $12,450 • Jan 8, 2026    │ ┊  │ Acme Corporation                       │ │
│ └──────────────────────────┘ ┊  │ john.smith@acme.com                    │ │
│                              ┊  │ +1 (555) 123-4567                      │ │
│ ┌──────────────────────────┐ ┊  └────────────────────────────────────────┘ │
│ │ 📦 ORD-5677             │ ┊                                              │
│ │ Tech Solutions           │ ┊  ┌────────────────────────────────────────┐ │
│ │ $8,200 • Jan 7, 2026     │ ┊  │ ORDER DETAILS                          │ │
│ └──────────────────────────┘ ┊  │                                        │ │
│                              ┊  │ Order Date: Jan 8, 2026                │ │
│ ┌──────────────────────────┐ ┊  │ Expected Ship: Jan 12, 2026            │ │
│ │ 📦 ORD-5676             │ ┊  │ Payment: Credit Card (...4242)         │ │
│ │ Global Industries        │ ┊  │ Shipping: UPS Ground                   │ │
│ │ $15,300 • Jan 6, 2026    │ ┊  └────────────────────────────────────────┘ │
│ └──────────────────────────┘ ┊                                              │
│                              ┊  ┌────────────────────────────────────────┐ │
│ ┌──────────────────────────┐ ┊  │ LINE ITEMS (3)                         │ │
│ │ 📦 ORD-5675             │ ┊  │                                        │ │
│ │ StartUp Inc              │ ┊  │ ┌────────────────────────────────────┐ │ │
│ │ $3,750 • Jan 5, 2026     │ ┊  │ │ Widget Pro X1000                   │ │ │
│ └──────────────────────────┘ ┊  │ │ SKU: WGT-1000                      │ │ │
│                              ┊  │ │ Qty: 10  × $450.00 = $4,500.00     │ │ │
│ (scrollable list)            ┊  │ └────────────────────────────────────┘ │ │
│                              ┊  │                                        │ │
│ [1][2][3]...[12] →           ┊  │ ┌────────────────────────────────────┐ │ │
│                              ┊  │ │ Service Plan - Annual              │ │ │
│                              ┊  │ │ SKU: SVC-ANN                       │ │ │
│                              ┊  │ │ Qty: 1  × $2,400.00 = $2,400.00    │ │ │
│                              ┊  │ └────────────────────────────────────┘ │ │
│                              ┊  │                                        │ │
│                              ┊  │ ┌────────────────────────────────────┐ │ │
│                              ┊  │ │ Installation Service               │ │ │
│                              ┊  │ │ SKU: INST-STD                      │ │ │
│                              ┊  │ │ Qty: 1  × $750.00 = $750.00        │ │ │
│                              ┊  │ └────────────────────────────────────┘ │ │
│                              ┊  │                                        │ │
│                              ┊  │ Subtotal:           $7,650.00          │ │
│                              ┊  │ Tax (8.5%):         $650.25            │ │
│                              ┊  │ Shipping:           $150.00            │ │
│                              ┊  │ ────────────────────────────           │ │
│                              ┊  │ Total:              $8,450.25          │ │
│                              ┊  └────────────────────────────────────────┘ │
│                              ┊                                              │
│                              ┊  ┌────────────────────────────────────────┐ │
│                              ┊  │ SHIPPING ADDRESS                       │ │
│                              ┊  │ Acme Corporation                       │ │
│                              ┊  │ 123 Main Street, Suite 400             │ │
│                              ┊  │ San Francisco, CA 94105                │ │
│                              ┊  └────────────────────────────────────────┘ │
│                              ┊                                              │
│                              ┊  (scrollable detail)                         │
└──────────────────────────────┴──────────────────────────────────────────────┘
                               ↕ (resizable divider)
```

### Tablet Layout (768px - 1439px)

```
┌───────────────────────────────────────────────┐
│ Orders                                 [⋮]    │
├───────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐   │
│ │ 🔍 Search orders...                     │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│ [All] [Pending] [Shipped] [Delivered]         │
├───────────────────────────────────────────────┤
│ SPLIT VIEW (50/50 if landscape)               │
│ OR                                            │
│ TOGGLE VIEW (portrait)                        │
│                                               │
│ ┌─────────────────────────────────────────┐   │
│ │ 📦 ORD-5678  🟢        [View Detail >]  │   │
│ │ Acme Corp                               │   │
│ │ $12,450 • Jan 8, 2026                   │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│ (tap to expand full detail)                   │
└───────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)

```
┌─────────────────────────┐
│ [<] Orders       [⋮]    │
├─────────────────────────┤
│ 🔍 Search...            │
│ [All][Pending][Shipped] │
├─────────────────────────┤
│ LIST VIEW ONLY          │
│                         │
│ ┌─────────────────────┐ │
│ │ 📦 ORD-5678        │ │
│ │ 🟢 In Progress     │ │
│ │ Acme Corp          │ │
│ │ $12,450            │ │
│ │ Jan 8, 2026        │ │
│ │        [View >]    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 📦 ORD-5677        │ │
│ │ ⚫ Completed        │ │
│ │ Tech Solutions     │ │
│ │ $8,200             │ │
│ │ Jan 7, 2026        │ │
│ │        [View >]    │ │
│ └─────────────────────┘ │
│                         │
│ (tap → full detail page)│
└─────────────────────────┘
```

### Components Used

1. **Master List**
   - Search/filter bar
   - Filter chips (status, date range)
   - Order cards (condensed)
   - Selected state highlighting
   - Infinite scroll or pagination

2. **Resizable Divider**
   - Drag handle (vertical bar)
   - Min width: 300px each side
   - Desktop only (tablet/mobile: separate views)

3. **Detail Panel**
   - Same components as Standard Detail View
   - Optimized for narrower width
   - Sticky header with key actions

---

## Pattern 3: Full-Width Detail

**Best For:** Complex orders, Reports, Dashboards with tables
**Key Features:** Maximum content width, collapsible sections

### Desktop Layout (1440px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Orders > ORD-5678                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ORDER #ORD-5678                                      [Edit] [Ship] [⋮]  │ │
│ │ 🟢 In Progress • Created: Jan 8, 2026 • Updated: 2 hours ago           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ▾ CUSTOMER & SHIPPING INFORMATION                                       │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                         │ │
│ │ ┌──────────────────────────────┐  ┌──────────────────────────────────┐ │ │
│ │ │ CUSTOMER                     │  │ SHIPPING ADDRESS                 │ │ │
│ │ │                              │  │                                  │ │ │
│ │ │ Acme Corporation             │  │ Acme Corporation                 │ │ │
│ │ │ john.smith@acme.com          │  │ 123 Main Street, Suite 400       │ │ │
│ │ │ +1 (555) 123-4567            │  │ San Francisco, CA 94105          │ │ │
│ │ │                              │  │ United States                    │ │ │
│ │ │ [View Customer Profile >]    │  │                                  │ │ │
│ │ └──────────────────────────────┘  └──────────────────────────────────┘ │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ▾ LINE ITEMS (3 items)                                                  │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                         │ │
│ │ ┌─────────┬────────────────────────┬─────┬───────────┬──────────────┐  │ │
│ │ │ IMAGE   │ PRODUCT                │ QTY │ PRICE     │ TOTAL        │  │ │
│ │ ├─────────┼────────────────────────┼─────┼───────────┼──────────────┤  │ │
│ │ │ [IMG]   │ Widget Pro X1000       │ 10  │ $450.00   │ $4,500.00    │  │ │
│ │ │         │ SKU: WGT-1000          │     │           │              │  │ │
│ │ │         │ In Stock               │     │           │ [Edit][Del]  │  │ │
│ │ ├─────────┼────────────────────────┼─────┼───────────┼──────────────┤  │ │
│ │ │ [IMG]   │ Service Plan - Annual  │ 1   │ $2,400.00 │ $2,400.00    │  │ │
│ │ │         │ SKU: SVC-ANN           │     │           │              │  │ │
│ │ │         │ Digital Product        │     │           │ [Edit][Del]  │  │ │
│ │ ├─────────┼────────────────────────┼─────┼───────────┼──────────────┤  │ │
│ │ │ [IMG]   │ Installation Service   │ 1   │ $750.00   │ $750.00      │  │ │
│ │ │         │ SKU: INST-STD          │     │           │              │  │ │
│ │ │         │ Scheduled: Jan 15      │     │           │ [Edit][Del]  │  │ │
│ │ └─────────┴────────────────────────┴─────┴───────────┴──────────────┘  │ │
│ │                                                                         │ │
│ │ [+ Add Line Item]                                                       │ │
│ │                                                                         │ │
│ │                                          Subtotal:        $7,650.00     │ │
│ │                                          Tax (8.5%):        $650.25     │ │
│ │                                          Shipping:          $150.00     │ │
│ │                                          ─────────────────────────      │ │
│ │                                          Order Total:      $8,450.25    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ▸ PAYMENT & BILLING                                     [Expand]        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ▸ SHIPPING & FULFILLMENT                                [Expand]        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ▾ ACTIVITY LOG (12 events)                                              │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                         │ │
│ │ ● 2 hours ago                                                           │ │
│ │   Sarah Lee updated shipping address                                    │ │
│ │                                                                         │ │
│ │ ● 5 hours ago                                                           │ │
│ │   Payment processed: $8,450.25                                          │ │
│ │                                                                         │ │
│ │ ● Today at 9:15 AM                                                      │ │
│ │   Order created by John Smith                                           │ │
│ │                                                                         │ │
│ │ [Show all activity]                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tablet/Mobile Layout

```
┌─────────────────────────┐
│ [<] ORD-5678     [⋮]    │
├─────────────────────────┤
│ 🟢 In Progress          │
│ Jan 8, 2026             │
│                         │
│ [Edit] [Ship] [More]    │
├─────────────────────────┤
│                         │
│ ▾ CUSTOMER & SHIPPING   │
│                         │
│ Acme Corporation        │
│ john@acme.com           │
│ 123 Main St, SF, CA     │
│                         │
│ ─────────────────────── │
│                         │
│ ▾ LINE ITEMS (3)        │
│                         │
│ ┌─────────────────────┐ │
│ │ [IMG] Widget Pro    │ │
│ │ SKU: WGT-1000       │ │
│ │ Qty: 10 × $450.00   │ │
│ │ Total: $4,500.00    │ │
│ └─────────────────────┘ │
│                         │
│ (more items...)         │
│                         │
│ Subtotal:    $7,650.00  │
│ Tax:           $650.25  │
│ Shipping:      $150.00  │
│ ───────────────────     │
│ Total:       $8,450.25  │
│                         │
│ ─────────────────────── │
│                         │
│ ▸ PAYMENT & BILLING     │
│ ▸ SHIPPING              │
│ ▸ ACTIVITY LOG          │
│                         │
└─────────────────────────┘
```

### Components Used

1. **Collapsible Sections**
   - Section header with ▾/▸ indicator
   - Expand/collapse animation
   - Default states (critical sections expanded)
   - Remember state per user

2. **Full-Width Table**
   - Responsive table (horizontal scroll on mobile)
   - Inline editing
   - Row actions (edit, delete)
   - Summary row (totals)

3. **Activity Timeline**
   - Reverse chronological
   - User avatars
   - Action descriptions
   - Timestamps (relative)
   - "Show all" expansion

---

## Pattern 4: Card-Based Detail

**Best For:** Dashboards, Overview pages, Multi-entity summaries
**Key Features:** Scannable grid, modular sections

### Desktop Layout (1440px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Dashboard > Customer Overview                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ CUSTOMER OVERVIEW - Acme Corporation                    [Full Profile]  │ │
│ │ Last updated: 5 minutes ago                                             │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌───────────────────┬───────────────────┬───────────────────┬────────────┐ │
│ │ QUICK STATS       │ QUICK STATS       │ QUICK STATS       │ QUICK STAT │ │
│ │                   │                   │                   │            │ │
│ │ Total Orders      │ Lifetime Value    │ Avg Order Value   │ Last Order │ │
│ │                   │                   │                   │            │ │
│ │    47             │   $125,890        │    $2,678         │  5 days ago│ │
│ │                   │                   │                   │            │ │
│ │ ↑ 12% vs last mo  │ ↑ 8% vs last mo   │ ↓ 3% vs last mo   │            │ │
│ └───────────────────┴───────────────────┴───────────────────┴────────────┘ │
│                                                                             │
│ ┌───────────────────────────────────┬─────────────────────────────────────┐ │
│ │ CONTACT INFORMATION               │ ACCOUNT DETAILS                     │ │
│ │                                   │                                     │ │
│ │ 📧 john.smith@acme.com            │ Customer Since: Jan 2024            │ │
│ │ 📞 +1 (555) 123-4567              │ Account Tier: Enterprise            │ │
│ │ 🏢 Acme Corporation               │ Industry: Technology                │ │
│ │ 👤 John Smith (VP Operations)     │ Employee Count: 500-1000            │ │
│ │                                   │ Renewal Date: Jun 30, 2026          │ │
│ │ 📍 123 Main Street, Suite 400     │ Payment Terms: Net 30               │ │
│ │    San Francisco, CA 94105        │                                     │ │
│ │                                   │ Assigned Rep: Sarah Lee             │ │
│ │ [Edit Contact]                    │ [Edit Account]                      │ │
│ └───────────────────────────────────┴─────────────────────────────────────┘ │
│                                                                             │
│ ┌───────────────────────────────────┬─────────────────────────────────────┐ │
│ │ RECENT ORDERS (5)                 │ OPEN QUOTES (3)                     │ │
│ │                                   │                                     │ │
│ │ ORD-5678 • $12,450 • In Progress  │ QUO-234 • $8,900 • Pending          │ │
│ │ ORD-5677 • $8,200 • Completed     │ QUO-233 • $15,200 • Under Review    │ │
│ │ ORD-5676 • $15,300 • Shipped      │ QUO-232 • $6,500 • Sent             │ │
│ │ ORD-5675 • $3,750 • Completed     │                                     │ │
│ │ ORD-5674 • $9,100 • Completed     │ [View All Quotes]                   │ │
│ │                                   │                                     │ │
│ │ [View All Orders]                 │                                     │ │
│ └───────────────────────────────────┴─────────────────────────────────────┘ │
│                                                                             │
│ ┌───────────────────────────────────┬─────────────────────────────────────┐ │
│ │ RECENT ACTIVITY (7 days)          │ UPCOMING TASKS (3)                  │ │
│ │                                   │                                     │ │
│ │ ● Today at 2:30 PM                │ ☐ Follow up on Quote #234           │ │
│ │   Order ORD-5678 created          │    Due: Tomorrow                    │ │
│ │                                   │                                     │ │
│ │ ● Yesterday at 11:45 AM           │ ☐ Quarterly Business Review         │ │
│ │   Payment received: $8,200        │    Due: Jan 15, 2026                │ │
│ │                                   │                                     │ │
│ │ ● Jan 6 at 3:15 PM                │ ☐ Contract renewal discussion       │ │
│ │   Quote #234 sent                 │    Due: Jun 1, 2026                 │ │
│ │                                   │                                     │ │
│ │ [Show All Activity]               │ [View All Tasks]                    │ │
│ └───────────────────────────────────┴─────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ NOTES & COMMENTS                                                        │ │
│ │                                                                         │ │
│ │ 📝 "Key account - quarterly reviews required. Contact Jane for         │ │
│ │     approvals over $10K."                                               │ │
│ │    - Sarah Lee, 2 weeks ago                                             │ │
│ │                                                                         │ │
│ │ 📝 "Interested in expanding to additional departments in Q2."           │ │
│ │    - John Smith, 1 month ago                                            │ │
│ │                                                                         │ │
│ │ [+ Add Note]                                                            │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px - 1439px)

```
┌───────────────────────────────────────────────┐
│ Customer Overview - Acme Corp                 │
├───────────────────────────────────────────────┤
│ ┌─────────────┬─────────────┬─────────────┐   │
│ │ Orders      │ Value       │ Avg Order   │   │
│ │ 47          │ $125,890    │ $2,678      │   │
│ └─────────────┴─────────────┴─────────────┘   │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ CONTACT INFORMATION                       │ │
│ │ (full width)                              │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ ACCOUNT DETAILS                           │ │
│ │ (full width)                              │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ RECENT ORDERS                             │ │
│ │ (full width)                              │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ (stacked cards, scrollable)                   │
└───────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)

```
┌─────────────────────────┐
│ [<] Acme Corp    [⋮]    │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 47 Orders           │ │
│ │ $125,890 Value      │ │
│ └─────────────────────┘ │
│                         │
│ ▾ CONTACT INFO          │
│ 📧 john@acme.com        │
│ 📞 +1 555-1234          │
│ ...                     │
│                         │
│ ▾ ACCOUNT DETAILS       │
│ Tier: Enterprise        │
│ Since: Jan 2024         │
│ ...                     │
│                         │
│ ▾ RECENT ORDERS (5)     │
│ ORD-5678 • $12,450      │
│ ORD-5677 • $8,200       │
│ ...                     │
│                         │
│ ▸ OPEN QUOTES           │
│ ▸ ACTIVITY              │
│ ▸ TASKS                 │
│                         │
└─────────────────────────┘
```

### Components Used

1. **Metric Cards**
   - Large number (32px)
   - Label (14px, gray)
   - Trend indicator (↑↓ with %)
   - Color coding (green = positive, red = negative)

2. **Info Cards**
   - Card header with icon
   - Key-value list or timeline
   - Action button at bottom
   - Optional badge/count in header

3. **Grid System**
   - Desktop: 2-4 columns
   - Tablet: 2 columns or stacked
   - Mobile: Single column
   - Equal height cards in row

4. **List Cards**
   - Compact item rows
   - Status indicators
   - "View All" expansion link
   - Truncate at 5 items

---

## Common Components Across All Patterns

### Action Bar

```
┌─────────────────────────────────────────────────┐
│ [Primary Action] [Secondary] [Delete] [More ▼] │
│                                                 │
│ Dropdown from [More ▼]:                         │
│ • Export to PDF                                 │
│ • Duplicate                                     │
│ • Archive                                       │
│ • ───────────                                   │
│ • View Audit Log                                │
└─────────────────────────────────────────────────┘
```

### Status Badge

```
🟢 Active      (green circle + text)
🟡 Pending     (yellow circle + text)
🔴 Overdue     (red circle + text)
⚫ Completed   (gray circle + text)
🔵 In Progress (blue circle + text)
```

### Breadcrumb

```
Home > Customers > Acme Corp > Order #5678
[Link] > [Link]  > [Link]    > [Current Page]
```

### Section Header

```
┌─────────────────────────────────────────────────┐
│ ▾ SECTION TITLE (count)              [Edit]    │
│ ├─────────────────────────────────────────────  │
│ │ Section content...                            │
└─────────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [Icon/Illustration]                │
│                                                 │
│           No orders yet                         │
│     Create your first order to get started      │
│                                                 │
│          [+ Create Order]                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

| Device    | Width        | Layout Adjustments                    |
|-----------|--------------|---------------------------------------|
| Mobile    | < 768px      | Single column, stacked cards          |
| Tablet    | 768-1439px   | 2 columns, collapsible sidebar        |
| Desktop   | 1440px+      | Full layout with sidebar              |
| Wide      | 1920px+      | Optional wider max-width (1600px)     |

---

## Accessibility Considerations

1. **Keyboard Navigation**
   - Tab order follows visual flow
   - Focus indicators on all interactive elements
   - Keyboard shortcuts for common actions (e.g., 'e' for edit)

2. **Screen Reader Support**
   - Semantic HTML (header, nav, main, section, article)
   - ARIA labels for icons and status badges
   - Announced state changes (e.g., "Section expanded")

3. **Color & Contrast**
   - Don't rely on color alone (use icons + text)
   - WCAG AA contrast ratios (4.5:1 for text)
   - Status badges include both color and text

4. **Touch Targets**
   - Minimum 44x44px on mobile
   - Adequate spacing between buttons
   - Larger tap areas for primary actions

---

## Performance Considerations

1. **Lazy Loading**
   - Load detail panels on demand
   - Infinite scroll for long lists
   - Defer loading of collapsed sections

2. **Caching**
   - Cache detail view data
   - Invalidate on updates
   - Optimistic UI updates

3. **Progressive Enhancement**
   - Core content loads first
   - Enhancements load progressively
   - Fallbacks for failed loads

---

## Renoz-Specific Examples

### Customer Detail Page
- Pattern: **Standard Detail View**
- Tabs: Overview, Orders, Quotes, Invoices, Activity, Documents
- Sidebar: Contact info, Stats, Related contacts, Assigned rep

### Order Detail Page
- Pattern: **Full-Width Detail** (for line items table)
- Collapsible sections: Customer info, Line items, Payment, Shipping, Activity
- No sidebar to maximize table width

### Order Management
- Pattern: **Split View**
- Master list: Filterable order list
- Detail: Selected order details
- Quick switching between orders

### Dashboard
- Pattern: **Card-Based Detail**
- Metric cards: Sales, Orders, Revenue
- Activity cards: Recent orders, Tasks, Notifications

---

## Implementation Notes

1. **Component Library**
   - Build reusable card, section, and action bar components
   - Use layout components (Grid, Stack, Split) for structure
   - Maintain consistent spacing scale (4, 8, 16, 24, 32px)

2. **State Management**
   - Track expanded/collapsed section state
   - Persist user preferences (sidebar width, visible cards)
   - Handle loading and error states

3. **Navigation**
   - Deep linking to specific tabs
   - Browser back button support
   - Preserve scroll position on navigation

4. **Testing**
   - Test all responsive breakpoints
   - Verify keyboard navigation
   - Check screen reader announcements
   - Test with real data volumes

---

**Next Steps:**
1. Review with design team
2. Build component library
3. Create interactive prototypes
4. User testing with sample data

