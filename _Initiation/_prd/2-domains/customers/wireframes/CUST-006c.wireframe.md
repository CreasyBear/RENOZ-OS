# Wireframe: DOM-CUST-006c - Customer Hierarchy: UI

## Story Reference

- **Story ID**: DOM-CUST-006c
- **Name**: Customer Hierarchy: UI
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: TreeView

## Overview

UI for viewing and managing parent/child customer relationships. Includes parent selector dropdown, children list, tree view toggle in customer list, and rollup metrics display.

---

## UI Patterns (Reference Implementation)

### TreeView Component
- **Pattern**: RE-UI Accordion/Tree Navigation
- **Reference**: `_reference/.reui-reference/registry/default/ui/accordion.tsx`
- **Features**:
  - Expandable/collapsible hierarchy with keyboard navigation
  - Nested parent-child relationship visualization
  - ARIA-compliant tree navigation with arrow keys
  - Indentation and visual connecting lines for hierarchy depth

### Parent Selector (Combobox)
- **Pattern**: RE-UI Command/Combobox
- **Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Searchable dropdown with autocomplete
  - Keyboard navigation (arrow keys, enter to select)
  - Circular reference prevention (disable invalid options)
  - Shows customer metadata (orders, LTV) in dropdown options

### Data Grid (Children List)
- **Pattern**: RE-UI Data Table
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Sortable columns for child accounts
  - Inline actions (View, Edit, Remove)
  - Column configurations for Name, Orders, LTV
  - Row selection with checkboxes for bulk operations

### Metrics Cards (Rollup)
- **Pattern**: RE-UI Card + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx` and `badge.tsx`
- **Features**:
  - Summary cards for combined LTV, total orders, total contacts
  - Badge indicators for parent/child status
  - Subtle distinction between direct metrics vs. aggregated metrics
  - Responsive grid layout for mobile/tablet/desktop

### Sheet/Dialog (Mobile Parent Selector)
- **Pattern**: RE-UI Sheet (Mobile) / Dialog (Desktop)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx` and `dialog.tsx`
- **Features**:
  - Mobile-first bottom sheet for parent selection
  - Desktop modal dialog for hierarchy editing
  - Radio group for single-selection parent picker
  - Search input with live filtering

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-006c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Customer Detail - Parent/Child Display (Flat)

