# Wireframe: DOM-USER-001 - Enhance User Activity View

## Story Reference

- **Story ID**: DOM-USER-001
- **Name**: Enhance User Activity View
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Activity Tab with DataTable and Pagination

## Overview

Add dedicated activity tab with pagination and export to user detail sidebar. Converts the existing "recent activity" section into a full-featured activity tab with 10 items per page and CSV export capability.

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Paginated activity log with 10 items per page
  - Column headers for timestamp, action, and details
  - Server-side sorting by date/time column

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Export confirmation dialog with date range filters
  - Field selection checkboxes for CSV columns
  - Modal overlay with backdrop

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Activity entry cards in mobile view
  - Compact activity display with timestamp and action details
  - Individual card states (loading skeleton, error)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | activities, users | IMPLEMENTED |
| **Server Functions** | Standard activity queries | AVAILABLE |
| **PRD Stories** | DOM-USER-001 | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/activities.ts`
- `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### User Detail Sidebar - Activity Tab (Mobile)

```
+----------------------------------------+
| <- Users                               |
+----------------------------------------+
|                                        |
|   +----------------------------------+ |
|   |      [Avatar]                    | |
|   |    John Smith                    | |
|   |    john@company.com              | |
|   |    [Admin] [Active]              | |
|   +----------------------------------+ |
|                                        |
+----------------------------------------+
| [Overview] [Activity] [Permissions]    |
|            ^^^^^^^^^                   |
+----------------------------------------+
|                                        |
|  Activity Log                [Export]  |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  | Jan 10, 2026 9:45 AM            |  |
|  | Updated customer "Acme Corp"    |  |
|  | Changed: status -> active       |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Jan 10, 2026 9:30 AM            |  |
|  | Created order #ORD-1234         |  |
|  | Customer: Beta Industries       |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Jan 10, 2026 9:15 AM            |  |
|  | Logged in                       |  |
|  | IP: 192.168.1.xxx               |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Jan 9, 2026 4:30 PM             |  |
|  | Updated profile settings        |  |
|  | Changed: notification prefs     |  |
|  +----------------------------------+  |
|                                        |
|  ... (6 more items)                    |
|                                        |
|  +----------------------------------+  |
|  |    < 1 [2] 3 4 ... 12 >         |  |
|  |    Showing 11-20 of 115         |  |
|  +----------------------------------+  |
|                                        |
+----------------------------------------+
```

### Export Confirmation Dialog (Mobile)

