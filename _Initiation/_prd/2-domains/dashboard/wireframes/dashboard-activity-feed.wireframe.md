# Dashboard Activity Feed Wireframe

**Story:** Related to dashboard widgets ecosystem
**Purpose:** Real-time timeline of business activities for quick status awareness
**Design Aesthetic:** Scannable timeline - quick updates with contextual actions

---

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Widget container with header section for title and filter controls
  - Body section for scrollable activity feed list
  - Consistent padding and spacing for timeline items

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Status indicators for activity types (Order, Issue, Deal, etc.)
  - Color-coded badges (blue, green, red, orange) based on activity context
  - "NEW" badge for real-time activity highlights

### Avatar
- **Pattern**: RE-UI Avatar
- **Reference**: `_reference/.reui-reference/registry/default/ui/avatar.tsx`
- **Features**:
  - User photo display for activity items (40x40px standard)
  - System icon fallback for automated events
  - Entity-specific icons for entity events

### Button
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Quick action buttons (View, Dismiss) for each activity item
  - Filter toggle button in header
  - Load More pagination button
  - Variant styling for context (primary, ghost, outline)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/activities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Activity Feed Widget Container

```
+================================================+
|  ACTIVITY FEED WIDGET                           |
+================================================+
|  +------------------------------------------+  |
|  | [Clock] Recent Activity    [Filter v] [...]|  <- Header with filter
|  +------------------------------------------+  |
|  |                                          |  |
|  |  TODAY                                   |  <- Date group header
|  |  +--------------------------------------+|  |
|  |  | [Avatar] John sent quote QT-2456     ||  <- Activity item
|  |  | Brisbane Solar Co - 15kWh system     ||  |
|  |  | 2 hours ago                   [View] ||  <- Timestamp + action
|  |  +--------------------------------------+|  |
|  |  +--------------------------------------+|  |
|  |  | [Avatar] Jane completed install      ||  |
|  |  | 10kWh commercial battery - Perth     ||  |
|  |  | 3 hours ago                   [View] ||  |
|  |  +--------------------------------------+|  |
|  |  +--------------------------------------+|  |
|  |  | [System] Warranty claim opened       ||  |
|  |  | PR-12: Battery performance issue     ||  |
|  |  | 4 hours ago                [Dismiss] ||  |
|  |  +--------------------------------------+|  |
|  |                                          |  |
|  |  YESTERDAY                               |  <- Previous date group
|  |  +--------------------------------------+|  |
|  |  | [Avatar] Sarah won quote             ||  |
|  |  | Sydney Energy Sys - 50kWh commercial ||  |
|  |  | Yesterday at 4:30 PM          [View] ||  |
|  |  +--------------------------------------+|  |
|  |                                          |  |
|  +------------------------------------------+  |
|  |        [Load More Activities]            |  <- Pagination
|  +------------------------------------------+  |
+================================================+
```

## Activity Item Anatomy

```
+====================================================+
|  ACTIVITY ITEM - DETAILED VIEW                      |
+====================================================+
|  +------------------------------------------------+|
|  |  +------+  Activity Title Text                 ||
|  |  |      |  Description or context line         ||
|  |  | [Av] |  that provides additional info       ||
|  |  |      |                                      ||
|  |  +------+  [Time] [Entity Link] [Action]       ||
|  +------------------------------------------------+|
+====================================================+

Avatar (40x40):
- User photo for user actions
- System icon for automated events
- Entity icon for entity-specific events

Activity Title:
- Bold actor name + verb + object
- "John created order ORD-1234"
- "System generated invoice INV-789"

Description:
- Context about the activity
- Entity name, value, status change
- Truncated to 2 lines max

Footer:
- Relative timestamp (2 hours ago)
- Quick action link (View, Dismiss)
```

## Activity Types & Icons

