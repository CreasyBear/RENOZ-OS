# Wireframe: Supplier List Page

> **PRD**: suppliers.prd.json
> **Domain**: Suppliers (DOM-SUPPLIERS)
> **Type**: List Page
> **Last Updated**: 2026-01-10

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | suppliers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/suppliers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Key Suppliers**: Battery cell manufacturers (BYD, CATL), Inverter OEMs (Growatt, GoodWe, Sungrow), Solar panel suppliers (Trina, Longi, JA Solar)
- **Lead Times**: 2-4 weeks domestic, 6-12 weeks international
- **Payment Terms**: 30-60 days, Letter of Credit for international

---

## Overview

The Supplier List page is the primary entry point for supplier management. It displays all suppliers with filtering, sorting, search, and quick performance indicators.

---

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx`
- **Features**:
  - Supplier list table with columns (name, status, orders, YTD value, on-time %)
  - Sortable columns for desktop view
  - Row click navigation to supplier detail

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Mobile supplier cards with key metrics
  - Performance rating display with stars
  - Summary stats (orders, YTD value, on-time %)

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-input.tsx`
- **Features**:
  - Search input with debounced filtering
  - Auto-complete suggestions for supplier names
  - Clear button for search reset

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-select.tsx`
- **Features**:
  - Filter dropdowns (All/Active/Inactive, Performance tier)
  - Sort order selector
  - Multi-select for bulk actions

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Status badges (Active/Inactive)
  - Performance tier badges (Gold/Silver/Bronze)
  - Star rating indicators

### Sheet
- **Pattern**: RE-UI Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-sheet.tsx`
- **Features**:
  - Mobile filter bottom sheet
  - Advanced filter panel
  - Swipeable drawer with drag handle

---

## Mobile Wireframe (375px)

### Default View

```
+=========================================+
| < Procurement                    [+]    |
+-----------------------------------------+
| Suppliers                               |
| Manage your supply chain                |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [Search suppliers...           ] Q  | |
| +-------------------------------------+ |
|                                         |
| [All v] [Active v] [Performance v]      |
|                                         |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | BYD Australia Pty Ltd              | |
| | Active                       [***] | | <- 3-star rating
| | 45 orders | $425,000 YTD           | |
| | On-Time: 94%                       | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | Growatt Pacific                    | |
| | Active                       [****]| | <- 4-star rating
| | 28 orders | $185,000 YTD           | |
| | On-Time: 96%                       | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | Sungrow Australia                  | |
| | Active                       [****]| | <- 4-star rating
| | 52 orders | $310,000 YTD           | |
| | On-Time: 97%                       | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | Trina Solar ANZ                    | |
| | Active                       [** ] | | <- 2-star rating
| | 12 orders | $78,000 YTD            | |
| | On-Time: 85%                       | |
| +-------------------------------------+ |
|                                         |
| [Load More]                             |
|                                         |
+-----------------------------------------+
|        +-------------------+            |
|        |  [+] NEW SUPPLIER |            | <- FAB
|        +-------------------+            |
+=========================================+
```

### Filter Bottom Sheet

```
+=========================================+
| ================================        | <- Drag handle
|                                         |
| Filter Suppliers                   [X]  |
+-----------------------------------------+
|                                         |
| Status                                  |
| +--------+ +----------+ +----------+    |
| | All    | | Active   | | Inactive |    |
| |  (*)   | |   ( )    | |   ( )    |    |
| +--------+ +----------+ +----------+    |
|                                         |
| Performance Rating                      |
| +-----+ +-----+ +-----+ +-----+ +-----+ |
| | Any | | 1+  | | 2+  | | 3+  | | 4+  | |
| | (*) | | ( ) | | ( ) | | ( ) | | ( ) | |
| +-----+ +-----+ +-----+ +-----+ +-----+ |
|                                         |
| Category                                |
| +-------------------------------------+ |
| | All Categories                   v  | |
| +-------------------------------------+ |
|   [ ] Battery Cells                    |
|   [ ] Inverters                        |
|   [ ] Solar Panels                     |
|   [ ] BMS Components                   |
|   [ ] Mounting Hardware                |
|                                         |
| On-Time Delivery                        |
| Min: [____%] Max: [____%]               |
|                                         |
+-----------------------------------------+
| [Clear All]              [Apply (12)]   |
+-----------------------------------------+
+=========================================+
```