```
+----------------------------------------+
| Export Activity Log              [X]   |
+----------------------------------------+
|                                        |
|  Export activity log for John Smith?   |
|                                        |
|  This will download a CSV file         |
|  containing all activity records.      |
|                                        |
|  Records: 115                          |
|  File size: ~45 KB                     |
|                                        |
|  +----------------------------------+  |
|  |  Date Range (optional)          |  |
|  |  [Start Date_____] [End Date__] |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  |       (Cancel)   [Export CSV]   |  |
|  +----------------------------------+  |
|                                        |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### User Detail Sidebar - Activity Tab (Tablet)

```
+----------------------------------------------------------------+
| <- Back to Users                                                |
+----------------------------------------------------------------+
|                                                                 |
|  +-----------------------------------------------------------+ |
|  |  [Avatar]  John Smith                  [Edit] [Actions v] | |
|  |            john@company.com | Sales | Last seen: 2h ago   | |
|  |            [Admin] [Active]                               | |
|  +-----------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+
|  [Overview]  [Activity]  [Permissions]  [Groups]               |
|              ^^^^^^^^^^                                         |
+----------------------------------------------------------------+
|                                                                 |
|  Activity Log                                      [Export CSV] |
|  ----------------------------------------------------------------|
|                                                                 |
|  +---------------------------------------------------------+   |
|  | Date/Time         | Action          | Details           |   |
|  +---------------------------------------------------------+   |
|  | Jan 10, 9:45 AM   | Customer Update | Acme Corp status  |   |
|  | Jan 10, 9:30 AM   | Order Created   | #ORD-1234         |   |
|  | Jan 10, 9:15 AM   | Login           | 192.168.1.xxx     |   |
|  | Jan 9, 4:30 PM    | Profile Update  | Notification...   |   |
|  | Jan 9, 3:45 PM    | Quote Sent      | #QT-5678          |   |
|  | Jan 9, 2:00 PM    | Customer View   | Beta Industries   |   |
|  | Jan 9, 1:30 PM    | Order Updated   | #ORD-1230         |   |
|  | Jan 9, 11:00 AM   | Login           | 192.168.1.xxx     |   |
|  | Jan 8, 5:00 PM    | Logout          | Session ended     |   |
|  | Jan 8, 4:45 PM    | Report Export   | Sales report      |   |
|  +---------------------------------------------------------+   |
|                                                                 |
|  Showing 1-10 of 115 records           < 1 [2] 3 4 ... 12 >    |
|                                                                 |
+----------------------------------------------------------------+
```

### Export Dialog (Tablet)

```
+-------------------------------------------------------+
| Export Activity Log                              [X]   |
+-------------------------------------------------------+
|                                                        |
|  Export activity log for John Smith?                   |
|                                                        |
|  +-------------------------------------------------+  |
|  | Date Range:                                      |  |
|  | [Start Date____________] - [End Date__________] |  |
|  |                                                  |  |
|  | Include Fields:                                  |  |
|  | [x] Timestamp    [x] Action Type                |  |
|  | [x] Details      [x] IP Address                 |  |
|  | [x] Entity       [ ] Session ID                 |  |
|  +-------------------------------------------------+  |
|                                                        |
|  Records to export: 115                                |
|  Estimated file size: ~45 KB                           |
|                                                        |
|                        (Cancel)      [Export CSV]      |
|                                                        |
+-------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### User Detail Panel - Activity Tab (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+---------------------------------------------------------------------------------+
|        |                                                                                 |
| Dash   |  <- Back to Users                                                               |
| -----  |                                                                                 |
| Users  |  +----------------------------------------------------------------------------+ |
| -----  |  |                                                                            | |
| Groups |  |  [Avatar]   John Smith                            [Edit] [More Actions v] | |
| -----  |  |             john.smith@company.com                                         | |
| Roles  |  |             Department: Sales | Role: Admin | Last Active: 2 hours ago     | |
| -----  |  |             [Admin Badge] [Active Badge]                                   | |
| Audit  |  |                                                                            | |
|        |  +----------------------------------------------------------------------------+ |
|        |                                                                                 |
|        |  +----------------------------------------------------------------------------+ |
|        |  |  [Overview]    [Activity]    [Permissions]    [Groups]    [Delegations]   | |
|        |  |                ^^^^^^^^^^                                                  | |
|        |  +----------------------------------------------------------------------------+ |
|        |                                                                                 |
|        |  +----------------------------------------------------------------------------+ |
|        |  |                                                                            | |
|        |  |  Activity Log for John Smith                                [Export CSV]  | |
|        |  |  ------------------------------------------------------------------------ | |
|        |  |                                                                            | |
|        |  |  Filter: [All Actions v]  [Date Range: Last 30 days v]   [Search...]      | |
|        |  |                                                                            | |
|        |  |  +----------------------------------------------------------------------+ | |
|        |  |  | Date/Time           | Action Type     | Entity        | Details      | | |
|        |  |  +----------------------------------------------------------------------+ | |
|        |  |  | Jan 10, 2026 9:45   | Customer Update | Acme Corp     | status->act  | | |
|        |  |  | Jan 10, 2026 9:30   | Order Created   | #ORD-1234     | $5,200       | | |
|        |  |  | Jan 10, 2026 9:15   | Login           | -             | 192.168.1.x  | | |
|        |  |  | Jan 9, 2026 4:30    | Profile Update  | John Smith    | notif prefs  | | |
|        |  |  | Jan 9, 2026 3:45    | Quote Sent      | #QT-5678      | Beta Ind.    | | |
|        |  |  | Jan 9, 2026 2:00    | Customer View   | Beta Indust.  | -            | | |
|        |  |  | Jan 9, 2026 1:30    | Order Updated   | #ORD-1230     | qty changed  | | |
|        |  |  | Jan 9, 2026 11:00   | Login           | -             | 192.168.1.x  | | |
|        |  |  | Jan 8, 2026 5:00    | Logout          | -             | session end  | | |
|        |  |  | Jan 8, 2026 4:45    | Report Export   | Sales Report  | Q4 2025      | | |
|        |  |  +----------------------------------------------------------------------+ | |
|        |  |                                                                            | |
|        |  |  Showing 1-10 of 115 records                    < 1 [2] 3 4 5 ... 12 >    | |
|        |  |                                                                            | |
|        |  +----------------------------------------------------------------------------+ |
|        |                                                                                 |
+--------+---------------------------------------------------------------------------------+
```

### Export Dialog (Desktop)

```
+------------------------------------------------------------------------+
| Export Activity Log                                               [X]   |
+------------------------------------------------------------------------+
|                                                                         |
|  Export activity log for John Smith                                     |
|                                                                         |
|  +-------------------------------------------------------------------+ |
|  |                                                                   | |
|  |  Date Range                                                       | |
|  |  +---------------------------+  +---------------------------+     | |
|  |  | Start Date               |  | End Date                  |     | |
|  |  | [Jan 1, 2026       v]    |  | [Jan 10, 2026       v]    |     | |
|  |  +---------------------------+  +---------------------------+     | |
|  |                                                                   | |
|  |  Quick Select: (All Time) (Last 7 Days) (Last 30 Days) (YTD)     | |
|  |                                                                   | |
|  |  Include Fields:                                                  | |
|  |  [x] Timestamp       [x] Action Type      [x] Entity Type        | |
|  |  [x] Entity Name     [x] Details          [x] IP Address         | |
|  |  [ ] Session ID      [ ] User Agent       [x] Changes (JSON)     | |
|  |                                                                   | |
|  +-------------------------------------------------------------------+ |
|                                                                         |
|  Preview (first 3 records):                                             |
|  +-------------------------------------------------------------------+ |
|  | "2026-01-10 09:45","Customer Update","Acme Corp","status changed"| |
|  | "2026-01-10 09:30","Order Created","#ORD-1234","$5,200"          | |
|  | "2026-01-10 09:15","Login","","192.168.1.xxx"                    | |
|  +-------------------------------------------------------------------+ |
|                                                                         |
|  Total records: 115 | Estimated file size: ~45 KB                       |
|                                                                         |
|                                    (Cancel)        [Export CSV]         |
|                                                                         |
+------------------------------------------------------------------------+
```

---

## Interaction States

### Loading State

```
ACTIVITY TAB LOADING:
+-------------------------------------------------------+
|                                                        |
|  Activity Log                                          |
|  --------------------------------------------------   |
|                                                        |
|  +--------------------------------------------------+ |
|  | [..................................] |            | |
|  | [..................................] |            | |
|  | [..................................] |            | |
|  | [..................................] |            | |
|  | [..................................] |            | |
|  +--------------------------------------------------+ |
|                                                        |
|  Loading activity...                                   |
|                                                        |
+-------------------------------------------------------+
^ Skeleton rows with shimmer animation

