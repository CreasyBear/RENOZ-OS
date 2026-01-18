# Wireframe: DOM-WAR-003b - Warranty Expiry Alerts: Dashboard Widget

## Story Reference

- **Story ID**: DOM-WAR-003b
- **Name**: Warranty Expiry Alerts: Dashboard Widget
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: Dashboard widget Card with list

## Overview

Dashboard widget displaying warranties expiring in the next 30 days. Compact list with warranty number, customer name, and expiry date. Click-through navigation to warranty detail. Badge showing count in header.

## UI Patterns (Reference Implementation)

### Card Component
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Widget container with header showing count badge
  - Compact card layout for dashboard display
  - Minimal padding for dashboard widget context

### Badge Component
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Count indicator in header (warranty count)
  - Color-coded urgency badges (red/orange/yellow/green for days until expiry)
  - Status badges for warranty states

### ScrollArea Component
- **Pattern**: RE-UI ScrollArea
- **Reference**: `_reference/.reui-reference/registry/default/ui/scroll-area.tsx`
- **Features**:
  - Scrollable list of expiring warranties within card
  - Fixed height container for dashboard consistency
  - Mobile-optimized touch scrolling

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | warranties | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-WAR-003b | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/warranties.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Warranty Terms**: Batteries 10-year / 10,000 cycles, Inverters 5-year, Installation 2-year
- **SLA**: Response within 24h, resolution within 5 business days

---

## Mobile Wireframe (375px)

### Dashboard Widget (Compact - 3 Items)

```
+=========================================+
|                                         |
|  +-------------------------------------+|
|  | Expiring Warranties            (5)  ||
|  +-------------------------------------+|
|  |                                     ||
|  | +----------------------------------+||
|  | | WAR-2026-00123                   |||
|  | | Brisbane Solar Co                |||
|  | | Expires: Jan 15       [3 days]   |||
|  | +----------------------------------+||
|  |                                     ||
|  | +----------------------------------+||
|  | | WAR-2026-00124                   |||
|  | | Melbourne Energy Systems         |||
|  | | Expires: Jan 18       [6 days]   |||
|  | +----------------------------------+||
|  |                                     ||
|  | +----------------------------------+||
|  | | WAR-2026-00125                   |||
|  | | Sydney Commercial Batteries      |||
|  | | Expires: Jan 22      [10 days]   |||
|  | +----------------------------------+||
|  |                                     ||
|  | [View All 5 Expiring Warranties ->] ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Tapped Row State (Brief Highlight)

```
+-------------------------------------+
| WAR-2026-00123                      |
| Acme Corporation                    |
| Expires: Jan 15       [3 days]      |
| ====================================| <- Blue highlight on tap
+-------------------------------------+
  -> Navigates to /support/warranties/WAR-2026-00123
```

---

## Tablet Wireframe (768px)

### Dashboard Widget (5 Items)

```
+=======================================================================+
|                                                                        |
|  +------------------------------------------------------------------+ |
|  | Expiring Warranties                                          (5) | |
|  | Warranties expiring in the next 30 days                          | |
|  +------------------------------------------------------------------+ |
|  |                                                                  | |
|  | +--- Warranty ---+--- Customer ----------+--- Expires ---+------+| |
|  | | WAR-2026-00123 | Acme Corporation      | Jan 15, 2026  | 3d   || |
|  | +----------------+-----------------------+---------------+------+| |
|  | | WAR-2026-00124 | Tech Industries       | Jan 18, 2026  | 6d   || |
|  | +----------------+-----------------------+---------------+------+| |
|  | | WAR-2026-00125 | Global Services       | Jan 22, 2026  | 10d  || |
|  | +----------------+-----------------------+---------------+------+| |
|  | | WAR-2026-00126 | Premier Partners      | Jan 25, 2026  | 13d  || |
|  | +----------------+-----------------------+---------------+------+| |
|  | | WAR-2026-00127 | Elite Solutions       | Feb 1, 2026   | 20d  || |
|  | +----------------+-----------------------+---------------+------+| |
|  |                                                                  | |
|  | [View All Expiring Warranties ->]                                | |
|  |                                                                  | |
|  +------------------------------------------------------------------+ |
|                                                                        |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Dashboard Grid with Widget

