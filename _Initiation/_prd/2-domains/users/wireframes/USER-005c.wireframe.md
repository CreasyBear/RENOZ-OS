# Wireframe: DOM-USER-005c - Last Login UI Display

## Story Reference

- **Story ID**: DOM-USER-005c
- **Name**: Last Login UI Display
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: DataTable column with Badge indicator

## Overview

Show last login in user views with inactive alert. Displays last login column in user list DataTable with relative time format, last login on user detail panel, visual indicator badge (warning variant) for users inactive >30 days, and sortable column header. Mobile responsive with column hidden in list but shown in detail view.

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Sortable last login column (ascending/descending)
  - Column visibility toggle for mobile/desktop
  - Tooltip on hover showing full timestamp and device info

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Warning badge for inactive users (>30 days)
  - Destructive badge for expired invitations
  - Pulse animation for attention on inactive status

### Alert
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Inactive user alert banner on detail panel
  - Warning variant with action buttons
  - Recommended actions (send reminder, deactivate)

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Last login filter dropdown with predefined ranges
  - Custom date range option
  - Active/inactive/never logged in filtering

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | users (lastActiveAt field) | IMPLEMENTED |
| **Server Functions** | Standard user queries | AVAILABLE |
| **PRD Stories** | DOM-USER-005c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### User List - Mobile (Last Login Hidden in Table)

```
+----------------------------------------+
| Users                         [+ New]  |
+----------------------------------------+
| +------------------------------------+ |
| | [Search users...              ]    | |
| +------------------------------------+ |
| +------------------+ +---------------+ |
| | Role: All     v  | | Status: All v | |
| +------------------+ +---------------+ |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [Avatar] Sarah Johnson             | |
| | sarah@company.com                  | |
| | Admin                              | |
| |                        Active  [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] John Smith                | |
| | john@company.com                   | |
| | Sales                              | |
| |                        Active  [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] Mike Chen          [!]    | |
| | mike@company.com                   | |
| | Operations        Inactive 45 days | |
| |                        Active  [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] Emily Davis               | |
| | emily@company.com                  | |
| | Sales                              | |
| |                        Active  [*] | |
| +------------------------------------+ |
|                                        |
| Showing 1-10 of 25 users               |
|                                        |
+----------------------------------------+
```

### User Detail - Mobile (Last Login Shown)

```
+----------------------------------------+
| <- Users                               |
+----------------------------------------+
|                                        |
|   +----------------------------------+ |
|   |       [Avatar]                   | |
|   |     John Smith                   | |
|   |     john@company.com             | |
|   |     [Admin] [Active]             | |
|   +----------------------------------+ |
|                                        |
+----------------------------------------+
| [Overview] [Activity] [Permissions]    |
+----------------------------------------+
|                                        |
| User Information                       |
| --------------------------------       |
|                                        |
| Role                                   |
| Sales Representative                   |
|                                        |
| Department                             |
| Sales                                  |
|                                        |
| Status                                 |
| [*] Active                             |
|                                        |
| --------------------------------       |
|                                        |
| Activity                               |
| --------------------------------       |
|                                        |
| Last Login                             |
| 2 hours ago                            |
| Jan 10, 2026 at 9:45 AM                |
|                                        |
| Last Active                            |
| 30 minutes ago                         |
|                                        |
| Member Since                           |
| March 15, 2024                         |
|                                        |
+----------------------------------------+
```

### User Detail - Inactive User (Mobile)