EXPORT IN PROGRESS:
+--------------------------------------------------+
|  [Spinner] Exporting activity log...              |
|                                                   |
|  [================--------] 60%                   |
|                                                   |
|  Processing 115 records...                        |
|                                                   |
|                              [Cancel]             |
+--------------------------------------------------+
```

### Empty State

```
NO ACTIVITY RECORDS:
+-------------------------------------------------------+
|                                                        |
|  Activity Log                                          |
|  --------------------------------------------------   |
|                                                        |
|             +-------------------+                      |
|             |   [activity icon] |                      |
|             +-------------------+                      |
|                                                        |
|            No activity recorded                        |
|                                                        |
|     This user has not performed any                    |
|     trackable actions yet.                             |
|                                                        |
|     Activity will appear here once                     |
|     they start using the system.                       |
|                                                        |
+-------------------------------------------------------+

NO MATCHING RECORDS (filtered):
+-------------------------------------------------------+
|                                                        |
|  Activity Log                                          |
|  Filter: [Order Created v] [Last 7 days v]             |
|  --------------------------------------------------   |
|                                                        |
|            No matching activity                        |
|                                                        |
|     No "Order Created" actions found                   |
|     in the last 7 days.                                |
|                                                        |
|            [Clear Filters]                             |
|                                                        |
+-------------------------------------------------------+
```

### Error State

```
FAILED TO LOAD ACTIVITY:
+-------------------------------------------------------+
|                                                        |
|  Activity Log                                          |
|  --------------------------------------------------   |
|                                                        |
|  +--------------------------------------------------+ |
|  |  [!] Failed to load activity log                 | |
|  |                                                   | |
|  |  There was a problem loading the activity        | |
|  |  records. Please try again.                      | |
|  |                                                   | |
|  |                    [Retry]                        | |
|  +--------------------------------------------------+ |
|                                                        |
+-------------------------------------------------------+