```
+================================================================================================+
| [Logo] Renoz CRM                                                         [Bell] [User v]       |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Dash     |  Dashboard                                                      [Date Range: 30d v] |
| Cust     |  ==================================================================================  |
| Orders   |                                                                                      |
| Products |  +--- KPI CARDS ROW ---------------------------------------------------------------+ |
|          |  | Revenue: $125,000 | Orders: 45 | Active Jobs: 12 | Open Issues: 3              | |
|          |  +---------------------------------------------------------------------------------+ |
|          |                                                                                      |
|          |  +--- WIDGET ROW (3 columns) -----------------------------------------------------+ |
|          |  |                                                                                | |
|          |  | +--- EXPIRING WARRANTIES ----+  +--- RECENT ACTIVITY --+  +--- TASKS --------+| |
|          |  | |                        (5) |  |                      |  |                  || |
|          |  | | Expires in 30 days         |  | Today's activity     |  | My pending tasks || |
|          |  | | -------------------------  |  | ------------------   |  | ---------------- || |
|          |  | |                            |  |                      |  |                  || |
|          |  | | WAR-00123  Acme Corp       |  | Order created...     |  | [ ] Call client  || |
|          |  | | Jan 15     [3d] [red]      |  | Quote sent...        |  | [ ] Review doc   || |
|          |  | | -------------------------  |  | Customer added...    |  | [ ] Follow up    || |
|          |  | |                            |  |                      |  |                  || |
|          |  | | WAR-00124  Tech Inc        |  |                      |  |                  || |
|          |  | | Jan 18     [6d] [orange]   |  |                      |  |                  || |
|          |  | | -------------------------  |  |                      |  |                  || |
|          |  | |                            |  |                      |  |                  || |
|          |  | | WAR-00125  Global Svc      |  |                      |  |                  || |
|          |  | | Jan 22    [10d] [yellow]   |  |                      |  |                  || |
|          |  | | -------------------------  |  |                      |  |                  || |
|          |  | |                            |  |                      |  |                  || |
|          |  | | WAR-00126  Premier         |  |                      |  |                  || |
|          |  | | Jan 25    [13d] [green]    |  |                      |  |                  || |
|          |  | | -------------------------  |  |                      |  |                  || |
|          |  | |                            |  |                      |  |                  || |
|          |  | | WAR-00127  Elite Sol       |  |                      |  |                  || |
|          |  | | Feb 1     [20d] [green]    |  |                      |  |                  || |
|          |  | | -------------------------  |  |                      |  |                  || |
|          |  | |                            |  |                      |  |                  || |
|          |  | | [View All ->]              |  | [View All ->]        |  | [View All ->]    || |
|          |  | +----------------------------+  +----------------------+  +------------------+| |
|          |  |                                                                                | |
|          |  +--------------------------------------------------------------------------------+ |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+
```

### Widget Hover State (Desktop)

```
+----------------------------+
| Expiring Warranties    (5) |
| ========================== |
|                            |
| WAR-00123  Acme Corp       |
| Jan 15     [3d] ======     | <- Row highlight on hover
| ==========================  |    Cursor: pointer
|                            |
| WAR-00124  Tech Inc        |
| Jan 18     [6d]            |
| -------------------------- |
|                            |
+----------------------------+
```

---

## Days Until Expiry Badge Colors

```
+--- COLOR CODING -------------------------------------------+
|                                                            |
|  [1-7 days]   = RED (#EF4444)     Urgent - immediate      |
|                 Background: red-50                         |
|                 Text: red-700                              |
|                                                            |
|  [8-14 days]  = ORANGE (#F97316)  Warning - soon          |
|                 Background: orange-50                      |
|                 Text: orange-700                           |
|                                                            |
|  [15-21 days] = YELLOW (#EAB308)  Approaching             |
|                 Background: yellow-50                      |
|                 Text: yellow-700                           |
|                                                            |
|  [22-30 days] = GREEN (#22C55E)   Healthy - time remains  |
|                 Background: green-50                       |
|                 Text: green-700                            |
|                                                            |
+------------------------------------------------------------+

BADGE EXAMPLES:
+-------+  +-------+  +--------+  +--------+
| 3d    |  | 10d   |  | 18d    |  | 25d    |
| (red) |  | (org) |  | (yel)  |  | (grn)  |
+-------+  +-------+  +--------+  +--------+
```

