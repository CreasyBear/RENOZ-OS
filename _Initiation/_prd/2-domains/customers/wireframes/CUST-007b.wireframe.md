# Wireframe: DOM-CUST-007b - Unified Activity Timeline: UI

## Story Reference

- **Story ID**: DOM-CUST-007b
- **Name**: Unified Activity Timeline: UI
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: Timeline

## Overview

Enhanced timeline component showing all customer interactions aggregated from activities, orders, opportunities, and emails. Features date grouping, type filtering, expandable details, inline actions, and infinite scroll.

---

## UI Patterns (Reference Implementation)

### Timeline Component
- **Pattern**: Custom Timeline (Midday/Square References)
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/charts/tracker.tsx` (for timeline structure)
- **Features**:
  - Vertical timeline with connecting lines
  - Date-grouped sections with sticky headers
  - Icon indicators per activity type with color coding
  - Infinite scroll with progressive loading

### Activity Cards (Timeline Items)
- **Pattern**: RE-UI Card + Collapsible
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx` and `collapsible.tsx`
- **Features**:
  - Expandable/collapsible activity detail cards
  - Inline actions (Edit, Delete) on hover/focus
  - Activity type badges with color-coded icons
  - Related entity links (quotes, orders, contacts)

### Filter Chips (Type Filter)
- **Pattern**: RE-UI Tabs or Toggle Group
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx` or `toggle-group.tsx`
- **Features**:
  - Radio-like single selection for activity type
  - Visual active state indicator
  - Keyboard navigation with arrow keys
  - Accessibility with ARIA radiogroup pattern

### Quick Action Buttons
- **Pattern**: RE-UI Button + Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx` and `dialog.tsx`
- **Features**:
  - Primary action buttons (Add Note, Log Call, Send Email)
  - Opens contextual dialog/sheet for activity creation
  - Icon + label layout for clarity
  - Grouped in a button toolbar

### Infinite Scroll Loader
- **Pattern**: RE-UI Skeleton + Intersection Observer
- **Reference**: `_reference/.reui-reference/registry/default/ui/skeleton.tsx`
- **Features**:
  - Skeleton loading states for timeline items
  - Intersection Observer trigger for pagination
  - ARIA live region announcements for new content
  - Smooth stagger animations on load

### Activity Type Icons
- **Pattern**: RE-UI Badge + Lucide Icons
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Consistent icon set (phone, email, note, order, doc, task)
  - Color-coded by activity type for quick scanning
  - Accessible icon labels for screen readers
  - Small, medium sizes for compact/expanded views

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customerActivities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-007b | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customer-activities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Timeline - Compact View

```
┌────────────────────────────────────────┐
│ ← Customers                            │
├────────────────────────────────────────┤
│                                        │
│  Brisbane Solar Co                      │
│  [Overview] [Orders] [Activity] [...]  │
│                                        │
│  ══════════════════════════════════    │
│                                        │
│  Quick Actions:                        │
│  [+ Note] [+ Call] [+ Email]           │
│                                        │
│  Filter:                               │
│  [All] [Activities] [Orders] [Quotes]  │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  TODAY                                 │
│  ──────────────────────────────────    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● 2:30 PM                        │  │
│  │ [tel] Phone call logged          │  │
│  │ Called to follow up on quote     │  │
│  │ By: Joel Chan                    │  │
│  │                           [...]  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● 10:15 AM                       │  │
│  │ [doc] Quote updated              │  │
│  │ OPP-2026-0012 moved to "Sent"    │  │
│  │                           [...]  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  YESTERDAY                             │
│  ──────────────────────────────────    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● 4:45 PM                        │  │
│  │ [order] Order placed             │  │
│  │ ORD-2026-0051: $2,500            │  │
│  │                           [...]  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● 11:30 AM                       │  │
│  │ [note] Note added                │  │
│  │ "Customer interested in..."      │  │
│  │                           [...]  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  THIS WEEK                             │
│  ──────────────────────────────────    │
│                                        │
│  • 3 more activities                   │
│                                        │
│  [...Loading more...]                  │
│                                        │
└────────────────────────────────────────┘
```