```
+--------------------------------------------+
| TYPE            | ICON    | COLOR          |
+--------------------------------------------+
| Order Created   | [Box]   | Blue           |
| Order Updated   | [Edit]  | Blue           |
| Order Shipped   | [Truck] | Green          |
| Order Delivered | [Check] | Green          |
+--------------------------------------------+
| Issue Created   | [Alert] | Red            |
| Issue Resolved  | [Check] | Green          |
| Issue Updated   | [Edit]  | Orange         |
+--------------------------------------------+
| Deal Won        | [Trophy]| Green          |
| Deal Lost       | [X]     | Red            |
| Deal Updated    | [Edit]  | Blue           |
+--------------------------------------------+
| Customer Added  | [User+] | Blue           |
| Customer Updated| [Edit]  | Blue           |
+--------------------------------------------+
| Warranty Created| [Shield]| Blue           |
| Warranty Expiring| [Clock]| Orange         |
+--------------------------------------------+
| System Alert    | [Bell]  | Orange/Red     |
| Low Stock       | [Warn]  | Orange         |
| Threshold Met   | [Target]| Green          |
+--------------------------------------------+
```

## Activity Feed Filters

```
+------------------------------------------+
| Filter Activities                [X]     |
+------------------------------------------+
| Activity Type:                           |
| [x] All Activities                       |
| [ ] Orders Only                          |
| [ ] Pipeline Only                        |
| [ ] Issues Only                          |
| [ ] System Alerts Only                   |
+------------------------------------------+
| Time Range:                              |
| [x] Today                                |
| [ ] Last 7 Days                          |
| [ ] Last 30 Days                         |
| [ ] Custom Range                         |
+------------------------------------------+
| User:                                    |
| [All Users v]                            |
| +-------------------------------------+  |
| | [ ] John Doe                        |  |
| | [ ] Jane Smith                      |  |
| | [ ] System Events                   |  |
| +-------------------------------------+  |
+------------------------------------------+
| [Apply Filters]        [Clear All]       |
+------------------------------------------+
```

## Activity Item Variants

### Quote Activity

```
+------------------------------------------+
| +------+  John sent quote QT-2456        |
| | [Av] |  Brisbane Solar Co              |
| | John |  15kWh residential system       |
| +------+  2 hours ago              [View]|
+------------------------------------------+
```

### Installation Activity

```
+------------------------------------------+
| +------+  Sarah completed installation   |
| | [Av] |  Sydney Energy Systems          |
| | Sarah|  50kWh commercial battery       |
| +------+  3 hours ago              [View]|
+------------------------------------------+
```

### Warranty Activity

```
+------------------------------------------+
| +------+  Jane opened warranty claim     |
| | [Av] |  "Battery performance issue"    |
| | Jane |  Project PR-12 - High Priority  |
| +------+  4 hours ago              [View]|
+------------------------------------------+
```

### System Alert Activity

```
+------------------------------------------+
| +------+  Low stock alert                |
| |[Sys] |  Inverter-5kW at 3 units        |
| | Bell |  Reorder threshold: 8 units     |
| +------+  5 hours ago           [Dismiss]|
+------------------------------------------+
```

### Warranty Expiring Activity

```
+------------------------------------------+
| +------+  Warranties expiring soon       |
| |[Sys] |  5 warranties expire in 30 days |
| |Shield|  Brisbane SC, Sydney ES, Perth R|
| +------+  1 day ago           [View All] |
+------------------------------------------+
```

## Activity Feed States

### Loading State

```
+------------------------------------------+
| [Clock] Recent Activity                  |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  | [====] [===================]         ||
|  | [===============]                    ||
|  | [=====]                       [===]  ||
|  +--------------------------------------+|
|  +--------------------------------------+|
|  | [====] [===================]         ||
|  | [===============]                    ||
|  | [=====]                       [===]  ||
|  +--------------------------------------+|
|  +--------------------------------------+|
|  | [====] [===================]         ||
|  | [===============]                    ||
|  | [=====]                       [===]  ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

### Empty State

```
+------------------------------------------+
| [Clock] Recent Activity                  |
+------------------------------------------+
|                                          |
|         [Empty activity icon]            |
|                                          |
|         No recent activity               |
|                                          |
|    Activity from your team will          |
|    appear here as it happens.            |
|                                          |
|    [Go to Orders]  [Go to Pipeline]      |
|                                          |
+------------------------------------------+
```

### Error State

```
+------------------------------------------+
| [Clock] Recent Activity           [!]    |
+------------------------------------------+
|                                          |
|         [Error icon]                     |
|                                          |
|    Unable to load activities             |
|                                          |
|    Check your connection and try again.  |
|                                          |
|    [Retry]                               |
|                                          |
+------------------------------------------+
```

## Responsive Behavior

### Desktop (Full Width Widget)

```
+------------------------------------------+
| Full activity feed with:                 |
| - Avatar images visible                  |
| - Full description text                  |
| - Inline action buttons                  |
| - Date group headers                     |
| - Filter dropdown                        |
+------------------------------------------+
```

### Tablet (Compact)

```
+----------------------------------+
| Activity feed with:              |
| - Smaller avatars (32x32)        |
| - Truncated descriptions         |
| - Action on tap (not inline)     |
| - Sticky date headers            |
+----------------------------------+
```

### Mobile (Card Stack)

```
+----------------------------+
| Activity feed as cards:    |
| - Full-width cards         |
| - Tap to expand details    |
| - Swipe to dismiss alerts  |
| - Pull to refresh          |
+----------------------------+
```

## Real-Time Updates

```
New Activity Notification:

+------------------------------------------+
| [*] 3 new activities                     |  <- Sticky notification
|     [Click to load]                      |
+------------------------------------------+
| [Clock] Recent Activity                  |
+------------------------------------------+
|                                          |
|  TODAY                                   |
|  +--------------------------------------+|
|  | [NEW badge] Just now                 ||  <- New item highlight
|  | [Avatar] Mike shipped order ORD-5678 ||
|  | Delta Co - $890                      ||
|  | Just now                      [View] ||
|  +--------------------------------------+|
|  ...                                     |
```

## Quick Actions Panel

```
Activity Item Hover/Tap Actions:

+------------------------------------------+
| +------+  John created order ORD-1234    |
| | [Av] |  Acme Corp - $1,250             |
| +------+  2 hours ago                    |
|                                          |
|  [View Order] [View Customer] [Comment]  |  <- Expanded actions
+------------------------------------------+
```

## Accessibility Requirements

### ARIA Structure

```tsx
<section aria-label="Recent Activity Feed" role="feed">
  <h2 id="activity-heading">Recent Activity</h2>
  <div role="list" aria-labelledby="activity-heading">
    <article role="listitem" aria-label="Order created by John">
      <time dateTime="2024-12-10T14:30:00">2 hours ago</time>
      <p>John created order ORD-1234 for Acme Corp worth $1,250</p>
      <a href="/orders/1234">View order</a>
    </article>
  </div>
</section>
```

### Keyboard Navigation

```
Tab: Move between activity items
Enter: Activate primary action (View)
Arrow Down/Up: Navigate within feed
Escape: Close expanded actions
```

### Screen Reader Announcements

```
"Activity feed. 15 recent activities.
John created order ORD-1234 for Acme Corp,
worth one thousand two hundred fifty dollars,
2 hours ago. Press Enter to view order."
```

## Live Region Updates

```tsx
// Announce new activities
<div aria-live="polite" aria-atomic="false">
  <span className="sr-only">
    New activity: Mike shipped order ORD-5678
  </span>
</div>

// Announce filter changes
<div aria-live="polite">
  <span className="sr-only">
    Showing 8 order activities from today
  </span>
</div>
```

## Component Props Interface

```typescript
interface ActivityFeedProps {
  // Data
  activities: Activity[];
  totalCount: number;
  hasMore: boolean;

  // Filters
  filters?: ActivityFilters;
  onFilterChange?: (filters: ActivityFilters) => void;

  // Pagination
  onLoadMore?: () => void;
  isLoadingMore?: boolean;

  // Real-time
  newActivityCount?: number;
  onLoadNewActivities?: () => void;

  // States
  isLoading?: boolean;
  error?: Error | null;

  // Callbacks
  onActivityClick?: (activity: Activity) => void;
  onActivityDismiss?: (activityId: string) => void;
}

interface Activity {
  id: string;
  type: ActivityType;
  actor: {
    id: string;
    name: string;
    avatar?: string;
    isSystem?: boolean;
  };
  action: string;
  target: {
    type: string;
    id: string;
    name: string;
    value?: number;
  };
  description?: string;
  timestamp: Date;
  isNew?: boolean;
  isDismissible?: boolean;
}

interface ActivityFilters {
  types?: ActivityType[];
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}
```

## Success Metrics

- Activities load within 1 second
- New activities appear within 5 seconds of occurrence
- Users can identify activity type at a glance
- Quick actions accessible within 2 clicks
- Feed updates don't cause layout shift
- Keyboard users can navigate entire feed