---

## Interaction States

### Loading States

```
WIDGET LOADING:
+----------------------------+
| Expiring Warranties        |
+----------------------------+
|                            |
| +------------------------+ |
| | [....................] | |
| | [..........] [...]     | |
| +------------------------+ |
|                            |
| +------------------------+ |
| | [....................] | |
| | [..........] [...]     | |
| +------------------------+ |
|                            |
| +------------------------+ |
| | [....................] | |
| | [..........] [...]     | |
| +------------------------+ |
|                            |
+----------------------------+
  <- Skeleton with shimmer animation

COUNT BADGE LOADING:
+----------------------------+
| Expiring Warranties  [...] | <- Skeleton circle
+----------------------------+
```

### Empty States

```
NO EXPIRING WARRANTIES:
+----------------------------+
| Expiring Warranties    (0) |
+----------------------------+
|                            |
|      +------------+        |
|      |   [check]  |        |
|      |    icon    |        |
|      +------------+        |
|                            |
|   No warranties expiring   |
|   in the next 30 days      |
|                            |
|   All warranties are       |
|   healthy!                 |
|                            |
+----------------------------+
```

### Error States

```
FAILED TO LOAD WIDGET:
+----------------------------+
| Expiring Warranties        |
+----------------------------+
|                            |
|  [!] Unable to load        |
|                            |
|  Could not fetch expiring  |
|  warranties data.          |
|                            |
|  [Retry]                   |
|                            |
+----------------------------+
```

### Success/Interactive States

```
ROW CLICK FEEDBACK:
+----------------------------+
| WAR-00123  Acme Corp       |
| Jan 15     [3d]            |
| ========================== | <- Brief press highlight
+----------------------------+
  -> Navigate with 150ms delay for feedback

WIDGET FOCUS (Keyboard):
+============================+
|| Expiring Warranties  (5) ||
+============================+  <- Blue focus ring around widget
|                            |
| [>] WAR-00123  Acme Corp   | <- Focus indicator on first item
| Jan 15     [3d]            |
| -------------------------- |
|                            |
+----------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Widget Header**
   - Tab to widget, focus on header
   - Enter: Navigate to full report page

2. **List Items**
   - Arrow Up/Down: Navigate between items
   - Enter: Navigate to warranty detail
   - Tab: Move to "View All" link

3. **View All Link**
   - Enter/Space: Navigate to expiring warranties report

### ARIA Requirements

```html
<!-- Widget Container -->
<section
  role="region"
  aria-labelledby="expiring-warranties-title"
  tabindex="0"
>
  <header>
    <h3 id="expiring-warranties-title">
      Expiring Warranties
      <span
        role="status"
        aria-label="5 warranties expiring soon"
        class="badge"
      >
        5
      </span>
    </h3>
  </header>

  <!-- Warranty List -->
  <ul
    role="list"
    aria-label="Warranties expiring in 30 days"
  >
    <li
      role="listitem"
      tabindex="0"
      aria-label="Warranty WAR-2026-00123 for Acme Corporation, expires January 15, 3 days remaining"
    >
      <a href="/support/warranties/WAR-2026-00123">
        ...content...
      </a>
    </li>
  </ul>

  <!-- View All Link -->
  <a
    href="/reports/expiring-warranties"
    aria-label="View all 5 expiring warranties"
  >
    View All Expiring Warranties
  </a>
</section>

<!-- Days Badge -->
<span
  role="status"
  aria-label="3 days until expiry, urgent"
  class="badge badge-red"
>
  3d
