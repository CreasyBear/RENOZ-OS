# Wireframe: Purchase Orders List Page

> **PRD**: suppliers.prd.json
> **Domain**: Suppliers (DOM-SUPPLIERS)
> **Type**: List Page
> **Last Updated**: 2026-01-10

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | purchaseOrders | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/purchase-orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Key Suppliers**: Battery cell manufacturers (BYD, CATL), Inverter OEMs (Growatt, GoodWe, Sungrow), Solar panel suppliers (Trina, Longi, JA Solar)
- **Lead Times**: 2-4 weeks domestic, 6-12 weeks international
- **Payment Terms**: 30-60 days, Letter of Credit for international

---

## Overview

The Purchase Orders List page displays all purchase orders with comprehensive filtering, status tracking, and quick actions. It provides visibility into the entire procurement pipeline from draft to received.

---

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Multi-column purchase order display with sortable columns (PO #, Supplier, Status, Expected Date, Value)
  - Row selection with bulk actions support
  - Status badge integration showing draft/pending/sent states
  - Responsive table that collapses to cards on mobile

### Tabs
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - Status filter tabs (All, Draft, Pending, Sent, Received, Partial) with counts
  - Keyboard navigation support (arrow keys between tabs)
  - Active tab indicator with smooth transitions

### Sheet
- **Pattern**: RE-UI Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Mobile filter bottom sheet with drag handle
  - Multiple filter sections (Status, Supplier, Date Range, Value Range)
  - Filter preview and clear actions

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded status badges (Draft: Gray, Pending: Orange, Sent: Blue, Partial: Yellow, Received: Green)
  - Warning badges for back-ordered items and overdue dates
  - Compact display in list rows

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Supplier dropdown filter with search
  - Date range picker integration
  - Multi-select support for status filters

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Search input with debounced PO number and supplier name search
  - Value range inputs (min/max) with currency formatting
  - Clear button for quick reset

---

## Mobile Wireframe (375px)

### Default View

```
+=========================================+
| < Procurement                    [+]    |
+-----------------------------------------+
| Purchase Orders                         |
| Track your supplier orders              |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [Search POs...                  ] Q | |
| +-------------------------------------+ |
|                                         |
| [All v] [Status v] [Supplier v]         |
|                                         |
+-----------------------------------------+
|                                         |
|  PENDING RECEIPT (3)                    | <- Status group header
|  -----------------------------------    |
|                                         |
| +-------------------------------------+ |
| | PO-2024-0145                       | |
| | BYD Australia Pty Ltd              | |
| | Sent                   $2,450.00   | |
| | Expected: Jan 15       12 items    | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | PO-2024-0142                   [!] | | <- Warning icon
| | Growatt Pacific                   | |
| | Partially Received     $5,670.00   | |
| | 5 of 8 items received              | |
| | [BACK-ORDERED]                     | | <- Badge
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | PO-2024-0138                       | |
| | Sungrow Australia                     | |
| | Pending Approval       $8,200.00   | <- Orange status
| | Awaiting: John Smith   6 items     | |
| +-------------------------------------+ |
|                                         |
|  -----------------------------------    |
|                                         |
|  DRAFTS (2)                             |
|  -----------------------------------    |
|                                         |
| +-------------------------------------+ |
| | PO-2024-0150                       | |
| | CATL Energy Systems                     | |
| | Draft                  $1,200.00   | |
| | Created: Jan 10        4 items     | |
| +-------------------------------------+ |
|                                         |
+-----------------------------------------+
|        +-------------------+            |
|        |  [+] NEW ORDER    |            | <- FAB
|        +-------------------+            |
+=========================================+
```

### Filter Bottom Sheet

```
+=========================================+
| ================================        | <- Drag handle
|                                         |
| Filter Orders                      [X]  |
+-----------------------------------------+
|                                         |
| Status                                  |
| +------+ +------+ +--------+ +--------+ |
| | All  | | Draft| | Pending| | Sent   | |
| | (*)  | | ( )  | |  ( )   | |  ( )   | |
| +------+ +------+ +--------+ +--------+ |
| +----------+ +----------+ +----------+  |
| | Received | | Partial  | | Closed   |  |
| |   ( )    | |   ( )    | |   ( )    |  |
| +----------+ +----------+ +----------+  |
|                                         |
| Supplier                                |
| +-------------------------------------+ |
| | Select supplier...               v  | |
| +-------------------------------------+ |
|                                         |
| Date Range                              |
| +----------------+ +----------------+   |
| | From: [date]   | | To: [date]     |   |
| +----------------+ +----------------+   |
|                                         |
| Value Range                             |
| +----------------+ +----------------+   |
| | Min: [$____]   | | Max: [$____]   |   |
| +----------------+ +----------------+   |
|                                         |
| Show Only                               |
| [x] Has back-ordered items              |
| [x] Pending approval                    |
| [ ] Overdue expected date               |
|                                         |
+-----------------------------------------+
| [Clear All]              [Apply (15)]   |
+-----------------------------------------+
+=========================================+
```

---

## Tablet Wireframe (768px)

```
+================================================================+
| < Procurement                                                   |
+----------------------------------------------------------------+
| Purchase Orders                              [+ New Order]       |
| Track your supplier orders                                       |
+----------------------------------------------------------------+
|                                                                 |
| +---------------------------+ +--------+ +----------+ +-------+ |
| | [Search POs...          ] | |Status v| |Supplier v| |Date v | |
| +---------------------------+ +--------+ +----------+ +-------+ |
|                                                                 |
| Active Filters: [Pending x] [ABC Building x]     [Clear All]    |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |     | PO #          | Supplier        | Status    | Value   | |
| | [ ] | ------------- | --------------- | --------- | ------- | |
| | [ ] | PO-2024-0145  | ABC Building    | Sent      | $2,450  | |
| |     |               | Expected Jan 15 |           | 12 items| |
| | --- | ------------- | --------------- | --------- | ------- | |
| | [ ] | PO-2024-0142  | XYZ Materials   | Partial[!]| $5,670  | |
| |     |               | 5/8 received    |           | 8 items | |
| | --- | ------------- | --------------- | --------- | ------- | |
| | [ ] | PO-2024-0138  | Sungrow Australia  | Pending   | $8,200  | |
| |     |               | Awaiting: John  |  Approval | 6 items | |
| | --- | ------------- | --------------- | --------- | ------- | |
| | [ ] | PO-2024-0150  | CATL Energy Systems  | Draft     | $1,200  | |
| |     |               | Created Jan 10  |           | 4 items | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Showing 1-15 of 67 orders               < 1 [2] 3 4 ... 12 >   |
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
| Procurement | Purchase Orders                                         [Export] [+ New Order]  |
|   Dashboard | Track and manage your supplier orders                                          |
|   Suppliers | -----------------------------------------------------------------------------------
|   Orders <- |                                                                                |
| Catalog     | +-- STATUS TABS ---------------------------------------------------------+      |
| Jobs        | | [All (67)] [Draft (5)] [Pending (3)] [Sent (12)] [Received (45)] [Partial (2)] |
| Pipeline    | +--------------------------------------------------------------------+      |
| Support     |                                                                                |
|             | +------------------------------+ +----------+ +-------------+ +---------------+ |
|             | | [Search POs...             ] | |Supplier v| |Date Range v| |Value Range v  | |
|             | +------------------------------+ +----------+ +-------------+ +---------------+ |
|             |                                                                                |
|             | Active Filters: [Pending Approval x] [ABC Building x]           [Clear All]    |
|             |                                                                                |
|             | +------------------------------------------------------------------------------+
|             | |                                                                              |
|             | |  [ ]  PO #          | Supplier          | Status         | Expected  | Value    | Items | Actions |
|             | |  -----------------------------------------------------------------------------------------
|             | |  [ ]  PO-2024-0145  | ABC Building      | Sent           | Jan 15    | $2,450   |  12   | [...]   |
|             | |  [ ]  PO-2024-0142  | XYZ Materials     | Partial [!]    | Jan 12    | $5,670   |  8    | [...]   |
|             | |      |              |                   | 5/8 received   |           |          |       |         |
|             | |  [ ]  PO-2024-0138  | Sungrow Australia    | Pending Appr.  | Jan 18    | $8,200   |  6    | [...]   |
|             | |      |              |                   | Awaiting: John |           |          |       |         |
|             | |  [ ]  PO-2024-0150  | CATL Energy Systems    | Draft          | -         | $1,200   |  4    | [...]   |
|             | |  [ ]  PO-2024-0135  | ABC Building      | Received       | Jan 8     | $3,400   |  15   | [...]   |
|             | |  [ ]  PO-2024-0130  | Epsilon HVAC      | Sent           | Jan 20    | $12,500  |  23   | [...]   |
|             | |                                                                              |
|             | +------------------------------------------------------------------------------+
|             |                                                                                |
|             | Showing 1-25 of 67 orders                              < 1 [2] 3 ... 5 >       |
|             |                                                                                |
+-------------+--------------------------------------------------------------------------------+

STATUS COLORS:
- Draft: Gray
- Pending Approval: Orange
- Sent: Blue
- Partially Received: Yellow with [!]
- Received: Green
- Closed: Muted
```

---

## PO Card/Row States

### Standard Row

```
+-------------------------------------------------------------------------+
| [ ] | PO-2024-0145  | ABC Building      | Sent           | Jan 15    | $2,450 |
|     |               | 12 items          |                |           |        |
+-------------------------------------------------------------------------+
  Background: white
  Hover: bg-gray-50
```

### Pending Approval (Requires Action)

```
+-------------------------------------------------------------------------+
| [ ] | PO-2024-0138  | Sungrow Australia    | [Pending Approval] | Jan 18 | $8,200 |
|     |               | 6 items           | Awaiting: John Smith         |        |
+-------------------------------------------------------------------------+
  Status badge: Orange background
  Action indicator: "Awaiting: [Name]"
  Click: Opens approval dialog
```

### Partially Received (Has Back-Ordered)

```
+-------------------------------------------------------------------------+
| [ ] | PO-2024-0142  | XYZ Materials     | [Partial] [!]  | Jan 12    | $5,670 |
|     |               |                   | 5/8 items rec. |           |        |
|     |               | [BACK-ORDERED: 3 items awaiting]                 |        |
+-------------------------------------------------------------------------+
  Status badge: Yellow background
  Warning icon: Indicates attention needed
  Sub-row: Shows back-ordered count
```

### Overdue Expected Date

```
+-------------------------------------------------------------------------+
| [ ] | PO-2024-0140  | Omega Fixtures    | Sent           | Jan 5 [!] | $4,200 |
|     |               | 8 items           | OVERDUE 5 DAYS |           |        |
+-------------------------------------------------------------------------+
  Expected date: Red text with warning icon
  Sub-text: "OVERDUE X DAYS" in red
```

### Selected State

```
+-------------------------------------------------------------------------+
| [X] | PO-2024-0145  | ABC Building      | Sent           | Jan 15    | $2,450 |
|     |               | 12 items          |                |           |        |
+-------------------------------------------------------------------------+
  Background: blue-50
  Border-left: 3px blue-500
  Checkbox: Filled
```

---

## Quick Actions Menu

```
+-------------------------+
| View Details            |
| ----------------------- |
| Receive Goods           |
| Send to Supplier        |
| ----------------------- |
| Edit Order              |
| Duplicate               |
| ----------------------- |
| Cancel Order            | <- Red text
+-------------------------+

Conditional actions:
- "Receive Goods" only for Sent/Partial status
- "Send to Supplier" only for Draft/Approved status
- "Submit for Approval" only for Draft status
- "Approve/Reject" only for pending_approval with permission
```

---

## Bulk Actions Bar

```
+================================================================+
| [X] 3 orders selected          [Bulk Actions v]    [Clear]      |
+================================================================+
  - Send Selected
  - Export Selected
  - Cancel Selected (with confirmation)
```

---

## Loading State

```
+=========================================+
| < Procurement                    [+]    |
+-----------------------------------------+
| Purchase Orders                         |
| [shimmer======================]         |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [shimmer========================]   | |
| +-------------------------------------+ |
|                                         |
| [shimmer===] [shimmer==] [shimmer===]   |
|                                         |
+-----------------------------------------+
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer==========] [shimmer====]   | |
| | [shimmer=======]                    | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer==========] [shimmer====]   | |
| | [shimmer=======]                    | |
| +-------------------------------------+ |
|                                         |
| +-------------------------------------+ |
| | [shimmer==================]         | |
| | [shimmer==========] [shimmer====]   | |
| | [shimmer=======]                    | |
| +-------------------------------------+ |
|                                         |
+=========================================+
```

---

## Empty States

### No Orders

```
+=========================================+
|                                         |
|           +-------------+               |
|           | [clipboard] |               |
|           +-------------+               |
|                                         |
|       NO PURCHASE ORDERS YET            |
|                                         |
|   Create your first purchase order      |
|   to start tracking supplier orders.    |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+] CREATE FIRST ORDER    |       |
|   |                             |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### No Filter Results

```
+=========================================+
|                                         |
|           +-------------+               |
|           |   [search]  |               |
|           +-------------+               |
|                                         |
|     NO ORDERS MATCH YOUR FILTERS        |
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
|     UNABLE TO LOAD ORDERS               |
|                                         |
|   There was a problem loading your      |
|   purchase orders. Please try again.    |
|                                         |
|            [Retry]                      |
|                                         |
+=========================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```html
<main role="main" aria-label="Purchase orders management">
  <nav role="tablist" aria-label="Filter by status">
    <button role="tab" aria-selected="true">All (67)</button>
    <button role="tab" aria-selected="false">Draft (5)</button>
    <!-- ... -->
  </nav>

  <section role="search" aria-label="Search and filter orders">
    <input type="search" aria-label="Search orders by PO number, supplier" />
  </section>

  <section role="region" aria-label="Purchase orders list">
    <table role="grid" aria-label="Purchase orders">
      <thead>
        <tr>
          <th scope="col">Select</th>
          <th scope="col" aria-sort="descending">PO Number</th>
          <!-- ... -->
        </tr>
      </thead>
      <tbody>
        <tr role="row" aria-label="PO-2024-0145, ABC Building, Sent, $2,450">
          <!-- ... -->
        </tr>
      </tbody>
    </table>
  </section>
</main>
```

### Keyboard Navigation

```
Tab Order:
1. Status tabs
2. Search input
3. Filter dropdowns
4. Clear filters button
5. Table header (sortable columns)
6. Table rows
7. Pagination controls
8. New Order button

Table Navigation:
- Tab: Move to next focusable element
- Arrow Up/Down: Navigate rows
- Space: Toggle row selection
- Enter: Open order details
- Context menu key: Open actions menu
```

### Screen Reader Announcements

```
On status tab change:
  "Draft orders tab selected. Showing 5 orders."

On sort change:
  "Sorted by date, newest first. 67 orders."

On row focus:
  "PO-2024-0145, BYD Australia Pty Ltd, Sent status,
   expected January 15, value $2,450, 12 items.
   Press Enter to view, Space to select."

On partial receipt:
  "PO-2024-0142, partially received, 5 of 8 items.
   3 items back-ordered. Requires attention."

On bulk selection:
  "3 orders selected. Bulk actions available."
```

---

## Animation Choreography

### Page Load

```
INITIAL LOAD:
- Tabs: Fade in (0-150ms)
- Search bar: Slide down (150-300ms)
- Table header: Fade in (250-350ms)
- Rows: Stagger fade in (350-700ms, 30ms between rows)

STATUS TAB SWITCH:
- Current content: Fade out (0-150ms)
- Loading skeleton: Show (if needed)
- New content: Fade in (150-350ms)
```

### Row Interactions

```
ROW HOVER:
- Duration: 100ms
- Background: Transition to gray-50
- Easing: ease-out

ROW SELECT:
- Duration: 200ms
- Checkbox: Scale bounce
- Background: Fade to blue-50
- Border: Animate left border

BULK ACTIONS BAR:
- Appear: Slide down from top (200ms)
- Disappear: Slide up (150ms)
```

---

## Component Props Interface

```typescript
// POListPage.tsx
interface POListPageProps {
  // Uses route loader data
}

// POListFilters.tsx
interface POListFiltersProps {
  filters: {
    search: string;
    status: POStatus | 'all';
    supplierId: string | null;
    dateFrom: Date | null;
    dateTo: Date | null;
    valueMin: number | null;
    valueMax: number | null;
    hasBackOrdered: boolean;
    pendingApproval: boolean;
    overdue: boolean;
  };
  onFilterChange: (filters: POListFiltersProps['filters']) => void;
  onClearFilters: () => void;
  resultCount: number;
  totalCount: number;
}

// POStatusTabs.tsx
interface POStatusTabsProps {
  counts: {
    all: number;
    draft: number;
    pending_approval: number;
    sent: number;
    received: number;
    partially_received: number;
    closed: number;
  };
  activeTab: POStatus | 'all';
  onTabChange: (tab: POStatus | 'all') => void;
}

// POListRow.tsx
interface POListRowProps {
  order: {
    id: string;
    poNumber: string;
    supplier: { id: string; name: string };
    status: POStatus;
    expectedDate: Date | null;
    totalValue: number;
    itemCount: number;
    receivedCount?: number;
    backOrderedCount?: number;
    pendingApprover?: string;
    isOverdue?: boolean;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  onAction: (id: string, action: POAction) => void;
}

// POBulkActionsBar.tsx
interface POBulkActionsBarProps {
  selectedCount: number;
  onAction: (action: 'send' | 'export' | 'cancel') => void;
  onClear: () => void;
}

type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

type POAction =
  | 'view'
  | 'edit'
  | 'receive'
  | 'send'
  | 'submit_approval'
  | 'approve'
  | 'reject'
  | 'duplicate'
  | 'cancel';
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/routes/procurement/purchase-orders/index.tsx` | Modify | Add filtering, status tabs |
| `src/components/domain/procurement/po-status-tabs.tsx` | Create | Status tab bar |
| `src/components/domain/procurement/po-list-filters.tsx` | Create | Filter controls |
| `src/components/domain/procurement/po-list-row.tsx` | Create | Row component |
| `src/components/domain/procurement/po-bulk-actions.tsx` | Create | Bulk action bar |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial list load | < 1.5s | Time to interactive |
| Tab switch | < 500ms | Content visible |
| Search response | < 300ms | Debounced results |
| Filter apply | < 500ms | Updated list |
| Row action | < 100ms | Visual feedback |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