---

## Tablet Wireframe (768px)

```
+================================================================+
| < Procurement                                                   |
+----------------------------------------------------------------+
| Suppliers                                    [+ New Supplier]   |
| Manage your supply chain                                        |
+----------------------------------------------------------------+
|                                                                 |
| +---------------------------+ +----------+ +----------------+   |
| | [Search suppliers...    ] | | Status v | | Performance v  |   |
| +---------------------------+ +----------+ +----------------+   |
|                                                                 |
| Active Filters: [Active x] [3+ Stars x]        [Clear Filters]  |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
| +-- SUPPLIER CARDS (2-col grid) -------------------------------+
| |                                                               |
| | +---------------------------+ +---------------------------+   |
| | | BYD Australia Pty Ltd    | | Growatt Pacific           |   |
| | | Active         [***]     | | Active         [****]     |   |
| | | 45 orders | $425K YTD    | | 28 orders | $185K YTD     |   |
| | | On-Time: 94%             | | On-Time: 96%              |   |
| | | Lead Time: 8 weeks       | | Lead Time: 3 weeks        |   |
| | +---------------------------+ +---------------------------+   |
| |                                                               |
| | +---------------------------+ +---------------------------+   |
| | | Sungrow Australia        | | Trina Solar ANZ           |   |
| | | Active         [****]    | | Active        [** ]       |   |
| | | 52 orders | $310K YTD    | | 12 orders | $78K YTD      |   |
| | | On-Time: 97%             | | On-Time: 85%              |   |
| | | Lead Time: 4 weeks       | | Lead Time: 10 weeks       |   |
| | +---------------------------+ +---------------------------+   |
| |                                                               |
| +------------------------------ --------------------------------+
|                                                                 |
| Showing 1-12 of 45 suppliers            < 1 [2] 3 4 ... 8 >     |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

```
+==============================================================================================+
| [Logo] Renoz CRM              Dashboard | Procurement | Catalog | Jobs       [Bell] [User]   |
+-------------+------------------------------------------------------------------------------------+
|             |                                                                                |
| Dashboard   | < Back to Procurement                                                          |
| ----------- |                                                                                |
| Procurement | Suppliers                                           [Import] [+ New Supplier]  |
|   Dashboard | Manage your supply chain partners                                              |
|   Suppliers | -----------------------------------------------------------------------------------
|   Orders    |                                                                                |
| Catalog     | +------------------------------+ +----------+ +-----------+ +--------------+    |
| Jobs        | | [Search suppliers...       ] | | Status v | | Rating v  | | Category v   |    |
| Pipeline    | +------------------------------+ +----------+ +-----------+ +--------------+    |
| Support     |                                                                                |
|             | Active Filters: [Active x] [3+ Stars x] [Battery Cells x]      [Clear All]    |
|             |                                                                                |
|             | +------------------------------------------------------------------------------+
|             | |                                                                              |
|             | |  [ ]  Supplier          | Status  | Rating | Orders | YTD Value | On-Time  | Actions |
|             | |  --------------------------------------------------------------------------------------
|             | |  [ ]  BYD Australia Pty Ltd     | Active  | [***]  |  45    | $125,000  |  94%     | [...] |
|             | |  [ ]  CATL Energy Systems          | Active  | [** ]  |  23    | $78,000   |  87%     | [...] |
|             | |  [ ]  GoodWe Power Supply        | Active  | [****] |  67    | $234,000  |  98%     | [...] |
|             | |  [ ]  JA Solar Pacific            | Inactive| [*   ] |   5    | $12,000   |  65% [!] | [...] |
|             | |  [ ]  Longi Green Energy              | Active  | [***]  |  34    | $156,000  |  91%     | [...] |
|             | |  [ ]  Huawei Digital Power            | Active  | [****] |  78    | $289,000  |  96%     | [...] |
|             | |                                                                              |
|             | +------------------------------------------------------------------------------+
|             |                                                                                |
|             | Showing 1-25 of 45 suppliers                           < 1 [2] 3 ... 5 >       |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+