EXPORT FAILED:
+--------------------------------------------------+
|  [!] Export failed                                |
|                                                   |
|  Unable to generate CSV file.                     |
|  Please try again or contact support.             |
|                                                   |
|              [Retry]    [Close]                   |
+--------------------------------------------------+
```

### Success State

```
EXPORT COMPLETE:
+--------------------------------------------------+
| [checkmark] Activity log exported successfully    |
|                                                   |
| john-smith-activity-2026-01-10.csv               |
| 115 records | 45 KB                               |
|                                                   |
| <- Toast notification (5s, auto-dismiss)         |
+--------------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Tab Navigation**
   - Tab headers: Overview -> Activity -> Permissions -> Groups
   - Within Activity tab: Filter dropdown -> Date range -> Search -> Export button
   - Table rows are not focusable by default
   - Pagination: Previous -> Page numbers -> Next
   - Export dialog: Date pickers -> Field checkboxes -> Cancel -> Export

2. **Keyboard Shortcuts**
   - `Tab`: Navigate between focusable elements
   - `Enter/Space`: Activate buttons, toggle checkboxes
   - `Arrow keys`: Navigate within date picker, pagination
   - `Escape`: Close export dialog, close dropdowns

### ARIA Requirements

```html
<!-- Activity Tab Panel -->
<div
  role="tabpanel"
  id="activity-panel"
  aria-labelledby="activity-tab"
  tabindex="0"
>
  ...
</div>

<!-- Activity Tab Button -->
<button
  role="tab"
  id="activity-tab"
  aria-selected="true"
  aria-controls="activity-panel"
>
  Activity
</button>

<!-- Activity Table -->
<table
  role="table"
  aria-label="Activity log for John Smith"
>
  <thead>
    <tr>
      <th scope="col" aria-sort="descending">Date/Time</th>
      <th scope="col">Action Type</th>
      <th scope="col">Entity</th>
      <th scope="col">Details</th>
    </tr>
  </thead>
  ...
</table>

<!-- Pagination -->
<nav aria-label="Activity log pagination">
  <button aria-label="Previous page" aria-disabled="false">
    <
  </button>
  <button aria-label="Page 1">1</button>
  <button aria-label="Page 2, current page" aria-current="page">2</button>
  ...
</nav>

<!-- Export Button -->
<button
  aria-label="Export activity log as CSV"
  aria-haspopup="dialog"
>
  Export CSV
</button>

<!-- Export Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="export-dialog-title"
>
  <h2 id="export-dialog-title">Export Activity Log</h2>
  ...
</dialog>

<!-- Loading State -->
<div
  role="status"
  aria-live="polite"
  aria-label="Loading activity log"
>
  Loading...
</div>
```

### Screen Reader Announcements

- Tab selection: "Activity tab, selected"
- Page change: "Page 2 of 12, showing items 11 to 20 of 115"
- Export started: "Exporting activity log, please wait"
- Export complete: "Activity log exported successfully, 115 records"
- Error: "Failed to load activity log, retry button available"
- Empty state: "No activity records found"
- Filter applied: "Showing 23 results for Order Created in last 7 days"

---

## Animation Choreography

### Tab Transition