```
+----------------------------------------+
| <- Users                               |
+----------------------------------------+
|                                        |
|   +----------------------------------+ |
|   |       [Avatar]                   | |
|   |     Mike Chen                    | |
|   |     mike@company.com             | |
|   |     [Viewer] [Active]            | |
|   +----------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [!] Inactive User                  | |
| | ---------------------------------- | |
| | This user hasn't logged in for     | |
| | 45 days.                           | |
| |                                    | |
| | Last login: Nov 26, 2025           | |
| |                                    | |
| | Consider:                          | |
| | - Sending a reminder email         | |
| | - Reviewing their account status   | |
| | - Deactivating if no longer needed | |
| |                                    | |
| | [Send Reminder]  (View Activity)   | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
| [Overview] [Activity] [Permissions]    |
+----------------------------------------+
| ...                                    |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### User List with Compact Last Login Column (Tablet)

```
+----------------------------------------------------------------+
| Users                                          [+ Invite User]  |
+----------------------------------------------------------------+
| [Search users________________] [Role: All v] [Status: All v]    |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | [ ] | User              | Role        | Last Login | Status | |
| +-------------------------------------------------------------+ |
| | [ ] | Sarah Johnson     | Admin       | 2h ago     | [*] Act| |
| |     | sarah@company.com |             |            |        | |
| +-------------------------------------------------------------+ |
| | [ ] | John Smith        | Sales       | 5h ago     | [*] Act| |
| |     | john@company.com  |             |            |        | |
| +-------------------------------------------------------------+ |
| | [ ] | Mike Chen     [!] | Operations  | 45 days    | [*] Act| |
| |     | mike@company.com  |             | ago        |        | |
| +-------------------------------------------------------------+ |
| | [ ] | Emily Davis       | Sales       | 1 day ago  | [*] Act| |
| |     | emily@company.com |             |            |        | |
| +-------------------------------------------------------------+ |
| | [ ] | Lisa Wong     [!] | Marketing   | 32 days    | [*] Act| |
| |     | lisa@company.com  |             | ago        |        | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Showing 1-10 of 25 users                    < 1 [2] 3 >         |
|                                                                 |
+----------------------------------------------------------------+
```

### User Detail Panel (Tablet)

```
+----------------------------------------------------------------+
| <- Back to Users                                                |
+----------------------------------------------------------------+
|                                                                 |
|  +-----------------------------------------------------------+ |
|  |  [Avatar]  John Smith                  [Edit] [Actions v] | |
|  |            john@company.com | Sales                       | |
|  |            [Sales Rep] [Active]                           | |
|  +-----------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+
|  [Overview]  [Activity]  [Permissions]  [Groups]               |
+----------------------------------------------------------------+
|                                                                 |
|  +----------------------------+ +----------------------------+  |
|  | User Information          | | Login Activity             |  |
|  | -------------------------  | | -------------------------  |  |
|  |                           | |                            |  |
|  | Role: Sales Rep           | | Last Login                 |  |
|  | Department: Sales         | | 2 hours ago                |  |
|  | Location: Melbourne       | | Jan 10, 2026 9:45 AM       |  |
|  | Reports to: Sarah J.      | |                            |  |
|  |                           | | Last Active                |  |
|  |                           | | 30 minutes ago             |  |
|  |                           | |                            |  |
|  |                           | | Logins This Month: 18      |  |
|  |                           | | Average Session: 4.5 hrs   |  |
|  |                           | |                            |  |
|  +----------------------------+ +----------------------------+  |
|                                                                 |
+----------------------------------------------------------------+
```

### Inactive User Alert (Tablet)

```
+----------------------------------------------------------------+
| <- Back to Users                                                |
+----------------------------------------------------------------+
|                                                                 |
|  +-----------------------------------------------------------+ |
|  |  [Avatar]  Mike Chen                   [Edit] [Actions v] | |
|  |            mike@company.com | Operations                  | |
|  |            [Viewer] [Active] [!] Inactive 45 days         | |
|  +-----------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | [!] User Inactive for Extended Period                       | |
| | ----------------------------------------------------------- | |
| |                                                             | |
| | Mike Chen hasn't logged in for 45 days.                     | |
| |                                                             | |
| | Last login: November 26, 2025 at 3:30 PM                    | |
| |                                                             | |
| |        [Send Reminder Email]    [Deactivate User]           | |
| +-------------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### User List with Full Last Login Column (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| Dash   |  Users                                                     [+ Invite User]       |
| -----  |  ------------------------------------------------------------------------------- |
| Users  |                                                                                  |
| <----  |  [Search users________________________] [Role v] [Status v] [Last Login v]       |
| Groups |                                                                                  |
| -----  |  Filter by Last Login: (All) (Active) (Inactive 30+ days) (Never logged in)     |
| Roles  |                                                                                  |
| -----  |  +--------------------------------------------------------------------------+   |
| Audit  |  |                                                                          |   |
|        |  | [ ] | User            | Email              | Role      | Last Login ^   |   |
|        |  |     |                 |                    |           |                |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] Sarah J.   | sarah@company.com  | Admin     | 2 hours ago    |   |
|        |  |     | Sales Manager   |                    |           | Jan 10, 9:45a  |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] John Smith | john@company.com   | Sales     | 5 hours ago    |   |
|        |  |     | Sales Rep       |                    |           | Jan 10, 6:30a  |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] Mike C.[!] | mike@company.com   | Viewer    | [!] 45 days ago|   |
|        |  |     | Operations      |                    |           | Nov 26, 2025   |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] Emily D.   | emily@company.com  | Sales     | 1 day ago      |   |
|        |  |     | Sales Rep       |                    |           | Jan 9, 2:15p   |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] Lisa W.[!] | lisa@company.com   | Marketing | [!] 32 days ago|   |
|        |  |     | Marketing       |                    |           | Dec 9, 2025    |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] Tom Brown  | tom@company.com    | Support   | 3 hours ago    |   |
|        |  |     | Support Lead    |                    |           | Jan 10, 8:15a  |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [ ] | [Av] Jane Doe   | jane@company.com   | Admin     | Never          |   |
|        |  |     | CEO             |                    |           | (Pending)      |   |
|        |  +--------------------------------------------------------------------------+   |
|        |                                                                                  |
|        |  Showing 1-10 of 25 users                              < 1 [2] 3 >               |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### Last Login Column - Sorted Ascending