### Timeline Item - Expanded (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● 2:30 PM                 [^]    │  │
│  │ [tel] Phone call logged          │  │
│  │ ────────────────────────────     │  │
│  │                                  │  │
│  │ Type: Outbound Call              │  │
│  │ Duration: 15 minutes             │  │
│  │ Contact: John Smith (CEO)        │  │
│  │                                  │  │
│  │ Notes:                           │  │
│  │ "Called to follow up on quote    │  │
│  │ OPP-2026-0012. Customer is       │  │
│  │ interested but needs board       │  │
│  │ approval. Will call back next    │  │
│  │ week after their meeting."       │  │
│  │                                  │  │
│  │ Logged by: Joel Chan             │  │
│  │ At: Jan 10, 2026 2:30 PM         │  │
│  │                                  │  │
│  │ [Edit] [Delete]                  │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Filter Chips (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│  Filter by type:                       │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │  [● All]  [Activities]  [Orders] │  │
│  │                                  │  │
│  │  [Quotes]  [Emails]              │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Active: All (showing 45 items)        │
│                                        │
└────────────────────────────────────────┘

FILTERED - Activities Only:
┌────────────────────────────────────────┐
│                                        │
│  Filter:                               │
│  [All] [● Activities] [Orders] [...]   │
│                                        │
│  Showing 23 activities                 │
│  [Clear Filter]                        │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Timeline - Medium View with Previews

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Brisbane Solar Co                         [Edit] [Actions ▼]  │
│                                                               │
│  [Overview] [Orders] [Quotes] [Activity] [Contacts] [...]     │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [+ Add Note]  [+ Log Call]  [+ Send Email]              │  │
│  │                                                         │  │
│  │ Filter: [● All] [Activities] [Orders] [Quotes] [Emails] │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  TODAY                                                        │
│  ───────────────────────────────────────────────────────────  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ●   2:30 PM   [tel] Phone call logged                   │  │
│  │ │             ─────────────────────────────────────     │  │
│  │ │             Called to follow up on quote OPP-2026-... │  │
│  │ │             Duration: 15 min | Contact: John Smith    │  │
│  │ │             By: Joel Chan                      [>]    │  │
│  └─┴───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ●  10:15 AM   [doc] Quote updated                       │  │
│  │ │             ─────────────────────────────────────     │  │
│  │ │             OPP-2026-0012 moved to "Sent"             │  │
│  │ │             Value: $28,000                     [>]    │  │
│  └─┴───────────────────────────────────────────────────────┘  │
│                                                               │
│  YESTERDAY                                                    │
│  ───────────────────────────────────────────────────────────  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ●   4:45 PM   [order] Order placed                      │  │
│  │ │             ─────────────────────────────────────     │  │
│  │ │             ORD-2026-0051: $2,500                      │  │
│  │ │             5 line items | Standard shipping   [>]    │  │
│  └─┴───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ●  11:30 AM   [note] Note added                         │  │
│  │ │             ─────────────────────────────────────     │  │
│  │ │             "Customer interested in Q2 expansion..."  │  │
│  │ │             By: Sarah Johnson                  [>]    │  │
│  └─┴───────────────────────────────────────────────────────┘  │
│                                                               │
│  THIS WEEK                                                    │
│  ───────────────────────────────────────────────────────────  │
│                                                               │
│  ... (more items)                                             │
│                                                               │
│  [Loading more items...]                                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Timeline Item Expanded (Tablet)

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ●   2:30 PM   [tel] Phone call logged              [v]  │  │
│  │ │             ─────────────────────────────────────     │  │
│  │ │                                                       │  │
│  │ │   ┌─────────────────────────────────────────────────┐ │  │
│  │ │   │ Call Details                                    │ │  │
│  │ │   │ ─────────────────────────────────────────────   │ │  │
│  │ │   │                                                 │ │  │
│  │ │   │ Type:      Outbound Call                        │ │  │
│  │ │   │ Duration:  15 minutes                           │ │  │
│  │ │   │ Contact:   John Smith (CEO)                     │ │  │
│  │ │   │                                                 │ │  │
│  │ │   │ Notes:                                          │ │  │
│  │ │   │ "Called to follow up on quote OPP-2026-0012.   │ │  │
│  │ │   │ Customer is interested but needs board          │ │  │
│  │ │   │ approval. Will call back next week after        │ │  │
│  │ │   │ their meeting."                                 │ │  │
│  │ │   │                                                 │ │  │
│  │ │   │ Related:                                        │ │  │
│  │ │   │ [OPP-2026-0012: Expansion Quote →]              │ │  │
│  │ │   │                                                 │ │  │
│  │ │   │ By: Joel Chan | Jan 10, 2026 2:30 PM            │ │  │
│  │ │   │                                                 │ │  │
│  │ │   │                    [Edit]  [Delete]             │ │  │
│  │ │   └─────────────────────────────────────────────────┘ │  │
│  │ │                                                       │  │
│  └─┴───────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Timeline - Full View with Hover Details

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
│          │  [Overview] [Orders] [Quotes] [Warranties] [Activity] [Contacts] [Addr.] │
│          │                                                                          │
│          │  ═══════════════════════════════════════════════════════════════════════ │
│          │                                                                          │
│          │  ┌─ Activity Timeline ───────────────────────────────────────────────┐   │
│          │  │                                                                    │   │
│          │  │  Quick Actions:                                                    │   │
│          │  │  [+ Add Note]  [+ Log Call]  [+ Send Email]                        │   │
│          │  │                                                                    │   │
│          │  │  Filter: [● All] [Activities] [Orders] [Quotes] [Emails]           │   │
│          │  │                                        45 total items              │   │
│          │  │                                                                    │   │
│          │  └────────────────────────────────────────────────────────────────────┘   │
│          │                                                                          │
│          │  TODAY                                                                   │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │                                                                    │  │
│          │  │  ●   2:30 PM      [tel] Phone call logged                          │  │
│          │  │  │                ──────────────────────────────────────────────   │  │
│          │  │  │                                                                 │  │
│          │  │  │                Called to follow up on quote OPP-2026-0012.      │  │
│          │  │  │                Customer is interested but needs board approval. │  │
│          │  │  │                                                                 │  │
│          │  │  │                Duration: 15 min | Contact: John Smith (CEO)     │  │
│          │  │  │                By: Joel Chan                                    │  │
│          │  │  │                                                                 │  │
│          │  │  │                Related: [OPP-2026-0012: Expansion Quote →]      │  │
│          │  │  │                                                                 │  │
│          │  │  │                                          [Edit]  [Delete]       │  │
│          │  │  │                                                                 │  │
│          │  └──┴─────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
│          │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │                                                                    │  │
│          │  │  ●  10:15 AM      [doc] Quote updated - OPP-2026-0012              │  │
│          │  │  │                ──────────────────────────────────────────────   │  │
│          │  │  │                Stage changed: "Draft" → "Sent"                  │  │
│          │  │  │                                                                 │  │
│          │  │  │                Value: $28,000 | Products: 5 items               │  │
│          │  │  │                System generated                                 │  │
│          │  │  │                                                                 │  │
│          │  │  │                                              [View Quote →]     │  │
│          │  │  │                                                                 │  │
│          │  └──┴─────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
│          │  YESTERDAY                                                               │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │                                                                    │  │
│          │  │  ●   4:45 PM      [order] Order placed - ORD-2026-0051             │  │
│          │  │  │                ──────────────────────────────────────────────   │  │
│          │  │  │                                                                 │  │
│          │  │  │                Total: $2,500 | 5 line items                     │  │
│          │  │  │                Status: Processing | Ship: Standard               │  │
│          │  │  │                                                                 │  │
│          │  │  │                                              [View Order →]     │  │
│          │  │  │                                                                 │  │
│          │  └──┴─────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
│          │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │                                                                    │  │
│          │  │  ●  11:30 AM      [note] Note added                                │  │
│          │  │  │                ──────────────────────────────────────────────   │  │
│          │  │  │                                                                 │  │
│          │  │  │                "Customer interested in Q2 expansion. They're    │  │
│          │  │  │                looking to add 3 new locations by June.          │  │
│          │  │  │                Schedule follow-up for April planning."          │  │
│          │  │  │                                                                 │  │
│          │  │  │                By: Sarah Johnson                                │  │
│          │  │  │                                                                 │  │
│          │  │  │                                          [Edit]  [Delete]       │  │
│          │  │  │                                                                 │  │
│          │  └──┴─────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
│          │  THIS WEEK                                                               │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  • Jan 7: Email sent - Quote follow-up                                   │
│          │  • Jan 6: Order status changed - ORD-2026-0048 shipped                   │
│          │  • Jan 6: Meeting scheduled - Q1 Planning                                │
│          │                                                                          │
│          │  EARLIER                                                                 │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  [Show 38 more items...]                                                 │
│          │                                                                          │
│          │  ───────────────────────────────────────────────────────────────────     │
│          │  [Loading more...] <- infinite scroll trigger                            │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Activity Type Icons & Colors

```
┌────────────────────────────────────────────────────────────────┐
│ Activity Type Legend:                                          │
│                                                                │
│ [tel] Phone Call      - Blue icon    (#2196F3)                 │
│ [note] Note           - Gray icon    (#757575)                 │
│ [email] Email         - Purple icon  (#9C27B0)                 │
│ [meeting] Meeting     - Teal icon    (#009688)                 │
│ [order] Order         - Green icon   (#4CAF50)                 │
│ [doc] Quote/Opportunity- Orange icon (#FF9800)                 │
│ [task] Task           - Indigo icon  (#3F51B5)                 │
│ [system] System       - Light gray   (#BDBDBD)                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
INITIAL LOAD:
┌────────────────────────────────────────┐
│ Activity Timeline                      │
│ ────────────────────────────────────   │
│                                        │
│ TODAY                                  │
│ ────────────────────────────────────   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ ● [...] [......................] │   │
│ │ │       [......................]│   │
│ │ │       [.................]     │   │
│ └─┴────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ ● [...] [......................] │   │
│ │ │       [......................]│   │
│ └─┴────────────────────────────────┘   │
│                                        │
│ <- Skeleton items with shimmer         │
└────────────────────────────────────────┘

INFINITE SCROLL LOADING:
┌────────────────────────────────────────┐
│                                        │
│ • Jan 6: Order status changed          │
│ • Jan 5: Email received                │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │        [Loading more...]         │   │
│ │           [spinner]              │   │
│ └──────────────────────────────────┘   │
│                                        │
│ <- aria-live="polite" announcement     │
└────────────────────────────────────────┘

ITEM EXPANDING:
┌────────────────────────────────────────┐
│ ● 2:30 PM  [tel] Phone call logged     │
│ │                                      │
│ │   ┌────────────────────────────┐     │
│ │   │ [Loading details...]       │     │
│ │   │        [spinner]           │     │
│ │   └────────────────────────────┘     │
│ │                                      │
└─┴──────────────────────────────────────┘
```

### Empty States

```
NO ACTIVITY (New Customer):
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                    [illustration: timeline]                    │
│                                                                │
│                    No activity yet                             │
│                                                                │
│    This customer doesn't have any recorded activity.           │
│    Start tracking interactions to build a complete history.    │
│                                                                │
│      [+ Add Note]  [+ Log Call]  [+ Send Email]                │
│                                                                │
└────────────────────────────────────────────────────────────────┘

NO MATCHING FILTER:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Filter: [All] [Activities] [Orders] [● Emails]                │
│                                                                │
│                    No emails found                             │
│                                                                │
│    There are no email interactions recorded for this           │
│    customer.                                                   │
│                                                                │
│    [Clear Filter]  or  [+ Send Email]                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Error States

```
TIMELINE LOAD ERROR:
┌────────────────────────────────────────┐
│ Activity Timeline                      │
│                                        │
│ [!] Unable to load activity timeline   │
│                                        │
│ Please check your connection and       │
│ try again.                             │
│                                        │
│           [Retry]                      │
│                                        │
└────────────────────────────────────────┘

ITEM LOAD ERROR:
┌────────────────────────────────────────┐
│ ● 2:30 PM  [tel] Phone call logged     │
│ │                                      │
│ │   [!] Couldn't load details          │
│ │       [Retry]                        │
│ │                                      │
└─┴──────────────────────────────────────┘

DELETE ERROR:
┌────────────────────────────────────────┐
│ [!] Couldn't delete activity           │
│                                        │
│ Please try again.    [Retry] [Cancel]  │
└────────────────────────────────────────┘
```

### Success States

```
ACTIVITY ADDED:
┌────────────────────────────────────────┐
│ [check] Call logged successfully       │
└────────────────────────────────────────┘
↑ Toast notification

NEW ITEM APPEARS:
┌────────────────────────────────────────┐
│ TODAY                                  │
│ ────────────────────────────────────   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ ● Just now  [tel] Phone call...  │   │
│ │ │           ← highlight briefly  │   │
│ └─┴────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ ● 2:30 PM  [tel] Previous call   │   │
│ └─┴────────────────────────────────┘   │
└────────────────────────────────────────┘

ACTIVITY DELETED:
┌────────────────────────────────────────┐
│ [check] Activity deleted               │
│                    [Undo]              │
└────────────────────────────────────────┘
↑ Toast with undo action (5s)
```

---

## Accessibility Notes

### Focus Order

1. **Quick Actions**
   - Tab to Add Note, Log Call, Send Email buttons
   - Enter/Space to open respective dialogs

2. **Filter Chips**
   - Tab to filter group
   - Arrow keys to navigate
   - Enter/Space to select
   - Behaves as radiogroup

3. **Timeline Items**
   - Tab through items
   - Enter to expand/collapse
   - Arrow keys within expanded item
   - Escape to collapse

4. **Infinite Scroll**
   - Tab to "Load More" button (if visible)
   - Auto-announce when loading
   - Focus management on new content

### ARIA Requirements

```html
<!-- Timeline Container -->
<div
  role="feed"
  aria-label="Customer activity timeline"
  aria-busy="false"
>
  <!-- Date Group -->
  <h3 id="today-heading">Today</h3>

  <!-- Timeline Item -->
  <article
    role="article"
    aria-labelledby="item-1-title"
    aria-describedby="item-1-time"
    tabindex="0"
  >
    <time id="item-1-time" datetime="2026-01-10T14:30">2:30 PM</time>
    <h4 id="item-1-title">Phone call logged</h4>
    <p>Called to follow up on quote...</p>

    <button
      aria-expanded="false"
      aria-controls="item-1-details"
    >
      Show details
    </button>

    <div id="item-1-details" hidden>
      ...expanded content...
    </div>
  </article>
</div>

<!-- Filter Chips -->
<div
  role="radiogroup"
  aria-label="Filter by activity type"
>
  <button
    role="radio"
    aria-checked="true"
  >
    All
  </button>
  <button
    role="radio"
    aria-checked="false"
  >
    Activities
  </button>
  ...
</div>

<!-- Loading State -->
<div
  role="status"
  aria-live="polite"
>
  Loading more items...
</div>

<!-- Infinite Scroll Announcement -->
<div
  aria-live="polite"
  class="sr-only"
>
  10 more items loaded
</div>
```

### Screen Reader Announcements

- Filter changed: "Showing Activities only, 23 items"
- Item expanded: "Phone call details expanded"
- Item collapsed: "Phone call details collapsed"
- Loading more: "Loading more activity items"
- Items loaded: "10 more items loaded"
- New item: "New activity: Phone call logged at 2:30 PM"
- Item deleted: "Activity deleted. Press Enter to undo."

---

## Animation Choreography

### Timeline Entry

```
INITIAL LOAD:
- Duration: 400ms total
- Stagger: 50ms between items
- Each item:
  - Opacity: 0 -> 1
  - Transform: translateX(-10px) -> translateX(0)
- Timeline line: draws from top to bottom (600ms)
```

### Item Expand/Collapse

```
EXPAND:
- Duration: 250ms
- Easing: ease-out
- Height: 0 -> auto (animating max-height)
- Opacity: details 0 -> 1
- Arrow icon: rotate(0) -> rotate(90deg)

COLLAPSE:
- Duration: 200ms
- Easing: ease-in
- Reverse of expand
```

### New Item Added

```
APPEAR:
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(-20px) -> translateY(0)
- Opacity: 0 -> 1
- Background: highlight flash (yellow tint, 500ms)

OTHER ITEMS:
- Duration: 200ms
- Shift down smoothly
```

### Item Deleted

```
DELETE:
- Duration: 250ms
- Easing: ease-in
- Transform: translateX(0) -> translateX(-100%)
- Opacity: 1 -> 0
- Height: collapse after slide

REMAINING ITEMS:
- Duration: 200ms
- Shift up smoothly
```

### Filter Transition

```
FILTER CHANGE:
- Duration: 200ms
- Current items: fade out
- New items: fade in with stagger
- Smooth height adjustment
```

### Infinite Scroll

```
NEW ITEMS APPEAR:
- Duration: 300ms
- Stagger: 30ms between items
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1

LOADING SPINNER:
- Duration: infinite
- Standard rotation animation
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: GitHub activity feed, Slack message history, Linear activity
- **Timeline Line**: Vertical line connecting items (left side)
- **Date Groups**: Clear section headers (sticky on scroll)
- **Item Cards**: Subtle cards with clear type indicators
- **Colors**: Activity type colors for quick scanning

### Visual Hierarchy

1. Quick actions most prominent (top)
2. Filter chips clear but secondary
3. Date headers break up content
4. Activity type icon/color for quick identification
5. Timestamp visible but not dominant
6. Expandable details don't overwhelm

### Reference Files

- `.square-ui-reference/templates/tasks/` - Activity timeline patterns
- Existing `activity-tab.tsx` - Current implementation to enhance

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/customer-timeline.tsx` | Main timeline component |
| `src/components/domain/customers/timeline-item.tsx` | Individual timeline item |
| `src/routes/_authed/customers/$customerId.tsx` | Replace activity-tab |