```
TAB SWITCH:
- Duration: 250ms
- Easing: ease-out
- Old content: opacity 1 -> 0, translateY(0) -> translateY(-8px)
- New content: opacity 0 -> 1, translateY(8px) -> translateY(0)
- Indicator bar: slide to new tab position (250ms)
```

### Table Loading

```
SKELETON SHIMMER:
- Duration: 1.5s
- Easing: linear
- Animation: gradient sweep left to right
- Loop: infinite until data loads

DATA APPEAR:
- Duration: 300ms
- Easing: ease-out
- Staggered rows: 50ms delay between each row
- Opacity: 0 -> 1
- Transform: translateY(8px) -> translateY(0)
```

### Pagination

```
PAGE CHANGE:
- Duration: 200ms
- Easing: ease-in-out
- Old rows: fade out (100ms)
- New rows: fade in with stagger (200ms)
- Active page indicator: slide to new position (150ms)
```

### Export Dialog

```
OPEN:
- Duration: 250ms
- Easing: ease-out
- Backdrop: opacity 0 -> 0.5
- Dialog: scale(0.95) -> scale(1), opacity 0 -> 1

CLOSE:
- Duration: 200ms
- Easing: ease-in
- Backdrop: opacity 0.5 -> 0
- Dialog: scale(1) -> scale(0.95), opacity 1 -> 0

PROGRESS BAR:
- Duration: continuous
- Easing: linear
- Width: animate to current percentage
- Color: stays consistent during export
```

### Toast Notification

```
APPEAR:
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1

AUTO-DISMISS:
- Delay: 5000ms
- Duration: 200ms
- Transform: translateY(0) -> translateY(-20px)
- Opacity: 1 -> 0
```

---

## Component Props Interfaces

```typescript
// Activity Tab Component
interface UserActivityTabProps {
  userId: string;
  initialPage?: number;
  pageSize?: number;  // Default: 10
}

// Activity Log Entry
interface ActivityLogEntry {
  id: string;
  userId: string;
  timestamp: Date;
  actionType: ActivityActionType;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  sessionId?: string;
  userAgent?: string;
}

// Activity Action Types
type ActivityActionType =
  | 'login'
  | 'logout'
  | 'customer_create'
  | 'customer_update'
  | 'customer_view'
  | 'order_create'
  | 'order_update'
  | 'quote_create'
  | 'quote_sent'
  | 'profile_update'
  | 'report_export'
  | 'settings_change';

// Activity Table Component
interface ActivityTableProps {
  entries: ActivityLogEntry[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

// Pagination Component
interface ActivityPaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// Export Dialog Component
interface ActivityExportDialogProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

// Export Options
interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  includeFields: ExportField[];
}

type ExportField =
  | 'timestamp'
  | 'actionType'
  | 'entityType'
  | 'entityName'
  | 'details'
  | 'ipAddress'
  | 'sessionId'
  | 'userAgent'
  | 'changes';

// Filter Component
interface ActivityFilterProps {
  actionTypes: ActivityActionType[];
  dateRange: { start: Date; end: Date } | null;
  searchQuery: string;
  onActionTypeChange: (types: ActivityActionType[]) => void;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

// Empty State Component
interface ActivityEmptyStateProps {
  type: 'no-activity' | 'no-results';
  filterApplied?: boolean;
  onClearFilters?: () => void;
}

// Error State Component
interface ActivityErrorStateProps {
  message: string;
  onRetry: () => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/users/user-activity-tab.tsx` | Main activity tab container |
| `src/components/domain/users/activity-table.tsx` | Activity log table with sorting |
| `src/components/domain/users/activity-pagination.tsx` | Pagination controls |
| `src/components/domain/users/activity-export-dialog.tsx` | Export configuration dialog |
| `src/components/domain/users/activity-filter.tsx` | Filter controls |
| `src/components/domain/users/activity-empty-state.tsx` | Empty/no results state |
| `src/hooks/use-user-activity.ts` | Activity data fetching hook |
| `src/server/functions/users/get-user-activity.ts` | Server function |
| `src/server/functions/users/export-user-activity.ts` | Export server function |