```
+--------------------------------------------------------------------------+
|                                                                          |
| [ ] | User            | Email              | Role      | Last Login ^   |
|     |                 |                    |           |                |
+--------------------------------------------------------------------------+
| [ ] | [Av] Jane Doe   | jane@company.com   | Admin     | Never          |
|     | CEO             |                    |           | (Invited Jan 5)|
+--------------------------------------------------------------------------+
| [ ] | [Av] Mike C.[!] | mike@company.com   | Viewer    | [!] 45 days    |
|     | Operations      |                    |           | Nov 26, 2025   |
+--------------------------------------------------------------------------+
| [ ] | [Av] Lisa W.[!] | lisa@company.com   | Marketing | [!] 32 days    |
|     | Marketing       |                    |           | Dec 9, 2025    |
+--------------------------------------------------------------------------+
| [ ] | [Av] Emily D.   | emily@company.com  | Sales     | 1 day ago      |
|     | Sales Rep       |                    |           | Jan 9, 2:15p   |
+--------------------------------------------------------------------------+
...
```

### User Detail Panel - Login Activity Section (Desktop)

```
+-------------------------------------------------------------------------------------------+
| User Detail: John Smith                                                                   |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  |  [Avatar]    John Smith                                    [Edit] [More Actions v] | |
|  |              john.smith@company.com                                                | |
|  |              Department: Sales | Role: Sales Rep | [Active]                        | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |  [Overview]    [Activity]    [Permissions]    [Groups]                             | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  +-------------------------------------------+ +-------------------------------------+   |
|  |                                           | |                                     |   |
|  | User Information                          | | Login Activity                      |   |
|  | ----------------------------------------- | | ----------------------------------- |   |
|  |                                           | |                                     |   |
|  | Role: Sales Representative                | | Last Login                          |   |
|  | Department: Sales                         | | +-------------------------------+   |   |
|  | Location: Melbourne Office                | | | 2 hours ago                   |   |   |
|  | Reports to: Sarah Johnson                 | | | January 10, 2026 at 9:45 AM   |   |   |
|  | Employee ID: EMP-1234                     | | | IP: 192.168.1.xxx             |   |   |
|  |                                           | | | Device: Chrome on macOS       |   |   |
|  |                                           | | +-------------------------------+   |   |
|  |                                           | |                                     |   |
|  |                                           | | Last Active: 30 minutes ago         |   |
|  |                                           | |                                     |   |
|  |                                           | | Login Statistics (This Month)       |   |
|  |                                           | | +-------------------------------+   |   |
|  |                                           | | | Total Logins: 18              |   |   |
|  |                                           | | | Avg Session: 4.5 hours        |   |   |
|  |                                           | | | Login Streak: 12 days         |   |   |
|  |                                           | | +-------------------------------+   |   |
|  |                                           | |                                     |   |
|  +-------------------------------------------+ +-------------------------------------+   |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Inactive User Detail Panel (Desktop)

```
+-------------------------------------------------------------------------------------------+
| User Detail: Mike Chen                                                                    |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  |  [Avatar]    Mike Chen                                     [Edit] [More Actions v] | |
|  |              mike@company.com                                                      | |
|  |              Department: Operations | Role: Viewer | [Active]                      | |
|  |              [!] Inactive for 45 days                                              | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
| +--------------------------------------------------------------------------------------+ |
| |                                                                                      | |
| | [!] User Inactive for Extended Period                                                | |
| | -----------------------------------------------------------------------------------  | |
| |                                                                                      | |
| | Mike Chen hasn't logged into the system for 45 days.                                 | |
| |                                                                                      | |
| | Last Login: November 26, 2025 at 3:30 PM                                             | |
| | Last Known IP: 192.168.1.xxx                                                         | |
| | Last Device: Safari on iOS                                                           | |
| |                                                                                      | |
| | Recommended Actions:                                                                 | |
| | - Send a reminder email to check if they still need access                           | |
| | - Review their recent activity before the last login                                 | |
| | - Consider deactivating if the account is no longer needed                           | |
| |                                                                                      | |
| |                  [Send Reminder Email]    [View Activity]    [Deactivate User]       | |
| |                                                                                      | |
| +--------------------------------------------------------------------------------------+ |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Last Login Filter Dropdown (Desktop)