```
┌────────────────────────────────────────┐
│ ← Customers                            │
├────────────────────────────────────────┤
│                                        │
│  Brisbane Solar Co                      │
│  john@brisbanesolar.com.au                         │
│                                        │
│  [Overview] [Orders] [Hierarchy] [...] │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  Parent Account:                       │
│  ┌──────────────────────────────────┐  │
│  │ [^] Acme Holdings Group          │  │
│  │     acme-holdings.com            │  │
│  │     12 orders | $890,000 LTV     │  │
│  │                    [View →]      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Child Accounts (3):                   │
│  ┌──────────────────────────────────┐  │
│  │ [v] Acme Manufacturing           │  │
│  │     5 orders | $45,000 LTV       │  │
│  ├──────────────────────────────────┤  │
│  │ [v] Acme Distribution            │  │
│  │     8 orders | $120,000 LTV      │  │
│  ├──────────────────────────────────┤  │
│  │ [v] Acme Retail                  │  │
│  │     3 orders | $28,000 LTV       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [+ Add Child Account]                 │
│                                        │
│  Combined Metrics:                     │
│  ┌──────────────────────────────────┐  │
│  │ Total LTV (incl. children):      │  │
│  │ $438,000                         │  │
│  │ Total Orders: 63                 │  │
│  │ Total Contacts: 12               │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Parent Selector - Mobile Sheet

```
┌────────────────────────────────────────┐
│ Select Parent Account            [×]   │
├────────────────────────────────────────┤
│                                        │
│  [Search customers____________] [X]    │
│                                        │
│  Current: None                         │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  ○ None (Remove Parent)                │
│                                        │
│  Search Results:                       │
│  ┌──────────────────────────────────┐  │
│  │ ○ Acme Holdings Group            │  │
│  │   12 orders | $890,000 LTV       │  │
│  ├──────────────────────────────────┤  │
│  │ ○ Global Corp                    │  │
│  │   45 orders | $1,200,000 LTV     │  │
│  ├──────────────────────────────────┤  │
│  │ ○ Mega Industries                │  │
│  │   23 orders | $560,000 LTV       │  │
│  └──────────────────────────────────┘  │
│                                        │
│                                        │
│  [Cancel]            [Set Parent]      │
│                                        │
└────────────────────────────────────────┘
```

### Customer List - Mobile (Flat with Badges)

```
┌────────────────────────────────────────┐
│ Customers                    [+ New]   │
├────────────────────────────────────────┤
│ [Search_______________] [Filter ▼]     │
│                                        │
│ View: [List ▼] (Tree view on tablet+)  │
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Acme Holdings Group    [Parent]  │   │
│ │ holdings@brisbanesolar.com.au                │   │
│ │ 3 child accounts       Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │   Brisbane Solar Co     [Child]   │   │
│ │   john@brisbanesolar.com.au                  │   │
│ │   └─ Parent: Acme Holdings       │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Sydney Energy Systems                  │   │
│ │ contact@sydneyenergy.com.au                  │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Customer Detail - Hierarchy Section

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Brisbane Solar Co                         [Edit] [Actions ▼]  │
│  john@brisbanesolar.com.au | +61 7 3000 0123                                  │
│                                                               │
│  [Overview] [Orders] [Quotes] [Hierarchy] [Activity] [...]    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  ┌─ Parent Account ──────────────────────────────────────┐    │
│  │                                                        │    │
│  │  [^] Acme Holdings Group                               │    │
│  │      acme-holdings.com | 12 orders | $890,000 LTV      │    │
│  │                                          [View] [Edit] │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─ Child Accounts (3) ──────────────────────────────────┐    │
│  │                                                        │    │
│  │  Name                  Orders    LTV          Actions  │    │
│  │  ─────────────────────────────────────────────────────│    │
│  │  Acme Manufacturing    5         $45,000      [View]   │    │
│  │  Acme Distribution     8         $120,000     [View]   │    │
│  │  Acme Retail           3         $28,000      [View]   │    │
│  │                                                        │    │
│  │                              [+ Add Child Account]     │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─ Combined Metrics ────────────────────────────────────┐    │
│  │                                                        │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ Total LTV    │  │ Total Orders │  │ Contacts     │ │    │
│  │  │ $438,000     │  │ 63           │  │ 12           │ │    │
│  │  │ (w/ children)│  │ (w/ children)│  │ (w/ children)│ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Customer List - Tree View (2 Levels Visible)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Customers                                              [+ New Customer]   │
├───────────────────────────────────────────────────────────────────────────┤
│ [Search_____________________] [Status ▼] [Sort: Name ▼]                  │
│                                                                           │
│ View: [List] [Tree]  ← toggle                                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  □  Name                      Email              Orders    Status         │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  [v] Acme Holdings Group      holdings@brisbanesolar.com.au  12        ● Active      │
│   │                                                                       │
│   ├─ □ Brisbane Solar Co       john@brisbanesolar.com.au      15        ● Active      │
│   │   │                                                                   │
│   │   ├─ Acme Manufacturing   mfg@brisbanesolar.com.au       5         ● Active      │
│   │   ├─ Acme Distribution    dist@brisbanesolar.com.au      8         ● Active      │
│   │   └─ Acme Retail          retail@brisbanesolar.com.au    3         ● Active      │
│   │                                                                       │
│   └─ □ Acme International     intl@brisbanesolar.com.au      10        ● Active      │
│                                                                           │
│  [>] Sydney Energy Systems          contact@sydneyenergy.com.au    5         ● Active      │
│       (2 children - collapsed)                                            │
│                                                                           │
│  □  Melbourne Power Solutions                 info@gamma.co      8         ● Active      │
│       (no children)                                                       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Parent Selector Dropdown

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  Parent Account:                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Select parent account...________________] [▼]          │  │
│  │                                                         │  │
│  │ ┌─────────────────────────────────────────────────────┐ │  │
│  │ │ [Search customers___________________] [X]           │ │  │
│  │ │                                                     │ │  │
│  │ │ ○ None (Remove Parent)                              │ │  │
│  │ │ ──────────────────────────────────────────────────  │ │  │
│  │ │ ● Acme Holdings Group                               │ │  │
│  │ │   12 orders | $890,000 LTV                          │ │  │
│  │ │ ○ Global Corp                                       │ │  │
│  │ │   45 orders | $1,200,000 LTV                        │ │  │
│  │ │ ○ Mega Industries                                   │ │  │
│  │ │   23 orders | $560,000 LTV                          │ │  │
│  │ │                                                     │ │  │
│  │ │ [!] Cannot select self or descendants               │ │  │
│  │ │                                                     │ │  │
│  │ └─────────────────────────────────────────────────────┘ │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Customer Detail - Full Hierarchy View

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products     [Bell] [User] │
├──────────┬──────────────────────────────────────────────────────────────────────────┤
│          │                                                                          │
│ Dashboard│  ← Back to Customers                                                     │
│          │                                                                          │
│          │  Brisbane Solar Co                          [New Order] [Edit] [More ▼]  │
│          │  john@brisbanesolar.com.au | +61 7 3000 0123 | ABN: 12345678901                          │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  [Overview] [Orders] [Quotes] [Hierarchy] [Activity] [Contacts] [Addr.]  │
│          │                                                                          │
│          │  ═══════════════════════════════════════════════════════════════════════ │
│          │                                                                          │
│          │  ┌─ Organization Hierarchy ──────────────────────────────────────────┐   │
│          │  │                                                                    │   │
│          │  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│          │  │  │                                                             │  │   │
│          │  │  │  [^] Acme Holdings Group (Parent)                           │  │   │
│          │  │  │      │                                                      │  │   │
│          │  │  │      └─── [*] Brisbane Solar Co (Current)                   │  │   │
│          │  │  │                │                                            │  │   │
│          │  │  │                ├─── [v] Acme Manufacturing                  │  │   │
│          │  │  │                ├─── [v] Acme Distribution                   │  │   │
│          │  │  │                └─── [v] Acme Retail                         │  │   │
│          │  │  │                                                             │  │   │
│          │  │  └─────────────────────────────────────────────────────────────┘  │   │
│          │  │                                                                    │   │
│          │  │  [Change Parent] [+ Add Child Account]                            │   │
│          │  │                                                                    │   │
│          │  └────────────────────────────────────────────────────────────────────┘   │
│          │                                                                          │
│          │  ┌─ Parent Account Details ──────────────────────────────────────────┐   │
│          │  │                                                                    │   │
│          │  │  Acme Holdings Group                                               │   │
│          │  │  holdings@brisbanesolar.com.au | +61 7 3000 0000                                   │   │
│          │  │  12 orders | $890,000 lifetime value | Enterprise tier            │   │
│          │  │                                                      [View →]      │   │
│          │  │                                                                    │   │
│          │  └────────────────────────────────────────────────────────────────────┘   │
│          │                                                                          │
│          │  ┌─ Child Accounts (3) ──────────────────────────────────────────────┐   │
│          │  │                                                                    │   │
│          │  │   Name                    Contact           Orders    LTV          │   │
│          │  │   ─────────────────────────────────────────────────────────────   │   │
│          │  │   Acme Manufacturing      mfg@brisbanesolar.com.au      5         $45,000     │   │
│          │  │   Acme Distribution       dist@brisbanesolar.com.au     8         $120,000    │   │
│          │  │   Acme Retail             retail@brisbanesolar.com.au   3         $28,000     │   │
│          │  │                                                                    │   │
│          │  │   Total Children:         3 accounts        16        $193,000    │   │
│          │  │                                                                    │   │
│          │  └────────────────────────────────────────────────────────────────────┘   │
│          │                                                                          │
│          │  ┌─ Combined Metrics (Including Children) ───────────────────────────┐   │
│          │  │                                                                    │   │
│          │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │   │
│          │  │  │ Combined LTV   │  │ Combined Orders│  │ All Contacts   │       │   │
│          │  │  │ $438,000       │  │ 63             │  │ 12             │       │   │
│          │  │  │ This + 3 child │  │ This + 3 child │  │ This + 3 child │       │   │
│          │  │  └────────────────┘  └────────────────┘  └────────────────┘       │   │
│          │  │                                                                    │   │
│          │  └────────────────────────────────────────────────────────────────────┘   │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Customer List - Full Tree View

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ Customers                                                            [+ New Customer]      │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Search________________________] [Status ▼] [Tags ▼] [Sort: Name ▼]                       │
│                                                                                            │
│ View: [List] [Tree]                                        [Expand All] [Collapse All]    │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  □  Name                        Email              Phone          Orders    LTV    Status  │
│  ─────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                            │
│  [v] □ Acme Holdings Group      holdings@brisbanesolar.com.au  555-0000      12       $890K  ● Active │
│   │                                                                                        │
│   ├─ [v] □ Brisbane Solar Co     john@brisbanesolar.com.au      555-0123      15       $245K  ● Active │
│   │   │                                                                                    │
│   │   ├─ □ Acme Manufacturing   mfg@brisbanesolar.com.au       555-0124      5        $45K   ● Active │
│   │   │                                                                                    │
│   │   ├─ □ Acme Distribution    dist@brisbanesolar.com.au      555-0125      8        $120K  ● Active │
│   │   │                                                                                    │
│   │   └─ □ Acme Retail          retail@brisbanesolar.com.au    555-0126      3        $28K   ● Active │
│   │                                                                                        │
│   └─ □ Acme International       intl@brisbanesolar.com.au      555-0130      10       $150K  ● Active │
│                                                                                            │
│  [>] □ Sydney Energy Systems          contact@sydneyenergy.com.au    555-0200      5        $85K   ● Active │
│       └─ (2 children)                                                                      │
│                                                                                            │
│  □ Melbourne Power Solutions                    info@gamma.co      555-0300      8        $62K   ● Active │
│                                                                                            │
│  [>] □ Delta Holdings           delta@delta.com    555-0400      25       $420K  ● Active │
│       └─ (5 children)                                                                      │
│                                                                                            │
│  < 1 2 3 ... 10 >                                    Showing 1-25 of 234 customers        │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Customer Form - Parent Selector

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Edit Customer: Brisbane Solar Co                                              [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  [Basic Info] [Contact] [Hierarchy] [Credit] [Addresses]                          │
│                                                                                   │
│  ┌─ Hierarchy Settings ─────────────────────────────────────────────────────────┐ │
│  │                                                                               │ │
│  │  Parent Account                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ [Acme Holdings Group_________________________________] [▼]   [Clear]    │ │ │
│  │  │                                                                         │ │ │
│  │  │ ┌─────────────────────────────────────────────────────────────────────┐│ │ │
│  │  │ │ [Search customers_________________________________] [X]            ││ │ │
│  │  │ │                                                                     ││ │ │
│  │  │ │ Suggested (same industry):                                          ││ │ │
│  │  │ │ ○ Acme Holdings Group         12 orders | $890K LTV                ││ │ │
│  │  │ │                                                                     ││ │ │
│  │  │ │ Recent:                                                             ││ │ │
│  │  │ │ ○ Global Corp                 45 orders | $1.2M LTV                ││ │ │
│  │  │ │ ○ Mega Industries             23 orders | $560K LTV                ││ │ │
│  │  │ │                                                                     ││ │ │
│  │  │ │ ──────────────────────────────────────────────────────────────────  ││ │ │
│  │  │ │ [!] Invalid selections (grayed out):                                ││ │ │
│  │  │ │ - Cannot select self                                                ││ │ │
│  │  │ │ - Cannot select descendants (would create circular reference)       ││ │ │
│  │  │ │                                                                     ││ │ │
│  │  │ └─────────────────────────────────────────────────────────────────────┘│ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Note: Setting a parent will show this customer as a child in hierarchy       │ │
│  │  views and include their metrics in the parent's rollup totals.               │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│                                              [Cancel]         [Save Changes]      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
PARENT SELECTOR LOADING:
┌────────────────────────────────────────┐
│ Parent Account:                        │
│ [Loading..._____________________] [...] │
└────────────────────────────────────────┘

CHILDREN LIST LOADING:
┌────────────────────────────────────────┐
│ Child Accounts:                        │
│ ┌──────────────────────────────────┐   │
│ │ [..............................] │   │
│ │ [..............................] │   │
│ │ [..............................] │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘

TREE VIEW - PROGRESSIVE LOADING:
┌────────────────────────────────────────┐
│ [v] Acme Holdings Group     ● loaded   │
│  │                                     │
│  ├─ [v] Brisbane Solar Co    ● loaded   │
│  │   │                                 │
│  │   ├─ [...]               loading    │
│  │   └─ [...]               loading    │
│  │                                     │
│  └─ [...]                   loading    │
└────────────────────────────────────────┘
```

### Empty States

```
NO PARENT:
┌────────────────────────────────────────┐
│ Parent Account:                        │
│ ┌──────────────────────────────────┐   │
│ │                                  │   │
│ │   No parent account              │   │
│ │                                  │   │
│ │   This is a top-level customer   │   │
│ │                                  │   │
│ │        [Set Parent]              │   │
│ │                                  │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘

NO CHILDREN:
┌────────────────────────────────────────┐
│ Child Accounts:                        │
│ ┌──────────────────────────────────┐   │
│ │                                  │   │
│ │   No child accounts              │   │
│ │                                  │   │
│ │   Add child accounts to see      │   │
│ │   combined metrics and manage    │   │
│ │   the organization hierarchy.    │   │
│ │                                  │   │
│ │        [+ Add Child]             │   │
│ │                                  │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘

NO SEARCH RESULTS:
┌────────────────────────────────────────┐
│ No matching customers found            │
│                                        │
│ Try a different search term or         │
│ create a new customer first.           │
└────────────────────────────────────────┘
```

### Error States

```
HIERARCHY LOAD ERROR:
┌────────────────────────────────────────┐
│ [!] Unable to load hierarchy           │
│                                        │
│ Could not load parent/child            │
│ relationships.                         │
│                                        │
│           [Retry]                      │
└────────────────────────────────────────┘

CIRCULAR REFERENCE PREVENTION:
┌────────────────────────────────────────┐
│ [!] Cannot select this customer        │
│                                        │
│ "Acme Manufacturing" is a descendant   │
│ of the current customer. Selecting it  │
│ as a parent would create a circular    │
│ reference.                             │
│                                        │
│           [OK]                         │
└────────────────────────────────────────┘

PARENT UPDATE ERROR:
┌────────────────────────────────────────┐
│ [!] Failed to update parent            │
│                                        │
│ The parent could not be changed.       │
│ Please try again.                      │
│                                        │
│    [Retry]      [Cancel]               │
└────────────────────────────────────────┘
```

### Success States

```
PARENT SET:
┌────────────────────────────────────────┐
│ [check] Parent updated                 │
│                                        │
│ Now a child of "Acme Holdings Group"   │
└────────────────────────────────────────┘

CHILD ADDED:
┌────────────────────────────────────────┐
│ [check] Child account added            │
│                                        │
│ "New Company" is now a child of        │
│ "Brisbane Solar Co"                     │
└────────────────────────────────────────┘
```

---

## Accessibility Notes

### Focus Order

1. **Tree Navigation**
   - Tab to tree
   - Arrow Up/Down: Move between visible nodes
   - Arrow Right: Expand node or move to first child
   - Arrow Left: Collapse node or move to parent
   - Enter: Select node / navigate to customer
   - Home/End: First/last visible node

2. **Parent Selector**
   - Tab to selector
   - Type to search
   - Arrow keys to navigate options
   - Enter to select
   - Escape to close

### ARIA Requirements

```html
<!-- Tree View -->
<div
  role="tree"
  aria-label="Customer hierarchy"
>
  <div
    role="treeitem"
    aria-expanded="true"
    aria-level="1"
    aria-setsize="3"
    aria-posinset="1"
    aria-label="Acme Holdings Group, 12 orders, $890,000 lifetime value, expanded"
  >
    <div role="group">
      <div
        role="treeitem"
        aria-level="2"
        aria-label="Brisbane Solar Co, 15 orders"
      >
        ...
      </div>
    </div>
  </div>
</div>

<!-- Tree Item Expand/Collapse -->
<button
  aria-expanded="true"
  aria-label="Collapse Acme Holdings Group"
>
  [v]
</button>

<!-- Parent Selector -->
<div role="combobox" aria-label="Select parent account">
  <input
    type="text"
    aria-autocomplete="list"
    aria-controls="parent-listbox"
    aria-expanded="true"
  />
  <ul
    id="parent-listbox"
    role="listbox"
    aria-label="Available parent accounts"
  >
    <li role="option" aria-selected="true">
      Acme Holdings Group
    </li>
    <li role="option" aria-disabled="true">
      Acme Manufacturing (descendant - cannot select)
    </li>
  </ul>
</div>

<!-- Hierarchy Level Indicator -->
<span class="sr-only">
  Level 2 in hierarchy, child of Acme Holdings Group
</span>
```

### Screen Reader Announcements

- Tree expand: "Acme Holdings Group expanded, 2 children"
- Tree collapse: "Acme Holdings Group collapsed"
- Navigation: "Brisbane Solar Co, level 2, 15 orders, $245,000 lifetime value"
- Parent set: "Parent account set to Acme Holdings Group"
- Child added: "Child account Acme Manufacturing added"
- Invalid selection: "Cannot select Acme Manufacturing, it is a descendant of the current customer"

---

## Animation Choreography

### Tree Expand/Collapse

```
EXPAND:
- Duration: 200ms
- Easing: ease-out
- Height: 0 -> auto (animating max-height)
- Opacity: children 0 -> 1
- Icon: rotate(0) -> rotate(90deg)

COLLAPSE:
- Duration: 150ms
- Easing: ease-in
- Height: auto -> 0
- Opacity: children 1 -> 0
- Icon: rotate(90deg) -> rotate(0)
```

### Tree Node Hover

```
HOVER:
- Duration: 100ms
- Background: subtle highlight
- Indent line: color accent
```

### Parent Selector Dropdown

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Height: 0 -> auto
- Opacity: 0 -> 1
- Transform: translateY(-4px) -> translateY(0)

CLOSE:
- Duration: 150ms
- Reverse of open
```

### Children List Updates

```
CHILD ADDED:
- Duration: 300ms
- New row: slideDown + fadeIn
- Other rows: shift down smoothly

CHILD REMOVED:
- Duration: 200ms
- Removed row: slideUp + fadeOut
- Other rows: shift up smoothly
```

### Loading Progressive

```
PARENT FIRST:
- Load parent immediately
- Children skeleton: shimmer while loading
- Children appear: stagger 50ms each
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: File explorer trees, Org charts, GitKraken
- **Tree Lines**: Subtle gray connecting lines
- **Indentation**: Clear visual hierarchy with consistent spacing
- **Icons**: Chevron for expand/collapse, folder-like for groups

### Visual Hierarchy

1. Current customer emphasized (bold, highlighted)
2. Parent shown above with clear link
3. Children indented below
4. Rollup metrics prominent
5. Actions secondary to information

### Reference Files

- `.square-ui-reference/templates/employees/` - Hierarchy tree view patterns
- Existing customer list patterns

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/parent-selector.tsx` | Parent dropdown selector |
| `src/components/domain/customers/children-list.tsx` | Children table/list |
| `src/components/domain/customers/customer-form.tsx` | Form integration |
| `src/routes/_authed/customers/$customerId.tsx` | Detail page integration |
| `src/routes/_authed/customers/index.tsx` | List tree view integration |