LEGEND:
[***]  = Performance rating stars (1-5)
[!]    = Warning indicator (poor performance)
[...]  = Actions menu (View, Edit, Create PO, View Orders)
```

---

## Supplier Card States

### Standard Card

```
+------------------------------------------+
| BYD Australia Pty Ltd                    |
| ---------------------------------------- |
| Status: Active              Rating: [***]|
| ---------------------------------------- |
| 45 orders      |    $125,000 YTD         |
| On-Time: 94%   |    Avg Lead: 3 days     |
| ---------------------------------------- |
| Primary Contact: Li Wei                  |
| liwei@byd.com.au                         |
+------------------------------------------+
  Background: white
  Border: 1px gray-200
  Hover: shadow-md, border-blue-200
```

### Warning State (Poor Performance)

```
+------------------------------------------+
| JA Solar Pacific                      [!]  | <- Warning icon
| ---------------------------------------- |
| Status: Inactive            Rating: [*  ]| <- Red text
| ---------------------------------------- |
| 5 orders       |    $12,000 YTD          |
| On-Time: 65%   |    Avg Lead: 7 days     | <- Red highlight
| ---------------------------------------- |
| [!] PERFORMANCE ALERT                    | <- Alert banner
| On-time delivery below 70%               |
+------------------------------------------+
  Background: red-50
  Border: 1px red-200
```

### Selected State (Checkbox)

```
+------------------------------------------+
| [X] BYD Australia Pty Ltd                | <- Checked
| ---------------------------------------- |
| Status: Active              Rating: [***]|
| ---------------------------------------- |
| 45 orders      |    $125,000 YTD         |
| On-Time: 94%   |    Avg Lead: 3 days     |
+------------------------------------------+
  Background: blue-50
  Border: 2px blue-500
```

---

## Loading State

### Skeleton Cards

```
+=========================================+
| < Procurement                    [+]    |
+-----------------------------------------+
| Suppliers                               |
| [shimmer======================]         |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [shimmer========================]   | |
| +-------------------------------------+ |
|                                         |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer==========]    [shimmer==]  | |
| | [shimmer========] | [shimmer=====]  | |
| | [shimmer==========]                 | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer==========]    [shimmer==]  | |
| | [shimmer========] | [shimmer=====]  | |
| | [shimmer==========]                 | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer==========]    [shimmer==]  | |
| | [shimmer========] | [shimmer=====]  | |
| | [shimmer==========]                 | |
| +-------------------------------------+ |
|                                         |
+=========================================+
```

---

## Empty State

```
+=========================================+
|                                         |
|           +-------------+               |
|           |   [truck]   |               |
|           +-------------+               |
|                                         |
|        NO SUPPLIERS YET                 |
|                                         |
|   Add your first supplier to start      |
|   managing your supply chain.           |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+] ADD FIRST SUPPLIER    |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

---

## Empty Filter Results

```
+=========================================+
|                                         |
|           +-------------+               |
|           |   [search]  |               |
|           +-------------+               |
|                                         |
|     NO SUPPLIERS MATCH YOUR FILTERS     |
|                                         |
|   Try adjusting your search or filters  |
|   to find what you're looking for.      |
|                                         |
|          [Clear All Filters]            |
|                                         |
+=========================================+
```

---

## Error State

```
+=========================================+
|                                         |
|           +-------------+               |
|           |    [!]      |               |
|           +-------------+               |
|                                         |
|      UNABLE TO LOAD SUPPLIERS           |
|                                         |
|   There was a problem loading your      |
|   supplier list. Please try again.      |
|                                         |
|            [Retry]                      |
|                                         |
+=========================================+
  role="alert"
  aria-live="assertive"
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<main role="main" aria-label="Supplier management">
  <section role="search" aria-label="Search and filter suppliers">
    <input
      type="search"
      aria-label="Search suppliers by name, contact, or category"
      placeholder="Search suppliers..."
    />
    <button aria-haspopup="listbox" aria-expanded="false">
      Status filter
    </button>
  </section>

  <section role="region" aria-label="Supplier list">
    <div role="status" aria-live="polite">
      Showing 12 of 45 suppliers
    </div>
    <ul role="list" aria-label="Suppliers">
      <li role="listitem" tabindex="0" aria-label="BYD Australia Pty Ltd, Active, 3 stars, 94% on-time">
        <!-- Card content -->
      </li>
    </ul>
  </section>
</main>
```