</span>
```

### Screen Reader Announcements

- Widget loaded: "Expiring warranties widget loaded. 5 warranties expiring in the next 30 days."
- Focus on item: "Warranty WAR-2026-00123 for Acme Corporation, expires January 15, 3 days remaining. Press Enter to view details."
- Empty state: "No warranties expiring in the next 30 days. All warranties are healthy."
- Error: "Failed to load expiring warranties. Retry button available."
- Count updated: "5 warranties expiring soon" (announced on badge update)

---

## Animation Choreography

### Widget Load Animation

```
INITIAL LOAD:
- Duration: 250ms
- Easing: ease-out
- Widget card: opacity 0 -> 1, translateY(8px) -> 0
- List items: stagger 50ms each, same animation

COUNT BADGE:
- Duration: 200ms
- If count > 0: scale(0) -> scale(1.1) -> scale(1)
- If count = 0: fade in only
```

### List Item Interactions

```
HOVER (Desktop):
- Duration: 150ms
- Background: transparent -> gray-50
- Transform: translateX(0) -> translateX(4px)

PRESS/TAP:
- Duration: 100ms
- Background: gray-100
- Scale: 1 -> 0.98 -> 1

NAVIGATION:
- Duration: 150ms
- Item: opacity 1 -> 0.7
- Then navigate to detail page
```

### Badge Color Animation

```
URGENCY PULSE (< 7 days):
- Duration: 2s
- Easing: ease-in-out
- Opacity: 1 -> 0.7 -> 1
- Loop: infinite (subtle attention getter)

COUNT UPDATE:
- Duration: 200ms
- Scale: 1 -> 1.2 -> 1
- Background flash if count increased
```

### Loading State

```
SKELETON SHIMMER:
- Duration: 1.5s
- Easing: linear
- Animation: gradient sweep left to right
- Loop: infinite
```

---

## Component Props Interface

```typescript
// Main Widget Component
interface ExpiringWarrantiesWidgetProps {
  maxItems?: number; // Default: 5 (desktop), 3 (mobile)
  daysThreshold?: number; // Default: 30
  onWarrantyClick?: (warrantyId: string) => void;
  onViewAllClick?: () => void;
  className?: string;
}

// Widget Data Types
interface ExpiringWarranty {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string;
  productName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  urgencyLevel: 'urgent' | 'warning' | 'approaching' | 'healthy';
}

interface ExpiringWarrantiesData {
  warranties: ExpiringWarranty[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}

// List Item Component
interface ExpiringWarrantyItemProps {
  warranty: ExpiringWarranty;
  onClick: () => void;
  isFocused?: boolean;
}

// Days Badge Component
interface DaysBadgeProps {
  days: number;
  showPulse?: boolean;
}

// Hook for data fetching
interface UseExpiringWarrantiesOptions {
  days?: number;
  limit?: number;
  sortBy?: 'expiry_asc' | 'expiry_desc';
}

interface UseExpiringWarrantiesReturn {
  data: ExpiringWarranty[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

---

## Responsive Behavior

| Breakpoint | Items Shown | Layout | Badge Position |
|------------|-------------|--------|----------------|
| Mobile (<768px) | 3 | Card list, stacked | Header right |
| Tablet (768-1024px) | 5 | Compact table | Header right |
| Desktop (>1024px) | 5 | Full table with hover | Header right |

### Mobile-Specific Behavior

- Widget takes full width of dashboard grid
- Swipe gesture on row for quick actions (future)
- "View All" link is prominent at bottom
- Touch targets minimum 44px height

### Desktop-Specific Behavior

- Widget in 3-column dashboard grid
- Hover states on rows
- Keyboard navigation with arrow keys
- Real-time updates via WebSocket (future)

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/dashboard/widgets/expiring-warranties-widget.tsx` | Main widget component |
| `src/components/domain/dashboard/widgets/expiring-warranty-item.tsx` | List item component |
| `src/components/domain/support/days-badge.tsx` | Urgency badge component |
| `src/hooks/use-expiring-warranties.ts` | Data fetching hook |
| `src/routes/_authed/index.tsx` | Dashboard integration point |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-003b