```
+--------------------------------+
| Last Login Filter              |
+--------------------------------+
|                                |
| (o) All Users                  |
|                                |
| ( ) Active (Last 7 days)       |
|                                |
| ( ) Recently Active (30 days)  |
|                                |
| ( ) Inactive (30+ days)        |
|                                |
| ( ) Very Inactive (60+ days)   |
|                                |
| ( ) Never Logged In            |
|                                |
| ---------------------------    |
|                                |
| Custom Range:                  |
| [From______] - [To______]      |
|                                |
|              [Apply Filter]    |
|                                |
+--------------------------------+
```

---

## Interaction States

### Loading States

```
USER LIST LOADING:
+-------------------------------------------------------------+
| Users                                                        |
+-------------------------------------------------------------+
|                                                              |
| +----------------------------------------------------------+ |
| | [ ] | [........] | [...........] | [.....] | [.......] | | |
| | [ ] | [........] | [...........] | [.....] | [.......] | | |
| | [ ] | [........] | [...........] | [.....] | [.......] | | |
| | [ ] | [........] | [...........] | [.....] | [.......] | | |
| +----------------------------------------------------------+ |
|                                                              |
| Loading users...                                             |
+-------------------------------------------------------------+
^ Skeleton rows with shimmer animation

LOGIN INFO LOADING (in detail):
+-------------------------------+
| Login Activity                |
| ----------------------------- |
|                               |
| [..........................] |
| [..........................] |
| [..........................] |
|                               |
+-------------------------------+
```

