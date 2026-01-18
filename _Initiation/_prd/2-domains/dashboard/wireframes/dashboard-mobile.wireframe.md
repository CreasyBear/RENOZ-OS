# Dashboard Mobile Wireframe

**Story:** DOM-DASH-007
**Purpose:** Mobile-optimized dashboard view for on-the-go access
**Design Aesthetic:** Touch-friendly, scannable, offline-capable

---

## UI Patterns (Reference Implementation)

### Card (Swipeable Carousel)
- **Pattern**: RE-UI Card with Embla Carousel
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx` + Embla Carousel
- **Features**:
  - Swipeable KPI card carousel with touch gestures
  - Pagination dots indicator for card position
  - Snap-to-position behavior for smooth swiping
  - Full-width card layout optimized for mobile viewport

### Collapsible
- **Pattern**: RE-UI Collapsible
- **Reference**: `_reference/.reui-reference/registry/default/ui/collapsible.tsx`
- **Features**:
  - Expandable/collapsible widget sections
  - Chevron icon state indicator (right/down)
  - Smooth height transition animations
  - Default expanded state for priority widgets

### Sheet (Bottom Sheet)
- **Pattern**: RE-UI Sheet (Bottom variant)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Bottom sheet for drill-down details (chart segments, lists)
  - Drag handle for dismiss gesture
  - Overlay dimming with tap-to-close
  - Height variants (auto, half, full)

### Button (Floating Action)
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Sticky bottom quick actions bar (44x44px touch targets)
  - Icon-only buttons with labels
  - Fixed positioning for persistent access
  - Action sheet trigger for "New" menu

### Skeleton
- **Pattern**: RE-UI Skeleton
- **Reference**: `_reference/.reui-reference/registry/default/ui/skeleton.tsx`
- **Features**:
  - Loading placeholders for KPI cards during data fetch
  - Shimmer animation effect for better UX
  - Matched dimensions to actual content
  - Progressive reveal as data loads

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-007 | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Dashboard Layout (<640px)

```
+================================+
|  MOBILE DASHBOARD              |
+================================+
|  Renoz CRM         [=] [Bell]  |  <- Hamburger menu + Notifications
+================================+
|  Good morning, Joel            |
|  [Sales Rep]                   |
|  +----------------------------+|
|  | Today's Revenue   $12,450  ||  <- Primary metric highlight
|  | [^] +15% vs last week      ||
|  +----------------------------+|
+================================+
|  [Pull down to refresh]        |  <- Pull-to-refresh indicator
+================================+
|  SWIPEABLE KPI CAROUSEL        |
|  +----------------------------+|
|  |<  [   KPI Card 1   ]     > ||  <- Swipe left/right
|  |   [   Revenue      ]       ||
|  |   [   $12,450      ]       ||
|  |   [   +8.5%        ]       ||
|  +----------------------------+|
|  [o o o o o]                   |  <- Pagination dots (5 KPIs)
+================================+
|  COLLAPSIBLE WIDGETS           |
|  +----------------------------+|
|  | [v] Revenue Trend          ||  <- Expanded by default
|  |     +----------------------+|
|  |     |  [Chart]             ||
|  |     +----------------------+|
|  +----------------------------+|
|  +----------------------------+|
|  | [>] Orders by Status       ||  <- Collapsed
|  +----------------------------+|
|  +----------------------------+|
|  | [>] Pipeline Funnel        ||  <- Collapsed
|  +----------------------------+|
|  +----------------------------+|
|  | [v] Recent Activity        ||  <- Expanded
|  |     +----------------------+|
|  |     | - Order created      ||
|  |     | - Issue resolved     ||
|  |     | - Deal closed        ||
|  |     +----------------------+|
|  +----------------------------+|
+================================+
|  QUICK ACTIONS (Sticky Bottom) |
|  +---+  +---+  +---+  +---+    |
|  |[+]|  |[O]|  |[P]|  |[?]|    |
|  |New|  |Ord|  |Pip|  |Hlp|    |
|  +---+  +---+  +---+  +---+    |
+================================+
```

## Swipeable KPI Carousel

```
+================================+
|  KPI CAROUSEL BEHAVIOR         |
+================================+

Card 1 (Visible):
+----------------------------+
| [$] Today's Revenue        |
|                            |
|        $12,450             |
|                            |
|    [^] +8.5% vs last month |
|                            |
|    [~~~~~~~~~~~~~~~]       |  <- Sparkline
+----------------------------+

Swipe Left -> Card 2:
+----------------------------+
| [Box] Open Orders          |
|                            |
|           47               |
|                            |
|    [v] -3 vs last week     |
|                            |
|    [~~~~~~~~~~~~~~~]       |
+----------------------------+

Pagination: [* o o o o]

Touch Gestures:
- Swipe left: Next card
- Swipe right: Previous card
- Tap: Open detail view
- Long press: Quick action menu
```

## Pull-to-Refresh

```
+================================+
|  PULL TO REFRESH SEQUENCE      |
+================================+