### Keyboard Navigation

```
Tab Order:
1. Search input
2. Status filter dropdown
3. Performance filter dropdown
4. Category filter dropdown
5. Clear filters button (if active)
6. First supplier card
7. Supplier cards (arrow keys to navigate)
8. Pagination controls
9. Add Supplier button

Card Actions:
- Enter: Open supplier detail page
- Space: Toggle card selection
- Arrow Up/Down: Navigate between cards
- Escape: Clear selection
```

### Screen Reader Announcements

```
On filter apply:
  "Showing 12 of 45 suppliers matching filters: Active status, 3+ stars"

On search:
  "Found 5 suppliers matching 'building'"

On card focus:
  "BYD Australia Pty Ltd, Active supplier, 3 star rating,
   45 orders, $125,000 year to date, 94% on-time delivery.
   Press Enter to view details."

On performance warning:
  "JA Solar Pacific has performance issues: 65% on-time delivery,
   below 70% threshold."
```

---

## Animation Choreography

### Page Load

```
INITIAL LOAD:
- Header: Fade in (0-150ms)
- Search bar: Slide down + fade (150-300ms)
- Cards: Stagger fade in (300-600ms, 50ms between cards)

SKELETON TO CONTENT:
- Skeleton: Fade out (0-150ms)
- Cards: Scale up from 0.95 + fade in (150-350ms)
- Duration per card: 200ms
- Stagger: 50ms
```

### Filter Application

```
FILTER APPLY:
- Existing cards: Fade out (0-150ms)
- Loading indicator: Show (150-300ms)
- New cards: Stagger fade in (300-500ms)

CLEAR FILTERS:
- Filter chips: Scale down + fade (0-150ms)
- Cards: Cross-fade to full list (150-400ms)
```

### Card Interactions

```
CARD HOVER:
- Duration: 150ms
- Transform: translateY(-2px)
- Box-shadow: Increase
- Easing: ease-out

CARD SELECT:
- Duration: 200ms
- Checkbox: Scale bounce (1 -> 1.2 -> 1)
- Border: Animate to blue
- Background: Fade to blue-50
```

---

## Component Props Interface

```typescript
// SupplierListPage.tsx
interface SupplierListPageProps {
  // No props - uses route loaders
}

// SupplierCard.tsx
interface SupplierCardProps {
  supplier: {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    rating: number; // 1-5
    orderCount: number;
    ytdValue: number;
    onTimePercentage: number;
    avgLeadTimeDays: number;
    primaryContact?: {
      name: string;
      email: string;
    };
    categories: string[];
  };
  isSelected?: boolean;
  hasPerformanceWarning?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
}

// SupplierFilters.tsx
interface SupplierFiltersProps {
  filters: {
    search: string;
    status: 'all' | 'active' | 'inactive';
    minRating: number | null;
    categories: string[];
    minOnTime: number | null;
    maxOnTime: number | null;
  };
  onFilterChange: (filters: SupplierFiltersProps['filters']) => void;
  onClearFilters: () => void;
  resultCount: number;
  totalCount: number;
}

// PerformanceRating.tsx
interface PerformanceRatingProps {
  rating: number; // 1-5
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  'aria-label'?: string;
}

// SupplierListSkeleton.tsx
interface SupplierListSkeletonProps {
  count?: number; // Default: 6
  variant?: 'card' | 'table';
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/suppliers/index.tsx` | Modify | Add filtering, sorting, performance indicators |
| `src/components/domain/suppliers/supplier-card.tsx` | Create | Supplier card with all states |
| `src/components/domain/suppliers/supplier-filters.tsx` | Create | Filter bar component |
| `src/components/domain/suppliers/performance-rating.tsx` | Create | Star rating display |
| `src/components/domain/suppliers/supplier-list-skeleton.tsx` | Create | Loading skeleton |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial list load | < 1.5s | Time to interactive |
| Search response | < 300ms | Debounced, from keystroke to results |
| Filter apply | < 500ms | From click to updated list |
| Card interaction | < 100ms | From click to navigation |
| Skeleton display | < 50ms | Show immediately on load |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