### Empty States

```
NO USERS MATCH FILTER:
+-------------------------------------------------------------+
|                                                              |
|          No inactive users found                             |
|                                                              |
|   Great news! All users have logged in                       |
|   within the last 30 days.                                   |
|                                                              |
|          [Clear Filter]                                      |
|                                                              |
+-------------------------------------------------------------+

NO USERS IN SYSTEM:
+-------------------------------------------------------------+
|                                                              |
|              +-------------------+                           |
|              |   [users icon]    |                           |
|              +-------------------+                           |
|                                                              |
|             No users yet                                     |
|                                                              |
|   Start by inviting team members to                          |
|   your organization.                                         |
|                                                              |
|          [Invite Users]                                      |
|                                                              |
+-------------------------------------------------------------+
```

### Error States

```
FAILED TO LOAD USERS:
+-------------------------------------------------------------+
|                                                              |
|  +--------------------------------------------------------+ |
|  | [!] Failed to load users                                | |
|  |                                                          | |
|  | There was a problem loading the user list.              | |
|  | Please try again.                                        | |
|  |                                                          | |
|  |                      [Retry]                             | |
|  +--------------------------------------------------------+ |
|                                                              |
+-------------------------------------------------------------+

FAILED TO SEND REMINDER:
+------------------------------------------+
| [!] Failed to send reminder               |
|                                          |
| Could not send the reminder email to      |
| mike@company.com.                         |
|                                          |
|         [Retry]    [Cancel]              |
+------------------------------------------+
```

### Success States

```
REMINDER SENT:
+------------------------------------------+
| [checkmark] Reminder email sent           |
|                                          |
| A reminder has been sent to Mike Chen    |
| at mike@company.com.                      |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

USER DEACTIVATED:
+------------------------------------------+
| [checkmark] User deactivated              |
|                                          |
| Mike Chen's account has been deactivated.|
| They will no longer be able to log in.   |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+
```

### Hover States

```
LAST LOGIN CELL HOVER (shows full timestamp):
+---------------------------------------------+
| [!] 45 days ago                              |
| +------------------------------------------+|
| | November 26, 2025 at 3:30:45 PM          ||
| | IP: 192.168.1.100                        ||
| | Device: Safari on iOS 17.2               ||
| +------------------------------------------+|
+---------------------------------------------+
^ Tooltip showing full details

INACTIVE BADGE HOVER:
+---------------------------------------------+
| [!] Inactive                                 |
| +------------------------------------------+|
| | User hasn't logged in for 45 days        ||
| | Consider sending a reminder or            ||
| | deactivating the account.                 ||
| +------------------------------------------+|
+---------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **User List Page**
   - Search input -> Role filter -> Status filter -> Last Login filter
   - Table header cells (sortable) in order
   - Table rows -> Action buttons per row
   - Pagination controls

2. **User Detail Panel**
   - Back button
   - User header (edit, actions)
   - Tab navigation
   - Content sections

### Keyboard Navigation

```
SORTABLE COLUMN HEADER:
- Tab: Focus on header
- Enter/Space: Toggle sort direction
- Sort cycles: ascending -> descending -> none

TABLE ROWS:
- Tab: Move through table cells and actions
- Enter: Open user detail (on row)

FILTER DROPDOWNS:
- Tab: Focus dropdown
- Enter/Space: Open dropdown
- Arrow Up/Down: Navigate options
- Enter: Select option
- Escape: Close dropdown

INACTIVE ALERT:
- Tab: Move through action buttons
- Enter/Space: Activate button
```

### ARIA Requirements

```html
<!-- User Table -->
<table
  role="table"
  aria-label="Users list"