1. Initial State:
+----------------------------+
| Dashboard content here     |
+----------------------------+

2. Pulling Down:
+----------------------------+
|                            |
|    [Arrow pointing down]   |  <- Pull indicator
|    Pull to refresh         |
|                            |
+----------------------------+
| Dashboard content here     |
+----------------------------+

3. Release Point:
+----------------------------+
|                            |
|    [Arrow pointing up]     |
|    Release to refresh      |
|                            |
+----------------------------+

4. Refreshing:
+----------------------------+
|                            |
|    [Spinner]               |
|    Refreshing...           |
|                            |
+----------------------------+

5. Complete:
+----------------------------+
|    [Checkmark]             |
|    Updated just now        |
+----------------------------+
| Fresh content              |
+----------------------------+
```

## Collapsible Widget Cards

```
+================================+
|  COLLAPSIBLE WIDGET BEHAVIOR   |
+================================+

Collapsed State:
+----------------------------+
| [>] Revenue Trend     [*]  |  <- Chevron right, priority indicator
+----------------------------+

Expanded State:
+----------------------------+
| [v] Revenue Trend     [*]  |  <- Chevron down
+----------------------------+
|                            |
|  $50K |           .---*    |
|       |      .---'         |
|  $30K | .---'              |
|       +----+----+----+     |
|        Oct  Nov  Dec       |
|                            |
|  Total: $125,230           |
|  [View Full Chart]         |
+----------------------------+
```

## Mobile KPI Card Detail View

```
+================================+
|  KPI DETAIL (Full Screen)      |
+================================+
|  [<] Revenue           [...]   |
+================================+
|                                |
|  +----------------------------+|
|  |                            ||
|  |        $12,450             ||
|  |                            ||
|  |    Today's Revenue         ||
|  |                            ||
|  +----------------------------+|
|                                |
|  TREND                         |
|  +----------------------------+|
|  |  [^] +8.5% vs last month   ||
|  |                            ||
|  |  Previous: $11,475         ||
|  |  Change: +$975             ||
|  +----------------------------+|
|                                |
|  SPARKLINE (Larger)            |
|  +----------------------------+|
|  |                            ||
|  |  [~~~~~~~~~~~~~~~~~~~~~~~] ||
|  |                            ||
|  |  Last 30 days              ||
|  +----------------------------+|
|                                |
|  TARGET PROGRESS               |
|  +----------------------------+|
|  |  Monthly Goal: $15,000     ||
|  |  [===============>---] 83% ||
|  |  $2,550 remaining          ||
|  +----------------------------+|
|                                |
+================================+
|  [View Orders]                 |
+================================+
```

## Mobile Chart Interaction

```
+================================+
|  CHART TOUCH INTERACTIONS      |
+================================+

1. Tap on Chart Point:
+----------------------------+
|                            |
|  $50K |    [Tooltip Box]   |
|       |    Nov: $45,230    |
|       |    +12.3%          |
|       |           *        |
|  $30K |       .--'         |
|       +----+----+----+     |
+----------------------------+

2. Pinch to Zoom (if supported):
+----------------------------+
|  Zoomed view of date range |
|  [Reset Zoom]              |
+----------------------------+

3. Tap Pie Segment:
+----------------------------+
|         +-----+            |
|  Tapped |     | segment    |
|  Opens  +-----+ detail     |
|         bottom sheet       |
+----------------------------+
```

## Mobile Bottom Sheet (Drill-Down)

```
+================================+
|  BOTTOM SHEET - SEGMENT DETAIL |
+================================+

Dashboard visible above:
+--------------------------------+
| Dashboard content (dimmed)     |
+--------------------------------+

Bottom Sheet (slides up):
+================================+
|  [---] Drag handle             |
+================================+
|  Orders - Pending              |
|  12 orders worth $8,450        |
+================================+
|  +----------------------------+|
|  | ORD-1234 | Acme | $1,250   ||
|  | ORD-1235 | Beta | $890     ||
|  | ORD-1236 | Gamma| $2,100   ||
|  | [View All 12 Orders]       ||
|  +----------------------------+|
+================================+
|  [Close]                       |
+================================+
```

## Mobile Quick Actions

```
+================================+
|  QUICK ACTIONS BAR (Sticky)    |
+================================+

+------+  +------+  +------+  +------+
| [+]  |  | [O]  |  | [$]  |  | [?]  |
| New  |  | Orders | | Sales | | Help |
+------+  +------+  +------+  +------+

Tap Actions:
- New: Opens action sheet
  +----------------------------+
  | Create New...              |
  | [Order]                    |
  | [Customer]                 |
  | [Pipeline Opportunity]     |
  | [Issue]                    |
  | [Cancel]                   |
  +----------------------------+