>
  <thead>
    <tr>
      <th scope="col">
        <input type="checkbox" aria-label="Select all users" />
      </th>
      <th scope="col">User</th>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
      <th
        scope="col"
        aria-sort="descending"
        tabindex="0"
        role="button"
        aria-label="Last Login, sorted descending, activate to sort ascending"
      >
        Last Login
        <span aria-hidden="true">v</span>
      </th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><input type="checkbox" aria-label="Select Mike Chen" /></td>
      <td>Mike Chen</td>
      <td>mike@company.com</td>
      <td>Viewer</td>
      <td>
        <span aria-label="Last login 45 days ago, inactive user warning">
          <span aria-hidden="true">[!]</span>
          45 days ago
        </span>
      </td>
      <td>Active</td>
    </tr>
  </tbody>
</table>

<!-- Last Login Cell with Tooltip -->
<td>
  <button
    aria-label="Last login details for John Smith"
    aria-describedby="login-details-john"
    aria-expanded="false"
    aria-haspopup="true"
  >
    2 hours ago
  </button>
  <div
    id="login-details-john"
    role="tooltip"
    hidden
  >
    January 10, 2026 at 9:45 AM
    IP: 192.168.1.xxx
    Device: Chrome on macOS
  </div>
</td>

<!-- Inactive Badge -->
<span
  role="status"
  aria-label="Inactive user warning: Has not logged in for 45 days"
  class="badge warning"
>
  <span aria-hidden="true">[!]</span>
  Inactive
</span>

<!-- Inactive Alert Banner -->
<div
  role="alert"
  aria-label="User inactive warning"
>
  <h3>User Inactive for Extended Period</h3>
  <p>Mike Chen hasn't logged in for 45 days.</p>
  <button aria-label="Send reminder email to Mike Chen">
    Send Reminder Email
  </button>
  <button aria-label="View activity log for Mike Chen">
    View Activity
  </button>
  <button aria-label="Deactivate Mike Chen's account">
    Deactivate User
  </button>
</div>

<!-- Sort Announcement (live region) -->
<div
  role="status"
  aria-live="polite"
  class="sr-only"
>
  Users sorted by last login, descending
</div>
```

### Screen Reader Announcements

- Sort applied: "Users sorted by last login, descending. Showing 25 users."
- Filter applied: "Showing 3 users inactive for 30+ days"
- Inactive user focused: "Mike Chen, Viewer, inactive for 45 days, last login November 26, 2025"
- Reminder sent: "Reminder email sent to mike@company.com"
- User deactivated: "Mike Chen's account has been deactivated"
- Loading: "Loading users"
- Error: "Failed to load users, retry button available"

---

## Animation Choreography

### Sort Indicator

```
SORT DIRECTION CHANGE:
- Duration: 200ms
- Easing: ease-out
- Icon: rotate 180 degrees smoothly
- Column header: brief highlight flash

SORT RESET:
- Duration: 150ms
- Icon: fade out
```

### Inactive Badge

```
BADGE PULSE (attention):
- Duration: 2s
- Easing: ease-in-out
- Opacity: 1 -> 0.6 -> 1
- Loop: 3 times on first render, then stop

BADGE HOVER:
- Duration: 150ms
- Transform: scale(1) -> scale(1.05)
```

### Alert Banner

```
APPEAR:
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(-10px) -> translateY(0)
- Opacity: 0 -> 1
- Background: subtle pulse on border

DISMISS:
- Duration: 200ms
- Easing: ease-in
- Opacity: 1 -> 0
- Height: collapse to 0
```

### Table Sorting

```
ROW REORDER:
- Duration: 300ms
- Easing: ease-in-out
- Transform: rows animate to new positions
- Stagger: 20ms between rows
- Old order fades, new order appears
```

### Tooltip

```
APPEAR:
- Duration: 150ms
- Delay: 300ms (hover delay)
- Easing: ease-out
- Opacity: 0 -> 1
- Transform: translateY(4px) -> translateY(0)

DISAPPEAR:
- Duration: 100ms
- No delay
- Opacity: 1 -> 0
```

---

## Component Props Interfaces

```typescript
// User List with Last Login
interface UserListProps {
  initialFilters?: UserListFilters;
  onUserSelect?: (userId: string) => void;
}

// User List Filters
interface UserListFilters {
  search?: string;
  role?: UserRole;
  status?: 'active' | 'inactive' | 'all';
  lastLoginFilter?: LastLoginFilter;
  sortBy?: 'name' | 'email' | 'role' | 'lastLogin' | 'status';
  sortDirection?: 'asc' | 'desc';
}

// Last Login Filter Options
type LastLoginFilter =
  | 'all'
  | 'active_7_days'
  | 'active_30_days'
  | 'inactive_30_days'
  | 'inactive_60_days'
  | 'never_logged_in'
  | { from: Date; to: Date };  // custom range

// User with Login Data
interface UserWithLoginData extends User {
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  loginCount?: number;
  averageSessionDuration?: number;  // in minutes
  lastLoginDevice?: string;
  lastLoginIp?: string;
  isInactive: boolean;  // computed: >30 days since last login
  daysInactive?: number;  // computed if inactive
}

// Last Login Column Cell
interface LastLoginCellProps {
  user: UserWithLoginData;
  showTooltip?: boolean;
}

// Last Login Tooltip Content
interface LastLoginTooltipProps {
  lastLoginAt: Date | null;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  isInactive: boolean;
}

// Inactive User Badge
interface InactiveUserBadgeProps {
  daysInactive: number;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

// Inactive Alert Banner
interface InactiveUserAlertProps {
  user: UserWithLoginData;
  onSendReminder: () => Promise<void>;
  onViewActivity: () => void;
  onDeactivate: () => Promise<void>;
}

// Last Login Filter Dropdown
interface LastLoginFilterProps {
  value: LastLoginFilter;
  onChange: (filter: LastLoginFilter) => void;
}

// Sortable Column Header
interface SortableColumnHeaderProps {
  column: string;
  label: string;
  currentSort?: { column: string; direction: 'asc' | 'desc' };
  onSort: (column: string, direction: 'asc' | 'desc') => void;
}

// User Detail Login Section
interface UserLoginActivitySectionProps {
  userId: string;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  loginStats?: {
    totalLogins: number;
    avgSessionDuration: number;
    loginStreak: number;
  };
}

// Send Reminder Dialog
interface SendReminderDialogProps {
  isOpen: boolean;
  user: UserWithLoginData;
  onClose: () => void;
  onSend: (message?: string) => Promise<void>;
}

// Deactivate User Dialog
interface DeactivateUserDialogProps {
  isOpen: boolean;
  user: UserWithLoginData;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

// Relative Time Display
interface RelativeTimeProps {
  date: Date | null;
  fallback?: string;  // e.g., "Never" for null dates
  showExactOnHover?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/users/user-columns.tsx` | Updated with last login column |
| `src/components/domain/users/last-login-cell.tsx` | Last login cell with tooltip |
| `src/components/domain/users/inactive-user-badge.tsx` | Warning badge for inactive users |
| `src/components/domain/users/inactive-user-alert.tsx` | Alert banner with actions |
| `src/components/domain/users/last-login-filter.tsx` | Filter dropdown |
| `src/components/domain/users/user-login-activity.tsx` | Detail panel section |
| `src/components/domain/users/send-reminder-dialog.tsx` | Reminder email dialog |
| `src/components/domain/users/sortable-header.tsx` | Sortable table header |
| `src/components/shared/relative-time.tsx` | Relative time display |
| `src/hooks/use-users-list.ts` | Users list with sorting/filtering |
| `src/server/functions/users/get-users.ts` | Updated with login data |
| `src/server/functions/users/send-reminder.ts` | Send reminder email |