- Orders: Navigate to /orders
- Sales: Navigate to /pipeline
- Help: Opens help/support
```

## Mobile Loading States

### Initial Load

```
+================================+
|  Dashboard                     |
+================================+
|                                |
|  +----------------------------+|
|  | [====================]     ||
|  +----------------------------+|
|                                |
|  +----------------------------+|
|  | [=========]                ||
|  | [=================]        ||
|  +----------------------------+|
|                                |
|  +----------------------------+|
|  | [============]             ||
|  | [=======]                  ||
|  +----------------------------+|
|                                |
+================================+
```

### Skeleton KPI Card

```
+----------------------------+
| [====]   [===========]     |
|                            |
|    [================]      |
|                            |
|    [=====] [===========]   |
|                            |
|    [~~~~~~~~~~~~~~~~~~~]   |
+----------------------------+
```

## Offline Mode

```
+================================+
|  OFFLINE MODE INDICATOR        |
+================================+

1. Offline Banner:
+================================+
| [Cloud-off] You're offline    |
| Showing cached data           |
+================================+
| Dashboard content (cached)    |
+================================+

2. Cached Data Indicator:
+----------------------------+
| [$] Revenue    [Clock]     |  <- Stale data indicator
|                            |
|        $12,450             |
|                            |
|    Last updated: 2 hrs ago |
+----------------------------+

3. Reconnected:
+================================+
| [Cloud-check] Back online     |
| [Refresh Now]                 |
+================================+
```

## Mobile Empty States

```
+================================+
|  NO DATA (Mobile)              |
+================================+
|                                |
|                                |
|     [Empty illustration]       |
|                                |
|     No data to display         |
|                                |
|     Check back later or        |
|     try adjusting filters.     |
|                                |
|     [Refresh]                  |
|                                |
+================================+
```

## Mobile Accessibility

### Touch Targets

```
All touch targets minimum 44x44px:

+--------------------------------+
|  +--------+    +--------+      |
|  |        |    |        |      |
|  | 44x44  |    | 44x44  |      |  <- Minimum sizes
|  |        |    |        |      |
|  +--------+    +--------+      |
|                                |
|  Spacing between: 8px minimum  |
+--------------------------------+
```

### VoiceOver / TalkBack

```
KPI Card Announcement:
"Revenue. Twelve thousand four hundred fifty dollars.
Up eight point five percent compared to last month.
Double tap to view details."

Swipe Gesture Announcement:
"Card 2 of 5. Orders. Forty-seven open orders.
Swipe left for next, swipe right for previous."
```

### Screen Reader Navigation

```
Tab Order:
1. Header navigation
2. Primary metric banner
3. KPI carousel (swipeable)
4. Collapsible widgets (in order)
5. Quick actions bar

Landmarks:
- banner: Header
- main: Dashboard content
- navigation: Quick actions
- complementary: Alerts (if any)
```

## Performance Optimizations

```
+================================+
|  MOBILE PERFORMANCE STRATEGY   |
+================================+

1. Lazy Load:
   - Charts load when widget expanded
   - Images load on scroll
   - Off-screen content deferred

2. Service Worker Caching:
   - Cache dashboard shell
   - Cache last-known data
   - Background sync for updates

3. Reduced Motion:
   - Respect prefers-reduced-motion
   - Simpler transitions
   - Static sparklines option

4. Touch Optimization:
   - Native scroll momentum
   - Touch feedback (<100ms)
   - No hover states required
```

## Component Props Interface

```typescript
interface MobileDashboardProps {
  session: { role?: string; email?: string } | null;
  metrics: DashboardMetrics;
  widgets: WidgetConfig[];
  isLoading?: boolean;
  isOffline?: boolean;
  lastUpdated?: Date;
  onRefresh: () => Promise<void>;
}

interface SwipeableKPICarouselProps {
  kpis: KPIData[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onKPITap: (kpi: KPIData) => void;
}

interface CollapsibleWidgetProps {
  widget: WidgetConfig;
  isExpanded: boolean;
  onToggle: () => void;
  isPriority?: boolean;
  isLoading?: boolean;
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  children: React.ReactNode;
}

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
}
```

## Gesture Reference

```
+================================+
|  GESTURE MAPPING               |
+================================+

Swipe Left:     Next KPI card
Swipe Right:    Previous KPI card
Swipe Down:     Pull to refresh
Tap:            Select / Expand
Long Press:     Context menu
Pinch:          Zoom chart (if enabled)
Two-finger Pan: Scroll chart data

Edge Swipes:
Left Edge:      Open navigation drawer
Right Edge:     (Reserved for OS back)
```

## Success Metrics

- Initial render < 1.5 seconds on 3G
- Touch response < 100ms
- Smooth 60fps scroll/swipe
- Offline mode works with cached data
- All content accessible via screen reader
- Touch targets meet 44x44px minimum
- Pull-to-refresh completes < 3 seconds
